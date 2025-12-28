/**
 * @file tokenEffects.ts
 * @description 토큰 효과 적용 로직
 *
 * ## 효과 적용 시점
 * - applyTokenEffectsToCard: 카드 사용 전 (공격력/방어력 수정)
 * - applyTokenEffectsOnDamage: 피해 계산 시
 * - consumeTokens: 효과 적용 후 토큰 소모
 */

import { getAllTokens, removeToken } from './tokenUtils';
import type {
  TokenEntity,
  TokenState,
  Card,
  CardEffectResult,
  ConsumedToken,
  DamageEffectResult,
  HealEffectResult,
  ReviveResult,
  TokenEffectPayload,
  TokenInstanceWithEffect,
  ModifiableCard,
  TokenConsumeResult as ConsumeResult
} from '../types';

/**
 * 카드에 토큰 효과 적용
 */
export function applyTokenEffectsToCard(
  card: Card,
  entity: TokenEntity,
  cardType: string
): CardEffectResult {
  if (!card || !entity || !entity.tokens) {
    return { modifiedCard: card, consumedTokens: [] };
  }

  let modifiedCard: ModifiableCard = { ...card };
  const consumedTokens: ConsumedToken[] = [];
  const allTokens = getAllTokens(entity) as unknown as TokenInstanceWithEffect[];

  // 빈탄창 체크 (총기 카드는 빈탄창 상태에서 데미지 0)
  if (cardType === 'attack' && card.cardCategory === 'gun') {
    const hasEmptyChamber = allTokens.some(t => t.effect?.type === 'EMPTY_CHAMBER');
    const hasLoaded = allTokens.some(t => t.effect?.type === 'LOADED');

    // 빈탄창이 있고 장전이 없으면 데미지 0
    if (hasEmptyChamber && !hasLoaded) {
      modifiedCard.damage = 0;
      return { modifiedCard, consumedTokens: [] };
    }

    // 철갑탄: 방어력 무시 (_ignoreBlock 플래그 사용)
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

    // 파쇄탄: 피해 +6
    const fragmentationToken = allTokens.find(
      t => t.effect?.type === 'FRAGMENTATION' && t.durationType === 'usage'
    );
    if (fragmentationToken) {
      modifiedCard.damage = (modifiedCard.damage || 0) + (fragmentationToken.effect?.value || 6);
      consumedTokens.push({ id: 'fragmentation', type: 'usage' });
    }
  }

  // 공격력 증가 토큰
  if (cardType === 'attack' && modifiedCard.damage && modifiedCard.damage > 0) {
    let damageBoost = 0;

    // 턴소모 토큰 (모든 공격 카드에 적용)
    allTokens.forEach(token => {
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
      modifiedCard.damage = Math.round(modifiedCard.damage * (1 + damageBoost));
    }
  }

  // 공격력 감소 토큰 (무딤)
  if (cardType === 'attack' && modifiedCard.damage && modifiedCard.damage > 0) {
    let damagePenalty = 0;

    // 턴소모 토큰 (dullness 등)
    allTokens.forEach(token => {
      if (token.durationType === 'turn' && token.effect.type === 'ATTACK_PENALTY') {
        damagePenalty += token.effect.value * (token.stacks || 1);
      }
    });

    // 사용소모 토큰 (dull 등)
    const usagePenaltyToken = allTokens.find(
      t => t.durationType === 'usage' && t.effect.type === 'ATTACK_PENALTY'
    );
    if (usagePenaltyToken) {
      damagePenalty += usagePenaltyToken.effect.value;
      consumedTokens.push({ id: usagePenaltyToken.id, type: 'usage' });
    }

    if (damagePenalty > 0) {
      modifiedCard.damage = Math.max(0, Math.round(modifiedCard.damage * (1 - damagePenalty)));
    }
  }

  // 방어력 증가 토큰
  const defenseValue = modifiedCard.defense || modifiedCard.block || 0;
  if (cardType === 'defense' && defenseValue > 0) {
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
      const boostedValue = Math.round(defenseValue * (1 + blockBoost));
      if (modifiedCard.defense) {
        modifiedCard.defense = boostedValue;
      }
      if (modifiedCard.block) {
        modifiedCard.block = boostedValue;
      }
    }
  }

  // 방어력 감소 토큰 (흔들림, 무방비)
  const defenseValue2 = modifiedCard.defense || modifiedCard.block || 0;
  if (cardType === 'defense' && defenseValue2 > 0) {
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
      const penalizedValue = Math.max(0, Math.round(defenseValue2 * (1 - blockPenalty)));
      if (modifiedCard.defense) {
        modifiedCard.defense = penalizedValue;
      }
      if (modifiedCard.block) {
        modifiedCard.block = penalizedValue;
      }
    }
  }

  return { modifiedCard, consumedTokens };
}

/**
 * 피해를 받을 때 토큰 효과 적용
 */
export function applyTokenEffectsOnDamage(
  damage: number,
  defender: TokenEntity,
  attacker: TokenEntity | null
): DamageEffectResult {
  if (!defender || !defender.tokens) {
    return { finalDamage: damage, dodged: false, reflected: 0, consumedTokens: [], logs: [] };
  }

  let finalDamage = damage;
  const consumedTokens: ConsumedToken[] = [];
  const logs: string[] = [];
  const allTokens = getAllTokens(defender) as unknown as TokenInstanceWithEffect[];

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
 */
export function applyTokenEffectsOnHeal(
  damageDealt: number,
  entity: TokenEntity
): HealEffectResult {
  if (!entity || !entity.tokens) {
    return { healing: 0, consumedTokens: [], logs: [] };
  }

  const allTokens = getAllTokens(entity) as unknown as TokenInstanceWithEffect[];
  const consumedTokens: ConsumedToken[] = [];
  const logs: string[] = [];

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
 */
export function applyTokenEffectsOnEnergy(baseEnergy: number, entity: TokenEntity): number {
  if (!entity || !entity.tokens) {
    return baseEnergy;
  }

  const allTokens = getAllTokens(entity) as unknown as TokenInstanceWithEffect[];
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
 */
export function getTotalStrength(entity: TokenEntity): number {
  if (!entity) {
    return 0;
  }
  if (!entity.tokens) {
    return entity.strength || 0;
  }

  const allTokens = getAllTokens(entity) as unknown as TokenInstanceWithEffect[];
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
 */
export function getTotalAgility(entity: TokenEntity): number {
  if (!entity) {
    return 0;
  }
  if (!entity.tokens) {
    return entity.agility || 0;
  }

  const allTokens = getAllTokens(entity) as unknown as TokenInstanceWithEffect[];
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
 */
export function checkReviveToken(entity: TokenEntity): ReviveResult {
  if (!entity || !entity.tokens) {
    return { revived: false, newHp: 0, consumedTokens: [], logs: [] };
  }

  const allTokens = getAllTokens(entity) as unknown as TokenInstanceWithEffect[];
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
 */
export function consumeTokens(entity: TokenEntity, consumedTokens: ConsumedToken[]): ConsumeResult {
  let currentEntity: TokenEntity = { ...entity };
  const logs: string[] = [];

  consumedTokens.forEach(({ id, type }) => {
    const result = removeToken(currentEntity, id, type, 1);
    currentEntity.tokens = result.tokens;
    logs.push(...result.logs);
  });

  return { tokens: currentEntity.tokens as TokenState, logs };
}
