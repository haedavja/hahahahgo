import { create } from "zustand";
import { eventLibrary } from "../data/events";
import { createInitialState } from "./useGameState";
import { PLAYER_STARTER_DECK, ENEMY_DECKS } from "../data/cards";
import { drawHand, buildSpeedTimeline } from "../lib/speedQueue";
import { simulateBattle, pickOutcome } from "../lib/battleResolver";

const EVENT_KEYS = Object.keys(eventLibrary);
const BATTLE_TYPES = new Set(["battle", "elite", "boss", "dungeon"]);
const BATTLE_REWARDS = {
  battle: { gold: { min: 10, max: 16 }, loot: { min: 1, max: 2 } },
  elite: { gold: { min: 18, max: 26 }, loot: { min: 2, max: 3 }, intel: 1 },
  boss: { gold: { min: 30, max: 40 }, loot: { min: 3, max: 4 }, intel: 2, material: 1 },
  dungeon: { gold: { min: 20, max: 32 }, loot: { min: 2, max: 4 } },
};
const BATTLE_LABEL = {
  battle: "援먯쟾",
  elite: "?뺤삁",
  boss: "蹂댁뒪",
  dungeon: "?섏쟾",
};
const BATTLE_STATS = {
  battle: { player: { hp: 60, block: 0 }, enemy: { hp: 40, block: 0 } },
  elite: { player: { hp: 65, block: 0 }, enemy: { hp: 55, block: 0 } },
  boss: { player: { hp: 70, block: 0 }, enemy: { hp: 80, block: 0 } },
  dungeon: { player: { hp: 60, block: 0 }, enemy: { hp: 60, block: 0 } },
  default: { player: { hp: 60, block: 0 }, enemy: { hp: 40, block: 0 } },
};
const MAX_PLAYER_SELECTION = 3;

const cloneNodes = (nodes = []) =>
  nodes.map((node) => ({
    ...node,
    connections: [...node.connections],
    dungeonData: node.dungeonData ? { ...node.dungeonData } : undefined,
  }));

const ensureEventKey = (node) => {
  if (node.eventKey || !EVENT_KEYS.length) return;
  const index = Math.floor(Math.random() * EVENT_KEYS.length);
  node.eventKey = EVENT_KEYS[index];
};

