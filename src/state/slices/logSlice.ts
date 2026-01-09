/**
 * @file logSlice.ts
 * @description 맵 활동 로그 슬라이스
 *
 * 전투 결과, 이벤트 선택, 상점 거래 등을 기록합니다.
 */

import type { StateCreator } from 'zustand';
import type { GameStore, LogSliceActions, MapLogType } from './types';

const MAX_LOG_ENTRIES = 50;

export type LogActionsSlice = LogSliceActions;

type SliceCreator = StateCreator<GameStore, [], [], LogActionsSlice>;

let logIdCounter = 0;

export const createLogActions: SliceCreator = (set) => ({
  addMapLog: (type: MapLogType, message: string, details?: string, icon?: string) =>
    set((state) => {
      const newEntry = {
        id: `log_${Date.now()}_${logIdCounter++}`,
        timestamp: Date.now(),
        type,
        message,
        details,
        icon,
      };

      const newLogs = [newEntry, ...state.mapLogs].slice(0, MAX_LOG_ENTRIES);

      return { mapLogs: newLogs };
    }),

  clearMapLogs: () => set({ mapLogs: [] }),
});

/** 로그 슬라이스 초기 상태 */
export const logInitialState = {
  mapLogs: [] as GameStore['mapLogs'],
};
