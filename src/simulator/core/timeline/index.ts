/**
 * @file index.ts
 * @description 타임라인 전투 엔진 모듈
 *
 * 분할된 타임라인 엔진 모듈들을 통합 export합니다.
 */

// 상수 및 설정
export {
  DEFAULT_MAX_SPEED,
  DEFAULT_PLAYER_ENERGY,
  DEFAULT_MAX_SUBMIT_CARDS,
  DEFAULT_HAND_SIZE,
  BASE_CRIT_CHANCE,
  CRIT_MULTIPLIER,
  DEFAULT_CONFIG,
  CARD_PRIORITY_ORDER,
  COMBO_MULTIPLIERS,
  type BattleEngineConfig,
  type TraitModifiers,
  type ExtendedBattleResult,
} from './constants';

// 카드 선택 AI
export {
  // 함수
  analyzeBattleSituation,
  estimateDamageOutput,
  analyzePokerCombos,
  getCardValue,
  cardValueToNumber,
  calculateCardScore,
  selectPlayerCards,
  // 타입
  type ScoredCard,
  type BattleSituation,
  type ComboAnalysis,
} from './card-selection';
