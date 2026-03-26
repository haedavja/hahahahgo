/**
 * @file damage-core.ts
 * @description 피해 계산 공통 코어
 *
 * 게임과 시뮬레이터가 공유하는 순수 피해 계산 함수들
 * 외부 의존성 없음 (React, Zustand, logger 등 금지)
 *
 * 주요 원칙:
 * 1. 모든 함수는 순수 함수
 * 2. 게임/시뮬레이터 특수 로직은 각자 처리 후 이 함수들 사용
 * 3. 상태 변형 금지 (새 객체 반환)
 */

import type { UnifiedTokenState } from './types';
import {
  hasToken,
  getTokenStacks,
  calculateAttackModifiers,
  calculateDefenseModifiers,
  calculateDamageTakenModifiers,
  type AttackModifiers,
  type DefenseModifiers,
  type DamageTakenModifiers,
} from './token-core';

// ==================== 타입 정의 ====================

/** 피해 계산 입력 */
export interface DamageInput {
  baseDamage: number;
  attackerTokens: UnifiedTokenState;
  defenderTokens: UnifiedTokenState;
  defenderBlock: number;
  defenderHp: number;
  defenderMaxHp: number;
  /** 추가 피해 보너스 (힘, 에토스 등) */
  damageBonus?: number;
  /** 추가 배율 (에테르 폭주 등) */
  damageMultiplier?: number;
  /** 치명타 강제 적용 */
  guaranteedCrit?: boolean;
  /** 회피 무시 확률 (0-100) */
  ignoreEvasionChance?: number;
  /** 방어력 무시 */
  ignoreBlock?: boolean;
  /** 분쇄 효과 (방어력 2배 관통) */
  crushMultiplier?: number;
}

/** 피해 계산 결과 */
export interface DamageResult {
  /** 최종 피해량 */
  finalDamage: number;
  /** 방어력으로 막은 피해 */
  blockedDamage: number;
  /** 치명타 발생 여부 */
  isCritical: boolean;
  /** 회피 성공 여부 */
  isDodged: boolean;
  /** 남은 방어력 */
  remainingBlock: number;
  /** 디버그용 계산 과정 */
  breakdown: DamageBreakdown;
}

/** 피해 계산 과정 상세 */
export interface DamageBreakdown {
  baseDamage: number;
  attackModifiers: AttackModifiers;
  defenseModifiers: DefenseModifiers;
  damageTakenModifiers: DamageTakenModifiers;
  afterAttackMod: number;
  afterCrit: number;
  afterBlock: number;
  afterVulnerability: number;
}

/** 치명타 확률 계산 입력 */
export interface CritChanceInput {
  baseCritChance: number;
  attackerTokens: UnifiedTokenState;
  /** 추가 치명타 확률 보너스 */
  bonusCritChance?: number;
}

/** 회피 확률 계산 입력 */
export interface DodgeChanceInput {
  defenderTokens: UnifiedTokenState;
  /** 회피 무시 확률 (0-100) */
  ignoreEvasionChance?: number;
}

// ==================== 상수 ====================

/** 기본 치명타 확률 (5%) */
export const BASE_CRIT_CHANCE = 0.05;

/** 치명타 피해 배율 (2배) */
export const CRIT_MULTIPLIER = 2;

/** 토큰당 치명타 확률 증가 (5%) */
export const CRIT_BOOST_PER_STACK = 0.05;

// ==================== 핵심 계산 함수 ====================

/**
 * 치명타 확률 계산
 */
export function calculateCritChance(input: CritChanceInput): number {
  const { baseCritChance, attackerTokens, bonusCritChance = 0 } = input;

  // crit_boost 토큰 효과
  const critBoostStacks = getTokenStacks(attackerTokens, 'crit_boost');
  const tokenBonus = critBoostStacks * CRIT_BOOST_PER_STACK;

  // 총 치명타 확률 (최대 100%)
  const totalChance = Math.min(1, baseCritChance + tokenBonus + bonusCritChance / 100);

  return totalChance;
}

/**
 * 치명타 판정
 */
export function rollCrit(critChance: number, guaranteed: boolean = false): boolean {
  if (guaranteed) return true;
  return Math.random() < critChance;
}

