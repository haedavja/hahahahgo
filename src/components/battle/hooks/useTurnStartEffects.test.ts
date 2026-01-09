// @vitest-environment happy-dom
/**
 * @file useTurnStartEffects.test.ts
 * @description 턴 시작 효과 처리 훅 테스트
 *
 * ## 테스트 대상
 * - useTurnStartEffects: 턴 시작 시 효과 적용
 *
 * ## 주요 테스트 케이스
 * - 상징 턴 시작 효과
 * - 에너지/체력/방어력 보너스
 * - 적 패시브 효과
 * - 손패 생성
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTurnStartEffects } from './useTurnStartEffects';

// 모킹
vi.mock('../../../data/relics', () => ({
  RELICS: {
    test_relic: { id: 'test_relic', effects: { type: 'ON_TURN_START' } }
  }
}));

vi.mock('../../../lib/relicEffects', () => ({
  calculatePassiveEffects: vi.fn(() => ({
    etherMultiplier: 1
  }))
}));

vi.mock('../../../core/effects', () => ({
  executeTurnStartEffects: vi.fn(() => ({
    energy: 0,
    block: 0,
    heal: 0
  }))
}));

vi.mock('../../../data/reflections', () => ({
  convertTraitsToIds: vi.fn(() => [])
}));

vi.mock('../../../lib/tokenUtils', () => ({
  getAllTokens: vi.fn(() => []),
  addToken: vi.fn((entity, tokenId, stacks) => ({
    tokens: { ...entity.tokens, [tokenId]: stacks },
    logs: []
  }))
}));

vi.mock('../../../lib/ethosEffects', () => ({
  processEthosAtBattleStart: vi.fn((player) => ({
    updatedPlayer: player,
    tokensToAdd: [],
    logs: []
  }))
}));

vi.mock('../../../state/slices/growthSlice', () => ({
  initialGrowthState: {}
}));

vi.mock('../utils/handGeneration', () => ({
  drawFromDeck: vi.fn(() => ({
    drawnCards: [{ id: 'card1', __handUid: 'uid1' }],
    newDeck: [],
    newDiscardPile: [],
    reshuffled: false
  }))
}));

vi.mock('../utils/enemyAI', () => ({
  decideEnemyMode: vi.fn(() => 'balanced'),
  generateEnemyActions: vi.fn(() => []),
  expandActionsWithGhosts: vi.fn((actions) => actions)
}));

vi.mock('../../../state/gameStore', () => ({
  useGameStore: {
    getState: vi.fn(() => ({
      growth: {},
      characterBuild: null
    }))
  }
}));

vi.mock('../battleData', () => ({
  DEFAULT_PLAYER_MAX_SPEED: 30,
  DEFAULT_DRAW_COUNT: 5,
  CARDS: []
}));

vi.mock('../../../lib/randomUtils', () => ({
  generateHandUid: vi.fn((id, idx) => `${id}_${idx}`)
}));

vi.mock('../../../data/monsterEther', () => ({
  updateGraceOnTurnStart: vi.fn((grace) => grace),
  processAutoPrayers: vi.fn(() => []),
  createInitialGraceState: vi.fn(() => ({ gracePts: 0 }))
}));

// 테스트용 타입 정의
interface TestTurnStartEffectsProps {
  battle: {
    phase: string;
    hand: unknown[];
    deck: unknown[];
    discardPile: unknown[];
    vanishedCards: unknown[];
    frozenOrder: number;
    reflectionState: Record<string, unknown>;
    enemyPlan: { mode: string | null; actions: unknown[]; manuallyModified: boolean };
  };
  player: {
    hp: number;
    maxHp: number;
    block: number;
    energy: number;
    maxEnergy: number;
    maxSpeed: number;
    strength: number;
    tokens: Record<string, unknown>;
    etherMultiplier: number;
  };
  enemy: {
    name: string;
    hp: number;
    maxHp: number;
    etherPts: number;
    strength?: number;
    passives: Record<string, unknown>;
    units: unknown[];
  };
  enemyPlan: { mode: string | null; actions: unknown[]; manuallyModified: boolean };
  nextTurnEffects: Record<string, unknown>;
  turnNumber: number;
  baseMaxEnergy: number;
  orderedRelicList: unknown[];
  playerEgos: unknown[];
  playerTraits: unknown[];
  enemyCount: number;
  battleRef: { current: Record<string, unknown> };
  escapeBanRef: { current: Set<unknown> };
  turnStartProcessedRef: { current: boolean };
  etherSlots: ReturnType<typeof vi.fn>;
  playSound: ReturnType<typeof vi.fn>;
  addLog: ReturnType<typeof vi.fn>;
  actions: Record<string, ReturnType<typeof vi.fn>>;
}

describe('useTurnStartEffects', () => {
  const mockActions = {
    setFixedOrder: vi.fn(),
    setActionEvents: vi.fn(),
    setCanRedraw: vi.fn(),
    setWillOverdrive: vi.fn(),
    setRelicActivated: vi.fn(),
    setReflectionState: vi.fn(),
    setPlayer: vi.fn(),
    setEnemy: vi.fn(),
    setFrozenOrder: vi.fn(),
    setDeck: vi.fn(),
    setDiscardPile: vi.fn(),
    setHand: vi.fn(),
    setSelected: vi.fn(),
    setEnemyPlan: vi.fn(),
    updateNextTurnEffects: vi.fn()
  };

  const defaultProps = {
    battle: {
      phase: 'select',
      hand: [],
      deck: [],
      discardPile: [],
      vanishedCards: [],
      frozenOrder: 0,
      reflectionState: {},
      enemyPlan: { mode: null, actions: [], manuallyModified: false }
    },
    player: {
      hp: 100,
      maxHp: 100,
      block: 0,
      energy: 6,
      maxEnergy: 6,
      maxSpeed: 30,
      strength: 0,
      tokens: {},
      etherMultiplier: 1
    },
    enemy: {
      name: '적',
      hp: 100,
      maxHp: 100,
      etherPts: 0,
      passives: {},
      units: []
    },
    enemyPlan: { mode: null, actions: [], manuallyModified: false },
    nextTurnEffects: {},
    turnNumber: 1,
    baseMaxEnergy: 6,
    orderedRelicList: [],
    playerEgos: [],
    playerTraits: [],
    enemyCount: 1,
    battleRef: { current: {} },
    escapeBanRef: { current: new Set() },
    turnStartProcessedRef: { current: false },
    etherSlots: vi.fn(() => 0),
    playSound: vi.fn(),
    addLog: vi.fn(),
    actions: mockActions
  };

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps.turnStartProcessedRef.current = false;
  });

  describe('페이즈 체크', () => {
    it('select 페이즈에서만 실행', () => {
      renderHook(() => useTurnStartEffects(defaultProps as TestTurnStartEffectsProps as Parameters<typeof useTurnStartEffects>[0]));

      expect(mockActions.setFixedOrder).toHaveBeenCalledWith(null);
    });

    it('respond 페이즈에서는 실행 안함', () => {
      const props = {
        ...defaultProps,
        battle: { ...defaultProps.battle, phase: 'respond' }
      };
      renderHook(() => useTurnStartEffects(props as TestTurnStartEffectsProps as Parameters<typeof useTurnStartEffects>[0]));

      expect(mockActions.setFixedOrder).not.toHaveBeenCalled();
    });

    it('중복 실행 방지', () => {
      defaultProps.turnStartProcessedRef.current = true;
      renderHook(() => useTurnStartEffects(defaultProps as TestTurnStartEffectsProps as Parameters<typeof useTurnStartEffects>[0]));

      expect(mockActions.setPlayer).not.toHaveBeenCalled();
    });
  });

  describe('플레이어 상태 업데이트', () => {
    it('에너지 보너스 적용', () => {
      const props = {
        ...defaultProps,
        nextTurnEffects: { bonusEnergy: 2 }
      };
      renderHook(() => useTurnStartEffects(props as TestTurnStartEffectsProps as Parameters<typeof useTurnStartEffects>[0]));

      expect(mockActions.setPlayer).toHaveBeenCalledWith(
        expect.objectContaining({
          energy: 8 // 6 + 2
        })
      );
    });

    it('에너지 페널티 적용', () => {
      const props = {
        ...defaultProps,
        nextTurnEffects: { energyPenalty: 2 }
      };
      renderHook(() => useTurnStartEffects(props as TestTurnStartEffectsProps as Parameters<typeof useTurnStartEffects>[0]));

      expect(mockActions.setPlayer).toHaveBeenCalledWith(
        expect.objectContaining({
          energy: 4 // 6 - 2
        })
      );
    });

    it('최대속도 보너스 적용', () => {
      const props = {
        ...defaultProps,
        nextTurnEffects: { maxSpeedBonus: 10 }
      };
      renderHook(() => useTurnStartEffects(props as TestTurnStartEffectsProps as Parameters<typeof useTurnStartEffects>[0]));

      expect(mockActions.setPlayer).toHaveBeenCalledWith(
        expect.objectContaining({
          maxSpeed: 40 // 30 + 10
        })
      );
    });
  });

  describe('적 패시브 효과', () => {
    it('매턴 체력 회복', () => {
      const props = {
        ...defaultProps,
        enemy: {
          ...defaultProps.enemy,
          hp: 80,
          passives: { healPerTurn: 5 }
        }
      };
      renderHook(() => useTurnStartEffects(props as TestTurnStartEffectsProps as Parameters<typeof useTurnStartEffects>[0]));

      expect(mockActions.setEnemy).toHaveBeenCalledWith(
        expect.objectContaining({
          hp: 85
        })
      );
    });

    it('매턴 힘 증가', () => {
      const props = {
        ...defaultProps,
        enemy: {
          ...defaultProps.enemy,
          strength: 0,
          passives: { strengthPerTurn: 3 }
        }
      };
      renderHook(() => useTurnStartEffects(props as TestTurnStartEffectsProps as Parameters<typeof useTurnStartEffects>[0]));

      expect(mockActions.setEnemy).toHaveBeenCalledWith(
        expect.objectContaining({
          strength: 3
        })
      );
    });
  });

  describe('초기화', () => {
    it('fixedOrder 초기화', () => {
      renderHook(() => useTurnStartEffects(defaultProps as TestTurnStartEffectsProps as Parameters<typeof useTurnStartEffects>[0]));

      expect(mockActions.setFixedOrder).toHaveBeenCalledWith(null);
    });

    it('actionEvents 초기화', () => {
      renderHook(() => useTurnStartEffects(defaultProps as TestTurnStartEffectsProps as Parameters<typeof useTurnStartEffects>[0]));

      expect(mockActions.setActionEvents).toHaveBeenCalledWith({});
    });

    it('canRedraw true 설정', () => {
      renderHook(() => useTurnStartEffects(defaultProps as TestTurnStartEffectsProps as Parameters<typeof useTurnStartEffects>[0]));

      expect(mockActions.setCanRedraw).toHaveBeenCalledWith(true);
    });

    it('willOverdrive false 설정', () => {
      renderHook(() => useTurnStartEffects(defaultProps as TestTurnStartEffectsProps as Parameters<typeof useTurnStartEffects>[0]));

      expect(mockActions.setWillOverdrive).toHaveBeenCalledWith(false);
    });
  });

  describe('적 행동 계획', () => {
    it('적 성향 결정', () => {
      renderHook(() => useTurnStartEffects(defaultProps as TestTurnStartEffectsProps as Parameters<typeof useTurnStartEffects>[0]));

      expect(mockActions.setEnemyPlan).toHaveBeenCalled();
    });

    it('manuallyModified면 기존 행동 유지', () => {
      const props = {
        ...defaultProps,
        battle: {
          ...defaultProps.battle,
          enemyPlan: {
            mode: 'aggressive',
            actions: [{ id: 'existing' }],
            manuallyModified: true
          }
        }
      };
      renderHook(() => useTurnStartEffects(props as TestTurnStartEffectsProps as Parameters<typeof useTurnStartEffects>[0]));

      expect(mockActions.setEnemyPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          manuallyModified: true
        })
      );
    });
  });

  describe('손패 관리', () => {
    it('첫 턴에 선택 카드 초기화', () => {
      renderHook(() => useTurnStartEffects(defaultProps as TestTurnStartEffectsProps as Parameters<typeof useTurnStartEffects>[0]));

      expect(mockActions.setSelected).toHaveBeenCalledWith([]);
    });
  });
});
