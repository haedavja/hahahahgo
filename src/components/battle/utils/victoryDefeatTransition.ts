/**
 * @file victoryDefeatTransition.ts
 * @description 승리/패배 전환 시스템
 *
 * ## 승리 조건
 * - 적 HP 0 이하
 * - 에테르 버스트 승리
 *
 * ## 패배 조건
 * - 플레이어 HP 0 이하
 */

import type {
  VictoryEnemy,
  VictoryPlayer,
  VictoryCheckResult,
  VictoryDefeatActions,
  VictoryDefeatProcessResult
} from '../../../types';

/**
 * 승리/패배 체크 및 페이즈 전환 처리
 */
export function processVictoryDefeatTransition({
  enemy,
  player,
  nextEnemyPtsSnapshot,
  checkVictoryCondition,
  actions,
  onVictory
}: {
  enemy: VictoryEnemy;
  player: VictoryPlayer;
  nextEnemyPtsSnapshot: number;
  checkVictoryCondition: (enemy: VictoryEnemy, pts: number) => VictoryCheckResult;
  actions: VictoryDefeatActions;
  onVictory?: () => void;
}): VictoryDefeatProcessResult {
  // 승리 체크
  const victoryCheck = checkVictoryCondition(enemy, nextEnemyPtsSnapshot);
  if (victoryCheck.isVictory) {
    if (victoryCheck.isEtherVictory) {
      actions.setSoulShatter(true);
    }
    actions.setNetEtherDelta(null);
    setTimeout(() => {
      if (onVictory) {
        onVictory();
      } else {
        actions.setPostCombatOptions({ type: 'victory', isEtherVictory: victoryCheck.isEtherVictory });
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
