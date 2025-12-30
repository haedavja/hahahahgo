/**
 * @file cardPlaySpecialsProcessing.ts
 * @description 카드 플레이 특수 효과 처리 유틸리티
 *
 * ## 주요 기능
 * - processBonusCards: 콤보 스타일 보너스 카드 큐 삽입
 * - processNextTurnEffects: 다음 턴 효과 처리 (emergencyDraw, recallCard, addCardToHand 등)
 * - processRepeatMyTimeline: 노인의 꿈 타임라인 복제
 */

import { markCrossedCards } from './battleUtils';
import { duplicatePlayerCards, insertCardsIntoQueue } from './timelineQueueUtils';
import { drawFromDeck } from './handGeneration';
import { generateUid } from '../../../lib/randomUtils';
import type { Card, HandCard } from '../../../types/core';
import type { CardPlaySpecialsResult } from '../../../types/combat';
import type { OrderItem } from '../../../types';

/** 보너스 카드 처리 파라미터 */
interface BonusCardsParams {
  bonusCards: Card[];
  insertSp: number;
  currentQueue: OrderItem[];
  currentQIndex: number;
  addLog: (msg: string) => void;
}

/** 보너스 카드 처리 결과 */
interface BonusCardsResult {
  updatedQueue: OrderItem[];
  hasChanges: boolean;
}

/**
 * 콤보 스타일 보너스 카드를 큐에 삽입
 */
export function processBonusCards(params: BonusCardsParams): BonusCardsResult {
  const { bonusCards, insertSp, currentQueue, currentQIndex, addLog } = params;

  if (!bonusCards || bonusCards.length === 0) {
    return { updatedQueue: currentQueue, hasChanges: false };
  }

  const newActions = bonusCards.map((bonusCard: Card) => ({
    actor: 'player' as const,
    card: {
      ...bonusCard,
      // 카드 핵심 속성 명시적 복사 (손실 방지)
      damage: bonusCard.damage,
      block: bonusCard.block,
      hits: bonusCard.hits,
      speedCost: bonusCard.speedCost,
      actionCost: bonusCard.actionCost,
      type: bonusCard.type,
      cardCategory: bonusCard.cardCategory,
      special: bonusCard.special,
      traits: bonusCard.traits,
      isGhost: true,
      __uid: generateUid('combo')
    },
    sp: insertSp
  }));

  // 현재 인덱스 이후에 삽입
  const beforeCurrent = currentQueue.slice(0, currentQIndex + 1);
  const afterCurrent = [...currentQueue.slice(currentQIndex + 1), ...newActions];

  // sp 기준으로 정렬
  afterCurrent.sort((x, y) => {
    if ((x.sp ?? 0) !== (y.sp ?? 0)) return (x.sp ?? 0) - (y.sp ?? 0);
    if (x.card?.isGhost && !y.card?.isGhost) return -1;
    if (!x.card?.isGhost && y.card?.isGhost) return 1;
    return 0;
  });

  const newQueue = [...beforeCurrent, ...afterCurrent];
  const markedNewQueue = markCrossedCards(newQueue);

  addLog(`🔄 연계 효과: "${bonusCards.map((c: Card) => c.name).join(', ')}" 큐에 추가!`);

  return { updatedQueue: markedNewQueue as OrderItem[], hasChanges: true };
}

/** emergencyDraw 파라미터 */
interface EmergencyDrawParams {
  drawCount: number;
  currentDeck: HandCard[];
  currentDiscard: HandCard[];
  currentHand: HandCard[];
  vanishedCardIds: string[];
  escapeBan: Set<string>;
  addLog: (msg: string) => void;
}

/** emergencyDraw 결과 */
interface EmergencyDrawResult {
  newDeck: HandCard[];
  newDiscardPile: HandCard[];
  newHand: HandCard[];
  drawnCards: HandCard[];
  reshuffled: boolean;
}

/**
 * 비상대응: 즉시 덱에서 카드 뽑기
 */
