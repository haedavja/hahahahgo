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
  TokenEntity,
  Relic,
  LogFunction
} from './core';
import type { PassiveStats } from './systems';
import type { RelicTriggeredRefs, RelicTrigger } from './ui';

// ==================== 전투 기본 타입 ====================

/** 간단한 전투 상태 (시뮬레이션용) */
export interface SimpleBattleState {
  playerHp: number;
  enemyHp: number;
  playerTokens: TokenState;
  enemyTokens: TokenState;
  timeline: number;
  turn: number;
}

/**
 * BattleState는 실제로 FullBattleState의 별칭입니다.
 * 하위 호환성을 위해 유지되며, 실제 전투 상태는 reducer에서 관리됩니다.
 * @see ../components/battle/reducer/battleReducerState.ts
 */
export type BattleState = SimpleBattleState & {
  // 실제 전투 상태는 reducer에서 정의된 FullBattleState를 사용합니다.
  // 이 타입은 간단한 시뮬레이션에 사용됩니다.
  [key: string]: unknown;
}

/** 전투 참여자 (플레이어/적 공통) - TokenEntity 확장으로 토큰 함수와 호환 */
export interface Combatant extends TokenEntity {
  hp: number;
  maxHp?: number;
  block?: number;
  tokens?: TokenState;
  vulnMult?: number;
  vulnTurns?: number;
  etherOverflow?: number;
  etherOverdriveActive?: boolean;
  maxSpeed?: number;
  def?: boolean;
  _persistentStrikeDamage?: number;
  comboUsageCount?: Record<string, number>;
  etherMultiplier?: number;
  [key: string]: unknown;
}

/** 플레이어 전투 상태 */
export interface PlayerBattleState extends Combatant {
  energy: number;
  maxEnergy: number;
  hand?: Card[];
  deck?: Card[];
  discard?: Card[];
  exhaust?: Card[];
  timeline?: number;
  maxTimeline?: number;
  ether?: number;
  etherMultiplier?: number;
  def?: boolean;
  comboUsageCount?: Record<string, number>;
  etherBan?: boolean;
  energyPenalty?: number;
  speedPenalty?: number;
  drawPenalty?: number;
  insightPenalty?: number;
  // 리듀서 호환 필드
  strength?: number;
  agility?: number;
  insight?: number;
  counter?: number;
  etherPts?: number;
}

