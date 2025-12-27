/**
 * @file useComboSystem.test.js
 * @description 콤보 시스템 훅 테스트
 *
 * ## 테스트 대상
 * - useComboSystem: 콤보 감지 및 배율 계산
 *
 * ## 주요 테스트 케이스
 * - 빈 선택 시 콤보 없음
 * - 콤보 감지 (페어, 트리플 등)
 * - 최종 배율 계산
 * - 콤보 미리보기 정보
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useComboSystem } from './useComboSystem';

// 유틸 모킹
vi.mock('../utils/comboDetection', () => ({
  detectPokerCombo: vi.fn((cards) => {
    if (!cards || cards.length === 0) return null;
    if (cards.length === 2 && cards[0].value === cards[1].value) {
      return { name: 'pair', cards };
    }
    if (cards.length === 3 && cards[0].value === cards[1].value && cards[1].value === cards[2].value) {
      return { name: 'triple', cards };
    }
    return { name: 'high_card', cards };
  })
}));

vi.mock('../utils/etherCalculations', () => ({
  COMBO_MULTIPLIERS: {
    pair: 2,
    triple: 3,
    high_card: 1
  },
  calculateComboEtherGain: vi.fn(() => ({ etherGain: 10 }))
}));

describe('useComboSystem', () => {
  const mockActions = {
    setCurrentDeflation: vi.fn(),
    setMultiplierPulse: vi.fn()
  };

  const defaultProps = {
    battleSelected: [],
    battlePhase: 'select',
    playerComboUsageCount: {},
    resolvedPlayerCards: 0,
    battleQIndex: 0,
    battleQueueLength: 0,
    computeComboMultiplier: vi.fn((base) => base),
    explainComboMultiplier: vi.fn(() => ({ steps: [] })),
    orderedRelicList: [],
    selected: [],
    actions: mockActions
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('콤보 감지', () => {
    it('빈 선택 시 콤보 없음', () => {
      const { result } = renderHook(() => useComboSystem(defaultProps));

      expect(result.current.currentCombo).toBeNull();
    });

    it('페어 감지', () => {
      const cards = [
        { id: 1, value: 5 },
        { id: 2, value: 5 }
      ];
      const { result } = renderHook(() => useComboSystem({
        ...defaultProps,
        battleSelected: cards
      }));

      expect(result.current.currentCombo).toEqual({ name: 'pair', cards });
    });

    it('트리플 감지', () => {
      const cards = [
        { id: 1, value: 7 },
        { id: 2, value: 7 },
        { id: 3, value: 7 }
      ];
      const { result } = renderHook(() => useComboSystem({
        ...defaultProps,
        battleSelected: cards
      }));

      expect(result.current.currentCombo).toEqual({ name: 'triple', cards });
    });
  });

  describe('배율 계산', () => {
    it('콤보 없으면 배율 1', () => {
      const { result } = renderHook(() => useComboSystem(defaultProps));

      expect(result.current.finalComboMultiplier).toBe(1);
    });

    it('페어는 배율 2', () => {
      const cards = [
        { id: 1, value: 5 },
        { id: 2, value: 5 }
      ];
      const { result } = renderHook(() => useComboSystem({
        ...defaultProps,
        battleSelected: cards
      }));

      expect(result.current.finalComboMultiplier).toBe(2);
    });

    it('트리플은 배율 3', () => {
      const cards = [
        { id: 1, value: 7 },
        { id: 2, value: 7 },
        { id: 3, value: 7 }
      ];
      const { result } = renderHook(() => useComboSystem({
        ...defaultProps,
        battleSelected: cards
      }));

      expect(result.current.finalComboMultiplier).toBe(3);
    });
  });

  describe('디플레이션', () => {
    it('첫 사용 시 디플레이션 없음', () => {
      const cards = [
        { id: 1, value: 5 },
        { id: 2, value: 5 }
      ];
      renderHook(() => useComboSystem({
        ...defaultProps,
        battleSelected: cards,
        playerComboUsageCount: {}
      }));

      expect(mockActions.setCurrentDeflation).toHaveBeenCalledWith(null);
    });

    it('재사용 시 디플레이션 적용', () => {
      const cards = [
        { id: 1, value: 5 },
        { id: 2, value: 5 }
      ];
      renderHook(() => useComboSystem({
        ...defaultProps,
        battleSelected: cards,
        playerComboUsageCount: { pair: 1 }
      }));

      // 디플레이션 배율 0.8 (20% 감소/회) - applyEtherDeflation과 동일
      expect(mockActions.setCurrentDeflation).toHaveBeenCalledWith({
        multiplier: 0.8,
        usageCount: 1
      });
    });
  });

  describe('콤보 미리보기', () => {
    it('콤보 없으면 미리보기 없음', () => {
      const { result } = renderHook(() => useComboSystem(defaultProps));

      expect(result.current.comboPreviewInfo).toBeNull();
    });

    it('콤보 있으면 미리보기 정보 반환', () => {
      const cards = [
        { id: 1, value: 5 },
        { id: 2, value: 5 }
      ];
      const { result } = renderHook(() => useComboSystem({
        ...defaultProps,
        battleSelected: cards,
        selected: cards
      }));

      expect(result.current.comboPreviewInfo).toEqual({ etherGain: 10 });
    });
  });
});
