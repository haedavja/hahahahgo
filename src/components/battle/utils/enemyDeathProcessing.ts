/**
 * @file enemyDeathProcessing.ts
 * @description 적 사망 처리 시스템
 *
 * ## 사망 처리
 * - 남은 적 행동 스킵
 * - 사망 애니메이션
 * - 에테르 계산 트리거
 */

import type { OrderItem } from '../../../types';
import type { PlaySoundFn } from '../../../types/hooks';
import { COMBAT_AUDIO } from '../../../core/effects';

interface ProcessEnemyDeathActions {
  setEnemyHit: (hit: boolean) => void;
  setTimelineIndicatorVisible: (visible: boolean) => void;
  setAutoProgress: (auto: boolean) => void;
  setDisabledCardIndices: (indices: number[]) => void;
  setQIndex: (index: number) => void;
  setEtherFinalValue: (value: number) => void;
}

interface ProcessEnemyDeathParams {
  newQIndex: number;
  queue: OrderItem[];
  queueLength: number;
  turnEtherAccumulated: number;
  playSound: PlaySoundFn;
  actions: ProcessEnemyDeathActions;
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
  playSound(COMBAT_AUDIO.DEATH.tone, COMBAT_AUDIO.DEATH.duration);

  actions.setTimelineIndicatorVisible(false);
  actions.setAutoProgress(false);

  const disabledIndices = queue.slice(newQIndex).map((_item, idx) => newQIndex + idx);
  actions.setDisabledCardIndices(disabledIndices);

  actions.setQIndex(queueLength);

  if (turnEtherAccumulated === 0) {
    actions.setEtherFinalValue(0);
  }
}
