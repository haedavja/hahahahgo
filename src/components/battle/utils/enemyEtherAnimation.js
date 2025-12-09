/**
 * enemyEtherAnimation.js
 *
 * 적 에테르 계산 애니메이션 시스템
 */

/**
 * 적 에테르 계산 애니메이션 시작
 * @param {Object} params - 파라미터
 * @param {number} params.enemyFinalEther - 적 최종 에테르
 * @param {Object} params.enemyEther - 적 에테르 계산 결과
 * @param {Function} params.actions - 상태 업데이트 함수 모음
 */
export function startEnemyEtherAnimation({ enemyFinalEther, enemyEther, actions }) {
  if (enemyFinalEther <= 0) return;

  actions.setEnemyEtherCalcPhase('sum');

  setTimeout(() => {
    actions.setEnemyEtherCalcPhase('multiply');
  }, 50);

  setTimeout(() => {
    actions.setEnemyEtherCalcPhase('deflation');
    actions.setEnemyCurrentDeflation(
      enemyEther.deflation.usageCount > 0
        ? {
            multiplier: enemyEther.deflation.multiplier,
            usageCount: enemyEther.deflation.usageCount
          }
        : null
    );
  }, 150);

  setTimeout(() => {
    actions.setEnemyEtherCalcPhase('result');
  }, 300);
}
