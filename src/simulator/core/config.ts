/**
 * @file config.ts
 * @description 시뮬레이터 통합 설정 시스템
 *
 * 모든 하드코딩된 값을 중앙에서 관리하고 환경별 설정 지원
 */

import { BattleConstants, DEFAULT_CONSTANTS, configureConstants } from './battle-engine';

// ==================== 전역 설정 타입 ====================

export interface SimulatorConfig {
  /** 전투 관련 설정 */
  battle: BattleConstants;

  /** 시뮬레이션 실행 설정 */
  simulation: SimulationSettings;

  /** 캐시 설정 */
  cache: CacheSettings;

  /** 병렬 처리 설정 */
  parallel: ParallelSettings;

  /** 분석 설정 */
  analysis: AnalysisSettings;

  /** CI/밸런스 체크 설정 */
  ci: CISettings;

  /** 로깅 설정 */
  logging: LoggingSettings;
}

export interface SimulationSettings {
  /** 기본 시뮬레이션 횟수 */
  defaultBattleCount: number;
  /** 최대 턴 수 */
  maxTurns: number;
  /** 기본 플레이어 체력 */
  defaultPlayerHp: number;
  /** 기본 에너지 */
  defaultEnergy: number;
  /** 초기 손패 수 */
  initialHandSize: number;
  /** 턴당 드로우 수 */
  drawPerTurn: number;
  /** 무작위 시드 (null = 무작위) */
  randomSeed: number | null;
}

export interface CacheSettings {
  /** 캐시 활성화 */
  enabled: boolean;
  /** 최대 캐시 크기 */
  maxSize: number;
  /** 기본 TTL (밀리초) */
  defaultTTL: number;
  /** 정리 간격 (밀리초) */
  cleanupInterval: number;
  /** LRU 활성화 */
  useLRU: boolean;
}

export interface ParallelSettings {
  /** 워커 수 (0 = CPU 코어 수) */
  workerCount: number;
  /** 작업당 배치 크기 */
  batchSize: number;
  /** 작업 타임아웃 (밀리초) */
  taskTimeout: number;
  /** 워커 유휴 타임아웃 (밀리초) */
  idleTimeout: number;
  /** 작업 재시도 횟수 */
  maxRetries: number;
  /** 우선순위 큐 사용 */
  usePriorityQueue: boolean;
}

export interface AnalysisSettings {
  /** 시너지 분석 기본 카드 수 */
  synergyCardLimit: number;
  /** 시너지 테스트 배틀 수 */
  synergyTestBattles: number;
  /** MCTS 기본 반복 횟수 */
  mctsIterations: number;
  /** MCTS 최대 깊이 */
  mctsMaxDepth: number;
  /** MCTS 시간 제한 (밀리초) */
  mctsTimeLimit: number;
  /** MCTS 탐색 상수 */
  mctsExplorationConstant: number;
  /** 밸런스 분석 시뮬레이션 수 */
  balanceSimulations: number;
}

export interface CISettings {
  /** 승률 경고 임계값 (기본에서 벗어난 %) */
  winRateWarningThreshold: number;
  /** 승률 오류 임계값 */
  winRateErrorThreshold: number;
  /** 카드 사용률 경고 임계값 */
  cardUsageWarningThreshold: number;
  /** 카드 사용률 오류 임계값 */
  cardUsageErrorThreshold: number;
  /** 최소 시뮬레이션 수 */
  minimumSimulations: number;
  /** 기준선 파일 경로 */
  baselinePath: string;
}

export interface LoggingSettings {
  /** 로그 레벨 */
  level: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  /** 전투 로그 활성화 */
  battleLog: boolean;
  /** 성능 로그 활성화 */
  performanceLog: boolean;
  /** 타임스탬프 포함 */
  includeTimestamp: boolean;
  /** 색상 출력 사용 */
  useColors: boolean;
}

// ==================== 기본 설정 ====================

