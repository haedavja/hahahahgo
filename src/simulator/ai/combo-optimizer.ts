/**
 * @file combo-optimizer.ts
 * @description 포커 콤보 최적화 AI - 능동적으로 조합을 구성하는 시스템
 *
 * ## 기능
 * - 손패에서 최적의 포커 조합을 찾아 카드 선택
 * - 조합 완성을 위한 카드 평가
 * - 에테르 획득 최대화 전략
 * - 전투력과 조합 가치의 균형
 */

import type { GameCard } from '../core/game-types';
import {
  detectPokerCombo,
  calculateTotalEther,
  COMBO_MULTIPLIERS,
  type ComboCard,
  type ComboResult,
} from '../core/combo-ether-system';

// ==================== 타입 정의 ====================

export interface ComboAnalysis {
  /** 현재 손패의 조합 */
  currentCombo: ComboResult;
  /** 가능한 최고 조합 */
  bestPossibleCombo: ComboResult;
  /** 최고 조합을 위한 카드 선택 */
  bestComboCards: string[];
  /** 예상 에테르 획득량 */
  expectedEther: number;
  /** 조합 점수 (0-100) */
  comboScore: number;
  /** 분석 설명 */
  analysis: string[];
}

export interface CardComboPotential {
  cardId: string;
  card: GameCard;
  /** 조합 기여도 (0-100) */
  comboContribution: number;
  /** 이 카드를 포함한 최고 조합 */
  potentialCombo: string;
  /** 같은 actionCost를 가진 카드 수 */
  matchingCards: number;
  /** 전투력 점수 */
  combatScore: number;
  /** 종합 점수 */
  totalScore: number;
}

export interface ComboOptimizerConfig {
  /** 조합 가중치 (0-1) - 높을수록 조합 우선 */
  comboWeight: number;
  /** 전투력 가중치 (0-1) */
  combatWeight: number;
  /** 최소 조합 랭크 (이 이상만 추구) */
  minComboRank: number;
  /** 에테르 필요 여부 */
  needEther: boolean;
  /** 공격 우선 여부 */
  preferAttack: boolean;
}

// ==================== 기본 설정 ====================

const DEFAULT_CONFIG: ComboOptimizerConfig = {
  comboWeight: 0.55,  // 콤보(포커 조합)가 게임 핵심 메커니즘이므로 가중치 상향
  combatWeight: 0.45,
  minComboRank: 1, // 페어 이상
  needEther: true,
  preferAttack: true,
};

// ==================== 콤보 최적화 클래스 ====================

export class ComboOptimizer {
  private cards: Record<string, GameCard>;
  private config: ComboOptimizerConfig;

