/**
 * @file ab-test-runner.ts
 * @description 실제 시뮬레이션 기반 A/B 테스트 자동화 시스템
 *
 * balance-auto-tuner.ts의 제안을 받아서 실제 시뮬레이션을 실행하고
 * 최적의 밸런스 조정값을 찾습니다.
 */

import type { BalanceAdjustment, ABTestResultEntry, TestVariant } from './balance-auto-tuner';
import type { DetailedStats } from './detailed-stats-types';
import type { RunSimulationConfig, RunSimulationResult } from '../game/run-simulator';
import { CARDS, type GameCard } from '../../components/battle/battleData';

// ==================== 타입 정의 ====================

/** A/B 테스트 실행 설정 */
export interface ABTestRunConfig {
  /** 각 변형당 실행할 런 횟수 */
  runsPerVariant: number;
  /** 시드 (재현성을 위해) */
  baseSeed?: number;
  /** 전략 */
  strategy: 'aggressive' | 'defensive' | 'balanced';
  /** 난이도 */
  difficulty: number;
  /** 최대 층 */
  maxFloor: number;
  /** 진행 콜백 */
  onProgress?: (current: number, total: number, variantName: string) => void;
}

/** A/B 테스트 실행 결과 */
export interface ABTestRunResult {
  /** 기준선 결과 */
  baseline: {
    winRate: number;
    avgFloor: number;
    avgRelics: number;
    avgGold: number;
  };
  /** 변형별 결과 */
  variants: Array<{
    name: string;
    adjustments: BalanceAdjustment[];
    winRate: number;
    winRateDelta: number;
    avgFloor: number;
    avgRelics: number;
    significance: number;
    recommendation: 'apply' | 'reject' | 'test_more';
  }>;
  /** 최적 변형 */
  bestVariant: string | null;
  /** 요약 */
  summary: string;
}

/** 카드 패치 */
interface CardPatch {
  cardId: string;
  field: string;
  originalValue: number;
  newValue: number;
}

// ==================== A/B 테스트 러너 ====================

export class ABTestRunner {
  private originalCards: Map<string, GameCard>;

  constructor() {
    this.originalCards = new Map(CARDS.map(c => [c.id, { ...c }]));
  }

  /**
   * A/B 테스트 실행 (시뮬레이터 인스턴스 주입)
   */
  async runABTest(
    simulator: {
      runSimulation: (config: RunSimulationConfig) => Promise<RunSimulationResult>;
      loadGameData: () => Promise<void>;
    },
    variants: TestVariant[],
    config: ABTestRunConfig
  ): Promise<ABTestRunResult> {
    const results: ABTestRunResult = {
      baseline: { winRate: 0, avgFloor: 0, avgRelics: 0, avgGold: 0 },
      variants: [],
      bestVariant: null,
      summary: '',
    };

    const totalRuns = (variants.length + 1) * config.runsPerVariant;
    let completedRuns = 0;

    // 1. 기준선 실행
    config.onProgress?.(completedRuns, totalRuns, '기준선');
    const baselineResult = await this.runVariant(simulator, [], config);
    results.baseline = baselineResult;
    completedRuns += config.runsPerVariant;

    // 2. 각 변형 실행
    for (const variant of variants) {
      config.onProgress?.(completedRuns, totalRuns, variant.name);

      // 패치 적용
      const patches = this.adjustmentsToPatches(variant.adjustments);
      const variantResult = await this.runVariant(simulator, patches, config);

      const winRateDelta = variantResult.winRate - baselineResult.winRate;
      const significance = this.calculateSignificance(
        baselineResult.winRate,
        variantResult.winRate,
        config.runsPerVariant
      );

      // 추천 결정
      const recommendation = this.determineRecommendation(
        baselineResult.winRate,
        variantResult.winRate,
        significance
      );

      results.variants.push({
        name: variant.name,
        adjustments: variant.adjustments,
        winRate: variantResult.winRate,
        winRateDelta,
        avgFloor: variantResult.avgFloor,
        avgRelics: variantResult.avgRelics,
        significance,
        recommendation,
      });

      completedRuns += config.runsPerVariant;
    }

    // 3. 최적 변형 선택
    const applicable = results.variants.filter(v => v.recommendation === 'apply');
    if (applicable.length > 0) {
      // 목표 승률(50%)에 가장 가까운 변형
      const best = applicable.reduce((a, b) =>
        Math.abs(a.winRate - 0.5) < Math.abs(b.winRate - 0.5) ? a : b
      );
      results.bestVariant = best.name;
    }

    // 4. 요약 생성
    results.summary = this.generateSummary(results);

    return results;
  }

