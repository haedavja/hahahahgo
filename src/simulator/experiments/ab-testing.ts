/**
 * @file ab-testing.ts
 * @description A/B 테스트 프레임워크 - 카드 밸런스 실험 및 통계 분석
 */

import type { SimulationConfig, SimulationResult } from '../core/types';

// ==================== 타입 정의 ====================

export interface ExperimentVariant {
  id: string;
  name: string;
  description: string;
  changes: BalanceChange[];
  weight: number; // 트래픽 배분 (0-1)
}

export interface BalanceChange {
  type: 'card' | 'enemy' | 'relic' | 'token';
  targetId: string;
  property: string;
  value: number | string | boolean;
  originalValue?: number | string | boolean;
}

export interface Experiment {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  startDate: Date;
  endDate?: Date;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
  control: ExperimentVariant;
  variants: ExperimentVariant[];
  metrics: MetricDefinition[];
  minimumSampleSize: number;
  confidenceLevel: number; // 0.95 = 95%
}

export interface MetricDefinition {
  id: string;
  name: string;
  type: 'winRate' | 'avgTurns' | 'avgDamage' | 'avgHpRemaining' | 'cardUsage' | 'custom';
  higherIsBetter: boolean;
  minimumEffect: number; // 최소 감지 효과 크기
}

export interface ExperimentResults {
  experimentId: string;
  variantResults: Map<string, VariantResult>;
  winner: string | null;
  isSignificant: boolean;
  confidenceInterval: [number, number];
  pValue: number;
  effectSize: number;
  powerAnalysis: PowerAnalysis;
}

export interface VariantResult {
  variantId: string;
  sampleSize: number;
  metrics: Map<string, MetricResult>;
  rawData: SimulationResult[];
}

export interface MetricResult {
  metricId: string;
  mean: number;
  standardDeviation: number;
  median: number;
  percentiles: { p5: number; p25: number; p75: number; p95: number };
  confidenceInterval: [number, number];
}

export interface PowerAnalysis {
  requiredSampleSize: number;
  currentPower: number;
  minimumDetectableEffect: number;
}

export interface StatisticalTest {
  testType: 'tTest' | 'mannWhitneyU' | 'chiSquare' | 'anova';
  statistic: number;
  pValue: number;
  degreesOfFreedom: number;
}

// ==================== 통계 유틸리티 ====================

export class StatisticsUtils {
  /**
   * 평균 계산
   */
  static mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * 표준편차 계산
   */
  static standardDeviation(values: number[]): number {
    if (values.length < 2) return 0;
    const avg = this.mean(values);
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }

