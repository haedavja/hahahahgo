/**
 * @file RangeIndicators.tsx
 * @description 타임라인 범위 인디케이터 (여유/무리/패리)
 */

import { memo } from 'react';
import type { FC, CSSProperties } from 'react';
import type { ParryState } from '../../../../types';
import {
  LEISURE_COLOR,
  STRAIN_COLOR,
  PARRY_COLORS,
  STRAIN_MAX_OFFSET,
} from './timelineStyles';
import type { LeisureCardRange, StrainCardRange } from './useTimelineDrag';

// =====================
// 여유 범위 인디케이터
// =====================

interface LeisureRangeProps {
  range: LeisureCardRange;
  playerMax: number;
  isDragging: boolean;
}

export const LeisureRangeIndicator: FC<LeisureRangeProps> = memo(function LeisureRangeIndicator({
  range,
  playerMax,
  isDragging,
}) {
  const minPercent = (range.minSp / playerMax) * 100;
  const maxPercent = (range.maxSp / playerMax) * 100;

  const style: CSSProperties = {
    position: 'absolute',
    left: `${minPercent}%`,
    width: `${maxPercent - minPercent}%`,
    top: `${6 + range.offset}px`,
    height: '24px',
    background: isDragging
      ? `linear-gradient(90deg, ${LEISURE_COLOR.start}40, ${LEISURE_COLOR.end}40)`
      : LEISURE_COLOR.bg,
    borderRadius: '12px',
    border: `2px dashed ${isDragging ? LEISURE_COLOR.start : LEISURE_COLOR.end}`,
    boxShadow: isDragging
      ? `0 0 12px ${LEISURE_COLOR.shadow}, inset 0 0 8px ${LEISURE_COLOR.shadow}`
      : `0 0 6px ${LEISURE_COLOR.shadow}`,
    zIndex: 5,
    pointerEvents: 'none',
    transition: 'box-shadow 0.2s, background 0.2s'
  };

  const labelStyle: CSSProperties = {
    position: 'absolute',
    top: '-18px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '10px',
    color: LEISURE_COLOR.start,
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
    textShadow: '0 0 4px rgba(0,0,0,0.8)'
  };

  // 카드 속도 기반 범위 표시
  const minSpeed = range.cardBaseSp;
  const maxSpeed = range.cardBaseSp * 2;

  return (
    <div className="leisure-range-indicator" style={style}>
      <div style={labelStyle}>
        {String.fromCodePoint(0x1F3AF)} 여유 ({minSpeed}~{maxSpeed})
      </div>
    </div>
  );
});

// =====================
// 무리 범위 인디케이터
// =====================

interface StrainRangeProps {
  range: StrainCardRange;
  playerMax: number;
  isDragging: boolean;
}

export const StrainRangeIndicator: FC<StrainRangeProps> = memo(function StrainRangeIndicator({
  range,
  playerMax,
  isDragging,
}) {
  const minPercent = (range.minSp / playerMax) * 100;
  const maxPercent = (range.maxSp / playerMax) * 100;

  const style: CSSProperties = {
    position: 'absolute',
    left: `${minPercent}%`,
    width: `${maxPercent - minPercent}%`,
    top: `${6 + range.offset}px`,
    height: '24px',
    background: isDragging
      ? `linear-gradient(90deg, ${STRAIN_COLOR.start}40, ${STRAIN_COLOR.end}40)`
      : STRAIN_COLOR.bg,
    borderRadius: '12px',
    border: `2px dashed ${isDragging ? STRAIN_COLOR.start : STRAIN_COLOR.end}`,
    boxShadow: isDragging
      ? `0 0 12px ${STRAIN_COLOR.shadow}, inset 0 0 8px ${STRAIN_COLOR.shadow}`
      : `0 0 6px ${STRAIN_COLOR.shadow}`,
    zIndex: 5,
    pointerEvents: 'none',
    transition: 'box-shadow 0.2s, background 0.2s'
  };

  const labelStyle: CSSProperties = {
    position: 'absolute',
    top: '-18px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '10px',
    color: STRAIN_COLOR.start,
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
    textShadow: '0 0 4px rgba(0,0,0,0.8)'
  };

  return (
    <div className="strain-range-indicator" style={style}>
      <div style={labelStyle}>
        {String.fromCodePoint(0x26A1)} 무리 (최대 -{STRAIN_MAX_OFFSET})
      </div>
    </div>
  );
});

// =====================
// 패리 범위 인디케이터
// =====================

interface ParryRangeProps {
  parryState: ParryState;
  parryIdx: number;
  playerMax: number;
  timelineProgress: number;
}

export const ParryRangeIndicator: FC<ParryRangeProps> = memo(function ParryRangeIndicator({
  parryState,
  parryIdx,
  playerMax,
  timelineProgress,
}) {
  if (!parryState?.active) return null;

  const parryMaxPercent = (parryState.maxSp / playerMax) * 100;
  const isExpired = timelineProgress > parryMaxPercent;
  const color = PARRY_COLORS[parryIdx % PARRY_COLORS.length];

  const rangeStyle: CSSProperties = {
    position: 'absolute',
    left: `${(parryState.centerSp / playerMax) * 100}%`,
    width: `${((parryState.maxSp - parryState.centerSp) / playerMax) * 100}%`,
    top: `${50 + parryIdx * 8}%`,
    transform: 'translateY(-50%)',
    height: '4px',
    background: isExpired
      ? 'linear-gradient(90deg, #6b7280, #9ca3af)'
      : `linear-gradient(90deg, ${color.start}, ${color.end})`,
    borderRadius: '2px',
    boxShadow: isExpired
      ? 'none'
      : `0 0 8px ${color.shadow}, 0 0 16px ${color.shadow}`,
    opacity: isExpired ? 0.4 : 1,
    zIndex: 10 + parryIdx,
    pointerEvents: 'none',
    transition: 'opacity 0.3s, background 0.3s, box-shadow 0.3s'
  };

  const markerBaseStyle: CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '8px',
    height: '16px',
    borderRadius: '2px',
    transition: 'background 0.3s, box-shadow 0.3s'
  };

  return (
    <div className="parry-range-indicator" style={rangeStyle}>
      {/* 시작점 마커 */}
      <div style={{
        ...markerBaseStyle,
        left: 0,
        background: isExpired ? '#6b7280' : color.start,
        boxShadow: isExpired ? 'none' : `0 0 6px ${color.shadow}`,
      }} />
      {/* 끝점 마커 */}
      <div style={{
        ...markerBaseStyle,
        right: 0,
        left: 'auto',
        transform: 'translate(50%, -50%)',
        background: isExpired ? '#9ca3af' : color.end,
        boxShadow: isExpired ? 'none' : `0 0 6px ${color.shadow}`,
      }} />
    </div>
  );
});
