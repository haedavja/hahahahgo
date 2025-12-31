/**
 * @file pool.ts
 * @description Worker Pool Manager for parallel simulation
 */

import { Worker } from 'worker_threads';
import { cpus } from 'os';
import { EventEmitter } from 'events';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type {
  WorkerTask,
  WorkerResult,
  SimulationConfig,
  SimulationResult,
  SimulationSummary,
  BattleResult,
  ProgressUpdate,
} from '../core/types';
import {
  ErrorHandler,
  CircuitBreaker,
  createError,
  withTimeout,
  type SimulatorError,
} from '../core/error-handling';
import { getLogger } from '../core/logger';

// ==================== Worker Pool ====================

export interface PoolOptions {
  maxWorkers?: number;
  workerPath?: string;
  workerData?: Record<string, unknown>;
}

export interface PoolStats {
  activeWorkers: number;
  idleWorkers: number;
  pendingTasks: number;
  completedTasks: number;
  avgTaskTime: number;
}

export class WorkerPool extends EventEmitter {
  private workers: Worker[] = [];
  private idleWorkers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private taskCallbacks: Map<string, (result: WorkerResult) => void> = new Map();
  private taskTimings: number[] = [];
  private completedTasks = 0;
  private failedTasks = 0;
  private maxWorkers: number;
  private workerPath: string;
  private workerData: Record<string, unknown>;
  private errorHandler: ErrorHandler;
  private circuitBreaker: CircuitBreaker;
  private log = getLogger('WorkerPool');
  private taskTimeout: number;

