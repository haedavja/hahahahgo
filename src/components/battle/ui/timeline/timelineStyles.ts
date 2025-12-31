/**
 * @file timelineStyles.ts
 * @description 타임라인 컴포넌트 스타일 상수
 */

import type { CSSProperties } from 'react';

// =====================
// 레이아웃 스타일
// =====================

export const NUMBER_OVERLAY_STYLE: CSSProperties = {
  position: 'fixed',
  top: '155px',
  left: '240px',
  right: '360px',
  width: 'auto',
  maxWidth: '1400px',
  zIndex: 3600,
  pointerEvents: 'none'
};

export const NUMBER_INNER_STYLE: CSSProperties = {
  position: 'relative',
  height: '28px',
  color: '#ffb366',
  textShadow: '0 0 8px rgba(255, 179, 102, 0.9), 0 0 14px rgba(0, 0, 0, 0.8)',
  fontWeight: 800,
  fontSize: '15px'
};

export const TIMELINE_CONTAINER_STYLE: CSSProperties = {
  marginBottom: '32px',
  position: 'fixed',
  top: '70px',
  left: '240px',
  right: '360px',
  width: 'auto',
  maxWidth: '1400px',
  zIndex: 3500,
  background: 'transparent'
};

export const TIMELINE_PANEL_STYLE: CSSProperties = {
  minHeight: '130px',
  background: 'transparent',
  border: 'none',
  boxShadow: 'none',
  padding: '0',
  margin: '0'
};

export const TIMELINE_BODY_STYLE: CSSProperties = {
  marginTop: '0',
  padding: '14px 0 0 0',
  background: 'transparent',
  borderRadius: '0',
  border: 'none',
  boxShadow: 'none',
  position: 'relative'
};

export const TIMELINE_LANES_STYLE: CSSProperties = {
  position: 'relative'
};

export const OVERDRIVE_BADGE_STYLE: CSSProperties = {
  position: 'absolute',
  right: '12px',
  top: '-18px',
  padding: '6px 12px',
  borderRadius: '10px',
  background: 'linear-gradient(135deg, rgba(244, 114, 182, 0.15), rgba(99, 102, 241, 0.2))',
  border: '1.5px solid rgba(147, 197, 253, 0.6)',
  color: '#c4d4ff',
  fontWeight: '800',
  letterSpacing: '0.08em',
  boxShadow: '0 6px 16px rgba(79, 70, 229, 0.35)',
  display: 'flex',
  gap: '8px',
  alignItems: 'center'
};

export const SPACER_STYLE: CSSProperties = {
  height: '220px'
};

// =====================
// 색상 팔레트
// =====================

/** 패리 색상 팔레트 */
export const PARRY_COLORS = [
  { start: '#22d3ee', end: '#a855f7', shadow: 'rgba(34, 211, 238, 0.8)' },
  { start: '#34d399', end: '#fbbf24', shadow: 'rgba(52, 211, 153, 0.8)' },
  { start: '#f472b6', end: '#60a5fa', shadow: 'rgba(244, 114, 182, 0.8)' }
] as const;

/** 여유 특성 색상 */
export const LEISURE_COLOR = {
  start: '#facc15',
  end: '#f59e0b',
  shadow: 'rgba(250, 204, 21, 0.6)',
  bg: 'rgba(250, 204, 21, 0.15)'
} as const;

/** 무리 특성 색상 */
export const STRAIN_COLOR = {
  start: '#f97316',
  end: '#ef4444',
  shadow: 'rgba(249, 115, 22, 0.6)',
  bg: 'rgba(249, 115, 22, 0.15)'
} as const;

// =====================
// 상수값
// =====================

/** 여유 특성 기본 범위 */
export const LEISURE_MIN_SPEED = 4;
export const LEISURE_MAX_SPEED = 8;

/** 무리 특성 최대 오프셋 */
export const STRAIN_MAX_OFFSET = 3;
