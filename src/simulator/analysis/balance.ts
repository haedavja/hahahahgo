/**
 * @file balance.ts
 * @description 밸런스 자동 추천 시스템 - 카드 수치 변경에 따른 승률 예측
 */

import type {
  SimulationConfig,
  SimulationResult,
  SimulationSummary,
  BalanceAnalysis,
  BalanceChange,
  CardStats,
} from '../core/types';
import { loadCards, loadPresets, loadEnemies, getEnemiesByTier, type CardData } from '../data/loader';

// ==================== 밸런스 분석기 ====================

export interface BalanceAnalyzerOptions {
  battlesPerTest: number;
  maxTurns: number;
  targetWinRate: number;
  confidenceThreshold: number;
}

export class BalanceAnalyzer {
  private options: BalanceAnalyzerOptions;
  private baselineResults: Map<string, number> = new Map();
  private simulator: SimulatorInterface;

  constructor(
    simulator: SimulatorInterface,
    options: Partial<BalanceAnalyzerOptions> = {}
  ) {
    this.simulator = simulator;
    this.options = {
      battlesPerTest: options.battlesPerTest || 100,
      maxTurns: options.maxTurns || 30,
      targetWinRate: options.targetWinRate || 0.5,
      confidenceThreshold: options.confidenceThreshold || 0.8,
    };
  }

  // ==================== 기준선 설정 ====================

  async establishBaseline(deckCards: string[], enemyIds: string[]): Promise<Map<string, number>> {
    console.log('📊 기준선 승률 측정 중...');

    for (const enemyId of enemyIds) {
      const config: SimulationConfig = {
        battles: this.options.battlesPerTest,
        maxTurns: this.options.maxTurns,
        enemyIds: [enemyId],
        playerDeck: deckCards,
      };

      const result = await this.simulator.run(config);
      this.baselineResults.set(enemyId, result.summary.winRate);
    }

    return this.baselineResults;
  }

  // ==================== 카드 분석 ====================

  async analyzeCard(cardId: string, deckCards: string[], enemyIds: string[]): Promise<BalanceAnalysis> {
    const cards = loadCards();
    const card = cards[cardId];

    if (!card) {
      throw new Error(`Card not found: ${cardId}`);
    }

    // 기준선이 없으면 설정
    if (this.baselineResults.size === 0) {
      await this.establishBaseline(deckCards, enemyIds);
    }

    const currentStats: CardStats = {
      attack: card.attack,
      defense: card.defense,
      cost: card.cost,
    };

    const suggestedChanges: BalanceChange[] = [];

    // 공격력 조정 테스트
    if (card.attack) {
      const attackChange = await this.testStatChange(
        cardId, 'attack', card.attack, deckCards, enemyIds
      );
      if (attackChange) suggestedChanges.push(attackChange);
    }

    // 방어력 조정 테스트
    if (card.defense) {
      const defenseChange = await this.testStatChange(
        cardId, 'defense', card.defense, deckCards, enemyIds
      );
      if (defenseChange) suggestedChanges.push(defenseChange);
    }

    // 코스트 조정 테스트
    const costChange = await this.testStatChange(
      cardId, 'cost', card.cost, deckCards, enemyIds
    );
    if (costChange) suggestedChanges.push(costChange);

    // 예상 승률 변화 계산
    const expectedWinRateChange = suggestedChanges.reduce(
      (sum, change) => sum + (change.suggestedValue - change.currentValue) * this.getStatWeight(change.stat),
      0
    );

    return {
      cardId,
      currentStats,
      suggestedChanges,
      expectedWinRateChange,
    };
  }

  private async testStatChange(
    cardId: string,
    stat: string,
    currentValue: number,
    deckCards: string[],
    enemyIds: string[]
  ): Promise<BalanceChange | null> {
    const testValues = this.getTestValues(stat, currentValue);
    const results: { value: number; winRate: number }[] = [];

    for (const testValue of testValues) {
      if (testValue === currentValue) continue;

      // 카드 수정 적용
      const modifiedCards = this.applyCardModification(cardId, stat, testValue);

      // 시뮬레이션 실행
      let totalWinRate = 0;
      for (const enemyId of enemyIds) {
        const config: SimulationConfig = {
          battles: Math.floor(this.options.battlesPerTest / enemyIds.length),
          maxTurns: this.options.maxTurns,
          enemyIds: [enemyId],
          playerDeck: deckCards,
        };

        const result = await this.simulator.run(config, modifiedCards);
        totalWinRate += result.summary.winRate;
      }

      results.push({
        value: testValue,
        winRate: totalWinRate / enemyIds.length,
      });
    }

    // 최적 값 찾기
    const baseline = this.getAverageBaseline();
    const targetDiff = this.options.targetWinRate - baseline;

    // 목표 승률에 가장 가까운 값 선택
    const best = results.reduce((prev, curr) => {
      const prevDiff = Math.abs((curr.winRate - baseline) - targetDiff);
      const currDiff = Math.abs((prev.winRate - baseline) - targetDiff);
      return prevDiff < currDiff ? curr : prev;
    }, results[0]);

    // 변화가 의미있는지 확인
    if (!best || Math.abs(best.winRate - baseline) < 0.02) {
      return null;
    }

    const confidence = this.calculateConfidence(results, best.value);

    if (confidence < this.options.confidenceThreshold) {
      return null;
    }

    return {
      stat,
      currentValue,
      suggestedValue: best.value,
      confidence,
      reason: this.generateReason(stat, currentValue, best.value, best.winRate - baseline),
    };
  }

