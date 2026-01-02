/**
 * @file hooks.ts
 * @description 전투 훅 파라미터 타입 정의
 *
 * 기존 any 타입을 대체하기 위한 유연한 타입 정의.
 * 완벽한 타입 안전성보다 점진적 개선에 초점.
 */

import type { MutableRefObject } from 'react';
import type { Card, TokenState, TokenEntity } from './core';
import type { HandCard } from './systems';
import type { NextTurnEffects, InsightBadge } from './combat';
import type { DeflationInfo } from './ui';

// Re-export to maintain backwards compatibility
export type { NextTurnEffects, InsightBadge, DeflationInfo };

// ========== 배틀 엔티티 타입 ==========

/**
 * 전투 엔티티 상태 (플레이어/적 공통)
 * TokenEntity를 확장하여 전투에 필요한 추가 필드 포함
 */
export interface BattleEntityState extends TokenEntity {
  hp: number;
  maxHp: number;
  block?: number;
  tokens?: TokenState;
  // 선택적 전투 필드
  strength?: number;
  agility?: number;
  insight?: number;
  energy?: number;
  maxEnergy?: number;
  etherPts?: number;
  counter?: number;
  maxSpeed?: number;
  vulnMult?: number;
  vulnTurns?: number;
  etherOverflow?: number;
  etherOverdriveActive?: boolean;
  def?: boolean;
  comboUsageCount?: Record<string, number>;
  etherMultiplier?: number;
  etherBan?: boolean;
  // 페널티 (플레이어)
  energyPenalty?: number;
  speedPenalty?: number;
  drawPenalty?: number;
  insightPenalty?: number;
  // 적 전용 필드
  units?: Array<BattleUnitState>;
  shroud?: number;
  name?: string;
  emoji?: string;
  tier?: number;
  isBoss?: boolean;
  // 확장 허용
  [key: string]: unknown;
}

/** 전투 유닛 상태 (다중 유닛 적용) */
export interface BattleUnitState {
  unitId?: number;
  id?: string;
  hp: number;
  maxHp: number;
  block?: number;
  tokens?: TokenState;
  name?: string;
  emoji?: string;
  isDead?: boolean;
  [key: string]: unknown;
}

// ========== 공통 타입 ==========

/** 로그 추가 함수 */
export type AddLogFn = (message: string) => void;

/** 사운드 재생 함수 */
export type PlaySoundFn = (frequency: number, duration: number) => void;

/** 배틀 Ref (유연한 타입) */
export interface BattleRefValue {
  player?: BattleEntityState | null;
  enemy?: BattleEntityState | null;
  queue?: Array<{ actor: 'player' | 'enemy'; card: Card; [key: string]: unknown }>;
  qIndex?: number;
  nextTurnEffects?: NextTurnEffects;
  frozenOrder?: number;
  pathosTurnEffects?: Record<string, unknown>;
  pathosNextCardEffects?: Record<string, unknown>;
  [key: string]: unknown;
}

// NextTurnEffects는 combat.ts에서 import됨

/** 전투 상태 Ref */
export type BattleRefType = MutableRefObject<BattleRefValue | null>;

/** stepOnce 함수 Ref */
export type StepOnceRefType = MutableRefObject<(() => void) | null>;

/** 탈주 차단 Ref */
export type EscapeBanRefType = MutableRefObject<Set<unknown>>;

// ========== 액션 타입 (유연) ==========

/** 공통 배틀 액션 - index signature로 유연성 확보 */
export interface CommonBattleActions {
  setQueue: (queue: unknown[]) => void;
  setQIndex: (index: number) => void;
  setSelected: (cards: unknown[]) => void;
  setPhase: (phase: string) => void;
  setNextTurnEffects: (effects: unknown) => void;
  setPostCombatOptions: (options: unknown) => void;
  [key: string]: unknown;
}

/** 손패 관리 액션 */
export interface HandManagementActions {
  setHand: (hand: unknown[]) => void;
  setDeck: (deck: unknown[]) => void;
  setDiscardPile: (pile: unknown[]) => void;
  setCanRedraw: (canRedraw: boolean) => void;
  setSortType: (type: unknown) => void;
  setSelected: (cards: unknown[]) => void;
  [key: string]: unknown;
}

// ========== 훅 파라미터 타입 ==========

/** useBreachSelection 파라미터 */
export interface UseBreachSelectionParams {
  CARDS: Card[];
  battleRef: BattleRefType;
  stepOnceRef: StepOnceRefType;
  addLog: AddLogFn;
  actions: CommonBattleActions;
}


/** useHandManagement 파라미터 */
export interface UseHandManagementParams {
  canRedraw: boolean;
  battleHand: HandCard[];
  battleDeck: HandCard[];
  battleDiscardPile: HandCard[];
  sortType: string;
  hand: HandCard[];
  escapeBanRef: EscapeBanRefType;
  addLog: AddLogFn;
  playSound: PlaySoundFn;
  actions: HandManagementActions;
}

/** useCardTooltip 파라미터 */
export interface UseCardTooltipParams {
  hoveredCard: unknown;
  battlePhase: string;
  actions: {
    setHoveredCard: (card: unknown) => void;
    setTooltipVisible: (visible: boolean) => void;
    [key: string]: unknown;
  };
}

