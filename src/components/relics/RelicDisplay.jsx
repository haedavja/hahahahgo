import { useState, useRef } from 'react';
import { getRelicById, RELIC_RARITIES } from '../../data/relics';

/**
 * 유물 등급별 색상
 */
const RARITY_COLORS = {
  [RELIC_RARITIES.COMMON]: {
    border: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.1)',
    text: '#cbd5e1',
  },
  [RELIC_RARITIES.RARE]: {
    border: '#60a5fa',
    bg: 'rgba(96, 165, 250, 0.15)',
    text: '#93c5fd',
  },
  [RELIC_RARITIES.SPECIAL]: {
    border: '#a78bfa',
    bg: 'rgba(167, 139, 250, 0.15)',
    text: '#c4b5fd',
  },
  [RELIC_RARITIES.LEGENDARY]: {
    border: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.15)',
    text: '#fcd34d',
  },
};

/**
 * 등급 이름 한글 매핑
 */
const RARITY_NAMES = {
  [RELIC_RARITIES.COMMON]: '일반',
  [RELIC_RARITIES.RARE]: '희귀',
  [RELIC_RARITIES.SPECIAL]: '특별',
  [RELIC_RARITIES.LEGENDARY]: '전설',
};

/**
 * 단일 유물 아이콘 표시
 */
export function RelicIcon({ relicId, size = 'medium', onClick, showTooltip = true }) {
  const [hovered, setHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const iconRef = useRef(null);

  const relic = getRelicById(relicId);
  if (!relic) return null;

  const colors = RARITY_COLORS[relic.rarity];

  const sizes = {
    small: { width: 32, height: 32, fontSize: 18 },
    medium: { width: 48, height: 48, fontSize: 24 },
    large: { width: 64, height: 64, fontSize: 32 },
  };

  const sizeStyle = sizes[size] || sizes.medium;

  const handleMouseEnter = (e) => {
    if (!showTooltip) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.right + 8, y: rect.top });
    setHovered(true);
  };

  const handleMouseLeave = () => {
    setHovered(false);
  };

  return (
    <>
      <div
        ref={iconRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        style={{
          width: sizeStyle.width,
          height: sizeStyle.height,
          borderRadius: '8px',
          border: `2px solid ${colors.border}`,
          background: colors.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: sizeStyle.fontSize,
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
          boxShadow: hovered ? `0 0 12px ${colors.border}` : 'none',
        }}
      >
        {getRelicEmoji(relicId)}
      </div>

      {/* 툴팁 */}
      {showTooltip && hovered && (
        <div
          style={{
            position: 'fixed',
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            background: 'rgba(0, 0, 0, 0.95)',
            border: `2px solid ${colors.border}`,
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#fff',
            zIndex: 10000,
            pointerEvents: 'none',
            maxWidth: '280px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontWeight: 700, fontSize: '16px', color: colors.text }}>
              {relic.name}
            </div>
            <div style={{ fontSize: '12px', color: colors.border, fontWeight: 600 }}>
              {RARITY_NAMES[relic.rarity]}
            </div>
          </div>
          <div style={{ fontSize: '14px', lineHeight: 1.5, color: '#cbd5e1' }}>
            {relic.description}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * 유물 목록 표시 (가로 나열)
 */
export function RelicList({ relicIds = [], size = 'medium', onRelicClick }) {
  if (!relicIds || relicIds.length === 0) {
    return (
      <div style={{ fontSize: '14px', color: '#64748b', fontStyle: 'italic' }}>
        보유한 유물이 없습니다
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {relicIds.map(relicId => (
        <RelicIcon
          key={relicId}
          relicId={relicId}
          size={size}
          onClick={onRelicClick ? () => onRelicClick(relicId) : null}
        />
      ))}
    </div>
  );
}

/**
 * 유물 카드 표시 (상세 정보 포함)
 */
export function RelicCard({ relicId, onClick, selected = false }) {
  const relic = getRelicById(relicId);
  if (!relic) return null;

  const colors = RARITY_COLORS[relic.rarity];

  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px',
        borderRadius: '12px',
        border: `2px solid ${selected ? '#fbbf24' : colors.border}`,
        background: selected ? 'rgba(251, 191, 36, 0.1)' : colors.bg,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        boxShadow: selected ? '0 0 16px rgba(251, 191, 36, 0.4)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div style={{ fontSize: '32px' }}>
          {getRelicEmoji(relicId)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '18px', color: colors.text, marginBottom: '4px' }}>
            {relic.name}
          </div>
          <div style={{ fontSize: '12px', color: colors.border, fontWeight: 600 }}>
            {RARITY_NAMES[relic.rarity]}
          </div>
        </div>
      </div>
      <div style={{ fontSize: '14px', lineHeight: 1.6, color: '#cbd5e1' }}>
        {relic.description}
      </div>
      {relic.tags && relic.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
          {relic.tags.map(tag => (
            <span
              key={tag}
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'rgba(100, 116, 139, 0.3)',
                color: '#94a3b8',
                fontWeight: 600,
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 유물별 이모지 매핑
 */
function getRelicEmoji(relicId) {
  const emojiMap = {
    // 일반
    etherCrystal: '💎',
    longCoat: '🧥',
    sturdyArmor: '🛡️',
    trainingBoots: '👟',
    redHerb: '🌿',
    contract: '📜',
    rareStone: '🪨',
    coin: '🪙',

    // 희귀
    goldenHerb: '✨',
    immortalMask: '🎭',
    ironRing: '💍',
    wizardGloves: '🧤',
    luckyCoin: '🍀',
    celeryCarrot: '🥕',
    steelBoots: '🥾',
    redCompass: '🧭',
    referenceBook: '📚',

    // 특별
    effortDiary: '📓',
    loyaltyPotion: '🧪',
    ironHeart: '❤️',
    devilDice: '🎲',
    healthCheck: '📋',
  };

  return emojiMap[relicId] || '❓';
}
