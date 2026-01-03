/**
 * @file battle-event-collector.ts
 * @description 전투 중 실시간 이벤트 수집기
 *
 * 전투 리듀서와 연동하여 실시간으로 이벤트를 캡처하고
 * 통계 시스템과 검증 시스템에 전달합니다.
 */

import { captureBattleSnapshot, runVerification, recordSyncError } from './stats-verifier';
import type { BattleSnapshot } from './stats-verifier';

// ==================== 타입 정의 ====================

/** 전투 이벤트 타입 */
export type BattleEventType =
  | 'battle_start'
  | 'battle_end'
  | 'turn_start'
  | 'turn_end'
  | 'card_played'
  | 'card_drawn'
  | 'damage_dealt'
  | 'damage_taken'
  | 'block_gained'
  | 'heal'
  | 'ether_gained'
  | 'ether_spent'
  | 'token_applied'
  | 'token_removed'
  | 'relic_triggered'
  | 'combo_activated'
  | 'special_triggered';

/** 수집된 이벤트 */
export interface CollectedEvent {
  id: string;
  type: BattleEventType;
  timestamp: number;
  turn: number;
  actor: 'player' | 'enemy';
  data: Record<string, unknown>;
}

/** 전투 세션 */
export interface BattleSession {
  id: string;
  startTime: number;
  endTime: number | null;
  events: CollectedEvent[];
  snapshots: BattleSnapshot[];
  cardUsage: Record<string, number>;
  damageDealt: number;
  damageTaken: number;
  turnCount: number;
  result: 'victory' | 'defeat' | 'ongoing';
}

/** 이벤트 리스너 */
export type EventListener = (event: CollectedEvent) => void;

// ==================== 수집기 상태 ====================

interface CollectorState {
  currentSession: BattleSession | null;
  sessionHistory: BattleSession[];
  listeners: Map<BattleEventType, Set<EventListener>>;
  globalListeners: Set<EventListener>;
  isCollecting: boolean;
  eventIdCounter: number;
}

const state: CollectorState = {
  currentSession: null,
  sessionHistory: [],
  listeners: new Map(),
  globalListeners: new Set(),
  isCollecting: false,
  eventIdCounter: 0,
};

// ==================== 유틸리티 ====================

