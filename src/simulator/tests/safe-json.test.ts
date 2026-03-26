/**
 * @file safe-json.test.ts
 * @description safe-json 유틸리티 테스트
 */

import { describe, it, expect } from 'vitest';
import { safeParse, safeStringify, safeDeepClone, safeDeepCloneWithDefault } from '../core/safe-json';

describe('safe-json', () => {
  describe('safeParse', () => {
    it('유효한 JSON을 파싱함', () => {
      const result = safeParse('{"name": "test", "value": 42}', {});
      expect(result).toEqual({ name: 'test', value: 42 });
    });

    it('잘못된 JSON에서 기본값 반환', () => {
      const defaultValue = { fallback: true };
      const result = safeParse('invalid json', defaultValue);
      expect(result).toBe(defaultValue);
    });

    it('빈 문자열에서 기본값 반환', () => {
      const result = safeParse('', []);
      expect(result).toEqual([]);
    });

    it('배열 파싱 지원', () => {
      const result = safeParse<number[]>('[1, 2, 3]', []);
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('safeStringify', () => {
    it('객체를 JSON 문자열로 변환', () => {
      const result = safeStringify({ a: 1, b: 'test' });
      expect(result).toBe('{"a":1,"b":"test"}');
    });

    it('배열을 JSON 문자열로 변환', () => {
      const result = safeStringify([1, 2, 3]);
      expect(result).toBe('[1,2,3]');
    });

    it('순환 참조 시 기본값 반환', () => {
      const obj: Record<string, unknown> = { a: 1 };
      obj.self = obj; // 순환 참조
      const result = safeStringify(obj, '{"error": true}');
      expect(result).toBe('{"error": true}');
    });
  });

  describe('safeDeepClone', () => {
    it('객체를 깊은 복사함', () => {
      const original = { a: 1, b: { c: 2 } };
      const cloned = safeDeepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned?.b).not.toBe(original.b);
    });

    it('배열을 깊은 복사함', () => {
      const original = [1, { a: 2 }, [3, 4]];
      const cloned = safeDeepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });

    it('순환 참조 시 null 반환', () => {
      const obj: Record<string, unknown> = { a: 1 };
      obj.self = obj;
      const result = safeDeepClone(obj);
      expect(result).toBeNull();
    });

    it('원본 수정이 복사본에 영향 없음', () => {
      const original = { count: 1 };
      const cloned = safeDeepClone(original);

      original.count = 999;
      expect(cloned?.count).toBe(1);
    });
  });

  describe('safeDeepCloneWithDefault', () => {
    it('성공 시 복사본 반환', () => {
      const original = { x: 10 };
      const defaultValue = { x: 0 };
      const result = safeDeepCloneWithDefault(original, defaultValue);

      expect(result).toEqual(original);
      expect(result).not.toBe(original);
    });

    it('실패 시 기본값 반환', () => {
      const obj: Record<string, unknown> = { x: 1 };
      obj.self = obj;
      const defaultValue = { x: -1 };

      const result = safeDeepCloneWithDefault(obj, defaultValue);
      expect(result).toBe(defaultValue);
    });
  });
});
