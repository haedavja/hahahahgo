/**
 * tokenEffects.js
 *
 * 토큰 효과 적용 로직
 */

import { getAllTokens, removeToken } from './tokenUtils';
import { TOKENS } from '../data/tokens';

/**
 * 카드에 토큰 효과 적용
 *
 * @param {Object} card - 카드 객체
 * @param {Object} entity - player 또는 enemy 객체
 * @param {string} cardType - 카드 유형 ('attack' 또는 'defense')
 * @returns {Object} { modifiedCard: 수정된 카드, consumedTokens: 소모된 토큰 ID 배열 }
 */
export function applyTokenEffectsToCard(card, entity, cardType) {
  if (!card || !entity || !entity.tokens) {
    return { modifiedCard: card, consumedTokens: [] };
  }

  let modifiedCard = { ...card };
  const consumedTokens = [];
  const allTokens = getAllTokens(entity);

  console.log('[applyTokenEffectsToCard]', {
    cardName: card.name,
    cardType,
    allTokens,
    entityTokens: entity.tokens
  });

  // 빈탄창 체크 (총기 카드는 빈탄창 상태에서 데미지 0)
  if (cardType === 'attack' && card.cardCategory === 'gun') {
    const hasEmptyChamber = allTokens.some(t => t.effect?.type === 'EMPTY_CHAMBER');
    const hasLoaded = allTokens.some(t => t.effect?.type === 'LOADED');

    // 빈탄창이 있고 장전이 없으면 데미지 0
    if (hasEmptyChamber && !hasLoaded) {
      console.log('[EMPTY_CHAMBER] 빈탄창 상태로 총기 카드 데미지 0');
      modifiedCard.damage = 0;
      return { modifiedCard, consumedTokens: [] };
    }

    // 철갑탄: 방어력 무시 (_ignoreBlock 플래그 사용 - shouldIgnoreBlock과 호환)
    const armorPiercingToken = allTokens.find(
      t => t.effect?.type === 'ARMOR_PIERCING' && t.durationType === 'usage'
    );
    if (armorPiercingToken) {
      modifiedCard._ignoreBlock = true;
      consumedTokens.push({ id: 'armor_piercing', type: 'usage' });
    }

    // 소이탄: 화상 부여 (_applyBurn 플래그)
    const incendiaryToken = allTokens.find(
      t => t.effect?.type === 'INCENDIARY' && t.durationType === 'usage'
    );
    if (incendiaryToken) {
      modifiedCard._applyBurn = true;
      consumedTokens.push({ id: 'incendiary', type: 'usage' });
    }
  }

  // 공격력 증가 토큰
  if (cardType === 'attack' && modifiedCard.damage > 0) {
    let damageBoost = 0;

    // 턴소모 토큰 (모든 공격 카드에 적용)
    allTokens.forEach(token => {
      console.log('[ATTACK_BOOST check]', {
        tokenName: token.name,
        durationType: token.durationType,
        effectType: token.effect?.type,
        match: token.durationType === 'turn' && token.effect?.type === 'ATTACK_BOOST'
      });
      if (token.durationType === 'turn' && token.effect.type === 'ATTACK_BOOST') {
        damageBoost += token.effect.value * (token.stacks || 1);
      }
    });

    // 사용소모 토큰 (1회만 적용)
    const usageBoostToken = allTokens.find(
      t => t.durationType === 'usage' && t.effect.type === 'ATTACK_BOOST'
    );
    if (usageBoostToken) {
      damageBoost += usageBoostToken.effect.value;
      consumedTokens.push({ id: usageBoostToken.id, type: 'usage' });
    }

    if (damageBoost > 0) {
      const oldDamage = modifiedCard.damage;
      modifiedCard.damage = Math.round(modifiedCard.damage * (1 + damageBoost));
      console.log('[DAMAGE BOOST]', { oldDamage, damageBoost, newDamage: modifiedCard.damage });
    }
  }

  // 공격력 감소 토큰 (무딤)
  if (cardType === 'attack' && modifiedCard.damage > 0) {
    let damagePenalty = 0;

    allTokens.forEach(token => {
      if (token.durationType === 'turn' && token.effect.type === 'ATTACK_PENALTY') {
        damagePenalty += token.effect.value * (token.stacks || 1);
      }
    });

    if (damagePenalty > 0) {
      modifiedCard.damage = Math.max(0, Math.round(modifiedCard.damage * (1 - damagePenalty)));
    }
  }

  // 방어력 증가 토큰
  if (cardType === 'defense' && modifiedCard.block > 0) {
    let blockBoost = 0;

    // 턴소모 토큰
    allTokens.forEach(token => {
      if (token.durationType === 'turn' && token.effect.type === 'DEFENSE_BOOST') {
        blockBoost += token.effect.value * (token.stacks || 1);
      }
    });

    // 사용소모 토큰
    const usageBoostToken = allTokens.find(
      t => t.durationType === 'usage' && t.effect.type === 'DEFENSE_BOOST'
    );
    if (usageBoostToken) {
      blockBoost += usageBoostToken.effect.value;
      consumedTokens.push({ id: usageBoostToken.id, type: 'usage' });
    }

    if (blockBoost > 0) {
      modifiedCard.block = Math.round(modifiedCard.block * (1 + blockBoost));
    }
  }

  // 방어력 감소 토큰 (흔들림, 무방비)
  if (cardType === 'defense' && modifiedCard.block > 0) {
    let blockPenalty = 0;

    // 턴소모 토큰
    allTokens.forEach(token => {
      if (token.durationType === 'turn' && token.effect.type === 'DEFENSE_PENALTY') {
        blockPenalty += token.effect.value * (token.stacks || 1);
      }
    });

    // 사용소모 토큰
    const usagePenaltyToken = allTokens.find(
      t => t.durationType === 'usage' && t.effect.type === 'DEFENSE_PENALTY'
    );
    if (usagePenaltyToken) {
      blockPenalty += usagePenaltyToken.effect.value;
      consumedTokens.push({ id: usagePenaltyToken.id, type: 'usage' });
    }

    if (blockPenalty > 0) {
      modifiedCard.block = Math.max(0, Math.round(modifiedCard.block * (1 - blockPenalty)));
    }
  }

  return { modifiedCard, consumedTokens };
}

