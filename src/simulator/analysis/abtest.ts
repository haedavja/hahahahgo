/**
 * @file abtest.ts
 * @description A/B 테스트 시뮬레이션 - 패치 전/후 비교 자동화
 */

import type {
  SimulationConfig,
  SimulationResult,
  SimulationSummary,
  ABTestConfig,
  ABTestResult,
} from '../core/types';
import { loadCards, type CardData } from '../data/loader';
import type { SimulatorInterface } from './balance';
import { deepClone } from './base-analyzer';

/** 패치 가능한 카드 속성 */
type PatchableStat = 'attack' | 'defense' | 'cost';

/** 카드 속성 접근 헬퍼 - 타입 안전한 동적 접근 */
function getCardStat(card: CardData, stat: PatchableStat): number {
  return card[stat] ?? 0;
}

/** 카드 속성 설정 헬퍼 - 타입 안전한 동적 설정 */
function setCardStat(card: CardData, stat: PatchableStat, value: number): void {
  if (stat === 'cost') {
    card.cost = value;
  } else if (stat === 'attack') {
    card.attack = value;
  } else if (stat === 'defense') {
    card.defense = value;
  }
}

// ==================== A/B 테스트 관리자 ====================

export interface ABTestOptions {
  confidenceLevel: number;  // 0.95 = 95%
  minSampleSize: number;
  maxSampleSize: number;
}

export class ABTestManager {
  private simulator: SimulatorInterface;
  private options: ABTestOptions;
  private testHistory: ABTestResult[] = [];

  constructor(simulator: SimulatorInterface, options: Partial<ABTestOptions> = {}) {
    this.simulator = simulator;
    this.options = {
      confidenceLevel: options.confidenceLevel || 0.95,
      minSampleSize: options.minSampleSize || 100,
      maxSampleSize: options.maxSampleSize || 10000,
    };
  }

  // ==================== 테스트 실행 ====================

  async runTest(config: ABTestConfig): Promise<ABTestResult> {
    console.log(`🔬 A/B 테스트 시작: ${config.name}`);
    console.log(`   샘플 크기: ${config.sampleSize}`);

    // Control 그룹 실행
    console.log('   📊 Control 그룹 시뮬레이션...');
    const controlResult = await this.simulator.run({
      ...config.controlConfig,
      battles: config.sampleSize,
    });

    // Variant 그룹 실행
    console.log('   📊 Variant 그룹 시뮬레이션...');
    const variantResult = await this.simulator.run({
      ...config.variantConfig,
      battles: config.sampleSize,
    });

    // 통계 분석
    const significance = this.calculateSignificance(
      controlResult.summary,
      variantResult.summary,
      config.sampleSize
    );

    const winner = this.determineWinner(
      controlResult.summary,
      variantResult.summary,
      significance
    );

    const recommendation = this.generateRecommendation(
      config,
      controlResult.summary,
      variantResult.summary,
      winner,
      significance
    );

    const result: ABTestResult = {
      config,
      controlResults: controlResult.summary,
      variantResults: variantResult.summary,
      significance,
      winner,
      recommendation,
    };

    this.testHistory.push(result);
    console.log(`   ✅ 테스트 완료: ${winner} 승리 (유의성: ${(significance * 100).toFixed(1)}%)`);

    return result;
  }

  // ==================== 패치 비교 테스트 ====================

  async comparePatch(
    name: string,
    description: string,
    baseConfig: SimulationConfig,
    cardChanges: CardPatchChange[]
  ): Promise<ABTestResult> {
    const cards = loadCards();
    const patchedCards = this.applyPatch(cards, cardChanges);

    // 패치 설명 생성
    const changeDescriptions = cardChanges.map(c =>
      `${c.cardId}: ${c.stat} ${c.oldValue} → ${c.newValue}`
    ).join(', ');

    const config: ABTestConfig = {
      name: `패치 비교: ${name}`,
      description: `${description}\n변경사항: ${changeDescriptions}`,
      controlConfig: baseConfig,
      variantConfig: { ...baseConfig },
      sampleSize: this.options.minSampleSize * 5,
    };

    // Variant에 패치된 카드 적용
    const controlResult = await this.simulator.run({
      ...config.controlConfig,
      battles: config.sampleSize,
    });

    const variantResult = await this.simulator.run(
      { ...config.variantConfig, battles: config.sampleSize },
      patchedCards
    );

    const significance = this.calculateSignificance(
      controlResult.summary,
      variantResult.summary,
      config.sampleSize
    );

    const winner = this.determineWinner(
      controlResult.summary,
      variantResult.summary,
      significance
    );

    return {
      config,
      controlResults: controlResult.summary,
      variantResults: variantResult.summary,
      significance,
      winner,
      recommendation: this.generatePatchRecommendation(
        cardChanges,
        controlResult.summary,
        variantResult.summary,
        winner
      ),
    };
  }

