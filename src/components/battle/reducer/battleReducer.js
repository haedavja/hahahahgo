/**
 * 전투 상태 관리 Reducer
 * 70개의 useState를 하나의 useReducer로 통합
 */

import { createEmptyTokens } from '../../../lib/tokenUtils';

// =====================
// 초기 상태 정의
// =====================

export const createInitialState = ({
  initialPlayerState,
  initialEnemyState,
  initialPlayerRelics = [],
  simplifiedMode = false,
  sortType = 'cost'
}) => ({
  // === 플레이어 & 적 상태 ===
  player: initialPlayerState,
  enemy: initialEnemyState,
  enemyIndex: 0,

  // === 전투 페이즈 ===
  phase: 'select', // 'select', 'planning', 'resolve', 'result', 'victory', 'defeat'

  // === 카드 관리 ===
  hand: [],
  selected: [],
  canRedraw: true,
  sortType: sortType,
  vanishedCards: [], // 소멸 특성으로 제거된 카드
  usedCardIndices: [],
  disappearingCards: [], // 사라지는 중인 카드 인덱스
  hiddenCards: [], // 완전히 숨겨진 카드 인덱스
  disabledCardIndices: [], // 비활성화된 카드 인덱스
  cardUsageCount: {}, // 카드별 사용 횟수 (mastery, boredom용)

  // === 적 계획 ===
  enemyPlan: { actions: [], mode: null },

  // === 실행 큐 & 순서 ===
  fixedOrder: null,
  queue: [],
  qIndex: 0,

  // === 전투 로그 & 이벤트 ===
  log: ["게임 시작!"],
  actionEvents: {},

  // === 턴 관리 ===
  turnNumber: 1,

  // === 에테르 시스템 ===
  turnEtherAccumulated: 0, // 플레이어 이번 턴 누적 에테르
  enemyTurnEtherAccumulated: 0, // 적 이번 턴 누적 에테르
  netEtherDelta: null, // 최종 적용된 에테르 이동량(플레이어 기준)

  // 에테르 애니메이션
  etherAnimationPts: null, // 전체 획득량 표시
  etherFinalValue: null, // 플레이어 최종 에테르값
  enemyEtherFinalValue: null, // 적 최종 에테르값
  etherCalcPhase: null, // 'sum', 'multiply', 'deflation', 'result'
  enemyEtherCalcPhase: null,
  currentDeflation: null, // 플레이어 디플레이션 정보
  enemyCurrentDeflation: null, // 적 디플레이션 정보
  etherPulse: false, // PT 증가 애니메이션
  playerTransferPulse: false, // 에테르 이동 연출 (플레이어)
  enemyTransferPulse: false, // 에테르 이동 연출 (적)

  // === 기원(Overdrive) 연출 ===
  willOverdrive: false,
  playerOverdriveFlash: false,
  enemyOverdriveFlash: false,
  soulShatter: false, // 에테르 승리 연출

  // === 타임라인 ===
  timelineProgress: 0, // 0~100%
  timelineIndicatorVisible: true,
  executingCardIndex: null, // 현재 실행 중인 카드

  // === UI 상태 ===
  isSimplified: simplifiedMode,
  showCharacterSheet: false,
  showPtsTooltip: false,
  showBarTooltip: false,

  // === 유물 ===
  orderedRelics: initialPlayerRelics,

  // === 전투 종료 후 ===
  postCombatOptions: null,

  // === 다음 턴 효과 ===
  nextTurnEffects: {
    player: {},
    enemy: {}
  },

  // === 애니메이션 ===
  playerHit: false, // 플레이어 피격
  enemyHit: false, // 적 피격
  playerBlockAnim: false, // 플레이어 방어 애니메이션
  enemyBlockAnim: false, // 적 방어 애니메이션

  // === 자동진행 & 스냅샷 ===
  autoProgress: false, // 자동진행 모드
  resolveStartPlayer: null, // 진행 단계 시작 시 플레이어 상태
  resolveStartEnemy: null, // 진행 단계 시작 시 적 상태
  respondSnapshot: null, // 대응 단계 진입 시 상태 스냅샷(되감기용)
  rewindUsed: false, // 전투당 1회 되감기 사용 여부

  // === 유물 UI ===
  hoveredRelic: null, // 호버된 유물 ID
  relicActivated: null, // 발동된 유물 ID (애니메이션용)
  activeRelicSet: new Set(), // 동시 강조용
  multiplierPulse: false, // 배율 강조 애니메이션

  // === 전투 진행 ===
  resolvedPlayerCards: 0, // 진행 단계에서 진행된 플레이어 카드 수

  // === 카드 툴팁 ===
  hoveredCard: null, // 호버된 카드 정보 {card, position}
  tooltipVisible: false, // 툴팁 표시 여부
  previewDamage: { value: 0, lethal: false, overkill: false }, // 데미지 미리보기

  // === 통찰 시스템 ===
  insightBadge: {
    level: 0,
    dir: 'up',
    show: false,
    key: 0,
  },
  insightAnimLevel: 0,
  insightAnimPulseKey: 0,
  showInsightTooltip: false,

  // === 적 행동 툴팁 ===
  hoveredEnemyAction: null,

  // === 카드 파괴 애니메이션 ===
  destroyingEnemyCards: [], // 파괴 중인 적 카드 인덱스
});

