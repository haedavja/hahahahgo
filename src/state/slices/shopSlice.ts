/**
 * @file shopSlice.ts
 * @description 상점 시스템 슬라이스
 */

import type { SliceCreator, ShopSliceState, ShopSliceActions } from './types';

export type ShopSlice = ShopSliceState & ShopSliceActions;

export const createShopSlice: SliceCreator<ShopSlice> = (set, get) => ({
  // 초기 상태
  activeShop: null,

  // 액션
  openShop: (merchantType = 'shop') =>
    set((state) => ({
      ...state,
      activeShop: { merchantType },
    })),

  closeShop: () =>
    set((state) => (state.activeShop ? { ...state, activeShop: null } : state)),
});
