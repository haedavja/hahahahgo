/**
 * @file distributed/index.ts
 * @description 분산 시뮬레이션 시스템 - Redis Queue + 다중 서버 지원
 *
 * 기능:
 * - Redis 기반 작업 큐
 * - 마스터-워커 아키텍처
 * - 자동 부하 분산
 * - 결과 집계
 * - 장애 복구
 */

import { EventEmitter } from 'events';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { SimulationConfig, SimulationResult, SimulationSummary, BattleResult } from '../core/types';
import { getLogger } from '../core/logger';
import { createError, type SimulatorError } from '../core/error-handling';

const log = getLogger('Distributed');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==================== 타입 정의 ====================

export interface DistributedConfig {
  redisUrl?: string;
  queueName: string;
  resultQueueName: string;
  workerCount: number;
  heartbeatIntervalMs: number;
  taskTimeoutMs: number;
  retryCount: number;
}

export interface SimulationJob {
  id: string;
  config: SimulationConfig;
  priority: number;
  createdAt: number;
  attempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  workerId?: string;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

export interface JobResult {
  jobId: string;
  workerId: string;
  result?: SimulationResult;
  error?: string;
  duration: number;
  completedAt: number;
}

export interface WorkerInfo {
  id: string;
  hostname: string;
  cpuCores: number;
  memoryMb: number;
  status: 'idle' | 'busy' | 'offline';
  currentJob?: string;
  lastHeartbeat: number;
  jobsCompleted: number;
  totalDuration: number;
}

// ==================== 큐 인터페이스 ====================

export interface IQueue<T> {
  push(item: T, priority?: number): Promise<void>;
  pop(): Promise<T | null>;
  peek(): Promise<T | null>;
  length(): Promise<number>;
  clear(): Promise<void>;
  getAll(): Promise<T[]>;
  isConnected(): boolean;
}

// ==================== 메모리 기반 큐 ====================

export class InMemoryQueue<T> implements IQueue<T> {
  private items: Array<{ data: T; priority: number }> = [];
  private name: string;

  constructor(name: string) {
    this.name = name;
    log.debug(`InMemoryQueue created: ${name}`);
  }

  async push(item: T, priority: number = 0): Promise<void> {
    this.items.push({ data: item, priority });
    this.items.sort((a, b) => b.priority - a.priority);
  }

  async pop(): Promise<T | null> {
    const item = this.items.shift();
    return item?.data || null;
  }

  async peek(): Promise<T | null> {
    return this.items[0]?.data || null;
  }

  async length(): Promise<number> {
    return this.items.length;
  }

  async clear(): Promise<void> {
    this.items = [];
  }

  async getAll(): Promise<T[]> {
    return this.items.map(i => i.data);
  }

  isConnected(): boolean {
    return true;
  }
}

// ==================== Redis 기반 큐 ====================

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  connectTimeout?: number;
  retryAttempts?: number;
}

export class RedisQueue<T> implements IQueue<T> {
  private client: any = null;
  private connected: boolean = false;
  private name: string;
  private config: RedisConfig;
  private sortedSetKey: string;
  private hashKey: string;

  constructor(name: string, config: RedisConfig) {
    this.name = name;
    this.config = config;
    this.sortedSetKey = `${config.keyPrefix || 'sim'}:queue:${name}:priority`;
    this.hashKey = `${config.keyPrefix || 'sim'}:queue:${name}:data`;
  }

  async connect(): Promise<boolean> {
    try {
      // 동적으로 Redis 라이브러리 로드 (설치되어 있으면)
      const Redis = await this.loadRedisLibrary();
      if (!Redis) {
        log.warn('Redis library not available, falling back to in-memory queue');
        return false;
      }

      this.client = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db || 0,
        connectTimeout: this.config.connectTimeout || 5000,
        retryStrategy: (times: number) => {
          if (times > (this.config.retryAttempts || 3)) {
            return null;
          }
          return Math.min(times * 200, 3000);
        },
      });

