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

// ==================== 다중 카드 시너지 (3+) ====================

export interface MultiCardSynergy {
  cards: string[];
  synergyScore: number;
  winRateBoost: number;
  comboType: 'triple' | 'chain' | 'archetype' | 'custom';
  description: string;
  usageStats: {
    frequency: number;
    avgWinRate: number;
    avgTurns: number;
  };
}

export interface SynergyNetwork {
  nodes: Array<{
    id: string;
    cardId: string;
    centrality: number;  // 얼마나 많은 시너지에 참여하는지
    avgSynergyScore: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    weight: number;
  }>;
  clusters: Array<{
    id: string;
    cards: string[];
    archetype: string;
    cohesion: number;
  }>;
}

export interface SynergyChain {
  sequence: string[];
  totalBonus: number;
  chainType: 'damage' | 'defense' | 'utility' | 'mixed';
  executionOrder: string[];
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

  // ==================== 3+ 카드 시너지 분석 ====================

  /**
   * 3장 카드 조합의 시너지 분석
   */
  async analyzeTripleSynergy(card1: string, card2: string, card3: string): Promise<MultiCardSynergy> {
    // 개별 쌍 시너지 합산
    const pair12 = await this.analyzePairSynergy(card1, card2);
    const pair13 = await this.analyzePairSynergy(card1, card3);
    const pair23 = await this.analyzePairSynergy(card2, card3);

    const pairSynergySum = pair12.synergyScore + pair13.synergyScore + pair23.synergyScore;

    // 3장 함께 사용 테스트
    const tripleDeck = this.createTestDeck([card1, card2, card3]);
    const actualWinRate = await this.testDeck(tripleDeck);

    // 기대 승률 (개별 + 쌍 시너지 기반)
    const baseline1 = this.baselineWinRates.get(card1) || 0.5;
    const baseline2 = this.baselineWinRates.get(card2) || 0.5;
    const baseline3 = this.baselineWinRates.get(card3) || 0.5;
    const expectedWinRate = (baseline1 + baseline2 + baseline3) / 3 + pairSynergySum / 3;

    // 트리플 시너지 = 실제 - 예상 (추가적인 시너지)
    const tripleSynergyBonus = actualWinRate - expectedWinRate;
    const totalSynergy = pairSynergySum + tripleSynergyBonus;

    return {
      cards: [card1, card2, card3],
      synergyScore: totalSynergy,
      winRateBoost: totalSynergy * 100,
      comboType: 'triple',
      description: this.describeTripleSynergy(card1, card2, card3, tripleSynergyBonus),
      usageStats: {
        frequency: 0,
        avgWinRate: actualWinRate,
        avgTurns: 0,
      },
    };
  }

  /**
   * 연쇄 시너지 분석 (순서가 중요한 조합)
   */
  async analyzeChainSynergy(cardSequence: string[]): Promise<SynergyChain> {
    if (cardSequence.length < 2) {
      return {
        sequence: cardSequence,
        totalBonus: 0,
        chainType: 'mixed',
        executionOrder: cardSequence,
        description: '연쇄에 최소 2장 필요',
      };
    }

    // 순차적 쌍 시너지 계산
    let totalBonus = 0;
    for (let i = 0; i < cardSequence.length - 1; i++) {
      const pair = await this.analyzePairSynergy(cardSequence[i], cardSequence[i + 1]);
      // 연쇄 보너스: 순서대로 사용하면 추가 보너스
      totalBonus += pair.synergyScore * (1 + i * 0.1);
    }

    // 체인 타입 결정
    const chainType = this.determineChainType(cardSequence);

    return {
      sequence: cardSequence,
      totalBonus,
      chainType,
      executionOrder: cardSequence,
      description: this.describeChain(cardSequence, totalBonus, chainType),
    };
  }

