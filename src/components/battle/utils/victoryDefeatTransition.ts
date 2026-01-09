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
import { applyDeathEffects } from '../../../lib/relicEffects';

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
  addLog,
  relics,
  usedRevives,
  setUsedRevives,
  setPlayer
}: {
  enemy: VictoryEnemy;
  player: VictoryPlayer;
  nextEnemyPtsSnapshot: number;
  checkVictoryCondition: (enemy: VictoryEnemy, pts: number) => VictoryCheckResult;
  actions: VictoryDefeatActions;
  onVictory?: () => void;
  addLog?: (message: string) => void;
  relics?: string[];
  usedRevives?: number;
  setUsedRevives?: (count: number) => void;
  setPlayer?: (player: VictoryPlayer) => void;
}): VictoryDefeatProcessResult {
  // 승리 체크
  const victoryCheck = checkVictoryCondition(enemy, nextEnemyPtsSnapshot);

  // 영혼파괴 효과 적용 (stun/weaken - 승리가 아닌 경우)
  if (victoryCheck.shouldApplySoulBreak && !victoryCheck.isVictory) {
    actions.setSoulShatter(true);

    // 영혼파괴 상태 및 토큰 적용
    if (actions.setEnemy && enemy) {
      // 에테르를 0으로 리셋 (영혼파괴 트리거됨)
      let updatedEnemy = { ...enemy, soulBroken: true, etherPts: 0 };

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

    // 영혼파괴 이펙트 1.2초 후 해제
    setTimeout(() => {
      actions.setSoulShatter(false);
    }, 1200);

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
    // ON_DEATH 상징 효과 처리 (불사조의깃털)
    if (relics && relics.length > 0 && setPlayer && setUsedRevives !== undefined) {
      const deathEffects = applyDeathEffects(relics, usedRevives || 0);
      if (deathEffects.revive) {
        // 부활 처리
        const maxHp = player.maxHp || 100;
        const reviveHp = Math.ceil(maxHp * deathEffects.reviveHpPercent);
        const revivedPlayer = { ...player, hp: reviveHp };
        setPlayer(revivedPlayer);
        if (setUsedRevives) {
          setUsedRevives((usedRevives || 0) + 1);
        }
        addLog?.(`🔥 불사조의깃털: 부활! 체력 ${reviveHp}로 회복`);
        // 부활했으므로 전투 계속
        return { shouldReturn: false, isVictory: false, isDefeat: false };
      }
    }

    actions.setNetEtherDelta(null);
    setTimeout(() => {
      actions.setPostCombatOptions({ type: 'defeat' });
      actions.setPhase('post');
    }, 500);
    return { shouldReturn: true, isVictory: false, isDefeat: true };
  }

  return { shouldReturn: false, isVictory: false, isDefeat: false };
}
