import { useCallback } from 'react';
import { useStompDaySchedule } from '@/hooks/useStompDaySchedule';

const DEFAULT_WS_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_URL) ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`
    : undefined);

// PlanPage 전용: DaySchedule STOMP 연결 래퍼 훅
// 사용법: const { connected, createDay, renameDay, moveDayRealtime, updateSchedule, deleteDay } = usePlanDayScheduleWS({ planId, accessToken });
export function usePlanDayScheduleWS({ planId, accessToken, wsUrl = DEFAULT_WS_URL }) {
  const handleDayScheduleMessage = useCallback((msg) => {
    // 공통 로깅 (필요 시 외부 콜백으로 확장 가능)
    console.groupCollapsed('[DaySchedule][RECV]', msg?.action);
    console.log(msg);
    console.groupEnd();
  }, []);

  const day = useStompDaySchedule({
    planId,
    wsUrl,
    accessToken,
    onMessage: handleDayScheduleMessage,
    onSubscribed: () => {
      console.log('[DaySchedule] subscribed');
    },
  });

  return day;
}
