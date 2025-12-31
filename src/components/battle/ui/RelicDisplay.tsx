/**
 * RelicDisplay.tsx
 *
 * 상단 상징 표시 컴포넌트
 * 최적화: React.memo + 스타일 상수 추출 + useMemo
 */

import { FC, DragEvent, memo, useMemo, useCallback } from 'react';
import type { CSSProperties } from 'react';
import type {
  UIRelicEffect as RelicEffect,
  UIRelic as Relic,
  UIRelicsMap as RelicsMap,
  RelicRarities,
  RelicDisplayActions as Actions
} from '../../../types';

// =====================
// 스타일 상수
// =====================

const CONTAINER_STYLE: CSSProperties = {
  position: 'fixed',
  top: '12px',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 4000,
  pointerEvents: 'none'
};

const INNER_CONTAINER_STYLE: CSSProperties = {
  display: 'flex',
  gap: '6px',
  padding: '8px 12px',
  background: 'rgba(15, 23, 42, 0.9)',
  border: '2px solid rgba(148, 163, 184, 0.5)',
  borderRadius: '12px',
  boxShadow: '0 0 15px rgba(148, 163, 184, 0.3)',
  pointerEvents: 'auto'
};

const RELIC_WRAPPER_STYLE: CSSProperties = {
  position: 'relative'
};

const RELIC_BASE_STYLE: CSSProperties = {
  fontSize: '2rem',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  borderRadius: '8px'
};

const TOOLTIP_BASE: CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: '50%',
  transform: 'translateX(-50%)',
  marginTop: '8px',
  background: 'rgba(15, 23, 42, 0.98)',
  borderRadius: '8px',
  padding: '12px 16px',
  minWidth: '220px',
  zIndex: 1000,
  pointerEvents: 'none'
};

const TOOLTIP_HEADER_STYLE: CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 'bold',
  marginBottom: '4px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px'
};

const TOOLTIP_EMOJI_STYLE: CSSProperties = {
  fontSize: '1.3rem'
};

const TOOLTIP_DESC_STYLE: CSSProperties = {
  fontSize: '0.9rem',
  color: '#e2e8f0',
  lineHeight: 1.5
};

// 색상 상수
const PERSISTENT_COLOR = { r: 135, g: 206, b: 235 }; // 하늘색
const ACTIVATED_COLOR = { r: 251, g: 191, b: 36 };   // 황금색

interface RelicDisplayProps {
  orderedRelicList: string[] | null;
  RELICS: RelicsMap;
  RELIC_RARITIES: RelicRarities;
  RELIC_RARITY_COLORS: Record<string, string>;
  relicActivated: string | null;
  activeRelicSet: Set<string>;
  hoveredRelic: string | null;
  setHoveredRelic: (relicId: string | null) => void;
  actions: Actions;
  handleRelicDragStart: (index: number, relicId: string) => (e: DragEvent<HTMLDivElement>) => void;
  handleRelicDragOver: (e: DragEvent<HTMLDivElement>) => void;
  handleRelicDrop: (index: number) => (e: DragEvent<HTMLDivElement>) => void;
}

