/**
 * cardRenderingUtils.tsx
 *
 * 카드 렌더링 관련 유틸리티 함수
 */

import { ReactElement } from 'react';
import { getEnhancementColor, getEnhancementLabel } from '../../../lib/cardEnhancementUtils';

interface RarityBadge {
  color: string;
  label: string;
}

interface Card {
  id: string;
  name: string;
  rarity?: string;
  enhancementLevel?: number;
}

type CardUpgrades = Record<string, string | undefined>;

/**
 * 희귀도 배지 설정
 */
export const RARITY_BADGES: Record<string, RarityBadge> = {
  rare: { color: '#60a5fa', label: '희귀' },
  special: { color: '#34d399', label: '특별' },
  legendary: { color: '#fbbf24', label: '전설' },
};

/**
 * 카드의 표시 희귀도 가져오기 (업그레이드 적용)
 * @param card - 카드 객체
 * @param cardUpgrades - 카드 업그레이드 정보
 * @returns 표시할 희귀도
 */
export function getCardDisplayRarity(card: Card, cardUpgrades: CardUpgrades): string {
  return cardUpgrades[card.id] || card.rarity || 'common';
}

/**
 * 희귀도 배지 렌더링
 * @param card - 카드 객체
 * @param cardUpgrades - 카드 업그레이드 정보
 * @returns 희귀도 배지 컴포넌트
 */
export function renderRarityBadge(card: Card, cardUpgrades: CardUpgrades): ReactElement | null {
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
 * 강화 레벨 배지 렌더링
 * @param enhancementLevel - 강화 레벨 (0이면 null 반환)
 * @returns 강화 배지 컴포넌트
 */
export function renderEnhancementBadge(enhancementLevel: number | undefined): ReactElement | null {
  if (!enhancementLevel || enhancementLevel <= 0) return null;
  const color = getEnhancementColor(enhancementLevel);
  const label = getEnhancementLabel(enhancementLevel);
  return (
    <span
      title={`강화 ${label}`}
      style={{
        fontSize: '10px',
        padding: '1px 5px',
        borderRadius: '4px',
        background: color,
        color: '#0f172a',
        fontWeight: 700,
        marginLeft: '4px',
        boxShadow: `0 0 6px ${color}`,
      }}
    >
      {label}
    </span>
  );
}

/**
 * 카드 이름과 배지를 함께 렌더링
 * @param card - 카드 객체
 * @param cardUpgrades - 카드 업그레이드 정보
 * @param defaultColor - 기본 색상 (배지가 없을 때)
 * @returns 카드 이름 컴포넌트
 */
export function renderNameWithBadge(card: Card, cardUpgrades: CardUpgrades, defaultColor: string): ReactElement {
  const badge = RARITY_BADGES[getCardDisplayRarity(card, cardUpgrades)];
  const enhancementBadge = renderEnhancementBadge(card.enhancementLevel);

  if (!badge) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', color: defaultColor }}>
        {card.name}
        {enhancementBadge}
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
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
      {enhancementBadge}
    </span>
  );
}