/**
 * 회피 확률 계산
 */
export function calculateDodgeChance(input: DodgeChanceInput): number {
  const { defenderTokens, ignoreEvasionChance = 0 } = input;

  // 회피 무시 100%면 회피 불가
  if (ignoreEvasionChance >= 100) return 0;

  const defenseModifiers = calculateDefenseModifiers(defenderTokens);
  let dodgeChance = defenseModifiers.dodgeChance;

  // 부분 회피 무시 적용
  if (ignoreEvasionChance > 0) {
    // 회피 무시 확률만큼 회피 성공 확률 감소
    dodgeChance *= (100 - ignoreEvasionChance) / 100;
  }

  return dodgeChance;
}

/**
 * 회피 판정
 */
export function rollDodge(dodgeChance: number): boolean {
  if (dodgeChance <= 0) return false;
  return Math.random() < dodgeChance;
}

/**
 * 방어력 계산
 * @param baseBlock 기본 방어력
 * @param defenderTokens 방어자 토큰
 * @param bonusBlock 추가 방어력 (특성 등)
 */
export function calculateBlock(
  baseBlock: number,
  defenderTokens: UnifiedTokenState,
  bonusBlock: number = 0
): number {
  const defenseModifiers = calculateDefenseModifiers(defenderTokens);

  // 기본 방어력 + 보너스
  let block = baseBlock + bonusBlock;

  // 방어 배율 적용
  block = Math.floor(block * defenseModifiers.defenseMultiplier);

  // 방어 고정 보너스 적용
  block += defenseModifiers.defenseBonus;

  return Math.max(0, block);
}

/**
 * 피해 계산 (핵심 함수)
 */
export function calculateDamage(input: DamageInput): DamageResult {
  const {
    baseDamage,
    attackerTokens,
    defenderTokens,
    defenderBlock,
    damageBonus = 0,
    damageMultiplier = 1,
    guaranteedCrit = false,
    ignoreEvasionChance = 0,
    ignoreBlock = false,
    crushMultiplier = 1,
  } = input;

  // 공격/방어 수정자 계산
  const attackModifiers = calculateAttackModifiers(attackerTokens);
  const defenseModifiers = calculateDefenseModifiers(defenderTokens);
  const damageTakenModifiers = calculateDamageTakenModifiers(defenderTokens);

  // 1. 기본 피해 + 보너스
  let damage = baseDamage + damageBonus + attackModifiers.damageBonus;

  // 2. 공격 배율 적용
  damage = Math.floor(damage * attackModifiers.attackMultiplier * damageMultiplier);
  const afterAttackMod = damage;

  // 3. 치명타 판정
  const critChance = calculateCritChance({
    baseCritChance: BASE_CRIT_CHANCE,
    attackerTokens,
    bonusCritChance: attackModifiers.critBoost,
  });
  const isCritical = rollCrit(critChance, guaranteedCrit);

  if (isCritical) {
    damage = Math.floor(damage * CRIT_MULTIPLIER);
  }
  const afterCrit = damage;

  // 4. 회피 판정
  const dodgeChance = calculateDodgeChance({
    defenderTokens,
    ignoreEvasionChance,
  });
  const isDodged = rollDodge(dodgeChance);

  if (isDodged) {
    return {
      finalDamage: 0,
      blockedDamage: 0,
      isCritical,
      isDodged: true,
      remainingBlock: defenderBlock,
      breakdown: {
        baseDamage,
        attackModifiers,
        defenseModifiers,
        damageTakenModifiers,
        afterAttackMod,
        afterCrit,
        afterBlock: 0,
        afterVulnerability: 0,
      },
    };
  }

  // 5. 방어력 처리
  let blockedDamage = 0;
  let remainingBlock = defenderBlock;

  if (!ignoreBlock && !attackModifiers.ignoreBlock && defenderBlock > 0) {
    // 분쇄 효과: 방어력 N배 관통
    const effectiveBlock = Math.floor(defenderBlock / crushMultiplier);
    blockedDamage = Math.min(effectiveBlock, damage);
    damage = Math.max(0, damage - effectiveBlock);

    // 실제로 소모된 방어력 계산
    const blockConsumed = Math.min(defenderBlock, blockedDamage * crushMultiplier);
    remainingBlock = defenderBlock - blockConsumed;
  }
  const afterBlock = damage;

  // 6. 받는 피해 배율 적용 (취약 등)
  damage = Math.floor(damage * damageTakenModifiers.damageMultiplier);

  // 7. 피해 감소 적용
  damage = Math.max(0, damage - damageTakenModifiers.damageReduction);
  const afterVulnerability = damage;

  return {
    finalDamage: damage,
    blockedDamage,
    isCritical,
    isDodged: false,
    remainingBlock,
    breakdown: {
      baseDamage,
      attackModifiers,
      defenseModifiers,
      damageTakenModifiers,
      afterAttackMod,
      afterCrit,
      afterBlock,
      afterVulnerability,
    },
  };
}

