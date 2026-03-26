/**
 * @file metaProgress.ts
 * @description 메타 진행 시스템
 *
 * ## 영구 저장 데이터
 * - 통계: 총 런, 클리어 횟수
 * - 업적: 해금된 업적
 * - 언락: 해금된 콘텐츠
 *
 * localStorage에 저장되어 게임 재시작 후에도 유지됨
 */

// ==================== 타입 정의 ====================

/** 통계 타입 */
export interface MetaStats {
  totalRuns: number;
  completedRuns: number;
  totalKills: number;
  totalDamageDealt: number;
  dungeonClears: number;
  secretRoomsFound: number;
  bossKills: number;
}

/** 언락 콘텐츠 타입 */
export interface MetaUnlocks {
  cards: string[];
  relics: string[];
  characters: string[];
  difficulties: string[];
}

/** 영구 업그레이드 레벨 타입 */
export interface PermanentUpgradeLevels {
  startingGold: number;
  startingHp: number;
  etherBonus: number;
  cardSlots: number;
}

/** 업적 상태 타입 */
export interface AchievementStatus {
  unlockedAt: number;
  claimed: boolean;
}

/** 메타 진행 상태 타입 */
export interface MetaProgress {
  stats: MetaStats;
  unlocks: MetaUnlocks;
  achievements: Record<string, AchievementStatus>;
  permanentUpgrades: PermanentUpgradeLevels;
  soulFragments: number;
}

/** 보상 타입 */
export interface AchievementReward {
  type: 'card' | 'relic' | 'character' | 'difficulty';
  id: string;
}

/** 업적 정의 타입 */
export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  condition: (stats: MetaStats) => boolean;
  reward: AchievementReward;
  soulFragments: number;
}

/** 영구 업그레이드 정의 타입 */
export interface PermanentUpgradeDefinition {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  costPerLevel: number[];
  effectPerLevel: number;
}

/** 런 통계 타입 */
export interface RunStats {
  kills?: number;
  damage?: number;
  dungeonClears?: number;
  secretRooms?: number;
  bossKills?: number;
}

/** 통계 업데이트 타입 */
export type StatsUpdate = Partial<MetaStats>;

/** 런 보너스 타입 */
export interface RunBonuses {
  gold: number;
  hp: number;
  etherMultiplier: number;
  cardSlots: number;
}

/** 업그레이드 구매 결과 타입 */
export type PurchaseResult =
  | { success: true; newLevel: number }
  | { success: false; error: string };

const META_STORAGE_KEY = 'hahahahgo_meta_progress';

// 기본 메타 진행 상태
const DEFAULT_META: MetaProgress = {
  // 통계
  stats: {
    totalRuns: 0,
    completedRuns: 0,
    totalKills: 0,
    totalDamageDealt: 0,
    dungeonClears: 0,
    secretRoomsFound: 0,
    bossKills: 0,
  },

  // 언락된 콘텐츠
  unlocks: {
    cards: ['basic_attack', 'basic_defense'],  // 기본 카드
    relics: [],
    characters: ['default'],
    difficulties: ['normal'],
  },

  // 업적
  achievements: {},

  // 영구 업그레이드 (획득한 "마력" 같은 영구 자원)
  permanentUpgrades: {
    startingGold: 0,      // 시작 골드 보너스
    startingHp: 0,        // 시작 HP 보너스
    etherBonus: 0,        // 에테르 획득 보너스 %
    cardSlots: 0,         // 추가 카드 슬롯
  },

  // 영구 자원
  soulFragments: 0,  // 영구 업그레이드 구매용 자원
};

