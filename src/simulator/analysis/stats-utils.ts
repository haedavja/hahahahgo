/**
 * @file stats-utils.ts
 * @description 통계 분석을 위한 유틸리티 함수
 *
 * - 신뢰도 레벨 시스템
 * - 가중 평균 계산
 * - 신뢰 구간 계산
 * - 통계적 유의성 검정
 */

// ==================== 신뢰도 레벨 시스템 ====================

/** 신뢰도 레벨 */
export type ConfidenceLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

/** 신뢰도 레벨 설정 */
export interface ConfidenceLevelConfig {
  /** 샘플 수 */
  sampleSize: number;
  /** 신뢰도 레벨 */
  level: ConfidenceLevel;
  /** 신뢰도 점수 (0-1) */
  score: number;
  /** 권장 최소 샘플 */
  requiredForReliable: number;
  /** 경고 메시지 */
  warning?: string;
}

/**
 * 샘플 크기 기반 신뢰도 레벨 계산
 * @param sampleSize 샘플 수
 * @returns 신뢰도 레벨 설정
 */
export function getConfidenceLevel(sampleSize: number): ConfidenceLevelConfig {
  if (sampleSize >= 100) {
    return {
      sampleSize,
      level: 'very_high',
      score: 0.95,
      requiredForReliable: 100,
    };
  }
  if (sampleSize >= 50) {
    return {
      sampleSize,
      level: 'high',
      score: 0.85,
      requiredForReliable: 50,
    };
  }
  if (sampleSize >= 20) {
    return {
      sampleSize,
      level: 'medium',
      score: 0.7,
      requiredForReliable: 20,
    };
  }
  if (sampleSize >= 10) {
    return {
      sampleSize,
      level: 'low',
      score: 0.5,
      requiredForReliable: 10,
      warning: '샘플 수가 적어 결과가 불안정할 수 있습니다',
    };
  }
  return {
    sampleSize,
    level: 'very_low',
    score: 0.3,
    requiredForReliable: 5,
    warning: '샘플 수가 매우 적어 신뢰하기 어렵습니다',
  };
}

/**
 * 신뢰도 레벨을 한글 레이블로 변환
 */
export function getConfidenceLevelLabel(level: ConfidenceLevel): string {
  const labels: Record<ConfidenceLevel, string> = {
    very_low: '매우 낮음',
    low: '낮음',
    medium: '보통',
    high: '높음',
    very_high: '매우 높음',
  };
  return labels[level];
}

// ==================== 신뢰 구간 계산 ====================

/** 신뢰 구간 결과 */
export interface ConfidenceInterval {
  /** 추정값 */
  estimate: number;
  /** 하한 */
  lower: number;
  /** 상한 */
  upper: number;
  /** 신뢰 수준 (0.95 = 95%) */
  confidenceLevel: number;
  /** 오차 범위 */
  marginOfError: number;
}

/**
 * 비율에 대한 신뢰 구간 계산 (Wilson Score Interval)
 * 작은 샘플에서도 안정적인 결과를 제공
 *
 * @param successes 성공 횟수
 * @param total 총 시행 횟수
 * @param confidenceLevel 신뢰 수준 (기본 0.95)
 * @returns 신뢰 구간
 */
export function calculateProportionCI(
  successes: number,
  total: number,
  confidenceLevel: number = 0.95
): ConfidenceInterval {
  if (total === 0) {
    return {
      estimate: 0,
      lower: 0,
      upper: 0,
      confidenceLevel,
      marginOfError: 0,
    };
  }

  const p = successes / total;
  const z = getZScore(confidenceLevel);
  const z2 = z * z;
  const n = total;

  // Wilson Score Interval
  const denominator = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denominator;
  const spread = (z / denominator) * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n);

  const lower = Math.max(0, center - spread);
  const upper = Math.min(1, center + spread);

  return {
    estimate: p,
    lower,
    upper,
    confidenceLevel,
    marginOfError: spread,
  };
}

/**
 * 평균에 대한 신뢰 구간 계산
 *
 * @param mean 평균
 * @param stdDev 표준편차
 * @param n 샘플 수
 * @param confidenceLevel 신뢰 수준 (기본 0.95)
 * @returns 신뢰 구간
 */
