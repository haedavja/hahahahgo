/**
 * @file battle-log-validator.ts
 * @description 실제 게임 로그와 시뮬레이터 결과 비교/검증 시스템
 *
 * 게임에서 수집한 전투 로그를 시뮬레이터 결과와 비교하여
 * 시뮬레이터의 정확도를 측정하고 차이점을 식별합니다.
 */

import { TimelineBattleEngine } from '../core/timeline-battle-engine';
import type { EnemyState, BattleResult } from '../core/game-types';
import { syncAllEnemies } from '../data/game-data-sync';

// ==================== 타입 정의 ====================

/** 게임에서 수집된 전투 로그 */
export interface GameBattleLog {
  /** 로그 ID */
  id: string;
  /** 타임스탬프 */
  timestamp: number;
  /** 플레이어 덱 */
  playerDeck: string[];
  /** 플레이어 상징 */
  playerRelics: string[];
  /** 적 ID */
  enemyId: string;
  /** 이변 ID */
  anomalyId?: string;
  /** 카드 강화 */
  cardEnhancements?: Record<string, number>;
  /** 결과 */
  result: {
    victory: boolean;
    turns: number;
    playerFinalHp: number;
    playerMaxHp: number;
    enemyFinalHp: number;
    playerDamageDealt: number;
    enemyDamageDealt: number;
  };
  /** 턴별 액션 기록 */
  turnActions?: TurnAction[];
}

/** 턴별 액션 */
export interface TurnAction {
  turn: number;
  phase: 'select' | 'respond' | 'resolve';
  playerCards: string[];
  enemyCards: string[];
  playerHpBefore: number;
  playerHpAfter: number;
  enemyHpBefore: number;
  enemyHpAfter: number;
}

/** 검증 결과 */
export interface ValidationResult {
  /** 로그 ID */
  logId: string;
  /** 게임 결과 */
  gameResult: GameBattleLog['result'];
  /** 시뮬레이터 결과 */
  simResult: BattleResult;
  /** 승패 일치 여부 */
  outcomeMatch: boolean;
  /** 턴 수 차이 */
  turnDifference: number;
  /** HP 차이 */
  hpDifference: number;
  /** 피해량 차이 */
  damageDifference: number;
  /** 정확도 점수 (0-100) */
  accuracyScore: number;
  /** 불일치 사항 */
  discrepancies: string[];
}

/** 배치 검증 결과 */
export interface BatchValidationResult {
  /** 총 검증 수 */
  totalLogs: number;
  /** 승패 일치 수 */
  outcomeMatches: number;
  /** 승패 일치율 */
  outcomeMatchRate: number;
  /** 평균 턴 차이 */
  avgTurnDifference: number;
  /** 평균 HP 차이 */
  avgHpDifference: number;
  /** 평균 정확도 */
  avgAccuracy: number;
  /** 개별 결과 */
  results: ValidationResult[];
  /** 주요 불일치 패턴 */
  discrepancyPatterns: Record<string, number>;
}

// ==================== 검증기 ====================

export class BattleLogValidator {
  private engine: TimelineBattleEngine;
  private enemies: Record<string, any>;
  private logs: GameBattleLog[] = [];

  constructor() {
    this.engine = new TimelineBattleEngine();
    this.enemies = syncAllEnemies();
  }

  /**
   * 로그 추가
   */
  addLog(log: GameBattleLog): void {
    this.logs.push(log);
  }

  /**
   * 로그 배열 추가
   */
  addLogs(logs: GameBattleLog[]): void {
    this.logs.push(...logs);
  }

