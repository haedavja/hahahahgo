/**
 * @file stats-bridge.ts
 * @description 게임-시뮬레이터 통계 브릿지
 *
 * 실제 게임 전투 결과를 시뮬레이터 통계 시스템에 연결합니다.
 *
 * 번들 최적화: detailed-stats 모듈은 동적 import로 지연 로드됩니다.
 * 앱 시작 시 initStatsBridge()를 호출하여 미리 로드할 수 있습니다.
 */

import type { StatsCollector } from '../analysis/detailed-stats';
import type { BattleResult as SimulatorBattleResult, BattleEvent } from '../core/game-types';
import type { BattleResult as GameBattleResult } from '../../types/battle';
import type { DetailedStats } from '../analysis/detailed-stats-types';

// 동적 import 캐시
let statsModulePromise: Promise<typeof import('../analysis/detailed-stats')> | null = null;
let statsModule: typeof import('../analysis/detailed-stats') | null = null;

// 대기 중인 작업 큐 (모듈 로드 전 호출된 기록 함수들)
type PendingOperation = () => void;
let pendingOperations: PendingOperation[] = [];
let isFlushingPending = false;

/**
 * detailed-stats 모듈 동적 로드 (캐시됨)
 */
async function loadStatsModule(): Promise<typeof import('../analysis/detailed-stats')> {
  if (statsModule) return statsModule;
  if (!statsModulePromise) {
    statsModulePromise = import('../analysis/detailed-stats');
  }
  statsModule = await statsModulePromise;

  // 모듈 로드 완료 후 대기 중인 작업 실행
  flushPendingOperations();

  return statsModule;
}

/**
 * 대기 중인 작업 큐에 추가
 */
function queueOperation(operation: PendingOperation): void {
  pendingOperations.push(operation);
}

/**
 * 대기 중인 작업들 실행
 */
function flushPendingOperations(): void {
  if (isFlushingPending || !statsModule || !globalStatsCollector) return;

  isFlushingPending = true;
  const ops = [...pendingOperations];
  pendingOperations = [];

  for (const op of ops) {
    try {
      op();
    } catch (e) {
      console.warn('[StatsBridge] Failed to execute pending operation:', e);
    }
  }

  isFlushingPending = false;
}

/**
 * 통계 브릿지 초기화 (앱 시작 시 호출 권장)
 * 번들 최적화를 위해 detailed-stats 모듈을 미리 로드합니다.
 */
export async function initStatsBridge(): Promise<void> {
  await loadStatsModule();
}

// ==================== 타입 정의 ====================

/** 게임에서 전달하는 전투 컨텍스트 */
export interface GameBattleContext {
  nodeId?: string;
  kind?: string;
  floor?: number;
  turn?: number;
  damageDealt?: number;
  damageTaken?: number;
  cardUsage?: Record<string, number>;
  comboUsage?: Record<string, number>;
  tokenUsage?: Record<string, number>;
  battleLog?: string[];
  /** 영혼파괴 승리 여부 */
  isEtherVictory?: boolean;
  /** 적의 최종 HP (정확한 값) */
  enemyFinalHp?: number;
  /** 적의 최대 HP */
  enemyMaxHp?: number;
  /** 턴별 이벤트 기록 */
  turnEvents?: TurnEvent[];
  /** 상징 발동 기록 */
  relicTriggers?: RelicTriggerRecord[];
  /** 토큰 효과 기록 */
  tokenEffects?: TokenEffectRecord[];
}

/** 턴별 이벤트 */
export interface TurnEvent {
  turn: number;
  phase: 'select' | 'respond' | 'resolve' | 'end';
  actor: 'player' | 'enemy';
  action: string;
  cardId?: string;
  damage?: number;
  block?: number;
  healing?: number;
  tokens?: Record<string, number>;
}

/** 상징 발동 기록 */
export interface RelicTriggerRecord {
  relicId: string;
  turn: number;
  trigger: string;
  effect: string;
  value?: number;
}

/** 토큰 효과 기록 */
export interface TokenEffectRecord {
  tokenId: string;
  turn: number;
  stacks: number;
  effectType: 'damage' | 'block' | 'heal' | 'special';
  value: number;
}

/** 게임에서 전달하는 적 정보 */
export interface GameEnemyInfo {
  id?: string;
  name: string;
  tier?: number;
  isBoss?: boolean;
  isElite?: boolean;
  emoji?: string;
  /** 적 그룹 ID (예: wildrat_swarm) */
  groupId?: string;
  /** 적 그룹 이름 (예: 들쥐 떼) */
  groupName?: string;
  /** 그룹 내 적 수 */
  enemyCount?: number;
  /** 그룹 구성 (적 ID 배열) */
  composition?: string[];
}

/** 게임에서 전달하는 플레이어 정보 */
export interface GamePlayerInfo {
  hp: number;
  maxHp: number;
  deck?: string[];
  relics?: string[];
}

// ==================== 기본값 헬퍼 ====================

/**
 * GameBattleContext 기본값 생성
 * 선택사항 필드에 안전한 기본값 제공
 */
export function createDefaultBattleContext(
  partial: Partial<GameBattleContext> = {}
): GameBattleContext {
  return {
    nodeId: partial.nodeId ?? 'unknown',
    kind: partial.kind ?? 'battle',
    floor: partial.floor ?? 1,
    turn: partial.turn ?? 1,
    damageDealt: partial.damageDealt ?? 0,
    damageTaken: partial.damageTaken ?? 0,
    cardUsage: partial.cardUsage ?? {},
    comboUsage: partial.comboUsage ?? {},
    tokenUsage: partial.tokenUsage ?? {},
    battleLog: partial.battleLog ?? [],
    isEtherVictory: partial.isEtherVictory ?? false,
    enemyFinalHp: partial.enemyFinalHp,
    enemyMaxHp: partial.enemyMaxHp,
    turnEvents: partial.turnEvents ?? [],
    relicTriggers: partial.relicTriggers ?? [],
    tokenEffects: partial.tokenEffects ?? [],
  };
}

