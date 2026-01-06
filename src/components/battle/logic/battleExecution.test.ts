/**
 * battleExecution.test.ts
 * createStepOnceAnimations 함수 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStepOnceAnimations } from './battleExecution';
import type { OrderItem } from '../../../types';
import type { FullBattleState } from '../reducer/battleReducerState';
import type { BattleActions } from '../hooks/useBattleState';
import type { MutableRefObject } from 'react';

// TIMING mock
vi.mock('./battleConstants', () => ({
  TIMING: {
    CARD_FADEOUT_DELAY: 100,
    CARD_DISAPPEAR_START: 50,
    CARD_DISAPPEAR_DURATION: 100,
  },
}));

describe('createStepOnceAnimations', () => {
  let mockActions: BattleActions;
  let mockBattleRef: MutableRefObject<FullBattleState>;
  let mockEscapeUsedThisTurnRef: MutableRefObject<Set<string>>;
  let mockBattleState: FullBattleState;

  beforeEach(() => {
    vi.useFakeTimers();

    mockActions = {
      setExecutingCardIndex: vi.fn(),
      setUsedCardIndices: vi.fn(),
      setTimelineIndicatorVisible: vi.fn(),
      setDisappearingCards: vi.fn(),
      setHiddenCards: vi.fn(),
    } as unknown as BattleActions;

    mockBattleState = {
      usedCardIndices: [0, 1],
      disappearingCards: [],
      hiddenCards: [],
    } as unknown as FullBattleState;

    mockBattleRef = {
      current: mockBattleState,
    };

    mockEscapeUsedThisTurnRef = {
      current: new Set<string>(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('startExecution', () => {
    it('현재 카드 인덱스로 실행 중인 카드 설정', () => {
      const action: OrderItem = {
        actor: 'player',
        card: { id: 'card1', name: '테스트', baseAtk: 10, slot: 1 },
        index: 2,
        time: 5,
      };

      const animations = createStepOnceAnimations({
        currentQIndex: 2,
        queueLength: 5,
        action,
        battleRef: mockBattleRef,
        actions: mockActions,
        escapeUsedThisTurnRef: mockEscapeUsedThisTurnRef,
      });

      animations.startExecution();
      expect(mockActions.setExecutingCardIndex).toHaveBeenCalledWith(2);
    });
  });

  describe('finishExecution', () => {
    it('실행 완료 후 카드 인덱스 null로 설정하고 사용된 카드에 추가', () => {
      const action: OrderItem = {
        actor: 'player',
        card: { id: 'card1', name: '테스트', baseAtk: 10, slot: 1 },
        index: 2,
        time: 5,
      };

      const animations = createStepOnceAnimations({
        currentQIndex: 2,
        queueLength: 5,
        action,
        battleRef: mockBattleRef,
        actions: mockActions,
        escapeUsedThisTurnRef: mockEscapeUsedThisTurnRef,
      });

      animations.finishExecution();
      expect(mockActions.setExecutingCardIndex).toHaveBeenCalledWith(null);
      expect(mockActions.setUsedCardIndices).toHaveBeenCalledWith([0, 1, 2]);
    });

    it('usedCardIndices가 없을 때 빈 배열에서 시작', () => {
      mockBattleRef.current = {
        usedCardIndices: undefined,
        disappearingCards: [],
        hiddenCards: [],
      } as unknown as FullBattleState;

      const action: OrderItem = {
        actor: 'player',
        card: { id: 'card1', name: '테스트', baseAtk: 10, slot: 1 },
        index: 0,
        time: 5,
      };

      const animations = createStepOnceAnimations({
        currentQIndex: 0,
        queueLength: 1,
        action,
        battleRef: mockBattleRef,
        actions: mockActions,
        escapeUsedThisTurnRef: mockEscapeUsedThisTurnRef,
      });

      animations.finishExecution();
      expect(mockActions.setUsedCardIndices).toHaveBeenCalledWith([0]);
    });
  });

  describe('handleLastCard', () => {
    it('마지막 카드일 때 타임라인 인디케이터 숨김', () => {
      const action: OrderItem = {
        actor: 'player',
        card: { id: 'card1', name: '테스트', baseAtk: 10, slot: 1 },
        index: 4,
        time: 5,
      };

      const animations = createStepOnceAnimations({
        currentQIndex: 4,
        queueLength: 5,
        action,
        battleRef: mockBattleRef,
        actions: mockActions,
        escapeUsedThisTurnRef: mockEscapeUsedThisTurnRef,
      });

      animations.handleLastCard();

      // 타이머 실행 전에는 호출 안됨
      expect(mockActions.setTimelineIndicatorVisible).not.toHaveBeenCalled();

      // 타이머 실행
      vi.advanceTimersByTime(100);
      expect(mockActions.setTimelineIndicatorVisible).toHaveBeenCalledWith(false);
    });

    it('마지막 카드가 아닐 때 타임라인 인디케이터 유지', () => {
      const action: OrderItem = {
        actor: 'player',
        card: { id: 'card1', name: '테스트', baseAtk: 10, slot: 1 },
        index: 2,
        time: 5,
      };

      const animations = createStepOnceAnimations({
        currentQIndex: 2,
        queueLength: 5,
        action,
        battleRef: mockBattleRef,
        actions: mockActions,
        escapeUsedThisTurnRef: mockEscapeUsedThisTurnRef,
      });

      animations.handleLastCard();
      vi.advanceTimersByTime(500);

      expect(mockActions.setTimelineIndicatorVisible).not.toHaveBeenCalled();
    });
  });

  describe('handlePlayerCardDisappear', () => {
    it('플레이어 카드 소멸 애니메이션 처리', () => {
      const action: OrderItem = {
        actor: 'player',
        card: { id: 'card1', name: '테스트', baseAtk: 10, slot: 1 },
        index: 2,
        time: 5,
      };

      const animations = createStepOnceAnimations({
        currentQIndex: 2,
        queueLength: 5,
        action,
        battleRef: mockBattleRef,
        actions: mockActions,
        escapeUsedThisTurnRef: mockEscapeUsedThisTurnRef,
      });

      animations.handlePlayerCardDisappear();

      // 첫 번째 타이머 실행 (CARD_DISAPPEAR_START = 50ms)
      vi.advanceTimersByTime(50);
      expect(mockActions.setDisappearingCards).toHaveBeenCalledWith([2]);

      // 두 번째 타이머 실행 (CARD_DISAPPEAR_DURATION = 100ms)
      vi.advanceTimersByTime(100);
      expect(mockActions.setHiddenCards).toHaveBeenCalledWith([2]);
      expect(mockActions.setDisappearingCards).toHaveBeenLastCalledWith([]);
    });

    it('적 카드는 소멸 처리 안함', () => {
      const action: OrderItem = {
        actor: 'enemy',
        card: { id: 'enemy1', name: '적 카드', baseAtk: 5, slot: 0 },
        index: 1,
        time: 3,
      };

      const animations = createStepOnceAnimations({
        currentQIndex: 1,
        queueLength: 5,
        action,
        battleRef: mockBattleRef,
        actions: mockActions,
        escapeUsedThisTurnRef: mockEscapeUsedThisTurnRef,
      });

      animations.handlePlayerCardDisappear();
      vi.advanceTimersByTime(500);

      expect(mockActions.setDisappearingCards).not.toHaveBeenCalled();
      expect(mockActions.setHiddenCards).not.toHaveBeenCalled();
    });

    it('escape 특성 카드는 escapeUsedThisTurnRef에 추가', () => {
      const action: OrderItem = {
        actor: 'player',
        card: { id: 'escape-card', name: '도주', baseAtk: 0, slot: 1, traits: ['escape'] },
        index: 2,
        time: 5,
      };

      const animations = createStepOnceAnimations({
        currentQIndex: 2,
        queueLength: 5,
        action,
        battleRef: mockBattleRef,
        actions: mockActions,
        escapeUsedThisTurnRef: mockEscapeUsedThisTurnRef,
      });

      animations.handlePlayerCardDisappear();
      expect(mockEscapeUsedThisTurnRef.current.has('escape-card')).toBe(true);
    });

    it('일반 카드는 escapeUsedThisTurnRef에 추가 안함', () => {
      const action: OrderItem = {
        actor: 'player',
        card: { id: 'normal-card', name: '일반', baseAtk: 10, slot: 1, traits: ['attack'] },
        index: 2,
        time: 5,
      };

      const animations = createStepOnceAnimations({
        currentQIndex: 2,
        queueLength: 5,
        action,
        battleRef: mockBattleRef,
        actions: mockActions,
        escapeUsedThisTurnRef: mockEscapeUsedThisTurnRef,
      });

      animations.handlePlayerCardDisappear();
      expect(mockEscapeUsedThisTurnRef.current.has('normal-card')).toBe(false);
    });
  });

  describe('re-exports', () => {
    it('TIMING 상수 re-export 확인', async () => {
      const { TIMING } = await import('./battleExecution');
      expect(TIMING).toBeDefined();
      expect(TIMING.CARD_FADEOUT_DELAY).toBe(100);
    });

    it('executeCardActionCore re-export 확인', async () => {
      const { executeCardActionCore } = await import('./battleExecution');
      expect(typeof executeCardActionCore).toBe('function');
    });

    it('finishTurnCore re-export 확인', async () => {
      const { finishTurnCore } = await import('./battleExecution');
      expect(typeof finishTurnCore).toBe('function');
    });

    it('runAllCore re-export 확인', async () => {
      const { runAllCore } = await import('./battleExecution');
      expect(typeof runAllCore).toBe('function');
    });

    it('executeMultiHitAsync re-export 확인', async () => {
      const { executeMultiHitAsync } = await import('./battleExecution');
      expect(typeof executeMultiHitAsync).toBe('function');
    });
  });
});
