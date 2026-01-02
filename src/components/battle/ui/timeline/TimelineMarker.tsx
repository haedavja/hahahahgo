/**
 * @file TimelineMarker.tsx
 * @description 타임라인 카드 마커 컴포넌트
 */

import { memo } from 'react';
import type { FC, CSSProperties } from 'react';
import {
  LEISURE_COLOR,
  STRAIN_COLOR,
  STRAIN_MAX_OFFSET,
} from './timelineStyles';

interface IconProps {
  size?: number;
  className?: string;
}

// 기본 아이콘
const Sword: FC<IconProps> = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2" />
  </svg>
);

const Shield: FC<IconProps> = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

// =====================
// 플레이어 마커
// =====================

interface PlayerMarkerProps {
  action: {
    sp?: number;
    card: {
      id?: string;
      type: string;
      damage?: number;
      block?: number;
      hits?: number;
      speedCost?: number;
      ignoreStrength?: boolean;
      traits?: string[];
      strainOffset?: number;
      icon?: FC<IconProps>;
      __handUid?: string;
      __uid?: string;
    };
  };
  idx: number;
  playerMax: number;
  offset: number;
  strengthBonus: number;
  growingDefenseBonus: number;
  isExecuting: boolean;
  isUsed: boolean;
  hasLeisure: boolean;
  hasStrain: boolean;
  isDragging: boolean;
  isStrainDragging: boolean;
  currentStrainOffset: number;
  canDrag: boolean;
  canDragStrain: boolean;
  phase: string;
  onLeisureDragStart: (cardUid: string) => void;
  onStrainDragStart: (cardUid: string) => void;
}

export const PlayerTimelineMarker: FC<PlayerMarkerProps> = memo(function PlayerTimelineMarker({
  action,
  idx,
  playerMax,
  offset,
  strengthBonus,
  growingDefenseBonus,
  isExecuting,
  isUsed,
  hasLeisure,
  hasStrain,
  isDragging,
  isStrainDragging,
  currentStrainOffset,
  canDrag,
  canDragStrain,
  phase,
  onLeisureDragStart,
  onStrainDragStart,
}) {
  const { card, sp } = action;
  const Icon = card.icon || (card.type === 'attack' ? Sword : Shield);
  const cardUid = card.__handUid || card.__uid || `card-${idx}`;

  // 수치 계산
  const effectiveStrengthBonus = card.ignoreStrength ? 0 : strengthBonus;
  const num = card.type === 'attack'
    ? ((card.damage ?? 0) + strengthBonus) * (card.hits || 1)
    : (card.type === 'general' || card.type === 'defense')
      ? (card.block || 0) + effectiveStrengthBonus + growingDefenseBonus
      : 0;

  const normalizedPosition = Math.min(((sp ?? 0) / playerMax) * 100, 100);
  const canDragAny = canDrag || canDragStrain;

  // 스타일 계산
  const getTraitStyles = (): CSSProperties => {
    if (hasLeisure && phase === 'respond') {
      return {
        border: `2px solid ${LEISURE_COLOR.start}`,
        boxShadow: isDragging
          ? `0 0 16px ${LEISURE_COLOR.shadow}, 0 0 32px ${LEISURE_COLOR.shadow}`
          : `0 0 8px ${LEISURE_COLOR.shadow}`,
        transform: isDragging ? 'scale(1.2)' : 'none',
        zIndex: isDragging ? 100 : 20
      };
    }
    if (hasStrain && phase === 'respond') {
      return {
        border: `2px solid ${currentStrainOffset > 0 ? STRAIN_COLOR.end : STRAIN_COLOR.start}`,
        boxShadow: isStrainDragging
          ? `0 0 16px ${STRAIN_COLOR.shadow}, 0 0 32px ${STRAIN_COLOR.shadow}`
          : `0 0 8px ${STRAIN_COLOR.shadow}`,
        transform: isStrainDragging ? 'scale(1.2)' : 'none',
        zIndex: isStrainDragging ? 100 : 20
      };
    }
    return {};
  };

  const classNames = [
    'timeline-marker',
    'marker-player',
    isExecuting ? 'timeline-active' : '',
    isUsed ? 'timeline-used' : '',
    hasLeisure ? 'leisure-card' : '',
    hasStrain ? 'strain-card' : ''
  ].filter(Boolean).join(' ');

  const handleMouseDown = () => {
    if (canDrag) {
      onLeisureDragStart(cardUid);
    } else if (canDragStrain) {
      onStrainDragStart(cardUid);
    }
  };

  return (
    <div
      className={classNames}
      style={{
        left: `${normalizedPosition}%`,
        top: `${6 + offset}px`,
        cursor: canDragAny ? 'grab' : 'default',
        ...getTraitStyles()
      }}
      onMouseDown={canDragAny ? handleMouseDown : undefined}
    >
      <Icon size={14} className="text-white" />
      <span className="text-white text-xs font-bold">{num > 0 ? num : ''}</span>

      {/* 여유 특성 드래그 힌트 */}
      {hasLeisure && phase === 'respond' && (
        <span style={{
          position: 'absolute',
          bottom: '-16px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '8px',
          color: LEISURE_COLOR.start,
          fontWeight: 'bold',
          whiteSpace: 'nowrap'
        }}>
          {String.fromCodePoint(0x2194)} 드래그
        </span>
      )}

      {/* 무리 특성 드래그 힌트 */}
      {hasStrain && phase === 'respond' && (
        <span style={{
          position: 'absolute',
          bottom: '-16px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '8px',
          color: currentStrainOffset >= STRAIN_MAX_OFFSET ? STRAIN_COLOR.end : STRAIN_COLOR.start,
          fontWeight: 'bold',
          whiteSpace: 'nowrap'
        }}>
          {currentStrainOffset >= STRAIN_MAX_OFFSET
            ? `${String.fromCodePoint(0x26A1)} 최대 (${String.fromCharCode(0x2212)}${currentStrainOffset})`
            : `${String.fromCodePoint(0x2190)} 드래그 (${String.fromCharCode(0x2212)}${currentStrainOffset}/${STRAIN_MAX_OFFSET})`}
        </span>
      )}
    </div>
  );
});

