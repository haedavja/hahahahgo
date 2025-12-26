/**
 * @file buildSlice.ts
 * @description 캐릭터 빌드 슬라이스 (카드, 특기)
 */

import type { SliceCreator, BuildSliceState, BuildSliceActions } from './types';

export type BuildSlice = BuildSliceState & BuildSliceActions;

export const createBuildSlice: SliceCreator<BuildSlice> = (set, get) => ({
  // 초기 상태
  characterBuild: {
    mainSpecials: [],
    subSpecials: [],
    cards: [],
    traits: [],
    egos: [],
    ownedCards: [],
  },
  cardUpgrades: {},

  // 액션
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
      return {
        ...state,
        characterBuild: {
          ...state.characterBuild,
          ownedCards: newOwned,
        },
      };
    }),

  clearOwnedCards: () =>
    set((state) => ({
      ...state,
      characterBuild: {
        ...state.characterBuild,
        ownedCards: [],
      },
    })),

  removeCardFromDeck: (cardId, isMainSpecial = false) =>
    set((state) => {
      const { mainSpecials, subSpecials, ownedCards } = state.characterBuild || {
        mainSpecials: [],
        subSpecials: [],
        ownedCards: [],
      };

      if (isMainSpecial) {
        const newMain = mainSpecials.filter((id) => id !== cardId);
        return {
          ...state,
          characterBuild: { ...state.characterBuild, mainSpecials: newMain, subSpecials, ownedCards },
        };
      } else {
        const newSub = subSpecials.filter((id) => id !== cardId);
        return {
          ...state,
          characterBuild: { ...state.characterBuild, mainSpecials, subSpecials: newSub, ownedCards },
        };
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
      return {
        ...state,
        cardUpgrades: {
          ...(state.cardUpgrades || {}),
          [cardId]: next,
        },
      };
    }),
});
