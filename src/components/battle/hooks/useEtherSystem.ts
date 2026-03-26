/**
 * @file useEtherSystem.js
 * @description 에테르 시스템 관리 Hook
 *
 * ## 에테르 슬롯 시스템
 * 에테르 포인트가 누적되면 슬롯이 채워지고,
 * 임계치(100)에 도달하면 오버드라이브 상태가 됨
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ETHER_THRESHOLD } from '../battleData';
import { calculateEtherSlots, getCurrentSlotPts, getSlotProgress, getNextSlotCost, MAX_SLOTS } from '../../../lib/etherUtils';

/**
 * useEtherSystem Hook
 *
 * 에테르 시스템 관리 (포인트, 슬롯, 오버드라이브)
 *
 * @param {number} initialPts - 초기 에테르 포인트
 * @param {Object} [options] - 옵션
 * @param {number} [options.threshold=100] - 오버드라이브 임계값
 * @param {boolean} [options.animated=true] - 애니메이션 사용 여부
 * @returns {{pts: number, slots: number, isOverdrive: boolean, addEther: Function, consumeEther: Function}}
 */
interface EtherSystemOptions {
  threshold?: number;
  animated?: boolean;
}

export function useEtherSystem(initialPts = 0, options: EtherSystemOptions = {}) {
  const {
    threshold = ETHER_THRESHOLD,
    animated = true
  } = options;

  const [pts, setPts] = useState(initialPts);
  const [animationPhase, setAnimationPhase] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);
  const [overdriveFlash, setOverdriveFlash] = useState(false);

  // 에테르 슬롯 정보
  const slots = useMemo(() => calculateEtherSlots(pts), [pts]);
  const currentSlotPts = useMemo(() => getCurrentSlotPts(pts), [pts]);
  const slotProgress = useMemo(() => getSlotProgress(pts), [pts]);
  const nextSlotCost = useMemo(() => getNextSlotCost(pts), [pts]);

  // 오버드라이브 체크
  const checkOverdrive = useCallback(() => {
    return pts >= threshold;
  }, [pts, threshold]);

  const isOverdrive = useMemo(() => checkOverdrive(), [checkOverdrive]);

  // 에테르 추가 (애니메이션 지원)
  const addEther = useCallback((amount: number, withAnimation: boolean = animated) => {
    if (withAnimation) {
      setAnimationPhase('gaining');
      setPulse(true);

      setTimeout(() => {
        setPts(prev => prev + amount);
        setAnimationPhase(null);
        setPulse(false);

        // 오버드라이브 도달 시 플래시
        if (pts + amount >= threshold && pts < threshold) {
          setOverdriveFlash(true);
          setTimeout(() => setOverdriveFlash(false), 1000);
        }
      }, 500);
    } else {
      setPts(prev => prev + amount);
    }
  }, [pts, threshold, animated]);

  // 에테르 소모
  const consumeEther = useCallback((amount: number) => {
    setPts(prev => Math.max(0, prev - amount));
  }, []);

  // 에테르 리셋
  const resetEther = useCallback(() => {
    setPts(0);
    setAnimationPhase(null);
    setPulse(false);
    setOverdriveFlash(false);
  }, []);

  // 에테르 설정
  const setEther = useCallback((value: number) => {
    setPts(value);
  }, []);

  return {
    // 상태
    pts,
    slots,
    currentSlotPts,
    slotProgress,
    nextSlotCost,
    animationPhase,
    pulse,
    overdriveFlash,
    isOverdrive,

    // 함수
    addEther,
    consumeEther,
    resetEther,
    setEther,
    checkOverdrive
  };
}

/**
 * useEtherCalculation Hook
 *
 * 에테르 계산 애니메이션 관리
 *
 * @param {Object} options - 옵션
 * @returns {Object} 계산 애니메이션 상태 및 제어 함수
 */
interface DeflationInfo {
  multiplier?: number;
  [key: string]: unknown;
}

interface CalculationParams {
  baseGain: number;
  comboMult: number;
  deflationInfo: DeflationInfo;
}

interface EtherCalculationOptions {
  onComplete?: ((finalValue: number) => void) | null;
}

