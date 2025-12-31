/**
 * @file tokenActionHandlers.ts
 * @description 카드 onPlay 콜백용 토큰 액션 핸들러 생성 유틸리티
 *
 * ## 주요 기능
 * - createTokenActions: onPlay 콜백에 전달할 토큰 액션 객체 생성
 * - 치명타 시 토큰 스택 보너스 처리
 * - 다중 유닛 시스템 지원 (타겟 유닛에 토큰 부여)
 */

import { addToken, removeToken, setTokenStacks } from '../../../lib/tokenUtils';
import { TOKENS } from '../../../data/tokens';
import type { TokenEntity, TokenType, TokenState } from '../../../types/core';

/** 유닛 정보 타입 */
interface UnitInfo {
  unitId: number;
  name?: string;
  tokens?: TokenState;
}

/** 토큰 액션 생성 파라미터 */
interface CreateTokenActionsParams {
  playerState: TokenEntity & { tokens?: TokenState };
  enemyState: TokenEntity & { tokens?: TokenState; units?: UnitInfo[] };
  isCritical: boolean;
  targetUnitIdForAttack: number | null;
  grantedAt: { turn: number; sp: number } | null;
  addLog: (msg: string) => void;
  onPlayerUpdate: (player: TokenEntity) => void;
  onEnemyUpdate: (enemy: TokenEntity) => void;
  onUnitsUpdate: (units: UnitInfo[]) => void;
}

/** 토큰 액션 결과 */
interface TokenActionResult {
  tokens: TokenState;
  logs: string[];
}

/** 토큰 액션 인터페이스 */
export interface TokenActions {
  addTokenToPlayer: (tokenId: string, stacks?: number) => TokenActionResult;
  removeTokenFromPlayer: (tokenId: string, tokenType: TokenType, stacks?: number) => TokenActionResult;
  addTokenToEnemy: (tokenId: string, stacks?: number) => TokenActionResult;
  resetTokenForPlayer: (tokenId: string, tokenType: TokenType, newStacks?: number) => TokenActionResult;
}

/**
 * 카드 onPlay 콜백용 토큰 액션 객체 생성
 */
export function createTokenActions(params: CreateTokenActionsParams): TokenActions {
  const {
    playerState,
    enemyState,
    isCritical,
    targetUnitIdForAttack,
    grantedAt,
    addLog,
    onPlayerUpdate,
    onEnemyUpdate,
    onUnitsUpdate
  } = params;

  // 뮤터블 상태 복사 (클로저 내에서 업데이트)
  let currentPlayer = { ...playerState };
  let currentEnemy = { ...enemyState };

  return {
    addTokenToPlayer: (tokenId: string, stacks = 1) => {
      const actualStacks = isCritical ? stacks + 1 : stacks;
      if (isCritical) {
        addLog(`💥 치명타! ${tokenId} +1 강화`);
      }
      const result = addToken(currentPlayer as TokenEntity, tokenId, actualStacks, grantedAt);
      currentPlayer = { ...currentPlayer, tokens: result.tokens };
      onPlayerUpdate(currentPlayer);
      result.logs.forEach(log => addLog(log));
      return result;
    },

    removeTokenFromPlayer: (tokenId: string, tokenType: TokenType, stacks = 1) => {
      const result = removeToken(currentPlayer as TokenEntity, tokenId, tokenType, stacks);
      currentPlayer = { ...currentPlayer, tokens: result.tokens };
      onPlayerUpdate(currentPlayer);
      result.logs.forEach(log => addLog(log));
      return result;
    },

    addTokenToEnemy: (tokenId: string, stacks = 1) => {
      const actualStacks = isCritical ? stacks + 1 : stacks;
      if (isCritical) {
        addLog(`💥 치명타! ${tokenId} +1 강화`);
      }

      // 다중 유닛 시스템: 타겟 유닛에 토큰 부여
      const currentUnits = currentEnemy.units || [];
      if (currentUnits.length > 0 && targetUnitIdForAttack !== null) {
        const updatedUnits = currentUnits.map(u => {
          if (u.unitId === targetUnitIdForAttack) {
            const unitResult = addToken(u as TokenEntity, tokenId, actualStacks, grantedAt);
            return { ...u, tokens: unitResult.tokens };
          }
          return u;
        });
        currentEnemy = { ...currentEnemy, units: updatedUnits };
        onUnitsUpdate(updatedUnits);
        onEnemyUpdate(currentEnemy);

        const targetUnit = currentUnits.find(u => u.unitId === targetUnitIdForAttack);
        const targetName = targetUnit?.name || '적';
        const tokenName = TOKENS[tokenId]?.name || tokenId;
        addLog(`🎯 ${targetName}에게 ${tokenName} 부여`);

        const updatedUnit = updatedUnits.find(u => u.unitId === targetUnitIdForAttack);
        return { tokens: (updatedUnit?.tokens || {}) as TokenState, logs: [] };
      }

      // 단일 적 또는 타겟 없음: 기존 방식
      const result = addToken(currentEnemy as TokenEntity, tokenId, actualStacks, grantedAt);
      currentEnemy = { ...currentEnemy, tokens: result.tokens };
      onEnemyUpdate(currentEnemy);
      result.logs.forEach(log => addLog(log));
      return result;
    },

    resetTokenForPlayer: (tokenId: string, tokenType: TokenType, newStacks = 0) => {
      const result = setTokenStacks(currentPlayer as TokenEntity, tokenId, tokenType, newStacks);
      currentPlayer = { ...currentPlayer, tokens: result.tokens };
      onPlayerUpdate(currentPlayer);
      result.logs.forEach(log => addLog(log));
      return result;
    }
  };
}
