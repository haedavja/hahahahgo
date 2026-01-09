/**
 * @file animation-timing.ts
 * @description UI 애니메이션 타이밍 상수
 *
 * ## 사용법
 * - ms 단위 (밀리초)
 * - setTimeout, transition 등에 사용
 *
 * ## 유지보수 원칙
 * - 새로운 애니메이션 타이밍 추가 시 여기에 상수 정의
 * - setTimeout(fn, 매직넘버) 대신 이 상수 사용
 */

/**
 * 전투 애니메이션 타이밍
 */
export const BATTLE_TIMING = {
  /** 타임라인 포인터 이동 */
  POINTER_MOVE: 250,
  /** 카드 흔들림 애니메이션 */
  CARD_SHAKE: 200,
  /** 자동 진행 딜레이 */
  AUTO_PROGRESS_DELAY: 450,
  /** 히트 애니메이션 */
  HIT_ANIMATION: 300,
  /** 블록 애니메이션 */
  BLOCK_ANIMATION: 400,
  /** 화면 흔들림 */
  SCREEN_SHAKE: 250,
} as const;

/**
 * UI 피드백 타이밍
 */
export const UI_TIMING = {
  /** 멀티플라이어 펄스 */
  MULTIPLIER_PULSE: 250,
  /** 에테르 펄스 */
  ETHER_PULSE: 300,
  /** 팝업 표시 */
  POPUP_DISPLAY: 800,
  /** 오버드라이브 플래시 */
  OVERDRIVE_FLASH: 1000,
  /** 통찰 애니메이션 */
  INSIGHT_ANIMATION: 1200,
  /** 복사 알림 */
  COPY_NOTIFICATION: 2000,
  /** 페이지 리다이렉트 딜레이 */
  REDIRECT_DELAY: 100,
  /** 알림 표시 */
  NOTIFICATION_DISPLAY: 2500,
  /** 상징 활성화 플래시 */
  RELIC_ACTIVATION_FLASH: 700,
} as const;

/**
 * 메시지/경고 표시 타이밍
 */
export const MESSAGE_TIMING = {
  /** 짧은 경고 */
  SHORT_WARNING: 3000,
  /** 긴 메시지 */
  LONG_MESSAGE: 4000,
} as const;

/**
 * 측정/초기화 딜레이
 */
export const INIT_TIMING = {
  /** 초기 측정 */
  INITIAL_MEASURE: 200,
  /** 추가 측정 */
  SECONDARY_MEASURE: 500,
} as const;

/**
 * 타이밍 타입
 */
export type AnimationTiming = typeof BATTLE_TIMING | typeof UI_TIMING | typeof MESSAGE_TIMING | typeof INIT_TIMING;
