/**
 * @file useEnemyPlanGeneration.ts
 * @description 선택 단계에서 적 행동 계획 자동 생성 훅
 *
 * ## 주요 기능
 * - 선택 단계 진입 시 적 행동을 미리 계산
 * - 카드 파괴 후 재생성 방지 (manuallyModified 플래그 확인)
 * - 다중 유닛 시스템 지원 (소스 유닛 할당)
 */

import { useEffect, type MutableRefObject } from 'react';
import { generateEnemyActions, assignSourceUnitToActions } from '../utils/enemyAI';
import type { Card } from '../../../types/core';
import type { BattlePhase } from '../reducer/battleReducerActions';
import type { AICard, AIMode, AIEnemy } from '../../../types';

interface EnemyPlan {
  actions?: Card[];
  mode?: AIMode | null;
  manuallyModified?: boolean;
}

interface EnemyUnit {
  unitId: number;
  [key: string]: unknown;
}

interface EnemyState {
  etherPts?: number;
  cardsPerTurn?: number;
  units?: EnemyUnit[];
  [key: string]: unknown;
}

interface BattleRefValue {
  enemyPlan?: EnemyPlan;
  [key: string]: unknown;
}

interface UseEnemyPlanGenerationParams {
  phase: BattlePhase;
  enemy: EnemyState | null;
  enemyPlan: EnemyPlan;
  enemyCount: number;
  battleRef: MutableRefObject<BattleRefValue | null>;
  etherSlots: (pts: number) => number;
  actions: {
    setEnemyPlan: (plan: { mode: AIMode | null; actions: Card[] }) => void;
  };
}

/**
 * 선택 단계에서 적 행동 계획 자동 생성 훅
 */
export function useEnemyPlanGeneration(params: UseEnemyPlanGenerationParams): void {
  const {
    phase,
    enemy,
    enemyPlan,
    enemyCount,
    battleRef,
    etherSlots,
    actions
  } = params;

  useEffect(() => {
    // battleRef에서 최신 상태 확인 (closure는 stale할 수 있음)
    const currentEnemyPlan = battleRef.current?.enemyPlan;

    if (phase !== 'select') {
      return;
    }

    // battleRef에서 최신 manuallyModified 확인
    const latestManuallyModified = currentEnemyPlan?.manuallyModified || enemyPlan?.manuallyModified;
    const latestActions = currentEnemyPlan?.actions || enemyPlan?.actions;
    const latestMode = currentEnemyPlan?.mode || enemyPlan?.mode;

    if (!latestMode) {
      return;
    }

    // manuallyModified가 true면 재생성하지 않음 (카드 파괴 등으로 수동 변경된 경우)
    if ((latestActions && latestActions.length > 0) || latestManuallyModified) {
      return;
    }

    const slots = etherSlots(Number(enemy?.etherPts ?? 0));
    const cardsPerTurn = enemy?.cardsPerTurn || enemyCount || 2;
    const rawActions = generateEnemyActions(enemy as AIEnemy, latestMode, slots, cardsPerTurn, Math.min(1, cardsPerTurn));
    const generatedActions = assignSourceUnitToActions(rawActions as AICard[], enemy?.units || []);
    actions.setEnemyPlan({ mode: latestMode, actions: generatedActions as unknown as Card[] });
  }, [phase, enemyPlan?.mode, enemyPlan?.actions?.length, enemyPlan?.manuallyModified, enemy, enemyCount, battleRef, etherSlots, actions]);
}
