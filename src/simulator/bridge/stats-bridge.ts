/**
 * @file stats-bridge.ts
 * @description 게임-시뮬레이터 통계 브릿지
 *
 * 실제 게임 전투 결과를 시뮬레이터 통계 시스템에 연결합니다.
 */

import { StatsCollector, createStatsCollector } from '../analysis/detailed-stats';
import type { BattleResult as SimulatorBattleResult, BattleEvent } from '../core/game-types';
import type { BattleResult as GameBattleResult } from '../../types/battle';

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
}

/** 게임에서 전달하는 적 정보 */
export interface GameEnemyInfo {
  id?: string;
  name: string;
  tier?: number;
  isBoss?: boolean;
  isElite?: boolean;
  emoji?: string;
}

/** 게임에서 전달하는 플레이어 정보 */
export interface GamePlayerInfo {
  hp: number;
  maxHp: number;
  deck?: string[];
  relics?: string[];
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

/**
 * localStorage에서 통계 로드
 */
function loadStatsFromStorage(): ReturnType<StatsCollector['finalize']> | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const stored = localStorage.getItem(STATS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Map 객체 복원
      if (parsed.monsterStats && typeof parsed.monsterStats === 'object') {
        parsed.monsterStats = new Map(Object.entries(parsed.monsterStats));
      }
      if (parsed.cardDeepStats && typeof parsed.cardDeepStats === 'object') {
        parsed.cardDeepStats = new Map(Object.entries(parsed.cardDeepStats));
      }
      return parsed;
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
    // Map 객체를 일반 객체로 변환
    const serializable = {
      ...stats,
      monsterStats: Object.fromEntries(stats.monsterStats || new Map()),
      cardDeepStats: Object.fromEntries(stats.cardDeepStats || new Map()),
    };
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(serializable));
  } catch (e) {
    console.warn('[StatsBridge] Failed to save stats to localStorage:', e);
  }
}

/**
 * 전역 통계 수집기 가져오기 또는 생성
 */
export function getStatsCollector(): StatsCollector {
  if (!globalStatsCollector) {
    globalStatsCollector = createStatsCollector();
    isInitialized = true;
  }
  return globalStatsCollector;
}

/**
 * 통계 수집기 초기화 (새 런 시작 시)
 */
export function resetStatsCollector(): void {
  globalStatsCollector = createStatsCollector();
  isInitialized = true;
  // localStorage도 초기화
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(STATS_STORAGE_KEY);
  }
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

  // 로그에서 이벤트 추출 시도
  for (let i = 0; i < battleLog.length; i++) {
    const logEntry = battleLog[i];
    const event = parseLogToEvent(logEntry, i + 1);
    if (event) {
      events.push(event);
    }
  }

  events.push({
    type: 'battle_end',
    turn: context.turn || battleLog.length,
    actor: winner,
    message: winner === 'player' ? '승리!' : '패배...',
  });

  return {
    source: 'game',
    winner,
    turns: context.turn || Math.max(1, Math.ceil(battleLog.length / 2)),
    playerDamageDealt: context.damageDealt || 0,
    enemyDamageDealt: context.damageTaken || 0,
    playerFinalHp: gameResult.playerHp ?? playerInfo.hp,
    enemyFinalHp: winner === 'player' ? 0 : 1,  // 게임에서 정확한 값 없음
    etherGained: gameResult.deltaEther || 0,
    goldChange: 0,
    battleLog,
    events,
    cardUsage: context.cardUsage || {},
    comboStats: context.comboUsage || {},
    tokenStats: context.tokenUsage || {},
    timeline: [],
    victory: winner === 'player',
    enemyId: enemyInfo.id,
    isEtherVictory: context.isEtherVictory || gameResult.isEtherVictory,
  };
}

/**
 * 로그 문자열을 BattleEvent로 변환 시도
 */
function parseLogToEvent(logEntry: string, turn: number): BattleEvent | null {
  const lower = logEntry.toLowerCase();

  // 피해 관련
  if (lower.includes('damage') || lower.includes('피해')) {
    const match = logEntry.match(/(\d+)/);
    return {
      type: 'damage_dealt',
      turn,
      value: match ? parseInt(match[1], 10) : 0,
      message: logEntry,
    };
  }

  // 방어 관련
  if (lower.includes('block') || lower.includes('방어')) {
    const match = logEntry.match(/(\d+)/);
    return {
      type: 'block_gained',
      turn,
      value: match ? parseInt(match[1], 10) : 0,
      message: logEntry,
    };
  }

  // 카드 사용
  if (lower.includes('사용') || lower.includes('play')) {
    return {
      type: 'card_execute',
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

    // localStorage에 저장
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
let cachedDetailedStats: ReturnType<StatsCollector['finalize']> | null = null;
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
export function getDetailedStats(): ReturnType<StatsCollector['finalize']> {
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
  getCollector: getStatsCollector,
  reset: resetStatsCollector,
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
