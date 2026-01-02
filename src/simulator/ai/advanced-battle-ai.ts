/**
 * @file advanced-battle-ai.ts
 * @description 고급 전투 AI - 타임라인, 특성, 적 패턴 고려
 */

import type { GameCard, EnemyState, TimelineCard, TokenState } from '../core/game-types';

// ==================== 타입 정의 ====================

export interface BattleContext {
  /** 플레이어 HP */
  playerHp: number;
  /** 플레이어 최대 HP */
  playerMaxHp: number;
  /** 플레이어 현재 방어력 */
  playerBlock: number;
  /** 플레이어 토큰 */
  playerTokens: TokenState;
  /** 적 HP */
  enemyHp: number;
  /** 적 최대 HP */
  enemyMaxHp: number;
  /** 적 방어력 */
  enemyBlock: number;
  /** 적 토큰 */
  enemyTokens: TokenState;
  /** 현재 턴 */
  turn: number;
  /** 타임라인 (이미 배치된 카드들) */
  timeline: TimelineCard[];
  /** 적 예상 행동 (가능한 경우) */
  expectedEnemyCards?: string[];
  /** 플레이어 에너지 */
  playerEnergy: number;
}

export interface CardEvaluation {
  cardId: string;
  card: GameCard;
  score: number;
  reasons: string[];
  suggestedPosition: number; // 추천 타임라인 위치
}

export interface CardSelectionResult {
  selectedCards: CardEvaluation[];
  totalScore: number;
  strategy: 'aggressive' | 'defensive' | 'balanced' | 'combo';
}

// ==================== 상수 ====================

/** 연계 특성 조합 */
const TRAIT_COMBOS: Record<string, { followUp: string[]; bonus: number }> = {
  chain: { followUp: ['followup', 'finisher'], bonus: 1.3 },
  followup: { followUp: ['finisher'], bonus: 1.2 },
  setup: { followUp: ['chain', 'followup'], bonus: 1.25 },
};

/** 적 패턴별 대응 전략 */
const ENEMY_COUNTER_STRATEGIES: Record<string, { priorityTraits: string[]; avoidTraits: string[] }> = {
  aggressive: { priorityTraits: ['counter', 'reaction', 'block'], avoidTraits: ['slow'] },
  defensive: { priorityTraits: ['pierce', 'ignoreBlock', 'finisher'], avoidTraits: [] },
  combo: { priorityTraits: ['interrupt', 'disrupt'], avoidTraits: [] },
};

// ==================== 고급 전투 AI ====================

export class AdvancedBattleAI {
  private cardLibrary: Record<string, GameCard>;
  private verbose: boolean;

  constructor(cardLibrary: Record<string, GameCard>, verbose: boolean = false) {
    this.cardLibrary = cardLibrary;
    this.verbose = verbose;
  }

  /**
   * 최적의 카드 선택
   */
  selectCards(
    hand: string[],
    context: BattleContext,
    maxCards: number = 3
  ): CardSelectionResult {
    const evaluations = this.evaluateAllCards(hand, context);
    const strategy = this.determineStrategy(context);

    // 전략에 따른 가중치 조정
    const adjustedEvaluations = this.applyStrategyWeights(evaluations, strategy, context);

    // 시너지 고려한 최적 조합 선택
    const selectedCards = this.selectOptimalCombination(adjustedEvaluations, maxCards, context);

    const totalScore = selectedCards.reduce((sum, e) => sum + e.score, 0);

    if (this.verbose) {
      console.log(`[AdvancedBattleAI] Strategy: ${strategy}, Selected: ${selectedCards.map(c => c.cardId).join(', ')}`);
    }

    return {
      selectedCards,
      totalScore,
      strategy,
    };
  }

  /**
   * 전략 결정
   */
  private determineStrategy(context: BattleContext): 'aggressive' | 'defensive' | 'balanced' | 'combo' {
    const hpRatio = context.playerHp / context.playerMaxHp;
    const enemyHpRatio = context.enemyHp / context.enemyMaxHp;

    // 위험 상황: 방어 우선
    if (hpRatio < 0.3) {
      return 'defensive';
    }

    // 적 HP 낮음: 공격 우선
    if (enemyHpRatio < 0.3) {
      return 'aggressive';
    }

    // 콤보 기회 (플레이어 토큰 상태)
    const hasComboTokens = context.playerTokens['combo'] || context.playerTokens['chain'];
    if (hasComboTokens) {
      return 'combo';
    }

    // 기본: 균형
    return 'balanced';
  }

