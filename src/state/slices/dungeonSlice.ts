/**
 * @file dungeonSlice.ts
 * @description 던전 탐험 슬라이스
 */

import type { SliceCreator, DungeonSliceState, DungeonSliceActions } from './types';
import { cloneNodes, payCost } from '../gameStoreHelpers';
import { travelToNode } from '../battleHelpers';
import { updateStats } from '../metaProgress';

export type DungeonSlice = DungeonSliceState & DungeonSliceActions;

export const createDungeonSlice: SliceCreator<DungeonSlice> = (set, get) => ({
  // 초기 상태
  activeDungeon: null,

  // 액션
  confirmDungeon: () =>
    set((state) => {
      if (!state.activeDungeon) return state;

      // 던전 데이터가 없으면 생성 (한 번만)
      if (!state.activeDungeon.dungeonData) {
        return {
          ...state,
          activeDungeon: {
            ...state.activeDungeon,
            confirmed: true,
            dungeonData: null, // DungeonExploration이 생성하도록 null로 설정
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
      const currentNode = dungeon.nodes.find((n: { id: string }) => n.id === dungeon.currentNodeId);
      const targetNode = dungeon.nodes.find((n: { id: string }) => n.id === targetNodeId);

      if (!currentNode || !targetNode) return state;

      // 연결된 노드인지 확인
      if (!currentNode.connections.includes(targetNodeId)) return state;

      // 시간 증가
      const newTimeElapsed = (dungeon.timeElapsed || 0) + 1;

      // 노드 방문 처리
      const updatedNodes = dungeon.nodes.map((n: { id: string }) =>
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

  clearDungeonNode: (nodeId) =>
    set((state) => {
      if (!state.activeDungeon?.dungeonData) return state;

      const dungeon = state.activeDungeon.dungeonData;
      const updatedNodes = dungeon.nodes.map((n: { id: string }) =>
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
