/**
 * 유물 효과 처리 유틸리티
 */

import { getRelicById } from '../data/relics';

/**
 * PASSIVE 효과를 계산하여 스탯 변화를 반환
 * @param {Array} relicIds - 유물 ID 배열
 * @returns {Object} 스탯 변화 객체
 */
export function calculatePassiveEffects(relicIds = []) {
  const stats = {
    maxEnergy: 0,
    maxHp: 0,
    strength: 0,
    agility: 0,
    subSpecialSlots: 0,
    mainSpecialSlots: 0,
    cardDrawBonus: 0,
    etherMultiplier: 1,
    etherFiveCardBonus: 0,
    etherCardMultiplier: false,
  };

  relicIds.forEach(relicId => {
    const relic = getRelicById(relicId);
    if (!relic || relic.effects.type !== 'PASSIVE') return;

    const effects = relic.effects;

    if (effects.maxEnergy) stats.maxEnergy += effects.maxEnergy;
    if (effects.maxHp) stats.maxHp += effects.maxHp;
    if (effects.strength) stats.strength += effects.strength;
    if (effects.agility) stats.agility += effects.agility;
    if (effects.subSpecialSlots) stats.subSpecialSlots += effects.subSpecialSlots;
    if (effects.mainSpecialSlots) stats.mainSpecialSlots += effects.mainSpecialSlots;
    if (effects.cardDrawBonus) stats.cardDrawBonus += effects.cardDrawBonus;
    if (effects.etherMultiplier) stats.etherMultiplier *= effects.etherMultiplier;
    if (effects.etherFiveCardBonus) stats.etherFiveCardBonus = effects.etherFiveCardBonus;
    if (effects.etherCardMultiplier) stats.etherCardMultiplier = true;
  });

  return stats;
}

/**
 * ON_COMBAT_START 효과 처리
 * @param {Array} relicIds - 유물 ID 배열
 * @param {Object} state - 현재 전투 상태
 * @returns {Object} 상태 변화
 */
export function applyCombatStartEffects(relicIds = [], state = {}) {
  const changes = {
    block: 0,
    heal: 0,
    energy: 0,
    damage: 0,
    strength: 0,
  };

  relicIds.forEach(relicId => {
    const relic = getRelicById(relicId);
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
 * @param {Array} relicIds - 유물 ID 배열
 * @param {Object} state - 현재 전투 상태
 * @returns {Object} 상태 변화
 */
export function applyCombatEndEffects(relicIds = [], state = {}) {
  const changes = {
    heal: 0,
    maxHp: 0,
  };

  relicIds.forEach(relicId => {
    const relic = getRelicById(relicId);
    if (!relic || relic.effects.type !== 'ON_COMBAT_END') return;

    const effects = relic.effects;

    // 조건부 효과 확인
    if (effects.condition && !effects.condition(state)) {
      // 건강검진표: 체력이 다쳤으면 회복
      if (effects.healIfDamaged && state.playerHp < state.maxHp) {
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
 * @param {Array} relicIds - 유물 ID 배열
 * @param {Object} state - 현재 턴 상태
 * @returns {Object} 상태 변화
 */
export function applyTurnStartEffects(relicIds = [], state = {}) {
  const changes = {
    block: 0,
    energy: 0,
    heal: 0,
  };

  relicIds.forEach(relicId => {
    const relic = getRelicById(relicId);
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
 * @param {Array} relicIds - 유물 ID 배열
 * @param {Object} state - 현재 턴 상태
 * @returns {Object} 다음 턴에 적용할 효과
 */
export function applyTurnEndEffects(relicIds = [], state = {}) {
  const changes = {
    strength: 0,
    energyNextTurn: 0,
  };

  relicIds.forEach(relicId => {
    const relic = getRelicById(relicId);
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
 * @param {Array} relicIds - 유물 ID 배열
 * @param {Object} card - 사용된 카드
 * @param {Object} state - 현재 상태
 * @returns {Object} 상태 변화
 */
export function applyCardPlayedEffects(relicIds = [], card = {}, state = {}) {
  const changes = {
    heal: 0,
  };

  relicIds.forEach(relicId => {
    const relic = getRelicById(relicId);
    if (!relic || relic.effects.type !== 'ON_CARD_PLAYED') return;

    const effects = relic.effects;

    if (effects.heal) changes.heal += effects.heal;
  });

  return changes;
}

/**
 * ON_DAMAGE_TAKEN 효과 처리
 * @param {Array} relicIds - 유물 ID 배열
 * @param {number} damage - 받은 피해량
 * @param {Object} state - 현재 상태
 * @returns {Object} 다음 턴 효과
 */
export function applyDamageTakenEffects(relicIds = [], damage = 0, state = {}) {
  const changes = {
    blockNextTurn: 0,
    healNextTurn: 0,
  };

  if (damage <= 0) return changes;

  relicIds.forEach(relicId => {
    const relic = getRelicById(relicId);
    if (!relic || relic.effects.type !== 'ON_DAMAGE_TAKEN') return;

    const effects = relic.effects;

    if (effects.blockNextTurn) changes.blockNextTurn += effects.blockNextTurn;
    if (effects.healNextTurn) changes.healNextTurn += effects.healNextTurn;
  });

  return changes;
}

/**
 * 에테르 획득량 계산 (유물 효과 적용)
 * @param {number} baseEther - 기본 에테르량
 * @param {number} cardsPlayed - 사용한 카드 수
 * @param {Array} relicIds - 유물 ID 배열
 * @returns {number} 최종 에테르량
 */
export function calculateEtherGain(baseEther, cardsPlayed, relicIds = []) {
  const passiveEffects = calculatePassiveEffects(relicIds);

  let finalEther = baseEther;

  // 희귀한 조약돌: 카드당 적용되므로 여기서는 제외
  // (stepOnce에서 이미 적용됨)

  // 참고서: 카드 수에 비례해 1.x배
  if (passiveEffects.etherCardMultiplier && cardsPlayed > 0) {
    finalEther *= (1 + cardsPlayed * 0.1);
  }

  return Math.floor(finalEther);
}

/**
 * 맵 이동 시 에테르 획득 (적색의 지남철)
 * @param {Array} relicIds - 유물 ID 배열
 * @param {number} currentEther - 현재 에테르
 * @returns {number} 증가한 에테르량
 */
export function applyNodeMoveEther(relicIds = [], currentEther = 0) {
  let etherGain = 0;

  relicIds.forEach(relicId => {
    const relic = getRelicById(relicId);
    if (!relic || relic.effects.type !== 'ON_NODE_MOVE') return;

    const effects = relic.effects;

    if (effects.etherPercent) {
      // 최소 1pt는 지급해 체감되도록 보정
      const gain = Math.max(1, Math.floor(currentEther * (effects.etherPercent / 100)));
      etherGain += gain;
    }
  });

  return etherGain;
}

/**
 * 유물로 인한 추가 슬롯 계산
 * @param {Array} relicIds - 유물 ID 배열
 * @returns {Object} {mainSlots, subSlots}
 */
export function calculateExtraSlots(relicIds = []) {
  const passiveEffects = calculatePassiveEffects(relicIds);

  return {
    mainSlots: passiveEffects.mainSpecialSlots,
    subSlots: passiveEffects.subSpecialSlots,
  };
}
