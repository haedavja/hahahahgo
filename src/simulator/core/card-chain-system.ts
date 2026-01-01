/**
 * @file card-chain-system.ts
 * @description 복잡한 카드 상호작용 시스템 - 연계/후속/마무리, 창조/유령 카드
 *
 * ## 연계 시스템
 * - 연계(chain): 카드 사용 후 '후속' 또는 '마무리' 특성 카드 사용 가능
 * - 후속(followup): 연계 후 사용 시 보너스 효과
 * - 마무리(finisher): 연계 체인의 끝, 강력한 효과
 *
 * ## 창조/유령 시스템
 * - 창조(create): 전투 중 임시 카드 생성
 * - 유령(ghost): 창조된 카드, 전투 후 사라짐
 */

import type { GameCard, GameBattleState, TimelineCard } from './game-types';
import { addToken, getTokenStacks, hasToken, removeToken } from './token-system';

// ==================== 타입 정의 ====================

export interface ChainState {
  /** 현재 연계 중인지 */
  isChaining: boolean;
  /** 연계 시작 카드 ID */
  chainStartCard: string | null;
  /** 연계 체인 길이 */
  chainLength: number;
  /** 연계로 축적된 보너스 */
  accumulatedBonus: {
    damage: number;
    block: number;
    speedReduction: number;
  };
  /** 마지막 연계 카드 타입 */
  lastChainType: 'chain' | 'followup' | 'finisher' | null;
}

export interface CardCreation {
  /** 생성할 카드 ID */
  cardId: string;
  /** 카드 수량 */
  count: number;
  /** 유령 카드 여부 */
  isGhost: boolean;
  /** 강화 레벨 계승 여부 */
  inheritEnhancement: boolean;
  /** 생성 위치 */
  destination: 'hand' | 'deck' | 'timeline';
  /** 타임라인 위치 (destination이 timeline인 경우) */
  timelinePosition?: number;
}

export interface ChainResult {
  /** 연계 성공 여부 */
  success: boolean;
  /** 보너스 피해 */
  bonusDamage: number;
  /** 보너스 방어 */
  bonusBlock: number;
  /** 속도 감소 */
  speedReduction: number;
  /** 추가 효과 */
  effects: string[];
  /** 연계 종료 여부 */
  chainEnded: boolean;
}

export interface GhostCardState {
  /** 유령 카드 목록 */
  ghostCards: string[];
  /** 유령 카드 강화 레벨 */
  ghostEnhancements: Record<string, number>;
}

// ==================== 연계 시스템 ====================

/**
 * 초기 연계 상태 생성
 */
export function createChainState(): ChainState {
  return {
    isChaining: false,
    chainStartCard: null,
    chainLength: 0,
    accumulatedBonus: {
      damage: 0,
      block: 0,
      speedReduction: 0,
    },
    lastChainType: null,
  };
}

/**
 * 카드가 연계 특성을 가지고 있는지 확인
 */
export function hasChainTrait(card: GameCard): boolean {
  return card.traits?.includes('chain') ?? false;
}

/**
 * 카드가 후속 특성을 가지고 있는지 확인
 */
export function hasFollowupTrait(card: GameCard): boolean {
  return card.traits?.includes('followup') ?? false;
}

/**
 * 카드가 마무리 특성을 가지고 있는지 확인
 */
export function hasFinisherTrait(card: GameCard): boolean {
  return card.traits?.includes('finisher') ?? false;
}

/**
 * 연계 시작 처리
 */
export function startChain(
  chainState: ChainState,
  card: GameCard
): ChainState {
  if (!hasChainTrait(card)) {
    return chainState;
  }

  return {
    isChaining: true,
    chainStartCard: card.id,
    chainLength: 1,
    accumulatedBonus: {
      damage: 0,
      block: 0,
      speedReduction: card.chainSpeedReduction || 3, // 기본 3 속도 감소
    },
    lastChainType: 'chain',
  };
}

/**
 * 후속 카드 처리
 */
