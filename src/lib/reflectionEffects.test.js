/**
 * reflectionEffects.test.js
 *
 * 성찰 시스템 테스트
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  processReflections,
  initReflectionState,
  resetTurnReflectionEffects,
  decreaseEnemyFreeze
} from './reflectionEffects.js';
import {
  getActiveReflections,
  getReflectionsByEgos,
  getTraitCountBonus,
  REFLECTIONS
} from '../data/reflections.js';
import { createEmptyTokens } from './tokenUtils.js';

// Math.random mock 헬퍼
let originalRandom;
function mockRandom(value) {
  Math.random = () => value;
}
function restoreRandom() {
  Math.random = originalRandom;
}

beforeEach(() => {
  originalRandom = Math.random;
});

afterEach(() => {
  restoreRandom();
});

// 테스트용 플레이어 생성 (자아 기반)
function createPlayer(overrides = {}) {
  return {
    hp: 100,
    maxHp: 100,
    egos: [],      // 한국어 자아 이름 배열
    traits: [],    // 영어 개성 ID 배열 (확률 보너스용)
    tokens: createEmptyTokens(),
    ...overrides
  };
}

describe('getReflectionsByEgos', () => {
  it('자아로 성찰 활성화', () => {
    const reflections = getReflectionsByEgos(['헌신']);

    expect(reflections.length).toBe(1);
    expect(reflections[0].id).toBe('devotion');
  });

  it('여러 자아로 여러 성찰 활성화', () => {
    const reflections = getReflectionsByEgos(['헌신', '지략', '분석']);

    expect(reflections.length).toBe(3);
    const ids = reflections.map(r => r.id);
    expect(ids).toContain('devotion');
    expect(ids).toContain('strategy');
    expect(ids).toContain('analysis');
  });

  it('자아 없으면 성찰 없음', () => {
    const reflections = getReflectionsByEgos([]);
    expect(reflections.length).toBe(0);
  });

  it('잘못된 자아 이름은 무시', () => {
    const reflections = getReflectionsByEgos(['없는자아', '헌신']);
    expect(reflections.length).toBe(1);
    expect(reflections[0].id).toBe('devotion');
  });
});

describe('getActiveReflections (deprecated)', () => {
  it('개성 2개 조합으로 성찰 활성화', () => {
    const traits = ['passionate', 'valiant'];
    const reflections = getActiveReflections(traits);

    expect(reflections.length).toBe(1);
    expect(reflections[0].id).toBe('devotion');
  });
});

describe('getTraitCountBonus', () => {
  it('5개 이하면 보너스 0', () => {
    expect(getTraitCountBonus(3)).toBe(0);
    expect(getTraitCountBonus(5)).toBe(0);
  });

  it('6개면 5% 보너스', () => {
    expect(getTraitCountBonus(6)).toBe(0.05);
  });

  it('8개면 15% 보너스', () => {
    expect(getTraitCountBonus(8)).toBeCloseTo(0.15);
  });
});

describe('processReflections', () => {
  describe('기본 동작', () => {
    it('자아 없으면 성찰 불가', () => {
      const player = createPlayer({ egos: [], traits: ['passionate', 'valiant'] });
      const result = processReflections(player, {});

      expect(result.effects.length).toBe(0);
      expect(result.logs.length).toBe(0);
    });

    it('잘못된 자아면 성찰 불가', () => {
      const player = createPlayer({ egos: ['없는자아'] });
      const result = processReflections(player, {});

      expect(result.effects.length).toBe(0);
    });
  });

  describe('헌신 (공세 토큰)', () => {
    it('50% 확률 성공 시 공세 획득', () => {
      mockRandom(0.3); // 50% 확률 → 성공

      const player = createPlayer({ egos: ['헌신'] });
      const result = processReflections(player, {});

      expect(result.effects.length).toBe(1);
      expect(result.effects[0].reflectionId).toBe('devotion');

      const hasOffense = result.updatedPlayer.tokens.usage.some(t => t.id === 'offense');
      expect(hasOffense).toBe(true);
    });

    it('50% 확률 실패', () => {
      mockRandom(0.7); // 50% 확률 → 실패

      const player = createPlayer({ egos: ['헌신'] });
      const result = processReflections(player, {});

      expect(result.effects.length).toBe(0);
    });
  });

  describe('역동 (행동력 +1)', () => {
    it('행동력 보너스 적용', () => {
      mockRandom(0.3);

      const player = createPlayer({ egos: ['역동'] });
      const result = processReflections(player, {});

      expect(result.updatedBattleState.bonusEnergy).toBe(1);
    });
  });

  describe('결의 (체력 회복, 최대 4회)', () => {
    it('체력 2% 회복', () => {
      mockRandom(0.2);

      const player = createPlayer({
        hp: 50,
        maxHp: 100,
        egos: ['결의']
      });
      const result = processReflections(player, {});

      expect(result.updatedPlayer.hp).toBe(52); // 50 + 2
    });

    it('최대 4회 제한', () => {
      mockRandom(0.1);

      const player = createPlayer({ egos: ['결의'] });
      const battleState = { reflectionTriggerCounts: { resolve: 4 } };

      const result = processReflections(player, battleState);

      // 결의는 이미 4회 발동했으므로 추가 발동 없음
      const resolveEffect = result.effects.find(e => e.reflectionId === 'resolve');
      expect(resolveEffect).toBeUndefined();
    });
  });

  describe('완성 (에테르 1.5배)', () => {
    it('에테르 배율 적용', () => {
      mockRandom(0.2);

      const player = createPlayer({ egos: ['완성'] });
      const result = processReflections(player, {});

      expect(result.updatedBattleState.etherMultiplier).toBe(1.5);
    });
  });

  describe('실행 (타임라인 +5)', () => {
    it('타임라인 보너스 적용', () => {
      mockRandom(0.2);

      const player = createPlayer({ egos: ['실행'] });
      const result = processReflections(player, {});

      expect(result.updatedBattleState.timelineBonus).toBe(5);
    });
  });

  describe('지배 (적 동결)', () => {
    it('적 동결 턴 적용', () => {
      mockRandom(0.2);

      const player = createPlayer({ egos: ['지배'] });
      const result = processReflections(player, {});

      expect(result.updatedBattleState.enemyFreezeTurns).toBe(1);
    });
  });

  describe('확률 보너스', () => {
    it('개성 7개면 10% 추가 확률', () => {
      // 기본 30% + 10% = 40% 확률
      mockRandom(0.35); // 30%면 실패, 40%면 성공

      const player = createPlayer({
        egos: ['결의'],
        traits: ['steadfast', 'calm', 'valiant', 'passionate', 'thorough', 'energetic', 'extra']
      });
      const result = processReflections(player, {});

      // 결의가 발동해야 함 (30% + 10% = 40%)
      const resolveEffect = result.effects.find(e => e.reflectionId === 'resolve');
      expect(resolveEffect).toBeDefined();
    });
  });
});

describe('initReflectionState', () => {
  it('초기 상태 생성', () => {
    const state = initReflectionState();

    expect(state.reflectionTriggerCounts).toEqual({});
    expect(state.bonusEnergy).toBe(0);
    expect(state.etherMultiplier).toBe(1);
    expect(state.timelineBonus).toBe(0);
    expect(state.enemyFreezeTurns).toBe(0);
  });
});

describe('resetTurnReflectionEffects', () => {
  it('턴 효과 초기화', () => {
    const state = {
      bonusEnergy: 2,
      etherMultiplier: 1.5,
      timelineBonus: 5,
      enemyFreezeTurns: 2,
      reflectionTriggerCounts: { resolve: 1 }
    };

    const reset = resetTurnReflectionEffects(state);

    expect(reset.bonusEnergy).toBe(0);
    expect(reset.etherMultiplier).toBe(1);
    expect(reset.timelineBonus).toBe(0);
    expect(reset.enemyFreezeTurns).toBe(2); // 유지
    expect(reset.reflectionTriggerCounts).toEqual({ resolve: 1 }); // 유지
  });
});

describe('decreaseEnemyFreeze', () => {
  it('동결 턴 감소', () => {
    const state = { enemyFreezeTurns: 2 };
    const result = decreaseEnemyFreeze(state);

    expect(result.enemyFreezeTurns).toBe(1);
  });

  it('0이면 그대로', () => {
    const state = { enemyFreezeTurns: 0 };
    const result = decreaseEnemyFreeze(state);

    expect(result.enemyFreezeTurns).toBe(0);
  });

  it('없으면 그대로', () => {
    const state = {};
    const result = decreaseEnemyFreeze(state);

    expect(result.enemyFreezeTurns).toBeUndefined();
  });
});
