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

// ==================== Core Types ====================
export * from './core/types';

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

  // 분석
  balance: '밸런스 분석',
  abtest: 'A/B 테스트',
  mcts: 'MCTS AI 플레이',

  // 리포트
  report: 'HTML 리포트 생성',

  // 데이터
  history: '히스토리 조회',
  baseline: '기준선 업데이트',

  // 서버
  dashboard: '대시보드 서버 시작',

  // CI/CD
  check: 'CI/CD 밸런스 체크',
};

console.log('🎮 시뮬레이터 모듈 로드 완료');
