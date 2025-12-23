import { getCardRarity, hasTrait } from './battleUtils';

// =====================
// 에테르 계산 상수
// =====================

export const COMBO_MULTIPLIERS = {
  '하이카드': 1,
  '페어': 2,
  '투페어': 2.5,
  '트리플': 3,
  '플러쉬': 3.5,
  '풀하우스': 3.75,
  '포카드': 4,
  '파이브카드': 5,
};

export const BASE_ETHER_PER_CARD = 10;

export const CARD_ETHER_BY_RARITY = {
  common: 10,
  rare: 25,
  special: 100,
  legendary: 500
};

// =====================
// 액션코스트 보너스 계산
// =====================

/**
 * 고비용 카드 보너스 계산
 * 2코스트: +0.2x, 3코스트: +0.3x, N코스트: +N*0.1x (N>=2)
 * @param {Array} cards - 카드 배열
 * @returns {number} - 액션코스트 보너스 합계
 */
export function calculateActionCostBonus(cards) {
  if (!cards || cards.length === 0) return 0;

  return cards.reduce((bonus, entry) => {
    const card = entry.card || entry;
    // 유령카드와 소외 카드는 보너스에서 제외
    if (card.isGhost || hasTrait(card, 'outcast')) return bonus;
    const actionCost = card.actionCost || 1;
    // 2코스트 이상만 보너스: N코스트 = +N*0.1x
    if (actionCost >= 2) {
      return bonus + actionCost * 0.1;
    }
    return bonus;
  }, 0);
}

// =====================
// 에테르 계산 함수
// =====================

/**
 * 에테르 Deflation: 같은 조합을 반복할수록 획득량 감소
 * 1번: 100%, 2번: 80%, 3번: 64%, ... (20% 감소)
 * @param {number} baseGain - 기본 획득량
 * @param {string} comboName - 조합 이름
 * @param {Object} comboUsageCount - 조합별 사용 횟수
 * @param {number} deflationMultiplier - 디플레이션 배율 (기본값 0.8)
 * @returns {Object} - 디플레이션 적용 결과 { gain, multiplier, usageCount }
 */
export function applyEtherDeflation(baseGain, comboName, comboUsageCount, deflationMultiplier = 0.8) {
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
export const getCardEtherGain = (card) => CARD_ETHER_BY_RARITY[getCardRarity(card)] || CARD_ETHER_BY_RARITY.common;

/**
 * 카드 배열의 총 에테르 계산
 * 유령카드(isGhost)는 에테르 획득에서 제외
 */
export const calcCardsEther = (cards = [], multiplier = 1) =>
  (cards || []).reduce((sum, entry) => {
    const cardObj = entry.card || entry;
    // 유령카드는 에테르 획득 제외
    if (cardObj.isGhost) return sum;
    return sum + Math.floor(getCardEtherGain(cardObj) * multiplier);
  }, 0);

/**
 * 조합 에테르 획득량 계산 (디플레이션 포함)
 * @param {Object} params
 * @param {Array} params.cards - 카드 배열
 * @param {number} params.cardCount - 카드 개수 (cards가 없을 때 사용)
 * @param {string} params.comboName - 조합 이름
 * @param {Object} params.comboUsageCount - 조합별 사용 횟수
 * @param {number} params.extraMultiplier - 추가 배율
 * @returns {Object} - 에테르 획득 정보
 */
export function calculateComboEtherGain({ cards = [], cardCount = 0, comboName = null, comboUsageCount = {}, extraMultiplier = 1 }) {
  const baseGain = cards.length > 0
    ? calcCardsEther(cards)
    : Math.round(cardCount * BASE_ETHER_PER_CARD);
  const baseComboMult = comboName ? (COMBO_MULTIPLIERS[comboName] || 1) : 1;
  // 고비용 카드 보너스 적용 (2코스트: +0.2x, 3코스트: +0.3x, ...)
  const actionCostBonus = calculateActionCostBonus(cards);
  const comboMult = baseComboMult + actionCostBonus;
  const multiplied = Math.round(baseGain * comboMult * extraMultiplier);
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
