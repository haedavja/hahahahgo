/**
 * @file card-chain-system.test.ts
 * @description 카드 연계/창조 시스템 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createChainState,
  hasChainTrait,
  hasFollowupTrait,
  hasFinisherTrait,
  startChain,
  processFollowup,
  processFinisher,
  updateChainState,
  filterChainableCards,
  createGhostCardState,
  createCard,
  executeCreationEffect,
  removeGhostCards,
  checkCooperation,
  checkIndependence,
  processDoubleEdge,
  processAllCardInteractions,
  type ChainState,
  type ChainResult,
} from '../core/card-chain-system';
import type { GameCard, GameBattleState } from '../core/game-types';

// token-system 모킹
vi.mock('../core/token-system', () => ({
  addToken: vi.fn((tokens, id, stacks) => ({ ...tokens, [id]: (tokens[id] || 0) + stacks })),
  getTokenStacks: vi.fn((tokens, id) => tokens[id] || 0),
  hasToken: vi.fn((tokens, id) => (tokens[id] || 0) > 0),
  removeToken: vi.fn((tokens, id, stacks) => {
    const newTokens = { ...tokens };
    newTokens[id] = Math.max(0, (newTokens[id] || 0) - stacks);
    return newTokens;
  }),
}));

// 테스트용 카드 생성
function createMockCard(overrides: Partial<GameCard> = {}): GameCard {
  return {
    id: 'test_card',
    name: '테스트 카드',
    cost: 1,
    type: 'attack',
    damage: 10,
    description: '테스트',
    ...overrides,
  } as GameCard;
}

// 테스트용 게임 상태 생성
function createMockGameState(): GameBattleState {
  return {
    turn: 1,
    phase: 'player_turn',
    player: {
      hp: 70,
      maxHp: 80,
      energy: 3,
      maxEnergy: 3,
      block: 0,
      tokens: {},
      hand: [],
      deck: [],
      discard: [],
      exhaust: [],
      relics: [],
      insight: 0,
    },
    enemy: {
      id: 'test_enemy',
      name: '테스트 적',
      hp: 50,
      maxHp: 50,
      block: 0,
      tokens: {},
      deck: [],
      cardsPerTurn: 2,
    },
    timeline: [],
    comboUsageCount: {},
  } as GameBattleState;
}

// 테스트용 카드 라이브러리
function createMockCardLibrary(): Record<string, GameCard> {
  return {
    strike: createMockCard({ id: 'strike', name: '베기', cardCategory: 'fencing', type: 'attack' }),
    lunge: createMockCard({ id: 'lunge', name: '돌진', cardCategory: 'fencing', type: 'attack' }),
    fleche: createMockCard({ id: 'fleche', name: '플레쉬', cardCategory: 'fencing', type: 'attack' }),
    shoot: createMockCard({ id: 'shoot', name: '사격', cardCategory: 'gun', type: 'attack' }),
  };
}

describe('card-chain-system', () => {
  describe('createChainState', () => {
    it('초기 연계 상태를 생성한다', () => {
      const state = createChainState();

      expect(state.isChaining).toBe(false);
      expect(state.chainStartCard).toBeNull();
      expect(state.chainLength).toBe(0);
      expect(state.accumulatedBonus.damage).toBe(0);
      expect(state.accumulatedBonus.block).toBe(0);
      expect(state.accumulatedBonus.speedReduction).toBe(0);
      expect(state.lastChainType).toBeNull();
    });
  });

  describe('hasChainTrait', () => {
    it('chain 특성이 있으면 true를 반환한다', () => {
      const card = createMockCard({ traits: ['chain'] });
      expect(hasChainTrait(card)).toBe(true);
    });

    it('chain 특성이 없으면 false를 반환한다', () => {
      const card = createMockCard({ traits: ['followup'] });
      expect(hasChainTrait(card)).toBe(false);
    });

    it('traits가 없으면 false를 반환한다', () => {
      const card = createMockCard();
      expect(hasChainTrait(card)).toBe(false);
    });
  });

  describe('hasFollowupTrait', () => {
    it('followup 특성이 있으면 true를 반환한다', () => {
      const card = createMockCard({ traits: ['followup'] });
      expect(hasFollowupTrait(card)).toBe(true);
    });

    it('followup 특성이 없으면 false를 반환한다', () => {
      const card = createMockCard({ traits: ['chain'] });
      expect(hasFollowupTrait(card)).toBe(false);
    });
  });

  describe('hasFinisherTrait', () => {
    it('finisher 특성이 있으면 true를 반환한다', () => {
      const card = createMockCard({ traits: ['finisher'] });
      expect(hasFinisherTrait(card)).toBe(true);
    });

    it('finisher 특성이 없으면 false를 반환한다', () => {
      const card = createMockCard({ traits: ['chain'] });
      expect(hasFinisherTrait(card)).toBe(false);
    });
  });

  describe('startChain', () => {
    it('chain 특성이 있는 카드로 연계를 시작한다', () => {
      const chainState = createChainState();
      const card = createMockCard({ id: 'chain_card', traits: ['chain'] });

      const newState = startChain(chainState, card);

      expect(newState.isChaining).toBe(true);
      expect(newState.chainStartCard).toBe('chain_card');
      expect(newState.chainLength).toBe(1);
      expect(newState.lastChainType).toBe('chain');
    });

    it('chain 특성이 없으면 상태가 변하지 않는다', () => {
      const chainState = createChainState();
      const card = createMockCard({ traits: ['followup'] });

      const newState = startChain(chainState, card);

      expect(newState).toEqual(chainState);
    });

    it('chainSpeedReduction을 적용한다', () => {
      const chainState = createChainState();
      const card = createMockCard({ traits: ['chain'], chainSpeedReduction: 5 });

      const newState = startChain(chainState, card);

      expect(newState.accumulatedBonus.speedReduction).toBe(5);
    });
  });

  describe('processFollowup', () => {
    it('연계 중이 아니면 실패한다', () => {
      const chainState = createChainState();
      const card = createMockCard({ traits: ['followup'] });

      const result = processFollowup(chainState, card, {});

      expect(result.success).toBe(false);
    });

    it('followup 특성이 없으면 실패한다', () => {
      const chainState: ChainState = {
        isChaining: true,
        chainStartCard: 'chain_card',
        chainLength: 1,
        accumulatedBonus: { damage: 0, block: 0, speedReduction: 0 },
        lastChainType: 'chain',
      };
      const card = createMockCard({ traits: ['chain'] });

      const result = processFollowup(chainState, card, {});

      expect(result.success).toBe(false);
    });

    it('연계 중에 followup 카드를 사용하면 성공한다', () => {
      const chainState: ChainState = {
        isChaining: true,
        chainStartCard: 'chain_card',
        chainLength: 1,
        accumulatedBonus: { damage: 0, block: 0, speedReduction: 3 },
        lastChainType: 'chain',
      };
      const card = createMockCard({ traits: ['followup'], followupDamageBonus: 5 });

      const result = processFollowup(chainState, card, {});

      expect(result.success).toBe(true);
      expect(result.bonusDamage).toBeGreaterThan(0);
      expect(result.chainEnded).toBe(false);
    });

    it('기교 스택이 있으면 보너스 피해가 증가한다', () => {
      const chainState: ChainState = {
        isChaining: true,
        chainStartCard: 'chain_card',
        chainLength: 1,
        accumulatedBonus: { damage: 0, block: 0, speedReduction: 0 },
        lastChainType: 'chain',
      };
      const card = createMockCard({ traits: ['followup'] });

      const result = processFollowup(chainState, card, { finesse: 4 });

      expect(result.effects.some(e => e.includes('기교'))).toBe(true);
    });
  });

  describe('processFinisher', () => {
    it('연계 중이 아니면 실패한다', () => {
      const chainState = createChainState();
      const card = createMockCard({ traits: ['finisher'] });

      const result = processFinisher(chainState, card, {});

      expect(result.success).toBe(false);
    });

    it('finisher 특성이 없으면 실패한다', () => {
      const chainState: ChainState = {
        isChaining: true,
        chainStartCard: 'chain_card',
        chainLength: 2,
        accumulatedBonus: { damage: 5, block: 0, speedReduction: 3 },
        lastChainType: 'followup',
      };
      const card = createMockCard({ traits: ['followup'] });

      const result = processFinisher(chainState, card, {});

      expect(result.success).toBe(false);
    });

    it('연계 중에 finisher 카드를 사용하면 성공한다', () => {
      const chainState: ChainState = {
        isChaining: true,
        chainStartCard: 'chain_card',
        chainLength: 2,
        accumulatedBonus: { damage: 5, block: 0, speedReduction: 3 },
        lastChainType: 'followup',
      };
      const card = createMockCard({ traits: ['finisher'], finisherDamageBonus: 10 });

      const result = processFinisher(chainState, card, {});

      expect(result.success).toBe(true);
      expect(result.chainEnded).toBe(true);
      expect(result.bonusDamage).toBeGreaterThan(0);
    });

    it('consumeFinesse가 있으면 기교를 소모하여 추가 피해', () => {
      const chainState: ChainState = {
        isChaining: true,
        chainStartCard: 'chain_card',
        chainLength: 2,
        accumulatedBonus: { damage: 0, block: 0, speedReduction: 0 },
        lastChainType: 'followup',
      };
      const card = createMockCard({ traits: ['finisher'], consumeFinesse: true });

      const result = processFinisher(chainState, card, { finesse: 3 });

      expect(result.effects.some(e => e.includes('기교'))).toBe(true);
    });
  });

  describe('updateChainState', () => {
    it('연계가 종료되면 초기 상태로 리셋한다', () => {
      const chainState: ChainState = {
        isChaining: true,
        chainStartCard: 'chain_card',
        chainLength: 3,
        accumulatedBonus: { damage: 10, block: 5, speedReduction: 6 },
        lastChainType: 'followup',
      };
      const card = createMockCard({ traits: ['finisher'] });
      const result: ChainResult = {
        success: true,
        bonusDamage: 20,
        bonusBlock: 0,
        speedReduction: 0,
        etherBonus: 0,
        effects: [],
        chainEnded: true,
      };

      const newState = updateChainState(chainState, card, result);

      expect(newState.isChaining).toBe(false);
      expect(newState.chainLength).toBe(0);
    });

    it('연계 중이 아닌 카드 사용 시 연계가 끊긴다', () => {
      const chainState: ChainState = {
        isChaining: true,
        chainStartCard: 'chain_card',
        chainLength: 1,
        accumulatedBonus: { damage: 0, block: 0, speedReduction: 3 },
        lastChainType: 'chain',
      };
      const card = createMockCard(); // 연계 특성 없음
      const result: ChainResult = {
        success: false,
        bonusDamage: 0,
        bonusBlock: 0,
        speedReduction: 0,
        etherBonus: 0,
        effects: [],
        chainEnded: false,
      };

      const newState = updateChainState(chainState, card, result);

      expect(newState.isChaining).toBe(false);
    });

    it('chain 카드로 새 연계를 시작한다', () => {
      const chainState = createChainState();
      const card = createMockCard({ id: 'new_chain', traits: ['chain'] });
      const result: ChainResult = {
        success: true,
        bonusDamage: 0,
        bonusBlock: 0,
        speedReduction: 3,
        etherBonus: 0,
        effects: [],
        chainEnded: false,
      };

      const newState = updateChainState(chainState, card, result);

      expect(newState.isChaining).toBe(true);
      expect(newState.chainStartCard).toBe('new_chain');
    });

    it('followup 성공 시 연계 길이가 증가한다', () => {
      const chainState: ChainState = {
        isChaining: true,
        chainStartCard: 'chain_card',
        chainLength: 1,
        accumulatedBonus: { damage: 0, block: 0, speedReduction: 3 },
        lastChainType: 'chain',
      };
      const card = createMockCard({ traits: ['followup'] });
      const result: ChainResult = {
        success: true,
        bonusDamage: 5,
        bonusBlock: 2,
        speedReduction: 2,
        etherBonus: 0,
        effects: [],
        chainEnded: false,
      };

      const newState = updateChainState(chainState, card, result);

      expect(newState.chainLength).toBe(2);
      expect(newState.lastChainType).toBe('followup');
    });
  });

  describe('filterChainableCards', () => {
    it('연계 중이 아니면 chain 카드만 반환한다', () => {
      const hand = [
        createMockCard({ id: 'chain1', traits: ['chain'] }),
        createMockCard({ id: 'followup1', traits: ['followup'] }),
        createMockCard({ id: 'normal', traits: [] }),
      ];
      const chainState = createChainState();

      const result = filterChainableCards(hand, chainState);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('chain1');
    });

    it('연계 중이면 followup/finisher 카드를 반환한다', () => {
      const hand = [
        createMockCard({ id: 'chain1', traits: ['chain'] }),
        createMockCard({ id: 'followup1', traits: ['followup'] }),
        createMockCard({ id: 'finisher1', traits: ['finisher'] }),
        createMockCard({ id: 'normal', traits: [] }),
      ];
      const chainState: ChainState = {
        isChaining: true,
        chainStartCard: 'chain_card',
        chainLength: 1,
        accumulatedBonus: { damage: 0, block: 0, speedReduction: 0 },
        lastChainType: 'chain',
      };

      const result = filterChainableCards(hand, chainState);

      expect(result).toHaveLength(2);
      expect(result.map(c => c.id)).toContain('followup1');
      expect(result.map(c => c.id)).toContain('finisher1');
    });
  });

  describe('createGhostCardState', () => {
    it('빈 유령 카드 상태를 생성한다', () => {
      const state = createGhostCardState();

      expect(state.ghostCards).toEqual([]);
      expect(state.ghostEnhancements).toEqual({});
    });
  });

  describe('createCard', () => {
    it('존재하지 않는 카드는 실패한다', () => {
      const state = createMockGameState();
      const cardLibrary = createMockCardLibrary();

      const result = createCard(state, {
        cardId: 'nonexistent',
        count: 1,
        isGhost: true,
        inheritEnhancement: false,
        destination: 'hand',
      }, cardLibrary);

      expect(result.success).toBe(false);
    });

    it('손패에 카드를 생성한다', () => {
      const state = createMockGameState();
      const cardLibrary = createMockCardLibrary();

      const result = createCard(state, {
        cardId: 'strike',
        count: 1,
        isGhost: true,
        inheritEnhancement: false,
        destination: 'hand',
      }, cardLibrary);

      expect(result.success).toBe(true);
      expect(result.createdCards).toHaveLength(1);
      expect(state.player.hand).toHaveLength(1);
    });

    it('덱에 카드를 생성한다', () => {
      const state = createMockGameState();
      const cardLibrary = createMockCardLibrary();

      const result = createCard(state, {
        cardId: 'strike',
        count: 2,
        isGhost: true,
        inheritEnhancement: false,
        destination: 'deck',
      }, cardLibrary);

      expect(result.success).toBe(true);
      expect(state.player.deck).toHaveLength(2);
    });

    it('타임라인에 카드를 생성한다', () => {
      const state = createMockGameState();
      const cardLibrary = createMockCardLibrary();

      const result = createCard(state, {
        cardId: 'strike',
        count: 1,
        isGhost: true,
        inheritEnhancement: false,
        destination: 'timeline',
        timelinePosition: 5,
      }, cardLibrary);

      expect(result.success).toBe(true);
      expect(state.timeline).toHaveLength(1);
      expect(state.timeline[0].position).toBe(5);
    });

    it('유령 카드를 추적한다', () => {
      const state = createMockGameState();
      const cardLibrary = createMockCardLibrary();

      createCard(state, {
        cardId: 'strike',
        count: 1,
        isGhost: true,
        inheritEnhancement: false,
        destination: 'hand',
      }, cardLibrary);

      expect(state.ghostCards).toHaveLength(1);
    });

    it('강화 레벨을 계승한다', () => {
      const state = createMockGameState();
      state.player.cardEnhancements = { strike: 3 };
      const cardLibrary = createMockCardLibrary();

      const result = createCard(state, {
        cardId: 'strike',
        count: 1,
        isGhost: true,
        inheritEnhancement: true,
        destination: 'hand',
      }, cardLibrary);

      expect(result.createdCards[0].damage).toBeGreaterThan(cardLibrary.strike.damage!);
    });
  });

  describe('executeCreationEffect', () => {
    it('breach 효과: 검격 카드를 타임라인에 생성', () => {
      const state = createMockGameState();
      const cardLibrary = createMockCardLibrary();

      const result = executeCreationEffect(state, 'breach', cardLibrary);

      expect(result.success).toBe(true);
      expect(state.timeline.length).toBeGreaterThan(0);
    });

    it('createFencingCards3 효과: 검격 카드 3장 생성', () => {
      const state = createMockGameState();
      const cardLibrary = createMockCardLibrary();

      const result = executeCreationEffect(state, 'createFencingCards3', cardLibrary);

      expect(result.success).toBe(true);
      expect(result.effects.length).toBeGreaterThan(0);
    });

    it('executionSquad 효과: 총격 3장 생성', () => {
      const state = createMockGameState();
      const cardLibrary = createMockCardLibrary();

      const result = executeCreationEffect(state, 'executionSquad', cardLibrary);

      expect(result.success).toBe(true);
    });

    it('createAttackOnHit 효과: 공격 카드 1장 생성', () => {
      const state = createMockGameState();
      const cardLibrary = createMockCardLibrary();

      const result = executeCreationEffect(state, 'createAttackOnHit', cardLibrary);

      expect(result.success).toBe(true);
    });

    it('알 수 없는 효과는 실패한다', () => {
      const state = createMockGameState();
      const cardLibrary = createMockCardLibrary();

      const result = executeCreationEffect(state, 'unknown_effect', cardLibrary);

      expect(result.success).toBe(false);
    });
  });

  describe('removeGhostCards', () => {
    it('모든 유령 카드를 제거한다', () => {
      const state = createMockGameState();
      state.ghostCards = ['ghost_1', 'ghost_2'];
      state.player.hand = ['normal_card', 'ghost_1'];
      state.player.deck = ['ghost_2', 'normal_card2'];
      state.player.discard = ['ghost_1', 'normal_card3'];

      removeGhostCards(state);

      expect(state.player.hand).not.toContain('ghost_1');
      expect(state.player.deck).not.toContain('ghost_2');
      expect(state.player.discard).not.toContain('ghost_1');
      expect(state.ghostCards).toHaveLength(0);
    });

    it('유령 카드가 없으면 아무것도 하지 않는다', () => {
      const state = createMockGameState();

      removeGhostCards(state);

      expect(state.player.hand).toEqual([]);
    });
  });

  describe('checkCooperation', () => {
    it('cooperation 특성이 없으면 보너스가 없다', () => {
      const card = createMockCard({ cardCategory: 'fencing' });
      const others = [createMockCard({ cardCategory: 'fencing' })];

      const result = checkCooperation(card, others);

      expect(result.bonus).toBe(0);
    });

    it('동일 카테고리 카드가 있으면 보너스를 받는다', () => {
      const card = createMockCard({ traits: ['cooperation'], cardCategory: 'fencing' });
      const others = [
        createMockCard({ id: 'other1', cardCategory: 'fencing' }),
        createMockCard({ id: 'other2', cardCategory: 'fencing' }),
      ];

      const result = checkCooperation(card, others);

      expect(result.bonus).toBe(4); // 2 * 2
    });

    it('동일 카테고리 카드가 없으면 보너스가 없다', () => {
      const card = createMockCard({ traits: ['cooperation'], cardCategory: 'fencing' });
      const others = [createMockCard({ id: 'other1', cardCategory: 'gun' })];

      const result = checkCooperation(card, others);

      expect(result.bonus).toBe(0);
    });
  });

  describe('checkIndependence', () => {
    it('independence 특성이 없으면 보너스가 없다', () => {
      const card = createMockCard();

      const result = checkIndependence(card, []);

      expect(result.bonus).toBe(0);
    });

    it('단독 사용 시 보너스를 받는다', () => {
      const card = createMockCard({ traits: ['independence'] });

      const result = checkIndependence(card, []);

      expect(result.bonus).toBe(5);
    });

    it('다른 카드와 함께 사용 시 보너스가 없다', () => {
      const card = createMockCard({ traits: ['independence'] });
      const others = [createMockCard({ id: 'other' })];

      const result = checkIndependence(card, others);

      expect(result.bonus).toBe(0);
    });
  });

  describe('processDoubleEdge', () => {
    it('double_edge 특성이 없으면 효과가 없다', () => {
      const card = createMockCard();

      const result = processDoubleEdge(card, 50);

      expect(result.selfDamage).toBe(0);
      expect(result.bonusDamage).toBe(0);
    });

    it('자해 피해와 보너스 피해를 반환한다', () => {
      const card = createMockCard({
        traits: ['double_edge'],
        doubleEdgeSelfDamage: 10,
        doubleEdgeBonusDamage: 20,
      });

      const result = processDoubleEdge(card, 50);

      expect(result.selfDamage).toBe(10);
      expect(result.bonusDamage).toBe(20);
    });

    it('기본값을 사용한다', () => {
      const card = createMockCard({ traits: ['double_edge'] });

      const result = processDoubleEdge(card, 50);

      expect(result.selfDamage).toBe(5);
      expect(result.bonusDamage).toBe(7); // Math.floor(5 * 1.5)
    });
  });

  describe('processAllCardInteractions', () => {
    it('모든 카드 상호작용을 처리한다', () => {
      const state = createMockGameState();
      const card = createMockCard({ traits: ['chain'] });
      const chainState = createChainState();
      const cardLibrary = createMockCardLibrary();

      const result = processAllCardInteractions(
        state,
        card,
        [],
        chainState,
        cardLibrary
      );

      expect(result.chainResult.success).toBe(true);
      expect(result.newChainState.isChaining).toBe(true);
    });

    it('연계/협력/독립/양날의 검을 모두 처리한다', () => {
      const state = createMockGameState();
      const card = createMockCard({
        id: 'main_card',
        traits: ['chain', 'cooperation', 'double_edge'],
        cardCategory: 'fencing',
      });
      const others = [createMockCard({ id: 'other_fencing', cardCategory: 'fencing' })];
      const chainState = createChainState();
      const cardLibrary = createMockCardLibrary();

      const result = processAllCardInteractions(
        state,
        card,
        others,
        chainState,
        cardLibrary
      );

      expect(result.cooperationBonus).toBeGreaterThan(0);
      expect(result.doubleEdge.selfDamage).toBeGreaterThan(0);
    });

    it('창조 효과가 있으면 실행한다', () => {
      const state = createMockGameState();
      const card = createMockCard({ creationEffect: 'createAttackOnHit' });
      const chainState = createChainState();
      const cardLibrary = createMockCardLibrary();

      const result = processAllCardInteractions(
        state,
        card,
        [],
        chainState,
        cardLibrary
      );

      expect(result.creationEffects.length).toBeGreaterThan(0);
    });
  });
});
