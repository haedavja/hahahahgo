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
 * 최적화: O(n²) map 루프 → O(n) 인덱스 기반 업데이트
 */
function distributeAoeDamage(
  enemyUnits: EnemyUnit[],
  damageDealt: number
): DamageDistributionResult {
  const updatedUnits = [...enemyUnits];
  const logs: string[] = [];
  const damageLogParts: string[] = [];

  if (damageDealt > 0) {
    // O(1) 조회를 위한 unitId → index 맵 생성
    const unitIndexMap = new Map<number, number>();
    updatedUnits.forEach((u, i) => unitIndexMap.set(u.unitId, i));

    for (let i = 0; i < updatedUnits.length; i++) {
      const targetUnit = updatedUnits[i];
      if (targetUnit.hp <= 0) continue;

      const unitBlock = targetUnit.block || 0;
      const blockedDamage = Math.min(unitBlock, damageDealt);
      const actualDamage = damageDealt - blockedDamage;
      const newBlock = unitBlock - blockedDamage;
      const newHp = Math.max(0, targetUnit.hp - actualDamage);

      // O(1) 직접 업데이트 (기존 .map() O(n) 대체)
      updatedUnits[i] = { ...targetUnit, hp: newHp, block: newBlock };

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
 * 최적화: O(n²) find+map → O(n) Map 기반 인덱스 조회
 */
function distributeMultiTargetDamage(
  enemyUnits: EnemyUnit[],
  targetUnitIds: number[],
  baseDamage: number
): DamageDistributionResult {
  const updatedUnits = [...enemyUnits];
  const logs: string[] = [];
  const damageLogParts: string[] = [];

  // O(1) 조회를 위한 unitId → index 맵 생성
  const unitIndexMap = new Map<number, number>();
  updatedUnits.forEach((u, i) => unitIndexMap.set(u.unitId, i));

  for (const unitId of targetUnitIds) {
    const idx = unitIndexMap.get(unitId);
    if (idx === undefined) continue;

    const targetUnit = updatedUnits[idx];
    if (targetUnit.hp <= 0) continue;

    const unitBlock = targetUnit.block || 0;
    const blockedDamage = Math.min(unitBlock, baseDamage);
    const actualDamage = baseDamage - blockedDamage;
    const newBlock = unitBlock - blockedDamage;
    const newHp = Math.max(0, targetUnit.hp - actualDamage);

    // O(1) 직접 업데이트 (기존 .map() O(n) 대체)
    updatedUnits[idx] = { ...targetUnit, hp: newHp, block: newBlock };

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
 * 최적화: O(n) find+map → O(1) Map 기반 인덱스 조회
 */
function distributeSingleTargetDamage(
  enemyUnits: EnemyUnit[],
  cardTargetUnitId: number,
  damageDealt: number
): DamageDistributionResult {
  const updatedUnits = [...enemyUnits];
  const logs: string[] = [];

  if (damageDealt > 0) {
    // O(1) 조회를 위한 unitId → index 맵 생성
    const unitIndexMap = new Map<number, number>();
    updatedUnits.forEach((u, i) => unitIndexMap.set(u.unitId, i));

    // 타겟 유닛 찾기: 지정된 유닛 또는 첫 번째 생존 유닛
    let targetIdx = unitIndexMap.get(cardTargetUnitId);
    if (targetIdx === undefined || updatedUnits[targetIdx].hp <= 0) {
      // 첫 번째 생존 유닛 찾기
      targetIdx = updatedUnits.findIndex(u => u.hp > 0);
    }

    if (targetIdx !== -1 && targetIdx !== undefined) {
      const targetUnit = updatedUnits[targetIdx];
      const newUnitHp = Math.max(0, targetUnit.hp - damageDealt);
      // O(1) 직접 업데이트 (기존 .map() O(n) 대체)
      updatedUnits[targetIdx] = { ...targetUnit, hp: newUnitHp };
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
