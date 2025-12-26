/**
 * @file insightSystem.test.js
 * @description 통찰/장막 시스템 테스트
 *
 * ## 테스트 대상
 * - calculateEffectiveInsight: 장막 적용 후 유효 통찰 계산
 * - getInsightRevealLevel: 통찰 단계별 정보 공개 레벨
 *
 * ## 주요 테스트 케이스
 * - 장막 0: 통찰 그대로
 * - 장막 > 통찰: 유효 통찰 0
 * - 통찰 레벨별 공개 정보 (카드명, 데미지, 특성 등)
 * - 음수 통찰 방지
 */

import { describe, it, expect } from 'vitest';
import { calculateEffectiveInsight, getInsightRevealLevel } from './insightSystem';

describe('insightSystem', () => {
  describe('calculateEffectiveInsight', () => {
    it('장막이 없으면 통찰 그대로 반환해야 함', () => {
      expect(calculateEffectiveInsight(3, 0)).toBe(3);
    });

    it('장막이 통찰을 감소시켜야 함', () => {
      expect(calculateEffectiveInsight(3, 1)).toBe(2);
      expect(calculateEffectiveInsight(3, 2)).toBe(1);
    });

    it('장막이 통찰보다 크면 0을 반환해야 함', () => {
      expect(calculateEffectiveInsight(2, 5)).toBe(0);
    });

    it('null/undefined 값은 0으로 처리해야 함', () => {
      expect(calculateEffectiveInsight(null, 0)).toBe(0);
      expect(calculateEffectiveInsight(3, null)).toBe(3);
      expect(calculateEffectiveInsight(null, null)).toBe(0);
      expect(calculateEffectiveInsight(undefined, undefined)).toBe(0);
    });

    it('음수 결과는 0으로 제한되어야 함', () => {
      expect(calculateEffectiveInsight(0, 5)).toBe(0);
    });
  });

  describe('getInsightRevealLevel', () => {
    it('적 행동이 없으면 level 0을 반환해야 함', () => {
      const result = getInsightRevealLevel(3, []);

      expect(result.level).toBe(0);
      expect(result.visible).toBe(false);
    });

    it('적 행동이 null이면 level 0을 반환해야 함', () => {
      const result = getInsightRevealLevel(3, null);

      expect(result.level).toBe(0);
      expect(result.visible).toBe(false);
    });

    it('통찰 0이면 hidden 상태여야 함', () => {
      const enemyActions = [{ card: { name: 'Attack' } }];
      const result = getInsightRevealLevel(0, enemyActions);

      expect(result.level).toBe(0);
      expect(result.visible).toBe(false);
    });

    it('통찰 1이면 대략적 순서만 공개해야 함', () => {
      const enemyActions = [
        { card: { name: 'Attack' } },
        { card: { name: 'Defend' } }
      ];
      const result = getInsightRevealLevel(1, enemyActions);

      expect(result.level).toBe(1);
      expect(result.visible).toBe(true);
      expect(result.showRoughOrder).toBe(true);
      expect(result.showCards).toBe(false);
    });

    it('통찰 2이면 카드 이름과 속도를 공개해야 함', () => {
      const enemyActions = [
        { card: { name: 'Attack' }, speed: 5 }
      ];
      const result = getInsightRevealLevel(2, enemyActions);

      expect(result.level).toBe(2);
      expect(result.showCards).toBe(true);
      expect(result.showSpeed).toBe(true);
      expect(result.showEffects).toBe(false);
    });

    it('통찰 3이면 모든 정보를 공개해야 함', () => {
      const enemyActions = [
        { card: { name: 'Attack', effects: ['damage'], traits: ['fast'] }, speed: 5 }
      ];
      const result = getInsightRevealLevel(3, enemyActions);

      expect(result.level).toBe(3);
      expect(result.showEffects).toBe(true);
      expect(result.fullDetails).toBe(true);
    });

    it('cardCount가 올바르게 설정되어야 함', () => {
      const enemyActions = [
        { card: { name: 'Attack' } },
        { card: { name: 'Defend' } },
        { card: { name: 'Skill' } }
      ];
      const result = getInsightRevealLevel(2, enemyActions);

      expect(result.cardCount).toBe(3);
    });

    it('actions 배열이 반환되어야 함', () => {
      const enemyActions = [
        { card: { name: 'Attack' } }
      ];
      const result = getInsightRevealLevel(2, enemyActions);

      expect(result.actions).toBeDefined();
      expect(result.actions).toHaveLength(1);
    });

    it('유닛별 veil이 적용되어야 함', () => {
      const enemyActions = [
        { card: { name: 'Attack', __sourceUnitId: 0 } },
        { card: { name: 'Defend', __sourceUnitId: 1 } }
      ];
      const units = [
        { unitId: 0, tokens: { usage: [], turn: [], permanent: [] } },
        { unitId: 1, tokens: { usage: [], turn: [{ id: 'veil', stacks: 2 }], permanent: [] } }
      ];

      const result = getInsightRevealLevel(2, enemyActions, units as any);

      // 첫 번째 유닛: veil 0, 유효 통찰 2 → 카드 공개
      // 두 번째 유닛: veil 2, 유효 통찰 0 → 숨김
      expect(result.actions[0].hidden).toBe(false);
      expect(result.actions[1].hidden).toBe(true);
    });

    it('첫 번째와 마지막 action이 표시되어야 함 (레벨 1)', () => {
      const enemyActions = [
        { card: { name: 'First' } },
        { card: { name: 'Middle' } },
        { card: { name: 'Last' } }
      ];
      const result = getInsightRevealLevel(1, enemyActions);

      expect(result.actions[0].isFirst).toBe(true);
      expect(result.actions[0].isLast).toBe(false);
      expect(result.actions[2].isFirst).toBe(false);
      expect(result.actions[2].isLast).toBe(true);
    });
  });
});
