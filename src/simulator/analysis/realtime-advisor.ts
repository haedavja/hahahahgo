/**
 * @file realtime-advisor.ts
 * @description 실시간 추천 시스템 - 전투 중/덱 빌딩 시 실시간 조언
 *
 * ## 기능
 * - 전투 중 최적 카드 추천
 * - 덱 빌딩 시 카드 추가/제거 제안
 * - 상황별 전략 조언
 * - 위험 경고 시스템
 */

import type { GameState, TimelineCard } from '../core/types';
import type { CardData } from '../data/loader';
import { loadCards } from '../data/loader';
import { MCTSEngine, type MCTSOptions } from './mcts';
import { getLogger } from '../core/logger';

const log = getLogger('RealtimeAdvisor');

// ==================== 타입 정의 ====================

export interface CardRecommendation {
  cardId: string;
  cardName: string;
  score: number;              // 0-100 점수
  confidence: number;         // 0-1 신뢰도
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  alternativeActions?: string[];
}

export interface StrategicAdvice {
  type: 'offensive' | 'defensive' | 'neutral' | 'critical';
  message: string;
  urgency: 'immediate' | 'soon' | 'when_possible';
  details?: string[];
}

export interface DeckSuggestion {
  action: 'add' | 'remove' | 'replace';
  cardId: string;
  cardName: string;
  reason: string;
  impact: {
    winRateDelta: number;
    synergyDelta: number;
    curveDelta: number;
  };
}

export interface DangerWarning {
  level: 'info' | 'warning' | 'danger' | 'critical';
  message: string;
  suggestedAction: string;
  turnsUntilThreat?: number;
}

export interface BattleAdvice {
  recommendations: CardRecommendation[];
  strategy: StrategicAdvice;
  warnings: DangerWarning[];
  situationSummary: string;
}

export interface DeckBuildAdvice {
  suggestions: DeckSuggestion[];
  deckStrengths: string[];
  deckWeaknesses: string[];
  overallRating: number;
  synergyGroups: Array<{
    cards: string[];
    synergy: string;
    strength: number;
  }>;
}

// ==================== 전투 어드바이저 ====================

export class BattleAdvisor {
  private cards: Record<string, CardData>;
  private mctsEngine: MCTSEngine | null = null;
  private useMCTS: boolean;

  constructor(options: { useMCTS?: boolean; mctsOptions?: Partial<MCTSOptions> } = {}) {
    this.cards = loadCards();
    this.useMCTS = options.useMCTS ?? false;

    if (this.useMCTS) {
      this.mctsEngine = new MCTSEngine({
        maxIterations: 200,  // 빠른 응답을 위해 제한
        timeLimit: 500,
        ...options.mctsOptions,
      });
    }
  }

  /**
   * 현재 게임 상태에서 조언 생성
   */
  getAdvice(state: GameState): BattleAdvice {
    log.time('battle_advice');

    const recommendations = this.getCardRecommendations(state);
    const strategy = this.analyzeStrategy(state);
    const warnings = this.checkDangers(state);
    const situationSummary = this.summarizeSituation(state);

    log.timeEnd('battle_advice', 'Battle advice generated');

    return {
      recommendations,
      strategy,
      warnings,
      situationSummary,
    };
  }

  /**
   * 카드 추천
   */
  private getCardRecommendations(state: GameState): CardRecommendation[] {
    const recommendations: CardRecommendation[] = [];
    const playableCards = this.getPlayableCards(state);

    if (playableCards.length === 0) {
      return [{
        cardId: 'end_turn',
        cardName: '턴 종료',
        score: 100,
        confidence: 1,
        reasoning: '플레이 가능한 카드가 없습니다.',
        priority: 'high',
      }];
    }

    // MCTS 사용 시 AI 분석 결과 활용
    let mctsScores: Record<string, number> = {};
    if (this.useMCTS && this.mctsEngine) {
      const result = this.mctsEngine.findBestAction(state);
      for (const action of result.actionScores) {
        mctsScores[action.action] = action.value;
      }
    }

    for (const cardId of playableCards) {
      const card = this.cards[cardId];
      if (!card) continue;

      const analysis = this.analyzeCard(cardId, card, state);
      const mctsBoost = mctsScores[cardId] ? mctsScores[cardId] * 20 : 0;

      recommendations.push({
        cardId,
        cardName: card.name,
        score: Math.min(100, analysis.score + mctsBoost),
        confidence: analysis.confidence,
        reasoning: analysis.reasoning,
        priority: analysis.score >= 80 ? 'high' : analysis.score >= 50 ? 'medium' : 'low',
        alternativeActions: analysis.alternatives,
      });
    }

    return recommendations.sort((a, b) => b.score - a.score);
  }

