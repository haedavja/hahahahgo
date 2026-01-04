/**
 * @file game-types.ts
 * @description 실제 게임과 동기화된 타입 정의
 *
 * 이 파일은 실제 게임 데이터 구조를 그대로 반영합니다.
 */

// ==================== 카드 타입 ====================

export type CardType = 'attack' | 'defense' | 'general' | 'move' | 'reaction' | 'support' | 'skill';
export type CardPriority = 'quick' | 'normal' | 'slow' | 'instant';
export type CardCategory = 'fencing' | 'gun' | 'special' | 'basic';

export interface AppliedToken {
  id: string;
  target: 'player' | 'enemy' | 'self';
  stacks?: number;
}

/** 효과값 추적 (토큰/아이템/상징 등의 실제 효과 기록) */
export interface EffectValueRecord {
  /** 사용/발동 횟수 */
  count: number;
  /** 총 피해 기여량 */
  totalDamage: number;
  /** 총 방어 기여량 */
  totalBlock: number;
  /** 총 회복량 */
  totalHealing: number;
  /** 총 에테르 획득량 */
  totalEther: number;
  /** 기타 효과 (키: 효과명, 값: 누적값) */
  otherEffects: Record<string, number>;
}

export interface RequiredToken {
  id: string;
  stacks: number;
}

export interface CrossBonus {
  type:
    | 'damage_mult'      // 피해 배수
    | 'gun_attack'       // 추가 사격
    | 'block_mult'       // 방어력 배수
    | 'advance'          // 타임라인 앞당김
    | 'push'             // 넉백
    | 'push_gain_block'  // 밀어내고 방어 획득
    | 'add_tokens'       // 토큰 추가
    | 'intercept_upgrade' // 요격 강화
    | 'destroy_card'     // 카드 파괴
    | 'guaranteed_crit'; // 확정 치명타
  value?: number;
  count?: number;
  maxPush?: number;
  tokens?: { id: string; stacks: number; target: 'player' | 'enemy' }[];
  // 조건부 보너스
  condition?: 'after_attack' | 'after_defense' | 'after_skill' | string;
  damage?: number;
  block?: number;
}

export interface GameCard {
  id: string;
  name: string;
  type: CardType;
  damage?: number;
  block?: number;
  hits?: number;
  speedCost: number;
  actionCost: number;
  priority?: CardPriority;
  iconKey?: string;
  description: string;
  traits?: string[];
  cardCategory?: CardCategory;
  special?: string | string[];
  advanceAmount?: number;
  pushAmount?: number;
  appliedTokens?: AppliedToken[];
  requiredTokens?: RequiredToken[];
  crossBonus?: CrossBonus;
  tags?: string[];
  // 강화 관련
  enhancementLevel?: number;
  specializations?: string[];
  // 포커 조합 관련
  suit?: string;
  value?: string | number;
  // 연계 시스템
  chainSpeedReduction?: number;
  followupDamageBonus?: number;
  followupBlockBonus?: number;
  finisherDamageBonus?: number;
  consumeFinesse?: boolean;
  isGhost?: boolean;
  // 전투 특성
  parryRange?: number;
  ignoreBlock?: boolean;
  energyCost?: number;
  parryPushAmount?: number;
  doubleEdgeSelfDamage?: number;
  doubleEdgeBonusDamage?: number;
  creationEffect?: string;
  effects?: {
    lifesteal?: number;
    [key: string]: unknown;
  };
  category?: CardCategory;
}

// ==================== 토큰 타입 ====================

export type TokenType = 'usage' | 'turn' | 'permanent';
export type TokenCategory = 'positive' | 'negative' | 'neutral';

export interface TokenEffect {
  type: string;
  value: number;
  advance?: number;
}

export interface GameToken {
  id: string;
  name: string;
  type: TokenType;
  category: TokenCategory;
  emoji: string;
  description: string;
  effect: TokenEffect;
}

// ==================== 상징 타입 ====================

