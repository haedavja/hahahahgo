/**
 * @file token-system.ts
 * @description 완전한 토큰 시스템 - 56개 토큰 전체 지원
 *
 * 토큰 타입:
 * - usage: 1회 사용 후 소멸
 * - turn: 해당 턴 동안 지속
 * - permanent: 전투 중 지속
 *
 * 기본 토큰 조작은 공통 코어(src/core/combat/token-core.ts)를 사용하고,
 * 시뮬레이터 전용 확장 기능은 이 파일에서 구현
 */

import type { TokenState, GameToken, TokenType, TokenCategory } from './game-types';
import { syncAllTokens } from '../data/game-data-sync';
import { getLogger } from './logger';

// 코어에서 기본 토큰 함수 가져오기
import * as TokenCore from '../../core/combat/token-core';

const log = getLogger('TokenSystem');

// ==================== 코어 함수 재내보내기 ====================
// 기본 토큰 조작 함수들은 코어에서 직접 사용
export const addToken = TokenCore.addTokenSimple;
export const removeToken = TokenCore.removeTokenSimple;
export const hasToken = TokenCore.hasToken;
export const getTokenStacks = TokenCore.getTokenStacks;

// 수정자 계산 함수도 코어에서 가져오기
export const calculateAttackModifiers = TokenCore.calculateAttackModifiers;
export const calculateDefenseModifiers = TokenCore.calculateDefenseModifiers;
export const calculateDamageTakenModifiers = TokenCore.calculateDamageTakenModifiers;

// 코어 타입 재내보내기
export type { AttackModifiers, DefenseModifiers, DamageTakenModifiers } from '../../core/combat/token-core';

// ==================== 토큰 정의 캐시 ====================

let tokenCache: Record<string, GameToken> | null = null;

function getTokenDefinitions(): Record<string, GameToken> {
  if (!tokenCache) {
    tokenCache = syncAllTokens();
  }
  return tokenCache;
}

// ==================== 시뮬레이터 전용 토큰 함수 ====================

/**
 * 토큰 완전 제거
 */
export function clearToken(tokens: TokenState, tokenId: string): TokenState {
  const newTokens = { ...tokens };
  delete newTokens[tokenId];
  return newTokens;
}

/**
 * 특정 타입의 모든 토큰 제거
 */
export function clearTokensByType(tokens: TokenState, type: TokenType): TokenState {
  const definitions = getTokenDefinitions();
  const newTokens = { ...tokens };

  for (const tokenId of Object.keys(newTokens)) {
    const def = definitions[tokenId];
    if (def && def.type === type) {
      delete newTokens[tokenId];
    }
  }

  return newTokens;
}

/**
 * 특정 카테고리의 모든 토큰 제거
 */
export function clearTokensByCategory(tokens: TokenState, category: TokenCategory): TokenState {
  const definitions = getTokenDefinitions();
  const newTokens = { ...tokens };

  for (const tokenId of Object.keys(newTokens)) {
    const def = definitions[tokenId];
    if (def && def.category === category) {
      delete newTokens[tokenId];
    }
  }

  return newTokens;
}

// ==================== 토큰 효과 계산 (코어 사용) ====================
// 기존 코드와의 호환성을 위해 DamageModifiers를 AttackModifiers의 별칭으로 유지
export type DamageModifiers = TokenCore.AttackModifiers;
// DefenseModifiers, DamageTakenModifiers는 이미 위에서 재내보내기됨

// ==================== 토큰 사용 소모 ====================

/**
 * usage 타입 토큰 소모
 */
export function consumeUsageToken(tokens: TokenState, tokenId: string): TokenState {
  const definitions = getTokenDefinitions();
  const def = definitions[tokenId];

  if (def && def.type === 'usage' && hasToken(tokens, tokenId)) {
    return removeToken(tokens, tokenId, 1);
  }

  return tokens;
}

/**
 * 공격 시 토큰 소모 처리
 */
