/**
 * @file specialCardEffects.test.ts
 * @description 특수 카드 효과 처리 테스트 (브리치, 펜싱, 처형대 등)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  processBreachEffect,
  processFencingEffect,
  processExecutionSquadEffect,
  processCreatedCardsEffect,
} from './specialCardEffects';
import type { Card, HandAction, BreachSelection } from '../../../types';

// Mock dependencies
vi.mock('./cardSpecialEffects', () => ({
  hasSpecial: vi.fn((card: Card, special: string) => {
    if (!card.special) return false;
    if (Array.isArray(card.special)) return card.special.includes(special);
    return card.special === special;
  }),
}));

vi.mock('./cardCreationProcessing', () => ({
  generateBreachCards: vi.fn((sp: number, card: Card) => ({
    breachCards: [
      { id: 'breach1', name: '브리치카드1', type: 'attack', baseAtk: 5, slot: 1 },
      { id: 'breach2', name: '브리치카드2', type: 'attack', baseAtk: 6, slot: 2 },
      { id: 'breach3', name: '브리치카드3', type: 'attack', baseAtk: 7, slot: 3 },
    ],
    breachState: {
      cards: [
        { id: 'breach1', name: '브리치카드1', type: 'attack', baseAtk: 5, slot: 1 },
        { id: 'breach2', name: '브리치카드2', type: 'attack', baseAtk: 6, slot: 2 },
        { id: 'breach3', name: '브리치카드3', type: 'attack', baseAtk: 7, slot: 3 },
      ],
      breachSp: sp,
      breachCard: card,
    },
  })),
  generateFencingCards: vi.fn((sp: number, card: Card) => ({
    success: true,
    firstSelection: {
      cards: [
        { id: 'fencing1', name: '펜싱1', type: 'attack', cardCategory: 'fencing', baseAtk: 5, slot: 1 },
        { id: 'fencing2', name: '펜싱2', type: 'attack', cardCategory: 'fencing', baseAtk: 6, slot: 2 },
        { id: 'fencing3', name: '펜싱3', type: 'attack', cardCategory: 'fencing', baseAtk: 7, slot: 3 },
      ],
      breachSp: sp + 1,
      breachCard: { ...card, breachSpOffset: 1 },
      isAoe: true,
    },
    creationQueue: [
      { cards: [], insertSp: sp + 1, isAoe: true, currentSelection: 2, totalSelections: 3 },
      { cards: [], insertSp: sp + 1, isAoe: true, currentSelection: 3, totalSelections: 3 },
    ],
  })),
  generateExecutionSquadCards: vi.fn((sp: number, card: Card) => ({
    success: true,
    firstSelection: {
      cards: [
        { id: 'gun1', name: '총기1', type: 'attack', cardCategory: 'gun', baseAtk: 5, slot: 1 },
        { id: 'gun2', name: '총기2', type: 'attack', cardCategory: 'gun', baseAtk: 6, slot: 2 },
        { id: 'gun3', name: '총기3', type: 'attack', cardCategory: 'gun', baseAtk: 7, slot: 3 },
      ],
      breachSp: sp + 1,
      breachCard: { ...card, breachSpOffset: 1 },
      isAoe: false,
    },
    creationQueue: [
      { cards: [], insertSp: sp + 1, isAoe: false, currentSelection: 2, totalSelections: 4 },
      { cards: [], insertSp: sp + 1, isAoe: false, currentSelection: 3, totalSelections: 4 },
      { cards: [], insertSp: sp + 1, isAoe: false, currentSelection: 4, totalSelections: 4 },
    ],
  })),
}));

describe('specialCardEffects', () => {
  let mockAddLog: ReturnType<typeof vi.fn>;
  let mockAccumulateEther: ReturnType<typeof vi.fn>;
  let mockSetBreachSelection: ReturnType<typeof vi.fn>;
  let mockBreachSelectionRef: { current: BreachSelection | null };
  let mockCreationQueueRef: { current: unknown[] };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAddLog = vi.fn();
    mockAccumulateEther = vi.fn();
    mockSetBreachSelection = vi.fn();
    mockBreachSelectionRef = { current: null };
    mockCreationQueueRef = { current: [] };
  });

  describe('processBreachEffect', () => {
    it('브리치 카드가 아니면 shouldReturn: false', () => {
      const action: HandAction = {
        actor: 'player',
        card: { id: 'normal', name: '일반카드', type: 'attack', baseAtk: 5, slot: 1 },
        sp: 3,
        index: 0,
        time: 3,
      };

      const result = processBreachEffect({
        action,
        addLog: mockAddLog,
        accumulateEther: mockAccumulateEther,
        setBreachSelection: mockSetBreachSelection,
        breachSelectionRef: mockBreachSelectionRef,
      });

      expect(result.shouldReturn).toBe(false);
      expect(mockAddLog).not.toHaveBeenCalled();
    });

    it('적의 브리치 카드는 shouldReturn: false', () => {
      const action: HandAction = {
        actor: 'enemy',
        card: { id: 'breach', name: '브리치', type: 'attack', baseAtk: 10, slot: 0, special: 'breach' },
        sp: 3,
        index: 0,
        time: 3,
      };

      const result = processBreachEffect({
        action,
        addLog: mockAddLog,
        accumulateEther: mockAccumulateEther,
        setBreachSelection: mockSetBreachSelection,
        breachSelectionRef: mockBreachSelectionRef,
      });

      expect(result.shouldReturn).toBe(false);
    });

    it('플레이어 브리치 카드 발동 시 shouldReturn: true', () => {
      const action: HandAction = {
        actor: 'player',
        card: { id: 'breach', name: '브리치', type: 'attack', baseAtk: 10, slot: 0, special: 'breach' },
        sp: 5,
        index: 0,
        time: 5,
      };

      const result = processBreachEffect({
        action,
        addLog: mockAddLog,
        accumulateEther: mockAccumulateEther,
        setBreachSelection: mockSetBreachSelection,
        breachSelectionRef: mockBreachSelectionRef,
      });

      expect(result.shouldReturn).toBe(true);
    });

    it('브리치 발동 시 로그 추가', () => {
      const action: HandAction = {
        actor: 'player',
        card: { id: 'breach', name: '브리치', type: 'attack', baseAtk: 10, slot: 0, special: 'breach' },
        sp: 5,
        index: 0,
        time: 5,
      };

      processBreachEffect({
        action,
        addLog: mockAddLog,
        accumulateEther: mockAccumulateEther,
        setBreachSelection: mockSetBreachSelection,
        breachSelectionRef: mockBreachSelectionRef,
      });

      expect(mockAddLog).toHaveBeenCalledWith('👻 "브리치" 발동! 카드를 선택하세요.');
    });

    it('브리치 발동 시 에테르 누적', () => {
      const card = { id: 'breach', name: '브리치', type: 'attack', baseAtk: 10, slot: 0, special: 'breach' } as Card;
      const action: HandAction = {
        actor: 'player',
        card,
        sp: 5,
        index: 0,
        time: 5,
      };

      processBreachEffect({
        action,
        addLog: mockAddLog,
        accumulateEther: mockAccumulateEther,
        setBreachSelection: mockSetBreachSelection,
        breachSelectionRef: mockBreachSelectionRef,
      });

      expect(mockAccumulateEther).toHaveBeenCalledWith(card);
    });

    it('브리치 발동 시 선택 상태 설정', () => {
      const action: HandAction = {
        actor: 'player',
        card: { id: 'breach', name: '브리치', type: 'attack', baseAtk: 10, slot: 0, special: 'breach' },
        sp: 5,
        index: 0,
        time: 5,
      };

      processBreachEffect({
        action,
        addLog: mockAddLog,
        accumulateEther: mockAccumulateEther,
        setBreachSelection: mockSetBreachSelection,
        breachSelectionRef: mockBreachSelectionRef,
      });

      expect(mockSetBreachSelection).toHaveBeenCalled();
      expect(mockBreachSelectionRef.current).not.toBeNull();
    });
  });

  describe('processFencingEffect', () => {
    it('createFencingCards3 없으면 shouldReturn: false', () => {
      const action: HandAction = {
        actor: 'player',
        card: { id: 'normal', name: '일반카드', type: 'attack', baseAtk: 5, slot: 1 },
        sp: 3,
        index: 0,
        time: 3,
      };

      const result = processFencingEffect({
        action,
        addLog: mockAddLog,
        accumulateEther: mockAccumulateEther,
        setBreachSelection: mockSetBreachSelection,
        breachSelectionRef: mockBreachSelectionRef,
        creationQueueRef: mockCreationQueueRef,
      });

      expect(result.shouldReturn).toBe(false);
    });

    it('적의 펜싱 카드는 shouldReturn: false', () => {
      const action: HandAction = {
        actor: 'enemy',
        card: { id: 'fencing', name: '벙데라므', type: 'attack', baseAtk: 15, slot: 0, special: 'createFencingCards3' },
        sp: 3,
        index: 0,
        time: 3,
      };

      const result = processFencingEffect({
        action,
        addLog: mockAddLog,
        accumulateEther: mockAccumulateEther,
        setBreachSelection: mockSetBreachSelection,
        breachSelectionRef: mockBreachSelectionRef,
        creationQueueRef: mockCreationQueueRef,
      });

      expect(result.shouldReturn).toBe(false);
    });

    it('펜싱 카드 발동 시 shouldReturn: true 및 creationQueue 반환', () => {
      const action: HandAction = {
        actor: 'player',
        card: { id: 'fencing', name: '벙데라므', type: 'attack', baseAtk: 15, slot: 0, special: 'createFencingCards3' },
        sp: 4,
        index: 0,
        time: 4,
      };

      const result = processFencingEffect({
        action,
        addLog: mockAddLog,
        accumulateEther: mockAccumulateEther,
        setBreachSelection: mockSetBreachSelection,
        breachSelectionRef: mockBreachSelectionRef,
        creationQueueRef: mockCreationQueueRef,
      });

      expect(result.shouldReturn).toBe(true);
      expect(result.creationQueue).toBeDefined();
      expect(result.creationQueue?.length).toBe(2);
    });

    it('펜싱 발동 시 로그에 1/3 표시', () => {
      const action: HandAction = {
        actor: 'player',
        card: { id: 'fencing', name: '벙데라므', type: 'attack', baseAtk: 15, slot: 0, special: 'createFencingCards3' },
        sp: 4,
        index: 0,
        time: 4,
      };

      processFencingEffect({
        action,
        addLog: mockAddLog,
        accumulateEther: mockAccumulateEther,
        setBreachSelection: mockSetBreachSelection,
        breachSelectionRef: mockBreachSelectionRef,
        creationQueueRef: mockCreationQueueRef,
      });

      expect(mockAddLog).toHaveBeenCalledWith('👻 "벙데라므" 발동! 검격 카드 창조 1/3: 카드를 선택하세요.');
    });

    it('펜싱 발동 시 creationQueueRef 설정', () => {
      const action: HandAction = {
        actor: 'player',
        card: { id: 'fencing', name: '벙데라므', type: 'attack', baseAtk: 15, slot: 0, special: 'createFencingCards3' },
        sp: 4,
        index: 0,
        time: 4,
      };

      processFencingEffect({
        action,
        addLog: mockAddLog,
        accumulateEther: mockAccumulateEther,
        setBreachSelection: mockSetBreachSelection,
        breachSelectionRef: mockBreachSelectionRef,
        creationQueueRef: mockCreationQueueRef,
      });

      expect(mockCreationQueueRef.current.length).toBe(2);
    });
  });

  describe('processExecutionSquadEffect', () => {
    it('executionSquad 없으면 shouldReturn: false', () => {
      const action: HandAction = {
        actor: 'player',
        card: { id: 'normal', name: '일반카드', type: 'attack', baseAtk: 5, slot: 1 },
        sp: 3,
        index: 0,
        time: 3,
      };

      const result = processExecutionSquadEffect({
        action,
        addLog: mockAddLog,
        accumulateEther: mockAccumulateEther,
        setBreachSelection: mockSetBreachSelection,
        breachSelectionRef: mockBreachSelectionRef,
        creationQueueRef: mockCreationQueueRef,
      });

      expect(result.shouldReturn).toBe(false);
    });

    it('적의 총살 카드는 shouldReturn: false', () => {
      const action: HandAction = {
        actor: 'enemy',
        card: { id: 'execution', name: '총살', type: 'attack', baseAtk: 20, slot: 0, special: 'executionSquad' },
        sp: 3,
        index: 0,
        time: 3,
      };

      const result = processExecutionSquadEffect({
        action,
        addLog: mockAddLog,
        accumulateEther: mockAccumulateEther,
        setBreachSelection: mockSetBreachSelection,
        breachSelectionRef: mockBreachSelectionRef,
        creationQueueRef: mockCreationQueueRef,
      });

      expect(result.shouldReturn).toBe(false);
    });

    it('총살 카드 발동 시 shouldReturn: true 및 creationQueue 반환', () => {
      const action: HandAction = {
        actor: 'player',
        card: { id: 'execution', name: '총살', type: 'attack', baseAtk: 20, slot: 0, special: 'executionSquad' },
        sp: 5,
        index: 0,
        time: 5,
      };

      const result = processExecutionSquadEffect({
        action,
        addLog: mockAddLog,
        accumulateEther: mockAccumulateEther,
        setBreachSelection: mockSetBreachSelection,
        breachSelectionRef: mockBreachSelectionRef,
        creationQueueRef: mockCreationQueueRef,
      });

      expect(result.shouldReturn).toBe(true);
      expect(result.creationQueue).toBeDefined();
      expect(result.creationQueue?.length).toBe(3);
    });

    it('총살 발동 시 로그에 1/4 표시', () => {
      const action: HandAction = {
        actor: 'player',
        card: { id: 'execution', name: '총살', type: 'attack', baseAtk: 20, slot: 0, special: 'executionSquad' },
        sp: 5,
        index: 0,
        time: 5,
      };

      processExecutionSquadEffect({
        action,
        addLog: mockAddLog,
        accumulateEther: mockAccumulateEther,
        setBreachSelection: mockSetBreachSelection,
        breachSelectionRef: mockBreachSelectionRef,
        creationQueueRef: mockCreationQueueRef,
      });

      expect(mockAddLog).toHaveBeenCalledWith('👻 "총살" 발동! 총격 카드 창조 1/4: 카드를 선택하세요.');
    });

    it('총살 발동 시 creationQueueRef에 3개 항목 설정', () => {
      const action: HandAction = {
        actor: 'player',
        card: { id: 'execution', name: '총살', type: 'attack', baseAtk: 20, slot: 0, special: 'executionSquad' },
        sp: 5,
        index: 0,
        time: 5,
      };

      processExecutionSquadEffect({
        action,
        addLog: mockAddLog,
        accumulateEther: mockAccumulateEther,
        setBreachSelection: mockSetBreachSelection,
        breachSelectionRef: mockBreachSelectionRef,
        creationQueueRef: mockCreationQueueRef,
      });

      expect(mockCreationQueueRef.current.length).toBe(3);
    });
  });

  describe('processCreatedCardsEffect', () => {
    it('createdCards가 없으면 shouldReturn: false', () => {
      const action: HandAction = {
        actor: 'player',
        card: { id: 'fleche', name: '플레쉬', type: 'attack', baseAtk: 10, slot: 0 },
        sp: 3,
        index: 0,
        time: 3,
      };

      const result = processCreatedCardsEffect({
        actionResult: {},
        action,
        addLog: mockAddLog,
        setBreachSelection: mockSetBreachSelection,
        breachSelectionRef: mockBreachSelectionRef,
      });

      expect(result.shouldReturn).toBe(false);
    });

    it('createdCards가 빈 배열이면 shouldReturn: false', () => {
      const action: HandAction = {
        actor: 'player',
        card: { id: 'fleche', name: '플레쉬', type: 'attack', baseAtk: 10, slot: 0 },
        sp: 3,
        index: 0,
        time: 3,
      };

      const result = processCreatedCardsEffect({
        actionResult: { createdCards: [] },
        action,
        addLog: mockAddLog,
        setBreachSelection: mockSetBreachSelection,
        breachSelectionRef: mockBreachSelectionRef,
      });

      expect(result.shouldReturn).toBe(false);
    });

    it('적의 카드 창조는 shouldReturn: false', () => {
      const action: HandAction = {
        actor: 'enemy',
        card: { id: 'fleche', name: '플레쉬', type: 'attack', baseAtk: 10, slot: 0 },
        sp: 3,
        index: 0,
        time: 3,
      };

      const result = processCreatedCardsEffect({
        actionResult: { createdCards: [{ id: 'c1', name: '카드', type: 'attack', baseAtk: 5, slot: 1 }] },
        action,
        addLog: mockAddLog,
        setBreachSelection: mockSetBreachSelection,
        breachSelectionRef: mockBreachSelectionRef,
      });

      expect(result.shouldReturn).toBe(false);
    });

    it('플레이어 카드 창조 시 shouldReturn: true', () => {
      const action: HandAction = {
        actor: 'player',
        card: { id: 'fleche', name: '플레쉬', type: 'attack', baseAtk: 10, slot: 0 },
        sp: 3,
        index: 0,
        time: 3,
      };

      const result = processCreatedCardsEffect({
        actionResult: { createdCards: [{ id: 'c1', name: '카드', type: 'attack', baseAtk: 5, slot: 1 }] },
        action,
        addLog: mockAddLog,
        setBreachSelection: mockSetBreachSelection,
        breachSelectionRef: mockBreachSelectionRef,
      });

      expect(result.shouldReturn).toBe(true);
    });

    it('플레쉬 연쇄 시 연쇄 카운트 로그 표시', () => {
      const action: HandAction = {
        actor: 'player',
        card: { id: 'fleche', name: '플레쉬', type: 'attack', baseAtk: 10, slot: 0, isFromFleche: true },
        sp: 3,
        index: 0,
        time: 3,
      };

      processCreatedCardsEffect({
        actionResult: { createdCards: [{ id: 'c1', name: '카드', type: 'attack', baseAtk: 5, slot: 1, flecheChainCount: 1 }] },
        action,
        addLog: mockAddLog,
        setBreachSelection: mockSetBreachSelection,
        breachSelectionRef: mockBreachSelectionRef,
      });

      expect(mockAddLog).toHaveBeenCalledWith('✨ "플레쉬 연쇄 1" 발동! 카드를 선택하세요.');
    });

    it('마지막 연쇄 시 (마지막 연쇄) 표시', () => {
      const action: HandAction = {
        actor: 'player',
        card: { id: 'fleche', name: '플레쉬', type: 'attack', baseAtk: 10, slot: 0, isFromFleche: true },
        sp: 3,
        index: 0,
        time: 3,
      };

      processCreatedCardsEffect({
        actionResult: { createdCards: [{ id: 'c1', name: '카드', type: 'attack', baseAtk: 5, slot: 1, flecheChainCount: 2 }] },
        action,
        addLog: mockAddLog,
        setBreachSelection: mockSetBreachSelection,
        breachSelectionRef: mockBreachSelectionRef,
      });

      expect(mockAddLog).toHaveBeenCalledWith('✨ "플레쉬 연쇄 2" 발동! (마지막 연쇄) 카드를 선택하세요.');
    });

    it('일반 카드 창조 시 카드명 표시', () => {
      const action: HandAction = {
        actor: 'player',
        card: { id: 'create', name: '창조자', type: 'attack', baseAtk: 10, slot: 0 },
        sp: 3,
        index: 0,
        time: 3,
      };

      processCreatedCardsEffect({
        actionResult: { createdCards: [{ id: 'c1', name: '카드', type: 'attack', baseAtk: 5, slot: 1 }] },
        action,
        addLog: mockAddLog,
        setBreachSelection: mockSetBreachSelection,
        breachSelectionRef: mockBreachSelectionRef,
      });

      expect(mockAddLog).toHaveBeenCalledWith('✨ "창조자" 발동! 카드를 선택하세요.');
    });

    it('breachSelection 상태 올바르게 설정', () => {
      const card: Card = { id: 'create', name: '창조자', type: 'attack', baseAtk: 10, slot: 0 };
      const createdCard: Card = { id: 'c1', name: '카드', type: 'attack', baseAtk: 5, slot: 1 };
      const action: HandAction = {
        actor: 'player',
        card,
        sp: 4,
        index: 0,
        time: 4,
      };

      processCreatedCardsEffect({
        actionResult: { createdCards: [createdCard] },
        action,
        addLog: mockAddLog,
        setBreachSelection: mockSetBreachSelection,
        breachSelectionRef: mockBreachSelectionRef,
      });

      expect(mockBreachSelectionRef.current).not.toBeNull();
      expect(mockBreachSelectionRef.current?.cards).toHaveLength(1);
      expect(mockBreachSelectionRef.current?.breachSp).toBe(4);
      expect(mockBreachSelectionRef.current?.breachCard.breachSpOffset).toBe(1);
      expect(mockBreachSelectionRef.current?.sourceCardName).toBe('창조자');
    });

    it('isLastChain이 올바르게 설정됨', () => {
      const action: HandAction = {
        actor: 'player',
        card: { id: 'fleche', name: '플레쉬', type: 'attack', baseAtk: 10, slot: 0, isFromFleche: true },
        sp: 3,
        index: 0,
        time: 3,
      };

      // chainCount < 2
      processCreatedCardsEffect({
        actionResult: { createdCards: [{ id: 'c1', name: '카드', type: 'attack', baseAtk: 5, slot: 1, flecheChainCount: 1 }] },
        action,
        addLog: mockAddLog,
        setBreachSelection: mockSetBreachSelection,
        breachSelectionRef: mockBreachSelectionRef,
      });

      expect(mockBreachSelectionRef.current?.isLastChain).toBe(false);

      // chainCount >= 2
      processCreatedCardsEffect({
        actionResult: { createdCards: [{ id: 'c2', name: '카드2', type: 'attack', baseAtk: 5, slot: 1, flecheChainCount: 2 }] },
        action,
        addLog: mockAddLog,
        setBreachSelection: mockSetBreachSelection,
        breachSelectionRef: mockBreachSelectionRef,
      });

      expect(mockBreachSelectionRef.current?.isLastChain).toBe(true);
    });
  });
});
