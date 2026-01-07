/**
 * @file mock-factories.ts
 * @description 테스트용 Mock 객체 팩토리 함수
 *
 * 테스트에서 `as unknown as Type` 패턴을 제거하기 위한 타입 안전한 팩토리 함수 제공
 */

import type { GameBattleState, GameCard, TokenState } from '../simulator/core/game-types';
import type { BattleResult, BattleEvent } from '../simulator/core/game-types';

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
