import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { API_URL } from '../config';
import '../App.css';
import './PlayPage.css';

import type { Q, PartInfo, IntermissionSnapshot, GamePhase } from '../types/game';
import type { SpeechRecognition, SpeechRecognitionEvent, SpeechRecognitionErrorEvent } from '../types/speechRecognition';
import { CORRECT_TO_CLEAR, MAX_QUESTIONS, TIME_LIMIT, DLY, TTS_VOLUME, FUZZY_MATCH_THRESHOLD } from '../constants/game';
import { useAuth } from '../hooks/useAuth';
import { normalize, simLevenshtein, jaccard } from '../utils/textMatch';
import { playSound, playSoundAwait } from '../utils/sound';
import { delay } from '../utils/delay';
import { speakText } from '../utils/ttsAudio';
import { gameStateReducer, initialGameState } from '../hooks/gameReducer';

// ------------------------ Component --------------------------
const PlayPage: React.FC = () => {
  const nav = useNavigate();
  const loc = useLocation();
  const { session, updateProgress } = useAuth();
  const { grade, part, subpart } =
    (loc.state as { grade?: string; part?: string; subpart?: string } | null) ||
    { grade: undefined, part: undefined, subpart: undefined };

  const [loading, setLoading] = useState(true);
  const [partInfo, setPartInfo] = useState<PartInfo | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [showRequirement, setShowRequirement] = useState(true);
  const [showText, setShowText] = useState(false);
  const [realCorrect, setRealCorrect] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState(TIME_LIMIT);

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

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isSpeakingRef = useRef(false);
  const originalVolumeRef = useRef<number>(TTS_VOLUME);

  const freezeDetectionTimerRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const isProcessingRef = useRef(false);
  const questionsRef = useRef<Q[]>([]);
  const idxRef = useRef(0);
  const statusRef = useRef<GamePhase>('idle');
  const realCorrectRef = useRef(0);
  const remainingTimeRef = useRef(TIME_LIMIT);
  const timerIntervalRef = useRef<number | null>(null);

  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { idxRef.current = idx; }, [idx]);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { realCorrectRef.current = realCorrect; }, [realCorrect]);
  useEffect(() => { remainingTimeRef.current = remainingTime; }, [remainingTime]);

  const current = questions[idx];
  const questionNo = idx + 1;

  // ---------------------- Helpers ----------------------
  const dispatchAndSync = useCallback((action: Parameters<typeof dispatch>[0], phase: GamePhase) => {
    dispatch(action);
    statusRef.current = phase;
  }, []);

  const isProcessingCancelled = useCallback(() => !isProcessingRef.current, []);

  // ---------------------- Countdown Timer ----------------------
  const handleTimeUp = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    stopTimer();
    forceStopRecognition();
    originalVolumeRef.current = TTS_VOLUME;

    await waitForCurrentAudioToFinish();

    try {
      dispatchAndSync({ type: 'TIMEOUT' }, 'timeout');

      await delay(DLY.afterTimeoutBeforeReveal, abortControllerRef.current?.signal);
      if (isProcessingCancelled()) return;

      dispatchAndSync({ type: 'REVEAL_ANSWER' }, 'reveal');

      const q = questionsRef.current[idxRef.current];
      if (q?.answers?.[0]) {
        await speakAwaitTTS(q.answers[0], true);
      }

      if (isProcessingCancelled()) return;
      await delay(DLY.afterReveal, abortControllerRef.current?.signal);
      if (isProcessingCancelled()) return;

      startIntermissionThenNext();
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) throw e;
    } finally {
      updateActivity();
    }
  }, []);

  const startTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
    }

    setRemainingTime(TIME_LIMIT);
    remainingTimeRef.current = TIME_LIMIT;

    timerIntervalRef.current = window.setInterval(() => {
      remainingTimeRef.current -= 1;
      setRemainingTime(remainingTimeRef.current);

      if (remainingTimeRef.current <= 0) {
        if (timerIntervalRef.current) {
          window.clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        handleTimeUp();
      }
    }, 1000);
  }, [handleTimeUp]);

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const [frozen, setFrozen] = useState(false);

  // ---------------------- Freeze Detection ----------------------
  const startFreezeDetection = useCallback(() => {
    lastActivityRef.current = Date.now();
    setFrozen(false);
    if (freezeDetectionTimerRef.current) {
      window.clearInterval(freezeDetectionTimerRef.current);
    }
    freezeDetectionTimerRef.current = window.setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      if (timeSinceActivity > 30000 && statusRef.current !== 'finished' && statusRef.current !== 'idle') {
        console.error('[Freeze] Game appears to be frozen - no activity for 30 seconds');
        setFrozen(true);
        if (freezeDetectionTimerRef.current) {
          window.clearInterval(freezeDetectionTimerRef.current);
          freezeDetectionTimerRef.current = null;
        }
      }
    }, 5000);
  }, []);

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const stopFreezeDetection = useCallback(() => {
    if (freezeDetectionTimerRef.current) {
      window.clearInterval(freezeDetectionTimerRef.current);
      freezeDetectionTimerRef.current = null;
    }
  }, []);

  // ---------------------- Stop Recognition ----------------------
  const forceStopRecognition = useCallback(() => {
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

  // ★ 現在の音声が終了するまで待つ
  const waitForCurrentAudioToFinish = useCallback(async () => {
    if (!currentAudioRef.current || !isSpeakingRef.current) return;

    return new Promise<void>((resolve) => {
      const audio = currentAudioRef.current;
      if (!audio) { resolve(); return; }

      const onEnded = () => {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onEnded);
        resolve();
      };

      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onEnded);

      if (audio.ended || audio.paused) onEnded();
    });
  }, []);

  // ---------------------- Load ----------------------
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const g = grade ?? session?.currentGrade ?? '1';
        const p = part ?? session?.currentPart ?? '1';
        const s = subpart ?? session?.currentSubpart ?? '1';

        const r1 = await fetch(`${API_URL}/game/part?grade=${g}&part=${p}&subpart=${s}`, {
          credentials: 'include'
        });
        if (!r1.ok) {
          const errorData = await r1.json().catch(() => ({ message: 'part 取得失敗' }));
          throw new Error(errorData.message || 'part 取得失敗');
        }
        const j1 = await r1.json();
        setPartInfo(j1.part);

        const r2 = await fetch(`${API_URL}/game/questions?part_id=${encodeURIComponent(j1.part.part_id)}`, {
          credentials: 'include'
        });
        if (!r2.ok) {
          const errorData = await r2.json().catch(() => ({ message: 'questions 取得失敗' }));
          throw new Error(errorData.message || 'questions 取得失敗');
        }
        const j2 = await r2.json();
        const qs: Q[] = (j2.questions || []).slice(0, MAX_QUESTIONS);

        setQuestions(qs);
        questionsRef.current = qs;
        setIdx(0);
        idxRef.current = 0;
        setRealCorrect(0);
        realCorrectRef.current = 0;
        setShowRequirement(true);
      } catch (e) {
        const err = e as Error;
        setError(err.message || String(e));
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      stopCurrentAudio();
      forceStopRecognition();
      stopFreezeDetection();
      stopTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade, part, subpart, forceStopRecognition, stopTimer]);

  // ---------------------- Audio Control ----------------------
  const muteCurrentAudio = useCallback(() => {
    if (currentAudioRef.current) {
      originalVolumeRef.current = currentAudioRef.current.volume;
      currentAudioRef.current.volume = 0;
    }
  }, []);

  const unmuteCurrentAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.volume = originalVolumeRef.current;
    }
  }, []);

  const stopCurrentAudio = useCallback(() => {
    if (currentAudioRef.current) {
      const audio = currentAudioRef.current;
      audio.pause();
      audio.currentTime = 0;

      if (audio.onended) {
        audio.onended(new Event('ended'));
      }

      currentAudioRef.current = null;
    }
    isSpeakingRef.current = false;
  }, []);

  useEffect(() => {
    if (micActive) muteCurrentAudio();
    else unmuteCurrentAudio();
  }, [micActive, muteCurrentAudio, unmuteCurrentAudio]);

  // ---------------------- Google TTS Speech ----------------------
  const speakAwaitTTS = useCallback(async (text: string, isAnswer = false): Promise<void> => {
    if (!isAnswer && isProcessingRef.current && !['reveal', 'beam', 'explosion'].includes(statusRef.current)) {
      return;
    }

    await speakText(text, {
      isAnswer,
      micActive: micActiveRef.current,
      currentAudioRef,
      isSpeakingRef,
    });
  }, []);

  // ---------------------- Attack Sequence (共通化) ----------------------
  const playAttackSequence = useCallback(async (q: Q) => {
    const attackSoundPromise = playSoundAwait('attack.mp3');

    dispatchAndSync({ type: 'START_BEAM' }, 'beam');
    await delay(DLY.beam, abortControllerRef.current?.signal);

    if (isProcessingCancelled()) return;

    dispatchAndSync({ type: 'START_EXPLOSION' }, 'explosion');
    await delay(DLY.explosion, abortControllerRef.current?.signal);

    if (isProcessingCancelled()) return;

    dispatchAndSync({ type: 'REVEAL_ANSWER' }, 'reveal');

    await attackSoundPromise;

    if (q.answers?.[0]) {
      await speakAwaitTTS(q.answers[0], true);
    }

    if (isProcessingCancelled()) return;

    await delay(DLY.afterReveal, abortControllerRef.current?.signal);

    if (isProcessingCancelled()) return;

    startIntermissionThenNext();
  }, [speakAwaitTTS, dispatchAndSync, isProcessingCancelled]);

  // ---------------------- One Question ----------------------
  const startQuestionForIndex = useCallback(async (questionIndex: number) => {
    const q = questionsRef.current[questionIndex];
    if (!q || statusRef.current === 'finished') return;

    startFreezeDetection();
    updateActivity();

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    isProcessingRef.current = false;
    setShowText(false);
    dispatch({ type: 'RESET_TO_IDLE' });
    setLastRecognized('');
    capturedRef.current = [];

    stopCurrentAudio();
    forceStopRecognition();
    stopTimer();

    try {
      setBannerText(q.is_demo && questionIndex === 0 ? 'start a demo !' : `Question ${questionIndex + 1} !`);
      await delay(DLY.bannerDisplay, abortControllerRef.current.signal);
      setBannerText(null);

      setShowText(true);

      dispatchAndSync({ type: 'START_SPEAKING' }, 'speaking');

      // 1回目の読み上げ
      await speakAwaitTTS(q.question_text);
      if (isProcessingRef.current) return;

      await delay(DLY.betweenSpeaks, abortControllerRef.current.signal);
      if (isProcessingRef.current) return;

      // 2回目の読み上げ
      await speakAwaitTTS(q.question_text);
      if (isProcessingRef.current) return;

      if (q.is_demo && questionIndex === 0) {
        await delay(DLY.afterThirdSpeakBeforeDemoAns, abortControllerRef.current.signal);
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        stopCurrentAudio();

        await playAttackSequence(q);
      } else {
        dispatchAndSync({ type: 'START_LISTENING' }, 'listening');

        if (!q.is_demo) {
          startTimer();
        }
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) throw e;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speakAwaitTTS, stopCurrentAudio, forceStopRecognition, startFreezeDetection, updateActivity, startTimer, playAttackSequence, dispatchAndSync]);

  // ---------------------- Intermission => Next ----------------------
  const startIntermissionThenNext = useCallback(async () => {
    const q = questionsRef.current[idxRef.current];
    const ans = q?.answers?.[0] ?? '';

    const snapshot: IntermissionSnapshot = {
      text: q?.question_text ?? '',
      answer: ans,
      enemy: enemyVariant,
    };

    dispatchAndSync({ type: 'START_INTERMISSION', snapshot }, 'intermission');

    try {
      await delay(DLY.intermission, abortControllerRef.current?.signal);
      moveToNextQuestion();
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) throw e;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enemyVariant, dispatchAndSync]);

  const moveToNextQuestion = useCallback(async () => {
    updateActivity();
    isProcessingRef.current = false;
    setMicActive(false);
    stopCurrentAudio();
    forceStopRecognition();

    const next = idxRef.current + 1;

    if (next >= questionsRef.current.length) {
      dispatchAndSync({ type: 'FINISH_GAME' }, 'finished');
      finishGame();
      return;
    }

    setIdx(next);
    idxRef.current = next;
    setShowText(false);
    dispatchAndSync({ type: 'RESET_TO_IDLE' }, 'idle');

    try {
      await delay(DLY.beforeNextQuestion, abortControllerRef.current?.signal);
      startQuestionForIndex(next);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) throw e;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopCurrentAudio, forceStopRecognition, startQuestionForIndex, updateActivity, dispatchAndSync]);

  // ---------------------- Mic Toggle & Evaluate ----------------------
  const toggleMic = useCallback(() => {
    if (!['speaking', 'listening', 'wrong'].includes(status)) return;
    if (!micActive) startRecognition();
    else stopRecognitionAndEvaluate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, micActive]);

  const startRecognition = useCallback(() => {
    const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SR) {
      alert('このブラウザは音声認識に未対応です(Chrome 推奨)');
      return;
    }

    if (statusRef.current === 'speaking') {
      stopCurrentAudio();
      dispatchAndSync({ type: 'START_LISTENING' }, 'listening');
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
          }
        }
      }
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      console.warn('[ASR] Error:', e.error);
    };

    rec.onend = () => {
      if (stoppingRef.current || !micActiveRef.current || isProcessingRef.current) {
        setMicActive(false);
        micActiveRef.current = false;
        return;
      }

      const shouldRestart = ['speaking', 'listening', 'wrong'].includes(statusRef.current);
      if (shouldRestart) {
        try {
          rec.start();
        } catch {
          setMicActive(false);
          micActiveRef.current = false;
        }
      } else {
        setMicActive(false);
        micActiveRef.current = false;
      }
    };

    try {
      rec.start();
      setMicActive(true);
    } catch (err) {
      console.error('[ASR] Failed to start:', err);
    }
  }, []);

  const stopRecognitionAndEvaluate = useCallback(async () => {
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

    if (capturedRef.current.length === 0) {
      stoppingRef.current = false;
      return;
    }

    evaluateCaptured();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const evaluateCaptured = useCallback(async () => {
    if (isProcessingRef.current) return;

    updateActivity();
    isProcessingRef.current = true;

    const q = questionsRef.current[idxRef.current];
    if (!q) {
      isProcessingRef.current = false;
      return;
    }

    const heardRaw = [...capturedRef.current];
    const heard = heardRaw.map(normalize).filter(Boolean);
    const answers = (q.answers || []).map(normalize).filter(Boolean);

    let isCorrect = false;

    // 完全一致チェック
    outer: for (const h of heard) {
      for (const a of answers) {
        if (h === a) { isCorrect = true; break outer; }
      }
    }

    // ファジーマッチ
    if (!isCorrect) {
      outer2: for (const h of heard) {
        for (const a of answers) {
          const s = simLevenshtein(h, a);
          const j = jaccard(h, a);
          if (s >= FUZZY_MATCH_THRESHOLD || j >= FUZZY_MATCH_THRESHOLD) {
            isCorrect = true;
            break outer2;
          }
        }
      }
    }

    if (isCorrect) {
      stopTimer();
      await waitForCurrentAudioToFinish();
      originalVolumeRef.current = TTS_VOLUME;
      forceStopRecognition();

      if (!q.is_demo) {
        setRealCorrect(c => {
          const newCount = c + 1;
          realCorrectRef.current = newCount;
          return newCount;
        });
      }

      try {
        await playAttackSequence(q);
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) throw e;
      }
    } else {
      // 不正解
      dispatchAndSync({ type: 'WRONG_ANSWER' }, 'wrong');
      playSound('miss.mp3');

      try {
        await delay(DLY.wrongAnswerDelay, abortControllerRef.current?.signal);

        capturedRef.current = [];
        setLastRecognized('');

        isProcessingRef.current = false;
        stoppingRef.current = false;
        dispatchAndSync({ type: 'START_LISTENING' }, 'listening');
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) throw e;
      }
    }
  }, [waitForCurrentAudioToFinish, forceStopRecognition, speakAwaitTTS, startIntermissionThenNext, updateActivity, stopTimer, playAttackSequence, dispatchAndSync]);

  // ---------------------- Finish Game ----------------------
  const finishGame = useCallback(async () => {
    const nonDemoCount = questionsRef.current.filter(q => !q.is_demo).length;
    const finalCorrect = realCorrectRef.current;
    const clear = finalCorrect >= CORRECT_TO_CLEAR;

    const userId = session?.userId || '';
    const part_id = questionsRef.current[0]?.part_id || partInfo?.part_id || '';

    try {
      if (!userId) throw new Error('ユーザーIDが見つかりません');
      if (!part_id) throw new Error('パートIDが見つかりません');

      // スコア送信
      const scoreResponse = await fetch(`${API_URL}/game/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, part_id, scores: finalCorrect, clear }),
      });

      if (!scoreResponse.ok) {
        throw new Error(`スコア送信失敗: ${scoreResponse.status}`);
      }

      await scoreResponse.json();

      // クリアした場合のみ進捗を更新
      if (clear) {
        const currentGrade = grade ?? session?.currentGrade ?? '1';
        const currentPart = part ?? session?.currentPart ?? '1';
        const currentSubpart = subpart ?? session?.currentSubpart ?? '1';

        const advanceResponse = await fetch(`${API_URL}/game/advance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            userId,
            current: { grade: currentGrade, part: currentPart, subpart: currentSubpart },
            part_id,
            clear: true
          }),
        });

        if (!advanceResponse.ok) {
          throw new Error(`進捗更新失敗: ${advanceResponse.status}`);
        }

        const advanceData = await advanceResponse.json();

        if (advanceData.ok && advanceData.advanced && advanceData.next) {
          updateProgress(advanceData.next.grade_id, advanceData.next.part_no, advanceData.next.subpart_no);
        }
      }
    } catch (err) {
      let errorMessage = 'スコアの保存中にエラーが発生しました。';
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch')) {
          errorMessage = 'サーバーに接続できません。バックエンドが起動しているか確認してください。';
        } else {
          errorMessage += `\n\nエラー: ${err.message}`;
        }
      }
      alert(
        errorMessage +
        '\n\nスコアが保存されていない可能性があります。' +
        '\n詳細はブラウザのコンソール（F12）を確認してください。'
      );
    }

    nav('/result', { state: { clear, correct: finalCorrect, total: nonDemoCount } });
  }, [partInfo, grade, part, subpart, nav, session, updateProgress]);

  // ---------------------- Freeze Recovery ----------------------
  const handleFreezeRecovery = useCallback(() => {
    setFrozen(false);
    stopCurrentAudio();
    forceStopRecognition();
    stopTimer();

    if (abortControllerRef.current) abortControllerRef.current.abort();

    isProcessingRef.current = false;
    updateActivity();

    const next = idxRef.current + 1;
    if (next >= questionsRef.current.length) {
      dispatchAndSync({ type: 'FINISH_GAME' }, 'finished');
      finishGame();
    } else {
      setIdx(next);
      idxRef.current = next;
      setShowText(false);
      dispatchAndSync({ type: 'RESET_TO_IDLE' }, 'idle');
      setTimeout(() => startQuestionForIndex(next), DLY.beforeNextQuestion);
    }
  }, [stopCurrentAudio, forceStopRecognition, stopTimer, updateActivity, dispatchAndSync, startQuestionForIndex, finishGame]);

  // ---------------------- Start Button ----------------------
  const handleStartClick = useCallback(() => {
    setShowRequirement(false);
    setTimeout(() => startQuestionForIndex(0), DLY.startDelay);
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

  const gunBtnEnabled = ['speaking', 'listening', 'wrong'].includes(status) && !(current?.is_demo && idx === 0);
  const gunBtnClass = [
    'gun-button',
    gunBtnEnabled ? 'enabled' : 'disabled',
    micActive ? 'mic-active' : 'mic-inactive'
  ].join(' ');

  return (
    <div className="play-page">

      {/* 左上: 選択情報 */}
      <div className="selection-info-container">
        <div className="selection-info-item">
          <span className="selection-info-label">Grade:</span>
          <span className="selection-info-value">{grade || '1'}</span>
        </div>
        <div className="selection-info-item">
          <span className="selection-info-label">Part:</span>
          <span className="selection-info-value">{part || '1'}</span>
        </div>
        <div className="selection-info-item">
          <span className="selection-info-label">Subpart:</span>
          <span className="selection-info-value">{subpart || '1'}</span>
        </div>
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

      {/* 左: カウントダウンタイマー (デモ以外) */}
      {!showRequirement && current && !current.is_demo && (
        <div className="timer-container">
          <div className={`timer-display ${remainingTime <= 10 ? 'timer-warning' : ''}`}>
            {remainingTime}s
          </div>
        </div>
      )}

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
          {bannerText && (
            <div className="banner-text">{bannerText}</div>
          )}

          <div className="question-text">
            {!bannerText && showText && current ? current.question_text : ''}
          </div>

          {current?.image_url && (
            <div className="question-image-container">
              <img src={current.image_url} alt="" className="question-image" />
            </div>
          )}

          {status === 'beam' && <div className="beam-effect" />}

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

      {frozen && (
        <div style={{
          position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
        }}>
          <button
            onClick={handleFreezeRecovery}
            style={{
              padding: '12px 32px', fontSize: 18, fontWeight: 'bold',
              color: '#fff', background: '#e74c3c', border: 'none', borderRadius: 8,
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              animation: 'pulse 1.5s infinite',
            }}
          >
            SKIP to Next Question
          </button>
        </div>
      )}
    </div>
  );
};

export default PlayPage;
