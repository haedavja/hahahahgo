/**
 * @file token-core.ts
 * @description 토큰 시스템 공통 코어
 *
 * 게임과 시뮬레이터가 공유하는 순수 토큰 연산 함수들
 * 외부 의존성 없음 (React, Zustand, logger 등 금지)
 *
 * 주요 원칙:
 * 1. 모든 함수는 순수 함수
 * 2. 토큰 정의는 외부에서 주입 (DI)
 * 3. 상태 변형 금지 (새 객체 반환)
 */

import type {
  UnifiedTokenState,
  TokenDefinition,
  TokenOperationResult,
  TokenModifiers,
  DEFAULT_TOKEN_MODIFIERS,
} from './types';

// ==================== 타입 재정의 (로컬) ====================

export type TokenType = 'usage' | 'turn' | 'permanent';
export type TokenCategory = 'positive' | 'negative';

/** 토큰 정의 맵 */
export type TokenDefinitionMap = Record<string, TokenDefinition>;

// ==================== 기본 토큰 연산 ====================

/**
 * 토큰 추가
 * @param tokens 현재 토큰 상태
 * @param tokenId 토큰 ID
 * @param stacks 추가할 스택 수
 * @param definitions 토큰 정의 맵 (상쇄 처리용, 선택적)
 * @returns 토큰 연산 결과
 */
export function addToken(
  tokens: UnifiedTokenState,
  tokenId: string,
  stacks: number = 1,
  definitions?: TokenDefinitionMap
): TokenOperationResult {
  const logs: string[] = [];
  let newTokens = { ...tokens };
  let cancelled: TokenOperationResult['cancelled'];

  // 상쇄 토큰 처리
  if (definitions) {
    const def = definitions[tokenId];
    if (def?.oppositeToken) {
      const oppositeStacks = newTokens[def.oppositeToken] || 0;
      if (oppositeStacks > 0) {
        const cancelAmount = Math.min(stacks, oppositeStacks);
        newTokens[def.oppositeToken] = oppositeStacks - cancelAmount;
        if (newTokens[def.oppositeToken] === 0) {
          delete newTokens[def.oppositeToken];
        }
        stacks -= cancelAmount;
        cancelled = {
          tokenId: def.oppositeToken,
          amount: cancelAmount,
          byToken: tokenId,
        };
        logs.push(`${tokenId} ↔ ${def.oppositeToken} 상쇄 (${cancelAmount})`);
      }
    }
  }

  // 남은 스택 추가
  if (stacks > 0) {
    newTokens[tokenId] = (newTokens[tokenId] || 0) + stacks;

    // 최대 스택 제한
    if (definitions) {
      const def = definitions[tokenId];
      if (def?.maxStacks && def.maxStacks > 0) {
        newTokens[tokenId] = Math.min(newTokens[tokenId], def.maxStacks);
      }
    }
  }

  return { tokens: newTokens, logs, cancelled };
}

/**
 * 토큰 제거
 * @param tokens 현재 토큰 상태
 * @param tokenId 토큰 ID
 * @param stacks 제거할 스택 수
 * @returns 토큰 연산 결과
 */
export function removeToken(
  tokens: UnifiedTokenState,
  tokenId: string,
  stacks: number = 1
): TokenOperationResult {
  const newTokens = { ...tokens };
  const logs: string[] = [];

  if (newTokens[tokenId]) {
    const before = newTokens[tokenId];
    newTokens[tokenId] = Math.max(0, newTokens[tokenId] - stacks);
    if (newTokens[tokenId] === 0) {
      delete newTokens[tokenId];
    }
    logs.push(`${tokenId} 제거: ${before} → ${newTokens[tokenId] || 0}`);
  }

  return { tokens: newTokens, logs };
}

/**
 * 토큰 완전 제거
 */
export function clearToken(
  tokens: UnifiedTokenState,
  tokenId: string
): TokenOperationResult {
  const newTokens = { ...tokens };
  const logs: string[] = [];

  if (newTokens[tokenId]) {
    logs.push(`${tokenId} 완전 제거`);
    delete newTokens[tokenId];
  }

  return { tokens: newTokens, logs };
}

