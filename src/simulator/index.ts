/**
 * @file index.ts
 * @description 시뮬레이터 모듈 통합 - 모든 기능을 하나의 진입점으로 제공
 *
 * ## 기능 목록
 *
 * ### 병렬 처리 (10-100배 속도 향상)
 * - WorkerPool: 멀티스레드 시뮬레이션
 * - runParallelSimulation: 간편한 병렬 실행
 *
 * ### 데이터 관리
 * - JSON 설정 파일 (cards.json, enemies.json, presets.json)
 * - loadCards, loadEnemies, loadPresets: 데이터 로더
 *
 * ### 결과 시각화
 * - HtmlReportGenerator: 인터랙티브 HTML 리포트
 * - generateQuickReport: 빠른 리포트 생성
 *
 * ### 데이터 영속성
 * - JsonStorage / SqliteStorage: 히스토리 저장
 * - 쿼리 및 집계 기능
 *
 * ### 밸런스 분석
 * - BalanceAnalyzer: 카드 밸런스 자동 추천
 * - 승률 기반 버프/너프 제안
 *
 * ### A/B 테스트
 * - ABTestManager: 패치 전/후 비교
 * - 통계적 유의성 검증
 *
 * ### AI 최적 플레이
 * - MCTSEngine: Monte Carlo Tree Search
 * - MCTSPlayer: AI 플레이어
 *
 * ### 실시간 모니터링
 * - DashboardServer: WebSocket 대시보드
 * - 실시간 진행 상황 표시
 *
 * ### CI/CD 통합
 * - BalanceChecker: PR별 밸런스 체크
 * - GitHub Actions 연동
 */

// ==================== Core Types (시뮬레이터 표준 타입) ====================
// game-types와 types에서 필요한 타입만 명시적으로 export
export type {
  // 카드 타입
  CardType,
  CardPriority,
  CardCategory,
  AppliedToken,
  RequiredToken,
  CrossBonus,
  GameCard,
  // 토큰 타입
  TokenType,
  TokenCategory,
  TokenState,
  // 적 타입
  EnemyPassives,
  EnemyUnit,
  EnemyState,
  // 플레이어 타입
  CombatantState,
  PlayerState,
  // 전투 타입
  TimelineCard,
  GameBattleState,
} from './core/game-types';

export type {
  // 시뮬레이션 타입
  SimEntity,
  SimPlayerState,
  SimEnemyState,
  BattleResult,
  SimulationConfig,
  SimulationResult,
  SimulationSummary,
  // 워커 타입
  WorkerTask,
  WorkerResult,
  // 게임 상태
  GameState,
} from './core/types';

// 값 export (상수, 클래스 등)
export {
  DEFAULT_CONSTANTS,
  configureConstants,
  getConstants,
} from './core/battle-engine';

// ==================== Parallel Processing ====================
export { WorkerPool, runParallelSimulation, runQuickSimulation, type PoolOptions, type PoolStats } from './parallel/pool';

// ==================== Data Loading ====================
export {
  loadCards,
  loadEnemies,
  loadPresets,
  loadTiers,
  getCard,
  getEnemy,
  getPreset,
  getEnemiesByTier,
  getAllCardIds,
  getAllEnemyIds,
  getAllPresetIds,
  saveCards,
  saveEnemies,
  savePresets,
  validateDeck,
  validateEnemy,
  getDataStats,
  clearCache,
  type CardData,
  type EnemyData,
  type PresetData,
} from './data/loader';

// ==================== HTML Reports ====================
export {
  HtmlReportGenerator,
  generateQuickReport,
  generateABReport,
  type ReportOptions,
} from './reports/html';

// ==================== Data Persistence ====================
export {
  JsonStorage,
  SqliteStorage,
  createStorage,
  getDefaultStorage,
  setDefaultStorage,
  type StorageAdapter,
  type StorageStats,
  type StorageType,
} from './persistence/storage';

