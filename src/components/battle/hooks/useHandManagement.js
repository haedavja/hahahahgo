import { useCallback } from 'react';
import { useGameStore } from '../../../state/gameStore';
import { drawFromDeck } from '../utils/handGeneration';
import { CARDS as BASE_CARDS, DEFAULT_DRAW_COUNT } from '../battleData';

/**
 * 패 관리 훅
 * 리드로우, 정렬 기능 제공
 */
export function useHandManagement({
  canRedraw,
  battleHand,
  battleDeck,
  battleDiscardPile,
  sortType,
  hand,
  escapeBanRef,
  addLog,
  playSound,
  actions
}) {
  // 손패 리드로우
  const redrawHand = useCallback(() => {
    if (!canRedraw) return addLog('🔒 이미 이번 턴 리드로우 사용됨');

    const currentBuild = useGameStore.getState().characterBuild;
    const hasCharacterBuild = currentBuild && (currentBuild.mainSpecials?.length > 0 || currentBuild.subSpecials?.length > 0 || currentBuild.ownedCards?.length > 0);

    if (hasCharacterBuild) {
      // 현재 손패를 무덤으로 이동하고 새로 드로우
      const currentHand = battleHand || [];
      const currentDeck = battleDeck || [];
      const currentDiscard = [...(battleDiscardPile || []), ...currentHand];

      const drawResult = drawFromDeck(currentDeck, currentDiscard, DEFAULT_DRAW_COUNT, escapeBanRef.current);
      actions.setDeck(drawResult.newDeck);
      actions.setDiscardPile(drawResult.newDiscardPile);
      actions.setHand(drawResult.drawnCards);

      if (drawResult.reshuffled) {
        addLog('🔄 덱이 소진되어 무덤을 섞어 새 덱을 만들었습니다.');
      }
    } else {
      const rawHand = BASE_CARDS.slice(0, 10).map((card, idx) => ({ ...card, __handUid: `${card.id}_${idx}_${Math.random().toString(36).slice(2, 8)}` }));
      actions.setHand(rawHand);
    }

    actions.setSelected([]);
    actions.setCanRedraw(false);
    addLog('🔄 손패 리드로우 사용');
    playSound(700, 90);
  }, [canRedraw, battleHand, battleDeck, battleDiscardPile, escapeBanRef, addLog, playSound, actions]);

  // 정렬 방식 순환
  const cycleSortType = useCallback(() => {
    const sortCycle = ['speed', 'energy', 'value', 'type'];
    const currentIndex = sortCycle.indexOf(sortType);
    const nextIndex = (currentIndex + 1) % sortCycle.length;
    const nextSort = sortCycle[nextIndex];
    actions.setSortType(nextSort);
    try {
      localStorage.setItem('battleSortType', nextSort);
    } catch { }

    const sortLabels = {
      speed: '시간 기준 정렬',
      energy: '행동력 기준 정렬',
      value: '밸류 기준 정렬',
      type: '종류별 정렬'
    };
    addLog(`🔀 ${sortLabels[nextSort]}`);
    playSound(600, 80);
  }, [sortType, addLog, playSound, actions]);

  // 정렬된 패 반환
  const getSortedHand = useCallback(() => {
    const sorted = [...hand];

    if (sortType === 'speed') {
      sorted.sort((a, b) => b.speedCost - a.speedCost);
    } else if (sortType === 'energy') {
      sorted.sort((a, b) => b.actionCost - a.actionCost);
    } else if (sortType === 'value') {
      sorted.sort((a, b) => {
        const aValue = ((a.damage || 0) * (a.hits || 1)) + (a.block || 0);
        const bValue = ((b.damage || 0) * (b.hits || 1)) + (b.block || 0);
        return bValue - aValue;
      });
    } else if (sortType === 'type') {
      const typeOrder = { 'attack': 0, 'general': 1, 'special': 2 };
      sorted.sort((a, b) => {
        const aOrder = typeOrder[a.type] ?? 3;
        const bOrder = typeOrder[b.type] ?? 3;
        return aOrder - bOrder;
      });
    }

    return sorted;
  }, [hand, sortType]);

  return {
    redrawHand,
    cycleSortType,
    getSortedHand
  };
}
