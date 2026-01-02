/**
 * @file useDamagePreview.test.js
 * @description 피해 미리보기 훅 테스트
 *
 * ## 테스트 대상
 * - useDamagePreview: 예상 피해량 및 치명/과잉 판정
 *
 * ## 주요 테스트 케이스
 * - select/respond 외 페이즈에서 0 반환
 * - 기본 피해량 계산
 * - lethal 판정 (적 HP 초과)
 * - overkill 판정 (적 maxHP 초과)
 * - 다중 유닛 피해 계산
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDamagePreview } from './useDamagePreview';

// battleSimulation 모킹
vi.mock('../utils/battleSimulation', () => ({
  simulatePreview: vi.fn(({ fixedOrder }) => {
    // 간단한 시뮬레이션: attack 카드의 damage 합산
    let totalDamage = 0;
    for (const step of fixedOrder || []) {
      if (step.actor === 'player' && step.card?.type === 'attack') {
        totalDamage += step.card.damage || 0;
      }
    }
    return { pDealt: totalDamage };
  })
}));

describe('useDamagePreview', () => {
  const mockActions = {
    setPreviewDamage: vi.fn(),
    setPerUnitPreviewDamage: vi.fn()
  };

  const mockPlaySound = vi.fn();

  const defaultProps = {
    battlePhase: 'select',
    player: { hp: 50, block: 0, strength: 0, tokens: {} },
    enemy: { hp: 30, maxHp: 30, block: 0 },
    fixedOrder: [],
    playerTimeline: [],
    willOverdrive: false,
    enemyPlan: { mode: 'normal', actions: [] },
    targetUnit: null,
    hasMultipleUnits: false,
    enemyUnits: [],
    selectedTargetUnit: 0,
    actions: mockActions,
    playSound: mockPlaySound
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('페이즈별 동작', () => {
    it('select 페이즈에서 피해량 계산', () => {
      const order = [{ actor: 'player', card: { type: 'attack', damage: 10 } }];
      const { result } = renderHook(() => useDamagePreview({
        ...defaultProps,
        fixedOrder: order
      }));

      expect(result.current.value).toBe(10);
    });

    it('respond 페이즈에서 피해량 계산', () => {
      const order = [{ actor: 'player', card: { type: 'attack', damage: 15 } }];
      const { result } = renderHook(() => useDamagePreview({
        ...defaultProps,
        battlePhase: 'respond',
        fixedOrder: order
      }));

      expect(result.current.value).toBe(15);
    });

    it('resolve 페이즈에서 0 반환', () => {
      const order = [{ actor: 'player', card: { type: 'attack', damage: 10 } }];
      const { result } = renderHook(() => useDamagePreview({
        ...defaultProps,
        battlePhase: 'resolve',
        fixedOrder: order
      }));

      expect(result.current.value).toBe(0);
    });
  });

  describe('치명/과잉 판정', () => {
    it('피해량 < HP면 lethal false', () => {
      const order = [{ actor: 'player', card: { type: 'attack', damage: 20 } }];
      const { result } = renderHook(() => useDamagePreview({
        ...defaultProps,
        enemy: { hp: 30, maxHp: 30 },
        fixedOrder: order
      }));

      expect(result.current.lethal).toBe(false);
      expect(result.current.overkill).toBe(false);
    });

    it('피해량 > HP면 lethal true', () => {
      const order = [{ actor: 'player', card: { type: 'attack', damage: 35 } }];
      const { result } = renderHook(() => useDamagePreview({
        ...defaultProps,
        enemy: { hp: 30, maxHp: 50 },
        fixedOrder: order
      }));

      expect(result.current.lethal).toBe(true);
      expect(result.current.overkill).toBe(false);
    });

    it('피해량 > maxHP면 overkill true', () => {
      const order = [{ actor: 'player', card: { type: 'attack', damage: 60 } }];
      const { result } = renderHook(() => useDamagePreview({
        ...defaultProps,
        enemy: { hp: 30, maxHp: 50 },
        fixedOrder: order
      }));

      expect(result.current.lethal).toBe(true);
      expect(result.current.overkill).toBe(true);
    });
  });

  describe('상태 업데이트', () => {
    it('피해 미리보기 상태 설정', () => {
      const order = [{ actor: 'player', card: { type: 'attack', damage: 25 } }];
      renderHook(() => useDamagePreview({
        ...defaultProps,
        fixedOrder: order
      }));

      expect(mockActions.setPreviewDamage).toHaveBeenCalledWith({
        value: 25,
        lethal: false,
        overkill: false
      });
    });
  });

  describe('빈 순서', () => {
    it('fixedOrder 비어있으면 0 반환', () => {
      const { result } = renderHook(() => useDamagePreview({
        ...defaultProps,
        fixedOrder: [],
        playerTimeline: []
      }));

      expect(result.current.value).toBe(0);
    });

    it('fixedOrder 없으면 playerTimeline 사용', () => {
      const timeline = [{ actor: 'player', card: { type: 'attack', damage: 12 } }];
      const { result } = renderHook(() => useDamagePreview({
        ...defaultProps,
        fixedOrder: [],
        playerTimeline: timeline
      }));

      expect(result.current.value).toBe(12);
    });
  });
});
