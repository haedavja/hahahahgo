/**
 * @file relicSlice.ts
 * @description 상징 관리 슬라이스
 */

import type { SliceCreator, RelicSliceState, RelicSliceActions } from './types';
import { calculatePassiveEffects } from '../../lib/relicEffects';

export type RelicSlice = RelicSliceState & RelicSliceActions;

export const createRelicSlice: SliceCreator<RelicSlice> = (set, get) => ({
  // 초기 상태
  relics: [],
  orderedRelics: [],

  // 액션
  addRelic: (relicId) =>
    set((state) => {
      if (state.relics.includes(relicId)) return state;
      const newRelics = [...state.relics, relicId];
      const newPassiveEffects = calculatePassiveEffects(newRelics);

      // maxHp 증가량 계산
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
