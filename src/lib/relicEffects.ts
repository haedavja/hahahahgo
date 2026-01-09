/**
 * @file relicEffects.ts
 * @description 상징 효과 처리 유틸리티
 *
 * ## 효과 타입
 * - PASSIVE: 항상 적용 (스탯 증가 등)
 * - ON_COMBAT_START: 전투 시작 시
 * - ON_TURN_START: 턴 시작 시
 * - ON_CARD_PLAYED: 카드 사용 시
 */

import { getRelicById } from '../data/relics';
import { getNextSlotCost } from './etherUtils';
import type {
  Card,
  RelicEffectsDefinition,
  PassiveStats,
  CombatStartChanges,
  CombatEndChanges,
  TurnStartChanges,
  TurnEndChanges,
  CardPlayedChanges,
  DamageTakenChanges,
  ExtraSlots,
  RelicWithEffects,
  RelicCombatEndState as CombatEndState,
  RelicTurnState as TurnState
} from '../types';

/**
 * calculatePassiveEffects 결과 캐싱
 * 동일한 relicIds 배열에 대해 재계산 방지
 */
let passiveEffectsCache: { key: string; result: PassiveStats } | null = null;

/**
 * relicIds 배열을 캐시 키로 변환
 */
function getRelicsCacheKey(relicIds: string[]): string {
  return relicIds.slice().sort().join(',');
}

/**
 * PASSIVE 효과를 계산하여 스탯 변화를 반환
 * 메모이제이션 적용: 동일한 relicIds에 대해 캐시된 결과 반환
 */
