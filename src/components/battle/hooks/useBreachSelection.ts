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
import type { Card, LogFunction } from '../../../types/core';
import type { BattleAction } from '../../../types/combat';
import type { BattleRefValue } from '../../../types/hooks';
import { generateUid } from '../../../lib/randomUtils';

// 카드 창조 큐 아이템
export interface CreationQueueItem {
  cards: Card[];
  insertSp: number;
  breachCard: Card;
  isAoe?: boolean;
  totalSelections?: number;  // 총 선택 횟수 (진행 상황 표시용)
  currentSelection?: number; // 현재 선택 번호
}

// useBreachSelection 훅 파라미터 타입
export interface UseBreachSelectionParams {
  CARDS: Card[];
  battleRef: React.MutableRefObject<BattleRefValue | null>;
  stepOnceRef: React.MutableRefObject<(() => void) | null>;
  addLog: LogFunction;
  actions: {
    setQueue: (queue: unknown[]) => void;
    setQIndex: (index: number) => void;
    [key: string]: unknown;
  };
}

/**
 * 브리치/창조 카드 선택 훅
 * @param params - 훅 파라미터
 * @param params.CARDS - 전체 카드 목록
 * @param params.battleRef - 전투 상태 ref
 * @param params.stepOnceRef - stepOnce 함수 ref
 * @param params.addLog - 로그 추가 함수
 * @param params.actions - 상태 업데이트 액션
 */
export function useBreachSelection({
  CARDS,
  battleRef,
  stepOnceRef,
  addLog,
  actions
}: UseBreachSelectionParams) {
  const [breachSelection, setBreachSelection] = useState<BreachSelection | null>(null);
  const breachSelectionRef = useRef<BreachSelection | null>(null);
  const creationQueueRef = useRef<CreationQueueItem[]>([]);

  const handleBreachSelect = useCallback((selectedCard: Card, _idx: number) => {
    const breach = breachSelectionRef.current;
    if (!breach) return;

    const insertSp = (breach.breachSp ?? 0) + ((breach.breachCard as Card & { breachSpOffset?: number })?.breachSpOffset ?? 3);

    addLog(`👻 "${selectedCard.name}" 선택! 타임라인 ${insertSp}에 유령카드로 삽입.`);

    // 유령카드 생성
    const originalCard = CARDS.find((c) => c.id === selectedCard.id) || selectedCard;
    const ghostCard: Card = {
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
      createdBy: selectedCard.createdBy || (breach.breachCard as Card)?.id,
      isAoe: breach.isAoe ?? false,
      __uid: generateUid('ghost')
    };

    const ghostAction: BattleAction = {
      actor: 'player',
      card: ghostCard,
      sp: insertSp
    };

    // 현재 큐에 유령카드 삽입
    const currentQ = battleRef.current.queue ?? [];
    const currentQIndex = battleRef.current.qIndex ?? 0;

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

    // 창조 다중 선택 큐 확인 (벙 데 라므, 총살 등)
    if (creationQueueRef.current.length > 0) {
      const nextSelection = creationQueueRef.current.shift();
      if (!nextSelection) return;

      // 진행 상황 표시 (totalSelections가 있으면 사용, 없으면 기본값 3)
      const total = nextSelection.totalSelections || 3;
      const current = nextSelection.currentSelection || (total - creationQueueRef.current.length);
      addLog(`👻 창조 ${current}/${total}: 카드를 선택하세요.`);

      const nextBreachState: BreachSelection = {
        cards: nextSelection.cards,
        breachSp: nextSelection.insertSp,
        breachCard: {
          breachSpOffset: (nextSelection.breachCard as Card & { breachSpOffset?: number })?.breachSpOffset
        },
        isCreationSelection: true,
        isAoe: nextSelection.isAoe
      };
      breachSelectionRef.current = nextBreachState;
      setBreachSelection(nextBreachState);

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
      if ((battleRef.current.qIndex ?? 0) < (battleRef.current.queue?.length ?? 0)) {
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
