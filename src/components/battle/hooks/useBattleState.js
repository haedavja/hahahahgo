import { useReducer, useMemo, useCallback } from 'react';
import { battleReducer, createInitialState, ACTIONS } from '../reducer/battleReducer';
import { addToken, removeToken, clearTurnTokens } from '../../../lib/tokenUtils';

/**
 * useBattleState Hook
 *
 * 전투 상태 관리를 위한 커스텀 Hook
 * battleReducer를 래핑하여 사용하기 쉬운 API 제공
 *
 * @param {Object} initialStateOverrides - 초기 상태 오버라이드 (모든 필드 선택 가능)
 * @returns {Object} { battle, actions } - 상태와 액션 객체
 */
export function useBattleState(initialStateOverrides = {}) {
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
    return {
      ...baseState,
      ...initialStateOverrides
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [battle, dispatch] = useReducer(battleReducer, null, initializeBattleState);

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
    setQIndex: (index) => dispatch({ type: ACTIONS.SET_Q_INDEX, payload: index }),
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

    // === 자동진행 & 스냅샷 ===
    setResolveStartPlayer: (player) => dispatch({ type: ACTIONS.SET_RESOLVE_START_PLAYER, payload: player }),
    setResolveStartEnemy: (enemy) => dispatch({ type: ACTIONS.SET_RESOLVE_START_ENEMY, payload: enemy }),
    setRespondSnapshot: (snapshot) => dispatch({ type: ACTIONS.SET_RESPOND_SNAPSHOT, payload: snapshot }),
    setRewindUsed: (used) => dispatch({ type: ACTIONS.SET_REWIND_USED, payload: used }),

    // === 유물 UI ===
    setHoveredRelic: (relicId) => dispatch({ type: ACTIONS.SET_HOVERED_RELIC, payload: relicId }),
    setRelicActivated: (relicId) => dispatch({ type: ACTIONS.SET_RELIC_ACTIVATED, payload: relicId }),
    setActiveRelicSet: (relicSet) => dispatch({ type: ACTIONS.SET_ACTIVE_RELIC_SET, payload: relicSet }),

    // === 전투 진행 ===
    setResolvedPlayerCards: (count) => dispatch({ type: ACTIONS.SET_RESOLVED_PLAYER_CARDS, payload: count }),

    // === 카드 툴팁 ===
    setHoveredCard: (card) => dispatch({ type: ACTIONS.SET_HOVERED_CARD, payload: card }),
    setTooltipVisible: (visible) => dispatch({ type: ACTIONS.SET_TOOLTIP_VISIBLE, payload: visible }),
    setPreviewDamage: (damage) => dispatch({ type: ACTIONS.SET_PREVIEW_DAMAGE, payload: damage }),
    setShowPtsTooltip: (show) => dispatch({ type: ACTIONS.SET_SHOW_PTS_TOOLTIP, payload: show }),
    setShowBarTooltip: (show) => dispatch({ type: ACTIONS.SET_SHOW_BAR_TOOLTIP, payload: show }),

    // === 통찰 시스템 ===
    setInsightBadge: (badge) => dispatch({ type: ACTIONS.SET_INSIGHT_BADGE, payload: badge }),
    setInsightAnimLevel: (level) => dispatch({ type: ACTIONS.SET_INSIGHT_ANIM_LEVEL, payload: level }),
    setInsightAnimPulseKey: (key) => dispatch({ type: ACTIONS.SET_INSIGHT_ANIM_PULSE_KEY, payload: key }),
    setShowInsightTooltip: (show) => dispatch({ type: ACTIONS.SET_SHOW_INSIGHT_TOOLTIP, payload: show }),

    // === 적 행동 툴팁 ===
    setHoveredEnemyAction: (action) => dispatch({ type: ACTIONS.SET_HOVERED_ENEMY_ACTION, payload: action }),

    // === 토큰 시스템 ===
    addTokenToPlayer: (tokenId, stacks = 1) => {
      const result = addToken(battle.player, tokenId, stacks);
      dispatch({ type: ACTIONS.UPDATE_PLAYER_TOKENS, payload: result.tokens });
      result.logs.forEach(log => dispatch({ type: ACTIONS.ADD_LOG, payload: log }));
      return result;
    },
    addTokenToEnemy: (tokenId, stacks = 1) => {
      const result = addToken(battle.enemy, tokenId, stacks);
      dispatch({ type: ACTIONS.UPDATE_ENEMY_TOKENS, payload: result.tokens });
      result.logs.forEach(log => dispatch({ type: ACTIONS.ADD_LOG, payload: log }));
      return result;
    },
    removeTokenFromPlayer: (tokenId, tokenType, stacks = 1) => {
      const result = removeToken(battle.player, tokenId, tokenType, stacks);
      dispatch({ type: ACTIONS.UPDATE_PLAYER_TOKENS, payload: result.tokens });
      result.logs.forEach(log => dispatch({ type: ACTIONS.ADD_LOG, payload: log }));
      return result;
    },
    removeTokenFromEnemy: (tokenId, tokenType, stacks = 1) => {
      const result = removeToken(battle.enemy, tokenId, tokenType, stacks);
      dispatch({ type: ACTIONS.UPDATE_ENEMY_TOKENS, payload: result.tokens });
      result.logs.forEach(log => dispatch({ type: ACTIONS.ADD_LOG, payload: log }));
      return result;
    },
    clearPlayerTurnTokens: () => {
      const result = clearTurnTokens(battle.player);
      dispatch({ type: ACTIONS.UPDATE_PLAYER_TOKENS, payload: result.tokens });
      result.logs.forEach(log => dispatch({ type: ACTIONS.ADD_LOG, payload: log }));
      return result;
    },
    clearEnemyTurnTokens: () => {
      const result = clearTurnTokens(battle.enemy);
      dispatch({ type: ACTIONS.UPDATE_ENEMY_TOKENS, payload: result.tokens });
      result.logs.forEach(log => dispatch({ type: ACTIONS.ADD_LOG, payload: log }));
      return result;
    },

    // === 추가 상태들 ===
    setUsedCardIndices: (indices) => dispatch({ type: ACTIONS.SET_USED_CARD_INDICES, payload: indices }),
    setDisappearingCards: (cards) => dispatch({ type: ACTIONS.SET_DISAPPEARING_CARDS, payload: cards }),
    setHiddenCards: (cards) => dispatch({ type: ACTIONS.SET_HIDDEN_CARDS, payload: cards }),
    setDisabledCardIndices: (indices) => dispatch({ type: ACTIONS.SET_DISABLED_CARD_INDICES, payload: indices }),
    setCardUsageCount: (count) => dispatch({ type: ACTIONS.SET_CARD_USAGE_COUNT, payload: count }),
    setEtherAnimationPts: (pts) => dispatch({ type: ACTIONS.SET_ETHER_ANIMATION_PTS, payload: pts }),
    setExecutingCardIndex: (index) => dispatch({ type: ACTIONS.SET_EXECUTING_CARD_INDEX, payload: index }),
    setTurnNumber: (number) => dispatch({ type: ACTIONS.SET_TURN_NUMBER, payload: number }),
    incrementTurn: () => dispatch({ type: ACTIONS.INCREMENT_TURN }),
    setNetEtherDelta: (delta) => dispatch({ type: ACTIONS.SET_NET_ETHER_DELTA, payload: delta }),
    setVanishedCards: (cards) => dispatch({ type: ACTIONS.SET_VANISHED_CARDS, payload: cards }),
    setIsSimplified: (simplified) => dispatch({ type: ACTIONS.SET_IS_SIMPLIFIED, payload: simplified }),
    setPostCombatOptions: (options) => dispatch({ type: ACTIONS.SET_POST_COMBAT_OPTIONS, payload: options }),
    setNextTurnEffects: (effects) => dispatch({ type: ACTIONS.SET_NEXT_TURN_EFFECTS, payload: effects }),
    updateNextTurnEffects: (updates) => dispatch({ type: ACTIONS.UPDATE_NEXT_TURN_EFFECTS, payload: updates }),
    setOrderedRelics: (relics) => dispatch({ type: ACTIONS.SET_ORDERED_RELICS, payload: relics }),
    incrementQIndex: () => dispatch({ type: ACTIONS.INCREMENT_Q_INDEX }),
    updateLog: (log) => dispatch({ type: ACTIONS.SET_LOG, payload: log }),

    // === 복합 액션 ===
    resetTurn: () => dispatch({ type: ACTIONS.RESET_TURN }),
    resetEtherAnimation: () => dispatch({ type: ACTIONS.RESET_ETHER_ANIMATION }),
    resetBattle: (config) => dispatch({ type: ACTIONS.RESET_BATTLE, payload: config }),

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
    // ... 필요한 액션 추가
  }), [dispatch]);
}
