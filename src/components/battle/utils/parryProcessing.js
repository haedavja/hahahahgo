/**
 * parryProcessing.js
 *
 * 쳐내기(parry) 효과 처리 시스템
 * - 쳐내기 발동 시 "패리 대기" 상태 설정
 * - 범위 내에서 적 공격 카드가 실제로 발동될 때 트리거
 * - 트리거 시 타임라인의 모든 적 카드를 뒤로 밀어냄
 */

/**
 * 쳐내기 카드 발동 시 패리 대기 상태 설정
 * @param {Object} params - 파라미터
 * @param {Object} params.action - 현재 액션 (card, sp, actor 포함)
 * @param {Function} params.addLog - 로그 추가 함수
 * @returns {Object} parryReadyState - 패리 대기 상태 객체
 */
export function setupParryReady({ action, addLog }) {
  const card = action.card;
  const parryRange = card.parryRange ?? 5;
  const pushAmount = card.parryPushAmount ?? 3;
  const centerSp = action.sp ?? 0;

  addLog(`🛡️ "${card.name}" 패리 대기! (범위: ${centerSp}~${centerSp + parryRange})`);

  return {
    active: true,
    actor: action.actor,
    cardName: card.name,
    centerSp,
    maxSp: centerSp + parryRange,
    pushAmount,
    triggered: false
  };
}

/**
 * 적 카드 발동 시 패리 트리거 체크
 * @param {Object} params - 파라미터
 * @param {Object} params.parryReadyState - 패리 대기 상태
 * @param {Object} params.enemyAction - 적 액션 (card, sp, actor 포함)
 * @param {Array} params.queue - 액션 큐
 * @param {number} params.currentQIndex - 현재 큐 인덱스
 * @param {Function} params.addLog - 로그 추가 함수
 * @param {Function} params.playParrySound - 패리 사운드 재생 함수
 * @returns {Object} { updatedQueue, parryEvent, updatedParryState }
 */
export function checkParryTrigger({ parryReadyState, enemyAction, queue, currentQIndex, addLog, playParrySound }) {
  // 패리 대기 상태가 없거나 이미 트리거됐으면 스킵
  if (!parryReadyState?.active || parryReadyState.triggered) {
    return { updatedQueue: queue, parryEvent: null, updatedParryState: parryReadyState };
  }

  // 적 공격이 아니면 스킵
  if (enemyAction.card?.type !== 'attack') {
    return { updatedQueue: queue, parryEvent: null, updatedParryState: parryReadyState };
  }

  // 같은 편이면 스킵 (플레이어 패리는 적 공격에만 반응)
  if (enemyAction.actor === parryReadyState.actor) {
    return { updatedQueue: queue, parryEvent: null, updatedParryState: parryReadyState };
  }

  const enemySp = enemyAction.sp ?? 0;

  // 범위 체크: centerSp < enemySp <= maxSp
  if (enemySp <= parryReadyState.centerSp || enemySp > parryReadyState.maxSp) {
    return { updatedQueue: queue, parryEvent: null, updatedParryState: parryReadyState };
  }

  // 패리 트리거! 사운드 재생
  if (playParrySound) {
    playParrySound();
  }

  const pushAmount = parryReadyState.pushAmount;

  // 모든 적 카드의 sp를 pushAmount만큼 뒤로 밀기 (현재 발동 중인 카드 제외)
  const updatedQueue = queue.map((item, idx) => {
    if (idx <= currentQIndex || !item) return item;
    if (item.actor !== parryReadyState.actor) {
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
  const msg = `🛡️✨ "${parryReadyState.cardName}" 패리 성공! "${enemyAction.card?.name}" 쳐냄! 모든 적 카드 +${pushAmount} 밀림`;
  addLog(msg);

  const parryEvent = {
    actor: parryReadyState.actor,
    card: parryReadyState.cardName,
    type: 'parry',
    pushAmount,
    triggeredBy: enemyAction.card?.name,
    msg
  };

  // 패리 상태 업데이트 (한 번만 발동)
  const updatedParryState = {
    ...parryReadyState,
    triggered: true,
    active: false
  };

  return { updatedQueue: finalQueue, parryEvent, updatedParryState };
}

/**
 * 턴 종료 시 패리 상태 초기화
 * @returns {null}
 */
export function resetParryState() {
  return null;
}
