// @ts-nocheck - Test file with type issues
/**
 * @file anomaly-system.test.ts
 * @description 이변(Anomaly) 시스템 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AnomalySystem,
  ANOMALY_DEFINITIONS,
  formatAnomalyInfo,
  getAnomalySystem,
  activateGameAnomaly,
  deactivateGameAnomaly,
  clearGameAnomalies,
  getActiveGameAnomalies,
  isEtherBlocked,
  getEnergyReduction,
  getSpeedReduction,
  getMirrorReflectionDamage,
  getBloodMoonDamageMultiplier,
  getBloodMoonHealMultiplier,
  getToxicMistDamage,
  getRegenerationFieldHeal,
  getEliteSurgeMultipliers,
  type GameState,
} from '../core/anomaly-system';

// Mock dependencies
vi.mock('../data/game-data-sync', () => ({
  syncAllAnomalies: vi.fn(() => ({
    test_anomaly: {
      id: 'test_anomaly',
      name: '테스트 이변',
      getEffect: (level: number) => ({
        type: 'ETHER_BAN',
        value: level,
        description: '테스트 효과',
      }),
    },
    energy_drain: {
      id: 'energy_drain',
      name: '에너지 고갈',
      getEffect: (level: number) => ({
        type: 'ENERGY_REDUCTION',
        value: level,
        description: '에너지 감소',
      }),
    },
    speed_slow: {
      id: 'speed_slow',
      name: '속도 저하',
      getEffect: (level: number) => ({
        type: 'SPEED_REDUCTION',
        value: level * 2,
        description: '속도 감소',
      }),
    },
  })),
  calculateAnomalyEffect: vi.fn(),
}));

vi.mock('../core/logger', () => ({
  getLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const createMockGameState = (): GameState => ({
  player: { hp: 100, maxHp: 100, block: 0, energy: 3, tokens: {} },
  enemy: { hp: 50, maxHp: 50, block: 0, tokens: {} },
  turn: 1,
  phase: 'player',
} as GameState);

describe('anomaly-system', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearGameAnomalies();
    // Reset singleton
    const system = getAnomalySystem();
    system.clear();
  });

  describe('ANOMALY_DEFINITIONS', () => {
    it('이변 정의가 비어있지 않다', () => {
      expect(Object.keys(ANOMALY_DEFINITIONS).length).toBeGreaterThan(0);
    });

    it('모든 이변이 필수 필드를 가진다', () => {
      Object.values(ANOMALY_DEFINITIONS).forEach(anomaly => {
        expect(anomaly.id).toBeDefined();
        expect(anomaly.name).toBeDefined();
        expect(anomaly.description).toBeDefined();
        expect(anomaly.category).toBeDefined();
        expect(anomaly.activePhases).toBeDefined();
        expect(anomaly.difficulty).toBeDefined();
        expect(typeof anomaly.stackable).toBe('boolean');
      });
    });

    it('카테고리가 유효하다', () => {
      const validCategories = ['combat', 'resource', 'card', 'enemy', 'environment', 'chaos'];
      Object.values(ANOMALY_DEFINITIONS).forEach(anomaly => {
        expect(validCategories).toContain(anomaly.category);
      });
    });

    it('난이도가 유효하다', () => {
      const validDifficulties = ['easy', 'normal', 'hard', 'nightmare', 'chaos'];
      Object.values(ANOMALY_DEFINITIONS).forEach(anomaly => {
        expect(validDifficulties).toContain(anomaly.difficulty);
      });
    });
  });

  describe('AnomalySystem', () => {
    let system: AnomalySystem;

    beforeEach(() => {
      system = new AnomalySystem();
    });

    describe('activateAnomaly', () => {
      it('이변을 활성화한다', () => {
        const result = system.activateAnomaly('blood_moon');
        expect(result).toBe(true);
        expect(system.isActive('blood_moon')).toBe(true);
      });

      it('존재하지 않는 이변은 활성화 실패한다', () => {
        const result = system.activateAnomaly('nonexistent');
        expect(result).toBe(false);
      });

      it('스택 불가 이변은 중복 활성화 실패한다', () => {
        system.activateAnomaly('blood_moon');
        const result = system.activateAnomaly('blood_moon');
        expect(result).toBe(false);
      });

      it('스택 가능 이변은 스택이 증가한다', () => {
        system.activateAnomaly('heavy_burden');
        const result = system.activateAnomaly('heavy_burden');
        expect(result).toBe(true);
        const active = system.getActiveAnomalies();
        const heavyBurden = active.find(a => a.definition.id === 'heavy_burden');
        expect(heavyBurden?.stacks).toBe(2);
      });
    });

    describe('deactivateAnomaly', () => {
      it('활성 이변을 비활성화한다', () => {
        system.activateAnomaly('blood_moon');
        const result = system.deactivateAnomaly('blood_moon');
        expect(result).toBe(true);
        expect(system.isActive('blood_moon')).toBe(false);
      });

      it('비활성 이변 비활성화는 false를 반환한다', () => {
        const result = system.deactivateAnomaly('blood_moon');
        expect(result).toBe(false);
      });
    });

    describe('modifyDamage', () => {
      it('blood_moon이 피해를 25% 증가시킨다', () => {
        system.activateAnomaly('blood_moon');
        const state = createMockGameState();
        const modified = system.modifyDamage(100, 'player', state);
        expect(modified).toBe(125);
      });

      it('이변이 없으면 피해가 변경되지 않는다', () => {
        const state = createMockGameState();
        const modified = system.modifyDamage(100, 'player', state);
        expect(modified).toBe(100);
      });
    });

    describe('modifyCardCost', () => {
      it('heavy_burden이 카드 비용을 1 증가시킨다', () => {
        system.activateAnomaly('heavy_burden');
        const state = createMockGameState();
        const modified = system.modifyCardCost(2, 'test_card', state);
        expect(modified).toBe(3);
      });

      it('swift_combat이 카드 비용을 1 감소시킨다', () => {
        system.activateAnomaly('swift_combat');
        const state = createMockGameState();
        const modified = system.modifyCardCost(2, 'test_card', state);
        expect(modified).toBe(1);
      });

      it('비용이 0 미만으로 내려가지 않는다', () => {
        system.activateAnomaly('swift_combat');
        const state = createMockGameState();
        const modified = system.modifyCardCost(0, 'test_card', state);
        expect(modified).toBe(0);
      });
    });

    describe('modifyEnergy', () => {
      it('resource_scarcity가 에너지를 1 감소시킨다', () => {
        system.activateAnomaly('resource_scarcity');
        const state = createMockGameState();
        const modified = system.modifyEnergy(3, state);
        expect(modified).toBe(2);
      });

      it('abundance는 target이 both이므로 modifyEnergy에서 적용되지 않는다', () => {
        // abundance는 modifiers에서 target: 'both'로 설정됨
        // modifyEnergy는 target: 'player'만 처리하므로 변경 없음
        system.activateAnomaly('abundance');
        const state = createMockGameState();
        const modified = system.modifyEnergy(3, state);
        expect(modified).toBe(3); // 변경 없음
      });
    });

    describe('modifyDrawCount', () => {
      it('resource_scarcity가 드로우를 1 감소시킨다', () => {
        system.activateAnomaly('resource_scarcity');
        const state = createMockGameState();
        const modified = system.modifyDrawCount(5, state);
        expect(modified).toBe(4);
      });

      it('abundance가 드로우를 1 증가시킨다', () => {
        system.activateAnomaly('abundance');
        const state = createMockGameState();
        const modified = system.modifyDrawCount(5, state);
        expect(modified).toBe(6);
      });

      it('드로우가 1 미만으로 내려가지 않는다', () => {
        system.activateAnomaly('resource_scarcity');
        const state = createMockGameState();
        const modified = system.modifyDrawCount(1, state);
        expect(modified).toBeGreaterThanOrEqual(1);
      });
    });

    describe('onTurnEnd', () => {
      it('지속 시간이 있는 이변의 턴을 감소시킨다', () => {
        const customDef = {
          ...ANOMALY_DEFINITIONS.blood_moon,
          id: 'temp_effect',
          duration: 2,
        };
        const customSystem = new AnomalySystem({ temp_effect: customDef });
        customSystem.activateAnomaly('temp_effect');

        const expired = customSystem.onTurnEnd();
        expect(expired).toEqual([]);

        const expired2 = customSystem.onTurnEnd();
        expect(expired2).toContain('temp_effect');
        expect(customSystem.isActive('temp_effect')).toBe(false);
      });
    });

    describe('getActiveAnomalies', () => {
      it('활성 이변 목록을 반환한다', () => {
        system.activateAnomaly('blood_moon');
        system.activateAnomaly('swift_combat');
        const active = system.getActiveAnomalies();
        expect(active.length).toBe(2);
      });
    });

    describe('clear', () => {
      it('모든 이변을 초기화한다', () => {
        system.activateAnomaly('blood_moon');
        system.activateAnomaly('swift_combat');
        system.clear();
        expect(system.getActiveAnomalies().length).toBe(0);
      });
    });

    describe('getAnomalyInfo', () => {
      it('이변 정보를 반환한다', () => {
        const info = system.getAnomalyInfo('blood_moon');
        expect(info).toBeDefined();
        expect(info?.name).toBe('핏빛 달');
      });

      it('존재하지 않는 이변은 undefined를 반환한다', () => {
        const info = system.getAnomalyInfo('nonexistent');
        expect(info).toBeUndefined();
      });
    });

    describe('getAnomaliesByCategory', () => {
      it('카테고리별 이변을 반환한다', () => {
        const combatAnomalies = system.getAnomaliesByCategory('combat');
        expect(combatAnomalies.length).toBeGreaterThan(0);
        combatAnomalies.forEach(a => {
          expect(a.category).toBe('combat');
        });
      });
    });

    describe('getAnomaliesByDifficulty', () => {
      it('난이도별 이변을 반환한다', () => {
        const easyAnomalies = system.getAnomaliesByDifficulty('easy');
        expect(easyAnomalies.length).toBeGreaterThan(0);
        easyAnomalies.forEach(a => {
          expect(a.difficulty).toBe('easy');
        });
      });
    });

    describe('getRandomAnomaly', () => {
      it('랜덤 이변을 반환한다', () => {
        const anomaly = system.getRandomAnomaly();
        expect(anomaly).not.toBeNull();
      });

      it('카테고리 필터가 작동한다', () => {
        const anomaly = system.getRandomAnomaly({ category: 'combat' });
        expect(anomaly?.category).toBe('combat');
      });

      it('난이도 필터가 작동한다', () => {
        const anomaly = system.getRandomAnomaly({ maxDifficulty: 'easy' });
        expect(anomaly?.difficulty).toBe('easy');
      });
    });

    describe('modifyEnemyStats', () => {
      it('elite_surge가 적 HP를 50% 증가시킨다', () => {
        system.activateAnomaly('elite_surge');
        const enemy = { hp: 100, maxHp: 100, block: 0, tokens: {} };
        const modified = system.modifyEnemyStats(enemy as any);
        expect(modified.hp).toBe(150);
        expect(modified.maxHp).toBe(150);
      });
    });
  });

  describe('formatAnomalyInfo', () => {
    it('이변 정보를 포맷한다', () => {
      const info = formatAnomalyInfo(ANOMALY_DEFINITIONS.blood_moon);
      expect(info).toContain('핏빛 달');
      expect(info).toContain('피해');
    });
  });

  describe('게임 이변 시스템', () => {
    describe('activateGameAnomaly', () => {
      it('게임 이변을 활성화한다', () => {
        const result = activateGameAnomaly('test_anomaly', 1);
        expect(result).toBe(true);
      });

      it('존재하지 않는 이변은 활성화 실패한다', () => {
        const result = activateGameAnomaly('nonexistent', 1);
        expect(result).toBe(false);
      });
    });

    describe('deactivateGameAnomaly', () => {
      it('활성 게임 이변을 비활성화한다', () => {
        activateGameAnomaly('test_anomaly', 1);
        const result = deactivateGameAnomaly('test_anomaly');
        expect(result).toBe(true);
      });
    });

    describe('getActiveGameAnomalies', () => {
      it('활성 게임 이변 목록을 반환한다', () => {
        activateGameAnomaly('test_anomaly', 1);
        activateGameAnomaly('energy_drain', 2);
        const active = getActiveGameAnomalies();
        expect(active.length).toBe(2);
      });
    });

    describe('clearGameAnomalies', () => {
      it('모든 게임 이변을 초기화한다', () => {
        activateGameAnomaly('test_anomaly', 1);
        clearGameAnomalies();
        expect(getActiveGameAnomalies().length).toBe(0);
      });
    });

    describe('isEtherBlocked', () => {
      it('ETHER_BAN 이변이 있으면 true를 반환한다', () => {
        activateGameAnomaly('test_anomaly', 1);
        expect(isEtherBlocked()).toBe(true);
      });

      it('ETHER_BAN 이변이 없으면 false를 반환한다', () => {
        expect(isEtherBlocked()).toBe(false);
      });
    });

    describe('getEnergyReduction', () => {
      it('ENERGY_REDUCTION 효과를 합산한다', () => {
        activateGameAnomaly('energy_drain', 2);
        expect(getEnergyReduction()).toBe(2);
      });
    });

    describe('getSpeedReduction', () => {
      it('SPEED_REDUCTION 효과를 합산한다', () => {
        activateGameAnomaly('speed_slow', 3);
        expect(getSpeedReduction()).toBe(6);
      });
    });
  });

  describe('시뮬레이터 이변 유틸리티', () => {
    describe('getMirrorReflectionDamage', () => {
      it('mirror_dimension이 활성화되면 50% 반사 피해를 반환한다', () => {
        const system = getAnomalySystem();
        system.activateAnomaly('mirror_dimension');
        expect(getMirrorReflectionDamage(100)).toBe(50);
      });

      it('mirror_dimension이 비활성화면 0을 반환한다', () => {
        expect(getMirrorReflectionDamage(100)).toBe(0);
      });
    });

    describe('getBloodMoonDamageMultiplier', () => {
      it('blood_moon이 활성화되면 1.25를 반환한다', () => {
        const system = getAnomalySystem();
        system.activateAnomaly('blood_moon');
        expect(getBloodMoonDamageMultiplier()).toBe(1.25);
      });

      it('blood_moon이 비활성화면 1을 반환한다', () => {
        expect(getBloodMoonDamageMultiplier()).toBe(1);
      });
    });

    describe('getBloodMoonHealMultiplier', () => {
      it('blood_moon이 활성화되면 0.5를 반환한다', () => {
        const system = getAnomalySystem();
        system.activateAnomaly('blood_moon');
        expect(getBloodMoonHealMultiplier()).toBe(0.5);
      });
    });

    describe('getToxicMistDamage', () => {
      it('toxic_mist가 활성화되면 3을 반환한다', () => {
        const system = getAnomalySystem();
        system.activateAnomaly('toxic_mist');
        expect(getToxicMistDamage()).toBe(3);
      });
    });

    describe('getRegenerationFieldHeal', () => {
      it('regeneration_field가 활성화되면 5를 반환한다', () => {
        const system = getAnomalySystem();
        system.activateAnomaly('regeneration_field');
        expect(getRegenerationFieldHeal()).toBe(5);
      });
    });

    describe('getEliteSurgeMultipliers', () => {
      it('elite_surge가 활성화되면 HP 1.5, 피해 1.25를 반환한다', () => {
        const system = getAnomalySystem();
        system.activateAnomaly('elite_surge');
        const mults = getEliteSurgeMultipliers();
        expect(mults.hp).toBe(1.5);
        expect(mults.damage).toBe(1.25);
      });

      it('elite_surge가 비활성화면 1을 반환한다', () => {
        const mults = getEliteSurgeMultipliers();
        expect(mults.hp).toBe(1);
        expect(mults.damage).toBe(1);
      });
    });
  });
});
