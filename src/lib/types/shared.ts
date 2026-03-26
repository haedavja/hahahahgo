/**
 * @file shared.ts
 * @description 게임과 시뮬레이터 공유 타입 정의
 *
 * 게임과 시뮬레이터에서 공통으로 사용하는 핵심 타입을 정의합니다.
 * 중복 타입 정의를 방지하고 일관성을 유지합니다.
 */

// ==================== 카드 타입 ====================

export type CardType = 'attack' | 'defense' | 'general' | 'move' | 'reaction' | 'support';
export type CardPriority = 'quick' | 'normal' | 'slow' | 'instant';
export type CardCategory = 'fencing' | 'gun' | 'special' | 'basic';
export type CardRarity = 'common' | 'rare' | 'special' | 'legendary';

// ==================== 토큰 타입 ====================

export type TokenType = 'usage' | 'turn' | 'permanent';
export type TokenCategory = 'positive' | 'negative' | 'neutral';

/** 토큰 상태 (공유) */
export interface TokenState {
  [tokenId: string]: number;
}

/** 적용할 토큰 정보 */
export interface AppliedToken {
  id: string;
  target: 'player' | 'enemy';
  stacks?: number;
}

/** 필요한 토큰 정보 */
export interface RequiredToken {
  id: string;
  stacks: number;
}

// ==================== 교차 보너스 ====================

export type CrossBonusType =
  | 'damage_mult'
  | 'gun_attack'
  | 'block_mult'
  | 'advance'
  | 'push'
  | 'push_gain_block'
  | 'add_tokens'
  | 'intercept_upgrade'
  | 'destroy_card'
  | 'guaranteed_crit';

export interface CrossBonus {
  type: CrossBonusType;
  value?: number;
  count?: number;
  maxPush?: number;
  tokens?: { id: string; stacks: number; target: 'player' | 'enemy' }[];
}

// ==================== 카드 인터페이스 ====================

/** 기본 카드 인터페이스 (게임/시뮬레이터 공유) */
export interface BaseCard {
  id: string;
  name: string;
  type: CardType;
  damage?: number;
  block?: number;
  hits?: number;
  speedCost: number;
  actionCost: number;
  priority?: CardPriority;
  iconKey?: string;
  description: string;
  traits?: string[];
  cardCategory?: CardCategory;
  special?: string;
  advanceAmount?: number;
  pushAmount?: number;
  appliedTokens?: AppliedToken[];
  requiredTokens?: RequiredToken[];
  crossBonus?: CrossBonus;
  tags?: string[];
  rarity?: CardRarity;
}

/** 확장 카드 인터페이스 (게임용 추가 필드) */
export interface GameCard extends BaseCard {
  enhancementLevel?: number;
  specializations?: string[];
  isGhost?: boolean;
  _combo?: string;
}

// ==================== 전투 참여자 ====================

/** 전투 참여자 기본 상태 */
export interface CombatantState {
  hp: number;
  maxHp: number;
  block: number;
  tokens: TokenState;
}

/** 플레이어 기본 상태 */
export interface BasePlayerState extends CombatantState {
  energy: number;
  maxEnergy: number;
  strength: number;
  agility: number;
  ether: number;
  maxSpeed: number;
  insight: number;
  hand: string[];
  deck: string[];
  discard: string[];
  relics: string[];
}

/** 적 기본 상태 */
export interface BaseEnemyState extends CombatantState {
  id: string;
  name: string;
  maxSpeed: number;
  cardsPerTurn: number;
  deck: string[];
  emoji?: string;
  tier?: number;
  isBoss?: boolean;
  description?: string;
}

// ==================== 타임라인 ====================

export type TimelineOwner = 'player' | 'enemy';

/** 타임라인 카드 */
export interface TimelineCard {
  cardId: string;
  owner: TimelineOwner;
  /** 타임라인 위치 (레거시 호환) */
  position: number;
  /** 스피드 포인트 */
  sp?: number;
  crossed?: boolean;
  executed?: boolean;
}

// ==================== 전투 페이즈 ====================

export type BattlePhase = 'select' | 'respond' | 'resolve' | 'end';

// ==================== 전투 이벤트 ====================

export type BattleEventType =
  | 'battle_start'
  | 'turn_start'
  | 'card_select'
  | 'card_respond'
  | 'timeline_resolve'
  | 'card_execute'
  | 'damage_dealt'
  | 'block_gained'
  | 'token_applied'
  | 'token_removed'
  | 'counter_triggered'
  | 'counter_shot_triggered'
  | 'cross_triggered'
  | 'chain_triggered'
  | 'special_triggered'
  | 'turn_end'
  | 'battle_end';

