// APIクライアント共通処理
// すべてのAPIエラーを「エラーコード付き」で扱えるようにし、
// 認証切れ(401)を検知したら登録済みハンドラでログイン画面へ誘導する。
import { API_URL } from '../config';

export class ApiError extends Error {
  /** エラーコード(例: AUTH-001, NET-001)。保守時の特定用 */
  code: string;
  /** HTTPステータス(ネットワーク断は0) */
  status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export const AUTH_EXPIRED_MESSAGE =
  'セッションの有効期限が切れました。ログインし直してください。';

// 認証切れ時の処理(セッション破棄+ログイン画面へ遷移)。
// Routerのcontextが必要なため、App側で registerUnauthorizedHandler により登録する。
let onUnauthorized: (() => void) | null = null;

export function registerUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

/** 401を検知した際に呼ぶ。二重遷移を防ぐため一度発火したら以降は無視する */
let unauthorizedFired = false;
export function notifyUnauthorized() {
  if (unauthorizedFired) return;
  unauthorizedFired = true;
  try {
    onUnauthorized?.();
  } finally {
    // ログイン画面に戻った後の再ログインに備えて解除
    window.setTimeout(() => { unauthorizedFired = false; }, 1000);
  }
}

/**
 * fetchラッパー。
 * - credentials: 'include' を常時付与
 * - 401: セッション破棄+ログイン画面誘導を発火し、AUTH-001 を投げる (No139/No140)
 * - {ok:false, code, message} 形式のエラーを ApiError として投げる
 * - ネットワーク断: NET-001 / タイムアウト・中断: NET-002
 */
export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { credentials: 'include', ...init });
  } catch (err) {
    if (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
      throw new ApiError('NET-002', 0, 'サーバーの応答がありません（タイムアウト）');
    }
    throw new ApiError('NET-001', 0, 'サーバーに接続できません');
  }

  // 認証切れ: ログイン画面へ誘導(ログインAPI自体の401は「認証失敗」なので対象外)
  if (res.status === 401 && !path.startsWith('/auth/')) {
    notifyUnauthorized();
    throw new ApiError('AUTH-001', 401, AUTH_EXPIRED_MESSAGE);
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    if (!res.ok) {
      throw new ApiError('SYS-001', res.status, `サーバーエラーが発生しました (HTTP ${res.status})`);
    }
    throw new ApiError('SYS-001', res.status, 'サーバーの応答を解析できません');
  }

  const obj = (data ?? {}) as { ok?: boolean; code?: string; message?: string };
  if (!res.ok || obj.ok === false) {
    const code = typeof obj.code === 'string' ? obj.code : 'SYS-001';
    const message = typeof obj.message === 'string' && obj.message
      ? obj.message
      : `エラーが発生しました (HTTP ${res.status})`;
    throw new ApiError(code, res.status, message);
  }

  return data as T;
}

/**
 * ユーザー向けのエラーメッセージ整形: 「メッセージ (コード)」
 * コードを伝えるだけで発生箇所を特定できるようにする。
 */
export function formatApiError(err: unknown, fallback = 'エラーが発生しました'): string {
  if (err instanceof ApiError) {
    return `${err.message} (${err.code})`;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}
