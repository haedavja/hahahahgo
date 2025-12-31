/**
 * @file synergy.ts
 * @description 카드 시너지 분석 - 최적의 카드 조합 자동 발견
 *
 * 기능:
 * - 카드 쌍 시너지 분석
 * - 최적 덱 자동 구성
 * - 시너지 매트릭스 생성
 * - 아케타입별 추천
 */

import type { SimulationConfig, BattleResult, SimulationSummary } from '../core/types';
import { loadCards, loadEnemies, loadPresets, type CardData, type EnemyData } from '../data/loader';
import type { SimulatorInterface } from './balance';

// ==================== 시너지 타입 ====================

export interface SynergyPair {
  card1: string;
  card2: string;
  synergyScore: number;
  winRateBoost: number;
  reason: string;
}

export interface DeckSynergy {
  cards: string[];
  overallSynergy: number;
  keyPairs: SynergyPair[];
  archetype: string;
  strength: string[];
  weakness: string[];
}

export interface SynergyMatrix {
  cards: string[];
  matrix: number[][];  // [i][j] = card i와 card j의 시너지 점수
  topPairs: SynergyPair[];
}

export interface DeckRecommendation {
  deck: string[];
  expectedWinRate: number;
  synergies: SynergyPair[];
  archetype: string;
  description: string;
}

// ==================== 시너지 분석기 ====================

export interface SynergyAnalyzerOptions {
  battlesPerTest: number;
  maxTurns: number;
  testEnemies: string[];
}

export class SynergyAnalyzer {
  private simulator: SimulatorInterface;
  private options: SynergyAnalyzerOptions;
  private cards: Record<string, CardData>;
  private baselineWinRates: Map<string, number> = new Map();

  constructor(simulator: SimulatorInterface, options: Partial<SynergyAnalyzerOptions> = {}) {
    this.simulator = simulator;
    this.cards = loadCards();
    this.options = {
      battlesPerTest: options.battlesPerTest || 50,
      maxTurns: options.maxTurns || 30,
      testEnemies: options.testEnemies || ['ghoul', 'hunter', 'berserker'],
    };
  }

  // ==================== 기준선 설정 ====================

  async establishBaseline(): Promise<void> {
    console.log('📊 기준선 승률 측정 중...');

    for (const cardId of Object.keys(this.cards)) {
      const deck = this.createTestDeck([cardId]);
      const winRate = await this.testDeck(deck);
      this.baselineWinRates.set(cardId, winRate);
    }
  }

  // ==================== 카드 쌍 시너지 분석 ====================

  async analyzePairSynergy(card1: string, card2: string): Promise<SynergyPair> {
    // 개별 카드 승률
    const baseline1 = this.baselineWinRates.get(card1) || 0.5;
    const baseline2 = this.baselineWinRates.get(card2) || 0.5;
    const expectedCombined = (baseline1 + baseline2) / 2;

    // 함께 사용했을 때 승률
    const combinedDeck = this.createTestDeck([card1, card2]);
    const actualWinRate = await this.testDeck(combinedDeck);

    // 시너지 점수 = 실제 승률 - 예상 승률
    const synergyScore = actualWinRate - expectedCombined;
    const winRateBoost = synergyScore * 100;

    // 시너지 이유 추론
    const reason = this.inferSynergyReason(card1, card2, synergyScore);

    return {
      card1,
      card2,
      synergyScore,
      winRateBoost,
      reason,
    };
  }

  // ==================== 시너지 매트릭스 생성 ====================

