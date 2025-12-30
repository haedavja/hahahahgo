/**
 * @file battleReducerActions.ts
 * @description 전투 리듀서 액션 타입 정의
 *
 * ## 액션 카테고리
 * - 플레이어/적 상태
 * - 페이즈 관리
 * - 카드 관리
 * - 에테르/토큰
 */

import type {
  Card,
  Relic,
  TokenInstance as Token,
  TokenState,
  ReducerPlayerState,
  ReducerEnemyState,
  ReducerEnemyUnitState as EnemyUnitState,
  ReducerNextTurnEffects as NextTurnEffects,
  PreviewDamage,
  InsightBadge,
  EnemyPlan,
  RespondSnapshot,
  PostCombatOptions,
  BattleEvent,
  DeflationInfo,
  OrderItem
} from '../../../types';

// Re-export reducer state types
export type PlayerState = ReducerPlayerState;
export type EnemyState = ReducerEnemyState;

/** 액션 타입 상수 */
export const ACTIONS = {
  // === 플레이어/적 상태 ===
  SET_PLAYER: 'SET_PLAYER',
  UPDATE_PLAYER: 'UPDATE_PLAYER',
  SET_ENEMY: 'SET_ENEMY',
  UPDATE_ENEMY: 'UPDATE_ENEMY',
  SET_ENEMY_INDEX: 'SET_ENEMY_INDEX',
  SET_SELECTED_TARGET_UNIT: 'SET_SELECTED_TARGET_UNIT',
  UPDATE_ENEMY_UNIT: 'UPDATE_ENEMY_UNIT',
  SET_ENEMY_UNITS: 'SET_ENEMY_UNITS',

  // === 페이즈 ===
  SET_PHASE: 'SET_PHASE',

  // === 카드 관리 ===
  SET_HAND: 'SET_HAND',
  SET_SELECTED: 'SET_SELECTED',
  ADD_SELECTED: 'ADD_SELECTED',
  REMOVE_SELECTED: 'REMOVE_SELECTED',
  SET_CAN_REDRAW: 'SET_CAN_REDRAW',
  SET_SORT_TYPE: 'SET_SORT_TYPE',
  SET_VANISHED_CARDS: 'SET_VANISHED_CARDS',
  ADD_VANISHED_CARD: 'ADD_VANISHED_CARD',
  SET_USED_CARD_INDICES: 'SET_USED_CARD_INDICES',
  SET_DISAPPEARING_CARDS: 'SET_DISAPPEARING_CARDS',
  SET_HIDDEN_CARDS: 'SET_HIDDEN_CARDS',
  SET_DISABLED_CARD_INDICES: 'SET_DISABLED_CARD_INDICES',
  SET_CARD_USAGE_COUNT: 'SET_CARD_USAGE_COUNT',
  INCREMENT_CARD_USAGE: 'INCREMENT_CARD_USAGE',

  // === 덱/무덤 시스템 ===
  SET_DECK: 'SET_DECK',
  SET_DISCARD_PILE: 'SET_DISCARD_PILE',
  ADD_TO_DISCARD: 'ADD_TO_DISCARD',
  DRAW_FROM_DECK: 'DRAW_FROM_DECK',
  SHUFFLE_DISCARD_INTO_DECK: 'SHUFFLE_DISCARD_INTO_DECK',

  // === 적 계획 ===
  SET_ENEMY_PLAN: 'SET_ENEMY_PLAN',

  // === 실행 큐 ===
  SET_FIXED_ORDER: 'SET_FIXED_ORDER',
  SET_QUEUE: 'SET_QUEUE',
  SET_Q_INDEX: 'SET_Q_INDEX',
  INCREMENT_Q_INDEX: 'INCREMENT_Q_INDEX',

  // === 로그 & 이벤트 ===
  ADD_LOG: 'ADD_LOG',
  SET_LOG: 'SET_LOG',
  SET_ACTION_EVENTS: 'SET_ACTION_EVENTS',

  // === 턴 ===
  SET_TURN_NUMBER: 'SET_TURN_NUMBER',
  INCREMENT_TURN: 'INCREMENT_TURN',

  // === 에테르 ===
  SET_TURN_ETHER_ACCUMULATED: 'SET_TURN_ETHER_ACCUMULATED',
  SET_ENEMY_TURN_ETHER_ACCUMULATED: 'SET_ENEMY_TURN_ETHER_ACCUMULATED',
  SET_NET_ETHER_DELTA: 'SET_NET_ETHER_DELTA',
  SET_ETHER_ANIMATION_PTS: 'SET_ETHER_ANIMATION_PTS',
  SET_ETHER_FINAL_VALUE: 'SET_ETHER_FINAL_VALUE',
  SET_ENEMY_ETHER_FINAL_VALUE: 'SET_ENEMY_ETHER_FINAL_VALUE',
  SET_ETHER_CALC_PHASE: 'SET_ETHER_CALC_PHASE',
  SET_ENEMY_ETHER_CALC_PHASE: 'SET_ENEMY_ETHER_CALC_PHASE',
  SET_CURRENT_DEFLATION: 'SET_CURRENT_DEFLATION',
  SET_ENEMY_CURRENT_DEFLATION: 'SET_ENEMY_CURRENT_DEFLATION',
  SET_ETHER_PULSE: 'SET_ETHER_PULSE',
  SET_PLAYER_TRANSFER_PULSE: 'SET_PLAYER_TRANSFER_PULSE',
  SET_ENEMY_TRANSFER_PULSE: 'SET_ENEMY_TRANSFER_PULSE',

  // === 기원 ===
  SET_WILL_OVERDRIVE: 'SET_WILL_OVERDRIVE',
  SET_PLAYER_OVERDRIVE_FLASH: 'SET_PLAYER_OVERDRIVE_FLASH',
  SET_ENEMY_OVERDRIVE_FLASH: 'SET_ENEMY_OVERDRIVE_FLASH',
  SET_SOUL_SHATTER: 'SET_SOUL_SHATTER',

  // === 타임라인 ===
  SET_TIMELINE_PROGRESS: 'SET_TIMELINE_PROGRESS',
  SET_TIMELINE_INDICATOR_VISIBLE: 'SET_TIMELINE_INDICATOR_VISIBLE',
  SET_EXECUTING_CARD_INDEX: 'SET_EXECUTING_CARD_INDEX',

  // === UI ===
  SET_IS_SIMPLIFIED: 'SET_IS_SIMPLIFIED',
  SET_SHOW_CHARACTER_SHEET: 'SET_SHOW_CHARACTER_SHEET',
  TOGGLE_CHARACTER_SHEET: 'TOGGLE_CHARACTER_SHEET',
  SET_SHOW_PTS_TOOLTIP: 'SET_SHOW_PTS_TOOLTIP',
  SET_SHOW_BAR_TOOLTIP: 'SET_SHOW_BAR_TOOLTIP',

  // === 상징 ===
  SET_ORDERED_RELICS: 'SET_ORDERED_RELICS',

  // === 전투 종료 ===
  SET_POST_COMBAT_OPTIONS: 'SET_POST_COMBAT_OPTIONS',

  // === 다음 턴 효과 ===
  SET_NEXT_TURN_EFFECTS: 'SET_NEXT_TURN_EFFECTS',
  UPDATE_NEXT_TURN_EFFECTS: 'UPDATE_NEXT_TURN_EFFECTS',

  // === 성찰 상태 ===
  SET_REFLECTION_STATE: 'SET_REFLECTION_STATE',

  // === 애니메이션 ===
  SET_PLAYER_HIT: 'SET_PLAYER_HIT',
  SET_ENEMY_HIT: 'SET_ENEMY_HIT',
  SET_PLAYER_BLOCK_ANIM: 'SET_PLAYER_BLOCK_ANIM',
  SET_ENEMY_BLOCK_ANIM: 'SET_ENEMY_BLOCK_ANIM',

  // === 자동진행 & 스냅샷 ===
  SET_AUTO_PROGRESS: 'SET_AUTO_PROGRESS',
  SET_RESOLVE_START_PLAYER: 'SET_RESOLVE_START_PLAYER',
  SET_RESOLVE_START_ENEMY: 'SET_RESOLVE_START_ENEMY',
  SET_RESPOND_SNAPSHOT: 'SET_RESPOND_SNAPSHOT',
  SET_REWIND_USED: 'SET_REWIND_USED',

  // === 상징 UI ===
  SET_HOVERED_RELIC: 'SET_HOVERED_RELIC',
  SET_RELIC_ACTIVATED: 'SET_RELIC_ACTIVATED',
  SET_ACTIVE_RELIC_SET: 'SET_ACTIVE_RELIC_SET',
  SET_MULTIPLIER_PULSE: 'SET_MULTIPLIER_PULSE',

  // === 전투 진행 ===
  SET_RESOLVED_PLAYER_CARDS: 'SET_RESOLVED_PLAYER_CARDS',

  // === 카드 툴팁 ===
  SET_HOVERED_CARD: 'SET_HOVERED_CARD',
  SET_TOOLTIP_VISIBLE: 'SET_TOOLTIP_VISIBLE',
  SET_PREVIEW_DAMAGE: 'SET_PREVIEW_DAMAGE',
  SET_PER_UNIT_PREVIEW_DAMAGE: 'SET_PER_UNIT_PREVIEW_DAMAGE',

  // === 통찰 시스템 ===
  SET_INSIGHT_BADGE: 'SET_INSIGHT_BADGE',
  SET_INSIGHT_ANIM_LEVEL: 'SET_INSIGHT_ANIM_LEVEL',
  SET_INSIGHT_ANIM_PULSE_KEY: 'SET_INSIGHT_ANIM_PULSE_KEY',
  SET_SHOW_INSIGHT_TOOLTIP: 'SET_SHOW_INSIGHT_TOOLTIP',

  // === 적 행동 툴팁 ===
  SET_HOVERED_ENEMY_ACTION: 'SET_HOVERED_ENEMY_ACTION',

  // === 카드 파괴 애니메이션 ===
  SET_DESTROYING_ENEMY_CARDS: 'SET_DESTROYING_ENEMY_CARDS',

  // === 카드 빙결 애니메이션 ===
  SET_FREEZING_ENEMY_CARDS: 'SET_FREEZING_ENEMY_CARDS',

  // === 빙결 순서 플래그 ===
  SET_FROZEN_ORDER: 'SET_FROZEN_ORDER',

  // === 피해 분배 시스템 ===
  SET_DISTRIBUTION_MODE: 'SET_DISTRIBUTION_MODE',
  SET_PENDING_DISTRIBUTION_CARD: 'SET_PENDING_DISTRIBUTION_CARD',
  SET_DAMAGE_DISTRIBUTION: 'SET_DAMAGE_DISTRIBUTION',
  UPDATE_DAMAGE_DISTRIBUTION: 'UPDATE_DAMAGE_DISTRIBUTION',
  SET_TOTAL_DISTRIBUTABLE_DAMAGE: 'SET_TOTAL_DISTRIBUTABLE_DAMAGE',
  RESET_DISTRIBUTION: 'RESET_DISTRIBUTION',

  // === 토큰 시스템 ===
  UPDATE_PLAYER_TOKENS: 'UPDATE_PLAYER_TOKENS',
  UPDATE_ENEMY_TOKENS: 'UPDATE_ENEMY_TOKENS',

  // === 복합 액션 ===
  RESET_TURN: 'RESET_TURN',
  RESET_ETHER_ANIMATION: 'RESET_ETHER_ANIMATION',
  RESET_BATTLE: 'RESET_BATTLE',
} as const;

