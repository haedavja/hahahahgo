/**
 * @file core.ts
 * @description 토큰 시스템 핵심 로직 (게임/시뮬레이터 공유)
 *
 * 토큰 효과 계산, 상쇄 규칙, 특수 처리 등 핵심 로직을 제공합니다.
 * 저장소 형식(배열/객체)에 독립적으로 동작합니다.
 */

// ==================== 토큰 상쇄 맵 ====================

/** 상충하는 토큰 쌍 (A를 추가하면 B가 상쇄됨) */
export const TOKEN_CONFLICTS: Record<string, string> = {
  // 공격 ↔ 약화
  offense: 'dull',
  offensePlus: 'dullPlus',
  attack: 'dullness',
  attackPlus: 'dullnessPlus',
  // 방어 ↔ 흔들림
  guard: 'shaken',
  guardPlus: 'shakenPlus',
  defense: 'exposed',
  defensePlus: 'exposedPlus',
  // 힘 ↔ 쇠약
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
  // 장전 ↔ 탄걸림
  loaded: 'gun_jam',
  gun_jam: 'loaded',
};

/** 토큰 스택 상한 */
export const TOKEN_STACK_LIMITS: Record<string, number> = {
  strength: 99,
  agility: 10,
  burn: 10,
  poison: 20,
  counter: 5,
  counterShot: 10,
  roulette: 20,
  finesse: 10,
};

/** 탄걸림 시 제거되는 토큰들 */
export const GUN_JAM_REMOVES = [
  'loaded',
  'rapidFire',
  'armor_piercing',
  'fragmentation',
  'incendiary',
];

// ==================== 공격 수정자 ====================

export interface AttackModifiers {
  attackMultiplier: number;
  damageBonus: number;
  critBoost: number;
  ignoreBlock: boolean;
  lifesteal: number;
}

/**
 * 공격 수정자 계산 (토큰 스택 조회 함수를 받음)
 */
export function calculateAttackModifiers(
  getStacks: (tokenId: string) => number,
  has: (tokenId: string) => boolean
): AttackModifiers {
  let attackMultiplier = 1;
  let damageBonus = 0;
  let critBoost = 0;
  let ignoreBlock = false;
  let lifesteal = 0;

  // === 양수 배율 (가장 높은 것만) ===
  let permanentBoost = 1;
  let turnBoost = 1;

  if (has('offensePlus')) {
    permanentBoost = 2.0;
  } else if (has('offense')) {
    permanentBoost = 1.5;
  }

  if (has('attackPlus')) {
    turnBoost = 2.0;
  } else if (has('attack')) {
    turnBoost = 1.5;
  }

  const positiveBonus = (permanentBoost - 1) + (turnBoost - 1);

  // === 음수 배율 (가장 나쁜 것만) ===
  let permanentDebuff = 1;
  let turnDebuff = 1;

  if (has('dullPlus')) {
    permanentDebuff = 0.25;
  } else if (has('dull')) {
    permanentDebuff = 0.5;
  }

  if (has('dullnessPlus')) {
    turnDebuff = 0.25;
  } else if (has('dullness')) {
    turnDebuff = 0.5;
  }

  const negativeMultiplier = Math.min(permanentDebuff, turnDebuff);
  attackMultiplier = (1 + positiveBonus) * negativeMultiplier;

  // 힘 - 스택당 공격력 1 증가
  const strengthStacks = getStacks('strength');
  if (strengthStacks > 0) {
    damageBonus += strengthStacks;
  }

  // 날 세우기 - 스택당 공격력 증가
  const sharpenedStacks = getStacks('sharpened_blade');
  if (sharpenedStacks > 0) {
    damageBonus += sharpenedStacks;
  }

  // 집중 - 치명타 확률 5% 증가
  const critStacks = getStacks('crit_boost');
  if (critStacks > 0) {
    critBoost += critStacks * 5;
  }

  // 철갑탄 - 방어력 무시
  if (has('armor_piercing')) {
    ignoreBlock = true;
  }

  // 파쇄탄 - 피해 6 증가
  if (has('fragmentation')) {
    damageBonus += 6;
  }

  // 흡수 - 50% 흡혈
  if (has('absorb')) {
    lifesteal = 0.5;
  }

  return { attackMultiplier, damageBonus, critBoost, ignoreBlock, lifesteal };
}

// ==================== 방어 수정자 ====================

export interface DefenseModifiers {
  defenseMultiplier: number;
  defenseBonus: number;
  dodgeChance: number;
}

/**
 * 방어 수정자 계산
 */
export function calculateDefenseModifiers(
  getStacks: (tokenId: string) => number,
  has: (tokenId: string) => boolean
): DefenseModifiers {
  let defenseMultiplier = 1;
  let defenseBonus = 0;
  let dodgeChance = 0;

  // === 양수 배율 ===
  let permanentBoost = 1;
  let turnBoost = 1;

  if (has('guardPlus')) {
    permanentBoost = 2.0;
  } else if (has('guard')) {
    permanentBoost = 1.5;
  }

  if (has('defensePlus')) {
    turnBoost = 2.0;
  } else if (has('defense')) {
    turnBoost = 1.5;
  }

  const positiveBonus = (permanentBoost - 1) + (turnBoost - 1);

  // === 음수 배율 ===
  let permanentDebuff = 1;
  let turnDebuff = 1;

  if (has('shakenPlus')) {
    permanentDebuff = 0;
  } else if (has('shaken')) {
    permanentDebuff = 0.5;
  }

  if (has('exposedPlus')) {
    turnDebuff = 0;
  } else if (has('exposed')) {
    turnDebuff = 0.5;
  }

  const negativeMultiplier = Math.min(permanentDebuff, turnDebuff);
  defenseMultiplier = (1 + positiveBonus) * negativeMultiplier;

  // 힘 - 스택당 방어력 1 증가
  const strengthStacks = getStacks('strength');
  if (strengthStacks > 0) {
    defenseBonus += strengthStacks;
  }

  // 회피 확률
  if (has('blurPlus')) {
    dodgeChance = Math.max(dodgeChance, 0.75);
  } else if (has('blur')) {
    dodgeChance = Math.max(dodgeChance, 0.5);
  }

  if (has('dodgePlus')) {
    dodgeChance = Math.max(dodgeChance, 0.75);
  } else if (has('dodge')) {
    dodgeChance = Math.max(dodgeChance, 0.5);
  }

  if (has('evasion')) {
    dodgeChance = Math.max(dodgeChance, 0.5);
  }

  return { defenseMultiplier, defenseBonus, dodgeChance };
}

