/**
 * @file etherUtils.test.js
 * @description etherUtils 함수 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  slotsToPts,
  getSlotCost,
  calculateEtherSlots,
  getCurrentSlotPts,
  getNextSlotCost,
  getSlotProgress,
  getEtherBarRatio,
  MAX_SLOTS
} from './etherUtils';

describe('etherUtils', () => {
  describe('slotsToPts', () => {
    it('0 슬롯은 0pt를 반환해야 함', () => {
      expect(slotsToPts(0)).toBe(0);
    });

    it('음수 슬롯은 0pt를 반환해야 함', () => {
      expect(slotsToPts(-1)).toBe(0);
    });

    it('1슬롯은 100pt를 반환해야 함', () => {
      expect(slotsToPts(1)).toBe(100);
    });

    it('2슬롯은 210pt를 반환해야 함 (100 + 110)', () => {
      expect(slotsToPts(2)).toBe(210);
    });

    it('3슬롯은 331pt를 반환해야 함 (100 + 110 + 121)', () => {
      expect(slotsToPts(3)).toBe(331);
    });
  });

  describe('getSlotCost', () => {
    it('0번째 슬롯은 100pt 비용이어야 함', () => {
      expect(getSlotCost(0)).toBe(100);
    });

    it('1번째 슬롯은 110pt 비용이어야 함', () => {
      expect(getSlotCost(1)).toBe(110);
    });

    it('2번째 슬롯은 121pt 비용이어야 함', () => {
      expect(getSlotCost(2)).toBe(121);
    });
  });

  describe('calculateEtherSlots', () => {
    it('0pt는 0슬롯을 반환해야 함', () => {
      expect(calculateEtherSlots(0)).toBe(0);
    });

    it('null/undefined는 0슬롯을 반환해야 함', () => {
      expect(calculateEtherSlots(null)).toBe(0);
      expect(calculateEtherSlots(undefined)).toBe(0);
    });

    it('99pt는 0슬롯을 반환해야 함', () => {
      expect(calculateEtherSlots(99)).toBe(0);
    });

    it('100pt는 1슬롯을 반환해야 함', () => {
      expect(calculateEtherSlots(100)).toBe(1);
    });

    it('209pt는 1슬롯을 반환해야 함', () => {
      expect(calculateEtherSlots(209)).toBe(1);
    });

    it('210pt는 2슬롯을 반환해야 함', () => {
      expect(calculateEtherSlots(210)).toBe(2);
    });

    it('331pt는 3슬롯을 반환해야 함', () => {
      expect(calculateEtherSlots(331)).toBe(3);
    });
  });

  describe('getCurrentSlotPts', () => {
    it('0pt는 0을 반환해야 함', () => {
      expect(getCurrentSlotPts(0)).toBe(0);
    });

    it('음수pt는 0을 반환해야 함', () => {
      expect(getCurrentSlotPts(-10)).toBe(0);
    });

    it('null/undefined는 0을 반환해야 함', () => {
      expect(getCurrentSlotPts(null)).toBe(0);
      expect(getCurrentSlotPts(undefined)).toBe(0);
    });

    it('50pt는 50을 반환해야 함 (첫 슬롯 미완료)', () => {
      expect(getCurrentSlotPts(50)).toBe(50);
    });

    it('100pt는 0을 반환해야 함 (첫 슬롯 완료)', () => {
      expect(getCurrentSlotPts(100)).toBe(0);
    });

    it('150pt는 50을 반환해야 함 (100 완료 + 50 진행)', () => {
      expect(getCurrentSlotPts(150)).toBe(50);
    });

    it('210pt는 0을 반환해야 함 (2슬롯 완료)', () => {
      expect(getCurrentSlotPts(210)).toBe(0);
    });
  });

  describe('getNextSlotCost', () => {
    it('0pt에서 다음 슬롯 비용은 100pt여야 함', () => {
      expect(getNextSlotCost(0)).toBe(100);
    });

    it('100pt에서 다음 슬롯 비용은 110pt여야 함', () => {
      expect(getNextSlotCost(100)).toBe(110);
    });

    it('210pt에서 다음 슬롯 비용은 121pt여야 함', () => {
      expect(getNextSlotCost(210)).toBe(121);
    });
  });

  describe('getSlotProgress', () => {
    it('0pt는 진행률 0을 반환해야 함', () => {
      expect(getSlotProgress(0)).toBe(0);
    });

    it('50pt는 진행률 0.5를 반환해야 함', () => {
      expect(getSlotProgress(50)).toBe(0.5);
    });

    it('100pt는 진행률 0을 반환해야 함 (슬롯 완료 후 리셋)', () => {
      expect(getSlotProgress(100)).toBe(0);
    });

    it('155pt는 0.5를 반환해야 함 (100 완료 + 55/110)', () => {
      expect(getSlotProgress(155)).toBe(0.5);
    });

    it('진행률은 0과 1 사이여야 함', () => {
      for (let pts = 0; pts <= 500; pts += 50) {
        const progress = getSlotProgress(pts);
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('getEtherBarRatio', () => {
    it('0pt는 비율 0을 반환해야 함', () => {
      expect(getEtherBarRatio(0)).toBe(0);
    });

    it('슬롯과 진행률을 합산한 비율을 반환해야 함', () => {
      // 100pt = 1슬롯, 진행률 0 → 1/10 = 0.1
      expect(getEtherBarRatio(100)).toBeCloseTo(0.1, 2);
    });

    it('비율은 0과 1 사이여야 함', () => {
      for (let pts = 0; pts <= 2000; pts += 100) {
        const ratio = getEtherBarRatio(pts);
        expect(ratio).toBeGreaterThanOrEqual(0);
        expect(ratio).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('MAX_SLOTS', () => {
    it('MAX_SLOTS는 10이어야 함', () => {
      expect(MAX_SLOTS).toBe(10);
    });
  });
});
