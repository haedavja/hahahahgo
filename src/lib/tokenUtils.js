/**
 * tokenUtils.js
 *
 * 토큰 시스템 관리 유틸리티 함수
 */

import { TOKENS, TOKEN_TYPES, TOKEN_CATEGORIES, TOKEN_CANCELLATION_MAP } from '../data/tokens';

/**
 * 엔티티에 토큰 추가
 * 상쇄 규칙 적용
 *
 * @param {Object} entity - player 또는 enemy 객체
 * @param {string} tokenId - 토큰 ID
 * @param {number} stacks - 추가할 스택 수 (기본값: 1)
 * @returns {Object} 업데이트된 토큰 상태 및 로그 메시지
 */
export function addToken(entity, tokenId, stacks = 1) {
  if (!TOKENS[tokenId]) {
    console.warn(`Unknown token: ${tokenId}`);
    return { tokens: entity.tokens, logs: [] };
  }

  const token = TOKENS[tokenId];
  // 깊은 복사로 토큰 객체 생성
  const tokens = {
    usage: [...(entity.tokens?.usage || [])],
    turn: [...(entity.tokens?.turn || [])],
    permanent: [...(entity.tokens?.permanent || [])]
  };
  const logs = [];

  // 면역 토큰이 있고 부정 토큰을 추가하려는 경우
  if (token.category === TOKEN_CATEGORIES.NEGATIVE && hasToken(entity, 'immunity')) {
    logs.push(`면역으로 ${token.name} 토큰을 막아냈습니다!`);
    // 면역 토큰 1스택 소모
    const immunityResult = removeToken(entity, 'immunity', TOKEN_TYPES.USAGE, 1);
    return { tokens: immunityResult.tokens, logs: [...logs, ...immunityResult.logs] };
  }

  // 상쇄 처리
  const oppositeTokenId = TOKEN_CANCELLATION_MAP[tokenId];
  if (oppositeTokenId) {
    const cancelled = cancelTokens(tokens, tokenId, oppositeTokenId, stacks);
    if (cancelled.cancelled > 0) {
      logs.push(`${token.name}와 ${TOKENS[oppositeTokenId].name}이(가) ${cancelled.cancelled}스택 상쇄되었습니다!`);

      // 장전 토큰은 탄걸림만 제거하고 누적되지 않음
      if (tokenId === 'loaded') {
        return { tokens: cancelled.tokens, logs };
      }

      return { tokens: cancelled.tokens, logs };
    }
    stacks = cancelled.remaining;

    // 장전 토큰은 탄걸림이 없으면 추가되지 않음
    if (tokenId === 'loaded') {
      logs.push(`탄걸림이 없어 장전 효과 없음`);
      return { tokens, logs };
    }

    // 탄걸림 토큰은 장전이 없으면 1스택만 유지 (누적 안됨)
    if (tokenId === 'gun_jam') {
      // 이미 탄걸림이 있으면 추가하지 않음
      for (const type of [TOKEN_TYPES.USAGE, TOKEN_TYPES.TURN, TOKEN_TYPES.PERMANENT]) {
        const arr = tokens[type] || [];
        if (arr.some(t => t.id === 'gun_jam')) {
          logs.push(`이미 탄걸림 상태`);
          return { tokens, logs };
        }
      }
    }
  }

  // 토큰 추가
  const tokenType = token.type;
  const typeArray = tokens[tokenType] || [];
  const existingIndex = typeArray.findIndex(t => t.id === tokenId);

  if (existingIndex !== -1) {
    // 기존 토큰 스택 증가
    typeArray[existingIndex] = {
      ...typeArray[existingIndex],
      stacks: typeArray[existingIndex].stacks + stacks
    };
  } else {
    // 새 토큰 추가
    typeArray.push({ id: tokenId, stacks });
  }

  tokens[tokenType] = typeArray;
  logs.push(`${token.name} 토큰 ${stacks}스택 획득!`);

  return { tokens, logs };
}

/**
 * 엔티티에서 토큰 제거
 *
 * @param {Object} entity - player 또는 enemy 객체
 * @param {string} tokenId - 토큰 ID
 * @param {string} tokenType - 토큰 유형 (usage, turn, permanent)
 * @param {number} stacks - 제거할 스택 수 (기본값: 1)
 * @returns {Object} 업데이트된 토큰 상태 및 로그 메시지
 */
export function removeToken(entity, tokenId, tokenType, stacks = 1) {
  const tokens = { ...entity.tokens };
  const logs = [];
  const typeArray = tokens[tokenType] || [];
  const existingIndex = typeArray.findIndex(t => t.id === tokenId);

  if (existingIndex === -1) {
    return { tokens: entity.tokens, logs };
  }

  const token = TOKENS[tokenId];
  const currentStacks = typeArray[existingIndex].stacks;
  const newStacks = currentStacks - stacks;

  if (newStacks <= 0) {
    // 토큰 완전 제거
    typeArray.splice(existingIndex, 1);
    logs.push(`${token.name} 토큰 소모`);
  } else {
    // 스택 감소
    typeArray[existingIndex] = {
      ...typeArray[existingIndex],
      stacks: newStacks
    };
  }

  tokens[tokenType] = typeArray;
  return { tokens, logs };
}

/**
 * 턴 종료 시 턴소모 토큰 모두 제거
 *
 * @param {Object} entity - player 또는 enemy 객체
 * @returns {Object} 업데이트된 토큰 상태 및 로그 메시지
 */
