/**
 * @file executionEffects.test.ts
 * @description 처형 효과 (바이올랑 모르 등) 처리 유틸리티 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processViolentMortExecution, processCriticalFinesseGain } from './executionEffects';
import type { TokenEntity } from '../../../types';
import type { Card } from '../../../types/core';

// Mock dependencies
vi.mock('../../../lib/tokenUtils', () => ({
  getAllTokens: vi.fn((entity) => {
    const tokens = entity.tokens || {};
    return Object.entries(tokens).map(([id, stacks]) => ({
      id,
      stacks,
      effect: id === 'revive' ? { type: 'REVIVE' } : undefined,
    }));
  }),
  removeToken: vi.fn((entity, _tokenId, _tokenType, _stacks) => ({
    tokens: {},
    logs: ['토큰 제거됨'],
  })),
}));

vi.mock('./cardSpecialEffects', () => ({
  hasSpecial: vi.fn((card: Card, special: string) => {
    if (!card.special) return false;
    if (Array.isArray(card.special)) return card.special.includes(special);
    return card.special === special;
  }),
}));

vi.mock('../../../lib/anomalyEffectUtils', () => ({
  adjustFinesseGain: vi.fn((amount: number, playerState: { finesseBlockLevel?: number }) => {
    if (playerState.finesseBlockLevel && playerState.finesseBlockLevel > 0) {
      return Math.max(0, amount - playerState.finesseBlockLevel);
    }
    return amount;
  }),
}));

describe('executionEffects', () => {
  describe('processViolentMortExecution', () => {
    const createMockCard = (overrides: Partial<Card> = {}): Card => ({
      id: 'test-card',
      name: '테스트 카드',
      type: 'attack',
      baseAtk: 10,
      slot: 1,
      ...overrides,
    });

    const createMockEnemy = (hp: number): TokenEntity & { hp: number; executed?: boolean } => ({
      hp,
      maxHp: 100,
      block: 0,
      tokens: {},
    });

    let mockAddLog: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockAddLog = vi.fn();
    });

    it('violentMort 특수 효과가 없으면 처형하지 않는다', () => {
      const card = createMockCard({ special: undefined });
      const enemyState = createMockEnemy(20);

      const result = processViolentMortExecution({
        card,
        actor: 'player',
        enemyState,
        addLog: mockAddLog,
      });

      expect(result.executed).toBe(false);
      expect(result.enemyState.hp).toBe(20);
    });

    it('적 행위자면 처형하지 않는다', () => {
      const card = createMockCard({ special: 'violentMort' });
      const enemyState = createMockEnemy(20);

      const result = processViolentMortExecution({
        card,
        actor: 'enemy',
        enemyState,
        addLog: mockAddLog,
      });

      expect(result.executed).toBe(false);
    });

    it('공격 카드가 아니면 처형하지 않는다', () => {
      const card = createMockCard({ type: 'defense', special: 'violentMort' });
      const enemyState = createMockEnemy(20);

      const result = processViolentMortExecution({
        card,
        actor: 'player',
        enemyState,
        addLog: mockAddLog,
      });

      expect(result.executed).toBe(false);
    });

    it('적 체력이 30 초과면 처형하지 않는다', () => {
      const card = createMockCard({ type: 'attack', special: 'violentMort' });
      const enemyState = createMockEnemy(31);

      const result = processViolentMortExecution({
        card,
        actor: 'player',
        enemyState,
        addLog: mockAddLog,
      });

      expect(result.executed).toBe(false);
      expect(result.enemyState.hp).toBe(31);
    });

    it('적 체력이 30 이하면 처형한다', () => {
      const card = createMockCard({ type: 'attack', special: 'violentMort' });
      const enemyState = createMockEnemy(30);

      const result = processViolentMortExecution({
        card,
        actor: 'player',
        enemyState,
        addLog: mockAddLog,
      });

      expect(result.executed).toBe(true);
      expect(result.enemyState.hp).toBe(0);
      expect(result.enemyState.executed).toBe(true);
      expect(mockAddLog).toHaveBeenCalledWith(expect.stringContaining('바이올랑 모르'));
    });

    it('적 체력이 1이면 처형한다', () => {
      const card = createMockCard({ type: 'attack', special: 'violentMort' });
      const enemyState = createMockEnemy(1);

      const result = processViolentMortExecution({
        card,
        actor: 'player',
        enemyState,
        addLog: mockAddLog,
      });

      expect(result.executed).toBe(true);
      expect(result.enemyState.hp).toBe(0);
    });

    it('적 체력이 0 이하면 처형하지 않는다', () => {
      const card = createMockCard({ type: 'attack', special: 'violentMort' });
      const enemyState = createMockEnemy(0);

      const result = processViolentMortExecution({
        card,
        actor: 'player',
        enemyState,
        addLog: mockAddLog,
      });

      expect(result.executed).toBe(false);
    });

    it('부활 토큰이 있으면 제거하고 처형한다', () => {
      const card = createMockCard({ type: 'attack', special: 'violentMort' });
      const enemyState: TokenEntity & { hp: number; executed?: boolean } = {
        hp: 20,
        maxHp: 100,
        block: 0,
        tokens: { revive: 1 },
      };

      const result = processViolentMortExecution({
        card,
        actor: 'player',
        enemyState,
        addLog: mockAddLog,
      });

      expect(result.executed).toBe(true);
      expect(result.enemyState.hp).toBe(0);
      expect(mockAddLog).toHaveBeenCalledWith(expect.stringContaining('부활 무시'));
    });
  });

  describe('processCriticalFinesseGain', () => {
    const createMockPlayer = (): TokenEntity => ({
      hp: 100,
      maxHp: 100,
      block: 0,
      tokens: {},
    });

    let mockAddLog: ReturnType<typeof vi.fn>;
    let mockAddToken: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockAddLog = vi.fn();
      mockAddToken = vi.fn((entity, tokenId, stacks) => ({
        tokens: { ...(entity.tokens || {}), [tokenId]: stacks },
      }));
    });

    it('치명타가 아니면 기교를 부여하지 않는다', () => {
      const playerState = createMockPlayer();

      const result = processCriticalFinesseGain({
        isCritical: false,
        actor: 'player',
        playerState,
        addLog: mockAddLog,
        addToken: mockAddToken,
      });

      expect(result.finesseGained).toBe(0);
      expect(mockAddToken).not.toHaveBeenCalled();
    });

    it('적 행위자면 기교를 부여하지 않는다', () => {
      const playerState = createMockPlayer();

      const result = processCriticalFinesseGain({
        isCritical: true,
        actor: 'enemy',
        playerState,
        addLog: mockAddLog,
        addToken: mockAddToken,
      });

      expect(result.finesseGained).toBe(0);
      expect(mockAddToken).not.toHaveBeenCalled();
    });

    it('치명타 시 기교 1을 부여한다', () => {
      const playerState = createMockPlayer();

      const result = processCriticalFinesseGain({
        isCritical: true,
        actor: 'player',
        playerState,
        addLog: mockAddLog,
        addToken: mockAddToken,
      });

      expect(result.finesseGained).toBe(1);
      expect(mockAddToken).toHaveBeenCalledWith(expect.anything(), 'finesse', 1);
      expect(mockAddLog).toHaveBeenCalledWith(expect.stringContaining('기교'));
    });

    it('다단 공격의 경우 치명타 횟수만큼 기교를 부여한다', () => {
      const playerState = createMockPlayer();

      const result = processCriticalFinesseGain({
        isCritical: true,
        criticalHits: 3,
        actor: 'player',
        playerState,
        addLog: mockAddLog,
        addToken: mockAddToken,
      });

      expect(result.finesseGained).toBe(3);
      expect(mockAddToken).toHaveBeenCalledWith(expect.anything(), 'finesse', 3);
    });

    it('이변 "광기"로 기교 획득이 차단된다', () => {
      const playerState = createMockPlayer();

      const result = processCriticalFinesseGain({
        isCritical: true,
        criticalHits: 2,
        actor: 'player',
        playerState,
        playerAnomalyState: { finesseBlockLevel: 5 },
        addLog: mockAddLog,
        addToken: mockAddToken,
      });

      // adjustFinesseGain mock: 2 - 5 = -3 -> 0
      expect(result.finesseGained).toBe(0);
      expect(mockAddLog).toHaveBeenCalledWith(expect.stringContaining('광기'));
    });

    it('이변으로 일부 기교만 차단된다', () => {
      const playerState = createMockPlayer();

      const result = processCriticalFinesseGain({
        isCritical: true,
        criticalHits: 3,
        actor: 'player',
        playerState,
        playerAnomalyState: { finesseBlockLevel: 1 },
        addLog: mockAddLog,
        addToken: mockAddToken,
      });

      // adjustFinesseGain mock: 3 - 1 = 2
      expect(result.finesseGained).toBe(2);
      expect(mockAddToken).toHaveBeenCalledWith(expect.anything(), 'finesse', 2);
    });
  });
});