export function consumeAttackTokens(tokens: TokenState): TokenState {
  let newTokens = { ...tokens };

  // 공세 소모
  if (hasToken(newTokens, 'offense')) {
    newTokens = removeToken(newTokens, 'offense', 1);
  }
  if (hasToken(newTokens, 'offensePlus')) {
    newTokens = removeToken(newTokens, 'offensePlus', 1);
  }

  // 무딤 소모
  if (hasToken(newTokens, 'dull')) {
    newTokens = removeToken(newTokens, 'dull', 1);
  }
  if (hasToken(newTokens, 'dullPlus')) {
    newTokens = removeToken(newTokens, 'dullPlus', 1);
  }

  // 철갑탄 소모
  if (hasToken(newTokens, 'armor_piercing')) {
    newTokens = removeToken(newTokens, 'armor_piercing', 1);
  }

  // 파쇄탄 소모
  if (hasToken(newTokens, 'fragmentation')) {
    newTokens = removeToken(newTokens, 'fragmentation', 1);
  }

  // 흡수 소모
  if (hasToken(newTokens, 'absorb')) {
    newTokens = removeToken(newTokens, 'absorb', 1);
  }

  // 소이탄 소모
  if (hasToken(newTokens, 'incendiary')) {
    newTokens = removeToken(newTokens, 'incendiary', 1);
  }

  return newTokens;
}

/**
 * 방어 시 토큰 소모 처리
 */
export function consumeDefenseTokens(tokens: TokenState): TokenState {
  let newTokens = { ...tokens };

  // 수세 소모
  if (hasToken(newTokens, 'guard')) {
    newTokens = removeToken(newTokens, 'guard', 1);
  }
  if (hasToken(newTokens, 'guardPlus')) {
    newTokens = removeToken(newTokens, 'guardPlus', 1);
  }

  // 흔들림 소모
  if (hasToken(newTokens, 'shaken')) {
    newTokens = removeToken(newTokens, 'shaken', 1);
  }
  if (hasToken(newTokens, 'shakenPlus')) {
    newTokens = removeToken(newTokens, 'shakenPlus', 1);
  }

  return newTokens;
}

/**
 * 피해 받을 시 토큰 소모 처리
 */
export function consumeDamageTakenTokens(tokens: TokenState): TokenState {
  let newTokens = { ...tokens };

  // 아픔 소모
  if (hasToken(newTokens, 'pain')) {
    newTokens = removeToken(newTokens, 'pain', 1);
  }
  if (hasToken(newTokens, 'painPlus')) {
    newTokens = removeToken(newTokens, 'painPlus', 1);
  }

  // 흐릿함 소모 (회피 성공/실패 시)
  if (hasToken(newTokens, 'blur')) {
    newTokens = removeToken(newTokens, 'blur', 1);
  }
  if (hasToken(newTokens, 'blurPlus')) {
    newTokens = removeToken(newTokens, 'blurPlus', 1);
  }

  // 회피 소모
  if (hasToken(newTokens, 'evasion')) {
    newTokens = removeToken(newTokens, 'evasion', 1);
  }

  return newTokens;
}

// ==================== 턴 종료 처리 ====================

/**
 * 턴 종료 시 turn 타입 토큰 제거
 */
export function processTurnEnd(tokens: TokenState): TokenState {
  return clearTokensByType(tokens, 'turn');
}

// ==================== Exhaust (소진) 시스템 ====================

/**
 * 카드 소진 상태 관리
 */
export interface ExhaustState {
  exhaustedCards: Set<string>;
  exhaustPile: string[];
}

/**
 * 카드 소진 처리
 * @returns 소진 후 새로운 덱 (소진된 카드 제거됨)
 */
