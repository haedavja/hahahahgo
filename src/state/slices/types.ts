/**
 * @file types.ts
 * @description 게임 스토어 슬라이스 공통 타입 정의
 */

import type { StateCreator } from 'zustand';
import type { Card, MapNode, Resources, ActiveEvent, ActiveDungeon, SimulationResult, TimelineEntry, DungeonData, DungeonNodeEvent } from '../../types';

// ==================== 전투 관련 타입 ====================

/** 전투 카드 (인스턴스 ID 포함) */
export interface BattleCard extends Card {
  instanceId?: string;
}

/** 적 정보 */
export interface EnemyInfo {
  id: string;
  name: string;
  emoji?: string;
  hp?: number;
  maxHp?: number;
  ether?: number;
  speed?: number;
  maxSpeed?: number;
  deck?: string[];
  cardsPerTurn?: number;
  passives?: Record<string, any>;
  tier?: number;
  isBoss?: boolean;
}

/** 전투 프리뷰 */
export interface BattlePreview {
  playerHand: BattleCard[];
  enemyHand: BattleCard[];
  timeline: TimelineEntry[];
  tuLimit: number;
}

/** 아이템 효과 */
export interface ItemEffect {
  type: string;
  value?: number;
  stat?: string;
}

/** 전투 보상 정의 */
export interface BattleRewards {
  gold?: number | { min: number; max: number };
  loot?: number | { min: number; max: number };
  intel?: number;
  material?: number;
  card?: number;
}

/** 전투 상태 스냅샷 */
export interface BattleStateSnapshot {
  player?: {
    hp: number;
    maxHp?: number;
    block?: number;
  };
  enemy?: {
    hp: number;
    maxHp?: number;
  };
}

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
}

/** 캐릭터 빌드 */
export interface CharacterBuild {
  mainSpecials: string[];
  subSpecials: string[];
  cards: Card[];
  traits: string[];
  egos: string[];
  ownedCards?: string[];
}

/** 맵 상태 */
export interface MapState {
  nodes: MapNode[];
  currentNodeId: string;
  baseLayer?: number;
}

/** 활성 전투 - BattlePayload와 호환 */
export interface ActiveBattle {
  nodeId?: string;
  kind?: string;
  label?: string;
  difficulty?: number;
  rewards?: BattleRewards;
  simulation?: SimulationResult;
  preview?: BattlePreview;
  playerHand?: BattleCard[];
  enemyHand?: BattleCard[];
  selectedCardIds?: string[];
  maxSelection?: number;
  hasCharacterBuild?: boolean;
  characterBuild?: CharacterBuild | null;
  playerLibrary?: BattleCard[];
  playerDrawPile?: BattleCard[];
  playerDiscardPile?: BattleCard[];
  enemyLibrary?: BattleCard[];
  enemyDrawPile?: BattleCard[];
  enemyDiscardPile?: BattleCard[];
  enemyInfo?: EnemyInfo;
  pendingItemEffects?: ItemEffect[];
  [key: string]: unknown;
}

/** 아이템 */
export interface GameItem {
  id: string;
  name: string;
  description: string;
  usableIn: 'combat' | 'any';
  effect: ItemEffect;
  icon?: string;
  tier?: number;
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
  finalState: BattleStateSnapshot | null;
  initialState: BattleStateSnapshot | null;
  rewards: Record<string, number>;
  enemyInfo?: EnemyInfo;
}

// ==================== 슬라이스 상태 타입 ====================

/** 플레이어 슬라이스 상태 */
export interface PlayerSliceState {
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
  itemBuffs: Record<string, number>;
  metaBonuses?: { hp: number; gold: number };
}

