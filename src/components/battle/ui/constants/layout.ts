/**
 * @file layout.ts
 * @description 전투 UI 레이아웃 상수
 *
 * 모든 고정 위치, 크기, 간격 값을 한 곳에서 관리합니다.
 * 매직넘버를 상수로 추출하여 유지보수성을 높입니다.
 */

import type { CSSProperties } from 'react';

// ==================== 간격 (Spacing) ====================

export const SPACING = {
  XS: '4px',
  SM: '8px',
  MD: '12px',
  LG: '16px',
  XL: '24px',
  XXL: '32px',
} as const;

// ==================== 고정 위치 (Fixed Positions) ====================

export const FIXED_POSITIONS = {
  PLAYER_HP_BAR: {
    top: '500px',
    left: '150px',
  },
  ENEMY_HP_BAR: {
    top: '530px',
    right: '640px',
  },
  SOUL_ORB: {
    top: '470px',
    right: '300px',
  },
  GRACE_ORB: {
    top: '470px',
    right: '200px',
  },
  SUBMIT_BUTTON: {
    bottom: '210px',
    right: '320px',
  },
} as const;

// ==================== 크기 (Dimensions) ====================

export const DIMENSIONS = {
  HP_BAR: {
    width: '200px',
    height: '12px',
  },
  SIDEBAR: {
    width: '280px',
  },
  CHARACTER_EMOJI: {
    fontSize: '64px',
    fontSizeSecondary: '56px',
  },
  SOUL_ORB: {
    size: '60px',
  },
} as const;

// ==================== Z-Index 레이어 ====================
// 일관된 UI 레이어 관리를 위한 상수
// 새 레이어 추가 시 기존 값 사이에 배치

export const Z_INDEX = {
  /** 기본 요소 */
  BASE: 1,
  /** 카드 요소 */
  CARD: 10,
  /** 일반 툴팁 */
  TOOLTIP: 100,
  /** 오버레이 (배경 딤) */
  OVERLAY: 1000,
  /** HP 바 등 고정 UI */
  HP_BAR: 3000,
  /** 일반 모달 */
  MODAL: 5000,
  /** 드래그 중인 요소 */
  DRAGGING: 8000,
  /** 위젯 (StatsWidget 등) */
  WIDGET: 9000,
  /** 최상위 모달/드롭다운 */
  DROPDOWN: 9999,
  /** 개발 도구, 긴급 모달 */
  DEV_TOOLS: 10000,
  /** 우선순위 툴팁 */
  TOOLTIP_PRIORITY: 10000,
  /** 최상위 팝업 (카드 상세 등) */
  POPUP_CRITICAL: 99999,
} as const;

// ==================== 애니메이션 타이밍 ====================

export const ANIMATION_TIMING = {
  /** 타임라인 이동 딜레이 */
  TIMELINE_MOVE: 250,
  /** 카드 액션 딜레이 */
  CARD_ACTION: 250,
  /** 카드 흔들림 딜레이 */
  CARD_SHAKE: 200,
  /** 자동 진행 딜레이 (450ms 미만으로 줄이면 카드 실행 버그 발생!) */
  AUTO_PROGRESS: 450,
  /** 에테르 전송 애니메이션 */
  ETHER_TRANSFER: 800,
  /** HP 바 트랜지션 */
  HP_BAR_TRANSITION: 400,
} as const;

// ==================== 레이아웃 스타일 프리셋 ====================

export const LAYOUT_STYLES = {
  /** 플레이어 영역 컨테이너 */
  PLAYER_AREA: {
    position: 'fixed',
    top: FIXED_POSITIONS.PLAYER_HP_BAR.top,
    left: FIXED_POSITIONS.PLAYER_HP_BAR.left,
    zIndex: Z_INDEX.HP_BAR,
    pointerEvents: 'none',
  } as CSSProperties,

  /** 적 영역 컨테이너 */
  ENEMY_AREA: {
    position: 'fixed',
    top: FIXED_POSITIONS.ENEMY_HP_BAR.top,
    right: FIXED_POSITIONS.ENEMY_HP_BAR.right,
    pointerEvents: 'none',
  } as CSSProperties,

  /** Flex row 기본 */
  FLEX_ROW: {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.LG,
  } as CSSProperties,

  /** Flex column 기본 */
  FLEX_COLUMN: {
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.SM,
  } as CSSProperties,

  /** 중앙 정렬 */
  CENTER: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as CSSProperties,
} as const;

// ==================== 반응형 브레이크포인트 ====================

export const BREAKPOINTS = {
  MOBILE: 480,
  TABLET: 768,
  DESKTOP: 1024,
  WIDE: 1440,
  ULTRA_WIDE: 1920,
} as const;