export function processFollowup(
  chainState: ChainState,
  card: GameCard,
  playerTokens: Record<string, number>
): ChainResult {
  if (!chainState.isChaining || !hasFollowupTrait(card)) {
    return {
      success: false,
      bonusDamage: 0,
      bonusBlock: 0,
      speedReduction: 0,
      effects: [],
      chainEnded: false,
    };
  }

  const effects: string[] = [];

  // 연계 길이 증가
  const newChainLength = chainState.chainLength + 1;

  // 후속 보너스 계산
  let bonusDamage = card.followupDamageBonus || 3;
  let bonusBlock = card.followupBlockBonus || 0;
  let speedReduction = card.chainSpeedReduction || 2;

  // 기교 스택에 따른 추가 보너스
  const finesseStacks = getTokenStacks(playerTokens, 'finesse');
  if (finesseStacks > 0) {
    bonusDamage += Math.floor(finesseStacks * 0.5);
    effects.push(`기교 보너스: +${Math.floor(finesseStacks * 0.5)} 피해`);
  }

  // 연계 길이에 따른 누적 보너스
  const chainBonus = (newChainLength - 1) * 2;
  bonusDamage += chainBonus;
  effects.push(`연계 ${newChainLength}단: +${chainBonus} 피해`);

  effects.push(`후속 보너스: +${bonusDamage} 피해`);

  return {
    success: true,
    bonusDamage: bonusDamage + chainState.accumulatedBonus.damage,
    bonusBlock: bonusBlock + chainState.accumulatedBonus.block,
    speedReduction: speedReduction + chainState.accumulatedBonus.speedReduction,
    effects,
    chainEnded: false,
  };
}

/**
 * 마무리 카드 처리
 */
export function processFinisher(
  chainState: ChainState,
  card: GameCard,
  playerTokens: Record<string, number>
): ChainResult {
  if (!chainState.isChaining || !hasFinisherTrait(card)) {
    return {
      success: false,
      bonusDamage: 0,
      bonusBlock: 0,
      speedReduction: 0,
      effects: [],
      chainEnded: false,
    };
  }

  const effects: string[] = [];

  // 마무리 보너스 계산 (연계 길이에 비례)
  const chainMultiplier = Math.min(3, 1 + chainState.chainLength * 0.5);
  let bonusDamage = Math.floor((card.finisherDamageBonus || 5) * chainMultiplier);
  let bonusBlock = 0;

  // 기교 소모하여 추가 피해
  const finesseStacks = getTokenStacks(playerTokens, 'finesse');
  if (finesseStacks > 0 && card.consumeFinesse) {
    bonusDamage += finesseStacks * 2;
    effects.push(`기교 ${finesseStacks} 소모: +${finesseStacks * 2} 피해`);
  }

  // 연계 누적 보너스 적용
  bonusDamage += chainState.accumulatedBonus.damage;
  bonusBlock += chainState.accumulatedBonus.block;

  effects.push(`마무리 보너스: +${bonusDamage} 피해 (x${chainMultiplier.toFixed(1)})`);
  effects.push(`연계 ${chainState.chainLength + 1}단 완료!`);

  return {
    success: true,
    bonusDamage,
    bonusBlock,
    speedReduction: 0, // 마무리는 속도 감소 없음
    effects,
    chainEnded: true,
  };
}

/**
 * 연계 상태 업데이트
 */
export function updateChainState(
  chainState: ChainState,
  card: GameCard,
  result: ChainResult
): ChainState {
  if (result.chainEnded) {
    // 연계 종료
    return createChainState();
  }

  if (!result.success && !hasChainTrait(card)) {
    // 연계 중이 아닌 카드 사용 시 연계 끊김
    if (chainState.isChaining && !hasFollowupTrait(card) && !hasFinisherTrait(card)) {
      return createChainState();
    }
  }

  // 연계 상태 업데이트
  if (hasChainTrait(card)) {
    return startChain(chainState, card);
  }

  if (hasFollowupTrait(card) && result.success) {
    return {
      ...chainState,
      chainLength: chainState.chainLength + 1,
      accumulatedBonus: {
        damage: chainState.accumulatedBonus.damage + (result.bonusDamage / 2),
        block: chainState.accumulatedBonus.block + result.bonusBlock,
        speedReduction: chainState.accumulatedBonus.speedReduction + result.speedReduction,
      },
      lastChainType: 'followup',
    };
  }

  return chainState;
}

/**
 * 연계 가능한 카드 필터링
 */
export function filterChainableCards(
  hand: GameCard[],
  chainState: ChainState
): GameCard[] {
  if (!chainState.isChaining) {
    // 연계 중이 아니면 연계 시작 카드만
    return hand.filter(card => hasChainTrait(card));
  }

  // 연계 중이면 후속/마무리 카드 가능
  return hand.filter(card =>
    hasFollowupTrait(card) || hasFinisherTrait(card)
  );
}

// ==================== 창조/유령 시스템 ====================

/**
 * 유령 카드 상태 생성
 */
export function createGhostCardState(): GhostCardState {
  return {
    ghostCards: [],
    ghostEnhancements: {},
  };
}

/**
 * 카드 창조
 */