  async generateSynergyMatrix(cardIds?: string[]): Promise<SynergyMatrix> {
    const cards = cardIds || Object.keys(this.cards).slice(0, 15);  // 기본 15개
    const n = cards.length;
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    const pairs: SynergyPair[] = [];

    console.log(`🔍 ${n}개 카드의 시너지 매트릭스 생성 중...`);

    // 기준선 없으면 설정
    if (this.baselineWinRates.size === 0) {
      await this.establishBaseline();
    }

    let completed = 0;
    const total = (n * (n - 1)) / 2;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const pair = await this.analyzePairSynergy(cards[i], cards[j]);

        matrix[i][j] = pair.synergyScore;
        matrix[j][i] = pair.synergyScore;
        pairs.push(pair);

        completed++;
        if (completed % 10 === 0) {
          console.log(`  진행: ${completed}/${total}`);
        }
      }
    }

    // 상위 시너지 쌍 정렬
    const topPairs = pairs.sort((a, b) => b.synergyScore - a.synergyScore).slice(0, 10);

    return { cards, matrix, topPairs };
  }

  // ==================== 최적 덱 생성 ====================

  async findOptimalDeck(
    deckSize: number = 8,
    mustInclude: string[] = []
  ): Promise<DeckRecommendation> {
    console.log(`🎯 최적 덱 탐색 중 (크기: ${deckSize})...`);

    const allCards = Object.keys(this.cards);
    const deck = [...mustInclude];
    const candidates = allCards.filter(c => !mustInclude.includes(c));

    // 그리디 알고리즘: 현재 덱과 시너지가 가장 높은 카드 추가
    while (deck.length < deckSize && candidates.length > 0) {
      let bestCard = '';
      let bestScore = -Infinity;

      for (const candidate of candidates) {
        // 현재 덱의 모든 카드와 시너지 점수 합산
        let totalSynergy = 0;
        for (const existingCard of deck) {
          const pair = await this.analyzePairSynergy(existingCard, candidate);
          totalSynergy += pair.synergyScore;
        }

        if (totalSynergy > bestScore) {
          bestScore = totalSynergy;
          bestCard = candidate;
        }
      }

      if (bestCard) {
        deck.push(bestCard);
        candidates.splice(candidates.indexOf(bestCard), 1);
      } else {
        break;
      }
    }

    // 최종 덱 테스트
    const winRate = await this.testDeck(deck);

    // 시너지 분석
    const synergies: SynergyPair[] = [];
    for (let i = 0; i < deck.length; i++) {
      for (let j = i + 1; j < deck.length; j++) {
        const pair = await this.analyzePairSynergy(deck[i], deck[j]);
        if (pair.synergyScore > 0.02) {
          synergies.push(pair);
        }
      }
    }

    synergies.sort((a, b) => b.synergyScore - a.synergyScore);

    // 아케타입 추론
    const archetype = this.inferArchetype(deck);

    return {
      deck,
      expectedWinRate: winRate,
      synergies: synergies.slice(0, 5),
      archetype,
      description: this.generateDeckDescription(deck, archetype, winRate),
    };
  }

  // ==================== 아케타입별 추천 ====================

  async getArchetypeRecommendations(): Promise<Record<string, DeckRecommendation>> {
    const archetypes = ['aggressive', 'defensive', 'combo', 'balanced', 'control'];
    const recommendations: Record<string, DeckRecommendation> = {};

    for (const archetype of archetypes) {
      console.log(`  🎴 ${archetype} 아케타입 분석...`);
      const coreCards = this.getArchetypeCoreCards(archetype);
      const deck = await this.findOptimalDeck(8, coreCards);
      recommendations[archetype] = deck;
    }

    return recommendations;
  }

  // ==================== 헬퍼 함수 ====================

  private createTestDeck(mustInclude: string[]): string[] {
    const baseCards = ['slash', 'slash', 'defend', 'defend'];
    const deck = [...baseCards];

    for (const card of mustInclude) {
      // 기존 카드 대체
      deck.splice(0, 1);
      deck.push(card);
    }

    // 8장 채우기
    while (deck.length < 8) {
      deck.push('slash');
    }

    return deck;
  }

  private async testDeck(deck: string[]): Promise<number> {
    let totalWinRate = 0;

    for (const enemyId of this.options.testEnemies) {
      const config: SimulationConfig = {
        battles: Math.floor(this.options.battlesPerTest / this.options.testEnemies.length),
        maxTurns: this.options.maxTurns,
        enemyIds: [enemyId],
        playerDeck: deck,
      };

      const result = await this.simulator.run(config);
      totalWinRate += result.summary.winRate;
    }

    return totalWinRate / this.options.testEnemies.length;
  }

  private inferSynergyReason(card1: string, card2: string, score: number): string {
    const c1 = this.cards[card1];
    const c2 = this.cards[card2];

    if (!c1 || !c2) return '알 수 없음';

    const reasons: string[] = [];

    // 같은 타입
    if (c1.type === c2.type) {
      if (c1.type === 'attack') reasons.push('공격 집중');
      if (c1.type === 'defense') reasons.push('방어 집중');
    }

    // chain + followup 콤보
    if (c1.traits?.includes('chain') && c2.traits?.includes('followup')) {
      reasons.push('연계 콤보');
    }
    if (c2.traits?.includes('chain') && c1.traits?.includes('followup')) {
      reasons.push('연계 콤보');
    }

    // 공격 + 취약 부여
    if (c1.attack && c2.effects?.applyVulnerable) {
      reasons.push('취약 활용');
    }
    if (c2.attack && c1.effects?.applyVulnerable) {
      reasons.push('취약 활용');
    }

    // 같은 카드 (콤보 가능)
    if (card1 === card2) {
      reasons.push('페어/트리플 콤보');
    }

    if (score > 0.05) {
      reasons.push('높은 시너지');
    } else if (score < -0.05) {
      reasons.push('안티 시너지');
    }

    return reasons.length > 0 ? reasons.join(', ') : '일반적 조합';
  }

  private inferArchetype(deck: string[]): string {
    const types = { attack: 0, defense: 0, skill: 0 };
    let chainCount = 0;

    for (const cardId of deck) {
      const card = this.cards[cardId];
      if (!card) continue;

      types[card.type]++;
      if (card.traits?.includes('chain')) chainCount++;
    }

    if (types.attack >= 5) return 'aggressive';
    if (types.defense >= 4) return 'defensive';
    if (chainCount >= 2) return 'combo';
    if (types.skill >= 3) return 'control';
    return 'balanced';
  }

  private getArchetypeCoreCards(archetype: string): string[] {
    const cores: Record<string, string[]> = {
      aggressive: ['heavyBlow', 'combo'],
      defensive: ['ironWall', 'counterAttack'],
      combo: ['combo', 'dualWield'],
      balanced: ['shieldBash', 'bash'],
      control: ['bash', 'rage'],
    };

    return cores[archetype] || [];
  }

  private generateDeckDescription(deck: string[], archetype: string, winRate: number): string {
    const cardNames = deck.map(id => this.cards[id]?.name || id).join(', ');
    return `[${archetype}] 예상 승률 ${(winRate * 100).toFixed(1)}%\n구성: ${cardNames}`;
  }
}

