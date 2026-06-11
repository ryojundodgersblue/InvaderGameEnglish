import { useCallback, useRef, useState, useEffect } from 'react';
import type { SpeechRecognition, SpeechRecognitionEvent, SpeechRecognitionErrorEvent } from '../types/speechRecognition';

type Options = {
  /** speaking中に銃ボタンで開始されたとき(音声停止+listeningへ遷移などをPlayPage側で行う) */
  onStartWhileSpeaking: () => void;
  /** 認識テキストが新規に取れたとき */
  onRecognition: () => void;
  /** onendでの自動再開を許可する状態か */
  shouldAutoRestart: () => boolean;
  /** 評価処理中か(自動再開を止める) */
  isProcessing: () => boolean;
  /** 現在speakingフェーズか */
  isSpeakingPhase: () => boolean;
};

/**
 * Web Speech APIによる音声認識の管理。
 * 認識候補は capturedRef に蓄積し、stop系の競合は stoppingRef で制御する
 * (元PlayPage実装のref運用をそのまま維持)。
 */
export function useSpeechRecognition(options: Options) {
  const [micActive, setMicActive] = useState(false);
  const [lastRecognized, setLastRecognized] = useState<string>('');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const capturedRef = useRef<string[]>([]);
  const stoppingRef = useRef(false);
  const micActiveRef = useRef(false);
  const optionsRef = useRef(options);

  useEffect(() => { micActiveRef.current = micActive; }, [micActive]);
  useEffect(() => { optionsRef.current = options; }, [options]);

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

  const startRecognition = useCallback(() => {
    const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SR) {
      alert('このブラウザは音声認識に未対応です(Chrome 推奨)');
      return;
    }

    if (optionsRef.current.isSpeakingPhase()) {
      optionsRef.current.onStartWhileSpeaking();
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
            optionsRef.current.onRecognition();
          }
        }
      }
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      console.warn('[ASR] Error:', e.error);
    };

    rec.onend = () => {
      if (stoppingRef.current || !micActiveRef.current || optionsRef.current.isProcessing()) {
        setMicActive(false);
        micActiveRef.current = false;
        return;
      }

      if (optionsRef.current.shouldAutoRestart()) {
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

  /**
   * 認識を停止して評価フェーズへ。capturedが空なら false を返す(受付継続)。
   */
  const stopForEvaluate = useCallback((): boolean => {
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
      return false;
    }
    return true;
  }, []);

  const resetCaptured = useCallback(() => {
    capturedRef.current = [];
    setLastRecognized('');
  }, []);

  const resetStopping = useCallback(() => {
    stoppingRef.current = false;
  }, []);

  return {
    micActive,
    setMicActive,
    micActiveRef,
    lastRecognized,
    capturedRef,
    startRecognition,
    forceStopRecognition,
    stopForEvaluate,
    resetCaptured,
    resetStopping,
  };
}