export function calculatePassiveEffects(relicIds: string[] = []): PassiveStats {
  // 캐시 키 생성 및 캐시 히트 체크
  const cacheKey = getRelicsCacheKey(relicIds);
  if (passiveEffectsCache && passiveEffectsCache.key === cacheKey) {
    return passiveEffectsCache.result;
  }

  const stats: PassiveStats = {
    maxEnergy: 0,
    maxHp: 0,
    maxSpeed: 0,
    speed: 0,
    strength: 0,
    agility: 0,
    subSpecialSlots: 0,
    mainSpecialSlots: 0,
    cardDrawBonus: 0,
    etherMultiplier: 1,
    etherFiveCardBonus: 0,
    etherCardMultiplier: false,
    maxSubmitCards: 0,
    extraCardPlay: 0,
    rewindCount: 0,
    negativeTraitMultiplier: 1,
    positiveTraitMultiplier: 1,
    // 새로 추가된 효과들
    comboMultiplierPerCard: 0,
    conditionalEnergy: null,
    lowHpBonus: null,
    combatDamage: 0,
    drawPerTurn: 0,
    deckSizePenalty: 0,
    lowHpDamageScaling: false,
    comboMultiplierBonus: 0,
    hpLossPerTurn: 0,
    firstTurnEnergy: 0,
    lastTurnEnergy: 0,
    shopDiscount: 0,
    permanentVIP: false,
    freeReroll: false,
    sellPriceBonus: 0,
    equalBuySell: false,
    doubleDiscounts: false,
  };

  relicIds.forEach(relicId => {
    const relic = getRelicById(relicId) as RelicWithEffects | null;
    if (!relic || relic.effects.type !== 'PASSIVE') return;

    const effects = relic.effects;

    if (effects.maxEnergy) stats.maxEnergy += effects.maxEnergy;
    if (effects.maxHp) stats.maxHp += effects.maxHp;
    if (effects.maxSpeed) stats.maxSpeed += effects.maxSpeed;
    if (effects.speed) stats.speed += effects.speed;
    if (effects.strength) stats.strength += effects.strength;
    if (effects.agility) stats.agility += effects.agility;
    if (effects.subSpecialSlots) stats.subSpecialSlots += effects.subSpecialSlots;
    if (effects.mainSpecialSlots) stats.mainSpecialSlots += effects.mainSpecialSlots;
    if (effects.cardDrawBonus) stats.cardDrawBonus += effects.cardDrawBonus;
    if (effects.etherMultiplier) stats.etherMultiplier *= effects.etherMultiplier;
    if (effects.etherFiveCardBonus) stats.etherFiveCardBonus += effects.etherFiveCardBonus;
    if (effects.etherCardMultiplier) stats.etherCardMultiplier = true;
    if (effects.maxSubmitCards) stats.maxSubmitCards = effects.maxSubmitCards;
    if (effects.extraCardPlay) stats.extraCardPlay += effects.extraCardPlay;
    // 시계: 되감기 횟수 추가
    if (effects.rewindCount) stats.rewindCount += effects.rewindCount;
    // 비웃는가면: 부정 특성 배율 (곱셈)
    if (effects.negativeTraitMultiplier) stats.negativeTraitMultiplier *= effects.negativeTraitMultiplier;
    // 축하의화환: 긍정 특성 배율 (곱셈)
    if (effects.positiveTraitMultiplier) stats.positiveTraitMultiplier *= effects.positiveTraitMultiplier;

    // === 새로 추가된 효과들 ===
    // 에테르보석: 카드 1장당 곱배수 추가
    if (effects.comboMultiplierPerCard) stats.comboMultiplierPerCard += effects.comboMultiplierPerCard;
    // 영혼조각: 조건부 행동력
    if (effects.conditionalEnergy) {
      const ce = effects.conditionalEnergy as { threshold50?: number; threshold25?: number };
      stats.conditionalEnergy = {
        threshold50: (stats.conditionalEnergy?.threshold50 || 0) + (ce.threshold50 || 1),
        threshold25: (stats.conditionalEnergy?.threshold25 || 0) + (ce.threshold25 || 2),
      };
    }
    // 공허의심장: 저체력 보너스
    if (effects.lowHpBonus) {
      const lhb = effects.lowHpBonus as { damageBonus?: number; damageReduction?: number; threshold?: number };
      stats.lowHpBonus = {
        damageBonus: (stats.lowHpBonus?.damageBonus || 0) + (lhb.damageBonus || 0.5),
        damageReduction: (stats.lowHpBonus?.damageReduction || 0) + (lhb.damageReduction || 0.3),
        threshold: lhb.threshold || 0.3,
      };
    }
    // 금단의힘: 전투 시 체력 손실
    if (effects.combatDamage) stats.combatDamage += effects.combatDamage;
    // 금단의지혜: 매 턴 추가 드로우
    if (effects.drawPerTurn) stats.drawPerTurn += effects.drawPerTurn;
    // 금단의지혜: 덱 크기 페널티
    if (effects.deckSizePenalty) stats.deckSizePenalty += effects.deckSizePenalty;
    // 불사조의재: HP 비율 피해 스케일링
    if (effects.lowHpDamageScaling) stats.lowHpDamageScaling = true;
    // 심연의핵: 콤보 배율 보너스 (PASSIVE에서도 적용)
    if (effects.comboMultiplierBonus) stats.comboMultiplierBonus += effects.comboMultiplierBonus;
    // 심연의핵: 매 턴 체력 손실
    if (effects.hpLossPerTurn) stats.hpLossPerTurn += effects.hpLossPerTurn;
    // 역설의파편: 첫 턴 행동력
    if (effects.firstTurnEnergy) stats.firstTurnEnergy += effects.firstTurnEnergy;
    // 역설의파편: 마지막 턴 행동력
    if (effects.lastTurnEnergy) stats.lastTurnEnergy += effects.lastTurnEnergy;
    // 상점 할인 관련
    if (effects.shopDiscount) stats.shopDiscount += effects.shopDiscount;
    if (effects.permanentVIP) stats.permanentVIP = true;
    if (effects.freeReroll) stats.freeReroll = true;
    if (effects.sellPriceBonus) stats.sellPriceBonus += effects.sellPriceBonus;
    if (effects.equalBuySell) stats.equalBuySell = true;
    if (effects.doubleDiscounts) stats.doubleDiscounts = true;
  });

  // 결과 캐싱
  passiveEffectsCache = { key: cacheKey, result: stats };

  return stats;
}

/**
 * 캐시 무효화 (테스트/개발용)
 */
export function invalidatePassiveEffectsCache(): void {
  passiveEffectsCache = null;
}

