/**
 * RelicDisplay.tsx
 *
 * 상단 상징 표시 컴포넌트
 */

import { FC, DragEvent } from 'react';
import type {
  UIRelicEffect as RelicEffect,
  UIRelic as Relic,
  RelicsMap,
  RelicRarities,
  RelicDisplayActions as Actions
} from '../../../types';

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

export const RelicDisplay: FC<RelicDisplayProps> = ({
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
  if (!orderedRelicList || orderedRelicList.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '12px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 4000,
      pointerEvents: 'none'
    }}>
      <div style={{
        display: 'flex',
        gap: '6px',
        padding: '8px 12px',
        background: 'rgba(15, 23, 42, 0.9)',
        border: '2px solid rgba(148, 163, 184, 0.5)',
        borderRadius: '12px',
        boxShadow: '0 0 15px rgba(148, 163, 184, 0.3)',
        pointerEvents: 'auto'
      }}>
        {orderedRelicList.map((relicId, index) => {
          const relic = RELICS[relicId];
          if (!relic) return null;

          const isActivated = relicActivated === relicId || activeRelicSet.has(relicId);
          const isHovered = hoveredRelic === relicId;
          // 지속 강조 제외 대상: 에테르 결정/악마의 주사위/희귀한 조약돌(etherCardMultiplier)
          const isPersistent = (relic.effects?.type === 'PASSIVE'
            && relicId !== 'etherGem'
            && relicId !== 'devilDice'
            && relicId !== 'rareStone' // 희귀한 조약돌은 상시 강조 제외
            && !relic.effects?.etherCardMultiplier
            && !relic.effects?.etherMultiplier)
            || relic.effects?.type === 'ON_TURN_START' // 피피한 갑옷
            || relicId === 'bloodShackles'; // 피의 족쇄 - 전투 중 지속 강조
          const isHighlighted = isPersistent || isActivated;

          // 색상 결정: 패시브는 하늘색, 일시 발동은 황금색
          const highlightColor = isPersistent
            ? { r: 135, g: 206, b: 235 } // 하늘색
            : { r: 251, g: 191, b: 36 };  // 황금색

          // 밝기 설정: 패시브는 덜 밝게
          const brightness = isPersistent ? 1.05 : 1.15;
          const glowIntensity = isPersistent ? 0.15 : 0.35;
          const bgOpacity = isPersistent ? 0.06 : 0.12;
          const borderOpacity = isPersistent ? 0.25 : 0.5;
          const shadowIntensity = isPersistent ? 0.25 : 0.5;

          const rarityText: Record<string, string> = {
            [RELIC_RARITIES.COMMON]: '일반',
            [RELIC_RARITIES.RARE]: '희귀',
            [RELIC_RARITIES.SPECIAL]: '특별',
            [RELIC_RARITIES.LEGENDARY]: '전설'
          };

          return (
            <div
              key={index}
              style={{ position: 'relative' }}
              draggable
              onDragStart={handleRelicDragStart(index, relicId)}
              onDragOver={handleRelicDragOver}
              onDrop={handleRelicDrop(index)}
              onMouseDown={() => actions.setRelicActivated(relicActivated === relicId ? null : relicId)} // 클릭 시 토글
            >
              <div
                onMouseEnter={() => setHoveredRelic(relicId)}
                onMouseLeave={() => setHoveredRelic(null)}
                style={{
                  fontSize: '2rem',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  filter: isHighlighted ? `brightness(${brightness}) drop-shadow(0 0 4px rgba(${highlightColor.r}, ${highlightColor.g}, ${highlightColor.b}, ${glowIntensity}))` : 'brightness(1)',
                  transform: isHovered ? 'scale(1.12)' : (isActivated ? 'scale(1.16)' : 'scale(1)'),
                  animation: isActivated ? 'relicActivate 0.4s ease' : 'none',
                  background: isHighlighted ? `rgba(${highlightColor.r}, ${highlightColor.g}, ${highlightColor.b}, ${bgOpacity})` : 'transparent',
                  borderRadius: '8px',
                  border: isHighlighted ? `1px solid rgba(${highlightColor.r}, ${highlightColor.g}, ${highlightColor.b}, ${borderOpacity})` : '1px solid transparent',
                  boxShadow: isHighlighted ? `0 0 15px rgba(${highlightColor.r}, ${highlightColor.g}, ${highlightColor.b}, ${shadowIntensity})` : 'none'
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
                    {rarityText[relic.rarity] || '알 수 없음'}
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
};
