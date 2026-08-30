import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { apiFetch, formatApiError, ApiError } from '../utils/apiClient';
import '../App.css';
import './PlayPage.css';

import type { Q, PartInfo, IntermissionSnapshot, GamePhase } from '../types/game';
import type { SpeechRecognition, SpeechRecognitionEvent, SpeechRecognitionErrorEvent } from '../types/speechRecognition';
import { CORRECT_TO_CLEAR, MAX_QUESTIONS, TIME_LIMIT, DLY, TTS_PLAYBACK_TIMEOUT, COLD_START_API_TIMEOUT_MS, FUZZY_MATCH_THRESHOLD, FREEZE_TIMEOUT_MS, FREEZE_CHECK_INTERVAL_MS } from '../constants/game';
import { useAuth } from '../hooks/useAuth';
import { normalize, simLevenshtein, jaccard, containsAsToken, expandWontToWant } from '../utils/textMatch';
import { playSound, playSoundAwait, stopAllSounds } from '../utils/sound';
import { delay } from '../utils/delay';
import { speakText, prefetchSpeech, unlockAudio } from '../utils/ttsAudio';
import { gameStateReducer, initialGameState } from '../hooks/gameReducer';
import { useCountdownTimer } from '../hooks/useCountdownTimer';
import { questionBadgeLabel, questionBannerText } from '../utils/questionNumber';
import { extractTranscripts } from '../utils/recognition';

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
  // 問題文の音声を再生できなかったときの通知表示 (失敗の可視化: No.170-172系)
  const [ttsFailed, setTtsFailed] = useState(false);

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

  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { idxRef.current = idx; setImageBroken(false); }, [idx]);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { realCorrectRef.current = realCorrect; }, [realCorrect]);

  // ---------------------- Countdown Timer ----------------------
  // 壁時計ベースのタイマー(No.159/175/179/186対策)。
  // 時間切れが処理中(不正解演出の600ms等)に来た場合は捨てずに退避し、
  // 処理解放時に再実行する(ワンショットロスト対策: No.173/178)
  const pendingTimeUpRef = useRef(false);
  const handleTimeUpRef = useRef<() => void>(() => {});
  const {
    remaining: remainingTime,
    start: startTimer,
    stop: stopTimer,
    reset: resetTimer,
    pause: pauseTimer,
    resume: resumeTimer,
    isRunning: isTimerRunning,
  } = useCountdownTimer({
    limit: TIME_LIMIT,
    onTimeUp: () => handleTimeUpRef.current(),
    // タイマーが進んでいる間はゲームが生きているのでフリーズ扱いにしない
    onTick: () => { lastActivityRef.current = Date.now(); },
  });

  const current = questions[idx];

  // ---------------------- Helpers ----------------------
  const dispatchAndSync = useCallback((action: Parameters<typeof dispatch>[0], phase: GamePhase) => {
    dispatch(action);
    statusRef.current = phase;
  }, []);

  const isProcessingCancelled = useCallback(() => !isProcessingRef.current, []);

  // ---------------------- Time Up ----------------------
  const handleTimeUp = useCallback(async () => {
    if (frozenRef.current) return;
    if (isProcessingRef.current) {
      // 不正解演出などの処理中: 時間切れを捨てずに退避し、処理解放時に再実行する
      // (旧実装はここでイベントが恒久ロストし「0sのまま終わらない」原因だった: No.173/178/179)
      pendingTimeUpRef.current = true;
      return;
    }
    isProcessingRef.current = true;
    pendingTimeUpRef.current = false;

    stopTimer();
    forceStopRecognition();
    updateActivity();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopTimer]);

  // タイマーの0到達コールバックから最新のhandleTimeUpを呼べるようにする
  useEffect(() => { handleTimeUpRef.current = () => { void handleTimeUp(); }; }, [handleTimeUp]);

  // タブ非表示中に回答受付へ到達した場合は一時停止状態で開始する
  // (仕様: 非表示中はタイマー停止・復帰時に再開。裏で時間切れが進むのを防ぐ)
  const startTimerRespectingVisibility = useCallback(() => {
    startTimer();
    if (document.hidden) pauseTimer();
  }, [startTimer, pauseTimer]);

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

  // ★ 現在の音声が終了するまで待つ(endedが届かない環境でも上限時間で必ず抜ける)
  const waitForCurrentAudioToFinish = useCallback(async () => {
    if (!currentAudioRef.current || !isSpeakingRef.current) return;

    return new Promise<void>((resolve) => {
      const audio = currentAudioRef.current;
      if (!audio) { resolve(); return; }

      let settled = false;
      const onEnded = () => {
        if (settled) return;
        settled = true;
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onEnded);
        resolve();
      };

      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onEnded);
      // 無期限待ちでハングしないための保険
      window.setTimeout(onEnded, TTS_PLAYBACK_TIMEOUT);

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
          `/game/part?grade=${g}&part=${p}&subpart=${s}`,
          {}, { timeoutMs: COLD_START_API_TIMEOUT_MS }
        );
        setPartInfo(j1.part);

        const j2 = await apiFetch<{ ok: boolean; questions: Q[] }>(
          `/game/questions?part_id=${encodeURIComponent(j1.part.part_id)}`,
          {}, { timeoutMs: COLD_START_API_TIMEOUT_MS }
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
  const stopCurrentAudio = useCallback(() => {
    if (currentAudioRef.current) {
      const audio = currentAudioRef.current;
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch { /* noop */ }

      // addEventListenerで待っている側(playAudioBlob/waitForCurrentAudioToFinish)にも
      // 確実に届くよう、直接ハンドラ呼び出しではなくイベントを発火する
      audio.dispatchEvent(new Event('ended'));

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
      // タブ非表示中はtickが間引かれて誤検知するため判定しない(復帰時にupdateActivityされる)
      if (document.hidden) return;
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
    // マイクON中の問題読み上げはミュート(Function Specs G15)。
    // iPad Safariはvolume操作が無効なため、mutedプロパティで制御する (No.177)
    const audio = currentAudioRef.current;
    if (audio) audio.muted = micActive;
  }, [micActive]);

  // ---------------------- タブ非表示対応 ----------------------
  // 非表示中はタイマーを一時停止し、復帰時に生存信号を更新する
  // (スリープ・タブ切替からの復帰で誤フリーズ判定・裏での時間切れを防ぐ)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        pauseTimer();
      } else {
        updateActivity();
        resumeTimer();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [pauseTimer, resumeTimer, updateActivity]);

  // ---------------------- Google TTS Speech ----------------------
  const speakAwaitTTS = useCallback(async (text: string, isAnswer = false): Promise<void> => {
    if (!isAnswer && isProcessingRef.current && !['reveal', 'beam', 'explosion'].includes(statusRef.current)) {
      return;
    }

    updateActivity();
    const result = await speakText(text, {
      isAnswer,
      currentAudioRef,
      isSpeakingRef,
      // ミュートは再生開始時点のマイク状態で決める(取得await前のスナップショットを使わない)
      muted: isAnswer ? undefined : () => micActiveRef.current,
      // 再生の進行を生存信号として流す(読み上げ中の誤フリーズ判定防止: No.170)
      onProgress: updateActivity,
      // やめる・リトライ・次の問題で取得中の音声ごと中断する(孤児音声の根絶)
      signal: abortControllerRef.current?.signal,
    });
    updateActivity();

    // 取得失敗(failed)のみ通知する。空テキスト(skipped)は1-44-1等の仕様スキップ
    if (result === 'failed' && !isAnswer) {
      setTtsFailed(true);
    }
  }, [updateActivity]);

  // ---------------------- Attack Sequence (共通化) ----------------------
  const playAttackSequence = useCallback(async (q: Q) => {
    const attackSoundPromise = playSoundAwait('attack.mp3');

    updateActivity(); // 演出中の誤フリーズ判定防止 (No.170)
    dispatchAndSync({ type: 'START_BEAM' }, 'beam');
    await delay(DLY.beam, abortControllerRef.current?.signal);

    if (isProcessingCancelled()) return;

    updateActivity();
    dispatchAndSync({ type: 'START_EXPLOSION' }, 'explosion');
    await delay(DLY.explosion, abortControllerRef.current?.signal);

    if (isProcessingCancelled()) return;

    updateActivity();
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
    pendingTimeUpRef.current = false; // 前問の時間切れ退避は持ち越さない
    setShowText(false);
    setTtsFailed(false);
    dispatch({ type: 'RESET_TO_IDLE' });
    setLastRecognized('');
    capturedRef.current = [];

    stopCurrentAudio();
    forceStopRecognition();
    resetTimer(); // 前問の残り秒(0s等)を引き継がない (No.159/186)

    try {
      // 番号はデモを除いた本問1〜7で数える (No.166)
      setBannerText(questionBannerText(questionsRef.current, questionIndex));
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
          startTimerRespectingVisibility();
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
    updateActivity();
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
    resetTimer(); // 次問の準備中に前問の残り秒を表示しない (No.159)
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
      // 読み上げ中の早押しでもカウントダウンを開始する
      // (旧実装は通常フローの1箇所でしか起動せず、早押し競合で永久に始まらなかった: No.175)
      const q = questionsRef.current[idxRef.current];
      if (q && !q.is_demo && !isTimerRunning()) {
        startTimerRespectingVisibility();
      }
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
      // 第1候補だけでなくmaxAlternatives分の全候補を蓄積する
      // (第2・第3候補に正解が入っているケースの取りこぼし対策: No.176/180/185)
      for (const t of extractTranscripts(e)) {
        if (!capturedRef.current.includes(t)) {
          capturedRef.current.push(t);
          setLastRecognized(t);
          dispatch({ type: 'RECOGNITION_DETECTED' });
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

    // won't 誤認識の補正: want が正解の問題に限り、won't→want 候補を追加する
    // (won't が正解の 2-14-1 では expandWontToWant 内の判定により適用されない)
    const heardRaw = expandWontToWant([...capturedRef.current], q.answers || []);
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
      pendingTimeUpRef.current = false; // 正解確定後の時間切れ退避は破棄
      await waitForCurrentAudioToFinish();
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
      // 再報告時に原因を特定できるよう、聞き取り候補と正解を構造化して記録する
      // (F12コンソールで確認できる。個別の「正解にならない」報告の切り分け用: No.173/180/185)
      console.info('[判定] 不正解', {
        question_id: q.question_id,
        heard: heardRaw,
        answers: q.answers,
      });
      dispatchAndSync({ type: 'WRONG_ANSWER' }, 'wrong');
      playSound('miss.mp3');

      try {
        await delay(DLY.wrongAnswerDelay, abortControllerRef.current?.signal);

        capturedRef.current = [];
        setLastRecognized('');

        isProcessingRef.current = false;
        stoppingRef.current = false;
        dispatchAndSync({ type: 'START_LISTENING' }, 'listening');

        // 不正解処理中に時間切れが来ていたら、捨てずにここで再実行する (No.173/178/179)
        if (pendingTimeUpRef.current) {
          pendingTimeUpRef.current = false;
          window.setTimeout(() => { void handleTimeUp(); }, 0);
        }
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
    // 解放に必要な挑戦回数はバックエンドの応答値を表示に使う(定数の二重管理を避ける)
    let requiredAttempts: number | undefined;
    // 最終ステージ到達(結果画面で全クリア文言を出す: No.162)
    let finalStage = false;

    try {
      if (!userId) throw new Error('ユーザーIDが見つかりません');
      if (!part_id) throw new Error('パートIDが見つかりません');

      // スコア送信
      await apiFetch(`/game/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, part_id, scores: finalCorrect, clear }),
      });

      // 進捗更新: クリア時に加え、未クリアでも規定回数(バックエンドのREQUIRED_ATTEMPTS)
      // 挑戦していれば解放判定されるため、結果確定のたびに必ず問い合わせる
      const currentGrade = grade ?? session?.currentGrade ?? '1';
      const currentPart = part ?? session?.currentPart ?? '1';
      const currentSubpart = subpart ?? session?.currentSubpart ?? '1';

      const advanceData = await apiFetch<{
        ok: boolean;
        advanced?: boolean;
        required?: number;
        reason?: string;
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

      requiredAttempts = advanceData.required;
      finalStage = advanceData.reason === 'last part reached';

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

    nav('/result', { state: { clear, correct: finalCorrect, total: nonDemoCount, advanced, requiredAttempts, finalStage } });
  }, [partInfo, grade, part, subpart, nav, session, updateProgress]);

  // ---------------------- Freeze Recovery ----------------------
  const handleFreezeRecovery = useCallback(() => {
    frozenRef.current = false;
    setFrozen(false);
    stopCurrentAudio();
    forceStopRecognition();
    resetTimer(); // 復帰後に前問の残り秒を見せない
    pendingTimeUpRef.current = false;

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
  }, [stopCurrentAudio, forceStopRecognition, resetTimer, updateActivity, dispatchAndSync, startQuestionForIndex, finishGame]);

  // ---------------------- Quit Button ----------------------
  const handleQuit = useCallback(() => {
    // 全てのプロセスを停止
    if (abortControllerRef.current) abortControllerRef.current.abort();
    stopCurrentAudio();
    stopAllSounds(); // 効果音も止める(遷移後に鳴り続けない)
    forceStopRecognition();
    stopFreezeDetection();
    stopTimer();
    pendingTimeUpRef.current = false;
    isProcessingRef.current = false;
    nav('/select');
  }, [nav, stopCurrentAudio, forceStopRecognition, stopFreezeDetection, stopTimer]);

  // ---------------------- Start Button ----------------------
  const handleStartClick = useCallback(() => {
    // ユーザージェスチャ内で共有Audio要素をアンロックする(iPadの無音対策: No.177)
    unlockAudio();
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

  // 46文字以上の長文はフォントを縮小して4行見切れを防ぐ (最長66〜70文字を想定)
  const longTextClass = (text?: string) => ((text?.length ?? 0) >= 46 ? ' long-text' : '');

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

      {/* 音声を再生できなかったときの通知(スキップして続行は仕様どおり・通知だけ追加) */}
      {ttsFailed && ['speaking', 'listening', 'wrong'].includes(status) && !frozen && (
        <div className="tts-error-notice">
          <span>音声を再生できませんでした</span>
          <button
            className="tts-retry-button"
            onClick={() => {
              setTtsFailed(false);
              // マイクON中はミュート再生になってしまうため、聞き直す前にマイクを止める
              // (G15のミュート仕様は維持しつつ、押した意図どおり音を出す)
              forceStopRecognition();
              if (current?.question_text) speakAwaitTTS(current.question_text);
            }}
          >
            もういちど聞く
          </button>
        </div>
      )}

      {/* 左: 問題番号 (デモを除いた本問1〜7で数える: No.166) */}
      <div className="question-number-container">
        <div className={`question-number-display${current?.is_demo ? ' demo' : ''}`}>
          {questionBadgeLabel(questions, idx)}
        </div>
      </div>

      {/* 左: カウントダウンタイマー (デモ以外・回答受付中のみ表示 = 読み上げ中の静止表示や
          前問の残り秒の見え残りを防ぐ: No.159/175/186) */}
      {!showRequirement && current && !current.is_demo && ['listening', 'wrong'].includes(status) && (
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
          <div className={`question-text${longTextClass(intermissionSnap?.text)}`}>
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

          <div className={`question-text${current?.image_url && !imageBroken ? ' with-image' : ''}${longTextClass(current?.question_text)}`}>
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

          {/* マイク導線のヒント: 回答受付中にマイクOFFのままなら案内する (No.161) */}
          {['listening', 'wrong'].includes(status) && !micActive && !current?.is_demo && !frozen && (
            <div className="mic-hint">🎤 ガンボタンをおして こたえてね</div>
          )}

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

      {/* 結果送信中の表示(無応答時も15秒タイムアウトで必ず抜ける: 最終問題ハング対策) */}
      {status === 'finished' && (
        <div className="saving-overlay">
          <div className="saving-box">けっかを ほぞんしています…</div>
        </div>
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
                resetTimer();
                pendingTimeUpRef.current = false;
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
