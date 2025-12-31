/**
 * @file criticalEffects.ts
 * @description 치명타 관련 유틸리티 함수들
 */

import type {
  Card,
  Combatant,
  BattleContext,
  CriticalToken,
  BattleEvent
} from '../../../types';
import { getAllTokens, addToken } from '../../../lib/tokenUtils';
import { hasSpecial } from './preAttackSpecials';
import { getGunCritEffects, isGunCard } from '../../../lib/ethosEffects';

/**
 * 치명타 확률 계산
 */
export function calculateCritChance(
  actor: Combatant,
  remainingEnergy: number = 0,
  card: Card | null = null
): number {
  const baseCritChance = 5;
  const strength = actor.strength || 0;
  const energy = remainingEnergy || 0;

  let critBoostFromTokens = 0;
  if (actor.tokens) {
    const allTokens = getAllTokens(actor) as CriticalToken[];
    allTokens.forEach(token => {
      if (token.effect?.type === 'CRIT_BOOST') {
        critBoostFromTokens += (token.effect.value || 5) * (token.stacks || 1);
      }
    });
  }

  let totalChance = baseCritChance + strength + energy + critBoostFromTokens;

  if (card && hasSpecial(card, 'doubleCrit')) {
    totalChance *= 2;
  }

  return totalChance;
}

/**
 * 치명타 판정
 */
export function rollCritical(
  actor: Combatant,
  remainingEnergy: number = 0,
  card: Card | null = null,
  attackerName: 'player' | 'enemy' = 'player',
  battleContext: BattleContext = {}
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
export function getCritKnockback(card: Card | null, isCritical: boolean): number {
  if (!isCritical || !card) return 0;
  if (hasSpecial(card, 'critKnockback4')) return 4;
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

/**
 * 총격 치명타 시 에토스 효과 적용 (불꽃 에토스 - 화상 토큰)
 * @param card 사용된 카드
 * @param isCritical 치명타 여부
 * @param defender 방어자 (토큰을 받을 대상)
 * @param battleContext 전투 컨텍스트
 * @returns 업데이트된 방어자와 이벤트/로그
 */
export function applyGunCritEthosEffects(
  card: Card,
  isCritical: boolean,
  defender: Combatant,
  battleContext: BattleContext = {}
): { defender: Combatant; events: BattleEvent[]; logs: string[] } {
  const events: BattleEvent[] = [];
  const logs: string[] = [];
  let updatedDefender = { ...defender };

  // 총격 카드 + 치명타인 경우에만
  if (!isCritical || !isGunCard(card)) {
    return { defender: updatedDefender, events, logs };
  }

  // 불꽃 에토스 효과 확인
  const critEffects = getGunCritEffects();
  if (critEffects.burnStacks > 0) {
    const tokenResult = addToken(updatedDefender, 'burn', critEffects.burnStacks);
    updatedDefender = { ...updatedDefender, tokens: tokenResult.tokens };

    const enemyName = battleContext.enemyDisplayName || '몬스터';
    const msg = `🔥 불꽃: ${enemyName}에게 화상 +${critEffects.burnStacks}`;
    events.push({
      actor: 'player',
      type: 'ethos' as const,
      msg
    } as BattleEvent);
    logs.push(msg);
  }

  return { defender: updatedDefender, events, logs };
}