  /**
   * 단일 변형 실행
   */
  private async runVariant(
    simulator: {
      runSimulation: (config: RunSimulationConfig) => Promise<RunSimulationResult>;
      loadGameData: () => Promise<void>;
    },
    patches: CardPatch[],
    config: ABTestRunConfig
  ): Promise<{ winRate: number; avgFloor: number; avgRelics: number; avgGold: number }> {
    // 패치 적용
    this.applyPatches(patches);

    try {
      // 시뮬레이션 실행
      const result = await simulator.runSimulation({
        runCount: config.runsPerVariant,
        strategy: config.strategy,
        maxFloor: config.maxFloor,
        difficulty: config.difficulty,
        seed: config.baseSeed,
        verbose: false,
      });

      return {
        winRate: result.summary.successRate,
        avgFloor: result.summary.avgLayerReached,
        avgRelics: result.summary.avgFinalRelicCount || 0,
        avgGold: result.summary.avgGoldEarned,
      };
    } finally {
      // 패치 롤백
      this.rollbackPatches(patches);
    }
  }

  /**
   * BalanceAdjustment를 CardPatch로 변환
   */
  private adjustmentsToPatches(adjustments: BalanceAdjustment[]): CardPatch[] {
    const patches: CardPatch[] = [];

    for (const adj of adjustments) {
      if (adj.targetType === 'card') {
        patches.push({
          cardId: adj.targetId,
          field: adj.stat,
          originalValue: adj.currentValue,
          newValue: adj.suggestedValue,
        });
      }
      // relic과 enemy는 런타임에서 패치가 더 복잡하므로 일단 카드만 지원
    }

    return patches;
  }

  /**
   * 패치 적용 (CARDS 배열 직접 수정)
   */
  private applyPatches(patches: CardPatch[]): void {
    for (const patch of patches) {
      const card = CARDS.find(c => c.id === patch.cardId);
      if (card) {
        (card as any)[patch.field] = patch.newValue;
      }
    }
  }

  /**
   * 패치 롤백
   */
  private rollbackPatches(patches: CardPatch[]): void {
    for (const patch of patches) {
      const card = CARDS.find(c => c.id === patch.cardId);
      if (card) {
        (card as any)[patch.field] = patch.originalValue;
      }
    }
  }

  /**
   * 통계적 유의성 계산 (Two-proportion z-test)
   */
  private calculateSignificance(p1: number, p2: number, n: number): number {
    const pooledP = (p1 + p2) / 2;
    const se = Math.sqrt(pooledP * (1 - pooledP) * (2 / n));

    if (se === 0) return 0;

    const z = Math.abs(p1 - p2) / se;
    return this.normalCDF(z);
  }

  /**
   * 정규분포 CDF 근사
   */
  private normalCDF(z: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * z);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

