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
import { getBossPatternForPhase, checkBossSpecialActions, BOSS_PATTERNS } from './enemy-patterns';

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
  /** 보스전 여부 */
  isBossFight: boolean;
  /** 플레이어 전략 */
  strategy: 'aggressive' | 'balanced' | 'defensive';
  /** 보스 ID (보스전일 경우) */
  bossId?: string;
  /** 시뮬레이션 기반 평가 사용 */
  useSimulation: boolean;
  /** 시뮬레이션 반복 횟수 */
  simulationIterations: number;
}

const DEFAULT_CONFIG: RespondAIConfig = {
  aggressive: false,
  riskTolerance: 0.5,
  respondChance: 0.7,
  prioritizeCross: true,
  isBossFight: false,
  strategy: 'balanced',
  bossId: undefined,
  useSimulation: false,
  simulationIterations: 50,
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
   * 통찰 레벨에 따라 볼 수 있는 적 카드 수 반환
   * | 레벨 | 이름 | 대응단계 가시성 |
   * |------|------|-----------------|
   * | -3   | 망각 | 0장 (타임라인 불가) |
   * | -2   | 미련 | 0장 (진행단계만 제한) |
   * | -1   | 우둔 | 0장 (대응단계 제한) |
   * |  0   | 평온 | 3장 |
   * | +1   | 예측 | 4장 |
   * | +2   | 독심 | 전체 |
   * | +3   | 혜안 | 전체 + 상세정보 |
   */
  private getVisibleEnemyCardCount(insight: number): number {
    if (insight <= -1) return 0;  // 대응단계에서 적 타임라인 확인 불가
    if (insight === 0) return 3;  // 기본 3장
    if (insight === 1) return 4;  // 예측 4장
    return Infinity;              // 독심/혜안: 전체
  }

  /**
   * 카드 사용에 필요한 토큰이 있는지 확인
   * @param card 확인할 카드
   * @param playerTokens 플레이어가 가진 토큰
   * @returns 사용 가능 여부
   */
  private canUseCard(card: GameCard, playerTokens: TokenState = {}): boolean {
    // 토큰 요구사항이 없으면 사용 가능
    if (!card.requiredTokens || card.requiredTokens.length === 0) {
      return true;
    }

    // 각 요구 토큰 확인
    for (const required of card.requiredTokens) {
      const currentStacks = playerTokens[required.id] || 0;
      if (currentStacks < required.stacks) {
        return false; // 토큰이 부족하면 사용 불가
      }
    }

    return true;
  }

  /**
   * 타임라인 분석
   * @param state 현재 전투 상태
   * @returns 분석 결과
   */
  analyzeTimeline(state: GameBattleState): TimelineAnalysis {
    const insight = state.player.insight ?? 0;
    const visibleCount = this.getVisibleEnemyCardCount(insight);

    // 통찰 레벨에 따른 적 카드 가시성 제한
    const allEnemyCards = state.timeline.filter(tc => tc.owner === 'enemy');
    const enemyCards = visibleCount === Infinity
      ? allEnemyCards
      : allEnemyCards.slice(0, visibleCount);

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

    // 플레이어 토큰 상태 가져오기
    const playerTokens = state.player.tokens || {};

    // 대응 카드 필터링 (reaction 타입, 반격 특성, 즉발 카드)
    // + 토큰 요구사항 확인
    const reactionCards = availableCards.filter(card => {
      // 먼저 토큰 요구사항 확인
      if (!this.canUseCard(card, playerTokens)) {
        return false;
      }

      // 대응 가능한 카드 타입 확인
      return (
        card.type === 'reaction' ||
        card.priority === 'instant' ||
        card.traits?.includes('counter') ||
        card.traits?.includes('counterShot') ||
        card.parryRange // 패링 카드 포함
      );
    });

    if (reactionCards.length === 0) {
      return { ...noResponse, reason: '대응 카드 없음 (토큰 부족 포함)' };
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

    // 보스전 특화 대응 전략
    if (this.config.isBossFight) {
      // 보스전에서는 더 적극적으로 대응
      const bossResponseCards = this.selectBossFightResponses(
        reactionCards,
        analysis,
        selectedCards,
        state
      );

      for (const card of bossResponseCards) {
        if (!selectedCards.includes(card.id)) {
          selectedCards.push(card.id);
          totalDamageDealt += (card.damage || 0) * (card.hits || 1);
          totalBlockGained += card.block || 0;
        }
      }
    }

    // 전략별 추가 대응
    if (this.config.strategy === 'defensive' && hpRatio < 0.5) {
      // 방어 전략 + 체력 낮으면 추가 방어
      const additionalDefense = reactionCards
        .filter(c => c.block && c.block >= 5 && !selectedCards.includes(c.id))
        .slice(0, 1);
      for (const card of additionalDefense) {
        selectedCards.push(card.id);
        totalBlockGained += card.block || 0;
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

  /**
   * 보스전 특화 대응 카드 선택
   */
  private selectBossFightResponses(
    reactionCards: GameCard[],
    analysis: TimelineAnalysis,
    alreadySelected: string[],
    state: GameBattleState
  ): GameCard[] {
    const selected: GameCard[] = [];
    const hpRatio = state.player.hp / state.player.maxHp;

    // 1. 고피해 적 카드에 우선 대응
    for (const dangerCard of analysis.dangerousCards) {
      const enemyCard = this.cards[dangerCard.cardId];
      if (!enemyCard) continue;

      const enemyDamage = (enemyCard.damage || 0) * (enemyCard.hits || 1);

      // 피해가 현재 HP의 30% 이상이면 반드시 대응
      if (enemyDamage >= state.player.hp * 0.3) {
        const counter = reactionCards.find(c =>
          !alreadySelected.includes(c.id) &&
          !selected.some(s => s.id === c.id) &&
          (c.block && c.block >= enemyDamage * 0.5 || c.parryRange)
        );
        if (counter) {
          selected.push(counter);
        }
      }
    }

    // 2. 보스 멀티히트 공격 대응 (blur/evasion 부여 카드)
    const multiHitEnemies = analysis.dangerousCards.filter(tc => {
      const card = this.cards[tc.cardId];
      return card && (card.hits || 1) > 1;
    });

    if (multiHitEnemies.length > 0) {
      const evasionCard = reactionCards.find(c =>
        !alreadySelected.includes(c.id) &&
        !selected.some(s => s.id === c.id) &&
        c.appliedTokens?.some(t =>
          (t.target === 'self' || t.target === 'player') &&
          (t.id === 'blur' || t.id === 'evasion' || t.id === 'agility')
        )
      );
      if (evasionCard) {
        selected.push(evasionCard);
      }
    }

    // 3. HP 낮을 때 최대 방어
    if (hpRatio < 0.35) {
      const bestDefense = reactionCards
        .filter(c =>
          !alreadySelected.includes(c.id) &&
          !selected.some(s => s.id === c.id) &&
          c.block && c.block > 0
        )
        .sort((a, b) => (b.block || 0) - (a.block || 0))[0];

      if (bestDefense) {
        selected.push(bestDefense);
      }
    }

    // 4. 반격 기회 활용 (보스 공격이 많을 때)
    if (analysis.dangerousCards.length >= 2) {
      const counterCard = reactionCards.find(c =>
        !alreadySelected.includes(c.id) &&
        !selected.some(s => s.id === c.id) &&
        (c.traits?.includes('counter') || c.traits?.includes('counterShot'))
      );
      if (counterCard) {
        selected.push(counterCard);
      }
    }

    return selected;
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
    const playerCards = state.timeline.filter(tc => tc.owner === 'player');
    const enemyCards = state.timeline.filter(tc => tc.owner === 'enemy');

    // 1. 플레이어 위협도 분석
    let expectedPlayerDamage = 0;
    const dangerousPlayerCards: { cardId: string; damage: number; position: number }[] = [];

    for (const tc of playerCards) {
      const card = this.cards[tc.cardId];
      if (!card) continue;

      if (card.damage) {
        const damage = card.damage * (card.hits || 1);
        expectedPlayerDamage += damage;
        if (damage >= 8) {
          dangerousPlayerCards.push({ cardId: tc.cardId, damage, position: tc.position });
        }
      }
    }

    // 2. 적 생존 위험 평가
    const hpRatio = state.enemy.hp / (state.enemy.maxHp || state.enemy.hp);
    const survivalRisk = expectedPlayerDamage >= state.enemy.hp;
    const highThreat = expectedPlayerDamage >= state.enemy.hp * 0.5;

    // 3. 적의 사용 가능한 대응 카드 확인 (이미 타임라인에 없는 카드)
    const usedCardIds = new Set(enemyCards.map(tc => tc.cardId));
    const availableReactionCards: GameCard[] = [];

    // 적 덱에서 reaction 타입 또는 defense 타입 카드 찾기
    for (const cardId of Object.keys(this.cards)) {
      const card = this.cards[cardId];
      if (!card) continue;

      // 적 카드인지 확인 (enemy 태그 또는 적 전용 카드)
      const isEnemyCard = card.tags?.includes('enemy') ||
                          cardId.includes('ghoul') ||
                          cardId.includes('marauder') ||
                          cardId.includes('slaughterer') ||
                          cardId.includes('deserter');

      if (!isEnemyCard) continue;
      if (usedCardIds.has(cardId)) continue;

      // 방어/대응 카드 확인
      if (card.type === 'defense' || card.type === 'reaction' || card.block) {
        availableReactionCards.push(card);
      }
    }

    // 4. 대응 결정
    if (availableReactionCards.length === 0) {
      return {
        shouldRespond: false,
        responseCards: [],
        reason: '사용 가능한 대응 카드 없음',
        expectedOutcome: { damagePrevented: 0, damageDealt: 0, blockGained: 0 },
      };
    }

    // 생존 위험이 높거나 고위협 상황에서 대응
    if (survivalRisk || (highThreat && hpRatio < 0.6)) {
      // 가장 효과적인 방어 카드 선택
      const sortedDefense = availableReactionCards.sort((a, b) => {
        const blockA = a.block || 0;
        const blockB = b.block || 0;
        return blockB - blockA;
      });

      const responseCards: string[] = [];
      let totalBlockGained = 0;
      let damagePrevented = 0;

      // 최대 2장까지 대응 카드 선택
      for (const card of sortedDefense.slice(0, 2)) {
        responseCards.push(card.id);
        totalBlockGained += card.block || 0;
      }

      // 방어로 막을 수 있는 피해량 계산
      damagePrevented = Math.min(totalBlockGained, expectedPlayerDamage);

      if (responseCards.length > 0) {
        return {
          shouldRespond: true,
          responseCards,
          reason: survivalRisk ? '생존 위협 - 긴급 방어' : '고위험 - 방어 대응',
          expectedOutcome: {
            damagePrevented,
            damageDealt: 0,
            blockGained: totalBlockGained,
          },
        };
      }
    }

    // 낮은 위협 상황에서는 대응 안함 (자원 보존)
    return {
      shouldRespond: false,
      responseCards: [],
      reason: '위협도 낮음 - 대응 불필요',
      expectedOutcome: { damagePrevented: 0, damageDealt: 0, blockGained: 0 },
    };
  }

  // ==================== 적 AI 카드 선택 강화 ====================

  /**
   * 적 AI의 교차 공격 결정
   * 플레이어 카드와 같은 위치에 카드 배치하여 교차 효과 활용
   */
  decideEnemyCrossAttack(
    state: GameBattleState,
    availableCards: GameCard[]
  ): { cardId: string; position: number } | null {
    const playerCards = state.timeline.filter(tc => tc.owner === 'player');

    // 플레이어 방어 카드 위치 찾기 (교차로 무력화 가능)
    for (const tc of playerCards) {
      const playerCard = this.cards[tc.cardId];
      if (!playerCard) continue;

      // 방어 카드에 교차 공격
      if (playerCard.type === 'defense' || playerCard.block) {
        // 공격 카드 찾기
        const attackCard = availableCards.find(c =>
          c.type === 'attack' && c.damage && c.damage >= (playerCard.block || 0)
        );

        if (attackCard) {
          return { cardId: attackCard.id, position: tc.position };
        }
      }
    }

    return null;
  }

  // ==================== 시뮬레이션 기반 평가 ====================

  /**
   * 시뮬레이션으로 카드 조합 평가
   * 각 카드 조합의 예상 결과를 시뮬레이션하여 최적 선택
   */
  evaluateWithSimulation(
    state: GameBattleState,
    candidateCards: GameCard[],
    iterations: number = 50
  ): { cardId: string; score: number; reason: string }[] {
    const results: { cardId: string; score: number; reason: string }[] = [];

    for (const card of candidateCards) {
      let totalScore = 0;
      let wins = 0;
      let totalDamageDealt = 0;
      let totalDamageTaken = 0;

      for (let i = 0; i < iterations; i++) {
        const result = this.simulateSingleOutcome(state, card);
        totalScore += result.score;
        if (result.win) wins++;
        totalDamageDealt += result.damageDealt;
        totalDamageTaken += result.damageTaken;
      }

      const avgScore = totalScore / iterations;
      const winRate = wins / iterations;
      const avgDamageDealt = totalDamageDealt / iterations;
      const avgDamageTaken = totalDamageTaken / iterations;

      results.push({
        cardId: card.id,
        score: avgScore,
        reason: `승률: ${(winRate * 100).toFixed(0)}%, 평균피해: ${avgDamageDealt.toFixed(1)}, 평균받는피해: ${avgDamageTaken.toFixed(1)}`,
      });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * 단일 시뮬레이션 결과
   */
  private simulateSingleOutcome(
    state: GameBattleState,
    card: GameCard
  ): { score: number; win: boolean; damageDealt: number; damageTaken: number } {
    // 간단한 몬테카를로 시뮬레이션
    let playerHp = state.player.hp;
    let enemyHp = state.enemy.hp;
    let playerBlock = state.player.block;
    let enemyBlock = state.enemy.block;

    // 플레이어 카드 효과 적용
    if (card.damage) {
      const hits = card.hits || 1;
      let totalDamage = 0;

      for (let h = 0; h < hits; h++) {
        let damage = card.damage + (state.player.strength || 0);

        // 취약 체크
        if (state.enemy.tokens?.['vulnerable']) {
          damage = Math.floor(damage * 1.5);
        }

        // 교차 보너스 (랜덤하게 교차 발생 가정)
        if (card.crossBonus && Math.random() < 0.3) {
          if (card.crossBonus.type === 'damage_mult') {
            damage = Math.floor(damage * (card.crossBonus.value || 1.5));
          }
        }

        const actualDamage = Math.max(0, damage - enemyBlock);
        enemyBlock = Math.max(0, enemyBlock - damage);
        enemyHp -= actualDamage;
        totalDamage += actualDamage;
      }
    }

    if (card.block) {
      playerBlock += card.block;
    }

    // 적 반격 시뮬레이션 (타임라인 기반)
    let damageTaken = 0;
    const enemyCards = state.timeline.filter(tc => tc.owner === 'enemy');

    for (const tc of enemyCards) {
      const enemyCard = this.cards[tc.cardId];
      if (!enemyCard?.damage) continue;

      let damage = enemyCard.damage * (enemyCard.hits || 1);
      damage += state.enemy.strength || 0;

      // 약화 체크
      if (state.enemy.tokens?.['weak']) {
        damage = Math.floor(damage * 0.75);
      }

      // 취약 체크
      if (state.player.tokens?.['vulnerable']) {
        damage = Math.floor(damage * 1.5);
      }

      const actualDamage = Math.max(0, damage - playerBlock);
      playerBlock = Math.max(0, playerBlock - damage);
      playerHp -= actualDamage;
      damageTaken += actualDamage;
    }

    // 점수 계산
    const playerHpRatio = playerHp / state.player.maxHp;
    const enemyHpRatio = enemyHp / (state.enemy.maxHp || state.enemy.hp);

    let score = 0;

    // 승리/패배 가중치
    if (enemyHp <= 0) {
      score = 100 + (playerHpRatio * 50); // 승리 + 남은 체력 보너스
    } else if (playerHp <= 0) {
      score = -100 + (1 - enemyHpRatio) * 50; // 패배 + 적에게 준 피해 보너스
    } else {
      // 진행 중
      score = (playerHpRatio - enemyHpRatio) * 50;
    }

    // 피해량 가중치
    const damageDealt = Math.max(0, state.enemy.hp - enemyHp);
    score += damageDealt * 0.5;
    score -= damageTaken * 0.3;

    return {
      score,
      win: enemyHp <= 0,
      damageDealt,
      damageTaken,
    };
  }

  /**
   * 시뮬레이션 기반 대응 결정 (고급)
   */
  decideResponseWithSimulation(
    state: GameBattleState,
    availableCards: GameCard[]
  ): ResponseDecision {
    const analysis = this.analyzeTimeline(state);
    const playerTokens = state.player.tokens || {};

    // 대응 가능한 카드 필터링
    const reactionCards = availableCards.filter(card => {
      if (!this.canUseCard(card, playerTokens)) return false;
      return (
        card.type === 'reaction' ||
        card.priority === 'instant' ||
        card.traits?.includes('counter') ||
        card.traits?.includes('counterShot') ||
        card.parryRange
      );
    });

    if (reactionCards.length === 0) {
      return {
        shouldRespond: false,
        responseCards: [],
        reason: '대응 카드 없음',
        expectedOutcome: { damagePrevented: 0, damageDealt: 0, blockGained: 0 },
      };
    }

    // 시뮬레이션으로 카드 평가
    const evaluatedCards = this.evaluateWithSimulation(
      state,
      reactionCards,
      this.config.simulationIterations
    );

    // 상위 카드 선택 (점수가 양수인 것만)
    const selectedCards = evaluatedCards
      .filter(c => c.score > 0)
      .slice(0, 3)
      .map(c => c.cardId);

    if (selectedCards.length === 0) {
      return {
        shouldRespond: false,
        responseCards: [],
        reason: '시뮬레이션 결과 대응 불필요',
        expectedOutcome: { damagePrevented: 0, damageDealt: 0, blockGained: 0 },
      };
    }

    // 예상 결과 계산
    let totalDamagePrevented = 0;
    let totalDamageDealt = 0;
    let totalBlockGained = 0;

    for (const cardId of selectedCards) {
      const card = reactionCards.find(c => c.id === cardId);
      if (!card) continue;
      if (card.block) totalBlockGained += card.block;
      if (card.damage) totalDamageDealt += card.damage * (card.hits || 1);
    }

    totalDamagePrevented = Math.min(analysis.expectedDamage, totalBlockGained);

    return {
      shouldRespond: true,
      responseCards: selectedCards,
      reason: `시뮬레이션 기반 선택 (${evaluatedCards[0]?.reason || ''})`,
      expectedOutcome: {
        damagePrevented: totalDamagePrevented,
        damageDealt: totalDamageDealt,
        blockGained: totalBlockGained,
      },
    };
  }

  // ==================== 보스전 특화 AI ====================

  /**
   * 보스 패턴 분석 및 대응 전략
   */
  analyzeBossPattern(
    state: GameBattleState,
    bossId: string,
    turn: number
  ): {
    currentPhase: string;
    expectedPattern: string;
    recommendedStrategy: 'offensive' | 'defensive' | 'balanced';
    warnings: string[];
  } {
    const bossPattern = BOSS_PATTERNS[bossId];
    if (!bossPattern) {
      return {
        currentPhase: 'unknown',
        expectedPattern: 'balanced',
        recommendedStrategy: 'balanced',
        warnings: [],
      };
    }

    const hpRatio = state.enemy.hp / (state.enemy.maxHp || state.enemy.hp);
    const playerHpRatio = state.player.hp / state.player.maxHp;

    // 현재 페이즈 판단
    let currentPhase = 'phase1';
    let currentPattern = bossPattern.phases.phase1.pattern;

    if (bossPattern.phases.enrage && hpRatio <= bossPattern.phases.enrage.hpThreshold) {
      currentPhase = 'enrage';
      currentPattern = bossPattern.phases.enrage.pattern;
    } else if (bossPattern.phases.phase3 && hpRatio <= bossPattern.phases.phase3.hpThreshold) {
      currentPhase = 'phase3';
      currentPattern = bossPattern.phases.phase3.pattern;
    } else if (hpRatio <= bossPattern.phases.phase2.hpThreshold) {
      currentPhase = 'phase2';
      currentPattern = bossPattern.phases.phase2.pattern;
    }

    // 특수 행동 체크
    const triggeredActions = checkBossSpecialActions(bossId, {
      hpRatio,
      turn,
      playerHpRatio,
      phaseChanged: false,
    });

    const warnings: string[] = triggeredActions.map(a => `주의: ${a.name} - ${a.effect.description}`);

    // 권장 전략 결정
    let recommendedStrategy: 'offensive' | 'defensive' | 'balanced' = 'balanced';

    if (currentPattern === 'berserk' || currentPhase === 'enrage') {
      recommendedStrategy = 'defensive'; // 광폭화 시 방어 우선
      warnings.push('보스 광폭화 - 방어 우선 권장');
    } else if (hpRatio <= 0.2 && playerHpRatio >= 0.5) {
      recommendedStrategy = 'offensive'; // 보스 체력 낮고 플레이어 안전하면 공격
      warnings.push('보스 체력 낮음 - 마무리 권장');
    } else if (playerHpRatio <= 0.3) {
      recommendedStrategy = 'defensive'; // 플레이어 위험하면 방어
      warnings.push('플레이어 위험 - 방어 우선');
    }

    return {
      currentPhase,
      expectedPattern: currentPattern,
      recommendedStrategy,
      warnings,
    };
  }

  /**
   * 보스전 대응 결정 (향상된 버전)
   */
  decideResponseForBoss(
    state: GameBattleState,
    availableCards: GameCard[],
    bossId: string,
    turn: number
  ): ResponseDecision {
    // 보스 패턴 분석
    const bossAnalysis = this.analyzeBossPattern(state, bossId, turn);

    // 전략에 따른 설정 조정
    const adjustedConfig = { ...this.config };
    switch (bossAnalysis.recommendedStrategy) {
      case 'defensive':
        adjustedConfig.aggressive = false;
        adjustedConfig.riskTolerance = 0.2;
        break;
      case 'offensive':
        adjustedConfig.aggressive = true;
        adjustedConfig.riskTolerance = 0.7;
        break;
    }

    // 기본 대응 결정 실행
    const originalConfig = this.config;
    this.config = adjustedConfig;

    let decision: ResponseDecision;
    if (this.config.useSimulation) {
      decision = this.decideResponseWithSimulation(state, availableCards);
    } else {
      decision = this.decideResponse(state, availableCards);
    }

    this.config = originalConfig;

    // 보스 경고 추가
    if (bossAnalysis.warnings.length > 0) {
      decision.reason += ` | ${bossAnalysis.warnings.join(', ')}`;
    }

    return decision;
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
