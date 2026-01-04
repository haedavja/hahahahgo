/**
 * @file useBattleSyncEffects.ts
 * @description 전투 동기화 효과 훅
 *
 * ## 주요 기능
 * - 실시간 통찰 값 반영
 * - 승리 시 자동 결과 전송
 * - 타겟 유닛 자동 전환 (사망 시)
 * - 적 디플레이션 정보 설정
 */

import { useEffect, useRef } from 'react';
import type { BattlePhase } from '../reducer/battleReducerActions';

interface PlayerState {
  insight?: number;
  [key: string]: unknown;
}

interface EnemyUnit {
  unitId: number;
  hp: number;
  [key: string]: unknown;
}

interface EnemyState {
  comboUsageCount?: Record<string, number>;
  [key: string]: unknown;
}

interface PostCombatOptions {
  type?: 'victory' | 'defeat';
  isEtherVictory?: boolean;
  [key: string]: unknown;
}

interface ComboInfo {
  name?: string;
  [key: string]: unknown;
}

interface UseBattleSyncEffectsParams {
  // 실시간 통찰
  liveInsight: number | null | undefined;
  player: PlayerState;

  // 승리 자동 결과
  postCombatOptions: PostCombatOptions | null;
  notifyBattleResult: (outcome: 'victory' | 'defeat', isEtherVictory?: boolean) => void;

  // 타겟 유닛 자동 전환
  hasMultipleUnits: boolean;
  enemyUnits: EnemyUnit[];
  selectedTargetUnit: number;

  // 적 디플레이션
  phase: BattlePhase;
  enemy: EnemyState | null;
  enemyCombo: ComboInfo | null;

  actions: {
    setPlayer: (player: unknown) => void;
    setSelectedTargetUnit: (unitId: number) => void;
    setEnemyCurrentDeflation: (deflation: { multiplier: number; usageCount: number } | null) => void;
  };
}

/**
 * 전투 동기화 효과 훅
 */
export function useBattleSyncEffects(params: UseBattleSyncEffectsParams): void {
  const {
    liveInsight,
    player,
    postCombatOptions,
    notifyBattleResult,
    hasMultipleUnits,
    enemyUnits,
    selectedTargetUnit,
    phase,
    enemy,
    enemyCombo,
    actions
  } = params;

  // actions를 ref로 저장하여 의존성 배열에서 제외
  // (actions 객체가 매 렌더링마다 새로 생성되어 무한 루프 발생 방지)
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  // 전투 중 통찰 값 실시간 반영 (payload 재생성 없이)
  useEffect(() => {
    if (typeof liveInsight !== 'number') return;
    if (player.insight === liveInsight) return;
    actionsRef.current.setPlayer({ ...player, insight: liveInsight });
  }, [liveInsight, player]);

  // 승리 시에만 자동으로 결과 전송 (패배 시에는 사용자가 버튼 클릭 후 나감)
  useEffect(() => {
    if (postCombatOptions?.type === 'victory') {
      notifyBattleResult(postCombatOptions.type, postCombatOptions.isEtherVictory);
    }
  }, [postCombatOptions, notifyBattleResult]);

  // 선택된 유닛이 사망하면 다음 살아있는 유닛으로 자동 전환
  useEffect(() => {
    if (!hasMultipleUnits) return;
    const aliveUnits = enemyUnits.filter(u => u.hp > 0);
    if (aliveUnits.length === 0) return;
    const currentTarget = aliveUnits.find(u => u.unitId === selectedTargetUnit);
    if (!currentTarget && aliveUnits[0]?.unitId !== undefined) {
      // 현재 타겟이 사망했으므로 첫 번째 살아있는 유닛으로 전환
      actionsRef.current.setSelectedTargetUnit(aliveUnits[0].unitId);
    }
  }, [enemyUnits, selectedTargetUnit, hasMultipleUnits]);

  // 적 디플레이션 정보 설정 (선택/대응 단계에서)
  useEffect(() => {
    if (enemyCombo?.name && (phase === 'select' || phase === 'respond')) {
      const usageCount = (enemy?.comboUsageCount || {})[enemyCombo.name] || 0;
      const deflationMult = Math.pow(0.8, usageCount);
      actionsRef.current.setEnemyCurrentDeflation(usageCount > 0 ? { multiplier: deflationMult, usageCount } : null);
    }
  }, [enemyCombo, enemy?.comboUsageCount, phase]);
}