  /**
   * 모든 카드 평가
   */
  private evaluateAllCards(hand: string[], context: BattleContext): CardEvaluation[] {
    return hand
      .map(cardId => this.evaluateCard(cardId, context))
      .filter((e): e is CardEvaluation => e !== null);
  }

  /**
   * 단일 카드 평가
   */
  private evaluateCard(cardId: string, context: BattleContext): CardEvaluation | null {
    const card = this.cardLibrary[cardId];
    if (!card) return null;

    let score = 0;
    const reasons: string[] = [];

    // 1. 기본 피해/방어 점수
    const damageScore = this.calculateDamageScore(card, context);
    const defenseScore = this.calculateDefenseScore(card, context);
    score += damageScore + defenseScore;

    if (damageScore > 0) reasons.push(`피해: ${damageScore.toFixed(0)}`);
    if (defenseScore > 0) reasons.push(`방어: ${defenseScore.toFixed(0)}`);

    // 2. 특성 시너지
    const traitScore = this.evaluateTraits(card, context);
    score += traitScore;
    if (traitScore > 0) reasons.push(`특성: +${traitScore.toFixed(0)}`);

    // 3. 타임라인 위치 최적화
    const positionScore = this.evaluatePosition(card, context);
    score += positionScore.score;
    if (positionScore.score > 0) reasons.push(`위치: +${positionScore.score.toFixed(0)}`);

    // 4. 속도 효율
    const speedScore = this.evaluateSpeed(card);
    score += speedScore;
    if (speedScore !== 0) reasons.push(`속도: ${speedScore > 0 ? '+' : ''}${speedScore.toFixed(0)}`);

    // 5. 상황별 보너스
    const situationalScore = this.evaluateSituation(card, context);
    score += situationalScore;
    if (situationalScore > 0) reasons.push(`상황: +${situationalScore.toFixed(0)}`);

    return {
      cardId,
      card,
      score,
      reasons,
      suggestedPosition: positionScore.position,
    };
  }

  /**
   * 피해 점수 계산
   */
  private calculateDamageScore(card: GameCard, context: BattleContext): number {
    if (!card.damage) return 0;

    let damage = card.damage;
    const hits = card.hits || 1;

    // 토큰 효과 적용
    if (context.playerTokens['strength']) {
      damage += context.playerTokens['strength'];
    }
    if (context.playerTokens['dull']) {
      damage = Math.floor(damage * 0.75);
    }

    // 적 취약 상태
    if (context.enemyTokens['vulnerable']) {
      damage = Math.floor(damage * 1.5);
    }

    // 방어력 관통
    const actualDamage = Math.max(0, damage * hits - context.enemyBlock);

    // 킬 가능성 보너스
    if (actualDamage >= context.enemyHp) {
      return actualDamage * 2; // 킬 가능 시 보너스
    }

    return actualDamage;
  }

  /**
   * 방어 점수 계산
   */
  private calculateDefenseScore(card: GameCard, context: BattleContext): number {
    if (!card.block) return 0;

    let block = card.block;

    // 토큰 효과
    if (context.playerTokens['dexterity']) {
      block += context.playerTokens['dexterity'];
    }
    if (context.playerTokens['shaken']) {
      block = Math.floor(block * 0.75);
    }

    // HP 비율에 따른 가중치
    const hpRatio = context.playerHp / context.playerMaxHp;
    const urgencyMultiplier = hpRatio < 0.3 ? 2.0 : hpRatio < 0.5 ? 1.5 : 1.0;

    return block * urgencyMultiplier * 0.8; // 공격보다 약간 낮은 가중치
  }

  /**
   * 특성 평가
   */
  private evaluateTraits(card: GameCard, context: BattleContext): number {
    if (!card.traits || card.traits.length === 0) return 0;

    let score = 0;

    for (const trait of card.traits) {
      // 연계 특성 (콤보 시스템 핵심 - 점수 상향)
      if (trait === 'chain') {
        score += 20; // 연계 시작 - 콤보 트리거
      }
      if (trait === 'followup') {
        // 타임라인에 연계 카드가 있으면 보너스
        const hasChainInTimeline = context.timeline.some(tc =>
          tc.card?.traits?.includes('chain')
        );
        score += hasChainInTimeline ? 35 : 12;
      }
      if (trait === 'finisher') {
        // 타임라인에 후속 카드가 있으면 보너스
        const hasFollowupInTimeline = context.timeline.some(tc =>
          tc.card?.traits?.includes('followup') || tc.card?.traits?.includes('chain')
        );
        score += hasFollowupInTimeline ? 50 : 18;
      }

      // 카운터/반응 특성
      if (trait === 'counter' || trait === 'reaction') {
        score += 12;
      }

      // 관통 특성
      if (trait === 'pierce' || trait === 'ignoreBlock') {
        if (context.enemyBlock > 0) {
          score += 20;
        }
      }

      // 연속 공격
      if (trait === 'multi' || trait === 'flurry') {
        score += 10;
      }
    }

    return score;
  }