export const DEFAULT_CONFIG: SimulatorConfig = {
  battle: DEFAULT_CONSTANTS,

  simulation: {
    defaultBattleCount: 1000,
    maxTurns: 30,
    defaultPlayerHp: 100,
    defaultEnergy: 3,
    initialHandSize: 5,
    drawPerTurn: 5,
    randomSeed: null,
  },

  cache: {
    enabled: true,
    maxSize: 1000,
    defaultTTL: 30 * 60 * 1000, // 30분
    cleanupInterval: 60 * 1000, // 1분
    useLRU: true,
  },

  parallel: {
    workerCount: 0, // 자동 감지
    batchSize: 100,
    taskTimeout: 60 * 1000, // 1분
    idleTimeout: 5 * 60 * 1000, // 5분
    maxRetries: 3,
    usePriorityQueue: true,
  },

  analysis: {
    synergyCardLimit: 15,
    synergyTestBattles: 100,
    mctsIterations: 1000,
    mctsMaxDepth: 20,
    mctsTimeLimit: 5000,
    mctsExplorationConstant: Math.sqrt(2),
    balanceSimulations: 500,
  },

  ci: {
    winRateWarningThreshold: 0.05, // 5%
    winRateErrorThreshold: 0.10,   // 10%
    cardUsageWarningThreshold: 0.20, // 20%
    cardUsageErrorThreshold: 0.30,   // 30%
    minimumSimulations: 100,
    baselinePath: './data/baseline.json',
  },

  logging: {
    level: 'info',
    battleLog: false,
    performanceLog: false,
    includeTimestamp: true,
    useColors: true,
  },
};

// ==================== 설정 관리자 ====================

class ConfigManager {
  private config: SimulatorConfig;
  private frozen: boolean = false;

  constructor() {
    this.config = this.deepClone(DEFAULT_CONFIG);
  }

  /**
   * 현재 설정 조회
   */
  get(): SimulatorConfig {
    return this.deepClone(this.config);
  }

  /**
   * 특정 섹션 설정 조회
   */
  getSection<K extends keyof SimulatorConfig>(section: K): SimulatorConfig[K] {
    return this.deepClone(this.config[section]);
  }

  /**
   * 설정 업데이트
   */
  set(overrides: DeepPartial<SimulatorConfig>): void {
    if (this.frozen) {
      throw new Error('Configuration is frozen and cannot be modified');
    }

    this.config = this.deepMerge(this.config, overrides);

    // 전투 상수 동기화
    if (overrides.battle) {
      configureConstants(this.config.battle);
    }
  }

  /**
   * 설정 초기화
   */
  reset(): void {
    if (this.frozen) {
      throw new Error('Configuration is frozen and cannot be reset');
    }

    this.config = this.deepClone(DEFAULT_CONFIG);
    configureConstants(DEFAULT_CONSTANTS);
  }

  /**
   * 환경 변수에서 설정 로드
   */
  loadFromEnv(): void {
    const envConfig: DeepPartial<SimulatorConfig> = {};

    // 병렬 처리 설정
    if (process.env.SIM_WORKER_COUNT) {
      envConfig.parallel = { workerCount: parseInt(process.env.SIM_WORKER_COUNT, 10) };
    }
    if (process.env.SIM_BATCH_SIZE) {
      envConfig.parallel = { ...envConfig.parallel, batchSize: parseInt(process.env.SIM_BATCH_SIZE, 10) };
    }

    // 시뮬레이션 설정
    if (process.env.SIM_BATTLE_COUNT) {
      envConfig.simulation = { defaultBattleCount: parseInt(process.env.SIM_BATTLE_COUNT, 10) };
    }
    if (process.env.SIM_MAX_TURNS) {
      envConfig.simulation = { ...envConfig.simulation, maxTurns: parseInt(process.env.SIM_MAX_TURNS, 10) };
    }

    // 로깅 설정
    if (process.env.SIM_LOG_LEVEL) {
      envConfig.logging = { level: process.env.SIM_LOG_LEVEL as LoggingSettings['level'] };
    }

    // CI 설정
    if (process.env.SIM_BASELINE_PATH) {
      envConfig.ci = { baselinePath: process.env.SIM_BASELINE_PATH };
    }

    if (Object.keys(envConfig).length > 0) {
      this.set(envConfig);
    }
  }

  /**
   * JSON에서 설정 로드
   */
  loadFromJSON(json: string): void {
    try {
      const parsed = JSON.parse(json);
      this.validate(parsed);
      this.set(parsed);
    } catch (error) {
      throw new Error(`Failed to parse configuration: ${error}`);
    }
  }

