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

// State Machine Types
type IntermissionSnapshot = {
  text: string;
  answer: string;
  enemy: EnemyVariant;
};

type GamePhase =
  | 'idle'
  | 'speaking'
  | 'listening'
  | 'beam'
  | 'explosion'
  | 'reveal'
  | 'timeout'
  | 'grace_period'
  | 'wrong'
  | 'intermission'
  | 'finished';

type GameState = {
  phase: GamePhase;
  enemyVariant: EnemyVariant;
  hasRecognition: boolean;
  intermissionSnap: IntermissionSnapshot | null;
};

type GameAction =
  | { type: 'START_SPEAKING' }
  | { type: 'START_LISTENING' }
  | { type: 'RECOGNITION_DETECTED' }
  | { type: 'START_BEAM' }
  | { type: 'START_EXPLOSION' }
  | { type: 'REVEAL_ANSWER' }
  | { type: 'TIMEOUT' }
  | { type: 'START_GRACE_PERIOD' }
  | { type: 'WRONG_ANSWER' }
  | { type: 'START_INTERMISSION'; snapshot: IntermissionSnapshot }
  | { type: 'RESET_TO_IDLE' }
  | { type: 'FINISH_GAME' };

// Legacy type for backward compatibility
type Status = GamePhase;

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
const GRACE_PERIOD_SEC = 3;
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
// 正規表現を事前にコンパイル（性能最適化）
const NORMALIZE_REGEX_1 = /[^a-z0-9\s]/g;
const NORMALIZE_REGEX_2 = /\s+/g;

const normalize = (s: string) =>
  s.toLowerCase().replace(NORMALIZE_REGEX_1, '').replace(NORMALIZE_REGEX_2, ' ').trim();

function lev(a: string, b: string, maxDistance?: number) {
  const m = a.length, n = b.length;

  // 性能最適化: 長さの差が大きすぎる場合は早期終了
  if (maxDistance !== undefined && Math.abs(m - n) > maxDistance) {
    return maxDistance + 1;
  }

  // 性能最適化: 空文字列のケース
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    let minInRow = Infinity;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
      minInRow = Math.min(minInRow, dp[i][j]);
    }
    // 性能最適化: この行の最小値が閾値を超えたら早期終了
    if (maxDistance !== undefined && minInRow > maxDistance) {
      return maxDistance + 1;
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

// ★ 音声再生を待つ関数（攻撃音など）
function playSoundAwait(filename: string): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(`/${filename}`);
    audio.volume = SOUND_EFFECT_VOLUME;

    const onEnd = () => {
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('error', onEnd);
      console.log(`[Sound] Finished playing: ${filename}`);
      resolve();
    };

    audio.addEventListener('ended', onEnd);
    audio.addEventListener('error', onEnd);

    audio.play().catch(() => {
      onEnd();
    });
  });
}

// ------------------------ State Machine Reducer --------------------------
const initialGameState: GameState = {
  phase: 'idle',
  enemyVariant: 'normal',
  hasRecognition: false,
  intermissionSnap: null,
};

function gameStateReducer(state: GameState, action: GameAction): GameState {
  console.log('[StateMachine]', { from: state.phase, action: action.type });

  switch (action.type) {
    case 'START_SPEAKING':
      return { ...state, phase: 'speaking', enemyVariant: 'normal' };

    case 'START_LISTENING':
      return { ...state, phase: 'listening' };

    case 'RECOGNITION_DETECTED':
      return { ...state, hasRecognition: true };

    case 'START_BEAM':
      return { ...state, phase: 'beam', enemyVariant: 'ko' };

    case 'START_EXPLOSION':
      return { ...state, phase: 'explosion' };

    case 'REVEAL_ANSWER':
      return { ...state, phase: 'reveal' };

    case 'TIMEOUT':
      return { ...state, phase: 'timeout', enemyVariant: 'attack' };

    case 'START_GRACE_PERIOD':
      return { ...state, phase: 'grace_period', enemyVariant: 'attack' };

    case 'WRONG_ANSWER':
      return { ...state, phase: 'wrong', enemyVariant: 'attack' };

    case 'START_INTERMISSION':
      return {
        ...state,
        phase: 'intermission',
        intermissionSnap: action.snapshot,
      };

    case 'RESET_TO_IDLE':
      return {
        ...state,
        phase: 'idle',
        enemyVariant: 'normal',
        hasRecognition: false,
        intermissionSnap: null,
      };

    case 'FINISH_GAME':
      return { ...state, phase: 'finished' };

    default:
      return state;
  }
}

