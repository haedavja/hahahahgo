/**
 * UI 컴포넌트 타입 정의
 *
 * React 컴포넌트의 Props 및 UI 관련 타입
 */

import type React from 'react';
import type {
  Card,
  TokenState,
  TokenInstance,
  TokenDefinition,
  TokenEffectPayload,
  TokenDisplayData
} from './core';
import type { BattlePassives, BattleEnemyUnit } from './battle';
import type { EnemyUnit, PlayerBattleState } from './combat';
import type { DeflationResult, OrderItem, ComboCalculation } from './systems';

// ==================== 기본 UI Props ====================

/** 아이콘 Props */
export interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

/** 에테르 바 Props */
export interface EtherBarProps {
  currentPts: number;
  maxSlots?: number;
  showSlotInfo?: boolean;
}

/** 체력 바 Props */
export interface HpBarProps {
  current: number;
  max: number;
  showText?: boolean;
  color?: string;
}

// ==================== 토큰 UI 타입 ====================

/** UI용 토큰 상태 */
export interface UITokenState {
  usage: unknown[];
  turn: unknown[];
  permanent: unknown[];
}

/** 토큰 데이터 (UI용) */
export interface TokenData {
  id: string;
  name: string;
  emoji: string;
  description: string;
  stacks: number;
  durationType: 'usage' | 'turn' | 'permanent';
  category: 'positive' | 'negative' | 'neutral';
}

/** UI용 토큰 엔티티 */
export interface UITokenEntity {
  tokens?: UITokenState;
  [key: string]: unknown;
}

/**
 * 토큰 인스턴스 (표시용, 효과 포함) - TokenDisplayData와 동일
 * @deprecated TokenDisplayData를 직접 사용하세요.
 */
export type TokenInstanceWithEffect = TokenDisplayData;

/** 토큰 소모 결과 */
export interface TokenConsumeResult {
  tokens: TokenState;
  logs: string[];
}

// ==================== 타임라인 UI 타입 ====================

/** 타임라인 카드 */
export interface TimelineCard {
  id?: string;
  name?: string;
  type: string;
  damage?: number;
  block?: number;
  hits?: number;
  speedCost?: number;
  ignoreStrength?: boolean;
  traits?: string[];
  icon?: React.FC<IconProps>;
  /** 여유 특성: 사용자가 선택한 타임라인 위치 */
  leisurePosition?: number;
  /** 무리 특성: 행동력 1을 사용해 앞당긴 속도 오프셋 */
  strainOffset?: number;
  /** 카드 고유 식별자 */
  __uid?: string;
}

/**
 * UI용 타임라인 액션 - OrderItem과 호환
 * useBattleTimelines 출력 및 battle.queue와 호환됨
 * ExpectedDamagePreview, TimelineDisplay 등에서 사용
 */
export interface UITimelineAction {
  actor: 'player' | 'enemy';
  card: TimelineCard | Card;
  sp?: number;
  idx?: number;
  originalIndex?: number;
  finalSpeed?: number;
  [key: string]: unknown;
}

/** 패리 상태 */
export interface ParryState {
  active: boolean;
  centerSp: number;
  maxSp: number;
}

/** 호버된 적 행동 */
export interface HoveredEnemyAction {
  action: TimelineCard | null;
  idx: number;
  left: number;
  top: number;
  pageX: number;
  pageY: number;
}

/** 타임라인 표시 액션 */
export interface TimelineDisplayActions {
  setHoveredEnemyAction: (action: HoveredEnemyAction | null) => void;
  /** 여유 특성 카드의 타임라인 위치 변경 */
  onLeisurePositionChange?: (cardUid: string, newPosition: number) => void;
  /** 무리 특성 카드의 속도 오프셋 변경 (행동력 소모) */
  onStrainOffsetChange?: (cardUid: string, newOffset: number) => void;
}

/** 통찰 공개 정보 */
export interface InsightReveal {
  level?: number;
}

/** 타임라인 플레이어 */
export interface TimelinePlayer {
  maxSpeed?: number;
  strength?: number;
}

/**
 * 타임라인 적 - EnemyUnit에서 파생
 * maxSpeed만 필요한 UI 컴포넌트용
 */
export type TimelineEnemy = Pick<EnemyUnit, 'maxSpeed'>;

/**
 * 타임라인 전투 상태 - OrderItem[]과 호환
 */
export interface TimelineBattle {
  phase: string;
  queue?: UITimelineAction[] | OrderItem[];
}

