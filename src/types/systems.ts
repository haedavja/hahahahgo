/**
 * 게임 시스템 타입 정의
 *
 * 콤보, AI, 통찰, 에테르, 이변, 패리 등 시스템
 */

import type {
  Card,
  TokenState,
  TokenInstance,
  TokenEffectPayload,
  Relic,
  RelicEffectType,
  LogFunction
} from './core';
import type {
  Combatant,
  EnemyUnit,
  BattleEvent,
  SpecialActor
} from './combat';

// ==================== 콤보 시스템 ====================

/** 콤보 타입 */
export type ComboType =
  | 'highCard' | 'onePair' | 'twoPair' | 'threeOfAKind'
  | 'straight' | 'fullHouse' | 'fourOfAKind' | 'fiveOfAKind';

/** 콤보 이름 */
export type ComboName = '하이카드' | '페어' | '투페어' | '트리플' | '플러쉬' | '풀하우스' | '포카드' | '파이브카드';

/** 감지된 콤보 결과 */
export interface DetectedCombo {
  type: ComboType;
  rank: number;
  multiplier: number;
  cards: Card[];
  description: string;
}

/** 콤보 감지용 카드 */
export interface ComboCard {
  actionCost: number;
  type?: string;
  traits?: string[];
  isGhost?: boolean;
  [key: string]: unknown;
}

/** 콤보 계산 결과 */
export interface ComboCalculation {
  name: string;
  bonusKeys: Set<number> | null;
}

/** 콤보 배율 설명 결과 */
export interface ComboExplainResult {
  multiplier: number;
  steps: string[];
}

/** 콤보 점수용 카드 */
export interface ComboScoringCard extends ComboCard {
  id?: string;
  type?: 'attack' | 'defense' | 'general' | 'support';
  speedCost?: number;
  damage?: number;
  hits?: number;
  block?: number;
}

/** 콤보 점수용 적 */
export interface ComboScoringEnemy {
  id?: string;
  hp?: number;
  maxHp?: number;
  ether?: number;
  deck?: string[];
}

/** 콤보 점수 결과 */
export interface ComboScoreResult {
  comboName: string | null;
  score: number;
  multiplier: number;
  bonusKeys?: Set<number> | null;
}

/** 잠재 콤보 분석 결과 */
export interface PotentialComboAnalysis {
  costFrequency: Map<number, number>;
  canFlush: boolean;
  flushType?: 'attack' | 'defense' | null;
  maxSameCost: number;
  pairCosts: number[];
  bestPotentialCombo: ComboName | null;
}

/** 콤보 전략 결과 */
export interface ComboStrategyResult {
  comboWeight: number;
  etherPriority: boolean;
  targetCombo: ComboName | null;
  baseTendency: number;
}

/** 콤보 점수 옵션 */
export interface ComboScoreOptions {
  comboWeight?: number;
  etherPriority?: boolean;
}

/** 콤보 사용 카운트 */
export interface ComboUsageCount {
  [key: string]: number;
}

// ==================== 손패 생성 시스템 ====================

/** 손패용 카드 (확장) */
export interface HandCard extends Card {
  __handUid?: string;
  __isMainSpecial?: boolean;
  __isSubSpecial?: boolean;
  [key: string]: unknown;
}

/** 캐릭터 빌드 */
export interface CharacterBuild {
  mainSpecials?: string[];
  subSpecials?: string[];
  ownedCards?: string[];
}

/** 카드 드로우 결과 */
export interface DrawResult {
  drawnCards: HandCard[];
  newDeck: HandCard[];
  newDiscardPile: HandCard[];
  reshuffled: boolean;
}

/** 덱 초기화 결과 */
export interface InitializeDeckResult {
  deck: HandCard[];
  mainSpecialsHand: HandCard[];
}

// ==================== 적 AI 시스템 ====================

/** AI용 카드 */
export interface AICard {
  id?: string;
  name?: string;
  damage?: number;
  block?: number;
  hits?: number;
  speedCost?: number;
  actionCost?: number;
  type?: string;
  iconKey?: string;
  isGhost?: boolean;
  createdBy?: string;
  __sourceUnitId?: number;
  __uid?: string;
  [key: string]: unknown;
}

/** AI용 적 */
export interface AIEnemy {
  id?: string;
  hp: number;
  deck?: string[];
  unitId?: number;
  [key: string]: unknown;
}

