/**
 * @file battleCalculations.test.ts
 * @description 전투 계산 유틸리티 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  // 상수
  BASE_CRIT_CHANCE,
  CRIT_MULTIPLIER,
  VULNERABLE_MULTIPLIER,
  WEAK_MULTIPLIER,
  // 피해 계산
  calculateBaseDamage,
  applyBlock,
  applyVulnerable,
  applyWeak,
  applyCritical,
  rollCrit,
  // 방어력 계산
  calculateBaseBlock,
  calculateGrowingDefenseBonus,
  // 토큰 수정자
  calculateAttackModifiers,
  calculateDefenseModifiers,
  calculateDamageTakenModifiers,
  // 다중 타격
  calculateMultiHitDamage,
  // 반격
  calculateCounterDamage,
  // 유틸리티
  clampHp,
  applyDamage,
  applyHeal,
  summarizeCombat,
} from './battleCalculations';

describe('battleCalculations', () => {
  // ==================== 상수 테스트 ====================

  describe('상수', () => {
    it('기본 크리티컬 확률은 5%', () => {
      expect(BASE_CRIT_CHANCE).toBe(0.05);
    });

    it('크리티컬 배율은 2.0', () => {
      expect(CRIT_MULTIPLIER).toBe(2.0);
    });

    it('취약 배율은 1.5', () => {
      expect(VULNERABLE_MULTIPLIER).toBe(1.5);
    });

    it('약화 배율은 0.75', () => {
      expect(WEAK_MULTIPLIER).toBe(0.75);
    });
  });

  // ==================== 피해 계산 테스트 ====================

  describe('calculateBaseDamage', () => {
    it('기본 피해량만 계산', () => {
      expect(calculateBaseDamage(10)).toBe(10);
    });

    it('힘 보너스 적용', () => {
      expect(calculateBaseDamage(10, 3)).toBe(13);
    });

    it('피해 보너스 적용', () => {
      expect(calculateBaseDamage(10, 0, { damageBonus: 5 })).toBe(15);
    });

    it('공격력 배율 적용', () => {
      expect(calculateBaseDamage(10, 0, { attackMultiplier: 1.5 })).toBe(15);
    });

    it('추가 피해 적용', () => {
      expect(calculateBaseDamage(10, 0, { bonusDamage: 3 })).toBe(13);
    });

    it('모든 수정자 조합', () => {
      // (10 + 2 + 3) × 2 + 5 = 35
      const result = calculateBaseDamage(10, 2, {
        damageBonus: 3,
        attackMultiplier: 2,
        bonusDamage: 5,
      });
      expect(result).toBe(35);
    });

    it('배율은 소수점 버림', () => {
      // (10 + 0) × 1.3 = 13 (버림)
      expect(calculateBaseDamage(10, 0, { attackMultiplier: 1.3 })).toBe(13);
    });
  });

  describe('applyBlock', () => {
    it('방어력으로 피해 감소', () => {
      const result = applyBlock(10, 5);
      expect(result.actualDamage).toBe(5);
      expect(result.blocked).toBe(5);
      expect(result.remainingBlock).toBe(0);
    });

    it('방어력이 피해보다 클 때', () => {
      const result = applyBlock(5, 10);
      expect(result.actualDamage).toBe(0);
      expect(result.blocked).toBe(5);
      expect(result.remainingBlock).toBe(5);
    });

    it('방어력이 0일 때', () => {
      const result = applyBlock(10, 0);
      expect(result.actualDamage).toBe(10);
      expect(result.blocked).toBe(0);
      expect(result.remainingBlock).toBe(0);
    });

    it('방어 무시', () => {
      const result = applyBlock(10, 5, true);
      expect(result.actualDamage).toBe(10);
      expect(result.blocked).toBe(0);
      expect(result.remainingBlock).toBe(5);
    });
  });

  describe('applyVulnerable', () => {
    it('취약 상태시 피해 50% 증가', () => {
      expect(applyVulnerable(10, true)).toBe(15);
    });

    it('취약 아닐 때 피해 변화 없음', () => {
      expect(applyVulnerable(10, false)).toBe(10);
    });

    it('소수점 버림', () => {
      expect(applyVulnerable(7, true)).toBe(10); // 7 × 1.5 = 10.5 → 10
    });
  });

  describe('applyWeak', () => {
    it('약화 상태시 피해 25% 감소', () => {
      expect(applyWeak(10, true)).toBe(7); // 10 × 0.75 = 7.5 → 7
    });

    it('약화 아닐 때 피해 변화 없음', () => {
      expect(applyWeak(10, false)).toBe(10);
    });
  });

  describe('applyCritical', () => {
    it('크리티컬 히트 시 피해 2배', () => {
      expect(applyCritical(10, true)).toBe(20);
    });

    it('크리티컬 아닐 때 피해 변화 없음', () => {
      expect(applyCritical(10, false)).toBe(10);
    });

    it('커스텀 크리티컬 배율', () => {
      expect(applyCritical(10, true, 3)).toBe(30);
    });
  });

  describe('rollCrit', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('랜덤 값이 확률 미만이면 크리티컬', () => {
      vi.mocked(Math.random).mockReturnValue(0.04);
      expect(rollCrit(0.05)).toBe(true);
    });

    it('랜덤 값이 확률 이상이면 일반 히트', () => {
      vi.mocked(Math.random).mockReturnValue(0.05);
      expect(rollCrit(0.05)).toBe(false);
    });

    it('100% 확률이면 항상 크리티컬', () => {
      vi.mocked(Math.random).mockReturnValue(0.99);
      expect(rollCrit(1.0)).toBe(true);
    });

    it('0% 확률이면 항상 일반 히트', () => {
      vi.mocked(Math.random).mockReturnValue(0);
      expect(rollCrit(0)).toBe(false);
    });
  });

  // ==================== 방어력 계산 테스트 ====================

  describe('calculateBaseBlock', () => {
    it('기본 방어력 계산', () => {
      expect(calculateBaseBlock(5)).toBe(5);
    });

    it('힘 보너스 적용', () => {
      expect(calculateBaseBlock(5, 2)).toBe(7);
    });

    it('방어 보너스 적용', () => {
      expect(calculateBaseBlock(5, 0, { blockBonus: 3 })).toBe(8);
    });

    it('방어력 배율 적용', () => {
      expect(calculateBaseBlock(10, 0, { blockMultiplier: 0.75 })).toBe(7);
    });
  });

  describe('calculateGrowingDefenseBonus', () => {
    it('성장형 방어력이 있으면 위치에 비례', () => {
      expect(calculateGrowingDefenseBonus(true, 10)).toBe(10);
    });

    it('성장형 방어력이 없으면 0', () => {
      expect(calculateGrowingDefenseBonus(false, 10)).toBe(0);
    });

    it('커스텀 성장률', () => {
      expect(calculateGrowingDefenseBonus(true, 10, 2)).toBe(20);
    });
  });

  // ==================== 토큰 수정자 테스트 ====================

  describe('calculateAttackModifiers', () => {
    it('빈 토큰 상태', () => {
      const result = calculateAttackModifiers({});
      expect(result.damageBonus).toBe(0);
      expect(result.attackMultiplier).toBe(1);
      expect(result.bonusDamage).toBe(0);
    });

    it('offensive 토큰', () => {
      const result = calculateAttackModifiers({ offensive: 5 });
      expect(result.damageBonus).toBe(5);
    });

    it('strength 토큰', () => {
      const result = calculateAttackModifiers({ strength: 3 });
      expect(result.damageBonus).toBe(3);
    });

    it('weak 토큰', () => {
      const result = calculateAttackModifiers({ weak: 2 });
      expect(result.attackMultiplier).toBe(0.75);
    });

    it('fury 토큰', () => {
      const result = calculateAttackModifiers({ fury: 1 });
      expect(result.attackMultiplier).toBe(1.5);
    });

    it('weak + fury 조합', () => {
      const result = calculateAttackModifiers({ weak: 1, fury: 1 });
      // 0.75 × 1.5 = 1.125
      expect(result.attackMultiplier).toBeCloseTo(1.125);
    });
  });

  describe('calculateDefenseModifiers', () => {
    it('빈 토큰 상태', () => {
      const result = calculateDefenseModifiers({});
      expect(result.blockBonus).toBe(0);
      expect(result.blockMultiplier).toBe(1);
    });

    it('defensive 토큰', () => {
      const result = calculateDefenseModifiers({ defensive: 5 });
      expect(result.blockBonus).toBe(5);
    });

    it('dexterity 토큰', () => {
      const result = calculateDefenseModifiers({ dexterity: 3 });
      expect(result.blockBonus).toBe(3);
    });

    it('frail 토큰', () => {
      const result = calculateDefenseModifiers({ frail: 2 });
      expect(result.blockMultiplier).toBe(0.75);
    });
  });

  describe('calculateDamageTakenModifiers', () => {
    it('빈 토큰 상태', () => {
      const result = calculateDamageTakenModifiers({});
      expect(result.damageMultiplier).toBe(1);
      expect(result.damageReduction).toBe(0);
    });

    it('vulnerable 토큰', () => {
      const result = calculateDamageTakenModifiers({ vulnerable: 2 });
      expect(result.damageMultiplier).toBe(1.5);
    });

    it('protected 토큰', () => {
      const result = calculateDamageTakenModifiers({ protected: 5 });
      expect(result.damageReduction).toBe(5);
    });
  });

  // ==================== 다중 타격 테스트 ====================

  describe('calculateMultiHitDamage', () => {
    it('기본 다중 타격', () => {
      const result = calculateMultiHitDamage(5, 3, 0);
      expect(result.damage).toBe(15);
      expect(result.actualDamage).toBe(15);
      expect(result.hitCount).toBe(3);
    });

    it('방어력 점진적 소모', () => {
      const result = calculateMultiHitDamage(5, 3, 7);
      expect(result.damage).toBe(15);
      expect(result.blocked).toBe(7);
      expect(result.actualDamage).toBe(8);
    });

    it('힘 적용', () => {
      const result = calculateMultiHitDamage(5, 3, 0, { strength: 2 });
      // 각 히트: 5 + 2 = 7, 총: 21
      expect(result.damage).toBe(21);
    });

    it('취약 적용', () => {
      const result = calculateMultiHitDamage(10, 2, 0, { isVulnerable: true });
      // 각 히트: 10 × 1.5 = 15, 총: 30
      expect(result.damage).toBe(30);
    });

    it('약화 적용', () => {
      const result = calculateMultiHitDamage(10, 2, 0, { isWeak: true });
      // 각 히트: 10 × 0.75 = 7, 총: 14
      expect(result.damage).toBe(14);
    });

    it('방어 무시', () => {
      const result = calculateMultiHitDamage(5, 3, 10, { ignoreBlock: true });
      expect(result.blocked).toBe(0);
      expect(result.actualDamage).toBe(15);
    });
  });

  // ==================== 반격 테스트 ====================

  describe('calculateCounterDamage', () => {
    it('기본 반격 피해', () => {
      expect(calculateCounterDamage(5)).toBe(5);
    });

    it('수정자 적용', () => {
      expect(calculateCounterDamage(5, { attackMultiplier: 2 })).toBe(10);
    });
  });

  // ==================== 유틸리티 테스트 ====================

  describe('clampHp', () => {
    it('HP가 범위 내일 때', () => {
      expect(clampHp(50, 100)).toBe(50);
    });

    it('HP가 0 미만일 때', () => {
      expect(clampHp(-10, 100)).toBe(0);
    });

    it('HP가 maxHp 초과일 때', () => {
      expect(clampHp(120, 100)).toBe(100);
    });
  });

  describe('applyDamage', () => {
    it('기본 피해 적용', () => {
      const result = applyDamage(100, 100, 30);
      expect(result.newHp).toBe(70);
      expect(result.actualDamage).toBe(30);
      expect(result.overkill).toBe(0);
    });

    it('오버킬 계산', () => {
      const result = applyDamage(20, 100, 50);
      expect(result.newHp).toBe(0);
      expect(result.actualDamage).toBe(20);
      expect(result.overkill).toBe(30);
    });
  });

  describe('applyHeal', () => {
    it('기본 치유', () => {
      const result = applyHeal(50, 100, 30);
      expect(result.newHp).toBe(80);
      expect(result.actualHeal).toBe(30);
      expect(result.overheal).toBe(0);
    });

    it('오버힐 계산', () => {
      const result = applyHeal(90, 100, 30);
      expect(result.newHp).toBe(100);
      expect(result.actualHeal).toBe(10);
      expect(result.overheal).toBe(20);
    });
  });

  describe('summarizeCombat', () => {
    it('기본 요약', () => {
      const result = summarizeCombat({
        damage: 10,
        blocked: 0,
        actualDamage: 10,
        isCrit: false,
        hitCount: 1,
      });
      expect(result).toBe('총 10 피해, 실제 10 피해');
    });

    it('다중 타격 요약', () => {
      const result = summarizeCombat({
        damage: 30,
        blocked: 5,
        actualDamage: 25,
        isCrit: false,
        hitCount: 3,
      });
      expect(result).toBe('3회 타격, 총 30 피해, 5 방어, 실제 25 피해');
    });

    it('크리티컬 요약', () => {
      const result = summarizeCombat({
        damage: 20,
        blocked: 0,
        actualDamage: 20,
        isCrit: true,
        hitCount: 1,
      });
      expect(result).toBe('총 20 피해, 실제 20 피해, 크리티컬!');
    });
  });
});
