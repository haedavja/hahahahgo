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

/** 활성 이벤트 */
export interface ActiveEvent {
  id: string;
  step?: string;
  nodeId?: string;
  [key: string]: unknown;
}

/** 활성 던전 */
export interface ActiveDungeon {
  nodeId: string;
  revealed?: boolean;
  confirmed?: boolean;
  dungeonData?: unknown;
  [key: string]: unknown;
}

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
  activeDungeon: ActiveDungeon | null;
  activeEvent: ActiveEvent | null;
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

// ==================== 전투 시뮬레이션 타입 ====================

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

// ==================== 카드 특성 효과 타입 ====================

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

/** 로그 함수 타입 */
export type LogFunction = (message: string) => void;

// ==================== 카드 순서 타입 ====================

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

// ==================== 전투 유틸리티 타입 ====================

/** 정렬된 큐 아이템 */
export interface CombatQueueItem {
  actor: 'player' | 'enemy';
  card: OrderingCardInfo;
  sp: number;
  idx: number;
  originalSpeed: number;
  finalSpeed: number;
}

/** 에테르 슬롯 계산 함수 타입 */
export type EtherSlotCalculator = (pts: number) => number;

// ==================== 턴 종료 상태 업데이트 타입 ====================

/** 턴 종료용 액션 */
export interface TurnEndAction {
  actor: 'player' | 'enemy';
  card?: { id?: string; [key: string]: unknown };
}

/** 턴 종료용 콤보 */
export interface TurnEndCombo {
  name?: string;
}

/** 턴 종료용 유닛 */
export interface TurnEndUnit {
  block?: number;
  [key: string]: unknown;
}

/** 턴 종료용 플레이어 */
export interface TurnEndPlayer {
  etherOverflow?: number;
  [key: string]: unknown;
}

/** 턴 종료용 적 */
export interface TurnEndEnemy {
  hp: number;
  units?: TurnEndUnit[];
  [key: string]: unknown;
}

/** 콤보 사용 카운트 */
export interface ComboUsageCount {
  [key: string]: number;
}

/** 턴 종료 플레이어 파라미터 */
export interface TurnEndPlayerParams {
  comboUsageCount: ComboUsageCount;
  etherPts: number;
  etherOverflow?: number;
  etherMultiplier?: number;
}

/** 턴 종료 적 파라미터 */
export interface TurnEndEnemyParams {
  comboUsageCount: ComboUsageCount;
  etherPts: number;
}

/** 승리 조건 결과 */
export interface VictoryConditionResult {
  isVictory: boolean;
  isEtherVictory: boolean;
  delay: number;
}

// ==================== 기절 처리 타입 ====================

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

// ==================== 방어 로직 타입 ====================

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

// ==================== 카드 즉시 효과 타입 ====================

/** 즉시 효과용 카드 정보 */
export interface ImmediateCardInfo {
  id?: string;
  name?: string;
  isGhost?: boolean;
  traits?: string[];
  [key: string]: unknown;
}

/** 즉시 효과용 플레이어 상태 */
export interface ImmediatePlayerState {
  hp?: number;
  maxHp?: number;
  strength?: number;
  [key: string]: unknown;
}

/** 즉시 효과용 적 상태 */
export interface ImmediateEnemyState {
  [key: string]: unknown;
}

/** 즉시 효과용 다음 턴 효과 */
export interface ImmediateNextTurnEffects {
  bonusEnergy?: number;
  [key: string]: unknown;
}

/** 즉시 카드 특성 처리 파라미터 */
export interface ProcessImmediateCardTraitsParams {
  card: ImmediateCardInfo;
  playerState: ImmediatePlayerState;
  nextTurnEffects: ImmediateNextTurnEffects;
  addLog: LogFunction;
  addVanishedCard?: (cardId: string) => void;
}

/** 카드 사용 상징 효과 처리 파라미터 */
export interface ProcessCardPlayedRelicEffectsParams {
  relics: string[];
  card: ImmediateCardInfo;
  playerState: ImmediatePlayerState;
  enemyState: ImmediateEnemyState;
  safeInitialPlayer?: ImmediatePlayerState;
  addLog: LogFunction;
  setRelicActivated: (id: string | null) => void;
}

// ==================== 토큰 컨테이너 타입 ====================

