/**
 * @file enemy-units.ts
 * @description 다중 적 유닛 지원 유틸리티
 *
 * timeline-battle-engine.ts에서 분리된 다중 적 관리 함수들입니다.
 */

import type { EnemyState, EnemyUnit } from './game-types';

/**
 * 다중 적 유닛 초기화
 */
export function initializeEnemyUnits(enemy: EnemyState): void {
  if (!enemy.units || enemy.units.length === 0) {
    enemy.units = [{
      unitId: 0,
      id: enemy.id,
      name: enemy.name,
      hp: enemy.hp,
      maxHp: enemy.maxHp,
      block: enemy.block,
      tokens: { ...enemy.tokens },
      deck: [...enemy.deck],
      cardsPerTurn: enemy.cardsPerTurn,
      passives: enemy.passives,
    }];
  }
}

/**
 * 타겟 유닛 선택 (AI)
 */
export function selectTargetUnit(units: EnemyUnit[]): EnemyUnit | null {
  const aliveUnits = units.filter(u => u.hp > 0);
  if (aliveUnits.length === 0) return null;

  // 우선순위: 가장 체력이 낮은 유닛 (마무리 우선)
  aliveUnits.sort((a, b) => a.hp - b.hp);
  return aliveUnits[0];
}

/**
 * 유닛에 피해 분배
 */
export function distributeUnitDamage(
  units: EnemyUnit[],
  targetUnitId: number,
  damage: number
): { actualDamage: number; blocked: number; unitKilled: boolean } {
  const targetUnit = units.find(u => u.unitId === targetUnitId);
  if (!targetUnit || targetUnit.hp <= 0) {
    return { actualDamage: 0, blocked: 0, unitKilled: false };
  }

  // 방어력 처리
  const blocked = Math.min(targetUnit.block ?? 0, damage);
  const actualDamage = damage - blocked;
  targetUnit.block = (targetUnit.block ?? 0) - blocked;
  targetUnit.hp -= actualDamage;

  return {
    actualDamage,
    blocked,
    unitKilled: targetUnit.hp <= 0,
  };
}

/**
 * 유닛 총 체력 동기화
 */
export function syncEnemyTotalHp(enemy: EnemyState): void {
  if (!enemy.units) return;
  enemy.hp = enemy.units.reduce((sum, u) => sum + Math.max(0, u.hp), 0);
  enemy.maxHp = enemy.units.reduce((sum, u) => sum + u.maxHp, 0);
}

/**
 * 소환 체크 (50% HP 트리거)
 */
export function checkSummonTrigger(enemy: EnemyState): boolean {
  if (!enemy.passives?.summonOnHalfHp || enemy.hasSummoned) {
    return false;
  }

  const halfHp = enemy.maxHp / 2;
  if (enemy.hp <= halfHp && enemy.hp > 0) {
    return true;
  }

  return false;
}

/**
 * 탈영병 소환
 */
export function spawnDeserters(enemy: EnemyState, count: number = 2): EnemyUnit[] {
  initializeEnemyUnits(enemy);

  const maxUnitId = Math.max(...(enemy.units?.map(u => u.unitId) || [0]), 0);
  const newUnits: EnemyUnit[] = [];

  for (let i = 0; i < count; i++) {
    const deserter: EnemyUnit = {
      unitId: maxUnitId + 1 + i,
      id: 'deserter',
      name: '탈영병',
      hp: 15,
      maxHp: 15,
      block: 0,
      tokens: {},
      deck: ['enemy_slash', 'enemy_guard'],
      cardsPerTurn: 1,
      emoji: '🏃',
    };
    newUnits.push(deserter);
    enemy.units!.push(deserter);
  }

  enemy.hasSummoned = true;
  syncEnemyTotalHp(enemy);

  return newUnits;
}

/**
 * 살아있는 유닛 수
 */
export function getAliveUnitCount(enemy: EnemyState): number {
  if (!enemy.units) return enemy.hp > 0 ? 1 : 0;
  return enemy.units.filter(u => u.hp > 0).length;
}

/**
 * 범위 공격 피해 분배 (모든 유닛에게)
 */
export function distributeAoeDamage(
  enemy: EnemyState,
  damage: number
): { totalDamage: number; unitsHit: number } {
  if (!enemy.units) {
    const blocked = Math.min(enemy.block, damage);
    enemy.block -= blocked;
    enemy.hp -= (damage - blocked);
    return { totalDamage: damage - blocked, unitsHit: 1 };
  }

  let totalDamage = 0;
  let unitsHit = 0;

  for (const unit of enemy.units) {
    if (unit.hp <= 0) continue;

    const blocked = Math.min(unit.block ?? 0, damage);
    const actualDamage = damage - blocked;
    unit.block = (unit.block ?? 0) - blocked;
    unit.hp -= actualDamage;
    totalDamage += actualDamage;
    unitsHit++;
  }

  syncEnemyTotalHp(enemy);
  return { totalDamage, unitsHit };
}
