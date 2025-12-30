/**
 * @file relics.test.ts
 * @description 상징 데이터 및 유틸리티 함수 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  RELIC_RARITIES,
  RELIC_TAGS,
  RELICS,
  getRelicsByRarity,
  getRelicsByTag,
  getRelicById,
  getAllRelics,
} from './relics';

describe('relics data', () => {
  describe('RELIC_RARITIES', () => {
    it('모든 희귀도가 정의되어 있다', () => {
      expect(RELIC_RARITIES.COMMON).toBe('common');
      expect(RELIC_RARITIES.RARE).toBe('rare');
      expect(RELIC_RARITIES.SPECIAL).toBe('special');
      expect(RELIC_RARITIES.LEGENDARY).toBe('legendary');
      expect(RELIC_RARITIES.DEV).toBe('dev');
    });

    it('5개의 희귀도가 있다', () => {
      expect(Object.keys(RELIC_RARITIES)).toHaveLength(5);
    });
  });

  describe('RELIC_TAGS', () => {
    it('모든 태그가 정의되어 있다', () => {
      expect(RELIC_TAGS.ENERGY).toBe('energy');
      expect(RELIC_TAGS.DRAW).toBe('draw');
      expect(RELIC_TAGS.DEFENSE).toBe('defense');
      expect(RELIC_TAGS.HP).toBe('hp');
      expect(RELIC_TAGS.HEAL).toBe('heal');
      expect(RELIC_TAGS.STRENGTH).toBe('strength');
      expect(RELIC_TAGS.AGILITY).toBe('agility');
      expect(RELIC_TAGS.ETHER).toBe('ether');
      expect(RELIC_TAGS.SPEED).toBe('speed');
      expect(RELIC_TAGS.TIMELINE).toBe('timeline');
      expect(RELIC_TAGS.TOKEN).toBe('token');
    });

    it('11개의 태그가 있다', () => {
      expect(Object.keys(RELIC_TAGS)).toHaveLength(11);
    });
  });

  describe('RELICS', () => {
    it('상징이 정의되어 있다', () => {
      expect(Object.keys(RELICS).length).toBeGreaterThan(0);
    });

    it('모든 상징에 필수 속성이 있다', () => {
      Object.values(RELICS).forEach((relic: any) => {
        expect(relic).toHaveProperty('id');
        expect(relic).toHaveProperty('name');
        expect(relic).toHaveProperty('emoji');
        expect(relic).toHaveProperty('rarity');
        expect(relic).toHaveProperty('tags');
        expect(relic).toHaveProperty('description');
        expect(relic).toHaveProperty('effects');
      });
    });

    it('모든 상징의 ID가 key와 일치한다', () => {
      Object.entries(RELICS).forEach(([key, relic]) => {
        expect((relic as any).id).toBe(key);
      });
    });

    it('모든 상징의 tags가 배열이다', () => {
      Object.values(RELICS).forEach((relic: any) => {
        expect(Array.isArray(relic.tags)).toBe(true);
      });
    });

    it('모든 상징의 effects가 type 속성을 가진다', () => {
      Object.values(RELICS).forEach((relic: any) => {
        expect(relic.effects).toHaveProperty('type');
      });
    });
  });

  describe('getRelicById', () => {
    it('존재하는 상징을 반환한다', () => {
      const relic = getRelicById('etherCrystal');
      expect(relic).not.toBeNull();
      expect(relic?.id).toBe('etherCrystal');
      expect(relic?.name).toBe('에테르 수정');
    });

    it('존재하지 않는 상징은 null을 반환한다', () => {
      const relic = getRelicById('nonexistent');
      expect(relic).toBeNull();
    });

    it('빈 문자열은 null을 반환한다', () => {
      const relic = getRelicById('');
      expect(relic).toBeNull();
    });

    it('모든 RELICS의 상징을 ID로 찾을 수 있다', () => {
      Object.keys(RELICS).forEach((id) => {
        const relic = getRelicById(id);
        expect(relic).not.toBeNull();
        expect(relic?.id).toBe(id);
      });
    });
  });

  describe('getAllRelics', () => {
    it('모든 상징을 배열로 반환한다', () => {
      const relics = getAllRelics();
      expect(Array.isArray(relics)).toBe(true);
      expect(relics.length).toBe(Object.keys(RELICS).length);
    });

    it('반환된 배열의 각 요소가 유효한 상징이다', () => {
      const relics = getAllRelics();
      relics.forEach((relic: any) => {
        expect(relic).toHaveProperty('id');
        expect(relic).toHaveProperty('name');
        expect(relic).toHaveProperty('rarity');
      });
    });
  });

  describe('getRelicsByRarity', () => {
    it('일반 등급 상징만 반환한다', () => {
      const relics = getRelicsByRarity(RELIC_RARITIES.COMMON);
      expect(relics.length).toBeGreaterThan(0);
      relics.forEach((relic: any) => {
        expect(relic.rarity).toBe(RELIC_RARITIES.COMMON);
      });
    });

    it('희귀 등급 상징만 반환한다', () => {
      const relics = getRelicsByRarity(RELIC_RARITIES.RARE);
      expect(relics.length).toBeGreaterThan(0);
      relics.forEach((relic: any) => {
        expect(relic.rarity).toBe(RELIC_RARITIES.RARE);
      });
    });

    it('특별 등급 상징만 반환한다', () => {
      const relics = getRelicsByRarity(RELIC_RARITIES.SPECIAL);
      expect(relics.length).toBeGreaterThan(0);
      relics.forEach((relic: any) => {
        expect(relic.rarity).toBe(RELIC_RARITIES.SPECIAL);
      });
    });

    it('존재하지 않는 등급은 빈 배열을 반환한다', () => {
      const relics = getRelicsByRarity('nonexistent' as any);
      expect(relics).toHaveLength(0);
    });

    it('모든 상징의 합이 전체 개수와 같다', () => {
      const common = getRelicsByRarity(RELIC_RARITIES.COMMON);
      const rare = getRelicsByRarity(RELIC_RARITIES.RARE);
      const special = getRelicsByRarity(RELIC_RARITIES.SPECIAL);
      const legendary = getRelicsByRarity(RELIC_RARITIES.LEGENDARY);
      const dev = getRelicsByRarity(RELIC_RARITIES.DEV);
      const total = common.length + rare.length + special.length + legendary.length + dev.length;
      expect(total).toBe(Object.keys(RELICS).length);
    });
  });

  describe('getRelicsByTag', () => {
    it('에너지 태그 상징만 반환한다', () => {
      const relics = getRelicsByTag(RELIC_TAGS.ENERGY);
      expect(relics.length).toBeGreaterThan(0);
      relics.forEach((relic: any) => {
        expect(relic.tags).toContain(RELIC_TAGS.ENERGY);
      });
    });

    it('방어 태그 상징만 반환한다', () => {
      const relics = getRelicsByTag(RELIC_TAGS.DEFENSE);
      expect(relics.length).toBeGreaterThan(0);
      relics.forEach((relic: any) => {
        expect(relic.tags).toContain(RELIC_TAGS.DEFENSE);
      });
    });

    it('에테르 태그 상징만 반환한다', () => {
      const relics = getRelicsByTag(RELIC_TAGS.ETHER);
      expect(relics.length).toBeGreaterThan(0);
      relics.forEach((relic: any) => {
        expect(relic.tags).toContain(RELIC_TAGS.ETHER);
      });
    });

    it('존재하지 않는 태그는 빈 배열을 반환한다', () => {
      const relics = getRelicsByTag('nonexistent');
      expect(relics).toHaveLength(0);
    });
  });

  describe('데이터 무결성', () => {
    it('모든 상징 ID가 고유하다', () => {
      const ids = Object.values(RELICS).map((r: any) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('모든 상징 이름이 존재한다', () => {
      Object.values(RELICS).forEach((relic: any) => {
        expect(typeof relic.name).toBe('string');
        expect(relic.name.length).toBeGreaterThan(0);
      });
    });

    it('모든 상징 설명이 존재한다', () => {
      Object.values(RELICS).forEach((relic: any) => {
        expect(typeof relic.description).toBe('string');
        expect(relic.description.length).toBeGreaterThan(0);
      });
    });

    it('모든 상징에 최소 1개의 태그가 있다', () => {
      Object.values(RELICS).forEach((relic: any) => {
        expect(relic.tags.length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
