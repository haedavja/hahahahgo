/**
 * @file dungeonSlice.test.ts
 * @description 던전 슬라이스 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createDungeonActions, type DungeonActionsSlice } from './dungeonSlice';
import type { DungeonSliceState, MapSliceState } from './types';

// 테스트용 초기 상태
const createInitialState = (): DungeonSliceState & MapSliceState & {
  activeBattle: null;
  activeEvent: null;
  pendingNextEvent: null;
  resources: { gold: number; intel: number; etherPts: number };
} => ({
  activeDungeon: null,
  map: { nodes: [], currentNodeId: '' },
  mapRisk: 50,
  activeBattle: null,
  activeEvent: null,
  pendingNextEvent: null,
  resources: { gold: 50, intel: 5, etherPts: 100 },
});

type TestStore = ReturnType<typeof createInitialState> & DungeonActionsSlice;

const createTestStore = () =>
  create<TestStore>((set, get, api) => ({
    ...createInitialState(),
    ...createDungeonActions(set as never, get as never, api as never),
  }));

describe('dungeonSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('초기 상태', () => {
    it('활성 던전이 없다', () => {
      expect(store.getState().activeDungeon).toBeNull();
    });
  });

  describe('confirmDungeon', () => {
    it('활성 던전이 없으면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().confirmDungeon();
      expect(store.getState()).toBe(originalState);
    });

    it('던전을 확정한다', () => {
      store.setState({ ...store.getState(), activeDungeon: { nodeId: 'dungeon-1', revealed: false, confirmed: false } });
      store.getState().confirmDungeon();
      expect(store.getState().activeDungeon?.confirmed).toBe(true);
    });
  });

  describe('enterDungeon', () => {
    it('활성 던전이 없으면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().enterDungeon();
      expect(store.getState()).toBe(originalState);
    });

    it('전투 중이면 상태를 유지한다', () => {
      store.setState({
        ...store.getState(),
        activeDungeon: { nodeId: 'dungeon-1', revealed: false, confirmed: true },
        activeBattle: {} as never,
      });
      const originalState = store.getState();
      store.getState().enterDungeon();
      expect(store.getState().activeDungeon).toBe(originalState.activeDungeon);
    });
  });

  describe('skipDungeon', () => {
    it('활성 던전이 없으면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().skipDungeon();
      expect(store.getState()).toBe(originalState);
    });

    it('던전을 건너뛰고 클리어한다', () => {
      const dungeonNode = { id: 'dungeon-1', type: 'dungeon', cleared: false, selectable: true, connections: ['next-1'] };
      const nextNode = { id: 'next-1', type: 'event', cleared: false, selectable: false, connections: [] };
      store.setState({
        ...store.getState(),
        activeDungeon: { nodeId: 'dungeon-1', revealed: false, confirmed: true },
        map: { nodes: [dungeonNode, nextNode] as never, currentNodeId: '' },
      });
      store.getState().skipDungeon();
      expect(store.getState().activeDungeon).toBeNull();
      expect(store.getState().map.nodes.find((n) => n.id === 'dungeon-1')?.cleared).toBe(true);
    });
  });

  describe('bypassDungeon', () => {
    it('활성 던전이 없으면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().bypassDungeon();
      expect(store.getState()).toBe(originalState);
    });
  });

  describe('completeDungeon', () => {
    it('활성 던전이 없으면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().completeDungeon();
      expect(store.getState()).toBe(originalState);
    });
  });

  describe('revealDungeonInfo', () => {
    it('활성 던전이 없으면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().revealDungeonInfo();
      expect(store.getState()).toBe(originalState);
    });

    it('이미 공개되었으면 상태를 유지한다', () => {
      store.setState({ ...store.getState(), activeDungeon: { nodeId: 'dungeon-1', revealed: true, confirmed: false } });
      const originalState = store.getState();
      store.getState().revealDungeonInfo();
      expect(store.getState()).toBe(originalState);
    });

    it('정보가 부족하면 상태를 유지한다', () => {
      store.setState({
        ...store.getState(),
        activeDungeon: { nodeId: 'dungeon-1', revealed: false, confirmed: false },
        resources: { ...store.getState().resources, intel: 0 },
      });
      const originalState = store.getState();
      store.getState().revealDungeonInfo();
      expect(store.getState()).toBe(originalState);
    });

    it('정보를 소모하고 던전 정보를 공개한다', () => {
      store.setState({
        ...store.getState(),
        activeDungeon: { nodeId: 'dungeon-1', revealed: false, confirmed: false },
        resources: { ...store.getState().resources, intel: 5 },
      });
      store.getState().revealDungeonInfo();
      expect(store.getState().activeDungeon?.revealed).toBe(true);
      expect(store.getState().resources.intel).toBe(3);
    });
  });

  describe('setDungeonData', () => {
    it('던전 데이터를 설정한다', () => {
      store.setState({ ...store.getState(), activeDungeon: { nodeId: 'dungeon-1', revealed: false, confirmed: true } });
      store.getState().setDungeonData({ nodes: [], currentNodeId: 'room-1', timeElapsed: 0 });
      expect(store.getState().activeDungeon?.dungeonData?.currentNodeId).toBe('room-1');
    });
  });

  describe('setDungeonPosition', () => {
    it('던전 위치를 설정한다', () => {
      store.setState({ ...store.getState(), activeDungeon: { nodeId: 'dungeon-1', revealed: false, confirmed: true } });
      store.getState().setDungeonPosition(2, 150);
      expect(store.getState().activeDungeon?.segmentIndex).toBe(2);
      expect(store.getState().activeDungeon?.playerX).toBe(150);
    });
  });

  describe('applyDungeonTimePenalty', () => {
    it('에테르를 감소시킨다', () => {
      store.getState().applyDungeonTimePenalty(30);
      expect(store.getState().resources.etherPts).toBe(70);
    });

    it('0 이하로 내려가지 않는다', () => {
      store.getState().applyDungeonTimePenalty(200);
      expect(store.getState().resources.etherPts).toBe(0);
    });

    it('0 이하의 페널티는 무시한다', () => {
      const originalState = store.getState();
      store.getState().applyDungeonTimePenalty(0);
      store.getState().applyDungeonTimePenalty(-10);
      expect(store.getState().resources.etherPts).toBe(originalState.resources.etherPts);
    });
  });
});
