/**
 * @file gameStore.ts
 * @description 메인 게임 상태 저장소 (Zustand)
 *
 * ## 아키텍처
 * 이 파일은 현재 활성 구현체입니다. 타입 정의는 ./slices/types.ts에서 관리됩니다.
 *
 * ## 슬라이스 모듈 (./slices/)
 * 관심사별로 분리된 슬라이스 구현이 준비되어 있습니다:
 * - playerSlice: 플레이어 HP, 스탯, 자원
 * - mapSlice: 맵 네비게이션, 위험도
 * - dungeonSlice: 던전 탐험 시스템
 * - battleSlice: 전투 시작/종료/카드 선택
 * - eventSlice: 이벤트 선택지 처리
 * - buildSlice: 캐릭터 빌드, 카드 관리
 * - relicSlice: 상징 추가/제거
 * - itemSlice: 아이템 사용/관리
 * - restSlice: 휴식, 각성, 자아 형성
 * - shopSlice: 상점 열기/닫기
 * - devSlice: 개발자 도구
 *
 * @see ./slices/types.ts - 공유 타입 정의
 * @see ./slices/index.ts - 슬라이스 barrel export
 */

import { create } from "zustand";
import type { Resources, ActiveEvent, ActiveDungeon } from "../types";
import { NEW_EVENT_LIBRARY } from "../data/newEvents";
import { createInitialState } from "./useGameState";
import { CARDS, ENEMIES, ENEMY_GROUPS, getRandomEnemy } from "../components/battle/battleData";
import { drawHand, buildSpeedTimeline } from "../lib/speedQueue";
import { simulateBattle, pickOutcome } from "../lib/battleResolver";
import { calculatePassiveEffects, applyCombatEndEffects, applyNodeMoveEther } from "../lib/relicEffects";
import { getItem } from "../data/items";
import { updateStats } from "./metaProgress";

// 헬퍼 함수들 import
import {
  cloneNodes,
  resolveAmount,
  canAfford,
  payCost,
  grantRewards,
  computeFriendlyChance,
  applyInitialRelicEffects,
  MEMORY_GAIN_PER_NODE,
  AWAKEN_COST,
  MAX_PLAYER_SELECTION,
  BATTLE_STATS,
} from "./gameStoreHelpers";

import {
  BATTLE_CARDS,
  resolveEnemyDeck,
  computeBattlePlan,
  drawCharacterBuildHand,
  createBattlePayload,
  travelToNode,
} from "./battleHelpers";

// ==================== 타입 정의 (slices/types.ts에서 재사용) ====================
// 공유 타입은 slices/types.ts에 정의되어 있으며, 하위 호환성을 위해 여기서 재export합니다.

export type {
  PlayerStats,
  CharacterBuild,
  MapState,
  ActiveBattle,
  GameItem,
  PlayerEgo,
  LastBattleResult,
  GameStoreState,
  GameStoreActions,
  GameStore,
} from "./slices/types";

// ActiveEvent, ActiveDungeon은 types/index.ts에서 import
export type { ActiveEvent, ActiveDungeon } from "../types";

// 슬라이스 타입 import (내부 사용)
import type { GameStore } from "./slices/types";

