/**
 * @file balanceConfig.ts
 * @description 게임 밸런스 상수 중앙 관리
 *
 * 이 파일에서 게임 밸런스 관련 모든 상수를 관리합니다.
 * 밸런싱 조정 시 이 파일만 수정하면 됩니다.
 */

// ==================== 전투 시스템 ====================

/** 타임라인 설정 */
export const TIMELINE = {
  /** 기본 최대 속도 (레거시 호환용) */
  MAX_SPEED: 30,
  /** 플레이어 기본 최대 속도 */
  PLAYER_MAX_SPEED: 30,
  /** 적 기본 최대 속도 */
  ENEMY_MAX_SPEED: 30,
  /** 타임라인 틱 간격 */
  TICK_INTERVAL: 5,
} as const;

/** 행동력 설정 */
export const ENERGY = {
  /** 플레이어 기본 행동력 */
  BASE_PLAYER: 4,
  /** 최대 제출 카드 수 */
  MAX_SUBMIT_CARDS: 5,
  /** 턴 시작 시 기본 드로우 수 */
  DEFAULT_DRAW_COUNT: 5,
} as const;

/** 에테르 설정 */
export const ETHER = {
  /** 에테르 임계값 (오버드라이브 발동 기준) */
  THRESHOLD: 100,
  /** 카드당 기본 에테르 획득량 */
  BASE_PER_CARD: 10,
  /** 희귀도별 에테르 획득량 */
  BY_RARITY: {
    common: 8,
    uncommon: 12,
    rare: 16,
    epic: 20,
    legendary: 25,
  },
} as const;

/** 전투 효과 설정 */
export const COMBAT_EFFECTS = {
  /** 기절 효과 범위 (타임라인 기준) */
  STUN_RANGE: 5,
  /** 처형 임계값 (적 HP 이하일 때 즉사) */
  EXECUTION_THRESHOLD: 30,
} as const;

/** 콤보 배율 */
export const COMBO_MULTIPLIERS: Record<string, number> = {
  '하이카드': 1,
  '페어': 2,
  '투페어': 2.5,
  '트리플': 3,
  '플러쉬': 3.5,
  '풀하우스': 3.75,
  '포카드': 4,
  '파이브카드': 5,
} as const;

// ==================== 경제/진행 시스템 ====================

/** 기억(Memory) 설정 */
export const MEMORY = {
  /** 노드 이동당 기억 획득량 */
  GAIN_PER_NODE: 10,
  /** 명상 시 기억 획득량 */
  MEDITATION_GAIN: 50,
} as const;

/** 각성 설정 */
export const AWAKENING = {
  /** 각성 비용 (기억) */
  COST: 100,
} as const;

/** 전투 보상 설정 */
export const BATTLE_REWARDS = {
  /** 일반 전투 */
  battle: {
    gold: { min: 10, max: 16 },
    loot: { min: 1, max: 2 },
    memory: { min: 15, max: 25 },
  },
  /** 정예 전투 */
  elite: {
    gold: { min: 18, max: 26 },
    loot: { min: 2, max: 3 },
    intel: 1,
    memory: { min: 30, max: 45 },
    relic: 1,  // 상징 확정 보상
  },
  /** 보스 전투 */
  boss: {
    gold: { min: 30, max: 40 },
    loot: { min: 3, max: 4 },
    intel: 2,
    material: 1,
    memory: { min: 60, max: 100 },
  },
  /** 던전 전투 */
  dungeon: {
    gold: { min: 20, max: 32 },
    loot: { min: 2, max: 4 },
    memory: { min: 20, max: 35 },
  },
} as const;

/** 휴식 노드 설정 */
export const REST_NODE = {
  /** 휴식 시 회복 비율 (최대 체력 대비) */
  HEAL_PERCENT: 0.3,
  /** 최소 회복량 */
  MIN_HEAL: 10,
} as const;

/** 상점 설정 */
export const SHOP = {
  /** 카드 제거 비용 */
  CARD_REMOVAL_COST: 75,
  /** 카드 업그레이드 비용 */
  CARD_UPGRADE_COST: 50,
} as const;

// ==================== 플레이어 설정 ====================

/** 플레이어 기본 스탯 */
export const PLAYER_DEFAULTS = {
  /** 시작 체력 */
  START_HP: 80,
  /** 최대 체력 */
  MAX_HP: 80,
  /** 시작 금화 */
  START_GOLD: 100,
  /** 최대 카드 선택 수 (카드 보상) */
  MAX_CARD_SELECTION: 3,
} as const;

// ==================== 레거시 호환성 (개별 export) ====================

// battleData.ts 호환
export const MAX_SPEED = TIMELINE.MAX_SPEED;
export const DEFAULT_PLAYER_MAX_SPEED = TIMELINE.PLAYER_MAX_SPEED;
export const DEFAULT_ENEMY_MAX_SPEED = TIMELINE.ENEMY_MAX_SPEED;
export const BASE_PLAYER_ENERGY = ENERGY.BASE_PLAYER;
export const MAX_SUBMIT_CARDS = ENERGY.MAX_SUBMIT_CARDS;
export const ETHER_THRESHOLD = ETHER.THRESHOLD;
export const DEFAULT_DRAW_COUNT = ENERGY.DEFAULT_DRAW_COUNT;

// etherCalculations.ts 호환
export const BASE_ETHER_PER_CARD = ETHER.BASE_PER_CARD;
export const CARD_ETHER_BY_RARITY = ETHER.BY_RARITY;

// stunProcessing.ts 호환
export const STUN_RANGE = COMBAT_EFFECTS.STUN_RANGE;

// executionEffects.ts 호환
export const EXECUTION_THRESHOLD = COMBAT_EFFECTS.EXECUTION_THRESHOLD;

// gameStoreHelpers.ts 호환
export const MEMORY_GAIN_PER_NODE = MEMORY.GAIN_PER_NODE;
export const AWAKEN_COST = AWAKENING.COST;
export const MAX_PLAYER_SELECTION = PLAYER_DEFAULTS.MAX_CARD_SELECTION;