  private getPlayableCards(state: GameState): string[] {
    return state.player.hand.filter(cardId => {
      const card = this.cards[cardId];
      return card && card.cost <= state.player.energy;
    });
  }

  private analyzeCard(
    cardId: string,
    card: CardData,
    state: GameState
  ): { score: number; confidence: number; reasoning: string; alternatives: string[] } {
    let score = 50;  // 기본 점수
    const reasons: string[] = [];
    const alternatives: string[] = [];

    const playerHpRatio = state.player.hp / state.player.maxHp;
    const enemyHpRatio = state.enemy.hp / state.enemy.maxHp;

    // === 공격 카드 분석 ===
    if (card.attack) {
      const damage = card.attack + (state.player.strength || 0);
      const effectiveDamage = state.enemy.tokens['vulnerable']
        ? Math.floor(damage * 1.5)
        : damage;

      // 막타 가능
      if (effectiveDamage >= state.enemy.hp) {
        score = 100;
        reasons.push('🎯 막타 가능!');
      }
      // 효율적인 피해
      else if (effectiveDamage / card.cost >= 4) {
        score += 20;
        reasons.push('효율적인 피해량');
      }
      // 취약 상태 활용
      if (state.enemy.tokens['vulnerable']) {
        score += 10;
        reasons.push('취약 보너스 활용');
      }
    }

    // === 방어 카드 분석 ===
    if (card.defense) {
      // 체력 위험 시 방어 중요
      if (playerHpRatio < 0.3) {
        score += 25;
        reasons.push('체력 낮음 - 방어 권장');
      }
      // 적 공격 예정 시
      const incomingDamage = this.estimateIncomingDamage(state);
      if (incomingDamage > 0) {
        const blockEfficiency = Math.min(card.defense, incomingDamage) / card.cost;
        if (blockEfficiency >= 3) {
          score += 15;
          reasons.push(`${incomingDamage} 피해 예상 - 방어 효율적`);
        }
      }
    }

    // === 상태이상 카드 분석 ===
    // 취약 부여가 가능한 경우
    if (this.cardAppliesDebuff(card, 'vulnerable') && !state.enemy.tokens['vulnerable']) {
      if (enemyHpRatio > 0.5) {
        score += 15;
        reasons.push('취약 부여로 후속 피해 증가');
      }
    }

    // === 에너지 효율 ===
    const energyAfter = state.player.energy - card.cost;
    if (energyAfter === 0 && reasons.length === 0) {
      reasons.push('에너지 완전 소진');
    }

    // === 핸드 관리 ===
    const handSize = state.player.hand.length;
    if (handSize >= 7) {
      score += 5;
      reasons.push('핸드 정리 필요');
    }

    // 이유가 없으면 기본 이유 추가
    if (reasons.length === 0) {
      reasons.push('기본 선택');
    }

    // 대안 추천
    const otherCards = state.player.hand.filter(c => c !== cardId);
    if (otherCards.length > 0) {
      alternatives.push(...otherCards.slice(0, 2));
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      confidence: Math.min(0.9, 0.5 + reasons.length * 0.1),
      reasoning: reasons.join(', '),
      alternatives,
    };
  }

  private cardAppliesDebuff(card: CardData, debuff: string): boolean {
    // 카드 효과에서 디버프 부여 여부 확인 (실제 구현에서는 카드 데이터 확인)
    return card.name?.toLowerCase().includes(debuff) || false;
  }