/**
 * GameEnemyInfo 기본값 생성
 */
export function createDefaultEnemyInfo(
  partial: Partial<GameEnemyInfo> = {}
): GameEnemyInfo {
  return {
    id: partial.id ?? 'unknown',
    name: partial.name ?? 'Unknown Enemy',
    tier: partial.tier ?? 1,
    isBoss: partial.isBoss ?? false,
    isElite: partial.isElite ?? false,
    emoji: partial.emoji ?? '👾',
  };
}

/**
 * GamePlayerInfo 기본값 생성
 */
export function createDefaultPlayerInfo(
  partial: Partial<GamePlayerInfo> = {}
): GamePlayerInfo {
  return {
    hp: partial.hp ?? 80,
    maxHp: partial.maxHp ?? 80,
    deck: partial.deck ?? [],
    relics: partial.relics ?? [],
  };
}

/** 변환된 통계용 전투 결과 */
export interface AdaptedBattleResult extends SimulatorBattleResult {
  source: 'game' | 'simulator';
  /** 영혼파괴 승리 여부 */
  isEtherVictory?: boolean;
}

// ==================== 싱글톤 인스턴스 ====================

let globalStatsCollector: StatsCollector | null = null;
let isInitialized = false;

const STATS_STORAGE_KEY = 'hahahahgo_game_stats';

// ==================== Map 직렬화 헬퍼 ====================

/**
 * Map을 일반 객체로 변환
 */
function mapToObject<K extends string | number, V>(
  map: Map<K, V> | undefined
): Record<string, V> {
  if (!map || !(map instanceof Map)) return {};
  return Object.fromEntries(map);
}

/**
 * 일반 객체를 Map으로 변환
 */
function objectToMap<V>(
  obj: Record<string, V> | undefined,
  numericKeys = false
): Map<string | number, V> {
  if (!obj || typeof obj !== 'object') return new Map();
  const entries = Object.entries(obj).map(([k, v]) => [
    numericKeys ? Number(k) : k,
    v,
  ] as [string | number, V]);
  return new Map(entries);
}

/**
 * localStorage에서 통계 로드
 */
function loadStatsFromStorage(): DetailedStats | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const stored = localStorage.getItem(STATS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);

      // 모든 최상위 Map 객체 복원
      return {
        ...parsed,
        cardStats: objectToMap(parsed.cardStats),
        monsterStats: objectToMap(parsed.monsterStats),
        enemyGroupStats: objectToMap(parsed.enemyGroupStats),
        eventStats: objectToMap(parsed.eventStats),
        eventChoiceStats: objectToMap(parsed.eventChoiceStats),
        cardDeepStats: objectToMap(parsed.cardDeepStats),
        relicStats: objectToMap(parsed.relicStats),
        difficultyStats: objectToMap(parsed.difficultyStats, true),
        tokenStats: objectToMap(parsed.tokenStats),
        nodeTypeValueComparison: objectToMap(parsed.nodeTypeValueComparison),
        // 중첩 Map 복원
        floorProgressionAnalysis: parsed.floorProgressionAnalysis ? {
          ...parsed.floorProgressionAnalysis,
          floorStats: objectToMap(parsed.floorProgressionAnalysis.floorStats, true),
        } : undefined,
        pokerComboStats: parsed.pokerComboStats ? {
          ...parsed.pokerComboStats,
          comboDetails: objectToMap(parsed.pokerComboStats.comboDetails),
        } : undefined,
        eventImpactAnalysis: parsed.eventImpactAnalysis ? {
          ...parsed.eventImpactAnalysis,
          eventImpacts: objectToMap(parsed.eventImpactAnalysis.eventImpacts),
        } : undefined,
      } as DetailedStats;
    }
  } catch (e) {
    console.warn('[StatsBridge] Failed to load stats from localStorage:', e);
  }
  return null;
}

/**
 * localStorage에 통계 저장
 */
function saveStatsToStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (!globalStatsCollector) return;

  try {
    const stats = globalStatsCollector.finalize();

    // 모든 최상위 Map 객체를 일반 객체로 변환
    const serializable = {
      ...stats,
      cardStats: mapToObject(stats.cardStats),
      monsterStats: mapToObject(stats.monsterStats),
      enemyGroupStats: mapToObject(stats.enemyGroupStats),
      eventStats: mapToObject(stats.eventStats),
      eventChoiceStats: mapToObject(stats.eventChoiceStats),
      cardDeepStats: mapToObject(stats.cardDeepStats),
      relicStats: mapToObject(stats.relicStats),
      difficultyStats: mapToObject(stats.difficultyStats),
      tokenStats: mapToObject(stats.tokenStats),
      nodeTypeValueComparison: mapToObject(stats.nodeTypeValueComparison),
      // 중첩 Map 직렬화
      floorProgressionAnalysis: stats.floorProgressionAnalysis ? {
        ...stats.floorProgressionAnalysis,
        floorStats: mapToObject(stats.floorProgressionAnalysis.floorStats),
      } : undefined,
      pokerComboStats: stats.pokerComboStats ? {
        ...stats.pokerComboStats,
        comboDetails: mapToObject(stats.pokerComboStats.comboDetails),
      } : undefined,
      eventImpactAnalysis: stats.eventImpactAnalysis ? {
        ...stats.eventImpactAnalysis,
        eventImpacts: mapToObject(stats.eventImpactAnalysis.eventImpacts),
      } : undefined,
    };

    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(serializable));
  } catch (e) {
    console.warn('[StatsBridge] Failed to save stats to localStorage:', e);
  }
}

