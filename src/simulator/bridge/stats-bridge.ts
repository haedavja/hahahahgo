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
}

// ==================== 싱글톤 인스턴스 ====================

let globalStatsCollector: StatsCollector | null = null;
let isInitialized = false;

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
}

/**
 * 초기화 여부 확인
 */
export function isStatsInitialized(): boolean {
  return isInitialized;
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
    stats.recordRunStart({ deck, relics });

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
    stats.recordRunEnd({
      success,
      floor: finalFloor,
      deck: finalDeck,
      relics: finalRelics,
    });

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
    stats.recordCardPick(cardId, offeredCards, context);

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
    stats.recordRelicAcquired(relicId, context);

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
  context: { floor?: number } = {}
): void {
  try {
    const stats = getStatsCollector();
    stats.recordCardUpgrade(cardId, newLevel, context);

    if (import.meta.env?.DEV) {
      console.log('[StatsBridge] Card upgraded:', cardId, 'to level', newLevel);
    }
  } catch (error) {
    console.error('[StatsBridge] Failed to record upgrade:', error);
  }
}

// ==================== 통계 조회 ====================

/**
 * 현재 통계 가져오기
 */
export function getCurrentStats() {
  const stats = getStatsCollector();
  return stats.getStats();
}

/**
 * 상세 통계 가져오기
 */
export function getDetailedStats() {
  const stats = getStatsCollector();
  return stats.getDetailedStats();
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

  // 기록
  recordBattle: recordGameBattle,
  recordRunStart,
  recordRunEnd,
  recordCardPick,
  recordRelicAcquired,
  recordCardUpgrade,

  // 조회
  getStats: getCurrentStats,
  getDetailedStats,
  getCardStats,
  getEnemyStats,

  // 어댑터
  adaptResult: adaptGameBattleResult,
};

export default StatsBridge;
