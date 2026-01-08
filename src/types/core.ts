/**
 * 핵심 타입 정의
 *
 * 카드, 자원, 상징, 토큰 등 기본 타입
 */

import type React from 'react';

// ==================== 카드 시스템 ====================

/** 카드 희귀도 */
export type CardRarity = 'common' | 'rare' | 'special' | 'legendary';

/** 카드 타입 */
export type CardType = 'attack' | 'defense' | 'general' | 'support' | 'move' | 'reaction';

/** 카드 카테고리 */
export type CardCategory = 'fencing' | 'sword' | 'pistol' | 'guard' | 'misc' | 'gun';

/** 카드 특성 ID */
export type CardTrait =
  | 'advance' | 'knockback' | 'crush' | 'chain' | 'cross'
  | 'repeat' | 'warmup' | 'exhaust' | 'vanish' | 'stubborn'
  | 'last' | 'robber' | 'ruin' | 'oblivion' | 'outcast' | 'general'
  | 'followup' | 'finisher' | 'multiTarget' | 'stun'
  | 'strongbone' | 'weakbone' | 'destroyer' | 'slaughter' | 'pinnacle'
  | 'cooperation' | 'swift' | 'slow' | 'mastery' | 'boredom'
  | 'escape' | 'double_edge' | 'training' | 'leisure' | 'strain'
  | 'creation' | 'guard_stance';

/** 카드 우선순위 */
export type CardPriority = 'instant' | 'quick' | 'normal' | 'slow';

/** 교차 보너스 정의 */
export interface CrossBonus {
  type?: string;
  value?: number;
  count?: number;
  maxPush?: number;
  multiplier?: number;
  tokens?: Array<{
    id: string;
    stacks?: number;
    target?: string;
  }>;
}

/** 토큰 결과 */
export interface TokenResult {
  success: boolean;
}

/** 배틀 토큰 액션 (카드 onPlay용) */
export interface BattleTokenActions {
  addTokenToPlayer: (tokenId: string, stacks?: number) => TokenResult;
  addTokenToEnemy: (tokenId: string, stacks?: number) => TokenResult;
  removeTokenFromPlayer: (tokenId: string, tokenType: string, stacks?: number) => TokenResult;
  removeTokenFromEnemy: (tokenId: string, tokenType: string, stacks?: number) => TokenResult;
  resetTokenForPlayer: (tokenId: string, tokenType: string, newStacks?: number) => TokenResult;
  resetTokenForEnemy: (tokenId: string, tokenType: string, newStacks?: number) => TokenResult;
  // 확장 속성 허용 (actions 스프레드 지원)
  [key: string]: unknown;
}

/**
 * 카드 정의
 *
 * ## 필드 분류
 *
 * ### 필수 필드 (게임 데이터)
 * - id, name, type, speedCost, actionCost, description
 *
 * ### 전투 수치
 * - damage, defense, block, hits, counter
 *
 * ### 카드 속성
 * - traits, cardCategory, rarity, special, priority, tags, iconKey
 *
 * ### 상태 효과 플래그
 * - ignoreStatus, ignoreStrength, _applyBurn, _ignoreBlock, _addGunJam
 *
 * ### 특성 시스템 (여유/무리)
 * - leisurePosition, strainOffset
 *
 * ### 런타임 마킹 (전투 중 동적 추가)
 * - instanceId, __uid, __handUid, __sourceUnitId, __targetUnitId, __targetUnitIds
 * - __isSubSpecial, __isMainSpecial, isAoe, _combo
 *
 * ### 카드 생성 추적
 * - createdBy, createdId, isFromFleche, flecheChainCount, isGhost
 *
 * ### 특수 효과 (펜싱 등)
 * - crossBonus, advanceAmount, pushAmount, parryRange, parryPushAmount
 * - originalSpeedCost, priorityWeight
 *
 * ### 토큰 시스템
 * - requiredTokens
 *
 * ### UI/함수
 * - onPlay, icon
 */