/** 적 유닛 */
export interface EnemyUnit extends Combatant {
  id?: string;
  name?: string;
  tier?: number;
  damage?: number;
  defense?: number;
  speed?: number;
  pattern?: string;
  intent?: EnemyIntent;
  isDead?: boolean;
  etherCapacity?: number;
  shroud?: number;
  unitId?: number;
  emoji?: string;
  cardsPerTurn?: number;
  passives?: Record<string, unknown>;
  isBoss?: boolean;
  type?: string;
  deckId?: string;
  deck?: string[];
  units?: EnemyUnit[];
  enemyCount?: number;
  ether?: number;
  comboUsageCount?: Record<string, number>;
  // 리듀서 호환 필드
  etherPts?: number;
  count?: number;
  quantity?: number;
  counter?: number;
  composition?: Array<{ count?: number; quantity?: number; name?: string; emoji?: string }>;
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
  actor: 'player' | 'enemy' | 'system' | 'counter' | 'relic' | 'counterShot' | string;
  type?: 'damage' | 'heal' | 'block' | 'token' | 'ether' | 'card' | 'multihit' | 'hit' | 'blocked' | 'pierce' | 'burn' | 'special' | 'dodge' | 'cross' | 'ethos' | 'logos' | 'pathos';
  value?: number;
  msg: string;
  targetId?: string;
  card?: string;
  dmg?: number;
  beforeHP?: number;
  afterHP?: number;
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

/** 사전 처리 결과 */
export interface PreProcessedResult {
  modifiedCard: Card;
  attacker: Combatant;
  defender: Combatant;
  consumedTokens: ConsumedToken[];
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
  defenderTimelineAdvance?: number;
  queueModifications?: Array<{ index: number; newSp: number }>;
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
  defenderTimelineAdvance?: number;
  queueModifications?: Array<{ index: number; newSp: number }>;
}

/** 카드 사용 특수 효과 결과 - CardPlayResult와 호환 */
export interface CardPlaySpecialsResult {
  tokensToAdd?: TokenToAdd[];
  tokensToRemove?: TokenToRemove[];
  bonusCards?: Card[];
  nextTurnEffects?: NextTurnEffects;
  events: BattleEvent[];
  logs: string[];
  [key: string]: unknown;
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
  guaranteedCrit?: boolean;
  // 파토스 턴 효과
  pathosTurnEffects?: {
    gunToMelee?: boolean;      // 총격 시 추가 타격
    swordToGun?: boolean;      // 검격 시 추가 사격
    ignoreEvasion?: number;    // 회피 무시 확률 (%)
    onCrossBlock?: number;     // 교차 시 방어력 획득
    onSwordBlock?: number;     // 검격 시 방어력 획득
    forceCross?: boolean;      // 모든 검격 교차 판정
    chainBonus?: number;       // 연계 효과 증가율
    chainEvade?: boolean;      // 연계 후 회피 획득
    counterAttack?: number;    // 피격 시 반격 확률
  };
  // 파토스 다음 카드 효과 (일회성)
  pathosNextCardEffects?: {
    guaranteeCrit?: boolean;   // 치명타 보장
    setSpeed?: number;         // 속도 설정
    aoe?: boolean;             // 전체 공격
  };
  // 상징 개수 (고고학 에토스용)
  symbolCount?: number;
}

// ==================== 배틀 상태 객체 ====================

/** 배틀 액션 (큐 아이템) */
export interface BattleAction {
  actor: 'player' | 'enemy';
  card?: Card;
  sp?: number;
  idx?: number;
  originalSpeed?: number;
  finalSpeed?: number;
  hasCrossed?: boolean;
  [key: string]: unknown;
}

/** 배틀 참조 객체 */
export interface BattleRef {
  player?: Combatant;
  queue?: BattleAction[];
  qIndex?: number;
  usedCardIndices?: number[];
  actionEvents?: Record<number, BattleEvent[]>;
  enemy?: EnemyUnit;
  selected?: Card[];
  hand?: Card[];
  deck?: Card[];
  discardPile?: Card[];
  nextTurnEffects?: NextTurnEffects | null;
  [key: string]: unknown;
}

/** 배틀 상태 (리듀서용) */
export interface BattleStateObject {
  selected: Card[];
  hand?: Card[];
  queue?: BattleAction[];
  qIndex?: number;
  turnNumber?: number;
}

/** 플레이어 전투 데이터 */
export interface PlayerCombatData extends Combatant {
  etherMultiplier?: number;
  etherBan?: boolean;
  comboUsageCount?: Record<string, number>;
  hand?: Card[];
  deck?: Card[];
  discard?: Card[];
  exhaust?: Card[];
  timeline?: number;
  maxTimeline?: number;
  ether?: number;
  energyPenalty?: number;
  speedPenalty?: number;
  drawPenalty?: number;
  insightPenalty?: number;
}

/** 적 전투 데이터 */
export interface EnemyCombatData extends Combatant {
  units?: EnemyUnit[];
  ether?: number;
  etherCapacity?: number;
  shroud?: number;
  deck?: string[];
  cardsPerTurn?: number;
  passives?: Record<string, unknown>;
  isBoss?: boolean;
  name?: string;
  emoji?: string;
}

/** 적 계획 */
export interface EnemyPlan {
  actions: Card[];
  mode: string | null;
  manuallyModified?: boolean;
}

// ==================== 특수 효과 타입 ====================

/**
 * 특수 효과용 카드 - Card와 동일 (하위 호환용 별칭)
 * @deprecated Card를 직접 사용하세요. 모든 특수 효과 필드가 Card에 통합되었습니다.
 */
export type SpecialCard = Card;

/**
 * 특수 효과용 행동자 - Combatant와 동일 (하위 호환용 별칭)
 * @deprecated Combatant를 직접 사용하세요.
 */
export type SpecialActor = Combatant;

/**
 * 특수 효과용 큐 아이템 - BattleAction과 동일 (하위 호환용 별칭)
 * @deprecated BattleAction을 직접 사용하세요.
 */
export type SpecialQueueItem = BattleAction;

/**
 * 특수 효과용 전투 컨텍스트 - BattleContext와 동일 (하위 호환용 별칭)
 * @deprecated BattleContext를 직접 사용하세요.
 */
export type SpecialBattleContext = BattleContext;

/** 특수 효과 이벤트 - BattleEvent와 호환 */
export interface SpecialEvent {
  actor: 'player' | 'enemy' | 'system' | 'counter' | 'relic' | 'counterShot' | string;
  card?: string;
  type?: string;
  msg: string;
  value?: number;
  targetId?: string;
  dmg?: number;
  beforeHP?: number;
  afterHP?: number;
}

/** 공격 전 특수 효과 결과 */
export interface PreAttackResult {
  modifiedCard: SpecialCard;
  attacker: SpecialActor;
  defender: SpecialActor;
  events: SpecialEvent[];
  logs: string[];
  skipNormalDamage: boolean;
  queueModifications?: Array<{ index: number; newSp: number }>;
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
  extraCardPlay?: number;
  bonusEnergy?: number;
  maxSpeedBonus?: number;
  guaranteedCards?: string[];
  energyPenalty?: number;
  etherBlocked?: boolean;
  mainSpecialOnly?: boolean;
  subSpecialBoost?: number;
  player?: Record<string, unknown>;
  enemy?: Record<string, unknown>;
  blockNextTurn?: number;
  healNextTurn?: number;
  energyNextTurn?: number;
  otherEffect?: unknown;
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

/** 치명타 시스템용 토큰 (getAllTokens 반환 타입) */
export interface CriticalToken {
  id?: string;
  stacks?: number;
  effect?: {
    type?: string;
    value?: number;
  };
}

/**
 * 치명타 시스템용 행동자 - Combatant와 동일 (하위 호환용 별칭)
 * @deprecated Combatant를 직접 사용하세요.
 */
export type CriticalActor = Combatant;

/**
 * 치명타 시스템용 카드 - Card와 동일 (하위 호환용 별칭)
 * @deprecated Card를 직접 사용하세요.
 */
export type CriticalCard = Card;

/**
 * 치명타 시스템용 전투 컨텍스트 - BattleContext와 동일 (하위 호환용 별칭)
 * @deprecated BattleContext를 직접 사용하세요.
 */
export type CriticalBattleContext = BattleContext;

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

/** 카드 실행 액션 인터페이스 */
export interface ExecuteCardActions {
  setPlayer: (player: PlayerCombatData) => void;
  setEnemy: (enemy: EnemyCombatData) => void;
  setQueue: (queue: BattleAction[]) => void;
  setActionEvents: (events: Record<number, BattleEvent[]>) => void;
  setTurnEtherAccumulated: (value: number) => void;
  setEtherPulse: (value: boolean) => void;
  setResolvedPlayerCards: (value: number) => void;
  setRelicActivated: (id: string | null) => void;
  setEnemyTurnEtherAccumulated: (value: number) => void;
  // 애니메이션 관련
  setEnemyHit: (hit: boolean) => void;
  setPlayerHit: (hit: boolean) => void;
  setPlayerBlockAnim: (anim: boolean) => void;
  setEnemyBlockAnim: (anim: boolean) => void;
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
  triggeredRefs: RelicTriggeredRefs;
  calculatePassiveEffects: (relicIds: string[]) => PassiveStats;
  collectTriggeredRelics: (params: {
    orderedRelicList: string[];
    resolvedPlayerCards: number;
    playerTimeline: Card[];
    triggeredRefs: RelicTriggeredRefs;
  }) => RelicTrigger[];
  playRelicActivationSequence: (
    triggered: RelicTrigger[],
    flashRelic: (id: string, tone?: number, duration?: number) => void,
    setRelicActivated: (id: string | null) => void
  ) => void;
  flashRelic: (relicId: string, tone?: number, duration?: number) => void;
  addLog: (msg: string) => void;
  playHitSound?: () => void;
  playBlockSound?: () => void;
  actions: ExecuteCardActions;
  consumeNextCardEffects?: () => void;
}

/** 카드 실행 결과 */
export interface ExecuteCardActionResult {
  P: PlayerCombatData;
  E: EnemyCombatData;
  actionEvents: BattleEvent[];
}

// ==================== 다중 타격 타입 ====================

/**
 * 전투 행동자 - Combatant와 동일 (하위 호환용 별칭)
 * @deprecated Combatant를 직접 사용하세요.
 */
export type CombatActor = Combatant;

/**
 * 전투 카드 - Card와 동일 (하위 호환용 별칭)
 * @deprecated Card를 직접 사용하세요.
 */
export type CombatCard = Card;

/**
 * 전투 컨텍스트 - BattleContext와 동일 (하위 호환용 별칭)
 * @deprecated BattleContext를 직접 사용하세요.
 */
export type CombatBattleContext = BattleContext;

/** 전투 상태 */
export interface CombatState {
  player: Combatant;
  enemy: Combatant;
  log: string[];
  [key: string]: unknown;
}

/** 단일 타격 결과 */
export interface SingleHitResult {
  attacker: Combatant;
  defender: Combatant;
  damage: number;
  damageTaken?: number;
  blockDestroyed?: number;
  timelineAdvance?: number;
  events: BattleEvent[];
  logs: string[];
  preProcessedResult?: PreProcessedResult | null;
  queueModifications?: Array<{ index: number; newSp: number }>;
}

/** 다중 타격 준비 결과 */
export interface MultiHitPrepareResult {
  hits: number;
  firstHitCritical: boolean;
  preProcessedResult: PreProcessedResult | null;
  modifiedCard: Card;
  firstHitResult: SingleHitResult;
  currentAttacker: Combatant;
  currentDefender: Combatant;
  attackerRemainingEnergy: number;
}

/** 다중 타격 마무리 결과 */
export interface MultiHitFinalizeResult {
  attacker: Combatant;
  defender: Combatant;
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
  block?: number;
}

/**
 * 방어용 행동자 - Combatant와 동일 (하위 호환용 별칭)
 * @deprecated Combatant를 직접 사용하세요.
 */
export type DefenseActor = Combatant;

/**
 * 방어용 전투 컨텍스트 - BattleContext와 동일 (하위 호환용 별칭)
 * @deprecated BattleContext를 직접 사용하세요.
 */
export type DefenseBattleContext = BattleContext;

/** 승리 조건 결과 */
export interface VictoryConditionResult {
  isVictory: boolean;
  isEtherVictory: boolean;
  delay: number;
}

/** 전투 후 옵션 */
export interface PostCombatOptions {
  type: 'victory' | 'defeat';
  [key: string]: unknown;
}

/** 승리/패배용 적 */
export interface VictoryEnemy {
  hp: number;
  maxHp?: number;
  etherPts?: number;
}

/** 승리/패배용 플레이어 */
export interface VictoryPlayer {
  hp: number;
  maxHp?: number;
  etherPts?: number;
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

/**
 * 리듀서 플레이어 상태 - PlayerBattleState와 동일 (하위 호환용 별칭)
 * @deprecated PlayerBattleState를 직접 사용하세요.
 */
export type ReducerPlayerState = PlayerBattleState;

/**
 * 리듀서 적 상태 - EnemyUnit 또는 EnemyBattleState와 호환
 */
export type ReducerEnemyState = EnemyUnit & { [key: string]: unknown };

/**
 * 리듀서 적 유닛 상태 - EnemyUnit과 동일 (하위 호환용 별칭)
 * @deprecated EnemyUnit을 직접 사용하세요.
 */
export type ReducerEnemyUnitState = EnemyUnit;

/** 다음 턴 효과 (리듀서) */
export interface ReducerNextTurnEffects {
  player?: Record<string, unknown>;
  enemy?: Record<string, unknown>;
  extraCardPlay?: number;
  bonusEnergy?: number;
  maxSpeedBonus?: number;
  guaranteedCards?: string[];
  blockNextTurn?: number;
  healNextTurn?: number;
  energyNextTurn?: number;
  [key: string]: unknown;
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
  sortType?: 'speed' | 'cost' | 'order' | 'energy' | 'value' | 'type';
  phase?: string;
  hand?: Card[];
  selected?: Card[];
  canRedraw?: boolean;
  enemyIndex?: number;
  deck?: Card[];
  discardPile?: Card[];
  enemyPlan?: EnemyPlan;
  queue?: BattleAction[];
  fixedOrder?: BattleAction[];
  postCombatOptions?: PostCombatOptions | null;
  log?: string[];
  turnNumber?: number;
  actionEvents?: Record<string, BattleEvent[]>;
  [key: string]: unknown;
}
