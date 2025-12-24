/**
 * @file comboMultiplier.test.js
 * @description comboMultiplier 함수 테스트
 */

import { describe, it, expect } from 'vitest';
import { computeComboMultiplier, explainComboMultiplier } from './comboMultiplier';

describe('comboMultiplier', () => {
  describe('computeComboMultiplier', () => {
    it('상징이 없으면 기본 배율을 반환해야 함', () => {
      const result = computeComboMultiplier(2.0, 3, true, true, null, []);

      expect(result).toBe(2.0);
    });

    it('카드가 0장이면 기본 배율을 반환해야 함', () => {
      const result = computeComboMultiplier(1.5, 0, true, true, null, []);

      expect(result).toBe(1.5);
    });

    it('etherGem은 카드당 2배수를 추가해야 함', () => {
      const result = computeComboMultiplier(1.0, 3, false, false, null, ['etherGem']);

      // 1.0 + (2.0 * 3) = 7.0
      expect(result).toBe(7.0);
    });

    it('etherMultiplier 상징은 comboMultiplierPerCard가 아니면 적용되지 않아야 함', () => {
      // rareStone has etherMultiplier: 2, but not comboMultiplierPerCard
      // so it doesn't affect the combo multiplier calculation
      const result = computeComboMultiplier(1.0, 2, false, false, null, ['rareStone']);

      expect(result).toBe(1.0);
    });

    it('referenceBook은 카드 수에 따라 배율을 곱해야 함', () => {
      const result = computeComboMultiplier(2.0, 3, false, true, null, ['referenceBook']);

      // 2.0 * (1 + 3 * 0.1) = 2.0 * 1.3 = 2.6
      expect(result).toBeCloseTo(2.6, 5);
    });

    it('devilDice는 5장 이상일 때 5배를 곱해야 함', () => {
      const result = computeComboMultiplier(2.0, 5, true, false, null, ['devilDice']);

      // 2.0 * 5 = 10.0
      expect(result).toBe(10.0);
    });

    it('devilDice는 5장 미만이면 적용되지 않아야 함', () => {
      const result = computeComboMultiplier(2.0, 4, true, false, null, ['devilDice']);

      expect(result).toBe(2.0);
    });

    it('includeFiveCard=false이면 devilDice가 적용되지 않아야 함', () => {
      const result = computeComboMultiplier(2.0, 5, false, false, null, ['devilDice']);

      expect(result).toBe(2.0);
    });

    it('includeRefBook=false이면 referenceBook이 적용되지 않아야 함', () => {
      const result = computeComboMultiplier(2.0, 3, false, false, null, ['referenceBook']);

      expect(result).toBe(2.0);
    });

    it('여러 상징이 순서대로 적용되어야 함', () => {
      // etherGem + devilDice
      const result = computeComboMultiplier(1.0, 5, true, false, null, ['etherGem', 'devilDice']);

      // 1.0 + (2.0 * 5) = 11.0
      // 11.0 * 5 = 55.0
      expect(result).toBe(55.0);
    });

    it('relicOrderOverride가 orderedRelicList보다 우선되어야 함', () => {
      const result = computeComboMultiplier(1.0, 3, false, false, ['etherGem'], ['referenceBook']);

      // etherGem 적용: 1.0 + (2.0 * 3) = 7.0
      expect(result).toBe(7.0);
    });
  });

  describe('explainComboMultiplier', () => {
    it('상징이 없으면 기본 단계만 반환해야 함', () => {
      const { multiplier, steps } = explainComboMultiplier(2.0, 3, true, true, null, []);

      expect(multiplier).toBe(2.0);
      expect(steps).toHaveLength(1);
      expect(steps[0]).toContain('기본');
    });

    it('etherGem 적용 단계를 포함해야 함', () => {
      const { multiplier, steps } = explainComboMultiplier(1.0, 3, false, false, null, ['etherGem']);

      expect(multiplier).toBe(7.0);
      expect(steps.length).toBeGreaterThan(1);
      expect(steps.some(s => s.includes('에테르 결정'))).toBe(true);
    });

    it('referenceBook 적용 단계를 포함해야 함', () => {
      const { multiplier, steps } = explainComboMultiplier(2.0, 3, false, true, null, ['referenceBook']);

      expect(multiplier).toBeCloseTo(2.6, 5);
      expect(steps.some(s => s.includes('참고서'))).toBe(true);
    });

    it('devilDice 적용 단계를 포함해야 함', () => {
      const { multiplier, steps } = explainComboMultiplier(2.0, 5, true, false, null, ['devilDice']);

      expect(multiplier).toBe(10.0);
      expect(steps.some(s => s.includes('악마의 주사위'))).toBe(true);
    });

    it('여러 상징 적용 시 모든 단계를 포함해야 함', () => {
      const { multiplier, steps } = explainComboMultiplier(
        1.0, 5, true, true, null, ['etherGem', 'referenceBook', 'devilDice']
      );

      // etherGem: 1.0 + (2.0 * 5) = 11.0
      // referenceBook: 11.0 * 1.5 = 16.5
      // devilDice: 16.5 * 5 = 82.5
      expect(multiplier).toBeCloseTo(82.5, 5);
      expect(steps.some(s => s.includes('에테르 결정'))).toBe(true);
      expect(steps.some(s => s.includes('참고서'))).toBe(true);
      expect(steps.some(s => s.includes('악마의 주사위'))).toBe(true);
    });

    it('적용되지 않는 상징은 단계에 포함되지 않아야 함', () => {
      const { steps } = explainComboMultiplier(2.0, 3, true, true, null, ['devilDice']);

      // 5장 미만이므로 devilDice 미적용
      expect(steps.length).toBe(1);
      expect(steps.every(s => !s.includes('악마의 주사위'))).toBe(true);
    });

    it('단계 문자열에 이전/이후 배율이 표시되어야 함', () => {
      const { steps } = explainComboMultiplier(1.0, 3, false, false, null, ['etherGem']);

      const etherGemStep = steps.find(s => s.includes('에테르 결정'));
      expect(etherGemStep).toMatch(/\d+\.\d+.*→.*\d+\.\d+/);
    });
  });
});
