/**
 * @file monsterEther.ts
 * @description 몬스터 에테르(은총) 시스템 및 기원 정의
 *
 * ## 몬스터 에테르 개편
 * - 몬스터의 에테르는 "은총(Grace)"으로 불림
 * - 영혼과 별개로 은총을 쌓아서 기원 가능
 * - 영혼을 뺏기지 않는 방패 역할 + 기원 발동
 * - 플레이어 에테르를 뺏거나 본인 영혼 회복 불가
 *
 * ## 기원(Prayer) 종류
 * - 면역: 영혼 보호 방어막
 * - 가호: X턴 동안 추가 에테르 획득
 * - 회복: 체력 35% 회복
 * - 공세: 공격 1회 또는 방어 1회 획득
 * - 장막: 회피 1회 획득
 */

// ==================== 기원 타입 ====================

export type PrayerType = 'immunity' | 'blessing' | 'healing' | 'offense' | 'veil';

export interface PrayerEffect {
  /** 효과 타입 */
  action: string;
  /** 수치 */
  value?: number;
  /** 지속 턴 */
  duration?: number;
  /** 비율 (%) */
  percent?: number;
}

export interface Prayer {
  /** 고유 ID */
  id: PrayerType;
  /** 표시 이름 */
  name: string;
  /** 이모지 */
  emoji: string;
  /** 설명 */
  description: string;
  /** 필요 은총 슬롯 */
  graceCost: number;
  /** 효과 */
  effect: PrayerEffect;
}

// ==================== 기원 정의 ====================

export const PRAYERS: Record<PrayerType, Prayer> = {
  immunity: {
    id: 'immunity',
    name: '면역',
    emoji: '🛡️',
    description: '영혼을 보호하는 방어막 형성. 다음 영혼 피해를 무효화.',
    graceCost: 2,
    effect: {
      action: 'soulShield',
      value: 1,
    },
  },
  blessing: {
    id: 'blessing',
    name: '가호',
    emoji: '✨',
    description: '3턴 동안 추가 에테르 획득.',
    graceCost: 2,
    effect: {
      action: 'bonusGrace',
      value: 50, // 50% 추가 획득
      duration: 3,
    },
  },
  healing: {
    id: 'healing',
    name: '회복',
    emoji: '💚',
    description: '체력을 35% 회복합니다.',
    graceCost: 3,
    effect: {
      action: 'healPercent',
      percent: 35,
    },
  },
  offense: {
    id: 'offense',
    name: '공세',
    emoji: '⚔️',
    description: '공격 1회 또는 방어 1회 획득.',
    graceCost: 2,
    effect: {
      action: 'gainAttackOrBlock',
      value: 1,
    },
  },
  veil: {
    id: 'veil',
    name: '장막',
    emoji: '💨',
    description: '회피 1회 획득.',
    graceCost: 1,
    effect: {
      action: 'gainEvade',
      value: 1,
    },
  },
};

// ==================== 은총 시스템 ====================

/** 은총 슬롯 비용 (플레이어 에테르보다 낮음) */
const GRACE_BASE_COST = 80;
const GRACE_INFLATION = 1.1;

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
 * 특정 슬롯 비용 계산
 */
