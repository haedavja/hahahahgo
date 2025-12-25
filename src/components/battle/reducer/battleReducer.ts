/**
 * @file battleReducer.ts
 * @description 전투 상태 관리 Reducer
 *
 * 분리된 모듈:
 * - battleReducerState.ts: 초기 상태 정의
 * - battleReducerActions.ts: 액션 타입 정의
 */

import type { FullBattleState } from './battleReducerState';

// 분리된 모듈에서 import 및 re-export
export { createInitialState } from './battleReducerState';
export type { FullBattleState } from './battleReducerState';
export { ACTIONS } from './battleReducerActions';
export type { BattleAction, BattlePhase, SortType, EtherCalcPhase } from './battleReducerActions';

import { ACTIONS, type BattleAction } from './battleReducerActions';

/**
 * 전투 상태 Reducer
 * @param state - 현재 전투 상태
 * @param action - 디스패치된 액션
 * @returns 새로운 상태
 */
export function battleReducer(state: FullBattleState, action: BattleAction): FullBattleState {
  switch (action.type) {
    // === 플레이어/적 상태 ===
    case ACTIONS.SET_PLAYER:
      return { ...state, player: action.payload };
    case ACTIONS.UPDATE_PLAYER:
      return { ...state, player: { ...state.player, ...action.payload } };
    case ACTIONS.SET_ENEMY:
      return { ...state, enemy: action.payload };
    case ACTIONS.UPDATE_ENEMY:
      return { ...state, enemy: { ...state.enemy, ...action.payload } };
    case ACTIONS.SET_ENEMY_INDEX:
      return { ...state, enemyIndex: action.payload };

    // === 다중 유닛 시스템 ===
    case ACTIONS.SET_SELECTED_TARGET_UNIT:
      return { ...state, selectedTargetUnit: action.payload };
    case ACTIONS.SET_ENEMY_UNITS:
      return { ...state, enemy: { ...state.enemy, units: action.payload } };
    case ACTIONS.UPDATE_ENEMY_UNIT: {
      const { unitId, updates } = action.payload;
      const units = state.enemy.units || [];
      const newUnits = units.map(u => u.unitId === unitId ? { ...u, ...updates } : u);
      const totalHp = newUnits.reduce((sum, u) => sum + Math.max(0, u.hp), 0);
      return { ...state, enemy: { ...state.enemy, units: newUnits, hp: totalHp } };
    }

    // === 페이즈 ===
    case ACTIONS.SET_PHASE:
      return { ...state, phase: action.payload };

    // === 카드 관리 ===
    case ACTIONS.SET_HAND:
      return { ...state, hand: action.payload };
    case ACTIONS.SET_SELECTED:
      return { ...state, selected: action.payload };
    case ACTIONS.ADD_SELECTED:
      return { ...state, selected: [...state.selected, action.payload] };
    case ACTIONS.REMOVE_SELECTED:
      return { ...state, selected: state.selected.filter((_, i) => i !== action.payload) };
    case ACTIONS.SET_CAN_REDRAW:
      return { ...state, canRedraw: action.payload };
    case ACTIONS.SET_SORT_TYPE:
      return { ...state, sortType: action.payload };
    case ACTIONS.SET_VANISHED_CARDS:
      return { ...state, vanishedCards: action.payload };
    case ACTIONS.ADD_VANISHED_CARD:
      return { ...state, vanishedCards: [...state.vanishedCards, action.payload] };
    case ACTIONS.SET_USED_CARD_INDICES:
      return { ...state, usedCardIndices: action.payload };
    case ACTIONS.SET_DISAPPEARING_CARDS:
      return { ...state, disappearingCards: action.payload };
    case ACTIONS.SET_HIDDEN_CARDS:
      return { ...state, hiddenCards: action.payload };
    case ACTIONS.SET_DISABLED_CARD_INDICES:
      return { ...state, disabledCardIndices: action.payload };
    case ACTIONS.SET_CARD_USAGE_COUNT:
      return { ...state, cardUsageCount: action.payload };
    case ACTIONS.INCREMENT_CARD_USAGE:
      return {
        ...state,
        cardUsageCount: {
          ...state.cardUsageCount,
          [action.payload]: (state.cardUsageCount[action.payload] || 0) + 1
        }
      };

    // === 덱/무덤 시스템 ===
    case ACTIONS.SET_DECK:
      return { ...state, deck: action.payload };
    case ACTIONS.SET_DISCARD_PILE:
      return { ...state, discardPile: action.payload };
    case ACTIONS.ADD_TO_DISCARD:
      return {
        ...state,
        discardPile: Array.isArray(action.payload)
          ? [...state.discardPile, ...action.payload]
          : [...state.discardPile, action.payload]
      };
    case ACTIONS.DRAW_FROM_DECK: {
      const drawCount = action.payload || 1;
      const drawnCards = state.deck.slice(0, drawCount);
      const remainingDeck = state.deck.slice(drawCount);
      return { ...state, deck: remainingDeck, hand: [...state.hand, ...drawnCards] };
    }
    case ACTIONS.SHUFFLE_DISCARD_INTO_DECK: {
      const shuffledDiscard = [...state.discardPile].sort(() => Math.random() - 0.5);
      return { ...state, deck: [...state.deck, ...shuffledDiscard], discardPile: [] };
    }

    // === 적 계획 ===
    case ACTIONS.SET_ENEMY_PLAN:
      return { ...state, enemyPlan: action.payload };

    // === 실행 큐 ===
    case ACTIONS.SET_FIXED_ORDER:
      return { ...state, fixedOrder: action.payload };
    case ACTIONS.SET_QUEUE:
      return { ...state, queue: action.payload };
    case ACTIONS.SET_Q_INDEX:
      return { ...state, qIndex: action.payload };
    case ACTIONS.INCREMENT_Q_INDEX:
      return { ...state, qIndex: state.qIndex + 1 };

    // === 로그 & 이벤트 ===
    case ACTIONS.ADD_LOG:
      return { ...state, log: [...state.log, action.payload] };
    case ACTIONS.SET_LOG:
      return { ...state, log: action.payload };
    case ACTIONS.SET_ACTION_EVENTS:
      return { ...state, actionEvents: action.payload };

    // === 턴 ===
    case ACTIONS.SET_TURN_NUMBER:
      return { ...state, turnNumber: action.payload };
    case ACTIONS.INCREMENT_TURN:
      return { ...state, turnNumber: state.turnNumber + 1 };

    // === 에테르 ===
    case ACTIONS.SET_TURN_ETHER_ACCUMULATED:
      return { ...state, turnEtherAccumulated: action.payload };
    case ACTIONS.SET_ENEMY_TURN_ETHER_ACCUMULATED:
      return { ...state, enemyTurnEtherAccumulated: action.payload };
    case ACTIONS.SET_NET_ETHER_DELTA:
      return { ...state, netEtherDelta: action.payload };
    case ACTIONS.SET_ETHER_ANIMATION_PTS:
      return { ...state, etherAnimationPts: action.payload };
    case ACTIONS.SET_ETHER_FINAL_VALUE:
      return { ...state, etherFinalValue: action.payload };
    case ACTIONS.SET_ENEMY_ETHER_FINAL_VALUE:
      return { ...state, enemyEtherFinalValue: action.payload };
    case ACTIONS.SET_ETHER_CALC_PHASE:
      return { ...state, etherCalcPhase: action.payload };
    case ACTIONS.SET_ENEMY_ETHER_CALC_PHASE:
      return { ...state, enemyEtherCalcPhase: action.payload };
    case ACTIONS.SET_CURRENT_DEFLATION:
      return { ...state, currentDeflation: action.payload };
    case ACTIONS.SET_ENEMY_CURRENT_DEFLATION:
      return { ...state, enemyCurrentDeflation: action.payload };
    case ACTIONS.SET_ETHER_PULSE:
      return { ...state, etherPulse: action.payload };
    case ACTIONS.SET_PLAYER_TRANSFER_PULSE:
      return { ...state, playerTransferPulse: action.payload };
    case ACTIONS.SET_ENEMY_TRANSFER_PULSE:
      return { ...state, enemyTransferPulse: action.payload };

    // === 기원 ===
    case ACTIONS.SET_WILL_OVERDRIVE:
      return { ...state, willOverdrive: action.payload };
    case ACTIONS.SET_PLAYER_OVERDRIVE_FLASH:
      return { ...state, playerOverdriveFlash: action.payload };
    case ACTIONS.SET_ENEMY_OVERDRIVE_FLASH:
      return { ...state, enemyOverdriveFlash: action.payload };
    case ACTIONS.SET_SOUL_SHATTER:
      return { ...state, soulShatter: action.payload };

    // === 타임라인 ===
    case ACTIONS.SET_TIMELINE_PROGRESS:
      return { ...state, timelineProgress: action.payload };
    case ACTIONS.SET_TIMELINE_INDICATOR_VISIBLE:
      return { ...state, timelineIndicatorVisible: action.payload };
    case ACTIONS.SET_EXECUTING_CARD_INDEX:
      return { ...state, executingCardIndex: action.payload };

    // === UI ===
    case ACTIONS.SET_IS_SIMPLIFIED:
      return { ...state, isSimplified: action.payload };
    case ACTIONS.SET_SHOW_CHARACTER_SHEET:
      return { ...state, showCharacterSheet: action.payload };
    case ACTIONS.TOGGLE_CHARACTER_SHEET:
      return { ...state, showCharacterSheet: !state.showCharacterSheet };
    case ACTIONS.SET_SHOW_PTS_TOOLTIP:
      return { ...state, showPtsTooltip: action.payload };
    case ACTIONS.SET_SHOW_BAR_TOOLTIP:
      return { ...state, showBarTooltip: action.payload };

    // === 상징 ===
    case ACTIONS.SET_ORDERED_RELICS:
      return { ...state, orderedRelics: action.payload };

    // === 전투 종료 ===
    case ACTIONS.SET_POST_COMBAT_OPTIONS:
      return { ...state, postCombatOptions: action.payload };

    // === 다음 턴 효과 ===
    case ACTIONS.SET_NEXT_TURN_EFFECTS:
      return { ...state, nextTurnEffects: action.payload };
    case ACTIONS.UPDATE_NEXT_TURN_EFFECTS:
      return { ...state, nextTurnEffects: { ...state.nextTurnEffects, ...action.payload } };

    // === 성찰 상태 ===
    case ACTIONS.SET_REFLECTION_STATE:
      return { ...state, reflectionState: action.payload };

    // === 애니메이션 ===
    case ACTIONS.SET_PLAYER_HIT:
      return { ...state, playerHit: action.payload };
    case ACTIONS.SET_ENEMY_HIT:
      return { ...state, enemyHit: action.payload };
    case ACTIONS.SET_PLAYER_BLOCK_ANIM:
      return { ...state, playerBlockAnim: action.payload };
    case ACTIONS.SET_ENEMY_BLOCK_ANIM:
      return { ...state, enemyBlockAnim: action.payload };

    // === 자동진행 & 스냅샷 ===
    case ACTIONS.SET_AUTO_PROGRESS:
      return { ...state, autoProgress: action.payload };
    case ACTIONS.SET_RESOLVE_START_PLAYER:
      return { ...state, resolveStartPlayer: action.payload };
    case ACTIONS.SET_RESOLVE_START_ENEMY:
      return { ...state, resolveStartEnemy: action.payload };
    case ACTIONS.SET_RESPOND_SNAPSHOT:
      return { ...state, respondSnapshot: action.payload };
    case ACTIONS.SET_REWIND_USED:
      return { ...state, rewindUsed: action.payload };

    // === 상징 UI ===
    case ACTIONS.SET_HOVERED_RELIC:
      return { ...state, hoveredRelic: action.payload };
    case ACTIONS.SET_RELIC_ACTIVATED:
      return { ...state, relicActivated: action.payload };
    case ACTIONS.SET_ACTIVE_RELIC_SET:
      return { ...state, activeRelicSet: action.payload };
    case ACTIONS.SET_MULTIPLIER_PULSE:
      return { ...state, multiplierPulse: action.payload };

    // === 전투 진행 ===
    case ACTIONS.SET_RESOLVED_PLAYER_CARDS:
      return { ...state, resolvedPlayerCards: action.payload };

    // === 카드 툴팁 ===
    case ACTIONS.SET_HOVERED_CARD:
      return { ...state, hoveredCard: action.payload };
    case ACTIONS.SET_TOOLTIP_VISIBLE:
      return { ...state, tooltipVisible: action.payload };
    case ACTIONS.SET_PREVIEW_DAMAGE:
      return { ...state, previewDamage: action.payload };
    case ACTIONS.SET_PER_UNIT_PREVIEW_DAMAGE:
      return { ...state, perUnitPreviewDamage: action.payload };

    // === 통찰 시스템 ===
    case ACTIONS.SET_INSIGHT_BADGE:
      return { ...state, insightBadge: action.payload };
    case ACTIONS.SET_INSIGHT_ANIM_LEVEL:
      return { ...state, insightAnimLevel: action.payload };
    case ACTIONS.SET_INSIGHT_ANIM_PULSE_KEY:
      return { ...state, insightAnimPulseKey: action.payload };
    case ACTIONS.SET_SHOW_INSIGHT_TOOLTIP:
      return { ...state, showInsightTooltip: action.payload };

    // === 적 행동 툴팁 ===
    case ACTIONS.SET_HOVERED_ENEMY_ACTION:
      return { ...state, hoveredEnemyAction: action.payload };

    // === 카드 파괴 애니메이션 ===
    case ACTIONS.SET_DESTROYING_ENEMY_CARDS:
      return { ...state, destroyingEnemyCards: action.payload };

    // === 카드 빙결 애니메이션 ===
    case ACTIONS.SET_FREEZING_ENEMY_CARDS:
      return { ...state, freezingEnemyCards: action.payload };

    // === 빙결 순서 플래그 ===
    case ACTIONS.SET_FROZEN_ORDER:
      return { ...state, frozenOrder: action.payload };

    // === 피해 분배 시스템 ===
    case ACTIONS.SET_DISTRIBUTION_MODE:
      return { ...state, distributionMode: action.payload };
    case ACTIONS.SET_PENDING_DISTRIBUTION_CARD:
      return { ...state, pendingDistributionCard: action.payload };
    case ACTIONS.SET_DAMAGE_DISTRIBUTION:
      return { ...state, damageDistribution: action.payload };
    case ACTIONS.UPDATE_DAMAGE_DISTRIBUTION: {
      const { unitId, damage } = action.payload;
      return { ...state, damageDistribution: { ...state.damageDistribution, [unitId]: damage } };
    }
    case ACTIONS.SET_TOTAL_DISTRIBUTABLE_DAMAGE:
      return { ...state, totalDistributableDamage: action.payload };
    case ACTIONS.RESET_DISTRIBUTION:
      return {
        ...state,
        distributionMode: false,
        pendingDistributionCard: null,
        damageDistribution: {},
        totalDistributableDamage: 0
      };

    // === 토큰 시스템 ===
    case ACTIONS.UPDATE_PLAYER_TOKENS:
      return { ...state, player: { ...state.player, tokens: action.payload } };
    case ACTIONS.UPDATE_ENEMY_TOKENS:
      return { ...state, enemy: { ...state.enemy, tokens: action.payload } };

    // === 복합 액션 ===
    case ACTIONS.RESET_TURN:
      return {
        ...state,
        selected: [],
        canRedraw: true,
        usedCardIndices: [],
        disappearingCards: [],
        hiddenCards: [],
        turnEtherAccumulated: 0,
        enemyTurnEtherAccumulated: 0,
        netEtherDelta: null,
        currentDeflation: null,
        enemyCurrentDeflation: null,
      };

    case ACTIONS.RESET_ETHER_ANIMATION:
      return {
        ...state,
        etherAnimationPts: null,
        etherFinalValue: null,
        enemyEtherFinalValue: null,
        etherCalcPhase: null,
        enemyEtherCalcPhase: null,
        etherPulse: false,
        playerTransferPulse: false,
        enemyTransferPulse: false,
        playerOverdriveFlash: false,
        enemyOverdriveFlash: false,
      };

    case ACTIONS.RESET_BATTLE:
      return createInitialState(action.payload);

    default:
      return state;
  }
}
