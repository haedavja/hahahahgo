/**
 * @file reflections.test.ts
 * @description 개성(Personality) 시스템 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  TRAIT_NAME_TO_ID,
  TRAIT_ID_TO_NAME,
  convertTraitsToIds,
  PERSONALITY_TRAITS,
  TRAIT_EFFECT_DESC,
  getPyramidLevelFromTraits,
  getReflectionsByEgos,
  getTraitCountBonus,
} from './reflections';

describe('reflections', () => {
  describe('TRAIT_NAME_TO_ID', () => {
    it('한글 이름을 영어 ID로 매핑한다', () => {
      expect(TRAIT_NAME_TO_ID['용맹함']).toBe('valiant');
      expect(TRAIT_NAME_TO_ID['열정적']).toBe('passionate');
      expect(TRAIT_NAME_TO_ID['냉철함']).toBe('calm');
      expect(TRAIT_NAME_TO_ID['철저함']).toBe('thorough');
      expect(TRAIT_NAME_TO_ID['활력적']).toBe('energetic');
      expect(TRAIT_NAME_TO_ID['굳건함']).toBe('steadfast');
    });

    it('6개의 개성이 정의되어 있다', () => {
      expect(Object.keys(TRAIT_NAME_TO_ID).length).toBe(6);
    });
  });

  describe('TRAIT_ID_TO_NAME', () => {
    it('영어 ID를 한글 이름으로 매핑한다', () => {
      expect(TRAIT_ID_TO_NAME['valiant']).toBe('용맹함');
      expect(TRAIT_ID_TO_NAME['passionate']).toBe('열정적');
      expect(TRAIT_ID_TO_NAME['calm']).toBe('냉철함');
      expect(TRAIT_ID_TO_NAME['thorough']).toBe('철저함');
      expect(TRAIT_ID_TO_NAME['energetic']).toBe('활력적');
      expect(TRAIT_ID_TO_NAME['steadfast']).toBe('굳건함');
    });
  });

  describe('convertTraitsToIds', () => {
    it('한글 개성 배열을 영어 ID 배열로 변환한다', () => {
      const koreanTraits = ['용맹함', '냉철함', '굳건함'];
      const result = convertTraitsToIds(koreanTraits);

      expect(result).toEqual(['valiant', 'calm', 'steadfast']);
    });

    it('null이면 빈 배열 반환', () => {
      expect(convertTraitsToIds(null)).toEqual([]);
    });

    it('undefined면 빈 배열 반환', () => {
      expect(convertTraitsToIds(undefined)).toEqual([]);
    });

    it('배열이 아니면 빈 배열 반환', () => {
      expect(convertTraitsToIds('not_array' as any)).toEqual([]);
    });

    it('존재하지 않는 개성은 필터링된다', () => {
      const koreanTraits = ['용맹함', '없는개성', '냉철함'];
      const result = convertTraitsToIds(koreanTraits);

      expect(result).toEqual(['valiant', 'calm']);
    });

    it('빈 배열은 빈 배열 반환', () => {
      expect(convertTraitsToIds([])).toEqual([]);
    });
  });

  describe('PERSONALITY_TRAITS', () => {
    it('6개의 개성이 정의되어 있다', () => {
      expect(Object.keys(PERSONALITY_TRAITS).length).toBe(6);
    });

    it('각 개성에 필수 속성이 있다', () => {
      for (const trait of Object.values(PERSONALITY_TRAITS)) {
        expect(trait).toHaveProperty('id');
        expect(trait).toHaveProperty('name');
        expect(trait).toHaveProperty('emoji');
        expect(trait).toHaveProperty('description');
        expect(trait).toHaveProperty('statBonus');
      }
    });

    it('용맹함은 힘 보너스', () => {
      expect(PERSONALITY_TRAITS.valiant.statBonus.playerStrength).toBe(1);
    });

    it('열정적은 속도 보너스', () => {
      expect(PERSONALITY_TRAITS.passionate.statBonus.playerMaxSpeedBonus).toBe(5);
    });

    it('냉철함은 통찰 보너스', () => {
      expect(PERSONALITY_TRAITS.calm.statBonus.playerInsight).toBe(1);
    });

    it('철저함은 보조슬롯 보너스', () => {
      expect(PERSONALITY_TRAITS.thorough.statBonus.extraSubSpecialSlots).toBe(1);
    });

    it('활력적은 행동력 보너스', () => {
      expect(PERSONALITY_TRAITS.energetic.statBonus.playerEnergyBonus).toBe(1);
    });

    it('굳건함은 체력 보너스', () => {
      expect(PERSONALITY_TRAITS.steadfast.statBonus.maxHp).toBe(10);
      expect(PERSONALITY_TRAITS.steadfast.statBonus.playerHp).toBe(10);
    });
  });

  describe('TRAIT_EFFECT_DESC', () => {
    it('각 개성의 효과 설명이 있다', () => {
      expect(TRAIT_EFFECT_DESC['용맹함']).toBe('힘 +1');
      expect(TRAIT_EFFECT_DESC['굳건함']).toBe('체력 +10');
      expect(TRAIT_EFFECT_DESC['냉철함']).toBe('통찰 +1');
      expect(TRAIT_EFFECT_DESC['철저함']).toBe('보조슬롯 +1');
      expect(TRAIT_EFFECT_DESC['열정적']).toBe('속도 +5');
      expect(TRAIT_EFFECT_DESC['활력적']).toBe('행동력 +1');
    });
  });

  describe('getPyramidLevelFromTraits', () => {
    it('개성 0개면 레벨 0', () => {
      expect(getPyramidLevelFromTraits(0)).toBe(0);
    });

    it('개성 1개면 레벨 0', () => {
      expect(getPyramidLevelFromTraits(1)).toBe(0);
    });

    it('개성 2개면 레벨 1', () => {
      expect(getPyramidLevelFromTraits(2)).toBe(1);
    });

    it('개성 3개면 레벨 1', () => {
      expect(getPyramidLevelFromTraits(3)).toBe(1);
    });

    it('개성 4개면 레벨 2', () => {
      expect(getPyramidLevelFromTraits(4)).toBe(2);
    });

    it('개성 6개면 레벨 3', () => {
      expect(getPyramidLevelFromTraits(6)).toBe(3);
    });
  });

  describe('getReflectionsByEgos (deprecated)', () => {
    it('항상 빈 배열 반환', () => {
      expect(getReflectionsByEgos(['ego1', 'ego2'])).toEqual([]);
      expect(getReflectionsByEgos([])).toEqual([]);
    });
  });

  describe('getTraitCountBonus (deprecated)', () => {
    it('항상 0 반환', () => {
      expect(getTraitCountBonus(0)).toBe(0);
      expect(getTraitCountBonus(5)).toBe(0);
      expect(getTraitCountBonus(10)).toBe(0);
    });
  });
});
