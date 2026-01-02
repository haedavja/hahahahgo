/**
 * @file tokenExpirationProcessing.ts
 * @description 타임라인 기반 토큰 만료 처리 유틸리티
 */

import { expireTurnTokensByTimeline } from '../../../lib/tokenUtils';
import type { TokenEntity } from '../../../types';

interface TokenExpirationParams {
  playerState: TokenEntity;
  enemyState: TokenEntity;
  turnNumber: number;
  currentSp: number;
  addLog: (msg: string) => void;
}

interface TokenExpirationResult {
  playerState: TokenEntity;
  enemyState: TokenEntity;
  hasChanges: boolean;
}

/**
 * 타임라인 기반 토큰 만료 처리 (현재 SP 도달 시 이전 턴에서 부여된 토큰 제거)
 */
export function processTokenExpiration(params: TokenExpirationParams): TokenExpirationResult {
  const { playerState, enemyState, turnNumber, currentSp, addLog } = params;
  let P = { ...playerState };
  let E = { ...enemyState };
  let hasChanges = false;

  const playerExpireResult = expireTurnTokensByTimeline(P as TokenEntity, turnNumber, currentSp);
  const enemyExpireResult = expireTurnTokensByTimeline(E as TokenEntity, turnNumber, currentSp);

  if (playerExpireResult.logs.length > 0) {
    P = { ...P, tokens: playerExpireResult.tokens };
    playerExpireResult.logs.forEach(log => addLog(log));
    hasChanges = true;
  }

  if (enemyExpireResult.logs.length > 0) {
    E = { ...E, tokens: enemyExpireResult.tokens };
    enemyExpireResult.logs.forEach(log => addLog(log));
    hasChanges = true;
  }

  return { playerState: P, enemyState: E, hasChanges };
}
