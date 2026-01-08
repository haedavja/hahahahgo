/**
 * @file useCardOrdering.ts
 * @description 카드 순서 변경 훅
 *
 * useCardSelection에서 분리된 순서 변경 로직
 * 종속성: battlePhase, selected, enemyPlanActions, effectiveAgility, actions, addLog (6개)
 */

import { useCallback } from 'react';
import { detectPokerCombo, applyPokerBonus } from '../utils/comboDetection';
import { createFixedOrder } from '../utils/cardOrdering';
import type { Card, OrderingEnemyAction, LogFunction } from '../../../types';

/** 순서 변경 액션 인터페이스 */
interface CardOrderingActions {
  setFixedOrder: (order: unknown[] | null) => void;
  setSelected: (cards: Card[]) => void;
}

interface UseCardOrderingParams {
  battlePhase: string;
  selected: Card[];
  selectedLength: number;
  enemyPlanActions: OrderingEnemyAction[] | null;
  effectiveAgility: number;
  addLog: LogFunction;
  actions: CardOrderingActions;
}

/**
 * 카드 순서 변경 훅
 *
 * @param params - 훅 파라미터
 * @returns moveUp, moveDown 함수
 */
export function useCardOrdering({
  battlePhase,
  selected,
  selectedLength,
  enemyPlanActions,
  effectiveAgility,
  addLog,
  actions,
}: UseCardOrderingParams) {
  /**
   * 포커 조합 적용 및 순서 업데이트
   */
  const applyComboAndOrder = useCallback(
    (cards: Card[]) => {
      const combo = detectPokerCombo(cards);
      const enhanced = applyPokerBonus(cards, combo);
      const withSp = createFixedOrder(enhanced, enemyPlanActions, effectiveAgility);
      actions.setFixedOrder(withSp);
      actions.setSelected(cards);
    },
    [enemyPlanActions, effectiveAgility, actions]
  );

  /**
   * stubborn(고집) 특성 체크
   */
  const checkStubborn = useCallback(
    (cardA: Card | undefined, cardB: Card | undefined): boolean => {
      if (cardA?.traits?.includes('stubborn') || cardB?.traits?.includes('stubborn')) {
        addLog('⚠️ "고집" 특성으로 순서를 변경할 수 없습니다.');
        return true;
      }
      return false;
    },
    [addLog]
  );

  /**
   * 카드 순서 위로 이동
   *
   * @param index - 이동할 카드 인덱스
   */
  const moveUp = useCallback(
    (index: number) => {
      if (index === 0) return;

      const cardToMove = selected[index];
      const cardAbove = selected[index - 1];

      if (checkStubborn(cardToMove, cardAbove)) return;

      const newSelected: Card[] = [...selected];
      [newSelected[index - 1], newSelected[index]] = [newSelected[index], newSelected[index - 1]];

      if (battlePhase === 'respond') {
        applyComboAndOrder(newSelected);
      } else {
        actions.setSelected(newSelected);
      }
    },
    [battlePhase, selected, checkStubborn, applyComboAndOrder, actions]
  );

  /**
   * 카드 순서 아래로 이동
   *
   * @param index - 이동할 카드 인덱스
   */
  const moveDown = useCallback(
    (index: number) => {
      if (index === selectedLength - 1) return;

      const cardToMove = selected[index];
      const cardBelow = selected[index + 1];

      if (checkStubborn(cardToMove, cardBelow)) return;

      const newSelected: Card[] = [...selected];
      [newSelected[index], newSelected[index + 1]] = [newSelected[index + 1], newSelected[index]];

      if (battlePhase === 'respond') {
        applyComboAndOrder(newSelected);
      } else {
        actions.setSelected(newSelected);
      }
    },
    [battlePhase, selected, selectedLength, checkStubborn, applyComboAndOrder, actions]
  );

  return { moveUp, moveDown };
}
