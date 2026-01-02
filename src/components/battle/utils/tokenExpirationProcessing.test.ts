/**
 * @file tokenExpirationProcessing.test.ts
 * @description 타임라인 기반 토큰 만료 처리 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processTokenExpiration } from './tokenExpirationProcessing';
import type { TokenEntity } from '../../../types';

// Mock tokenUtils
vi.mock('../../../lib/tokenUtils', () => ({
  expireTurnTokensByTimeline: vi.fn((entity, turnNumber, currentSp) => {
    // 간단한 mock 구현: turnNumber > 1이고 currentSp > 5면 토큰 만료
    if (turnNumber > 1 && currentSp > 5) {
      return {
        tokens: {},
        logs: [`토큰 만료됨 (턴 ${turnNumber}, SP ${currentSp})`],
      };
    }
    return {
      tokens: entity.tokens || {},
      logs: [],
    };
  }),
}));

const createMockEntity = (overrides: Partial<TokenEntity> = {}): TokenEntity => ({
  tokens: {},
  ...overrides,
} as TokenEntity);

describe('tokenExpirationProcessing', () => {
  let logs: string[];

  beforeEach(() => {
    logs = [];
    vi.clearAllMocks();
  });

  describe('processTokenExpiration', () => {
    it('토큰 만료가 없으면 hasChanges가 false', () => {
      const result = processTokenExpiration({
        playerState: createMockEntity({ tokens: { permanent: [{ id: 'strength', stacks: 2 }] } }),
        enemyState: createMockEntity({ tokens: { permanent: [{ id: 'weakness', stacks: 1 }] } }),
        turnNumber: 1,
        currentSp: 3,
        addLog: (msg) => logs.push(msg),
      });

      expect(result.hasChanges).toBe(false);
      expect(logs.length).toBe(0);
    });

    it('플레이어 토큰이 만료되면 로그가 추가된다', () => {
      const result = processTokenExpiration({
        playerState: createMockEntity({ tokens: { permanent: [{ id: 'strength', stacks: 2 }] } }),
        enemyState: createMockEntity({ tokens: {} }),
        turnNumber: 2,
        currentSp: 6,
        addLog: (msg) => logs.push(msg),
      });

      expect(result.hasChanges).toBe(true);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]).toContain('토큰 만료됨');
    });

    it('적 토큰이 만료되면 로그가 추가된다', () => {
      const result = processTokenExpiration({
        playerState: createMockEntity({ tokens: {} }),
        enemyState: createMockEntity({ tokens: { permanent: [{ id: 'block', stacks: 5 }] } }),
        turnNumber: 2,
        currentSp: 6,
        addLog: (msg) => logs.push(msg),
      });

      expect(result.hasChanges).toBe(true);
      expect(logs.some(log => log.includes('토큰 만료됨'))).toBe(true);
    });

    it('양쪽 모두 토큰이 만료되면 두 로그가 추가된다', () => {
      const result = processTokenExpiration({
        playerState: createMockEntity({ tokens: { permanent: [{ id: 'strength', stacks: 2 }] } }),
        enemyState: createMockEntity({ tokens: { permanent: [{ id: 'weakness', stacks: 1 }] } }),
        turnNumber: 2,
        currentSp: 6,
        addLog: (msg) => logs.push(msg),
      });

      expect(result.hasChanges).toBe(true);
      expect(logs.length).toBe(2);
    });

    it('만료된 토큰이 제거된 상태를 반환한다', () => {
      const result = processTokenExpiration({
        playerState: createMockEntity({ tokens: { permanent: [{ id: 'strength', stacks: 2 }, { id: 'agility', stacks: 1 }] } }),
        enemyState: createMockEntity({ tokens: { permanent: [{ id: 'weakness', stacks: 1 }] } }),
        turnNumber: 2,
        currentSp: 6,
        addLog: (msg) => logs.push(msg),
      });

      // mock에서 토큰을 모두 제거하므로
      expect(result.playerState.tokens).toEqual({});
      expect(result.enemyState.tokens).toEqual({});
    });
  });
});