export interface Card {
  // ═══════════════════ 필수 필드 ═══════════════════
  /** 카드 고유 식별자 */
  id: string;
  /** 표시 이름 */
  name: string;
  /** 카드 타입 (attack, defense, skill 등) */
  type: CardType;
  /** 속도 비용 (타임라인 위치 결정) */
  speedCost: number;
  /** 행동력 비용 */
  actionCost: number;
  /** 카드 설명 */
  description: string;

  // ═══════════════════ 전투 수치 ═══════════════════
  /** 공격력 */
  damage?: number;
  /** 방어력 (defense 타입 카드) */
  defense?: number;
  /** 방어막 */
  block?: number;
  /** 타격 횟수 (기본 1) */
  hits?: number;
  /** 반격 데미지 */
  counter?: number;

  // ═══════════════════ 카드 속성 ═══════════════════
  /** 아이콘 키 */
  iconKey?: string;
  /** 카드 특성 목록 */
  traits?: CardTrait[];
  /** 카드 카테고리 */
  cardCategory?: CardCategory;
  /** 특수 효과 ID */
  special?: string | string[];
  /** 카드 우선순위 */
  priority?: CardPriority;
  /** 카드 태그 */
  tags?: string[];
  /** 카드 레어리티 */
  rarity?: CardRarity;
  /** 고스트 카드 여부 (투명 처리) */
  isGhost?: boolean;

  // ═══════════════════ 상태 효과 플래그 ═══════════════════
  /** 상태이상 무시 */
  ignoreStatus?: boolean;
  /** 힘 버프 무시 */
  ignoreStrength?: boolean;
  /** 화상 적용 */
  _applyBurn?: boolean;
  /** 방어막 무시 */
  _ignoreBlock?: boolean;
  /** 총기 잼 추가 */
  _addGunJam?: boolean;

  // ═══════════════════ 특성 시스템 ═══════════════════
  /** 여유 특성: 사용자가 선택한 타임라인 위치 (카드 속도의 1~2배 범위) */
  leisurePosition?: number;
  /** 무리 특성: 행동력 1을 사용해 앞당긴 속도 오프셋 (최대 3) */
  strainOffset?: number;

  // ═══════════════════ 런타임 마킹 ═══════════════════
  /** 인스턴스 고유 ID */
  instanceId?: string;
  /** 내부 고유 ID */
  __uid?: string;
  /** 핸드 내 고유 ID */
  __handUid?: string;
  /** 소스 유닛 ID (멀티 유닛 전투) */
  __sourceUnitId?: number;
  /** 타겟 유닛 ID */
  __targetUnitId?: number;
  /** 타겟 유닛 ID 목록 (AOE) */
  __targetUnitIds?: number[];
  /** 서브 스페셜 여부 */
  __isSubSpecial?: boolean;
  /** 메인 스페셜 여부 */
  __isMainSpecial?: boolean;
  /** AOE 여부 */
  isAoe?: boolean;
  /** 콤보 정보 */
  _combo?: string;

  // ═══════════════════ 카드 생성 추적 ═══════════════════
  /** 카드 생성 주체 */
  createdBy?: string;
  /** 생성된 카드 ID */
  createdId?: string;
  /** 플레셰에서 생성됨 */
  isFromFleche?: boolean;
  /** 플레셰 체인 카운트 */
  flecheChainCount?: number;

  // ═══════════════════ 특수 효과 ═══════════════════
  /** 크로스 보너스 */
  crossBonus?: CrossBonus;
  /** 전진 거리 */
  advanceAmount?: number;
  /** 밀어내기 거리 */
  pushAmount?: number;
  /** 패리 범위 */
  parryRange?: number;
  /** 패리 밀어내기 거리 */
  parryPushAmount?: number;
  /** 원래 속도 비용 (수정 전) */
  originalSpeedCost?: number;
  /** 우선순위 가중치 */
  priorityWeight?: number;

  // ═══════════════════ 토큰 시스템 ═══════════════════
  /** 필요 토큰 목록 */
  requiredTokens?: Array<{ id: string; stacks: number }>;

