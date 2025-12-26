/**
 * @file criticalEffects.ts
 * @description 치명타 관련 유틸리티 함수들
 */

import type {
  CriticalToken,
  CriticalActor,
  CriticalCard,
  CriticalBattleContext,
  TokenEntity,
  SpecialCard
} from '../../../types';
import { getAllTokens } from '../../../lib/tokenUtils';
import { hasSpecial } from './preAttackSpecials';

/**
 * 치명타 확률 계산
 */
export function calculateCritChance(
  actor: CriticalActor,
  remainingEnergy: number = 0,
  card: CriticalCard | null = null
): number {
  const baseCritChance = 5;
  const strength = actor.strength || 0;
  const energy = remainingEnergy || 0;

  let critBoostFromTokens = 0;
  if (actor.tokens) {
    const allTokens = getAllTokens(actor as unknown as TokenEntity) as CriticalToken[];
    allTokens.forEach(token => {
      if (token.effect?.type === 'CRIT_BOOST') {
        critBoostFromTokens += (token.effect.value || 5) * (token.stacks || 1);
      }
    });
  }

  let totalChance = baseCritChance + strength + energy + critBoostFromTokens;

  if (card && hasSpecial(card as unknown as SpecialCard, 'doubleCrit')) {
    totalChance *= 2;
  }

  return totalChance;
}

/**
 * 치명타 판정
 */
export function rollCritical(
  actor: CriticalActor,
  remainingEnergy: number = 0,
  card: CriticalCard | null = null,
  attackerName: 'player' | 'enemy' = 'player',
  battleContext: CriticalBattleContext = {}
): boolean {
  if (attackerName === 'enemy') {
    return false;
  }

  if (card) {
    const specials = Array.isArray(card.special) ? card.special : [card.special];
    if (specials.includes('guaranteedCrit')) {
      return true;
    }
  }

  if (battleContext.guaranteedCrit) {
    return true;
  }

  const critChance = calculateCritChance(actor, remainingEnergy, card);
  const roll = Math.random() * 100;
  return roll < critChance;
}

/**
 * 치명타 넉백 효과 처리
 */
export function getCritKnockback(card: CriticalCard | null, isCritical: boolean): number {
  if (!isCritical || !card) return 0;
  if (hasSpecial(card as unknown as SpecialCard, 'critKnockback4')) return 4;
  return 0;
}

/**
 * 치명타 적용 (데미지)
 */
export function applyCriticalDamage(damage: number, isCritical: boolean): number {
  return isCritical ? damage * 2 : damage;
}

/**
 * 치명타 적용 (상태이상 스택)
 */
export function applyCriticalStacks(stacks: number, isCritical: boolean): number {
  return isCritical ? stacks + 1 : stacks;
}
