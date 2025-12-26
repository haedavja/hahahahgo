/**
 * @file useBattleState.ts
 * @description 전투 상태 관리 커스텀 Hook
 */

import type {
  PlayerBattleState,
  EnemyUnit,
  BattleInitialStateOverrides as InitialStateOverrides,
  Card,
  Relic,
  PreviewDamage,
  InsightBadge,
  EnemyPlan,
  RespondSnapshot
} from '../../../types';
import type { FullBattleState, NextTurnEffects, PlayerState, EnemyState } from '../reducer/battleReducerState';
import type { BattleAction, BattlePhase, SortType, EtherCalcPhase } from '../reducer/battleReducerActions';
import { useReducer, useMemo, useCallback, useRef, useEffect, type Dispatch } from 'react';
import { battleReducer, createInitialState, ACTIONS } from '../reducer/battleReducer';
import { addToken, removeToken, clearTurnTokens, setTokenStacks } from '../../../lib/tokenUtils';
import type { HandCard, SpeedQueueHandCard } from '../../../lib/speedQueue';

/** 전투 리셋 설정 */
interface ResetConfig {
  player?: Partial<PlayerBattleState>;
  enemy?: Partial<EnemyUnit>;
  orderedRelics?: string[];
  isSimplified?: boolean;
  sortType?: SortType;
}

/** 피해 분배 맵 */
type DamageDistributionMap = Record<number, number>;

/**
 * =============================================================================
 * STALE CLOSURE 문제 해결 패턴
 * =============================================================================
 *
 * 문제: useMemo/useCallback 내부에서 state를 직접 참조하면 클로저에 갇힌
 *      생성 시점의 stale 값을 사용하게 됨
 *
 * 예시 (BAD):
 *   const actions = useMemo(() => ({
 *     doSomething: () => {
 *       const value = battle.player; // ❌ stale closure!
 *     }
 *   }), [dispatch]); // dependency에 battle이 없으므로 battle 변경 시 갱신 안됨
 *
 * 해결 (GOOD):
 *   const battleRef = useRef(battle);
 *   useEffect(() => { battleRef.current = battle; }, [battle]);
 *
 *   const actions = useMemo(() => ({
 *     doSomething: () => {
 *       const value = battleRef.current.player; // ✅ 항상 최신 상태!
 *     }
 *   }), [dispatch]);
 *
 * 이 파일에서 battleRef를 사용하여 토큰 함수들이 항상 최신 상태를 참조하도록 함
 * =============================================================================
 */

/** useBattleState 반환 타입 */
interface UseBattleStateResult {
  battle: FullBattleState;
  actions: BattleActions;
}

/** 전투 액션 타입 */
interface BattleActions {
  // 플레이어 & 적 상태
  setPlayer: (player: PlayerBattleState) => void;
  updatePlayer: (updates: Partial<PlayerBattleState>) => void;
  setEnemy: (enemy: EnemyUnit) => void;
  updateEnemy: (updates: Partial<EnemyUnit>) => void;
  setEnemyIndex: (index: number) => void;
  setSelectedTargetUnit: (unitId: number) => void;
  setEnemyUnits: (units: EnemyUnit[]) => void;
  updateEnemyUnit: (unitId: number, updates: Partial<EnemyUnit>) => void;

  // 전투 페이즈
  setPhase: (phase: string) => void;
  nextTurn: () => void;

  // 카드 관리
  setHand: (hand: HandCard[]) => void;
  setSelected: (selected: HandCard[]) => void;
  addSelected: (card: HandCard) => void;
  removeSelected: (index: number) => void;
  setCanRedraw: (canRedraw: boolean) => void;
  setSortType: (sortType: SortType) => void;
  addVanishedCard: (cardId: string) => void;
  incrementCardUsage: (cardId: string) => void;
  setIsSimplified: (isSimplified: boolean) => void;

  // 에테르 시스템
  setTurnEtherAccumulated: (amount: number) => void;
  setEnemyTurnEtherAccumulated: (amount: number) => void;
  setEtherCalcPhase: (phase: EtherCalcPhase) => void;
  setCurrentDeflation: (deflation: number | null) => void;
  setEtherFinalValue: (value: number | null) => void;
  setEnemyEtherCalcPhase: (phase: EtherCalcPhase) => void;
  setEnemyCurrentDeflation: (deflation: number | null) => void;
  setEnemyEtherFinalValue: (value: number | null) => void;

