/**
 * @file relicEffects.test.js
 * @description relicEffects 함수 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePassiveEffects,
  applyCombatStartEffects,
  applyCombatEndEffects,
  applyTurnStartEffects,
  applyTurnEndEffects,
  applyCardPlayedEffects,
  applyDamageTakenEffects,
  calculateEtherGain,
  applyNodeMoveEther,
  calculateExtraSlots
} from './relicEffects';

describe('relicEffects', () => {
  describe('calculatePassiveEffects', () => {
    it('빈 배열은 기본값을 반환해야 함', () => {
      const result = calculatePassiveEffects([]);

      expect(result.maxEnergy).toBe(0);
      expect(result.maxHp).toBe(0);
      expect(result.strength).toBe(0);
      expect(result.agility).toBe(0);
      expect(result.etherMultiplier).toBe(1);
    });

    it('undefined는 기본값을 반환해야 함', () => {
      const result = calculatePassiveEffects();

      expect(result.maxEnergy).toBe(0);
      expect(result.etherMultiplier).toBe(1);
    });

    it('존재하지 않는 상징 ID는 무시되어야 함', () => {
      const result = calculatePassiveEffects(['nonexistent_relic']);

      expect(result.maxEnergy).toBe(0);
      expect(result.strength).toBe(0);
    });

    it('기본 스탯 구조를 반환해야 함', () => {
      const result = calculatePassiveEffects([]);

      expect(result).toHaveProperty('maxEnergy');
      expect(result).toHaveProperty('maxHp');
      expect(result).toHaveProperty('maxSpeed');
      expect(result).toHaveProperty('speed');
      expect(result).toHaveProperty('strength');
      expect(result).toHaveProperty('agility');
      expect(result).toHaveProperty('subSpecialSlots');
      expect(result).toHaveProperty('mainSpecialSlots');
      expect(result).toHaveProperty('cardDrawBonus');
      expect(result).toHaveProperty('etherMultiplier');
      expect(result).toHaveProperty('maxSubmitCards');
      expect(result).toHaveProperty('extraCardPlay');
    });
  });

  describe('applyCombatStartEffects', () => {
    it('빈 배열은 기본값을 반환해야 함', () => {
      const result = applyCombatStartEffects([]);

      expect(result.block).toBe(0);
      expect(result.heal).toBe(0);
      expect(result.energy).toBe(0);
      expect(result.damage).toBe(0);
      expect(result.strength).toBe(0);
    });

    it('undefined는 기본값을 반환해야 함', () => {
      const result = applyCombatStartEffects();

      expect(result.block).toBe(0);
    });

    it('존재하지 않는 상징 ID는 무시되어야 함', () => {
      const result = applyCombatStartEffects(['nonexistent_relic']);

      expect(result.block).toBe(0);
    });
  });

  describe('applyCombatEndEffects', () => {
    it('빈 배열은 기본값을 반환해야 함', () => {
      const result = applyCombatEndEffects([]);

      expect(result.heal).toBe(0);
      expect(result.maxHp).toBe(0);
    });

    it('undefined는 기본값을 반환해야 함', () => {
      const result = applyCombatEndEffects();

      expect(result.heal).toBe(0);
    });
  });

  describe('applyTurnStartEffects', () => {
    it('빈 배열은 기본값을 반환해야 함', () => {
      const result = applyTurnStartEffects([]);

      expect(result.block).toBe(0);
      expect(result.energy).toBe(0);
      expect(result.heal).toBe(0);
    });

    it('이전 턴 예약 효과가 적용되어야 함', () => {
      const state = {
        blockNextTurn: 5,
        energyNextTurn: 2,
        healNextTurn: 3
      };

      const result = applyTurnStartEffects([], state);

      expect(result.block).toBe(5);
      expect(result.energy).toBe(2);
      expect(result.heal).toBe(3);
    });
  });

  describe('applyTurnEndEffects', () => {
    it('빈 배열은 기본값을 반환해야 함', () => {
      const result = applyTurnEndEffects([]);

      expect(result.strength).toBe(0);
      expect(result.energyNextTurn).toBe(0);
    });

    it('undefined는 기본값을 반환해야 함', () => {
      const result = applyTurnEndEffects();

      expect(result.strength).toBe(0);
    });
  });

  describe('applyCardPlayedEffects', () => {
    it('빈 배열은 기본값을 반환해야 함', () => {
      const result = applyCardPlayedEffects([]);

      expect(result.heal).toBe(0);
    });

    it('undefined는 기본값을 반환해야 함', () => {
      const result = applyCardPlayedEffects();

      expect(result.heal).toBe(0);
    });
  });

  describe('applyDamageTakenEffects', () => {
    it('빈 배열은 기본값을 반환해야 함', () => {
      const result = applyDamageTakenEffects([]);

      expect(result.blockNextTurn).toBe(0);
      expect(result.healNextTurn).toBe(0);
    });

    it('피해가 0 이하면 효과가 적용되지 않아야 함', () => {
      const result = applyDamageTakenEffects(['some_relic'], 0);

      expect(result.blockNextTurn).toBe(0);
      expect(result.healNextTurn).toBe(0);
    });

    it('피해가 음수면 효과가 적용되지 않아야 함', () => {
      const result = applyDamageTakenEffects(['some_relic'], -5);

      expect(result.blockNextTurn).toBe(0);
    });
  });

  describe('calculateEtherGain', () => {
    it('상징이 없으면 기본 에테르를 반환해야 함', () => {
      const result = calculateEtherGain(100, 3, []);

      expect(result).toBe(100);
    });

    it('undefined 상징은 기본 에테르를 반환해야 함', () => {
      const result = calculateEtherGain(100, 3);

      expect(result).toBe(100);
    });

    it('정수로 내림되어야 함', () => {
      const result = calculateEtherGain(15, 3, []);

      expect(result).toBe(15);
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('applyNodeMoveEther', () => {
    it('빈 배열은 0을 반환해야 함', () => {
      const result = applyNodeMoveEther([]);

      expect(result).toBe(0);
    });

    it('undefined는 0을 반환해야 함', () => {
      const result = applyNodeMoveEther();

      expect(result).toBe(0);
    });

    it('존재하지 않는 상징은 0을 반환해야 함', () => {
      const result = applyNodeMoveEther(['nonexistent_relic'], 100);

      expect(result).toBe(0);
    });
  });

  describe('calculateExtraSlots', () => {
    it('빈 배열은 0 슬롯을 반환해야 함', () => {
      const result = calculateExtraSlots([]);

      expect(result.mainSlots).toBe(0);
      expect(result.subSlots).toBe(0);
    });

    it('undefined는 0 슬롯을 반환해야 함', () => {
      const result = calculateExtraSlots();

      expect(result.mainSlots).toBe(0);
      expect(result.subSlots).toBe(0);
    });

    it('mainSlots와 subSlots 구조를 반환해야 함', () => {
      const result = calculateExtraSlots([]);

      expect(result).toHaveProperty('mainSlots');
      expect(result).toHaveProperty('subSlots');
    });
  });
});
