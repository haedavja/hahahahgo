/**
 * @file enemy-units.test.ts
 * @description 다중 적 유닛 시스템 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  initializeEnemyUnits,
  selectTargetUnit,
  distributeUnitDamage,
  syncEnemyTotalHp,
  checkSummonTrigger,
  spawnDeserters,
  getAliveUnitCount,
  distributeAoeDamage,
} from '../core/enemy-units';
import type { EnemyState, EnemyUnit } from '../core/game-types';

describe('enemy-units', () => {
  // 기본 적 상태 생성 헬퍼
  const createBaseEnemy = (): EnemyState => ({
    id: 'test_enemy',
    name: '테스트 적',
    hp: 100,
    maxHp: 100,
    maxSpeed: 30,
    block: 0,
    tokens: {},
    deck: ['enemy_slash', 'enemy_guard'],
    cardsPerTurn: 2,
  });

  describe('initializeEnemyUnits', () => {
    it('유닛이 없으면 단일 유닛으로 초기화', () => {
      const enemy = createBaseEnemy();
      initializeEnemyUnits(enemy);

      expect(enemy.units).toBeDefined();
      expect(enemy.units!.length).toBe(1);
      expect(enemy.units![0].unitId).toBe(0);
      expect(enemy.units![0].hp).toBe(100);
      expect(enemy.units![0].name).toBe('테스트 적');
    });

    it('이미 유닛이 있으면 초기화하지 않음', () => {
      const enemy = createBaseEnemy();
      enemy.units = [
        { unitId: 0, id: 'unit1', name: '유닛1', hp: 50, maxHp: 50, block: 0, tokens: {}, deck: [], cardsPerTurn: 1 },
        { unitId: 1, id: 'unit2', name: '유닛2', hp: 30, maxHp: 30, block: 0, tokens: {}, deck: [], cardsPerTurn: 1 },
      ];
      initializeEnemyUnits(enemy);

      expect(enemy.units.length).toBe(2);
    });

    it('빈 유닛 배열이면 초기화', () => {
      const enemy = createBaseEnemy();
      enemy.units = [];
      initializeEnemyUnits(enemy);

      expect(enemy.units.length).toBe(1);
    });
  });

  describe('selectTargetUnit', () => {
    it('가장 체력이 낮은 유닛 선택', () => {
      const units: EnemyUnit[] = [
        { unitId: 0, id: 'unit1', name: '유닛1', hp: 50, maxHp: 50, block: 0, tokens: {}, deck: [], cardsPerTurn: 1 },
        { unitId: 1, id: 'unit2', name: '유닛2', hp: 20, maxHp: 30, block: 0, tokens: {}, deck: [], cardsPerTurn: 1 },
        { unitId: 2, id: 'unit3', name: '유닛3', hp: 40, maxHp: 40, block: 0, tokens: {}, deck: [], cardsPerTurn: 1 },
      ];

      const target = selectTargetUnit(units);
      expect(target).not.toBeNull();
      expect(target!.unitId).toBe(1);
      expect(target!.hp).toBe(20);
    });

    it('죽은 유닛은 제외', () => {
      const units: EnemyUnit[] = [
        { unitId: 0, id: 'unit1', name: '유닛1', hp: 0, maxHp: 50, block: 0, tokens: {}, deck: [], cardsPerTurn: 1 },
        { unitId: 1, id: 'unit2', name: '유닛2', hp: 30, maxHp: 30, block: 0, tokens: {}, deck: [], cardsPerTurn: 1 },
      ];

      const target = selectTargetUnit(units);
      expect(target!.unitId).toBe(1);
    });

    it('모든 유닛이 죽었으면 null 반환', () => {
      const units: EnemyUnit[] = [
        { unitId: 0, id: 'unit1', name: '유닛1', hp: 0, maxHp: 50, block: 0, tokens: {}, deck: [], cardsPerTurn: 1 },
        { unitId: 1, id: 'unit2', name: '유닛2', hp: -5, maxHp: 30, block: 0, tokens: {}, deck: [], cardsPerTurn: 1 },
      ];

      const target = selectTargetUnit(units);
      expect(target).toBeNull();
    });

    it('빈 배열이면 null 반환', () => {
      const target = selectTargetUnit([]);
      expect(target).toBeNull();
    });
  });

  describe('distributeUnitDamage', () => {
    let units: EnemyUnit[];

    beforeEach(() => {
      units = [
        { unitId: 0, id: 'unit1', name: '유닛1', hp: 50, maxHp: 50, block: 10, tokens: {}, deck: [], cardsPerTurn: 1 },
        { unitId: 1, id: 'unit2', name: '유닛2', hp: 30, maxHp: 30, block: 0, tokens: {}, deck: [], cardsPerTurn: 1 },
      ];
    });

    it('방어력이 피해를 흡수', () => {
      const result = distributeUnitDamage(units, 0, 15);

      expect(result.blocked).toBe(10);
      expect(result.actualDamage).toBe(5);
      expect(result.unitKilled).toBe(false);
      expect(units[0].hp).toBe(45);
      expect(units[0].block).toBe(0);
    });

    it('방어력보다 피해가 적으면 방어력만 감소', () => {
      const result = distributeUnitDamage(units, 0, 5);

      expect(result.blocked).toBe(5);
      expect(result.actualDamage).toBe(0);
      expect(units[0].hp).toBe(50);
      expect(units[0].block).toBe(5);
    });

    it('유닛 사망 감지', () => {
      const result = distributeUnitDamage(units, 1, 35);

      expect(result.actualDamage).toBe(35);
      expect(result.unitKilled).toBe(true);
      expect(units[1].hp).toBe(-5);
    });

    it('존재하지 않는 유닛에게 피해', () => {
      const result = distributeUnitDamage(units, 99, 10);

      expect(result.actualDamage).toBe(0);
      expect(result.blocked).toBe(0);
      expect(result.unitKilled).toBe(false);
    });

    it('이미 죽은 유닛에게 피해', () => {
      units[0].hp = 0;
      const result = distributeUnitDamage(units, 0, 10);

      expect(result.actualDamage).toBe(0);
      expect(result.blocked).toBe(0);
      expect(result.unitKilled).toBe(false);
    });
  });

  describe('syncEnemyTotalHp', () => {
    it('유닛 체력 합계로 적 체력 동기화', () => {
      const enemy = createBaseEnemy();
      enemy.units = [
        { unitId: 0, id: 'unit1', name: '유닛1', hp: 40, maxHp: 50, block: 0, tokens: {}, deck: [], cardsPerTurn: 1 },
        { unitId: 1, id: 'unit2', name: '유닛2', hp: 25, maxHp: 30, block: 0, tokens: {}, deck: [], cardsPerTurn: 1 },
      ];

      syncEnemyTotalHp(enemy);

      expect(enemy.hp).toBe(65);
      expect(enemy.maxHp).toBe(80);
    });

    it('음수 체력은 0으로 처리', () => {
      const enemy = createBaseEnemy();
      enemy.units = [
        { unitId: 0, id: 'unit1', name: '유닛1', hp: -10, maxHp: 50, block: 0, tokens: {}, deck: [], cardsPerTurn: 1 },
        { unitId: 1, id: 'unit2', name: '유닛2', hp: 20, maxHp: 30, block: 0, tokens: {}, deck: [], cardsPerTurn: 1 },
      ];

      syncEnemyTotalHp(enemy);

      expect(enemy.hp).toBe(20);
    });

    it('유닛이 없으면 아무것도 안함', () => {
      const enemy = createBaseEnemy();
      syncEnemyTotalHp(enemy);

      expect(enemy.hp).toBe(100); // 원래 값 유지
    });
  });

  describe('checkSummonTrigger', () => {
    it('50% 이하 체력에서 소환 트리거', () => {
      const enemy = createBaseEnemy();
      enemy.passives = { summonOnHalfHp: true };
      enemy.hp = 45;

      expect(checkSummonTrigger(enemy)).toBe(true);
    });

    it('50% 초과 체력에서는 트리거 안됨', () => {
      const enemy = createBaseEnemy();
      enemy.passives = { summonOnHalfHp: true };
      enemy.hp = 55;

      expect(checkSummonTrigger(enemy)).toBe(false);
    });

    it('이미 소환했으면 트리거 안됨', () => {
      const enemy = createBaseEnemy();
      enemy.passives = { summonOnHalfHp: true };
      enemy.hp = 45;
      enemy.hasSummoned = true;

      expect(checkSummonTrigger(enemy)).toBe(false);
    });

    it('패시브가 없으면 트리거 안됨', () => {
      const enemy = createBaseEnemy();
      enemy.hp = 45;

      expect(checkSummonTrigger(enemy)).toBe(false);
    });

    it('체력이 0이면 트리거 안됨', () => {
      const enemy = createBaseEnemy();
      enemy.passives = { summonOnHalfHp: true };
      enemy.hp = 0;

      expect(checkSummonTrigger(enemy)).toBe(false);
    });
  });

  describe('spawnDeserters', () => {
    it('기본 2마리 탈영병 소환', () => {
      const enemy = createBaseEnemy();
      const spawned = spawnDeserters(enemy);

      expect(spawned.length).toBe(2);
      expect(enemy.units!.length).toBe(3); // 원래 1 + 탈영병 2
      expect(enemy.hasSummoned).toBe(true);
    });

    it('지정 수만큼 소환', () => {
      const enemy = createBaseEnemy();
      const spawned = spawnDeserters(enemy, 3);

      expect(spawned.length).toBe(3);
      expect(enemy.units!.length).toBe(4);
    });

    it('탈영병 속성 확인', () => {
      const enemy = createBaseEnemy();
      const spawned = spawnDeserters(enemy, 1);

      expect(spawned[0].id).toBe('deserter');
      expect(spawned[0].name).toBe('탈영병');
      expect(spawned[0].hp).toBe(15);
      expect(spawned[0].maxHp).toBe(15);
      expect(spawned[0].cardsPerTurn).toBe(1);
    });

    it('유닛 ID가 순차적으로 증가', () => {
      const enemy = createBaseEnemy();
      spawnDeserters(enemy, 3);

      expect(enemy.units![0].unitId).toBe(0); // 원래 유닛
      expect(enemy.units![1].unitId).toBe(1); // 탈영병 1
      expect(enemy.units![2].unitId).toBe(2); // 탈영병 2
      expect(enemy.units![3].unitId).toBe(3); // 탈영병 3
    });

    it('체력 동기화됨', () => {
      const enemy = createBaseEnemy();
      spawnDeserters(enemy, 2);

      // 원래 100 + 탈영병 15*2 = 130
      expect(enemy.hp).toBe(130);
      expect(enemy.maxHp).toBe(130);
    });
  });

  describe('getAliveUnitCount', () => {
    it('살아있는 유닛 수 반환', () => {
      const enemy = createBaseEnemy();
      enemy.units = [
        { unitId: 0, id: 'unit1', name: '유닛1', hp: 50, maxHp: 50, block: 0, tokens: {}, deck: [], cardsPerTurn: 1 },
        { unitId: 1, id: 'unit2', name: '유닛2', hp: 0, maxHp: 30, block: 0, tokens: {}, deck: [], cardsPerTurn: 1 },
        { unitId: 2, id: 'unit3', name: '유닛3', hp: 10, maxHp: 40, block: 0, tokens: {}, deck: [], cardsPerTurn: 1 },
      ];

      expect(getAliveUnitCount(enemy)).toBe(2);
    });

    it('유닛이 없으면 적 체력으로 판단', () => {
      const enemy = createBaseEnemy();
      expect(getAliveUnitCount(enemy)).toBe(1);

      enemy.hp = 0;
      expect(getAliveUnitCount(enemy)).toBe(0);
    });

    it('모든 유닛 사망', () => {
      const enemy = createBaseEnemy();
      enemy.units = [
        { unitId: 0, id: 'unit1', name: '유닛1', hp: 0, maxHp: 50, block: 0, tokens: {}, deck: [], cardsPerTurn: 1 },
        { unitId: 1, id: 'unit2', name: '유닛2', hp: -5, maxHp: 30, block: 0, tokens: {}, deck: [], cardsPerTurn: 1 },
      ];

      expect(getAliveUnitCount(enemy)).toBe(0);
    });
  });

  describe('distributeAoeDamage', () => {
    it('모든 살아있는 유닛에게 피해', () => {
      const enemy = createBaseEnemy();
      enemy.units = [
        { unitId: 0, id: 'unit1', name: '유닛1', hp: 50, maxHp: 50, block: 0, tokens: {}, deck: [], cardsPerTurn: 1 },
        { unitId: 1, id: 'unit2', name: '유닛2', hp: 30, maxHp: 30, block: 0, tokens: {}, deck: [], cardsPerTurn: 1 },
        { unitId: 2, id: 'unit3', name: '유닛3', hp: 0, maxHp: 40, block: 0, tokens: {}, deck: [], cardsPerTurn: 1 }, // 이미 죽음
      ];

      const result = distributeAoeDamage(enemy, 10);

      expect(result.totalDamage).toBe(20); // 10 + 10
      expect(result.unitsHit).toBe(2);
      expect(enemy.units[0].hp).toBe(40);
      expect(enemy.units[1].hp).toBe(20);
      expect(enemy.units[2].hp).toBe(0); // 죽은 유닛은 영향 없음
    });

    it('유닛별 방어력 적용', () => {
      const enemy = createBaseEnemy();
      enemy.units = [
        { unitId: 0, id: 'unit1', name: '유닛1', hp: 50, maxHp: 50, block: 5, tokens: {}, deck: [], cardsPerTurn: 1 },
        { unitId: 1, id: 'unit2', name: '유닛2', hp: 30, maxHp: 30, block: 15, tokens: {}, deck: [], cardsPerTurn: 1 },
      ];

      const result = distributeAoeDamage(enemy, 10);

      expect(result.totalDamage).toBe(5 + 0); // 5 (10-5) + 0 (방어력이 더 큼)
      expect(enemy.units[0].hp).toBe(45);
      expect(enemy.units[0].block).toBe(0);
      expect(enemy.units[1].hp).toBe(30);
      expect(enemy.units[1].block).toBe(5);
    });

    it('유닛 없이 적에게 직접 피해', () => {
      const enemy = createBaseEnemy();
      enemy.block = 5;

      const result = distributeAoeDamage(enemy, 15);

      expect(result.totalDamage).toBe(10);
      expect(result.unitsHit).toBe(1);
      expect(enemy.hp).toBe(90);
      expect(enemy.block).toBe(0);
    });

    it('AoE 후 체력 동기화', () => {
      const enemy = createBaseEnemy();
      enemy.units = [
        { unitId: 0, id: 'unit1', name: '유닛1', hp: 50, maxHp: 50, block: 0, tokens: {}, deck: [], cardsPerTurn: 1 },
        { unitId: 1, id: 'unit2', name: '유닛2', hp: 30, maxHp: 30, block: 0, tokens: {}, deck: [], cardsPerTurn: 1 },
      ];

      distributeAoeDamage(enemy, 10);

      expect(enemy.hp).toBe(60); // (50-10) + (30-10)
    });
  });
});
