/**
 * @file advanced-cache.ts
 * @description 고급 캐싱 시스템 - O(1) LRU, LFU, 메모리 제한, 압축, 캐시 워밍
 */

import { createHash } from 'crypto';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';
import type { SimulationConfig, SimulationResult } from '../core/types';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

// ==================== 이중 연결 리스트 노드 ====================

class DoublyLinkedListNode<K, V> {
  key: K;
  value: V;
  prev: DoublyLinkedListNode<K, V> | null = null;
  next: DoublyLinkedListNode<K, V> | null = null;
  size: number;
  frequency: number = 1;
  lastAccess: number = Date.now();
  expires: number | null = null;

  constructor(key: K, value: V, size: number) {
    this.key = key;
    this.value = value;
    this.size = size;
  }
}

// ==================== 이중 연결 리스트 ====================

class DoublyLinkedList<K, V> {
  head: DoublyLinkedListNode<K, V> | null = null;
  tail: DoublyLinkedListNode<K, V> | null = null;
  private _length = 0;

  get length(): number {
    return this._length;
  }

  addToFront(node: DoublyLinkedListNode<K, V>): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }

    this._length++;
  }

  removeNode(node: DoublyLinkedListNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }

    node.prev = null;
    node.next = null;
    this._length--;
  }

  moveToFront(node: DoublyLinkedListNode<K, V>): void {
    if (node === this.head) return;
    this.removeNode(node);
    this.addToFront(node);
  }

  removeTail(): DoublyLinkedListNode<K, V> | null {
    if (!this.tail) return null;
    const node = this.tail;
    this.removeNode(node);
    return node;
  }

  clear(): void {
    this.head = null;
    this.tail = null;
    this._length = 0;
  }
}

// ==================== 제거 정책 ====================

export type EvictionPolicy = 'lru' | 'lfu' | 'arc' | 'fifo';

interface EvictionConfig {
  policy: EvictionPolicy;
  maxItems: number;
  maxMemoryBytes: number;
}

// ==================== O(1) LRU 캐시 ====================

export interface AdvancedCacheConfig {
  maxItems: number;
  maxMemoryBytes: number;
  defaultTtlMs: number;
  evictionPolicy: EvictionPolicy;
  compressionThreshold: number;  // 이 바이트 이상이면 압축
  cleanupIntervalMs: number;
  onEvict?: (key: string, reason: 'lru' | 'lfu' | 'ttl' | 'memory') => void;
}

export interface AdvancedCacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  itemCount: number;
  memoryUsed: number;
  memoryLimit: number;
  evictions: number;
  compressions: number;
  avgAccessTime: number;
}