/** AI 모드 가중치 */
export interface AIModeWeights {
  aggro: number;
  turtle: number;
  balanced: number;
}

/** AI 모드 */
export interface AIMode {
  name: string;
  key: 'aggro' | 'turtle' | 'balanced';
  prefer: string;
}

/** AI 카드 통계 */
export interface AICardStats {
  atk: number;
  def: number;
  dmg: number;
  blk: number;
  sp: number;
  en: number;
}

// ==================== 통찰 시스템 ====================

/** 통찰 시스템용 카드 정보 */
export interface InsightCardInfo {
  __sourceUnitId?: number;
  effects?: unknown[];
  traits?: string[];
  [key: string]: unknown;
}

/** 통찰 시스템용 적 행동 */
export interface InsightEnemyAction {
  card?: InsightCardInfo;
  speed?: number;
}

/** 통찰 시스템용 유닛 정보 */
export interface InsightUnit {
  unitId: number;
  tokens?: unknown[];
}

/** 통찰 액션 공개 정보 */
export interface InsightActionRevealInfo {
  index: number;
  hidden: boolean;
  sourceUnitId?: number;
  isFirst?: boolean;
  isLast?: boolean;
  revealLevel?: number;
  card?: InsightCardInfo;
  speed?: number;
  effects?: unknown[];
  traits?: string[];
}

/** 통찰 공개 레벨 결과 */
export interface InsightRevealResult {
  level: number;
  visible: boolean;
  cardCount?: number;
  showRoughOrder?: boolean;
  showCards?: boolean;
  showSpeed?: boolean;
  showEffects?: boolean;
  fullDetails?: boolean;
  actions?: InsightActionRevealInfo[];
}

// ==================== 에테르 시스템 ====================

/** 에테르 이동 결과 */
export interface EtherTransferResult {
  nextPlayerPts: number;
  nextEnemyPts: number;
  movedPts: number;
}

/** 에테르 계산용 카드 */
export interface EtherCard {
  actionCost?: number;
  rarity?: string;
  traits?: string[];
  isGhost?: boolean;
  [key: string]: unknown;
}

/** 에테르 계산용 카드 엔트리 */
export interface EtherCardEntry {
  card?: EtherCard;
  [key: string]: unknown;
}

/** 디플레이션 결과 */
export interface DeflationResult {
  gain: number;
  multiplier: number;
  usageCount: number;
}

/** 콤보 에테르 획득 결과 */
export interface ComboEtherGainResult {
  gain: number;
  baseGain: number;
  comboMult: number;
  actionCostBonus: number;
  deflationPct: number;
  deflationMult: number;
}

/** 콤보 에테르 획득 계산 파라미터 */
export interface CalculateComboEtherGainParams {
  cards?: (EtherCard | EtherCardEntry)[];
  cardCount?: number;
  comboName?: string | null;
  comboUsageCount?: ComboUsageCount;
  extraMultiplier?: number;
}

/** 에테르 슬롯 계산 함수 타입 */
export type EtherSlotCalculator = (pts: number) => number;

/** 에테르 전송 결과 (처리용) */
export interface EtherTransferProcessResult {
  nextPlayerPts: number;
  nextEnemyPts: number;
  movedPts: number;
}

/** 에테르 전송 액션 */
export interface EtherTransferProcessActions {
  setNetEtherDelta: (value: number | null) => void;
  setPlayerTransferPulse: (value: boolean) => void;
  setEnemyTransferPulse: (value: boolean) => void;
}

/** 에테르 전송 계산 함수 타입 */
export type CalculateEtherTransferFn = (
  playerAppliedEther: number,
  enemyAppliedEther: number,
  curPlayerPts: number,
  curEnemyPts: number,
  enemyHp: number
) => EtherTransferProcessResult;

// ==================== 턴 종료 에테르 계산 ====================

/** 턴 종료 에테르용 콤보 */
export interface TurnEndEtherCombo {
  name?: string;
}

/** 턴 종료 에테르용 플레이어 */
export interface TurnEndEtherPlayer {
  comboUsageCount?: ComboUsageCount;
  etherMultiplier?: number;
  tokens?: TokenState;
  hp?: number;
  maxHp?: number;
  block?: number;
  [key: string]: unknown;
}

