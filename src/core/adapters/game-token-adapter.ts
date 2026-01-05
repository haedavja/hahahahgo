/**
 * @file game-token-adapter.ts
 * @description 게임용 토큰 어댑터
 *
 * 게임의 배열 기반 TokenState ↔ 공통 코어 UnifiedTokenState 변환
 * 게임 코드에서 점진적으로 이 어댑터를 통해 코어 함수를 사용
 */

import type { UnifiedTokenState, TokenDefinition } from '../combat/types';
import type { TokenDefinitionMap } from '../combat/token-core';
import * as TokenCore from '../combat/token-core';

// ==================== 게임 타입 정의 ====================

/** 게임의 토큰 인스턴스 */
export interface GameTokenInstance {
  id: string;
  stacks: number;
  grantedAt?: { turn: number; sp: number };
}

/** 게임의 TokenState (배열 기반) */
export interface GameTokenState {
  usage?: GameTokenInstance[];
  turn?: GameTokenInstance[];
  permanent?: GameTokenInstance[];
  [key: string]: GameTokenInstance[] | undefined;
}

/** 게임의 토큰 엔티티 */
export interface GameTokenEntity {
  tokens?: GameTokenState;
  [key: string]: unknown;
}

/** 게임용 토큰 수정 결과 */
export interface GameTokenModificationResult {
  tokens: GameTokenState;
  logs: string[];
  cancelled?: {
    tokenId: string;
    amount: number;
    byToken: string;
  };
}

// ==================== 변환 함수 ====================

/**
 * 게임 TokenState(배열) → UnifiedTokenState(객체) 변환
 */
export function toUnifiedTokens(gameTokens: GameTokenState | undefined): UnifiedTokenState {
  const unified: UnifiedTokenState = {};

  if (!gameTokens) return unified;

  // 각 타입의 토큰 배열을 순회하며 객체로 변환
  const tokenTypes: Array<'usage' | 'turn' | 'permanent'> = ['usage', 'turn', 'permanent'];

  for (const type of tokenTypes) {
    const tokenArray = gameTokens[type];
    if (tokenArray) {
      for (const instance of tokenArray) {
        // 같은 ID의 토큰이 여러 타입에 있을 수 있으므로 합산
        unified[instance.id] = (unified[instance.id] || 0) + instance.stacks;
      }
    }
  }

  return unified;
}

/**
 * UnifiedTokenState(객체) → 게임 TokenState(배열) 변환
 * 토큰 정의가 필요함 (각 토큰의 타입을 알아야 함)
 */
export function toGameTokens(
  unified: UnifiedTokenState,
  definitions: TokenDefinitionMap,
  preserveGrantedAt?: GameTokenState
): GameTokenState {
  const result: GameTokenState = {
    usage: [],
    turn: [],
    permanent: [],
  };

  for (const [tokenId, stacks] of Object.entries(unified)) {
    if (stacks <= 0) continue;

    const def = definitions[tokenId];
    const tokenType = def?.type || 'usage'; // 기본값 usage

    // 이전 grantedAt 정보 보존
    let grantedAt: { turn: number; sp: number } | undefined;
    if (preserveGrantedAt) {
      const oldArray = preserveGrantedAt[tokenType];
      if (oldArray) {
        const oldInstance = oldArray.find(t => t.id === tokenId);
        grantedAt = oldInstance?.grantedAt;
      }
    }

    const instance: GameTokenInstance = { id: tokenId, stacks };
    if (grantedAt) instance.grantedAt = grantedAt;

    result[tokenType]!.push(instance);
  }

  return result;
}

// ==================== 어댑터 래퍼 함수 ====================

/**
 * 토큰 추가 (게임용 래퍼)
 */
