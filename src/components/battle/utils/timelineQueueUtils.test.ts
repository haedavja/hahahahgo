/**
 * @file timelineQueueUtils.test.ts
 * @description 타임라인 큐 조작 유틸리티 테스트
 */

import { describe, it, expect, vi } from 'vitest';
import {
  applyTimelineChanges,
  insertCardsIntoQueue,
  duplicatePlayerCards,
  type QueueItem,
  type TimelineChanges,
} from './timelineQueueUtils';

// Mock battleUtils
vi.mock('./battleUtils', () => ({
  markCrossedCards: vi.fn((queue) => queue),
}));

describe('timelineQueueUtils', () => {
  describe('applyTimelineChanges', () => {
    it('변경 사항이 없으면 원본 큐를 반환한다', () => {
      const queue: QueueItem[] = [
        { actor: 'player', sp: 1 },
        { actor: 'enemy', sp: 2 },
      ];
      const timelineChanges: TimelineChanges = {
        advancePlayer: 0,
        pushEnemy: 0,
        pushLastEnemy: 0,
      };

      const result = applyTimelineChanges({
        queue,
        currentIndex: 0,
        timelineChanges,
      });

      expect(result).toBe(queue);
    });

    it('advancePlayer가 플레이어 카드 SP를 줄인다', () => {
      const queue: QueueItem[] = [
        { actor: 'player', sp: 1 },
        { actor: 'player', sp: 5 },
        { actor: 'enemy', sp: 3 },
      ];
      const timelineChanges: TimelineChanges = {
        advancePlayer: 2,
        pushEnemy: 0,
        pushLastEnemy: 0,
      };

      const result = applyTimelineChanges({
        queue,
        currentIndex: 0,
        timelineChanges,
      });

      // 인덱스 0 이후의 플레이어 카드 (인덱스 1)의 sp가 5-2=3
      const playerCard = result.find(item => item.sp === 3 && item.actor === 'player');
      expect(playerCard).toBeDefined();
    });

    it('SP가 0 미만으로 내려가지 않는다', () => {
      const queue: QueueItem[] = [
        { actor: 'player', sp: 1 },
        { actor: 'player', sp: 1 },
      ];
      const timelineChanges: TimelineChanges = {
        advancePlayer: 10,
        pushEnemy: 0,
        pushLastEnemy: 0,
      };

      const result = applyTimelineChanges({
        queue,
        currentIndex: 0,
        timelineChanges,
      });

      expect(result[1].sp).toBe(0);
    });

    it('pushEnemy가 적 카드 SP를 늘린다', () => {
      const queue: QueueItem[] = [
        { actor: 'player', sp: 1 },
        { actor: 'enemy', sp: 3 },
        { actor: 'enemy', sp: 5 },
      ];
      const timelineChanges: TimelineChanges = {
        advancePlayer: 0,
        pushEnemy: 2,
        pushLastEnemy: 0,
      };

      const result = applyTimelineChanges({
        queue,
        currentIndex: 0,
        timelineChanges,
      });

      // 적 카드들의 SP가 2씩 증가
      const enemyCards = result.filter(item => item.actor === 'enemy');
      expect(enemyCards[0].sp).toBe(5); // 3+2
      expect(enemyCards[1].sp).toBe(7); // 5+2
    });

    it('pushLastEnemy가 마지막 적 카드만 밀어낸다', () => {
      const queue: QueueItem[] = [
        { actor: 'player', sp: 1 },
        { actor: 'enemy', sp: 3 },
        { actor: 'enemy', sp: 5 },
      ];
      const timelineChanges: TimelineChanges = {
        advancePlayer: 0,
        pushEnemy: 0,
        pushLastEnemy: 3,
      };

      const result = applyTimelineChanges({
        queue,
        currentIndex: 0,
        timelineChanges,
      });

      // 마지막 적 카드만 SP 증가
      const enemyCards = result.filter(item => item.actor === 'enemy');
      expect(enemyCards[0].sp).toBe(3); // 변경 없음
      expect(enemyCards[1].sp).toBe(8); // 5+3
    });

    it('큐를 SP 기준으로 재정렬한다', () => {
      const queue: QueueItem[] = [
        { actor: 'player', sp: 1 },
        { actor: 'enemy', sp: 5 },
        { actor: 'player', sp: 8 },
      ];
      const timelineChanges: TimelineChanges = {
        advancePlayer: 5,
        pushEnemy: 0,
        pushLastEnemy: 0,
      };

      const result = applyTimelineChanges({
        queue,
        currentIndex: 0,
        timelineChanges,
      });

      // 플레이어 카드(sp 8-5=3)가 적 카드(sp 5)보다 앞으로
      const remainingCards = result.slice(1);
      expect(remainingCards[0].sp).toBeLessThanOrEqual(remainingCards[1].sp!);
    });
  });

  describe('insertCardsIntoQueue', () => {
    it('빈 카드 배열이면 원본 큐를 반환한다', () => {
      const queue: QueueItem[] = [
        { actor: 'player', sp: 1 },
      ];

      const result = insertCardsIntoQueue({
        queue,
        cardsToInsert: [],
        afterIndex: 0,
      });

      expect(result).toBe(queue);
    });

    it('카드를 큐에 삽입하고 정렬한다', () => {
      const queue: QueueItem[] = [
        { actor: 'player', sp: 1 },
        { actor: 'enemy', sp: 5 },
      ];
      const cardsToInsert: QueueItem[] = [
        { actor: 'player', sp: 3 },
      ];

      const result = insertCardsIntoQueue({
        queue,
        cardsToInsert,
        afterIndex: 0,
      });

      expect(result.length).toBe(3);
      // afterIndex 이후의 카드들이 SP 기준 정렬됨
      const remaining = result.slice(1);
      expect(remaining[0].sp).toBeLessThanOrEqual(remaining[1].sp!);
    });
  });

  describe('duplicatePlayerCards', () => {
    it('플레이어 카드를 복제한다', () => {
      const queue: QueueItem[] = [
        { actor: 'player', sp: 1, card: { id: 'card1' } },
        { actor: 'player', sp: 2, card: { id: 'card2' } },
        { actor: 'enemy', sp: 3 },
      ];

      const result = duplicatePlayerCards({
        queue,
        currentCardId: 'card1',
        maxSp: 5,
      });

      // 현재 카드(card1)을 제외한 플레이어 카드 1개 복제
      expect(result.count).toBe(1);
      expect(result.duplicatedCards.length).toBe(1);
      expect(result.duplicatedCards[0].isDuplicate).toBe(true);
    });

    it('복제된 카드는 maxSp 이후의 sp를 가진다', () => {
      const queue: QueueItem[] = [
        { actor: 'player', sp: 1, card: { id: 'card1' } },
        { actor: 'player', sp: 2, card: { id: 'card2' } },
      ];

      const result = duplicatePlayerCards({
        queue,
        currentCardId: 'card1',
        maxSp: 5,
      });

      expect(result.duplicatedCards[0].sp).toBeGreaterThan(5);
    });

    it('이미 복제된 카드는 다시 복제하지 않는다', () => {
      const queue: QueueItem[] = [
        { actor: 'player', sp: 1, card: { id: 'card1' } },
        { actor: 'player', sp: 2, card: { id: 'card2' }, isDuplicate: true },
      ];

      const result = duplicatePlayerCards({
        queue,
        currentCardId: 'card1',
        maxSp: 5,
      });

      expect(result.count).toBe(0);
    });

    it('플레이어 카드가 없으면 빈 결과를 반환한다', () => {
      const queue: QueueItem[] = [
        { actor: 'enemy', sp: 1 },
        { actor: 'enemy', sp: 2 },
      ];

      const result = duplicatePlayerCards({
        queue,
        maxSp: 5,
      });

      expect(result.count).toBe(0);
      expect(result.duplicatedCards).toEqual([]);
    });

    it('적 카드는 복제하지 않는다', () => {
      const queue: QueueItem[] = [
        { actor: 'player', sp: 1, card: { id: 'card1' } },
        { actor: 'enemy', sp: 2, card: { id: 'enemy1' } },
      ];

      const result = duplicatePlayerCards({
        queue,
        currentCardId: 'card1',
        maxSp: 5,
      });

      expect(result.count).toBe(0);
    });
  });
});
