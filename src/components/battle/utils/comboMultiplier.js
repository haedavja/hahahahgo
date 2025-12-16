/**
 * comboMultiplier.js
 *
 * 콤보 배율 계산 시스템 (상징 효과 통합)
 */

import { RELICS } from "../../../data/relics";
import { applyRelicComboMultiplier } from "../../../lib/relics";
import { calculatePassiveEffects } from "../../../lib/relicEffects";

/**
 * 상징 효과를 적용한 콤보 배율 계산
 * @param {number} baseMult - 기본 배율
 * @param {number} cardsCount - 카드 개수
 * @param {boolean} includeFiveCard - 5장 보너스 포함 여부
 * @param {boolean} includeRefBook - 참고서 효과 포함 여부
 * @param {Array|null} relicOrderOverride - 상징 순서 오버라이드 (null이면 orderedRelicList 사용)
 * @param {Array} orderedRelicList - 현재 상징 순서
 * @returns {number} 최종 배율
 */
export function computeComboMultiplier(
  baseMult,
  cardsCount,
  includeFiveCard = true,
  includeRefBook = true,
  relicOrderOverride = null,
  orderedRelicList = []
) {
  let mult = baseMult;
  const order = relicOrderOverride || orderedRelicList;
  const passive = calculatePassiveEffects(order);

  // 1) 카드당 적용되는 배율(에테르 결정 등) 우선, 위치 순서대로
  order.forEach(rid => {
    const relic = RELICS[rid];
    if (!relic?.effects) return;
    if (relic.effects.comboMultiplierPerCard || relic.effects.etherMultiplier) {
      mult = applyRelicComboMultiplier([rid], mult, cardsCount);
    }
  });

  // 2) 참고서: 조건 충족 시 위치 순서로 단 한 번
  if (includeRefBook && passive.etherCardMultiplier && cardsCount > 0) {
    order.forEach(rid => {
      const relic = RELICS[rid];
      if (!relic?.effects?.etherCardMultiplier) return;
      mult *= (1 + cardsCount * 0.1);
    });
  }

  // 3) 악마의 주사위: 조건 충족 시 위치 순서로 곱 (항상 마지막 우선)
  if (includeFiveCard && passive.etherFiveCardBonus > 0 && cardsCount >= 5) {
    order.forEach(rid => {
      const relic = RELICS[rid];
      if (!relic?.effects?.etherFiveCardBonus) return;
      mult *= passive.etherFiveCardBonus;
    });
  }

  return mult;
}

/**
 * 배율 계산 과정을 설명용으로 반환
 * @param {number} baseMult - 기본 배율
 * @param {number} cardsCount - 카드 개수
 * @param {boolean} includeFiveCard - 5장 보너스 포함 여부
 * @param {boolean} includeRefBook - 참고서 효과 포함 여부
 * @param {Array|null} relicOrderOverride - 상징 순서 오버라이드
 * @param {Array} orderedRelicList - 현재 상징 순서
 * @returns {Object} { multiplier: number, steps: string[] }
 */
export function explainComboMultiplier(
  baseMult,
  cardsCount,
  includeFiveCard = true,
  includeRefBook = true,
  relicOrderOverride = null,
  orderedRelicList = []
) {
  let mult = baseMult;
  const order = relicOrderOverride || orderedRelicList;
  const steps = [`기본: ${mult.toFixed(2)}`];
  const passive = calculatePassiveEffects(order);

  // 1) 카드당 배율 우선
  order.forEach(rid => {
    const relic = RELICS[rid];
    if (!relic?.effects) return;
    if (relic.effects.comboMultiplierPerCard || relic.effects.etherMultiplier) {
      const prev = mult;
      mult = applyRelicComboMultiplier([rid], mult, cardsCount);
      steps.push(`${relic.name}: ${prev.toFixed(2)} → ${mult.toFixed(2)}`);
    }
  });

  // 2) 참고서
  if (includeRefBook && passive.etherCardMultiplier && cardsCount > 0) {
    order.forEach(rid => {
      const relic = RELICS[rid];
      if (!relic?.effects?.etherCardMultiplier) return;
      const prev = mult;
      mult *= (1 + cardsCount * 0.1);
      steps.push(`참고서: ${prev.toFixed(2)} → ${mult.toFixed(2)} (카드 ${cardsCount}장)`);
    });
  }

  // 3) 악마의 주사위
  if (includeFiveCard && passive.etherFiveCardBonus > 0 && cardsCount >= 5) {
    order.forEach(rid => {
      const relic = RELICS[rid];
      if (!relic?.effects?.etherFiveCardBonus) return;
      const prev = mult;
      mult *= passive.etherFiveCardBonus;
      steps.push(`악마의 주사위: ${prev.toFixed(2)} → ${mult.toFixed(2)}`);
    });
  }

  return { multiplier: mult, steps };
}
