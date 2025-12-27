/**
 * @file useBreachSelection.js
 * @description 브리치/창조 카드 선택 훅
 * @typedef {import('../../../types').Card} Card
 *
 * ## 기능
 * - 브리치 효과로 카드 생성
 * - 생성된 카드를 큐에 추가
 * - 선택 UI 상태 관리
 */

import { useCallback, useState, useRef } from 'react';
import type { BreachSelection } from '../../../types';

// 카드 창조 큐 아이템 (런타임 타입 - 다양한 카드 타입 허용)
export interface CreationQueueItem {
  cards: unknown[];
  insertSp: number;
  breachCard: unknown;
  isAoe?: boolean;
}

/**
 * 브리치/창조 카드 선택 훅
 * @param {Object} params
 * @param {Card[]} params.CARDS - 전체 카드 목록
 * @param {React.MutableRefObject<Object>} params.battleRef - 전투 상태 ref
 * @param {React.MutableRefObject<Function>} params.stepOnceRef - stepOnce 함수 ref
 * @param {Function} params.addLog - 로그 추가
 * @param {Object} params.actions - 상태 업데이트 액션
 * @returns {{breachSelection: Object|null, handleBreachSelect: Function}}
 */
export function useBreachSelection({
  CARDS,
  battleRef,
  stepOnceRef,
  addLog,
  actions
}: any) {
  const [breachSelection, setBreachSelection] = useState<BreachSelection | null>(null);
  const breachSelectionRef = useRef<BreachSelection | null>(null);
  const creationQueueRef = useRef<CreationQueueItem[]>([]);

  const handleBreachSelect = useCallback((selectedCard: any, idx: any) => {
    const breach = breachSelectionRef.current as any;
    if (!breach) return;

    const insertSp = (breach.breachSp ?? 0) + (breach.breachCard?.breachSpOffset ?? 3);

    addLog(`👻 "${selectedCard.name}" 선택! 타임라인 ${insertSp}에 유령카드로 삽입.`);

    // 유령카드 생성
    const originalCard = CARDS.find((c: any) => c.id === selectedCard.id) || selectedCard;
    const ghostCard = {
      ...originalCard,
      damage: originalCard.damage,
      block: originalCard.block,
      hits: originalCard.hits,
      speedCost: originalCard.speedCost,
      actionCost: originalCard.actionCost,
      type: originalCard.type,
      cardCategory: originalCard.cardCategory,
      special: originalCard.special,
      traits: originalCard.traits,
      isGhost: true,
      isFromFleche: selectedCard.isFromFleche || false,
      flecheChainCount: selectedCard.flecheChainCount || 0,
      createdBy: selectedCard.createdBy || breach.breachCard?.id,
      isAoe: breach.isAoe ?? false,
      __uid: `ghost_${Math.random().toString(36).slice(2)}`
    };

    const ghostAction = {
      actor: 'player',
      card: ghostCard,
      sp: insertSp
    };

    // 현재 큐에 유령카드 삽입
    const currentQ = battleRef.current.queue;
    const currentQIndex = battleRef.current.qIndex;

    const beforeCurrent = currentQ.slice(0, currentQIndex + 1);
    const afterCurrent = [...currentQ.slice(currentQIndex + 1), ghostAction];

    // sp 기준으로 정렬
    afterCurrent.sort((a, b) => {
      if ((a.sp ?? 0) !== (b.sp ?? 0)) return (a.sp ?? 0) - (b.sp ?? 0);
      if (a.card?.isGhost && !b.card?.isGhost) return -1;
      if (!a.card?.isGhost && b.card?.isGhost) return 1;
      return 0;
    });

    const newQueue = [...beforeCurrent, ...afterCurrent];
    actions.setQueue(newQueue);

    battleRef.current = { ...battleRef.current, queue: newQueue };

    // 창조 다중 선택 큐 확인 (벙 데 라므 등)
    if (creationQueueRef.current.length > 0) {
      const nextSelection = creationQueueRef.current.shift() as any;
      if (!nextSelection) return;
      const remainingCount = creationQueueRef.current.length;

      addLog(`👻 창조 ${3 - remainingCount}/3: 카드를 선택하세요.`);

      const nextBreachState = {
        cards: nextSelection.cards,
        breachSp: nextSelection.insertSp,
        breachCard: nextSelection.breachCard,
        isCreationSelection: true,
        isAoe: nextSelection.isAoe
      };
      breachSelectionRef.current = nextBreachState as any;
      setBreachSelection(nextBreachState as any);

      return;
    }

    // 브리치 선택 상태 초기화
    breachSelectionRef.current = null;
    setBreachSelection(null);

    // 선택 완료 후 게임 진행 재개
    const newQIndex = currentQIndex + 1;

    battleRef.current = { ...battleRef.current, queue: newQueue, qIndex: newQIndex };

    actions.setQIndex(newQIndex);

    // 자동 진행을 위해 다음 stepOnce 호출 예약
    setTimeout(() => {
      if (battleRef.current.qIndex < battleRef.current.queue.length) {
        stepOnceRef.current?.();
      }
    }, 100);
  }, [CARDS, battleRef, stepOnceRef, addLog, actions]);

  return {
    breachSelection,
    setBreachSelection,
    breachSelectionRef,
    creationQueueRef,
    handleBreachSelect
  };
}