export function clearTurnTokens(entity) {
  const tokens = { ...entity.tokens };
  const logs = [];

  const turnTokens = tokens[TOKEN_TYPES.TURN] || [];
  turnTokens.forEach(t => {
    const token = TOKENS[t.id];
    if (token) {
      logs.push(`${token.name} 토큰 ${t.stacks}스택 소멸 (턴 종료)`);
    }
  });

  tokens[TOKEN_TYPES.TURN] = [];
  return { tokens, logs };
}

/**
 * 토큰 상쇄 처리
 *
 * @param {Object} tokens - 토큰 상태
 * @param {string} newTokenId - 새로 추가하려는 토큰 ID
 * @param {string} oppositeTokenId - 반대 토큰 ID
 * @param {number} stacks - 추가하려는 스택 수
 * @returns {Object} { cancelled: 상쇄된 스택 수, remaining: 남은 스택 수, tokens: 업데이트된 토큰 상태 }
 */
function cancelTokens(tokens, newTokenId, oppositeTokenId, stacks) {
  const newToken = TOKENS[newTokenId];
  const oppositeToken = TOKENS[oppositeTokenId];

  if (!oppositeToken) {
    return { cancelled: 0, remaining: stacks, tokens };
  }

  // 반대 토큰 찾기 (모든 유형에서)
  let oppositeStacks = 0;
  let oppositeType = null;
  let oppositeIndex = -1;

  for (const type of [TOKEN_TYPES.USAGE, TOKEN_TYPES.TURN, TOKEN_TYPES.PERMANENT]) {
    const typeArray = tokens[type] || [];
    const index = typeArray.findIndex(t => t.id === oppositeTokenId);
    if (index !== -1) {
      oppositeStacks = typeArray[index].stacks;
      oppositeType = type;
      oppositeIndex = index;
      break;
    }
  }

  if (oppositeStacks === 0) {
    return { cancelled: 0, remaining: stacks, tokens };
  }

  // 상쇄 계산
  const cancelled = Math.min(stacks, oppositeStacks);
  const remainingNew = stacks - cancelled;
  const remainingOpposite = oppositeStacks - cancelled;

  // 반대 토큰 업데이트
  const typeArray = [...(tokens[oppositeType] || [])];
  if (remainingOpposite <= 0) {
    typeArray.splice(oppositeIndex, 1);
  } else {
    typeArray[oppositeIndex] = {
      ...typeArray[oppositeIndex],
      stacks: remainingOpposite
    };
  }

  const updatedTokens = { ...tokens };
  updatedTokens[oppositeType] = typeArray;

  return { cancelled, remaining: remainingNew, tokens: updatedTokens };
}

/**
 * 특정 토큰 보유 여부 확인
 *
 * @param {Object} entity - player 또는 enemy 객체
 * @param {string} tokenId - 토큰 ID
 * @returns {boolean} 토큰 보유 여부
 */
export function hasToken(entity, tokenId) {
  if (!entity.tokens) return false;

  for (const type of [TOKEN_TYPES.USAGE, TOKEN_TYPES.TURN, TOKEN_TYPES.PERMANENT]) {
    const typeArray = entity.tokens[type] || [];
    if (typeArray.some(t => t.id === tokenId && t.stacks > 0)) {
      return true;
    }
  }
  return false;
}

/**
 * 특정 토큰의 총 스택 수 가져오기
 *
 * @param {Object} entity - player 또는 enemy 객체
 * @param {string} tokenId - 토큰 ID
 * @returns {number} 토큰 스택 수
 */
export function getTokenStacks(entity, tokenId) {
  if (!entity.tokens) return 0;

  for (const type of [TOKEN_TYPES.USAGE, TOKEN_TYPES.TURN, TOKEN_TYPES.PERMANENT]) {
    const typeArray = entity.tokens[type] || [];
    const token = typeArray.find(t => t.id === tokenId);
    if (token) {
      return token.stacks;
    }
  }
  return 0;
}

/**
 * 엔티티의 모든 토큰 가져오기 (정렬된 배열)
 *
 * @param {Object} entity - player 또는 enemy 객체
 * @returns {Array} 토큰 배열 [{ id, stacks, type, category, ...tokenData }]
 */
export function getAllTokens(entity) {
  if (!entity.tokens) return [];

  const allTokens = [];

  for (const type of [TOKEN_TYPES.PERMANENT, TOKEN_TYPES.USAGE, TOKEN_TYPES.TURN]) {
    const typeArray = entity.tokens[type] || [];
    typeArray.forEach(t => {
      const tokenData = TOKENS[t.id];
      if (tokenData) {
        allTokens.push({
          ...tokenData,  // 토큰 데이터 먼저 (name, emoji, effect 등)
          ...t,          // 엔티티별 데이터 (id, stacks)
          durationType: type  // 소모 타입을 별도 필드로 저장
        });
      }
    });
  }

  return allTokens;
}

/**
 * 토큰이 빈 상태인지 확인
 *
 * @param {Object} entity - player 또는 enemy 객체
 * @returns {boolean} 토큰이 없으면 true
 */
export function hasNoTokens(entity) {
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
 *
 * @returns {Object} 빈 토큰 객체
 */
export function createEmptyTokens() {
  return {
    [TOKEN_TYPES.USAGE]: [],
    [TOKEN_TYPES.TURN]: [],
    [TOKEN_TYPES.PERMANENT]: []
  };
}
