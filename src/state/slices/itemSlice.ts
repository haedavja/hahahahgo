/**
 * @file itemSlice.ts
 * @description 아이템 관리 액션 슬라이스
 *
 * 초기 상태는 gameStore.ts의 createInitialState()에서 제공됩니다.
 */

import type { StateCreator } from 'zustand';
import type { GameStore, ItemSliceActions } from './types';
import { getItem } from '../../data/items';

export type ItemActionsSlice = ItemSliceActions;

type SliceCreator = StateCreator<GameStore, [], [], ItemActionsSlice>;

export const createItemActions: SliceCreator = (set) => ({
  addItem: (itemId) =>
    set((state) => {
      const item = getItem(itemId);
      if (!item) {
        if (import.meta.env.DEV) console.warn(`[addItem] Item not found: ${itemId}`);
        return state;
      }
      const items = [...state.items];
      const emptySlot = items.findIndex((slot) => slot === null);
      if (emptySlot === -1) {
        if (import.meta.env.DEV) console.warn('[addItem] No empty slot available');
        return state;
      }
      items[emptySlot] = item;
      return { ...state, items };
    }),

  removeItem: (slotIndex) =>
    set((state) => {
      if (slotIndex < 0 || slotIndex >= state.items.length) return state;
      const items = [...state.items];
      items[slotIndex] = null;
      return { ...state, items };
    }),

  useItem: (slotIndex, battleContext = null) =>
    set((state) => {
      if (slotIndex < 0 || slotIndex >= state.items.length) return state;
      const item = state.items[slotIndex];
      if (!item) {
        if (import.meta.env.DEV) console.warn('[useItem] No item in slot', slotIndex);
        return state;
      }

      const inBattle = !!state.activeBattle;
      if (item.usableIn === 'combat' && !inBattle) {
        if (import.meta.env.DEV) console.warn('[useItem] Combat item can only be used in battle');
        return state;
      }

      const items = [...state.items];
      items[slotIndex] = null;

      const effect = item.effect;
      const updates: Record<string, unknown> = { items };

      switch (effect.type) {
        case 'heal': {
          const maxHp = state.maxHp ?? 100;
          const newHp = Math.min(maxHp, (state.playerHp ?? 0) + (effect.value ?? 0));
          updates.playerHp = newHp;
          break;
        }
        case 'healPercent': {
          const maxHp = state.maxHp ?? 100;
          const healAmount = Math.floor((maxHp * (effect.value ?? 0)) / 100);
          const newHp = Math.min(maxHp, (state.playerHp ?? 0) + healAmount);
          updates.playerHp = newHp;
          break;
        }
        case 'statBoost': {
          const newBuffs = { ...(state.itemBuffs || {}) };
          if (effect.stat) {
            newBuffs[effect.stat] = ((newBuffs[effect.stat] as number) || 0) + (effect.value ?? 0);
          }
          updates.itemBuffs = newBuffs;
          break;
        }
        case 'etherMultiplier':
        case 'etherSteal':
        case 'damage':
        case 'defense':
        case 'attackBoost':
        case 'turnEnergy':
        case 'maxEnergy':
        case 'cardDestroy':
        case 'cardFreeze': {
          if (state.activeBattle) {
            const battle = { ...state.activeBattle };
            battle.pendingItemEffects = [...(battle.pendingItemEffects || []), effect];
            updates.activeBattle = battle;
          }
          break;
        }
        default:
          if (import.meta.env.DEV) console.warn(`[useItem] Unknown effect type: ${effect.type}`);
      }

      return { ...state, ...updates };
    }),

  devSetItems: (itemIds) =>
    set((state) => {
      const items = itemIds.map((id) => (id ? getItem(id) : null));
      return { ...state, items };
    }),
});

// 하위 호환성
export const createItemSlice = createItemActions;
export type ItemSlice = ItemActionsSlice;
