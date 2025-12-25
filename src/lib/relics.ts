/**
 * @file relics.ts
 * @description 상징 효과 계산 유틸리티
 *
 * ## 효과 타입
 * - ETHER_GAIN_BONUS: 에테르 획득량 %증가
 * - CARD_DAMAGE_BONUS: 카드 피해 증가
 * - EVENT_CHOICE_UNLOCK: 이벤트 선택지 해금
 */

import { getRelicById } from '../data/relics';

// 상징 등급
export const RELIC_RARITY = {
  COMMON: 'common',
  RARE: 'rare',
  LEGENDARY: 'legendary',
  DEV: 'dev',  // 개발자 전용
} as const;

export type RelicRarity = typeof RELIC_RARITY[keyof typeof RELIC_RARITY];

// 상징 타입 (효과 적용 범위)
export const RELIC_TYPE = {
  COMBAT: 'combat',      // 전투 관련
  EVENT: 'event',        // 이벤트 관련
  DUNGEON: 'dungeon',    // 던전 관련
  GENERAL: 'general',    // 일반적인 효과
} as const;

export type RelicType = typeof RELIC_TYPE[keyof typeof RELIC_TYPE];

// 상징 효과 타입
export const RELIC_EFFECT = {
  ETHER_GAIN_BONUS: 'etherGainBonus',
  ETHER_GAIN_FLAT: 'etherGainFlat',
  COMBO_MULTIPLIER_PER_CARD: 'comboMultiplierPerCard',
  CARD_DAMAGE_BONUS: 'cardDamageBonus',
  CARD_BLOCK_BONUS: 'cardBlockBonus',
  EVENT_CHOICE_UNLOCK: 'eventChoiceUnlock',
} as const;

export type RelicEffectType = typeof RELIC_EFFECT[keyof typeof RELIC_EFFECT];

interface Effect {
  type: string;
  value: number;
}

interface RelicEffects {
  type?: string;
  effects?: Effect[];
  comboMultiplierPerCard?: number;
  [key: string]: unknown;
}

interface Relic {
  id: string;
  effects: RelicEffects;
  [key: string]: unknown;
}

/**
 * 상징 효과 계산 함수
 */
export function applyRelicEffects(
  relics: string[],
  effectType: string,
  baseValue: number
): number {
  if (!relics || relics.length === 0) return baseValue;

  let result = baseValue;
  let bonusMultiplier = 0;
  let flatBonus = 0;

  relics.forEach(relicId => {
    const relic = getRelicById(relicId) as Relic | null;
    if (!relic) return;

    const effects = relic.effects;
    if (!effects || !effects.effects) return;

    effects.effects.forEach(effect => {
      if (effect.type === effectType) {
        if (effectType === RELIC_EFFECT.ETHER_GAIN_BONUS) {
          bonusMultiplier += effect.value;
        } else if (effectType === RELIC_EFFECT.ETHER_GAIN_FLAT) {
          flatBonus += effect.value;
        }
      }
    });
  });

  // 퍼센트 보너스 적용 후 고정값 보너스 적용
  result = Math.floor(result * (1 + bonusMultiplier)) + flatBonus;
  return result;
}

/**
 * 콤보 배율에 상징 효과 적용 (카드 개수 기반)
 */
export function applyRelicComboMultiplier(
  relics: string[],
  baseMultiplier: number,
  cardCount: number
): number {
  if (!relics || relics.length === 0) return baseMultiplier;

  let bonusMultiplier = 0;

  relics.forEach(relicId => {
    const relic = getRelicById(relicId) as Relic | null;
    if (!relic) return;

    const effects = relic.effects;
    // src/data/relics.js 형식: effects.comboMultiplierPerCard
    if (effects.type === 'PASSIVE' && effects.comboMultiplierPerCard) {
      bonusMultiplier += effects.comboMultiplierPerCard * cardCount;
    }
  });

  return baseMultiplier + bonusMultiplier;
}

// 상징 희귀도별 색상
export const RELIC_RARITY_COLORS: Record<RelicRarity, string> = {
  [RELIC_RARITY.COMMON]: '#94a3b8',     // 회색
  [RELIC_RARITY.RARE]: '#60a5fa',       // 파랑
  [RELIC_RARITY.LEGENDARY]: '#fbbf24',  // 금색
  [RELIC_RARITY.DEV]: '#ef4444',        // 빨강 (개발자용)
};
