/**
 * @file dungeonSlice.ts
 * @description 던전 탐험 액션 슬라이스
 *
 * 초기 상태는 gameStore.ts의 createInitialState()에서 제공됩니다.
 */

import type { StateCreator } from 'zustand';
import type { GameStore, DungeonSliceActions } from './types';
import { cloneNodes, payCost } from '../gameStoreHelpers';
import { travelToNode } from '../battleHelpers';
import { updateStats } from '../metaProgress';
import { recordDungeon } from '../../simulator/bridge/stats-bridge';

export type DungeonActionsSlice = DungeonSliceActions;

type SliceCreator = StateCreator<GameStore, [], [], DungeonActionsSlice>;

export const createDungeonActions: SliceCreator = (set) => ({
  confirmDungeon: () =>
    set((state) => {
      if (!state.activeDungeon) return state;
      if (!state.activeDungeon.dungeonData) {
        return {
          ...state,
          activeDungeon: {
            ...state.activeDungeon,
            confirmed: true,
            dungeonData: undefined,
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
        return { ...state, activeDungeon: null };
      }
      return {
        ...state,
        map: result.map,
        activeEvent: result.event,
        activeBattle: result.battle,
        activeDungeon: null,
        pendingNextEvent: result.usedPendingEvent ? null : state.pendingNextEvent,
      } as Partial<GameStore>;
    }),

  skipDungeon: () =>
    set((state) => {
      if (!state.activeDungeon) return state;
      const nodeId = state.activeDungeon.nodeId;
      const nodes = cloneNodes(state.map.nodes);
      const dungeonNode = nodes.find((n) => n.id === nodeId);

      if (!dungeonNode) return { ...state, activeDungeon: null };

      dungeonNode.cleared = true;
      nodes.forEach((node) => {
        if (!node.cleared) node.selectable = false;
      });
      dungeonNode.connections.forEach((id: string) => {
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

      dungeonNode.cleared = true;
      nodes.forEach((node) => {
        if (!node.cleared) node.selectable = false;
      });
      dungeonNode.connections.forEach((id: string) => {
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

      updateStats({ dungeonClears: 1 });

      // 통계 기록: 던전 완료
      const dungeonId = state.activeDungeon.dungeonData?.id || nodeId;
      recordDungeon(dungeonId, true, {
        floor: state.activeDungeon.dungeonData?.floor ?? 1,
        turnsSpent: state.activeDungeon.dungeonData?.timeElapsed ?? 0,
      });

      dungeonNode.cleared = true;
      nodes.forEach((node) => {
        if (!node.cleared) node.selectable = false;
      });
      dungeonNode.connections.forEach((id: string) => {
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
        resources: payCost({ intel: 2 }, state.resources) as GameStore['resources'],
        activeDungeon: { ...state.activeDungeon, revealed: true },
      } as Partial<GameStore>;
    }),

  setDungeonData: (dungeonData) =>
    set((state) => {
      if (!state.activeDungeon) return state;
      return {
        ...state,
        activeDungeon: { ...state.activeDungeon, dungeonData: dungeonData ?? undefined },
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

  setCurrentRoomKey: (roomKey) =>
    set((state) => {
      if (!state.activeDungeon) return state;
      return {
        ...state,
        activeDungeon: { ...state.activeDungeon, currentRoomKey: roomKey },
      };
    }),

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

  navigateDungeonNode: (targetNodeId) =>
    set((state) => {
      if (!state.activeDungeon?.dungeonData) return state;

      const dungeon = state.activeDungeon.dungeonData;
      const currentNode = dungeon.nodes?.find((n: { id: string }) => n.id === dungeon.currentNodeId);
      const targetNode = dungeon.nodes?.find((n: { id: string }) => n.id === targetNodeId);

      if (!currentNode || !targetNode) return state;
      if (!currentNode.connections.includes(targetNodeId)) return state;

      const newTimeElapsed = (dungeon.timeElapsed || 0) + 1;
      const updatedNodes = dungeon.nodes?.map((n: { id: string }) =>
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
          } as GameStore['activeDungeon'] extends { dungeonData?: infer T } ? T : never,
        },
      } as Partial<GameStore>;
    }),

  clearDungeonNode: (nodeId) =>
    set((state) => {
      if (!state.activeDungeon?.dungeonData) return state;

      const dungeon = state.activeDungeon.dungeonData;
      const updatedNodes = dungeon.nodes?.map((n: { id: string }) =>
        n.id === nodeId ? { ...n, cleared: true, event: null as null } : n
      );

      return {
        ...state,
        activeDungeon: {
          ...state.activeDungeon,
          dungeonData: { ...dungeon, nodes: updatedNodes },
        },
      } as Partial<GameStore>;
    }),

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
});

// 하위 호환성
export const createDungeonSlice = createDungeonActions;
export type DungeonSlice = DungeonActionsSlice;
