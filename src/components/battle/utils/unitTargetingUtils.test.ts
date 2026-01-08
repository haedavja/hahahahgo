/**
 * @file unitTargetingUtils.test.ts
 * @description 유닛 시스템 타겟팅 처리 유틸리티 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  resolveAttackTarget,
  resolveDefenseSource,
  updateAttackTargetBlock,
  applyDefenseToUnit,
} from './unitTargetingUtils';
import type { Card } from '../../../types/core';
import type { EnemyUnit } from '../../../types/combat';

const createMockCard = (overrides: Partial<Card> = {}): Card => ({
  id: 'test-card',
  name: '테스트 카드',
  type: 'attack',
  power: 5,
  sp: 1,
  ...overrides,
} as Card);

const createMockEnemyState = (overrides: Partial<EnemyUnit> = {}): EnemyUnit => ({
  hp: 50,
  maxHp: 50,
  block: 0,
  def: false,
  units: [],
  ...overrides,
} as EnemyUnit);

describe('unitTargetingUtils', () => {
  describe('resolveAttackTarget', () => {
    it('유닛이 없으면 타겟이 없다', () => {
      const result = resolveAttackTarget({
        actor: 'player',
        card: createMockCard({ type: 'attack' }),
        enemyState: createMockEnemyState({ units: [] }),
        selectedTargetUnit: 0,
        isAttackCard: true,
      });

      expect(result.targetUnitIdForAttack).toBeNull();
      expect(result.hasUnits).toBe(false);
    });

    it('플레이어 공격 시 타겟 유닛의 block을 적용한다', () => {
      const result = resolveAttackTarget({
        actor: 'player',
        card: createMockCard({ type: 'attack' }),
        enemyState: createMockEnemyState({
          units: [
            { unitId: 0, hp: 20, maxHp: 20, block: 5 },
            { unitId: 1, hp: 15, maxHp: 15, block: 3 },
          ],
        }),
        selectedTargetUnit: 0,
        isAttackCard: true,
      });

      expect(result.targetUnitIdForAttack).toBe(0);
      expect(result.modifiedEnemyState.block).toBe(5);
      expect(result.modifiedEnemyState.def).toBe(true);
      expect(result.hasUnits).toBe(true);
    });

    it('죽은 유닛은 타겟에서 제외하고 살아있는 유닛을 선택한다', () => {
      const result = resolveAttackTarget({
        actor: 'player',
        card: createMockCard({ type: 'attack' }),
        enemyState: createMockEnemyState({
          units: [
            { unitId: 0, hp: 0, maxHp: 20, block: 5 },
            { unitId: 1, hp: 15, maxHp: 15, block: 3 },
          ],
        }),
        selectedTargetUnit: 0,
        isAttackCard: true,
      });

      expect(result.targetUnitIdForAttack).toBe(1);
      expect(result.modifiedEnemyState.block).toBe(3);
    });

    it('적의 공격 카드는 처리하지 않는다', () => {
      const result = resolveAttackTarget({
        actor: 'enemy',
        card: createMockCard({ type: 'attack' }),
        enemyState: createMockEnemyState({
          units: [{ unitId: 0, hp: 20, maxHp: 20, block: 5 }],
        }),
        selectedTargetUnit: 0,
        isAttackCard: true,
      });

      expect(result.targetUnitIdForAttack).toBeNull();
    });

    it('공격 카드가 아니면 처리하지 않는다', () => {
      const result = resolveAttackTarget({
        actor: 'player',
        card: createMockCard({ type: 'defense' }),
        enemyState: createMockEnemyState({
          units: [{ unitId: 0, hp: 20, maxHp: 20, block: 5 }],
        }),
        selectedTargetUnit: 0,
        isAttackCard: false,
      });

      expect(result.targetUnitIdForAttack).toBeNull();
    });

    it('카드에 지정된 __targetUnitId를 우선 사용한다', () => {
      const card = createMockCard({ type: 'attack' }) as Card & { __targetUnitId?: number };
      card.__targetUnitId = 1;

      const result = resolveAttackTarget({
        actor: 'player',
        card,
        enemyState: createMockEnemyState({
          units: [
            { unitId: 0, hp: 20, maxHp: 20, block: 5 },
            { unitId: 1, hp: 15, maxHp: 15, block: 3 },
          ],
        }),
        selectedTargetUnit: 0,
        isAttackCard: true,
      });

      expect(result.targetUnitIdForAttack).toBe(1);
    });
  });

  describe('resolveDefenseSource', () => {
    it('적 방어 카드의 소스 유닛을 확인한다', () => {
      const card = createMockCard({ type: 'defense' }) as Card & { __sourceUnitId?: number };
      card.__sourceUnitId = 0;

      const result = resolveDefenseSource({
        actor: 'enemy',
        card,
        enemyState: createMockEnemyState({
          units: [{ unitId: 0, hp: 20, maxHp: 20, block: 5 }],
        }),
        selectedTargetUnit: 0,
        isAttackCard: false,
      });

      expect(result.sourceUnitIdForDefense).toBe(0);
      expect(result.modifiedEnemyState.block).toBe(5);
    });

    it('플레이어 카드는 처리하지 않는다', () => {
      const result = resolveDefenseSource({
        actor: 'player',
        card: createMockCard({ type: 'defense' }),
        enemyState: createMockEnemyState({
          units: [{ unitId: 0, hp: 20, maxHp: 20, block: 5 }],
        }),
        selectedTargetUnit: 0,
        isAttackCard: false,
      });

      expect(result.sourceUnitIdForDefense).toBeNull();
    });

    it('general 타입도 방어로 처리한다', () => {
      const card = createMockCard({ type: 'general' }) as Card & { __sourceUnitId?: number };
      card.__sourceUnitId = 0;

      const result = resolveDefenseSource({
        actor: 'enemy',
        card,
        enemyState: createMockEnemyState({
          units: [{ unitId: 0, hp: 20, maxHp: 20, block: 8 }],
        }),
        selectedTargetUnit: 0,
        isAttackCard: false,
      });

      expect(result.sourceUnitIdForDefense).toBe(0);
      expect(result.modifiedEnemyState.block).toBe(8);
    });
  });

  describe('updateAttackTargetBlock', () => {
    it('플레이어 공격 후 타겟 유닛의 block을 업데이트한다', () => {
      const result = updateAttackTargetBlock({
        actor: 'player',
        card: createMockCard({ type: 'attack' }),
        enemyState: createMockEnemyState({
          block: 2,
          units: [
            { unitId: 0, hp: 20, maxHp: 20, block: 5 },
            { unitId: 1, hp: 15, maxHp: 15, block: 3 },
          ],
        }),
        targetUnitIdForAttack: 0,
        isAttackCard: true,
      });

      expect(result.updated).toBe(true);
      const targetUnit = result.modifiedEnemyState.units?.find(u => u.unitId === 0);
      expect(targetUnit?.block).toBe(2);
      expect(result.modifiedEnemyState.block).toBe(0);
      expect(result.modifiedEnemyState.def).toBe(false);
    });

    it('타겟이 없으면 업데이트하지 않는다', () => {
      const result = updateAttackTargetBlock({
        actor: 'player',
        card: createMockCard({ type: 'attack' }),
        enemyState: createMockEnemyState({
          block: 5,
          units: [{ unitId: 0, hp: 20, maxHp: 20, block: 5 }],
        }),
        targetUnitIdForAttack: null,
        isAttackCard: true,
      });

      expect(result.updated).toBe(false);
    });
  });

  describe('applyDefenseToUnit', () => {
    it('적 방어 카드의 block을 유닛에 적용한다', () => {
      const card = createMockCard({ type: 'defense' }) as Card & { __sourceUnitId?: number };
      card.__sourceUnitId = 1;

      const result = applyDefenseToUnit({
        actor: 'enemy',
        card,
        enemyState: createMockEnemyState({
          block: 10,
          units: [
            { unitId: 0, hp: 20, maxHp: 20, block: 0 },
            { unitId: 1, hp: 15, maxHp: 15, block: 0 },
          ],
        }),
        targetUnitIdForAttack: null,
        isAttackCard: false,
      });

      expect(result.updated).toBe(true);
      const targetUnit = result.modifiedEnemyState.units?.find(u => u.unitId === 1);
      expect(targetUnit?.block).toBe(10);
      expect(targetUnit?.def).toBe(true);
      expect(result.modifiedEnemyState.block).toBe(0);
    });

    it('block이 0이면 업데이트하지 않는다', () => {
      const card = createMockCard({ type: 'defense' }) as Card & { __sourceUnitId?: number };
      card.__sourceUnitId = 0;

      const result = applyDefenseToUnit({
        actor: 'enemy',
        card,
        enemyState: createMockEnemyState({
          block: 0,
          units: [{ unitId: 0, hp: 20, maxHp: 20, block: 0 }],
        }),
        targetUnitIdForAttack: null,
        isAttackCard: false,
      });

      expect(result.updated).toBe(false);
    });

    it('소스 유닛이 없으면 업데이트하지 않는다', () => {
      const result = applyDefenseToUnit({
        actor: 'enemy',
        card: createMockCard({ type: 'defense' }),
        enemyState: createMockEnemyState({
          block: 10,
          units: [{ unitId: 0, hp: 20, maxHp: 20, block: 0 }],
        }),
        targetUnitIdForAttack: null,
        isAttackCard: false,
      });

      expect(result.updated).toBe(false);
    });
  });
});
