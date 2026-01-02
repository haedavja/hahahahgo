// @ts-nocheck - Test file with type issues
/**
 * @file ethosEffects.test.ts
 * @description 에토스 패시브 효과 처리 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  processEthosAtBattleStart,
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
  getGrowthState,
  isGunCard,
  isSwordCard,
  getGunCritEffects,
  shouldCounterShootOnEvade,
  calculateSwordDamageBonus,
  getGunCrossEffects,
  calculateAttackDamageBonus,
  shouldPreventJamOnReload,
  shouldPreventGhostRoulette,
  getGunEvasionIgnorePercent,
  getExtraFinesseOnGain,
} from '../ethosEffects';
import type { GrowthState } from '../../state/slices/growthSlice';
import type { Combatant, Card } from '../../types';

// ETHOS 데이터 모킹
vi.mock('../../data/growth/ethosData', () => ({
  ETHOS: {
    // 전투 시작 효과
    battle_start_token: {
      id: 'battle_start_token',
      name: '전투 시작 토큰',
      effect: { trigger: 'battleStart', action: 'addToken', token: 'strength', value: 2 },
    },
    battle_start_shoot: {
      id: 'battle_start_shoot',
      name: '전투 시작 사격',
      effect: { trigger: 'battleStart', action: 'shoot', value: 1 },
    },
    // 총격 치명타
    flame_ethos: {
      id: 'flame_ethos',
      name: '불꽃',
      effect: { trigger: 'gunCrit', action: 'addToken', token: 'burn', value: 2 },
    },
    // 회피 성공
    gap_ethos: {
      id: 'gap_ethos',
      name: '틈새',
      effect: { trigger: 'evadeSuccess', action: 'shoot', value: 1 },
    },
    // 검격 공격
    sword_mastery: {
      id: 'sword_mastery',
      name: '검예',
      effect: { trigger: 'swordAttack', action: 'damageBonus', source: 'finesse' },
    },
    // 총격 공격
    sharpshooter: {
      id: 'sharpshooter',
      name: '명사수',
      effect: { trigger: 'gunAttack', action: 'ignoreEvasion', percent: 30 },
    },
    // 장전 턴
    modern_mag: {
      id: 'modern_mag',
      name: '최신 탄창',
      effect: { trigger: 'reloadTurn', action: 'preventJam' },
    },
    // 유령 사격
    shadow_ethos: {
      id: 'shadow_ethos',
      name: '흑막',
      effect: { trigger: 'ghostShoot', action: 'preventRouletteIncrease' },
    },
    // 기교 획득
    extreme_ethos: {
      id: 'extreme_ethos',
      name: '극한',
      effect: { trigger: 'finesseGain3', action: 'addToken', token: 'finesse', value: 1 },
    },
    // 총격 교차
    neutralize_ethos: {
      id: 'neutralize_ethos',
      name: '무력화',
      effect: { trigger: 'gunCross', action: 'addToken', token: 'dull', value: 1 },
    },
    // 공격
    archaeology_ethos: {
      id: 'archaeology_ethos',
      name: '고고학',
      effect: { trigger: 'attack', action: 'damageBonus', source: 'symbol' },
    },
    // damageBonus (비 전투 시작)
    other_damage_bonus: {
      id: 'other_damage_bonus',
      name: '기타 보너스',
      effect: { trigger: 'battleStart', action: 'damageBonus', value: 5 },
    },
  },
}));

// gameStore 모킹
const mockGrowthState: GrowthState = {
  level: 1,
  experience: 0,
  tier: 'apprentice',
  unlockedEthos: ['battle_start_token', 'flame_ethos', 'gap_ethos', 'sword_mastery'],
  equippedPathos: [],
  unlockedLogos: [],
  equippedLogos: [],
  unlockedPathos: [],
  upgradePoints: 0,
  pyramidState: [],
  totalUnlocked: 4,
};

vi.mock('../../state/gameStore', () => ({
  useGameStore: {
    getState: vi.fn(() => ({
      growth: mockGrowthState,
    })),
  },
}));

vi.mock('../../state/slices/growthSlice', () => ({
  initialGrowthState: {
    level: 0,
    experience: 0,
    tier: 'novice',
    unlockedEthos: [],
    equippedPathos: [],
    unlockedLogos: [],
    equippedLogos: [],
    unlockedPathos: [],
    upgradePoints: 0,
    pyramidState: [],
    totalUnlocked: 0,
  },
}));

// 테스트용 전투원 생성
function createMockCombatant(overrides: Partial<Combatant> = {}): Combatant {
  return {
    hp: 70,
    maxHp: 80,
    block: 0,
    tokens: {},
    ...overrides,
  } as Combatant;
}

// 테스트용 성장 상태 생성
function createMockGrowth(overrides: Partial<GrowthState> = {}): GrowthState {
  return {
    level: 1,
    experience: 0,
    tier: 'apprentice',
    unlockedEthos: [],
    equippedPathos: [],
    unlockedLogos: [],
    equippedLogos: [],
    unlockedPathos: [],
    upgradePoints: 0,
    pyramidState: [],
    totalUnlocked: 0,
    ...overrides,
  } as GrowthState;
}

describe('ethosEffects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processEthosAtBattleStart', () => {
    it('해금된 에토스가 없으면 빈 결과를 반환한다', () => {
      const player = createMockCombatant();
      const growth = createMockGrowth();

      const result = processEthosAtBattleStart(player, growth);

      expect(result.logs).toHaveLength(0);
      expect(result.tokensToAdd).toHaveLength(0);
    });

    it('battleStart 트리거 에토스가 처리된다', () => {
      const player = createMockCombatant();
      const growth = createMockGrowth({
        unlockedEthos: ['battle_start_token'],
      });

      const result = processEthosAtBattleStart(player, growth);

      expect(result.tokensToAdd).toHaveLength(1);
      expect(result.tokensToAdd[0].id).toBe('strength');
      expect(result.tokensToAdd[0].stacks).toBe(2);
    });

    it('shoot 액션은 발동 준비 로그만 추가한다', () => {
      const player = createMockCombatant();
      const growth = createMockGrowth({
        unlockedEthos: ['battle_start_shoot'],
      });

      const result = processEthosAtBattleStart(player, growth);

      expect(result.logs[0]).toContain('발동 준비');
    });

    it('damageBonus 액션은 아무 것도 추가하지 않는다', () => {
      const player = createMockCombatant();
      const growth = createMockGrowth({
        unlockedEthos: ['other_damage_bonus'],
      });

      const result = processEthosAtBattleStart(player, growth);

      expect(result.tokensToAdd).toHaveLength(0);
    });

    it('null growth는 빈 결과를 반환한다', () => {
      const player = createMockCombatant();

      const result = processEthosAtBattleStart(player, null as any);

      expect(result.logs).toHaveLength(0);
    });

    it('존재하지 않는 에토스는 무시한다', () => {
      const player = createMockCombatant();
      const growth = createMockGrowth({
        unlockedEthos: ['invalid_ethos', 'battle_start_token'],
      });

      const result = processEthosAtBattleStart(player, growth);

      expect(result.tokensToAdd).toHaveLength(1);
    });
  });

  describe('getEthosEffectsForTrigger', () => {
    it('특정 트리거에 해당하는 에토스를 반환한다', () => {
      const growth = createMockGrowth({
        unlockedEthos: ['flame_ethos', 'battle_start_token'],
      });

      const effects = getEthosEffectsForTrigger(growth, 'gunCrit');

      expect(effects).toHaveLength(1);
      expect(effects[0].id).toBe('flame_ethos');
    });

    it('빈 growth는 빈 배열을 반환한다', () => {
      const effects = getEthosEffectsForTrigger(null as any, 'gunCrit');

      expect(effects).toHaveLength(0);
    });

    it('해당 트리거가 없으면 빈 배열을 반환한다', () => {
      const growth = createMockGrowth({
        unlockedEthos: ['battle_start_token'],
      });

      const effects = getEthosEffectsForTrigger(growth, 'gunCrit');

      expect(effects).toHaveLength(0);
    });
  });

  describe('hasGunCritEthos', () => {
    it('화상 효과가 있으면 true를 반환한다', () => {
      const growth = createMockGrowth({
        unlockedEthos: ['flame_ethos'],
      });

      const result = hasGunCritEthos(growth);

      expect(result.hasBurn).toBe(true);
    });

    it('화상 효과가 없으면 false를 반환한다', () => {
      const growth = createMockGrowth({
        unlockedEthos: ['battle_start_token'],
      });

      const result = hasGunCritEthos(growth);

      expect(result.hasBurn).toBe(false);
    });
  });

  describe('hasEvadeSuccessEthos', () => {
    it('사격 효과가 있으면 true를 반환한다', () => {
      const growth = createMockGrowth({
        unlockedEthos: ['gap_ethos'],
      });

      const result = hasEvadeSuccessEthos(growth);

      expect(result.hasShoot).toBe(true);
    });

    it('사격 효과가 없으면 false를 반환한다', () => {
      const growth = createMockGrowth({
        unlockedEthos: ['battle_start_token'],
      });

      const result = hasEvadeSuccessEthos(growth);

      expect(result.hasShoot).toBe(false);
    });
  });

  describe('getSwordDamageBonus', () => {
    it('기교 스택만큼 보너스를 반환한다', () => {
      const growth = createMockGrowth({
        unlockedEthos: ['sword_mastery'],
      });

      const bonus = getSwordDamageBonus(growth, 5);

      expect(bonus).toBe(5);
    });

    it('에토스가 없으면 0을 반환한다', () => {
      const growth = createMockGrowth();

      const bonus = getSwordDamageBonus(growth, 5);

      expect(bonus).toBe(0);
    });
  });

  describe('getGunEvasionIgnore', () => {
    it('회피 무시율을 반환한다', () => {
      const growth = createMockGrowth({
        unlockedEthos: ['sharpshooter'],
      });

      const percent = getGunEvasionIgnore(growth);

      expect(percent).toBe(30);
    });

    it('에토스가 없으면 0을 반환한다', () => {
      const growth = createMockGrowth();

      const percent = getGunEvasionIgnore(growth);

      expect(percent).toBe(0);
    });
  });

  describe('hasPreventJamOnReload', () => {
    it('탄걸림 방지 에토스가 있으면 true를 반환한다', () => {
      const growth = createMockGrowth({
        unlockedEthos: ['modern_mag'],
      });

      const result = hasPreventJamOnReload(growth);

      expect(result).toBe(true);
    });

    it('에토스가 없으면 false를 반환한다', () => {
      const growth = createMockGrowth();

      const result = hasPreventJamOnReload(growth);

      expect(result).toBe(false);
    });
  });

  describe('hasPreventGhostRouletteIncrease', () => {
    it('룰렛 증가 방지 에토스가 있으면 true를 반환한다', () => {
      const growth = createMockGrowth({
        unlockedEthos: ['shadow_ethos'],
      });

      const result = hasPreventGhostRouletteIncrease(growth);

      expect(result).toBe(true);
    });

    it('에토스가 없으면 false를 반환한다', () => {
      const growth = createMockGrowth();

      const result = hasPreventGhostRouletteIncrease(growth);

      expect(result).toBe(false);
    });
  });

  describe('hasFinesseBonus', () => {
    it('기교 보너스 에토스가 있으면 true를 반환한다', () => {
      const growth = createMockGrowth({
        unlockedEthos: ['extreme_ethos'],
      });

      const result = hasFinesseBonus(growth);

      expect(result).toBe(true);
    });

    it('에토스가 없으면 false를 반환한다', () => {
      const growth = createMockGrowth();

      const result = hasFinesseBonus(growth);

      expect(result).toBe(false);
    });
  });

  describe('hasGunCrossDull', () => {
    it('무딤 부여 에토스가 있으면 true를 반환한다', () => {
      const growth = createMockGrowth({
        unlockedEthos: ['neutralize_ethos'],
      });

      const result = hasGunCrossDull(growth);

      expect(result).toBe(true);
    });

    it('에토스가 없으면 false를 반환한다', () => {
      const growth = createMockGrowth();

      const result = hasGunCrossDull(growth);

      expect(result).toBe(false);
    });
  });

  describe('getSymbolDamageBonus', () => {
    it('상징 개수만큼 보너스를 반환한다', () => {
      const growth = createMockGrowth({
        unlockedEthos: ['archaeology_ethos'],
      });

      const bonus = getSymbolDamageBonus(growth, 3);

      expect(bonus).toBe(3);
    });

    it('에토스가 없으면 0을 반환한다', () => {
      const growth = createMockGrowth();

      const bonus = getSymbolDamageBonus(growth, 3);

      expect(bonus).toBe(0);
    });
  });

  describe('getGrowthState', () => {
    it('현재 성장 상태를 반환한다', () => {
      const state = getGrowthState();

      expect(state).toBeDefined();
      expect(state.unlockedEthos).toBeDefined();
    });
  });

  describe('isGunCard', () => {
    it('총기 카드면 true를 반환한다', () => {
      const card = { cardCategory: 'gun' } as Card;

      expect(isGunCard(card)).toBe(true);
    });

    it('다른 카드면 false를 반환한다', () => {
      const card = { cardCategory: 'fencing' } as Card;

      expect(isGunCard(card)).toBe(false);
    });
  });

  describe('isSwordCard', () => {
    it('검술 카드면 true를 반환한다', () => {
      const fencingCard = { cardCategory: 'fencing' } as Card;
      const swordCard = { cardCategory: 'sword' } as Card;

      expect(isSwordCard(fencingCard)).toBe(true);
      expect(isSwordCard(swordCard)).toBe(true);
    });

    it('다른 카드면 false를 반환한다', () => {
      const card = { cardCategory: 'gun' } as Card;

      expect(isSwordCard(card)).toBe(false);
    });
  });

  describe('getGunCritEffects', () => {
    it('화상 스택과 로그를 반환한다', async () => {
      const gameStoreMock = await import('../../state/gameStore');
      vi.mocked(gameStoreMock.useGameStore.getState).mockReturnValue({
        growth: createMockGrowth({ unlockedEthos: ['flame_ethos'] }),
      } as any);

      const result = getGunCritEffects();

      expect(result.burnStacks).toBe(2);
      expect(result.logs.length).toBeGreaterThan(0);
    });
  });

  describe('shouldCounterShootOnEvade', () => {
    it('반격 사격 정보를 반환한다', async () => {
      const gameStoreMock = await import('../../state/gameStore');
      vi.mocked(gameStoreMock.useGameStore.getState).mockReturnValue({
        growth: createMockGrowth({ unlockedEthos: ['gap_ethos'] }),
      } as any);

      const result = shouldCounterShootOnEvade();

      expect(result.shouldShoot).toBe(true);
      expect(result.shots).toBe(1);
    });
  });

  describe('calculateSwordDamageBonus', () => {
    it('기교 스택으로 보너스를 계산한다', async () => {
      const gameStoreMock = await import('../../state/gameStore');
      vi.mocked(gameStoreMock.useGameStore.getState).mockReturnValue({
        growth: createMockGrowth({ unlockedEthos: ['sword_mastery'] }),
      } as any);

      const result = calculateSwordDamageBonus(5);

      expect(result.bonus).toBe(5);
    });
  });

  describe('getGunCrossEffects', () => {
    it('무딤 스택과 로그를 반환한다', async () => {
      const gameStoreMock = await import('../../state/gameStore');
      vi.mocked(gameStoreMock.useGameStore.getState).mockReturnValue({
        growth: createMockGrowth({ unlockedEthos: ['neutralize_ethos'] }),
      } as any);

      const result = getGunCrossEffects();

      expect(result.dullStacks).toBe(1);
    });
  });

  describe('calculateAttackDamageBonus', () => {
    it('상징 개수로 보너스를 계산한다', async () => {
      const gameStoreMock = await import('../../state/gameStore');
      vi.mocked(gameStoreMock.useGameStore.getState).mockReturnValue({
        growth: createMockGrowth({ unlockedEthos: ['archaeology_ethos'] }),
      } as any);

      const result = calculateAttackDamageBonus(4);

      expect(result.bonus).toBe(4);
    });
  });

  describe('shouldPreventJamOnReload', () => {
    it('탄걸림 방지 여부를 반환한다', async () => {
      const gameStoreMock = await import('../../state/gameStore');
      vi.mocked(gameStoreMock.useGameStore.getState).mockReturnValue({
        growth: createMockGrowth({ unlockedEthos: ['modern_mag'] }),
      } as any);

      const result = shouldPreventJamOnReload();

      expect(result).toBe(true);
    });
  });

  describe('shouldPreventGhostRoulette', () => {
    it('유령 룰렛 방지 여부를 반환한다', async () => {
      const gameStoreMock = await import('../../state/gameStore');
      vi.mocked(gameStoreMock.useGameStore.getState).mockReturnValue({
        growth: createMockGrowth({ unlockedEthos: ['shadow_ethos'] }),
      } as any);

      const result = shouldPreventGhostRoulette();

      expect(result).toBe(true);
    });
  });

  describe('getGunEvasionIgnorePercent', () => {
    it('회피 무시 확률을 반환한다', async () => {
      const gameStoreMock = await import('../../state/gameStore');
      vi.mocked(gameStoreMock.useGameStore.getState).mockReturnValue({
        growth: createMockGrowth({ unlockedEthos: ['sharpshooter'] }),
      } as any);

      const result = getGunEvasionIgnorePercent();

      expect(result).toBe(30);
    });
  });

  describe('getExtraFinesseOnGain', () => {
    it('기교 추가 획득량을 반환한다', async () => {
      const gameStoreMock = await import('../../state/gameStore');
      vi.mocked(gameStoreMock.useGameStore.getState).mockReturnValue({
        growth: createMockGrowth({ unlockedEthos: ['extreme_ethos'] }),
      } as any);

      const result = getExtraFinesseOnGain(6);

      expect(result.extra).toBe(2); // 6 / 3 = 2
    });

    it('에토스가 없으면 0을 반환한다', async () => {
      const gameStoreMock = await import('../../state/gameStore');
      vi.mocked(gameStoreMock.useGameStore.getState).mockReturnValue({
        growth: createMockGrowth({ unlockedEthos: [] }),
      } as any);

      const result = getExtraFinesseOnGain(6);

      expect(result.extra).toBe(0);
    });
  });
});