export function getGraceSlotCost(slot: number): number {
  return Math.floor(GRACE_BASE_COST * Math.pow(GRACE_INFLATION, slot));
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

/**
 * 기원 사용 후 남은 은총 계산
 */
export function useGracePrayer(gracePts: number, prayerType: PrayerType): number {
  const prayer = PRAYERS[prayerType];
  if (!prayer) return gracePts;

  const costPts = graceSlotsToPts(prayer.graceCost);
  return Math.max(0, gracePts - costPts);
}

// ==================== 몬스터 은총 상태 ====================

export interface MonsterGraceState {
  /** 현재 은총 포인트 */
  gracePts: number;
  /** 영혼 보호막 (면역 기원) */
  soulShield: number;
  /** 가호 남은 턴 */
  blessingTurns: number;
  /** 가호 보너스율 (%) */
  blessingBonus: number;
  /** 사용 가능한 기원 목록 */
  availablePrayers: PrayerType[];
  /** 이번 턴 사용한 기원 */
  usedPrayersThisTurn: PrayerType[];
}

/**
 * 초기 은총 상태 생성
 */
export function createInitialGraceState(availablePrayers?: PrayerType[]): MonsterGraceState {
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
export function updateGraceOnTurnStart(state: MonsterGraceState): MonsterGraceState {
  return {
    ...state,
    // 가호 턴 감소
    blessingTurns: Math.max(0, state.blessingTurns - 1),
    blessingBonus: state.blessingTurns > 1 ? state.blessingBonus : 0,
    // 턴 사용 기록 초기화
    usedPrayersThisTurn: [],
  };
}

/**
 * 은총 획득 (가호 보너스 적용)
 */
export function gainGrace(state: MonsterGraceState, baseAmount: number): MonsterGraceState {
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
  state: MonsterGraceState,
  soulDamage: number
): [number, MonsterGraceState] {
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

  // 은총이 있으면 은총으로 피해 흡수 (1:1)
  if (state.gracePts > 0) {
    const absorbed = Math.min(state.gracePts, soulDamage * 50); // 영혼 1 = 은총 50pt
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
  /** 업데이트된 은총 상태 */
  graceState: MonsterGraceState;
  /** 몬스터 상태 변경 (hp, block, evade 등) */
  enemyChanges: {
    healAmount?: number;
    blockGain?: number;
    evadeGain?: number;
    attackGain?: number;
  };
  /** 로그 메시지 */
  log: string;
}

/**
 * 기원 발동 실행
 * @param state 현재 은총 상태
 * @param prayerType 발동할 기원
 * @param enemyMaxHp 몬스터 최대 체력 (회복 계산용)
 */
export function executePrayer(
  state: MonsterGraceState,
  prayerType: PrayerType,
  enemyMaxHp: number
): PrayerExecutionResult | null {
  const prayer = PRAYERS[prayerType];
  if (!prayer) return null;

  // 발동 가능 여부 체크
  if (!canUsePrayer(state.gracePts, prayerType)) return null;

  // 이번 턴 이미 사용했으면 불가
  if (state.usedPrayersThisTurn.includes(prayerType)) return null;

  // 사용 가능한 기원 목록에 없으면 불가
  if (!state.availablePrayers.includes(prayerType)) return null;

  // 은총 소모
  const newGracePts = useGracePrayer(state.gracePts, prayerType);
  let newState: MonsterGraceState = {
    ...state,
    gracePts: newGracePts,
    usedPrayersThisTurn: [...state.usedPrayersThisTurn, prayerType],
  };

  const enemyChanges: PrayerExecutionResult['enemyChanges'] = {};
  let log = '';

  // 효과 적용
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
      // AI가 공격/방어 중 선택 (기본: 방어)
      enemyChanges.blockGain = prayer.effect.value || 1;
      log = `${prayer.emoji} [${prayer.name}] 방어 ${prayer.effect.value}회 획득`;
      break;

    case 'gainEvade':
      enemyChanges.evadeGain = prayer.effect.value || 1;
      log = `${prayer.emoji} [${prayer.name}] 회피 ${prayer.effect.value}회 획득`;
      break;
  }

  return {
    graceState: newState,
    enemyChanges,
    log,
  };
}

// ==================== 기원 AI 시스템 ====================

/** 기원 AI 결정 입력 */
export interface PrayerAIInput {
  /** 현재 은총 상태 */
  graceState: MonsterGraceState;
  /** 몬스터 현재 체력 */
  enemyHp: number;
  /** 몬스터 최대 체력 */
  enemyMaxHp: number;
  /** 몬스터 현재 영혼 */
  enemyEtherPts: number;
  /** 플레이어 현재 영혼 */
  playerEtherPts: number;
  /** 현재 턴 번호 */
  turnNumber: number;
}

/**
 * 기원 AI: 어떤 기원을 발동할지 결정
 * @returns 발동할 기원 타입 또는 null (발동 안함)
 */
export function decidePrayer(input: PrayerAIInput): PrayerType | null {
  const { graceState, enemyHp, enemyMaxHp, enemyEtherPts, playerEtherPts } = input;

  // 사용 가능한 기원 중 발동 가능한 것 필터
  const availablePrayers = graceState.availablePrayers.filter(
    p => canUsePrayer(graceState.gracePts, p) && !graceState.usedPrayersThisTurn.includes(p)
  );

  if (availablePrayers.length === 0) return null;

  // 우선순위 결정 로직
  const hpPercent = enemyHp / enemyMaxHp;

  // 1. 체력이 50% 이하면 회복 우선
  if (hpPercent < 0.5 && availablePrayers.includes('healing')) {
    return 'healing';
  }

  // 2. 영혼 위험 (플레이어가 많이 빼앗을 수 있음) → 면역
  if (enemyEtherPts > 100 && playerEtherPts < enemyEtherPts && availablePrayers.includes('immunity')) {
    // 보호막이 없을 때만
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

  // 5. 공세 (남은 은총 활용)
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
 * @returns 발동된 기원 결과 배열
 */
export function processAutoPrayers(
  input: PrayerAIInput
): PrayerExecutionResult[] {
  const results: PrayerExecutionResult[] = [];
  let currentState = input.graceState;

  // 최대 2회까지 기원 발동 (턴당 제한)
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