/** 액션 타입 키 */
export type ActionType = keyof typeof ACTIONS;

/** 액션 값 타입 */
export type ActionValue = typeof ACTIONS[ActionType];

// ==================== 타입 안전 액션 정의 ====================

/** 전투 페이즈 */
export type BattlePhase =
  | 'select' | 'confirm' | 'resolve' | 'execution'
  | 'turnEnd' | 'etherCalc' | 'victory' | 'defeat' | 'respond';

/** 정렬 타입 */
export type SortType = 'speed' | 'cost' | 'order' | 'energy' | 'value' | 'type';

/** 에테르 계산 페이즈 */
export type EtherCalcPhase =
  | 'base' | 'combo' | 'multiplier' | 'deflation'
  | 'transfer' | 'final' | null;

// ==================== 액션 유니온 타입 ====================

/** 플레이어/적 상태 액션 */
type PlayerEnemyAction =
  | { type: typeof ACTIONS.SET_PLAYER; payload: PlayerState }
  | { type: typeof ACTIONS.UPDATE_PLAYER; payload: Partial<PlayerState> }
  | { type: typeof ACTIONS.SET_ENEMY; payload: EnemyState }
  | { type: typeof ACTIONS.UPDATE_ENEMY; payload: Partial<EnemyState> }
  | { type: typeof ACTIONS.SET_ENEMY_INDEX; payload: number }
  | { type: typeof ACTIONS.SET_SELECTED_TARGET_UNIT; payload: number }
  | { type: typeof ACTIONS.SET_ENEMY_UNITS; payload: EnemyUnitState[] }
  | { type: typeof ACTIONS.UPDATE_ENEMY_UNIT; payload: { unitId: number; updates: Partial<EnemyUnitState> } };

