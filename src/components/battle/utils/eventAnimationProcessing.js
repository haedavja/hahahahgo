/**
 * eventAnimationProcessing.js
 *
 * 액션 이벤트 애니메이션 및 사운드 처리 시스템
 */

/**
 * 액션 이벤트 처리: 애니메이션 및 사운드 재생
 * @param {Object} params - 파라미터
 * @param {Array} params.actionEvents - 처리할 액션 이벤트 목록
 * @param {Object} params.action - 현재 액션 (actor 정보 포함)
 * @param {Function} params.addLog - 로그 추가 함수
 * @param {Function} params.playHitSound - 피격 사운드 재생 함수
 * @param {Function} params.playBlockSound - 방어 사운드 재생 함수
 * @param {Object} params.actions - 상태 업데이트 함수 모음
 */
export function processActionEventAnimations({
  actionEvents,
  action,
  addLog,
  playHitSound,
  playBlockSound,
  actions
}) {
  actionEvents.forEach(ev => {
    addLog(ev.msg);

    // 피격 효과 (hit, pierce 타입)
    if ((ev.type === 'hit' || ev.type === 'pierce') && ev.dmg > 0) {
      playHitSound();
      if (ev.actor === 'player') {
        // 플레이어가 공격 -> 적 피격
        actions.setEnemyHit(true);
        setTimeout(() => actions.setEnemyHit(false), 300);
      } else {
        // 적이 공격 -> 플레이어 피격
        actions.setPlayerHit(true);
        setTimeout(() => actions.setPlayerHit(false), 300);
      }
    }

    // 방어 효과 (defense 타입)
    if (ev.type === 'defense') {
      playBlockSound();
      if (ev.actor === 'player') {
        actions.setPlayerBlockAnim(true);
        setTimeout(() => actions.setPlayerBlockAnim(false), 400);
      } else {
        actions.setEnemyBlockAnim(true);
        setTimeout(() => actions.setEnemyBlockAnim(false), 400);
      }
    }

    // 반격 피해
    if (ev.actor === 'counter') {
      playHitSound();
      // counter는 반대 방향으로 피해가 가므로 타겟을 반대로
      if (action.actor === 'player') {
        actions.setPlayerHit(true);
        setTimeout(() => actions.setPlayerHit(false), 300);
      } else {
        actions.setEnemyHit(true);
        setTimeout(() => actions.setEnemyHit(false), 300);
      }
    }
  });
}