  // 전투 실행
  setQueue: (queue: HandCard[]) => void;
  setQIndex: (index: number) => void;
  setFixedOrder: (order: HandCard[] | null) => void;
  setEnemyPlan: (plan: HandCard[]) => void;
  setPostCombatOptions: (options: unknown) => void;

  // 로그
  addLog: (message: string) => void;
  setActionEvents: (events: unknown[]) => void;
  setNetEtherDelta: (delta: number | null) => void;

  // 토큰
  addPlayerToken: (tokenId: string, stacks?: number) => void;
  removePlayerToken: (tokenId: string, type?: string, stacks?: number) => void;
  addEnemyToken: (tokenId: string, stacks?: number) => void;
  removeEnemyToken: (tokenId: string, type?: string, stacks?: number) => void;
  clearTurnTokens: (target: 'player' | 'enemy') => void;
  setTokenStacks: (target: 'player' | 'enemy', tokenId: string, stacks: number) => void;

  // UI 상태
  setActiveRelicSet: (set: Set<string>) => void;
  setRelicActivated: (relicId: string | null) => void;
  setMultiplierPulse: (pulse: boolean) => void;
  setOrderedRelics: (relics: string[]) => void;
  setShowCharacterSheet: (show: boolean) => void;

  // 애니메이션
  setPlayerHit: (hit: boolean) => void;
  setEnemyHit: (hit: boolean) => void;
  setPlayerBlockAnim: (anim: boolean) => void;
  setEnemyBlockAnim: (anim: boolean) => void;
  setWillOverdrive: (overdrive: boolean) => void;
  setEtherPulse: (pulse: boolean) => void;
  setPlayerOverdriveFlash: (flash: boolean) => void;
  setEnemyOverdriveFlash: (flash: boolean) => void;
  setSoulShatter: (shatter: boolean) => void;
  setPlayerTransferPulse: (pulse: boolean) => void;
  setEnemyTransferPulse: (pulse: boolean) => void;

  // 기타
  dispatch: Dispatch<BattleAction>;
  [key: string]: unknown;
}

/**
 * useBattleState Hook
 *
 * 전투 상태 관리를 위한 커스텀 Hook
 * battleReducer를 래핑하여 사용하기 쉬운 API 제공
 *
 * @param initialStateOverrides - 초기 상태 오버라이드 (모든 필드 선택 가능)
 * @returns { battle, actions } - 상태와 액션 객체
 */
