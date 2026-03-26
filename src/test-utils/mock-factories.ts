/**
 * @file mock-factories.ts
 * @description 테스트용 Mock 객체 팩토리 함수
 *
 * 테스트에서 `as unknown as Type` 패턴을 제거하기 위한 타입 안전한 팩토리 함수 제공
 */

import type { GameBattleState, GameCard, TokenState } from '../simulator/core/game-types';
import type { BattleResult, BattleEvent } from '../simulator/core/game-types';
import type { Resources } from '../types/core';

// ==================== 테스트용 타입 정의 ====================

/**
 * 테스트용 GameState 타입
 * 실제 GameState의 간소화 버전
 */
export interface MockGameState {
  resources: Resources;
  playerHp: number;
  maxHp: number;
  playerStrength?: number;
  playerAgility?: number;
  playerInsight?: number;
  characterBuild?: { ownedCards: string[] };
  activeBattle: GameBattleState | null;
  activeEvent: MockActiveEvent | null;
  relics?: unknown[];
  map?: { nodes: unknown[]; currentNodeId: string };
}

/**
 * 테스트용 ActiveEvent 타입
 */
export interface MockActiveEvent {
  eventId: string;
  phase?: string;
  choices?: unknown[];
  [key: string]: unknown;
}

/**
 * 테스트용 GrowthState 타입
 */
export interface MockGrowthState {
  pyramidLevel: number;
  skillPoints: number;
  traitCounts: Record<string, number>;
  unlockedEthos: string[];
  unlockedPathos: string[];
  unlockedNodes: string[];
}

/**
 * 테스트용 EventRewards 타입
 */
export interface MockEventRewards {
  gold?: number;
  intel?: number;
  card?: string | null;
  relic?: string | null;
  hp?: number;
  resources?: Partial<Resources>;
}

/**
 * 테스트용 EnemyUnit 타입
 */
export interface MockEnemyUnit {
  id: string;
  hp: number;
  maxHp: number;
  block: number;
  tokens?: TokenState;
}

/**
 * 테스트용 FinishTurnParams 타입
 */
export interface MockFinishTurnParams {
  state: GameBattleState;
  cardsToDiscard: string[];
  drawCount: number;
}

/**
 * 테스트용 ExecuteCardParams 타입
 */
export interface MockExecuteCardParams {
  state: GameBattleState;
  card: GameCard;
  actor: 'player' | 'enemy';
  target: 'player' | 'enemy';
}

/**
 * 테스트용 BattleActions 타입
 */
export interface MockBattleActions {
  dealDamage: (target: 'player' | 'enemy', amount: number) => void;
  applyBlock: (target: 'player' | 'enemy', amount: number) => void;
  healEntity: (target: 'player' | 'enemy', amount: number) => void;
  addToken: (target: 'player' | 'enemy', tokenId: string, stacks?: number) => void;
  removeToken: (target: 'player' | 'enemy', tokenId: string, stacks?: number) => void;
  [key: string]: unknown;
}

// ==================== 타입 유틸리티 ====================

/**
 * 깊은 부분 타입 (Deep Partial)
 * 중첩된 객체의 모든 속성을 선택적으로 만듦
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ==================== 기본 상태 정의 ====================

const DEFAULT_PLAYER_STATE = {
  hp: 80,
  maxHp: 100,
  block: 0,
  tokens: {} as TokenState,
  hand: [] as GameCard[],
  deck: [] as string[],
  discard: [] as string[],
};

const DEFAULT_ENEMY_STATE = {
  hp: 100,
  maxHp: 100,
  block: 0,
  tokens: {} as TokenState,
  intent: null,
};

const DEFAULT_BATTLE_STATE: GameBattleState = {
  turn: 1,
  phase: 'play' as const,
  timeline: [],
  player: DEFAULT_PLAYER_STATE,
  enemy: DEFAULT_ENEMY_STATE,
  log: [],
} as GameBattleState;

// ==================== 팩토리 함수 ====================

/**
 * 테스트용 게임 상태 생성
 *
 * @example
 * ```typescript
 * const state = createMockBattleState({
 *   player: {
 *     hp: 50,
 *     tokens: { burn: 2 },
 *   },
 * });
 * ```
 */
