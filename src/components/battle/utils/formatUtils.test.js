/**
 * @file formatUtils.test.js
 * @description formatUtils 함수 테스트
 */

import { describe, it, expect } from 'vitest';
import { formatCompactValue } from './formatUtils';

describe('formatUtils', () => {
  describe('formatCompactValue', () => {
    it('작은 숫자는 그대로 반환해야 함', () => {
      expect(formatCompactValue(0)).toBe('0');
      expect(formatCompactValue(1)).toBe('1');
      expect(formatCompactValue(999)).toBe('999');
    });

    it('1000 이상은 K로 표시해야 함', () => {
      expect(formatCompactValue(1000)).toBe('1.00K');
      expect(formatCompactValue(1234)).toBe('1.23K');
      expect(formatCompactValue(999999)).toBe('1000.00K');
    });

    it('백만 이상은 M으로 표시해야 함', () => {
      expect(formatCompactValue(1000000)).toBe('1.00M');
      expect(formatCompactValue(1234567)).toBe('1.23M');
      expect(formatCompactValue(999999999)).toBe('1000.00M');
    });

    it('십억 이상은 B로 표시해야 함', () => {
      expect(formatCompactValue(1000000000)).toBe('1.00B');
      expect(formatCompactValue(1234567890)).toBe('1.23B');
      expect(formatCompactValue(9999999999)).toBe('10.00B');
    });

    it('음수도 올바르게 포맷해야 함', () => {
      expect(formatCompactValue(-1234)).toBe('-1.23K');
      expect(formatCompactValue(-1234567)).toBe('-1.23M');
      expect(formatCompactValue(-1234567890)).toBe('-1.23B');
    });

    it('Infinity는 0을 반환해야 함', () => {
      expect(formatCompactValue(Infinity)).toBe('0');
      expect(formatCompactValue(-Infinity)).toBe('0');
    });

    it('NaN은 0을 반환해야 함', () => {
      expect(formatCompactValue(NaN)).toBe('0');
    });

    it('소수점은 포맷에 포함되어야 함', () => {
      expect(formatCompactValue(1500)).toBe('1.50K');
      expect(formatCompactValue(2750000)).toBe('2.75M');
    });
  });
});