    return 0.5 * (1.0 + sign * y);
  }

  /**
   * 추천 결정
   */
  private determineRecommendation(
    baselineWinRate: number,
    variantWinRate: number,
    significance: number
  ): 'apply' | 'reject' | 'test_more' {
    const TARGET = 0.5;
    const baseDistance = Math.abs(baselineWinRate - TARGET);
    const variantDistance = Math.abs(variantWinRate - TARGET);

    // 유의성이 낮으면 추가 테스트 필요
    if (significance < 0.9) {
      return 'test_more';
    }

    // 목표에 더 가까워지면 적용
    if (variantDistance < baseDistance - 0.02) {
      return 'apply';
    }

    // 목표에서 멀어지면 거부
    if (variantDistance > baseDistance + 0.02) {
      return 'reject';
    }

    return 'test_more';
  }

  /**
   * 요약 생성
   */
  private generateSummary(result: ABTestRunResult): string {
    const lines: string[] = [];

    lines.push('# A/B 테스트 실행 결과');
    lines.push('');
    lines.push(`## 기준선`);
    lines.push(`- 승률: ${(result.baseline.winRate * 100).toFixed(1)}%`);
    lines.push(`- 평균 도달 층: ${result.baseline.avgFloor.toFixed(1)}`);
    lines.push(`- 평균 상징 수: ${result.baseline.avgRelics.toFixed(1)}`);
    lines.push('');

    lines.push(`## 변형 결과`);
    for (const v of result.variants) {
      const delta = v.winRateDelta > 0 ? `+${(v.winRateDelta * 100).toFixed(1)}` : (v.winRateDelta * 100).toFixed(1);
      const icon = v.recommendation === 'apply' ? '✅' : v.recommendation === 'reject' ? '❌' : '⚠️';

      lines.push(`### ${icon} ${v.name}`);
      lines.push(`- 승률: ${(v.winRate * 100).toFixed(1)}% (${delta}%)`);
      lines.push(`- 유의성: ${(v.significance * 100).toFixed(1)}%`);
      lines.push(`- 추천: ${v.recommendation === 'apply' ? '적용' : v.recommendation === 'reject' ? '거부' : '추가 테스트 필요'}`);

      if (v.adjustments.length > 0) {
        lines.push('- 조정 내용:');
        for (const adj of v.adjustments) {
          const sign = adj.delta > 0 ? '+' : '';
          lines.push(`  - ${adj.targetName}.${adj.stat}: ${adj.currentValue} → ${adj.suggestedValue} (${sign}${adj.delta})`);
        }
      }
      lines.push('');
    }

    if (result.bestVariant) {
      lines.push(`## 권장 변형`);
      lines.push(`**${result.bestVariant}** 적용을 권장합니다.`);
    } else {
      lines.push(`## 결론`);
      lines.push(`적용할 만한 변형이 없습니다. 현재 밸런스 유지를 권장합니다.`);
    }

    return lines.join('\n');
  }
}

// ==================== 이진 검색 최적화 ====================

/**
 * 이진 검색으로 최적 수치 찾기
 */
export async function findOptimalValue(
  simulator: {
    runSimulation: (config: RunSimulationConfig) => Promise<RunSimulationResult>;
    loadGameData: () => Promise<void>;
  },
  cardId: string,
  stat: string,
  minValue: number,
  maxValue: number,
  targetWinRate: number,
  config: Omit<ABTestRunConfig, 'onProgress'>
): Promise<{ optimalValue: number; resultWinRate: number; iterations: number }> {
  const runner = new ABTestRunner();
  let low = minValue;
  let high = maxValue;
  let iterations = 0;
  const maxIterations = 10;

  let bestValue = (low + high) / 2;
  let bestWinRate = 0;

  while (iterations < maxIterations && high - low > 1) {
    const mid = Math.round((low + high) / 2);
    iterations++;

    // 중간값으로 테스트
    const variant: TestVariant = {
      name: `${cardId}.${stat}=${mid}`,
      adjustments: [{
        targetId: cardId,
        targetName: cardId,
        targetType: 'card',
        stat,
        currentValue: (low + high) / 2,
        suggestedValue: mid,
        delta: mid - (low + high) / 2,
        reason: '이진 검색 최적화',
        expectedImpact: '',
        confidence: 'medium',
        priority: 5,
      }],
    };

    const result = await runner.runABTest(simulator, [variant], {
      ...config,
      runsPerVariant: Math.max(30, config.runsPerVariant / 2), // 빠른 탐색을 위해 런 수 감소
    });

    const variantResult = result.variants[0];
    if (!variantResult) break;

    const winRate = variantResult.winRate;

    // 최적값 업데이트
    if (Math.abs(winRate - targetWinRate) < Math.abs(bestWinRate - targetWinRate)) {
      bestValue = mid;
      bestWinRate = winRate;
    }

    // 이진 검색 조정
    if (winRate < targetWinRate) {
      // 승률이 낮으면 버프 필요 (값 증가)
      low = mid;
    } else {
      // 승률이 높으면 너프 필요 (값 감소)
      high = mid;
    }

    // 목표에 충분히 가까우면 종료
    if (Math.abs(winRate - targetWinRate) < 0.02) {
      break;
    }
  }

  return {
    optimalValue: bestValue,
    resultWinRate: bestWinRate,
    iterations,
  };
}

// ==================== 헬퍼 함수 ====================

export function createABTestRunner(): ABTestRunner {
  return new ABTestRunner();
}
