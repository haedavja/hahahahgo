/**
 * @file useRewardSelection.js
 * @description 보상 카드 선택 훅
 * @typedef {import('../../../types').Card} Card
 *
 * ## 기능
 * - 승리 후 카드 보상 선택
 * - 함성 카드 선택 처리
 * - 덱에 카드 추가
 */

import { useState, useCallback } from 'react';
import { useGameStore } from '../../../state/gameStore';
import type { Card } from '../../../types';

/** 카드 보상 상태 타입 */
export interface CardRewardState {
  cards: Card[];
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
}: any) {
  // 카드 보상 선택 상태 (승리 후)
  const [cardReward, setCardReward] = useState<CardRewardState | null>(null);

  // 함성(recallCard) 카드 선택 상태
  const [recallSelection, setRecallSelection] = useState<{ availableCards: typeof CARDS } | null>(null);

  // 카드 보상 선택 처리 (승리 후)
  const handleRewardSelect = useCallback((selectedCard: any, idx: any) => {
    addLog(`🎁 "${selectedCard.name}" 획득! (대기 카드에 추가됨)`);

    // 선택한 카드를 대기 카드(ownedCards)에 추가 (Zustand 스토어 업데이트)
    useGameStore.getState().addOwnedCard(selectedCard.id);

    // 모달 닫기 및 post 페이즈로 전환
    setCardReward(null);
    actions.setPostCombatOptions({ type: 'victory' });
    actions.setPhase('post');
  }, [addLog, actions]);

  // 카드 보상 건너뛰기
  const handleRewardSkip = useCallback(() => {
    addLog('카드 보상을 건너뛰었습니다.');
    setCardReward(null);
    actions.setPostCombatOptions({ type: 'victory' });
    actions.setPhase('post');
  }, [addLog, actions]);

  // 함성 (recallCard) 카드 선택 처리
  const handleRecallSelect = useCallback((selectedCard: any) => {
    addLog(`📢 함성: "${selectedCard.name}" 선택! 다음 턴에 확정 등장합니다.`);

    // 선택한 카드를 nextTurnEffects.guaranteedCards에 추가
    const currentEffects = battleRef.current?.nextTurnEffects || battleNextTurnEffects;
    const updatedEffects = {
      ...currentEffects,
      guaranteedCards: [...(currentEffects.guaranteedCards || []), selectedCard.id]
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

  // 승리 시 카드 보상 모달 표시
  const showCardRewardModal = useCallback(() => {
    // 공격/범용/특수 카드 중 랜덤 3장 선택
    const cardPool = CARDS.filter((c: any) => (c.type === 'attack' || c.type === 'general' || c.type === 'special'));
    const shuffled = [...cardPool].sort(() => Math.random() - 0.5);
    const rewardCards = shuffled.slice(0, 3);

    setCardReward({ cards: rewardCards });
  }, [CARDS]);

  return {
    // State
    cardReward,
    recallSelection,
    setRecallSelection,

    // Handlers
    handleRewardSelect,
    handleRewardSkip,
    handleRecallSelect,
    handleRecallSkip,
    showCardRewardModal
  };
}