/**
 * 토큰 보유 확인
 */
export function hasToken(tokens: UnifiedTokenState, tokenId: string): boolean {
  return (tokens[tokenId] || 0) > 0;
}

/**
 * 토큰 스택 수 조회
 */
export function getTokenStacks(tokens: UnifiedTokenState, tokenId: string): number {
  return tokens[tokenId] || 0;
}

/**
 * 특정 타입의 모든 토큰 제거
 */
export function clearTokensByType(
  tokens: UnifiedTokenState,
  type: TokenType,
  definitions: TokenDefinitionMap
): TokenOperationResult {
  const newTokens = { ...tokens };
  const logs: string[] = [];

  for (const tokenId of Object.keys(newTokens)) {
    const def = definitions[tokenId];
    if (def && def.type === type) {
      logs.push(`${tokenId} 제거 (타입: ${type})`);
      delete newTokens[tokenId];
    }
  }

  return { tokens: newTokens, logs };
}

/**
 * 특정 카테고리의 모든 토큰 제거
 */
export function clearTokensByCategory(
  tokens: UnifiedTokenState,
  category: TokenCategory,
  definitions: TokenDefinitionMap
): TokenOperationResult {
  const newTokens = { ...tokens };
  const logs: string[] = [];

  for (const tokenId of Object.keys(newTokens)) {
    const def = definitions[tokenId];
    if (def && def.category === category) {
      logs.push(`${tokenId} 제거 (카테고리: ${category})`);
      delete newTokens[tokenId];
    }
  }

  return { tokens: newTokens, logs };
}

// ==================== 토큰 효과 계산 ====================

/** 공격 수정자 결과 */
export interface AttackModifiers {
  attackMultiplier: number;
  damageBonus: number;
  critBoost: number;
  ignoreBlock: boolean;
  lifesteal: number;
}

/** 방어 수정자 결과 */
export interface DefenseModifiers {
  defenseMultiplier: number;
  defenseBonus: number;
  dodgeChance: number;
}

/** 받는 피해 수정자 결과 */
export interface DamageTakenModifiers {
  damageMultiplier: number;
  damageReduction: number;
}

/**
 * 공격 수정자 계산
 * 우선순위: 양수/음수 배율 중 가장 강한 것만 적용, 고정 보너스 누적
 */