  private estimateIncomingDamage(state: GameState): number {
    // 타임라인에서 적 카드 확인
    let totalDamage = 0;
    for (const card of state.timeline) {
      if (card.owner === 'enemy') {
        const cardData = this.cards[card.cardId];
        if (cardData?.attack) {
          let damage = cardData.attack + (state.enemy.strength || 0);
          if (state.player.tokens['vulnerable']) {
            damage = Math.floor(damage * 1.5);
          }
          totalDamage += damage;
        }
      }
    }
    return totalDamage;
  }

  /**
   * 전략 분석
   */
  private analyzeStrategy(state: GameState): StrategicAdvice {
    const playerHpRatio = state.player.hp / state.player.maxHp;
    const enemyHpRatio = state.enemy.hp / state.enemy.maxHp;

    // 위기 상황
    if (playerHpRatio < 0.2) {
      return {
        type: 'critical',
        message: '⚠️ 위기 상황! 생존 우선',
        urgency: 'immediate',
        details: [
          '방어 카드 우선 사용',
          '체력 회복 수단 확인',
          '최소 피해로 버티기',
        ],
      };
    }

    // 유리한 상황
    if (playerHpRatio > 0.7 && enemyHpRatio < 0.3) {
      return {
        type: 'offensive',
        message: '🔥 유리! 공격적으로 마무리',
        urgency: 'soon',
        details: [
          '강력한 공격 카드로 막타',
          '방어는 최소한으로',
          '콤보가 있다면 지금 사용',
        ],
      };
    }

    // 불리한 상황
    if (playerHpRatio < 0.4 && enemyHpRatio > 0.6) {
      return {
        type: 'defensive',
        message: '🛡️ 불리! 방어하며 기회 엿보기',
        urgency: 'immediate',
        details: [
          '과도한 공격 자제',
          '방어와 회복 우선',
          '디버프로 적 약화',
        ],
      };
    }

    // 균형 상황
    return {
      type: 'neutral',
      message: '⚖️ 균형 잡힌 플레이 권장',
      urgency: 'when_possible',
      details: [
        '효율적인 거래 추구',
        '리소스 관리 중요',
        '상황에 따라 유연하게',
      ],
    };
  }

  /**
   * 위험 감지
   */
  private checkDangers(state: GameState): DangerWarning[] {
    const warnings: DangerWarning[] = [];
    const playerHp = state.player.hp;
    const incomingDamage = this.estimateIncomingDamage(state);
    const currentBlock = state.player.block || 0;

    // 치명적 피해 경고
    const actualDamage = Math.max(0, incomingDamage - currentBlock);
    if (actualDamage >= playerHp) {
      warnings.push({
        level: 'critical',
        message: `💀 치명적 피해 예상! (${actualDamage} 피해)`,
        suggestedAction: '방어 카드 사용 필수',
        turnsUntilThreat: 0,
      });
    } else if (actualDamage >= playerHp * 0.5) {
      warnings.push({
        level: 'danger',
        message: `⚠️ 큰 피해 예상 (${actualDamage} 피해)`,
        suggestedAction: '가능하면 방어',
        turnsUntilThreat: 0,
      });
    }

    // 에너지 부족 경고
    if (state.player.energy === 0) {
      warnings.push({
        level: 'info',
        message: '💡 에너지 소진',
        suggestedAction: '턴을 종료하세요',
      });
    }

    // 덱 소진 경고
    if (state.player.deck.length === 0 && state.player.discard.length > 0) {
      warnings.push({
        level: 'warning',
        message: '🔄 덱 셔플 예정',
        suggestedAction: '핵심 카드 드로우 계획',
      });
    }

    // 상태이상 경고
    if (state.player.tokens['vulnerable']) {
      warnings.push({
        level: 'warning',
        message: '😰 취약 상태! 받는 피해 50% 증가',
        suggestedAction: '방어를 더 챙기세요',
      });
    }

    if (state.player.tokens['weak']) {
      warnings.push({
        level: 'info',
        message: '😞 약화 상태 - 공격력 감소',
        suggestedAction: '방어 위주 플레이 권장',
      });
    }

    return warnings;
  }

