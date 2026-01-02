/**
 * @file dungeonReducer.ts
 * @description 던전 탐험 상태 관리 Reducer
 * @typedef {import('../../../types').DungeonObject} DungeonObject
 *
 * DungeonExploration의 9개 useState를 단일 reducer로 통합
 *
 * ## 상태 구조
 * - segmentIndex: 현재 세그먼트 인덱스
 * - playerX: 플레이어 X 좌표
 * - cameraX: 카메라 X 좌표
 * - message: 화면 메시지
 * - rewardModal/crossroadModal: 모달 상태
 */

// Forward declaration of types (defined in useDungeonState.ts)
import type {
  DungeonState,
  KeysState,
  RewardModal,
  DungeonSummary,
  CrossroadModal
} from '../hooks/useDungeonState';

// ========== 액션 타입 정의 ==========

export type DungeonAction =
  | { type: 'SET_SEGMENT_INDEX'; payload: number }
  | { type: 'SET_PLAYER_X'; payload: number }
  | { type: 'SET_CAMERA_X'; payload: number }
  | { type: 'SET_KEYS'; payload: KeysState }
  | { type: 'SET_MESSAGE'; payload: string }
  | { type: 'SET_REWARD_MODAL'; payload: RewardModal | null }
  | { type: 'SET_SHOW_CHARACTER'; payload: boolean }
  | { type: 'SET_DUNGEON_SUMMARY'; payload: DungeonSummary | null }
  | { type: 'SET_HOVERED_RELIC'; payload: string | null }
  | { type: 'SET_CROSSROAD_MODAL'; payload: CrossroadModal | null }
  | { type: 'SET_SCREEN_SHAKE'; payload: boolean }
  | { type: 'UPDATE_KEYS'; payload: Partial<KeysState> }
  | { type: 'RESET_DUNGEON'; payload?: Partial<DungeonState> }
  | { type: 'MOVE_TO_NEXT_SEGMENT' };

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
} as const;

export const createInitialState = (overrides: Partial<DungeonState> = {}): DungeonState => ({
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

export const dungeonReducer = (state: DungeonState, action: DungeonAction): DungeonState => {
  switch (action.type) {
    // === 기본 설정 ===
    case 'SET_SEGMENT_INDEX':
      return { ...state, segmentIndex: action.payload };

    case 'SET_PLAYER_X':
      return { ...state, playerX: action.payload };

    case 'SET_CAMERA_X':
      return { ...state, cameraX: action.payload };

    case 'SET_KEYS':
      return { ...state, keys: action.payload };

    case 'SET_MESSAGE':
      return { ...state, message: action.payload };

    case 'SET_REWARD_MODAL':
      return { ...state, rewardModal: action.payload };

    case 'SET_SHOW_CHARACTER':
      return { ...state, showCharacter: action.payload };

    case 'SET_DUNGEON_SUMMARY':
      return { ...state, dungeonSummary: action.payload };

    case 'SET_HOVERED_RELIC':
      return { ...state, hoveredRelic: action.payload };

    case 'SET_CROSSROAD_MODAL':
      return { ...state, crossroadModal: action.payload };

    case 'SET_SCREEN_SHAKE':
      return { ...state, screenShake: action.payload };

    // === 복합 액션 ===
    case 'UPDATE_KEYS':
      return {
        ...state,
        keys: { ...state.keys, ...action.payload } as KeysState
      };

    case 'RESET_DUNGEON':
      return createInitialState(action.payload);

    case 'MOVE_TO_NEXT_SEGMENT':
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
