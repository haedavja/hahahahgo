/**
 * @file adapters.ts
 * @description 토큰 저장소 형식 변환 어댑터
 *
 * 게임(배열 기반)과 시뮬레이터(객체 기반) 간의 토큰 데이터 변환을 제공합니다.
 */

// ==================== 타입 정의 ====================

/** 게임의 토큰 인스턴스 */
export interface GameTokenInstance {
  id: string;
  stacks: number;
  grantedAt?: { turn: number; sp: number };
}

/** 게임의 토큰 상태 (배열 기반) */
export interface GameTokenState {
  usage: GameTokenInstance[];
  turn: GameTokenInstance[];
  permanent: GameTokenInstance[];
}

/** 시뮬레이터의 토큰 상태 (객체 기반) */
export interface SimTokenState {
  [tokenId: string]: number;
}

/** 토큰 정의 */
export interface TokenDefinition {
  id: string;
  name: string;
  type: 'usage' | 'turn' | 'permanent';
  category: 'positive' | 'negative' | 'neutral';
  description?: string;
}

// ==================== 게임 → 시뮬레이터 변환 ====================

/**
 * 게임 토큰 상태를 시뮬레이터 형식으로 변환
 */
export function gameToSimTokens(gameTokens: GameTokenState): SimTokenState {
  const simTokens: SimTokenState = {};

  for (const type of ['usage', 'turn', 'permanent'] as const) {
    const tokens = gameTokens[type] || [];
    for (const token of tokens) {
      simTokens[token.id] = (simTokens[token.id] || 0) + token.stacks;
    }
  }

  return simTokens;
}

/**
 * 게임 토큰에서 스택 수 조회 (시뮬레이터 호환)
 */
export function getGameTokenStacks(gameTokens: GameTokenState, tokenId: string): number {
  for (const type of ['usage', 'turn', 'permanent'] as const) {
    const tokens = gameTokens[type] || [];
    const token = tokens.find(t => t.id === tokenId);
    if (token) {
      return token.stacks;
    }
  }
  return 0;
}

/**
 * 게임 토큰 보유 여부 확인 (시뮬레이터 호환)
 */
export function hasGameToken(gameTokens: GameTokenState, tokenId: string): boolean {
  return getGameTokenStacks(gameTokens, tokenId) > 0;
}

// ==================== 시뮬레이터 → 게임 변환 ====================

/**
 * 시뮬레이터 토큰 상태를 게임 형식으로 변환
 * @param tokenDefs 토큰 정의 (타입 결정용)
 */
export function simToGameTokens(
  simTokens: SimTokenState,
  tokenDefs: Record<string, TokenDefinition>
): GameTokenState {
  const gameTokens: GameTokenState = {
    usage: [],
    turn: [],
    permanent: [],
  };

  for (const [tokenId, stacks] of Object.entries(simTokens)) {
    if (stacks <= 0) continue;

    const def = tokenDefs[tokenId];
    const type = def?.type || 'usage';

    gameTokens[type].push({
      id: tokenId,
      stacks,
    });
  }

  return gameTokens;
}

/**
 * 시뮬레이터 토큰에서 스택 수 조회
 */
export function getSimTokenStacks(simTokens: SimTokenState, tokenId: string): number {
  return simTokens[tokenId] || 0;
}

/**
 * 시뮬레이터 토큰 보유 여부 확인
 */
export function hasSimToken(simTokens: SimTokenState, tokenId: string): boolean {
  return (simTokens[tokenId] || 0) > 0;
}

// ==================== 통합 인터페이스 ====================

/**
 * 토큰 접근자 인터페이스 (저장소 형식 독립적)
 */
export interface TokenAccessor {
  getStacks(tokenId: string): number;
  hasToken(tokenId: string): boolean;
}

/**
 * 게임 토큰용 접근자 생성
 */
export function createGameTokenAccessor(gameTokens: GameTokenState): TokenAccessor {
  return {
    getStacks: (tokenId: string) => getGameTokenStacks(gameTokens, tokenId),
    hasToken: (tokenId: string) => hasGameToken(gameTokens, tokenId),
  };
}

/**
 * 시뮬레이터 토큰용 접근자 생성
 */
export function createSimTokenAccessor(simTokens: SimTokenState): TokenAccessor {
  return {
    getStacks: (tokenId: string) => getSimTokenStacks(simTokens, tokenId),
    hasToken: (tokenId: string) => hasSimToken(simTokens, tokenId),
  };
}

// ==================== 빈 상태 생성 ====================

/**
 * 빈 게임 토큰 상태 생성
 */
export function createEmptyGameTokens(): GameTokenState {
  return {
    usage: [],
    turn: [],
    permanent: [],
  };
}