/**
 * ON_COMBAT_START 효과 처리
 */
export function applyCombatStartEffects(
  relicIds: string[] = [],
  _state: object = {}
): CombatStartChanges {
  const changes: CombatStartChanges = {
    block: 0,
    heal: 0,
    energy: 0,
    damage: 0,
    strength: 0,
    grantImmunity: 0,
    setHp: null,
    grantInvincible: 0,
    timelineAdvance: 0,
  };

  relicIds.forEach(relicId => {
    const relic = getRelicById(relicId) as RelicWithEffects | null;
    if (!relic || relic.effects.type !== 'ON_COMBAT_START') return;

    const effects = relic.effects;
    if (effects.block) changes.block += effects.block;
    if (effects.heal) changes.heal += effects.heal;
    if (effects.energy) changes.energy += effects.energy;
    if (effects.damage) changes.damage += effects.damage;
    if (effects.strength) changes.strength += effects.strength;
    // 보약: 면역 부여
    if (effects.grantImmunity) changes.grantImmunity += effects.grantImmunity;
    // 죽음의포옹: 체력 설정
    if (effects.setHp !== undefined) changes.setHp = effects.setHp;
    // 죽음의포옹: 무적 부여
    if (effects.grantInvincible) changes.grantInvincible += effects.grantInvincible;
    // 시간의고리: 타임라인 선행
    if (effects.timelineAdvance) changes.timelineAdvance += effects.timelineAdvance;
  });

  return changes;
}

/**
 * ON_COMBAT_END 효과 처리
 */
export function applyCombatEndEffects(
  relicIds: string[] = [],
  state: CombatEndState = {}
): CombatEndChanges {
  const changes: CombatEndChanges = {
    heal: 0,
    maxHp: 0,
  };

  relicIds.forEach(relicId => {
    const relic = getRelicById(relicId) as RelicWithEffects | null;
    if (!relic || relic.effects.type !== 'ON_COMBAT_END') return;

    const effects = relic.effects;

    // 조건부 효과 확인
    if (effects.condition && !effects.condition(state as TurnState)) {
      // 건강검진표: 체력이 다쳤으면 회복
      if (effects.healIfDamaged && state.playerHp !== undefined && state.maxHp !== undefined && state.playerHp < state.maxHp) {
        changes.heal += effects.healIfDamaged;
      }
      return;
    }

    // 기본 효과
    if (effects.heal) changes.heal += effects.heal;

    // 조건부 최대체력 증가 (건강검진표)
    if (effects.maxHpIfFull && state.playerHp === state.maxHp) {
      changes.maxHp += effects.maxHpIfFull;
    }
  });

  return changes;
}

/**
 * ON_TURN_START 효과 처리
 */
export function applyTurnStartEffects(
  relicIds: string[] = [],
  state: TurnState = {}
): TurnStartChanges {
  const changes: TurnStartChanges = {
    block: 0,
    energy: 0,
    heal: 0,
  };

  relicIds.forEach(relicId => {
    const relic = getRelicById(relicId) as RelicWithEffects | null;
    if (!relic || relic.effects.type !== 'ON_TURN_START') return;

    const effects = relic.effects;

    if (effects.block) changes.block += effects.block;
    if (effects.energy) changes.energy += effects.energy;
    if (effects.heal) changes.heal += effects.heal;
  });

  // 이전 턴에서 예약된 효과 적용
  if (state.blockNextTurn) changes.block += state.blockNextTurn;
  if (state.energyNextTurn) changes.energy += state.energyNextTurn;
  if (state.healNextTurn) changes.heal += state.healNextTurn;

  return changes;
}

/**
 * ON_TURN_END 효과 처리
 */