/** 페이즈 액션 */
type PhaseAction =
  | { type: typeof ACTIONS.SET_PHASE; payload: BattlePhase };

/** 카드 관리 액션 */
type CardAction =
  | { type: typeof ACTIONS.SET_HAND; payload: Card[] }
  | { type: typeof ACTIONS.SET_SELECTED; payload: Card[] }
  | { type: typeof ACTIONS.ADD_SELECTED; payload: Card }
  | { type: typeof ACTIONS.REMOVE_SELECTED; payload: number }
  | { type: typeof ACTIONS.SET_CAN_REDRAW; payload: boolean }
  | { type: typeof ACTIONS.SET_SORT_TYPE; payload: SortType }
  | { type: typeof ACTIONS.SET_VANISHED_CARDS; payload: Card[] }
  | { type: typeof ACTIONS.ADD_VANISHED_CARD; payload: Card }
  | { type: typeof ACTIONS.SET_USED_CARD_INDICES; payload: number[] }
  | { type: typeof ACTIONS.SET_DISAPPEARING_CARDS; payload: number[] }
  | { type: typeof ACTIONS.SET_HIDDEN_CARDS; payload: number[] }
  | { type: typeof ACTIONS.SET_DISABLED_CARD_INDICES; payload: number[] }
  | { type: typeof ACTIONS.SET_CARD_USAGE_COUNT; payload: Record<string, number> }
  | { type: typeof ACTIONS.INCREMENT_CARD_USAGE; payload: string };

