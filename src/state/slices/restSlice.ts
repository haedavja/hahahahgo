/**
 * @file restSlice.ts
 * @description 휴식/각성 액션 슬라이스
 *
 * 초기 상태는 gameStore.ts의 createInitialState()에서 제공됩니다.
 */

import type { StateCreator } from 'zustand';
import type { GameStore, RestSliceActions } from './types';
import { AWAKEN_COST } from '../gameStoreHelpers';

export type RestActionsSlice = RestSliceActions;

type SliceCreator = StateCreator<GameStore, [], [], RestActionsSlice>;

export const createRestActions: SliceCreator = (set, get) => ({
  closeRest: () =>
    set((state) => ({ ...state, activeRest: null })),

  healAtRest: (healAmount = 0) =>
    set((state) => {
      const maxHp = state.maxHp ?? 0;
      const current = state.playerHp ?? 0;
      const heal = Math.max(0, Math.min(maxHp - current, healAmount));
      if (heal <= 0) return state;
      return { ...state, playerHp: current + heal };
    }),

  awakenAtRest: (choiceId) => {
    set((state) => {
      if (!state.activeRest) return state;
      const memory = state.resources.memory ?? 0;
      if (memory < AWAKEN_COST) return state;

      type ChoiceFn = (s: typeof state) => Record<string, unknown>;
      const choices: Record<string, ChoiceFn> = {
        brave: (s) => ({ playerStrength: (s.playerStrength || 0) + 1, trait: '용맹함' }),
        sturdy: (s) => {
          const newMax = (s.maxHp || 0) + 10;
          const newHp = Math.min(newMax, (s.playerHp || 0) + 10);
          return { maxHp: newMax, playerHp: newHp, trait: '굳건함' };
        },
        cold: (s) => ({ playerInsight: (s.playerInsight || 0) + 1, trait: '냉철함' }),
        thorough: (s) => ({ extraSubSpecialSlots: (s.extraSubSpecialSlots || 0) + 1, trait: '철저함' }),
        passionate: (s) => ({ playerMaxSpeedBonus: (s.playerMaxSpeedBonus || 0) + 5, trait: '열정적' }),
        lively: (s) => ({ playerEnergyBonus: (s.playerEnergyBonus || 0) + 1, trait: '활력적' }),
        random: (s) => {
          const keys = ['brave', 'sturdy', 'cold', 'thorough', 'passionate', 'lively'];
          const pick = keys[Math.floor(Math.random() * keys.length)];
          return choices[pick](s);
        },
      };

      const applyFn = choiceId && choices[choiceId] ? choices[choiceId] : choices.random;
      const applied = applyFn(state);
      const newTraits = [...(state.playerTraits || [])];
      if (applied.trait) newTraits.push(applied.trait as string);

      return {
        ...state,
        ...applied,
        resources: { ...state.resources, memory: memory - AWAKEN_COST },
        playerTraits: newTraits,
        activeRest: null,
      };
    });

    // 개성 획득 후 피라미드 레벨 업데이트
    get().updatePyramidLevel();
  },

  // formEgo 제거됨 - 새 성장 시스템(growthSlice)으로 대체
});

// 하위 호환성
export const createRestSlice = createRestActions;
export type RestSlice = RestActionsSlice;
