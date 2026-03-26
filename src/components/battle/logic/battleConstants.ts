/**
 * @file battleConstants.js
 * @description 전투 시스템 공통 상수
 *
 * 순환 의존성 방지를 위해 분리됨
 *
 * ## 타이밍 상수 용도
 * - stepOnce: 개별 카드 실행 애니메이션
 * - 자동진행: 타임라인 자동 진행
 * - 다중타격: 연속 공격 사이 딜레이
 * - 에테르 계산: 턴 종료 에테르 획득 애니메이션
 *
 * @typedef {Object} TimingConstants
 * @property {number} CARD_EXECUTION_DELAY - 카드 발동 대기 (ms)
 * @property {number} CARD_SHAKE_DURATION - 카드 흔들림 애니메이션 (ms)
 * @property {number} CARD_FADEOUT_DELAY - 마지막 카드 페이드아웃 (ms)
 * @property {number} CARD_DISAPPEAR_START - 카드 소멸 시작 (ms)
 * @property {number} CARD_DISAPPEAR_DURATION - 카드 소멸 애니메이션 (ms)
 * @property {number} AUTO_PROGRESS_DELAY - 자동진행 딜레이 (ms)
 * @property {number} MULTI_HIT_DELAY - 연속 타격 딜레이 (ms)
 * @property {number} ETHER_CALC_START_DELAY - 에테르 계산 시작 딜레이 (ms)
 * @property {number} ETHER_MULTIPLY_DELAY - 배율 적용 딜레이 (ms)
 * @property {number} ETHER_DEFLATION_DELAY - 디플레이션 딜레이 (ms)
 */

// =====================
// 타이밍 상수 (밀리초)
// =====================
export const TIMING = {
  // stepOnce 타이밍
  CARD_EXECUTION_DELAY: 250,      // 시곗바늘 이동 후 카드 발동 대기
  CARD_SHAKE_DURATION: 200,       // 카드 흔들림 애니메이션
  CARD_FADEOUT_DELAY: 150,        // 마지막 카드 페이드아웃
  CARD_DISAPPEAR_START: 150,      // 카드 소멸 시작
  CARD_DISAPPEAR_DURATION: 300,   // 카드 소멸 애니메이션

  // 자동진행 타이밍
  AUTO_PROGRESS_DELAY: 450,       // 다음 카드로 넘어가는 대기 시간

  // 다중 타격 타이밍
  MULTI_HIT_DELAY: 100,           // 연속 타격 사이 딜레이 (100ms)

  // 에테르 계산 타이밍
  ETHER_CALC_START_DELAY: 400,    // 에테르 계산 시작 딜레이
  ETHER_MULTIPLY_DELAY: 600,      // 배율 적용 딜레이
  ETHER_DEFLATION_DELAY: 400,     // 디플레이션 딜레이
};
