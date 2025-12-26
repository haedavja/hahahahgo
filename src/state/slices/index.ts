/**
 * @file slices/index.ts
 * @description 게임 스토어 슬라이스 모듈 barrel 파일
 *
 * 모든 슬라이스를 재export하여 통합 import를 지원합니다.
 */

// 타입 정의
export * from './types';

// 슬라이스 생성자
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
