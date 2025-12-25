/**
 * @file enemyDeathProcessing.ts
 * @description 적 사망 처리 시스템
 *
 * ## 사망 처리
 * - 남은 적 행동 스킵
 * - 사망 애니메이션
 * - 에테르 계산 트리거
 */

interface QueueItem {
  [key: string]: unknown;
}

interface Actions {
  setEnemyHit: (value: boolean) => void;
  setTimelineIndicatorVisible: (value: boolean) => void;
  setAutoProgress: (value: boolean) => void;
  setDisabledCardIndices: (indices: number[]) => void;
  setQIndex: (index: number) => void;
  setEtherFinalValue: (value: number) => void;
}

interface ProcessEnemyDeathParams {
  newQIndex: number;
  queue: QueueItem[];
  queueLength: number;
  turnEtherAccumulated: number;
  playSound: (freq: number, duration: number) => void;
  actions: Actions;
}

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

  const disabledIndices = queue.slice(newQIndex).map((_, idx) => newQIndex + idx);
  actions.setDisabledCardIndices(disabledIndices);

  actions.setQIndex(queueLength);

  if (turnEtherAccumulated === 0) {
    actions.setEtherFinalValue(0);
  }
}
