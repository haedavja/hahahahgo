/**
 * @file cache/index.ts
 * @description 시뮬레이션 캐싱 레이어 - 결과 캐싱으로 성능 최적화
 *
 * 기능:
 * - 메모리 캐시 (LRU)
 * - 디스크 캐시
 * - 분산 캐시 (Redis)
 * - TTL 기반 만료
 * - 캐시 키 생성
 */

import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { SimulationConfig, SimulationResult } from '../core/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==================== 캐시 인터페이스 ====================

export interface CacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  keys(): Promise<string[]>;
  size(): Promise<number>;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  memoryUsage?: number;
}

export interface CacheConfig {
  maxSize: number;          // 최대 항목 수
  defaultTtlMs: number;     // 기본 TTL
  cleanupIntervalMs: number; // 정리 주기
  persistPath?: string;     // 디스크 저장 경로
}

// ==================== 메모리 캐시 (LRU) ====================

interface CacheEntry<T> {
  value: T;
  expires: number | null;
  size: number;
  accessCount: number;
  lastAccess: number;
}

export class MemoryCache implements CacheAdapter {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private config: CacheConfig;
  private stats = { hits: 0, misses: 0 };
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 1000,
      defaultTtlMs: config.defaultTtlMs || 30 * 60 * 1000, // 30분
      cleanupIntervalMs: config.cleanupIntervalMs || 60 * 1000, // 1분
      persistPath: config.persistPath,
    };

    this.startCleanupTimer();
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupIntervalMs);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // TTL 체크
    if (entry.expires && entry.expires < Date.now()) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // 접근 통계 업데이트
    entry.accessCount++;
    entry.lastAccess = Date.now();

    this.stats.hits++;
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    // 크기 초과 시 LRU 정리
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    const serialized = JSON.stringify(value);
    const size = serialized.length;

    const ttl = ttlMs ?? this.config.defaultTtlMs;

    this.cache.set(key, {
      value,
      expires: ttl > 0 ? Date.now() + ttl : null,
      size,
      accessCount: 0,
      lastAccess: Date.now(),
    });
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (entry.expires && entry.expires < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  async keys(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }

  async size(): Promise<number> {
    return this.cache.size;
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      size: this.cache.size,
      memoryUsage: this.calculateMemoryUsage(),
    };
  }

  private calculateMemoryUsage(): number {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += entry.size;
    }
    return total;
  }

  private evictLRU(): void {
    // 가장 오래 접근되지 않은 항목 제거
    let oldest: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldest = key;
      }
    }

    if (oldest) {
      this.cache.delete(oldest);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (entry.expires && entry.expires < now) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cache.clear();
  }
}

// ==================== 디스크 캐시 ====================

export class DiskCache implements CacheAdapter {
  private basePath: string;
  private config: CacheConfig;
  private stats = { hits: 0, misses: 0 };

  constructor(basePath: string, config: Partial<CacheConfig> = {}) {
    this.basePath = basePath;
    this.config = {
      maxSize: config.maxSize || 10000,
      defaultTtlMs: config.defaultTtlMs || 24 * 60 * 60 * 1000, // 24시간
      cleanupIntervalMs: config.cleanupIntervalMs || 60 * 60 * 1000, // 1시간
    };

    if (!existsSync(this.basePath)) {
      mkdirSync(this.basePath, { recursive: true });
    }
  }

  private getFilePath(key: string): string {
    const hash = createHash('md5').update(key).digest('hex');
    const dir = join(this.basePath, hash.substring(0, 2));
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return join(dir, `${hash}.json`);
  }

  async get<T>(key: string): Promise<T | null> {
    const filePath = this.getFilePath(key);

    if (!existsSync(filePath)) {
      this.stats.misses++;
      return null;
    }

    try {
      const data = JSON.parse(readFileSync(filePath, 'utf-8'));

      // TTL 체크
      if (data.expires && data.expires < Date.now()) {
        unlinkSync(filePath);
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return data.value as T;
    } catch {
      this.stats.misses++;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const filePath = this.getFilePath(key);
    const ttl = ttlMs ?? this.config.defaultTtlMs;

    const data = {
      key,
      value,
      expires: ttl > 0 ? Date.now() + ttl : null,
      created: Date.now(),
    };

    writeFileSync(filePath, JSON.stringify(data), 'utf-8');
  }

  async delete(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      return true;
    }
    return false;
  }

  async clear(): Promise<void> {
    const files = this.getAllFiles();
    for (const file of files) {
      try {
        unlinkSync(file);
      } catch {
        // 무시
      }
    }
    this.stats = { hits: 0, misses: 0 };
  }

  async has(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);
    if (!existsSync(filePath)) return false;

    try {
      const data = JSON.parse(readFileSync(filePath, 'utf-8'));
      if (data.expires && data.expires < Date.now()) {
        unlinkSync(filePath);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  async keys(): Promise<string[]> {
    const files = this.getAllFiles();
    const keys: string[] = [];

    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync(file, 'utf-8'));
        if (!data.expires || data.expires >= Date.now()) {
          keys.push(data.key);
        }
      } catch {
        // 무시
      }
    }

    return keys;
  }

  async size(): Promise<number> {
    return this.getAllFiles().length;
  }

