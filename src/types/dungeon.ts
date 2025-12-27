/**
 * @file dungeon.ts
 * @description 던전 렌더링 시스템 타입 정의
 *
 * 참고: game.ts에 DungeonRoom, DungeonObject가 이미 정의되어 있음.
 * 이 파일은 Canvas 렌더링에 특화된 타입을 정의함.
 */

// ========== 기본 타입 ==========

/** 방 유형 */
export type RoomType = 'entrance' | 'exit' | 'hidden' | 'normal';

/** 방향 */
export type Direction = 'north' | 'south' | 'west' | 'east';

// ========== 렌더링용 던전 구조 ==========

/** 출구 정보 */
export interface DungeonExit {
  type: 'normal' | 'hidden';
  targetKey: string;
}

/** 렌더링용 던전 방 (game.ts의 DungeonRoom과 구분) */
export interface RenderDungeonRoom {
  x: number;
  y: number;
  roomType: RoomType;
  isDeadEnd: boolean;
  visited: boolean;
  discovered: boolean;
  exits: Partial<Record<Direction, DungeonExit | null>>;
}

/** 렌더링용 던전 그리드 */
export type RenderDungeonGrid = Record<string, RenderDungeonRoom>;

/** 렌더링용 던전 오브젝트 */
export interface RenderDungeonObject {
  x: number;
  typeId: string;
  used: boolean;
  unlocked?: boolean;
  discovered?: boolean;
  isSpecial?: boolean;
}

/** 렌더링용 던전 세그먼트 (현재 방 정보) */
export interface RenderDungeonSegment {
  roomType: RoomType;
  isDeadEnd: boolean;
  exits: Partial<Record<Direction, DungeonExit | null>>;
  objects: RenderDungeonObject[];
}

/** 렌더링용 미로 데이터 */
export interface RenderMazeData {
  gridSize: number;
}

// ========== 렌더링 관련 ==========

/** 문 위치 정보 */
export interface DoorPosition {
  x: number;
  y: number;
  label: string;
}

/** 문 위치 맵 */
export type DoorPositions = Record<Direction, DoorPosition>;

/** 플레이어 자원 */
export interface DungeonResources {
  etherPts: number;
  gold?: number;
}

/** renderDungeonScene 파라미터 */
export interface RenderDungeonSceneParams {
  ctx: CanvasRenderingContext2D;
  segment: RenderDungeonSegment;
  grid: RenderDungeonGrid;
  currentRoomKey: string;
  mazeData: RenderMazeData | null;
  playerX: number;
  playerY: number;
  cameraX: number;
  resources: DungeonResources;
  playerHp: number;
  maxHp: number;
}

// ========== 색상 맵 ==========

/** 배경 색상 맵 */
export type RoomColorMap = Record<RoomType, string>;

/** 방향별 화살표 */
export type DirectionArrows = Record<Direction, string>;