export function createMockBattleState(overrides: DeepPartial<GameBattleState> = {}): GameBattleState {
  return deepMerge(DEFAULT_BATTLE_STATE, overrides) as GameBattleState;
}

/**
 * 테스트용 플레이어 상태만 오버라이드
 */
export function createMockBattleStateWithPlayer(
  playerOverrides: DeepPartial<typeof DEFAULT_PLAYER_STATE>
): GameBattleState {
  return createMockBattleState({ player: playerOverrides });
}

/**
 * 테스트용 적 상태만 오버라이드
 */
export function createMockBattleStateWithEnemy(
  enemyOverrides: DeepPartial<typeof DEFAULT_ENEMY_STATE>
): GameBattleState {
  return createMockBattleState({ enemy: enemyOverrides });
}

/**
 * 테스트용 카드 생성
 */
export function createMockCard(overrides: Partial<GameCard> = {}): GameCard {
  return {
    id: 'test_card',
    name: '테스트 카드',
    cost: 1,
    type: 'attack',
    damage: 10,
    description: '테스트',
    ...overrides,
  } as GameCard;
}

/**
 * 테스트용 전투 결과 생성
 */
export function createMockBattleResult(overrides: Partial<BattleResult> = {}): BattleResult {
  return {
    winner: 'player',
    turns: 5,
    playerHpRemaining: 50,
    enemyHpRemaining: 0,
    damageDealt: 100,
    damageTaken: 30,
    cardsPlayed: 15,
    events: [],
    ...overrides,
  } as BattleResult;
}

/**
 * 테스트용 전투 이벤트 생성
 */
export function createMockBattleEvent(overrides: Partial<BattleEvent> = {}): BattleEvent {
  return {
    type: 'damage',
    source: 'player',
    target: 'enemy',
    value: 10,
    turn: 1,
    ...overrides,
  } as BattleEvent;
}

/**
 * 토큰 상태 빌더
 */
export function buildTokens(tokens: Record<string, number>): TokenState {
  return tokens as TokenState;
}

// ==================== 추가 팩토리 함수 ====================

/** 기본 Resources */
const DEFAULT_RESOURCES: Resources = {
  gold: 100,
  intel: 0,
  loot: 0,
  material: 0,
  etherPts: 0,
  memory: 0,
};

/**
 * 테스트용 GameState (전체 게임 상태) 생성
 */
export function createMockGameState(overrides: Partial<MockGameState> = {}): MockGameState {
  return {
    resources: { ...DEFAULT_RESOURCES, ...overrides.resources },
    playerHp: 100,
    maxHp: 100,
    characterBuild: { ownedCards: [] },
    activeBattle: null,
    activeEvent: null,
    ...overrides,
  };
}

/**
 * 테스트용 GrowthState 생성
 */
export function createMockGrowthState(overrides: Partial<MockGrowthState> = {}): MockGrowthState {
  return {
    pyramidLevel: 0,
    skillPoints: 0,
    traitCounts: {},
    unlockedEthos: [],
    unlockedPathos: [],
    unlockedNodes: [],
    ...overrides,
  };
}

/**
 * 테스트용 EventRewards 생성
 */
export function createMockEventRewards(overrides: Partial<MockEventRewards> = {}): MockEventRewards {
  return {
    gold: 0,
    intel: 0,
    card: null,
    relic: null,
    ...overrides,
  };
}

/**
 * 테스트용 EnemyUnit 배열 생성
 */
export function createMockEnemyUnits(
  units: Array<Partial<MockEnemyUnit>> = []
): MockEnemyUnit[] {
  return units.map((u, i) => ({
    id: u.id ?? `enemy_${i}`,
    hp: u.hp ?? 50,
    maxHp: u.maxHp ?? 50,
    block: u.block ?? 0,
    tokens: u.tokens,
  }));
}

/**
 * 테스트용 FinishTurnParams 생성
 */
export function createMockFinishTurnParams(overrides: Partial<MockFinishTurnParams> = {}): MockFinishTurnParams {
  return {
    state: createMockBattleState(),
    cardsToDiscard: [],
    drawCount: 5,
    ...overrides,
  };
}

