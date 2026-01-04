/**
 * @file styles.ts
 * @description 통계 컴포넌트 공용 스타일
 */

import type { CSSProperties } from 'react';

// ==================== 색상 팔레트 ====================

export const STATS_COLORS = {
  // 텍스트
  label: '#94a3b8',
  value: '#fbbf24',
  text: '#e2e8f0',
  textMuted: '#64748b',

  // 상태
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',

  // 배경
  background: '#1e293b',
  backgroundDark: '#0f172a',
  backgroundLight: '#334155',

  // 테두리
  border: '#334155',
  borderLight: '#475569',
} as const;

// ==================== 행/그리드 스타일 ====================

export const STAT_ROW_STYLE: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '8px 0',
  borderBottom: `1px solid ${STATS_COLORS.border}`,
};

export const STAT_LABEL_STYLE: CSSProperties = {
  color: STATS_COLORS.label,
};

export const STAT_VALUE_STYLE: CSSProperties = {
  fontWeight: 'bold',
  color: STATS_COLORS.value,
};

export const STATS_GRID_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: '8px',
};

export const STAT_ITEM_STYLE: CSSProperties = {
  padding: '8px',
  background: STATS_COLORS.background,
  borderRadius: '6px',
};

// ==================== 섹션 스타일 ====================

export const SECTION_TITLE_STYLE: CSSProperties = {
  margin: '16px 0 8px',
  fontSize: '14px',
};

export const SECTION_BOX_STYLE: CSSProperties = {
  background: STATS_COLORS.backgroundDark,
  padding: '12px',
  borderRadius: '8px',
  marginBottom: '12px',
};

// ==================== 탭 스타일 ====================

export const TAB_CONTAINER_STYLE: CSSProperties = {
  display: 'flex',
  gap: '4px',
  marginBottom: '16px',
  flexWrap: 'wrap',
};

export const TAB_STYLE: CSSProperties = {
  padding: '6px 12px',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 'bold',
};

export const getTabStyle = (isActive: boolean): CSSProperties => ({
  ...TAB_STYLE,
  background: isActive ? STATS_COLORS.info : STATS_COLORS.backgroundLight,
  color: isActive ? '#fff' : STATS_COLORS.label,
});

// ==================== 테이블 스타일 ====================

export const TABLE_STYLE: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.8rem',
};

export const TH_STYLE: CSSProperties = {
  textAlign: 'left',
  padding: '6px 8px',
  background: STATS_COLORS.background,
  color: STATS_COLORS.label,
  borderBottom: `1px solid ${STATS_COLORS.border}`,
};

export const TD_STYLE: CSSProperties = {
  padding: '6px 8px',
  borderBottom: `1px solid ${STATS_COLORS.border}`,
  color: STATS_COLORS.text,
};

// ==================== 버튼 스타일 ====================

export const COPY_BUTTON_STYLE: CSSProperties = {
  marginTop: '16px',
  padding: '10px 20px',
  background: STATS_COLORS.info,
  border: 'none',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 'bold',
  cursor: 'pointer',
  width: '100%',
};

// ==================== 유틸리티 ====================

export const getValueColor = (value: number, threshold = 0): string => {
  if (value > threshold) return STATS_COLORS.success;
  if (value < threshold) return STATS_COLORS.error;
  return STATS_COLORS.value;
};

export const getWinRateColor = (rate: number): string => {
  if (rate >= 0.7) return STATS_COLORS.success;
  if (rate >= 0.5) return STATS_COLORS.value;
  if (rate >= 0.3) return STATS_COLORS.warning;
  return STATS_COLORS.error;
};