/** 턴 종료 에테르용 적 */
export interface TurnEndEtherEnemy {
  comboUsageCount?: ComboUsageCount;
  tokens?: TokenState;
  hp?: number;
  maxHp?: number;
  block?: number;
  [key: string]: unknown;
}

/** 플레이어 에테르 결과 */
export interface PlayerEtherResult {
  baseComboMult: number;
  finalComboMult: number;
  relicMultBonus: number;
  etherAmplifierMult: number;
  beforeDeflation: number;
  deflation: DeflationResult;
  finalEther: number;
  appliedEther: number;
  overflow: number;
}

/** 적 에테르 결과 */
export interface EnemyEtherResult {
  comboMult: number;
  beforeDeflation: number;
  deflation: DeflationResult;
  halfEtherMult: number;
  finalEther: number;
  appliedEther: number;
  overflow: number;
}

/** 턴 종료 에테르 결과 */
export interface TurnEndEtherResult {
  player: PlayerEtherResult;
  enemy: EnemyEtherResult;
}

/** 턴 종료 에테르 계산 파라미터 */
export interface CalculateTurnEndEtherParams {
  playerCombo: TurnEndEtherCombo | null | undefined;
  enemyCombo: TurnEndEtherCombo | null | undefined;
  turnEtherAccumulated: number;
  enemyTurnEtherAccumulated: number;
  finalComboMultiplier: number;
  player: TurnEndEtherPlayer;
  enemy: TurnEndEtherEnemy;
}

// ==================== 이변 시스템 ====================

/** 이변 효과 */
export interface AnomalyEffect {
  type: string;
  value?: number;
  description: string;
}

/** 이변 정의 */
export interface AnomalyDefinition {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
  getEffect: (level: number) => AnomalyEffect;
}

/** 이변 (레벨 포함) */
export interface AnomalyWithLevel {
  anomaly: AnomalyDefinition;
  level: number;
}

/** 강제 이변 (개발용) */
export interface ForcedAnomaly {
  anomalyId: string;
  level: number;
}

/** 이변 플레이어 */
export interface AnomalyPlayer {
  hp?: number;
  maxHp?: number;
  tokens?: TokenState;
  etherBan?: boolean;
  energyPenalty?: number;
  speedPenalty?: number;
  drawPenalty?: number;
  insightPenalty?: number;
  [key: string]: unknown;
}

/** 이변 적용 결과 */
export interface ApplyAnomalyResult {
  player: AnomalyPlayer;
  logs: string[];
}

/** 이변 표시 정보 */
export interface AnomalyDisplay {
  id: string;
  name: string;
  emoji: string;
  color: string;
  level: number;
  effect: AnomalyEffect;
  description: string;
}

/** 이변 패널티 결과 */
export interface AnomalyPenaltyResult {
  energy: number;
  speed: number;
  insight: number;
}

/** 이상현상 타입 */
export interface AnomalyType {
  id: string;
  name: string;
  emoji: string;
  color: string;
  getEffect: (level: number) => { description: string };
}

// ==================== 패리(쳐내기) 시스템 ====================

/** 패리용 카드 정보 */
export interface ParryCardInfo {
  name?: string;
  type?: string;
  parryRange?: number;
  parryPushAmount?: number;
  [key: string]: unknown;
}

/** 패리용 액션 */
export interface ParryAction {
  card: ParryCardInfo;
  sp?: number;
  actor: 'player' | 'enemy';
}

/** 패리용 큐 아이템 */
export interface ParryQueueItem {
  card?: ParryCardInfo;
  sp?: number;
  actor?: 'player' | 'enemy';
}

/** 패리 대기 상태 */
export interface ParryReadyState {
  active: boolean;
  actor: 'player' | 'enemy';
  cardName?: string;
  centerSp: number;
  maxSp: number;
  pushAmount: number;
  triggered: boolean;
}

/** 패리 이벤트 */
export interface ParryEvent {
  actor: 'player' | 'enemy';
  card?: string;
  type: 'parry';
  pushAmount: number;
  triggeredBy?: string;
  msg: string;
}

/** 패리 트리거 결과 */
export interface ParryTriggerResult {
  updatedQueue: ParryQueueItem[];
  parryEvents: ParryEvent[];
  updatedParryStates: ParryReadyState[];
  outCards: ParryQueueItem[];
}