/** 토큰 컨테이너 */
export interface TokensContainer {
  usage?: Token[];
  turn?: Token[];
  permanent?: Token[];
}

// ==================== 적 사망 처리 타입 ====================

/** 적 사망 처리 액션 */
export interface EnemyDeathActions {
  setEnemyHit: (value: boolean) => void;
  setTimelineIndicatorVisible: (value: boolean) => void;
  setAutoProgress: (value: boolean) => void;
  setDisabledCardIndices: (indices: number[]) => void;
  setQIndex: (index: number) => void;
  setEtherFinalValue: (value: number) => void;
}

/** 적 사망 처리 파라미터 */
export interface ProcessEnemyDeathParams {
  newQIndex: number;
  queue: Array<{ [key: string]: unknown }>;
  queueLength: number;
  turnEtherAccumulated: number;
  playSound: (freq: number, duration: number) => void;
  actions: EnemyDeathActions;
}

// ==================== 쳐내기(패리) 처리 타입 ====================

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

// ==================== 에테르 계산 타입 ====================

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

// ==================== 턴 종료 에테르 계산 타입 ====================

/** 턴 종료 에테르용 콤보 */
export interface TurnEndEtherCombo {
  name?: string;
}

/** 턴 종료 에테르용 플레이어 */
export interface TurnEndEtherPlayer {
  comboUsageCount?: ComboUsageCount;
  etherMultiplier?: number;
  [key: string]: unknown;
}

