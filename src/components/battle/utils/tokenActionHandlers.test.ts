/**
 * @file tokenActionHandlers.test.ts
 * @description 카드 onPlay 콜백용 토큰 액션 핸들러 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTokenActions } from './tokenActionHandlers';
import type { TokenEntity, TokenState } from '../../../types/core';

// Mock dependencies
vi.mock('../../../lib/tokenUtils', () => ({
  addToken: vi.fn((entity, tokenId, stacks) => ({
    tokens: { ...(entity.tokens || {}), [tokenId]: ((entity.tokens as Record<string, number>)?.[tokenId] || 0) + stacks },
    logs: [`${tokenId} +${stacks}`],
  })),
  removeToken: vi.fn((entity, tokenId, _tokenType, stacks) => {
    const currentStacks = (entity.tokens as Record<string, number>)?.[tokenId] || 0;
    const newStacks = Math.max(0, currentStacks - stacks);
    const newTokens = { ...(entity.tokens || {}) };
    if (newStacks === 0) {
      delete (newTokens as Record<string, number>)[tokenId];
    } else {
      (newTokens as Record<string, number>)[tokenId] = newStacks;
    }
    return { tokens: newTokens, logs: [`${tokenId} -${stacks}`] };
  }),
  setTokenStacks: vi.fn((_entity, tokenId, _tokenType, newStacks) => ({
    tokens: newStacks > 0 ? { [tokenId]: newStacks } : {},
    logs: [`${tokenId} = ${newStacks}`],
  })),
}));

vi.mock('../../../data/tokens', () => ({
  TOKENS: {
    strength: { id: 'strength', name: '힘' },
    vulnerable: { id: 'vulnerable', name: '취약' },
    poison: { id: 'poison', name: '독' },
  },
}));

describe('tokenActionHandlers', () => {
  describe('createTokenActions', () => {
    const createMockPlayer = (): TokenEntity & { tokens?: TokenState } => ({
      hp: 100,
      maxHp: 100,
      block: 0,
      tokens: {},
    });

    const createMockEnemy = (): TokenEntity & { tokens?: TokenState; units?: Array<{ unitId: number; name?: string; tokens?: TokenState }> } => ({
      hp: 50,
      maxHp: 50,
      block: 0,
      tokens: {},
    });

    let mockAddLog: ReturnType<typeof vi.fn>;
    let mockOnPlayerUpdate: ReturnType<typeof vi.fn>;
    let mockOnEnemyUpdate: ReturnType<typeof vi.fn>;
    let mockOnUnitsUpdate: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockAddLog = vi.fn();
      mockOnPlayerUpdate = vi.fn();
      mockOnEnemyUpdate = vi.fn();
      mockOnUnitsUpdate = vi.fn();
    });

    it('플레이어에게 토큰을 추가한다', () => {
      const playerState = createMockPlayer();
      const enemyState = createMockEnemy();

      const actions = createTokenActions({
        playerState,
        enemyState,
        isCritical: false,
        targetUnitIdForAttack: null,
        grantedAt: null,
        addLog: mockAddLog,
        onPlayerUpdate: mockOnPlayerUpdate,
        onEnemyUpdate: mockOnEnemyUpdate,
        onUnitsUpdate: mockOnUnitsUpdate,
      });

      const result = actions.addTokenToPlayer('strength', 2);

      expect(result.tokens).toEqual({ strength: 2 });
      expect(mockOnPlayerUpdate).toHaveBeenCalled();
      expect(mockAddLog).toHaveBeenCalled();
    });

    it('치명타 시 토큰 스택이 +1 증가한다', () => {
      const playerState = createMockPlayer();
      const enemyState = createMockEnemy();

      const actions = createTokenActions({
        playerState,
        enemyState,
        isCritical: true,
        targetUnitIdForAttack: null,
        grantedAt: null,
        addLog: mockAddLog,
        onPlayerUpdate: mockOnPlayerUpdate,
        onEnemyUpdate: mockOnEnemyUpdate,
        onUnitsUpdate: mockOnUnitsUpdate,
      });

      const result = actions.addTokenToPlayer('strength', 2);

      // 2 + 1 (치명타 보너스) = 3
      expect(result.tokens).toEqual({ strength: 3 });
      expect(mockAddLog).toHaveBeenCalledWith(expect.stringContaining('치명타'));
    });

    it('플레이어에서 토큰을 제거한다', () => {
      const playerState = { ...createMockPlayer(), tokens: { poison: 3 } };
      const enemyState = createMockEnemy();

      const actions = createTokenActions({
        playerState,
        enemyState,
        isCritical: false,
        targetUnitIdForAttack: null,
        grantedAt: null,
        addLog: mockAddLog,
        onPlayerUpdate: mockOnPlayerUpdate,
        onEnemyUpdate: mockOnEnemyUpdate,
        onUnitsUpdate: mockOnUnitsUpdate,
      });

      const result = actions.removeTokenFromPlayer('poison', 'permanent', 2);

      expect(result.tokens).toEqual({ poison: 1 });
      expect(mockOnPlayerUpdate).toHaveBeenCalled();
    });

    it('적에게 토큰을 추가한다 (단일 적)', () => {
      const playerState = createMockPlayer();
      const enemyState = createMockEnemy();

      const actions = createTokenActions({
        playerState,
        enemyState,
        isCritical: false,
        targetUnitIdForAttack: null,
        grantedAt: null,
        addLog: mockAddLog,
        onPlayerUpdate: mockOnPlayerUpdate,
        onEnemyUpdate: mockOnEnemyUpdate,
        onUnitsUpdate: mockOnUnitsUpdate,
      });

      const result = actions.addTokenToEnemy('vulnerable', 1);

      expect(result.tokens).toEqual({ vulnerable: 1 });
      expect(mockOnEnemyUpdate).toHaveBeenCalled();
    });

    it('다중 유닛 적의 타겟 유닛에 토큰을 추가한다', () => {
      const playerState = createMockPlayer();
      const enemyState = {
        ...createMockEnemy(),
        units: [
          { unitId: 0, name: '슬라임A', tokens: {} },
          { unitId: 1, name: '슬라임B', tokens: {} },
        ],
      };

      const actions = createTokenActions({
        playerState,
        enemyState,
        isCritical: false,
        targetUnitIdForAttack: 1, // 두 번째 유닛 타겟
        grantedAt: null,
        addLog: mockAddLog,
        onPlayerUpdate: mockOnPlayerUpdate,
        onEnemyUpdate: mockOnEnemyUpdate,
        onUnitsUpdate: mockOnUnitsUpdate,
      });

      actions.addTokenToEnemy('vulnerable', 1);

      expect(mockOnUnitsUpdate).toHaveBeenCalled();
      expect(mockOnEnemyUpdate).toHaveBeenCalled();
      expect(mockAddLog).toHaveBeenCalledWith(expect.stringContaining('슬라임B'));
    });

    it('플레이어 토큰을 특정 스택으로 리셋한다', () => {
      const playerState = { ...createMockPlayer(), tokens: { strength: 5 } };
      const enemyState = createMockEnemy();

      const actions = createTokenActions({
        playerState,
        enemyState,
        isCritical: false,
        targetUnitIdForAttack: null,
        grantedAt: null,
        addLog: mockAddLog,
        onPlayerUpdate: mockOnPlayerUpdate,
        onEnemyUpdate: mockOnEnemyUpdate,
        onUnitsUpdate: mockOnUnitsUpdate,
      });

      const result = actions.resetTokenForPlayer('strength', 'turn', 2);

      expect(result.tokens).toEqual({ strength: 2 });
      expect(mockOnPlayerUpdate).toHaveBeenCalled();
    });

    it('기본 스택 수는 1이다', () => {
      const playerState = createMockPlayer();
      const enemyState = createMockEnemy();

      const actions = createTokenActions({
        playerState,
        enemyState,
        isCritical: false,
        targetUnitIdForAttack: null,
        grantedAt: null,
        addLog: mockAddLog,
        onPlayerUpdate: mockOnPlayerUpdate,
        onEnemyUpdate: mockOnEnemyUpdate,
        onUnitsUpdate: mockOnUnitsUpdate,
      });

      const result = actions.addTokenToPlayer('strength');

      expect(result.tokens).toEqual({ strength: 1 });
    });

    it('여러 번 토큰 추가가 누적된다', () => {
      const playerState = createMockPlayer();
      const enemyState = createMockEnemy();

      const actions = createTokenActions({
        playerState,
        enemyState,
        isCritical: false,
        targetUnitIdForAttack: null,
        grantedAt: null,
        addLog: mockAddLog,
        onPlayerUpdate: mockOnPlayerUpdate,
        onEnemyUpdate: mockOnEnemyUpdate,
        onUnitsUpdate: mockOnUnitsUpdate,
      });

      actions.addTokenToPlayer('strength', 2);
      const result = actions.addTokenToPlayer('strength', 3);

      expect(result.tokens).toEqual({ strength: 5 });
    });

    it('타겟 유닛이 없는 다중 유닛 적에게는 본체에 토큰 추가', () => {
      const playerState = createMockPlayer();
      const enemyState = {
        ...createMockEnemy(),
        units: [
          { unitId: 0, name: '슬라임A', tokens: {} },
        ],
      };

      const actions = createTokenActions({
        playerState,
        enemyState,
        isCritical: false,
        targetUnitIdForAttack: null, // 타겟 없음
        grantedAt: null,
        addLog: mockAddLog,
        onPlayerUpdate: mockOnPlayerUpdate,
        onEnemyUpdate: mockOnEnemyUpdate,
        onUnitsUpdate: mockOnUnitsUpdate,
      });

      const result = actions.addTokenToEnemy('vulnerable', 1);

      // 본체에 토큰 추가
      expect(result.tokens).toEqual({ vulnerable: 1 });
      expect(mockOnEnemyUpdate).toHaveBeenCalled();
      expect(mockOnUnitsUpdate).not.toHaveBeenCalled();
    });

    it('적 치명타 시에도 토큰 보너스가 적용된다', () => {
      const playerState = createMockPlayer();
      const enemyState = createMockEnemy();

      const actions = createTokenActions({
        playerState,
        enemyState,
        isCritical: true,
        targetUnitIdForAttack: null,
        grantedAt: null,
        addLog: mockAddLog,
        onPlayerUpdate: mockOnPlayerUpdate,
        onEnemyUpdate: mockOnEnemyUpdate,
        onUnitsUpdate: mockOnUnitsUpdate,
      });

      const result = actions.addTokenToEnemy('vulnerable', 1);

      // 1 + 1 (치명타 보너스) = 2
      expect(result.tokens).toEqual({ vulnerable: 2 });
    });
  });
});
