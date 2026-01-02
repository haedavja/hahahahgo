/**
 * @file useEnemyPlanGeneration.test.ts
 * @description 적 행동 계획 자동 생성 훅 테스트
 *
 * ## 테스트 대상
 * - useEnemyPlanGeneration: 선택 단계에서 적 행동 자동 생성
 *
 * ## 주요 테스트 케이스
 * - select 페이즈에서만 동작
 * - manuallyModified 시 재생성 방지
 * - 다중 유닛 지원
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEnemyPlanGeneration } from './useEnemyPlanGeneration';

// 유틸리티 모킹
vi.mock('../utils/enemyAI', () => ({
  generateEnemyActions: vi.fn(() => [
    { id: 'slash', speedCost: 3, damage: 10 },
    { id: 'guard', speedCost: 5, block: 5 }
  ]),
  assignSourceUnitToActions: vi.fn((actions) => actions)
}));

describe('useEnemyPlanGeneration', () => {
  const mockSetEnemyPlan = vi.fn();

  const defaultProps = {
    phase: 'select',
    enemy: {
      etherPts: 50,
      cardsPerTurn: 2,
      units: [{ unitId: 1, name: '적1' }]
    },
    enemyPlan: {
      actions: [],
      mode: 'aggressive',
      manuallyModified: false
    },
    enemyCount: 1,
    battleRef: {
      current: {
        enemyPlan: {
          actions: [],
          mode: 'aggressive',
          manuallyModified: false
        }
      }
    },
    etherSlots: vi.fn(() => 1),
    actions: {
      setEnemyPlan: mockSetEnemyPlan
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('페이즈 체크', () => {
    it('select 페이즈에서 적 행동 생성', () => {
      renderHook(() => useEnemyPlanGeneration(defaultProps as any));

      expect(mockSetEnemyPlan).toHaveBeenCalled();
    });

    it('respond 페이즈에서는 생성하지 않음', () => {
      const props = { ...defaultProps, phase: 'respond' };
      renderHook(() => useEnemyPlanGeneration(props as any));

      expect(mockSetEnemyPlan).not.toHaveBeenCalled();
    });

    it('resolve 페이즈에서는 생성하지 않음', () => {
      const props = { ...defaultProps, phase: 'resolve' };
      renderHook(() => useEnemyPlanGeneration(props as any));

      expect(mockSetEnemyPlan).not.toHaveBeenCalled();
    });
  });

  describe('mode 체크', () => {
    it('mode가 없으면 생성하지 않음', () => {
      const props = {
        ...defaultProps,
        enemyPlan: { ...defaultProps.enemyPlan, mode: null },
        battleRef: {
          current: {
            enemyPlan: { ...defaultProps.enemyPlan, mode: null }
          }
        }
      };
      renderHook(() => useEnemyPlanGeneration(props as any));

      expect(mockSetEnemyPlan).not.toHaveBeenCalled();
    });
  });

  describe('manuallyModified 체크', () => {
    it('manuallyModified가 true면 재생성하지 않음', () => {
      const props = {
        ...defaultProps,
        enemyPlan: { ...defaultProps.enemyPlan, manuallyModified: true },
        battleRef: {
          current: {
            enemyPlan: { ...defaultProps.enemyPlan, manuallyModified: true }
          }
        }
      };
      renderHook(() => useEnemyPlanGeneration(props as any));

      expect(mockSetEnemyPlan).not.toHaveBeenCalled();
    });

    it('battleRef에서 manuallyModified 확인', () => {
      const props = {
        ...defaultProps,
        enemyPlan: { ...defaultProps.enemyPlan, manuallyModified: false },
        battleRef: {
          current: {
            enemyPlan: { ...defaultProps.enemyPlan, manuallyModified: true }
          }
        }
      };
      renderHook(() => useEnemyPlanGeneration(props as any));

      expect(mockSetEnemyPlan).not.toHaveBeenCalled();
    });
  });

  describe('이미 행동이 있는 경우', () => {
    it('actions가 이미 있으면 재생성하지 않음', () => {
      const props = {
        ...defaultProps,
        enemyPlan: {
          ...defaultProps.enemyPlan,
          actions: [{ id: 'existing' }]
        },
        battleRef: {
          current: {
            enemyPlan: {
              ...defaultProps.enemyPlan,
              actions: [{ id: 'existing' }]
            }
          }
        }
      };
      renderHook(() => useEnemyPlanGeneration(props as any));

      expect(mockSetEnemyPlan).not.toHaveBeenCalled();
    });
  });

  describe('정상 생성', () => {
    it('적 행동 2개 생성', () => {
      renderHook(() => useEnemyPlanGeneration(defaultProps as any));

      expect(mockSetEnemyPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'aggressive',
          actions: expect.arrayContaining([
            expect.objectContaining({ id: 'slash' }),
            expect.objectContaining({ id: 'guard' })
          ])
        })
      );
    });

    it('에테르 슬롯 계산 함수 호출', () => {
      renderHook(() => useEnemyPlanGeneration(defaultProps as any));

      expect(defaultProps.etherSlots).toHaveBeenCalledWith(50);
    });
  });
});
