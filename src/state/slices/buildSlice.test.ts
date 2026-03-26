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
  storedTraits: [],
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

  describe('specializeCard 상극 처리', () => {
    it('여유를 추가하면 기존 무리가 제거된다', () => {
      store.getState().specializeCard('strike', ['strain']);
      expect(store.getState().getCardGrowth('strike').traits).toContain('strain');

      store.getState().specializeCard('strike', ['leisure']);
      const traits = store.getState().getCardGrowth('strike').traits;
      expect(traits).toContain('leisure');
      expect(traits).not.toContain('strain');
    });

    it('무리를 추가하면 기존 여유가 제거된다', () => {
      store.getState().specializeCard('strike', ['leisure']);
      expect(store.getState().getCardGrowth('strike').traits).toContain('leisure');

      store.getState().specializeCard('strike', ['strain']);
      const traits = store.getState().getCardGrowth('strike').traits;
      expect(traits).toContain('strain');
      expect(traits).not.toContain('leisure');
    });

    it('중복 특성은 추가되지 않는다', () => {
      store.getState().specializeCard('strike', ['swift']);
      store.getState().specializeCard('strike', ['swift', 'strongbone']);
      const traits = store.getState().getCardGrowth('strike').traits;
      expect(traits.filter(t => t === 'swift').length).toBe(1);
      expect(traits).toContain('strongbone');
    });

    it('빈 특성 배열은 무시된다', () => {
      store.getState().specializeCard('strike', []);
      expect(store.getState().cardGrowth).toEqual({});
    });

    it('null cardId는 무시된다', () => {
      store.getState().specializeCard(null as any, ['swift']);
      expect(store.getState().cardGrowth).toEqual({});
    });

    it('전설 등급 카드는 특화할 수 없다', () => {
      for (let i = 0; i < 5; i++) {
        store.getState().enhanceCard('strike');
      }
      const beforeTraits = store.getState().getCardGrowth('strike').traits;
      store.getState().specializeCard('strike', ['swift']);
      expect(store.getState().getCardGrowth('strike').traits).toEqual(beforeTraits);
    });
  });

  describe('enhanceCard 엣지 케이스', () => {
    it('null cardId는 무시된다', () => {
      store.getState().enhanceCard(null as any);
      expect(store.getState().cardGrowth).toEqual({});
    });
  });

  describe('upgradeCardRarity 엣지 케이스', () => {
    it('null cardId는 무시된다', () => {
      store.getState().upgradeCardRarity(null as any);
      expect(store.getState().cardUpgrades).toEqual({});
    });
  });

  describe('addStoredTrait', () => {
    it('특성을 저장한다', () => {
      store.setState({ ...store.getState(), storedTraits: [] });
      store.getState().addStoredTrait('swift');
      expect(store.getState().storedTraits).toContain('swift');
    });

    it('중복 특성은 추가되지 않는다', () => {
      store.setState({ ...store.getState(), storedTraits: [] });
      store.getState().addStoredTrait('swift');
      store.getState().addStoredTrait('swift');
      expect(store.getState().storedTraits?.filter(t => t === 'swift').length).toBe(1);
    });

    it('null traitId는 무시된다', () => {
      store.setState({ ...store.getState(), storedTraits: [] });
      store.getState().addStoredTrait(null as any);
      expect(store.getState().storedTraits).toEqual([]);
    });
  });

  describe('removeStoredTrait', () => {
    it('저장된 특성을 제거한다', () => {
      store.setState({ ...store.getState(), storedTraits: ['swift', 'strongbone'] });
      store.getState().removeStoredTrait('swift');
      expect(store.getState().storedTraits).not.toContain('swift');
      expect(store.getState().storedTraits).toContain('strongbone');
    });

    it('null traitId는 무시된다', () => {
      store.setState({ ...store.getState(), storedTraits: ['swift'] });
      store.getState().removeStoredTrait(null as any);
      expect(store.getState().storedTraits).toContain('swift');
    });
  });

  describe('useStoredTrait', () => {
    it('저장된 특성을 사용하고 제거한다', () => {
      store.setState({ ...store.getState(), storedTraits: ['swift', 'strongbone'] });
      store.getState().useStoredTrait('swift');
      expect(store.getState().storedTraits).not.toContain('swift');
      expect(store.getState().storedTraits).toContain('strongbone');
    });

    it('저장되지 않은 특성은 무시된다', () => {
      store.setState({ ...store.getState(), storedTraits: ['swift'] });
      store.getState().useStoredTrait('nonexistent');
      expect(store.getState().storedTraits).toContain('swift');
    });

    it('null traitId는 무시된다', () => {
      store.setState({ ...store.getState(), storedTraits: ['swift'] });
      store.getState().useStoredTrait(null as any);
      expect(store.getState().storedTraits).toContain('swift');
    });
  });
});
