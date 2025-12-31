/**
 * @file itemSlice.test.ts
 * @description 아이템 슬라이스 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createItemActions, type ItemActionsSlice } from './itemSlice';
import type { ItemSliceState, GameItem } from './types';

// 테스트용 초기 상태
const createInitialState = (): ItemSliceState & { playerHp: number; maxHp: number; activeBattle: null; itemBuffs: Record<string, number> } => ({
  items: [null, null, null, null, null, null],
  playerHp: 100,
  maxHp: 100,
  activeBattle: null,
  itemBuffs: {},
});

type TestStore = ReturnType<typeof createInitialState> & ItemActionsSlice;

const createTestStore = () =>
  create<TestStore>((set, get, api) => ({
    ...createInitialState(),
    ...createItemActions(set as never, get as never, api as never),
  }));

describe('itemSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('초기 상태', () => {
    it('6개의 빈 아이템 슬롯이 있다', () => {
      expect(store.getState().items).toHaveLength(6);
      expect(store.getState().items.every((slot) => slot === null)).toBe(true);
    });
  });

  describe('addItem', () => {
    it('유효한 아이템을 추가한다', () => {
      store.getState().addItem('healing-potion-small');
      const items = store.getState().items;
      const addedItem = items.find((item) => item !== null);
      expect(addedItem).toBeDefined();
      expect(addedItem?.id).toBe('healing-potion-small');
    });

    it('빈 슬롯이 없으면 추가하지 않는다', () => {
      // 모든 슬롯 채우기
      const mockItem: GameItem = { id: 'test', name: 'Test', description: '', usableIn: 'any', effect: { type: 'heal', value: 10 } };
      store.setState({ ...store.getState(), items: [mockItem, mockItem, mockItem, mockItem, mockItem, mockItem] });
      store.getState().addItem('healing-potion-small');
      expect(store.getState().items.every((item) => item?.id === 'test')).toBe(true);
    });

    it('존재하지 않는 아이템은 추가하지 않는다', () => {
      store.getState().addItem('nonexistent-item');
      expect(store.getState().items.every((slot) => slot === null)).toBe(true);
    });
  });

  describe('removeItem', () => {
    it('아이템을 제거한다', () => {
      store.getState().addItem('healing-potion-small');
      store.getState().removeItem(0);
      expect(store.getState().items[0]).toBeNull();
    });

    it('유효하지 않은 인덱스는 무시한다', () => {
      const originalState = store.getState();
      store.getState().removeItem(-1);
      store.getState().removeItem(100);
      expect(store.getState().items).toEqual(originalState.items);
    });
  });

  describe('devSetItems', () => {
    it('아이템을 직접 설정한다', () => {
      store.getState().devSetItems(['healing-potion-small', null, 'explosive-small', null, null, null]);
      const items = store.getState().items;
      expect(items[0]?.id).toBe('healing-potion-small');
      expect(items[1]).toBeNull();
      expect(items[2]?.id).toBe('explosive-small');
    });
  });

  describe('useItem', () => {
    it('heal 효과 아이템을 사용하면 체력이 회복된다', () => {
      const healItem: GameItem = {
        id: 'heal-test',
        name: '회복 포션',
        description: '회복',
        usableIn: 'any',
        effect: { type: 'heal', value: 30 }
      };
      store.setState({ ...store.getState(), items: [healItem, null, null, null, null, null], playerHp: 50 });
      store.getState().useItem(0);
      expect(store.getState().playerHp).toBe(80);
      expect(store.getState().items[0]).toBeNull();
    });

    it('heal 효과는 최대 체력을 넘지 않는다', () => {
      const healItem: GameItem = {
        id: 'heal-test',
        name: '회복 포션',
        description: '회복',
        usableIn: 'any',
        effect: { type: 'heal', value: 50 }
      };
      store.setState({ ...store.getState(), items: [healItem, null, null, null, null, null], playerHp: 80, maxHp: 100 });
      store.getState().useItem(0);
      expect(store.getState().playerHp).toBe(100);
    });

    it('healPercent 효과 아이템을 사용하면 비율 체력이 회복된다', () => {
      const healItem: GameItem = {
        id: 'heal-percent-test',
        name: '대형 회복 포션',
        description: '회복',
        usableIn: 'any',
        effect: { type: 'healPercent', value: 50 }
      };
      store.setState({ ...store.getState(), items: [healItem, null, null, null, null, null], playerHp: 20, maxHp: 100 });
      store.getState().useItem(0);
      expect(store.getState().playerHp).toBe(70);
    });

    it('statBoost 효과 아이템을 사용하면 버프가 적용된다', () => {
      const buffItem: GameItem = {
        id: 'buff-test',
        name: '힘의 물약',
        description: '버프',
        usableIn: 'any',
        effect: { type: 'statBoost', stat: 'strength', value: 2 }
      };
      store.setState({ ...store.getState(), items: [buffItem, null, null, null, null, null] });
      store.getState().useItem(0);
      expect((store.getState() as any).itemBuffs?.strength).toBe(2);
    });

    it('statBoost 효과가 중첩된다', () => {
      const buffItem1: GameItem = {
        id: 'buff-test1',
        name: '힘의 물약',
        description: '버프',
        usableIn: 'any',
        effect: { type: 'statBoost', stat: 'strength', value: 2 }
      };
      const buffItem2: GameItem = {
        id: 'buff-test2',
        name: '힘의 물약',
        description: '버프',
        usableIn: 'any',
        effect: { type: 'statBoost', stat: 'strength', value: 3 }
      };
      store.setState({ ...store.getState(), items: [buffItem1, buffItem2, null, null, null, null] });
      store.getState().useItem(0);
      store.getState().useItem(1);
      expect((store.getState() as any).itemBuffs?.strength).toBe(5);
    });

    it('combat 아이템은 전투 중에만 사용 가능하다', () => {
      const combatItem: GameItem = {
        id: 'combat-test',
        name: '폭발물',
        description: '전투용',
        usableIn: 'combat',
        effect: { type: 'damage', value: 20 }
      };
      store.setState({ ...store.getState(), items: [combatItem, null, null, null, null, null], activeBattle: null });
      store.getState().useItem(0);
      expect(store.getState().items[0]).not.toBeNull();
    });

    it('유효하지 않은 슬롯 인덱스는 무시한다', () => {
      store.getState().useItem(-1);
      store.getState().useItem(100);
      expect(store.getState().items.every((slot) => slot === null)).toBe(true);
    });

    it('빈 슬롯 사용은 무시한다', () => {
      const originalState = store.getState();
      store.getState().useItem(0);
      expect(store.getState().playerHp).toBe(originalState.playerHp);
    });

    it('전투 중 damage 효과 아이템은 pendingItemEffects에 추가된다', () => {
      const damageItem: GameItem = {
        id: 'damage-test',
        name: '폭발물',
        description: '전투용',
        usableIn: 'any',
        effect: { type: 'damage', value: 20 }
      };
      const mockBattle = { pendingItemEffects: [] } as any;
      store.setState({ ...store.getState(), items: [damageItem, null, null, null, null, null], activeBattle: mockBattle });
      store.getState().useItem(0);
      expect(store.getState().items[0]).toBeNull();
      expect((store.getState() as any).activeBattle?.pendingItemEffects?.length).toBe(1);
    });

    it('defense 효과도 pendingItemEffects에 추가된다', () => {
      const defenseItem: GameItem = {
        id: 'defense-test',
        name: '보호 포션',
        description: '전투용',
        usableIn: 'any',
        effect: { type: 'defense', value: 10 }
      };
      const mockBattle = { pendingItemEffects: [] } as any;
      store.setState({ ...store.getState(), items: [defenseItem, null, null, null, null, null], activeBattle: mockBattle });
      store.getState().useItem(0);
      expect((store.getState() as any).activeBattle?.pendingItemEffects?.length).toBe(1);
    });
  });
});
