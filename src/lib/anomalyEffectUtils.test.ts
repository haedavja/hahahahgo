/**
 * @file anomalyEffectUtils.test.ts
 * @description anomalyEffectUtils 함수 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getVulnerabilityMultiplier,
  getDefenseBackfireDamage,
  getSpeedInstabilityModifier,
  isTraitSilenced,
  getChainIsolationEffect,
  adjustFinesseGain
} from './anomalyEffectUtils';

describe('anomalyEffectUtils', () => {
  describe('getVulnerabilityMultiplier', () => {
    it('취약 퍼센트가 없으면 1을 반환해야 함', () => {
      expect(getVulnerabilityMultiplier({})).toBe(1);
    });

    it('취약 퍼센트가 0이면 1을 반환해야 함', () => {
      expect(getVulnerabilityMultiplier({ vulnerabilityPercent: 0 })).toBe(1);
    });

    it('취약 퍼센트 10%는 1.1 배율을 반환해야 함', () => {
      expect(getVulnerabilityMultiplier({ vulnerabilityPercent: 10 })).toBe(1.1);
    });

    it('취약 퍼센트 50%는 1.5 배율을 반환해야 함', () => {
      expect(getVulnerabilityMultiplier({ vulnerabilityPercent: 50 })).toBe(1.5);
    });
  });

  describe('getDefenseBackfireDamage', () => {
    it('역류 피해가 없으면 0을 반환해야 함', () => {
      expect(getDefenseBackfireDamage({})).toBe(0);
    });

    it('역류 피해가 설정되면 해당 값을 반환해야 함', () => {
      expect(getDefenseBackfireDamage({ defenseBackfire: 3 })).toBe(3);
    });
  });

  describe('getSpeedInstabilityModifier', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('불안정 범위가 없으면 0을 반환해야 함', () => {
      expect(getSpeedInstabilityModifier({})).toBe(0);
    });

    it('불안정 범위가 0이면 0을 반환해야 함', () => {
      expect(getSpeedInstabilityModifier({ speedInstability: 0 })).toBe(0);
    });

    it('불안정 범위 내에서 랜덤 값을 반환해야 함', () => {
      // Math.random = 0.5, range = 2
      // random 값: Math.floor(0.5 * 5) - 2 = 2 - 2 = 0
      const result = getSpeedInstabilityModifier({ speedInstability: 2 });
      expect(result).toBeGreaterThanOrEqual(-2);
      expect(result).toBeLessThanOrEqual(2);
    });
  });

  describe('isTraitSilenced', () => {
    it('침묵 레벨이 없으면 false를 반환해야 함', () => {
      expect(isTraitSilenced('strongbone', {})).toBe(false);
    });

    it('침묵 레벨이 0이면 false를 반환해야 함', () => {
      expect(isTraitSilenced('strongbone', { traitSilenceLevel: 0 })).toBe(false);
    });

    it('침묵 레벨 4에서는 모든 특성이 무효화되어야 함', () => {
      expect(isTraitSilenced('strongbone', { traitSilenceLevel: 4 })).toBe(true);
      expect(isTraitSilenced('swift', { traitSilenceLevel: 4 })).toBe(true);
    });

    it('존재하지 않는 특성은 false를 반환해야 함', () => {
      expect(isTraitSilenced('nonexistent_trait', { traitSilenceLevel: 4 })).toBe(false);
    });
  });

  describe('getChainIsolationEffect', () => {
    it('고립 레벨이 없으면 모든 효과가 false여야 함', () => {
      const result = getChainIsolationEffect({});
      expect(result.blockChain).toBe(false);
      expect(result.blockFollowup).toBe(false);
      expect(result.blockAdvance).toBe(false);
    });

    it('고립 레벨 0에서는 모든 효과가 false여야 함', () => {
      const result = getChainIsolationEffect({ chainIsolationLevel: 0 });
      expect(result.blockChain).toBe(false);
      expect(result.blockFollowup).toBe(false);
      expect(result.blockAdvance).toBe(false);
    });

    it('고립 레벨 1에서는 연계만 차단되어야 함', () => {
      const result = getChainIsolationEffect({ chainIsolationLevel: 1 });
      expect(result.blockChain).toBe(true);
      expect(result.blockFollowup).toBe(false);
      expect(result.blockAdvance).toBe(false);
    });

    it('고립 레벨 2에서는 후속만 차단되어야 함', () => {
      const result = getChainIsolationEffect({ chainIsolationLevel: 2 });
      expect(result.blockChain).toBe(false);
      expect(result.blockFollowup).toBe(true);
      expect(result.blockAdvance).toBe(false);
    });

    it('고립 레벨 3에서는 연계와 후속이 모두 차단되어야 함', () => {
      const result = getChainIsolationEffect({ chainIsolationLevel: 3 });
      expect(result.blockChain).toBe(true);
      expect(result.blockFollowup).toBe(true);
      expect(result.blockAdvance).toBe(false);
    });

    it('고립 레벨 4에서는 모든 효과가 차단되어야 함', () => {
      const result = getChainIsolationEffect({ chainIsolationLevel: 4 });
      expect(result.blockChain).toBe(true);
      expect(result.blockFollowup).toBe(true);
      expect(result.blockAdvance).toBe(true);
    });
  });

  describe('adjustFinesseGain', () => {
    it('광기 레벨이 없으면 원본 값을 반환해야 함', () => {
      expect(adjustFinesseGain(3, {})).toBe(3);
    });

    it('광기 레벨 0에서는 원본 값을 반환해야 함', () => {
      expect(adjustFinesseGain(3, { finesseBlockLevel: 0 })).toBe(3);
    });

    it('광기 레벨 1에서는 25% 감소해야 함', () => {
      // 4 * (1 - 0.25) = 4 * 0.75 = 3
      expect(adjustFinesseGain(4, { finesseBlockLevel: 1 })).toBe(3);
    });

    it('광기 레벨 2에서는 50% 감소해야 함', () => {
      // 4 * (1 - 0.50) = 4 * 0.50 = 2
      expect(adjustFinesseGain(4, { finesseBlockLevel: 2 })).toBe(2);
    });

    it('광기 레벨 3에서는 완전 차단되어야 함', () => {
      expect(adjustFinesseGain(4, { finesseBlockLevel: 3 })).toBe(0);
    });

    it('광기 레벨 4에서는 완전 차단되어야 함', () => {
      expect(adjustFinesseGain(4, { finesseBlockLevel: 4 })).toBe(0);
    });

    it('결과값은 0 이하로 내려가지 않아야 함', () => {
      expect(adjustFinesseGain(1, { finesseBlockLevel: 2 })).toBe(0);
    });
  });
});
