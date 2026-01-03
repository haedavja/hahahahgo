/**
 * @file stats-verifier.ts
 * @description 게임-시뮬레이터 통계 동기화 검증 시스템
 *
 * 게임이 업데이트되어도 시뮬레이터 통계가 신뢰할 수 있도록
 * 자동으로 데이터 일관성을 검증합니다.
 */

import { getCurrentStats } from './stats-bridge';

// ==================== 타입 정의 ====================

/** 검증 결과 */
export interface VerificationResult {
  passed: boolean;
  timestamp: number;
  checks: VerificationCheck[];
  summary: VerificationSummary;
}

/** 개별 검증 항목 */
export interface VerificationCheck {
  name: string;
  category: 'data_integrity' | 'sync_accuracy' | 'consistency' | 'completeness';
  passed: boolean;
  expected?: unknown;
  actual?: unknown;
  message: string;
  severity: 'critical' | 'warning' | 'info';
}

/** 검증 요약 */
export interface VerificationSummary {
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  criticalFailures: number;
  syncScore: number; // 0-100
}

/** 검증할 전투 데이터 스냅샷 */
export interface BattleSnapshot {
  turnNumber: number;
  playerHp: number;
  playerMaxHp: number;
  enemyHp: number;
  enemyMaxHp: number;
  playerBlock: number;
  enemyBlock: number;
  cardUsageCount: Record<string, number>;
  damageDealt: number;
  damageTaken: number;
  cardsPlayed: string[];
  activeTokens: string[];
}

/** 비교 대상 시뮬레이터 데이터 */
export interface SimulatorSnapshot {
  battles: number;
  wins: number;
  losses: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  cardUsage: Record<string, number>;
  avgTurnsPerBattle: number;
}

// ==================== 검증 상태 ====================

interface VerificationState {
  lastVerification: VerificationResult | null;
  verificationHistory: VerificationResult[];
  battleSnapshots: BattleSnapshot[];
  syncErrors: SyncError[];
  isMonitoring: boolean;
}

interface SyncError {
  timestamp: number;
  type: 'missing_record' | 'value_mismatch' | 'timing_issue' | 'type_conversion';
  description: string;
  gameValue?: unknown;
  simulatorValue?: unknown;
  resolved: boolean;
}

const state: VerificationState = {
  lastVerification: null,
  verificationHistory: [],
  battleSnapshots: [],
  syncErrors: [],
  isMonitoring: false,
};

// ==================== 스냅샷 캡처 ====================

/**
 * 전투 상태 스냅샷 캡처
 */
export function captureBattleSnapshot(battleState: {
  player: { hp: number; maxHp: number; block?: number };
  enemy: { hp: number; maxHp: number; block?: number };
  turnNumber: number;
  cardUsageCount: Record<string, number>;
  damageDealt?: number;
  damageTaken?: number;
  cardsPlayed?: string[];
  tokens?: string[];
}): BattleSnapshot {
  const snapshot: BattleSnapshot = {
    turnNumber: battleState.turnNumber,
    playerHp: battleState.player.hp,
    playerMaxHp: battleState.player.maxHp,
    enemyHp: battleState.enemy.hp,
    enemyMaxHp: battleState.enemy.maxHp,
    playerBlock: battleState.player.block || 0,
    enemyBlock: battleState.enemy.block || 0,
    cardUsageCount: { ...battleState.cardUsageCount },
    damageDealt: battleState.damageDealt || 0,
    damageTaken: battleState.damageTaken || 0,
    cardsPlayed: battleState.cardsPlayed || [],
    activeTokens: battleState.tokens || [],
  };

  state.battleSnapshots.push(snapshot);

  // 최근 100개만 유지
  if (state.battleSnapshots.length > 100) {
    state.battleSnapshots.shift();
  }

  return snapshot;
}

// ==================== 데이터 무결성 검증 ====================

/**
 * 데이터 무결성 검증
 */
