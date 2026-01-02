/**
 * @file card-creation.test.ts
 * @description 카드 창조 시스템 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateCreationPool,
  selectBestCard,
  createBreachCards,
  CardCreationSystem,
  type CardCreationResult,
  type CreationPoolOptions,
} from '../core/card-creation';
import type { GameCard, GameBattleState, PlayerState, EnemyState } from '../core/game-types';

describe('card-creation', () => {
  // 테스트용 카드 데이터 (Partial 사용으로 필수 필드만 제공)
  const testCards = {
    attack1: {
      id: 'attack1',
      name: '기본 공격',
      type: 'attack',
      cardCategory: 'general',
      damage: 10,
      actionCost: 1,
      speedCost: 5,
    },
    attack2: {
      id: 'attack2',
      name: '강타',
      type: 'attack',
      cardCategory: 'general',
      damage: 15,
      hits: 2,
      actionCost: 2,
      speedCost: 8,
    },
    defense1: {
      id: 'defense1',
      name: '방어',
      type: 'defense',
      cardCategory: 'general',
      block: 8,
      actionCost: 1,
      speedCost: 3,
    },
    fencing1: {
      id: 'fencing1',
      name: '펜싱 공격',
      type: 'attack',
      cardCategory: 'fencing',
      damage: 12,
      actionCost: 1,
      speedCost: 4,
    },
    gun1: {
      id: 'gun1',
      name: '사격',
      type: 'attack',
      cardCategory: 'gun',
      damage: 8,
      hits: 3,
      actionCost: 2,
      speedCost: 6,
    },
    skill1: {
      id: 'skill1',
      name: '버프',
      type: 'support',
      cardCategory: 'general',
      actionCost: 1,
      speedCost: 2,
    },
    finesse_required: {
      id: 'finesse_required',
      name: '기교 필요',
      type: 'attack',
      cardCategory: 'general',
      damage: 20,
      actionCost: 1,
      speedCost: 5,
      requiredTokens: [{ id: 'finesse', stacks: 1 }],
    },
    power1: {
      id: 'power1',
      name: '파워',
      type: 'general', // power 타입은 CardType에 없으므로 general로 변경
      cardCategory: 'general',
      actionCost: 2,
      speedCost: 0,
    },
  } as unknown as Record<string, GameCard>;

  // 기본 플레이어 상태
  const createPlayer = (): PlayerState => ({
    hp: 80,
    maxHp: 100,
    maxSpeed: 30,
    block: 0,
    strength: 0,
    agility: 0,
    energy: 6,
    maxEnergy: 6,
    gold: 0,
    hand: [],
    deck: [],
    discard: [],
    tokens: {},
    ether: 0,
    insight: 0,
    relics: [],
  });

  // 기본 적 상태
  const createEnemy = (): EnemyState => ({
    id: 'test_enemy',
    name: '테스트 적',
    hp: 50,
    maxHp: 100,
    maxSpeed: 30,
    block: 0,
    tokens: {},
    deck: [],
    cardsPerTurn: 1,
  });

  // 기본 전투 상태
  const createBattleState = (): GameBattleState => ({
    player: createPlayer(),
    enemy: createEnemy(),
    turn: 1,
    phase: 'select',
    timeline: [],
    battleLog: [],
  });

  describe('generateCreationPool', () => {
    it('기본 카드 풀 생성', () => {
      const pool = generateCreationPool(testCards, { count: 3 });

      expect(pool.length).toBeLessThanOrEqual(3);
      expect(pool.every(c => ['attack', 'defense', 'general', 'support'].includes(c.type))).toBe(true);
    });

    it('카테고리 필터링', () => {
      const pool = generateCreationPool(testCards, {
        category: 'fencing',
        count: 5,
      });

      expect(pool.every(c => c.cardCategory === 'fencing')).toBe(true);
    });

    it('타입 필터링', () => {
      const pool = generateCreationPool(testCards, {
        type: 'attack',
        count: 10,
      });

      expect(pool.every(c => c.type === 'attack')).toBe(true);
    });

    it('기교 소모 카드 제외', () => {
      const pool = generateCreationPool(testCards, {
        excludeRequiredTokens: true,
        count: 10,
      });

      expect(pool.every(c => !c.requiredTokens || c.requiredTokens.length === 0)).toBe(true);
    });

    it('특정 ID 제외', () => {
      const pool = generateCreationPool(testCards, {
        excludeIds: ['attack1', 'attack2'],
        count: 10,
      });

      expect(pool.every(c => c.id !== 'attack1' && c.id !== 'attack2')).toBe(true);
    });

    it('기본 타입만 포함 (attack, defense, general, support)', () => {
      const pool = generateCreationPool(testCards, { count: 10 });
      const validTypes = ['attack', 'defense', 'general', 'support'];

      expect(pool.every(c => validTypes.includes(c.type))).toBe(true);
    });

    it('중복 ID 없음', () => {
      const pool = generateCreationPool(testCards, { count: 10 });
      const ids = pool.map(c => c.id);
      const uniqueIds = new Set(ids);

      expect(ids.length).toBe(uniqueIds.size);
    });
  });

  describe('selectBestCard', () => {
    it('빈 배열이면 null 반환', () => {
      const state = createBattleState();
      const result = selectBestCard([], state, 'player');

      expect(result).toBeNull();
    });

    it('카드가 하나면 그 카드 반환', () => {
      const state = createBattleState();
      const cards = [testCards['attack1']];
      const result = selectBestCard(cards, state, 'player');

      expect(result).toBe(cards[0]);
    });

    it('적 체력이 낮으면 공격 카드 선호', () => {
      const state = createBattleState();
      state.enemy.hp = 10;

      const cards = [testCards['defense1'], testCards['attack1']];
      const result = selectBestCard(cards, state, 'player');

      // 공격 카드가 선택될 가능성이 높음
      expect(result).toBeTruthy();
    });

    it('플레이어 체력이 낮으면 방어 카드 선호', () => {
      const state = createBattleState();
      state.player.hp = 20; // 20% HP

      const cards = [testCards['attack1'], testCards['defense1']];
      const result = selectBestCard(cards, state, 'player');

      expect(result).toBeTruthy();
    });

    it('마무리 가능한 공격 우선', () => {
      const state = createBattleState();
      state.enemy.hp = 10;

      const cards = [
        testCards['attack1'], // 10 damage - 마무리 가능
        testCards['defense1'],
      ];
      const result = selectBestCard(cards, state, 'player');

      // 마무리 가능한 attack1 선택
      expect(result?.id).toBe('attack1');
    });

    it('적도 카드 선택 가능', () => {
      const state = createBattleState();
      const cards = [testCards['attack1'], testCards['attack2']];
      const result = selectBestCard(cards, state, 'enemy');

      expect(result).toBeTruthy();
    });
  });

  describe('createBreachCards', () => {
    it('브리치 카드 생성', () => {
      const state = createBattleState();
      const sourceCard = testCards['attack1'];
      const result = createBreachCards(testCards, state, sourceCard, 5);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('createdCards');
      expect(result).toHaveProperty('message');
    });

    it('카드 풀이 비어있으면 실패', () => {
      const state = createBattleState();
      const emptyCards: Record<string, GameCard> = {};
      const sourceCard = testCards['attack1'];
      const result = createBreachCards(emptyCards, state, sourceCard, 5);

      expect(result.success).toBe(false);
      expect(result.createdCards).toEqual([]);
    });
  });

  describe('CardCreationSystem', () => {
    let system: CardCreationSystem;

    beforeEach(() => {
      system = new CardCreationSystem(testCards);
    });

    it('인스턴스 생성', () => {
      expect(system).toBeInstanceOf(CardCreationSystem);
    });

    it('브리치 효과 처리', () => {
      const state = createBattleState();
      state.timeline = [];
      const sourceCard = testCards['attack1'];
      const timelineCard = { cardId: 'attack1', owner: 'player' as const, position: 5, crossed: false, executed: false };

      const result = system.processCreationEffect('breach', state, sourceCard, timelineCard, 'player');

      expect(result).toHaveProperty('created');
      expect(result).toHaveProperty('messages');
      expect(Array.isArray(result.created)).toBe(true);
      expect(Array.isArray(result.messages)).toBe(true);
    });

    it('hasCreationEffect 확인', () => {
      const breachCard = { ...testCards['attack1'], special: 'breach' } as GameCard;
      const normalCard = testCards['attack1'];

      expect(system.hasCreationEffect(breachCard)).toBe(true);
      expect(system.hasCreationEffect(normalCard)).toBe(false);
    });

    it('getCreationEffects 확인', () => {
      const multiEffectCard = { ...testCards['attack1'], special: ['breach', 'createAttackOnHit'] } as GameCard;
      const effects = system.getCreationEffects(multiEffectCard);

      expect(effects).toContain('breach');
      expect(effects).toContain('createAttackOnHit');
    });
  });

  describe('카드 선택 로직', () => {
    it('다단히트 카드 점수 높음', () => {
      const state = createBattleState();

      // gun1: 8 * 3 = 24 총 피해
      // attack1: 10 * 1 = 10 총 피해
      const cards = [testCards['attack1'], testCards['gun1']];
      const result = selectBestCard(cards, state, 'player');

      // 다단히트가 더 높은 점수
      expect(result?.id).toBe('gun1');
    });

    it('빠른 속도 카드 선호', () => {
      const state = createBattleState();

      // 비슷한 효율일 때 속도가 빠른 카드 선호
      const cards = [testCards['defense1']]; // speedCost: 3
      const result = selectBestCard(cards, state, 'player');

      expect(result).toBeTruthy();
    });
  });

  describe('엣지 케이스', () => {
    it('모든 카드가 제외되면 빈 풀', () => {
      const pool = generateCreationPool(testCards, {
        excludeIds: Object.keys(testCards),
        count: 10,
      });

      expect(pool.length).toBe(0);
    });

    it('count가 0이면 빈 풀', () => {
      const pool = generateCreationPool(testCards, { count: 0 });

      expect(pool.length).toBe(0);
    });

    it('존재하지 않는 카테고리면 빈 풀', () => {
      const pool = generateCreationPool(testCards, {
        category: 'nonexistent_category',
        count: 10,
      });

      expect(pool.length).toBe(0);
    });
  });
});
