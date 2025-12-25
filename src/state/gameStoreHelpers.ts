/**
 * @file gameStoreHelpers.js
 * @description 게임 스토어 유틸리티 함수
 *
 * ## 기능
 * - 노드 클론/관리
 * - 이벤트 처리
 * - 보상 적용
 */

import { NEW_EVENT_LIBRARY, EVENT_KEYS } from "../data/newEvents";
import { calculatePassiveEffects } from "../lib/relicEffects";
import { getRunBonuses, updateStats } from "./metaProgress";

// ==================== 노드 관련 ====================

export const cloneNodes = (nodes = []) =>
  nodes.map((node) => ({
    ...node,
    connections: [...node.connections],
    dungeonData: node.dungeonData ? { ...node.dungeonData } : undefined,
  }));

// ==================== 자원 관련 ====================

export const resolveAmount = (value) => {
  if (typeof value === "number") return value;
  if (!value || typeof value !== "object") return 0;
  const min = value.min ?? 0;
  const max = value.max ?? min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const canAfford = (resources, cost = {}) =>
  Object.entries(cost)
    .filter(([key]) => key !== 'hp' && key !== 'hpPercent')
    .every(([key, value]) => (resources[key] ?? 0) >= value);

export const payCost = (cost = {}, resources = {}) => {
  const next = { ...resources };
  Object.entries(cost).forEach(([key, value]) => {
    next[key] = Math.max(0, (next[key] ?? 0) - value);
  });
  return next;
};

export const grantRewards = (rewards = {}, resources = {}) => {
  const applied = {};
  const next = { ...resources };
  Object.entries(rewards).forEach(([key, value]) => {
    const amount = resolveAmount(value);
    next[key] = (next[key] ?? 0) + amount;
    applied[key] = amount;
  });
  return { next, applied };
};

export const applyPenalty = (penalty = {}, resources = {}) => {
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

// ==================== 이벤트 관련 ====================

export const computeFriendlyChance = (mapRisk) => Math.max(0.2, Math.min(0.85, 1 - mapRisk / 120));

// pendingNextEvent가 있으면 랜덤 풀에 추가
// 반환값: pendingNextEvent가 선택됐으면 true
export const ensureEventKey = (node, completedEvents = [], pendingNextEvent = null) => {
  if (node.eventKey || !EVENT_KEYS.length) return false;

  let availableEvents = EVENT_KEYS.filter(key => !completedEvents.includes(key));

  if (pendingNextEvent && NEW_EVENT_LIBRARY[pendingNextEvent] && !completedEvents.includes(pendingNextEvent)) {
    if (!availableEvents.includes(pendingNextEvent)) {
      availableEvents = [...availableEvents, pendingNextEvent];
    }
  }

  if (!availableEvents.length) {
    const index = Math.floor(Math.random() * EVENT_KEYS.length);
    node.eventKey = EVENT_KEYS[index];
    return false;
  }

  const index = Math.floor(Math.random() * availableEvents.length);
  node.eventKey = availableEvents[index];

  return node.eventKey === pendingNextEvent;
};

// 반환값: { payload, usedPendingEvent }
export const createEventPayload = (node, mapRisk, completedEvents = [], pendingNextEvent = null) => {
  if (!node || node.type !== "event" || node.isStart) return { payload: null, usedPendingEvent: false };
  const usedPendingEvent = ensureEventKey(node, completedEvents, pendingNextEvent);
  const definition = NEW_EVENT_LIBRARY[node.eventKey];
  if (!definition) return { payload: null, usedPendingEvent: false };
  return {
    payload: {
      definition,
      currentStage: null,
      resolved: false,
      outcome: null,
      risk: mapRisk,
      friendlyChance: computeFriendlyChance(mapRisk),
    },
    usedPendingEvent,
  };
};

// ==================== 상징/초기화 관련 ====================

// 초기 상태에 상징 패시브 효과와 메타 진행 보너스를 적용하는 헬퍼
export const applyInitialRelicEffects = (state) => {
  const passiveEffects = calculatePassiveEffects(state.relics);
  const metaBonuses = getRunBonuses();

  // 런 시작 통계 업데이트
  updateStats({ totalRuns: 1 });

  return {
    ...state,
    maxHp: 100 + passiveEffects.maxHp + metaBonuses.hp,
    playerHp: 100 + passiveEffects.maxHp + metaBonuses.hp,
    playerStrength: passiveEffects.strength,
    playerAgility: passiveEffects.agility,
    resources: {
      ...state.resources,
      gold: (state.resources?.gold || 0) + metaBonuses.gold,
    },
    metaBonuses,
  };
};

// ==================== 상수 ====================

export const MEMORY_GAIN_PER_NODE = 10;
export const AWAKEN_COST = 100;
export const MAX_PLAYER_SELECTION = 3;

export const BATTLE_TYPES = new Set(["battle", "elite", "boss", "dungeon"]);

export const BATTLE_REWARDS = {
  battle: { gold: { min: 10, max: 16 }, loot: { min: 1, max: 2 } },
  elite: { gold: { min: 18, max: 26 }, loot: { min: 2, max: 3 }, intel: 1 },
  boss: { gold: { min: 30, max: 40 }, loot: { min: 3, max: 4 }, intel: 2, material: 1 },
  dungeon: { gold: { min: 20, max: 32 }, loot: { min: 2, max: 4 } },
};

export const BATTLE_LABEL = {
  battle: "전투",
  elite: "정예",
  boss: "보스",
  dungeon: "던전",
};

export const BATTLE_STATS = {
  battle: { player: { hp: 100, maxHp: 100, block: 0 }, enemy: { hp: 40, block: 0 } },
  elite: { player: { hp: 100, maxHp: 100, block: 0 }, enemy: { hp: 55, block: 0 } },
  boss: { player: { hp: 100, maxHp: 100, block: 0 }, enemy: { hp: 80, block: 0 } },
  dungeon: { player: { hp: 100, maxHp: 100, block: 0 }, enemy: { hp: 60, block: 0 } },
  default: { player: { hp: 100, maxHp: 100, block: 0 }, enemy: { hp: 40, block: 0 } },
};

export const ENEMY_COUNT_BY_TYPE = {
  battle: 3,
  elite: 4,
  boss: 5,
  dungeon: 3,
  default: 1,
};