  private getAllFiles(): string[] {
    const files: string[] = [];

    const dirs = readdirSync(this.basePath);
    for (const dir of dirs) {
      const dirPath = join(this.basePath, dir);
      if (statSync(dirPath).isDirectory()) {
        const dirFiles = readdirSync(dirPath);
        for (const file of dirFiles) {
          if (file.endsWith('.json')) {
            files.push(join(dirPath, file));
          }
        }
      }
    }

    return files;
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      size: this.getAllFiles().length,
    };
  }

  async cleanup(): Promise<number> {
    const now = Date.now();
    const files = this.getAllFiles();
    let removed = 0;

    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync(file, 'utf-8'));
        if (data.expires && data.expires < now) {
          unlinkSync(file);
          removed++;
        }
      } catch {
        // 손상된 파일 제거
        try {
          unlinkSync(file);
          removed++;
        } catch {
          // 무시
        }
      }
    }

    return removed;
  }
}

// ==================== 다층 캐시 ====================

export class TieredCache implements CacheAdapter {
  private l1: MemoryCache;
  private l2: DiskCache;

  constructor(diskPath: string, memoryConfig?: Partial<CacheConfig>, diskConfig?: Partial<CacheConfig>) {
    this.l1 = new MemoryCache(memoryConfig);
    this.l2 = new DiskCache(diskPath, diskConfig);
  }

  async get<T>(key: string): Promise<T | null> {
    // L1 먼저 확인
    let value = await this.l1.get<T>(key);
    if (value !== null) {
      return value;
    }

    // L2 확인
    value = await this.l2.get<T>(key);
    if (value !== null) {
      // L1에 승격
      await this.l1.set(key, value);
      return value;
    }

    return null;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    // 양쪽에 저장
    await Promise.all([
      this.l1.set(key, value, ttlMs),
      this.l2.set(key, value, ttlMs),
    ]);
  }

  async delete(key: string): Promise<boolean> {
    const [l1Deleted, l2Deleted] = await Promise.all([
      this.l1.delete(key),
      this.l2.delete(key),
    ]);
    return l1Deleted || l2Deleted;
  }

  async clear(): Promise<void> {
    await Promise.all([
      this.l1.clear(),
      this.l2.clear(),
    ]);
  }

  async has(key: string): Promise<boolean> {
    return await this.l1.has(key) || await this.l2.has(key);
  }

  async keys(): Promise<string[]> {
    const [l1Keys, l2Keys] = await Promise.all([
      this.l1.keys(),
      this.l2.keys(),
    ]);
    return [...new Set([...l1Keys, ...l2Keys])];
  }

  async size(): Promise<number> {
    return (await this.keys()).length;
  }

  getStats(): { l1: CacheStats; l2: CacheStats } {
    return {
      l1: this.l1.getStats(),
      l2: this.l2.getStats(),
    };
  }

  destroy(): void {
    this.l1.destroy();
  }
}

// ==================== 시뮬레이션 캐시 매니저 ====================

export class SimulationCacheManager {
  private cache: CacheAdapter;
  private keyPrefix: string;

  constructor(cache: CacheAdapter, keyPrefix: string = 'sim') {
    this.cache = cache;
    this.keyPrefix = keyPrefix;
  }

  generateKey(config: SimulationConfig): string {
    // 설정을 정렬하여 일관된 키 생성
    const normalized = {
      battles: config.battles,
      maxTurns: config.maxTurns,
      enemies: [...(config.enemyIds || [])].sort(),
      deck: [...(config.playerDeck || [])].sort(),
      player: config.playerStats,
    };

    const hash = createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('hex')
      .substring(0, 16);

    return `${this.keyPrefix}:${hash}`;
  }

  async getCached(config: SimulationConfig): Promise<SimulationResult | null> {
    const key = this.generateKey(config);
    return this.cache.get<SimulationResult>(key);
  }

  async setCached(config: SimulationConfig, result: SimulationResult, ttlMs?: number): Promise<void> {
    const key = this.generateKey(config);
    await this.cache.set(key, result, ttlMs);
  }

  async invalidate(config: SimulationConfig): Promise<boolean> {
    const key = this.generateKey(config);
    return this.cache.delete(key);
  }

  async invalidateAll(): Promise<void> {
    await this.cache.clear();
  }

  // 패턴 기반 무효화 (특정 카드/적 관련 캐시)
  async invalidatePattern(pattern: string): Promise<number> {
    const keys = await this.cache.keys();
    let count = 0;

    for (const key of keys) {
      if (key.includes(pattern)) {
        await this.cache.delete(key);
        count++;
      }
    }

    return count;
  }
}

// ==================== 데코레이터 패턴 ====================

export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  cache: CacheAdapter,
  keyGenerator: (...args: Parameters<T>) => string,
  ttlMs?: number
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const key = keyGenerator(...args);

    // 캐시 확인
    const cached = await cache.get<ReturnType<T>>(key);
    if (cached !== null) {
      return cached;
    }

    // 원본 함수 실행
    const result = await fn(...args);

    // 결과 캐싱
    await cache.set(key, result, ttlMs);

    return result;
  }) as T;
}

// ==================== 기본 캐시 인스턴스 ====================

let defaultCache: SimulationCacheManager | null = null;

export function getDefaultCache(): SimulationCacheManager {
  if (!defaultCache) {
    const cachePath = join(__dirname, '../../data/cache');
    const tieredCache = new TieredCache(cachePath);
    defaultCache = new SimulationCacheManager(tieredCache);
  }
  return defaultCache;
}

// ==================== 유틸리티 ====================

export function formatCacheStats(stats: CacheStats): string {
  const lines = [
    `캐시 통계:`,
    `  히트: ${stats.hits}`,
    `  미스: ${stats.misses}`,
    `  히트율: ${(stats.hitRate * 100).toFixed(1)}%`,
    `  크기: ${stats.size} 항목`,
  ];

  if (stats.memoryUsage !== undefined) {
    lines.push(`  메모리: ${(stats.memoryUsage / 1024).toFixed(1)} KB`);
  }

  return lines.join('\n');
}