export function calculateMeanCI(
  mean: number,
  stdDev: number,
  n: number,
  confidenceLevel: number = 0.95
): ConfidenceInterval {
  if (n === 0) {
    return {
      estimate: mean,
      lower: mean,
      upper: mean,
      confidenceLevel,
      marginOfError: 0,
    };
  }

  const z = getZScore(confidenceLevel);
  const standardError = stdDev / Math.sqrt(n);
  const marginOfError = z * standardError;

  return {
    estimate: mean,
    lower: mean - marginOfError,
    upper: mean + marginOfError,
    confidenceLevel,
    marginOfError,
  };
}

/**
 * 신뢰 수준에 따른 Z-score 반환
 */
function getZScore(confidenceLevel: number): number {
  // 일반적인 신뢰 수준에 대한 Z-score
  const zScores: Record<number, number> = {
    0.90: 1.645,
    0.95: 1.96,
    0.99: 2.576,
  };
  return zScores[confidenceLevel] || 1.96;
}

// ==================== 가중 평균 계산 ====================

/** 가중치가 적용된 값 */
export interface WeightedValue {
  value: number;
  weight: number;
}

/**
 * 가중 평균 계산
 *
 * @param values 가중치가 적용된 값 배열
 * @returns 가중 평균
 */
export function calculateWeightedMean(values: WeightedValue[]): number {
  if (values.length === 0) return 0;

  const totalWeight = values.reduce((sum, v) => sum + v.weight, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = values.reduce((sum, v) => sum + v.value * v.weight, 0);
  return weightedSum / totalWeight;
}

/**
 * 층 기반 가중치 계산
 * 후반부일수록 더 높은 가중치
 *
 * @param floor 현재 층
 * @param maxFloor 최대 층 (기본 11)
 * @returns 가중치 (0.5 ~ 1.5)
 */
export function getFloorWeight(floor: number, maxFloor: number = 11): number {
  // 선형 스케일: 층 1 = 0.5, 층 maxFloor = 1.5
  return 0.5 + (floor / maxFloor);
}

/**
 * 난이도 기반 가중치 계산
 * 어려운 전투일수록 더 높은 가중치
 *
 * @param winRate 해당 전투의 승률
 * @param avgWinRate 전체 평균 승률
 * @returns 가중치 (0.5 ~ 2.0)
 */
export function getDifficultyWeight(winRate: number, avgWinRate: number = 0.5): number {
  // 승률이 낮을수록(어려울수록) 높은 가중치
  const diff = avgWinRate - winRate;
  return Math.max(0.5, Math.min(2.0, 1 + diff * 2));
}

/**
 * 보스/엘리트 가중치
 *
 * @param isBoss 보스 여부
 * @param isElite 엘리트 여부
 * @returns 가중치 (1.0 ~ 2.0)
 */
export function getEnemyTypeWeight(isBoss: boolean, isElite: boolean = false): number {
  if (isBoss) return 2.0;
  if (isElite) return 1.5;
  return 1.0;
}

// ==================== 통계적 유의성 검정 ====================

/** 통계적 유의성 결과 */
export interface SignificanceResult {
  /** 유의한지 여부 */
  isSignificant: boolean;
  /** p-value */
  pValue: number;
  /** 효과 크기 (Cohen's d 또는 비율 차이) */
  effectSize: number;
  /** 효과 크기 해석 */
  effectInterpretation: 'negligible' | 'small' | 'medium' | 'large';
}

/**
 * 두 비율의 유의성 검정 (Two-proportion z-test)
 *
 * @param p1 첫 번째 비율
 * @param n1 첫 번째 그룹 샘플 수
 * @param p2 두 번째 비율
 * @param n2 두 번째 그룹 샘플 수
 * @param alpha 유의 수준 (기본 0.05)
 * @returns 유의성 검정 결과
 */
export function testProportionSignificance(
  p1: number,
  n1: number,
  p2: number,
  n2: number,
  alpha: number = 0.05
): SignificanceResult {
  const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
  const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));

  if (se === 0) {
    return {
      isSignificant: false,
      pValue: 1,
      effectSize: 0,
      effectInterpretation: 'negligible',
    };
  }

  const z = Math.abs(p1 - p2) / se;
  const pValue = 2 * (1 - normalCDF(z));
  const effectSize = Math.abs(p1 - p2);

  return {
    isSignificant: pValue < alpha,
    pValue,
    effectSize,
    effectInterpretation: interpretProportionEffect(effectSize),
  };
}