/** 덱/무덤 액션 */
type DeckAction =
  | { type: typeof ACTIONS.SET_DECK; payload: Card[] }
  | { type: typeof ACTIONS.SET_DISCARD_PILE; payload: Card[] }
  | { type: typeof ACTIONS.ADD_TO_DISCARD; payload: Card }
  | { type: typeof ACTIONS.DRAW_FROM_DECK; payload: number }
  | { type: typeof ACTIONS.SHUFFLE_DISCARD_INTO_DECK };

/** 적 계획/큐 액션 */
type QueueAction =
  | { type: typeof ACTIONS.SET_ENEMY_PLAN; payload: EnemyPlan }
  | { type: typeof ACTIONS.SET_FIXED_ORDER; payload: OrderItem[] | null }
  | { type: typeof ACTIONS.SET_QUEUE; payload: OrderItem[] }
  | { type: typeof ACTIONS.SET_Q_INDEX; payload: number }
  | { type: typeof ACTIONS.INCREMENT_Q_INDEX };

/** 로그/이벤트 액션 */
type LogAction =
  | { type: typeof ACTIONS.ADD_LOG; payload: string }
  | { type: typeof ACTIONS.SET_LOG; payload: string[] }
  | { type: typeof ACTIONS.SET_ACTION_EVENTS; payload: Record<string, BattleEvent[]> };

/** 턴 액션 */
type TurnAction =
  | { type: typeof ACTIONS.SET_TURN_NUMBER; payload: number }
  | { type: typeof ACTIONS.INCREMENT_TURN };

