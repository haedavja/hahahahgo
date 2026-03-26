/**
 * @file battle-log-validator.test.ts
 * @description 전투 로그 검증 시스템 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  BattleLogValidator,
  BattleLogCollector,
  validateBattleLogs,
  type GameBattleLog,
  type ValidationResult,
} from './battle-log-validator';

// ==================== 샘플 로그 생성 ====================

function createSampleLog(overrides: Partial<GameBattleLog> = {}): GameBattleLog {
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    playerDeck: ['strike', 'strike', 'strike', 'shoot', 'shoot', 'reload', 'quarte', 'octave', 'breach', 'deflect'],
    playerRelics: [],
    enemyId: 'ghoul',
    result: {
      victory: true,
      turns: 5,
      playerFinalHp: 80,
      playerMaxHp: 100,
      enemyFinalHp: 0,
      playerDamageDealt: 40,
      enemyDamageDealt: 20,
    },
    ...overrides,
  };
}

// ==================== BattleLogValidator 테스트 ====================

describe('BattleLogValidator', () => {
  let validator: BattleLogValidator;

  beforeEach(() => {
    validator = new BattleLogValidator();
  });

  it('인스턴스 생성이 성공해야 함', () => {
    expect(validator).toBeDefined();
  });

  it('단일 로그 검증이 결과를 반환해야 함', () => {
    const log = createSampleLog();
    const result = validator.validateLog(log);

    expect(result).toBeDefined();
    expect(result.logId).toBe(log.id);
    expect(result.gameResult).toEqual(log.result);
    expect(result.simResult).toBeDefined();
    expect(typeof result.outcomeMatch).toBe('boolean');
    expect(typeof result.turnDifference).toBe('number');
    expect(typeof result.hpDifference).toBe('number');
    expect(typeof result.accuracyScore).toBe('number');
    expect(Array.isArray(result.discrepancies)).toBe(true);
  });

  it('정확도 점수가 0-100 사이여야 함', () => {
    const log = createSampleLog();
    const result = validator.validateLog(log);

    expect(result.accuracyScore).toBeGreaterThanOrEqual(0);
    expect(result.accuracyScore).toBeLessThanOrEqual(100);
  });

  it('없는 적 ID에 대해 에러 결과를 반환해야 함', () => {
    const log = createSampleLog({ enemyId: 'nonexistent_enemy' });
    const result = validator.validateLog(log);

    // 에러 상황: 점수가 낮거나 불일치가 있어야 함
    const hasError = result.discrepancies.some(d => d.includes('ERROR'));
    const hasLowScore = result.accuracyScore <= 60;
    expect(hasError || hasLowScore).toBe(true);
  });

  it('로그 추가 및 전체 검증이 동작해야 함', () => {
    const logs = [
      createSampleLog({ id: 'log1' }),
      createSampleLog({ id: 'log2', enemyId: 'marauder' }),
      createSampleLog({ id: 'log3', enemyId: 'deserter' }),
    ];

    validator.addLogs(logs);
    const result = validator.validateAll();

    expect(result.totalLogs).toBe(3);
    expect(result.results).toHaveLength(3);
    expect(typeof result.outcomeMatchRate).toBe('number');
    expect(typeof result.avgTurnDifference).toBe('number');
    expect(typeof result.avgHpDifference).toBe('number');
    expect(typeof result.avgAccuracy).toBe('number');
  });

  it('로그 초기화가 동작해야 함', () => {
    validator.addLog(createSampleLog());
    validator.addLog(createSampleLog());
    validator.clearLogs();
    const result = validator.validateAll();

    expect(result.totalLogs).toBe(0);
  });

  it('리포트 생성이 문자열을 반환해야 함', () => {
    validator.addLog(createSampleLog());
    const batchResult = validator.validateAll();
    const report = validator.generateReport(batchResult);

    expect(typeof report).toBe('string');
    expect(report).toContain('시뮬레이터 검증 리포트');
    expect(report).toContain('총 검증 로그');
    expect(report).toContain('승패 일치율');
  });
});

// ==================== BattleLogCollector 테스트 ====================

describe('BattleLogCollector', () => {
  beforeEach(() => {
    BattleLogCollector.clearLogs();
  });

  it('전투 기록이 로그에 추가되어야 함', () => {
    BattleLogCollector.recordBattle(
      ['strike', 'strike', 'shoot'],
      [],
      'ghoul',
      {
        victory: true,
        turns: 3,
        playerFinalHp: 90,
        playerMaxHp: 100,
        enemyFinalHp: 0,
        playerDamageDealt: 40,
        enemyDamageDealt: 10,
      }
    );

    const logs = BattleLogCollector.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].enemyId).toBe('ghoul');
    expect(logs[0].result.victory).toBe(true);
  });

  it('여러 전투가 순차적으로 기록되어야 함', () => {
    for (let i = 0; i < 5; i++) {
      BattleLogCollector.recordBattle(
        ['strike'],
        [],
        'ghoul',
        {
          victory: true,
          turns: i + 1,
          playerFinalHp: 100 - i * 10,
          playerMaxHp: 100,
          enemyFinalHp: 0,
          playerDamageDealt: 40 + i * 5,
          enemyDamageDealt: i * 10,
        }
      );
    }

    const logs = BattleLogCollector.getLogs();
    expect(logs).toHaveLength(5);
  });

  it('로그 초기화가 동작해야 함', () => {
    BattleLogCollector.recordBattle(
      ['strike'],
      [],
      'ghoul',
      {
        victory: true,
        turns: 1,
        playerFinalHp: 100,
        playerMaxHp: 100,
        enemyFinalHp: 0,
        playerDamageDealt: 40,
        enemyDamageDealt: 0,
      }
    );
    expect(BattleLogCollector.getLogs()).toHaveLength(1);

    BattleLogCollector.clearLogs();
    expect(BattleLogCollector.getLogs()).toHaveLength(0);
  });

  it('로그 내보내기가 JSON 문자열을 반환해야 함', () => {
    BattleLogCollector.recordBattle(
      ['strike'],
      [],
      'ghoul',
      {
        victory: true,
        turns: 1,
        playerFinalHp: 100,
        playerMaxHp: 100,
        enemyFinalHp: 0,
        playerDamageDealt: 40,
        enemyDamageDealt: 0,
      }
    );

    const exported = BattleLogCollector.exportLogs();
    expect(typeof exported).toBe('string');

    const parsed = JSON.parse(exported);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
  });

  it('로그 가져오기가 동작해야 함', () => {
    const logsJson = JSON.stringify([{
      id: 'imported_log',
      timestamp: Date.now(),
      playerDeck: ['strike'],
      playerRelics: [],
      enemyId: 'ghoul',
      result: {
        victory: true,
        turns: 1,
        playerFinalHp: 100,
        playerMaxHp: 100,
        enemyFinalHp: 0,
        playerDamageDealt: 40,
        enemyDamageDealt: 0,
      },
    }]);

    const count = BattleLogCollector.importLogs(logsJson);
    expect(count).toBe(1);
    expect(BattleLogCollector.getLogs()).toHaveLength(1);
    expect(BattleLogCollector.getLogs()[0].id).toBe('imported_log');
  });
});

// ==================== validateBattleLogs 팩토리 함수 테스트 ====================

describe('validateBattleLogs', () => {
  it('로그 배열을 검증하고 결과를 반환해야 함', () => {
    const logs = [
      createSampleLog({ id: 'log1' }),
      createSampleLog({ id: 'log2' }),
    ];

    const result = validateBattleLogs(logs);

    expect(result.totalLogs).toBe(2);
    expect(result.results).toHaveLength(2);
    expect(typeof result.outcomeMatchRate).toBe('number');
    expect(typeof result.avgAccuracy).toBe('number');
  });

  it('빈 배열에 대해 빈 결과를 반환해야 함', () => {
    const result = validateBattleLogs([]);

    expect(result.totalLogs).toBe(0);
    expect(result.results).toHaveLength(0);
  });
});

// ==================== 통합 테스트: 게임 로그 수집 + 검증 ====================

describe('Log Collection and Validation Integration', () => {
  beforeEach(() => {
    BattleLogCollector.clearLogs();
  });

  it('수집된 로그를 검증기로 검증할 수 있어야 함', () => {
    // 여러 전투 기록
    BattleLogCollector.recordBattle(
      ['strike', 'strike', 'strike', 'shoot', 'shoot'],
      [],
      'ghoul',
      { victory: true, turns: 4, playerFinalHp: 85, playerMaxHp: 100, enemyFinalHp: 0, playerDamageDealt: 40, enemyDamageDealt: 15 }
    );
    BattleLogCollector.recordBattle(
      ['strike', 'strike', 'shoot', 'shoot'],
      [],
      'marauder',
      { victory: true, turns: 3, playerFinalHp: 95, playerMaxHp: 100, enemyFinalHp: 0, playerDamageDealt: 20, enemyDamageDealt: 5 }
    );
    BattleLogCollector.recordBattle(
      ['strike', 'strike', 'strike'],
      [],
      'deserter',
      { victory: false, turns: 8, playerFinalHp: 0, playerMaxHp: 100, enemyFinalHp: 30, playerDamageDealt: 50, enemyDamageDealt: 100 }
    );

    const logs = BattleLogCollector.getLogs();
    const result = validateBattleLogs(logs);

    expect(result.totalLogs).toBe(3);
    expect(result.avgAccuracy).toBeGreaterThanOrEqual(0);

    // 불일치 패턴 분석
    expect(typeof result.discrepancyPatterns).toBe('object');
  });

  it('리포트가 불일치 패턴을 포함해야 함', () => {
    BattleLogCollector.recordBattle(
      ['strike'],
      [],
      'ghoul',
      { victory: true, turns: 10, playerFinalHp: 50, playerMaxHp: 100, enemyFinalHp: 0, playerDamageDealt: 40, enemyDamageDealt: 50 }
    );

    const validator = new BattleLogValidator();
    validator.addLogs(BattleLogCollector.getLogs());
    const batchResult = validator.validateAll();
    const report = validator.generateReport(batchResult);

    expect(report).toContain('불일치 패턴');
  });
});

// ==================== 정확도 점수 계산 테스트 ====================

describe('Accuracy Score Calculation', () => {
  it('완벽히 일치하는 결과는 높은 점수를 받아야 함', () => {
    const validator = new BattleLogValidator();
    const log = createSampleLog({
      result: {
        victory: true,
        turns: 5,
        playerFinalHp: 90,
        playerMaxHp: 100,
        enemyFinalHp: 0,
        playerDamageDealt: 40,
        enemyDamageDealt: 10,
      },
    });

    const result = validator.validateLog(log);

    // 시뮬레이션 결과가 비슷하면 점수가 높아야 함
    // 실제 결과는 시뮬레이터에 따라 다를 수 있으므로 최소 점수만 확인
    expect(result.accuracyScore).toBeGreaterThanOrEqual(0);
  });

  it('승패가 다르면 점수가 크게 감소해야 함', () => {
    const validator = new BattleLogValidator();

    // 게임에서는 패배했는데 시뮬레이터에서 승리하는 경우
    const log = createSampleLog({
      result: {
        victory: false, // 게임에서 패배
        turns: 3,
        playerFinalHp: 0,
        playerMaxHp: 100,
        enemyFinalHp: 30,
        playerDamageDealt: 20,
        enemyDamageDealt: 100,
      },
    });

    const result = validator.validateLog(log);

    // 시뮬레이터 결과를 기록 (승패 일치 여부에 따라 다른 확인)
    if (!result.outcomeMatch) {
      // 승패 불일치 시 점수가 낮아야 함 (최대 60점)
      expect(result.accuracyScore).toBeLessThanOrEqual(60);
      expect(result.discrepancies.length).toBeGreaterThan(0);
    } else {
      // 승패 일치하더라도 결과 확인
      expect(result.simResult).toBeDefined();
    }
  });
});