      // 연결 테스트
      await this.client.ping();
      this.connected = true;
      log.info(`Redis connected: ${this.config.host}:${this.config.port}`);
      return true;
    } catch (error) {
      log.warn('Redis connection failed', error);
      this.connected = false;
      return false;
    }
  }

  private async loadRedisLibrary(): Promise<any> {
    try {
      const { default: Redis } = await import('ioredis');
      return Redis;
    } catch {
      try {
        const { createClient } = await import('redis');
        return createClient;
      } catch {
        return null;
      }
    }
  }

  async push(item: T, priority: number = 0): Promise<void> {
    if (!this.connected || !this.client) {
      throw createError('NETWORK_CONNECTION_FAILED', 'Redis not connected');
    }

    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const data = JSON.stringify(item);

    // 트랜잭션으로 데이터와 우선순위 저장
    const multi = this.client.multi();
    multi.hset(this.hashKey, id, data);
    multi.zadd(this.sortedSetKey, priority, id);
    await multi.exec();
  }

  async pop(): Promise<T | null> {
    if (!this.connected || !this.client) {
      return null;
    }

    try {
      // 가장 높은 우선순위 항목 가져오기 (ZPOPMAX)
      const result = await this.client.zpopmax(this.sortedSetKey);
      if (!result || result.length === 0) {
        return null;
      }

      const id = result[0];
      const data = await this.client.hget(this.hashKey, id);
      await this.client.hdel(this.hashKey, id);

      return data ? JSON.parse(data) : null;
    } catch (error) {
      log.error('Redis pop error', error);
      return null;
    }
  }

  async peek(): Promise<T | null> {
    if (!this.connected || !this.client) {
      return null;
    }

    try {
      const result = await this.client.zrevrange(this.sortedSetKey, 0, 0);
      if (!result || result.length === 0) {
        return null;
      }

      const id = result[0];
      const data = await this.client.hget(this.hashKey, id);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async length(): Promise<number> {
    if (!this.connected || !this.client) {
      return 0;
    }

    try {
      return await this.client.zcard(this.sortedSetKey);
    } catch {
      return 0;
    }
  }

  async clear(): Promise<void> {
    if (!this.connected || !this.client) {
      return;
    }

    try {
      await this.client.del(this.sortedSetKey);
      await this.client.del(this.hashKey);
    } catch (error) {
      log.error('Redis clear error', error);
    }
  }

  async getAll(): Promise<T[]> {
    if (!this.connected || !this.client) {
      return [];
    }

    try {
      const ids = await this.client.zrevrange(this.sortedSetKey, 0, -1);
      if (!ids || ids.length === 0) {
        return [];
      }

      const data = await this.client.hmget(this.hashKey, ...ids);
      return data
        .filter((d: string | null) => d !== null)
        .map((d: string) => JSON.parse(d));
    } catch {
      return [];
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.connected = false;
      log.info('Redis disconnected');
    }
  }

  // Redis Pub/Sub 지원
  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    if (!this.connected || !this.client) {
      return;
    }

    const subscriber = this.client.duplicate();
    await subscriber.subscribe(channel);
    subscriber.on('message', (_channel: string, message: string) => {
      handler(message);
    });
  }

  async publish(channel: string, message: string): Promise<void> {
    if (!this.connected || !this.client) {
      return;
    }

    await this.client.publish(channel, message);
  }
}

// ==================== 큐 팩토리 ====================

export async function createQueue<T>(
  name: string,
  redisConfig?: RedisConfig
): Promise<IQueue<T>> {
  if (redisConfig) {
    const redisQueue = new RedisQueue<T>(name, redisConfig);
    const connected = await redisQueue.connect();
    if (connected) {
      return redisQueue;
    }
    log.warn('Redis connection failed, using in-memory queue');
  }

  return new InMemoryQueue<T>(name);
}

// ==================== 분산 작업 매니저 ====================

export class DistributedJobManager extends EventEmitter {
  private config: DistributedConfig;
  private jobQueue!: IQueue<SimulationJob>;
  private resultQueue!: IQueue<JobResult>;
  private jobs: Map<string, SimulationJob> = new Map();
  private workers: Map<string, WorkerInfo> = new Map();
  private jobCounter: number = 0;
  private initialized: boolean = false;