/** 에테르 액션 */
type EtherAction =
  | { type: typeof ACTIONS.SET_TURN_ETHER_ACCUMULATED; payload: number }
  | { type: typeof ACTIONS.SET_ENEMY_TURN_ETHER_ACCUMULATED; payload: number }
  | { type: typeof ACTIONS.SET_NET_ETHER_DELTA; payload: number | null }
  | { type: typeof ACTIONS.SET_ETHER_ANIMATION_PTS; payload: number | null }
  | { type: typeof ACTIONS.SET_ETHER_FINAL_VALUE; payload: number | null }
  | { type: typeof ACTIONS.SET_ENEMY_ETHER_FINAL_VALUE; payload: number | null }
  | { type: typeof ACTIONS.SET_ETHER_CALC_PHASE; payload: EtherCalcPhase }
  | { type: typeof ACTIONS.SET_ENEMY_ETHER_CALC_PHASE; payload: EtherCalcPhase }
  | { type: typeof ACTIONS.SET_CURRENT_DEFLATION; payload: DeflationInfo | null }
  | { type: typeof ACTIONS.SET_ENEMY_CURRENT_DEFLATION; payload: DeflationInfo | null }
  | { type: typeof ACTIONS.SET_ETHER_PULSE; payload: boolean }
  | { type: typeof ACTIONS.SET_PLAYER_TRANSFER_PULSE; payload: boolean }
  | { type: typeof ACTIONS.SET_ENEMY_TRANSFER_PULSE; payload: boolean };

/** 기원 액션 */
type OverdriveAction =
  | { type: typeof ACTIONS.SET_WILL_OVERDRIVE; payload: boolean }
  | { type: typeof ACTIONS.SET_PLAYER_OVERDRIVE_FLASH; payload: boolean }
  | { type: typeof ACTIONS.SET_ENEMY_OVERDRIVE_FLASH; payload: boolean }
  | { type: typeof ACTIONS.SET_SOUL_SHATTER; payload: boolean };

/** 타임라인 액션 */
type TimelineAction =
  | { type: typeof ACTIONS.SET_TIMELINE_PROGRESS; payload: number }
  | { type: typeof ACTIONS.SET_TIMELINE_INDICATOR_VISIBLE; payload: boolean }
  | { type: typeof ACTIONS.SET_EXECUTING_CARD_INDEX; payload: number | null };

/** UI 액션 */
type UIAction =
  | { type: typeof ACTIONS.SET_IS_SIMPLIFIED; payload: boolean }
  | { type: typeof ACTIONS.SET_SHOW_CHARACTER_SHEET; payload: boolean }
  | { type: typeof ACTIONS.TOGGLE_CHARACTER_SHEET }
  | { type: typeof ACTIONS.SET_SHOW_PTS_TOOLTIP; payload: boolean }
  | { type: typeof ACTIONS.SET_SHOW_BAR_TOOLTIP; payload: boolean }
  | { type: typeof ACTIONS.SET_HOVERED_CARD; payload: Card | null }
  | { type: typeof ACTIONS.SET_TOOLTIP_VISIBLE; payload: boolean }
  | { type: typeof ACTIONS.SET_PREVIEW_DAMAGE; payload: PreviewDamage }
  | { type: typeof ACTIONS.SET_PER_UNIT_PREVIEW_DAMAGE; payload: Record<number, PreviewDamage> }
  | { type: typeof ACTIONS.SET_INSIGHT_BADGE; payload: InsightBadge }
  | { type: typeof ACTIONS.SET_INSIGHT_ANIM_LEVEL; payload: number }
  | { type: typeof ACTIONS.SET_INSIGHT_ANIM_PULSE_KEY; payload: number }
  | { type: typeof ACTIONS.SET_SHOW_INSIGHT_TOOLTIP; payload: boolean }
  | { type: typeof ACTIONS.SET_HOVERED_ENEMY_ACTION; payload: Card | null };

