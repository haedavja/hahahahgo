/**
 * @file useTimeline.js
 * @description 전투 타임라인 진행 상태 관리 훅
 *
 * ## 기능
 * - 타임라인 진행 상태 관리
 * - 자동/수동 진행 전환
 * - 진행 속도 제어
 * - 일시정지/재개
 *
 * @typedef {Object} TimelineState
 * @property {boolean} isPlaying - 재생 중 여부
 * @property {number} progress - 진행률 (0~100)
 * @property {number} currentIndex - 현재 인덱스
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 타임라인 훅
 * @param {Array} queue - 행동 큐
 * @param {number} currentIndex - 현재 실행 중인 인덱스
 * @param {Object} options - 옵션
 * @param {number} options.speed - 진행 속도 (ms) default: 100
 * @param {boolean} options.auto - 자동 진행 여부 default: false
 * @param {Function} options.onProgress - 진행 시 콜백
 * @returns {TimelineState} 타임라인 상태 및 제어 함수
 */
export function useTimeline(queue = [], currentIndex = 0, options: any = {}) {
  const {
    speed = 100,
    auto = false,
    onProgress = null
  } = options as any;

  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(auto);
  const intervalRef = useRef(null);

  // 현재 카드 정보
  const currentCard = queue[currentIndex] || null;
  const hasNext = currentIndex < queue.length - 1;
  const hasPrev = currentIndex > 0;
  const totalCards = queue.length;
  const completionRatio = totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0;

  // 진행 애니메이션
  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 1;
        if (next >= 100) {
          if (onProgress) onProgress(currentIndex);
          return 0;
        }
        return next;
      });
    }, speed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, speed, currentIndex, onProgress]);

  // 인덱스 변경 시 진행도 리셋
  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

  // 제어 함수들
  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const toggle = useCallback(() => setIsPlaying(prev => !prev), []);
  const reset = useCallback(() => {
    setProgress(0);
    setIsPlaying(false);
  }, []);

  return {
    // 상태
    progress,
    isPlaying,
    currentCard,
    currentIndex,
    hasNext,
    hasPrev,
    totalCards,
    completionRatio,

    // 제어
    play,
    pause,
    toggle,
    reset
  };
}

/**
 * useTimelineIndicator Hook
 *
 * 타임라인 시곗바늘 애니메이션 관리
 *
 * @param {boolean} visible - 표시 여부
 * @param {number} progress - 진행도 (0~100)
 * @returns {Object} 인디케이터 상태
 */
export function useTimelineIndicator(visible = true, progress = 0) {
  const [position, setPosition] = useState(0);
  const [opacity, setOpacity] = useState(visible ? 1 : 0);

  useEffect(() => {
    setPosition(progress);
  }, [progress]);

  useEffect(() => {
    setOpacity(visible ? 1 : 0);
  }, [visible]);

  return {
    position,
    opacity,
    style: {
      left: `${position}%`,
      opacity,
      transition: 'left 0.1s linear, opacity 0.3s ease'
    }
  };
}

/**
 * useCardExecution Hook
 *
 * 카드 실행 애니메이션 상태 관리
 *
 * @param {number|null} executingCardIndex - 현재 실행 중인 카드 인덱스
 * @param {number} duration - 애니메이션 지속 시간 (ms)
 * @returns {Object} 실행 상태
 */
export function useCardExecution(executingCardIndex = null, duration = 500) {
  const [isExecuting, setIsExecuting] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (executingCardIndex !== null) {
      setIsExecuting(true);

      timeoutRef.current = setTimeout(() => {
        setIsExecuting(false);
      }, duration);
    } else {
      setIsExecuting(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [executingCardIndex, duration]);

  return {
    isExecuting,
    executingIndex: executingCardIndex
  };
}

/**
 * useCardDisappearance Hook
 *
 * 카드 사라지는 애니메이션 관리
 *
 * @param {Array} disappearingCards - 사라지는 중인 카드 인덱스 배열
 * @param {Array} hiddenCards - 완전히 숨겨진 카드 인덱스 배열
 * @returns {Function} isCardVisible - 카드 가시성 확인 함수
 */
export function useCardDisappearance(disappearingCards = [], hiddenCards = []) {
  const isCardVisible = useCallback((index) => {
    return !hiddenCards.includes(index);
  }, [hiddenCards]);

  const isCardDisappearing = useCallback((index) => {
    return disappearingCards.includes(index);
  }, [disappearingCards]);

  const isCardHidden = useCallback((index) => {
    return hiddenCards.includes(index);
  }, [hiddenCards]);

  return {
    isCardVisible,
    isCardDisappearing,
    isCardHidden
  };
}
