/**
 * @file randomUtils.test.ts
 * @description randomUtils 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateUid, generateHandUid, generateTimestampUid, shuffle } from './randomUtils';

describe('randomUtils', () => {
  describe('generateUid', () => {
    it('접두사 없이 고유 ID를 생성한다', () => {
      const uid = generateUid();
      expect(uid).toBeDefined();
      expect(typeof uid).toBe('string');
      expect(uid.length).toBeGreaterThan(0);
    });

    it('접두사와 함께 고유 ID를 생성한다', () => {
      const uid = generateUid('ghost');
      expect(uid).toMatch(/^ghost_/);
    });

    it('연속 호출 시 다른 ID를 생성한다', () => {
      const uid1 = generateUid('test');
      const uid2 = generateUid('test');
      expect(uid1).not.toBe(uid2);
    });

    it('빈 문자열 접두사는 접두사 없이 동작한다', () => {
      const uid = generateUid('');
      expect(uid).not.toContain('_');
    });
  });

  describe('generateHandUid', () => {
    it('카드 ID와 인덱스로 고유 ID를 생성한다', () => {
      const uid = generateHandUid('strike', 0);
      expect(uid).toMatch(/^strike_0_/);
    });

    it('접두사와 함께 ID를 생성한다', () => {
      const uid = generateHandUid('guard', 1, 'hand');
      expect(uid).toMatch(/^hand_guard_1_/);
    });

    it('랜덤 부분은 6자리이다', () => {
      const uid = generateHandUid('test', 0);
      const parts = uid.split('_');
      // test_0_xxxxxx 형태
      expect(parts[2].length).toBe(6);
    });

    it('연속 호출 시 다른 ID를 생성한다', () => {
      const uid1 = generateHandUid('card', 0);
      const uid2 = generateHandUid('card', 0);
      expect(uid1).not.toBe(uid2);
    });
  });

  describe('generateTimestampUid', () => {
    it('타임스탬프가 포함된 ID를 생성한다', () => {
      const before = Date.now();
      const uid = generateTimestampUid('enemy');
      const after = Date.now();

      expect(uid).toMatch(/^enemy_\d+_/);

      // 타임스탬프 추출 및 검증
      const parts = uid.split('_');
      const timestamp = parseInt(parts[1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('연속 호출 시 다른 ID를 생성한다', () => {
      const uid1 = generateTimestampUid('ai');
      const uid2 = generateTimestampUid('ai');
      expect(uid1).not.toBe(uid2);
    });
  });

  describe('shuffle', () => {
    it('배열을 섞어서 새로운 배열을 반환한다', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffle(original);

      // 원본 배열은 변경되지 않음
      expect(original).toEqual([1, 2, 3, 4, 5]);
      // 새로운 배열 반환
      expect(shuffled).not.toBe(original);
      // 같은 요소 포함
      expect(shuffled.sort()).toEqual(original.sort());
    });

    it('빈 배열을 처리한다', () => {
      const result = shuffle([]);
      expect(result).toEqual([]);
    });

    it('단일 요소 배열을 처리한다', () => {
      const result = shuffle([1]);
      expect(result).toEqual([1]);
    });

    it('객체 배열도 섞을 수 있다', () => {
      const original = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const shuffled = shuffle(original);

      expect(shuffled.length).toBe(3);
      expect(shuffled.map(o => o.id).sort()).toEqual([1, 2, 3]);
    });

    it('readonly 배열도 처리한다', () => {
      const original: readonly number[] = [1, 2, 3];
      const shuffled = shuffle(original);
      expect(shuffled.length).toBe(3);
    });

    it('여러 번 셔플하면 다른 순서가 나올 수 있다', () => {
      // 큰 배열로 테스트하여 확률적으로 다른 결과 보장
      const original = Array.from({ length: 20 }, (_, i) => i);
      const results = new Set<string>();

      for (let i = 0; i < 10; i++) {
        results.add(shuffle(original).join(','));
      }

      // 10번 셔플 중 최소 2개는 다른 결과여야 함
      expect(results.size).toBeGreaterThanOrEqual(2);
    });
  });
});
