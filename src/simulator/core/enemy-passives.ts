/**
 * @file enemy-passives.ts
 * @description 적 패시브 효과 시스템
 *
 * 적 유닛의 패시브 효과를 처리합니다:
 * - veilAtStart: 전투 시작 시 장막
 * - healPerTurn: 매턴 체력 회복
 * - strengthPerTurn: 매턴 힘 증가
 * - critBoostAtStart: 전투 시작 시 치명타율 증가
 * - summonOnHalfHp: 50% HP에서 소환
 * - counterOnHit: 피격시 반격
 * - reflectDamage: 피해 반사
 */

import type {
  GameBattleState,
  EnemyState,
  EnemyUnit,
  GameEnemyPassives,
} from './game-types';
import { addToken, hasToken } from './token-system';
import { spawnDeserters, syncEnemyTotalHp } from './timeline-battle-engine';

// ==================== 패시브 효과 결과 ====================

export interface PassiveEffectResult {
  triggered: boolean;
  effects: string[];
  healAmount?: number;
  strengthGained?: number;
  damageReflected?: number;
  tokensApplied?: { id: string; stacks: number }[];
}

// ==================== 전투 시작 패시브 ====================

/**
 * 전투 시작 시 적 패시브 처리
 */
export function processEnemyBattleStartPassives(
  state: GameBattleState
): PassiveEffectResult[] {
  const results: PassiveEffectResult[] = [];
  const passives = state.enemy.passives;

  if (!passives) return results;

  // veilAtStart: 장막 부여
  if (passives.veilAtStart) {
    state.enemy.tokens = addToken(state.enemy.tokens, 'veil', 1);
    results.push({
      triggered: true,
      effects: ['장막 부여 - 플레이어 통찰 차단'],
      tokensApplied: [{ id: 'veil', stacks: 1 }],
    });

    // 플레이어 통찰 감소
    if (state.player.insight > -3) {
      state.player.insight = Math.max(-3, state.player.insight - 3);
    }
  }

  // critBoostAtStart: 치명타율 증가
  if (passives.critBoostAtStart && passives.critBoostAtStart > 0) {
    state.enemy.tokens = addToken(state.enemy.tokens, 'crit_boost', passives.critBoostAtStart);
    results.push({
      triggered: true,
      effects: [`치명타율 +${passives.critBoostAtStart}%`],
      tokensApplied: [{ id: 'crit_boost', stacks: passives.critBoostAtStart }],
    });
  }

  // 다중 유닛 패시브 처리
  if (state.enemy.units) {
    for (const unit of state.enemy.units) {
      const unitPassives = unit.passives;
      if (!unitPassives) continue;

      if (unitPassives.veilAtStart) {
        unit.tokens = addToken(unit.tokens ?? {}, 'veil', 1);
      }

      if (unitPassives.critBoostAtStart && unitPassives.critBoostAtStart > 0) {
        unit.tokens = addToken(unit.tokens ?? {}, 'crit_boost', unitPassives.critBoostAtStart);
      }
    }
  }

  return results;
}

// ==================== 턴 시작 패시브 ====================

/**
 * 턴 시작 시 적 패시브 처리
 */
export function processEnemyTurnStartPassives(
  state: GameBattleState
): PassiveEffectResult[] {
  const results: PassiveEffectResult[] = [];
  const passives = state.enemy.passives;

  if (!passives) return results;

  // healPerTurn: 매턴 체력 회복
  if (passives.healPerTurn && passives.healPerTurn > 0) {
    const healAmount = passives.healPerTurn;
    state.enemy.hp = Math.min(state.enemy.maxHp, state.enemy.hp + healAmount);
    results.push({
      triggered: true,
      effects: [`${healAmount} 체력 회복`],
      healAmount,
    });
  }

  // strengthPerTurn: 매턴 힘 증가
  if (passives.strengthPerTurn && passives.strengthPerTurn > 0) {
    const strengthAmount = passives.strengthPerTurn;
    state.enemy.tokens = addToken(state.enemy.tokens, 'strength', strengthAmount);
    results.push({
      triggered: true,
      effects: [`힘 +${strengthAmount}`],
      strengthGained: strengthAmount,
      tokensApplied: [{ id: 'strength', stacks: strengthAmount }],
    });
  }

  // 다중 유닛 패시브 처리
  if (state.enemy.units) {
    for (const unit of state.enemy.units) {
      if (unit.hp <= 0) continue;

      const unitPassives = unit.passives;
      if (!unitPassives) continue;

      // healPerTurn
      if (unitPassives.healPerTurn && unitPassives.healPerTurn > 0) {
        const healAmount = unitPassives.healPerTurn;
        unit.hp = Math.min(unit.maxHp, unit.hp + healAmount);
        results.push({
          triggered: true,
          effects: [`${unit.name}: ${healAmount} 체력 회복`],
          healAmount,
        });
      }

      // strengthPerTurn
      if (unitPassives.strengthPerTurn && unitPassives.strengthPerTurn > 0) {
        const strengthAmount = unitPassives.strengthPerTurn;
        unit.tokens = addToken(unit.tokens ?? {}, 'strength', strengthAmount);
        results.push({
          triggered: true,
          effects: [`${unit.name}: 힘 +${strengthAmount}`],
          strengthGained: strengthAmount,
        });
      }
    }

    // 유닛 체력 동기화
    syncEnemyTotalHp(state.enemy);
  }

  return results;
}

