/**
 * @file base-analyzer.ts
 * @description 분석 모듈 공통 베이스 클래스
 *
 * 모든 분석기가 공유하는 기능:
 * - 상태 복제 (깊은 복사)
 * - 상태 해시 계산
 * - 공통 유틸리티
 */

import type {
  GameState,
  SimPlayerState,
  SimEnemyState,
  TokenState,
  TimelineCard,
} from '../core/types';
import { LRUCache, type CacheStats } from '../core/lru-cache';

// ==================== 상태 복제 유틸리티 ====================

/**
 * 토큰 상태 복제
 */
export function cloneTokens(tokens: TokenState): TokenState {
  return { ...tokens };
}

/**
 * 타임라인 카드 배열 복제
 */
export function cloneTimeline(timeline: TimelineCard[]): TimelineCard[] {
  return timeline.map(card => ({ ...card }));
}

/**
 * 플레이어 상태 복제
 */
export function clonePlayerState(player: SimPlayerState): SimPlayerState {
  return {
    hp: player.hp,
    maxHp: player.maxHp,
    block: player.block,
    energy: player.energy,
    maxEnergy: player.maxEnergy,
    strength: player.strength,
    dexterity: player.dexterity,
    etherPts: player.etherPts,
    hand: [...player.hand],
    deck: [...player.deck],
    discard: [...player.discard],
    exhaust: player.exhaust ? [...player.exhaust] : [],
    tokens: cloneTokens(player.tokens),
    relics: player.relics ? [...player.relics] : [],
    speed: player.speed,
    agility: player.agility,
    def: player.def,
    counter: player.counter,
    vulnMult: player.vulnMult,
    etherOverdriveActive: player.etherOverdriveActive,
  };
}

/**
 * 적 상태 복제
 */
export function cloneEnemyState(enemy: SimEnemyState): SimEnemyState {
  return {
    id: enemy.id,
    name: enemy.name,
    hp: enemy.hp,
    maxHp: enemy.maxHp,
    block: enemy.block,
    strength: enemy.strength,
    etherPts: enemy.etherPts,
    deck: enemy.deck ? [...enemy.deck] : [],
    cardsPerTurn: enemy.cardsPerTurn,
    tokens: cloneTokens(enemy.tokens),
    speed: enemy.speed,
    dexterity: enemy.dexterity,
    agility: enemy.agility,
    def: enemy.def,
    counter: enemy.counter,
    vulnMult: enemy.vulnMult,
    etherOverdriveActive: enemy.etherOverdriveActive,
  };
}

/**
 * 전체 게임 상태 복제
 */
export function cloneGameState(state: GameState): GameState {
  return {
    player: clonePlayerState(state.player),
    enemy: cloneEnemyState(state.enemy),
    turn: state.turn,
    phase: state.phase,
    timeline: state.timeline ? cloneTimeline(state.timeline) : [],
  };
}

/**
 * 깊은 복제 (JSON 기반, 느리지만 안전)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ==================== 상태 해시 ====================

/**
 * 게임 상태 해시 계산 (트랜스포지션 테이블용)
 */
export function computeStateHash(state: GameState): string {
  return [
    state.player.hp,
    state.player.block,
    state.player.energy,
    state.enemy.hp,
    state.enemy.block,
    state.turn,
    state.player.hand.sort().join(','),
  ].join('|');
}

/**
 * 간단한 상태 해시 (체력만)
 */
export function computeSimpleHash(state: GameState): string {
  return `${state.player.hp}:${state.enemy.hp}:${state.turn}`;
}

// ==================== 베이스 분석기 ====================

export interface AnalyzerOptions {
  enableCaching?: boolean;
  maxCacheSize?: number;
  cacheTtlMs?: number;
  verbose?: boolean;
}

/**
 * 모든 분석기의 베이스 클래스
 */
export abstract class BaseAnalyzer<TConfig, TResult> {
  protected options: AnalyzerOptions;
  protected stateHashCache: WeakMap<GameState, string>;
  protected analysisCache: LRUCache<string, TResult>;

