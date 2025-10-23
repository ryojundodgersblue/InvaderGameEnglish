import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Button from '../components/Button';
import '../App.css';
import './PlayPage.css';

// --------------------------- Types ---------------------------
type Q = {
  question_id: string;
  part_id: string;
  display_order: number;
  is_demo: boolean;
  question_text: string;
  image_url: string;
  answers: string[];
};
type PartInfo = { part_id: string; requirement: string };
type EnemyVariant = 'normal' | 'ko' | 'attack';
type Status =
  | 'idle' | 'speaking' | 'listening'
  | 'beam' | 'explosion' | 'reveal'
  | 'timeout' | 'wrong'
  | 'intermission' | 'finished';

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognition;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// --------------------------- Consts ---------------------------
const ROUND_TIME_SEC = 30;
const CORRECT_TO_CLEAR = 10;
const MAX_QUESTIONS = 16;

const DLY = {
  betweenSpeaks: 1200,
  afterThirdSpeakBeforeDemoAns: 2000,
  afterThirdSpeakBeforeListen: 800,
  beam: 800,
  explosion: 1000,
  afterReveal: 1500,
  afterTimeoutBeforeReveal: 500,
  beforeNextQuestion: 300,
  intermission: 3000,
};

// 音量設定
const SOUND_EFFECT_VOLUME = 0.2;
const TTS_VOLUME = 1.0;

// ------------------------ Utilities --------------------------
const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

function lev(a: string, b: string) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

const simLevenshtein = (a: string, b: string) => {
  if (!a.length && !b.length) return 1;
  const d = lev(a, b);
  return 1 - d / Math.max(a.length, b.length);
};

const jaccard = (a: string, b: string) => {
  const A = new Set(a.split(' ').filter(Boolean));
  const B = new Set(b.split(' ').filter(Boolean));
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  A.forEach(w => { if (B.has(w)) inter++; });
  const uni = A.size + B.size - inter;
  return inter / uni;
};

function playSound(filename: string) {
  const audio = new Audio(`/${filename}`);
  audio.volume = SOUND_EFFECT_VOLUME;
  audio.play().catch(() => { /* ignore */ });
}

