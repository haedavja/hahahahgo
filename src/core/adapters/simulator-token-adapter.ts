/**
 * @file simulator-token-adapter.ts
 * @description 시뮬레이터용 토큰 어댑터
 *
 * 시뮬레이터의 객체 기반 TokenState는 이미 UnifiedTokenState와 호환
 * 대부분 패스스루 함수로 구현
 */

import type { UnifiedTokenState, TokenDefinition } from '../combat/types';
import type { TokenDefinitionMap } from '../combat/token-core';
import * as TokenCore from '../combat/token-core';

// ==================== 시뮬레이터 타입 정의 ====================

/** 시뮬레이터의 토큰 상태 (이미 객체 기반) */
export type SimulatorTokenState = UnifiedTokenState;

/** 시뮬레이터의 토큰 엔티티 */
export interface SimulatorTokenEntity {
  tokens?: SimulatorTokenState;
  [key: string]: unknown;
}

/** 시뮬레이터용 토큰 수정 결과 */
export interface SimulatorTokenModificationResult {
  tokens: SimulatorTokenState;
  logs: string[];
  cancelled?: {
    tokenId: string;
    amount: number;
    byToken: string;
  };
}

// ==================== 어댑터 래퍼 함수 ====================

/**
 * 토큰 추가 (시뮬레이터용 래퍼)
 */
export function addToken(
  entity: SimulatorTokenEntity | null | undefined,
  tokenId: string,
  stacks: number = 1,
  definitions?: TokenDefinitionMap
): SimulatorTokenModificationResult {
  if (!entity) {
    return {
      tokens: {},
      logs: ['[addToken] Entity is null'],
    };
  }

  const result = TokenCore.addToken(entity.tokens || {}, tokenId, stacks, definitions);

  return {
    tokens: result.tokens,
    logs: result.logs,
    cancelled: result.cancelled,
  };
}

/**
 * 토큰 제거 (시뮬레이터용 래퍼)
 */
export function removeToken(
  entity: SimulatorTokenEntity | null | undefined,
  tokenId: string,
  stacks: number = 1
): SimulatorTokenModificationResult {
  if (!entity) {
    return {
      tokens: {},
      logs: ['[removeToken] Entity is null'],
    };
  }

  const result = TokenCore.removeToken(entity.tokens || {}, tokenId, stacks);

  return {
    tokens: result.tokens,
    logs: result.logs,
  };
}

/**
 * 토큰 보유 확인 (시뮬레이터용 래퍼)
 */
export function hasToken(entity: SimulatorTokenEntity | null | undefined, tokenId: string): boolean {
  if (!entity?.tokens) return false;
  return TokenCore.hasToken(entity.tokens, tokenId);
}

/**
 * 토큰 스택 수 조회 (시뮬레이터용 래퍼)
 */
export function getTokenStacks(entity: SimulatorTokenEntity | null | undefined, tokenId: string): number {
  if (!entity?.tokens) return 0;
  return TokenCore.getTokenStacks(entity.tokens, tokenId);
}

/**
 * 공격 수정자 계산 (시뮬레이터용 래퍼)
 */
export function calculateAttackModifiers(entity: SimulatorTokenEntity | null | undefined): TokenCore.AttackModifiers {
  if (!entity?.tokens) {
    return { attackMultiplier: 1, damageBonus: 0, critBoost: 0, ignoreBlock: false, lifesteal: 0 };
  }
  return TokenCore.calculateAttackModifiers(entity.tokens);
}

/**
 * 방어 수정자 계산 (시뮬레이터용 래퍼)
 */
export function calculateDefenseModifiers(entity: SimulatorTokenEntity | null | undefined): TokenCore.DefenseModifiers {
  if (!entity?.tokens) {
    return { defenseMultiplier: 1, defenseBonus: 0, dodgeChance: 0 };
  }
  return TokenCore.calculateDefenseModifiers(entity.tokens);
}

/**
 * 받는 피해 수정자 계산 (시뮬레이터용 래퍼)
 */
export function calculateDamageTakenModifiers(entity: SimulatorTokenEntity | null | undefined): TokenCore.DamageTakenModifiers {
  if (!entity?.tokens) {
    return { damageMultiplier: 1, damageReduction: 0 };
  }
  return TokenCore.calculateDamageTakenModifiers(entity.tokens);
}

/**
 * 공격 토큰 소모 (시뮬레이터용 래퍼)
 */
export function consumeAttackTokens(entity: SimulatorTokenEntity | null | undefined): SimulatorTokenModificationResult {
  if (!entity) {
    return {
      tokens: {},
      logs: [],
    };
  }

  const result = TokenCore.consumeAttackTokens(entity.tokens || {});

  return {
    tokens: result.tokens,
    logs: result.logs,
  };
}

/**
 * 방어 토큰 소모 (시뮬레이터용 래퍼)
 */
export function consumeDefenseTokens(entity: SimulatorTokenEntity | null | undefined): SimulatorTokenModificationResult {
  if (!entity) {
    return {
      tokens: {},
      logs: [],
    };
  }

  const result = TokenCore.consumeDefenseTokens(entity.tokens || {});

  return {
    tokens: result.tokens,
    logs: result.logs,
  };
}

/**
 * 턴 종료 처리 (시뮬레이터용 래퍼)
 */
export function processTurnEnd(
  entity: SimulatorTokenEntity | null | undefined,
  definitions: TokenDefinitionMap
): SimulatorTokenModificationResult {
  if (!entity) {
    return {
      tokens: {},
      logs: [],
    };
  }

  const result = TokenCore.processTurnEnd(entity.tokens || {}, definitions);

  return {
    tokens: result.tokens,
    logs: result.logs,
  };
}

// ==================== 유틸리티 함수 ====================

/**
 * 토큰 상태 복사 (불변성 보장)
 */
export function cloneTokens(tokens: SimulatorTokenState | undefined): SimulatorTokenState {
  if (!tokens) return {};
  return { ...tokens };
}

/**
 * 토큰 상태 병합
 */
export function mergeTokens(
  base: SimulatorTokenState | undefined,
  additions: SimulatorTokenState | undefined
): SimulatorTokenState {
  const result: SimulatorTokenState = { ...(base || {}) };

  if (additions) {
    for (const [tokenId, stacks] of Object.entries(additions)) {
      result[tokenId] = (result[tokenId] || 0) + stacks;
    }
  }

  return result;
}

/**
 * 토큰 상태 초기화
 */
export function clearTokens(): SimulatorTokenState {
  return {};
}