  /**
   * 상황 요약
   */
  private summarizeSituation(state: GameState): string {
    const playerHpRatio = state.player.hp / state.player.maxHp;
    const enemyHpRatio = state.enemy.hp / state.enemy.maxHp;

    let summary = `턴 ${state.turn} | `;
    summary += `HP: ${state.player.hp}/${state.player.maxHp} `;
    summary += `(${(playerHpRatio * 100).toFixed(0)}%) | `;
    summary += `적 HP: ${state.enemy.hp}/${state.enemy.maxHp} `;
    summary += `(${(enemyHpRatio * 100).toFixed(0)}%) | `;
    summary += `에너지: ${state.player.energy} | `;
    summary += `핸드: ${state.player.hand.length}장`;

    return summary;
  }
}

// ==================== 덱 빌딩 어드바이저 ====================

export class DeckBuildAdvisor {
  private cards: Record<string, CardData>;
  private idealCurve = [2, 3, 4, 4, 3, 2, 1, 1];  // 0-7+ 코스트 이상적 분포

  constructor() {
    this.cards = loadCards();
  }

  /**
   * 현재 덱에 대한 조언
   */
  getAdvice(deckCards: string[]): DeckBuildAdvice {
    const suggestions = this.generateSuggestions(deckCards);
    const { strengths, weaknesses } = this.analyzeStrengthsWeaknesses(deckCards);
    const overallRating = this.calculateRating(deckCards);
    const synergyGroups = this.findSynergyGroups(deckCards);

    return {
      suggestions,
      deckStrengths: strengths,
      deckWeaknesses: weaknesses,
      overallRating,
      synergyGroups,
    };
  }

  private generateSuggestions(deckCards: string[]): DeckSuggestion[] {
    const suggestions: DeckSuggestion[] = [];
    const deckSet = new Set(deckCards);

    // 마나 곡선 분석
    const curve = this.analyzeCurve(deckCards);
    const curveIssues = this.findCurveIssues(curve);

    for (const issue of curveIssues) {
      suggestions.push(issue);
    }

    // 카드 타입 균형
    const typeBalance = this.analyzeTypeBalance(deckCards);
    if (typeBalance.attackRatio < 0.3) {
      // 공격 카드 부족
      const attackCard = this.findBestAddition(deckCards, 'attack');
      if (attackCard) {
        suggestions.push({
          action: 'add',
          cardId: attackCard.id,
          cardName: attackCard.name,
          reason: '공격 카드 부족 - 딜링 강화 필요',
          impact: { winRateDelta: 0.03, synergyDelta: 0, curveDelta: 0 },
        });
      }
    }

    if (typeBalance.defenseRatio < 0.25) {
      // 방어 카드 부족
      const defenseCard = this.findBestAddition(deckCards, 'defense');
      if (defenseCard) {
        suggestions.push({
          action: 'add',
          cardId: defenseCard.id,
          cardName: defenseCard.name,
          reason: '방어 카드 부족 - 생존력 강화 필요',
          impact: { winRateDelta: 0.02, synergyDelta: 0, curveDelta: 0 },
        });
      }
    }

    // 약한 카드 제거 추천
    const weakCards = this.findWeakCards(deckCards);
    for (const weak of weakCards.slice(0, 2)) {
      suggestions.push({
        action: 'remove',
        cardId: weak.id,
        cardName: weak.name,
        reason: weak.reason,
        impact: { winRateDelta: 0.02, synergyDelta: 0.01, curveDelta: 0 },
      });
    }

    // 시너지 개선 추천
    const synergyUpgrades = this.findSynergyImprovements(deckCards);
    suggestions.push(...synergyUpgrades);

    return suggestions.slice(0, 5);  // 상위 5개만
  }

