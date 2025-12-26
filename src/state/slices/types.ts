/**
 * @file types.ts
 * @description 게임 스토어 슬라이스 공통 타입 정의
 */

import type { StateCreator } from 'zustand';
import type { Card, Relic, MapNode, Resources, ActiveEvent, ActiveDungeon } from '../../types';

// ==================== 상태 타입 정의 ====================

/** 플레이어 스탯 */
export interface PlayerStats {
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  handSize: number;
  strength?: number;
  agility?: number;
  insight?: number;
  etherOverdriveActive?: boolean;
  [key: string]: unknown;
}

/** 캐릭터 빌드 */
export interface CharacterBuild {
  mainSpecials: string[];
  subSpecials: string[];
  cards: Card[];
  traits: string[];
  egos: string[];
  ownedCards?: string[];
  [key: string]: unknown;
}

/** 맵 상태 */
export interface MapState {
  nodes: MapNode[];
  currentNodeId: string;
  baseLayer?: number;
}

/** 활성 전투 */
export interface ActiveBattle {
  enemy: unknown;
  enemyGroup?: unknown;
  nodeId?: string;
  rewards?: Record<string, unknown>;
  kind?: string;
  label?: string;
  simulation?: unknown;
  playerHand?: unknown[];
  enemyHand?: unknown[];
  selectedCardIds?: string[];
  maxSelection?: number;
  preview?: unknown;
  hasCharacterBuild?: boolean;
  characterBuild?: CharacterBuild | null;
  playerDrawPile?: unknown[];
  playerDiscardPile?: unknown[];
  enemyDrawPile?: unknown[];
  enemyDiscardPile?: unknown[];
  enemyInfo?: unknown;
  pendingItemEffects?: unknown[];
  [key: string]: unknown;
}

/** 아이템 */
export interface GameItem {
  id: string;
  name: string;
  description: string;
  usableIn: 'combat' | 'any';
  effect: {
    type: string;
    value?: number;
    stat?: string;
    [key: string]: unknown;
  };
}

/** 자아 */
export interface PlayerEgo {
  name: string;
  consumedTraits: string[];
  effects: Record<string, number>;
}

/** 마지막 전투 결과 */
export interface LastBattleResult {
  nodeId: string;
  kind: string;
  label: string;
  result: 'victory' | 'defeat';
  log: string[];
  finalState: unknown;
  initialState: unknown;
  rewards: Record<string, unknown>;
  enemyInfo?: unknown;
}

// ==================== 슬라이스 상태 타입 ====================

/** 플레이어 슬라이스 상태 */
export interface PlayerSliceState {
  player: PlayerStats;
  playerHp: number;
  maxHp: number;
  playerStrength: number;
  playerAgility: number;
  playerInsight: number;
  playerTraits: string[];
  playerEgos: PlayerEgo[];
  playerMaxSpeedBonus: number;
  playerEnergyBonus: number;
  extraSubSpecialSlots: number;
  resources: Resources;
  itemBuffs: Record<string, unknown>;
}

/** 플레이어 슬라이스 액션 */
export interface PlayerSliceActions {
  updatePlayerStrength: (strength: number) => void;
  updatePlayerAgility: (agility: number) => void;
  updatePlayerInsight: (insight: number) => void;
  addResources: (resources: Partial<Resources>) => void;
  applyEtherDelta: (delta: number) => void;
  applyDamage: (damage: number) => void;
  clearItemBuffs: () => void;
}

/** 맵 슬라이스 상태 */
export interface MapSliceState {
  map: MapState;
  mapRisk: number;
}

/** 맵 슬라이스 액션 */
export interface MapSliceActions {
  selectNode: (nodeId: string) => void;
  setMapRisk: (value: number) => void;
}

/** 던전 슬라이스 상태 */
export interface DungeonSliceState {
  activeDungeon: ActiveDungeon | null;
}

/** 던전 슬라이스 액션 */
export interface DungeonSliceActions {
  confirmDungeon: () => void;
  enterDungeon: () => void;
  skipDungeon: () => void;
  bypassDungeon: () => void;
  completeDungeon: () => void;
  revealDungeonInfo: () => void;
  setDungeonData: (dungeonData: unknown) => void;
  setDungeonPosition: (segmentIndex: number, playerX: number) => void;
  setCurrentRoomKey: (roomKey: string) => void;
  updateMazeRoom: (roomKey: string, updates: unknown) => void;
  setDungeonInitialResources: (initialResources: unknown) => void;
  setDungeonDeltas: (dungeonDeltas: unknown) => void;
  navigateDungeonNode: (targetNodeId: string) => void;
  clearDungeonNode: (nodeId: string) => void;
  applyDungeonTimePenalty: (etherDecay: number) => void;
}

/** 전투 슬라이스 상태 */
export interface BattleSliceState {
  activeBattle: ActiveBattle | null;
  lastBattleResult: LastBattleResult | null;
}