  /**
   * N장 카드 조합 분석 (일반화)
   */
  async analyzeMultiCardSynergy(cards: string[]): Promise<MultiCardSynergy> {
    if (cards.length < 3) {
      throw new Error('다중 카드 시너지는 최소 3장 필요');
    }

    if (cards.length === 3) {
      return this.analyzeTripleSynergy(cards[0], cards[1], cards[2]);
    }

    // N장 분석
    const deck = this.createTestDeck(cards);
    const actualWinRate = await this.testDeck(deck);

    // 모든 쌍 시너지 합산
    let pairSynergySum = 0;
    let pairCount = 0;
    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        const pair = await this.analyzePairSynergy(cards[i], cards[j]);
        pairSynergySum += pair.synergyScore;
        pairCount++;
      }
    }

    // 기대 승률
    let baselineSum = 0;
    for (const card of cards) {
      baselineSum += this.baselineWinRates.get(card) || 0.5;
    }
    const expectedWinRate = baselineSum / cards.length + pairSynergySum / pairCount;

    const multiSynergyBonus = actualWinRate - expectedWinRate;
    const totalSynergy = pairSynergySum + multiSynergyBonus;

    return {
      cards,
      synergyScore: totalSynergy,
      winRateBoost: totalSynergy * 100,
      comboType: cards.length >= 4 ? 'archetype' : 'triple',
      description: this.describeMultiSynergy(cards, multiSynergyBonus),
      usageStats: {
        frequency: 0,
        avgWinRate: actualWinRate,
        avgTurns: 0,
      },
    };
  }

  /**
   * 시너지 네트워크 생성
   */
  async buildSynergyNetwork(cardIds?: string[]): Promise<SynergyNetwork> {
    const cards = cardIds || Object.keys(this.cards).slice(0, 20);

    console.log(`🕸️ ${cards.length}개 카드의 시너지 네트워크 구축...`);

    // 시너지 매트릭스 생성
    const matrix = await this.generateSynergyMatrix(cards);

    // 노드 생성
    const nodes = cards.map(cardId => {
      const cardSynergies = matrix.topPairs.filter(
        p => p.card1 === cardId || p.card2 === cardId
      );
      return {
        id: cardId,
        cardId,
        centrality: cardSynergies.length,
        avgSynergyScore: cardSynergies.length > 0
          ? cardSynergies.reduce((sum, p) => sum + p.synergyScore, 0) / cardSynergies.length
          : 0,
      };
    });

    // 엣지 생성 (양수 시너지만)
    const edges = matrix.topPairs
      .filter(p => p.synergyScore > 0.01)
      .map(p => ({
        source: p.card1,
        target: p.card2,
        weight: p.synergyScore,
      }));

    // 클러스터링 (간단한 구현)
    const clusters = this.findSynergyClusters(cards, matrix);

    return { nodes, edges, clusters };
  }

  /**
   * 최고 다중 카드 조합 찾기
   */
  async findTopMultiCardCombos(
    comboSize: number = 3,
    topN: number = 10
  ): Promise<MultiCardSynergy[]> {
    const cardIds = Object.keys(this.cards);
    const combos: MultiCardSynergy[] = [];

    console.log(`🔍 ${comboSize}장 조합 탐색 중...`);

    // 조합 생성 (제한된 수만)
    const maxCombos = 100; // 계산량 제한
    let count = 0;

    for (let i = 0; i < cardIds.length && count < maxCombos; i++) {
      for (let j = i + 1; j < cardIds.length && count < maxCombos; j++) {
        for (let k = j + 1; k < cardIds.length && count < maxCombos; k++) {
          const cards = [cardIds[i], cardIds[j], cardIds[k]];

          if (comboSize === 3) {
            const synergy = await this.analyzeTripleSynergy(cards[0], cards[1], cards[2]);
            combos.push(synergy);
          } else if (comboSize === 4 && k + 1 < cardIds.length) {
            const cards4 = [...cards, cardIds[k + 1]];
            const synergy = await this.analyzeMultiCardSynergy(cards4);
            combos.push(synergy);
          }

          count++;

          if (count % 20 === 0) {
            console.log(`  진행: ${count}/${maxCombos}`);
          }
        }
      }
    }

    // 시너지 점수로 정렬
    combos.sort((a, b) => b.synergyScore - a.synergyScore);

    return combos.slice(0, topN);
  }

  // ==================== 다중 시너지 헬퍼 ====================

  private describeTripleSynergy(card1: string, card2: string, card3: string, bonus: number): string {
    const c1 = this.cards[card1];
    const c2 = this.cards[card2];
    const c3 = this.cards[card3];

    const types = [c1?.type, c2?.type, c3?.type].filter(Boolean);
    const uniqueTypes = new Set(types);

    if (uniqueTypes.size === 1) {
      return `${types[0]} 집중 조합 (${bonus > 0 ? '강한' : '약한'} 시너지)`;
    }

    if (types.filter(t => t === 'attack').length >= 2) {
      return `공격 중심 조합`;
    }

    if (types.filter(t => t === 'defense').length >= 2) {
      return `방어 중심 조합`;
    }

    return `균형 조합 (${bonus > 0.05 ? '높은' : bonus > 0 ? '보통' : '낮은'} 시너지)`;
  }

  private describeMultiSynergy(cards: string[], bonus: number): string {
    const types = cards.map(id => this.cards[id]?.type).filter(Boolean);
    const attackCount = types.filter(t => t === 'attack').length;
    const defenseCount = types.filter(t => t === 'defense').length;

    if (attackCount >= cards.length * 0.6) return `공격 아케타입 (${cards.length}장)`;
    if (defenseCount >= cards.length * 0.6) return `방어 아케타입 (${cards.length}장)`;
    return `혼합 아케타입 (${cards.length}장, 보너스: ${(bonus * 100).toFixed(1)}%)`;
  }

  private determineChainType(cards: string[]): 'damage' | 'defense' | 'utility' | 'mixed' {
    const types = cards.map(id => this.cards[id]?.type).filter(Boolean);
    const attackCount = types.filter(t => t === 'attack').length;
    const defenseCount = types.filter(t => t === 'defense').length;

    if (attackCount >= types.length * 0.7) return 'damage';
    if (defenseCount >= types.length * 0.7) return 'defense';
    if (attackCount === 0 && defenseCount === 0) return 'utility';
    return 'mixed';
  }

  private describeChain(cards: string[], bonus: number, type: string): string {
    const names = cards.map(id => this.cards[id]?.name || id);
    return `${names.join(' → ')} (${type}, +${(bonus * 100).toFixed(1)}%)`;
  }

  private findSynergyClusters(
    cards: string[],
    matrix: SynergyMatrix
  ): Array<{ id: string; cards: string[]; archetype: string; cohesion: number }> {
    const clusters: Array<{ id: string; cards: string[]; archetype: string; cohesion: number }> = [];
    const assigned = new Set<string>();

    // 높은 시너지 쌍에서 시작하여 클러스터 확장
    for (const pair of matrix.topPairs) {
      if (pair.synergyScore < 0.02) continue;
      if (assigned.has(pair.card1) && assigned.has(pair.card2)) continue;

      const cluster = new Set<string>();
      if (!assigned.has(pair.card1)) cluster.add(pair.card1);
      if (!assigned.has(pair.card2)) cluster.add(pair.card2);

      // 클러스터와 시너지가 높은 카드 추가
      for (const otherPair of matrix.topPairs) {
        if (otherPair.synergyScore < 0.02) continue;

        if (cluster.has(otherPair.card1) && !assigned.has(otherPair.card2)) {
          cluster.add(otherPair.card2);
        }
        if (cluster.has(otherPair.card2) && !assigned.has(otherPair.card1)) {
          cluster.add(otherPair.card1);
        }
      }

      if (cluster.size >= 3) {
        const clusterCards = Array.from(cluster);
        clusterCards.forEach(c => assigned.add(c));

        const archetype = this.inferArchetype(clusterCards);
        const cohesion = this.calculateClusterCohesion(clusterCards, matrix);

        clusters.push({
          id: `cluster_${clusters.length + 1}`,
          cards: clusterCards,
          archetype,
          cohesion,
        });
      }
    }

    return clusters;
  }

  private calculateClusterCohesion(cards: string[], matrix: SynergyMatrix): number {
    if (cards.length < 2) return 0;

    let totalSynergy = 0;
    let pairCount = 0;

    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        const idx1 = matrix.cards.indexOf(cards[i]);
        const idx2 = matrix.cards.indexOf(cards[j]);
        if (idx1 >= 0 && idx2 >= 0) {
          totalSynergy += matrix.matrix[idx1][idx2];
          pairCount++;
        }
      }
    }

    return pairCount > 0 ? totalSynergy / pairCount : 0;
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