  private analyzeCurve(deckCards: string[]): number[] {
    const curve = new Array(8).fill(0);
    for (const cardId of deckCards) {
      const card = this.cards[cardId];
      if (card) {
        const costIndex = Math.min(7, card.cost);
        curve[costIndex]++;
      }
    }
    return curve;
  }

  private findCurveIssues(curve: number[]): DeckSuggestion[] {
    const issues: DeckSuggestion[] = [];
    const total = curve.reduce((a, b) => a + b, 0);

    // 저코스트 부족
    const lowCost = curve[0] + curve[1] + curve[2];
    if (lowCost / total < 0.3) {
      const lowCard = this.findCardByCostRange(0, 2);
      if (lowCard) {
        issues.push({
          action: 'add',
          cardId: lowCard.id,
          cardName: lowCard.name,
          reason: '저코스트 카드 부족 - 초반 템포 약함',
          impact: { winRateDelta: 0.02, synergyDelta: 0, curveDelta: 0.05 },
        });
      }
    }

    // 고코스트 과다
    const highCost = curve[5] + curve[6] + curve[7];
    if (highCost / total > 0.3) {
      issues.push({
        action: 'remove',
        cardId: 'high_cost_card',
        cardName: '고코스트 카드',
        reason: '고코스트 과다 - 핸드 막힘 위험',
        impact: { winRateDelta: 0.01, synergyDelta: 0, curveDelta: 0.05 },
      });
    }

    return issues;
  }

  private findCardByCostRange(minCost: number, maxCost: number): CardData | null {
    for (const card of Object.values(this.cards)) {
      if (card.cost >= minCost && card.cost <= maxCost) {
        return card;
      }
    }
    return null;
  }

  private analyzeTypeBalance(deckCards: string[]): {
    attackRatio: number;
    defenseRatio: number;
    utilityRatio: number;
  } {
    let attack = 0, defense = 0, utility = 0;

    for (const cardId of deckCards) {
      const card = this.cards[cardId];
      if (!card) continue;

      if (card.attack && card.attack > 0) attack++;
      if (card.defense && card.defense > 0) defense++;
      if (!card.attack && !card.defense) utility++;
    }

    const total = deckCards.length || 1;
    return {
      attackRatio: attack / total,
      defenseRatio: defense / total,
      utilityRatio: utility / total,
    };
  }

  private findBestAddition(deckCards: string[], type: 'attack' | 'defense'): CardData | null {
    const deckSet = new Set(deckCards);

    for (const card of Object.values(this.cards)) {
      if (deckSet.has(card.id)) continue;

      if (type === 'attack' && card.attack && card.attack > 0) {
        return card;
      }
      if (type === 'defense' && card.defense && card.defense > 0) {
        return card;
      }
    }

    return null;
  }

  private findWeakCards(deckCards: string[]): Array<{ id: string; name: string; reason: string }> {
    const weak: Array<{ id: string; name: string; reason: string; score: number }> = [];

    for (const cardId of deckCards) {
      const card = this.cards[cardId];
      if (!card) continue;

      // 효율 점수 계산
      let efficiency = 0;
      if (card.attack) efficiency += card.attack / (card.cost || 1);
      if (card.defense) efficiency += card.defense / (card.cost || 1);

      if (efficiency < 2) {
        weak.push({
          id: cardId,
          name: card.name,
          reason: `낮은 효율 (${efficiency.toFixed(1)})`,
          score: efficiency,
        });
      }
    }

    return weak.sort((a, b) => a.score - b.score);
  }

  private findSynergyImprovements(deckCards: string[]): DeckSuggestion[] {
    const suggestions: DeckSuggestion[] = [];
    const deckSet = new Set(deckCards);

    // 시너지 쌍 정의
    const synergyPairs: Array<[string, string, string]> = [
      ['bash', 'combo', '콤보 연계'],
      ['defend', 'shieldBash', '방어 연계'],
      ['quickStrike', 'preparation', '템포 연계'],
    ];

    for (const [card1, card2, synergy] of synergyPairs) {
      if (deckSet.has(card1) && !deckSet.has(card2)) {
        const cardData = this.cards[card2];
        if (cardData) {
          suggestions.push({
            action: 'add',
            cardId: card2,
            cardName: cardData.name,
            reason: `${synergy} 시너지 완성`,
            impact: { winRateDelta: 0.03, synergyDelta: 0.1, curveDelta: 0 },
          });
        }
      }
    }

    return suggestions;
  }

