/**
 * @file index.ts
 * @description 게임-시뮬레이터 통합 브릿지 서비스
 *
 * 게임 UI와 시뮬레이터 통계 시스템을 연결하는 중앙 허브입니다.
 * 모든 통계 기록, 이벤트 수집, 동기화 검증을 통합 관리합니다.
 */

// ==================== 모듈 재내보내기 ====================

export {
  // 통계 브릿지
  getStatsCollector,
  resetStatsCollector,
  isStatsInitialized,
  adaptGameBattleResult,
  recordGameBattle,
  recordRunStart,
  recordRunEnd,
  recordCardPick,
  recordRelicAcquired,
  recordCardUpgrade,
  getCurrentStats,
  getDetailedStats,
  getCardStats,
  getEnemyStats,
  invalidateStatsCache,
  StatsBridge,
} from './stats-bridge';

export type {
  GameBattleContext,
  GameEnemyInfo,
  GamePlayerInfo,
  AdaptedBattleResult,
  SimplifiedStats,
} from './stats-bridge';

export {
  // 검증 시스템
  captureBattleSnapshot,
  runVerification,
  startMonitoring,
  stopMonitoring,
  recordSyncError,
  resolveSyncError,
  getLastVerification,
  getVerificationHistory,
  getSyncErrors,
  isMonitoring,
  getSyncStatus,
  generateReport,
  StatsVerifier,
} from './stats-verifier';

export type {
  VerificationResult,
  VerificationCheck,
  VerificationSummary,
  BattleSnapshot,
  SimulatorSnapshot,
} from './stats-verifier';

export {
  // 이벤트 수집기
  startBattleSession,
  endBattleSession,
  getCurrentSession,
  collectEvent,
  captureCurrentSnapshot,
  addEventListener,
  addGlobalListener,
  recordCardPlayed,
  recordDamage,
  recordBlock,
  recordTurnStart,
  recordTurnEnd,
  recordTokenApplied,
  recordRelicTriggered,
  getSessionSummary,
  getEventTypeStats,
  getSessionHistory,
  isCollecting,
  BattleEventCollector,
} from './battle-event-collector';

export type {
  BattleEventType,
  CollectedEvent,
  BattleSession,
  EventListener,
} from './battle-event-collector';

// ==================== 통합 서비스 ====================

import { StatsBridge, recordRunStart as startRun, recordRunEnd as endRun } from './stats-bridge';
import { StatsVerifier, startMonitoring as startVerify, stopMonitoring as stopVerify, getSyncStatus } from './stats-verifier';
import { BattleEventCollector, startBattleSession, endBattleSession, captureCurrentSnapshot } from './battle-event-collector';

/** 통합 브릿지 상태 */
interface UnifiedBridgeState {
  isInitialized: boolean;
  currentRunId: string | null;
  runStartTime: number | null;
  autoVerify: boolean;
  verifyInterval: number;
}

const bridgeState: UnifiedBridgeState = {
  isInitialized: false,
  currentRunId: null,
  runStartTime: null,
  autoVerify: true,
  verifyInterval: 30000,
};

/**
 * 통합 브릿지 초기화
 */
export function initializeBridge(options?: {
  autoVerify?: boolean;
  verifyInterval?: number;
}): void {
  if (bridgeState.isInitialized) {
    console.warn('[UnifiedBridge] 이미 초기화됨');
    return;
  }

  bridgeState.autoVerify = options?.autoVerify ?? true;
  bridgeState.verifyInterval = options?.verifyInterval ?? 30000;

  if (bridgeState.autoVerify) {
    startVerify(bridgeState.verifyInterval);
  }

  bridgeState.isInitialized = true;

  if (import.meta.env?.DEV) {
    console.log('[UnifiedBridge] 초기화 완료', {
      autoVerify: bridgeState.autoVerify,
      verifyInterval: bridgeState.verifyInterval,
    });
  }
}

/**
 * 통합 브릿지 정리
 */
export function cleanupBridge(): void {
  if (bridgeState.autoVerify) {
    stopVerify();
  }
  bridgeState.isInitialized = false;
  bridgeState.currentRunId = null;
  bridgeState.runStartTime = null;

  if (import.meta.env?.DEV) {
    console.log('[UnifiedBridge] 정리 완료');
  }
}

/**
 * 새 런 시작 (통합)
 */
export function startNewRun(deck: string[], relics: string[] = []): string {
  const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  bridgeState.currentRunId = runId;
  bridgeState.runStartTime = Date.now();

  // 통계 시스템에 기록
  startRun(deck, relics);

  if (import.meta.env?.DEV) {
    console.log('[UnifiedBridge] 새 런 시작:', runId);
  }

  return runId;
}

/**
 * 런 종료 (통합)
 */