export function applyTurnEndEffects(
  relicIds: string[] = [],
  state: TurnState = {}
): TurnEndChanges {
  const changes: TurnEndChanges = {
    strength: 0,
    energyNextTurn: 0,
    speedCostReduction: 0,
    freezeEnemyTimeline: false,
    grantDefensiveNextTurn: 0,
  };

  relicIds.forEach(relicId => {
    const relic = getRelicById(relicId) as RelicWithEffects | null;
    if (!relic || relic.effects.type !== 'ON_TURN_END') return;

    const effects = relic.effects;

    // 조건부 효과 확인
    if (effects.condition && !effects.condition(state)) return;

    if (effects.strength) changes.strength += effects.strength;
    if (effects.energyNextTurn) changes.energyNextTurn += effects.energyNextTurn;
    if (effects.speedCostReduction) changes.speedCostReduction += effects.speedCostReduction;
    // 의수/적선의금화: 적 타임라인 동결
    if (effects.freezeEnemyTimeline) changes.freezeEnemyTimeline = true;
    // 방탄복: 다음 턴 방어 부여
    if (effects.grantDefensiveNextTurn) changes.grantDefensiveNextTurn += effects.grantDefensiveNextTurn;
  });

  return changes;
}

/**
 * ON_CARD_PLAYED 효과 처리
 */
export function applyCardPlayedEffects(
  relicIds: string[] = [],
  _card?: Card,
  _state: object = {}
): CardPlayedChanges {
  const changes: CardPlayedChanges = {
    heal: 0,
  };

  relicIds.forEach(relicId => {
    const relic = getRelicById(relicId) as RelicWithEffects | null;
    if (!relic || relic.effects.type !== 'ON_CARD_PLAYED') return;

    const effects = relic.effects;

    if (effects.heal) changes.heal += effects.heal;
  });

  return changes;
}

/**
 * ON_DAMAGE_TAKEN 효과 처리
 * - ironHeart: 다음 턴 방어력/체력 +1
 * - bloodPactSeal: 즉시 힘 +2
 */
export function applyDamageTakenEffects(
  relicIds: string[] = [],
  damage: number = 0,
  _state: object = {}
): DamageTakenChanges {
  const changes: DamageTakenChanges = {
    blockNextTurn: 0,
    healNextTurn: 0,
    strength: 0,
  };

  if (damage <= 0) return changes;

  relicIds.forEach(relicId => {
    const relic = getRelicById(relicId) as RelicWithEffects | null;
    if (!relic || relic.effects.type !== 'ON_DAMAGE_TAKEN') return;

    const effects = relic.effects;

    // 철의 심장: 다음 턴 방어력/체력
    if (effects.blockNextTurn) changes.blockNextTurn += effects.blockNextTurn;
    if (effects.healNextTurn) changes.healNextTurn += effects.healNextTurn;
    // 피의 계약인: 즉시 힘 획득
    if (effects.strength) changes.strength += effects.strength;
  });

  return changes;
}

/**
 * 에테르 획득량 계산 (상징 효과 적용)
 */
export function calculateEtherGain(
  baseEther: number,
  cardsPlayed: number,
  relicIds: string[] = []
): number {
  const passiveEffects = calculatePassiveEffects(relicIds);

  let finalEther = baseEther;

  // 참고서: 카드 수에 비례해 1.x배
  if (passiveEffects.etherCardMultiplier && cardsPlayed > 0) {
    finalEther *= (1 + cardsPlayed * 0.1);
  }

  return Math.floor(finalEther);
}

/**
 * 맵 이동 시 에테르 획득 (적색의 지남철)
 */
export function applyNodeMoveEther(
  relicIds: string[] = [],
  currentEther: number = 0
): number {
  let etherGain = 0;

  relicIds.forEach(relicId => {
    const relic = getRelicById(relicId) as RelicWithEffects | null;
    if (!relic || relic.effects.type !== 'ON_NODE_MOVE') return;

    const effects = relic.effects;

    if (effects.etherPercent) {
      // 다음 슬롯 필요치의 일정 비율(기본 2%)을 지급, 최소 1pt 보장
      const nextSlotCost = getNextSlotCost(currentEther) || currentEther || 0;
      const percent = Math.min(0.02, (effects.etherPercent ?? 0) / 100);
      const gain = Math.max(1, Math.floor(nextSlotCost * percent));
      etherGain += gain;
    }
  });

  return etherGain;
}

/**
 * 상징로 인한 추가 슬롯 계산
 */
