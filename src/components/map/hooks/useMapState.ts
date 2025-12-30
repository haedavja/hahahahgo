/**
 * @file useMapState.js
 * @description Map UI 상태 관리 Hook
 * @typedef {import('../../../types').Relic} Relic
 */

import { useReducer, useMemo } from 'react';
import { mapReducer, createInitialState, ACTIONS } from '../reducer/mapReducer';

/**
 * useMapState Hook
 * Map UI 상태 관리를 위한 커스텀 Hook
 *
 * @param {Object} [initialStateOverrides={}] - 초기 상태 오버라이드
 * @returns {{mapUI: Object, actions: Object}} 상태와 액션 객체
 */
export function useMapState(initialStateOverrides = {}) {
  const [mapUI, dispatch] = useReducer(
    mapReducer,
    createInitialState(initialStateOverrides)
  );

  const actions = useMemo(() => ({
    setShowCharacterSheet: (show: boolean) => dispatch({ type: ACTIONS.SET_SHOW_CHARACTER_SHEET, payload: show }),
    setIsDungeonExploring: (exploring: boolean) => dispatch({ type: ACTIONS.SET_IS_DUNGEON_EXPLORING, payload: exploring }),
    setDevToolsOpen: (open: boolean) => dispatch({ type: ACTIONS.SET_DEV_TOOLS_OPEN, payload: open }),
    setHoveredRelic: (relicId: string | null) => dispatch({ type: ACTIONS.SET_HOVERED_RELIC, payload: relicId }),
    setOrderedRelics: (relics: string[]) => dispatch({ type: ACTIONS.SET_ORDERED_RELICS, payload: relics }),
    setRelicActivated: (relicId: string | null | ((prev: string | null) => string | null)) => dispatch({ type: ACTIONS.SET_RELIC_ACTIVATED, payload: relicId }),

    // Raw dispatch (필요시 직접 액션 전달)
    dispatch
  }), [dispatch]);

  return { mapUI, actions };
}