  constructor(options: PoolOptions = {}) {
    super();
    this.maxWorkers = options.maxWorkers || cpus().length;
    this.workerPath = options.workerPath || join(dirname(fileURLToPath(import.meta.url)), 'worker.js');
    this.workerData = options.workerData || {};
    this.taskTimeout = 60000; // 60초 타임아웃

    this.errorHandler = new ErrorHandler({
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
      onError: (error) => this.log.error('Worker error', error),
      onRetry: (error, attempt) => this.log.warn(`Retrying task (attempt ${attempt})`, { code: error.code }),
      onFatal: (error) => {
        this.log.error('Fatal worker error', error);
        this.failedTasks++;
      },
    });

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 30000,
      halfOpenRequests: 3,
    });
  }

  async initialize(): Promise<void> {
    this.log.info(`Initializing worker pool with ${this.maxWorkers} workers`);

    const initPromises: Promise<void>[] = [];

    for (let i = 0; i < this.maxWorkers; i++) {
      initPromises.push(
        this.errorHandler.handle(
          () => this.createWorker(),
          'WORKER_INIT_FAILED',
          { workerId: i }
        ).catch((error) => {
          this.log.warn(`Worker ${i} failed to initialize, continuing with fewer workers`);
        })
      );
    }

    await Promise.all(initPromises);

    if (this.workers.length === 0) {
      throw createError('WORKER_INIT_FAILED', 'No workers could be initialized');
    }

    this.log.info(`Worker pool initialized with ${this.workers.length} workers`);
    this.emit('initialized', { workers: this.workers.length });
  }

  private async createWorker(): Promise<void> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(this.workerPath, {
        workerData: this.workerData,
      });

      worker.on('message', (message) => {
        if (message.type === 'ready') {
          this.workers.push(worker);
          this.idleWorkers.push(worker);
          resolve();
        } else if (message.type === 'result') {
          this.handleResult(worker, message.payload as WorkerResult);
        } else if (message.type === 'progress') {
          this.emit('progress', message.payload as ProgressUpdate);
        } else if (message.type === 'error') {
          this.emit('error', new Error(message.payload as string));
        }
      });

      worker.on('error', (error) => {
        this.emit('error', error);
        this.removeWorker(worker);
        reject(error);
      });

      worker.on('exit', (code) => {
        this.removeWorker(worker);
        if (code !== 0) {
          this.emit('workerExit', { code });
        }
      });
    });
  }

  private handleResult(worker: Worker, result: WorkerResult): void {
    const callback = this.taskCallbacks.get(result.id);
    if (callback) {
      this.taskCallbacks.delete(result.id);
      this.taskTimings.push(result.duration);
      this.completedTasks++;
      callback(result);
    }

    // Worker를 유휴 상태로 반환
    this.idleWorkers.push(worker);

    // 대기 중인 작업이 있으면 처리
    this.processQueue();
  }

  private removeWorker(worker: Worker): void {
    const idx = this.workers.indexOf(worker);
    if (idx >= 0) this.workers.splice(idx, 1);

    const idleIdx = this.idleWorkers.indexOf(worker);
    if (idleIdx >= 0) this.idleWorkers.splice(idleIdx, 1);
  }

  private processQueue(): void {
    while (this.idleWorkers.length > 0 && this.taskQueue.length > 0) {
      const worker = this.idleWorkers.shift()!;
      const task = this.taskQueue.shift()!;
      worker.postMessage(task);
    }
  }

  async submitTask(task: WorkerTask): Promise<WorkerResult> {
    // 서킷 브레이커 체크
    return this.circuitBreaker.execute(async () => {
      const taskPromise = new Promise<WorkerResult>((resolve, reject) => {
        this.taskCallbacks.set(task.id, (result) => {
          if (result.error) {
            reject(createError('SIM_BATTLE_FAILED', result.error, { taskId: task.id }));
          } else {
            resolve(result);
          }
        });

        if (this.idleWorkers.length > 0) {
          const worker = this.idleWorkers.shift()!;
          worker.postMessage(task);
        } else {
          this.taskQueue.push(task);
        }
      });

      // 타임아웃 적용
      return withTimeout(taskPromise, {
        timeout: this.taskTimeout,
        errorCode: 'TIMEOUT_TASK',
        onTimeout: () => {
          this.log.warn(`Task ${task.id} timed out after ${this.taskTimeout}ms`);
          this.taskCallbacks.delete(task.id);
        },
      });
    });
  }

  async runSimulation(config: SimulationConfig): Promise<SimulationResult> {
    this.log.time('simulation');
    const startTime = Date.now();
    const batchSize = Math.ceil(config.battles / this.workers.length);
    const tasks: WorkerTask[] = [];

    // 작업을 Worker 수만큼 분할
    for (let i = 0; i < this.workers.length; i++) {
      const remainingBattles = config.battles - i * batchSize;
      if (remainingBattles <= 0) break;

      tasks.push({
        id: `sim-${Date.now()}-${i}`,
        type: 'batch',
        config,
        batchSize: Math.min(batchSize, remainingBattles),
      });
    }

    this.log.debug(`Submitting ${tasks.length} tasks for ${config.battles} battles`);

    // 모든 작업 병렬 실행 (실패한 작업은 빈 결과로 처리)
    const taskResults = await Promise.allSettled(
      tasks.map((task) => this.submitTask(task))
    );

    // 성공한 결과만 수집
    const successfulResults: WorkerResult[] = [];
    let failedCount = 0;

    for (const result of taskResults) {
      if (result.status === 'fulfilled') {
        successfulResults.push(result.value);
      } else {
        failedCount++;
        this.log.error('Task failed', result.reason);
      }
    }

    if (failedCount > 0) {
      this.log.warn(`${failedCount} tasks failed out of ${tasks.length}`);
    }

    // 결과 병합
    const allBattleResults: BattleResult[] = successfulResults.flatMap((r) => r.results);
    const summary = this.calculateSummary(allBattleResults);

    const duration = this.log.timeEnd('simulation', 'Simulation completed');

    return {
      config,
      results: allBattleResults,
      summary,
      timestamp: Date.now(),
      duration: Date.now() - startTime,
    };
  }

  private calculateSummary(results: BattleResult[]): SimulationSummary {
    const wins = results.filter((r) => r.winner === 'player').length;
    const losses = results.filter((r) => r.winner === 'enemy').length;
    const draws = results.filter((r) => r.winner === 'draw').length;

    const totalPlayerDamage = results.reduce((sum, r) => sum + r.playerDamageDealt, 0);
    const totalEnemyDamage = results.reduce((sum, r) => sum + r.enemyDamageDealt, 0);
    const totalTurns = results.reduce((sum, r) => sum + r.turns, 0);

    // 카드 효율 계산
    const cardEfficiency: Record<string, { uses: number; avgDamage: number }> = {};
    const cardDamage: Record<string, number[]> = {};

    for (const result of results) {
      for (const [cardId, uses] of Object.entries(result.cardUsage)) {
        if (!cardEfficiency[cardId]) {
          cardEfficiency[cardId] = { uses: 0, avgDamage: 0 };
          cardDamage[cardId] = [];
        }
        cardEfficiency[cardId].uses += uses;
      }
    }

    // 평균 피해량 계산 (간단한 추정)
    for (const cardId of Object.keys(cardEfficiency)) {
      const totalUses = cardEfficiency[cardId].uses;
      if (totalUses > 0) {
        // 전체 피해량을 카드 사용 비율로 분배 (근사치)
        cardEfficiency[cardId].avgDamage = totalPlayerDamage / totalUses;
      }
    }

    return {
      totalBattles: results.length,
      wins,
      losses,
      draws,
      winRate: results.length > 0 ? wins / results.length : 0,
      avgTurns: results.length > 0 ? totalTurns / results.length : 0,
      avgPlayerDamage: results.length > 0 ? totalPlayerDamage / results.length : 0,
      avgEnemyDamage: results.length > 0 ? totalEnemyDamage / results.length : 0,
      cardEfficiency,
    };
  }

  getStats(): PoolStats & { failedTasks: number; circuitState: string; errorStats: ReturnType<ErrorHandler['getErrorStats']> } {
    const avgTime =
      this.taskTimings.length > 0
        ? this.taskTimings.reduce((a, b) => a + b, 0) / this.taskTimings.length
        : 0;

    return {
      activeWorkers: this.workers.length - this.idleWorkers.length,
      idleWorkers: this.idleWorkers.length,
      pendingTasks: this.taskQueue.length,
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks,
      avgTaskTime: avgTime,
      circuitState: this.circuitBreaker.getState(),
      errorStats: this.errorHandler.getErrorStats(),
    };
  }

  async terminate(): Promise<void> {
    const terminatePromises = this.workers.map(
      (worker) =>
        new Promise<void>((resolve) => {
          worker.once('exit', () => resolve());
          worker.terminate();
        })
    );

    await Promise.all(terminatePromises);
    this.workers = [];
    this.idleWorkers = [];
    this.taskQueue = [];
    this.emit('terminated');
  }
}

