/**
 * @file mapSlice.ts
 * @description 맵 네비게이션 액션 슬라이스
 *
 * 초기 상태는 gameStore.ts의 createInitialState()에서 제공됩니다.
 */

import type { StateCreator } from 'zustand';
import type { GameStore, MapSliceActions } from './types';
import { applyNodeMoveEther } from '../../lib/relicEffects';
import { travelToNode } from '../battleHelpers';
import { MEMORY_GAIN_PER_NODE } from '../gameStoreHelpers';

export type MapActionsSlice = MapSliceActions;

type SliceCreator = StateCreator<GameStore, [], [], MapActionsSlice>;

export const createMapActions: SliceCreator = (set) => ({
  selectNode: (nodeId) =>
    set((state) => {
      if (state.activeBattle) return state;
      const node = state.map.nodes.find((n) => n.id === nodeId);
      if (!node || !node.selectable || node.cleared) return state;
      if (node.type === 'dungeon') {
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
        activeBattle: result.battle as unknown as GameStore['activeBattle'],
        activeDungeon: null,
        activeRest: result.target?.type === 'rest' ? { nodeId: result.target.id } : null,
        activeShop: result.target?.type === 'shop' ? { nodeId: result.target.id, merchantType: 'shop' } : null,
        resources: updatedResources,
        pendingNextEvent: result.usedPendingEvent ? null : state.pendingNextEvent,
        itemBuffs: {},
      } as Partial<GameStore>;
    }),

  setMapRisk: (value) =>
    set((state) => ({
      ...state,
      mapRisk: Math.max(20, Math.min(80, value)),
    })),
});

// 하위 호환성을 위한 별칭
export const createMapSlice = createMapActions;
export type MapSlice = MapActionsSlice;