// =====================
// 적 마커
// =====================

interface EnemyMarkerProps {
  action: {
    sp?: number;
    card: {
      type: string;
      damage?: number;
      block?: number;
      hits?: number;
      icon?: FC<IconProps>;
    };
  };
  idx: number;
  enemyMax: number;
  offset: number;
  isExecuting: boolean;
  isUsed: boolean;
  isDestroying: boolean;
  isFreezing: boolean;
  isFrozen: boolean;
  canShowTooltip: boolean;
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
}

export const EnemyTimelineMarker: FC<EnemyMarkerProps> = memo(function EnemyTimelineMarker({
  action,
  idx,
  enemyMax,
  offset,
  isExecuting,
  isUsed,
  isDestroying,
  isFreezing,
  isFrozen,
  canShowTooltip,
  onMouseEnter,
  onMouseLeave,
}) {
  const { card, sp } = action;
  const Icon = card.icon || (card.type === 'attack' ? Sword : Shield);
  const num = card.type === 'attack'
    ? ((card.damage ?? 0) * (card.hits || 1))
    : (card.block || 0);
  const normalizedPosition = Math.min(((sp ?? 0) / enemyMax) * 100, 100);

  const classNames = [
    'timeline-marker',
    'marker-enemy',
    isExecuting ? 'timeline-active' : '',
    isUsed ? 'timeline-used' : '',
    canShowTooltip ? 'insight-lv3-glow' : '',
    isDestroying ? 'timeline-destroying' : '',
    isFreezing ? 'timeline-freezing' : '',
    isFrozen ? 'timeline-frozen' : ''
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classNames}
      style={{ left: `${normalizedPosition}%`, top: `${6 + offset}px` }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="marker-content">
        <Icon size={14} className="text-white" />
        {canShowTooltip && <span className="insight-eye-badge">{String.fromCodePoint(0x1F441)}{String.fromCodePoint(0xFE0F)}</span>}
        <span className="text-white text-xs font-bold">{num > 0 ? num : ''}</span>
      </div>
    </div>
  );
});
