/**
 * @file effect-audio.ts
 * @description 상징(Relic) 효과 발동 시 오디오/시각 피드백 상수
 *
 * ## 사용법
 * - tone: 발동 사운드 주파수 (Hz)
 * - duration: 플래시 애니메이션 지속 시간 (ms)
 *
 * ## 유지보수 원칙
 * - 새로운 상징 타입 추가 시 여기에 상수 정의
 * - 매직 넘버 대신 이 상수 사용
 */

/**
 * 상징 발동 오디오/비주얼 설정
 */
export const RELIC_AUDIO = {
  /** ON_RELIC_ACTIVATE: 다른 상징 발동 시 연쇄 발동 (묵주) */
  RELIC_CHAIN: { tone: 750, duration: 400 },

  /** PASSIVE + comboMultiplierPerCard: 카드마다 콤보 배율 증가 (에테르 결정) */
  COMBO_MULTIPLIER: { tone: 800, duration: 500 },

  /** PASSIVE + etherMultiplier/etherCardMultiplier: 에테르 배율 증가 (희귀한 조약돌, 참고서) */
  ETHER_MULTIPLIER: { tone: 820, duration: 400 },

  /** PASSIVE + etherFiveCardBonus: 5장째 카드에서 발동 (악마의 주사위) */
  FIVE_CARD_BONUS: { tone: 980, duration: 800 },
} as const;

/**
 * 상징 발동 타입별 tone 값 (역방향 조회용)
 */
export const RELIC_TONE_BY_TYPE = {
  ON_RELIC_ACTIVATE: RELIC_AUDIO.RELIC_CHAIN.tone,
  COMBO_MULTIPLIER_PER_CARD: RELIC_AUDIO.COMBO_MULTIPLIER.tone,
  ETHER_MULTIPLIER: RELIC_AUDIO.ETHER_MULTIPLIER.tone,
  FIVE_CARD_BONUS: RELIC_AUDIO.FIVE_CARD_BONUS.tone,
} as const;

export type RelicAudioConfig = typeof RELIC_AUDIO[keyof typeof RELIC_AUDIO];