function generateEventId(): string {
  state.eventIdCounter += 1;
  return `evt_${Date.now()}_${state.eventIdCounter}`;
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== 세션 관리 ====================

/**
 * 새 전투 세션 시작
 */
export function startBattleSession(): BattleSession {
  // 이전 세션이 있으면 종료 처리
  if (state.currentSession && state.currentSession.result === 'ongoing') {
    endBattleSession('defeat'); // 비정상 종료로 처리
  }

  const session: BattleSession = {
    id: generateSessionId(),
    startTime: Date.now(),
    endTime: null,
    events: [],
    snapshots: [],
    cardUsage: {},
    damageDealt: 0,
    damageTaken: 0,
    turnCount: 0,
    result: 'ongoing',
  };

  state.currentSession = session;
  state.isCollecting = true;

  // 시작 이벤트 기록
  collectEvent({
    type: 'battle_start',
    turn: 1,
    actor: 'player',
    data: { sessionId: session.id },
  });

  if (import.meta.env?.DEV) {
    console.log('[EventCollector] 전투 세션 시작:', session.id);
  }

  return session;
}

/**
 * 전투 세션 종료
 */
export function endBattleSession(result: 'victory' | 'defeat'): BattleSession | null {
  if (!state.currentSession) return null;

  state.currentSession.endTime = Date.now();
  state.currentSession.result = result;
  state.isCollecting = false;

  // 종료 이벤트 기록
  collectEvent({
    type: 'battle_end',
    turn: state.currentSession.turnCount,
    actor: 'player',
    data: {
      result,
      duration: state.currentSession.endTime - state.currentSession.startTime,
      totalEvents: state.currentSession.events.length,
    },
  });

  // 검증 실행
  const lastSnapshot = state.currentSession.snapshots[state.currentSession.snapshots.length - 1];
  if (lastSnapshot) {
    const verification = runVerification(lastSnapshot);
    if (!verification.passed) {
      recordSyncError(
        'value_mismatch',
        `전투 종료 시 검증 실패 (점수: ${verification.summary.syncScore})`,
        lastSnapshot,
        verification
      );
    }
  }

  // 히스토리에 추가
  const completedSession = { ...state.currentSession };
  state.sessionHistory.push(completedSession);

  // 최근 50개만 유지
  if (state.sessionHistory.length > 50) {
    state.sessionHistory.shift();
  }

  if (import.meta.env?.DEV) {
    console.log('[EventCollector] 전투 세션 종료:', {
      id: completedSession.id,
      result,
      events: completedSession.events.length,
      duration: completedSession.endTime! - completedSession.startTime,
    });
  }

  state.currentSession = null;
  return completedSession;
}

/**
 * 현재 세션 조회
 */
export function getCurrentSession(): BattleSession | null {
  return state.currentSession;
}

// ==================== 이벤트 수집 ====================

interface CollectEventParams {
  type: BattleEventType;
  turn: number;
  actor: 'player' | 'enemy';
  data?: Record<string, unknown>;
}

/**
 * 이벤트 수집
 */
export function collectEvent(params: CollectEventParams): CollectedEvent | null {
  if (!state.isCollecting || !state.currentSession) {
    return null;
  }

  const event: CollectedEvent = {
    id: generateEventId(),
    type: params.type,
    timestamp: Date.now(),
    turn: params.turn,
    actor: params.actor,
    data: params.data || {},
  };

  // 세션에 추가
  state.currentSession.events.push(event);

  // 통계 업데이트
  updateSessionStats(event);

  // 리스너에게 알림
  notifyListeners(event);

  return event;
}

/**
 * 세션 통계 업데이트
 */
function updateSessionStats(event: CollectedEvent): void {
  if (!state.currentSession) return;

  switch (event.type) {
    case 'turn_start':
      state.currentSession.turnCount = event.turn;
      break;

    case 'card_played':
      const cardId = event.data.cardId as string;
      if (cardId) {
        state.currentSession.cardUsage[cardId] =
          (state.currentSession.cardUsage[cardId] || 0) + 1;
      }
      break;

    case 'damage_dealt':
      if (event.actor === 'player') {
        state.currentSession.damageDealt += (event.data.amount as number) || 0;
      } else {
        state.currentSession.damageTaken += (event.data.amount as number) || 0;
      }
      break;

    case 'damage_taken':
      if (event.actor === 'player') {
        state.currentSession.damageTaken += (event.data.amount as number) || 0;
      }
      break;
  }
}

// ==================== 스냅샷 캡처 ====================

/**
 * 현재 상태 스냅샷 캡처
 */
export function captureCurrentSnapshot(battleState: {
  player: { hp: number; maxHp: number; block?: number };
  enemy: { hp: number; maxHp: number; block?: number };
  turnNumber: number;
  cardUsageCount?: Record<string, number>;
  tokens?: string[];
}): BattleSnapshot | null {
  if (!state.currentSession) return null;

  const snapshot = captureBattleSnapshot({
    player: battleState.player,
    enemy: battleState.enemy,
    turnNumber: battleState.turnNumber,
    cardUsageCount: battleState.cardUsageCount || state.currentSession.cardUsage,
    damageDealt: state.currentSession.damageDealt,
    damageTaken: state.currentSession.damageTaken,
    cardsPlayed: Object.keys(state.currentSession.cardUsage),
    tokens: battleState.tokens,
  });

  state.currentSession.snapshots.push(snapshot);

  return snapshot;
}

// ==================== 리스너 관리 ====================

/**
 * 특정 이벤트 타입 리스너 등록
 */
export function addEventListener(
  type: BattleEventType,
  listener: EventListener
): () => void {
  if (!state.listeners.has(type)) {
    state.listeners.set(type, new Set());
  }
  state.listeners.get(type)!.add(listener);

  return () => {
    state.listeners.get(type)?.delete(listener);
  };
}

/**
 * 전역 리스너 등록 (모든 이벤트)
 */
export function addGlobalListener(listener: EventListener): () => void {
  state.globalListeners.add(listener);

  return () => {
    state.globalListeners.delete(listener);
  };
}

/**
 * 리스너에게 알림
 */
function notifyListeners(event: CollectedEvent): void {
  // 타입별 리스너
  const typeListeners = state.listeners.get(event.type);
  if (typeListeners) {
    typeListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[EventCollector] 리스너 에러:', error);
      }
    });
  }

  // 전역 리스너
  state.globalListeners.forEach(listener => {
    try {
      listener(event);
    } catch (error) {
      console.error('[EventCollector] 전역 리스너 에러:', error);
    }
  });
}

// ==================== 편의 함수 ====================

/**
 * 카드 사용 이벤트
 */
