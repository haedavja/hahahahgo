/**
 * @file cardOrdering.test.js
 * @description 카드 순서 생성 테스트
 *
 * ## 테스트 대상
 * - createFixedOrder: 플레이어/적 카드를 sp 기준으로 정렬
 *
 * ## 주요 테스트 케이스
 * - 빈 배열 처리
 * - 플레이어/적 카드 혼합 정렬
 * - speedCost → sp 변환 (누적)
 * - 같은 sp일 때 플레이어 우선
 * - 초기 sp 오프셋 적용
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
      ] as any[];

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
      ] as any[];

      const result = createFixedOrder([], enemyActions, 0);

      expect(result).toHaveLength(2);
      expect(result[0].actor).toBe('enemy');
      expect(result[0].sp).toBe(4);
      expect(result[1].actor).toBe('enemy');
      expect(result[1].sp).toBe(10); // 4 + 6 = 10
    });

    it('플레이어 카드가 먼저, 적 카드가 나중에 배치되어야 함', () => {
      const playerCards = [{ speedCost: 5 }] as any[];
      const enemyActions = [{ speedCost: 3 }] as any[];

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
      ] as any[];

      const result = createFixedOrder(playerCards, [], 0);

      expect(result[0].originalIndex).toBe(0);
      expect(result[1].originalIndex).toBe(1);
      expect(result[2].originalIndex).toBe(2);
    });

    it('민첩이 플레이어 카드에만 적용되어야 함', () => {
      const playerCards = [{ speedCost: 10 }] as any[];
      const enemyActions = [{ speedCost: 10 }] as any[];
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
      ] as any[];
      const enemyActions = [
        { speedCost: 4 },
        { speedCost: 2 }
      ] as any[];

      const result = createFixedOrder(playerCards, enemyActions, 0);

      // 플레이어: 5, 8
      expect(result[0].sp).toBe(5);
      expect(result[1].sp).toBe(8);
      // 적: 4, 6
      expect(result[2].sp).toBe(4);
      expect(result[3].sp).toBe(6);
    });

    it('null 적 액션 배열은 빈 배열로 처리되어야 함', () => {
      const playerCards = [{ speedCost: 5 }] as any[];

      const result = createFixedOrder(playerCards, null, 0);

      expect(result).toHaveLength(1);
      expect(result[0].actor).toBe('player');
    });

    it('카드 데이터가 결과에 포함되어야 함', () => {
      const playerCards = [
        { speedCost: 5, damage: 10, name: 'Attack' }
      ] as any[];

      const result = createFixedOrder(playerCards, [], 0);

      expect(result[0].card.damage).toBe(10);
      expect(result[0].card.name).toBe('Attack');
    });

    it('finalSpeed가 올바르게 계산되어야 함', () => {
      const playerCards = [
        { speedCost: 10 },
        { speedCost: 8 }
      ] as any[];
      const effectiveAgility = 3;

      const result = createFixedOrder(playerCards, [], effectiveAgility);

      // 10 - 3 = 7, 8 - 3 = 5
      expect(result[0].finalSpeed).toBe(7);
      expect(result[1].finalSpeed).toBe(5);
    });

    describe('여유 특성', () => {
      it('leisurePosition이 있으면 해당 값을 속도로 사용해야 함', () => {
        const playerCards = [
          { speedCost: 8, traits: ['leisure'], leisurePosition: 12 }
        ] as any[];

        const result = createFixedOrder(playerCards, [], 0);

        // leisurePosition 12를 사용
        expect(result[0].sp).toBe(12);
        expect(result[0].finalSpeed).toBe(12);
      });

      it('leisurePosition이 없으면 기본 속도를 사용해야 함', () => {
        const playerCards = [
          { speedCost: 8, traits: ['leisure'] }
        ] as any[];

        const result = createFixedOrder(playerCards, [], 0);

        expect(result[0].sp).toBe(8);
      });

      it('cardGrowth에서 leisure 특성을 확인해야 함', () => {
        const playerCards = [
          { id: 'card1', speedCost: 8, leisurePosition: 14 }
        ] as any[];
        const cardGrowth = {
          card1: { traits: ['leisure'] }
        };

        const result = createFixedOrder(playerCards, [], 0, undefined, cardGrowth);

        expect(result[0].sp).toBe(14);
      });
    });

    describe('무리 특성', () => {
      it('strainOffset이 있으면 속도에서 차감해야 함', () => {
        const playerCards = [
          { speedCost: 10, traits: ['strain'], strainOffset: 3 }
        ] as any[];

        const result = createFixedOrder(playerCards, [], 0);

        // 10 - 3 = 7
        expect(result[0].sp).toBe(7);
        expect(result[0].finalSpeed).toBe(7);
      });

      it('strainOffset이 없으면 기본 속도를 사용해야 함', () => {
        const playerCards = [
          { speedCost: 10, traits: ['strain'] }
        ] as any[];

        const result = createFixedOrder(playerCards, [], 0);

        expect(result[0].sp).toBe(10);
      });

      it('최소 속도는 1이어야 함', () => {
        const playerCards = [
          { speedCost: 2, traits: ['strain'], strainOffset: 3 }
        ] as any[];

        const result = createFixedOrder(playerCards, [], 0);

        // 2 - 3 = -1 → 1로 클램프
        expect(result[0].sp).toBe(1);
        expect(result[0].finalSpeed).toBe(1);
      });

      it('cardGrowth에서 strain 특성을 확인해야 함', () => {
        const playerCards = [
          { id: 'card1', speedCost: 10, strainOffset: 2 }
        ] as any[];
        const cardGrowth = {
          card1: { traits: ['strain'] }
        };

        const result = createFixedOrder(playerCards, [], 0, undefined, cardGrowth);

        expect(result[0].sp).toBe(8);
      });
    });

    describe('last 특성', () => {
      it('last 특성이 있는 카드는 플레이어 카드 중 마지막에 배치되어야 함', () => {
        const playerCards = [
          { speedCost: 5, traits: ['last'] },
          { speedCost: 3 },
          { speedCost: 4 }
        ] as any[];

        const result = createFixedOrder(playerCards, [], 0);

        // last 특성 카드가 마지막에 배치되어야 함
        expect(result[0].card.speedCost).toBe(3);
        expect(result[1].card.speedCost).toBe(4);
        expect(result[2].card.speedCost).toBe(5);
        expect(result[2].card.traits).toContain('last');
      });

      it('여러 last 카드의 순서가 유지되어야 함', () => {
        const playerCards = [
          { speedCost: 5, traits: ['last'] },
          { speedCost: 3 },
          { speedCost: 6, traits: ['last'] }
        ] as any[];

        const result = createFixedOrder(playerCards, [], 0);

        // 일반 카드 먼저, last 카드들은 마지막에
        expect(result[0].card.speedCost).toBe(3);
        expect(result[1].card.speedCost).toBe(5);
        expect(result[2].card.speedCost).toBe(6);
      });
    });
  });
});
