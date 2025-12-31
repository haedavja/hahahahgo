/**
 * @file useQueueRecovery.ts
 * @description 실행 큐 자동 복구 훅
 *
 * ## 주요 기능
 * - resolve 단계에서 큐가 비어있을 때 fixedOrder로부터 자동 복구
 */

import { useEffect } from 'react';
import { markCrossedCards } from '../utils/battleUtils';
import type { OrderItem } from '../../../types';
import type { BattlePhase } from '../reducer/battleReducerActions';

interface UseQueueRecoveryParams {
  phase: BattlePhase;
  queue: OrderItem[];
  fixedOrder: OrderItem[] | null | undefined;
  addLog: (msg: string) => void;
  actions: {
    setQueue: (queue: OrderItem[]) => void;
    setQIndex: (index: number) => void;
  };
}

/**
 * 실행 큐 자동 복구 훅
 */
export function useQueueRecovery(params: UseQueueRecoveryParams): void {
  const { phase, queue, fixedOrder, addLog, actions } = params;

  useEffect(() => {
    if (phase === 'resolve' && (!queue || queue.length === 0) && fixedOrder && fixedOrder.length > 0) {
      const rebuilt = fixedOrder.map(x => ({ actor: x.actor, card: x.card, sp: x.sp, originalIndex: x.originalIndex }));
      const markedRebuilt = markCrossedCards(rebuilt);
      actions.setQueue(markedRebuilt as OrderItem[]);
      actions.setQIndex(0);
      addLog('🧯 자동 복구: 실행 큐를 다시 생성했습니다');
    }
  }, [phase, queue, fixedOrder, addLog, actions]);
}