export function calculateExtraSlots(relicIds: string[] = []): ExtraSlots {
  const passiveEffects = calculatePassiveEffects(relicIds);

  return {
    mainSlots: passiveEffects.mainSpecialSlots,
    subSlots: passiveEffects.subSpecialSlots,
  };
}

// ==================== 새 이벤트 타입 효과 ====================

/** 콤보 효과 결과 */
export interface ComboEffectChanges {
  grantOffensePlus: number;
  comboMultiplierBonus: number;
}

/**
 * ON_COMBO 효과 처리 (목장갑, 총알)
 * @param relicIds - 상징 ID 배열
 * @param comboRank - 콤보 랭크 (1=하이카드, 2=페어, 3=투페어, ...)
 */
export function applyComboEffects(
  relicIds: string[] = [],
  comboRank: number = 0
): ComboEffectChanges {
  const changes: ComboEffectChanges = {
    grantOffensePlus: 0,
    comboMultiplierBonus: 0,
  };

  relicIds.forEach(relicId => {
    const relic = getRelicById(relicId) as RelicWithEffects | null;
    if (!relic || relic.effects.type !== 'ON_COMBO') return;

    const effects = relic.effects;

    // 조건 체크 (comboRank 기반)
    if (effects.condition && !effects.condition(comboRank)) return;

    // 목장갑: 공세+ 부여
    if (effects.grantOffensePlus) changes.grantOffensePlus += effects.grantOffensePlus;
    // 총알: 콤보 배율 보너스
    if (effects.comboMultiplierBonus) changes.comboMultiplierBonus += effects.comboMultiplierBonus;
  });

  return changes;
}

/** 은총 획득 효과 결과 */
export interface GraceGainEffectChanges {
  grantOffense: number;
  grantDefense: number;
}

/**
 * ON_GRACE_GAIN 효과 처리 (화환)
 */
export function applyGraceGainEffects(
  relicIds: string[] = []
): GraceGainEffectChanges {
  const changes: GraceGainEffectChanges = {
    grantOffense: 0,
    grantDefense: 0,
  };

  relicIds.forEach(relicId => {
    const relic = getRelicById(relicId) as RelicWithEffects | null;
    if (!relic || relic.effects.type !== 'ON_GRACE_GAIN') return;

    const effects = relic.effects;

    // 화환: 공격/방어 부여
    if (effects.grantOffense) changes.grantOffense += effects.grantOffense;
    if (effects.grantDefense) changes.grantDefense += effects.grantDefense;
  });

  return changes;
}

/** 토큰 획득 효과 결과 */
export interface TokenGainEffectChanges {
  heal: number;
  damage: number;
}

/**
 * ON_TOKEN_GAIN 효과 처리 (불발탄)
 * @param isPositive - 긍정 토큰인지 여부
 */
export function applyTokenGainEffects(
  relicIds: string[] = [],
  isPositive: boolean = true
): TokenGainEffectChanges {
  const changes: TokenGainEffectChanges = {
    heal: 0,
    damage: 0,
  };

  relicIds.forEach(relicId => {
    const relic = getRelicById(relicId) as RelicWithEffects | null;
    if (!relic || relic.effects.type !== 'ON_TOKEN_GAIN') return;

    const effects = relic.effects;

    // 불발탄: 긍정 토큰 → 체력 회복, 부정 토큰 → 체력 손실
    if (isPositive && effects.healOnPositive) {
      changes.heal += effects.healOnPositive;
    }
    if (!isPositive && effects.damageOnNegative) {
      changes.damage += effects.damageOnNegative;
    }
  });

  return changes;
}

/** 상징 활성화 효과 결과 */
export interface RelicActivateEffectChanges {
  etherGain: number;
}

/**
 * ON_RELIC_ACTIVATE 효과 처리 (묵주)
 */
export function applyRelicActivateEffects(
  relicIds: string[] = []
): RelicActivateEffectChanges {
  const changes: RelicActivateEffectChanges = {
    etherGain: 0,
  };

  relicIds.forEach(relicId => {
    const relic = getRelicById(relicId) as RelicWithEffects | null;
    if (!relic || relic.effects.type !== 'ON_RELIC_ACTIVATE') return;

    const effects = relic.effects;

    // 묵주: 에테르 획득
    if (effects.etherGain) changes.etherGain += effects.etherGain;
  });

  return changes;
}

