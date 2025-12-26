/**
 * 전투 시스템 타입 정의
 *
 * 전투 상태, 공격/방어, 피해 계산 등
 */

import type {
  Card,
  Token,
  TokenState,
  TokenInstance,
  TokenEffectPayload,
  Relic,
  LogFunction
} from './core';

// ==================== 전투 기본 타입 ====================

/** 전투 상태 */
export interface BattleState {
  playerHp: number;
  enemyHp: number;
  playerTokens: Token[];
  enemyTokens: Token[];
  timeline: number;
  turn: number;
}

/** 전투 참여자 (플레이어/적 공통) */
export interface Combatant {
  hp: number;
  maxHp: number;
  block: number;
  tokens: Token[];
  strength?: number;
  agility?: number;
  insight?: number;
  counter?: number;
}

/** 플레이어 전투 상태 */
export interface PlayerBattleState extends Combatant {
  energy: number;
  maxEnergy: number;
  hand: Card[];
  deck: Card[];
  discard: Card[];
  exhaust: Card[];
  timeline: number;
  maxTimeline: number;
  ether: number;
  etherMultiplier: number;
}

/** 적 유닛 */
export interface EnemyUnit extends Combatant {
  id: string;
  name: string;
  tier: number;
  damage: number;
  defense: number;
  speed: number;
  pattern?: string;
  intent?: EnemyIntent;
  isDead?: boolean;
}

/** 적 의도 표시 */
export interface EnemyIntent {
  type: 'attack' | 'defense' | 'buff' | 'debuff' | 'special';
  icon: string;
  text: string;
  value?: number;
}

// ==================== 전투 이벤트 & 로그 ====================

/** 전투 이벤트 */
export interface BattleEvent {
  actor: 'player' | 'enemy' | 'system' | 'counter' | 'relic';
  type?: 'damage' | 'heal' | 'block' | 'token' | 'ether' | 'card';
  value?: number;
  msg: string;
  targetId?: string;
}

/** 전투 로그 */
export interface BattleLog {
  turn: number;
  phase: string;
  message: string;
  timestamp?: number;
}

// ==================== 피해 계산 타입 ====================

/** 피해 계산 결과 */
export interface DamageResult {
  finalDamage: number;
  blocked: number;
  isCritical: boolean;
  isDodged: boolean;
  modifiers: DamageModifier[];
}

/** 피해 수정자 */
export interface DamageModifier {
  source: string;
  type: 'multiply' | 'add' | 'flat';
  value: number;
}

/** 단일 타격 결과 */
export interface SingleHitResult {
  attacker: Combatant;
  defender: Combatant;
  damage: number;
  damageTaken?: number;
  blockDestroyed?: number;
  events: BattleEvent[];
  logs: string[];
  preProcessedResult?: PreProcessedResult;
}

/** 사전 처리 결과 */
export interface PreProcessedResult {
  modifiedCard: Card;
  attacker: Combatant;
  defender: Combatant;
  consumedTokens: string[];
}

/** 대응사격 결과 */
export interface CounterShotResult {
  defender: Combatant;
  attacker: Combatant;
  damage: number;
  events: BattleEvent[];
  logs: string[];
}

/** 반격 결과 */
export interface CounterResult {
  attacker: Combatant;
  damage: number;
  events: BattleEvent[];
  logs: string[];
}

// ==================== 공격/방어 로직 타입 ====================

/** 공격 행동 결과 */
export interface AttackResult {
  attacker: Combatant;
  defender: Combatant;
  dealt: number;
  taken: number;
  events: BattleEvent[];
  logs: string[];
  isCritical?: boolean;
  createdCards?: Card[];
}

/** 방어 행동 결과 */
export interface DefenseResult {
  actor: Combatant;
  dealt: number;
  taken: number;
  events: BattleEvent[];
  log: string;
}

