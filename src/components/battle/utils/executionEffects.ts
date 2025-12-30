/**
 * @file executionEffects.ts
 * @description 처형 효과 (바이올랑 모르 등) 처리 유틸리티
 */

import { getAllTokens, removeToken } from '../../../lib/tokenUtils';
import { hasSpecial } from './cardSpecialEffects';
import type { TokenEntity, TokenInstance, TokenState } from '../../../types';
import type { Card } from '../../../types/core';

interface TokenEffect {
  type: string;
}

export interface ExecutionParams {
  card: Card;
  actor: 'player' | 'enemy';
  enemyState: TokenEntity & { hp: number; executed?: boolean };
  addLog: (msg: string) => void;
}

export interface ExecutionResult {
  enemyState: TokenEntity & { hp: number; executed?: boolean };
  executed: boolean;
}

const EXECUTION_THRESHOLD = 30;

/**
 * 바이올랑 모르: 처형 효과 (체력 30 이하 적 즉시 처형)
 */
export function processViolentMortExecution(params: ExecutionParams): ExecutionResult {
  const { card, actor, enemyState, addLog } = params;
  let E = { ...enemyState };
  let executed = false;

  if (hasSpecial(card, 'violentMort') && actor === 'player' && card.type === 'attack') {
    if (E.hp > 0 && E.hp <= EXECUTION_THRESHOLD) {
      // 부활 토큰 제거 후 처형
      const reviveToken = (getAllTokens(E as TokenEntity) as unknown as Array<TokenInstance & { effect?: TokenEffect }>)
        .find((t: TokenInstance & { effect?: TokenEffect }) => t.effect?.type === 'REVIVE');

      if (reviveToken) {
        const reviveRemoveResult = removeToken(E as TokenEntity, reviveToken.id, 'usage', reviveToken.stacks || 1);
        E = { ...E, tokens: reviveRemoveResult.tokens };
        addLog(`💀 처형: 부활 무시!`);
      }

      // 즉시 처형
      E.hp = 0;
      E.executed = true;
      executed = true;
      addLog(`💀 바이올랑 모르: 적 체력 ${EXECUTION_THRESHOLD} 이하! 처형!`);
    }
  }

  return { enemyState: E, executed };
}

interface CriticalFinesseParams {
  isCritical: boolean;
  criticalHits?: number;
  actor: 'player' | 'enemy';
  playerState: TokenEntity;
  addLog: (msg: string) => void;
  addToken: (entity: TokenEntity, tokenId: string, stacks: number) => { tokens: Record<string, unknown> };
}

interface CriticalFinesseResult {
  playerState: TokenEntity;
  finesseGained: number;
}

/**
 * 치명타 발생 시 기교 토큰 부여 (플레이어만)
 * 다단 공격의 경우 치명타 횟수만큼 부여, 단일 공격은 1회
 */
export function processCriticalFinesseGain(params: CriticalFinesseParams): CriticalFinesseResult {
  const { isCritical, criticalHits, actor, playerState, addLog, addToken } = params;
  let P = { ...playerState };
  let finesseGained = 0;

  if (isCritical && actor === 'player') {
    const critCount = (typeof criticalHits === 'number') ? criticalHits : 1;
    const finesseResult = addToken(P as TokenEntity, 'finesse', critCount);
    P.tokens = finesseResult.tokens as unknown as TokenState;
    finesseGained = critCount;
    addLog(`✨ 치명타! 기교 +${critCount} 획득`);
  }

  return { playerState: P, finesseGained };
}
