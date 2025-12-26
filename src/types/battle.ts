/**
 * 전투 화면 컴포넌트 타입 정의
 *
 * BattleScreen 및 관련 컴포넌트 타입
 */

import type { TokenState } from './core';

// ==================== 전투 화면 타입 ====================

/** 패시브 효과 */
export interface BattlePassives {
  [key: string]: unknown;
}

/** 적 데이터 */
export interface BattleEnemyData {
  id?: string;
  name: string;
  emoji?: string;
  hp?: number;
  maxHp?: number;
  ether?: number;
  speed?: number;
  deck?: unknown[];
  cardsPerTurn?: number;
  passives?: BattlePassives;
  tier?: number;
  isBoss?: boolean;
}

/** 적 유닛 */
export interface BattleEnemyUnit {
  unitId: number;
  id?: string;
  name: string;
  emoji: string;
  count: number;
  hp: number;
  maxHp: number;
  ether: number;
  individualHp: number;
  individualMaxHp?: number;
  individualEther: number;
  speed: number;
  deck: unknown[];
  cardsPerTurn: number;
  individualCardsPerTurn: number;
  passives: BattlePassives;
  tier: number;
  isBoss?: boolean;
  block: number;
  tokens: TokenState;
}

/** 적 구성 */
export interface BattleEnemyComposition {
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  ether: number;
  cardsPerTurn?: number;
  passives?: BattlePassives;
  count: number;
}

/** 초기 플레이어 상태 */
export interface BattleInitialPlayer {
  hp?: number;
}

/** 초기 적 상태 */
export interface BattleInitialEnemy {
  hp?: number;
  deck?: unknown[];
  speed?: number;
  ether?: number;
}

/** 시뮬레이션 설정 */
export interface BattleSimulation {
  initialState?: {
    player?: BattleInitialPlayer;
    enemy?: BattleInitialEnemy;
  };
}

/** 전투 데이터 */
export interface BattleData {
  nodeId?: string;
  kind?: string;
  label?: string;
  enemyCount?: number;
  simulation?: BattleSimulation;
  mixedEnemies?: BattleEnemyData[];
  enemies?: string[];
}

/** 전투 페이로드 */
export interface BattlePayload {
  player: {
    hp: number;
    maxHp: number;
    energy: number;
    maxEnergy: number;
    block: number;
    strength: number;
    insight: number;
    maxSpeed: number;
    etherPts: number;
    // 이변 효과 및 추가 속성 (선택적)
    agility?: number;
    tokens?: TokenState;
    energyPenalty?: number;
    speedPenalty?: number;
    drawPenalty?: number;
    insightPenalty?: number;
    etherBan?: boolean;
  };
  enemy: {
    name: string;
    hp: number;
    maxHp: number;
    deck: unknown[];
    composition: BattleEnemyComposition[];
    etherPts: number;
    etherCapacity: number;
    enemyCount: number;
    maxSpeed: number;
    passives: BattlePassives;
    cardsPerTurn: number;
    ether: number;
    units: BattleEnemyUnit[];
    // 보스 및 추가 속성 (선택적)
    type?: string;
    isBoss?: boolean;
    shroud?: number;
  };
}

/** 전투 결과 */
export interface BattleResult {
  result: 'victory' | 'defeat';
  playerEther?: number;
  deltaEther?: number;
  playerHp: number;
  playerMaxHp: number;
}
