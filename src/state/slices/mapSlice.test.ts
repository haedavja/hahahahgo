/**
 * @file mapSlice.test.ts
 * @description 맵 슬라이스 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createMapSlice, type MapSlice } from './mapSlice';

// 맵 슬라이스 테스트용 확장 스토어 타입
interface TestStore extends MapSlice {
  activeBattle: null;
  activeDungeon: null;
  activeEvent: null;
  activeRest: null;
  activeShop: null;
  resources: { gold: number; intel: number; loot: number; material: number; etherPts: number; memory: number };
  relics: string[];
  pendingNextEvent: null;
  itemBuffs: Record<string, number>;
}

// 테스트용 스토어 생성
const createTestStore = () =>
  create<TestStore>((set, get, api) => ({
    ...createMapSlice(set, get, api),
    activeBattle: null,
    activeDungeon: null,
    activeEvent: null,
    activeRest: null,
    activeShop: null,
    resources: { gold: 50, intel: 0, loot: 0, material: 0, etherPts: 0, memory: 0 },
    relics: [],
    pendingNextEvent: null,
    itemBuffs: {},
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
      store.setState({ ...store.getState(), activeBattle: {} as TestStore['activeBattle'] });
      const originalMap = store.getState().map;
      store.getState().selectNode('test-node');
      expect(store.getState().map).toBe(originalMap);
    });

    it('존재하지 않는 노드는 무시한다', () => {
      const originalState = store.getState();
      store.getState().selectNode('non-existent-node');
      expect(store.getState().map).toBe(originalState.map);
    });
  });
});
