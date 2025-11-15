import { CARD_LIBRARY } from "../data/cards";

const PRIORITY_WEIGHT = {
  instant: 3,
  quick: 2,
  normal: 1,
  slow: 0,
};

const randomPick = (list, count) => {
  if (!Array.isArray(list) || list.length === 0) return [];
  const pool = [...list];
  const picks = [];
  while (picks.length < count && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(idx, 1)[0]);
  }
  return picks;
};

let handCounter = 0;
export const inflateCards = (ids = []) =>
  ids
    .map((id) => CARD_LIBRARY[id])
    .filter(Boolean)
    .map((card) => ({
      ...card,
      priorityWeight: PRIORITY_WEIGHT[card.priority] ?? 1,
    }));

const attachInstanceId = (cards) =>
  cards.map((card) => ({
    ...card,
    instanceId: `${card.id}-${handCounter + 1}`,
  }));

export const drawHand = (deck, count) => {
  const inflated = inflateCards(randomPick(deck, count));
  const hand = attachInstanceId(inflated);
  handCounter += hand.length;
  return hand;
};

const toAction = (actor, card) => ({
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

export const buildSpeedTimeline = (playerCards, enemyCards, maxTU = 30) => {
  const combined = [
    ...playerCards.map((card) => toAction("player", card)),
    ...enemyCards.map((card) => toAction("enemy", card)),
  ];

  combined.sort((a, b) => {
    if (a.speedCost !== b.speedCost) return a.speedCost - b.speedCost;
    if (a.priorityWeight !== b.priorityWeight) return b.priorityWeight - a.priorityWeight;
    return a.roll - b.roll;
  });

  const timeline = [];
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

export const createTurnPreview = (playerDeck, enemyDeck, options = {}) => {
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

export const cardsFromIds = (ids = []) => inflateCards(ids);
