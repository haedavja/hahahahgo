/**
 * @file mapReducer.js
 * @description MapDemo 컴포넌트의 상태 관리 Reducer
 * @typedef {import('../../../types').Relic} Relic
 *
 * ## 관리 상태
 * - showCharacterSheet: 캐릭터 시트 표시
 * - isDungeonExploring: 던전 탐험 중
 * - devToolsOpen: 개발자 도구 열림
 * - hoveredRelic/orderedRelics: 상징 관련
 */

export const ACTIONS = {
  SET_SHOW_CHARACTER_SHEET: 'SET_SHOW_CHARACTER_SHEET',
  SET_IS_DUNGEON_EXPLORING: 'SET_IS_DUNGEON_EXPLORING',
  SET_DEV_TOOLS_OPEN: 'SET_DEV_TOOLS_OPEN',
  SET_HOVERED_RELIC: 'SET_HOVERED_RELIC',
  SET_ORDERED_RELICS: 'SET_ORDERED_RELICS',
  SET_RELIC_ACTIVATED: 'SET_RELIC_ACTIVATED',
};

/**
 * 초기 상태 생성 함수
 * @param {Object} overrides - 초기 상태 오버라이드
 * @returns {Object} 초기 상태
 */
export const createInitialState = (overrides = {}) => ({
  showCharacterSheet: false,
  isDungeonExploring: false,
  devToolsOpen: false,
  hoveredRelic: null,
  orderedRelics: [],
  relicActivated: null,
  ...overrides
});

/**
 * Map 상태 reducer
 * @param {Object} state - 현재 상태
 * @param {Object} action - 액션 객체
 * @returns {Object} 새로운 상태
 */
export const mapReducer = (state: any, action: any) => {
  switch (action.type) {
    case ACTIONS.SET_SHOW_CHARACTER_SHEET:
      return { ...state, showCharacterSheet: action.payload };

    case ACTIONS.SET_IS_DUNGEON_EXPLORING:
      return { ...state, isDungeonExploring: action.payload };

    case ACTIONS.SET_DEV_TOOLS_OPEN:
      return { ...state, devToolsOpen: action.payload };

    case ACTIONS.SET_HOVERED_RELIC:
      return { ...state, hoveredRelic: action.payload };

    case ACTIONS.SET_ORDERED_RELICS:
      // 함수형 업데이트 지원: payload가 함수면 현재 상태를 전달하여 호출
      return {
        ...state,
        orderedRelics: typeof action.payload === 'function'
          ? action.payload(state.orderedRelics)
          : action.payload
      };

    case ACTIONS.SET_RELIC_ACTIVATED:
      return { ...state, relicActivated: action.payload };

    default:
      return state;
  }
};
