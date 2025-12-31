/**
 * @file relicSlice.test.ts
 * @description 상징 슬라이스 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createRelicActions, type RelicActionsSlice } from './relicSlice';

// 테스트용 초기 상태
const createInitialState = () => ({
  relics: [] as string[],
  maxHp: 100,
  playerHp: 100,
  playerStrength: 0,
  playerAgility: 0,
});

type TestStore = ReturnType<typeof createInitialState> & RelicActionsSlice;

const createTestStore = () =>
  create<TestStore>((set, get, api) => ({
    ...createInitialState(),
    ...createRelicActions(set as never, get as never, api as never),
  }));

describe('relicSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('초기 상태', () => {
    it('상징 목록이 비어있다', () => {
      expect(store.getState().relics).toEqual([]);
    });
  });

  describe('addRelic', () => {
    it('상징을 추가한다', () => {
      store.getState().addRelic('etherCrystal');
      expect(store.getState().relics).toContain('etherCrystal');
    });

    it('중복 상징은 추가하지 않는다', () => {
      store.getState().addRelic('etherCrystal');
      store.getState().addRelic('etherCrystal');
      expect(store.getState().relics.filter((r) => r === 'etherCrystal')).toHaveLength(1);
    });

    it('여러 상징을 추가할 수 있다', () => {
      store.getState().addRelic('etherCrystal');
      store.getState().addRelic('ironShield');
      expect(store.getState().relics).toHaveLength(2);
    });
  });

  describe('removeRelic', () => {
    it('상징을 제거한다', () => {
      store.getState().addRelic('etherCrystal');
      store.getState().removeRelic('etherCrystal');
      expect(store.getState().relics).not.toContain('etherCrystal');
    });

    it('없는 상징은 무시한다', () => {
      const originalRelics = store.getState().relics;
      store.getState().removeRelic('nonexistent');
      expect(store.getState().relics).toEqual(originalRelics);
    });
  });

  describe('setRelics', () => {
    it('상징 목록을 직접 설정한다', () => {
      store.getState().setRelics(['etherCrystal', 'ironShield']);
      expect(store.getState().relics).toEqual(['etherCrystal', 'ironShield']);
    });

    it('빈 배열로 설정할 수 있다', () => {
      store.getState().addRelic('etherCrystal');
      store.getState().setRelics([]);
      expect(store.getState().relics).toEqual([]);
    });
  });
});
