// @vitest-environment happy-dom
/**
 * @file usePhaseTransition.test.ts
 * @description 전투 페이즈 전환 훅 테스트
 *
 * ## 테스트 대상
 * - usePhaseTransition: select → respond → resolve 전환
 *
 * ## 주요 테스트 케이스
 * - startResolve: select → respond
 * - beginResolveFromRespond: respond → resolve
 * - rewindToSelect: 되감기 기능
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePhaseTransition } from './usePhaseTransition';

// 테스트용 타입 정의
interface TestCard {
  id?: number;
  speedCost?: number;
  actionCost?: number;
}

interface TestPhaseTransitionProps {
  battleRef: {
    current: {
      phase: string;
      enemyPlan: { actions: unknown[]; mode: string | null; manuallyModified: boolean };
      player: { etherPts: number; enemyFrozen: boolean };
      fixedOrder: unknown[] | null;
      frozenOrder: number;
    };
  };
  battlePhase: string;
  battleSelected: TestCard[];
  selected: TestCard[];
  fixedOrder: unknown[] | null;
  effectiveAgility: number;
  enemy: { etherPts: number; cardsPerTurn: number; units: unknown[] };
  enemyPlan: { actions: unknown[]; mode: string | null; manuallyModified: boolean };
  enemyCount: number;
  player: { etherPts: number };
  willOverdrive: boolean;
  turnNumber: number;
  rewindUsed: boolean;
  respondSnapshot: { selectedSnapshot: unknown[]; enemyActions: unknown[] } | null;
  devilDiceTriggeredRef: { current: boolean };
  etherSlots: ReturnType<typeof vi.fn>;
  playSound: ReturnType<typeof vi.fn>;
  addLog: ReturnType<typeof vi.fn>;
  actions: Record<string, ReturnType<typeof vi.fn>>;
}

// 유틸리티 모킹
vi.mock('../utils/comboDetection', () => ({
  detectPokerCombo: vi.fn(() => null),
  applyPokerBonus: vi.fn((cards) => cards)
}));

vi.mock('../utils/cardOrdering', () => ({
  createFixedOrder: vi.fn((playerCards, enemyCards) => [
    ...playerCards.map((c: { speedCost?: number }) => ({ actor: 'player', card: c, sp: c.speedCost || 3 })),
    ...enemyCards.map((c: { speedCost?: number }) => ({ actor: 'enemy', card: c, sp: c.speedCost || 5 }))
  ])
}));

vi.mock('../utils/combatUtils', () => ({
  sortCombinedOrderStablePF: vi.fn((playerCards, enemyCards) => [
    ...playerCards.map((c: { speedCost?: number }) => ({ actor: 'player', card: c, sp: c.speedCost || 3 })),
    ...enemyCards.map((c: { speedCost?: number }) => ({ actor: 'enemy', card: c, sp: c.speedCost || 5 }))
  ])
}));

vi.mock('../utils/enemyAI', () => ({
  generateEnemyActions: vi.fn(() => [{ id: 'enemy_card', speedCost: 5 }]),
  shouldEnemyOverdrive: vi.fn(() => false),
  assignSourceUnitToActions: vi.fn((actions) => actions)
}));

vi.mock('../utils/battleUtils', () => ({
  applyTraitModifiers: vi.fn((card) => card),
  markCrossedCards: vi.fn((queue) => queue)
}));

vi.mock('../utils/cardSpecialEffects', () => ({
  processQueueCollisions: vi.fn((queue) => ({ filteredQueue: queue }))
}));

vi.mock('../../../lib/soundUtils', () => ({
  playCardSubmitSound: vi.fn(),
  playProceedSound: vi.fn()
}));

vi.mock('../battleData', () => ({
  ETHER_THRESHOLD: 100
}));

describe('usePhaseTransition', () => {
  const mockActions = {
    setEnemyPlan: vi.fn(),
    setFixedOrder: vi.fn(),
    setPlayer: vi.fn(),
    setFrozenOrder: vi.fn(),
    setRespondSnapshot: vi.fn(),
    setPhase: vi.fn(),
    setQueue: vi.fn(),
    setQIndex: vi.fn(),
    setEtherCalcPhase: vi.fn(),
    setEtherFinalValue: vi.fn(),
    setEnemyEtherFinalValue: vi.fn(),
    setCurrentDeflation: vi.fn(),
    setEnemyEtherCalcPhase: vi.fn(),
    setEnemyCurrentDeflation: vi.fn(),
    setEnemy: vi.fn(),
    setPlayerOverdriveFlash: vi.fn(),
    setEnemyOverdriveFlash: vi.fn(),
    setResolveStartPlayer: vi.fn(),
    setResolveStartEnemy: vi.fn(),
    setResolvedPlayerCards: vi.fn(),
    setTimelineProgress: vi.fn(),
    setTimelineIndicatorVisible: vi.fn(),
    setNetEtherDelta: vi.fn(),
    setAutoProgress: vi.fn(),
    incrementRewindUsedCount: vi.fn(),
    setSelected: vi.fn()
  };

  const defaultProps = {
    battleRef: {
      current: {
        phase: 'select',
        enemyPlan: { actions: [], mode: null, manuallyModified: false },
        player: { etherPts: 0, enemyFrozen: false },
        fixedOrder: null,
        frozenOrder: 0
      }
    },
    battlePhase: 'select',
    battleSelected: [{ id: 1, speedCost: 3 }],
    selected: [{ id: 1, speedCost: 3 }],
    fixedOrder: null,
    effectiveAgility: 0,
    enemy: { etherPts: 0, cardsPerTurn: 2, units: [] },
    enemyPlan: { actions: [], mode: null, manuallyModified: false },
    enemyCount: 1,
    player: { etherPts: 0 },
    willOverdrive: false,
    turnNumber: 1,
    rewindUsedCount: 0,
    respondSnapshot: null,
    devilDiceTriggeredRef: { current: false },
    etherSlots: vi.fn(() => 0),
    playSound: vi.fn(),
    addLog: vi.fn(),
    actions: mockActions
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('startResolve (select → respond)', () => {
    it('select 페이즈가 아니면 무시', () => {
      const props = {
        ...defaultProps,
        battleRef: {
          current: {
            ...defaultProps.battleRef.current,
            phase: 'respond'
          }
        }
      };
      const { result } = renderHook(() => usePhaseTransition(props as TestPhaseTransitionProps as Parameters<typeof usePhaseTransition>[0]));

      act(() => {
        result.current.startResolve();
      });

      expect(mockActions.setPhase).not.toHaveBeenCalled();
    });

    it('respond 페이즈로 전환', () => {
      const { result } = renderHook(() => usePhaseTransition(defaultProps as TestPhaseTransitionProps as Parameters<typeof usePhaseTransition>[0]));

      act(() => {
        result.current.startResolve();
      });

      expect(mockActions.setPhase).toHaveBeenCalledWith('respond');
    });

    it('적 행동 생성', () => {
      const { result } = renderHook(() => usePhaseTransition(defaultProps as TestPhaseTransitionProps as Parameters<typeof usePhaseTransition>[0]));

      act(() => {
        result.current.startResolve();
      });

      expect(mockActions.setEnemyPlan).toHaveBeenCalled();
    });

    it('고정 순서 설정', () => {
      const { result } = renderHook(() => usePhaseTransition(defaultProps as TestPhaseTransitionProps as Parameters<typeof usePhaseTransition>[0]));

      act(() => {
        result.current.startResolve();
      });

      expect(mockActions.setFixedOrder).toHaveBeenCalled();
    });

    it('되감기 스냅샷 저장', () => {
      const { result } = renderHook(() => usePhaseTransition(defaultProps as TestPhaseTransitionProps as Parameters<typeof usePhaseTransition>[0]));

      act(() => {
        result.current.startResolve();
      });

      expect(mockActions.setRespondSnapshot).toHaveBeenCalled();
    });

    it('최대 되감기 횟수 사용했으면 스냅샷 저장 안함', () => {
      const props = { ...defaultProps, rewindUsedCount: 1 }; // 기본 1회 사용
      const { result } = renderHook(() => usePhaseTransition(props as TestPhaseTransitionProps as Parameters<typeof usePhaseTransition>[0]));

      act(() => {
        result.current.startResolve();
      });

      expect(mockActions.setRespondSnapshot).not.toHaveBeenCalled();
    });
  });

  describe('beginResolveFromRespond (respond → resolve)', () => {
    it('respond 페이즈가 아니면 무시', () => {
      const props = {
        ...defaultProps,
        battleRef: {
          current: {
            ...defaultProps.battleRef.current,
            phase: 'select'
          }
        }
      };
      const { result } = renderHook(() => usePhaseTransition(props as TestPhaseTransitionProps as Parameters<typeof usePhaseTransition>[0]));

      act(() => {
        result.current.beginResolveFromRespond();
      });

      expect(mockActions.setQueue).not.toHaveBeenCalled();
    });

    it('fixedOrder 없으면 오류 로그', () => {
      const props = {
        ...defaultProps,
        battleRef: {
          current: {
            ...defaultProps.battleRef.current,
            phase: 'respond',
            fixedOrder: null
          }
        },
        fixedOrder: null
      };
      const { result } = renderHook(() => usePhaseTransition(props as TestPhaseTransitionProps as Parameters<typeof usePhaseTransition>[0]));

      act(() => {
        result.current.beginResolveFromRespond();
      });

      expect(defaultProps.addLog).toHaveBeenCalledWith(expect.stringContaining('오류'));
    });

    it('resolve 페이즈로 전환', () => {
      const fixedOrder = [{ actor: 'player', card: { id: 1 }, sp: 3 }];
      const props = {
        ...defaultProps,
        battleRef: {
          current: {
            ...defaultProps.battleRef.current,
            phase: 'respond',
            fixedOrder
          }
        },
        fixedOrder
      };
      const { result } = renderHook(() => usePhaseTransition(props as TestPhaseTransitionProps as Parameters<typeof usePhaseTransition>[0]));

      act(() => {
        result.current.beginResolveFromRespond();
      });

      expect(mockActions.setPhase).toHaveBeenCalledWith('resolve');
    });

    it('큐와 인덱스 설정', () => {
      const fixedOrder = [{ actor: 'player', card: { id: 1 }, sp: 3 }];
      const props = {
        ...defaultProps,
        battleRef: {
          current: {
            ...defaultProps.battleRef.current,
            phase: 'respond',
            fixedOrder
          }
        },
        fixedOrder
      };
      const { result } = renderHook(() => usePhaseTransition(props as TestPhaseTransitionProps as Parameters<typeof usePhaseTransition>[0]));

      act(() => {
        result.current.beginResolveFromRespond();
      });

      expect(mockActions.setQueue).toHaveBeenCalled();
      expect(mockActions.setQIndex).toHaveBeenCalledWith(0);
    });

    it('자동진행 활성화', () => {
      const fixedOrder = [{ actor: 'player', card: { id: 1 }, sp: 3 }];
      const props = {
        ...defaultProps,
        battleRef: {
          current: {
            ...defaultProps.battleRef.current,
            phase: 'respond',
            fixedOrder
          }
        },
        fixedOrder
      };
      const { result } = renderHook(() => usePhaseTransition(props as TestPhaseTransitionProps as Parameters<typeof usePhaseTransition>[0]));

      act(() => {
        result.current.beginResolveFromRespond();
      });

      expect(mockActions.setAutoProgress).toHaveBeenCalledWith(true);
    });

    it('에테르 폭주 발동 (플레이어)', () => {
      const fixedOrder = [{ actor: 'player', card: { id: 1 }, sp: 3 }];
      const props = {
        ...defaultProps,
        willOverdrive: true,
        etherSlots: vi.fn(() => 1),
        player: { etherPts: 100 },
        battleRef: {
          current: {
            ...defaultProps.battleRef.current,
            phase: 'respond',
            fixedOrder
          }
        },
        fixedOrder
      };
      const { result } = renderHook(() => usePhaseTransition(props as TestPhaseTransitionProps as Parameters<typeof usePhaseTransition>[0]));

      act(() => {
        result.current.beginResolveFromRespond();
      });

      expect(mockActions.setPlayer).toHaveBeenCalled();
      expect(mockActions.setPlayerOverdriveFlash).toHaveBeenCalledWith(true);
    });

    it('빈 큐면 오류 메시지', () => {
      const props = {
        ...defaultProps,
        battleRef: {
          current: {
            ...defaultProps.battleRef.current,
            phase: 'respond',
            fixedOrder: []
          }
        },
        fixedOrder: []
      };
      const { result } = renderHook(() => usePhaseTransition(props as TestPhaseTransitionProps as Parameters<typeof usePhaseTransition>[0]));

      act(() => {
        result.current.beginResolveFromRespond();
      });

      expect(defaultProps.addLog).toHaveBeenCalledWith(expect.stringContaining('없습니다'));
    });
  });

  describe('rewindToSelect (되감기)', () => {
    it('최대 되감기 횟수 사용했으면 경고', () => {
      const respondSnapshot = {
        selectedSnapshot: [{ id: 1 }],
        enemyActions: []
      };
      const props = { ...defaultProps, rewindUsedCount: 1, respondSnapshot }; // 기본 1회 사용
      const { result } = renderHook(() => usePhaseTransition(props as TestPhaseTransitionProps as Parameters<typeof usePhaseTransition>[0]));

      act(() => {
        result.current.rewindToSelect();
      });

      expect(defaultProps.addLog).toHaveBeenCalledWith(expect.stringContaining('1회'));
      expect(mockActions.setPhase).not.toHaveBeenCalled();
    });

    it('스냅샷 없으면 경고', () => {
      const props = { ...defaultProps, respondSnapshot: null };
      const { result } = renderHook(() => usePhaseTransition(props as TestPhaseTransitionProps as Parameters<typeof usePhaseTransition>[0]));

      act(() => {
        result.current.rewindToSelect();
      });

      expect(defaultProps.addLog).toHaveBeenCalledWith(expect.stringContaining('없습니다'));
    });

    it('되감기 성공', () => {
      const respondSnapshot = {
        selectedSnapshot: [{ id: 1 }],
        enemyActions: []
      };
      const props = { ...defaultProps, respondSnapshot, rewindUsedCount: 0 };
      const { result } = renderHook(() => usePhaseTransition(props as TestPhaseTransitionProps as Parameters<typeof usePhaseTransition>[0]));

      act(() => {
        result.current.rewindToSelect();
      });

      expect(mockActions.incrementRewindUsedCount).toHaveBeenCalled();
      expect(mockActions.setPhase).toHaveBeenCalledWith('select');
      expect(mockActions.setSelected).toHaveBeenCalledWith([{ id: 1 }]);
    });

    it('되감기 시 큐 초기화', () => {
      const respondSnapshot = {
        selectedSnapshot: [],
        enemyActions: []
      };
      const props = { ...defaultProps, respondSnapshot, rewindUsedCount: 0 };
      const { result } = renderHook(() => usePhaseTransition(props as TestPhaseTransitionProps as Parameters<typeof usePhaseTransition>[0]));

      act(() => {
        result.current.rewindToSelect();
      });

      expect(mockActions.setFixedOrder).toHaveBeenCalledWith(null);
      expect(mockActions.setQueue).toHaveBeenCalledWith([]);
      expect(mockActions.setQIndex).toHaveBeenCalledWith(0);
    });
  });
});
