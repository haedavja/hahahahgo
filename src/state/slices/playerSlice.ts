/**
 * @file playerSlice.ts
 * @description 플레이어 액션 슬라이스 (HP, 스탯, 자원 관리)
 *
 * 초기 상태는 gameStore.ts의 createInitialState()에서 제공됩니다.
 * 이 슬라이스는 액션만 정의합니다.
 */

import type { StateCreator } from 'zustand';
import type { GameStore, PlayerSliceActions } from './types';

export type PlayerActionsSlice = PlayerSliceActions;

type SliceCreator = StateCreator<GameStore, [], [], PlayerActionsSlice>;

export const createPlayerActions: SliceCreator = (set) => ({
  updatePlayerStrength: (strength) =>
    set((state) => ({
      ...state,
      playerStrength: strength,
    })),

  updatePlayerAgility: (agility) =>
    set((state) => ({
      ...state,
      playerAgility: agility,
    })),

  updatePlayerInsight: (insight) =>
    set((state) => ({
      ...state,
      playerInsight: insight,
    })),

  addResources: (resourceDeltas = {}) =>
    set((state) => {
      const newResources = { ...state.resources };
      Object.entries(resourceDeltas).forEach(([key, amount]) => {
        const numAmount = Number(amount) || 0;
        const resourceKey = key as keyof typeof newResources;
        newResources[resourceKey] = Math.max(0, (newResources[resourceKey] ?? 0) + numAmount);
      });
      return {
        ...state,
        resources: newResources,
      };
    }),

  applyEtherDelta: (delta = 0) =>
    set((state) => {
      const amount = Number(delta) || 0;
      if (!amount) return state;
      const current = state.resources.etherPts ?? 0;
      const nextValue = Math.max(0, current + amount);
      if (nextValue === current) return state;
      return {
        ...state,
        resources: {
          ...state.resources,
          etherPts: nextValue,
        },
      };
    }),

  applyDamage: (damage) =>
    set((state) => {
      const currentHp = state.playerHp || 0;
      const newHp = Math.max(0, currentHp - damage);
      return {
        ...state,
        playerHp: newHp,
      };
    }),

  setPlayerHp: (hp) =>
    set((state) => ({
      ...state,
      playerHp: Math.max(0, hp),
    })),

  clearItemBuffs: () =>
    set((state) => ({
      ...state,
      itemBuffs: {},
    })),
});

// 하위 호환성을 위한 별칭
export const createPlayerSlice = createPlayerActions;
export type PlayerSlice = PlayerActionsSlice;
