// 仕様(Function List C8/H8): TTSで読み上げ、失敗時はスキップして続行。
// 改修仕様(No.177 iPad / No.171-172 無音対策):
//  - 共有Audio要素を使い回す(iOSの自動再生解除を維持する)
//  - AbortSignal.timeout を使わない(iPadOS15以前でTypeErrorになる)
//  - 空テキストは skipped / 取得失敗は failed を区別して返す(失敗の可視化)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const created: unknown[] = [];
let playShouldReject: string | null = null; // 'NotAllowedError'等を入れるとplay()が拒否する

function installAudioMock() {
  created.length = 0;
  playShouldReject = null;
  class AudioMock extends EventTarget {
    src = '';
    volume = 1;
    muted = false;
    paused = true;
    ended = false;
    currentTime = 0;
    readyState = 4; // HAVE_ENOUGH_DATA: primeAudioを即通過させる
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor() {
      super();
      created.push(this);
    }
    play() {
      if (playShouldReject) {
        const err = Object.assign(new Error('blocked'), { name: playShouldReject });
        return Promise.reject(err);
      }
      this.paused = false;
      // すぐ終わる音声として ended を発火
      queueMicrotask(() => this.dispatchEvent(new Event('ended')));
      return Promise.resolve();
    }
    pause() { this.paused = true; }
    load() { /* noop */ }
  }
  vi.stubGlobal('Audio', AudioMock);
}

beforeEach(() => {
  vi.resetModules();
  installAudioMock();
  vi.stubGlobal('URL', Object.assign(URL, {
    createObjectURL: vi.fn(() => 'blob:mock'),
    revokeObjectURL: vi.fn(),
  }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function refs() {
  return {
    currentAudioRef: { current: null as HTMLAudioElement | null },
    isSpeakingRef: { current: false },
  };
}

describe('speakText の結果区分(失敗の可視化)', () => {
  it('空テキストは skipped (1-44-1のイラストのみ出題=仕様スキップ)', async () => {
    const { speakText } = await import('../ttsAudio');
    const r = await speakText('   ', { currentAudioRef: refs().currentAudioRef, isSpeakingRef: refs().isSpeakingRef });
    expect(r).toBe('skipped');
  });

  it('合成APIが失敗し続けたら failed (UI通知の判断材料になる)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('err', { status: 500 })));
    const { speakText } = await import('../ttsAudio');
    const { currentAudioRef, isSpeakingRef } = refs();
    const r = await speakText('Hello world', { currentAudioRef, isSpeakingRef });
    expect(r).toBe('failed');
    expect(isSpeakingRef.current).toBe(false);
  });

  it('正常時は played を返す', async () => {
    const body = JSON.stringify({ audioContent: btoa('abc') });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { status: 200 })));
    const { speakText } = await import('../ttsAudio');
    const { currentAudioRef, isSpeakingRef } = refs();
    const r = await speakText('Hello world', { currentAudioRef, isSpeakingRef });
    expect(r).toBe('played');
  });
});

describe('共有Audio要素 (No.177: iOSアンロック維持)', () => {
  it('unlockAudio→speakText×2 でも Audio要素は1つだけ生成される', async () => {
    const body = JSON.stringify({ audioContent: btoa('abc') });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { status: 200 })));
    const { unlockAudio, speakText } = await import('../ttsAudio');
    unlockAudio();
    const { currentAudioRef, isSpeakingRef } = refs();
    await speakText('one', { currentAudioRef, isSpeakingRef });
    await speakText('two', { currentAudioRef, isSpeakingRef });
    expect(created).toHaveLength(1); // 使い捨てせず同一要素を使い回す
  });
});