/** 패리 대기 설정 파라미터 */
export interface SetupParryReadyParams {
  action: ParryAction;
  addLog: LogFunction;
}

/** 패리 트리거 체크 파라미터 */
export interface CheckParryTriggerParams {
  parryReadyStates: ParryReadyState | ParryReadyState[] | null | undefined;
  enemyAction: ParryAction;
  queue: ParryQueueItem[];
  currentQIndex: number;
  enemyMaxSpeed?: number;
  addLog: LogFunction;
  playParrySound?: () => void;
}

// ==================== 기절 처리 시스템 ====================

/** 기절 처리용 카드 정보 */
export interface StunCardInfo {
  name?: string;
  [key: string]: unknown;
}

/** 기절 처리용 액션 */
export interface StunAction {
  card: StunCardInfo;
  sp?: number;
  actor: 'player' | 'enemy';
}

/** 기절 처리용 큐 아이템 */
export interface StunQueueItem {
  card?: StunCardInfo;
  sp?: number;
  actor?: 'player' | 'enemy';
}

/** 기절 이벤트 */
export interface StunEvent {
  actor: 'player' | 'enemy';
  card: string;
  type: 'stun';
  msg: string;
}

/** 기절 처리 결과 */
export interface StunProcessingResult {
  updatedQueue: StunQueueItem[];
  stunEvent: StunEvent | null;
}

/** 기절 처리 파라미터 */
export interface StunProcessingParams {
  action: StunAction;
  queue: StunQueueItem[];
  currentQIndex: number;
  addLog: LogFunction;
}

// ==================== 시뮬레이션 시스템 ====================

/** 시뮬레이션용 카드 */
export interface SimCard {
  name: string;
  type?: string;
  damage?: number;
  block?: number;
  hits?: number;
  counter?: number;
  traits?: string[];
  [key: string]: unknown;
}

/** 시뮬레이션용 행동자 */
export interface SimActor {
  hp: number;
  block?: number;
  def?: boolean;
  counter?: number;
  etherOverdriveActive?: boolean;
  strength?: number;
  vulnMult?: number;
  etherPts?: number;
  [key: string]: unknown;
}

/** 시뮬레이션용 전투 상태 */
export interface SimBattleState {
  player: SimActor;
  enemy: SimActor;
  log: string[];
}

/** 시뮬레이션 액션 이벤트 */
export interface SimActionEvent {
  actor: string;
  card: string;
  type: string;
  msg: string;
  dmg?: number;
  beforeHP?: number;
  afterHP?: number;
  block?: number;
  value?: number;
}

/** 시뮬레이션 액션 결과 */
export interface SimActionResult {
  dealt: number;
  taken: number;
  events: SimActionEvent[];
}

/** 시뮬레이션 큐 단계 */
export interface SimQueueStep {
  actor: 'player' | 'enemy';
  card: SimCard;
}

/** 시뮬레이션 결과 */
export interface SimulationResult {
  pDealt: number;
  pTaken: number;
  finalPHp: number;
  finalEHp: number;
  lines: string[];
}

// ==================== 속도 큐 시스템 ====================

/** 우선순위 가중치가 추가된 카드 */
export interface InflatedCard extends Card {
  priorityWeight: number;
}

/** 인스턴스 ID가 추가된 핸드 카드 (speedQueue) */
export interface SpeedQueueHandCard extends InflatedCard {
  instanceId: string;
}

/** 타임라인 행동 */
export interface TimelineAction {
  actor: 'player' | 'enemy';
  cardId: string;
  name?: string;
  speedCost: number;
  priorityWeight: number;
  priority: string;
  actionCost: number;
  tags: string[];
  roll: number;
}

/** 타임라인 항목 */
export interface TimelineEntry extends TimelineAction {
  order: number;
  tu: number;
}

/** 턴 미리보기 */
export interface TurnPreview {
  playerHand: SpeedQueueHandCard[];
  enemyHand: SpeedQueueHandCard[];
  timeline: TimelineEntry[];
  tuLimit: number;
}

/** 턴 미리보기 옵션 */
export interface CreateTurnPreviewOptions {
  playerHandSize?: number;
  enemyHandSize?: number;
  maxTU?: number;
}

// ==================== 민첩 시스템 ====================

