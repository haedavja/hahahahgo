/**
 * handGeneration.js
 *
 * 캐릭터 빌드 기반 손패 생성 시스템 + 덱/무덤 시스템
 */

import { CARDS, DEFAULT_STARTING_DECK } from "../battleData";
import { hasTrait } from "./battleUtils";

/**
 * Fisher-Yates 셔플 알고리즘
 * @param {Array} array - 셔플할 배열
 * @returns {Array} 셔플된 새 배열
 */
export function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 보유 카드로 덱 초기화 (셔플된 상태로)
 * @param {Object} characterBuild - 캐릭터 빌드 { mainSpecials, subSpecials, ownedCards }
 * @param {Array} vanishedCards - 소멸된 카드 ID 배열
 * @returns {Array} 셔플된 덱 카드 배열 (__handUid 포함)
 */
export function initializeDeck(characterBuild, vanishedCards = []) {
  if (!characterBuild) return [];

  const { mainSpecials = [], subSpecials = [], ownedCards = [] } = characterBuild;
  const vanishedSet = new Set(vanishedCards || []);

  // 모든 카드를 합쳐서 덱 생성 (주특기 + 보조특기 + 대기카드)
  // 중복 카드 ID도 각각 별도의 카드로 취급
  const allCardIds = [...mainSpecials, ...subSpecials, ...ownedCards];

  // 카드 객체로 변환
  const deckCards = allCardIds
    .filter(cardId => !vanishedSet.has(cardId))
    .map((cardId, idx) => {
      const card = CARDS.find(c => c.id === cardId);
      if (!card) return null;
      return {
        ...card,
        __handUid: `${card.id}_${idx}_${Math.random().toString(36).slice(2, 8)}`
      };
    })
    .filter(Boolean);

  // 셔플하여 반환
  return shuffleArray(deckCards);
}

/**
 * 덱에서 카드 드로우
 * @param {Array} deck - 현재 덱
 * @param {Array} discardPile - 현재 무덤
 * @param {number} count - 드로우할 카드 수
 * @param {Set} escapeBan - 탈주 금지 카드 ID 세트
 * @returns {Object} { drawnCards, newDeck, newDiscardPile, reshuffled }
 */
export function drawFromDeck(deck, discardPile, count, escapeBan = new Set()) {
  let currentDeck = [...deck];
  let currentDiscard = [...discardPile];
  let reshuffled = false;

  // 덱이 부족하면 무덤을 셔플하여 덱에 추가
  if (currentDeck.length < count && currentDiscard.length > 0) {
    const shuffledDiscard = shuffleArray(currentDiscard);
    currentDeck = [...currentDeck, ...shuffledDiscard];
    currentDiscard = [];
    reshuffled = true;
  }

  // 드로우
  const drawnCards = currentDeck.slice(0, count).filter(card => {
    // 탈주 카드가 금지된 경우 제외
    if (hasTrait(card, 'escape') && escapeBan.has(card.id)) {
      // 금지된 탈주 카드는 무덤으로
      currentDiscard.push(card);
      return false;
    }
    return true;
  });

  const newDeck = currentDeck.slice(count);

  return {
    drawnCards,
    newDeck,
    newDiscardPile: currentDiscard,
    reshuffled
  };
}

/**
 * 기본 시작 덱으로 손패 생성
 * @returns {Array} 기본 시작 덱 카드 배열
 */
export function getDefaultStartingHand() {
  return DEFAULT_STARTING_DECK
    .map(cardId => CARDS.find(card => card.id === cardId))
    .filter(Boolean);
}

/**
 * 캐릭터 빌드를 기반으로 손패 생성
 * @param {Object} characterBuild - 캐릭터 빌드 { mainSpecials, subSpecials }
 * @param {Object} nextTurnEffects - 턴 효과 { guaranteedCards, mainSpecialOnly, subSpecialBoost }
 * @param {Array} previousHand - 이전 손패 (현재 미사용)
 * @param {number} cardDrawBonus - 카드 드로우 보너스
 * @param {Set} escapeBan - 탈주 금지 카드 ID 세트
 * @param {Array} vanishedCards - 소멸된 카드 ID 배열
 * @returns {Array} 생성된 손패 카드 배열
 */