export function useBattleState(initialStateOverrides: InitialStateOverrides = {}): UseBattleStateResult {
  // Lazy initializer function for useReducer
  const initializeBattleState = useCallback(() => {
    // createInitialState에서 기본 상태를 생성하되, 오버라이드된 필드만 덮어쓰기
    const baseState = createInitialState({
      initialPlayerState: initialStateOverrides.player,
      initialEnemyState: initialStateOverrides.enemy,
      initialPlayerRelics: initialStateOverrides.orderedRelics || [],
      simplifiedMode: initialStateOverrides.isSimplified || false,
      sortType: initialStateOverrides.sortType || 'speed'
    });

    // 나머지 필드들 병합
    const finalState = {
      ...baseState,
      ...initialStateOverrides
    };
    return finalState;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [battle, dispatch] = useReducer(battleReducer, null, initializeBattleState);

  // =====================
  // STALE CLOSURE 문제 해결
  // 토큰 함수들이 항상 최신 상태를 참조하도록 ref 사용
  // =====================
  const battleRef = useRef(battle);
  useEffect(() => {
    battleRef.current = battle;
  }, [battle]);

  // =====================
  // 액션 헬퍼 함수들
  // =====================

  const actions = useMemo(() => ({
    // === 플레이어 & 적 상태 ===
    setPlayer: (player: PlayerBattleState) => dispatch({ type: ACTIONS.SET_PLAYER, payload: player }),
    updatePlayer: (updates: Partial<PlayerBattleState>) => dispatch({ type: ACTIONS.UPDATE_PLAYER, payload: updates }),
    setEnemy: (enemy: EnemyUnit) => dispatch({ type: ACTIONS.SET_ENEMY, payload: enemy }),
    updateEnemy: (updates: Partial<EnemyUnit>) => dispatch({ type: ACTIONS.UPDATE_ENEMY, payload: updates }),
    setEnemyIndex: (index: number) => dispatch({ type: ACTIONS.SET_ENEMY_INDEX, payload: index }),
    // 다중 유닛 시스템
    setSelectedTargetUnit: (unitId: number) => dispatch({ type: ACTIONS.SET_SELECTED_TARGET_UNIT, payload: unitId }),
    setEnemyUnits: (units: EnemyUnit[]) => dispatch({ type: ACTIONS.SET_ENEMY_UNITS, payload: units }),
    updateEnemyUnit: (unitId: number, updates: Partial<EnemyUnit>) => dispatch({ type: ACTIONS.UPDATE_ENEMY_UNIT, payload: { unitId, updates } }),

    // === 전투 페이즈 ===
    setPhase: (phase: string) => dispatch({ type: ACTIONS.SET_PHASE, payload: phase }),

    // === 카드 관리 ===
    setHand: (hand: HandCard[]) => dispatch({ type: ACTIONS.SET_HAND, payload: hand }),
    setSelected: (selected: HandCard[]) => dispatch({ type: ACTIONS.SET_SELECTED, payload: selected }),
    addSelected: (card: HandCard) => dispatch({ type: ACTIONS.ADD_SELECTED, payload: card }),
    removeSelected: (index: number) => dispatch({ type: ACTIONS.REMOVE_SELECTED, payload: index }),
    setCanRedraw: (canRedraw: boolean) => dispatch({ type: ACTIONS.SET_CAN_REDRAW, payload: canRedraw }),
    setSortType: (sortType: SortType) => dispatch({ type: ACTIONS.SET_SORT_TYPE, payload: sortType }),
    addVanishedCard: (cardId: string) => dispatch({ type: ACTIONS.ADD_VANISHED_CARD, payload: cardId }),
    incrementCardUsage: (cardId: string) => dispatch({ type: ACTIONS.INCREMENT_CARD_USAGE, payload: cardId }),

    // === 에테르 시스템 ===
    setTurnEtherAccumulated: (amount: number) => dispatch({ type: ACTIONS.SET_TURN_ETHER_ACCUMULATED, payload: amount }),
    setEnemyTurnEtherAccumulated: (amount: number) => dispatch({ type: ACTIONS.SET_ENEMY_TURN_ETHER_ACCUMULATED, payload: amount }),
    setEtherCalcPhase: (phase: EtherCalcPhase) => dispatch({ type: ACTIONS.SET_ETHER_CALC_PHASE, payload: phase }),
    setCurrentDeflation: (deflation: number | null) => dispatch({ type: ACTIONS.SET_CURRENT_DEFLATION, payload: deflation }),
    setEtherFinalValue: (value: number | null) => dispatch({ type: ACTIONS.SET_ETHER_FINAL_VALUE, payload: value }),
    setEnemyEtherCalcPhase: (phase: EtherCalcPhase) => dispatch({ type: ACTIONS.SET_ENEMY_ETHER_CALC_PHASE, payload: phase }),
    setEnemyCurrentDeflation: (deflation: number | null) => dispatch({ type: ACTIONS.SET_ENEMY_CURRENT_DEFLATION, payload: deflation }),
    setEnemyEtherFinalValue: (value: number | null) => dispatch({ type: ACTIONS.SET_ENEMY_ETHER_FINAL_VALUE, payload: value }),

    // === 전투 실행 ===
    setQueue: (queue: HandCard[]) => dispatch({ type: ACTIONS.SET_QUEUE, payload: queue }),
    setQIndex: (index: number) => dispatch({ type: ACTIONS.SET_Q_INDEX, payload: index }),
    setFixedOrder: (order: HandCard[] | null) => dispatch({ type: ACTIONS.SET_FIXED_ORDER, payload: order }),
    setEnemyPlan: (plan: HandCard[]) => dispatch({ type: ACTIONS.SET_ENEMY_PLAN, payload: plan }),

    // === UI 상태 ===
    setShowCharacterSheet: (show: boolean) => dispatch({ type: ACTIONS.SET_SHOW_CHARACTER_SHEET, payload: show }),
    setWillOverdrive: (will: boolean) => dispatch({ type: ACTIONS.SET_WILL_OVERDRIVE, payload: will }),
    setAutoProgress: (auto: boolean) => dispatch({ type: ACTIONS.SET_AUTO_PROGRESS, payload: auto }),
    setTimelineProgress: (progress: number) => dispatch({ type: ACTIONS.SET_TIMELINE_PROGRESS, payload: progress }),
    setTimelineIndicatorVisible: (visible: boolean) => dispatch({ type: ACTIONS.SET_TIMELINE_INDICATOR_VISIBLE, payload: visible }),

    // === 로그 & 이벤트 ===
    addLog: (message: string) => dispatch({ type: ACTIONS.ADD_LOG, payload: message }),
    setLog: (log: string[]) => dispatch({ type: ACTIONS.SET_LOG, payload: log }),
    setActionEvents: (events: unknown[]) => dispatch({ type: ACTIONS.SET_ACTION_EVENTS, payload: events }),

    // === 애니메이션 ===
    setPlayerHit: (hit: boolean) => dispatch({ type: ACTIONS.SET_PLAYER_HIT, payload: hit }),
    setEnemyHit: (hit: boolean) => dispatch({ type: ACTIONS.SET_ENEMY_HIT, payload: hit }),
    setPlayerBlockAnim: (anim: boolean) => dispatch({ type: ACTIONS.SET_PLAYER_BLOCK_ANIM, payload: anim }),
    setEnemyBlockAnim: (anim: boolean) => dispatch({ type: ACTIONS.SET_ENEMY_BLOCK_ANIM, payload: anim }),
    setPlayerOverdriveFlash: (flash: boolean) => dispatch({ type: ACTIONS.SET_PLAYER_OVERDRIVE_FLASH, payload: flash }),
    setEnemyOverdriveFlash: (flash: boolean) => dispatch({ type: ACTIONS.SET_ENEMY_OVERDRIVE_FLASH, payload: flash }),
    setEtherPulse: (pulse: boolean) => dispatch({ type: ACTIONS.SET_ETHER_PULSE, payload: pulse }),
    setPlayerTransferPulse: (pulse: boolean) => dispatch({ type: ACTIONS.SET_PLAYER_TRANSFER_PULSE, payload: pulse }),
    setEnemyTransferPulse: (pulse: boolean) => dispatch({ type: ACTIONS.SET_ENEMY_TRANSFER_PULSE, payload: pulse }),
    setMultiplierPulse: (pulse: boolean) => dispatch({ type: ACTIONS.SET_MULTIPLIER_PULSE, payload: pulse }),
    setSoulShatter: (shatter: boolean) => dispatch({ type: ACTIONS.SET_SOUL_SHATTER, payload: shatter }),

    // === 자동진행 & 스냅샷 ===
    setResolveStartPlayer: (player: PlayerBattleState | null) => dispatch({ type: ACTIONS.SET_RESOLVE_START_PLAYER, payload: player }),
    setResolveStartEnemy: (enemy: EnemyUnit | null) => dispatch({ type: ACTIONS.SET_RESOLVE_START_ENEMY, payload: enemy }),
    setRespondSnapshot: (snapshot: FullBattleState | null) => dispatch({ type: ACTIONS.SET_RESPOND_SNAPSHOT, payload: snapshot }),
    setRewindUsed: (used: boolean) => dispatch({ type: ACTIONS.SET_REWIND_USED, payload: used }),

    // === 상징 UI ===
    setHoveredRelic: (relicId: string | null) => dispatch({ type: ACTIONS.SET_HOVERED_RELIC, payload: relicId }),
    setRelicActivated: (relicId: string | null) => dispatch({ type: ACTIONS.SET_RELIC_ACTIVATED, payload: relicId }),
    setActiveRelicSet: (relicSet: Set<string>) => dispatch({ type: ACTIONS.SET_ACTIVE_RELIC_SET, payload: relicSet }),

    // === 전투 진행 ===
    setResolvedPlayerCards: (count: number) => dispatch({ type: ACTIONS.SET_RESOLVED_PLAYER_CARDS, payload: count }),

    // === 카드 툴팁 ===
    setHoveredCard: (card: HandCard | null) => dispatch({ type: ACTIONS.SET_HOVERED_CARD, payload: card }),
    setTooltipVisible: (visible: boolean) => dispatch({ type: ACTIONS.SET_TOOLTIP_VISIBLE, payload: visible }),
    setPreviewDamage: (damage: number | null) => dispatch({ type: ACTIONS.SET_PREVIEW_DAMAGE, payload: damage }),
    setPerUnitPreviewDamage: (damage: Record<number, number> | null) => dispatch({ type: ACTIONS.SET_PER_UNIT_PREVIEW_DAMAGE, payload: damage }),
    setShowPtsTooltip: (show: boolean) => dispatch({ type: ACTIONS.SET_SHOW_PTS_TOOLTIP, payload: show }),
    setShowBarTooltip: (show: boolean) => dispatch({ type: ACTIONS.SET_SHOW_BAR_TOOLTIP, payload: show }),

    // === 통찰 시스템 ===
    setInsightBadge: (badge: string | null) => dispatch({ type: ACTIONS.SET_INSIGHT_BADGE, payload: badge }),
    setInsightAnimLevel: (level: number) => dispatch({ type: ACTIONS.SET_INSIGHT_ANIM_LEVEL, payload: level }),
    setInsightAnimPulseKey: (key: number) => dispatch({ type: ACTIONS.SET_INSIGHT_ANIM_PULSE_KEY, payload: key }),
    setShowInsightTooltip: (show: boolean) => dispatch({ type: ACTIONS.SET_SHOW_INSIGHT_TOOLTIP, payload: show }),

    // === 적 행동 툴팁 ===
    setHoveredEnemyAction: (action: HandCard | null) => dispatch({ type: ACTIONS.SET_HOVERED_ENEMY_ACTION, payload: action }),

    // === 카드 파괴 애니메이션 ===
    setDestroyingEnemyCards: (indices: number[]) => dispatch({ type: ACTIONS.SET_DESTROYING_ENEMY_CARDS, payload: indices }),

    // === 카드 빙결 애니메이션 ===
    setFreezingEnemyCards: (indices: number[]) => dispatch({ type: ACTIONS.SET_FREEZING_ENEMY_CARDS, payload: indices }),

    // === 빙결 순서 플래그 ===
    setFrozenOrder: (value: boolean) => dispatch({ type: ACTIONS.SET_FROZEN_ORDER, payload: value }),

    // === 피해 분배 시스템 ===
    setDistributionMode: (mode: DistributionMode) => dispatch({ type: ACTIONS.SET_DISTRIBUTION_MODE, payload: mode }),
    setPendingDistributionCard: (card: HandCard | null) => dispatch({ type: ACTIONS.SET_PENDING_DISTRIBUTION_CARD, payload: card }),
    setDamageDistribution: (dist: DamageDistributionMap) => dispatch({ type: ACTIONS.SET_DAMAGE_DISTRIBUTION, payload: dist }),
    updateDamageDistribution: (unitId: number, damage: number) => dispatch({ type: ACTIONS.UPDATE_DAMAGE_DISTRIBUTION, payload: { unitId, damage } }),
    setTotalDistributableDamage: (total: number) => dispatch({ type: ACTIONS.SET_TOTAL_DISTRIBUTABLE_DAMAGE, payload: total }),
    resetDistribution: () => dispatch({ type: ACTIONS.RESET_DISTRIBUTION }),

    // === 토큰 시스템 ===
    // 주의: battleRef.current 사용 - stale closure 방지
    addTokenToPlayer: (tokenId: string, stacks: number = 1) => {
      const current = battleRef.current;  // 항상 최신 상태 참조!
      const result = addToken(current.player, tokenId, stacks);
      dispatch({ type: ACTIONS.UPDATE_PLAYER_TOKENS, payload: result.tokens });
      result.logs.forEach((log: string) => dispatch({ type: ACTIONS.ADD_LOG, payload: log }));
      return result;
    },
    addTokenToEnemy: (tokenId: string, stacks: number = 1) => {
      const current = battleRef.current;  // 항상 최신 상태 참조!
      const result = addToken(current.enemy, tokenId, stacks);
      dispatch({ type: ACTIONS.UPDATE_ENEMY_TOKENS, payload: result.tokens });
      result.logs.forEach((log: string) => dispatch({ type: ACTIONS.ADD_LOG, payload: log }));
      return result;
    },
    removeTokenFromPlayer: (tokenId: string, tokenType: string, stacks: number = 1) => {
      const current = battleRef.current;  // 항상 최신 상태 참조!
      const result = removeToken(current.player, tokenId, tokenType, stacks);
      dispatch({ type: ACTIONS.UPDATE_PLAYER_TOKENS, payload: result.tokens });
      result.logs.forEach((log: string) => dispatch({ type: ACTIONS.ADD_LOG, payload: log }));
      return result;
    },
    removeTokenFromEnemy: (tokenId: string, tokenType: string, stacks: number = 1) => {
      const current = battleRef.current;  // 항상 최신 상태 참조!
      const result = removeToken(current.enemy, tokenId, tokenType, stacks);
      dispatch({ type: ACTIONS.UPDATE_ENEMY_TOKENS, payload: result.tokens });
      result.logs.forEach((log: string) => dispatch({ type: ACTIONS.ADD_LOG, payload: log }));
      return result;
    },
    resetTokenForPlayer: (tokenId: string, tokenType: string, newStacks: number = 0) => {
      const current = battleRef.current;
      const result = setTokenStacks(current.player, tokenId, tokenType, newStacks);
      dispatch({ type: ACTIONS.UPDATE_PLAYER_TOKENS, payload: result.tokens });
      result.logs.forEach((log: string) => dispatch({ type: ACTIONS.ADD_LOG, payload: log }));
      return result;
    },
    resetTokenForEnemy: (tokenId: string, tokenType: string, newStacks: number = 0) => {
      const current = battleRef.current;
      const result = setTokenStacks(current.enemy, tokenId, tokenType, newStacks);
      dispatch({ type: ACTIONS.UPDATE_ENEMY_TOKENS, payload: result.tokens });
      result.logs.forEach((log: string) => dispatch({ type: ACTIONS.ADD_LOG, payload: log }));
      return result;
    },
    clearPlayerTurnTokens: () => {
      const current = battleRef.current;  // 항상 최신 상태 참조!
      const result = clearTurnTokens(current.player);
      dispatch({ type: ACTIONS.UPDATE_PLAYER_TOKENS, payload: result.tokens });
      result.logs.forEach((log: string) => dispatch({ type: ACTIONS.ADD_LOG, payload: log }));
      return result;
    },
    clearEnemyTurnTokens: () => {
      const current = battleRef.current;  // 항상 최신 상태 참조!
      const result = clearTurnTokens(current.enemy);
      dispatch({ type: ACTIONS.UPDATE_ENEMY_TOKENS, payload: result.tokens });
      result.logs.forEach((log: string) => dispatch({ type: ACTIONS.ADD_LOG, payload: log }));
      return result;
    },

    // === 추가 상태들 ===
    setUsedCardIndices: (indices: Set<number>) => dispatch({ type: ACTIONS.SET_USED_CARD_INDICES, payload: indices }),
    setDisappearingCards: (cards: Set<number>) => dispatch({ type: ACTIONS.SET_DISAPPEARING_CARDS, payload: cards }),
    setHiddenCards: (cards: Set<number>) => dispatch({ type: ACTIONS.SET_HIDDEN_CARDS, payload: cards }),
    setDisabledCardIndices: (indices: Set<number>) => dispatch({ type: ACTIONS.SET_DISABLED_CARD_INDICES, payload: indices }),
    setCardUsageCount: (count: Record<string, number>) => dispatch({ type: ACTIONS.SET_CARD_USAGE_COUNT, payload: count }),

    // === 덱/무덤 시스템 ===
    setDeck: (deck: string[]) => dispatch({ type: ACTIONS.SET_DECK, payload: deck }),
    setDiscardPile: (pile: string[]) => dispatch({ type: ACTIONS.SET_DISCARD_PILE, payload: pile }),
    addToDiscard: (cards: string[]) => dispatch({ type: ACTIONS.ADD_TO_DISCARD, payload: cards }),
    drawFromDeck: (count: number) => dispatch({ type: ACTIONS.DRAW_FROM_DECK, payload: count }),
    shuffleDiscardIntoDeck: () => dispatch({ type: ACTIONS.SHUFFLE_DISCARD_INTO_DECK }),

    setEtherAnimationPts: (pts: number) => dispatch({ type: ACTIONS.SET_ETHER_ANIMATION_PTS, payload: pts }),
    setExecutingCardIndex: (index: number | null) => dispatch({ type: ACTIONS.SET_EXECUTING_CARD_INDEX, payload: index }),
    setTurnNumber: (number: number) => dispatch({ type: ACTIONS.SET_TURN_NUMBER, payload: number }),
    incrementTurn: () => dispatch({ type: ACTIONS.INCREMENT_TURN }),
    setNetEtherDelta: (delta: number | null) => dispatch({ type: ACTIONS.SET_NET_ETHER_DELTA, payload: delta }),
    setVanishedCards: (cards: Set<string>) => dispatch({ type: ACTIONS.SET_VANISHED_CARDS, payload: cards }),
    setIsSimplified: (simplified: boolean) => dispatch({ type: ACTIONS.SET_IS_SIMPLIFIED, payload: simplified }),
    setPostCombatOptions: (options: unknown) => dispatch({ type: ACTIONS.SET_POST_COMBAT_OPTIONS, payload: options }),
    setNextTurnEffects: (effects: NextTurnEffects) => dispatch({ type: ACTIONS.SET_NEXT_TURN_EFFECTS, payload: effects }),
    updateNextTurnEffects: (updates: Partial<NextTurnEffects>) => dispatch({ type: ACTIONS.UPDATE_NEXT_TURN_EFFECTS, payload: updates }),
    setReflectionState: (state: ReflectionState) => dispatch({ type: ACTIONS.SET_REFLECTION_STATE, payload: state }),
    setOrderedRelics: (relics: string[]) => dispatch({ type: ACTIONS.SET_ORDERED_RELICS, payload: relics }),
    incrementQIndex: () => dispatch({ type: ACTIONS.INCREMENT_Q_INDEX }),
    updateLog: (log: string[]) => dispatch({ type: ACTIONS.SET_LOG, payload: log }),

    // === 복합 액션 ===
    resetTurn: () => dispatch({ type: ACTIONS.RESET_TURN }),
    resetEtherAnimation: () => dispatch({ type: ACTIONS.RESET_ETHER_ANIMATION }),
    resetBattle: (config: ResetConfig) => dispatch({ type: ACTIONS.RESET_BATTLE, payload: config }),

    // === Raw dispatch (필요시 직접 액션 전달) ===
    dispatch
  }), [dispatch]);

  return { battle, actions };
}

/**
 * useBattleActions Hook
 *
 * 액션만 필요한 경우 사용
 * (상태는 context나 다른 방법으로 관리할 때)
 */
export function useBattleActions(dispatch) {
  return useMemo(() => ({
    setPlayer: (player) => dispatch({ type: ACTIONS.SET_PLAYER, payload: player }),
    updatePlayer: (updates) => dispatch({ type: ACTIONS.UPDATE_PLAYER, payload: updates }),
    setEnemy: (enemy) => dispatch({ type: ACTIONS.SET_ENEMY, payload: enemy }),
    updateEnemy: (updates) => dispatch({ type: ACTIONS.UPDATE_ENEMY, payload: updates }),
    setPhase: (phase) => dispatch({ type: ACTIONS.SET_PHASE, payload: phase }),
    addLog: (message) => dispatch({ type: ACTIONS.ADD_LOG, payload: message }),
    resetTurn: () => dispatch({ type: ACTIONS.RESET_TURN }),
    // 다중 유닛 시스템
    setSelectedTargetUnit: (unitId) => dispatch({ type: ACTIONS.SET_SELECTED_TARGET_UNIT, payload: unitId }),
    setEnemyUnits: (units) => dispatch({ type: ACTIONS.SET_ENEMY_UNITS, payload: units }),
    updateEnemyUnit: (unitId, updates) => dispatch({ type: ACTIONS.UPDATE_ENEMY_UNIT, payload: { unitId, updates } }),
  }), [dispatch]);
}
