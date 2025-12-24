/**
 * cardRenderingUtils.jsx
 *
 * 카드 렌더링 관련 유틸리티 함수
 */

/**
 * 희귀도 배지 설정
 */
export const RARITY_BADGES = {
  rare: { color: '#60a5fa', label: '희귀' },
  special: { color: '#34d399', label: '특별' },
  legendary: { color: '#fbbf24', label: '전설' },
};

/**
 * 카드의 표시 희귀도 가져오기 (업그레이드 적용)
 * @param {Object} card - 카드 객체
 * @param {Object} cardUpgrades - 카드 업그레이드 정보
 * @returns {string} 표시할 희귀도
 */
export function getCardDisplayRarity(card, cardUpgrades) {
  return cardUpgrades[card.id] || card.rarity || 'common';
}

/**
 * 희귀도 배지 렌더링
 * @param {Object} card - 카드 객체
 * @param {Object} cardUpgrades - 카드 업그레이드 정보
 * @returns {JSX.Element|null} 희귀도 배지 컴포넌트
 */
export function renderRarityBadge(card, cardUpgrades) {
  const badge = RARITY_BADGES[getCardDisplayRarity(card, cardUpgrades)];
  if (!badge) return null;
  return (
    <span
      title={badge.label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: '12px',
        background: badge.color,
        color: '#0f172a',
        fontWeight: 800,
        boxShadow: `0 0 10px ${badge.color}`,
        marginLeft: '6px'
      }}
    >
      {badge.label}
    </span>
  );
}

/**
 * 카드 이름과 배지를 함께 렌더링
 * @param {Object} card - 카드 객체
 * @param {Object} cardUpgrades - 카드 업그레이드 정보
 * @param {string} defaultColor - 기본 색상 (배지가 없을 때)
 * @returns {JSX.Element} 카드 이름 컴포넌트
 */
export function renderNameWithBadge(card, cardUpgrades, defaultColor) {
  const badge = RARITY_BADGES[getCardDisplayRarity(card, cardUpgrades)];
  if (!badge) {
    return <span style={{ color: defaultColor }}>{card.name}</span>;
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span
        style={{
          color: '#0f172a',
          background: badge.color,
          padding: '2px 10px',
          borderRadius: '12px',
          fontWeight: 800,
          boxShadow: `0 0 10px ${badge.color}`
        }}
      >
        {card.name}
      </span>
    </span>
  );
}
