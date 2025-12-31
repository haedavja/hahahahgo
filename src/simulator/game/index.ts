/**
 * @file game/index.ts
 * @description 전체 게임 시뮬레이터 모듈
 *
 * ## 포함된 시뮬레이터
 * - EventSimulator: 이벤트 노드 시뮬레이션
 * - ShopSimulator: 상점 노드 시뮬레이션
 * - RestSimulator: 휴식 노드 시뮬레이션
 * - DungeonSimulator: 던전 탐험 시뮬레이션
 * - MapSimulator: 맵 생성 및 진행 시뮬레이션
 * - RunSimulator: 전체 런 시뮬레이션
 */

// 이벤트 시뮬레이터
export {
  EventSimulator,
  createEventSimulator,
  type EventChoice,
  type EventStage,
  type EventDefinition,
  type PlayerResources,
  type EventSimulationConfig,
  type EventOutcome,
  type EventAnalysis,
} from './event-simulator';

// 상점 시뮬레이터
export {
  ShopSimulator,
  createShopSimulator,
  type ShopItem,
  type ShopInventory,
  type PlayerShopState,
  type PurchaseDecision,
  type ShopSimulationConfig,
  type ShopResult,
  type ShopAnalysis,
  type MerchantType,
} from './shop-simulator';

// 휴식 시뮬레이터
export {
  RestSimulator,
  createRestSimulator,
  type RestAction,
  type RestNodeConfig,
  type PlayerRestState,
  type RestSimulationConfig,
  type RestResult,
  type RestAnalysis,
  type RestActionType,
} from './rest-simulator';

// 던전 시뮬레이터
export {
  DungeonSimulator,
  createDungeonSimulator,
  type DungeonNodeType,
  type ConnectionType,
  type DungeonObjectType,
  type DungeonConnection,
  type DungeonObject,
  type DungeonNode,
  type DungeonState,
  type DungeonPlayerState,
  type DungeonSimulationConfig,
  type DungeonExplorationResult,
  type DungeonAnalysis,
  type DungeonGenerationConfig,
} from './dungeon-simulator';

// 맵 시뮬레이터
export {
  MapSimulator,
  createMapSimulator,
  type MapNodeType,
  type MapNode,
  type MapState,
  type MapGenerationConfig,
  type MapSimulationConfig,
  type MapPathResult,
  type MapAnalysis,
} from './map-simulator';

// 런 시뮬레이터
export {
  RunSimulator,
  createRunSimulator,
  createDefaultPlayer,
  type PlayerRunState,
  type RunConfig,
  type RunStrategy,
  type NodeResult,
  type RunResult,
  type RunStatistics,
} from './run-simulator';

// ==================== 통합 게임 시뮬레이터 ====================

import { RunSimulator, createDefaultPlayer, type RunConfig, type RunStatistics, type PlayerRunState } from './run-simulator';
import { getLogger } from '../core/logger';

const log = getLogger('GameSimulator');

/**
 * 통합 게임 시뮬레이터
 * 모든 서브 시뮬레이터를 포함하는 메인 클래스
 */
export class GameSimulator {
  private runSimulator: RunSimulator;
  private initialized = false;

  constructor() {
    this.runSimulator = new RunSimulator();
  }

  /**
   * 시뮬레이터 초기화
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    log.info('Initializing GameSimulator...');
    await this.runSimulator.loadGameData();
    this.initialized = true;
    log.info('GameSimulator initialized');
  }

  /**
   * 단일 런 시뮬레이션
   */
  simulateRun(config: Partial<RunConfig> = {}): import('./run-simulator').RunResult {
    const fullConfig: RunConfig = {
      initialPlayer: config.initialPlayer || createDefaultPlayer(),
      difficulty: config.difficulty || 1,
      strategy: config.strategy || 'balanced',
      mapLayers: config.mapLayers || 11,
      verbose: config.verbose || false,
    };

    return this.runSimulator.simulateRun(fullConfig);
  }

  /**
   * 다중 런 시뮬레이션
   */
  simulateMultipleRuns(count: number, config: Partial<RunConfig> = {}): RunStatistics {
    const fullConfig: RunConfig = {
      initialPlayer: config.initialPlayer || createDefaultPlayer(),
      difficulty: config.difficulty || 1,
      strategy: config.strategy || 'balanced',
      mapLayers: config.mapLayers || 11,
    };

    return this.runSimulator.simulateMultipleRuns(fullConfig, count);
  }

  /**
   * 전략 비교 분석
   */
  async compareStrategies(runsPerStrategy: number = 100): Promise<Record<string, RunStatistics>> {
    const baseConfig = {
      initialPlayer: createDefaultPlayer(),
      difficulty: 1,
      mapLayers: 11,
    };

    return this.runSimulator.compareStrategies(baseConfig, runsPerStrategy);
  }

  /**
   * 밸런스 테스트
   */
  runBalanceTest(options: {
    runs: number;
    difficulties: number[];
  }): Record<number, RunStatistics> {
    const results: Record<number, RunStatistics> = {};

    for (const difficulty of options.difficulties) {
      const config: RunConfig = {
        initialPlayer: createDefaultPlayer(),
        difficulty,
        strategy: 'balanced',
        mapLayers: 11,
      };

      results[difficulty] = this.runSimulator.simulateMultipleRuns(config, options.runs);
      log.info(`Difficulty ${difficulty}: ${(results[difficulty].successRate * 100).toFixed(1)}% success rate`);
    }

    return results;
  }
}

/**
 * 게임 시뮬레이터 생성 헬퍼
 */
export async function createGameSimulator(): Promise<GameSimulator> {
  const simulator = new GameSimulator();
  await simulator.initialize();
  return simulator;
}
