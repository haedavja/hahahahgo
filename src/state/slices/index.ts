/**
 * @file slices/index.ts
 * @description 게임 스토어 슬라이스 모듈 barrel 파일
 *
 * 모든 슬라이스를 재export하여 통합 import를 지원합니다.
 *
 * ## 아키텍처
 * 각 슬라이스는 액션만 제공하며, 초기 상태는 gameStore.ts의 createInitialState()에서 관리됩니다.
 * 슬라이스 조합: createStore((...a) => ({ ...createInitialState(), ...createPlayerActions(...a), ... }))
 */

// 타입 정의
export * from './types';

// 액션 슬라이스 생성자 (권장)
export { createPlayerActions, type PlayerActionsSlice } from './playerSlice';
export { createMapActions, type MapActionsSlice } from './mapSlice';
export { createDungeonActions, type DungeonActionsSlice } from './dungeonSlice';
export { createBattleActions, type BattleActionsSlice } from './battleSlice';
export { createEventActions, type EventActionsSlice } from './eventSlice';
export { createBuildActions, type BuildActionsSlice } from './buildSlice';
export { createRelicActions, type RelicActionsSlice } from './relicSlice';
export { createItemActions, type ItemActionsSlice } from './itemSlice';
export { createRestActions, type RestActionsSlice } from './restSlice';
export { createShopActions, type ShopActionsSlice } from './shopSlice';
export { createDevActions, type DevActionsSlice } from './devSlice';

// 하위 호환성 (deprecated - 액션 생성자 사용 권장)
export { createPlayerSlice, type PlayerSlice } from './playerSlice';
export { createMapSlice, type MapSlice } from './mapSlice';
export { createDungeonSlice, type DungeonSlice } from './dungeonSlice';
export { createBattleSlice, type BattleSlice } from './battleSlice';
export { createEventSlice, type EventSlice } from './eventSlice';
export { createBuildSlice, type BuildSlice } from './buildSlice';
export { createRelicSlice, type RelicSlice } from './relicSlice';
export { createItemSlice, type ItemSlice } from './itemSlice';
export { createRestSlice, type RestSlice } from './restSlice';
export { createShopSlice, type ShopSlice } from './shopSlice';
export { createDevSlice, type DevSlice } from './devSlice';
