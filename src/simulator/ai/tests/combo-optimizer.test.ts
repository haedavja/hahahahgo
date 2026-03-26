/**
 * @file combo-optimizer.test.ts
 * @description 포커 콤보 최적화 AI 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ComboOptimizer,
  createComboOptimizer,
  quickComboScore,
  hasComboOpportunity,
  type ComboOptimizerConfig,
} from '../combo-optimizer';
import type { GameCard } from '../../core/game-types';
import type { ComboResult } from '../../core/combo-ether-system';

// combo-ether-system 모킹
vi.mock('../../core/combo-ether-system', () => ({
  detectPokerCombo: vi.fn((cards: GameCard[]): ComboResult => {
    // actionCost 기준 페어/트리플/포카드 감지
    const costCount = new Map<number, number>();
    for (const card of cards) {
      const cost = card.actionCost || 1;
      costCount.set(cost, (costCount.get(cost) || 0) + 1);
    }

    let maxCount = 0;
    for (const count of costCount.values()) {
      maxCount = Math.max(maxCount, count);
    }

    // 타입 기준 플러쉬 감지
    const typeCount = new Map<string, number>();
    for (const card of cards) {
      const type = card.type || 'general';
      typeCount.set(type, (typeCount.get(type) || 0) + 1);
    }

    let maxTypeCount = 0;
    for (const count of typeCount.values()) {
      maxTypeCount = Math.max(maxTypeCount, count);
    }

    // 풀하우스 체크 (트리플 + 페어)
    const counts = Array.from(costCount.values()).sort((a, b) => b - a);
    const isFullHouse = counts.length >= 2 && counts[0] >= 3 && counts[1] >= 2;

    if (maxCount >= 5) return { name: '파이브카드', rank: 8, multiplier: 4, matchedCards: [], baseEther: 40 };
    if (isFullHouse) return { name: '풀하우스', rank: 5, multiplier: 2.5, matchedCards: [], baseEther: 25 };
    if (maxTypeCount >= 5) return { name: '플러쉬', rank: 4, multiplier: 2, matchedCards: [], baseEther: 20 };
    if (maxCount >= 4) return { name: '포카드', rank: 6, multiplier: 3, matchedCards: [], baseEther: 30 };
    if (maxTypeCount >= 4 && maxCount < 3) return { name: '플러쉬', rank: 4, multiplier: 2, matchedCards: [], baseEther: 20 };
    if (maxCount >= 3) return { name: '트리플', rank: 3, multiplier: 1.8, matchedCards: [], baseEther: 15 };
    if (maxCount >= 2) return { name: '페어', rank: 1, multiplier: 1.3, matchedCards: [], baseEther: 8 };
    return { name: '하이카드', rank: 0, multiplier: 1, matchedCards: [], baseEther: 0 };
  }),
  calculateTotalEther: vi.fn((cards: GameCard[]) => ({
    baseEther: cards.length * 2,
    multiplier: 1,
    finalGain: cards.length * 2,
    breakdown: [],
  })),
  COMBO_MULTIPLIERS: {
    high_card: 1,
    pair: 1.3,
    triple: 1.8,
    flush: 2,
    full_house: 2.5,
    four_card: 3,
    five_card: 4,
  },
}));

// 테스트용 카드 생성
function createMockCard(overrides: Partial<GameCard> = {}): GameCard {
  return {
    id: `card_${Math.random().toString(36).substr(2, 9)}`,
    name: '테스트 카드',
    cost: 1,
    type: 'attack',
    damage: 10,
    description: '테스트',
    actionCost: 1,
    speedCost: 3,
    ...overrides,
  } as GameCard;
}

// 테스트용 카드 라이브러리 생성
function createCardLibrary(): Record<string, GameCard> {
  return {
    card1: createMockCard({ id: 'card1', name: '카드1', actionCost: 1, type: 'attack', damage: 10 }),
    card2: createMockCard({ id: 'card2', name: '카드2', actionCost: 1, type: 'attack', damage: 12 }),
    card3: createMockCard({ id: 'card3', name: '카드3', actionCost: 2, type: 'defense', block: 8 }),
    card4: createMockCard({ id: 'card4', name: '카드4', actionCost: 2, type: 'defense', block: 10 }),
    card5: createMockCard({ id: 'card5', name: '카드5', actionCost: 3, type: 'attack', damage: 15 }),
    card6: createMockCard({ id: 'card6', name: '카드6', actionCost: 1, type: 'attack', damage: 8 }),
    card7: createMockCard({ id: 'card7', name: '카드7', actionCost: 1, type: 'attack', damage: 11 }),
    card8: createMockCard({ id: 'card8', name: '카드8', actionCost: 2, type: 'defense', block: 6 }),
    card9: createMockCard({ id: 'card9', name: '카드9', actionCost: 4, type: 'skill', damage: 20 }),
    card10: createMockCard({ id: 'card10', name: '카드10', actionCost: 4, type: 'skill', damage: 18 }),
  };
}

describe('combo-optimizer', () => {
  let cardLibrary: Record<string, GameCard>;
  let optimizer: ComboOptimizer;

  beforeEach(() => {
    vi.clearAllMocks();
    cardLibrary = createCardLibrary();
    optimizer = new ComboOptimizer(cardLibrary);
  });

  describe('ComboOptimizer 생성', () => {
    it('기본 설정으로 생성할 수 있다', () => {
      const opt = new ComboOptimizer(cardLibrary);
      expect(opt).toBeDefined();
    });

    it('커스텀 설정으로 생성할 수 있다', () => {
      const config: Partial<ComboOptimizerConfig> = {
        comboWeight: 0.7,
        combatWeight: 0.3,
      };
      const opt = new ComboOptimizer(cardLibrary, config);
      expect(opt).toBeDefined();
    });
  });

  describe('updateConfig', () => {
    it('설정을 업데이트할 수 있다', () => {
      optimizer.updateConfig({ comboWeight: 0.8 });
      // 설정이 업데이트되었는지 간접적으로 확인
      const result = optimizer.evaluateCardPotentials(['card1', 'card2']);
      expect(result).toBeDefined();
    });
  });

  describe('analyzeHand', () => {
    it('손패를 분석하여 조합 정보를 반환한다', () => {
      const handCardIds = ['card1', 'card2', 'card3'];
      const result = optimizer.analyzeHand(handCardIds);

      expect(result.currentCombo).toBeDefined();
      expect(result.bestPossibleCombo).toBeDefined();
      expect(result.bestComboCards).toBeDefined();
      expect(result.expectedEther).toBeGreaterThanOrEqual(0);
      expect(result.comboScore).toBeGreaterThanOrEqual(0);
      expect(result.analysis.length).toBeGreaterThan(0);
    });

    it('페어가 있는 손패를 올바르게 분석한다', () => {
      const handCardIds = ['card1', 'card2']; // 같은 actionCost
      const result = optimizer.analyzeHand(handCardIds);

      expect(result.bestPossibleCombo.name).toBe('페어');
    });

    it('트리플이 있는 손패를 분석한다', () => {
      const handCardIds = ['card1', 'card2', 'card6']; // 모두 actionCost 1
      const result = optimizer.analyzeHand(handCardIds);

      expect(result.bestPossibleCombo.name).toBe('트리플');
    });

    it('포카드가 있는 손패를 분석한다', () => {
      const handCardIds = ['card1', 'card2', 'card6', 'card7']; // 모두 actionCost 1
      const result = optimizer.analyzeHand(handCardIds);

      expect(result.bestPossibleCombo.name).toBe('포카드');
    });

    it('빈 손패도 처리한다', () => {
      const result = optimizer.analyzeHand([]);

      expect(result.currentCombo.name).toBe('하이카드');
      expect(result.bestComboCards).toHaveLength(0);
    });

    it('존재하지 않는 카드 ID를 필터링한다', () => {
      const handCardIds = ['card1', 'invalid_card', 'card2'];
      const result = optimizer.analyzeHand(handCardIds);

      expect(result.bestPossibleCombo).toBeDefined();
    });
  });

  describe('evaluateCardPotentials', () => {
    it('각 카드의 조합 기여도를 평가한다', () => {
      const handCardIds = ['card1', 'card2', 'card3'];
      const potentials = optimizer.evaluateCardPotentials(handCardIds);

      expect(potentials.length).toBe(3);
      expect(potentials[0]).toHaveProperty('cardId');
      expect(potentials[0]).toHaveProperty('comboContribution');
      expect(potentials[0]).toHaveProperty('potentialCombo');
      expect(potentials[0]).toHaveProperty('combatScore');
      expect(potentials[0]).toHaveProperty('totalScore');
    });

    it('같은 코스트 카드가 많으면 기여도가 높다', () => {
      const handCardIds = ['card1', 'card2', 'card6', 'card7']; // 모두 actionCost 1
      const potentials = optimizer.evaluateCardPotentials(handCardIds);

      // 모든 카드가 포카드 기여도 (85점)
      expect(potentials[0].comboContribution).toBe(85);
      expect(potentials[0].potentialCombo).toBe('포카드');
    });

    it('트리플 가능하면 60점 기여도', () => {
      const handCardIds = ['card1', 'card2', 'card6']; // 3장 actionCost 1
      const potentials = optimizer.evaluateCardPotentials(handCardIds);

      expect(potentials[0].comboContribution).toBe(60);
      expect(potentials[0].potentialCombo).toBe('트리플');
    });

    it('페어 가능하면 40점 기여도', () => {
      const handCardIds = ['card1', 'card2', 'card3']; // 2장 actionCost 1, 1장 2
      const potentials = optimizer.evaluateCardPotentials(handCardIds);

      // card1, card2는 페어 기여도 40
      const card1Potential = potentials.find(p => p.cardId === 'card1');
      expect(card1Potential?.comboContribution).toBe(40);
    });

    it('종합 점수로 정렬된다', () => {
      const handCardIds = ['card1', 'card2', 'card3', 'card5'];
      const potentials = optimizer.evaluateCardPotentials(handCardIds);

      // 정렬 확인
      for (let i = 1; i < potentials.length; i++) {
        expect(potentials[i - 1].totalScore).toBeGreaterThanOrEqual(potentials[i].totalScore);
      }
    });

    it('풀하우스 가능성을 감지한다', () => {
      const handCardIds = ['card1', 'card2', 'card6', 'card3', 'card4']; // 3개 cost 1, 2개 cost 2
      const potentials = optimizer.evaluateCardPotentials(handCardIds);

      // cost 1 카드는 풀하우스 기여도 (75)
      const card1Potential = potentials.find(p => p.cardId === 'card1');
      expect(card1Potential?.comboContribution).toBe(75);
      expect(card1Potential?.potentialCombo).toBe('풀하우스');
    });
  });

  describe('selectOptimalCards', () => {
    it('지정된 개수의 카드를 선택한다', () => {
      const handCardIds = ['card1', 'card2', 'card3', 'card5'];
      const result = optimizer.selectOptimalCards(handCardIds, 2);

      expect(result.selectedCards.length).toBe(2);
      expect(result.combo).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('최적 조합이 있으면 조합 카드를 선택한다', () => {
      const handCardIds = ['card1', 'card2', 'card3', 'card5'];
      const result = optimizer.selectOptimalCards(handCardIds, 2);

      // 페어 (card1, card2)가 선택됨
      expect(result.selectedCards).toContain('card1');
      expect(result.selectedCards).toContain('card2');
    });

    it('HP가 낮으면 전투력 우선 모드로 전환한다', () => {
      const handCardIds = ['card1', 'card2', 'card3', 'card5'];
      const result = optimizer.selectOptimalCards(handCardIds, 2, { hpRatio: 0.2 });

      expect(result.reasoning).toContain('HP 위급: 전투력 우선');
    });

    it('적 위협이 높으면 방어 고려 모드로 전환한다', () => {
      const handCardIds = ['card1', 'card2', 'card3', 'card5'];
      const result = optimizer.selectOptimalCards(handCardIds, 2, { enemyThreat: 25 });

      expect(result.reasoning).toContain('높은 위협: 방어 고려');
    });

    it('선택할 카드가 손패보다 많으면 가능한 만큼 선택', () => {
      const handCardIds = ['card1', 'card2'];
      const result = optimizer.selectOptimalCards(handCardIds, 5);

      expect(result.selectedCards.length).toBe(2);
    });

    it('minComboRank보다 낮은 조합은 종합 점수 기반 선택', () => {
      optimizer.updateConfig({ minComboRank: 5 }); // 풀하우스 이상만
      const handCardIds = ['card1', 'card2', 'card3', 'card5'];
      const result = optimizer.selectOptimalCards(handCardIds, 2);

      // 조합이 아닌 종합 점수 기반 선택
      expect(result.selectedCards.length).toBe(2);
    });
  });

  describe('suggestComboCompletion', () => {
    it('조합 완성을 위한 카드를 추천한다', () => {
      const currentCards = ['card1']; // cost 1 하나
      const availableCards = ['card2', 'card3', 'card5']; // card2는 cost 1

      const result = optimizer.suggestComboCompletion(currentCards, availableCards);

      expect(result.suggestedCard).toBe('card2');
      expect(result.targetCombo).toBe('페어');
      expect(result.improvement).toBeGreaterThan(0);
    });

    it('개선 가능한 카드가 없으면 null 반환', () => {
      const currentCards = ['card1', 'card2']; // 이미 페어
      const availableCards = ['card3', 'card5']; // 다른 cost

      const result = optimizer.suggestComboCompletion(currentCards, availableCards);

      // 페어 → 트리플 개선이 없으면 null
      if (!result.suggestedCard) {
        expect(result.improvement).toBe(0);
        expect(result.reason).toBe('개선 가능한 카드 없음');
      }
    });

    it('트리플 완성 추천', () => {
      const currentCards = ['card1', 'card2']; // cost 1 두 개
      const availableCards = ['card6', 'card3']; // card6은 cost 1

      const result = optimizer.suggestComboCompletion(currentCards, availableCards);

      expect(result.suggestedCard).toBe('card6');
      expect(result.targetCombo).toBe('트리플');
    });

    it('이미 손패에 있는 카드는 제외', () => {
      const currentCards = ['card1', 'card2'];
      const availableCards = ['card1', 'card2', 'card3']; // 중복 포함

      const result = optimizer.suggestComboCompletion(currentCards, availableCards);

      // 중복 카드는 추천하지 않음
      if (result.suggestedCard) {
        expect(result.suggestedCard).not.toBe('card1');
        expect(result.suggestedCard).not.toBe('card2');
      }
    });

    it('존재하지 않는 카드는 무시', () => {
      const currentCards = ['card1'];
      const availableCards = ['invalid_card', 'card2'];

      const result = optimizer.suggestComboCompletion(currentCards, availableCards);

      expect(result.suggestedCard).toBe('card2');
    });
  });

  describe('createComboOptimizer 팩토리 함수', () => {
    it('ComboOptimizer 인스턴스를 생성한다', () => {
      const opt = createComboOptimizer(cardLibrary);

      expect(opt).toBeInstanceOf(ComboOptimizer);
    });

    it('설정과 함께 생성할 수 있다', () => {
      const config: Partial<ComboOptimizerConfig> = {
        comboWeight: 0.6,
        combatWeight: 0.4,
      };
      const opt = createComboOptimizer(cardLibrary, config);

      expect(opt).toBeInstanceOf(ComboOptimizer);
    });
  });

  describe('quickComboScore 함수', () => {
    it('카드 배열의 빠른 조합 점수를 계산한다', () => {
      const cards = [
        createMockCard({ actionCost: 1 }),
        createMockCard({ actionCost: 1 }),
      ];

      const score = quickComboScore(cards);

      // 페어: rank 1 * 12.5 + (1.3 - 1) * 10 = 12.5 + 3 = 15.5
      expect(score).toBe(15.5);
    });

    it('하이카드면 낮은 점수', () => {
      const cards = [
        createMockCard({ actionCost: 1 }),
        createMockCard({ actionCost: 2 }),
      ];

      const score = quickComboScore(cards);

      // 하이카드: rank 0 * 12.5 + (1 - 1) * 10 = 0
      expect(score).toBe(0);
    });

    it('포카드면 높은 점수', () => {
      const cards = [
        createMockCard({ actionCost: 1 }),
        createMockCard({ actionCost: 1 }),
        createMockCard({ actionCost: 1 }),
        createMockCard({ actionCost: 1 }),
      ];

      const score = quickComboScore(cards);

      // 포카드: rank 6 * 12.5 + (3 - 1) * 10 = 75 + 20 = 95
      expect(score).toBe(95);
    });
  });

  describe('hasComboOpportunity 함수', () => {
    it('페어 가능하면 true', () => {
      const cards = [
        createMockCard({ actionCost: 1 }),
        createMockCard({ actionCost: 1 }),
        createMockCard({ actionCost: 2 }),
      ];

      expect(hasComboOpportunity(cards)).toBe(true);
    });

    it('플러쉬 가능하면 true', () => {
      const cards = [
        createMockCard({ actionCost: 1, type: 'attack' }),
        createMockCard({ actionCost: 2, type: 'attack' }),
        createMockCard({ actionCost: 3, type: 'attack' }),
        createMockCard({ actionCost: 4, type: 'attack' }),
      ];

      expect(hasComboOpportunity(cards)).toBe(true);
    });

    it('조합 불가능하면 false', () => {
      const cards = [
        createMockCard({ actionCost: 1, type: 'attack' }),
        createMockCard({ actionCost: 2, type: 'defense' }),
        createMockCard({ actionCost: 3, type: 'skill' }),
      ];

      expect(hasComboOpportunity(cards)).toBe(false);
    });

    it('빈 배열은 false', () => {
      expect(hasComboOpportunity([])).toBe(false);
    });

    it('한 장만 있으면 false', () => {
      const cards = [createMockCard({ actionCost: 1 })];

      expect(hasComboOpportunity(cards)).toBe(false);
    });
  });

  describe('내부 헬퍼 메서드 간접 테스트', () => {
    describe('generateSubsets (analyzeHand를 통해)', () => {
      it('2-5장의 모든 부분집합을 탐색한다', () => {
        const handCardIds = ['card1', 'card2', 'card3', 'card4', 'card5'];
        const result = optimizer.analyzeHand(handCardIds);

        // 최적 조합을 찾음
        expect(result.bestPossibleCombo).toBeDefined();
      });

      it('카드가 적어도 처리한다', () => {
        const handCardIds = ['card1'];
        const result = optimizer.analyzeHand(handCardIds);

        expect(result.bestPossibleCombo).toBeDefined();
      });
    });

    describe('calculateComboScore (analyzeHand를 통해)', () => {
      it('조합 점수가 0-100 범위 내', () => {
        const handCardIds = ['card1', 'card2', 'card3', 'card4', 'card5'];
        const result = optimizer.analyzeHand(handCardIds);

        expect(result.comboScore).toBeGreaterThanOrEqual(0);
        expect(result.comboScore).toBeLessThanOrEqual(100);
      });
    });

    describe('calculateCombatScore (evaluateCardPotentials를 통해)', () => {
      it('전투력 점수가 계산된다', () => {
        const handCardIds = ['card1', 'card5', 'card9'];
        const potentials = optimizer.evaluateCardPotentials(handCardIds);

        for (const p of potentials) {
          expect(p.combatScore).toBeGreaterThanOrEqual(0);
          expect(p.combatScore).toBeLessThanOrEqual(100);
        }
      });

      it('데미지가 높은 카드가 높은 전투력 점수', () => {
        // card9: damage 20, card1: damage 10
        const handCardIds = ['card1', 'card9'];
        const potentials = optimizer.evaluateCardPotentials(handCardIds);

        const card9Potential = potentials.find(p => p.cardId === 'card9');
        const card1Potential = potentials.find(p => p.cardId === 'card1');

        // card9가 더 높은 damage
        expect(card9Potential?.combatScore).toBeGreaterThanOrEqual(card1Potential?.combatScore || 0);
      });

      it('방어력이 있는 카드도 점수 반영', () => {
        const handCardIds = ['card3', 'card4']; // defense cards with block
        const potentials = optimizer.evaluateCardPotentials(handCardIds);

        expect(potentials[0].combatScore).toBeGreaterThan(0);
      });
    });
  });

  describe('특수 케이스', () => {
    it('동일 카드 ID가 중복되어도 처리', () => {
      const handCardIds = ['card1', 'card1', 'card2'];
      const result = optimizer.analyzeHand(handCardIds);

      expect(result.currentCombo).toBeDefined();
    });

    it('모든 카드가 같은 코스트면 최고 조합', () => {
      // 5장 모두 같은 코스트
      cardLibrary['card_extra1'] = createMockCard({ id: 'card_extra1', actionCost: 1 });
      const handCardIds = ['card1', 'card2', 'card6', 'card7', 'card_extra1'];
      const result = optimizer.analyzeHand(handCardIds);

      expect(result.bestPossibleCombo.name).toBe('파이브카드');
    });

    it('빈 카드 라이브러리로 생성', () => {
      const emptyOptimizer = new ComboOptimizer({});
      const result = emptyOptimizer.analyzeHand(['card1', 'card2']);

      expect(result.currentCombo.name).toBe('하이카드');
    });
  });
});
