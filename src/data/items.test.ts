/**
 * @file items.test.ts
 * @description 아이템 데이터 검증 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  ITEMS,
  ITEM_IDS,
  COMBAT_ITEMS,
  ANYTIME_ITEMS,
  getItem,
} from './items';

describe('items', () => {
  describe('ITEMS', () => {
    it('아이템이 비어있지 않다', () => {
      expect(Object.keys(ITEMS).length).toBeGreaterThan(0);
    });

    it('모든 아이템이 필수 필드를 가진다', () => {
      Object.values(ITEMS).forEach(item => {
        expect(item.id).toBeDefined();
        expect(item.name).toBeDefined();
        expect(item.icon).toBeDefined();
        expect(item.description).toBeDefined();
        expect(item.tier).toBeDefined();
        expect(item.usableIn).toBeDefined();
        expect(item.effect).toBeDefined();
      });
    });

    it('아이템 ID가 키와 일치한다', () => {
      Object.entries(ITEMS).forEach(([key, item]) => {
        expect(item.id).toBe(key);
      });
    });

    it('아이템 티어가 1 또는 2이다', () => {
      Object.values(ITEMS).forEach(item => {
        expect([1, 2]).toContain(item.tier);
      });
    });

    it('usableIn이 combat 또는 any이다', () => {
      Object.values(ITEMS).forEach(item => {
        expect(['combat', 'any']).toContain(item.usableIn);
      });
    });

    it('effect가 type 필드를 가진다', () => {
      Object.values(ITEMS).forEach(item => {
        expect(item.effect.type).toBeDefined();
        expect(typeof item.effect.type).toBe('string');
      });
    });
  });

  describe('ITEM_IDS', () => {
    it('ITEM_IDS가 ITEMS의 키와 일치한다', () => {
      expect(ITEM_IDS.length).toBe(Object.keys(ITEMS).length);
      ITEM_IDS.forEach(id => {
        expect(ITEMS[id]).toBeDefined();
      });
    });
  });

  describe('COMBAT_ITEMS', () => {
    it('전투용 아이템만 포함한다', () => {
      COMBAT_ITEMS.forEach(item => {
        expect(item.usableIn).toBe('combat');
      });
    });

    it('전투용 아이템이 존재한다', () => {
      expect(COMBAT_ITEMS.length).toBeGreaterThan(0);
    });
  });

  describe('ANYTIME_ITEMS', () => {
    it('언제나 사용 가능한 아이템만 포함한다', () => {
      ANYTIME_ITEMS.forEach(item => {
        expect(item.usableIn).toBe('any');
      });
    });

    it('any 아이템이 존재한다', () => {
      expect(ANYTIME_ITEMS.length).toBeGreaterThan(0);
    });
  });

  describe('getItem', () => {
    it('존재하는 아이템을 반환한다', () => {
      const item = getItem('explosive-small');
      expect(item).not.toBeNull();
      expect(item?.id).toBe('explosive-small');
      expect(item?.name).toBe('폭발물 (소)');
    });

    it('존재하지 않는 아이템은 null을 반환한다', () => {
      const item = getItem('nonexistent-item');
      expect(item).toBeNull();
    });
  });

  describe('아이템 효과 타입 검증', () => {
    it('etherMultiplier 아이템이 존재한다', () => {
      const item = Object.values(ITEMS).find(
        i => i.effect.type === 'etherMultiplier'
      );
      expect(item).toBeDefined();
    });

    it('damage 아이템이 존재한다', () => {
      const item = Object.values(ITEMS).find(
        i => i.effect.type === 'damage'
      );
      expect(item).toBeDefined();
    });

    it('defense 아이템이 존재한다', () => {
      const item = Object.values(ITEMS).find(
        i => i.effect.type === 'defense'
      );
      expect(item).toBeDefined();
    });

    it('grantTokens 아이템이 존재한다', () => {
      const item = Object.values(ITEMS).find(
        i => i.effect.type === 'grantTokens'
      );
      expect(item).toBeDefined();
    });

    it('healPercent 아이템이 존재한다', () => {
      const item = Object.values(ITEMS).find(
        i => i.effect.type === 'healPercent'
      );
      expect(item).toBeDefined();
    });

    it('statBoost 아이템이 존재한다', () => {
      const item = Object.values(ITEMS).find(
        i => i.effect.type === 'statBoost'
      );
      expect(item).toBeDefined();
    });
  });

  describe('특정 아이템 검증', () => {
    it('에테르 증폭제 (소)가 올바르게 정의되어 있다', () => {
      const item = ITEMS['ether-amplifier-small'];
      expect(item.tier).toBe(1);
      expect(item.usableIn).toBe('combat');
      expect(item.effect.type).toBe('etherMultiplier');
      if (item.effect.type === 'etherMultiplier') {
        expect(item.effect.value).toBe(1.5);
      }
    });

    it('치유제 (대)가 올바르게 정의되어 있다', () => {
      const item = ITEMS['healing-potion-large'];
      expect(item.tier).toBe(2);
      expect(item.usableIn).toBe('any');
      expect(item.effect.type).toBe('healPercent');
      if (item.effect.type === 'healPercent') {
        expect(item.effect.value).toBe(50);
      }
    });

    it('근력 강화제가 node 지속시간을 가진다', () => {
      const item = ITEMS['strength-boost-small'];
      expect(item.duration).toBe('node');
      expect(item.effect.type).toBe('statBoost');
    });
  });
});
