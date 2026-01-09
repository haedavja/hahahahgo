/**
 * @file useCardSelection.ts
 * @description 카드 선택/해제 처리 훅
 *
 * 리팩토링: 종속성 18개 → 12개로 축소
 * - useTokenValidation: 토큰 검증 로직 분리
 * - useCardOrdering: 순서 변경 로직 분리
 */

import { useCallback } from 'react';
import { applyAgility } from '../../../lib/agilityUtils';
import { generateUid } from '../../../lib/randomUtils';
import { detectPokerCombo, applyPokerBonus } from '../utils/comboDetection';
import { createFixedOrder } from '../utils/cardOrdering';
import { useTokenValidation } from './useTokenValidation';
import { useCardOrdering } from './useCardOrdering';
import { CARD_AUDIO } from '../../../core/effects';
import type { Card, PlayerBattleState, EnemyUnit, OrderingEnemyAction, LogFunction } from '../../../types';

/** 카드 선택 액션 인터페이스 */
interface CardSelectionActions {
  setFixedOrder: (order: unknown[] | null) => void;
  setSelected: (cards: Card[]) => void;
}

/** 다음 턴 효과 (상징 효과 포함) */
interface NextTurnEffectsState {
  speedCostReduction?: number;
  [key: string]: unknown;
}

/** 상징 정보 타입 */
type RelicInfo = string | { id: string; [key: string]: unknown };

interface UseCardSelectionParams {
  battlePhase: string;
  battleSelected: Card[];
  selected: Card[];
  effectiveAgility: number;
  effectiveMaxSubmitCards: number;
  totalSpeed: number;
  totalEnergy: number;
  player: PlayerBattleState;
  enemyUnits: EnemyUnit[];
  hasMultipleUnits: boolean;
  selectedTargetUnit: number | null;
  enemyPlanActions: OrderingEnemyAction[] | null;
  startDamageDistribution: (card: Card) => void;
  playSound: (frequency: number, duration: number) => void;
  addLog: LogFunction;
  actions: CardSelectionActions;
  nextTurnEffects?: NextTurnEffectsState | null;
  relics?: RelicInfo[];
}

/**
 * 카드 선택 훅
 *
 * @param params - 훅 파라미터
 * @returns toggle, moveUp, moveDown, checkRequiredTokens 함수
 */