export function finishRun(
  success: boolean,
  finalFloor: number,
  finalDeck: string[],
  finalRelics: string[] = []
): void {
  endRun(success, finalFloor, finalDeck, finalRelics);

  if (import.meta.env?.DEV) {
    const duration = bridgeState.runStartTime
      ? Date.now() - bridgeState.runStartTime
      : 0;
    console.log('[UnifiedBridge] 런 종료:', {
      runId: bridgeState.currentRunId,
      success,
      floor: finalFloor,
      duration: `${Math.round(duration / 1000)}s`,
    });
  }

  bridgeState.currentRunId = null;
  bridgeState.runStartTime = null;
}

/**
 * 전투 시작 (통합)
 */
export function startBattle(): void {
  startBattleSession();
}

/**
 * 전투 종료 (통합)
 */
export function finishBattle(
  result: 'victory' | 'defeat',
  battleState: {
    player: { hp: number; maxHp: number; block?: number };
    enemy: { hp: number; maxHp: number; block?: number };
    turnNumber: number;
    cardUsageCount?: Record<string, number>;
  }
): void {
  // 마지막 스냅샷 캡처
  captureCurrentSnapshot(battleState);

  // 세션 종료
  endBattleSession(result);
}

/**
 * 동기화 상태 확인
 */
export function checkSyncHealth(): {
  healthy: boolean;
  score: number;
  message: string;
  details: {
    statsInitialized: boolean;
    isMonitoring: boolean;
    lastVerification: number | null;
    unresolvedErrors: number;
  };
} {
  const syncStatus = getSyncStatus();
  const stats = StatsBridge.getCollector();

  return {
    healthy: syncStatus.healthy,
    score: syncStatus.score,
    message: syncStatus.message,
    details: {
      statsInitialized: StatsBridge.isInitialized(),
      isMonitoring: StatsVerifier.isMonitoring(),
      lastVerification: syncStatus.lastCheck,
      unresolvedErrors: syncStatus.unresolvedErrors,
    },
  };
}

/**
 * 진단 리포트 생성
 */
export function generateDiagnosticReport(): string {
  const syncHealth = checkSyncHealth();
  const stats = StatsBridge.getStats();
  const session = BattleEventCollector.getCurrentSession();
  const sessionHistory = BattleEventCollector.getHistory();

  let report = '\n═══════════════════════════════════════════════\n';
  report += '        게임-시뮬레이터 통합 진단 리포트\n';
  report += '═══════════════════════════════════════════════\n\n';

  // 동기화 상태
  report += '📊 동기화 상태\n';
  report += `   상태: ${syncHealth.healthy ? '✅ 정상' : '⚠️ 이상'}\n`;
  report += `   점수: ${syncHealth.score}/100\n`;
  report += `   메시지: ${syncHealth.message}\n`;
  report += `   자동 검증: ${syncHealth.details.isMonitoring ? '활성' : '비활성'}\n`;
  report += `   미해결 에러: ${syncHealth.details.unresolvedErrors}개\n\n`;

  // 통계 요약
  report += '📈 통계 요약\n';
  report += `   총 전투: ${stats.battles}회\n`;
  report += `   승률: ${(stats.winRate * 100).toFixed(1)}%\n`;
  report += `   평균 턴: ${stats.avgTurns.toFixed(1)}\n`;
  report += `   평균 피해: ${stats.avgDamageDealt.toFixed(1)}\n\n`;

  // 현재 세션
  if (session) {
    const summary = BattleEventCollector.getSummary(session);
    report += '🎮 현재 전투 세션\n';
    report += `   ID: ${session.id}\n`;
    report += `   상태: ${session.result}\n`;
    report += `   이벤트: ${session.events.length}개\n`;
    report += `   턴: ${session.turnCount}\n`;
    if (summary) {
      report += `   DPT: ${summary.dpt.toFixed(1)}\n`;
    }
    report += '\n';
  }

  // 세션 히스토리
  report += '📋 세션 히스토리\n';
  report += `   총 세션: ${sessionHistory.length}개\n`;
  if (sessionHistory.length > 0) {
    const lastSessions = sessionHistory.slice(-5);
    report += '   최근 5개:\n';
    lastSessions.forEach((s, i) => {
      report += `     ${i + 1}. ${s.result === 'victory' ? '✓' : '✗'} - 턴 ${s.turnCount}, 피해 ${s.damageDealt}\n`;
    });
  }
  report += '\n';

  // 검증 리포트
  report += StatsVerifier.generateReport();

  report += '═══════════════════════════════════════════════\n';

  return report;
}

// ==================== 통합 인터페이스 ====================

/**
 * 통합 브릿지 서비스
 *
 * 게임과 시뮬레이터 사이의 모든 데이터 흐름을 관리합니다.
 */
export const UnifiedBridge = {
  // 초기화
  initialize: initializeBridge,
  cleanup: cleanupBridge,

  // 런 관리
  startRun: startNewRun,
  finishRun,

  // 전투 관리
  startBattle,
  finishBattle,

  // 상태 확인
  checkHealth: checkSyncHealth,
  generateReport: generateDiagnosticReport,

  // 하위 시스템 접근
  stats: StatsBridge,
  verifier: StatsVerifier,
  events: BattleEventCollector,
};

export default UnifiedBridge;