// ==================== HP 바 UI 타입 ====================

/** 그룹화된 적 멤버 */
export interface GroupedEnemyMember {
  name?: string;
  count: number;
  emoji?: string;
}

/** HP바 플레이어 상태 */
export interface HpBarPlayer {
  hp: number;
  maxHp: number;
  block?: number;
  strength?: number;
  etherMultiplier?: number;
  etherOverflow?: number;
  tokens?: TokenState;
  [key: string]: unknown;
}

/** HP바 적 상태 */
export interface HpBarEnemy {
  hp: number;
  maxHp: number;
  block?: number;
  tokens?: TokenState;
  etherCapacity?: number;
  [key: string]: unknown;
}

/** 상태 정보 (툴팁용) */
export interface StatInfo {
  name: string;
  emoji: string;
  color: string;
  description: string;
}

// ==================== 손패 UI 타입 ====================

/** UI용 손패 카드 */
export interface UIHandCard {
  id: string;
  name: string;
  type: string;
  actionCost: number;
  speedCost: number;
  damage?: number;
  block?: number;
  description?: string;
  traits?: HandCardTrait[];
  icon?: React.FC<IconProps>;
  __handUid?: string;
  __uid?: string;
  __isMainSpecial?: boolean;
  __isSubSpecial?: boolean;
  __targetUnitId?: number;
}

/** 손패 카드 특성 */
export interface HandCardTrait {
  id: string;
  name?: string;
  description?: string;
}

/** 손패 유닛 - EnemyUnitState와 호환 */
export interface HandUnit {
  unitId: number;
  name?: string;
  emoji?: string;
  hp: number;
  maxHp: number;
}

/** 손패 전투 상태 */
export interface HandBattle {
  phase: string;
  queue: HandAction[];
}

/** 손패 플레이어 상태 */
export interface HandPlayer {
  hp: number;
  energy?: number;
  maxEnergy?: number;
  strength?: number;
  comboUsageCount?: Record<string, number>;
}

/** 손패 적 상태 */
export interface HandEnemy {
  hp: number;
}

/**
 * 손패 액션 - OrderItem, BattleAction과 호환
 * actor, card만 필수, 나머지는 선택적
 */
export interface HandAction {
  actor: 'player' | 'enemy';
  card: Card;
  speed?: number;
  sp?: number;
  originalIndex?: number;
  finalSpeed?: number;
  [key: string]: unknown;
}

/**
 * 콤보 정보 - ComboCalculation과 동일
 * @deprecated ComboCalculation을 직접 사용하세요.
 */
export type ComboInfo = ComboCalculation;

// ==================== 에테르 UI 타입 ====================

/**
 * 디플레이션 (UI용) - DeflationInfo에서 파생
 * multiplier만 필요한 UI 컴포넌트용
 */
export type UIDeflation = Pick<DeflationInfo, 'multiplier'>;

/** 에테르 계산 페이즈 (애니메이션) */
export type AnimEtherCalcPhase = 'sum' | 'multiply' | 'deflation' | 'result';

/** 디플레이션 정보 */
export interface DeflationInfo {
  multiplier: number;
  usageCount: number;
  comboName?: string;
  [key: string]: unknown;
}

/** 적 에테르 상태 */
export interface EnemyEtherState {
  deflation: DeflationInfo;
}

/** 적 에테르 애니메이션 액션 */
export interface EnemyEtherAnimActions {
  setEnemyEtherCalcPhase: (phase: AnimEtherCalcPhase) => void;
  setEnemyCurrentDeflation: (deflation: DeflationInfo | null) => void;
}

/** 에테르 바 액션 */
export interface EtherBarActions {
  setShowBarTooltip: (show: boolean) => void;
  setShowPtsTooltip: (show: boolean) => void;
}

/** 에테르 비교 바 전투 상태 */
export interface EtherComparisonBattle {
  phase: string;
}

/** 에테르 계산 애니메이션 카드 */
export interface EtherAnimCard {
  actionCost: number;
  type?: string;
  traits?: string[];
  isGhost?: boolean;
  [key: string]: unknown;
}

/** 에테르 계산 플레이어 상태 */
export interface EtherAnimPlayer {
  etherMultiplier?: number;
  comboUsageCount?: Record<string, number>;
  [key: string]: unknown;
}

/** 에테르 계산 애니메이션 액션 */
export interface EtherCalcAnimActions {
  setEtherCalcPhase: (phase: AnimEtherCalcPhase) => void;
}

