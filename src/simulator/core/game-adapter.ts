/**
 * @file game-adapter.ts
 * @description 실제 게임 ↔ 시뮬레이터 연동 레이어
 *
 * 게임 상태를 시뮬레이터가 이해할 수 있는 형태로 변환하고,
 * 시뮬레이터 결과를 게임에서 활용할 수 있도록 함
 */

import type {
  SimulationConfig,
  SimulationResult,
  BattleResult,
  GameState,
} from './types';
import { syncCards, syncEnemies, syncRelics, syncAnomalies } from '../data/sync';

// ==================== 게임 상태 타입 ====================

export interface GameBattleState {
  player: {
    hp: number;
    maxHp: number;
    block: number;
    energy: number;
    hand: string[];
    deck: string[];
    discard: string[];
    relics: string[];
    tokens: Record<string, number>;
    ether: number;
  };
  enemy: {
    id: string;
    hp: number;
    maxHp: number;
    block: number;
    tokens: Record<string, number>;
    intent?: string;
  };
  turn: number;
  phase: 'select' | 'respond' | 'resolve';
  timeline: Array<{
    cardId: string;
    owner: 'player' | 'enemy';
    position: number;
  }>;
  anomalies?: Array<{ id: string; level: number }>;
}

export interface GameCard {
  id: string;
  name: string;
  type: string;
  damage?: number;
  block?: number;
  speedCost: number;
  actionCost: number;
  priority: string;
  tags: string[];
  traits?: string[];
  effects?: Record<string, unknown>;
}

export interface GameRelic {
  id: string;
  name: string;
  effects: { type: string } & Record<string, unknown>;
}

// ==================== 게임 어댑터 ====================

export class GameAdapter {
  private cardData: Record<string, unknown>;
  private enemyData: Record<string, unknown>;
  private relicData: Record<string, unknown>;
  private anomalyData: Record<string, unknown>;

  constructor() {
    this.cardData = syncCards();
    this.enemyData = syncEnemies();
    this.relicData = syncRelics();
    this.anomalyData = syncAnomalies();
  }

  // ==================== 상태 변환 ====================

  /**
   * 게임 전투 상태를 시뮬레이터 GameState로 변환
   */
  toSimulatorState(gameState: GameBattleState): GameState {
    return {
      player: {
        hp: gameState.player.hp,
        maxHp: gameState.player.maxHp,
        block: gameState.player.block,
        strength: this.getTokenValue(gameState.player.tokens, 'strength'),
        etherPts: gameState.player.ether,
        tokens: { ...gameState.player.tokens },
        deck: [...gameState.player.deck],
        hand: [...gameState.player.hand],
        discard: [...gameState.player.discard],
        energy: gameState.player.energy,
        maxEnergy: 3,
        relics: [...gameState.player.relics],
      },
      enemy: {
        hp: gameState.enemy.hp,
        maxHp: gameState.enemy.maxHp,
        block: gameState.enemy.block,
        strength: this.getTokenValue(gameState.enemy.tokens, 'strength'),
        etherPts: 0,
        tokens: { ...gameState.enemy.tokens },
        id: gameState.enemy.id,
        name: this.getEnemyName(gameState.enemy.id),
        deck: this.getEnemyDeck(gameState.enemy.id),
        cardsPerTurn: this.getEnemyCardsPerTurn(gameState.enemy.id),
      },
      turn: gameState.turn,
      phase: gameState.phase,
      timeline: gameState.timeline.map((card, idx) => ({
        id: `${card.cardId}-${idx}`,
        cardId: card.cardId,
        owner: card.owner,
        position: card.position,
      })),
    };
  }

  /**
   * 시뮬레이터 GameState를 게임 전투 상태로 변환
   */
  toGameState(simState: GameState, originalGameState: GameBattleState): GameBattleState {
    return {
      ...originalGameState,
      player: {
        ...originalGameState.player,
        hp: simState.player.hp,
        block: simState.player.block,
        hand: [...simState.player.hand],
        deck: [...simState.player.deck],
        discard: [...simState.player.discard],
        tokens: { ...simState.player.tokens },
      },
      enemy: {
        ...originalGameState.enemy,
        hp: simState.enemy.hp,
        block: simState.enemy.block,
        tokens: { ...simState.enemy.tokens },
      },
      turn: simState.turn,
      phase: simState.phase,
      timeline: simState.timeline.map(card => ({
        cardId: card.cardId,
        owner: card.owner,
        position: card.position,
      })),
    };
  }

  // ==================== 시뮬레이션 설정 생성 ====================

