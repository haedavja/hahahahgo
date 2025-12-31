/**
 * @file mcts.ts
 * @description Monte Carlo Tree Search - AI 최적 플레이 탐색
 */

import type { MCTSNode, GameState, TimelineCard } from '../core/types';
import { loadCards, loadEnemies, type CardData, type EnemyData } from '../data/loader';
import { createError, safeSync, type SimulatorError } from '../core/error-handling';
import { getLogger } from '../core/logger';

const log = getLogger('MCTS');

// ==================== MCTS 설정 ====================

export interface MCTSOptions {
  explorationConstant: number;  // UCB1 탐색 상수 (기본 1.41)
  maxIterations: number;
  maxSimulationDepth: number;
  maxTurns: number;            // 최대 턴 수 (기본 30, 설정 가능)
  timeLimit: number;           // ms
  parallelSimulations: number; // 병렬 시뮬레이션 수 (기본 1)
  earlyTermination: boolean;   // 확실한 승리 시 조기 종료
  pruning: boolean;            // 불리한 가지 가지치기
}

// ==================== MCTS 노드 ====================

class TreeNode implements MCTSNode {
  state: GameState;
  parent: TreeNode | null;
  children: TreeNode[];
  action: string | null;
  visits: number;
  value: number;
  untriedActions: string[];

  constructor(state: GameState, parent: TreeNode | null = null, action: string | null = null) {
    this.state = state;
    this.parent = parent;
    this.action = action;
    this.children = [];
    this.visits = 0;
    this.value = 0;
    this.untriedActions = this.getAvailableActions(state);
  }

  private getAvailableActions(state: GameState): string[] {
    // 현재 상태에서 가능한 액션들 반환
    if (state.phase === 'select') {
      return state.player.hand.filter(cardId => {
        const cards = loadCards();
        const card = cards[cardId];
        return card && card.cost <= state.player.energy;
      });
    }
    return [];
  }

  isFullyExpanded(): boolean {
    return this.untriedActions.length === 0;
  }

  isTerminal(maxTurns: number = 30): boolean {
    return this.state.player.hp <= 0 || this.state.enemy.hp <= 0 || this.state.turn >= maxTurns;
  }

  getUCB1(explorationConstant: number): number {
    if (this.visits === 0) return Infinity;
    if (!this.parent) return this.value / this.visits;

    const exploitation = this.value / this.visits;
    const exploration = explorationConstant * Math.sqrt(Math.log(this.parent.visits) / this.visits);

    return exploitation + exploration;
  }
}

// ==================== MCTS 엔진 ====================

export class MCTSEngine {
  private options: MCTSOptions;
  private cards: Record<string, CardData>;
  private enemies: Record<string, EnemyData>;
  private stats: MCTSStats;

  constructor(options: Partial<MCTSOptions> = {}) {
    this.options = {
      explorationConstant: options.explorationConstant ?? Math.sqrt(2),
      maxIterations: options.maxIterations ?? 1000,
      maxSimulationDepth: options.maxSimulationDepth ?? 20,
      maxTurns: options.maxTurns ?? 30,
      timeLimit: options.timeLimit ?? 5000,
      parallelSimulations: options.parallelSimulations ?? 1,
      earlyTermination: options.earlyTermination ?? true,
      pruning: options.pruning ?? true,
    };

    log.debug('MCTS Engine initialized', {
      maxIterations: this.options.maxIterations,
      maxTurns: this.options.maxTurns,
      timeLimit: this.options.timeLimit,
    });

    this.cards = safeSync(() => loadCards(), {}, 'DATA_CARD_NOT_FOUND');
    this.enemies = safeSync(() => loadEnemies(), {}, 'DATA_ENEMY_NOT_FOUND');
    this.stats = { iterations: 0, avgDepth: 0, bestValue: 0 };
  }

  // ==================== 메인 탐색 ====================

