/**
 * @file unified-battle-engine.ts
 * @description 통합 전투 엔진
 *
 * 단일 적/다중 적 전투를 하나의 인터페이스로 통합합니다.
 * - 단일 적: TimelineBattleEngine 사용 (최적화)
 * - 다중 적: MultiEnemyBattleEngine 사용
 */

import type {
  GameCard,
  EnemyState,
  BattleResult,
  PlayerState,
} from './game-types';
import { TimelineBattleEngine, type BattleEngineConfig } from './timeline-battle-engine';
import { MultiEnemyBattleEngine, type MultiEnemyBattleResult, type MultiEnemyBattleConfig } from './multi-enemy-battle-engine';
import { SkillLevelAI, type SkillLevel, type SkillLevelStats } from '../ai/skill-level-ai';
import { syncAllEnemies } from '../data/game-data-sync';

// ==================== 타입 정의 ====================

export interface UnifiedBattleConfig {
  /** 최대 속도 */
  maxSpeed: number;
  /** 최대 턴 */
  maxTurns: number;
  /** 크리티컬 활성화 */
  enableCrits: boolean;
  /** 콤보 활성화 */
  enableCombos: boolean;
  /** 상징 활성화 */
  enableRelics: boolean;
  /** 이변 활성화 */
  enableAnomalies: boolean;
  /** 상세 로그 */
  verbose: boolean;
  /** 플레이어 스킬 레벨 */
  skillLevel: SkillLevel;
  /** 맵 위험도 (0-4) */
  mapRisk: number;
}

export interface UnifiedBattleResult extends BattleResult {
  /** 멀티 적 전투 여부 */
  isMultiEnemy: boolean;
  /** 멀티 적 상세 결과 */
  multiEnemyDetails?: MultiEnemyBattleResult['enemyDetails'];
  /** 스킬 레벨 통계 */
  skillLevelStats?: SkillLevelStats;
  /** 실제 사용된 스킬 레벨 */
  skillLevel: SkillLevel;
}

export interface BatchBattleConfig extends UnifiedBattleConfig {
  /** 시뮬레이션 횟수 */
  simulations: number;
  /** 진행 콜백 */
  onProgress?: (current: number, total: number) => void;
}

export interface BatchBattleResult {
  /** 총 시뮬레이션 수 */
  totalSimulations: number;
  /** 승리 수 */
  wins: number;
  /** 승률 */
  winRate: number;
  /** 평균 턴 수 */
  avgTurns: number;
  /** 평균 남은 HP */
  avgPlayerHpRemaining: number;
  /** 평균 피해량 */
  avgDamageDealt: number;
  /** 스킬 레벨별 통계 */
  skillLevelStats?: SkillLevelStats;
  /** 개별 결과 */
  results: UnifiedBattleResult[];
}

const DEFAULT_CONFIG: UnifiedBattleConfig = {
  maxSpeed: 30,
  maxTurns: 30,
  enableCrits: true,
  enableCombos: true,
  enableRelics: true,
  enableAnomalies: true,
  verbose: false,
  skillLevel: 'optimal',
  mapRisk: 0,
};

// ==================== 통합 전투 엔진 ====================

export class UnifiedBattleEngine {
  private config: UnifiedBattleConfig;
  private singleEngine: TimelineBattleEngine;
  private multiEngine: MultiEnemyBattleEngine;
  private skillAI: SkillLevelAI;
  private enemies: Record<string, any>;

  constructor(config: Partial<UnifiedBattleConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.singleEngine = new TimelineBattleEngine({
      maxSpeed: this.config.maxSpeed,
      maxTurns: this.config.maxTurns,
      enableCrits: this.config.enableCrits,
      enableCombos: this.config.enableCombos,
      enableRelics: this.config.enableRelics,
      enableAnomalies: this.config.enableAnomalies,
      verbose: this.config.verbose,
      mapRisk: this.config.mapRisk,
    });

    this.multiEngine = new MultiEnemyBattleEngine({
      maxSpeed: this.config.maxSpeed,
      maxTurns: this.config.maxTurns,
      enableCrits: this.config.enableCrits,
      enableCombos: this.config.enableCombos,
      enableRelics: this.config.enableRelics,
      enableAnomalies: this.config.enableAnomalies,
      verbose: this.config.verbose,
    });

    this.skillAI = new SkillLevelAI(this.config.skillLevel);
    this.enemies = syncAllEnemies();
  }

  /**
   * 스킬 레벨 설정
   */
  setSkillLevel(level: SkillLevel): void {
    this.config.skillLevel = level;
    this.skillAI.setSkillLevel(level);
  }

