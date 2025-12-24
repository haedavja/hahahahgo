/**
 * @file battleReducerState.js
 * @description 전투 상태 초기값 정의
 *
 * ## 상태 구조
 * - player/enemy: 유닛 상태
 * - phase: 전투 페이즈
 * - hand/selected: 카드 관리
 * - ether: 에테르 시스템
 */

/**
 * 초기 상태 생성 함수
 */
export const createInitialState = ({
  initialPlayerState,
  initialEnemyState,
  initialPlayerRelics = [],
  simplifiedMode = false,
  sortType = 'cost'
}) => ({
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