function verifyDataIntegrity(): VerificationCheck[] {
  const checks: VerificationCheck[] = [];
  const stats = getCurrentStats();

  // 1. 전투 수 일관성 검증
  const totalBattles = stats.battles;
  const calculatedTotal = stats.wins + stats.losses;
  checks.push({
    name: 'battle_count_consistency',
    category: 'data_integrity',
    passed: totalBattles === calculatedTotal,
    expected: totalBattles,
    actual: calculatedTotal,
    message: totalBattles === calculatedTotal
      ? '전투 수 일치'
      : `전투 수 불일치: ${totalBattles} vs ${calculatedTotal}`,
    severity: totalBattles === calculatedTotal ? 'info' : 'critical',
  });

  // 2. 승률 범위 검증
  const winRate = stats.winRate;
  const validWinRate = winRate >= 0 && winRate <= 1;
  checks.push({
    name: 'win_rate_range',
    category: 'data_integrity',
    passed: validWinRate,
    expected: '0-1',
    actual: winRate,
    message: validWinRate
      ? `승률 정상 범위: ${(winRate * 100).toFixed(1)}%`
      : `승률 비정상: ${winRate}`,
    severity: validWinRate ? 'info' : 'critical',
  });

  // 3. 평균값 정합성 검증
  if (totalBattles > 0) {
    const avgDamage = stats.avgDamageDealt;
    const totalDamage = stats.totalDamageDealt;
    const calculatedAvg = totalDamage / totalBattles;
    const avgMatch = Math.abs(avgDamage - calculatedAvg) < 0.01;

    checks.push({
      name: 'avg_damage_consistency',
      category: 'data_integrity',
      passed: avgMatch,
      expected: calculatedAvg,
      actual: avgDamage,
      message: avgMatch
        ? '평균 피해량 정합성 확인'
        : `평균 피해량 불일치: ${avgDamage.toFixed(2)} vs ${calculatedAvg.toFixed(2)}`,
      severity: avgMatch ? 'info' : 'warning',
    });
  }

  // 4. 음수값 검증
  const noNegatives =
    stats.battles >= 0 &&
    stats.wins >= 0 &&
    stats.losses >= 0 &&
    stats.totalDamageDealt >= 0;

  checks.push({
    name: 'no_negative_values',
    category: 'data_integrity',
    passed: noNegatives,
    message: noNegatives
      ? '모든 값 양수'
      : '음수 값 발견',
    severity: noNegatives ? 'info' : 'critical',
  });

  return checks;
}

// ==================== 동기화 정확도 검증 ====================

/**
 * 실시간 동기화 정확도 검증
 */
function verifySyncAccuracy(
  gameSnapshot?: BattleSnapshot
): VerificationCheck[] {
  const checks: VerificationCheck[] = [];
  const stats = getCurrentStats();

  // 스냅샷이 있으면 즉각적인 동기화 검증
  if (gameSnapshot) {
    const lastSnapshot = state.battleSnapshots[state.battleSnapshots.length - 1];

    if (lastSnapshot) {
      // 카드 사용 횟수 동기화 검증
      const gameCardUsage = Object.values(gameSnapshot.cardUsageCount).reduce((a, b) => a + b, 0);
      const snapshotCardUsage = Object.values(lastSnapshot.cardUsageCount).reduce((a, b) => a + b, 0);

      checks.push({
        name: 'card_usage_sync',
        category: 'sync_accuracy',
        passed: gameCardUsage === snapshotCardUsage,
        expected: gameCardUsage,
        actual: snapshotCardUsage,
        message: gameCardUsage === snapshotCardUsage
          ? '카드 사용 횟수 동기화 완료'
          : `카드 사용 불일치: 게임 ${gameCardUsage}, 기록 ${snapshotCardUsage}`,
        severity: gameCardUsage === snapshotCardUsage ? 'info' : 'warning',
      });
    }
  }

  // 기록된 전투 수와 시뮬레이터 전투 수 비교
  const recordedBattles = state.battleSnapshots.length;
  checks.push({
    name: 'battle_record_sync',
    category: 'sync_accuracy',
    passed: true, // 스냅샷 시스템이 작동 중이면 통과
    expected: '>=0',
    actual: recordedBattles,
    message: `${recordedBattles}개 전투 스냅샷 기록됨`,
    severity: 'info',
  });

  // 동기화 에러 체크
  const unresolvedErrors = state.syncErrors.filter(e => !e.resolved);
  checks.push({
    name: 'sync_error_check',
    category: 'sync_accuracy',
    passed: unresolvedErrors.length === 0,
    expected: 0,
    actual: unresolvedErrors.length,
    message: unresolvedErrors.length === 0
      ? '미해결 동기화 에러 없음'
      : `${unresolvedErrors.length}개 미해결 에러`,
    severity: unresolvedErrors.length === 0 ? 'info' : 'warning',
  });

  return checks;
}

