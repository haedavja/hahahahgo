/**
 * @file useHandManagement.test.js
 * @description useHandManagement 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHandManagement } from './useHandManagement';

// useGameStore 모킹
vi.mock('../../../state/gameStore', () => ({
  useGameStore: {
    getState: () => ({
      characterBuild: null
    })
  }
}));

describe('useHandManagement', () => {
  const mockActions = {
    setHand: vi.fn(),
    setSelected: vi.fn(),
    setCanRedraw: vi.fn(),
    setSortType: vi.fn(),
    setDeck: vi.fn(),
    setDiscardPile: vi.fn()
  };
  const mockAddLog = vi.fn();
  const mockPlaySound = vi.fn();
  const mockEscapeBanRef = { current: new Set<string>() };

  const defaultProps: any = {
    canRedraw: true,
    battleHand: [],
    battleDeck: [],
    battleDiscardPile: [],
    battleVanishedCards: [],
    sortType: 'speed',
    hand: [],
    escapeBanRef: mockEscapeBanRef,
    addLog: mockAddLog,
    playSound: mockPlaySound,
    actions: mockActions
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSortedHand', () => {
    it('speed 기준으로 정렬해야 함 (내림차순)', () => {
      const hand: any[] = [
        { id: 'a', name: 'A', type: 'attack', speedCost: 10, actionCost: 1, description: 'Test' },
        { id: 'b', name: 'B', type: 'attack', speedCost: 30, actionCost: 2, description: 'Test' },
        { id: 'c', name: 'C', type: 'attack', speedCost: 20, actionCost: 1, description: 'Test' }
      ];

      const { result } = renderHook(() => useHandManagement({
        ...defaultProps,
        hand,
        sortType: 'speed'
      }));

      const sorted = result.current.getSortedHand();

      expect(sorted[0].id).toBe('b'); // 30
      expect(sorted[1].id).toBe('c'); // 20
      expect(sorted[2].id).toBe('a'); // 10
    });

    it('energy 기준으로 정렬해야 함 (내림차순)', () => {
      const hand: any[] = [
        { id: 'a', name: 'A', type: 'attack', speedCost: 10, actionCost: 1, description: 'Test' },
        { id: 'b', name: 'B', type: 'attack', speedCost: 10, actionCost: 3, description: 'Test' },
        { id: 'c', name: 'C', type: 'attack', speedCost: 10, actionCost: 2, description: 'Test' }
      ];

      const { result } = renderHook(() => useHandManagement({
        ...defaultProps,
        hand,
        sortType: 'energy'
      }));

      const sorted = result.current.getSortedHand();

      expect(sorted[0].id).toBe('b'); // 3
      expect(sorted[1].id).toBe('c'); // 2
      expect(sorted[2].id).toBe('a'); // 1
    });

    it('value 기준으로 정렬해야 함 (damage*hits + block, 내림차순)', () => {
      const hand: any[] = [
        { id: 'a', name: 'A', type: 'attack', speedCost: 0, actionCost: 0, description: 'Test', damage: 5, hits: 1, block: 0 },  // value: 5
        { id: 'b', name: 'B', type: 'attack', speedCost: 0, actionCost: 0, description: 'Test', damage: 3, hits: 3, block: 0 },  // value: 9
        { id: 'c', name: 'C', type: 'defense', speedCost: 0, actionCost: 0, description: 'Test', damage: 0, hits: 1, block: 10 }  // value: 10
      ];

      const { result } = renderHook(() => useHandManagement({
        ...defaultProps,
        hand,
        sortType: 'value'
      }));

      const sorted = result.current.getSortedHand();

      expect(sorted[0].id).toBe('c'); // 10
      expect(sorted[1].id).toBe('b'); // 9
      expect(sorted[2].id).toBe('a'); // 5
    });

    it('type 기준으로 정렬해야 함 (attack -> general -> special)', () => {
      const hand: any[] = [
        { id: 'a', name: 'A', type: 'support', speedCost: 0, actionCost: 0, description: 'Test' },
        { id: 'b', name: 'B', type: 'attack', speedCost: 0, actionCost: 0, description: 'Test' },
        { id: 'c', name: 'C', type: 'general', speedCost: 0, actionCost: 0, description: 'Test' }
      ];

      const { result } = renderHook(() => useHandManagement({
        ...defaultProps,
        hand,
        sortType: 'type'
      }));

      const sorted = result.current.getSortedHand();

      expect(sorted[0].id).toBe('b'); // attack
      expect(sorted[1].id).toBe('c'); // general
      expect(sorted[2].id).toBe('a'); // support
    });

    it('빈 손패를 처리해야 함', () => {
      const { result } = renderHook(() => useHandManagement({
        ...defaultProps,
        hand: [],
        sortType: 'speed'
      }));

      const sorted = result.current.getSortedHand();

      expect(sorted).toEqual([]);
    });

    it('정렬 시 원본 배열을 수정하지 않아야 함', () => {
      const hand: any[] = [
        { id: 'a', name: 'A', type: 'attack', speedCost: 10, actionCost: 0, description: 'Test' },
        { id: 'b', name: 'B', type: 'attack', speedCost: 30, actionCost: 0, description: 'Test' },
        { id: 'c', name: 'C', type: 'attack', speedCost: 20, actionCost: 0, description: 'Test' }
      ];

      const { result } = renderHook(() => useHandManagement({
        ...defaultProps,
        hand,
        sortType: 'speed'
      }));

      result.current.getSortedHand();

      // 원본 배열은 변경되지 않아야 함
      expect(hand[0].id).toBe('a');
      expect(hand[1].id).toBe('b');
      expect(hand[2].id).toBe('c');
    });
  });

  describe('cycleSortType', () => {
    it('speed -> energy 순환해야 함', () => {
      const { result } = renderHook(() => useHandManagement({
        ...defaultProps,
        sortType: 'speed'
      }));

      act(() => {
        result.current.cycleSortType();
      });

      expect(mockActions.setSortType).toHaveBeenCalledWith('energy');
      expect(mockAddLog).toHaveBeenCalledWith('🔀 행동력 기준 정렬');
      expect(mockPlaySound).toHaveBeenCalledWith(600, 80);
    });

    it('energy -> value 순환해야 함', () => {
      const { result } = renderHook(() => useHandManagement({
        ...defaultProps,
        sortType: 'energy'
      }));

      act(() => {
        result.current.cycleSortType();
      });

      expect(mockActions.setSortType).toHaveBeenCalledWith('value');
    });

    it('value -> type 순환해야 함', () => {
      const { result } = renderHook(() => useHandManagement({
        ...defaultProps,
        sortType: 'value'
      }));

      act(() => {
        result.current.cycleSortType();
      });

      expect(mockActions.setSortType).toHaveBeenCalledWith('type');
    });

    it('type -> speed 순환해야 함 (마지막에서 처음으로)', () => {
      const { result } = renderHook(() => useHandManagement({
        ...defaultProps,
        sortType: 'type'
      }));

      act(() => {
        result.current.cycleSortType();
      });

      expect(mockActions.setSortType).toHaveBeenCalledWith('speed');
    });
  });

  describe('redrawHand', () => {
    it('canRedraw가 false면 리드로우가 불가능해야 함', () => {
      const { result } = renderHook(() => useHandManagement({
        ...defaultProps,
        canRedraw: false
      }));

      act(() => {
        result.current.redrawHand();
      });

      expect(mockAddLog).toHaveBeenCalledWith('🔒 이미 이번 턴 리드로우 사용됨');
      expect(mockActions.setHand).not.toHaveBeenCalled();
    });

    it('canRedraw가 true면 리드로우가 가능해야 함', () => {
      const { result } = renderHook(() => useHandManagement({
        ...defaultProps,
        canRedraw: true
      }));

      act(() => {
        result.current.redrawHand();
      });

      expect(mockActions.setHand).toHaveBeenCalled();
      expect(mockActions.setSelected).toHaveBeenCalledWith([]);
      expect(mockActions.setCanRedraw).toHaveBeenCalledWith(false);
      expect(mockAddLog).toHaveBeenCalledWith('🔄 손패 리드로우 사용');
      expect(mockPlaySound).toHaveBeenCalledWith(700, 90);
    });
  });
});