/**
 * 전역 통계 수집기 가져오기 또는 생성 (동기)
 * 모듈이 아직 로드되지 않았으면 큐잉 수집기를 반환하여 작업을 대기시킵니다.
 */
export function getStatsCollector(): StatsCollector {
  if (!globalStatsCollector) {
    // 모듈이 이미 로드된 경우 동기적으로 사용
    if (statsModule) {
      globalStatsCollector = statsModule.createStatsCollector();
      isInitialized = true;
      // 모듈 로드 완료 후 대기 작업 실행
      flushPendingOperations();
    } else {
      // 아직 로드되지 않은 경우 - 동적 로드 시작하고 큐잉 수집기 반환
      loadStatsModule().then(mod => {
        if (!globalStatsCollector) {
          globalStatsCollector = mod.createStatsCollector();
          isInitialized = true;
        }
        // 대기 중인 작업 실행은 loadStatsModule에서 처리
      });
      // 큐잉 수집기 반환 - 작업을 대기열에 추가하여 나중에 실행
      return createQueuingCollector();
    }
  }
  return globalStatsCollector;
}

/**
 * 전역 통계 수집기 가져오기 (비동기)
 * 모듈 로드를 기다린 후 수집기 반환
 */
export async function getStatsCollectorAsync(): Promise<StatsCollector> {
  if (!globalStatsCollector) {
    const mod = await loadStatsModule();
    globalStatsCollector = mod.createStatsCollector();
    isInitialized = true;
  }
  return globalStatsCollector;
}

/**
 * 통계 수집기 초기화 (새 런 시작 시)
 */
export async function resetStatsCollector(): Promise<void> {
  const mod = await loadStatsModule();
  globalStatsCollector = mod.createStatsCollector();
  isInitialized = true;
  // localStorage도 초기화
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(STATS_STORAGE_KEY);
  }
}

/**
 * 통계 수집기 동기 초기화 (모듈이 이미 로드된 경우만)
 */
export function resetStatsCollectorSync(): void {
  if (!statsModule) {
    console.warn('[StatsBridge] Module not loaded. Call initStatsBridge() first.');
    return;
  }
  globalStatsCollector = statsModule.createStatsCollector();
  isInitialized = true;
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(STATS_STORAGE_KEY);
  }
}

/**
 * 빈 DetailedStats 객체 생성 (모듈 로드 전 사용)
 */
function createEmptyDetailedStats(): DetailedStats {
  const now = new Date();
  return {
    startTime: now,
    endTime: now,
    cardStats: new Map(),
    monsterStats: new Map(),
    enemyGroupStats: new Map(),
    eventStats: new Map(),
    runStats: {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      averageFloor: 0,
      averageScore: 0,
      totalBattles: 0,
      totalGoldEarned: 0,
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      averageDeckSize: 0,
      averageRelicCount: 0,
    },
    battleRecords: [],
    upgradeStats: {
      totalUpgrades: 0,
      upgradesByCard: new Map(),
      averageUpgradesPerRun: 0,
    },
    growthStats: {
      totalInvestments: 0,
      investmentsByType: {},
      investmentsByTrait: {},
    },
    shopStats: {
      totalVisits: 0,
      totalPurchases: 0,
      totalSpent: 0,
      purchasesByType: {},
    },
    dungeonStats: {
      totalAttempts: 0,
      successfulClears: 0,
      dungeonDetails: new Map(),
    },
    shopServiceStats: {
      totalServices: 0,
      servicesByType: {},
      totalSpent: 0,
      averageSpendPerVisit: 0,
    },
    itemUsageStats: {
      totalItemsAcquired: 0,
      totalItemsUsed: 0,
      itemDetails: new Map(),
    },
    eventChoiceStats: new Map(),
    aiStrategyStats: {
      decisionCounts: {},
      averageDecisionTime: 0,
    },
    cardPickStats: {
      totalOffers: 0,
      totalPicks: 0,
      pickRateByCard: new Map(),
      skipRate: 0,
    },
    cardContributionStats: {
      damageContribution: new Map(),
      blockContribution: new Map(),
      winContribution: new Map(),
    },
    cardDeepStats: new Map(),
    relicStats: new Map(),
    difficultyStats: new Map(),
    tokenStats: new Map(),
    nodeTypeValueComparison: new Map(),
  };
}

/**
 * 모듈 로드 전 임시로 사용할 no-op 수집기
 */
function createNoopCollector(): StatsCollector {
  const noop = () => {};
  const emptyStats = createEmptyDetailedStats();
  return {
    startNewRun: noop,
    recordBattle: noop,
    recordRun: noop,
    recordRunComplete: noop,
    recordCardOffered: noop,
    recordCardPicked: noop,
    recordCardChoice: noop,
    recordRelicAcquired: noop,
    recordShopVisit: noop,
    recordShopService: noop,
    recordEvent: noop,
    recordEventChoice: noop,
    recordDungeon: noop,
    recordItemAcquired: noop,
    recordItemUsed: noop,
    recordGrowthInvestment: noop,
    recordTurnDamage: noop,
    recordFlawlessVictory: noop,
    recordFloorSnapshot: noop,
    recordDeath: noop,
    finalizeRunCardStats: noop,
    finalize: () => emptyStats,
  } as StatsCollector;
}