export class AdvancedLRUCache<V = unknown> {
  private cache: Map<string, DoublyLinkedListNode<string, V>> = new Map();
  private list: DoublyLinkedList<string, V> = new DoublyLinkedList();
  private config: AdvancedCacheConfig;
  private currentMemory = 0;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    compressions: 0,
    totalAccessTime: 0,
    accessCount: 0,
  };
  private cleanupTimer?: ReturnType<typeof setInterval>;
  private compressedKeys: Set<string> = new Set();

  constructor(config: Partial<AdvancedCacheConfig> = {}) {
    this.config = {
      maxItems: config.maxItems ?? 1000,
      maxMemoryBytes: config.maxMemoryBytes ?? 100 * 1024 * 1024, // 100MB
      defaultTtlMs: config.defaultTtlMs ?? 30 * 60 * 1000, // 30분
      evictionPolicy: config.evictionPolicy ?? 'lru',
      compressionThreshold: config.compressionThreshold ?? 10 * 1024, // 10KB
      cleanupIntervalMs: config.cleanupIntervalMs ?? 60 * 1000, // 1분
      onEvict: config.onEvict,
    };

    this.startCleanupTimer();
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupIntervalMs);
  }

  // O(1) 조회
  async get(key: string): Promise<V | null> {
    const startTime = performance.now();

    const node = this.cache.get(key);

    if (!node) {
      this.stats.misses++;
      return null;
    }

    // TTL 체크
    if (node.expires && node.expires < Date.now()) {
      this.evict(key, 'ttl');
      this.stats.misses++;
      return null;
    }

    // 접근 통계 업데이트
    node.frequency++;
    node.lastAccess = Date.now();

    // LRU: 맨 앞으로 이동
    if (this.config.evictionPolicy === 'lru') {
      this.list.moveToFront(node);
    }

    this.stats.hits++;
    this.stats.totalAccessTime += performance.now() - startTime;
    this.stats.accessCount++;

    // 압축 해제
    if (this.compressedKeys.has(key)) {
      return this.decompress(node.value as unknown as Buffer) as V;
    }

    return node.value;
  }

  // O(1) 삽입
  async set(key: string, value: V, ttlMs?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    let size = Buffer.byteLength(serialized, 'utf8');
    let finalValue: V | Buffer = value;

    // 압축 필요 여부 확인
    if (size >= this.config.compressionThreshold) {
      try {
        const compressed = await this.compress(serialized);
        if (compressed.length < size * 0.8) { // 20% 이상 절약될 때만
          finalValue = compressed as unknown as V;
          size = compressed.length;
          this.compressedKeys.add(key);
          this.stats.compressions++;
        }
      } catch {
        // 압축 실패 시 원본 사용
      }
    } else {
      this.compressedKeys.delete(key);
    }

    // 기존 항목 업데이트
    const existingNode = this.cache.get(key);
    if (existingNode) {
      this.currentMemory -= existingNode.size;
      existingNode.value = finalValue;
      existingNode.size = size;
      existingNode.frequency++;
      existingNode.lastAccess = Date.now();
      existingNode.expires = ttlMs ? Date.now() + ttlMs :
        (this.config.defaultTtlMs > 0 ? Date.now() + this.config.defaultTtlMs : null);
      this.currentMemory += size;

      if (this.config.evictionPolicy === 'lru') {
        this.list.moveToFront(existingNode);
      }
      return;
    }

    // 공간 확보
    await this.ensureSpace(size);

    // 새 노드 생성
    const node = new DoublyLinkedListNode(key, finalValue, size);
    node.expires = ttlMs ? Date.now() + ttlMs :
      (this.config.defaultTtlMs > 0 ? Date.now() + this.config.defaultTtlMs : null);

    this.cache.set(key, node);
    this.list.addToFront(node);
    this.currentMemory += size;
  }

  // O(1) 삭제
  delete(key: string): boolean {
    const node = this.cache.get(key);
    if (!node) return false;

    this.list.removeNode(node);
    this.cache.delete(key);
    this.currentMemory -= node.size;
    this.compressedKeys.delete(key);
    return true;
  }

  has(key: string): boolean {
    const node = this.cache.get(key);
    if (!node) return false;
    if (node.expires && node.expires < Date.now()) {
      this.evict(key, 'ttl');
      return false;
    }
    return true;
  }

  clear(): void {
    this.cache.clear();
    this.list.clear();
    this.currentMemory = 0;
    this.compressedKeys.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      compressions: 0,
      totalAccessTime: 0,
      accessCount: 0,
    };
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  size(): number {
    return this.cache.size;
  }

  private async ensureSpace(requiredSize: number): Promise<void> {
    // 항목 수 제한
    while (this.cache.size >= this.config.maxItems) {
      this.evictOne();
    }

    // 메모리 제한
    while (this.currentMemory + requiredSize > this.config.maxMemoryBytes && this.cache.size > 0) {
      this.evictOne();
    }
  }

  private evictOne(): void {
    let nodeToEvict: DoublyLinkedListNode<string, V> | null = null;

    switch (this.config.evictionPolicy) {
      case 'lru':
      case 'fifo':
        nodeToEvict = this.list.tail;
        break;
      case 'lfu':
        nodeToEvict = this.findLFUNode();
        break;
      case 'arc':
        nodeToEvict = this.findARCNode();
        break;
    }

    if (nodeToEvict) {
      this.evict(nodeToEvict.key, this.config.evictionPolicy === 'lfu' ? 'lfu' : 'lru');
    }
  }

  private findLFUNode(): DoublyLinkedListNode<string, V> | null {
    let minFreq = Infinity;
    let lfuNode: DoublyLinkedListNode<string, V> | null = null;

    for (const node of this.cache.values()) {
      if (node.frequency < minFreq) {
        minFreq = node.frequency;
        lfuNode = node;
      } else if (node.frequency === minFreq && lfuNode && node.lastAccess < lfuNode.lastAccess) {
        // 같은 빈도면 가장 오래된 것
        lfuNode = node;
      }
    }

    return lfuNode;
  }

  private findARCNode(): DoublyLinkedListNode<string, V> | null {
    // Adaptive Replacement Cache: LRU와 LFU 조합
    // 간단한 구현: 빈도가 낮고 오래된 것 우선
    let bestScore = -Infinity;
    let bestNode: DoublyLinkedListNode<string, V> | null = null;
    const now = Date.now();

    for (const node of this.cache.values()) {
      // 점수 = 나이(ms) / (빈도 + 1)
      // 높을수록 제거 우선
      const age = now - node.lastAccess;
      const score = age / (node.frequency + 1);

      if (score > bestScore) {
        bestScore = score;
        bestNode = node;
      }
    }

    return bestNode;
  }

  private evict(key: string, reason: 'lru' | 'lfu' | 'ttl' | 'memory'): void {
    const node = this.cache.get(key);
    if (!node) return;

    this.list.removeNode(node);
    this.cache.delete(key);
    this.currentMemory -= node.size;
    this.compressedKeys.delete(key);
    this.stats.evictions++;

    this.config.onEvict?.(key, reason);
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, node] of this.cache) {
      if (node.expires && node.expires < now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.evict(key, 'ttl');
    }
  }

  private async compress(data: string): Promise<Buffer> {
    return gzipAsync(Buffer.from(data, 'utf8'));
  }

  private async decompress(data: Buffer): Promise<unknown> {
    const decompressed = await gunzipAsync(data);
    return JSON.parse(decompressed.toString('utf8'));
  }

  getStats(): AdvancedCacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      itemCount: this.cache.size,
      memoryUsed: this.currentMemory,
      memoryLimit: this.config.maxMemoryBytes,
      evictions: this.stats.evictions,
      compressions: this.stats.compressions,
      avgAccessTime: this.stats.accessCount > 0
        ? this.stats.totalAccessTime / this.stats.accessCount
        : 0,
    };
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