  constructor(config: Partial<DistributedConfig> = {}) {
    super();
    this.config = {
      redisUrl: config.redisUrl,
      queueName: config.queueName || 'simulation:jobs',
      resultQueueName: config.resultQueueName || 'simulation:results',
      workerCount: config.workerCount || 4,
      heartbeatIntervalMs: config.heartbeatIntervalMs || 5000,
      taskTimeoutMs: config.taskTimeoutMs || 60000,
      retryCount: config.retryCount || 3,
    };

    // 기본 메모리 큐로 시작 (initialize에서 Redis로 교체 가능)
    this.jobQueue = new InMemoryQueue(this.config.queueName);
    this.resultQueue = new InMemoryQueue(this.config.resultQueueName);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.config.redisUrl) {
      const redisConfig = this.parseRedisUrl(this.config.redisUrl);
      log.info('Connecting to Redis', { host: redisConfig.host, port: redisConfig.port });

      this.jobQueue = await createQueue<SimulationJob>(this.config.queueName, redisConfig);
      this.resultQueue = await createQueue<JobResult>(this.config.resultQueueName, redisConfig);

      if (this.jobQueue.isConnected()) {
        log.info('Distributed job manager initialized with Redis');
      } else {
        log.info('Distributed job manager initialized with in-memory queue');
      }
    } else {
      log.info('Distributed job manager initialized with in-memory queue (no Redis URL provided)');
    }

