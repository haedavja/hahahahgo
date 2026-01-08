/**
 * @file balance-auto-tuner.ts
 * @description 밸런스 자동 제안 및 A/B 테스트 자동화 시스템
 *
 * ## 기능
 * 1. 밸런스 자동 제안: 시뮬레이션 결과를 분석해서 구체적인 수치 조정값 계산
 * 2. A/B 테스트 자동화: 여러 수치 변경을 자동으로 시뮬레이션해서 최적값 도출
 */

import type { DetailedStats, CardDeepStats } from './detailed-stats-types';
import { CARDS, type GameCard } from '../../components/battle/battleData';
import { RELICS } from '../../data/relics';
import { getConfig } from '../core/config';

// ==================== 타입 정의 ====================

/** 구체적인 수치 조정 제안 */
export interface BalanceAdjustment {
  targetId: string;
  targetName: string;
  targetType: 'card' | 'relic' | 'enemy';
  stat: string;
  currentValue: number;
  suggestedValue: number;
  delta: number;
  reason: string;
  expectedImpact: string;
  confidence: 'low' | 'medium' | 'high';
  priority: number; // 1-10, 높을수록 시급
}

/** A/B 테스트 변형 */
export interface TestVariant {
  name: string;
  adjustments: BalanceAdjustment[];
}

/** A/B 테스트 결과 */
export interface ABTestResultEntry {
  variantName: string;
  adjustments: BalanceAdjustment[];
  simulatedWinRate: number;
  winRateDelta: number;
  avgTurns: number;
  avgDamage: number;
  recommendation: 'apply' | 'reject' | 'test_more';
}

/** 자동 튜닝 결과 */
export interface AutoTuneResult {
  baselineWinRate: number;
  targetWinRate: number;
  suggestions: BalanceAdjustment[];
  abTestResults: ABTestResultEntry[];
  bestVariant: ABTestResultEntry | null;
  summary: string;
}

// ==================== 상수 정의 ====================

/** 목표 승률 (config에서 가져옴) */
const TARGET_WIN_RATE = getConfig().analysis.targetWinRate;
const WIN_RATE_TOLERANCE = 0.05; // ±5%

/** 조정 비율 상수 */
const DAMAGE_ADJUST_STEP = 1; // 피해량 조정 단위
const BLOCK_ADJUST_STEP = 1;  // 방어량 조정 단위
const SPEED_ADJUST_STEP = 1;  // 속도 조정 단위
const HP_ADJUST_PERCENT = 0.1; // HP 조정 비율 (10%)

// ==================== 밸런스 자동 제안 클래스 ====================

export class BalanceAutoTuner {
  private stats: DetailedStats;
  private cardLibrary: Map<string, GameCard>;
  private relicLibrary: typeof RELICS;

  constructor(stats: DetailedStats) {
    this.stats = stats;
    this.cardLibrary = new Map(CARDS.map(c => [c.id, c]));
    this.relicLibrary = RELICS;
  }

  /**
   * 전체 자동 튜닝 실행
   */
  generateAutoTuneSuggestions(): AutoTuneResult {
    const baselineWinRate = this.stats.runStats.successRate;
    const suggestions: BalanceAdjustment[] = [];

    // 1. 과잉 강화 카드 분석 → 너프 제안
    suggestions.push(...this.analyzeOverpoweredCards());

    // 2. 약한 카드 분석 → 버프 제안
    suggestions.push(...this.analyzeUnderpoweredCards());

    // 3. 상징 밸런스 분석
    suggestions.push(...this.analyzeRelicBalance());

    // 4. 적 밸런스 분석
    suggestions.push(...this.analyzeEnemyBalance());

    // 우선순위 순으로 정렬
    suggestions.sort((a, b) => b.priority - a.priority);

    // A/B 테스트 변형 생성
    const variants = this.generateTestVariants(suggestions);
    const abTestResults = this.simulateVariants(variants, baselineWinRate);

    // 최적 변형 선택
    const bestVariant = this.selectBestVariant(abTestResults);

    return {
      baselineWinRate,
      targetWinRate: TARGET_WIN_RATE,
      suggestions: suggestions.slice(0, 20), // 상위 20개만
      abTestResults,
      bestVariant,
      summary: this.generateSummary(baselineWinRate, suggestions, bestVariant),
    };
  }

