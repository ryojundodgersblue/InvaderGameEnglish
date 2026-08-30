import {
  TTS_VOLUME,
  TTS_PLAYBACK_TIMEOUT,
  TTS_FETCH_TIMEOUT_MS,
  TTS_PRIME_TIMEOUT_MS,
  SPEECH_CACHE_MAX,
  DLY,
} from '../constants/game';
import { API_URL } from '../config';
import { notifyUnauthorized } from './apiClient';

/**
 * 読み上げ結果の区分 (失敗の可視化: 要望No.170-172系)
 * - played:  再生まで到達した
 * - skipped: テキストなし(1-44-1等の仕様スキップ)・中断済みで再生しなかった
 * - failed:  音声を取得できなかった(UI通知の対象)
 */
export type SpeakResult = 'played' | 'skipped' | 'failed';

// ---------------- 共有Audio要素 ----------------
// iOSの自動再生解除は「要素単位」のため、毎回 new Audio() すると解除が引き継がれず
// iPadで全音声が無音になる (要望No.177)。1つの要素を使い回し、
// ユーザージェスチャ内の unlockAudio() で解除した状態を維持する。
let sharedAudio: HTMLAudioElement | null = null;
let playToken = 0; // 再生の世代管理(追い越し・停止の判定用)
let speakSeq = 0;  // 発話リクエストの世代管理(遅延解決した古い取得が新しい発話を乗っ取るのを防ぐ)

function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudio) sharedAudio = new Audio();
  return sharedAudio;
}

// 約30msの無音WAV(アンロック用)
const SILENT_WAV =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

/**
 * 音声再生のアンロック。ユーザージェスチャ(Start/Game Startボタン)内で呼ぶこと。
 * 共有Audio要素で無音を一度再生し、iOS Safariの自動再生制限を解除する。
 */
export function unlockAudio(): void {
  try {
    const audio = getSharedAudio();
    // 再生中の音声がある場合はアンロック済みなので何もしない
    if (!audio.paused) return;
    audio.src = SILENT_WAV;
    audio.volume = 1;
    const p = audio.play();
    if (p) p.catch(() => { /* 失敗しても後続のジェスチャで再試行される */ });
  } catch { /* noop */ }
}

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
 * Blobを共有Audio要素で再生する。
 * - muted: 再生開始時点のミュート状態を返す関数(マイクON中の問題文はミュート=Function Specs G15)。
 *   再生中の切り替えは呼び出し側が currentAudioRef.current.muted を直接操作する
 * - onProgress: 再生進行ごとに呼ばれる(フリーズ検知の生存信号: 要望No.170)
 * - signal: 中断用。やめる/リトライ/画面遷移で孤児音声を残さない
 */