// ------------------------ Utility: Promise-based delay --------------------------
const delay = (ms: number, signal?: AbortSignal): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timeout = setTimeout(resolve, ms);

    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new DOMException('Aborted', 'AbortError'));
      });
    }
  });
};

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
  const [realCorrect, setRealCorrect] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [freezeDetected, setFreezeDetected] = useState(false);

  // State Machine
  const [gameState, dispatch] = React.useReducer(gameStateReducer, initialGameState);
  const { phase: status, enemyVariant, intermissionSnap } = gameState;

  const [micActive, setMicActive] = useState(false);
  const [lastRecognized, setLastRecognized] = useState<string>('');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const capturedRef = useRef<string[]>([]);
  const stoppingRef = useRef(false);
  const micActiveRef = useRef(false);
  useEffect(() => { micActiveRef.current = micActive; }, [micActive]);

  const [bannerText, setBannerText] = useState<string | null>(null);

  // AbortController for cancellable async operations
  const abortControllerRef = useRef<AbortController | null>(null);

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isSpeakingRef = useRef(false);
  const originalVolumeRef = useRef<number>(TTS_VOLUME);

  const timerRef = useRef<number | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const timeLeftRef = useRef<number>(ROUND_TIME_SEC);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  const freezeDetectionTimerRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

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

  // ---------------------- Freeze Detection ----------------------
  const startFreezeDetection = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (freezeDetectionTimerRef.current) {
      window.clearInterval(freezeDetectionTimerRef.current);
    }
    freezeDetectionTimerRef.current = window.setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      // 30秒間処理が進まない場合、フリーズと判定
      if (timeSinceActivity > 30000) {
        console.error('[Freeze] Game appears to be frozen - no activity for 30 seconds');
        setFreezeDetected(true);
        if (freezeDetectionTimerRef.current) {
          window.clearInterval(freezeDetectionTimerRef.current);
          freezeDetectionTimerRef.current = null;
        }
      }
    }, 5000); // 5秒ごとにチェック
    console.log('[Freeze] Detection started');
  }, []);

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const stopFreezeDetection = useCallback(() => {
    if (freezeDetectionTimerRef.current) {
      window.clearInterval(freezeDetectionTimerRef.current);
      freezeDetectionTimerRef.current = null;
      console.log('[Freeze] Detection stopped');
    }
  }, []);

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

  // ★ 現在の音声が終了するまで待つ関数
  const waitForCurrentAudioToFinish = useCallback(async () => {
    if (!currentAudioRef.current || !isSpeakingRef.current) {
      console.log('[TTS] No audio playing - continuing immediately');
      return;
    }

    console.log('[TTS] Waiting for current audio to finish...');
    return new Promise<void>((resolve) => {
      const audio = currentAudioRef.current;
      if (!audio) {
        resolve();
        return;
      }

      const onEnded = () => {
        console.log('[TTS] Current audio finished');
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onEnded);
        resolve();
      };

      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onEnded);

      // 既に終了している場合のフォールバック
      if (audio.ended || audio.paused) {
        onEnded();
      }
    });
  }, []);

  const handleTimeout = useCallback(async () => {
    // ★ 競合状態対策: 既に処理中、またはlistening状態でない場合は無視
    if (isProcessingRef.current) {
      console.log('[Timeout] Ignored - already processing');
      return;
    }

    if (statusRef.current !== 'listening' && statusRef.current !== 'grace_period') {
      console.log('[Timeout] Ignored - not in listening/grace_period state:', statusRef.current);
      return;
    }

    // ★ 猶予期間チェック: マイクがONかつ何か認識されている場合、猶予期間を付与
    const hasCaptured = capturedRef.current.length > 0;
    if (statusRef.current === 'listening' && micActiveRef.current && hasCaptured) {
      console.log(`[Timeout] Grace period activated - user is speaking (${capturedRef.current.length} phrases captured)`);

      // 猶予期間を開始
      dispatch({ type: 'START_GRACE_PERIOD' });
      statusRef.current = 'grace_period';

      // 猶予期間タイマーを設定
      deadlineRef.current = Date.now() + GRACE_PERIOD_SEC * 1000;
      setTimeLeft(GRACE_PERIOD_SEC);

      console.log(`[Timeout] Grace period: ${GRACE_PERIOD_SEC} seconds to finish speaking`);
      return; // 猶予期間が終わったら再度handleTimeoutが呼ばれる
    }

    // ★ アクティビティを更新
    updateActivity();

    // ★ 処理開始フラグを立てる（他の処理をブロック）
    isProcessingRef.current = true;
    console.log(`[Timeout] Question ${idxRef.current + 1} timed out${statusRef.current === 'grace_period' ? ' (after grace period)' : ''}`);

    // ★ 音声認識を完全停止
    forceStopRecognition();

    // 猶予期間後に認識結果があれば評価
    if (statusRef.current === 'grace_period' && capturedRef.current.length > 0) {
      console.log('[Timeout] Evaluating captured speech after grace period');
      await evaluateCaptured();
      return;
    }

    // ★ 問題の音声が終了するまで待つ
    await waitForCurrentAudioToFinish();

    // ★ 音量を確実に復元
    originalVolumeRef.current = TTS_VOLUME;
    console.log('[Timeout] Audio volume restored for answer playback');

    dispatch({ type: 'TIMEOUT' });

    try {
      await delay(DLY.afterTimeoutBeforeReveal, abortControllerRef.current?.signal);

      if (!isProcessingRef.current) {
        console.log('[Timeout] Processing was cancelled during delay');
        return;
      }

      dispatch({ type: 'REVEAL_ANSWER' });

      const q = questionsRef.current[idxRef.current];
      if (q?.answers?.[0]) {
        await speakAwaitTTS(q.answers[0], true);
      }

      if (!isProcessingRef.current) {
        console.log('[Timeout] Processing was cancelled after TTS');
        return;
      }

      await delay(DLY.afterReveal, abortControllerRef.current?.signal);

      if (!isProcessingRef.current) {
        console.log('[Timeout] Processing was cancelled before intermission');
        return;
      }

      startIntermissionThenNext();
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        console.log('[Timeout] Aborted');
      } else {
        throw e;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceStopRecognition, waitForCurrentAudioToFinish, updateActivity]);

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

        const r1 = await fetch(`http://localhost:4000/game/part?grade=${g}&part=${p}&subpart=${s}`, {
          credentials: 'include'
        });
        if (!r1.ok) {
          const errorData = await r1.json().catch(() => ({ message: 'part 取得失敗' }));
          throw new Error(errorData.message || 'part 取得失敗');
        }
        const j1 = await r1.json();
        setPartInfo(j1.part);
        console.log('[Load] Part info loaded:', j1.part);

        const r2 = await fetch(`http://localhost:4000/game/questions?part_id=${encodeURIComponent(j1.part.part_id)}`, {
          credentials: 'include'
        });
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
      stopFreezeDetection();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const speakAwaitTTS = useCallback(async (text: string, isAnswer = false): Promise<void> => {
    // ★ 処理が中断されている場合は音声再生をスキップ（ただし正解音声は必ず再生）
    if (!isAnswer && isProcessingRef.current && statusRef.current !== 'reveal' && statusRef.current !== 'beam' && statusRef.current !== 'explosion') {
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

      // ★ リクエスト後も処理が中断されていないかチェック（ただし正解音声は必ず再生）
      if (!isAnswer && isProcessingRef.current && statusRef.current !== 'reveal' && statusRef.current !== 'beam' && statusRef.current !== 'explosion') {
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
          audio.volume = isAnswer ? TTS_VOLUME : (micActiveRef.current ? 0 : TTS_VOLUME);
          currentAudioRef.current = audio;

          // ★ タイムアウト付きでPromiseを待つ（画面固まり対策）
          await Promise.race([
            new Promise<void>((resolve) => {
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
            }),
            // タイムアウト: 15秒で強制的にresolve
            new Promise<void>((resolve) => {
              setTimeout(() => {
                console.warn('[TTS] Audio playback timeout (15s) - forcing resolve');
                if (currentAudioRef.current === audio) {
                  audio.pause();
                  URL.revokeObjectURL(audioUrl);
                  currentAudioRef.current = null;
                  isSpeakingRef.current = false;
                }
                resolve();
              }, 15000);
            })
          ]);
          return;
        }
        
        if (typeof contentObj.data === 'string') {
          audioContent = contentObj.data;
        } else if (Array.isArray(contentObj)) {
          const uint8Array = new Uint8Array(contentObj);
          const blob = new Blob([uint8Array], { type: 'audio/mpeg' });
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          audio.volume = isAnswer ? TTS_VOLUME : (micActiveRef.current ? 0 : TTS_VOLUME);
          currentAudioRef.current = audio;

          // ★ タイムアウト付きでPromiseを待つ（画面固まり対策）
          await Promise.race([
            new Promise<void>((resolve) => {
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
            }),
            // タイムアウト: 15秒で強制的にresolve
            new Promise<void>((resolve) => {
              setTimeout(() => {
                console.warn('[TTS] Audio playback timeout (15s) - forcing resolve');
                if (currentAudioRef.current === audio) {
                  audio.pause();
                  URL.revokeObjectURL(audioUrl);
                  currentAudioRef.current = null;
                  isSpeakingRef.current = false;
                }
                resolve();
              }, 15000);
            })
          ]);
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
      audio.volume = isAnswer ? TTS_VOLUME : (micActiveRef.current ? 0 : TTS_VOLUME);

      currentAudioRef.current = audio;

      // ★ タイムアウト付きでPromiseを待つ（画面固まり対策）
      await Promise.race([
        new Promise<void>((resolve) => {
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
        }),
        // タイムアウト: 15秒で強制的にresolve
        new Promise<void>((resolve) => {
          setTimeout(() => {
            console.warn('[TTS] Audio playback timeout (15s) - forcing resolve');
            if (currentAudioRef.current === audio) {
              audio.pause();
              URL.revokeObjectURL(audioUrl);
              currentAudioRef.current = null;
              isSpeakingRef.current = false;
            }
            resolve();
          }, 15000);
        })
      ]);
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

    // ★ フリーズ検出を開始
    startFreezeDetection();
    updateActivity();

    // Create new AbortController for this question
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    isProcessingRef.current = false;
    setShowText(false);
    dispatch({ type: 'RESET_TO_IDLE' });
    setLastRecognized('');
    capturedRef.current = [];

    stopCurrentAudio();
    forceStopRecognition();

    try {
      setBannerText(q.is_demo && questionIndex === 0 ? 'start a demo !' : `Question ${questionIndex + 1} !`);
      await delay(1200, abortControllerRef.current.signal);
      setBannerText(null);

      dispatch({ type: 'START_SPEAKING' });
      statusRef.current = 'speaking';
      startTimer();

      // ★ 1回目の読み上げ
      await speakAwaitTTS(q.question_text);
      if (isProcessingRef.current) {
        console.log('[Question] Processing interrupted after 1st speak');
        return;
      }

      await delay(DLY.betweenSpeaks, abortControllerRef.current.signal);
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

      await delay(DLY.betweenSpeaks, abortControllerRef.current.signal);
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
        await delay(DLY.afterThirdSpeakBeforeDemoAns, abortControllerRef.current.signal);
        if (isProcessingRef.current) {
          console.log('[Question] Processing interrupted during demo delay');
          return;
        }
        isProcessingRef.current = true;
        clearTimer();
        stopCurrentAudio();

        // ★ 攻撃音を再生（非同期で開始）
        const attackSoundPromise = playSoundAwait('attack.mp3');
        dispatch({ type: 'START_BEAM' });
        statusRef.current = 'beam';
        await delay(DLY.beam, abortControllerRef.current.signal);

        dispatch({ type: 'START_EXPLOSION' });
        statusRef.current = 'explosion';
        await delay(DLY.explosion, abortControllerRef.current.signal);

        dispatch({ type: 'REVEAL_ANSWER' });
        statusRef.current = 'reveal';

        // ★ 攻撃音が完全に終了するのを待つ
        console.log('[Sound] Waiting for attack sound to finish before playing answer...');
        await attackSoundPromise;
        console.log('[Sound] Attack sound finished, now playing answer');

        if (q.answers?.[0]) {
          await speakAwaitTTS(q.answers[0], true);
        }

        await delay(DLY.afterReveal, abortControllerRef.current.signal);

        startIntermissionThenNext();
      } else {
        dispatch({ type: 'START_LISTENING' });
        statusRef.current = 'listening';
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        console.log('[Question] Aborted');
      } else {
        throw e;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearTimer, startTimer, speakAwaitTTS, stopCurrentAudio, forceStopRecognition, startFreezeDetection, updateActivity]);

  // ---------------------- Intermission => Next ----------------------
  const startIntermissionThenNext = useCallback(async () => {
    const q = questionsRef.current[idxRef.current];
    const ans = q?.answers?.[0] ?? '';
    console.log(`[Intermission] Question ${idxRef.current + 1} complete`, {
      isDemo: q?.is_demo,
      currentCorrect: realCorrectRef.current
    });

    const snapshot: IntermissionSnapshot = {
      text: q?.question_text ?? '',
      answer: ans,
      enemy: enemyVariant,
    };

    dispatch({ type: 'START_INTERMISSION', snapshot });
    statusRef.current = 'intermission';

    try {
      await delay(DLY.intermission, abortControllerRef.current?.signal);
      moveToNextQuestion();
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        console.log('[Intermission] Aborted');
      } else {
        throw e;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enemyVariant]);

  const moveToNextQuestion = useCallback(async () => {
    // ★ アクティビティを更新
    updateActivity();

    clearTimer();
    isProcessingRef.current = false;
    setMicActive(false);

    stopCurrentAudio();
    forceStopRecognition();

    const next = idxRef.current + 1;
    console.log(`[Progress] Moving from question ${idxRef.current + 1} to ${next + 1}`, {
      totalQuestions: questionsRef.current.length,
      currentCorrect: realCorrectRef.current
    });

    if (next >= questionsRef.current.length) {
      console.log('[Game] All questions completed');
      dispatch({ type: 'FINISH_GAME' });
      statusRef.current = 'finished';
      finishGame();
      return;
    }

    setIdx(next);
    idxRef.current = next;
    setShowText(false);
    dispatch({ type: 'RESET_TO_IDLE' });
    statusRef.current = 'idle';

    try {
      await delay(DLY.beforeNextQuestion, abortControllerRef.current?.signal);
      startQuestionForIndex(next);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        console.log('[MoveNext] Aborted');
      } else {
        throw e;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearTimer, stopCurrentAudio, forceStopRecognition, startQuestionForIndex, updateActivity]);

  // ---------------------- Mic Toggle & Evaluate ----------------------
  const toggleMic = useCallback(() => {
    // ★ speaking, listening, wrong, grace_period状態でマイクを操作可能（問題音声中でも回答可能）
    if (!['speaking', 'listening', 'wrong', 'grace_period'].includes(status) || timeLeft <= 0) return;
    if (!micActive) startRecognition();
    else stopRecognitionAndEvaluate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, timeLeft, micActive]);

  const startRecognition = useCallback(() => {
    const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SR) {
      alert('このブラウザは音声認識に未対応です(Chrome 推奨)');
      return;
    }

    // ★ 問題の音声再生中にマイクをオンにした場合、音声を停止してlistening状態に移行
    if (statusRef.current === 'speaking') {
      console.log('[ASR] Stopping question audio to start listening');
      stopCurrentAudio();
      dispatch({ type: 'START_LISTENING' });
      statusRef.current = 'listening';
      // アクティビティを更新
      updateActivity();
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
            dispatch({ type: 'RECOGNITION_DETECTED' });
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

      // ★ 競合状態対策: 停止フラグが立っている場合は再起動しない
      if (stoppingRef.current) {
        console.log('[ASR] Not restarting - stopping flag is set');
        setMicActive(false);
        micActiveRef.current = false;
        return;
      }

      // ★ マイクが非アクティブなら再起動しない
      if (!micActiveRef.current) {
        console.log('[ASR] Not restarting - mic is inactive');
        return;
      }

      // ★ タイムアウトまたは処理中の場合は再起動しない
      if (isProcessingRef.current) {
        console.log('[ASR] Not restarting - processing in progress');
        setMicActive(false);
        micActiveRef.current = false;
        return;
      }

      if (timeLeftRef.current <= 0) {
        console.log('[ASR] Not restarting - time expired');
        setMicActive(false);
        micActiveRef.current = false;
        return;
      }

      // ★ 有効なステータスでない場合は再起動しない（grace_periodを追加）
      const shouldRestart = ['speaking', 'listening', 'wrong', 'grace_period'].includes(statusRef.current);

      if (shouldRestart) {
        try {
          rec.start();
          console.log('[ASR] Auto-restarted');
        } catch (err) {
          console.warn('[ASR] Failed to restart:', err);
          setMicActive(false);
          micActiveRef.current = false;
        }
      } else {
        console.log('[ASR] Not restarting - invalid status:', statusRef.current);
        setMicActive(false);
        micActiveRef.current = false;
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

    // ★ 何も認識されていない場合は評価をスキップ
    if (capturedRef.current.length === 0) {
      console.log('[ASR] No speech captured - skipping evaluation, staying in listening state');
      return;
    }

    console.log('[ASR] Stopped for evaluation - evaluating captured speech');
    evaluateCaptured();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const evaluateCaptured = useCallback(async () => {
    // ★ 競合状態対策: 既に処理中の場合はスキップ
    if (isProcessingRef.current) {
      console.log('[Eval] Already processing - skipping');
      return;
    }

    // ★ アクティビティを更新
    updateActivity();

    // ★ 競合状態対策: 処理開始をマーク（タイムアウトとの競合を防ぐ）
    isProcessingRef.current = true;
    console.log('[Eval] Starting evaluation - setting isProcessingRef to true');

    // ★ タイマーを即座に停止（タイムアウトとの競合を防ぐ）
    clearTimer();

    const q = questionsRef.current[idxRef.current];
    if (!q) {
      console.log('[Eval] No question found - skipping');
      isProcessingRef.current = false;
      return;
    }

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

    // ★ 性能最適化: 完全一致チェックを先に実行
    outer: for (const h of heard) {
      for (const a of answers) {
        if (h === a) {
          isCorrect = true;
          matchDetails = `Exact match: "${h}" === "${a}"`;
          break outer;
        }
      }
    }

    // ★ 完全一致しなかった場合のみ、ファジーマッチを実行
    if (!isCorrect) {
      outer2: for (const h of heard) {
        for (const a of answers) {
          const s = simLevenshtein(h, a);
          const j = jaccard(h, a);
          if (s >= 0.66 || j >= 0.6) {
            isCorrect = true;
            matchDetails = `Fuzzy match: "${h}" ≈ "${a}" (Levenshtein: ${s.toFixed(2)}, Jaccard: ${j.toFixed(2)})`;
            break outer2;
          }
        }
      }
    }

    console.log('Result:', isCorrect ? '✓ CORRECT' : '✗ WRONG');
    if (isCorrect) console.log('Match:', matchDetails);
    console.groupEnd();

    if (isCorrect) {
      // ★ 問題の音声が終了するまで待つ
      await waitForCurrentAudioToFinish();

      // ★ 音量を確実に復元
      originalVolumeRef.current = TTS_VOLUME;
      console.log('[Eval] Audio volume restored for answer playback');

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

      try {
        // ★ 攻撃音を再生（非同期で開始）
        const attackSoundPromise = playSoundAwait('attack.mp3');
        dispatch({ type: 'START_BEAM' });
        statusRef.current = 'beam';
        await delay(DLY.beam, abortControllerRef.current?.signal);

        // ★ 処理中断チェック
        if (!isProcessingRef.current) {
          console.log('[Eval] Processing was cancelled during beam');
          return;
        }

        dispatch({ type: 'START_EXPLOSION' });
        statusRef.current = 'explosion';
        await delay(DLY.explosion, abortControllerRef.current?.signal);

        // ★ 処理中断チェック
        if (!isProcessingRef.current) {
          console.log('[Eval] Processing was cancelled during explosion');
          return;
        }

        dispatch({ type: 'REVEAL_ANSWER' });
        statusRef.current = 'reveal';

        // ★ 攻撃音が完全に終了するのを待つ
        console.log('[Sound] Waiting for attack sound to finish before playing answer...');
        await attackSoundPromise;
        console.log('[Sound] Attack sound finished, now playing answer');

        if (q.answers?.[0]) {
          await speakAwaitTTS(q.answers[0], true);
        }

        // ★ 処理中断チェック
        if (!isProcessingRef.current) {
          console.log('[Eval] Processing was cancelled after TTS');
          return;
        }

        await delay(DLY.afterReveal, abortControllerRef.current?.signal);

        // ★ 最終チェック
        if (!isProcessingRef.current) {
          console.log('[Eval] Processing was cancelled before intermission');
          return;
        }

        startIntermissionThenNext();
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          console.log('[Eval] Aborted');
        } else {
          throw e;
        }
      }
    } else {
      // ★ 不正解の場合: タイマーが残っている場合のみlistening状態に戻る
      dispatch({ type: 'WRONG_ANSWER' });
      statusRef.current = 'wrong';
      playSound('miss.mp3');

      try {
        await delay(600, abortControllerRef.current?.signal);

        // ★ タイマーが残っているかチェック
        if (deadlineRef.current && Date.now() < deadlineRef.current) {
          // ★ 不正解の場合は処理完了をマーク（listening状態に戻る）
          isProcessingRef.current = false;
          console.log('[Eval] Wrong answer - resetting isProcessingRef and returning to listening state');
          dispatch({ type: 'START_LISTENING' });
          statusRef.current = 'listening';
          // タイマーを再開
          startTimer();
        } else {
          console.log('[Eval] Wrong answer - time expired, not returning to listening');
          // タイムアウトの場合は処理を続行（isProcessingRef.currentはtrueのまま）
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          console.log('[Eval] Wrong answer delay aborted');
        } else {
          throw e;
        }
      }
    }
  }, [clearTimer, waitForCurrentAudioToFinish, forceStopRecognition, speakAwaitTTS, startIntermissionThenNext, updateActivity, startTimer]);

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
    // ★ questionsから part_id を取得（全ての質問は同じpart_idを持つ）
    const part_id = questionsRef.current[0]?.part_id || partInfo?.part_id || '';

    try {
      if (!userId) {
        console.error('[API] No userId found in localStorage');
        throw new Error('ユーザーIDが見つかりません');
      }
      if (!part_id) {
        console.error('[API] No part_id found', {
          questionsCount: questionsRef.current.length,
          firstQuestionPartId: questionsRef.current[0]?.part_id,
          partInfo: partInfo
        });
        throw new Error('パートIDが見つかりません');
      }

      // ★ スコア送信
      console.log('📤 [REQUEST] Sending score to backend...', {
        userId,
        part_id,
        scores: finalCorrect,
        clear,
        endpoint: 'POST /game/score'
      });

      const scoreResponse = await fetch('http://localhost:4000/game/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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

      // ★ スコア保存成功をコンソールに明示的にログ
      console.log(`✅ [SUCCESS] Score saved to sheets! Score ID: ${scoreData.score_id}`);

      // ★ クリアした場合のみ進捗を更新
      if (clear) {
        console.log('📈 [PROGRESS] Game cleared! Attempting to advance user progress...');

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

        console.log('📤 [REQUEST] Sending progress update to backend...', {
          ...advancePayload,
          endpoint: 'POST /game/advance'
        });

        const advanceResponse = await fetch('http://localhost:4000/game/advance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
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
          console.log('✅ [SUCCESS] Progress advanced successfully!', {
            reason: advanceData.reason,
            next: advanceData.next
          });

          // ★ LocalStorageを更新
          if (advanceData.next) {
            localStorage.setItem('current_grade', String(advanceData.next.grade_id));
            localStorage.setItem('current_part', String(advanceData.next.part_no));
            localStorage.setItem('current_subpart', String(advanceData.next.subpart_no));
            console.log('✅ [SUCCESS] User progress updated in localStorage:', {
              grade: advanceData.next.grade_id,
              part: advanceData.next.part_no,
              subpart: advanceData.next.subpart_no
            });
          }
        } else {
          console.log('ℹ️ [INFO] Progress not advanced (need more attempts):', {
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

      let errorMessage = 'スコアの保存中にエラーが発生しました。';
      let shouldAlert = true;

      if (err instanceof Error) {
        errorMessage += `\n\nエラー: ${err.message}`;

        // fetchエラーの場合
        if (err.message.includes('Failed to fetch')) {
          errorMessage = 'サーバーに接続できません。バックエンドが起動しているか確認してください。';
        }
      }

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

      // ユーザーにエラーを通知
      if (shouldAlert) {
        alert(
          errorMessage +
          '\n\nスコアが保存されていない可能性があります。' +
          '\n詳細はブラウザのコンソール（F12）を確認してください。'
        );
      }
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

  // ★ speaking, listening, wrong, grace_period状態でマイクボタン有効（問題音声中でも回答可能）
  const gunBtnEnabled = ['speaking', 'listening', 'wrong', 'grace_period'].includes(status) && timeLeft > 0 && !(current?.is_demo && idx === 0);
  const gunBtnClass = [
    'gun-button',
    gunBtnEnabled ? 'enabled' : 'disabled',
    micActive ? 'mic-active' : 'mic-inactive'
  ].join(' ');

  return (
    <div className="play-page">
      {/* フリーズ検出ダイアログ */}
      {freezeDetected && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            padding: '40px',
            borderRadius: '12px',
            maxWidth: '500px',
            textAlign: 'center',
            border: '2px solid #ef4444'
          }}>
            <h2 style={{ color: '#ef4444', marginBottom: '20px', fontSize: '24px' }}>
              ⚠️ エラーが発生しました
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '30px', lineHeight: '1.6' }}>
              ゲームが正常に動作していない可能性があります。<br />
              ログイン画面に戻ってやり直してください。
            </p>
            <Button onClick={() => {
              stopFreezeDetection();
              clearTimer();
              stopCurrentAudio();
              forceStopRecognition();
              nav('/login');
            }}>
              ログイン画面に戻る
            </Button>
          </div>
        </div>
      )}

      {/* 左上: Time Limit */}
      <div className="time-limit-container">
        <div className="time-limit-label">Time Limit</div>
        <div
          className="time-limit-display"
          style={{
            color: status === 'grace_period' ? '#ef4444' : undefined,
            animation: status === 'grace_period' ? 'pulse 0.5s ease-in-out infinite' : undefined
          }}
        >
          {timeLeft}
        </div>
      </div>

      {/* Grace Period Warning */}
      {status === 'grace_period' && (
        <div style={{
          position: 'absolute',
          top: '120px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(239, 68, 68, 0.9)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '18px',
          fontWeight: 'bold',
          zIndex: 100,
          animation: 'pulse 0.5s ease-in-out infinite',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.5)'
        }}>
          ⚠️ Finish speaking!
        </div>
      )}

      {/* 右上: マイク状態 */}
      {['speaking', 'listening', 'wrong', 'grace_period'].includes(status) && (
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