/**
 * 피해를 받을 때 토큰 효과 적용
 *
 * @param {number} damage - 기본 피해량
 * @param {Object} defender - 피해를 받는 엔티티
 * @param {Object} attacker - 공격하는 엔티티
 * @returns {Object} { finalDamage, dodged, reflected, consumedTokens, logs }
 */
export function applyTokenEffectsOnDamage(damage, defender, attacker) {
  if (!defender || !defender.tokens) {
    return { finalDamage: damage, dodged: false, reflected: 0, consumedTokens: [], logs: [] };
  }

  let finalDamage = damage;
  const consumedTokens = [];
  const logs = [];
  const allTokens = getAllTokens(defender);

  // 1. 회피 체크
  const dodgeToken = allTokens.find(t => t.effect.type === 'DODGE');
  if (dodgeToken) {
    const dodgeChance = dodgeToken.effect.value;
    if (Math.random() < dodgeChance) {
      logs.push(`${dodgeToken.name} 발동! 공격 회피!`);
      if (dodgeToken.durationType === 'usage') {
        consumedTokens.push({ id: dodgeToken.id, type: 'usage' });
      }
      return { finalDamage: 0, dodged: true, reflected: 0, consumedTokens, logs };
    } else {
      logs.push(`${dodgeToken.name} 발동 실패 (${Math.round(dodgeChance * 100)}% 확률)`);
      if (dodgeToken.durationType === 'usage') {
        consumedTokens.push({ id: dodgeToken.id, type: 'usage' });
      }
    }
  }

  // 2. 피해 증가 (허약, 아픔)
  let damageMultiplier = 1;

  allTokens.forEach(token => {
    if (token.effect.type === 'DAMAGE_TAKEN') {
      if (token.durationType === 'turn') {
        damageMultiplier += token.effect.value * (token.stacks || 1);
        logs.push(`${token.name} 적용: 피해 +${Math.round(token.effect.value * 100)}%`);
      } else if (token.durationType === 'usage') {
        damageMultiplier += token.effect.value;
        consumedTokens.push({ id: token.id, type: 'usage' });
        logs.push(`${token.name} 소모: 피해 +${Math.round(token.effect.value * 100)}%`);
      }
    }
  });

  finalDamage = Math.round(finalDamage * damageMultiplier);

  // 3. 반격
  let reflected = 0;
  const counterToken = allTokens.find(t => t.effect.type === 'COUNTER');
  if (counterToken && attacker) {
    const strength = defender.strength || 0;
    reflected = counterToken.effect.value + strength;
    consumedTokens.push({ id: counterToken.id, type: 'usage' });
    logs.push(`${counterToken.name} 발동! ${reflected} 반격 피해!`);
  }

  return { finalDamage, dodged: false, reflected, consumedTokens, logs };
}