  findBestAction(state: GameState): MCTSResult {
    log.time('mcts_search');
    const root = new TreeNode(this.cloneState(state));
    const startTime = Date.now();
    const { maxTurns, earlyTermination, pruning } = this.options;

    let iterations = 0;
    let totalDepth = 0;
    let earlyTerminationReason: string | null = null;

    while (iterations < this.options.maxIterations) {
      if (Date.now() - startTime > this.options.timeLimit) {
        log.debug('MCTS search time limit reached');
        break;
      }

      // 조기 종료: 확실한 승리/패배
      if (earlyTermination && iterations > 100) {
        const bestChild = this.getBestChild(root, 0);
        if (bestChild) {
          const winRate = bestChild.value / Math.max(1, bestChild.visits);
          if (winRate > 0.95 || winRate < -0.95) {
            earlyTerminationReason = winRate > 0 ? 'certain_win' : 'certain_loss';
            log.debug(`MCTS early termination: ${earlyTerminationReason}`);
            break;
          }
        }
      }

      // Selection
      let node = root;
      let depth = 0;

      while (!node.isTerminal(maxTurns) && node.isFullyExpanded()) {
        node = this.selectChild(node, pruning);
        depth++;
      }

      // Expansion
      if (!node.isTerminal(maxTurns) && !node.isFullyExpanded()) {
        node = this.expand(node);
        depth++;
      }

      // Simulation
      const reward = this.simulate(node);

      // Backpropagation
      this.backpropagate(node, reward);

      iterations++;
      totalDepth += depth;
    }

    // 최고 액션 선택
    const bestChild = this.getBestChild(root, 0);  // exploitation only
    const actionScores = root.children.map(child => ({
      action: child.action!,
      visits: child.visits,
      value: child.value / Math.max(1, child.visits),
    }));

    this.stats = {
      iterations,
      avgDepth: totalDepth / Math.max(1, iterations),
      bestValue: bestChild ? bestChild.value / Math.max(1, bestChild.visits) : 0,
    };

    const searchTime = log.timeEnd('mcts_search', 'MCTS search completed');
    log.debug('MCTS result', {
      iterations,
      bestAction: bestChild?.action,
      confidence: bestChild ? bestChild.visits / iterations : 0,
      searchTime,
      earlyTerminationReason,
    });

    return {
      bestAction: bestChild?.action || null,
      confidence: bestChild ? bestChild.visits / iterations : 0,
      actionScores,
      stats: this.stats,
    };
  }

  // ==================== MCTS 단계 ====================

  private selectChild(node: TreeNode, pruning: boolean = false): TreeNode {
    let children = node.children;

    // 가지치기: 확실히 나쁜 노드 제외
    if (pruning && children.length > 3) {
      const avgValue = children.reduce((sum, c) => sum + c.value / Math.max(1, c.visits), 0) / children.length;
      children = children.filter(c => {
        const nodeValue = c.value / Math.max(1, c.visits);
        return c.visits < 10 || nodeValue > avgValue - 0.5;
      });
      if (children.length === 0) children = node.children;  // 모두 가지치기되면 원복
    }

    return children.reduce((best, child) =>
      child.getUCB1(this.options.explorationConstant) > best.getUCB1(this.options.explorationConstant)
        ? child
        : best
    );
  }

  private expand(node: TreeNode): TreeNode {
    const action = node.untriedActions.pop()!;
    const newState = this.applyAction(this.cloneState(node.state), action);
    const child = new TreeNode(newState, node, action);
    node.children.push(child);
    return child;
  }

  private simulate(node: TreeNode): number {
    let state = this.cloneState(node.state);
    let depth = 0;
    const { maxSimulationDepth, maxTurns } = this.options;

    while (!this.isTerminal(state, maxTurns) && depth < maxSimulationDepth) {
      const action = this.getRandomAction(state);
      if (!action) break;

      state = this.applyAction(state, action);
      state = this.simulateEnemyTurn(state);
      state.turn++;
      depth++;
    }

    return this.evaluate(state);
  }

  private backpropagate(node: TreeNode | null, reward: number): void {
    while (node) {
      node.visits++;
      node.value += reward;
      node = node.parent;
    }
  }