export interface BattleEvent {
  type: BattleEventType;
  turn: number;
  actor?: TimelineOwner;
  cardId?: string;
  value?: number;
  data?: Record<string, unknown>;
  message?: string;
}

// ==================== 전투 결과 ====================

export type BattleWinner = 'player' | 'enemy' | 'draw';

export interface BattleResult {
  winner: BattleWinner;
  /** @alias victory - player가 이겼는지 여부 */
  victory: boolean;
  turns: number;
  playerDamageDealt: number;
  enemyDamageDealt: number;
  playerFinalHp: number;
  enemyFinalHp: number;
  etherGained: number;
  goldChange: number;
  battleLog: string[];
  events: BattleEvent[];
  cardUsage: Record<string, number>;
  comboStats: Record<string, number>;
  tokenStats: Record<string, number>;
  timeline: TimelineCard[];
}

// ==================== 시뮬레이션 ====================

export interface SimulationConfig {
  battles: number;
  maxTurns: number;
  enemyIds: string[];
  playerDeck: string[];
  playerRelics?: string[];
  playerStats?: {
    hp?: number;
    maxHp?: number;
    energy?: number;
    strength?: number;
    agility?: number;
    insight?: number;
  };
  anomalyId?: string;
  anomalyLevel?: number;
  verbose?: boolean;
}

export interface SimulationSummary {
  totalBattles: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  avgTurns: number;
  avgPlayerDamage: number;
  avgEnemyDamage: number;
  avgEtherGained: number;
  cardEfficiency: Record<string, { uses: number; avgDamage: number }>;
  tokenUsage: Record<string, number>;
}

export interface SimulationResult {
  config: SimulationConfig;
  results: BattleResult[];
  summary: SimulationSummary;
  timestamp: number;
  duration: number;
}

// ==================== 피해 계산 ====================

export interface DamageModifiers {
  damageBonus: number;
  attackMultiplier: number;
  bonusDamage: number;
}

export interface DefenseModifiers {
  blockBonus: number;
  blockMultiplier: number;
}

export interface DamageTakenModifiers {
  damageMultiplier: number;
  damageReduction: number;
}

export interface CombatResult {
  damage: number;
  blocked: number;
  actualDamage: number;
  isCrit: boolean;
  hitCount: number;
}

// ==================== 통찰 시스템 ====================

export type InsightLevelName = '망각' | '미련' | '우둔' | '평온' | '예측' | '독심' | '혜안';

export interface InsightLevel {
  level: number;
  name: InsightLevelName;
  description: string;
}

export interface InsightReveal {
  visible: boolean;
  level: number;
  revealedCardCount: number;
  showCardDetails: boolean;
  showEnemyHp: boolean;
  showEnemyEther: boolean;
  showTimeline: boolean;
}

// ==================== 콤보 시스템 ====================

export type ComboName =
  | '하이카드'
  | '페어'
  | '투페어'
  | '트리플'
  | '플러쉬'
  | '풀하우스'
  | '포카드'
  | '파이브카드';

export interface ComboResult {
  name: ComboName;
  multiplier: number;
  rank: number;
  bonusKeys: Set<number> | null;
  description: string;
}

// ==================== 적 패시브 ====================

export interface EnemyPassives {
  veilAtStart?: boolean;
  healPerTurn?: number;
  strengthPerTurn?: number;
  critBoostAtStart?: number;
  summonOnHalfHp?: boolean;
  counterOnHit?: boolean;
  reflectDamage?: number;
}

// ==================== 다중 적 유닛 ====================

export interface EnemyUnit {
  unitId: number;
  id?: string;
  name?: string;
  hp: number;
  maxHp: number;
  block?: number;
  tokens?: TokenState;
  deck?: string[];
  cardsPerTurn?: number;
  emoji?: string;
  passives?: EnemyPassives;
  hasSummoned?: boolean;
  hasVeil?: boolean;
}

// ==================== 다음 턴 효과 ====================

export interface NextTurnEffects {
  guaranteedCards?: string[];
  mainSpecialOnly?: boolean;
  bonusEnergy?: number;
  etherBlocked?: boolean;
  repeatTimelineNext?: boolean;
  blockNextTurn?: number;
  healNextTurn?: number;
  energyNextTurn?: number;
  maxSpeedBonus?: number;
  extraCardPlay?: number;
  subSpecialBoost?: number;
  fencingDamageBonus?: number;
  guaranteedCrit?: boolean;
  recallCard?: boolean;
  emergencyDraw?: number;
  destroyOverlappingCard?: boolean;
  triggerCreation3x3?: boolean;
  creationIsAoe?: boolean;
  isAoeAttack?: boolean;
  energyPenalty?: number;
  player?: Record<string, unknown>;
  enemy?: Record<string, unknown>;
  otherEffect?: unknown;
  [key: string]: unknown;
}