/** 원본 속도 보존 카드 */
export interface CardWithOriginalSpeed extends Card {
  originalSpeedCost?: number;
}

// ==================== 카드 특성 효과 ====================

/** 특성 효과용 카드 */
export interface TraitEffectCard {
  id: string;
  name: string;
  traits?: string[];
  [key: string]: unknown;
}

/** 카드 특성 다음 턴 효과 */
export interface CardTraitNextTurnEffects {
  guaranteedCards: string[];
  bonusEnergy: number;
  energyPenalty: number;
  etherBlocked: boolean;
  mainSpecialOnly: boolean;
  subSpecialBoost: number;
}

// ==================== 카드 순서 시스템 ====================

/** 순서 계산용 카드 정보 */
export interface OrderingCardInfo {
  speedCost: number;
  [key: string]: unknown;
}

/** 순서 계산용 적 행동 */
export interface OrderingEnemyAction {
  speedCost: number;
  [key: string]: unknown;
}

/** 순서 항목 */
export interface OrderItem {
  actor: 'player' | 'enemy';
  card: OrderingCardInfo | OrderingEnemyAction;
  originalIndex: number;
  sp?: number;
  finalSpeed?: number;
}

/** 정렬된 큐 아이템 */
export interface CombatQueueItem {
  actor: 'player' | 'enemy';
  card: OrderingCardInfo;
  sp: number;
  idx: number;
  originalSpeed: number;
  finalSpeed: number;
}

// ==================== 상징 효과 시스템 ====================

/** 상징 효과 정의 */
export interface RelicEffectsDefinition {
  type?: RelicEffectType;
  maxEnergy?: number;
  maxHp?: number;
  maxSpeed?: number;
  speed?: number;
  strength?: number;
  agility?: number;
  subSpecialSlots?: number;
  mainSpecialSlots?: number;
  cardDrawBonus?: number;
  etherMultiplier?: number;
  etherFiveCardBonus?: number;
  etherCardMultiplier?: boolean;
  maxSubmitCards?: number;
  extraCardPlay?: number;
  block?: number;
  heal?: number;
  energy?: number;
  damage?: number;
  condition?: (state: Record<string, unknown>) => boolean;
  healIfDamaged?: number;
  maxHpIfFull?: number;
  energyNextTurn?: number;
  blockNextTurn?: number;
  healNextTurn?: number;
  etherPercent?: number;
  [key: string]: unknown;
}

/** 패시브 스탯 합계 */
export interface PassiveStats {
  maxEnergy: number;
  maxHp: number;
  maxSpeed: number;
  speed: number;
  strength: number;
  agility: number;
  subSpecialSlots: number;
  mainSpecialSlots: number;
  cardDrawBonus: number;
  etherMultiplier: number;
  etherFiveCardBonus: number;
  etherCardMultiplier: boolean;
  maxSubmitCards: number;
  extraCardPlay: number;
}

/** 전투 시작 효과 */
export interface CombatStartChanges {
  block: number;
  heal: number;
  energy: number;
  damage: number;
  strength: number;
}

/** 전투 종료 효과 */
export interface CombatEndChanges {
  heal: number;
  maxHp: number;
}

/** 턴 시작 효과 */
export interface TurnStartChanges {
  block: number;
  energy: number;
  heal: number;
}

/** 턴 종료 효과 */
export interface TurnEndChanges {
  strength: number;
  energyNextTurn: number;
}

/** 카드 사용 효과 */
export interface CardPlayedChanges {
  heal: number;
}

/** 피해 받음 효과 */
export interface DamageTakenChanges {
  blockNextTurn: number;
  healNextTurn: number;
}

/** 추가 슬롯 */
export interface ExtraSlots {
  mainSlots: number;
  subSlots: number;
}

/** 상징 (효과 포함) */
export interface RelicWithEffects {
  id: string;
  effects: RelicEffectsDefinition;
  [key: string]: unknown;
}

/** 전투 종료 상태 (상징용) */
export interface RelicCombatEndState {
  playerHp?: number;
  maxHp?: number;
}

/** 턴 상태 (상징용) */
export interface RelicTurnState {
  blockNextTurn?: number;
  energyNextTurn?: number;
  healNextTurn?: number;
  [key: string]: unknown;
}

// ==================== 성찰 시스템 ====================

