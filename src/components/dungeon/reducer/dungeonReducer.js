/**
 * Dungeon Reducer
 *
 * DungeonExploration의 9개 useState를 단일 reducer로 통합
 */

export const ACTIONS = {
  SET_SEGMENT_INDEX: 'SET_SEGMENT_INDEX',
  SET_PLAYER_X: 'SET_PLAYER_X',
  SET_CAMERA_X: 'SET_CAMERA_X',
  SET_KEYS: 'SET_KEYS',
  SET_MESSAGE: 'SET_MESSAGE',
  SET_REWARD_MODAL: 'SET_REWARD_MODAL',
  SET_SHOW_CHARACTER: 'SET_SHOW_CHARACTER',
  SET_DUNGEON_SUMMARY: 'SET_DUNGEON_SUMMARY',
  SET_HOVERED_RELIC: 'SET_HOVERED_RELIC',
  SET_CROSSROAD_MODAL: 'SET_CROSSROAD_MODAL',
  SET_SCREEN_SHAKE: 'SET_SCREEN_SHAKE',

  // 복합 액션
  UPDATE_KEYS: 'UPDATE_KEYS',
  RESET_DUNGEON: 'RESET_DUNGEON',
  MOVE_TO_NEXT_SEGMENT: 'MOVE_TO_NEXT_SEGMENT',
};

export const createInitialState = (overrides = {}) => ({
  segmentIndex: 0,
  playerX: 100,
  cameraX: 0,
  keys: {},
  message: "",
  rewardModal: null,
  showCharacter: false,
  dungeonSummary: null,
  hoveredRelic: null,
  crossroadModal: null,  // 기로 선택지 모달
  screenShake: false,    // 화면 흔들림 효과
  ...overrides
});

export const dungeonReducer = (state, action) => {
  switch (action.type) {
    // === 기본 설정 ===
    case ACTIONS.SET_SEGMENT_INDEX:
      return { ...state, segmentIndex: action.payload };

    case ACTIONS.SET_PLAYER_X:
      return { ...state, playerX: action.payload };

    case ACTIONS.SET_CAMERA_X:
      return { ...state, cameraX: action.payload };

    case ACTIONS.SET_KEYS:
      return { ...state, keys: action.payload };

    case ACTIONS.SET_MESSAGE:
      return { ...state, message: action.payload };

    case ACTIONS.SET_REWARD_MODAL:
      return { ...state, rewardModal: action.payload };

    case ACTIONS.SET_SHOW_CHARACTER:
      return { ...state, showCharacter: action.payload };

    case ACTIONS.SET_DUNGEON_SUMMARY:
      return { ...state, dungeonSummary: action.payload };

    case ACTIONS.SET_HOVERED_RELIC:
      return { ...state, hoveredRelic: action.payload };

    case ACTIONS.SET_CROSSROAD_MODAL:
      return { ...state, crossroadModal: action.payload };

    case ACTIONS.SET_SCREEN_SHAKE:
      return { ...state, screenShake: action.payload };

    // === 복합 액션 ===
    case ACTIONS.UPDATE_KEYS:
      return {
        ...state,
        keys: { ...state.keys, ...action.payload }
      };

    case ACTIONS.RESET_DUNGEON:
      return createInitialState(action.payload);

    case ACTIONS.MOVE_TO_NEXT_SEGMENT:
      return {
        ...state,
        segmentIndex: state.segmentIndex + 1,
        playerX: 100,
        cameraX: 0,
      };

    default:
      return state;
  }
};