// ==================== Balance Analysis ====================
export {
  BalanceAnalyzer,
  SimpleBalanceSimulator,
  generateBalanceRecommendations,
  type BalanceAnalyzerOptions,
  type SimulatorInterface,
} from './analysis/balance';

// ==================== A/B Testing ====================
export {
  ABTestManager,
  createPatchChange,
  printABTestResult,
  type ABTestOptions,
  type CardPatchChange,
} from './analysis/abtest';

// ==================== Monte Carlo Tree Search ====================
export {
  MCTSEngine,
  MCTSPlayer,
  benchmarkMCTS,
  type MCTSOptions,
  type MCTSResult,
  type MCTSStats,
  type MCTSGameResult,
} from './analysis/mcts';

// ==================== Dashboard ====================
export {
  DashboardServer,
  startDashboard,
  type DashboardServerOptions,
} from './dashboard/server';

// ==================== CI/CD Balance Check ====================
export {
  BalanceChecker,
  runBalanceCheck,
  type BalanceCheckConfig,
} from './ci/balance-check';

// ==================== A/B Test Automation ====================
export {
  ABTestAutomation,
  createABTestAutomation,
  runABTestCLI,
  type CardChange,
  type ABAutoTestResult,
  type ImpactAssessment,
  type AutoTestConfig,
} from './ci/ab-test-automation';

// ==================== Skill Level AI ====================
export {
  SkillLevelAI,
  createSkillLevelAI,
  getSkillLevelConfig,
  getAllSkillLevels,
  type SkillLevel,
  type SkillLevelConfig,
  type CardDecision,
  type SkillLevelStats,
} from './ai/skill-level-ai';

// ==================== Unified Battle Engine ====================
export {
  UnifiedBattleEngine,
  getUnifiedBattleEngine,
  createUnifiedBattleEngine,
  type UnifiedBattleConfig,
  type UnifiedBattleResult,
  type BatchBattleConfig,
  type BatchBattleResult,
} from './core/unified-battle-engine';

// ==================== Battle Log Validation ====================
export {
  BattleLogValidator,
  BattleLogCollector,
  createBattleLogValidator,
  validateBattleLogs,
  type GameBattleLog,
  type TurnAction,
  type ValidationResult,
  type BatchValidationResult,
} from './validation/battle-log-validator';

// ==================== MCTS Worker Pool ====================
export {
  MCTSWorkerPool,
  getMCTSWorkerPool,
  terminateMCTSWorkerPool,
  type MCTSWorkerTask,
  type MCTSWorkerResult,
  type PoolConfig,
} from './parallel/mcts-worker-pool';

// ==================== Battle Engine ====================
export {
  BattleEngine,
  TOKENS,
  COMBO_RANKS,
  calculateDamage,
  calculateBlock,
  detectCombo,
  type BattleEngineOptions,
  type DamageContext,
  type CardDefinition,
  type CardEffects,
  type ComboResult,
  type TokenEffect,
} from './core/battle-engine';

// ==================== Timeline Battle Engine (NEW) ====================
export {
  TimelineBattleEngine,
  createTimelineBattleEngine,
  DEFAULT_MAX_SPEED,
  DEFAULT_PLAYER_ENERGY,
  DEFAULT_MAX_SUBMIT_CARDS,
  DEFAULT_HAND_SIZE,
  BASE_CRIT_CHANCE,
  CRIT_MULTIPLIER,
  // Multi-enemy support
  initializeEnemyUnits,
  selectTargetUnit,
  distributeUnitDamage,
  syncEnemyTotalHp,
  checkSummonTrigger,
  spawnDeserters,
  getAliveUnitCount,
  distributeAoeDamage,
  type BattleEngineConfig,
} from './core/timeline-battle-engine';

// ==================== Card Creation System ====================
export {
  CardCreationSystem,
  createBreachCards,
  createAttackOnHit,
  createFencingCards,
  createExecutionSquadCards,
  generateCreationPool,
  selectBestCard,
  insertCreatedCardToTimeline,
  insertMultipleCreatedCards,
  type CardCreationResult,
  type CreationPoolOptions,
} from './core/card-creation';

