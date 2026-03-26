/**
 * RelicsBar.tsx
 * 상징(Relics) 표시 UI 컴포넌트
 * 최적화: React.memo + 스타일 상수 추출 + useCallback
 */

import { useRef, type DragEvent, memo, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { RELICS, RELIC_RARITIES } from '../../../data/relics';
import { RELIC_RARITY_COLORS } from '../../../lib/relics';

type Relic = typeof RELICS[keyof typeof RELICS];
const relicsRecord = RELICS as Record<string, Relic>;
const rarityColorsRecord = RELIC_RARITY_COLORS as Record<string, string>;

// =====================
// 스타일 상수
// =====================

const CONTAINER_STYLE: CSSProperties = {
  position: "absolute",
  top: "20px",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 10000,
  pointerEvents: 'none',
};

const BAR_STYLE: CSSProperties = {
  display: 'flex',
  gap: '6px',
  padding: '8px 12px',
  background: 'rgba(15, 23, 42, 0.9)',
  border: '2px solid rgba(148, 163, 184, 0.5)',
  borderRadius: '12px',
  boxShadow: '0 0 15px rgba(148, 163, 184, 0.3)',
  pointerEvents: 'auto',
};

const ITEM_WRAPPER_STYLE: CSSProperties = {
  position: 'relative',
};

const RARITY_TEXT_MAP: Record<string, string> = {
  [RELIC_RARITIES.COMMON]: '일반',
  [RELIC_RARITIES.RARE]: '희귀',
  [RELIC_RARITIES.SPECIAL]: '특별',
  [RELIC_RARITIES.LEGENDARY]: '전설',
};

// 투명 1x1 이미지 (드래그용)
const TRANSPARENT_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9YQn1fEAAAAASUVORK5CYII=';

interface RelicsBarProps {
  orderedRelics: string[];
  hoveredRelic: string | null;
  relicActivated: string | null;
  actions: {
    setHoveredRelic: (relicId: string | null) => void;
    setRelicActivated: (relicId: string | null | ((prev: string | null) => string | null)) => void;
    setOrderedRelics: (relics: string[] | ((prev: string[]) => string[])) => void;
  };
}

export const RelicsBar = memo(function RelicsBar({
  orderedRelics,
  hoveredRelic,
  relicActivated,
  actions,
}: RelicsBarProps) {
  const dragRelicIndexRef = useRef<number | null>(null);

  // 드래그 이벤트 핸들러 메모이제이션
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const createDragStartHandler = useCallback((index: number, relicId: string) => (e: DragEvent<HTMLDivElement>) => {
    dragRelicIndexRef.current = index;
    actions.setRelicActivated(relicId);
    e.dataTransfer.effectAllowed = 'move';
    try {
      const img = new Image();
      img.src = TRANSPARENT_IMAGE;
      e.dataTransfer.setDragImage(img, 0, 0);
    } catch { /* ignore */ }
  }, [actions]);

  const createDropHandler = useCallback((index: number) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const from = dragRelicIndexRef.current;
    dragRelicIndexRef.current = null;
    actions.setRelicActivated(null);
    if (from === null || from === index) return;
    const next = Array.from(orderedRelics);
    const [item] = next.splice(from, 1);
    next.splice(index, 0, item);
    actions.setOrderedRelics(next);
  }, [actions, orderedRelics]);

  const createMouseDownHandler = useCallback((relicId: string) => () => {
    actions.setRelicActivated((prev: string | null) => prev === relicId ? null : relicId);
  }, [actions]);

  const createMouseEnterHandler = useCallback((relicId: string) => () => {
    actions.setHoveredRelic(relicId);
  }, [actions]);

  const handleMouseLeave = useCallback(() => {
    actions.setHoveredRelic(null);
  }, [actions]);

  // 동적 아이템 스타일 생성
  const getItemStyle = useCallback((isActivated: boolean, isHovered: boolean): CSSProperties => ({
    fontSize: '2rem',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    transform: isActivated ? 'scale(1.2)' : (isHovered ? 'scale(1.15)' : 'scale(1)'),
    filter: isActivated ? 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.75))' : 'drop-shadow(0 0 4px rgba(255,255,255,0.15))',
    background: isActivated ? 'rgba(251, 191, 36, 0.2)' : (isHovered ? 'rgba(148, 163, 184, 0.15)' : 'transparent'),
    border: isActivated ? '1px solid rgba(251, 191, 36, 0.6)' : '1px solid transparent',
    borderRadius: '8px',
  }), []);

  // 툴팁 스타일 생성
  const getTooltipStyle = useCallback((rarityColor: string): CSSProperties => ({
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginTop: '8px',
    background: 'rgba(15, 23, 42, 0.98)',
    border: `2px solid ${rarityColor}`,
    borderRadius: '8px',
    padding: '12px 16px',
    minWidth: '220px',
    boxShadow: `0 4px 20px ${rarityColor}66`,
    zIndex: 1000,
    pointerEvents: 'none',
  }), []);

  if (!orderedRelics || orderedRelics.length === 0) {
    return null;
  }

  return (
    <div style={CONTAINER_STYLE}>
      <div style={BAR_STYLE}>
        {orderedRelics.map((relicId: string, index: number) => {
          const relic = relicsRecord[relicId];
          if (!relic) return null;

          const isHovered = hoveredRelic === relicId;
          const isActivated = relicActivated === relicId;
          const rarityText = RARITY_TEXT_MAP[relic.rarity] || '알 수 없음';
          const rarityColor = rarityColorsRecord[relic.rarity];

          return (
            <div
              key={index}
              style={ITEM_WRAPPER_STYLE}
              draggable
              onDragStart={createDragStartHandler(index, relicId)}
              onDragOver={handleDragOver}
              onDrop={createDropHandler(index)}
              onMouseDown={createMouseDownHandler(relicId)}
            >
              <div
                onMouseEnter={createMouseEnterHandler(relicId)}
                onMouseLeave={handleMouseLeave}
                style={getItemStyle(isActivated, isHovered)}
              >
                <span>{relic.emoji}</span>
              </div>

              {/* 개별 툴팁 */}
              {isHovered && (
                <div style={getTooltipStyle(rarityColor)}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: rarityColor, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '1.3rem' }}>{relic.emoji}</span>
                    {relic.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: rarityColor, opacity: 0.8, marginBottom: '8px' }}>
                    {rarityText}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#e2e8f0', lineHeight: '1.5' }}>
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
