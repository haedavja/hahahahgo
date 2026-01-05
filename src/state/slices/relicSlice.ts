/**
 * @file relicSlice.ts
 * @description 상징 관리 액션 슬라이스
 *
 * 초기 상태는 gameStore.ts의 createInitialState()에서 제공됩니다.
 */

import type { StateCreator } from 'zustand';
import type { GameStore, RelicSliceActions } from './types';
import { calculatePassiveEffects } from '../../lib/relicEffects';

export type RelicActionsSlice = RelicSliceActions;

type SliceCreator = StateCreator<GameStore, [], [], RelicActionsSlice>;

export const createRelicActions: SliceCreator = (set) => ({
  addRelic: (relicId) =>
    set((state) => {
      if (state.relics.includes(relicId)) return state;
      const newRelics = [...state.relics, relicId];
      const newPassiveEffects = calculatePassiveEffects(newRelics);

      const oldMaxHpBonus = state.maxHp - 100;
      const maxHpIncrease = newPassiveEffects.maxHp - oldMaxHpBonus;
      const newMaxHp = 100 + newPassiveEffects.maxHp;
      const newPlayerHp = state.playerHp + maxHpIncrease;

      return {
        ...state,
        relics: newRelics,
        maxHp: newMaxHp,
        playerHp: Math.min(newMaxHp, newPlayerHp),
        playerStrength: newPassiveEffects.strength,
        playerAgility: newPassiveEffects.agility,
      };
    }),

  removeRelic: (relicId) =>
    set((state) => {
      const newRelics = state.relics.filter((id) => id !== relicId);
      const passiveEffects = calculatePassiveEffects(newRelics);

      return {
        ...state,
        relics: newRelics,
        maxHp: 100 + passiveEffects.maxHp,
        playerStrength: passiveEffects.strength,
        playerAgility: passiveEffects.agility,
      };
    }),

  setRelics: (relicIds) =>
    set((state) => {
      const passiveEffects = calculatePassiveEffects(relicIds);

      return {
        ...state,
        relics: relicIds,
        maxHp: 100 + passiveEffects.maxHp,
        playerStrength: passiveEffects.strength,
        playerAgility: passiveEffects.agility,
      };
    }),
});

// 하위 호환성
export const createRelicSlice = createRelicActions;
export type RelicSlice = RelicActionsSlice;
