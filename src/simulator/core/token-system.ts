/**
 * @file token-system.ts
 * @description 완전한 토큰 시스템 - 56개 토큰 전체 지원
 *
 * 토큰 타입:
 * - usage: 1회 사용 후 소멸
 * - turn: 해당 턴 동안 지속
 * - permanent: 전투 중 지속
 */

import type { TokenState, GameToken, TokenType, TokenCategory } from './game-types';
import { syncAllTokens } from '../data/game-data-sync';
import { getLogger } from './logger';

const log = getLogger('TokenSystem');

// ==================== 토큰 정의 캐시 ====================

let tokenCache: Record<string, GameToken> | null = null;

function getTokenDefinitions(): Record<string, GameToken> {
  if (!tokenCache) {
    tokenCache = syncAllTokens();
  }
  return tokenCache;
}

// ==================== 토큰 조작 함수 ====================

/**
 * 토큰 추가
 */
export function addToken(tokens: TokenState, tokenId: string, stacks: number = 1): TokenState {
  const newTokens = { ...tokens };
  newTokens[tokenId] = (newTokens[tokenId] || 0) + stacks;
  log.debug('토큰 추가', { tokenId, stacks, total: newTokens[tokenId] });
  return newTokens;
}

/**
 * 토큰 제거
 */
export function removeToken(tokens: TokenState, tokenId: string, stacks: number = 1): TokenState {
  const newTokens = { ...tokens };
  if (newTokens[tokenId]) {
    newTokens[tokenId] = Math.max(0, newTokens[tokenId] - stacks);
    if (newTokens[tokenId] === 0) {
      delete newTokens[tokenId];
    }
    log.debug('토큰 제거', { tokenId, stacks, remaining: newTokens[tokenId] || 0 });
  }
  return newTokens;
}

/**
 * 토큰 완전 제거
 */
export function clearToken(tokens: TokenState, tokenId: string): TokenState {
  const newTokens = { ...tokens };
  delete newTokens[tokenId];
  return newTokens;
}

/**
 * 토큰 보유 확인
 */
export function hasToken(tokens: TokenState, tokenId: string): boolean {
  return (tokens[tokenId] || 0) > 0;
}

/**
 * 토큰 스택 수 조회
 */
