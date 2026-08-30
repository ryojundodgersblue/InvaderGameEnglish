// 仕様(Function Specs D22/G22/H22): 回答受付開始で30秒カウントダウン。
// 時間切れは確実に1回発火し、前問の残り秒を次問に引き継がない
// (要望No.159/173/175/178/179/186 のタイマー構造欠陥対策)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountdownTimer } from '../useCountdownTimer';

const LIMIT = 30;

function setup(onTimeUp = vi.fn(), onTick = vi.fn()) {
  const hook = renderHook(() => useCountdownTimer({ limit: LIMIT, onTimeUp, onTick }));
  return { hook, onTimeUp, onTick };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'Date'] });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useCountdownTimer: 基本カウントダウン', () => {
  it('startで30秒から開始し、1秒ごとに減る', () => {
    const { hook, onTick } = setup();
    act(() => { hook.result.current.start(); });
    expect(hook.result.current.remaining).toBe(30);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(hook.result.current.remaining).toBe(29);
    expect(onTick).toHaveBeenCalledWith(29);
    act(() => { vi.advanceTimersByTime(9000); });
    expect(hook.result.current.remaining).toBe(20);
  });

  it('0到達で onTimeUp がちょうど1回呼ばれ、その後は再発火しない', () => {
    const { hook, onTimeUp } = setup();
    act(() => { hook.result.current.start(); });
    act(() => { vi.advanceTimersByTime(LIMIT * 1000); });
    expect(onTimeUp).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(onTimeUp).toHaveBeenCalledTimes(1); // ワンショットの再発火なし
    expect(hook.result.current.remaining).toBe(0);
  });

  it('壁時計基準: tickが間引かれても残り時間はズレない(スロットリング耐性)', () => {
    const { hook } = setup();
    act(() => { hook.result.current.start(); });
    // 大きく一括で進める(バックグラウンドでtickがまとめて実行される状況の近似)
    act(() => { vi.advanceTimersByTime(12_345); });
    expect(hook.result.current.remaining).toBe(30 - 12); // ceil(17655/1000)=18? → 30-12秒経過=18
  });
});

describe('useCountdownTimer: 二重起動と停止・リセット', () => {
  it('start中の再startは無視される(タイマーが加速しない)', () => {
    const { hook } = setup();
    act(() => { hook.result.current.start(); });
    act(() => { vi.advanceTimersByTime(5000); });
    act(() => { hook.result.current.start(); }); // 二重起動の試み
    expect(hook.result.current.remaining).toBe(25); // リセットされない
    act(() => { vi.advanceTimersByTime(1000); });
    expect(hook.result.current.remaining).toBe(24); // 1秒で1しか減らない
  });

  it('resetで表示が制限時間に戻る(No.159/186: 前問の0秒を引き継がない)', () => {
    const { hook, onTimeUp } = setup();
    act(() => { hook.result.current.start(); });
    act(() => { vi.advanceTimersByTime(LIMIT * 1000); });
    expect(hook.result.current.remaining).toBe(0);
    act(() => { hook.result.current.reset(); });
    expect(hook.result.current.remaining).toBe(30);
    expect(onTimeUp).toHaveBeenCalledTimes(1);
    // reset後に再startすれば再び30から
    act(() => { hook.result.current.start(); });
    act(() => { vi.advanceTimersByTime(2000); });
    expect(hook.result.current.remaining).toBe(28);
  });

  it('stopでonTimeUpは発火しなくなる(正解時の解除)', () => {
    const { hook, onTimeUp } = setup();
    act(() => { hook.result.current.start(); });
    act(() => { vi.advanceTimersByTime(5000); });
    act(() => { hook.result.current.stop(); });
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(onTimeUp).not.toHaveBeenCalled();
  });
});

describe('useCountdownTimer: pause/resume (タブ非表示対応)', () => {
  it('pause中は減らず、resumeで続きから', () => {
    const { hook } = setup();
    act(() => { hook.result.current.start(); });
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(hook.result.current.remaining).toBe(20);
    act(() => { hook.result.current.pause(); });
    act(() => { vi.advanceTimersByTime(120_000); }); // 非表示2分
    expect(hook.result.current.remaining).toBe(20);  // 減っていない
    act(() => { hook.result.current.resume(); });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(hook.result.current.remaining).toBe(19);
  });

  it('pause中もisRunningはtrue(復帰時にresumeが必要な状態と分かる)', () => {
    const { hook } = setup();
    act(() => { hook.result.current.start(); });
    act(() => { hook.result.current.pause(); });
    expect(hook.result.current.isRunning()).toBe(true);
    act(() => { hook.result.current.stop(); });
    expect(hook.result.current.isRunning()).toBe(false);
  });
});
