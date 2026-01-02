/**
 * @file useTimeoutManager.ts
 * @description setTimeout 체인 관리를 위한 훅
 *
 * 메모리 누수 방지를 위해 컴포넌트 언마운트 시 모든 타임아웃을 자동 정리합니다.
 * AbortController 패턴을 사용하여 안전한 타임아웃 관리를 제공합니다.
 */

import { useRef, useCallback, useEffect } from 'react';

interface TimeoutRef {
  id: ReturnType<typeof setTimeout>;
  label?: string;
}

/**
 * setTimeout 관리를 위한 훅
 *
 * @example
 * const { scheduleTimeout, clearAllTimeouts } = useTimeoutManager();
 *
 * // 단일 타임아웃
 * scheduleTimeout(() => doSomething(), 300);
 *
 * // 라벨링된 타임아웃 (디버깅용)
 * scheduleTimeout(() => animate(), 250, 'animation');
 *
 * // 체인 타임아웃
 * scheduleTimeout(() => {
 *   step1();
 *   scheduleTimeout(() => step2(), 200);
 * }, 100);
 */
export function useTimeoutManager() {
  const timeoutsRef = useRef<TimeoutRef[]>([]);
  const isUnmountedRef = useRef(false);

  /**
   * 타임아웃 예약
   * 컴포넌트가 언마운트되면 자동으로 정리됩니다.
   */
  const scheduleTimeout = useCallback((
    callback: () => void,
    delay: number,
    label?: string
  ): ReturnType<typeof setTimeout> | null => {
    // 이미 언마운트된 경우 실행하지 않음
    if (isUnmountedRef.current) {
      return null;
    }

    const id = setTimeout(() => {
      // 언마운트된 경우 콜백 실행하지 않음
      if (isUnmountedRef.current) {
        return;
      }

      // 실행된 타임아웃은 목록에서 제거
      timeoutsRef.current = timeoutsRef.current.filter(t => t.id !== id);
      callback();
    }, delay);

    timeoutsRef.current.push({ id, label });
    return id;
  }, []);

  /**
   * 특정 타임아웃 취소
   */
  const cancelTimeout = useCallback((id: ReturnType<typeof setTimeout>) => {
    clearTimeout(id);
    timeoutsRef.current = timeoutsRef.current.filter(t => t.id !== id);
  }, []);

  /**
   * 모든 타임아웃 취소
   */
  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(({ id }) => clearTimeout(id));
    timeoutsRef.current = [];
  }, []);

  /**
   * 라벨로 타임아웃 취소
   */
  const cancelByLabel = useCallback((label: string) => {
    const toCancel = timeoutsRef.current.filter(t => t.label === label);
    toCancel.forEach(({ id }) => clearTimeout(id));
    timeoutsRef.current = timeoutsRef.current.filter(t => t.label !== label);
  }, []);

  /**
   * 현재 대기 중인 타임아웃 수 반환 (디버깅용)
   */
  const getPendingCount = useCallback(() => {
    return timeoutsRef.current.length;
  }, []);

  // 언마운트 시 모든 타임아웃 정리
  useEffect(() => {
    isUnmountedRef.current = false;

    return () => {
      isUnmountedRef.current = true;
      clearAllTimeouts();
    };
  }, [clearAllTimeouts]);

  return {
    scheduleTimeout,
    cancelTimeout,
    clearAllTimeouts,
    cancelByLabel,
    getPendingCount,
  };
}

/**
 * 순차 타임아웃 체인 생성 헬퍼
 *
 * @example
 * const chain = createTimeoutChain(scheduleTimeout);
 * chain
 *   .then(() => step1(), 100)
 *   .then(() => step2(), 200)
 *   .then(() => step3(), 150);
 */
export function createTimeoutChain(
  scheduleTimeout: (callback: () => void, delay: number, label?: string) => ReturnType<typeof setTimeout> | null
) {
  let totalDelay = 0;
  const chainLabel = `chain-${Date.now()}`;

  const chain = {
    then: (callback: () => void, delay: number) => {
      totalDelay += delay;
      scheduleTimeout(callback, totalDelay, chainLabel);
      return chain;
    },
    getTotalDelay: () => totalDelay,
  };

  return chain;
}

export type TimeoutManager = ReturnType<typeof useTimeoutManager>;
