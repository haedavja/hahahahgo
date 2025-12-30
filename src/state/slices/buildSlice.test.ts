/**
 * @file buildSlice.test.ts
 * @description 빌드 슬라이스 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createBuildActions, type BuildActionsSlice } from './buildSlice';
import type { BuildSliceState } from './types';

// 테스트용 초기 상태
const createInitialState = (): BuildSliceState => ({
  characterBuild: {
    mainSpecials: [],
    subSpecials: [],
    cards: [],
    traits: [],
    egos: [],
    ownedCards: [],
  },
  cardUpgrades: {},
  cardGrowth: {},
});

type TestStore = BuildSliceState & BuildActionsSlice;

const createTestStore = () =>
  create<TestStore>((set, get, api) => ({
    ...createInitialState(),
    ...createBuildActions(set as never, get as never, api as never),
  }));

describe('buildSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('초기 상태', () => {
    it('빈 캐릭터 빌드로 시작한다', () => {
      const build = store.getState().characterBuild;
      expect(build.mainSpecials).toEqual([]);
      expect(build.subSpecials).toEqual([]);
      expect(build.ownedCards).toEqual([]);
    });

    it('카드 업그레이드가 비어있다', () => {
      expect(store.getState().cardUpgrades).toEqual({});
    });
  });

  describe('updateCharacterBuild', () => {
    it('주특기를 업데이트한다', () => {
      store.getState().updateCharacterBuild(['strike', 'defend'], undefined);
      expect(store.getState().characterBuild.mainSpecials).toEqual(['strike', 'defend']);
    });

    it('보조특기를 업데이트한다', () => {
      store.getState().updateCharacterBuild(undefined, ['heal', 'block']);
      expect(store.getState().characterBuild.subSpecials).toEqual(['heal', 'block']);
    });

    it('동시에 업데이트할 수 있다', () => {
      store.getState().updateCharacterBuild(['strike'], ['heal']);
      expect(store.getState().characterBuild.mainSpecials).toEqual(['strike']);
      expect(store.getState().characterBuild.subSpecials).toEqual(['heal']);
    });
  });

  describe('addOwnedCard', () => {
    it('보유 카드를 추가한다', () => {
      store.getState().addOwnedCard('strike');
      expect(store.getState().characterBuild.ownedCards).toContain('strike');
    });

    it('중복 카드도 추가된다', () => {
      store.getState().addOwnedCard('strike');
      store.getState().addOwnedCard('strike');
      expect(store.getState().characterBuild.ownedCards?.filter((c) => c === 'strike')).toHaveLength(2);
    });
  });

  describe('removeOwnedCard', () => {
    it('보유 카드를 제거한다', () => {
      store.getState().addOwnedCard('strike');
      store.getState().removeOwnedCard('strike');
      expect(store.getState().characterBuild.ownedCards).not.toContain('strike');
    });

    it('중복 카드 중 하나만 제거한다', () => {
      store.getState().addOwnedCard('strike');
      store.getState().addOwnedCard('strike');
      store.getState().removeOwnedCard('strike');
      expect(store.getState().characterBuild.ownedCards?.filter((c) => c === 'strike')).toHaveLength(1);
    });

    it('없는 카드는 무시한다', () => {
      const originalState = store.getState();
      store.getState().removeOwnedCard('nonexistent');
      expect(store.getState().characterBuild).toEqual(originalState.characterBuild);
    });
  });

  describe('clearOwnedCards', () => {
    it('모든 보유 카드를 제거한다', () => {
      store.getState().addOwnedCard('strike');
      store.getState().addOwnedCard('defend');
      store.getState().clearOwnedCards();
      expect(store.getState().characterBuild.ownedCards).toEqual([]);
    });
  });

  describe('removeCardFromDeck', () => {
    it('주특기에서 카드를 제거한다', () => {
      store.getState().updateCharacterBuild(['strike', 'defend'], undefined);
      store.getState().removeCardFromDeck('strike', true);
      expect(store.getState().characterBuild.mainSpecials).toEqual(['defend']);
    });

    it('보조특기에서 카드를 제거한다', () => {
      store.getState().updateCharacterBuild(undefined, ['heal', 'block']);
      store.getState().removeCardFromDeck('heal', false);
      expect(store.getState().characterBuild.subSpecials).toEqual(['block']);
    });
  });

  describe('upgradeCardRarity', () => {
    it('카드 희귀도를 업그레이드한다', () => {
      store.getState().upgradeCardRarity('strike');
      expect(store.getState().cardUpgrades['strike']).toBe('rare');
    });

    it('순서대로 업그레이드된다 (common -> rare -> special -> legendary)', () => {
      store.getState().upgradeCardRarity('strike'); // common -> rare
      store.getState().upgradeCardRarity('strike'); // rare -> special
      store.getState().upgradeCardRarity('strike'); // special -> legendary
      expect(store.getState().cardUpgrades['strike']).toBe('legendary');
    });

    it('최고 등급 이상으로는 업그레이드되지 않는다', () => {
      store.getState().upgradeCardRarity('strike');
      store.getState().upgradeCardRarity('strike');
      store.getState().upgradeCardRarity('strike');
      store.getState().upgradeCardRarity('strike'); // legendary에서 더 이상 업그레이드 안됨
      expect(store.getState().cardUpgrades['strike']).toBe('legendary');
    });
  });

  describe('enhanceCard (강화)', () => {
    it('카드를 강화하면 enhancementLevel이 증가한다', () => {
      store.getState().enhanceCard('strike');
      const growth = store.getState().getCardGrowth('strike');
      expect(growth.enhancementLevel).toBe(1);
      expect(growth.growthCount).toBe(1);
    });

    it('강화하면 희귀도가 상승한다 (1회 → rare)', () => {
      store.getState().enhanceCard('strike');
      const growth = store.getState().getCardGrowth('strike');
      expect(growth.rarity).toBe('rare');
    });

    it('3회 성장 시 special 등급이 된다', () => {
      store.getState().enhanceCard('strike');
      store.getState().enhanceCard('strike');
      store.getState().enhanceCard('strike');
      const growth = store.getState().getCardGrowth('strike');
      expect(growth.rarity).toBe('special');
      expect(growth.enhancementLevel).toBe(3);
    });

    it('5회 성장 시 legendary 등급이 되고 더 이상 성장 불가', () => {
      for (let i = 0; i < 5; i++) {
        store.getState().enhanceCard('strike');
      }
      const growth = store.getState().getCardGrowth('strike');
      expect(growth.rarity).toBe('legendary');
      expect(growth.enhancementLevel).toBe(5);

      // 추가 강화 시도
      store.getState().enhanceCard('strike');
      expect(store.getState().getCardGrowth('strike').enhancementLevel).toBe(5);
    });
  });

  describe('specializeCard (특화)', () => {
    it('카드를 특화하면 특성이 부여된다', () => {
      store.getState().specializeCard('strike', ['swift', 'strongbone']);
      const growth = store.getState().getCardGrowth('strike');
      expect(growth.traits).toContain('swift');
      expect(growth.traits).toContain('strongbone');
      expect(growth.specializationCount).toBe(1);
    });

    it('특화도 성장 횟수에 포함된다', () => {
      store.getState().specializeCard('strike', ['swift']);
      const growth = store.getState().getCardGrowth('strike');
      expect(growth.growthCount).toBe(1);
      expect(growth.rarity).toBe('rare');
    });

    it('강화와 특화를 섞어서 사용할 수 있다', () => {
      store.getState().enhanceCard('strike');      // growthCount: 1, enhancementLevel: 1
      store.getState().specializeCard('strike', ['swift']); // growthCount: 2, specializationCount: 1
      store.getState().enhanceCard('strike');      // growthCount: 3, enhancementLevel: 2

      const growth = store.getState().getCardGrowth('strike');
      expect(growth.growthCount).toBe(3);
      expect(growth.enhancementLevel).toBe(2);
      expect(growth.specializationCount).toBe(1);
      expect(growth.rarity).toBe('special');
      expect(growth.traits).toContain('swift');
    });
  });

  describe('getCardGrowth', () => {
    it('성장하지 않은 카드는 기본 상태를 반환한다', () => {
      const growth = store.getState().getCardGrowth('unknown_card');
      expect(growth.rarity).toBe('common');
      expect(growth.growthCount).toBe(0);
      expect(growth.enhancementLevel).toBe(0);
      expect(growth.specializationCount).toBe(0);
      expect(growth.traits).toEqual([]);
    });
  });
});