/**
 * 모듈 로드 전 작업을 큐에 추가하는 수집기
 * 모듈 로드 후 실제 수집기에서 실행됨
 */
function createQueuingCollector(): StatsCollector {
  const emptyStats = createEmptyDetailedStats();

  // 큐잉 래퍼 생성 - 인자를 캡처하여 나중에 실행
  const createQueuedMethod = <T extends unknown[]>(
    methodName: keyof StatsCollector
  ) => {
    return (...args: T) => {
      queueOperation(() => {
        if (globalStatsCollector) {
          const method = globalStatsCollector[methodName];
          if (typeof method === 'function') {
            (method as (...args: T) => void).apply(globalStatsCollector, args);
          }
        }
      });
    };
  };

  return {
    startNewRun: createQueuedMethod('startNewRun'),
    recordBattle: createQueuedMethod('recordBattle'),
    recordRun: createQueuedMethod('recordRun'),
    recordRunComplete: createQueuedMethod('recordRunComplete'),
    recordCardOffered: createQueuedMethod('recordCardOffered'),
    recordCardPicked: createQueuedMethod('recordCardPicked'),
    recordCardChoice: createQueuedMethod('recordCardChoice'),
    recordRelicAcquired: createQueuedMethod('recordRelicAcquired'),
    recordShopVisit: createQueuedMethod('recordShopVisit'),
    recordShopService: createQueuedMethod('recordShopService'),
    recordEvent: createQueuedMethod('recordEvent'),
    recordEventChoice: createQueuedMethod('recordEventChoice'),
    recordDungeon: createQueuedMethod('recordDungeon'),
    recordItemAcquired: createQueuedMethod('recordItemAcquired'),
    recordItemUsed: createQueuedMethod('recordItemUsed'),
    recordGrowthInvestment: createQueuedMethod('recordGrowthInvestment'),
    recordTurnDamage: createQueuedMethod('recordTurnDamage'),
    recordFlawlessVictory: createQueuedMethod('recordFlawlessVictory'),
    recordFloorSnapshot: createQueuedMethod('recordFloorSnapshot'),
    recordDeath: createQueuedMethod('recordDeath'),
    finalizeRunCardStats: createQueuedMethod('finalizeRunCardStats'),
    // finalize는 즉시 빈 통계 반환 (큐잉 불가능)
    finalize: () => emptyStats,
  } as StatsCollector;
}

/**
 * 초기화 여부 확인
 */
export function isStatsInitialized(): boolean {
  return isInitialized;
}

/**
 * 통계 저장 (수동 호출용)
 */
export function saveStats(): void {
  invalidateStatsCache();
  saveStatsToStorage();
}

// ==================== 타입 어댑터 ====================

/**
 * 게임 전투 결과를 시뮬레이터 형식으로 변환
 */
export function adaptGameBattleResult(
  gameResult: GameBattleResult,
  context: GameBattleContext,
  enemyInfo: GameEnemyInfo,
  playerInfo: GamePlayerInfo
): AdaptedBattleResult {
  // result → winner 변환
  const winner = gameResult.result === 'victory' ? 'player' : 'enemy';

  // 로그 → 이벤트 변환 (간소화)
  const events: BattleEvent[] = [];
  const battleLog = context.battleLog || [];

  // 기본 이벤트 추가
  events.push({
    type: 'battle_start',
    turn: 1,
    message: `${enemyInfo.name}와(과) 전투 시작`,
  });

  // turnEvents가 있으면 우선 사용 (더 정확)
  if (context.turnEvents && context.turnEvents.length > 0) {
    for (const te of context.turnEvents) {
      events.push(convertTurnEventToBattleEvent(te));
    }
  } else {
    // 로그에서 이벤트 추출 시도 (폴백)
    for (let i = 0; i < battleLog.length; i++) {
      const logEntry = battleLog[i];
      const event = parseLogToEvent(logEntry, Math.floor(i / 2) + 1);
      if (event) {
        events.push(event);
      }
    }
  }

  // 상징 발동 이벤트 추가
  if (context.relicTriggers) {
    for (const rt of context.relicTriggers) {
      events.push({
        type: 'relic_trigger',
        turn: rt.turn,
        actor: 'player',
        message: `[${rt.relicId}] ${rt.effect}`,
        value: rt.value,
      });
    }
  }

  events.push({
    type: 'battle_end',
    turn: context.turn || battleLog.length,
    actor: winner,
    message: winner === 'player' ? '승리!' : '패배...',
  });

  // enemyFinalHp 결정: context에서 전달된 값 > 추정값
  let finalEnemyHp: number;
  if (context.enemyFinalHp !== undefined) {
    finalEnemyHp = context.enemyFinalHp;
  } else {
    // 폴백: 승리면 0, 패배면 남은 HP 추정
    finalEnemyHp = winner === 'player' ? 0 : (context.enemyMaxHp ?? 1);
  }

  // timeline 구성
  const timeline = context.turnEvents?.map(te => ({
    turn: te.turn,
    phase: te.phase,
    actor: te.actor,
    cardId: te.cardId,
    damage: te.damage,
    block: te.block,
  })) || [];

  return {
    source: 'game',
    winner,
    turns: context.turn || Math.max(1, Math.ceil(battleLog.length / 2)),
    playerDamageDealt: context.damageDealt || 0,
    enemyDamageDealt: context.damageTaken || 0,
    playerFinalHp: gameResult.playerHp ?? playerInfo.hp,
    enemyFinalHp: finalEnemyHp,
    etherGained: gameResult.deltaEther || 0,
    goldChange: 0,
    battleLog,
    events,
    cardUsage: context.cardUsage || {},
    comboStats: context.comboUsage || {},
    tokenStats: context.tokenUsage || {},
    timeline,
    victory: winner === 'player',
    enemyId: enemyInfo.id,
    isEtherVictory: context.isEtherVictory || gameResult.isEtherVictory,
  };
}