export type RelicRarity = 'common' | 'rare' | 'special' | 'legendary' | 'dev';
export type RelicEffectType =
  | 'PASSIVE'
  | 'ON_COMBAT_START'
  | 'ON_COMBAT_END'
  | 'ON_TURN_START'
  | 'ON_TURN_END'
  | 'ON_CARD_PLAYED'
  | 'ON_DAMAGE_TAKEN'
  | 'ON_CARD_DRAW'
  | 'ON_NODE_MOVE';

export interface RelicConditionState {
  cardsPlayedThisTurn?: number;
  playerHp?: number;
  maxHp?: number;
  allCardsDefense?: boolean;
  allCardsLowCost?: boolean;
  timesAttackedThisTurn?: number;
}

export interface RelicEffects {
  type: RelicEffectType;
  // 패시브 효과
  maxEnergy?: number;
  maxHp?: number;
  strength?: number;
  agility?: number;
  maxSpeed?: number;
  maxSubmitCards?: number;
  subSpecialSlots?: number;
  mainSpecialSlots?: number;
  cardDrawBonus?: number;
  etherMultiplier?: number;
  comboMultiplierPerCard?: number;
  negativeTraitMultiplier?: number;
  etherFiveCardBonus?: number;
  etherCardMultiplier?: boolean;
  // 트리거 효과
  block?: number;
  heal?: number;
  damage?: number;
  energyNextTurn?: number;
  blockNextTurn?: number;
  healNextTurn?: number;
  maxHpIfFull?: number;
  healIfDamaged?: number;
  etherPercent?: number;
  condition?: (state: RelicConditionState) => boolean;
}

export interface GameRelic {
  id: string;
  name: string;
  emoji: string;
  rarity: RelicRarity;
  tags: string[];
  description: string;
  effects: RelicEffects;
}

// ==================== 특성 타입 ====================

export interface GameTrait {
  id: string;
  name: string;
  type: 'positive' | 'negative';
  weight: number;
  description: string;
}

// ==================== 적 타입 ====================

export interface EnemyPattern {
  hpThreshold: number;
  pattern: string[];
  description: string;
}

export interface GameEnemyPassives {
  /** 전투 시작 시 장막 (통찰 차단) */
  veilAtStart?: boolean;
  /** 매턴 체력 회복량 */
  healPerTurn?: number;
  /** 매턴 힘 증가량 */
  strengthPerTurn?: number;
  /** 전투 시작 시 치명타율 증가 */
  critBoostAtStart?: number;
  /** 50% HP에서 소환 */
  summonOnHalfHp?: boolean;
  /** 피격시 반격 */
  counterOnHit?: boolean;
  /** 피해 반사 */
  reflectDamage?: number;
}

export interface GameEnemy {
  id: string;
  name: string;
  tier: number;
  hp: number;
  maxHp: number;
  maxSpeed: number;
  cardsPerTurn: number;
  deck: string[];
  patterns?: EnemyPattern[];
  passives?: GameEnemyPassives;
  description?: string;
  emoji?: string;
  isBoss?: boolean;
  ether?: number;
  speed?: number;
  block?: number;
  tokens?: TokenState;
}

// ==================== 전투 상태 타입 ====================

export interface TimelineCard {
  cardId: string;
  owner: 'player' | 'enemy';
  /** 타임라인 위치 (레거시 - sp와 동일) */
  position: number;
  /** 스피드 포인트 - 게임과 동일한 필드명 */
  sp?: number;
  crossed?: boolean;
  executed?: boolean;
  /** 카드 데이터 참조 */
  card?: GameCard;
}

export interface TokenState {
  [tokenId: string]: number;
}

export interface CombatantState {
  hp: number;
  maxHp: number;
  block: number;
  tokens: TokenState;
  maxSpeed: number;
}

