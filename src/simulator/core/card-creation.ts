/**
 * @file card-creation.ts
 * @description 카드 창조 시스템 (브리치, 플레쉬, 벙 데 라므, 총살 등)
 *
 * 시뮬레이터에서 카드 창조 효과를 처리합니다.
 * 실제 게임과 달리 AI가 자동으로 최적의 카드를 선택합니다.
 */

import type {
  GameCard,
  GameBattleState,
  TimelineCard,
} from './game-types';

// ==================== 카드 창조 결과 ====================

export interface CardCreationResult {
  /** 성공 여부 */
  success: boolean;
  /** 창조된 카드들 */
  createdCards: GameCard[];
  /** 선택된 카드 */
  selectedCard: GameCard | null;
  /** 삽입 위치 (속도) */
  insertPosition: number;
  /** 로그 메시지 */
  message: string;
}

export interface CreationPoolOptions {
  /** 카드 풀 필터 (fencing, gun, attack, defense 등) */
  category?: string;
  /** 카드 타입 필터 */
  type?: 'attack' | 'defense' | 'general' | 'support';
  /** 기교 소모 카드 제외 */
  excludeRequiredTokens?: boolean;
  /** 제외할 카드 ID */
  excludeIds?: string[];
  /** 창조할 카드 수 */
  count?: number;
}

// ==================== 카드 풀 생성 ====================

/**
 * 창조 카드 풀 생성
 */
export function generateCreationPool(
  allCards: Record<string, GameCard>,
  options: CreationPoolOptions = {}
): GameCard[] {
  const {
    category,
    type,
    excludeRequiredTokens = true,
    excludeIds = [],
    count = 3,
  } = options;

  const excludeSet = new Set(excludeIds);

  let pool = Object.values(allCards).filter(card => {
    // 제외 ID 체크
    if (excludeSet.has(card.id)) return false;

    // 기교 소모 카드 제외
    if (excludeRequiredTokens && card.requiredTokens && card.requiredTokens.length > 0) {
      return false;
    }

    // 카테고리 필터
    if (category && card.cardCategory !== category) return false;

    // 타입 필터
    if (type && card.type !== type) return false;

    // 기본 필터 (attack, defense, general, support 만)
    if (!type && !['attack', 'defense', 'general', 'support'].includes(card.type)) {
      return false;
    }

    return true;
  });

  // 셔플
  pool = shuffleArray(pool);

  // 중복 ID 방지하며 선택
  const result: GameCard[] = [];
  const usedIds = new Set<string>();

  for (const card of pool) {
    if (!usedIds.has(card.id) && result.length < count) {
      result.push(card);
      usedIds.add(card.id);
    }
  }

  return result;
}

// ==================== AI 카드 선택 ====================

/**
 * AI가 최적의 카드 선택
 * 상황에 따라 공격/방어 카드를 선택합니다.
 */
export function selectBestCard(
  cards: GameCard[],
  state: GameBattleState,
  actor: 'player' | 'enemy'
): GameCard | null {
  if (cards.length === 0) return null;

  const actorState = actor === 'player' ? state.player : state.enemy;
  const targetState = actor === 'player' ? state.enemy : state.player;

  // 점수 계산
  const scored = cards.map(card => {
    let score = 0;

    // 공격 카드 점수
    if (card.damage && card.damage > 0) {
      // 기본 피해량 점수
      score += card.damage * (card.hits || 1);

      // 적 체력이 낮으면 공격 우선
      if (targetState.hp < 30) {
        score += 20;
      }

      // 마무리 가능하면 최고 점수
      if (card.damage * (card.hits || 1) >= targetState.hp) {
        score += 100;
      }
    }

    // 방어 카드 점수
    if (card.block && card.block > 0) {
      score += card.block * 0.8;

      // 체력이 낮으면 방어 우선
      if (actorState.hp < actorState.maxHp * 0.3) {
        score += 30;
      }

      // 타임라인에 적 공격이 많으면 방어 우선
      const enemyAttacks = state.timeline.filter(tc =>
        tc.owner !== actor && !tc.executed
      ).length;
      score += enemyAttacks * 5;
    }

    // 특수 효과 보너스
    if (card.special) {
      const specials = Array.isArray(card.special) ? card.special : [card.special];
      for (const s of specials) {
        if (s === 'ignoreBlock' || s === 'piercing') score += 10;
        if (s === 'guaranteedCrit') score += 15;
        if (s === 'advanceTimeline') score += 5;
        if (s === 'pushEnemyTimeline') score += 5;
      }
    }

    // 낮은 속도 비용 보너스
    score += (10 - (card.speedCost || 5)) * 2;

    return { card, score };
  });

  // 최고 점수 카드 선택
  scored.sort((a, b) => b.score - a.score);
  return scored[0].card;
}