// ==================== 상징 UI 타입 ====================

/** 상징 발동 Refs */
export interface RelicTriggeredRefs {
  referenceBookTriggered: { current: boolean };
  devilDiceTriggered: { current: boolean };
}

/** 상징 발동 정보 */
export interface RelicTrigger {
  id: string;
  tone: number;
  duration: number;
}

/** 상징 효과 (UI용) */
export interface UIRelicEffect {
  type?: string;
  etherCardMultiplier?: number;
  etherMultiplier?: number;
}

/**
 * 상징 (UI용) - Relic 데이터와 호환
 */
export interface UIRelic {
  emoji: string;
  name: string;
  description: string;
  rarity: string;
  effects?: UIRelicEffect;
  id?: string;
  tags?: string[];
  [key: string]: unknown;
}

/**
 * UI용 상징 맵 - RELICS 객체와 호환
 */
export interface UIRelicsMap {
  [key: string]: UIRelic;
}

/**
 * 상징 희귀도 상수 - RELIC_RARITIES와 호환
 */
export interface RelicRarities {
  COMMON: string;
  RARE: string;
  SPECIAL: string;
  LEGENDARY: string;
  [key: string]: string;
}

/** 상징 표시 액션 */
export interface RelicDisplayActions {
  setRelicActivated: (relicId: string | null) => void;
}

// ==================== 페이즈 표시 UI 타입 ====================

/** 페이즈 전투 상태 (UI 컴포넌트용) */
export interface PhaseBattle {
  phase: string;
}

/** 중앙 단계 표시 전투 상태 */
export interface CentralBattle {
  phase: string;
  selected: unknown[];
  queue: unknown[];
  qIndex: number;
}

/**
 * 중앙 단계 표시 플레이어 상태 - PlayerBattleState에서 파생
 * etherPts만 필요한 UI 컴포넌트용
 */
export type CentralPlayer = Pick<PlayerBattleState, 'etherPts'>;

/** 중앙 단계 표시 적 상태 */
export interface CentralEnemy {
  hp: number;
}

/** 중앙 단계 표시 액션 */
export interface CentralActions {
  setWillOverdrive: (overdrive: boolean) => void;
  setAutoProgress: (value: boolean) => void;
}

/** 대응 단계 스냅샷 */
export interface RespondSnapshot {
  selectedSnapshot: Card[];
  enemyActions: Array<{ [key: string]: unknown }>;
}

// ==================== 팝업 & 모달 UI 타입 ====================

/** 팝업 카드 */
export interface PopupCard {
  id: string;
  name: string;
  type: string;
  actionCost: number;
  speedCost: number;
  damage?: number;
  block?: number;
  hits?: number;
  description?: string;
  traits?: string[];
  icon?: React.FC<IconProps>;
  __isMainSpecial?: boolean;
  __isSubSpecial?: boolean;
  __uid?: string;
}

/** UI용 캐릭터 빌드 */
export interface UICharacterBuild {
  mainSpecial?: string;
  subSpecial?: string;
}

/** 카드 관리 모달 카드 */
export interface ModalCard {
  id: string;
  name: string;
  type: string;
  actionCost: number;
  speedCost: number;
  damage?: number;
  block?: number;
  hits?: number;
  description?: string;
  traits?: string[];
  _displayKey?: string;
  _type?: string;
}

/** 브리치 모달 카드 */
export interface BreachCard {
  id?: string;
  name: string;
  type?: string;
  actionCost?: number;
  speedCost?: number;
  damage?: number;
  block?: number;
  hits?: number;
  description?: string;
  icon?: React.FC<{ size?: number; className?: string }>;
  [key: string]: unknown;
}

/** 브리치 카드 정보 */
export interface BreachCardInfo {
  id?: string;
  name?: string;
  damage?: number;
  block?: number;
  speedCost?: number;
  actionCost?: number;
  breachSpOffset?: number;
  [key: string]: unknown;
}

/** 브리치 선택 상태 */
export interface BreachSelection {
  cards: Array<BreachCard | unknown>;
  breachSp?: number;
  breachCard?: BreachCardInfo | unknown;
  sourceCardName?: string | null;
  isLastChain?: boolean;
  isCreationSelection?: boolean;
  isAoe?: boolean;
  [key: string]: unknown;
}