/**
 * 체력 회복 시 토큰 효과 적용 (흡수)
 *
 * @param {number} damageDealt - 가한 피해량
 * @param {Object} entity - 회복할 엔티티
 * @returns {Object} { healing, consumedTokens, logs }
 */
export function applyTokenEffectsOnHeal(damageDealt, entity) {
  if (!entity || !entity.tokens) {
    return { healing: 0, consumedTokens: [], logs: [] };
  }

  const allTokens = getAllTokens(entity);
  const consumedTokens = [];
  const logs = [];

  const absorbToken = allTokens.find(t => t.effect.type === 'LIFESTEAL');
  if (absorbToken) {
    const healing = Math.round(damageDealt * absorbToken.effect.value);
    consumedTokens.push({ id: absorbToken.id, type: 'usage' });
    logs.push(`${absorbToken.name} 발동! ${healing} 체력 회복!`);
    return { healing, consumedTokens, logs };
  }

  return { healing: 0, consumedTokens, logs };
}

/**
 * 최대 에너지에 토큰 효과 적용
 *
 * @param {number} baseEnergy - 기본 에너지
 * @param {Object} entity - 엔티티
 * @returns {number} 수정된 에너지
 */
export function applyTokenEffectsOnEnergy(baseEnergy, entity) {
  if (!entity || !entity.tokens) {
    return baseEnergy;
  }

  const allTokens = getAllTokens(entity);
  let energyModifier = 0;

  allTokens.forEach(token => {
    if (token.effect.type === 'ENERGY_BOOST') {
      energyModifier += token.effect.value * token.stacks;
    } else if (token.effect.type === 'ENERGY_PENALTY') {
      energyModifier -= token.effect.value * token.stacks;
    }
  });

  return Math.max(0, baseEnergy + energyModifier);
}

/**
 * 힘 토큰의 총합 계산
 *
 * @param {Object} entity - 엔티티
 * @returns {number} 힘 보너스
 */
export function getTotalStrength(entity) {
  if (!entity || !entity.tokens) {
    return entity.strength || 0;
  }

  const allTokens = getAllTokens(entity);
  let strengthBonus = entity.strength || 0;

  allTokens.forEach(token => {
    if (token.effect.type === 'STRENGTH') {
      strengthBonus += token.effect.value * token.stacks;
    }
  });

  return strengthBonus;
}

/**
 * 민첩 토큰의 총합 계산
 *
 * @param {Object} entity - 엔티티
 * @returns {number} 민첩 보너스
 */
export function getTotalAgility(entity) {
  if (!entity || !entity.tokens) {
    return entity.agility || 0;
  }

  const allTokens = getAllTokens(entity);
  let agilityBonus = entity.agility || 0;

  allTokens.forEach(token => {
    if (token.effect.type === 'AGILITY') {
      agilityBonus += token.effect.value * token.stacks;
    }
  });

  return agilityBonus;
}

/**
 * 사망 시 부활 토큰 체크
 *
 * @param {Object} entity - 엔티티
 * @returns {Object} { revived, newHp, consumedTokens, logs }
 */
export function checkReviveToken(entity) {
  if (!entity || !entity.tokens) {
    return { revived: false, newHp: 0, consumedTokens: [], logs: [] };
  }

  const allTokens = getAllTokens(entity);
  const reviveToken = allTokens.find(t => t.effect.type === 'REVIVE');

  if (reviveToken) {
    const maxHp = entity.maxHp || 100;
    const newHp = Math.round(maxHp * reviveToken.effect.value);
    return {
      revived: true,
      newHp,
      consumedTokens: [{ id: reviveToken.id, type: 'usage' }],
      logs: [`${reviveToken.name} 발동! ${newHp} 체력으로 부활!`]
    };
  }

  return { revived: false, newHp: 0, consumedTokens: [], logs: [] };
}

/**
 * 사용소모 토큰 일괄 소모
 *
 * @param {Object} entity - 엔티티
 * @param {Array} consumedTokens - 소모할 토큰 배열 [{ id, type }]
 * @returns {Object} { tokens, logs }
 */
export function consumeTokens(entity, consumedTokens) {
  let currentEntity = { ...entity };
  const logs = [];

  consumedTokens.forEach(({ id, type }) => {
    const result = removeToken(currentEntity, id, type, 1);
    currentEntity.tokens = result.tokens;
    logs.push(...result.logs);
  });

  return { tokens: currentEntity.tokens, logs };
}