// ==================== 피해 관련 패시브 ====================

/**
 * 피해 시 적 패시브 처리 (반격, 반사)
 */
export function processEnemyDamagePassives(
  state: GameBattleState,
  damage: number,
  targetUnitId?: number
): PassiveEffectResult[] {
  const results: PassiveEffectResult[] = [];

  // 타겟 유닛 찾기
  let targetPassives: GameEnemyPassives | undefined;

  if (state.enemy.units && targetUnitId !== undefined) {
    const targetUnit = state.enemy.units.find(u => u.unitId === targetUnitId);
    if (targetUnit) {
      targetPassives = targetUnit.passives;
    }
  } else {
    targetPassives = state.enemy.passives;
  }

  if (!targetPassives) return results;

  // counterOnHit: 피격시 반격
  if (targetPassives.counterOnHit) {
    const counterDamage = 5; // 기본 반격 피해
    state.player.hp -= counterDamage;
    results.push({
      triggered: true,
      effects: [`반격! 플레이어에게 ${counterDamage} 피해`],
    });
  }

  // reflectDamage: 피해 반사
  if (targetPassives.reflectDamage && targetPassives.reflectDamage > 0) {
    const reflectedDamage = Math.floor(damage * targetPassives.reflectDamage);
    state.player.hp -= reflectedDamage;
    results.push({
      triggered: true,
      effects: [`피해 ${reflectedDamage} 반사`],
      damageReflected: reflectedDamage,
    });
  }

  return results;
}

// ==================== 소환 패시브 ====================

/**
 * 50% HP 소환 패시브 체크 및 처리
 */
export function checkAndProcessSummonPassive(
  state: GameBattleState
): PassiveEffectResult {
  const passives = state.enemy.passives;

  if (!passives?.summonOnHalfHp || state.enemy.hasSummoned) {
    return { triggered: false, effects: [] };
  }

  const halfHp = state.enemy.maxHp / 2;
  if (state.enemy.hp <= halfHp && state.enemy.hp > 0) {
    // 탈영병 소환
    const newUnits = spawnDeserters(state.enemy, 2);
    state.enemy.hasSummoned = true;

    return {
      triggered: true,
      effects: [`${state.enemy.name}: 부하 소환! 탈영병 ${newUnits.length}기 등장!`],
    };
  }

  return { triggered: false, effects: [] };
}

// ==================== 유닛별 소환 패시브 ====================

/**
 * 유닛별 50% HP 소환 패시브 체크
 */
export function checkUnitSummonPassives(
  state: GameBattleState
): PassiveEffectResult[] {
  const results: PassiveEffectResult[] = [];

  if (!state.enemy.units) return results;

  for (const unit of state.enemy.units) {
    if (unit.hp <= 0 || unit.hasSummoned) continue;

    const unitPassives = unit.passives;
    if (!unitPassives?.summonOnHalfHp) continue;

    const halfHp = unit.maxHp / 2;
    if (unit.hp <= halfHp && unit.hp > 0) {
      // 탈영병 소환
      const newUnits = spawnDeserters(state.enemy, 2);
      unit.hasSummoned = true;

      results.push({
        triggered: true,
        effects: [`${unit.name}: 부하 소환! 탈영병 ${newUnits.length}기 등장!`],
      });
    }
  }

  return results;
}

// ==================== 장막 효과 ====================

/**
 * 장막 효과 확인 (통찰 차단)
 */
export function hasVeilEffect(state: GameBattleState): boolean {
  // 적이 장막을 가지고 있으면
  if (hasToken(state.enemy.tokens, 'veil')) {
    return true;
  }

  // 유닛 중 장막을 가진 유닛이 있으면
  if (state.enemy.units) {
    for (const unit of state.enemy.units) {
      if (unit.hp > 0 && hasToken(unit.tokens ?? {}, 'veil')) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 장막으로 인한 통찰 제한 적용
 */
export function applyVeilInsightReduction(state: GameBattleState): void {
  if (hasVeilEffect(state)) {
    // 통찰을 최대 -3까지 제한
    state.player.insight = Math.min(state.player.insight, 0);
  }
}

// ==================== 패시브 요약 ====================

/**
 * 적 패시브 목록 조회
 */
export function getEnemyPassivesSummary(enemy: EnemyState): string[] {
  const summary: string[] = [];
  const passives = enemy.passives;

  if (!passives) return summary;

  if (passives.veilAtStart) {
    summary.push('전투 시작 시 장막');
  }
  if (passives.healPerTurn) {
    summary.push(`매턴 ${passives.healPerTurn} 회복`);
  }
  if (passives.strengthPerTurn) {
    summary.push(`매턴 힘 +${passives.strengthPerTurn}`);
  }
  if (passives.critBoostAtStart) {
    summary.push(`시작 치명타율 +${passives.critBoostAtStart}%`);
  }
  if (passives.summonOnHalfHp) {
    summary.push('50% HP에서 소환');
  }
  if (passives.counterOnHit) {
    summary.push('피격시 반격');
  }
  if (passives.reflectDamage) {
    summary.push(`${passives.reflectDamage * 100}% 피해 반사`);
  }

  return summary;
}