/**
 * TurnEvent를 BattleEvent로 변환
 */
function convertTurnEventToBattleEvent(te: TurnEvent): BattleEvent {
  let type: BattleEvent['type'] = 'card_execute';

  if (te.damage && te.damage > 0) {
    type = 'damage_dealt';
  } else if (te.block && te.block > 0) {
    type = 'block_gained';
  } else if (te.healing && te.healing > 0) {
    type = 'heal';
  }

  return {
    type,
    turn: te.turn,
    actor: te.actor,
    cardId: te.cardId,
    value: te.damage || te.block || te.healing,
    message: `[${te.phase}] ${te.actor}: ${te.action}`,
  };
}

/**
 * 로그 문자열을 BattleEvent로 변환 시도
 * 개선된 파싱: 더 많은 이벤트 타입 지원
 */
function parseLogToEvent(logEntry: string, turn: number): BattleEvent | null {
  const lower = logEntry.toLowerCase();
  const numMatch = logEntry.match(/(\d+)/);
  const value = numMatch ? parseInt(numMatch[1], 10) : 0;

  // 치명타
  if (lower.includes('치명') || lower.includes('crit')) {
    return {
      type: 'damage_dealt',
      turn,
      value,
      message: logEntry,
      actor: lower.includes('적') || lower.includes('enemy') ? 'enemy' : 'player',
    };
  }

  // 피해 관련 (다양한 패턴)
  if (lower.includes('damage') || lower.includes('피해') || lower.includes('→')) {
    const isDot = lower.includes('화상') || lower.includes('독') || lower.includes('burn') || lower.includes('poison');
    return {
      type: isDot ? 'dot_damage' : 'damage_dealt',
      turn,
      value,
      message: logEntry,
      actor: lower.includes('적') || lower.includes('enemy') ? 'enemy' : 'player',
    };
  }

  // 방어 관련
  if (lower.includes('block') || lower.includes('방어') || lower.includes('막')) {
    return {
      type: 'block_gained',
      turn,
      value,
      message: logEntry,
    };
  }

  // 회복
  if (lower.includes('heal') || lower.includes('회복') || lower.includes('재생')) {
    return {
      type: 'heal',
      turn,
      value,
      message: logEntry,
    };
  }

  // 토큰 획득/소모
  if (lower.includes('스택') || lower.includes('stack') || lower.includes('토큰')) {
    const isGain = lower.includes('획득') || lower.includes('추가') || lower.includes('+');
    return {
      type: isGain ? 'token_gained' : 'token_consumed',
      turn,
      value,
      message: logEntry,
    };
  }

  // 콤보 발동
  if (lower.includes('콤보') || lower.includes('combo') || lower.includes('페어') || lower.includes('트리플')) {
    return {
      type: 'combo_triggered',
      turn,
      message: logEntry,
    };
  }

  // 상징 발동
  if (lower.includes('상징') || lower.includes('relic') || lower.includes('발동')) {
    return {
      type: 'relic_trigger',
      turn,
      value,
      message: logEntry,
    };
  }

  // 회피
  if (lower.includes('회피') || lower.includes('dodge') || lower.includes('빗나감')) {
    return {
      type: 'dodge',
      turn,
      message: logEntry,
    };
  }

  // 반격
  if (lower.includes('반격') || lower.includes('counter')) {
    return {
      type: 'counter',
      turn,
      value,
      message: logEntry,
    };
  }

  // 카드 사용
  if (lower.includes('사용') || lower.includes('play') || lower.includes(':')) {
    // 카드 이름 추출 시도
    const cardMatch = logEntry.match(/[【\[]([^\]】]+)[】\]]/);
    return {
      type: 'card_execute',
      turn,
      cardId: cardMatch?.[1],
      message: logEntry,
    };
  }

  // 턴 관련
  if (lower.includes('턴') || lower.includes('turn')) {
    return {
      type: 'turn_start',
      turn,
      message: logEntry,
    };
  }

  return null;
}

// ==================== 통계 기록 함수 ====================

/**
 * 게임 전투 결과를 통계에 기록
 *
 * battleSlice.resolveBattle()에서 호출됩니다.
 */
export function recordGameBattle(
  gameResult: GameBattleResult,
  context: GameBattleContext,
  enemyInfo: GameEnemyInfo,
  playerInfo: GamePlayerInfo
): void {
  try {
    const stats = getStatsCollector();

    // 게임 결과를 시뮬레이터 형식으로 변환
    const adapted = adaptGameBattleResult(gameResult, context, enemyInfo, playerInfo);

    // 적 정보 형식 변환
    const monster = {
      id: enemyInfo.id || 'unknown',
      name: enemyInfo.name,
      tier: enemyInfo.tier,
      isBoss: enemyInfo.isBoss,
      isElite: enemyInfo.isElite,
      // 그룹 정보
      groupId: enemyInfo.groupId,
      groupName: enemyInfo.groupName,
      enemyCount: enemyInfo.enemyCount,
      composition: enemyInfo.composition,
    };

    // 컨텍스트 정보
    const recordContext = {
      floor: context.floor,
      playerMaxHp: playerInfo.maxHp,
    };

    // 통계 기록
    stats.recordBattle(adapted, monster, recordContext);

    // 캐시 무효화 (새 데이터 반영)
    invalidateStatsCache();

    // localStorage에 저장
    saveStatsToStorage();

    if (import.meta.env?.DEV) {
      console.log('[StatsBridge] Battle recorded:', {
        result: adapted.winner,
        enemy: enemyInfo.name,
        turns: adapted.turns,
        damageDealt: adapted.playerDamageDealt,
      });
    }
  } catch (error) {
    console.error('[StatsBridge] Failed to record battle:', error);
  }
}

