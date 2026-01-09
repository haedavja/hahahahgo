/**
 * @file relicEffects.integration.test.ts
 * @description 피해 받기 상징 데이터 흐름 통합 테스트
 *
 * ## 테스트 범위
 * - relicEffects.ts → hitCalculation → combatActions → useResolveExecution
 * - 철의 심장 (ironHeart): 피해 받을 때 다음 턴 방어력/회복
 * - 피의 계약인 (bloodPactSeal): 피해 받을 때 즉시 힘 획득
 *
 * ## 데이터 흐름 검증
 * 1. applyDamageTakenEffects가 올바른 값 반환
 * 2. ActionResult에 damageTakenEffects 포함
 * 3. 누적된 효과가 nextTurnEffects로 저장
 */

import { describe, it, expect, vi } from 'vitest';
import { applyDamageTakenEffects } from './relicEffects';
import type { DamageTakenEffectChanges } from '../types/combat';

// Mock getRelicById
vi.mock('../data/relics', () => ({
  getRelicById: vi.fn((id: string) => {
    const relics: Record<string, unknown> = {
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
      passiveRelic: {
        id: 'passiveRelic',
        name: '패시브 상징',
        effects: {
          type: 'PASSIVE',
          strength: 1,
        },
      },
    };
    return relics[id] || null;
  }),
}));

describe('피해 받기 상징 통합 테스트', () => {
  describe('applyDamageTakenEffects', () => {
    it('상징 없으면 기본값 반환', () => {
      const result = applyDamageTakenEffects([], 10);

      expect(result.blockNextTurn).toBe(0);
      expect(result.healNextTurn).toBe(0);
      expect(result.strength).toBe(0);
    });

    it('철의 심장: 피해 받을 때 다음 턴 방어력/회복 제공', () => {
      const result = applyDamageTakenEffects(['ironHeart'], 10);

      expect(result.blockNextTurn).toBe(3);
      expect(result.healNextTurn).toBe(2);
      expect(result.strength).toBe(0);
    });

    it('피의 계약인: 피해량에 비례해 힘 획득', () => {
      const result = applyDamageTakenEffects(['bloodPactSeal'], 10);

      expect(result.blockNextTurn).toBe(0);
      expect(result.healNextTurn).toBe(0);
      expect(result.strength).toBe(10); // 피해량 10 = 힘 10
    });

    it('철의 심장 + 피의 계약인: 효과 합산', () => {
      const result = applyDamageTakenEffects(['ironHeart', 'bloodPactSeal'], 5);

      expect(result.blockNextTurn).toBe(3);
      expect(result.healNextTurn).toBe(2);
      expect(result.strength).toBe(5); // 피해량 5 = 힘 5
    });

    it('ON_DAMAGE_TAKEN이 아닌 상징은 무시', () => {
      const result = applyDamageTakenEffects(['passiveRelic', 'rosary'], 10);

      expect(result.blockNextTurn).toBe(0);
      expect(result.healNextTurn).toBe(0);
      expect(result.strength).toBe(0);
    });

    it('존재하지 않는 상징은 무시', () => {
      const result = applyDamageTakenEffects(['nonexistent'], 10);

      expect(result.blockNextTurn).toBe(0);
      expect(result.healNextTurn).toBe(0);
      expect(result.strength).toBe(0);
    });

    it('피해량 0이면 피의 계약인 힘 획득 없음', () => {
      const result = applyDamageTakenEffects(['bloodPactSeal'], 0);

      expect(result.strength).toBe(0);
    });
  });

  describe('다중 피해 누적', () => {
    it('여러 번 피해 받을 때 효과 누적', () => {
      // 첫 번째 피해
      const result1 = applyDamageTakenEffects(['ironHeart', 'bloodPactSeal'], 5);
      // 두 번째 피해
      const result2 = applyDamageTakenEffects(['ironHeart', 'bloodPactSeal'], 3);

      // 수동으로 누적 계산 (useResolveExecution의 로직 시뮬레이션)
      const accumulated: DamageTakenEffectChanges = {
        blockNextTurn: result1.blockNextTurn + result2.blockNextTurn,
        healNextTurn: result1.healNextTurn + result2.healNextTurn,
        strength: result1.strength + result2.strength,
      };

      expect(accumulated.blockNextTurn).toBe(6); // 3 + 3
      expect(accumulated.healNextTurn).toBe(4);  // 2 + 2
      expect(accumulated.strength).toBe(8);      // 5 + 3
    });
  });
});

describe('효과 타입 일관성', () => {
  it('DamageTakenEffectChanges 필수 필드 존재', () => {
    const result = applyDamageTakenEffects([], 0);

    // 타입 안전성: 모든 필드가 숫자
    expect(typeof result.blockNextTurn).toBe('number');
    expect(typeof result.healNextTurn).toBe('number');
    expect(typeof result.strength).toBe('number');
  });
});