// 업적 정의
export const ACHIEVEMENTS: Record<string, AchievementDefinition> = {
  // 런 완료 업적
  first_clear: {
    id: 'first_clear',
    name: '첫 번째 승리',
    description: '던전을 처음으로 클리어하세요',
    condition: (stats) => stats.completedRuns >= 1,
    reward: { type: 'card', id: 'power_strike' },
    soulFragments: 10,
  },

  veteran: {
    id: 'veteran',
    name: '베테랑 탐험가',
    description: '던전을 5번 클리어하세요',
    condition: (stats) => stats.completedRuns >= 5,
    reward: { type: 'relic', id: 'veterans_badge' },
    soulFragments: 25,
  },

  master: {
    id: 'master',
    name: '던전 마스터',
    description: '던전을 10번 클리어하세요',
    condition: (stats) => stats.completedRuns >= 10,
    reward: { type: 'difficulty', id: 'hard' },
    soulFragments: 50,
  },

  // 전투 업적
  slayer: {
    id: 'slayer',
    name: '학살자',
    description: '적을 50마리 처치하세요',
    condition: (stats) => stats.totalKills >= 50,
    reward: { type: 'card', id: 'berserker_rage' },
    soulFragments: 15,
  },

  boss_hunter: {
    id: 'boss_hunter',
    name: '보스 헌터',
    description: '보스를 3번 처치하세요',
    condition: (stats) => stats.bossKills >= 3,
    reward: { type: 'card', id: 'execute' },
    soulFragments: 30,
  },

  // 탐험 업적
  explorer: {
    id: 'explorer',
    name: '비밀 탐험가',
    description: '비밀 방을 5개 발견하세요',
    condition: (stats) => stats.secretRoomsFound >= 5,
    reward: { type: 'relic', id: 'treasure_map' },
    soulFragments: 20,
  },

  dungeon_crawler: {
    id: 'dungeon_crawler',
    name: '던전 크롤러',
    description: '10번의 런을 시작하세요',
    condition: (stats) => stats.totalRuns >= 10,
    reward: { type: 'card', id: 'quick_step' },
    soulFragments: 15,
  },
};

// 영구 업그레이드 정의
export const PERMANENT_UPGRADES: Record<keyof PermanentUpgradeLevels, PermanentUpgradeDefinition> = {
  startingGold: {
    id: 'startingGold',
    name: '축적된 부',
    description: '시작 골드 +10',
    maxLevel: 5,
    costPerLevel: [10, 20, 35, 50, 75],
    effectPerLevel: 10,
  },
  startingHp: {
    id: 'startingHp',
    name: '강인한 체질',
    description: '시작 HP +5',
    maxLevel: 5,
    costPerLevel: [15, 30, 50, 75, 100],
    effectPerLevel: 5,
  },
  etherBonus: {
    id: 'etherBonus',
    name: '에테르 친화',
    description: '에테르 획득량 +5%',
    maxLevel: 4,
    costPerLevel: [20, 40, 70, 100],
    effectPerLevel: 5,
  },
  cardSlots: {
    id: 'cardSlots',
    name: '확장된 손',
    description: '카드 슬롯 +1',
    maxLevel: 2,
    costPerLevel: [50, 100],
    effectPerLevel: 1,
  },
};

/**
 * localStorage에서 메타 진행 상황 불러오기
 */
export function loadMetaProgress(): MetaProgress {
  try {
    const saved = localStorage.getItem(META_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 기본값과 병합 (새로 추가된 필드 대응)
      return {
        stats: { ...DEFAULT_META.stats, ...parsed.stats },
        unlocks: {
          ...DEFAULT_META.unlocks,
          ...parsed.unlocks,
          cards: [...new Set([...DEFAULT_META.unlocks.cards, ...(parsed.unlocks?.cards || [])])],
        },
        achievements: { ...DEFAULT_META.achievements, ...parsed.achievements },
        permanentUpgrades: { ...DEFAULT_META.permanentUpgrades, ...parsed.permanentUpgrades },
        soulFragments: parsed.soulFragments ?? 0,
      };
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to load meta progress:', error);
    }
  }
  return { ...DEFAULT_META };
}

/**
 * 메타 진행 상황 저장
 */
export function saveMetaProgress(meta: MetaProgress): void {
  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to save meta progress:', error);
    }
  }
}

/**
 * 통계 업데이트
 */
export function updateStats(updates: StatsUpdate): MetaProgress {
  const meta = loadMetaProgress();
  Object.entries(updates).forEach(([key, value]) => {
    if (typeof value === 'number') {
      const statKey = key as keyof MetaStats;
      meta.stats[statKey] = (meta.stats[statKey] || 0) + value;
    }
  });

  // 업적 체크
  checkAchievements(meta);

  saveMetaProgress(meta);
  return meta;
}

/**
 * 업적 달성 체크
 */
