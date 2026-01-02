/**
 * @file useBreachSelection.test.ts
 * @description 브리치/창조 카드 선택 훅 테스트
 *
 * ## 테스트 대상
 * - useBreachSelection: 브리치 효과로 카드 생성
 *
 * ## 주요 테스트 케이스
 * - 카드 선택 시 유령카드 생성
 * - 큐에 유령카드 삽입
 * - 다중 선택 큐 처리
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBreachSelection } from './useBreachSelection';
import type { Card } from '../../../types';

// 유틸리티 모킹
vi.mock('../../../lib/randomUtils', () => ({
  generateUid: vi.fn(() => 'ghost_uid_123')
}));

describe('useBreachSelection', () => {
  const mockSetQueue = vi.fn();
  const mockSetQIndex = vi.fn();
  const mockAddLog = vi.fn();

  const CARDS = [
    { id: 'slash', name: '베기', damage: 10, speedCost: 3, actionCost: 1 },
    { id: 'guard', name: '방어', block: 5, speedCost: 2, actionCost: 1 },
    { id: 'pierce', name: '찌르기', damage: 15, speedCost: 4, actionCost: 2 }
  ];

  const defaultProps = {
    CARDS,
    battleRef: {
      current: {
        queue: [
          { actor: 'player', card: { id: 'test' }, sp: 5 }
        ],
        qIndex: 0
      }
    },
    stepOnceRef: { current: vi.fn() },
    addLog: mockAddLog,
    actions: {
      setQueue: mockSetQueue,
      setQIndex: mockSetQIndex
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('초기 상태', () => {
    it('breachSelection null로 시작', () => {
      const { result } = renderHook(() => useBreachSelection(defaultProps as any));

      expect(result.current.breachSelection).toBeNull();
    });

    it('필요한 함수들 반환', () => {
      const { result } = renderHook(() => useBreachSelection(defaultProps as any));

      expect(result.current.setBreachSelection).toBeDefined();
      expect(result.current.handleBreachSelect).toBeDefined();
      expect(result.current.breachSelectionRef).toBeDefined();
      expect(result.current.creationQueueRef).toBeDefined();
    });
  });

  describe('handleBreachSelect', () => {
    it('breachSelectionRef 없으면 조기 반환', () => {
      const { result } = renderHook(() => useBreachSelection(defaultProps as any));

      act(() => {
        result.current.handleBreachSelect({ id: 'slash', name: '베기' } as any);
      });

      expect(mockSetQueue).not.toHaveBeenCalled();
    });

    it('유령카드 생성 및 큐 삽입', () => {
      const { result } = renderHook(() => useBreachSelection(defaultProps as any));

      // breachSelection 설정
      act(() => {
        result.current.breachSelectionRef.current = {
          cards: CARDS,
          breachSp: 3,
          breachCard: { id: 'breach', breachSpOffset: 2 }
        };
        result.current.setBreachSelection({
          cards: CARDS,
          breachSp: 3,
          breachCard: { id: 'breach', breachSpOffset: 2 }
        } as any);
      });

      // 카드 선택
      act(() => {
        result.current.handleBreachSelect(CARDS[0] as any);
      });

      expect(mockAddLog).toHaveBeenCalledWith(expect.stringContaining('베기'));
      expect(mockSetQueue).toHaveBeenCalled();
    });

    it('선택 완료 후 breachSelection 초기화', () => {
      const { result } = renderHook(() => useBreachSelection(defaultProps as any));

      act(() => {
        result.current.breachSelectionRef.current = {
          cards: CARDS,
          breachSp: 3,
          breachCard: { id: 'breach' }
        };
      });

      act(() => {
        result.current.handleBreachSelect(CARDS[0] as any);
      });

      expect(result.current.breachSelectionRef.current).toBeNull();
    });

    it('qIndex 업데이트', () => {
      // 각 테스트에서 새로운 battleRef 생성
      const freshBattleRef = {
        current: {
          queue: [{ actor: 'player', card: { id: 'test' }, sp: 5 }],
          qIndex: 0
        }
      };
      const props = { ...defaultProps, battleRef: freshBattleRef };
      const { result } = renderHook(() => useBreachSelection(props as any));

      act(() => {
        result.current.breachSelectionRef.current = {
          cards: CARDS,
          breachSp: 3,
          breachCard: { id: 'breach' }
        };
      });

      act(() => {
        result.current.handleBreachSelect(CARDS[0] as any);
      });

      // qIndex는 currentQIndex(0) + 1 = 1
      expect(mockSetQIndex).toHaveBeenCalledWith(1);
    });

    it('선택 후 stepOnce 호출 예약', () => {
      const mockStepOnce = vi.fn();
      const props = {
        ...defaultProps,
        stepOnceRef: { current: mockStepOnce },
        battleRef: {
          current: {
            queue: [{ actor: 'player', card: { id: 'test' }, sp: 5 }],
            qIndex: 0
          }
        }
      };
      const { result } = renderHook(() => useBreachSelection(props as any));

      act(() => {
        result.current.breachSelectionRef.current = {
          cards: CARDS,
          breachSp: 3,
          breachCard: { id: 'breach' }
        };
      });

      act(() => {
        result.current.handleBreachSelect(CARDS[0] as any);
      });

      // setTimeout 실행
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // stepOnce가 호출되었는지 확인 (큐에 아이템이 있으면)
      expect(mockStepOnce).toHaveBeenCalled();
    });
  });

  describe('다중 선택 (creationQueue)', () => {
    it('creationQueue에 다음 선택이 있으면 계속 진행', () => {
      const { result } = renderHook(() => useBreachSelection(defaultProps as any));

      // creationQueue 설정
      act(() => {
        result.current.creationQueueRef.current = [
          {
            cards: CARDS as Card[],
            insertSp: 5,
            breachCard: { id: 'creation' } as any,
            totalSelections: 2,
            currentSelection: 2
          }
        ];
        result.current.breachSelectionRef.current = {
          cards: CARDS,
          breachSp: 3,
          breachCard: { id: 'breach' }
        };
      });

      act(() => {
        result.current.handleBreachSelect(CARDS[0] as any);
      });

      // 다음 선택 상태로 전환
      expect(result.current.breachSelection).not.toBeNull();
      expect(mockAddLog).toHaveBeenCalledWith(expect.stringContaining('창조'));
    });

    it('creationQueue가 비면 선택 완료', () => {
      const { result } = renderHook(() => useBreachSelection(defaultProps as any));

      act(() => {
        result.current.creationQueueRef.current = [];
        result.current.breachSelectionRef.current = {
          cards: CARDS,
          breachSp: 3,
          breachCard: { id: 'breach' }
        };
      });

      act(() => {
        result.current.handleBreachSelect(CARDS[0] as any);
      });

      expect(result.current.breachSelectionRef.current).toBeNull();
    });
  });

  describe('유령카드 속성', () => {
    it('유령카드에 isGhost 플래그 설정', () => {
      const { result } = renderHook(() => useBreachSelection(defaultProps as any));

      act(() => {
        result.current.breachSelectionRef.current = {
          cards: CARDS,
          breachSp: 3,
          breachCard: { id: 'breach' }
        };
      });

      act(() => {
        result.current.handleBreachSelect(CARDS[0] as any);
      });

      const setQueueCall = mockSetQueue.mock.calls[0][0];
      const ghostCard = setQueueCall.find((q: any) => q.card?.isGhost);
      expect(ghostCard).toBeDefined();
      expect(ghostCard.card.isGhost).toBe(true);
    });

    it('유령카드에 createdBy 설정', () => {
      // 각 테스트에서 새로운 battleRef 생성
      const freshBattleRef = {
        current: {
          queue: [{ actor: 'player', card: { id: 'test' }, sp: 5 }],
          qIndex: 0
        }
      };
      const props = { ...defaultProps, battleRef: freshBattleRef };
      const { result } = renderHook(() => useBreachSelection(props as any));

      act(() => {
        result.current.breachSelectionRef.current = {
          cards: CARDS,
          breachSp: 3,
          breachCard: { id: 'parent_card' }
        };
      });

      act(() => {
        result.current.handleBreachSelect(CARDS[0] as any);
      });

      // 마지막 setQueue 호출에서 유령카드 확인
      const lastCall = mockSetQueue.mock.calls[mockSetQueue.mock.calls.length - 1];
      const setQueueCall = lastCall[0];
      const ghostCard = setQueueCall.find((q: { card?: { isGhost?: boolean; createdBy?: string } }) => q.card?.isGhost);
      expect(ghostCard.card.createdBy).toBe('parent_card');
    });
  });

  describe('큐 정렬', () => {
    it('sp 기준으로 정렬', () => {
      const props = {
        ...defaultProps,
        battleRef: {
          current: {
            queue: [
              { actor: 'player', card: { id: 'card1' }, sp: 2 },
              { actor: 'enemy', card: { id: 'card2' }, sp: 8 }
            ],
            qIndex: 0
          }
        }
      };
      const { result } = renderHook(() => useBreachSelection(props as any));

      act(() => {
        result.current.breachSelectionRef.current = {
          cards: CARDS,
          breachSp: 3,
          breachCard: { id: 'breach', breachSpOffset: 2 } // sp = 5
        };
      });

      act(() => {
        result.current.handleBreachSelect(CARDS[0] as any);
      });

      const newQueue = mockSetQueue.mock.calls[0][0];
      // 첫 번째 카드 (currentQIndex까지) 유지, 나머지 sp 순 정렬
      expect(newQueue[0].sp).toBe(2);
      // 유령카드(sp=5)가 enemy(sp=8)보다 앞에
    });
  });
});
