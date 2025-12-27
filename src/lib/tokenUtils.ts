/**
 * @file tokenUtils.ts
 * @description 토큰 시스템 관리 유틸리티 함수
 *
 * ## 토큰 시스템 개요
 * 토큰은 전투 중 캐릭터에게 부여되는 상태 효과
 *
 * ## 토큰 타입
 * - usage: 사용 소모 (1회 사용 후 소멸)
 * - turn: 턴 소모 (해당 턴 동안 지속)
 * - permanent: 반영구 (전투 중 지속)
 *
 * ## 상쇄 시스템
 * 일부 토큰은 반대 토큰과 상쇄됨 (예: 공세 ↔ 약화)
 */

import { TOKENS, TOKEN_TYPES, TOKEN_CATEGORIES, TOKEN_CANCELLATION_MAP, GUN_JAM_REMOVES } from '../data/tokens';
import type {
  TokenInstance,
  TokenState,
  TokenEntity,
  TokenModificationResult,
  TokenDefinition,
  TokenCancelResult as CancelResult,
  TokenDisplayData
} from '../types';

/**
 * 엔티티에 토큰 추가
 * 상쇄 규칙 적용
 */
export function addToken(
  entity: TokenEntity | null | undefined,
  tokenId: string,
  stacks: number = 1,
  grantedAt: { turn: number; sp: number } | null = null
): TokenModificationResult {
  if (!entity) {
    console.warn('[addToken] Entity is null or undefined');
    return { tokens: { usage: [], turn: [], permanent: [] }, logs: [] };
  }

  if (!TOKENS[tokenId]) {
    console.warn(`Unknown token: ${tokenId}`);
    return { tokens: entity.tokens || { usage: [], turn: [], permanent: [] }, logs: [] };
  }

  const token = TOKENS[tokenId];
  const tokens: TokenState = {
    usage: [...(entity.tokens?.usage || [])],
    turn: [...(entity.tokens?.turn || [])],
    permanent: [...(entity.tokens?.permanent || [])]
  };
  const logs: string[] = [];

  if (token.category === TOKEN_CATEGORIES.NEGATIVE && hasToken(entity, 'immunity')) {
    logs.push(`면역으로 ${token.name} 토큰을 막아냈습니다!`);
    const immunityResult = removeToken(entity, 'immunity', TOKEN_TYPES.USAGE, 1);
    return { tokens: immunityResult.tokens, logs: [...logs, ...immunityResult.logs] };
  }

  const oppositeTokenId = (TOKEN_CANCELLATION_MAP as any)[tokenId];
  if (oppositeTokenId) {
    const cancelled = cancelTokens(tokens, tokenId, oppositeTokenId, stacks);
    if (cancelled.cancelled > 0) {
      logs.push(`${token.name}와 ${TOKENS[oppositeTokenId].name}이(가) ${cancelled.cancelled}스택 상쇄되었습니다!`);

      if (tokenId === 'loaded') {
        return { tokens: cancelled.tokens, logs };
      }

      return { tokens: cancelled.tokens, logs };
    }
    stacks = cancelled.remaining;

    if (tokenId === 'loaded') {
      logs.push(`탄걸림이 없어 장전 효과 없음`);
      return { tokens, logs };
    }

    if (tokenId === 'gun_jam') {
      for (const type of [TOKEN_TYPES.USAGE, TOKEN_TYPES.TURN, TOKEN_TYPES.PERMANENT]) {
        const arr = tokens[type] || [];
        if (arr.some(t => t.id === 'gun_jam')) {
          logs.push(`이미 탄걸림 상태`);
          return { tokens, logs };
        }
      }
      for (const removeTokenId of GUN_JAM_REMOVES) {
        for (const type of [TOKEN_TYPES.USAGE, TOKEN_TYPES.TURN, TOKEN_TYPES.PERMANENT]) {
          const arr = tokens[type] || [];
          const idx = arr.findIndex(t => t.id === removeTokenId);
          if (idx !== -1) {
            arr.splice(idx, 1);
            logs.push(`탄걸림 발생으로 ${TOKENS[removeTokenId]?.name || removeTokenId} 제거됨`);
          }
        }
      }
    }
  }

  if (tokenId === 'roulette') {
    for (const type of [TOKEN_TYPES.USAGE, TOKEN_TYPES.TURN, TOKEN_TYPES.PERMANENT]) {
      const arr = tokens[type] || [];
      if (arr.some(t => t.id === 'gun_jam')) {
        logs.push(`탄걸림 상태에서는 룰렛 누적 안됨`);
        return { tokens, logs };
      }
    }
  }

  const tokenType = token.type;
  const typeArray = tokens[tokenType] || [];
  const existingIndex = typeArray.findIndex((t: any) => t.id === tokenId);

  if (existingIndex !== -1) {
    typeArray[existingIndex] = {
      ...typeArray[existingIndex],
      stacks: typeArray[existingIndex].stacks + stacks
    };
    if (tokenType === TOKEN_TYPES.TURN && grantedAt) {
      typeArray[existingIndex].grantedAt = grantedAt;
    }
  } else {
    const newToken: TokenInstance = { id: tokenId, stacks };
    if (tokenType === TOKEN_TYPES.TURN && grantedAt) {
      newToken.grantedAt = grantedAt;
    }
    typeArray.push(newToken);
  }

  tokens[tokenType] = typeArray;
  logs.push(`${token.name} 토큰 ${stacks}스택 획득!`);

  return { tokens, logs };
}

