/**
 * @file playerSlice.test.ts
 * @description 플레이어 슬라이스 테스트
 *
 * 슬라이스는 액션만 제공하므로, 테스트 시 초기 상태를 직접 제공합니다.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createPlayerActions, type PlayerActionsSlice } from './playerSlice';
import type { PlayerSliceState } from './types';

// 테스트용 초기 상태
const createInitialState = (): PlayerSliceState => ({
  player: { hp: 100, maxHp: 100, energy: 3, maxEnergy: 3, handSize: 5 },
  playerHp: 100,
  maxHp: 100,
  playerStrength: 0,
  playerAgility: 0,
  playerInsight: 0,
  playerTraits: [],
  playerEgos: [],
  playerMaxSpeedBonus: 0,
  playerEnergyBonus: 0,
  extraSubSpecialSlots: 0,
  resources: { gold: 50, intel: 0, etherPts: 0, loot: 0, material: 0, memory: 0 },
  itemBuffs: {},
});

// 테스트용 스토어 타입
type TestStore = PlayerSliceState & PlayerActionsSlice;

// 테스트용 스토어 생성 (초기 상태 + 액션)
const createTestStore = () =>
  create<TestStore>((set, get, api) => ({
    ...createInitialState(),
    ...createPlayerActions(set as never, get as never, api as never),
  }));

describe('playerSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('초기 상태', () => {
    it('기본 HP가 100이다', () => {
      expect(store.getState().playerHp).toBe(100);
      expect(store.getState().maxHp).toBe(100);
    });

    it('기본 자원이 올바르게 설정된다', () => {
      const resources = store.getState().resources;
      expect(resources.gold).toBe(50);
      expect(resources.intel).toBe(0);
      expect(resources.etherPts).toBe(0);
    });

    it('기본 스탯이 0이다', () => {
      expect(store.getState().playerStrength).toBe(0);
      expect(store.getState().playerAgility).toBe(0);
      expect(store.getState().playerInsight).toBe(0);
    });
  });

  describe('updatePlayerStrength', () => {
    it('힘을 업데이트한다', () => {
      store.getState().updatePlayerStrength(5);
      expect(store.getState().playerStrength).toBe(5);
    });

    it('음수 값도 허용한다', () => {
      store.getState().updatePlayerStrength(-3);
      expect(store.getState().playerStrength).toBe(-3);
    });
  });

  describe('updatePlayerAgility', () => {
    it('민첩을 업데이트한다', () => {
      store.getState().updatePlayerAgility(2);
      expect(store.getState().playerAgility).toBe(2);
    });

    it('음수 값도 허용한다 (속도 증가)', () => {
      store.getState().updatePlayerAgility(-5);
      expect(store.getState().playerAgility).toBe(-5);
    });
  });

  describe('updatePlayerInsight', () => {
    it('통찰을 업데이트한다', () => {
      store.getState().updatePlayerInsight(3);
      expect(store.getState().playerInsight).toBe(3);
    });
  });

  describe('addResources', () => {
    it('자원을 추가한다', () => {
      store.getState().addResources({ gold: 10, intel: 2 });
      expect(store.getState().resources.gold).toBe(60);
      expect(store.getState().resources.intel).toBe(2);
    });

    it('음수 자원을 뺀다 (최소 0)', () => {
      store.getState().addResources({ gold: -100 });
      expect(store.getState().resources.gold).toBe(0);
    });

    it('여러 자원을 동시에 변경한다', () => {
      store.getState().addResources({ gold: 5, loot: 3, material: 2 });
      const resources = store.getState().resources;
      expect(resources.gold).toBe(55);
      expect(resources.loot).toBe(3);
      expect(resources.material).toBe(2);
    });
  });

  describe('applyEtherDelta', () => {
    it('에테르를 추가한다', () => {
      store.getState().applyEtherDelta(50);
      expect(store.getState().resources.etherPts).toBe(50);
    });

    it('에테르를 감소시킨다 (최소 0)', () => {
      store.getState().applyEtherDelta(30);
      store.getState().applyEtherDelta(-50);
      expect(store.getState().resources.etherPts).toBe(0);
    });

    it('0 델타는 상태를 변경하지 않는다', () => {
      const originalState = store.getState();
      store.getState().applyEtherDelta(0);
      expect(store.getState()).toBe(originalState);
    });
  });

  describe('applyDamage', () => {
    it('피해를 적용한다', () => {
      store.getState().applyDamage(30);
      expect(store.getState().playerHp).toBe(70);
    });

    it('HP가 0 미만으로 내려가지 않는다', () => {
      store.getState().applyDamage(150);
      expect(store.getState().playerHp).toBe(0);
    });

    it('여러 번 피해를 적용할 수 있다', () => {
      store.getState().applyDamage(20);
      store.getState().applyDamage(30);
      expect(store.getState().playerHp).toBe(50);
    });
  });

  describe('clearItemBuffs', () => {
    it('아이템 버프를 초기화한다', () => {
      // 직접 버프 설정 (테스트용)
      const state = store.getState();
      store.setState({ ...state, itemBuffs: { strength: 5, agility: 3 } });

      store.getState().clearItemBuffs();
      expect(store.getState().itemBuffs).toEqual({});
    });
  });
});
