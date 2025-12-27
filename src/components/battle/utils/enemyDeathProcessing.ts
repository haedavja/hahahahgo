/**
 * @file enemyDeathProcessing.ts
 * @description 적 사망 처리 시스템
 *
 * ## 사망 처리
 * - 남은 적 행동 스킵
 * - 사망 애니메이션
 * - 에테르 계산 트리거
 */

type ProcessEnemyDeathParams = any;

/**
 * 적 사망 처리
 */
export function processEnemyDeath({
  newQIndex,
  queue,
  queueLength,
  turnEtherAccumulated,
  playSound,
  actions
}: ProcessEnemyDeathParams): void {
  actions.setEnemyHit(true);
  playSound(200, 500);

  actions.setTimelineIndicatorVisible(false);
  actions.setAutoProgress(false);

  const disabledIndices = queue.slice(newQIndex).map((_: any, idx: any) => newQIndex + idx);
  actions.setDisabledCardIndices(disabledIndices);

  actions.setQIndex(queueLength);

  if (turnEtherAccumulated === 0) {
    actions.setEtherFinalValue(0);
  }
}
