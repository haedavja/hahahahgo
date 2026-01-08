/**
 * @file unitDamageDistribution.test.ts
 * @description 다중 유닛 데미지 분배 테스트
 */

import { describe, it, expect } from 'vitest';
import { distributeUnitDamage, type EnemyUnit } from './unitDamageDistribution';
import type { Card } from '../../../types/core';

// ==================== 테스트 헬퍼 ====================

const createMockUnit = (overrides: Partial<EnemyUnit> = {}): EnemyUnit => ({
  unitId: 1,
  name: '유닛1',
  hp: 100,
  maxHp: 100,
  block: 0,
  tokens: { usage: [], turn: [], permanent: [] },
  ...overrides,
});

const createMockCard = (overrides: Partial<Card & { isAoe?: boolean; special?: string[] }> = {}): Card & { isAoe?: boolean; special?: string[] } => ({
  id: 'test-card',
  name: '테스트 카드',
  type: 'attack',
  speedCost: 5,
  actionCost: 1,
  damage: 10,
  description: '테스트',
  ...overrides,
} as Card & { isAoe?: boolean; special?: string[] });

// ==================== 테스트 ====================

describe('distributeUnitDamage', () => {
  describe('기본 동작', () => {
    it('유닛이 없으면 null 반환', () => {
      const result = distributeUnitDamage({
        card: createMockCard(),
        enemyUnits: [],
        damageDealt: 10,
        selectedTargetUnit: 0,
      });

      expect(result).toBeNull();
    });

    it('undefined 유닛 배열은 null 반환', () => {
      const result = distributeUnitDamage({
        card: createMockCard(),
        enemyUnits: undefined as unknown as EnemyUnit[],
        damageDealt: 10,
        selectedTargetUnit: 0,
      });

      expect(result).toBeNull();
    });
  });

  describe('단일 타겟 피해 분배', () => {
    it('지정된 유닛에 피해 적용', () => {
      const units = [
        createMockUnit({ unitId: 1, hp: 100 }),
        createMockUnit({ unitId: 2, hp: 100 }),
      ];

      const result = distributeUnitDamage({
        card: createMockCard({ __targetUnitId: 1 } as Card),
        enemyUnits: units,
        damageDealt: 30,
        selectedTargetUnit: 1,
      });

      expect(result).not.toBeNull();
      expect(result!.updatedUnits[0].hp).toBe(70); // 100 - 30
      expect(result!.updatedUnits[1].hp).toBe(100); // 변경 없음
      expect(result!.newTotalHp).toBe(170); // 70 + 100
    });

    it('지정된 유닛이 죽었으면 첫 번째 생존 유닛에 피해', () => {
      const units = [
        createMockUnit({ unitId: 1, hp: 0 }), // 이미 죽음
        createMockUnit({ unitId: 2, hp: 100 }),
      ];

      const result = distributeUnitDamage({
        card: createMockCard({ __targetUnitId: 1 } as Card),
        enemyUnits: units,
        damageDealt: 30,
        selectedTargetUnit: 1,
      });

      expect(result).not.toBeNull();
      expect(result!.updatedUnits[0].hp).toBe(0); // 변경 없음 (이미 죽음)
      expect(result!.updatedUnits[1].hp).toBe(70); // 100 - 30
    });

    it('HP가 0 미만으로 내려가지 않음', () => {
      const units = [createMockUnit({ unitId: 1, hp: 10 })];

      const result = distributeUnitDamage({
        card: createMockCard(),
        enemyUnits: units,
        damageDealt: 50,
        selectedTargetUnit: 1,
      });

      expect(result).not.toBeNull();
      expect(result!.updatedUnits[0].hp).toBe(0); // Math.max(0, 10-50)
    });
  });

  describe('AOE 피해 분배', () => {
    it('aoeAttack special이 있으면 모든 유닛에 피해', () => {
      const units = [
        createMockUnit({ unitId: 1, hp: 100 }),
        createMockUnit({ unitId: 2, hp: 100 }),
        createMockUnit({ unitId: 3, hp: 100 }),
      ];

      const result = distributeUnitDamage({
        card: createMockCard({ special: ['aoeAttack'] }),
        enemyUnits: units,
        damageDealt: 20,
        selectedTargetUnit: 1,
      });

      expect(result).not.toBeNull();
      expect(result!.updatedUnits[0].hp).toBe(80); // 100 - 20
      expect(result!.updatedUnits[1].hp).toBe(80);
      expect(result!.updatedUnits[2].hp).toBe(80);
      expect(result!.newTotalHp).toBe(240); // 80 * 3
    });

    it('isAoe 플래그가 있으면 모든 유닛에 피해', () => {
      const units = [
        createMockUnit({ unitId: 1, hp: 100 }),
        createMockUnit({ unitId: 2, hp: 100 }),
      ];

      const result = distributeUnitDamage({
        card: createMockCard({ isAoe: true }),
        enemyUnits: units,
        damageDealt: 25,
        selectedTargetUnit: 1,
      });

      expect(result).not.toBeNull();
      expect(result!.updatedUnits[0].hp).toBe(75);
      expect(result!.updatedUnits[1].hp).toBe(75);
    });

    it('AOE 피해는 죽은 유닛 무시', () => {
      const units = [
        createMockUnit({ unitId: 1, hp: 0 }), // 이미 죽음
        createMockUnit({ unitId: 2, hp: 100 }),
      ];

      const result = distributeUnitDamage({
        card: createMockCard({ special: ['aoeAttack'] }),
        enemyUnits: units,
        damageDealt: 30,
        selectedTargetUnit: 1,
      });

      expect(result).not.toBeNull();
      expect(result!.updatedUnits[0].hp).toBe(0); // 변경 없음
      expect(result!.updatedUnits[1].hp).toBe(70);
    });

    it('AOE 피해 시 방어력 처리', () => {
      const units = [
        createMockUnit({ unitId: 1, hp: 100, block: 15 }),
        createMockUnit({ unitId: 2, hp: 100, block: 5 }),
      ];

      const result = distributeUnitDamage({
        card: createMockCard({ special: ['aoeAttack'] }),
        enemyUnits: units,
        damageDealt: 20,
        selectedTargetUnit: 1,
      });

      expect(result).not.toBeNull();
      // 유닛1: block 15, damage 20 → blocked 15, actual 5 → hp 95, block 0
      expect(result!.updatedUnits[0].hp).toBe(95);
      expect(result!.updatedUnits[0].block).toBe(0);
      // 유닛2: block 5, damage 20 → blocked 5, actual 15 → hp 85, block 0
      expect(result!.updatedUnits[1].hp).toBe(85);
      expect(result!.updatedUnits[1].block).toBe(0);
    });
  });

  describe('다중 타겟 피해 분배', () => {
    it('__targetUnitIds로 지정된 유닛들에 피해', () => {
      const units = [
        createMockUnit({ unitId: 1, hp: 100 }),
        createMockUnit({ unitId: 2, hp: 100 }),
        createMockUnit({ unitId: 3, hp: 100 }),
      ];

      const result = distributeUnitDamage({
        card: createMockCard({ 
          damage: 15,
          __targetUnitIds: [1, 3],
        } as Card),
        enemyUnits: units,
        damageDealt: 30, // 무시됨, baseDamage 사용
        selectedTargetUnit: 1,
      });

      expect(result).not.toBeNull();
      expect(result!.updatedUnits[0].hp).toBe(85); // 100 - 15
      expect(result!.updatedUnits[1].hp).toBe(100); // 변경 없음
      expect(result!.updatedUnits[2].hp).toBe(85); // 100 - 15
    });

    it('다중 타겟 피해 시 방어력 처리', () => {
      const units = [
        createMockUnit({ unitId: 1, hp: 100, block: 10 }),
        createMockUnit({ unitId: 2, hp: 100, block: 20 }),
      ];

      const result = distributeUnitDamage({
        card: createMockCard({ 
          damage: 15,
          __targetUnitIds: [1, 2],
        } as Card),
        enemyUnits: units,
        damageDealt: 30,
        selectedTargetUnit: 1,
      });

      expect(result).not.toBeNull();
      // 유닛1: damage 15, block 10 → blocked 10, actual 5 → hp 95
      expect(result!.updatedUnits[0].hp).toBe(95);
      expect(result!.updatedUnits[0].block).toBe(0);
      // 유닛2: damage 15, block 20 → blocked 15, actual 0 → hp 100
      expect(result!.updatedUnits[1].hp).toBe(100);
      expect(result!.updatedUnits[1].block).toBe(5);
    });
  });

  describe('로그 생성', () => {
    it('AOE 피해 시 범위 피해 로그 생성', () => {
      const units = [
        createMockUnit({ unitId: 1, name: '슬라임', hp: 100 }),
        createMockUnit({ unitId: 2, name: '고블린', hp: 100 }),
      ];

      const result = distributeUnitDamage({
        card: createMockCard({ special: ['aoeAttack'] }),
        enemyUnits: units,
        damageDealt: 10,
        selectedTargetUnit: 1,
      });

      expect(result).not.toBeNull();
      expect(result!.logs.length).toBeGreaterThan(0);
      expect(result!.logs[0]).toContain('범위 피해');
    });

    it('다중 타겟 피해 시 다중 타겟 로그 생성', () => {
      const units = [
        createMockUnit({ unitId: 1, name: '슬라임', hp: 100 }),
        createMockUnit({ unitId: 2, name: '고블린', hp: 100 }),
      ];

      const result = distributeUnitDamage({
        card: createMockCard({ 
          damage: 10,
          __targetUnitIds: [1, 2],
        } as Card),
        enemyUnits: units,
        damageDealt: 20,
        selectedTargetUnit: 1,
      });

      expect(result).not.toBeNull();
      expect(result!.logs.length).toBeGreaterThan(0);
      expect(result!.logs[0]).toContain('다중 타겟');
    });
  });
});