export const useGameStore = create<GameStore>((set, get) => ({
  ...applyInitialRelicEffects(createInitialState()),
  devDulledLevel: null,
  devForcedCrossroad: null,  // 강제할 기로 템플릿 ID (예: 'cliff', 'lockedChest')
  devBattleTokens: [],  // 개발자 모드에서 전투 중 추가할 토큰 [{id, stacks, target}]

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

      // 맵 이동 시 상징 효과 적용 (황금 나침반)
      let updatedResources = state.resources;
      try {
        const currentEther = state.resources.etherPts ?? 0;
        const etherGain = applyNodeMoveEther(state.relics || [], currentEther);
        if (etherGain > 0) {
          const newEtherPts = currentEther + etherGain;
          updatedResources = { ...state.resources, etherPts: newEtherPts };
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
        activeShop: result.target?.type === "shop" ? { nodeId: result.target.id, merchantType: 'shop' } : null,
        resources: updatedResources,
        // pendingNextEvent가 사용됐으면 초기화
        pendingNextEvent: result.usedPendingEvent ? null : state.pendingNextEvent,
        // 아이템 버프 초기화 (1노드 지속)
        itemBuffs: {},
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
        // pendingNextEvent가 사용됐으면 초기화
        pendingNextEvent: result.usedPendingEvent ? null : state.pendingNextEvent,
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

      // 메타 진행: 던전 클리어 통계 업데이트
      updateStats({ dungeonClears: 1 });

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

  // 미로 던전: 현재 방 키 설정
  setCurrentRoomKey: (roomKey) =>
    set((state) => {
      if (!state.activeDungeon) return state;
      return {
        ...state,
        activeDungeon: { ...state.activeDungeon, currentRoomKey: roomKey },
      };
    }),

  // 미로 던전: 방 방문 상태 업데이트
  updateMazeRoom: (roomKey, updates) =>
    set((state) => {
      if (!state.activeDungeon?.dungeonData?.grid) return state;
      const grid = { ...state.activeDungeon.dungeonData.grid };
      if (grid[roomKey]) {
        grid[roomKey] = { ...grid[roomKey], ...updates };
      }
      return {
        ...state,
        activeDungeon: {
          ...state.activeDungeon,
          dungeonData: { ...state.activeDungeon.dungeonData, grid },
        },
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

  // === 새 던전 시스템 (그래프 기반) ===

  // 던전 노드 이동
  navigateDungeonNode: (targetNodeId) =>
    set((state) => {
      if (!state.activeDungeon?.dungeonData) return state;

      const dungeon = state.activeDungeon.dungeonData;
      const currentNode = dungeon.nodes.find(n => n.id === dungeon.currentNodeId);
      const targetNode = dungeon.nodes.find(n => n.id === targetNodeId);

      if (!currentNode || !targetNode) return state;

      // 연결된 노드인지 확인
      if (!currentNode.connections.includes(targetNodeId)) return state;

      // 시간 증가
      const newTimeElapsed = (dungeon.timeElapsed || 0) + 1;

      // 노드 방문 처리
      const updatedNodes = dungeon.nodes.map(n =>
        n.id === targetNodeId ? { ...n, visited: true } : n
      );

      return {
        ...state,
        activeDungeon: {
          ...state.activeDungeon,
          dungeonData: {
            ...dungeon,
            currentNodeId: targetNodeId,
            timeElapsed: newTimeElapsed,
            nodes: updatedNodes,
          },
        },
      };
    }),

  // 던전 노드 클리어
  clearDungeonNode: (nodeId) =>
    set((state) => {
      if (!state.activeDungeon?.dungeonData) return state;

      const dungeon = state.activeDungeon.dungeonData;
      const updatedNodes = dungeon.nodes.map(n =>
        n.id === nodeId ? { ...n, cleared: true, event: null } : n
      );

      return {
        ...state,
        activeDungeon: {
          ...state.activeDungeon,
          dungeonData: {
            ...dungeon,
            nodes: updatedNodes,
          },
        },
      };
    }),

  // 시간 페널티 적용 (에테르 감소)
  applyDungeonTimePenalty: (etherDecay) =>
    set((state) => {
      if (etherDecay <= 0) return state;

      const currentEther = state.resources?.etherPts || 0;
      return {
        ...state,
        resources: {
          ...state.resources,
          etherPts: Math.max(0, currentEther - etherDecay),
        },
      };
    }),

  // 플레이어 피해 적용
  applyDamage: (damage) =>
    set((state) => {
      const currentHp = state.playerHp || 0;
      const newHp = Math.max(0, currentHp - damage);

      return {
        ...state,
        playerHp: newHp,
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

      // 스탯 요구사항 체크
      if (choice.statRequirement) {
        const playerStats = {
          insight: state.playerInsight || 0,
          strength: state.playerStrength || 0,
          agility: state.playerAgility || 0,
        };
        const meetsRequirements = Object.entries(choice.statRequirement).every(
          ([stat, required]) => (playerStats[stat] ?? 0) >= required
        );
        if (!meetsRequirements) {
          return state;
        }
      }

      // 비용 지불
      let resources = payCost(choice.cost || {}, state.resources);

      // HP 비용 처리
      let newPlayerHp = state.playerHp;
      if (choice.cost?.hp) {
        newPlayerHp = Math.max(1, newPlayerHp - choice.cost.hp); // 최소 1 HP 유지
      }
      if (choice.cost?.hpPercent) {
        const hpCost = Math.floor(state.maxHp * (choice.cost.hpPercent / 100));
        newPlayerHp = Math.max(1, newPlayerHp - hpCost); // 최소 1 HP 유지
      }

      // 보상 지급
      let rewards = {};
      let newOwnedCards = [...(state.characterBuild?.ownedCards || [])];

      if (choice.rewards) {
        const result = grantRewards(choice.rewards, resources);
        resources = result.next;
        rewards = result.applied;

        // 카드 보상 처리 - 랜덤 카드를 대기 카드(ownedCards)에 추가
        if (choice.rewards.card && choice.rewards.card > 0) {
          const cardCount = resolveAmount(choice.rewards.card);
          const availableCards = CARDS.filter(c => !newOwnedCards.includes(c.id));
          for (let i = 0; i < cardCount && availableCards.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * availableCards.length);
            const selectedCard = availableCards.splice(randomIndex, 1)[0];
            newOwnedCards.push(selectedCard.id);
          }
        }
      }

      // characterBuild 업데이트
      const updatedCharacterBuild = {
        ...state.characterBuild,
        ownedCards: newOwnedCards,
      };

      // nextStage가 있으면 같은 이벤트 내 다음 스테이지로 전환
      if (choice.nextStage && active.definition.stages?.[choice.nextStage]) {
        return {
          ...state,
          resources,
          playerHp: newPlayerHp,
          characterBuild: updatedCharacterBuild,
          activeEvent: {
            ...active,
            currentStage: choice.nextStage,
          },
        };
      }

      // openShop이 있으면 상점 열기
      if (choice.openShop) {
        return {
          ...state,
          resources,
          playerHp: newPlayerHp,
          characterBuild: updatedCharacterBuild,
          activeShop: { merchantType: choice.openShop },
          activeEvent: {
            ...active,
            resolved: true,
            outcome: {
              choice: choice.label,
              success: true,
              resultDescription: choice.resultDescription || null,
            },
          },
        };
      }

      // 이벤트 종료 - 완료된 이벤트 목록에 추가
      const eventId = active.definition?.id;
      const newCompletedEvents = eventId && !state.completedEvents?.includes(eventId)
        ? [...(state.completedEvents || []), eventId]
        : state.completedEvents || [];

      // nextEvent가 있으면 다음 이벤트 노드에서 등장하도록 예약
      const pendingNextEvent = (choice.nextEvent && NEW_EVENT_LIBRARY[choice.nextEvent])
        ? choice.nextEvent
        : state.pendingNextEvent;

      return {
        ...state,
        resources,
        playerHp: newPlayerHp,
        characterBuild: updatedCharacterBuild,
        completedEvents: newCompletedEvents,
        pendingNextEvent,
        activeEvent: {
          ...active,
          resolved: true,
          outcome: {
            choice: choice.label,
            success: true,
            cost: choice.cost || {},
            rewards,
            resultDescription: choice.resultDescription || null,
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

  // 상점 열기
  openShop: (merchantType = 'shop') =>
    set((state) => ({
      ...state,
      activeShop: { merchantType },
    })),

  // 상점 닫기
  closeShop: () =>
    set((state) => (state.activeShop ? { ...state, activeShop: null } : state)),

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
      const hasCharacterBuild = characterBuild && (characterBuild.mainSpecials?.length > 0 || characterBuild.subSpecials?.length > 0 || characterBuild.ownedCards?.length > 0);

      const playerLibrary = hasCharacterBuild
        ? [...characterBuild.mainSpecials, ...characterBuild.subSpecials]
        : [...BATTLE_CARDS];

      // 적 선택: enemyId, enemyTier, 또는 기본값 사용
      let enemy = null;
      let enemyDeck = [];

      if (battleConfig.enemyId) {
        // 특정 적 ID가 지정된 경우
        enemy = ENEMIES.find(e => e.id === battleConfig.enemyId);
      } else if (battleConfig.tier) {
        // 티어 기반 랜덤 적 선택
        enemy = getRandomEnemy(battleConfig.tier);
      }

      if (enemy) {
        enemyDeck = enemy.deck || [];
      } else {
        // 기본 적 덱 사용
        enemyDeck = resolveEnemyDeck("battle");
      }

      const enemyLibrary = [...enemyDeck];
      const playerDrawPile = hasCharacterBuild ? [] : [...playerLibrary];
      const enemyDrawPile = [...enemyLibrary];

      const playerHand = hasCharacterBuild
        ? drawCharacterBuildHand(characterBuild.mainSpecials, characterBuild.subSpecials, characterBuild.ownedCards)
        : drawHand(playerDrawPile, 3);

      const enemyHand = drawHand(enemyDrawPile, Math.min(3, enemyDrawPile.length));

      // 적 HP 결정: 지정된 값, 적 데이터, 또는 기본값
      const enemyHp = battleConfig.enemyHp || (enemy?.hp) || 30;

      // 전투 시뮬레이션 생성 (현재 playerHp, maxHp 사용)
      const battleStats = {
        player: { hp: state.playerHp, maxHp: state.maxHp, block: 0 },
        enemy: { hp: enemyHp, maxHp: enemyHp, block: 0 }
      };

      const timeline = buildSpeedTimeline(playerHand, enemyHand, 30);
      const simulation = simulateBattle(timeline, battleStats);
      const preview = {
        playerHand,
        enemyHand,
        timeline,
        tuLimit: 30,
      };

      // 적 정보 저장 (표시용)
      const enemyInfo = enemy ? {
        id: enemy.id,
        name: enemy.name,
        emoji: enemy.emoji,
        tier: enemy.tier,
        isBoss: enemy.isBoss || false,
      } : null;

      return {
        ...state,
        activeBattle: {
          nodeId: battleConfig.nodeId || "dungeon-combat",
          kind: battleConfig.kind || "combat",
          label: battleConfig.label || (enemy?.name) || "던전 몬스터",
          rewards: battleConfig.rewards || { gold: { min: 5 + (enemy?.tier || 1) * 3, max: 10 + (enemy?.tier || 1) * 5 }, loot: 1 },
          difficulty: enemy?.tier || 2,
          enemyInfo,
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

    // 메타 진행 통계 업데이트 (승리 시)
    if (resultLabel === "victory") {
      const enemyInfo = state.activeBattle.enemyInfo;
      const statsUpdate = {
        totalKills: 1,
        totalDamageDealt: outcome.damageDealt || 0,
      };

      // 보스 처치 체크
      if (enemyInfo?.isBoss || state.activeBattle.kind === "boss") {
        statsUpdate.bossKills = 1;
      }

      updateStats(statsUpdate);
    }

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
        enemyInfo: state.activeBattle.enemyInfo,
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
        // 캐릭터 빌드: 주특기 100% + 보조특기 50% 확률 + 보유카드 10% 확률
        newPlayerHand = drawCharacterBuildHand(
          battle.characterBuild.mainSpecials,
          battle.characterBuild.subSpecials,
          battle.characterBuild.ownedCards
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
        ownedCards: state.characterBuild?.ownedCards || [],
      },
    })),

  // 보유 카드 추가 (상점 구매용 - 특기 지정 없음)
  addOwnedCard: (cardId) =>
    set((state) => ({
      ...state,
      characterBuild: {
        ...state.characterBuild,
        ownedCards: [...(state.characterBuild?.ownedCards || []), cardId],
      },
    })),

  // 보유 카드 제거 (한 장만)
  removeOwnedCard: (cardId) =>
    set((state) => {
      const ownedCards = state.characterBuild?.ownedCards || [];
      const idx = ownedCards.lastIndexOf(cardId);
      if (idx === -1) return state;
      const newOwned = [...ownedCards.slice(0, idx), ...ownedCards.slice(idx + 1)];
      return {
        ...state,
        characterBuild: {
          ...state.characterBuild,
          ownedCards: newOwned,
        },
      };
    }),

  // 보유 카드 전체 제거
  clearOwnedCards: () =>
    set((state) => ({
      ...state,
      characterBuild: {
        ...state.characterBuild,
        ownedCards: [],
      },
    })),

  // 덱에서 카드 제거 (상점 서비스용)
  removeCardFromDeck: (cardId, isMainSpecial = false) =>
    set((state) => {
      const { mainSpecials, subSpecials, ownedCards } = state.characterBuild || { mainSpecials: [], subSpecials: [], ownedCards: [] };

      if (isMainSpecial) {
        const newMain = mainSpecials.filter(id => id !== cardId);
        return {
          ...state,
          characterBuild: { mainSpecials: newMain, subSpecials, ownedCards },
        };
      } else {
        const newSub = subSpecials.filter(id => id !== cardId);
        return {
          ...state,
          characterBuild: { mainSpecials, subSpecials: newSub, ownedCards },
        };
      }
    }),

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

  setDevForcedCrossroad: (templateId) =>
    set((state) => ({
      ...state,
      devForcedCrossroad: templateId || null,
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

  // 노드 텔레포트 (개발자 도구용)
  devTeleportToNode: (nodeId) =>
    set((state) => {
      const nodes = state.map?.nodes;
      if (!nodes) return state;

      const targetNode = nodes.find((n) => n.id === nodeId);
      if (!targetNode) return state;

      // 던전 노드인 경우
      if (targetNode.type === "dungeon") {
        return {
          ...state,
          activeDungeon: { nodeId: targetNode.id, revealed: false, confirmed: false },
        };
      }

      // 상점 노드인 경우
      if (targetNode.type === "shop") {
        return {
          ...state,
          map: {
            ...state.map,
            currentNodeId: nodeId,
          },
          activeShop: { nodeId: targetNode.id, merchantType: 'shop' },
        };
      }

      // 휴식 노드인 경우
      if (targetNode.type === "rest") {
        return {
          ...state,
          map: {
            ...state.map,
            currentNodeId: nodeId,
          },
          activeRest: { nodeId: targetNode.id },
        };
      }

      // DEV: 텔레포트를 위해 임시로 노드를 selectable하고 cleared=false로 설정
      const tempState = {
        ...state,
        map: {
          ...state.map,
          nodes: state.map.nodes.map(n =>
            n.id === nodeId ? { ...n, selectable: true, cleared: false } : n
          ),
        },
      };

      // travelToNode 로직 사용하여 노드 활성화
      const result = travelToNode(tempState, nodeId);
      if (!result) {
        // travelToNode가 실패하면 단순 이동만
        return {
          ...state,
          map: {
            ...state.map,
            currentNodeId: nodeId,
          },
        };
      }

      return {
        ...state,
        map: result.map,
        activeEvent: result.event,
        activeBattle: result.battle,
        // pendingNextEvent 사용된 경우 클리어
        pendingNextEvent: result.usedPendingEvent ? null : state.pendingNextEvent,
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

  // 개발자 모드: 전투 중 토큰 추가
  devAddBattleToken: (tokenId, stacks = 1, target = 'player') =>
    set((state) => ({
      ...state,
      devBattleTokens: [...state.devBattleTokens, { id: tokenId, stacks, target, timestamp: Date.now() }],
    })),

  // 개발자 모드: 전투 토큰 대기열 클리어
  devClearBattleTokens: () =>
    set((state) => ({
      ...state,
      devBattleTokens: [],
    })),

  // 개발자 모드: 원하는 적과 전투 시작
  devStartBattle: (groupId) =>
    set((state) => {
      // 이미 전투 중이면 무시
      if (state.activeBattle) return state;

      // ENEMY_GROUPS에서 해당 그룹 찾기
      const group = ENEMY_GROUPS.find(g => g.id === groupId);
      if (!group) {
        console.warn(`[DEV] 전투 그룹을 찾을 수 없음: ${groupId}`);
        return state;
      }

      // 그룹의 첫 번째 적 정보 가져오기 (대표 적)
      const primaryEnemyId = group.enemies[0];
      const primaryEnemy = ENEMIES.find(e => e.id === primaryEnemyId);

      // 모든 적의 총 HP 계산
      const totalEnemyHp = group.enemies.reduce((sum, enemyId) => {
        const enemy = ENEMIES.find(e => e.id === enemyId);
        return sum + (enemy?.hp || 30);
      }, 0);

      // 적 덱 합치기 (모든 적의 카드)
      const combinedDeck = group.enemies.flatMap(enemyId => {
        const enemy = ENEMIES.find(e => e.id === enemyId);
        return enemy?.deck || [];
      });

      // 캐릭터 빌드 기반 플레이어 핸드 생성
      const characterBuild = state.characterBuild;
      const hasCharacterBuild = characterBuild && (
        characterBuild.mainSpecials?.length > 0 ||
        characterBuild.subSpecials?.length > 0 ||
        characterBuild.ownedCards?.length > 0
      );

      const playerLibrary = hasCharacterBuild
        ? [...(characterBuild.mainSpecials || []), ...(characterBuild.subSpecials || [])]
        : [...CARDS];

      const playerDrawPile = hasCharacterBuild ? [] : [...playerLibrary];
      const enemyDrawPile = [...combinedDeck];

      const playerHand = hasCharacterBuild
        ? drawCharacterBuildHand(characterBuild.mainSpecials, characterBuild.subSpecials, characterBuild.ownedCards)
        : drawHand(playerDrawPile, 3);

      const enemyHand = drawHand(enemyDrawPile, Math.min(3, enemyDrawPile.length));

      const battleStats = {
        player: { hp: state.playerHp, maxHp: state.maxHp, block: 0 },
        enemy: { hp: totalEnemyHp, maxHp: totalEnemyHp, block: 0 }
      };

      const timeline = buildSpeedTimeline(playerHand, enemyHand, 30);
      const simulation = simulateBattle(timeline, battleStats);

      // 적 유닛 정보 생성 (다중 적 지원)
      const enemyUnits = group.enemies.map((enemyId, idx) => {
        const enemy = ENEMIES.find(e => e.id === enemyId);
        return {
          unitId: idx,
          id: enemyId,
          name: enemy?.name || enemyId,
          emoji: enemy?.emoji || "👾",
          hp: enemy?.hp || 30,
          maxHp: enemy?.hp || 30,
          ether: enemy?.ether || 100,
          deck: enemy?.deck || [],
          cardsPerTurn: enemy?.cardsPerTurn || 1,
          tier: enemy?.tier || 1,
          passives: enemy?.passives || {},
        };
      });

      return {
        ...state,
        activeBattle: {
          nodeId: `dev-battle-${groupId}`,
          kind: "combat",
          label: group.name,
          rewards: { gold: { min: 10, max: 20 }, loot: 1 },
          difficulty: group.tier,
          tier: group.tier,
          preview: {
            playerHand,
            enemyHand,
            timeline,
            tuLimit: 30,
          },
          enemyStats: { hp: totalEnemyHp, maxHp: totalEnemyHp },
          enemyInfo: {
            id: primaryEnemyId,
            name: group.name,
            emoji: primaryEnemy?.emoji || "👾",
            tier: group.tier,
            isBoss: primaryEnemy?.isBoss || false,
          },
          enemyUnits,
          groupId: group.id,
          devMode: true,
        },
      };
    }),

  // ==================== 상징 관리 ====================

  // 상징 추가
  addRelic: (relicId) =>
    set((state) => {
      if (state.relics.includes(relicId)) return state;
      const newRelics = [...state.relics, relicId];
      const newPassiveEffects = calculatePassiveEffects(newRelics);

      // maxHp 증가량 계산 (state.maxHp에서 기존 보너스 역산으로 중복 호출 제거)
      const oldMaxHpBonus = state.maxHp - 100;
      const maxHpIncrease = newPassiveEffects.maxHp - oldMaxHpBonus;
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

  // 상징 제거
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

  // 상징 직접 설정 (개발자 도구용)
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

      return {
        ...state,
        ...applied,
        resources: { ...state.resources, memory: memory - AWAKEN_COST },
        playerTraits: newTraits,
        activeRest: null,
      };
    }),

  // 자아 형성: 5개의 개성을 소모하여 자아 생성
  formEgo: (selectedTraits) =>
    set((state) => {
      if (!selectedTraits || selectedTraits.length !== 5) return state;

      // 선택된 개성이 실제로 보유중인지 확인
      const availableTraits = [...(state.playerTraits || [])];
      const traitsToRemove = [...selectedTraits];
      for (const trait of traitsToRemove) {
        const idx = availableTraits.indexOf(trait);
        if (idx === -1) return state; // 보유하지 않은 개성 선택
        availableTraits.splice(idx, 1);
      }

      // 개성별 효과 정의
      const traitEffects = {
        '용맹함': { playerStrength: 1 },
        '굳건함': { maxHp: 10, playerHp: 10 },
        '냉철함': { playerInsight: 1 },
        '철저함': { extraSubSpecialSlots: 1 },
        '열정적': { playerMaxSpeedBonus: 5 },
        '활력적': { playerEnergyBonus: 1 },
      };

      // 자아 규칙: 개성 조합에 따른 자아 이름 결정
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

      // 선택된 개성 카운트
      const traitCounts = selectedTraits.reduce((acc, t) => {
        acc[t] = (acc[t] || 0) + 1;
        return acc;
      }, {});

      // 자아 이름 결정 (가장 많은 조합 기준)
      let bestEgo = null;
      let bestScore = 0;
      for (const { ego, parts } of egoRules) {
        const score = (traitCounts[parts[0]] || 0) + (traitCounts[parts[1]] || 0);
        if (score > bestScore) {
          bestScore = score;
          bestEgo = ego;
        }
      }
      if (!bestEgo) bestEgo = '각성'; // 기본값

      // 소모된 개성들의 효과 합산
      const combinedEffects = {};
      for (const trait of selectedTraits) {
        const effects = traitEffects[trait];
        if (effects) {
          for (const [key, value] of Object.entries(effects)) {
            combinedEffects[key] = (combinedEffects[key] || 0) + value;
          }
        }
      }

      // 새 자아 객체 생성
      const newEgo = {
        name: bestEgo,
        consumedTraits: selectedTraits,
        effects: combinedEffects,
      };

      const newEgos = [...(state.playerEgos || []), newEgo];

      return {
        ...state,
        playerTraits: availableTraits,
        playerEgos: newEgos,
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

  // ==================== 아이템 관리 ====================

  // 아이템 획득 (빈 슬롯에 추가)
  addItem: (itemId) =>
    set((state) => {
      const item = getItem(itemId);
      if (!item) {
        console.warn(`[addItem] Item not found: ${itemId}`);
        return state;
      }
      const items = [...state.items];
      const emptySlot = items.findIndex((slot) => slot === null);
      if (emptySlot === -1) {
        console.warn('[addItem] No empty slot available');
        return state;
      }
      items[emptySlot] = item;
      return { ...state, items };
    }),

  // 아이템 제거
  removeItem: (slotIndex) =>
    set((state) => {
      if (slotIndex < 0 || slotIndex >= state.items.length) return state;
      const items = [...state.items];
      items[slotIndex] = null;
      return { ...state, items };
    }),

  // 아이템 사용
  useItem: (slotIndex, battleContext = null) =>
    set((state) => {
      if (slotIndex < 0 || slotIndex >= state.items.length) return state;
      const item = state.items[slotIndex];
      if (!item) {
        console.warn('[useItem] No item in slot', slotIndex);
        return state;
      }

      // 전투 중이면 combat 아이템만, 아니면 any 아이템만 사용 가능
      const inBattle = !!state.activeBattle;
      if (item.usableIn === 'combat' && !inBattle) {
        console.warn('[useItem] Combat item can only be used in battle');
        return state;
      }

      // 아이템 슬롯에서 제거
      const items = [...state.items];
      items[slotIndex] = null;

      // 효과 적용
      const effect = item.effect;
      let updates = { items };

      switch (effect.type) {
        case 'heal': {
          const maxHp = state.maxHp ?? 100;
          const newHp = Math.min(maxHp, (state.playerHp ?? 0) + effect.value);
          updates.playerHp = newHp;
          break;
        }
        case 'healPercent': {
          const maxHp = state.maxHp ?? 100;
          const healAmount = Math.floor(maxHp * effect.value / 100);
          const newHp = Math.min(maxHp, (state.playerHp ?? 0) + healAmount);
          updates.playerHp = newHp;
          break;
        }
        case 'statBoost': {
          // 1노드 지속 스탯 버프
          const newBuffs = { ...(state.itemBuffs || {}) };
          newBuffs[effect.stat] = (newBuffs[effect.stat] || 0) + effect.value;
          updates.itemBuffs = newBuffs;
          break;
        }
        case 'etherMultiplier':
        case 'etherSteal':
        case 'damage':
        case 'defense':
        case 'attackBoost':
        case 'turnEnergy':
        case 'maxEnergy':
        case 'cardDestroy':
        case 'cardFreeze': {
          // 전투용 아이템 - battleContext에 효과 전달
          // 전투 아이템 효과는 별도로 activeBattle에 저장
          if (state.activeBattle) {
            const battle = { ...state.activeBattle };
            battle.pendingItemEffects = [...(battle.pendingItemEffects || []), effect];
            updates.activeBattle = battle;
          }
          break;
        }
        default:
          console.warn(`[useItem] Unknown effect type: ${effect.type}`);
      }

      return { ...state, ...updates };
    }),

  // 아이템 버프 초기화 (노드 이동 시 호출)
  clearItemBuffs: () =>
    set((state) => ({
      ...state,
      itemBuffs: {},
    })),

  // 개발용: 아이템 직접 설정
  devSetItems: (itemIds) =>
    set((state) => {
      const items = itemIds.map((id) => (id ? getItem(id) : null));
      return { ...state, items };
    }),

  // 전투용 아이템 효과 대기열 초기화
  clearPendingItemEffects: () =>
    set((state) => {
      if (!state.activeBattle) return state;
      const battle = { ...state.activeBattle };
      battle.pendingItemEffects = [];
      return { ...state, activeBattle: battle };
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