export function checkAchievements(meta: MetaProgress): AchievementDefinition[] {
  const newAchievements: AchievementDefinition[] = [];

  Object.values(ACHIEVEMENTS).forEach(achievement => {
    if (!meta.achievements[achievement.id] && achievement.condition(meta.stats)) {
      meta.achievements[achievement.id] = {
        unlockedAt: Date.now(),
        claimed: false,
      };
      newAchievements.push(achievement);

      // 소울 프래그먼트 자동 지급
      meta.soulFragments += achievement.soulFragments || 0;

      // 보상 자동 언락
      if (achievement.reward) {
        applyReward(meta, achievement.reward);
      }
    }
  });

  if (newAchievements.length > 0) {
    saveMetaProgress(meta);
  }

  return newAchievements;
}

/**
 * 보상 적용
 */
function applyReward(meta: MetaProgress, reward: AchievementReward): void {
  switch (reward.type) {
    case 'card':
      if (!meta.unlocks.cards.includes(reward.id)) {
        meta.unlocks.cards.push(reward.id);
      }
      break;
    case 'relic':
      if (!meta.unlocks.relics.includes(reward.id)) {
        meta.unlocks.relics.push(reward.id);
      }
      break;
    case 'character':
      if (!meta.unlocks.characters.includes(reward.id)) {
        meta.unlocks.characters.push(reward.id);
      }
      break;
    case 'difficulty':
      if (!meta.unlocks.difficulties.includes(reward.id)) {
        meta.unlocks.difficulties.push(reward.id);
      }
      break;
  }
}

/**
 * 영구 업그레이드 구매
 */
export function purchaseUpgrade(upgradeId: keyof PermanentUpgradeLevels): PurchaseResult {
  const meta = loadMetaProgress();
  const upgrade = PERMANENT_UPGRADES[upgradeId];

  if (!upgrade) return { success: false, error: 'Invalid upgrade' };

  const currentLevel = meta.permanentUpgrades[upgradeId];
  if (currentLevel >= upgrade.maxLevel) {
    return { success: false, error: 'Max level reached' };
  }

  const cost = upgrade.costPerLevel[currentLevel];
  if (meta.soulFragments < cost) {
    return { success: false, error: 'Not enough soul fragments' };
  }

  meta.soulFragments -= cost;
  meta.permanentUpgrades[upgradeId] = currentLevel + 1;

  saveMetaProgress(meta);
  return { success: true, newLevel: currentLevel + 1 };
}

/**
 * 런 완료 시 호출
 */
export function onRunComplete(isVictory: boolean, runStats: RunStats = {}): MetaProgress {
  return updateStats({
    totalRuns: 1,
    completedRuns: isVictory ? 1 : 0,
    totalKills: runStats.kills || 0,
    totalDamageDealt: runStats.damage || 0,
    dungeonClears: runStats.dungeonClears || 0,
    secretRoomsFound: runStats.secretRooms || 0,
    bossKills: runStats.bossKills || 0,
  });
}

/**
 * 런 시작 시 적용할 보너스 계산
 */
export function getRunBonuses(): RunBonuses {
  const meta = loadMetaProgress();
  const bonuses: RunBonuses = {
    gold: 0,
    hp: 0,
    etherMultiplier: 1,
    cardSlots: 0,
  };

  Object.entries(meta.permanentUpgrades).forEach(([id, level]) => {
    const upgradeId = id as keyof PermanentUpgradeLevels;
    const upgrade = PERMANENT_UPGRADES[upgradeId];
    if (upgrade && level > 0) {
      const totalEffect = upgrade.effectPerLevel * level;
      switch (id) {
        case 'startingGold':
          bonuses.gold += totalEffect;
          break;
        case 'startingHp':
          bonuses.hp += totalEffect;
          break;
        case 'etherBonus':
          bonuses.etherMultiplier += totalEffect / 100;
          break;
        case 'cardSlots':
          bonuses.cardSlots += totalEffect;
          break;
      }
    }
  });

  return bonuses;
}

/**
 * 메타 진행 상황 리셋 (디버그용)
 */
export function resetMetaProgress(): MetaProgress {
  localStorage.removeItem(META_STORAGE_KEY);
  return { ...DEFAULT_META };
}