// ------------------------ Component --------------------------
const PlayPage: React.FC = () => {
  const nav = useNavigate();
  const loc = useLocation();
  const { grade, part, subpart } =
    (loc.state as { grade?: string; part?: string; subpart?: string } | null) || 
    { grade: undefined, part: undefined, subpart: undefined };

  const [loading, setLoading] = useState(true);
  const [partInfo, setPartInfo] = useState<PartInfo | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME_SEC);
  const [showRequirement, setShowRequirement] = useState(true);
  const [showText, setShowText] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [realCorrect, setRealCorrect] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [enemyVariant, setEnemyVariant] = useState<EnemyVariant>('normal');
  const [micActive, setMicActive] = useState(false);
  const [lastRecognized, setLastRecognized] = useState<string>('');
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const capturedRef = useRef<string[]>([]);
  const stoppingRef = useRef(false);
  const micActiveRef = useRef(false);
  useEffect(() => { micActiveRef.current = micActive; }, [micActive]);

  const [intermissionSnap, setIntermissionSnap] = useState<{
    text: string;
    answer: string;
    enemy: EnemyVariant;
  } | null>(null);

  const [bannerText, setBannerText] = useState<string | null>(null);

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isSpeakingRef = useRef(false);
  const originalVolumeRef = useRef<number>(TTS_VOLUME);

  const timerRef = useRef<number | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const timeLeftRef = useRef<number>(ROUND_TIME_SEC);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  const isProcessingRef = useRef(false);
  const questionsRef = useRef<Q[]>([]);
  const idxRef = useRef(0);
  const statusRef = useRef<Status>('idle');
  const realCorrectRef = useRef(0);
  
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { idxRef.current = idx; }, [idx]);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { realCorrectRef.current = realCorrect; }, [realCorrect]);

  const current = questions[idx];
  const questionNo = idx + 1;

  // ---------------------- Stop Recognition (完全停止) ----------------------
  const forceStopRecognition = useCallback(() => {
    console.log('[ASR] Force stopping recognition');
    stoppingRef.current = true;
    try {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    } catch (e) {
      console.warn('[ASR] Error during force stop:', e);
    }
    setMicActive(false);
    micActiveRef.current = false;
  }, []);

  // ---------------------- Timer ----------------------
  const clearTimer = useCallback(() => {
    if (timerRef.current) { 
      window.clearInterval(timerRef.current); 
      timerRef.current = null; 
    }
    deadlineRef.current = null;
    console.log('[Timer] Cleared');
  }, []);

  const handleTimeout = useCallback(async () => {
    if (isProcessingRef.current || statusRef.current !== 'listening') {
      console.log('[Timeout] Ignored - already processing or not listening');
      return;
    }
    
    isProcessingRef.current = true;
    console.log(`[Timeout] Question ${idxRef.current + 1} timed out`);

    // ★ 音声認識を完全停止
    forceStopRecognition();

    // ★ 音声を即座に停止
    stopCurrentAudio();

    setEnemyVariant('attack');
    setStatus('timeout');

    await new Promise(r => setTimeout(r, DLY.afterTimeoutBeforeReveal));
    
    // ★ タイムアウト後もまだ処理中かチェック
    if (!isProcessingRef.current) {
      console.log('[Timeout] Processing was cancelled');
      return;
    }
    
    setStatus('reveal');
    
    const q = questionsRef.current[idxRef.current];
    if (q?.answers?.[0]) {
      await speakAwaitTTS(q.answers[0]);
    }
    
    // ★ 音声再生後もまだ処理中かチェック
    if (!isProcessingRef.current) {
      console.log('[Timeout] Processing was cancelled after TTS');
      return;
    }
    
    await new Promise(r => setTimeout(r, DLY.afterReveal));

    startIntermissionThenNext();
  }, [forceStopRecognition]);

  const startTimer = useCallback(() => {
    clearTimer();
    deadlineRef.current = Date.now() + ROUND_TIME_SEC * 1000;
    setTimeLeft(ROUND_TIME_SEC);
    console.log('[Timer] Started');
    
    timerRef.current = window.setInterval(() => {
      const dl = deadlineRef.current;
      if (!dl) { 
        clearTimer(); 
        return; 
      }
      const remainMs = Math.max(0, dl - Date.now());
      const newTimeLeft = Math.ceil(remainMs / 1000);
      setTimeLeft(newTimeLeft);
      
      if (remainMs <= 0) {
        clearTimer();
        handleTimeout();
      }
    }, 120);
  }, [clearTimer, handleTimeout]);

  // ---------------------- Load ----------------------
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const g = grade ?? localStorage.getItem('current_grade') ?? '1';
        const p = part ?? localStorage.getItem('current_part') ?? '1';
        const s = subpart ?? localStorage.getItem('current_subpart') ?? '1';

        console.log('[Load] Fetching data for:', { grade: g, part: p, subpart: s });

        const r1 = await fetch(`http://localhost:4000/game/part?grade=${g}&part=${p}&subpart=${s}`);
        if (!r1.ok) {
          const errorData = await r1.json().catch(() => ({ message: 'part 取得失敗' }));
          throw new Error(errorData.message || 'part 取得失敗');
        }
        const j1 = await r1.json();
        setPartInfo(j1.part);
        console.log('[Load] Part info loaded:', j1.part);

        const r2 = await fetch(`http://localhost:4000/game/questions?part_id=${encodeURIComponent(j1.part.part_id)}`);
        if (!r2.ok) {
          const errorData = await r2.json().catch(() => ({ message: 'questions 取得失敗' }));
          throw new Error(errorData.message || 'questions 取得失敗');
        }
        const j2 = await r2.json();
        const qs: Q[] = (j2.questions || []).slice(0, MAX_QUESTIONS);

        console.log('[Load] Questions loaded:', {
          total: qs.length,
          demo: qs.filter(q => q.is_demo).length,
          nonDemo: qs.filter(q => !q.is_demo).length
        });

        setQuestions(qs);
        questionsRef.current = qs;
        setIdx(0);
        idxRef.current = 0;
        setRealCorrect(0);
        realCorrectRef.current = 0;
        setShowRequirement(true);
      } catch (e) {
        const err = e as Error;
        console.error('[Load] Error:', err);
        setError(err.message || String(e));
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      console.log('[Cleanup] Component unmounting');
      clearTimer();
      stopCurrentAudio();
      forceStopRecognition();
    };
  }, [grade, part, subpart, clearTimer, forceStopRecognition]);

  // ---------------------- Audio Control ----------------------
  const muteCurrentAudio = useCallback(() => {
    if (currentAudioRef.current) {
      originalVolumeRef.current = currentAudioRef.current.volume;
      currentAudioRef.current.volume = 0;
      console.log('[TTS] Muted current audio');
    }
  }, []);

  const unmuteCurrentAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.volume = originalVolumeRef.current;
      console.log('[TTS] Unmuted current audio');
    }
  }, []);

  const stopCurrentAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    isSpeakingRef.current = false;
    console.log('[TTS] Audio stopped');
  }, []);

  useEffect(() => {
    if (micActive) {
      muteCurrentAudio();
    } else {
      unmuteCurrentAudio();
    }
  }, [micActive, muteCurrentAudio, unmuteCurrentAudio]);

  // ---------------------- Google TTS Speech ----------------------
  const speakAwaitTTS = useCallback(async (text: string): Promise<void> => {
    // ★ 処理が中断されている場合は音声再生をスキップ
    if (isProcessingRef.current && statusRef.current !== 'reveal' && statusRef.current !== 'beam' && statusRef.current !== 'explosion') {
      console.log('[TTS] Skipping speech - processing interrupted');
      return;
    }

    try {
      isSpeakingRef.current = true;
      console.log('[TTS] Speaking:', text);
      
      const response = await axios.post(
        'http://localhost:4000/api/tts/synthesize', 
        { 
          text,
          languageCode: 'en-US',
          voiceName: 'en-US-Neural2-D',
          speakingRate: 0.95,
          pitch: 0
        },
        { timeout: 10000 }
      );

      // ★ リクエスト後も処理が中断されていないかチェック
      if (isProcessingRef.current && statusRef.current !== 'reveal' && statusRef.current !== 'beam' && statusRef.current !== 'explosion') {
        console.log('[TTS] Skipping playback - processing interrupted after request');
        isSpeakingRef.current = false;
        return;
      }

      if (response.data.error) {
        console.error('[TTS] API Error:', response.data.error);
        isSpeakingRef.current = false;
        return;
      }

      let audioContent: string | null = null;
      
      if (typeof response.data === 'string') {
        audioContent = response.data;
      } else if (typeof response.data.audioContent === 'string') {
        audioContent = response.data.audioContent;
      } else if (response.data.audioContent && typeof response.data.audioContent === 'object') {
        const contentObj = response.data.audioContent as Record<string, unknown>;
        
        if (contentObj.type === 'Buffer' && Array.isArray(contentObj.data)) {
          const uint8Array = new Uint8Array(contentObj.data);
          const blob = new Blob([uint8Array], { type: 'audio/mpeg' });
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          audio.volume = micActiveRef.current ? 0 : TTS_VOLUME;
          currentAudioRef.current = audio;

          await new Promise<void>((resolve) => {
            audio.onended = () => {
              URL.revokeObjectURL(audioUrl);
              currentAudioRef.current = null;
              isSpeakingRef.current = false;
              resolve();
            };
            audio.onerror = () => {
              console.error('[TTS] Audio playback error');
              URL.revokeObjectURL(audioUrl);
              currentAudioRef.current = null;
              isSpeakingRef.current = false;
              resolve();
            };
            audio.play().catch(() => {
              URL.revokeObjectURL(audioUrl);
              currentAudioRef.current = null;
              isSpeakingRef.current = false;
              resolve();
            });
          });
          return;
        }
        
        if (typeof contentObj.data === 'string') {
          audioContent = contentObj.data;
        } else if (Array.isArray(contentObj)) {
          const uint8Array = new Uint8Array(contentObj);
          const blob = new Blob([uint8Array], { type: 'audio/mpeg' });
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          audio.volume = micActiveRef.current ? 0 : TTS_VOLUME;
          currentAudioRef.current = audio;

          await new Promise<void>((resolve) => {
            audio.onended = () => {
              URL.revokeObjectURL(audioUrl);
              currentAudioRef.current = null;
              isSpeakingRef.current = false;
              resolve();
            };
            audio.onerror = () => {
              console.error('[TTS] Audio playback error');
              URL.revokeObjectURL(audioUrl);
              currentAudioRef.current = null;
              isSpeakingRef.current = false;
              resolve();
            };
            audio.play().catch(() => {
              URL.revokeObjectURL(audioUrl);
              currentAudioRef.current = null;
              isSpeakingRef.current = false;
              resolve();
            });
          });
          return;
        }
      }

      if (!audioContent) {
        console.error('[TTS] No valid audioContent found');
        isSpeakingRef.current = false;
        return;
      }

      const commaIndex = audioContent.indexOf(',');
      if (commaIndex !== -1) {
        audioContent = audioContent.substring(commaIndex + 1);
      }
      
      audioContent = audioContent.replace(/[\s\n\r\t]/g, '');
      
      if (!audioContent || audioContent.length === 0) {
        console.error('[TTS] Empty audio content after cleanup');
        isSpeakingRef.current = false;
        return;
      }
      
      if (!audioContent.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
        console.error('[TTS] Invalid Base64 string');
        isSpeakingRef.current = false;
        return;
      }
      
      let binaryString: string;
      try {
        binaryString = window.atob(audioContent);
      } catch (decodeError) {
        console.error('[TTS] Base64 decode error:', decodeError);
        isSpeakingRef.current = false;
        return;
      }
      
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.volume = micActiveRef.current ? 0 : TTS_VOLUME;
      
      currentAudioRef.current = audio;

      await new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
          isSpeakingRef.current = false;
          console.log('[TTS] Playback completed');
          resolve();
        };

        audio.onerror = () => {
          console.error('[TTS] Audio playback error');
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
          isSpeakingRef.current = false;
          resolve();
        };

        audio.play().catch((err) => {
          console.error('[TTS] Audio play error:', err);
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
          isSpeakingRef.current = false;
          resolve();
        });
      });
    } catch (error) {
      console.error('[TTS] Error:', error);
      
      if (axios.isAxiosError(error)) {
        console.error('[TTS] Axios error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
      }
      
      isSpeakingRef.current = false;
    }
  }, []);

  // ---------------------- One Question ----------------------
  const startQuestionForIndex = useCallback(async (questionIndex: number) => {
    const q = questionsRef.current[questionIndex];
    if (!q || statusRef.current === 'finished') return;

    console.log(`[Question] Starting question ${questionIndex + 1}/${questionsRef.current.length}`, {
      isDemo: q.is_demo,
      currentCorrect: realCorrectRef.current
    });

    isProcessingRef.current = false;
    setShowText(false);
    setStatus('idle');
    setEnemyVariant('normal');
    setLastRecognized('');
    capturedRef.current = [];

    stopCurrentAudio();
    forceStopRecognition();

    setBannerText(q.is_demo && questionIndex === 0 ? 'Start Demo' : `Question ${questionIndex + 1} !`);
    await new Promise(r => setTimeout(r, 1200));
    setBannerText(null);

    setStatus('speaking');
    startTimer();

    // ★ 1回目の読み上げ
    await speakAwaitTTS(q.question_text);
    if (isProcessingRef.current) {
      console.log('[Question] Processing interrupted after 1st speak');
      return;
    }

    await new Promise(r => setTimeout(r, DLY.betweenSpeaks));
    if (isProcessingRef.current) {
      console.log('[Question] Processing interrupted during delay after 1st speak');
      return;
    }

    // ★ 2回目の読み上げ
    await speakAwaitTTS(q.question_text);
    if (isProcessingRef.current) {
      console.log('[Question] Processing interrupted after 2nd speak');
      return;
    }

    await new Promise(r => setTimeout(r, DLY.betweenSpeaks));
    if (isProcessingRef.current) {
      console.log('[Question] Processing interrupted during delay after 2nd speak');
      return;
    }

    setShowText(true);
    
    // ★ 3回目の読み上げ
    await speakAwaitTTS(q.question_text);
    if (isProcessingRef.current) {
      console.log('[Question] Processing interrupted after 3rd speak');
      return;
    }

    if (q.is_demo && questionIndex === 0) {
      await new Promise(r => setTimeout(r, DLY.afterThirdSpeakBeforeDemoAns));
      if (isProcessingRef.current) {
        console.log('[Question] Processing interrupted during demo delay');
        return;
      }
      isProcessingRef.current = true;
      clearTimer();
      stopCurrentAudio();

      setEnemyVariant('ko');
      playSound('attack.mp3');
      setStatus('beam');
      await new Promise(r => setTimeout(r, DLY.beam));

      setStatus('explosion');
      await new Promise(r => setTimeout(r, DLY.explosion));

      setStatus('reveal');
      
      if (q.answers?.[0]) {
        await speakAwaitTTS(q.answers[0]);
      }
      
      await new Promise(r => setTimeout(r, DLY.afterReveal));

      startIntermissionThenNext();
    } else {
      setStatus('listening');
    }
  }, [clearTimer, startTimer, speakAwaitTTS, stopCurrentAudio, forceStopRecognition]);

  // ---------------------- Intermission => Next ----------------------
  const startIntermissionThenNext = useCallback(() => {
    const q = questionsRef.current[idxRef.current];
    const ans = q?.answers?.[0] ?? '';
    console.log(`[Intermission] Question ${idxRef.current + 1} complete`, {
      isDemo: q?.is_demo,
      currentCorrect: realCorrectRef.current
    });
    
    setIntermissionSnap({
      text: q?.question_text ?? '',
      answer: ans,
      enemy: enemyVariant,
    });
    setStatus('intermission');

    setTimeout(() => {
      moveToNextQuestion();
    }, DLY.intermission);
  }, [enemyVariant]);

  const moveToNextQuestion = useCallback(() => {
    clearTimer();
    isProcessingRef.current = false;
    setMicActive(false);
    setIntermissionSnap(null);
    setEnemyVariant('normal');

    stopCurrentAudio();
    forceStopRecognition();

    const next = idxRef.current + 1;
    console.log(`[Progress] Moving from question ${idxRef.current + 1} to ${next + 1}`, {
      totalQuestions: questionsRef.current.length,
      currentCorrect: realCorrectRef.current
    });
    
    if (next >= questionsRef.current.length) {
      console.log('[Game] All questions completed');
      setStatus('finished');
      finishGame();
      return;
    }
    
    setIdx(next);
    idxRef.current = next;
    setShowText(false);
    setStatus('idle');
    setTimeout(() => startQuestionForIndex(next), DLY.beforeNextQuestion);
  }, [clearTimer, stopCurrentAudio, forceStopRecognition, startQuestionForIndex]);

  // ---------------------- Mic Toggle & Evaluate ----------------------
  const toggleMic = useCallback(() => {
    if (!['speaking', 'listening', 'wrong'].includes(status) || timeLeft <= 0) return;
    if (!micActive) startRecognition();
    else stopRecognitionAndEvaluate();
  }, [status, timeLeft, micActive]);

  const startRecognition = useCallback(() => {
    const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SR) { 
      alert('このブラウザは音声認識に未対応です(Chrome 推奨)'); 
      return; 
    }

    const rec = new SR();
    recognitionRef.current = rec;
    capturedRef.current = [];
    setLastRecognized('');
    stoppingRef.current = false;

    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const alt = result[0];
        const text = alt?.transcript ?? '';
        if (text && text.trim()) {
          const t = text.trim();
          if (!capturedRef.current.includes(t)) {
            capturedRef.current.push(t);
            setLastRecognized(t);
            console.log('[ASR] Captured:', { text: t, confidence: alt?.confidence, isFinal: result.isFinal });
          }
        }
      }
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => { 
      console.warn('[ASR] Error:', e.error); 
    };

    rec.onend = () => {
      console.log('[ASR] Ended');
      
      // ★ 停止フラグが立っている、またはマイクが非アクティブなら再起動しない
      if (stoppingRef.current || !micActiveRef.current) {
        console.log('[ASR] Not restarting - stopping flag or mic inactive');
        return;
      }
      
      // ★ タイムアウトまたは処理中の場合は再起動しない
      if (isProcessingRef.current || timeLeftRef.current <= 0) {
        console.log('[ASR] Not restarting - processing or timeout');
        return;
      }
      
      // ★ 有効なステータスでない場合は再起動しない
      const shouldRestart = ['speaking', 'listening', 'wrong'].includes(statusRef.current);
      
      if (shouldRestart) {
        try {
          rec.start();
          console.log('[ASR] Auto-restarted');
        } catch (err) {
          console.warn('[ASR] Failed to restart:', err);
        }
      } else {
        console.log('[ASR] Not restarting - invalid status:', statusRef.current);
      }
    };

    try { 
      rec.start(); 
      setMicActive(true); 
      console.log('[ASR] Started'); 
    } catch (err) {
      console.error('[ASR] Failed to start:', err);
    }
  }, []);

  const stopRecognitionAndEvaluate = useCallback(async () => {
    console.log('[ASR] Stopping for evaluation');
    stoppingRef.current = true;
    
    try {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    } catch (err) {
      console.warn('[ASR] Error during stop:', err);
    }
    
    setMicActive(false);
    micActiveRef.current = false;
    
    console.log('[ASR] Stopped for evaluation');
    evaluateCaptured();
  }, []);

  const evaluateCaptured = useCallback(async () => {
    if (isProcessingRef.current) {
      console.log('[Eval] Already processing - skipping');
      return;
    }
    const q = questionsRef.current[idxRef.current];
    if (!q) return;

    const heardRaw = [...capturedRef.current];
    const heard = heardRaw.map(normalize).filter(Boolean);
    const answersRaw = (q.answers || []);
    const answers = answersRaw.map(normalize).filter(Boolean);

    console.groupCollapsed(`[Eval] Question ${idxRef.current + 1}`);
    console.log('Heard (raw):', heardRaw);
    console.log('Heard (normalized):', heard);
    console.log('Answers (normalized):', answers);
    console.log('Is Demo:', q.is_demo);

    let isCorrect = false;
    let matchDetails = '';
    
    outer: for (const h of heard) {
      for (const a of answers) {
        if (h === a) { 
          isCorrect = true; 
          matchDetails = `Exact match: "${h}" === "${a}"`;
          break outer; 
        }
        const s = simLevenshtein(h, a);
        const j = jaccard(h, a);
        if (s >= 0.66 || j >= 0.6) {
          isCorrect = true; 
          matchDetails = `Fuzzy match: "${h}" ≈ "${a}" (Levenshtein: ${s.toFixed(2)}, Jaccard: ${j.toFixed(2)})`;
          break outer;
        }
      }
    }

    console.log('Result:', isCorrect ? '✓ CORRECT' : '✗ WRONG');
    if (isCorrect) console.log('Match:', matchDetails);
    console.groupEnd();

    if (isCorrect) {
      // ★ 処理開始をマーク（これ以降の音声読み上げをスキップさせる）
      isProcessingRef.current = true;
      console.log('[Eval] Correct answer - setting isProcessingRef to true');
      
      // ★ タイマー停止と音声停止
      clearTimer();
      stopCurrentAudio();
      
      // ★ 音声認識を完全停止
      forceStopRecognition();

      // ★ デモ問題でない場合のみカウント
      if (!q.is_demo) {
        setRealCorrect(c => {
          const newCount = c + 1;
          console.log(`[Score] Correct answers: ${newCount} (non-demo)`);
          realCorrectRef.current = newCount;
          return newCount;
        });
      } else {
        console.log('[Score] Demo question - not counting toward score');
      }

      setEnemyVariant('ko');
      playSound('attack.mp3');
      setStatus('beam');
      await new Promise(r => setTimeout(r, DLY.beam));

      setStatus('explosion');
      await new Promise(r => setTimeout(r, DLY.explosion));

      setStatus('reveal');
      
      if (q.answers?.[0]) {
        await speakAwaitTTS(q.answers[0]);
      }
      
      await new Promise(r => setTimeout(r, DLY.afterReveal));

      startIntermissionThenNext();
    } else {
      setEnemyVariant('attack');
      setStatus('wrong');
      playSound('miss.mp3');
      setTimeout(() => {
        if (!isProcessingRef.current && deadlineRef.current && Date.now() < deadlineRef.current) {
          setEnemyVariant('normal');
          setStatus('listening');
        }
      }, 600);
    }
  }, [clearTimer, stopCurrentAudio, forceStopRecognition, speakAwaitTTS, startIntermissionThenNext]);

  // ---------------------- Finish Game ----------------------
  const finishGame = useCallback(async () => {
    const nonDemoCount = questionsRef.current.filter(q => !q.is_demo).length;
    const finalCorrect = realCorrectRef.current;
    const clear = finalCorrect >= CORRECT_TO_CLEAR;

    console.log('[Game] Finished!', {
      totalQuestions: questionsRef.current.length,
      nonDemoQuestions: nonDemoCount,
      correctAnswers: finalCorrect,
      cleared: clear
    });

    const userId = localStorage.getItem('userId') || '';
    const part_id = partInfo?.part_id || '';

    try {
      if (!userId) {
        console.error('[API] No userId found in localStorage');
        throw new Error('ユーザーIDが見つかりません');
      }
      if (!part_id) {
        console.error('[API] No part_id found');
        throw new Error('パートIDが見つかりません');
      }

      // ★ スコア送信
      console.log('[API] Sending score...', { 
        userId, 
        part_id, 
        scores: finalCorrect, 
        clear 
      });

      const scoreResponse = await fetch('http://localhost:4000/game/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          part_id, 
          scores: finalCorrect, 
          clear 
        }),
      });

      if (!scoreResponse.ok) {
        const errorText = await scoreResponse.text();
        console.error('[API] Score submission failed:', {
          status: scoreResponse.status,
          statusText: scoreResponse.statusText,
          body: errorText
        });
        throw new Error(`スコア送信失敗: ${scoreResponse.status}`);
      }

      const scoreData = await scoreResponse.json();
      console.log('[API] Score saved successfully:', scoreData);

      // ★ クリアした場合のみ進捗を更新
      if (clear) {
        console.log('[API] Attempting to advance progress...');
        
        const currentGrade = grade ?? localStorage.getItem('current_grade') ?? '1';
        const currentPart = part ?? localStorage.getItem('current_part') ?? '1';
        const currentSubpart = subpart ?? localStorage.getItem('current_subpart') ?? '1';

        const advancePayload = {
          userId,
          current: {
            grade: currentGrade,
            part: currentPart,
            subpart: currentSubpart,
          },
          part_id,
          clear: true
        };

        console.log('[API] Advance payload:', advancePayload);

        const advanceResponse = await fetch('http://localhost:4000/game/advance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(advancePayload),
        });

        if (!advanceResponse.ok) {
          const errorText = await advanceResponse.text();
          console.error('[API] Advance request failed:', {
            status: advanceResponse.status,
            statusText: advanceResponse.statusText,
            body: errorText
          });
          throw new Error(`進捗更新失敗: ${advanceResponse.status}`);
        }

        const advanceData = await advanceResponse.json();
        console.log('[API] Advance response:', advanceData);

        if (advanceData.ok && advanceData.advanced) {
          console.log('[API] Progress advanced successfully!', {
            reason: advanceData.reason,
            next: advanceData.next
          });

          // ★ LocalStorageを更新
          if (advanceData.next) {
            localStorage.setItem('current_grade', String(advanceData.next.grade_id));
            localStorage.setItem('current_part', String(advanceData.next.part_no));
            localStorage.setItem('current_subpart', String(advanceData.next.subpart_no));
            console.log('[LocalStorage] Updated progress to:', {
              grade: advanceData.next.grade_id,
              part: advanceData.next.part_no,
              subpart: advanceData.next.subpart_no
            });
          }
        } else {
          console.log('[API] Progress not advanced:', {
            reason: advanceData.reason,
            attempts: advanceData.attempts,
            required: advanceData.required,
            remaining: advanceData.remaining
          });
        }
      } else {
        console.log('[API] Not cleared - skipping advance request');
      }

    } catch (err) {
      console.error('[API] Error during finish game:', err);
      if (axios.isAxiosError(err)) {
        console.error('[API] Axios error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          config: {
            url: err.config?.url,
            method: err.config?.method,
            data: err.config?.data
          }
        });
      }
      // エラーが発生してもリザルト画面には遷移する
    }

    // ★ リザルト画面に遷移（finalCorrectを使用）
    console.log('[Navigation] Moving to result page:', {
      clear,
      correct: finalCorrect,
      total: nonDemoCount
    });

    nav('/result', { 
      state: { 
        clear, 
        correct: finalCorrect, 
        total: nonDemoCount 
      } 
    });
  }, [partInfo, grade, part, subpart, nav]);

  // ---------------------- Start Button ----------------------
  const handleStartClick = useCallback(() => {
    console.log('[Game] Starting game');
    setShowRequirement(false);
    setTimeout(() => startQuestionForIndex(0), 100);
  }, [startQuestionForIndex]);

  // ---------------------- Render -----------------------------
  if (loading) {
    return (
      <div className="page">
        <h1 className="title">Loading...</h1>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="page">
        <h1 className="title">Error</h1>
        <div style={{ color: 'salmon', padding: '20px' }}>{error}</div>
        <div style={{ marginTop: '20px' }}>
          <Button onClick={() => nav('/select')}>戻る</Button>
        </div>
      </div>
    );
  }
  
  if (!partInfo || questions.length === 0) {
    return (
      <div className="page">
        <h1 className="title">No Data</h1>
        <div style={{ color: '#94a3b8', padding: '20px' }}>
          問題データが見つかりませんでした
        </div>
        <div style={{ marginTop: '20px' }}>
          <Button onClick={() => nav('/select')}>戻る</Button>
        </div>
      </div>
    );
  }

  const showIntermission = status === 'intermission' && intermissionSnap;

  const enemyContainerClass = `enemy-container ${enemyVariant === 'normal' ? 'enemy-normal' : 'enemy-front'}`;
  const enemyImgClass = `enemy-img ${
    enemyVariant === 'ko' ? 'enemy-ko' :
      enemyVariant === 'attack' ? 'enemy-attack' : ''
  }`;

  const gunBtnEnabled = ['speaking', 'listening', 'wrong'].includes(status) && timeLeft > 0;
  const gunBtnClass = [
    'gun-button',
    gunBtnEnabled ? 'enabled' : 'disabled',
    micActive ? 'mic-active' : 'mic-inactive'
  ].join(' ');

  return (
    <div className="play-page">
      {/* 左上: Time Limit */}
      <div className="time-limit-container">
        <div className="time-limit-label">Time Limit</div>
        <div className="time-limit-display">{timeLeft}</div>
      </div>

      {/* 右上: マイク状態 */}
      {['speaking', 'listening', 'wrong'].includes(status) && (
        <div className="mic-status-container">
          <div className={`mic-status-badge ${micActive ? 'active' : 'inactive'}`}>
            <span className="mic-icon">{micActive ? '🎤' : '🔇'}</span>
            <span className="mic-text">MIC: {micActive ? 'ON' : 'OFF'}</span>
          </div>
          {!!lastRecognized && (
            <div className="mic-heard-text">Heard: {lastRecognized}</div>
          )}
        </div>
      )}

      {/* 左: 問題番号 */}
      <div className="question-number-container">
        <div className="question-number-display">{questionNo}</div>
      </div>

      {/* 上中央: 敵キャラクター */}
      <div className={enemyContainerClass}>
        <img 
          src={
            enemyVariant === 'ko' ? '/enemy_ko.png' :
            enemyVariant === 'attack' ? '/enemy_attack.png' :
            '/enemy.png'
          } 
          alt="enemy" 
          className={enemyImgClass} 
        />
      </div>

      {/* 中央: 要件 or 問題文 or Intermission */}
      {showRequirement ? (
        <div className="requirement-box">
          <h2 className="requirement-title">Requirement</h2>
          <div className="requirement-text">{partInfo.requirement}</div>
          <div className="requirement-button">
            <Button onClick={handleStartClick}>Start</Button>
          </div>
        </div>
      ) : showIntermission ? (
        <>
          <div className="question-text">
            {intermissionSnap?.text}
          </div>
          <div className="answer-display correct-answer">
            <div className="answer-badge">CORRECT ANSWER</div>
            <div className="answer-content">
              <span className="answer-mark">✓</span>
              <span className="answer-text">{intermissionSnap?.answer}</span>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* バナーテキスト */}
          {bannerText && (
            <div className="banner-text">{bannerText}</div>
          )}

          {/* 問題文 */}
          <div className="question-text">
            {!bannerText && showText && current ? current.question_text : ''}
          </div>

          {/* 問題画像 */}
          {current?.image_url && (
            <div className="question-image-container">
              <img src={current.image_url} alt="" className="question-image" />
            </div>
          )}

          {/* 正解ビーム */}
          {status === 'beam' && <div className="beam-effect" />}

          {/* ガンボタン（マイク） */}
          <div className="gun-button-container">
            <button
              onClick={toggleMic}
              disabled={!gunBtnEnabled}
              className={gunBtnClass}
              aria-pressed={micActive}
              title={micActive ? 'Stop & Evaluate' : 'Start Recording'}
            >
              <img src="/gun.png" alt="gun" className="gun-img" />
              {micActive && <span className="pulse-ring"></span>}
            </button>
          </div>

          {/* 解答表示 */}
          {(['reveal', 'timeout'].includes(status)) && current && (
            <div className="answer-display correct-answer">
              <div className="answer-badge">CORRECT ANSWER</div>
              <div className="answer-content">
                <span className="answer-mark">✓</span>
                <span className="answer-text">{current.answers?.[0] ?? ''}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PlayPage;