  /**
   * 설정 JSON으로 내보내기
   */
  toJSON(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * 설정 고정 (더 이상 변경 불가)
   */
  freeze(): void {
    this.frozen = true;
  }

  /**
   * 설정 검증
   */
  validate(config: DeepPartial<SimulatorConfig>): void {
    const errors: string[] = [];

    // 숫자 값 검증
    if (config.simulation?.maxTurns !== undefined && config.simulation.maxTurns < 1) {
      errors.push('simulation.maxTurns must be at least 1');
    }
    if (config.simulation?.defaultPlayerHp !== undefined && config.simulation.defaultPlayerHp < 1) {
      errors.push('simulation.defaultPlayerHp must be at least 1');
    }
    if (config.cache?.maxSize !== undefined && config.cache.maxSize < 0) {
      errors.push('cache.maxSize cannot be negative');
    }
    if (config.cache?.defaultTTL !== undefined && config.cache.defaultTTL < 0) {
      errors.push('cache.defaultTTL cannot be negative');
    }
    if (config.parallel?.workerCount !== undefined && config.parallel.workerCount < 0) {
      errors.push('parallel.workerCount cannot be negative');
    }
    if (config.parallel?.maxRetries !== undefined && config.parallel.maxRetries < 0) {
      errors.push('parallel.maxRetries cannot be negative');
    }

    // CI 임계값 검증
    if (config.ci?.winRateWarningThreshold !== undefined) {
      if (config.ci.winRateWarningThreshold < 0 || config.ci.winRateWarningThreshold > 1) {
        errors.push('ci.winRateWarningThreshold must be between 0 and 1');
      }
    }

    // 로그 레벨 검증
    if (config.logging?.level !== undefined) {
      const validLevels = ['debug', 'info', 'warn', 'error', 'silent'];
      if (!validLevels.includes(config.logging.level)) {
        errors.push(`logging.level must be one of: ${validLevels.join(', ')}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * 깊은 복사
   */
  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * 깊은 병합
   */
  private deepMerge<T extends Record<string, unknown>>(target: T, source: DeepPartial<T>): T {
    const result = { ...target };

    for (const key of Object.keys(source) as (keyof T)[]) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (sourceValue !== undefined) {
        if (
          typeof sourceValue === 'object' &&
          sourceValue !== null &&
          !Array.isArray(sourceValue) &&
          typeof targetValue === 'object' &&
          targetValue !== null
        ) {
          result[key] = this.deepMerge(
            targetValue as Record<string, unknown>,
            sourceValue as DeepPartial<Record<string, unknown>>
          ) as T[keyof T];
        } else {
          result[key] = sourceValue as T[keyof T];
        }
      }
    }

    return result;
  }
}

// ==================== 타입 유틸리티 ====================

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ==================== 프리셋 설정 ====================

export const CONFIG_PRESETS = {
  /** 빠른 개발/테스트용 */
  development: {
    simulation: {
      defaultBattleCount: 100,
      maxTurns: 20,
    },
    cache: {
      enabled: false,
    },
    parallel: {
      workerCount: 2,
    },
    logging: {
      level: 'debug' as const,
      battleLog: true,
      performanceLog: true,
    },
  },

  /** 프로덕션용 */
  production: {
    simulation: {
      defaultBattleCount: 10000,
    },
    cache: {
      enabled: true,
      maxSize: 5000,
    },
    parallel: {
      workerCount: 0, // 모든 코어 사용
      batchSize: 500,
    },
    logging: {
      level: 'warn' as const,
      battleLog: false,
    },
  },

  /** CI 테스트용 */
  ci: {
    simulation: {
      defaultBattleCount: 500,
      randomSeed: 12345, // 재현 가능
    },
    cache: {
      enabled: false,
    },
    parallel: {
      workerCount: 4,
    },
    logging: {
      level: 'error' as const,
    },
  },

  /** 벤치마크용 */
  benchmark: {
    simulation: {
      defaultBattleCount: 50000,
    },
    cache: {
      enabled: true,
      maxSize: 10000,
    },
    parallel: {
      workerCount: 0,
      batchSize: 1000,
    },
    logging: {
      level: 'silent' as const,
    },
  },
};

// ==================== 싱글톤 인스턴스 ====================

export const config = new ConfigManager();

// 초기 환경 변수 로드
if (typeof process !== 'undefined' && process.env) {
  config.loadFromEnv();
}

// ==================== 헬퍼 함수 ====================

/**
 * 프리셋 적용
 */
export function applyPreset(presetName: keyof typeof CONFIG_PRESETS): void {
  config.set(CONFIG_PRESETS[presetName]);
}

/**
 * 현재 설정 조회 (단축키)
 */
export function getConfig(): SimulatorConfig {
  return config.get();
}

/**
 * 설정 업데이트 (단축키)
 */
export function setConfig(overrides: DeepPartial<SimulatorConfig>): void {
  config.set(overrides);
}