    this.initialized = true;
  }

  private parseRedisUrl(url: string): RedisConfig {
    try {
      const parsed = new URL(url);
      return {
        host: parsed.hostname || 'localhost',
        port: parseInt(parsed.port) || 6379,
        password: parsed.password || undefined,
        db: parseInt(parsed.pathname?.slice(1) || '0'),
      };
    } catch {
      // 단순 호스트:포트 형식
      const [host, port] = url.split(':');
      return {
        host: host || 'localhost',
        port: parseInt(port) || 6379,
      };
    }
  }

  isUsingRedis(): boolean {
    return this.jobQueue.isConnected() && this.jobQueue instanceof RedisQueue;
  }

  // ==================== 작업 관리 ====================

  async submitJob(config: SimulationConfig, priority: number = 0): Promise<string> {
    const jobId = `job_${++this.jobCounter}_${Date.now()}`;

    const job: SimulationJob = {
      id: jobId,
      config,
      priority,
      createdAt: Date.now(),
      attempts: 0,
      status: 'pending',
    };

    this.jobs.set(jobId, job);
    await this.jobQueue.push(job, priority);

    this.emit('jobSubmitted', job);
    return jobId;
  }

  async submitBatch(configs: SimulationConfig[], priority: number = 0): Promise<string[]> {
    const jobIds: string[] = [];

    for (const config of configs) {
      const jobId = await this.submitJob(config, priority);
      jobIds.push(jobId);
    }

    this.emit('batchSubmitted', jobIds);
    return jobIds;
  }

  async getJob(jobId: string): Promise<SimulationJob | null> {
    return this.jobs.get(jobId) || null;
  }

  async getNextJob(): Promise<SimulationJob | null> {
    return this.jobQueue.pop();
  }

  async completeJob(jobId: string, result: SimulationResult, workerId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'completed';
    job.completedAt = Date.now();

    const jobResult: JobResult = {
      jobId,
      workerId,
      result,
      duration: job.completedAt - (job.startedAt || job.createdAt),
      completedAt: job.completedAt,
    };

    await this.resultQueue.push(jobResult, 0);

    // 워커 통계 업데이트
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.jobsCompleted++;
      worker.totalDuration += jobResult.duration;
      worker.status = 'idle';
      worker.currentJob = undefined;
    }

    this.emit('jobCompleted', jobResult);
  }

  async failJob(jobId: string, error: string, workerId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.attempts++;

    if (job.attempts < this.config.retryCount) {
      // 재시도
      job.status = 'pending';
      await this.jobQueue.push(job, job.priority);
      this.emit('jobRetrying', job);
    } else {
      // 최종 실패
      job.status = 'failed';
      job.error = error;
      job.completedAt = Date.now();

      const jobResult: JobResult = {
        jobId,
        workerId,
        error,
        duration: job.completedAt - (job.startedAt || job.createdAt),
        completedAt: job.completedAt,
      };

      await this.resultQueue.push(jobResult, 0);
      this.emit('jobFailed', jobResult);
    }

    // 워커 상태 업데이트
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.status = 'idle';
      worker.currentJob = undefined;
    }
  }

  // ==================== 워커 관리 ====================

  registerWorker(workerId: string, info: Partial<WorkerInfo>): void {
    this.workers.set(workerId, {
      id: workerId,
      hostname: info.hostname || 'localhost',
      cpuCores: info.cpuCores || 1,
      memoryMb: info.memoryMb || 1024,
      status: 'idle',
      lastHeartbeat: Date.now(),
      jobsCompleted: 0,
      totalDuration: 0,
    });

    this.emit('workerRegistered', workerId);
  }

  unregisterWorker(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (worker?.currentJob) {
      // 현재 작업 재큐잉
      const job = this.jobs.get(worker.currentJob);
      if (job) {
        job.status = 'pending';
        this.jobQueue.push(job, job.priority);
      }
    }

    this.workers.delete(workerId);
    this.emit('workerUnregistered', workerId);
  }

  heartbeat(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.lastHeartbeat = Date.now();
    }
  }

  getWorkerStats(): WorkerInfo[] {
    return Array.from(this.workers.values());
  }

  // ==================== 상태 모니터링 ====================

  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    workers: number;
    avgDuration: number;
  }> {
    const jobs = Array.from(this.jobs.values());
    const workers = Array.from(this.workers.values());

    const completed = workers.reduce((sum, w) => sum + w.jobsCompleted, 0);
    const totalDuration = workers.reduce((sum, w) => sum + w.totalDuration, 0);

    return {
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      workers: workers.filter(w => w.status !== 'offline').length,
      avgDuration: completed > 0 ? totalDuration / completed : 0,
    };
  }

  // 시간 초과 작업 처리
  async checkTimeouts(): Promise<number> {
    const now = Date.now();
    let timeoutCount = 0;

    for (const [jobId, job] of this.jobs) {
      if (job.status === 'processing' && job.startedAt) {
        if (now - job.startedAt > this.config.taskTimeoutMs) {
          await this.failJob(jobId, 'Task timeout', job.workerId || 'unknown');
          timeoutCount++;
        }
      }
    }

    return timeoutCount;
  }

  // 오프라인 워커 감지
  checkWorkerHealth(): string[] {
    const now = Date.now();
    const offlineWorkers: string[] = [];

    for (const [workerId, worker] of this.workers) {
      if (now - worker.lastHeartbeat > this.config.heartbeatIntervalMs * 3) {
        worker.status = 'offline';
        offlineWorkers.push(workerId);
      }
    }

    return offlineWorkers;
  }
}

// ==================== 분산 워커 ====================

export class DistributedWorker extends EventEmitter {
  private id: string;
  private manager: DistributedJobManager;
  private running: boolean = false;
  private currentJob: SimulationJob | null = null;
  private heartbeatInterval?: NodeJS.Timeout;
  private simulator: (config: SimulationConfig) => Promise<SimulationResult>;

