// @vitest-environment happy-dom
/**
 * @file storageUtils.test.ts
 * @description localStorage 래퍼 유틸리티 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStorageItem,
  setStorageItem,
  getStorageString,
  setStorageString,
  removeStorageItem,
} from './storageUtils';

describe('storageUtils', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getStorageItem', () => {
    it('저장된 객체를 가져온다', () => {
      const data = { name: 'test', value: 42 };
      localStorage.setItem('testKey', JSON.stringify(data));

      const result = getStorageItem('testKey', { name: '', value: 0 });
      expect(result).toEqual(data);
    });

    it('저장된 배열을 가져온다', () => {
      const data = [1, 2, 3];
      localStorage.setItem('arrayKey', JSON.stringify(data));

      const result = getStorageItem('arrayKey', []);
      expect(result).toEqual(data);
    });

    it('존재하지 않는 키는 fallback을 반환한다', () => {
      const fallback = { default: true };
      const result = getStorageItem('nonexistent', fallback);
      expect(result).toEqual(fallback);
    });

    it('잘못된 JSON은 fallback을 반환한다', () => {
      localStorage.setItem('badJson', 'not valid json{');

      const fallback = { error: true };
      const result = getStorageItem('badJson', fallback);
      expect(result).toEqual(fallback);
    });

    it('null 값은 fallback을 반환한다', () => {
      localStorage.setItem('nullKey', 'null');

      const fallback = 'default';
      const result = getStorageItem('nullKey', fallback);
      expect(result).toBeNull();
    });
  });

  describe('setStorageItem', () => {
    it('객체를 저장한다', () => {
      const data = { id: 1, name: 'test' };
      const success = setStorageItem('objKey', data);

      expect(success).toBe(true);
      expect(JSON.parse(localStorage.getItem('objKey')!)).toEqual(data);
    });

    it('배열을 저장한다', () => {
      const data = ['a', 'b', 'c'];
      const success = setStorageItem('arrKey', data);

      expect(success).toBe(true);
      expect(JSON.parse(localStorage.getItem('arrKey')!)).toEqual(data);
    });

    it('숫자를 저장한다', () => {
      const success = setStorageItem('numKey', 42);

      expect(success).toBe(true);
      expect(JSON.parse(localStorage.getItem('numKey')!)).toBe(42);
    });

    it('boolean을 저장한다', () => {
      const success = setStorageItem('boolKey', true);

      expect(success).toBe(true);
      expect(JSON.parse(localStorage.getItem('boolKey')!)).toBe(true);
    });

    it('저장 실패 시 false를 반환한다', () => {
      // localStorage.setItem을 실패하게 모킹 (happy-dom/jsdom 호환)
      const originalSetItem = localStorage.setItem;
      Object.defineProperty(localStorage, 'setItem', {
        value: vi.fn().mockImplementation(() => {
          throw new Error('Storage full');
        }),
        writable: true,
        configurable: true,
      });

      const success = setStorageItem('failKey', { data: 'test' });
      expect(success).toBe(false);

      Object.defineProperty(localStorage, 'setItem', {
        value: originalSetItem,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('getStorageString', () => {
    it('저장된 문자열을 그대로 가져온다', () => {
      localStorage.setItem('strKey', 'hello world');

      const result = getStorageString('strKey', '');
      expect(result).toBe('hello world');
    });

    it('JSON 형태의 문자열도 파싱 없이 그대로 가져온다', () => {
      localStorage.setItem('jsonStrKey', '{"key": "value"}');

      const result = getStorageString('jsonStrKey', '');
      expect(result).toBe('{"key": "value"}');
    });

    it('존재하지 않는 키는 fallback을 반환한다', () => {
      const result = getStorageString('nonexistent', 'default');
      expect(result).toBe('default');
    });

    it('빈 문자열도 정상적으로 가져온다', () => {
      localStorage.setItem('emptyKey', '');

      const result = getStorageString('emptyKey', 'fallback');
      expect(result).toBe('');
    });
  });

  describe('setStorageString', () => {
    it('문자열을 그대로 저장한다', () => {
      const success = setStorageString('strKey', 'test value');

      expect(success).toBe(true);
      expect(localStorage.getItem('strKey')).toBe('test value');
    });

    it('빈 문자열도 저장할 수 있다', () => {
      const success = setStorageString('emptyKey', '');

      expect(success).toBe(true);
      expect(localStorage.getItem('emptyKey')).toBe('');
    });

    it('저장 실패 시 false를 반환한다', () => {
      // localStorage.setItem을 실패하게 모킹 (happy-dom/jsdom 호환)
      const originalSetItem = localStorage.setItem;
      Object.defineProperty(localStorage, 'setItem', {
        value: vi.fn().mockImplementation(() => {
          throw new Error('Storage full');
        }),
        writable: true,
        configurable: true,
      });

      const success = setStorageString('failKey', 'data');
      expect(success).toBe(false);

      Object.defineProperty(localStorage, 'setItem', {
        value: originalSetItem,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('removeStorageItem', () => {
    it('저장된 항목을 제거한다', () => {
      localStorage.setItem('removeKey', 'value');
      expect(localStorage.getItem('removeKey')).toBe('value');

      const success = removeStorageItem('removeKey');

      expect(success).toBe(true);
      expect(localStorage.getItem('removeKey')).toBeNull();
    });

    it('존재하지 않는 키도 성공을 반환한다', () => {
      const success = removeStorageItem('nonexistent');
      expect(success).toBe(true);
    });

    it('제거 실패 시 false를 반환한다', () => {
      // localStorage.removeItem을 실패하게 모킹 (happy-dom/jsdom 호환)
      const originalRemoveItem = localStorage.removeItem;
      Object.defineProperty(localStorage, 'removeItem', {
        value: vi.fn().mockImplementation(() => {
          throw new Error('Storage error');
        }),
        writable: true,
        configurable: true,
      });

      const success = removeStorageItem('failKey');
      expect(success).toBe(false);

      Object.defineProperty(localStorage, 'removeItem', {
        value: originalRemoveItem,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('통합 시나리오', () => {
    it('객체 저장 후 조회', () => {
      const original = { player: 'hero', level: 10 };
      setStorageItem('game', original);

      const loaded = getStorageItem('game', { player: '', level: 0 });
      expect(loaded).toEqual(original);
    });

    it('문자열 저장 후 조회', () => {
      setStorageString('version', '1.0.0');

      const version = getStorageString('version', '0.0.0');
      expect(version).toBe('1.0.0');
    });

    it('저장, 조회, 삭제 사이클', () => {
      // 저장
      setStorageItem('temp', { temporary: true });
      expect(getStorageItem('temp', null)).toEqual({ temporary: true });

      // 삭제
      removeStorageItem('temp');
      expect(getStorageItem('temp', null)).toBeNull();
    });
  });
});
