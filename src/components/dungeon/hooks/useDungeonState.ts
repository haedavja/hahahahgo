/**
 * @file useDungeonState.ts
 * @description 던전 탐험 상태 관리 Hook
 */

import { useReducer, useMemo } from 'react';
import { dungeonReducer, createInitialState, ACTIONS } from '../reducer/dungeonReducer';
import type { DungeonObject } from '../../../types';

// ========== 타입 정의 ==========

/** 키보드 입력 상태 */
type KeysState = Record<string, boolean>;

/** 보상 모달 */
interface RewardModal {
  gold: number;
  loot: number;
  victory: boolean;
}

/** 던전 요약 */
interface DungeonSummary {
  gold: number;
  intel: number;
  loot: number;
  material: number;
  isComplete: boolean;
}

/** 기로 선택 결과 */
interface CrossroadOutcome {
  text: string;
  effect?: {
    damage?: number;
    reward?: {
      gold?: number | { min: number; max: number };
      loot?: number;
    };
    triggerCombat?: string;
  };
}

/** 기로 선택지 */
interface CrossroadChoice {
  id: string;
  text: string;
  repeatable?: boolean;
  maxAttempts?: number;
  requirements?: {
    strength?: number;
    agility?: number;
    insight?: number;
  };
  scalingRequirement?: {
    stat: 'strength' | 'agility' | 'insight';
    baseValue: number;
    increment: number;
  };
  successRate?: number;
  outcomes: {
    success: CrossroadOutcome;
    failure: CrossroadOutcome;
  };
  screenEffect?: string;
  warningAtAttempt?: number;
  warningText?: string;
  progressText?: string[];
  strainText?: string[];
}

/** 기로 템플릿 */
interface CrossroadTemplate {
  name: string;
  description: string;
  choices: CrossroadChoice[];
}

/** 기로 모달 */
interface CrossroadModal {
  template: CrossroadTemplate;
  obj: DungeonObject;
  choiceState: Record<string, { attempts: number }>;
}

/** 던전 상태 */
interface DungeonState {
  segmentIndex: number;
  playerX: number;
  cameraX: number;
  keys: KeysState;
  message: string;
  rewardModal: RewardModal | null;
  showCharacter: boolean;
  dungeonSummary: DungeonSummary | null;
  hoveredRelic: string | null;
  crossroadModal: CrossroadModal | null;
  screenShake: boolean;
}

/** 던전 액션 */
interface DungeonActions {
  setSegmentIndex: (index: number) => void;
  setPlayerX: (x: number) => void;
  setCameraX: (x: number) => void;
  setKeys: (keys: KeysState) => void;
  setMessage: (message: string) => void;
  setRewardModal: (modal: RewardModal | null) => void;
  setShowCharacter: (show: boolean) => void;
  setDungeonSummary: (summary: DungeonSummary | null) => void;
  setHoveredRelic: (relicId: string | null) => void;
  setCrossroadModal: (modal: CrossroadModal | null) => void;
  setScreenShake: (shake: boolean) => void;
  updateKeys: (keyUpdates: Partial<KeysState>) => void;
  resetDungeon: (overrides?: Partial<DungeonState>) => void;
  moveToNextSegment: () => void;
  dispatch: React.Dispatch<import('../reducer/dungeonReducer').DungeonAction>;
}

/**
 * useDungeonState Hook
 * 던전 탐험 상태 관리를 위한 커스텀 Hook
 */
export function useDungeonState(initialStateOverrides: Partial<DungeonState> = {}) {
  const [dungeon, dispatch] = useReducer(
    dungeonReducer,
    createInitialState(initialStateOverrides)
  );

  const actions = useMemo((): DungeonActions => ({
    // === 기본 설정 ===
    setSegmentIndex: (index: number) => dispatch({ type: ACTIONS.SET_SEGMENT_INDEX, payload: index }),
    setPlayerX: (x: number) => dispatch({ type: ACTIONS.SET_PLAYER_X, payload: x }),
    setCameraX: (x: number) => dispatch({ type: ACTIONS.SET_CAMERA_X, payload: x }),
    setKeys: (keys: KeysState) => dispatch({ type: ACTIONS.SET_KEYS, payload: keys }),
    setMessage: (message: string) => dispatch({ type: ACTIONS.SET_MESSAGE, payload: message }),
    setRewardModal: (modal: RewardModal | null) => dispatch({ type: ACTIONS.SET_REWARD_MODAL, payload: modal }),
    setShowCharacter: (show: boolean) => dispatch({ type: ACTIONS.SET_SHOW_CHARACTER, payload: show }),
    setDungeonSummary: (summary: DungeonSummary | null) => dispatch({ type: ACTIONS.SET_DUNGEON_SUMMARY, payload: summary }),
    setHoveredRelic: (relicId: string | null) => dispatch({ type: ACTIONS.SET_HOVERED_RELIC, payload: relicId }),
    setCrossroadModal: (modal: CrossroadModal | null) => dispatch({ type: ACTIONS.SET_CROSSROAD_MODAL, payload: modal }),
    setScreenShake: (shake: boolean) => dispatch({ type: ACTIONS.SET_SCREEN_SHAKE, payload: shake }),

    // === 복합 액션 ===
    updateKeys: (keyUpdates: Partial<KeysState>) => dispatch({ type: ACTIONS.UPDATE_KEYS, payload: keyUpdates }),
    resetDungeon: (overrides?: Partial<DungeonState>) => dispatch({ type: ACTIONS.RESET_DUNGEON, payload: overrides }),
    moveToNextSegment: () => dispatch({ type: ACTIONS.MOVE_TO_NEXT_SEGMENT }),

    // === Raw dispatch ===
    dispatch
  }), [dispatch]);

  return { dungeon, actions };
}

// 타입 export
export type {
  DungeonState,
  DungeonActions,
  KeysState,
  RewardModal,
  DungeonSummary,
  CrossroadModal,
  CrossroadChoice,
  CrossroadTemplate,
  CrossroadOutcome,
};
