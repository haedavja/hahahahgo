/**
 * 하하하GO 게임 타입 정의
 *
 * 이 파일은 게임의 핵심 데이터 구조를 정의합니다.
 * JS 파일에서 JSDoc으로 참조하여 타입 안전성을 확보합니다.
 */

// ==================== 카드 시스템 ====================

/** 카드 희귀도 */
export type CardRarity = 'common' | 'rare' | 'special' | 'legendary';

/** 카드 타입 */
export type CardType = 'attack' | 'defense' | 'general' | 'support';

/** 카드 카테고리 */
export type CardCategory = 'fencing' | 'pistol' | 'guard' | 'misc';

/** 카드 특성 ID */
export type CardTrait =
  | 'advance' | 'knockback' | 'crush' | 'chain' | 'cross' | 'creation'
  | 'repeat' | 'warmup' | 'exhaust' | 'vanish' | 'mistake' | 'protagonist'
  | 'last' | 'robber' | 'ruin' | 'oblivion' | 'outcast';

/** 카드 정의 */
export interface Card {
  id: string;
  name: string;
  type: CardType;
  damage?: number;
  defense?: number;
  speedCost: number;
  actionCost: number;
  iconKey?: string;
  description: string;
  traits?: CardTrait[];
  cardCategory?: CardCategory;
  special?: string;
  isGhost?: boolean;
  _combo?: string;
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

// ==================== 전투 시스템 ====================

/** 토큰 대상 */
export type TokenTarget = 'player' | 'enemy';

/** 토큰 정의 */
export interface Token {
  id: string;
  stacks: number;
  target: TokenTarget;
}

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

/** 전투 상태 */
export interface BattleState {
  playerHp: number;
  enemyHp: number;
  playerTokens: Token[];
  enemyTokens: Token[];
  timeline: number;
  turn: number;
}

// ==================== 던전 시스템 ====================

/** 던전 오브젝트 타입 */
export type DungeonObjectType =
  | 'chest' | 'curio' | 'combat' | 'crossroad' | 'shortcut'
  | 'ore' | 'gold_pile' | 'crate' | 'crystal' | 'mushroom' | 'corpse';

/** 던전 오브젝트 */
export interface DungeonObject {
  id: string;
  typeId: DungeonObjectType;
  x: number;
  used: boolean;
  isSpecial?: boolean;
  template?: object;
  choiceState?: object;
}

/** 던전 방 */
export interface DungeonRoom {
  id: string;
  x: number;
  y: number;
  roomType: 'entrance' | 'normal' | 'exit' | 'hidden';
  objects: DungeonObject[];
  exits: {
    north: boolean;
    south: boolean;
    east: boolean;
    west: boolean;
  };
  visited: boolean;
  discovered: boolean;
}

// ==================== 이벤트 시스템 ====================

/** 이벤트 선택지 결과 타입 */
export type ChoiceResultType = 'success' | 'failure' | 'partial' | 'hidden';

/** 이벤트 선택지 */
export interface EventChoice {
  id: string;
  text: string;
  requirements?: {
    item?: string;
    stat?: string;
    value?: number;
  };
  repeatable?: boolean;
  maxAttempts?: number;
  outcomes: {
    success: {
      type: ChoiceResultType;
      text: string;
      effect: {
        reward?: ResourceReward;
        damage?: number;
        buff?: string;
        debuff?: string;
      };
    };
    failure?: {
      type: ChoiceResultType;
      text: string;
      effect: object;
    };
  };
}

// ==================== 맵 시스템 ====================

/** 맵 노드 타입 */
export type MapNodeType = 'combat' | 'event' | 'shop' | 'rest' | 'dungeon' | 'boss';

/** 맵 노드 */
export interface MapNode {
  id: string;
  type: MapNodeType;
  layer: number;
  cleared: boolean;
  selectable: boolean;
  connections: string[];
}

// ==================== 게임 상태 ====================

/** 게임 전체 상태 */
export interface GameState {
  resources: Resources;
  playerHp: number;
  maxHp: number;
  playerStrength: number;
  playerAgility: number;
  playerInsight: number;
  relics: Relic[];
  map: {
    nodes: MapNode[];
    currentNodeId: string;
  };
  mapRisk: number;
  activeBattle: BattleState | null;
  activeDungeon: object | null;
  activeEvent: object | null;
}

// ==================== 전투 확장 타입 ====================

/** 전투 참여자 (플레이어/적 공통) */
export interface Combatant {
  hp: number;
  maxHp: number;
  block: number;
  tokens: Token[];
  strength?: number;
  agility?: number;
  insight?: number;
  counter?: number;
}

/** 플레이어 전투 상태 */
export interface PlayerBattleState extends Combatant {
  energy: number;
  maxEnergy: number;
  hand: Card[];
  deck: Card[];
  discard: Card[];
  exhaust: Card[];
  timeline: number;
  maxTimeline: number;
  ether: number;
  etherMultiplier: number;
}

/** 적 유닛 */
export interface EnemyUnit extends Combatant {
  id: string;
  name: string;
  tier: number;
  damage: number;
  defense: number;
  speed: number;
  pattern?: string;
  intent?: EnemyIntent;
  isDead?: boolean;
}

/** 적 의도 표시 */
export interface EnemyIntent {
  type: 'attack' | 'defense' | 'buff' | 'debuff' | 'special';
  icon: string;
  text: string;
  value?: number;
}

/** 전투 이벤트 */
export interface BattleEvent {
  actor: 'player' | 'enemy' | 'system' | 'counter' | 'relic';
  type?: 'damage' | 'heal' | 'block' | 'token' | 'ether' | 'card';
  value?: number;
  msg: string;
  targetId?: string;
}

/** 전투 로그 */
export interface BattleLog {
  turn: number;
  phase: string;
  message: string;
  timestamp?: number;
}

/** 카드 실행 결과 */
export interface CardExecutionResult {
  player: PlayerBattleState;
  enemy: EnemyUnit;
  events: BattleEvent[];
  logs: string[];
  damage?: number;
  blocked?: number;
  isCritical?: boolean;
}

/** 반격 결과 */
export interface CounterResult {
  attacker: Combatant;
  damage: number;
  events: BattleEvent[];
  logs: string[];
}

/** 피해 계산 결과 */
export interface DamageResult {
  finalDamage: number;
  blocked: number;
  isCritical: boolean;
  isDodged: boolean;
  modifiers: DamageModifier[];
}

/** 피해 수정자 */
export interface DamageModifier {
  source: string;
  type: 'multiply' | 'add' | 'flat';
  value: number;
}

// ==================== 토큰 확장 타입 ====================

/** 토큰 타입 */
export type TokenType = 'usage' | 'turn' | 'permanent';

/** 토큰 카테고리 */
export type TokenCategory = 'positive' | 'negative' | 'neutral';

/** 토큰 정의 (확장) */
export interface TokenDefinition {
  id: string;
  name: string;
  type: TokenType;
  category: TokenCategory;
  emoji: string;
  description: string;
  effect: {
    type: string;
    value: number;
  };
}

/** 토큰 조작 결과 */
export interface TokenOperationResult {
  tokens: Token[];
  added?: number;
  removed?: number;
  cancelled?: boolean;
}

// ==================== 콤보 시스템 ====================

/** 콤보 타입 */
export type ComboType =
  | 'highCard' | 'onePair' | 'twoPair' | 'threeOfAKind'
  | 'straight' | 'fullHouse' | 'fourOfAKind' | 'fiveOfAKind';

/** 콤보 결과 */
export interface ComboResult {
  type: ComboType;
  rank: number;
  multiplier: number;
  cards: Card[];
  description: string;
}

// ==================== 상징 확장 타입 ====================

/** 상징 효과 타입 */
export type RelicEffectType =
  | 'PASSIVE' | 'ON_COMBAT_START' | 'ON_COMBAT_END'
  | 'ON_TURN_START' | 'ON_TURN_END' | 'ON_CARD_PLAYED'
  | 'ON_DAMAGE_TAKEN' | 'ON_CARD_DRAW' | 'ON_COMBO';

/** 상징 활성화 결과 */
export interface RelicActivationResult {
  relicId: string;
  triggered: boolean;
  effects: BattleEvent[];
  message?: string;
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
