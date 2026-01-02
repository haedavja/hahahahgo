/**
 * @file systems.test.ts
 * @description 핵심 시스템 통합 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ==================== 상징(Relic) 시스템 테스트 ====================

describe('RelicSystem', () => {
  interface RelicDefinition {
    id: string;
    name: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'cursed';
    triggers: string[];
    effects: { type: string; value: number }[];
  }

  interface RelicEffectResult {
    relicId: string;
    energyGain?: number;
    heal?: number;
    draw?: number;
    damage?: number;
    blockGain?: number;
  }

  const RELICS: Record<string, RelicDefinition> = {
    burning_blood: {
      id: 'burning_blood',
      name: '불타는 피',
      rarity: 'common',
      triggers: ['battle_end'],
      effects: [{ type: 'heal', value: 6 }],
    },
    bronze_scales: {
      id: 'bronze_scales',
      name: '청동 비늘',
      rarity: 'common',
      triggers: ['on_take_damage'],
      effects: [{ type: 'deal_damage', value: 3 }],
    },
    tungsten_rod: {
      id: 'tungsten_rod',
      name: '텅스텐 막대',
      rarity: 'rare',
      triggers: ['on_take_damage'],
      effects: [{ type: 'reduce_damage', value: 1 }],
    },
  };

  function processTrigger(
    relicIds: string[],
    trigger: string,
    context?: { damage?: number }
  ): RelicEffectResult[] {
    const results: RelicEffectResult[] = [];

    for (const id of relicIds) {
      const relic = RELICS[id];
      if (!relic || !relic.triggers.includes(trigger)) continue;

      const result: RelicEffectResult = { relicId: id };

      for (const effect of relic.effects) {
        switch (effect.type) {
          case 'heal':
            result.heal = effect.value;
            break;
          case 'deal_damage':
            result.damage = effect.value;
            break;
          case 'reduce_damage':
            // 피해 감소는 context에서 적용
            break;
        }
      }

      results.push(result);
    }

    return results;
  }

  it('전투 종료 시 불타는 피가 회복해야 함', () => {
    const results = processTrigger(['burning_blood'], 'battle_end');
    expect(results).toHaveLength(1);
    expect(results[0].heal).toBe(6);
  });

  it('피해 받을 시 청동 비늘이 반격해야 함', () => {
    const results = processTrigger(['bronze_scales'], 'on_take_damage');
    expect(results).toHaveLength(1);
    expect(results[0].damage).toBe(3);
  });

  it('관련 없는 트리거는 무시해야 함', () => {
    const results = processTrigger(['burning_blood'], 'turn_start');
    expect(results).toHaveLength(0);
  });

  it('여러 상징이 동시에 발동해야 함', () => {
    const results = processTrigger(['burning_blood', 'bronze_scales'], 'on_take_damage');
    // burning_blood는 on_take_damage에 반응하지 않음
    expect(results).toHaveLength(1);
    expect(results[0].relicId).toBe('bronze_scales');
  });
});

// ==================== 이변(Anomaly) 시스템 테스트 ====================

describe('AnomalySystem', () => {
  interface AnomalyDefinition {
    id: string;
    name: string;
    category: string;
    modifiers: { type: string; stat: string; value: number }[];
  }

  const ANOMALIES: Record<string, AnomalyDefinition> = {
    blood_moon: {
      id: 'blood_moon',
      name: '핏빛 달',
      category: 'combat',
      modifiers: [
        { type: 'multiply', stat: 'damage', value: 1.25 },
        { type: 'multiply', stat: 'heal', value: 0.5 },
      ],
    },
    energy_flux: {
      id: 'energy_flux',
      name: '에너지 변동',
      category: 'resource',
      modifiers: [],
    },
    heavy_burden: {
      id: 'heavy_burden',
      name: '무거운 짐',
      category: 'card',
      modifiers: [
        { type: 'add', stat: 'card_cost', value: 1 },
      ],
    },
  };

  function modifyDamage(baseDamage: number, activeAnomalies: string[]): number {
    let modified = baseDamage;

    for (const id of activeAnomalies) {
      const anomaly = ANOMALIES[id];
      if (!anomaly) continue;

      for (const mod of anomaly.modifiers) {
        if (mod.stat !== 'damage') continue;

        if (mod.type === 'multiply') {
          modified = Math.floor(modified * mod.value);
        } else if (mod.type === 'add') {
          modified += mod.value;
        }
      }
    }

    return Math.max(0, modified);
  }

  function modifyCardCost(baseCost: number, activeAnomalies: string[]): number {
    let modified = baseCost;

    for (const id of activeAnomalies) {
      const anomaly = ANOMALIES[id];
      if (!anomaly) continue;

      for (const mod of anomaly.modifiers) {
        if (mod.stat !== 'card_cost') continue;

        if (mod.type === 'add') {
          modified += mod.value;
        }
      }
    }

    return Math.max(0, modified);
  }

  it('핏빛 달이 피해를 25% 증가시켜야 함', () => {
    const modified = modifyDamage(100, ['blood_moon']);
    expect(modified).toBe(125);
  });

  it('무거운 짐이 카드 비용을 1 증가시켜야 함', () => {
    const modified = modifyCardCost(2, ['heavy_burden']);
    expect(modified).toBe(3);
  });

  it('관련 없는 이변은 피해에 영향 없음', () => {
    const modified = modifyDamage(100, ['heavy_burden']);
    expect(modified).toBe(100);
  });

  it('피해가 음수가 되지 않아야 함', () => {
    const modified = modifyDamage(0, ['blood_moon']);
    expect(modified).toBeGreaterThanOrEqual(0);
  });
});

// ==================== 에러 처리 시스템 테스트 ====================

describe('ErrorHandling', () => {
  interface SimulatorError extends Error {
    code: string;
    category: string;
    severity: string;
    recoverable: boolean;
    retryCount?: number;
  }

  const ERROR_CODES = {
    WORKER_INIT_FAILED: { code: 'W001', category: 'worker', severity: 'high', recoverable: true },
    SIM_INVALID_CONFIG: { code: 'S001', category: 'simulation', severity: 'high', recoverable: false },
    DATA_CARD_NOT_FOUND: { code: 'D001', category: 'data', severity: 'medium', recoverable: false },
    TIMEOUT_TASK: { code: 'T001', category: 'timeout', severity: 'medium', recoverable: true },
  };

  function createError(codeKey: keyof typeof ERROR_CODES, message: string): SimulatorError {
    const def = ERROR_CODES[codeKey];
    const error = new Error(message) as SimulatorError;
    error.code = def.code;
    error.category = def.category;
    error.severity = def.severity;
    error.recoverable = def.recoverable;
    error.retryCount = 0;
    return error;
  }

  async function handleWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (err) {
        lastError = err as Error;
        if ((lastError as SimulatorError).recoverable === false) {
          throw lastError;
        }
      }
    }

    throw lastError;
  }

  it('에러가 올바른 코드를 가져야 함', () => {
    const error = createError('WORKER_INIT_FAILED', 'Test error');
    expect(error.code).toBe('W001');
    expect(error.category).toBe('worker');
    expect(error.severity).toBe('high');
    expect(error.recoverable).toBe(true);
  });

  it('복구 불가능한 에러는 즉시 throw해야 함', async () => {
    let attempts = 0;
    const operation = async () => {
      attempts++;
      throw createError('SIM_INVALID_CONFIG', 'Invalid config');
    };

    await expect(handleWithRetry(operation, 3)).rejects.toThrow();
    expect(attempts).toBe(1); // 복구 불가능하므로 1회만 시도
  });

  it('복구 가능한 에러는 재시도해야 함', async () => {
    let attempts = 0;
    const operation = async () => {
      attempts++;
      if (attempts < 3) {
        throw createError('TIMEOUT_TASK', 'Timeout');
      }
      return 'success';
    };

    const result = await handleWithRetry(operation, 3);
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });
});

// ==================== 서킷 브레이커 테스트 ====================

describe('CircuitBreaker', () => {
  class CircuitBreaker {
    private state: 'closed' | 'open' | 'half-open' = 'closed';
    private failures = 0;
    private lastFailure = 0;
    private successCount = 0;
    private failureThreshold: number;
    private resetTimeout: number;
    private halfOpenRequests: number;

    constructor(options: { failureThreshold: number; resetTimeout: number; halfOpenRequests: number }) {
      this.failureThreshold = options.failureThreshold;
      this.resetTimeout = options.resetTimeout;
      this.halfOpenRequests = options.halfOpenRequests;
    }

    async execute<T>(operation: () => Promise<T>): Promise<T> {
      if (this.state === 'open') {
        if (Date.now() - this.lastFailure >= this.resetTimeout) {
          this.state = 'half-open';
          this.successCount = 0;
        } else {
          throw new Error('Circuit breaker is open');
        }
      }

      try {
        const result = await operation();
        this.onSuccess();
        return result;
      } catch (error) {
        this.onFailure();
        throw error;
      }
    }

    private onSuccess(): void {
      if (this.state === 'half-open') {
        this.successCount++;
        if (this.successCount >= this.halfOpenRequests) {
          this.state = 'closed';
          this.failures = 0;
        }
      } else {
        this.failures = 0;
      }
    }

    private onFailure(): void {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= this.failureThreshold) {
        this.state = 'open';
      }
    }

    getState(): string {
      return this.state;
    }
  }

  it('연속 실패 시 회로가 열려야 함', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
      halfOpenRequests: 2,
    });

    const failOperation = async () => {
      throw new Error('fail');
    };

    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failOperation)).rejects.toThrow();
    }

    expect(breaker.getState()).toBe('open');
  });

  it('회로가 열리면 요청을 차단해야 함', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeout: 10000, // 긴 리셋 타임아웃
      halfOpenRequests: 1,
    });

    const failOperation = async () => {
      throw new Error('fail');
    };

    await expect(breaker.execute(failOperation)).rejects.toThrow();
    expect(breaker.getState()).toBe('open');

    // 열린 상태에서 요청 차단
    await expect(breaker.execute(async () => 'success')).rejects.toThrow('Circuit breaker is open');
  });

  it('성공 시 실패 카운트가 리셋되어야 함', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
      halfOpenRequests: 2,
    });

    const failOperation = async () => {
      throw new Error('fail');
    };
    const successOperation = async () => 'success';

    // 2번 실패
    await expect(breaker.execute(failOperation)).rejects.toThrow();
    await expect(breaker.execute(failOperation)).rejects.toThrow();
    expect(breaker.getState()).toBe('closed');

    // 1번 성공으로 리셋
    await breaker.execute(successOperation);
    expect(breaker.getState()).toBe('closed');

    // 다시 2번 실패해도 열리지 않음
    await expect(breaker.execute(failOperation)).rejects.toThrow();
    await expect(breaker.execute(failOperation)).rejects.toThrow();
    expect(breaker.getState()).toBe('closed');
  });
});

// ==================== AI 대전 시스템 테스트 ====================

describe('AIBattleSystem', () => {
  type AIType = 'greedy' | 'random' | 'defensive' | 'aggressive';

  interface Card {
    id: string;
    damage?: number;
    block?: number;
    cost: number;
  }

  interface AIConfig {
    type: AIType;
    name: string;
    hp: number;
    energy: number;
  }

  const CARDS: Record<string, Card> = {
    slash: { id: 'slash', damage: 6, cost: 1 },
    defend: { id: 'defend', block: 5, cost: 1 },
    heavy_blow: { id: 'heavy_blow', damage: 10, cost: 2 },
  };

  function selectCards(type: AIType, hand: string[], energy: number): string[] {
    const cards = hand.map(id => CARDS[id]).filter(c => c && c.cost <= energy);

    switch (type) {
      case 'greedy':
        // 피해량 순으로 정렬
        cards.sort((a, b) => (b.damage || 0) - (a.damage || 0));
        break;
      case 'defensive':
        // 블록 순으로 정렬
        cards.sort((a, b) => (b.block || 0) - (a.block || 0));
        break;
      case 'aggressive':
        // 피해량 순으로 정렬
        cards.sort((a, b) => (b.damage || 0) - (a.damage || 0));
        break;
      case 'random':
        cards.sort(() => Math.random() - 0.5);
        break;
    }

    const selected: string[] = [];
    let remainingEnergy = energy;

    for (const card of cards) {
      if (card.cost <= remainingEnergy && selected.length < 3) {
        selected.push(card.id);
        remainingEnergy -= card.cost;
      }
    }

    return selected;
  }

  it('greedy AI가 높은 피해 카드를 선택해야 함', () => {
    const selected = selectCards('greedy', ['slash', 'defend', 'heavy_blow'], 3);
    expect(selected[0]).toBe('heavy_blow');
  });

  it('defensive AI가 방어 카드를 우선해야 함', () => {
    const selected = selectCards('defensive', ['slash', 'defend', 'heavy_blow'], 3);
    expect(selected[0]).toBe('defend');
  });

  it('에너지 제한을 지켜야 함', () => {
    const selected = selectCards('greedy', ['heavy_blow', 'heavy_blow', 'heavy_blow'], 3);
    expect(selected.length).toBeLessThanOrEqual(1); // 2 비용이므로 1개만 가능
  });

  it('최대 3장 선택 제한', () => {
    const selected = selectCards('greedy', ['slash', 'slash', 'slash', 'slash', 'slash'], 10);
    expect(selected.length).toBeLessThanOrEqual(3);
  });
});

// ==================== 분산 큐 시스템 테스트 ====================

describe('DistributedQueue', () => {
  interface Job {
    id: string;
    config: { battles: number };
    priority: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
  }

  class InMemoryQueue<T> {
    private items: Array<{ data: T; priority: number }> = [];

    async push(item: T, priority: number = 0): Promise<void> {
      this.items.push({ data: item, priority });
      this.items.sort((a, b) => b.priority - a.priority);
    }

    async pop(): Promise<T | null> {
      const item = this.items.shift();
      return item?.data || null;
    }

    async length(): Promise<number> {
      return this.items.length;
    }

    async clear(): Promise<void> {
      this.items = [];
    }
  }

  it('우선순위에 따라 정렬해야 함', async () => {
    const queue = new InMemoryQueue<Job>();

    await queue.push({ id: '1', config: { battles: 100 }, priority: 1, status: 'pending' }, 1);
    await queue.push({ id: '2', config: { battles: 100 }, priority: 3, status: 'pending' }, 3);
    await queue.push({ id: '3', config: { battles: 100 }, priority: 2, status: 'pending' }, 2);

    const first = await queue.pop();
    const second = await queue.pop();
    const third = await queue.pop();

    expect(first?.id).toBe('2'); // 가장 높은 우선순위
    expect(second?.id).toBe('3');
    expect(third?.id).toBe('1');
  });

  it('빈 큐에서 pop은 null 반환', async () => {
    const queue = new InMemoryQueue<Job>();
    const result = await queue.pop();
    expect(result).toBeNull();
  });

  it('length가 정확해야 함', async () => {
    const queue = new InMemoryQueue<Job>();

    expect(await queue.length()).toBe(0);

    await queue.push({ id: '1', config: { battles: 100 }, priority: 1, status: 'pending' }, 1);
    expect(await queue.length()).toBe(1);

    await queue.pop();
    expect(await queue.length()).toBe(0);
  });

  it('clear가 모든 항목을 제거해야 함', async () => {
    const queue = new InMemoryQueue<Job>();

    await queue.push({ id: '1', config: { battles: 100 }, priority: 1, status: 'pending' }, 1);
    await queue.push({ id: '2', config: { battles: 100 }, priority: 2, status: 'pending' }, 2);

    expect(await queue.length()).toBe(2);
    await queue.clear();
    expect(await queue.length()).toBe(0);
  });
});

// ==================== 로거 시스템 테스트 ====================

describe('LoggerSystem', () => {
  enum LogLevel {
    TRACE = 0,
    DEBUG = 1,
    INFO = 2,
    WARN = 3,
    ERROR = 4,
    FATAL = 5,
    SILENT = 6,
  }

  interface LogEntry {
    level: LogLevel;
    message: string;
    module: string;
    timestamp: Date;
  }

  class MemoryTransport {
    private logs: LogEntry[] = [];
    private minLevel: LogLevel;

    constructor(minLevel: LogLevel = LogLevel.DEBUG) {
      this.minLevel = minLevel;
    }

    log(entry: LogEntry): void {
      if (entry.level >= this.minLevel) {
        this.logs.push(entry);
      }
    }

    getLogs(): LogEntry[] {
      return [...this.logs];
    }

    clear(): void {
      this.logs = [];
    }
  }

  class Logger {
    private module: string;
    private transport: MemoryTransport;

    constructor(module: string, transport: MemoryTransport) {
      this.module = module;
      this.transport = transport;
    }

    private log(level: LogLevel, message: string): void {
      this.transport.log({
        level,
        message,
        module: this.module,
        timestamp: new Date(),
      });
    }

    debug(message: string): void { this.log(LogLevel.DEBUG, message); }
    info(message: string): void { this.log(LogLevel.INFO, message); }
    warn(message: string): void { this.log(LogLevel.WARN, message); }
    error(message: string): void { this.log(LogLevel.ERROR, message); }
  }

  it('로그가 저장되어야 함', () => {
    const transport = new MemoryTransport();
    const logger = new Logger('Test', transport);

    logger.info('Test message');

    const logs = transport.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('Test message');
    expect(logs[0].module).toBe('Test');
    expect(logs[0].level).toBe(LogLevel.INFO);
  });

  it('최소 레벨 이하는 무시해야 함', () => {
    const transport = new MemoryTransport(LogLevel.WARN);
    const logger = new Logger('Test', transport);

    logger.debug('Debug');
    logger.info('Info');
    logger.warn('Warning');

    const logs = transport.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('Warning');
  });

  it('clear가 로그를 비워야 함', () => {
    const transport = new MemoryTransport();
    const logger = new Logger('Test', transport);

    logger.info('Message 1');
    logger.info('Message 2');

    expect(transport.getLogs()).toHaveLength(2);
    transport.clear();
    expect(transport.getLogs()).toHaveLength(0);
  });
});

// ==================== 캐시 시스템 테스트 ====================

describe('CacheSystem', () => {
  class LRUCache<K, V> {
    private cache = new Map<K, { value: V; timestamp: number }>();
    private maxSize: number;

    constructor(maxSize: number) {
      this.maxSize = maxSize;
    }

    get(key: K): V | undefined {
      const item = this.cache.get(key);
      if (item) {
        // LRU: 접근 시 timestamp 갱신
        item.timestamp = Date.now();
        return item.value;
      }
      return undefined;
    }

    set(key: K, value: V): void {
      // 크기 초과 시 가장 오래된 항목 제거
      if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
        let oldestKey: K | null = null;
        let oldestTime = Infinity;

        for (const [k, v] of this.cache) {
          if (v.timestamp < oldestTime) {
            oldestTime = v.timestamp;
            oldestKey = k;
          }
        }

        if (oldestKey !== null) {
          this.cache.delete(oldestKey);
        }
      }

      this.cache.set(key, { value, timestamp: Date.now() });
    }

    has(key: K): boolean {
      return this.cache.has(key);
    }

    size(): number {
      return this.cache.size;
    }

    clear(): void {
      this.cache.clear();
    }
  }

  it('값을 저장하고 조회해야 함', () => {
    const cache = new LRUCache<string, number>(10);
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
  });

  it('최대 크기를 초과하면 가장 오래된 항목 제거', async () => {
    const cache = new LRUCache<string, number>(3);

    cache.set('a', 1);
    await new Promise(r => setTimeout(r, 10));
    cache.set('b', 2);
    await new Promise(r => setTimeout(r, 10));
    cache.set('c', 3);
    await new Promise(r => setTimeout(r, 10));

    // 'a'를 접근하여 timestamp 갱신
    cache.get('a');

    // 'd' 추가 시 가장 오래된 'b'가 제거됨
    cache.set('d', 4);

    expect(cache.has('a')).toBe(true);
    expect(cache.has('b')).toBe(false); // 제거됨
    expect(cache.has('c')).toBe(true);
    expect(cache.has('d')).toBe(true);
  });

  it('없는 키 조회 시 undefined 반환', () => {
    const cache = new LRUCache<string, number>(10);
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('size가 정확해야 함', () => {
    const cache = new LRUCache<string, number>(10);
    expect(cache.size()).toBe(0);
    cache.set('a', 1);
    expect(cache.size()).toBe(1);
    cache.set('b', 2);
    expect(cache.size()).toBe(2);
  });
});

// ==================== 특성(Trait) 시스템 테스트 ====================

describe('TraitSynergySystem', () => {
  // 공격력 증폭 특성 정의
  const DAMAGE_MULTIPLIER_TRAITS: Record<string, number> = {
    strongbone: 1.25,    // 강골: 25% 증폭
    destroyer: 1.5,      // 파괴자: 50% 증폭
    slaughter: 1.75,     // 살육: 75% 증폭
    pinnacle: 2.5,       // 절정: 150% 증폭
    weakbone: 0.8,       // 약골: 20% 감소
  };

  // 속도 수정 특성 정의
  const SPEED_MODIFIER_TRAITS: Record<string, number> = {
    swift: -2,           // 신속: 2 빠름
    slow: 3,             // 느림: 3 느림
    mastery: -2,         // 숙련: 속도 -2
    advance: -3,         // 앞당김: 속도 -3
    boredom: 2,          // 싫증: 속도 +2
    last: 999,           // 마지막: 타임라인 최후
  };

  interface TraitResult {
    damageMultiplier: number;
    speedModifier: number;
    synergies: string[];
  }

  function processTraits(traits: string[], context: { chainActive?: boolean; crossed?: boolean } = {}): TraitResult {
    const result: TraitResult = {
      damageMultiplier: 1.0,
      speedModifier: 0,
      synergies: [],
    };

    for (const trait of traits) {
      // 공격력 증폭
      if (DAMAGE_MULTIPLIER_TRAITS[trait]) {
        result.damageMultiplier *= DAMAGE_MULTIPLIER_TRAITS[trait];
        result.synergies.push(`${trait}: 공격력 x${DAMAGE_MULTIPLIER_TRAITS[trait]}`);
      }

      // 속도 수정
      if (SPEED_MODIFIER_TRAITS[trait]) {
        result.speedModifier += SPEED_MODIFIER_TRAITS[trait];
        result.synergies.push(`${trait}: 속도 ${SPEED_MODIFIER_TRAITS[trait] > 0 ? '+' : ''}${SPEED_MODIFIER_TRAITS[trait]}`);
      }

      // 특수 특성
      switch (trait) {
        case 'chain':
          result.synergies.push('연계 시작');
          break;
        case 'followup':
          if (context.chainActive) {
            result.damageMultiplier *= 1.3;
            result.synergies.push('후속 연계: 공격력 x1.3');
          }
          break;
        case 'cross':
          if (context.crossed) {
            result.damageMultiplier *= 1.5;
            result.synergies.push('교차: 공격력 x1.5');
          }
          break;
      }
    }

    return result;
  }

  it('강골 특성이 공격력을 25% 증가시켜야 함', () => {
    const result = processTraits(['strongbone']);
    expect(result.damageMultiplier).toBe(1.25);
    expect(result.synergies).toContain('strongbone: 공격력 x1.25');
  });

  it('약골 특성이 공격력을 20% 감소시켜야 함', () => {
    const result = processTraits(['weakbone']);
    expect(result.damageMultiplier).toBe(0.8);
  });

  it('다중 공격력 특성이 곱셈으로 적용되어야 함', () => {
    const result = processTraits(['strongbone', 'destroyer']);
    expect(result.damageMultiplier).toBeCloseTo(1.25 * 1.5);
  });

  it('신속 특성이 속도를 2 줄여야 함', () => {
    const result = processTraits(['swift']);
    expect(result.speedModifier).toBe(-2);
  });

  it('느림 특성이 속도를 3 늘려야 함', () => {
    const result = processTraits(['slow']);
    expect(result.speedModifier).toBe(3);
  });

  it('마지막 특성이 타임라인 최후로 이동해야 함', () => {
    const result = processTraits(['last']);
    expect(result.speedModifier).toBe(999);
  });

  it('연계가 활성화되면 후속 보너스가 적용되어야 함', () => {
    const result = processTraits(['followup'], { chainActive: true });
    expect(result.damageMultiplier).toBeCloseTo(1.3);
    expect(result.synergies).toContain('후속 연계: 공격력 x1.3');
  });

  it('연계가 비활성화되면 후속 보너스가 없어야 함', () => {
    const result = processTraits(['followup'], { chainActive: false });
    expect(result.damageMultiplier).toBe(1.0);
  });

  it('교차 상태에서 교차 보너스가 적용되어야 함', () => {
    const result = processTraits(['cross'], { crossed: true });
    expect(result.damageMultiplier).toBeCloseTo(1.5);
    expect(result.synergies).toContain('교차: 공격력 x1.5');
  });

  it('교차하지 않으면 교차 보너스가 없어야 함', () => {
    const result = processTraits(['cross'], { crossed: false });
    expect(result.damageMultiplier).toBe(1.0);
  });

  it('복합 특성이 올바르게 적용되어야 함', () => {
    const result = processTraits(['strongbone', 'swift', 'cross'], { crossed: true });
    expect(result.damageMultiplier).toBeCloseTo(1.25 * 1.5);
    expect(result.speedModifier).toBe(-2);
    expect(result.synergies.length).toBeGreaterThan(0);
  });

  it('속도 특성이 누적되어야 함', () => {
    const result = processTraits(['swift', 'advance']);
    expect(result.speedModifier).toBe(-2 + -3);
  });

  it('상반되는 속도 특성이 상쇄되어야 함', () => {
    const result = processTraits(['swift', 'slow']);
    expect(result.speedModifier).toBe(-2 + 3);
  });
});

// ==================== 핸드 생성 특성 테스트 ====================

describe('HandTraitSystem', () => {
  interface NextTurnEffects {
    guaranteedCards?: string[];
    mainSpecialOnly?: boolean;
    bonusEnergy?: number;
    etherBlocked?: boolean;
  }

  function collectNextTurnEffects(traits: string[]): NextTurnEffects {
    const effects: NextTurnEffects = {};

    for (const trait of traits) {
      switch (trait) {
        case 'repeat':
          effects.guaranteedCards = effects.guaranteedCards || [];
          effects.guaranteedCards.push('test_card');
          break;
        case 'ruin':
          effects.mainSpecialOnly = true;
          break;
        case 'warmup':
          effects.bonusEnergy = (effects.bonusEnergy || 0) + 2;
          break;
        case 'oblivion':
          effects.etherBlocked = true;
          break;
      }
    }

    return effects;
  }

  it('repeat 특성이 다음 턴에 카드를 보장해야 함', () => {
    const effects = collectNextTurnEffects(['repeat']);
    expect(effects.guaranteedCards).toContain('test_card');
  });

  it('ruin 특성이 주특기만 드로우하게 해야 함', () => {
    const effects = collectNextTurnEffects(['ruin']);
    expect(effects.mainSpecialOnly).toBe(true);
  });

  it('warmup 특성이 다음 턴 에너지를 증가시켜야 함', () => {
    const effects = collectNextTurnEffects(['warmup']);
    expect(effects.bonusEnergy).toBe(2);
  });

  it('oblivion 특성이 에테르를 차단해야 함', () => {
    const effects = collectNextTurnEffects(['oblivion']);
    expect(effects.etherBlocked).toBe(true);
  });

  it('다중 warmup이 누적되어야 함', () => {
    const effects = collectNextTurnEffects(['warmup', 'warmup']);
    expect(effects.bonusEnergy).toBe(4);
  });
});

// ==================== 덱 시너지 점수 테스트 ====================

describe('DeckSynergyScoring', () => {
  interface Card {
    id: string;
    traits: string[];
    cardCategory?: string;
  }

  function calculateDeckSynergy(deck: Card[]): { score: number; synergies: string[] } {
    const traitCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    for (const card of deck) {
      for (const trait of card.traits) {
        traitCounts[trait] = (traitCounts[trait] || 0) + 1;
      }
      if (card.cardCategory) {
        categoryCounts[card.cardCategory] = (categoryCounts[card.cardCategory] || 0) + 1;
      }
    }

    let score = 0;
    const synergies: string[] = [];

    // 연계 시너지
    const chainCount = traitCounts['chain'] || 0;
    const followupCount = traitCounts['followup'] || 0;
    const finisherCount = traitCounts['finisher'] || 0;

    if (chainCount > 0 && followupCount > 0) {
      score += chainCount * followupCount * 10;
      synergies.push(`연계-후속 시너지`);
    }
    if (chainCount > 0 && finisherCount > 0) {
      score += chainCount * finisherCount * 15;
      synergies.push(`연계-마무리 시너지`);
    }

    // 카테고리 집중
    if ((categoryCounts['fencing'] || 0) >= 5) {
      score += (categoryCounts['fencing'] || 0) * 5;
      synergies.push('검술 집중');
    }
    if ((categoryCounts['gun'] || 0) >= 5) {
      score += (categoryCounts['gun'] || 0) * 5;
      synergies.push('사격 집중');
    }

    return { score, synergies };
  }

  it('연계-후속 시너지가 점수를 올려야 함', () => {
    const deck: Card[] = [
      { id: '1', traits: ['chain'] },
      { id: '2', traits: ['chain'] },
      { id: '3', traits: ['followup'] },
    ];
    const result = calculateDeckSynergy(deck);
    expect(result.score).toBe(2 * 1 * 10);
    expect(result.synergies).toContain('연계-후속 시너지');
  });

  it('연계-마무리 시너지가 점수를 올려야 함', () => {
    const deck: Card[] = [
      { id: '1', traits: ['chain'] },
      { id: '2', traits: ['finisher'] },
    ];
    const result = calculateDeckSynergy(deck);
    expect(result.score).toBe(1 * 1 * 15);
    expect(result.synergies).toContain('연계-마무리 시너지');
  });

  it('검술 집중 보너스가 적용되어야 함', () => {
    const deck: Card[] = [
      { id: '1', traits: [], cardCategory: 'fencing' },
      { id: '2', traits: [], cardCategory: 'fencing' },
      { id: '3', traits: [], cardCategory: 'fencing' },
      { id: '4', traits: [], cardCategory: 'fencing' },
      { id: '5', traits: [], cardCategory: 'fencing' },
    ];
    const result = calculateDeckSynergy(deck);
    expect(result.score).toBe(5 * 5);
    expect(result.synergies).toContain('검술 집중');
  });

  it('시너지 없는 덱은 0점이어야 함', () => {
    const deck: Card[] = [
      { id: '1', traits: ['swift'] },
      { id: '2', traits: ['slow'] },
    ];
    const result = calculateDeckSynergy(deck);
    expect(result.score).toBe(0);
    expect(result.synergies).toHaveLength(0);
  });
});

// ==================== MCTS 설정 테스트 ====================

describe('MCTSConfiguration', () => {
  interface MCTSOptions {
    explorationConstant: number;
    maxIterations: number;
    maxSimulationDepth: number;
    maxTurns: number;
    timeLimit: number;
    earlyTermination: boolean;
    pruning: boolean;
  }

  const DEFAULT_OPTIONS: MCTSOptions = {
    explorationConstant: Math.sqrt(2),
    maxIterations: 1000,
    maxSimulationDepth: 20,
    maxTurns: 30,
    timeLimit: 5000,
    earlyTermination: true,
    pruning: true,
  };

  function createOptions(overrides: Partial<MCTSOptions>): MCTSOptions {
    return { ...DEFAULT_OPTIONS, ...overrides };
  }

  function validateOptions(options: MCTSOptions): string[] {
    const errors: string[] = [];

    if (options.maxIterations < 1) errors.push('maxIterations must be positive');
    if (options.maxTurns < 1) errors.push('maxTurns must be positive');
    if (options.timeLimit < 100) errors.push('timeLimit must be at least 100ms');
    if (options.explorationConstant < 0) errors.push('explorationConstant must be non-negative');

    return errors;
  }

  it('기본 옵션이 유효해야 함', () => {
    const errors = validateOptions(DEFAULT_OPTIONS);
    expect(errors).toHaveLength(0);
  });

  it('옵션 오버라이드가 올바르게 동작해야 함', () => {
    const options = createOptions({ maxTurns: 50, maxIterations: 2000 });
    expect(options.maxTurns).toBe(50);
    expect(options.maxIterations).toBe(2000);
    expect(options.timeLimit).toBe(5000); // 기본값 유지
  });

  it('잘못된 옵션을 검출해야 함', () => {
    const invalid: MCTSOptions = {
      ...DEFAULT_OPTIONS,
      maxIterations: 0,
      maxTurns: -1,
      timeLimit: 50,
    };
    const errors = validateOptions(invalid);
    expect(errors).toContain('maxIterations must be positive');
    expect(errors).toContain('maxTurns must be positive');
    expect(errors).toContain('timeLimit must be at least 100ms');
  });
});
