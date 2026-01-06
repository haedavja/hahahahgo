/**
 * @file executionEffects.ts
 * @description 처형 효과 (바이올랑 모르 등) 처리 유틸리티
 */

import { getAllTokens, removeToken } from '../../../lib/tokenUtils';
import { hasSpecial } from './cardSpecialEffects';
import { adjustFinesseGain } from '../../../lib/anomalyEffectUtils';
import type { TokenEntity, TokenState } from '../../../types';
import type { Card } from '../../../types/core';

interface AnomalyPlayerState {
  finesseBlockLevel?: number;
  [key: string]: unknown;
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
      const reviveToken = getAllTokens(E).find(t => t.effect?.type === 'REVIVE');

      if (reviveToken) {
        const reviveRemoveResult = removeToken(E, reviveToken.id, 'usage', reviveToken.stacks || 1);
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
  playerAnomalyState?: AnomalyPlayerState;
  addLog: (msg: string) => void;
  addToken: (entity: TokenEntity, tokenId: string, stacks: number) => { tokens: TokenState };
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
  const { isCritical, criticalHits, actor, playerState, playerAnomalyState, addLog, addToken } = params;
  let P = { ...playerState };
  let finesseGained = 0;

  if (isCritical && actor === 'player') {
    const critCount = (typeof criticalHits === 'number') ? criticalHits : 1;
    // 이변: 광기 (FINESSE_BLOCK) - 기교 획득량 조정
    const adjustedFinesse = playerAnomalyState
      ? adjustFinesseGain(critCount, playerAnomalyState)
      : critCount;

    if (adjustedFinesse > 0) {
      const finesseResult = addToken(P as TokenEntity, 'finesse', adjustedFinesse);
      P.tokens = finesseResult.tokens;
      finesseGained = adjustedFinesse;
      addLog(`✨ 치명타! 기교 +${adjustedFinesse} 획득`);
    } else {
      addLog(`🌀 이변 "광기" - 기교 획득 차단됨`);
    }
  }

  return { playerState: P, finesseGained };
}
