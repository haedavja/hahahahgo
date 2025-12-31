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
  private maxWorkers: number;
  private workerPath: string;
  private workerData: Record<string, unknown>;

  constructor(options: PoolOptions = {}) {
    super();
    this.maxWorkers = options.maxWorkers || cpus().length;
    this.workerPath = options.workerPath || join(dirname(fileURLToPath(import.meta.url)), 'worker.js');
    this.workerData = options.workerData || {};
  }

  async initialize(): Promise<void> {
    const initPromises: Promise<void>[] = [];

    for (let i = 0; i < this.maxWorkers; i++) {
      initPromises.push(this.createWorker());
    }

    await Promise.all(initPromises);
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
    return new Promise((resolve) => {
      this.taskCallbacks.set(task.id, resolve);

      if (this.idleWorkers.length > 0) {
        const worker = this.idleWorkers.shift()!;
        worker.postMessage(task);
      } else {
        this.taskQueue.push(task);
      }
    });
  }

  async runSimulation(config: SimulationConfig): Promise<SimulationResult> {
    const startTime = Date.now();
    const batchSize = Math.ceil(config.battles / this.maxWorkers);
    const tasks: WorkerTask[] = [];

    // 작업을 Worker 수만큼 분할
    for (let i = 0; i < this.maxWorkers; i++) {
      const remainingBattles = config.battles - i * batchSize;
      if (remainingBattles <= 0) break;

      tasks.push({
        id: `sim-${Date.now()}-${i}`,
        type: 'batch',
        config,
        batchSize: Math.min(batchSize, remainingBattles),
      });
    }

    // 모든 작업 병렬 실행
    const results = await Promise.all(tasks.map((task) => this.submitTask(task)));

    // 결과 병합
    const allBattleResults: BattleResult[] = results.flatMap((r) => r.results);
    const summary = this.calculateSummary(allBattleResults);

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

  getStats(): PoolStats {
    const avgTime =
      this.taskTimings.length > 0
        ? this.taskTimings.reduce((a, b) => a + b, 0) / this.taskTimings.length
        : 0;

    return {
      activeWorkers: this.workers.length - this.idleWorkers.length,
      idleWorkers: this.idleWorkers.length,
      pendingTasks: this.taskQueue.length,
      completedTasks: this.completedTasks,
      avgTaskTime: avgTime,
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