  constructor(
    cards: Record<string, GameCard>,
    config: Partial<ComboOptimizerConfig> = {}
  ) {
    this.cards = cards;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 설정 업데이트
   */
  updateConfig(config: Partial<ComboOptimizerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 손패 분석 - 최적화된 O(n) 알고리즘
   * 모든 조합을 탐색하지 않고 직접 최고 조합을 계산합니다.
   */
  analyzeHand(handCardIds: string[]): ComboAnalysis {
    const handCards = handCardIds
      .map(id => ({ id, card: this.cards[id] }))
      .filter(item => item.card) as Array<{ id: string; card: GameCard }>;

    const analysis: string[] = [];

    // 현재 전체 손패의 조합
    const allCards = handCards.map(h => h.card);
    const currentCombo = detectPokerCombo(allCards);
    analysis.push(`현재 손패 조합: ${currentCombo.name} (x${currentCombo.multiplier})`);

    // 최적 조합을 직접 계산 (O(n) 복잡도)
    const { bestCards, bestCombo } = this.findBestComboDirectly(handCards);

    if (bestCombo.rank > currentCombo.rank) {
      analysis.push(`최적 조합 발견: ${bestCombo.name} (${bestCards.length}장)`);
    }

    // 예상 에테르 계산
    const bestComboCards = bestCards.map(id => this.cards[id]).filter(Boolean) as GameCard[];
    const etherResult = calculateTotalEther(bestComboCards);

    // 조합 점수 계산
    const comboScore = this.calculateComboScore(bestCombo, bestCards.length, handCardIds.length);
    analysis.push(`조합 점수: ${comboScore}/100`);

    return {
      currentCombo,
      bestPossibleCombo: bestCombo,
      bestComboCards: bestCards,
      expectedEther: etherResult.finalGain,
      comboScore,
      analysis,
    };
  }

  /**
   * 최적 조합을 직접 찾기 (O(n) 복잡도)
   * 모든 조합을 탐색하지 않고 카드 그룹화를 통해 직접 계산
   */
  private findBestComboDirectly(
    handCards: Array<{ id: string; card: GameCard }>
  ): { bestCards: string[]; bestCombo: ComboResult } {
    // actionCost별 그룹화
    const costGroups = new Map<number, Array<{ id: string; card: GameCard }>>();
    for (const item of handCards) {
      const cost = item.card.actionCost || 1;
      if (!costGroups.has(cost)) {
        costGroups.set(cost, []);
      }
      costGroups.get(cost)!.push(item);
    }

    // 타입별 그룹화 (플러쉬용)
    const typeGroups = new Map<string, Array<{ id: string; card: GameCard }>>();
    for (const item of handCards) {
      const type = item.card.type || 'general';
      if (!typeGroups.has(type)) {
        typeGroups.set(type, []);
      }
      typeGroups.get(type)!.push(item);
    }

    // 카테고리별 그룹화 (플러쉬용)
    const categoryGroups = new Map<string, Array<{ id: string; card: GameCard }>>();
    for (const item of handCards) {
      const category = this.inferCategory(item.card);
      if (!categoryGroups.has(category)) {
        categoryGroups.set(category, []);
      }
      categoryGroups.get(category)!.push(item);
    }

    // 그룹 크기별 정렬 (높은 순)
    const sortedCostGroups = Array.from(costGroups.entries())
      .sort((a, b) => b[1].length - a[1].length);

    // 1. 파이브카드 체크 (rank 7)
    for (const [, group] of sortedCostGroups) {
      if (group.length >= 5) {
        const selected = group.slice(0, 5).map(c => c.id);
        return {
          bestCards: selected,
          bestCombo: detectPokerCombo(group.slice(0, 5).map(c => c.card)),
        };
      }
    }

    // 2. 포카드 체크 (rank 6)
    for (const [, group] of sortedCostGroups) {
      if (group.length >= 4) {
        const selected = group.slice(0, 4).map(c => c.id);
        return {
          bestCards: selected,
          bestCombo: detectPokerCombo(group.slice(0, 4).map(c => c.card)),
        };
      }
    }

    // 3. 풀하우스 체크 (rank 5) - 트리플 + 페어
    const tripleGroup = sortedCostGroups.find(([, g]) => g.length >= 3);
    if (tripleGroup) {
      const pairGroup = sortedCostGroups.find(([cost, g]) =>
        cost !== tripleGroup[0] && g.length >= 2
      );
      if (pairGroup) {
        const selected = [
          ...tripleGroup[1].slice(0, 3).map(c => c.id),
          ...pairGroup[1].slice(0, 2).map(c => c.id),
        ];
        const cards = [
          ...tripleGroup[1].slice(0, 3).map(c => c.card),
          ...pairGroup[1].slice(0, 2).map(c => c.card),
        ];
        return {
          bestCards: selected,
          bestCombo: detectPokerCombo(cards),
        };
      }
    }

    // 4. 플러쉬 체크 (rank 4) - 타입 또는 카테고리
    // 타입 기반 플러쉬
    for (const [, group] of typeGroups) {
      if (group.length >= 4) {
        const selected = group.slice(0, Math.min(5, group.length)).map(c => c.id);
        const cards = group.slice(0, Math.min(5, group.length)).map(c => c.card);
        return {
          bestCards: selected,
          bestCombo: detectPokerCombo(cards),
        };
      }
    }
    // 카테고리 기반 플러쉬
    for (const [, group] of categoryGroups) {
      if (group.length >= 4) {
        const selected = group.slice(0, Math.min(5, group.length)).map(c => c.id);
        const cards = group.slice(0, Math.min(5, group.length)).map(c => c.card);
        return {
          bestCards: selected,
          bestCombo: detectPokerCombo(cards),
        };
      }
    }

    // 5. 트리플 체크 (rank 3)
    if (tripleGroup) {
      const selected = tripleGroup[1].slice(0, 3).map(c => c.id);
      const cards = tripleGroup[1].slice(0, 3).map(c => c.card);
      return {
        bestCards: selected,
        bestCombo: detectPokerCombo(cards),
      };
    }

    // 6. 투페어 체크 (rank 2)
    const pairGroups = sortedCostGroups.filter(([, g]) => g.length >= 2);
    if (pairGroups.length >= 2) {
      const selected = [
        ...pairGroups[0][1].slice(0, 2).map(c => c.id),
        ...pairGroups[1][1].slice(0, 2).map(c => c.id),
      ];
      const cards = [
        ...pairGroups[0][1].slice(0, 2).map(c => c.card),
        ...pairGroups[1][1].slice(0, 2).map(c => c.card),
      ];
      return {
        bestCards: selected,
        bestCombo: detectPokerCombo(cards),
      };
    }

    // 7. 페어 체크 (rank 1)
    if (pairGroups.length >= 1) {
      const selected = pairGroups[0][1].slice(0, 2).map(c => c.id);
      const cards = pairGroups[0][1].slice(0, 2).map(c => c.card);
      return {
        bestCards: selected,
        bestCombo: detectPokerCombo(cards),
      };
    }

    // 8. 하이카드 - 가장 에테르 높은 카드들
    const sortedByEther = [...handCards].sort((a, b) => {
      const etherA = calculateTotalEther([a.card]).finalGain;
      const etherB = calculateTotalEther([b.card]).finalGain;
      return etherB - etherA;
    });
    const selected = sortedByEther.slice(0, Math.min(2, sortedByEther.length)).map(c => c.id);
    const cards = sortedByEther.slice(0, Math.min(2, sortedByEther.length)).map(c => c.card);
    return {
      bestCards: selected,
      bestCombo: detectPokerCombo(cards),
    };
  }

  /**
   * 카드 카테고리 추론
   */
  private inferCategory(card: GameCard): string {
    if ('cardCategory' in card && card.cardCategory) {
      return card.cardCategory as string;
    }
    if ('category' in card && card.category) {
      return card.category as string;
    }
    const id = (card.id ?? '').toLowerCase();
    if (id.includes('thrust') || id.includes('slash') || id.includes('parry') ||
        id.includes('riposte') || id.includes('fleche') || id.includes('lunge') ||
        id.includes('fencing') || id.includes('feint')) {
      return 'fencing';
    }
    if (id.includes('shoot') || id.includes('reload') || id.includes('bullet') ||
        id.includes('gun') || id.includes('revolver') || id.includes('roulette')) {
      return 'gun';
    }
    if (id.includes('special') || id.includes('hologram') || id.includes('ether')) {
      return 'special';
    }
    return 'general';
  }

  /**
   * 카드별 조합 기여도 평가
   */
  evaluateCardPotentials(handCardIds: string[]): CardComboPotential[] {
    const handCards = handCardIds
      .map(id => ({ id, card: this.cards[id] }))
      .filter(item => item.card) as Array<{ id: string; card: GameCard }>;

    // actionCost별 그룹화
    const costGroups = new Map<number, string[]>();
    for (const { id, card } of handCards) {
      const cost = card.actionCost || 1;
      if (!costGroups.has(cost)) {
        costGroups.set(cost, []);
      }
      costGroups.get(cost)!.push(id);
    }

    // 타입별 그룹화 (플러쉬용)
    const typeGroups = new Map<string, string[]>();
    for (const { id, card } of handCards) {
      const type = card.type || 'general';
      if (!typeGroups.has(type)) {
        typeGroups.set(type, []);
      }
      typeGroups.get(type)!.push(id);
    }

    const potentials: CardComboPotential[] = [];

    for (const { id, card } of handCards) {
      const cost = card.actionCost || 1;
      const matchingCards = costGroups.get(cost)?.length || 1;
      const typeMatching = typeGroups.get(card.type)?.length || 1;

      // 조합 기여도 계산
      let comboContribution = 0;
      let potentialCombo = '하이카드';

      // 같은 코스트 카드 수에 따른 기여도
      if (matchingCards >= 5) {
        comboContribution = 100;
        potentialCombo = '파이브카드';
      } else if (matchingCards >= 4) {
        comboContribution = 85;
        potentialCombo = '포카드';
      } else if (matchingCards >= 3) {
        comboContribution = 60;
        potentialCombo = '트리플';
      } else if (matchingCards >= 2) {
        comboContribution = 40;
        potentialCombo = '페어';
      }

      // 플러쉬 가능성 체크
      if (typeMatching >= 4 && comboContribution < 70) {
        comboContribution = Math.max(comboContribution, 70);
        potentialCombo = '플러쉬';
      }

      // 풀하우스 가능성 체크
      if (matchingCards >= 3) {
        // 다른 코스트에 페어가 있는지 확인
        for (const [otherCost, otherCards] of costGroups) {
          if (otherCost !== cost && otherCards.length >= 2) {
            comboContribution = Math.max(comboContribution, 75);
            potentialCombo = '풀하우스';
            break;
          }
        }
      }

      // 전투력 점수
      const combatScore = this.calculateCombatScore(card);

      // 종합 점수
      const totalScore =
        comboContribution * this.config.comboWeight +
        combatScore * this.config.combatWeight;

      potentials.push({
        cardId: id,
        card,
        comboContribution,
        potentialCombo,
        matchingCards,
        combatScore,
        totalScore,
      });
    }

    // 종합 점수로 정렬
    return potentials.sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * 최적의 카드 선택 (개수 지정)
   */
  selectOptimalCards(
    handCardIds: string[],
    cardsToSelect: number,
    context?: { hpRatio?: number; enemyThreat?: number }
  ): {
    selectedCards: string[];
    combo: ComboResult;
    reasoning: string[];
  } {
    const reasoning: string[] = [];

    // 컨텍스트에 따른 설정 조정
    if (context) {
      if (context.hpRatio && context.hpRatio < 0.3) {
        // HP 낮으면 전투력 우선
        this.config.combatWeight = 0.8;
        this.config.comboWeight = 0.2;
        reasoning.push('HP 위급: 전투력 우선');
      } else if (context.enemyThreat && context.enemyThreat > 20) {
        // 적 위협 높으면 방어 고려
        this.config.preferAttack = false;
        reasoning.push('높은 위협: 방어 고려');
      }
    }

    // 카드 기여도 평가
    const potentials = this.evaluateCardPotentials(handCardIds);

    // 선택 전략 1: 가장 높은 조합 먼저 시도
    const handAnalysis = this.analyzeHand(handCardIds);

    if (
      handAnalysis.bestPossibleCombo.rank >= this.config.minComboRank &&
      handAnalysis.bestComboCards.length <= cardsToSelect
    ) {
      // 최적 조합이 선택 가능하면 그것을 선택
      const selected = handAnalysis.bestComboCards.slice(0, cardsToSelect);

      // 남은 슬롯은 전투력 높은 카드로 채움
      if (selected.length < cardsToSelect) {
        const remaining = potentials
          .filter(p => !selected.includes(p.cardId))
          .sort((a, b) => b.combatScore - a.combatScore);

        for (const p of remaining) {
          if (selected.length >= cardsToSelect) break;
          selected.push(p.cardId);
        }
      }

      reasoning.push(`조합 선택: ${handAnalysis.bestPossibleCombo.name}`);

      return {
        selectedCards: selected,
        combo: handAnalysis.bestPossibleCombo,
        reasoning,
      };
    }

    // 선택 전략 2: 종합 점수 기반 선택
    const selected: string[] = [];
    const usedCosts = new Set<number>();

    for (const potential of potentials) {
      if (selected.length >= cardsToSelect) break;

      // 조합 구성 고려: 같은 코스트 카드 우선
      const card = potential.card;
      const cost = card.actionCost || 1;

      // 이미 선택된 카드와 조합 가능성 체크
      if (usedCosts.has(cost) || selected.length === 0) {
        selected.push(potential.cardId);
        usedCosts.add(cost);
      } else {
        // 다른 코스트지만 전투력이 높으면 선택
        if (potential.combatScore > 50) {
          selected.push(potential.cardId);
          usedCosts.add(cost);
        }
      }
    }

    // 부족하면 나머지 채움
    for (const potential of potentials) {
      if (selected.length >= cardsToSelect) break;
      if (!selected.includes(potential.cardId)) {
        selected.push(potential.cardId);
      }
    }

    // 최종 조합 확인
    const selectedCards = selected.map(id => this.cards[id]).filter(Boolean) as GameCard[];
    const finalCombo = detectPokerCombo(selectedCards);

    reasoning.push(`최종 조합: ${finalCombo.name}`);

    return {
      selectedCards: selected,
      combo: finalCombo,
      reasoning,
    };
  }

  /**
   * 조합 완성을 위한 필요 카드 추천
   */
  suggestComboCompletion(
    currentCards: string[],
    availableCards: string[]
  ): {
    suggestedCard: string | null;
    targetCombo: string;
    improvement: number;
    reason: string;
  } {
    const current = currentCards.map(id => this.cards[id]).filter(Boolean) as GameCard[];
    const currentCombo = detectPokerCombo(current);

    let bestSuggestion: string | null = null;
    let bestCombo = currentCombo;
    let bestImprovement = 0;

    for (const cardId of availableCards) {
      if (currentCards.includes(cardId)) continue;

      const card = this.cards[cardId];
      if (!card) continue;

      // 이 카드를 추가했을 때의 조합
      const newCards = [...current, card];
      const newCombo = detectPokerCombo(newCards);

      const improvement = newCombo.rank - currentCombo.rank;

      if (improvement > bestImprovement) {
        bestImprovement = improvement;
        bestCombo = newCombo;
        bestSuggestion = cardId;
      }
    }

    if (bestSuggestion) {
      return {
        suggestedCard: bestSuggestion,
        targetCombo: bestCombo.name,
        improvement: bestImprovement,
        reason: `${currentCombo.name} → ${bestCombo.name}`,
      };
    }

    return {
      suggestedCard: null,
      targetCombo: currentCombo.name,
      improvement: 0,
      reason: '개선 가능한 카드 없음',
    };
  }

  // ==================== 헬퍼 메서드 ====================

  /**
   * 조합 점수 계산 (0-100)
   */
  private calculateComboScore(
    combo: ComboResult,
    cardsUsed: number,
    totalCards: number
  ): number {
    // 기본 점수: 조합 랭크 * 12.5 (최대 100)
    let score = combo.rank * 12.5;

    // 효율성 보너스: 적은 카드로 조합 완성
    const efficiency = cardsUsed <= 3 ? 10 : cardsUsed <= 4 ? 5 : 0;
    score += efficiency;

    // 배율 반영
    score += (combo.multiplier - 1) * 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * 전투력 점수 계산 (0-100)
   */
  private calculateCombatScore(card: GameCard): number {
    let score = 0;

    // 공격력
    if (card.damage) {
      const hits = card.hits || 1;
      score += Math.min(40, card.damage * hits * 2);
    }

    // 방어력
    if (card.block) {
      score += Math.min(30, card.block * 2);
    }

    // 속도 (빠를수록 좋음)
    const speed = card.speedCost || 5;
    score += Math.max(0, (8 - speed) * 3);

    // 특수 효과
    if (card.appliedTokens && card.appliedTokens.length > 0) {
      score += card.appliedTokens.length * 5;
    }

    // 특성 보너스
    if (card.traits) {
      if (card.traits.includes('chain')) score += 5;
      if (card.traits.includes('swift')) score += 5;
      if (card.traits.includes('destroyer')) score += 10;
    }

    return Math.min(100, score);
  }
}

// ==================== 팩토리 함수 ====================

export function createComboOptimizer(
  cards: Record<string, GameCard>,
  config?: Partial<ComboOptimizerConfig>
): ComboOptimizer {
  return new ComboOptimizer(cards, config);
}

/**
 * 간단한 조합 점수 계산 (외부에서 빠르게 사용)
 */
export function quickComboScore(cards: GameCard[]): number {
  const combo = detectPokerCombo(cards);
  return combo.rank * 12.5 + (combo.multiplier - 1) * 10;
}

/**
 * 손패에서 페어 이상의 조합 가능 여부 확인
 */
export function hasComboOpportunity(handCards: GameCard[]): boolean {
  // actionCost별 카운트
  const costCount = new Map<number, number>();
  for (const card of handCards) {
    const cost = card.actionCost || 1;
    costCount.set(cost, (costCount.get(cost) || 0) + 1);
  }

  // 페어 이상 가능
  for (const count of costCount.values()) {
    if (count >= 2) return true;
  }

  // 플러쉬 가능
  const typeCount = new Map<string, number>();
  for (const card of handCards) {
    const type = card.type || 'general';
    typeCount.set(type, (typeCount.get(type) || 0) + 1);
  }
  for (const count of typeCount.values()) {
    if (count >= 4) return true;
  }

  return false;
}
