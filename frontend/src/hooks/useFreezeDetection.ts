import { useCallback, useEffect, useRef, useState } from 'react';
import { FREEZE_TIMEOUT_MS, FREEZE_CHECK_INTERVAL_MS } from '../constants/game';

/**
 * フリーズ検知。
 * updateActivity が一定時間呼ばれない場合に frozen=true にして回復UIを促す。
 * isMonitored が false を返す状態(idle/finished等)では検知しない。
 */
export function useFreezeDetection(isMonitored: () => boolean) {
  const [frozen, setFrozen] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const freezeDetectionTimerRef = useRef<number | null>(null);
  const isMonitoredRef = useRef(isMonitored);

  useEffect(() => { isMonitoredRef.current = isMonitored; }, [isMonitored]);

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const stopFreezeDetection = useCallback(() => {
    if (freezeDetectionTimerRef.current) {
      window.clearInterval(freezeDetectionTimerRef.current);
      freezeDetectionTimerRef.current = null;
    }
  }, []);

  const startFreezeDetection = useCallback(() => {
    lastActivityRef.current = Date.now();
    setFrozen(false);
    if (freezeDetectionTimerRef.current) {
      window.clearInterval(freezeDetectionTimerRef.current);
    }
    freezeDetectionTimerRef.current = window.setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      if (timeSinceActivity > FREEZE_TIMEOUT_MS && isMonitoredRef.current()) {
        console.error(`[Freeze] Game appears to be frozen - no activity for ${FREEZE_TIMEOUT_MS / 1000} seconds`);
        setFrozen(true);
        if (freezeDetectionTimerRef.current) {
          window.clearInterval(freezeDetectionTimerRef.current);
          freezeDetectionTimerRef.current = null;
        }
      }
    }, FREEZE_CHECK_INTERVAL_MS);
  }, []);

  useEffect(() => stopFreezeDetection, [stopFreezeDetection]);

  return { frozen, setFrozen, startFreezeDetection, stopFreezeDetection, updateActivity };
}