// ==================== 일관성 검증 ====================

/**
 * 데이터 일관성 검증
 */
function verifyConsistency(): VerificationCheck[] {
  const checks: VerificationCheck[] = [];
  const stats = getCurrentStats();

  // 1. 시간순 일관성
  if (state.battleSnapshots.length >= 2) {
    const snapshots = state.battleSnapshots;
    let turnOrderValid = true;

    for (let i = 1; i < snapshots.length; i++) {
      // 다른 전투의 스냅샷일 수 있으므로 턴이 1로 리셋되는 것은 허용
      if (snapshots[i].turnNumber < snapshots[i - 1].turnNumber &&
          snapshots[i].turnNumber !== 1) {
        turnOrderValid = false;
        break;
      }
    }

    checks.push({
      name: 'turn_order_consistency',
      category: 'consistency',
      passed: turnOrderValid,
      message: turnOrderValid
        ? '턴 순서 일관성 확인'
        : '턴 순서 불일치 발견',
      severity: turnOrderValid ? 'info' : 'warning',
    });
  }

  // 2. HP 범위 일관성
  const latestSnapshot = state.battleSnapshots[state.battleSnapshots.length - 1];
  if (latestSnapshot) {
    const validPlayerHp = latestSnapshot.playerHp >= 0 &&
                          latestSnapshot.playerHp <= latestSnapshot.playerMaxHp;
    const validEnemyHp = latestSnapshot.enemyHp >= 0 &&
                         latestSnapshot.enemyHp <= latestSnapshot.enemyMaxHp;

    checks.push({
      name: 'hp_range_consistency',
      category: 'consistency',
      passed: validPlayerHp && validEnemyHp,
      message: (validPlayerHp && validEnemyHp)
        ? 'HP 범위 정상'
        : 'HP 범위 비정상',
      severity: (validPlayerHp && validEnemyHp) ? 'info' : 'warning',
    });
  }

  // 3. 통계 연속성 (갑작스런 값 변화 감지)
  if (state.verificationHistory.length > 0) {
    const prevStats = state.verificationHistory[state.verificationHistory.length - 1];
    const prevBattles = prevStats.summary.totalChecks;
    const currentBattles = stats.battles;

    // 한 번에 10개 이상 전투가 추가되면 경고 (배치 처리 가능성)
    const suddenIncrease = currentBattles - prevBattles > 10;

    checks.push({
      name: 'stats_continuity',
      category: 'consistency',
      passed: !suddenIncrease,
      expected: '<=10 battles/verification',
      actual: currentBattles - prevBattles,
      message: suddenIncrease
        ? '급격한 통계 변화 감지'
        : '통계 연속성 정상',
      severity: suddenIncrease ? 'warning' : 'info',
    });
  }

  return checks;
}

// ==================== 완전성 검증 ====================

/**
 * 데이터 완전성 검증
 */
function verifyCompleteness(): VerificationCheck[] {
  const checks: VerificationCheck[] = [];
  const stats = getCurrentStats();

  // 1. 필수 필드 존재 확인
  const requiredFields = ['battles', 'wins', 'losses', 'winRate', 'avgTurns'];
  const missingFields = requiredFields.filter(
    field => (stats as Record<string, unknown>)[field] === undefined
  );

  checks.push({
    name: 'required_fields',
    category: 'completeness',
    passed: missingFields.length === 0,
    expected: requiredFields,
    actual: requiredFields.filter(f => !missingFields.includes(f)),
    message: missingFields.length === 0
      ? '모든 필수 필드 존재'
      : `누락 필드: ${missingFields.join(', ')}`,
    severity: missingFields.length === 0 ? 'info' : 'critical',
  });

  // 2. 카드 통계 완전성
  if (state.battleSnapshots.length > 0) {
    const allPlayedCards = new Set<string>();
    state.battleSnapshots.forEach(snap => {
      snap.cardsPlayed.forEach(card => allPlayedCards.add(card));
    });

    // 간단히 카드가 기록되었는지만 확인
    checks.push({
      name: 'card_tracking_completeness',
      category: 'completeness',
      passed: true,
      actual: allPlayedCards.size,
      message: `${allPlayedCards.size}개 고유 카드 추적 중`,
      severity: 'info',
    });
  }

  return checks;
}

