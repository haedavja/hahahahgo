/**
 * @file battleReducerState.ts
 * @description 전투 상태 초기값 정의
 *
 * ## 상태 구조
 * - player/enemy: 유닛 상태
 * - phase: 전투 페이즈
 * - hand/selected: 카드 관리
 * - ether: 에테르 시스템
 */

import type {
  Card,
  TokenState,
  Relic,
  RespondSnapshot,
  BattleEvent,
  PostCombatOptions,
  EnemyPlan,
  NextTurnEffects,
  PreviewDamage,
  InsightBadge,
  ReducerPlayerState,
  ReducerEnemyState,
  ReducerEnemyUnitState,
  DeflationInfo,
  OrderItem,
  HoveredCard,
  HoveredEnemyAction
} from '../../../types';
import type { BattlePhase, SortType, EtherCalcPhase } from './battleReducerActions';

// 중앙 타입에서 재export
export type PlayerState = ReducerPlayerState;
export type EnemyState = ReducerEnemyState;
export type EnemyUnitState = ReducerEnemyUnitState;
export type { EnemyPlan, NextTurnEffects, PreviewDamage, InsightBadge };

/** 전체 전투 상태 */
export interface FullBattleState {
  // 플레이어 & 적 상태
  player: PlayerState;
  enemy: EnemyState;
  enemyIndex: number;
  selectedTargetUnit: number;

  // 전투 페이즈
  phase: BattlePhase;

  // 카드 관리
  hand: Card[];
  selected: Card[];
  canRedraw: boolean;
  sortType: SortType;
  vanishedCards: Card[];
  usedCardIndices: number[];
  disappearingCards: number[];
  hiddenCards: number[];
  disabledCardIndices: number[];
  cardUsageCount: Record<string, number>;

  // 덱/무덤 시스템
  deck: Card[];
  discardPile: Card[];

  // 적 계획
  enemyPlan: EnemyPlan;

  // 실행 큐 & 순서
  fixedOrder: OrderItem[] | null;
  queue: OrderItem[];
  qIndex: number;

  // 전투 로그 & 이벤트
  log: string[];
  actionEvents: Record<string, BattleEvent[]>;

  // 턴 관리
  turnNumber: number;

  // 에테르 시스템
  turnEtherAccumulated: number;
  enemyTurnEtherAccumulated: number;
  netEtherDelta: number | null;
  etherAnimationPts: number | null;
  etherFinalValue: number | null;
  enemyEtherFinalValue: number | null;
  etherCalcPhase: EtherCalcPhase;
  enemyEtherCalcPhase: EtherCalcPhase;
  currentDeflation: DeflationInfo | null;
  enemyCurrentDeflation: DeflationInfo | null;
  etherPulse: boolean;
  playerTransferPulse: boolean;
  enemyTransferPulse: boolean;

  // 기원(Overdrive) 연출
  willOverdrive: boolean;
  playerOverdriveFlash: boolean;
  enemyOverdriveFlash: boolean;
  soulShatter: boolean;

  // 타임라인
  timelineProgress: number;
  timelineIndicatorVisible: boolean;
  executingCardIndex: number | null;

  // UI 상태
  isSimplified: boolean;
  showCharacterSheet: boolean;
  showPtsTooltip: boolean;
  showBarTooltip: boolean;

  // 상징
  orderedRelics: Relic[];

  // 전투 종료 후
  postCombatOptions: PostCombatOptions | null;

  // 다음 턴 효과
  nextTurnEffects: NextTurnEffects;

  // 애니메이션
  playerHit: boolean;
  enemyHit: boolean;
  playerBlockAnim: boolean;
  enemyBlockAnim: boolean;

  // 자동진행 & 스냅샷
  autoProgress: boolean;
  resolveStartPlayer: PlayerState | null;
  resolveStartEnemy: EnemyState | null;
  respondSnapshot: RespondSnapshot | null;
  rewindUsed: boolean;

  // 상징 UI
  hoveredRelic: string | null;
  relicActivated: string | null;
  activeRelicSet: Set<string>;
  multiplierPulse: boolean;

  // 전투 진행
  resolvedPlayerCards: number;

  // 카드 툴팁
  hoveredCard: HoveredCard | null;
  tooltipVisible: boolean;
  previewDamage: PreviewDamage;
  perUnitPreviewDamage: Record<number, PreviewDamage>;

  // 통찰 시스템
  insightBadge: InsightBadge;
  insightAnimLevel: number;
  insightAnimPulseKey: number;
  showInsightTooltip: boolean;

  // 적 행동 툴팁
  hoveredEnemyAction: HoveredEnemyAction | null;