/**
 * 빈 시뮬레이터 토큰 상태 생성
 */
export function createEmptySimTokens(): SimTokenState {
  return {};
}

// ==================== 토큰 조작 (시뮬레이터 형식) ====================

/**
 * 시뮬레이터 토큰 추가
 */
export function addSimToken(
  tokens: SimTokenState,
  tokenId: string,
  stacks: number = 1
): SimTokenState {
  const newTokens = { ...tokens };
  newTokens[tokenId] = (newTokens[tokenId] || 0) + stacks;
  return newTokens;
}

/**
 * 시뮬레이터 토큰 제거
 */
export function removeSimToken(
  tokens: SimTokenState,
  tokenId: string,
  stacks: number = 1
): SimTokenState {
  const newTokens = { ...tokens };
  if (newTokens[tokenId]) {
    newTokens[tokenId] = Math.max(0, newTokens[tokenId] - stacks);
    if (newTokens[tokenId] === 0) {
      delete newTokens[tokenId];
    }
  }
  return newTokens;
}

/**
 * 시뮬레이터 토큰 완전 제거
 */
export function clearSimToken(tokens: SimTokenState, tokenId: string): SimTokenState {
  const newTokens = { ...tokens };
  delete newTokens[tokenId];
  return newTokens;
}

// ==================== 토큰 조작 (게임 형식) ====================

/**
 * 게임 토큰 추가
 */
export function addGameToken(
  tokens: GameTokenState,
  tokenId: string,
  stacks: number = 1,
  type: 'usage' | 'turn' | 'permanent' = 'usage',
  grantedAt?: { turn: number; sp: number }
): GameTokenState {
  const newTokens: GameTokenState = {
    usage: [...tokens.usage],
    turn: [...tokens.turn],
    permanent: [...tokens.permanent],
  };

  const typeArray = newTokens[type];
  const existingIndex = typeArray.findIndex(t => t.id === tokenId);

  if (existingIndex !== -1) {
    typeArray[existingIndex] = {
      ...typeArray[existingIndex],
      stacks: typeArray[existingIndex].stacks + stacks,
    };
    if (grantedAt) {
      typeArray[existingIndex].grantedAt = grantedAt;
    }
  } else {
    const newToken: GameTokenInstance = { id: tokenId, stacks };
    if (grantedAt) {
      newToken.grantedAt = grantedAt;
    }
    typeArray.push(newToken);
  }

  return newTokens;
}

/**
 * 게임 토큰 제거
 */
export function removeGameToken(
  tokens: GameTokenState,
  tokenId: string,
  type: 'usage' | 'turn' | 'permanent',
  stacks: number = 1
): GameTokenState {
  const newTokens: GameTokenState = {
    usage: [...tokens.usage],
    turn: [...tokens.turn],
    permanent: [...tokens.permanent],
  };

  const typeArray = newTokens[type];
  const existingIndex = typeArray.findIndex(t => t.id === tokenId);

  if (existingIndex === -1) {
    return tokens;
  }

  const currentStacks = typeArray[existingIndex].stacks;
  const newStacks = currentStacks - stacks;

  if (newStacks <= 0) {
    typeArray.splice(existingIndex, 1);
  } else {
    typeArray[existingIndex] = {
      ...typeArray[existingIndex],
      stacks: newStacks,
    };
  }

  return newTokens;
}

/**
 * 턴 종료 시 turn 타입 토큰 정리
 */
export function clearGameTurnTokens(tokens: GameTokenState): GameTokenState {
  const newTokens: GameTokenState = {
    usage: [...tokens.usage],
    turn: tokens.turn.filter(t => t.grantedAt !== undefined),
    permanent: [...tokens.permanent],
  };
  return newTokens;
}

// ==================== 유틸리티 ====================

/**
 * 토큰 상태 깊은 복사 (게임)
 */
export function cloneGameTokens(tokens: GameTokenState): GameTokenState {
  return {
    usage: tokens.usage.map(t => ({ ...t })),
    turn: tokens.turn.map(t => ({ ...t })),
    permanent: tokens.permanent.map(t => ({ ...t })),
  };
}

/**
 * 토큰 상태 깊은 복사 (시뮬레이터)
 */
export function cloneSimTokens(tokens: SimTokenState): SimTokenState {
  return { ...tokens };
}

/**
 * 게임 토큰이 비어있는지 확인
 */
export function isGameTokensEmpty(tokens: GameTokenState): boolean {
  return (
    tokens.usage.length === 0 &&
    tokens.turn.length === 0 &&
    tokens.permanent.length === 0
  );
}

/**
 * 시뮬레이터 토큰이 비어있는지 확인
 */
export function isSimTokensEmpty(tokens: SimTokenState): boolean {
  return Object.keys(tokens).length === 0;
}