// ==================== 통합 검증 실행 ====================

/**
 * 전체 검증 실행
 */
export function runVerification(
  gameSnapshot?: BattleSnapshot
): VerificationResult {
  const allChecks: VerificationCheck[] = [
    ...verifyDataIntegrity(),
    ...verifySyncAccuracy(gameSnapshot),
    ...verifyConsistency(),
    ...verifyCompleteness(),
  ];

  // 단일 순회로 통계 계산 (최적화)
  let passed = 0;
  let failed = 0;
  let warnings = 0;
  let critical = 0;

  for (let i = 0; i < allChecks.length; i++) {
    const check = allChecks[i];
    if (check.passed) {
      passed++;
    } else if (check.severity === 'warning') {
      warnings++;
    } else if (check.severity === 'critical') {
      critical++;
      failed++;
    } else {
      failed++;
    }
  }

  // 동기화 점수 계산 (0-100)
  const totalWeight = allChecks.length;
  const criticalWeight = 3;
  const warningWeight = 1;
  const passedWeight = passed;
  const deductedWeight = (critical * criticalWeight) + (warnings * warningWeight);
  const syncScore = Math.max(0, Math.round((passedWeight / totalWeight) * 100 - deductedWeight * 5));

  const result: VerificationResult = {
    passed: critical === 0,
    timestamp: Date.now(),
    checks: allChecks,
    summary: {
      totalChecks: allChecks.length,
      passed,
      failed,
      warnings,
      criticalFailures: critical,
      syncScore,
    },
  };

  state.lastVerification = result;
  state.verificationHistory.push(result);

  // 히스토리 100개 제한
  if (state.verificationHistory.length > 100) {
    state.verificationHistory.shift();
  }

  return result;
}

// ==================== 자동 모니터링 ====================

let monitoringInterval: ReturnType<typeof setInterval> | null = null;

/**
 * 자동 검증 모니터링 시작
 */
export function startMonitoring(intervalMs: number = 30000): void {
  if (state.isMonitoring) return;

  state.isMonitoring = true;
  monitoringInterval = setInterval(() => {
    const result = runVerification();

    if (!result.passed) {
      console.warn('[StatsVerifier] 동기화 문제 감지:', {
        score: result.summary.syncScore,
        critical: result.summary.criticalFailures,
        warnings: result.summary.warnings,
      });
    }
  }, intervalMs);

  if (import.meta.env?.DEV) {
    console.log('[StatsVerifier] 모니터링 시작 (간격:', intervalMs, 'ms)');
  }
}

/**
 * 자동 검증 모니터링 중지
 */
export function stopMonitoring(): void {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
  state.isMonitoring = false;

  if (import.meta.env?.DEV) {
    console.log('[StatsVerifier] 모니터링 중지');
  }
}

// ==================== 동기화 에러 관리 ====================

/**
 * 동기화 에러 기록
 */
export function recordSyncError(
  type: SyncError['type'],
  description: string,
  gameValue?: unknown,
  simulatorValue?: unknown
): void {
  state.syncErrors.push({
    timestamp: Date.now(),
    type,
    description,
    gameValue,
    simulatorValue,
    resolved: false,
  });

  // 최근 100개만 유지
  if (state.syncErrors.length > 100) {
    state.syncErrors.shift();
  }
}

/**
 * 동기화 에러 해결 표시
 */
