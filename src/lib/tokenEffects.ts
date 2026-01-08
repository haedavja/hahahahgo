/**
 * @file tokenEffects.ts
 * @description 토큰 효과 적용 로직
 *
 * ## 효과 적용 시점
 * - applyTokenEffectsToCard: 카드 사용 전 (공격력/방어력 수정)
 * - applyTokenEffectsOnDamage: 피해 계산 시
 * - consumeTokens: 효과 적용 후 토큰 소모
 *
 * ## 코어 연동
 * 공격/방어/피해 수정자 계산은 공통 코어 함수 사용
 * (src/core/combat/token-core.ts)
 */

import {
  getAllTokens,
  removeToken,
  calculateAttackModifiers,
  calculateDefenseModifiers,
  calculateDamageTakenModifiers
} from './tokenUtils';
import type {
  TokenEntity,
  TokenState,
  Card,
  CardEffectResult,
  ConsumedToken,
  DamageEffectResult,
  HealEffectResult,
  ReviveResult,
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
  const allTokens = getAllTokens(entity);

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

  // 공격력 수정자 계산 (코어 함수 사용)
  if (cardType === 'attack' && modifiedCard.damage && modifiedCard.damage > 0) {
    const attackMods = calculateAttackModifiers(entity);

    // 코어 함수로 계산된 배율 및 보너스 적용
    // attackMultiplier: 양수/음수 배율 통합 (예: 공세 1.5배, 무딤 0.5배)
    // damageBonus: 힘, 날세우기 등 고정 보너스
    const baseDamage = modifiedCard.damage + attackMods.damageBonus;
    modifiedCard.damage = Math.max(0, Math.floor(baseDamage * attackMods.attackMultiplier));

    // 코어에서 계산한 ignoreBlock 플래그 적용
    if (attackMods.ignoreBlock) {
      modifiedCard._ignoreBlock = true;
    }

    // 사용소모 토큰 소모 처리 (attack, attackPlus 등)
    const usageBoostToken = allTokens.find(
      t => t.durationType === 'usage' && t.effect.type === 'ATTACK_BOOST'
    );
    if (usageBoostToken) {
      consumedTokens.push({ id: usageBoostToken.id, type: 'usage' });
    }

    const usagePenaltyToken = allTokens.find(
      t => t.durationType === 'usage' && t.effect.type === 'ATTACK_PENALTY'
    );
    if (usagePenaltyToken) {
      consumedTokens.push({ id: usagePenaltyToken.id, type: 'usage' });
    }
  }

  // 방어력 수정자 계산 (코어 함수 사용)
  const defenseValue = modifiedCard.defense || modifiedCard.block || 0;
  if (cardType === 'defense' && defenseValue > 0) {
    const defenseMods = calculateDefenseModifiers(entity);

    // 코어 함수로 계산된 배율 및 보너스 적용
    // defenseMultiplier: 양수/음수 배율 통합 (예: 수세 1.5배, 흔들림 0.5배)
    // defenseBonus: 힘 등 고정 보너스
    const baseDefense = defenseValue + defenseMods.defenseBonus;
    const finalDefense = Math.max(0, Math.floor(baseDefense * defenseMods.defenseMultiplier));

    if (modifiedCard.defense) {
      modifiedCard.defense = finalDefense;
    }
    if (modifiedCard.block) {
      modifiedCard.block = finalDefense;
    }

    // 사용소모 토큰 소모 처리 (defense, defensePlus 등)
    const usageBoostToken = allTokens.find(
      t => t.durationType === 'usage' && t.effect.type === 'DEFENSE_BOOST'
    );
    if (usageBoostToken) {
      consumedTokens.push({ id: usageBoostToken.id, type: 'usage' });
    }

    const usagePenaltyToken = allTokens.find(
      t => t.durationType === 'usage' && t.effect.type === 'DEFENSE_PENALTY'
    );
    if (usagePenaltyToken) {
      consumedTokens.push({ id: usagePenaltyToken.id, type: 'usage' });
    }
  }

  return { modifiedCard, consumedTokens };
}

/**
 * 피해를 받을 때 토큰 효과 적용
 * @param options.ignoreEvasion - 회피 무시 확률 (0-100, 파토스 효과)
 */
export function applyTokenEffectsOnDamage(
  damage: number,
  defender: TokenEntity,
  attacker: TokenEntity | null,
  options: { ignoreEvasion?: number } = {}
): DamageEffectResult {
  if (!defender || !defender.tokens) {
    return { finalDamage: damage, dodged: false, reflected: 0, consumedTokens: [], logs: [] };
  }

  let finalDamage = damage;
  const consumedTokens: ConsumedToken[] = [];
  const logs: string[] = [];
  const allTokens = getAllTokens(defender);

  // 1. 회피 체크
  const dodgeToken = allTokens.find(t => t.effect.type === 'DODGE');
  if (dodgeToken) {
    // 파토스 효과: 회피 무시
    const ignoreEvasionChance = options.ignoreEvasion || 0;
    if (ignoreEvasionChance >= 100 || (ignoreEvasionChance > 0 && Math.random() * 100 < ignoreEvasionChance)) {
      logs.push(`🎯 회피 무시! (${ignoreEvasionChance}% 확률)`);
      if (dodgeToken.durationType === 'usage') {
        consumedTokens.push({ id: dodgeToken.id, type: 'usage' });
      }
    } else {
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
  }

  // 2. 피해 배율 계산 (코어 함수 사용)
  const damageTakenMods = calculateDamageTakenModifiers(defender);

  // 코어 함수로 계산된 배율 적용 (허약, 아픔 등)
  finalDamage = Math.round(finalDamage * damageTakenMods.damageMultiplier);

  // 피해 감소 적용 (있는 경우)
  if (damageTakenMods.damageReduction > 0) {
    finalDamage = Math.max(0, finalDamage - damageTakenMods.damageReduction);
  }

  // 배율 로그 (1배 초과일 때만)
  if (damageTakenMods.damageMultiplier > 1) {
    logs.push(`취약 적용: 피해 ${Math.round(damageTakenMods.damageMultiplier * 100)}%`);
  }

  // 사용소모 토큰 소모 처리
  allTokens.forEach(token => {
    if (token.effect.type === 'DAMAGE_TAKEN' && token.durationType === 'usage') {
      consumedTokens.push({ id: token.id, type: 'usage' });
    }
  });

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

  const allTokens = getAllTokens(entity);
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
 */
export function getTotalStrength(entity: TokenEntity): number {
  if (!entity) {
    return 0;
  }
  if (!entity.tokens) {
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
 */
export function getTotalAgility(entity: TokenEntity): number {
  if (!entity) {
    return 0;
  }
  if (!entity.tokens) {
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
 */
export function checkReviveToken(entity: TokenEntity): ReviveResult {
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
