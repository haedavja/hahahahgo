import { create } from "zustand";
import { NEW_EVENT_LIBRARY } from "../data/newEvents";
import { createInitialState } from "./useGameState";
import { ENEMY_DECKS } from "../data/cards";
import { CARDS } from "../components/battle/battleData";
import { drawHand, buildSpeedTimeline } from "../lib/speedQueue";
import { simulateBattle, pickOutcome } from "../lib/battleResolver";
import { calculatePassiveEffects, applyCombatEndEffects, applyNodeMoveEther } from "../lib/relicEffects";

// 전투에서 사용되는 카드 8종의 ID 배열
const BATTLE_CARDS = CARDS.slice(0, 8).map(card => card.id);

const EVENT_KEYS = Object.keys(NEW_EVENT_LIBRARY);
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
  battle: { player: { hp: 100, maxHp: 100, block: 0 }, enemy: { hp: 40, block: 0 } },
  elite: { player: { hp: 100, maxHp: 100, block: 0 }, enemy: { hp: 55, block: 0 } },
  boss: { player: { hp: 100, maxHp: 100, block: 0 }, enemy: { hp: 80, block: 0 } },
  dungeon: { player: { hp: 100, maxHp: 100, block: 0 }, enemy: { hp: 60, block: 0 } },
  default: { player: { hp: 100, maxHp: 100, block: 0 }, enemy: { hp: 40, block: 0 } },
};
const MAX_PLAYER_SELECTION = 3;

const cloneNodes = (nodes = []) =>
  nodes.map((node) => ({
    ...node,
    connections: [...node.connections],
    dungeonData: node.dungeonData ? { ...node.dungeonData } : undefined,
  }));

