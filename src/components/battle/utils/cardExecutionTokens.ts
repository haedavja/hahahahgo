/**
 * @file cardExecutionTokens.ts
 * @description 카드 실행 시 토큰 관련 처리 유틸리티
 */

import { addToken, removeToken, setTokenStacks } from '../../../lib/tokenUtils';
import type { TokenEntity, TokenType } from '../../../types';
import { TOKENS } from '../../../data/tokens';

interface TokenActions {
  setPlayer: (player: unknown) => void;
  setEnemy: (enemy: unknown) => void;
  setEnemyUnits?: (units: unknown[]) => void;
}

interface CreateTokenActionsParams {
  playerState: TokenEntity & { tokens?: unknown };
  enemyState: TokenEntity & { tokens?: unknown; units?: Array<{ unitId: number; name?: string; tokens?: unknown }> };
  battleRef: React.MutableRefObject<{ player?: unknown; enemy?: unknown } | null>;
  targetUnitIdForAttack: number | null;
  isCritical: boolean;
  grantedAt: { turn: number; sp: number } | null;
  addLog: (msg: string) => void;
  actions: TokenActions;
}

/**
 * 카드 onPlay에서 사용할 토큰 액션 객체 생성
 */
export function createCardExecutionTokenActions({
  playerState,
  enemyState,
  battleRef,
  targetUnitIdForAttack,
  isCritical,
  grantedAt,
  addLog,
  actions,
}: CreateTokenActionsParams) {
  // 플레이어 상태 복사 (mutable)
  let P = { ...playerState };
  let E = { ...enemyState };

  return {
    addTokenToPlayer: (tokenId: string, stacks = 1) => {
      const actualStacks = isCritical ? stacks + 1 : stacks;
      if (isCritical) {
        addLog(`💥 치명타! ${tokenId} +1 강화`);
      }
      const result = addToken(P, tokenId, actualStacks, grantedAt);
      P.tokens = result.tokens;
      if (battleRef.current) {
        battleRef.current = { ...battleRef.current, player: { ...P } };
      }
      actions.setPlayer({ ...P });
      result.logs.forEach(log => addLog(log));
      return result;
    },

    removeTokenFromPlayer: (tokenId: string, tokenType: TokenType, stacks = 1) => {
      const result = removeToken(P, tokenId, tokenType, stacks);
      P.tokens = result.tokens;
      if (battleRef.current) {
        battleRef.current = { ...battleRef.current, player: { ...P } };
      }
      actions.setPlayer({ ...P });
      result.logs.forEach(log => addLog(log));
      return result;
    },

    addTokenToEnemy: (tokenId: string, stacks = 1) => {
      const actualStacks = isCritical ? stacks + 1 : stacks;
      if (isCritical) {
        addLog(`💥 치명타! ${tokenId} +1 강화`);
      }

      // 다중 유닛 시스템: 타겟 유닛에 토큰 부여
      const currentUnits = E.units || [];
      if (currentUnits.length > 0 && targetUnitIdForAttack !== null) {
        const updatedUnits = currentUnits.map(u => {
          if (u.unitId === targetUnitIdForAttack) {
            const unitResult = addToken(u as TokenEntity, tokenId, actualStacks, grantedAt);
            return { ...u, tokens: unitResult.tokens };
          }
          return u;
        });
        E.units = updatedUnits;
        if (battleRef.current) {
          battleRef.current = { ...battleRef.current, enemy: { ...E } };
        }
        actions.setEnemy({ ...E });
        if (actions.setEnemyUnits) {
          actions.setEnemyUnits(updatedUnits);
        }
        const targetUnit = currentUnits.find(u => u.unitId === targetUnitIdForAttack);
        const targetName = targetUnit?.name || '적';
        const tokenName = TOKENS[tokenId]?.name || tokenId;
        addLog(`🎯 ${targetName}에게 ${tokenName} 부여`);
        return { tokens: updatedUnits.find(u => u.unitId === targetUnitIdForAttack)?.tokens || {}, logs: [] };
      }

      // 단일 적 또는 타겟 없음: 기존 방식
      const result = addToken(E, tokenId, actualStacks, grantedAt);
      E.tokens = result.tokens;
      if (battleRef.current) {
        battleRef.current = { ...battleRef.current, enemy: { ...E } };
      }
      actions.setEnemy({ ...E });
      result.logs.forEach(log => addLog(log));
      return result;
    },

    resetTokenForPlayer: (tokenId: string, tokenType: TokenType, newStacks = 0) => {
      const result = setTokenStacks(P, tokenId, tokenType, newStacks);
      P.tokens = result.tokens;
      if (battleRef.current) {
        battleRef.current = { ...battleRef.current, player: { ...P } };
      }
      actions.setPlayer({ ...P });
      result.logs.forEach(log => addLog(log));
      return result;
    },

    // 현재 상태 반환 (외부에서 참조할 수 있도록)
    getCurrentPlayerState: () => P,
    getCurrentEnemyState: () => E,
  };
}
