/**
 * @file comboMultiplier.ts
 * @description 콤보 배율 계산 시스템
 */

import { RELICS } from "../../../data/relics";
import { applyRelicComboMultiplier } from "../../../lib/relics";
import { calculatePassiveEffects } from "../../../lib/relicEffects";

interface ExplainResult {
  multiplier: number;
  steps: string[];
}

/**
 * 상징 효과를 적용한 콤보 배율 계산
 */
export function computeComboMultiplier(
  baseMult: number,
  cardsCount: number,
  includeFiveCard: boolean = true,
  includeRefBook: boolean = true,
  relicOrderOverride: string[] | null = null,
  orderedRelicList: string[] = []
): number {
  let mult = baseMult;
  const order = relicOrderOverride || orderedRelicList;
  const passive = calculatePassiveEffects(order);

  order.forEach(rid => {
    const relic = RELICS[rid];
    if (!relic?.effects) return;
    if (relic.effects.comboMultiplierPerCard || relic.effects.etherMultiplier) {
      mult = applyRelicComboMultiplier([rid], mult, cardsCount);
    }
  });

  if (includeRefBook && passive.etherCardMultiplier && cardsCount > 0) {
    order.forEach(rid => {
      const relic = RELICS[rid];
      if (!relic?.effects?.etherCardMultiplier) return;
      mult *= (1 + cardsCount * 0.1);
    });
  }

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
 */
export function explainComboMultiplier(
  baseMult: number,
  cardsCount: number,
  includeFiveCard: boolean = true,
  includeRefBook: boolean = true,
  relicOrderOverride: string[] | null = null,
  orderedRelicList: string[] = []
): ExplainResult {
  let mult = baseMult;
  const order = relicOrderOverride || orderedRelicList;
  const steps: string[] = [`기본: ${mult.toFixed(2)}`];
  const passive = calculatePassiveEffects(order);

  order.forEach(rid => {
    const relic = RELICS[rid];
    if (!relic?.effects) return;
    if (relic.effects.comboMultiplierPerCard || relic.effects.etherMultiplier) {
      const prev = mult;
      mult = applyRelicComboMultiplier([rid], mult, cardsCount);
      steps.push(`${relic.name}: ${prev.toFixed(2)} → ${mult.toFixed(2)}`);
    }
  });

  if (includeRefBook && passive.etherCardMultiplier && cardsCount > 0) {
    order.forEach(rid => {
      const relic = RELICS[rid];
      if (!relic?.effects?.etherCardMultiplier) return;
      const prev = mult;
      mult *= (1 + cardsCount * 0.1);
      steps.push(`참고서: ${prev.toFixed(2)} → ${mult.toFixed(2)} (카드 ${cardsCount}장)`);
    });
  }

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