  /**
   * 로그 초기화
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * 단일 로그 검증
   */
  validateLog(log: GameBattleLog): ValidationResult {
    const enemy = this.enemies[log.enemyId];
    if (!enemy) {
      return this.createErrorResult(log, `Enemy not found: ${log.enemyId}`);
    }

    const enemyState: EnemyState = {
      id: enemy.id,
      name: enemy.name,
      hp: enemy.hp,
      maxHp: enemy.maxHp || enemy.hp,
      ether: enemy.ether || 0,
      speed: enemy.speed || 10,
      maxSpeed: enemy.maxSpeed || 30,
      deck: [...enemy.deck],
      cardsPerTurn: enemy.cardsPerTurn || 1,
      emoji: enemy.emoji,
      isBoss: enemy.isBoss,
      passives: enemy.passives,
      block: 0,
      tokens: {},
    } as EnemyState;

    // 시뮬레이션 실행
    const simResult = this.engine.runBattle(
      log.playerDeck,
      log.playerRelics,
      enemyState,
      log.anomalyId,
      log.cardEnhancements
    );

    // 비교
    const outcomeMatch = log.result.victory === simResult.victory;
    const turnDifference = Math.abs(log.result.turns - simResult.turns);
    const hpDifference = Math.abs(log.result.playerFinalHp - simResult.playerFinalHp);
    const damageDifference = Math.abs(log.result.playerDamageDealt - simResult.playerDamageDealt);

    // 불일치 사항 분석
    const discrepancies: string[] = [];
    if (!outcomeMatch) {
      discrepancies.push(`승패 불일치: 게임=${log.result.victory ? '승' : '패'}, 시뮬=${simResult.victory ? '승' : '패'}`);
    }
    if (turnDifference > 3) {
      discrepancies.push(`턴 수 차이: ${turnDifference}턴`);
    }
    if (hpDifference > log.result.playerMaxHp * 0.2) {
      discrepancies.push(`HP 차이: ${hpDifference}`);
    }
    if (damageDifference > 20) {
      discrepancies.push(`피해량 차이: ${damageDifference}`);
    }

    // 정확도 점수 계산
    const accuracyScore = this.calculateAccuracyScore(
      outcomeMatch,
      turnDifference,
      hpDifference,
      damageDifference,
      log.result
    );

    return {
      logId: log.id,
      gameResult: log.result,
      simResult,
      outcomeMatch,
      turnDifference,
      hpDifference,
      damageDifference,
      accuracyScore,
      discrepancies,
    };
  }

  /**
   * 모든 로그 검증
   */
  validateAll(): BatchValidationResult {
    const results: ValidationResult[] = [];
    let outcomeMatches = 0;
    let totalTurnDiff = 0;
    let totalHpDiff = 0;
    let totalAccuracy = 0;
    const discrepancyPatterns: Record<string, number> = {};

    for (const log of this.logs) {
      const result = this.validateLog(log);
      results.push(result);

      if (result.outcomeMatch) outcomeMatches++;
      totalTurnDiff += result.turnDifference;
      totalHpDiff += result.hpDifference;
      totalAccuracy += result.accuracyScore;

      // 불일치 패턴 수집
      for (const disc of result.discrepancies) {
        const pattern = disc.split(':')[0];
        discrepancyPatterns[pattern] = (discrepancyPatterns[pattern] || 0) + 1;
      }
    }

    const total = this.logs.length || 1;

    return {
      totalLogs: this.logs.length,
      outcomeMatches,
      outcomeMatchRate: outcomeMatches / total,
      avgTurnDifference: totalTurnDiff / total,
      avgHpDifference: totalHpDiff / total,
      avgAccuracy: totalAccuracy / total,
      results,
      discrepancyPatterns,
    };
  }

  /**
   * 정확도 점수 계산
   */
  private calculateAccuracyScore(
    outcomeMatch: boolean,
    turnDiff: number,
    hpDiff: number,
    damageDiff: number,
    gameResult: GameBattleLog['result']
  ): number {
    let score = 100;

    // 승패 불일치: -40점
    if (!outcomeMatch) {
      score -= 40;
    }

    // 턴 차이: 턴당 -5점 (최대 -20점)
    score -= Math.min(turnDiff * 5, 20);

    // HP 차이: 최대 HP 대비 비율로 감점 (최대 -20점)
    const hpRatio = hpDiff / (gameResult.playerMaxHp || 100);
    score -= Math.min(hpRatio * 100, 20);

    // 피해량 차이: (최대 -20점)
    const damageRatio = damageDiff / (gameResult.playerDamageDealt || 100);
    score -= Math.min(damageRatio * 50, 20);

    return Math.max(0, score);
  }

