/**
 * @file pattern-learning.ts
 * @description 적 AI 패턴 학습 - 행동 예측 모델 생성
 *
 * 기능:
 * - 적 행동 패턴 기록
 * - 마르코프 체인 기반 예측
 * - 상황별 행동 확률 학습
 * - 카운터 전략 추천
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { BattleResult, SimEnemyState } from '../core/types';
import { loadEnemies } from '../data/loader';
import { getLogger } from '../core/logger';

const log = getLogger('PatternLearner');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==================== 패턴 타입 ====================

export interface ActionPattern {
  action: string;          // 카드 ID
  count: number;
  probability: number;
}

export interface StateCondition {
  hpRange: 'high' | 'mid' | 'low';  // 체력 범위
  turn: 'early' | 'mid' | 'late';   // 턴 범위
  hasBlock: boolean;                 // 방어력 보유
  hasBuffs: boolean;                 // 버프 보유
}

export interface EnemyPattern {
  enemyId: string;
  totalObservations: number;
  actionFrequency: Record<string, number>;
  transitionMatrix: Record<string, Record<string, number>>;  // 마르코프 체인
  conditionalPatterns: Map<string, ActionPattern[]>;         // 상황별 패턴
  preferredOpeners: ActionPattern[];
  dangerMoves: string[];            // 위험한 행동
  counterStrategies: CounterStrategy[];
}

export interface CounterStrategy {
  trigger: string;          // 발동 조건
  action: string;           // 추천 행동
  reason: string;
  effectiveness: number;    // 0-1
}

export interface PredictionResult {
  nextAction: string;
  confidence: number;
  alternatives: Array<{ action: string; probability: number }>;
  recommendedCounter: CounterStrategy | null;
}

// ==================== 패턴 학습기 ====================

export class PatternLearner {
  private patterns: Map<string, EnemyPattern> = new Map();
  private dataPath: string;

  constructor(dataPath?: string) {
    this.dataPath = dataPath || join(__dirname, '../../data/patterns.json');
    this.loadPatterns();
  }

  // ==================== 데이터 저장/로드 ====================

  private loadPatterns(): void {
    if (existsSync(this.dataPath)) {
      try {
        const data = JSON.parse(readFileSync(this.dataPath, 'utf-8'));
        for (const [enemyId, pattern] of Object.entries(data.patterns || {})) {
          const p = pattern as EnemyPattern;
          p.conditionalPatterns = new Map(Object.entries(p.conditionalPatterns || {}));
          this.patterns.set(enemyId, p);
        }
      } catch {
        log.warn('패턴 데이터 로드 실패');
      }
    }
  }

  savePatterns(): void {
    const data: Record<string, unknown> = { patterns: {} };

    for (const [enemyId, pattern] of this.patterns) {
      const serialized = {
        ...pattern,
        conditionalPatterns: Object.fromEntries(pattern.conditionalPatterns),
      };
      (data.patterns as Record<string, unknown>)[enemyId] = serialized;
    }

    writeFileSync(this.dataPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  // ==================== 패턴 기록 ====================

  recordBattle(enemyId: string, battleLog: string[], turns: number): void {
    let pattern = this.patterns.get(enemyId);

    if (!pattern) {
      pattern = this.createEmptyPattern(enemyId);
      this.patterns.set(enemyId, pattern);
    }

    pattern.totalObservations++;

    // 로그에서 적 행동 추출
    const enemyActions = this.extractEnemyActions(battleLog);

    // 행동 빈도 업데이트
    for (const action of enemyActions) {
      pattern.actionFrequency[action] = (pattern.actionFrequency[action] || 0) + 1;
    }

    // 마르코프 체인 업데이트
    for (let i = 0; i < enemyActions.length - 1; i++) {
      const current = enemyActions[i];
      const next = enemyActions[i + 1];

      if (!pattern.transitionMatrix[current]) {
        pattern.transitionMatrix[current] = {};
      }
      pattern.transitionMatrix[current][next] =
        (pattern.transitionMatrix[current][next] || 0) + 1;
    }

    // 오프닝 패턴 업데이트
    if (enemyActions.length > 0) {
      const opener = enemyActions[0];
      const existing = pattern.preferredOpeners.find(p => p.action === opener);
      if (existing) {
        existing.count++;
      } else {
        pattern.preferredOpeners.push({ action: opener, count: 1, probability: 0 });
      }
    }

    // 확률 재계산
    this.recalculateProbabilities(pattern);
  }

  private createEmptyPattern(enemyId: string): EnemyPattern {
    return {
      enemyId,
      totalObservations: 0,
      actionFrequency: {},
      transitionMatrix: {},
      conditionalPatterns: new Map(),
      preferredOpeners: [],
      dangerMoves: [],
      counterStrategies: [],
    };
  }

  private extractEnemyActions(battleLog: string[]): string[] {
    const actions: string[] = [];

    // 로그 패턴: "적이름: 카드이름 → 결과"
    const enemyActionPattern = /(.+): (.+) →/;

    for (const log of battleLog) {
      // 플레이어 로그 제외
      if (log.startsWith('플레이어')) continue;

      const match = log.match(enemyActionPattern);
      if (match) {
        actions.push(match[2].trim());
      }
    }

    return actions;
  }

  private recalculateProbabilities(pattern: EnemyPattern): void {
    const total = Object.values(pattern.actionFrequency).reduce((a, b) => a + b, 0);

    // 오프닝 확률
    const openerTotal = pattern.preferredOpeners.reduce((sum, p) => sum + p.count, 0);
    for (const opener of pattern.preferredOpeners) {
      opener.probability = openerTotal > 0 ? opener.count / openerTotal : 0;
    }
    pattern.preferredOpeners.sort((a, b) => b.probability - a.probability);

    // 마르코프 체인 정규화
    for (const [from, transitions] of Object.entries(pattern.transitionMatrix)) {
      const transitionTotal = Object.values(transitions).reduce((a, b) => a + b, 0);
      for (const to of Object.keys(transitions)) {
        transitions[to] = transitionTotal > 0 ? transitions[to] / transitionTotal : 0;
      }
    }

    // 위험 행동 식별 (높은 피해 카드)
    const enemies = loadEnemies();
    const enemy = enemies[pattern.enemyId];
    if (enemy) {
      // 간단한 휴리스틱: heavyBlow, execute 등
      const dangerCards = ['heavyBlow', 'execute', 'whirlwind', 'dualWield'];
      pattern.dangerMoves = Object.keys(pattern.actionFrequency)
        .filter(action => dangerCards.some(dc => action.includes(dc)));
    }
  }

  // ==================== 행동 예측 ====================

  predictNextAction(
    enemyId: string,
    lastAction?: string,
    state?: Partial<StateCondition>
  ): PredictionResult {
    const pattern = this.patterns.get(enemyId);

    if (!pattern || pattern.totalObservations < 5) {
      return {
        nextAction: 'unknown',
        confidence: 0,
        alternatives: [],
        recommendedCounter: null,
      };
    }

    let predictions: Array<{ action: string; probability: number }> = [];

    // 마르코프 체인 예측
    if (lastAction && pattern.transitionMatrix[lastAction]) {
      const transitions = pattern.transitionMatrix[lastAction];
      predictions = Object.entries(transitions)
        .map(([action, prob]) => ({ action, probability: prob }))
        .sort((a, b) => b.probability - a.probability);
    }

    // 마르코프 예측이 없으면 전체 빈도 사용
    if (predictions.length === 0) {
      const total = Object.values(pattern.actionFrequency).reduce((a, b) => a + b, 0);
      predictions = Object.entries(pattern.actionFrequency)
        .map(([action, count]) => ({ action, probability: count / total }))
        .sort((a, b) => b.probability - a.probability);
    }

    const topPrediction = predictions[0];

    // 카운터 전략 찾기
    const counter = pattern.counterStrategies.find(
      s => s.trigger === topPrediction?.action
    );

    return {
      nextAction: topPrediction?.action || 'unknown',
      confidence: topPrediction?.probability || 0,
      alternatives: predictions.slice(1, 4),
      recommendedCounter: counter || null,
    };
  }

  // ==================== 카운터 전략 학습 ====================

  learnCounterStrategies(enemyId: string, battleResults: BattleResult[]): void {
    const pattern = this.patterns.get(enemyId);
    if (!pattern) return;

    // 승리한 전투에서 사용된 카드 분석
    const winningCards: Record<string, number> = {};
    const losingCards: Record<string, number> = {};

    for (const result of battleResults) {
      const usage = result.cardUsage;
      const target = result.winner === 'player' ? winningCards : losingCards;

      for (const [cardId, count] of Object.entries(usage)) {
        target[cardId] = (target[cardId] || 0) + count;
      }
    }

    // 승률이 높은 카드 찾기
    for (const dangerMove of pattern.dangerMoves) {
      // 가장 효과적인 대응 카드 찾기
      const effectiveCards = Object.entries(winningCards)
        .filter(([cardId]) => {
          const winCount = winningCards[cardId] || 0;
          const loseCount = losingCards[cardId] || 0;
          return winCount > loseCount;
        })
        .sort((a, b) => b[1] - a[1]);

      if (effectiveCards.length > 0) {
        const [counterCard] = effectiveCards[0];
        const effectiveness = effectiveCards[0][1] /
          (effectiveCards[0][1] + (losingCards[counterCard] || 0));

        pattern.counterStrategies.push({
          trigger: dangerMove,
          action: counterCard,
          reason: `${dangerMove}에 대한 효과적인 대응`,
          effectiveness,
        });
      }
    }

    // 중복 제거 및 정렬
    pattern.counterStrategies = pattern.counterStrategies
      .reduce((acc, curr) => {
        const existing = acc.find(s => s.trigger === curr.trigger);
        if (!existing || curr.effectiveness > existing.effectiveness) {
          return [...acc.filter(s => s.trigger !== curr.trigger), curr];
        }
        return acc;
      }, [] as CounterStrategy[])
      .sort((a, b) => b.effectiveness - a.effectiveness);
  }

  // ==================== 패턴 분석 ====================

  analyzeEnemy(enemyId: string): EnemyAnalysis | null {
    const pattern = this.patterns.get(enemyId);
    if (!pattern) return null;

    const total = Object.values(pattern.actionFrequency).reduce((a, b) => a + b, 0);

    // 주요 행동
    const topActions = Object.entries(pattern.actionFrequency)
      .map(([action, count]) => ({
        action,
        frequency: count / total,
        count,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    // 예측 가능성 (엔트로피 기반)
    const probs = topActions.map(a => a.frequency);
    const entropy = -probs.reduce((sum, p) => sum + (p > 0 ? p * Math.log2(p) : 0), 0);
    const maxEntropy = Math.log2(topActions.length);
    // 행동이 하나뿐이면 완전히 예측 가능 (1.0)
    const predictability = maxEntropy === 0 ? 1 : 1 - (entropy / maxEntropy);

    // 행동 스타일
    let style: 'aggressive' | 'defensive' | 'balanced' | 'random';
    const attackRatio = topActions
      .filter(a => a.action.includes('slash') || a.action.includes('Blow') || a.action.includes('Shot'))
      .reduce((sum, a) => sum + a.frequency, 0);

    if (attackRatio > 0.7) style = 'aggressive';
    else if (attackRatio < 0.3) style = 'defensive';
    else if (predictability < 0.3) style = 'random';
    else style = 'balanced';

    return {
      enemyId,
      observations: pattern.totalObservations,
      topActions,
      predictability,
      style,
      dangerMoves: pattern.dangerMoves,
      counters: pattern.counterStrategies,
      openers: pattern.preferredOpeners.slice(0, 3),
    };
  }

  // ==================== 전체 분석 ====================

  getAllPatterns(): Map<string, EnemyPattern> {
    return new Map(this.patterns);
  }

  getPattern(enemyId: string): EnemyPattern | undefined {
    return this.patterns.get(enemyId);
  }

  clearPatterns(): void {
    this.patterns.clear();
  }
}

// ==================== 분석 결과 타입 ====================

export interface EnemyAnalysis {
  enemyId: string;
  observations: number;
  topActions: Array<{ action: string; frequency: number; count: number }>;
  predictability: number;  // 0-1, 높을수록 예측 쉬움
  style: 'aggressive' | 'defensive' | 'balanced' | 'random';
  dangerMoves: string[];
  counters: CounterStrategy[];
  openers: ActionPattern[];
}

// ==================== 콘솔 출력 ====================

export function printEnemyAnalysis(analysis: EnemyAnalysis): void {
  console.log('\n' + '═'.repeat(60));
  console.log(`🎯 적 패턴 분석: ${analysis.enemyId}`);
  console.log('═'.repeat(60));

  console.log(`\n📊 관측 횟수: ${analysis.observations}`);
  console.log(`📈 예측 가능성: ${(analysis.predictability * 100).toFixed(1)}%`);
  console.log(`🎭 행동 스타일: ${analysis.style}`);

  console.log('\n📋 주요 행동:');
  for (const action of analysis.topActions) {
    const bar = '█'.repeat(Math.round(action.frequency * 20));
    console.log(`  ${action.action}: ${bar} ${(action.frequency * 100).toFixed(1)}%`);
  }

  if (analysis.dangerMoves.length > 0) {
    console.log('\n⚠️ 위험 행동:');
    for (const move of analysis.dangerMoves) {
      console.log(`  • ${move}`);
    }
  }

  if (analysis.counters.length > 0) {
    console.log('\n🛡️ 카운터 전략:');
    for (const counter of analysis.counters.slice(0, 3)) {
      console.log(`  ${counter.trigger} → ${counter.action} (${(counter.effectiveness * 100).toFixed(0)}% 효과)`);
    }
  }

  console.log('\n' + '═'.repeat(60));
}

export function printPrediction(prediction: PredictionResult): void {
  console.log(`\n🔮 예측: ${prediction.nextAction} (신뢰도 ${(prediction.confidence * 100).toFixed(1)}%)`);

  if (prediction.alternatives.length > 0) {
    console.log('   대안:');
    for (const alt of prediction.alternatives) {
      console.log(`     • ${alt.action}: ${(alt.probability * 100).toFixed(1)}%`);
    }
  }

  if (prediction.recommendedCounter) {
    const c = prediction.recommendedCounter;
    console.log(`\n   💡 추천 대응: ${c.action}`);
    console.log(`      ${c.reason}`);
  }
}
