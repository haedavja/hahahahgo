/**
 * @file constants.ts
 * @description 타임라인 전투 엔진 상수 및 설정
 */

// ==================== 공유 전투 상수 ====================

export {
  BASE_CRIT_CHANCE,
  CRIT_MULTIPLIER,
  VULNERABLE_MULTIPLIER,
  WEAK_MULTIPLIER,
} from '../../../lib/battleCalculations';

// ==================== 기본 상수 ====================

export const DEFAULT_MAX_SPEED = 30;
export const DEFAULT_PLAYER_ENERGY = 4;
export const DEFAULT_MAX_SUBMIT_CARDS = 5;
export const DEFAULT_HAND_SIZE = 5;

// ==================== 전투 엔진 설정 ====================

export interface BattleEngineConfig {
  /** 최대 타임라인 속도 */
  maxSpeed: number;
  /** 최대 턴 수 */
  maxTurns: number;
  /** 치명타 활성화 */
  enableCrits: boolean;
  /** 콤보 시스템 활성화 */
  enableCombos: boolean;
  /** 상징 시스템 활성화 */
  enableRelics: boolean;
  /** 아이템 시스템 활성화 */
  enableItems: boolean;
  /** 이변 시스템 활성화 */
  enableAnomalies: boolean;
  /** 타임라인 시스템 활성화 */
  enableTimeline: boolean;
  /** 상세 로깅 */
  verbose: boolean;
  /** 맵 위험도 (0-4, 이변 레벨 계산용) */
  mapRisk: number;
}

export const DEFAULT_CONFIG: BattleEngineConfig = {
  maxSpeed: DEFAULT_MAX_SPEED,
  maxTurns: 30,
  enableCrits: true,
  enableCombos: true,
  enableRelics: true,
  enableItems: true,
  enableAnomalies: true,
  enableTimeline: true,
  verbose: false,
  mapRisk: 0,
};

// ==================== 특성 수정자 타입 ====================

export interface TraitModifiers {
  damageMultiplier: number;
  blockMultiplier: number;
  speedModifier: number;
  effects: string[];
}

// ==================== 전투 결과 확장 ====================

export interface ExtendedBattleResult {
  winner: 'player' | 'enemy' | 'draw';
  turns: number;
  playerDamageDealt: number;
  enemyDamageDealt: number;
  playerFinalHp: number;
  enemyFinalHp: number;
  etherGained: number;
  goldChange: number;
  battleLog: string[];
  events: unknown[];
  cardUsage: Record<string, number>;
  comboStats: Record<string, number>;
  tokenStats: Record<string, number>;
  timeline: unknown[];
}

// ==================== 카드 우선순위 ====================

export const CARD_PRIORITY_ORDER: Record<string, number> = {
  instant: 0,
  quick: 1,
  normal: 2,
  slow: 3,
};

// ==================== 콤보 배수 ====================

export const COMBO_MULTIPLIERS: Record<string, number> = {
  '하이카드': 1,
  '페어': 1.25,
  '투페어': 1.5,
  '트리플': 2,
  '플러쉬': 2.5,
  '풀하우스': 3,
  '포카드': 4,
  '파이브카드': 5,
};
