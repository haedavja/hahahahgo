/**
 * @file combatUtils.js
 * @description 전투 시퀀스 유틸리티
 * @typedef {import('../../../types').Card} Card
 *
 * ## 기능
 * - 플레이어/적 카드 속도 정렬
 * - 타임라인 순서 결정
 * - 민첩 스탯 적용
 */

import { applyAgility } from '../../../lib/agilityUtils';

/**
 * 플레이어와 적의 카드를 속도 순서대로 정렬
 * @param {Array} playerCards - 플레이어 카드 배열
 * @param {Array} enemyCards - 적 카드 배열
 * @param {number} playerAgility - 플레이어 민첩 스탯
 * @param {number} enemyAgility - 적 민첩 스탯
 * @returns {Array} - 정렬된 행동 큐
 */
export function sortCombinedOrderStablePF(playerCards, enemyCards, playerAgility = 0, enemyAgility = 0) {
  const q = [];
  let ps = 0, es = 0;

  (playerCards || []).forEach((c, idx) => {
    const finalSpeed = applyAgility(c.speedCost, playerAgility);
    ps += finalSpeed;
    q.push({ actor: 'player', card: c, sp: ps, idx, originalSpeed: c.speedCost, finalSpeed });
  });

  (enemyCards || []).forEach((c, idx) => {
    const finalSpeed = applyAgility(c.speedCost, enemyAgility);
    es += finalSpeed;
    q.push({ actor: 'enemy', card: c, sp: es, idx, originalSpeed: c.speedCost, finalSpeed });
  });

  q.sort((a, b) => {
    if (a.sp !== b.sp) return a.sp - b.sp;
    if (a.actor !== b.actor) return a.actor === 'player' ? -1 : 1;
    return a.idx - b.idx;
  });

  return q;
}

/**
 * 에테르 슬롯 계산 (인플레이션 적용)
 */
export const etherSlots = (pts, calculateEtherSlots) => calculateEtherSlots(pts || 0);

/**
 * 에테르 포인트 추가
 */
export function addEther(pts, add) {
  return (pts || 0) + (add || 0);
}
