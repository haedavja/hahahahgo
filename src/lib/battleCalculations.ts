/**
 * @file battleCalculations.ts
 * @description 공유 전투 계산 유틸리티
 *
 * 게임과 시뮬레이터에서 공통으로 사용하는 전투 계산 로직입니다.
 */

// ==================== 타입 정의 ====================

export interface DamageModifiers {
  /** 기본 공격력 보너스 */
  damageBonus: number;
  /** 공격력 배율 */
  attackMultiplier: number;
  /** 추가 피해 (방어 무시) */
  bonusDamage: number;
}

export interface DefenseModifiers {
  /** 기본 방어력 보너스 */
  blockBonus: number;
  /** 방어력 배율 */
  blockMultiplier: number;
}

export interface DamageTakenModifiers {
  /** 받는 피해 배율 */
  damageMultiplier: number;
  /** 피해 감소량 */
  damageReduction: number;
}

export interface TokenState {
  [tokenId: string]: number;
}

export interface CombatResult {
  damage: number;
  blocked: number;
  actualDamage: number;
  isCrit: boolean;
  hitCount: number;
}

// ==================== 상수 ====================

/** 기본 크리티컬 확률 */
export const BASE_CRIT_CHANCE = 0.05;

/** 크리티컬 배율 */
export const CRIT_MULTIPLIER = 2.0;

/** 취약 배율 */
export const VULNERABLE_MULTIPLIER = 1.5;

/** 약화 배율 */
export const WEAK_MULTIPLIER = 0.75;

// ==================== 피해 계산 ====================

/**
 * 기본 피해량 계산
 * @param baseDamage 기본 피해량
 * @param strength 힘 수치
 * @param modifiers 추가 수정자
 */
export function calculateBaseDamage(
  baseDamage: number,
  strength: number = 0,
  modifiers: Partial<DamageModifiers> = {}
): number {
  const {
    damageBonus = 0,
    attackMultiplier = 1,
    bonusDamage = 0,
  } = modifiers;

  // (기본 피해 + 힘 + 보너스) × 배율 + 추가 피해
  const base = baseDamage + strength + damageBonus;
  const multiplied = Math.floor(base * attackMultiplier);
  return multiplied + bonusDamage;
}

/**
 * 방어력 적용 후 실제 피해 계산
 * @param damage 피해량
 * @param block 방어력
 * @param ignoreBlock 방어 무시 여부
 */
export function applyBlock(
  damage: number,
  block: number,
  ignoreBlock: boolean = false
): { actualDamage: number; remainingBlock: number; blocked: number } {
  if (ignoreBlock || block <= 0) {
    return {
      actualDamage: damage,
      remainingBlock: block,
      blocked: 0,
    };
  }

  const blocked = Math.min(damage, block);
  const actualDamage = damage - blocked;
  const remainingBlock = block - blocked;

  return {
    actualDamage,
    remainingBlock,
    blocked,
  };
}

/**
 * 취약 상태 피해 배율 적용
 */
export function applyVulnerable(damage: number, isVulnerable: boolean): number {
  return isVulnerable ? Math.floor(damage * VULNERABLE_MULTIPLIER) : damage;
}

/**
 * 약화 상태 피해 배율 적용
 */
export function applyWeak(damage: number, isWeak: boolean): number {
  return isWeak ? Math.floor(damage * WEAK_MULTIPLIER) : damage;
}

/**
 * 크리티컬 히트 계산
 */
export function applyCritical(
  damage: number,
  isCrit: boolean,
  critMultiplier: number = CRIT_MULTIPLIER
): number {
  return isCrit ? Math.floor(damage * critMultiplier) : damage;
}

/**
 * 크리티컬 여부 결정
 */
export function rollCrit(critChance: number = BASE_CRIT_CHANCE): boolean {
  return Math.random() < critChance;
}

// ==================== 방어력 계산 ====================

/**
 * 기본 방어력 계산
 */