  /**
   * 타임라인 위치 평가
   */
  private evaluatePosition(card: GameCard, context: BattleContext): { score: number; position: number } {
    const speedCost = card.speedCost || 3;
    let bestPosition = speedCost;
    let bestScore = 0;

    // 타임라인의 빈 위치 찾기
    const occupiedPositions = new Set(context.timeline.map(tc => tc.position));

    // 다양한 위치 시도
    for (let pos = 1; pos <= 12; pos++) {
      if (occupiedPositions.has(pos)) continue;

      let posScore = 0;

      // 빠른 위치 선호 (선제 공격)
      posScore += (12 - pos) * 0.5;

      // 교차(cross) 보너스: 적 카드와 같은 위치
      const hasEnemyCardAt = context.timeline.some(tc =>
        tc.position === pos && tc.owner === 'enemy'
      );
      if (hasEnemyCardAt && card.traits?.includes('cross')) {
        posScore += 15;
      }

      // 연계 카드 바로 뒤 위치
      const hasChainBefore = context.timeline.some(tc =>
        tc.position < pos && tc.card?.traits?.includes('chain') && tc.owner === 'player'
      );
      if (hasChainBefore && card.traits?.includes('followup')) {
        posScore += 20;
      }

      if (posScore > bestScore) {
        bestScore = posScore;
        bestPosition = pos;
      }
    }

    return { score: bestScore, position: bestPosition };
  }

  /**
   * 속도 효율 평가
   */
  private evaluateSpeed(card: GameCard): number {
    const speedCost = card.speedCost || 3;

    // 빠른 카드 선호
    if (speedCost <= 2) return 10;
    if (speedCost <= 4) return 5;
    if (speedCost >= 7) return -5;

    return 0;
  }

  /**
   * 상황별 평가
   */
  private evaluateSituation(card: GameCard, context: BattleContext): number {
    let score = 0;

    // 첫 턴: 버프/셋업 카드 선호
    if (context.turn === 1) {
      if (card.traits?.includes('setup') || card.traits?.includes('buff')) {
        score += 15;
      }
    }

    // 적 HP 낮음: 마무리 카드 선호
    if (context.enemyHp / context.enemyMaxHp < 0.3) {
      if (card.traits?.includes('finisher')) {
        score += 25;
      }
      // 고데미지 카드 선호
      if (card.damage && card.damage >= 10) {
        score += 15;
      }
    }

    // 플레이어 위험: 방어/회피 선호
    if (context.playerHp / context.playerMaxHp < 0.3) {
      if (card.type === 'defense' || card.type === 'reaction') {
        score += 20;
      }
      if (card.traits?.includes('evade') || card.traits?.includes('dodge')) {
        score += 25;
      }
    }

    // 적 토큰 상태 활용
    if (context.enemyTokens['vulnerable'] && card.damage) {
      score += 10; // 취약한 적에게 공격 보너스
    }
    if (context.enemyTokens['weak'] && card.type === 'attack') {
      score += 5; // 약화된 적에게 공격
    }

    return score;
  }

  /**
   * 전략 가중치 적용
   */
  private applyStrategyWeights(
    evaluations: CardEvaluation[],
    strategy: 'aggressive' | 'defensive' | 'balanced' | 'combo',
    context: BattleContext
  ): CardEvaluation[] {
    return evaluations.map(e => {
      let multiplier = 1.0;
      const card = e.card;

      switch (strategy) {
        case 'aggressive':
          if (card.type === 'attack') multiplier *= 1.4;
          if (card.damage && card.damage >= 8) multiplier *= 1.2;
          if (card.type === 'defense') multiplier *= 0.7;
          break;

        case 'defensive':
          if (card.type === 'defense' || card.type === 'reaction') multiplier *= 1.5;
          if (card.block && card.block >= 6) multiplier *= 1.3;
          if (card.type === 'attack' && !card.block) multiplier *= 0.6;
          break;

        case 'combo':
          if (card.traits?.some(t => ['chain', 'followup', 'finisher'].includes(t))) {
            multiplier *= 1.8;  // 콤보 모드에서 연계 특성 더욱 강조
          }
          // 같은 actionCost 카드가 있으면 포커 조합 보너스
          if (card.actionCost !== undefined) {
            multiplier *= 1.15;
          }
          break;

        case 'balanced':
        default:
          // 균형 - 변경 없음
          break;
      }

      return {
        ...e,
        score: e.score * multiplier,
      };
    });
  }