  constructor(
    manager: DistributedJobManager,
    simulator: (config: SimulationConfig) => Promise<SimulationResult>,
    workerId?: string
  ) {
    super();
    this.manager = manager;
    this.simulator = simulator;
    this.id = workerId || `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async start(): Promise<void> {
    if (this.running) return;

    this.running = true;

    // 등록
    this.manager.registerWorker(this.id, {
      hostname: require('os').hostname(),
      cpuCores: require('os').cpus().length,
      memoryMb: Math.round(require('os').totalmem() / (1024 * 1024)),
    });

    // 하트비트 시작
    this.heartbeatInterval = setInterval(() => {
      this.manager.heartbeat(this.id);
    }, 5000);

    console.log(`🔧 워커 시작: ${this.id}`);

    // 작업 루프
    while (this.running) {
      await this.processNextJob();
      await this.sleep(100);
    }
  }

  async stop(): Promise<void> {
    this.running = false;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.manager.unregisterWorker(this.id);
    console.log(`⏹ 워커 중지: ${this.id}`);
  }

  private async processNextJob(): Promise<void> {
    const job = await this.manager.getNextJob();
    if (!job) return;

    this.currentJob = job;
    job.status = 'processing';
    job.startedAt = Date.now();
    job.workerId = this.id;

    this.emit('jobStarted', job);

    try {
      const result = await this.simulator(job.config);
      await this.manager.completeJob(job.id, result, this.id);
      this.emit('jobCompleted', job.id, result);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.manager.failJob(job.id, errorMsg, this.id);
      this.emit('jobFailed', job.id, errorMsg);
    }

    this.currentJob = null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getId(): string {
    return this.id;
  }

  isRunning(): boolean {
    return this.running;
  }
}

// ==================== 분산 시뮬레이션 클러스터 ====================

export class SimulationCluster extends EventEmitter {
  private manager: DistributedJobManager;
  private workers: DistributedWorker[] = [];
  private running: boolean = false;
  private simulator: (config: SimulationConfig) => Promise<SimulationResult>;

  constructor(
    simulator: (config: SimulationConfig) => Promise<SimulationResult>,
    config: Partial<DistributedConfig> = {}
  ) {
    super();
    this.simulator = simulator;
    this.manager = new DistributedJobManager(config);

    // 이벤트 전달
    this.manager.on('jobCompleted', (result) => this.emit('jobCompleted', result));
    this.manager.on('jobFailed', (result) => this.emit('jobFailed', result));
  }

  async start(workerCount: number = 4): Promise<void> {
    if (this.running) return;

    this.running = true;
    console.log(`🚀 클러스터 시작: ${workerCount} 워커`);

    // 워커 생성 및 시작
    for (let i = 0; i < workerCount; i++) {
      const worker = new DistributedWorker(this.manager, this.simulator);
      this.workers.push(worker);
      worker.start(); // 비동기로 시작
    }

    // 헬스 체크 시작
    this.startHealthCheck();
  }

  async stop(): Promise<void> {
    this.running = false;

    // 모든 워커 중지
    await Promise.all(this.workers.map(w => w.stop()));
    this.workers = [];

    console.log('⏹ 클러스터 중지');
  }

  private startHealthCheck(): void {
    setInterval(() => {
      if (!this.running) return;

      const offlineWorkers = this.manager.checkWorkerHealth();
      if (offlineWorkers.length > 0) {
        console.warn(`⚠️ 오프라인 워커: ${offlineWorkers.join(', ')}`);
      }

      this.manager.checkTimeouts();
    }, 10000);
  }

  // ==================== 작업 제출 ====================

  async runSimulation(config: SimulationConfig, priority: number = 0): Promise<string> {
    return this.manager.submitJob(config, priority);
  }

  async runBatch(configs: SimulationConfig[], priority: number = 0): Promise<string[]> {
    return this.manager.submitBatch(configs, priority);
  }

  // 결과 대기
  async waitForJob(jobId: string, timeoutMs: number = 60000): Promise<SimulationResult | null> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const job = await this.manager.getJob(jobId);

      if (job?.status === 'completed') {
        // 결과 가져오기 (실제로는 resultQueue에서)
        return null; // 간소화된 구현
      }

      if (job?.status === 'failed') {
        throw new Error(job.error || 'Job failed');
      }

      await new Promise(r => setTimeout(r, 100));
    }

    throw new Error('Job timeout');
  }

  async waitForAll(jobIds: string[], timeoutMs: number = 300000): Promise<Map<string, SimulationResult | null>> {
    const results = new Map<string, SimulationResult | null>();

    await Promise.all(
      jobIds.map(async (jobId) => {
        try {
          const result = await this.waitForJob(jobId, timeoutMs);
          results.set(jobId, result);
        } catch {
          results.set(jobId, null);
        }
      })
    );

    return results;
  }

  // ==================== 통계 ====================

  async getStats(): Promise<{
    workers: WorkerInfo[];
    queue: ReturnType<typeof DistributedJobManager.prototype.getQueueStats> extends Promise<infer T> ? T : never;
  }> {
    return {
      workers: this.manager.getWorkerStats(),
      queue: await this.manager.getQueueStats(),
    };
  }
}

// ==================== 결과 집계기 ====================

export class ResultAggregator {
  private results: SimulationResult[] = [];

  add(result: SimulationResult): void {
    this.results.push(result);
  }

  addAll(results: SimulationResult[]): void {
    this.results.push(...results);
  }

  aggregate(): SimulationSummary {
    if (this.results.length === 0) {
      return {
        totalBattles: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        avgTurns: 0,
        avgPlayerDamage: 0,
        avgEnemyDamage: 0,
        topCards: [],
      };
    }

    let totalBattles = 0;
    let wins = 0;
    let losses = 0;
    let totalTurns = 0;
    let totalPlayerDamage = 0;
    let totalEnemyDamage = 0;
    const cardUsage: Record<string, number> = {};

    for (const result of this.results) {
      const s = result.summary;
      totalBattles += s.totalBattles;
      wins += s.wins;
      losses += s.losses;
      totalTurns += s.avgTurns * s.totalBattles;
      totalPlayerDamage += s.avgPlayerDamage * s.totalBattles;
      totalEnemyDamage += s.avgEnemyDamage * s.totalBattles;

      for (const card of s.topCards || []) {
        cardUsage[card.cardId] = (cardUsage[card.cardId] || 0) + card.count;
      }
    }

    const topCards = Object.entries(cardUsage)
      .map(([cardId, count]) => ({ cardId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalBattles,
      wins,
      losses,
      winRate: totalBattles > 0 ? wins / totalBattles : 0,
      avgTurns: totalBattles > 0 ? totalTurns / totalBattles : 0,
      avgPlayerDamage: totalBattles > 0 ? totalPlayerDamage / totalBattles : 0,
      avgEnemyDamage: totalBattles > 0 ? totalEnemyDamage / totalBattles : 0,
      topCards,
    };
  }

  clear(): void {
    this.results = [];
  }

  count(): number {
    return this.results.length;
  }
}

// ==================== 유틸리티 ====================

export function splitConfig(
  config: SimulationConfig,
  chunkCount: number
): SimulationConfig[] {
  const battlesPerChunk = Math.ceil(config.battles / chunkCount);
  const chunks: SimulationConfig[] = [];

  for (let i = 0; i < chunkCount; i++) {
    const remaining = config.battles - i * battlesPerChunk;
    const battles = Math.min(battlesPerChunk, remaining);

    if (battles > 0) {
      chunks.push({ ...config, battles });
    }
  }

  return chunks;
}

export function printClusterStats(stats: Awaited<ReturnType<SimulationCluster['getStats']>>): void {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 클러스터 상태');
  console.log('═'.repeat(60));

  console.log('\n📋 큐 상태:');
  console.log(`   대기 중: ${stats.queue.pending}`);
  console.log(`   처리 중: ${stats.queue.processing}`);
  console.log(`   완료: ${stats.queue.completed}`);
  console.log(`   실패: ${stats.queue.failed}`);
  console.log(`   평균 소요시간: ${(stats.queue.avgDuration / 1000).toFixed(1)}s`);

  console.log('\n👷 워커 상태:');
  for (const worker of stats.workers) {
    const icon = worker.status === 'idle' ? '🟢' : worker.status === 'busy' ? '🟡' : '🔴';
    console.log(`   ${icon} ${worker.id}: ${worker.status} (완료: ${worker.jobsCompleted})`);
  }

  console.log('\n' + '═'.repeat(60));
}
