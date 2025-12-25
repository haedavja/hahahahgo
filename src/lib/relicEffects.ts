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
  ExtraSlots
} from '../types';

/** 상징 (효과 포함) */
interface RelicWithEffects {
  id: string;
  effects: RelicEffectsDefinition;
  [key: string]: unknown;
}

/** 전투 종료 상태 */
interface CombatEndState {
  playerHp?: number;
  maxHp?: number;
}

/** 턴 상태 */
interface TurnState {
  blockNextTurn?: number;
  energyNextTurn?: number;
  healNextTurn?: number;
  [key: string]: unknown;
}

/**
 * PASSIVE 효과를 계산하여 스탯 변화를 반환
 */
export function calculatePassiveEffects(relicIds: string[] = []): PassiveStats {
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
    if (effects.etherFiveCardBonus) stats.etherFiveCardBonus = effects.etherFiveCardBonus;
    if (effects.etherCardMultiplier) stats.etherCardMultiplier = true;
    if (effects.maxSubmitCards) stats.maxSubmitCards = effects.maxSubmitCards;
    if (effects.extraCardPlay) stats.extraCardPlay += effects.extraCardPlay;
  });

  return stats;
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
  };

  relicIds.forEach(relicId => {
    const relic = getRelicById(relicId) as RelicWithEffects | null;
    if (!relic || relic.effects.type !== 'ON_TURN_END') return;

    const effects = relic.effects;

    // 조건부 효과 확인
    if (effects.condition && !effects.condition(state)) return;

    if (effects.strength) changes.strength += effects.strength;
    if (effects.energyNextTurn) changes.energyNextTurn += effects.energyNextTurn;
  });

  return changes;
}

/**
 * ON_CARD_PLAYED 효과 처리
 */
export function applyCardPlayedEffects(
  relicIds: string[] = [],
  _card: Card = {},
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
 */
export function applyDamageTakenEffects(
  relicIds: string[] = [],
  damage: number = 0,
  _state: object = {}
): DamageTakenChanges {
  const changes: DamageTakenChanges = {
    blockNextTurn: 0,
    healNextTurn: 0,
  };

  if (damage <= 0) return changes;

  relicIds.forEach(relicId => {
    const relic = getRelicById(relicId) as RelicWithEffects | null;
    if (!relic || relic.effects.type !== 'ON_DAMAGE_TAKEN') return;

    const effects = relic.effects;

    if (effects.blockNextTurn) changes.blockNextTurn += effects.blockNextTurn;
    if (effects.healNextTurn) changes.healNextTurn += effects.healNextTurn;
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
