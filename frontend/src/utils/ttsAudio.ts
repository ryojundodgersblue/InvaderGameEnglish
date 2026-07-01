import {
  TTS_VOLUME,
  TTS_PLAYBACK_TIMEOUT,
  TTS_FETCH_TIMEOUT_MS,
  TTS_PRIME_TIMEOUT_MS,
  SPEECH_CACHE_MAX,
  DLY,
} from '../constants/game';
import { API_URL } from '../config';

/**
 * 音声の読み込み完了を待ってから再生する(頭切れ対策)。
 * デコードが間に合わないまま play() すると冒頭が欠けることがあるため、
 * canplaythrough/loadeddata を上限付きで待つ。
 */
function primeAudio(audio: HTMLAudioElement, timeoutMs: number): Promise<void> {
  return new Promise<void>((resolve) => {
    // HAVE_FUTURE_DATA以上なら即再生可能
    if (audio.readyState >= 3) { resolve(); return; }

    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      audio.removeEventListener('canplaythrough', done);
      audio.removeEventListener('loadeddata', done);
      audio.removeEventListener('error', done);
      resolve();
    };

    audio.addEventListener('canplaythrough', done);
    audio.addEventListener('loadeddata', done);
    audio.addEventListener('error', done);
    setTimeout(done, timeoutMs);
    audio.load();
  });
}

/**
 * Blobからタイムアウト付きで音声を再生する共通関数
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
    (async () => {
      await primeAudio(audio, TTS_PRIME_TIMEOUT_MS);

      // 再生前に停止指示が入っていたら何もしない
      if (currentAudioRef.current !== audio) { cleanup(); return; }

      await new Promise<void>((resolve) => {
        audio.onended = () => { cleanup(); resolve(); };
        audio.onerror = () => { cleanup(); resolve(); };
        audio.currentTime = 0;
        audio.play().catch((err) => {
          console.error('[TTS] 再生開始に失敗:', err?.message || err);
          cleanup();
          resolve();
        });
      });
    })(),
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
    signal: AbortSignal.timeout(TTS_FETCH_TIMEOUT_MS),
  });
}

// ---------------- セッション内音声キャッシュ ----------------
// 同一テキストの再取得(リトライ時の再読み上げ・先読み)を高速化する。
// 失敗(null)はキャッシュしない。
const speechCache = new Map<string, Promise<Blob | null>>();

async function fetchSpeechBlobOnce(text: string): Promise<Blob | null> {
  try {
    const response = await synthesizeSpeech(text);
    if (!response.ok) {
      console.error(`[TTS] 合成APIエラー: HTTP ${response.status}`);
      return null;
    }
    const data = await response.json();
    const blob = parseAudioContent(data);
    if (!blob) {
      console.error('[TTS] 音声データの解析に失敗(audioContent不正)');
    }
    return blob;
  } catch (err) {
    console.error('[TTS] 合成リクエスト失敗:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * 音声Blobを取得する(セッション内キャッシュ+1回リトライ)
 */
export function getSpeechBlob(text: string): Promise<Blob | null> {
  const cached = speechCache.get(text);
  if (cached) return cached;

  const promise = (async () => {
    let blob = await fetchSpeechBlobOnce(text);
    if (!blob) {
      console.warn('[TTS] 1回目の取得に失敗。リトライします');
      blob = await fetchSpeechBlobOnce(text);
    }
    if (!blob) {
      speechCache.delete(text); // 失敗は次回再取得できるようキャッシュしない
    }
    return blob;
  })();

  if (speechCache.size >= SPEECH_CACHE_MAX) {
    const oldest = speechCache.keys().next().value;
    if (oldest !== undefined) speechCache.delete(oldest);
  }
  speechCache.set(text, promise);
  return promise;
}

/**
 * 音声を事前取得してキャッシュへ載せる(失敗は無視)
 */
export function prefetchSpeech(text: string): void {
  if (!text) return;
  getSpeechBlob(text).catch(() => {});
}

/**
 * テキストをTTS再生する統合関数
 * @returns 再生まで到達できたら true / 音声を取得できなかったら false
 */
export async function speakText(
  text: string,
  opts: {
    isAnswer?: boolean;
    micActive: boolean;
    currentAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
    isSpeakingRef: React.MutableRefObject<boolean>;
  }
): Promise<boolean> {
  const { isAnswer = false, micActive, currentAudioRef, isSpeakingRef } = opts;

  if (isAnswer) {
    await new Promise(resolve => setTimeout(resolve, DLY.answerPreDelay));
  }

  isSpeakingRef.current = true;

  try {
    const blob = await getSpeechBlob(text);
    if (!blob) {
      isSpeakingRef.current = false;
      return false;
    }

    const volume = isAnswer ? TTS_VOLUME : (micActive ? 0 : TTS_VOLUME);
    await playAudioBlob(blob, { volume, currentAudioRef, isSpeakingRef });
    return true;
  } catch (err) {
    console.error('[TTS] 再生処理で例外:', err instanceof Error ? err.message : err);
    isSpeakingRef.current = false;
    return false;
  }
}
