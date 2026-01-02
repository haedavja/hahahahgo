/**
 * @file battle-engine-types.ts
 * @description 전투 엔진 공통 타입 및 상수 정의
 *
 * timeline-battle-engine.ts에서 분리된 타입 및 상수들입니다.
 */

// ==================== 상수 ====================

export const DEFAULT_MAX_SPEED = 30;
export const DEFAULT_PLAYER_ENERGY = 6;
export const DEFAULT_MAX_SUBMIT_CARDS = 5;
export const DEFAULT_HAND_SIZE = 5;

// ==================== 전투 엔진 설정 ====================

export interface BattleEngineConfig {
  maxSpeed: number;
  maxTurns: number;
  enableCrits: boolean;
  enableCombos: boolean;
  enableRelics: boolean;
  enableAnomalies: boolean;
  enableTimeline: boolean;
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
  speedBonus?: number;
  effects: string[];
}
