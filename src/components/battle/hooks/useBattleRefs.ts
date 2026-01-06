/**
 * @file useBattleRefs.ts
 * @description 전투 시스템에서 사용되는 모든 ref를 관리하는 커스텀 훅
 *
 * 이 훅은 다음과 같은 ref들을 통합 관리합니다:
 * - 탈주 카드 추적 (escapeBanRef, escapeUsedThisTurnRef)
 * - 유물 트리거 추적 (devilDiceTriggeredRef, referenceBookTriggeredRef)
 * - 처리 플래그 (turnStartProcessedRef, deckInitializedRef)
 * - 애니메이션/실행 제어 (timelineAnimationRef, isExecutingCardRef)
 * - 패리 상태 (parryReadyStatesRef, growingDefenseRef)
 * - 통찰 추적 (prevInsightRef, prevRevealLevelRef)
 * - 에테르 추적 (displayEtherMultiplierRef, initialEtherRef)
 * - 기타 (logEndRef, resultSentRef)
 */

import { useRef } from 'react';
import type { ParryReadyState } from '../../../types';

interface UseBattleRefsParams {
  initialEther: number;
}

export interface BattleRefs {
  // 탈주 카드 추적 (카드 ID 문자열)
  escapeBanRef: React.MutableRefObject<Set<string>>;
  escapeUsedThisTurnRef: React.MutableRefObject<Set<string>>;

  // 유물 트리거 추적
  devilDiceTriggeredRef: React.MutableRefObject<boolean>;
  referenceBookTriggeredRef: React.MutableRefObject<boolean>;

  // 처리 플래그
  turnStartProcessedRef: React.MutableRefObject<boolean>;
  deckInitializedRef: React.MutableRefObject<boolean>;

  // 애니메이션/실행 제어
  timelineAnimationRef: React.MutableRefObject<number | null>;
  isExecutingCardRef: React.MutableRefObject<boolean>;

  // 패리 상태
  parryReadyStatesRef: React.MutableRefObject<ParryReadyState[]>;
  growingDefenseRef: React.MutableRefObject<{ activatedSp: number; totalDefenseApplied: number } | null>;

  // 통찰 추적
  prevInsightRef: React.MutableRefObject<number>;
  prevRevealLevelRef: React.MutableRefObject<number>;

  // 에테르 추적
  displayEtherMultiplierRef: React.MutableRefObject<number>;
  initialEtherRef: React.MutableRefObject<number>;

  // 기타
  logEndRef: React.MutableRefObject<HTMLDivElement | null>;
  resultSentRef: React.MutableRefObject<boolean>;
}

/**
 * 전투 시스템의 모든 ref를 초기화하고 관리하는 훅
 *
 * @param params - 초기화 매개변수
 * @param params.initialEther - 초기 에테르 포인트
 * @returns 모든 전투 ref를 포함하는 객체
 */
export function useBattleRefs({ initialEther }: UseBattleRefsParams): BattleRefs {
  // 탈주 카드 추적 (사용된 다음 턴에만 등장 금지)
  const escapeBanRef = useRef(new Set());
  const escapeUsedThisTurnRef = useRef(new Set());

  // 유물 트리거 추적 (턴 내 발동 여부)
  const devilDiceTriggeredRef = useRef(false); // 악마의 주사위
  const referenceBookTriggeredRef = useRef(false); // 참고서

  // 처리 플래그 (중복 실행 방지)
  const turnStartProcessedRef = useRef(false); // 턴 시작 효과
  const deckInitializedRef = useRef(false); // 덱 초기화 (첫 턴 중복 드로우 방지)

  // 애니메이션/실행 제어
  const timelineAnimationRef = useRef<number | null>(null); // 타임라인 진행 애니메이션
  const isExecutingCardRef = useRef(false); // executeCardAction 중복 실행 방지

  // 패리 상태
  const parryReadyStatesRef = useRef<ParryReadyState[]>([]); // 쳐내기 패리 대기 상태 (setTimeout용)
  const growingDefenseRef = useRef<{ activatedSp: number; totalDefenseApplied: number } | null>(null); // 방어자세

  // 통찰 추적
  const prevInsightRef = useRef(0); // 통찰 값 변화 추적
  const prevRevealLevelRef = useRef(0); // 통찰 공개 레벨 추적

  // 에테르 추적
  const displayEtherMultiplierRef = useRef(1); // 애니메이션 표시용 에테르 배율 (리셋되어도 유지)
  const initialEtherRef = useRef(initialEther); // 초기 에테르 포인트

  // 기타
  const logEndRef = useRef<HTMLDivElement | null>(null); // 로그 끝 참조
  const resultSentRef = useRef(false); // 결과 전송 여부

  return {
    // 탈주 카드 추적
    escapeBanRef,
    escapeUsedThisTurnRef,

    // 유물 트리거 추적
    devilDiceTriggeredRef,
    referenceBookTriggeredRef,

    // 처리 플래그
    turnStartProcessedRef,
    deckInitializedRef,

    // 애니메이션/실행 제어
    timelineAnimationRef,
    isExecutingCardRef,

    // 패리 상태
    parryReadyStatesRef,
    growingDefenseRef,

    // 통찰 추적
    prevInsightRef,
    prevRevealLevelRef,

    // 에테르 추적
    displayEtherMultiplierRef,
    initialEtherRef,

    // 기타
    logEndRef,
    resultSentRef,
  };
}
