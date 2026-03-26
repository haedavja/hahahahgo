/**
 * @file useAnomalyNotification.ts
 * @description 이변(Anomaly) 알림 표시 훅
 *
 * ## 주요 기능
 * - 전투 시작 시 활성화된 이변 로그 추가
 * - 한 번만 표시되도록 ref로 상태 관리
 */

import { useEffect, useRef } from 'react';

interface AnomalyEffect {
  description: string;
  [key: string]: unknown;
}

interface Anomaly {
  emoji: string;
  name: string;
  getEffect: (level: number) => AnomalyEffect;
}

interface AnomalyWithLevel {
  anomaly: Anomaly;
  level: number;
}

interface UseAnomalyNotificationParams {
  enemy: unknown;
  activeAnomalies: AnomalyWithLevel[];
  addLog: (msg: string) => void;
}

/**
 * 이변 알림 표시 훅
 * @returns anomalyNotificationShownRef - 알림 표시 여부 ref (외부에서 사용 가능)
 */
export function useAnomalyNotification(params: UseAnomalyNotificationParams): {
  anomalyNotificationShownRef: React.MutableRefObject<boolean>;
} {
  const { enemy, activeAnomalies, addLog } = params;
  const anomalyNotificationShownRef = useRef(false);

  useEffect(() => {
    // activeAnomalies는 useBattleInitialization 훅에서 제공 (상태 동기화 완료됨)
    if (enemy && activeAnomalies.length > 0 && !anomalyNotificationShownRef.current) {
      // 이변 로그 추가
      activeAnomalies.forEach(({ anomaly, level }) => {
        const effect = anomaly.getEffect(level);
        addLog(`⚠️ ${anomaly.emoji} ${anomaly.name} (Lv.${level}): ${effect.description}`);
      });

      // 이변 알림 표시 (훅에서 이미 setShowAnomalyNotification(true) 호출됨)
      anomalyNotificationShownRef.current = true;
    }
  }, [enemy, activeAnomalies, addLog]);

  return { anomalyNotificationShownRef };
}
