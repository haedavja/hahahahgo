/**
 * @file stats-utils.test.ts
 * @description 통계 유틸리티 함수 단위 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  getConfidenceLevel,
  getConfidenceLevelLabel,
  calculateProportionCI,
  calculateMeanCI,
  calculateWeightedMean,
  getFloorWeight,
  getDifficultyWeight,
  getEnemyTypeWeight,
  testProportionSignificance,
  detectSimpsonParadox,
  calculateGini,
  calculateDiversityScore,
  calculateTopConcentration,
  calculateTrend,
  summarizeStatistics,
} from '../analysis/stats-utils';

describe('신뢰도 레벨 시스템', () => {
  describe('getConfidenceLevel', () => {
    it('샘플 수 100 이상: very_high', () => {
      const result = getConfidenceLevel(100);
      expect(result.level).toBe('very_high');
      expect(result.score).toBe(0.95);
    });

    it('샘플 수 50-99: high', () => {
      const result = getConfidenceLevel(75);
      expect(result.level).toBe('high');
      expect(result.score).toBe(0.85);
    });

    it('샘플 수 20-49: medium', () => {
      const result = getConfidenceLevel(30);
      expect(result.level).toBe('medium');
      expect(result.score).toBe(0.7);
    });

    it('샘플 수 10-19: low (경고 포함)', () => {
      const result = getConfidenceLevel(15);
      expect(result.level).toBe('low');
      expect(result.warning).toBeDefined();
    });

    it('샘플 수 10 미만: very_low (경고 포함)', () => {
      const result = getConfidenceLevel(5);
      expect(result.level).toBe('very_low');
      expect(result.warning).toBeDefined();
    });
  });

  describe('getConfidenceLevelLabel', () => {
    it('한글 레이블 반환', () => {
      expect(getConfidenceLevelLabel('very_high')).toBe('매우 높음');
      expect(getConfidenceLevelLabel('high')).toBe('높음');
      expect(getConfidenceLevelLabel('medium')).toBe('보통');
      expect(getConfidenceLevelLabel('low')).toBe('낮음');
      expect(getConfidenceLevelLabel('very_low')).toBe('매우 낮음');
    });
  });
});

describe('신뢰 구간 계산', () => {
  describe('calculateProportionCI', () => {
    it('50% 성공률 (100회 시행)', () => {
      const ci = calculateProportionCI(50, 100);
      expect(ci.estimate).toBe(0.5);
      expect(ci.lower).toBeGreaterThan(0.4);
      expect(ci.upper).toBeLessThan(0.6);
      expect(ci.confidenceLevel).toBe(0.95);
    });

    it('빈 데이터 처리', () => {
      const ci = calculateProportionCI(0, 0);
      expect(ci.estimate).toBe(0);
      expect(ci.lower).toBe(0);
      expect(ci.upper).toBe(0);
    });

    it('경계값 처리 (0% 성공률)', () => {
      const ci = calculateProportionCI(0, 100);
      expect(ci.estimate).toBe(0);
      expect(ci.lower).toBe(0);
    });

    it('경계값 처리 (100% 성공률)', () => {
      const ci = calculateProportionCI(100, 100);
      expect(ci.estimate).toBe(1);
      expect(ci.upper).toBeCloseTo(1, 5); // 부동소수점 정밀도 허용
    });
  });

  describe('calculateMeanCI', () => {
    it('평균 50, 표준편차 10, 샘플 100', () => {
      const ci = calculateMeanCI(50, 10, 100);
      expect(ci.estimate).toBe(50);
      expect(ci.marginOfError).toBeCloseTo(1.96, 1);
      expect(ci.lower).toBeCloseTo(48.04, 1);
      expect(ci.upper).toBeCloseTo(51.96, 1);
    });

    it('빈 데이터 처리', () => {
      const ci = calculateMeanCI(0, 0, 0);
      expect(ci.marginOfError).toBe(0);
    });
  });
});

describe('가중 평균 계산', () => {
  describe('calculateWeightedMean', () => {
    it('가중 평균 계산', () => {
      const values = [
        { value: 10, weight: 1 },
        { value: 20, weight: 2 },
        { value: 30, weight: 3 },
      ];
      // (10*1 + 20*2 + 30*3) / (1+2+3) = 140/6 = 23.33...
      expect(calculateWeightedMean(values)).toBeCloseTo(23.33, 1);
    });

    it('빈 배열', () => {
      expect(calculateWeightedMean([])).toBe(0);
    });

    it('모든 가중치가 0', () => {
      const values = [
        { value: 10, weight: 0 },
        { value: 20, weight: 0 },
      ];
      expect(calculateWeightedMean(values)).toBe(0);
    });
  });

  describe('getFloorWeight', () => {
    it('층 1: 낮은 가중치', () => {
      expect(getFloorWeight(1, 11)).toBeCloseTo(0.59, 1);
    });

    it('층 11: 높은 가중치', () => {
      expect(getFloorWeight(11, 11)).toBeCloseTo(1.5, 1);
    });
  });

  describe('getDifficultyWeight', () => {
    it('승률이 낮으면 높은 가중치', () => {
      expect(getDifficultyWeight(0.3, 0.5)).toBeGreaterThan(1);
    });

    it('승률이 높으면 낮은 가중치', () => {
      expect(getDifficultyWeight(0.7, 0.5)).toBeLessThan(1);
    });
  });

  describe('getEnemyTypeWeight', () => {
    it('보스: 2.0', () => {
      expect(getEnemyTypeWeight(true)).toBe(2.0);
    });

    it('엘리트: 1.5', () => {
      expect(getEnemyTypeWeight(false, true)).toBe(1.5);
    });

    it('일반: 1.0', () => {
      expect(getEnemyTypeWeight(false, false)).toBe(1.0);
    });
  });
});

describe('통계적 유의성 검정', () => {
  describe('testProportionSignificance', () => {
    it('유의한 차이 (50% vs 70%)', () => {
      const result = testProportionSignificance(0.5, 100, 0.7, 100);
      expect(result.isSignificant).toBe(true);
      expect(result.pValue).toBeLessThan(0.05);
      expect(result.effectSize).toBeCloseTo(0.2, 2);
    });

    it('유의하지 않은 차이 (50% vs 52%)', () => {
      const result = testProportionSignificance(0.5, 100, 0.52, 100);
      expect(result.isSignificant).toBe(false);
    });

    it('효과 크기 해석', () => {
      // large: 0.1 이상
      const largeEffect = testProportionSignificance(0.3, 100, 0.5, 100);
      expect(largeEffect.effectInterpretation).toBe('large');

      // small: 0.02-0.05
      const smallEffect = testProportionSignificance(0.5, 100, 0.53, 100);
      expect(smallEffect.effectInterpretation).toBe('small');
    });
  });
});

describe('Simpson\'s Paradox 감지', () => {
  describe('detectSimpsonParadox', () => {
    it('역설 감지: 전체 양의 상관, 하위그룹 음의 상관', () => {
      const result = detectSimpsonParadox(0.5, [-0.3, -0.4, -0.2]);
      expect(result.detected).toBe(true);
      expect(result.explanation).toBeDefined();
    });

    it('역설 없음: 일관된 방향', () => {
      const result = detectSimpsonParadox(0.5, [0.3, 0.4, 0.2]);
      expect(result.detected).toBe(false);
    });

    it('빈 하위그룹', () => {
      const result = detectSimpsonParadox(0.5, []);
      expect(result.detected).toBe(false);
    });
  });
});

describe('다양성 지표', () => {
  describe('calculateGini', () => {
    it('완전 균등 분포: Gini = 0', () => {
      const values = [10, 10, 10, 10];
      expect(calculateGini(values)).toBeCloseTo(0, 2);
    });

    it('불균등 분포: Gini > 0', () => {
      const values = [1, 5, 10, 100];
      expect(calculateGini(values)).toBeGreaterThan(0);
    });

    it('빈 배열', () => {
      expect(calculateGini([])).toBe(0);
    });
  });

  describe('calculateDiversityScore', () => {
    it('다양성 = 1 - Gini', () => {
      const values = [10, 10, 10, 10];
      expect(calculateDiversityScore(values)).toBeCloseTo(1, 2);
    });
  });

  describe('calculateTopConcentration', () => {
    it('상위 10% 집중도', () => {
      const values = [100, 10, 10, 10, 10, 10, 10, 10, 10, 10]; // 100 is top 10%
      // Total: 190, Top 10% (1개): 100
      expect(calculateTopConcentration(values, 0.1)).toBeCloseTo(100 / 190, 2);
    });

    it('빈 배열', () => {
      expect(calculateTopConcentration([], 0.1)).toBe(0);
    });
  });
});

describe('추세 분석', () => {
  describe('calculateTrend', () => {
    it('상승 추세', () => {
      const values = [1, 2, 3, 4, 5];
      expect(calculateTrend(values)).toBeGreaterThan(0);
    });

    it('하락 추세', () => {
      const values = [5, 4, 3, 2, 1];
      expect(calculateTrend(values)).toBeLessThan(0);
    });

    it('평탄한 추세', () => {
      const values = [5, 5, 5, 5, 5];
      expect(calculateTrend(values)).toBeCloseTo(0, 2);
    });

    it('데이터 부족', () => {
      expect(calculateTrend([1])).toBe(0);
      expect(calculateTrend([])).toBe(0);
    });
  });
});

describe('통계 요약', () => {
  describe('summarizeStatistics', () => {
    it('기본 통계 계산', () => {
      const values = [1, 2, 3, 4, 5];
      const summary = summarizeStatistics(values);

      expect(summary.mean).toBe(3);
      expect(summary.median).toBe(3);
      expect(summary.min).toBe(1);
      expect(summary.max).toBe(5);
      expect(summary.count).toBe(5);
      expect(summary.stdDev).toBeGreaterThan(0);
    });

    it('짝수 개 중앙값', () => {
      const values = [1, 2, 3, 4];
      const summary = summarizeStatistics(values);
      expect(summary.median).toBe(2.5);
    });

    it('빈 배열', () => {
      const summary = summarizeStatistics([]);
      expect(summary.count).toBe(0);
      expect(summary.mean).toBe(0);
    });

    it('신뢰도 및 신뢰구간 포함', () => {
      const values = Array(100).fill(50);
      const summary = summarizeStatistics(values);

      expect(summary.confidence.level).toBe('very_high');
      expect(summary.ci.estimate).toBe(50);
    });
  });
});
