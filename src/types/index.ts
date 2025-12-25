/**
 * 하하하GO 게임 타입 정의
 *
 * 이 파일은 게임의 핵심 데이터 구조를 정의합니다.
 * JS 파일에서 JSDoc으로 참조하여 타입 안전성을 확보합니다.
 */

// ==================== 카드 시스템 ====================

/** 카드 희귀도 */
export type CardRarity = 'common' | 'rare' | 'special' | 'legendary';

/** 카드 타입 */
export type CardType = 'attack' | 'defense' | 'general' | 'support';

/** 카드 카테고리 */
export type CardCategory = 'fencing' | 'pistol' | 'guard' | 'misc';

/** 카드 특성 ID */
export type CardTrait =
  | 'advance' | 'knockback' | 'crush' | 'chain' | 'cross' | 'creation'
  | 'repeat' | 'warmup' | 'exhaust' | 'vanish' | 'mistake' | 'protagonist'
  | 'last' | 'robber' | 'ruin' | 'oblivion' | 'outcast';

/** 카드 정의 */
export interface Card {
  id: string;
  name: string;
  type: CardType;
  damage?: number;
  defense?: number;
  speedCost: number;
  actionCost: number;
  iconKey?: string;
  description: string;
  traits?: CardTrait[];
  cardCategory?: CardCategory;
  special?: string;
  isGhost?: boolean;
  _combo?: string;
}

/** 카드 특성 정의 */
export interface TraitDefinition {
  id: CardTrait;
  name: string;
  type: 'positive' | 'negative';
  weight: number;
  description: string;
}

// ==================== 자원 시스템 ====================

/** 게임 자원 */
export interface Resources {
  gold: number;
  intel: number;
  loot: number;
  material: number;
  etherPts: number;
  memory: number;
}

/** 자원 보상 (범위 지정 가능) */
export interface ResourceReward {
  gold?: number | { min: number; max: number };
  material?: number | { min: number; max: number };
  intel?: number;
  loot?: number;
  relic?: string;
  potion?: number;
}

// ==================== 상징 시스템 ====================

/** 상징 희귀도 */
export type RelicRarity = 'common' | 'rare' | 'special' | 'legendary';

/** 상징 효과 */
export interface RelicEffect {
  etherMultiplier?: number;
  etherPerCard?: number;
  maxHpBonus?: number;
  healOnRest?: number;
  startingGold?: number;
  shopDiscount?: number;
  // ... 기타 효과
}

/** 상징 정의 */
export interface Relic {
  id: string;
  name: string;
  icon: string;
  rarity: RelicRarity;
  description: string;
  passive?: RelicEffect;
  activation?: {
    trigger: string;
    effect: RelicEffect;
  };
}

// ==================== 전투 시스템 ====================

/** 토큰 대상 */
export type TokenTarget = 'player' | 'enemy';

/** 토큰 정의 */
export interface Token {
  id: string;
  stacks: number;
  target: TokenTarget;
}

/** 적 정의 */
export interface Enemy {
  id: string;
  name: string;
  tier: number;
  hp: number;
  damage: number;
  defense: number;
  speed: number;
  description?: string;
  pattern?: string;
  tokens?: Token[];
}

/** 전투 상태 */
export interface BattleState {
  playerHp: number;
  enemyHp: number;
  playerTokens: Token[];
  enemyTokens: Token[];
  timeline: number;
  turn: number;
}

// ==================== 던전 시스템 ====================

/** 던전 오브젝트 타입 */
export type DungeonObjectType =
  | 'chest' | 'curio' | 'combat' | 'crossroad' | 'shortcut'
  | 'ore' | 'gold_pile' | 'crate' | 'crystal' | 'mushroom' | 'corpse';

/** 던전 오브젝트 */
export interface DungeonObject {
  id: string;
  typeId: DungeonObjectType;
  x: number;
  used: boolean;
  isSpecial?: boolean;
  template?: object;
  choiceState?: object;
}

/** 던전 방 */
export interface DungeonRoom {
  id: string;
  x: number;
  y: number;
  roomType: 'entrance' | 'normal' | 'exit' | 'hidden';
  objects: DungeonObject[];
  exits: {
    north: boolean;
    south: boolean;
    east: boolean;
    west: boolean;
  };
  visited: boolean;
  discovered: boolean;
}

