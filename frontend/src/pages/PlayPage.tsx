import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { apiFetch, formatApiError, ApiError } from '../utils/apiClient';
import '../App.css';
import './PlayPage.css';

import type { Q, PartInfo, IntermissionSnapshot, GamePhase } from '../types/game';
import type { SpeechRecognition, SpeechRecognitionEvent, SpeechRecognitionErrorEvent } from '../types/speechRecognition';
import { CORRECT_TO_CLEAR, MAX_QUESTIONS, TIME_LIMIT, DLY, TTS_VOLUME, FUZZY_MATCH_THRESHOLD, FREEZE_TIMEOUT_MS, FREEZE_CHECK_INTERVAL_MS } from '../constants/game';
import { useAuth } from '../hooks/useAuth';
import { normalize, simLevenshtein, jaccard, containsAsToken } from '../utils/textMatch';
import { playSound, playSoundAwait } from '../utils/sound';
import { delay } from '../utils/delay';
import { speakText, prefetchSpeech } from '../utils/ttsAudio';
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
  // 画像の読み込みに失敗した問題は、2カラムをやめて問題文を全幅表示に戻す (No141/B-10)
  const [imageBroken, setImageBroken] = useState(false);
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
  // フリーズ回復ダイアログ表示中フラグ(非同期処理からの参照用)。
  // 表示中はゲーム進行を再開させず、ユーザーの明示操作まで閉じない (No137/B-06)
  const frozenRef = useRef(false);

  const isProcessingRef = useRef(false);
  const questionsRef = useRef<Q[]>([]);
  const idxRef = useRef(0);
  const statusRef = useRef<GamePhase>('idle');
  const realCorrectRef = useRef(0);
  const remainingTimeRef = useRef(TIME_LIMIT);
  const timerIntervalRef = useRef<number | null>(null);

  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { idxRef.current = idx; setImageBroken(false); }, [idx]);
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
    if (frozenRef.current) return;
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
      // タイマーが進んでいる間はゲームが生きているのでフリーズ扱いにしない
      // (回答待ちの無操作30秒で回復ダイアログが誤表示されるのを防ぐ)
      updateActivity();

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
  // startFreezeDetection は停止系ヘルパー(stopCurrentAudio等)に依存するため後方で定義する

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

        const j1 = await apiFetch<{ ok: boolean; part: PartInfo }>(
          `/game/part?grade=${g}&part=${p}&subpart=${s}`
        );
        setPartInfo(j1.part);

        const j2 = await apiFetch<{ ok: boolean; questions: Q[] }>(
          `/game/questions?part_id=${encodeURIComponent(j1.part.part_id)}`
        );
        const qs: Q[] = (j2.questions || []).slice(0, MAX_QUESTIONS);

        setQuestions(qs);
        questionsRef.current = qs;
        setIdx(0);
        idxRef.current = 0;
        setRealCorrect(0);
        realCorrectRef.current = 0;
        setShowRequirement(true);
      } catch (e) {
        setError(formatApiError(e, '問題の取得に失敗しました'));
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

  // フリーズ検知: 一定時間アクティビティが無ければ回復ダイアログを表示する。
  // 検知時は裏で走っている進行処理をすべて止め、ダイアログはユーザーが
  // リトライ/次の問題へ/やめる を選ぶまで閉じない (No137/B-06)
  const startFreezeDetection = useCallback(() => {
    lastActivityRef.current = Date.now();
    frozenRef.current = false;
    setFrozen(false);
    if (freezeDetectionTimerRef.current) {
      window.clearInterval(freezeDetectionTimerRef.current);
    }
    freezeDetectionTimerRef.current = window.setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      if (timeSinceActivity > FREEZE_TIMEOUT_MS && statusRef.current !== 'finished' && statusRef.current !== 'idle') {
        console.error(`[Freeze] Game appears to be frozen - no activity for ${FREEZE_TIMEOUT_MS / 1000} seconds`);
        frozenRef.current = true;
        setFrozen(true);
        // 詰まっていた処理が後から解けてダイアログ裏でゲームが進行
        // (=ダイアログが勝手に閉じる)しないよう、進行中の処理を停止する
        if (abortControllerRef.current) abortControllerRef.current.abort();
        stopCurrentAudio();
        forceStopRecognition();
        stopTimer();
        isProcessingRef.current = false;
        if (freezeDetectionTimerRef.current) {
          window.clearInterval(freezeDetectionTimerRef.current);
          freezeDetectionTimerRef.current = null;
        }
      }
    }, FREEZE_CHECK_INTERVAL_MS);
  }, [stopCurrentAudio, forceStopRecognition, stopTimer]);

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
    // フリーズダイアログ表示中は進行しない(ユーザー操作で明示的に再開する)
    if (frozenRef.current) return;

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
    if (frozenRef.current) return;
    const q = questionsRef.current[idxRef.current];
    const ans = q?.answers?.[0] ?? '';

    const snapshot: IntermissionSnapshot = {
      text: q?.question_text ?? '',
      answer: ans,
      enemy: enemyVariant,
    };

    dispatchAndSync({ type: 'START_INTERMISSION', snapshot }, 'intermission');

    // 次の問題の音声・画像を先読みし、読み上げ欠落・表示遅延を防ぐ (No145/No146)
    const nextQ = questionsRef.current[idxRef.current + 1];
    if (nextQ) {
      if (nextQ.question_text) prefetchSpeech(nextQ.question_text);
      if (nextQ.answers?.[0]) prefetchSpeech(nextQ.answers[0]);
      if (nextQ.image_url) { new Image().src = nextQ.image_url; }
    }

    try {
      await delay(DLY.intermission, abortControllerRef.current?.signal);
      moveToNextQuestion();
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) throw e;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enemyVariant, dispatchAndSync]);

  const moveToNextQuestion = useCallback(async () => {
    if (frozenRef.current) return;
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

    // 1語だけの正解(主語を答える問題など)は、認識文に単語として含まれていれば正解 (No149)
    if (!isCorrect) {
      outerToken: for (const h of heard) {
        for (const a of answers) {
          if (containsAsToken(h, a)) { isCorrect = true; break outerToken; }
        }
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
    if (frozenRef.current) return;
    const nonDemoCount = questionsRef.current.filter(q => !q.is_demo).length;
    const finalCorrect = realCorrectRef.current;
    const clear = finalCorrect >= CORRECT_TO_CLEAR;

    const userId = session?.userId || '';
    const part_id = questionsRef.current[0]?.part_id || partInfo?.part_id || '';
    let advanced = false;

    try {
      if (!userId) throw new Error('ユーザーIDが見つかりません');
      if (!part_id) throw new Error('パートIDが見つかりません');

      // スコア送信
      await apiFetch(`/game/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, part_id, scores: finalCorrect, clear }),
      });

      // 進捗更新: クリア時に加え、未クリアでも規定回数(10回)挑戦していれば
      // バックエンドが解放判定するため、結果確定のたびに必ず問い合わせる
      const currentGrade = grade ?? session?.currentGrade ?? '1';
      const currentPart = part ?? session?.currentPart ?? '1';
      const currentSubpart = subpart ?? session?.currentSubpart ?? '1';

      const advanceData = await apiFetch<{
        ok: boolean;
        advanced?: boolean;
        next?: { grade_id: number; part_no: number; subpart_no: number };
      }>(`/game/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          current: { grade: currentGrade, part: currentPart, subpart: currentSubpart },
          part_id,
          clear
        }),
      });

      if (advanceData.ok && advanceData.advanced && advanceData.next) {
        advanced = true;
        updateProgress(advanceData.next.grade_id, advanceData.next.part_no, advanceData.next.subpart_no);
      }
    } catch (err) {
      // 認証切れはAuthExpiryHandlerがログイン画面へ誘導する (No139/No140)
      if (err instanceof ApiError && err.code === 'AUTH-001') return;
      let errorMessage = 'スコアの保存中にエラーが発生しました。';
      if (err instanceof ApiError && err.code === 'NET-001') {
        errorMessage = 'サーバーに接続できません。通信環境を確認してください。';
      } else if (err instanceof Error) {
        errorMessage += `\n\nエラー: ${formatApiError(err)}`;
      }
      alert(
        errorMessage +
        '\n\nスコアが保存されていない可能性があります。' +
        '\n詳細はブラウザのコンソール（F12）を確認してください。'
      );
    }

    nav('/result', { state: { clear, correct: finalCorrect, total: nonDemoCount, advanced } });
  }, [partInfo, grade, part, subpart, nav, session, updateProgress]);

  // ---------------------- Freeze Recovery ----------------------
  const handleFreezeRecovery = useCallback(() => {
    frozenRef.current = false;
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

  // ---------------------- Quit Button ----------------------
  const handleQuit = useCallback(() => {
    // 全てのプロセスを停止
    if (abortControllerRef.current) abortControllerRef.current.abort();
    stopCurrentAudio();
    forceStopRecognition();
    stopFreezeDetection();
    stopTimer();
    isProcessingRef.current = false;
    nav('/select');
  }, [nav, stopCurrentAudio, forceStopRecognition, stopFreezeDetection, stopTimer]);

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
        {!showRequirement && (
          <button className="quit-button" onClick={handleQuit}>
            やめる
          </button>
        )}
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

          <div className={`question-text${current?.image_url && !imageBroken ? ' with-image' : ''}`}>
            {!bannerText && showText && current ? current.question_text : ''}
          </div>

          {current?.image_url && !imageBroken && (
            <div className="question-image-container">
              <img
                src={current.image_url}
                alt=""
                className="question-image"
                onError={() => setImageBroken(true)}
              />
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

      {/* フリーズ回復ダイアログ */}
      {frozen && (
        <div className="freeze-overlay">
          <div className="freeze-dialog">
            <h3>画面が停止しました</h3>
            <p>問題の読み込み中にエラーが発生した可能性があります。</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Button onClick={() => {
                frozenRef.current = false;
                setFrozen(false);
                // 現在の問題をリトライ
                if (abortControllerRef.current) abortControllerRef.current.abort();
                stopCurrentAudio();
                forceStopRecognition();
                stopTimer();
                isProcessingRef.current = false;
                startQuestionForIndex(idxRef.current);
              }}>リトライ</Button>
              <Button onClick={handleFreezeRecovery}>次の問題へ</Button>
              <Button onClick={handleQuit}>やめる</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayPage;
