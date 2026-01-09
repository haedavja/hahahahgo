/**
 * @file ui-audio.ts
 * @description UI 인터랙션 오디오 상수
 *
 * ## 사용법
 * - tone: 사운드 주파수 (Hz)
 * - duration: 사운드 지속 시간 (ms)
 *
 * ## 유지보수 원칙
 * - 새로운 UI 사운드 추가 시 여기에 상수 정의
 * - playSound(매직넘버) 대신 이 상수 사용
 */

/**
 * 카드 인터랙션 사운드
 */
export const CARD_AUDIO = {
  /** 카드 선택 */
  SELECT: { tone: 700, duration: 90 },
  /** 카드 선택 해제 */
  DESELECT: { tone: 600, duration: 80 },
  /** 카드 확정/확인 */
  CONFIRM: { tone: 800, duration: 80 },
  /** 카드 에러/불가 */
  ERROR: { tone: 400, duration: 80 },
} as const;

/**
 * 전투 액션 사운드
 */
export const COMBAT_AUDIO = {
  /** 액션 실행 (타임라인 진행) */
  ACTION_EXECUTE: { tone: 1000, duration: 150 },
  /** 치명타 */
  CRITICAL_HIT: { tone: 1600, duration: 260 },
  /** 일반 피해 */
  NORMAL_HIT: { tone: 1200, duration: 200 },
  /** 죽음/패배 */
  DEATH: { tone: 200, duration: 500 },
  /** 방어/블록 */
  BLOCK: { tone: 800, duration: 150 },
} as const;

/**
 * 에테르 관련 사운드
 */
export const ETHER_AUDIO = {
  /** 에테르 획득 */
  GAIN: { tone: 800, duration: 100 },
  /** 에테르 손실/음수 */
  LOSS: { tone: 200, duration: 150 },
  /** 에테르 전송/이동 */
  TRANSFER: { tone: 400, duration: 200 },
} as const;

/**
 * 페이즈/턴 전환 사운드
 */
export const PHASE_AUDIO = {
  /** 턴 시작 */
  TURN_START: { tone: 1400, duration: 220 },
  /** 턴 종료 */
  TURN_END: { tone: 900, duration: 220 },
  /** 페이즈 전환 */
  PHASE_CHANGE: { tone: 900, duration: 120 },
} as const;

/**
 * 버튼/UI 인터랙션 사운드
 */
export const UI_AUDIO = {
  /** 버튼 클릭 */
  BUTTON_CLICK: { tone: 500, duration: 60 },
  /** 키보드 단축키 */
  SHORTCUT: { tone: 900, duration: 120 },
} as const;

/**
 * 통합 오디오 설정 타입
 */
export type AudioConfig = { tone: number; duration: number };
