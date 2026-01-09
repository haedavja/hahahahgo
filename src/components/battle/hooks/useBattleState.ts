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
  RespondSnapshot,
  BattleEvent,
  PostCombatOptions,
  DeflationInfo,
  OrderItem,
  HoveredCard,
  HoveredEnemyAction,
  ReflectionBattleState
} from '../../../types';
import type { FullBattleState, NextTurnEffects, PlayerState, EnemyState, EnemyUnitState } from '../reducer/battleReducerState';
import type { BattleAction, BattlePhase, SortType, EtherCalcPhase } from '../reducer/battleReducerActions';
import { useReducer, useMemo, useCallback, useRef, useEffect, type Dispatch } from 'react';
import { battleReducer, createInitialState, ACTIONS } from '../reducer/battleReducer';
import { BASE_PLAYER_ENERGY } from '../battleData';
import { addToken, removeToken, clearTurnTokens, setTokenStacks } from '../../../lib/tokenUtils';
import type { HandCard } from '../../../lib/speedQueue';

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

/** 토큰 조작 결과 */
interface TokenResult {
  tokens: import('../../../types').TokenState;
  logs: string[];
}

/** 전투 액션 타입 */
export interface BattleActions {
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

  // 카드 관리
  setHand: (hand: Card[]) => void;
  setSelected: (selected: Card[]) => void;
  addSelected: (card: Card) => void;
  removeSelected: (index: number) => void;
  setCanRedraw: (canRedraw: boolean) => void;
  setSortType: (sortType: SortType) => void;
  addVanishedCard: (cardId: string) => void;
  incrementCardUsage: (cardId: string) => void;
  setIsSimplified: (isSimplified: boolean) => void;
  setVanishedCards: (cards: Card[]) => void;
  setUsedCardIndices: (indices: number[] | Set<number>) => void;
  setDisappearingCards: (cards: number[] | Set<number>) => void;
  setHiddenCards: (cards: number[] | Set<number>) => void;
  setDisabledCardIndices: (indices: number[] | Set<number>) => void;
  setCardUsageCount: (count: Record<string, number>) => void;

  // 덱/무덤 시스템
  setDeck: (deck: Card[]) => void;
  setDiscardPile: (pile: Card[]) => void;
  addToDiscard: (card: Card) => void;
  drawFromDeck: (count: number) => void;
  shuffleDiscardIntoDeck: () => void;

  // 에테르 시스템
  setTurnEtherAccumulated: (amount: number) => void;
  setEnemyTurnEtherAccumulated: (amount: number) => void;
  setEtherCalcPhase: (phase: EtherCalcPhase) => void;
  setCurrentDeflation: (deflation: DeflationInfo | null) => void;
  setEtherFinalValue: (value: number | null) => void;
  setEnemyEtherCalcPhase: (phase: EtherCalcPhase) => void;
  setEnemyCurrentDeflation: (deflation: DeflationInfo | null) => void;
  setEnemyEtherFinalValue: (value: number | null) => void;
  setEtherAnimationPts: (pts: number) => void;
  setNetEtherDelta: (delta: number | null) => void;

  // 전투 실행
  setQueue: (queue: OrderItem[]) => void;
  setQIndex: (index: number) => void;
  setFixedOrder: (order: OrderItem[] | null) => void;
  setEnemyPlan: (plan: EnemyPlan) => void;
  setPostCombatOptions: (options: PostCombatOptions | null) => void;
  setExecutingCardIndex: (index: number | null) => void;
  setResolvedPlayerCards: (count: number) => void;

  // 로그
  addLog: (message: string) => void;
  setLog: (log: string[]) => void;
  setActionEvents: (events: Record<string, BattleEvent[]>) => void;

  // 토큰
  addTokenToPlayer: (tokenId: string, stacks?: number) => TokenResult;
  addTokenToEnemy: (tokenId: string, stacks?: number) => TokenResult;
  removeTokenFromPlayer: (tokenId: string, tokenType: string, stacks?: number) => TokenResult;
  removeTokenFromEnemy: (tokenId: string, tokenType: string, stacks?: number) => TokenResult;
  resetTokenForPlayer: (tokenId: string, tokenType: string, newStacks?: number) => TokenResult;
  resetTokenForEnemy: (tokenId: string, tokenType: string, newStacks?: number) => TokenResult;
  clearPlayerTurnTokens: () => TokenResult;
  clearEnemyTurnTokens: () => TokenResult;

