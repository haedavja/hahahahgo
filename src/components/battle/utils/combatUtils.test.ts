/**
 * @file combatUtils.test.js
 * @description 전투 유틸리티 함수 테스트
 *
 * ## 테스트 대상
 * - sortCombinedOrderStablePF: 플레이어/적 액션 안정 정렬
 * - addEther: 에테르 슬롯에 값 추가
 * - etherSlots: 에테르 슬롯 초기화
 *
 * ## 주요 테스트 케이스
 * - sp 기준 오름차순 정렬
 * - 같은 sp일 때 원래 순서 유지 (안정 정렬)
 * - 에테르 값 누적
 * - 슬롯 인덱스 범위 처리
 */

import { describe, it, expect } from 'vitest';
import { sortCombinedOrderStablePF, addEther, etherSlots } from './combatUtils';

describe('combatUtils', () => {
  describe('sortCombinedOrderStablePF', () => {
    it('빈 배열은 빈 결과를 반환해야 함', () => {
      const result = sortCombinedOrderStablePF([], [], 0, 0);

      expect(result).toEqual([]);
    });

    it('플레이어 카드만 있을 때 속도 순으로 정렬해야 함', () => {
      const playerCards = [
        { speedCost: 5 },
        { speedCost: 3 }
      ] as any;

      const result = sortCombinedOrderStablePF(playerCards, [], 0, 0);

      expect(result).toHaveLength(2);
      expect(result[0].sp).toBe(5);
      expect(result[1].sp).toBe(8);
    });

    it('적 카드만 있을 때 속도 순으로 정렬해야 함', () => {
      const enemyCards = [
        { speedCost: 4 },
        { speedCost: 2 }
      ] as any;

      const result = sortCombinedOrderStablePF([], enemyCards, 0, 0);

      expect(result).toHaveLength(2);
      expect(result[0].sp).toBe(4);
      expect(result[1].sp).toBe(6);
    });

    it('플레이어와 적 카드를 sp 순으로 정렬해야 함', () => {
      const playerCards = [{ speedCost: 5 }] as any[];
      const enemyCards = [{ speedCost: 3 }] as any[];

      const result = sortCombinedOrderStablePF(playerCards, enemyCards, 0, 0);

      // 적(sp=3)이 플레이어(sp=5)보다 먼저
      expect(result[0].actor).toBe('enemy');
      expect(result[0].sp).toBe(3);
      expect(result[1].actor).toBe('player');
      expect(result[1].sp).toBe(5);
    });

    it('같은 sp일 때 플레이어가 우선되어야 함', () => {
      const playerCards = [{ speedCost: 5 }] as any[];
      const enemyCards = [{ speedCost: 5 }] as any[];

      const result = sortCombinedOrderStablePF(playerCards, enemyCards, 0, 0);

      expect(result[0].actor).toBe('player');
      expect(result[1].actor).toBe('enemy');
    });

    it('같은 sp, 같은 actor일 때 idx 순으로 정렬해야 함', () => {
      const playerCards = [
        { speedCost: 3 },
        { speedCost: 2 }
      ] as any[];

      const result = sortCombinedOrderStablePF(playerCards, [], 0, 0);

      // 첫 번째 카드: sp=3, 두 번째 카드: sp=5
      expect(result[0].sp).toBe(3);
      expect(result[0].idx).toBe(0);
      expect(result[1].sp).toBe(5);
      expect(result[1].idx).toBe(1);
    });

    it('플레이어 민첩이 적용되어야 함', () => {
      const playerCards = [{ speedCost: 10 }] as any[];
      const playerAgility = 3;

      const result = sortCombinedOrderStablePF(playerCards, [], playerAgility, 0);

      // 10 - 3 = 7
      expect(result[0].sp).toBe(7);
      expect(result[0].finalSpeed).toBe(7);
      expect(result[0].originalSpeed).toBe(10);
    });

    it('적 민첩이 적용되어야 함', () => {
      const enemyCards = [{ speedCost: 10 }] as any[];
      const enemyAgility = 2;

      const result = sortCombinedOrderStablePF([], enemyCards, 0, enemyAgility);

      // 10 - 2 = 8
      expect(result[0].sp).toBe(8);
      expect(result[0].finalSpeed).toBe(8);
    });

    it('null 배열은 빈 배열로 처리되어야 함', () => {
      const result = sortCombinedOrderStablePF(null, null, 0, 0);

      expect(result).toEqual([]);
    });

    it('복잡한 시나리오에서 올바른 순서를 반환해야 함', () => {
      const playerCards = [
        { speedCost: 6 },  // sp=6
        { speedCost: 4 }   // sp=10
      ] as any[];
      const enemyCards = [
        { speedCost: 8 },  // sp=8
        { speedCost: 2 }   // sp=10
      ] as any[];

      const result = sortCombinedOrderStablePF(playerCards, enemyCards, 0, 0);

      // 순서: player(6), enemy(8), player(10), enemy(10)
      // sp=10에서 플레이어 우선
      expect(result[0].sp).toBe(6);
      expect(result[0].actor).toBe('player');
      expect(result[1].sp).toBe(8);
      expect(result[1].actor).toBe('enemy');
      expect(result[2].sp).toBe(10);
      expect(result[2].actor).toBe('player');
      expect(result[3].sp).toBe(10);
      expect(result[3].actor).toBe('enemy');
    });

    it('카드 데이터가 결과에 보존되어야 함', () => {
      const playerCards = [{ speedCost: 5, damage: 10, name: 'Slash' }] as any[];

      const result = sortCombinedOrderStablePF(playerCards, [], 0, 0);

      expect(result[0].card.damage).toBe(10);
      expect(result[0].card.name).toBe('Slash');
    });
  });

  describe('addEther', () => {
    it('두 값을 더해야 함', () => {
      expect(addEther(100, 50)).toBe(150);
    });

    it('첫 번째 값이 null이면 0으로 처리해야 함', () => {
      expect(addEther(null as any, 50)).toBe(50);
    });

    it('두 번째 값이 null이면 0으로 처리해야 함', () => {
      expect(addEther(100, null as any)).toBe(100);
    });

    it('두 값 모두 null이면 0을 반환해야 함', () => {
      expect(addEther(null as any, null as any)).toBe(0);
    });

    it('undefined도 0으로 처리해야 함', () => {
      expect(addEther(undefined as any, 50)).toBe(50);
      expect(addEther(100, undefined as any)).toBe(100);
    });

    it('음수 값도 처리해야 함', () => {
      expect(addEther(100, -30)).toBe(70);
    });
  });

  describe('etherSlots', () => {
    it('calculateEtherSlots 함수를 호출해야 함', () => {
      const mockCalculate = (pts: number) => Math.floor(pts / 100);

      expect(etherSlots(250, mockCalculate)).toBe(2);
      expect(etherSlots(500, mockCalculate)).toBe(5);
    });

    it('null pts는 0으로 처리해야 함', () => {
      const mockCalculate = (pts: number) => pts;

      expect(etherSlots(null as any, mockCalculate)).toBe(0);
    });

    it('undefined pts는 0으로 처리해야 함', () => {
      const mockCalculate = (pts: number) => pts;

      expect(etherSlots(undefined as any, mockCalculate)).toBe(0);
    });
  });
});