  private analyzeStrengthsWeaknesses(deckCards: string[]): {
    strengths: string[];
    weaknesses: string[];
  } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    const typeBalance = this.analyzeTypeBalance(deckCards);
    const curve = this.analyzeCurve(deckCards);
    const total = deckCards.length;

    // 강점 분석
    if (typeBalance.attackRatio >= 0.4) {
      strengths.push('🔥 높은 딜링 잠재력');
    }
    if (typeBalance.defenseRatio >= 0.35) {
      strengths.push('🛡️ 탄탄한 방어력');
    }
    if ((curve[1] + curve[2]) / total >= 0.4) {
      strengths.push('⚡ 좋은 초반 템포');
    }

    // 약점 분석
    if (typeBalance.attackRatio < 0.25) {
      weaknesses.push('⚠️ 딜링 부족');
    }
    if (typeBalance.defenseRatio < 0.2) {
      weaknesses.push('⚠️ 방어력 취약');
    }
    if (curve[0] + curve[1] < 3) {
      weaknesses.push('⚠️ 1-2코스트 카드 부족');
    }
    if (total < 12) {
      weaknesses.push('⚠️ 덱 크기 너무 작음');
    }
    if (total > 25) {
      weaknesses.push('⚠️ 덱 크기 너무 큼 - 일관성 저하');
    }

    return { strengths, weaknesses };
  }

  private calculateRating(deckCards: string[]): number {
    let score = 50;  // 기본 점수

    const typeBalance = this.analyzeTypeBalance(deckCards);
    const curve = this.analyzeCurve(deckCards);
    const total = deckCards.length;

    // 타입 균형 점수
    if (typeBalance.attackRatio >= 0.3 && typeBalance.attackRatio <= 0.5) score += 10;
    if (typeBalance.defenseRatio >= 0.25 && typeBalance.defenseRatio <= 0.4) score += 10;

    // 마나 곡선 점수
    const lowCost = (curve[1] + curve[2]) / total;
    if (lowCost >= 0.3 && lowCost <= 0.5) score += 10;

    // 덱 크기 점수
    if (total >= 15 && total <= 20) score += 10;

    // 시너지 점수
    const synergies = this.findSynergyGroups(deckCards);
    score += Math.min(20, synergies.length * 5);

    return Math.min(100, Math.max(0, score));
  }

  private findSynergyGroups(deckCards: string[]): Array<{
    cards: string[];
    synergy: string;
    strength: number;
  }> {
    const groups: Array<{ cards: string[]; synergy: string; strength: number }> = [];
    const deckSet = new Set(deckCards);

    // 정의된 시너지 그룹
    const synergyDefinitions: Array<{ cards: string[]; name: string; strength: number }> = [
      { cards: ['slash', 'combo', 'quickStrike'], name: '연속 공격', strength: 0.8 },
      { cards: ['defend', 'shieldBash', 'ironWall'], name: '철벽 방어', strength: 0.7 },
      { cards: ['bash', 'heavyBlow'], name: '강타 연계', strength: 0.6 },
    ];

    for (const def of synergyDefinitions) {
      const matchingCards = def.cards.filter(c => deckSet.has(c));
      if (matchingCards.length >= 2) {
        groups.push({
          cards: matchingCards,
          synergy: def.name,
          strength: (matchingCards.length / def.cards.length) * def.strength,
        });
      }
    }

    return groups.sort((a, b) => b.strength - a.strength);
  }
}

// ==================== 팩토리 함수 ====================

export function createBattleAdvisor(options?: { useMCTS?: boolean }): BattleAdvisor {
  return new BattleAdvisor(options);
}

export function createDeckBuildAdvisor(): DeckBuildAdvisor {
  return new DeckBuildAdvisor();
}
