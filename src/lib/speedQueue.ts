/**
 * @file speedQueue.ts
 * @description 카드 속도 우선순위 큐
 *
 * ## 우선순위
 * - instant: 3 (즉시)
 * - quick: 2 (빠름)
 * - normal: 1 (보통)
 * - slow: 0 (느림)
 */

import { CARD_LIBRARY } from "../data/cards";
import type {
  InflatedCard,
  SpeedQueueHandCard as HandCard,
  TimelineAction,
  TimelineEntry,
  TurnPreview,
  CreateTurnPreviewOptions
} from "../types";

/** 카드 우선순위 */
export type CardPriority = 'instant' | 'quick' | 'normal' | 'slow';

// Re-export types for backward compatibility
export type { InflatedCard, HandCard, TimelineAction, TimelineEntry, TurnPreview };

const PRIORITY_WEIGHT: Record<string, number> = {
  instant: 3,
  quick: 2,
  normal: 1,
  slow: 0,
};

const randomPick = <T>(list: T[], count: number): T[] => {
  if (!Array.isArray(list) || list.length === 0) return [];
  const pool = [...list];
  const picks: T[] = [];
  while (picks.length < count && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(idx, 1)[0]);
  }
  return picks;
};

let handCounter = 0;

export const inflateCards = (ids: string[] = []): InflatedCard[] =>
  ids
    .map((id) => CARD_LIBRARY[id])
    .filter(Boolean)
    .map((card) => ({
      ...card,
      priorityWeight: PRIORITY_WEIGHT[card.priority ?? 'normal'] ?? 1,
    }));

const attachInstanceId = (cards: InflatedCard[]): HandCard[] =>
  cards.map((card) => ({
    ...card,
    instanceId: `${card.id}-${handCounter + 1}`,
  }));

export const drawHand = (deck: string[], count: number): HandCard[] => {
  const inflated = inflateCards(randomPick(deck, count));
  const hand = attachInstanceId(inflated);
  handCounter += hand.length;
  return hand;
};

const toAction = (actor: 'player' | 'enemy', card: InflatedCard): TimelineAction => ({
  actor,
  cardId: card.id,
  name: card.name,
  speedCost: card.speedCost ?? 5,
  priorityWeight: card.priorityWeight ?? 1,
  priority: card.priority ?? "normal",
  actionCost: card.actionCost ?? 1,
  tags: card.tags ?? [],
  roll: Math.random(),
});

export const buildSpeedTimeline = (
  playerCards: InflatedCard[],
  enemyCards: InflatedCard[],
  maxTU: number = 30
): TimelineEntry[] => {
  const combined: TimelineAction[] = [
    ...playerCards.map((card) => toAction("player", card)),
    ...enemyCards.map((card) => toAction("enemy", card)),
  ];

  combined.sort((a, b) => {
    if (a.speedCost !== b.speedCost) return a.speedCost - b.speedCost;
    if (a.priorityWeight !== b.priorityWeight) return b.priorityWeight - a.priorityWeight;
    return a.roll - b.roll;
  });

  const timeline: TimelineEntry[] = [];
  let accumulated = 0;
  combined.forEach((entry) => {
    if (accumulated + entry.speedCost > maxTU) return;
    accumulated += entry.speedCost;
    timeline.push({
      ...entry,
      order: timeline.length + 1,
      tu: accumulated,
    });
  });

  return timeline;
};

export const createTurnPreview = (
  playerDeck: string[],
  enemyDeck: string[],
  options: CreateTurnPreviewOptions = {}
): TurnPreview => {
  const { playerHandSize = 3, enemyHandSize = 3, maxTU = 30 } = options;
  const playerHand = drawHand(playerDeck, playerHandSize);
  const enemyHand = drawHand(enemyDeck, enemyHandSize);
  const timeline = buildSpeedTimeline(playerHand, enemyHand, maxTU);
  return {
    playerHand,
    enemyHand,
    timeline,
    tuLimit: maxTU,
  };
};

export const cardsFromIds = (ids: string[] = []): InflatedCard[] => inflateCards(ids);
