/**
 * @file pathosEffects.test.ts
 * @description 파토스 효과 처리 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getEquippedPathos,
  canUsePathos,
  usePathos,
  decreaseCooldowns,
  getPathosInfo,
  type PathosCooldowns,
} from '../pathosEffects';
import type { Combatant } from '../../types';

// gameStore 모킹
const mockGrowthState = {
  equippedPathos: ['iron_bullet', 'instant_reload'],
  unlockedPathos: ['iron_bullet', 'instant_reload', 'flash_slash'],
};

vi.mock('../../state/gameStore', () => ({
  useGameStore: {
    getState: vi.fn(() => ({
      growth: mockGrowthState,
    })),
  },
}));

// PATHOS 데이터 모킹
vi.mock('../../data/growth/pathosData', () => ({
  PATHOS: {
    iron_bullet: {
      id: 'iron_bullet',
      name: '철갑탄',
      description: '관통 +2',
      cooldown: 3,
      effect: {
        action: 'addToken',
        token: 'pierce',
        value: 2,
      },
    },
    instant_reload: {
      id: 'instant_reload',
      name: '즉시 장전',
      description: '즉시 장전',
      cooldown: 4,
      effect: {
        action: 'reload',
      },
    },
    flash_slash: {
      id: 'flash_slash',
      name: '섬광 베기',
      description: '속도 1 검격',
      cooldown: 2,
      effect: {
        action: 'setSpeed',
        value: 1,
      },
    },
    gun_melee: {
      id: 'gun_melee',
      name: '총검술',
      description: '총격 후 타격',
      cooldown: 3,
      effect: {
        action: 'gunToMelee',
      },
    },
    sword_gun: {
      id: 'sword_gun',
      name: '검총술',
      description: '검격 후 사격',
      cooldown: 3,
      effect: {
        action: 'swordToGun',
      },
    },
    sure_shot: {
      id: 'sure_shot',
      name: '필중',
      description: '회피 무시',
      cooldown: 4,
      effect: {
        action: 'ignoreEvasion',
        percent: 100,
      },
    },
    cross_guard: {
      id: 'cross_guard',
      name: '십자 방어',
      description: '교차 시 방어력',
      cooldown: 2,
      effect: {
        action: 'onCrossBlock',
        value: 4,
      },
    },
    sword_guard: {
      id: 'sword_guard',
      name: '검 방어',
      description: '검격 시 방어력',
      cooldown: 2,
      effect: {
        action: 'onSwordBlock',
        value: 5,
      },
    },
    force_cross: {
      id: 'force_cross',
      name: '강제 교차',
      description: '모든 검격 교차',
      cooldown: 3,
      effect: {
        action: 'forceCross',
      },
    },
    crit_strike: {
      id: 'crit_strike',
      name: '급소 가격',
      description: '다음 치명타',
      cooldown: 4,
      effect: {
        action: 'guaranteeCrit',
      },
    },
    aoe_shot: {
      id: 'aoe_shot',
      name: '전탄 발사',
      description: '전체 공격',
      cooldown: 5,
      effect: {
        action: 'aoe',
      },
    },
    chain_mastery: {
      id: 'chain_mastery',
      name: '연계 달인',
      description: '연계 효과 증가',
      cooldown: 3,
      effect: {
        action: 'chainBonus',
        percent: 50,
      },
    },
    chain_evade: {
      id: 'chain_evade',
      name: '연계 회피',
      description: '연계 후 회피',
      cooldown: 3,
      effect: {
        action: 'chainEvade',
      },
    },
    counter_stance: {
      id: 'counter_stance',
      name: '반격 자세',
      description: '피격 시 반격',
      cooldown: 3,
      effect: {
        action: 'counterAttack',
        percent: 30,
      },
    },
    unknown_action: {
      id: 'unknown_action',
      name: '알 수 없는 효과',
      description: '테스트용',
      cooldown: 1,
      effect: {
        action: 'unknownAction',
      },
    },
  },
}));

// tokenUtils 모킹
vi.mock('../tokenUtils', () => ({
  addToken: vi.fn((combatant, tokenId, value) => ({
    tokens: { ...combatant.tokens, [tokenId]: (combatant.tokens?.[tokenId] || 0) + value },
  })),
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

describe('pathosEffects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getEquippedPathos', () => {
    it('장착된 파토스 목록을 반환한다', () => {
      const pathos = getEquippedPathos();

      expect(pathos).toHaveLength(2);
      expect(pathos[0].id).toBe('iron_bullet');
      expect(pathos[1].id).toBe('instant_reload');
    });

    it('존재하지 않는 파토스는 필터링된다', async () => {
      const gameStoreMock = await import('../../state/gameStore');
      vi.mocked(gameStoreMock.useGameStore.getState).mockReturnValueOnce({
        growth: {
          equippedPathos: ['iron_bullet', 'invalid_pathos'],
          unlockedPathos: [],
        },
      } as any);

      const pathos = getEquippedPathos();

      expect(pathos).toHaveLength(1);
      expect(pathos[0].id).toBe('iron_bullet');
    });
  });

  describe('canUsePathos', () => {
    it('장착되고 쿨다운이 없으면 사용 가능하다', () => {
      const cooldowns: PathosCooldowns = {};

      const result = canUsePathos('iron_bullet', cooldowns);

      expect(result).toBe(true);
    });

    it('장착되지 않은 파토스는 사용 불가하다', () => {
      const cooldowns: PathosCooldowns = {};

      const result = canUsePathos('flash_slash', cooldowns);

      expect(result).toBe(false);
    });

    it('쿨다운이 남아있으면 사용 불가하다', () => {
      const cooldowns: PathosCooldowns = { iron_bullet: 2 };

      const result = canUsePathos('iron_bullet', cooldowns);

      expect(result).toBe(false);
    });

    it('쿨다운이 0이면 사용 가능하다', () => {
      const cooldowns: PathosCooldowns = { iron_bullet: 0 };

      const result = canUsePathos('iron_bullet', cooldowns);

      expect(result).toBe(true);
    });
  });

  describe('usePathos', () => {
    it('존재하지 않는 파토스 사용 시 실패한다', () => {
      const player = createMockCombatant();
      const enemy = createMockCombatant();
      const cooldowns: PathosCooldowns = {};

      const result = usePathos('invalid_pathos', player, enemy, cooldowns);

      expect(result.success).toBe(false);
      expect(result.message).toBe('존재하지 않는 파토스입니다.');
    });

    it('장착되지 않은 파토스 사용 시 실패한다', () => {
      const player = createMockCombatant();
      const enemy = createMockCombatant();
      const cooldowns: PathosCooldowns = {};

      const result = usePathos('flash_slash', player, enemy, cooldowns);

      expect(result.success).toBe(false);
      expect(result.message).toBe('장착되지 않은 파토스입니다.');
    });

    it('쿨다운 중인 파토스 사용 시 실패한다', () => {
      const player = createMockCombatant();
      const enemy = createMockCombatant();
      const cooldowns: PathosCooldowns = { iron_bullet: 2 };

      const result = usePathos('iron_bullet', player, enemy, cooldowns);

      expect(result.success).toBe(false);
      expect(result.message).toBe('쿨다운 2턴 남음');
    });

    it('addToken 효과가 정상 동작한다', () => {
      const player = createMockCombatant();
      const enemy = createMockCombatant();
      const cooldowns: PathosCooldowns = {};

      const result = usePathos('iron_bullet', player, enemy, cooldowns);

      expect(result.success).toBe(true);
      expect(result.message).toBe('철갑탄 발동!');
      expect(result.logs.length).toBeGreaterThan(0);
      expect(result.events.length).toBeGreaterThan(0);
    });

    it('사용 후 쿨다운이 설정된다', () => {
      const player = createMockCombatant();
      const enemy = createMockCombatant();
      const cooldowns: PathosCooldowns = {};

      usePathos('iron_bullet', player, enemy, cooldowns);

      expect(cooldowns.iron_bullet).toBe(3);
    });

    it('reload 효과가 정상 동작한다', () => {
      const player = createMockCombatant();
      const enemy = createMockCombatant();
      const cooldowns: PathosCooldowns = {};

      const result = usePathos('instant_reload', player, enemy, cooldowns);

      expect(result.success).toBe(true);
      expect(result.logs[0]).toContain('즉시 장전');
    });
  });

  describe('applyPathosEffect 효과별 테스트', () => {
    const player = createMockCombatant();
    const enemy = createMockCombatant();

    beforeEach(async () => {
      // 모든 파토스를 장착 상태로 설정
      const gameStoreMock = await import('../../state/gameStore');
      vi.mocked(gameStoreMock.useGameStore.getState).mockReturnValue({
        growth: {
          equippedPathos: [
            'iron_bullet', 'instant_reload', 'gun_melee', 'sword_gun',
            'sure_shot', 'cross_guard', 'sword_guard', 'force_cross',
            'crit_strike', 'flash_slash', 'aoe_shot', 'chain_mastery',
            'chain_evade', 'counter_stance', 'unknown_action'
          ],
          unlockedPathos: [],
        },
      } as any);
    });

    it('gunToMelee 효과', () => {
      const cooldowns: PathosCooldowns = {};
      const result = usePathos('gun_melee', player, enemy, cooldowns);

      expect(result.success).toBe(true);
      expect(result.turnEffects?.gunToMelee).toBe(true);
    });

    it('swordToGun 효과', () => {
      const cooldowns: PathosCooldowns = {};
      const result = usePathos('sword_gun', player, enemy, cooldowns);

      expect(result.success).toBe(true);
      expect(result.turnEffects?.swordToGun).toBe(true);
    });

    it('ignoreEvasion 효과', () => {
      const cooldowns: PathosCooldowns = {};
      const result = usePathos('sure_shot', player, enemy, cooldowns);

      expect(result.success).toBe(true);
      expect(result.turnEffects?.ignoreEvasion).toBe(100);
    });

    it('onCrossBlock 효과', () => {
      const cooldowns: PathosCooldowns = {};
      const result = usePathos('cross_guard', player, enemy, cooldowns);

      expect(result.success).toBe(true);
      expect(result.turnEffects?.onCrossBlock).toBe(4);
    });

    it('onSwordBlock 효과', () => {
      const cooldowns: PathosCooldowns = {};
      const result = usePathos('sword_guard', player, enemy, cooldowns);

      expect(result.success).toBe(true);
      expect(result.turnEffects?.onSwordBlock).toBe(5);
    });

    it('forceCross 효과', () => {
      const cooldowns: PathosCooldowns = {};
      const result = usePathos('force_cross', player, enemy, cooldowns);

      expect(result.success).toBe(true);
      expect(result.turnEffects?.forceCross).toBe(true);
    });

    it('guaranteeCrit 효과', () => {
      const cooldowns: PathosCooldowns = {};
      const result = usePathos('crit_strike', player, enemy, cooldowns);

      expect(result.success).toBe(true);
      expect(result.nextCardEffects?.guaranteeCrit).toBe(true);
    });

    it('setSpeed 효과', () => {
      const cooldowns: PathosCooldowns = {};
      const result = usePathos('flash_slash', player, enemy, cooldowns);

      expect(result.success).toBe(true);
      expect(result.nextCardEffects?.setSpeed).toBe(1);
    });

    it('aoe 효과', () => {
      const cooldowns: PathosCooldowns = {};
      const result = usePathos('aoe_shot', player, enemy, cooldowns);

      expect(result.success).toBe(true);
      expect(result.nextCardEffects?.aoe).toBe(true);
    });

    it('chainBonus 효과', () => {
      const cooldowns: PathosCooldowns = {};
      const result = usePathos('chain_mastery', player, enemy, cooldowns);

      expect(result.success).toBe(true);
      expect(result.turnEffects?.chainBonus).toBe(50);
    });

    it('chainEvade 효과', () => {
      const cooldowns: PathosCooldowns = {};
      const result = usePathos('chain_evade', player, enemy, cooldowns);

      expect(result.success).toBe(true);
      expect(result.turnEffects?.chainEvade).toBe(true);
    });

    it('counterAttack 효과', () => {
      const cooldowns: PathosCooldowns = {};
      const result = usePathos('counter_stance', player, enemy, cooldowns);

      expect(result.success).toBe(true);
      expect(result.turnEffects?.counterAttack).toBe(30);
    });

    it('알 수 없는 효과 (default)', () => {
      const cooldowns: PathosCooldowns = {};
      const result = usePathos('unknown_action', player, enemy, cooldowns);

      expect(result.success).toBe(true);
      expect(result.logs[0]).toContain('발동!');
    });
  });

  describe('decreaseCooldowns', () => {
    it('모든 쿨다운을 1씩 감소시킨다', () => {
      const cooldowns: PathosCooldowns = {
        iron_bullet: 3,
        instant_reload: 2,
      };

      const updated = decreaseCooldowns(cooldowns);

      expect(updated.iron_bullet).toBe(2);
      expect(updated.instant_reload).toBe(1);
    });

    it('쿨다운이 1이면 삭제된다', () => {
      const cooldowns: PathosCooldowns = {
        iron_bullet: 1,
        instant_reload: 2,
      };

      const updated = decreaseCooldowns(cooldowns);

      expect(updated.iron_bullet).toBeUndefined();
      expect(updated.instant_reload).toBe(1);
    });

    it('빈 쿨다운 객체는 빈 객체를 반환한다', () => {
      const cooldowns: PathosCooldowns = {};

      const updated = decreaseCooldowns(cooldowns);

      expect(Object.keys(updated)).toHaveLength(0);
    });
  });

  describe('getPathosInfo', () => {
    it('존재하는 파토스 정보를 반환한다', () => {
      const info = getPathosInfo('iron_bullet');

      expect(info).not.toBeNull();
      expect(info?.name).toBe('철갑탄');
    });

    it('존재하지 않는 파토스는 null을 반환한다', () => {
      const info = getPathosInfo('invalid_pathos');

      expect(info).toBeNull();
    });
  });
});
