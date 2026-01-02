/**
 * @file battleAppStyles.ts
 * @description BattleApp 인라인 스타일 상수
 *
 * BattleApp.tsx의 인라인 스타일을 상수로 추출하여
 * 재사용성과 유지보수성을 높입니다.
 */

import type { CSSProperties } from 'react';
import { SPACING } from './layout';

// ==================== 메인 레이아웃 ====================

/** 플레이어/적 정보 + 중앙 정보 통합 레이아웃 */
export const MAIN_BATTLE_LAYOUT: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'flex-end',
  marginBottom: '50px',
  gap: '120px',
  position: 'relative',
  marginTop: '40px',
  paddingRight: '40px',
};

// ==================== 플레이어 영역 ====================

/** 플레이어 영역 컨테이너 */
export const PLAYER_AREA_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: SPACING.MD,
  minWidth: '360px',
  position: 'relative',
  justifyContent: 'flex-end',
  paddingTop: '200px',
};

// ==================== 적 영역 ====================

/** 적 영역 컨테이너 */
export const ENEMY_AREA_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: SPACING.MD,
  minWidth: '360px',
  position: 'relative',
  justifyContent: 'center',
  paddingTop: '120px',
};

// ==================== 공통 스타일 ====================

/** Flex row 중앙 정렬 */
export const FLEX_CENTER_ROW: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

/** Flex column 기본 */
export const FLEX_COLUMN: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

/** 포인터 이벤트 비활성화 (오버레이용) */
export const POINTER_EVENTS_NONE: CSSProperties = {
  pointerEvents: 'none',
};

/** 포인터 이벤트 활성화 */
export const POINTER_EVENTS_AUTO: CSSProperties = {
  pointerEvents: 'auto',
};