/** 회상 카드 */
export interface RecallCard {
  id: string;
  name: string;
  type: string;
  actionCost: number;
  speedCost: number;
  damage?: number;
  block?: number;
  description?: string;
}

/** 회상 선택 상태 */
export interface RecallSelection {
  availableCards: RecallCard[];
}

/** 보상 카드 */
export interface RewardCard {
  id?: string;
  name: string;
  type: string;
  actionCost: number;
  speedCost: number;
  damage?: number;
  block?: number;
  hits?: number;
  description?: string;
  icon?: React.FC<{ size?: number; className?: string }>;
}

// ==================== 툴팁 UI 타입 ====================

/** 툴팁 카드 */
export interface TooltipCard {
  id: string;
  name?: string;
  damage?: number;
  block?: number;
  traits?: string[];
  appliedTokens?: Array<{
    id: string;
    target: 'player' | 'enemy';
  }>;
  speedCost?: number;
  speed?: number;
  hits?: number;
}

/** 호버된 카드 정보 */
export interface HoveredCard {
  card?: TooltipCard;
  x?: number;
  y?: number;
  // 간단한 식별 필드
  id?: string;
  name?: string;
  [key: string]: unknown;
}

/** 툴팁 전투 상태 */
export interface TooltipBattle {
  phase: string;
}

// ==================== 예상 피해 UI 타입 ====================

/** 예상 피해 플레이어 상태 */
export interface ExpectedDamagePlayer {
  hp: number;
  maxHp: number;
  block?: number;
  [key: string]: unknown;
}

/** 예상 피해 적 상태 */
export interface ExpectedDamageEnemy {
  hp: number;
  maxHp: number;
  block?: number;
  [key: string]: unknown;
}

/** UI용 시뮬레이션 결과 */
export interface UISimulationResult {
  pDealt: number | string;
  pTaken: number | string;
  finalEHp: number;
  finalPHp: number;
  lines?: string[];
}

/** UI용 전투 후 옵션 */
export interface UIPostCombatOptions {
  type: 'victory' | 'defeat';
}

// ==================== 아이템 슬롯 UI 타입 ====================

/** 토큰 부여 정보 */
export interface TokenGrant {
  id: string;
  stacks?: number;
}

/** 아이템 효과 */
export interface ItemEffect {
  type: string;
  value?: number;
  tokens?: TokenGrant[];
}

/** 아이템 */
export interface Item {
  name: string;
  description: string;
  icon?: string;
  usableIn: 'any' | 'combat';
  effect?: ItemEffect;
}

/** 아이템 슬롯 플레이어 상태 */
export interface ItemSlotsPlayer {
  hp: number;
  energy?: number;
  maxEnergy?: number;
  block?: number;
  strength?: number;
  etherPts?: number;
  etherMultiplier?: number;
  enemyFrozen?: boolean;
  tokens?: TokenState;
}

/** 아이템 슬롯 적 상태 */
export interface ItemSlotsEnemy {
  hp: number;
  etherPts?: number;
}

/** 적 행동 (아이템 슬롯용) */
export interface ItemSlotsEnemyAction {
  card?: unknown;
  [key: string]: unknown;
}

/**
 * 적 계획 (아이템 슬롯용) - EnemyPlan과 호환
 */
export interface ItemSlotsEnemyPlan {
  mode?: string;
  actions: ItemSlotsEnemyAction[] | unknown[];
  manuallyModified?: boolean;
  [key: string]: unknown;
}

/** 고정 순서 행동 */
export interface FixedOrderAction {
  actor: 'player' | 'enemy';
  card?: unknown;
}

/**
 * 전투 참조 (아이템 슬롯용) - BattleState와 호환
 */
export interface ItemSlotsBattleRef {
  phase?: string;
  player?: ItemSlotsPlayer | unknown;
  enemy?: ItemSlotsEnemy | unknown;
  enemyPlan?: ItemSlotsEnemyPlan | unknown;
  fixedOrder?: FixedOrderAction[] | unknown[];
  frozenOrder?: number;
  [key: string]: unknown;
}

/**
 * 전투 액션 (아이템 슬롯용) - BattleActions와 호환
 * unknown 타입을 사용하여 다양한 상태 객체와 호환됨
 */
