/**
 * @file battleSlice.test.ts
 * @description 전투 슬라이스 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createBattleActions, type BattleActionsSlice } from './battleSlice';
import type { BattleSliceState, PlayerSliceState, BuildSliceState, RelicSliceState } from './types';

// 테스트용 초기 상태
const createInitialState = (): BattleSliceState &
  Partial<PlayerSliceState> &
  Partial<BuildSliceState> &
  Partial<RelicSliceState> => ({
  activeBattle: null,
  lastBattleResult: null,
  playerHp: 100,
  maxHp: 100,
  resources: { gold: 50, intel: 0, loot: 0, material: 0, etherPts: 0, memory: 0 },
  characterBuild: {
    mainSpecials: [],
    subSpecials: [],
    cards: [],
    traits: [],
    egos: [],
    ownedCards: [],
  },
  relics: [],
});

type TestStore = ReturnType<typeof createInitialState> & BattleActionsSlice;

const createTestStore = () =>
  create<TestStore>((set, get, api) => ({
    ...createInitialState(),
    ...createBattleActions(set as never, get as never, api as never),
  }));

describe('battleSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('초기 상태', () => {
    it('활성 전투가 없다', () => {
      expect(store.getState().activeBattle).toBeNull();
    });

    it('마지막 전투 결과가 없다', () => {
      expect(store.getState().lastBattleResult).toBeNull();
    });
  });

  describe('startBattle', () => {
    it('전투를 시작한다', () => {
      store.getState().startBattle({ nodeId: 'test-battle', kind: 'combat' });
      expect(store.getState().activeBattle).not.toBeNull();
      expect(store.getState().activeBattle?.nodeId).toBe('test-battle');
    });

    it('기본 설정으로 시작할 수 있다', () => {
      store.getState().startBattle();
      expect(store.getState().activeBattle).not.toBeNull();
      expect(store.getState().activeBattle?.kind).toBe('combat');
    });
  });

  describe('resolveBattle', () => {
    it('활성 전투가 없으면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().resolveBattle({ result: 'victory' });
      expect(store.getState()).toBe(originalState);
    });

    it('전투를 종료하고 결과를 저장한다', () => {
      store.getState().startBattle({ nodeId: 'test-battle' });
      store.getState().resolveBattle({ result: 'victory', playerHp: 80 });
      expect(store.getState().activeBattle).toBeNull();
      expect(store.getState().lastBattleResult?.result).toBe('victory');
    });
  });

  describe('clearBattleResult', () => {
    it('전투 결과를 초기화한다', () => {
      store.getState().startBattle({ nodeId: 'test-battle' });
      store.getState().resolveBattle({ result: 'victory' });
      store.getState().clearBattleResult();
      expect(store.getState().lastBattleResult).toBeNull();
    });

    it('결과가 없으면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().clearBattleResult();
      expect(store.getState()).toBe(originalState);
    });
  });

  describe('toggleBattleCard', () => {
    it('전투가 없으면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().toggleBattleCard('card-1');
      expect(store.getState()).toBe(originalState);
    });

    it('손에 없는 카드는 무시한다', () => {
      store.getState().startBattle();
      const battleState = store.getState().activeBattle;
      store.getState().toggleBattleCard('nonexistent-card');
      expect(store.getState().activeBattle?.selectedCardIds).toEqual(battleState?.selectedCardIds);
    });
  });

  describe('commitBattlePlan', () => {
    it('전투가 없으면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().commitBattlePlan();
      expect(store.getState()).toBe(originalState);
    });

    it('전투 계획을 실행한다', () => {
      store.getState().startBattle();
      const initialPlayerHand = store.getState().activeBattle?.playerHand;
      store.getState().commitBattlePlan();
      // 새로운 손패가 생성됨
      expect(store.getState().activeBattle?.playerHand).toBeDefined();
    });
  });

  describe('clearPendingItemEffects', () => {
    it('전투가 없으면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().clearPendingItemEffects();
      expect(store.getState()).toBe(originalState);
    });

    it('대기 중인 아이템 효과를 초기화한다', () => {
      store.getState().startBattle();
      store.setState({
        ...store.getState(),
        activeBattle: {
          ...store.getState().activeBattle!,
          pendingItemEffects: [{ type: 'damage', value: 10 }],
        },
      });
      store.getState().clearPendingItemEffects();
      expect(store.getState().activeBattle?.pendingItemEffects).toEqual([]);
    });
  });
});