export interface PlayerState extends CombatantState {
  energy: number;
  maxEnergy: number;
  strength: number;
  agility: number;
  ether: number;
  gold: number;                   // 골드 (날강도 특성용)
  hand: string[];
  deck: string[];
  discard: string[];
  relics: string[];
  items?: string[];               // 소모성 아이템 목록
  insight: number;
  // 특성 시스템 관련
  repeatCards?: string[];         // 다음 턴 손패 확정 등장
  escapeCards?: string[];         // 다음 턴 손패 제외
  etherBlocked?: boolean;         // 에테르 획득 불가 (망각)
  mainSpecialtyOnly?: boolean;    // 다음 턴 주특기만 등장 (파탄)
  supportSpecialtyBonus?: number; // 보조특기 등장률 보너스 (장군)
  // 특수 효과 시스템
  repeatTimelineNext?: boolean;   // 다음 턴 타임라인 반복 (르 송쥬)
  blockPerCardExecution?: number; // 카드 실행마다 방어력 획득
  repeatTimelineCards?: string[]; // 반복할 카드 ID 목록
  // 아이템 시스템
  etherMultiplier?: number;       // 에테르 획득 배율 (아이템 효과)
  frozenTurns?: number;           // 적 타임라인 동결 턴 수
  // 호환성 필드
  etherPts?: number;              // 에테르 포인트 (리듀서 호환)
  cardEnhancements?: Record<string, number>; // 카드 강화 정보
  speed?: number;                 // 현재 스피드 (시뮬레이터 호환)
}

// ==================== 다중 적 유닛 타입 ====================

export interface EnemyUnit {
  unitId: number;
  id?: string;
  name?: string;
  hp: number;
  maxHp: number;
  block?: number;
  tokens?: TokenState;
  deck?: string[];
  cardsPerTurn?: number;
  emoji?: string;
  passives?: EnemyPassives;
  hasSummoned?: boolean;
}

export interface EnemyPassives extends GameEnemyPassives {}

// ==================== 은총 시스템 (게임과 동일) ====================

/** 기원 타입 */
export type PrayerType = 'immunity' | 'blessing' | 'healing' | 'offense' | 'veil';

/** 몬스터 은총 상태 */
export interface GraceState {
  /** 현재 은총 포인트 */
  gracePts: number;
  /** 영혼 보호막 (면역 기원) */
  soulShield: number;
  /** 가호 남은 턴 */
  blessingTurns: number;
  /** 가호 보너스율 (%) */
  blessingBonus: number;
  /** 사용 가능한 기원 목록 */
  availablePrayers: PrayerType[];
  /** 이번 턴 사용한 기원 */
  usedPrayersThisTurn: PrayerType[];
}

export interface EnemyState extends CombatantState {
  id: string;
  name: string;
  cardsPerTurn: number;
  deck: string[];
  pattern?: string;
  /** 다중 유닛 지원 */
  units?: EnemyUnit[];
  /** 패시브 효과 */
  passives?: EnemyPassives;
  /** 소환 발동 여부 */
  hasSummoned?: boolean;
  /** 에테르 포인트 (호환) */
  etherPts?: number;
  /** 힘 (호환) */
  strength?: number;
  /** 에테르 (호환) */
  ether?: number;
  /** 은총 상태 */
  graceState?: GraceState;
  /** 속도 (호환) */
  speed?: number;
  /** 보스 여부 */
  isBoss?: boolean;
  /** 이모지 */
  emoji?: string;
  /** 타임라인 반복 (호환) */
  repeatTimelineNext?: boolean;
  /** 카드당 방어 (호환) */
  blockPerCardExecution?: number;
  /** 손패 (적 AI용) */
  hand?: string[];
  /** 티어 */
  tier?: number;
}

