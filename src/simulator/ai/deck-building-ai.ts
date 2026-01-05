/**
 * @file deck-building-ai.ts
 * @description 덱 빌딩 AI - 카드 획득/제거/강화 결정
 */

import type { Card } from '../../types';

// ==================== 타입 정의 ====================

export interface DeckAnalysis {
  /** 공격 카드 비율 */
  attackRatio: number;
  /** 방어 카드 비율 */
  defenseRatio: number;
  /** 평균 스피드 코스트 */
  avgSpeedCost: number;
  /** 연계 시너지 점수 */
  chainSynergyScore: number;
  /** 약한 카드 목록 (제거 추천) */
  weakCards: string[];
  /** 핵심 카드 목록 */
  coreCards: string[];
  /** 덱 효율 점수 (0-100) */
  efficiencyScore: number;
}

export interface CardEvaluation {
  cardId: string;
  baseValue: number;
  synergyBonus: number;
  deckFitBonus: number;
  totalValue: number;
  reason: string;
}

export type DeckStrategy = 'aggressive' | 'defensive' | 'balanced' | 'speedrun' | 'combo';

// ==================== 상수 ====================

/** 기본 카드 (제거 우선 대상) */
const BASIC_CARDS = ['strike', 'shoot', 'deflect'];

/** 핵심 카드 (제거 금지) */
const CORE_CARDS_BY_STRATEGY: Record<DeckStrategy, string[]> = {
  aggressive: ['lunge', 'fleche', 'thrust', 'fan_the_hammer', 'aimed_shot'],
  defensive: ['quarte', 'octave', 'defensive_stance', 'binding'],
  balanced: ['marche', 'lunge', 'quarte', 'reload'],
  speedrun: ['quick_shot', 'shoot', 'strike', 'feint'],
  combo: ['redoublement', 'fleche', 'beat', 'feint'],
};

/** 연계 카드 조합 */
const CHAIN_COMBOS: { cards: string[]; bonus: number }[] = [
  { cards: ['beat', 'lunge'], bonus: 20 },
  { cards: ['feint', 'fleche'], bonus: 25 },
  { cards: ['marche', 'thrust'], bonus: 15 },
  { cards: ['reload', 'aimed_shot'], bonus: 20 },
  { cards: ['defensive_stance', 'binding'], bonus: 15 },
];

// ==================== 덱 빌딩 AI ====================

export class DeckBuildingAI {
  private cardLibrary: Record<string, Card>;
  private strategy: DeckStrategy;

  constructor(cardLibrary: Record<string, Card>, strategy: DeckStrategy = 'balanced') {
    this.cardLibrary = cardLibrary;
    this.strategy = strategy;
  }

  /**
   * 전략 변경
   */
  setStrategy(strategy: DeckStrategy): void {
    this.strategy = strategy;
  }

  /**
   * 덱 분석
   */
  analyzeDeck(deck: string[]): DeckAnalysis {
    let attackCount = 0;
    let defenseCount = 0;
    let totalSpeedCost = 0;
    let validCards = 0;

    for (const cardId of deck) {
      const card = this.cardLibrary[cardId];
      if (!card) continue;

      validCards++;
      if (card.type === 'attack') attackCount++;
      else if (card.type === 'defense' || card.type === 'reaction') defenseCount++;

      totalSpeedCost += card.speedCost || 3;
    }

    const attackRatio = validCards > 0 ? attackCount / validCards : 0;
    const defenseRatio = validCards > 0 ? defenseCount / validCards : 0;
    const avgSpeedCost = validCards > 0 ? totalSpeedCost / validCards : 3;

    // 연계 시너지 계산
    const chainSynergyScore = this.calculateChainSynergy(deck);

    // 약한 카드 식별
    const weakCards = this.identifyWeakCards(deck);

    // 핵심 카드 식별
    const coreCards = this.identifyCoreCards(deck);

    // 효율 점수 계산
    const efficiencyScore = this.calculateEfficiency(deck, attackRatio, defenseRatio, avgSpeedCost);

    return {
      attackRatio,
      defenseRatio,
      avgSpeedCost,
      chainSynergyScore,
      weakCards,
      coreCards,
      efficiencyScore,
    };
  }

