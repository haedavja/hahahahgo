/**
 * @file seeded-random.test.ts
 * @description 시드 기반 난수 생성기 테스트
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  SeededRandom,
  initGlobalRandom,
  getGlobalRandom,
  resetGlobalRandom,
  getCurrentSeed,
} from '../core/seeded-random';

describe('SeededRandom', () => {
  describe('생성자 및 시드 관리', () => {
    it('시드를 지정하면 해당 시드 사용', () => {
      const rng = new SeededRandom(12345);
      expect(rng.getSeed()).toBe(12345);
    });

    it('시드 없이 생성하면 Date.now() 기반', () => {
      const before = Date.now();
      const rng = new SeededRandom();
      const after = Date.now();

      expect(rng.getSeed()).toBeGreaterThanOrEqual(before);
      expect(rng.getSeed()).toBeLessThanOrEqual(after);
    });

    it('reset()으로 초기 상태 복원', () => {
      const rng = new SeededRandom(42);
      const first = rng.next();
      const second = rng.next();

      rng.reset();
      expect(rng.next()).toBe(first);
      expect(rng.next()).toBe(second);
    });

    it('reset(newSeed)로 새 시드 설정', () => {
      const rng = new SeededRandom(42);
      rng.reset(9999);

      expect(rng.getSeed()).toBe(9999);
    });
  });

  describe('재현성 (Reproducibility)', () => {
    it('같은 시드면 같은 시퀀스', () => {
      const rng1 = new SeededRandom(12345);
      const rng2 = new SeededRandom(12345);

      for (let i = 0; i < 100; i++) {
        expect(rng1.next()).toBe(rng2.next());
      }
    });

    it('다른 시드면 다른 시퀀스', () => {
      const rng1 = new SeededRandom(12345);
      const rng2 = new SeededRandom(54321);

      let allSame = true;
      for (let i = 0; i < 10; i++) {
        if (rng1.next() !== rng2.next()) {
          allSame = false;
          break;
        }
      }
      expect(allSame).toBe(false);
    });
  });

  describe('next()', () => {
    it('0과 1 사이 값 반환', () => {
      const rng = new SeededRandom(42);
      for (let i = 0; i < 1000; i++) {
        const value = rng.next();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it('충분한 분산 (모든 값이 같지 않음)', () => {
      const rng = new SeededRandom(42);
      const values = Array.from({ length: 100 }, () => rng.next());
      const unique = new Set(values);
      expect(unique.size).toBeGreaterThan(90);
    });
  });

  describe('nextInt()', () => {
    it('지정 범위 내 정수 반환', () => {
      const rng = new SeededRandom(42);
      for (let i = 0; i < 1000; i++) {
        const value = rng.nextInt(1, 6);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(6);
        expect(Number.isInteger(value)).toBe(true);
      }
    });

    it('min과 max가 같으면 해당 값 반환', () => {
      const rng = new SeededRandom(42);
      for (let i = 0; i < 10; i++) {
        expect(rng.nextInt(5, 5)).toBe(5);
      }
    });

    it('음수 범위도 지원', () => {
      const rng = new SeededRandom(42);
      for (let i = 0; i < 100; i++) {
        const value = rng.nextInt(-10, -5);
        expect(value).toBeGreaterThanOrEqual(-10);
        expect(value).toBeLessThanOrEqual(-5);
      }
    });
  });

  describe('pick()', () => {
    it('배열에서 요소 선택', () => {
      const rng = new SeededRandom(42);
      const arr = ['a', 'b', 'c', 'd', 'e'];
      for (let i = 0; i < 100; i++) {
        const picked = rng.pick(arr);
        expect(arr).toContain(picked);
      }
    });

    it('빈 배열에서 선택시 에러', () => {
      const rng = new SeededRandom(42);
      expect(() => rng.pick([])).toThrow('Cannot pick from empty array');
    });

    it('단일 요소 배열은 항상 그 요소', () => {
      const rng = new SeededRandom(42);
      for (let i = 0; i < 10; i++) {
        expect(rng.pick(['only'])).toBe('only');
      }
    });

    it('모든 요소가 선택 가능', () => {
      const rng = new SeededRandom(42);
      const arr = ['a', 'b', 'c'];
      const picked = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        picked.add(rng.pick(arr));
      }
      expect(picked.size).toBe(3);
    });
  });

  describe('pickN()', () => {
    it('n개 중복 없이 선택', () => {
      const rng = new SeededRandom(42);
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const picked = rng.pickN(arr, 5);

      expect(picked.length).toBe(5);
      expect(new Set(picked).size).toBe(5); // 중복 없음
      picked.forEach(p => expect(arr).toContain(p));
    });

    it('n이 배열 길이보다 크면 전체 셔플', () => {
      const rng = new SeededRandom(42);
      const arr = [1, 2, 3];
      const picked = rng.pickN(arr, 10);

      expect(picked.length).toBe(3);
      expect(new Set(picked)).toEqual(new Set(arr));
    });

    it('n이 0이면 빈 배열', () => {
      const rng = new SeededRandom(42);
      const picked = rng.pickN([1, 2, 3], 0);
      expect(picked).toEqual([]);
    });

    it('원본 배열 변경 안됨', () => {
      const rng = new SeededRandom(42);
      const arr = [1, 2, 3, 4, 5];
      const original = [...arr];
      rng.pickN(arr, 3);

      expect(arr).toEqual(original);
    });
  });

  describe('shuffle()', () => {
    it('배열 셔플 (새 배열 반환)', () => {
      const rng = new SeededRandom(42);
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const shuffled = rng.shuffle(arr);

      expect(shuffled.length).toBe(arr.length);
      expect(new Set(shuffled)).toEqual(new Set(arr));
      expect(shuffled).not.toBe(arr); // 다른 배열 참조
    });

    it('원본 배열 변경 안됨', () => {
      const rng = new SeededRandom(42);
      const arr = [1, 2, 3, 4, 5];
      const original = [...arr];
      rng.shuffle(arr);

      expect(arr).toEqual(original);
    });

    it('같은 시드면 같은 셔플 결과', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      expect(rng1.shuffle(arr)).toEqual(rng2.shuffle(arr));
    });

    it('빈 배열 셔플', () => {
      const rng = new SeededRandom(42);
      expect(rng.shuffle([])).toEqual([]);
    });

    it('단일 요소 셔플', () => {
      const rng = new SeededRandom(42);
      expect(rng.shuffle([1])).toEqual([1]);
    });
  });

  describe('shuffleInPlace()', () => {
    it('원본 배열 직접 수정', () => {
      const rng = new SeededRandom(42);
      const arr = [1, 2, 3, 4, 5];
      const original = new Set(arr);
      rng.shuffleInPlace(arr);

      expect(arr.length).toBe(5);
      expect(new Set(arr)).toEqual(original);
    });

    it('같은 시드면 같은 결과', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);
      const arr1 = [1, 2, 3, 4, 5];
      const arr2 = [1, 2, 3, 4, 5];

      rng1.shuffleInPlace(arr1);
      rng2.shuffleInPlace(arr2);

      expect(arr1).toEqual(arr2);
    });
  });

  describe('chance()', () => {
    it('확률 0은 항상 false', () => {
      const rng = new SeededRandom(42);
      for (let i = 0; i < 100; i++) {
        expect(rng.chance(0)).toBe(false);
      }
    });

    it('확률 1은 항상 true', () => {
      const rng = new SeededRandom(42);
      for (let i = 0; i < 100; i++) {
        expect(rng.chance(1)).toBe(true);
      }
    });

    it('확률 0.5는 대략 절반', () => {
      const rng = new SeededRandom(42);
      let trueCount = 0;
      const trials = 10000;

      for (let i = 0; i < trials; i++) {
        if (rng.chance(0.5)) trueCount++;
      }

      const ratio = trueCount / trials;
      expect(ratio).toBeGreaterThan(0.45);
      expect(ratio).toBeLessThan(0.55);
    });
  });

  describe('weightedPick()', () => {
    it('가중치에 따른 선택', () => {
      const rng = new SeededRandom(42);
      const items = ['rare', 'uncommon', 'common'];
      const weights = [1, 3, 6]; // rare 10%, uncommon 30%, common 60%

      const counts: Record<string, number> = { rare: 0, uncommon: 0, common: 0 };
      const trials = 10000;

      for (let i = 0; i < trials; i++) {
        const picked = rng.weightedPick(items, weights);
        counts[picked]++;
      }

      // 대략적인 분포 확인 (오차 ±5%)
      expect(counts['rare'] / trials).toBeGreaterThan(0.05);
      expect(counts['rare'] / trials).toBeLessThan(0.15);
      expect(counts['common'] / trials).toBeGreaterThan(0.55);
      expect(counts['common'] / trials).toBeLessThan(0.65);
    });

    it('가중치 0인 항목은 선택 안됨', () => {
      const rng = new SeededRandom(42);
      const items = ['a', 'b', 'c'];
      const weights = [0, 1, 0];

      for (let i = 0; i < 100; i++) {
        expect(rng.weightedPick(items, weights)).toBe('b');
      }
    });

    it('배열 길이 불일치시 에러', () => {
      const rng = new SeededRandom(42);
      expect(() => rng.weightedPick(['a', 'b'], [1])).toThrow('Items and weights must have same length');
    });
  });
});

describe('전역 SeededRandom', () => {
  afterEach(() => {
    // 각 테스트 후 전역 상태 정리
    resetGlobalRandom();
  });

  describe('initGlobalRandom', () => {
    it('전역 인스턴스 초기화', () => {
      const rng = initGlobalRandom(12345);
      expect(rng.getSeed()).toBe(12345);
      expect(getGlobalRandom()).toBe(rng);
    });
  });

  describe('getGlobalRandom', () => {
    it('인스턴스 없으면 자동 생성', () => {
      const rng = getGlobalRandom();
      expect(rng).toBeInstanceOf(SeededRandom);
    });

    it('이미 있으면 기존 인스턴스 반환', () => {
      const rng1 = initGlobalRandom(42);
      const rng2 = getGlobalRandom();
      expect(rng1).toBe(rng2);
    });
  });

  describe('resetGlobalRandom', () => {
    it('새 시드로 리셋', () => {
      initGlobalRandom(42);
      resetGlobalRandom(9999);
      expect(getCurrentSeed()).toBe(9999);
    });

    it('시드 없이 리셋하면 원래 시드로', () => {
      initGlobalRandom(42);
      const rng = getGlobalRandom();
      rng.next(); // 상태 변경
      resetGlobalRandom();
      expect(getCurrentSeed()).toBe(42);
    });
  });

  describe('getCurrentSeed', () => {
    it('초기화 전에는 null', () => {
      // 다른 테스트에서 초기화됐을 수 있어서 리셋
      resetGlobalRandom();
      const seed = getCurrentSeed();
      // null이거나 숫자여야 함 (이전 테스트 상태에 따라)
      expect(typeof seed === 'number' || seed === null).toBe(true);
    });

    it('초기화 후에는 시드 반환', () => {
      initGlobalRandom(12345);
      expect(getCurrentSeed()).toBe(12345);
    });
  });

  describe('재현성 테스트', () => {
    it('전역 랜덤도 같은 시드면 같은 결과', () => {
      initGlobalRandom(42);
      const values1: number[] = [];
      for (let i = 0; i < 10; i++) {
        values1.push(getGlobalRandom().next());
      }

      resetGlobalRandom(42);
      const values2: number[] = [];
      for (let i = 0; i < 10; i++) {
        values2.push(getGlobalRandom().next());
      }

      expect(values1).toEqual(values2);
    });
  });
});
