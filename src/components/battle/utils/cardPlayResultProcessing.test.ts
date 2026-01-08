/**
 * @file cardPlayResultProcessing.test.ts
 * @description 카드 플레이 결과 처리 유틸리티 테스트
 */

import { describe, it, expect, vi } from 'vitest';
import { processCardPlayTokens, mergeAsyncActionResult } from './cardPlayResultProcessing';
import type { TokenEntity } from '../../../types';
import type { CardPlaySpecialsResult } from '../../../types/combat';

// Mock tokenUtils
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
}));

describe('cardPlayResultProcessing', () => {
  describe('processCardPlayTokens', () => {
    const createMockPlayer = (): TokenEntity => ({
      hp: 100,
      maxHp: 100,
      block: 0,
      tokens: {},
    });

    const createMockEnemy = (): TokenEntity => ({
      hp: 50,
      maxHp: 50,
      block: 0,
      tokens: {},
    });

    it('토큰 추가/제거가 없으면 상태를 그대로 반환한다', () => {
      const playerState = createMockPlayer();
      const enemyState = createMockEnemy();
      const cardPlayResult: CardPlaySpecialsResult = {
        events: [],
        tokensToAdd: [],
        tokensToRemove: [],
      };

      const result = processCardPlayTokens({
        cardPlayResult,
        actor: 'player',
        playerState,
        enemyState,
      });

      expect(result.playerState.tokens).toEqual({});
      expect(result.enemyState.tokens).toEqual({});
    });

    it('플레이어가 자신에게 토큰을 추가한다', () => {
      const playerState = createMockPlayer();
      const enemyState = createMockEnemy();
      const cardPlayResult: CardPlaySpecialsResult = {
        events: [],
        tokensToAdd: [{ id: 'strength', stacks: 2 }],
        tokensToRemove: [],
      };

      const result = processCardPlayTokens({
        cardPlayResult,
        actor: 'player',
        playerState,
        enemyState,
      });

      expect(result.playerState.tokens).toEqual({ strength: 2 });
      expect(result.enemyState.tokens).toEqual({});
    });

    it('플레이어가 적에게 토큰을 추가한다 (targetEnemy: true)', () => {
      const playerState = createMockPlayer();
      const enemyState = createMockEnemy();
      const cardPlayResult: CardPlaySpecialsResult = {
        events: [],
        tokensToAdd: [{ id: 'vulnerable', stacks: 1, targetEnemy: true }],
        tokensToRemove: [],
      };

      const result = processCardPlayTokens({
        cardPlayResult,
        actor: 'player',
        playerState,
        enemyState,
      });

      expect(result.playerState.tokens).toEqual({});
      expect(result.enemyState.tokens).toEqual({ vulnerable: 1 });
    });

    it('적이 자신에게 토큰을 추가한다', () => {
      const playerState = createMockPlayer();
      const enemyState = createMockEnemy();
      const cardPlayResult: CardPlaySpecialsResult = {
        events: [],
        tokensToAdd: [{ id: 'block_buff', stacks: 3 }],
        tokensToRemove: [],
      };

      const result = processCardPlayTokens({
        cardPlayResult,
        actor: 'enemy',
        playerState,
        enemyState,
      });

      expect(result.playerState.tokens).toEqual({});
      expect(result.enemyState.tokens).toEqual({ block_buff: 3 });
    });

    it('적이 플레이어에게 토큰을 추가한다 (targetEnemy: true는 자신 기준)', () => {
      const playerState = createMockPlayer();
      const enemyState = createMockEnemy();
      const cardPlayResult: CardPlaySpecialsResult = {
        events: [],
        tokensToAdd: [{ id: 'weak', stacks: 2, targetEnemy: true }],
        tokensToRemove: [],
      };

      const result = processCardPlayTokens({
        cardPlayResult,
        actor: 'enemy',
        playerState,
        enemyState,
      });

      // 적 입장에서 targetEnemy: true면 플레이어에게 추가
      expect(result.playerState.tokens).toEqual({ weak: 2 });
      expect(result.enemyState.tokens).toEqual({});
    });

    it('플레이어가 토큰을 제거한다', () => {
      const playerState = { ...createMockPlayer(), tokens: { poison: 3 } };
      const enemyState = createMockEnemy();
      const cardPlayResult: CardPlaySpecialsResult = {
        events: [],
        tokensToAdd: [],
        tokensToRemove: [{ id: 'poison', stacks: 2 }],
      };

      const result = processCardPlayTokens({
        cardPlayResult,
        actor: 'player',
        playerState,
        enemyState,
      });

      expect(result.playerState.tokens).toEqual({ poison: 1 });
    });

    it('여러 토큰을 동시에 추가한다', () => {
      const playerState = createMockPlayer();
      const enemyState = createMockEnemy();
      const cardPlayResult: CardPlaySpecialsResult = {
        events: [],
        tokensToAdd: [
          { id: 'strength', stacks: 1 },
          { id: 'dexterity', stacks: 2 },
          { id: 'vulnerable', stacks: 1, targetEnemy: true },
        ],
        tokensToRemove: [],
      };

      const result = processCardPlayTokens({
        cardPlayResult,
        actor: 'player',
        playerState,
        enemyState,
      });

      expect(result.playerState.tokens).toEqual({ strength: 1, dexterity: 2 });
      expect(result.enemyState.tokens).toEqual({ vulnerable: 1 });
    });

    it('grantedAt 정보를 전달한다', () => {
      const playerState = createMockPlayer();
      const enemyState = createMockEnemy();
      const grantedAt = { turn: 1, sp: 5 };
      const cardPlayResult: CardPlaySpecialsResult = {
        events: [],
        tokensToAdd: [{ id: 'strength', stacks: 1, grantedAt }],
        tokensToRemove: [],
      };

      const result = processCardPlayTokens({
        cardPlayResult,
        actor: 'player',
        playerState,
        enemyState,
      });

      expect(result.playerState.tokens).toHaveProperty('strength');
    });
  });

  describe('mergeAsyncActionResult', () => {
    it('다중 타격 결과와 cardPlaySpecials 결과를 병합한다', () => {
      const multiHitResult = {
        dealt: 30,
        taken: 10,
        events: [{ type: 'damage' as const, value: 30 }],
        isCritical: true,
        criticalHits: 2,
        createdCards: [],
        defenderTimelineAdvance: 1,
      };

      const cardPlayResult: CardPlaySpecialsResult = {
        events: [{ type: 'heal' as const, value: 5 }],
        tokensToAdd: [],
        tokensToRemove: [],
      };

      const result = mergeAsyncActionResult({
        multiHitResult,
        cardPlayResult,
        playerState: { hp: 90 },
        enemyState: { hp: 20 },
      });

      expect(result.dealt).toBe(30);
      expect(result.taken).toBe(10);
      expect(result.isCritical).toBe(true);
      expect(result.criticalHits).toBe(2);
      expect(result.events).toHaveLength(2);
      expect(result.defenderTimelineAdvance).toBe(1);
      expect(result.cardPlaySpecials).toBe(cardPlayResult);
      expect(result.updatedState.player).toEqual({ hp: 90 });
      expect(result.updatedState.enemy).toEqual({ hp: 20 });
    });

    it('defenderTimelineAdvance가 없으면 0을 반환한다', () => {
      const multiHitResult = {
        dealt: 10,
        taken: 0,
        events: [],
        isCritical: false,
      };

      const cardPlayResult: CardPlaySpecialsResult = {
        events: [],
        tokensToAdd: [],
        tokensToRemove: [],
      };

      const result = mergeAsyncActionResult({
        multiHitResult,
        cardPlayResult,
        playerState: {},
        enemyState: {},
      });

      expect(result.defenderTimelineAdvance).toBe(0);
    });

    it('createdCards를 올바르게 전달한다', () => {
      const createdCard = { id: 'created', name: '생성된 카드' };
      const multiHitResult = {
        dealt: 10,
        taken: 0,
        events: [],
        isCritical: false,
        createdCards: [createdCard],
      };

      const cardPlayResult: CardPlaySpecialsResult = {
        events: [],
        tokensToAdd: [],
        tokensToRemove: [],
      };

      const result = mergeAsyncActionResult({
        multiHitResult,
        cardPlayResult,
        playerState: {},
        enemyState: {},
      });

      expect(result.createdCards).toEqual([createdCard]);
    });

    it('updatedState.log는 빈 배열이다', () => {
      const multiHitResult = {
        dealt: 0,
        taken: 0,
        events: [],
        isCritical: false,
      };

      const cardPlayResult: CardPlaySpecialsResult = {
        events: [],
        tokensToAdd: [],
        tokensToRemove: [],
      };

      const result = mergeAsyncActionResult({
        multiHitResult,
        cardPlayResult,
        playerState: {},
        enemyState: {},
      });

      expect(result.updatedState.log).toEqual([]);
    });
  });
});
