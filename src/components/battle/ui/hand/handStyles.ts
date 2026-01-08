/**
 * @file handStyles.ts
 * @description 손패 영역 컴포넌트 스타일 상수
 */

import type { CSSProperties } from 'react';

// =====================
// 카드 색상
// =====================

export const CARD_COLORS = {
  MAIN_SPECIAL: '#fcd34d',
  SUB_SPECIAL: '#60a5fa',
  SUB_SPECIAL_NAME: '#7dd3fc',
  DEFAULT: '#fff',
} as const;

// =====================
// 스타일 상수
// =====================

/** 협동 활성화 스타일 */
export const COOPERATION_ACTIVE_STYLE: CSSProperties = {
  boxShadow: '0 0 20px 4px rgba(34, 197, 94, 0.8), 0 0 40px 8px rgba(34, 197, 94, 0.4)',
  border: '3px solid #22c55e'
};

/** 타겟 유닛 배지 기본 스타일 */
export const TARGET_BADGE_BASE: CSSProperties = {
  background: 'linear-gradient(135deg, #dc2626, #991b1b)',
  color: '#fff',
  borderRadius: '8px',
  fontSize: '11px',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  zIndex: 15,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
  border: '1px solid #fca5a5',
};

/** 타겟 유닛 배지 스타일 (select phase) */
export const TARGET_BADGE_SELECT: CSSProperties = {
  ...TARGET_BADGE_BASE,
  position: 'absolute',
  bottom: '-8px',
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '2px 8px',
  gap: '4px',
  whiteSpace: 'nowrap',
};

/** 타겟 유닛 배지 스타일 (respond/resolve phase) */
export const TARGET_BADGE_OTHER: CSSProperties = {
  ...TARGET_BADGE_BASE,
  position: 'absolute',
  top: '-12px',
  right: '-8px',
  padding: '2px 6px',
  gap: '2px',
};

/** 순서 번호 배지 스타일 */
export const ORDER_BADGE_STYLE: CSSProperties = {
  position: 'absolute',
  top: '-12px',
  left: '50%',
  transform: 'translateX(-50%)',
  background: '#3b82f6',
  color: '#fff',
  borderRadius: '50%',
  width: '24px',
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold',
  fontSize: '14px',
  zIndex: 10,
  border: '2px solid #1e40af'
};

/** 카드 래퍼 기본 스타일 */
export const CARD_WRAPPER_BASE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  alignItems: 'center',
  position: 'relative',
};

/** 카드 래퍼 - 일반 상태 (첫 번째 카드) */
export const CARD_WRAPPER_NORMAL_FIRST: CSSProperties = {
  ...CARD_WRAPPER_BASE,
  marginLeft: '0',
  opacity: 1,
  filter: 'none',
  transition: 'opacity 0.3s ease, filter 0.3s ease',
};

/** 카드 래퍼 - 일반 상태 */
export const CARD_WRAPPER_NORMAL: CSSProperties = {
  ...CARD_WRAPPER_BASE,
  marginLeft: '8px',
  opacity: 1,
  filter: 'none',
  transition: 'opacity 0.3s ease, filter 0.3s ease',
};

/** 카드 래퍼 - 흐림 상태 (첫 번째 카드) */
export const CARD_WRAPPER_DIMMED_FIRST: CSSProperties = {
  ...CARD_WRAPPER_BASE,
  marginLeft: '0',
  opacity: 0.4,
  filter: 'grayscale(0.8) brightness(0.6)',
  transition: 'opacity 0.3s ease, filter 0.3s ease',
};

/** 카드 래퍼 - 흐림 상태 */
export const CARD_WRAPPER_DIMMED: CSSProperties = {
  ...CARD_WRAPPER_BASE,
  marginLeft: '8px',
  opacity: 0.4,
  filter: 'grayscale(0.8) brightness(0.6)',
  transition: 'opacity 0.3s ease, filter 0.3s ease',
};

/** 선택 단계 카드 래퍼 - 첫 번째 (활성) */
export const SELECT_CARD_WRAPPER_FIRST: CSSProperties = {
  ...CARD_WRAPPER_BASE,
  cursor: 'pointer',
  marginLeft: '0',
};

/** 선택 단계 카드 래퍼 - 첫 번째 (비활성) */
export const SELECT_CARD_WRAPPER_FIRST_DISABLED: CSSProperties = {
  ...CARD_WRAPPER_BASE,
  cursor: 'not-allowed',
  marginLeft: '0',
};

/** 선택 단계 카드 래퍼 (활성) */
export const SELECT_CARD_WRAPPER: CSSProperties = {
  ...CARD_WRAPPER_BASE,
  cursor: 'pointer',
  marginLeft: '-20px',
};

/** 선택 단계 카드 래퍼 (비활성) */
export const SELECT_CARD_WRAPPER_DISABLED: CSSProperties = {
  ...CARD_WRAPPER_BASE,
  cursor: 'not-allowed',
  marginLeft: '-20px',
};

/** 카드 헤더 스타일 */
export const CARD_HEADER_STYLE: CSSProperties = {
  display: 'flex',
  justifyContent: 'center'
};

/** 카드 헤더 내부 스타일 */
export const CARD_HEADER_INNER: CSSProperties = {
  display: 'flex',
  alignItems: 'center'
};

/** 덱/무덤 카운터 공통 스타일 */
export const COUNTER_BASE: CSSProperties = {
  position: 'fixed',
  padding: '8px 14px',
  borderRadius: '10px',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  cursor: 'pointer',
  transition: 'transform 0.1s, box-shadow 0.1s',
  fontSize: '14px',
  fontWeight: 'bold',
  zIndex: 1000,
  pointerEvents: 'auto',
};

// =====================
// 레이아웃
// =====================

export const LAYOUT = {
  DECK_COUNTER: { left: '120px', bottom: '100px' },
  DISCARD_COUNTER: { right: '20px', bottom: '20px' },
} as const;
