/**
 * @file grace-system.ts
 * @description 시뮬레이터용 몬스터 은총(Grace) 시스템
 *
 * 게임의 monsterEther.ts와 동일한 로직 구현
 * - 은총 포인트 → 슬롯 변환
 * - 기원(Prayer) 발동
 * - 영혼 보호막
 * - 은총으로 영혼 피해 흡수
 */

import type { GraceState, PrayerType, EnemyState } from './game-types';
import { addToken } from './token-system';

// ==================== 상수 ====================

/** 은총 슬롯 비용 (게임과 동일) */
const GRACE_BASE_COST = 80;
const GRACE_INFLATION = 1.1;

/** 기원 정의 */
export interface Prayer {
  id: PrayerType;
  name: string;
  emoji: string;
  graceCost: number;
  effect: {
    action: string;
    value?: number;
    duration?: number;
    percent?: number;
  };
}

export const PRAYERS: Record<PrayerType, Prayer> = {
  immunity: {
    id: 'immunity',
    name: '면역',
    emoji: '🛡️',
    graceCost: 2,
    effect: { action: 'soulShield', value: 1 },
  },
  blessing: {
    id: 'blessing',
    name: '가호',
    emoji: '✨',
    graceCost: 2,
    effect: { action: 'bonusGrace', value: 50, duration: 3 },
  },
  healing: {
    id: 'healing',
    name: '회복',
    emoji: '💚',
    graceCost: 3,
    effect: { action: 'healPercent', percent: 35 },
  },
  offense: {
    id: 'offense',
    name: '공세',
    emoji: '⚔️',
    graceCost: 2,
    effect: { action: 'gainAttackOrBlock', value: 1 },
  },
  veil: {
    id: 'veil',
    name: '장막',
    emoji: '💨',
    graceCost: 1,
    effect: { action: 'gainEvade', value: 1 },
  },
};

// ==================== 은총 계산 함수 ====================

/**
 * 은총 포인트를 슬롯으로 변환
 */
export function calculateGraceSlots(pts: number): number {
  if (!pts || pts < GRACE_BASE_COST) return 0;

  let totalPts = 0;
  let slotCost = GRACE_BASE_COST;
  let slots = 0;

  while (totalPts + slotCost <= pts) {
    totalPts += slotCost;
    slots++;
    slotCost = Math.floor(slotCost * GRACE_INFLATION);
  }

  return slots;
}

/**
 * N슬롯까지 필요한 총 은총 포인트
 */
export function graceSlotsToPts(slots: number): number {
  if (slots <= 0) return 0;

  let totalPts = 0;
  let slotCost = GRACE_BASE_COST;

  for (let i = 0; i < slots; i++) {
    totalPts += slotCost;
    slotCost = Math.floor(slotCost * GRACE_INFLATION);
  }

  return totalPts;
}

/**
 * 기원 발동 가능 여부 확인
 */
export function canUsePrayer(gracePts: number, prayerType: PrayerType): boolean {
  const prayer = PRAYERS[prayerType];
  if (!prayer) return false;

  const graceSlots = calculateGraceSlots(gracePts);
  return graceSlots >= prayer.graceCost;
}

// ==================== 은총 상태 관리 ====================

/**
 * 초기 은총 상태 생성
 */
export function createInitialGraceState(availablePrayers?: PrayerType[]): GraceState {
  return {
    gracePts: 0,
    soulShield: 0,
    blessingTurns: 0,
    blessingBonus: 0,
    availablePrayers: availablePrayers || ['immunity', 'healing', 'veil'],
    usedPrayersThisTurn: [],
  };
}

/**
 * 턴 시작 시 은총 상태 업데이트
 */
export function updateGraceOnTurnStart(state: GraceState): GraceState {
  return {
    ...state,
    blessingTurns: Math.max(0, state.blessingTurns - 1),
    blessingBonus: state.blessingTurns > 1 ? state.blessingBonus : 0,
    usedPrayersThisTurn: [],
  };
}

/**
 * 은총 획득 (가호 보너스 적용)
 */
export function gainGrace(state: GraceState, baseAmount: number): GraceState {
  const bonus = state.blessingTurns > 0 ? Math.floor(baseAmount * state.blessingBonus / 100) : 0;
  return {
    ...state,
    gracePts: state.gracePts + baseAmount + bonus,
  };
}

/**
 * 영혼 피해 시 은총 방패 체크
 * @returns [남은 피해, 업데이트된 상태]
 */
export function checkSoulShield(
  state: GraceState,
  soulDamage: number
): [number, GraceState] {
  // 영혼 보호막이 있으면 피해 무효화
  if (state.soulShield > 0) {
    const blocked = Math.min(state.soulShield, soulDamage);
    return [
      soulDamage - blocked,
      {
        ...state,
        soulShield: state.soulShield - blocked,
      },
    ];
  }

  // 은총이 있으면 은총으로 피해 흡수 (영혼 1 = 은총 50pt)
  if (state.gracePts > 0) {
    const absorbed = Math.min(state.gracePts, soulDamage * 50);
    const blockedSoulDamage = Math.floor(absorbed / 50);
    return [
      soulDamage - blockedSoulDamage,
      {
        ...state,
        gracePts: state.gracePts - absorbed,
      },
    ];
  }

  return [soulDamage, state];
}

// ==================== 기원 발동 시스템 ====================

/** 기원 발동 결과 */
export interface PrayerExecutionResult {
  graceState: GraceState;
  enemyChanges: {
    healAmount?: number;
    blockGain?: number;
    evadeGain?: number;
    attackGain?: number;
  };
  log: string;
}

/**
 * 기원 발동 실행
 */