  // ═══════════════════ UI/함수 ═══════════════════
  /** 카드 사용 시 호출되는 함수 */
  onPlay?: (battle: unknown, tokenActions: BattleTokenActions) => void;
  /** 카드 아이콘 컴포넌트 */
  icon?: React.FC<{ size?: number; className?: string; strokeWidth?: number }>;

  // ═══════════════════ 확장 ═══════════════════
  /** 확장 속성 허용 (유연한 타입 호환) */
  [key: string]: unknown;
}

/** 카드 특성 정의 */
export interface TraitDefinition {
  id: CardTrait;
  name: string;
  type: 'positive' | 'negative';
  weight: number;
  description: string;
}

// ==================== 자원 시스템 ====================

/** 게임 자원 */
export interface Resources {
  gold: number;
  intel: number;
  loot: number;
  material: number;
  etherPts: number;
  memory: number;
}

/** 자원 값 (숫자 또는 범위) */
export type ResourceValue = number | { min: number; max: number };

/** 자원 변동 (비용/보상) */
export type ResourceDelta = Partial<Record<string, ResourceValue>>;

/** 자원 보상 (범위 지정 가능) */
export interface ResourceReward {
  gold?: number | { min: number; max: number };
  material?: number | { min: number; max: number };
  intel?: number;
  loot?: number;
  relic?: string;
  potion?: number;
}

// ==================== 상징 시스템 ====================

/** 상징 희귀도 */
export type RelicRarity = 'common' | 'rare' | 'special' | 'legendary';

/** 상징 효과 타입 */
export type RelicEffectType =
  | 'PASSIVE' | 'ON_COMBAT_START' | 'ON_COMBAT_END'
  | 'ON_TURN_START' | 'ON_TURN_END' | 'ON_CARD_PLAYED'
  | 'ON_DAMAGE_TAKEN' | 'ON_CARD_DRAW' | 'ON_COMBO'
  | 'ON_NODE_MOVE';

/** 상징 효과 */
export interface RelicEffect {
  /** 효과 타입 (PASSIVE, ON_COMBAT_START 등) */
  type?: string;
  /** 에테르 배율 */
  etherMultiplier?: number;
  /** 카드당 에테르 */
  etherPerCard?: number;
  /** 최대 체력 보너스 */
  maxHpBonus?: number;
  /** 휴식 시 회복량 */
  healOnRest?: number;
  /** 시작 골드 */
  startingGold?: number;
  /** 상점 할인 */
  shopDiscount?: number;
  /** 카드당 콤보 배율 보너스 */
  comboMultiplierPerCard?: number;
  /** 콤보 배율 고정 보너스 */
  comboMultiplierBonus?: number;
  /** 카드 수에 따른 에테르 배율 증가 */
  etherCardMultiplier?: boolean;
  /** 5장 카드 제출 시 에테르 보너스 배율 */
  etherFiveCardBonus?: number;
  /** 최대 행동력 */
  maxEnergy?: number;
  /** 카드 드로우 보너스 */
  cardDrawBonus?: number;
  /** 최대 속도 보너스 */
  maxSpeed?: number;
  /** 속도 보너스 */
  speed?: number;
  /** 힘 보너스 */
  strength?: number;
  /** 시작 방어력 */
  startingBlock?: number;
  /** 추가 속성 허용 */
  [key: string]: unknown;
}

/** 상징 정의 */
export interface Relic {
  id: string;
  name: string;
  icon: string;
  rarity: RelicRarity;
  description: string;
  passive?: RelicEffect;
  activation?: {
    trigger: string;
    effect: RelicEffect;
  };
}

/** 상징 활성화 결과 */
export interface RelicActivationResult {
  relicId: string;
  triggered: boolean;
  effects: unknown[];
  message?: string;
}

// ==================== 토큰 시스템 ====================

/** 토큰 대상 */
export type TokenTarget = 'player' | 'enemy';

/** 토큰 타입 */
export type TokenType = 'usage' | 'turn' | 'permanent';

/** 토큰 카테고리 */
export type TokenCategory = 'positive' | 'negative' | 'neutral';

/** 토큰 정의 */
export interface Token {
  id: string;
  stacks: number;
  target: TokenTarget;
}

