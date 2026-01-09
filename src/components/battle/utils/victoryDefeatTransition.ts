/**
 * @file victoryDefeatTransition.ts
 * @description 승리/패배 전환 시스템
 *
 * ## 승리 조건
 * - 적 HP 0 이하
 * - 에테르 버스트 승리 (onSoulBreak: 'death'인 경우만)
 *
 * ## 영혼파괴 효과
 * - death: 즉시 승리 (구울 등 영혼 의존 존재)
 * - stun: 1턴 기절 (인간형, 야수형)
 * - weaken: 2턴 쇠약 (변이체)
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
import { addToken } from '../../../lib/tokenUtils';

/**
 * 승리/패배 체크 및 페이즈 전환 처리
 */
export function processVictoryDefeatTransition({
  enemy,
  player,
  nextEnemyPtsSnapshot,
  checkVictoryCondition,
  actions,
  onVictory,
  addLog
}: {
  enemy: VictoryEnemy;
  player: VictoryPlayer;
  nextEnemyPtsSnapshot: number;
  checkVictoryCondition: (enemy: VictoryEnemy, pts: number) => VictoryCheckResult;
  actions: VictoryDefeatActions;
  onVictory?: () => void;
  addLog?: (message: string) => void;
}): VictoryDefeatProcessResult {
  // 승리 체크
  const victoryCheck = checkVictoryCondition(enemy, nextEnemyPtsSnapshot);

  // 영혼파괴 효과 적용 (stun/weaken - 승리가 아닌 경우)
  if (victoryCheck.shouldApplySoulBreak && !victoryCheck.isVictory) {
    actions.setSoulShatter(true);

    // 영혼파괴 상태 및 토큰 적용
    if (actions.setEnemy && enemy) {
      let updatedEnemy = { ...enemy, soulBroken: true };

      if (victoryCheck.soulBreakEffect === 'stun') {
        const tokenResult = addToken(updatedEnemy, 'soulStun', 1);
        updatedEnemy = { ...updatedEnemy, tokens: tokenResult.tokens };
        addLog?.(`💫 영혼파괴! ${enemy.name || '적'}이(가) 기절했습니다!`);
      } else if (victoryCheck.soulBreakEffect === 'weaken') {
        const tokenResult = addToken(updatedEnemy, 'soulWeaken', 2);
        updatedEnemy = { ...updatedEnemy, tokens: tokenResult.tokens };
        addLog?.(`👻 영혼파괴! ${enemy.name || '적'}이(가) 쇠약해졌습니다!`);
      }

      actions.setEnemy(updatedEnemy);
    }

    // 영혼파괴 이펙트 표시 후 전투 계속
    return { shouldReturn: false, isVictory: false, isDefeat: false };
  }

  // 승리 처리
  if (victoryCheck.isVictory) {
    if (victoryCheck.isEtherVictory) {
      actions.setSoulShatter(true);
      addLog?.(`💀 영혼파괴! ${enemy.name || '적'}이(가) 소멸했습니다!`);
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
