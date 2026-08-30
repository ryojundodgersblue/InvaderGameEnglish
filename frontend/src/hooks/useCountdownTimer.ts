import { useCallback, useEffect, useRef, useState } from 'react';

type Options = {
  /** 制限時間(秒)。仕様: TIME_LIMIT=30 (Function Specs G22) */
  limit: number;
  /** 0到達時に1回だけ呼ばれる。呼び先が処理中で受けられない場合の再送は呼び先が管理する */
  onTimeUp: () => void;
  /** 表示秒が変わるたびに呼ばれる(フリーズ検知の生存信号などに使う) */
  onTick?: (remaining: number) => void;
};

/**
 * 壁時計ベースのカウントダウンタイマー (要望No.159/173/175/178/179/186)。
 *
 * 旧実装の構造欠陥への対策:
 * - tick回数の減算ではなく「締切時刻 - 現在時刻」で残りを算出する
 *   (タブのスロットリングやスリープで tick が間引かれてもズレない)
 * - start は二重起動しない(interval稼働中の再startは無視)
 * - 0到達時のonTimeUpは1回のstartにつき1回だけ
 * - reset で表示も含めて制限時間に戻す(前問の残り秒を引き継がない)
 * - pause/resume はタブ非表示時のゲーム一時停止用
 */
export function useCountdownTimer({ limit, onTimeUp, onTick }: Options) {
  const [remaining, setRemaining] = useState(limit);
  const intervalRef = useRef<number | null>(null);
  const endAtRef = useRef<number | null>(null);
  const pausedMsLeftRef = useRef<number | null>(null);
  const lastShownRef = useRef(limit);

  // 最新のコールバックを参照する(依存配列の連鎖を避ける)
  const onTimeUpRef = useRef(onTimeUp);
  const onTickRef = useRef(onTick);
  useEffect(() => { onTimeUpRef.current = onTimeUp; }, [onTimeUp]);
  useEffect(() => { onTickRef.current = onTick; }, [onTick]);

  const clearIntervalOnly = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    if (endAtRef.current === null) return;
    const msLeft = endAtRef.current - Date.now();
    const sec = Math.max(0, Math.ceil(msLeft / 1000));
    if (sec !== lastShownRef.current) {
      lastShownRef.current = sec;
      setRemaining(sec);
      onTickRef.current?.(sec);
    }
    if (msLeft <= 0) {
      clearIntervalOnly();
      endAtRef.current = null;
      onTimeUpRef.current();
    }
  }, [clearIntervalOnly]);

  const start = useCallback(() => {
    if (intervalRef.current !== null) return; // 二重起動防止
    endAtRef.current = Date.now() + limit * 1000;
    pausedMsLeftRef.current = null;
    lastShownRef.current = limit;
    setRemaining(limit);
    intervalRef.current = window.setInterval(tick, 250);
  }, [limit, tick]);

  const stop = useCallback(() => {
    clearIntervalOnly();
    endAtRef.current = null;
    pausedMsLeftRef.current = null;
  }, [clearIntervalOnly]);

  /** 停止して表示を制限時間に戻す(問題切り替え・リトライ・フリーズ復帰用) */
  const reset = useCallback(() => {
    stop();
    lastShownRef.current = limit;
    setRemaining(limit);
  }, [stop, limit]);

  const pause = useCallback(() => {
    if (endAtRef.current === null || pausedMsLeftRef.current !== null) return;
    pausedMsLeftRef.current = Math.max(0, endAtRef.current - Date.now());
    clearIntervalOnly();
    endAtRef.current = null;
  }, [clearIntervalOnly]);

  const resume = useCallback(() => {
    if (pausedMsLeftRef.current === null) return;
    endAtRef.current = Date.now() + pausedMsLeftRef.current;
    pausedMsLeftRef.current = null;
    if (intervalRef.current === null) {
      intervalRef.current = window.setInterval(tick, 250);
    }
  }, [tick]);

  const isRunning = useCallback(
    () => intervalRef.current !== null || pausedMsLeftRef.current !== null,
    []
  );

  useEffect(() => clearIntervalOnly, [clearIntervalOnly]); // アンマウント時に停止

  return { remaining, start, stop, reset, pause, resume, isRunning };
}
