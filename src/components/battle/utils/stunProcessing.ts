/**
 * @file stunProcessing.ts
 * @description 기절(stun) 효과 처리 시스템
 *
 * ## 기절 효과
 * - 타임라인 범위 내 적 카드 취소
 * - 범위: STUN_RANGE (5)
 */

import type {
  StunAction,
  StunQueueItem,
  StunEvent,
  StunProcessingResult,
  StunProcessingParams
} from '../../../types';

/** 기절 효과 범위 (타임라인 기준) */
export const STUN_RANGE = 5;

/**
 * 기절 효과 처리
 * @param params - 파라미터
 * @returns { updatedQueue, stunEvent }
 */
export function processStunEffect({
  action,
  queue,
  currentQIndex,
  addLog
}: StunProcessingParams): StunProcessingResult {
  const centerSp = action.sp ?? 0;
  const stunnedActions: Array<{ item: OrderItem; idx: number }> = [];

  const targets = queue
    .map((item, idx) => ({ item, idx }))
    .filter(({ item, idx }) => {
      if (idx <= currentQIndex || !item) return false;
      const isOpponent = item.actor !== action.actor;
      const withinRange = typeof item.sp === 'number' && item.sp >= centerSp && item.sp <= centerSp + STUN_RANGE;
      return isOpponent && withinRange;
    });

  if (targets.length > 0) {
    stunnedActions.push(...targets);
  }

  const updatedQueue = targets.length > 0
    ? queue.filter((_, idx) => !targets.some(t => t.idx === idx))
    : queue;

  let stunEvent: StunEvent | null = null;
  if (stunnedActions.length > 0) {
    const stunnedNames = stunnedActions.map(t => t.item?.card?.name || '카드').join(', ');
    const msg = `😵 "${action.card.name}"의 기절! 상대 카드 ${stunnedActions.length}장 파괴 (범위: ${centerSp}~${centerSp + STUN_RANGE}${stunnedNames ? `, 대상: ${stunnedNames}` : ''})`;
    addLog(msg);
    stunEvent = { actor: action.actor, card: action.card.name || '', type: 'stun', msg };
  }

  return { updatedQueue, stunEvent };
}
