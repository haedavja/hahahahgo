/**
 * @file etherCalculations.ts
 * @description 에테르 계산 시스템
 *
 * ## 에테르 시스템 개요
 * 에테르는 전투에서 카드를 사용하여 축적하는 자원.
 * 에테르가 임계치(100)에 도달하면 버스트로 추가 피해를 줌.
 *
 * ## 에테르 획득 공식
 * 최종 획득량 = (카드별 기본값 합계) × (조합 배율 + 액션코스트 보너스) × 디플레이션
 *
 * ## 주요 시스템
 * 1. 카드 희귀도별 기본값: common(10), rare(25), special(100), legendary(500)
 * 2. 조합 배율: 하이카드(1x) ~ 파이브카드(5x)
 * 3. 액션코스트 보너스: 2코스트 이상 카드에 추가 배율 (고비용 카드 보상)
 * 4. 디플레이션: 같은 조합 반복 시 80%씩 감소 (다양한 플레이 유도)
 */

import type {
  EtherCard,
  EtherCardEntry,
  ComboUsageCount,
  DeflationResult,
  ComboEtherGainResult,
  CalculateComboEtherGainParams
} from '../../../types';
import { getCardRarity, hasTrait } from './battleUtils';

/** 조합별 에테르 배율 */
export const COMBO_MULTIPLIERS: Record<string, number> = {
  '하이카드': 1,
  '페어': 2,
  '투페어': 2.5,
  '트리플': 3,
  '플러쉬': 3.5,
  '풀하우스': 3.75,
  '포카드': 4,
  '파이브카드': 5,
};

/** 카드 개수 기반 계산 시 기본값 */
export const BASE_ETHER_PER_CARD = 10;

/** 희귀도별 에테르 획득량 */
export const CARD_ETHER_BY_RARITY: Record<string, number> = {
  common: 10,
  rare: 25,
  special: 100,
  legendary: 500
};

/**
 * 고비용 카드 보너스 계산
 * 2코스트: +0.5x, 3코스트: +1x, N코스트: +(N-1)*0.5x (N>=2)
 */
export function calculateActionCostBonus(cards: (EtherCard | EtherCardEntry)[]): number {
  if (!cards || cards.length === 0) return 0;

  return cards.reduce((bonus, entry) => {
    const card = (entry as EtherCardEntry).card || entry as EtherCard;
    // 유령카드와 소외 카드는 보너스에서 제외
    if (card.isGhost || hasTrait(card, 'outcast')) return bonus;
    const actionCost = card.actionCost || 1;
    // 2코스트 이상만 보너스: N코스트 = +(N-1)*0.5x
    if (actionCost >= 2) {
      return bonus + (actionCost - 1) * 0.5;
    }
    return bonus;
  }, 0);
}

/**
 * 에테르 Deflation: 같은 조합을 반복할수록 획득량 감소
 * 1번: 100%, 2번: 80%, 3번: 64%, ... (20% 감소)
 */
export function applyEtherDeflation(
  baseGain: number,
  comboName: string,
  comboUsageCount: ComboUsageCount,
  deflationMultiplier: number = 0.8
): DeflationResult {
  const usageCount = comboUsageCount[comboName] || 0;
  const multiplier = Math.pow(deflationMultiplier, usageCount);
  return {
    gain: Math.round(baseGain * multiplier),
    multiplier: multiplier,
    usageCount: usageCount
  };
}

/**
 * 카드의 에테르 획득량 반환
 */
export const getCardEtherGain = (card: EtherCard): number =>
  CARD_ETHER_BY_RARITY[getCardRarity(card)] || CARD_ETHER_BY_RARITY.common;

/**
 * 카드 배열의 총 에테르 계산
 * 유령카드(isGhost)는 에테르 획득에서 제외
 */
export const calcCardsEther = (cards: (EtherCard | EtherCardEntry)[] = [], multiplier: number = 1): number =>
  (cards || []).reduce((sum, entry) => {
    const cardObj = (entry as EtherCardEntry).card || entry as EtherCard;
    // 유령카드는 에테르 획득 제외
    if (cardObj.isGhost) return sum;
    return sum + Math.floor(getCardEtherGain(cardObj) * multiplier);
  }, 0);

/**
 * 조합 에테르 획득량 계산 (디플레이션 포함)
 *
 * 계산 흐름:
 * 1. 기본값 = 카드별 희귀도 기반 에테르 합산
 * 2. 조합배율 = COMBO_MULTIPLIERS[조합] + 액션코스트 보너스
 * 3. 배율 적용 = 기본값 × 조합배율 × 추가배율
 * 4. 디플레이션 = 사용횟수에 따라 0.8^n 적용
 */
export function calculateComboEtherGain({
  cards = [],
  cardCount = 0,
  comboName = null,
  comboUsageCount = {},
  extraMultiplier = 1
}: CalculateComboEtherGainParams): ComboEtherGainResult {
  // 1단계: 기본 에테르 계산 (카드 희귀도 기반)
  const baseGain = cards.length > 0
    ? calcCardsEther(cards)
    : Math.round(cardCount * BASE_ETHER_PER_CARD);

  // 2단계: 조합 배율 + 액션코스트 보너스
  const baseComboMult = comboName ? (COMBO_MULTIPLIERS[comboName] || 1) : 1;
  const actionCostBonus = calculateActionCostBonus(cards);
  const comboMult = baseComboMult + actionCostBonus;

  // 3단계: 배율 적용
  const multiplied = Math.round(baseGain * comboMult * extraMultiplier);

  // 4단계: 디플레이션 적용 (같은 조합 반복 페널티)
  const deflated = comboName
    ? applyEtherDeflation(multiplied, comboName, comboUsageCount)
    : { gain: multiplied, multiplier: 1 };

  const deflationPct = deflated.multiplier < 1 ? Math.round((1 - deflated.multiplier) * 100) : 0;

  return {
    gain: deflated.gain,
    baseGain,
    comboMult: comboMult * extraMultiplier,
    actionCostBonus,
    deflationPct,
    deflationMult: deflated.multiplier,
  };
}