  // ==================== 헬퍼 함수 ====================

  private getTestValues(stat: string, currentValue: number): number[] {
    switch (stat) {
      case 'attack':
      case 'defense':
        return [
          Math.max(1, currentValue - 3),
          Math.max(1, currentValue - 2),
          Math.max(1, currentValue - 1),
          currentValue,
          currentValue + 1,
          currentValue + 2,
          currentValue + 3,
        ];
      case 'cost':
        return [
          Math.max(0, currentValue - 1),
          currentValue,
          currentValue + 1,
        ];
      default:
        return [currentValue];
    }
  }

  private getStatWeight(stat: string): number {
    switch (stat) {
      case 'attack': return 0.015;
      case 'defense': return 0.01;
      case 'cost': return -0.03;
      default: return 0.01;
    }
  }

  private applyCardModification(
    cardId: string,
    stat: string,
    value: number
  ): Record<string, CardData> {
    const cards = loadCards();
    const modified = { ...cards };

    if (modified[cardId]) {
      modified[cardId] = {
        ...modified[cardId],
        [stat]: value,
      };
    }

    return modified;
  }

  private getAverageBaseline(): number {
    if (this.baselineResults.size === 0) return 0.5;
    const sum = Array.from(this.baselineResults.values()).reduce((a, b) => a + b, 0);
    return sum / this.baselineResults.size;
  }

  private calculateConfidence(
    results: { value: number; winRate: number }[],
    suggestedValue: number
  ): number {
    if (results.length < 2) return 0;

    // 결과의 일관성 기반 신뢰도
    const winRates = results.map(r => r.winRate);
    const mean = winRates.reduce((a, b) => a + b, 0) / winRates.length;
    const variance = winRates.reduce((sum, wr) => sum + Math.pow(wr - mean, 2), 0) / winRates.length;
    const stdDev = Math.sqrt(variance);

    // 표준편차가 낮을수록 신뢰도 높음
    return Math.max(0, Math.min(1, 1 - stdDev * 2));
  }

  private generateReason(
    stat: string,
    currentValue: number,
    suggestedValue: number,
    winRateDelta: number
  ): string {
    const direction = suggestedValue > currentValue ? '증가' : '감소';
    const impact = Math.abs(winRateDelta * 100).toFixed(1);

    const statNames: Record<string, string> = {
      attack: '공격력',
      defense: '방어력',
      cost: '코스트',
    };

    const statName = statNames[stat] || stat;

    return `${statName}을 ${currentValue}에서 ${suggestedValue}로 ${direction}시키면 승률이 약 ${impact}% ${winRateDelta > 0 ? '상승' : '하락'}할 것으로 예상됩니다.`;
  }

  // ==================== 전체 분석 ====================

  async analyzeAllCards(deckCards: string[], enemyIds: string[]): Promise<BalanceAnalysis[]> {
    const cards = loadCards();
    const analyses: BalanceAnalysis[] = [];

    console.log(`🔍 ${Object.keys(cards).length}개 카드 분석 시작...`);

    for (const cardId of Object.keys(cards)) {
      try {
        const analysis = await this.analyzeCard(cardId, deckCards, enemyIds);
        analyses.push(analysis);
        console.log(`  ✓ ${cardId} 분석 완료`);
      } catch (error) {
        console.warn(`  ✗ ${cardId} 분석 실패:`, error);
      }
    }

    // 변경 필요도가 높은 순으로 정렬
    analyses.sort((a, b) =>
      Math.abs(b.expectedWinRateChange) - Math.abs(a.expectedWinRateChange)
    );

    return analyses;
  }

  // ==================== 빠른 밸런스 체크 ====================