  /**
   * 중앙값 계산
   */
  static median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * 백분위수 계산
   */
  static percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  }

  /**
   * 독립 2표본 t-검정
   */
  static tTest(group1: number[], group2: number[]): StatisticalTest {
    const n1 = group1.length;
    const n2 = group2.length;
    const mean1 = this.mean(group1);
    const mean2 = this.mean(group2);
    const var1 = Math.pow(this.standardDeviation(group1), 2);
    const var2 = Math.pow(this.standardDeviation(group2), 2);

    // Welch's t-test (불등분산 가정)
    const se = Math.sqrt(var1 / n1 + var2 / n2);
    const tStatistic = se > 0 ? (mean1 - mean2) / se : 0;

    // 자유도 (Welch-Satterthwaite)
    const df =
      Math.pow(var1 / n1 + var2 / n2, 2) /
      (Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1));

    // p-value 근사 (정규분포 근사 사용)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(tStatistic)));

    return {
      testType: 'tTest',
      statistic: tStatistic,
      pValue,
      degreesOfFreedom: df,
    };
  }

  /**
   * 정규분포 CDF 근사
   */
  static normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y =
      1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  /**
   * 효과 크기 (Cohen's d)
   */
  static cohensD(group1: number[], group2: number[]): number {
    const mean1 = this.mean(group1);
    const mean2 = this.mean(group2);
    const sd1 = this.standardDeviation(group1);
    const sd2 = this.standardDeviation(group2);

    // 풀링된 표준편차
    const n1 = group1.length;
    const n2 = group2.length;
    const pooledSD = Math.sqrt(
      ((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2) / (n1 + n2 - 2)
    );

    return pooledSD > 0 ? (mean1 - mean2) / pooledSD : 0;
  }

  /**
   * 검정력 분석
   */
  static powerAnalysis(
    effectSize: number,
    sampleSize: number,
    alpha: number = 0.05
  ): number {
    // 근사 검정력 계산
    const zAlpha = this.normalInverse(1 - alpha / 2);
    const se = Math.sqrt(2 / sampleSize);
    const zBeta = (effectSize / se) - zAlpha;
    return this.normalCDF(zBeta);
  }

  /**
   * 역 정규분포 (근사)
   */
  static normalInverse(p: number): number {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;

    // Rational approximation
    const a = [
      -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
      1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0,
    ];
    const b = [
      -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
      6.680131188771972e1, -1.328068155288572e1,
    ];
    const c = [
      -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
      -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0,
    ];
    const d = [
      7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0,
      3.754408661907416e0,
    ];

    const pLow = 0.02425;
    const pHigh = 1 - pLow;

    let q, r;

    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (
        (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
      );
    } else if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      return (
        ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
      );
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return (
        -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
      );
    }
  }

  /**
   * 필요 샘플 크기 계산
   */
  static requiredSampleSize(
    effectSize: number,
    power: number = 0.8,
    alpha: number = 0.05
  ): number {
    const zAlpha = this.normalInverse(1 - alpha / 2);
    const zBeta = this.normalInverse(power);
    return Math.ceil(2 * Math.pow((zAlpha + zBeta) / effectSize, 2));
  }
}

// ==================== A/B 테스트 매니저 ====================

export class ABTestManager {
  private experiments: Map<string, Experiment> = new Map();
  private results: Map<string, ExperimentResults> = new Map();
  private simulator: { runSimulation: (config: SimulationConfig) => Promise<SimulationResult[]> };

  constructor(simulator: { runSimulation: (config: SimulationConfig) => Promise<SimulationResult[]> }) {
    this.simulator = simulator;
  }

  /**
   * 새 실험 생성
   */
  createExperiment(params: {
    name: string;
    description: string;
    hypothesis: string;
    control: ExperimentVariant;
    variants: ExperimentVariant[];
    metrics?: MetricDefinition[];
    minimumSampleSize?: number;
    confidenceLevel?: number;
  }): Experiment {
    const experiment: Experiment = {
      id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: params.name,
      description: params.description,
      hypothesis: params.hypothesis,
      startDate: new Date(),
      status: 'draft',
      control: params.control,
      variants: params.variants,
      metrics: params.metrics || this.getDefaultMetrics(),
      minimumSampleSize: params.minimumSampleSize || 100,
      confidenceLevel: params.confidenceLevel || 0.95,
    };

    this.experiments.set(experiment.id, experiment);
    return experiment;
  }

  /**
   * 기본 메트릭 정의
   */
  private getDefaultMetrics(): MetricDefinition[] {
    return [
      { id: 'winRate', name: '승률', type: 'winRate', higherIsBetter: true, minimumEffect: 0.05 },
      { id: 'avgTurns', name: '평균 턴 수', type: 'avgTurns', higherIsBetter: false, minimumEffect: 1 },
      { id: 'avgHpRemaining', name: '평균 잔여 체력', type: 'avgHpRemaining', higherIsBetter: true, minimumEffect: 5 },
    ];
  }

  /**
   * 실험 시작
   */
  startExperiment(experimentId: string): void {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) throw new Error(`Experiment not found: ${experimentId}`);