/** useComboSystem 파라미터 */
export interface UseComboSystemParams {
  battleSelected: Card[];
  battlePhase: string;
  playerComboUsageCount: Record<string, number>;
  resolvedPlayerCards: number;
  battleQIndex: number;
  battleQueueLength: number;
  computeComboMultiplier: (baseMultiplier: number, cardsCount: number, allowSymbols: boolean, allowRefBook: boolean) => number;
  explainComboMultiplier: (baseMultiplier: number, cardsCount: number, allowSymbols: boolean, allowRefBook: boolean, orderedRelicList: string[]) => { steps: string[] };
  orderedRelicList: string[];
  selected: Card[];
  actions: {
    setCurrentDeflation: (deflation: { multiplier: number; usageCount: number } | null) => void;
    setMultiplierPulse: (pulse: boolean) => void;
    [key: string]: unknown;
  };
}

/** useDamagePreview 파라미터 */
export interface UseDamagePreviewParams {
  battlePhase: string;
  player: BattleEntityState | null;
  enemy: BattleEntityState | null;
  fixedOrder: unknown[] | null;
  playerTimeline: unknown[];
  willOverdrive: boolean;
  enemyPlan: { mode: string | null; actions: Card[] };
  targetUnit: BattleUnitState | null;
  hasMultipleUnits: boolean;
  enemyUnits: BattleUnitState[];
  selectedTargetUnit: number;
  actions: {
    setPreviewDamage: (damage: { value: number; lethal: boolean; overkill: boolean }) => void;
    setPerUnitPreviewDamage: (preview: Record<number, unknown>) => void;
    [key: string]: unknown;
  };
  playSound: PlaySoundFn;
}

/** useEtherPreview 파라미터 */
export interface UseEtherPreviewParams {
  playerTimeline: unknown[];
  selected: Card[];
  orderedRelicList: string[];
  playerComboUsageCount: Record<string, number>;
}


/** useInsightSystem 파라미터 */
export interface UseInsightSystemParams {
  playerInsight: number;
  playerInsightPenalty: number;
  enemyShroud: number;
  enemyUnits: BattleUnitState[];
  enemyPlanActions: Card[];
  battlePhase: string;
  devDulledLevel: number | null;
  actions: {
    setInsightBadge: (badge: InsightBadge) => void;
    setInsightAnimLevel: (level: number) => void;
    setInsightAnimPulseKey: (fn: (k: number) => number) => void;
    setHoveredEnemyAction: (action: Card | null) => void;
    [key: string]: unknown;
  };
}

// InsightBadge는 combat.ts에서 import됨

/** useMultiTargetSelection 파라미터 */
export interface UseMultiTargetSelectionParams {
  battlePendingDistributionCard: Card | null;
  battleDamageDistribution: Record<string, boolean>;
  enemyUnits: Array<{ hp: number; unitId: number; name?: string; [key: string]: unknown }>;
  addLog: AddLogFn;
  actions: {
    addSelected: (card: Card) => void;
    resetDistribution: () => void;
    setPendingDistributionCard: (card: Card | null) => void;
    setDamageDistribution: (dist: Record<string, boolean>) => void;
    setDistributionMode: (mode: boolean) => void;
    [key: string]: unknown;
  };
}

/** useRelicDrag 파라미터 */
export interface UseRelicDragParams {
  orderedRelicList: string[];
  actions: {
    setRelicActivated: (relicId: string | null) => void;
    setOrderedRelics: (relics: string[]) => void;
    [key: string]: unknown;
  };
}

/** useBattleTimelines 파라미터 */
export interface UseBattleTimelinesParams {
  battlePhase: string;
  battleSelected: Card[];
  fixedOrder: Array<{ actor: 'player' | 'enemy'; [key: string]: unknown }> | null;
  battleQueue: Array<{ actor: 'player' | 'enemy'; [key: string]: unknown }>;
  playerComboUsageCount: Record<string, number>;
  effectiveAgility: number;
  enemyPlanActions: Card[];
  insightReveal: { visible: boolean; level: number } | null;
  selected: Card[];
}

// DeflationInfo는 ui.ts에서 import됨

/** useEtherAnimation 파라미터 */
export interface UseEtherAnimationParams {
  selected: Card[];
  battleSelected: Card[];
  finalComboMultiplier: number | null;
  displayEtherMultiplierRef: MutableRefObject<number>;
  player: BattleEntityState | null;
  enemy: BattleEntityState | null;
  enemyPlan: { actions: Card[] };
  enemyTurnEtherAccumulated: number;
  battleRef: BattleRefType;
  playSound: PlaySoundFn;
  actions: {
    setCurrentDeflation: (deflation: DeflationInfo | null) => void;
    setEnemyCurrentDeflation: (deflation: DeflationInfo | null) => void;
    setEtherCalcPhase: (phase: string) => void;
    setEnemyEtherCalcPhase: (phase: string) => void;
    setEtherFinalValue: (value: number) => void;
    setEnemyEtherFinalValue: (value: number) => void;
    setPlayer: (player: Partial<BattleEntityState> & { [key: string]: unknown }) => void;
    [key: string]: unknown;
  };
}

/** useRewardSelection 파라미터 */
export interface UseRewardSelectionParams {
  CARDS: Card[];
  battleRef: BattleRefType;
  battleNextTurnEffects: unknown;
  addLog: AddLogFn;
  actions: {
    setPostCombatOptions: (options: unknown) => void;
    setPhase: (phase: string) => void;
    setNextTurnEffects: (effects: unknown) => void;
    [key: string]: unknown;
  };
}
