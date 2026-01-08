/**
 * @file cardExecutionTokens.test.ts
 * @description 카드 실행 시 토큰 관련 처리 유틸리티 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCardExecutionTokenActions } from './cardExecutionTokens';
import type { TokenEntity } from '../../../types';

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

describe('cardExecutionTokens', () => {
  describe('createCardExecutionTokenActions', () => {
    const createMockPlayer = (): TokenEntity & { tokens?: unknown } => ({
      hp: 100,
      maxHp: 100,
      block: 0,
      tokens: {},
    });

    const createMockEnemy = (): TokenEntity & { tokens?: unknown; units?: Array<{ unitId: number; name?: string; tokens?: unknown }> } => ({
      hp: 50,
      maxHp: 50,
      block: 0,
      tokens: {},
    });

    let mockAddLog: ReturnType<typeof vi.fn>;
    let mockSetPlayer: ReturnType<typeof vi.fn>;
    let mockSetEnemy: ReturnType<typeof vi.fn>;
    let mockSetEnemyUnits: ReturnType<typeof vi.fn>;
    let mockBattleRef: { current: { player?: unknown; enemy?: unknown } | null };

    beforeEach(() => {
      vi.clearAllMocks();
      mockAddLog = vi.fn();
      mockSetPlayer = vi.fn();
      mockSetEnemy = vi.fn();
      mockSetEnemyUnits = vi.fn();
      mockBattleRef = { current: { player: {}, enemy: {} } };
    });

    it('플레이어에게 토큰을 추가한다', () => {
      const playerState = createMockPlayer();
      const enemyState = createMockEnemy();

      const actions = createCardExecutionTokenActions({
        playerState,
        enemyState,
        battleRef: mockBattleRef,
        targetUnitIdForAttack: null,
        isCritical: false,
        grantedAt: null,
        addLog: mockAddLog,
        actions: {
          setPlayer: mockSetPlayer,
          setEnemy: mockSetEnemy,
          setEnemyUnits: mockSetEnemyUnits,
        },
      });

      const result = actions.addTokenToPlayer('strength', 2);

      expect(result.tokens).toEqual({ strength: 2 });
      expect(mockSetPlayer).toHaveBeenCalled();
      expect(mockAddLog).toHaveBeenCalled();
    });

    it('치명타 시 토큰 스택이 +1 증가한다', () => {
      const playerState = createMockPlayer();
      const enemyState = createMockEnemy();

      const actions = createCardExecutionTokenActions({
        playerState,
        enemyState,
        battleRef: mockBattleRef,
        targetUnitIdForAttack: null,
        isCritical: true,
        grantedAt: null,
        addLog: mockAddLog,
        actions: {
          setPlayer: mockSetPlayer,
          setEnemy: mockSetEnemy,
        },
      });

      const result = actions.addTokenToPlayer('strength', 2);

      // 2 + 1 (치명타 보너스) = 3
      expect(result.tokens).toEqual({ strength: 3 });
      expect(mockAddLog).toHaveBeenCalledWith(expect.stringContaining('치명타'));
    });

    it('플레이어에서 토큰을 제거한다', () => {
      const playerState = { ...createMockPlayer(), tokens: { poison: 3 } };
      const enemyState = createMockEnemy();

      const actions = createCardExecutionTokenActions({
        playerState,
        enemyState,
        battleRef: mockBattleRef,
        targetUnitIdForAttack: null,
        isCritical: false,
        grantedAt: null,
        addLog: mockAddLog,
        actions: {
          setPlayer: mockSetPlayer,
          setEnemy: mockSetEnemy,
        },
      });

      const result = actions.removeTokenFromPlayer('poison', 'permanent', 2);

      expect(result.tokens).toEqual({ poison: 1 });
      expect(mockSetPlayer).toHaveBeenCalled();
    });

    it('적에게 토큰을 추가한다 (단일 적)', () => {
      const playerState = createMockPlayer();
      const enemyState = createMockEnemy();

      const actions = createCardExecutionTokenActions({
        playerState,
        enemyState,
        battleRef: mockBattleRef,
        targetUnitIdForAttack: null,
        isCritical: false,
        grantedAt: null,
        addLog: mockAddLog,
        actions: {
          setPlayer: mockSetPlayer,
          setEnemy: mockSetEnemy,
        },
      });

      const result = actions.addTokenToEnemy('vulnerable', 1);

      expect(result.tokens).toEqual({ vulnerable: 1 });
      expect(mockSetEnemy).toHaveBeenCalled();
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

      const actions = createCardExecutionTokenActions({
        playerState,
        enemyState,
        battleRef: mockBattleRef,
        targetUnitIdForAttack: 1,
        isCritical: false,
        grantedAt: null,
        addLog: mockAddLog,
        actions: {
          setPlayer: mockSetPlayer,
          setEnemy: mockSetEnemy,
          setEnemyUnits: mockSetEnemyUnits,
        },
      });

      actions.addTokenToEnemy('vulnerable', 1);

      expect(mockSetEnemyUnits).toHaveBeenCalled();
      expect(mockSetEnemy).toHaveBeenCalled();
      expect(mockAddLog).toHaveBeenCalledWith(expect.stringContaining('슬라임B'));
    });

    it('플레이어 토큰을 특정 스택으로 리셋한다', () => {
      const playerState = { ...createMockPlayer(), tokens: { strength: 5 } };
      const enemyState = createMockEnemy();

      const actions = createCardExecutionTokenActions({
        playerState,
        enemyState,
        battleRef: mockBattleRef,
        targetUnitIdForAttack: null,
        isCritical: false,
        grantedAt: null,
        addLog: mockAddLog,
        actions: {
          setPlayer: mockSetPlayer,
          setEnemy: mockSetEnemy,
        },
      });

      const result = actions.resetTokenForPlayer('strength', 'turn', 2);

      expect(result.tokens).toEqual({ strength: 2 });
      expect(mockSetPlayer).toHaveBeenCalled();
    });

    it('battleRef가 업데이트된다', () => {
      const playerState = createMockPlayer();
      const enemyState = createMockEnemy();

      const actions = createCardExecutionTokenActions({
        playerState,
        enemyState,
        battleRef: mockBattleRef,
        targetUnitIdForAttack: null,
        isCritical: false,
        grantedAt: null,
        addLog: mockAddLog,
        actions: {
          setPlayer: mockSetPlayer,
          setEnemy: mockSetEnemy,
        },
      });

      actions.addTokenToPlayer('strength', 1);

      expect(mockBattleRef.current?.player).toBeDefined();
    });

    it('getCurrentPlayerState가 현재 상태를 반환한다', () => {
      const playerState = createMockPlayer();
      const enemyState = createMockEnemy();

      const actions = createCardExecutionTokenActions({
        playerState,
        enemyState,
        battleRef: mockBattleRef,
        targetUnitIdForAttack: null,
        isCritical: false,
        grantedAt: null,
        addLog: mockAddLog,
        actions: {
          setPlayer: mockSetPlayer,
          setEnemy: mockSetEnemy,
        },
      });

      actions.addTokenToPlayer('strength', 2);
      const currentState = actions.getCurrentPlayerState();

      expect(currentState.tokens).toEqual({ strength: 2 });
    });

    it('getCurrentEnemyState가 현재 상태를 반환한다', () => {
      const playerState = createMockPlayer();
      const enemyState = createMockEnemy();

      const actions = createCardExecutionTokenActions({
        playerState,
        enemyState,
        battleRef: mockBattleRef,
        targetUnitIdForAttack: null,
        isCritical: false,
        grantedAt: null,
        addLog: mockAddLog,
        actions: {
          setPlayer: mockSetPlayer,
          setEnemy: mockSetEnemy,
        },
      });

      actions.addTokenToEnemy('vulnerable', 1);
      const currentState = actions.getCurrentEnemyState();

      expect(currentState.tokens).toEqual({ vulnerable: 1 });
    });

    it('기본 스택 수는 1이다', () => {
      const playerState = createMockPlayer();
      const enemyState = createMockEnemy();

      const actions = createCardExecutionTokenActions({
        playerState,
        enemyState,
        battleRef: mockBattleRef,
        targetUnitIdForAttack: null,
        isCritical: false,
        grantedAt: null,
        addLog: mockAddLog,
        actions: {
          setPlayer: mockSetPlayer,
          setEnemy: mockSetEnemy,
        },
      });

      const result = actions.addTokenToPlayer('strength');

      expect(result.tokens).toEqual({ strength: 1 });
    });

    it('battleRef가 null이어도 동작한다', () => {
      const playerState = createMockPlayer();
      const enemyState = createMockEnemy();
      const nullBattleRef = { current: null };

      const actions = createCardExecutionTokenActions({
        playerState,
        enemyState,
        battleRef: nullBattleRef,
        targetUnitIdForAttack: null,
        isCritical: false,
        grantedAt: null,
        addLog: mockAddLog,
        actions: {
          setPlayer: mockSetPlayer,
          setEnemy: mockSetEnemy,
        },
      });

      // 예외 없이 실행되어야 함
      expect(() => actions.addTokenToPlayer('strength', 1)).not.toThrow();
    });
  });
});