export const RelicDisplay: FC<RelicDisplayProps> = memo(({
  orderedRelicList,
  RELICS,
  RELIC_RARITIES,
  RELIC_RARITY_COLORS,
  relicActivated,
  activeRelicSet,
  hoveredRelic,
  setHoveredRelic,
  actions,
  handleRelicDragStart,
  handleRelicDragOver,
  handleRelicDrop
}) => {
  // 희귀도 텍스트 메모이제이션
  const rarityText = useMemo((): Record<string, string> => ({
    [RELIC_RARITIES.COMMON]: '일반',
    [RELIC_RARITIES.RARE]: '희귀',
    [RELIC_RARITIES.SPECIAL]: '특별',
    [RELIC_RARITIES.LEGENDARY]: '전설'
  }), [RELIC_RARITIES]);

  // 상징 스타일 생성 함수
  const getRelicStyle = useCallback((
    isHighlighted: boolean,
    isPersistent: boolean,
    isHovered: boolean,
    isActivated: boolean
  ): CSSProperties => {
    const color = isPersistent ? PERSISTENT_COLOR : ACTIVATED_COLOR;
    const brightness = isPersistent ? 1.05 : 1.15;
    const glowIntensity = isPersistent ? 0.15 : 0.35;
    const bgOpacity = isPersistent ? 0.06 : 0.12;
    const borderOpacity = isPersistent ? 0.25 : 0.5;
    const shadowIntensity = isPersistent ? 0.25 : 0.5;

    return {
      ...RELIC_BASE_STYLE,
      filter: isHighlighted ? `brightness(${brightness}) drop-shadow(0 0 4px rgba(${color.r}, ${color.g}, ${color.b}, ${glowIntensity}))` : 'brightness(1)',
      transform: isHovered ? 'scale(1.12)' : (isActivated ? 'scale(1.16)' : 'scale(1)'),
      animation: isActivated ? 'relicActivate 0.4s ease' : 'none',
      background: isHighlighted ? `rgba(${color.r}, ${color.g}, ${color.b}, ${bgOpacity})` : 'transparent',
      border: isHighlighted ? `1px solid rgba(${color.r}, ${color.g}, ${color.b}, ${borderOpacity})` : '1px solid transparent',
      boxShadow: isHighlighted ? `0 0 15px rgba(${color.r}, ${color.g}, ${color.b}, ${shadowIntensity})` : 'none'
    };
  }, []);

  // 툴팁 스타일 생성 함수
  const getTooltipStyle = useCallback((rarityColor: string): CSSProperties => ({
    ...TOOLTIP_BASE,
    border: `2px solid ${rarityColor}`,
    boxShadow: `0 4px 20px ${rarityColor}66`
  }), []);

  if (!orderedRelicList || orderedRelicList.length === 0) {
    return null;
  }

  return (
    <div style={CONTAINER_STYLE}>
      <div style={INNER_CONTAINER_STYLE}>
        {orderedRelicList.map((relicId, index) => {
          const relic = RELICS[relicId];
          if (!relic) return null;

          const isActivated = relicActivated === relicId || activeRelicSet.has(relicId);
          const isHovered = hoveredRelic === relicId;
          // 지속 강조 제외 대상
          const isPersistent = (relic.effects?.type === 'PASSIVE'
            && relicId !== 'etherGem'
            && relicId !== 'devilDice'
            && relicId !== 'rareStone'
            && !relic.effects?.etherCardMultiplier
            && !relic.effects?.etherMultiplier)
            || relic.effects?.type === 'ON_TURN_START'
            || relicId === 'bloodShackles';
          const isHighlighted = isPersistent || isActivated;

          const relicStyle = getRelicStyle(isHighlighted, isPersistent, isHovered, isActivated);
          const rarityColor = RELIC_RARITY_COLORS[relic.rarity];
          const tooltipStyle = getTooltipStyle(rarityColor);

          return (
            <div
              key={index}
              style={RELIC_WRAPPER_STYLE}
              draggable
              onDragStart={handleRelicDragStart(index, relicId)}
              onDragOver={handleRelicDragOver}
              onDrop={handleRelicDrop(index)}
              onMouseDown={() => actions.setRelicActivated(relicActivated === relicId ? null : relicId)}
            >
              <div
                onMouseEnter={() => setHoveredRelic(relicId)}
                onMouseLeave={() => setHoveredRelic(null)}
                style={relicStyle}
              >
                <span>{relic.emoji}</span>
              </div>

              {/* 개별 툴팁 */}
              {isHovered && (
                <div style={tooltipStyle}>
                  <div style={{ ...TOOLTIP_HEADER_STYLE, color: rarityColor }}>
                    <span style={TOOLTIP_EMOJI_STYLE}>{relic.emoji}</span>
                    {relic.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: rarityColor, opacity: 0.8, marginBottom: '8px' }}>
                    {rarityText[relic.rarity] || '알 수 없음'}
                  </div>
                  <div style={TOOLTIP_DESC_STYLE}>
                    {relic.description}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