// ==================== Enemy Passives System ====================
export {
  processEnemyBattleStartPassives,
  processEnemyTurnStartPassives,
  processEnemyDamagePassives,
  checkAndProcessSummonPassive,
  checkUnitSummonPassives,
  hasVeilEffect,
  applyVeilInsightReduction,
  getEnemyPassivesSummary,
  type PassiveEffectResult,
} from './core/enemy-passives';

// ==================== Token System (Full 56 Tokens) ====================
export {
  addToken,
  removeToken,
  hasToken,
  getTokenStacks,
  clearToken,
  calculateAttackModifiers,
  calculateDefenseModifiers,
  calculateDamageTakenModifiers,
  consumeAttackTokens,
  consumeDefenseTokens,
  consumeDamageTakenTokens,
  processTurnEnd,
  processCounter,
  processCounterShot,
  checkRoulette,
  processBurn,
  checkImmunity,
  checkRevive,
  calculateEnergyModifier,
  calculateSpeedModifier,
  type DamageModifiers,
  type DefenseModifiers,
  type DamageTakenModifiers,
} from './core/token-system';

// ==================== Relic System V2 (Full 45 Relics) ====================
export {
  RelicSystemV2,
  getRelicSystemV2,
  resetRelicSystem,
  type RelicEffectResult,
} from './core/relic-system-v2';

// ==================== Game Data Sync ====================
export {
  syncAllCards,
  syncAllTokens,
  syncAllRelics,
  syncAllTraits,
  syncAllEnemies,
  syncAllAnomalies,
  getAnomaly,
  getAnomalyStats,
  calculateAnomalyEffect,
  getGameDataStats,
  type SimulatorAnomaly,
} from './data/game-data-sync';

// ==================== Anomaly System ====================
export {
  getAnomalySystem,
  activateGameAnomaly,
  clearGameAnomalies,
  isEtherBlocked,
  getEnergyReduction,
  getSpeedReduction,
  getDrawReduction,
  getVulnerabilityPercent,
  getDefenseBackfireDamage,
  getSpeedInstability,
  getInsightReduction,
  getValueDownTokens,
  getTraitSilenceLevel,
  getChainIsolationLevel,
  getFinesseBlockLevel,
} from './core/anomaly-system';

// ==================== Combo Ether System ====================
export {
  detectPokerCombo,
  calculateDeflation,
  calculateTotalEther,
  COMBO_PRIORITIES,
  COMBO_MULTIPLIERS,
  ETHER_THRESHOLD,
  DEFLATION_RATE,
  type EtherGainResult,
  type ComboResult as ComboEtherResult,
  type ComboCard,
} from './core/combo-ether-system';

// ==================== Hand Trait Processor ====================
export {
  collectNextTurnEffects,
  applyNextTurnEffects,
  generateNextHand,
  processExhaust,
  hasTrait,
  hasSpecial,
  resetNextTurnEffects,
  type NextTurnEffects as HandNextTurnEffects,
  type HandGenerationResult,
  type HandGenerationConfig,
} from './core/hand-trait-processor';

// ==================== Insight System ====================
export {
  calculateInsightLevel,
  getInsightLevelInfo,
  getInsightReveal,
  calculateTotalShroud,
  calculateVeilCount,
  calculateVeilInsightReduction,
  getSimulatorInsightInfo,
  filterVisibleEnemyCards,
  getInsightLevelName,
  INSIGHT_LEVELS,
  type InsightLevelName,
  type InsightLevel as InsightLevelInfo,
  type InsightReveal as InsightRevealInfo,
  type InsightCalculationParams,
  type EnemyUnit as InsightEnemyUnit,
} from './core/insight-system';