  // UI 상태
  setActiveRelicSet: (set: Set<string>) => void;
  setRelicActivated: (relicId: string | null) => void;
  setMultiplierPulse: (pulse: boolean) => void;
  setOrderedRelics: (relics: Relic[] | string[]) => void;
  setShowCharacterSheet: (show: boolean) => void;
  setHoveredRelic: (relicId: string | null) => void;
  setAutoProgress: (auto: boolean) => void;
  setTimelineProgress: (progress: number) => void;
  setTimelineIndicatorVisible: (visible: boolean) => void;

  // 카드 툴팁
  setHoveredCard: (card: HoveredCard | null) => void;
  setTooltipVisible: (visible: boolean) => void;
  setPreviewDamage: (damage: PreviewDamage) => void;
  setPerUnitPreviewDamage: (damage: Record<number, PreviewDamage>) => void;
  setShowPtsTooltip: (show: boolean) => void;
  setShowBarTooltip: (show: boolean) => void;
  setHoveredEnemyAction: (action: HoveredEnemyAction | null) => void;

  // 통찰 시스템
  setInsightBadge: (badge: InsightBadge) => void;
  setInsightAnimLevel: (level: number) => void;
  setInsightAnimPulseKey: (key: number) => void;
  setShowInsightTooltip: (show: boolean) => void;

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
  setDestroyingEnemyCards: (indices: number[]) => void;
  setFreezingEnemyCards: (indices: number[]) => void;
  setFrozenOrder: (value: number) => void;

  // 자동진행 & 스냅샷
  setResolveStartPlayer: (player: PlayerBattleState | null) => void;
  setResolveStartEnemy: (enemy: EnemyUnit | null) => void;
  setRespondSnapshot: (snapshot: RespondSnapshot | null) => void;
  incrementRewindUsedCount: () => void;

  // 피해 분배 시스템
  setDistributionMode: (mode: boolean) => void;
  setPendingDistributionCard: (card: Card | null) => void;
  setDamageDistribution: (dist: DamageDistributionMap) => void;
  updateDamageDistribution: (unitId: number, damage: number) => void;
  setTotalDistributableDamage: (total: number) => void;
  resetDistribution: () => void;

  // 턴 관리
  setTurnNumber: (number: number) => void;
  incrementTurn: () => void;

  // 다음 턴 효과
  setNextTurnEffects: (effects: NextTurnEffects) => void;
  updateNextTurnEffects: (updates: Partial<NextTurnEffects>) => void;
  setReflectionState: (state: ReflectionBattleState | null) => void;

  // 기타
  dispatch: Dispatch<BattleAction>;

  // 확장을 위한 인덱스 시그니처 - 훅 파라미터 타입과 호환성 확보
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
    // Default player and enemy states with explicit types
    const defaultPlayer: PlayerState = {
      hp: 100,
      maxHp: 100,
      energy: BASE_PLAYER_ENERGY,
      maxEnergy: BASE_PLAYER_ENERGY,
      block: 0,
      maxSpeed: 30,
      tokens: { usage: [], turn: [], permanent: [] },
    };

    const defaultEnemy: EnemyState = {
      hp: 100,
      maxHp: 100,
      block: 0,
      maxSpeed: 30,
      tokens: { usage: [], turn: [], permanent: [] },
      units: [],
    };

    // Merge overrides with defaults
    const playerState: PlayerState = {
      ...defaultPlayer,
      ...initialStateOverrides.player
    };

    const enemyState: EnemyState = {
      ...defaultEnemy,
      ...initialStateOverrides.enemy
    };

    // createInitialState에서 기본 상태를 생성하되, 오버라이드된 필드만 덮어쓰기
    const baseState = createInitialState({
      initialPlayerState: playerState,
      initialEnemyState: enemyState,
      initialPlayerRelics: initialStateOverrides.orderedRelics || [],
      simplifiedMode: initialStateOverrides.isSimplified || false,
      sortType: initialStateOverrides.sortType || 'speed'
    });

    // 나머지 필드들 병합
    const finalState: FullBattleState = {
      ...baseState,
      ...initialStateOverrides
    } as FullBattleState;
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
    setEnemyUnits: (units: EnemyUnit[]) => dispatch({ type: ACTIONS.SET_ENEMY_UNITS, payload: units as EnemyUnitState[] }),
    updateEnemyUnit: (unitId: number, updates: Partial<EnemyUnit>) => dispatch({ type: ACTIONS.UPDATE_ENEMY_UNIT, payload: { unitId, updates: updates as Partial<EnemyUnitState> } }),

