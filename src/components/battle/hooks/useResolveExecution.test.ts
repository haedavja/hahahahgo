// @vitest-environment happy-dom
/**
 * @file useResolveExecution.test.ts
 * @description 진행(resolve) 단계 실행 훅 테스트
 *
 * ## 테스트 대상
 * - useResolveExecution: 턴 종료 처리, 전체 큐 실행
 *
 * ## 주요 테스트 케이스
 * - finishTurn: 턴 종료 처리
 * - runAll: 전체 큐 실행 (카드 시간 순서)
 * - 에테르 계산 및 전이
 * - 토큰 정리
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResolveExecution } from './useResolveExecution';

// 유틸리티 모킹
vi.mock('../utils/comboDetection', () => ({
  detectPokerCombo: vi.fn(() => null)
}));

vi.mock('../../../lib/tokenUtils', () => ({
  clearTurnTokens: vi.fn((entity) => ({
    tokens: entity.tokens || {},
    logs: []
  })),
  getTokenStacks: vi.fn(() => 0),
  removeToken: vi.fn((entity) => ({
    tokens: entity.tokens || {},
    logs: []
  })),
  setTokenStacks: vi.fn((entity) => ({
    tokens: entity.tokens || {},
    logs: []
  }))
}));

vi.mock('../utils/cardTraitEffects', () => ({
  processCardTraitEffects: vi.fn(() => ({
    bonusEnergy: 0,
    maxSpeedBonus: 0,
    extraCardPlay: 0
  }))
}));

vi.mock('../../../lib/relicEffects', () => ({
  calculatePassiveEffects: vi.fn(() => ({ etherMultiplier: 1 }))
}));

vi.mock('../../../core/effects', () => ({
  executeTurnEndEffects: vi.fn(() => ({ strength: 0 })),
  COMBAT_AUDIO: {
    ACTION_EXECUTE: { tone: 1000, duration: 150 },
    DEATH: { tone: 200, duration: 500 },
    CRITICAL_HIT: { tone: 1600, duration: 260 },
    NORMAL_HIT: { tone: 1200, duration: 200 },
    BLOCK: { tone: 800, duration: 150 },
  },
}));

vi.mock('../utils/turnEndRelicEffectsProcessing', () => ({
  playTurnEndRelicAnimations: vi.fn(),
  applyTurnEndRelicEffectsToNextTurn: vi.fn((params) => params.nextTurnEffects)
}));

vi.mock('../utils/turnEndEtherCalculation', () => ({
  calculateTurnEndEther: vi.fn(() => ({
    player: { finalEther: 5, appliedEther: 5, overflow: 0 },
    enemy: { finalEther: 3, appliedEther: 3, overflow: 0 }
  })),
  formatPlayerEtherLog: vi.fn(() => '에테르 +5'),
  formatEnemyEtherLog: vi.fn(() => '적 에테르 +3')
}));

vi.mock('../utils/enemyEtherAnimation', () => ({
  startEnemyEtherAnimation: vi.fn()
}));

vi.mock('../utils/etherTransferProcessing', () => ({
  processEtherTransfer: vi.fn(() => ({
    nextPlayerPts: 10,
    nextEnemyPts: 5,
    enemyGraceGain: 0,
    updatedGraceState: null
  }))
}));

vi.mock('../utils/turnEndStateUpdate', () => ({
  updateComboUsageCount: vi.fn((count) => count),
  createTurnEndPlayerState: vi.fn((player) => ({ ...player, etherMultiplier: 1 })),
  createTurnEndEnemyState: vi.fn((enemy, opts) => ({ ...enemy, etherPts: opts.etherPts }))
}));

vi.mock('../utils/victoryDefeatTransition', () => ({
  processVictoryDefeatTransition: vi.fn(() => ({ shouldReturn: false }))
}));

vi.mock('../utils/etherCalculationAnimation', () => ({
  startEtherCalculationAnimationSequence: vi.fn()
}));

vi.mock('../logic/combatActions', () => ({
  applyAction: vi.fn(() => ({ events: [] }))
}));

vi.mock('../utils/etherCalculations', () => ({
  getCardEtherGain: vi.fn(() => 2)
}));

vi.mock('../battleData', () => ({
  CARDS: {},
  BASE_PLAYER_ENERGY: 6
}));

vi.mock('../../../data/relics', () => ({
  RELICS: {}
}));

vi.mock('../../../data/monsterEther', () => ({
  gainGrace: vi.fn((grace) => grace),
  createInitialGraceState: vi.fn(() => ({ gracePoints: 0 }))
}));

describe('useResolveExecution', () => {
  const mockActions = {
    setPlayer: vi.fn(),
    setEnemy: vi.fn(),
    setNextTurnEffects: vi.fn(),
    setEtherFinalValue: vi.fn(),
    setEnemyEtherCalcPhase: vi.fn(),
    setEnemyCurrentDeflation: vi.fn(),
    setEnemyEtherFinalValue: vi.fn(),
    setNetEtherDelta: vi.fn(),
    setPlayerTransferPulse: vi.fn(),
    setEnemyTransferPulse: vi.fn(),
    setTurnEtherAccumulated: vi.fn(),
    setEnemyTurnEtherAccumulated: vi.fn(),
    setSelected: vi.fn(),
    setQueue: vi.fn(),
    setQIndex: vi.fn(),
    setFixedOrder: vi.fn(),
    setUsedCardIndices: vi.fn(),
    setDisappearingCards: vi.fn(),
    setHiddenCards: vi.fn(),
    setTurnNumber: vi.fn(),
    setEnemyPlan: vi.fn(),
    setPhase: vi.fn(),
    setRelicActivated: vi.fn(),
    setSoulShatter: vi.fn(),
    setPostCombatOptions: vi.fn(),
    setActionEvents: vi.fn(),
    setEnemyHit: vi.fn(),
    setEtherCalcPhase: vi.fn()
  };

  const defaultProps = {
    battle: {
      player: { hp: 100, tokens: {}, etherPts: 0 },
      enemy: { hp: 100, tokens: {}, etherPts: 0 },
      selected: [],
      queue: [],
      qIndex: 0,
      nextTurnEffects: {},
      hand: [],
      actionEvents: {}
    },
    player: { hp: 100, tokens: {}, etherPts: 0, comboUsageCount: {}, energy: 6, maxEnergy: 6 },
    enemy: { hp: 100, tokens: {}, etherPts: 0, comboUsageCount: {} },
    selected: [],
    queue: [],
    qIndex: 0,
    turnNumber: 1,
    turnEtherAccumulated: 0,
    enemyTurnEtherAccumulated: 0,
    finalComboMultiplier: 1,
    enemyPlan: { actions: [], mode: null, manuallyModified: false },
    relics: {},
    orderedRelicList: [],
    battleRef: { current: { player: {}, enemy: {} } },
    parryReadyStatesRef: { current: [] },
    setParryReadyStates: vi.fn(),
    growingDefenseRef: { current: null },
    escapeBanRef: { current: new Set() },
    escapeUsedThisTurnRef: { current: new Set() },
    calculateEtherTransfer: vi.fn(() => ({ nextPlayerPts: 10, nextEnemyPts: 5, movedPts: 0 })),
    checkVictoryCondition: vi.fn(() => ({ victory: false })),
    showCardRewardModal: vi.fn(),
    startEtherCalculationAnimation: vi.fn(),
    addLog: vi.fn(),
    playSound: vi.fn(),
    actions: mockActions
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('finishTurn', () => {
    it('턴 종료 시 토큰 정리', () => {
      const { result } = renderHook(() => useResolveExecution(defaultProps as any));

      act(() => {
        result.current.finishTurn('테스트');
      });

      expect(mockActions.setPlayer).toHaveBeenCalled();
      expect(mockActions.setEnemy).toHaveBeenCalled();
    });

    it('턴 종료 시 선택 카드 초기화', () => {
      const { result } = renderHook(() => useResolveExecution(defaultProps as any));

      act(() => {
        result.current.finishTurn('테스트');
      });

      expect(mockActions.setSelected).toHaveBeenCalledWith([]);
      expect(mockActions.setQueue).toHaveBeenCalledWith([]);
      expect(mockActions.setQIndex).toHaveBeenCalledWith(0);
    });

    it('턴 번호 증가', () => {
      const { result } = renderHook(() => useResolveExecution(defaultProps as any));

      act(() => {
        result.current.finishTurn('테스트');
      });

      expect(mockActions.setTurnNumber).toHaveBeenCalledWith(2);
    });

    it('다음 페이즈로 전환', () => {
      const { result } = renderHook(() => useResolveExecution(defaultProps as any));

      act(() => {
        result.current.finishTurn('테스트');
      });

      expect(mockActions.setPhase).toHaveBeenCalledWith('select');
    });

    it('에테르 누적 리셋', () => {
      const { result } = renderHook(() => useResolveExecution(defaultProps as any));

      act(() => {
        result.current.finishTurn('테스트');
      });

      expect(mockActions.setTurnEtherAccumulated).toHaveBeenCalledWith(0);
      expect(mockActions.setEnemyTurnEtherAccumulated).toHaveBeenCalledWith(0);
    });

    it('적 계획 초기화', () => {
      const { result } = renderHook(() => useResolveExecution(defaultProps as any));

      act(() => {
        result.current.finishTurn('테스트');
      });

      expect(mockActions.setEnemyPlan).toHaveBeenCalledWith({
        actions: [],
        mode: null,
        manuallyModified: false
      });
    });
  });

  describe('runAll', () => {
    it('큐가 비어있으면 조기 반환', () => {
      const props = {
        ...defaultProps,
        battle: { ...defaultProps.battle, qIndex: 0, queue: [] }
      };
      const { result } = renderHook(() => useResolveExecution(props as any));

      act(() => {
        result.current.runAll();
      });

      expect(mockActions.setQIndex).not.toHaveBeenCalled();
    });

    it('큐가 이미 끝났으면 조기 반환', () => {
      const props = {
        ...defaultProps,
        battle: {
          ...defaultProps.battle,
          qIndex: 2,
          queue: [{ actor: 'player', card: {} }, { actor: 'enemy', card: {} }]
        }
      };
      const { result } = renderHook(() => useResolveExecution(props as any));

      act(() => {
        result.current.runAll();
      });

      expect(mockActions.setQIndex).not.toHaveBeenCalled();
    });

    it('모든 카드 실행 후 qIndex 업데이트', () => {
      const queue = [
        { actor: 'player', card: { id: 1, speedCost: 3 }, sp: 3 },
        { actor: 'enemy', card: { id: 2, speedCost: 5 }, sp: 5 }
      ];
      const props = {
        ...defaultProps,
        battle: { ...defaultProps.battle, queue, qIndex: 0 }
      };
      const { result } = renderHook(() => useResolveExecution(props as any));

      act(() => {
        result.current.runAll();
      });

      expect(mockActions.setQIndex).toHaveBeenCalledWith(2);
    });

    it('에테르 누적 업데이트', () => {
      const queue = [
        { actor: 'player', card: { id: 1 }, sp: 3 }
      ];
      const props = {
        ...defaultProps,
        battle: { ...defaultProps.battle, queue, qIndex: 0 }
      };
      const { result } = renderHook(() => useResolveExecution(props as any));

      act(() => {
        result.current.runAll();
      });

      expect(mockActions.setTurnEtherAccumulated).toHaveBeenCalled();
    });

    it('적 처치 시 남은 적 행동 스킵', () => {
      const queue = [
        { actor: 'player', card: { id: 1 }, sp: 1 },
        { actor: 'enemy', card: { id: 2 }, sp: 2 },
        { actor: 'enemy', card: { id: 3 }, sp: 3 }
      ];
      const props = {
        ...defaultProps,
        battle: { ...defaultProps.battle, queue, qIndex: 0 },
        enemy: { hp: 0, tokens: {}, etherPts: 0 } // 적 HP 0
      };
      const { result } = renderHook(() => useResolveExecution(props as any));

      act(() => {
        result.current.runAll();
      });

      // 적 처치 로그 확인
      expect(defaultProps.addLog).toHaveBeenCalledWith(expect.stringContaining('처치'));
    });
  });

  describe('에테르 시스템', () => {
    it('플레이어 에테르 획득 처리', () => {
      const { result } = renderHook(() => useResolveExecution(defaultProps as any));

      act(() => {
        result.current.finishTurn('테스트');
      });

      expect(mockActions.setEtherFinalValue).toHaveBeenCalledWith(5);
    });

    it('적 에테르 획득 처리', () => {
      const { result } = renderHook(() => useResolveExecution(defaultProps as any));

      act(() => {
        result.current.finishTurn('테스트');
      });

      expect(mockActions.setEnemyEtherFinalValue).toHaveBeenCalledWith(3);
    });
  });
});