const resolveAmount = (value) => {
  if (typeof value === "number") return value;
  if (!value || typeof value !== "object") return 0;
  const min = value.min ?? 0;
  const max = value.max ?? min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const canAfford = (resources, cost = {}) =>
  Object.entries(cost).every(([key, value]) => (resources[key] ?? 0) >= value);

const payCost = (cost = {}, resources = {}) => {
  const next = { ...resources };
  Object.entries(cost).forEach(([key, value]) => {
    next[key] = Math.max(0, (next[key] ?? 0) - value);
  });
  return next;
};

const grantRewards = (rewards = {}, resources = {}) => {
  const applied = {};
  const next = { ...resources };
  Object.entries(rewards).forEach(([key, value]) => {
    const amount = resolveAmount(value);
    next[key] = (next[key] ?? 0) + amount;
    applied[key] = amount;
  });
  return { next, applied };
};

const applyPenalty = (penalty = {}, resources = {}) => {
  const applied = {};
  const next = { ...resources };
  Object.entries(penalty).forEach(([key, value]) => {
    const amount = resolveAmount(value);
    const current = next[key] ?? 0;
    const actual = Math.min(current, amount);
    next[key] = Math.max(0, current - actual);
    applied[key] = -actual;
  });
  return { next, applied };
};

const computeFriendlyChance = (mapRisk) => Math.max(0.2, Math.min(0.85, 1 - mapRisk / 120));

const createEventPayload = (node, mapRisk) => {
  if (!node || node.type !== "event" || node.isStart) return null;
  ensureEventKey(node);
  const definition = eventLibrary[node.eventKey];
  if (!definition) return null;
  return {
    definition,
    resolved: false,
    outcome: null,
    risk: mapRisk,
    friendlyChance: computeFriendlyChance(mapRisk),
  };
};

const resolveEnemyDeck = (kind) => ENEMY_DECKS[kind] ?? ENEMY_DECKS.default ?? [];

const computeBattlePlan = (kind, playerCards, enemyCards) => {
  const timeline = buildSpeedTimeline(playerCards, enemyCards, 30);
  return {
    preview: {
      playerHand: playerCards,
      enemyHand: enemyCards,
      timeline,
      tuLimit: 30,
    },
    simulation: simulateBattle(timeline, BATTLE_STATS[kind] ?? BATTLE_STATS.default),
  };
};

const createBattlePayload = (node) => {
  if (!node || !BATTLE_TYPES.has(node.type) || node.isStart) return null;
  const playerLibrary = [...PLAYER_STARTER_DECK];
  const enemyLibrary = [...resolveEnemyDeck(node.type)];
  const playerDrawPile = [...playerLibrary];
  const enemyDrawPile = [...enemyLibrary];
  const playerHand = drawHand(playerDrawPile, 3);
  const enemyHand = drawHand(enemyDrawPile, 3);
  const { preview, simulation } = computeBattlePlan(node.type, playerHand, enemyHand);
  return {
    nodeId: node.id,
    kind: node.type,
    label: node.displayLabel ?? BATTLE_LABEL[node.type] ?? node.type.toUpperCase(),
    rewards: BATTLE_REWARDS[node.type] ?? {},
    difficulty: node.type === "boss" ? 5 : node.type === "elite" ? 4 : node.type === "dungeon" ? 3 : 2,
    playerLibrary,
    playerDrawPile,
    playerDiscardPile: [],
    enemyLibrary,
    enemyDrawPile,
    enemyDiscardPile: [],
    playerHand,
    enemyHand,
    selectedCardIds: [],
    maxSelection: MAX_PLAYER_SELECTION,
    preview,
    simulation,
  };
};

const travelToNode = (state, nodeId) => {
  const nodes = cloneNodes(state.map.nodes);
  const target = nodes.find((n) => n.id === nodeId);
  if (!target || !target.selectable || target.cleared) return null;

  nodes.forEach((node) => {
    if (!node.cleared) node.selectable = false;
  });
  target.cleared = true;
  target.connections.forEach((id) => {
    const nextNode = nodes.find((n) => n.id === id);
    if (nextNode && !nextNode.cleared) nextNode.selectable = true;
  });

  return {
    map: { ...state.map, nodes, currentNodeId: target.id },
    event: createEventPayload(target, state.mapRisk),
    battle: createBattlePayload(target),
  };
};

export const useGameStore = create((set, get) => ({
  ...createInitialState(),

  resetRun: () => set(() => createInitialState()),

  selectNode: (nodeId) =>
    set((state) => {
      if (state.activeBattle) return state;
      const node = state.map.nodes.find((n) => n.id === nodeId);
      if (!node || !node.selectable || node.cleared) return state;
      if (node.type === "dungeon") {
        return {
          ...state,
          activeDungeon: { nodeId: node.id, revealed: false },
        };
      }
      const result = travelToNode(state, nodeId);
      if (!result) return state;
      return {
        ...state,
        map: result.map,
        activeEvent: result.event,
        activeBattle: result.battle ?? null,
        activeDungeon: null,
      };
    }),

  enterDungeon: () =>
    set((state) => {
      if (state.activeBattle) return state;
      if (!state.activeDungeon) return state;
      const result = travelToNode(state, state.activeDungeon.nodeId);
      if (!result) {
        return {
          ...state,
          activeDungeon: null,
        };
      }
      return {
        ...state,
        map: result.map,
        activeEvent: result.event,
        activeBattle: result.battle ?? null,
        activeDungeon: null,
      };
    }),

  skipDungeon: () =>
    set((state) => (state.activeDungeon ? { ...state, activeDungeon: null } : state)),

  revealDungeonInfo: () =>
    set((state) => {
      if (!state.activeDungeon || state.activeDungeon.revealed) return state;
      if ((state.resources.intel ?? 0) < 2) return state;
      return {
        ...state,
        resources: payCost({ intel: 2 }, state.resources),
        activeDungeon: { ...state.activeDungeon, revealed: true },
      };
    }),

  chooseEvent: (choiceId) =>
    set((state) => {
      const active = state.activeEvent;
      if (!active || active.resolved) return state;

      const choice = active.definition.choices.find((item) => item.id === choiceId);
      if (!choice || !canAfford(state.resources, choice.cost || {})) return state;

      let resources = payCost(choice.cost || {}, state.resources);
      let rewards = {};
      let penalty = {};
      const chance = active.friendlyChance;
      const isFriendly = Math.random() < chance;

      if (isFriendly) {
        const result = grantRewards(choice.rewards || {}, resources);
        resources = result.next;
        rewards = result.applied;
      } else {
        const result = applyPenalty(choice.penalty || {}, resources);
        resources = result.next;
        penalty = result.applied;
      }

      return {
        ...state,
        resources,
        activeEvent: {
          ...active,
          resolved: true,
          outcome: {
            choice: choice.label,
            success: isFriendly,
            text: isFriendly ? choice.successText : choice.failureText,
            cost: choice.cost || {},
            rewards,
            penalty,
            probability: chance,
          },
        },
      };
    }),

  invokePrayer: (cost) =>
    set((state) => {
      const active = state.activeEvent;
      if (!active || active.resolved) return state;
      if ((state.resources.aether ?? 0) < cost) return state;

      const afterCost = payCost({ aether: cost }, state.resources);
      const result = grantRewards({ intel: Math.max(1, Math.ceil(cost / 2)) }, afterCost);

      return {
        ...state,
        resources: result.next,
        activeEvent: {
          ...active,
          resolved: true,
          outcome: {
            choice: `湲곕룄 x${cost}`,
            success: true,
            text: "占쏙옙占쌓몌옙占쏙옙 占쏙옙占쏙옙占싹울옙 占쏙옙占쏙옙占쏙옙 占쏙옙화占실억옙占쏙옙占싹댐옙.",
            cost: { aether: cost },
            rewards: result.applied,
            penalty: {},
            probability: 1,
          },
        },
      };
    }),

  closeEvent: () =>
    set((state) => (state.activeEvent ? { ...state, activeEvent: null } : state)),

  applyAetherDelta: (delta = 0) =>
    set((state) => {
      const amount = Number(delta) || 0;
      if (!amount) return state;
      const current = state.resources.aether ?? 0;
      const nextValue = Math.max(0, current + amount);
      if (nextValue === current) return state;
      return {
        ...state,
        resources: {
          ...state.resources,
          aether: nextValue,
        },
      };
    }),

  resolveBattle: (outcome = {}) =>
    set((state) => {
      if (!state.activeBattle) return state;
      const rewardsDef = state.activeBattle.rewards ?? {};
      const autoResult = pickOutcome(state.activeBattle.simulation, "victory");
    const resultLabel = outcome.result ?? autoResult;
    const rewards = resultLabel === "victory" ? grantRewards(rewardsDef, state.resources) : { next: state.resources, applied: {} };
    return {
      ...state,
      resources: rewards.next,
      activeBattle: null,
      lastBattleResult: {
        nodeId: state.activeBattle.nodeId,
        kind: state.activeBattle.kind,
        label: state.activeBattle.label,
        result: resultLabel,
        log: state.activeBattle.simulation?.log ?? [],
        finalState: state.activeBattle.simulation?.finalState ?? null,
        initialState: state.activeBattle.simulation?.initialState ?? null,
        rewards: rewards.applied,
      },
    };
    }),

  clearBattleResult: () =>
    set((state) => (state.lastBattleResult ? { ...state, lastBattleResult: null } : state)),

  toggleBattleCard: (cardId) =>
    set((state) => {
      const battle = state.activeBattle;
      if (!battle) return state;
      const inHand = battle.playerHand.some((card) => card.instanceId === cardId || card.id === cardId);
      if (!inHand) return state;
      const idKey = battle.playerHand.find((card) => card.instanceId === cardId)?.instanceId ?? cardId;
      const isSelected = battle.selectedCardIds.includes(idKey);
      let nextSelected = battle.selectedCardIds;
      if (isSelected) {
        nextSelected = battle.selectedCardIds.filter((id) => id !== idKey);
      } else if (battle.selectedCardIds.length < (battle.maxSelection ?? MAX_PLAYER_SELECTION)) {
        nextSelected = [...battle.selectedCardIds, idKey];
      } else {
        return state;
      }
      return {
        ...state,
        activeBattle: {
          ...battle,
          selectedCardIds: nextSelected,
        },
      };
    }),

  commitBattlePlan: () =>
    set((state) => {
      const battle = state.activeBattle;
      if (!battle) return state;

      const drawFromPile = (pile) => {
        if (!pile.length) return [];
        return drawHand(pile, Math.min(3, pile.length));
      };

      const recyclePile = (pile, discard) => {
        if (pile.length > 0 || discard.length === 0) return pile;
        return [...discard];
      };

      const selectedCards =
        battle.selectedCardIds.length > 0
          ? battle.playerHand.filter((card) => battle.selectedCardIds.includes(card.instanceId ?? card.id))
          : battle.playerHand;
      const enemyCards =
        battle.enemyHand.length > 0
          ? battle.enemyHand
          : drawFromPile(
              battle.enemyDrawPile.length ? battle.enemyDrawPile : recyclePile(battle.enemyDrawPile, battle.enemyDiscardPile),
            );

      const remainingPlayerHand = battle.playerHand.filter(
        (card) => !selectedCards.some((chosen) => chosen.instanceId === card.instanceId),
      );
      const playerDiscard = [...battle.playerDiscardPile, ...selectedCards];
      const enemyDiscard = [...battle.enemyDiscardPile, ...enemyCards];

      let nextPlayerDraw = battle.playerDrawPile.filter(
        (card) => !selectedCards.some((chosen) => chosen.instanceId === card.instanceId),
      );
      if (nextPlayerDraw.length < 3) {
        nextPlayerDraw = recyclePile(nextPlayerDraw, playerDiscard);
      }
      const newPlayerHand = remainingPlayerHand.length ? remainingPlayerHand : drawFromPile(nextPlayerDraw);

      let nextEnemyDraw = battle.enemyDrawPile.filter(
        (card) => !enemyCards.some((chosen) => chosen.instanceId === card.instanceId),
      );
      if (nextEnemyDraw.length < 3) {
        nextEnemyDraw = recyclePile(nextEnemyDraw, enemyDiscard);
      }
      const newEnemyHand = drawFromPile(nextEnemyDraw);

      const { preview, simulation } = computeBattlePlan(battle.kind, selectedCards, enemyCards);
      return {
        ...state,
        activeBattle: {
          ...battle,
          preview,
          simulation,
          playerHand: newPlayerHand,
          enemyHand: newEnemyHand,
          playerDrawPile: nextPlayerDraw,
          playerDiscardPile: playerDiscard,
          enemyDrawPile: nextEnemyDraw,
          enemyDiscardPile: enemyDiscard,
          selectedCardIds: [],
        },
      };
    }),
}));

export const selectors = {
  nodes: (state) => state.map.nodes,
  resources: (state) => state.resources,
  mapRisk: (state) => state.mapRisk,
  map: (state) => state.map,
  activeEvent: (state) => state.activeEvent,
  activeDungeon: (state) => state.activeDungeon,
  activeBattle: (state) => state.activeBattle,
  lastBattleResult: (state) => state.lastBattleResult,
};


