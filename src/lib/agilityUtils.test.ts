/**
 * @file agilityUtils.test.js
 * @description agilityUtils 함수 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  applyAgility,
  applyAgilityToCards,
  getAgilityDescription,
  getAgilityReduction
} from './agilityUtils';

describe('agilityUtils', () => {
  describe('applyAgility', () => {
    it('민첩성 0이면 기본 속도를 반환해야 함', () => {
      expect(applyAgility(10, 0)).toBe(10);
    });

    it('민첩성이 없으면 기본 속도를 반환해야 함', () => {
      expect(applyAgility(10)).toBe(10);
      expect(applyAgility(10, undefined)).toBe(10);
    });

    it('양수 민첩성은 속도를 감소시켜야 함', () => {
      expect(applyAgility(10, 3)).toBe(7);
      expect(applyAgility(10, 5)).toBe(5);
    });

    it('음수 민첩성은 속도를 증가시켜야 함', () => {
      expect(applyAgility(10, -3)).toBe(13);
      expect(applyAgility(5, -5)).toBe(10);
    });

    it('속도는 최소 1이어야 함', () => {
      expect(applyAgility(3, 5)).toBe(1);
      expect(applyAgility(1, 10)).toBe(1);
    });

    it('유효하지 않은 기본 속도는 1을 반환해야 함', () => {
      expect(applyAgility(0, 0)).toBe(1);
      expect(applyAgility(-5, 0)).toBe(1);
      expect(applyAgility(null as any, 0)).toBe(1);
      expect(applyAgility(undefined as any, 0)).toBe(1);
    });
  });

  describe('applyAgilityToCards', () => {
    const createCards = () => [
      { id: 'a', name: 'A', speedCost: 10 } as any,
      { id: 'b', name: 'B', speedCost: 5 } as any,
      { id: 'c', name: 'C', speedCost: 15 } as any
    ];

    it('민첩성 0이면 원본 카드를 반환해야 함', () => {
      const cards = createCards();
      expect(applyAgilityToCards(cards, 0)).toBe(cards);
    });

    it('민첩성이 없으면 원본 카드를 반환해야 함', () => {
      const cards = createCards();
      expect(applyAgilityToCards(cards)).toBe(cards);
    });

    it('빈 배열은 그대로 반환해야 함', () => {
      expect(applyAgilityToCards([] as any, 5)).toEqual([]);
    });

    it('유효하지 않은 입력은 그대로 반환해야 함', () => {
      expect(applyAgilityToCards(null as any, 5)).toBe(null);
      expect(applyAgilityToCards(undefined as any, 5)).toBe(undefined);
    });

    it('양수 민첩성은 모든 카드 속도를 감소시켜야 함', () => {
      const cards = createCards();
      const result = applyAgilityToCards(cards, 3);

      expect(result[0].speedCost).toBe(7);  // 10 - 3
      expect(result[1].speedCost).toBe(2);  // 5 - 3
      expect(result[2].speedCost).toBe(12); // 15 - 3
    });

    it('음수 민첩성은 모든 카드 속도를 증가시켜야 함', () => {
      const cards = createCards();
      const result = applyAgilityToCards(cards, -2);

      expect(result[0].speedCost).toBe(12); // 10 + 2
      expect(result[1].speedCost).toBe(7);  // 5 + 2
      expect(result[2].speedCost).toBe(17); // 15 + 2
    });

    it('원본 배열을 수정하지 않아야 함', () => {
      const cards = createCards();
      applyAgilityToCards(cards, 3);

      expect(cards[0].speedCost).toBe(10);
      expect(cards[1].speedCost).toBe(5);
      expect(cards[2].speedCost).toBe(15);
    });

    it('originalSpeedCost를 보존해야 함', () => {
      const cards = createCards();
      const result = applyAgilityToCards(cards, 3);

      expect(result[0].originalSpeedCost).toBe(10);
      expect(result[1].originalSpeedCost).toBe(5);
      expect(result[2].originalSpeedCost).toBe(15);
    });

    it('이미 originalSpeedCost가 있으면 유지해야 함', () => {
      const cards = [{ id: 'a', speedCost: 7, originalSpeedCost: 10 } as any];
      const result = applyAgilityToCards(cards, 2);

      expect(result[0].originalSpeedCost).toBe(10);
      expect(result[0].speedCost).toBe(5);
    });
  });

  describe('getAgilityDescription', () => {
    it('민첩성 0이면 빈 문자열을 반환해야 함', () => {
      expect(getAgilityDescription(0)).toBe('');
    });

    it('null/undefined면 빈 문자열을 반환해야 함', () => {
      expect(getAgilityDescription(null as any)).toBe('');
      expect(getAgilityDescription(undefined as any)).toBe('');
    });

    it('양수 민첩성은 속도 감소 설명을 반환해야 함', () => {
      expect(getAgilityDescription(3)).toBe('민첩 3 (카드 속도 -3)');
      expect(getAgilityDescription(1)).toBe('민첩 1 (카드 속도 -1)');
    });

    it('음수 민첩성은 속도 증가 설명을 반환해야 함', () => {
      expect(getAgilityDescription(-3)).toBe('민첩 -3 (카드 속도 +3)');
      expect(getAgilityDescription(-1)).toBe('민첩 -1 (카드 속도 +1)');
    });
  });

  describe('getAgilityReduction', () => {
    it('민첩성에 의한 속도 감소량을 반환해야 함', () => {
      expect(getAgilityReduction(10, 3)).toBe(3);
      expect(getAgilityReduction(10, 5)).toBe(5);
    });

    it('음수 민첩성은 음수 감소량(증가)을 반환해야 함', () => {
      expect(getAgilityReduction(10, -3)).toBe(-3);
    });

    it('최소 속도 1 제한으로 인해 실제 감소량은 제한될 수 있음', () => {
      // baseSpeed가 3이고 agility가 5면, 실제 속도는 1 (최소)
      // 따라서 감소량은 3 - 1 = 2
      expect(getAgilityReduction(3, 5)).toBe(2);
    });

    it('기본 속도가 1이면 감소량은 0이어야 함', () => {
      expect(getAgilityReduction(1, 10)).toBe(0);
    });
  });
});