  private getBestChild(node: TreeNode, explorationConstant: number): TreeNode | null {
    if (node.children.length === 0) return null;

    return node.children.reduce((best, child) =>
      child.getUCB1(explorationConstant) > best.getUCB1(explorationConstant)
        ? child
        : best
    );
  }

  // ==================== 게임 로직 ====================

  private applyAction(state: GameState, action: string): GameState {
    const card = this.cards[action];
    if (!card) return state;

    const newState = this.cloneState(state);

    // 카드 사용
    newState.player.energy -= card.cost;

    // 핸드에서 제거
    const handIdx = newState.player.hand.indexOf(action);
    if (handIdx >= 0) {
      newState.player.hand.splice(handIdx, 1);
      newState.player.discard.push(action);
    }

    // 타임라인에 추가
    newState.timeline.push({
      id: `${action}-${Date.now()}`,
      cardId: action,
      owner: 'player',
      position: newState.timeline.length,
    });

    // 효과 적용
    if (card.attack) {
      let damage = card.attack + newState.player.strength;

      // 취약 체크
      if (newState.enemy.tokens['vulnerable']) {
        damage = Math.floor(damage * 1.5);
      }

      // 방어력 적용
      const actualDamage = Math.max(0, damage - newState.enemy.block);
      newState.enemy.block = Math.max(0, newState.enemy.block - damage);
      newState.enemy.hp -= actualDamage;
    }

    if (card.defense) {
      newState.player.block += card.defense;
    }

    return newState;
  }

  private simulateEnemyTurn(state: GameState): GameState {
    const enemy = this.enemies[state.enemy.id];
    if (!enemy) return state;

    const newState = this.cloneState(state);

    // 간단한 적 AI
    const cardsToPlay = enemy.deck.slice(0, enemy.cardsPerTurn);

    for (const cardId of cardsToPlay) {
      const card = this.cards[cardId];
      if (!card) continue;

      if (card.attack) {
        let damage = card.attack + newState.enemy.strength;

        if (newState.player.tokens['vulnerable']) {
          damage = Math.floor(damage * 1.5);
        }

        const actualDamage = Math.max(0, damage - newState.player.block);
        newState.player.block = Math.max(0, newState.player.block - damage);
        newState.player.hp -= actualDamage;
      }

      if (card.defense) {
        newState.enemy.block += card.defense;
      }
    }

    // 턴 종료 처리
    newState.player.block = 0;
    newState.enemy.block = 0;
    newState.player.energy = newState.player.maxEnergy;

    // 카드 드로우
    this.drawCards(newState, 5);

    return newState;
  }

  private drawCards(state: GameState, count: number): void {
    for (let i = 0; i < count; i++) {
      if (state.player.deck.length === 0) {
        state.player.deck = [...state.player.discard];
        state.player.discard = [];
        this.shuffle(state.player.deck);
      }

      if (state.player.deck.length > 0) {
        state.player.hand.push(state.player.deck.pop()!);
      }
    }
  }

  private getRandomAction(state: GameState): string | null {
    const playable = state.player.hand.filter(cardId => {
      const card = this.cards[cardId];
      return card && card.cost <= state.player.energy;
    });

    if (playable.length === 0) return null;
    return playable[Math.floor(Math.random() * playable.length)];
  }

  private isTerminal(state: GameState, maxTurns?: number): boolean {
    return state.player.hp <= 0 || state.enemy.hp <= 0 || state.turn >= (maxTurns ?? this.options.maxTurns);
  }

  private evaluate(state: GameState): number {
    // 점수 계산 (-1 to 1)
    if (state.player.hp <= 0) return -1;
    if (state.enemy.hp <= 0) return 1;

    // 체력 비율 기반 점수
    const playerHpRatio = state.player.hp / state.player.maxHp;
    const enemyHpRatio = state.enemy.hp / state.enemy.maxHp;

    return (playerHpRatio - enemyHpRatio) * 0.5;
  }

  // ==================== 유틸리티 ====================