const ensureEventKey = (node, completedEvents = []) => {
  if (node.eventKey || !EVENT_KEYS.length) return;
  // 완료된 이벤트 제외
  const availableEvents = EVENT_KEYS.filter(key => !completedEvents.includes(key));
  if (!availableEvents.length) {
    // 모든 이벤트를 완료했으면 전체에서 랜덤 선택
    const index = Math.floor(Math.random() * EVENT_KEYS.length);
    node.eventKey = EVENT_KEYS[index];
  } else {
    const index = Math.floor(Math.random() * availableEvents.length);
    node.eventKey = availableEvents[index];
  }
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

// 초기 상태에 유물 패시브 효과를 적용하는 헬퍼
const applyInitialRelicEffects = (state) => {
  const passiveEffects = calculatePassiveEffects(state.relics);
  return {
    ...state,
    maxHp: 100 + passiveEffects.maxHp,
    playerStrength: passiveEffects.strength,
    playerAgility: passiveEffects.agility,
  };
};

const createEventPayload = (node, mapRisk, completedEvents = []) => {
  if (!node || node.type !== "event" || node.isStart) return null;
  ensureEventKey(node, completedEvents);
  const definition = NEW_EVENT_LIBRARY[node.eventKey];
  if (!definition) return null;
  return {
    definition,
    currentStage: null, // stages 구조 지원: null이면 초기 상태
    resolved: false,
    outcome: null,
    risk: mapRisk,
    friendlyChance: computeFriendlyChance(mapRisk),
  };
};

const resolveEnemyDeck = (kind) => ENEMY_DECKS[kind] ?? ENEMY_DECKS.default ?? [];

const computeBattlePlan = (kind, playerCards, enemyCards, currentPlayerHp = null, currentMaxHp = null, enemyCount = 1) => {
  const timeline = buildSpeedTimeline(playerCards, enemyCards, 30);
  const baseStats = BATTLE_STATS[kind] ?? BATTLE_STATS.default;
  const battleStats = currentPlayerHp !== null
    ? {
        ...baseStats,
        player: {
          ...baseStats.player,
          hp: currentPlayerHp,
          maxHp: currentMaxHp ?? currentPlayerHp // maxHp가 없으면 hp를 사용
        }
      }
    : baseStats;

  const scaledEnemyHp = Math.max(1, Math.round((battleStats.enemy?.hp ?? 40) * enemyCount));
  const scaledEnemy = {
    ...battleStats.enemy,
    hp: scaledEnemyHp,
    maxHp: scaledEnemyHp,
    enemyCount,
  };
  const finalStats = {
    ...battleStats,
    enemy: scaledEnemy,
  };

  return {
    preview: {
      playerHand: playerCards,
      enemyHand: enemyCards,
      timeline,
      tuLimit: 30,
    },
    simulation: simulateBattle(timeline, finalStats),
    enemyCount,
  };
};

const drawCharacterBuildHand = (mainSpecials, subSpecials) => {
  // 주특기 카드는 100% 등장
  const mainCards = mainSpecials.map((cardId) => cardId);
  // 보조특기 카드는 각각 50% 확률로 등장
  const subCards = subSpecials.filter(() => Math.random() < 0.5);
  // 합쳐서 손패 생성
  const cardIds = [...mainCards, ...subCards];
  return drawHand(cardIds, cardIds.length);
};

const ENEMY_COUNT_BY_TYPE = {
  battle: 3,
  elite: 4,
  boss: 5,
  dungeon: 3,
  default: 1,
};

const createBattlePayload = (node, characterBuild, playerHp = null, maxHp = null) => {
  if (!node || !BATTLE_TYPES.has(node.type) || node.isStart) return null;
  const enemyCount = Math.max(1, node.enemyCount ?? ENEMY_COUNT_BY_TYPE[node.type] ?? ENEMY_COUNT_BY_TYPE.default);

  // 캐릭터 빌드가 있으면 그걸 사용, 없으면 기존 방식
  const hasCharacterBuild = characterBuild && (characterBuild.mainSpecials.length > 0 || characterBuild.subSpecials.length > 0);

  const playerLibrary = hasCharacterBuild
    ? [...characterBuild.mainSpecials, ...characterBuild.subSpecials]
    : [...BATTLE_CARDS];

  // 적 덱을 개체 수만큼 복제해 다수 몬스터의 패턴을 더 많이 노출
  const baseEnemyDeck = resolveEnemyDeck(node.type);
  const enemyLibrary = [];
  for (let i = 0; i < enemyCount; i += 1) {
    enemyLibrary.push(...baseEnemyDeck);
  }
  const playerDrawPile = hasCharacterBuild ? [] : [...playerLibrary]; // 캐릭터 빌드 사용 시 드로우 파일 사용 안 함
  const enemyDrawPile = [...enemyLibrary];

  const playerHand = hasCharacterBuild
    ? drawCharacterBuildHand(characterBuild.mainSpecials, characterBuild.subSpecials)
    : drawHand(playerDrawPile, 3);

  // 적 손패 크기를 개체 수에 비례해 확장 (기본 3장 * 개체 수, 드로우 가능한 한도 내)
  // 적 손패를 개체 수에 비례해 확장 (최소 개체 수만큼은 항상 등장하도록 보장)
  const enemyHandSize = Math.max(enemyCount, Math.min(enemyDrawPile.length, 3 * enemyCount));
  const enemyHand = drawHand(enemyDrawPile, enemyHandSize);
  const { preview, simulation } = computeBattlePlan(node.type, playerHand, enemyHand, playerHp, maxHp, enemyCount);

  return {
    nodeId: node.id,
    kind: node.type,
    label: node.displayLabel ?? BATTLE_LABEL[node.type] ?? node.type.toUpperCase(),
    enemyCount,
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
    hasCharacterBuild, // 캐릭터 빌드 사용 여부 저장
    characterBuild: hasCharacterBuild ? characterBuild : null,
  };
};

const MEMORY_GAIN_PER_NODE = 10;
const AWAKEN_COST = 100;

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
    event: createEventPayload(target, state.mapRisk, state.completedEvents || []),
    battle: createBattlePayload(target, state.characterBuild, state.playerHp, state.maxHp),
    target,
  };
};

