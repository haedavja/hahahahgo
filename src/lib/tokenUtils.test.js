/**
 * @file tokenUtils.test.js
 * @description tokenUtils 함수 테스트
 */

import { describe, it, expect, vi } from 'vitest';
import { addToken, removeToken, hasToken, getTokenStacks, getAllTokens, clearTurnTokens } from './tokenUtils';

describe('tokenUtils', () => {
  // 기본 엔티티 생성 헬퍼
  const createEntity = (tokens = { usage: [], turn: [], permanent: [] }) => ({
    hp: 100,
    maxHp: 100,
    tokens
  });

  describe('addToken', () => {
    it('null 엔티티에 대해 안전하게 처리해야 함', () => {
      const result = addToken(null, 'offense', 1);

      expect(result.tokens).toEqual({ usage: [], turn: [], permanent: [] });
      expect(result.logs).toEqual([]);
    });

    it('존재하지 않는 토큰 ID에 대해 경고해야 함', () => {
      const entity = createEntity();
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      addToken(entity, 'nonexistent_token', 1);

      expect(consoleSpy).toHaveBeenCalledWith('Unknown token: nonexistent_token');
      consoleSpy.mockRestore();
    });

    it('토큰을 추가해야 함', () => {
      const entity = createEntity();

      const result = addToken(entity, 'offense', 2);

      // 토큰이 추가되었는지 확인 (offense는 usage 타입)
      const allTokens = [...result.tokens.usage, ...result.tokens.turn, ...result.tokens.permanent];
      const addedToken = allTokens.find(t => t.id === 'offense');

      expect(addedToken).toBeDefined();
      expect(addedToken.stacks).toBe(2);
    });

    it('기존 토큰에 스택을 추가해야 함', () => {
      const entity = createEntity({
        usage: [{ id: 'offense', stacks: 1, name: '공세' }],
        turn: [],
        permanent: []
      });

      const result = addToken(entity, 'offense', 2);

      const usageTokens = result.tokens.usage;
      const offenseToken = usageTokens.find(t => t.id === 'offense');

      expect(offenseToken.stacks).toBe(3); // 1 + 2
    });
  });

  describe('removeToken', () => {
    it('null 엔티티에 대해 안전하게 처리해야 함', () => {
      const result = removeToken(null, 'offense', 'turn', 1);

      expect(result.tokens).toEqual({ usage: [], turn: [], permanent: [] });
      expect(result.logs).toEqual([]);
    });

    it('존재하지 않는 토큰을 제거하려 할 때 원본을 반환해야 함', () => {
      const entity = createEntity();

      const result = removeToken(entity, 'offense', 'turn', 1);

      expect(result.tokens).toEqual(entity.tokens);
      expect(result.logs).toEqual([]);
    });

    it('토큰 스택을 감소시켜야 함', () => {
      const entity = createEntity({
        usage: [],
        turn: [{ id: 'offense', stacks: 3, name: '공세' }],
        permanent: []
      });

      const result = removeToken(entity, 'offense', 'turn', 1);

      const offenseToken = result.tokens.turn.find(t => t.id === 'offense');
      expect(offenseToken.stacks).toBe(2);
    });

    it('스택이 0 이하가 되면 토큰을 제거해야 함', () => {
      const entity = createEntity({
        usage: [],
        turn: [{ id: 'offense', stacks: 1, name: '공세' }],
        permanent: []
      });

      const result = removeToken(entity, 'offense', 'turn', 1);

      const offenseToken = result.tokens.turn.find(t => t.id === 'offense');
      expect(offenseToken).toBeUndefined();
      expect(result.logs.length).toBeGreaterThan(0);
    });
  });

  describe('hasToken', () => {
    it('토큰이 있으면 true를 반환해야 함', () => {
      const entity = createEntity({
        usage: [],
        turn: [{ id: 'offense', stacks: 1 }],
        permanent: []
      });

      expect(hasToken(entity, 'offense')).toBe(true);
    });

    it('토큰이 없으면 false를 반환해야 함', () => {
      const entity = createEntity();

      expect(hasToken(entity, 'offense')).toBe(false);
    });

    it('null 엔티티에 대해 false를 반환해야 함', () => {
      expect(hasToken(null, 'offense')).toBe(false);
    });
  });

  describe('getTokenStacks', () => {
    it('토큰 스택 수를 반환해야 함', () => {
      const entity = createEntity({
        usage: [],
        turn: [{ id: 'offense', stacks: 5 }],
        permanent: []
      });

      expect(getTokenStacks(entity, 'offense')).toBe(5);
    });

    it('토큰이 없으면 0을 반환해야 함', () => {
      const entity = createEntity();

      expect(getTokenStacks(entity, 'offense')).toBe(0);
    });

    it('null 엔티티에 대해 0을 반환해야 함', () => {
      expect(getTokenStacks(null, 'offense')).toBe(0);
    });
  });

  describe('getAllTokens', () => {
    it('모든 유형의 토큰을 반환해야 함 (TOKENS에 정의된 토큰만)', () => {
      // 실제 TOKENS에 정의된 토큰 ID 사용
      const entity = createEntity({
        usage: [{ id: 'offense', stacks: 1 }],      // offense는 TOKENS에 정의됨
        turn: [{ id: 'attack', stacks: 2 }],         // attack은 TOKENS에 정의됨
        permanent: [{ id: 'burn', stacks: 3 }]       // burn은 TOKENS에 정의됨
      });

      const allTokens = getAllTokens(entity);

      expect(allTokens).toHaveLength(3);
      expect(allTokens.find(t => t.id === 'offense')).toBeDefined();
      expect(allTokens.find(t => t.id === 'attack')).toBeDefined();
      expect(allTokens.find(t => t.id === 'burn')).toBeDefined();
    });

    it('TOKENS에 정의되지 않은 토큰은 반환하지 않아야 함', () => {
      const entity = createEntity({
        usage: [{ id: 'unknown_token', stacks: 1 }],
        turn: [],
        permanent: []
      });

      const allTokens = getAllTokens(entity);

      expect(allTokens).toHaveLength(0);
    });

    it('빈 토큰에 대해 빈 배열을 반환해야 함', () => {
      const entity = createEntity();

      const allTokens = getAllTokens(entity);

      expect(allTokens).toEqual([]);
    });

    it('null 엔티티에 대해 빈 배열을 반환해야 함', () => {
      const allTokens = getAllTokens(null);

      expect(allTokens).toEqual([]);
    });
  });

  describe('clearTurnTokens', () => {
    it('턴 토큰을 제거해야 함 (grantedAt 없는 것만)', () => {
      const entity = createEntity({
        usage: [{ id: 'usage_token', stacks: 1 }],
        turn: [
          { id: 'turn_token1', stacks: 1 },
          { id: 'turn_token2', stacks: 2, grantedAt: { turn: 1, sp: 50 } }
        ],
        permanent: [{ id: 'perm_token', stacks: 1 }]
      });

      const result = clearTurnTokens(entity);

      // usage와 permanent는 유지
      expect(result.tokens.usage).toHaveLength(1);
      expect(result.tokens.permanent).toHaveLength(1);

      // grantedAt 없는 턴 토큰만 제거
      expect(result.tokens.turn.find(t => t.id === 'turn_token1')).toBeUndefined();
      // grantedAt 있는 턴 토큰은 유지
      expect(result.tokens.turn.find(t => t.id === 'turn_token2')).toBeDefined();
    });

    it('null 엔티티에 대해 안전하게 처리해야 함', () => {
      const result = clearTurnTokens(null);

      expect(result.tokens).toEqual({ usage: [], turn: [], permanent: [] });
      expect(result.logs).toEqual([]);
    });
  });
});
