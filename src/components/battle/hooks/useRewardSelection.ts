/**
 * @file useRewardSelection.js
 * @description 보상 카드 및 특성 선택 훅
 * @typedef {import('../../../types').Card} Card
 *
 * ## 기능
 * - 승리 후 카드 보상 선택
 * - 특성 보상 선택 (30% 확률)
 * - 함성 카드 선택 처리
 * - 덱에 카드 추가
 */

import { useState, useCallback, useMemo } from 'react';
import { useGameStore } from '../../../state/gameStore';
import type { Card, CardRarity, NextTurnEffects } from '../../../types';
import type { UseRewardSelectionParams } from '../../../types/hooks';
import { shuffle } from '../../../lib/randomUtils';
import { TRAITS } from '../battleData';
import { recordCardPick } from '../../../simulator/bridge/stats-bridge';

/** 희귀도별 드랍 가중치 (높을수록 자주 등장) */
const RARITY_WEIGHTS: Record<CardRarity, number> = {
  common: 60,    // 일반: 60%
  rare: 30,      // 희귀: 30%
  special: 8,    // 특별: 8%
  legendary: 2   // 전설: 2%
};

/**
 * 희귀도 기반 가중치 랜덤 선택
 * @param cards 카드 풀
 * @param count 선택할 카드 수
 * @returns 선택된 카드 배열
 */
function selectCardsByRarity(cards: Card[], count: number): Card[] {
  const result: Card[] = [];
  const available = [...cards];

  for (let i = 0; i < count && available.length > 0; i++) {
    // 각 카드의 가중치 계산
    const weights = available.map(card => {
      const rarity = (card.rarity || 'common') as CardRarity;
      return RARITY_WEIGHTS[rarity] || RARITY_WEIGHTS.common;
    });

    // 가중치 합계
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    // 랜덤 값으로 카드 선택
    let random = Math.random() * totalWeight;
    let selectedIdx = 0;

    for (let j = 0; j < weights.length; j++) {
      random -= weights[j];
      if (random <= 0) {
        selectedIdx = j;
        break;
      }
    }

    // 선택된 카드를 결과에 추가하고 가용 풀에서 제거
    result.push(available[selectedIdx]);
    available.splice(selectedIdx, 1);
  }

  return result;
}

/** 카드 보상 상태 타입 */
export interface CardRewardState {
  cards: Card[];
}

/** 특성 보상 상태 타입 */
export interface TraitRewardState {
  traits: Array<{ id: string; name: string; type: string; description: string }>;
}

/** 특성 보상 확률 (30%) */
const TRAIT_REWARD_CHANCE = 0.3;

/** 보상으로 등장할 수 있는 특성 (긍정 특성만, weight 2 이하) */
function getRewardableTraits() {
  return Object.values(TRAITS).filter(
    (t) => t.type === 'positive' && t.weight <= 2
  );
}

/**
 * 보상 및 함성 카드 선택 훅
 * @param {Object} params
 * @param {Card[]} params.CARDS - 전체 카드 목록
 * @param {React.MutableRefObject<Object>} params.battleRef - 전투 상태 ref
 * @param {Object} params.battleNextTurnEffects - 다음 턴 효과
 * @param {Function} params.addLog - 로그 추가
 * @param {Object} params.actions - 상태 업데이트 액션
 * @returns {{showCardRewardModal: Function, handleCardReward: Function, handleCrySelect: Function}}
 */