// ==================== 이벤트 시스템 ====================

/** 이벤트 선택지 결과 타입 */
export type ChoiceResultType = 'success' | 'failure' | 'partial' | 'hidden';

/** 이벤트 선택지 */
export interface EventChoice {
  id: string;
  text: string;
  requirements?: {
    item?: string;
    stat?: string;
    value?: number;
  };
  repeatable?: boolean;
  maxAttempts?: number;
  outcomes: {
    success: {
      type: ChoiceResultType;
      text: string;
      effect: {
        reward?: ResourceReward;
        damage?: number;
        buff?: string;
        debuff?: string;
      };
    };
    failure?: {
      type: ChoiceResultType;
      text: string;
      effect: object;
    };
  };
}

// ==================== 맵 시스템 ====================

/** 맵 노드 타입 */
export type MapNodeType = 'combat' | 'event' | 'shop' | 'rest' | 'dungeon' | 'boss';

/** 맵 노드 */
export interface MapNode {
  id: string;
  type: MapNodeType;
  layer: number;
  cleared: boolean;
  selectable: boolean;
  connections: string[];
}

// ==================== 게임 상태 ====================

/** 게임 전체 상태 */
export interface GameState {
  resources: Resources;
  playerHp: number;
  maxHp: number;
  playerStrength: number;
  playerAgility: number;
  playerInsight: number;
  relics: Relic[];
  map: {
    nodes: MapNode[];
    currentNodeId: string;
  };
  mapRisk: number;
  activeBattle: BattleState | null;
  activeDungeon: object | null;
  activeEvent: object | null;
}

// ==================== 전투 확장 타입 ====================

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

/** 반격 결과 */
export interface CounterResult {
  attacker: Combatant;
  damage: number;
  events: BattleEvent[];
  logs: string[];
}

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

// ==================== 토큰 확장 타입 ====================

/** 토큰 타입 */
export type TokenType = 'usage' | 'turn' | 'permanent';

/** 토큰 카테고리 */
export type TokenCategory = 'positive' | 'negative' | 'neutral';

/** 토큰 정의 (확장) */
export interface TokenDefinition {
  id: string;
  name: string;
  type: TokenType;
  category: TokenCategory;
  emoji: string;
  description: string;
  effect: TokenEffectPayload;
}

/** 토큰 효과 페이로드 (정의용) */
export interface TokenEffectPayload {
  type: string;
  value: number;
}

/** 토큰 조작 결과 */
export interface TokenOperationResult {
  tokens: Token[];
  added?: number;
  removed?: number;
  cancelled?: boolean;
}

// ==================== 콤보 시스템 ====================

/** 콤보 타입 */
export type ComboType =
  | 'highCard' | 'onePair' | 'twoPair' | 'threeOfAKind'
  | 'straight' | 'fullHouse' | 'fourOfAKind' | 'fiveOfAKind';

/** 콤보 결과 */
export interface ComboResult {
  type: ComboType;
  rank: number;
  multiplier: number;
  cards: Card[];
  description: string;
}

// ==================== 상징 확장 타입 ====================

/** 상징 효과 타입 */
export type RelicEffectType =
  | 'PASSIVE' | 'ON_COMBAT_START' | 'ON_COMBAT_END'
  | 'ON_TURN_START' | 'ON_TURN_END' | 'ON_CARD_PLAYED'
  | 'ON_DAMAGE_TAKEN' | 'ON_CARD_DRAW' | 'ON_COMBO';

/** 상징 활성화 결과 */
export interface RelicActivationResult {
  relicId: string;
  triggered: boolean;
  effects: BattleEvent[];
  message?: string;
}

// ==================== 유틸리티 타입 ====================

/** 액션 타입 (리듀서용) */
export interface Action<T = unknown> {
  type: string;
  payload?: T;
}

/** 좌표 */
export interface Position {
  x: number;
  y: number;
}

/** 범위 값 */
export interface Range {
  min: number;
  max: number;
}

// ==================== 토큰 효과 시스템 ====================

