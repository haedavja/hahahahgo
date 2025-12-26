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
});
