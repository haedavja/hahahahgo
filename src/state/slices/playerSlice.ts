/**
 * @file playerSlice.ts
 * @description 플레이어 상태 슬라이스 (HP, 스탯, 자원)
 */

import type { SliceCreator, PlayerSliceState, PlayerSliceActions } from './types';

export type PlayerSlice = PlayerSliceState & PlayerSliceActions;

export const createPlayerSlice: SliceCreator<PlayerSlice> = (set, get) => ({
  // 초기 상태
  player: {
    hp: 100,
    maxHp: 100,
    energy: 3,
    maxEnergy: 3,
    handSize: 5,
    strength: 0,
    agility: 0,
    insight: 0,
  },
  playerHp: 100,
  maxHp: 100,
  playerStrength: 0,
  playerAgility: 0,
  playerInsight: 0,
  playerTraits: [],
  playerEgos: [],
  playerMaxSpeedBonus: 0,
  playerEnergyBonus: 0,
  extraSubSpecialSlots: 0,
  resources: {
    gold: 50,
    intel: 0,
    loot: 0,
    material: 0,
    etherPts: 0,
    memory: 0,
  },
  itemBuffs: {},

  // 액션
  updatePlayerStrength: (strength) =>
    set((state) => ({
      ...state,
      playerStrength: strength,
    })),

  updatePlayerAgility: (agility) =>
    set((state) => ({
      ...state,
      playerAgility: agility, // 음수 허용 (음수면 속도 증가)
    })),

  updatePlayerInsight: (insight) =>
    set((state) => ({
      ...state,
      playerInsight: insight, // 통찰 (이벤트 선택지, 적 타임라인 정보)
    })),

  addResources: (resourceDeltas = {}) =>
    set((state) => {
      const newResources = { ...state.resources };
      Object.entries(resourceDeltas).forEach(([key, amount]) => {
        const numAmount = Number(amount) || 0;
        newResources[key] = Math.max(0, (newResources[key] ?? 0) + numAmount);
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

  clearItemBuffs: () =>
    set((state) => ({
      ...state,
      itemBuffs: {},
    })),
});