// ==================== Respond AI ====================
export {
  RespondAI,
  createRespondAI,
  quickRiskCheck,
  predictCrosses,
  type TimelineAnalysis,
  type ResponseDecision,
  type RespondAIConfig,
} from './ai/respond-ai';

// ==================== Card Effects ====================
export {
  executeSpecialEffects,
  processCrossBonus,
  checkAndConsumeRequiredTokens,
  hasSpecialEffect,
  getFencingDamageBonus,
  getGunDamageBonus,
  getSupportedSpecials,
  findUnsupportedSpecials,
  type SpecialEffectResult,
  type CrossBonusResult,
} from './core/card-effects';

// ==================== Multi-Enemy Battle Engine ====================
export {
  MultiEnemyBattleEngine,
  createMultiEnemyBattleEngine,
  runSharedTimelineBattle,
  type MultiEnemyTimelineCard,
  type MultiEnemyBattleState,
  type MultiEnemyBattleResult,
  type MultiEnemyBattleConfig,
  type TargetingMode,
} from './core/multi-enemy-battle-engine';

// ==================== Enhanced Battle Processor ====================
export {
  EnhancedBattleProcessor,
  createEnhancedBattleProcessor,
  runMultiEnemyBattle,
  type EnhancedBattleConfig,
  type EnhancedBattleResult,
} from './core/enhanced-battle-processor';

// ==================== Enemy AI Patterns ====================
export {
  EnemyAI,
  createEnemyAI,
  getPatternForEnemy,
  type EnemyPattern,
  type PatternConfig,
  type CardScore,
  type EnemyDecision,
} from './ai/enemy-patterns';

// ==================== Trait Synergy Processor ====================
export {
  TraitSynergyProcessor,
  createTraitSynergyProcessor,
  calculateTraitSynergies,
  calculateDeckSynergy,
  type TraitSynergyResult,
  type TraitContext,
} from './core/trait-synergy-processor';

// ==================== Card Synergy Analysis ====================
export {
  SynergyAnalyzer,
  generateSynergyReport,
  printSynergyMatrix,
  printDeckRecommendation,
  type SynergyPair,
  type DeckSynergy,
  type SynergyMatrix,
  type DeckRecommendation,
} from './analysis/synergy';

// ==================== Enemy AI Pattern Learning ====================
export {
  PatternLearner,
  printEnemyAnalysis,
  printPrediction,
  type ActionPattern,
  type EnemyPattern as LearnedEnemyPattern,
  type PredictionResult,
  type EnemyAnalysis,
} from './analysis/pattern-learning';

// ==================== Simulation Replay ====================
export {
  ReplayRecorder,
  ReplayPlayer,
  ReplayStorage,
  generateReplayViewer,
  playReplayInConsole,
  type ReplayData,
  type ReplayEvent,
  type StateSnapshot,
} from './analysis/replay';

// ==================== Meta Trend Analysis ====================
export {
  TrendAnalyzer,
  printTrendAnalysis,
  type TrendPoint,
  type TrendAnalysis,
  type CardTrend,
  type PatchImpact,
} from './analysis/trends';

// ==================== AI Share Formatter ====================
export {
  AIShareFormatter,
  formatBattleForAI,
  formatSimulationForAI,
  formatRunStatsForAI,
  formatDetailedStatsForAI,
  formatBalanceComparisonForAI,
  formatComprehensiveReportForAI,
  outputForCopy,
  type AIShareBattleOptions,
  type AIShareSimulationOptions,
  type AIShareRunStatsOptions,
  type BalanceComparisonData,
  type ComprehensiveReportData,
} from './analysis/ai-share-formatter';

// ==================== Caching Layer ====================
export {
  MemoryCache,
  DiskCache,
  TieredCache,
  SimulationCacheManager,
  getDefaultCache,
  formatCacheStats,
  withCache,
  type CacheAdapter,
  type CacheStats,
  type CacheConfig,
} from './cache';

