/**
 * @file hooks.ts
 * @description 전투 훅 파라미터 타입 정의
 *
 * 기존 any 타입을 대체하기 위한 유연한 타입 정의.
 * 완벽한 타입 안전성보다 점진적 개선에 초점.
 */

import type { MutableRefObject } from 'react';
import type { Card } from './core';
import type { HandCard } from './systems';

// ========== 공통 타입 ==========

/** 로그 추가 함수 */
export type AddLogFn = (message: string) => void;

/** 사운드 재생 함수 */
export type PlaySoundFn = (frequency: number, duration: number) => void;

/** 배틀 Ref (유연한 타입) */
export interface BattleRefValue {
  player?: unknown;
  enemy?: unknown;
  queue?: unknown[];
  qIndex?: number;
  nextTurnEffects?: unknown;
  frozenOrder?: number;
  [key: string]: unknown;
}

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
  player: unknown;
  enemy: unknown;
  fixedOrder: unknown[] | null;
  playerTimeline: unknown[];
  willOverdrive: boolean;
  enemyPlan: { mode: string | null; actions: unknown[] };
  targetUnit: unknown;
  hasMultipleUnits: boolean;
  enemyUnits: Array<{ hp: number; maxHp: number; block?: number; unitId: number; [key: string]: unknown }>;
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
  enemyUnits: unknown[];
  enemyPlanActions: Card[];
  battlePhase: string;
  devDulledLevel: number | null;
  actions: {
    setInsightBadge: (badge: unknown) => void;
    setInsightAnimLevel: (level: number) => void;
    setInsightAnimPulseKey: (fn: (k: number) => number) => void;
    setHoveredEnemyAction: (action: unknown) => void;
    [key: string]: unknown;
  };
}

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

/** useEtherAnimation 파라미터 */
export interface UseEtherAnimationParams {
  selected: Card[];
  battleSelected: Card[];
  finalComboMultiplier: number | null;
  displayEtherMultiplierRef: MutableRefObject<number>;
  player: unknown;
  enemy: unknown;
  enemyPlan: { actions: Card[] };
  enemyTurnEtherAccumulated: number;
  battleRef: BattleRefType;
  playSound: PlaySoundFn;
  actions: {
    setCurrentDeflation: (deflation: unknown) => void;
    setEnemyCurrentDeflation: (deflation: unknown) => void;
    setEtherCalcPhase: (phase: string) => void;
    setEnemyEtherCalcPhase: (phase: string) => void;
    setEtherFinalValue: (value: number) => void;
    setEnemyEtherFinalValue: (value: number) => void;
    setPlayer: (player: unknown) => void;
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