/**
 * 다중 타격 피해 계산
 * @param hitCount 타격 횟수
 * @param damagePerHit 타격당 피해
 * @param input 피해 계산 입력 (baseDamage 제외)
 */
export function calculateMultiHitDamage(
  hitCount: number,
  damagePerHit: number,
  input: Omit<DamageInput, 'baseDamage'>
): DamageResult[] {
  const results: DamageResult[] = [];
  let currentBlock = input.defenderBlock;

  for (let i = 0; i < hitCount; i++) {
    const result = calculateDamage({
      ...input,
      baseDamage: damagePerHit,
      defenderBlock: currentBlock,
    });

    results.push(result);
    currentBlock = result.remainingBlock;

    // 첫 타격만 회피 가능 (선택적)
    // input = { ...input, ignoreEvasionChance: 100 };
  }

  return results;
}

/**
 * 흡혈 계산
 */
export function calculateLifesteal(
  damage: number,
  attackerTokens: UnifiedTokenState
): number {
  const attackModifiers = calculateAttackModifiers(attackerTokens);

  if (attackModifiers.lifesteal > 0) {
    return Math.floor(damage * attackModifiers.lifesteal);
  }

  return 0;
}

/**
 * 반사 피해 계산
 */
export function calculateReflectDamage(
  incomingDamage: number,
  defenderTokens: UnifiedTokenState
): number {
  const reflectStacks = getTokenStacks(defenderTokens, 'reflect');

  if (reflectStacks > 0) {
    // 반사 스택당 50% 반사
    return Math.floor(incomingDamage * 0.5 * reflectStacks);
  }

  return 0;
}

/**
 * 화상 피해 계산
 */
export function calculateBurnDamage(tokens: UnifiedTokenState): number {
  const burnStacks = getTokenStacks(tokens, 'burn');
  // 스택당 3 피해
  return burnStacks * 3;
}

/**
 * 독 피해 계산
 */
export function calculatePoisonDamage(tokens: UnifiedTokenState): number {
  const poisonStacks = getTokenStacks(tokens, 'poison');
  // 스택당 2 피해
  return poisonStacks * 2;
}

// ==================== 유틸리티 함수 ====================

/**
 * 피해 결과 합산
 */
export function sumDamageResults(results: DamageResult[]): {
  totalDamage: number;
  totalBlocked: number;
  critCount: number;
  dodgeCount: number;
} {
  return results.reduce(
    (acc, result) => ({
      totalDamage: acc.totalDamage + result.finalDamage,
      totalBlocked: acc.totalBlocked + result.blockedDamage,
      critCount: acc.critCount + (result.isCritical ? 1 : 0),
      dodgeCount: acc.dodgeCount + (result.isDodged ? 1 : 0),
    }),
    { totalDamage: 0, totalBlocked: 0, critCount: 0, dodgeCount: 0 }
  );
}

/**
 * 체력 적용
 */
export function applyDamageToHp(
  currentHp: number,
  maxHp: number,
  damage: number,
  healAmount: number = 0
): { newHp: number; overkill: number } {
  // 힐 먼저 적용
  let hp = Math.min(maxHp, currentHp + healAmount);

  // 피해 적용
  hp = hp - damage;

  const overkill = hp < 0 ? Math.abs(hp) : 0;
  hp = Math.max(0, hp);

  return { newHp: hp, overkill };
}
