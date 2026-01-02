/**
 * @file tokens.test.ts
 * @description 토큰 시스템 데이터 검증 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  TOKEN_TYPES,
  TOKEN_CATEGORIES,
  TOKENS,
  TOKEN_CANCELLATION_MAP,
  GUN_JAM_REMOVES,
  TOKEN_COLORS,
  TOKEN_CATEGORY_COLORS,
} from './tokens';

describe('tokens', () => {
  describe('TOKEN_TYPES', () => {
    it('모든 토큰 타입이 정의되어 있다', () => {
      expect(TOKEN_TYPES.USAGE).toBe('usage');
      expect(TOKEN_TYPES.TURN).toBe('turn');
      expect(TOKEN_TYPES.PERMANENT).toBe('permanent');
    });
  });

  describe('TOKEN_CATEGORIES', () => {
    it('모든 토큰 카테고리가 정의되어 있다', () => {
      expect(TOKEN_CATEGORIES.POSITIVE).toBe('positive');
      expect(TOKEN_CATEGORIES.NEGATIVE).toBe('negative');
      expect(TOKEN_CATEGORIES.NEUTRAL).toBe('neutral');
    });
  });

  describe('TOKENS', () => {
    it('토큰이 비어있지 않다', () => {
      expect(Object.keys(TOKENS).length).toBeGreaterThan(0);
    });

    it('모든 토큰이 필수 필드를 가진다', () => {
      Object.values(TOKENS).forEach(token => {
        expect(token.id).toBeDefined();
        expect(token.name).toBeDefined();
        expect(token.type).toBeDefined();
        expect(token.category).toBeDefined();
        expect(token.emoji).toBeDefined();
        expect(token.description).toBeDefined();
        expect(token.effect).toBeDefined();
      });
    });

    it('토큰 ID가 키와 일치한다', () => {
      Object.entries(TOKENS).forEach(([key, token]) => {
        expect(token.id).toBe(key);
      });
    });

    it('토큰 타입이 유효하다', () => {
      const validTypes = Object.values(TOKEN_TYPES);
      Object.values(TOKENS).forEach(token => {
        expect(validTypes).toContain(token.type);
      });
    });

    it('토큰 카테고리가 유효하다', () => {
      const validCategories = Object.values(TOKEN_CATEGORIES);
      Object.values(TOKENS).forEach(token => {
        expect(validCategories).toContain(token.category);
      });
    });

    it('effect 객체가 type 필드를 가진다', () => {
      Object.values(TOKENS).forEach(token => {
        expect(token.effect.type).toBeDefined();
        expect(typeof token.effect.type).toBe('string');
      });
    });

    it('긍정 토큰이 존재한다', () => {
      const positiveTokens = Object.values(TOKENS).filter(
        t => t.category === TOKEN_CATEGORIES.POSITIVE
      );
      expect(positiveTokens.length).toBeGreaterThan(0);
    });

    it('부정 토큰이 존재한다', () => {
      const negativeTokens = Object.values(TOKENS).filter(
        t => t.category === TOKEN_CATEGORIES.NEGATIVE
      );
      expect(negativeTokens.length).toBeGreaterThan(0);
    });

    it('중립 토큰이 존재한다', () => {
      const neutralTokens = Object.values(TOKENS).filter(
        t => t.category === TOKEN_CATEGORIES.NEUTRAL
      );
      expect(neutralTokens.length).toBeGreaterThan(0);
    });
  });

  describe('TOKEN_CANCELLATION_MAP', () => {
    it('상쇄 맵이 정의되어 있다', () => {
      expect(TOKEN_CANCELLATION_MAP).toBeDefined();
      expect(Object.keys(TOKEN_CANCELLATION_MAP).length).toBeGreaterThan(0);
    });

    it('공격 관련 토큰 상쇄가 정의되어 있다', () => {
      expect(TOKEN_CANCELLATION_MAP.offense).toBe('dullness');
      expect(TOKEN_CANCELLATION_MAP.attack).toBe('dullness');
      expect(TOKEN_CANCELLATION_MAP.dullness).toBe('attack');
    });

    it('방어 관련 토큰 상쇄가 정의되어 있다', () => {
      expect(TOKEN_CANCELLATION_MAP.guard).toBe('exposed');
      expect(TOKEN_CANCELLATION_MAP.defense).toBe('exposed');
      expect(TOKEN_CANCELLATION_MAP.exposed).toBe('defense');
    });

    it('행동력 관련 토큰 상쇄가 정의되어 있다', () => {
      expect(TOKEN_CANCELLATION_MAP.warmedUp).toBe('dizzy');
      expect(TOKEN_CANCELLATION_MAP.dizzy).toBe('warmedUp');
    });

    it('총기 관련 토큰 상쇄가 정의되어 있다', () => {
      expect(TOKEN_CANCELLATION_MAP.loaded).toBe('gun_jam');
      expect(TOKEN_CANCELLATION_MAP.gun_jam).toBe('loaded');
    });
  });

  describe('GUN_JAM_REMOVES', () => {
    it('탄걸림 시 제거할 토큰 목록이 정의되어 있다', () => {
      expect(Array.isArray(GUN_JAM_REMOVES)).toBe(true);
      expect(GUN_JAM_REMOVES).toContain('roulette');
    });
  });

  describe('TOKEN_COLORS', () => {
    it('모든 토큰 타입에 색상이 정의되어 있다', () => {
      expect(TOKEN_COLORS[TOKEN_TYPES.USAGE]).toBeDefined();
      expect(TOKEN_COLORS[TOKEN_TYPES.TURN]).toBeDefined();
      expect(TOKEN_COLORS[TOKEN_TYPES.PERMANENT]).toBeDefined();
    });

    it('색상이 HEX 형식이다', () => {
      Object.values(TOKEN_COLORS).forEach(color => {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });

  describe('TOKEN_CATEGORY_COLORS', () => {
    it('모든 토큰 카테고리에 색상이 정의되어 있다', () => {
      expect(TOKEN_CATEGORY_COLORS[TOKEN_CATEGORIES.POSITIVE]).toBeDefined();
      expect(TOKEN_CATEGORY_COLORS[TOKEN_CATEGORIES.NEGATIVE]).toBeDefined();
      expect(TOKEN_CATEGORY_COLORS[TOKEN_CATEGORIES.NEUTRAL]).toBeDefined();
    });

    it('색상이 HEX 형식이다', () => {
      Object.values(TOKEN_CATEGORY_COLORS).forEach(color => {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });

  describe('주요 토큰 검증', () => {
    it('offense 토큰이 올바르게 정의되어 있다', () => {
      const token = TOKENS.offense;
      expect(token.type).toBe('usage');
      expect(token.category).toBe('positive');
      expect(token.effect.type).toBe('ATTACK_BOOST');
      expect(token.effect.value).toBe(0.5);
    });

    it('vulnerable 토큰이 올바르게 정의되어 있다', () => {
      const token = TOKENS.vulnerable;
      expect(token.type).toBe('turn');
      expect(token.category).toBe('negative');
      expect(token.effect.type).toBe('DAMAGE_TAKEN');
    });

    it('strength 토큰이 올바르게 정의되어 있다', () => {
      const token = TOKENS.strength;
      expect(token.type).toBe('permanent');
      expect(token.category).toBe('neutral');
      expect(token.effect.type).toBe('STRENGTH');
    });

    it('gun_jam 토큰이 올바르게 정의되어 있다', () => {
      const token = TOKENS.gun_jam;
      expect(token.type).toBe('permanent');
      expect(token.category).toBe('negative');
      expect(token.effect.type).toBe('GUN_JAM');
    });

    it('burn 토큰이 올바르게 정의되어 있다', () => {
      const token = TOKENS.burn;
      expect(token.type).toBe('turn');
      expect(token.category).toBe('negative');
      expect(token.effect.type).toBe('BURN');
    });
  });
});
