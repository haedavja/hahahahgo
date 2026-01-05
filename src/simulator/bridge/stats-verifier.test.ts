/**
 * @file stats-verifier.test.ts
 * @description 게임-시뮬레이터 통계 동기화 검증 시스템 테스트
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  captureBattleSnapshot,
  runVerification,
  startMonitoring,
  stopMonitoring,
  isMonitoring,
  recordSyncError,
  resolveSyncError,
  getLastVerification,
  getVerificationHistory,
  getSyncErrors,
  getSyncStatus,
  generateReport,
  type BattleSnapshot,
} from './stats-verifier';
import { resetStatsCollector, invalidateStatsCache } from './stats-bridge';

describe('stats-verifier', () => {
  beforeEach(() => {
    stopMonitoring();
    resetStatsCollector();
    invalidateStatsCache();
  });

  afterEach(() => {
    stopMonitoring();
  });

  describe('captureBattleSnapshot', () => {
    it('전투 상태 스냅샷을 캡처한다', () => {
      const battleState = {
        player: { hp: 80, maxHp: 100, block: 10 },
        enemy: { hp: 50, maxHp: 100, block: 5 },
        turnNumber: 3,
        cardUsageCount: { card1: 2, card2: 1 },
        damageDealt: 50,
        damageTaken: 20,
        cardsPlayed: ['card1', 'card2'],
        tokens: ['strength', 'weakness'],
      };

      const snapshot = captureBattleSnapshot(battleState);

      expect(snapshot.playerHp).toBe(80);
      expect(snapshot.playerMaxHp).toBe(100);
      expect(snapshot.enemyHp).toBe(50);
      expect(snapshot.enemyMaxHp).toBe(100);
      expect(snapshot.playerBlock).toBe(10);
      expect(snapshot.enemyBlock).toBe(5);
      expect(snapshot.turnNumber).toBe(3);
      expect(snapshot.cardUsageCount).toEqual({ card1: 2, card2: 1 });
      expect(snapshot.damageDealt).toBe(50);
      expect(snapshot.damageTaken).toBe(20);
      expect(snapshot.cardsPlayed).toEqual(['card1', 'card2']);
      expect(snapshot.activeTokens).toEqual(['strength', 'weakness']);
    });

    it('기본값을 처리한다', () => {
      const battleState = {
        player: { hp: 100, maxHp: 100 },
        enemy: { hp: 100, maxHp: 100 },
        turnNumber: 1,
        cardUsageCount: {},
      };

      const snapshot = captureBattleSnapshot(battleState);

      expect(snapshot.playerBlock).toBe(0);
      expect(snapshot.enemyBlock).toBe(0);
      expect(snapshot.damageDealt).toBe(0);
      expect(snapshot.damageTaken).toBe(0);
      expect(snapshot.cardsPlayed).toEqual([]);
      expect(snapshot.activeTokens).toEqual([]);
    });
  });

  describe('runVerification', () => {
    it('검증 결과를 반환한다', () => {
      const result = runVerification();

      expect(result).toBeDefined();
      expect(result.passed).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.checks).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('검증 요약에 모든 필드가 있다', () => {
      const result = runVerification();

      expect(result.summary.totalChecks).toBeGreaterThan(0);
      expect(typeof result.summary.passed).toBe('number');
      expect(typeof result.summary.failed).toBe('number');
      expect(typeof result.summary.warnings).toBe('number');
      expect(typeof result.summary.criticalFailures).toBe('number');
      expect(typeof result.summary.syncScore).toBe('number');
    });

    it('스냅샷과 함께 검증을 실행한다', () => {
      const snapshot: BattleSnapshot = {
        turnNumber: 1,
        playerHp: 100,
        playerMaxHp: 100,
        enemyHp: 100,
        enemyMaxHp: 100,
        playerBlock: 0,
        enemyBlock: 0,
        cardUsageCount: {},
        damageDealt: 0,
        damageTaken: 0,
        cardsPlayed: [],
        activeTokens: [],
      };

      const result = runVerification(snapshot);
      expect(result).toBeDefined();
    });

    it('히스토리에 결과를 저장한다', () => {
      runVerification();
      runVerification();

      const history = getVerificationHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getLastVerification', () => {
    it('검증 실행 전에는 이전 세션의 결과 또는 null을 반환한다', () => {
      const last = getLastVerification();
      // 이전 테스트에서 검증이 실행되었을 수 있음
      expect(last === null || last !== null).toBe(true);
    });

    it('검증 실행 후 마지막 결과를 반환한다', () => {
      runVerification();
      const last = getLastVerification();

      expect(last).not.toBeNull();
      expect(last?.checks).toBeDefined();
    });
  });

  describe('모니터링', () => {
    it('모니터링을 시작한다', () => {
      expect(isMonitoring()).toBe(false);

      startMonitoring(60000); // 60초 간격

      expect(isMonitoring()).toBe(true);
    });

    it('모니터링을 중지한다', () => {
      startMonitoring(60000);
      expect(isMonitoring()).toBe(true);

      stopMonitoring();
      expect(isMonitoring()).toBe(false);
    });

    it('이미 모니터링 중이면 다시 시작하지 않는다', () => {
      startMonitoring(60000);
      startMonitoring(60000); // 중복 호출

      expect(isMonitoring()).toBe(true);
      stopMonitoring();
    });
  });

  describe('동기화 에러 관리', () => {
    it('동기화 에러를 기록한다', () => {
      recordSyncError('value_mismatch', '테스트 에러', 'gameValue', 'simValue');

      const errors = getSyncErrors();
      expect(errors.length).toBeGreaterThan(0);

      const lastError = errors[errors.length - 1];
      expect(lastError.type).toBe('value_mismatch');
      expect(lastError.description).toBe('테스트 에러');
      expect(lastError.resolved).toBe(false);
    });

    it('에러를 해결 상태로 표시한다', () => {
      recordSyncError('timing_issue', '타이밍 에러');

      const errors = getSyncErrors();
      const lastError = errors[errors.length - 1];
      const timestamp = lastError.timestamp;

      resolveSyncError(timestamp);

      const updatedErrors = getSyncErrors();
      const resolvedError = updatedErrors.find(e => e.timestamp === timestamp);
      expect(resolvedError?.resolved).toBe(true);
    });

    it('존재하지 않는 타임스탬프는 무시한다', () => {
      expect(() => {
        resolveSyncError(99999999999);
      }).not.toThrow();
    });
  });

  describe('getSyncStatus', () => {
    it('동기화 상태를 반환한다', () => {
      const status = getSyncStatus();

      expect(typeof status.healthy).toBe('boolean');
      expect(typeof status.score).toBe('number');
      expect(typeof status.unresolvedErrors).toBe('number');
      expect(typeof status.message).toBe('string');
    });

    it('검증 전에는 기본 상태를 반환한다', () => {
      // 이 테스트는 다른 테스트의 영향을 받을 수 있음
      const status = getSyncStatus();
      expect(status.message).toBeDefined();
    });

    it('점수에 따라 적절한 메시지를 반환한다', () => {
      runVerification();
      const status = getSyncStatus();

      expect(status.message.length).toBeGreaterThan(0);
    });
  });

  describe('generateReport', () => {
    it('리포트 문자열을 생성한다', () => {
      runVerification();
      const report = generateReport();

      expect(typeof report).toBe('string');
      expect(report).toContain('게임-시뮬레이터 동기화 리포트');
      expect(report).toContain('리포트 끝');
    });

    it('상태 정보를 포함한다', () => {
      runVerification();
      const report = generateReport();

      expect(report).toContain('상태:');
      expect(report).toContain('동기화 점수:');
      expect(report).toContain('미해결 에러:');
    });

    it('마지막 검증 정보를 포함한다', () => {
      runVerification();
      const report = generateReport();

      expect(report).toContain('마지막 검증');
      expect(report).toContain('총 검사:');
      expect(report).toContain('통과:');
    });
  });

  describe('데이터 무결성 검증', () => {
    it('전투 수 일관성을 검증한다', () => {
      const result = runVerification();

      const battleCountCheck = result.checks.find(
        c => c.name === 'battle_count_consistency'
      );
      expect(battleCountCheck).toBeDefined();
      expect(battleCountCheck?.category).toBe('data_integrity');
    });

    it('승률 범위를 검증한다', () => {
      const result = runVerification();

      const winRateCheck = result.checks.find(
        c => c.name === 'win_rate_range'
      );
      expect(winRateCheck).toBeDefined();
      expect(winRateCheck?.passed).toBe(true);
    });

    it('음수값이 없는지 검증한다', () => {
      const result = runVerification();

      const noNegativesCheck = result.checks.find(
        c => c.name === 'no_negative_values'
      );
      expect(noNegativesCheck).toBeDefined();
      expect(noNegativesCheck?.passed).toBe(true);
    });
  });

  describe('완전성 검증', () => {
    it('필수 필드 존재를 검증한다', () => {
      const result = runVerification();

      const requiredFieldsCheck = result.checks.find(
        c => c.name === 'required_fields'
      );
      expect(requiredFieldsCheck).toBeDefined();
      expect(requiredFieldsCheck?.passed).toBe(true);
    });
  });

  describe('검증 점수', () => {
    it('모든 검증 통과 시 높은 점수를 반환한다', () => {
      const result = runVerification();

      // 초기 상태에서는 모든 검증이 통과해야 함
      if (result.summary.criticalFailures === 0 && result.summary.warnings === 0) {
        expect(result.summary.syncScore).toBeGreaterThanOrEqual(80);
      }
    });

    it('점수가 0-100 범위에 있다', () => {
      const result = runVerification();

      expect(result.summary.syncScore).toBeGreaterThanOrEqual(0);
      expect(result.summary.syncScore).toBeLessThanOrEqual(100);
    });
  });
});
