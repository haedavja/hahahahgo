/**
 * @file speedQueue.test.ts
 * @description 속도 큐 유틸리티 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  randomPick,
  inflateCards,
  attachInstanceId,
  toAction,
  buildSpeedTimeline,
  cardsFromIds,
} from './speedQueue';
import type { InflatedCard } from '../types';

// Mock CARD_LIBRARY
vi.mock('../data/cards', () => ({
  CARD_LIBRARY: {
    strike: {
      id: 'strike',
      name: '타격',
      speedCost: 4,
      actionCost: 1,
      priority: 'normal',
      tags: ['attack'],
    },
    guard: {
      id: 'guard',
      name: '방어',
      speedCost: 2,
      actionCost: 1,
      priority: 'quick',
      tags: ['defense'],
    },
    slash: {
      id: 'slash',
      name: '베기',
      speedCost: 6,
      actionCost: 2,
      priority: 'slow',
      tags: ['attack'],
    },
    thrust: {
      id: 'thrust',
      name: '찌르기',
      speedCost: 3,
      actionCost: 1,
      priority: 'instant',
      tags: ['attack'],
    },
    heavy: {
      id: 'heavy',
      name: '강타',
      speedCost: 8,
      actionCost: 3,
      priority: 'slow',
      tags: ['attack'],
    },
  },
}));

describe('speedQueue', () => {
  describe('randomPick', () => {
    it('빈 배열에서 선택 시 빈 배열 반환', () => {
      expect(randomPick([], 3)).toEqual([]);
    });

    it('null/undefined에서 빈 배열 반환', () => {
      expect(randomPick(null as unknown as string[], 3)).toEqual([]);
    });

    it('요청 수만큼 요소 선택', () => {
      const list = [1, 2, 3, 4, 5];
      const picked = randomPick(list, 3);
      expect(picked).toHaveLength(3);
    });

    it('중복 없이 선택', () => {
      const list = [1, 2, 3, 4, 5];
      const picked = randomPick(list, 5);
      const unique = new Set(picked);
      expect(unique.size).toBe(5);
    });

    it('배열 크기보다 많이 요청하면 전체 반환', () => {
      const list = [1, 2, 3];
      const picked = randomPick(list, 10);
      expect(picked).toHaveLength(3);
    });

    it('원본 배열 불변', () => {
      const original = [1, 2, 3, 4, 5];
      const copy = [...original];
      randomPick(original, 3);
      expect(original).toEqual(copy);
    });
  });

  describe('inflateCards', () => {
    it('빈 배열 입력 시 빈 배열 반환', () => {
      expect(inflateCards([])).toEqual([]);
    });

    it('undefined 입력 시 빈 배열 반환', () => {
      expect(inflateCards(undefined)).toEqual([]);
    });

    it('유효한 카드 ID를 InflatedCard로 변환', () => {
      const result = inflateCards(['strike']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('strike');
      expect(result[0].name).toBe('타격');
      expect(result[0].speedCost).toBe(4);
    });

    it('priorityWeight 추가', () => {
      const result = inflateCards(['strike', 'guard', 'thrust']);
      
      const strike = result.find(c => c.id === 'strike');
      const guard = result.find(c => c.id === 'guard');
      const thrust = result.find(c => c.id === 'thrust');

      expect(strike?.priorityWeight).toBe(1); // normal
      expect(guard?.priorityWeight).toBe(2);  // quick
      expect(thrust?.priorityWeight).toBe(3); // instant
    });

    it('존재하지 않는 카드 ID는 무시', () => {
      const result = inflateCards(['strike', 'invalid_card', 'guard']);
      expect(result).toHaveLength(2);
      expect(result.map(c => c.id)).toEqual(['strike', 'guard']);
    });

    it('slow 우선순위는 0', () => {
      const result = inflateCards(['slash']);
      expect(result[0].priorityWeight).toBe(0);
    });
  });

  describe('attachInstanceId', () => {
    it('빈 배열 입력 시 빈 배열 반환', () => {
      expect(attachInstanceId([])).toEqual([]);
    });

    it('각 카드에 instanceId 추가', () => {
      const cards: InflatedCard[] = [
        { id: 'strike', name: '타격', speedCost: 4, actionCost: 1, priorityWeight: 1 } as InflatedCard,
        { id: 'guard', name: '방어', speedCost: 2, actionCost: 1, priorityWeight: 2 } as InflatedCard,
      ];
      const result = attachInstanceId(cards);

      expect(result).toHaveLength(2);
      expect(result[0].instanceId).toContain('strike-');
      expect(result[1].instanceId).toContain('guard-');
    });

    it('원본 카드 불변', () => {
      const cards: InflatedCard[] = [
        { id: 'strike', name: '타격', speedCost: 4, actionCost: 1, priorityWeight: 1 } as InflatedCard,
      ];
      const result = attachInstanceId(cards);
      expect(result[0]).not.toBe(cards[0]);
      expect(cards[0]).not.toHaveProperty('instanceId');
    });
  });

  describe('toAction', () => {
    it('카드를 TimelineAction으로 변환', () => {
      const card: InflatedCard = {
        id: 'strike',
        name: '타격',
        speedCost: 4,
        actionCost: 1,
        priorityWeight: 1,
        priority: 'normal',
        tags: ['attack'],
      } as InflatedCard;

      const action = toAction('player', card);

      expect(action.actor).toBe('player');
      expect(action.cardId).toBe('strike');
      expect(action.name).toBe('타격');
      expect(action.speedCost).toBe(4);
      expect(action.actionCost).toBe(1);
      expect(action.priorityWeight).toBe(1);
      expect(action.priority).toBe('normal');
      expect(action.tags).toEqual(['attack']);
      expect(action.roll).toBeGreaterThanOrEqual(0);
      expect(action.roll).toBeLessThan(1);
    });

    it('enemy 액터로 변환', () => {
      const card: InflatedCard = {
        id: 'guard',
        name: '방어',
        speedCost: 2,
        actionCost: 1,
        priorityWeight: 2,
      } as InflatedCard;

      const action = toAction('enemy', card);
      expect(action.actor).toBe('enemy');
    });

    it('기본값 적용', () => {
      const card = { id: 'test', name: '테스트' } as InflatedCard;
      const action = toAction('player', card);

      expect(action.speedCost).toBe(5);     // 기본값
      expect(action.priorityWeight).toBe(1); // 기본값
      expect(action.priority).toBe('normal'); // 기본값
      expect(action.actionCost).toBe(1);     // 기본값
      expect(action.tags).toEqual([]);       // 기본값
    });
  });

  describe('buildSpeedTimeline', () => {
    beforeEach(() => {
      // Math.random 고정 (결정적 테스트)
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('빈 입력 시 빈 타임라인 반환', () => {
      const timeline = buildSpeedTimeline([], []);
      expect(timeline).toEqual([]);
    });

    it('speedCost 순으로 정렬', () => {
      const playerCards = inflateCards(['slash']);   // speedCost: 6
      const enemyCards = inflateCards(['strike']);   // speedCost: 4

      const timeline = buildSpeedTimeline(playerCards, enemyCards);

      expect(timeline[0].cardId).toBe('strike'); // 4가 먼저
      expect(timeline[1].cardId).toBe('slash');  // 6이 나중
    });

    it('같은 speedCost면 priorityWeight로 정렬', () => {
      const card1: InflatedCard = { id: 'c1', name: 'C1', speedCost: 4, priorityWeight: 1 } as InflatedCard;
      const card2: InflatedCard = { id: 'c2', name: 'C2', speedCost: 4, priorityWeight: 3 } as InflatedCard;

      const timeline = buildSpeedTimeline([card1], [card2]);

      expect(timeline[0].cardId).toBe('c2'); // 높은 우선순위 먼저
      expect(timeline[1].cardId).toBe('c1');
    });

    it('maxTU 초과 카드 제외', () => {
      const playerCards = inflateCards(['heavy']); // speedCost: 8
      const enemyCards = inflateCards(['strike']); // speedCost: 4

      const timeline = buildSpeedTimeline(playerCards, enemyCards, 10);

      // 4 + 8 = 12 > 10이므로 heavy는 제외
      expect(timeline).toHaveLength(1);
      expect(timeline[0].cardId).toBe('strike');
    });

    it('order와 tu 필드 추가', () => {
      const playerCards = inflateCards(['guard', 'strike']);  // 2, 4
      const timeline = buildSpeedTimeline(playerCards, []);

      expect(timeline[0].order).toBe(1);
      expect(timeline[0].tu).toBe(2);
      expect(timeline[1].order).toBe(2);
      expect(timeline[1].tu).toBe(6); // 2 + 4
    });

    it('플레이어와 적 카드 혼합', () => {
      const playerCards = inflateCards(['strike']); // 4
      const enemyCards = inflateCards(['guard']);   // 2

      const timeline = buildSpeedTimeline(playerCards, enemyCards);

      expect(timeline[0].actor).toBe('enemy');
      expect(timeline[0].cardId).toBe('guard');
      expect(timeline[1].actor).toBe('player');
      expect(timeline[1].cardId).toBe('strike');
    });
  });

  describe('cardsFromIds', () => {
    it('inflateCards의 별칭', () => {
      const result1 = inflateCards(['strike', 'guard']);
      const result2 = cardsFromIds(['strike', 'guard']);

      expect(result1).toEqual(result2);
    });

    it('빈 배열/undefined 처리', () => {
      expect(cardsFromIds([])).toEqual([]);
      expect(cardsFromIds(undefined)).toEqual([]);
    });
  });
});
