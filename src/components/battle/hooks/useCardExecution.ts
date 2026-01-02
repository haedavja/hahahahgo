/**
 * @file useCardExecution.ts
 * @description 카드 실행 로직을 담당하는 훅
 *
 * BattleApp.tsx의 executeCardAction 함수를 모듈화
 * 핵심 실행 로직만 포함하고, 세부 처리는 유틸리티로 분리
 */

import { useCallback, type MutableRefObject } from 'react';
import { playHitSound, playBlockSound, playParrySound, playSound } from '../../../lib/soundUtils';
import { addToken } from '../../../lib/tokenUtils';
import { hasTrait, markCrossedCards, hasEnemyUnits } from '../utils/battleUtils';
import { buildBattleContext } from '../utils/cardExecutionContext';
import { processCardPlayTokens, mergeAsyncActionResult } from '../utils/cardPlayResultProcessing';
import {
  processBreachEffect,
  processFencingEffect,
  processExecutionSquadEffect,
  processCreatedCardsEffect,
} from '../utils/specialCardEffects';
import {
  processCriticalToken,
  processGrowingDefense,
  processMultiUnitDamage,
} from '../utils/postActionProcessing';
import { processTokenExpiration } from '../utils/tokenExpirationProcessing';
import { processRequiredTokenConsumption, processBurnDamage, processBlockPerCardExecution } from '../utils/tokenConsumptionProcessing';
import { processViolentMortExecution } from '../utils/executionEffects';
import { processStunEffect } from '../utils/stunProcessing';
import { setupParryReady, checkParryTrigger } from '../utils/parryProcessing';
import { processTimelineSpecials, hasSpecial, processCardPlaySpecials } from '../utils/cardSpecialEffects';
import { applyTimelineChanges } from '../utils/timelineQueueUtils';
import { processAllNextTurnEffects } from '../utils/cardPlaySpecialsProcessing';
import { processImmediateCardTraits, processCardPlayedRelicEffects } from '../utils/cardImmediateEffects';
import { processPlayerEtherAccumulation, processEnemyEtherAccumulation } from '../utils/etherAccumulationProcessing';
import { processEnemyDeath } from '../utils/enemyDeathProcessing';
import { processActionEventAnimations } from '../utils/eventAnimationProcessing';
import { resolveAttackTarget, resolveDefenseSource, updateAttackTargetBlock, applyDefenseToUnit } from '../utils/unitTargetingUtils';
import { generateBreachCards, generateFencingCards, generateExecutionSquadCards } from '../utils/cardCreationProcessing';
import { applyAction } from '../logic/combatActions';
import { TIMING, executeMultiHitAsync } from '../logic/battleExecution';
import { CARDS } from '../battleData';
import { collectTriggeredRelics, playRelicActivationSequence } from '../utils/relicActivationAnimation';
import { getCardEtherGain } from '../utils/etherCalculations';
import { calculatePassiveEffects } from '../../../lib/relicEffects';
import type { Card, HandAction, BreachSelection, TokenEntity, ParryReadyState } from '../../../types';
import type { BattleEvent, SingleHitResult, CardPlaySpecialsResult } from '../../../types/combat';
import type { BattleActions } from './useBattleState';

export interface CardExecutionDeps {
  // Refs
  battleRef: MutableRefObject<{
    queue: HandAction[];
    qIndex: number;
    player: unknown;
    enemy: unknown;
    nextTurnEffects?: Record<string, unknown>;
    hand?: Card[];
    deck?: Card[];
    discardPile?: Card[];
    vanishedCards?: unknown[];
  } | null>;
  isExecutingCardRef: MutableRefObject<boolean>;
  breachSelectionRef: MutableRefObject<BreachSelection | null>;
  parryReadyStatesRef: MutableRefObject<ParryReadyState[]>;
  creationQueueRef: MutableRefObject<unknown[]>;
  growingDefenseRef: MutableRefObject<{ activatedSp: number; totalDefenseApplied?: number } | null>;
  escapeBanRef: MutableRefObject<Set<string>>;
  referenceBookTriggeredRef: MutableRefObject<boolean>;
  devilDiceTriggeredRef: MutableRefObject<boolean>;