export function calculateAttackModifiers(tokens: UnifiedTokenState): AttackModifiers {
  let attackMultiplier = 1;
  let damageBonus = 0;
  let critBoost = 0;
  let ignoreBlock = false;
  let lifesteal = 0;

  // === 양수 배율 효과 (가장 높은 것만 적용) ===
  let permanentBoost = 1;
  let turnBoost = 1;

  // 공세+ > 공세
  if (hasToken(tokens, 'offensePlus')) {
    permanentBoost = 2.0;
  } else if (hasToken(tokens, 'offense')) {
    permanentBoost = 1.5;
  }

  // 공격+ > 공격
  if (hasToken(tokens, 'attackPlus')) {
    turnBoost = 2.0;
  } else if (hasToken(tokens, 'attack')) {
    turnBoost = 1.5;
  }

  // 양수 배율 합산 (가산 방식)
  const positiveBonus = (permanentBoost - 1) + (turnBoost - 1);

  // === 음수 배율 효과 (가장 낮은 것만 적용) ===
  let permanentDebuff = 1;
  let turnDebuff = 1;

  // 무딤+ > 무딤
  if (hasToken(tokens, 'dullPlus')) {
    permanentDebuff = 0.25;
  } else if (hasToken(tokens, 'dull')) {
    permanentDebuff = 0.5;
  }

  // 부러짐+ > 부러짐
  if (hasToken(tokens, 'dullnessPlus')) {
    turnDebuff = 0.25;
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
 */
export function calculateDefenseModifiers(tokens: UnifiedTokenState): DefenseModifiers {
  let defenseMultiplier = 1;
  let defenseBonus = 0;
  let dodgeChance = 0;

  // === 양수 배율 효과 ===
  let permanentBoost = 1;
  let turnBoost = 1;

  // 수세+ > 수세
  if (hasToken(tokens, 'guardPlus')) {
    permanentBoost = 2.0;
  } else if (hasToken(tokens, 'guard')) {
    permanentBoost = 1.5;
  }

  // 방어+ > 방어
  if (hasToken(tokens, 'defensePlus')) {
    turnBoost = 2.0;
  } else if (hasToken(tokens, 'defense')) {
    turnBoost = 1.5;
  }

  const positiveBonus = (permanentBoost - 1) + (turnBoost - 1);

  // === 음수 배율 효과 ===
  let permanentDebuff = 1;
  let turnDebuff = 1;

  // 흔들림+ > 흔들림
  if (hasToken(tokens, 'shakenPlus')) {
    permanentDebuff = 0;
  } else if (hasToken(tokens, 'shaken')) {
    permanentDebuff = 0.5;
  }

  // 노출+ > 노출
  if (hasToken(tokens, 'exposedPlus')) {
    turnDebuff = 0;
  } else if (hasToken(tokens, 'exposed')) {
    turnDebuff = 0.5;
  }

  const negativeMultiplier = Math.min(permanentDebuff, turnDebuff);
  defenseMultiplier = (1 + positiveBonus) * negativeMultiplier;

  // 힘 - 방어력 보너스
  const strengthStacks = getTokenStacks(tokens, 'strength');
  if (strengthStacks > 0) {
    defenseBonus += strengthStacks;
  }

  // 회피 토큰들
  if (hasToken(tokens, 'blurPlus')) {
    dodgeChance = Math.max(dodgeChance, 0.75);
  } else if (hasToken(tokens, 'blur')) {
    dodgeChance = Math.max(dodgeChance, 0.5);
  }

  if (hasToken(tokens, 'dodgePlus')) {
    dodgeChance = Math.max(dodgeChance, 0.75);
  } else if (hasToken(tokens, 'dodge')) {
    dodgeChance = Math.max(dodgeChance, 0.5);
  }

  if (hasToken(tokens, 'evasion')) {
    dodgeChance = Math.max(dodgeChance, 0.5);
  }

  return { defenseMultiplier, defenseBonus, dodgeChance };
}

/**
 * 받는 피해 수정자 계산
 */
export function calculateDamageTakenModifiers(tokens: UnifiedTokenState): DamageTakenModifiers {
  let damageMultiplier = 1;
  const damageReduction = 0;

  // 허약+ > 허약
  if (hasToken(tokens, 'vulnerablePlus')) {
    damageMultiplier *= 2.0;
  } else if (hasToken(tokens, 'vulnerable')) {
    damageMultiplier *= 1.5;
  }

  // 아픔+ > 아픔
  if (hasToken(tokens, 'painPlus')) {
    damageMultiplier *= 2.0;
  } else if (hasToken(tokens, 'pain')) {
    damageMultiplier *= 1.5;
  }

  return { damageMultiplier, damageReduction };
}

// ==================== 토큰 소모 ====================

/**
 * usage 타입 토큰 소모
 */
export function consumeUsageToken(
  tokens: UnifiedTokenState,
  tokenId: string,
  definitions: TokenDefinitionMap
): TokenOperationResult {
  const def = definitions[tokenId];
  if (def && def.type === 'usage' && hasToken(tokens, tokenId)) {
    return removeToken(tokens, tokenId, 1);
  }
  return { tokens, logs: [] };
}

/**
 * 공격 관련 토큰 소모
 */
export function consumeAttackTokens(
  tokens: UnifiedTokenState,
  definitions: TokenDefinitionMap
): TokenOperationResult {
  let current = { ...tokens };
  const logs: string[] = [];

  // usage 타입 공격 토큰들 소모
  const attackUsageTokens = ['attack', 'attackPlus', 'armor_piercing', 'fragmentation', 'absorb'];

  for (const tokenId of attackUsageTokens) {
    const def = definitions[tokenId];
    if (def && def.type === 'usage' && hasToken(current, tokenId)) {
      const result = removeToken(current, tokenId, 1);
      current = result.tokens;
      logs.push(...result.logs);
    }
  }

  return { tokens: current, logs };
}

/**
 * 방어 관련 토큰 소모
 */
export function consumeDefenseTokens(
  tokens: UnifiedTokenState,
  definitions: TokenDefinitionMap
): TokenOperationResult {
  let current = { ...tokens };
  const logs: string[] = [];

  // usage 타입 방어 토큰들 소모
  const defenseUsageTokens = ['defense', 'defensePlus', 'dodge', 'dodgePlus', 'evasion'];

  for (const tokenId of defenseUsageTokens) {
    const def = definitions[tokenId];
    if (def && def.type === 'usage' && hasToken(current, tokenId)) {
      const result = removeToken(current, tokenId, 1);
      current = result.tokens;
      logs.push(...result.logs);
    }
  }

  return { tokens: current, logs };
}

/**
 * 턴 종료 시 turn 타입 토큰 감소
 */
export function processTurnEnd(
  tokens: UnifiedTokenState,
  definitions: TokenDefinitionMap
): TokenOperationResult {
  let current = { ...tokens };
  const logs: string[] = [];

  for (const tokenId of Object.keys(current)) {
    const def = definitions[tokenId];
    if (def && def.type === 'turn') {
      const result = removeToken(current, tokenId, 1);
      current = result.tokens;
      if (result.logs.length > 0) {
        logs.push(`턴 종료: ${result.logs.join(', ')}`);
      }
    }
  }

  return { tokens: current, logs };
}

// ==================== 특수 토큰 처리 ====================

/**
 * 반격 토큰 체크 및 처리
 * @returns { shouldCounter: boolean, counterDamage: number }
 */
export function checkCounter(
  tokens: UnifiedTokenState
): { shouldCounter: boolean; counterDamage: number; tokenId: string } {
  // 반격+ 우선
  if (hasToken(tokens, 'counterPlus')) {
    return { shouldCounter: true, counterDamage: 8, tokenId: 'counterPlus' };
  }
  if (hasToken(tokens, 'counter')) {
    return { shouldCounter: true, counterDamage: 4, tokenId: 'counter' };
  }
  return { shouldCounter: false, counterDamage: 0, tokenId: '' };
}

/**
 * 반사 토큰 체크
 */
export function checkReflect(
  tokens: UnifiedTokenState,
  incomingDamage: number
): { shouldReflect: boolean; reflectDamage: number } {
  if (hasToken(tokens, 'reflect')) {
    const stacks = getTokenStacks(tokens, 'reflect');
    return { shouldReflect: true, reflectDamage: Math.floor(incomingDamage * 0.5 * stacks) };
  }
  return { shouldReflect: false, reflectDamage: 0 };
}

/**
 * 화상 토큰 처리
 */
export function processBurn(tokens: UnifiedTokenState): { damage: number; newTokens: UnifiedTokenState } {
  const burnStacks = getTokenStacks(tokens, 'burn');
  if (burnStacks > 0) {
    const result = removeToken(tokens, 'burn', 1);
    return { damage: burnStacks, newTokens: result.tokens };
  }
  return { damage: 0, newTokens: tokens };
}

/**
 * 독 토큰 처리
 */
export function processPoison(tokens: UnifiedTokenState): { damage: number; newTokens: UnifiedTokenState } {
  const poisonStacks = getTokenStacks(tokens, 'poison');
  if (poisonStacks > 0) {
    const result = removeToken(tokens, 'poison', 1);
    return { damage: poisonStacks, newTokens: result.tokens };
  }
  return { damage: 0, newTokens: tokens };
}

/**
 * 부활 토큰 체크
 */
export function checkRevive(tokens: UnifiedTokenState): { canRevive: boolean; healAmount: number } {
  if (hasToken(tokens, 'revive')) {
    return { canRevive: true, healAmount: 20 };
  }
  return { canRevive: false, healAmount: 0 };
}

/**
 * 면역 토큰 체크 (피해 무효화)
 */
export function checkImmunity(tokens: UnifiedTokenState): boolean {
  return hasToken(tokens, 'invulnerable') || hasToken(tokens, 'immunity');
}
