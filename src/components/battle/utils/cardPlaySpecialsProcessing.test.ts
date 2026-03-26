/**
 * cardPlaySpecialsProcessing.test.ts
 * 카드 플레이 특수 효과 처리 유틸리티 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  processBonusCards,
  processEmergencyDraw,
  processAddCardToHand,
  processRepeatMyTimeline,
  processAllNextTurnEffects,
} from './cardPlaySpecialsProcessing';
import type { Card } from '../../../types/core';
import type { HandCard } from '../../../types/systems';
import type { OrderItem } from '../../../types';

// Mocks
vi.mock('./battleUtils', () => ({
  markCrossedCards: vi.fn((queue) => queue),
}));

vi.mock('./timelineQueueUtils', () => ({
  duplicatePlayerCards: vi.fn(({ queue }) => ({
    duplicatedCards: queue.filter((item: OrderItem) => item.actor === 'player').map((item: OrderItem) => ({
      ...item,
      card: { ...item.card, __uid: 'duplicated_' + item.card?.id }
    })),
    count: queue.filter((item: OrderItem) => item.actor === 'player').length
  })),
  insertCardsIntoQueue: vi.fn(({ queue, cardsToInsert }) => [...queue, ...cardsToInsert]),
}));

vi.mock('./handGeneration', () => ({
  drawFromDeck: vi.fn((deck, discard, count) => ({
    drawnCards: deck.slice(0, count),
    newDeck: deck.slice(count),
    newDiscardPile: discard,
    reshuffled: false
  })),
}));

vi.mock('../../../lib/randomUtils', () => ({
  generateUid: vi.fn((prefix) => `${prefix}_test_uid`),
}));

describe('cardPlaySpecialsProcessing', () => {
  let mockAddLog: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAddLog = vi.fn();
  });

  describe('processBonusCards', () => {
    it('빈 bonusCards 배열이면 변경 없음', () => {
      const result = processBonusCards({
        bonusCards: [],
        insertSp: 5,
        currentQueue: [],
        currentQIndex: 0,
        addLog: mockAddLog,
      });

      expect(result.hasChanges).toBe(false);
      expect(result.updatedQueue).toEqual([]);
      expect(mockAddLog).not.toHaveBeenCalled();
    });

    it('bonusCards를 큐에 삽입', () => {
      const bonusCard: Card = {
        id: 'bonus1',
        name: '보너스 카드',
        baseAtk: 10,
        slot: 1,
        damage: 15,
        speedCost: 3,
      };

      const currentQueue: OrderItem[] = [
        { actor: 'player', card: { id: 'card1', name: '카드1', baseAtk: 5, slot: 1 }, sp: 3, index: 0, time: 3 },
      ];

      const result = processBonusCards({
        bonusCards: [bonusCard],
        insertSp: 4,
        currentQueue,
        currentQIndex: 0,
        addLog: mockAddLog,
      });

      expect(result.hasChanges).toBe(true);
      expect(result.updatedQueue.length).toBe(2);
      expect(mockAddLog).toHaveBeenCalledWith(expect.stringContaining('보너스 카드'));
    });

    it('삽입된 카드는 isGhost=true', () => {
      const bonusCard: Card = {
        id: 'bonus1',
        name: '보너스',
        baseAtk: 10,
        slot: 1,
      };

      const result = processBonusCards({
        bonusCards: [bonusCard],
        insertSp: 5,
        currentQueue: [],
        currentQIndex: 0,
        addLog: mockAddLog,
      });

      const insertedCard = result.updatedQueue[0]?.card;
      expect(insertedCard?.isGhost).toBe(true);
    });

    it('sp 기준으로 정렬됨', () => {
      const bonusCard: Card = { id: 'bonus', name: '보너스', baseAtk: 10, slot: 1 };
      const currentQueue: OrderItem[] = [
        { actor: 'player', card: { id: 'c1', name: '카드1', baseAtk: 5, slot: 1 }, sp: 2, index: 0, time: 2 },
        { actor: 'enemy', card: { id: 'e1', name: '적카드', baseAtk: 5, slot: 0 }, sp: 6, index: 1, time: 6 },
      ];

      const result = processBonusCards({
        bonusCards: [bonusCard],
        insertSp: 4,
        currentQueue,
        currentQIndex: 0,
        addLog: mockAddLog,
      });

      // 첫 번째 카드(sp=2) 이후에 삽입, sp=4인 보너스가 sp=6인 적 카드보다 먼저
      const sps = result.updatedQueue.map(item => item.sp ?? 0);
      expect(sps).toEqual([2, 4, 6]);
    });
  });

  describe('processEmergencyDraw', () => {
    it('drawCount가 0이면 null 반환', () => {
      const result = processEmergencyDraw({
        drawCount: 0,
        currentDeck: [],
        currentDiscard: [],
        currentHand: [],
        vanishedCardIds: [],
        escapeBan: new Set(),
        addLog: mockAddLog,
      });

      expect(result).toBeNull();
    });

    it('덱과 무덤 모두 비어있으면 null 반환', () => {
      const result = processEmergencyDraw({
        drawCount: 2,
        currentDeck: [],
        currentDiscard: [],
        currentHand: [],
        vanishedCardIds: [],
        escapeBan: new Set(),
        addLog: mockAddLog,
      });

      expect(result).toBeNull();
      expect(mockAddLog).toHaveBeenCalledWith(expect.stringContaining('카드가 없습니다'));
    });

    it('덱에서 카드 뽑기 성공', () => {
      const deck: HandCard[] = [
        { id: 'c1', name: '카드1', baseAtk: 5, slot: 1, handIndex: 0 },
        { id: 'c2', name: '카드2', baseAtk: 5, slot: 2, handIndex: 1 },
      ];

      const result = processEmergencyDraw({
        drawCount: 1,
        currentDeck: deck,
        currentDiscard: [],
        currentHand: [],
        vanishedCardIds: [],
        escapeBan: new Set(),
        addLog: mockAddLog,
      });

      expect(result).not.toBeNull();
      expect(result!.drawnCards.length).toBe(1);
      expect(mockAddLog).toHaveBeenCalledWith(expect.stringContaining('비상대응'));
    });

    it('뽑은 카드가 손패에 추가됨', () => {
      const deck: HandCard[] = [
        { id: 'c1', name: '새카드', baseAtk: 5, slot: 1, handIndex: 0 },
      ];
      const currentHand: HandCard[] = [
        { id: 'h1', name: '기존카드', baseAtk: 3, slot: 2, handIndex: 0 },
      ];

      const result = processEmergencyDraw({
        drawCount: 1,
        currentDeck: deck,
        currentDiscard: [],
        currentHand,
        vanishedCardIds: [],
        escapeBan: new Set(),
        addLog: mockAddLog,
      });

      expect(result!.newHand.length).toBe(2);
    });
  });

  describe('processAddCardToHand', () => {
    it('카드 ID가 없으면 원본 손패 반환', () => {
      const result = processAddCardToHand({
        cardId: 'nonexistent',
        allCards: [],
        currentHand: [],
        addLog: mockAddLog,
      });

      expect(result.addedCard).toBeNull();
      expect(result.newHand).toEqual([]);
    });

    it('카드 복사본 추가 성공', () => {
      const allCards: Card[] = [
        { id: 'rapid', name: '엘 라피드', baseAtk: 8, slot: 1 },
      ];

      const result = processAddCardToHand({
        cardId: 'rapid',
        allCards,
        currentHand: [],
        addLog: mockAddLog,
      });

      expect(result.addedCard).not.toBeNull();
      expect(result.addedCard?.id).toBe('rapid');
      expect(result.newHand.length).toBe(1);
      expect(mockAddLog).toHaveBeenCalledWith(expect.stringContaining('복사본'));
    });

    it('복사본은 고유 _instanceId를 가짐', () => {
      const allCards: Card[] = [
        { id: 'rapid', name: '엘 라피드', baseAtk: 8, slot: 1 },
      ];

      const result = processAddCardToHand({
        cardId: 'rapid',
        allCards,
        currentHand: [],
        addLog: mockAddLog,
      });

      expect(result.addedCard?._instanceId).toContain('rapid_copy_');
    });
  });

  describe('processRepeatMyTimeline', () => {
    it('플레이어 카드가 없으면 복제 없음', () => {
      // 적 카드만 있는 큐 - mock이 빈 배열 반환하도록 설정됨
      const queue: OrderItem[] = [
        { actor: 'enemy', card: { id: 'e1', name: '적카드', baseAtk: 5, slot: 0 }, sp: 5, index: 0, time: 5 },
      ];

      const result = processRepeatMyTimeline({
        currentQueue: queue,
        addLog: mockAddLog,
      });

      // mock은 플레이어 카드가 없으면 count: 0 반환
      expect(result.duplicatedCount).toBe(0);
    });

    it('플레이어 카드 복제 성공', () => {
      const queue: OrderItem[] = [
        { actor: 'player', card: { id: 'p1', name: '플레이어카드', baseAtk: 10, slot: 1 }, sp: 3, index: 0, time: 3 },
        { actor: 'enemy', card: { id: 'e1', name: '적카드', baseAtk: 5, slot: 0 }, sp: 5, index: 1, time: 5 },
      ];

      const result = processRepeatMyTimeline({
        currentQueue: queue,
        addLog: mockAddLog,
      });

      expect(result.duplicatedCount).toBeGreaterThan(0);
      expect(mockAddLog).toHaveBeenCalledWith(expect.stringContaining('노인의 꿈'));
    });
  });

  describe('processAllNextTurnEffects', () => {
    const baseParams = {
      cardPlaySpecials: { bonusCards: undefined, nextTurnEffects: undefined },
      currentSp: 5,
      currentQueue: [] as OrderItem[],
      currentQIndex: 0,
      currentDeck: [] as HandCard[],
      currentDiscard: [] as HandCard[],
      currentHand: [] as HandCard[],
      vanishedCardIds: [] as string[],
      escapeBan: new Set<string>(),
      allCards: [] as Card[],
      currentNextTurnEffects: {},
      addLog: vi.fn(),
    };

    it('cardPlaySpecials가 비어있으면 변경 없음', () => {
      const result = processAllNextTurnEffects(baseParams);

      expect(result.hasQueueChanges).toBe(false);
      expect(result.hasDeckChanges).toBe(false);
      expect(result.hasHandChanges).toBe(false);
      expect(result.recallTriggered).toBe(false);
    });

    it('bonusCards 처리', () => {
      const bonusCard: Card = { id: 'bonus', name: '보너스', baseAtk: 10, slot: 1 };

      const result = processAllNextTurnEffects({
        ...baseParams,
        cardPlaySpecials: { bonusCards: [bonusCard], nextTurnEffects: undefined },
      });

      expect(result.hasQueueChanges).toBe(true);
    });

    it('emergencyDraw 처리', () => {
      const deck: HandCard[] = [
        { id: 'c1', name: '카드', baseAtk: 5, slot: 1, handIndex: 0 },
      ];

      const result = processAllNextTurnEffects({
        ...baseParams,
        currentDeck: deck,
        cardPlaySpecials: {
          bonusCards: undefined,
          nextTurnEffects: { emergencyDraw: 1 },
        },
      });

      expect(result.hasDeckChanges).toBe(true);
      expect(result.hasHandChanges).toBe(true);
    });

    it('recallCard 플래그 감지', () => {
      const result = processAllNextTurnEffects({
        ...baseParams,
        cardPlaySpecials: {
          bonusCards: undefined,
          nextTurnEffects: { recallCard: true },
        },
      });

      expect(result.recallTriggered).toBe(true);
    });

    it('addCardToHand 처리', () => {
      const allCards: Card[] = [
        { id: 'rapid', name: '엘 라피드', baseAtk: 8, slot: 1 },
      ];

      const result = processAllNextTurnEffects({
        ...baseParams,
        allCards,
        cardPlaySpecials: {
          bonusCards: undefined,
          nextTurnEffects: { addCardToHand: 'rapid' },
        },
      });

      expect(result.hasHandChanges).toBe(true);
    });

    it('nextTurnEffects 누적 병합', () => {
      const result = processAllNextTurnEffects({
        ...baseParams,
        currentNextTurnEffects: { bonusEnergy: 1, maxSpeedBonus: 2 },
        cardPlaySpecials: {
          bonusCards: undefined,
          nextTurnEffects: { bonusEnergy: 2, extraCardPlay: 1 },
        },
      });

      expect(result.updatedEffects.bonusEnergy).toBe(3);
      expect(result.updatedEffects.maxSpeedBonus).toBe(2);
      expect(result.updatedEffects.extraCardPlay).toBe(1);
    });

    it('repeatMyTimeline 처리 후 플래그 제거', () => {
      const queue: OrderItem[] = [
        { actor: 'player', card: { id: 'p1', name: '카드', baseAtk: 5, slot: 1 }, sp: 3, index: 0, time: 3 },
      ];

      const result = processAllNextTurnEffects({
        ...baseParams,
        currentQueue: queue,
        cardPlaySpecials: {
          bonusCards: undefined,
          nextTurnEffects: { repeatMyTimeline: true },
        },
      });

      expect(result.hasQueueChanges).toBe(true);
      expect(result.updatedEffects.repeatMyTimeline).toBe(false);
    });
  });
});
