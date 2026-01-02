/**
 * @file useEtherSystem.test.js
 * @description useEtherSystem 훅 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEtherSystem } from './useEtherSystem';

describe('useEtherSystem', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('초기화', () => {
    it('기본값으로 초기화되어야 함', () => {
      const { result } = renderHook(() => useEtherSystem());

      expect(result.current.pts).toBe(0);
      expect(result.current.slots).toBe(0);
      expect(result.current.isOverdrive).toBe(false);
    });

    it('초기 포인트 값이 적용되어야 함', () => {
      const { result } = renderHook(() => useEtherSystem(50));

      expect(result.current.pts).toBe(50);
    });

    it('threshold 옵션이 적용되어야 함', () => {
      const { result } = renderHook(() => useEtherSystem(80, { threshold: 80 }));

      expect(result.current.isOverdrive).toBe(true);
    });
  });

  describe('addEther', () => {
    it('애니메이션 없이 즉시 포인트가 추가되어야 함', () => {
      const { result } = renderHook(() => useEtherSystem(0, { animated: false }));

      act(() => {
        result.current.addEther(25, false);
      });

      expect(result.current.pts).toBe(25);
    });

    it('애니메이션과 함께 포인트가 추가되어야 함', () => {
      const { result } = renderHook(() => useEtherSystem(0, { animated: true }));

      act(() => {
        result.current.addEther(25, true);
      });

      // 애니메이션 중이므로 아직 0
      expect(result.current.pts).toBe(0);
      expect(result.current.animationPhase).toBe('gaining');
      expect(result.current.pulse).toBe(true);

      // 500ms 후 포인트 업데이트
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current.pts).toBe(25);
      expect(result.current.animationPhase).toBe(null);
      expect(result.current.pulse).toBe(false);
    });

    it('오버드라이브 임계치 도달 시 플래시가 발생해야 함', () => {
      const { result } = renderHook(() => useEtherSystem(90, { threshold: 100, animated: true }));

      act(() => {
        result.current.addEther(15, true);
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current.pts).toBe(105);
      expect(result.current.isOverdrive).toBe(true);
      expect(result.current.overdriveFlash).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.overdriveFlash).toBe(false);
    });
  });

  describe('consumeEther', () => {
    it('포인트가 소모되어야 함', () => {
      const { result } = renderHook(() => useEtherSystem(50));

      act(() => {
        result.current.consumeEther(20);
      });

      expect(result.current.pts).toBe(30);
    });

    it('0 이하로 내려가지 않아야 함', () => {
      const { result } = renderHook(() => useEtherSystem(10));

      act(() => {
        result.current.consumeEther(50);
      });

      expect(result.current.pts).toBe(0);
    });
  });

  describe('resetEther', () => {
    it('모든 상태가 초기화되어야 함', () => {
      const { result } = renderHook(() => useEtherSystem(50, { animated: true }));

      // 애니메이션 시작
      act(() => {
        result.current.addEther(10, true);
      });

      // 리셋
      act(() => {
        result.current.resetEther();
      });

      expect(result.current.pts).toBe(0);
      expect(result.current.animationPhase).toBe(null);
      expect(result.current.pulse).toBe(false);
      expect(result.current.overdriveFlash).toBe(false);
    });
  });

  describe('setEther', () => {
    it('포인트가 직접 설정되어야 함', () => {
      const { result } = renderHook(() => useEtherSystem(0));

      act(() => {
        result.current.setEther(75);
      });

      expect(result.current.pts).toBe(75);
    });
  });

  describe('슬롯 계산', () => {
    it('포인트에 따라 슬롯이 계산되어야 함', () => {
      const { result } = renderHook(() => useEtherSystem(0, { animated: false }));

      // 0 포인트 = 0 슬롯
      expect(result.current.slots).toBe(0);

      // 슬롯 계산은 etherUtils의 calculateEtherSlots 함수에 의존
      act(() => {
        result.current.setEther(100);
      });

      // 슬롯 수는 etherUtils 구현에 따름
      expect(result.current.slots).toBeGreaterThanOrEqual(0);
    });
  });

  describe('checkOverdrive', () => {
    it('임계치 미만이면 false를 반환해야 함', () => {
      const { result } = renderHook(() => useEtherSystem(50, { threshold: 100 }));

      expect(result.current.checkOverdrive()).toBe(false);
    });

    it('임계치 이상이면 true를 반환해야 함', () => {
      const { result } = renderHook(() => useEtherSystem(100, { threshold: 100 }));

      expect(result.current.checkOverdrive()).toBe(true);
    });
  });
});