  // ==================== 카드 밸런스 분석 ====================

  /**
   * 과잉 강화 카드 분석 → 구체적인 너프 수치 제안
   */
  private analyzeOverpoweredCards(): BalanceAdjustment[] {
    const adjustments: BalanceAdjustment[] = [];
    const { cardDeepStats, cardPickStats, cardContributionStats } = this.stats;

    for (const [cardId, deepStats] of cardDeepStats) {
      const card = this.cardLibrary.get(cardId);
      if (!card) continue;

      const pickRate = cardPickStats.pickRate[cardId] || 0;
      const contribution = cardContributionStats.contribution[cardId] || 0;
      const timesOffered = cardPickStats.timesOffered[cardId] || 0;

      // 과잉 강화 카드: 픽률 70%+ 또는 승률 기여도 15%+
      if ((pickRate > 0.7 || contribution > 0.15) && timesOffered >= 10) {
        // 공격 카드면 피해량 감소 제안
        if (card.damage && card.damage > 0) {
          const currentDamage = card.damage;
          const reductionPercent = Math.min(0.2, contribution * 0.5); // 기여도 비례, 최대 20%
          const reduction = Math.max(DAMAGE_ADJUST_STEP, Math.round(currentDamage * reductionPercent));
          const suggestedDamage = currentDamage - reduction;

          adjustments.push({
            targetId: cardId,
            targetName: card.name,
            targetType: 'card',
            stat: 'damage',
            currentValue: currentDamage,
            suggestedValue: suggestedDamage,
            delta: -reduction,
            reason: `픽률 ${(pickRate * 100).toFixed(1)}%, 승률 기여도 +${(contribution * 100).toFixed(1)}%`,
            expectedImpact: `승률 ${(contribution * 0.3 * 100).toFixed(1)}% 감소 예상`,
            confidence: contribution > 0.2 ? 'high' : 'medium',
            priority: Math.round(contribution * 30 + pickRate * 5),
          });
        }

        // 방어 카드면 방어량 감소 제안
        if (card.block && card.block > 0) {
          const currentBlock = card.block;
          const reductionPercent = Math.min(0.15, contribution * 0.4);
          const reduction = Math.max(BLOCK_ADJUST_STEP, Math.round(currentBlock * reductionPercent));
          const suggestedBlock = currentBlock - reduction;

          adjustments.push({
            targetId: cardId,
            targetName: card.name,
            targetType: 'card',
            stat: 'block',
            currentValue: currentBlock,
            suggestedValue: suggestedBlock,
            delta: -reduction,
            reason: `픽률 ${(pickRate * 100).toFixed(1)}%, 승률 기여도 +${(contribution * 100).toFixed(1)}%`,
            expectedImpact: `승률 ${(contribution * 0.25 * 100).toFixed(1)}% 감소 예상`,
            confidence: contribution > 0.2 ? 'high' : 'medium',
            priority: Math.round(contribution * 25 + pickRate * 5),
          });
        }

        // 속도가 너무 빠르면 속도 증가 (느리게) 제안
        if (card.speedCost !== undefined && card.speedCost <= 2) {
          adjustments.push({
            targetId: cardId,
            targetName: card.name,
            targetType: 'card',
            stat: 'speedCost',
            currentValue: card.speedCost,
            suggestedValue: card.speedCost + SPEED_ADJUST_STEP,
            delta: SPEED_ADJUST_STEP,
            reason: `빠른 속도(${card.speedCost})와 높은 픽률(${(pickRate * 100).toFixed(1)}%)`,
            expectedImpact: `카드 발동 타이밍 지연으로 밸런스 조정`,
            confidence: 'medium',
            priority: Math.round(contribution * 20),
          });
        }
      }
    }

    return adjustments;
  }