// ==================== 카드 창조 효과 처리 ====================

/**
 * 브리치 효과: 랜덤 3장 중 1장 선택
 */
export function createBreachCards(
  allCards: Record<string, GameCard>,
  state: GameBattleState,
  sourceCard: GameCard,
  currentPosition: number
): CardCreationResult {
  const pool = generateCreationPool(allCards, {
    excludeIds: ['breach', sourceCard.id],
  });

  if (pool.length === 0) {
    return {
      success: false,
      createdCards: [],
      selectedCard: null,
      insertPosition: 0,
      message: '창조할 카드가 없습니다',
    };
  }

  const selected = selectBestCard(pool, state, 'player');
  const spOffset = (sourceCard as GameCard & { breachSpOffset?: number }).breachSpOffset || 3;
  const insertPos = currentPosition + spOffset;

  return {
    success: true,
    createdCards: pool,
    selectedCard: selected,
    insertPosition: insertPos,
    message: `브리치: ${selected?.name} 창조 (위치: ${insertPos})`,
  };
}

/**
 * createAttackOnHit: 피해 성공시 공격 카드 창조 (최대 2번)
 */
export function createAttackOnHit(
  allCards: Record<string, GameCard>,
  state: GameBattleState,
  sourceCard: GameCard,
  currentPosition: number,
  hitCount: number = 1
): CardCreationResult[] {
  const results: CardCreationResult[] = [];
  const maxCreations = Math.min(hitCount, 2);

  for (let i = 0; i < maxCreations; i++) {
    const pool = generateCreationPool(allCards, {
      type: 'attack',
      excludeIds: [sourceCard.id, ...results.map(r => r.selectedCard?.id || '')],
      count: 3,
    });

    const selected = selectBestCard(pool, state, 'player');
    const insertPos = currentPosition + 1 + i;

    if (selected) {
      results.push({
        success: true,
        createdCards: pool,
        selectedCard: selected,
        insertPosition: insertPos,
        message: `피해 시 창조 ${i + 1}/${maxCreations}: ${selected.name} (위치: ${insertPos})`,
      });
    }
  }

  return results;
}

/**
 * createFencingCards3 (벙 데 라므): 검격 공격 카드 3장 창조
 */
export function createFencingCards(
  allCards: Record<string, GameCard>,
  state: GameBattleState,
  sourceCard: GameCard,
  currentPosition: number
): CardCreationResult[] {
  const results: CardCreationResult[] = [];
  const usedIds: string[] = [sourceCard.id];

  for (let i = 0; i < 3; i++) {
    const pool = generateCreationPool(allCards, {
      category: 'fencing',
      type: 'attack',
      excludeIds: usedIds,
      count: 3,
    });

    const selected = selectBestCard(pool, state, 'player');
    const insertPos = currentPosition + 1 + i;

    if (selected) {
      usedIds.push(selected.id);
      results.push({
        success: true,
        createdCards: pool,
        selectedCard: selected,
        insertPosition: insertPos,
        message: `벙 데 라므 ${i + 1}/3: ${selected.name} 창조`,
      });
    }
  }

  return results;
}

/**
 * executionSquad (총살): 총기 공격 카드 4장 창조
 */
export function createExecutionSquadCards(
  allCards: Record<string, GameCard>,
  state: GameBattleState,
  sourceCard: GameCard,
  currentPosition: number
): CardCreationResult[] {
  const results: CardCreationResult[] = [];
  const usedIds: string[] = [sourceCard.id];

  for (let i = 0; i < 4; i++) {
    const pool = generateCreationPool(allCards, {
      category: 'gun',
      type: 'attack',
      excludeIds: usedIds,
      count: 3,
    });

    const selected = selectBestCard(pool, state, 'player');
    const insertPos = currentPosition + 1 + i;

    if (selected) {
      usedIds.push(selected.id);
      results.push({
        success: true,
        createdCards: pool,
        selectedCard: selected,
        insertPosition: insertPos,
        message: `총살 ${i + 1}/4: ${selected.name} 창조`,
      });
    }
  }

  return results;
}

