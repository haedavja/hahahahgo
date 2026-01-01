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

    // 교차 기회 탐색 (현재 교차 + 잠재적 교차 위치)
    const crossOpportunities: TimelineAnalysis['crossOpportunities'] = [];
    const playerPositions = new Map<number, TimelineCard>();

    for (const tc of playerCards) {
      playerPositions.set(tc.position, tc);
    }

    // 1. 현재 교차 위치 탐색
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

    // 2. 잠재적 교차 기회 (적 카드 위치에 대응 카드 배치 가능)
    // 적 카드가 있고 플레이어 카드가 없는 위치 = 교차 가능 위치
    const potentialCrossPositions: number[] = [];
    for (const tc of enemyCards) {
      if (!playerPositions.has(tc.position)) {
        potentialCrossPositions.push(tc.position);
      }
    }

    // 교차 보너스가 있는 적 카드 위치를 우선 대상으로 추가
    for (const tc of enemyCards) {
      const card = this.cards[tc.cardId];
      if (card?.crossBonus && !playerPositions.has(tc.position)) {
        // 더미 플레이어 카드로 잠재적 교차 기회 추가
        crossOpportunities.push({
          position: tc.position,
          playerCard: { cardId: '', owner: 'player', position: tc.position } as TimelineCard,
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

    // 대응 카드 필터링 (reaction 타입, 반격 특성, 즉발 카드)
    const reactionCards = availableCards.filter(card =>
      card.type === 'reaction' ||
      card.priority === 'instant' ||
      card.traits?.includes('counter') ||
      card.traits?.includes('counterShot') ||
      card.parryRange // 패링 카드 포함
    );

    if (reactionCards.length === 0) {
      return { ...noResponse, reason: '대응 카드 없음' };
    }

    // 위험도에 따른 대응 확률 조정
    // 위험도가 높을수록 대응 확률 증가
    const adjustedRespondChance = Math.min(1, this.config.respondChance + (analysis.riskScore / 200));
    if (Math.random() > adjustedRespondChance) {
      return { ...noResponse, reason: '대응 생략 (확률)' };
    }

    // 위험도 기반 결정 (HP 비율에 따라 임계값 조정)
    const hpRatio = state.player.hp / state.player.maxHp;
    const riskThreshold = hpRatio > 0.7
      ? (1 - this.config.riskTolerance) * 50  // HP 높으면 기본 임계값
      : (1 - this.config.riskTolerance) * 30; // HP 낮으면 낮은 임계값 (더 적극적 대응)

    if (analysis.riskScore < riskThreshold && analysis.dangerousCards.length === 0) {
      return { ...noResponse, reason: `위험도 낮음 (${analysis.riskScore}%)` };
    }

    // 최적의 대응 카드 매핑
    const responseMap = this.mapResponseCards(reactionCards, analysis.dangerousCards, state);

    const selectedCards: string[] = [];
    let totalDamagePrevented = 0;
    let totalDamageDealt = 0;
    let totalBlockGained = 0;

    // 매핑된 대응 카드 수집
    for (const [enemyCardId, counterCard] of responseMap) {
      if (!selectedCards.includes(counterCard.id)) {
        selectedCards.push(counterCard.id);

        const enemyCard = this.cards[enemyCardId];
        const enemyDamage = (enemyCard?.damage || 0) * (enemyCard?.hits || 1);

        // 예상 결과 계산
        if (counterCard.block) {
          totalDamagePrevented += Math.min(counterCard.block, enemyDamage);
          totalBlockGained += counterCard.block;
        }
        if (counterCard.parryRange) {
          // 패링 성공 시 피해 완전 차단
          totalDamagePrevented += enemyDamage;
        }
        if (counterCard.damage) {
          totalDamageDealt += counterCard.damage * (counterCard.hits || 1);
        }
      }
    }

    // 교차 기회 활용 (교차 보너스 카드 우선)
    if (this.config.prioritizeCross && analysis.crossOpportunities.length > 0) {
      // 교차 보너스 카드들을 점수순으로 정렬
      const crossBonusCards = reactionCards
        .filter(card => card.crossBonus && !selectedCards.includes(card.id))
        .map(card => {
          let score = 0;
          // 공격 배율 교차 우선 (damage_mult)
          if (card.crossBonus?.type === 'damage_mult') {
            score += 20 + ((card.crossBonus.value || 1.5) - 1) * 20;
          }
          // 방어 배율 교차
          if (card.crossBonus?.type === 'block_mult') {
            score += 15 + ((card.crossBonus.value || 1.5) - 1) * 15;
          }
          // 기본 피해/방어력
          score += (card.damage || 0) + (card.block || 0) * 0.5;
          return { card, score };
        })
        .sort((a, b) => b.score - a.score);

      // 상위 2개까지 선택
      for (let i = 0; i < Math.min(2, crossBonusCards.length); i++) {
        const { card } = crossBonusCards[i];
        selectedCards.push(card.id);
        // 교차 보너스 적용 예상값
        const multiplier = card.crossBonus?.value || 1.5;
        totalDamageDealt += Math.floor((card.damage || 0) * multiplier);
        totalBlockGained += Math.floor((card.block || 0) * (card.crossBonus?.type === 'block_mult' ? multiplier : 1));
      }
    }

    // HP가 매우 낮을 때 (20% 이하) 방어 카드 추가
    if (hpRatio < 0.2 && selectedCards.length < reactionCards.length) {
      const defenseCards = reactionCards
        .filter(c => c.block && c.block > 0 && !selectedCards.includes(c.id))
        .sort((a, b) => (b.block || 0) - (a.block || 0));

      if (defenseCards.length > 0) {
        const bestDefense = defenseCards[0];
        selectedCards.push(bestDefense.id);
        totalBlockGained += bestDefense.block || 0;
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
    let bestCard: GameCard | null = null;
    let bestScore = -Infinity;

    const enemyDamage = (enemyCard.damage || 0) * (enemyCard.hits || 1);

    for (const card of reactionCards) {
      let score = 0;

      // 1. 피해량 (높을수록 좋음)
      if (card.damage) {
        score += card.damage * 2;
      }

      // 2. 방어력 (적 피해량에 비례하여 가치 상승)
      if (card.block) {
        const blockValue = Math.min(card.block, enemyDamage); // 실제로 막을 수 있는 양
        score += blockValue * 1.5;
      }

      // 3. 패링 효과 체크 (parryRange 내 적 카드면 높은 점수)
      if (card.parryRange) {
        const cardPosition = card.speedCost || 5;
        const parryMin = cardPosition - card.parryRange;
        const parryMax = cardPosition + card.parryRange;
        if (enemyPosition >= parryMin && enemyPosition <= parryMax) {
          score += 30; // 패링 성공 가능하면 높은 점수
        }
      }

      // 4. 속도 매칭 (교차 가능)
      if (card.speedCost === enemyPosition) {
        score += 25; // 교차 보너스
      } else if (Math.abs((card.speedCost || 5) - enemyPosition) <= 2) {
        score += 10; // 근접 배치 보너스
      }

      // 5. 반격/대응사격 특성
      if (card.traits?.includes('counter')) {
        score += 20;
      }
      if (card.traits?.includes('counterShot')) {
        score += 18;
      }

      // 6. 회피/흐릿함 토큰 부여 (피해 회피 가치)
      if (card.appliedTokens) {
        for (const token of card.appliedTokens) {
          if (token.target === 'player' || token.target === 'self') {
            if (token.id === 'blur' || token.id === 'evasion') {
              score += (token.stacks || 1) * 15;
            }
            if (token.id === 'agility') {
              score += (token.stacks || 1) * 10;
            }
          }
        }
      }

      // 7. 즉발 카드 우선 (먼저 발동)
      if (card.priority === 'instant') {
        score += 15;
      }

      // 8. 코스트 효율
      const totalValue = (card.damage || 0) + (card.block || 0);
      const costEfficiency = totalValue / Math.max(card.actionCost, 1);
      score += costEfficiency * 3;

      // 9. 적 공격이 치명적일 때 (HP 30% 이상 피해) 방어 카드 가치 상승
      // (이 정보는 state에서 가져와야 하지만, 여기서는 enemyDamage로 대체)
      if (enemyDamage >= 15 && card.block && card.block >= 5) {
        score += 10;
      }

      if (score > bestScore) {
        bestScore = score;
        bestCard = card;
      }
    }

    return bestCard;
  }

  /**
   * 위험 카드별 최적 대응 매핑
   */
  private mapResponseCards(
    reactionCards: GameCard[],
    dangerousCards: TimelineCard[],
    state: GameBattleState
  ): Map<string, GameCard> {
    const responseMap = new Map<string, GameCard>();
    const usedCards = new Set<string>();

    // 위험도 순으로 정렬 (높은 피해 카드 우선)
    const sortedDanger = [...dangerousCards].sort((a, b) => {
      const cardA = this.cards[a.cardId];
      const cardB = this.cards[b.cardId];
      const damageA = (cardA?.damage || 0) * (cardA?.hits || 1);
      const damageB = (cardB?.damage || 0) * (cardB?.hits || 1);
      return damageB - damageA;
    });

    for (const dangerCard of sortedDanger) {
      const enemyCard = this.cards[dangerCard.cardId];
      if (!enemyCard) continue;

      // 아직 사용되지 않은 카드 중 최적 대응 찾기
      const availableCards = reactionCards.filter(c => !usedCards.has(c.id));
      const bestCounter = this.findBestCounter(availableCards, enemyCard, dangerCard.position);

      if (bestCounter) {
        responseMap.set(dangerCard.cardId, bestCounter);
        usedCards.add(bestCounter.id);
      }
    }

    return responseMap;
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
