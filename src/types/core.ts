/**
 * 핵심 타입 정의
 *
 * 카드, 자원, 상징, 토큰 등 기본 타입
 */

// ==================== 카드 시스템 ====================

/** 카드 희귀도 */
export type CardRarity = 'common' | 'rare' | 'special' | 'legendary';

/** 카드 타입 */
export type CardType = 'attack' | 'defense' | 'general' | 'support';

/** 카드 카테고리 */
export type CardCategory = 'fencing' | 'pistol' | 'guard' | 'misc' | 'gun';

/** 카드 특성 ID */
export type CardTrait =
  | 'advance' | 'knockback' | 'crush' | 'chain' | 'cross' | 'creation'
  | 'repeat' | 'warmup' | 'exhaust' | 'vanish' | 'mistake' | 'protagonist'
  | 'last' | 'robber' | 'ruin' | 'oblivion' | 'outcast';

/** 카드 우선순위 */
export type CardPriority = 'fast' | 'normal' | 'slow';

/** 카드 정의 */
export interface Card {
  id: string;
  name: string;
  type: CardType;
  damage?: number;
  defense?: number;
  block?: number;
  speedCost: number;
  actionCost: number;
  iconKey?: string;
  description: string;
  traits?: CardTrait[];
  cardCategory?: CardCategory;
  special?: string;
  isGhost?: boolean;
  _combo?: string;
  // 런타임 확장 속성
  priority?: CardPriority;
  tags?: string[];
  hits?: number;
  counter?: number;
  rarity?: CardRarity;
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
  | 'ON_DAMAGE_TAKEN' | 'ON_CARD_DRAW' | 'ON_COMBO';

/** 상징 효과 */
export interface RelicEffect {
  etherMultiplier?: number;
  etherPerCard?: number;
  maxHpBonus?: number;
  healOnRest?: number;
  startingGold?: number;
  shopDiscount?: number;
  // ... 기타 효과
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
  usage: TokenInstance[];
  turn: TokenInstance[];
  permanent: TokenInstance[];
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