export function playAudioBlob(
  blob: Blob,
  opts: {
    currentAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
    isSpeakingRef: React.MutableRefObject<boolean>;
    muted?: () => boolean;
    onProgress?: () => void;
    signal?: AbortSignal;
  }
): Promise<SpeakResult> {
  const { currentAudioRef, isSpeakingRef, muted, onProgress, signal } = opts;

  if (signal?.aborted) {
    isSpeakingRef.current = false;
    return Promise.resolve('skipped');
  }

  const audio = getSharedAudio();
  const myToken = ++playToken;
  const audioUrl = URL.createObjectURL(blob);

  // 直前の再生が残っていれば決着させてから使う(共有要素のため)
  try { audio.pause(); } catch { /* noop */ }
  audio.dispatchEvent(new Event('ended'));

  audio.src = audioUrl;
  audio.volume = TTS_VOLUME;
  audio.muted = muted?.() ?? false;
  currentAudioRef.current = audio;

  const cleanup = () => {
    URL.revokeObjectURL(audioUrl);
    if (playToken === myToken) {
      if (currentAudioRef.current === audio) currentAudioRef.current = null;
      isSpeakingRef.current = false;
    }
  };

  return Promise.race([
    (async (): Promise<SpeakResult> => {
      await primeAudio(audio, TTS_PRIME_TIMEOUT_MS);

      // 読み込み待ちの間に停止(stopCurrentAudioによるref解除)・追い越し・中断があれば再生しない
      // (旧実装のrefガードを維持: 早押しで止めた音声が後から鳴り出すのを防ぐ)
      if (playToken !== myToken || signal?.aborted || currentAudioRef.current !== audio) {
        cleanup();
        return 'skipped';
      }
      // 読み込み待ち中にメディアエラーが起きていたら失敗として通知する
      if (audio.error) {
        cleanup();
        return 'failed';
      }

      // ミュートは再生直前に再評価する(読み込み待ち中のマイク切り替えを反映)
      audio.muted = muted?.() ?? false;

      return await new Promise<SpeakResult>((resolve) => {
        const done = (outcome: SpeakResult) => {
          audio.removeEventListener('ended', onEnded);
          audio.removeEventListener('error', onError);
          audio.removeEventListener('timeupdate', onTime);
          signal?.removeEventListener('abort', onAbort);
          cleanup();
          resolve(outcome);
        };
        const onEnded = () => done('played');
        const onError = () => done('failed');
        const onAbort = () => {
          try { audio.pause(); } catch { /* noop */ }
          done('skipped');
        };
        const onTime = () => { onProgress?.(); };

        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);
        audio.addEventListener('timeupdate', onTime);
        signal?.addEventListener('abort', onAbort);

        audio.currentTime = 0;
        audio.play().catch((err) => {
          // pause起因の中断(AbortError)は失敗扱いにしない。
          // NotAllowedError(未アンロック)等は「無音のまま進んだ」を通知するためfailed
          const isAbort = err?.name === 'AbortError';
          if (!isAbort) console.error('[TTS] 再生開始に失敗:', err?.message || err);
          done(isAbort ? 'skipped' : 'failed');
        });
      });
    })(),
    new Promise<SpeakResult>((resolve) => {
      setTimeout(() => {
        if (playToken === myToken && currentAudioRef.current === audio) {
          try { audio.pause(); } catch { /* noop */ }
          cleanup();
        }
        resolve('played'); // 上限到達は途中まで再生済みの扱い(失敗通知はしない)
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
 * TTS APIを呼び出してテキストを音声合成する。
 * タイムアウトは AbortController + setTimeout で実装する
 * (AbortSignal.timeout は Safari 16未満=iPadOS15以前で未実装のため使わない: 要望No.177)
 */
export async function synthesizeSpeech(text: string, signal?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TTS_FETCH_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    return await fetch(`${API_URL}/api/tts/synthesize`, {
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
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

// ---------------- セッション内音声キャッシュ ----------------
// 同一テキストの再取得(リトライ時の再読み上げ・先読み)を高速化する。
// 失敗(null)はキャッシュしない。
const speechCache = new Map<string, Promise<Blob | null>>();

async function fetchSpeechBlobOnce(text: string, signal?: AbortSignal): Promise<Blob | null> {
  try {
    const response = await synthesizeSpeech(text, signal);
    if (response.status === 401) {
      // 認証切れ: ログイン画面へ誘導 (No139/No140)
      notifyUnauthorized();
      return null;
    }
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
 * 音声Blobを取得する(セッション内キャッシュ+1回リトライ)。
 * onProgressはリトライの合間に生存信号を流す(取得が長引いてもフリーズ誤検知させない)
 */
export function getSpeechBlob(text: string, signal?: AbortSignal, onProgress?: () => void): Promise<Blob | null> {
  // 問題文なし(イラストのみ出題: 1-44-1等)は合成せずスキップ
  if (!text || !text.trim()) return Promise.resolve(null);
  const cached = speechCache.get(text);
  if (cached) return cached;

  const promise = (async () => {
    let blob = await fetchSpeechBlobOnce(text, signal);
    if (!blob && !signal?.aborted) {
      console.warn('[TTS] 1回目の取得に失敗。リトライします');
      onProgress?.(); // リトライ突入を生存信号として流す(無信号スパンを約10秒に抑える)
      blob = await fetchSpeechBlobOnce(text, signal);
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
 */
export async function speakText(
  text: string,
  opts: {
    isAnswer?: boolean;
    currentAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
    isSpeakingRef: React.MutableRefObject<boolean>;
    /** 再生開始時点のミュート判定(マイクON中の問題文はミュート)。省略時はミュートしない */
    muted?: () => boolean;
    /** 再生進行の通知(フリーズ検知の生存信号) */
    onProgress?: () => void;
    /** 中断用 */
    signal?: AbortSignal;
  }
): Promise<SpeakResult> {
  const { isAnswer = false, currentAudioRef, isSpeakingRef, muted, onProgress, signal } = opts;

  // 読み上げるテキストがない場合は何もしない(1-44-1のようなイラストのみ出題)
  if (!text || !text.trim()) return 'skipped';
  if (signal?.aborted) return 'skipped';

  if (isAnswer) {
    await new Promise(resolve => setTimeout(resolve, DLY.answerPreDelay));
    if (signal?.aborted) return 'skipped';
  }

  isSpeakingRef.current = true;

  // 発話世代を採番: 取得が遅延解決したとき、より新しい発話が始まっていたら再生しない
  // (古い問題文が正解読み上げを乗っ取る事故の防止)
  const mySeq = ++speakSeq;

  try {
    const blob = await getSpeechBlob(text, signal, onProgress);
    if (mySeq !== speakSeq) {
      isSpeakingRef.current = false;
      return 'skipped';
    }
    if (signal?.aborted) {
      isSpeakingRef.current = false;
      return 'skipped';
    }
    if (!blob) {
      isSpeakingRef.current = false;
      return 'failed';
    }

    return await playAudioBlob(blob, { currentAudioRef, isSpeakingRef, muted, onProgress, signal });
  } catch (err) {
    console.error('[TTS] 再生処理で例外:', err instanceof Error ? err.message : err);
    isSpeakingRef.current = false;
    return 'failed';
  }
}
