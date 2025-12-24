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