export function exhaustCard(
  deck: string[],
  cardId: string,
  exhaustState: ExhaustState
): { newDeck: string[]; exhausted: boolean } {
  const cardIndex = deck.indexOf(cardId);
  if (cardIndex === -1) {
    return { newDeck: deck, exhausted: false };
  }

  const newDeck = [...deck];
  newDeck.splice(cardIndex, 1);
  exhaustState.exhaustedCards.add(cardId);
  exhaustState.exhaustPile.push(cardId);

  log.debug('카드 소진', { cardId, remaining: newDeck.length });

  return { newDeck, exhausted: true };
}

/**
 * 소진된 카드 회수 (특수 효과용)
 */
export function recoverExhausted(
  exhaustState: ExhaustState,
  count: number = 1
): string[] {
  const recovered: string[] = [];
  for (let i = 0; i < count && exhaustState.exhaustPile.length > 0; i++) {
    const card = exhaustState.exhaustPile.pop();
    if (card) {
      exhaustState.exhaustedCards.delete(card);
      recovered.push(card);
    }
  }
  return recovered;
}

/**
 * 전투 종료 시 소진 상태 초기화
 */
export function resetExhaustState(): ExhaustState {
  return {
    exhaustedCards: new Set(),
    exhaustPile: [],
  };
}

// ==================== 토큰 충돌/변환 규칙 ====================

/** 상충하는 토큰 쌍 정의 */
const TOKEN_CONFLICTS: Record<string, string> = {
  // 공격 관련
  offense: 'dull',
  offensePlus: 'dullPlus',
  attack: 'dullness',
  attackPlus: 'dullnessPlus',
  // 방어 관련
  guard: 'shaken',
  guardPlus: 'shakenPlus',
  defense: 'exposed',
  defensePlus: 'exposedPlus',
  // 상태이상 관련
  strength: 'weakness',
  agility: 'slowness',
  immunity: 'vulnerable',
  // 역방향
  dull: 'offense',
  dullPlus: 'offensePlus',
  dullness: 'attack',
  dullnessPlus: 'attackPlus',
  shaken: 'guard',
  shakenPlus: 'guardPlus',
  exposed: 'defense',
  exposedPlus: 'defensePlus',
  weakness: 'strength',
  slowness: 'agility',
  vulnerable: 'immunity',
};

/** 토큰 스택 상한 */
const TOKEN_STACK_LIMITS: Record<string, number> = {
  strength: 99,
  agility: 10,
  burn: 10,
  poison: 20,
  counter: 5,
  counterShot: 10,
  roulette: 20,
  finesse: 10,
};

/**
 * 충돌하는 토큰 처리 (상충 토큰 상쇄)
 */
export function resolveTokenConflict(
  tokens: TokenState,
  newTokenId: string,
  newStacks: number
): TokenState {
  const conflictingTokenId = TOKEN_CONFLICTS[newTokenId];
  if (!conflictingTokenId) {
    return addTokenWithLimit(tokens, newTokenId, newStacks);
  }

  const existingConflictStacks = getTokenStacks(tokens, conflictingTokenId);
  if (existingConflictStacks === 0) {
    return addTokenWithLimit(tokens, newTokenId, newStacks);
  }

  let newTokens = { ...tokens };
  if (newStacks > existingConflictStacks) {
    newTokens = clearToken(newTokens, conflictingTokenId);
    newTokens = addTokenWithLimit(newTokens, newTokenId, newStacks - existingConflictStacks);
    log.debug('토큰 충돌 해소', { removed: conflictingTokenId, added: newTokenId });
  } else if (newStacks < existingConflictStacks) {
    newTokens = removeToken(newTokens, conflictingTokenId, newStacks);
    log.debug('토큰 충돌 해소', { reduced: conflictingTokenId, by: newStacks });
  } else {
    newTokens = clearToken(newTokens, conflictingTokenId);
    log.debug('토큰 충돌 해소', { bothRemoved: [newTokenId, conflictingTokenId] });
  }

  return newTokens;
}

/**
 * 스택 상한 적용하여 토큰 추가
 */