export function getTokenStacks(tokens: TokenState, tokenId: string): number {
  return tokens[tokenId] || 0;
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

// ==================== 토큰 효과 계산 ====================

export interface DamageModifiers {
  attackMultiplier: number;
  damageBonus: number;
  critBoost: number;
  ignoreBlock: boolean;
  lifesteal: number;
}

export interface DefenseModifiers {
  defenseMultiplier: number;
  defenseBonus: number;
  dodgeChance: number;
}

export interface DamageTakenModifiers {
  damageMultiplier: number;
  damageReduction: number;
}

/**
 * 공격 수정자 계산
 * 우선순위: 1) 양수/음수 배율 중 가장 강한 것만 적용, 2) 고정 보너스 누적
 */
export function calculateAttackModifiers(tokens: TokenState): DamageModifiers {
  let attackMultiplier = 1;
  let damageBonus = 0;
  let critBoost = 0;
  let ignoreBlock = false;
  let lifesteal = 0;

  // === 양수 배율 효과 (가장 높은 것만 적용) ===
  // 영구 효과: offense(1.5) < offensePlus(2.0)
  // 턴 효과: attack(1.5) < attackPlus(2.0)
  let permanentBoost = 1;
  let turnBoost = 1;

  if (hasToken(tokens, 'offensePlus')) {
    permanentBoost = 2.0;  // 공세+가 있으면 공세 무시
  } else if (hasToken(tokens, 'offense')) {
    permanentBoost = 1.5;
  }

  if (hasToken(tokens, 'attackPlus')) {
    turnBoost = 2.0;  // 공격+가 있으면 공격 무시
  } else if (hasToken(tokens, 'attack')) {
    turnBoost = 1.5;
  }

  // 양수 배율 합산 (가산 방식: (permanentBoost-1) + (turnBoost-1) + 1)
  const positiveBonus = (permanentBoost - 1) + (turnBoost - 1);

  // === 음수 배율 효과 (가장 낮은 것만 적용) ===
  let permanentDebuff = 1;
  let turnDebuff = 1;

  if (hasToken(tokens, 'dullPlus')) {
    permanentDebuff = 0.25;  // 무딤+가 있으면 무딤 무시
  } else if (hasToken(tokens, 'dull')) {
    permanentDebuff = 0.5;
  }

  if (hasToken(tokens, 'dullnessPlus')) {
    turnDebuff = 0.25;  // 부러짐+가 있으면 부러짐 무시
  } else if (hasToken(tokens, 'dullness')) {
    turnDebuff = 0.5;
  }

  // 음수 배율은 가장 나쁜 것만 적용
  const negativeMultiplier = Math.min(permanentDebuff, turnDebuff);

  // 최종 배율: (1 + 양수보너스) × 음수배율
  attackMultiplier = (1 + positiveBonus) * negativeMultiplier;

  // 힘 (strength) - 스택당 공격력 1 증가
  const strengthStacks = getTokenStacks(tokens, 'strength');
  if (strengthStacks > 0) {
    damageBonus += strengthStacks;
  }

  // 날 세우기 (sharpened_blade) - 검격 카드 보너스
  const sharpenedStacks = getTokenStacks(tokens, 'sharpened_blade');
  if (sharpenedStacks > 0) {
    damageBonus += sharpenedStacks;
  }

  // 집중 (crit_boost) - 치명타 확률 5% 증가
  const critStacks = getTokenStacks(tokens, 'crit_boost');
  if (critStacks > 0) {
    critBoost += critStacks * 5;
  }

  // 철갑탄 (armor_piercing) - 방어력 무시
  if (hasToken(tokens, 'armor_piercing')) {
    ignoreBlock = true;
  }

  // 파쇄탄 (fragmentation) - 피해 6 증가
  if (hasToken(tokens, 'fragmentation')) {
    damageBonus += 6;
  }

  // 흡수 (absorb) - 50% 흡혈
  if (hasToken(tokens, 'absorb')) {
    lifesteal = 0.5;
  }

  return { attackMultiplier, damageBonus, critBoost, ignoreBlock, lifesteal };
}

/**
 * 방어 수정자 계산
 * 우선순위: 1) 양수/음수 배율 중 가장 강한 것만 적용, 2) 고정 보너스 누적
 */
export function calculateDefenseModifiers(tokens: TokenState): DefenseModifiers {
  let defenseMultiplier = 1;
  let defenseBonus = 0;
  let dodgeChance = 0;

  // === 양수 배율 효과 (가장 높은 것만 적용) ===
  let permanentBoost = 1;
  let turnBoost = 1;

  if (hasToken(tokens, 'guardPlus')) {
    permanentBoost = 2.0;  // 수세+가 있으면 수세 무시
  } else if (hasToken(tokens, 'guard')) {
    permanentBoost = 1.5;
  }

  if (hasToken(tokens, 'defensePlus')) {
    turnBoost = 2.0;  // 방어+가 있으면 방어 무시
  } else if (hasToken(tokens, 'defense')) {
    turnBoost = 1.5;
  }

  // 양수 배율 합산
  const positiveBonus = (permanentBoost - 1) + (turnBoost - 1);

  // === 음수 배율 효과 (가장 낮은 것만 적용) ===
  let permanentDebuff = 1;
  let turnDebuff = 1;

  if (hasToken(tokens, 'shakenPlus')) {
    permanentDebuff = 0;  // 흔들림+는 완전 무효화
  } else if (hasToken(tokens, 'shaken')) {
    permanentDebuff = 0.5;
  }

  if (hasToken(tokens, 'exposedPlus')) {
    turnDebuff = 0;
  } else if (hasToken(tokens, 'exposed')) {
    turnDebuff = 0.5;
  }

  // 음수 배율은 가장 나쁜 것만 적용
  const negativeMultiplier = Math.min(permanentDebuff, turnDebuff);

  // 최종 배율
  defenseMultiplier = (1 + positiveBonus) * negativeMultiplier;

  // 힘 (strength) - 스택당 방어력 1 증가
  const strengthStacks = getTokenStacks(tokens, 'strength');
  if (strengthStacks > 0) {
    defenseBonus += strengthStacks;
  }

  // 흐릿함 (blur) - 50% 회피
  if (hasToken(tokens, 'blur')) {
    dodgeChance = Math.max(dodgeChance, 0.5);
  }

  // 흐릿함+ (blurPlus) - 75% 회피
  if (hasToken(tokens, 'blurPlus')) {
    dodgeChance = Math.max(dodgeChance, 0.75);
  }

  // 회피 (dodge) - 턴 동안 50% 회피
  if (hasToken(tokens, 'dodge')) {
    dodgeChance = Math.max(dodgeChance, 0.5);
  }

  // 회피+ (dodgePlus) - 턴 동안 75% 회피
  if (hasToken(tokens, 'dodgePlus')) {
    dodgeChance = Math.max(dodgeChance, 0.75);
  }

  // 회피 토큰 (evasion)
  if (hasToken(tokens, 'evasion')) {
    dodgeChance = Math.max(dodgeChance, 0.5);
  }

  return { defenseMultiplier, defenseBonus, dodgeChance };
}

/**
 * 받는 피해 수정자 계산
 */
export function calculateDamageTakenModifiers(tokens: TokenState): DamageTakenModifiers {
  let damageMultiplier = 1;
  let damageReduction = 0;

  // 허약 (vulnerable) - 50% 추가 피해
  if (hasToken(tokens, 'vulnerable')) {
    damageMultiplier *= 1.5;
  }

  // 허약+ (vulnerablePlus) - 100% 추가 피해
  if (hasToken(tokens, 'vulnerablePlus')) {
    damageMultiplier *= 2.0;
  }

  // 아픔 (pain) - 50% 추가 피해
  if (hasToken(tokens, 'pain')) {
    damageMultiplier *= 1.5;
  }

  // 아픔+ (painPlus) - 100% 추가 피해
  if (hasToken(tokens, 'painPlus')) {
    damageMultiplier *= 2.0;
  }

  return { damageMultiplier, damageReduction };
}

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