/** 행동 적용 결과 */
export interface ActionResult {
  dealt: number;
  taken: number;
  events: BattleEvent[];
  updatedState: Record<string, unknown>;
  isCritical?: boolean;
  createdCards?: Card[];
  cardPlaySpecials?: CardPlaySpecialsResult;
}

/** 카드 사용 특수 효과 결과 */
export interface CardPlaySpecialsResult {
  tokensToAdd?: TokenToAdd[];
  tokensToRemove?: TokenToRemove[];
  events: BattleEvent[];
  logs: string[];
}

/** 추가할 토큰 정보 */
export interface TokenToAdd {
  id: string;
  stacks: number;
  targetEnemy?: boolean;
  grantedAt?: { turn: number; sp: number };
}

/** 제거할 토큰 정보 */
export interface TokenToRemove {
  id: string;
  stacks: number;
}

// ==================== 카드 실행 타입 ====================

/** 카드 실행 결과 */
export interface CardExecutionResult {
  player: PlayerBattleState;
  enemy: EnemyUnit;
  events: BattleEvent[];
  logs: string[];
  damage?: number;
  blocked?: number;
  isCritical?: boolean;
}

/** 소모된 토큰 정보 */
export interface ConsumedToken {
  id: string;
  type: string;
}

/** 피해 효과 적용 결과 */
export interface DamageEffectResult {
  finalDamage: number;
  dodged: boolean;
  reflected: number;
  consumedTokens: ConsumedToken[];
  logs: string[];
}

/** 회복 효과 적용 결과 */
export interface HealEffectResult {
  healing: number;
  consumedTokens: ConsumedToken[];
  logs: string[];
}

/** 부활 결과 */
export interface ReviveResult {
  revived: boolean;
  newHp: number;
  consumedTokens: ConsumedToken[];
  logs: string[];
}

// ==================== 전투 큐 타입 ====================

/** 행동 큐 아이템 */
export interface QueueAction {
  actor: 'player' | 'enemy';
  card: Card;
  speed?: number;
  unitId?: number;
}

/** 전투 컨텍스트 */
export interface BattleContext {
  enemyDisplayName?: string;
  fencingDamageBonus?: number;
  [key: string]: unknown;
}

// ==================== 배틀 상태 객체 ====================

/** 배틀 액션 */
export interface BattleAction {
  actor: 'player' | 'enemy';
  card?: Card | SpecialCard;
  sp?: number;
  [key: string]: unknown;
}

/** 배틀 참조 객체 */
export interface BattleRef {
  player?: Combatant;
  queue?: BattleAction[];
  qIndex?: number;
  usedCardIndices?: number[];
  actionEvents?: Record<number, BattleEvent[]>;
  [key: string]: unknown;
}

/** 배틀 상태 (리듀서용) */
export interface BattleStateObject {
  selected: Card[];
  [key: string]: unknown;
}

/** 플레이어 전투 데이터 */
export interface PlayerCombatData extends Combatant {
  etherPts?: number;
  etherOverflow?: number;
  etherMultiplier?: number;
  etherBan?: boolean;
  comboUsageCount?: Record<string, number>;
  energy?: number;
  maxEnergy?: number;
  [key: string]: unknown;
}

/** 적 전투 데이터 */
export interface EnemyCombatData extends Combatant {
  etherPts?: number;
  comboUsageCount?: Record<string, number>;
  energy?: number;
  maxEnergy?: number;
  units?: EnemyUnit[];
  [key: string]: unknown;
}

/** 적 계획 */
export interface EnemyPlan {
  actions: Card[];
  [key: string]: unknown;
}

// ==================== 특수 효과 타입 ====================

/** 특수 효과용 카드 (확장) */
export interface SpecialCard extends Card {
  crossBonus?: {
    type?: string;
    value?: number;
    count?: number;
    tokens?: Array<{
      id: string;
      stacks?: number;
      target?: string;
    }>;
  };
  advanceAmount?: number;
  pushAmount?: number;
  isFromFleche?: boolean;
  flecheChainCount?: number;
  requiredTokens?: string[];
  _ignoreBlock?: boolean;
  _applyBurn?: boolean;
  _addGunJam?: boolean;
  __targetUnitId?: number;
  [key: string]: unknown;
}