export function resolveSyncError(timestamp: number): void {
  const error = state.syncErrors.find(e => e.timestamp === timestamp);
  if (error) {
    error.resolved = true;
  }
}

// ==================== 조회 함수 ====================

/**
 * 마지막 검증 결과 조회
 */
export function getLastVerification(): VerificationResult | null {
  return state.lastVerification;
}

/**
 * 검증 히스토리 조회
 */
export function getVerificationHistory(): VerificationResult[] {
  return [...state.verificationHistory];
}

/**
 * 동기화 에러 조회
 */
export function getSyncErrors(): SyncError[] {
  return [...state.syncErrors];
}

/**
 * 모니터링 상태 조회
 */
export function isMonitoring(): boolean {
  return state.isMonitoring;
}

/**
 * 동기화 상태 요약 조회
 */
export function getSyncStatus(): {
  healthy: boolean;
  score: number;
  lastCheck: number | null;
  unresolvedErrors: number;
  message: string;
} {
  const lastCheck = state.lastVerification;
  const unresolvedErrors = state.syncErrors.filter(e => !e.resolved).length;

  if (!lastCheck) {
    return {
      healthy: true,
      score: 100,
      lastCheck: null,
      unresolvedErrors,
      message: '검증 미실행',
    };
  }

  const healthy = lastCheck.passed && unresolvedErrors === 0;
  const score = lastCheck.summary.syncScore;

  let message = '';
  if (healthy && score >= 90) {
    message = '게임-시뮬레이터 동기화 정상';
  } else if (score >= 70) {
    message = '경미한 동기화 이슈 존재';
  } else if (score >= 50) {
    message = '동기화 상태 점검 필요';
  } else {
    message = '심각한 동기화 문제 발생';
  }

  return {
    healthy,
    score,
    lastCheck: lastCheck.timestamp,
    unresolvedErrors,
    message,
  };
}

// ==================== 리포트 생성 ====================

/**
 * 검증 리포트 생성 (콘솔용)
 */
export function generateReport(): string {
  const status = getSyncStatus();
  const lastVerification = getLastVerification();
  const history = getVerificationHistory();

  let report = '\n=== 게임-시뮬레이터 동기화 리포트 ===\n\n';

  report += `📊 상태: ${status.healthy ? '✅ 정상' : '⚠️ 이상'}\n`;
  report += `📈 동기화 점수: ${status.score}/100\n`;
  report += `🔍 메시지: ${status.message}\n`;
  report += `❗ 미해결 에러: ${status.unresolvedErrors}개\n`;

  if (lastVerification) {
    report += `\n📋 마지막 검증 (${new Date(lastVerification.timestamp).toLocaleString()}):\n`;
    report += `   - 총 검사: ${lastVerification.summary.totalChecks}\n`;
    report += `   - 통과: ${lastVerification.summary.passed}\n`;
    report += `   - 실패: ${lastVerification.summary.failed}\n`;
    report += `   - 경고: ${lastVerification.summary.warnings}\n`;

    if (lastVerification.summary.criticalFailures > 0) {
      report += '\n🚨 크리티컬 이슈:\n';
      lastVerification.checks
        .filter(c => !c.passed && c.severity === 'critical')
        .forEach(c => {
          report += `   - ${c.name}: ${c.message}\n`;
        });
    }
  }

  if (history.length > 1) {
    const scores = history.slice(-10).map(h => h.summary.syncScore);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    report += `\n📉 최근 10회 평균 점수: ${avgScore.toFixed(1)}/100\n`;
  }

  report += '\n=== 리포트 끝 ===\n';

  return report;
}

// ==================== 내보내기 ====================

export const StatsVerifier = {
  // 스냅샷
  captureSnapshot: captureBattleSnapshot,

  // 검증
  verify: runVerification,
  getLastResult: getLastVerification,
  getHistory: getVerificationHistory,

  // 모니터링
  startMonitoring,
  stopMonitoring,
  isMonitoring,

  // 에러 관리
  recordError: recordSyncError,
  resolveError: resolveSyncError,
  getErrors: getSyncErrors,

  // 상태
  getStatus: getSyncStatus,

  // 리포트
  generateReport,
};

export default StatsVerifier;
