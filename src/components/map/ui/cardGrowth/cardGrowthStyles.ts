/**
 * @file cardGrowthStyles.ts
 * @description 카드 승급 모달 스타일 상수
 */

import type { CSSProperties } from 'react';

export const rarityColors: Record<string, string> = {
  common: '#94a3b8',
  rare: '#60a5fa',
  special: '#a78bfa',
  legendary: '#fbbf24',
};

export const rarityLabels: Record<string, string> = {
  common: '일반',
  rare: '희귀',
  special: '특별',
  legendary: '전설',
};

export const MODAL_OVERLAY: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.9)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
};

export const MODAL_CONTAINER: CSSProperties = {
  width: '900px',
  maxHeight: '90vh',
  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  borderRadius: '16px',
  border: '2px solid #fbbf24',
  boxShadow: '0 0 40px rgba(251, 191, 36, 0.3)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

export const getHeaderBackground = (mode: 'select' | 'enhance' | 'specialize'): string => {
  if (mode === 'enhance') {
    return 'linear-gradient(135deg, rgba(96, 165, 250, 0.1), transparent)';
  }
  if (mode === 'specialize') {
    return 'linear-gradient(135deg, rgba(134, 239, 172, 0.1), transparent)';
  }
  return 'transparent';
};

export const getHeaderColor = (mode: 'select' | 'enhance' | 'specialize'): string => {
  if (mode === 'enhance') return '#60a5fa';
  if (mode === 'specialize') return '#86efac';
  return '#fbbf24';
};

export const MODE_BUTTON_ENHANCE: CSSProperties = {
  flex: 1,
  padding: '18px',
  border: 'none',
  borderRadius: '10px',
  color: '#fff',
  fontSize: '1.1rem',
  fontWeight: 700,
};

export const MODE_BUTTON_SPECIALIZE: CSSProperties = {
  ...MODE_BUTTON_ENHANCE,
};

export const CARD_COMPARISON_GRID: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto 1fr',
  gap: '24px',
  alignItems: 'start',
};

export const ARROW_STYLE: CSSProperties = {
  fontSize: '2.5rem',
  transition: 'color 0.2s',
  marginTop: '100px',
};

export const EMPTY_CARD_PLACEHOLDER: CSSProperties = {
  width: '155px',
  height: '200px',
  background: 'rgba(30, 41, 59, 0.5)',
  borderRadius: '12px',
  border: '2px dashed #475569',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#64748b',
  fontSize: '0.875rem',
  textAlign: 'center',
  padding: '16px',
};

export const ENHANCEMENT_INFO_BOX: CSSProperties = {
  padding: '14px 18px',
  background: 'rgba(96, 165, 250, 0.15)',
  borderRadius: '10px',
  border: '1px solid rgba(96, 165, 250, 0.3)',
  textAlign: 'center',
};

export const SPEC_OPTION_STYLE = (isSelected: boolean): CSSProperties => ({
  padding: '14px 18px',
  background: isSelected ? 'rgba(134, 239, 172, 0.15)' : 'rgba(30, 41, 59, 0.6)',
  border: isSelected ? '2px solid #86efac' : '1px solid #334155',
  borderRadius: '10px',
  cursor: 'pointer',
  transition: 'all 0.15s',
});

export const TRAIT_BADGE_STYLE = (isPositive: boolean): CSSProperties => ({
  fontSize: '0.95rem',
  padding: '5px 12px',
  borderRadius: '8px',
  background: isPositive ? 'rgba(134, 239, 172, 0.2)' : 'rgba(248, 113, 113, 0.2)',
  color: isPositive ? '#86efac' : '#f87171',
  border: `1px solid ${isPositive ? 'rgba(134, 239, 172, 0.4)' : 'rgba(248, 113, 113, 0.4)'}`,
  fontWeight: 600,
});
