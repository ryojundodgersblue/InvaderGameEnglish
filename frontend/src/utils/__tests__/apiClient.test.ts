// 仕様: 401→AUTH-001+ログイン誘導(Function List C19)。
// 追加仕様(要望No.179/最終問題ハング対策): 無応答は15秒でタイムアウト(NET-002)、
// ログインAPIのみコールドスタート考慮で60秒(Function List H5「最大1分」と整合)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, ApiError, registerUnauthorizedHandler } from '../apiClient';
import { API_TIMEOUT_MS, LOGIN_API_TIMEOUT_MS } from '../../constants/game';

// initのsignalを尊重し、abortされるまで解決しないfetchモック
function neverResolvingFetch() {
  return vi.fn((_url: string, init?: RequestInit) =>
    new Promise<Response>((_, reject) => {
      const signal = init?.signal;
      if (signal?.aborted) {
        reject(new DOMException('aborted', 'AbortError'));
        return;
      }
      signal?.addEventListener('abort', () =>
        reject(new DOMException('aborted', 'AbortError'))
      );
    })
  );
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'Date'] });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  registerUnauthorizedHandler(null);
});

describe('apiFetch: デフォルトタイムアウト15秒', () => {
  it('定数が仕様値である(通常15秒/ログイン60秒)', () => {
    expect(API_TIMEOUT_MS).toBe(15_000);
    expect(LOGIN_API_TIMEOUT_MS).toBe(60_000);
  });

  it('無応答の一般APIは15秒でNET-002になる(最終問題の完全ハング対策)', async () => {
    vi.stubGlobal('fetch', neverResolvingFetch());
    const p = apiFetch('/game/advance', { method: 'POST' });
    const assertion = expect(p).rejects.toMatchObject({ code: 'NET-002' });
    await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS + 100);
    await assertion;
  });

  it('ログインAPIは15秒では切れず、60秒で切れる(コールドスタート吸収)', async () => {
    const fetchMock = neverResolvingFetch();
    vi.stubGlobal('fetch', fetchMock);
    let settled = false;
    const p = apiFetch('/auth/login', { method: 'POST' }).catch((e: unknown) => {
      settled = true;
      return e;
    });
    await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS + 1000);
    expect(settled).toBe(false); // 16秒時点ではまだ待っている
    await vi.advanceTimersByTimeAsync(LOGIN_API_TIMEOUT_MS);
    const err = await p;
    expect(settled).toBe(true);
    expect(err).toMatchObject({ code: 'NET-002' });
  });

  it('timeoutMsオプションで個別に延長できる(初期取得GETのコールドスタート対策)', async () => {
    vi.stubGlobal('fetch', neverResolvingFetch());
    let settled = false;
    const p = apiFetch('/select/options?user_id=1', {}, { timeoutMs: 60_000 }).catch((e: unknown) => {
      settled = true;
      return e;
    });
    await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS + 1000);
    expect(settled).toBe(false); // 16秒時点ではまだ待っている(コールドスタート吸収)
    await vi.advanceTimersByTimeAsync(60_000);
    const err = await p;
    expect(err).toMatchObject({ code: 'NET-002' });
  });

  it('正常応答はタイムアウトに影響されずそのまま返る', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { ok: true, value: 42 })));
    const data = await apiFetch<{ ok: boolean; value: number }>('/ranking');
    expect(data.value).toBe(42);
  });
});

describe('apiFetch: 認証・エラーの既存仕様(デグレ検知)', () => {
  it('一般APIの401はAUTH-001としてログイン誘導ハンドラを発火する', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(401, { ok: false })));
    const handler = vi.fn();
    registerUnauthorizedHandler(handler);
    await expect(apiFetch('/game/questions?part_id=1')).rejects.toMatchObject({ code: 'AUTH-001', status: 401 });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ログインAPIの401はAUTH-002(ID/パスワード誤り)でありログイン誘導しない', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(401, { ok: false, message: '認証に失敗しました' })));
    const handler = vi.fn();
    registerUnauthorizedHandler(handler);
    await expect(apiFetch('/auth/login', { method: 'POST' })).rejects.toMatchObject({ code: 'AUTH-002' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('接続不能はNET-001', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(apiFetch('/ranking')).rejects.toMatchObject({ code: 'NET-001' });
  });

  it('ok:false応答はApiErrorとして投げる', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { ok: false, message: 'だめ' })));
    await expect(apiFetch('/select/validate')).rejects.toBeInstanceOf(ApiError);
  });
});
