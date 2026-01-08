// @vitest-environment happy-dom
/**
 * @file useBattleTimelines.test.ts
 * @description 전투 타임라인 계산 훅 테스트
 *
 * ## 테스트 대상
 * - useBattleTimelines: 플레이어/적 타임라인 계산
 *
 * ## 주요 테스트 케이스
 * - select 페이즈: 선택 카드로 계산
 * - respond 페이즈: fixedOrder 사용
 * - resolve 페이즈: 실행 큐 사용
 * - 통찰 레벨에 따른 적 타임라인 표시
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBattleTimelines } from './useBattleTimelines';

// 유틸리티 모킹
vi.mock('../utils/comboDetection', () => ({
  detectPokerCombo: vi.fn(() => null)
}));

vi.mock('../utils/battleUtils', () => ({
  applyTraitModifiers: vi.fn((card) => card)
}));

vi.mock('../../../lib/agilityUtils', () => ({
  applyAgility: vi.fn((speed) => speed)
}));

// 테스트용 타입 정의
interface TestCard {
  id: number | string;
  speedCost?: number;
  actionCost?: number;
}

interface TestQueueEntry {
  actor: string;
  card: TestCard;
  sp: number;
}

interface TestBattleTimelinesProps {
  battlePhase: string;
  battleSelected: TestCard[];
  fixedOrder: TestQueueEntry[] | null;
  battleQueue: TestQueueEntry[];
  playerComboUsageCount: Record<string, number>;
  effectiveAgility: number;
  enemyPlanActions: TestCard[];
  insightReveal: { visible: boolean; level: number };
  selected: TestCard[];
}

describe('useBattleTimelines', () => {
  const defaultProps = {
    battlePhase: 'select',
    battleSelected: [],
    fixedOrder: null,
    battleQueue: [],
    playerComboUsageCount: {},
    effectiveAgility: 0,
    enemyPlanActions: [],
    insightReveal: { visible: false, level: 0 },
    selected: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('select 페이즈', () => {
    it('선택 카드 없으면 빈 타임라인', () => {
      const { result } = renderHook(() => useBattleTimelines(defaultProps as TestBattleTimelinesProps as Parameters<typeof useBattleTimelines>[0]));

      expect(result.current.playerTimeline).toEqual([]);
      expect(result.current.enemyTimeline).toEqual([]);
    });

    it('선택 카드로 플레이어 타임라인 계산', () => {
      const cards = [
        { id: 1, speedCost: 3, actionCost: 1 },
        { id: 2, speedCost: 5, actionCost: 2 }
      ];
      const props = {
        ...defaultProps,
        battleSelected: cards,
        selected: cards
      };
      const { result } = renderHook(() => useBattleTimelines(props as TestBattleTimelinesProps as Parameters<typeof useBattleTimelines>[0]));

      expect(result.current.playerTimeline).toHaveLength(2);
      expect(result.current.playerTimeline[0].sp).toBe(3);
      expect(result.current.playerTimeline[1].sp).toBe(8); // 3 + 5
    });

    it('통찰 없으면 적 타임라인 숨김', () => {
      const props = {
        ...defaultProps,
        enemyPlanActions: [{ id: 'enemy1', speedCost: 4 }],
        insightReveal: { visible: false, level: 0 }
      };
      const { result } = renderHook(() => useBattleTimelines(props as TestBattleTimelinesProps as Parameters<typeof useBattleTimelines>[0]));

      expect(result.current.enemyTimeline).toEqual([]);
    });

    it('통찰 레벨 1: 적 카드 2장만', () => {
      const enemyCards = [
        { id: 'e1', speedCost: 2 },
        { id: 'e2', speedCost: 3 },
        { id: 'e3', speedCost: 4 }
      ];
      const props = {
        ...defaultProps,
        enemyPlanActions: enemyCards,
        insightReveal: { visible: true, level: 1 }
      };
      const { result } = renderHook(() => useBattleTimelines(props as TestBattleTimelinesProps as Parameters<typeof useBattleTimelines>[0]));

      expect(result.current.enemyTimeline).toHaveLength(2);
    });

    it('통찰 레벨 2+: 적 카드 전체', () => {
      const enemyCards = [
        { id: 'e1', speedCost: 2 },
        { id: 'e2', speedCost: 3 },
        { id: 'e3', speedCost: 4 }
      ];
      const props = {
        ...defaultProps,
        enemyPlanActions: enemyCards,
        insightReveal: { visible: true, level: 2 }
      };
      const { result } = renderHook(() => useBattleTimelines(props as TestBattleTimelinesProps as Parameters<typeof useBattleTimelines>[0]));

      expect(result.current.enemyTimeline).toHaveLength(3);
    });
  });

  describe('respond 페이즈', () => {
    it('fixedOrder에서 플레이어 카드 필터', () => {
      const fixedOrder = [
        { actor: 'player', card: { id: 1 }, sp: 3 },
        { actor: 'enemy', card: { id: 2 }, sp: 5 },
        { actor: 'player', card: { id: 3 }, sp: 7 }
      ];
      const props = {
        ...defaultProps,
        battlePhase: 'respond',
        fixedOrder
      };
      const { result } = renderHook(() => useBattleTimelines(props as TestBattleTimelinesProps as Parameters<typeof useBattleTimelines>[0]));

      expect(result.current.playerTimeline).toHaveLength(2);
      expect((result.current.playerTimeline[0].card as TestCard).id).toBe(1);
      expect((result.current.playerTimeline[1].card as TestCard).id).toBe(3);
    });

    it('fixedOrder에서 적 카드 필터', () => {
      const fixedOrder = [
        { actor: 'player', card: { id: 1 }, sp: 3 },
        { actor: 'enemy', card: { id: 2 }, sp: 5 }
      ];
      const props = {
        ...defaultProps,
        battlePhase: 'respond',
        fixedOrder
      };
      const { result } = renderHook(() => useBattleTimelines(props as TestBattleTimelinesProps as Parameters<typeof useBattleTimelines>[0]));

      expect(result.current.enemyTimeline).toHaveLength(1);
      expect((result.current.enemyTimeline[0].card as TestCard).id).toBe(2);
    });

    it('fixedOrder가 없으면 빈 배열', () => {
      const props = {
        ...defaultProps,
        battlePhase: 'respond',
        fixedOrder: null
      };
      const { result } = renderHook(() => useBattleTimelines(props as TestBattleTimelinesProps as Parameters<typeof useBattleTimelines>[0]));

      expect(result.current.playerTimeline).toEqual([]);
      expect(result.current.enemyTimeline).toEqual([]);
    });
  });

  describe('resolve 페이즈', () => {
    it('battleQueue에서 플레이어 카드 필터', () => {
      const queue = [
        { actor: 'player', card: { id: 1 }, sp: 2 },
        { actor: 'enemy', card: { id: 2 }, sp: 4 },
        { actor: 'player', card: { id: 3 }, sp: 6 }
      ];
      const props = {
        ...defaultProps,
        battlePhase: 'resolve',
        battleQueue: queue
      };
      const { result } = renderHook(() => useBattleTimelines(props as TestBattleTimelinesProps as Parameters<typeof useBattleTimelines>[0]));

      expect(result.current.playerTimeline).toHaveLength(2);
    });

    it('battleQueue에서 적 카드 필터', () => {
      const queue = [
        { actor: 'player', card: { id: 1 }, sp: 2 },
        { actor: 'enemy', card: { id: 2 }, sp: 4 }
      ];
      const props = {
        ...defaultProps,
        battlePhase: 'resolve',
        battleQueue: queue
      };
      const { result } = renderHook(() => useBattleTimelines(props as TestBattleTimelinesProps as Parameters<typeof useBattleTimelines>[0]));

      expect(result.current.enemyTimeline).toHaveLength(1);
    });
  });

  describe('민첩 적용', () => {
    it('effectiveAgility 적용 시 타임라인 생성', () => {
      const cards = [{ id: 1, speedCost: 5, actionCost: 1 }];
      const props = {
        ...defaultProps,
        battleSelected: cards,
        selected: cards,
        effectiveAgility: 2
      };
      const { result } = renderHook(() => useBattleTimelines(props as TestBattleTimelinesProps as Parameters<typeof useBattleTimelines>[0]));

      // effectiveAgility가 있을 때 타임라인이 생성되는지 확인
      expect(result.current.playerTimeline).toBeDefined();
      expect(result.current.playerTimeline.length).toBeGreaterThanOrEqual(1);
    });
  });
});