// ==================== Enhanced CLI ====================
export {
  ProgressBar,
  OutputFormatter,
  ResultFilter,
  ProfileManager,
  BatchRunner,
  InteractiveCLI,
  parseArgs,
  runEnhancedCLI,
  type CLIOptions,
  type FilterOptions,
  type SimulationProfile,
  type BatchJob,
  type BatchResult,
} from './cli/enhanced-cli';

// ==================== Reinforcement Learning AI ====================
export {
  QLearningAgent,
  DQNAgent,
  SimpleNeuralNetwork,
  ReplayBuffer,
  QTable,
  StateEncoder,
  RewardCalculator,
  TrainingManager,
  createDefaultAgent,
  type GameState as RLGameState,
  type Action as RLAction,
  type Experience,
  type QLearningConfig,
  type TrainingConfig,
  type TrainingResult,
} from './ai/reinforcement-learning';

// ==================== Distributed Simulation ====================
export {
  DistributedJobManager,
  DistributedWorker,
  SimulationCluster,
  ResultAggregator,
  InMemoryQueue,
  splitConfig,
  printClusterStats,
  type DistributedConfig,
  type SimulationJob,
  type JobResult,
  type WorkerInfo,
} from './distributed';

// ==================== Quick Start Helpers ====================

import { loadCards, loadEnemies, loadPresets, getEnemiesByTier } from './data/loader';
import { SimpleBalanceSimulator } from './analysis/balance';
import { HtmlReportGenerator } from './reports/html';
import { JsonStorage } from './persistence/storage';
import type { SimulationConfig, SimulationResult } from './core/types';

/**
 * 빠른 시뮬레이션 실행
 */
export async function quickSimulate(
  deckCards: string[],
  enemyIds: string[],
  battles: number = 100
): Promise<SimulationResult> {
  const simulator = new SimpleBalanceSimulator();

  const config: SimulationConfig = {
    battles,
    maxTurns: 30,
    enemyIds,
    playerDeck: deckCards,
  };

  return simulator.run(config);
}

/**
 * 빠른 리포트 생성
 */
export async function quickReport(
  deckCards: string[],
  enemyIds: string[],
  battles: number = 100,
  outputDir: string = './reports'
): Promise<string> {
  const result = await quickSimulate(deckCards, enemyIds, battles);
  const generator = new HtmlReportGenerator({ outputDir });
  return generator.generateSimulationReport(result);
}

/**
 * 빠른 밸런스 체크
 */
export async function quickBalanceCheck(): Promise<{
  passed: boolean;
  report: string;
}> {
  const { BalanceChecker } = await import('./ci/balance-check');
  const checker = new BalanceChecker({ battlesPerTest: 30 });
  const result = await checker.runCheck();
  return { passed: result.passed, report: result.report };
}

// ==================== CLI 명령어 등록 정보 ====================

export const CLI_COMMANDS = {
  // 기본 시뮬레이션
  simulate: '기본 시뮬레이션 실행',
  parallel: '병렬 시뮬레이션 (빠름)',
  distributed: '분산 시뮬레이션 (클러스터)',

  // 분석
  balance: '밸런스 분석',
  abtest: 'A/B 테스트',
  mcts: 'MCTS AI 플레이',
  synergy: '카드 시너지 분석',
  patterns: '적 AI 패턴 분석',
  trends: '메타 트렌드 분석',

  // AI
  train: '강화학습 AI 훈련',
  play: 'AI vs 적 대전',

  // 리포트
  report: 'HTML 리포트 생성',
  replay: '전투 리플레이 생성',
  'ai-share': 'AI 공유용 텍스트 출력',

  // 데이터
  history: '히스토리 조회',
  baseline: '기준선 업데이트',
  cache: '캐시 관리',

  // 서버
  dashboard: '대시보드 서버 시작',

  // CI/CD
  check: 'CI/CD 밸런스 체크',

  // 대화형
  interactive: '대화형 CLI 모드',
};

console.log('🎮 시뮬레이터 모듈 로드 완료');
