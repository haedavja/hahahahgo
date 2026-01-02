/**
 * @file seeded-random.ts
 * @description 시드 기반 난수 생성기 (재현성 보장)
 *
 * Mulberry32 알고리즘 사용 - 빠르고 충분한 무작위성 제공
 */

export class SeededRandom {
  private state: number;
  private initialSeed: number;

  constructor(seed?: number) {
    this.initialSeed = seed ?? Date.now();
    this.state = this.initialSeed;
  }

  /**
   * 현재 시드 반환
   */
  getSeed(): number {
    return this.initialSeed;
  }

  /**
   * 시드 리셋
   */
  reset(seed?: number): void {
    if (seed !== undefined) {
      this.initialSeed = seed;
    }
    this.state = this.initialSeed;
  }

  /**
   * 0-1 사이 랜덤 숫자 (Math.random() 대체)
   */
  next(): number {
    // Mulberry32 알고리즘
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * min-max 사이 정수 반환 (inclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * 배열에서 랜덤 요소 선택
   */
  pick<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    return array[Math.floor(this.next() * array.length)];
  }

  /**
   * 배열에서 n개 랜덤 선택 (중복 없음)
   */
  pickN<T>(array: T[], n: number): T[] {
    if (n > array.length) {
      return this.shuffle([...array]);
    }
    const result: T[] = [];
    const copy = [...array];
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(this.next() * copy.length);
      result.push(copy[idx]);
      copy.splice(idx, 1);
    }
    return result;
  }

  /**
   * 배열 셔플 (Fisher-Yates)
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * 배열 인플레이스 셔플
   */
  shuffleInPlace<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * 확률 기반 true/false
   */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /**
   * 가중치 기반 선택
   */
  weightedPick<T>(items: T[], weights: number[]): T {
    if (items.length !== weights.length) {
      throw new Error('Items and weights must have same length');
    }
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = this.next() * totalWeight;

    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }
    return items[items.length - 1];
  }
}

// 전역 시드 랜덤 인스턴스 (시뮬레이션용)
let globalSeededRandom: SeededRandom | null = null;

/**
 * 전역 시드 랜덤 초기화
 */
export function initGlobalRandom(seed?: number): SeededRandom {
  globalSeededRandom = new SeededRandom(seed);
  return globalSeededRandom;
}

/**
 * 전역 시드 랜덤 가져오기 (없으면 생성)
 */
export function getGlobalRandom(): SeededRandom {
  if (!globalSeededRandom) {
    globalSeededRandom = new SeededRandom();
  }
  return globalSeededRandom;
}

/**
 * 전역 시드 랜덤 리셋
 */
export function resetGlobalRandom(seed?: number): void {
  if (globalSeededRandom) {
    globalSeededRandom.reset(seed);
  } else {
    globalSeededRandom = new SeededRandom(seed);
  }
}

/**
 * 현재 전역 시드 반환
 */
export function getCurrentSeed(): number | null {
  return globalSeededRandom?.getSeed() ?? null;
}