  /**
   * 최적 조합 선택 (시너지 고려)
   */
  private selectOptimalCombination(
    evaluations: CardEvaluation[],
    maxCards: number,
    context: BattleContext
  ): CardEvaluation[] {
    // 점수순 정렬
    const sorted = [...evaluations].sort((a, b) => b.score - a.score);

    const selected: CardEvaluation[] = [];
    let usedEnergy = 0;

    for (const evaluation of sorted) {
      if (selected.length >= maxCards) break;

      const energyCost = evaluation.card.energyCost || 1;
      if (usedEnergy + energyCost > context.playerEnergy) continue;

      // 중복 카드 제한
      const cardCount = selected.filter(s => s.cardId === evaluation.cardId).length;
      if (cardCount >= 2) continue;

      // 연계 시너지 체크
      const synergyBonus = this.calculateSynergyBonus(evaluation, selected);
      if (synergyBonus > 0) {
        evaluation.score += synergyBonus;
        evaluation.reasons.push(`시너지: +${synergyBonus.toFixed(0)}`);
      }

      selected.push(evaluation);
      usedEnergy += energyCost;
    }

    return selected;
  }

  /**
   * 시너지 보너스 계산
   */
  private calculateSynergyBonus(
    evaluation: CardEvaluation,
    selected: CardEvaluation[]
  ): number {
    let bonus = 0;
    const traits = evaluation.card.traits || [];

    // 연계 시너지
    for (const trait of traits) {
      const combo = TRAIT_COMBOS[trait];
      if (combo) {
        const hasPartner = selected.some(s =>
          s.card.traits?.some(t => combo.followUp.includes(t))
        );
        if (hasPartner) {
          bonus += 15;
        }
      }
    }

    // 같은 타입 카드 시너지 (콤보)
    const sameTypeCount = selected.filter(s => s.card.type === evaluation.card.type).length;
    if (sameTypeCount >= 2) {
      bonus += 5;
    }

    return bonus;
  }

  /**
   * 대응 카드 선택 (respond phase)
   */
  selectResponseCard(
    hand: string[],
    enemyCards: TimelineCard[],
    context: BattleContext
  ): CardEvaluation | null {
    const evaluations: CardEvaluation[] = [];

    for (const cardId of hand) {
      const card = this.cardLibrary[cardId];
      if (!card) continue;

      // 대응/반응 카드만 고려
      if (card.type !== 'reaction' && !card.traits?.includes('counter')) {
        continue;
      }

      let score = 0;
      const reasons: string[] = [];

      // 적 카드 분석
      const totalIncomingDamage = enemyCards.reduce((sum, tc) => {
        return sum + (tc.card?.damage || 0) * (tc.card?.hits || 1);
      }, 0);

      // 방어력으로 막을 수 있는 피해
      if (card.block) {
        const blockedDamage = Math.min(card.block, totalIncomingDamage);
        score += blockedDamage * 1.5;
        reasons.push(`방어: ${blockedDamage}`);
      }

      // 카운터 데미지
      if (card.traits?.includes('counter') && card.damage) {
        score += card.damage * 1.2;
        reasons.push(`카운터: ${card.damage}`);
      }

      if (score > 0) {
        evaluations.push({
          cardId,
          card,
          score,
          reasons,
          suggestedPosition: 0,
        });
      }
    }

    // 최고 점수 카드 반환
    evaluations.sort((a, b) => b.score - a.score);
    return evaluations[0] || null;
  }
}

/**
 * 전역 고급 전투 AI 인스턴스 생성
 */
export function createAdvancedBattleAI(
  cardLibrary: Record<string, GameCard>,
  verbose: boolean = false
): AdvancedBattleAI {
  return new AdvancedBattleAI(cardLibrary, verbose);
}