/**
 * 토큰 스택을 특정 값으로 설정 (리셋용)
 */
export function setTokenStacks(
  entity: TokenEntity,
  tokenId: string,
  tokenType: string,
  newStacks: number
): TokenModificationResult {
  const tokens = { ...entity.tokens } as TokenState;
  const logs: string[] = [];
  const typeArray = [...((tokens as any)[tokenType] || [])];
  const existingIndex = typeArray.findIndex((t: any) => t.id === tokenId);
  const token = TOKENS[tokenId];

  if (existingIndex === -1) {
    if (newStacks > 0) {
      typeArray.push({ id: tokenId, stacks: newStacks });
      logs.push(`${token?.name || tokenId} 토큰 ${newStacks}스택 설정`);
    }
  } else if (newStacks <= 0) {
    typeArray.splice(existingIndex, 1);
    logs.push(`${token?.name || tokenId} 초기화`);
  } else {
    const oldStacks = typeArray[existingIndex].stacks;
    typeArray[existingIndex] = {
      ...typeArray[existingIndex],
      stacks: newStacks
    };
    logs.push(`${token?.name || tokenId} 초기화 (${oldStacks} → ${newStacks})`);
  }

  (tokens as any)[tokenType] = typeArray;
  return { tokens, logs };
}

/**
 * 엔티티에서 토큰 제거
 */
export function removeToken(
  entity: TokenEntity | null | undefined,
  tokenId: string,
  tokenType: string,
  stacks: number = 1
): TokenModificationResult {
  if (!entity) {
    console.warn('[removeToken] Entity is null or undefined');
    return { tokens: { usage: [], turn: [], permanent: [] }, logs: [] };
  }

  const tokens = { ...entity.tokens } as TokenState;
  const logs: string[] = [];
  const typeArray = (tokens as any)[tokenType] || [];
  const existingIndex = typeArray.findIndex((t: any) => t.id === tokenId);

  if (existingIndex === -1) {
    return { tokens: entity.tokens as TokenState, logs };
  }

  const token = TOKENS[tokenId];
  const currentStacks = typeArray[existingIndex].stacks;
  const newStacks = currentStacks - stacks;

  if (newStacks <= 0) {
    typeArray.splice(existingIndex, 1);
    logs.push(`${token.name} 토큰 소모`);
  } else {
    typeArray[existingIndex] = {
      ...typeArray[existingIndex],
      stacks: newStacks
    };
  }

  (tokens as any)[tokenType] = typeArray;
  return { tokens, logs };
}

/**
 * 턴 종료 시 grantedAt이 없는 턴소모 토큰만 제거
 */
export function clearTurnTokens(entity: TokenEntity | null | undefined): TokenModificationResult {
  if (!entity) {
    return { tokens: { usage: [], turn: [], permanent: [] }, logs: [] };
  }

  const tokens = { ...entity.tokens } as TokenState;
  const logs: string[] = [];

  const turnTokens = tokens[TOKEN_TYPES.TURN] || [];
  const remainingTokens: TokenInstance[] = [];

  turnTokens.forEach((t: any) => {
    if (t.grantedAt) {
      remainingTokens.push(t);
    } else {
      const token = TOKENS[t.id];
      if (token) {
        logs.push(`${token.name} 토큰 ${t.stacks}스택 소멸 (턴 종료)`);
      }
    }
  });

  tokens[TOKEN_TYPES.TURN] = remainingTokens;
  return { tokens, logs };
}

/**
 * 타임라인 기반 턴소모 토큰 만료 처리
 */