// ==================== 세그먼트 캐시 (핫/콜드 분리) ====================

export interface SegmentedCacheConfig {
  hotConfig: Partial<AdvancedCacheConfig>;
  coldConfig: Partial<AdvancedCacheConfig>;
  promotionThreshold: number;  // 이 횟수 이상 접근 시 핫으로 승격
}

export class SegmentedCache<V = unknown> {
  private hot: AdvancedLRUCache<V>;
  private cold: AdvancedLRUCache<V>;
  private accessCounts: Map<string, number> = new Map();
  private promotionThreshold: number;

  constructor(config: Partial<SegmentedCacheConfig> = {}) {
    this.hot = new AdvancedLRUCache<V>({
      maxItems: 100,
      maxMemoryBytes: 20 * 1024 * 1024, // 20MB
      defaultTtlMs: 5 * 60 * 1000, // 5분
      ...config.hotConfig,
    });

    this.cold = new AdvancedLRUCache<V>({
      maxItems: 1000,
      maxMemoryBytes: 80 * 1024 * 1024, // 80MB
      defaultTtlMs: 30 * 60 * 1000, // 30분
      ...config.coldConfig,
    });

    this.promotionThreshold = config.promotionThreshold ?? 3;
  }

  async get(key: string): Promise<V | null> {
    // 핫 캐시 먼저
    const hotValue = await this.hot.get(key);
    if (hotValue !== null) {
      return hotValue;
    }

    // 콜드 캐시
    const coldValue = await this.cold.get(key);
    if (coldValue !== null) {
      // 접근 횟수 증가
      const count = (this.accessCounts.get(key) || 0) + 1;
      this.accessCounts.set(key, count);

      // 승격 조건 충족
      if (count >= this.promotionThreshold) {
        await this.hot.set(key, coldValue);
        this.cold.delete(key);
        this.accessCounts.delete(key);
      }

      return coldValue;
    }

    return null;
  }

