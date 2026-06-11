import { useCallback, useEffect, useRef, useState } from 'react';
import { TIME_LIMIT } from '../constants/game';

/**
 * 問題ごとの制限時間カウントダウン。
 * 時間切れで onTimeUp を1回だけ呼ぶ(コールバックはrefで常に最新を参照)。
 * onTick は毎秒呼ばれる。タイマーが動いている=アプリは正常に動作しているため、
 * フリーズ検知のアクティビティ更新に使う(生徒が無言で考えている時間を
 * フリーズと誤検知しないため)。
 */
export function useGameTimer(onTimeUp: () => void, onTick?: () => void) {
  const [remainingTime, setRemainingTime] = useState(TIME_LIMIT);
  const remainingTimeRef = useRef(TIME_LIMIT);
  const timerIntervalRef = useRef<number | null>(null);
  const onTimeUpRef = useRef(onTimeUp);
  const onTickRef = useRef(onTick);

  useEffect(() => { onTimeUpRef.current = onTimeUp; }, [onTimeUp]);
  useEffect(() => { onTickRef.current = onTick; }, [onTick]);

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
    }

    setRemainingTime(TIME_LIMIT);
    remainingTimeRef.current = TIME_LIMIT;

    timerIntervalRef.current = window.setInterval(() => {
      remainingTimeRef.current -= 1;
      setRemainingTime(remainingTimeRef.current);
      onTickRef.current?.();

      if (remainingTimeRef.current <= 0) {
        if (timerIntervalRef.current) {
          window.clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        onTimeUpRef.current();
      }
    }, 1000);
  }, []);

  useEffect(() => stopTimer, [stopTimer]);

  return { remainingTime, startTimer, stopTimer };
}