  // ==================== 다중 변수 테스트 ====================

  async runMultivariateTest(
    name: string,
    baseConfig: SimulationConfig,
    variants: Array<{ name: string; changes: CardPatchChange[] }>
  ): Promise<{
    baseline: SimulationSummary;
    variants: Array<{ name: string; summary: SimulationSummary; diff: number }>;
    bestVariant: string;
  }> {
    console.log(`🔬 다변량 테스트 시작: ${name}`);
    console.log(`   변수: ${variants.length}개`);

    const cards = loadCards();
    const sampleSize = Math.floor(this.options.maxSampleSize / (variants.length + 1));

    // 베이스라인
    const baselineResult = await this.simulator.run({
      ...baseConfig,
      battles: sampleSize,
    });

    const results: Array<{ name: string; summary: SimulationSummary; diff: number }> = [];

    for (const variant of variants) {
      const patchedCards = this.applyPatch(cards, variant.changes);
      const variantResult = await this.simulator.run(
        { ...baseConfig, battles: sampleSize },
        patchedCards
      );

      results.push({
        name: variant.name,
        summary: variantResult.summary,
        diff: variantResult.summary.winRate - baselineResult.summary.winRate,
      });
    }

    // 최고 변수 찾기
    const best = results.reduce((prev, curr) =>
      curr.diff > prev.diff ? curr : prev
    );

    return {
      baseline: baselineResult.summary,
      variants: results,
      bestVariant: best.name,
    };
  }

  // ==================== 통계 분석 ====================