  /**
   * 에러 결과 생성
   */
  private createErrorResult(log: GameBattleLog, error: string): ValidationResult {
    return {
      logId: log.id,
      gameResult: log.result,
      simResult: {
        winner: 'enemy' as const,
        victory: false,
        turns: 0,
        playerFinalHp: 0,
        enemyFinalHp: 0,
        playerDamageDealt: 0,
        enemyDamageDealt: 0,
        etherGained: 0,
        goldChange: 0,
        battleLog: [],
        cardUsage: {},
        comboStats: {},
        tokenStats: {},
        timeline: [],
        events: [],
      },
      outcomeMatch: false,
      turnDifference: log.result.turns,
      hpDifference: log.result.playerFinalHp,
      damageDifference: log.result.playerDamageDealt,
      accuracyScore: 0,
      discrepancies: [`ERROR: ${error}`],
    };
  }

  /**
   * 리포트 생성
   */
  generateReport(result: BatchValidationResult): string {
    const lines: string[] = [
      '='.repeat(60),
      '시뮬레이터 검증 리포트',
      '='.repeat(60),
      '',
      `총 검증 로그: ${result.totalLogs}개`,
      `승패 일치율: ${(result.outcomeMatchRate * 100).toFixed(1)}%`,
      `평균 정확도: ${result.avgAccuracy.toFixed(1)}점`,
      `평균 턴 차이: ${result.avgTurnDifference.toFixed(1)}턴`,
      `평균 HP 차이: ${result.avgHpDifference.toFixed(1)}`,
      '',
      '-'.repeat(60),
      '불일치 패턴:',
      '-'.repeat(60),
    ];

    for (const [pattern, count] of Object.entries(result.discrepancyPatterns)) {
      const rate = (count / result.totalLogs * 100).toFixed(1);
      lines.push(`  ${pattern}: ${count}건 (${rate}%)`);
    }

    lines.push('');
    lines.push('='.repeat(60));

    return lines.join('\n');
  }
}

// ==================== 로그 수집기 (게임 연동) ====================

/**
 * 게임에서 전투 로그 수집을 위한 인터페이스
 * 실제 게임 컴포넌트에서 호출하여 로그 저장
 */
export class BattleLogCollector {
  private static logs: GameBattleLog[] = [];
  private static maxLogs: number = 1000;
  private static storageKey = 'hahaha_battle_logs';

  /**
   * 전투 결과 기록
   */
  static recordBattle(
    playerDeck: string[],
    playerRelics: string[],
    enemyId: string,
    result: GameBattleLog['result'],
    anomalyId?: string,
    cardEnhancements?: Record<string, number>,
    turnActions?: TurnAction[]
  ): void {
    const log: GameBattleLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      playerDeck: [...playerDeck],
      playerRelics: [...playerRelics],
      enemyId,
      anomalyId,
      cardEnhancements,
      result,
      turnActions,
    };

    this.logs.push(log);

    // 최대 로그 수 제한
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // 로컬 스토리지에 저장 (선택적)
    this.saveToStorage();
  }

  /**
   * 로그 가져오기
   */
  static getLogs(): GameBattleLog[] {
    return [...this.logs];
  }

  /**
   * 로그 초기화
   */
  static clearLogs(): void {
    this.logs = [];
    this.saveToStorage();
  }

  /**
   * 로컬 스토리지에 저장
   */
  private static saveToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
      }
    } catch (e) {
      // 스토리지 에러 무시
    }
  }

  /**
   * 로컬 스토리지에서 로드
   */
  static loadFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          this.logs = JSON.parse(stored);
        }
      }
    } catch (e) {
      // 스토리지 에러 무시
    }
  }

  /**
   * 로그 내보내기 (JSON)
   */
  static exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * 로그 가져오기 (JSON)
   */
  static importLogs(json: string): number {
    try {
      const imported = JSON.parse(json) as GameBattleLog[];
      this.logs.push(...imported);
      return imported.length;
    } catch (e) {
      return 0;
    }
  }
}

// ==================== 팩토리 함수 ====================

/**
 * 검증기 인스턴스 생성
 */
export function createBattleLogValidator(): BattleLogValidator {
  return new BattleLogValidator();
}

/**
 * 빠른 검증 실행
 */
export function validateBattleLogs(logs: GameBattleLog[]): BatchValidationResult {
  const validator = new BattleLogValidator();
  validator.addLogs(logs);
  return validator.validateAll();
}
