/**
 * @file victoryDefeatTransition.js
 * @description 승리/패배 전환 시스템
 *
 * ## 승리 조건
 * - 적 HP 0 이하
 * - 에테르 버스트 승리
 *
 * ## 패배 조건
 * - 플레이어 HP 0 이하
 */

/**
 * 승리/패배 체크 및 페이즈 전환 처리
 * @param {Object} params - 파라미터
 * @param {Object} params.enemy - 적 상태
 * @param {Object} params.player - 플레이어 상태
 * @param {number} params.nextEnemyPtsSnapshot - 다음 턴 적 에테르 PT
 * @param {Function} params.checkVictoryCondition - 승리 조건 체크 함수
 * @param {Object} params.actions - 상태 업데이트 함수 모음
 * @param {Function} params.onVictory - 승리 시 호출할 콜백 (카드 보상 모달 등)
 * @returns {Object} { shouldReturn, isVictory, isDefeat }
 */
export function processVictoryDefeatTransition({
  enemy,
  player,
  nextEnemyPtsSnapshot,
  checkVictoryCondition,
  actions,
  onVictory
}) {
  // 승리 체크
  const victoryCheck = checkVictoryCondition(enemy, nextEnemyPtsSnapshot);
  if (victoryCheck.isVictory) {
    if (victoryCheck.isEtherVictory) {
      actions.setSoulShatter(true);
    }
    actions.setNetEtherDelta(null);
    setTimeout(() => {
      // onVictory 콜백이 있으면 호출 (카드 보상 모달 표시)
      if (onVictory) {
        onVictory();
      } else {
        actions.setPostCombatOptions({ type: 'victory' });
        actions.setPhase('post');
      }
    }, victoryCheck.delay);
    return { shouldReturn: true, isVictory: true, isDefeat: false };
  }

  // 패배 체크
  if (player.hp <= 0) {
    actions.setNetEtherDelta(null);
    setTimeout(() => {
      actions.setPostCombatOptions({ type: 'defeat' });
      actions.setPhase('post');
    }, 500);
    return { shouldReturn: true, isVictory: false, isDefeat: true };
  }

  return { shouldReturn: false, isVictory: false, isDefeat: false };
}