  async quickBalanceCheck(deckCards: string[], enemyIds: string[]): Promise<{
    overperforming: string[];
    underperforming: string[];
    balanced: string[];
  }> {
    const cards = loadCards();
    const overperforming: string[] = [];
    const underperforming: string[] = [];
    const balanced: string[] = [];

    // 카드별 개별 테스트
    for (const cardId of Object.keys(cards)) {
      const deckWithCard = deckCards.includes(cardId)
        ? deckCards
        : [...deckCards.slice(0, -1), cardId];

      let totalWinRate = 0;
      let testCount = 0;

      for (const enemyId of enemyIds.slice(0, 3)) {
        const config: SimulationConfig = {
          battles: 20,
          maxTurns: this.options.maxTurns,
          enemyIds: [enemyId],
          playerDeck: deckWithCard,
        };

        const result = await this.simulator.run(config);
        totalWinRate += result.summary.winRate;
        testCount++;
      }

      const avgWinRate = totalWinRate / testCount;

      if (avgWinRate > 0.65) {
        overperforming.push(cardId);
      } else if (avgWinRate < 0.35) {
        underperforming.push(cardId);
      } else {
        balanced.push(cardId);
      }
    }

    return { overperforming, underperforming, balanced };
  }
}

// ==================== 시뮬레이터 인터페이스 ====================

export interface SimulatorInterface {
  run(config: SimulationConfig, modifiedCards?: Record<string, CardData>): Promise<SimulationResult>;
}

// ==================== 간단한 내장 시뮬레이터 ====================

export class SimpleBalanceSimulator implements SimulatorInterface {
  private cards: Record<string, CardData>;

  constructor() {
    this.cards = loadCards();
  }

  async run(config: SimulationConfig, modifiedCards?: Record<string, CardData>): Promise<SimulationResult> {
    const cards = modifiedCards || this.cards;
    const enemies = loadEnemies();
    const startTime = Date.now();

    const results = [];
    let wins = 0;
    let totalTurns = 0;
    let totalPlayerDamage = 0;

    for (let i = 0; i < config.battles; i++) {
      const enemyId = config.enemyIds[i % config.enemyIds.length];
      const enemy = enemies[enemyId];

      if (!enemy) continue;

      // 간단한 전투 시뮬레이션
      let playerHp = 100;
      let enemyHp = enemy.hp;
      let turn = 0;
      let playerDamageDealt = 0;

      while (turn < config.maxTurns && playerHp > 0 && enemyHp > 0) {
        turn++;

        // 플레이어 턴
        const playerCards = config.playerDeck.slice(0, 3);
        for (const cardId of playerCards) {
          const card = cards[cardId];
          if (card?.attack) {
            enemyHp -= card.attack;
            playerDamageDealt += card.attack;
          }
        }

        if (enemyHp <= 0) break;

        // 적 턴
        const enemyCards = enemy.deck.slice(0, enemy.cardsPerTurn);
        for (const cardId of enemyCards) {
          const card = cards[cardId];
          if (card?.attack) {
            playerHp -= card.attack;
          }
        }
      }

      const winner = enemyHp <= 0 ? 'player' : playerHp <= 0 ? 'enemy' : 'draw';
      if (winner === 'player') wins++;
      totalTurns += turn;
      totalPlayerDamage += playerDamageDealt;

      results.push({
        winner,
        turns: turn,
        playerDamageDealt,
        enemyDamageDealt: 100 - Math.max(0, playerHp),
        playerFinalHp: Math.max(0, playerHp),
        enemyFinalHp: Math.max(0, enemyHp),
        battleLog: [],
        cardUsage: {},
        comboStats: {},
      });
    }

    const summary: SimulationSummary = {
      totalBattles: config.battles,
      wins,
      losses: config.battles - wins,
      draws: 0,
      winRate: wins / config.battles,
      avgTurns: totalTurns / config.battles,
      avgPlayerDamage: totalPlayerDamage / config.battles,
      avgEnemyDamage: (100 * (config.battles - wins)) / config.battles,
      cardEfficiency: {},
    };

    return {
      config,
      results,
      summary,
      timestamp: Date.now(),
      duration: Date.now() - startTime,
    };
  }
}

// ==================== 밸런스 추천 생성 ====================

export function generateBalanceRecommendations(analyses: BalanceAnalysis[]): string {
  const lines: string[] = ['# 밸런스 추천 보고서\n'];

  const needsBuffs = analyses.filter(a =>
    a.suggestedChanges.some(c => c.suggestedValue > c.currentValue && c.stat !== 'cost')
  );

  const needsNerfs = analyses.filter(a =>
    a.suggestedChanges.some(c => c.suggestedValue < c.currentValue && c.stat !== 'cost')
  );

  if (needsBuffs.length > 0) {
    lines.push('## 버프 필요 카드\n');
    for (const analysis of needsBuffs.slice(0, 5)) {
      lines.push(`### ${analysis.cardId}`);
      for (const change of analysis.suggestedChanges) {
        lines.push(`- ${change.reason}`);
      }
      lines.push('');
    }
  }

  if (needsNerfs.length > 0) {
    lines.push('## 너프 필요 카드\n');
    for (const analysis of needsNerfs.slice(0, 5)) {
      lines.push(`### ${analysis.cardId}`);
      for (const change of analysis.suggestedChanges) {
        lines.push(`- ${change.reason}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
