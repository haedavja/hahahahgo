/**
 * @file etherUtils.test.ts
 * @description 에테르 유틸리티 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  MAX_SLOTS,
  slotsToPts,
  getSlotCost,
  calculateEtherSlots,
  getCurrentSlotPts,
  getNextSlotCost,
  getSlotProgress,
  getEtherBarRatio,
} from './etherUtils';

describe('etherUtils', () => {
  describe('상수', () => {
    it('MAX_SLOTS는 10', () => {
      expect(MAX_SLOTS).toBe(10);
    });
  });

  describe('slotsToPts', () => {
    it('0 슬롯은 0pt', () => {
      expect(slotsToPts(0)).toBe(0);
    });

    it('음수 슬롯은 0pt', () => {
      expect(slotsToPts(-1)).toBe(0);
    });

    it('1슬롯은 100pt', () => {
      expect(slotsToPts(1)).toBe(100);
    });

    it('2슬롯은 210pt (100 + 110)', () => {
      expect(slotsToPts(2)).toBe(210);
    });

    it('3슬롯은 331pt (100 + 110 + 121)', () => {
      expect(slotsToPts(3)).toBe(331);
    });

    it('각 슬롯 비용은 10% 증가 (인플레이션)', () => {
      expect(slotsToPts(5)).toBe(100 + 110 + 121 + 133 + 146);
    });

    it('10슬롯까지 계산 가능', () => {
      const pts10 = slotsToPts(10);
      expect(pts10).toBeGreaterThan(slotsToPts(9));
    });
  });

  describe('getSlotCost', () => {
    it('0번 슬롯 비용은 100pt', () => {
      expect(getSlotCost(0)).toBe(100);
    });

    it('1번 슬롯 비용은 110pt', () => {
      expect(getSlotCost(1)).toBe(110);
    });

    it('2번 슬롯 비용은 121pt', () => {
      expect(getSlotCost(2)).toBe(121);
    });

    it('slotsToPts와 일관성 유지', () => {
      const cost0 = getSlotCost(0);
      const cost1 = getSlotCost(1);
      const cost2 = getSlotCost(2);

      expect(slotsToPts(1)).toBe(cost0);
      expect(slotsToPts(2)).toBe(cost0 + cost1);
      expect(slotsToPts(3)).toBe(cost0 + cost1 + cost2);
    });
  });

  describe('calculateEtherSlots', () => {
    it('0pt는 0슬롯', () => {
      expect(calculateEtherSlots(0)).toBe(0);
    });

    it('99pt는 0슬롯 (100 미만)', () => {
      expect(calculateEtherSlots(99)).toBe(0);
    });

    it('100pt는 1슬롯', () => {
      expect(calculateEtherSlots(100)).toBe(1);
    });

    it('209pt는 1슬롯 (210 미만)', () => {
      expect(calculateEtherSlots(209)).toBe(1);
    });

    it('210pt는 2슬롯', () => {
      expect(calculateEtherSlots(210)).toBe(2);
    });

    it('331pt는 3슬롯', () => {
      expect(calculateEtherSlots(331)).toBe(3);
    });

    it('slotsToPts의 역함수', () => {
      expect(calculateEtherSlots(slotsToPts(0))).toBe(0);
      expect(calculateEtherSlots(slotsToPts(1))).toBe(1);
      expect(calculateEtherSlots(slotsToPts(5))).toBe(5);
      expect(calculateEtherSlots(slotsToPts(10))).toBe(10);
    });
  });

  describe('getCurrentSlotPts', () => {
    it('0pt는 0', () => {
      expect(getCurrentSlotPts(0)).toBe(0);
    });

    it('음수는 0', () => {
      expect(getCurrentSlotPts(-10)).toBe(0);
    });

    it('99pt는 99 (1슬롯 미달)', () => {
      expect(getCurrentSlotPts(99)).toBe(99);
    });

    it('100pt는 0 (1슬롯 정확히 채움)', () => {
      expect(getCurrentSlotPts(100)).toBe(0);
    });

    it('150pt는 50 (1슬롯 + 50pt)', () => {
      expect(getCurrentSlotPts(150)).toBe(50);
    });

    it('210pt는 0 (2슬롯 정확히 채움)', () => {
      expect(getCurrentSlotPts(210)).toBe(0);
    });
  });

  describe('getNextSlotCost', () => {
    it('0pt에서 다음 슬롯 비용은 100', () => {
      expect(getNextSlotCost(0)).toBe(100);
    });

    it('100pt에서 다음 슬롯 비용은 110', () => {
      expect(getNextSlotCost(100)).toBe(110);
    });

    it('210pt에서 다음 슬롯 비용은 121', () => {
      expect(getNextSlotCost(210)).toBe(121);
    });
  });

  describe('getSlotProgress', () => {
    it('0pt는 진행률 0', () => {
      expect(getSlotProgress(0)).toBe(0);
    });

    it('50pt는 진행률 0.5', () => {
      expect(getSlotProgress(50)).toBe(0.5);
    });

    it('100pt는 진행률 0 (새 슬롯 시작)', () => {
      expect(getSlotProgress(100)).toBe(0);
    });

    it('155pt는 진행률 0.5 (110pt 중 55pt)', () => {
      expect(getSlotProgress(155)).toBe(0.5);
    });

    it('진행률은 0-1 사이', () => {
      expect(getSlotProgress(0)).toBeGreaterThanOrEqual(0);
      expect(getSlotProgress(1000)).toBeLessThanOrEqual(1);
    });
  });

  describe('getEtherBarRatio', () => {
    it('0pt는 비율 0', () => {
      expect(getEtherBarRatio(0)).toBe(0);
    });

    it('1슬롯 채움은 비율 0.1', () => {
      expect(getEtherBarRatio(100)).toBe(0.1);
    });

    it('5슬롯 채움은 비율 0.5', () => {
      expect(getEtherBarRatio(slotsToPts(5))).toBe(0.5);
    });

    it('10슬롯 채움은 비율 1.0', () => {
      expect(getEtherBarRatio(slotsToPts(10))).toBe(1);
    });

    it('부분 채움 포함', () => {
      // 150pt = 1슬롯(100pt) + 50pt, 다음 슬롯 비용 110pt
      // progress = 50/110 ≈ 0.4545
      // ratio = (1 + 0.4545) / 10 ≈ 0.1454
      expect(getEtherBarRatio(150)).toBeCloseTo(0.1454, 2);
    });

    it('비율은 0-1 사이', () => {
      expect(getEtherBarRatio(10000)).toBeLessThanOrEqual(1);
    });
  });

  describe('통합 테스트', () => {
    it('슬롯 시스템 전체 흐름', () => {
      let pts = 0;
      expect(calculateEtherSlots(pts)).toBe(0);
      expect(getCurrentSlotPts(pts)).toBe(0);
      expect(getNextSlotCost(pts)).toBe(100);

      pts = 50;
      expect(calculateEtherSlots(pts)).toBe(0);
      expect(getCurrentSlotPts(pts)).toBe(50);
      expect(getSlotProgress(pts)).toBe(0.5);

      pts = 100;
      expect(calculateEtherSlots(pts)).toBe(1);
      expect(getCurrentSlotPts(pts)).toBe(0);
      expect(getNextSlotCost(pts)).toBe(110);

      pts = 210;
      expect(calculateEtherSlots(pts)).toBe(2);
      expect(getCurrentSlotPts(pts)).toBe(0);
      expect(getNextSlotCost(pts)).toBe(121);
    });
  });
});
