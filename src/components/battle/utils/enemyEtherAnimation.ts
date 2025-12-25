/**
 * @file enemyEtherAnimation.ts
 * @description 적 에테르 계산 애니메이션
 *
 * ## 적 에테르 표시
 * - 합계/배율/최종값 순서
 * - 디플레이션 표시
 */

type EtherCalcPhase = 'sum' | 'multiply' | 'deflation' | 'result';

interface DeflationInfo {
  multiplier: number;
  usageCount: number;
}

interface EnemyEther {
  deflation: DeflationInfo;
}

interface Actions {
  setEnemyEtherCalcPhase: (phase: EtherCalcPhase) => void;
  setEnemyCurrentDeflation: (deflation: DeflationInfo | null) => void;
}

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
