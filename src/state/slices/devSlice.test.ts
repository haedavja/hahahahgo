/**
 * @file devSlice.test.ts
 * @description 개발자 슬라이스 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createDevActions, type DevActionsSlice } from './devSlice';
import type { DevSliceState, MapSliceState, BattleSliceState, EventSliceState, PlayerSliceState, BuildSliceState, RestSliceState } from './types';

// 테스트용 초기 상태
const createInitialState = (): DevSliceState &
  MapSliceState &
  Partial<BattleSliceState> &
  Partial<EventSliceState> &
  Partial<PlayerSliceState> &
  Partial<BuildSliceState> &
  Partial<RestSliceState> => ({
  devDulledLevel: null,
  devForcedCrossroad: null,
  devForcedAnomalies: null,
  devBattleTokens: [],
  map: { nodes: [], currentNodeId: '' },
  mapRisk: 50,
  activeBattle: null,
  lastBattleResult: null,
  activeEvent: null,
  completedEvents: [],
  pendingNextEvent: null,
  playerHp: 100,
  maxHp: 100,
  resources: { gold: 50, intel: 0, loot: 0, material: 0, etherPts: 0, memory: 0 },
  characterBuild: { mainSpecials: [], subSpecials: [], cards: [], traits: [], egos: [], ownedCards: [] },
  activeRest: null,
});

type TestStore = ReturnType<typeof createInitialState> & DevActionsSlice;

const createTestStore = () =>
  create<TestStore>((set, get, api) => ({
    ...createInitialState(),
    ...createDevActions(set as never, get as never, api as never),
  }));

describe('devSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('초기 상태', () => {
    it('개발자 도구 레벨이 null이다', () => {
      expect(store.getState().devDulledLevel).toBeNull();
    });

    it('강제 기로가 null이다', () => {
      expect(store.getState().devForcedCrossroad).toBeNull();
    });

    it('전투 토큰이 비어있다', () => {
      expect(store.getState().devBattleTokens).toEqual([]);
    });
  });

  describe('setDevDulledLevel', () => {
    it('레벨을 설정한다', () => {
      store.getState().setDevDulledLevel(2);
      expect(store.getState().devDulledLevel).toBe(2);
    });

    it('최소값은 0이다', () => {
      store.getState().setDevDulledLevel(-5);
      expect(store.getState().devDulledLevel).toBe(0);
    });

    it('최대값은 3이다', () => {
      store.getState().setDevDulledLevel(10);
      expect(store.getState().devDulledLevel).toBe(3);
    });

    it('null로 설정할 수 있다', () => {
      store.getState().setDevDulledLevel(2);
      store.getState().setDevDulledLevel(null);
      expect(store.getState().devDulledLevel).toBeNull();
    });
  });

  describe('setDevForcedCrossroad', () => {
    it('기로 ID를 설정한다', () => {
      store.getState().setDevForcedCrossroad('cliff');
      expect(store.getState().devForcedCrossroad).toBe('cliff');
    });

    it('null로 초기화할 수 있다', () => {
      store.getState().setDevForcedCrossroad('cliff');
      store.getState().setDevForcedCrossroad(null);
      expect(store.getState().devForcedCrossroad).toBeNull();
    });

    it('빈 문자열은 null이 된다', () => {
      store.getState().setDevForcedCrossroad('');
      expect(store.getState().devForcedCrossroad).toBeNull();
    });
  });

  describe('setResources', () => {
    it('자원을 설정한다', () => {
      store.getState().setResources({ gold: 100, intel: 10 });
      expect(store.getState().resources!.gold).toBe(100);
      expect(store.getState().resources!.intel).toBe(10);
    });

    it('일부 자원만 업데이트할 수 있다', () => {
      store.getState().setResources({ gold: 200 });
      expect(store.getState().resources!.gold).toBe(200);
      expect(store.getState().resources!.intel).toBe(0); // 기존 값 유지
    });
  });

  describe('devClearAllNodes', () => {
    it('모든 노드를 클리어한다', () => {
      const nodes = [
        { id: 'node-1', cleared: false, selectable: false, connections: [] as string[] },
        { id: 'node-2', cleared: false, selectable: true, connections: [] as string[] },
      ];
      store.setState({ ...store.getState(), map: { nodes: nodes as never, currentNodeId: '' } });
      store.getState().devClearAllNodes();
      expect(store.getState().map.nodes.every((n) => n.cleared && n.selectable)).toBe(true);
    });
  });

  describe('devForceWin', () => {
    it('전투가 없으면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().devForceWin();
      expect(store.getState()).toBe(originalState);
    });

    it('전투를 승리로 종료한다', () => {
      store.setState({
        ...store.getState(),
        activeBattle: { nodeId: 'test', kind: 'combat', label: 'Test', rewards: { gold: 10 } } as never,
      });
      store.getState().devForceWin();
      expect(store.getState().activeBattle).toBeNull();
      expect(store.getState().lastBattleResult?.result).toBe('victory');
    });
  });

  describe('devForceLose', () => {
    it('전투가 없으면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().devForceLose();
      expect(store.getState()).toBe(originalState);
    });

    it('전투를 패배로 종료한다', () => {
      store.setState({
        ...store.getState(),
        activeBattle: { nodeId: 'test', kind: 'combat', label: 'Test' } as never,
      });
      store.getState().devForceLose();
      expect(store.getState().activeBattle).toBeNull();
      expect(store.getState().lastBattleResult?.result).toBe('defeat');
    });
  });

  describe('devAddBattleToken', () => {
    it('토큰을 추가한다', () => {
      store.getState().devAddBattleToken('poison', 3, 'player');
      expect(store.getState().devBattleTokens).toHaveLength(1);
      expect(store.getState().devBattleTokens[0].id).toBe('poison');
      expect(store.getState().devBattleTokens[0].stacks).toBe(3);
    });

    it('기본값으로 추가할 수 있다', () => {
      store.getState().devAddBattleToken('burn');
      expect(store.getState().devBattleTokens[0].stacks).toBe(1);
      expect(store.getState().devBattleTokens[0].target).toBe('player');
    });
  });

  describe('devClearBattleTokens', () => {
    it('모든 토큰을 제거한다', () => {
      store.getState().devAddBattleToken('poison');
      store.getState().devAddBattleToken('burn');
      store.getState().devClearBattleTokens();
      expect(store.getState().devBattleTokens).toEqual([]);
    });
  });

  describe('devOpenRest', () => {
    it('휴식을 연다', () => {
      store.getState().devOpenRest();
      expect(store.getState().activeRest).toEqual({ nodeId: 'DEV-REST' });
    });
  });

  describe('setDevForcedAnomalies', () => {
    it('이변 ID 배열을 설정한다', () => {
      store.getState().setDevForcedAnomalies(['ether_void', 'time_warp']);
      expect(store.getState().devForcedAnomalies).toEqual(['ether_void', 'time_warp']);
    });

    it('null로 초기화할 수 있다', () => {
      store.getState().setDevForcedAnomalies(['ether_void']);
      store.getState().setDevForcedAnomalies(null);
      expect(store.getState().devForcedAnomalies).toBeNull();
    });

    it('빈 배열도 설정할 수 있다', () => {
      store.getState().setDevForcedAnomalies([]);
      expect(store.getState().devForcedAnomalies).toEqual([]);
    });
  });

  describe('devTeleportToNode', () => {
    it('노드가 없으면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().devTeleportToNode('nonexistent');
      expect(store.getState().map.currentNodeId).toBe(originalState.map.currentNodeId);
    });

    it('던전 노드로 텔레포트하면 activeDungeon이 설정된다', () => {
      const nodes = [
        { id: 'dungeon-1', type: 'dungeon', cleared: false, selectable: true, connections: [] as string[] },
      ];
      store.setState({ ...store.getState(), map: { nodes: nodes as never, currentNodeId: '' } });
      store.getState().devTeleportToNode('dungeon-1');
      expect((store.getState() as any).activeDungeon?.nodeId).toBe('dungeon-1');
    });

    it('상점 노드로 텔레포트하면 activeShop이 설정된다', () => {
      const nodes = [
        { id: 'shop-1', type: 'shop', cleared: false, selectable: true, connections: [] as string[] },
      ];
      store.setState({ ...store.getState(), map: { nodes: nodes as never, currentNodeId: '' } });
      store.getState().devTeleportToNode('shop-1');
      expect((store.getState() as any).activeShop?.nodeId).toBe('shop-1');
      expect(store.getState().map.currentNodeId).toBe('shop-1');
    });

    it('휴식 노드로 텔레포트하면 activeRest가 설정된다', () => {
      const nodes = [
        { id: 'rest-1', type: 'rest', cleared: false, selectable: true, connections: [] as string[] },
      ];
      store.setState({ ...store.getState(), map: { nodes: nodes as never, currentNodeId: '' } });
      store.getState().devTeleportToNode('rest-1');
      expect(store.getState().activeRest?.nodeId).toBe('rest-1');
      expect(store.getState().map.currentNodeId).toBe('rest-1');
    });
  });

  describe('devStartBattle', () => {
    it('이미 전투 중이면 상태를 유지한다', () => {
      store.setState({
        ...store.getState(),
        activeBattle: { nodeId: 'test', kind: 'combat', label: 'Test' } as never,
      });
      const originalBattle = store.getState().activeBattle;
      store.getState().devStartBattle('nonexistent');
      expect(store.getState().activeBattle).toBe(originalBattle);
    });

    it('존재하지 않는 그룹이면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().devStartBattle('nonexistent-group');
      expect(store.getState().activeBattle).toBe(originalState.activeBattle);
    });
  });

  describe('devTriggerEvent', () => {
    it('존재하지 않는 이벤트면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().devTriggerEvent('nonexistent-event');
      expect(store.getState().activeEvent).toBe(originalState.activeEvent);
    });
  });

  describe('devForceWin 보상 처리', () => {
    it('보상이 있으면 자원에 추가된다', () => {
      const initialGold = store.getState().resources!.gold;
      store.setState({
        ...store.getState(),
        activeBattle: { nodeId: 'test', kind: 'combat', label: 'Test', rewards: { gold: 50 } } as never,
      });
      store.getState().devForceWin();
      expect(store.getState().resources!.gold).toBeGreaterThanOrEqual(initialGold);
      expect(store.getState().lastBattleResult?.rewards).toBeDefined();
    });
  });

  describe('devAddBattleToken 타겟', () => {
    it('적에게 토큰을 추가할 수 있다', () => {
      store.getState().devAddBattleToken('vulnerable', 2, 'enemy');
      expect(store.getState().devBattleTokens[0].target).toBe('enemy');
    });

    it('여러 토큰을 추가할 수 있다', () => {
      store.getState().devAddBattleToken('poison', 1, 'player');
      store.getState().devAddBattleToken('burn', 2, 'enemy');
      store.getState().devAddBattleToken('strength', 3, 'player');
      expect(store.getState().devBattleTokens).toHaveLength(3);
    });
  });
});
