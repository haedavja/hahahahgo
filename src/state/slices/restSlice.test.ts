/**
 * @file restSlice.test.ts
 * @description 휴식 슬라이스 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createRestActions, type RestActionsSlice } from './restSlice';
import type { RestSliceState, PlayerSliceState } from './types';

// 테스트용 초기 상태
const createInitialState = (): RestSliceState & Partial<PlayerSliceState> => ({
  activeRest: null,
  playerHp: 100,
  maxHp: 100,
  playerStrength: 0,
  playerInsight: 0,
  playerTraits: [],
  playerEgos: [],
  playerMaxSpeedBonus: 0,
  playerEnergyBonus: 0,
  extraSubSpecialSlots: 0,
  resources: { gold: 50, intel: 0, loot: 0, material: 0, etherPts: 0, memory: 100 },
});

type TestStore = ReturnType<typeof createInitialState> & RestActionsSlice;

const createTestStore = () =>
  create<TestStore>((set, get, api) => ({
    ...createInitialState(),
    ...createRestActions(set as never, get as never, api as never),
  }));

describe('restSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('초기 상태', () => {
    it('휴식이 비활성화 상태다', () => {
      expect(store.getState().activeRest).toBeNull();
    });
  });

  describe('closeRest', () => {
    it('휴식을 닫는다', () => {
      store.setState({ ...store.getState(), activeRest: { nodeId: 'test' } });
      store.getState().closeRest();
      expect(store.getState().activeRest).toBeNull();
    });
  });

  describe('healAtRest', () => {
    it('체력을 회복한다', () => {
      store.setState({ ...store.getState(), playerHp: 50 });
      store.getState().healAtRest(30);
      expect(store.getState().playerHp).toBe(80);
    });

    it('최대 체력을 초과하지 않는다', () => {
      store.setState({ ...store.getState(), playerHp: 90 });
      store.getState().healAtRest(50);
      expect(store.getState().playerHp).toBe(100);
    });

    it('이미 최대 체력이면 변경 없음', () => {
      const originalState = store.getState();
      store.getState().healAtRest(10);
      expect(store.getState().playerHp).toBe(originalState.playerHp);
    });
  });

  describe('awakenAtRest', () => {
    it('기억이 부족하면 각성하지 않는다', () => {
      store.setState({ ...store.getState(), activeRest: { nodeId: 'test' }, resources: { ...store.getState().resources, memory: 0 } });
      const originalStrength = store.getState().playerStrength;
      store.getState().awakenAtRest('brave');
      expect(store.getState().playerStrength).toBe(originalStrength);
    });

    it('activeRest가 없으면 각성하지 않는다', () => {
      const originalState = store.getState();
      store.getState().awakenAtRest('brave');
      expect(store.getState().playerTraits).toEqual(originalState.playerTraits);
    });
  });

  describe('formEgo', () => {
    it('5개 미만의 개성으로는 자아를 형성하지 않는다', () => {
      store.setState({ ...store.getState(), playerTraits: ['용맹함', '굳건함', '냉철함'] });
      store.getState().formEgo(['용맹함', '굳건함']);
      expect(store.getState().playerEgos).toEqual([]);
    });

    it('보유하지 않은 개성으로는 자아를 형성하지 않는다', () => {
      store.setState({ ...store.getState(), playerTraits: ['용맹함', '굳건함'] });
      store.getState().formEgo(['용맹함', '굳건함', '냉철함', '철저함', '열정적']);
      expect(store.getState().playerEgos).toEqual([]);
    });
  });
});