export function useEtherCalculation(options: EtherCalculationOptions = {}) {
  const {
    onComplete = null
  } = options;

  const [calcPhase, setCalcPhase] = useState<string | null>(null); // 'sum', 'multiply', 'deflation', 'result'
  const [currentDeflation, setCurrentDeflation] = useState<DeflationInfo | null>(null);
  const [finalValue, setFinalValue] = useState<number | null>(null);
  const [accumulated, setAccumulated] = useState(0);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 계산 시작
  const startCalculation = useCallback(({
    baseGain,
    comboMult,
    deflationInfo
  }: CalculationParams) => {
    setAccumulated(0);
    setCalcPhase('sum');

    // 1단계: 합계
    setTimeout(() => {
      setAccumulated(baseGain);
      setCalcPhase('multiply');
    }, 500);

    // 2단계: 배율
    setTimeout(() => {
      setAccumulated(Math.round(baseGain * comboMult));
      setCalcPhase('deflation');
    }, 1000);

    // 3단계: 디플레이션
    setTimeout(() => {
      setCurrentDeflation(deflationInfo);
      setCalcPhase('result');
    }, 1500);

    // 4단계: 최종 결과
    timeoutRef.current = setTimeout(() => {
      const final = Math.round(baseGain * comboMult * (deflationInfo?.multiplier || 1));
      setFinalValue(final);
      setCalcPhase(null);
      if (onComplete) onComplete(final);
    }, 2000);
  }, [onComplete]);

  // 계산 취소
  const cancelCalculation = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setCalcPhase(null);
    setCurrentDeflation(null);
    setFinalValue(null);
    setAccumulated(0);
  }, []);

  // 리셋
  const resetCalculation = useCallback(() => {
    cancelCalculation();
  }, [cancelCalculation]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    // 상태
    calcPhase,
    currentDeflation,
    finalValue,
    accumulated,
    isCalculating: calcPhase !== null,

    // 함수
    startCalculation,
    cancelCalculation,
    resetCalculation
  };
}

/**
 * useEtherTransfer Hook
 *
 * 에테르 이동 애니메이션 관리
 *
 * @returns {Object} 이동 애니메이션 상태 및 제어 함수
 */
export function useEtherTransfer() {
  const [playerTransferPulse, setPlayerTransferPulse] = useState(false);
  const [enemyTransferPulse, setEnemyTransferPulse] = useState(false);
  const [netDelta, setNetDelta] = useState<number | null>(null);

  const playerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enemyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 플레이어 → 적 이동
  const transferToEnemy = useCallback((amount: number) => {
    setNetDelta(-amount);
    setPlayerTransferPulse(true);

    playerTimeoutRef.current = setTimeout(() => {
      setPlayerTransferPulse(false);

      setTimeout(() => {
        setEnemyTransferPulse(true);

        enemyTimeoutRef.current = setTimeout(() => {
          setEnemyTransferPulse(false);
          setNetDelta(null);
        }, 500);
      }, 300);
    }, 500);
  }, []);

  // 적 → 플레이어 이동
  const transferToPlayer = useCallback((amount: number) => {
    setNetDelta(amount);
    setEnemyTransferPulse(true);

    enemyTimeoutRef.current = setTimeout(() => {
      setEnemyTransferPulse(false);

      setTimeout(() => {
        setPlayerTransferPulse(true);

        playerTimeoutRef.current = setTimeout(() => {
          setPlayerTransferPulse(false);
          setNetDelta(null);
        }, 500);
      }, 300);
    }, 500);
  }, []);

  // 리셋
  const resetTransfer = useCallback(() => {
    if (playerTimeoutRef.current) clearTimeout(playerTimeoutRef.current);
    if (enemyTimeoutRef.current) clearTimeout(enemyTimeoutRef.current);
    setPlayerTransferPulse(false);
    setEnemyTransferPulse(false);
    setNetDelta(null);
  }, []);

  useEffect(() => {
    return () => {
      if (playerTimeoutRef.current) clearTimeout(playerTimeoutRef.current);
      if (enemyTimeoutRef.current) clearTimeout(enemyTimeoutRef.current);
    };
  }, []);

  return {
    // 상태
    playerTransferPulse,
    enemyTransferPulse,
    netDelta,
    isTransferring: playerTransferPulse || enemyTransferPulse,

    // 함수
    transferToEnemy,
    transferToPlayer,
    resetTransfer
  };
}

/**
 * useSoulShatter Hook
 *
 * 에테르 승리 연출 관리
 *
 * @param {number} duration - 연출 지속 시간 (ms)
 * @returns {Object} 연출 상태 및 제어 함수
 */
export function useSoulShatter(duration = 2000) {
  const [isActive, setIsActive] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback(() => {
    setIsActive(true);

    timeoutRef.current = setTimeout(() => {
      setIsActive(false);
    }, duration);
  }, [duration]);

  const stop = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsActive(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isActive,
    trigger,
    stop
  };
}
