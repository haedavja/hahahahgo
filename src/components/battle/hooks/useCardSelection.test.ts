/**
 * @file useCardSelection.test.js
 * @description 카드 선택 훅 테스트
 *
 * ## 테스트 대상
 * - useCardSelection: 카드 선택/해제 및 순서 변경
 *
 * ## 주요 테스트 케이스
 * - 토큰 요구사항 체크
 * - 카드 선택 토글
 * - 카드 순서 변경
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCardSelection } from './useCardSelection';

// 유틸 모킹
vi.mock('../../../lib/agilityUtils', () => ({
  applyAgility: vi.fn((speed) => speed)
}));

vi.mock('../utils/comboDetection', () => ({
  detectPokerCombo: vi.fn(() => null),
  applyPokerBonus: vi.fn((cards) => cards)
}));

vi.mock('../utils/cardOrdering', () => ({
  createFixedOrder: vi.fn((cards) => cards)
}));

vi.mock('../../../lib/tokenUtils', () => ({
  getAllTokens: vi.fn((player) => player.tokens || [])
}));

describe('useCardSelection', () => {
  const mockActions = {
    setSelected: vi.fn(),
    setFixedOrder: vi.fn()
  };

  const mockPlaySound = vi.fn();
  const mockAddLog = vi.fn();
  const mockStartDamageDistribution = vi.fn();

  const defaultProps = {
    battlePhase: 'select',
    battleSelected: [],
    selected: [],
    effectiveAgility: 0,
    effectiveMaxSubmitCards: 5,
    totalSpeed: 0,
    totalEnergy: 0,
    player: {
      maxSpeed: 10,
      maxEnergy: 5,
      tokens: []
    },
    enemyUnits: [],
    hasMultipleUnits: false,
    selectedTargetUnit: 0,
    enemyPlanActions: [],
    startDamageDistribution: mockStartDamageDistribution,
    playSound: mockPlaySound,
    addLog: mockAddLog,
    actions: mockActions
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkRequiredTokens', () => {
    it('토큰 요구사항 없으면 ok 반환', () => {
      const { result } = renderHook(() => useCardSelection(defaultProps as any));
      const card = { id: 1, name: 'test' };

      const check = result.current.checkRequiredTokens(card, []);
      expect(check.ok).toBe(true);
    });

    it('토큰 충분하면 ok 반환', () => {
      const props = {
        ...defaultProps,
        player: {
          ...defaultProps.player,
          tokens: [{ id: 'focus', stacks: 3 }]
        }
      };
      const { result } = renderHook(() => useCardSelection(props as any));
      const card = {
        id: 1,
        requiredTokens: [{ id: 'focus', stacks: 2 }]
      };

      const check = result.current.checkRequiredTokens(card, []);
      expect(check.ok).toBe(true);
    });

    it('토큰 부족하면 실패 반환', () => {
      const props = {
        ...defaultProps,
        player: {
          ...defaultProps.player,
          tokens: [{ id: 'focus', stacks: 1 }]
        }
      };
      const { result } = renderHook(() => useCardSelection(props as any));
      const card = {
        id: 1,
        requiredTokens: [{ id: 'focus', stacks: 2 }]
      };

      const check = result.current.checkRequiredTokens(card, []);
      expect(check.ok).toBe(false);
      expect(check.message).toContain('부족');
    });

    it('이미 선택된 카드의 토큰 소모 고려', () => {
      const props = {
        ...defaultProps,
        player: {
          ...defaultProps.player,
          tokens: [{ id: 'focus', stacks: 2 }]
        }
      };
      const { result } = renderHook(() => useCardSelection(props as any));

      const alreadySelected = [
        { id: 1, requiredTokens: [{ id: 'focus', stacks: 1 }] }
      ];
      const newCard = {
        id: 2,
        requiredTokens: [{ id: 'focus', stacks: 2 }]
      };

      const check = result.current.checkRequiredTokens(newCard, alreadySelected);
      expect(check.ok).toBe(false);
    });
  });

  describe('toggle', () => {
    it('select 페이즈에서 카드 선택', () => {
      const card = { __handUid: 'card1', speedCost: 2, actionCost: 1 };
      const { result } = renderHook(() => useCardSelection(defaultProps as any));

      act(() => {
        result.current.toggle(card);
      });

      expect(mockActions.setSelected).toHaveBeenCalled();
      expect(mockPlaySound).toHaveBeenCalledWith(800, 80);
    });

    it('resolve 페이즈에서는 토글 무시', () => {
      const props = { ...defaultProps, battlePhase: 'resolve' };
      const card = { __handUid: 'card1', speedCost: 2, actionCost: 1 };
      const { result } = renderHook(() => useCardSelection(props as any));

      act(() => {
        result.current.toggle(card);
      });

      expect(mockActions.setSelected).not.toHaveBeenCalled();
    });

    it('최대 카드 수 초과 시 경고', () => {
      const props = {
        ...defaultProps,
        battleSelected: [{ __handUid: '1' }, { __handUid: '2' }],
        selected: [{ __handUid: '1' }, { __handUid: '2' }],
        effectiveMaxSubmitCards: 2
      };
      const card = { __handUid: 'card3', speedCost: 1, actionCost: 1 };
      const { result } = renderHook(() => useCardSelection(props as any));

      act(() => {
        result.current.toggle(card);
      });

      expect(mockAddLog).toHaveBeenCalledWith(expect.stringContaining('최대'));
    });

    it('속도 초과 시 경고', () => {
      const props = {
        ...defaultProps,
        totalSpeed: 9,
        player: { ...defaultProps.player, maxSpeed: 10 }
      };
      const card = { __handUid: 'card1', speedCost: 3, actionCost: 1 };
      const { result } = renderHook(() => useCardSelection(props as any));

      act(() => {
        result.current.toggle(card);
      });

      expect(mockAddLog).toHaveBeenCalledWith('⚠️ 속도 초과');
    });
  });

  describe('moveUp/moveDown', () => {
    it('moveUp이 카드 순서 변경', () => {
      const props = {
        ...defaultProps,
        selected: [
          { __handUid: '1', name: 'first' },
          { __handUid: '2', name: 'second' }
        ]
      };
      const { result } = renderHook(() => useCardSelection(props as any));

      act(() => {
        result.current.moveUp(1);
      });

      expect(mockActions.setSelected).toHaveBeenCalled();
      const newOrder = mockActions.setSelected.mock.calls[0][0];
      expect(newOrder[0].name).toBe('second');
      expect(newOrder[1].name).toBe('first');
    });

    it('첫 번째 카드는 moveUp 무시', () => {
      const props = {
        ...defaultProps,
        selected: [{ __handUid: '1' }, { __handUid: '2' }]
      };
      const { result } = renderHook(() => useCardSelection(props as any));

      act(() => {
        result.current.moveUp(0);
      });

      expect(mockActions.setSelected).not.toHaveBeenCalled();
    });
  });
});
