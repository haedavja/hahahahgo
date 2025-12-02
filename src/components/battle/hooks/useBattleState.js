import { useReducer, useMemo, useCallback } from 'react';
import { battleReducer, createInitialState, ACTIONS } from '../reducer/battleReducer';

/**
 * useBattleState Hook
 *
 * 전투 상태 관리를 위한 커스텀 Hook
 * battleReducer를 래핑하여 사용하기 쉬운 API 제공
 *
 * @param {Object} config - 초기 설정
 * @param {Object} config.initialPlayerState - 플레이어 초기 상태
 * @param {Object} config.initialEnemyState - 적 초기 상태
 * @param {Array} config.initialPlayerRelics - 플레이어 유물 목록
 * @param {boolean} config.simplifiedMode - 간소화 모드 여부
 * @param {string} config.sortType - 카드 정렬 방식
 * @returns {Array} [state, actions] - 상태와 액션 객체
 */
export function useBattleState({
  initialPlayerState,
  initialEnemyState,
  initialPlayerRelics = [],
  simplifiedMode = false,
  sortType = 'cost'
}) {
  const initialState = useMemo(
    () => createInitialState({
      initialPlayerState,
      initialEnemyState,
      initialPlayerRelics,
      simplifiedMode,
      sortType
    }),
    [initialPlayerState, initialEnemyState, initialPlayerRelics, simplifiedMode, sortType]
  );

  const [state, dispatch] = useReducer(battleReducer, initialState);

  // =====================
  // 액션 헬퍼 함수들
  // =====================

  const actions = useMemo(() => ({
    // === 플레이어 & 적 상태 ===
    setPlayer: (player) => dispatch({ type: ACTIONS.SET_PLAYER, payload: player }),
    updatePlayer: (updates) => dispatch({ type: ACTIONS.UPDATE_PLAYER, payload: updates }),
    setEnemy: (enemy) => dispatch({ type: ACTIONS.SET_ENEMY, payload: enemy }),
    updateEnemy: (updates) => dispatch({ type: ACTIONS.UPDATE_ENEMY, payload: updates }),
    setEnemyIndex: (index) => dispatch({ type: ACTIONS.SET_ENEMY_INDEX, payload: index }),

    // === 전투 페이즈 ===
    setPhase: (phase) => dispatch({ type: ACTIONS.SET_PHASE, payload: phase }),

    // === 카드 관리 ===
    setHand: (hand) => dispatch({ type: ACTIONS.SET_HAND, payload: hand }),
    setSelected: (selected) => dispatch({ type: ACTIONS.SET_SELECTED, payload: selected }),
    addSelected: (card) => dispatch({ type: ACTIONS.ADD_SELECTED, payload: card }),
    removeSelected: (index) => dispatch({ type: ACTIONS.REMOVE_SELECTED, payload: index }),
    setCanRedraw: (canRedraw) => dispatch({ type: ACTIONS.SET_CAN_REDRAW, payload: canRedraw }),
    setSortType: (sortType) => dispatch({ type: ACTIONS.SET_SORT_TYPE, payload: sortType }),
    addVanishedCard: (cardId) => dispatch({ type: ACTIONS.ADD_VANISHED_CARD, payload: cardId }),
    incrementCardUsage: (cardId) => dispatch({ type: ACTIONS.INCREMENT_CARD_USAGE, payload: cardId }),

    // === 에테르 시스템 ===
    setTurnEtherAccumulated: (amount) => dispatch({ type: ACTIONS.SET_TURN_ETHER_ACCUMULATED, payload: amount }),
    setEnemyTurnEtherAccumulated: (amount) => dispatch({ type: ACTIONS.SET_ENEMY_TURN_ETHER_ACCUMULATED, payload: amount }),
    setEtherCalcPhase: (phase) => dispatch({ type: ACTIONS.SET_ETHER_CALC_PHASE, payload: phase }),
    setCurrentDeflation: (deflation) => dispatch({ type: ACTIONS.SET_CURRENT_DEFLATION, payload: deflation }),
    setEtherFinalValue: (value) => dispatch({ type: ACTIONS.SET_ETHER_FINAL_VALUE, payload: value }),
    setEnemyEtherCalcPhase: (phase) => dispatch({ type: ACTIONS.SET_ENEMY_ETHER_CALC_PHASE, payload: phase }),
    setEnemyCurrentDeflation: (deflation) => dispatch({ type: ACTIONS.SET_ENEMY_CURRENT_DEFLATION, payload: deflation }),
    setEnemyEtherFinalValue: (value) => dispatch({ type: ACTIONS.SET_ENEMY_ETHER_FINAL_VALUE, payload: value }),

    // === 전투 실행 ===
    setQueue: (queue) => dispatch({ type: ACTIONS.SET_QUEUE, payload: queue }),
    setQIndex: (index) => dispatch({ type: ACTIONS.SET_QINDEX, payload: index }),
    setFixedOrder: (order) => dispatch({ type: ACTIONS.SET_FIXED_ORDER, payload: order }),
    setEnemyPlan: (plan) => dispatch({ type: ACTIONS.SET_ENEMY_PLAN, payload: plan }),

    // === UI 상태 ===
    setShowCharacterSheet: (show) => dispatch({ type: ACTIONS.SET_SHOW_CHARACTER_SHEET, payload: show }),
    setWillOverdrive: (will) => dispatch({ type: ACTIONS.SET_WILL_OVERDRIVE, payload: will }),
    setAutoProgress: (auto) => dispatch({ type: ACTIONS.SET_AUTO_PROGRESS, payload: auto }),
    setTimelineProgress: (progress) => dispatch({ type: ACTIONS.SET_TIMELINE_PROGRESS, payload: progress }),
    setTimelineIndicatorVisible: (visible) => dispatch({ type: ACTIONS.SET_TIMELINE_INDICATOR_VISIBLE, payload: visible }),

    // === 로그 & 이벤트 ===
    addLog: (message) => dispatch({ type: ACTIONS.ADD_LOG, payload: message }),
    setLog: (log) => dispatch({ type: ACTIONS.SET_LOG, payload: log }),
    setActionEvents: (events) => dispatch({ type: ACTIONS.SET_ACTION_EVENTS, payload: events }),

    // === 애니메이션 ===
    setPlayerHit: (hit) => dispatch({ type: ACTIONS.SET_PLAYER_HIT, payload: hit }),
    setEnemyHit: (hit) => dispatch({ type: ACTIONS.SET_ENEMY_HIT, payload: hit }),
    setPlayerBlockAnim: (anim) => dispatch({ type: ACTIONS.SET_PLAYER_BLOCK_ANIM, payload: anim }),
    setEnemyBlockAnim: (anim) => dispatch({ type: ACTIONS.SET_ENEMY_BLOCK_ANIM, payload: anim }),
    setPlayerOverdriveFlash: (flash) => dispatch({ type: ACTIONS.SET_PLAYER_OVERDRIVE_FLASH, payload: flash }),
    setEnemyOverdriveFlash: (flash) => dispatch({ type: ACTIONS.SET_ENEMY_OVERDRIVE_FLASH, payload: flash }),
    setEtherPulse: (pulse) => dispatch({ type: ACTIONS.SET_ETHER_PULSE, payload: pulse }),
    setPlayerTransferPulse: (pulse) => dispatch({ type: ACTIONS.SET_PLAYER_TRANSFER_PULSE, payload: pulse }),
    setEnemyTransferPulse: (pulse) => dispatch({ type: ACTIONS.SET_ENEMY_TRANSFER_PULSE, payload: pulse }),
    setMultiplierPulse: (pulse) => dispatch({ type: ACTIONS.SET_MULTIPLIER_PULSE, payload: pulse }),
    setSoulShatter: (shatter) => dispatch({ type: ACTIONS.SET_SOUL_SHATTER, payload: shatter }),

    // === 복합 액션 ===
    resetTurn: () => dispatch({ type: ACTIONS.RESET_TURN }),
    resetEtherAnimation: () => dispatch({ type: ACTIONS.RESET_ETHER_ANIMATION }),
    resetBattle: (config) => dispatch({ type: ACTIONS.RESET_BATTLE, payload: config }),

    // === Raw dispatch (필요시 직접 액션 전달) ===
    dispatch
  }), [dispatch]);

  return [state, actions];
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
    // ... 필요한 액션 추가
  }), [dispatch]);
}