// ==================== 타임라인에 유령 카드 삽입 ====================

/**
 * 타임라인에 창조된 카드 삽입
 */
export function insertCreatedCardToTimeline(
  state: GameBattleState,
  card: GameCard,
  position: number,
  actor: 'player' | 'enemy'
): TimelineCard {
  const ghostCard: TimelineCard = {
    cardId: card.id,
    owner: actor,
    position,
    crossed: false,
    executed: false,
  };

  // 기존 위치에 다른 카드가 있으면 교차 체크
  const existingCards = state.timeline.filter(tc => tc.position === position && tc.owner !== actor);
  if (existingCards.length > 0) {
    ghostCard.crossed = true;
    existingCards.forEach(tc => tc.crossed = true);
  }

  // 삽입 및 정렬
  state.timeline.push(ghostCard);
  state.timeline.sort((a, b) => a.position - b.position);

  return ghostCard;
}

/**
 * 다중 창조 카드 삽입
 */
export function insertMultipleCreatedCards(
  state: GameBattleState,
  results: CardCreationResult[],
  actor: 'player' | 'enemy'
): TimelineCard[] {
  const insertedCards: TimelineCard[] = [];

  for (const result of results) {
    if (result.success && result.selectedCard) {
      const timelineCard = insertCreatedCardToTimeline(
        state,
        result.selectedCard,
        result.insertPosition,
        actor
      );
      insertedCards.push(timelineCard);
    }
  }

  return insertedCards;
}

// ==================== 유틸리티 ====================

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ==================== 카드 창조 시스템 통합 클래스 ====================

export class CardCreationSystem {
  private allCards: Record<string, GameCard>;

  constructor(allCards: Record<string, GameCard>) {
    this.allCards = allCards;
  }

  /**
   * 특수 효과에 따른 카드 창조 처리
   */
  processCreationEffect(
    special: string,
    state: GameBattleState,
    sourceCard: GameCard,
    timelineCard: TimelineCard,
    actor: 'player' | 'enemy',
    context: { hitCount?: number } = {}
  ): { created: TimelineCard[]; messages: string[] } {
    const messages: string[] = [];
    let created: TimelineCard[] = [];

    switch (special) {
      case 'breach': {
        const result = createBreachCards(
          this.allCards,
          state,
          sourceCard,
          timelineCard.position
        );
        if (result.success && result.selectedCard) {
          const tc = insertCreatedCardToTimeline(
            state,
            result.selectedCard,
            result.insertPosition,
            actor
          );
          created.push(tc);
          messages.push(result.message);
        }
        break;
      }

      case 'createAttackOnHit': {
        const results = createAttackOnHit(
          this.allCards,
          state,
          sourceCard,
          timelineCard.position,
          context.hitCount || 1
        );
        created = insertMultipleCreatedCards(state, results, actor);
        messages.push(...results.map(r => r.message));
        break;
      }

      case 'createFencingCards3': {
        const results = createFencingCards(
          this.allCards,
          state,
          sourceCard,
          timelineCard.position
        );
        created = insertMultipleCreatedCards(state, results, actor);
        messages.push(...results.map(r => r.message));
        break;
      }

      case 'executionSquad': {
        const results = createExecutionSquadCards(
          this.allCards,
          state,
          sourceCard,
          timelineCard.position
        );
        created = insertMultipleCreatedCards(state, results, actor);
        messages.push(...results.map(r => r.message));
        break;
      }
    }

    return { created, messages };
  }

  /**
   * 카드에 창조 효과가 있는지 확인
   */
  hasCreationEffect(card: GameCard): boolean {
    if (!card.special) return false;
    const specials = Array.isArray(card.special) ? card.special : [card.special];
    return specials.some(s =>
      ['breach', 'createAttackOnHit', 'createFencingCards3', 'executionSquad'].includes(s)
    );
  }

  /**
   * 창조 효과 목록 추출
   */
  getCreationEffects(card: GameCard): string[] {
    if (!card.special) return [];
    const specials = Array.isArray(card.special) ? card.special : [card.special];
    return specials.filter(s =>
      ['breach', 'createAttackOnHit', 'createFencingCards3', 'executionSquad'].includes(s)
    );
  }
}