export interface GameBattleState {
  player: PlayerState;
  enemy: EnemyState;
  turn: number;
  phase: 'select' | 'respond' | 'resolve' | 'end' | 'action';
  timeline: TimelineCard[];
  anomalyId?: string;
  battleLog: string[];
  // 특성 시스템 관련
  masteryUseCount?: Record<string, number>;  // 카드별 숙련 사용 횟수
  vanishedCards?: string[];                   // 게임에서 제외된 카드 (소멸)
  // 피해량 추적
  playerDamageDealt?: number;                 // 플레이어가 가한 피해
  enemyDamageDealt?: number;                  // 적이 가한 피해
  // 통계 추적
  cardUsage?: Record<string, number>;         // 카드별 사용 횟수
  tokenUsage?: Record<string, number>;        // 토큰별 적용 횟수
  tokenEffects?: Record<string, EffectValueRecord>;  // 토큰별 효과값 추적
  itemEffects?: Record<string, EffectValueRecord>;   // 아이템별 효과값 추적
  relicEffects?: Record<string, EffectValueRecord>;  // 상징별 효과값 추적
  // 에테르 콤보 시스템
  comboUsageCount?: Record<string, number>;   // 콤보별 사용 횟수 (디플레이션용)
  currentComboKeys?: Set<number>;             // 현재 턴 콤보에 포함된 actionCost 값들
  currentComboRank?: number;                  // 현재 턴 콤보 등급 (0=하이카드)
  // 연계 시스템
  ghostCards?: string[];                       // 고스트 카드 ID (연계용)
  // 성장 시스템 보너스
  growthBonuses?: {
    crossRangeBonus?: number;
    logosEffects?: {
      expandCrossRange?: boolean;
      blockToShoot?: boolean;
      reduceJamChance?: boolean;
      gunCritBonus?: number;
      gunCritReload?: boolean;
      minFinesse?: boolean;
      armorPenetration?: number;
      combatTokens?: boolean;
    };
  };
}

// ==================== 타임라인 시스템 ====================

export interface TimelineConfig {
  maxSpeed: number;
  tickInterval: number;
}

export function generateSpeedTicks(maxSpeed: number, tickInterval: number = 5): number[] {
  return Array.from(
    { length: Math.floor(maxSpeed / tickInterval) + 1 },
    (_, idx) => idx * tickInterval
  );
}

// ==================== 전투 이벤트 ====================

export type BattleEventType =
  | 'battle_start'
  | 'turn_start'
  | 'card_select'
  | 'card_respond'
  | 'timeline_resolve'
  | 'card_execute'
  | 'damage_dealt'
  | 'block_gained'
  | 'token_applied'
  | 'token_removed'
  | 'counter_triggered'
  | 'counter_shot_triggered'
  | 'cross_triggered'
  | 'chain_triggered'
  | 'special_triggered'
  | 'turn_end'
  | 'battle_end';

export interface BattleEvent {
  type: BattleEventType;
  turn: number;
  actor?: 'player' | 'enemy';
  cardId?: string;
  value?: number;
  data?: Record<string, unknown>;
  message?: string;
}

// ==================== 시뮬레이션 결과 ====================

export interface BattleResult {
  winner: 'player' | 'enemy' | 'draw';
  turns: number;
  playerDamageDealt: number;
  enemyDamageDealt: number;
  playerFinalHp: number;
  enemyFinalHp: number;
  etherGained: number;
  goldChange: number;  // 골드 변화량 (날강도 등)
  battleLog: string[];
  events: BattleEvent[];
  cardUsage: Record<string, number>;
  comboStats: Record<string, number>;
  tokenStats: Record<string, number>;
  tokenEffectStats?: Record<string, EffectValueRecord>;  // 토큰별 효과값
  itemEffectStats?: Record<string, EffectValueRecord>;   // 아이템별 효과값
  relicEffectStats?: Record<string, EffectValueRecord>;  // 상징별 효과값
  timeline: TimelineCard[];
  victory?: boolean;
  battleId?: string;
  enemyId?: string;
  /** 영혼파괴 여부 (에테르로 승리) */
  isEtherVictory?: boolean;
  // 호환성 별칭
  totalDamageDealt?: number;
  playerHealth?: number;
  enemyHealth?: number;
  log?: string[];
}

export interface SimulationSummary {
  totalBattles: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  avgTurns: number;
  avgPlayerDamage: number;
  avgEnemyDamage: number;
  avgEtherGained: number;
  cardEfficiency: Record<string, { uses: number; avgDamage: number }>;
  tokenUsage: Record<string, number>;
  /** 토큰별 효과 통계 (사용 횟수, 평균 효과값) */
  tokenEffectSummary?: Record<string, { count: number; avgEffect: number }>;
  /** 아이템별 효과 통계 */
  itemEffectSummary?: Record<string, { count: number; avgEffect: number }>;
  /** 상징별 효과 통계 */
  relicEffectSummary?: Record<string, { count: number; avgEffect: number }>;
}