/**
 * 비율 효과 크기 해석
 */
function interpretProportionEffect(
  effectSize: number
): 'negligible' | 'small' | 'medium' | 'large' {
  if (effectSize < 0.02) return 'negligible';
  if (effectSize < 0.05) return 'small';
  if (effectSize < 0.1) return 'medium';
  return 'large';
}

/**
 * 표준 정규 분포 누적 분포 함수 (CDF)
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

// ==================== Simpson's Paradox 감지 ====================

/**
 * Simpson's Paradox 감지
 * 전체 데이터와 하위 그룹에서 상관관계가 반대인 경우
 *
 * @param overallCorrelation 전체 상관관계 (양수 = 양의 상관, 음수 = 음의 상관)
 * @param subgroupCorrelations 하위 그룹별 상관관계
 * @returns 역설 감지 여부와 설명
 */
export function detectSimpsonParadox(
  overallCorrelation: number,
  subgroupCorrelations: number[]
): { detected: boolean; explanation?: string } {
  if (subgroupCorrelations.length === 0) {
    return { detected: false };
  }

  const overallSign = Math.sign(overallCorrelation);
  const oppositeCount = subgroupCorrelations.filter(
    c => Math.sign(c) !== overallSign && Math.abs(c) > 0.05
  ).length;

  if (oppositeCount >= subgroupCorrelations.length / 2) {
    return {
      detected: true,
      explanation: `전체 상관관계(${overallCorrelation > 0 ? '양' : '음'})와 ` +
        `${oppositeCount}/${subgroupCorrelations.length}개 하위 그룹이 반대 방향을 보입니다. ` +
        `숨겨진 변수(교란 변수)가 존재할 수 있습니다.`,
    };
  }

  return { detected: false };
}

// ==================== 메타 다양성 지표 ====================

/**
 * Gini 계수 계산 (불평등 지수)
 * 0 = 완전 평등, 1 = 완전 불평등
 *
 * @param values 값 배열 (사용률 등)
 * @returns Gini 계수
 */
export function calculateGini(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const total = sorted.reduce((a, b) => a + b, 0);

  if (total === 0) return 0;

  let sumOfDifferences = 0;
  for (let i = 0; i < n; i++) {
    sumOfDifferences += (2 * (i + 1) - n - 1) * sorted[i];
  }

  return sumOfDifferences / (n * total);
}

/**
 * 다양성 점수 계산 (1 - Gini)
 * 0 = 불균형, 1 = 균형
 */
export function calculateDiversityScore(values: number[]): number {
  return 1 - calculateGini(values);
}

/**
 * 상위 N% 집중도 계산
 *
 * @param values 값 배열
 * @param topPercent 상위 비율 (0.1 = 10%)
 * @returns 상위 N%가 차지하는 비율
 */
export function calculateTopConcentration(values: number[], topPercent: number = 0.1): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => b - a);
  const total = sorted.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;

  const topCount = Math.max(1, Math.ceil(sorted.length * topPercent));
  const topSum = sorted.slice(0, topCount).reduce((a, b) => a + b, 0);

  return topSum / total;
}

// ==================== 추세 분석 ====================

/**
 * 간단한 선형 회귀로 추세 계산
 *
 * @param values 시계열 값 (인덱스 = 시간)
 * @returns 기울기 (양수 = 상승 추세, 음수 = 하락 추세)
 */
export function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0;

  const n = values.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope;
}

// ==================== 내보내기 타입 ====================

export interface StatisticalSummary {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  count: number;
  confidence: ConfidenceLevelConfig;
  ci: ConfidenceInterval;
}

/**
 * 값 배열의 통계 요약
 */
export function summarizeStatistics(values: number[]): StatisticalSummary {
  if (values.length === 0) {
    return {
      mean: 0,
      median: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      count: 0,
      confidence: getConfidenceLevel(0),
      ci: { estimate: 0, lower: 0, upper: 0, confidenceLevel: 0.95, marginOfError: 0 },
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  const variance = sorted.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  return {
    mean,
    median,
    stdDev,
    min: sorted[0],
    max: sorted[n - 1],
    count: n,
    confidence: getConfidenceLevel(n),
    ci: calculateMeanCI(mean, stdDev, n),
  };
}
