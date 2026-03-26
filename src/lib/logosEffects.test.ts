/**
 * @file logosEffects.test.ts
 * @description 로고스 (피라미드 정점) 효과 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateLogosEffects,
  hasExpandedCrossRange,
  getExtraSubSlots,
  getExtraMainSlots,
  shouldShootOnBlock,
  getJamReduction,
  getGunCritBonus,
  shouldReloadOnCrit,
  getMinFinesse,
  getArmorPenetration,
  getCombatTokens,
  getLogosLevelSummary,
} from './logosEffects';
import type { GrowthState } from '../state/slices/growthSlice';
import { initialGrowthState } from '../state/slices/growthSlice';

// Mock useGameStore
vi.mock('../state/gameStore', () => ({
  useGameStore: {
    getState: vi.fn(() => ({
      growth: mockGrowth,
    })),
  },
}));

let mockGrowth: GrowthState;

describe('logosEffects', () => {
  beforeEach(() => {
    mockGrowth = {
      ...initialGrowthState,
      logosLevels: {
        common: 0,
        gunkata: 0,
        battleWaltz: 0,
      },
      identities: [],
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateLogosEffects', () => {
    it('초기 상태에서는 모든 효과가 비활성화된다', () => {
      const effects = calculateLogosEffects(mockGrowth);

      expect(effects.expandCrossRange).toBe(false);
      expect(effects.extraSubSlots).toBe(0);
      expect(effects.extraMainSlots).toBe(0);
      expect(effects.blockToShoot).toBe(false);
      expect(effects.reduceJamChance).toBe(0);
      expect(effects.critBonusGun).toBe(0);
      expect(effects.minFinesse).toBe(0);
    });

    it('공용 로고스 레벨 1에서 교차 범위가 확장된다', () => {
      mockGrowth.logosLevels.common = 1;

      const effects = calculateLogosEffects(mockGrowth);
      expect(effects.expandCrossRange).toBe(true);
    });

    it('공용 로고스 레벨 2에서 추가 보조특기 슬롯을 얻는다', () => {
      mockGrowth.logosLevels.common = 2;

      const effects = calculateLogosEffects(mockGrowth);
      expect(effects.extraSubSlots).toBe(2);
    });

    it('공용 로고스 레벨 3에서 추가 주특기 슬롯을 얻는다', () => {
      mockGrowth.logosLevels.common = 3;

      const effects = calculateLogosEffects(mockGrowth);
      expect(effects.extraMainSlots).toBe(1);
    });

    it('건카타 효과는 총잡이 자아가 필요하다', () => {
      mockGrowth.logosLevels.gunkata = 3;
      // 자아 없음

      const effects = calculateLogosEffects(mockGrowth);
      expect(effects.blockToShoot).toBe(false);
      expect(effects.reduceJamChance).toBe(0);
      expect(effects.critReload).toBe(false);
    });

    it('건카타 레벨 1 - 방어력으로 막아낼 시 총격', () => {
      mockGrowth.identities = ['gunslinger'];
      mockGrowth.logosLevels.gunkata = 1;

      const effects = calculateLogosEffects(mockGrowth);
      expect(effects.blockToShoot).toBe(true);
    });

    it('건카타 레벨 2 - 탄걸림 확률 감소', () => {
      mockGrowth.identities = ['gunslinger'];
      mockGrowth.logosLevels.gunkata = 2;

      const effects = calculateLogosEffects(mockGrowth);
      expect(effects.reduceJamChance).toBe(2);
    });

    it('건카타 레벨 3 - 치명타 보너스와 장전', () => {
      mockGrowth.identities = ['gunslinger'];
      mockGrowth.logosLevels.gunkata = 3;

      const effects = calculateLogosEffects(mockGrowth);
      expect(effects.critBonusGun).toBe(3);
      expect(effects.critReload).toBe(true);
    });

    it('배틀 왈츠 효과는 검잡이 자아가 필요하다', () => {
      mockGrowth.logosLevels.battleWaltz = 3;
      // 자아 없음

      const effects = calculateLogosEffects(mockGrowth);
      expect(effects.minFinesse).toBe(0);
      expect(effects.armorPenetration).toBe(0);
    });

    it('배틀 왈츠 레벨 1 - 최소 기교', () => {
      mockGrowth.identities = ['swordsman'];
      mockGrowth.logosLevels.battleWaltz = 1;

      const effects = calculateLogosEffects(mockGrowth);
      expect(effects.minFinesse).toBe(1);
    });

    it('배틀 왈츠 레벨 2 - 방어력 관통', () => {
      mockGrowth.identities = ['swordsman'];
      mockGrowth.logosLevels.battleWaltz = 2;

      const effects = calculateLogosEffects(mockGrowth);
      expect(effects.armorPenetration).toBe(50);
    });

    it('배틀 왈츠 레벨 3 - 전투 토큰', () => {
      mockGrowth.identities = ['swordsman'];
      mockGrowth.logosLevels.battleWaltz = 3;

      const effects = calculateLogosEffects(mockGrowth);
      expect(effects.combatTokensOnAttack).toBe('blur');
      expect(effects.combatTokensOnDefense).toBe('defensive');
    });

    it('null growth 처리', () => {
      const effects = calculateLogosEffects(null as GrowthState);
      expect(effects.expandCrossRange).toBe(false);
    });
  });

  describe('helper functions', () => {
    describe('hasExpandedCrossRange', () => {
      it('공용 로고스 레벨에 따라 결과 반환', () => {
        mockGrowth.logosLevels.common = 1;
        expect(hasExpandedCrossRange()).toBe(true);
      });
    });

    describe('getExtraSubSlots', () => {
      it('보조특기 슬롯 수 반환', () => {
        mockGrowth.logosLevels.common = 2;
        expect(getExtraSubSlots()).toBe(2);
      });
    });

    describe('getExtraMainSlots', () => {
      it('주특기 슬롯 수 반환', () => {
        mockGrowth.logosLevels.common = 3;
        expect(getExtraMainSlots()).toBe(1);
      });
    });

    describe('shouldShootOnBlock', () => {
      it('건카타 효과 확인', () => {
        mockGrowth.identities = ['gunslinger'];
        mockGrowth.logosLevels.gunkata = 1;
        expect(shouldShootOnBlock()).toBe(true);
      });
    });

    describe('getJamReduction', () => {
      it('탄걸림 감소량 반환', () => {
        mockGrowth.identities = ['gunslinger'];
        mockGrowth.logosLevels.gunkata = 2;
        expect(getJamReduction()).toBe(2);
      });
    });

    describe('getGunCritBonus', () => {
      it('치명타 보너스 반환', () => {
        mockGrowth.identities = ['gunslinger'];
        mockGrowth.logosLevels.gunkata = 3;
        expect(getGunCritBonus()).toBe(3);
      });
    });

    describe('shouldReloadOnCrit', () => {
      it('치명타시 장전 여부 반환', () => {
        mockGrowth.identities = ['gunslinger'];
        mockGrowth.logosLevels.gunkata = 3;
        expect(shouldReloadOnCrit()).toBe(true);
      });
    });

    describe('getMinFinesse', () => {
      it('최소 기교 반환', () => {
        mockGrowth.identities = ['swordsman'];
        mockGrowth.logosLevels.battleWaltz = 1;
        expect(getMinFinesse()).toBe(1);
      });
    });

    describe('getArmorPenetration', () => {
      it('방어력 관통 % 반환', () => {
        mockGrowth.identities = ['swordsman'];
        mockGrowth.logosLevels.battleWaltz = 2;
        expect(getArmorPenetration()).toBe(50);
      });
    });

    describe('getCombatTokens', () => {
      it('전투 토큰 반환', () => {
        mockGrowth.identities = ['swordsman'];
        mockGrowth.logosLevels.battleWaltz = 3;

        const tokens = getCombatTokens();
        expect(tokens.onAttack).toBe('blur');
        expect(tokens.onDefense).toBe('defensive');
      });
    });

    describe('getLogosLevelSummary', () => {
      it('로고스 레벨 요약 반환', () => {
        mockGrowth.logosLevels = {
          common: 2,
          gunkata: 1,
          battleWaltz: 3,
        };

        const summary = getLogosLevelSummary();
        expect(summary.common).toBe(2);
        expect(summary.gunkata).toBe(1);
        expect(summary.battleWaltz).toBe(3);
      });
    });
  });
});