  /**
   * 약한 카드 분석 → 구체적인 버프 수치 제안
   */
  private analyzeUnderpoweredCards(): BalanceAdjustment[] {
    const adjustments: BalanceAdjustment[] = [];
    const { cardDeepStats, cardPickStats, cardContributionStats } = this.stats;

    for (const [cardId, deepStats] of cardDeepStats) {
      const card = this.cardLibrary.get(cardId);
      if (!card) continue;

      const pickRate = cardPickStats.pickRate[cardId] || 0;
      const contribution = cardContributionStats.contribution[cardId] || 0;
      const timesOffered = cardPickStats.timesOffered[cardId] || 0;

      // 약한 카드: 픽률 30% 미만 또는 승률 기여도 음수
      if ((pickRate < 0.3 || contribution < 0) && timesOffered >= 10) {
        // 공격 카드면 피해량 증가 제안
        if (card.damage && card.damage > 0) {
          const currentDamage = card.damage;
          const increasePercent = Math.min(0.25, Math.abs(contribution) * 0.5 + (0.3 - pickRate) * 0.3);
          const increase = Math.max(DAMAGE_ADJUST_STEP, Math.round(currentDamage * increasePercent));
          const suggestedDamage = currentDamage + increase;

          adjustments.push({
            targetId: cardId,
            targetName: card.name,
            targetType: 'card',
            stat: 'damage',
            currentValue: currentDamage,
            suggestedValue: suggestedDamage,
            delta: increase,
            reason: `픽률 ${(pickRate * 100).toFixed(1)}%, 승률 기여도 ${(contribution * 100).toFixed(1)}%`,
            expectedImpact: `픽률 ${((0.3 - pickRate) * 50).toFixed(0)}% 증가 예상`,
            confidence: timesOffered >= 20 ? 'high' : 'medium',
            priority: Math.round(Math.abs(contribution) * 20 + (0.3 - pickRate) * 10),
          });
        }

        // 방어 카드면 방어량 증가 제안
        if (card.block && card.block > 0) {
          const currentBlock = card.block;
          const increasePercent = Math.min(0.2, Math.abs(contribution) * 0.4 + (0.3 - pickRate) * 0.25);
          const increase = Math.max(BLOCK_ADJUST_STEP, Math.round(currentBlock * increasePercent));
          const suggestedBlock = currentBlock + increase;

          adjustments.push({
            targetId: cardId,
            targetName: card.name,
            targetType: 'card',
            stat: 'block',
            currentValue: currentBlock,
            suggestedValue: suggestedBlock,
            delta: increase,
            reason: `픽률 ${(pickRate * 100).toFixed(1)}%, 승률 기여도 ${(contribution * 100).toFixed(1)}%`,
            expectedImpact: `픽률 ${((0.3 - pickRate) * 40).toFixed(0)}% 증가 예상`,
            confidence: timesOffered >= 20 ? 'high' : 'medium',
            priority: Math.round(Math.abs(contribution) * 15 + (0.3 - pickRate) * 10),
          });
        }

        // 속도가 느리면 속도 감소 (빠르게) 제안
        if (card.speedCost !== undefined && card.speedCost >= 4) {
          adjustments.push({
            targetId: cardId,
            targetName: card.name,
            targetType: 'card',
            stat: 'speedCost',
            currentValue: card.speedCost,
            suggestedValue: card.speedCost - SPEED_ADJUST_STEP,
            delta: -SPEED_ADJUST_STEP,
            reason: `느린 속도(${card.speedCost})와 낮은 픽률(${(pickRate * 100).toFixed(1)}%)`,
            expectedImpact: `카드 발동 타이밍 개선으로 활용도 증가`,
            confidence: 'medium',
            priority: Math.round((0.3 - pickRate) * 15),
          });
        }
      }
    }

    return adjustments;
  }

  // ==================== 상징 밸런스 분석 ====================

