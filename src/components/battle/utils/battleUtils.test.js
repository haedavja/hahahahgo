/**
 * @file battleUtils.test.js
 * @description battleUtils 함수 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  choice,
  hasTrait,
  applyTraitModifiers,
  applyStrengthToCard,
  applyStrengthToHand,
  getCardRarity
} from './battleUtils';

describe('battleUtils', () => {
  describe('choice', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('배열에서 요소를 선택해야 함', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = choice(arr);

      expect(arr).toContain(result);
    });

    it('단일 요소 배열은 그 요소를 반환해야 함', () => {
      const arr = ['only'];
      expect(choice(arr)).toBe('only');
    });

    it('랜덤 값에 따라 선택해야 함', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      expect(choice([1, 2, 3])).toBe(1);

      vi.spyOn(Math, 'random').mockReturnValue(0.99);
      expect(choice([1, 2, 3])).toBe(3);
    });
  });

  describe('hasTrait', () => {
    it('특성이 있으면 true를 반환해야 함', () => {
      const card = { traits: ['strongbone', 'swift'] };
      expect(hasTrait(card, 'strongbone')).toBe(true);
      expect(hasTrait(card, 'swift')).toBe(true);
    });

    it('특성이 없으면 false를 반환해야 함', () => {
      const card = { traits: ['strongbone'] };
      expect(hasTrait(card, 'weakbone')).toBe(false);
    });

    it('traits 배열이 없으면 falsy를 반환해야 함', () => {
      const card = {};
      expect(hasTrait(card, 'strongbone')).toBeFalsy();
    });

    it('traits가 빈 배열이면 false를 반환해야 함', () => {
      const card = { traits: [] };
      expect(hasTrait(card, 'strongbone')).toBe(false);
    });
  });

  describe('applyTraitModifiers', () => {
    it('특성이 없으면 원본 카드를 반환해야 함', () => {
      const card = { damage: 10, block: 5, speedCost: 3 };
      const result = applyTraitModifiers(card);

      expect(result.damage).toBe(10);
      expect(result.block).toBe(5);
      expect(result.speedCost).toBe(3);
    });

    it('strongbone은 피해/방어를 25% 증가시켜야 함', () => {
      const card = { damage: 10, block: 8, traits: ['strongbone'] };
      const result = applyTraitModifiers(card);

      expect(result.damage).toBe(13); // ceil(10 * 1.25) = 13
      expect(result.block).toBe(10);  // ceil(8 * 1.25) = 10
    });

    it('weakbone은 피해/방어를 20% 감소시켜야 함', () => {
      const card = { damage: 10, block: 10, traits: ['weakbone'] };
      const result = applyTraitModifiers(card);

      expect(result.damage).toBe(8); // ceil(10 * 0.8) = 8
      expect(result.block).toBe(8);  // ceil(10 * 0.8) = 8
    });

    it('destroyer는 피해를 50% 증가시켜야 함', () => {
      const card = { damage: 10, traits: ['destroyer'] };
      const result = applyTraitModifiers(card);

      expect(result.damage).toBe(15); // ceil(10 * 1.5) = 15
    });

    it('slaughter는 피해를 75% 증가시켜야 함', () => {
      const card = { damage: 10, traits: ['slaughter'] };
      const result = applyTraitModifiers(card);

      expect(result.damage).toBe(18); // ceil(10 * 1.75) = 18
    });

    it('pinnacle은 피해를 2.5배 증가시켜야 함', () => {
      const card = { damage: 10, traits: ['pinnacle'] };
      const result = applyTraitModifiers(card);

      expect(result.damage).toBe(25); // ceil(10 * 2.5) = 25
    });

    it('cooperation은 조합일 때만 50% 증가시켜야 함', () => {
      const card = { damage: 10, block: 10, traits: ['cooperation'] };

      // 조합이 아닐 때
      const result1 = applyTraitModifiers(card, { isInCombo: false });
      expect(result1.damage).toBe(10);

      // 조합일 때
      const result2 = applyTraitModifiers(card, { isInCombo: true });
      expect(result2.damage).toBe(15); // ceil(10 * 1.5) = 15
      expect(result2.block).toBe(15);
    });

    it('swift는 속도 코스트를 25% 감소시켜야 함', () => {
      const card = { speedCost: 8, traits: ['swift'] };
      const result = applyTraitModifiers(card);

      expect(result.speedCost).toBe(6); // ceil(8 * 0.75) = 6
    });

    it('swift는 최소 1의 속도 코스트를 유지해야 함', () => {
      const card = { speedCost: 1, traits: ['swift'] };
      const result = applyTraitModifiers(card);

      expect(result.speedCost).toBe(1);
    });

    it('slow는 속도 코스트를 33% 증가시켜야 함', () => {
      const card = { speedCost: 6, traits: ['slow'] };
      const result = applyTraitModifiers(card);

      expect(result.speedCost).toBe(8); // ceil(6 * 1.33) = 8
    });

    it('mastery는 사용 횟수에 따라 속도 코스트를 감소시켜야 함', () => {
      const card = { speedCost: 10, traits: ['mastery'] };

      const result1 = applyTraitModifiers(card, { usageCount: 1 });
      expect(result1.speedCost).toBe(8); // 10 - (1 * 2) = 8

      const result2 = applyTraitModifiers(card, { usageCount: 3 });
      expect(result2.speedCost).toBe(4); // 10 - (3 * 2) = 4
    });

    it('mastery는 최소 1의 속도 코스트를 유지해야 함', () => {
      const card = { speedCost: 5, traits: ['mastery'] };
      const result = applyTraitModifiers(card, { usageCount: 10 });

      expect(result.speedCost).toBe(1);
    });

    it('boredom은 사용 횟수에 따라 속도 코스트를 증가시켜야 함', () => {
      const card = { speedCost: 5, traits: ['boredom'] };

      const result = applyTraitModifiers(card, { usageCount: 2 });
      expect(result.speedCost).toBe(9); // 5 + (2 * 2) = 9
    });

    it('outcast는 행동력을 1 감소시켜야 함', () => {
      const card = { actionCost: 3, traits: ['outcast'] };
      const result = applyTraitModifiers(card);

      expect(result.actionCost).toBe(2);
    });

    it('outcast는 행동력을 0 미만으로 감소시키지 않아야 함', () => {
      const card = { actionCost: 0, traits: ['outcast'] };
      const result = applyTraitModifiers(card);

      expect(result.actionCost).toBe(0);
    });

    it('여러 특성이 동시에 적용되어야 함', () => {
      const card = { damage: 10, speedCost: 8, traits: ['destroyer', 'swift'] };
      const result = applyTraitModifiers(card);

      expect(result.damage).toBe(15); // ceil(10 * 1.5) = 15
      expect(result.speedCost).toBe(6); // ceil(8 * 0.75) = 6
    });
  });

  describe('applyStrengthToCard', () => {
    it('힘이 0이면 원본 카드를 반환해야 함', () => {
      const card = { damage: 10, type: 'attack' };
      const result = applyStrengthToCard(card, 0);

      expect(result.damage).toBe(10);
    });

    it('플레이어 카드가 아니면 원본을 반환해야 함', () => {
      const card = { damage: 10, type: 'attack' };
      const result = applyStrengthToCard(card, 5, false);

      expect(result.damage).toBe(10);
    });

    it('공격 카드에 힘이 적용되어야 함', () => {
      const card = { damage: 10, type: 'attack' };
      const result = applyStrengthToCard(card, 5);

      expect(result.damage).toBe(15);
    });

    it('음수 힘이 적용되어야 함', () => {
      const card = { damage: 10, type: 'attack' };
      const result = applyStrengthToCard(card, -3);

      expect(result.damage).toBe(7);
    });

    it('피해량은 0 미만으로 감소하지 않아야 함', () => {
      const card = { damage: 5, type: 'attack' };
      const result = applyStrengthToCard(card, -10);

      expect(result.damage).toBe(0);
    });

    it('방어 카드에 힘이 적용되어야 함', () => {
      const card = { block: 10, type: 'defense' };
      const result = applyStrengthToCard(card, 3);

      expect(result.block).toBe(13);
    });

    it('general 타입 카드에 방어력 힘이 적용되어야 함', () => {
      const card = { block: 10, type: 'general' };
      const result = applyStrengthToCard(card, 2);

      expect(result.block).toBe(12);
    });

    it('방어력은 0 미만으로 감소하지 않아야 함', () => {
      const card = { block: 5, type: 'defense' };
      const result = applyStrengthToCard(card, -10);

      expect(result.block).toBe(0);
    });
  });

  describe('applyStrengthToHand', () => {
    it('힘이 0이면 원본 손패를 반환해야 함', () => {
      const hand = [
        { damage: 10, type: 'attack' },
        { block: 5, type: 'defense' }
      ];
      const result = applyStrengthToHand(hand, 0);

      expect(result).toBe(hand);
    });

    it('손패의 모든 카드에 힘이 적용되어야 함', () => {
      const hand = [
        { damage: 10, type: 'attack' },
        { damage: 8, type: 'attack' },
        { block: 5, type: 'defense' }
      ];
      const result = applyStrengthToHand(hand, 3);

      expect(result[0].damage).toBe(13);
      expect(result[1].damage).toBe(11);
      expect(result[2].block).toBe(8);
    });

    it('빈 손패는 빈 배열을 반환해야 함', () => {
      const result = applyStrengthToHand([], 5);

      expect(result).toEqual([]);
    });
  });

  describe('getCardRarity', () => {
    it('카드의 희귀도를 반환해야 함', () => {
      expect(getCardRarity({ rarity: 'rare' })).toBe('rare');
      expect(getCardRarity({ rarity: 'legendary' })).toBe('legendary');
    });

    it('희귀도가 없으면 common을 반환해야 함', () => {
      expect(getCardRarity({})).toBe('common');
      expect(getCardRarity({ name: 'Test' })).toBe('common');
    });

    it('null/undefined 카드는 common을 반환해야 함', () => {
      expect(getCardRarity(null)).toBe('common');
      expect(getCardRarity(undefined)).toBe('common');
    });
  });
});