export function calculateBaseBlock(
  baseBlock: number,
  strength: number = 0,
  modifiers: Partial<DefenseModifiers> = {}
): number {
  const {
    blockBonus = 0,
    blockMultiplier = 1,
  } = modifiers;

  // (기본 방어 + 힘 + 보너스) × 배율
  const base = baseBlock + strength + blockBonus;
  return Math.floor(base * blockMultiplier);
}

/**
 * 성장형 방어력 보너스 계산
 * growingDefense 특성: 타임라인 위치에 따라 방어력 증가
 */
export function calculateGrowingDefenseBonus(
  hasGrowingDefense: boolean,
  currentPosition: number,
  growthRate: number = 1
): number {
  if (!hasGrowingDefense) return 0;
  return Math.floor(currentPosition * growthRate);
}

// ==================== 다중 타격 계산 ====================

/**
 * 다중 타격 피해 계산
 */
export function calculateMultiHitDamage(
  baseDamagePerHit: number,
  hits: number,
  targetBlock: number,
  options: {
    strength?: number;
    attackModifiers?: Partial<DamageModifiers>;
    isVulnerable?: boolean;
    isWeak?: boolean;
    ignoreBlock?: boolean;
  } = {}
): CombatResult {
  const {
    strength = 0,
    attackModifiers = {},
    isVulnerable = false,
    isWeak = false,
    ignoreBlock = false,
  } = options;

  let totalDamage = 0;
  let totalBlocked = 0;
  let totalActualDamage = 0;
  let remainingBlock = targetBlock;

  for (let i = 0; i < hits; i++) {
    // 기본 피해 계산
    let damage = calculateBaseDamage(baseDamagePerHit, strength, attackModifiers);

    // 약화 적용
    damage = applyWeak(damage, isWeak);

    // 취약 적용
    damage = applyVulnerable(damage, isVulnerable);

    totalDamage += damage;

    // 방어력 적용
    const blockResult = applyBlock(damage, remainingBlock, ignoreBlock);
    totalBlocked += blockResult.blocked;
    totalActualDamage += blockResult.actualDamage;
    remainingBlock = blockResult.remainingBlock;
  }

  return {
    damage: totalDamage,
    blocked: totalBlocked,
    actualDamage: totalActualDamage,
    isCrit: false,
    hitCount: hits,
  };
}

// ==================== 반격 계산 ====================

/**
 * 반격 피해 계산
 */
export function calculateCounterDamage(
  counterStacks: number,
  modifiers: Partial<DamageModifiers> = {}
): number {
  return calculateBaseDamage(counterStacks, 0, modifiers);
}

// ==================== 유틸리티 ====================

/**
 * HP 적용 (최소 0, 최대 maxHp)
 */
export function clampHp(hp: number, maxHp: number): number {
  return Math.max(0, Math.min(hp, maxHp));
}

/**
 * 피해 적용 결과
 */
export function applyDamage(
  currentHp: number,
  maxHp: number,
  damage: number
): { newHp: number; actualDamage: number; overkill: number } {
  const actualDamage = Math.min(damage, currentHp);
  const newHp = clampHp(currentHp - damage, maxHp);
  const overkill = Math.max(0, damage - currentHp);

  return {
    newHp,
    actualDamage,
    overkill,
  };
}

/**
 * 치유 적용 결과
 */
export function applyHeal(
  currentHp: number,
  maxHp: number,
  heal: number
): { newHp: number; actualHeal: number; overheal: number } {
  const actualHeal = Math.min(heal, maxHp - currentHp);
  const newHp = clampHp(currentHp + heal, maxHp);
  const overheal = Math.max(0, heal - actualHeal);

  return {
    newHp,
    actualHeal,
    overheal,
  };
}

/**
 * 전투 결과 요약 생성
 */
export function summarizeCombat(result: CombatResult): string {
  const parts: string[] = [];

  if (result.hitCount > 1) {
    parts.push(`${result.hitCount}회 타격`);
  }

  parts.push(`총 ${result.damage} 피해`);

  if (result.blocked > 0) {
    parts.push(`${result.blocked} 방어`);
  }

  parts.push(`실제 ${result.actualDamage} 피해`);

  if (result.isCrit) {
    parts.push('크리티컬!');
  }

  return parts.join(', ');
}