  private analyzeRelicBalance(): BalanceAdjustment[] {
    const adjustments: BalanceAdjustment[] = [];
    const { relicStats } = this.stats;

    if (!relicStats) return adjustments;

    for (const [relicId, stats] of relicStats) {
      const relic = this.relicLibrary[relicId as keyof typeof RELICS];
      if (!relic) continue;

      const pickRate = stats.pickRate || 0;
      const winRateWith = stats.winRateWith || 0;
      const winRateWithout = stats.winRateWithout || 0;
      const contribution = winRateWith - winRateWithout;

      // 과잉 강화 상징
      if (contribution > 0.15 && pickRate > 0.6) {
        const effects = relic.effects as Record<string, unknown>;

        // 수치형 효과가 있으면 조정 제안
        for (const [key, value] of Object.entries(effects)) {
          if (typeof value === 'number' && value > 0 && key !== 'type') {
            const reduction = Math.max(1, Math.round(value * 0.15));
            adjustments.push({
              targetId: relicId,
              targetName: relic.name,
              targetType: 'relic',
              stat: key,
              currentValue: value,
              suggestedValue: value - reduction,
              delta: -reduction,
              reason: `픽률 ${(pickRate * 100).toFixed(1)}%, 승률 기여도 +${(contribution * 100).toFixed(1)}%`,
              expectedImpact: `과도한 시너지 완화`,
              confidence: 'medium',
              priority: Math.round(contribution * 25),
            });
          }
        }
      }

      // 약한 상징
      if (contribution < -0.05 && pickRate < 0.3) {
        const effects = relic.effects as Record<string, unknown>;

        for (const [key, value] of Object.entries(effects)) {
          if (typeof value === 'number' && value > 0 && key !== 'type') {
            const increase = Math.max(1, Math.round(value * 0.2));
            adjustments.push({
              targetId: relicId,
              targetName: relic.name,
              targetType: 'relic',
              stat: key,
              currentValue: value,
              suggestedValue: value + increase,
              delta: increase,
              reason: `픽률 ${(pickRate * 100).toFixed(1)}%, 승률 기여도 ${(contribution * 100).toFixed(1)}%`,
              expectedImpact: `활용도 및 매력도 증가`,
              confidence: 'low',
              priority: Math.round(Math.abs(contribution) * 15),
            });
          }
        }
      }
    }

    return adjustments;
  }

  // ==================== 적 밸런스 분석 ====================

  private analyzeEnemyBalance(): BalanceAdjustment[] {
    const adjustments: BalanceAdjustment[] = [];
    const { monsterStats, deathStats } = this.stats;

    for (const [enemyId, stats] of monsterStats) {
      // 너무 어려운 적 (사망률 40% 이상)
      if (stats.winRate < 0.6 && stats.battles >= 10) {
        const hpReduction = Math.round(stats.avgDamageTaken * 0.15);

        adjustments.push({
          targetId: enemyId,
          targetName: enemyId,
          targetType: 'enemy',
          stat: 'hp',
          currentValue: stats.avgDamageTaken, // 추정 HP
          suggestedValue: stats.avgDamageTaken - hpReduction,
          delta: -hpReduction,
          reason: `플레이어 승률 ${(stats.winRate * 100).toFixed(1)}% (너무 어려움)`,
          expectedImpact: `조우 시 생존율 ${(hpReduction * 0.5).toFixed(0)}% 증가 예상`,
          confidence: stats.battles >= 30 ? 'high' : 'medium',
          priority: Math.round((1 - stats.winRate) * 40),
        });
      }

      // 너무 쉬운 적 (승률 90% 이상)
      if (stats.winRate > 0.9 && stats.battles >= 10) {
        const hpIncrease = Math.round(stats.avgDamageTaken * 0.1);

        adjustments.push({
          targetId: enemyId,
          targetName: enemyId,
          targetType: 'enemy',
          stat: 'hp',
          currentValue: stats.avgDamageTaken,
          suggestedValue: stats.avgDamageTaken + hpIncrease,
          delta: hpIncrease,
          reason: `플레이어 승률 ${(stats.winRate * 100).toFixed(1)}% (너무 쉬움)`,
          expectedImpact: `적절한 도전감 부여`,
          confidence: 'low',
          priority: Math.round((stats.winRate - 0.9) * 20),
        });
      }
    }

    return adjustments;
  }

  // ==================== A/B 테스트 자동화 ====================