  private calculateSignificance(
    control: SimulationSummary,
    variant: SimulationSummary,
    sampleSize: number
  ): number {
    // 이표본 비율 검정 (Two-proportion z-test)
    const p1 = control.winRate;
    const p2 = variant.winRate;
    const n1 = sampleSize;
    const n2 = sampleSize;

    const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));

    if (se === 0) return 0;

    const z = Math.abs(p1 - p2) / se;

    // Z-score를 확률로 변환 (정규분포 CDF 근사)
    const significance = this.normalCDF(z);

    return significance;
  }

  private normalCDF(z: number): number {
    // 정규분포 CDF 근사 (Abramowitz and Stegun approximation)
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * z);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

    return 0.5 * (1.0 + sign * y);
  }

  private determineWinner(
    control: SimulationSummary,
    variant: SimulationSummary,
    significance: number
  ): 'control' | 'variant' | 'inconclusive' {
    if (significance < this.options.confidenceLevel) {
      return 'inconclusive';
    }

    const diff = variant.winRate - control.winRate;

    if (Math.abs(diff) < 0.01) {
      return 'inconclusive';
    }

    return diff > 0 ? 'variant' : 'control';
  }

  // ==================== 추천 생성 ====================

  private generateRecommendation(
    config: ABTestConfig,
    control: SimulationSummary,
    variant: SimulationSummary,
    winner: 'control' | 'variant' | 'inconclusive',
    significance: number
  ): string {
    const winRateDiff = ((variant.winRate - control.winRate) * 100).toFixed(2);
    const turnsDiff = (variant.avgTurns - control.avgTurns).toFixed(1);

    if (winner === 'inconclusive') {
      return `결론을 내리기 어렵습니다. 통계적 유의성이 ${(significance * 100).toFixed(1)}%로 ` +
             `기준(${(this.options.confidenceLevel * 100).toFixed(0)}%)에 미달합니다. ` +
             `더 많은 샘플이 필요합니다.`;
    }

    if (winner === 'variant') {
      return `Variant 채택을 권장합니다. 승률이 ${winRateDiff}% 상승했으며, ` +
             `평균 전투 길이가 ${turnsDiff}턴 ${parseFloat(turnsDiff) > 0 ? '증가' : '감소'}했습니다. ` +
             `유의성: ${(significance * 100).toFixed(1)}%`;
    }

    return `Control 유지를 권장합니다. Variant의 승률이 ${Math.abs(parseFloat(winRateDiff))}% ` +
           `하락했습니다. 변경사항을 재검토하세요.`;
  }

  private generatePatchRecommendation(
    changes: CardPatchChange[],
    control: SimulationSummary,
    variant: SimulationSummary,
    winner: 'control' | 'variant' | 'inconclusive'
  ): string {
    const changeList = changes.map(c =>
      `${c.cardId}의 ${c.stat}: ${c.oldValue} → ${c.newValue}`
    ).join('\n  - ');

    const winRateDiff = ((variant.winRate - control.winRate) * 100).toFixed(2);

    if (winner === 'variant') {
      return `패치 적용을 권장합니다.\n` +
             `변경사항:\n  - ${changeList}\n` +
             `효과: 승률 ${winRateDiff}% 변화`;
    }

    if (winner === 'control') {
      return `패치를 적용하지 않는 것을 권장합니다.\n` +
             `변경사항이 게임 밸런스에 부정적 영향을 미칩니다.\n` +
             `효과: 승률 ${winRateDiff}% 변화`;
    }

    return `추가 테스트가 필요합니다. 현재 결과로는 결론을 내릴 수 없습니다.`;
  }

  // ==================== 패치 적용 ====================

  /**
   * 패치 적용
   * @see deepClone from base-analyzer.ts
   */
  private applyPatch(
    cards: Record<string, CardData>,
    changes: CardPatchChange[]
  ): Record<string, CardData> {
    const patched = deepClone(cards);

    for (const change of changes) {
      const card = patched[change.cardId];
      if (card && this.isPatchableStat(change.stat)) {
        setCardStat(card, change.stat, change.newValue);
      }
    }

    return patched;
  }

  /** 타입 가드: stat이 패치 가능한 속성인지 확인 */
  private isPatchableStat(stat: string): stat is PatchableStat {
    return stat === 'attack' || stat === 'defense' || stat === 'cost';
  }

  // ==================== 히스토리 ====================

  getTestHistory(): ABTestResult[] {
    return [...this.testHistory];
  }

  clearHistory(): void {
    this.testHistory = [];
  }
}

// ==================== 타입 정의 ====================

export interface CardPatchChange {
  cardId: string;
  stat: string;
  oldValue: number;
  newValue: number;
}

// ==================== 헬퍼 함수 ====================

export function createPatchChange(
  cardId: string,
  stat: 'attack' | 'defense' | 'cost',
  delta: number
): CardPatchChange {
  const cards = loadCards();
  const card = cards[cardId];
  const oldValue = card ? getCardStat(card, stat) : 0;

  return {
    cardId,
    stat,
    oldValue,
    newValue: Math.max(0, oldValue + delta),
  };
}

export function printABTestResult(result: ABTestResult): void {
  console.log('\n' + '═'.repeat(60));
  console.log(`🔬 A/B 테스트 결과: ${result.config.name}`);
  console.log('═'.repeat(60));

  console.log(`\n📊 Control:`);
  console.log(`   승률: ${(result.controlResults.winRate * 100).toFixed(1)}%`);
  console.log(`   평균 턴: ${result.controlResults.avgTurns.toFixed(1)}`);
  console.log(`   평균 피해: ${result.controlResults.avgPlayerDamage.toFixed(0)}`);

  console.log(`\n📊 Variant:`);
  console.log(`   승률: ${(result.variantResults.winRate * 100).toFixed(1)}%`);
  console.log(`   평균 턴: ${result.variantResults.avgTurns.toFixed(1)}`);
  console.log(`   평균 피해: ${result.variantResults.avgPlayerDamage.toFixed(0)}`);

  console.log(`\n📈 통계적 유의성: ${(result.significance * 100).toFixed(1)}%`);
  console.log(`🏆 승자: ${result.winner}`);

  console.log(`\n💡 추천:`);
  console.log(`   ${result.recommendation}`);

  console.log('\n' + '═'.repeat(60));
}