  /**
   * 현재 게임 상태에서 시뮬레이션 설정 생성
   */
  createSimConfigFromGame(
    gameState: GameBattleState,
    options: {
      battles?: number;
      maxTurns?: number;
    } = {}
  ): SimulationConfig {
    return {
      battles: options.battles || 100,
      maxTurns: options.maxTurns || 30,
      enemyIds: [gameState.enemy.id],
      playerDeck: [...gameState.player.deck, ...gameState.player.hand, ...gameState.player.discard],
      playerStats: {
        hp: gameState.player.maxHp,
        maxHp: gameState.player.maxHp,
        energy: 3,
      },
      playerRelics: [...gameState.player.relics],
    };
  }

  // ==================== 결과 해석 ====================

  /**
   * 시뮬레이션 결과에서 최적 액션 추천
   */
  getRecommendedAction(
    gameState: GameBattleState,
    results: BattleResult[]
  ): CardRecommendation[] {
    const cardScores: Record<string, { wins: number; total: number; avgDamage: number }> = {};

    // 각 전투에서 사용된 카드별 성과 분석
    for (const result of results) {
      for (const [cardId, count] of Object.entries(result.cardUsage)) {
        if (!cardScores[cardId]) {
          cardScores[cardId] = { wins: 0, total: 0, avgDamage: 0 };
        }

        cardScores[cardId].total += count;
        if (result.winner === 'player') {
          cardScores[cardId].wins += count;
        }
        cardScores[cardId].avgDamage += result.playerDamageDealt / (results.length * count);
      }
    }

    // 추천 목록 생성
    const recommendations: CardRecommendation[] = [];

    for (const cardId of gameState.player.hand) {
      const score = cardScores[cardId];
      if (!score) continue;

      const winRate = score.total > 0 ? score.wins / score.total : 0;

      recommendations.push({
        cardId,
        priority: this.calculatePriority(cardId, gameState, winRate),
        winRate,
        avgDamage: score.avgDamage,
        reason: this.getRecommendationReason(cardId, gameState, winRate),
      });
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 시뮬레이션 결과 요약 생성
   */
  summarizeResults(result: SimulationResult): SimulationSummaryForGame {
    const { summary } = result;

    return {
      winRate: summary.winRate,
      winRateText: `${(summary.winRate * 100).toFixed(1)}%`,
      avgTurns: summary.avgTurns,
      riskLevel: this.calculateRiskLevel(summary.winRate),
      topCards: summary.topCards.slice(0, 5).map(card => ({
        cardId: card.cardId,
        usagePercent: card.usagePercent,
        contribution: card.winContribution,
      })),
      recommendation: this.getOverallRecommendation(summary.winRate),
    };
  }

  // ==================== 실시간 분석 ====================

  /**
   * 현재 턴에서 최적 카드 조합 분석
   */
  analyzeTurnOptions(
    gameState: GameBattleState,
    simulationCount: number = 50
  ): TurnAnalysis {
    const playableCards = gameState.player.hand.filter(cardId => {
      const card = this.cardData[cardId] as { actionCost?: number } | undefined;
      return card && (card.actionCost || 1) <= gameState.player.energy;
    });

    const options: TurnOption[] = [];

    // 단일 카드 옵션
    for (const cardId of playableCards) {
      options.push({
        cards: [cardId],
        expectedValue: this.estimateCardValue(cardId, gameState),
        risk: this.estimateCardRisk(cardId, gameState),
      });
    }

    // 2카드 콤보 옵션
    for (let i = 0; i < playableCards.length; i++) {
      for (let j = i + 1; j < playableCards.length; j++) {
        const combo = [playableCards[i], playableCards[j]];
        const totalCost = combo.reduce((sum, cardId) => {
          const card = this.cardData[cardId] as { actionCost?: number } | undefined;
          return sum + (card?.actionCost || 1);
        }, 0);

        if (totalCost <= gameState.player.energy) {
          options.push({
            cards: combo,
            expectedValue: this.estimateComboValue(combo, gameState),
            risk: this.estimateComboRisk(combo, gameState),
          });
        }
      }
    }

    // 정렬 및 상위 옵션 반환
    options.sort((a, b) => (b.expectedValue - b.risk) - (a.expectedValue - a.risk));

    return {
      bestOption: options[0] || null,
      topOptions: options.slice(0, 5),
      totalOptions: options.length,
      analysis: this.generateTurnAnalysis(options[0], gameState),
    };
  }

  // ==================== 헬퍼 메서드 ====================

  private getTokenValue(tokens: Record<string, number>, key: string): number {
    return tokens[key] || 0;
  }

  private getEnemyName(enemyId: string): string {
    const enemy = this.enemyData[enemyId] as { name?: string } | undefined;
    return enemy?.name || enemyId;
  }

  private getEnemyDeck(enemyId: string): string[] {
    const enemy = this.enemyData[enemyId] as { deck?: string[] } | undefined;
    return enemy?.deck || ['ghoul_attack', 'ghoul_block'];
  }

  private getEnemyCardsPerTurn(enemyId: string): number {
    const enemy = this.enemyData[enemyId] as { cardsPerTurn?: number } | undefined;
    return enemy?.cardsPerTurn || 2;
  }

  private calculatePriority(cardId: string, state: GameBattleState, winRate: number): number {
    const card = this.cardData[cardId] as {
      attack?: number;
      defense?: number;
      type?: string;
    } | undefined;
    if (!card) return 0;

    let priority = winRate * 100;

    // 상황별 가중치
    const playerHpRatio = state.player.hp / state.player.maxHp;
    const enemyHpRatio = state.enemy.hp / state.enemy.maxHp;

    // 체력 낮으면 방어 우선
    if (playerHpRatio < 0.3 && card.defense) {
      priority += 20;
    }

    // 적 체력 낮으면 공격 우선
    if (enemyHpRatio < 0.3 && card.attack) {
      priority += 15;
    }

    // 마무리 가능하면 최우선
    if (card.attack && card.attack >= state.enemy.hp) {
      priority += 50;
    }

    return priority;
  }

  private getRecommendationReason(cardId: string, state: GameBattleState, winRate: number): string {
    const card = this.cardData[cardId] as {
      attack?: number;
      defense?: number;
      name?: string;
    } | undefined;
    if (!card) return '알 수 없음';

    if (card.attack && card.attack >= state.enemy.hp) {
      return '마무리 가능';
    }

    if (winRate > 0.7) {
      return '높은 승률';
    }

    const playerHpRatio = state.player.hp / state.player.maxHp;
    if (playerHpRatio < 0.3 && card.defense) {
      return '위험 상황 대응';
    }

    if (card.attack) {
      return '공격 기회';
    }

    return '일반 선택';
  }

  private calculateRiskLevel(winRate: number): 'low' | 'medium' | 'high' | 'critical' {
    if (winRate >= 0.7) return 'low';
    if (winRate >= 0.5) return 'medium';
    if (winRate >= 0.3) return 'high';
    return 'critical';
  }

  private getOverallRecommendation(winRate: number): string {
    if (winRate >= 0.8) return '승리 가능성 높음. 적극적으로 플레이하세요.';
    if (winRate >= 0.6) return '좋은 상황입니다. 균형잡힌 플레이를 권장합니다.';
    if (winRate >= 0.4) return '주의가 필요합니다. 방어적으로 플레이하세요.';
    if (winRate >= 0.2) return '위험한 상황입니다. 카드를 신중하게 선택하세요.';
    return '매우 불리합니다. 생존에 집중하세요.';
  }

  private estimateCardValue(cardId: string, state: GameBattleState): number {
    const card = this.cardData[cardId] as {
      attack?: number;
      defense?: number;
    } | undefined;
    if (!card) return 0;

    let value = 0;

    if (card.attack) {
      value += card.attack;
      // 취약 상태면 추가 가치
      if (state.enemy.tokens['vulnerable']) {
        value *= 1.5;
      }
    }

    if (card.defense) {
      // 체력 비율에 따른 방어 가치
      const hpRatio = state.player.hp / state.player.maxHp;
      value += card.defense * (1 + (1 - hpRatio));
    }

    return value;
  }

  private estimateCardRisk(cardId: string, state: GameBattleState): number {
    const card = this.cardData[cardId] as {
      speedCost?: number;
      attack?: number;
    } | undefined;
    if (!card) return 0;

    let risk = 0;

    // 느린 카드는 위험
    if (card.speedCost && card.speedCost >= 8) {
      risk += 5;
    }

    // 공격만 하고 방어 없으면 위험
    if (card.attack && state.player.block === 0) {
      risk += 3;
    }

    return risk;
  }

  private estimateComboValue(cards: string[], state: GameBattleState): number {
    let value = 0;
    let hasAttack = false;
    let hasDefense = false;

    for (const cardId of cards) {
      value += this.estimateCardValue(cardId, state);
      const card = this.cardData[cardId] as { attack?: number; defense?: number } | undefined;
      if (card?.attack) hasAttack = true;
      if (card?.defense) hasDefense = true;
    }

    // 공방 조합 보너스
    if (hasAttack && hasDefense) {
      value *= 1.2;
    }

    return value;
  }

  private estimateComboRisk(cards: string[], state: GameBattleState): number {
    let risk = 0;
    for (const cardId of cards) {
      risk += this.estimateCardRisk(cardId, state);
    }
    // 여러 카드 사용은 리스크 분산
    return risk * 0.8;
  }

  private generateTurnAnalysis(option: TurnOption | null, state: GameBattleState): string {
    if (!option) return '플레이 가능한 카드가 없습니다.';

    const cards = option.cards.map(id => {
      const card = this.cardData[id] as { name?: string } | undefined;
      return card?.name || id;
    }).join(' + ');

    if (option.expectedValue > 15) {
      return `${cards} 조합이 높은 효과를 기대할 수 있습니다.`;
    }

    if (option.risk < 3) {
      return `${cards}이(가) 안정적인 선택입니다.`;
    }

    return `${cards} 사용을 권장합니다.`;
  }

  // ==================== 데이터 리프레시 ====================

  refresh(): void {
    this.cardData = syncCards();
    this.enemyData = syncEnemies();
    this.relicData = syncRelics();
    this.anomalyData = syncAnomalies();
  }
}

// ==================== 타입 정의 ====================

export interface CardRecommendation {
  cardId: string;
  priority: number;
  winRate: number;
  avgDamage: number;
  reason: string;
}

export interface SimulationSummaryForGame {
  winRate: number;
  winRateText: string;
  avgTurns: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  topCards: Array<{
    cardId: string;
    usagePercent: number;
    contribution: number;
  }>;
  recommendation: string;
}

export interface TurnOption {
  cards: string[];
  expectedValue: number;
  risk: number;
}

export interface TurnAnalysis {
  bestOption: TurnOption | null;
  topOptions: TurnOption[];
  totalOptions: number;
  analysis: string;
}

// ==================== 싱글톤 인스턴스 ====================

let adapterInstance: GameAdapter | null = null;

export function getGameAdapter(): GameAdapter {
  if (!adapterInstance) {
    adapterInstance = new GameAdapter();
  }
  return adapterInstance;
}

// ==================== 유틸리티 함수 ====================

/**
 * 빠른 승률 예측 (간단한 휴리스틱)
 */
export function quickWinRateEstimate(gameState: GameBattleState): number {
  const playerHpRatio = gameState.player.hp / gameState.player.maxHp;
  const enemyHpRatio = gameState.enemy.hp / gameState.enemy.maxHp;

  // 기본 예측
  let estimate = 0.5;

  // 체력 비율 차이
  estimate += (playerHpRatio - enemyHpRatio) * 0.3;

  // 핸드 크기
  estimate += gameState.player.hand.length * 0.02;

  // 에너지
  estimate += gameState.player.energy * 0.03;

  // 블록
  if (gameState.player.block > 0) {
    estimate += 0.05;
  }

  // 유물 보너스
  estimate += gameState.player.relics.length * 0.02;

  return Math.max(0, Math.min(1, estimate));
}

/**
 * 위험도 평가
 */
export function assessDanger(gameState: GameBattleState): {
  level: 'safe' | 'warning' | 'danger' | 'critical';
  reasons: string[];
} {
  const reasons: string[] = [];
  let dangerScore = 0;

  // 체력 체크
  const hpRatio = gameState.player.hp / gameState.player.maxHp;
  if (hpRatio < 0.2) {
    dangerScore += 3;
    reasons.push('체력이 매우 낮음');
  } else if (hpRatio < 0.4) {
    dangerScore += 2;
    reasons.push('체력 주의');
  }

  // 적 상태 체크
  const enemyHpRatio = gameState.enemy.hp / gameState.enemy.maxHp;
  if (enemyHpRatio > 0.8 && hpRatio < 0.5) {
    dangerScore += 2;
    reasons.push('적이 아직 건재함');
  }

  // 부정 토큰 체크
  if (gameState.player.tokens['vulnerable']) {
    dangerScore += 1;
    reasons.push('취약 상태');
  }
  if (gameState.player.tokens['weak']) {
    dangerScore += 1;
    reasons.push('약화 상태');
  }

  // 핸드 상태
  if (gameState.player.hand.length < 2) {
    dangerScore += 1;
    reasons.push('손패 부족');
  }

  let level: 'safe' | 'warning' | 'danger' | 'critical';
  if (dangerScore >= 5) level = 'critical';
  else if (dangerScore >= 3) level = 'danger';
  else if (dangerScore >= 1) level = 'warning';
  else level = 'safe';

  return { level, reasons };
}
