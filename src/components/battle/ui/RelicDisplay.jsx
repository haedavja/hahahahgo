/**
 * RelicDisplay.jsx
 *
 * 상단 유물 표시 컴포넌트
 */

export const RelicDisplay = ({
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
                  filter: isHighlighted ? 'brightness(1.15) drop-shadow(0 0 4px rgba(251, 191, 36, 0.35))' : 'brightness(1)',
                  transform: isHovered ? 'scale(1.12)' : (isActivated ? 'scale(1.16)' : 'scale(1)'),
                  animation: isActivated ? 'relicActivate 0.4s ease' : 'none',
                  background: isHighlighted ? 'rgba(251, 191, 36, 0.12)' : 'transparent',
                  borderRadius: '8px',
                  border: isHighlighted ? '1px solid rgba(251, 191, 36, 0.5)' : '1px solid transparent',
                  boxShadow: isHighlighted ? '0 0 15px rgba(251, 191, 36, 0.5)' : 'none'
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
};
