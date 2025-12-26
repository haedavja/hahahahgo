/**
 * @file itemSlice.ts
 * @description 아이템 관리 슬라이스
 */

import type { SliceCreator, ItemSliceState, ItemSliceActions } from './types';
import { getItem } from '../../data/items';

export type ItemSlice = ItemSliceState & ItemSliceActions;

export const createItemSlice: SliceCreator<ItemSlice> = (set, get) => ({
  // 초기 상태
  items: [null, null, null, null], // 4 슬롯

  // 액션
  addItem: (itemId) =>
    set((state) => {
      const item = getItem(itemId);
      if (!item) {
        console.warn(`[addItem] Item not found: ${itemId}`);
        return state;
      }
      const items = [...state.items];
      const emptySlot = items.findIndex((slot) => slot === null);
      if (emptySlot === -1) {
        console.warn('[addItem] No empty slot available');
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
        console.warn('[useItem] No item in slot', slotIndex);
        return state;
      }

      // 전투 중이면 combat 아이템만, 아니면 any 아이템만 사용 가능
      const inBattle = !!state.activeBattle;
      if (item.usableIn === 'combat' && !inBattle) {
        console.warn('[useItem] Combat item can only be used in battle');
        return state;
      }

      // 아이템 슬롯에서 제거
      const items = [...state.items];
      items[slotIndex] = null;

      // 효과 적용
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
          // 전투용 아이템
          if (state.activeBattle) {
            const battle = { ...state.activeBattle };
            battle.pendingItemEffects = [...(battle.pendingItemEffects || []), effect];
            updates.activeBattle = battle;
          }
          break;
        }
        default:
          console.warn(`[useItem] Unknown effect type: ${effect.type}`);
      }

      return { ...state, ...updates };
    }),

  devSetItems: (itemIds) =>
    set((state) => {
      const items = itemIds.map((id) => (id ? getItem(id) : null));
      return { ...state, items };
    }),
});
