/**
 * @file cache.test.ts
 * @description 캐싱 레이어 단위 테스트
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryCache, SimulationCacheManager } from '../cache';
import type { SimulationConfig, SimulationResult, SimulationSummary } from '../core/types';

// ==================== Mock 데이터 ====================

function createMockConfig(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    battles: 100,
    maxTurns: 30,
    enemyIds: ['ghoul'],
    playerDeck: ['slash', 'defend'],
    ...overrides,
  };
}

function createMockResult(overrides: Partial<SimulationSummary> = {}): SimulationResult {
  return {
    summary: {
      totalBattles: 100,
      wins: 60,
      losses: 40,
      draws: 0,
      winRate: 0.6,
      avgTurns: 10,
      avgPlayerDamage: 25,
      avgEnemyDamage: 30,
      topCards: [],
      cardEfficiency: {},
      ...overrides,
    },
    results: [],
    config: createMockConfig(),
    timestamp: Date.now(),
    duration: 1000,
  };
}

// ==================== MemoryCache 테스트 ====================

describe('MemoryCache', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache({
      maxSize: 10,
      defaultTtlMs: 60000,
      cleanupIntervalMs: 1000,
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('get/set', () => {
    it('값을 저장하고 가져올 수 있어야 함', async () => {
      await cache.set('key1', { value: 42 });
      const result = await cache.get<{ value: number }>('key1');
      expect(result).toEqual({ value: 42 });
    });

    it('존재하지 않는 키는 null을 반환해야 함', async () => {
      const result = await cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('복잡한 객체를 저장할 수 있어야 함', async () => {
      const mockResult = createMockResult();
      await cache.set('result', mockResult);
      const result = await cache.get<SimulationResult>('result');
      expect(result).toEqual(mockResult);
    });
  });

  describe('TTL', () => {
    it('TTL이 만료되면 null을 반환해야 함', async () => {
      await cache.set('expiring', 'value', 10); // 10ms TTL

      // 즉시 확인
      let result = await cache.get('expiring');
      expect(result).toBe('value');

      // 20ms 대기
      await new Promise(r => setTimeout(r, 20));
      result = await cache.get('expiring');
      expect(result).toBeNull();
    });
  });

  describe('has', () => {
    it('존재하는 키에 대해 true를 반환해야 함', async () => {
      await cache.set('exists', 'value');
      expect(await cache.has('exists')).toBe(true);
    });

    it('존재하지 않는 키에 대해 false를 반환해야 함', async () => {
      expect(await cache.has('notexists')).toBe(false);
    });
  });

  describe('delete', () => {
    it('항목을 삭제해야 함', async () => {
      await cache.set('toDelete', 'value');
      expect(await cache.has('toDelete')).toBe(true);

      const deleted = await cache.delete('toDelete');
      expect(deleted).toBe(true);
      expect(await cache.has('toDelete')).toBe(false);
    });

    it('존재하지 않는 키 삭제 시 false를 반환해야 함', async () => {
      const deleted = await cache.delete('notexists');
      expect(deleted).toBe(false);
    });
  });

  describe('clear', () => {
    it('모든 항목을 제거해야 함', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      await cache.clear();

      expect(await cache.size()).toBe(0);
      expect(await cache.get('key1')).toBeNull();
    });
  });

  describe('keys', () => {
    it('모든 키를 반환해야 함', async () => {
      await cache.set('a', 1);
      await cache.set('b', 2);
      await cache.set('c', 3);

      const keys = await cache.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('a');
      expect(keys).toContain('b');
      expect(keys).toContain('c');
    });
  });

  describe('size', () => {
    it('저장된 항목 수를 반환해야 함', async () => {
      expect(await cache.size()).toBe(0);

      await cache.set('key1', 'value1');
      expect(await cache.size()).toBe(1);

      await cache.set('key2', 'value2');
      expect(await cache.size()).toBe(2);
    });
  });

  describe('LRU eviction', () => {
    it('최대 크기 초과 시 가장 오래된 항목을 제거해야 함', async () => {
      // maxSize: 10
      for (let i = 0; i < 10; i++) {
        await cache.set(`key${i}`, i);
      }

      expect(await cache.size()).toBe(10);

      // 11번째 항목 추가
      await cache.set('key10', 10);
      expect(await cache.size()).toBe(10);

      // 첫 번째 항목이 제거되었어야 함
      expect(await cache.get('key0')).toBeNull();
    });
  });

  describe('stats', () => {
    it('캐시 통계를 반환해야 함', async () => {
      await cache.set('hit', 'value');
      await cache.get('hit');    // hit
      await cache.get('miss');   // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });
  });
});

// ==================== SimulationCacheManager 테스트 ====================

describe('SimulationCacheManager', () => {
  let memoryCache: MemoryCache;
  let manager: SimulationCacheManager;

  beforeEach(() => {
    memoryCache = new MemoryCache();
    manager = new SimulationCacheManager(memoryCache);
  });

  afterEach(() => {
    memoryCache.destroy();
  });

  describe('generateKey', () => {
    it('동일한 설정에 대해 동일한 키를 생성해야 함', () => {
      const config1 = createMockConfig();
      const config2 = createMockConfig();

      const key1 = manager.generateKey(config1);
      const key2 = manager.generateKey(config2);

      expect(key1).toBe(key2);
    });

    it('다른 설정에 대해 다른 키를 생성해야 함', () => {
      const config1 = createMockConfig({ battles: 100 });
      const config2 = createMockConfig({ battles: 200 });

      const key1 = manager.generateKey(config1);
      const key2 = manager.generateKey(config2);

      expect(key1).not.toBe(key2);
    });

    it('덱 순서가 달라도 동일한 키를 생성해야 함', () => {
      const config1 = createMockConfig({ playerDeck: ['slash', 'defend'] });
      const config2 = createMockConfig({ playerDeck: ['defend', 'slash'] });

      const key1 = manager.generateKey(config1);
      const key2 = manager.generateKey(config2);

      expect(key1).toBe(key2);
    });
  });

  describe('getCached/setCached', () => {
    it('시뮬레이션 결과를 캐싱하고 가져올 수 있어야 함', async () => {
      const config = createMockConfig();
      const result = createMockResult();

      await manager.setCached(config, result);
      const cached = await manager.getCached(config);

      expect(cached).toEqual(result);
    });

    it('캐시되지 않은 설정은 null을 반환해야 함', async () => {
      const config = createMockConfig({ battles: 999 });
      const cached = await manager.getCached(config);
      expect(cached).toBeNull();
    });
  });

  describe('invalidate', () => {
    it('특정 설정의 캐시를 무효화해야 함', async () => {
      const config = createMockConfig();
      const result = createMockResult();

      await manager.setCached(config, result);
      expect(await manager.getCached(config)).not.toBeNull();

      const invalidated = await manager.invalidate(config);
      expect(invalidated).toBe(true);
      expect(await manager.getCached(config)).toBeNull();
    });
  });

  describe('invalidateAll', () => {
    it('모든 캐시를 무효화해야 함', async () => {
      const config1 = createMockConfig({ battles: 100 });
      const config2 = createMockConfig({ battles: 200 });

      await manager.setCached(config1, createMockResult());
      await manager.setCached(config2, createMockResult());

      await manager.invalidateAll();

      expect(await manager.getCached(config1)).toBeNull();
      expect(await manager.getCached(config2)).toBeNull();
    });
  });
});
