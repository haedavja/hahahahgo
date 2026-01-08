/**
 * @file theme.ts
 * @description 전역 테마 상수 - 색상, 간격, 폰트 등
 */

// ========================================
// 색상 팔레트
// ========================================
export const COLORS = {
  // 기본 색상
  primary: '#fbbf24',      // 황금색 (주요 강조)
  secondary: '#60a5fa',    // 파란색 (보조)
  success: '#86efac',      // 초록색 (성공/해금)
  danger: '#f87171',       // 빨간색 (위험/잠금)
  warning: '#fb923c',      // 주황색 (경고)

  // 텍스트 색상
  text: {
    primary: '#e2e8f0',    // 기본 텍스트
    secondary: '#9ca3af',  // 보조 텍스트
    muted: '#6b7280',      // 비활성 텍스트
    disabled: '#4b5563',   // 완전 비활성
  },

  // 배경 색상
  bg: {
    primary: 'rgba(30, 41, 59, 0.8)',
    secondary: 'rgba(71, 85, 105, 0.3)',
    tertiary: 'rgba(71, 85, 105, 0.1)',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },

  // 티어별 색상 (피라미드)
  tier: {
    1: { bg: 'rgba(134, 239, 172, 0.15)', border: '#86efac', text: '#86efac' },
    2: { bg: 'rgba(244, 114, 182, 0.15)', border: '#f472b6', text: '#f472b6' },
    3: { bg: 'rgba(96, 165, 250, 0.15)', border: '#60a5fa', text: '#60a5fa' },
    4: { bg: 'rgba(251, 146, 60, 0.15)', border: '#fb923c', text: '#fb923c' },
    5: { bg: 'rgba(167, 139, 250, 0.15)', border: '#a78bfa', text: '#a78bfa' },
    6: { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#ef4444' },
    identity: { bg: 'rgba(251, 191, 36, 0.15)', border: '#fbbf24', text: '#fbbf24' },
  },

  // 타입별 색상
  type: {
    sword: '#60a5fa',
    gun: '#f472b6',
    neutral: '#9ca3af',
  },
} as const;

// ========================================
// 간격
// ========================================
export const SPACING = {
  xs: '2px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  xxl: '20px',
} as const;

// ========================================
// 폰트 크기
// ========================================
export const FONT_SIZE = {
  xs: '9px',
  sm: '10px',
  md: '11px',
  lg: '12px',
  xl: '13px',
  xxl: '14px',
} as const;

// ========================================
// 테두리 반경
// ========================================
export const BORDER_RADIUS = {
  sm: '3px',
  md: '4px',
  lg: '6px',
  xl: '8px',
} as const;

// ========================================
// 공통 스타일 패턴
// ========================================
export const COMMON_STYLES = {
  // 카드 스타일
  card: {
    base: {
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.lg,
      background: COLORS.bg.secondary,
    },
    locked: {
      background: 'rgba(71, 85, 105, 0.3)',
      border: '1px dashed #6b7280',
    },
    unlocked: {
      border: `1px solid ${COLORS.primary}30`,
    },
  },

  // 뱃지 스타일
  badge: {
    base: {
      padding: `${SPACING.xs} ${SPACING.sm}`,
      borderRadius: BORDER_RADIUS.md,
      fontSize: FONT_SIZE.sm,
    },
    locked: {
      color: COLORS.danger,
      background: 'rgba(239, 68, 68, 0.15)',
    },
    success: {
      color: COLORS.success,
      background: 'rgba(134, 239, 172, 0.15)',
    },
  },

  // 버튼 스타일
  button: {
    primary: {
      padding: `${SPACING.xs} ${SPACING.sm}`,
      background: 'rgba(96, 165, 250, 0.2)',
      border: `1px solid ${COLORS.secondary}`,
      borderRadius: BORDER_RADIUS.md,
      color: COLORS.secondary,
      fontSize: FONT_SIZE.sm,
      cursor: 'pointer',
    },
  },
} as const;

// 타입 export
export type TierNumber = 1 | 2 | 3 | 4 | 5 | 6 | 'identity';
