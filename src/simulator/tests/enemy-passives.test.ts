/**
 * @file enemy-passives.test.ts
 * @description 적 패시브 효과 시스템 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  processEnemyBattleStartPassives,
  processEnemyTurnStartPassives,
  processEnemyDamagePassives,
  checkAndProcessSummonPassive,
  checkUnitSummonPassives,
  hasVeilEffect,
  applyVeilInsightReduction,
  getEnemyPassivesSummary,
} from '../core/enemy-passives';
import type { GameBattleState, EnemyState } from '../core/game-types';

// spawnDeserters 모킹
vi.mock('../core/timeline-battle-engine', () => ({
  spawnDeserters: vi.fn((enemy, count) => {
    const newUnits = [];
    for (let i = 0; i < count; i++) {
      newUnits.push({
        unitId: 100 + i,
        name: '탈영병',
        hp: 15,
        maxHp: 15,
      });
    }
    if (!enemy.units) enemy.units = [];
    enemy.units.push(...newUnits);
    return newUnits;
  }),
  syncEnemyTotalHp: vi.fn((enemy) => {
    if (enemy.units) {
      enemy.hp = enemy.units.reduce((sum: number, u: { hp: number }) => sum + Math.max(0, u.hp), 0);
    }
  }),
}));

// 테스트용 게임 상태 생성
function createMockGameState(overrides: Partial<GameBattleState> = {}): GameBattleState {
  return {
    turn: 1,
    phase: 'player_turn',
    player: {
      hp: 70,
      maxHp: 80,
      energy: 3,
      maxEnergy: 3,
      block: 0,
      tokens: {},
      hand: [],
      deck: [],
      discard: [],
      exhaust: [],
      relics: [],
      insight: 0,
    },
    enemy: {
      id: 'test_enemy',
      name: '테스트 적',
      hp: 50,
      maxHp: 50,
      block: 0,
      tokens: {},
      deck: [],
      cardsPerTurn: 2,
    },
    timeline: [],
    comboUsageCount: {},
    ...overrides,
  } as GameBattleState;
}

describe('enemy-passives', () => {
  describe('processEnemyBattleStartPassives', () => {
    it('패시브가 없으면 빈 배열을 반환한다', () => {
      const state = createMockGameState();

      const results = processEnemyBattleStartPassives(state);

      expect(results).toEqual([]);
    });

    it('veilAtStart가 있으면 장막을 부여한다', () => {
      const state = createMockGameState();
      state.enemy.passives = { veilAtStart: true };
      state.player.insight = 2;

      const results = processEnemyBattleStartPassives(state);

      expect(results.length).toBe(1);
      expect(results[0].triggered).toBe(true);
      expect(state.enemy.tokens['veil']).toBe(1);
      expect(state.player.insight).toBeLessThan(2);
    });

    it('critBoostAtStart가 있으면 치명타 부스트를 부여한다', () => {
      const state = createMockGameState();
      state.enemy.passives = { critBoostAtStart: 25 };

      const results = processEnemyBattleStartPassives(state);

      expect(results.length).toBe(1);
      expect(results[0].triggered).toBe(true);
      expect(state.enemy.tokens['crit_boost']).toBe(25);
    });

    it('다중 유닛에도 패시브가 적용된다', () => {
      const state = createMockGameState();
      // enemy.passives가 있어야 유닛 패시브 처리까지 진행됨
      state.enemy.passives = {};
      state.enemy.units = [
        {
          unitId: 0,
          id: 'unit1',
          name: '유닛1',
          hp: 30,
          maxHp: 30,
          block: 0,
          tokens: {},
          passives: { veilAtStart: true },
        } as any,
      ];

      processEnemyBattleStartPassives(state);

      const firstUnit = state.enemy.units?.[0];
      expect(firstUnit).toBeDefined();
      expect(firstUnit?.tokens?.['veil']).toBe(1);
    });
  });

  describe('processEnemyTurnStartPassives', () => {
    it('healPerTurn이 있으면 체력을 회복한다', () => {
      const state = createMockGameState();
      state.enemy.hp = 30;
      state.enemy.passives = { healPerTurn: 5 };

      const results = processEnemyTurnStartPassives(state);

      expect(results.length).toBe(1);
      expect(results[0].healAmount).toBe(5);
      expect(state.enemy.hp).toBe(35);
    });

    it('healPerTurn이 최대 체력을 초과하지 않는다', () => {
      const state = createMockGameState();
      state.enemy.hp = 48;
      state.enemy.maxHp = 50;
      state.enemy.passives = { healPerTurn: 5 };

      processEnemyTurnStartPassives(state);

      expect(state.enemy.hp).toBe(50);
    });

    it('strengthPerTurn이 있으면 힘을 증가시킨다', () => {
      const state = createMockGameState();
      state.enemy.passives = { strengthPerTurn: 2 };

      const results = processEnemyTurnStartPassives(state);

      expect(results.length).toBe(1);
      expect(results[0].strengthGained).toBe(2);
      expect(state.enemy.tokens['strength']).toBe(2);
    });

    it('죽은 유닛은 패시브가 적용되지 않는다', () => {
      const state = createMockGameState();
      state.enemy.units = [
        {
          unitId: 0,
          id: 'dead_unit',
          name: '죽은 유닛',
          hp: 0,
          maxHp: 30,
          block: 0,
          tokens: {},
          passives: { healPerTurn: 10 },
        } as any,
      ];

      const results = processEnemyTurnStartPassives(state);

      expect(results.length).toBe(0);
    });
  });

  describe('processEnemyDamagePassives', () => {
    it('counterOnHit가 있으면 반격 피해를 준다', () => {
      const state = createMockGameState();
      state.enemy.passives = { counterOnHit: true };
      state.player.hp = 70;

      const results = processEnemyDamagePassives(state, 10);

      expect(results.length).toBe(1);
      expect(results[0].triggered).toBe(true);
      expect(state.player.hp).toBe(65); // 5 반격 피해
    });

    it('reflectDamage가 있으면 피해를 반사한다', () => {
      const state = createMockGameState();
      state.enemy.passives = { reflectDamage: 0.3 };
      state.player.hp = 70;

      const results = processEnemyDamagePassives(state, 20);

      expect(results.length).toBe(1);
      expect(results[0].damageReflected).toBe(6); // 20 * 0.3 = 6
      expect(state.player.hp).toBe(64);
    });

    it('유닛별 패시브도 처리한다', () => {
      const state = createMockGameState();
      state.enemy.units = [
        {
          unitId: 0,
          id: 'unit1',
          name: '유닛1',
          hp: 30,
          maxHp: 30,
          block: 0,
          tokens: {},
          passives: { counterOnHit: true },
        } as any,
      ];
      state.player.hp = 70;

      const results = processEnemyDamagePassives(state, 10, 0);

      expect(results.length).toBe(1);
      expect(state.player.hp).toBe(65);
    });
  });

  describe('checkAndProcessSummonPassive', () => {
    it('summonOnHalfHp가 없으면 발동하지 않는다', () => {
      const state = createMockGameState();
      state.enemy.hp = 20;

      const result = checkAndProcessSummonPassive(state);

      expect(result.triggered).toBe(false);
    });

    it('이미 소환했으면 발동하지 않는다', () => {
      const state = createMockGameState();
      state.enemy.passives = { summonOnHalfHp: true };
      state.enemy.hasSummoned = true;
      state.enemy.hp = 20;

      const result = checkAndProcessSummonPassive(state);

      expect(result.triggered).toBe(false);
    });

    it('HP가 50% 초과면 발동하지 않는다', () => {
      const state = createMockGameState();
      state.enemy.passives = { summonOnHalfHp: true };
      state.enemy.hp = 40;
      state.enemy.maxHp = 50;

      const result = checkAndProcessSummonPassive(state);

      expect(result.triggered).toBe(false);
    });

    it('HP가 50% 이하면 소환한다', () => {
      const state = createMockGameState();
      state.enemy.passives = { summonOnHalfHp: true };
      state.enemy.hp = 25;
      state.enemy.maxHp = 50;

      const result = checkAndProcessSummonPassive(state);

      expect(result.triggered).toBe(true);
      expect(state.enemy.hasSummoned).toBe(true);
    });

    it('HP가 0이면 발동하지 않는다', () => {
      const state = createMockGameState();
      state.enemy.passives = { summonOnHalfHp: true };
      state.enemy.hp = 0;

      const result = checkAndProcessSummonPassive(state);

      expect(result.triggered).toBe(false);
    });
  });

  describe('checkUnitSummonPassives', () => {
    it('유닛이 없으면 빈 배열을 반환한다', () => {
      const state = createMockGameState();

      const results = checkUnitSummonPassives(state);

      expect(results).toEqual([]);
    });

    it('50% 이하 HP 유닛이 소환 패시브를 발동한다', () => {
      const state = createMockGameState();
      state.enemy.units = [
        {
          unitId: 0,
          id: 'unit1',
          name: '유닛1',
          hp: 10,
          maxHp: 30,
          block: 0,
          tokens: {},
          passives: { summonOnHalfHp: true },
          hasSummoned: false,
        } as any,
      ];

      const results = checkUnitSummonPassives(state);

      expect(results.length).toBe(1);
      expect(results[0].triggered).toBe(true);
      expect(state.enemy.units[0].hasSummoned).toBe(true);
    });
  });

  describe('hasVeilEffect', () => {
    it('장막이 없으면 false를 반환한다', () => {
      const state = createMockGameState();

      expect(hasVeilEffect(state)).toBe(false);
    });

    it('적에게 장막이 있으면 true를 반환한다', () => {
      const state = createMockGameState();
      state.enemy.tokens = { veil: 1 };

      expect(hasVeilEffect(state)).toBe(true);
    });

    it('유닛에게 장막이 있으면 true를 반환한다', () => {
      const state = createMockGameState();
      state.enemy.units = [
        {
          unitId: 0,
          hp: 30,
          tokens: { veil: 1 },
        } as any,
      ];

      expect(hasVeilEffect(state)).toBe(true);
    });

    it('죽은 유닛의 장막은 무시한다', () => {
      const state = createMockGameState();
      state.enemy.units = [
        {
          unitId: 0,
          hp: 0,
          tokens: { veil: 1 },
        } as any,
      ];

      expect(hasVeilEffect(state)).toBe(false);
    });
  });

  describe('applyVeilInsightReduction', () => {
    it('장막이 없으면 통찰이 변하지 않는다', () => {
      const state = createMockGameState();
      state.player.insight = 2;

      applyVeilInsightReduction(state);

      expect(state.player.insight).toBe(2);
    });

    it('장막이 있으면 통찰을 0 이하로 제한한다', () => {
      const state = createMockGameState();
      state.enemy.tokens = { veil: 1 };
      state.player.insight = 3;

      applyVeilInsightReduction(state);

      expect(state.player.insight).toBe(0);
    });

    it('통찰이 이미 0 이하면 변하지 않는다', () => {
      const state = createMockGameState();
      state.enemy.tokens = { veil: 1 };
      state.player.insight = -2;

      applyVeilInsightReduction(state);

      expect(state.player.insight).toBe(-2);
    });
  });

  describe('getEnemyPassivesSummary', () => {
    it('패시브가 없으면 빈 배열을 반환한다', () => {
      const enemy: EnemyState = {
        id: 'test',
        name: '테스트',
        hp: 50,
        maxHp: 50,
        block: 0,
        tokens: {},
        deck: [],
        cardsPerTurn: 2,
        maxSpeed: 10,
      };

      const summary = getEnemyPassivesSummary(enemy);

      expect(summary).toEqual([]);
    });

    it('모든 패시브를 요약한다', () => {
      const enemy: EnemyState = {
        id: 'test',
        name: '테스트',
        hp: 50,
        maxHp: 50,
        block: 0,
        tokens: {},
        deck: [],
        cardsPerTurn: 2,
        maxSpeed: 10,
        passives: {
          veilAtStart: true,
          healPerTurn: 5,
          strengthPerTurn: 2,
          critBoostAtStart: 15,
          summonOnHalfHp: true,
          counterOnHit: true,
          reflectDamage: 0.25,
        },
      };

      const summary = getEnemyPassivesSummary(enemy);

      expect(summary).toContain('전투 시작 시 장막');
      expect(summary).toContain('매턴 5 회복');
      expect(summary).toContain('매턴 힘 +2');
      expect(summary).toContain('시작 치명타율 +15%');
      expect(summary).toContain('50% HP에서 소환');
      expect(summary).toContain('피격시 반격');
      expect(summary).toContain('25% 피해 반사');
    });
  });
});