    // === 전투 페이즈 ===
    setPhase: (phase: string) => dispatch({ type: ACTIONS.SET_PHASE, payload: phase as BattlePhase }),

    // === 카드 관리 ===
    setHand: (hand: HandCard[]) => dispatch({ type: ACTIONS.SET_HAND, payload: hand }),
    setSelected: (selected: HandCard[]) => dispatch({ type: ACTIONS.SET_SELECTED, payload: selected }),
    addSelected: (card: HandCard) => dispatch({ type: ACTIONS.ADD_SELECTED, payload: card }),
    removeSelected: (index: number) => dispatch({ type: ACTIONS.REMOVE_SELECTED, payload: index }),
    setCanRedraw: (canRedraw: boolean) => dispatch({ type: ACTIONS.SET_CAN_REDRAW, payload: canRedraw }),
    setSortType: (sortType: SortType) => dispatch({ type: ACTIONS.SET_SORT_TYPE, payload: sortType }),
    addVanishedCard: (cardId: string) => dispatch({ type: ACTIONS.ADD_VANISHED_CARD, payload: { id: cardId } as Card }),
    incrementCardUsage: (cardId: string) => dispatch({ type: ACTIONS.INCREMENT_CARD_USAGE, payload: cardId }),

    // === 에테르 시스템 ===
    setTurnEtherAccumulated: (amount: number) => dispatch({ type: ACTIONS.SET_TURN_ETHER_ACCUMULATED, payload: amount }),
    setEnemyTurnEtherAccumulated: (amount: number) => dispatch({ type: ACTIONS.SET_ENEMY_TURN_ETHER_ACCUMULATED, payload: amount }),
    setEtherCalcPhase: (phase: EtherCalcPhase) => dispatch({ type: ACTIONS.SET_ETHER_CALC_PHASE, payload: phase }),
    setCurrentDeflation: (deflation: DeflationInfo | null) => dispatch({ type: ACTIONS.SET_CURRENT_DEFLATION, payload: deflation }),
    setEtherFinalValue: (value: number | null) => dispatch({ type: ACTIONS.SET_ETHER_FINAL_VALUE, payload: value }),
    setEnemyEtherCalcPhase: (phase: EtherCalcPhase) => dispatch({ type: ACTIONS.SET_ENEMY_ETHER_CALC_PHASE, payload: phase }),
    setEnemyCurrentDeflation: (deflation: DeflationInfo | null) => dispatch({ type: ACTIONS.SET_ENEMY_CURRENT_DEFLATION, payload: deflation }),
    setEnemyEtherFinalValue: (value: number | null) => dispatch({ type: ACTIONS.SET_ENEMY_ETHER_FINAL_VALUE, payload: value }),

    // === 전투 실행 ===
    setQueue: (queue: OrderItem[]) => dispatch({ type: ACTIONS.SET_QUEUE, payload: queue }),
    setQIndex: (index: number) => dispatch({ type: ACTIONS.SET_Q_INDEX, payload: index }),
    setFixedOrder: (order: OrderItem[] | null) => dispatch({ type: ACTIONS.SET_FIXED_ORDER, payload: order }),
    setEnemyPlan: (plan: EnemyPlan | HandCard[]) => {
      // EnemyPlan 객체인지 배열인지 확인
      const payload = Array.isArray(plan)
        ? { actions: plan, mode: null } as EnemyPlan
        : plan as EnemyPlan;
      dispatch({ type: ACTIONS.SET_ENEMY_PLAN, payload });
    },

    // === UI 상태 ===
    setShowCharacterSheet: (show: boolean) => dispatch({ type: ACTIONS.SET_SHOW_CHARACTER_SHEET, payload: show }),
    setWillOverdrive: (will: boolean) => dispatch({ type: ACTIONS.SET_WILL_OVERDRIVE, payload: will }),
    setAutoProgress: (auto: boolean) => dispatch({ type: ACTIONS.SET_AUTO_PROGRESS, payload: auto }),
    setTimelineProgress: (progress: number) => dispatch({ type: ACTIONS.SET_TIMELINE_PROGRESS, payload: progress }),
    setTimelineIndicatorVisible: (visible: boolean) => dispatch({ type: ACTIONS.SET_TIMELINE_INDICATOR_VISIBLE, payload: visible }),

