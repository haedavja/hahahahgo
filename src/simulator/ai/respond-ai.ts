/**
 * @file respond-ai.ts
 * @description 대응 단계 AI - 타임라인 분석 및 대응 카드 선택
 *
 * 대응 단계에서 AI가 할 수 있는 행동:
 * 1. 타임라인 분석 - 적 카드 위치 및 효과 파악
 * 2. 대응 카드 선택 - reaction 타입 카드로 적 공격 무력화
 * 3. 타임라인 조정 - 교차 효과 활용
 * 4. 위험 평가 - 예상 피해량 계산
 */

import type { GameCard, GameBattleState, TimelineCard, TokenState, PlayerState, EnemyState } from '../core/game-types';
import { calculateAttackModifiers, calculateDamageTakenModifiers } from '../core/token-system';

// ==================== 타입 정의 ====================

export interface TimelineAnalysis {
  /** 총 예상 피해량 */
  expectedDamage: number;
  /** 총 예상 방어량 */
  expectedBlock: number;
  /** 위험 카드 목록 (높은 피해 카드) */
  dangerousCards: TimelineCard[];
  /** 교차 기회 목록 */
  crossOpportunities: { position: number; playerCard: TimelineCard; enemyCard: TimelineCard }[];
  /** 빈 슬롯 (대응 카드 배치 가능) */
  emptySlots: number[];
  /** 위험도 점수 (0-100) */
  riskScore: number;
}

export interface ResponseDecision {
  /** 대응할 것인지 */
  shouldRespond: boolean;
  /** 사용할 대응 카드 ID 목록 */
  responseCards: string[];
  /** 대응 이유 */
  reason: string;
  /** 예상 결과 */
  expectedOutcome: {
    damagePrevented: number;
    damageDealt: number;
    blockGained: number;
  };
}

export interface RespondAIConfig {
  /** 공격적 AI (true) vs 방어적 AI (false) */
  aggressive: boolean;
  /** 위험 감수 수준 (0-1, 높을수록 위험 감수) */
  riskTolerance: number;
  /** 대응 사용 확률 */
  respondChance: number;
  /** 교차 우선 여부 */
  prioritizeCross: boolean;
}

const DEFAULT_CONFIG: RespondAIConfig = {
  aggressive: false,
  riskTolerance: 0.5,
  respondChance: 0.7,
  prioritizeCross: true,
};

// ==================== 대응 단계 AI ====================

export class RespondAI {
  private config: RespondAIConfig;
  private cards: Record<string, GameCard>;

