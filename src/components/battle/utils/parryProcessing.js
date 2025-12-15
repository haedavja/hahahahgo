/**
 * parryProcessing.js
 *
 * 쳐내기(parry) 효과 처리 시스템
 * - 카드 발동 후 일정 범위 내에 적 공격이 있으면 트리거
 * - 트리거 시 타임라인의 모든 적 카드를 뒤로 밀어냄
 */

/**
 * 패리 효과 처리
 * @param {Object} params - 파라미터
 * @param {Object} params.action - 현재 액션 (card, sp, actor 포함)
 * @param {Array} params.queue - 액션 큐
 * @param {number} params.currentQIndex - 현재 큐 인덱스
 * @param {Function} params.addLog - 로그 추가 함수
 * @returns {Object} { updatedQueue, parryEvent }
 */
export function processParryEffect({ action, queue, currentQIndex, addLog }) {
  const card = action.card;
  const parryRange = card.parryRange ?? 5;
  const pushAmount = card.parryPushAmount ?? 3;
  const centerSp = action.sp ?? 0;

  // 범위 내 적 공격 카드가 있는지 확인
  const enemyAttacksInRange = queue
    .filter((item, idx) => {
      if (idx <= currentQIndex || !item) return false;
      const isOpponent = item.actor !== action.actor;
      const isAttack = item.card?.type === 'attack';
      const withinRange = typeof item.sp === 'number' && item.sp > centerSp && item.sp <= centerSp + parryRange;
      return isOpponent && isAttack && withinRange;
    });

  // 범위 내에 적 공격이 없으면 패리 발동 안 함
  if (enemyAttacksInRange.length === 0) {
    return { updatedQueue: queue, parryEvent: null };
  }

  // 패리 발동: 모든 적 카드의 sp를 pushAmount만큼 뒤로 밀기
  const updatedQueue = queue.map((item, idx) => {
    if (idx <= currentQIndex || !item) return item;
    if (item.actor !== action.actor) {
      return {
        ...item,
        sp: (item.sp ?? 0) + pushAmount
      };
    }
    return item;
  });

  // 밀린 후 sp 기준으로 재정렬 (현재 인덱스 이후만)
  const beforeCurrent = updatedQueue.slice(0, currentQIndex + 1);
  const afterCurrent = updatedQueue.slice(currentQIndex + 1);

  afterCurrent.sort((a, b) => {
    if ((a.sp ?? 0) !== (b.sp ?? 0)) return (a.sp ?? 0) - (b.sp ?? 0);
    return 0;
  });

  const finalQueue = [...beforeCurrent, ...afterCurrent];

  // 로그 및 이벤트 생성
  const triggerCardNames = enemyAttacksInRange.map(a => a.card?.name || '카드').join(', ');
  const msg = `🛡️ "${card.name}" 패리 성공! (트리거: ${triggerCardNames}) 모든 적 카드가 타임라인에서 ${pushAmount} 뒤로 밀림`;
  addLog(msg);

  const parryEvent = {
    actor: action.actor,
    card: card.name,
    type: 'parry',
    pushAmount,
    triggeredBy: triggerCardNames,
    msg
  };

  return { updatedQueue: finalQueue, parryEvent };
}
