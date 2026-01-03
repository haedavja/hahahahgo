/**
 * @file mcts.ts
 * @description Monte Carlo Tree Search - AI 최적 플레이 탐색
 */

import type { MCTSNode, GameState, TimelineCard } from '../core/types';
import { loadCards, loadEnemies, type CardData, type EnemyData } from '../data/loader';
import { createError, safeSync, type SimulatorError } from '../core/error-handling';
import { getLogger } from '../core/logger';
import { cloneGameState, computeStateHash } from './base-analyzer';
import { LRUCache } from '../core/lru-cache';

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
  useRAVE: boolean;            // RAVE (Rapid Action Value Estimation) 사용
  raveK: number;               // RAVE 가중치 상수 (기본 500)
  progressiveWidening: boolean; // 프로그레시브 와이드닝 사용
  wideningAlpha: number;       // 와이드닝 계수 (기본 0.5)
}

// RAVE 통계 타입
interface RAVEStats {
  visits: number;
  value: number;
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
  // RAVE 통계
  raveStats: Map<string, RAVEStats>;
  // 시뮬레이션에서 사용된 액션 기록 (RAVE용)
  simulationActions: string[];

  constructor(state: GameState, parent: TreeNode | null = null, action: string | null = null) {
    this.state = state;
    this.parent = parent;
    this.action = action;
    this.children = [];
    this.visits = 0;
    this.value = 0;
    this.untriedActions = this.getAvailableActions(state);
    this.raveStats = new Map();
    this.simulationActions = [];
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

  /**
   * RAVE-UCB1 계산 (MC-RAVE / AMAF)
   * β(n) = sqrt(k / (3n + k)) 를 사용해 RAVE와 UCB1 값을 블렌딩
   */
  getRAVEUCB1(explorationConstant: number, raveK: number): number {
    if (this.visits === 0) return Infinity;
    if (!this.parent || !this.action) return this.getUCB1(explorationConstant);

    const ucb1 = this.getUCB1(explorationConstant);

    // 부모 노드의 RAVE 통계 확인
    const parentRave = this.parent.raveStats.get(this.action);
    if (!parentRave || parentRave.visits === 0) return ucb1;

    // β 계산: visits가 많아질수록 RAVE 가중치 감소
    const beta = Math.sqrt(raveK / (3 * this.visits + raveK));
    const raveValue = parentRave.value / parentRave.visits;

    // UCB1과 RAVE 값 블렌딩
    return (1 - beta) * ucb1 + beta * raveValue;
  }

  /**
   * RAVE 통계 업데이트
   */
  updateRAVE(action: string, reward: number): void {
    const stats = this.raveStats.get(action) || { visits: 0, value: 0 };
    stats.visits++;
    stats.value += reward;
    this.raveStats.set(action, stats);
  }
}

// ==================== MCTS 엔진 ====================

export class MCTSEngine {
  private options: MCTSOptions;
  private cards: Record<string, CardData>;
  private enemies: Record<string, EnemyData>;
  private stats: MCTSStats;
  private transpositionTable: LRUCache<string, { visits: number; value: number }>;
  private stateHashCache: WeakMap<GameState, string>;

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
      useRAVE: options.useRAVE ?? true,
      raveK: options.raveK ?? 500,
      progressiveWidening: options.progressiveWidening ?? false,
      wideningAlpha: options.wideningAlpha ?? 0.5,
    };

    log.debug('MCTS Engine initialized', {
      maxIterations: this.options.maxIterations,
      maxTurns: this.options.maxTurns,
      timeLimit: this.options.timeLimit,
      useRAVE: this.options.useRAVE,
    });