  constructor(options: AnalyzerOptions = {}) {
    this.options = {
      enableCaching: options.enableCaching ?? true,
      maxCacheSize: options.maxCacheSize ?? 1000,
      cacheTtlMs: options.cacheTtlMs,
      verbose: options.verbose ?? false,
    };
    this.stateHashCache = new WeakMap();
    this.analysisCache = new LRUCache<string, TResult>({
      maxSize: this.options.maxCacheSize ?? 1000,
      ttl: this.options.cacheTtlMs,
    });
  }

  // ==================== 추상 메서드 ====================

  /**
   * 분석 실행 (하위 클래스에서 구현)
   */
  abstract analyze(config: TConfig): Promise<TResult> | TResult;

  /**
   * 분석기 이름 반환
   */
  abstract getName(): string;

  // ==================== 상태 복제 ====================

  /**
   * 게임 상태 복제 (성능 최적화된 버전)
   */
  protected cloneState(state: GameState): GameState {
    return cloneGameState(state);
  }

  /**
   * 플레이어 상태만 복제
   */
  protected clonePlayer(player: SimPlayerState): SimPlayerState {
    return clonePlayerState(player);
  }

  /**
   * 적 상태만 복제
   */
  protected cloneEnemy(enemy: SimEnemyState): SimEnemyState {
    return cloneEnemyState(enemy);
  }

  // ==================== 캐싱 ====================

  /**
   * 캐시된 상태 해시 가져오기
   */
  protected getStateHash(state: GameState): string {
    const cached = this.stateHashCache.get(state);
    if (cached) return cached;

    const hash = computeStateHash(state);
    this.stateHashCache.set(state, hash);
    return hash;
  }

  /**
   * 분석 결과 캐시에서 가져오기 (LRU 캐시 사용)
   */
  protected getCachedResult(key: string): TResult | undefined {
    if (!this.options.enableCaching) return undefined;
    return this.analysisCache.get(key);
  }

  /**
   * 분석 결과 캐시에 저장 (LRU 캐시가 자동으로 eviction 처리)
   */
  protected cacheResult(key: string, result: TResult): void {
    if (!this.options.enableCaching) return;
    this.analysisCache.set(key, result);
  }

  /**
   * 캐시 초기화
   */
  clearCache(): void {
    this.stateHashCache = new WeakMap();
    this.analysisCache.clear();
  }

  /**
   * 캐시 통계 반환
   */
  getCacheStats(): CacheStats {
    return this.analysisCache.getStats();
  }

  /**
   * 만료된 캐시 항목 정리
   */
  pruneCache(): number {
    return this.analysisCache.prune();
  }

  // ==================== 유틸리티 ====================

  /**
   * 로깅 (verbose 모드)
   */
  protected log(...args: unknown[]): void {
    if (this.options.verbose) {
      console.log(`[${this.getName()}]`, ...args);
    }
  }

  /**
   * 배열 셔플 (Fisher-Yates)
   */
  protected shuffle<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * 무작위 선택
   */
  protected randomChoice<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * 가중치 기반 무작위 선택
   */
  protected weightedChoice<T>(items: T[], weights: number[]): T | undefined {
    if (items.length === 0 || items.length !== weights.length) return undefined;

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) return items[i];
    }

    return items[items.length - 1];
  }
}

// ==================== 타입 가드 ====================

/**
 * GameState 타입 가드
 */
export function isGameState(obj: unknown): obj is GameState {
  if (!obj || typeof obj !== 'object') return false;
  const state = obj as Record<string, unknown>;
  return (
    'player' in state &&
    'enemy' in state &&
    'turn' in state &&
    'phase' in state
  );
}

/**
 * SimPlayerState 타입 가드
 */
export function isPlayerState(obj: unknown): obj is SimPlayerState {
  if (!obj || typeof obj !== 'object') return false;
  const state = obj as Record<string, unknown>;
  return (
    'hp' in state &&
    'hand' in state &&
    'deck' in state &&
    'energy' in state
  );
}

/**
 * SimEnemyState 타입 가드
 */
export function isEnemyState(obj: unknown): obj is SimEnemyState {
  if (!obj || typeof obj !== 'object') return false;
  const state = obj as Record<string, unknown>;
  return (
    'id' in state &&
    'hp' in state &&
    'deck' in state &&
    'cardsPerTurn' in state
  );
}
