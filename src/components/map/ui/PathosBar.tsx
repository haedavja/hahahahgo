/**
 * PathosBar.tsx
 * 장착된 파토스(액티브) 표시 UI 컴포넌트
 */

import { memo, useState, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useGameStore } from '../../../state/gameStore';
import { useShallow } from 'zustand/shallow';
import { PATHOS, type Pathos } from '../../../data/growth/pathosData';

// =====================
// 스타일 상수
// =====================

const CONTAINER_STYLE: CSSProperties = {
  position: "absolute",
  top: "70px", // RelicsBar 아래
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 10000,
  pointerEvents: 'none',
};

const BAR_STYLE: CSSProperties = {
  display: 'flex',
  gap: '6px',
  padding: '6px 10px',
  background: 'rgba(15, 23, 42, 0.9)',
  border: '2px solid rgba(244, 114, 182, 0.5)', // 파토스 색상
  borderRadius: '10px',
  boxShadow: '0 0 12px rgba(244, 114, 182, 0.3)',
  pointerEvents: 'auto',
};

const ITEM_WRAPPER_STYLE: CSSProperties = {
  position: 'relative',
};

const TYPE_ICONS: Record<string, string> = {
  sword: '⚔️',
  gun: '🔫',
  common: '✨',
};

export const PathosBar = memo(function PathosBar() {
  const { equippedPathos } = useGameStore(
    useShallow((state) => ({
      equippedPathos: state.growth?.equippedPathos || [],
    }))
  );

  const [hoveredPathos, setHoveredPathos] = useState<string | null>(null);

  const handleMouseEnter = useCallback((pathosId: string) => () => {
    setHoveredPathos(pathosId);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredPathos(null);
  }, []);

  // 파토스 아이템 스타일
  const getItemStyle = useCallback((isHovered: boolean): CSSProperties => ({
    fontSize: '1.2rem',
    padding: '4px 8px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'default',
    transition: 'all 0.2s ease',
    transform: isHovered ? 'scale(1.05)' : 'scale(1)',
    background: isHovered ? 'rgba(244, 114, 182, 0.2)' : 'transparent',
    border: isHovered ? '1px solid rgba(244, 114, 182, 0.6)' : '1px solid transparent',
    borderRadius: '6px',
    color: '#f472b6',
    fontWeight: 'bold',
    fontSize: '12px',
  }), []);

  // 툴팁 스타일
  const tooltipStyle: CSSProperties = useMemo(() => ({
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginTop: '8px',
    background: 'rgba(15, 23, 42, 0.98)',
    border: '2px solid #f472b6',
    borderRadius: '8px',
    padding: '10px 14px',
    minWidth: '200px',
    boxShadow: '0 4px 20px rgba(244, 114, 182, 0.4)',
    zIndex: 1000,
    pointerEvents: 'none',
  }), []);

  // 장착된 파토스가 없으면 표시 안함
  if (!equippedPathos || equippedPathos.length === 0) {
    return null;
  }

  return (
    <div style={CONTAINER_STYLE}>
      <div style={BAR_STYLE}>
        <span style={{ color: '#f472b6', fontSize: '11px', opacity: 0.7, marginRight: '4px' }}>
          파토스:
        </span>
        {equippedPathos.map((pathosId: string) => {
          const pathos = PATHOS[pathosId] as Pathos | undefined;
          if (!pathos) return null;

          const isHovered = hoveredPathos === pathosId;
          const typeIcon = TYPE_ICONS[pathos.type] || '✨';

          return (
            <div
              key={pathosId}
              style={ITEM_WRAPPER_STYLE}
              onMouseEnter={handleMouseEnter(pathosId)}
              onMouseLeave={handleMouseLeave}
            >
              <div style={getItemStyle(isHovered)}>
                <span>{typeIcon}</span>
                <span>{pathos.name}</span>
              </div>

              {/* 툴팁 */}
              {isHovered && (
                <div style={tooltipStyle}>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    color: '#f472b6',
                    marginBottom: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>{typeIcon}</span>
                    {pathos.name}
                  </div>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#e2e8f0',
                    lineHeight: '1.5'
                  }}>
                    {pathos.description}
                  </div>
                  {pathos.cooldown && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#94a3b8',
                      marginTop: '6px'
                    }}>
                      쿨다운: {pathos.cooldown}턴
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