  private cloneState(state: GameState): GameState {
    return JSON.parse(JSON.stringify(state));
  }

  private shuffle<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // ==================== 공개 메서드 ====================

  getStats(): MCTSStats {
    return { ...this.stats };
  }

  createInitialState(playerDeck: string[], enemyId: string): GameState {
    const enemy = this.enemies[enemyId];
    if (!enemy) throw new Error(`Unknown enemy: ${enemyId}`);

    const deck = [...playerDeck];
    this.shuffle(deck);

    const hand = deck.splice(0, 5);

    return {
      player: {
        hp: 100,
        maxHp: 100,
        block: 0,
        strength: 0,
        etherPts: 0,
        tokens: {},
        deck,
        hand,
        discard: [],
        energy: 3,
        maxEnergy: 3,
        relics: [],
      },
      enemy: {
        hp: enemy.hp,
        maxHp: enemy.hp,
        block: 0,
        strength: 0,
        etherPts: 0,
        tokens: {},
        id: enemy.id,
        name: enemy.name,
        deck: [...enemy.deck],
        cardsPerTurn: enemy.cardsPerTurn,
      },
      turn: 1,
      phase: 'select',
      timeline: [],
    };
  }
}

// ==================== 결과 타입 ====================

export interface MCTSResult {
  bestAction: string | null;
  confidence: number;
  actionScores: Array<{
    action: string;
    visits: number;
    value: number;
  }>;
  stats: MCTSStats;
}

export interface MCTSStats {
  iterations: number;
  avgDepth: number;
  bestValue: number;
}

// ==================== AI 플레이어 ====================

export class MCTSPlayer {
  private engine: MCTSEngine;
  private options: MCTSOptions;

  constructor(options: Partial<MCTSOptions> = {}) {
    this.options = {
      explorationConstant: options.explorationConstant ?? Math.sqrt(2),
      maxIterations: options.maxIterations ?? 500,
      maxSimulationDepth: options.maxSimulationDepth ?? 15,
      maxTurns: options.maxTurns ?? 30,
      timeLimit: options.timeLimit ?? 2000,
      parallelSimulations: options.parallelSimulations ?? 1,
      earlyTermination: options.earlyTermination ?? true,
      pruning: options.pruning ?? true,
    };
    this.engine = new MCTSEngine(this.options);
    log.info('MCTSPlayer initialized', { maxTurns: this.options.maxTurns });
  }

  async playGame(
    playerDeck: string[],
    enemyId: string,
    onTurn?: (turn: number, action: string, state: GameState) => void
  ): Promise<MCTSGameResult> {
    log.time('mcts_game');
    let state = this.engine.createInitialState(playerDeck, enemyId);
    const actionHistory: string[] = [];
    const { maxTurns } = this.options;

    while (state.player.hp > 0 && state.enemy.hp > 0 && state.turn < maxTurns) {
      // MCTS로 최적 액션 탐색
      const result = this.engine.findBestAction(state);

      if (!result.bestAction) {
        // 플레이 가능한 카드가 없으면 턴 종료
        state = this.endPlayerTurn(state);
        continue;
      }

      // 액션 실행
      state = this.executeAction(state, result.bestAction);
      actionHistory.push(result.bestAction);

      if (onTurn) {
        onTurn(state.turn, result.bestAction, state);
      }

      // 적 생존 체크
      if (state.enemy.hp <= 0) break;

      // 더 이상 카드를 낼 수 없으면 턴 종료
      const canPlay = state.player.hand.some(cardId => {
        const cards = loadCards();
        const card = cards[cardId];
        return card && card.cost <= state.player.energy;
      });

      if (!canPlay) {
        state = this.endPlayerTurn(state);
      }
    }

    const duration = log.timeEnd('mcts_game', 'MCTS game completed');
    const winner = state.enemy.hp <= 0 ? 'player' : state.player.hp <= 0 ? 'enemy' : 'draw';

    log.info('MCTS game result', {
      winner,
      turns: state.turn,
      actionsPlayed: actionHistory.length,
      duration,
    });

    return {
      winner,
      turns: state.turn,
      finalState: state,
      actionHistory,
      stats: this.engine.getStats(),
    };
  }