  /**
   * 테스트 변형 자동 생성
   */
  private generateTestVariants(suggestions: BalanceAdjustment[]): TestVariant[] {
    const variants: TestVariant[] = [];
    const topSuggestions = suggestions.slice(0, 10);

    // 1. 개별 변경 테스트 (상위 5개)
    for (const suggestion of topSuggestions.slice(0, 5)) {
      variants.push({
        name: `${suggestion.targetName} ${suggestion.stat} 조정`,
        adjustments: [suggestion],
      });
    }

    // 2. 카드 타입별 일괄 조정
    const cardNerfs = topSuggestions.filter(s => s.targetType === 'card' && s.delta < 0);
    const cardBuffs = topSuggestions.filter(s => s.targetType === 'card' && s.delta > 0);

    if (cardNerfs.length >= 2) {
      variants.push({
        name: '과잉 강화 카드 일괄 너프',
        adjustments: cardNerfs.slice(0, 3),
      });
    }

    if (cardBuffs.length >= 2) {
      variants.push({
        name: '약한 카드 일괄 버프',
        adjustments: cardBuffs.slice(0, 3),
      });
    }

    // 3. 보수적 조정 (절반 수치)
    for (const suggestion of topSuggestions.slice(0, 3)) {
      const conservativeAdjustment = {
        ...suggestion,
        suggestedValue: suggestion.currentValue + Math.round(suggestion.delta / 2),
        delta: Math.round(suggestion.delta / 2),
      };
      variants.push({
        name: `${suggestion.targetName} 보수적 조정`,
        adjustments: [conservativeAdjustment],
      });
    }

    // 4. 균형 패키지 (너프 + 버프 조합)
    if (cardNerfs.length > 0 && cardBuffs.length > 0) {
      variants.push({
        name: '균형 패키지 (너프+버프)',
        adjustments: [cardNerfs[0], cardBuffs[0]],
      });
    }

    return variants;
  }

  /**
   * 변형별 시뮬레이션 결과 예측
   * (실제 시뮬레이션 대신 통계 기반 예측)
   */
  private simulateVariants(variants: TestVariant[], baselineWinRate: number): ABTestResultEntry[] {
    const results: ABTestResultEntry[] = [];

    for (const variant of variants) {
      // 각 조정의 예상 영향도 계산
      let totalImpact = 0;
      for (const adj of variant.adjustments) {
        // 기여도 기반 영향도 추정
        const impactFactor = adj.priority / 100;
        const directionMultiplier = adj.delta > 0 ? 1 : -1;

        // 너프는 승률 감소, 버프는 승률 증가
        if (adj.targetType === 'card') {
          if (adj.stat === 'damage' || adj.stat === 'block') {
            totalImpact += directionMultiplier * impactFactor * 0.02;
          } else if (adj.stat === 'speedCost') {
            totalImpact += -directionMultiplier * impactFactor * 0.015;
          }
        } else if (adj.targetType === 'enemy') {
          // 적 HP 감소 → 플레이어 승률 증가
          totalImpact += -adj.delta / 100 * 0.03;
        } else if (adj.targetType === 'relic') {
          totalImpact += directionMultiplier * impactFactor * 0.01;
        }
      }

      const simulatedWinRate = Math.max(0, Math.min(1, baselineWinRate + totalImpact));
      const winRateDelta = simulatedWinRate - baselineWinRate;

      // 추천 결정
      let recommendation: 'apply' | 'reject' | 'test_more';
      const distanceToTarget = Math.abs(simulatedWinRate - TARGET_WIN_RATE);
      const currentDistance = Math.abs(baselineWinRate - TARGET_WIN_RATE);

      if (distanceToTarget < currentDistance - 0.01) {
        recommendation = 'apply';
      } else if (distanceToTarget > currentDistance + 0.02) {
        recommendation = 'reject';
      } else {
        recommendation = 'test_more';
      }

      results.push({
        variantName: variant.name,
        adjustments: variant.adjustments,
        simulatedWinRate,
        winRateDelta,
        avgTurns: 0, // 실제 시뮬레이션 필요
        avgDamage: 0,
        recommendation,
      });
    }

    return results;
  }

  /**
   * 최적 변형 선택
   */
  private selectBestVariant(results: ABTestResultEntry[]): ABTestResultEntry | null {
    const applicable = results.filter(r => r.recommendation === 'apply');
    if (applicable.length === 0) return null;

    // 목표 승률에 가장 가까운 변형 선택
    return applicable.reduce((best, current) => {
      const bestDistance = Math.abs(best.simulatedWinRate - TARGET_WIN_RATE);
      const currentDistance = Math.abs(current.simulatedWinRate - TARGET_WIN_RATE);
      return currentDistance < bestDistance ? current : best;
    });
  }

