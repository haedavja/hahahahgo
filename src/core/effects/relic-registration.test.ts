/**
 * @file relic-registration.test.ts
 * @description EffectRegistry 상징 등록 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EffectRegistry,
  registerAllRelicEffects,
  clearRegistry,
  executeDamageTakenEffects,
  executeRelicActivateEffects,
} from './index';

// Mock RELICS data
vi.mock('../../data/relics', () => ({
  RELICS: {
    ironHeart: {
      id: 'ironHeart',
      name: '철의 심장',
      effects: {
        type: 'ON_DAMAGE_TAKEN',
        blockNextTurn: 3,
        healNextTurn: 2,
      },
    },
    bloodPactSeal: {
      id: 'bloodPactSeal',
      name: '피의 계약인',
      effects: {
        type: 'ON_DAMAGE_TAKEN',
        strengthPerDamage: 1,
      },
    },
    rosary: {
      id: 'rosary',
      name: '묵주',
      effects: {
        type: 'ON_RELIC_ACTIVATE',
        etherGain: 3,
      },
    },
    etherCrystal: {
      id: 'etherCrystal',
      name: '에테르 수정',
      effects: {
        type: 'PASSIVE',
        maxEnergy: 1,
      },
    },
  },
}));

describe('EffectRegistry 상징 등록', () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe('registerAllRelicEffects', () => {
    it('모든 상징을 레지스트리에 등록', () => {
      registerAllRelicEffects();

      // ON_DAMAGE_TAKEN 상징 확인
      const damageTakenResult = executeDamageTakenEffects(['ironHeart'], 10);
      expect(damageTakenResult.blockNextTurn).toBe(3);
      expect(damageTakenResult.healNextTurn).toBe(2);
    });

    it('PASSIVE 상징은 등록하지 않음', () => {
      registerAllRelicEffects();

      // PASSIVE 상징은 별도 처리이므로 레지스트리에 없음
      // etherCrystal은 등록되지 않아야 함
      const result = EffectRegistry.execute('ON_COMBAT_START', ['etherCrystal'], {});
      expect(result.blockNextTurn || 0).toBe(0);
    });
  });

  describe('executeDamageTakenEffects', () => {
    beforeEach(() => {
      registerAllRelicEffects();
    });

    it('철의 심장: 다음 턴 방어력/회복', () => {
      const result = executeDamageTakenEffects(['ironHeart'], 10);

      expect(result.blockNextTurn).toBe(3);
      expect(result.healNextTurn).toBe(2);
    });

    it('피의 계약인: 피해량 비례 힘 획득', () => {
      const result = executeDamageTakenEffects(['bloodPactSeal'], 10);

      expect(result.strength).toBe(10);
    });

    it('여러 상징 효과 합산', () => {
      const result = executeDamageTakenEffects(['ironHeart', 'bloodPactSeal'], 5);

      expect(result.blockNextTurn).toBe(3);
      expect(result.healNextTurn).toBe(2);
      expect(result.strength).toBe(5);
    });

    it('등록되지 않은 상징은 무시', () => {
      const result = executeDamageTakenEffects(['nonexistent'], 10);

      expect(result.blockNextTurn || 0).toBe(0);
      expect(result.healNextTurn || 0).toBe(0);
      expect(result.strength || 0).toBe(0);
    });
  });

  describe('executeRelicActivateEffects', () => {
    beforeEach(() => {
      registerAllRelicEffects();
    });

    it('묵주: 에테르 획득', () => {
      const result = executeRelicActivateEffects(['rosary'], ['ironHeart']);

      expect(result.etherGain).toBe(3);
    });

    it('ON_RELIC_ACTIVATE가 아닌 상징은 무시', () => {
      const result = executeRelicActivateEffects(['ironHeart'], ['rosary']);

      expect(result.etherGain || 0).toBe(0);
    });
  });

  describe('clearRegistry', () => {
    it('레지스트리 초기화', () => {
      registerAllRelicEffects();

      // 등록 확인
      let result = executeDamageTakenEffects(['ironHeart'], 10);
      expect(result.blockNextTurn).toBe(3);

      // 초기화
      clearRegistry();

      // 초기화 후 빈 결과
      result = executeDamageTakenEffects(['ironHeart'], 10);
      expect(result.blockNextTurn || 0).toBe(0);
    });
  });
});

describe('기존 relicEffects와 호환성', () => {
  beforeEach(() => {
    clearRegistry();
    registerAllRelicEffects();
  });

  it('EffectRegistry 결과가 기존 함수와 동일한 형태', () => {
    const result = executeDamageTakenEffects(['ironHeart', 'bloodPactSeal'], 5);

    // 기존 applyDamageTakenEffects와 동일한 필드 존재
    expect(typeof result.blockNextTurn).toBe('number');
    expect(typeof result.healNextTurn).toBe('number');
    expect(typeof result.strength).toBe('number');
  });
});