/** 턴 종료 에테르용 적 */
export interface TurnEndEtherEnemy {
  comboUsageCount?: ComboUsageCount;
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

// ==================== 배틀 유틸리티 타입 ====================

/** 배틀 유틸용 카드 */
export interface BattleCard extends Card {
  [key: string]: unknown;
}

/** 특성 적용 컨텍스트 */
export interface TraitContext {
  isInCombo?: boolean;
  usageCount?: number;
}

// ==================== 승리/패배 전환 타입 ====================

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

/** 전투 후 옵션 */
export interface PostCombatOptions {
  type: 'victory' | 'defeat';
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

// ==================== 에테르 전송 처리 타입 ====================

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

// ==================== 턴 종료 상징 효과 타입 ====================

/** 상징 데이터 */
export interface RelicData {
  effects?: {
    type?: string;
    condition?: (params: { cardsPlayedThisTurn: number; player: RelicPlayer; enemy: RelicEnemy }) => boolean;
  };
  [key: string]: unknown;
}

/** 상징 맵 */
export interface RelicsMap {
  [key: string]: RelicData;
}

/** 상징용 플레이어 */
export interface RelicPlayer {
  strength?: number;
  [key: string]: unknown;
}

/** 상징용 적 */
export interface RelicEnemy {
  [key: string]: unknown;
}

/** 상징 처리 액션 */
export interface RelicProcessActions {
  setRelicActivated: (id: string | null) => void;
  setPlayer: (player: RelicPlayer) => void;
}

/** 턴 종료 상징 효과 */
export interface TurnEndRelicEffects {
  energyNextTurn: number;
  strength: number;
}

/** 상징용 다음 턴 효과 */
export interface RelicNextTurnEffects {
  bonusEnergy: number;
  [key: string]: unknown;
}

/** 턴 종료 상징 애니메이션 파라미터 */
export interface PlayTurnEndRelicAnimationsParams {
  relics: string[];
  RELICS: RelicsMap;
  cardsPlayedThisTurn: number;
  player: RelicPlayer;
  enemy: RelicEnemy;
  playSound: (freq: number, duration: number) => void;
  actions: RelicProcessActions;
}

/** 턴 종료 상징 효과 적용 파라미터 */
export interface ApplyTurnEndRelicEffectsParams {
  turnEndRelicEffects: TurnEndRelicEffects;
  nextTurnEffects: RelicNextTurnEffects;
  player: RelicPlayer;
  addLog: LogFunction;
  actions: RelicProcessActions;
}

// ==================== 에테르 누적 처리 타입 ====================

/** 에테르 누적용 카드 정보 */
export interface EtherAccumCardInfo {
  id?: string;
  isGhost?: boolean;
  rarity?: string;
  [key: string]: unknown;
}

/** 패시브 효과 */
export interface PassiveEffects {
  etherMultiplier: number;
  [key: string]: unknown;
}

/** 에테르 누적 액션 */
export interface EtherAccumActions {
  setResolvedPlayerCards: (count: number) => void;
  setTurnEtherAccumulated: (value: number) => void;
  setEtherPulse: (value: boolean) => void;
  setRelicActivated: (id: string | null) => void;
  setEnemyTurnEtherAccumulated: (value: number) => void;
}

/** 트리거된 상징 참조 */
export interface TriggeredRefs {
  [key: string]: boolean;
}

/** 플레이어 에테르 누적 파라미터 */
export interface PlayerEtherAccumulationParams {
  card: EtherAccumCardInfo;
  turnEtherAccumulated: number;
  orderedRelicList: string[];
  cardUpgrades: Record<string, string>;
  resolvedPlayerCards: number;
  playerTimeline: unknown[];
  relics: unknown[];
  triggeredRefs: TriggeredRefs;
  calculatePassiveEffects: (relicList: string[]) => PassiveEffects;
  getCardEtherGain: (card: EtherAccumCardInfo) => number;
  collectTriggeredRelics: (params: {
    orderedRelicList: string[];
    resolvedPlayerCards: number;
    playerTimeline: unknown[];
    triggeredRefs: TriggeredRefs;
  }) => string[];
  playRelicActivationSequence: (
    triggered: string[],
    flashRelic: (id: string) => void,
    setRelicActivated: (id: string | null) => void
  ) => void;
  flashRelic: (id: string) => void;
  actions: EtherAccumActions;
}

/** 플레이어 에테르 누적 결과 */
export interface PlayerEtherAccumulationResult {
  newTurnEther: number;
  newResolvedPlayerCards: number;
}

/** 적 에테르 누적 파라미터 */
export interface EnemyEtherAccumulationParams {
  card: EtherAccumCardInfo;
  enemyTurnEtherAccumulated: number;
  getCardEtherGain: (card: EtherAccumCardInfo) => number;
  actions: EtherAccumActions;
}

// ==================== 이벤트 애니메이션 처리 타입 ====================

/** 액션 이벤트 (애니메이션용) */
export interface AnimActionEvent {
  type: string;
  actor: string;
  dmg?: number;
  block?: number;
  [key: string]: unknown;
}

/** 애니메이션용 액션 */
export interface AnimAction {
  actor: 'player' | 'enemy';
  [key: string]: unknown;
}

/** 이벤트 애니메이션 액션 */
export interface EventAnimActions {
  setEnemyHit: (value: boolean) => void;
  setPlayerHit: (value: boolean) => void;
  setPlayerBlockAnim: (value: boolean) => void;
  setEnemyBlockAnim: (value: boolean) => void;
}

// ==================== 속도 큐 시스템 타입 ====================

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

// ==================== 민첩 시스템 타입 ====================

/** 원본 속도 보존 카드 */
export interface CardWithOriginalSpeed extends Card {
  originalSpeedCost?: number;
}

// ==================== 상징 효과 시스템 타입 ====================

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

// ==================== 토큰 효과 시스템 타입 ====================

/** 토큰 인스턴스 (표시용, 효과 포함) */
export interface TokenInstanceWithEffect {
  id: string;
  stacks: number;
  durationType: string;
  effect: TokenEffectPayload;
  name: string;
  [key: string]: unknown;
}

/** 카드 (수정 가능) */
export interface ModifiableCard extends Card {
  _ignoreBlock?: boolean;
  _applyBurn?: boolean;
}

/** 토큰 소모 결과 */
export interface TokenConsumeResult {
  tokens: TokenState;
  logs: string[];
}

// ==================== 토큰 유틸리티 타입 ====================

/** 토큰 상쇄 결과 */
export interface TokenCancelResult {
  cancelled: number;
  remaining: number;
  tokens: TokenState;
}

/** 토큰 데이터 (표시용) */
export interface TokenDisplayData extends TokenDefinition, TokenInstance {
  durationType: string;
}

// ==================== 성찰 시스템 타입 ====================

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

// ==================== 전투 해결기 타입 ====================

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
  [key: string]: unknown;
}

/** 전투 해결기 타임라인 항목 */
export interface ResolverTimelineEntry {
  order: number;
  actor: 'player' | 'enemy';
  cardId: string;
  speedCost: number;
  [key: string]: unknown;
}

/** 공격 결과 */
export interface ResolverAttackResult {
  blocked: number;
  hpDamage: number;
}

/** 방어 결과 */
export interface ResolverBlockResult {
  block: number;
}

/** 지원 결과 */
export interface ResolverSupportResult {
  buff?: string;
}

/** 로그 상세 */
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

/** 로그 기록 */
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

/** 전투 상태 플래그 */
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

// ==================== 상징 유틸리티 타입 ====================

/** 상징 효과 */
export interface RelicUtilEffect {
  type: string;
  value: number;
}

/** 상징 효과 정의 */
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

// ==================== 이변 시스템 타입 ====================

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

// ==================== 던전 선택지 시스템 타입 ====================

/** 스탯 요구사항 */
export interface DungeonStatRequirement {
  stat: string;
  value: number;
}

/** 스케일링 요구사항 */
export interface DungeonScalingRequirement {
  stat: string;
  baseValue: number;
  increment: number;
}

/** 선택지 요구사항 */
export interface DungeonChoiceRequirements {
  item?: string;
  strength?: number;
  agility?: number;
  insight?: number;
  energy?: number;
  [key: string]: unknown;
}

/** 결과 효과 */
export interface DungeonOutcomeEffect {
  [key: string]: unknown;
}

/** 결과 */
export interface DungeonOutcome {
  type?: string;
  effect?: DungeonOutcomeEffect;
  text: string;
}

/** 특수 오버라이드 */
export interface DungeonSpecialOverride {
  requiredSpecial: string;
  text: string;
  outcome: DungeonOutcome;
}

/** 선택지 */
export interface DungeonChoice {
  text: string;
  repeatable?: boolean;
  maxAttempts?: number;
  requirements?: DungeonChoiceRequirements;
  scalingRequirement?: DungeonScalingRequirement;
  specialOverrides?: DungeonSpecialOverride[];
  warningAtAttempt?: number;
  warningText?: string;
  progressText?: string[];
  outcomes: {
    success: DungeonOutcome;
    failure: DungeonOutcome;
  };
  screenEffect?: string;
  soundEffect?: string;
}

/** 플레이어 스탯 (던전용) */
export interface DungeonPlayerStats {
  strength?: number;
  agility?: number;
  insight?: number;
  energy?: number;
  specials?: string[];
  [key: string]: unknown;
}

/** 선택지 상태 */
export interface DungeonChoiceState {
  attempts?: number;
  completed?: boolean;
}

/** 인벤토리 */
export interface DungeonInventory {
  items?: string[];
  keys?: string[];
}

/** 선택 가능 결과 */
export interface DungeonCanSelectResult {
  canSelect: boolean;
  reason: string | null;
  isHidden: boolean;
  statRequired?: DungeonStatRequirement;
}

/** 선택 실행 결과 */
export interface DungeonExecuteResult {
  result: string;
  effect: DungeonOutcomeEffect;
  message: string;
  newState: DungeonChoiceState;
  isSpecial?: boolean;
  warning?: string | null;
  progressMessage?: string | null;
  canContinue?: boolean;
  screenEffect?: string;
  soundEffect?: string;
}

/** 선택지 표시 정보 */
export interface DungeonChoiceDisplayInfo {
  text: string;
  subtext: string;
  disabled: boolean;
  hidden: boolean;
  isSpecial?: boolean;
}

// ==================== 에러 로거 타입 ====================

/** 에러 컨텍스트 */
export interface ErrorContext {
  phase?: string;
  action?: string;
  componentName?: string;
  additionalInfo?: Record<string, unknown>;
}

/** 에러 로그 항목 */
export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  context?: ErrorContext;
  userAgent: string;
  url: string;
}