  /**
   * 연계 시너지 계산
   */
  private calculateChainSynergy(deck: string[]): number {
    let score = 0;

    for (const combo of CHAIN_COMBOS) {
      const hasAll = combo.cards.every(cardId => deck.includes(cardId));
      if (hasAll) {
        score += combo.bonus;
      }
    }

    // 연계 특성 카드 수
    let chainCards = 0;
    let followupCards = 0;
    let finisherCards = 0;

    for (const cardId of deck) {
      const card = this.cardLibrary[cardId];
      if (!card?.traits) continue;

      if (card.traits.includes('chain')) chainCards++;
      if (card.traits.includes('followup')) followupCards++;
      if (card.traits.includes('finisher')) finisherCards++;
    }

    // 연계 → 후속 → 마무리 조합 보너스
    const chainComboScore = Math.min(chainCards, followupCards, finisherCards) * 15;
    score += chainComboScore;

    return score;
  }

  /**
   * 약한 카드 식별 (제거 우선순위)
   */
  private identifyWeakCards(deck: string[]): string[] {
    const weakCards: { cardId: string; weakness: number }[] = [];

    for (const cardId of deck) {
      const card = this.cardLibrary[cardId];
      if (!card) continue;

      let weakness = 0;

      // 기본 카드는 약함
      if (BASIC_CARDS.includes(cardId)) {
        weakness += 30;
      }

      // 저데미지 공격 카드
      if (card.type === 'attack' && card.damage && card.damage < 5) {
        weakness += 20;
      }

      // 저방어 방어 카드
      if ((card.type === 'defense' || card.type === 'reaction') && card.block && card.block < 4) {
        weakness += 20;
      }

      // 높은 스피드 코스트
      if (card.speedCost && card.speedCost > 6) {
        weakness += 15;
      }

      // 특성 없음
      if (!card.traits || card.traits.length === 0) {
        weakness += 10;
      }

      // 전략에 맞지 않는 카드
      weakness += this.calculateStrategyMismatch(card);

      if (weakness > 0) {
        weakCards.push({ cardId, weakness });
      }
    }

    return weakCards
      .sort((a, b) => b.weakness - a.weakness)
      .map(w => w.cardId);
  }

  /**
   * 전략 불일치 점수
   */
  private calculateStrategyMismatch(card: Card): number {
    switch (this.strategy) {
      case 'aggressive':
        if (card.type === 'defense' || card.type === 'reaction') return 15;
        break;
      case 'defensive':
        if (card.type === 'attack' && (!card.block || card.block === 0)) return 10;
        break;
      case 'speedrun':
        if (card.speedCost && card.speedCost > 4) return 20;
        break;
      case 'combo':
        if (!card.traits || card.traits.length === 0) return 15;
        break;
    }
    return 0;
  }

  /**
   * 핵심 카드 식별
   */
  private identifyCoreCards(deck: string[]): string[] {
    const coreSet = new Set(CORE_CARDS_BY_STRATEGY[this.strategy] || []);
    return deck.filter(cardId => coreSet.has(cardId));
  }