export const useGameStore = create((set, get) => ({
  ...applyInitialRelicEffects(createInitialState()),
  devDulledLevel: null,

  resetRun: () => set(() => applyInitialRelicEffects(createInitialState())),

  selectNode: (nodeId) =>
    set((state) => {
      if (state.activeBattle) return state;
      const node = state.map.nodes.find((n) => n.id === nodeId);
      if (!node || !node.selectable || node.cleared) return state;
      if (node.type === "dungeon") {
        return {
          ...state,
          activeDungeon: { nodeId: node.id, revealed: false, confirmed: false },
        };
      }
      const result = travelToNode(state, nodeId);
      if (!result) return state;

      // 맵 이동 시 유물 효과 적용 (황금 나침반)
      let updatedResources = state.resources;
      try {
        const currentEther = state.resources.etherPts ?? 0;
        const etherGain = applyNodeMoveEther(state.relics || [], currentEther);
        if (etherGain > 0) {
          const newEtherPts = currentEther + etherGain;
          updatedResources = { ...state.resources, etherPts: newEtherPts };
          // 이동 시 발동 로그/피드백
          console.log(`🧭 황금 나침반 발동: +${etherGain}pt (총 ${newEtherPts}pt)`);
        }
      } catch (error) {
        console.error('Error applying node move ether:', error);
      }

      // 맵 이동 시 기억 획득
      const currentMemory = updatedResources.memory ?? 0;
      updatedResources = { ...updatedResources, memory: currentMemory + MEMORY_GAIN_PER_NODE };

      return {
        ...state,
        map: result.map,
        activeEvent: result.event,
        activeBattle: result.battle ?? null,
        activeDungeon: null,
        activeRest: result.target?.type === "rest" ? { nodeId: result.target.id } : null,
        resources: updatedResources,
      };
    }),

  confirmDungeon: () =>
    set((state) => {
      if (!state.activeDungeon) return state;

      // 던전 데이터가 없으면 생성 (한 번만)
      if (!state.activeDungeon.dungeonData) {
        // 던전 생성 로직을 여기서 import해야 하는데, 순환 참조 방지를 위해
        // 간단히 dungeonData를 빈 배열로 초기화하고 DungeonExploration에서 생성
        return {
          ...state,
          activeDungeon: {
            ...state.activeDungeon,
            confirmed: true,
            dungeonData: null // DungeonExploration이 생성하도록 null로 설정
          },
        };
      }

      return {
        ...state,
        activeDungeon: { ...state.activeDungeon, confirmed: true },
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
    set((state) => {
      if (!state.activeDungeon) return state;
      const nodeId = state.activeDungeon.nodeId;
      const nodes = cloneNodes(state.map.nodes);
      const dungeonNode = nodes.find((n) => n.id === nodeId);

      if (!dungeonNode) return { ...state, activeDungeon: null };

      // 던전 노드 클리어 (탈출)
      dungeonNode.cleared = true;

      // 다른 노드들 선택 불가로 설정
      nodes.forEach((node) => {
        if (!node.cleared) node.selectable = false;
      });

      // 연결된 다음 노드들 선택 가능하게
      dungeonNode.connections.forEach((id) => {
        const nextNode = nodes.find((n) => n.id === id);
        if (nextNode && !nextNode.cleared) nextNode.selectable = true;
      });

      return {
        ...state,
        map: { ...state.map, nodes, currentNodeId: dungeonNode.id },
        activeDungeon: null,
      };
    }),

  bypassDungeon: () =>
    set((state) => {
      if (!state.activeDungeon) return state;
      const nodeId = state.activeDungeon.nodeId;
      const nodes = cloneNodes(state.map.nodes);
      const dungeonNode = nodes.find((n) => n.id === nodeId);

      if (!dungeonNode) return { ...state, activeDungeon: null };

      // 던전 노드 클리어 (지나침)
      dungeonNode.cleared = true;

      // 다른 노드들 선택 불가로 설정
      nodes.forEach((node) => {
        if (!node.cleared) node.selectable = false;
      });

      // 연결된 다음 노드들 선택 가능하게
      dungeonNode.connections.forEach((id) => {
        const nextNode = nodes.find((n) => n.id === id);
        if (nextNode && !nextNode.cleared) nextNode.selectable = true;
      });

      return {
        ...state,
        map: { ...state.map, nodes, currentNodeId: dungeonNode.id },
        activeDungeon: null,
      };
    }),

  completeDungeon: () =>
    set((state) => {
      if (!state.activeDungeon) return state;
      const nodeId = state.activeDungeon.nodeId;
      const nodes = cloneNodes(state.map.nodes);
      const dungeonNode = nodes.find((n) => n.id === nodeId);

      if (!dungeonNode) return { ...state, activeDungeon: null };

      // 던전 노드 클리어
      dungeonNode.cleared = true;

      // 다른 노드들 선택 불가로 설정
      nodes.forEach((node) => {
        if (!node.cleared) node.selectable = false;
      });

      // 연결된 다음 노드들 선택 가능하게
      dungeonNode.connections.forEach((id) => {
        const nextNode = nodes.find((n) => n.id === id);
        if (nextNode && !nextNode.cleared) nextNode.selectable = true;
      });

      return {
        ...state,
        map: { ...state.map, nodes, currentNodeId: dungeonNode.id },
        activeDungeon: null,
      };
    }),

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

  setDungeonData: (dungeonData) =>
    set((state) => {
      if (!state.activeDungeon) return state;
      return {
        ...state,
        activeDungeon: { ...state.activeDungeon, dungeonData },
      };
    }),

  setDungeonPosition: (segmentIndex, playerX) =>
    set((state) => {
      if (!state.activeDungeon) return state;
      return {
        ...state,
        activeDungeon: { ...state.activeDungeon, segmentIndex, playerX },
      };
    }),

  setDungeonInitialResources: (initialResources) =>
    set((state) => {
      if (!state.activeDungeon) return state;
      return {
        ...state,
        activeDungeon: { ...state.activeDungeon, initialResources },
      };
    }),

  setDungeonDeltas: (dungeonDeltas) =>
    set((state) => {
      if (!state.activeDungeon) return state;
      return {
        ...state,
        activeDungeon: { ...state.activeDungeon, dungeonDeltas },
      };
    }),

  chooseEvent: (choiceId) =>
    set((state) => {
      const active = state.activeEvent;
      if (!active || active.resolved) return state;

      // 현재 스테이지에 맞는 choices 가져오기
      const currentStage = active.currentStage;
      const stageData = currentStage && active.definition.stages?.[currentStage];
      const choices = stageData ? stageData.choices : active.definition.choices;

      const choice = choices?.find((item) => item.id === choiceId);
      if (!choice || !canAfford(state.resources, choice.cost || {})) return state;

      // 비용 지불
      let resources = payCost(choice.cost || {}, state.resources);

      // 보상 지급
      let rewards = {};
      let newSubSpecials = [...(state.characterBuild?.subSpecials || [])];

      if (choice.rewards) {
        const result = grantRewards(choice.rewards, resources);
        resources = result.next;
        rewards = result.applied;

        // 카드 보상 처리 - 랜덤 카드를 subSpecials에 추가
        if (choice.rewards.card && choice.rewards.card > 0) {
          const cardCount = resolveAmount(choice.rewards.card);
          const availableCards = CARDS.filter(c => !newSubSpecials.includes(c.id));
          for (let i = 0; i < cardCount && availableCards.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * availableCards.length);
            const selectedCard = availableCards.splice(randomIndex, 1)[0];
            newSubSpecials.push(selectedCard.id);
            console.log(`[Event] 카드 획득: ${selectedCard.name} (${selectedCard.id})`);
          }
        }
      }

      // characterBuild 업데이트
      const updatedCharacterBuild = {
        ...state.characterBuild,
        subSpecials: newSubSpecials,
      };

      // nextStage가 있으면 같은 이벤트 내 다음 스테이지로 전환
      if (choice.nextStage && active.definition.stages?.[choice.nextStage]) {
        return {
          ...state,
          resources,
          characterBuild: updatedCharacterBuild,
          activeEvent: {
            ...active,
            currentStage: choice.nextStage,
          },
        };
      }

      // nextEvent가 있으면 다음 이벤트로 전환
      if (choice.nextEvent && NEW_EVENT_LIBRARY[choice.nextEvent]) {
        const nextDef = NEW_EVENT_LIBRARY[choice.nextEvent];
        return {
          ...state,
          resources,
          characterBuild: updatedCharacterBuild,
          activeEvent: {
            ...active,
            definition: nextDef,
            currentStage: null, // 새 이벤트는 초기 상태로
            resolved: false,
            outcome: null,
          },
        };
      }

      // 이벤트 종료 - 완료된 이벤트 목록에 추가
      const eventId = active.definition?.id;
      const newCompletedEvents = eventId && !state.completedEvents?.includes(eventId)
        ? [...(state.completedEvents || []), eventId]
        : state.completedEvents || [];

      return {
        ...state,
        resources,
        characterBuild: updatedCharacterBuild,
        completedEvents: newCompletedEvents,
        activeEvent: {
          ...active,
          resolved: true,
          outcome: {
            choice: choice.label,
            success: true,
            cost: choice.cost || {},
            rewards,
          },
        },
      };
    }),

  invokePrayer: (cost) =>
    set((state) => {
      const active = state.activeEvent;
      if (!active || active.resolved) return state;
      if ((state.resources.etherPts ?? 0) < cost) return state;

      const afterCost = payCost({ etherPts: cost }, state.resources);
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
            cost: { etherPts: cost },
            rewards: result.applied,
            penalty: {},
            probability: 1,
          },
        },
      };
    }),

  closeEvent: () =>
    set((state) => (state.activeEvent ? { ...state, activeEvent: null } : state)),

  applyEtherDelta: (delta = 0) =>
    set((state) => {
      const amount = Number(delta) || 0;
      if (!amount) return state;
      const current = state.resources.etherPts ?? 0;
      const nextValue = Math.max(0, current + amount);
      if (nextValue === current) return state;
      return {
        ...state,
        resources: {
          ...state.resources,
          etherPts: nextValue,
        },
      };
    }),

  addResources: (resourceDeltas = {}) =>
    set((state) => {
      const newResources = { ...state.resources };
      Object.entries(resourceDeltas).forEach(([key, amount]) => {
        const numAmount = Number(amount) || 0;
        newResources[key] = Math.max(0, (newResources[key] ?? 0) + numAmount);
      });
      return {
        ...state,
        resources: newResources,
      };
    }),

  startBattle: (battleConfig = {}) =>
    set((state) => {
      // 던전에서 간단한 전투를 시작하는 함수
      const characterBuild = state.characterBuild;
      const hasCharacterBuild = characterBuild && (characterBuild.mainSpecials.length > 0 || characterBuild.subSpecials.length > 0);

      const playerLibrary = hasCharacterBuild
        ? [...characterBuild.mainSpecials, ...characterBuild.subSpecials]
        : [...BATTLE_CARDS];

      const enemyLibrary = [...resolveEnemyDeck("battle")];
      const playerDrawPile = hasCharacterBuild ? [] : [...playerLibrary];
      const enemyDrawPile = [...enemyLibrary];

      const playerHand = hasCharacterBuild
        ? drawCharacterBuildHand(characterBuild.mainSpecials, characterBuild.subSpecials)
        : drawHand(playerDrawPile, 3);

      const enemyHand = drawHand(enemyDrawPile, 3);

      // 전투 시뮬레이션 생성 (현재 playerHp, maxHp 사용)
      const battleStats = {
        player: { hp: state.playerHp, maxHp: state.maxHp, block: 0 },
        enemy: { hp: battleConfig.enemyHp || 30, block: 0 }
      };

      const timeline = buildSpeedTimeline(playerHand, enemyHand, 30);
      const simulation = simulateBattle(timeline, battleStats);
      const preview = {
        playerHand,
        enemyHand,
        timeline,
        tuLimit: 30,
      };

      return {
        ...state,
        activeBattle: {
          nodeId: battleConfig.nodeId || "dungeon-combat",
          kind: battleConfig.kind || "combat",
          label: battleConfig.label || "던전 몬스터",
          rewards: battleConfig.rewards || { gold: { min: 5, max: 10 }, loot: 1 },
          difficulty: 3,
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
          hasCharacterBuild,
          characterBuild: hasCharacterBuild ? characterBuild : null,
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

    // Update player HP from battle result
    // 실제 전투 결과가 전달되면 그 값을 사용, 없으면 시뮬레이션 결과 사용
    let finalPlayerHp = outcome.playerHp ?? state.activeBattle.simulation?.finalState?.player?.hp ?? state.playerHp;
    let newMaxHp = outcome.playerMaxHp ?? state.maxHp;

    // Apply combat end effects from relics
    try {
      const combatEndEffects = applyCombatEndEffects(state.relics || [], {
        playerHp: finalPlayerHp,
        maxHp: state.maxHp,
      });

      const healed = combatEndEffects.heal || 0;
      const maxHpGain = combatEndEffects.maxHp || 0;

      // 최대 체력 증가를 먼저 반영하고, 현재 체력이 깎이지 않도록 회복도 함께 적용
      newMaxHp = state.maxHp + maxHpGain;
      finalPlayerHp = Math.min(newMaxHp, finalPlayerHp + healed + maxHpGain);
    } catch (error) {
      console.error('Error applying combat end effects:', error);
    }

    return {
      ...state,
      resources: rewards.next,
      playerHp: Math.max(0, finalPlayerHp),
      maxHp: newMaxHp,
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

      // 캐릭터 빌드 사용 여부에 따라 다른 방식으로 손패 생성
      let newPlayerHand;
      let nextPlayerDraw;

      if (battle.hasCharacterBuild && battle.characterBuild) {
        // 캐릭터 빌드: 주특기 100% + 보조특기 50% 확률
        newPlayerHand = drawCharacterBuildHand(
          battle.characterBuild.mainSpecials,
          battle.characterBuild.subSpecials
        );
        nextPlayerDraw = [];
      } else {
        // 기존 방식: 드로우 파일에서 카드 뽑기
        nextPlayerDraw = battle.playerDrawPile.filter(
          (card) => !selectedCards.some((chosen) => chosen.instanceId === card.instanceId),
        );
        if (nextPlayerDraw.length < 3) {
          nextPlayerDraw = recyclePile(nextPlayerDraw, playerDiscard);
        }
        newPlayerHand = remainingPlayerHand.length ? remainingPlayerHand : drawFromPile(nextPlayerDraw);
      }

      let nextEnemyDraw = battle.enemyDrawPile.filter(
        (card) => !enemyCards.some((chosen) => chosen.instanceId === card.instanceId),
      );
      if (nextEnemyDraw.length < 3) {
        nextEnemyDraw = recyclePile(nextEnemyDraw, enemyDiscard);
      }
      const newEnemyHand = drawFromPile(nextEnemyDraw);

      const { preview, simulation } = computeBattlePlan(battle.kind, selectedCards, enemyCards, state.playerHp, state.maxHp);
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

  updateCharacterBuild: (mainSpecials, subSpecials) =>
    set((state) => ({
      ...state,
      characterBuild: {
        mainSpecials: mainSpecials ?? state.characterBuild.mainSpecials,
        subSpecials: subSpecials ?? state.characterBuild.subSpecials,
      },
    })),

  updatePlayerStrength: (strength) =>
    set((state) => ({
      ...state,
      playerStrength: strength,
    })),

  updatePlayerAgility: (agility) =>
    set((state) => ({
      ...state,
      playerAgility: agility, // 음수 허용 (음수면 속도 증가)
    })),

  updatePlayerInsight: (insight) =>
    set((state) => ({
      ...state,
      playerInsight: insight, // 통찰 (이벤트 선택지, 적 타임라인 정보)
    })),

  setDevDulledLevel: (level) =>
    set((state) => ({
      ...state,
      devDulledLevel:
        level === null || level === undefined
          ? null
          : Math.max(0, Math.min(3, Number(level) || 0)),
    })),

  // ==================== 개발자 도구 전용 액션 ====================

  // 자원 직접 설정
  setResources: (newResources) =>
    set((state) => ({
      ...state,
      resources: { ...state.resources, ...newResources },
    })),

  // 맵 위험도 직접 설정
  setMapRisk: (value) =>
    set((state) => ({
      ...state,
      mapRisk: Math.max(20, Math.min(80, value)),
    })),

  // 모든 노드 해금 (cleared=true, selectable=true)
  devClearAllNodes: () =>
    set((state) => {
      const updatedNodes = cloneNodes(state.map.nodes).map((node) => ({
        ...node,
        cleared: true,
        selectable: true,
      }));
      return {
        ...state,
        map: {
          ...state.map,
          nodes: updatedNodes,
        },
      };
    }),

  // 강제 승리 (전투 중일 때만)
  devForceWin: () =>
    set((state) => {
      if (!state.activeBattle) return state;
      const rewardsDef = state.activeBattle.rewards ?? {};
      const rewards = grantRewards(rewardsDef, state.resources);
      return {
        ...state,
        resources: rewards.next,
        activeBattle: null,
        lastBattleResult: {
          nodeId: state.activeBattle.nodeId,
          kind: state.activeBattle.kind,
          label: state.activeBattle.label,
          result: "victory",
          log: ["[DEV] 강제 승리"],
          finalState: null,
          initialState: null,
          rewards: rewards.applied,
        },
      };
    }),

  // 강제 패배 (전투 중일 때만)
  devForceLose: () =>
    set((state) => {
      if (!state.activeBattle) return state;
      return {
        ...state,
        activeBattle: null,
        lastBattleResult: {
          nodeId: state.activeBattle.nodeId,
          kind: state.activeBattle.kind,
          label: state.activeBattle.label,
          result: "defeat",
          log: ["[DEV] 강제 패배"],
          finalState: null,
          initialState: null,
          rewards: {},
        },
      };
    }),

  // ==================== 유물 관리 ====================

  // 유물 추가
  addRelic: (relicId) =>
    set((state) => {
      if (state.relics.includes(relicId)) return state;
      const oldRelics = state.relics;
      const newRelics = [...state.relics, relicId];
      const oldPassiveEffects = calculatePassiveEffects(oldRelics);
      const newPassiveEffects = calculatePassiveEffects(newRelics);

      // maxHp 증가량 계산
      const maxHpIncrease = newPassiveEffects.maxHp - oldPassiveEffects.maxHp;
      const newMaxHp = 100 + newPassiveEffects.maxHp;
      // maxHp가 증가한 만큼 현재 체력도 회복
      const newPlayerHp = state.playerHp + maxHpIncrease;

      return {
        ...state,
        relics: newRelics,
        maxHp: newMaxHp,
        playerHp: Math.min(newMaxHp, newPlayerHp), // 최대 체력을 초과하지 않도록
        playerStrength: newPassiveEffects.strength,
        playerAgility: newPassiveEffects.agility,
      };
    }),

  // 유물 제거
  removeRelic: (relicId) =>
    set((state) => {
      const newRelics = state.relics.filter((id) => id !== relicId);
      const passiveEffects = calculatePassiveEffects(newRelics);

      return {
        ...state,
        relics: newRelics,
        maxHp: 100 + passiveEffects.maxHp,
        playerStrength: passiveEffects.strength,
        playerAgility: passiveEffects.agility,
      };
    }),

  // 유물 직접 설정 (개발자 도구용)
  setRelics: (relicIds) =>
    set((state) => {
      const passiveEffects = calculatePassiveEffects(relicIds);

      return {
        ...state,
        relics: relicIds,
        maxHp: 100 + passiveEffects.maxHp,
        playerStrength: passiveEffects.strength,
        playerAgility: passiveEffects.agility,
      };
    }),

  // 휴식 닫기
  closeRest: () =>
    set((state) => ({
      ...state,
      activeRest: null,
    })),

  // 휴식에서 체력 회복
  healAtRest: (healAmount = 0) =>
    set((state) => {
      const maxHp = state.maxHp ?? 0;
      const current = state.playerHp ?? 0;
      const heal = Math.max(0, Math.min(maxHp - current, healAmount));
      if (heal <= 0) return state;
      return {
        ...state,
        playerHp: current + heal,
      };
    }),

  // 카드 희귀도 업그레이드 (순서: common -> rare -> special -> legendary)
  upgradeCardRarity: (cardId) =>
    set((state) => {
      if (!cardId) return state;
      const order = ['common', 'rare', 'special', 'legendary'];
      const current = state.cardUpgrades?.[cardId] || 'common';
      const nextIdx = Math.min(order.length - 1, order.indexOf(current) + 1);
      const next = order[nextIdx];
      if (next === current) return state; // 이미 최고 등급
      return {
        ...state,
        cardUpgrades: {
          ...(state.cardUpgrades || {}),
          [cardId]: next,
        },
      };
    }),

  // 휴식에서 각성
  awakenAtRest: (choiceId) =>
    set((state) => {
      if (!state.activeRest) return state;
      const memory = state.resources.memory ?? 0;
      if (memory < AWAKEN_COST) return state;

      const choices = {
        brave: (s) => ({ playerStrength: (s.playerStrength || 0) + 1, trait: '용맹함' }),
        sturdy: (s) => {
          const newMax = (s.maxHp || 0) + 10;
          const newHp = Math.min(newMax, (s.playerHp || 0) + 10);
          return { maxHp: newMax, playerHp: newHp, trait: '굳건함' };
        },
        cold: (s) => ({ playerInsight: (s.playerInsight || 0) + 1, trait: '냉철함' }),
        thorough: (s) => ({ extraSubSpecialSlots: (s.extraSubSpecialSlots || 0) + 1, trait: '철저함' }),
        passionate: (s) => ({ playerMaxSpeedBonus: (s.playerMaxSpeedBonus || 0) + 5, trait: '열정적' }),
        lively: (s) => ({ playerEnergyBonus: (s.playerEnergyBonus || 0) + 1, trait: '활력적' }),
        random: (s) => {
          const keys = ['brave', 'sturdy', 'cold', 'thorough', 'passionate', 'lively'];
          const pick = keys[Math.floor(Math.random() * keys.length)];
          return choices[pick](s);
        }
      };

      const applyFn = choiceId && choices[choiceId] ? choices[choiceId] : choices.random;
      const applied = applyFn(state);
      const newTraits = [...(state.playerTraits || [])];
      if (applied.trait) newTraits.push(applied.trait);

      // 자아 체크: 특정 개성 조합 총합 5개 이상이면 자아 1회 생성(소모 없음)
      const traitCounts = newTraits.reduce((acc, t) => {
        acc[t] = (acc[t] || 0) + 1;
        return acc;
      }, {});
      const egoRules = [
        { ego: '헌신', parts: ['열정적', '용맹함'] },
        { ego: '지략', parts: ['냉철함', '용맹함'] },
        { ego: '추격', parts: ['철저함', '용맹함'] },
        { ego: '역동', parts: ['활력적', '용맹함'] },
        { ego: '결의', parts: ['굳건함', '냉철함'] },
        { ego: '추진', parts: ['굳건함', '활력적'] },
        { ego: '신념', parts: ['굳건함', '열정적'] },
        { ego: '완성', parts: ['굳건함', '철저함'] },
        { ego: '분석', parts: ['냉철함', '열정적'] },
        { ego: '실행', parts: ['냉철함', '철저함'] },
        { ego: '정열', parts: ['활력적', '열정적'] },
        { ego: '지배', parts: ['활력적', '철저함'] },
      ];
      const ownedEgos = new Set(state.playerEgos || []);
      const newEgos = [...ownedEgos];
      // 자아는 한 번만 형성됨: 아직 자아가 없을 때만 검사
      if (ownedEgos.size === 0) {
        for (const { ego, parts } of egoRules) {
          const total = (traitCounts[parts[0]] || 0) + (traitCounts[parts[1]] || 0);
          if (total >= 5) {
            newEgos.push(ego);
            break; // 첫 번째 만족 자아만 획득
          }
        }
      }

      return {
        ...state,
        ...applied,
        resources: { ...state.resources, memory: memory - AWAKEN_COST },
        playerTraits: newTraits,
        playerEgos: newEgos,
        activeRest: null,
      };
    }),

  // 개발용: 강제로 휴식 모달 열기
  devOpenRest: () =>
    set((state) => ({
      ...state,
      activeRest: { nodeId: "DEV-REST" },
    })),

  // 개발용: 특정 이벤트 강제 트리거
  devTriggerEvent: (eventId) =>
    set((state) => {
      const definition = NEW_EVENT_LIBRARY[eventId];
      if (!definition) {
        console.warn(`[devTriggerEvent] Event not found: ${eventId}`);
        return state;
      }
      console.log('[devTriggerEvent] Triggering event:', eventId, definition);
      return {
        ...state,
        activeEvent: {
          definition,
          currentStage: null,
          resolved: false,
          outcome: null,
          risk: state.mapRisk,
          friendlyChance: computeFriendlyChance(state.mapRisk),
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
  characterBuild: (state) => state.characterBuild,
};
