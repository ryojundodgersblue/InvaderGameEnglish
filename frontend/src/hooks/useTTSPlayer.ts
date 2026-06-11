import { useCallback, useRef } from 'react';
import { TTS_VOLUME } from '../constants/game';
import { speakText, prefetchSpeech } from '../utils/ttsAudio';

/**
 * TTS音声再生の管理。
 * 再生中audioの参照・ミュート/停止・再生完了待ち・次問題の先読みを提供する。
 */
export function useTTSPlayer() {
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isSpeakingRef = useRef(false);
  const originalVolumeRef = useRef<number>(TTS_VOLUME);

  const speak = useCallback(
    (text: string, opts: { isAnswer?: boolean; micActive: boolean }): Promise<boolean> => {
      return speakText(text, {
        isAnswer: opts.isAnswer ?? false,
        micActive: opts.micActive,
        currentAudioRef,
        isSpeakingRef,
      });
    },
    []
  );

  /** 次の問題文などを先読みしてセッション内キャッシュに載せる(失敗は無視) */
  const prefetch = useCallback((text: string) => {
    prefetchSpeech(text);
  }, []);

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

  return {
    currentAudioRef,
    isSpeakingRef,
    originalVolumeRef,
    speak,
    prefetch,
    muteCurrentAudio,
    unmuteCurrentAudio,
    stopCurrentAudio,
    waitForCurrentAudioToFinish,
  };
}
