/**
 * @file game-types.ts
 * @description 실제 게임과 동기화된 타입 정의
 *
 * 이 파일은 실제 게임 데이터 구조를 그대로 반영합니다.
 */

// ==================== 카드 타입 ====================

export type CardType = 'attack' | 'defense' | 'general' | 'move' | 'reaction' | 'support';
export type CardPriority = 'quick' | 'normal' | 'slow' | 'instant';
export type CardCategory = 'fencing' | 'gun' | 'special' | 'basic';

export interface AppliedToken {
  id: string;
  target: 'player' | 'enemy';
  stacks?: number;
}

export interface RequiredToken {
  id: string;
  stacks: number;
}

export interface CrossBonus {
  type: 'damage_mult' | 'gun_attack' | 'block_mult' | 'advance';
  value?: number;
  count?: number;
}

export interface GameCard {
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
  // 강화 관련
  enhancementLevel?: number;
  specializations?: string[];
}

// ==================== 토큰 타입 ====================

export type TokenType = 'usage' | 'turn' | 'permanent';
export type TokenCategory = 'positive' | 'negative' | 'neutral';

export interface TokenEffect {
  type: string;
  value: number;
  advance?: number;
}

export interface GameToken {
  id: string;
  name: string;
  type: TokenType;
  category: TokenCategory;
  emoji: string;
  description: string;
  effect: TokenEffect;
}

// ==================== 상징 타입 ====================

export type RelicRarity = 'common' | 'rare' | 'special' | 'legendary' | 'dev';
export type RelicEffectType =
  | 'PASSIVE'
  | 'ON_COMBAT_START'
  | 'ON_COMBAT_END'
  | 'ON_TURN_START'
  | 'ON_TURN_END'
  | 'ON_CARD_PLAYED'
  | 'ON_DAMAGE_TAKEN'
  | 'ON_CARD_DRAW'
  | 'ON_NODE_MOVE';

export interface RelicConditionState {
  cardsPlayedThisTurn?: number;
  playerHp?: number;
  maxHp?: number;
  allCardsDefense?: boolean;
  allCardsLowCost?: boolean;
  timesAttackedThisTurn?: number;
}

export interface RelicEffects {
  type: RelicEffectType;
  // 패시브 효과
  maxEnergy?: number;
  maxHp?: number;
  strength?: number;
  agility?: number;
  maxSpeed?: number;
  maxSubmitCards?: number;
  subSpecialSlots?: number;
  mainSpecialSlots?: number;
  cardDrawBonus?: number;
  etherMultiplier?: number;
  comboMultiplierPerCard?: number;
  negativeTraitMultiplier?: number;
  etherFiveCardBonus?: number;
  etherCardMultiplier?: boolean;
  // 트리거 효과
  block?: number;
  heal?: number;
  damage?: number;
  energyNextTurn?: number;
  blockNextTurn?: number;
  healNextTurn?: number;
  maxHpIfFull?: number;
  healIfDamaged?: number;
  etherPercent?: number;
  condition?: (state: RelicConditionState) => boolean;
}

export interface GameRelic {
  id: string;
  name: string;
  emoji: string;
  rarity: RelicRarity;
  tags: string[];
  description: string;
  effects: RelicEffects;
}

// ==================== 특성 타입 ====================

export interface GameTrait {
  id: string;
  name: string;
  type: 'positive' | 'negative';
  weight: number;
  description: string;
}

// ==================== 적 타입 ====================

export interface EnemyPattern {
  hpThreshold: number;
  pattern: string[];
  description: string;
}

export interface GameEnemy {
  id: string;
  name: string;
  tier: number;
  hp: number;
  maxSpeed: number;
  cardsPerTurn: number;
  deck: string[];
  patterns?: EnemyPattern[];
  passive?: {
    type: string;
    effect: string;
  };
  description?: string;
}

// ==================== 전투 상태 타입 ====================

export interface TimelineCard {
  cardId: string;
  owner: 'player' | 'enemy';
  position: number;
  crossed?: boolean;
  executed?: boolean;
}

export interface TokenState {
  [tokenId: string]: number;
}

export interface CombatantState {
  hp: number;
  maxHp: number;
  block: number;
  tokens: TokenState;
  maxSpeed: number;
}

export interface PlayerState extends CombatantState {
  energy: number;
  maxEnergy: number;
  strength: number;
  agility: number;
  ether: number;
  hand: string[];
  deck: string[];
  discard: string[];
  relics: string[];
  insight: number;
}

export interface EnemyState extends CombatantState {
  id: string;
  name: string;
  cardsPerTurn: number;
  deck: string[];
  pattern?: string;
}

export interface GameBattleState {
  player: PlayerState;
  enemy: EnemyState;
  turn: number;
  phase: 'select' | 'respond' | 'resolve' | 'end';
  timeline: TimelineCard[];
  anomalyId?: string;
  battleLog: string[];
}

// ==================== 타임라인 시스템 ====================

export interface TimelineConfig {
  maxSpeed: number;
  tickInterval: number;
}

export function generateSpeedTicks(maxSpeed: number, tickInterval: number = 5): number[] {
  return Array.from(
    { length: Math.floor(maxSpeed / tickInterval) + 1 },
    (_, idx) => idx * tickInterval
  );
}

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
  | 'turn_end'
  | 'battle_end';

export interface BattleEvent {
  type: BattleEventType;
  turn: number;
  actor?: 'player' | 'enemy';
  cardId?: string;
  value?: number;
  data?: Record<string, unknown>;
  message?: string;
}

// ==================== 시뮬레이션 결과 ====================

export interface BattleResult {
  winner: 'player' | 'enemy' | 'draw';
  turns: number;
  playerDamageDealt: number;
  enemyDamageDealt: number;
  playerFinalHp: number;
  enemyFinalHp: number;
  etherGained: number;
  battleLog: string[];
  events: BattleEvent[];
  cardUsage: Record<string, number>;
  comboStats: Record<string, number>;
  tokenStats: Record<string, number>;
  timeline: TimelineCard[];
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