  /**
   * 전투 실행 (단일 적)
   */
  runBattle(
    playerDeck: string[],
    playerRelics: string[],
    enemyId: string,
    anomalyId?: string | { id: string; level?: number }[],
    cardEnhancements?: Record<string, number>
  ): UnifiedBattleResult {
    const enemy = this.enemies[enemyId];
    if (!enemy) {
      throw new Error(`Enemy not found: ${enemyId}`);
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
      tier: enemy.tier,
      description: enemy.description,
      isBoss: enemy.isBoss,
      passives: enemy.passives,
      block: 0,
      tokens: {},
    };

    this.skillAI.resetStats();
    const result = this.singleEngine.runBattle(
      playerDeck,
      playerRelics,
      enemyState,
      anomalyId,
      cardEnhancements
    );

    return {
      ...result,
      isMultiEnemy: false,
      skillLevelStats: this.skillAI.getStats(),
      skillLevel: this.config.skillLevel,
    };
  }

  /**
   * 전투 실행 (다중 적)
   */
  runMultiBattle(
    playerDeck: string[],
    playerRelics: string[],
    enemyIds: string[],
    anomalyId?: string,
    cardEnhancements?: Record<string, number>
  ): UnifiedBattleResult {
    const enemyStates: EnemyState[] = enemyIds.map(id => {
      const enemy = this.enemies[id];
      if (!enemy) {
        throw new Error(`Enemy not found: ${id}`);
      }
      return {
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
        tier: enemy.tier,
        description: enemy.description,
        isBoss: enemy.isBoss,
        passives: enemy.passives,
        block: 0,
        tokens: {},
      };
    });

    this.skillAI.resetStats();
    const result = this.multiEngine.runMultiEnemyBattle(
      playerDeck,
      playerRelics,
      enemyStates,
      anomalyId,
      cardEnhancements
    );

    return {
      ...result,
      isMultiEnemy: true,
      multiEnemyDetails: result.enemyDetails,
      skillLevelStats: this.skillAI.getStats(),
      skillLevel: this.config.skillLevel,
    };
  }

  /**
   * 배치 시뮬레이션 (단일 적)
   */
  runBatchSimulation(
    config: BatchBattleConfig,
    playerDeck: string[],
    playerRelics: string[],
    enemyId: string,
    anomalyId?: string
  ): BatchBattleResult {
    const results: UnifiedBattleResult[] = [];
    let wins = 0;
    let totalTurns = 0;
    let totalHpRemaining = 0;
    let totalDamageDealt = 0;

    this.setSkillLevel(config.skillLevel);
    this.skillAI.resetStats();

    for (let i = 0; i < config.simulations; i++) {
      const result = this.runBattle(playerDeck, playerRelics, enemyId, anomalyId);
      results.push(result);

      if (result.victory) wins++;
      totalTurns += result.turns;
      totalHpRemaining += result.playerFinalHp;
      totalDamageDealt += result.playerDamageDealt;

      if (config.onProgress) {
        config.onProgress(i + 1, config.simulations);
      }
    }

    return {
      totalSimulations: config.simulations,
      wins,
      winRate: wins / config.simulations,
      avgTurns: totalTurns / config.simulations,
      avgPlayerHpRemaining: totalHpRemaining / config.simulations,
      avgDamageDealt: totalDamageDealt / config.simulations,
      skillLevelStats: this.skillAI.getStats(),
      results,
    };
  }

  /**
   * 스킬 레벨별 비교 시뮬레이션
   */
  runSkillLevelComparison(
    playerDeck: string[],
    playerRelics: string[],
    enemyId: string,
    simulationsPerLevel: number = 100,
    anomalyId?: string
  ): Record<SkillLevel, BatchBattleResult> {
    const levels: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'optimal'];
    const results = {} as Record<SkillLevel, BatchBattleResult>;

    for (const level of levels) {
      results[level] = this.runBatchSimulation(
        {
          ...this.config,
          simulations: simulationsPerLevel,
          skillLevel: level,
        },
        playerDeck,
        playerRelics,
        enemyId,
        anomalyId
      );
    }

    return results;
  }
}

// ==================== 팩토리 함수 ====================

let instance: UnifiedBattleEngine | null = null;

/**
 * 통합 전투 엔진 인스턴스 가져오기
 */
export function getUnifiedBattleEngine(config?: Partial<UnifiedBattleConfig>): UnifiedBattleEngine {
  if (!instance || config) {
    instance = new UnifiedBattleEngine(config);
  }
  return instance;
}

/**
 * 새 통합 전투 엔진 생성
 */
export function createUnifiedBattleEngine(config?: Partial<UnifiedBattleConfig>): UnifiedBattleEngine {
  return new UnifiedBattleEngine(config);
}
