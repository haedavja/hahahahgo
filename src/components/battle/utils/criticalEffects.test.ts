/**
 * @file criticalEffects.test.js
 * @description 치명타 효과 처리 테스트
 *
 * ## 테스트 대상
 * - calculateCritChance: 치명타 확률 계산
 * - rollCritical: 치명타 판정 (랜덤)
 * - getCritKnockback: 치명타 넉백량 계산
 * - applyCriticalDamage: 치명타 데미지 배율 적용
 * - applyCriticalStacks: 치명타 스택 효과
 *
 * ## 주요 테스트 케이스
 * - 기본 치명타 확률 (10%)
 * - 토큰/상징에 의한 확률 증가
 * - 치명타 2배 데미지
 * - Math.random 모킹으로 결정적 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateCritChance,
  rollCritical,
  getCritKnockback,
  applyCriticalDamage,
  applyCriticalStacks
} from './criticalEffects';

describe('criticalEffects', () => {
  describe('calculateCritChance', () => {
    it('기본 치명타 확률은 5%이어야 함', () => {
      const actor = {};
      const result = calculateCritChance(actor, 0);

      expect(result).toBe(5);
    });

    it('힘이 치명타 확률에 반영되어야 함', () => {
      const actor = { strength: 10 };
      const result = calculateCritChance(actor, 0);

      // 5 + 10 = 15
      expect(result).toBe(15);
    });

    it('남은 행동력이 치명타 확률에 반영되어야 함', () => {
      const actor = {};
      const result = calculateCritChance(actor, 5);

      // 5 + 5 = 10
      expect(result).toBe(10);
    });

    it('힘과 행동력이 함께 적용되어야 함', () => {
      const actor = { strength: 3 };
      const result = calculateCritChance(actor, 2);

      // 5 + 3 + 2 = 10
      expect(result).toBe(10);
    });

    it('CRIT_BOOST 토큰이 적용되어야 함', () => {
      const actor = {
        tokens: {
          usage: [],
          turn: [{
            id: 'crit_boost',
            stacks: 2,
            effect: { type: 'CRIT_BOOST', value: 10 }
          }],
          permanent: []
        }
      };
      const result = calculateCritChance(actor as any, 0);

      // 5 + (10 * 2) = 25
      expect(result).toBe(25);
    });

    it('doubleCrit special이 있으면 확률이 2배가 되어야 함', () => {
      const actor = { strength: 5 };
      const card = { special: 'doubleCrit' };
      const result = calculateCritChance(actor, 0, card);

      // (5 + 5) * 2 = 20
      expect(result).toBe(20);
    });

    it('doubleCrit이 배열로 주어져도 작동해야 함', () => {
      const actor = {};
      const card = { special: ['doubleCrit', 'other'] };
      const result = calculateCritChance(actor, 0, card);

      // 5 * 2 = 10
      expect(result).toBe(10);
    });
  });

  describe('rollCritical', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01); // 1%
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('적은 치명타가 발생하지 않아야 함', () => {
      const actor = { strength: 100 };
      const result = rollCritical(actor, 0, null, 'enemy');

      expect(result).toBe(false);
    });

    it('guaranteedCrit special이 있으면 항상 치명타가 발생해야 함', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);
      const actor = {};
      const card = { special: 'guaranteedCrit' };
      const result = rollCritical(actor, 0, card, 'player');

      expect(result).toBe(true);
    });

    it('guaranteedCrit이 배열로 주어져도 작동해야 함', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);
      const actor = {};
      const card = { special: ['guaranteedCrit'] };
      const result = rollCritical(actor, 0, card, 'player');

      expect(result).toBe(true);
    });

    it('battleContext.guaranteedCrit이 true이면 항상 치명타가 발생해야 함', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);
      const actor = {};
      const result = rollCritical(actor, 0, null, 'player', { guaranteedCrit: true });

      expect(result).toBe(true);
    });

    it('확률에 따라 치명타가 발생해야 함', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01); // 1% (5% 미만이므로 치명타)
      const actor = {};
      const result = rollCritical(actor, 0, null, 'player');

      expect(result).toBe(true);
    });

    it('확률을 초과하면 치명타가 발생하지 않아야 함', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.10); // 10% (5% 이상이므로 치명타 아님)
      const actor = {};
      const result = rollCritical(actor, 0, null, 'player');

      expect(result).toBe(false);
    });
  });

  describe('getCritKnockback', () => {
    it('치명타가 아니면 0을 반환해야 함', () => {
      const card = { special: 'critKnockback4' };
      const result = getCritKnockback(card, false);

      expect(result).toBe(0);
    });

    it('카드가 null이면 0을 반환해야 함', () => {
      const result = getCritKnockback(null, true);

      expect(result).toBe(0);
    });

    it('critKnockback4 special이 있으면 4를 반환해야 함', () => {
      const card = { special: ['critKnockback4'] };
      const result = getCritKnockback(card, true);

      expect(result).toBe(4);
    });

    it('넉백 special이 없으면 0을 반환해야 함', () => {
      const card = { special: ['other'] };
      const result = getCritKnockback(card, true);

      expect(result).toBe(0);
    });
  });

  describe('applyCriticalDamage', () => {
    it('치명타가 아니면 원본 피해를 반환해야 함', () => {
      expect(applyCriticalDamage(100, false)).toBe(100);
    });

    it('치명타이면 피해가 2배가 되어야 함', () => {
      expect(applyCriticalDamage(100, true)).toBe(200);
    });

    it('0 피해도 올바르게 처리해야 함', () => {
      expect(applyCriticalDamage(0, true)).toBe(0);
    });

    it('소수점 피해도 처리해야 함', () => {
      expect(applyCriticalDamage(15.5, true)).toBe(31);
    });
  });

  describe('applyCriticalStacks', () => {
    it('치명타가 아니면 원본 스택을 반환해야 함', () => {
      expect(applyCriticalStacks(3, false)).toBe(3);
    });

    it('치명타이면 스택이 1 증가해야 함', () => {
      expect(applyCriticalStacks(3, true)).toBe(4);
    });

    it('0 스택도 올바르게 처리해야 함', () => {
      expect(applyCriticalStacks(0, true)).toBe(1);
    });
  });
});
