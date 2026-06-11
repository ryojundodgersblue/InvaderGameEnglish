import { useCallback, useEffect, useRef, useState } from 'react';
import { TIME_LIMIT } from '../constants/game';

/**
 * 問題ごとの制限時間カウントダウン。
 * 時間切れで onTimeUp を1回だけ呼ぶ(コールバックはrefで常に最新を参照)。
 */
export function useGameTimer(onTimeUp: () => void) {
  const [remainingTime, setRemainingTime] = useState(TIME_LIMIT);
  const remainingTimeRef = useRef(TIME_LIMIT);
  const timerIntervalRef = useRef<number | null>(null);
  const onTimeUpRef = useRef(onTimeUp);

  useEffect(() => { onTimeUpRef.current = onTimeUp; }, [onTimeUp]);

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