/** 카드 소진 효과 결과 */
export interface CardExhaustEffectChanges {
  etherGain: number;
}

/**
 * ON_CARD_EXHAUST 효과 처리 (영혼의용광로)
 */
export function applyCardExhaustEffects(
  relicIds: string[] = []
): CardExhaustEffectChanges {
  const changes: CardExhaustEffectChanges = {
    etherGain: 0,
  };

  relicIds.forEach(relicId => {
    const relic = getRelicById(relicId) as RelicWithEffects | null;
    if (!relic || relic.effects.type !== 'ON_CARD_EXHAUST') return;

    const effects = relic.effects;

    // 영혼의용광로: 에테르 획득
    if (effects.etherGain) changes.etherGain += effects.etherGain;
  });

  return changes;
}

/** 사망 효과 결과 */
export interface DeathEffectChanges {
  revive: boolean;
  reviveHpPercent: number;
}

/**
 * ON_DEATH 효과 처리 (불사조의깃털)
 * @param usedRevives - 이번 런에서 이미 사용한 부활 횟수
 */
export function applyDeathEffects(
  relicIds: string[] = [],
  usedRevives: number = 0
): DeathEffectChanges {
  const changes: DeathEffectChanges = {
    revive: false,
    reviveHpPercent: 0,
  };

  relicIds.forEach(relicId => {
    const relic = getRelicById(relicId) as RelicWithEffects | null;
    if (!relic || relic.effects.type !== 'ON_DEATH') return;

    const effects = relic.effects;

    // 불사조의깃털: 부활 (런당 1회 제한 확인)
    if (effects.revive) {
      const usesPerRun = effects.usesPerRun ?? 1;
      if (usedRevives < usesPerRun) {
        changes.revive = true;
        changes.reviveHpPercent = effects.reviveHpPercent ?? 0.5;
      }
    }
  });

  return changes;
}

/** 데미지 보정 결과 */
export interface DamageModifierResult {
  /** 최종 데미지 배율 (1.0 = 100%) */
  damageMultiplier: number;
  /** 받는 피해 배율 (1.0 = 100%) */
  damageTakenMultiplier: number;
}

/**
 * 저HP 상태 데미지 보정 계산 (공허의심장, 불사조의재)
 * @param relicIds - 보유 상징 ID 목록
 * @param currentHp - 현재 HP
 * @param maxHp - 최대 HP
 * @returns 데미지 배율 정보
 */
export function calculateLowHpDamageModifiers(
  relicIds: string[] = [],
  currentHp: number,
  maxHp: number
): DamageModifierResult {
  const result: DamageModifierResult = {
    damageMultiplier: 1.0,
    damageTakenMultiplier: 1.0,
  };

  if (maxHp <= 0) return result;

  const hpPercent = currentHp / maxHp;

  relicIds.forEach(relicId => {
    const relic = getRelicById(relicId) as RelicWithEffects | null;
    if (!relic || relic.effects.type !== 'PASSIVE') return;

    const effects = relic.effects;

    // 공허의심장: HP가 threshold 이하일 때 피해량 증가, 받는 피해 감소
    if (effects.lowHpBonus) {
      const threshold = effects.lowHpBonus.threshold ?? 0.3;
      if (hpPercent <= threshold) {
        result.damageMultiplier += effects.lowHpBonus.damageBonus ?? 0;
        result.damageTakenMultiplier -= effects.lowHpBonus.damageReduction ?? 0;
      }
    }

    // 불사조의재: 잃은 HP 비율만큼 피해량 증가 (최대 100%)
    if (effects.lowHpDamageScaling) {
      const lostHpPercent = 1 - hpPercent;
      result.damageMultiplier += lostHpPercent;
    }
  });

  // 받는 피해 배율은 최소 0.1 (90% 감소 제한)
  result.damageTakenMultiplier = Math.max(0.1, result.damageTakenMultiplier);

  return result;
}
