/**
 * @file handGeneration.ts
 * @description 캐릭터 빌드 기반 손패 생성 시스템 + 덱/무덤 시스템
 */

import { CARDS, DEFAULT_STARTING_DECK } from "../battleData";
import { hasTrait } from "./battleUtils";

interface Card {
  id?: string;
  name?: string;
  type?: string;
  block?: number;
  speedCost?: number;
  actionCost?: number;
  __handUid?: string;
  __isMainSpecial?: boolean;
  __isSubSpecial?: boolean;
  traits?: string[];
  [key: string]: unknown;
}

interface CharacterBuild {
  mainSpecials?: string[];
  subSpecials?: string[];
  ownedCards?: string[];
}

interface NextTurnEffects {
  [key: string]: unknown;
}

interface DrawResult {
  drawnCards: Card[];
  newDeck: Card[];
  newDiscardPile: Card[];
  reshuffled: boolean;
}

interface InitializeDeckResult {
  deck: Card[];
  mainSpecialsHand: Card[];
}

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

  const mainSpecialsHand: Card[] = mainSpecials
    .filter(cardId => !vanishedSet.has(cardId))
    .map((cardId, idx) => {
      const card = CARDS.find((c: Card) => c.id === cardId);
      if (!card) return null;
      return {
        ...card,
        __handUid: `main_${card.id}_${idx}_${Math.random().toString(36).slice(2, 8)}`,
        __isMainSpecial: true
      };
    })
    .filter(Boolean) as Card[];

  const subSpecialCards: Card[] = subSpecials
    .filter(cardId => !vanishedSet.has(cardId))
    .map((cardId, idx) => {
      const card = CARDS.find((c: Card) => c.id === cardId);
      if (!card) return null;
      return {
        ...card,
        __handUid: `sub_${card.id}_${idx}_${Math.random().toString(36).slice(2, 8)}`,
        __isSubSpecial: true
      };
    })
    .filter(Boolean) as Card[];

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

  const ownedCardObjs: Card[] = ownedCards
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
      const card = CARDS.find((c: Card) => c.id === cardId);
      if (!card) return null;
      return {
        ...card,
        __handUid: `owned_${card.id}_${idx}_${Math.random().toString(36).slice(2, 8)}`
      };
    })
    .filter(Boolean) as Card[];

  const shuffledOwned = shuffleArray(ownedCardObjs);
  const deck = [...subSpecialCards, ...shuffledOwned];

  return { deck, mainSpecialsHand };
}

/**
 * 덱에서 카드 드로우
 */
export function drawFromDeck(
  deck: Card[],
  discardPile: Card[],
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
export function getDefaultStartingHand(): Card[] {
  return DEFAULT_STARTING_DECK
    .map((cardId: string) => CARDS.find((card: Card) => card.id === cardId))
    .filter(Boolean) as Card[];
}

/**
 * 캐릭터 빌드를 기반으로 손패 생성 (레거시)
 */
export function drawCharacterBuildHand(
  characterBuild: CharacterBuild | null | undefined,
  nextTurnEffects: NextTurnEffects = {},
  previousHand: Card[] = [],
  cardDrawBonus: number = 0,
  escapeBan: Set<string> = new Set(),
  vanishedCards: string[] = []
): Card[] {
  if (!characterBuild) return [];

  const { mainSpecials = [], subSpecials = [], ownedCards = [] } = characterBuild;
  const vanishedSet = new Set(vanishedCards || []);

  const allCardIds = [...mainSpecials, ...subSpecials, ...ownedCards];

  return allCardIds
    .filter(cardId => !vanishedSet.has(cardId))
    .map((cardId, idx) => {
      const card = CARDS.find((c: Card) => c.id === cardId);
      if (!card) return null;
      return {
        ...card,
        __handUid: `${card.id}_${idx}_${Math.random().toString(36).slice(2, 8)}`
      };
    })
    .filter(Boolean) as Card[];
}