/**
 * 런 시작 기록
 */
export function recordRunStart(deck: string[], relics: string[] = []): void {
  try {
    const stats = getStatsCollector();
    stats.startNewRun();

    // 시작 상징들 기록
    for (const relicId of relics) {
      stats.recordRelicAcquired({
        relicId,
        floor: 0,
        source: 'starting',
      });
    }

    if (import.meta.env?.DEV) {
      console.log('[StatsBridge] Run started with deck:', deck.length, 'cards');
    }
  } catch (error) {
    console.error('[StatsBridge] Failed to record run start:', error);
  }
}

/**
 * 런 종료 기록
 */
export function recordRunEnd(
  success: boolean,
  finalFloor: number,
  finalDeck: string[],
  finalRelics: string[] = []
): void {
  try {
    const stats = getStatsCollector();

    // 카드 사용 통계 마무리
    stats.finalizeRunCardStats(finalDeck);

    // 런 결과 기록
    stats.recordRunComplete({
      success,
      battlesWon: finalFloor, // floor를 전투 수로 근사
      deckSize: finalDeck.length,
      gold: 0,
      deck: finalDeck,
    });

    // 기본 런 기록도 추가
    stats.recordRun(
      success,
      finalFloor, // layer
      finalFloor, // battlesWon
      0, // gold
      finalDeck.length,
      success ? undefined : 'defeat',
      undefined
    );

    // 캐시 무효화 및 저장
    invalidateStatsCache();
    saveStatsToStorage();

    if (import.meta.env?.DEV) {
      console.log('[StatsBridge] Run ended:', {
        success,
        floor: finalFloor,
        deckSize: finalDeck.length,
      });
    }
  } catch (error) {
    console.error('[StatsBridge] Failed to record run end:', error);
  }
}

/**
 * 카드 선택 기록
 */
export function recordCardPick(
  cardId: string,
  offeredCards: string[],
  context: { floor?: number } = {}
): void {
  try {
    const stats = getStatsCollector();

    // 제공된 카드 기록
    stats.recordCardOffered(offeredCards);

    // 선택한 카드 기록
    stats.recordCardPicked(cardId, offeredCards);

    // 층 정보가 있으면 선택 컨텍스트도 기록
    if (context.floor !== undefined) {
      stats.recordCardChoice({
        pickedCardId: cardId,
        offeredCardIds: offeredCards,
        floor: context.floor,
        skipped: false,
      });
    }

    if (import.meta.env?.DEV) {
      console.log('[StatsBridge] Card picked:', cardId, 'from', offeredCards);
    }
  } catch (error) {
    console.error('[StatsBridge] Failed to record card pick:', error);
  }
}

/**
 * 상징 획득 기록
 */
export function recordRelicAcquired(
  relicId: string,
  context: { floor?: number; source?: string } = {}
): void {
  try {
    const stats = getStatsCollector();

    // source 타입 변환
    const validSources = ['battle', 'shop', 'event', 'dungeon', 'boss', 'starting'] as const;
    type SourceType = typeof validSources[number];
    const source = (context.source && validSources.includes(context.source as SourceType))
      ? (context.source as SourceType)
      : 'event';

    stats.recordRelicAcquired({
      relicId,
      floor: context.floor ?? 1,
      source,
    });

    if (import.meta.env?.DEV) {
      console.log('[StatsBridge] Relic acquired:', relicId);
    }
  } catch (error) {
    console.error('[StatsBridge] Failed to record relic:', error);
  }
}

/**
 * 카드 강화 기록
 */
export function recordCardUpgrade(
  cardId: string,
  newLevel: number,
  context: { floor?: number; cost?: number } = {}
): void {
  try {
    const stats = getStatsCollector();

    // 상점 서비스로 강화 기록
    stats.recordShopService({
      type: 'upgrade',
      cost: context.cost ?? 0,
      cardId,
    });

    if (import.meta.env?.DEV) {
      console.log('[StatsBridge] Card upgraded:', cardId, 'to level', newLevel);
    }
  } catch (error) {
    console.error('[StatsBridge] Failed to record upgrade:', error);
  }
}

/**
 * 상점 방문 기록
 */
export function recordShopVisit(context: { floor?: number; gold?: number } = {}): void {
  try {
    const stats = getStatsCollector();
    stats.recordShopVisit({
      floor: context.floor ?? 1,
      goldAvailable: context.gold ?? 0,
    });
    invalidateStatsCache();
    saveStatsToStorage();
  } catch (error) {
    console.error('[StatsBridge] Failed to record shop visit:', error);
  }
}

/**
 * 상점 구매 기록
 */