export function addTokenWithLimit(tokens: TokenState, tokenId: string, stacks: number = 1): TokenState {
  const limit = TOKEN_STACK_LIMITS[tokenId] || 99;
  const currentStacks = getTokenStacks(tokens, tokenId);
  const newStacks = Math.min(currentStacks + stacks, limit);
  const actualAdd = newStacks - currentStacks;

  if (actualAdd <= 0) {
    return tokens;
  }

  return addToken(tokens, tokenId, actualAdd);
}

/**
 * 토큰 변환 (A → B)
 */
export function convertToken(
  tokens: TokenState,
  fromTokenId: string,
  toTokenId: string,
  ratio: number = 1
): TokenState {
  const fromStacks = getTokenStacks(tokens, fromTokenId);
  if (fromStacks === 0) {
    return tokens;
  }

  const toStacks = Math.floor(fromStacks * ratio);
  let newTokens = clearToken(tokens, fromTokenId);
  newTokens = addTokenWithLimit(newTokens, toTokenId, toStacks);

  log.debug('토큰 변환', { from: fromTokenId, to: toTokenId, stacks: toStacks });

  return newTokens;
}

// ==================== 특수 토큰 처리 ====================

/**
 * 반격 처리
 */
export function processCounter(
  attackerTokens: TokenState,
  defenderTokens: TokenState,
  baseDamage: number = 5
): { damage: number; newDefenderTokens: TokenState } {
  if (!hasToken(defenderTokens, 'counter')) {
    return { damage: 0, newDefenderTokens: defenderTokens };
  }

  const strength = getTokenStacks(defenderTokens, 'strength');
  const damage = baseDamage + strength;
  const newDefenderTokens = removeToken(defenderTokens, 'counter', 1);

  log.info('반격 발동', { damage, remainingCounter: getTokenStacks(newDefenderTokens, 'counter') });

  return { damage, newDefenderTokens };
}

/**
 * 대응사격 처리
 */
export function processCounterShot(
  attackerTokens: TokenState,
  defenderTokens: TokenState,
  baseDamage: number = 8
): { damage: number; newDefenderTokens: TokenState; triggerRoulette: boolean } {
  if (!hasToken(defenderTokens, 'counterShot')) {
    return { damage: 0, newDefenderTokens: defenderTokens, triggerRoulette: false };
  }

  const damage = baseDamage;
  let newDefenderTokens = removeToken(defenderTokens, 'counterShot', 1);

  // 룰렛 스택 증가
  newDefenderTokens = addToken(newDefenderTokens, 'roulette', 1);

  log.info('대응사격 발동', { damage, rouletteStacks: getTokenStacks(newDefenderTokens, 'roulette') });

  return { damage, newDefenderTokens, triggerRoulette: true };
}

/**
 * 룰렛 탄걸림 체크
 * @param tokens 현재 토큰 상태
 * @param reduceJamChance 건카타 Lv2 효과: true이면 확률 5%→3%로 감소
 */
export function checkRoulette(
  tokens: TokenState,
  reduceJamChance: boolean = false
): { jammed: boolean; newTokens: TokenState } {
  const rouletteStacks = getTokenStacks(tokens, 'roulette');
  if (rouletteStacks === 0) {
    return { jammed: false, newTokens: tokens };
  }

  // 탄걸림 면역 체크
  if (hasToken(tokens, 'jam_immunity')) {
    return { jammed: false, newTokens: tokens };
  }

  // 건카타 Lv2: 탄걸림 확률 감소 (5% → 3%)
  const jamPerStack = reduceJamChance ? 0.03 : 0.05;
  const jamChance = rouletteStacks * jamPerStack;
  const jammed = Math.random() < jamChance;

  if (jammed) {
    log.info('탄걸림 발생', { rouletteStacks, jamChance, reduced: reduceJamChance });
    let newTokens = clearToken(tokens, 'roulette');
    newTokens = addToken(newTokens, 'gun_jam', 1);
    return { jammed: true, newTokens };
  }

  return { jammed: false, newTokens: tokens };
}