/**
 * 테스트용 ExecuteCardParams 생성
 */
export function createMockExecuteCardParams(overrides: Partial<MockExecuteCardParams> = {}): MockExecuteCardParams {
  return {
    state: createMockBattleState(),
    card: createMockCard(),
    actor: 'player',
    target: 'enemy',
    ...overrides,
  };
}

/**
 * 테스트용 BattleActions 생성
 */
export function createMockBattleActions(overrides: Partial<MockBattleActions> = {}): MockBattleActions {
  return {
    dealDamage: () => {},
    applyBlock: () => {},
    healEntity: () => {},
    addToken: () => {},
    removeToken: () => {},
    ...overrides,
  };
}

/**
 * 테스트용 FullBattleState 생성
 */
export function createMockFullBattleState(overrides: DeepPartial<GameBattleState> = {}): GameBattleState {
  return createMockBattleState({
    turn: 1,
    phase: 'play',
    timeline: [],
    ...overrides,
  });
}

// ==================== 전투 엔티티 팩토리 ====================

/**
 * 테스트용 Player 타입
 */
export interface MockPlayer {
  hp: number;
  maxHp: number;
  block: number;
  def?: boolean;
  counter?: number;
  vulnMult?: number;
  strength?: number;
  energy?: number;
  maxEnergy?: number;
  tokens: TokenState;
  etherPts?: number;
  etherOverflow?: number;
  etherMultiplier?: number;
}

/**
 * 테스트용 Enemy 타입
 */
export interface MockEnemy {
  hp: number;
  maxHp: number;
  block: number;
  def?: boolean;
  counter?: number;
  vulnMult?: number;
  tokens: TokenState;
  energy?: number;
  maxEnergy?: number;
  etherPts?: number;
  intent?: unknown;
  grace?: unknown;
}

/**
 * 테스트용 OrderItem 타입
 */
export interface MockOrderItem {
  actor: 'player' | 'enemy';
  card: Partial<GameCard>;
  sp: number;
  originalIndex?: number;
  index?: number;
  time?: number;
}

/**
 * 테스트용 Relic 타입
 */
export interface MockRelic {
  id: string;
  name: string;
  description?: string;
  rarity?: string;
  effect?: unknown;
}

/**
 * 테스트용 Player 생성
 */
export function createMockPlayer(overrides: Partial<MockPlayer> = {}): MockPlayer {
  return {
    hp: 100,
    maxHp: 100,
    block: 0,
    def: false,
    counter: 0,
    vulnMult: 1,
    strength: 0,
    energy: 6,
    maxEnergy: 6,
    tokens: {},
    ...overrides,
  };
}

/**
 * 테스트용 Enemy 생성
 */
export function createMockEnemy(overrides: Partial<MockEnemy> = {}): MockEnemy {
  return {
    hp: 50,
    maxHp: 50,
    block: 0,
    def: false,
    counter: 0,
    vulnMult: 1,
    tokens: {},
    energy: 3,
    maxEnergy: 3,
    ...overrides,
  };
}

/**
 * 테스트용 OrderItem 생성
 */
export function createMockOrderItem(overrides: Partial<MockOrderItem> = {}): MockOrderItem {
  return {
    actor: 'player',
    card: { id: 'test-card', name: '테스트 카드', type: 'attack' },
    sp: 5,
    originalIndex: 0,
    ...overrides,
  };
}

/**
 * 테스트용 Relic 생성
 */
export function createMockRelic(overrides: Partial<MockRelic> = {}): MockRelic {
  return {
    id: 'test-relic',
    name: '테스트 상징',
    description: '테스트용 상징입니다.',
    rarity: 'common',
    ...overrides,
  };
}

// ==================== 유틸리티 함수 ====================

/**
 * 깊은 병합 (Deep Merge)
 * 중첩된 객체를 재귀적으로 병합
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: DeepPartial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (sourceValue === undefined) {
      continue;
    }

    if (
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as DeepPartial<Record<string, unknown>>
      ) as T[keyof T];
    } else {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}
