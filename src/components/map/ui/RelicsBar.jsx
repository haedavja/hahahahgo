/**
 * RelicsBar.jsx
 * 상징(Relics) 표시 UI 컴포넌트
 */

import { useRef } from 'react';
import { RELICS, RELIC_RARITIES } from '../../../data/relics';
import { RELIC_RARITY_COLORS } from '../../../lib/relics';

export function RelicsBar({
  orderedRelics,
  hoveredRelic,
  relicActivated,
  actions,
}) {
  const dragRelicIndexRef = useRef(null);

  if (!orderedRelics || orderedRelics.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: "absolute",
      top: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 10000,
      pointerEvents: 'none',
    }}>
      <div style={{
        display: 'flex',
        gap: '6px',
        padding: '8px 12px',
        background: 'rgba(15, 23, 42, 0.9)',
        border: '2px solid rgba(148, 163, 184, 0.5)',
        borderRadius: '12px',
        boxShadow: '0 0 15px rgba(148, 163, 184, 0.3)',
        pointerEvents: 'auto',
      }}>
        {orderedRelics.map((relicId, index) => {
          const relic = RELICS[relicId];
          if (!relic) return null;

          const isHovered = hoveredRelic === relicId;
          const isActivated = relicActivated === relicId;
          const rarityText = {
            [RELIC_RARITIES.COMMON]: '일반',
            [RELIC_RARITIES.RARE]: '희귀',
            [RELIC_RARITIES.SPECIAL]: '특별',
            [RELIC_RARITIES.LEGENDARY]: '전설'
          }[relic.rarity] || '알 수 없음';

          return (
            <div
              key={index}
              style={{ position: 'relative' }}
              draggable
              onDragStart={(e) => {
                dragRelicIndexRef.current = index;
                actions.setRelicActivated(relicId);
                e.dataTransfer.effectAllowed = 'move';
                try {
                  const img = new Image();
                  img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9YQn1fEAAAAASUVORK5CYII=';
                  e.dataTransfer.setDragImage(img, 0, 0);
                } catch { }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                const from = dragRelicIndexRef.current;
                dragRelicIndexRef.current = null;
                actions.setRelicActivated(null);
                if (from === null || from === index) return;
                const next = Array.from(orderedRelics);
                const [item] = next.splice(from, 1);
                next.splice(index, 0, item);
                actions.setOrderedRelics(next);
              }}
              onMouseDown={() => {
                actions.setRelicActivated(prev => prev === relicId ? null : relicId);
              }}
            >
              <div
                onMouseEnter={() => actions.setHoveredRelic(relicId)}
                onMouseLeave={() => actions.setHoveredRelic(null)}
                style={{
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
                }}>
                <span>{relic.emoji}</span>
              </div>

              {/* 개별 툴팁 */}
              {isHovered && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginTop: '8px',
                  background: 'rgba(15, 23, 42, 0.98)',
                  border: `2px solid ${RELIC_RARITY_COLORS[relic.rarity]}`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  minWidth: '220px',
                  boxShadow: `0 4px 20px ${RELIC_RARITY_COLORS[relic.rarity]}66`,
                  zIndex: 1000,
                  pointerEvents: 'none'
                }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: RELIC_RARITY_COLORS[relic.rarity], marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '1.3rem' }}>{relic.emoji}</span>
                    {relic.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: RELIC_RARITY_COLORS[relic.rarity], opacity: 0.8, marginBottom: '8px' }}>
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
}