// ==================== 병렬 시뮬레이션 헬퍼 ====================

export async function runParallelSimulation(
  config: SimulationConfig,
  workerData: Record<string, unknown>,
  options?: { maxWorkers?: number; onProgress?: (progress: ProgressUpdate) => void }
): Promise<SimulationResult> {
  const pool = new WorkerPool({
    maxWorkers: options?.maxWorkers,
    workerData,
  });

  if (options?.onProgress) {
    pool.on('progress', options.onProgress);
  }

  try {
    await pool.initialize();
    const result = await pool.runSimulation(config);
    return result;
  } finally {
    await pool.terminate();
  }
}

// ==================== 빠른 비병렬 시뮬레이션 (소규모용) ====================

export function runQuickSimulation(
  config: SimulationConfig,
  cardData: Record<string, unknown>,
  enemyData: Record<string, unknown>,
  relicData: Record<string, unknown>
): SimulationResult {
  const startTime = Date.now();
  const { BattleSimulator } = require('./worker');

  const simulator = new BattleSimulator({
    cardData,
    enemyData,
    relicData,
  });

  const results: BattleResult[] = [];
  for (let i = 0; i < config.battles; i++) {
    results.push(simulator.simulateBattle(config));
  }

  const pool = new WorkerPool();
  const summary = (pool as any).calculateSummary(results);

  return {
    config,
    results,
    summary,
    timestamp: Date.now(),
    duration: Date.now() - startTime,
  };
}
