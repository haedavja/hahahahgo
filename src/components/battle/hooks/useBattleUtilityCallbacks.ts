/**
 * @file useBattleUtilityCallbacks.ts
 * @description 전투 유틸리티 콜백 훅
 *
 * ## 주요 기능
 * - 로그 추가 래퍼
 * - 속도 텍스트 포맷팅
 */

import { useCallback } from 'react';
import { applyAgility } from '../../../lib/agilityUtils';

interface UseBattleUtilityCallbacksParams {
  effectiveAgility: number;
  actions: {
    addLog: (message: string) => void;
  };
}

interface BattleUtilityCallbacks {
  addLog: (message: string) => void;
  formatSpeedText: (baseSpeed: number) => string;
}

/**
 * 전투 유틸리티 콜백 훅
 */
export function useBattleUtilityCallbacks(params: UseBattleUtilityCallbacksParams): BattleUtilityCallbacks {
  const { effectiveAgility, actions } = params;

  const addLog = useCallback((m: string) => {
    actions.addLog(m);
  }, [actions]);

  const formatSpeedText = useCallback((baseSpeed: number) => {
    const finalSpeed = applyAgility(baseSpeed, Number(effectiveAgility));
    const diff = finalSpeed - baseSpeed;
    if (diff === 0) return `${finalSpeed}`;
    const sign = diff < 0 ? '-' : '+';
    const abs = Math.abs(diff);
    return `${finalSpeed} (${baseSpeed} ${sign} ${abs})`;
  }, [effectiveAgility]);

  return {
    addLog,
    formatSpeedText
  };
}
