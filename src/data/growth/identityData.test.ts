/**
 * @file identityData.test.ts
 * @description 자아 (Identity) 데이터 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  IDENTITIES,
  IDENTITY_REQUIRED_PYRAMID_LEVEL,
  canSelectIdentity,
  type IdentityType,
} from './identityData';

describe('identityData', () => {
  describe('IDENTITIES', () => {
    it('총잡이와 검잡이 2개의 자아가 있다', () => {
      expect(Object.keys(IDENTITIES).length).toBe(2);
      expect(IDENTITIES.gunslinger).toBeDefined();
      expect(IDENTITIES.swordsman).toBeDefined();
    });
  });

  describe('gunslinger (총잡이)', () => {
    const identity = IDENTITIES.gunslinger;

    it('id가 gunslinger이다', () => {
      expect(identity.id).toBe('gunslinger');
    });

    it('name이 총잡이이다', () => {
      expect(identity.name).toBe('총잡이');
    });

    it('emoji가 🔫이다', () => {
      expect(identity.emoji).toBe('🔫');
    });

    it('건카타 로고스와 연결되어 있다', () => {
      expect(identity.logos).toBe('gunkata');
    });

    it('description에 총기와 건카타가 포함된다', () => {
      expect(identity.description).toContain('총기');
      expect(identity.description).toContain('건카타');
    });

    it('권장 에토스가 6개 이상이다', () => {
      expect(identity.preferredEthos.length).toBeGreaterThanOrEqual(6);
    });

    it('flame 에토스가 권장된다', () => {
      expect(identity.preferredEthos).toContain('flame');
    });

    it('권장 파토스가 있다', () => {
      expect(identity.preferredPathos.length).toBeGreaterThan(0);
    });
  });

  describe('swordsman (검잡이)', () => {
    const identity = IDENTITIES.swordsman;

    it('id가 swordsman이다', () => {
      expect(identity.id).toBe('swordsman');
    });

    it('name이 검잡이이다', () => {
      expect(identity.name).toBe('검잡이');
    });

    it('emoji가 ⚔️이다', () => {
      expect(identity.emoji).toBe('⚔️');
    });

    it('배틀왈츠 로고스와 연결되어 있다', () => {
      expect(identity.logos).toBe('battleWaltz');
    });

    it('description에 검과 배틀 왈츠가 포함된다', () => {
      expect(identity.description).toContain('검');
      expect(identity.description).toContain('배틀 왈츠');
    });

    it('권장 에토스가 6개 이상이다', () => {
      expect(identity.preferredEthos.length).toBeGreaterThanOrEqual(6);
    });

    it('swordArt 에토스가 권장된다', () => {
      expect(identity.preferredEthos).toContain('swordArt');
    });

    it('권장 파토스가 있다', () => {
      expect(identity.preferredPathos.length).toBeGreaterThan(0);
    });
  });

  describe('IDENTITY_REQUIRED_PYRAMID_LEVEL', () => {
    it('자아 선택 요구 피라미드 레벨은 3이다', () => {
      expect(IDENTITY_REQUIRED_PYRAMID_LEVEL).toBe(3);
    });
  });

  describe('canSelectIdentity', () => {
    it('피라미드 레벨 0이면 false', () => {
      expect(canSelectIdentity(0)).toBe(false);
    });

    it('피라미드 레벨 1이면 false', () => {
      expect(canSelectIdentity(1)).toBe(false);
    });

    it('피라미드 레벨 2이면 false', () => {
      expect(canSelectIdentity(2)).toBe(false);
    });

    it('피라미드 레벨 3이면 true', () => {
      expect(canSelectIdentity(3)).toBe(true);
    });

    it('피라미드 레벨 4이면 true', () => {
      expect(canSelectIdentity(4)).toBe(true);
    });

    it('피라미드 레벨 5이면 true', () => {
      expect(canSelectIdentity(5)).toBe(true);
    });

    it('피라미드 레벨 10이면 true', () => {
      expect(canSelectIdentity(10)).toBe(true);
    });
  });

  describe('Identity 타입 구조', () => {
    it('각 자아에 모든 필수 속성이 있다', () => {
      for (const identity of Object.values(IDENTITIES)) {
        expect(identity).toHaveProperty('id');
        expect(identity).toHaveProperty('name');
        expect(identity).toHaveProperty('emoji');
        expect(identity).toHaveProperty('description');
        expect(identity).toHaveProperty('logos');
        expect(identity).toHaveProperty('preferredEthos');
        expect(identity).toHaveProperty('preferredPathos');
      }
    });

    it('preferredEthos는 문자열 배열이다', () => {
      for (const identity of Object.values(IDENTITIES)) {
        expect(Array.isArray(identity.preferredEthos)).toBe(true);
        for (const ethos of identity.preferredEthos) {
          expect(typeof ethos).toBe('string');
        }
      }
    });

    it('preferredPathos는 문자열 배열이다', () => {
      for (const identity of Object.values(IDENTITIES)) {
        expect(Array.isArray(identity.preferredPathos)).toBe(true);
        for (const pathos of identity.preferredPathos) {
          expect(typeof pathos).toBe('string');
        }
      }
    });
  });

  describe('자아-로고스 연결 일관성', () => {
    it('총잡이는 gunkata 로고스', () => {
      expect(IDENTITIES.gunslinger.logos).toBe('gunkata');
    });

    it('검잡이는 battleWaltz 로고스', () => {
      expect(IDENTITIES.swordsman.logos).toBe('battleWaltz');
    });

    it('각 자아의 로고스가 서로 다르다', () => {
      expect(IDENTITIES.gunslinger.logos).not.toBe(IDENTITIES.swordsman.logos);
    });
  });

  describe('IdentityType 타입', () => {
    it('gunslinger 타입이 유효하다', () => {
      const type: IdentityType = 'gunslinger';
      expect(IDENTITIES[type]).toBeDefined();
    });

    it('swordsman 타입이 유효하다', () => {
      const type: IdentityType = 'swordsman';
      expect(IDENTITIES[type]).toBeDefined();
    });
  });
});
