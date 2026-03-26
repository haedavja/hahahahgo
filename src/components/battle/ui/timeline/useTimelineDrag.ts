/**
 * @file useTimelineDrag.ts
 * @description 타임라인 드래그 관련 커스텀 훅 (여유/무리 특성)
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import type { MouseEvent as ReactMouseEvent, RefObject } from 'react';
import {
  STRAIN_MAX_OFFSET,
} from './timelineStyles';
import { getSpeedCost, getStrainOffset, hasTrait } from '../../../../types/guards';

export type DragType = 'leisure' | 'strain' | null;

export interface LeisureCardRange {
  cardUid: string;
  cardIdx: number;
  cardBaseSp: number;  // 카드의 원래 속도
  minSp: number;
  maxSp: number;
  currentSp: number;
  offset: number;
}

export interface StrainCardRange {
  cardUid: string;
  cardIdx: number;
  baseSp: number;
  minSp: number;
  maxSp: number;
  currentOffset: number;
  offset: number;
}

interface UseTimelineDragProps {
  phase: string;
  playerMax: number;
  leisureCardRanges: LeisureCardRange[];
  strainCardRanges: StrainCardRange[];
  onLeisurePositionChange?: (cardUid: string, position: number) => void;
  onStrainOffsetChange?: (cardUid: string, offset: number) => void;
}

interface UseTimelineDragReturn {
  playerLaneRef: RefObject<HTMLDivElement>;
  draggingCardUid: string | null;
  draggingType: DragType;
  handleMouseMove: (e: ReactMouseEvent<HTMLDivElement>) => void;
  handleLeisureDragStart: (cardUid: string) => void;
  handleStrainDragStart: (cardUid: string) => void;
  handleDragEnd: () => void;
}

export function useTimelineDrag({
  phase,
  playerMax,
  leisureCardRanges,
  strainCardRanges,
  onLeisurePositionChange,
  onStrainOffsetChange,
}: UseTimelineDragProps): UseTimelineDragReturn {
  const [draggingCardUid, setDraggingCardUid] = useState<string | null>(null);
  const [draggingType, setDraggingType] = useState<DragType>(null);
  const playerLaneRef = useRef<HTMLDivElement>(null);

  // O(n) find → O(1) Map 조회로 최적화 (드래그 중 고빈도 호출)
  const leisureRangeMap = useMemo(() =>
    new Map(leisureCardRanges.map(r => [r.cardUid, r])),
    [leisureCardRanges]
  );
  const strainRangeMap = useMemo(() =>
    new Map(strainCardRanges.map(r => [r.cardUid, r])),
    [strainCardRanges]
  );

  // 통합 마우스 이동 핸들러
  const handleMouseMove = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (!draggingCardUid || !playerLaneRef.current) return;

    const rect = playerLaneRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = (x / rect.width) * 100;
    const sp = Math.round((percent / 100) * playerMax);

    // 여유 특성 드래그 처리
    if (draggingType === 'leisure' && onLeisurePositionChange) {
      const range = leisureRangeMap.get(draggingCardUid);
      if (!range) return;

      // 카드 속도 기반 범위: [원래 속도] ~ [원래 속도 × 2]
      const cardBaseSp = range.cardBaseSp;
      const previousCardSp = range.minSp - cardBaseSp;
      const clampedPosition = Math.max(
        cardBaseSp,
        Math.min(cardBaseSp * 2, sp - previousCardSp)
      );
      onLeisurePositionChange(draggingCardUid, clampedPosition);
    }

    // 무리 특성 드래그 처리
    if (draggingType === 'strain' && onStrainOffsetChange) {
      const range = strainRangeMap.get(draggingCardUid);
      if (!range) return;

      const newOffset = Math.max(0, Math.min(STRAIN_MAX_OFFSET, range.baseSp - sp));
      if (newOffset !== range.currentOffset) {
        onStrainOffsetChange(draggingCardUid, newOffset);
      }
    }
  }, [
    draggingCardUid,
    draggingType,
    playerMax,
    leisureRangeMap,
    strainRangeMap,
    onLeisurePositionChange,
    onStrainOffsetChange
  ]);

  // 여유 드래그 시작
  const handleLeisureDragStart = useCallback((cardUid: string) => {
    if (phase !== 'respond') return;
    setDraggingCardUid(cardUid);
    setDraggingType('leisure');
  }, [phase]);

  // 무리 드래그 시작
  const handleStrainDragStart = useCallback((cardUid: string) => {
    if (phase !== 'respond') return;
    setDraggingCardUid(cardUid);
    setDraggingType('strain');
  }, [phase]);

  // 드래그 종료
  const handleDragEnd = useCallback(() => {
    setDraggingCardUid(null);
    setDraggingType(null);
  }, []);

  return {
    playerLaneRef: playerLaneRef as RefObject<HTMLDivElement>,
    draggingCardUid,
    draggingType,
    handleMouseMove,
    handleLeisureDragStart,
    handleStrainDragStart,
    handleDragEnd,
  };
}

// =====================
// 범위 계산 훅
// =====================

interface TimelineAction {
  sp?: number;
  card: {
    id?: string;
    speedCost?: number;
    traits?: string[];
    strainOffset?: number;
    __handUid?: string;
    __uid?: string;
    [key: string]: unknown;
  };
}

interface CardGrowthState {
  traits?: string[];
  [key: string]: unknown;
}

interface UseRangeCalculationProps {
  playerTimeline: TimelineAction[];
  spOffsets: number[];
  cardGrowth: Record<string, CardGrowthState>;
}

export function useLeisureRanges({
  playerTimeline,
  spOffsets,
  cardGrowth,
}: UseRangeCalculationProps): LeisureCardRange[] {
  return useMemo(() => {
    const ranges: LeisureCardRange[] = [];
    let accumulatedSp = 0;

    const hasCardTrait = (card: { id?: string; traits?: string[] }, traitId: string): boolean => {
      if (card.traits?.includes(traitId)) return true;
      if (card.id && cardGrowth[card.id]?.traits?.includes(traitId)) return true;
      return false;
    };

    playerTimeline.forEach((a, idx) => {
      const hasLeisure = hasCardTrait(a.card, 'leisure');
      const cardUid = a.card.__handUid || a.card.__uid || `leisure-${idx}`;
      const offset = spOffsets[idx] * 28;

      if (hasLeisure) {
        // 카드의 원래 속도 (민첩 적용 전 originalSpeedCost 우선 사용)
        const cardBaseSp = getSpeedCost(a.card);
        // 범위: [원래 속도] ~ [원래 속도 × 2]
        const minSp = accumulatedSp + cardBaseSp;
        const maxSp = accumulatedSp + (cardBaseSp * 2);
        ranges.push({
          cardUid,
          cardIdx: idx,
          cardBaseSp,
          minSp,
          maxSp,
          currentSp: a.sp ?? minSp,
          offset
        });
      }
      accumulatedSp = a.sp ?? accumulatedSp;
    });

    return ranges;
  }, [playerTimeline, spOffsets, cardGrowth]);
}

export function useStrainRanges({
  playerTimeline,
  spOffsets,
  cardGrowth,
}: UseRangeCalculationProps): StrainCardRange[] {
  return useMemo(() => {
    const ranges: StrainCardRange[] = [];

    const hasCardTrait = (card: { id?: string; traits?: string[] }, traitId: string): boolean => {
      if (card.traits?.includes(traitId)) return true;
      if (card.id && cardGrowth[card.id]?.traits?.includes(traitId)) return true;
      return false;
    };

    playerTimeline.forEach((a, idx) => {
      const hasStrain = hasCardTrait(a.card, 'strain');
      if (!hasStrain) return;

      const cardUid = a.card.__handUid || a.card.__uid || `strain-${idx}`;
      const offset = spOffsets[idx] * 28;
      const currentStrainOffset = a.card.strainOffset || 0;
      const baseSp = (a.sp ?? 0) + currentStrainOffset;

      ranges.push({
        cardUid,
        cardIdx: idx,
        baseSp,
        minSp: Math.max(1, baseSp - STRAIN_MAX_OFFSET),
        maxSp: baseSp,
        currentOffset: currentStrainOffset,
        offset
      });
    });

    return ranges;
  }, [playerTimeline, spOffsets, cardGrowth]);
}
