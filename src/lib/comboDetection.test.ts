/**
 * @file comboDetection.test.ts
 * @description 포커 조합 감지 시스템 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  detectPokerCombo,
  detectPokerComboDetailed,
  isExcludedFromCombo,
  hasTrait,
  getComboMultiplier,
  compareCombo,
  applyPokerBonus,
  COMBO_MULTIPLIERS,
  type ComboCard,
} from './comboDetection';

describe('comboDetection', () => {
  describe('hasTrait', () => {
    it('특성이 있으면 true', () => {
      const card: ComboCard = { traits: ['SWIFT', 'ARMOR_PIERCING'] };
      expect(hasTrait(card, 'SWIFT')).toBe(true);
    });

    it('특성이 없으면 false', () => {
      const card: ComboCard = { traits: ['SWIFT'] };
      expect(hasTrait(card, 'HEAVY')).toBe(false);
    });

    it('traits가 없는 카드는 false', () => {
      const card: ComboCard = {};
      expect(hasTrait(card, 'SWIFT')).toBe(false);
    });
  });

  describe('isExcludedFromCombo', () => {
    it('outcast 특성 카드는 제외', () => {
      const card: ComboCard = { traits: ['outcast'] };
      expect(isExcludedFromCombo(card)).toBe(true);
    });

    it('유령 카드는 제외', () => {
      const card: ComboCard = { isGhost: true };
      expect(isExcludedFromCombo(card)).toBe(true);
    });

    it('일반 카드는 포함', () => {
      const card: ComboCard = { traits: ['SWIFT'] };
      expect(isExcludedFromCombo(card)).toBe(false);
    });
  });

  describe('detectPokerCombo', () => {
    it('빈 배열은 null 반환', () => {
      expect(detectPokerCombo([])).toBe(null);
    });

    it('null은 null 반환', () => {
      expect(detectPokerCombo(null as never)).toBe(null);
    });

    it('카드 1장은 하이카드', () => {
      const cards: ComboCard[] = [{ actionCost: 1 }];
      const result = detectPokerCombo(cards);
      expect(result?.name).toBe('하이카드');
    });

    describe('페어', () => {
      it('같은 actionCost 2장', () => {
        const cards: ComboCard[] = [
          { actionCost: 2 },
          { actionCost: 2 },
        ];
        const result = detectPokerCombo(cards);
        expect(result?.name).toBe('페어');
        expect(result?.bonusKeys?.has(2)).toBe(true);
      });
    });

    describe('투페어', () => {
      it('페어 2개 (타입 혼합)', () => {
        const cards: ComboCard[] = [
          { actionCost: 1, type: 'attack' },
          { actionCost: 1, type: 'defense' },
          { actionCost: 2, type: 'attack' },
          { actionCost: 2, type: 'defense' },
        ];
        const result = detectPokerCombo(cards);
        expect(result?.name).toBe('투페어');
      });
    });

    describe('트리플', () => {
      it('같은 actionCost 3장', () => {
        const cards: ComboCard[] = [
          { actionCost: 3 },
          { actionCost: 3 },
          { actionCost: 3 },
        ];
        const result = detectPokerCombo(cards);
        expect(result?.name).toBe('트리플');
        expect(result?.bonusKeys?.has(3)).toBe(true);
      });
    });

    describe('플러쉬', () => {
      it('같은 타입(attack) 4장', () => {
        const cards: ComboCard[] = [
          { actionCost: 1, type: 'attack' },
          { actionCost: 2, type: 'attack' },
          { actionCost: 3, type: 'attack' },
          { actionCost: 4, type: 'attack' },
        ];
        const result = detectPokerCombo(cards);
        expect(result?.name).toBe('플러쉬');
      });

      it('같은 타입(defense) 4장', () => {
        const cards: ComboCard[] = [
          { actionCost: 1, type: 'defense' },
          { actionCost: 2, type: 'defense' },
          { actionCost: 3, type: 'defense' },
          { actionCost: 4, type: 'defense' },
        ];
        const result = detectPokerCombo(cards);
        expect(result?.name).toBe('플러쉬');
      });

      it('3장은 플러쉬 아님', () => {
        const cards: ComboCard[] = [
          { actionCost: 1, type: 'attack' },
          { actionCost: 2, type: 'attack' },
          { actionCost: 3, type: 'attack' },
        ];
        const result = detectPokerCombo(cards);
        expect(result?.name).not.toBe('플러쉬');
      });
    });

    describe('풀하우스', () => {
      it('트리플 + 페어', () => {
        const cards: ComboCard[] = [
          { actionCost: 1 },
          { actionCost: 1 },
          { actionCost: 1 },
          { actionCost: 2 },
          { actionCost: 2 },
        ];
        const result = detectPokerCombo(cards);
        expect(result?.name).toBe('풀하우스');
      });
    });

    describe('포카드', () => {
      it('같은 actionCost 4장', () => {
        const cards: ComboCard[] = [
          { actionCost: 1 },
          { actionCost: 1 },
          { actionCost: 1 },
          { actionCost: 1 },
        ];
        const result = detectPokerCombo(cards);
        expect(result?.name).toBe('포카드');
        expect(result?.bonusKeys?.has(1)).toBe(true);
      });
    });

    describe('파이브카드', () => {
      it('같은 actionCost 5장', () => {
        const cards: ComboCard[] = [
          { actionCost: 2 },
          { actionCost: 2 },
          { actionCost: 2 },
          { actionCost: 2 },
          { actionCost: 2 },
        ];
        const result = detectPokerCombo(cards);
        expect(result?.name).toBe('파이브카드');
      });
    });

    describe('outcast 카드 제외', () => {
      it('outcast 카드는 조합에서 제외', () => {
        const cards: ComboCard[] = [
          { actionCost: 1 },
          { actionCost: 1 },
          { actionCost: 1, traits: ['outcast'] }, // 제외됨
        ];
        const result = detectPokerCombo(cards);
        expect(result?.name).toBe('페어'); // 트리플이 아닌 페어
      });
    });

    describe('유령 카드 제외', () => {
      it('isGhost 카드는 조합에서 제외', () => {
        const cards: ComboCard[] = [
          { actionCost: 1 },
          { actionCost: 1 },
          { actionCost: 1, isGhost: true }, // 제외됨
        ];
        const result = detectPokerCombo(cards);
        expect(result?.name).toBe('페어');
      });
    });
  });

  describe('detectPokerComboDetailed', () => {
    it('상세 결과 반환', () => {
      const cards: ComboCard[] = [
        { actionCost: 1 },
        { actionCost: 1 },
        { actionCost: 1 },
      ];
      const result = detectPokerComboDetailed(cards);
      expect(result?.name).toBe('트리플');
      expect(result?.multiplier).toBe(COMBO_MULTIPLIERS['트리플']);
      expect(result?.rank).toBe(3);
      expect(result?.description).toBeDefined();
    });

    it('빈 배열은 null', () => {
      expect(detectPokerComboDetailed([])).toBe(null);
    });
  });

  describe('getComboMultiplier', () => {
    it('하이카드 배율 1x', () => {
      expect(getComboMultiplier('하이카드')).toBe(1);
    });

    it('페어 배율 2x', () => {
      expect(getComboMultiplier('페어')).toBe(2);
    });

    it('투페어 배율 2.5x', () => {
      expect(getComboMultiplier('투페어')).toBe(2.5);
    });

    it('트리플 배율 3x', () => {
      expect(getComboMultiplier('트리플')).toBe(3);
    });

    it('플러쉬 배율 3.5x', () => {
      expect(getComboMultiplier('플러쉬')).toBe(3.5);
    });

    it('풀하우스 배율 3.75x', () => {
      expect(getComboMultiplier('풀하우스')).toBe(3.75);
    });

    it('포카드 배율 4x', () => {
      expect(getComboMultiplier('포카드')).toBe(4);
    });

    it('파이브카드 배율 5x', () => {
      expect(getComboMultiplier('파이브카드')).toBe(5);
    });
  });

  describe('compareCombo', () => {
    it('파이브카드 > 포카드', () => {
      expect(compareCombo('파이브카드', '포카드')).toBeGreaterThan(0);
    });

    it('트리플 < 플러쉬', () => {
      expect(compareCombo('트리플', '플러쉬')).toBeLessThan(0);
    });

    it('같은 조합은 0', () => {
      expect(compareCombo('페어', '페어')).toBe(0);
    });
  });

  describe('applyPokerBonus', () => {
    it('카드에 _combo 태그 추가', () => {
      const cards: ComboCard[] = [
        { actionCost: 1 },
        { actionCost: 1 },
        { actionCost: 1 },
      ];
      const combo = detectPokerCombo(cards);
      const result = applyPokerBonus(cards, combo);
      // 조합에 포함된 카드에 _combo 태그가 추가됨
      expect(result.length).toBe(3);
      result.forEach(card => {
        expect((card as ComboCard & { _combo?: string })._combo).toBe('트리플');
      });
    });

    it('조합 없으면 원래 카드 반환', () => {
      const cards: ComboCard[] = [{ actionCost: 1 }];
      const result = applyPokerBonus(cards, null);
      expect(result).toBe(cards);
    });
  });

  describe('조합 우선순위', () => {
    it('포카드가 풀하우스보다 우선', () => {
      // 4장 같은 카드 + 1장 다른 카드
      const cards: ComboCard[] = [
        { actionCost: 1 },
        { actionCost: 1 },
        { actionCost: 1 },
        { actionCost: 1 },
        { actionCost: 2 },
      ];
      const result = detectPokerCombo(cards);
      expect(result?.name).toBe('포카드');
    });

    it('풀하우스가 플러쉬보다 우선', () => {
      // 트리플 + 페어이면서 모두 attack 타입
      const cards: ComboCard[] = [
        { actionCost: 1, type: 'attack' },
        { actionCost: 1, type: 'attack' },
        { actionCost: 1, type: 'attack' },
        { actionCost: 2, type: 'attack' },
        { actionCost: 2, type: 'attack' },
      ];
      const result = detectPokerCombo(cards);
      expect(result?.name).toBe('풀하우스');
    });
  });
});
