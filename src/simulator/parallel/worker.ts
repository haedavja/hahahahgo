/**
 * @file worker.ts
 * @description Worker thread for parallel battle simulation
 *
 * 주요 기능:
 * - TimelineBattleEngine을 사용한 완전한 전투 시뮬레이션
 * - 대응 단계, 타임라인, 상징 효과 모두 지원
 * - 이변(Anomaly) 시스템 적용
 * - 적 패턴(cycle/phase) 시스템
 */

import { parentPort, workerData } from 'worker_threads';
import type { WorkerTask, WorkerResult, SimulationConfig } from '../core/types';
import type { BattleResult as CoreBattleResult } from '../core/types';
import {
  createTimelineBattleEngine,
  type BattleEngineConfig,
} from '../core/timeline-battle-engine';
import type { EnemyState, GameCard } from '../core/game-types';
import { syncAllCards, syncAllEnemies, syncAllRelics } from '../data/game-data-sync';

// ==================== Worker 데이터 타입 ====================

interface WorkerData {
  cardData?: Record<string, unknown>;
  enemyData?: Record<string, unknown>;
  relicData?: Record<string, unknown>;
  patternData?: Record<string, unknown>;
}

// ==================== 전투 시뮬레이터 (TimelineBattleEngine 래퍼) ====================

export class BattleSimulator {
  private engine: ReturnType<typeof createTimelineBattleEngine>;
  private enemies: Record<string, EnemyState>;
  private cards: Record<string, GameCard>;

  constructor(data?: WorkerData) {
    // 데이터 동기화 (전달받은 데이터가 없으면 직접 로드)
    this.cards = (data?.cardData as Record<string, GameCard>) || syncAllCards();
    const rawEnemies = (data?.enemyData as Record<string, unknown>) || syncAllEnemies();

    // 적 데이터를 EnemyState 형식으로 변환
    this.enemies = {};
    for (const [id, enemy] of Object.entries(rawEnemies)) {
      const e = enemy as {
        id: string;
        name: string;
        maxHp?: number;
        hp?: number;
        tier?: number;
        deck?: string[];
        cardsPerTurn?: number;
        isBoss?: boolean;
      };
      this.enemies[id] = this.createEnemyState(e);
    }

    // TimelineBattleEngine 생성
    this.engine = createTimelineBattleEngine({
      enableCrits: true,
      enableCombos: true,
      enableRelics: true,
      enableAnomalies: true,
      enableTimeline: true,
      verbose: false,
      maxTurns: 30,
    });
  }

  /**
   * 적 데이터를 EnemyState 형식으로 변환
   */
  private createEnemyState(enemy: {
    id: string;
    name: string;
    maxHp?: number;
    hp?: number;
    tier?: number;
    deck?: string[];
    cardsPerTurn?: number;
    isBoss?: boolean;
  }): EnemyState {
    const hp = enemy.hp ?? enemy.maxHp ?? 50;
    return {
      id: enemy.id,
      name: enemy.name,
      hp,
      maxHp: hp,
      block: 0,
      tokens: {},
      deck: enemy.deck || [],
      tier: enemy.tier || 1,
      cardsPerTurn: enemy.cardsPerTurn || 2,
      isBoss: enemy.isBoss || false,
    } as EnemyState;
  }

  /**
   * 전투 시뮬레이션 실행
   */
  simulateBattle(config: SimulationConfig): CoreBattleResult {
    const enemyId = config.enemyIds[0] || 'ghoul';
    const enemyTemplate = this.enemies[enemyId] || this.getDefaultEnemy(enemyId);

    // 적 상태 복사 (매 전투마다 새로운 상태)
    const enemy: EnemyState = {
      ...enemyTemplate,
      hp: enemyTemplate.maxHp,
      block: 0,
      tokens: {},
    };

    // 이변 설정
    let anomalyConfig: string | { id: string; level?: number }[] | undefined;
    if (config.anomalyId) {
      const anomalyLevel = config.anomalyLevel || 1;
      // 쉼표로 구분된 다중 이변 지원
      const anomalyIds = config.anomalyId.split(',').map((s) => s.trim());
      if (anomalyIds.length === 1) {
        anomalyConfig = anomalyIds[0];
      } else {
        anomalyConfig = anomalyIds.map((id) => ({ id, level: anomalyLevel }));
      }
    }

    // TimelineBattleEngine으로 전투 실행
    const result = this.engine.runBattle(
      config.playerDeck,
      config.playerRelics || [],
      enemy,
      anomalyConfig
    );

    // CoreBattleResult 형식으로 변환
    return {
      winner: result.winner,
      turns: result.turns,
      playerDamageDealt: result.playerDamageDealt,
      enemyDamageDealt: result.enemyDamageDealt,
      playerFinalHp: result.playerFinalHp,
      enemyFinalHp: result.enemyFinalHp,
      battleLog: result.battleLog,
      cardUsage: result.cardUsage,
      comboStats: result.comboStats,
    };
  }

  /**
   * 기본 적 생성
   */
  private getDefaultEnemy(id: string): EnemyState {
    return {
      id,
      name: id,
      hp: 50,
      maxHp: 50,
      block: 0,
      tokens: {},
      deck: ['ghoul_attack', 'ghoul_attack', 'ghoul_block'],
      tier: 1,
      cardsPerTurn: 2,
      isBoss: false,
    } as EnemyState;
  }
}

// ==================== Worker 메시지 핸들러 ====================

if (parentPort) {
  const data = workerData as WorkerData;
  const simulator = new BattleSimulator(data);

  parentPort.on('message', (task: WorkerTask) => {
    const startTime = Date.now();

    try {
      const results: CoreBattleResult[] = [];
      const batchSize = task.batchSize || task.config.battles;

      for (let i = 0; i < batchSize; i++) {
        const result = simulator.simulateBattle(task.config);
        results.push(result);

        // 진행률 보고 (10% 단위)
        if (i > 0 && i % Math.max(1, Math.floor(batchSize / 10)) === 0) {
          parentPort!.postMessage({
            type: 'progress',
            payload: {
              taskId: task.id,
              completed: i,
              total: batchSize,
            },
          });
        }
      }

      const response: WorkerResult = {
        id: task.id,
        type: task.type,
        results,
        duration: Date.now() - startTime,
      };

      parentPort!.postMessage({
        type: 'result',
        payload: response,
      });
    } catch (error) {
      parentPort!.postMessage({
        type: 'error',
        payload: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Worker 준비 완료 알림
  parentPort.postMessage({ type: 'ready' });
}

export { BattleSimulator as default };