export function recordCardPlayed(
  cardId: string,
  cardName: string,
  actor: 'player' | 'enemy',
  turn: number,
  additionalData?: Record<string, unknown>
): void {
  collectEvent({
    type: 'card_played',
    turn,
    actor,
    data: {
      cardId,
      cardName,
      ...additionalData,
    },
  });
}

/**
 * 피해 이벤트
 */
export function recordDamage(
  amount: number,
  actor: 'player' | 'enemy',
  target: 'player' | 'enemy',
  turn: number,
  source?: string
): void {
  collectEvent({
    type: actor === 'player' ? 'damage_dealt' : 'damage_taken',
    turn,
    actor,
    data: {
      amount,
      target,
      source,
    },
  });
}

/**
 * 방어 획득 이벤트
 */
export function recordBlock(
  amount: number,
  actor: 'player' | 'enemy',
  turn: number,
  source?: string
): void {
  collectEvent({
    type: 'block_gained',
    turn,
    actor,
    data: {
      amount,
      source,
    },
  });
}

/**
 * 턴 시작 이벤트
 */
export function recordTurnStart(turn: number): void {
  collectEvent({
    type: 'turn_start',
    turn,
    actor: 'player',
    data: {},
  });
}

/**
 * 턴 종료 이벤트
 */
export function recordTurnEnd(turn: number): void {
  collectEvent({
    type: 'turn_end',
    turn,
    actor: 'player',
    data: {},
  });
}

/**
 * 토큰 적용 이벤트
 */
export function recordTokenApplied(
  tokenId: string,
  stacks: number,
  target: 'player' | 'enemy',
  turn: number,
  source?: string
): void {
  collectEvent({
    type: 'token_applied',
    turn,
    actor: target,
    data: {
      tokenId,
      stacks,
      source,
    },
  });
}

/**
 * 상징 발동 이벤트
 */
export function recordRelicTriggered(
  relicId: string,
  effect: string,
  turn: number
): void {
  collectEvent({
    type: 'relic_triggered',
    turn,
    actor: 'player',
    data: {
      relicId,
      effect,
    },
  });
}

// ==================== 분석 함수 ====================

/**
 * 세션 통계 요약
 */
export function getSessionSummary(session?: BattleSession): {
  duration: number;
  eventCount: number;
  cardCount: number;
  uniqueCards: number;
  damageDealt: number;
  damageTaken: number;
  turnCount: number;
  dpt: number; // damage per turn
  eventsPerTurn: number;
} | null {
  const target = session || state.currentSession;
  if (!target) return null;

  const duration = (target.endTime || Date.now()) - target.startTime;
  const uniqueCards = Object.keys(target.cardUsage).length;
  const cardCount = Object.values(target.cardUsage).reduce((a, b) => a + b, 0);
  const turnCount = target.turnCount || 1;

  return {
    duration,
    eventCount: target.events.length,
    cardCount,
    uniqueCards,
    damageDealt: target.damageDealt,
    damageTaken: target.damageTaken,
    turnCount,
    dpt: target.damageDealt / turnCount,
    eventsPerTurn: target.events.length / turnCount,
  };
}

/**
 * 이벤트 타입별 통계
 */
export function getEventTypeStats(session?: BattleSession): Record<BattleEventType, number> {
  const target = session || state.currentSession;
  if (!target) return {} as Record<BattleEventType, number>;

  const stats: Partial<Record<BattleEventType, number>> = {};
  target.events.forEach(event => {
    stats[event.type] = (stats[event.type] || 0) + 1;
  });

  return stats as Record<BattleEventType, number>;
}

/**
 * 세션 히스토리 조회
 */
export function getSessionHistory(): BattleSession[] {
  return [...state.sessionHistory];
}

/**
 * 수집 상태 확인
 */
export function isCollecting(): boolean {
  return state.isCollecting;
}

// ==================== 내보내기 ====================

export const BattleEventCollector = {
  // 세션 관리
  startSession: startBattleSession,
  endSession: endBattleSession,
  getCurrentSession,
  getHistory: getSessionHistory,

  // 이벤트 수집
  collect: collectEvent,
  isCollecting,

  // 스냅샷
  captureSnapshot: captureCurrentSnapshot,

  // 리스너
  on: addEventListener,
  onAny: addGlobalListener,

  // 편의 함수
  cardPlayed: recordCardPlayed,
  damage: recordDamage,
  block: recordBlock,
  turnStart: recordTurnStart,
  turnEnd: recordTurnEnd,
  token: recordTokenApplied,
  relic: recordRelicTriggered,

  // 분석
  getSummary: getSessionSummary,
  getEventStats: getEventTypeStats,
};

export default BattleEventCollector;