/** 에러 로거 설정 */
export interface ErrorLoggerConfig {
  maxEntries: number;
  storageKey: string;
  enableConsole: boolean;
}

// ==================== 전투 행동 시스템 타입 ====================

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

// ==================== 리듀서 액션 타입 ====================

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

/** 적 계획 */
export interface EnemyPlan {
  actions: Card[];
  mode: string | null;
}

// ==================== 훅 타입 ====================

/** 초기 상태 오버라이드 옵션 */
export interface BattleInitialStateOverrides {
  player?: Partial<PlayerBattleState>;
  enemy?: Partial<EnemyUnit>;
  orderedRelics?: Relic[];
  isSimplified?: boolean;
  sortType?: 'speed' | 'order';
  [key: string]: unknown;
}

// ==================== 애니메이션 시스템 타입 ====================

/** 에테르 계산 페이즈 (애니메이션) */
export type AnimEtherCalcPhase = 'sum' | 'multiply' | 'deflation' | 'result';

/** 디플레이션 정보 */
export interface DeflationInfo {
  multiplier: number;
  usageCount: number;
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

// ==================== UI 컴포넌트 타입 ====================

/** 페이즈 전투 상태 (UI 컴포넌트용) */
export interface PhaseBattle {
  phase: string;
}

/** 아이콘 컴포넌트 Props */
export interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

/** 토큰 상태 (UI용) */
export interface TokenState {
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

/** 토큰 엔티티 (UI용) */
export interface TokenEntity {
  tokens?: TokenState;
  [key: string]: unknown;
}

/** 타임라인 액션 */
export interface TimelineAction {
  sp: number;
  card: TimelineCard;
  actor?: string;
}

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

/** 타임라인 적 */
export interface TimelineEnemy {
  maxSpeed?: number;
}

/** 타임라인 전투 상태 */
export interface TimelineBattle {
  phase: string;
  queue?: TimelineAction[];
}

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
  block: number;
  strength?: number;
  etherMultiplier?: number;
  etherOverflow?: number;
  tokens?: TokenState;
}

/** HP바 적 상태 */
export interface HpBarEnemy {
  hp: number;
  maxHp: number;
  block: number;
  tokens?: TokenState;
  etherCapacity?: number;
}

/** 상태 정보 (툴팁용) */
export interface StatInfo {
  name: string;
  emoji: string;
  color: string;
  description: string;
}

/** 손패 카드 */
export interface HandCard {
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

/** 손패 유닛 */
export interface HandUnit {
  unitId: number;
  name: string;
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

/** 손패 액션 */
export interface HandAction {
  actor: 'player' | 'enemy';
  card: HandCard;
  speed?: number;
}

/** 콤보 정보 */
export interface ComboInfo {
  name: string;
  bonusKeys?: number[];
}

/** 디플레이션 (UI용) */
export interface UIDeflation {
  multiplier: number;
}

/** 상징 효과 (UI용) */
export interface UIRelicEffect {
  type?: string;
  etherCardMultiplier?: number;
  etherMultiplier?: number;
}

/** 상징 (UI용) */
export interface UIRelic {
  emoji: string;
  name: string;
  description: string;
  rarity: string;
  effects?: UIRelicEffect;
}

/** 상징 맵 */
export interface RelicsMap {
  [key: string]: UIRelic;
}

/** 상징 희귀도 상수 */
export interface RelicRarities {
  COMMON: string;
  RARE: string;
  SPECIAL: string;
  LEGENDARY: string;
}

/** 상징 표시 액션 */
export interface RelicDisplayActions {
  setRelicActivated: (relicId: string | null) => void;
}

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

/** 캐릭터 빌드 */
export interface CharacterBuild {
  mainSpecial?: string;
  subSpecial?: string;
}

// ==================== ItemSlots 컴포넌트 타입 ====================

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

/** 적 계획 (아이템 슬롯용) */
export interface ItemSlotsEnemyPlan {
  mode?: string;
  actions: ItemSlotsEnemyAction[];
  manuallyModified?: boolean;
}

/** 고정 순서 행동 */
export interface FixedOrderAction {
  actor: 'player' | 'enemy';
  card?: unknown;
}

/** 전투 참조 (아이템 슬롯용) */
export interface ItemSlotsBattleRef {
  phase?: string;
  player?: ItemSlotsPlayer;
  enemy?: ItemSlotsEnemy;
  enemyPlan?: ItemSlotsEnemyPlan;
  fixedOrder?: FixedOrderAction[];
  frozenOrder?: number;
}

/** 전투 액션 (아이템 슬롯용) */
export interface ItemSlotsBattleActions {
  setPlayer: (player: ItemSlotsPlayer) => void;
  setEnemy: (enemy: ItemSlotsEnemy) => void;
  addLog: (msg: string) => void;
  setEnemyPlan: (plan: ItemSlotsEnemyPlan) => void;
  setDestroyingEnemyCards?: (indices: number[]) => void;
  setFrozenOrder?: (order: number) => void;
  setFreezingEnemyCards?: (indices: number[]) => void;
  setFixedOrder?: (order: FixedOrderAction[]) => void;
}

// ==================== ExpectedDamagePreview 컴포넌트 타입 ====================

/** 예상 피해 플레이어 상태 */
export interface ExpectedDamagePlayer {
  hp: number;
  maxHp: number;
  block: number;
  [key: string]: unknown;
}

/** 예상 피해 적 상태 */
export interface ExpectedDamageEnemy {
  hp: number;
  maxHp: number;
  block: number;
  [key: string]: unknown;
}

/** 시뮬레이션 결과 */
export interface SimulationResult {
  pDealt: number | string;
  pTaken: number | string;
  finalEHp: number;
  finalPHp: number;
  lines?: string[];
}

/** 전투 후 옵션 */
export interface PostCombatOptions {
  type: 'victory' | 'defeat';
}

// ==================== CentralPhaseDisplay 컴포넌트 타입 ====================

/** 중앙 단계 표시 전투 상태 */
export interface CentralBattle {
  phase: string;
  selected: unknown[];
  queue: unknown[];
  qIndex: number;
}

/** 중앙 단계 표시 플레이어 상태 */
export interface CentralPlayer {
  etherPts: number;
}

/** 중앙 단계 표시 적 상태 */
export interface CentralEnemy {
  hp: number;
}

/** 중앙 단계 표시 액션 */
export interface CentralActions {
  setWillOverdrive: React.Dispatch<React.SetStateAction<boolean>>;
  setAutoProgress: (value: boolean) => void;
}

/** 대응 단계 스냅샷 */
export interface RespondSnapshot {
  selectedSnapshot: Card[];
  enemyActions: Array<{ [key: string]: unknown }>;
}

// ==================== BattleScreen 컴포넌트 타입 ====================

/** 패시브 효과 */
export interface BattlePassives {
  [key: string]: unknown;
}

/** 적 데이터 */
export interface BattleEnemyData {
  id?: string;
  name: string;
  emoji?: string;
  hp?: number;
  maxHp?: number;
  ether?: number;
  speed?: number;
  deck?: unknown[];
  cardsPerTurn?: number;
  passives?: BattlePassives;
  tier?: number;
  isBoss?: boolean;
}

/** 적 유닛 */
export interface BattleEnemyUnit {
  unitId: number;
  id?: string;
  name: string;
  emoji: string;
  count: number;
  hp: number;
  maxHp: number;
  ether: number;
  individualHp: number;
  individualMaxHp?: number;
  individualEther: number;
  speed: number;
  deck: unknown[];
  cardsPerTurn: number;
  individualCardsPerTurn: number;
  passives: BattlePassives;
  tier: number;
  isBoss?: boolean;
  block: number;
  tokens: TokenState;
}

/** 적 구성 */
export interface BattleEnemyComposition {
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  ether: number;
  cardsPerTurn?: number;
  passives?: BattlePassives;
  count: number;
}

/** 초기 플레이어 상태 */
export interface BattleInitialPlayer {
  hp?: number;
}

/** 초기 적 상태 */
export interface BattleInitialEnemy {
  hp?: number;
  deck?: unknown[];
  speed?: number;
  ether?: number;
}

/** 시뮬레이션 설정 */
export interface BattleSimulation {
  initialState?: {
    player?: BattleInitialPlayer;
    enemy?: BattleInitialEnemy;
  };
}

/** 전투 데이터 */
export interface BattleData {
  nodeId?: string;
  kind?: string;
  label?: string;
  enemyCount?: number;
  simulation?: BattleSimulation;
  mixedEnemies?: BattleEnemyData[];
  enemies?: string[];
}

/** 전투 페이로드 */
export interface BattlePayload {
  player: {
    hp: number;
    maxHp: number;
    energy: number;
    maxEnergy: number;
    block: number;
    strength: number;
    insight: number;
    maxSpeed: number;
    etherPts: number;
  };
  enemy: {
    name: string;
    hp: number;
    maxHp: number;
    deck: unknown[];
    composition: BattleEnemyComposition[];
    etherPts: number;
    etherCapacity: number;
    enemyCount: number;
    maxSpeed: number;
    passives: BattlePassives;
    cardsPerTurn: number;
    ether: number;
    units: BattleEnemyUnit[];
  };
}

/** 전투 결과 */
export interface BattleResult {
  result: 'victory' | 'defeat';
  playerEther: number;
  deltaEther?: number;
  playerHp: number;
  playerMaxHp: number;
}

// ==================== BattleContext 컴포넌트 타입 ====================

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

// ==================== BattleTab 컴포넌트 타입 ====================

/** 이상현상 타입 */
export interface AnomalyType {
  id: string;
  name: string;
  emoji: string;
  color: string;
  getEffect: (level: number) => { description: string };
}

/** 강제 이상현상 */
export interface ForcedAnomaly {
  anomalyId: string;
  level: number;
}

/** 활성 전투 */
export interface ActiveBattle {
  label: string;
  kind: string;
  difficulty: string;
}

/** 적 그룹 */
export interface EnemyGroup {
  id: string;
  name: string;
  tier: number;
  enemies: string[];
}

// ==================== CardManagementModal 컴포넌트 타입 ====================

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
  traits?: unknown[];
  _displayKey?: string;
  _type?: string;
}

// ==================== BreachSelectionModal 컴포넌트 타입 ====================

/** 브리치 모달 카드 */
export interface BreachCard {
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

/** 브리치 카드 정보 */
export interface BreachCardInfo {
  breachSpOffset?: number;
}

/** 브리치 선택 상태 */
export interface BreachSelection {
  cards: BreachCard[];
  breachSp: number;
  breachCard: BreachCardInfo | null;
  sourceCardName: string | null;
  isLastChain?: boolean;
}

// ==================== BattleTooltips 컴포넌트 타입 ====================

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
  card: TooltipCard;
  x: number;
  y: number;
}

/** 툴팁 전투 상태 */
export interface TooltipBattle {
  phase: string;
}

// ==================== RecallSelectionModal 컴포넌트 타입 ====================

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

// ==================== CharacterSheet 컴포넌트 타입 ====================

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

// ==================== MapTab 컴포넌트 타입 ====================

/** 맵 노드 */
export interface MapNode {
  id: string;
  layer?: number;
  type: string;
  displayLabel?: string;
  cleared?: boolean;
}

/** 게임 맵 */
export interface GameMap {
  nodes?: MapNode[];
  currentNodeId?: string;
}

// ==================== CardsTab 컴포넌트 타입 ====================

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

// ==================== EnemyUnitsDisplay 컴포넌트 타입 ====================

/** 적 유닛 (UI용) */
export interface EnemyUnitUI {
  unitId: number;
  name: string;
  emoji?: string;
  hp: number;
  maxHp: number;
  block?: number;
  count?: number;
  tokens?: TokenState;
}

// ==================== DevTools 탭 타입 ====================

/** 게임 자원 */
export interface GameResources {
  gold: number;
  intel: number;
  loot: number;
  material: number;
  aether: number;
  memory: number;
  [key: string]: number;
}

/** 상징 데이터 (Dev용) */
export interface RelicData {
  id: string;
  name: string;
  description: string;
  rarity: string;
  tags?: string[];
}

/** 아이템 데이터 (Dev용) */
export interface DevItem {
  id: string;
  name: string;
  icon: string;
  tier: number;
  usableIn: 'combat' | 'any';
  description: string;
}

/** 이벤트 정의 */
export interface EventDefinition {
  title?: string;
  description?: string;
  multiStage?: boolean;
}

/** 이벤트 정보 */
export interface EventInfo {
  id: string;
  title: string;
  description: string;
  multiStage: boolean;
}

// ==================== DevTools 컴포넌트 타입 ====================

/** DevTools 탭 정보 */
export interface DevToolsTab {
  id: string;
  label: string;
  icon: string;
}

// ==================== EtherBar 컴포넌트 타입 ====================

/** 에테르 바 액션 */
export interface EtherBarActions {
  setShowBarTooltip: (show: boolean) => void;
  setShowPtsTooltip: (show: boolean) => void;
}

// ==================== EtherComparisonBar 컴포넌트 타입 ====================

/** 에테르 비교 바 전투 상태 */
export interface EtherComparisonBattle {
  phase: string;
}

// ==================== CardRewardModal 컴포넌트 타입 ====================

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

// ==================== CardStatsSidebar 컴포넌트 타입 ====================

/** 스탯 사이드바 카드 */
export interface SidebarCard {
  damage?: number | null;
  block?: number | null;
  counter?: number;
  speedCost: number;
  hits?: number;
}