    // === 로그 & 이벤트 ===
    addLog: (message: string) => dispatch({ type: ACTIONS.ADD_LOG, payload: message }),
    setLog: (log: string[]) => dispatch({ type: ACTIONS.SET_LOG, payload: log }),
    setActionEvents: (events: Record<string, BattleEvent[]>) => dispatch({ type: ACTIONS.SET_ACTION_EVENTS, payload: events }),

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
    setRespondSnapshot: (snapshot: RespondSnapshot | null) => dispatch({ type: ACTIONS.SET_RESPOND_SNAPSHOT, payload: snapshot }),
    incrementRewindUsedCount: () => dispatch({ type: ACTIONS.INCREMENT_REWIND_USED_COUNT }),

    // === 상징 UI ===
    setHoveredRelic: (relicId: string | null) => dispatch({ type: ACTIONS.SET_HOVERED_RELIC, payload: relicId }),
    setRelicActivated: (relicId: string | null) => dispatch({ type: ACTIONS.SET_RELIC_ACTIVATED, payload: relicId }),
    setActiveRelicSet: (relicSet: Set<string>) => dispatch({ type: ACTIONS.SET_ACTIVE_RELIC_SET, payload: relicSet }),

    // === 전투 진행 ===
    setResolvedPlayerCards: (count: number) => dispatch({ type: ACTIONS.SET_RESOLVED_PLAYER_CARDS, payload: count }),

    // === 카드 툴팁 ===
    setHoveredCard: (card: HoveredCard | null) => dispatch({ type: ACTIONS.SET_HOVERED_CARD, payload: card }),
    setTooltipVisible: (visible: boolean) => dispatch({ type: ACTIONS.SET_TOOLTIP_VISIBLE, payload: visible }),
    setPreviewDamage: (damage: PreviewDamage) => dispatch({ type: ACTIONS.SET_PREVIEW_DAMAGE, payload: damage }),
    setPerUnitPreviewDamage: (damage: Record<number, PreviewDamage>) => dispatch({ type: ACTIONS.SET_PER_UNIT_PREVIEW_DAMAGE, payload: damage }),
    setShowPtsTooltip: (show: boolean) => dispatch({ type: ACTIONS.SET_SHOW_PTS_TOOLTIP, payload: show }),
    setShowBarTooltip: (show: boolean) => dispatch({ type: ACTIONS.SET_SHOW_BAR_TOOLTIP, payload: show }),

    // === 통찰 시스템 ===
    setInsightBadge: (badge: InsightBadge) => dispatch({ type: ACTIONS.SET_INSIGHT_BADGE, payload: badge }),
    setInsightAnimLevel: (level: number) => dispatch({ type: ACTIONS.SET_INSIGHT_ANIM_LEVEL, payload: level }),
    setInsightAnimPulseKey: (key: number) => dispatch({ type: ACTIONS.SET_INSIGHT_ANIM_PULSE_KEY, payload: key }),
    setShowInsightTooltip: (show: boolean) => dispatch({ type: ACTIONS.SET_SHOW_INSIGHT_TOOLTIP, payload: show }),

    // === 적 행동 툴팁 ===
    setHoveredEnemyAction: (action: HoveredEnemyAction | null) => dispatch({ type: ACTIONS.SET_HOVERED_ENEMY_ACTION, payload: action }),

    // === 카드 파괴 애니메이션 ===
    setDestroyingEnemyCards: (indices: number[]) => dispatch({ type: ACTIONS.SET_DESTROYING_ENEMY_CARDS, payload: indices }),

    // === 카드 빙결 애니메이션 ===
    setFreezingEnemyCards: (indices: number[]) => dispatch({ type: ACTIONS.SET_FREEZING_ENEMY_CARDS, payload: indices }),

    // === 빙결 순서 플래그 ===
    setFrozenOrder: (value: number) => dispatch({ type: ACTIONS.SET_FROZEN_ORDER, payload: value }),

    // === 피해 분배 시스템 ===
    setDistributionMode: (mode: boolean) => dispatch({ type: ACTIONS.SET_DISTRIBUTION_MODE, payload: mode }),
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
    setUsedCardIndices: (indices: number[] | Set<number>) => dispatch({ type: ACTIONS.SET_USED_CARD_INDICES, payload: Array.isArray(indices) ? indices : Array.from(indices) }),
    setDisappearingCards: (cards: number[] | Set<number>) => dispatch({ type: ACTIONS.SET_DISAPPEARING_CARDS, payload: Array.isArray(cards) ? cards : Array.from(cards) }),
    setHiddenCards: (cards: number[] | Set<number>) => dispatch({ type: ACTIONS.SET_HIDDEN_CARDS, payload: Array.isArray(cards) ? cards : Array.from(cards) }),
    setDisabledCardIndices: (indices: number[] | Set<number>) => dispatch({ type: ACTIONS.SET_DISABLED_CARD_INDICES, payload: Array.isArray(indices) ? indices : Array.from(indices) }),
    setCardUsageCount: (count: Record<string, number>) => dispatch({ type: ACTIONS.SET_CARD_USAGE_COUNT, payload: count }),