/** 특수 효과용 행동자 */
export interface SpecialActor extends Combatant {
  def?: boolean;
  agility?: number;
  etherOverdriveActive?: boolean;
  vulnMult?: number;
  _persistentStrikeDamage?: number;
  tokens?: Record<string, unknown> | Token[];
  [key: string]: unknown;
}

/** 특수 효과용 큐 아이템 */
export interface SpecialQueueItem {
  actor: 'player' | 'enemy';
  sp?: number;
  card?: SpecialCard;
  [key: string]: unknown;
}

/** 특수 효과용 전투 컨텍스트 */
export interface SpecialBattleContext extends BattleContext {
  hand?: Card[];
  allCards?: Card[];
  queue?: SpecialQueueItem[];
  playerAttackCards?: Card[];
  currentSp?: number;
  currentQIndex?: number;
  currentTurn?: number;
  remainingEnergy?: number;
  enemyRemainingEnergy?: number;
  handSize?: number;
  isLastCard?: boolean;
  unusedAttackCards?: number;
  blockDestroyed?: number;
  isCritical?: boolean;
  enemyUnits?: EnemyUnit[];
}

/** 특수 효과 이벤트 */
export interface SpecialEvent {
  actor: string;
  card: string;
  type: string;
  msg: string;
}

/** 공격 전 특수 효과 결과 */
export interface PreAttackResult {
  modifiedCard: SpecialCard;
  attacker: SpecialActor;
  defender: SpecialActor;
  events: SpecialEvent[];
  logs: string[];
  skipNormalDamage: boolean;
}

/** 공격 후 특수 효과 결과 */
export interface PostAttackResult {
  attacker: SpecialActor;
  defender: SpecialActor;
  events: SpecialEvent[];
  logs: string[];
  extraHits: number;
}

/** 다음 턴 효과 */
export interface NextTurnEffects {
  destroyOverlappingCard?: boolean;
  guaranteedCrit?: boolean;
  recallCard?: boolean;
  emergencyDraw?: number;
  fencingDamageBonus?: number;
  triggerCreation3x3?: boolean;
  creationIsAoe?: boolean;
  isAoeAttack?: boolean;
  [key: string]: unknown;
}

/** 카드 플레이 결과 */
export interface CardPlayResult {
  bonusCards: Card[];
  tokensToAdd: TokenToAdd[];
  tokensToRemove: TokenToRemove[];
  nextTurnEffects: NextTurnEffects | null;
  events: SpecialEvent[];
  logs: string[];
}

// ==================== 치명타 시스템 타입 ====================

/** 치명타 시스템용 토큰 */
export interface CriticalToken {
  id?: string;
  stacks?: number;
  effect?: {
    type?: string;
    value?: number;
  };
}

/** 치명타 시스템용 행동자 */
export interface CriticalActor {
  strength?: number;
  tokens?: CriticalToken[];
}

/** 치명타 시스템용 카드 */
export interface CriticalCard {
  special?: string | string[];
  [key: string]: unknown;
}

/** 치명타 시스템용 전투 컨텍스트 */
export interface CriticalBattleContext {
  guaranteedCrit?: boolean;
  [key: string]: unknown;
}

// ==================== 핵심 로직 타입 ====================

/** 턴 종료 핵심 로직 파라미터 */
export interface FinishTurnCoreParams {
  reason?: string;
  player: PlayerCombatData;
  enemy: EnemyCombatData;
  battle: BattleStateObject;
  battleRef: { current: BattleRef | null };
  selected: Card[];
  enemyPlan: EnemyPlan;
  queue: BattleAction[];
  turnEtherAccumulated: number;
  enemyTurnEtherAccumulated: number;
  finalComboMultiplier: number;
  relics: Relic[];
  nextTurnEffects: NextTurnEffects | null;
  escapeBanRef: { current: Set<string> };
  escapeUsedThisTurnRef: { current: Set<string> };
  RELICS: Record<string, Relic>;
  calculateEtherTransfer: (amount: number, currentPts: number) => number;
  addLog: (msg: string) => void;
  playSound?: (sound: string) => void;
  actions: Record<string, (...args: unknown[]) => void>;
}