  /**
   * 요약 리포트 생성
   */
  private generateSummary(
    baseline: number,
    suggestions: BalanceAdjustment[],
    best: ABTestResultEntry | null
  ): string {
    const lines: string[] = [];

    lines.push('# 밸런스 자동 튜닝 리포트');
    lines.push('');
    lines.push(`## 현재 상태`);
    lines.push(`- 기준 승률: ${(baseline * 100).toFixed(1)}%`);
    lines.push(`- 목표 승률: ${(TARGET_WIN_RATE * 100).toFixed(1)}% (±${(WIN_RATE_TOLERANCE * 100).toFixed(0)}%)`);
    lines.push(`- 분석된 제안: ${suggestions.length}개`);
    lines.push('');

    if (suggestions.length > 0) {
      lines.push(`## 상위 밸런스 조정 제안`);
      for (const s of suggestions.slice(0, 5)) {
        const sign = s.delta > 0 ? '+' : '';
        lines.push(`- **${s.targetName}** (${s.targetType})`);
        lines.push(`  - ${s.stat}: ${s.currentValue} → ${s.suggestedValue} (${sign}${s.delta})`);
        lines.push(`  - 이유: ${s.reason}`);
        lines.push(`  - 예상 효과: ${s.expectedImpact}`);
      }
      lines.push('');
    }

    if (best) {
      lines.push(`## 추천 변경사항`);
      lines.push(`**${best.variantName}**`);
      lines.push(`- 예상 승률: ${(best.simulatedWinRate * 100).toFixed(1)}% (${best.winRateDelta > 0 ? '+' : ''}${(best.winRateDelta * 100).toFixed(1)}%)`);
      lines.push('');
      lines.push('적용할 조정:');
      for (const adj of best.adjustments) {
        const sign = adj.delta > 0 ? '+' : '';
        lines.push(`- ${adj.targetName}.${adj.stat}: ${adj.currentValue} → ${adj.suggestedValue} (${sign}${adj.delta})`);
      }
    } else {
      lines.push(`## 결론`);
      lines.push(`현재 밸런스가 목표 범위 내에 있거나, 명확한 개선 방향을 찾지 못했습니다.`);
    }

    return lines.join('\n');
  }

  // ==================== 마크다운 출력 ====================

  generateMarkdownReport(): string {
    const result = this.generateAutoTuneSuggestions();
    return result.summary;
  }
}

// ==================== 헬퍼 함수 ====================

export function createBalanceAutoTuner(stats: DetailedStats): BalanceAutoTuner {
  return new BalanceAutoTuner(stats);
}

/**
 * 조정 제안을 코드 패치 형식으로 변환
 */
export function adjustmentToCodePatch(adj: BalanceAdjustment): string {
  if (adj.targetType === 'card') {
    return `// ${adj.targetName}: ${adj.stat} ${adj.currentValue} → ${adj.suggestedValue}
// 이유: ${adj.reason}
// 파일: src/components/battle/battleData.ts
// 검색: id: '${adj.targetId}'
// 변경: ${adj.stat}: ${adj.suggestedValue},`;
  }

  if (adj.targetType === 'relic') {
    return `// ${adj.targetName}: ${adj.stat} ${adj.currentValue} → ${adj.suggestedValue}
// 이유: ${adj.reason}
// 파일: src/data/relics.ts
// 검색: id: '${adj.targetId}'
// 변경: ${adj.stat}: ${adj.suggestedValue},`;
  }

  return `// ${adj.targetType} ${adj.targetId}: ${adj.stat} 조정 필요`;
}

/**
 * 여러 조정을 한번에 패치 코드로 변환
 */
export function generatePatchCode(adjustments: BalanceAdjustment[]): string {
  const lines: string[] = [];
  lines.push('// ==================== 자동 생성된 밸런스 패치 ====================');
  lines.push('// 생성 시간: ' + new Date().toISOString());
  lines.push('');

  const byType = new Map<string, BalanceAdjustment[]>();
  for (const adj of adjustments) {
    const key = adj.targetType;
    if (!byType.has(key)) byType.set(key, []);
    byType.get(key)!.push(adj);
  }

  for (const [type, adjs] of byType) {
    lines.push(`// --- ${type.toUpperCase()} 조정 ---`);
    for (const adj of adjs) {
      lines.push(adjustmentToCodePatch(adj));
      lines.push('');
    }
  }

  return lines.join('\n');
}