/** 토큰 정의 (확장) */
export interface TokenDefinition {
  id: string;
  name: string;
  type: TokenType;
  category: TokenCategory;
  emoji: string;
  description: string;
  effect: TokenEffectPayload;
}

/** 토큰 효과 페이로드 (정의용) */
export interface TokenEffectPayload {
  type: string;
  value: number;
  advance?: number;
}

/** 토큰 효과 타입 ID */
export type TokenEffectType =
  | 'ATTACK_BOOST' | 'ATTACK_PENALTY'
  | 'DEFENSE_BOOST' | 'DEFENSE_PENALTY'
  | 'DODGE' | 'COUNTER' | 'COUNTER_SHOT'
  | 'LIFESTEAL' | 'REVIVE' | 'IMMUNITY'
  | 'DAMAGE_TAKEN' | 'ENERGY_BOOST' | 'ENERGY_PENALTY'
  | 'STRENGTH' | 'AGILITY' | 'INSIGHT'
  | 'ETHER_TO_ENERGY' | 'REDUCE_INSIGHT'
  | 'GOLD_ON_DAMAGE' | 'FINESSE'
  | 'PERSISTENT_STRIKE' | 'HALF_ETHER'
  | 'GUN_JAM' | 'LOADED' | 'ARMOR_PIERCING'
  | 'INCENDIARY' | 'BURN' | 'ROULETTE'
  | 'CRIT_BOOST' | 'FOCUS' | 'CURSE' | 'VEIL'
  | 'EMPTY_CHAMBER';

/** 토큰 효과 정의 */
export interface TokenEffect {
  type: TokenEffectType;
  value: number;
}

/** 토큰 인스턴스 (실제 보유 토큰) */
export interface TokenInstance {
  id: string;
  stacks: number;
  grantedAt?: { turn: number; sp: number };
}

/** 토큰 상태 (유형별 분류) */
export interface TokenState {
  usage?: TokenInstance[];
  turn?: TokenInstance[];
  permanent?: TokenInstance[];
  [key: string]: TokenInstance[] | undefined;
}

/** 토큰이 있는 엔티티 */
export interface TokenEntity {
  tokens?: TokenState;
  strength?: number;
  agility?: number;
  insight?: number;
  maxHp?: number;
  hp?: number;
  block?: number;
  counter?: number;
  energy?: number;
  maxEnergy?: number;
  etherPts?: number;
}

/** 토큰 조작 결과 */
export interface TokenOperationResult {
  tokens: TokenState;
  added?: number;
  removed?: number;
  cancelled?: boolean;
}

/** 토큰 조작 결과 (확장) */
export interface TokenModificationResult {
  tokens: TokenState;
  logs: string[];
  cancelled?: number;
  remaining?: number;
}

/** 토큰 컨테이너 */
export interface TokensContainer {
  usage?: TokenInstance[];
  turn?: TokenInstance[];
  permanent?: TokenInstance[];
}

/** 토큰 상쇄 결과 */
export interface TokenCancelResult {
  cancelled: number;
  remaining: number;
  tokens: TokenState;
}

/** 토큰 데이터 (표시용) */
export interface TokenDisplayData extends TokenDefinition, TokenInstance {
  durationType: string;
}

// ==================== 적 시스템 ====================

/** 적 정의 */
export interface Enemy {
  id: string;
  name: string;
  tier: number;
  hp: number;
  damage: number;
  defense: number;
  speed: number;
  description?: string;
  pattern?: string;
  tokens?: Token[];
}

// ==================== 유틸리티 타입 ====================

/** 액션 타입 (리듀서용) */
export interface Action<T = unknown> {
  type: string;
  payload?: T;
}

/** 좌표 */
export interface Position {
  x: number;
  y: number;
}

/** 범위 값 */
export interface Range {
  min: number;
  max: number;
}

/** 로그 함수 타입 */
export type LogFunction = (message: string) => void;

// ==================== Re-exports ====================

/** CharacterBuild (systems.ts에서 재export) */
export type { CharacterBuild } from './systems';
