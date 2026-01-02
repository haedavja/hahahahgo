/**
 * @file enemyEtherAnimation.ts
 * @description 적 에테르 계산 애니메이션
 *
 * ## 적 에테르 표시
 * - 합계/배율/최종값 순서
 * - 디플레이션 표시
 */

import type {
  AnimEtherCalcPhase as EtherCalcPhase,
  DeflationInfo,
  EnemyEtherState as EnemyEther,
  EnemyEtherAnimActions as Actions
} from '../../../types';

/**
 * 적 에테르 계산 애니메이션 시작
 */
export function startEnemyEtherAnimation({
  enemyFinalEther,
  enemyEther,
  actions
}: {
  enemyFinalEther: number;
  enemyEther: EnemyEther;
  actions: Actions;
}): void {
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