// =====================
// 액션 타입 정의
// =====================

export const ACTIONS = {
  // === 플레이어/적 상태 ===
  SET_PLAYER: 'SET_PLAYER',
  UPDATE_PLAYER: 'UPDATE_PLAYER',
  SET_ENEMY: 'SET_ENEMY',
  UPDATE_ENEMY: 'UPDATE_ENEMY',
  SET_ENEMY_INDEX: 'SET_ENEMY_INDEX',

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

  // === 유물 ===
  SET_ORDERED_RELICS: 'SET_ORDERED_RELICS',

  // === 전투 종료 ===
  SET_POST_COMBAT_OPTIONS: 'SET_POST_COMBAT_OPTIONS',

  // === 다음 턴 효과 ===
  SET_NEXT_TURN_EFFECTS: 'SET_NEXT_TURN_EFFECTS',
  UPDATE_NEXT_TURN_EFFECTS: 'UPDATE_NEXT_TURN_EFFECTS',

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

  // === 유물 UI ===
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

  // === 통찰 시스템 ===
  SET_INSIGHT_BADGE: 'SET_INSIGHT_BADGE',
  SET_INSIGHT_ANIM_LEVEL: 'SET_INSIGHT_ANIM_LEVEL',
  SET_INSIGHT_ANIM_PULSE_KEY: 'SET_INSIGHT_ANIM_PULSE_KEY',
  SET_SHOW_INSIGHT_TOOLTIP: 'SET_SHOW_INSIGHT_TOOLTIP',

  // === 적 행동 툴팁 ===
  SET_HOVERED_ENEMY_ACTION: 'SET_HOVERED_ENEMY_ACTION',

  // === 카드 파괴 애니메이션 ===
  SET_DESTROYING_ENEMY_CARDS: 'SET_DESTROYING_ENEMY_CARDS',

  // === 토큰 시스템 ===
  UPDATE_PLAYER_TOKENS: 'UPDATE_PLAYER_TOKENS',
  UPDATE_ENEMY_TOKENS: 'UPDATE_ENEMY_TOKENS',

  // === 복합 액션 (여러 상태를 한번에 변경) ===
  RESET_TURN: 'RESET_TURN',
  RESET_ETHER_ANIMATION: 'RESET_ETHER_ANIMATION',
  RESET_BATTLE: 'RESET_BATTLE',
};

// =====================
// Reducer 함수
// =====================

export function battleReducer(state, action) {
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

    // === 페이즈 ===
    case ACTIONS.SET_PHASE:
      console.log('[REDUCER] SET_PHASE:', action.payload);
      if (action.payload === 'select') {
        console.trace('[STACK TRACE] SET_PHASE to select called from:');
      }
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

    // === 유물 ===
    case ACTIONS.SET_ORDERED_RELICS:
      return { ...state, orderedRelics: action.payload };

    // === 전투 종료 ===
    case ACTIONS.SET_POST_COMBAT_OPTIONS:
      return { ...state, postCombatOptions: action.payload };

    // === 다음 턴 효과 ===
    case ACTIONS.SET_NEXT_TURN_EFFECTS:
      return { ...state, nextTurnEffects: action.payload };
    case ACTIONS.UPDATE_NEXT_TURN_EFFECTS:
      return {
        ...state,
        nextTurnEffects: {
          ...state.nextTurnEffects,
          ...action.payload
        }
      };

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

    // === 유물 UI ===
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
