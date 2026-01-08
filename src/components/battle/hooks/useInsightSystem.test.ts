// @vitest-environment happy-dom
/**
 * @file useInsightSystem.test.js
 * @description 통찰 시스템 훅 테스트
 *
 * ## 테스트 대상
 * - useInsightSystem: 통찰 레벨 및 공개 정보 관리
 *
 * ## 주요 테스트 케이스
 * - effectiveInsight 계산 (playerInsight - enemyShroud)
 * - 통찰 레벨에 따른 적 행동 공개
 * - shroud 토큰에 의한 통찰 감소
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useInsightSystem } from './useInsightSystem';

// insightSystem 유틸 모킹
vi.mock('../utils/insightSystem', () => ({
  calculateEffectiveInsight: vi.fn((insight, shroud) => Math.max(0, (insight || 0) - (shroud || 0))),
  getInsightRevealLevel: vi.fn((insight) => {
    if (insight >= 2) return 2;
    if (insight >= 1) return 1;
    return 0;
  }),
  playInsightSound: vi.fn()
}));

describe('useInsightSystem', () => {
  const mockActions = {
    setInsightReveal: vi.fn(),
    setShowInsightBadge: vi.fn(),
    setInsightAnimating: vi.fn(),
    setInsightBadge: vi.fn()
  };

  const defaultProps = {
    playerInsight: 2,
    playerInsightPenalty: 0,
    enemyShroud: 0,
    enemyUnits: [{ id: 'enemy1' }] as any,
    enemyPlanActions: [{ id: 'action1' }, { id: 'action2' }] as any,
    battlePhase: 'select',
    devDulledLevel: 0,
    actions: mockActions
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('effectiveInsight 계산', () => {
    it('playerInsight가 그대로 적용되어야 함 (shroud 0)', () => {
      const { result } = renderHook(() => useInsightSystem(defaultProps as any));

      expect(result.current.effectiveInsight).toBe(2);
    });

    it('enemyShroud가 통찰을 감소시켜야 함', () => {
      const { result } = renderHook(() => useInsightSystem({
        ...defaultProps,
        playerInsight: 3,
        enemyShroud: 1
      } as any));

      expect(result.current.effectiveInsight).toBe(2);
    });

    it('effectiveInsight는 0 미만이 되지 않음', () => {
      const { result } = renderHook(() => useInsightSystem({
        ...defaultProps,
        playerInsight: 1,
        enemyShroud: 5
      } as any));

      expect(result.current.effectiveInsight).toBe(0);
    });
  });

  describe('통찰 레벨', () => {
    it('통찰 0이면 레벨 0 (적 정보 숨김)', () => {
      const { result } = renderHook(() => useInsightSystem({
        ...defaultProps,
        playerInsight: 0
      } as any));

      expect(result.current.effectiveInsight).toBe(0);
    });

    it('통찰 1이면 일부 공개', () => {
      const { result } = renderHook(() => useInsightSystem({
        ...defaultProps,
        playerInsight: 1
      } as any));

      expect(result.current.effectiveInsight).toBe(1);
    });

    it('통찰 2 이상이면 전체 공개', () => {
      const { result } = renderHook(() => useInsightSystem({
        ...defaultProps,
        playerInsight: 3
      } as any));

      expect(result.current.effectiveInsight).toBe(3);
    });
  });

  describe('props 변경', () => {
    it('playerInsight 변경 시 effectiveInsight 재계산', () => {
      const { result, rerender } = renderHook(
        (props) => useInsightSystem(props),
        { initialProps: defaultProps as any }
      );

      expect(result.current.effectiveInsight).toBe(2);

      rerender({ ...defaultProps, playerInsight: 5 } as any);

      expect(result.current.effectiveInsight).toBe(5);
    });

    it('enemyShroud 변경 시 effectiveInsight 재계산', () => {
      const { result, rerender } = renderHook(
        (props) => useInsightSystem(props),
        { initialProps: defaultProps as any }
      );

      expect(result.current.effectiveInsight).toBe(2);

      rerender({ ...defaultProps, enemyShroud: 1 } as any);

      expect(result.current.effectiveInsight).toBe(1);
    });
  });
});