    experiment.status = 'running';
    experiment.startDate = new Date();
  }

  /**
   * 실험 실행 (시뮬레이션)
   */
  async runExperiment(
    experimentId: string,
    baseConfig: Omit<SimulationConfig, 'playerDeck'>,
    samplesPerVariant: number = 1000
  ): Promise<ExperimentResults> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) throw new Error(`Experiment not found: ${experimentId}`);

    const variantResults = new Map<string, VariantResult>();
    const allVariants = [experiment.control, ...experiment.variants];

    // 각 변형에 대해 시뮬레이션 실행
    for (const variant of allVariants) {
      console.log(`Running variant: ${variant.name}...`);

      // 밸런스 변경 적용
      const modifiedConfig = this.applyBalanceChanges(baseConfig, variant.changes);

      // 시뮬레이션 실행
      const results = await this.simulator.runSimulation({
        ...modifiedConfig,
        battles: samplesPerVariant,
      } as SimulationConfig);

      // 결과 집계
      const metricResults = this.calculateMetrics(results, experiment.metrics);

      variantResults.set(variant.id, {
        variantId: variant.id,
        sampleSize: results.length,
        metrics: metricResults,
        rawData: results,
      });
    }

    // 통계 분석
    const analysisResult = this.analyzeResults(experiment, variantResults);

    this.results.set(experimentId, analysisResult);
    return analysisResult;
  }

  /**
   * 밸런스 변경 적용
   */
  private applyBalanceChanges(
    config: Omit<SimulationConfig, 'playerDeck'>,
    changes: BalanceChange[]
  ): Omit<SimulationConfig, 'playerDeck'> {
    // 깊은 복사
    const modified = JSON.parse(JSON.stringify(config));

    for (const change of changes) {
      // 실제 적용은 simulator 내부에서 처리
      // 여기서는 메타데이터만 추가
      if (!modified.balanceOverrides) {
        modified.balanceOverrides = [];
      }
      modified.balanceOverrides.push(change);
    }

    return modified;
  }

  /**
   * 메트릭 계산
   */
  private calculateMetrics(
    results: SimulationResult[],
    metrics: MetricDefinition[]
  ): Map<string, MetricResult> {
    const metricResults = new Map<string, MetricResult>();

    for (const metric of metrics) {
      const values = this.extractMetricValues(results, metric);

      metricResults.set(metric.id, {
        metricId: metric.id,
        mean: StatisticsUtils.mean(values),
        standardDeviation: StatisticsUtils.standardDeviation(values),
        median: StatisticsUtils.median(values),
        percentiles: {
          p5: StatisticsUtils.percentile(values, 5),
          p25: StatisticsUtils.percentile(values, 25),
          p75: StatisticsUtils.percentile(values, 75),
          p95: StatisticsUtils.percentile(values, 95),
        },
        confidenceInterval: this.calculateCI(values, 0.95),
      });
    }

    return metricResults;
  }

  /**
   * 메트릭 값 추출
   */
  private extractMetricValues(results: SimulationResult[], metric: MetricDefinition): number[] {
    // Flatten all battle results from simulations
    const battleResults = results.flatMap(r => r.results);
    switch (metric.type) {
      case 'winRate':
        return battleResults.map(b => b.winner === 'player' ? 1 : 0);
      case 'avgTurns':
        return battleResults.map(b => b.turns);
      case 'avgHpRemaining':
        return battleResults.map(b => b.playerFinalHp);
      case 'avgDamage':
        return battleResults.map(b => b.playerDamageDealt || 0);
      default:
        return [];
    }
  }

  /**
   * 신뢰구간 계산
   */
  private calculateCI(values: number[], confidence: number): [number, number] {
    const mean = StatisticsUtils.mean(values);
    const sd = StatisticsUtils.standardDeviation(values);
    const n = values.length;
    const z = StatisticsUtils.normalInverse(1 - (1 - confidence) / 2);
    const margin = z * (sd / Math.sqrt(n));
    return [mean - margin, mean + margin];
  }

  /**
   * 결과 분석
   */
  private analyzeResults(
    experiment: Experiment,
    variantResults: Map<string, VariantResult>
  ): ExperimentResults {
    const controlResult = variantResults.get(experiment.control.id);
    if (!controlResult) throw new Error('Control result not found');

    // 주요 메트릭 (승률) 기준 분석
    const primaryMetric = experiment.metrics[0];
    const controlValues = this.extractMetricValues(controlResult.rawData, primaryMetric);

    let bestVariant: string | null = null;
    let bestPValue = 1;
    let bestEffectSize = 0;

    for (const variant of experiment.variants) {
      const variantResult = variantResults.get(variant.id);
      if (!variantResult) continue;

      const variantValues = this.extractMetricValues(variantResult.rawData, primaryMetric);
      const test = StatisticsUtils.tTest(variantValues, controlValues);
      const effectSize = StatisticsUtils.cohensD(variantValues, controlValues);

      if (test.pValue < bestPValue && effectSize > 0) {
        bestVariant = variant.id;
        bestPValue = test.pValue;
        bestEffectSize = effectSize;
      }
    }

    const isSignificant = bestPValue < (1 - experiment.confidenceLevel);
    const power = StatisticsUtils.powerAnalysis(
      bestEffectSize || 0.2,
      controlResult.sampleSize
    );

    return {
      experimentId: experiment.id,
      variantResults,
      winner: isSignificant ? bestVariant : null,
      isSignificant,
      confidenceInterval: this.calculateCI(controlValues, experiment.confidenceLevel),
      pValue: bestPValue,
      effectSize: bestEffectSize,
      powerAnalysis: {
        requiredSampleSize: StatisticsUtils.requiredSampleSize(bestEffectSize || 0.2),
        currentPower: power,
        minimumDetectableEffect: bestEffectSize || 0.2,
      },
    };
  }

  /**
   * 실험 결과 리포트 생성
   */
  generateReport(experimentId: string): string {
    const experiment = this.experiments.get(experimentId);
    const results = this.results.get(experimentId);

    if (!experiment || !results) {
      return 'Experiment or results not found';
    }

    const lines: string[] = [
      '═══════════════════════════════════════════════════════',
      `📊 A/B 테스트 리포트: ${experiment.name}`,
      '═══════════════════════════════════════════════════════',
      '',
      `📋 가설: ${experiment.hypothesis}`,
      `📅 시작일: ${experiment.startDate.toISOString()}`,
      `🎯 신뢰수준: ${experiment.confidenceLevel * 100}%`,
      '',
      '───────────────────────────────────────────────────────',
      '📈 변형별 결과',
      '───────────────────────────────────────────────────────',
    ];

    const allVariants = [experiment.control, ...experiment.variants];
    for (const variant of allVariants) {
      const variantResult = results.variantResults.get(variant.id);
      if (!variantResult) continue;

      const isControl = variant.id === experiment.control.id;
      lines.push(`\n${isControl ? '🔵' : '🟢'} ${variant.name} ${isControl ? '(대조군)' : ''}`);
      lines.push(`   샘플 크기: ${variantResult.sampleSize}`);

      for (const [metricId, metricResult] of variantResult.metrics) {
        const metricDef = experiment.metrics.find(m => m.id === metricId);
        lines.push(`   ${metricDef?.name || metricId}: ${(metricResult.mean * 100).toFixed(2)}% (±${(metricResult.standardDeviation * 100).toFixed(2)}%)`);
      }
    }

    lines.push('');
    lines.push('───────────────────────────────────────────────────────');
    lines.push('📊 통계 분석');
    lines.push('───────────────────────────────────────────────────────');
    lines.push(`p-value: ${results.pValue.toFixed(6)}`);
    lines.push(`효과 크기 (Cohen's d): ${results.effectSize.toFixed(3)}`);
    lines.push(`검정력: ${(results.powerAnalysis.currentPower * 100).toFixed(1)}%`);
    lines.push(`필요 샘플 크기: ${results.powerAnalysis.requiredSampleSize}`);
    lines.push('');

    if (results.isSignificant) {
      const winner = [...experiment.variants, experiment.control].find(v => v.id === results.winner);
      lines.push(`✅ 통계적으로 유의미한 차이 발견!`);
      lines.push(`🏆 승자: ${winner?.name || 'Unknown'}`);
    } else {
      lines.push(`⚠️ 통계적으로 유의미한 차이 없음`);
      lines.push(`   (더 많은 샘플이 필요할 수 있습니다)`);
    }

    lines.push('');
    lines.push('═══════════════════════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * 모든 실험 목록
   */
  listExperiments(): Experiment[] {
    return Array.from(this.experiments.values());
  }

  /**
   * 실험 상태 업데이트
   */
  updateExperimentStatus(experimentId: string, status: Experiment['status']): void {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) throw new Error(`Experiment not found: ${experimentId}`);

    experiment.status = status;
    if (status === 'completed') {
      experiment.endDate = new Date();
    }
  }
}

