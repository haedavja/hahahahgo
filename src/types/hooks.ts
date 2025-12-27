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

/** useRewardSelection 파라미터 */
export interface UseRewardSelectionParams {
  CARDS: Card[];
  battleRef: BattleRefType;
  battleNextTurnEffects: unknown;
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
  computeComboMultiplier: (combo: unknown, usage: unknown, relics: unknown) => number;
  explainComboMultiplier: (combo: unknown, usage: unknown, relics: unknown) => string;
  orderedRelicList: string[];
  selected: Card[];
  actions: {
    setComboExplanation: (explanation: string) => void;
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
  enemyPlan: unknown;
  targetUnit: unknown;
  hasMultipleUnits: boolean;
  enemyUnits: unknown[];
  selectedTargetUnit: unknown;
  actions: {
    setDamageDistribution: (dist: unknown) => void;
    [key: string]: unknown;
  };
  playSound: PlaySoundFn;
}

/** useEtherPreview 파라미터 */
export interface UseEtherPreviewParams {
  battleSelected: Card[];
  player: { etherPts?: number; [key: string]: unknown };
  enemy: { ether?: number; [key: string]: unknown };
  comboRank: string | null;
  comboMultiplier: number;
}

/** useEtherAnimation 파라미터 */
export interface UseEtherAnimationParams {
  player: unknown;
  battleRef: BattleRefType;
  actions: {
    setPlayer: (player: unknown) => void;
    [key: string]: unknown;
  };
}

/** useEtherSystem 파라미터 */
export interface UseEtherSystemParams {
  battlePhase: string;
  playerEtherPts: number;
  enemyEther: number;
  totalSpeed: number;
  battleSelected: Card[];
  comboRank: string | null;
  comboMultiplier: number;
}

/** useInsightSystem 파라미터 */
export interface UseInsightSystemParams {
  battlePhase: string;
  battleTurnNumber: number;
  insightGaugeRef: MutableRefObject<number>;
  playSound: PlaySoundFn;
  addLog: AddLogFn;
}

/** useMultiTargetSelection 파라미터 */
export interface UseMultiTargetSelectionParams {
  enemyUnits: Array<{ hp: number; unitId: string; [key: string]: unknown }>;
  battleSelected: Card[];
  addLog: AddLogFn;
  playSound: PlaySoundFn;
  actions: CommonBattleActions;
}

/** useRelicDrag 파라미터 */
export interface UseRelicDragParams {
  orderedRelics: string[];
  setOrderedRelics: (relics: string[]) => void;
}

/** useBattleTimelines 파라미터 */
export interface UseBattleTimelinesParams {
  battlePhase: string;
  battleQueue: unknown[];
  battleQIndex: number;
  battleFixedOrder: unknown[] | null;
  player: { maxSpeed?: number; [key: string]: unknown };
  effectiveAgility: number;
}
