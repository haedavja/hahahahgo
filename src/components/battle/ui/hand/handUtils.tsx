/**
 * @file handUtils.ts
 * @description 손패 영역 유틸리티 함수
 */

import type { FC, MouseEvent } from 'react';
import { CARD_COLORS } from './handStyles';

// =====================
// 아이콘 컴포넌트
// =====================

interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

/** X 아이콘 */
export const XIcon: FC<IconProps> = ({ size = 24, className = "", strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// =====================
// 헬퍼 함수
// =====================

/** 카드 색상 결정 */
export const getCardColors = (isMainSpecial?: boolean, isSubSpecial?: boolean) => ({
  costColor: isMainSpecial ? CARD_COLORS.MAIN_SPECIAL : isSubSpecial ? CARD_COLORS.SUB_SPECIAL : CARD_COLORS.DEFAULT,
  nameColor: isMainSpecial ? CARD_COLORS.MAIN_SPECIAL : isSubSpecial ? CARD_COLORS.SUB_SPECIAL_NAME : CARD_COLORS.DEFAULT,
});

/** 카드 타입에 따른 CSS 클래스 반환 */
export const getCardTypeClass = (type: string): string => {
  if (type === 'attack') return 'attack';
  if (type === 'special') return 'special';
  return 'general';
};

/** 호버 이펙트 핸들러 생성 */
export const createHoverHandlers = (shadowColor: string) => ({
  onMouseEnter: (e: MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'scale(1.08)';
    e.currentTarget.style.boxShadow = `0 4px 16px ${shadowColor.replace('0.5', '0.7')}`;
  },
  onMouseLeave: (e: MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.boxShadow = `0 2px 12px ${shadowColor}`;
  },
});