  // State
  battle: {
    phase: string;
    queue: HandAction[];
    qIndex: number;
    player: unknown;
    enemy: unknown;
    nextTurnEffects: Record<string, unknown>;
    hand?: Card[];
    deck?: Card[];
    discardPile?: Card[];
    vanishedCards?: unknown[];
    selectedTargetUnit?: number;
    actionEvents?: Record<number, BattleEvent[]>;
  };
  player: {
    hp: number;
    block?: number;
    def?: boolean;
    strength?: number;
    counter?: number;
    vulnMult?: number;
    tokens?: unknown;
    energy?: number;
    maxEnergy?: number;
  };
  enemy: {
    hp: number;
    block?: number;
    def?: boolean;
    counter?: number;
    vulnMult?: number;
    tokens?: unknown;
    units?: unknown[];
    name?: string;
    maxSpeed?: number;
  };
  turnNumber: number;
  cardUsageCount: Record<string, number>;
  orderedRelicList: string[];
  relics: string[];
  cardUpgrades: Record<string, unknown>;
  turnEtherAccumulated: number;
  enemyTurnEtherAccumulated: number;
  playerTimeline: unknown[];
  resolvedPlayerCards: number;
  nextTurnEffects: Record<string, unknown>;
  pathosTurnEffects?: Record<string, unknown>;
  pathosNextCardEffects?: {
    guaranteeCrit?: boolean;
    setSpeed?: number;
    aoe?: boolean;
  };
  safeInitialPlayer: unknown;

  // Actions
  actions: BattleActions & {
    setPlayer: (p: unknown) => void;
    setEnemy: (e: unknown) => void;
    setQueue: (q: HandAction[]) => void;
    setQIndex: (i: number) => void;
    setPhase: (p: string) => void;
    setPostCombatOptions: (o: unknown) => void;
    setActionEvents: (e: unknown) => void;
    setNextTurnEffects: (e: unknown) => void;
    setCardUsageCount: (c: unknown) => void;
    setDeck: (d: Card[]) => void;
    setDiscardPile: (d: Card[]) => void;
    setHand: (h: Card[]) => void;
    setEnemyUnits: (u: unknown[]) => void;
    setEnemyHit: (h: boolean) => void;
    setPlayerHit: (h: boolean) => void;
    setRelicActivated: (r: string | null) => void;
    setEtherCalcPhase: (p: string) => void;
    setTurnEtherAccumulated: (v: number) => void;
    setResolvedPlayerCards: (v: number) => void;
    addVanishedCard: (c: unknown) => void;
    addLog: (msg: string) => void;
    setIsSimplified: (v: boolean) => void;
  };
  setBreachSelection: (s: BreachSelection | null) => void;
  setRecallSelection: (s: unknown) => void;
  setParryReadyStates: (s: ParryReadyState[]) => void;
  flashRelic: (id: string) => void;
  addLog: (msg: string) => void;
  consumeNextCardEffects: () => void;
  startEtherCalculationAnimation: () => void;
}

/**
 * 카드 실행 로직을 제공하는 훅
 *
 * 참고: 이 훅은 executeCardAction의 핵심 로직만 포함합니다.
 * 복잡한 의존성으로 인해 완전한 분리는 어렵지만,
 * 주요 처리 로직은 utils 폴더의 함수들로 분리되어 있습니다.
 */
export function useCardExecution(deps: CardExecutionDeps) {
  // 이 훅은 설계 가이드로 제공됩니다.
  // 실제 executeCardAction은 BattleApp.tsx에서 여전히 인라인으로 정의되지만,
  // 내부 로직은 분리된 유틸리티 함수들을 호출합니다.
  //
  // 완전한 분리를 위해서는 다음이 필요합니다:
  // 1. battleRef를 Context로 관리
  // 2. 모든 actions를 단일 객체로 통합
  // 3. 상태 업데이트 패턴 표준화

  const {
    battleRef,
    isExecutingCardRef,
    battle,
    player,
    enemy,
    turnNumber,
    actions,
    addLog,
  } = deps;

  // 유틸리티 함수 재내보내기 (BattleApp에서 사용)
  return {
    buildBattleContext,
    processCardPlayTokens,
    mergeAsyncActionResult,
    processBreachEffect,
    processFencingEffect,
    processExecutionSquadEffect,
    processCreatedCardsEffect,
    processCriticalToken,
    processGrowingDefense,
    processMultiUnitDamage,
    processTokenExpiration,
    processRequiredTokenConsumption,
    processBurnDamage,
    processBlockPerCardExecution,
    processViolentMortExecution,
    processStunEffect,
    setupParryReady,
    checkParryTrigger,
    processTimelineSpecials,
    hasSpecial,
    processCardPlaySpecials,
    applyTimelineChanges,
    processAllNextTurnEffects,
    processImmediateCardTraits,
    processCardPlayedRelicEffects,
    processPlayerEtherAccumulation,
    processEnemyEtherAccumulation,
    processEnemyDeath,
    processActionEventAnimations,
    resolveAttackTarget,
    resolveDefenseSource,
    updateAttackTargetBlock,
    applyDefenseToUnit,
    generateBreachCards,
    generateFencingCards,
    generateExecutionSquadCards,
    applyAction,
    executeMultiHitAsync,
    markCrossedCards,
    hasEnemyUnits,
    hasTrait,
    addToken,
  };
}