export function recordShopPurchase(
  itemType: 'relic' | 'card' | 'removal' | 'upgrade' | 'item',
  itemId: string,
  cost: number,
  context: { floor?: number } = {}
): void {
  try {
    const stats = getStatsCollector();

    if (itemType === 'relic') {
      stats.recordShopService({ type: 'relic', cost, relicId: itemId });
    } else if (itemType === 'card') {
      stats.recordShopService({ type: 'card', cost, cardId: itemId });
    } else if (itemType === 'removal') {
      stats.recordShopService({ type: 'removal', cost, cardId: itemId });
    } else if (itemType === 'upgrade') {
      stats.recordShopService({ type: 'upgrade', cost, cardId: itemId });
    } else if (itemType === 'item') {
      stats.recordShopService({ type: 'item', cost, itemId });
      stats.recordItemAcquired(itemId);
    }

    invalidateStatsCache();
    saveStatsToStorage();

    if (import.meta.env?.DEV) {
      console.log('[StatsBridge] Shop purchase:', itemType, itemId, cost);
    }
  } catch (error) {
    console.error('[StatsBridge] Failed to record shop purchase:', error);
  }
}

/**
 * 이벤트 발생 기록
 */
export function recordEventOccurrence(
  eventId: string,
  eventName: string,
  context: { floor?: number } = {}
): void {
  try {
    const stats = getStatsCollector();
    stats.recordEvent(
      eventId,
      eventName,
      true, // success
      [], // relicsGained
      {} // resourceChanges
    );
    invalidateStatsCache();
    saveStatsToStorage();

    if (import.meta.env?.DEV) {
      console.log('[StatsBridge] Event occurred:', eventName);
    }
  } catch (error) {
    console.error('[StatsBridge] Failed to record event:', error);
  }
}

/**
 * 이벤트 선택 기록
 */
export function recordEventChoice(
  eventId: string,
  choiceId: string,
  result: {
    success?: boolean;
    hpChange?: number;
    goldChange?: number;
    relicsGained?: string[];
    cardsGained?: string[];
  } = {}
): void {
  try {
    const stats = getStatsCollector();
    stats.recordEventChoice({
      eventId,
      choiceId,
      success: result.success ?? true,
      hpChange: result.hpChange ?? 0,
      goldChange: result.goldChange ?? 0,
      relicsGained: result.relicsGained ?? [],
      cardsGained: result.cardsGained ?? [],
    });
    invalidateStatsCache();
    saveStatsToStorage();

    if (import.meta.env?.DEV) {
      console.log('[StatsBridge] Event choice:', eventId, choiceId);
    }
  } catch (error) {
    console.error('[StatsBridge] Failed to record event choice:', error);
  }
}

/**
 * 던전 진입/완료 기록
 */
export function recordDungeon(
  dungeonId: string,
  success: boolean,
  context: {
    floor?: number;
    turnsSpent?: number;
    damageTaken?: number;
    cardsGained?: string[];
    relicsGained?: string[];
  } = {}
): void {
  try {
    const stats = getStatsCollector();
    stats.recordDungeon({
      dungeonId,
      success,
      floor: context.floor ?? 1,
      turnsSpent: context.turnsSpent ?? 0,
      damageTaken: context.damageTaken ?? 0,
      cardsGained: context.cardsGained ?? [],
      relicsGained: context.relicsGained ?? [],
    });
    invalidateStatsCache();
    saveStatsToStorage();

    if (import.meta.env?.DEV) {
      console.log('[StatsBridge] Dungeon:', dungeonId, success ? 'cleared' : 'failed');
    }
  } catch (error) {
    console.error('[StatsBridge] Failed to record dungeon:', error);
  }
}

/**
 * 아이템 획득 기록
 */
export function recordItemAcquired(itemId: string, itemName?: string): void {
  try {
    const stats = getStatsCollector();
    stats.recordItemAcquired(itemId, itemName);
    invalidateStatsCache();
    saveStatsToStorage();
  } catch (error) {
    console.error('[StatsBridge] Failed to record item acquired:', error);
  }
}

/**
 * 아이템 사용 기록
 */
export function recordItemUsed(
  itemId: string,
  context: {
    hpRestored?: number;
    damageDealt?: number;
    inBattle?: boolean;
    floor?: number;
  } = {}
): void {
  try {
    const stats = getStatsCollector();
    stats.recordItemUsed({
      itemId,
      hpRestored: context.hpRestored ?? 0,
      damageDealt: context.damageDealt ?? 0,
      inBattle: context.inBattle ?? false,
      floor: context.floor ?? 1,
    });
    invalidateStatsCache();
    saveStatsToStorage();
  } catch (error) {
    console.error('[StatsBridge] Failed to record item used:', error);
  }
}

/**
 * 성장 투자 기록
 */
export function recordGrowthInvestment(
  statId: string,
  type: 'trait' | 'ethos' | 'pathos' | 'logos' = 'trait',
  amount: number = 1
): void {
  try {
    const stats = getStatsCollector();
    stats.recordGrowthInvestment(statId, type, amount);
    invalidateStatsCache();
    saveStatsToStorage();
  } catch (error) {
    console.error('[StatsBridge] Failed to record growth:', error);
  }
}

/**
 * 턴 피해 기록 (최대 피해 추적용)
 */
export function recordTurnDamage(damage: number, cardId: string, monsterName: string): void {
  try {
    const stats = getStatsCollector();
    stats.recordTurnDamage(damage, cardId, monsterName);
    invalidateStatsCache();
  } catch (error) {
    console.error('[StatsBridge] Failed to record turn damage:', error);
  }
}

/**
 * 무피해 승리 기록
 */
export function recordFlawlessVictory(isBoss: boolean = false): void {
  try {
    const stats = getStatsCollector();
    stats.recordFlawlessVictory(isBoss);
    invalidateStatsCache();
    saveStatsToStorage();
  } catch (error) {
    console.error('[StatsBridge] Failed to record flawless victory:', error);
  }
}

/**
 * 층 진행 스냅샷 기록
 */
