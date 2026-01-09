/**
 * @file useHandManagement.ts
 * @description 패 관리 훅 (리드로우, 정렬)
 */

import { useCallback } from 'react';
import { useGameStore } from '../../../state/gameStore';
import { drawFromDeck } from '../utils/handGeneration';
import { CARDS as BASE_CARDS, DEFAULT_DRAW_COUNT } from '../battleData';
import { generateHandUid } from '../../../lib/randomUtils';
import { CARD_AUDIO } from '../../../core/effects';
import type { Card, HandCard } from '../../../types';

/** 손패 관리 훅 파라미터 */
interface UseHandManagementParams {
  canRedraw: boolean;
  battleHand: Card[];
  battleDeck: Card[];
  battleDiscardPile: Card[];
  battleVanishedCards: Card[];
  sortType: 'speed' | 'energy' | 'value' | 'type';
  hand: Card[];
  escapeBanRef: React.MutableRefObject<Set<string>>;
  addLog: (msg: string) => void;
  playSound: (frequency: number, duration: number) => void;
  actions: {
    setDeck: (deck: Card[]) => void;
    setDiscardPile: (pile: Card[]) => void;
    setHand: (hand: Card[]) => void;
    setSelected: (selected: Card[]) => void;
    setCanRedraw: (canRedraw: boolean) => void;
    setSortType: (sortType: string) => void;
  };
}

/**
 * 패 관리 훅
 * 리드로우, 정렬 기능 제공
 */
export function useHandManagement({
  canRedraw,
  battleHand,
  battleDeck,
  battleDiscardPile,
  battleVanishedCards,
  sortType,
  hand,
  escapeBanRef,
  addLog,
  playSound,
  actions
}: UseHandManagementParams) {
  // 손패 리드로우
  const redrawHand = useCallback(() => {
    if (!canRedraw) return addLog('🔒 이미 이번 턴 리드로우 사용됨');

    const currentBuild = useGameStore.getState().characterBuild;
    const hasCharacterBuild = currentBuild && ((currentBuild.mainSpecials?.length ?? 0) > 0 || (currentBuild.subSpecials?.length ?? 0) > 0 || (currentBuild.ownedCards?.length ?? 0) > 0);

    if (hasCharacterBuild) {
      // 현재 손패를 무덤으로 이동하고 새로 드로우
      const currentHand = battleHand || [];
      const currentDeck = battleDeck || [];
      const currentDiscard = [...(battleDiscardPile || []), ...currentHand];

      // 소멸된 카드 ID 목록
      const vanishedCardIds = (battleVanishedCards || []).map((c: Card | string) => typeof c === 'string' ? c : c.id);
      const drawResult = drawFromDeck(currentDeck as HandCard[], currentDiscard as HandCard[], DEFAULT_DRAW_COUNT, escapeBanRef.current, vanishedCardIds);
      actions.setDeck(drawResult.newDeck);
      actions.setDiscardPile(drawResult.newDiscardPile);
      actions.setHand(drawResult.drawnCards);

      if (drawResult.reshuffled) {
        addLog('🔄 덱이 소진되어 무덤을 섞어 새 덱을 만들었습니다.');
      }
    } else {
      const rawHand = BASE_CARDS.slice(0, 10).map((card, idx: number) => ({ ...card, __handUid: generateHandUid(card.id, idx) } as HandCard));
      actions.setHand(rawHand);
    }

    actions.setSelected([]);
    actions.setCanRedraw(false);
    addLog('🔄 손패 리드로우 사용');
    playSound(CARD_AUDIO.SELECT.tone, CARD_AUDIO.SELECT.duration);
  }, [canRedraw, battleHand, battleDeck, battleDiscardPile, battleVanishedCards, escapeBanRef, addLog, playSound, actions]);

  // 정렬 방식 순환
  const cycleSortType = useCallback(() => {
    const sortCycle = ['speed', 'energy', 'value', 'type'];
    const currentIndex = sortCycle.indexOf(sortType);
    const nextIndex = (currentIndex + 1) % sortCycle.length;
    const nextSort = sortCycle[nextIndex];
    actions.setSortType(nextSort);
    try {
      localStorage.setItem('battleSortType', nextSort);
    } catch { /* ignore */ }

    const sortLabels: Record<string, string> = {
      speed: '시간 기준 정렬',
      energy: '행동력 기준 정렬',
      value: '밸류 기준 정렬',
      type: '종류별 정렬'
    };
    addLog(`🔀 ${sortLabels[nextSort]}`);
    playSound(CARD_AUDIO.DESELECT.tone, CARD_AUDIO.DESELECT.duration);
  }, [sortType, addLog, playSound, actions]);

  // 정렬된 패 반환
  const getSortedHand = useCallback(() => {
    const sorted = [...hand];

    if (sortType === 'speed') {
      sorted.sort((a: Card, b: Card) => b.speedCost - a.speedCost);
    } else if (sortType === 'energy') {
      sorted.sort((a: Card, b: Card) => b.actionCost - a.actionCost);
    } else if (sortType === 'value') {
      sorted.sort((a: Card, b: Card) => {
        const aValue = ((a.damage || 0) * (a.hits || 1)) + (a.block || 0);
        const bValue = ((b.damage || 0) * (b.hits || 1)) + (b.block || 0);
        return bValue - aValue;
      });
    } else if (sortType === 'type') {
      const typeOrder: Record<string, number> = { 'attack': 0, 'general': 1, 'special': 2 };
      sorted.sort((a: Card, b: Card) => {
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
