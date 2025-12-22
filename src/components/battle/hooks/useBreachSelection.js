import { useCallback, useState, useRef } from 'react';

/**
 * 브리치/창조 카드 선택 훅
 * handleBreachSelect, breachSelection 상태 관리
 */
export function useBreachSelection({
  CARDS,
  battleRef,
  stepOnceRef,
  addLog,
  actions
}) {
  const [breachSelection, setBreachSelection] = useState(null);
  const breachSelectionRef = useRef(null);
  const creationQueueRef = useRef([]);

  const handleBreachSelect = useCallback((selectedCard, idx) => {
    const breach = breachSelectionRef.current;
    if (!breach) return;

    const insertSp = breach.breachSp + (breach.breachCard?.breachSpOffset || 3);

    addLog(`👻 "${selectedCard.name}" 선택! 타임라인 ${insertSp}에 유령카드로 삽입.`);

    // 유령카드 생성
    const originalCard = CARDS.find(c => c.id === selectedCard.id) || selectedCard;
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
      isAoe: breach.isAoe || false,
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
      const nextSelection = creationQueueRef.current.shift();
      const remainingCount = creationQueueRef.current.length;

      addLog(`👻 창조 ${3 - remainingCount}/3: 카드를 선택하세요.`);

      const nextBreachState = {
        cards: nextSelection.cards,
        breachSp: nextSelection.insertSp,
        breachCard: nextSelection.breachCard,
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