  // 카드 파괴/빙결 애니메이션
  destroyingEnemyCards: number[];
  freezingEnemyCards: number[];
  frozenOrder: number;

  // 피해 분배 시스템
  distributionMode: boolean;
  pendingDistributionCard: Card | null;
  damageDistribution: Record<number, number>;
  totalDistributableDamage: number;
}

/** 초기 상태 생성 옵션 */
export interface CreateInitialStateOptions {
  initialPlayerState: PlayerState;
  initialEnemyState: EnemyState;
  initialPlayerRelics?: Relic[];
  simplifiedMode?: boolean;
  sortType?: SortType;
}

/**
 * 초기 상태 생성 함수
 */
export const createInitialState = ({
  initialPlayerState,
  initialEnemyState,
  initialPlayerRelics = [],
  simplifiedMode = false,
  sortType = 'cost'
}: CreateInitialStateOptions): FullBattleState => ({
  // === 플레이어 & 적 상태 ===
  player: initialPlayerState,
  enemy: initialEnemyState,
  enemyIndex: 0,
  selectedTargetUnit: 0,

  // === 전투 페이즈 ===
  phase: 'select',

  // === 카드 관리 ===
  hand: [],
  selected: [],
  canRedraw: true,
  sortType: sortType,
  vanishedCards: [],
  usedCardIndices: [],
  disappearingCards: [],
  hiddenCards: [],
  disabledCardIndices: [],
  cardUsageCount: {},

  // === 덱/무덤 시스템 ===
  deck: [],
  discardPile: [],

  // === 적 계획 ===
  enemyPlan: { actions: [], mode: null },

  // === 실행 큐 & 순서 ===
  fixedOrder: null,
  queue: [],
  qIndex: 0,

  // === 전투 로그 & 이벤트 ===
  log: ["게임 시작!"],
  actionEvents: {},

  // === 턴 관리 ===
  turnNumber: 1,

  // === 에테르 시스템 ===
  turnEtherAccumulated: 0,
  enemyTurnEtherAccumulated: 0,
  netEtherDelta: null,

  // 에테르 애니메이션
  etherAnimationPts: null,
  etherFinalValue: null,
  enemyEtherFinalValue: null,
  etherCalcPhase: null,
  enemyEtherCalcPhase: null,
  currentDeflation: null,
  enemyCurrentDeflation: null,
  etherPulse: false,
  playerTransferPulse: false,
  enemyTransferPulse: false,

  // === 기원(Overdrive) 연출 ===
  willOverdrive: false,
  playerOverdriveFlash: false,
  enemyOverdriveFlash: false,
  soulShatter: false,

  // === 타임라인 ===
  timelineProgress: 0,
  timelineIndicatorVisible: true,
  executingCardIndex: null,

  // === UI 상태 ===
  isSimplified: simplifiedMode,
  showCharacterSheet: false,
  showPtsTooltip: false,
  showBarTooltip: false,

  // === 상징 ===
  orderedRelics: initialPlayerRelics,

  // === 전투 종료 후 ===
  postCombatOptions: null,

  // === 다음 턴 효과 ===
  nextTurnEffects: {
    player: {},
    enemy: {}
  },

  // === 애니메이션 ===
  playerHit: false,
  enemyHit: false,
  playerBlockAnim: false,
  enemyBlockAnim: false,

  // === 자동진행 & 스냅샷 ===
  autoProgress: false,
  resolveStartPlayer: null,
  resolveStartEnemy: null,
  respondSnapshot: null,
  rewindUsed: false,

  // === 상징 UI ===
  hoveredRelic: null,
  relicActivated: null,
  activeRelicSet: new Set(),
  multiplierPulse: false,

  // === 전투 진행 ===
  resolvedPlayerCards: 0,

  // === 카드 툴팁 ===
  hoveredCard: null,
  tooltipVisible: false,
  previewDamage: { value: 0, lethal: false, overkill: false },
  perUnitPreviewDamage: {},

  // === 통찰 시스템 ===
  insightBadge: {
    level: 0,
    dir: 'up',
    show: false,
    key: 0,
  },
  insightAnimLevel: 0,
  insightAnimPulseKey: 0,
  showInsightTooltip: false,

  // === 적 행동 툴팁 ===
  hoveredEnemyAction: null,

  // === 카드 파괴 애니메이션 ===
  destroyingEnemyCards: [],

  // === 카드 빙결 애니메이션 ===
  freezingEnemyCards: [],

  // === 빙결 순서 카운터 ===
  frozenOrder: 0,

  // === 피해 분배 시스템 ===
  distributionMode: false,
  pendingDistributionCard: null,
  damageDistribution: {},
  totalDistributableDamage: 0,
});