  private executeAction(state: GameState, action: string): GameState {
    const cards = loadCards();
    const card = cards[action];
    if (!card) return state;

    const newState = JSON.parse(JSON.stringify(state));

    newState.player.energy -= card.cost;

    const handIdx = newState.player.hand.indexOf(action);
    if (handIdx >= 0) {
      newState.player.hand.splice(handIdx, 1);
      newState.player.discard.push(action);
    }

    if (card.attack) {
      let damage = card.attack + newState.player.strength;
      if (newState.enemy.tokens['vulnerable']) {
        damage = Math.floor(damage * 1.5);
      }
      const actualDamage = Math.max(0, damage - newState.enemy.block);
      newState.enemy.block = Math.max(0, newState.enemy.block - damage);
      newState.enemy.hp -= actualDamage;
    }

    if (card.defense) {
      newState.player.block += card.defense;
    }

    return newState;
  }

  private endPlayerTurn(state: GameState): GameState {
    const enemies = loadEnemies();
    const cards = loadCards();
    const enemy = enemies[state.enemy.id];
    if (!enemy) return state;

    const newState = JSON.parse(JSON.stringify(state));

    // 적 턴
    const cardsToPlay = enemy.deck.slice(0, enemy.cardsPerTurn);
    for (const cardId of cardsToPlay) {
      const card = cards[cardId];
      if (!card) continue;

      if (card.attack) {
        let damage = card.attack + newState.enemy.strength;
        if (newState.player.tokens['vulnerable']) {
          damage = Math.floor(damage * 1.5);
        }
        const actualDamage = Math.max(0, damage - newState.player.block);
        newState.player.block = Math.max(0, newState.player.block - damage);
        newState.player.hp -= actualDamage;
      }

      if (card.defense) {
        newState.enemy.block += card.defense;
      }
    }

    // 턴 종료
    newState.player.block = 0;
    newState.enemy.block = 0;
    newState.player.energy = newState.player.maxEnergy;
    newState.turn++;

    // 핸드 버리기
    newState.player.discard.push(...newState.player.hand);
    newState.player.hand = [];

    // 새 카드 드로우
    for (let i = 0; i < 5; i++) {
      if (newState.player.deck.length === 0) {
        newState.player.deck = [...newState.player.discard];
        newState.player.discard = [];
        this.shuffle(newState.player.deck);
      }
      if (newState.player.deck.length > 0) {
        newState.player.hand.push(newState.player.deck.pop());
      }
    }

    return newState;
  }

  private shuffle<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

export interface MCTSGameResult {
  winner: 'player' | 'enemy' | 'draw';
  turns: number;
  finalState: GameState;
  actionHistory: string[];
  stats: MCTSStats;
}

// ==================== 벤치마크 ====================

export async function benchmarkMCTS(
  iterations: number = 10,
  options: Partial<MCTSOptions> = {}
): Promise<{
  avgWinRate: number;
  avgTurns: number;
  avgIterations: number;
  totalTime: number;
}> {
  const player = new MCTSPlayer(options);
  const deck = ['slash', 'slash', 'defend', 'defend', 'bash', 'heavyBlow', 'combo', 'shieldBash'];
  const enemies = ['ghoul', 'hunter', 'berserker'];

  let wins = 0;
  let totalTurns = 0;
  let totalIterations = 0;
  const startTime = Date.now();

  for (let i = 0; i < iterations; i++) {
    const enemyId = enemies[i % enemies.length];
    const result = await player.playGame(deck, enemyId);

    if (result.winner === 'player') wins++;
    totalTurns += result.turns;
    totalIterations += result.stats.iterations;
  }

  return {
    avgWinRate: wins / iterations,
    avgTurns: totalTurns / iterations,
    avgIterations: totalIterations / iterations,
    totalTime: Date.now() - startTime,
  };
}
