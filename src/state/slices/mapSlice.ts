/**
 * @file mapSlice.ts
 * @description 맵 네비게이션 슬라이스
 */

import type { SliceCreator, MapSliceState, MapSliceActions } from './types';
import { applyNodeMoveEther } from '../../lib/relicEffects';
import { travelToNode } from '../battleHelpers';
import { MEMORY_GAIN_PER_NODE } from '../gameStoreHelpers';

export type MapSlice = MapSliceState & MapSliceActions;

export const createMapSlice: SliceCreator<MapSlice> = (set, get) => ({
  // 초기 상태
  map: {
    nodes: [],
    currentNodeId: '',
  },
  mapRisk: 50,

  // 액션
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
        activeBattle: result.battle ?? null,
        activeDungeon: null,
        activeRest: result.target?.type === 'rest' ? { nodeId: result.target.id } : null,
        activeShop: result.target?.type === 'shop' ? { nodeId: result.target.id, merchantType: 'shop' } : null,
        resources: updatedResources,
        // pendingNextEvent가 사용됐으면 초기화
        pendingNextEvent: result.usedPendingEvent ? null : state.pendingNextEvent,
        // 아이템 버프 초기화 (1노드 지속)
        itemBuffs: {},
      };
    }),

  setMapRisk: (value) =>
    set((state) => ({
      ...state,
      mapRisk: Math.max(20, Math.min(80, value)),
    })),
});
