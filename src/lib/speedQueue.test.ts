/**
 * @file speedQueue.test.js
 * @description speedQueue 함수 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { inflateCards, buildSpeedTimeline, cardsFromIds } from './speedQueue';

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
      const result = inflateCards(['quick_slash', 'guard']);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('quick_slash');
      expect(result[0].name).toBe('퀵 슬래시');
      expect(result[1].id).toBe('guard');
    });

    it('존재하지 않는 카드 ID는 필터링되어야 함', () => {
      const result = inflateCards(['quick_slash', 'nonexistent', 'guard']);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('quick_slash');
      expect(result[1].id).toBe('guard');
    });

    it('priorityWeight가 추가되어야 함', () => {
      const result = inflateCards(['quick_slash', 'heavy_strike']);

      // quick_slash는 priority: "quick" → weight 2
      expect(result[0].priorityWeight).toBe(2);
      // heavy_strike는 priority: "slow" → weight 0
      expect(result[1].priorityWeight).toBe(0);
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
      const result = cardsFromIds(['quick_slash', 'guard']);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('quick_slash');
      expect(result[1].id).toBe('guard');
    });

    it('빈 배열/undefined에 대해 빈 배열을 반환해야 함', () => {
      expect(cardsFromIds([])).toEqual([]);
      expect(cardsFromIds()).toEqual([]);
    });
  });
});