  async set(key: string, value: V, ttlMs?: number): Promise<void> {
    // 신규 항목은 콜드에 저장
    await this.cold.set(key, value, ttlMs);
  }

  async setHot(key: string, value: V, ttlMs?: number): Promise<void> {
    // 핫 캐시에 직접 저장 (워밍용)
    await this.hot.set(key, value, ttlMs);
  }

  delete(key: string): boolean {
    const hotDeleted = this.hot.delete(key);
    const coldDeleted = this.cold.delete(key);
    this.accessCounts.delete(key);
    return hotDeleted || coldDeleted;
  }

  has(key: string): boolean {
    return this.hot.has(key) || this.cold.has(key);
  }

  clear(): void {
    this.hot.clear();
    this.cold.clear();
    this.accessCounts.clear();
  }

  getStats(): { hot: AdvancedCacheStats; cold: AdvancedCacheStats } {
    return {
      hot: this.hot.getStats(),
      cold: this.cold.getStats(),
    };
  }

  destroy(): void {
    this.hot.destroy();
    this.cold.destroy();
    this.accessCounts.clear();
  }
}

// ==================== 캐시 워밍 ====================

export interface WarmingConfig {
  maxItems: number;
  warmOnStart: boolean;
  warmingData?: Array<{ key: string; value: unknown; priority: number }>;
}

export class CacheWarmer<V = unknown> {
  private cache: AdvancedLRUCache<V> | SegmentedCache<V>;
  private warmingQueue: Array<{ key: string; value: V; priority: number }> = [];
  private isWarming = false;

  constructor(cache: AdvancedLRUCache<V> | SegmentedCache<V>) {
    this.cache = cache;
  }

  // 워밍 항목 추가
  addWarmingItem(key: string, value: V, priority: number = 0): void {
    this.warmingQueue.push({ key, value, priority });
  }

  // 시뮬레이션 설정 기반 워밍
  addSimulationConfig(config: SimulationConfig, result: SimulationResult, priority: number = 0): void {
    const key = this.generateKey(config);
    this.addWarmingItem(key, result as unknown as V, priority);
  }

  private generateKey(config: SimulationConfig): string {
    const normalized = {
      battles: config.battles,
      maxTurns: config.maxTurns,
      enemies: [...(config.enemyIds || [])].sort(),
      deck: [...(config.playerDeck || [])].sort(),
    };
    return createHash('sha256').update(JSON.stringify(normalized)).digest('hex').substring(0, 16);
  }

  // 워밍 실행
  async warm(): Promise<{ warmed: number; failed: number }> {
    if (this.isWarming) {
      return { warmed: 0, failed: 0 };
    }

    this.isWarming = true;
    let warmed = 0;
    let failed = 0;

    // 우선순위 정렬 (높은 것 먼저)
    this.warmingQueue.sort((a, b) => b.priority - a.priority);

    for (const item of this.warmingQueue) {
      try {
        if (this.cache instanceof SegmentedCache) {
          await this.cache.setHot(item.key, item.value);
        } else {
          await this.cache.set(item.key, item.value);
        }
        warmed++;
      } catch {
        failed++;
      }
    }

    this.warmingQueue = [];
    this.isWarming = false;

    return { warmed, failed };
  }

