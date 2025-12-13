import { useReducer, useMemo } from 'react';
import { dungeonReducer, createInitialState, ACTIONS } from '../reducer/dungeonReducer';

/**
 * useDungeonState Hook
 *
 * 던전 탐험 상태 관리를 위한 커스텀 Hook
 */
export function useDungeonState(initialStateOverrides = {}) {
  const [dungeon, dispatch] = useReducer(
    dungeonReducer,
    createInitialState(initialStateOverrides)
  );

  const actions = useMemo(() => ({
    // === 기본 설정 ===
    setSegmentIndex: (index) => dispatch({ type: ACTIONS.SET_SEGMENT_INDEX, payload: index }),
    setPlayerX: (x) => dispatch({ type: ACTIONS.SET_PLAYER_X, payload: x }),
    setCameraX: (x) => dispatch({ type: ACTIONS.SET_CAMERA_X, payload: x }),
    setKeys: (keys) => dispatch({ type: ACTIONS.SET_KEYS, payload: keys }),
    setMessage: (message) => dispatch({ type: ACTIONS.SET_MESSAGE, payload: message }),
    setRewardModal: (modal) => dispatch({ type: ACTIONS.SET_REWARD_MODAL, payload: modal }),
    setShowCharacter: (show) => dispatch({ type: ACTIONS.SET_SHOW_CHARACTER, payload: show }),
    setDungeonSummary: (summary) => dispatch({ type: ACTIONS.SET_DUNGEON_SUMMARY, payload: summary }),
    setHoveredRelic: (relicId) => dispatch({ type: ACTIONS.SET_HOVERED_RELIC, payload: relicId }),
    setCrossroadModal: (modal) => dispatch({ type: ACTIONS.SET_CROSSROAD_MODAL, payload: modal }),
    setScreenShake: (shake) => dispatch({ type: ACTIONS.SET_SCREEN_SHAKE, payload: shake }),

    // === 복합 액션 ===
    updateKeys: (keyUpdates) => dispatch({ type: ACTIONS.UPDATE_KEYS, payload: keyUpdates }),
    resetDungeon: (overrides) => dispatch({ type: ACTIONS.RESET_DUNGEON, payload: overrides }),
    moveToNextSegment: () => dispatch({ type: ACTIONS.MOVE_TO_NEXT_SEGMENT }),

    // === Raw dispatch ===
    dispatch
  }), [dispatch]);

  return { dungeon, actions };
}
