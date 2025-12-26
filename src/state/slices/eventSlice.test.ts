/**
 * @file eventSlice.test.ts
 * @description 이벤트 슬라이스 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createEventActions, type EventActionsSlice } from './eventSlice';
import type { EventSliceState } from './types';

// 테스트용 초기 상태
const createInitialState = (): EventSliceState & {
  resources: { gold: number; intel: number; etherPts: number };
  playerHp: number;
  maxHp: number;
  playerInsight: number;
  playerStrength: number;
  playerAgility: number;
  characterBuild: { ownedCards: string[] };
  activeShop: null;
} => ({
  activeEvent: null,
  completedEvents: [],
  pendingNextEvent: null,
  resources: { gold: 50, intel: 0, etherPts: 100 },
  playerHp: 100,
  maxHp: 100,
  playerInsight: 0,
  playerStrength: 0,
  playerAgility: 0,
  characterBuild: { ownedCards: [] },
  activeShop: null,
});

type TestStore = ReturnType<typeof createInitialState> & EventActionsSlice;

const createTestStore = () =>
  create<TestStore>((set, get, api) => ({
    ...createInitialState(),
    ...createEventActions(set as never, get as never, api as never),
  }));

describe('eventSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('초기 상태', () => {
    it('활성 이벤트가 없다', () => {
      expect(store.getState().activeEvent).toBeNull();
    });

    it('완료된 이벤트가 없다', () => {
      expect(store.getState().completedEvents).toEqual([]);
    });

    it('대기 이벤트가 없다', () => {
      expect(store.getState().pendingNextEvent).toBeNull();
    });
  });

  describe('closeEvent', () => {
    it('이벤트를 닫는다', () => {
      store.setState({
        ...store.getState(),
        activeEvent: { definition: { id: 'test', choices: [] }, currentStage: null, resolved: false, outcome: null },
      });
      store.getState().closeEvent();
      expect(store.getState().activeEvent).toBeNull();
    });

    it('이벤트가 없으면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().closeEvent();
      expect(store.getState()).toBe(originalState);
    });
  });

  describe('setActiveEvent', () => {
    it('이벤트를 설정한다', () => {
      const event = { definition: { id: 'test', choices: [] }, currentStage: null, resolved: false, outcome: null };
      store.getState().setActiveEvent(event as never);
      expect(store.getState().activeEvent).toEqual(event);
    });

    it('null로 설정할 수 있다', () => {
      store.setState({
        ...store.getState(),
        activeEvent: { definition: { id: 'test', choices: [] }, currentStage: null, resolved: false, outcome: null },
      });
      store.getState().setActiveEvent(null);
      expect(store.getState().activeEvent).toBeNull();
    });
  });

  describe('chooseEvent', () => {
    it('활성 이벤트가 없으면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().chooseEvent('choice1');
      expect(store.getState()).toBe(originalState);
    });

    it('이미 해결된 이벤트는 상태를 유지한다', () => {
      store.setState({
        ...store.getState(),
        activeEvent: {
          definition: { id: 'test', choices: [{ id: 'choice1', label: 'Test' }] },
          currentStage: null,
          resolved: true,
          outcome: null,
        },
      });
      const originalState = store.getState();
      store.getState().chooseEvent('choice1');
      expect(store.getState()).toBe(originalState);
    });
  });

  describe('invokePrayer', () => {
    it('에테르가 부족하면 상태를 유지한다', () => {
      store.setState({
        ...store.getState(),
        activeEvent: { definition: { id: 'test', choices: [] }, currentStage: null, resolved: false, outcome: null },
        resources: { ...store.getState().resources, etherPts: 0 },
      });
      const originalState = store.getState();
      store.getState().invokePrayer(50);
      expect(store.getState()).toBe(originalState);
    });

    it('활성 이벤트가 없으면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().invokePrayer(50);
      expect(store.getState()).toBe(originalState);
    });
  });
});
