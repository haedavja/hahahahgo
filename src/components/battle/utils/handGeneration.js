/**
 * handGeneration.js
 *
 * 캐릭터 빌드 기반 손패 생성 시스템 + 덱/무덤 시스템
 *
 * 주특기: 덱에 포함되지 않음, 손패↔무덤만 순환
 * 보조특기: 항상 덱의 맨 위에 배치
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
 * 보유 카드로 덱 초기화
 * - 주특기: 덱에 포함 안 됨 (손패로 직접 시작)
 * - 보조특기: 덱 맨 위에 배치
 * - 대기카드: 셔플하여 덱 하단에 배치
 * @param {Object} characterBuild - 캐릭터 빌드 { mainSpecials, subSpecials, ownedCards }
 * @param {Array} vanishedCards - 소멸된 카드 ID 배열
 * @returns {Object} { deck, mainSpecialsHand }
 */
export function initializeDeck(characterBuild, vanishedCards = []) {
  if (!characterBuild) return { deck: [], mainSpecialsHand: [] };

  const { mainSpecials = [], subSpecials = [], ownedCards = [] } = characterBuild;
  const vanishedSet = new Set(vanishedCards || []);

  // 주특기 카드 (손패로 직접 시작)
  const mainSpecialsHand = mainSpecials
    .filter(cardId => !vanishedSet.has(cardId))
    .map((cardId, idx) => {
      const card = CARDS.find(c => c.id === cardId);
      if (!card) return null;
      return {
        ...card,
        __handUid: `main_${card.id}_${idx}_${Math.random().toString(36).slice(2, 8)}`,
        __isMainSpecial: true // 주특기 표시
      };
    })
    .filter(Boolean);

  // 보조특기 카드 (덱 맨 위)
  const subSpecialCards = subSpecials
    .filter(cardId => !vanishedSet.has(cardId))
    .map((cardId, idx) => {
      const card = CARDS.find(c => c.id === cardId);
      if (!card) return null;
      return {
        ...card,
        __handUid: `sub_${card.id}_${idx}_${Math.random().toString(36).slice(2, 8)}`,
        __isSubSpecial: true // 보조특기 표시
      };
    })
    .filter(Boolean);

  // 주특기/보조특기에 사용된 카드 수 계산 (같은 카드 여러 장 사용 가능)
  const usedMainCounts = {};
  mainSpecials.forEach(cardId => {
    usedMainCounts[cardId] = (usedMainCounts[cardId] || 0) + 1;
  });
  const usedSubCounts = {};
  subSpecials.forEach(cardId => {
    usedSubCounts[cardId] = (usedSubCounts[cardId] || 0) + 1;
  });

  // 대기 카드 (셔플하여 덱 하단) - 주특기/보조특기로 사용된 수만큼 제외
  const remainingMainCounts = { ...usedMainCounts };
  const remainingSubCounts = { ...usedSubCounts };

  const ownedCardObjs = ownedCards
    .filter(cardId => {
      if (vanishedSet.has(cardId)) return false;

      // 주특기로 사용된 카드인지 확인
      if (remainingMainCounts[cardId] > 0) {
        remainingMainCounts[cardId]--;
        return false; // 이 카드는 주특기로 사용됨
      }
      // 보조특기로 사용된 카드인지 확인
      if (remainingSubCounts[cardId] > 0) {
        remainingSubCounts[cardId]--;
        return false; // 이 카드는 보조특기로 사용됨
      }
      return true;
    })
    .map((cardId, idx) => {
      const card = CARDS.find(c => c.id === cardId);
      if (!card) return null;
      return {
        ...card,
        __handUid: `owned_${card.id}_${idx}_${Math.random().toString(36).slice(2, 8)}`
      };
    })
    .filter(Boolean);

  // 대기 카드 셔플
  const shuffledOwned = shuffleArray(ownedCardObjs);

  // 덱 구성: 보조특기(맨 위) + 셔플된 대기카드
  const deck = [...subSpecialCards, ...shuffledOwned];

  return { deck, mainSpecialsHand };
}

/**
 * 덱에서 카드 드로우
 * - 주특기는 덱/무덤 순환에서 제외, 무덤에서 바로 손패로
 * - 보조특기는 무덤에서 셔플 시 덱 맨 위로
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

  // 무덤에서 주특기 카드 분리 (항상 손패로 직접)
  const mainSpecialsFromDiscard = currentDiscard.filter(card => card.__isMainSpecial);
  currentDiscard = currentDiscard.filter(card => !card.__isMainSpecial);

  // 덱이 부족하면 무덤을 셔플하여 덱에 추가
  if (currentDeck.length < count && currentDiscard.length > 0) {
    // 무덤에서 보조특기 분리
    const subSpecialsFromDiscard = currentDiscard.filter(card => card.__isSubSpecial);
    const normalCardsFromDiscard = currentDiscard.filter(card => !card.__isSubSpecial);

    // 일반 카드만 셔플
    const shuffledNormal = shuffleArray(normalCardsFromDiscard);

    // 덱 재구성: 기존 덱 + 보조특기(위) + 셔플된 일반 카드
    currentDeck = [...currentDeck, ...subSpecialsFromDiscard, ...shuffledNormal];
    currentDiscard = [];
    reshuffled = true;
  }

  // 드로우
  const drawnFromDeck = currentDeck.slice(0, count).filter(card => {
    // 탈주 카드가 금지된 경우 제외
    if (hasTrait(card, 'escape') && escapeBan.has(card.id)) {
      currentDiscard.push(card);
      return false;
    }
    return true;
  });

  // 주특기는 무덤에서 직접 손패로 추가
  const drawnCards = [...mainSpecialsFromDiscard, ...drawnFromDeck];

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
 * 캐릭터 빌드를 기반으로 손패 생성 (레거시 - 덱 시스템 미사용 시)
 */
export function drawCharacterBuildHand(characterBuild, nextTurnEffects = {}, previousHand = [], cardDrawBonus = 0, escapeBan = new Set(), vanishedCards = []) {
  if (!characterBuild) return [];

  const { mainSpecials = [], subSpecials = [], ownedCards = [] } = characterBuild;
  const vanishedSet = new Set(vanishedCards || []);

  // 모든 카드 합쳐서 반환
  const allCardIds = [...mainSpecials, ...subSpecials, ...ownedCards];

  return allCardIds
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
}
