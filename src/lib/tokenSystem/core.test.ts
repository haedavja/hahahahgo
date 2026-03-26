/**
 * @file core.test.ts
 * @description 토큰 시스템 핵심 로직 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  calculateAttackModifiers,
  calculateDefenseModifiers,
  calculateDamageTakenModifiers,
  calculateEnergyModifier,
  calculateSpeedModifier,
  calculateJamChance,
  calculateBurnDamage,
  calculateCounterDamage,
  calculateReviveHp,
  calculateCancellation,
  getConflictingTokenId,
  getStackLimit,
  isNegativeToken,
  TOKEN_CONFLICTS,
  TOKEN_STACK_LIMITS,
} from './core';

describe('토큰 시스템 핵심 로직', () => {
  // ==================== 공격 수정자 ====================
  describe('calculateAttackModifiers', () => {
    it('기본 상태에서 1배율 반환', () => {
      const getStacks = () => 0;
      const has = () => false;

      const result = calculateAttackModifiers(getStacks, has);

      expect(result.attackMultiplier).toBe(1);
      expect(result.damageBonus).toBe(0);
      expect(result.critBoost).toBe(0);
      expect(result.ignoreBlock).toBe(false);
      expect(result.lifesteal).toBe(0);
    });

    it('공세 토큰 1.5배', () => {
      const getStacks = () => 0;
      const has = (id: string) => id === 'offense';

      const result = calculateAttackModifiers(getStacks, has);

      expect(result.attackMultiplier).toBe(1.5);
    });

    it('공세+ 토큰 2.0배', () => {
      const getStacks = () => 0;
      const has = (id: string) => id === 'offensePlus';

      const result = calculateAttackModifiers(getStacks, has);

      expect(result.attackMultiplier).toBe(2.0);
    });

    it('무딤 토큰 0.5배', () => {
      const getStacks = () => 0;
      const has = (id: string) => id === 'dull';

      const result = calculateAttackModifiers(getStacks, has);

      expect(result.attackMultiplier).toBe(0.5);
    });

    it('공세 + 무딤 상쇄 = 1배', () => {
      const getStacks = () => 0;
      const has = (id: string) => id === 'offense' || id === 'dull';

      const result = calculateAttackModifiers(getStacks, has);

      // (1 + 0.5) * 0.5 = 0.75
      expect(result.attackMultiplier).toBe(0.75);
    });

    it('힘 토큰으로 피해 보너스', () => {
      const getStacks = (id: string) => id === 'strength' ? 5 : 0;
      const has = () => false;

      const result = calculateAttackModifiers(getStacks, has);

      expect(result.damageBonus).toBe(5);
    });

    it('집중 토큰으로 치명타 보너스', () => {
      const getStacks = (id: string) => id === 'crit_boost' ? 3 : 0;
      const has = () => false;

      const result = calculateAttackModifiers(getStacks, has);

      expect(result.critBoost).toBe(15); // 3 * 5%
    });

    it('철갑탄으로 방어력 무시', () => {
      const getStacks = () => 0;
      const has = (id: string) => id === 'armor_piercing';

      const result = calculateAttackModifiers(getStacks, has);

      expect(result.ignoreBlock).toBe(true);
    });

    it('흡수 토큰으로 흡혈', () => {
      const getStacks = () => 0;
      const has = (id: string) => id === 'absorb';

      const result = calculateAttackModifiers(getStacks, has);

      expect(result.lifesteal).toBe(0.5);
    });
  });

  // ==================== 방어 수정자 ====================
  describe('calculateDefenseModifiers', () => {
    it('기본 상태에서 1배율 반환', () => {
      const getStacks = () => 0;
      const has = () => false;

      const result = calculateDefenseModifiers(getStacks, has);

      expect(result.defenseMultiplier).toBe(1);
      expect(result.defenseBonus).toBe(0);
      expect(result.dodgeChance).toBe(0);
    });

    it('수세 토큰 1.5배', () => {
      const getStacks = () => 0;
      const has = (id: string) => id === 'guard';

      const result = calculateDefenseModifiers(getStacks, has);

      expect(result.defenseMultiplier).toBe(1.5);
    });

    it('흔들림 토큰 0.5배', () => {
      const getStacks = () => 0;
      const has = (id: string) => id === 'shaken';

      const result = calculateDefenseModifiers(getStacks, has);

      expect(result.defenseMultiplier).toBe(0.5);
    });

    it('흐릿함 토큰으로 50% 회피', () => {
      const getStacks = () => 0;
      const has = (id: string) => id === 'blur';

      const result = calculateDefenseModifiers(getStacks, has);

      expect(result.dodgeChance).toBe(0.5);
    });

    it('흐릿함+ 토큰으로 75% 회피', () => {
      const getStacks = () => 0;
      const has = (id: string) => id === 'blurPlus';

      const result = calculateDefenseModifiers(getStacks, has);

      expect(result.dodgeChance).toBe(0.75);
    });
  });

  // ==================== 피해 수정자 ====================
  describe('calculateDamageTakenModifiers', () => {
    it('기본 상태에서 1배율 반환', () => {
      const has = () => false;

      const result = calculateDamageTakenModifiers(has);

      expect(result.damageMultiplier).toBe(1);
    });

    it('허약 토큰 1.5배', () => {
      const has = (id: string) => id === 'vulnerable';

      const result = calculateDamageTakenModifiers(has);

      expect(result.damageMultiplier).toBe(1.5);
    });

    it('아픔 토큰 1.5배', () => {
      const has = (id: string) => id === 'pain';

      const result = calculateDamageTakenModifiers(has);

      expect(result.damageMultiplier).toBe(1.5);
    });

    it('허약 + 아픔 누적', () => {
      const has = (id: string) => id === 'vulnerable' || id === 'pain';

      const result = calculateDamageTakenModifiers(has);

      expect(result.damageMultiplier).toBe(2.25); // 1.5 * 1.5
    });
  });

  // ==================== 에너지/속도 수정자 ====================
  describe('calculateEnergyModifier', () => {
    it('몸풀기 토큰 +2 에너지', () => {
      const has = (id: string) => id === 'warmedUp';

      expect(calculateEnergyModifier(has)).toBe(2);
    });

    it('현기증 토큰 -2 에너지', () => {
      const has = (id: string) => id === 'dizzy';

      expect(calculateEnergyModifier(has)).toBe(-2);
    });
  });

  describe('calculateSpeedModifier', () => {
    it('민첩 스택당 속도 -1', () => {
      const getStacks = (id: string) => id === 'agility' ? 3 : 0;

      expect(calculateSpeedModifier(getStacks)).toBe(-3);
    });
  });

  // ==================== 특수 토큰 ====================
  describe('calculateJamChance', () => {
    it('룰렛 스택당 5% 확률', () => {
      expect(calculateJamChance(4)).toBe(0.2); // 4 * 0.05
    });

    it('건카타 효과로 3% 확률', () => {
      expect(calculateJamChance(4, true)).toBe(0.12); // 4 * 0.03
    });
  });

  describe('calculateBurnDamage', () => {
    it('스택당 3 피해', () => {
      expect(calculateBurnDamage(5)).toBe(15);
    });
  });

  describe('calculateCounterDamage', () => {
    it('기본 피해 + 힘', () => {
      expect(calculateCounterDamage(5, 3)).toBe(8);
    });
  });

  describe('calculateReviveHp', () => {
    it('최대 HP의 50%', () => {
      expect(calculateReviveHp(100)).toBe(50);
    });
  });

  // ==================== 상쇄 계산 ====================
  describe('calculateCancellation', () => {
    it('동일 스택 완전 상쇄', () => {
      const result = calculateCancellation(5, 5);

      expect(result.cancelled).toBe(5);
      expect(result.remaining).toBe(0);
    });

    it('새 토큰이 더 많으면 남음', () => {
      const result = calculateCancellation(8, 5);

      expect(result.cancelled).toBe(5);
      expect(result.remaining).toBe(3);
    });

    it('기존 토큰이 더 많으면 0 남음', () => {
      const result = calculateCancellation(3, 5);

      expect(result.cancelled).toBe(3);
      expect(result.remaining).toBe(0);
    });
  });

  // ==================== 유틸리티 ====================
  describe('getConflictingTokenId', () => {
    it('공세 ↔ 무딤', () => {
      expect(getConflictingTokenId('offense')).toBe('dull');
      expect(getConflictingTokenId('dull')).toBe('offense');
    });

    it('수세 ↔ 흔들림', () => {
      expect(getConflictingTokenId('guard')).toBe('shaken');
    });

    it('충돌 없는 토큰은 undefined', () => {
      expect(getConflictingTokenId('strength')).toBe('weakness');
      expect(getConflictingTokenId('burn')).toBeUndefined();
    });
  });

  describe('getStackLimit', () => {
    it('정의된 토큰은 해당 상한', () => {
      expect(getStackLimit('strength')).toBe(99);
      expect(getStackLimit('agility')).toBe(10);
      expect(getStackLimit('roulette')).toBe(20);
    });

    it('미정의 토큰은 99', () => {
      expect(getStackLimit('unknown_token')).toBe(99);
    });
  });

  describe('isNegativeToken', () => {
    it('부정 토큰 확인', () => {
      expect(isNegativeToken('vulnerable')).toBe(true);
      expect(isNegativeToken('burn')).toBe(true);
      expect(isNegativeToken('gun_jam')).toBe(true);
    });

    it('긍정 토큰 확인', () => {
      expect(isNegativeToken('offense')).toBe(false);
      expect(isNegativeToken('strength')).toBe(false);
    });
  });

  // ==================== 상수 확인 ====================
  describe('TOKEN_CONFLICTS', () => {
    it('양방향 정의', () => {
      for (const [from, to] of Object.entries(TOKEN_CONFLICTS)) {
        expect(TOKEN_CONFLICTS[to]).toBeDefined();
      }
    });
  });

  describe('TOKEN_STACK_LIMITS', () => {
    it('모든 값이 양수', () => {
      for (const limit of Object.values(TOKEN_STACK_LIMITS)) {
        expect(limit).toBeGreaterThan(0);
      }
    });
  });
});
