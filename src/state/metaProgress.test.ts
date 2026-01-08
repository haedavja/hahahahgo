// @vitest-environment happy-dom
/**
 * @file metaProgress.test.ts
 * @description 메타 진행 시스템 테스트
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadMetaProgress,
  saveMetaProgress,
  updateStats,
  checkAchievements,
  purchaseUpgrade,
  onRunComplete,
  getRunBonuses,
  resetMetaProgress,
  ACHIEVEMENTS,
  PERMANENT_UPGRADES,
  type MetaProgress,
  type MetaStats,
} from './metaProgress';

// localStorage 모킹
let mockStorage: Record<string, string> = {};

const createMockLocalStorage = () => ({
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockStorage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStorage[key];
  }),
  clear: vi.fn(() => {
    mockStorage = {};
  }),
});

let mockLocalStorage = createMockLocalStorage();

Object.defineProperty(globalThis, 'localStorage', {
  get: () => mockLocalStorage,
  configurable: true,
});

describe('metaProgress', () => {
  beforeEach(() => {
    // 각 테스트 전 localStorage 완전 초기화
    mockStorage = {};
    mockLocalStorage = createMockLocalStorage();
    vi.clearAllMocks();
  });

  describe('ACHIEVEMENTS', () => {
    it('업적이 정의되어 있다', () => {
      expect(Object.keys(ACHIEVEMENTS).length).toBeGreaterThan(0);
    });

    it('모든 업적이 필수 속성을 가진다', () => {
      Object.values(ACHIEVEMENTS).forEach(achievement => {
        expect(achievement).toHaveProperty('id');
        expect(achievement).toHaveProperty('name');
        expect(achievement).toHaveProperty('description');
        expect(achievement).toHaveProperty('condition');
        expect(achievement).toHaveProperty('reward');
        expect(achievement).toHaveProperty('soulFragments');
        expect(typeof achievement.condition).toBe('function');
      });
    });

    it('first_clear 업적은 completedRuns >= 1 조건이다', () => {
      const stats: MetaStats = {
        totalRuns: 1,
        completedRuns: 1,
        totalKills: 0,
        totalDamageDealt: 0,
        dungeonClears: 0,
        secretRoomsFound: 0,
        bossKills: 0,
      };
      expect(ACHIEVEMENTS.first_clear.condition(stats)).toBe(true);
    });

    it('veteran 업적은 completedRuns >= 5 조건이다', () => {
      const stats: MetaStats = {
        totalRuns: 5,
        completedRuns: 5,
        totalKills: 0,
        totalDamageDealt: 0,
        dungeonClears: 0,
        secretRoomsFound: 0,
        bossKills: 0,
      };
      expect(ACHIEVEMENTS.veteran.condition(stats)).toBe(true);
    });

    it('slayer 업적은 totalKills >= 50 조건이다', () => {
      const stats: MetaStats = {
        totalRuns: 0,
        completedRuns: 0,
        totalKills: 50,
        totalDamageDealt: 0,
        dungeonClears: 0,
        secretRoomsFound: 0,
        bossKills: 0,
      };
      expect(ACHIEVEMENTS.slayer.condition(stats)).toBe(true);
    });
  });

  describe('PERMANENT_UPGRADES', () => {
    it('영구 업그레이드가 정의되어 있다', () => {
      expect(Object.keys(PERMANENT_UPGRADES).length).toBe(4);
    });

    it('모든 업그레이드가 필수 속성을 가진다', () => {
      Object.values(PERMANENT_UPGRADES).forEach(upgrade => {
        expect(upgrade).toHaveProperty('id');
        expect(upgrade).toHaveProperty('name');
        expect(upgrade).toHaveProperty('description');
        expect(upgrade).toHaveProperty('maxLevel');
        expect(upgrade).toHaveProperty('costPerLevel');
        expect(upgrade).toHaveProperty('effectPerLevel');
        expect(upgrade.costPerLevel.length).toBe(upgrade.maxLevel);
      });
    });
  });

  describe('loadMetaProgress', () => {
    it('저장된 데이터가 없으면 기본값을 반환한다', () => {
      const meta = loadMetaProgress();
      expect(meta.stats.totalRuns).toBe(0);
      expect(meta.stats.completedRuns).toBe(0);
      expect(meta.soulFragments).toBe(0);
    });

    it('저장된 데이터를 불러온다', () => {
      const savedData: Partial<MetaProgress> = {
        stats: {
          totalRuns: 10,
          completedRuns: 5,
          totalKills: 100,
          totalDamageDealt: 5000,
          dungeonClears: 3,
          secretRoomsFound: 2,
          bossKills: 4,
        },
        soulFragments: 50,
      };
      mockStorage['hahahahgo_meta_progress'] = JSON.stringify(savedData);

      const meta = loadMetaProgress();
      expect(meta.stats.totalRuns).toBe(10);
      expect(meta.stats.completedRuns).toBe(5);
      expect(meta.soulFragments).toBe(50);
    });

    it('잘못된 JSON이면 기본값을 반환한다', () => {
      mockStorage['hahahahgo_meta_progress'] = 'invalid json';

      const meta = loadMetaProgress();
      expect(meta.stats.totalRuns).toBe(0);
    });
  });

  describe('saveMetaProgress', () => {
    it('메타 진행 상황을 저장한다', () => {
      const meta: MetaProgress = {
        stats: {
          totalRuns: 5,
          completedRuns: 2,
          totalKills: 50,
          totalDamageDealt: 2000,
          dungeonClears: 1,
          secretRoomsFound: 1,
          bossKills: 1,
        },
        unlocks: {
          cards: ['basic_attack', 'basic_defense'],
          relics: [],
          characters: ['default'],
          difficulties: ['normal'],
        },
        achievements: {},
        permanentUpgrades: {
          startingGold: 0,
          startingHp: 0,
          etherBonus: 0,
          cardSlots: 0,
        },
        soulFragments: 20,
      };

      saveMetaProgress(meta);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'hahahahgo_meta_progress',
        expect.any(String)
      );
    });
  });

  describe('updateStats', () => {
    it('통계를 업데이트한다', () => {
      const before = loadMetaProgress();
      const beforeRuns = before.stats.totalRuns;
      const beforeKills = before.stats.totalKills;

      const meta = updateStats({ totalRuns: 1, totalKills: 5 });
      expect(meta.stats.totalRuns).toBe(beforeRuns + 1);
      expect(meta.stats.totalKills).toBe(beforeKills + 5);
    });

    it('기존 통계에 누적된다', () => {
      const before = loadMetaProgress();
      const beforeRuns = before.stats.totalRuns;
      const beforeKills = before.stats.totalKills;

      // 첫 번째 업데이트
      updateStats({ totalRuns: 1, totalKills: 5 });

      // 두 번째 업데이트
      const meta = updateStats({ totalRuns: 1, totalKills: 3 });
      expect(meta.stats.totalRuns).toBe(beforeRuns + 2);
      expect(meta.stats.totalKills).toBe(beforeKills + 8);
    });
  });

  describe('checkAchievements', () => {
    it('조건을 만족하는 업적을 해금한다', () => {
      const meta: MetaProgress = {
        stats: {
          totalRuns: 1,
          completedRuns: 1,
          totalKills: 0,
          totalDamageDealt: 0,
          dungeonClears: 0,
          secretRoomsFound: 0,
          bossKills: 0,
        },
        unlocks: {
          cards: ['basic_attack', 'basic_defense'],
          relics: [],
          characters: ['default'],
          difficulties: ['normal'],
        },
        achievements: {},
        permanentUpgrades: {
          startingGold: 0,
          startingHp: 0,
          etherBonus: 0,
          cardSlots: 0,
        },
        soulFragments: 0,
      };

      const newAchievements = checkAchievements(meta);
      expect(newAchievements.length).toBeGreaterThan(0);
      expect(meta.achievements['first_clear']).toBeDefined();
      expect(meta.soulFragments).toBeGreaterThan(0);
    });

    it('이미 해금된 업적은 중복 해금하지 않는다', () => {
      const meta: MetaProgress = {
        stats: {
          totalRuns: 1,
          completedRuns: 1,
          totalKills: 0,
          totalDamageDealt: 0,
          dungeonClears: 0,
          secretRoomsFound: 0,
          bossKills: 0,
        },
        unlocks: {
          cards: ['basic_attack', 'basic_defense'],
          relics: [],
          characters: ['default'],
          difficulties: ['normal'],
        },
        achievements: {
          first_clear: { unlockedAt: Date.now(), claimed: false },
        },
        permanentUpgrades: {
          startingGold: 0,
          startingHp: 0,
          etherBonus: 0,
          cardSlots: 0,
        },
        soulFragments: 10,
      };

      const newAchievements = checkAchievements(meta);
      const firstClearNew = newAchievements.find(a => a.id === 'first_clear');
      expect(firstClearNew).toBeUndefined();
      expect(meta.soulFragments).toBe(10);
    });
  });

  describe('purchaseUpgrade', () => {
    it('업그레이드를 구매한다', () => {
      // 충분한 소울 프래그먼트 설정
      const savedData = {
        stats: {
          totalRuns: 0,
          completedRuns: 0,
          totalKills: 0,
          totalDamageDealt: 0,
          dungeonClears: 0,
          secretRoomsFound: 0,
          bossKills: 0,
        },
        unlocks: {
          cards: ['basic_attack', 'basic_defense'],
          relics: [],
          characters: ['default'],
          difficulties: ['normal'],
        },
        achievements: {},
        permanentUpgrades: {
          startingGold: 0,
          startingHp: 0,
          etherBonus: 0,
          cardSlots: 0,
        },
        soulFragments: 100,
      };
      mockStorage['hahahahgo_meta_progress'] = JSON.stringify(savedData);

      const result = purchaseUpgrade('startingGold');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newLevel).toBe(1);
      }
    });

    it('소울 프래그먼트가 부족하면 실패한다', () => {
      const savedData = {
        soulFragments: 0,
        permanentUpgrades: {
          startingGold: 0,
          startingHp: 0,
          etherBonus: 0,
          cardSlots: 0,
        },
      };
      mockStorage['hahahahgo_meta_progress'] = JSON.stringify(savedData);

      const result = purchaseUpgrade('startingGold');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Not enough soul fragments');
      }
    });

    it('최대 레벨이면 실패한다', () => {
      const savedData = {
        soulFragments: 1000,
        permanentUpgrades: {
          startingGold: 5, // 최대 레벨
          startingHp: 0,
          etherBonus: 0,
          cardSlots: 0,
        },
      };
      mockStorage['hahahahgo_meta_progress'] = JSON.stringify(savedData);

      const result = purchaseUpgrade('startingGold');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Max level reached');
      }
    });
  });

  describe('onRunComplete', () => {
    it('런 완료 시 통계를 업데이트한다', () => {
      const before = loadMetaProgress();
      const beforeRuns = before.stats.totalRuns;
      const beforeCompleted = before.stats.completedRuns;
      const beforeKills = before.stats.totalKills;

      const meta = onRunComplete(true, { kills: 10, damage: 500 });
      expect(meta.stats.totalRuns).toBe(beforeRuns + 1);
      expect(meta.stats.completedRuns).toBe(beforeCompleted + 1);
      expect(meta.stats.totalKills).toBe(beforeKills + 10);
    });

    it('패배 시 completedRuns는 증가하지 않는다', () => {
      const before = loadMetaProgress();
      const beforeRuns = before.stats.totalRuns;
      const beforeCompleted = before.stats.completedRuns;

      const meta = onRunComplete(false, { kills: 5 });
      expect(meta.stats.totalRuns).toBe(beforeRuns + 1);
      expect(meta.stats.completedRuns).toBe(beforeCompleted);
    });
  });

  describe('getRunBonuses', () => {
    it('영구 업그레이드가 없으면 기본 보너스를 반환한다', () => {
      const bonuses = getRunBonuses();
      expect(bonuses.gold).toBe(0);
      expect(bonuses.hp).toBe(0);
      expect(bonuses.etherMultiplier).toBe(1);
      expect(bonuses.cardSlots).toBe(0);
    });

    it('영구 업그레이드에 따라 보너스가 계산된다', () => {
      const savedData = {
        permanentUpgrades: {
          startingGold: 2,
          startingHp: 1,
          etherBonus: 3,
          cardSlots: 1,
        },
      };
      mockStorage['hahahahgo_meta_progress'] = JSON.stringify(savedData);

      const bonuses = getRunBonuses();
      expect(bonuses.gold).toBe(20); // 2 * 10
      expect(bonuses.hp).toBe(5); // 1 * 5
      expect(bonuses.etherMultiplier).toBe(1.15); // 1 + (3 * 5) / 100
      expect(bonuses.cardSlots).toBe(1);
    });
  });

  describe('resetMetaProgress', () => {
    it('localStorage에서 데이터를 제거하고 기본값을 반환한다', () => {
      // 리셋 호출
      const meta = resetMetaProgress();

      // removeItem이 호출되었는지 확인
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('hahahahgo_meta_progress');

      // 기본 구조 확인
      expect(meta).toHaveProperty('stats');
      expect(meta).toHaveProperty('unlocks');
      expect(meta).toHaveProperty('achievements');
      expect(meta).toHaveProperty('permanentUpgrades');
      expect(meta).toHaveProperty('soulFragments');
    });

    it('리셋 후 기본 카드가 포함된다', () => {
      const meta = resetMetaProgress();
      expect(meta.unlocks.cards).toContain('basic_attack');
      expect(meta.unlocks.cards).toContain('basic_defense');
    });

    it('리셋 후 기본 캐릭터와 난이도가 포함된다', () => {
      const meta = resetMetaProgress();
      expect(meta.unlocks.characters).toContain('default');
      expect(meta.unlocks.difficulties).toContain('normal');
    });
  });
});
