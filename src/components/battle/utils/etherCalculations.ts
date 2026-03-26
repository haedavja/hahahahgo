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
  Card,
  EtherCard,
  EtherCardEntry,
  ComboUsageCount,
  DeflationResult,
  ComboEtherGainResult,
  CalculateComboEtherGainParams
} from '../../../types';
import type { BattleCard } from '../../../state/slices/types';
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

/** 특성 시너지 보너스 정의 */
export const TRAIT_SYNERGY_BONUSES: Record<string, { threshold: number; bonus: number; name: string }> = {
  // 기본 시너지 (2개 이상)
  swift: { threshold: 2, bonus: 0.3, name: '신속 시너지' },
  chain: { threshold: 2, bonus: 0.5, name: '연계 시너지' },
  strongbone: { threshold: 2, bonus: 0.4, name: '강골 시너지' },
  repeat: { threshold: 2, bonus: 0.4, name: '반복 시너지' },
  mastery: { threshold: 2, bonus: 0.6, name: '숙련 시너지' },
  // 전투 특성 시너지
  striking: { threshold: 2, bonus: 0.3, name: '타격 시너지' },
  counterattack: { threshold: 2, bonus: 0.4, name: '반격 시너지' },
  piercing: { threshold: 2, bonus: 0.35, name: '관통 시너지' },
  calm: { threshold: 2, bonus: 0.2, name: '침착 시너지' },
  // 협동 특성 (50% 추가 획득)
  cooperation: { threshold: 2, bonus: 0.5, name: '협동 시너지' },
  // 성장 특성
  training: { threshold: 2, bonus: 0.3, name: '단련 시너지' },
  growth: { threshold: 2, bonus: 0.4, name: '성장 시너지' },
  // 방어 특성
  parry: { threshold: 2, bonus: 0.35, name: '패링 시너지' },
  block: { threshold: 2, bonus: 0.25, name: '방어 시너지' },
  // 기타 특성
  quick: { threshold: 2, bonus: 0.25, name: '속공 시너지' },
  heavy: { threshold: 2, bonus: 0.45, name: '중량 시너지' },
};

/**
 * 고비용 카드 보너스 계산
 *
 * 2코스트 이상의 카드에 추가 에테르 배율을 부여합니다.
 * 고비용 카드 사용을 보상하여 전략적 선택을 유도합니다.
 *
 * @param cards - 에테르 계산 대상 카드 배열
 * @returns 총 액션코스트 보너스 배율
 *
 * @example
 * // 2코스트 카드 1장: +0.5x
 * calculateActionCostBonus([{ actionCost: 2 }]) // 0.5
 *
 * // 3코스트 카드 1장: +1.0x
 * calculateActionCostBonus([{ actionCost: 3 }]) // 1.0
 *
 * @formula N코스트 = +(N-1)*0.5x (N>=2)
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
 * 특성 시너지 보너스 계산
 *
 * 같은 특성을 가진 카드가 2개 이상 제출되면 추가 에테르 배율을 부여합니다.
 * 덱 구성의 시너지를 보상하여 전략적 덱빌딩을 유도합니다.
 *
 * @param cards - 에테르 계산 대상 카드 배열
 * @returns { bonus: 총 시너지 보너스, synergies: 활성화된 시너지 이름 배열 }
 */
export function calculateTraitSynergyBonus(cards: (EtherCard | EtherCardEntry)[]): { bonus: number; synergies: string[] } {
  const traitCount = new Map<string, number>();
  const synergies: string[] = [];
  let totalBonus = 0;

  // 특성 집계
  for (const entry of cards) {
    const card = (entry as EtherCardEntry).card || entry as EtherCard;
    // 유령카드와 소외 카드는 제외
    if (card.isGhost || hasTrait(card, 'outcast')) continue;
    if (card.traits) {
      for (const trait of card.traits) {
        traitCount.set(trait, (traitCount.get(trait) || 0) + 1);
      }
    }
  }

  // 시너지 보너스 계산
  for (const [trait, count] of traitCount) {
    const synergy = TRAIT_SYNERGY_BONUSES[trait];
    if (synergy && count >= synergy.threshold) {
      totalBonus += synergy.bonus;
      synergies.push(synergy.name);
    }
  }

  return { bonus: totalBonus, synergies };
}

/**
 * 에테르 디플레이션 적용
 *
 * 같은 포커 조합을 반복 사용할수록 에테르 획득량이 감소합니다.
 * 다양한 조합 사용을 유도하여 전략적 깊이를 더합니다.
 *
 * @param baseGain - 기본 에테르 획득량
 * @param comboName - 포커 조합 이름 (예: '페어', '플러쉬')
 * @param comboUsageCount - 조합별 사용 횟수 기록
 * @param deflationMultiplier - 감소 배율 (기본값: 0.8 = 20% 감소)
 * @returns 디플레이션 적용 결과 { gain, multiplier, usageCount }
 *
 * @example
 * // 첫 번째 페어: 100% 획득
 * applyEtherDeflation(100, '페어', {}) // { gain: 100, multiplier: 1, usageCount: 0 }
 *
 * // 두 번째 페어: 80% 획득
 * applyEtherDeflation(100, '페어', { '페어': 1 }) // { gain: 80, multiplier: 0.8, usageCount: 1 }
 *
 * // 세 번째 페어: 64% 획득
 * applyEtherDeflation(100, '페어', { '페어': 2 }) // { gain: 64, multiplier: 0.64, usageCount: 2 }
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
export const getCardEtherGain = (card: EtherCard | Card): number =>
  CARD_ETHER_BY_RARITY[getCardRarity(card as BattleCard)] || CARD_ETHER_BY_RARITY.common;

/**
 * 카드 배열의 총 에테르 계산
 * 유령카드(isGhost)는 에테르 획득에서 제외
 */
export const calcCardsEther = (cards: Array<EtherCard | EtherCardEntry | Card> = [], multiplier: number = 1): number =>
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
    ? calcCardsEther(cards as Array<EtherCard | EtherCardEntry>)
    : Math.round(cardCount * BASE_ETHER_PER_CARD);

  // 2단계: 조합 배율 + 액션코스트 보너스 + 특성 시너지
  const baseComboMult = comboName ? (COMBO_MULTIPLIERS[comboName] || 1) : 1;
  const actionCostBonus = calculateActionCostBonus(cards as Array<EtherCard | EtherCardEntry>);
  const traitSynergy = calculateTraitSynergyBonus(cards as Array<EtherCard | EtherCardEntry>);
  const comboMult = baseComboMult + actionCostBonus + traitSynergy.bonus;

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
    traitSynergyBonus: traitSynergy.bonus,
    traitSynergies: traitSynergy.synergies,
    deflationPct,
    deflationMult: deflated.multiplier,
  };
}
