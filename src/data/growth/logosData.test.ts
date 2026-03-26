/**
 * @file logosData.test.ts
 * @description 로고스 데이터 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  COMMON_LOGOS,
  GUNKATA_LOGOS,
  BATTLE_WALTZ_LOGOS,
  LOGOS,
  LOGOS_LEVEL_REQUIREMENTS,
  getLogosLevelFromPyramid,
} from './logosData';

describe('logosData', () => {
  describe('COMMON_LOGOS (공용)', () => {
    it('id가 common이다', () => {
      expect(COMMON_LOGOS.id).toBe('common');
    });

    it('3개의 레벨이 있다', () => {
      expect(COMMON_LOGOS.levels.length).toBe(3);
    });

    it('레벨 1: 교차로', () => {
      const level1 = COMMON_LOGOS.levels.find(l => l.level === 1);
      expect(level1?.name).toBe('교차로');
      expect(level1?.effect.type).toBe('expandCrossRange');
    });

    it('레벨 2: 보조특기', () => {
      const level2 = COMMON_LOGOS.levels.find(l => l.level === 2);
      expect(level2?.name).toBe('보조특기');
      expect(level2?.effect.value).toBe(2);
    });

    it('레벨 3: 주특기', () => {
      const level3 = COMMON_LOGOS.levels.find(l => l.level === 3);
      expect(level3?.name).toBe('주특기');
      expect(level3?.effect.value).toBe(1);
    });
  });

  describe('GUNKATA_LOGOS (건카타)', () => {
    it('id가 gunkata이다', () => {
      expect(GUNKATA_LOGOS.id).toBe('gunkata');
    });

    it('총잡이 자아 전용', () => {
      expect(GUNKATA_LOGOS.description).toContain('총잡이');
    });

    it('3개의 레벨이 있다', () => {
      expect(GUNKATA_LOGOS.levels.length).toBe(3);
    });

    it('레벨 1: 반격', () => {
      const level1 = GUNKATA_LOGOS.levels.find(l => l.level === 1);
      expect(level1?.name).toBe('반격');
      expect(level1?.effect.type).toBe('blockToShoot');
    });

    it('레벨 2: 정밀', () => {
      const level2 = GUNKATA_LOGOS.levels.find(l => l.level === 2);
      expect(level2?.name).toBe('정밀');
      expect(level2?.effect.type).toBe('reduceJamChance');
    });

    it('레벨 3: 명중', () => {
      const level3 = GUNKATA_LOGOS.levels.find(l => l.level === 3);
      expect(level3?.name).toBe('명중');
      expect(level3?.effect.type).toBe('critBonus');
    });
  });

  describe('BATTLE_WALTZ_LOGOS (배틀 왈츠)', () => {
    it('id가 battleWaltz이다', () => {
      expect(BATTLE_WALTZ_LOGOS.id).toBe('battleWaltz');
    });

    it('검잡이 자아 전용', () => {
      expect(BATTLE_WALTZ_LOGOS.description).toContain('검잡이');
    });

    it('3개의 레벨이 있다', () => {
      expect(BATTLE_WALTZ_LOGOS.levels.length).toBe(3);
    });

    it('레벨 1: 유지', () => {
      const level1 = BATTLE_WALTZ_LOGOS.levels.find(l => l.level === 1);
      expect(level1?.name).toBe('유지');
      expect(level1?.effect.type).toBe('minFinesse');
    });

    it('레벨 2: 관통', () => {
      const level2 = BATTLE_WALTZ_LOGOS.levels.find(l => l.level === 2);
      expect(level2?.name).toBe('관통');
      expect(level2?.effect.value).toBe(50);
    });

    it('레벨 3: 흐름', () => {
      const level3 = BATTLE_WALTZ_LOGOS.levels.find(l => l.level === 3);
      expect(level3?.name).toBe('흐름');
      expect(level3?.effect.type).toBe('combatTokens');
    });
  });

  describe('LOGOS (전체)', () => {
    it('3종류의 로고스가 있다', () => {
      expect(Object.keys(LOGOS).length).toBe(3);
    });

    it('common 로고스', () => {
      expect(LOGOS.common).toBe(COMMON_LOGOS);
    });

    it('gunkata 로고스', () => {
      expect(LOGOS.gunkata).toBe(GUNKATA_LOGOS);
    });

    it('battleWaltz 로고스', () => {
      expect(LOGOS.battleWaltz).toBe(BATTLE_WALTZ_LOGOS);
    });

    it('각 로고스에 필수 속성이 있다', () => {
      for (const logos of Object.values(LOGOS)) {
        expect(logos).toHaveProperty('id');
        expect(logos).toHaveProperty('name');
        expect(logos).toHaveProperty('description');
        expect(logos).toHaveProperty('levels');
      }
    });
  });

  describe('LOGOS_LEVEL_REQUIREMENTS', () => {
    it('로고스 레벨 1은 피라미드 레벨 3 필요', () => {
      expect(LOGOS_LEVEL_REQUIREMENTS[1]).toBe(3);
    });

    it('로고스 레벨 2는 피라미드 레벨 5 필요', () => {
      expect(LOGOS_LEVEL_REQUIREMENTS[2]).toBe(5);
    });

    it('로고스 레벨 3은 피라미드 레벨 7 필요', () => {
      expect(LOGOS_LEVEL_REQUIREMENTS[3]).toBe(7);
    });
  });

  describe('getLogosLevelFromPyramid', () => {
    it('피라미드 레벨 0이면 로고스 레벨 0', () => {
      expect(getLogosLevelFromPyramid(0)).toBe(0);
    });

    it('피라미드 레벨 1이면 로고스 레벨 0', () => {
      expect(getLogosLevelFromPyramid(1)).toBe(0);
    });

    it('피라미드 레벨 2이면 로고스 레벨 0', () => {
      expect(getLogosLevelFromPyramid(2)).toBe(0);
    });

    it('피라미드 레벨 3이면 로고스 레벨 1', () => {
      expect(getLogosLevelFromPyramid(3)).toBe(1);
    });

    it('피라미드 레벨 4이면 로고스 레벨 1', () => {
      expect(getLogosLevelFromPyramid(4)).toBe(1);
    });

    it('피라미드 레벨 5이면 로고스 레벨 2', () => {
      expect(getLogosLevelFromPyramid(5)).toBe(2);
    });

    it('피라미드 레벨 6이면 로고스 레벨 2', () => {
      expect(getLogosLevelFromPyramid(6)).toBe(2);
    });

    it('피라미드 레벨 7이면 로고스 레벨 3', () => {
      expect(getLogosLevelFromPyramid(7)).toBe(3);
    });

    it('피라미드 레벨 10이면 로고스 레벨 3 (최대)', () => {
      expect(getLogosLevelFromPyramid(10)).toBe(3);
    });
  });

  describe('로고스 효과 타입 테스트', () => {
    it('expandCrossRange 효과', () => {
      const effect = COMMON_LOGOS.levels[0].effect;
      expect(effect.type).toBe('expandCrossRange');
      expect(effect.value).toBe(1);
    });

    it('extraSubSlots 효과', () => {
      const effect = COMMON_LOGOS.levels[1].effect;
      expect(effect.type).toBe('extraSubSlots');
      expect(effect.value).toBe(2);
    });

    it('blockToShoot 효과', () => {
      const effect = GUNKATA_LOGOS.levels[0].effect;
      expect(effect.type).toBe('blockToShoot');
    });

    it('reduceJamChance 효과', () => {
      const effect = GUNKATA_LOGOS.levels[1].effect;
      expect(effect.type).toBe('reduceJamChance');
      expect(effect.value).toBe(2);
    });

    it('minFinesse 효과', () => {
      const effect = BATTLE_WALTZ_LOGOS.levels[0].effect;
      expect(effect.type).toBe('minFinesse');
      expect(effect.value).toBe(1);
    });

    it('armorPenetration 효과', () => {
      const effect = BATTLE_WALTZ_LOGOS.levels[1].effect;
      expect(effect.type).toBe('armorPenetration');
      expect(effect.value).toBe(50);
    });
  });
});
