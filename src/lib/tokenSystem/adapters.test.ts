/**
 * @file adapters.test.ts
 * @description 토큰 시스템 어댑터 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  // 타입
  GameTokenState,
  SimTokenState,
  TokenDefinition,
  // 게임 → 시뮬레이터
  gameToSimTokens,
  getGameTokenStacks,
  hasGameToken,
  // 시뮬레이터 → 게임
  simToGameTokens,
  getSimTokenStacks,
  hasSimToken,
  // 접근자
  createGameTokenAccessor,
  createSimTokenAccessor,
  // 빈 상태
  createEmptyGameTokens,
  createEmptySimTokens,
  // 시뮬레이터 토큰 조작
  addSimToken,
  removeSimToken,
  clearSimToken,
  // 게임 토큰 조작
  addGameToken,
  removeGameToken,
  clearGameTurnTokens,
  // 유틸리티
  cloneGameTokens,
  cloneSimTokens,
  isGameTokensEmpty,
  isSimTokensEmpty,
} from './adapters';

describe('토큰 어댑터', () => {
  // ==================== 게임 → 시뮬레이터 ====================
  describe('gameToSimTokens', () => {
    it('빈 게임 토큰을 빈 시뮬레이터 토큰으로 변환', () => {
      const gameTokens: GameTokenState = { usage: [], turn: [], permanent: [] };
      const result = gameToSimTokens(gameTokens);
      expect(result).toEqual({});
    });

    it('단일 토큰 변환', () => {
      const gameTokens: GameTokenState = {
        usage: [{ id: 'sharpen', stacks: 3 }],
        turn: [],
        permanent: [],
      };
      const result = gameToSimTokens(gameTokens);
      expect(result).toEqual({ sharpen: 3 });
    });

    it('여러 타입의 토큰 변환', () => {
      const gameTokens: GameTokenState = {
        usage: [{ id: 'sharpen', stacks: 2 }],
        turn: [{ id: 'guard', stacks: 1 }],
        permanent: [{ id: 'bless', stacks: 5 }],
      };
      const result = gameToSimTokens(gameTokens);
      expect(result).toEqual({ sharpen: 2, guard: 1, bless: 5 });
    });

    it('같은 ID의 토큰 스택 합산', () => {
      const gameTokens: GameTokenState = {
        usage: [{ id: 'sharpen', stacks: 2 }],
        turn: [{ id: 'sharpen', stacks: 3 }],
        permanent: [],
      };
      const result = gameToSimTokens(gameTokens);
      expect(result).toEqual({ sharpen: 5 });
    });
  });

  describe('getGameTokenStacks', () => {
    const gameTokens: GameTokenState = {
      usage: [{ id: 'sharpen', stacks: 3 }],
      turn: [{ id: 'guard', stacks: 2 }],
      permanent: [{ id: 'bless', stacks: 1 }],
    };

    it('usage 토큰 스택 조회', () => {
      expect(getGameTokenStacks(gameTokens, 'sharpen')).toBe(3);
    });

    it('turn 토큰 스택 조회', () => {
      expect(getGameTokenStacks(gameTokens, 'guard')).toBe(2);
    });

    it('permanent 토큰 스택 조회', () => {
      expect(getGameTokenStacks(gameTokens, 'bless')).toBe(1);
    });

    it('존재하지 않는 토큰은 0 반환', () => {
      expect(getGameTokenStacks(gameTokens, 'unknown')).toBe(0);
    });
  });

  describe('hasGameToken', () => {
    const gameTokens: GameTokenState = {
      usage: [{ id: 'sharpen', stacks: 3 }],
      turn: [],
      permanent: [],
    };

    it('존재하는 토큰은 true', () => {
      expect(hasGameToken(gameTokens, 'sharpen')).toBe(true);
    });

    it('존재하지 않는 토큰은 false', () => {
      expect(hasGameToken(gameTokens, 'unknown')).toBe(false);
    });
  });

  // ==================== 시뮬레이터 → 게임 ====================
  describe('simToGameTokens', () => {
    const tokenDefs: Record<string, TokenDefinition> = {
      sharpen: { id: 'sharpen', name: '날 세우기', type: 'usage', category: 'positive' },
      guard: { id: 'guard', name: '방어 태세', type: 'turn', category: 'positive' },
      bless: { id: 'bless', name: '축복', type: 'permanent', category: 'positive' },
    };

    it('빈 시뮬레이터 토큰을 빈 게임 토큰으로 변환', () => {
      const simTokens: SimTokenState = {};
      const result = simToGameTokens(simTokens, tokenDefs);
      expect(result).toEqual({ usage: [], turn: [], permanent: [] });
    });

    it('타입별로 올바르게 분류', () => {
      const simTokens: SimTokenState = { sharpen: 2, guard: 1, bless: 3 };
      const result = simToGameTokens(simTokens, tokenDefs);

      expect(result.usage).toHaveLength(1);
      expect(result.usage[0]).toEqual({ id: 'sharpen', stacks: 2 });

      expect(result.turn).toHaveLength(1);
      expect(result.turn[0]).toEqual({ id: 'guard', stacks: 1 });

      expect(result.permanent).toHaveLength(1);
      expect(result.permanent[0]).toEqual({ id: 'bless', stacks: 3 });
    });

    it('0 이하 스택은 무시', () => {
      const simTokens: SimTokenState = { sharpen: 0, guard: -1 };
      const result = simToGameTokens(simTokens, tokenDefs);
      expect(result).toEqual({ usage: [], turn: [], permanent: [] });
    });

    it('정의되지 않은 토큰은 usage로 분류', () => {
      const simTokens: SimTokenState = { unknown: 5 };
      const result = simToGameTokens(simTokens, tokenDefs);
      expect(result.usage).toHaveLength(1);
      expect(result.usage[0]).toEqual({ id: 'unknown', stacks: 5 });
    });
  });

  describe('getSimTokenStacks / hasSimToken', () => {
    const simTokens: SimTokenState = { sharpen: 3, guard: 0 };

    it('존재하는 토큰 스택 조회', () => {
      expect(getSimTokenStacks(simTokens, 'sharpen')).toBe(3);
    });

    it('존재하지 않는 토큰은 0 반환', () => {
      expect(getSimTokenStacks(simTokens, 'unknown')).toBe(0);
    });

    it('hasSimToken - 존재하는 토큰', () => {
      expect(hasSimToken(simTokens, 'sharpen')).toBe(true);
    });

    it('hasSimToken - 0 스택 토큰은 false', () => {
      expect(hasSimToken(simTokens, 'guard')).toBe(false);
    });
  });

  // ==================== 접근자 ====================
  describe('TokenAccessor', () => {
    it('게임 토큰 접근자', () => {
      const gameTokens: GameTokenState = {
        usage: [{ id: 'sharpen', stacks: 5 }],
        turn: [],
        permanent: [],
      };
      const accessor = createGameTokenAccessor(gameTokens);

      expect(accessor.getStacks('sharpen')).toBe(5);
      expect(accessor.hasToken('sharpen')).toBe(true);
      expect(accessor.hasToken('unknown')).toBe(false);
    });

    it('시뮬레이터 토큰 접근자', () => {
      const simTokens: SimTokenState = { guard: 3 };
      const accessor = createSimTokenAccessor(simTokens);

      expect(accessor.getStacks('guard')).toBe(3);
      expect(accessor.hasToken('guard')).toBe(true);
      expect(accessor.hasToken('unknown')).toBe(false);
    });
  });

  // ==================== 빈 상태 생성 ====================
  describe('빈 상태 생성', () => {
    it('createEmptyGameTokens', () => {
      const result = createEmptyGameTokens();
      expect(result).toEqual({ usage: [], turn: [], permanent: [] });
    });

    it('createEmptySimTokens', () => {
      const result = createEmptySimTokens();
      expect(result).toEqual({});
    });
  });

  // ==================== 시뮬레이터 토큰 조작 ====================
  describe('시뮬레이터 토큰 조작', () => {
    it('addSimToken - 새 토큰 추가', () => {
      const tokens: SimTokenState = {};
      const result = addSimToken(tokens, 'sharpen', 3);
      expect(result).toEqual({ sharpen: 3 });
      expect(tokens).toEqual({}); // 원본 불변
    });

    it('addSimToken - 기존 토큰에 스택 추가', () => {
      const tokens: SimTokenState = { sharpen: 2 };
      const result = addSimToken(tokens, 'sharpen', 3);
      expect(result).toEqual({ sharpen: 5 });
    });

    it('addSimToken - 기본 스택 1', () => {
      const tokens: SimTokenState = {};
      const result = addSimToken(tokens, 'sharpen');
      expect(result).toEqual({ sharpen: 1 });
    });

    it('removeSimToken - 스택 감소', () => {
      const tokens: SimTokenState = { sharpen: 5 };
      const result = removeSimToken(tokens, 'sharpen', 2);
      expect(result).toEqual({ sharpen: 3 });
    });

    it('removeSimToken - 0이 되면 삭제', () => {
      const tokens: SimTokenState = { sharpen: 2 };
      const result = removeSimToken(tokens, 'sharpen', 2);
      expect(result).toEqual({});
    });

    it('removeSimToken - 음수가 되지 않음', () => {
      const tokens: SimTokenState = { sharpen: 1 };
      const result = removeSimToken(tokens, 'sharpen', 5);
      expect(result).toEqual({});
    });

    it('removeSimToken - 존재하지 않는 토큰', () => {
      const tokens: SimTokenState = { sharpen: 3 };
      const result = removeSimToken(tokens, 'unknown', 1);
      expect(result).toEqual({ sharpen: 3 });
    });

    it('clearSimToken', () => {
      const tokens: SimTokenState = { sharpen: 5, guard: 3 };
      const result = clearSimToken(tokens, 'sharpen');
      expect(result).toEqual({ guard: 3 });
    });
  });

  // ==================== 게임 토큰 조작 ====================
  describe('게임 토큰 조작', () => {
    it('addGameToken - 새 토큰 추가', () => {
      const tokens = createEmptyGameTokens();
      const result = addGameToken(tokens, 'sharpen', 3, 'usage');
      expect(result.usage).toHaveLength(1);
      expect(result.usage[0]).toEqual({ id: 'sharpen', stacks: 3 });
      expect(tokens.usage).toHaveLength(0); // 원본 불변
    });

    it('addGameToken - 기존 토큰에 스택 추가', () => {
      const tokens: GameTokenState = {
        usage: [{ id: 'sharpen', stacks: 2 }],
        turn: [],
        permanent: [],
      };
      const result = addGameToken(tokens, 'sharpen', 3, 'usage');
      expect(result.usage[0].stacks).toBe(5);
    });

    it('addGameToken - grantedAt 설정', () => {
      const tokens = createEmptyGameTokens();
      const grantedAt = { turn: 1, sp: 3 };
      const result = addGameToken(tokens, 'sharpen', 1, 'turn', grantedAt);
      expect(result.turn[0].grantedAt).toEqual(grantedAt);
    });

    it('removeGameToken - 스택 감소', () => {
      const tokens: GameTokenState = {
        usage: [{ id: 'sharpen', stacks: 5 }],
        turn: [],
        permanent: [],
      };
      const result = removeGameToken(tokens, 'sharpen', 'usage', 2);
      expect(result.usage[0].stacks).toBe(3);
    });

    it('removeGameToken - 0이 되면 삭제', () => {
      const tokens: GameTokenState = {
        usage: [{ id: 'sharpen', stacks: 2 }],
        turn: [],
        permanent: [],
      };
      const result = removeGameToken(tokens, 'sharpen', 'usage', 2);
      expect(result.usage).toHaveLength(0);
    });

    it('removeGameToken - 존재하지 않는 토큰은 원본 반환', () => {
      const tokens = createEmptyGameTokens();
      const result = removeGameToken(tokens, 'unknown', 'usage', 1);
      expect(result).toBe(tokens);
    });

    it('clearGameTurnTokens - grantedAt 없는 turn 토큰만 제거', () => {
      const tokens: GameTokenState = {
        usage: [{ id: 'sharpen', stacks: 2 }],
        turn: [
          { id: 'guard', stacks: 1 }, // 제거됨
          { id: 'buff', stacks: 3, grantedAt: { turn: 1, sp: 0 } }, // 유지
        ],
        permanent: [{ id: 'bless', stacks: 1 }],
      };
      const result = clearGameTurnTokens(tokens);

      expect(result.usage).toHaveLength(1);
      expect(result.turn).toHaveLength(1);
      expect(result.turn[0].id).toBe('buff');
      expect(result.permanent).toHaveLength(1);
    });
  });

  // ==================== 유틸리티 ====================
  describe('유틸리티', () => {
    it('cloneGameTokens - 깊은 복사', () => {
      const tokens: GameTokenState = {
        usage: [{ id: 'sharpen', stacks: 3 }],
        turn: [],
        permanent: [],
      };
      const cloned = cloneGameTokens(tokens);

      expect(cloned).toEqual(tokens);
      expect(cloned).not.toBe(tokens);
      expect(cloned.usage).not.toBe(tokens.usage);
      expect(cloned.usage[0]).not.toBe(tokens.usage[0]);
    });

    it('cloneSimTokens - 얕은 복사', () => {
      const tokens: SimTokenState = { sharpen: 3, guard: 2 };
      const cloned = cloneSimTokens(tokens);

      expect(cloned).toEqual(tokens);
      expect(cloned).not.toBe(tokens);
    });

    it('isGameTokensEmpty', () => {
      expect(isGameTokensEmpty(createEmptyGameTokens())).toBe(true);
      expect(isGameTokensEmpty({
        usage: [{ id: 'sharpen', stacks: 1 }],
        turn: [],
        permanent: [],
      })).toBe(false);
    });

    it('isSimTokensEmpty', () => {
      expect(isSimTokensEmpty({})).toBe(true);
      expect(isSimTokensEmpty({ sharpen: 1 })).toBe(false);
    });
  });

  // ==================== 라운드트립 테스트 ====================
  describe('라운드트립 변환', () => {
    it('게임 → 시뮬레이터 → 게임', () => {
      const tokenDefs: Record<string, TokenDefinition> = {
        sharpen: { id: 'sharpen', name: '날 세우기', type: 'usage', category: 'positive' },
        guard: { id: 'guard', name: '방어 태세', type: 'turn', category: 'positive' },
      };

      const original: GameTokenState = {
        usage: [{ id: 'sharpen', stacks: 3 }],
        turn: [{ id: 'guard', stacks: 2 }],
        permanent: [],
      };

      const sim = gameToSimTokens(original);
      const roundTrip = simToGameTokens(sim, tokenDefs);

      expect(roundTrip.usage).toHaveLength(1);
      expect(roundTrip.usage[0]).toEqual({ id: 'sharpen', stacks: 3 });
      expect(roundTrip.turn).toHaveLength(1);
      expect(roundTrip.turn[0]).toEqual({ id: 'guard', stacks: 2 });
    });
  });
});
