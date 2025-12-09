/**
 * handGeneration.js
 *
 * 캐릭터 빌드 기반 손패 생성 시스템
 */

import { CARDS } from "../battleData";
import { hasTrait } from "./battleUtils";

/**
 * 캐릭터 빌드를 기반으로 손패 생성
 * @param {Object} characterBuild - 캐릭터 빌드 { mainSpecials, subSpecials }
 * @param {Object} nextTurnEffects - 턴 효과 { guaranteedCards, mainSpecialOnly, subSpecialBoost }
 * @param {Array} previousHand - 이전 손패 (현재 미사용)
 * @param {number} cardDrawBonus - 카드 드로우 보너스
 * @param {Set} escapeBan - 탈주 금지 카드 ID 세트
 * @returns {Array} 생성된 손패 카드 배열
 */
export function drawCharacterBuildHand(characterBuild, nextTurnEffects = {}, previousHand = [], cardDrawBonus = 0, escapeBan = new Set()) {
  if (!characterBuild) return CARDS.slice(0, 10); // 8장 → 10장

  const { mainSpecials = [], subSpecials = [] } = characterBuild;
  const { guaranteedCards = [], mainSpecialOnly = false, subSpecialBoost = 0 } = nextTurnEffects;
  const applyBonus = (prob) => Math.min(1, Math.max(0, prob + (cardDrawBonus || 0)));
  const banSet = escapeBan instanceof Set ? escapeBan : new Set();

  // 파탄 (ruin) 특성: 주특기만 등장
  if (mainSpecialOnly) {
    const mainCards = mainSpecials
      .map(cardId => CARDS.find(card => card.id === cardId))
      .filter(Boolean);
    return mainCards;
  }

  // 확정 등장 카드 (반복, 보험)
  const guaranteed = guaranteedCards
    .map(cardId => CARDS.find(card => card.id === cardId))
    .filter(card => card && !(hasTrait(card, 'escape') && banSet.has(card.id)));

  // 주특기 카드는 100% 등장 (탈주 제외)
  const mainCards = mainSpecials
    .map(cardId => CARDS.find(card => card.id === cardId))
    .filter(card => {
      if (!card) return false;
      // 조연(supporting): 보조특기 전용이므로 주특기에서는 등장하지 않음
      if (hasTrait(card, 'supporting')) return false;
      // 탈주 (escape): 이전에 사용했으면 등장하지 않음
      if (hasTrait(card, 'escape') && banSet.has(card.id)) {
        return false;
      }
      // 개근 (attendance): 등장확률 25% 증가 (주특기 125%)
      let prob = 1;
      if (hasTrait(card, 'attendance')) {
        prob = 1.25; // 확정 + 25% 추가 보너스
      }
      // 도피꾼 (deserter): 등장확률 25% 감소 (주특기 75%)
      else if (hasTrait(card, 'deserter')) {
        prob = 0.75;
      }
      return Math.random() < applyBonus(prob);
    });

  // 보조특기 카드는 각각 50% 확률로 등장 (장군 특성으로 증가 가능)
  const baseSubProb = 0.5 + subSpecialBoost;
  const subCards = subSpecials
    .map(cardId => CARDS.find(card => card.id === cardId))
    .filter(card => {
      if (!card) return false;
      // 탈주 (escape): 이전에 사용했으면 등장하지 않음
      if (hasTrait(card, 'escape') && banSet.has(card.id)) {
        return false;
      }
      // 조연 (supporting): 보조특기일때만 등장
      // (이미 보조특기로 설정되어 있으므로 등장 가능)

      let prob = baseSubProb;
      // 개근 (attendance): 등장확률 25% 증가
      if (hasTrait(card, 'attendance')) {
        prob += 0.25;
      }
      // 도피꾼 (deserter): 등장확률 25% 감소
      if (hasTrait(card, 'deserter')) {
        prob -= 0.25;
      }
      return Math.random() < applyBonus(prob);
    });

  // 중복 제거 후 반환
  const allCards = [...guaranteed, ...mainCards, ...subCards]
    .filter(card => !(hasTrait(card, 'escape') && banSet.has(card.id)));
  const uniqueCards = [];
  const seenIds = new Set();
  for (const card of allCards) {
    if (!seenIds.has(card.id)) {
      seenIds.add(card.id);
      uniqueCards.push(card);
    }
  }

  return uniqueCards;
}
