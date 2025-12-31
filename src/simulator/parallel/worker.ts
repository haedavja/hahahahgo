/**
 * @file worker.ts
 * @description Worker thread for parallel battle simulation
 */

import { parentPort, workerData } from 'worker_threads';
import type { WorkerTask, WorkerResult, BattleResult, SimulationConfig } from '../core/types';

// Worker가 메인 스레드에서 실행될 때 필요한 데이터
interface WorkerData {
  cardData: Record<string, CardData>;
  enemyData: Record<string, EnemyData>;
  relicData: Record<string, RelicData>;
}

interface CardData {
  id: string;
  name: string;
  attack?: number;
  defense?: number;
  cost: number;
  traits?: string[];
  effects?: Record<string, unknown>;
}

interface EnemyData {
  id: string;
  name: string;
  hp: number;
  tier: number;
  deck: string[];
  cardsPerTurn: number;
  passive?: Record<string, unknown>;
}

interface RelicData {
  id: string;
  name: string;
  effect: Record<string, unknown>;
}

// ==================== 전투 시뮬레이션 로직 ====================

class BattleSimulator {
  private cards: Record<string, CardData>;
  private enemies: Record<string, EnemyData>;
  private relics: Record<string, RelicData>;

  constructor(data: WorkerData) {
    this.cards = data.cardData;
    this.enemies = data.enemyData;
    this.relics = data.relicData;
  }

  simulateBattle(config: SimulationConfig): BattleResult {
    const enemyId = config.enemyIds[0] || 'ghoul';
    const enemy = this.enemies[enemyId] || this.getDefaultEnemy(enemyId);

    // 플레이어 초기화
    const player = {
      hp: 100,
      maxHp: 100,
      block: 0,
      strength: 0,
      etherPts: 0,
      tokens: {} as Record<string, number>,
      deck: [...config.playerDeck],
      hand: [] as string[],
      discard: [] as string[],
      energy: 3,
      maxEnergy: 3,
      relics: config.playerRelics || [],
    };

    // 적 초기화
    const enemyState = {
      hp: enemy.hp,
      maxHp: enemy.hp,
      block: 0,
      strength: 0,
      etherPts: 0,
      tokens: {} as Record<string, number>,
      id: enemy.id,
      name: enemy.name,
      deck: [...enemy.deck],
      cardsPerTurn: enemy.cardsPerTurn,
    };

    const battleLog: string[] = [];
    const cardUsage: Record<string, number> = {};
    const comboStats: Record<string, number> = {};
    let turn = 0;
    let playerDamageDealt = 0;
    let enemyDamageDealt = 0;

    // 덱 셔플
    this.shuffle(player.deck);

    // 전투 루프
    while (turn < config.maxTurns && player.hp > 0 && enemyState.hp > 0) {
      turn++;

      // 카드 드로우
      const drawCount = Math.min(5, player.deck.length + player.discard.length);
      for (let i = 0; i < drawCount; i++) {
        if (player.deck.length === 0) {
          player.deck = [...player.discard];
          player.discard = [];
          this.shuffle(player.deck);
        }
        if (player.deck.length > 0) {
          player.hand.push(player.deck.pop()!);
        }
      }

      // 플레이어 턴: 카드 선택 및 사용
      const playableCards = player.hand.filter(cardId => {
        const card = this.cards[cardId];
        return card && card.cost <= player.energy;
      });

      // AI: 공격 우선, 그 다음 방어
      const sortedCards = playableCards.sort((a, b) => {
        const cardA = this.cards[a];
        const cardB = this.cards[b];
        const scoreA = (cardA?.attack || 0) * 2 + (cardA?.defense || 0);
        const scoreB = (cardB?.attack || 0) * 2 + (cardB?.defense || 0);
        return scoreB - scoreA;
      });

      // 최대 3장 사용
      const cardsToPlay = sortedCards.slice(0, 3);

      for (const cardId of cardsToPlay) {
        const card = this.cards[cardId];
        if (!card) continue;

        cardUsage[cardId] = (cardUsage[cardId] || 0) + 1;
        player.energy -= card.cost;

        // 공격
        if (card.attack) {
          let damage = card.attack + player.strength;

          // 취약 체크
          if (enemyState.tokens['vulnerable']) {
            damage = Math.floor(damage * 1.5);
          }

          // 방어력 적용
          const actualDamage = Math.max(0, damage - enemyState.block);
          enemyState.block = Math.max(0, enemyState.block - damage);
          enemyState.hp -= actualDamage;
          playerDamageDealt += actualDamage;

          battleLog.push(`플레이어가 ${card.name}으로 ${actualDamage} 피해`);
        }

        // 방어
        if (card.defense) {
          player.block += card.defense;
          battleLog.push(`플레이어가 ${card.name}으로 ${card.defense} 방어`);
        }

        // 사용한 카드 버리기
        const handIdx = player.hand.indexOf(cardId);
        if (handIdx >= 0) {
          player.hand.splice(handIdx, 1);
          player.discard.push(cardId);
        }
      }

      // 적 생존 체크
      if (enemyState.hp <= 0) break;

      // 적 턴
      const enemyCards = enemyState.deck.slice(0, enemyState.cardsPerTurn);
      for (const cardId of enemyCards) {
        const card = this.cards[cardId];
        if (!card) continue;

        if (card.attack) {
          let damage = card.attack + enemyState.strength;

          if (player.tokens['vulnerable']) {
            damage = Math.floor(damage * 1.5);
          }

          const actualDamage = Math.max(0, damage - player.block);
          player.block = Math.max(0, player.block - damage);
          player.hp -= actualDamage;
          enemyDamageDealt += actualDamage;

          battleLog.push(`${enemyState.name}이 ${card.name}으로 ${actualDamage} 피해`);
        }

        if (card.defense) {
          enemyState.block += card.defense;
        }
      }

      // 턴 종료: 블록 초기화, 에너지 회복
      player.block = 0;
      enemyState.block = 0;
      player.energy = player.maxEnergy;

      // 남은 핸드 버리기
      player.discard.push(...player.hand);
      player.hand = [];
    }

    // 승자 결정
    let winner: 'player' | 'enemy' | 'draw';
    if (enemyState.hp <= 0 && player.hp > 0) {
      winner = 'player';
    } else if (player.hp <= 0 && enemyState.hp > 0) {
      winner = 'enemy';
    } else if (player.hp <= 0 && enemyState.hp <= 0) {
      winner = 'draw';
    } else {
      // 최대 턴 도달
      winner = player.hp > enemyState.hp ? 'player' : 'enemy';
    }

    return {
      winner,
      turns: turn,
      playerDamageDealt,
      enemyDamageDealt,
      playerFinalHp: Math.max(0, player.hp),
      enemyFinalHp: Math.max(0, enemyState.hp),
      battleLog,
      cardUsage,
      comboStats,
    };
  }

  private shuffle<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private getDefaultEnemy(id: string): EnemyData {
    return {
      id,
      name: id,
      hp: 50,
      tier: 1,
      deck: ['slash', 'slash', 'defend'],
      cardsPerTurn: 2,
    };
  }
}

// ==================== Worker 메시지 핸들러 ====================

if (parentPort) {
  const data = workerData as WorkerData;
  const simulator = new BattleSimulator(data);

  parentPort.on('message', (task: WorkerTask) => {
    const startTime = Date.now();

    try {
      const results: BattleResult[] = [];
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

      parentPort!.postMessage({ type: 'result', payload: response });
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

export { BattleSimulator };
