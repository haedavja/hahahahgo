/**
 * @file relicEffects.test.ts
 * @description 상징 효과 유틸리티 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculatePassiveEffects,
  invalidatePassiveEffectsCache,
  applyCombatStartEffects,
  applyCombatEndEffects,
  applyTurnStartEffects,
  applyTurnEndEffects,
  applyCardPlayedEffects,
  calculateEtherGain,
  calculateExtraSlots,
} from './relicEffects';

// Mock getRelicById
vi.mock('../data/relics', () => ({
  getRelicById: vi.fn((id: string) => {
    const relics: Record<string, unknown> = {
      // PASSIVE 효과 상징
      iron_heart: {
        id: 'iron_heart',
        name: '강철 심장',
        effects: {
          type: 'PASSIVE',
          maxHp: 20,
          strength: 1,
        },
      },
      swift_boots: {
        id: 'swift_boots',
        name: '신속의 장화',
        effects: {
          type: 'PASSIVE',
          maxSpeed: 2,
          agility: 1,
        },
      },
      energy_core: {
        id: 'energy_core',
        name: '에너지 코어',
        effects: {
          type: 'PASSIVE',
          maxEnergy: 1,
          cardDrawBonus: 1,
        },
      },
      ether_amplifier: {
        id: 'ether_amplifier',
        name: '에테르 증폭기',
        effects: {
          type: 'PASSIVE',
          etherMultiplier: 1.5,
        },
      },
      // ON_COMBAT_START 효과 상징
      battle_shield: {
        id: 'battle_shield',
        name: '전투 방패',
        effects: {
          type: 'ON_COMBAT_START',
          block: 10,
        },
      },
      first_strike: {
        id: 'first_strike',
        name: '선제 공격',
        effects: {
          type: 'ON_COMBAT_START',
          damage: 5,
          strength: 1,
        },
      },
      // ON_COMBAT_END 효과 상징
      victory_heal: {
        id: 'victory_heal',
        name: '승리의 치유',
        effects: {
          type: 'ON_COMBAT_END',
          heal: 10,
        },
      },
      // ON_TURN_START 효과 상징
      morning_guard: {
        id: 'morning_guard',
        name: '아침 수비',
        effects: {
          type: 'ON_TURN_START',
          block: 5,
        },
      },
      turn_energy: {
        id: 'turn_energy',
        name: '턴 에너지',
        effects: {
          type: 'ON_TURN_START',
          energy: 1,
        },
      },
      // ON_TURN_END 효과 상징
      end_strength: {
        id: 'end_strength',
        name: '턴 종료 힘',
        effects: {
          type: 'ON_TURN_END',
          strength: 2,
        },
      },
      energy_reserve: {
        id: 'energy_reserve',
        name: '에너지 비축',
        effects: {
          type: 'ON_TURN_END',
          energyNextTurn: 1,
        },
      },
      // ON_CARD_PLAYED 효과 상징
      card_heal: {
        id: 'card_heal',
        name: '카드 회복',
        effects: {
          type: 'ON_CARD_PLAYED',
          heal: 2,
        },
      },
      // PASSIVE 에테르 효과 상징
      ether_multiplier: {
        id: 'ether_multiplier',
        name: '에테르 증폭',
        effects: {
          type: 'PASSIVE',
          etherCardMultiplier: true,
        },
      },
      // PASSIVE 슬롯 효과 상징
      slot_master: {
        id: 'slot_master',
        name: '슬롯 마스터',
        effects: {
          type: 'PASSIVE',
          mainSpecialSlots: 1,
          subSpecialSlots: 2,
        },
      },
    };
    return relics[id] || null;
  }),
}));

describe('relicEffects', () => {
  beforeEach(() => {
    invalidatePassiveEffectsCache();
  });

  describe('calculatePassiveEffects', () => {
    it('빈 배열은 기본값 반환', () => {
      const result = calculatePassiveEffects([]);
      expect(result.maxEnergy).toBe(0);
      expect(result.maxHp).toBe(0);
      expect(result.strength).toBe(0);
      expect(result.etherMultiplier).toBe(1);
    });

    it('단일 상징 효과 적용', () => {
      const result = calculatePassiveEffects(['iron_heart']);
      expect(result.maxHp).toBe(20);
      expect(result.strength).toBe(1);
    });

    it('여러 상징 효과 합산', () => {
      const result = calculatePassiveEffects(['iron_heart', 'swift_boots']);
      expect(result.maxHp).toBe(20);
      expect(result.strength).toBe(1);
      expect(result.maxSpeed).toBe(2);
      expect(result.agility).toBe(1);
    });

    it('etherMultiplier는 곱셈', () => {
      const result = calculatePassiveEffects(['ether_amplifier']);
      expect(result.etherMultiplier).toBe(1.5);
    });

    it('에너지 및 카드 드로우 보너스', () => {
      const result = calculatePassiveEffects(['energy_core']);
      expect(result.maxEnergy).toBe(1);
      expect(result.cardDrawBonus).toBe(1);
    });

    it('PASSIVE가 아닌 상징은 무시', () => {
      const result = calculatePassiveEffects(['battle_shield']); // ON_COMBAT_START
      expect(result.maxHp).toBe(0);
      expect(result.strength).toBe(0);
    });

    it('존재하지 않는 상징은 무시', () => {
      const result = calculatePassiveEffects(['nonexistent']);
      expect(result.maxHp).toBe(0);
    });

    it('캐싱 동작 확인', () => {
      const result1 = calculatePassiveEffects(['iron_heart']);
      const result2 = calculatePassiveEffects(['iron_heart']);
      expect(result1).toBe(result2); // 동일 참조 (캐시)
    });

    it('캐시 무효화 후 재계산', () => {
      const result1 = calculatePassiveEffects(['iron_heart']);
      invalidatePassiveEffectsCache();
      const result2 = calculatePassiveEffects(['iron_heart']);
      expect(result1).not.toBe(result2); // 다른 참조
      expect(result1).toEqual(result2); // 값은 동일
    });
  });

  describe('applyCombatStartEffects', () => {
    it('빈 배열은 기본값 반환', () => {
      const result = applyCombatStartEffects([]);
      expect(result.block).toBe(0);
      expect(result.heal).toBe(0);
      expect(result.damage).toBe(0);
    });

    it('블록 효과 적용', () => {
      const result = applyCombatStartEffects(['battle_shield']);
      expect(result.block).toBe(10);
    });

    it('피해 및 힘 효과 적용', () => {
      const result = applyCombatStartEffects(['first_strike']);
      expect(result.damage).toBe(5);
      expect(result.strength).toBe(1);
    });

    it('여러 상징 합산', () => {
      const result = applyCombatStartEffects(['battle_shield', 'first_strike']);
      expect(result.block).toBe(10);
      expect(result.damage).toBe(5);
    });

    it('ON_COMBAT_START가 아닌 상징은 무시', () => {
      const result = applyCombatStartEffects(['iron_heart']); // PASSIVE
      expect(result.block).toBe(0);
    });
  });

  describe('applyCombatEndEffects', () => {
    it('빈 배열은 기본값 반환', () => {
      const result = applyCombatEndEffects([]);
      expect(result.heal).toBe(0);
      expect(result.maxHp).toBe(0);
    });

    it('회복 효과 적용', () => {
      const result = applyCombatEndEffects(['victory_heal']);
      expect(result.heal).toBe(10);
    });

    it('ON_COMBAT_END가 아닌 상징은 무시', () => {
      const result = applyCombatEndEffects(['battle_shield']);
      expect(result.heal).toBe(0);
    });
  });

  describe('applyTurnStartEffects', () => {
    it('빈 배열은 기본값 반환', () => {
      const result = applyTurnStartEffects([]);
      expect(result.block).toBe(0);
      expect(result.energy).toBe(0);
    });

    it('블록 효과 적용', () => {
      const result = applyTurnStartEffects(['morning_guard']);
      expect(result.block).toBe(5);
    });

    it('에너지 효과 적용', () => {
      const result = applyTurnStartEffects(['turn_energy']);
      expect(result.energy).toBe(1);
    });

    it('여러 상징 합산', () => {
      const result = applyTurnStartEffects(['morning_guard', 'turn_energy']);
      expect(result.block).toBe(5);
      expect(result.energy).toBe(1);
    });

    it('이전 턴 예약 효과 적용', () => {
      const result = applyTurnStartEffects([], { blockNextTurn: 10 });
      expect(result.block).toBe(10);
    });
  });

  describe('applyTurnEndEffects', () => {
    it('빈 배열은 기본값 반환', () => {
      const result = applyTurnEndEffects([]);
      expect(result.strength).toBe(0);
      expect(result.energyNextTurn).toBe(0);
    });

    it('힘 효과 적용', () => {
      const result = applyTurnEndEffects(['end_strength']);
      expect(result.strength).toBe(2);
    });

    it('다음 턴 에너지 효과 적용', () => {
      const result = applyTurnEndEffects(['energy_reserve']);
      expect(result.energyNextTurn).toBe(1);
    });

    it('여러 상징 합산', () => {
      const result = applyTurnEndEffects(['end_strength', 'energy_reserve']);
      expect(result.strength).toBe(2);
      expect(result.energyNextTurn).toBe(1);
    });
  });

  describe('applyCardPlayedEffects', () => {
    it('빈 배열은 기본값 반환', () => {
      const result = applyCardPlayedEffects([], undefined, {});
      expect(result.heal).toBe(0);
    });

    it('회복 보너스 적용', () => {
      const result = applyCardPlayedEffects(['card_heal'], undefined, {});
      expect(result.heal).toBe(2);
    });

    it('ON_CARD_PLAYED가 아닌 상징은 무시', () => {
      const result = applyCardPlayedEffects(['iron_heart'], undefined, {});
      expect(result.heal).toBe(0);
    });
  });

  describe('calculateEtherGain', () => {
    it('기본 에테르 반환 (상징 없음)', () => {
      const result = calculateEtherGain(100, 0, []);
      expect(result).toBe(100);
    });

    it('etherCardMultiplier 효과 적용', () => {
      // 참고서 효과: 카드 수에 비례해 1.x배
      // cardsPlayed=3 → 1 + 3*0.1 = 1.3배
      const result = calculateEtherGain(100, 3, ['ether_multiplier']);
      expect(result).toBe(130); // 100 * 1.3 = 130
    });

    it('카드 0장이면 etherCardMultiplier 적용 안됨', () => {
      const result = calculateEtherGain(100, 0, ['ether_multiplier']);
      expect(result).toBe(100);
    });

    it('결과는 내림 처리', () => {
      const result = calculateEtherGain(100, 1, ['ether_multiplier']);
      // 100 * 1.1 = 110
      expect(result).toBe(110);
    });
  });

  describe('calculateExtraSlots', () => {
    it('빈 배열은 기본값 반환', () => {
      const result = calculateExtraSlots([]);
      expect(result.mainSlots).toBe(0);
      expect(result.subSlots).toBe(0);
    });

    it('추가 슬롯 적용', () => {
      const result = calculateExtraSlots(['slot_master']);
      expect(result.mainSlots).toBe(1);
      expect(result.subSlots).toBe(2);
    });

    it('PASSIVE가 아닌 상징은 슬롯에 영향 없음', () => {
      const result = calculateExtraSlots(['battle_shield']);
      expect(result.mainSlots).toBe(0);
      expect(result.subSlots).toBe(0);
    });
  });
});
