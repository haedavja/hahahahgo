/**
 * @file stunProcessing.js
 * @description 기절(stun) 효과 처리 시스템
 *
 * ## 기절 효과
 * - 타임라인 범위 내 적 카드 취소
 * - 범위: STUN_RANGE (5)
 */

export const STUN_RANGE = 5; // 기절 효과 범위(타임라인 기준)

/**
 * 기절 효과 처리
 * @param {Object} params - 파라미터
 * @param {Object} params.action - 현재 액션 (card, sp, actor 포함)
 * @param {Array} params.queue - 액션 큐
 * @param {number} params.currentQIndex - 현재 큐 인덱스
 * @param {Function} params.addLog - 로그 추가 함수
 * @returns {Object} { updatedQueue, stunEvent }
 */
export function processStunEffect({ action, queue, currentQIndex, addLog }) {
  const centerSp = action.sp ?? 0;
  const stunnedActions = [];

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

  let stunEvent = null;
  if (stunnedActions.length > 0) {
    const stunnedNames = stunnedActions.map(t => t.item?.card?.name || '카드').join(', ');
    const msg = `😵 "${action.card.name}"의 기절! 상대 카드 ${stunnedActions.length}장 파괴 (범위: ${centerSp}~${centerSp + STUN_RANGE}${stunnedNames ? `, 대상: ${stunnedNames}` : ''})`;
    addLog(msg);
    stunEvent = { actor: action.actor, card: action.card.name, type: 'stun', msg };
  }

  return { updatedQueue, stunEvent };
}
