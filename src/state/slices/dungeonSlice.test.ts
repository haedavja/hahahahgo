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
      const dungeonNode = { id: 'dungeon-1', type: 'dungeon', cleared: false, selectable: true, connections: ['next-1'] as string[] };
      const nextNode = { id: 'next-1', type: 'event', cleared: false, selectable: false, connections: [] as string[] };
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

  describe('setCurrentRoomKey', () => {
    it('활성 던전이 없으면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().setCurrentRoomKey('room-1');
      expect(store.getState()).toBe(originalState);
    });

    it('현재 방 키를 설정한다', () => {
      store.setState({ ...store.getState(), activeDungeon: { nodeId: 'dungeon-1', revealed: false, confirmed: true } });
      store.getState().setCurrentRoomKey('room-5');
      expect(store.getState().activeDungeon?.currentRoomKey).toBe('room-5');
    });
  });

  describe('updateMazeRoom', () => {
    it('활성 던전이 없으면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().updateMazeRoom('room-1', { visited: true });
      expect(store.getState()).toBe(originalState);
    });

    it('던전 데이터가 없으면 상태를 유지한다', () => {
      store.setState({ ...store.getState(), activeDungeon: { nodeId: 'dungeon-1', revealed: false, confirmed: true } });
      const originalState = store.getState();
      store.getState().updateMazeRoom('room-1', { visited: true });
      expect(store.getState()).toBe(originalState);
    });

    it('그리드가 없으면 상태를 유지한다', () => {
      store.setState({
        ...store.getState(),
        activeDungeon: {
          nodeId: 'dungeon-1',
          revealed: false,
          confirmed: true,
          dungeonData: { nodes: [], currentNodeId: 'room-1' }
        }
      });
      const originalState = store.getState();
      store.getState().updateMazeRoom('room-1', { visited: true });
      expect(store.getState()).toBe(originalState);
    });

    it('방 정보를 업데이트한다', () => {
      store.setState({
        ...store.getState(),
        activeDungeon: {
          nodeId: 'dungeon-1',
          revealed: false,
          confirmed: true,
          dungeonData: {
            nodes: [],
            currentNodeId: 'room-1',
            grid: { 'room-1': { visited: false, cleared: false } }
          }
        }
      });
      store.getState().updateMazeRoom('room-1', { visited: true });
      expect((store.getState().activeDungeon?.dungeonData as any)?.grid?.['room-1']?.visited).toBe(true);
    });
  });

  describe('setDungeonInitialResources', () => {
    it('활성 던전이 없으면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().setDungeonInitialResources({ gold: 100, intel: 5 });
      expect(store.getState()).toBe(originalState);
    });

    it('초기 자원을 설정한다', () => {
      store.setState({ ...store.getState(), activeDungeon: { nodeId: 'dungeon-1', revealed: false, confirmed: true } });
      store.getState().setDungeonInitialResources({ gold: 200, intel: 10 });
      expect((store.getState().activeDungeon as any)?.initialResources?.gold).toBe(200);
      expect((store.getState().activeDungeon as any)?.initialResources?.intel).toBe(10);
    });
  });

  describe('setDungeonDeltas', () => {
    it('활성 던전이 없으면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().setDungeonDeltas({ gold: 50 });
      expect(store.getState()).toBe(originalState);
    });

    it('자원 변화량을 설정한다', () => {
      store.setState({ ...store.getState(), activeDungeon: { nodeId: 'dungeon-1', revealed: false, confirmed: true } });
      store.getState().setDungeonDeltas({ gold: -20, intel: 3 });
      expect((store.getState().activeDungeon as any)?.dungeonDeltas?.gold).toBe(-20);
      expect((store.getState().activeDungeon as any)?.dungeonDeltas?.intel).toBe(3);
    });
  });

  describe('navigateDungeonNode', () => {
    it('활성 던전이 없으면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().navigateDungeonNode('node-2');
      expect(store.getState()).toBe(originalState);
    });

    it('던전 데이터가 없으면 상태를 유지한다', () => {
      store.setState({ ...store.getState(), activeDungeon: { nodeId: 'dungeon-1', revealed: false, confirmed: true } });
      const originalState = store.getState();
      store.getState().navigateDungeonNode('node-2');
      expect(store.getState()).toBe(originalState);
    });

    it('연결되지 않은 노드로는 이동할 수 없다', () => {
      store.setState({
        ...store.getState(),
        activeDungeon: {
          nodeId: 'dungeon-1',
          revealed: false,
          confirmed: true,
          dungeonData: {
            nodes: [
              { id: 'node-1', connections: ['node-2'] },
              { id: 'node-2', connections: [] },
              { id: 'node-3', connections: [] }
            ],
            currentNodeId: 'node-1'
          }
        }
      });
      const originalState = store.getState();
      store.getState().navigateDungeonNode('node-3');
      expect((store.getState().activeDungeon?.dungeonData as any)?.currentNodeId).toBe('node-1');
    });

    it('연결된 노드로 이동하고 시간이 증가한다', () => {
      store.setState({
        ...store.getState(),
        activeDungeon: {
          nodeId: 'dungeon-1',
          revealed: false,
          confirmed: true,
          dungeonData: {
            nodes: [
              { id: 'node-1', connections: ['node-2'] },
              { id: 'node-2', connections: [] }
            ],
            currentNodeId: 'node-1',
            timeElapsed: 0
          }
        }
      });
      store.getState().navigateDungeonNode('node-2');
      expect((store.getState().activeDungeon?.dungeonData as any)?.currentNodeId).toBe('node-2');
      expect((store.getState().activeDungeon?.dungeonData as any)?.timeElapsed).toBe(1);
    });
  });

  describe('clearDungeonNode', () => {
    it('활성 던전이 없으면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().clearDungeonNode('node-1');
      expect(store.getState()).toBe(originalState);
    });

    it('던전 데이터가 없으면 상태를 유지한다', () => {
      store.setState({ ...store.getState(), activeDungeon: { nodeId: 'dungeon-1', revealed: false, confirmed: true } });
      const originalState = store.getState();
      store.getState().clearDungeonNode('node-1');
      expect(store.getState()).toBe(originalState);
    });

    it('노드를 클리어하고 이벤트를 제거한다', () => {
      store.setState({
        ...store.getState(),
        activeDungeon: {
          nodeId: 'dungeon-1',
          revealed: false,
          confirmed: true,
          dungeonData: {
            nodes: [
              { id: 'node-1', cleared: false, event: { type: 'combat' } }
            ],
            currentNodeId: 'node-1'
          }
        }
      });
      store.getState().clearDungeonNode('node-1');
      const node = (store.getState().activeDungeon?.dungeonData as any)?.nodes?.find((n: any) => n.id === 'node-1');
      expect(node?.cleared).toBe(true);
      expect(node?.event).toBeNull();
    });
  });

  describe('bypassDungeon 노드 처리', () => {
    it('노드가 없으면 activeDungeon만 null로 설정한다', () => {
      store.setState({
        ...store.getState(),
        activeDungeon: { nodeId: 'nonexistent', revealed: false, confirmed: true },
        map: { nodes: [] as never, currentNodeId: '' },
      });
      store.getState().bypassDungeon();
      expect(store.getState().activeDungeon).toBeNull();
    });

    it('던전을 우회하고 다음 노드를 활성화한다', () => {
      const dungeonNode = { id: 'dungeon-1', type: 'dungeon', cleared: false, selectable: true, connections: ['next-1'] as string[] };
      const nextNode = { id: 'next-1', type: 'event', cleared: false, selectable: false, connections: [] as string[] };
      store.setState({
        ...store.getState(),
        activeDungeon: { nodeId: 'dungeon-1', revealed: false, confirmed: true },
        map: { nodes: [dungeonNode, nextNode] as never, currentNodeId: '' },
      });
      store.getState().bypassDungeon();
      expect(store.getState().activeDungeon).toBeNull();
      expect(store.getState().map.nodes.find((n) => n.id === 'dungeon-1')?.cleared).toBe(true);
      expect(store.getState().map.nodes.find((n) => n.id === 'next-1')?.selectable).toBe(true);
    });
  });

  describe('completeDungeon 노드 처리', () => {
    it('노드가 없으면 activeDungeon만 null로 설정한다', () => {
      store.setState({
        ...store.getState(),
        activeDungeon: { nodeId: 'nonexistent', revealed: false, confirmed: true },
        map: { nodes: [] as never, currentNodeId: '' },
      });
      store.getState().completeDungeon();
      expect(store.getState().activeDungeon).toBeNull();
    });

    it('던전을 완료하고 다음 노드를 활성화한다', () => {
      const dungeonNode = { id: 'dungeon-1', type: 'dungeon', cleared: false, selectable: true, connections: ['next-1'] as string[] };
      const nextNode = { id: 'next-1', type: 'event', cleared: false, selectable: false, connections: [] as string[] };
      store.setState({
        ...store.getState(),
        activeDungeon: { nodeId: 'dungeon-1', revealed: false, confirmed: true },
        map: { nodes: [dungeonNode, nextNode] as never, currentNodeId: '' },
      });
      store.getState().completeDungeon();
      expect(store.getState().activeDungeon).toBeNull();
      expect(store.getState().map.nodes.find((n) => n.id === 'dungeon-1')?.cleared).toBe(true);
      expect(store.getState().map.nodes.find((n) => n.id === 'next-1')?.selectable).toBe(true);
    });
  });
});
