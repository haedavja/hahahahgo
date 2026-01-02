/**
 * @file unitTargetingUtils.ts
 * @description 유닛 시스템 타겟팅 처리 유틸리티
 */

import type { Card } from '../../../types/core';
import type { EnemyUnit } from '../../../types/combat';

interface UnitTargetingParams {
  actor: 'player' | 'enemy';
  card: Card;
  enemyState: EnemyUnit;
  selectedTargetUnit: number;
  isAttackCard: boolean;
}

interface AttackTargetResult {
  targetUnitIdForAttack: number | null;
  modifiedEnemyState: EnemyUnit;
  hasUnits: boolean;
}

/**
 * 플레이어 공격 시 타겟 유닛의 block을 적용
 */
export function resolveAttackTarget(params: UnitTargetingParams): AttackTargetResult {
  const { actor, card, enemyState, selectedTargetUnit, isAttackCard } = params;
  const currentUnits = enemyState.units || [];
  const hasUnits = currentUnits.length > 0;
  let targetUnitIdForAttack: number | null = null;
  const E = { ...enemyState };

  if (actor === 'player' && isAttackCard && hasUnits) {
    const extCard = card as Card & { __targetUnitId?: number };
    const cardTargetUnitId = extCard.__targetUnitId ?? selectedTargetUnit ?? 0;
    const aliveUnits = currentUnits.filter(u => u.hp > 0);
    let targetUnit = aliveUnits.find(u => u.unitId === cardTargetUnitId);
    if (!targetUnit && aliveUnits.length > 0) {
      targetUnit = aliveUnits[0];
    }

    if (targetUnit && targetUnit.unitId !== undefined) {
      targetUnitIdForAttack = targetUnit.unitId;
      E.block = targetUnit.block || 0;
      E.def = E.block > 0;
    }
  }

  return { targetUnitIdForAttack, modifiedEnemyState: E, hasUnits };
}

interface DefenseSourceResult {
  sourceUnitIdForDefense: number | null;
  modifiedEnemyState: EnemyUnit;
}

/**
 * 적 방어 시 소스 유닛의 기존 block 사용
 */
export function resolveDefenseSource(params: UnitTargetingParams): DefenseSourceResult {
  const { actor, card, enemyState } = params;
  const currentUnits = enemyState.units || [];
  const hasUnits = currentUnits.length > 0;
  let sourceUnitIdForDefense: number | null = null;
  const E = { ...enemyState };

  if (actor === 'enemy' && (card.type === 'defense' || card.type === 'general') && hasUnits) {
    const extCard = card as Card & { __sourceUnitId?: number };
    const cardSourceUnitId = extCard.__sourceUnitId;
    if (cardSourceUnitId !== undefined && cardSourceUnitId !== null) {
      const sourceUnit = currentUnits.find(u => u.unitId === cardSourceUnitId);
      if (sourceUnit) {
        sourceUnitIdForDefense = cardSourceUnitId;
        E.block = sourceUnit.block || 0;
        E.def = E.block > 0;
      }
    }
  }

  return { sourceUnitIdForDefense, modifiedEnemyState: E };
}

interface UpdateUnitBlockParams {
  actor: 'player' | 'enemy';
  card: Card;
  enemyState: EnemyUnit;
  targetUnitIdForAttack: number | null;
  isAttackCard: boolean;
}

interface UpdateUnitBlockResult {
  modifiedEnemyState: EnemyUnit;
  updated: boolean;
}

/**
 * 플레이어 공격 후 타겟 유닛의 block 업데이트
 */
export function updateAttackTargetBlock(params: UpdateUnitBlockParams): UpdateUnitBlockResult {
  const { actor, enemyState, targetUnitIdForAttack, isAttackCard } = params;
  const currentUnits = enemyState.units || [];
  const hasUnits = currentUnits.length > 0;
  const E = { ...enemyState };
  let updated = false;

  if (actor === 'player' && isAttackCard && hasUnits && targetUnitIdForAttack !== null) {
    const remainingBlock = E.block || 0;
    const updatedUnits = currentUnits.map(u => {
      if (u.unitId === targetUnitIdForAttack) {
        return { ...u, block: remainingBlock };
      }
      return u;
    });

    E.units = updatedUnits;
    E.block = 0;
    E.def = false;
    updated = true;
  }

  return { modifiedEnemyState: E, updated };
}

/**
 * 적 방어 카드: 개별 유닛에 방어력 적용
 */
export function applyDefenseToUnit(params: UpdateUnitBlockParams): UpdateUnitBlockResult {
  const { actor, card, enemyState } = params;
  const currentUnits = enemyState.units || [];
  const E = { ...enemyState };
  let updated = false;

  if (actor === 'enemy' && (card.type === 'defense' || card.type === 'general') && (E.block ?? 0) > 0) {
    const extCard = card as Card & { __sourceUnitId?: number };
    const sourceUnitId = extCard.__sourceUnitId;

    if (currentUnits.length > 0 && sourceUnitId !== undefined && sourceUnitId !== null) {
      const totalBlock = E.block;
      const updatedUnits = currentUnits.map(u => {
        if (u.unitId === sourceUnitId) {
          return { ...u, block: totalBlock, def: true };
        }
        return u;
      });

      E.units = updatedUnits;
      E.block = 0;
      E.def = false;
      updated = true;
    }
  }

  return { modifiedEnemyState: E, updated };
}