export function executePrayer(
  state: GraceState,
  prayerType: PrayerType,
  enemyMaxHp: number
): PrayerExecutionResult | null {
  const prayer = PRAYERS[prayerType];
  if (!prayer) return null;

  // 발동 가능 여부 체크
  if (!canUsePrayer(state.gracePts, prayerType)) return null;
  if (state.usedPrayersThisTurn.includes(prayerType)) return null;
  if (!state.availablePrayers.includes(prayerType)) return null;

  // 은총 소모
  const costPts = graceSlotsToPts(prayer.graceCost);
  let newState: GraceState = {
    ...state,
    gracePts: Math.max(0, state.gracePts - costPts),
    usedPrayersThisTurn: [...state.usedPrayersThisTurn, prayerType],
  };

  const enemyChanges: PrayerExecutionResult['enemyChanges'] = {};
  let log = '';

  switch (prayer.effect.action) {
    case 'soulShield':
      newState = {
        ...newState,
        soulShield: newState.soulShield + (prayer.effect.value || 1),
      };
      log = `${prayer.emoji} [${prayer.name}] 영혼 보호막 ${prayer.effect.value}회 획득`;
      break;

    case 'bonusGrace':
      newState = {
        ...newState,
        blessingTurns: prayer.effect.duration || 3,
        blessingBonus: prayer.effect.value || 50,
      };
      log = `${prayer.emoji} [${prayer.name}] ${prayer.effect.duration}턴간 은총 ${prayer.effect.value}% 추가 획득`;
      break;

    case 'healPercent':
      const healAmount = Math.floor(enemyMaxHp * (prayer.effect.percent || 35) / 100);
      enemyChanges.healAmount = healAmount;
      log = `${prayer.emoji} [${prayer.name}] 체력 ${healAmount} 회복`;
      break;

    case 'gainAttackOrBlock':
      enemyChanges.blockGain = prayer.effect.value || 1;
      log = `${prayer.emoji} [${prayer.name}] 방어 ${prayer.effect.value}회 획득`;
      break;

    case 'gainEvade':
      enemyChanges.evadeGain = prayer.effect.value || 1;
      log = `${prayer.emoji} [${prayer.name}] 회피 ${prayer.effect.value}회 획득`;
      break;
  }

  return { graceState: newState, enemyChanges, log };
}

// ==================== 기원 AI 시스템 ====================

export interface PrayerAIInput {
  graceState: GraceState;
  enemyHp: number;
  enemyMaxHp: number;
  enemyEtherPts: number;
  playerEtherPts: number;
  turnNumber: number;
}

/**
 * 기원 AI: 어떤 기원을 발동할지 결정
 */
export function decidePrayer(input: PrayerAIInput): PrayerType | null {
  const { graceState, enemyHp, enemyMaxHp, enemyEtherPts } = input;

  const availablePrayers = graceState.availablePrayers.filter(
    p => canUsePrayer(graceState.gracePts, p) && !graceState.usedPrayersThisTurn.includes(p)
  );

  if (availablePrayers.length === 0) return null;

  const hpPercent = enemyHp / enemyMaxHp;

  // 1. 체력이 50% 이하면 회복 우선
  if (hpPercent < 0.5 && availablePrayers.includes('healing')) {
    return 'healing';
  }

  // 2. 영혼 위험 → 면역
  if (enemyEtherPts > 0 && enemyEtherPts <= 50 && availablePrayers.includes('immunity')) {
    if (graceState.soulShield === 0) {
      return 'immunity';
    }
  }

  // 3. 가호가 없고 사용 가능하면 가호
  if (graceState.blessingTurns === 0 && availablePrayers.includes('blessing')) {
    return 'blessing';
  }

  // 4. 체력이 70% 이하면 장막(회피)
  if (hpPercent < 0.7 && availablePrayers.includes('veil')) {
    return 'veil';
  }

  // 5. 공세
  if (availablePrayers.includes('offense')) {
    return 'offense';
  }

  // 6. 은총이 충분하면 아무 기원이나 발동
  const graceSlots = calculateGraceSlots(graceState.gracePts);
  if (graceSlots >= 3 && availablePrayers.length > 0) {
    return availablePrayers[0];
  }

  return null;
}

/**
 * 기원 자동 발동 처리
 */
export function processAutoPrayers(input: PrayerAIInput): PrayerExecutionResult[] {
  const results: PrayerExecutionResult[] = [];
  let currentState = input.graceState;

  // 최대 2회까지 기원 발동
  for (let i = 0; i < 2; i++) {
    const prayerType = decidePrayer({
      ...input,
      graceState: currentState,
    });

    if (!prayerType) break;

    const result = executePrayer(currentState, prayerType, input.enemyMaxHp);
    if (result) {
      results.push(result);
      currentState = result.graceState;
    } else {
      break;
    }
  }

  return results;
}

/**
 * 기원 효과를 적 상태에 적용
 */
export function applyPrayerEffects(
  enemy: EnemyState,
  result: PrayerExecutionResult
): EnemyState {
  let updatedEnemy = { ...enemy };

  if (result.enemyChanges.healAmount) {
    updatedEnemy.hp = Math.min(
      updatedEnemy.maxHp || updatedEnemy.hp,
      updatedEnemy.hp + result.enemyChanges.healAmount
    );
  }

  if (result.enemyChanges.blockGain) {
    updatedEnemy.block = (updatedEnemy.block || 0) + result.enemyChanges.blockGain;
  }

  if (result.enemyChanges.evadeGain) {
    updatedEnemy.tokens = addToken(updatedEnemy.tokens || {}, 'evade', result.enemyChanges.evadeGain);
  }

  return updatedEnemy;
}
