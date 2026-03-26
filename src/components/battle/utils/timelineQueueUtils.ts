/**
 * @file timelineQueueUtils.ts
 * @description 타임라인 큐 조작 유틸리티
 */

import { markCrossedCards } from './battleUtils';

/** 큐 아이템 기본 타입 */
export interface QueueItem {
  actor: 'player' | 'enemy';
  sp?: number;
  [key: string]: unknown;
}

/** 타임라인 변경 정보 */
export interface TimelineChanges {
  advancePlayer: number;
  pushEnemy: number;
  pushLastEnemy: number;
}

interface ApplyTimelineChangesParams {
  queue: QueueItem[];
  currentIndex: number;
  timelineChanges: TimelineChanges;
}

/**
 * 타임라인 변경 사항을 큐에 적용
 * - advancePlayer: 플레이어 카드들을 앞당김
 * - pushEnemy: 적 카드들을 뒤로 밀기
 * - pushLastEnemy: 적의 마지막 카드만 밀기
 */
export function applyTimelineChanges(params: ApplyTimelineChangesParams): QueueItem[] {
  const { queue, currentIndex, timelineChanges } = params;

  if (timelineChanges.advancePlayer === 0 &&
      timelineChanges.pushEnemy === 0 &&
      timelineChanges.pushLastEnemy === 0) {
    return queue;
  }

  let updatedQueue = [...queue];

  // 플레이어 카드 앞당기기 (현재 카드 이후의 플레이어 카드들)
  if (timelineChanges.advancePlayer > 0) {
    updatedQueue = updatedQueue.map((item, idx) => {
      if (idx > currentIndex && item.actor === 'player') {
        return { ...item, sp: Math.max(0, (item.sp || 0) - timelineChanges.advancePlayer) };
      }
      return item;
    });
  }

  // 적 카드 뒤로 밀기 (현재 카드 이후의 적 카드들)
  if (timelineChanges.pushEnemy > 0) {
    updatedQueue = updatedQueue.map((item, idx) => {
      if (idx > currentIndex && item.actor === 'enemy') {
        return { ...item, sp: (item.sp || 0) + timelineChanges.pushEnemy };
      }
      return item;
    });
  }

  // 적의 마지막 카드만 밀기
  if (timelineChanges.pushLastEnemy > 0) {
    let lastEnemyIdx = -1;
    for (let i = updatedQueue.length - 1; i > currentIndex; i--) {
      if (updatedQueue[i].actor === 'enemy') {
        lastEnemyIdx = i;
        break;
      }
    }
    if (lastEnemyIdx !== -1) {
      updatedQueue = updatedQueue.map((item, idx) => {
        if (idx === lastEnemyIdx) {
          return { ...item, sp: (item.sp || 0) + timelineChanges.pushLastEnemy };
        }
        return item;
      });
    }
  }

  // 큐 재정렬 (sp 값 기준, 이미 처리된 카드들은 유지)
  const processedCards = updatedQueue.slice(0, currentIndex + 1);
  const remainingCards = updatedQueue.slice(currentIndex + 1);
  remainingCards.sort((a, b) => (a.sp || 0) - (b.sp || 0));
  updatedQueue = [...processedCards, ...remainingCards];

  // 겹침 체크
  return markCrossedCards(updatedQueue);
}

interface InsertCardsParams {
  queue: QueueItem[];
  cardsToInsert: QueueItem[];
  afterIndex: number;
}

/**
 * 큐에 카드 삽입 후 정렬 및 겹침 체크
 */
export function insertCardsIntoQueue(params: InsertCardsParams): QueueItem[] {
  const { queue, cardsToInsert, afterIndex } = params;

  if (cardsToInsert.length === 0) {
    return queue;
  }

  const newQueue = [...queue, ...cardsToInsert];

  // 처리된 카드들은 유지, 나머지만 정렬
  const processedCards = newQueue.slice(0, afterIndex + 1);
  const remainingCards = newQueue.slice(afterIndex + 1);
  remainingCards.sort((a, b) => (a.sp || 0) - (b.sp || 0));

  const sortedQueue = [...processedCards, ...remainingCards];
  return markCrossedCards(sortedQueue);
}

interface DuplicatePlayerCardsParams {
  queue: QueueItem[];
  currentCardId?: string;
  maxSp: number;
}

interface DuplicateResult {
  duplicatedCards: QueueItem[];
  count: number;
}

/**
 * 노인의 꿈: 플레이어 타임라인 복제
 * 현재 카드를 제외한 모든 플레이어 카드를 복제
 */
export function duplicatePlayerCards(params: DuplicatePlayerCardsParams): DuplicateResult {
  const { queue, currentCardId, maxSp } = params;

  // 전체 플레이어 카드 복제 (현재 카드 제외, 이미 복제된 카드 제외)
  const allPlayerCards = queue.filter((item) => {
    const itemCard = item.card as { id?: string } | undefined;
    const isDuplicate = item.isDuplicate as boolean | undefined;
    return item.actor === 'player' &&
           itemCard?.id !== currentCardId &&
           !isDuplicate;
  });

  if (allPlayerCards.length === 0) {
    return { duplicatedCards: [], count: 0 };
  }

  // 복제 카드 생성 (마지막 카드 sp + 0.1부터 시작)
  const duplicatedCards = allPlayerCards.map((item, idx) => ({
    ...item,
    sp: maxSp + 0.1 + (idx * 0.01),
    isDuplicate: true
  }));

  return { duplicatedCards, count: allPlayerCards.length };
}
