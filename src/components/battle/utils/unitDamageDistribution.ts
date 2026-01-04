/**
 * @file unitDamageDistribution.ts
 * @description 다중 유닛 데미지 분배 처리 유틸리티
 */

import type { Card, EnemyUnitState } from '../../../types/core';
import { hasSpecial } from './cardSpecialEffects';

// EnemyUnitState 재사용
export type EnemyUnit = EnemyUnitState;

export interface DamageDistributionResult {
  updatedUnits: EnemyUnit[];
  newTotalHp: number;
  logs: string[];
}

interface DistributeDamageParams {
  card: Card & { __targetUnitId?: number; __targetUnitIds?: number[]; isAoe?: boolean; damage?: number };
  enemyUnits: EnemyUnit[];
  damageDealt: number;
  selectedTargetUnit: number;
}

/**
 * 범위 피해 분배 (모든 생존 유닛에 동일 피해)
 */
function distributeAoeDamage(
  enemyUnits: EnemyUnit[],
  damageDealt: number
): DamageDistributionResult {
  let updatedUnits = [...enemyUnits];
  const logs: string[] = [];
  const damageLogParts: string[] = [];

  if (damageDealt > 0) {
    const aliveUnits = updatedUnits.filter(u => u.hp > 0);

    for (const targetUnit of aliveUnits) {
      const unitBlock = targetUnit.block || 0;
      const blockedDamage = Math.min(unitBlock, damageDealt);
      const actualDamage = damageDealt - blockedDamage;
      const newBlock = unitBlock - blockedDamage;
      const newHp = Math.max(0, targetUnit.hp - actualDamage);

      updatedUnits = updatedUnits.map(u => {
        if (u.unitId === targetUnit.unitId) {
          return { ...u, hp: newHp, block: newBlock };
        }
        return u;
      });

      if (blockedDamage > 0) {
        damageLogParts.push(`${targetUnit.name}: ${actualDamage} (방어 ${blockedDamage})`);
      } else {
        damageLogParts.push(`${targetUnit.name}: ${actualDamage}`);
      }
    }

    if (damageLogParts.length > 0) {
      logs.push(`🌀 범위 피해: ${damageLogParts.join(', ')}`);
    }
  }

  const newTotalHp = updatedUnits.reduce((sum, u) => sum + Math.max(0, u.hp), 0);

  return { updatedUnits, newTotalHp, logs };
}

/**
 * 다중 타겟 피해 분배 (선택된 유닛들에 카드 피해 적용)
 */
function distributeMultiTargetDamage(
  enemyUnits: EnemyUnit[],
  targetUnitIds: number[],
  baseDamage: number
): DamageDistributionResult {
  let updatedUnits = [...enemyUnits];
  const logs: string[] = [];
  const damageLogParts: string[] = [];

  for (const unitId of targetUnitIds) {
    const targetUnit = updatedUnits.find(u => u.unitId === unitId && u.hp > 0);
    if (!targetUnit) continue;

    const unitBlock = targetUnit.block || 0;
    const blockedDamage = Math.min(unitBlock, baseDamage);
    const actualDamage = baseDamage - blockedDamage;
    const newBlock = unitBlock - blockedDamage;
    const newHp = Math.max(0, targetUnit.hp - actualDamage);

    updatedUnits = updatedUnits.map(u => {
      if (u.unitId === unitId) {
        return { ...u, hp: newHp, block: newBlock };
      }
      return u;
    });

    if (blockedDamage > 0) {
      damageLogParts.push(`${targetUnit.name}: 공격력 ${baseDamage} - 방어력 ${blockedDamage} = ${actualDamage}`);
    } else {
      damageLogParts.push(`${targetUnit.name}: ${actualDamage}`);
    }
  }

  if (damageLogParts.length > 0) {
    logs.push(`⚔️ 다중 타겟: ${damageLogParts.join(', ')}`);
  }

  const newTotalHp = updatedUnits.reduce((sum, u) => sum + Math.max(0, u.hp), 0);

  return { updatedUnits, newTotalHp, logs };
}

/**
 * 단일 타겟 피해 분배 (지정된 유닛에만 피해)
 */
function distributeSingleTargetDamage(
  enemyUnits: EnemyUnit[],
  cardTargetUnitId: number,
  damageDealt: number
): DamageDistributionResult {
  let updatedUnits = [...enemyUnits];
  const logs: string[] = [];

  if (damageDealt > 0) {
    const aliveUnits = enemyUnits.filter(u => u.hp > 0);
    let targetUnit = aliveUnits.find(u => u.unitId === cardTargetUnitId);
    if (!targetUnit && aliveUnits.length > 0) {
      targetUnit = aliveUnits[0];
    }

    if (targetUnit) {
      const newUnitHp = Math.max(0, targetUnit.hp - damageDealt);

      updatedUnits = enemyUnits.map(u => {
        if (u.unitId === targetUnit!.unitId) {
          return { ...u, hp: newUnitHp };
        }
        return u;
      });
    }
  }

  const newTotalHp = updatedUnits.reduce((sum, u) => sum + Math.max(0, u.hp), 0);

  return { updatedUnits, newTotalHp, logs };
}

/**
 * 다중 유닛 데미지 분배 메인 함수
 * 카드 유형에 따라 적절한 피해 분배 방식 선택
 */
export function distributeUnitDamage(params: DistributeDamageParams): DamageDistributionResult | null {
  const { card, enemyUnits, damageDealt, selectedTargetUnit } = params;

  // 유닛이 없거나 공격 카드가 아니면 처리하지 않음
  if (!enemyUnits || enemyUnits.length === 0) {
    return null;
  }

  // AOE 공격 체크: aoeAttack special 또는 isAoe 플래그
  const isAoeAttack = hasSpecial(card, 'aoeAttack') || card.isAoe === true;

  if (isAoeAttack) {
    return distributeAoeDamage(enemyUnits, damageDealt);
  }

  const targetUnitIds = card.__targetUnitIds;
  if (Array.isArray(targetUnitIds) && targetUnitIds.length > 0) {
    const baseDamage = Number(card.damage) || 0;
    return distributeMultiTargetDamage(enemyUnits, targetUnitIds, baseDamage);
  }

  // 단일 타겟 모드
  const cardTargetUnitId = card.__targetUnitId ?? selectedTargetUnit ?? 0;
  return distributeSingleTargetDamage(enemyUnits, cardTargetUnitId, damageDealt);
}