// ==================== 받는 피해 수정자 ====================

export interface DamageTakenModifiers {
  damageMultiplier: number;
  damageReduction: number;
}

/**
 * 받는 피해 수정자 계산
 */
export function calculateDamageTakenModifiers(
  has: (tokenId: string) => boolean
): DamageTakenModifiers {
  let damageMultiplier = 1;
  const damageReduction = 0;

  // 허약 - 50% 추가 피해
  if (has('vulnerable')) {
    damageMultiplier *= 1.5;
  }

  // 허약+ - 100% 추가 피해
  if (has('vulnerablePlus')) {
    damageMultiplier *= 2.0;
  }

  // 아픔 - 50% 추가 피해
  if (has('pain')) {
    damageMultiplier *= 1.5;
  }

  // 아픔+ - 100% 추가 피해
  if (has('painPlus')) {
    damageMultiplier *= 2.0;
  }

  return { damageMultiplier, damageReduction };
}

// ==================== 에너지/속도 수정자 ====================

/**
 * 에너지 수정자 계산
 */
export function calculateEnergyModifier(has: (tokenId: string) => boolean): number {
  let modifier = 0;

  // 몸풀기 - 행동력 +2
  if (has('warmedUp')) {
    modifier += 2;
  }

  // 현기증 - 행동력 -2
  if (has('dizzy')) {
    modifier -= 2;
  }

  return modifier;
}

/**
 * 속도 수정자 계산
 */
export function calculateSpeedModifier(getStacks: (tokenId: string) => number): number {
  let modifier = 0;

  // 민첩 - 스택당 속도 -1
  const agilityStacks = getStacks('agility');
  if (agilityStacks > 0) {
    modifier -= agilityStacks;
  }

  return modifier;
}

// ==================== 특수 토큰 처리 ====================

/**
 * 룰렛 탄걸림 확률 계산
 */
export function calculateJamChance(
  rouletteStacks: number,
  reduceJamChance: boolean = false
): number {
  const jamPerStack = reduceJamChance ? 0.03 : 0.05;
  return rouletteStacks * jamPerStack;
}

/**
 * 화상 피해 계산
 */
export function calculateBurnDamage(burnStacks: number): number {
  return burnStacks * 3;
}

/**
 * 반격 피해 계산
 */
export function calculateCounterDamage(
  baseDamage: number,
  strengthStacks: number
): number {
  return baseDamage + strengthStacks;
}

/**
 * 부활 HP 계산
 */
export function calculateReviveHp(maxHp: number): number {
  return Math.floor(maxHp * 0.5);
}

// ==================== 상쇄 계산 ====================

export interface CancelResult {
  cancelled: number;
  remaining: number;
}

/**
 * 토큰 상쇄량 계산
 */
export function calculateCancellation(
  newStacks: number,
  oppositeStacks: number
): CancelResult {
  const cancelled = Math.min(newStacks, oppositeStacks);
  return {
    cancelled,
    remaining: newStacks - cancelled,
  };
}

/**
 * 충돌 토큰 ID 조회
 */
export function getConflictingTokenId(tokenId: string): string | undefined {
  return TOKEN_CONFLICTS[tokenId];
}

/**
 * 스택 상한 조회
 */
export function getStackLimit(tokenId: string): number {
  return TOKEN_STACK_LIMITS[tokenId] || 99;
}

// ==================== 소모 토큰 목록 ====================

/** 공격 시 소모되는 토큰 */
export const ATTACK_CONSUME_TOKENS = [
  'offense',
  'offensePlus',
  'dull',
  'dullPlus',
  'armor_piercing',
  'fragmentation',
  'absorb',
  'incendiary',
];

/** 방어 시 소모되는 토큰 */
export const DEFENSE_CONSUME_TOKENS = [
  'guard',
  'guardPlus',
  'shaken',
  'shakenPlus',
];

/** 피해 받을 시 소모되는 토큰 */
export const DAMAGE_TAKEN_CONSUME_TOKENS = [
  'pain',
  'painPlus',
  'blur',
  'blurPlus',
  'evasion',
];

// ==================== 토큰 분류 ====================

export type TokenCategory = 'positive' | 'negative' | 'neutral';
export type TokenType = 'usage' | 'turn' | 'permanent';

/** 부정 효과 토큰 목록 */
export const NEGATIVE_TOKENS = new Set([
  'dull',
  'dullPlus',
  'dullness',
  'dullnessPlus',
  'shaken',
  'shakenPlus',
  'exposed',
  'exposedPlus',
  'vulnerable',
  'vulnerablePlus',
  'pain',
  'painPlus',
  'weakness',
  'slowness',
  'burn',
  'poison',
  'gun_jam',
  'dizzy',
  'shroud',
  'veil',
]);

/**
 * 부정 효과 토큰인지 확인
 */
export function isNegativeToken(tokenId: string): boolean {
  return NEGATIVE_TOKENS.has(tokenId);
}