/**
 * 화상 피해 처리
 */
export function processBurn(tokens: TokenState): { damage: number; newTokens: TokenState } {
  const burnStacks = getTokenStacks(tokens, 'burn');
  if (burnStacks === 0) {
    return { damage: 0, newTokens: tokens };
  }

  const damage = burnStacks * 3; // 스택당 3 피해
  log.debug('화상 피해', { stacks: burnStacks, damage });

  return { damage, newTokens: tokens };
}

/**
 * 면역 체크 (부정 토큰 차단)
 */
export function checkImmunity(tokens: TokenState, negativeTokenId: string): { blocked: boolean; newTokens: TokenState } {
  if (!hasToken(tokens, 'immunity')) {
    return { blocked: false, newTokens: tokens };
  }

  const definitions = getTokenDefinitions();
  const def = definitions[negativeTokenId];

  if (def && def.category === 'negative') {
    log.info('면역으로 부정 토큰 차단', { tokenId: negativeTokenId });
    const newTokens = removeToken(tokens, 'immunity', 1);
    return { blocked: true, newTokens };
  }

  return { blocked: false, newTokens: tokens };
}

/**
 * 부활 체크
 */
export function checkRevive(tokens: TokenState, maxHp: number): { revived: boolean; newHp: number; newTokens: TokenState } {
  if (!hasToken(tokens, 'revive')) {
    return { revived: false, newHp: 0, newTokens: tokens };
  }

  const newHp = Math.floor(maxHp * 0.5);
  const newTokens = removeToken(tokens, 'revive', 1);

  log.info('부활 발동', { newHp });

  return { revived: true, newHp, newTokens };
}

// ==================== 에너지/행동력 수정자 ====================

/**
 * 에너지 수정자 계산
 */
export function calculateEnergyModifier(tokens: TokenState): number {
  let modifier = 0;

  // 몸풀기 (warmedUp) - 행동력 +2
  if (hasToken(tokens, 'warmedUp')) {
    modifier += 2;
  }

  // 현기증 (dizzy) - 행동력 -2
  if (hasToken(tokens, 'dizzy')) {
    modifier -= 2;
  }

  return modifier;
}

/**
 * 속도 수정자 계산
 */
export function calculateSpeedModifier(tokens: TokenState): number {
  let modifier = 0;

  // 민첩 (agility) - 속도 -1
  const agilityStacks = getTokenStacks(tokens, 'agility');
  if (agilityStacks > 0) {
    modifier -= agilityStacks;
  }

  return modifier;
}

// ==================== 토큰 상태 요약 ====================

export interface TokenSummary {
  positive: string[];
  negative: string[];
  neutral: string[];
  total: number;
}

/**
 * 토큰 상태 요약
 */
export function summarizeTokens(tokens: TokenState): TokenSummary {
  const definitions = getTokenDefinitions();
  const summary: TokenSummary = {
    positive: [],
    negative: [],
    neutral: [],
    total: 0,
  };

  for (const [tokenId, stacks] of Object.entries(tokens)) {
    if (stacks <= 0) continue;

    summary.total += stacks;
    const def = definitions[tokenId];

    if (def) {
      const entry = `${def.name}(${stacks})`;
      if (def.category === 'positive') {
        summary.positive.push(entry);
      } else if (def.category === 'negative') {
        summary.negative.push(entry);
      } else {
        summary.neutral.push(entry);
      }
    }
  }

  return summary;
}

/**
 * 최소 기교 유지 (배틀왈츠 Lv1)
 * 기교가 minValue 미만이면 minValue로 설정
 */
export function enforceMinFinesse(tokens: TokenState, minValue: number = 1): TokenState {
  const currentFinesse = getTokenStacks(tokens, 'finesse');
  if (currentFinesse < minValue) {
    return addToken(tokens, 'finesse', minValue - currentFinesse);
  }
  return tokens;
}