/** 턴 종료 결과 */
export interface FinishTurnResult {
  shouldReturn: boolean;
}

/** 카드 실행 핵심 로직 파라미터 */
export interface ExecuteCardActionCoreParams {
  action: BattleAction;
  player: PlayerCombatData;
  enemy: EnemyCombatData;
  battle: BattleStateObject;
  battleRef: { current: BattleRef | null };
  cardUsageCount: Record<string, number>;
  nextTurnEffects: NextTurnEffects | null;
  turnEtherAccumulated: number;
  enemyTurnEtherAccumulated: number;
  orderedRelicList: Relic[];
  cardUpgrades: Record<string, unknown>;
  resolvedPlayerCards: Card[];
  playerTimeline: Card[];
  relics: Relic[];
  safeInitialPlayer: PlayerCombatData;
  triggeredRefs: { current: Set<string> };
  calculatePassiveEffects: (...args: unknown[]) => unknown;
  collectTriggeredRelics: (...args: unknown[]) => unknown;
  playRelicActivationSequence: (...args: unknown[]) => void;
  flashRelic: (relicId: string) => void;
  addLog: (msg: string) => void;
  playHitSound?: () => void;
  playBlockSound?: () => void;
  actions: Record<string, (...args: unknown[]) => void>;
}

/** 카드 실행 결과 */
export interface ExecuteCardActionResult {
  P: PlayerCombatData;
  E: EnemyCombatData;
  actionEvents: BattleEvent[];
}

// ==================== 다중 타격 타입 ====================

/** 전투 행동자 (확장) */
export interface CombatActor extends Combatant {
  def?: boolean;
  tokens?: Record<string, unknown>;
  etherOverdriveActive?: boolean;
  vulnMult?: number;
  [key: string]: unknown;
}

/** 전투 카드 (확장) */
export interface CombatCard extends Card {
  isGhost?: boolean;
  hits?: number;
  cardCategory?: string;
  [key: string]: unknown;
}

/** 전투 컨텍스트 (확장) */
export interface CombatBattleContext extends BattleContext {
  remainingEnergy?: number;
  enemyRemainingEnergy?: number;
  allCards?: Card[];
  [key: string]: unknown;
}

/** 전투 상태 */
export interface CombatState {
  player: CombatActor;
  enemy: CombatActor;
  log: string[];
  [key: string]: unknown;
}

/** 다중 타격 준비 결과 */
export interface MultiHitPrepareResult {
  hits: number;
  firstHitCritical: boolean;
  preProcessedResult: Record<string, unknown> | null;
  modifiedCard: CombatCard;
  firstHitResult: Record<string, unknown>;
  currentAttacker: CombatActor;
  currentDefender: CombatActor;
  attackerRemainingEnergy: number;
}

/** 다중 타격 마무리 결과 */
export interface MultiHitFinalizeResult {
  attacker: CombatActor;
  defender: CombatActor;
  events: BattleEvent[];
  logs: string[];
  extraHits: number;
  createdCards: Card[];
}

// ==================== 기타 전투 타입 ====================

/** 룰렛 결과 */
export interface RouletteResult {
  jammed: boolean;
  updatedAttacker: SpecialActor;
  event: SpecialEvent | null;
  log: string | null;
}

/** 충돌 결과 */
export interface CollisionResult {
  destroyed: boolean;
  events: SpecialEvent[];
  logs: string[];
}

/** 타임라인 변경 */
export interface TimelineChanges {
  advancePlayer: number;
  pushEnemy: number;
  pushLastEnemy: number;
}

