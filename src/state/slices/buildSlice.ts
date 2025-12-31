/**
 * @file buildSlice.ts
 * @description 캐릭터 빌드 액션 슬라이스
 *
 * 초기 상태는 gameStore.ts의 createInitialState()에서 제공됩니다.
 *
 * === 카드 승격 시스템 ===
 * - 강화: 스탯 향상 (데미지, 방어력, 속도 등)
 * - 특화: 랜덤 5개 특성 중 선택하여 부여
 * - 승격 조건: 성장 횟수(강화+특화)에 따라 등급 상승
 *   - 1회 → 희귀(rare)
 *   - 3회 → 특별(special)
 *   - 5회 → 전설(legendary) - 최종, 더 이상 성장 불가
 */

import type { StateCreator } from 'zustand';
import type { GameStore, BuildSliceActions, CardGrowthState } from './types';

export type BuildActionsSlice = BuildSliceActions;

type SliceCreator = StateCreator<GameStore, [], [], BuildActionsSlice>;

/** 성장 횟수에 따른 등급 계산 */
function calculateRarity(growthCount: number): CardGrowthState['rarity'] {
  if (growthCount >= 5) return 'legendary';
  if (growthCount >= 3) return 'special';
  if (growthCount >= 1) return 'rare';
  return 'common';
}

/** 기본 카드 성장 상태 */
function getDefaultGrowthState(): CardGrowthState {
  return {
    rarity: 'common',
    growthCount: 0,
    enhancementLevel: 0,
    specializationCount: 0,
    traits: [],
  };
}

export const createBuildActions: SliceCreator = (set, get) => ({
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

  // 레거시: 기존 upgradeCardRarity 유지
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

  // 강화: 스탯 향상 + 성장 횟수 증가
  enhanceCard: (cardId) =>
    set((state) => {
      if (!cardId) return state;

      const cardGrowth = state.cardGrowth || {};
      const currentGrowth = cardGrowth[cardId] || getDefaultGrowthState();

      // 전설 등급은 더 이상 성장 불가
      if (currentGrowth.rarity === 'legendary') return state;

      const newGrowthCount = currentGrowth.growthCount + 1;
      const newEnhancementLevel = currentGrowth.enhancementLevel + 1;
      const newRarity = calculateRarity(newGrowthCount);

      const newGrowthState: CardGrowthState = {
        ...currentGrowth,
        growthCount: newGrowthCount,
        enhancementLevel: newEnhancementLevel,
        rarity: newRarity,
      };

      // 레거시 cardUpgrades도 동기화
      const newCardUpgrades = { ...(state.cardUpgrades || {}), [cardId]: newRarity };

      return {
        ...state,
        cardGrowth: { ...cardGrowth, [cardId]: newGrowthState },
        cardUpgrades: newCardUpgrades,
      };
    }),

  // 특화: 특성 부여 + 성장 횟수 증가
  specializeCard: (cardId, selectedTraits) =>
    set((state) => {
      if (!cardId || !selectedTraits || selectedTraits.length === 0) return state;

      const cardGrowth = state.cardGrowth || {};
      const currentGrowth = cardGrowth[cardId] || getDefaultGrowthState();

      // 전설 등급은 더 이상 성장 불가
      if (currentGrowth.rarity === 'legendary') return state;

      const newGrowthCount = currentGrowth.growthCount + 1;
      const newSpecializationCount = currentGrowth.specializationCount + 1;
      const newRarity = calculateRarity(newGrowthCount);

      // 중복 특성 필터링 (기존에 없는 특성만 추가)
      const existingTraitSet = new Set(currentGrowth.traits);
      const uniqueNewTraits = selectedTraits.filter(t => !existingTraitSet.has(t));

      // 여유/무리 상극 처리: 둘 중 하나만 가질 수 있음
      let finalTraits = [...currentGrowth.traits, ...uniqueNewTraits];
      const hasLeisure = uniqueNewTraits.includes('leisure');
      const hasStrain = uniqueNewTraits.includes('strain');
      if (hasLeisure) {
        // 여유를 추가하면 기존 무리 제거
        finalTraits = finalTraits.filter(t => t !== 'strain');
      } else if (hasStrain) {
        // 무리를 추가하면 기존 여유 제거
        finalTraits = finalTraits.filter(t => t !== 'leisure');
      }

      const newGrowthState: CardGrowthState = {
        ...currentGrowth,
        growthCount: newGrowthCount,
        specializationCount: newSpecializationCount,
        rarity: newRarity,
        traits: finalTraits,
      };

      // 레거시 cardUpgrades도 동기화
      const newCardUpgrades = { ...(state.cardUpgrades || {}), [cardId]: newRarity };

      return {
        ...state,
        cardGrowth: { ...cardGrowth, [cardId]: newGrowthState },
        cardUpgrades: newCardUpgrades,
      };
    }),

  // 카드 성장 상태 조회
  getCardGrowth: (cardId) => {
    const state = get();
    const cardGrowth = state.cardGrowth || {};
    return cardGrowth[cardId] || getDefaultGrowthState();
  },
});

// 하위 호환성
export const createBuildSlice = createBuildActions;
export type BuildSlice = BuildActionsSlice;
