/**
 * @file lru-cache.ts
 * @description LRU (Least Recently Used) 캐시 구현
 *
 * 자주 사용되는 항목을 메모리에 유지하면서 메모리 사용량을 제한합니다.
 * Map의 순서 보장 특성을 활용하여 O(1) 시간 복잡도를 달성합니다.
 */

/**
 * LRU 캐시 옵션
 */
export interface LRUCacheOptions<K, V> {
  /** 최대 항목 수 */
  maxSize: number;
  /** 항목 만료 시간 (ms), undefined면 만료 없음 */
  ttl?: number;
  /** 항목 제거 시 콜백 */
  onEvict?: (key: K, value: V) => void;
  /** 캐시 미스 시 자동 로드 함수 */
  loader?: (key: K) => V | Promise<V>;
}

/**
 * 캐시 항목 메타데이터
 */
interface CacheEntry<V> {
  value: V;
  createdAt: number;
  accessCount: number;
}

/**
 * 캐시 통계
 */
export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRate: number;
}

/**
 * LRU 캐시 구현
 *
 * @example
 * ```typescript
 * const cache = new LRUCache<string, GameState>({ maxSize: 1000 });
 * cache.set('state1', gameState);
 * const state = cache.get('state1');
 * ```
 */
export class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>>;
  private readonly maxSize: number;
  private readonly ttl?: number;
  private readonly onEvict?: (key: K, value: V) => void;
  private readonly loader?: (key: K) => V | Promise<V>;

  // 통계
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(options: LRUCacheOptions<K, V>) {
    this.maxSize = options.maxSize;
    this.ttl = options.ttl;
    this.onEvict = options.onEvict;
    this.loader = options.loader;
    this.cache = new Map();
  }

  /**
   * 캐시에서 값 가져오기
   * 항목이 있으면 LRU 순서 갱신 (최근 사용으로 이동)
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // TTL 확인
    if (this.isExpired(entry)) {
      this.delete(key);
      this.misses++;
      return undefined;
    }

    // LRU 순서 갱신: 삭제 후 재삽입 (Map은 삽입 순서 유지)
    this.cache.delete(key);
    entry.accessCount++;
    this.cache.set(key, entry);
    this.hits++;

    return entry.value;
  }

  /**
   * 캐시에 값 저장
   * 최대 크기 초과 시 가장 오래된 항목 제거
   */
  set(key: K, value: V): this {
    // 이미 존재하면 삭제 (순서 갱신)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 크기 제한 확인
    while (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    // 새 항목 추가
    this.cache.set(key, {
      value,
      createdAt: Date.now(),
      accessCount: 1,
    });

    return this;
  }

  /**
   * 캐시에서 항목 삭제
   */
  delete(key: K): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.onEvict?.(key, entry.value);
      return true;
    }
    return false;
  }

  /**
   * 캐시에 키가 있는지 확인
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (this.isExpired(entry)) {
      this.delete(key);
      return false;
    }
    return true;
  }

  /**
   * 캐시 전체 삭제
   */
  clear(): void {
    if (this.onEvict) {
      for (const [key, entry] of this.cache) {
        this.onEvict(key, entry.value);
      }
    }
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * 캐시 크기
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 캐시 통계
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      size: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * 통계 초기화
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * 모든 키 반환
   */
  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  /**
   * 모든 값 반환
   */
  values(): V[] {
    return Array.from(this.cache.values()).map(e => e.value);
  }

  /**
   * 모든 항목 반환
   */
  entries(): Array<[K, V]> {
    return Array.from(this.cache.entries()).map(([k, e]) => [k, e.value]);
  }

  /**
   * 자동 로드와 함께 값 가져오기
   */
  async getOrLoad(key: K): Promise<V | undefined> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    if (!this.loader) {
      return undefined;
    }

    const value = await this.loader(key);
    this.set(key, value);
    return value;
  }

  /**
   * 만료된 항목 제거
   */
  prune(): number {
    if (!this.ttl) return 0;

    let pruned = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache) {
      if (now - entry.createdAt > this.ttl) {
        this.delete(key);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * 가장 오래된 항목 제거
   */
  private evictOldest(): void {
    const oldestKey = this.cache.keys().next().value;
    if (oldestKey !== undefined) {
      const entry = this.cache.get(oldestKey);
      this.cache.delete(oldestKey);
      this.evictions++;
      if (entry) {
        this.onEvict?.(oldestKey, entry.value);
      }
    }
  }

  /**
   * 항목 만료 확인
   */
  private isExpired(entry: CacheEntry<V>): boolean {
    if (!this.ttl) return false;
    return Date.now() - entry.createdAt > this.ttl;
  }
}

// ==================== 특수 캐시 변형 ====================

/**
 * TTL 기반 캐시 (자동 만료)
 */
export class TTLCache<K, V> extends LRUCache<K, V> {
  private cleanupInterval?: ReturnType<typeof setInterval>;

  constructor(options: LRUCacheOptions<K, V> & { cleanupIntervalMs?: number }) {
    super(options);

    // 주기적 정리 설정
    if (options.cleanupIntervalMs) {
      this.cleanupInterval = setInterval(() => {
        this.prune();
      }, options.cleanupIntervalMs);
    }
  }

  /**
   * 캐시 정리 및 인터벌 해제
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

/**
 * WeakRef 기반 캐시 (가비지 컬렉션 허용)
 * 객체 값만 저장 가능
 */
export class WeakRefCache<K, V extends object> {
  private cache: Map<K, WeakRef<V>>;
  private readonly maxSize: number;
  private readonly finalizer: FinalizationRegistry<K>;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.finalizer = new FinalizationRegistry((key) => {
      this.cache.delete(key);
    });
  }

  get(key: K): V | undefined {
    const ref = this.cache.get(key);
    if (!ref) return undefined;

    const value = ref.deref();
    if (!value) {
      // 가비지 컬렉션됨
      this.cache.delete(key);
      return undefined;
    }

    // LRU 순서 갱신
    this.cache.delete(key);
    this.cache.set(key, ref);

    return value;
  }

  set(key: K, value: V): this {
    // 이미 존재하면 삭제
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 크기 제한
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    const ref = new WeakRef(value);
    this.cache.set(key, ref);
    this.finalizer.register(value, key);

    return this;
  }

  has(key: K): boolean {
    const ref = this.cache.get(key);
    if (!ref) return false;
    const value = ref.deref();
    if (!value) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// ==================== 팩토리 함수 ====================

/**
 * 게임 상태 캐시 생성 (시뮬레이션용)
 */
export function createStateCache<T>(maxSize = 1000): LRUCache<string, T> {
  return new LRUCache<string, T>({ maxSize });
}

/**
 * 시뮬레이션 결과 캐시 생성
 */
export function createResultCache<T>(
  maxSize = 500,
  ttlMs = 60000
): TTLCache<string, T> {
  return new TTLCache<string, T>({
    maxSize,
    ttl: ttlMs,
    cleanupIntervalMs: 30000,
  });
}

/**
 * 트랜스포지션 테이블 캐시 생성 (MCTS용)
 */
export function createTranspositionCache(maxSize = 10000): LRUCache<string, { visits: number; value: number }> {
  return new LRUCache<string, { visits: number; value: number }>({ maxSize });
}