describe('旧Safari互換 (No.177: iPadOS15以前)', () => {
  it('AbortSignal.timeout が存在しない環境でも合成リクエストが送れる', async () => {
    // AbortSignal.timeout を消した環境をシミュレート
    const OriginalAbortSignal = globalThis.AbortSignal;
    const StrippedAbortSignal = Object.create(OriginalAbortSignal);
    delete (StrippedAbortSignal as { timeout?: unknown }).timeout;
    vi.stubGlobal('AbortSignal', StrippedAbortSignal);

    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ audioContent: btoa('x') }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { synthesizeSpeech } = await import('../ttsAudio');
    const res = await synthesizeSpeech('Hello');
    expect(res.status).toBe(200);
    // fetch には(タイムアウト用の)signalが渡されている
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.signal).toBeTruthy();
  });
});

describe('中断 (孤児音声の根絶)', () => {
  it('abort済みsignalを渡すと再生せず skipped になる', async () => {
    const body = JSON.stringify({ audioContent: btoa('abc') });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { status: 200 })));
    const { speakText } = await import('../ttsAudio');
    const { currentAudioRef, isSpeakingRef } = refs();
    const ac = new AbortController();
    ac.abort();
    const r = await speakText('Hello', { currentAudioRef, isSpeakingRef, signal: ac.signal });
    expect(r).toBe('skipped');
    expect(isSpeakingRef.current).toBe(false);
  });
});

describe('再生段階の失敗も通知される (iPad未アンロック等: No.177)', () => {
  it('play()がNotAllowedErrorで拒否されたら failed を返す(無音のまま進んだことを通知できる)', async () => {
    const body = JSON.stringify({ audioContent: btoa('abc') });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { status: 200 })));
    const { speakText } = await import('../ttsAudio');
    const { currentAudioRef, isSpeakingRef } = refs();
    playShouldReject = 'NotAllowedError';
    const r = await speakText('Hello world', { currentAudioRef, isSpeakingRef });
    expect(r).toBe('failed');
  });

  it('pause起因のAbortErrorは失敗扱いにしない(通知の誤発火防止)', async () => {
    const body = JSON.stringify({ audioContent: btoa('abc') });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { status: 200 })));
    const { speakText } = await import('../ttsAudio');
    const { currentAudioRef, isSpeakingRef } = refs();
    playShouldReject = 'AbortError';
    const r = await speakText('Hello world', { currentAudioRef, isSpeakingRef });
    expect(r).toBe('skipped');
  });
});

describe('発話の世代管理 (遅延解決した古い取得が新しい発話を乗っ取らない)', () => {
  it('取得が遅い発話Aの解決前に発話Bが完了したら、Aは skipped になる', async () => {
    let resolveA: ((r: Response) => void) | null = null;
    const okBody = () => new Response(JSON.stringify({ audioContent: btoa('abc') }), { status: 200 });
    vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => {
      const text = JSON.parse(String(init?.body)).text as string;
      if (text === 'slow question') {
        return new Promise<Response>(res => { resolveA = res; });
      }
      return Promise.resolve(okBody());
    }));
    const { speakText } = await import('../ttsAudio');
    const { currentAudioRef, isSpeakingRef } = refs();

    const pA = speakText('slow question', { currentAudioRef, isSpeakingRef });
    const rB = await speakText('fast answer', { currentAudioRef, isSpeakingRef });
    expect(rB).toBe('played');

    resolveA!(okBody());
    const rA = await pA;
    expect(rA).toBe('skipped'); // 古い問題文が後から鳴り出さない
  });
});

describe('parseAudioContent (既存仕様のデグレ検知)', () => {
  it('base64文字列からBlobを生成する', async () => {
    const { parseAudioContent } = await import('../ttsAudio');
    const blob = parseAudioContent({ audioContent: btoa('hello') });
    expect(blob).toBeInstanceOf(Blob);
  });
  it('不正データはnull', async () => {
    const { parseAudioContent } = await import('../ttsAudio');
    expect(parseAudioContent({ error: 'x' })).toBeNull();
    expect(parseAudioContent({ audioContent: '!!!' })).toBeNull();
  });
});