export function expireTurnTokensByTimeline(
  entity: TokenEntity,
  currentTurn: number,
  currentSp: number
): TokenModificationResult {
  const tokens = { ...entity.tokens } as TokenState;
  const logs: string[] = [];

  const turnTokens = tokens[TOKEN_TYPES.TURN] || [];
  const remainingTokens: TokenInstance[] = [];

  turnTokens.forEach((t: any) => {
    if (!t.grantedAt) {
      remainingTokens.push(t);
      return;
    }

    const { turn: grantedTurn, sp: grantedSp } = t.grantedAt;
    const isExpired = currentTurn > grantedTurn && currentSp >= grantedSp;

    if (isExpired) {
      const token = TOKENS[t.id];
      if (token) {
        logs.push(`${token.name} 토큰 ${t.stacks}스택 소멸 (SP ${grantedSp} 도달)`);
      }
    } else {
      remainingTokens.push(t);
    }
  });

  tokens[TOKEN_TYPES.TURN] = remainingTokens;
  return { tokens, logs };
}

/**
 * 토큰 상쇄 처리 (내부 함수)
 */
function cancelTokens(
  tokens: TokenState,
  newTokenId: string,
  oppositeTokenId: string,
  stacks: number
): CancelResult {
  const oppositeToken = TOKENS[oppositeTokenId];

  if (!oppositeToken) {
    return { cancelled: 0, remaining: stacks, tokens };
  }

  let oppositeStacks = 0;
  let oppositeType: string | null = null;
  let oppositeIndex = -1;

  for (const type of [TOKEN_TYPES.USAGE, TOKEN_TYPES.TURN, TOKEN_TYPES.PERMANENT]) {
    const typeArray = (tokens as any)[type] || [];
    const index = typeArray.findIndex((t: any) => t.id === oppositeTokenId);
    if (index !== -1) {
      oppositeStacks = typeArray[index].stacks;
      oppositeType = type;
      oppositeIndex = index;
      break;
    }
  }

  if (oppositeStacks === 0 || oppositeType === null) {
    return { cancelled: 0, remaining: stacks, tokens };
  }

  const cancelled = Math.min(stacks, oppositeStacks);
  const remainingNew = stacks - cancelled;
  const remainingOpposite = oppositeStacks - cancelled;

  const typeArray = [...((tokens as any)[oppositeType] || [])];
  if (remainingOpposite <= 0) {
    typeArray.splice(oppositeIndex, 1);
  } else {
    typeArray[oppositeIndex] = {
      ...typeArray[oppositeIndex],
      stacks: remainingOpposite
    };
  }

  const updatedTokens = { ...tokens };
  (updatedTokens as any)[oppositeType] = typeArray;

  return { cancelled, remaining: remainingNew, tokens: updatedTokens };
}

/**
 * 특정 토큰 보유 여부 확인
 */
export function hasToken(entity: TokenEntity | null | undefined, tokenId: string): boolean {
  if (!entity || !entity.tokens) return false;

  for (const type of [TOKEN_TYPES.USAGE, TOKEN_TYPES.TURN, TOKEN_TYPES.PERMANENT]) {
    const typeArray = entity.tokens[type] || [];
    if (typeArray.some((t: any) => t.id === tokenId && t.stacks > 0)) {
      return true;
    }
  }
  return false;
}

/**
 * 특정 토큰의 총 스택 수 가져오기
 */
export function getTokenStacks(entity: TokenEntity | null | undefined, tokenId: string): number {
  if (!entity || !entity.tokens) return 0;

  for (const type of [TOKEN_TYPES.USAGE, TOKEN_TYPES.TURN, TOKEN_TYPES.PERMANENT]) {
    const typeArray = entity.tokens[type] || [];
    const token = typeArray.find((t: any) => t.id === tokenId);
    if (token) {
      return token.stacks;
    }
  }
  return 0;
}

/**
 * 엔티티의 모든 토큰 가져오기 (정렬된 배열)
 */
export function getAllTokens(entity: TokenEntity | null | undefined): TokenDisplayData[] {
  if (!entity || !entity.tokens) return [];

  const allTokens: TokenDisplayData[] = [];

  for (const type of [TOKEN_TYPES.PERMANENT, TOKEN_TYPES.USAGE, TOKEN_TYPES.TURN]) {
    const typeArray = entity.tokens[type] || [];
    typeArray.forEach((t: any) => {
      const tokenData = TOKENS[t.id];
      if (tokenData) {
        allTokens.push({
          ...tokenData,
          ...t,
          durationType: type
        });
      }
    });
  }

  return allTokens;
}

/**
 * 토큰이 빈 상태인지 확인
 */
export function hasNoTokens(entity: TokenEntity): boolean {
  if (!entity.tokens) return true;

  for (const type of [TOKEN_TYPES.USAGE, TOKEN_TYPES.TURN, TOKEN_TYPES.PERMANENT]) {
    const typeArray = entity.tokens[type] || [];
    if (typeArray.length > 0) {
      return false;
    }
  }
  return true;
}

/**
 * 빈 토큰 상태 생성
 */
export function createEmptyTokens(): TokenState {
  return {
    usage: [],
    turn: [],
    permanent: []
  };
}