export function createCard(
  state: GameBattleState,
  creation: CardCreation,
  cardLibrary: Record<string, GameCard>
): { success: boolean; createdCards: GameCard[]; effects: string[] } {
  const effects: string[] = [];
  const createdCards: GameCard[] = [];

  const baseCard = cardLibrary[creation.cardId];
  if (!baseCard) {
    return { success: false, createdCards: [], effects: ['카드를 찾을 수 없음'] };
  }

  for (let i = 0; i < creation.count; i++) {
    // 유령 카드 생성
    const ghostCard: GameCard = {
      ...baseCard,
      id: `${baseCard.id}_ghost_${Date.now()}_${i}`,
      isGhost: creation.isGhost,
    };

    // 강화 레벨 계승
    if (creation.inheritEnhancement && state.player.cardEnhancements) {
      const sourceEnhancement = state.player.cardEnhancements[creation.cardId] || 0;
      if (sourceEnhancement > 0) {
        // 강화 효과 적용
        if (ghostCard.damage) {
          ghostCard.damage += sourceEnhancement;
        }
        if (ghostCard.block) {
          ghostCard.block += Math.floor(sourceEnhancement * 0.5);
        }
      }
    }

    createdCards.push(ghostCard);

    // 목적지에 따라 카드 배치
    switch (creation.destination) {
      case 'hand':
        state.player.hand.push(ghostCard.id);
        effects.push(`${ghostCard.name} 손패에 추가`);
        break;
      case 'deck':
        // 덱 상단에 추가
        state.player.deck.unshift(ghostCard.id);
        effects.push(`${ghostCard.name} 덱 상단에 추가`);
        break;
      case 'timeline':
        // 타임라인에 직접 배치
        const timelineCard: TimelineCard = {
          cardId: ghostCard.id,
          owner: 'player',
          position: creation.timelinePosition || 5,
          executed: false,
          crossed: false,
        };
        state.timeline.push(timelineCard);
        effects.push(`${ghostCard.name} 타임라인에 배치`);
        break;
    }

    // 유령 카드 추적
    if (creation.isGhost) {
      if (!state.ghostCards) {
        state.ghostCards = [];
      }
      state.ghostCards.push(ghostCard.id);
    }
  }

  return {
    success: true,
    createdCards,
    effects,
  };
}

/**
 * 특정 창조 효과 실행
 */
export function executeCreationEffect(
  state: GameBattleState,
  effectType: string,
  cardLibrary: Record<string, GameCard>
): { success: boolean; effects: string[] } {
  switch (effectType) {
    case 'breach':
      // 브리치: 무작위 검격 카드 창조
      return createCard(state, {
        cardId: getRandomFencingCard(cardLibrary),
        count: 1,
        isGhost: true,
        inheritEnhancement: false,
        destination: 'timeline',
        timelinePosition: 3,
      }, cardLibrary);

    case 'createFencingCards3':
      // 검격 카드 3장 창조
      const fencingCards = ['strike', 'lunge', 'fleche'];
      const effects: string[] = [];
      for (const cardId of fencingCards) {
        const result = createCard(state, {
          cardId,
          count: 1,
          isGhost: true,
          inheritEnhancement: true,
          destination: 'hand',
        }, cardLibrary);
        effects.push(...result.effects);
      }
      return { success: true, effects };

    case 'executionSquad':
      // 총격 창조
      return createCard(state, {
        cardId: 'shoot',
        count: 3,
        isGhost: true,
        inheritEnhancement: false,
        destination: 'timeline',
        timelinePosition: 2,
      }, cardLibrary);

    case 'createAttackOnHit':
      // 피해 시 공격 카드 창조
      return createCard(state, {
        cardId: 'strike',
        count: 1,
        isGhost: true,
        inheritEnhancement: false,
        destination: 'hand',
      }, cardLibrary);

    default:
      return { success: false, effects: [`알 수 없는 창조 효과: ${effectType}`] };
  }
}

/**
 * 무작위 검격 카드 ID 반환
 */
function getRandomFencingCard(cardLibrary: Record<string, GameCard>): string {
  const fencingCards = Object.values(cardLibrary)
    .filter(card => card.cardCategory === 'fencing' && card.type === 'attack')
    .map(card => card.id);

  if (fencingCards.length === 0) {
    return 'strike'; // 기본값
  }

  return fencingCards[Math.floor(Math.random() * fencingCards.length)];
}

/**
 * 전투 종료 시 유령 카드 제거
 */
export function removeGhostCards(state: GameBattleState): void {
  if (!state.ghostCards) return;

  // 손패에서 제거
  state.player.hand = state.player.hand.filter(id => !state.ghostCards!.includes(id));

  // 덱에서 제거
  state.player.deck = state.player.deck.filter(id => !state.ghostCards!.includes(id));

  // 버린 카드에서 제거
  state.player.discard = state.player.discard.filter(id => !state.ghostCards!.includes(id));

  // 유령 카드 목록 초기화
  state.ghostCards = [];
}