export function drawCharacterBuildHand(characterBuild, nextTurnEffects = {}, previousHand = [], cardDrawBonus = 0, escapeBan = new Set(), vanishedCards = []) {
  if (!characterBuild) return []; // characterBuild 없으면 빈 손패

  const { mainSpecials = [], subSpecials = [], ownedCards = [] } = characterBuild;
  const { guaranteedCards = [], mainSpecialOnly = false, subSpecialBoost = 0, devForceAllCards = false } = nextTurnEffects;
  const applyBonus = (prob) => Math.min(1, Math.max(0, prob + (cardDrawBonus || 0)));
  const banSet = escapeBan instanceof Set ? escapeBan : new Set();
  const vanishedSet = new Set(vanishedCards || []);

  // 소멸된 카드인지 확인하는 헬퍼 함수
  const isVanished = (cardId) => vanishedSet.has(cardId);

  // 개발자 모드: 모든 보유 카드 100% 등장
  if (devForceAllCards && ownedCards.length > 0) {
    const allCards = ownedCards
      .filter(cardId => !isVanished(cardId))
      .map(cardId => CARDS.find(card => card.id === cardId))
      .filter(Boolean)
      .map((card, idx) => ({
        ...card,
        __handUid: `${card.id}_${idx}_${Math.random().toString(36).slice(2, 8)}`
      }));
    return allCards;
  }

  // 파탄 (ruin) 특성: 주특기만 등장
  if (mainSpecialOnly) {
    const mainCards = mainSpecials
      .filter(cardId => !isVanished(cardId)) // 소멸된 카드 제외
      .map(cardId => CARDS.find(card => card.id === cardId))
      .filter(Boolean);
    return mainCards;
  }

  // 확정 등장 카드 (반복, 보험)
  const guaranteed = guaranteedCards
    .filter(cardId => !isVanished(cardId)) // 소멸된 카드 제외
    .map(cardId => CARDS.find(card => card.id === cardId))
    .filter(card => card && !(hasTrait(card, 'escape') && banSet.has(card.id)));

  // 주특기 카드는 100% 등장 (탈주 제외)
  const mainCards = mainSpecials
    .filter(cardId => !isVanished(cardId)) // 소멸된 카드 제외
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
    .filter(cardId => !isVanished(cardId)) // 소멸된 카드 제외
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

  // 대기 카드 (ownedCards 중 주특기/보조특기 제외) 각각 10% 확률로 등장
  const usedCardIds = new Set([...mainSpecials, ...subSpecials]);
  const otherCards = ownedCards
    .filter(cardId => !usedCardIds.has(cardId)) // 주특기/보조특기가 아닌 대기 카드만
    .filter(cardId => !isVanished(cardId)) // 소멸된 카드 제외
    .map(cardId => CARDS.find(card => card.id === cardId))
    .filter(card => {
      if (!card) return false;
      // 탈주 (escape): 이전에 사용했으면 등장하지 않음
      if (hasTrait(card, 'escape') && banSet.has(card.id)) {
        return false;
      }
      // 개근 (attendance): 등장확률 25% 증가 (10% → 35%)
      let prob = 0.1;
      if (hasTrait(card, 'attendance')) {
        prob += 0.25;
      }
      // 도피꾼 (deserter): 등장확률 25% 감소 (10% → 0%, 최소 0)
      if (hasTrait(card, 'deserter')) {
        prob -= 0.25;
      }
      return Math.random() < applyBonus(prob);
    });

  // 주특기/보조특기/확정 카드는 중복 허용, 기타 카드(10%)만 중복 제거
  const seenOtherIds = new Set();
  const filteredOtherCards = otherCards.filter(card => {
    if (seenOtherIds.has(card.id)) return false;
    seenOtherIds.add(card.id);
    return true;
  });

  // 탈주 카드 필터링 후 반환 (중복 허용)
  const allCards = [...guaranteed, ...mainCards, ...subCards, ...filteredOtherCards]
    .filter(card => !(hasTrait(card, 'escape') && banSet.has(card.id)));

  // 각 카드에 고유 ID 부여 (중복 카드 구별용)
  return allCards.map((card, idx) => ({
    ...card,
    __handUid: `${card.id}_${idx}_${Math.random().toString(36).slice(2, 8)}`
  }));
}
