/**
 * @file criticalEffects.js
 * @description 치명타 관련 유틸리티 함수들
 * @typedef {import('../../../types').Card} Card
 *
 * ## 치명타 확률 공식
 * 기본 5% + (힘 × 2%) + (남은 행동력 × 1%) + 토큰 보너스
 *
 * ## 치명타 피해 공식
 * 기본 피해 × 1.5 (doubleCrit 시 2.0)
 */

import { getAllTokens } from '../../../lib/tokenUtils';
import { hasSpecial } from './preAttackSpecials'; // 순환 의존성 방지: cardSpecialEffects 대신 직접 import

/**
 * 치명타 확률 계산
 * @param {Object} actor - 행동 주체 (player 또는 enemy)
 * @param {number} remainingEnergy - 남은 행동력
 * @param {Object} card - 카드 객체 (optional, doubleCrit 체크용)
 * @returns {number} 치명타 확률 (0~100)
 */
export function calculateCritChance(actor, remainingEnergy = 0, card = null) {
  const baseCritChance = 5; // 기본 5%
  const strength = actor.strength || 0;
  const energy = remainingEnergy || 0;

  // crit_boost 토큰 효과 (매의 눈 등)
  let critBoostFromTokens = 0;
  if (actor.tokens) {
    const allTokens = getAllTokens(actor);
    allTokens.forEach(token => {
      if (token.effect?.type === 'CRIT_BOOST') {
        critBoostFromTokens += (token.effect.value || 5) * (token.stacks || 1);
      }
    });
  }

  let totalChance = baseCritChance + strength + energy + critBoostFromTokens;

  // doubleCrit special: 치명타 확률 2배
  if (card && hasSpecial(card, 'doubleCrit')) {
    totalChance *= 2;
  }

  return totalChance;
}

/**
 * 치명타 판정
 * @param {Object} actor - 행동 주체
 * @param {number} remainingEnergy - 남은 행동력
 * @param {Object} card - 사용 카드 (optional, guaranteedCrit/doubleCrit 체크용)
 * @param {string} attackerName - 'player' 또는 'enemy' (optional)
 * @param {Object} battleContext - 전투 컨텍스트 (optional, 교차 확정 치명타 등)
 * @returns {boolean} 치명타 발생 여부
 */
export function rollCritical(actor, remainingEnergy = 0, card = null, attackerName = 'player', battleContext = {}) {
  // 적은 기본적으로 치명타 확률 0
  if (attackerName === 'enemy') {
    return false;
  }

  // 확정 치명타 체크 (카드 special)
  if (card) {
    const specials = Array.isArray(card.special) ? card.special : [card.special];
    if (specials.includes('guaranteedCrit')) {
      return true;
    }
  }

  // 확정 치명타 체크 (교차 효과 등 battleContext)
  if (battleContext.guaranteedCrit) {
    return true;
  }

  const critChance = calculateCritChance(actor, remainingEnergy, card);
  const roll = Math.random() * 100;
  return roll < critChance;
}

/**
 * 치명타 넉백 효과 처리
 * @param {Object} card - 카드 객체
 * @param {boolean} isCritical - 치명타 여부
 * @returns {number} 넉백 값 (0이면 넉백 없음)
 */
export function getCritKnockback(card, isCritical) {
  if (!isCritical || !card) return 0;
  if (hasSpecial(card, 'critKnockback4')) return 4;
  return 0;
}

/**
 * 치명타 적용 (데미지)
 * @param {number} damage - 원본 데미지
 * @param {boolean} isCritical - 치명타 여부
 * @returns {number} 최종 데미지
 */
export function applyCriticalDamage(damage, isCritical) {
  return isCritical ? damage * 2 : damage;
}

/**
 * 치명타 적용 (상태이상 스택)
 * @param {number} stacks - 원본 스택 수
 * @param {boolean} isCritical - 치명타 여부
 * @returns {number} 최종 스택 수
 */
export function applyCriticalStacks(stacks, isCritical) {
  return isCritical ? stacks + 1 : stacks;
}