/** 플레이어 슬라이스 액션 */
export interface PlayerSliceActions {
  updatePlayerStrength: (strength: number) => void;
  updatePlayerAgility: (agility: number) => void;
  updatePlayerInsight: (insight: number) => void;
  addResources: (resources: Partial<Resources>) => void;
  applyEtherDelta: (delta: number) => void;
  applyDamage: (damage: number) => void;
  setPlayerHp: (hp: number) => void;
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

// DungeonData와 DungeonNodeEvent는 ../../types/game.ts에서 정의됨
export type { DungeonData, DungeonNodeEvent };

/** 던전 자원 델타 */
export interface DungeonDeltas {
  gold?: number;
  intel?: number;
  material?: number;
  loot?: number;
  etherPts?: number;
}

/** 던전 슬라이스 액션 */
export interface DungeonSliceActions {
  confirmDungeon: () => void;
  enterDungeon: () => void;
  skipDungeon: () => void;
  bypassDungeon: () => void;
  completeDungeon: () => void;
  revealDungeonInfo: () => void;
  setDungeonData: (dungeonData: DungeonData | null) => void;
  setDungeonPosition: (segmentIndex: number, playerX: number) => void;
  setCurrentRoomKey: (roomKey: string) => void;
  updateMazeRoom: (roomKey: string, updates: Partial<{ visited: boolean; cleared: boolean }>) => void;
  setDungeonInitialResources: (initialResources: Partial<Resources>) => void;
  setDungeonDeltas: (dungeonDeltas: DungeonDeltas) => void;
  navigateDungeonNode: (targetNodeId: string) => void;
  clearDungeonNode: (nodeId: string) => void;
  applyDungeonTimePenalty: (etherDecay: number) => void;
}

/** 전투 설정 */
export interface BattleConfig {
  nodeId?: string;
  kind?: string;
  label?: string;
  enemyId?: string;
  enemyHp?: number;
  tier?: number;
  rewards?: BattleRewards;
}

/** 전투 결과 */
export interface BattleOutcome {
  result?: 'victory' | 'defeat';
  playerHp?: number;
  playerMaxHp?: number;
  damageDealt?: number;
}

/** 전투 슬라이스 상태 */
export interface BattleSliceState {
  activeBattle: ActiveBattle | null;
  lastBattleResult: LastBattleResult | null;
}

/** 전투 슬라이스 액션 */
export interface BattleSliceActions {
  startBattle: (config?: BattleConfig) => void;
  resolveBattle: (outcome?: BattleOutcome) => void;
  clearBattleResult: () => void;
  toggleBattleCard: (cardId: string) => void;
  commitBattlePlan: () => void;
  clearPendingItemEffects: () => void;
}

/** 이벤트 슬라이스 상태 */
export interface EventSliceState {
  activeEvent: ActiveEvent | null;
  completedEvents: string[];
  pendingNextEvent: string | null;
}

/** 이벤트 슬라이스 액션 */
export interface EventSliceActions {
  chooseEvent: (choiceId: string) => void;
  invokePrayer: (cost: number) => void;
  closeEvent: () => void;
  setActiveEvent: (event: ActiveEvent | null) => void;
}

/** 카드 성장 상태 */
export interface CardGrowthState {
  rarity: 'common' | 'rare' | 'special' | 'legendary';
  growthCount: number;        // 강화 + 특화 총 횟수 (승격 판정용)
  enhancementLevel: number;   // 강화 횟수 (1~5, 스탯 강화 적용용)
  specializationCount: number; // 특화 횟수
  traits: string[];           // 특화로 부여된 특성들
}

/** 빌드 슬라이스 상태 */
export interface BuildSliceState {
  characterBuild: CharacterBuild;
  cardUpgrades: Record<string, string>;  // 레거시 호환용
  cardGrowth: Record<string, CardGrowthState>;  // 새로운 성장 시스템
  storedTraits: string[];  // 전투 보상으로 획득한 특성 (특화에 사용 가능)
}

/** 빌드 슬라이스 액션 */
export interface BuildSliceActions {
  updateCharacterBuild: (mainSpecials?: string[], subSpecials?: string[]) => void;
  addOwnedCard: (cardId: string) => void;
  removeOwnedCard: (cardId: string) => void;
  clearOwnedCards: () => void;
  removeCardFromDeck: (cardId: string, isMainSpecial?: boolean) => void;
  upgradeCardRarity: (cardId: string) => void;  // 레거시
  // 새로운 승격 시스템
  enhanceCard: (cardId: string) => void;  // 강화: 스탯 향상
  specializeCard: (cardId: string, selectedTraits: string[]) => void;  // 특화: 특성 부여
  getCardGrowth: (cardId: string) => CardGrowthState;  // 카드 성장 상태 조회
  // 특성 저장 시스템
  addStoredTrait: (traitId: string) => void;  // 특성 획득
  removeStoredTrait: (traitId: string) => void;  // 특성 제거
  useStoredTrait: (traitId: string) => void;  // 특화에 사용 (제거됨)
}

/** 상징 슬라이스 상태 */
export interface RelicSliceState {
  relics: string[];
  orderedRelics: string[];
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
  useItem: (slotIndex: number, battleContext?: ActiveBattle | null) => void;
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
}

/** 성장 슬라이스 상태 */
export interface GrowthSliceState {
  growth: {
    pyramidLevel: number;
    skillPoints: number;
    traitCounts: Record<string, number>;
    unlockedEthos: string[];
    unlockedPathos: string[];
    unlockedNodes: string[];
    pendingNodeSelection: {
      nodeId: string;
      type: 'ethos' | 'pathos';
    } | null;
    identities: ('gunslinger' | 'swordsman')[];
    logosLevels: {
      common: number;
      gunkata: number;
      battleWaltz: number;
    };
    equippedPathos: string[];
  } | null;
}

/** 성장 슬라이스 액션 */
export interface GrowthSliceActions {
  updatePyramidLevel: () => void;
  addSkillPoints: (amount: number) => void;
  selectBaseEthos: (ethosId: string) => void;
  selectBasePathos: (pathosId: string) => void;
  unlockNode: (nodeId: string, type: 'ethos' | 'pathos') => void;
  selectNodeChoice: (choiceId: string) => void;
  selectEthos: (ethosId: string) => void;
  selectPathos: (pathosId: string) => void;
  selectIdentity: (identity: 'gunslinger' | 'swordsman') => void;
  equipPathos: (pathosIds: string[]) => void;
  usePathos: (pathosId: string) => void;
  resetGrowth: () => void;
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
  devForcedAnomalies: Array<{ anomalyId: string; level: number }> | null;
}

/** 개발자 슬라이스 액션 */
export interface DevSliceActions {
  setDevDulledLevel: (level: number | null) => void;
  setDevForcedCrossroad: (templateId: string | null) => void;
  setDevForcedAnomalies: (anomalies: Array<{ anomalyId: string; level: number }> | null) => void;
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
  & DevSliceState
  & GrowthSliceState;

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
  & GrowthSliceActions
  & { resetRun: () => void };

/** 게임 스토어 전체 타입 */
export type GameStore = GameStoreState & GameStoreActions & { [key: string]: unknown };

/** 슬라이스 생성자 타입 */
export type SliceCreator<T> = StateCreator<GameStore, [], [], T>;
