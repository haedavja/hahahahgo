/**
 * @file handGeneration.ts
 * @description 캐릭터 빌드 기반 손패 생성 시스템 + 덱/무덤 시스템
 */

import type {
  HandCard,
  CharacterBuild,
  NextTurnEffects,
  DrawResult,
  InitializeDeckResult
} from '../../../types';
import { CARDS, DEFAULT_STARTING_DECK } from "../battleData";
import { hasTrait } from "./battleUtils";

/**
 * Fisher-Yates 셔플 알고리즘
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 보유 카드로 덱 초기화
 */
export function initializeDeck(
  characterBuild: CharacterBuild | null | undefined,
  vanishedCards: string[] = []
): InitializeDeckResult {
  if (!characterBuild) return { deck: [], mainSpecialsHand: [] };

  const { mainSpecials = [], subSpecials = [], ownedCards = [] } = characterBuild;
  const vanishedSet = new Set(vanishedCards || []);

  const mainSpecialsHand: HandCard[] = mainSpecials
    .filter(cardId => !vanishedSet.has(cardId))
    .map((cardId, idx) => {
      const card = CARDS.find((c: HandCard) => c.id === cardId);
      if (!card) return null;
      return {
        ...card,
        __handUid: `main_${card.id}_${idx}_${Math.random().toString(36).slice(2, 8)}`,
        __isMainSpecial: true
      };
    })
    .filter(Boolean) as HandCard[];

  const subSpecialCards: HandCard[] = subSpecials
    .filter(cardId => !vanishedSet.has(cardId))
    .map((cardId, idx) => {
      const card = CARDS.find((c: HandCard) => c.id === cardId);
      if (!card) return null;
      return {
        ...card,
        __handUid: `sub_${card.id}_${idx}_${Math.random().toString(36).slice(2, 8)}`,
        __isSubSpecial: true
      };
    })
    .filter(Boolean) as HandCard[];

  const usedMainCounts: Record<string, number> = {};
  mainSpecials.forEach(cardId => {
    usedMainCounts[cardId] = (usedMainCounts[cardId] || 0) + 1;
  });
  const usedSubCounts: Record<string, number> = {};
  subSpecials.forEach(cardId => {
    usedSubCounts[cardId] = (usedSubCounts[cardId] || 0) + 1;
  });

  const remainingMainCounts = { ...usedMainCounts };
  const remainingSubCounts = { ...usedSubCounts };

  const ownedCardObjs: HandCard[] = ownedCards
    .filter(cardId => {
      if (vanishedSet.has(cardId)) return false;
      if (remainingMainCounts[cardId] > 0) {
        remainingMainCounts[cardId]--;
        return false;
      }
      if (remainingSubCounts[cardId] > 0) {
        remainingSubCounts[cardId]--;
        return false;
      }
      return true;
    })
    .map((cardId, idx) => {
      const card = CARDS.find((c: HandCard) => c.id === cardId);
      if (!card) return null;
      return {
        ...card,
        __handUid: `owned_${card.id}_${idx}_${Math.random().toString(36).slice(2, 8)}`
      };
    })
    .filter(Boolean) as HandCard[];

  const shuffledOwned = shuffleArray(ownedCardObjs);
  const deck = [...subSpecialCards, ...shuffledOwned];

  return { deck, mainSpecialsHand };
}

/**
 * 덱에서 카드 드로우
 */
export function drawFromDeck(
  deck: HandCard[],
  discardPile: HandCard[],
  count: number,
  escapeBan: Set<string> = new Set()
): DrawResult {
  let currentDeck = [...deck];
  let currentDiscard = [...discardPile];
  let reshuffled = false;

  const mainSpecialsFromDiscard = currentDiscard.filter(card => card.__isMainSpecial);
  currentDiscard = currentDiscard.filter(card => !card.__isMainSpecial);

  if (currentDeck.length < count && currentDiscard.length > 0) {
    const subSpecialsFromDiscard = currentDiscard.filter(card => card.__isSubSpecial);
    const normalCardsFromDiscard = currentDiscard.filter(card => !card.__isSubSpecial);

    const shuffledNormal = shuffleArray(normalCardsFromDiscard);

    currentDeck = [...currentDeck, ...subSpecialsFromDiscard, ...shuffledNormal];
    currentDiscard = [];
    reshuffled = true;
  }

  const drawnFromDeck = currentDeck.slice(0, count).filter(card => {
    if (hasTrait(card, 'escape') && escapeBan.has(card.id)) {
      currentDiscard.push(card);
      return false;
    }
    return true;
  });

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
 */
export function getDefaultStartingHand(): HandCard[] {
  return DEFAULT_STARTING_DECK
    .map((cardId: string) => CARDS.find((card: HandCard) => card.id === cardId))
    .filter(Boolean) as HandCard[];
}

/**
 * 캐릭터 빌드를 기반으로 손패 생성 (레거시)
 */
export function drawCharacterBuildHand(
  characterBuild: CharacterBuild | null | undefined,
  nextTurnEffects: NextTurnEffects = {},
  previousHand: HandCard[] = [],
  cardDrawBonus: number = 0,
  escapeBan: Set<string> = new Set(),
  vanishedCards: string[] = []
): HandCard[] {
  if (!characterBuild) return [];

  const { mainSpecials = [], subSpecials = [], ownedCards = [] } = characterBuild;
  const vanishedSet = new Set(vanishedCards || []);

  const allCardIds = [...mainSpecials, ...subSpecials, ...ownedCards];

  return allCardIds
    .filter(cardId => !vanishedSet.has(cardId))
    .map((cardId, idx) => {
      const card = CARDS.find((c: HandCard) => c.id === cardId);
      if (!card) return null;
      return {
        ...card,
        __handUid: `${card.id}_${idx}_${Math.random().toString(36).slice(2, 8)}`
      };
    })
    .filter(Boolean) as HandCard[];
}
