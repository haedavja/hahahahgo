// @ts-nocheck - Test file with type issues
/**
 * @file multi-enemy-system.test.ts
 * @description 다중 적 동시 전투 시스템 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMultiEnemyState,
  convertToMultiEnemy,
  addEnemyUnit,
  removeEnemyUnit,
  updateMultiEnemyState,
  selectTargets,
  changeTarget,
  damageUnit,
  healUnit,
  processEnemyTurnStart,
  areAllEnemiesDead,
  getAliveEnemyCount,
  getTotalEnemyHp,
  summarizeEnemyState,
  toSingleEnemyState,
  type MultiEnemyState,
  type EnemyUnit,
} from '../core/multi-enemy-system';
import type { EnemyState, GameCard } from '../core/game-types';

// 테스트용 적 생성
function createMockEnemy(overrides: Partial<EnemyState> = {}): EnemyState {
  return {
    id: 'test_enemy',
    name: '테스트 적',
    hp: 50,
    maxHp: 50,
    block: 0,
    tokens: {},
    deck: ['enemy_slash', 'enemy_guard'],
    cardsPerTurn: 2,
    emoji: '👹',
    ...overrides,
  };
}

// 테스트용 카드 생성
function createMockCard(overrides: Partial<GameCard> = {}): GameCard {
  return {
    id: 'test_card',
    name: '테스트 카드',
    type: 'attack',
    actionCost: 1,
    damage: 10,
    ...overrides,
  } as GameCard;
}

describe('multi-enemy-system', () => {
  describe('createMultiEnemyState', () => {
    it('여러 적으로 상태를 생성한다', () => {
      const enemies = [
        createMockEnemy({ id: 'enemy1', name: '적1', hp: 30 }),
        createMockEnemy({ id: 'enemy2', name: '적2', hp: 40 }),
      ];

      const state = createMultiEnemyState(enemies);

      expect(state.units.length).toBe(2);
      expect(state.totalHp).toBe(70);
      expect(state.totalMaxHp).toBe(100);
      expect(state.aliveCount).toBe(2);
      expect(state.currentTargetIndex).toBe(0);
    });

    it('유닛에 올바른 ID가 할당된다', () => {
      const enemies = [
        createMockEnemy({ name: '적1' }),
        createMockEnemy({ name: '적2' }),
      ];

      const state = createMultiEnemyState(enemies);

      expect(state.units[0].unitId).toBe(0);
      expect(state.units[1].unitId).toBe(1);
    });
  });

  describe('convertToMultiEnemy', () => {
    it('단일 적을 다중 적 상태로 변환한다', () => {
      const enemy = createMockEnemy();

      const state = convertToMultiEnemy(enemy);

      expect(state.units.length).toBe(1);
      expect(state.totalHp).toBe(50);
      expect(state.aliveCount).toBe(1);
    });
  });

  describe('addEnemyUnit', () => {
    it('새 유닛을 추가한다', () => {
      const state = createMultiEnemyState([createMockEnemy()]);

      const newUnit: Omit<EnemyUnit, 'unitId'> = {
        enemyId: 'new_enemy',
        name: '새 적',
        hp: 20,
        maxHp: 20,
        block: 0,
        tokens: {},
        deck: [],
        cardsPerTurn: 1,
      };

      const newState = addEnemyUnit(state, newUnit);

      expect(newState.units.length).toBe(2);
      expect(newState.units[1].unitId).toBe(1);
      expect(newState.totalHp).toBe(70);
      expect(newState.aliveCount).toBe(2);
    });
  });

  describe('removeEnemyUnit', () => {
    it('유닛을 제거(처치)한다', () => {
      const state = createMultiEnemyState([
        createMockEnemy({ name: '적1' }),
        createMockEnemy({ name: '적2' }),
      ]);

      const newState = removeEnemyUnit(state, 0);

      expect(newState.units[0].isDead).toBe(true);
      expect(newState.units[0].hp).toBe(0);
      expect(newState.aliveCount).toBe(1);
    });

    it('현재 타겟이 죽으면 다음 타겟으로 변경한다', () => {
      const state = createMultiEnemyState([
        createMockEnemy({ name: '적1' }),
        createMockEnemy({ name: '적2' }),
      ]);
      state.currentTargetIndex = 0;

      const newState = removeEnemyUnit(state, 0);

      expect(newState.currentTargetIndex).toBe(1);
    });
  });

  describe('updateMultiEnemyState', () => {
    it('HP가 0 이하인 유닛을 죽은 것으로 표시한다', () => {
      const state = createMultiEnemyState([createMockEnemy()]);
      state.units[0].hp = 0;

      const newState = updateMultiEnemyState(state);

      expect(newState.units[0].isDead).toBe(true);
      expect(newState.aliveCount).toBe(0);
    });

    it('totalHp를 재계산한다', () => {
      const state = createMultiEnemyState([
        createMockEnemy({ hp: 30 }),
        createMockEnemy({ hp: 20 }),
      ]);
      state.units[0].hp = 10;

      const newState = updateMultiEnemyState(state);

      expect(newState.totalHp).toBe(30);
    });
  });

  describe('selectTargets', () => {
    let state: MultiEnemyState;

    beforeEach(() => {
      state = createMultiEnemyState([
        createMockEnemy({ name: '적1', hp: 30 }),
        createMockEnemy({ name: '적2', hp: 50 }),
        createMockEnemy({ name: '적3', hp: 20 }),
      ]);
    });

    it('단일 타겟을 선택한다', () => {
      const card = createMockCard();

      const result = selectTargets(state, card, 'single');

      expect(result.targets.length).toBe(1);
      expect(result.method).toBe('single');
    });

    it('모든 적을 타겟으로 선택한다', () => {
      const card = createMockCard();

      const result = selectTargets(state, card, 'all');

      expect(result.targets.length).toBe(3);
      expect(result.method).toBe('all');
    });

    it('HP가 가장 낮은 적을 선택한다', () => {
      const card = createMockCard();

      const result = selectTargets(state, card, 'lowest_hp');

      expect(result.targets.length).toBe(1);
      expect(result.targets[0].hp).toBe(20);
      expect(result.method).toBe('lowest_hp');
    });

    it('HP가 가장 높은 적을 선택한다', () => {
      const card = createMockCard();

      const result = selectTargets(state, card, 'highest_hp');

      expect(result.targets.length).toBe(1);
      expect(result.targets[0].hp).toBe(50);
      expect(result.method).toBe('highest_hp');
    });

    it('맨 앞 적을 선택한다', () => {
      const card = createMockCard();

      const result = selectTargets(state, card, 'front');

      expect(result.targets.length).toBe(1);
      expect(result.targets[0].name).toBe('적1');
      expect(result.method).toBe('front');
    });

    it('맨 뒤 적을 선택한다', () => {
      const card = createMockCard();

      const result = selectTargets(state, card, 'back');

      expect(result.targets.length).toBe(1);
      expect(result.targets[0].name).toBe('적3');
      expect(result.method).toBe('back');
    });

    it('죽은 적은 타겟에서 제외된다', () => {
      state.units[0].isDead = true;
      const card = createMockCard();

      const result = selectTargets(state, card, 'all');

      expect(result.targets.length).toBe(2);
    });

    it('살아있는 적이 없으면 빈 배열을 반환한다', () => {
      state.units.forEach(u => u.isDead = true);
      const card = createMockCard();

      const result = selectTargets(state, card, 'single');

      expect(result.targets).toEqual([]);
    });

    it('AOE 특성이 있는 카드는 모든 적을 타겟으로 한다', () => {
      const card = createMockCard({ traits: ['aoe'] });

      const result = selectTargets(state, card);

      expect(result.method).toBe('all');
    });
  });

  describe('changeTarget', () => {
    let state: MultiEnemyState;

    beforeEach(() => {
      state = createMultiEnemyState([
        createMockEnemy({ name: '적1' }),
        createMockEnemy({ name: '적2' }),
        createMockEnemy({ name: '적3' }),
      ]);
      state.currentTargetIndex = 0;
    });

    it('다음 타겟으로 변경한다', () => {
      const newState = changeTarget(state, 'next');

      expect(newState.currentTargetIndex).toBe(1);
    });

    it('이전 타겟으로 변경한다', () => {
      state.currentTargetIndex = 2;

      const newState = changeTarget(state, 'prev');

      expect(newState.currentTargetIndex).toBe(1);
    });

    it('마지막에서 다음으로 가면 처음으로 돌아온다', () => {
      state.currentTargetIndex = 2;

      const newState = changeTarget(state, 'next');

      expect(newState.currentTargetIndex).toBe(0);
    });

    it('직접 인덱스를 지정할 수 있다', () => {
      const newState = changeTarget(state, 2);

      expect(newState.currentTargetIndex).toBe(2);
    });

    it('유닛이 1개면 변경하지 않는다', () => {
      const singleState = createMultiEnemyState([createMockEnemy()]);

      const newState = changeTarget(singleState, 'next');

      expect(newState.currentTargetIndex).toBe(0);
    });
  });

  describe('damageUnit', () => {
    let state: MultiEnemyState;

    beforeEach(() => {
      state = createMultiEnemyState([createMockEnemy({ hp: 50, block: 10 })]);
    });

    it('피해를 적용한다', () => {
      const result = damageUnit(state, 0, 20);

      expect(result.actualDamage).toBe(10); // 20 - 10 block
      expect(state.units[0].hp).toBe(40);
      expect(state.units[0].block).toBe(0);
    });

    it('방어력 무시 옵션이 작동한다', () => {
      const result = damageUnit(state, 0, 20, true);

      expect(result.actualDamage).toBe(20);
      expect(state.units[0].hp).toBe(30);
      expect(state.units[0].block).toBe(10);
    });

    it('유닛이 죽으면 killed가 true가 된다', () => {
      const result = damageUnit(state, 0, 100);

      expect(result.killed).toBe(true);
      expect(state.units[0].isDead).toBe(true);
      expect(state.units[0].hp).toBe(0);
    });

    it('존재하지 않는 유닛은 피해 0을 반환한다', () => {
      const result = damageUnit(state, 999, 20);

      expect(result.actualDamage).toBe(0);
      expect(result.killed).toBe(false);
    });
  });

  describe('healUnit', () => {
    let state: MultiEnemyState;

    beforeEach(() => {
      state = createMultiEnemyState([createMockEnemy({ hp: 30, maxHp: 50 })]);
    });

    it('유닛을 회복한다', () => {
      const healed = healUnit(state, 0, 10);

      expect(healed).toBe(10);
      expect(state.units[0].hp).toBe(40);
    });

    it('최대 체력을 초과하지 않는다', () => {
      const healed = healUnit(state, 0, 30);

      expect(healed).toBe(20);
      expect(state.units[0].hp).toBe(50);
    });

    it('죽은 유닛은 회복되지 않는다', () => {
      state.units[0].isDead = true;

      const healed = healUnit(state, 0, 10);

      expect(healed).toBe(0);
    });
  });

  describe('processEnemyTurnStart', () => {
    it('재생 패시브가 있으면 회복한다', () => {
      const state = createMultiEnemyState([
        createMockEnemy({ hp: 30, passives: { regeneration: 5 } }),
      ]);

      const effects = processEnemyTurnStart(state);

      expect(effects.some(e => e.includes('재생'))).toBe(true);
      expect(state.units[0].hp).toBe(35);
    });

    it('힘 증가 패시브가 적용된다', () => {
      const state = createMultiEnemyState([
        createMockEnemy({ passives: { strengthPerTurn: 2 } }),
      ]);

      const effects = processEnemyTurnStart(state);

      expect(effects.some(e => e.includes('힘'))).toBe(true);
      expect(state.units[0].tokens['strength']).toBe(2);
    });

    it('죽은 유닛은 처리하지 않는다', () => {
      const state = createMultiEnemyState([
        createMockEnemy({ hp: 0, passives: { regeneration: 5 } }),
      ]);
      state.units[0].isDead = true;

      const effects = processEnemyTurnStart(state);

      expect(effects.length).toBe(0);
    });
  });

  describe('areAllEnemiesDead', () => {
    it('모든 적이 죽으면 true를 반환한다', () => {
      const state = createMultiEnemyState([
        createMockEnemy({ hp: 0 }),
        createMockEnemy({ hp: 0 }),
      ]);
      state.units.forEach(u => u.isDead = true);

      expect(areAllEnemiesDead(state)).toBe(true);
    });

    it('살아있는 적이 있으면 false를 반환한다', () => {
      const state = createMultiEnemyState([
        createMockEnemy({ hp: 0 }),
        createMockEnemy({ hp: 30 }),
      ]);
      state.units[0].isDead = true;

      expect(areAllEnemiesDead(state)).toBe(false);
    });
  });

  describe('getAliveEnemyCount', () => {
    it('살아있는 적 수를 반환한다', () => {
      const state = createMultiEnemyState([
        createMockEnemy({ hp: 30 }),
        createMockEnemy({ hp: 0 }),
        createMockEnemy({ hp: 20 }),
      ]);
      state.units[1].isDead = true;

      expect(getAliveEnemyCount(state)).toBe(2);
    });
  });

  describe('getTotalEnemyHp', () => {
    it('살아있는 적의 총 HP를 반환한다', () => {
      const state = createMultiEnemyState([
        createMockEnemy({ hp: 30 }),
        createMockEnemy({ hp: 20 }),
      ]);

      expect(getTotalEnemyHp(state)).toBe(50);
    });

    it('죽은 적은 제외한다', () => {
      const state = createMultiEnemyState([
        createMockEnemy({ hp: 30 }),
        createMockEnemy({ hp: 20 }),
      ]);
      state.units[1].isDead = true;

      expect(getTotalEnemyHp(state)).toBe(30);
    });
  });

  describe('summarizeEnemyState', () => {
    it('적 상태를 요약한다', () => {
      const state = createMultiEnemyState([
        createMockEnemy({ name: '고블린', hp: 30, maxHp: 50, emoji: '👺' }),
      ]);

      const summary = summarizeEnemyState(state);

      expect(summary).toContain('고블린');
      expect(summary).toContain('30/50');
    });

    it('모든 적이 죽으면 처치 메시지를 반환한다', () => {
      const state = createMultiEnemyState([createMockEnemy()]);
      state.units[0].isDead = true;

      const summary = summarizeEnemyState(state);

      expect(summary).toBe('모든 적 처치');
    });
  });

  describe('toSingleEnemyState', () => {
    it('MultiEnemyState를 EnemyState로 변환한다', () => {
      const state = createMultiEnemyState([
        createMockEnemy({ id: 'goblin', name: '고블린', hp: 30 }),
        createMockEnemy({ id: 'orc', name: '오크', hp: 50 }),
      ]);

      const enemyState = toSingleEnemyState(state);

      expect(enemyState.id).toBe('goblin');
      expect(enemyState.hp).toBe(80); // totalHp
      expect(enemyState.units).toBeDefined();
    });
  });
});
