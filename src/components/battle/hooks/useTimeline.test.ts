// @vitest-environment happy-dom
/**
 * @file useTimeline.test.js
 * @description 타임라인 훅 테스트
 *
 * ## 테스트 대상
 * - useTimeline: 전투 타임라인 진행 상태 관리
 *
 * ## 주요 테스트 케이스
 * - 초기 상태 (progress, isPlaying)
 * - 큐 정보 계산 (currentCard, hasNext, hasPrev)
 * - 재생/일시정지 토글
 * - 진행률 계산
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimeline } from './useTimeline';

describe('useTimeline', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('초기 상태', () => {
    it('빈 큐로 초기화되어야 함', () => {
      const { result } = renderHook(() => useTimeline());

      expect(result.current.progress).toBe(0);
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.currentCard).toBeNull();
      expect(result.current.totalCards).toBe(0);
    });

    it('큐와 인덱스로 초기화되어야 함', () => {
      const queue = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const { result } = renderHook(() => useTimeline(queue, 1));

      expect(result.current.currentCard).toEqual({ id: 2 });
      expect(result.current.totalCards).toBe(3);
      expect(result.current.hasNext).toBe(true);
      expect(result.current.hasPrev).toBe(true);
    });

    it('auto 옵션이 true면 자동 재생', () => {
      const queue = [{ id: 1 }];
      const { result } = renderHook(() => useTimeline(queue, 0, { auto: true }));

      expect(result.current.isPlaying).toBe(true);
    });
  });

  describe('네비게이션 상태', () => {
    it('첫 번째 인덱스에서 hasPrev는 false', () => {
      const queue = [{ id: 1 }, { id: 2 }];
      const { result } = renderHook(() => useTimeline(queue, 0));

      expect(result.current.hasPrev).toBe(false);
      expect(result.current.hasNext).toBe(true);
    });

    it('마지막 인덱스에서 hasNext는 false', () => {
      const queue = [{ id: 1 }, { id: 2 }];
      const { result } = renderHook(() => useTimeline(queue, 1));

      expect(result.current.hasPrev).toBe(true);
      expect(result.current.hasNext).toBe(false);
    });
  });

  describe('진행률 계산', () => {
    it('완료율을 올바르게 계산해야 함', () => {
      const queue = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

      const { result, rerender } = renderHook(
        ({ index }) => useTimeline(queue, index),
        { initialProps: { index: 0 } }
      );

      expect(result.current.completionRatio).toBe(25); // 1/4

      rerender({ index: 1 });
      expect(result.current.completionRatio).toBe(50); // 2/4

      rerender({ index: 3 });
      expect(result.current.completionRatio).toBe(100); // 4/4
    });
  });

  describe('재생 제어', () => {
    it('play()로 재생 시작', () => {
      const queue = [{ id: 1 }];
      const { result } = renderHook(() => useTimeline(queue, 0));

      expect(result.current.isPlaying).toBe(false);

      act(() => {
        result.current.play();
      });

      expect(result.current.isPlaying).toBe(true);
    });

    it('pause()로 일시정지', () => {
      const queue = [{ id: 1 }];
      const { result } = renderHook(() => useTimeline(queue, 0, { auto: true }));

      expect(result.current.isPlaying).toBe(true);

      act(() => {
        result.current.pause();
      });

      expect(result.current.isPlaying).toBe(false);
    });

    it('toggle()로 재생/정지 전환', () => {
      const queue = [{ id: 1 }];
      const { result } = renderHook(() => useTimeline(queue, 0));

      act(() => {
        result.current.toggle();
      });
      expect(result.current.isPlaying).toBe(true);

      act(() => {
        result.current.toggle();
      });
      expect(result.current.isPlaying).toBe(false);
    });
  });

  describe('인덱스 변경', () => {
    it('인덱스 변경 시 progress가 0으로 리셋', () => {
      const queue = [{ id: 1 }, { id: 2 }];
      const { result, rerender } = renderHook(
        ({ index }) => useTimeline(queue, index, { auto: true }),
        { initialProps: { index: 0 } }
      );

      // 진행
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current.progress).toBeGreaterThan(0);

      // 인덱스 변경
      rerender({ index: 1 });

      expect(result.current.progress).toBe(0);
    });
  });
});
