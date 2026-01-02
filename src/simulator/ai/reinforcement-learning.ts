/**
 * @file reinforcement-learning.ts
 * @description 강화학습 기반 AI - Q-Learning / DQN 구현
 *
 * 기능:
 * - Q-Table 기반 학습 (작은 상태 공간)
 * - 신경망 기반 DQN (큰 상태 공간)
 * - 경험 리플레이
 * - Epsilon-Greedy 탐색
 * - 모델 저장/로드
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { SimPlayerState, SimEnemyState, TokenState } from '../core/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==================== 타입 정의 ====================

export interface GameState {
  playerHp: number;
  playerMaxHp: number;
  playerEther: number;
  playerBlock: number;
  playerTokens: TokenState;
  enemyHp: number;
  enemyMaxHp: number;
  enemyBlock: number;
  enemyTokens: TokenState;
  hand: string[];
  turn: number;
}

export interface Action {
  type: 'playCard' | 'endTurn';
  cardIndex?: number;
  cardId?: string;
}

export interface Experience {
  state: GameState;
  action: Action;
  reward: number;
  nextState: GameState | null;
  done: boolean;
}

export interface QLearningConfig {
  learningRate: number;      // 학습률 (α)
  discountFactor: number;    // 감가율 (γ)
  epsilon: number;           // 탐색률
  epsilonDecay: number;      // 탐색률 감소
  minEpsilon: number;        // 최소 탐색률
  batchSize: number;         // 배치 크기
  replayBufferSize: number;  // 경험 버퍼 크기
}

// ==================== 상태 인코딩 ====================

export class StateEncoder {
  // 상태를 문자열 키로 변환 (Q-Table용)
  static encodeToKey(state: GameState): string {
    const hpBucket = Math.floor(state.playerHp / 10);
    const enemyHpBucket = Math.floor(state.enemyHp / 10);
    const etherBucket = state.playerEther;
    const blockBucket = Math.min(Math.floor(state.playerBlock / 5), 5);
    const turnBucket = Math.min(Math.floor(state.turn / 5), 4);

    return `${hpBucket}_${enemyHpBucket}_${etherBucket}_${blockBucket}_${turnBucket}`;
  }

  // 상태를 숫자 배열로 변환 (신경망용)
  static encodeToVector(state: GameState): number[] {
    const vector: number[] = [];

    // 정규화된 수치들
    vector.push(state.playerHp / state.playerMaxHp);       // [0] 플레이어 HP 비율
    vector.push(state.playerEther / 5);                     // [1] 에테르 비율
    vector.push(Math.min(state.playerBlock / 20, 1));      // [2] 방어력 (정규화)
    vector.push(state.enemyHp / state.enemyMaxHp);         // [3] 적 HP 비율
    vector.push(Math.min(state.enemyBlock / 20, 1));       // [4] 적 방어력

    // 토큰 상태
    vector.push(Math.min(state.playerTokens.offensive / 3, 1));
    vector.push(Math.min(state.playerTokens.defensive / 3, 1));
    vector.push(Math.min(state.playerTokens.vulnerable / 3, 1));
    vector.push(Math.min(state.playerTokens.weak / 3, 1));
    vector.push(Math.min(state.playerTokens.strength / 5, 1));

    vector.push(Math.min(state.enemyTokens.vulnerable / 3, 1));
    vector.push(Math.min(state.enemyTokens.weak / 3, 1));

    // 턴 정보
    vector.push(Math.min(state.turn / 30, 1));

    // 손패 정보 (원-핫 인코딩 대신 카드 타입 카운트)
    const attackCount = state.hand.filter(c => c.includes('slash') || c.includes('Blow')).length;
    const defenseCount = state.hand.filter(c => c.includes('defend') || c.includes('Wall')).length;
    vector.push(attackCount / 5);
    vector.push(defenseCount / 5);
    vector.push(state.hand.length / 5);

    return vector;
  }

  // 액션을 인덱스로 변환
  static encodeAction(action: Action, hand: string[]): number {
    if (action.type === 'endTurn') {
      return hand.length; // 마지막 인덱스는 턴 종료
    }
    return action.cardIndex || 0;
  }

  // 인덱스를 액션으로 변환
  static decodeAction(index: number, hand: string[]): Action {
    if (index >= hand.length) {
      return { type: 'endTurn' };
    }
    return {
      type: 'playCard',
      cardIndex: index,
      cardId: hand[index],
    };
  }
}

// ==================== Q-Table ====================

export class QTable {
  private table: Map<string, number[]> = new Map();
  private actionCount: number;

  constructor(actionCount: number = 6) {
    this.actionCount = actionCount; // 최대 5장 + 턴 종료
  }

  getQValues(stateKey: string): number[] {
    if (!this.table.has(stateKey)) {
      this.table.set(stateKey, new Array(this.actionCount).fill(0));
    }
    return this.table.get(stateKey)!;
  }

  setQValue(stateKey: string, actionIndex: number, value: number): void {
    const qValues = this.getQValues(stateKey);
    qValues[actionIndex] = value;
  }

  getBestAction(stateKey: string, validActions: number[]): number {
    const qValues = this.getQValues(stateKey);
    let bestAction = validActions[0];
    let bestValue = qValues[bestAction];

    for (const action of validActions) {
      if (qValues[action] > bestValue) {
        bestValue = qValues[action];
        bestAction = action;
      }
    }

    return bestAction;
  }

  size(): number {
    return this.table.size;
  }

  export(): Record<string, number[]> {
    return Object.fromEntries(this.table);
  }

  import(data: Record<string, number[]>): void {
    this.table = new Map(Object.entries(data));
  }
}

// ==================== 간단한 신경망 ====================

export class SimpleNeuralNetwork {
  private weights: number[][][];
  private biases: number[][];
  private layers: number[];

  constructor(layers: number[]) {
    this.layers = layers;
    this.weights = [];
    this.biases = [];

    // Xavier 초기화
    for (let i = 0; i < layers.length - 1; i++) {
      const inputSize = layers[i];
      const outputSize = layers[i + 1];
      const scale = Math.sqrt(2 / (inputSize + outputSize));

      this.weights.push(
        Array(outputSize).fill(null).map(() =>
          Array(inputSize).fill(null).map(() => (Math.random() - 0.5) * 2 * scale)
        )
      );
      this.biases.push(Array(outputSize).fill(0));
    }
  }

  // ReLU 활성화
  private relu(x: number): number {
    return Math.max(0, x);
  }

  // Softmax (출력층)
  private softmax(values: number[]): number[] {
    const max = Math.max(...values);
    const exp = values.map(v => Math.exp(v - max));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map(e => e / sum);
  }

  // 순전파
  forward(input: number[]): number[] {
    let current = input;

    for (let i = 0; i < this.weights.length; i++) {
      const next: number[] = [];

      for (let j = 0; j < this.weights[i].length; j++) {
        let sum = this.biases[i][j];
        for (let k = 0; k < current.length; k++) {
          sum += this.weights[i][j][k] * current[k];
        }
        // 마지막 레이어가 아니면 ReLU
        next.push(i < this.weights.length - 1 ? this.relu(sum) : sum);
      }

      current = next;
    }

    return current;
  }

  // 간단한 SGD 업데이트
  update(input: number[], targetIndex: number, targetValue: number, learningRate: number): void {
    // 실제 구현에서는 역전파 사용
    // 여기서는 간단한 근사 방식 사용
    const output = this.forward(input);
    const error = targetValue - output[targetIndex];

    // 출력층 가중치 업데이트
    const lastLayer = this.weights.length - 1;
    for (let k = 0; k < this.weights[lastLayer][targetIndex].length; k++) {
      this.weights[lastLayer][targetIndex][k] += learningRate * error * input[k] * 0.01;
    }
    this.biases[lastLayer][targetIndex] += learningRate * error * 0.01;
  }

  // 가중치 복사
  copyFrom(other: SimpleNeuralNetwork): void {
    for (let i = 0; i < this.weights.length; i++) {
      for (let j = 0; j < this.weights[i].length; j++) {
        for (let k = 0; k < this.weights[i][j].length; k++) {
          this.weights[i][j][k] = other.weights[i][j][k];
        }
        this.biases[i][j] = other.biases[i][j];
      }
    }
  }

  export(): { weights: number[][][]; biases: number[][]; layers: number[] } {
    return {
      weights: JSON.parse(JSON.stringify(this.weights)),
      biases: JSON.parse(JSON.stringify(this.biases)),
      layers: this.layers,
    };
  }

  import(data: { weights: number[][][]; biases: number[][] }): void {
    this.weights = data.weights;
    this.biases = data.biases;
  }
}

// ==================== 경험 리플레이 버퍼 ====================

export class ReplayBuffer {
  private buffer: Experience[] = [];
  private maxSize: number;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
  }

  add(experience: Experience): void {
    this.buffer.push(experience);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  sample(batchSize: number): Experience[] {
    const batch: Experience[] = [];
    const size = Math.min(batchSize, this.buffer.length);

    for (let i = 0; i < size; i++) {
      const index = Math.floor(Math.random() * this.buffer.length);
      batch.push(this.buffer[index]);
    }

    return batch;
  }

  size(): number {
    return this.buffer.length;
  }

  clear(): void {
    this.buffer = [];
  }
}

// ==================== Q-Learning 에이전트 ====================

export class QLearningAgent {
  private qTable: QTable;
  private config: QLearningConfig;
  private epsilon: number;
  private totalSteps: number = 0;

  constructor(config: Partial<QLearningConfig> = {}) {
    this.config = {
      learningRate: config.learningRate || 0.1,
      discountFactor: config.discountFactor || 0.95,
      epsilon: config.epsilon || 1.0,
      epsilonDecay: config.epsilonDecay || 0.995,
      minEpsilon: config.minEpsilon || 0.01,
      batchSize: config.batchSize || 32,
      replayBufferSize: config.replayBufferSize || 10000,
    };

    this.epsilon = this.config.epsilon;
    this.qTable = new QTable();
  }

  // 행동 선택 (Epsilon-Greedy)
  selectAction(state: GameState, validActions: Action[]): Action {
    const stateKey = StateEncoder.encodeToKey(state);
    const validIndices = validActions.map((a, i) => i);

    // 탐색 (Exploration)
    if (Math.random() < this.epsilon) {
      const randomIndex = Math.floor(Math.random() * validActions.length);
      return validActions[randomIndex];
    }

    // 활용 (Exploitation)
    const bestIndex = this.qTable.getBestAction(stateKey, validIndices);
    return validActions[bestIndex];
  }

  // 학습
  learn(experience: Experience): void {
    const stateKey = StateEncoder.encodeToKey(experience.state);
    const actionIndex = StateEncoder.encodeAction(experience.action, experience.state.hand);

    let target = experience.reward;

    if (!experience.done && experience.nextState) {
      const nextStateKey = StateEncoder.encodeToKey(experience.nextState);
      const nextQValues = this.qTable.getQValues(nextStateKey);
      const maxNextQ = Math.max(...nextQValues);
      target = experience.reward + this.config.discountFactor * maxNextQ;
    }

    const currentQ = this.qTable.getQValues(stateKey)[actionIndex];
    const newQ = currentQ + this.config.learningRate * (target - currentQ);
    this.qTable.setQValue(stateKey, actionIndex, newQ);

    this.totalSteps++;

    // Epsilon 감소
    this.epsilon = Math.max(
      this.config.minEpsilon,
      this.epsilon * this.config.epsilonDecay
    );
  }

  getStats(): { epsilon: number; qTableSize: number; totalSteps: number } {
    return {
      epsilon: this.epsilon,
      qTableSize: this.qTable.size(),
      totalSteps: this.totalSteps,
    };
  }

  save(filePath: string): void {
    const data = {
      qTable: this.qTable.export(),
      epsilon: this.epsilon,
      totalSteps: this.totalSteps,
      config: this.config,
    };
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  load(filePath: string): void {
    if (!existsSync(filePath)) return;
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    this.qTable.import(data.qTable);
    this.epsilon = data.epsilon;
    this.totalSteps = data.totalSteps;
    if (data.config) this.config = { ...this.config, ...data.config };
  }
}

// ==================== DQN 에이전트 ====================

export class DQNAgent {
  private network: SimpleNeuralNetwork;
  private targetNetwork: SimpleNeuralNetwork;
  private replayBuffer: ReplayBuffer;
  private config: QLearningConfig;
  private epsilon: number;
  private totalSteps: number = 0;
  private updateTargetEvery: number = 100;

  constructor(
    stateSize: number = 16,
    actionSize: number = 6,
    config: Partial<QLearningConfig> = {}
  ) {
    this.config = {
      learningRate: config.learningRate || 0.001,
      discountFactor: config.discountFactor || 0.99,
      epsilon: config.epsilon || 1.0,
      epsilonDecay: config.epsilonDecay || 0.999,
      minEpsilon: config.minEpsilon || 0.05,
      batchSize: config.batchSize || 64,
      replayBufferSize: config.replayBufferSize || 50000,
    };

    this.epsilon = this.config.epsilon;
    this.replayBuffer = new ReplayBuffer(this.config.replayBufferSize);

    // 네트워크 구조: 입력 → 64 → 64 → 출력
    this.network = new SimpleNeuralNetwork([stateSize, 64, 64, actionSize]);
    this.targetNetwork = new SimpleNeuralNetwork([stateSize, 64, 64, actionSize]);
    this.targetNetwork.copyFrom(this.network);
  }

  // 행동 선택
  selectAction(state: GameState, validActions: Action[]): Action {
    // 탐색
    if (Math.random() < this.epsilon) {
      const randomIndex = Math.floor(Math.random() * validActions.length);
      return validActions[randomIndex];
    }

    // 활용
    const stateVector = StateEncoder.encodeToVector(state);
    const qValues = this.network.forward(stateVector);

    // 유효한 액션 중 최대 Q값
    let bestIndex = 0;
    let bestValue = -Infinity;

    for (let i = 0; i < validActions.length; i++) {
      const actionIndex = StateEncoder.encodeAction(validActions[i], state.hand);
      if (qValues[actionIndex] > bestValue) {
        bestValue = qValues[actionIndex];
        bestIndex = i;
      }
    }

    return validActions[bestIndex];
  }

  // 경험 저장
  remember(experience: Experience): void {
    this.replayBuffer.add(experience);
  }

  // 학습
  learn(): void {
    if (this.replayBuffer.size() < this.config.batchSize) return;

    const batch = this.replayBuffer.sample(this.config.batchSize);

    for (const exp of batch) {
      const stateVector = StateEncoder.encodeToVector(exp.state);
      const actionIndex = StateEncoder.encodeAction(exp.action, exp.state.hand);

      let target = exp.reward;

      if (!exp.done && exp.nextState) {
        const nextStateVector = StateEncoder.encodeToVector(exp.nextState);
        const nextQValues = this.targetNetwork.forward(nextStateVector);
        target = exp.reward + this.config.discountFactor * Math.max(...nextQValues);
      }

      this.network.update(stateVector, actionIndex, target, this.config.learningRate);
    }

    this.totalSteps++;

    // Epsilon 감소
    this.epsilon = Math.max(
      this.config.minEpsilon,
      this.epsilon * this.config.epsilonDecay
    );

    // 타겟 네트워크 업데이트
    if (this.totalSteps % this.updateTargetEvery === 0) {
      this.targetNetwork.copyFrom(this.network);
    }
  }

  getStats(): { epsilon: number; bufferSize: number; totalSteps: number } {
    return {
      epsilon: this.epsilon,
      bufferSize: this.replayBuffer.size(),
      totalSteps: this.totalSteps,
    };
  }

  save(filePath: string): void {
    const data = {
      network: this.network.export(),
      targetNetwork: this.targetNetwork.export(),
      epsilon: this.epsilon,
      totalSteps: this.totalSteps,
      config: this.config,
    };
    writeFileSync(filePath, JSON.stringify(data), 'utf-8');
  }

  load(filePath: string): void {
    if (!existsSync(filePath)) return;
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    this.network.import(data.network);
    this.targetNetwork.import(data.targetNetwork);
    this.epsilon = data.epsilon;
    this.totalSteps = data.totalSteps;
    if (data.config) this.config = { ...this.config, ...data.config };
  }
}

// ==================== 보상 함수 ====================

export class RewardCalculator {
  // 전투 보상 계산
  static calculateBattleReward(
    prevState: GameState,
    currentState: GameState,
    actionTaken: Action,
    battleEnded: boolean,
    playerWon: boolean
  ): number {
    let reward = 0;

    // 승/패 보상
    if (battleEnded) {
      reward += playerWon ? 100 : -50;
      return reward;
    }

    // HP 변화 보상
    const playerHpChange = currentState.playerHp - prevState.playerHp;
    const enemyHpChange = prevState.enemyHp - currentState.enemyHp;

    reward += enemyHpChange * 0.5;  // 적에게 피해를 줌
    reward += playerHpChange * 0.3; // HP 손실 페널티

    // 방어력 보상
    if (currentState.playerBlock > 0) {
      reward += 1;
    }

    // 효율적인 카드 사용
    if (actionTaken.type === 'playCard') {
      reward += 0.5;  // 카드 플레이 보상
    }

    // 상태이상 부여 보상
    if (currentState.enemyTokens.vulnerable > prevState.enemyTokens.vulnerable) {
      reward += 3;
    }
    if (currentState.enemyTokens.weak > prevState.enemyTokens.weak) {
      reward += 2;
    }

    // 플레이어 버프 보상
    if (currentState.playerTokens.strength > prevState.playerTokens.strength) {
      reward += 2;
    }

    return reward;
  }

  // 턴 종료 보상
  static calculateTurnEndReward(state: GameState): number {
    let reward = 0;

    // 남은 에테르 페널티 (효율적 사용 장려)
    if (state.playerEther > 0) {
      reward -= state.playerEther * 0.5;
    }

    // 빈 손 보너스 (모든 카드 사용)
    if (state.hand.length === 0) {
      reward += 2;
    }

    return reward;
  }
}

// ==================== 훈련 매니저 ====================

export interface TrainingConfig {
  episodes: number;
  maxTurnsPerEpisode: number;
  saveEvery: number;
  logEvery: number;
}

export interface TrainingResult {
  episode: number;
  totalReward: number;
  turns: number;
  won: boolean;
  epsilon: number;
}

export class TrainingManager {
  private agent: QLearningAgent | DQNAgent;
  private config: TrainingConfig;
  private results: TrainingResult[] = [];
  private savePath: string;

  constructor(
    agent: QLearningAgent | DQNAgent,
    config: Partial<TrainingConfig> = {},
    savePath?: string
  ) {
    this.agent = agent;
    this.config = {
      episodes: config.episodes || 1000,
      maxTurnsPerEpisode: config.maxTurnsPerEpisode || 50,
      saveEvery: config.saveEvery || 100,
      logEvery: config.logEvery || 10,
    };
    this.savePath = savePath || join(__dirname, '../../data/models');

    if (!existsSync(this.savePath)) {
      mkdirSync(this.savePath, { recursive: true });
    }
  }

  // 훈련 실행 (시뮬레이터 콜백 필요)
  async train(
    createEpisode: () => { state: GameState; validActions: () => Action[] },
    step: (action: Action) => { nextState: GameState; reward: number; done: boolean; won: boolean },
    onEpisodeEnd?: (result: TrainingResult) => void
  ): Promise<TrainingResult[]> {
    console.log(`🎮 훈련 시작: ${this.config.episodes} 에피소드`);

    for (let episode = 0; episode < this.config.episodes; episode++) {
      const { state: initialState, validActions } = createEpisode();
      let currentState = initialState;
      let totalReward = 0;
      let turns = 0;
      let done = false;
      let won = false;

      while (!done && turns < this.config.maxTurnsPerEpisode) {
        const actions = validActions();
        const action = this.agent.selectAction(currentState, actions);

        const { nextState, reward, done: isDone, won: isWon } = step(action);

        const experience: Experience = {
          state: currentState,
          action,
          reward,
          nextState: isDone ? null : nextState,
          done: isDone,
        };

        if (this.agent instanceof DQNAgent) {
          this.agent.remember(experience);
          this.agent.learn();
        } else {
          this.agent.learn(experience);
        }

        totalReward += reward;
        currentState = nextState;
        done = isDone;
        won = isWon;
        turns++;
      }

      const result: TrainingResult = {
        episode,
        totalReward,
        turns,
        won,
        epsilon: this.agent.getStats().epsilon,
      };

      this.results.push(result);
      onEpisodeEnd?.(result);

      // 로깅
      if (episode % this.config.logEvery === 0) {
        const recentWinRate = this.calculateRecentWinRate(100);
        console.log(
          `에피소드 ${episode}: 보상=${totalReward.toFixed(1)}, ` +
          `턴=${turns}, 승리=${won}, ε=${result.epsilon.toFixed(3)}, ` +
          `최근 승률=${(recentWinRate * 100).toFixed(1)}%`
        );
      }

      // 저장
      if (episode % this.config.saveEvery === 0 && episode > 0) {
        this.saveCheckpoint(episode);
      }
    }

    console.log('✓ 훈련 완료');
    return this.results;
  }

  private calculateRecentWinRate(count: number): number {
    const recent = this.results.slice(-count);
    if (recent.length === 0) return 0;
    return recent.filter(r => r.won).length / recent.length;
  }

  private saveCheckpoint(episode: number): void {
    const path = join(this.savePath, `checkpoint_${episode}.json`);
    this.agent.save(path);
    console.log(`💾 체크포인트 저장: ${path}`);
  }

  getResults(): TrainingResult[] {
    return this.results;
  }

  generateReport(): string {
    const lines = [
      '# 훈련 리포트',
      '',
      `총 에피소드: ${this.results.length}`,
      `최종 승률: ${(this.calculateRecentWinRate(100) * 100).toFixed(1)}%`,
      '',
      '## 진행 추이',
      '',
      '| 에피소드 | 보상 | 턴 | 승리 | Epsilon |',
      '|----------|------|-----|------|---------|',
    ];

    // 샘플링 (너무 많으면 10개 구간으로)
    const step = Math.max(1, Math.floor(this.results.length / 10));
    for (let i = 0; i < this.results.length; i += step) {
      const r = this.results[i];
      lines.push(
        `| ${r.episode} | ${r.totalReward.toFixed(1)} | ${r.turns} | ` +
        `${r.won ? '✓' : '✗'} | ${r.epsilon.toFixed(3)} |`
      );
    }

    return lines.join('\n');
  }
}

// ==================== 기본 내보내기 ====================

export function createDefaultAgent(type: 'qlearning' | 'dqn' = 'qlearning'): QLearningAgent | DQNAgent {
  if (type === 'dqn') {
    return new DQNAgent();
  }
  return new QLearningAgent();
}

export function getDefaultModelPath(): string {
  return join(__dirname, '../../data/models');
}
