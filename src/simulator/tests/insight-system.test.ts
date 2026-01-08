/**
 * @file insight-system.test.ts
 * @description 통찰 시스템 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  calculateInsightLevel,
  getInsightLevelInfo,
  getInsightReveal,
  INSIGHT_LEVELS,
  type InsightCalculationParams,
} from '../core/insight-system';

describe('insight-system', () => {
  describe('INSIGHT_LEVELS 상수', () => {
    it('레벨 -3부터 +3까지 정의됨', () => {
      expect(INSIGHT_LEVELS[-3]).toBeDefined();
      expect(INSIGHT_LEVELS[-2]).toBeDefined();
      expect(INSIGHT_LEVELS[-1]).toBeDefined();
      expect(INSIGHT_LEVELS[0]).toBeDefined();
      expect(INSIGHT_LEVELS[1]).toBeDefined();
      expect(INSIGHT_LEVELS[2]).toBeDefined();
      expect(INSIGHT_LEVELS[3]).toBeDefined();
    });

    it('각 레벨에 이름과 설명이 있음', () => {
      for (let level = -3; level <= 3; level++) {
        expect(INSIGHT_LEVELS[level].level).toBe(level);
        expect(INSIGHT_LEVELS[level].name).toBeTruthy();
        expect(INSIGHT_LEVELS[level].description).toBeTruthy();
      }
    });

    it('레벨별 이름 확인', () => {
      expect(INSIGHT_LEVELS[-3].name).toBe('망각');
      expect(INSIGHT_LEVELS[-2].name).toBe('미련');
      expect(INSIGHT_LEVELS[-1].name).toBe('우둔');
      expect(INSIGHT_LEVELS[0].name).toBe('평온');
      expect(INSIGHT_LEVELS[1].name).toBe('예측');
      expect(INSIGHT_LEVELS[2].name).toBe('독심');
      expect(INSIGHT_LEVELS[3].name).toBe('혜안');
    });
  });

  describe('calculateInsightLevel', () => {
    const baseParams: InsightCalculationParams = {
      playerInsight: 0,
      enemyShroud: 0,
      insightPenalty: 0,
      anomalyReduction: 0,
      veilCount: 0,
    };

    it('기본 통찰 레벨 계산', () => {
      expect(calculateInsightLevel({ ...baseParams, playerInsight: 0 })).toBe(0);
      expect(calculateInsightLevel({ ...baseParams, playerInsight: 2 })).toBe(2);
      expect(calculateInsightLevel({ ...baseParams, playerInsight: -1 })).toBe(-1);
    });

    it('shroud 토큰이 통찰 감소', () => {
      expect(calculateInsightLevel({
        ...baseParams,
        playerInsight: 2,
        enemyShroud: 1,
      })).toBe(1);

      expect(calculateInsightLevel({
        ...baseParams,
        playerInsight: 0,
        enemyShroud: 2,
      })).toBe(-2);
    });

    it('페널티가 통찰 감소', () => {
      expect(calculateInsightLevel({
        ...baseParams,
        playerInsight: 1,
        insightPenalty: 2,
      })).toBe(-1);
    });

    it('이변 감소가 통찰 감소', () => {
      expect(calculateInsightLevel({
        ...baseParams,
        playerInsight: 3,
        anomalyReduction: 2,
      })).toBe(1);
    });

    it('veil 효과가 통찰 감소', () => {
      expect(calculateInsightLevel({
        ...baseParams,
        playerInsight: 2,
        veilCount: 3,
      })).toBe(-1);
    });

    it('모든 감소 효과 누적', () => {
      expect(calculateInsightLevel({
        playerInsight: 3,
        enemyShroud: 1,
        insightPenalty: 1,
        anomalyReduction: 1,
        veilCount: 1,
      })).toBe(-1);
    });

    it('-3 이하로 내려가지 않음', () => {
      expect(calculateInsightLevel({
        ...baseParams,
        playerInsight: -10,
      })).toBe(-3);

      expect(calculateInsightLevel({
        ...baseParams,
        playerInsight: 0,
        enemyShroud: 10,
      })).toBe(-3);
    });

    it('+3 이상으로 올라가지 않음', () => {
      expect(calculateInsightLevel({
        ...baseParams,
        playerInsight: 10,
      })).toBe(3);
    });

    it('개발자 모드 감쇠 레벨 우선 적용', () => {
      expect(calculateInsightLevel({
        ...baseParams,
        playerInsight: 3,
        devDulledLevel: 2,
      })).toBe(-2);

      // devDulledLevel: 0은 -0을 반환하지만 수학적으로 0과 동일
      const result = calculateInsightLevel({
        ...baseParams,
        playerInsight: -3,
        devDulledLevel: 0,
      });
      expect(result + 0).toBe(0); // -0 + 0 = 0으로 변환
    });
  });

  describe('getInsightLevelInfo', () => {
    it('유효한 레벨의 정보 반환', () => {
      const info = getInsightLevelInfo(0);
      expect(info.level).toBe(0);
      expect(info.name).toBe('평온');
    });

    it('범위 외 레벨은 클램프됨', () => {
      expect(getInsightLevelInfo(-5).level).toBe(-3);
      expect(getInsightLevelInfo(10).level).toBe(3);
    });
  });

  describe('getInsightReveal', () => {
    describe('레벨 -3 (망각)', () => {
      it('select 단계에서 적 정보 숨김', () => {
        const reveal = getInsightReveal(-3, 'select');
        expect(reveal.showEnemyHp).toBe(false);
        expect(reveal.showEnemyEther).toBe(false);
        expect(reveal.showTimeline).toBe(false);
        expect(reveal.revealedCardCount).toBe(0);
      });
    });

    describe('레벨 -2 (미련)', () => {
      it('resolve 단계에서 타임라인 숨김', () => {
        const reveal = getInsightReveal(-2, 'resolve');
        expect(reveal.showTimeline).toBe(false);
      });
    });

    describe('레벨 -1 (우둔)', () => {
      it('respond 단계에서 타임라인 숨김', () => {
        const reveal = getInsightReveal(-1, 'respond');
        expect(reveal.showTimeline).toBe(false);
      });
    });

    describe('레벨 0 (평온)', () => {
      it('select 단계에서 카드 3개 공개', () => {
        const reveal = getInsightReveal(0, 'select');
        expect(reveal.revealedCardCount).toBe(3);
        expect(reveal.visible).toBe(true);
      });
    });

    describe('레벨 1 (예측)', () => {
      it('select 단계에서 카드 4개 공개', () => {
        const reveal = getInsightReveal(1, 'select');
        expect(reveal.revealedCardCount).toBe(4);
      });
    });

    describe('레벨 2 (독심)', () => {
      it('모든 카드 공개', () => {
        const reveal = getInsightReveal(2, 'select');
        expect(reveal.revealedCardCount).toBe(Infinity);
        expect(reveal.showCardDetails).toBe(false);
      });
    });

    describe('레벨 3 (혜안)', () => {
      it('모든 카드 + 상세 정보 공개', () => {
        const reveal = getInsightReveal(3, 'select');
        expect(reveal.revealedCardCount).toBe(Infinity);
        expect(reveal.showCardDetails).toBe(true);
      });
    });

    it('범위 외 레벨은 클램프됨', () => {
      const reveal1 = getInsightReveal(-10, 'select');
      expect(reveal1.level).toBe(-3);

      const reveal2 = getInsightReveal(10, 'select');
      expect(reveal2.level).toBe(3);
    });
  });
});