/** 전투 슬라이스 액션 */
export interface BattleSliceActions {
  startBattle: (config?: unknown) => void;
  resolveBattle: (outcome?: unknown) => void;
  clearBattleResult: () => void;
  toggleBattleCard: (cardId: string) => void;
  commitBattlePlan: () => void;
  clearPendingItemEffects: () => void;
}

/** 이벤트 슬라이스 상태 */
export interface EventSliceState {
  activeEvent: ActiveEvent | null;
  completedEvents: string[];
  pendingNextEvent: unknown | null;
}

/** 이벤트 슬라이스 액션 */
export interface EventSliceActions {
  chooseEvent: (choiceId: string) => void;
  invokePrayer: (cost: number) => void;
  closeEvent: () => void;
  setActiveEvent: (event: ActiveEvent | null) => void;
}

/** 빌드 슬라이스 상태 */
export interface BuildSliceState {
  characterBuild: CharacterBuild;
  cardUpgrades: Record<string, string>;
}

/** 빌드 슬라이스 액션 */
export interface BuildSliceActions {
  updateCharacterBuild: (mainSpecials?: string[], subSpecials?: string[]) => void;
  addOwnedCard: (cardId: string) => void;
  removeOwnedCard: (cardId: string) => void;
  clearOwnedCards: () => void;
  removeCardFromDeck: (cardId: string, isMainSpecial?: boolean) => void;
  upgradeCardRarity: (cardId: string) => void;
}

/** 상징 슬라이스 상태 */
export interface RelicSliceState {
  relics: Relic[];
  orderedRelics: Relic[];
}

/** 상징 슬라이스 액션 */
export interface RelicSliceActions {
  addRelic: (relicId: string) => void;
  removeRelic: (relicId: string) => void;
  setRelics: (relicIds: string[]) => void;
}

/** 아이템 슬라이스 상태 */
export interface ItemSliceState {
  items: (GameItem | null)[];
}

/** 아이템 슬라이스 액션 */
export interface ItemSliceActions {
  addItem: (itemId: string) => void;
  removeItem: (slotIndex: number) => void;
  useItem: (slotIndex: number, battleContext?: unknown) => void;
  devSetItems: (itemIds: (string | null)[]) => void;
}

/** 휴식 슬라이스 상태 */
export interface RestSliceState {
  activeRest: { nodeId: string } | null;
}

/** 휴식 슬라이스 액션 */
export interface RestSliceActions {
  closeRest: () => void;
  healAtRest: (healAmount?: number) => void;
  awakenAtRest: (choiceId?: string) => void;
  formEgo: (selectedTraits: string[]) => void;
}

/** 상점 슬라이스 상태 */
export interface ShopSliceState {
  activeShop: { nodeId?: string; merchantType: string } | null;
}

/** 상점 슬라이스 액션 */
export interface ShopSliceActions {
  openShop: (merchantType?: string) => void;
  closeShop: () => void;
}

/** 개발자 슬라이스 상태 */
export interface DevSliceState {
  devDulledLevel: number | null;
  devForcedCrossroad: string | null;
  devBattleTokens: Array<{ id: string; stacks: number; target: string; timestamp?: number }>;
}

/** 개발자 슬라이스 액션 */
export interface DevSliceActions {
  setDevDulledLevel: (level: number | null) => void;
  setDevForcedCrossroad: (templateId: string | null) => void;
  devClearAllNodes: () => void;
  devTeleportToNode: (nodeId: string) => void;
  devForceWin: () => void;
  devForceLose: () => void;
  devAddBattleToken: (tokenId: string, stacks?: number, target?: string) => void;
  devClearBattleTokens: () => void;
  devStartBattle: (groupId: string) => void;
  devOpenRest: () => void;
  devTriggerEvent: (eventId: string) => void;
  setResources: (newResources: Partial<Resources>) => void;
}

// ==================== 통합 타입 ====================

/** 게임 스토어 전체 상태 */
export type GameStoreState =
  & PlayerSliceState
  & MapSliceState
  & DungeonSliceState
  & BattleSliceState
  & EventSliceState
  & BuildSliceState
  & RelicSliceState
  & ItemSliceState
  & RestSliceState
  & ShopSliceState
  & DevSliceState;

/** 게임 스토어 전체 액션 */
export type GameStoreActions =
  & PlayerSliceActions
  & MapSliceActions
  & DungeonSliceActions
  & BattleSliceActions
  & EventSliceActions
  & BuildSliceActions
  & RelicSliceActions
  & ItemSliceActions
  & RestSliceActions
  & ShopSliceActions
  & DevSliceActions
  & { resetRun: () => void };

/** 게임 스토어 전체 타입 */
export type GameStore = GameStoreState & GameStoreActions;

/** 슬라이스 생성자 타입 */
export type SliceCreator<T> = StateCreator<GameStore, [], [], T>;
