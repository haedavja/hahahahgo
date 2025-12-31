/**
 * @file cardPlayResultProcessing.ts
 * @description 카드 플레이 결과 처리 유틸리티
 */

import { addToken, removeToken, type TokenEntity } from '../../../lib/tokenUtils';
import type { BattleEvent, CardPlaySpecialsResult } from '../../../types/combat';

interface TokenInfo {
  id: string;
  stacks: number;
  grantedAt?: { turn: number; sp: number } | null;
  targetEnemy?: boolean;
}

interface ProcessCardPlayTokensParams {
  cardPlayResult: CardPlaySpecialsResult;
  actor: 'player' | 'enemy';
  playerState: TokenEntity;
  enemyState: TokenEntity;
}

interface ProcessCardPlayTokensResult {
  playerState: TokenEntity;
  enemyState: TokenEntity;
}

/**
 * cardPlaySpecials 결과에서 토큰 추가/제거 처리
 */
export function processCardPlayTokens({
  cardPlayResult,
  actor,
  playerState,
  enemyState,
}: ProcessCardPlayTokensParams): ProcessCardPlayTokensResult {
  let P = { ...playerState };
  let E = { ...enemyState };

  // 토큰 추가 처리
  if (cardPlayResult.tokensToAdd && cardPlayResult.tokensToAdd.length > 0) {
    cardPlayResult.tokensToAdd.forEach((tokenInfo: TokenInfo) => {
      const isPlayerAction = actor === 'player';
      const targetIsEnemy = tokenInfo.targetEnemy === true;
      const applyToEnemy = isPlayerAction ? targetIsEnemy : !targetIsEnemy;

      if (applyToEnemy) {
        const tokenResult = addToken(E, tokenInfo.id, tokenInfo.stacks, tokenInfo.grantedAt);
        E = { ...E, tokens: tokenResult.tokens };
      } else {
        const tokenResult = addToken(P, tokenInfo.id, tokenInfo.stacks, tokenInfo.grantedAt);
        P = { ...P, tokens: tokenResult.tokens };
      }
    });
  }

  // 토큰 제거 처리
  if (cardPlayResult.tokensToRemove && cardPlayResult.tokensToRemove.length > 0) {
    cardPlayResult.tokensToRemove.forEach((tokenInfo: TokenInfo) => {
      if (actor === 'player') {
        const tokenResult = removeToken(P, tokenInfo.id, 'permanent', tokenInfo.stacks);
        P = { ...P, tokens: tokenResult.tokens };
      } else {
        const tokenResult = removeToken(E, tokenInfo.id, 'permanent', tokenInfo.stacks);
        E = { ...E, tokens: tokenResult.tokens };
      }
    });
  }

  return { playerState: P, enemyState: E };
}

interface MergeActionResultParams {
  multiHitResult: {
    dealt: number;
    taken: number;
    events: BattleEvent[];
    isCritical: boolean;
    criticalHits?: number;
    createdCards?: unknown[];
    defenderTimelineAdvance?: number;
  };
  cardPlayResult: CardPlaySpecialsResult;
  playerState: unknown;
  enemyState: unknown;
}

/**
 * 비동기 다중 타격 결과와 cardPlaySpecials 결과 병합
 */
export function mergeAsyncActionResult({
  multiHitResult,
  cardPlayResult,
  playerState,
  enemyState,
}: MergeActionResultParams) {
  return {
    dealt: multiHitResult.dealt,
    taken: multiHitResult.taken,
    events: [...multiHitResult.events, ...cardPlayResult.events],
    isCritical: multiHitResult.isCritical,
    criticalHits: multiHitResult.criticalHits,
    createdCards: multiHitResult.createdCards,
    updatedState: { player: playerState, enemy: enemyState, log: [] },
    cardPlaySpecials: cardPlayResult,
    defenderTimelineAdvance: multiHitResult.defenderTimelineAdvance || 0,
  };
}
