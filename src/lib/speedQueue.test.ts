/**
 * @file speedQueue.test.js
 * @description speedQueue 함수 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { inflateCards, buildSpeedTimeline, cardsFromIds, drawHand, createTurnPreview, randomPick, attachInstanceId, toAction } from './speedQueue';

// Math.random 고정
beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('speedQueue', () => {
  describe('inflateCards', () => {
    it('빈 배열은 빈 배열을 반환해야 함', () => {
      expect(inflateCards([])).toEqual([]);
    });

    it('undefined는 빈 배열을 반환해야 함', () => {
      expect(inflateCards()).toEqual([]);
    });

    it('유효한 카드 ID를 카드 객체로 변환해야 함', () => {
      const result = inflateCards(['shoot', 'marche']);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('shoot');
      expect(result[0].name).toBe('사격');
      expect(result[1].id).toBe('marche');
    });

    it('존재하지 않는 카드 ID는 필터링되어야 함', () => {
      const result = inflateCards(['shoot', 'nonexistent', 'marche']);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('shoot');
      expect(result[1].id).toBe('marche');
    });

    it('priorityWeight가 추가되어야 함', () => {
      const result = inflateCards(['shoot', 'lunge']);

      // 모든 카드는 priority: "normal" → weight 1
      expect(result[0].priorityWeight).toBe(1);
      expect(result[1].priorityWeight).toBe(1);
    });
  });

  describe('buildSpeedTimeline', () => {
    it('빈 카드 배열은 빈 타임라인을 반환해야 함', () => {
      const result = buildSpeedTimeline([] as any, [] as any);
      expect(result).toEqual([]);
    });

    it('속도 순으로 정렬되어야 함', () => {
      const playerCards = [
        { id: 'slow', name: 'Slow', speedCost: 10, priorityWeight: 1 } as any,
        { id: 'fast', name: 'Fast', speedCost: 3, priorityWeight: 1 } as any
      ];
      const enemyCards = [
        { id: 'medium', name: 'Medium', speedCost: 5, priorityWeight: 1 } as any
      ];

      const result = buildSpeedTimeline(playerCards, enemyCards);

      expect(result[0].cardId).toBe('fast');    // 3
      expect(result[1].cardId).toBe('medium');  // 5
      expect(result[2].cardId).toBe('slow');    // 10
    });

    it('같은 속도면 priorityWeight로 정렬되어야 함', () => {
      const playerCards = [
        { id: 'quick', name: 'Quick', speedCost: 5, priorityWeight: 2, priority: 'quick' } as any,
        { id: 'slow', name: 'Slow', speedCost: 5, priorityWeight: 0, priority: 'slow' } as any
      ];
      const enemyCards = [] as any;

      const result = buildSpeedTimeline(playerCards, enemyCards);

      expect(result[0].cardId).toBe('quick');  // priorityWeight 2
      expect(result[1].cardId).toBe('slow');   // priorityWeight 0
    });

    it('maxTU를 초과하는 카드는 제외되어야 함', () => {
      const playerCards = [
        { id: 'fast', name: 'Fast', speedCost: 5, priorityWeight: 1 } as any,
        { id: 'slow', name: 'Slow', speedCost: 10, priorityWeight: 1 } as any
      ];
      const enemyCards = [] as any;

      const result = buildSpeedTimeline(playerCards, enemyCards, 10);

      // fast (5) + slow (10) = 15 > 10 이므로 slow는 제외
      expect(result).toHaveLength(1);
      expect(result[0].cardId).toBe('fast');
    });

    it('order와 tu가 올바르게 계산되어야 함', () => {
      const playerCards = [
        { id: 'a', name: 'A', speedCost: 3, priorityWeight: 1 } as any,
        { id: 'b', name: 'B', speedCost: 5, priorityWeight: 1 } as any
      ];
      const enemyCards = [] as any;

      const result = buildSpeedTimeline(playerCards, enemyCards);

      expect(result[0].order).toBe(1);
      expect(result[0].tu).toBe(3);
      expect(result[1].order).toBe(2);
      expect(result[1].tu).toBe(8); // 3 + 5
    });

    it('actor가 올바르게 설정되어야 함', () => {
      const playerCards = [{ id: 'a', name: 'A', speedCost: 3, priorityWeight: 1 } as any];
      const enemyCards = [{ id: 'b', name: 'B', speedCost: 5, priorityWeight: 1 } as any];

      const result = buildSpeedTimeline(playerCards, enemyCards);

      expect(result[0].actor).toBe('player');
      expect(result[1].actor).toBe('enemy');
    });

    it('tags가 보존되어야 함', () => {
      const playerCards = [
        { id: 'a', name: 'A', speedCost: 3, priorityWeight: 1, tags: ['melee', 'quick'] } as any
      ];
      const enemyCards = [] as any;

      const result = buildSpeedTimeline(playerCards, enemyCards);

      expect(result[0].tags).toEqual(['melee', 'quick']);
    });

    it('누락된 값에 기본값이 적용되어야 함', () => {
      const playerCards = [{ id: 'a', name: 'A' } as any]; // speedCost, priorityWeight 누락
      const enemyCards = [] as any;

      const result = buildSpeedTimeline(playerCards, enemyCards);

      expect(result[0].speedCost).toBe(5);        // 기본값
      expect(result[0].priorityWeight).toBe(1);   // 기본값
      expect(result[0].priority).toBe('normal');  // 기본값
      expect(result[0].actionCost).toBe(1);       // 기본값
      expect(result[0].tags).toEqual([]);         // 기본값
    });
  });

  describe('cardsFromIds', () => {
    it('inflateCards와 동일하게 동작해야 함', () => {
      const result = cardsFromIds(['shoot', 'marche']);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('shoot');
      expect(result[1].id).toBe('marche');
    });

    it('빈 배열/undefined에 대해 빈 배열을 반환해야 함', () => {
      expect(cardsFromIds([])).toEqual([]);
      expect(cardsFromIds()).toEqual([]);
    });
  });

  describe('drawHand', () => {
    it('덱에서 카드를 뽑아 손패를 생성해야 함', () => {
      const deck = ['quick_slash', 'guard', 'heavy_strike'];
      const result = drawHand(deck, 2);

      expect(result.length).toBeLessThanOrEqual(2);
      result.forEach((card) => {
        expect(card.instanceId).toBeDefined();
        expect(card.id).toBeDefined();
      });
    });

    it('빈 덱에서는 빈 손패를 반환해야 함', () => {
      const result = drawHand([], 3);
      expect(result).toEqual([]);
    });

    it('요청한 수보다 덱이 작으면 덱의 모든 카드를 반환해야 함', () => {
      const deck = ['quick_slash'];
      const result = drawHand(deck, 3);

      expect(result.length).toBeLessThanOrEqual(1);
    });

    it('각 카드에 고유한 instanceId가 부여되어야 함', () => {
      const deck = ['quick_slash', 'guard'];
      const result = drawHand(deck, 2);

      if (result.length >= 2) {
        expect(result[0].instanceId).not.toBe(result[1].instanceId);
      }
    });
  });

  describe('randomPick', () => {
    it('빈 배열은 빈 배열을 반환해야 함', () => {
      expect(randomPick([], 3)).toEqual([]);
    });

    it('null/undefined는 빈 배열을 반환해야 함', () => {
      expect(randomPick(null as any, 3)).toEqual([]);
      expect(randomPick(undefined as any, 3)).toEqual([]);
    });

    it('요청한 개수만큼 요소를 반환해야 함', () => {
      const list = [1, 2, 3, 4, 5];
      const result = randomPick(list, 3);
      expect(result).toHaveLength(3);
    });

    it('배열 크기보다 많이 요청하면 배열 전체를 반환해야 함', () => {
      const list = [1, 2];
      const result = randomPick(list, 5);
      expect(result).toHaveLength(2);
    });

    it('원본 배열을 변경하지 않아야 함', () => {
      const list = [1, 2, 3];
      randomPick(list, 2);
      expect(list).toEqual([1, 2, 3]);
    });
  });

  describe('attachInstanceId', () => {
    it('빈 배열은 빈 배열을 반환해야 함', () => {
      expect(attachInstanceId([])).toEqual([]);
    });

    it('각 카드에 instanceId가 추가되어야 함', () => {
      const cards = [
        { id: 'card1', name: 'Card 1' } as any,
        { id: 'card2', name: 'Card 2' } as any,
      ];
      const result = attachInstanceId(cards);

      expect(result[0].instanceId).toBeDefined();
      expect(result[1].instanceId).toBeDefined();
      expect(result[0].instanceId).toContain('card1-');
      expect(result[1].instanceId).toContain('card2-');
    });

    it('원본 카드 속성이 보존되어야 함', () => {
      const cards = [{ id: 'test', name: 'Test', damage: 5 } as any];
      const result = attachInstanceId(cards);

      expect(result[0].id).toBe('test');
      expect(result[0].name).toBe('Test');
      expect(result[0].damage).toBe(5);
    });
  });

  describe('toAction', () => {
    it('플레이어 카드를 액션으로 변환해야 함', () => {
      const card = {
        id: 'slash',
        name: 'Slash',
        speedCost: 3,
        priorityWeight: 2,
        priority: 'quick' as const,
        actionCost: 1,
        tags: ['melee'],
      } as any;

      const result = toAction('player', card);

      expect(result.actor).toBe('player');
      expect(result.cardId).toBe('slash');
      expect(result.name).toBe('Slash');
      expect(result.speedCost).toBe(3);
      expect(result.priorityWeight).toBe(2);
      expect(result.priority).toBe('quick');
      expect(result.actionCost).toBe(1);
      expect(result.tags).toEqual(['melee']);
      expect(result.roll).toBeDefined();
    });

    it('적 카드를 액션으로 변환해야 함', () => {
      const card = { id: 'attack', name: 'Attack' } as any;
      const result = toAction('enemy', card);

      expect(result.actor).toBe('enemy');
      expect(result.cardId).toBe('attack');
    });

    it('누락된 값에 기본값이 적용되어야 함', () => {
      const card = { id: 'test', name: 'Test' } as any;
      const result = toAction('player', card);

      expect(result.speedCost).toBe(5);
      expect(result.priorityWeight).toBe(1);
      expect(result.priority).toBe('normal');
      expect(result.actionCost).toBe(1);
      expect(result.tags).toEqual([]);
    });
  });

  describe('createTurnPreview', () => {
    it('플레이어와 적의 손패, 타임라인을 생성해야 함', () => {
      const playerDeck = ['quick_slash', 'guard', 'heavy_strike'];
      const enemyDeck = ['quick_slash', 'guard'];
      const result = createTurnPreview(playerDeck, enemyDeck);

      expect(result.playerHand).toBeDefined();
      expect(result.enemyHand).toBeDefined();
      expect(result.timeline).toBeDefined();
      expect(result.tuLimit).toBeDefined();
    });

    it('기본 옵션이 적용되어야 함', () => {
      const playerDeck = ['quick_slash', 'guard', 'heavy_strike'];
      const enemyDeck = ['quick_slash', 'guard'];
      const result = createTurnPreview(playerDeck, enemyDeck);

      expect(result.tuLimit).toBe(30);
    });

    it('커스텀 옵션이 적용되어야 함', () => {
      const playerDeck = ['quick_slash', 'guard', 'heavy_strike'];
      const enemyDeck = ['quick_slash', 'guard'];
      const result = createTurnPreview(playerDeck, enemyDeck, {
        playerHandSize: 2,
        enemyHandSize: 1,
        maxTU: 20,
      });

      expect(result.tuLimit).toBe(20);
    });

    it('빈 덱에서도 동작해야 함', () => {
      const result = createTurnPreview([], []);

      expect(result.playerHand).toEqual([]);
      expect(result.enemyHand).toEqual([]);
      expect(result.timeline).toEqual([]);
    });
  });
});