/** 토큰 효과 타입 ID */
export type TokenEffectType =
  | 'ATTACK_BOOST' | 'ATTACK_PENALTY'
  | 'DEFENSE_BOOST' | 'DEFENSE_PENALTY'
  | 'DODGE' | 'COUNTER' | 'COUNTER_SHOT'
  | 'LIFESTEAL' | 'REVIVE' | 'IMMUNITY'
  | 'DAMAGE_TAKEN' | 'ENERGY_BOOST' | 'ENERGY_PENALTY'
  | 'STRENGTH' | 'AGILITY' | 'INSIGHT'
  | 'ETHER_TO_ENERGY' | 'REDUCE_INSIGHT'
  | 'GOLD_ON_DAMAGE' | 'FINESSE'
  | 'PERSISTENT_STRIKE' | 'HALF_ETHER'
  | 'GUN_JAM' | 'LOADED' | 'ARMOR_PIERCING'
  | 'INCENDIARY' | 'BURN' | 'ROULETTE'
  | 'CRIT_BOOST' | 'FOCUS' | 'CURSE' | 'VEIL'
  | 'EMPTY_CHAMBER';

/** 토큰 효과 정의 */
export interface TokenEffect {
  type: TokenEffectType;
  value: number;
}

/** 토큰 인스턴스 (실제 보유 토큰) */
export interface TokenInstance {
  id: string;
  stacks: number;
  grantedAt?: { turn: number; sp: number };
}

/** 토큰 상태 (유형별 분류) */
export interface TokenState {
  usage: TokenInstance[];
  turn: TokenInstance[];
  permanent: TokenInstance[];
  [key: string]: TokenInstance[];
}

/** 토큰이 있는 엔티티 */
export interface TokenEntity {
  tokens?: TokenState;
  strength?: number;
  agility?: number;
  insight?: number;
  maxHp?: number;
  hp?: number;
  block?: number;
  counter?: number;
  [key: string]: unknown;
}

/** 토큰 조작 결과 (확장) */
export interface TokenModificationResult {
  tokens: TokenState;
  logs: string[];
  cancelled?: number;
  remaining?: number;
}

// ==================== 카드 확장 타입 ====================

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
  consumedTokens: ConsumedToken[];
}

/** 소모된 토큰 정보 */
export interface ConsumedToken {
  id: string;
  type: TokenType;
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

// ==================== UI 컴포넌트 Props ====================

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

// ==================== 상징 효과 상세 ====================

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

// ==================== 타격 계산 타입 ====================

/** 대응사격 결과 */
export interface CounterShotResult {
  defender: Combatant;
  attacker: Combatant;
  damage: number;
  events: BattleEvent[];
  logs: string[];
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

// ==================== 방어 로직 타입 ====================

/** 방어 행동 결과 */
export interface DefenseResult {
  actor: Combatant;
  dealt: number;
  taken: number;
  events: BattleEvent[];
  log: string;
}

// ==================== 공격 로직 타입 ====================

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

/** 치명타 시스템용 토큰 (효과 포함) */
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

// ==================== 콤보 감지 시스템 타입 ====================

/** 콤보 감지용 카드 */
export interface ComboCard {
  actionCost: number;
  type?: string;
  traits?: string[];
  isGhost?: boolean;
  [key: string]: unknown;
}

/** 콤보 감지 결과 */
export interface ComboResult {
  name: string;
  bonusKeys: Set<number> | null;
}

/** 콤보 배율 설명 결과 */
export interface ComboExplainResult {
  multiplier: number;
  steps: string[];
}

// ==================== 손패 생성 시스템 타입 ====================

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

// ==================== 적 AI 시스템 타입 ====================

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

// ==================== 통찰 시스템 타입 ====================

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

// ==================== 에테르 이동 타입 ====================

/** 에테르 이동 결과 */
export interface EtherTransferResult {
  nextPlayerPts: number;
  nextEnemyPts: number;
  movedPts: number;
}

// ==================== 콤보 점수 시스템 타입 ====================

/** 콤보 이름 */
export type ComboName = '하이카드' | '페어' | '투페어' | '트리플' | '플러쉬' | '풀하우스' | '포카드' | '파이브카드';

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
