/**
 * @file pathosEffects.test.ts
 * @description 파토스 (액티브 스킬) 효과 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  canUsePathos,
  decreaseCooldowns,
  getPathosInfo,
  type PathosCooldowns,
} from './pathosEffects';
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

// Mock PATHOS data
vi.mock('../data/growth/pathosData', () => ({
  PATHOS: {
    test_pathos: {
      id: 'test_pathos',
      name: '테스트 파토스',
      description: '테스트용 파토스',
      cooldown: 3,
      identity: 'common',
      effect: {
        action: 'addToken',
        token: 'strength',
        value: 2,
      },
    },
    reload_pathos: {
      id: 'reload_pathos',
      name: '즉시 장전',
      description: '즉시 장전',
      cooldown: 5,
      identity: 'gunslinger',
      effect: {
        action: 'reload',
      },
    },
    gun_melee: {
      id: 'gun_melee',
      name: '총검술',
      description: '총격 시 추가 타격',
      cooldown: 2,
      identity: 'gunslinger',
      effect: {
        action: 'gunToMelee',
      },
    },
  },
}));

let mockGrowth: GrowthState;

describe('pathosEffects', () => {
  beforeEach(() => {
    mockGrowth = {
      ...initialGrowthState,
      equippedPathos: ['test_pathos', 'reload_pathos'],
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('canUsePathos', () => {
    it('장착된 파토스는 사용 가능하다', () => {
      const cooldowns: PathosCooldowns = {};

      expect(canUsePathos('test_pathos', cooldowns)).toBe(true);
    });

    it('장착되지 않은 파토스는 사용 불가능하다', () => {
      const cooldowns: PathosCooldowns = {};

      expect(canUsePathos('gun_melee', cooldowns)).toBe(false);
    });

    it('쿨다운 중인 파토스는 사용 불가능하다', () => {
      const cooldowns: PathosCooldowns = {
        test_pathos: 2,
      };

      expect(canUsePathos('test_pathos', cooldowns)).toBe(false);
    });

    it('쿨다운이 0인 파토스는 사용 가능하다', () => {
      const cooldowns: PathosCooldowns = {
        test_pathos: 0,
      };

      expect(canUsePathos('test_pathos', cooldowns)).toBe(true);
    });
  });

  describe('decreaseCooldowns', () => {
    it('쿨다운을 1 감소시킨다', () => {
      const cooldowns: PathosCooldowns = {
        test_pathos: 3,
        reload_pathos: 5,
      };

      const updated = decreaseCooldowns(cooldowns);

      expect(updated.test_pathos).toBe(2);
      expect(updated.reload_pathos).toBe(4);
    });

    it('쿨다운이 1이면 목록에서 제거한다', () => {
      const cooldowns: PathosCooldowns = {
        test_pathos: 1,
        reload_pathos: 2,
      };

      const updated = decreaseCooldowns(cooldowns);

      expect(updated.test_pathos).toBeUndefined();
      expect(updated.reload_pathos).toBe(1);
    });

    it('빈 쿨다운 객체를 처리한다', () => {
      const cooldowns: PathosCooldowns = {};

      const updated = decreaseCooldowns(cooldowns);

      expect(Object.keys(updated).length).toBe(0);
    });
  });

  describe('getPathosInfo', () => {
    it('존재하는 파토스 정보를 반환한다', () => {
      const info = getPathosInfo('test_pathos');

      expect(info).not.toBeNull();
      expect(info?.id).toBe('test_pathos');
      expect(info?.name).toBe('테스트 파토스');
      expect(info?.cooldown).toBe(3);
    });

    it('존재하지 않는 파토스는 null을 반환한다', () => {
      const info = getPathosInfo('nonexistent');

      expect(info).toBeNull();
    });
  });
});