    // === 덱/무덤 시스템 ===
    setDeck: (deck: Card[]) => dispatch({ type: ACTIONS.SET_DECK, payload: deck }),
    setDiscardPile: (pile: Card[]) => dispatch({ type: ACTIONS.SET_DISCARD_PILE, payload: pile }),
    addToDiscard: (card: Card) => dispatch({ type: ACTIONS.ADD_TO_DISCARD, payload: card }),
    drawFromDeck: (count: number) => dispatch({ type: ACTIONS.DRAW_FROM_DECK, payload: count }),
    shuffleDiscardIntoDeck: () => dispatch({ type: ACTIONS.SHUFFLE_DISCARD_INTO_DECK }),

    setEtherAnimationPts: (pts: number) => dispatch({ type: ACTIONS.SET_ETHER_ANIMATION_PTS, payload: pts }),
    setExecutingCardIndex: (index: number | null) => dispatch({ type: ACTIONS.SET_EXECUTING_CARD_INDEX, payload: index }),
    setTurnNumber: (number: number) => dispatch({ type: ACTIONS.SET_TURN_NUMBER, payload: number }),
    incrementTurn: () => dispatch({ type: ACTIONS.INCREMENT_TURN }),
    setNetEtherDelta: (delta: number | null) => dispatch({ type: ACTIONS.SET_NET_ETHER_DELTA, payload: delta }),
    setVanishedCards: (cards: Card[]) => dispatch({ type: ACTIONS.SET_VANISHED_CARDS, payload: cards }),
    setIsSimplified: (simplified: boolean) => dispatch({ type: ACTIONS.SET_IS_SIMPLIFIED, payload: simplified }),
    setPostCombatOptions: (options: PostCombatOptions | null) => dispatch({ type: ACTIONS.SET_POST_COMBAT_OPTIONS, payload: options }),
    setNextTurnEffects: (effects: NextTurnEffects) => dispatch({ type: ACTIONS.SET_NEXT_TURN_EFFECTS, payload: effects }),
    updateNextTurnEffects: (updates: Partial<NextTurnEffects>) => dispatch({ type: ACTIONS.UPDATE_NEXT_TURN_EFFECTS, payload: updates }),
    setReflectionState: (state: unknown) => dispatch({ type: ACTIONS.SET_REFLECTION_STATE, payload: state }),
    setOrderedRelics: (relics: Relic[]) => dispatch({ type: ACTIONS.SET_ORDERED_RELICS, payload: relics }),
    incrementQIndex: () => dispatch({ type: ACTIONS.INCREMENT_Q_INDEX }),
    updateLog: (log: string[]) => dispatch({ type: ACTIONS.SET_LOG, payload: log }),

    // === 복합 액션 ===
    resetTurn: () => dispatch({ type: ACTIONS.RESET_TURN }),
    resetEtherAnimation: () => dispatch({ type: ACTIONS.RESET_ETHER_ANIMATION }),
    resetBattle: (_config: ResetConfig) => dispatch({ type: ACTIONS.RESET_BATTLE }),

    // === 턴 진행 ===
    nextTurn: () => dispatch({ type: ACTIONS.INCREMENT_TURN }),

