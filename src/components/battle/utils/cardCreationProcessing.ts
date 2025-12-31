/**
 * @file cardCreationProcessing.ts
 * @description 카드 창조 선택 처리 (브리치, 벙 데 라므, 총살 등)
 */

import { shuffle } from '../../../lib/randomUtils';
import { CARDS } from '../battleData';
import type { Card } from '../../../types/core';

// battleData의 CARDS 타입 캐스팅
const typedCards = CARDS as Card[];

export interface CreationQueueItem {
  cards: Card[];
  insertSp: number;
  breachCard: Card;
  isAoe: boolean;
  totalSelections: number;
  currentSelection: number;
}

export interface BreachSelection {
  cards: Card[];
  breachSp: number;
  breachCard: Card;
  sourceCardName?: string;
  isLastChain?: boolean;
  isCreationSelection?: boolean;
  isAoe?: boolean;
}

interface GenerateBreachCardsResult {
  breachCards: Card[];
  breachState: BreachSelection;
}

/**
 * 브리치 효과: 랜덤 카드 3장 생성
 * 공격/범용/특수 카드 중 랜덤 3장 선택 (중복 ID 방지, 기교 소모 카드 제외)
 */
export function generateBreachCards(
  cardSp: number,
  card: Card
): GenerateBreachCardsResult {
  // attack, general, support 타입 카드만 필터링 (CardType에 'special' 없음)
  const cardPool = typedCards.filter((c: Card) =>
    (c.type === 'attack' || c.type === 'general' || c.type === 'support') &&
    c.id !== 'breach' &&
    (!c.requiredTokens || c.requiredTokens.length === 0)
  );

  const shuffled = shuffle(cardPool);
  const breachCards: Card[] = [];
  const usedIds = new Set<string>();

  for (const poolCard of shuffled) {
    if (!usedIds.has(poolCard.id) && breachCards.length < 3) {
      breachCards.push(poolCard);
      usedIds.add(poolCard.id);
    }
  }

  const breachState: BreachSelection = {
    cards: breachCards,
    breachSp: cardSp,
    breachCard: card
  };

  return { breachCards, breachState };
}

interface GenerateFencingCardsResult {
  creationQueue: CreationQueueItem[];
  firstSelection: BreachSelection | null;
  success: boolean;
}

/**
 * createFencingCards3 (벙 데 라므): 3x3 창조 선택
 * 펜싱 공격 카드 풀에서 3번의 선택, 각각 3장 중 1장
 */
export function generateFencingCards(
  cardSp: number,
  card: Card
): GenerateFencingCardsResult {
  const fencingAttackCards = typedCards.filter((c: Card) =>
    c.cardCategory === 'fencing' &&
    c.type === 'attack' &&
    c.id !== card.id &&
    (!c.requiredTokens || c.requiredTokens.length === 0)
  );

  if (fencingAttackCards.length < 3) {
    return { creationQueue: [], firstSelection: null, success: false };
  }

  const allShuffled = shuffle(fencingAttackCards);
  const usedIds = new Set<string>();
  const creationQueue: CreationQueueItem[] = [];

  for (let selectionIdx = 0; selectionIdx < 3; selectionIdx++) {
    const availableCards = allShuffled.filter((c: Card) => !usedIds.has(c.id));
    const selectionCards = availableCards.slice(0, 3);

    selectionCards.forEach((c: Card) => usedIds.add(c.id));

    creationQueue.push({
      cards: selectionCards,
      insertSp: (cardSp ?? 0) + 1,
      breachCard: { ...card, breachSpOffset: 1 } as Card,
      isAoe: true,
      totalSelections: 3,
      currentSelection: selectionIdx + 1
    });
  }

  const firstItem = creationQueue.shift();
  if (!firstItem) {
    return { creationQueue: [], firstSelection: null, success: false };
  }

  const firstSelection: BreachSelection = {
    cards: firstItem.cards,
    breachSp: firstItem.insertSp,
    breachCard: firstItem.breachCard,
    isCreationSelection: true,
    isAoe: firstItem.isAoe
  };

  return { creationQueue, firstSelection, success: true };
}

interface GenerateGunCardsResult {
  creationQueue: CreationQueueItem[];
  firstSelection: BreachSelection | null;
  success: boolean;
}

/**
 * executionSquad (총살): 4x3 총격카드 창조 선택
 * 총기 공격 카드 풀에서 4번의 선택, 각각 3장 중 1장
 */
export function generateExecutionSquadCards(
  cardSp: number,
  card: Card
): GenerateGunCardsResult {
  const gunAttackCards = typedCards.filter((c: Card) =>
    c.cardCategory === 'gun' &&
    c.type === 'attack' &&
    c.id !== card.id &&
    (!c.requiredTokens || c.requiredTokens.length === 0)
  );

  if (gunAttackCards.length < 3) {
    return { creationQueue: [], firstSelection: null, success: false };
  }

  const allShuffled = shuffle(gunAttackCards);
  const usedIds = new Set<string>();
  const creationQueue: CreationQueueItem[] = [];

  for (let selectionIdx = 0; selectionIdx < 4; selectionIdx++) {
    const availableCards = allShuffled.filter((c: Card) => !usedIds.has(c.id));
    const selectionCards = availableCards.slice(0, 3);

    selectionCards.forEach((c: Card) => usedIds.add(c.id));

    creationQueue.push({
      cards: selectionCards,
      insertSp: (cardSp ?? 0) + 1,
      breachCard: { ...card, breachSpOffset: 1 } as Card,
      isAoe: false,
      totalSelections: 4,
      currentSelection: selectionIdx + 1
    });
  }

  const firstItem = creationQueue.shift();
  if (!firstItem) {
    return { creationQueue: [], firstSelection: null, success: false };
  }

  const firstSelection: BreachSelection = {
    cards: firstItem.cards,
    breachSp: firstItem.insertSp,
    breachCard: firstItem.breachCard,
    isCreationSelection: true,
    isAoe: firstItem.isAoe
  };

  return { creationQueue, firstSelection, success: true };
}
