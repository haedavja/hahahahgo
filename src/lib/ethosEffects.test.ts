/**
 * @file ethosEffects.test.ts
 * @description 에토스 (패시브) 효과 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getEthosEffectsForTrigger,
  hasGunCritEthos,
  hasEvadeSuccessEthos,
  getSwordDamageBonus,
  getGunEvasionIgnore,
  hasPreventJamOnReload,
  hasPreventGhostRouletteIncrease,
  hasFinesseBonus,
  hasGunCrossDull,
  getSymbolDamageBonus,
  isGunCard,
  isSwordCard,
  applyEthosEffect,
} from './ethosEffects';
import type { GrowthState } from '../state/slices/growthSlice';
import { initialGrowthState } from '../state/slices/growthSlice';
import type { Card } from '../types';

// Mock useGameStore
vi.mock('../state/gameStore', () => ({
  useGameStore: {
    getState: vi.fn(() => ({
      growth: mockGrowth,
    })),
  },
}));

// Mock ETHOS data
vi.mock('../data/growth/ethosData', () => ({
  ETHOS: {
    flame: {
      id: 'flame',
      name: '불꽃',
      description: '총격 치명타 시 화상',
      effect: {
        trigger: 'gunCrit',
        action: 'addToken',
        token: 'burn',
        value: 1,
      },
    },
    gap: {
      id: 'gap',
      name: '틈새',
      description: '회피 성공 시 반격 사격',
      effect: {
        trigger: 'evadeSuccess',
        action: 'shoot',
        value: 1,
      },
    },
    swordExpert: {
      id: 'swordExpert',
      name: '검예',
      description: '검격 시 기교만큼 추가 피해',
      effect: {
        trigger: 'swordAttack',
        action: 'damageBonus',
        source: 'finesse',
      },
    },
    marksman: {
      id: 'marksman',
      name: '명사수',
      description: '총격 회피 무시 50%',
      effect: {
        trigger: 'gunAttack',
        action: 'ignoreEvasion',
        percent: 50,
      },
    },
    modernMag: {
      id: 'modernMag',
      name: '최신 탄창',
      description: '장전 턴 탄걸림 방지',
      effect: {
        trigger: 'reloadTurn',
        action: 'preventJam',
      },
    },
    mastermind: {
      id: 'mastermind',
      name: '흑막',
      description: '유령 사격 룰렛 증가 방지',
      effect: {
        trigger: 'ghostShoot',
        action: 'preventRouletteIncrease',
      },
    },
    extreme: {
      id: 'extreme',
      name: '극한',
      description: '기교 3회 획득 시 추가 기교',
      effect: {
        trigger: 'finesseGain3',
        action: 'addToken',
        token: 'finesse',
        value: 1,
      },
    },
    neutralize: {
      id: 'neutralize',
      name: '무력화',
      description: '총격 교차 시 무딤 부여',
      effect: {
        trigger: 'gunCross',
        action: 'addToken',
        token: 'dull',
        value: 1,
      },
    },
    archaeology: {
      id: 'archaeology',
      name: '고고학',
      description: '공격 시 상징 개수만큼 추가 피해',
      effect: {
        trigger: 'attack',
        action: 'damageBonus',
        source: 'symbol',
      },
    },
    battleStart: {
      id: 'battleStart',
      name: '전투 시작 에토스',
      description: '전투 시작 시 토큰 부여',
      effect: {
        trigger: 'battleStart',
        action: 'addToken',
        token: 'strength',
        value: 2,
      },
    },
  },
}));

let mockGrowth: GrowthState;

describe('ethosEffects', () => {
  beforeEach(() => {
    mockGrowth = {
      ...initialGrowthState,
      unlockedEthos: [],
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getEthosEffectsForTrigger', () => {
    it('트리거에 해당하는 에토스를 반환한다', () => {
      mockGrowth.unlockedEthos = ['flame', 'gap', 'swordExpert'];

      const gunCritEffects = getEthosEffectsForTrigger(mockGrowth, 'gunCrit');
      expect(gunCritEffects.length).toBe(1);
      expect(gunCritEffects[0].id).toBe('flame');
    });

    it('해금되지 않은 에토스는 반환하지 않는다', () => {
      mockGrowth.unlockedEthos = ['gap'];

      const gunCritEffects = getEthosEffectsForTrigger(mockGrowth, 'gunCrit');
      expect(gunCritEffects.length).toBe(0);
    });

    it('null growth 처리', () => {
      const effects = getEthosEffectsForTrigger(null as GrowthState, 'gunCrit');
      expect(effects.length).toBe(0);
    });
  });

  describe('hasGunCritEthos', () => {
    it('화상 에토스가 있으면 true', () => {
      mockGrowth.unlockedEthos = ['flame'];

      const result = hasGunCritEthos(mockGrowth);
      expect(result.hasBurn).toBe(true);
    });

    it('화상 에토스가 없으면 false', () => {
      mockGrowth.unlockedEthos = ['gap'];

      const result = hasGunCritEthos(mockGrowth);
      expect(result.hasBurn).toBe(false);
    });
  });

  describe('hasEvadeSuccessEthos', () => {
    it('회피 사격 에토스가 있으면 true', () => {
      mockGrowth.unlockedEthos = ['gap'];

      const result = hasEvadeSuccessEthos(mockGrowth);
      expect(result.hasShoot).toBe(true);
    });

    it('회피 사격 에토스가 없으면 false', () => {
      mockGrowth.unlockedEthos = ['flame'];

      const result = hasEvadeSuccessEthos(mockGrowth);
      expect(result.hasShoot).toBe(false);
    });
  });

  describe('getSwordDamageBonus', () => {
    it('검예 에토스가 있으면 기교만큼 보너스', () => {
      mockGrowth.unlockedEthos = ['swordExpert'];

      const bonus = getSwordDamageBonus(mockGrowth, 5);
      expect(bonus).toBe(5);
    });

    it('검예 에토스가 없으면 0', () => {
      mockGrowth.unlockedEthos = [];

      const bonus = getSwordDamageBonus(mockGrowth, 5);
      expect(bonus).toBe(0);
    });
  });

  describe('getGunEvasionIgnore', () => {
    it('명사수 에토스가 있으면 회피 무시율 반환', () => {
      mockGrowth.unlockedEthos = ['marksman'];

      const percent = getGunEvasionIgnore(mockGrowth);
      expect(percent).toBe(50);
    });

    it('명사수 에토스가 없으면 0', () => {
      mockGrowth.unlockedEthos = [];

      const percent = getGunEvasionIgnore(mockGrowth);
      expect(percent).toBe(0);
    });
  });

  describe('hasPreventJamOnReload', () => {
    it('최신 탄창 에토스가 있으면 true', () => {
      mockGrowth.unlockedEthos = ['modernMag'];

      expect(hasPreventJamOnReload(mockGrowth)).toBe(true);
    });

    it('최신 탄창 에토스가 없으면 false', () => {
      mockGrowth.unlockedEthos = [];

      expect(hasPreventJamOnReload(mockGrowth)).toBe(false);
    });
  });

  describe('hasPreventGhostRouletteIncrease', () => {
    it('흑막 에토스가 있으면 true', () => {
      mockGrowth.unlockedEthos = ['mastermind'];

      expect(hasPreventGhostRouletteIncrease(mockGrowth)).toBe(true);
    });

    it('흑막 에토스가 없으면 false', () => {
      mockGrowth.unlockedEthos = [];

      expect(hasPreventGhostRouletteIncrease(mockGrowth)).toBe(false);
    });
  });

  describe('hasFinesseBonus', () => {
    it('극한 에토스가 있으면 true', () => {
      mockGrowth.unlockedEthos = ['extreme'];

      expect(hasFinesseBonus(mockGrowth)).toBe(true);
    });

    it('극한 에토스가 없으면 false', () => {
      mockGrowth.unlockedEthos = [];

      expect(hasFinesseBonus(mockGrowth)).toBe(false);
    });
  });

  describe('hasGunCrossDull', () => {
    it('무력화 에토스가 있으면 true', () => {
      mockGrowth.unlockedEthos = ['neutralize'];

      expect(hasGunCrossDull(mockGrowth)).toBe(true);
    });

    it('무력화 에토스가 없으면 false', () => {
      mockGrowth.unlockedEthos = [];

      expect(hasGunCrossDull(mockGrowth)).toBe(false);
    });
  });

  describe('getSymbolDamageBonus', () => {
    it('고고학 에토스가 있으면 상징 개수만큼 보너스', () => {
      mockGrowth.unlockedEthos = ['archaeology'];

      const bonus = getSymbolDamageBonus(mockGrowth, 3);
      expect(bonus).toBe(3);
    });

    it('고고학 에토스가 없으면 0', () => {
      mockGrowth.unlockedEthos = [];

      const bonus = getSymbolDamageBonus(mockGrowth, 3);
      expect(bonus).toBe(0);
    });
  });

  describe('card type checks', () => {
    describe('isGunCard', () => {
      it('총기 카드를 식별한다', () => {
        const gunCard = { cardCategory: 'gun' } as Card;
        expect(isGunCard(gunCard)).toBe(true);
      });

      it('다른 카드는 false', () => {
        const swordCard = { cardCategory: 'fencing' } as Card;
        expect(isGunCard(swordCard)).toBe(false);
      });
    });

    describe('isSwordCard', () => {
      it('검술 카드를 식별한다', () => {
        const fencingCard = { cardCategory: 'fencing' } as Card;
        const swordCard = { cardCategory: 'sword' } as Card;

        expect(isSwordCard(fencingCard)).toBe(true);
        expect(isSwordCard(swordCard)).toBe(true);
      });

      it('다른 카드는 false', () => {
        const gunCard = { cardCategory: 'gun' } as Card;
        expect(isSwordCard(gunCard)).toBe(false);
      });
    });
  });

  describe('applyEthosEffect', () => {
    it('addToken 액션은 토큰을 추가한다', () => {
      const ethos = {
        id: 'flame',
        name: '불꽃',
        effect: {
          trigger: 'gunCrit',
          action: 'addToken',
          token: 'burn',
          value: 2,
        },
      } as any;
      const player = { hp: 100, tokens: [] } as any;

      const result = applyEthosEffect(ethos, player);

      expect(result.tokensToAdd).toHaveLength(1);
      expect(result.tokensToAdd[0]).toEqual({ id: 'burn', stacks: 2 });
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0]).toContain('불꽃');
    });

    it('shoot 액션은 발동 준비 로그를 남긴다', () => {
      const ethos = {
        id: 'gap',
        name: '틈새',
        effect: {
          trigger: 'evadeSuccess',
          action: 'shoot',
          value: 1,
        },
      } as any;
      const player = { hp: 100 } as any;

      const result = applyEthosEffect(ethos, player);

      expect(result.logs).toHaveLength(1);
      expect(result.logs[0]).toContain('발동 준비');
    });

    it('damageBonus 액션은 로그 없이 처리', () => {
      const ethos = {
        id: 'swordExpert',
        name: '검예',
        effect: {
          trigger: 'swordAttack',
          action: 'damageBonus',
          source: 'finesse',
        },
      } as any;
      const player = { hp: 100 } as any;

      const result = applyEthosEffect(ethos, player);

      expect(result.logs).toHaveLength(0);
      expect(result.tokensToAdd).toHaveLength(0);
    });

    it('알 수 없는 액션은 무시', () => {
      const ethos = {
        id: 'unknown',
        name: '미지',
        effect: {
          trigger: 'test',
          action: 'unknownAction',
        },
      } as any;
      const player = { hp: 100 } as any;

      const result = applyEthosEffect(ethos, player);

      expect(result.logs).toHaveLength(0);
      expect(result.tokensToAdd).toHaveLength(0);
    });

    it('플레이어 상태가 업데이트된다', () => {
      const ethos = {
        id: 'test',
        name: '테스트',
        effect: {
          trigger: 'battleStart',
          action: 'addToken',
          token: 'strength',
          value: 1,
        },
      } as any;
      const player = { hp: 100, block: 5 } as any;

      const result = applyEthosEffect(ethos, player);

      expect(result.updatedPlayer.hp).toBe(100);
      expect(result.updatedPlayer.block).toBe(5);
    });
  });
});