    // === 토큰 관리 (별칭) ===
    addPlayerToken: (tokenId: string, stacks?: number) => {
      const current = battleRef.current;
      const result = addToken(current.player, tokenId, stacks);
      dispatch({ type: ACTIONS.UPDATE_PLAYER_TOKENS, payload: result.tokens });
      result.logs.forEach((log: string) => dispatch({ type: ACTIONS.ADD_LOG, payload: log }));
      return result;
    },
    removePlayerToken: (tokenId: string, type?: string, stacks?: number) => {
      const current = battleRef.current;
      const result = removeToken(current.player, tokenId, type || 'permanent', stacks);
      dispatch({ type: ACTIONS.UPDATE_PLAYER_TOKENS, payload: result.tokens });
      result.logs.forEach((log: string) => dispatch({ type: ACTIONS.ADD_LOG, payload: log }));
      return result;
    },
    addEnemyToken: (tokenId: string, stacks?: number) => {
      const current = battleRef.current;
      const result = addToken(current.enemy, tokenId, stacks);
      dispatch({ type: ACTIONS.UPDATE_ENEMY_TOKENS, payload: result.tokens });
      result.logs.forEach((log: string) => dispatch({ type: ACTIONS.ADD_LOG, payload: log }));
      return result;
    },
    removeEnemyToken: (tokenId: string, type?: string, stacks?: number) => {
      const current = battleRef.current;
      const result = removeToken(current.enemy, tokenId, type || 'permanent', stacks);
      dispatch({ type: ACTIONS.UPDATE_ENEMY_TOKENS, payload: result.tokens });
      result.logs.forEach((log: string) => dispatch({ type: ACTIONS.ADD_LOG, payload: log }));
      return result;
    },
    clearTurnTokens: (target: 'player' | 'enemy') => {
      if (target === 'player') {
        const current = battleRef.current;
        const result = clearTurnTokens(current.player);
        dispatch({ type: ACTIONS.UPDATE_PLAYER_TOKENS, payload: result.tokens });
        result.logs.forEach((log: string) => dispatch({ type: ACTIONS.ADD_LOG, payload: log }));
        return result;
      } else {
        const current = battleRef.current;
        const result = clearTurnTokens(current.enemy);
        dispatch({ type: ACTIONS.UPDATE_ENEMY_TOKENS, payload: result.tokens });
        result.logs.forEach((log: string) => dispatch({ type: ACTIONS.ADD_LOG, payload: log }));
        return result;
      }
    },
    setTokenStacks: (target: 'player' | 'enemy', tokenId: string, stacks: number) => {
      if (target === 'player') {
        const current = battleRef.current;
        const result = setTokenStacks(current.player, tokenId, 'permanent', stacks);
        dispatch({ type: ACTIONS.UPDATE_PLAYER_TOKENS, payload: result.tokens });
        result.logs.forEach((log: string) => dispatch({ type: ACTIONS.ADD_LOG, payload: log }));
        return result;
      } else {
        const current = battleRef.current;
        const result = setTokenStacks(current.enemy, tokenId, 'permanent', stacks);
        dispatch({ type: ACTIONS.UPDATE_ENEMY_TOKENS, payload: result.tokens });
        result.logs.forEach((log: string) => dispatch({ type: ACTIONS.ADD_LOG, payload: log }));
        return result;
      }
    },

    // === Raw dispatch (필요시 직접 액션 전달) ===
    dispatch
  }), [dispatch]) as BattleActions;

  return { battle, actions };
}

/**
 * useBattleActions Hook
 *
 * 액션만 필요한 경우 사용
 * (상태는 context나 다른 방법으로 관리할 때)
 */
export function useBattleActions(dispatch: Dispatch<BattleAction>) {
  return useMemo(() => ({
    setPlayer: (player: PlayerBattleState) => dispatch({ type: ACTIONS.SET_PLAYER, payload: player }),
    updatePlayer: (updates: Partial<PlayerBattleState>) => dispatch({ type: ACTIONS.UPDATE_PLAYER, payload: updates }),
    setEnemy: (enemy: EnemyUnit) => dispatch({ type: ACTIONS.SET_ENEMY, payload: enemy }),
    updateEnemy: (updates: Partial<EnemyUnit>) => dispatch({ type: ACTIONS.UPDATE_ENEMY, payload: updates }),
    setPhase: (phase: string) => dispatch({ type: ACTIONS.SET_PHASE, payload: phase as BattlePhase }),
    addLog: (message: string) => dispatch({ type: ACTIONS.ADD_LOG, payload: message }),
    resetTurn: () => dispatch({ type: ACTIONS.RESET_TURN }),
    // 다중 유닛 시스템
    setSelectedTargetUnit: (unitId: number) => dispatch({ type: ACTIONS.SET_SELECTED_TARGET_UNIT, payload: unitId }),
    setEnemyUnits: (units: EnemyUnit[]) => dispatch({ type: ACTIONS.SET_ENEMY_UNITS, payload: units as EnemyUnitState[] }),
    updateEnemyUnit: (unitId: number, updates: Partial<EnemyUnit>) => dispatch({ type: ACTIONS.UPDATE_ENEMY_UNIT, payload: { unitId, updates: updates as Partial<EnemyUnitState> } }),
  }), [dispatch]);
}