  // 인기 시뮬레이션 기반 자동 워밍
  async warmFromPopular(
    popularConfigs: SimulationConfig[],
    simulator: (config: SimulationConfig) => Promise<SimulationResult>
  ): Promise<{ warmed: number; failed: number }> {
    let warmed = 0;
    let failed = 0;

    for (const config of popularConfigs) {
      try {
        const key = this.generateKey(config);

        // 이미 캐시에 있으면 스킵
        if (this.cache.has(key)) continue;

        const result = await simulator(config);

        if (this.cache instanceof SegmentedCache) {
          await this.cache.setHot(key, result as unknown as V);
        } else {
          await this.cache.set(key, result as unknown as V);
        }
        warmed++;
      } catch {
        failed++;
      }
    }

    return { warmed, failed };
  }
}

// ==================== 캐시 어댑터 (기존 인터페이스 호환) ====================

export class AdvancedCacheAdapter {
  private cache: AdvancedLRUCache | SegmentedCache;

  constructor(config: Partial<AdvancedCacheConfig> = {}) {
    this.cache = new AdvancedLRUCache(config);
  }

  async get<T>(key: string): Promise<T | null> {
    return this.cache.get(key) as Promise<T | null>;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    await this.cache.set(key, value, ttlMs);
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async keys(): Promise<string[]> {
    if (this.cache instanceof AdvancedLRUCache) {
      return this.cache.keys();
    }
    return [];
  }

  async size(): Promise<number> {
    if (this.cache instanceof AdvancedLRUCache) {
      return this.cache.size();
    }
    return 0;
  }

  getStats(): AdvancedCacheStats {
    if (this.cache instanceof AdvancedLRUCache) {
      return this.cache.getStats();
    }
    return (this.cache as SegmentedCache).getStats().hot;
  }

  destroy(): void {
    this.cache.destroy();
  }
}

// ==================== 유틸리티 ====================

export function formatAdvancedCacheStats(stats: AdvancedCacheStats): string {
  const memoryPercent = ((stats.memoryUsed / stats.memoryLimit) * 100).toFixed(1);

  return [
    '캐시 통계:',
    `  히트: ${stats.hits} | 미스: ${stats.misses}`,
    `  히트율: ${(stats.hitRate * 100).toFixed(1)}%`,
    `  항목 수: ${stats.itemCount}`,
    `  메모리: ${(stats.memoryUsed / 1024 / 1024).toFixed(2)} MB / ${(stats.memoryLimit / 1024 / 1024).toFixed(0)} MB (${memoryPercent}%)`,
    `  제거: ${stats.evictions}`,
    `  압축: ${stats.compressions}`,
    `  평균 접근 시간: ${stats.avgAccessTime.toFixed(3)} ms`,
  ].join('\n');
}

// ==================== 팩토리 함수 ====================

export function createOptimizedCache(options: {
  type: 'lru' | 'lfu' | 'segmented';
  maxMemoryMB?: number;
  maxItems?: number;
} = { type: 'lru' }): AdvancedLRUCache | SegmentedCache {
  const maxMemoryBytes = (options.maxMemoryMB ?? 100) * 1024 * 1024;
  const maxItems = options.maxItems ?? 1000;

  if (options.type === 'segmented') {
    return new SegmentedCache({
      hotConfig: {
        maxItems: Math.floor(maxItems * 0.1),
        maxMemoryBytes: Math.floor(maxMemoryBytes * 0.2),
        evictionPolicy: 'lru',
      },
      coldConfig: {
        maxItems: Math.floor(maxItems * 0.9),
        maxMemoryBytes: Math.floor(maxMemoryBytes * 0.8),
        evictionPolicy: 'lfu',
      },
    });
  }

  return new AdvancedLRUCache({
    maxItems,
    maxMemoryBytes,
    evictionPolicy: options.type === 'lfu' ? 'lfu' : 'lru',
  });
}