export function processEmergencyDraw(params: EmergencyDrawParams): EmergencyDrawResult | null {
  const { drawCount, currentDeck, currentDiscard, currentHand, vanishedCardIds, escapeBan, addLog } = params;

  if (drawCount <= 0) return null;
  if (currentDeck.length === 0 && currentDiscard.length === 0) {
    addLog(`🚨 비상대응: 덱과 무덤에 카드가 없습니다.`);
    return null;
  }

  const drawResult = drawFromDeck(currentDeck, currentDiscard, drawCount, escapeBan, vanishedCardIds);
  const newHand = [...currentHand, ...drawResult.drawnCards];

  if (drawResult.reshuffled) {
    addLog('🔄 덱이 소진되어 무덤을 섞어 새 덱을 만들었습니다.');
  }
  addLog(`🚨 비상대응: ${drawResult.drawnCards.map(c => c.name).join(', ')} 즉시 손패에 추가!`);

  return {
    newDeck: drawResult.newDeck,
    newDiscardPile: drawResult.newDiscardPile,
    newHand,
    drawnCards: drawResult.drawnCards,
    reshuffled: drawResult.reshuffled
  };
}

/** addCardToHand 파라미터 */
interface AddCardToHandParams {
  cardId: string;
  allCards: Card[];
  currentHand: Card[];
  addLog: (msg: string) => void;
}

/** addCardToHand 결과 */
interface AddCardToHandResult {
  newHand: Card[];
  addedCard: Card | null;
}

/**
 * 엘 라피드: 즉시 손패에 카드 복사본 추가
 */
export function processAddCardToHand(params: AddCardToHandParams): AddCardToHandResult {
  const { cardId, allCards, currentHand, addLog } = params;

  const cardToAdd = allCards.find(c => c.id === cardId);
  if (!cardToAdd) {
    return { newHand: currentHand, addedCard: null };
  }

  const newCard = {
    ...cardToAdd,
    _instanceId: `${cardId}_copy_${Date.now()}`
  };
  const newHand = [...currentHand, newCard];
  addLog(`📋 ${cardToAdd.name} 복사본이 손패에 추가되었습니다!`);

  return { newHand, addedCard: newCard };
}

/** repeatMyTimeline 파라미터 */
interface RepeatMyTimelineParams {
  currentQueue: OrderItem[];
  currentCardId?: string;
  addLog: (msg: string) => void;
}

/** repeatMyTimeline 결과 */
interface RepeatMyTimelineResult {
  updatedQueue: OrderItem[];
  duplicatedCount: number;
}

/**
 * 노인의 꿈: 현재 턴 타임라인 즉시 복제
 */
export function processRepeatMyTimeline(params: RepeatMyTimelineParams): RepeatMyTimelineResult {
  const { currentQueue, currentCardId, addLog } = params;

  const maxSp = Math.max(...currentQueue.map((item: OrderItem) => item.sp ?? 0));

  const { duplicatedCards, count } = duplicatePlayerCards({
    queue: currentQueue,
    currentCardId,
    maxSp
  });

  if (count === 0) {
    return { updatedQueue: currentQueue, duplicatedCount: 0 };
  }

  const markedQueue = insertCardsIntoQueue({
    queue: currentQueue,
    cardsToInsert: duplicatedCards,
    afterIndex: currentQueue.length - 1
  }) as OrderItem[];

  addLog(`🔄 노인의 꿈: 타임라인 반복! ${count}장 복제됨`);

  return { updatedQueue: markedQueue, duplicatedCount: count };
}

/** 모든 nextTurnEffects 처리 파라미터 */
interface ProcessNextTurnEffectsParams {
  cardPlaySpecials: CardPlaySpecialsResult;
  currentSp: number;
  currentQueue: OrderItem[];
  currentQIndex: number;
  currentDeck: HandCard[];
  currentDiscard: HandCard[];
  currentHand: HandCard[];
  vanishedCardIds: string[];
  escapeBan: Set<string>;
  allCards: Card[];
  currentNextTurnEffects: Record<string, unknown>;
  currentCardId?: string;
  addLog: (msg: string) => void;
}

/** 모든 nextTurnEffects 처리 결과 */
interface ProcessNextTurnEffectsResult {
  updatedQueue: OrderItem[];
  updatedEffects: Record<string, unknown>;
  updatedDeck: HandCard[];
  updatedDiscardPile: HandCard[];
  updatedHand: HandCard[];
  recallTriggered: boolean;
  hasQueueChanges: boolean;
  hasDeckChanges: boolean;
  hasHandChanges: boolean;
}

/**
 * cardPlaySpecials의 모든 nextTurnEffects 처리
 */
