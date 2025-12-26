/**
 * @file gameStore.ts
 * @description 메인 게임 상태 저장소 (Zustand)
 *
 * ## 아키텍처
 * 슬라이스 패턴을 사용하여 관심사별로 액션을 분리합니다.
 * - 초기 상태: createInitialState()에서 제공
 * - 액션: 각 슬라이스에서 제공 (./slices/)
 *
 * ## 슬라이스 모듈 (./slices/)
 * - playerSlice: 플레이어 HP, 스탯, 자원
 * - mapSlice: 맵 네비게이션, 위험도
 * - dungeonSlice: 던전 탐험 시스템
 * - battleSlice: 전투 시작/종료/카드 선택
 * - eventSlice: 이벤트 선택지 처리
 * - buildSlice: 캐릭터 빌드, 카드 관리
 * - relicSlice: 상징 추가/제거
 * - itemSlice: 아이템 사용/관리
 * - restSlice: 휴식, 각성, 자아 형성
 * - shopSlice: 상점 열기/닫기
 * - devSlice: 개발자 도구
 *
 * @see ./slices/types.ts - 공유 타입 정의
 * @see ./slices/index.ts - 슬라이스 barrel export
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { createInitialState } from "./useGameState";
import { applyInitialRelicEffects } from "./gameStoreHelpers";

// 슬라이스 액션 생성자 import
import { createPlayerActions } from "./slices/playerSlice";
import { createMapActions } from "./slices/mapSlice";
import { createDungeonActions } from "./slices/dungeonSlice";
import { createBattleActions } from "./slices/battleSlice";
import { createEventActions } from "./slices/eventSlice";
import { createBuildActions } from "./slices/buildSlice";
import { createRelicActions } from "./slices/relicSlice";
import { createItemActions } from "./slices/itemSlice";
import { createRestActions } from "./slices/restSlice";
import { createShopActions } from "./slices/shopSlice";
import { createDevActions } from "./slices/devSlice";

// ==================== 타입 재export (하위 호환성) ====================

export type {
  PlayerStats,
  CharacterBuild,
  MapState,
  ActiveBattle,
  GameItem,
  PlayerEgo,
  LastBattleResult,
  GameStoreState,
  GameStoreActions,
  GameStore,
} from "./slices/types";

export type { ActiveEvent, ActiveDungeon } from "../types";

// 슬라이스 타입 import (내부 사용)
import type { GameStore } from "./slices/types";

// ==================== 스토어 생성 ====================

export const useGameStore = create<GameStore>()(subscribeWithSelector((set, get, store) => {
  // 초기 상태 (상징 효과 적용)
  const initialState = applyInitialRelicEffects(createInitialState());
  const args = [set, get, store] as const;

  // 슬라이스 액션 조합
  const playerActions = createPlayerActions(...args);
  const mapActions = createMapActions(...args);
  const dungeonActions = createDungeonActions(...args);
  const battleActions = createBattleActions(...args);
  const eventActions = createEventActions(...args);
  const buildActions = createBuildActions(...args);
  const relicActions = createRelicActions(...args);
  const itemActions = createItemActions(...args);
  const restActions = createRestActions(...args);
  const shopActions = createShopActions(...args);
  const devActions = createDevActions(...args);

  return {
    // 초기 상태
    ...initialState,

    // 개발자 모드 상태 (초기값)
    devDulledLevel: null as number | null,
    devForcedCrossroad: null as string | null,
    devBattleTokens: [] as Array<{ id: string; stacks: number; target: string; timestamp?: number }>,
    devForcedAnomalies: null as Array<{ anomalyId: string; level: number }> | null,

    // 슬라이스 액션
    ...playerActions,
    ...mapActions,
    ...dungeonActions,
    ...battleActions,
    ...eventActions,
    ...buildActions,
    ...relicActions,
    ...itemActions,
    ...restActions,
    ...shopActions,
    ...devActions,

    // 코어 액션 (슬라이스에 포함되지 않은 액션)
    resetRun: () => set(() => applyInitialRelicEffects(createInitialState()) as unknown as GameStore),
  } as unknown as GameStore;
}));

// ==================== 셀렉터 ====================

export const selectors = {
  nodes: (state: GameStore) => state.map.nodes,
  resources: (state: GameStore) => state.resources,
  mapRisk: (state: GameStore) => state.mapRisk,
  map: (state: GameStore) => state.map,
  activeEvent: (state: GameStore) => state.activeEvent,
  activeDungeon: (state: GameStore) => state.activeDungeon,
  activeBattle: (state: GameStore) => state.activeBattle,
  lastBattleResult: (state: GameStore) => state.lastBattleResult,
  characterBuild: (state: GameStore) => state.characterBuild,
};