export function addToken(
  entity: GameTokenEntity | null | undefined,
  tokenId: string,
  stacks: number = 1,
  definitions: TokenDefinitionMap,
  grantedAt?: { turn: number; sp: number }
): GameTokenModificationResult {
  if (!entity) {
    return {
      tokens: { usage: [], turn: [], permanent: [] },
      logs: ['[addToken] Entity is null'],
    };
  }

  // 게임 → 통합 형식 변환
  const unified = toUnifiedTokens(entity.tokens);

  // 코어 함수 호출
  const result = TokenCore.addToken(unified, tokenId, stacks, definitions);

  // 통합 → 게임 형식 변환
  const gameTokens = toGameTokens(result.tokens, definitions, entity.tokens);

  // grantedAt 설정 (새로 추가된 토큰)
  if (grantedAt) {
    const def = definitions[tokenId];
    const tokenType = def?.type || 'usage';
    const tokenArray = gameTokens[tokenType];
    if (tokenArray) {
      const instance = tokenArray.find(t => t.id === tokenId);
      if (instance && !instance.grantedAt) {
        instance.grantedAt = grantedAt;
      }
    }
  }

  return {
    tokens: gameTokens,
    logs: result.logs,
    cancelled: result.cancelled,
  };
}

/**
 * 토큰 제거 (게임용 래퍼)
 */
export function removeToken(
  entity: GameTokenEntity | null | undefined,
  tokenId: string,
  stacks: number = 1,
  definitions: TokenDefinitionMap
): GameTokenModificationResult {
  if (!entity) {
    return {
      tokens: { usage: [], turn: [], permanent: [] },
      logs: ['[removeToken] Entity is null'],
    };
  }

  const unified = toUnifiedTokens(entity.tokens);
  const result = TokenCore.removeToken(unified, tokenId, stacks);
  const gameTokens = toGameTokens(result.tokens, definitions, entity.tokens);

  return {
    tokens: gameTokens,
    logs: result.logs,
  };
}

/**
 * 토큰 보유 확인 (게임용 래퍼)
 */
export function hasToken(entity: GameTokenEntity | null | undefined, tokenId: string): boolean {
  if (!entity?.tokens) return false;
  const unified = toUnifiedTokens(entity.tokens);
  return TokenCore.hasToken(unified, tokenId);
}

/**
 * 토큰 스택 수 조회 (게임용 래퍼)
 */
export function getTokenStacks(entity: GameTokenEntity | null | undefined, tokenId: string): number {
  if (!entity?.tokens) return 0;
  const unified = toUnifiedTokens(entity.tokens);
  return TokenCore.getTokenStacks(unified, tokenId);
}

/**
 * 공격 수정자 계산 (게임용 래퍼)
 */
export function calculateAttackModifiers(entity: GameTokenEntity | null | undefined): TokenCore.AttackModifiers {
  if (!entity?.tokens) {
    return { attackMultiplier: 1, damageBonus: 0, critBoost: 0, ignoreBlock: false, lifesteal: 0 };
  }
  const unified = toUnifiedTokens(entity.tokens);
  return TokenCore.calculateAttackModifiers(unified);
}

/**
 * 방어 수정자 계산 (게임용 래퍼)
 */
export function calculateDefenseModifiers(entity: GameTokenEntity | null | undefined): TokenCore.DefenseModifiers {
  if (!entity?.tokens) {
    return { defenseMultiplier: 1, defenseBonus: 0, dodgeChance: 0 };
  }
  const unified = toUnifiedTokens(entity.tokens);
  return TokenCore.calculateDefenseModifiers(unified);
}

/**
 * 받는 피해 수정자 계산 (게임용 래퍼)
 */
export function calculateDamageTakenModifiers(entity: GameTokenEntity | null | undefined): TokenCore.DamageTakenModifiers {
  if (!entity?.tokens) {
    return { damageMultiplier: 1, damageReduction: 0 };
  }
  const unified = toUnifiedTokens(entity.tokens);
  return TokenCore.calculateDamageTakenModifiers(unified);
}

/**
 * 턴 종료 처리 (게임용 래퍼)
 */
export function processTurnEnd(
  entity: GameTokenEntity | null | undefined,
  definitions: TokenDefinitionMap
): GameTokenModificationResult {
  if (!entity) {
    return {
      tokens: { usage: [], turn: [], permanent: [] },
      logs: [],
    };
  }

  const unified = toUnifiedTokens(entity.tokens);
  const result = TokenCore.processTurnEnd(unified, definitions);
  const gameTokens = toGameTokens(result.tokens, definitions, entity.tokens);

  return {
    tokens: gameTokens,
    logs: result.logs,
  };
}
