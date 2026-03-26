/**
 * @file relics.test.js
 * @description relics 함수 및 상수 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  RELIC_RARITY,
  RELIC_TYPE,
  RELIC_EFFECT,
  RELIC_RARITY_COLORS,
  applyRelicEffects,
  applyRelicComboMultiplier
} from './relics';

describe('relics', () => {
  describe('RELIC_RARITY', () => {
    it('모든 희귀도가 정의되어야 함', () => {
      expect(RELIC_RARITY.COMMON).toBe('common');
      expect(RELIC_RARITY.RARE).toBe('rare');
      expect(RELIC_RARITY.LEGENDARY).toBe('legendary');
      expect(RELIC_RARITY.DEV).toBe('dev');
    });
  });

  describe('RELIC_TYPE', () => {
    it('모든 타입이 정의되어야 함', () => {
      expect(RELIC_TYPE.COMBAT).toBe('combat');
      expect(RELIC_TYPE.EVENT).toBe('event');
      expect(RELIC_TYPE.DUNGEON).toBe('dungeon');
      expect(RELIC_TYPE.GENERAL).toBe('general');
    });
  });

  describe('RELIC_EFFECT', () => {
    it('모든 효과 타입이 정의되어야 함', () => {
      expect(RELIC_EFFECT.ETHER_GAIN_BONUS).toBe('etherGainBonus');
      expect(RELIC_EFFECT.ETHER_GAIN_FLAT).toBe('etherGainFlat');
      expect(RELIC_EFFECT.COMBO_MULTIPLIER_PER_CARD).toBe('comboMultiplierPerCard');
      expect(RELIC_EFFECT.CARD_DAMAGE_BONUS).toBe('cardDamageBonus');
      expect(RELIC_EFFECT.CARD_BLOCK_BONUS).toBe('cardBlockBonus');
      expect(RELIC_EFFECT.EVENT_CHOICE_UNLOCK).toBe('eventChoiceUnlock');
    });
  });

  describe('RELIC_RARITY_COLORS', () => {
    it('각 희귀도에 색상이 정의되어야 함', () => {
      expect(RELIC_RARITY_COLORS[RELIC_RARITY.COMMON]).toBeDefined();
      expect(RELIC_RARITY_COLORS[RELIC_RARITY.RARE]).toBeDefined();
      expect(RELIC_RARITY_COLORS[RELIC_RARITY.LEGENDARY]).toBeDefined();
      expect(RELIC_RARITY_COLORS[RELIC_RARITY.DEV]).toBeDefined();
    });

    it('색상이 hex 형식이어야 함', () => {
      const hexRegex = /^#[0-9a-fA-F]{6}$/;
      expect(RELIC_RARITY_COLORS[RELIC_RARITY.COMMON]).toMatch(hexRegex);
      expect(RELIC_RARITY_COLORS[RELIC_RARITY.RARE]).toMatch(hexRegex);
      expect(RELIC_RARITY_COLORS[RELIC_RARITY.LEGENDARY]).toMatch(hexRegex);
      expect(RELIC_RARITY_COLORS[RELIC_RARITY.DEV]).toMatch(hexRegex);
    });
  });

  describe('applyRelicEffects', () => {
    it('빈 배열은 기본값을 반환해야 함', () => {
      const result = applyRelicEffects([], 'etherGainBonus', 100);
      expect(result).toBe(100);
    });

    it('null은 기본값을 반환해야 함', () => {
      const result = applyRelicEffects(null as any, 'etherGainBonus', 100);
      expect(result).toBe(100);
    });

    it('undefined는 기본값을 반환해야 함', () => {
      const result = applyRelicEffects(undefined as any, 'etherGainBonus', 100);
      expect(result).toBe(100);
    });

    it('존재하지 않는 상징은 무시되어야 함', () => {
      const result = applyRelicEffects(['nonexistent_relic'], 'etherGainBonus', 100);
      expect(result).toBe(100);
    });

    it('정수로 내림되어야 함', () => {
      const result = applyRelicEffects([], 'etherGainBonus', 100);
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('applyRelicComboMultiplier', () => {
    it('빈 배열은 기본 배율을 반환해야 함', () => {
      const result = applyRelicComboMultiplier([], 1.0, 3);
      expect(result).toBe(1.0);
    });

    it('null은 기본 배율을 반환해야 함', () => {
      const result = applyRelicComboMultiplier(null as any, 1.5, 3);
      expect(result).toBe(1.5);
    });

    it('undefined는 기본 배율을 반환해야 함', () => {
      const result = applyRelicComboMultiplier(undefined as any, 1.5, 3);
      expect(result).toBe(1.5);
    });

    it('존재하지 않는 상징은 무시되어야 함', () => {
      const result = applyRelicComboMultiplier(['nonexistent_relic'], 1.0, 5);
      expect(result).toBe(1.0);
    });

    it('카드 수가 0이면 기본 배율을 반환해야 함', () => {
      const result = applyRelicComboMultiplier([], 1.5, 0);
      expect(result).toBe(1.5);
    });
  });
});
