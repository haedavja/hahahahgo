/**
 * @file deck-analyzer.ts
 * @description 종합 덱 분석기 - 구성 검증, 마나 곡선, 손패 확률, 승리 조건 분석
 */

import type { SimulationConfig, SimulationResult, BattleResult } from '../core/types';
import { loadCards, loadEnemies, type CardData, type EnemyData } from '../data/loader';
import type { SimulatorInterface } from './balance';
import { SynergyAnalyzer, type SynergyPair, type DeckSynergy } from './synergy';
import { getConfig } from '../core/config';

// ==================== 덱 분석 타입 ====================

export interface DeckAnalysisResult {
  deckId: string;
  cards: string[];
  stats: DeckStats;
  curve: ManaCurve;
  composition: DeckComposition;
  consistency: ConsistencyAnalysis;
  winConditions: WinCondition[];
  matchups: MatchupAnalysis[];
  risks: RiskAnalysis;
  recommendations: DeckRecommendation[];
  score: DeckScore;
}

export interface DeckStats {
  totalCards: number;
  uniqueCards: number;
  avgCost: number;
  totalAttack: number;
  totalDefense: number;
  avgAttack: number;
  avgDefense: number;
  costDistribution: Record<number, number>;
  typeDistribution: Record<string, number>;
  traitDistribution: Record<string, number>;
}

export interface ManaCurve {
  distribution: { cost: number; count: number; percentage: number }[];
  avgCost: number;
  medianCost: number;
  efficiency: number;  // 0-100, 이상적인 곡선 대비
  issues: string[];
}

export interface DeckComposition {
  attackCards: number;
  defenseCards: number;
  utilityCards: number;
  comboCards: number;
  ratio: { attack: number; defense: number; utility: number };
  archetype: DeckArchetype;
  archetypeConfidence: number;
}

export type DeckArchetype =
  | 'aggro'          // 빠른 공격
  | 'midrange'       // 균형
  | 'control'        // 느린 제어
  | 'combo'          // 콤보 의존
  | 'defensive'      // 방어 중심
  | 'tempo'          // 효율 중심
  | 'hybrid';        // 혼합

export interface ConsistencyAnalysis {
  keyCardAccess: { turn: number; probability: number }[];
  drawProbabilities: HandProbability[];
  mulligan: MulliganAdvice;
  brickChance: number;  // 사용 불가 손패 확률
}

export interface HandProbability {
  turn: number;
  handSize: number;
  combos: { combo: string[]; probability: number }[];
  expectedDamage: number;
  expectedBlock: number;
}

export interface MulliganAdvice {
  keep: string[];       // 유지해야 할 카드
  redraw: string[];     // 다시 뽑아야 할 카드
  priority: { cardId: string; priority: number; reason: string }[];
}

export interface WinCondition {
  name: string;
  type: 'damage' | 'sustain' | 'combo' | 'grind' | 'tempo';
  cards: string[];
  achievability: number;  // 0-100
  avgTurnsToWin: number;
  description: string;
}

export interface MatchupAnalysis {
  enemyId: string;
  enemyName: string;
  winRate: number;
  favorability: 'very_favorable' | 'favorable' | 'even' | 'unfavorable' | 'very_unfavorable';
  keyCards: string[];
  strategy: string;
  risk: string;
}

export interface RiskAnalysis {
  brickChance: number;
  lowDamageChance: number;
  noBlockChance: number;
  overdependencies: { cardId: string; dependencyLevel: number }[];
  weakTurns: number[];  // 취약한 턴
  vulnerabilities: string[];
}

export interface DeckRecommendation {
  type: 'add' | 'remove' | 'replace' | 'adjust_ratio';
  priority: 'high' | 'medium' | 'low';
  cardId?: string;
  replacement?: string;
  reason: string;
  expectedImpact: number;  // 예상 승률 변화
}

export interface DeckScore {
  overall: number;      // 0-100
  power: number;        // 공격력
  consistency: number;  // 일관성
  flexibility: number;  // 유연성
  synergy: number;      // 시너지
  efficiency: number;   // 효율
  breakdown: { category: string; score: number; weight: number }[];
}

// ==================== 덱 분석기 ====================

export interface DeckAnalyzerOptions {
  battlesPerMatchup: number;
  maxTurns: number;
  testEnemies: string[];
  deckSize: number;
  handSize: number;
  energyPerTurn: number;
}

const DEFAULT_OPTIONS: DeckAnalyzerOptions = {
  battlesPerMatchup: 100,
  maxTurns: 30,
  testEnemies: ['ghoul', 'hunter', 'berserker', 'vampire'],
  deckSize: 10,
  handSize: 5,
  energyPerTurn: 3,
};