export interface ItemSlotsBattleActions {
  setPlayer: (player: ItemSlotsPlayer | unknown) => void;
  setEnemy: (enemy: ItemSlotsEnemy | unknown) => void;
  addLog: (msg: string) => void;
  setEnemyPlan: (plan: ItemSlotsEnemyPlan | unknown) => void;
  setDestroyingEnemyCards?: (indices: number[]) => void;
  setFrozenOrder?: (order: number) => void;
  setFreezingEnemyCards?: (indices: number[]) => void;
  setFixedOrder?: (order: FixedOrderAction[] | unknown) => void;
}

// ==================== 캐릭터 시트 UI 타입 ====================

/** 자아 정보 */
export interface CharacterEgo {
  name: string;
  effects?: Record<string, number>;
}

/** 반영 정보 */
export interface ReflectionInfo {
  id: string;
  name: string;
  emoji: string;
  description: string;
  finalProbability: number;
}

// ==================== 맵 & 카드 탭 UI 타입 ====================

/** UI용 맵 노드 */
export interface UIMapNode {
  id: string;
  layer?: number;
  type: string;
  displayLabel?: string;
  cleared?: boolean;
}

/** 카드 탭 카드 */
export interface CardsTabCard {
  id: string;
  name: string;
  rarity?: string;
  type: string;
  actionCost: number;
  speedCost: number;
  damage?: number;
  block?: number;
  hits?: number;
}

/** 카드 탭 캐릭터 빌드 */
export interface CardsTabCharacterBuild {
  mainSpecials?: string[];
  subSpecials?: string[];
  ownedCards?: string[];
}

// ==================== 적 유닛 UI 타입 ====================

/**
 * 적 유닛 (UI용)
 * EnemyUnit의 서브셋이지만 unitId 등 일부 필드는 필수
 */
export interface EnemyUnitUI {
  unitId: number;
  name?: string;
  emoji?: string;
  hp: number;
  maxHp: number;
  block?: number;
  count?: number;
  tokens?: TokenState;
}

// ==================== DevTools UI 타입 ====================

/** Dev용 상징 데이터 */
export interface DevRelicData {
  id: string;
  name: string;
  description: string;
  rarity: string;
  tags?: string[];
}

/** 아이템 데이터 (Dev용, GameItem과 호환) */
export interface DevItem {
  id: string;
  name: string;
  icon?: string;
  tier?: number;
  usableIn: 'combat' | 'any';
  description: string;
}

/** DevTools 탭 정보 */
export interface DevToolsTab {
  id: string;
  label: string;
  icon: string;
}

// ==================== 컨텍스트 UI 타입 ====================

/** 컨텍스트 적 유닛 */
export interface ContextEnemyUnit {
  unitId: number;
  name: string;
  emoji?: string;
  hp: number;
  maxHp: number;
  block?: number;
  tokens?: TokenState;
}

/** 컨텍스트 플레이어 */
export interface ContextPlayer {
  hp: number;
  maxHp: number;
  energy?: number;
  maxEnergy?: number;
  block?: number;
  strength?: number;
  etherPts?: number;
}

/** 컨텍스트 적 */
export interface ContextEnemy {
  name: string;
  hp: number;
  maxHp: number;
  etherPts?: number;
  etherCapacity?: number;
}

/** 컨텍스트 전투 상태 */
export interface ContextBattle {
  phase: string;
  hand?: unknown[];
  selected?: unknown[];
}

/** 컨텍스트 액션 */
export interface ContextActions {
  [key: string]: (...args: unknown[]) => void;
}

/** 컨텍스트 포매터 */
export interface ContextFormatters {
  formatSpeedText?: (speed: number) => string;
  [key: string]: unknown;
}

// ==================== 스탯 사이드바 UI 타입 ====================

/** 스탯 사이드바 카드 */
export interface SidebarCard {
  damage?: number | null;
  block?: number | null;
  counter?: number;
  speedCost: number;
  hits?: number;
  cardCategory?: string;
}

// ==================== 확장 카드 UI 타입 ====================

/** 확장된 카드 인터페이스 (런타임 속성 포함) */
export interface ExtendedCard extends Card {
  __handUid?: string;
  __uid?: string;
  __isMainSpecial?: boolean;
  __isSubSpecial?: boolean;
  __targetUnitId?: number;
  _ignoreBlock?: boolean;
  _applyBurn?: boolean;
}

/** 카드 효과 적용 결과 */
export interface CardEffectResult {
  modifiedCard: Card;
  consumedTokens: Array<{ id: string; type: string }>;
}

/** 카드 (수정 가능) */
export interface ModifiableCard extends Card {
  _ignoreBlock?: boolean;
  _applyBurn?: boolean;
}
