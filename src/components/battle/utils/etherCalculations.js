import { getCardRarity } from './battleUtils';

// =====================
// 에테르 계산 상수
// =====================

export const COMBO_MULTIPLIERS = {
  '하이카드': 1,
  '페어': 2,
  '투페어': 2.5,
  '트리플': 3,
  '플러쉬': 3.25,
  '풀하우스': 3.5,
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
// 에테르 계산 함수
// =====================

/**
 * 에테르 Deflation: 같은 조합을 반복할수록 획득량 감소
 * 1번: 100%, 2번: 50%, 3번: 25%, ... 0에 수렴
 * @param {number} baseGain - 기본 획득량
 * @param {string} comboName - 조합 이름
 * @param {Object} comboUsageCount - 조합별 사용 횟수
 * @param {number} deflationMultiplier - 디플레이션 배율 (기본값 0.5)
 * @returns {Object} - 디플레이션 적용 결과 { gain, multiplier, usageCount }
 */
export function applyEtherDeflation(baseGain, comboName, comboUsageCount, deflationMultiplier = 0.5) {
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
 */
export const calcCardsEther = (cards = [], multiplier = 1) =>
  (cards || []).reduce((sum, entry) => {
    const cardObj = entry.card || entry;
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
  const comboMult = comboName ? (COMBO_MULTIPLIERS[comboName] || 1) : 1;
  const multiplied = Math.round(baseGain * comboMult * extraMultiplier);
  const deflated = comboName
    ? applyEtherDeflation(multiplied, comboName, comboUsageCount)
    : { gain: multiplied, multiplier: 1 };
  const deflationPct = deflated.multiplier < 1 ? Math.round((1 - deflated.multiplier) * 100) : 0;
  return {
    gain: deflated.gain,
    baseGain,
    comboMult: comboMult * extraMultiplier,
    deflationPct,
    deflationMult: deflated.multiplier,
  };
}