    this.cards = safeSync(() => loadCards(), {}, 'DATA_CARD_NOT_FOUND');
    this.enemies = safeSync(() => loadEnemies(), {}, 'DATA_ENEMY_NOT_FOUND');
    this.stats = { iterations: 0, avgDepth: 0, bestValue: 0 };
    // LRU 캐시로 교체: 10000개 항목으로 제한, 자동 eviction
    this.transpositionTable = new LRUCache({ maxSize: 10000 });
    this.stateHashCache = new WeakMap();
  }

  /**
   * 상태 해시 계산 (트랜스포지션 테이블용)
   * @see computeStateHash from base-analyzer.ts
   */
  private getStateHash(state: GameState): string {
    const cached = this.stateHashCache.get(state);
    if (cached) return cached;

    const hash = computeStateHash(state);
    this.stateHashCache.set(state, hash);
    return hash;
  }

  /**
   * 빠른 상태 복제 (JSON보다 효율적)
   * @see cloneGameState from base-analyzer.ts
   */
  private cloneState(state: GameState): GameState {
    return cloneGameState(state);
  }

  /**
   * 트랜스포지션 테이블 조회 (LRU 캐시가 자동으로 LRU 순서 갱신)
   */
  private lookupTransposition(state: GameState): { visits: number; value: number } | null {
    const hash = this.getStateHash(state);
    return this.transpositionTable.get(hash) ?? null;
  }

  /**
   * 트랜스포지션 테이블 업데이트
   * LRU 캐시가 자동으로 eviction 처리하므로 수동 관리 불필요
   */
  private updateTransposition(state: GameState, visits: number, value: number): void {
    const hash = this.getStateHash(state);
    const existing = this.transpositionTable.get(hash);

    if (!existing || visits > existing.visits) {
      this.transpositionTable.set(hash, { visits, value });
    }
  }

  /**
   * 탐색 초기화 (새 탐색 시작 전)
   */
  clearCache(): void {
    this.transpositionTable.clear();
    this.stateHashCache = new WeakMap();
  }

  /**
   * 캐시 통계 반환
   */
  getCacheStats() {
    return this.transpositionTable.getStats();
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
      const { reward, actions: simulationActions } = this.simulate(node);

      // Backpropagation (with RAVE actions)
      this.backpropagate(node, reward, simulationActions);

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
    const { useRAVE, raveK, explorationConstant } = this.options;

    // 가지치기: 확실히 나쁜 노드 제외
    if (pruning && children.length > 3) {
      const avgValue = children.reduce((sum, c) => sum + c.value / Math.max(1, c.visits), 0) / children.length;
      children = children.filter(c => {
        const nodeValue = c.value / Math.max(1, c.visits);
        return c.visits < 10 || nodeValue > avgValue - 0.5;
      });
      if (children.length === 0) children = node.children;  // 모두 가지치기되면 원복
    }

    // RAVE 사용 여부에 따라 선택 전략 결정
    if (useRAVE) {
      return children.reduce((best, child) =>
        child.getRAVEUCB1(explorationConstant, raveK) > best.getRAVEUCB1(explorationConstant, raveK)
          ? child
          : best
      );
    }

    return children.reduce((best, child) =>
      child.getUCB1(explorationConstant) > best.getUCB1(explorationConstant)
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

  private simulate(node: TreeNode): { reward: number; actions: string[] } {
    let state = this.cloneState(node.state);
    let depth = 0;
    const { maxSimulationDepth, maxTurns } = this.options;
    const simulationActions: string[] = [];

    while (!this.isTerminal(state, maxTurns) && depth < maxSimulationDepth) {
      const action = this.getRandomAction(state);
      if (!action) break;

      simulationActions.push(action);
      state = this.applyAction(state, action);
      state = this.simulateEnemyTurn(state);
      state.turn++;
      depth++;
    }

    return { reward: this.evaluate(state), actions: simulationActions };
  }

  private backpropagate(node: TreeNode | null, reward: number, simulationActions?: string[]): void {
    const { useRAVE } = this.options;

    while (node) {
      node.visits++;
      node.value += reward;

      // RAVE 업데이트: 시뮬레이션에서 사용된 모든 액션에 대해
      if (useRAVE && simulationActions) {
        for (const action of simulationActions) {
          node.updateRAVE(action, reward);
        }
      }

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

    // === 다차원 평가 ===
    const playerMaxHp = state.player.maxHp || 1;
    const enemyMaxHp = state.enemy.maxHp || 1;

    // 1. 체력 비율 기반 점수 (가중치 0.4)
    const playerHpRatio = state.player.hp / playerMaxHp;
    const enemyHpRatio = state.enemy.hp / enemyMaxHp;
    const hpScore = (playerHpRatio - enemyHpRatio) * 0.4;

    // 2. 리소스 어드밴티지 (가중치 0.2)
    const playerHandSize = state.player.hand.length;
    const playerDeckSize = state.player.deck.length;
    const resourceScore = Math.min(0.2, (playerHandSize + playerDeckSize * 0.5) / 20);

    // 3. 보드 컨트롤 - 방어력 및 힘 (가중치 0.15)
    const strengthDiff = (state.player.strength || 0) - (state.enemy.strength || 0);
    const blockAdvantage = (state.player.block || 0) - (state.enemy.block || 0);
    const boardScore = Math.max(-0.15, Math.min(0.15,
      (strengthDiff * 0.05 + blockAdvantage * 0.01)
    ));

    // 4. 상태 이상 어드밴티지 (가중치 0.15)
    let statusScore = 0;
    const playerTokens = state.player.tokens || {};
    const enemyTokens = state.enemy.tokens || {};

    // 유리한 적 디버프
    if (enemyTokens['vulnerable']) statusScore += 0.05;
    if (enemyTokens['weak']) statusScore += 0.05;
    if (enemyTokens['poison']) statusScore += 0.03;

    // 불리한 플레이어 디버프
    if (playerTokens['vulnerable']) statusScore -= 0.05;
    if (playerTokens['weak']) statusScore -= 0.05;
    if (playerTokens['poison']) statusScore -= 0.03;

    statusScore = Math.max(-0.15, Math.min(0.15, statusScore));

    // 5. 턴 진행도 페널티 (너무 오래 걸리면 불리)
    const turnPenalty = Math.min(0.1, state.turn * 0.003);

    // 최종 점수 계산 (-1 ~ 1 범위로 클램프)
    const totalScore = hpScore + resourceScore + boardScore + statusScore - turnPenalty;
    return Math.max(-1, Math.min(1, totalScore));
  }

  // ==================== 유틸리티 ====================

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
      useRAVE: options.useRAVE ?? true,
      raveK: options.raveK ?? 500,
      progressiveWidening: options.progressiveWidening ?? false,
      wideningAlpha: options.wideningAlpha ?? 0.5,
    };
    this.engine = new MCTSEngine(this.options);
    log.info('MCTSPlayer initialized', { maxTurns: this.options.maxTurns, useRAVE: this.options.useRAVE });
  }

  /**
   * 상태 복제 (공통 유틸리티 사용)
   * @see cloneGameState from base-analyzer.ts
   */
  private cloneState(state: GameState): GameState {
    return cloneGameState(state);
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

    const newState = this.cloneState(state);

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

    const newState = this.cloneState(state);

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
        const card = newState.player.deck.pop();
        if (card) newState.player.hand.push(card);
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
