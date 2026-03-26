/**
 * @file useResolveProgressEffects.ts
 * @description resolve 단계 진행 관련 효과 처리 훅
 *
 * ## 주요 기능
 * - 자동 진행 기능 (stepOnce 타이머)
 * - 타임라인 애니메이션 cleanup
 * - 타임라인 완료 후 에테르 계산 애니메이션 실행
 */

import { useEffect, type MutableRefObject } from 'react';
import { TIMING } from '../logic/battleExecution';
import type { BattlePhase } from '../reducer/battleReducerActions';

/** resolve 진행 효과 파라미터 */
interface UseResolveProgressEffectsParams {
  phase: BattlePhase;
  qIndex: number;
  queueLength: number;
  autoProgress: boolean;
  turnEtherAccumulated: number;
  etherCalcPhase: string | null;
  resolvedPlayerCards: number;
  stepOnceRef: MutableRefObject<(() => void) | null>;
  timelineAnimationRef: MutableRefObject<number | null>;
  startEtherCalculationAnimation: (etherAccumulated: number, playerCardsCount: number) => void;
}

/**
 * resolve 단계 진행 관련 효과 통합 훅
 */
export function useResolveProgressEffects(params: UseResolveProgressEffectsParams): void {
  const {
    phase,
    qIndex,
    queueLength,
    autoProgress,
    turnEtherAccumulated,
    etherCalcPhase,
    resolvedPlayerCards,
    stepOnceRef,
    timelineAnimationRef,
    startEtherCalculationAnimation
  } = params;

  // 자동진행 기능 (stepOnceRef 사용으로 중복 실행 방지)
  useEffect(() => {
    if (autoProgress && phase === 'resolve' && qIndex < queueLength) {
      const timer = setTimeout(() => {
        stepOnceRef.current?.();
      }, TIMING.AUTO_PROGRESS_DELAY);
      return () => clearTimeout(timer);
    }
  }, [autoProgress, phase, qIndex, queueLength, stepOnceRef]);

  // 타임라인 애니메이션 cleanup (페이즈 변경 또는 언마운트 시)
  useEffect(() => {
    return () => {
      if (timelineAnimationRef.current) {
        cancelAnimationFrame(timelineAnimationRef.current);
        timelineAnimationRef.current = null;
      }
    };
  }, [phase, timelineAnimationRef]);

  // 타임라인 완료 후 에테르 계산 애니메이션 실행
  // useEffect를 사용하여 turnEtherAccumulated 상태가 최신 값일 때 실행
  useEffect(() => {
    if (phase === 'resolve' && qIndex >= queueLength && queueLength > 0 && turnEtherAccumulated > 0 && etherCalcPhase === null) {
      // 모든 카드가 실행되고 에테르가 누적된 상태에서, 애니메이션이 아직 시작되지 않았을 때만 실행
      // resolvedPlayerCards를 전달하여 몬스터 사망 시에도 정확한 카드 수 사용
      setTimeout(() => startEtherCalculationAnimation(turnEtherAccumulated, resolvedPlayerCards), TIMING.ETHER_CALC_START_DELAY);
    }
  }, [phase, qIndex, queueLength, turnEtherAccumulated, etherCalcPhase, resolvedPlayerCards, startEtherCalculationAnimation]);
}