export class DeckAnalyzer {
  private cards: Record<string, CardData>;
  private enemies: Record<string, EnemyData>;
  private options: DeckAnalyzerOptions;
  private simulator?: SimulatorInterface;
  private synergyAnalyzer?: SynergyAnalyzer;

  constructor(options: Partial<DeckAnalyzerOptions> = {}, simulator?: SimulatorInterface) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.cards = loadCards();
    this.enemies = loadEnemies();
    this.simulator = simulator;
    if (simulator) {
      this.synergyAnalyzer = new SynergyAnalyzer(simulator, {
        battlesPerTest: options.battlesPerMatchup || 50,
      });
    }
  }

  // ==================== 메인 분석 ====================

  async analyze(deck: string[]): Promise<DeckAnalysisResult> {
    console.log(`🎴 덱 분석 시작: ${deck.length}장`);

    const deckId = this.generateDeckId(deck);
    const stats = this.calculateStats(deck);
    const curve = this.analyzeCurve(deck);
    const composition = this.analyzeComposition(deck);
    const consistency = this.analyzeConsistency(deck);
    const winConditions = this.identifyWinConditions(deck);
    const risks = this.analyzeRisks(deck);

    // 시뮬레이터 있으면 매치업 분석
    let matchups: MatchupAnalysis[] = [];
    if (this.simulator) {
      matchups = await this.analyzeMatchups(deck);
    }

    const recommendations = this.generateRecommendations(deck, stats, curve, composition, risks);
    const score = this.calculateScore(stats, curve, composition, consistency, risks, matchups);

    return {
      deckId,
      cards: deck,
      stats,
      curve,
      composition,
      consistency,
      winConditions,
      matchups,
      risks,
      recommendations,
      score,
    };
  }

  // ==================== 기본 통계 ====================

  private calculateStats(deck: string[]): DeckStats {
    const costDist: Record<number, number> = {};
    const typeDist: Record<string, number> = {};
    const traitDist: Record<string, number> = {};
    const uniqueCards = new Set<string>();

    let totalAttack = 0;
    let totalDefense = 0;
    let totalCost = 0;

    for (const cardId of deck) {
      uniqueCards.add(cardId);
      const card = this.cards[cardId];
      if (!card) continue;

      // 코스트 분포
      costDist[card.cost] = (costDist[card.cost] || 0) + 1;
      totalCost += card.cost;

      // 타입 분포
      typeDist[card.type] = (typeDist[card.type] || 0) + 1;

      // 특성 분포
      for (const trait of card.traits || []) {
        traitDist[trait] = (traitDist[trait] || 0) + 1;
      }

      totalAttack += card.attack || 0;
      totalDefense += card.defense || 0;
    }

    return {
      totalCards: deck.length,
      uniqueCards: uniqueCards.size,
      avgCost: totalCost / deck.length,
      totalAttack,
      totalDefense,
      avgAttack: totalAttack / deck.length,
      avgDefense: totalDefense / deck.length,
      costDistribution: costDist,
      typeDistribution: typeDist,
      traitDistribution: traitDist,
    };
  }

  // ==================== 마나 곡선 분석 ====================

  private analyzeCurve(deck: string[]): ManaCurve {
    const costs: number[] = [];
    const costCounts: Record<number, number> = {};

    for (const cardId of deck) {
      const card = this.cards[cardId];
      if (!card) continue;

      costs.push(card.cost);
      costCounts[card.cost] = (costCounts[card.cost] || 0) + 1;
    }

    costs.sort((a, b) => a - b);
    const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
    const medianCost = costs[Math.floor(costs.length / 2)];

    // 분포 계산
    const maxCost = Math.max(...costs, 5);
    const distribution: ManaCurve['distribution'] = [];
    for (let cost = 0; cost <= maxCost; cost++) {
      const count = costCounts[cost] || 0;
      distribution.push({
        cost,
        count,
        percentage: (count / deck.length) * 100,
      });
    }

    // 이상적인 곡선과 비교하여 효율성 계산
    // 이상적: 0코 10%, 1코 25%, 2코 30%, 3코 25%, 4+코 10%
    const ideal = [0.1, 0.25, 0.30, 0.25, 0.10];
    let efficiency = 100;
    const issues: string[] = [];

    for (let i = 0; i <= 4; i++) {
      const actual = (costCounts[i] || 0) / deck.length;
      const diff = Math.abs(actual - (ideal[i] || 0));
      efficiency -= diff * 50;
    }

    efficiency = Math.max(0, Math.min(100, efficiency));

    // 문제점 식별
    if ((costCounts[0] || 0) / deck.length < 0.05) {
      issues.push('0코스트 카드 부족 - 초반 템포 손실 가능');
    }
    if ((costCounts[3] || 0) + (costCounts[4] || 0) + (costCounts[5] || 0) > deck.length * 0.4) {
      issues.push('고코스트 비율 높음 - 손패 정체 위험');
    }
    if (avgCost > 2.5) {
      issues.push('평균 코스트가 높음 - 에너지 부족 가능');
    }
    if ((costCounts[1] || 0) + (costCounts[2] || 0) < deck.length * 0.4) {
      issues.push('중저코스트 카드 부족 - 유연성 저하');
    }

    return { distribution, avgCost, medianCost, efficiency, issues };
  }

  // ==================== 덱 구성 분석 ====================

  private analyzeComposition(deck: string[]): DeckComposition {
    let attackCards = 0;
    let defenseCards = 0;
    let utilityCards = 0;
    let comboCards = 0;

    for (const cardId of deck) {
      const card = this.cards[cardId];
      if (!card) continue;

      if (card.type === 'attack') attackCards++;
      else if (card.type === 'defense') defenseCards++;
      else utilityCards++;

      // 콤보 카드 체크
      const comboTraits = ['chain', 'followup', 'finisher', 'echo'];
      if (card.traits?.some(t => comboTraits.includes(t))) {
        comboCards++;
      }
    }

    const total = attackCards + defenseCards + utilityCards;
    const ratio = {
      attack: total > 0 ? attackCards / total : 0,
      defense: total > 0 ? defenseCards / total : 0,
      utility: total > 0 ? utilityCards / total : 0,
    };

    // 아케타입 결정
    const { archetype, confidence } = this.determineArchetype(ratio, comboCards, deck);

    return {
      attackCards,
      defenseCards,
      utilityCards,
      comboCards,
      ratio,
      archetype,
      archetypeConfidence: confidence,
    };
  }

  private determineArchetype(
    ratio: { attack: number; defense: number; utility: number },
    comboCards: number,
    deck: string[]
  ): { archetype: DeckArchetype; confidence: number } {
    const scores: Record<DeckArchetype, number> = {
      aggro: 0,
      midrange: 0,
      control: 0,
      combo: 0,
      defensive: 0,
      tempo: 0,
      hybrid: 0,
    };

    // 공격 비율 기반
    if (ratio.attack >= 0.6) {
      scores.aggro += 40;
      scores.tempo += 20;
    } else if (ratio.attack >= 0.4) {
      scores.midrange += 30;
      scores.tempo += 15;
    }

    // 방어 비율 기반
    if (ratio.defense >= 0.5) {
      scores.defensive += 40;
      scores.control += 25;
    } else if (ratio.defense >= 0.3) {
      scores.midrange += 20;
    }

    // 콤보 카드 기반
    if (comboCards >= 4) {
      scores.combo += 50;
    } else if (comboCards >= 2) {
      scores.combo += 25;
    }

    // 평균 코스트 기반
    const avgCost = this.calculateStats(deck).avgCost;
    if (avgCost <= 1.5) {
      scores.aggro += 20;
      scores.tempo += 30;
    } else if (avgCost >= 2.5) {
      scores.control += 30;
    } else {
      scores.midrange += 25;
    }

    // 균형 체크
    if (Math.abs(ratio.attack - ratio.defense) < 0.15) {
      scores.midrange += 20;
      scores.hybrid += 15;
    }

    // 최고 점수 아케타입 선택
    let bestArchetype: DeckArchetype = 'midrange';
    let maxScore = 0;

    for (const [arch, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestArchetype = arch as DeckArchetype;
      }
    }

    // 신뢰도 계산 (최고 점수 / 총합)
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const confidence = totalScore > 0 ? (maxScore / totalScore) * 100 : 50;

    return { archetype: bestArchetype, confidence: Math.min(95, confidence) };
  }

  // ==================== 일관성 분석 ====================

  private analyzeConsistency(deck: string[]): ConsistencyAnalysis {
    const handSize = this.options.handSize;
    const deckSize = deck.length;

    // 핵심 카드 접근 확률
    const keyCards = this.identifyKeyCards(deck);
    const keyCardAccess: { turn: number; probability: number }[] = [];

    for (let turn = 1; turn <= 5; turn++) {
      const cardsDrawn = handSize + (turn - 1);
      const prob = this.hypergeometricProbability(deckSize, 2, cardsDrawn, 1);
      keyCardAccess.push({ turn, probability: prob });
    }

    // 손패 확률 시뮬레이션
    const drawProbabilities = this.simulateHandProbabilities(deck, 3);

    // 멀리건 조언
    const mulligan = this.generateMulliganAdvice(deck);

    // 브릭 확률 계산
    const brickChance = this.calculateBrickChance(deck);

    return { keyCardAccess, drawProbabilities, mulligan, brickChance };
  }

  private identifyKeyCards(deck: string[]): string[] {
    const keyCards: string[] = [];
    const cardCounts: Record<string, number> = {};

    for (const cardId of deck) {
      cardCounts[cardId] = (cardCounts[cardId] || 0) + 1;
    }

    for (const [cardId, count] of Object.entries(cardCounts)) {
      const card = this.cards[cardId];
      if (!card) continue;

      // 핵심 카드 조건:
      // - 2장 이상
      // - 콤보 특성 보유
      // - 높은 공격력/방어력
      const isKey =
        count >= 2 ||
        card.traits?.some(t => ['chain', 'finisher', 'combo'].includes(t)) ||
        (card.attack && card.attack >= 15) ||
        (card.defense && card.defense >= 15);

      if (isKey) keyCards.push(cardId);
    }

    return keyCards;
  }

  private simulateHandProbabilities(deck: string[], turns: number): HandProbability[] {
    const results: HandProbability[] = [];
    const simulations = getConfig().analysis.deckAnalysisSimulations;

    for (let turn = 1; turn <= turns; turn++) {
      const handSize = this.options.handSize;
      const cardsToCheck = handSize + (turn - 1);

      let totalDamage = 0;
      let totalBlock = 0;
      const comboCounts: Record<string, number> = {};

      for (let sim = 0; sim < simulations; sim++) {
        // 랜덤 손패 생성
        const shuffled = [...deck].sort(() => Math.random() - 0.5);
        const hand = shuffled.slice(0, Math.min(cardsToCheck, deck.length));

        // 피해량/방어력 계산
        let damage = 0;
        let block = 0;
        const energy = this.options.energyPerTurn;
        let usedEnergy = 0;

        // 에너지 내에서 카드 사용
        for (const cardId of hand) {
          const card = this.cards[cardId];
          if (!card || usedEnergy + card.cost > energy) continue;

          damage += card.attack || 0;
          block += card.defense || 0;
          usedEnergy += card.cost;
        }

        totalDamage += damage;
        totalBlock += block;

        // 콤보 체크
        const comboName = this.detectComboInHand(hand);
        if (comboName) {
          comboCounts[comboName] = (comboCounts[comboName] || 0) + 1;
        }
      }

      // 콤보 확률 계산
      const combos = Object.entries(comboCounts)
        .map(([combo, count]) => ({
          combo: [combo],
          probability: count / simulations,
        }))
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 3);

      results.push({
        turn,
        handSize: Math.min(cardsToCheck, deck.length),
        combos,
        expectedDamage: totalDamage / simulations,
        expectedBlock: totalBlock / simulations,
      });
    }

    return results;
  }

  private detectComboInHand(hand: string[]): string | null {
    const types = hand.map(id => this.cards[id]?.type).filter(Boolean);
    const traits = hand.flatMap(id => this.cards[id]?.traits || []);

    // 페어 체크
    const cardCounts: Record<string, number> = {};
    for (const cardId of hand) {
      cardCounts[cardId] = (cardCounts[cardId] || 0) + 1;
      if (cardCounts[cardId] >= 2) return 'Pair';
    }

    // 트리플 체크
    for (const count of Object.values(cardCounts)) {
      if (count >= 3) return 'Triple';
    }

    // chain + followup 콤보
    if (traits.includes('chain') && traits.includes('followup')) {
      return 'Chain Combo';
    }

    // 풀 어택 콤보
    if (types.filter(t => t === 'attack').length >= 3) {
      return 'Full Attack';
    }

    return null;
  }

  private generateMulliganAdvice(deck: string[]): MulliganAdvice {
    const keep: string[] = [];
    const redraw: string[] = [];
    const priority: { cardId: string; priority: number; reason: string }[] = [];

    const uniqueCards = [...new Set(deck)];

    for (const cardId of uniqueCards) {
      const card = this.cards[cardId];
      if (!card) continue;

      let keepScore = 0;
      let reason = '';

      // 낮은 코스트 유지
      if (card.cost <= 1) {
        keepScore += 30;
        reason = '낮은 코스트';
      }

      // 공격 카드 유지
      if (card.attack && card.attack >= 8) {
        keepScore += 20;
        reason = reason ? `${reason}, 좋은 공격력` : '좋은 공격력';
      }

      // 콤보 시작 카드 유지
      if (card.traits?.includes('chain')) {
        keepScore += 25;
        reason = reason ? `${reason}, 콤보 시작` : '콤보 시작';
      }

      // 고코스트 리드로우
      if (card.cost >= 3) {
        keepScore -= 30;
        reason = reason || '높은 코스트';
      }

      if (keepScore > 0) {
        keep.push(cardId);
        priority.push({ cardId, priority: keepScore, reason });
      } else {
        redraw.push(cardId);
        priority.push({ cardId, priority: keepScore, reason: reason || '낮은 가치' });
      }
    }

    priority.sort((a, b) => b.priority - a.priority);

    return { keep, redraw, priority };
  }

  private calculateBrickChance(deck: string[]): number {
    // 브릭 = 첫 손패로 아무것도 할 수 없는 경우
    const simulations = getConfig().analysis.deckAnalysisSimulations;
    let brickCount = 0;

    for (let sim = 0; sim < simulations; sim++) {
      const shuffled = [...deck].sort(() => Math.random() - 0.5);
      const hand = shuffled.slice(0, this.options.handSize);

      const energy = this.options.energyPerTurn;
      let canPlay = false;

      for (const cardId of hand) {
        const card = this.cards[cardId];
        if (card && card.cost <= energy) {
          canPlay = true;
          break;
        }
      }

      if (!canPlay) brickCount++;
    }

    return brickCount / simulations;
  }

  private hypergeometricProbability(
    N: number,  // 전체
    K: number,  // 성공 가능
    n: number,  // 뽑는 수
    k: number   // 원하는 성공
  ): number {
    // 간단한 근사 계산
    const pSingle = K / N;
    return 1 - Math.pow(1 - pSingle, n);
  }

  // ==================== 승리 조건 분석 ====================

  private identifyWinConditions(deck: string[]): WinCondition[] {
    const conditions: WinCondition[] = [];
    const stats = this.calculateStats(deck);
    const composition = this.analyzeComposition(deck);

    // 빠른 공격 승리
    if (stats.avgAttack >= 8 && composition.ratio.attack >= 0.5) {
      conditions.push({
        name: '빠른 공격',
        type: 'damage',
        cards: deck.filter(id => this.cards[id]?.type === 'attack'),
        achievability: Math.min(90, composition.ratio.attack * 100 + stats.avgAttack * 2),
        avgTurnsToWin: Math.ceil(100 / (stats.avgAttack * 2)), // 추정
        description: '높은 공격력으로 적을 빠르게 처치',
      });
    }

    // 콤보 승리
    if (composition.comboCards >= 3) {
      const comboCards = deck.filter(id =>
        this.cards[id]?.traits?.some(t => ['chain', 'followup', 'finisher'].includes(t))
      );
      conditions.push({
        name: '콤보 폭발',
        type: 'combo',
        cards: comboCards,
        achievability: Math.min(85, composition.comboCards * 20),
        avgTurnsToWin: 6,
        description: '연쇄 콤보로 대량 피해 달성',
      });
    }

    // 지구전 승리
    if (composition.ratio.defense >= 0.4 && stats.avgDefense >= 6) {
      conditions.push({
        name: '지구전',
        type: 'sustain',
        cards: deck.filter(id => this.cards[id]?.type === 'defense'),
        achievability: Math.min(80, composition.ratio.defense * 100 + stats.avgDefense),
        avgTurnsToWin: 15,
        description: '방어로 버티며 천천히 승리',
      });
    }

    // 템포 승리
    if (stats.avgCost <= 1.8) {
      conditions.push({
        name: '템포 우위',
        type: 'tempo',
        cards: deck.filter(id => (this.cards[id]?.cost || 0) <= 1),
        achievability: Math.min(75, (2 - stats.avgCost) * 50),
        avgTurnsToWin: 8,
        description: '낮은 코스트로 효율적인 플레이',
      });
    }

    // 기본 승리 조건
    if (conditions.length === 0) {
      conditions.push({
        name: '균형 플레이',
        type: 'grind',
        cards: deck,
        achievability: 50,
        avgTurnsToWin: 12,
        description: '다양한 카드를 활용한 균형 잡힌 플레이',
      });
    }

    return conditions.sort((a, b) => b.achievability - a.achievability);
  }

  // ==================== 매치업 분석 ====================

  private async analyzeMatchups(deck: string[]): Promise<MatchupAnalysis[]> {
    const matchups: MatchupAnalysis[] = [];

    if (!this.simulator) return matchups;

    for (const enemyId of this.options.testEnemies) {
      const enemy = this.enemies[enemyId];
      if (!enemy) continue;

      const config: SimulationConfig = {
        battles: this.options.battlesPerMatchup,
        maxTurns: this.options.maxTurns,
        enemyIds: [enemyId],
        playerDeck: deck,
      };

      try {
        const result = await this.simulator.run(config);
        const winRate = result.summary.winRate;

        let favorability: MatchupAnalysis['favorability'];
        if (winRate >= 0.7) favorability = 'very_favorable';
        else if (winRate >= 0.55) favorability = 'favorable';
        else if (winRate >= 0.45) favorability = 'even';
        else if (winRate >= 0.3) favorability = 'unfavorable';
        else favorability = 'very_unfavorable';

        // 핵심 카드 식별 (승리 게임에서 가장 많이 사용된 카드)
        const keyCards = this.identifyKeyCardsFromResults(result);

        matchups.push({
          enemyId,
          enemyName: enemy.name || enemyId,
          winRate,
          favorability,
          keyCards: keyCards.slice(0, 3),
          strategy: this.generateMatchupStrategy(winRate, favorability, enemy),
          risk: this.identifyMatchupRisk(winRate, enemy),
        });
      } catch (error) {
        console.warn(`  매치업 분석 실패: ${enemyId}`);
      }
    }

    return matchups.sort((a, b) => a.winRate - b.winRate);
  }

  private identifyKeyCardsFromResults(result: SimulationResult): string[] {
    const cardUsage: Record<string, number> = {};

    for (const battle of result.results) {
      if (battle.winner !== 'player') continue;
      for (const [cardId, uses] of Object.entries(battle.cardUsage)) {
        cardUsage[cardId] = (cardUsage[cardId] || 0) + uses;
      }
    }

    return Object.entries(cardUsage)
      .sort((a, b) => b[1] - a[1])
      .map(([cardId]) => cardId);
  }

  private generateMatchupStrategy(
    winRate: number,
    favorability: MatchupAnalysis['favorability'],
    enemy: EnemyData
  ): string {
    if (favorability === 'very_favorable') {
      return '공격적으로 플레이하여 빠르게 승리';
    }
    if (favorability === 'favorable') {
      return '안정적으로 플레이하며 우위 유지';
    }
    if (favorability === 'even') {
      return '핵심 카드를 효율적으로 사용하여 우위 확보';
    }
    if (favorability === 'unfavorable') {
      return '방어적으로 플레이하며 기회 포착';
    }
    return '리스크 최소화하며 신중하게 플레이';
  }

  private identifyMatchupRisk(winRate: number, enemy: EnemyData): string {
    if (winRate < 0.3) {
      return '높은 패배 확률 - 덱 조정 필요';
    }
    if (winRate < 0.45) {
      return '불리한 상성 - 플레이 실력 중요';
    }
    return '특별한 리스크 없음';
  }

  // ==================== 리스크 분석 ====================

  private analyzeRisks(deck: string[]): RiskAnalysis {
    const brickChance = this.calculateBrickChance(deck);
    const stats = this.calculateStats(deck);

    // 낮은 피해량 확률
    const lowDamageChance = this.simulateLowDamageChance(deck);

    // 방어 없는 손패 확률
    const noBlockChance = this.simulateNoBlockChance(deck);

    // 과의존 카드
    const overdependencies = this.identifyOverdependencies(deck);

    // 취약한 턴
    const weakTurns = this.identifyWeakTurns(deck);

    // 취약점
    const vulnerabilities: string[] = [];

    if (brickChance > 0.1) {
      vulnerabilities.push(`높은 브릭 확률 (${(brickChance * 100).toFixed(1)}%)`);
    }
    if (lowDamageChance > 0.3) {
      vulnerabilities.push(`피해량 부족 위험 (${(lowDamageChance * 100).toFixed(1)}%)`);
    }
    if (noBlockChance > 0.4) {
      vulnerabilities.push(`방어 부족 위험 (${(noBlockChance * 100).toFixed(1)}%)`);
    }
    if (stats.avgCost > 2.5) {
      vulnerabilities.push('에너지 부족 위험');
    }
    if (overdependencies.length > 0) {
      vulnerabilities.push(`${overdependencies[0].cardId}에 과도하게 의존`);
    }

    return {
      brickChance,
      lowDamageChance,
      noBlockChance,
      overdependencies,
      weakTurns,
      vulnerabilities,
    };
  }

  private simulateLowDamageChance(deck: string[]): number {
    const simulations = 500;
    let lowDamageCount = 0;
    const threshold = 10; // 이 미만이면 낮은 피해

    for (let sim = 0; sim < simulations; sim++) {
      const shuffled = [...deck].sort(() => Math.random() - 0.5);
      const hand = shuffled.slice(0, this.options.handSize);

      let damage = 0;
      let usedEnergy = 0;
      const energy = this.options.energyPerTurn;

      for (const cardId of hand) {
        const card = this.cards[cardId];
        if (!card || usedEnergy + card.cost > energy) continue;
        damage += card.attack || 0;
        usedEnergy += card.cost;
      }

      if (damage < threshold) lowDamageCount++;
    }

    return lowDamageCount / simulations;
  }

  private simulateNoBlockChance(deck: string[]): number {
    const simulations = 500;
    let noBlockCount = 0;

    for (let sim = 0; sim < simulations; sim++) {
      const shuffled = [...deck].sort(() => Math.random() - 0.5);
      const hand = shuffled.slice(0, this.options.handSize);

      let hasBlock = false;
      for (const cardId of hand) {
        const card = this.cards[cardId];
        if (card?.defense && card.defense > 0) {
          hasBlock = true;
          break;
        }
      }

      if (!hasBlock) noBlockCount++;
    }

    return noBlockCount / simulations;
  }

  private identifyOverdependencies(deck: string[]): { cardId: string; dependencyLevel: number }[] {
    const cardCounts: Record<string, number> = {};
    for (const cardId of deck) {
      cardCounts[cardId] = (cardCounts[cardId] || 0) + 1;
    }

    const dependencies: { cardId: string; dependencyLevel: number }[] = [];

    for (const [cardId, count] of Object.entries(cardCounts)) {
      const card = this.cards[cardId];
      if (!card) continue;

      // 덱에서 차지하는 비율이 높고 핵심 카드인 경우
      const ratio = count / deck.length;
      const isCore = card.attack && card.attack >= 12 || card.traits?.includes('finisher');

      if (ratio >= 0.3 || (ratio >= 0.2 && isCore)) {
        dependencies.push({
          cardId,
          dependencyLevel: ratio * 100,
        });
      }
    }

    return dependencies.sort((a, b) => b.dependencyLevel - a.dependencyLevel);
  }

  private identifyWeakTurns(deck: string[]): number[] {
    const weakTurns: number[] = [];
    const stats = this.calculateStats(deck);

    // 첫 턴이 취약 (고코스트 덱)
    if (stats.avgCost >= 2.5) {
      weakTurns.push(1);
    }

    // 중반 취약 (콤보 덱인데 콤보 파츠 부족)
    if (stats.traitDistribution['chain'] && !stats.traitDistribution['followup']) {
      weakTurns.push(3, 4);
    }

    return weakTurns;
  }

  // ==================== 추천 생성 ====================

  private generateRecommendations(
    deck: string[],
    stats: DeckStats,
    curve: ManaCurve,
    composition: DeckComposition,
    risks: RiskAnalysis
  ): DeckRecommendation[] {
    const recommendations: DeckRecommendation[] = [];

    // 마나 곡선 문제
    for (const issue of curve.issues) {
      if (issue.includes('0코스트')) {
        recommendations.push({
          type: 'add',
          priority: 'medium',
          cardId: 'slash', // 기본 0코스트 카드
          reason: '0코스트 카드 추가로 초반 템포 개선',
          expectedImpact: 3,
        });
      }
      if (issue.includes('고코스트')) {
        const highCostCard = deck.find(id => (this.cards[id]?.cost || 0) >= 3);
        if (highCostCard) {
          recommendations.push({
            type: 'remove',
            priority: 'high',
            cardId: highCostCard,
            reason: '고코스트 카드 제거로 손패 정체 방지',
            expectedImpact: 4,
          });
        }
      }
    }

    // 타입 불균형
    if (composition.ratio.attack < 0.3) {
      recommendations.push({
        type: 'adjust_ratio',
        priority: 'high',
        reason: '공격 카드 비율 증가 필요 (현재: ' + (composition.ratio.attack * 100).toFixed(0) + '%)',
        expectedImpact: 5,
      });
    }

    if (composition.ratio.defense < 0.2 && risks.noBlockChance > 0.3) {
      recommendations.push({
        type: 'add',
        priority: 'medium',
        cardId: 'defend',
        reason: '방어 카드 추가로 생존력 향상',
        expectedImpact: 3,
      });
    }

    // 리스크 기반 추천
    if (risks.brickChance > 0.15) {
      recommendations.push({
        type: 'adjust_ratio',
        priority: 'high',
        reason: '저코스트 카드 비율 증가 필요 (브릭 확률: ' + (risks.brickChance * 100).toFixed(1) + '%)',
        expectedImpact: 6,
      });
    }

    // 과의존 해소
    for (const dep of risks.overdependencies) {
      recommendations.push({
        type: 'replace',
        priority: 'medium',
        cardId: dep.cardId,
        reason: `${dep.cardId} 의존도 분산 권장 (${dep.dependencyLevel.toFixed(0)}%)`,
        expectedImpact: 2,
      });
    }

    // 시너지 개선
    if (composition.comboCards === 1) {
      recommendations.push({
        type: 'add',
        priority: 'low',
        reason: '콤보 카드 추가로 시너지 효과 증대',
        expectedImpact: 3,
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  // ==================== 점수 계산 ====================

  private calculateScore(
    stats: DeckStats,
    curve: ManaCurve,
    composition: DeckComposition,
    consistency: ConsistencyAnalysis,
    risks: RiskAnalysis,
    matchups: MatchupAnalysis[]
  ): DeckScore {
    const breakdown: { category: string; score: number; weight: number }[] = [];

    // 파워 점수 (공격력 기반)
    const power = Math.min(100, (stats.avgAttack / 10) * 100);
    breakdown.push({ category: '파워', score: power, weight: 0.2 });

    // 일관성 점수 (브릭 확률 반비례)
    const consistencyScore = Math.max(0, 100 - risks.brickChance * 500);
    breakdown.push({ category: '일관성', score: consistencyScore, weight: 0.25 });

    // 유연성 점수 (곡선 효율)
    const flexibility = curve.efficiency;
    breakdown.push({ category: '유연성', score: flexibility, weight: 0.15 });

    // 시너지 점수 (콤보 카드 비율)
    const synergy = Math.min(100, composition.comboCards * 20);
    breakdown.push({ category: '시너지', score: synergy, weight: 0.15 });

    // 효율 점수 (코스트 대비 가치)
    const efficiency = Math.min(100, ((stats.totalAttack + stats.totalDefense) / stats.avgCost) * 5);
    breakdown.push({ category: '효율', score: efficiency, weight: 0.25 });

    // 종합 점수
    const overall = breakdown.reduce((sum, b) => sum + b.score * b.weight, 0);

    return {
      overall,
      power,
      consistency: consistencyScore,
      flexibility,
      synergy,
      efficiency,
      breakdown,
    };
  }

  // ==================== 유틸리티 ====================

  private generateDeckId(deck: string[]): string {
    const sorted = [...deck].sort().join(',');
    let hash = 0;
    for (let i = 0; i < sorted.length; i++) {
      hash = ((hash << 5) - hash) + sorted.charCodeAt(i);
      hash |= 0;
    }
    return `deck_${Math.abs(hash).toString(16)}`;
  }
}

// ==================== 포매팅 ====================

export function formatDeckAnalysis(analysis: DeckAnalysisResult): string {
  const lines: string[] = [];

  lines.push('═'.repeat(60));
  lines.push(`🎴 덱 분석 리포트: ${analysis.deckId}`);
  lines.push('═'.repeat(60));

  // 기본 통계
  lines.push(`\n📊 기본 통계:`);
  lines.push(`   카드: ${analysis.stats.totalCards}장 (${analysis.stats.uniqueCards}종류)`);
  lines.push(`   평균 코스트: ${analysis.stats.avgCost.toFixed(2)}`);
  lines.push(`   평균 공격력: ${analysis.stats.avgAttack.toFixed(1)}`);
  lines.push(`   평균 방어력: ${analysis.stats.avgDefense.toFixed(1)}`);

  // 아케타입
  lines.push(`\n🎯 아케타입: ${analysis.composition.archetype.toUpperCase()}`);
  lines.push(`   신뢰도: ${analysis.composition.archetypeConfidence.toFixed(0)}%`);

  // 마나 곡선
  lines.push(`\n📈 마나 곡선:`);
  const curveBar = analysis.curve.distribution
    .map(d => `${d.cost}코: ${'█'.repeat(Math.round(d.percentage / 10))} ${d.count}장`)
    .join('\n   ');
  lines.push(`   ${curveBar}`);
  lines.push(`   효율: ${analysis.curve.efficiency.toFixed(0)}%`);
  if (analysis.curve.issues.length > 0) {
    lines.push(`   ⚠️ ${analysis.curve.issues.join(', ')}`);
  }

  // 승리 조건
  lines.push(`\n🏆 승리 조건:`);
  for (const wc of analysis.winConditions.slice(0, 2)) {
    lines.push(`   • ${wc.name}: ${wc.achievability.toFixed(0)}% (${wc.avgTurnsToWin}턴)`);
    lines.push(`     ${wc.description}`);
  }

  // 리스크
  if (analysis.risks.vulnerabilities.length > 0) {
    lines.push(`\n⚠️ 리스크:`);
    for (const vuln of analysis.risks.vulnerabilities) {
      lines.push(`   • ${vuln}`);
    }
  }

  // 매치업
  if (analysis.matchups.length > 0) {
    lines.push(`\n⚔️ 매치업:`);
    for (const m of analysis.matchups) {
      const icon = m.favorability.includes('favor') ? '🟢' : m.favorability === 'even' ? '🟡' : '🔴';
      lines.push(`   ${icon} ${m.enemyName}: ${(m.winRate * 100).toFixed(0)}%`);
    }
  }

  // 추천
  if (analysis.recommendations.length > 0) {
    lines.push(`\n💡 추천:`);
    for (const rec of analysis.recommendations.slice(0, 3)) {
      const priorityIcon = rec.priority === 'high' ? '❗' : rec.priority === 'medium' ? '❕' : '💭';
      lines.push(`   ${priorityIcon} ${rec.reason}`);
    }
  }

  // 종합 점수
  lines.push(`\n🎯 종합 점수: ${analysis.score.overall.toFixed(0)}/100`);
  lines.push(`   파워: ${analysis.score.power.toFixed(0)} | 일관성: ${analysis.score.consistency.toFixed(0)} | 유연성: ${analysis.score.flexibility.toFixed(0)}`);
  lines.push(`   시너지: ${analysis.score.synergy.toFixed(0)} | 효율: ${analysis.score.efficiency.toFixed(0)}`);

  lines.push('\n' + '═'.repeat(60));

  return lines.join('\n');
}