// ==================== 시너지 리포트 생성 ====================

export function generateSynergyReport(matrix: SynergyMatrix): string {
  const lines: string[] = [];

  lines.push('# 카드 시너지 분석 리포트\n');

  lines.push('## 상위 시너지 조합\n');
  for (let i = 0; i < matrix.topPairs.length; i++) {
    const pair = matrix.topPairs[i];
    const boost = pair.winRateBoost > 0 ? `+${pair.winRateBoost.toFixed(1)}%` : `${pair.winRateBoost.toFixed(1)}%`;
    lines.push(`${i + 1}. **${pair.card1}** + **${pair.card2}**: ${boost}`);
    lines.push(`   - 이유: ${pair.reason}`);
  }

  lines.push('\n## 시너지 매트릭스\n');
  lines.push('| 카드 | ' + matrix.cards.join(' | ') + ' |');
  lines.push('|---' + '|---'.repeat(matrix.cards.length) + '|');

  for (let i = 0; i < matrix.cards.length; i++) {
    const row = matrix.cards[i] + ' | ' + matrix.matrix[i].map(v =>
      v > 0.05 ? '🟢' : v < -0.05 ? '🔴' : '⚪'
    ).join(' | ');
    lines.push('| ' + row + ' |');
  }

  return lines.join('\n');
}

// ==================== 콘솔 출력 ====================

export function printSynergyMatrix(matrix: SynergyMatrix): void {
  console.log('\n' + '═'.repeat(60));
  console.log('🔗 카드 시너지 분석');
  console.log('═'.repeat(60));

  console.log('\n📊 상위 시너지 조합:');
  for (let i = 0; i < Math.min(10, matrix.topPairs.length); i++) {
    const pair = matrix.topPairs[i];
    const icon = pair.synergyScore > 0 ? '🟢' : '🔴';
    const boost = pair.winRateBoost > 0 ? `+${pair.winRateBoost.toFixed(1)}%` : `${pair.winRateBoost.toFixed(1)}%`;
    console.log(`  ${icon} ${pair.card1} + ${pair.card2}: ${boost}`);
    console.log(`     └ ${pair.reason}`);
  }

  console.log('\n' + '═'.repeat(60));
}

export function printDeckRecommendation(rec: DeckRecommendation): void {
  console.log('\n' + '═'.repeat(60));
  console.log(`🎴 추천 덱: ${rec.archetype}`);
  console.log('═'.repeat(60));

  console.log(`\n📋 덱 구성:`);
  console.log(`   ${rec.deck.join(', ')}`);

  console.log(`\n📈 예상 승률: ${(rec.expectedWinRate * 100).toFixed(1)}%`);

  if (rec.synergies.length > 0) {
    console.log(`\n🔗 주요 시너지:`);
    for (const syn of rec.synergies) {
      console.log(`   • ${syn.card1} + ${syn.card2}: ${syn.reason}`);
    }
  }

  console.log('\n' + '═'.repeat(60));
}
