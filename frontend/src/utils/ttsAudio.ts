import { TTS_VOLUME, TTS_PLAYBACK_TIMEOUT } from '../constants/game';
import { API_URL } from '../config';

/**
 * Blobからタイムアウト付きで音声を再生する共通関数
 * 以前は3箇所にコピペされていたPromise.raceロジックを統合
 */
export function playAudioBlob(
  blob: Blob,
  opts: {
    volume: number;
    currentAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
    isSpeakingRef: React.MutableRefObject<boolean>;
  }
): Promise<void> {
  const { volume, currentAudioRef, isSpeakingRef } = opts;
  const audioUrl = URL.createObjectURL(blob);
  const audio = new Audio(audioUrl);
  audio.volume = volume;
  currentAudioRef.current = audio;

  const cleanup = () => {
    URL.revokeObjectURL(audioUrl);
    if (currentAudioRef.current === audio) {
      currentAudioRef.current = null;
    }
    isSpeakingRef.current = false;
  };

  return Promise.race([
    new Promise<void>((resolve) => {
      audio.onended = () => { cleanup(); resolve(); };
      audio.onerror = () => { cleanup(); resolve(); };
      audio.play().catch(() => { cleanup(); resolve(); });
    }),
    new Promise<void>((resolve) => {
      setTimeout(() => {
        if (currentAudioRef.current === audio) {
          audio.pause();
          cleanup();
        }
        resolve();
      }, TTS_PLAYBACK_TIMEOUT);
    })
  ]);
}

/**
 * TTS APIレスポンスの audioContent を解析して Blob を生成する
 */
export function parseAudioContent(data: unknown): Blob | null {
  let audioContent: string | null = null;

  if (typeof data === 'string') {
    audioContent = data;
  } else if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;

    if (typeof obj.error === 'string') {
      return null;
    }

    const content = obj.audioContent;

    if (typeof content === 'string') {
      audioContent = content;
    } else if (typeof content === 'object' && content !== null) {
      const contentObj = content as Record<string, unknown>;

      // Buffer型: { type: 'Buffer', data: number[] }
      if (contentObj.type === 'Buffer' && Array.isArray(contentObj.data)) {
        return new Blob([new Uint8Array(contentObj.data)], { type: 'audio/mpeg' });
      }

      // 配列型
      if (Array.isArray(contentObj)) {
        return new Blob([new Uint8Array(contentObj)], { type: 'audio/mpeg' });
      }

      // data文字列型
      if (typeof contentObj.data === 'string') {
        audioContent = contentObj.data;
      }
    }
  }

  if (!audioContent) return null;

  // data URI のプレフィックスを除去
  const commaIndex = audioContent.indexOf(',');
  if (commaIndex !== -1) {
    audioContent = audioContent.substring(commaIndex + 1);
  }

  audioContent = audioContent.replace(/[\s\n\r\t]/g, '');

  if (!audioContent || !audioContent.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
    return null;
  }

  let binaryString: string;
  try {
    binaryString = window.atob(audioContent);
  } catch {
    return null;
  }

  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return new Blob([bytes], { type: 'audio/mpeg' });
}

/**
 * TTS APIを呼び出してテキストを音声合成する
 */
export async function synthesizeSpeech(text: string): Promise<Response> {
  return fetch(`${API_URL}/api/tts/synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      text,
      languageCode: 'en-US',
      voiceName: 'en-US-Neural2-D',
      speakingRate: 0.95,
      pitch: 0
    }),
    signal: AbortSignal.timeout(10000),
  });
}

/**
 * テキストをTTS再生する統合関数
 */
export async function speakText(
  text: string,
  opts: {
    isAnswer?: boolean;
    micActive: boolean;
    currentAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
    isSpeakingRef: React.MutableRefObject<boolean>;
  }
): Promise<void> {
  const { isAnswer = false, micActive, currentAudioRef, isSpeakingRef } = opts;

  if (isAnswer) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  isSpeakingRef.current = true;

  try {
    const response = await synthesizeSpeech(text);
    const data = await response.json();

    const blob = parseAudioContent(data);
    if (!blob) {
      isSpeakingRef.current = false;
      return;
    }

    const volume = isAnswer ? TTS_VOLUME : (micActive ? 0 : TTS_VOLUME);
    await playAudioBlob(blob, { volume, currentAudioRef, isSpeakingRef });
  } catch {
    isSpeakingRef.current = false;
  }
}
