/**
 * 게임 상태 타입 정의
 *
 * 게임 전체 상태, 맵, 던전, 이벤트 시스템
 */

import type {
  Token,
  TokenState,
  Resources,
  Relic,
  ResourceReward
} from './core';
import type { BattleState } from './combat';

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
  displayLabel?: string;
  x?: number;
  y?: number;
  isStart?: boolean;
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

// ==================== 던전 선택지 시스템 ====================

/** 스탯 요구사항 */
export interface DungeonStatRequirement {
  stat: string;
  value: number;
}

/** 스케일링 요구사항 */
export interface DungeonScalingRequirement {
  stat: string;
  baseValue: number;
  increment: number;
}

/** 선택지 요구사항 */
export interface DungeonChoiceRequirements {
  item?: string;
  strength?: number;
  agility?: number;
  insight?: number;
  energy?: number;
  [key: string]: unknown;
}

/** 결과 효과 */
export interface DungeonOutcomeEffect {
  [key: string]: unknown;
}

/** 결과 */
export interface DungeonOutcome {
  type?: string;
  effect?: DungeonOutcomeEffect;
  text: string;
}

/** 특수 오버라이드 */
export interface DungeonSpecialOverride {
  requiredSpecial: string;
  text: string;
  outcome: DungeonOutcome;
}

/** 선택지 */
export interface DungeonChoice {
  text: string;
  repeatable?: boolean;
  maxAttempts?: number;
  requirements?: DungeonChoiceRequirements;
  scalingRequirement?: DungeonScalingRequirement;
  specialOverrides?: DungeonSpecialOverride[];
  warningAtAttempt?: number;
  warningText?: string;
  progressText?: string[];
  outcomes: {
    success: DungeonOutcome;
    failure: DungeonOutcome;
  };
  screenEffect?: string;
  soundEffect?: string;
}

/** 플레이어 스탯 (던전용) */
export interface DungeonPlayerStats {
  strength?: number;
  agility?: number;
  insight?: number;
  energy?: number;
  specials?: string[];
  [key: string]: unknown;
}

/** 선택지 상태 */
export interface DungeonChoiceState {
  attempts?: number;
  completed?: boolean;
}

/** 인벤토리 */
export interface DungeonInventory {
  items?: string[];
  keys?: string[];
}

/** 선택 가능 결과 */
export interface DungeonCanSelectResult {
  canSelect: boolean;
  reason: string | null;
  isHidden: boolean;
  statRequired?: DungeonStatRequirement;
}

/** 선택 실행 결과 */
export interface DungeonExecuteResult {
  result: string;
  effect: DungeonOutcomeEffect;
  message: string;
  newState: DungeonChoiceState;
  isSpecial?: boolean;
  warning?: string | null;
  progressMessage?: string | null;
  canContinue?: boolean;
  screenEffect?: string;
  soundEffect?: string;
}

/** 선택지 표시 정보 */
export interface DungeonChoiceDisplayInfo {
  text: string;
  subtext: string;
  disabled: boolean;
  hidden: boolean;
  isSpecial?: boolean;
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

/** 이벤트 정의 */
export interface EventDefinition {
  title?: string;
  description?: string;
  multiStage?: boolean;
}

/** 이벤트 정보 */
export interface EventInfo {
  id: string;
  title: string;
  description: string;
  multiStage: boolean;
}

// ==================== 게임 상태 ====================

/** 이벤트 보상 타입 */
export interface EventRewards extends Partial<Resources> {
  card?: number | string;
  insight?: number;
  relic?: string | number;
  grace?: number;
  item?: string;
  trait?: string;
  hp?: number;
  mapRisk?: number;
  hpRestore?: string | number;
}

/** 새 이벤트 선택지 (newEvents.ts용) */
export interface NewEventChoice {
  id: string;
  label: string;
  nextStage?: string;
  resultDescription?: string;
  cost?: Partial<Resources> & { hp?: number; hpPercent?: number; grace?: number };
  rewards?: EventRewards;
  successRewards?: EventRewards;
  combatRewards?: EventRewards;
  statRequirement?: Record<string, number>;
  nextEvent?: string;
  openShop?: string;
  probability?: number | string;
  combatTrigger?: string | boolean;
  penalties?: EventRewards;
  condition?: string;
  hidden?: boolean;
  [key: string]: unknown;
}

/** 새 이벤트 단계 */
export interface NewEventStage {
  description: string;
  choices: NewEventChoice[];
  [key: string]: unknown;
}

/** 새 이벤트 정의 */
export interface NewEventDefinition {
  id: string;
  title?: string;
  description?: string;
  difficulty?: string;
  choices?: NewEventChoice[];
  stages?: Record<string, NewEventStage>;
  isInitial?: boolean;
  category?: string;
  weight?: number;
  requirements?: Record<string, unknown>;
  [key: string]: unknown;
}

/** 활성 이벤트 */
export interface ActiveEvent {
  id: string;
  step?: string;
  nodeId?: string;
  definition?: NewEventDefinition;
  currentStage?: string | null;
  resolved?: boolean;
  outcome?: unknown;
  risk?: number;
  friendlyChance?: number;
}

/** 던전 노드 이벤트 */
export interface DungeonNodeEvent {
  type: string;
  id?: string;
  data?: Record<string, unknown>;
}

/** 던전 데이터 */
export interface DungeonData {
  nodes?: Array<{ id: string; connections: string[]; visited?: boolean; cleared?: boolean; event?: DungeonNodeEvent | null }>;
  currentNodeId?: string;
  timeElapsed?: number;
  grid?: Record<string, { visited?: boolean; cleared?: boolean }>;
}

/** 활성 던전 */
export interface ActiveDungeon {
  nodeId: string;
  revealed?: boolean;
  confirmed?: boolean;
  dungeonData?: DungeonData;
  segmentIndex?: number;
  playerX?: number;
  currentRoomKey?: string;
  initialResources?: Partial<Resources>;
  dungeonDeltas?: { gold?: number; intel?: number; material?: number; loot?: number; etherPts?: number };
}

/** 활성 전투 */
export interface ActiveBattle {
  label: string;
  kind: string;
  difficulty: string;
}

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
  activeDungeon: ActiveDungeon | null;
  activeEvent: ActiveEvent | null;
}

/** 게임 맵 */
export interface GameMap {
  nodes?: MapNode[];
  currentNodeId?: string;
}

/** 게임 자원 (확장) */
export interface GameResources {
  gold: number;
  intel: number;
  loot: number;
  material: number;
  aether: number;
  memory: number;
  [key: string]: number;
}

// ==================== 적 그룹 ====================

/** 적 그룹 */
export interface EnemyGroup {
  id: string;
  name: string;
  tier: number;
  enemies: string[];
}

// ==================== 에러 로거 ====================

/** 에러 컨텍스트 */
export interface ErrorContext {
  phase?: string;
  action?: string;
  componentName?: string;
  additionalInfo?: Record<string, unknown>;
}

/** 에러 로그 항목 */
export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  context?: ErrorContext;
  userAgent: string;
  url: string;
}

/** 에러 로거 설정 */
export interface ErrorLoggerConfig {
  maxEntries: number;
  storageKey: string;
  enableConsole: boolean;
}
