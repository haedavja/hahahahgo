/**
 * @file mapSlice.test.ts
 * @description 맵 슬라이스 테스트
 *
 * 슬라이스는 액션만 제공하므로, 테스트 시 초기 상태를 직접 제공합니다.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import { createMapActions, type MapActionsSlice } from './mapSlice';
import type { MapSliceState } from './types';

// 모킹
vi.mock('../../lib/relicEffects', () => ({
  applyNodeMoveEther: vi.fn((relics, currentEther) => {
    // 황금 나침반이 있으면 에테르 +2
    if (relics.includes('golden_compass')) return 2;
    return 0;
  }),
}));

vi.mock('../battleHelpers', () => ({
  travelToNode: vi.fn((state, nodeId) => {
    const node = state.map.nodes.find((n: { id: string }) => n.id === nodeId);
    if (!node) return null;
    if (!node.selectable || node.cleared) return null;

    return {
      map: {
        ...state.map,
        currentNodeId: nodeId,
        nodes: state.map.nodes.map((n: { id: string; cleared: boolean }) =>
          n.id === nodeId ? { ...n, cleared: true } : n
        ),
      },
      event: node.type === 'event' ? { nodeId, eventId: 'test_event' } : null,
      battle: node.type === 'battle' ? { nodeId } : null,
      target: node,
      usedPendingEvent: false,
    };
  }),
}));

vi.mock('../gameStoreHelpers', () => ({
  MEMORY_GAIN_PER_NODE: 1,
}));

// 테스트용 초기 상태
const createInitialState = (): MapSliceState & {
  activeBattle: null;
  activeDungeon: null;
  activeEvent: null;
  activeRest: null;
  activeShop: null;
  resources: { gold: number; intel: number; loot: number; material: number; etherPts: number; memory: number };
  relics: string[];
  pendingNextEvent: null;
  itemBuffs: Record<string, number>;
} => ({
  map: { nodes: [], currentNodeId: '' },
  mapRisk: 50,
  activeBattle: null,
  activeDungeon: null,
  activeEvent: null,
  activeRest: null,
  activeShop: null,
  resources: { gold: 50, intel: 0, loot: 0, material: 0, etherPts: 0, memory: 0 },
  relics: [],
  pendingNextEvent: null,
  itemBuffs: {},
});

// 테스트용 스토어 타입
type TestStore = ReturnType<typeof createInitialState> & MapActionsSlice;

// 테스트용 스토어 생성 (초기 상태 + 액션)
const createTestStore = () =>
  create<TestStore>((set, get, api) => ({
    ...createInitialState(),
    ...createMapActions(set as never, get as never, api as never),
  }));

describe('mapSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('초기 상태', () => {
    it('빈 맵 노드 배열로 시작한다', () => {
      expect(store.getState().map.nodes).toEqual([]);
    });

    it('현재 노드 ID가 비어있다', () => {
      expect(store.getState().map.currentNodeId).toBe('');
    });

    it('맵 위험도가 50이다', () => {
      expect(store.getState().mapRisk).toBe(50);
    });
  });

  describe('setMapRisk', () => {
    it('위험도를 설정한다', () => {
      store.getState().setMapRisk(65);
      expect(store.getState().mapRisk).toBe(65);
    });

    it('최소값은 20이다', () => {
      store.getState().setMapRisk(10);
      expect(store.getState().mapRisk).toBe(20);
    });

    it('최대값은 80이다', () => {
      store.getState().setMapRisk(100);
      expect(store.getState().mapRisk).toBe(80);
    });
  });

  describe('selectNode', () => {
    it('전투 중에는 노드를 선택할 수 없다', () => {
      store.setState({ ...store.getState(), activeBattle: {} as unknown as TestStore['activeBattle'] });
      const originalMap = store.getState().map;
      store.getState().selectNode('test-node');
      expect(store.getState().map).toBe(originalMap);
    });

    it('존재하지 않는 노드는 무시한다', () => {
      const originalState = store.getState();
      store.getState().selectNode('non-existent-node');
      expect(store.getState().map).toBe(originalState.map);
    });

    it('선택 불가능한 노드는 무시한다', () => {
      const node = { id: 'node1', type: 'battle', selectable: false, cleared: false, layer: 1, connections: [] };
      store.setState({
        ...store.getState(),
        map: { nodes: [node], currentNodeId: 'start' },
      });
      const originalState = store.getState();
      store.getState().selectNode('node1');
      expect(store.getState().map).toBe(originalState.map);
    });

    it('이미 클리어한 노드는 무시한다', () => {
      const node = { id: 'node1', type: 'battle', selectable: true, cleared: true, layer: 1, connections: [] };
      store.setState({
        ...store.getState(),
        map: { nodes: [node], currentNodeId: 'start' },
      });
      const originalState = store.getState();
      store.getState().selectNode('node1');
      expect(store.getState().map).toBe(originalState.map);
    });

    it('던전 노드를 선택하면 activeDungeon을 설정한다', () => {
      const node = { id: 'dungeon1', type: 'dungeon', selectable: true, cleared: false, layer: 1, connections: [] };
      store.setState({
        ...store.getState(),
        map: { nodes: [node], currentNodeId: 'start' },
      });
      store.getState().selectNode('dungeon1');
      expect(store.getState().activeDungeon).toEqual({
        nodeId: 'dungeon1',
        revealed: false,
        confirmed: false,
      });
    });

    it('전투 노드를 선택하면 activeBattle을 설정한다', () => {
      const node = { id: 'battle1', type: 'battle', selectable: true, cleared: false, layer: 1, connections: [] };
      store.setState({
        ...store.getState(),
        map: { nodes: [node], currentNodeId: 'start' },
      });
      store.getState().selectNode('battle1');
      expect(store.getState().activeBattle).not.toBeNull();
    });

    it('이벤트 노드를 선택하면 activeEvent를 설정한다', () => {
      const node = { id: 'event1', type: 'event', selectable: true, cleared: false, layer: 1, connections: [] };
      store.setState({
        ...store.getState(),
        map: { nodes: [node], currentNodeId: 'start' },
      });
      store.getState().selectNode('event1');
      expect(store.getState().activeEvent).not.toBeNull();
    });

    it('휴식 노드를 선택하면 activeRest를 설정한다', () => {
      const node = { id: 'rest1', type: 'rest', selectable: true, cleared: false, layer: 1, connections: [] };
      store.setState({
        ...store.getState(),
        map: { nodes: [node], currentNodeId: 'start' },
      });
      store.getState().selectNode('rest1');
      expect(store.getState().activeRest).toEqual({ nodeId: 'rest1' });
    });

    it('상점 노드를 선택하면 activeShop을 설정한다', () => {
      const node = { id: 'shop1', type: 'shop', selectable: true, cleared: false, layer: 1, connections: [] };
      store.setState({
        ...store.getState(),
        map: { nodes: [node], currentNodeId: 'start' },
      });
      store.getState().selectNode('shop1');
      expect(store.getState().activeShop).toEqual({
        nodeId: 'shop1',
        merchantType: 'shop',
      });
    });

    it('노드 이동 시 기억을 획득한다', () => {
      const node = { id: 'battle1', type: 'battle', selectable: true, cleared: false, layer: 1, connections: [] };
      store.setState({
        ...store.getState(),
        map: { nodes: [node], currentNodeId: 'start' },
        resources: { gold: 50, intel: 0, loot: 0, material: 0, etherPts: 0, memory: 0 },
      });
      store.getState().selectNode('battle1');
      expect(store.getState().resources.memory).toBe(1);
    });

    it('황금 나침반 상징이 있으면 노드 이동 시 에테르를 획득한다', () => {
      const node = { id: 'battle1', type: 'battle', selectable: true, cleared: false, layer: 1, connections: [] };
      store.setState({
        ...store.getState(),
        map: { nodes: [node], currentNodeId: 'start' },
        resources: { gold: 50, intel: 0, loot: 0, material: 0, etherPts: 5, memory: 0 },
        relics: ['golden_compass'],
      });
      store.getState().selectNode('battle1');
      expect(store.getState().resources.etherPts).toBe(7); // 5 + 2
    });

    it('노드 이동 시 itemBuffs를 초기화한다', () => {
      const node = { id: 'battle1', type: 'battle', selectable: true, cleared: false, layer: 1, connections: [] };
      store.setState({
        ...store.getState(),
        map: { nodes: [node], currentNodeId: 'start' },
        itemBuffs: { attack: 5, defense: 3 },
      });
      store.getState().selectNode('battle1');
      expect(store.getState().itemBuffs).toEqual({});
    });

    it('노드 이동 후 현재 노드 ID가 업데이트된다', () => {
      const node = { id: 'battle1', type: 'battle', selectable: true, cleared: false, layer: 1, connections: [] };
      store.setState({
        ...store.getState(),
        map: { nodes: [node], currentNodeId: 'start' },
      });
      store.getState().selectNode('battle1');
      expect(store.getState().map.currentNodeId).toBe('battle1');
    });

    it('노드 이동 후 해당 노드가 클리어 상태가 된다', () => {
      const node = { id: 'battle1', type: 'battle', selectable: true, cleared: false, layer: 1, connections: [] };
      store.setState({
        ...store.getState(),
        map: { nodes: [node], currentNodeId: 'start' },
      });
      store.getState().selectNode('battle1');
      const clearedNode = store.getState().map.nodes.find(n => n.id === 'battle1');
      expect(clearedNode?.cleared).toBe(true);
    });
  });

  describe('setMapRisk 경계값 테스트', () => {
    it('정확히 20일 때 그대로 유지', () => {
      store.getState().setMapRisk(20);
      expect(store.getState().mapRisk).toBe(20);
    });

    it('정확히 80일 때 그대로 유지', () => {
      store.getState().setMapRisk(80);
      expect(store.getState().mapRisk).toBe(80);
    });

    it('음수 값은 20으로 제한', () => {
      store.getState().setMapRisk(-10);
      expect(store.getState().mapRisk).toBe(20);
    });
  });
});
