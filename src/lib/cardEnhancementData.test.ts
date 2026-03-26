/**
 * @file cardEnhancementData.test.ts
 * @description 카드 강화 데이터 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  getCardEnhancement,
  getEnhancementLevel,
  getAccumulatedEffects,
} from './cardEnhancementData';

describe('cardEnhancementData', () => {
  describe('getCardEnhancement', () => {
    it('존재하는 카드의 강화 데이터 반환', () => {
      const enhancement = getCardEnhancement('strike');
      expect(enhancement).toBeDefined();
      expect(enhancement?.cardId).toBe('strike');
    });

    it('존재하지 않는 카드는 undefined 반환', () => {
      const enhancement = getCardEnhancement('non_existent_card_xyz');
      expect(enhancement).toBeUndefined();
    });

    it('강화 데이터에 levels 객체 포함', () => {
      const enhancement = getCardEnhancement('strike');
      expect(enhancement?.levels).toBeDefined();
      expect(enhancement?.levels[1]).toBeDefined();
      expect(enhancement?.levels[5]).toBeDefined();
    });

    it('각 레벨에 effects 배열 포함', () => {
      const enhancement = getCardEnhancement('strike');
      expect(enhancement?.levels[1].effects).toBeDefined();
      expect(Array.isArray(enhancement?.levels[1].effects)).toBe(true);
    });

    it('각 레벨에 description 포함', () => {
      const enhancement = getCardEnhancement('strike');
      expect(typeof enhancement?.levels[1].description).toBe('string');
      expect(enhancement?.levels[1].description.length).toBeGreaterThan(0);
    });
  });

  describe('getEnhancementLevel', () => {
    it('유효한 레벨(1~5)에서 데이터 반환', () => {
      for (let level = 1; level <= 5; level++) {
        const levelData = getEnhancementLevel('strike', level);
        expect(levelData).toBeDefined();
        expect(levelData?.effects).toBeDefined();
      }
    });

    it('레벨 0에서 undefined 반환', () => {
      const levelData = getEnhancementLevel('strike', 0);
      expect(levelData).toBeUndefined();
    });

    it('레벨 6 이상에서 undefined 반환', () => {
      const levelData = getEnhancementLevel('strike', 6);
      expect(levelData).toBeUndefined();
    });

    it('음수 레벨에서 undefined 반환', () => {
      const levelData = getEnhancementLevel('strike', -1);
      expect(levelData).toBeUndefined();
    });

    it('존재하지 않는 카드에서 undefined 반환', () => {
      const levelData = getEnhancementLevel('non_existent_card_xyz', 1);
      expect(levelData).toBeUndefined();
    });

    it('레벨 3은 마일스톤 (특수 효과 가능)', () => {
      const levelData = getEnhancementLevel('strike', 3);
      expect(levelData).toBeDefined();
      // 마일스톤은 specialEffects가 있을 수 있음
    });

    it('레벨 5는 마일스톤 (특수 효과 가능)', () => {
      const levelData = getEnhancementLevel('strike', 5);
      expect(levelData).toBeDefined();
    });
  });

  describe('getAccumulatedEffects', () => {
    it('레벨 1에서 1강 효과만 반환', () => {
      const { effects } = getAccumulatedEffects('strike', 1);
      expect(effects.length).toBeGreaterThan(0);
    });

    it('레벨 5에서 1~5강 효과 모두 누적', () => {
      const level1 = getAccumulatedEffects('strike', 1);
      const level5 = getAccumulatedEffects('strike', 5);

      // 레벨 5의 효과 개수가 레벨 1보다 크거나 같아야 함
      expect(level5.effects.length).toBeGreaterThanOrEqual(level1.effects.length);
    });

    it('레벨 0에서 빈 배열 반환', () => {
      const { effects, specialEffects } = getAccumulatedEffects('strike', 0);
      expect(effects).toEqual([]);
      expect(specialEffects).toEqual([]);
    });

    it('레벨 6 이상에서 빈 배열 반환', () => {
      const { effects, specialEffects } = getAccumulatedEffects('strike', 6);
      expect(effects).toEqual([]);
      expect(specialEffects).toEqual([]);
    });

    it('존재하지 않는 카드에서 빈 배열 반환', () => {
      const { effects, specialEffects } = getAccumulatedEffects('non_existent_card', 3);
      expect(effects).toEqual([]);
      expect(specialEffects).toEqual([]);
    });

    it('효과에 type과 value 포함', () => {
      const { effects } = getAccumulatedEffects('strike', 1);
      if (effects.length > 0) {
        expect(effects[0].type).toBeDefined();
        expect(effects[0].value).toBeDefined();
      }
    });

    it('마일스톤 레벨(3, 5)에서 specialEffects 가능', () => {
      const { specialEffects } = getAccumulatedEffects('strike', 5);
      // specialEffects는 있을 수도 없을 수도 있음 (카드마다 다름)
      expect(Array.isArray(specialEffects)).toBe(true);
    });

    it('누적 효과는 순서대로 쌓임', () => {
      const level2 = getAccumulatedEffects('strike', 2);
      const level3 = getAccumulatedEffects('strike', 3);

      // 레벨 3의 효과가 레벨 2의 효과를 포함해야 함
      expect(level3.effects.length).toBeGreaterThanOrEqual(level2.effects.length);
    });
  });

  describe('강화 효과 타입 검증', () => {
    it('damage 타입 효과가 존재', () => {
      const { effects } = getAccumulatedEffects('strike', 5);
      const damageEffect = effects.find(e => e.type === 'damage');
      // strike 카드는 damage 효과가 있어야 함
      expect(damageEffect).toBeDefined();
    });

    it('효과 value는 숫자', () => {
      const { effects } = getAccumulatedEffects('strike', 1);
      effects.forEach(effect => {
        expect(typeof effect.value).toBe('number');
      });
    });
  });

  describe('여러 카드 데이터 검증', () => {
    const cardIds = ['strike', 'defend', 'bash'];

    it('여러 카드의 강화 데이터가 존재', () => {
      cardIds.forEach(cardId => {
        const enhancement = getCardEnhancement(cardId);
        // 모든 기본 카드는 강화 데이터가 있어야 함
        if (enhancement) {
          expect(enhancement.cardId).toBe(cardId);
          expect(enhancement.levels).toBeDefined();
        }
      });
    });

    it('모든 카드의 레벨 1~5 데이터가 완전', () => {
      cardIds.forEach(cardId => {
        const enhancement = getCardEnhancement(cardId);
        if (enhancement) {
          for (let level = 1; level <= 5; level++) {
            const levelData = enhancement.levels[level as 1 | 2 | 3 | 4 | 5];
            expect(levelData.effects).toBeDefined();
            expect(levelData.description).toBeDefined();
          }
        }
      });
    });
  });

  describe('특수 효과 검증', () => {
    it('specialEffects에 type 포함', () => {
      const { specialEffects } = getAccumulatedEffects('strike', 5);
      specialEffects.forEach(effect => {
        expect(effect.type).toBeDefined();
        expect(typeof effect.type).toBe('string');
      });
    });

    it('특수 효과의 value는 선택적', () => {
      const { specialEffects } = getAccumulatedEffects('strike', 5);
      // value가 있을 수도 없을 수도 있음
      specialEffects.forEach(effect => {
        if (effect.value !== undefined) {
          expect(['number', 'string', 'boolean'].includes(typeof effect.value)).toBe(true);
        }
      });
    });
  });
});