export function useCardSelection({
  battlePhase,
  battleSelected,
  selected,
  effectiveAgility,
  effectiveMaxSubmitCards,
  totalSpeed,
  totalEnergy,
  player,
  enemyUnits,
  hasMultipleUnits,
  selectedTargetUnit,
  enemyPlanActions,
  startDamageDistribution,
  playSound,
  addLog,
  actions,
  nextTurnEffects,
  relics,
}: UseCardSelectionParams) {
  // 토큰 검증 훅 사용 (종속성: player)
  const { checkRequiredTokens } = useTokenValidation(player);

  // 순서 변경 훅 사용
  const { moveUp, moveDown } = useCardOrdering({
    battlePhase,
    selected,
    selectedLength: battleSelected.length,
    enemyPlanActions,
    effectiveAgility,
    addLog,
    actions,
    nextTurnEffects,
    relics,
  });

  /**
   * 카드 선택 유효성 검증
   */
  const validateCardSelection = useCallback(
    (card: Card, cardSpeed: number, currentSelected: Card[]): { ok: boolean; message?: string } => {
      if (currentSelected.length >= effectiveMaxSubmitCards) {
        return { ok: false, message: `⚠️ 최대 ${effectiveMaxSubmitCards}장의 카드만 제출할 수 있습니다` };
      }
      if (totalSpeed + cardSpeed > (player.maxSpeed ?? 30)) {
        return { ok: false, message: '⚠️ 속도 초과' };
      }
      if (totalEnergy + card.actionCost > player.maxEnergy) {
        return { ok: false, message: '⚠️ 행동력 부족' };
      }
      return checkRequiredTokens(card, currentSelected);
    },
    [effectiveMaxSubmitCards, totalSpeed, totalEnergy, player.maxSpeed, player.maxEnergy, checkRequiredTokens]
  );

  /**
   * 다중 타겟 카드 처리
   * @returns true면 타겟 선택 모드로 진입함
   */
  const handleMultiTargetCard = useCallback(
    (card: Card): boolean => {
      const aliveUnitsCount = enemyUnits.filter((u: EnemyUnit) => u.hp > 0).length;
      const isMultiTargetCard = card.traits?.includes('multiTarget');

      if (isMultiTargetCard && hasMultipleUnits && aliveUnitsCount > 1) {
        const cardWithUid = {
          ...card,
          __uid: card.__handUid || generateUid(),
        };
        startDamageDistribution(cardWithUid);
        playSound(CARD_AUDIO.DESELECT.tone, CARD_AUDIO.DESELECT.duration);
        return true;
      }
      return false;
    },
    [enemyUnits, hasMultipleUnits, startDamageDistribution, playSound]
  );

  /**
   * 타겟 정보가 포함된 카드 생성
   */
  const createCardWithTarget = useCallback(
    (card: Card): Card => ({
      ...card,
      __uid: card.__handUid || generateUid(),
      __targetUnitId: card.type === 'attack' && hasMultipleUnits ? selectedTargetUnit ?? undefined : undefined,
    }),
    [hasMultipleUnits, selectedTargetUnit]
  );

  /**
   * 포커 조합 적용 및 순서 업데이트
   */
  const applyComboAndOrder = useCallback(
    (cards: Card[]) => {
      const combo = detectPokerCombo(cards);
      const enhanced = applyPokerBonus(cards, combo);

      // 웃는 종(laughingBell): 낸 카드가 3장 이하면 카드의 시간소모 5 감소
      const hasLaughingBell = relics?.some(r => (typeof r === 'string' ? r : r.id) === 'laughingBell');
      const laughingBellApplies = hasLaughingBell && cards.length <= 3 && cards.length > 0;
      const laughingBellReduction = laughingBellApplies ? 5 : 0;

      const nextTurnReduction = nextTurnEffects?.speedCostReduction || 0;
      const totalSpeedReduction = laughingBellReduction + nextTurnReduction;

      const withSp = createFixedOrder(enhanced, enemyPlanActions, effectiveAgility, undefined, undefined, totalSpeedReduction);
      actions.setFixedOrder(withSp);
      actions.setSelected(cards);
    },
    [enemyPlanActions, effectiveAgility, actions, nextTurnEffects, relics]
  );

  /**
   * 카드 선택/해제 토글
   */
  const toggle = useCallback(
    (card: Card) => {
      if (battlePhase !== 'select' && battlePhase !== 'respond') return;

      const cardUid = card.__handUid || card.__uid;
      const exists = selected.some((s: Card) => (s.__handUid || s.__uid) === cardUid);

      // 대응 페이즈
      if (battlePhase === 'respond') {
        if (exists) {
          const next = selected.filter((s: Card) => (s.__handUid || s.__uid) !== cardUid);
          playSound(CARD_AUDIO.ERROR.tone, CARD_AUDIO.ERROR.duration);
          applyComboAndOrder(next);
          return;
        }

        const cardSpeed = applyAgility(card.speedCost, effectiveAgility);
        const validation = validateCardSelection(card, cardSpeed, selected);
        if (!validation.ok) {
          addLog(validation.message ?? '');
          return;
        }

        if (handleMultiTargetCard(card)) return;

        const cardWithTarget = createCardWithTarget(card);
        const next = [...selected, cardWithTarget];
        playSound(CARD_AUDIO.CONFIRM.tone, CARD_AUDIO.CONFIRM.duration);
        applyComboAndOrder(next);
        return;
      }

      // 선택 페이즈
      if (exists) {
        actions.setSelected(battleSelected.filter((s: Card) => (s.__handUid || s.__uid) !== cardUid));
        playSound(CARD_AUDIO.ERROR.tone, CARD_AUDIO.ERROR.duration);
        return;
      }

      const cardSpeed = applyAgility(card.speedCost, effectiveAgility);
      const validation = validateCardSelection(card, cardSpeed, selected);
      if (!validation.ok) {
        addLog(validation.message ?? '');
        return;
      }

      if (handleMultiTargetCard(card)) return;

      const cardWithTarget = createCardWithTarget(card);
      actions.setSelected([...selected, cardWithTarget]);
      playSound(CARD_AUDIO.CONFIRM.tone, CARD_AUDIO.CONFIRM.duration);
    },
    [
      battlePhase,
      battleSelected,
      selected,
      effectiveAgility,
      validateCardSelection,
      handleMultiTargetCard,
      createCardWithTarget,
      applyComboAndOrder,
      playSound,
      addLog,
      actions,
    ]
  );

  return {
    toggle,
    moveUp,
    moveDown,
    checkRequiredTokens,
  };
}