  constructor(cards: Record<string, GameCard>, config: Partial<RespondAIConfig> = {}) {
    this.cards = cards;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==================== 타임라인 분석 ====================

  /**
   * 타임라인 분석
   * @param state 현재 전투 상태
   * @returns 분석 결과
   */
  analyzeTimeline(state: GameBattleState): TimelineAnalysis {
    const enemyCards = state.timeline.filter(tc => tc.owner === 'enemy');
    const playerCards = state.timeline.filter(tc => tc.owner === 'player');

    // 예상 피해 계산
    let expectedDamage = 0;
    let expectedBlock = 0;
    const dangerousCards: TimelineCard[] = [];

    for (const tc of enemyCards) {
      const card = this.cards[tc.cardId];
      if (!card) continue;

      if (card.damage && card.damage > 0) {
        const attackMods = calculateAttackModifiers(state.enemy.tokens);
        const damageTakenMods = calculateDamageTakenModifiers(state.player.tokens);

        let damage = card.damage;
        damage += attackMods.damageBonus;
        damage = Math.floor(damage * attackMods.attackMultiplier);
        damage = Math.floor(damage * damageTakenMods.damageMultiplier);

        const hits = card.hits || 1;
        expectedDamage += damage * hits;

        if (damage * hits >= 10) {
          dangerousCards.push(tc);
        }
      }

      if (card.block && card.block > 0) {
        expectedBlock += card.block;
      }
    }

    // 교차 기회 탐색
    const crossOpportunities: TimelineAnalysis['crossOpportunities'] = [];
    const playerPositions = new Map<number, TimelineCard>();

    for (const tc of playerCards) {
      playerPositions.set(tc.position, tc);
    }

    for (const tc of enemyCards) {
      if (playerPositions.has(tc.position)) {
        const playerCard = playerPositions.get(tc.position)!;
        crossOpportunities.push({
          position: tc.position,
          playerCard,
          enemyCard: tc,
        });
      }
    }

    // 빈 슬롯 찾기 (1-30 범위)
    const occupiedPositions = new Set(state.timeline.map(tc => tc.position));
    const emptySlots: number[] = [];
    for (let i = 1; i <= 30; i++) {
      if (!occupiedPositions.has(i)) {
        emptySlots.push(i);
      }
    }

    // 위험도 점수 계산
    const hpRatio = state.player.hp / state.player.maxHp;
    const damageRatio = expectedDamage / Math.max(state.player.hp, 1);
    const riskScore = Math.min(100, Math.floor(
      (damageRatio * 50) +
      ((1 - hpRatio) * 30) +
      (dangerousCards.length * 10)
    ));

    return {
      expectedDamage,
      expectedBlock,
      dangerousCards,
      crossOpportunities,
      emptySlots,
      riskScore,
    };
  }

  // ==================== 대응 결정 ====================

  /**
   * 대응 여부 결정
   * @param state 전투 상태
   * @param availableCards 사용 가능한 대응 카드
   * @returns 대응 결정
   */
  decideResponse(state: GameBattleState, availableCards: GameCard[]): ResponseDecision {
    const analysis = this.analyzeTimeline(state);

    // 기본 결정: 대응 안 함
    const noResponse: ResponseDecision = {
      shouldRespond: false,
      responseCards: [],
      reason: '대응 불필요',
      expectedOutcome: { damagePrevented: 0, damageDealt: 0, blockGained: 0 },
    };

    // 대응 카드 필터링 (reaction 타입만)
    const reactionCards = availableCards.filter(card =>
      card.type === 'reaction' ||
      card.traits?.includes('counter') ||
      card.traits?.includes('counterShot')
    );

    if (reactionCards.length === 0) {
      return { ...noResponse, reason: '대응 카드 없음' };
    }

    // 랜덤 확률 체크
    if (Math.random() > this.config.respondChance) {
      return { ...noResponse, reason: '대응 생략 (확률)' };
    }

    // 위험도 기반 결정
    const riskThreshold = (1 - this.config.riskTolerance) * 50;
    if (analysis.riskScore < riskThreshold) {
      return { ...noResponse, reason: `위험도 낮음 (${analysis.riskScore}%)` };
    }

    // 최적의 대응 카드 선택
    const selectedCards: string[] = [];
    let totalDamagePrevented = 0;
    let totalDamageDealt = 0;
    let totalBlockGained = 0;

    // 위험 카드에 대응
    for (const dangerCard of analysis.dangerousCards) {
      const enemyCard = this.cards[dangerCard.cardId];
      if (!enemyCard) continue;

      // 반격 카드 찾기
      const counterCard = this.findBestCounter(reactionCards, enemyCard, dangerCard.position);
      if (counterCard && !selectedCards.includes(counterCard.id)) {
        selectedCards.push(counterCard.id);
        totalDamagePrevented += (enemyCard.damage || 0) * 0.5; // 대략적 예방
        totalDamageDealt += counterCard.damage || 0;
        totalBlockGained += counterCard.block || 0;
      }
    }

    // 교차 기회 활용
    if (this.config.prioritizeCross && analysis.crossOpportunities.length > 0) {
      // 교차 효과가 있는 카드 우선
      for (const card of reactionCards) {
        if (card.crossBonus && !selectedCards.includes(card.id)) {
          selectedCards.push(card.id);
          break;
        }
      }
    }

    if (selectedCards.length === 0) {
      return { ...noResponse, reason: '적합한 대응 없음' };
    }

    return {
      shouldRespond: true,
      responseCards: selectedCards,
      reason: `위험도 ${analysis.riskScore}% - ${analysis.dangerousCards.length}개 위험 카드 대응`,
      expectedOutcome: {
        damagePrevented: totalDamagePrevented,
        damageDealt: totalDamageDealt,
        blockGained: totalBlockGained,
      },
    };
  }

  // ==================== 헬퍼 함수 ====================

  /**
   * 최적의 반격 카드 찾기
   */
  private findBestCounter(
    reactionCards: GameCard[],
    enemyCard: GameCard,
    enemyPosition: number
  ): GameCard | null {
    // 같은 위치에 배치할 수 있는 카드 우선
    let bestCard: GameCard | null = null;
    let bestScore = -Infinity;

    for (const card of reactionCards) {
      let score = 0;

      // 피해량
      if (card.damage) {
        score += card.damage * 2;
      }

      // 방어력
      if (card.block) {
        score += card.block;
      }

      // 속도 매칭 (교차 가능)
      if (card.speedCost === enemyPosition) {
        score += 20; // 교차 보너스
      }

      // 반격 특성
      if (card.traits?.includes('counter')) {
        score += 15;
      }
      if (card.traits?.includes('counterShot')) {
        score += 15;
      }

      // 코스트 효율
      const costEfficiency = (card.damage || 0 + card.block || 0) / Math.max(card.actionCost, 1);
      score += costEfficiency * 5;

      if (score > bestScore) {
        bestScore = score;
        bestCard = card;
      }
    }

    return bestCard;
  }

  // ==================== 적 AI 대응 ====================

  /**
   * 적 AI 대응 결정
   * @param state 전투 상태
   * @returns 적의 대응 결정
   */
  decideEnemyResponse(state: GameBattleState): ResponseDecision {
    // 적은 단순한 규칙 기반 AI 사용
    const playerCards = state.timeline.filter(tc => tc.owner === 'player');

    // 플레이어 위협도 계산
    let playerThreat = 0;
    for (const tc of playerCards) {
      const card = this.cards[tc.cardId];
      if (card?.damage) {
        playerThreat += card.damage * (card.hits || 1);
      }
    }

    // 위협이 높으면 방어적 대응 (실제로는 적 덱에 따라 달라짐)
    if (playerThreat > state.enemy.hp * 0.3) {
      return {
        shouldRespond: false, // 적은 대응 단계에서 추가 카드 사용 안 함
        responseCards: [],
        reason: '적 대응 패스',
        expectedOutcome: { damagePrevented: 0, damageDealt: 0, blockGained: 0 },
      };
    }

    return {
      shouldRespond: false,
      responseCards: [],
      reason: '적 대응 불필요',
      expectedOutcome: { damagePrevented: 0, damageDealt: 0, blockGained: 0 },
    };
  }
}

// ==================== 팩토리 함수 ====================

export function createRespondAI(
  cards: Record<string, GameCard>,
  config?: Partial<RespondAIConfig>
): RespondAI {
  return new RespondAI(cards, config);
}

// ==================== 유틸리티 함수 ====================

/**
 * 빠른 타임라인 위험도 체크
 */
export function quickRiskCheck(
  timeline: TimelineCard[],
  cards: Record<string, GameCard>,
  playerHp: number
): 'low' | 'medium' | 'high' | 'critical' {
  let expectedDamage = 0;

  for (const tc of timeline) {
    if (tc.owner !== 'enemy') continue;
    const card = cards[tc.cardId];
    if (card?.damage) {
      expectedDamage += card.damage * (card.hits || 1);
    }
  }

  const damageRatio = expectedDamage / playerHp;

  if (damageRatio < 0.2) return 'low';
  if (damageRatio < 0.4) return 'medium';
  if (damageRatio < 0.7) return 'high';
  return 'critical';
}

/**
 * 교차 예측
 */
export function predictCrosses(
  timeline: TimelineCard[]
): { position: number; playerCard: string; enemyCard: string }[] {
  const crosses: { position: number; playerCard: string; enemyCard: string }[] = [];
  const positionMap = new Map<number, { player?: string; enemy?: string }>();

  for (const tc of timeline) {
    const existing = positionMap.get(tc.position) || {};
    if (tc.owner === 'player') {
      existing.player = tc.cardId;
    } else {
      existing.enemy = tc.cardId;
    }
    positionMap.set(tc.position, existing);
  }

  for (const [position, cards] of positionMap) {
    if (cards.player && cards.enemy) {
      crosses.push({
        position,
        playerCard: cards.player,
        enemyCard: cards.enemy,
      });
    }
  }

  return crosses;
}