// ==================== 협력/독립 특성 ====================

/**
 * 협력 특성 체크 (동일 카테고리 카드와 함께 사용 시 보너스)
 */
export function checkCooperation(
  card: GameCard,
  otherCards: GameCard[]
): { bonus: number; effects: string[] } {
  if (!card.traits?.includes('cooperation')) {
    return { bonus: 0, effects: [] };
  }

  const sameCategory = otherCards.filter(c =>
    c.cardCategory === card.cardCategory && c.id !== card.id
  ).length;

  if (sameCategory > 0) {
    const bonus = sameCategory * 2;
    return {
      bonus,
      effects: [`협력 보너스: +${bonus} (동일 카테고리 ${sameCategory}장)`],
    };
  }

  return { bonus: 0, effects: [] };
}

/**
 * 독립 특성 체크 (혼자 사용 시 보너스)
 */
export function checkIndependence(
  card: GameCard,
  otherCards: GameCard[]
): { bonus: number; effects: string[] } {
  if (!card.traits?.includes('independence')) {
    return { bonus: 0, effects: [] };
  }

  if (otherCards.length === 0) {
    const bonus = 5;
    return {
      bonus,
      effects: [`독립 보너스: +${bonus} (단독 사용)`],
    };
  }

  return { bonus: 0, effects: [] };
}

// ==================== 양날의 검 특성 ====================

/**
 * 양날의 검 체크 (자해 효과)
 */
export function processDoubleEdge(
  card: GameCard,
  playerHp: number
): { selfDamage: number; bonusDamage: number; effects: string[] } {
  if (!card.traits?.includes('double_edge')) {
    return { selfDamage: 0, bonusDamage: 0, effects: [] };
  }

  const selfDamage = card.doubleEdgeSelfDamage || 5;
  const bonusDamage = card.doubleEdgeBonusDamage || Math.floor(selfDamage * 1.5);

  return {
    selfDamage,
    bonusDamage,
    effects: [`양날의 검: 자해 ${selfDamage}, 추가 피해 +${bonusDamage}`],
  };
}

// ==================== 헬퍼 함수 ====================

/**
 * 카드의 모든 특수 상호작용 처리
 */
export function processAllCardInteractions(
  state: GameBattleState,
  card: GameCard,
  otherPlayedCards: GameCard[],
  chainState: ChainState,
  cardLibrary: Record<string, GameCard>
): {
  chainResult: ChainResult;
  newChainState: ChainState;
  cooperationBonus: number;
  independenceBonus: number;
  doubleEdge: { selfDamage: number; bonusDamage: number };
  creationEffects: string[];
  allEffects: string[];
} {
  const allEffects: string[] = [];

  // 연계 처리
  let chainResult: ChainResult;
  if (hasChainTrait(card)) {
    chainResult = {
      success: true,
      bonusDamage: 0,
      bonusBlock: 0,
      speedReduction: card.chainSpeedReduction || 3,
      effects: ['연계 시작'],
      chainEnded: false,
    };
  } else if (hasFollowupTrait(card)) {
    chainResult = processFollowup(chainState, card, state.player.tokens);
  } else if (hasFinisherTrait(card)) {
    chainResult = processFinisher(chainState, card, state.player.tokens);
  } else {
    chainResult = {
      success: false,
      bonusDamage: 0,
      bonusBlock: 0,
      speedReduction: 0,
      effects: [],
      chainEnded: chainState.isChaining, // 연계 끊김
    };
  }
  allEffects.push(...chainResult.effects);

  // 연계 상태 업데이트
  const newChainState = updateChainState(chainState, card, chainResult);

  // 협력 체크
  const cooperation = checkCooperation(card, otherPlayedCards);
  allEffects.push(...cooperation.effects);

  // 독립 체크
  const independence = checkIndependence(card, otherPlayedCards);
  allEffects.push(...independence.effects);

  // 양날의 검 체크
  const doubleEdge = processDoubleEdge(card, state.player.hp);
  allEffects.push(...doubleEdge.effects);

  // 창조 효과 처리
  const creationEffects: string[] = [];
  if (card.creationEffect) {
    const creationResult = executeCreationEffect(state, card.creationEffect, cardLibrary);
    creationEffects.push(...creationResult.effects);
    allEffects.push(...creationResult.effects);
  }

  return {
    chainResult,
    newChainState,
    cooperationBonus: cooperation.bonus,
    independenceBonus: independence.bonus,
    doubleEdge,
    creationEffects,
    allEffects,
  };
}