/** 성찰 플레이어 */
export interface ReflectionPlayer {
  egos?: string[];
  traits?: string[];
  hp?: number;
  maxHp?: number;
  tokens?: TokenState;
  [key: string]: unknown;
}

/** 성찰 전투 상태 */
export interface ReflectionBattleState {
  reflectionTriggerCounts?: Record<string, number>;
  bonusEnergy?: number;
  etherMultiplier?: number;
  timelineBonus?: number;
  enemyFreezeTurns?: number;
  [key: string]: unknown;
}

/** 성찰 효과 */
export interface ReflectionEffect {
  type: string;
  tokenId?: string;
  stacks?: number;
  value?: number;
}

/** 성찰 정의 */
export interface Reflection {
  id: string;
  name: string;
  probability: number;
  maxTriggers?: number;
  effect: ReflectionEffect;
}

/** 성찰 효과 결과 */
export interface ReflectionEffectResult {
  updatedPlayer: ReflectionPlayer;
  updatedBattleState: ReflectionBattleState;
  description: string;
}

/** 처리된 성찰 효과 */
export interface ProcessedReflectionEffect {
  reflectionId: string;
  reflectionName: string;
  updatedPlayer: ReflectionPlayer;
  updatedBattleState: ReflectionBattleState;
  description: string;
}

/** 성찰 처리 결과 */
export interface ProcessReflectionsResult {
  updatedPlayer: ReflectionPlayer;
  updatedBattleState: ReflectionBattleState;
  effects: ProcessedReflectionEffect[];
  logs: string[];
}

/** 초기 성찰 상태 */
export interface InitialReflectionState {
  reflectionTriggerCounts: Record<string, number>;
  bonusEnergy: number;
  etherMultiplier: number;
  timelineBonus: number;
  enemyFreezeTurns: number;
}

// ==================== 전투 해결기 ====================

/** 액터 스탯 */
export interface ResolverActorStats {
  hp: number;
  block: number;
}

/** 전투 스탯 */
export interface ResolverBattleStats {
  player: ResolverActorStats;
  enemy: ResolverActorStats;
}

/** 전투 해결기 카드 */
export interface ResolverCard {
  id: string;
  name?: string;
  damage?: number;
  block?: number;
  tags?: string[];
}

/** 전투 해결기 타임라인 항목 */
export interface ResolverTimelineEntry {
  order: number;
  actor: 'player' | 'enemy';
  cardId: string;
  speedCost: number;
  [key: string]: unknown;
}

/** 공격 결과 (해결기) */
export interface ResolverAttackResult {
  blocked: number;
  hpDamage: number;
}

/** 방어 결과 (해결기) */
export interface ResolverBlockResult {
  block: number;
}

/** 지원 결과 (해결기) */
export interface ResolverSupportResult {
  buff?: string;
}

/** 로그 상세 (해결기) */
export interface ResolverLogDetail {
  type: string;
  blocked?: number;
  hpDamage?: number;
  targetHP?: number;
  targetBlock?: number;
  block?: number;
  actorBlock?: number;
  buff?: string;
}

/** 로그 기록 (해결기) */
export interface ResolverLogRecord {
  order: number;
  actor: string;
  cardId: string;
  name?: string;
  speedCost: number;
  detail: ResolverLogDetail | null;
  actorHP: number;
  actorBlock: number;
  targetHP: number;
  targetBlock: number;
}

/** 전투 상태 플래그 (해결기) */
export interface ResolverBattleStatus {
  [key: string]: boolean;
}

/** 전투 해결 결과 */
export interface ResolverSimulationResult {
  winner: 'player' | 'enemy' | 'draw';
  log: ResolverLogRecord[];
  finalState: ResolverBattleStats;
  initialState: ResolverBattleStats;
  status: ResolverBattleStatus;
}

// ==================== 상징 유틸리티 ====================

/** 상징 효과 (유틸) */
export interface RelicUtilEffect {
  type: string;
  value: number;
}

/** 상징 효과 정의 (유틸) */
export interface RelicUtilEffects {
  type?: string;
  effects?: RelicUtilEffect[];
  comboMultiplierPerCard?: number;
  [key: string]: unknown;
}

/** 상징 유틸리티 */
export interface RelicUtil {
  id: string;
  effects: RelicUtilEffects;
  [key: string]: unknown;
}
