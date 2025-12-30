/**
 * @file usePhaseEffects.ts
 * @description 페이즈 변경 관련 효과 처리 훅
 *
 * ## 주요 기능
 * - 페이즈 변경 시 카드 애니메이션 상태 초기화
 * - 단계 변경 시 트리거 플래그 리셋
 * - respond 단계에서 적 카드 파괴 시 fixedOrder 업데이트
 */

import { useEffect, type MutableRefObject } from 'react';
import type { Card } from '../../../types/core';
import type { BattlePhase } from '../reducer/battleReducerActions';
import type { OrderItem } from '../../../types';

/** 페이즈 효과 파라미터 */
interface UsePhaseEffectsParams {
  phase: BattlePhase;
  fixedOrder: OrderItem[] | null | undefined;
  enemyPlanActions: Card[];
  enemyPlanManuallyModified?: boolean;
  devilDiceTriggeredRef: MutableRefObject<boolean>;
  referenceBookTriggeredRef: MutableRefObject<boolean>;
  actions: {
    setDisappearingCards: (cards: number[]) => void;
    setHiddenCards: (cards: number[]) => void;
    setUsedCardIndices: (indices: number[]) => void;
    setFixedOrder: (order: OrderItem[] | null) => void;
  };
}

/**
 * 페이즈 변경 관련 효과 통합 훅
 */
export function usePhaseEffects(params: UsePhaseEffectsParams): void {
  const {
    phase,
    fixedOrder,
    enemyPlanActions,
    enemyPlanManuallyModified,
    devilDiceTriggeredRef,
    referenceBookTriggeredRef,
    actions
  } = params;

  // 페이즈 변경 시 카드 애니메이션 상태 초기화
  useEffect(() => {
    if (phase !== 'resolve') {
      actions.setDisappearingCards([]);
      actions.setHiddenCards([]);
    }
    // resolve 단계 진입 시 usedCardIndices 초기화
    if (phase === 'resolve') {
      actions.setUsedCardIndices([]);
    }
  }, [phase, actions]);

  // 단계 변경 시 트리거 리셋
  useEffect(() => {
    if (phase === 'select' || phase === 'respond') {
      devilDiceTriggeredRef.current = false;
      referenceBookTriggeredRef.current = false;
    }
    if (phase === 'resolve') {
      referenceBookTriggeredRef.current = false;
    }
  }, [phase, devilDiceTriggeredRef, referenceBookTriggeredRef]);

  // respond 단계에서 적 카드 파괴 시 fixedOrder 업데이트
  useEffect(() => {
    if (phase !== 'respond') return;
    if (!enemyPlanManuallyModified) return;
    if (!fixedOrder) return;

    // fixedOrder에서 파괴된 적 카드 제거 (enemyPlan.actions에 없는 적 카드)
    const remainingEnemyActions = new Set(enemyPlanActions);

    const updatedFixedOrder = fixedOrder.filter(item => {
      if (item.actor === 'player') return true;
      // 적 카드는 현재 enemyPlan.actions에 있는 것만 유지
      const isRemaining = remainingEnemyActions.has(item.card as Card);
      return isRemaining;
    });

    if (updatedFixedOrder.length !== fixedOrder.length) {
      actions.setFixedOrder(updatedFixedOrder);
    }
  }, [phase, enemyPlanActions, enemyPlanManuallyModified, fixedOrder, actions]);
}