  /**
   * 덱 효율 점수 계산
   */
  private calculateEfficiency(
    deck: string[],
    attackRatio: number,
    defenseRatio: number,
    avgSpeedCost: number
  ): number {
    let score = 50; // 기본 점수

    // 덱 크기 (10-15장이 이상적)
    if (deck.length >= 10 && deck.length <= 15) {
      score += 15;
    } else if (deck.length > 20) {
      score -= (deck.length - 20) * 3;
    }

    // 전략별 비율 평가
    switch (this.strategy) {
      case 'aggressive':
        if (attackRatio >= 0.5 && attackRatio <= 0.7) score += 15;
        break;
      case 'defensive':
        if (defenseRatio >= 0.4 && defenseRatio <= 0.6) score += 15;
        break;
      case 'balanced':
        if (attackRatio >= 0.35 && attackRatio <= 0.55 &&
            defenseRatio >= 0.25 && defenseRatio <= 0.45) score += 15;
        break;
      case 'speedrun':
        if (avgSpeedCost <= 3.5) score += 20;
        break;
    }

    // 평균 스피드 보너스
    if (avgSpeedCost >= 2.5 && avgSpeedCost <= 4) {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * 카드 획득 여부 결정
   */
  shouldTakeCard(cardId: string, currentDeck: string[]): { take: boolean; reason: string } {
    const card = this.cardLibrary[cardId];
    if (!card) {
      return { take: false, reason: '카드 정보 없음' };
    }

    // 덱이 너무 크면 스킵
    if (currentDeck.length >= 18) {
      return { take: false, reason: '덱 크기 초과 (18장)' };
    }

    // 같은 카드가 2장 이상이면 스킵
    const cardCount = currentDeck.filter(c => c === cardId).length;
    if (cardCount >= 2) {
      return { take: false, reason: '중복 카드 제한 (2장)' };
    }

    // 카드 평가
    const evaluation = this.evaluateCard(cardId, currentDeck);

    // 임계값 기반 결정
    if (evaluation.totalValue >= 60) {
      return { take: true, reason: evaluation.reason };
    } else if (evaluation.totalValue >= 40 && currentDeck.length < 12) {
      return { take: true, reason: `덱 확장 필요: ${evaluation.reason}` };
    }

    return { take: false, reason: `낮은 가치 (${evaluation.totalValue.toFixed(0)})` };
  }

  /**
   * 카드 평가
   */
  evaluateCard(cardId: string, currentDeck: string[]): CardEvaluation {
    const card = this.cardLibrary[cardId];
    if (!card) {
      return {
        cardId,
        baseValue: 0,
        synergyBonus: 0,
        deckFitBonus: 0,
        totalValue: 0,
        reason: '카드 정보 없음',
      };
    }

    // 기본 가치
    let baseValue = 30;
    const reasons: string[] = [];

    // 데미지/방어력 기반
    if (card.damage && card.damage >= 8) {
      baseValue += 15;
      reasons.push('고데미지');
    }
    if (card.block && card.block >= 6) {
      baseValue += 12;
      reasons.push('고방어');
    }

    // 특성 보너스
    if (card.traits) {
      if (card.traits.includes('finisher')) {
        baseValue += 20;
        reasons.push('마무리');
      }
      if (card.traits.includes('chain')) {
        baseValue += 10;
        reasons.push('연계');
      }
      if (card.traits.includes('followup')) {
        baseValue += 12;
        reasons.push('후속');
      }
    }

    // 시너지 보너스
    let synergyBonus = 0;
    for (const combo of CHAIN_COMBOS) {
      if (combo.cards.includes(cardId)) {
        const otherCards = combo.cards.filter(c => c !== cardId);
        const hasPartner = otherCards.some(c => currentDeck.includes(c));
        if (hasPartner) {
          synergyBonus += combo.bonus;
          reasons.push('콤보 시너지');
        }
      }
    }

    // 덱 적합도 보너스
    let deckFitBonus = 0;
    const analysis = this.analyzeDeck(currentDeck);

    // 전략에 맞는 카드 타입
    switch (this.strategy) {
      case 'aggressive':
        if (card.type === 'attack') deckFitBonus += 15;
        break;
      case 'defensive':
        if (card.type === 'defense' || card.type === 'reaction') deckFitBonus += 15;
        break;
      case 'balanced':
        // 부족한 타입 보충
        if (analysis.attackRatio < 0.4 && card.type === 'attack') deckFitBonus += 15;
        if (analysis.defenseRatio < 0.3 && (card.type === 'defense' || card.type === 'reaction')) deckFitBonus += 15;
        break;
      case 'speedrun':
        if (card.speedCost && card.speedCost <= 3) deckFitBonus += 20;
        break;
      case 'combo':
        if (card.traits && card.traits.length > 0) deckFitBonus += 15;
        break;
    }

    if (deckFitBonus > 0) {
      reasons.push('전략 적합');
    }

    const totalValue = baseValue + synergyBonus + deckFitBonus;

    return {
      cardId,
      baseValue,
      synergyBonus,
      deckFitBonus,
      totalValue,
      reason: reasons.join(', ') || '기본',
    };
  }

  /**
   * 카드 제거 우선순위 (높을수록 제거 추천)
   */
  getRemovalPriority(deck: string[]): Array<{ cardId: string; priority: number; reason: string }> {
    const analysis = this.analyzeDeck(deck);
    const priorities: Array<{ cardId: string; priority: number; reason: string }> = [];

    for (const cardId of deck) {
      const card = this.cardLibrary[cardId];
      let priority = 0;
      const reasons: string[] = [];

      // 핵심 카드는 제거 금지
      if (analysis.coreCards.includes(cardId)) {
        continue;
      }

      // 기본 카드 우선 제거
      if (BASIC_CARDS.includes(cardId)) {
        priority += 50;
        reasons.push('기본 카드');
      }

      // 약한 카드
      if (analysis.weakCards.includes(cardId)) {
        priority += 30;
        reasons.push('약한 카드');
      }

      // 중복 카드 (2장째)
      const count = deck.filter(c => c === cardId).length;
      if (count >= 2) {
        priority += 20;
        reasons.push('중복');
      }

      // 전략 불일치
      if (card) {
        const mismatch = this.calculateStrategyMismatch(card);
        if (mismatch > 0) {
          priority += mismatch;
          reasons.push('전략 불일치');
        }
      }

      if (priority > 0) {
        priorities.push({
          cardId,
          priority,
          reason: reasons.join(', '),
        });
      }
    }

    return priorities.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 강화 우선순위 (높을수록 강화 추천)
   */
  getUpgradePriority(deck: string[], upgradedCards: string[]): Array<{ cardId: string; priority: number; reason: string }> {
    const priorities: Array<{ cardId: string; priority: number; reason: string }> = [];

    for (const cardId of deck) {
      // 이미 강화된 카드 스킵
      if (upgradedCards.includes(cardId)) continue;

      const card = this.cardLibrary[cardId];
      if (!card) continue;

      let priority = 0;
      const reasons: string[] = [];

      // 핵심 카드 우선 강화
      const coreCards = CORE_CARDS_BY_STRATEGY[this.strategy] || [];
      if (coreCards.includes(cardId)) {
        priority += 40;
        reasons.push('핵심 카드');
      }

      // 공격 카드 (데미지 증가 효과 높음)
      if (card.type === 'attack' && card.damage && card.damage >= 6) {
        priority += 25;
        reasons.push('고데미지 공격');
      }

      // 특성 카드 (강화 시 효과 향상)
      if (card.traits && card.traits.length > 0) {
        priority += 15;
        reasons.push('특성 보유');
      }

      // 자주 사용되는 카드 (덱에 1장만 있어야 강화 가치 높음)
      const count = deck.filter(c => c === cardId).length;
      if (count === 1) {
        priority += 10;
        reasons.push('유일 카드');
      }

      if (priority > 0) {
        priorities.push({
          cardId,
          priority,
          reason: reasons.join(', '),
        });
      }
    }

    return priorities.sort((a, b) => b.priority - a.priority);
  }
}

/**
 * 전략 매핑 (RunStrategy → DeckStrategy)
 */
export function mapRunStrategyToDeckStrategy(strategy: string): DeckStrategy {
  switch (strategy) {
    case 'aggressive':
      return 'aggressive';
    case 'defensive':
      return 'defensive';
    case 'speedrun':
      return 'speedrun';
    case 'treasure_hunter':
      return 'balanced';
    case 'balanced':
    default:
      return 'balanced';
  }
}
