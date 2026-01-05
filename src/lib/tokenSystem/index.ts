/**
 * @file index.ts
 * @description 토큰 시스템 공유 라이브러리
 *
 * 게임과 시뮬레이터에서 공통으로 사용하는 토큰 시스템 로직입니다.
 */

// 핵심 로직
export {
  // 토큰 상쇄/충돌
  TOKEN_CONFLICTS,
  TOKEN_STACK_LIMITS,
  GUN_JAM_REMOVES,
  getConflictingTokenId,
  getStackLimit,
  calculateCancellation,
  type CancelResult,

  // 공격 수정자
  calculateAttackModifiers,
  type AttackModifiers,

  // 방어 수정자
  calculateDefenseModifiers,
  type DefenseModifiers,

  // 피해 수정자
  calculateDamageTakenModifiers,
  type DamageTakenModifiers,

  // 에너지/속도
  calculateEnergyModifier,
  calculateSpeedModifier,

  // 특수 토큰
  calculateJamChance,
  calculateBurnDamage,
  calculateCounterDamage,
  calculateReviveHp,

  // 소모 토큰 목록
  ATTACK_CONSUME_TOKENS,
  DEFENSE_CONSUME_TOKENS,
  DAMAGE_TAKEN_CONSUME_TOKENS,

  // 분류
  NEGATIVE_TOKENS,
  isNegativeToken,
  type TokenCategory,
  type TokenType,
} from './core';

// 어댑터
export {
  // 타입
  type GameTokenInstance,
  type GameTokenState,
  type SimTokenState,
  type TokenDefinition,
  type TokenAccessor,

  // 변환
  gameToSimTokens,
  simToGameTokens,

  // 게임 토큰 조작
  getGameTokenStacks,
  hasGameToken,
  addGameToken,
  removeGameToken,
  clearGameTurnTokens,
  createEmptyGameTokens,
  cloneGameTokens,
  isGameTokensEmpty,
  createGameTokenAccessor,

  // 시뮬레이터 토큰 조작
  getSimTokenStacks,
  hasSimToken,
  addSimToken,
  removeSimToken,
  clearSimToken,
  createEmptySimTokens,
  cloneSimTokens,
  isSimTokensEmpty,
  createSimTokenAccessor,
} from './adapters';