/** 타임라인 결과 */
export interface TimelineResult {
  timelineChanges: TimelineChanges;
  events: SpecialEvent[];
  logs: string[];
}

/** 카드 생성 결과 */
export interface CardCreationResult {
  createdCards: Card[];
  events: SpecialEvent[];
  logs: string[];
}

/** 방어용 카드 (확장) */
export interface DefenseCard extends Card {
  isGhost?: boolean;
  ignoreStatus?: boolean;
  ignoreStrength?: boolean;
  crossBonus?: {
    type: string;
    value?: number;
  };
  counter?: number;
  [key: string]: unknown;
}

/** 방어용 행동자 */
export interface DefenseActor extends Combatant {
  def?: boolean;
  tokens?: Record<string, unknown>;
  [key: string]: unknown;
}

/** 방어용 전투 컨텍스트 */
export interface DefenseBattleContext extends BattleContext {
  currentSp?: number;
  queue?: Array<{ actor: string; sp?: number }>;
  currentQIndex?: number;
}

/** 승리 조건 결과 */
export interface VictoryConditionResult {
  isVictory: boolean;
  isEtherVictory: boolean;
  delay: number;
}

/** 전투 후 옵션 */
export interface PostCombatOptions {
  type: 'victory' | 'defeat';
}

/** 승리/패배용 적 */
export interface VictoryEnemy {
  hp: number;
  [key: string]: unknown;
}

/** 승리/패배용 플레이어 */
export interface VictoryPlayer {
  hp: number;
  [key: string]: unknown;
}

/** 승리 체크 결과 */
export interface VictoryCheckResult {
  isVictory: boolean;
  isEtherVictory?: boolean;
  delay: number;
}

/** 승리/패배 전환 액션 */
export interface VictoryDefeatActions {
  setSoulShatter: (value: boolean) => void;
  setNetEtherDelta: (value: null | number) => void;
  setPostCombatOptions: (options: PostCombatOptions) => void;
  setPhase: (phase: string) => void;
}

/** 승리/패배 처리 결과 */
export interface VictoryDefeatProcessResult {
  shouldReturn: boolean;
  isVictory: boolean;
  isDefeat: boolean;
}

// ==================== 리듀서 타입 ====================

/** 리듀서 플레이어 상태 */
export interface ReducerPlayerState {
  hp: number;
  maxHp: number;
  block: number;
  tokens: TokenInstance[];
  energy: number;
  maxEnergy: number;
  strength?: number;
  agility?: number;
  [key: string]: unknown;
}

/** 리듀서 적 상태 */
export interface ReducerEnemyState {
  hp: number;
  maxHp: number;
  block: number;
  tokens: TokenInstance[];
  units?: ReducerEnemyUnitState[];
  [key: string]: unknown;
}

/** 리듀서 적 유닛 상태 */
export interface ReducerEnemyUnitState {
  unitId: number;
  hp: number;
  maxHp: number;
  block: number;
  tokens: TokenInstance[];
  [key: string]: unknown;
}

/** 다음 턴 효과 (리듀서) */
export interface ReducerNextTurnEffects {
  player: Record<string, unknown>;
  enemy: Record<string, unknown>;
}

/** 피해 미리보기 */
export interface PreviewDamage {
  value: number;
  lethal: boolean;
  overkill: boolean;
}

/** 통찰 배지 */
export interface InsightBadge {
  level: number;
  dir: 'up' | 'down';
  show: boolean;
  key: number;
}

/** 훅용 적 계획 */
export interface HookEnemyPlan {
  actions: Card[];
  mode: string | null;
}

/** 초기 상태 오버라이드 옵션 */
export interface BattleInitialStateOverrides {
  player?: Partial<PlayerBattleState>;
  enemy?: Partial<EnemyUnit>;
  orderedRelics?: Relic[];
  isSimplified?: boolean;
  sortType?: 'speed' | 'order';
  [key: string]: unknown;
}