export function useRewardSelection({
  CARDS,
  battleRef,
  battleNextTurnEffects,
  addLog,
  actions
}: UseRewardSelectionParams) {
  // 카드 보상 선택 상태 (승리 후)
  const [cardReward, setCardReward] = useState<CardRewardState | null>(null);

  // 특성 보상 선택 상태 (일정 확률로 등장)
  const [traitReward, setTraitReward] = useState<TraitRewardState | null>(null);

  // 함성(recallCard) 카드 선택 상태
  const [recallSelection, setRecallSelection] = useState<{ availableCards: typeof CARDS } | null>(null);

  // 카드 보상 모달 표시 (내부 함수) - 희귀도 기반 가중치 적용
  const openCardRewardModal = useCallback(() => {
    const cardPool = CARDS.filter(c => (c.type === 'attack' || c.type === 'general')) as Card[];
    // 희귀도 기반 가중치로 3장 선택 (common: 60%, rare: 30%, special: 8%, legendary: 2%)
    const rewardCards = selectCardsByRarity(cardPool, 3);
    setCardReward({ cards: rewardCards });
  }, [CARDS]);

  // 카드 보상 선택 처리 (승리 후)
  const handleRewardSelect = useCallback((selectedCard: Card, idx: number) => {
    addLog(`🎁 "${selectedCard.name}" 획득! (대기 카드에 추가됨)`);

    // 선택한 카드를 대기 카드(ownedCards)에 추가 (Zustand 스토어 업데이트)
    useGameStore.getState().addOwnedCard(selectedCard.id);

    // 통계 기록: 카드 픽
    const offeredCardIds = cardReward?.cards.map(c => c.id) || [];
    recordCardPick(selectedCard.id, offeredCardIds);

    // 모달 닫기 및 post 페이즈로 전환
    setCardReward(null);
    actions.setPostCombatOptions({ type: 'victory' });
    actions.setPhase('post');
  }, [addLog, actions, cardReward]);

  // 카드 보상 건너뛰기
  const handleRewardSkip = useCallback(() => {
    addLog('카드 보상을 건너뛰었습니다.');
    setCardReward(null);
    actions.setPostCombatOptions({ type: 'victory' });
    actions.setPhase('post');
  }, [addLog, actions]);

  // 특성 보상 선택 처리
  const handleTraitSelect = useCallback((trait: { id: string; name: string }) => {
    addLog(`✨ 특성 "${trait.name}" 획득! (캐릭터창에서 확인 가능)`);
    useGameStore.getState().addStoredTrait(trait.id);
    setTraitReward(null);
    // 특성 선택 후 카드 보상으로 이동
    openCardRewardModal();
  }, [addLog, openCardRewardModal]);

  // 특성 보상 건너뛰기
  const handleTraitSkip = useCallback(() => {
    addLog('특성 보상을 건너뛰었습니다.');
    setTraitReward(null);
    // 카드 보상으로 이동
    openCardRewardModal();
  }, [addLog, openCardRewardModal]);

  // 함성 (recallCard) 카드 선택 처리
  const handleRecallSelect = useCallback((selectedCard: Card) => {
    addLog(`📢 함성: "${selectedCard.name}" 선택! 다음 턴에 확정 등장합니다.`);

    // 선택한 카드를 nextTurnEffects.guaranteedCards에 추가
    const currentEffects = (battleRef.current?.nextTurnEffects || battleNextTurnEffects) as NextTurnEffects | undefined;
    const updatedEffects: NextTurnEffects = {
      ...currentEffects,
      guaranteedCards: [...((currentEffects?.guaranteedCards as string[] | undefined) || []), selectedCard.id]
    };
    actions.setNextTurnEffects(updatedEffects);
    if (battleRef.current) {
      battleRef.current = { ...battleRef.current, nextTurnEffects: updatedEffects };
    }

    // 모달 닫기
    setRecallSelection(null);
  }, [addLog, actions, battleRef, battleNextTurnEffects]);

  // 함성 건너뛰기
  const handleRecallSkip = useCallback(() => {
    addLog('📢 함성: 카드 선택을 건너뛰었습니다.');
    setRecallSelection(null);
  }, [addLog]);

  // 승리 시 보상 시퀀스 시작 (특성 30% → 카드)
  const showCardRewardModal = useCallback(() => {
    // 30% 확률로 특성 보상 먼저 표시
    if (Math.random() < TRAIT_REWARD_CHANCE) {
      // 이미 가진 특성은 제외
      const storedTraits = useGameStore.getState().storedTraits || [];
      const availableTraits = getRewardableTraits().filter(
        (t) => !storedTraits.includes(t.id)
      );

      if (availableTraits.length >= 3) {
        // 랜덤 3개 선택
        const shuffled = shuffle(availableTraits);
        const rewardTraits = shuffled.slice(0, 3);
        setTraitReward({ traits: rewardTraits });
        return;
      }
    }

    // 특성 보상이 없으면 바로 카드 보상
    openCardRewardModal();
  }, [openCardRewardModal]);

  return {
    // State
    cardReward,
    traitReward,
    recallSelection,
    setRecallSelection,

    // Handlers
    handleRewardSelect,
    handleRewardSkip,
    handleTraitSelect,
    handleTraitSkip,
    handleRecallSelect,
    handleRecallSkip,
    showCardRewardModal
  };
}
