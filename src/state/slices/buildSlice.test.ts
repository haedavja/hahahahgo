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
});
