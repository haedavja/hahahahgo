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

type TestStore = ReturnType<typeof createInitialState> & RestActionsSlice & {
  updatePyramidLevel: () => void;
};

const createTestStore = () =>
  create<TestStore>((set, get, api) => ({
    ...createInitialState(),
    ...createRestActions(set as never, get as never, api as never),
    // 피라미드 레벨 업데이트 모킹 (새 성장 시스템)
    updatePyramidLevel: () => {},
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
      store.setState({ ...store.getState(), activeRest: { nodeId: 'test' }, resources: { ...store.getState().resources, memory: 0 } as any });
      const originalStrength = store.getState().playerStrength;
      store.getState().awakenAtRest('brave');
      expect(store.getState().playerStrength).toBe(originalStrength);
    });

    it('activeRest가 없으면 각성하지 않는다', () => {
      const originalState = store.getState();
      store.getState().awakenAtRest('brave');
      expect(store.getState().playerTraits).toEqual(originalState.playerTraits);
    });

    it('용맹함 각성은 힘을 증가시킨다', () => {
      store.setState({ ...store.getState(), activeRest: { nodeId: 'test' }, playerStrength: 0 });
      store.getState().awakenAtRest('brave');
      expect(store.getState().playerStrength).toBe(1);
      expect(store.getState().playerTraits).toContain('용맹함');
      expect(store.getState().activeRest).toBeNull();
    });

    it('굳건함 각성은 최대 체력을 증가시킨다', () => {
      store.setState({ ...store.getState(), activeRest: { nodeId: 'test' }, maxHp: 100, playerHp: 80 });
      store.getState().awakenAtRest('sturdy');
      expect(store.getState().maxHp).toBe(110);
      expect(store.getState().playerHp).toBe(90);
      expect(store.getState().playerTraits).toContain('굳건함');
    });

    it('냉철함 각성은 통찰을 증가시킨다', () => {
      store.setState({ ...store.getState(), activeRest: { nodeId: 'test' }, playerInsight: 0 });
      store.getState().awakenAtRest('cold');
      expect(store.getState().playerInsight).toBe(1);
      expect(store.getState().playerTraits).toContain('냉철함');
    });

    it('철저함 각성은 보조 슬롯을 증가시킨다', () => {
      store.setState({ ...store.getState(), activeRest: { nodeId: 'test' }, extraSubSpecialSlots: 0 });
      store.getState().awakenAtRest('thorough');
      expect(store.getState().extraSubSpecialSlots).toBe(1);
      expect(store.getState().playerTraits).toContain('철저함');
    });

    it('열정적 각성은 최대 속도를 증가시킨다', () => {
      store.setState({ ...store.getState(), activeRest: { nodeId: 'test' }, playerMaxSpeedBonus: 0 });
      store.getState().awakenAtRest('passionate');
      expect(store.getState().playerMaxSpeedBonus).toBe(5);
      expect(store.getState().playerTraits).toContain('열정적');
    });

    it('활력적 각성은 행동력을 증가시킨다', () => {
      store.setState({ ...store.getState(), activeRest: { nodeId: 'test' }, playerEnergyBonus: 0 });
      store.getState().awakenAtRest('lively');
      expect(store.getState().playerEnergyBonus).toBe(1);
      expect(store.getState().playerTraits).toContain('활력적');
    });

    it('랜덤 각성은 유효한 특성을 추가한다', () => {
      store.setState({ ...store.getState(), activeRest: { nodeId: 'test' } });
      store.getState().awakenAtRest('random');
      const validTraits = ['용맹함', '굳건함', '냉철함', '철저함', '열정적', '활력적'];
      expect(store.getState().playerTraits?.some((t: string) => validTraits.includes(t))).toBe(true);
    });

    it('각성 시 기억을 소비한다', () => {
      const initialMemory = store.getState().resources?.memory ?? 0;
      store.setState({ ...store.getState(), activeRest: { nodeId: 'test' } });
      store.getState().awakenAtRest('brave');
      expect(store.getState().resources?.memory ?? 0).toBeLessThan(initialMemory);
    });

    it('존재하지 않는 선택지는 랜덤으로 처리된다', () => {
      store.setState({ ...store.getState(), activeRest: { nodeId: 'test' } });
      store.getState().awakenAtRest('nonexistent');
      const validTraits = ['용맹함', '굳건함', '냉철함', '철저함', '열정적', '활력적'];
      expect(store.getState().playerTraits?.some((t: string) => validTraits.includes(t))).toBe(true);
    });
  });

  // formEgo 테스트 제거됨 - 새 성장 시스템(growthSlice)으로 대체
});
