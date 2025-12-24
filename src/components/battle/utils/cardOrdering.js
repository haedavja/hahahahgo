/**
 * @file cardOrdering.js
 * @description 카드 순서 및 타임라인 유틸리티
 * @typedef {import('../../../types').Card} Card
 *
 * ## 기능
 * - fixedOrder 생성 (수동 순서)
 * - 타임라인 재계산
 * - 민첩 적용 속도 계산
 */

import { applyAgility } from "../../../lib/agilityUtils";

/**
 * 플레이어와 적 카드를 결합하여 수동 순서로 fixedOrder 생성
 * @param {Array} enhancedPlayerCards - 강화된 플레이어 카드 배열
 * @param {Array} enemyActions - 적의 행동 배열
 * @param {number} effectiveAgility - 플레이어의 유효 민첩성
 * @returns {Array} sp 값이 계산된 fixedOrder 배열
 */
export function createFixedOrder(enhancedPlayerCards, enemyActions, effectiveAgility) {
  // 플레이어 카드 매핑
  const playerCards = enhancedPlayerCards.map((card, idx) => ({
    actor: 'player',
    card,
    originalIndex: idx
  }));

  // 적 카드 매핑
  const enemyCards = (enemyActions || []).map((action, idx) => ({
    actor: 'enemy',
    card: action,
    originalIndex: idx
  }));

  // 플레이어 카드를 먼저, 그 다음 적 카드 (수동 순서)
  const manualOrder = [...playerCards, ...enemyCards];

  // sp 값 재계산 (누적)
  let ps = 0;
  let es = 0;
  const withSp = manualOrder.map(item => {
    const isPlayer = item.actor === 'player';
    const agility = isPlayer ? effectiveAgility : 0;
    const finalSpeed = applyAgility(item.card.speedCost, agility);

    if (isPlayer) {
      ps += finalSpeed;
      return { ...item, sp: ps, finalSpeed };
    } else {
      es += finalSpeed;
      return { ...item, sp: es, finalSpeed };
    }
  });

  return withSp;
}