export function recordFloorSnapshot(data: {
  floor: number;
  hp: number;
  maxHp: number;
  gold: number;
  deckSize: number;
  relicCount: number;
}): void {
  try {
    const stats = getStatsCollector();
    stats.recordFloorSnapshot(data);
    invalidateStatsCache();
  } catch (error) {
    console.error('[StatsBridge] Failed to record floor snapshot:', error);
  }
}

/**
 * 사망 기록
 */
export function recordDeath(data: {
  enemyId: string;
  enemyName?: string;
  floor: number;
  cause?: string;
  playerHp?: number;
  lastCards?: string[];
}): void {
  try {
    const stats = getStatsCollector();
    stats.recordDeath({
      enemyId: data.enemyId,
      enemyName: data.enemyName,
      floor: data.floor,
      cause: data.cause ?? 'combat',
      playerHp: data.playerHp ?? 0,
      lastCards: data.lastCards ?? [],
    });
    invalidateStatsCache();
    saveStatsToStorage();
  } catch (error) {
    console.error('[StatsBridge] Failed to record death:', error);
  }
}

// ==================== 통계 조회 ====================

/** 간소화된 통계 인터페이스 */
export interface SimplifiedStats {
  battles: number;
  wins: number;
  losses: number;
  winRate: number;
  avgTurns: number;
  avgDamageDealt: number;
  avgDamageTaken: number;
  totalDamageDealt: number;
  totalRuns: number;
  successfulRuns: number;
  /** 영혼파괴 승리 횟수 (에테르로 승리) */
  soulDestructions: number;
  /** 육체파괴 승리 횟수 (HP로 승리) */
  physicalDestructions: number;
}

/** 캐시된 상세 통계 */
let cachedDetailedStats: DetailedStats | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5000; // 5초

/**
 * 현재 통계 가져오기 (간소화된 버전)
 */
export function getCurrentStats(): SimplifiedStats {
  const detailed = getDetailedStats();

  // battleRecords에서 전투 통계 계산 (단일 순회로 최적화)
  const battleRecords = detailed.battleRecords || [];
  const battles = battleRecords.length;

  // 단일 순회로 모든 통계 계산
  let wins = 0;
  let totalTurns = 0;
  let totalDamageDealt = 0;
  let totalDamageTaken = 0;
  let soulDestructions = 0;
  let physicalDestructions = 0;

  for (let i = 0; i < battles; i++) {
    const record = battleRecords[i];
    if (record.winner === 'player') {
      wins++;
      // 영혼파괴 vs 육체파괴 집계
      if (record.isEtherVictory) {
        soulDestructions++;
      } else {
        physicalDestructions++;
      }
    }
    totalTurns += record.turns || 0;
    totalDamageDealt += record.playerDamageDealt || 0;
    totalDamageTaken += record.enemyDamageDealt || 0;
  }

  const losses = battles - wins;

  return {
    battles,
    wins,
    losses,
    winRate: battles > 0 ? wins / battles : 0,
    avgTurns: battles > 0 ? totalTurns / battles : 0,
    avgDamageDealt: battles > 0 ? totalDamageDealt / battles : 0,
    avgDamageTaken: battles > 0 ? totalDamageTaken / battles : 0,
    totalDamageDealt,
    totalRuns: detailed.runStats?.totalRuns || 0,
    successfulRuns: detailed.runStats?.successfulRuns || 0,
    soulDestructions,
    physicalDestructions,
  };
}

/**
 * 상세 통계 가져오기 (캐시 사용)
 */
export function getDetailedStats(): DetailedStats {
  const now = Date.now();

  // 캐시가 유효하면 반환
  if (cachedDetailedStats && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedDetailedStats;
  }

  const stats = getStatsCollector();
  cachedDetailedStats = stats.finalize();
  cacheTimestamp = now;

  return cachedDetailedStats;
}

/**
 * 통계 캐시 무효화
 */
export function invalidateStatsCache(): void {
  cachedDetailedStats = null;
  cacheTimestamp = 0;
}

/**
 * 카드별 통계 가져오기
 */
export function getCardStats(cardId: string) {
  const detailed = getDetailedStats();
  return detailed.cardDeepStats.get(cardId);
}

/**
 * 적별 통계 가져오기
 */
export function getEnemyStats(enemyId: string) {
  const detailed = getDetailedStats();
  return detailed.monsterStats.get(enemyId);
}

// ==================== 내보내기 ====================

export const StatsBridge = {
  // 초기화
  init: initStatsBridge,
  getCollector: getStatsCollector,
  getCollectorAsync: getStatsCollectorAsync,
  reset: resetStatsCollector,
  resetSync: resetStatsCollectorSync,
  isInitialized: isStatsInitialized,

  // 전투 기록
  recordBattle: recordGameBattle,
  recordRunStart,
  recordRunEnd,
  recordTurnDamage,
  recordFlawlessVictory,
  recordDeath,

  // 카드 관련
  recordCardPick,
  recordCardUpgrade,

  // 상징/렐릭
  recordRelicAcquired,

  // 상점
  recordShopVisit,
  recordShopPurchase,

  // 이벤트
  recordEventOccurrence,
  recordEventChoice,

  // 던전
  recordDungeon,

  // 아이템
  recordItemAcquired,
  recordItemUsed,

  // 성장
  recordGrowthInvestment,

  // 진행 추적
  recordFloorSnapshot,

  // 저장/조회
  saveStats,
  getStats: getCurrentStats,
  getDetailedStats,
  getCardStats,
  getEnemyStats,

  // 캐시
  invalidateCache: invalidateStatsCache,

  // 어댑터
  adaptResult: adaptGameBattleResult,
};

export default StatsBridge;
