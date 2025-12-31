/**
 * @file shopSlice.test.ts
 * @description 상점 슬라이스 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createShopActions, type ShopActionsSlice } from './shopSlice';
import type { ShopSliceState } from './types';

// 테스트용 초기 상태
const createInitialState = (): ShopSliceState => ({
  activeShop: null,
});

type TestStore = ShopSliceState & ShopActionsSlice;

const createTestStore = () =>
  create<TestStore>((set, get, api) => ({
    ...createInitialState(),
    ...createShopActions(set as never, get as never, api as never),
  }));

describe('shopSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('초기 상태', () => {
    it('상점이 닫혀있다', () => {
      expect(store.getState().activeShop).toBeNull();
    });
  });

  describe('openShop', () => {
    it('기본 상점을 연다', () => {
      store.getState().openShop();
      expect(store.getState().activeShop).toEqual({ merchantType: 'shop' });
    });

    it('특정 상인 타입으로 열 수 있다', () => {
      store.getState().openShop('blacksmith');
      expect(store.getState().activeShop).toEqual({ merchantType: 'blacksmith' });
    });
  });

  describe('closeShop', () => {
    it('상점을 닫는다', () => {
      store.getState().openShop();
      store.getState().closeShop();
      expect(store.getState().activeShop).toBeNull();
    });

    it('이미 닫혀있으면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().closeShop();
      expect(store.getState()).toBe(originalState);
    });
  });
});
