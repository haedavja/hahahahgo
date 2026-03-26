/**
 * @file shopSlice.ts
 * @description 상점 액션 슬라이스
 *
 * 초기 상태는 gameStore.ts의 createInitialState()에서 제공됩니다.
 */

import type { StateCreator } from 'zustand';
import type { GameStore, ShopSliceActions } from './types';

export type ShopActionsSlice = ShopSliceActions;

type SliceCreator = StateCreator<GameStore, [], [], ShopActionsSlice>;

export const createShopActions: SliceCreator = (set) => ({
  openShop: (merchantType = 'shop') =>
    set((state) => ({ ...state, activeShop: { merchantType } })),

  closeShop: () =>
    set((state) => (state.activeShop ? { ...state, activeShop: null } : state)),
});

// 하위 호환성
export const createShopSlice = createShopActions;
export type ShopSlice = ShopActionsSlice;
