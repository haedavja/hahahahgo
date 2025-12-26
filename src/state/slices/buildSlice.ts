/**
 * @file buildSlice.ts
 * @description 캐릭터 빌드 액션 슬라이스
 *
 * 초기 상태는 gameStore.ts의 createInitialState()에서 제공됩니다.
 */

import type { StateCreator } from 'zustand';
import type { GameStore, BuildSliceActions } from './types';

export type BuildActionsSlice = BuildSliceActions;

type SliceCreator = StateCreator<GameStore, [], [], BuildActionsSlice>;

export const createBuildActions: SliceCreator = (set) => ({
  updateCharacterBuild: (mainSpecials, subSpecials) =>
    set((state) => ({
      ...state,
      characterBuild: {
        ...state.characterBuild,
        mainSpecials: mainSpecials ?? state.characterBuild.mainSpecials,
        subSpecials: subSpecials ?? state.characterBuild.subSpecials,
        ownedCards: state.characterBuild?.ownedCards || [],
      },
    })),

  addOwnedCard: (cardId) =>
    set((state) => ({
      ...state,
      characterBuild: {
        ...state.characterBuild,
        ownedCards: [...(state.characterBuild?.ownedCards || []), cardId],
      },
    })),

  removeOwnedCard: (cardId) =>
    set((state) => {
      const ownedCards = state.characterBuild?.ownedCards || [];
      const idx = ownedCards.lastIndexOf(cardId);
      if (idx === -1) return state;
      const newOwned = [...ownedCards.slice(0, idx), ...ownedCards.slice(idx + 1)];
      return { ...state, characterBuild: { ...state.characterBuild, ownedCards: newOwned } };
    }),

  clearOwnedCards: () =>
    set((state) => ({
      ...state,
      characterBuild: { ...state.characterBuild, ownedCards: [] },
    })),

  removeCardFromDeck: (cardId, isMainSpecial = false) =>
    set((state) => {
      const mainSpecials: string[] = state.characterBuild?.mainSpecials || [];
      const subSpecials: string[] = state.characterBuild?.subSpecials || [];
      const ownedCards: string[] = state.characterBuild?.ownedCards || [];

      if (isMainSpecial) {
        const newMain = mainSpecials.filter((id) => id !== cardId);
        return { ...state, characterBuild: { ...state.characterBuild, mainSpecials: newMain, subSpecials, ownedCards } };
      } else {
        const newSub = subSpecials.filter((id) => id !== cardId);
        return { ...state, characterBuild: { ...state.characterBuild, mainSpecials, subSpecials: newSub, ownedCards } };
      }
    }),

  upgradeCardRarity: (cardId) =>
    set((state) => {
      if (!cardId) return state;
      const order = ['common', 'rare', 'special', 'legendary'];
      const current = state.cardUpgrades?.[cardId] || 'common';
      const nextIdx = Math.min(order.length - 1, order.indexOf(current) + 1);
      const next = order[nextIdx];
      if (next === current) return state;
      return { ...state, cardUpgrades: { ...(state.cardUpgrades || {}), [cardId]: next } };
    }),
});

// 하위 호환성
export const createBuildSlice = createBuildActions;
export type BuildSlice = BuildActionsSlice;