/** 상징 액션 */
type RelicAction =
  | { type: typeof ACTIONS.SET_ORDERED_RELICS; payload: Relic[] }
  | { type: typeof ACTIONS.SET_HOVERED_RELIC; payload: string | null }
  | { type: typeof ACTIONS.SET_RELIC_ACTIVATED; payload: string | null }
  | { type: typeof ACTIONS.SET_ACTIVE_RELIC_SET; payload: Set<string> }
  | { type: typeof ACTIONS.SET_MULTIPLIER_PULSE; payload: boolean };

/** 애니메이션 액션 */
type AnimationAction =
  | { type: typeof ACTIONS.SET_PLAYER_HIT; payload: boolean }
  | { type: typeof ACTIONS.SET_ENEMY_HIT; payload: boolean }
  | { type: typeof ACTIONS.SET_PLAYER_BLOCK_ANIM; payload: boolean }
  | { type: typeof ACTIONS.SET_ENEMY_BLOCK_ANIM; payload: boolean }
  | { type: typeof ACTIONS.SET_DESTROYING_ENEMY_CARDS; payload: number[] }
  | { type: typeof ACTIONS.SET_FREEZING_ENEMY_CARDS; payload: number[] }
  | { type: typeof ACTIONS.SET_FROZEN_ORDER; payload: number };

/** 자동진행/스냅샷 액션 */
type ProgressAction =
  | { type: typeof ACTIONS.SET_AUTO_PROGRESS; payload: boolean }
  | { type: typeof ACTIONS.SET_RESOLVE_START_PLAYER; payload: PlayerState | null }
  | { type: typeof ACTIONS.SET_RESOLVE_START_ENEMY; payload: EnemyState | null }
  | { type: typeof ACTIONS.SET_RESPOND_SNAPSHOT; payload: RespondSnapshot | null }
  | { type: typeof ACTIONS.SET_REWIND_USED; payload: boolean }
  | { type: typeof ACTIONS.SET_RESOLVED_PLAYER_CARDS; payload: number };

/** 기타 액션 */
type MiscAction =
  | { type: typeof ACTIONS.SET_POST_COMBAT_OPTIONS; payload: PostCombatOptions | null }
  | { type: typeof ACTIONS.SET_NEXT_TURN_EFFECTS; payload: NextTurnEffects }
  | { type: typeof ACTIONS.UPDATE_NEXT_TURN_EFFECTS; payload: Partial<NextTurnEffects> }
  | { type: typeof ACTIONS.SET_REFLECTION_STATE; payload: unknown };

/** 피해 분배 액션 */
type DistributionAction =
  | { type: typeof ACTIONS.SET_DISTRIBUTION_MODE; payload: boolean }
  | { type: typeof ACTIONS.SET_PENDING_DISTRIBUTION_CARD; payload: Card | null }
  | { type: typeof ACTIONS.SET_DAMAGE_DISTRIBUTION; payload: Record<number, number> }
  | { type: typeof ACTIONS.UPDATE_DAMAGE_DISTRIBUTION; payload: { unitId: number; damage: number } }
  | { type: typeof ACTIONS.SET_TOTAL_DISTRIBUTABLE_DAMAGE; payload: number }
  | { type: typeof ACTIONS.RESET_DISTRIBUTION };

/** 토큰 액션 */
type TokenAction =
  | { type: typeof ACTIONS.UPDATE_PLAYER_TOKENS; payload: TokenState }
  | { type: typeof ACTIONS.UPDATE_ENEMY_TOKENS; payload: TokenState };

/** 복합 액션 */
type ComplexAction =
  | { type: typeof ACTIONS.RESET_TURN }
  | { type: typeof ACTIONS.RESET_ETHER_ANIMATION }
  | { type: typeof ACTIONS.RESET_BATTLE };

/** 모든 배틀 액션 유니온 타입 */
export type BattleAction =
  | PlayerEnemyAction
  | PhaseAction
  | CardAction
  | DeckAction
  | QueueAction
  | LogAction
  | TurnAction
  | EtherAction
  | OverdriveAction
  | TimelineAction
  | UIAction
  | RelicAction
  | AnimationAction
  | ProgressAction
  | MiscAction
  | DistributionAction
  | TokenAction
  | ComplexAction;
