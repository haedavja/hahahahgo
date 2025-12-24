/**
 * @file cardOrdering.test.js
 * @description cardOrdering 함수 테스트
 */

import { describe, it, expect } from 'vitest';
import { createFixedOrder } from './cardOrdering';

describe('cardOrdering', () => {
  describe('createFixedOrder', () => {
    it('빈 배열은 빈 결과를 반환해야 함', () => {
      const result = createFixedOrder([], [], 0);

      expect(result).toEqual([]);
    });

    it('플레이어 카드만 있을 때 올바르게 처리해야 함', () => {
      const playerCards = [
        { speedCost: 5 },
        { speedCost: 3 }
      ];

      const result = createFixedOrder(playerCards, [], 0);

      expect(result).toHaveLength(2);
      expect(result[0].actor).toBe('player');
      expect(result[0].sp).toBe(5);
      expect(result[1].actor).toBe('player');
      expect(result[1].sp).toBe(8); // 5 + 3 = 8
    });

    it('적 카드만 있을 때 올바르게 처리해야 함', () => {
      const enemyActions = [
        { speedCost: 4 },
        { speedCost: 6 }
      ];

      const result = createFixedOrder([], enemyActions, 0);

      expect(result).toHaveLength(2);
      expect(result[0].actor).toBe('enemy');
      expect(result[0].sp).toBe(4);
      expect(result[1].actor).toBe('enemy');
      expect(result[1].sp).toBe(10); // 4 + 6 = 10
    });

    it('플레이어 카드가 먼저, 적 카드가 나중에 배치되어야 함', () => {
      const playerCards = [{ speedCost: 5 }];
      const enemyActions = [{ speedCost: 3 }];

      const result = createFixedOrder(playerCards, enemyActions, 0);

      expect(result).toHaveLength(2);
      expect(result[0].actor).toBe('player');
      expect(result[1].actor).toBe('enemy');
    });

    it('originalIndex가 올바르게 설정되어야 함', () => {
      const playerCards = [
        { speedCost: 5 },
        { speedCost: 3 },
        { speedCost: 4 }
      ];

      const result = createFixedOrder(playerCards, [], 0);

      expect(result[0].originalIndex).toBe(0);
      expect(result[1].originalIndex).toBe(1);
      expect(result[2].originalIndex).toBe(2);
    });

    it('민첩이 플레이어 카드에만 적용되어야 함', () => {
      const playerCards = [{ speedCost: 10 }];
      const enemyActions = [{ speedCost: 10 }];
      const effectiveAgility = 2; // 속도 20% 감소

      const result = createFixedOrder(playerCards, enemyActions, effectiveAgility);

      // 플레이어: 10 - 2 = 8
      // 적: 10 (민첩 미적용)
      expect(result[0].sp).toBe(8);
      expect(result[0].finalSpeed).toBe(8);
      expect(result[1].sp).toBe(10);
      expect(result[1].finalSpeed).toBe(10);
    });

    it('플레이어와 적의 sp가 독립적으로 누적되어야 함', () => {
      const playerCards = [
        { speedCost: 5 },
        { speedCost: 3 }
      ];
      const enemyActions = [
        { speedCost: 4 },
        { speedCost: 2 }
      ];

      const result = createFixedOrder(playerCards, enemyActions, 0);

      // 플레이어: 5, 8
      expect(result[0].sp).toBe(5);
      expect(result[1].sp).toBe(8);
      // 적: 4, 6
      expect(result[2].sp).toBe(4);
      expect(result[3].sp).toBe(6);
    });

    it('null 적 액션 배열은 빈 배열로 처리되어야 함', () => {
      const playerCards = [{ speedCost: 5 }];

      const result = createFixedOrder(playerCards, null, 0);

      expect(result).toHaveLength(1);
      expect(result[0].actor).toBe('player');
    });

    it('카드 데이터가 결과에 포함되어야 함', () => {
      const playerCards = [
        { speedCost: 5, damage: 10, name: 'Attack' }
      ];

      const result = createFixedOrder(playerCards, [], 0);

      expect(result[0].card.damage).toBe(10);
      expect(result[0].card.name).toBe('Attack');
    });

    it('finalSpeed가 올바르게 계산되어야 함', () => {
      const playerCards = [
        { speedCost: 10 },
        { speedCost: 8 }
      ];
      const effectiveAgility = 3;

      const result = createFixedOrder(playerCards, [], effectiveAgility);

      // 10 - 3 = 7, 8 - 3 = 5
      expect(result[0].finalSpeed).toBe(7);
      expect(result[1].finalSpeed).toBe(5);
    });
  });
});