// ==================== 프리셋 실험 ====================

export const EXPERIMENT_PRESETS = {
  /**
   * 카드 공격력 밸런스 테스트
   */
  cardDamageBalance: (cardId: string, originalDamage: number, testDamage: number) => ({
    name: `${cardId} 공격력 조정 테스트`,
    description: `${cardId}의 공격력을 ${originalDamage}에서 ${testDamage}으로 조정했을 때의 영향 분석`,
    hypothesis: `${cardId}의 공격력을 ${testDamage}으로 조정하면 승률이 개선될 것이다`,
    control: {
      id: 'control',
      name: '현재 밸런스',
      description: '변경 없음',
      changes: [],
      weight: 0.5,
    },
    variants: [
      {
        id: 'test',
        name: `공격력 ${testDamage}`,
        description: `${cardId} 공격력을 ${testDamage}으로 변경`,
        changes: [
          {
            type: 'card' as const,
            targetId: cardId,
            property: 'attack',
            value: testDamage,
            originalValue: originalDamage,
          },
        ],
        weight: 0.5,
      },
    ],
  }),

  /**
   * 적 체력 밸런스 테스트
   */
  enemyHpBalance: (enemyId: string, originalHp: number, testHp: number) => ({
    name: `${enemyId} 체력 조정 테스트`,
    description: `${enemyId}의 체력을 ${originalHp}에서 ${testHp}으로 조정했을 때의 영향 분석`,
    hypothesis: `${enemyId}의 체력을 ${testHp}으로 조정하면 전투 밸런스가 개선될 것이다`,
    control: {
      id: 'control',
      name: '현재 밸런스',
      description: '변경 없음',
      changes: [],
      weight: 0.5,
    },
    variants: [
      {
        id: 'test',
        name: `체력 ${testHp}`,
        description: `${enemyId} 체력을 ${testHp}으로 변경`,
        changes: [
          {
            type: 'enemy' as const,
            targetId: enemyId,
            property: 'hp',
            value: testHp,
            originalValue: originalHp,
          },
        ],
        weight: 0.5,
      },
    ],
  }),

  /**
   * 멀티 변형 테스트 (여러 밸런스 옵션 비교)
   */
  multiVariantTest: (
    name: string,
    variants: Array<{
      name: string;
      changes: BalanceChange[];
    }>
  ) => ({
    name,
    description: `${variants.length}개의 밸런스 옵션 비교`,
    hypothesis: '최적의 밸런스 옵션을 찾는다',
    control: {
      id: 'control',
      name: '현재 밸런스',
      description: '변경 없음',
      changes: [],
      weight: 1 / (variants.length + 1),
    },
    variants: variants.map((v, i) => ({
      id: `variant_${i}`,
      name: v.name,
      description: v.name,
      changes: v.changes,
      weight: 1 / (variants.length + 1),
    })),
  }),
};