export function processAllNextTurnEffects(params: ProcessNextTurnEffectsParams): ProcessNextTurnEffectsResult {
  const {
    cardPlaySpecials,
    currentSp,
    currentQueue,
    currentQIndex,
    currentDeck,
    currentDiscard,
    currentHand,
    vanishedCardIds,
    escapeBan,
    allCards,
    currentNextTurnEffects,
    currentCardId,
    addLog
  } = params;

  const { bonusCards, nextTurnEffects: newNextTurnEffects } = cardPlaySpecials;

  let updatedQueue = currentQueue;
  let updatedDeck = currentDeck;
  let updatedDiscardPile = currentDiscard;
  let updatedHand = currentHand;
  let hasQueueChanges = false;
  let hasDeckChanges = false;
  let hasHandChanges = false;
  let recallTriggered = false;

  // bonusCards 처리 (comboStyle): 큐에 유령카드로 추가
  if (bonusCards && bonusCards.length > 0) {
    const insertSp = currentSp + 1;
    const bonusResult = processBonusCards({
      bonusCards: bonusCards as Card[],
      insertSp,
      currentQueue: updatedQueue,
      currentQIndex,
      addLog
    });
    if (bonusResult.hasChanges) {
      updatedQueue = bonusResult.updatedQueue;
      hasQueueChanges = true;
    }
  }

  // nextTurnEffects 병합
  let updatedEffects = { ...currentNextTurnEffects };
  if (newNextTurnEffects) {
    updatedEffects = {
      ...updatedEffects,
      ...newNextTurnEffects,
      bonusEnergy: ((currentNextTurnEffects.bonusEnergy as number) || 0) + ((newNextTurnEffects as Record<string, unknown>).bonusEnergy as number || 0),
      maxSpeedBonus: ((currentNextTurnEffects.maxSpeedBonus as number) || 0) + ((newNextTurnEffects as Record<string, unknown>).maxSpeedBonus as number || 0),
      extraCardPlay: ((currentNextTurnEffects.extraCardPlay as number) || 0) + ((newNextTurnEffects as Record<string, unknown>).extraCardPlay as number || 0),
      fencingDamageBonus: ((currentNextTurnEffects.fencingDamageBonus as number) || 0) + ((newNextTurnEffects as Record<string, unknown>).fencingDamageBonus as number || 0)
    };

    const newEffectsTyped = newNextTurnEffects as Record<string, unknown>;

    // emergencyDraw 처리
    if (newEffectsTyped.emergencyDraw && (newEffectsTyped.emergencyDraw as number) > 0) {
      const drawResult = processEmergencyDraw({
        drawCount: newEffectsTyped.emergencyDraw as number,
        currentDeck: updatedDeck,
        currentDiscard: updatedDiscardPile,
        currentHand: updatedHand,
        vanishedCardIds,
        escapeBan,
        addLog
      });
      if (drawResult) {
        updatedDeck = drawResult.newDeck;
        updatedDiscardPile = drawResult.newDiscardPile;
        updatedHand = drawResult.newHand;
        hasDeckChanges = true;
        hasHandChanges = true;
      }
    }

    // recallCard 플래그 체크
    if (newEffectsTyped.recallCard) {
      recallTriggered = true;
    }

    // addCardToHand 처리
    if (newEffectsTyped.addCardToHand) {
      const addResult = processAddCardToHand({
        cardId: newEffectsTyped.addCardToHand as string,
        allCards,
        currentHand: updatedHand as Card[],
        addLog
      });
      if (addResult.addedCard) {
        updatedHand = addResult.newHand as HandCard[];
        hasHandChanges = true;
      }
    }

    // repeatMyTimeline 처리
    if (newEffectsTyped.repeatMyTimeline) {
      const repeatResult = processRepeatMyTimeline({
        currentQueue: updatedQueue,
        currentCardId,
        addLog
      });
      if (repeatResult.duplicatedCount > 0) {
        updatedQueue = repeatResult.updatedQueue;
        hasQueueChanges = true;
      }
      // 효과 사용 후 플래그 제거
      updatedEffects = { ...updatedEffects, repeatMyTimeline: false };
    }
  }

  return {
    updatedQueue,
    updatedEffects,
    updatedDeck,
    updatedDiscardPile,
    updatedHand,
    recallTriggered,
    hasQueueChanges,
    hasDeckChanges,
    hasHandChanges
  };
}
