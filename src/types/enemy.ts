/**
 * @file enemy.ts
 * @description 적 시스템 통합 타입 정의
 *
 * ## 타입 계층
 * - EnemyBase: 모든 적의 공통 속성
 * - EnemyDefinition: 데이터 정의용 (battleData.ts에서 사용)
 * - EnemyBattleState: 전투 중 적 상태 (리듀서에서 사용)
 * - EnemyUnitState: 개별 적 유닛 상태 (다중 적 전투)
 *
 * ## 사용 지침
 * - 새 적 추가 시: EnemyDefinition 사용
 * - 전투 상태 관리: EnemyBattleState 사용
 * - UI 렌더링: 필요한 필드만 Pick<> 사용
 */

import type { TokenState } from './core';

// ==================== 기본 타입 ====================

/** 패시브 효과 정의 */
export interface EnemyPassives {
  /** 전투 시작 시 장막 (통찰 차단) */
  veilAtStart?: boolean;
  /** 매턴 체력 회복량 */
  healPerTurn?: number;
  /** 매턴 힘 증가량 */
  strengthPerTurn?: number;
  /** 추가 패시브 효과 */
  [key: string]: unknown;
}

/** 모든 적의 공통 속성 */
export interface EnemyBase {
  /** 고유 식별자 */
  id: string;
  /** 표시 이름 */
  name: string;
  /** 이모지 */
  emoji: string;
  /** 체력 */
  hp: number;
  /** 최대 체력 (생략 시 hp와 동일) */
  maxHp?: number;
  /** 에테르 용량 */
  ether: number;
  /** 기본 속도 */
  speed: number;
  /** 최대 속도 (타임라인 표시용) */
  maxSpeed: number;
  /** 난이도 티어 (1: 일반, 2: 엘리트, 3: 보스) */
  tier: number;
  /** 추가 속성 허용 (호환성) */
  [key: string]: unknown;
}

// ==================== 데이터 정의 타입 ====================

/**
 * 적 정의 (battleData.ts ENEMIES 배열용)
 * 새 적 추가 시 이 타입을 따라야 함
 */
export interface EnemyDefinition extends EnemyBase {
  /** 사용 가능한 카드 ID 배열 */
  deck: string[];
  /** 턴당 사용하는 카드 수 */
  cardsPerTurn: number;
  /** 설명 */
  description: string;
  /** 보스 여부 */
  isBoss?: boolean;
  /** 패시브 효과 */
  passives?: EnemyPassives;
}

// ==================== 전투 상태 타입 ====================

/** 개별 적 유닛 상태 (다중 적 전투에서 각 유닛) */
export interface EnemyUnitState {
  /** 유닛 인덱스 */
  unitId: number;
  /** 적 ID */
  id?: string;
  /** 이름 */
  name?: string;
  /** 이모지 */
  emoji?: string;
  /** 현재 체력 */
  hp: number;
  /** 최대 체력 */
  maxHp: number;
  /** 방어력 */
  block: number;
  /** 토큰 상태 */
  tokens: TokenState;
  /** 사망 여부 */
  isDead?: boolean;
  /** 추가 속성 */
  [key: string]: unknown;
}

/** 전투 중 적 상태 (리듀서용) */
export interface EnemyBattleState {
  // === 기본 상태 ===
  /** 현재 체력 (전체 합산) */
  hp: number;
  /** 최대 체력 */
  maxHp: number;
  /** 방어력 */
  block: number;
  /** 토큰 상태 */
  tokens: TokenState;

  // === 속도 & 에테르 ===
  /** 최대 속도 */
  maxSpeed: number;
  /** 에테르 포인트 */
  etherPts?: number;
  /** 에테르 용량 */
  etherCapacity?: number;
  /** 에테르 기원 활성화 */
  etherOverdriveActive?: boolean;

  // === 전투 수치 ===
  /** 취약 배율 */
  vulnMult?: number;
  /** 취약 턴 수 */
  vulnTurns?: number;
  /** 카운터 피해 */
  counter?: number;
  /** 힘 */
  strength?: number;
  /** 방어 모드 */
  def?: boolean;

  // === 정보 ===
  /** 이름 */
  name?: string;
  /** 이모지 */
  emoji?: string;
  /** 장막 수치 */
  shroud?: number;
  /** 턴당 카드 수 */
  cardsPerTurn?: number;
  /** 덱 */
  deck?: string[];
  /** 패시브 효과 */
  passives?: EnemyPassives;
  /** 보스 여부 */
  isBoss?: boolean;
  /** 에테르 */
  ether?: number;

  // === 다중 적 ===
  /** 개별 유닛 배열 (항상 존재해야 함) */
  units?: EnemyUnitState[];
  /** 적 수 */
  enemyCount?: number;

  // === 콤보 추적 ===
  comboUsageCount?: Record<string, number>;

  /** 추가 속성 허용 */
  [key: string]: unknown;
}

// ==================== 헬퍼 타입 ====================

/** EnemyDefinition에서 EnemyBattleState로 변환 시 필요한 추가 필드 */
export type EnemyBattleInit = Omit<EnemyBattleState, 'tokens' | 'units'> & {
  tokens: TokenState;
  units: EnemyUnitState[];
};

/** 적 상태 업데이트용 부분 타입 */
export type EnemyBattleUpdate = Partial<EnemyBattleState>;

/** 유닛 상태 업데이트용 부분 타입 */
export type EnemyUnitUpdate = Partial<EnemyUnitState>;

// ==================== 타입 가드 ====================

/** EnemyDefinition인지 확인 */
export function isEnemyDefinition(obj: unknown): obj is EnemyDefinition {
  if (!obj || typeof obj !== 'object') return false;
  const e = obj as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.name === 'string' &&
    typeof e.hp === 'number' &&
    typeof e.speed === 'number' &&
    typeof e.maxSpeed === 'number' &&
    Array.isArray(e.deck)
  );
}

/** EnemyBattleState인지 확인 */
export function isEnemyBattleState(obj: unknown): obj is EnemyBattleState {
  if (!obj || typeof obj !== 'object') return false;
  const e = obj as Record<string, unknown>;
  return (
    typeof e.hp === 'number' &&
    typeof e.maxHp === 'number' &&
    typeof e.block === 'number' &&
    e.tokens !== undefined
  );
}
