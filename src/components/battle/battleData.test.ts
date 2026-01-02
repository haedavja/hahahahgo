/**
 * @file battleData.test.ts
 * @description 전투 데이터 및 헬퍼 함수 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MAX_SPEED,
  DEFAULT_PLAYER_MAX_SPEED,
  DEFAULT_ENEMY_MAX_SPEED,
  BASE_PLAYER_ENERGY,
  MAX_SUBMIT_CARDS,
  ETHER_THRESHOLD,
  DEFAULT_DRAW_COUNT,
  DEFAULT_STARTING_DECK,
  generateSpeedTicks,
  TRAITS,
  CARDS,
  ENEMY_CARDS,
  ENEMIES,
  ENEMY_GROUPS,
  getEnemyGroup,
  getEnemiesByTier,
  getRandomEnemy,
  getRandomEnemyGroup,
  getRandomEnemyGroupByNode,
  getEnemyGroupDetails,
} from './battleData';

describe('battleData 상수', () => {
  describe('기본 상수 값', () => {
    it('MAX_SPEED가 30이다', () => {
      expect(MAX_SPEED).toBe(30);
    });

    it('DEFAULT_PLAYER_MAX_SPEED가 30이다', () => {
      expect(DEFAULT_PLAYER_MAX_SPEED).toBe(30);
    });

    it('DEFAULT_ENEMY_MAX_SPEED가 30이다', () => {
      expect(DEFAULT_ENEMY_MAX_SPEED).toBe(30);
    });

    it('BASE_PLAYER_ENERGY가 6이다', () => {
      expect(BASE_PLAYER_ENERGY).toBe(6);
    });

    it('MAX_SUBMIT_CARDS가 5이다', () => {
      expect(MAX_SUBMIT_CARDS).toBe(5);
    });

    it('ETHER_THRESHOLD가 100이다', () => {
      expect(ETHER_THRESHOLD).toBe(100);
    });

    it('DEFAULT_DRAW_COUNT가 5이다', () => {
      expect(DEFAULT_DRAW_COUNT).toBe(5);
    });
  });

  describe('DEFAULT_STARTING_DECK', () => {
    it('시작 덱이 10장이다', () => {
      expect(DEFAULT_STARTING_DECK).toHaveLength(10);
    });

    it('shoot이 2장 있다', () => {
      const shootCount = DEFAULT_STARTING_DECK.filter(c => c === 'shoot').length;
      expect(shootCount).toBe(2);
    });

    it('strike가 3장 있다', () => {
      const strikeCount = DEFAULT_STARTING_DECK.filter(c => c === 'strike').length;
      expect(strikeCount).toBe(3);
    });
  });
});

describe('generateSpeedTicks', () => {
  it('최대 속도에 맞는 틱 배열을 생성한다', () => {
    const ticks = generateSpeedTicks(30);
    expect(Array.isArray(ticks)).toBe(true);
    expect(ticks.length).toBeGreaterThan(0);
  });

  it('틱 값은 0부터 시작한다', () => {
    const ticks = generateSpeedTicks(30);
    expect(ticks[0]).toBe(0);
  });

  it('마지막 틱은 maxSpeed 이하이다', () => {
    const maxSpeed = 30;
    const ticks = generateSpeedTicks(maxSpeed);
    expect(ticks[ticks.length - 1]).toBeLessThanOrEqual(maxSpeed);
  });

  it('틱 배열은 오름차순이다', () => {
    const ticks = generateSpeedTicks(30);
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i]).toBeGreaterThan(ticks[i - 1]);
    }
  });
});

describe('TRAITS', () => {
  it('개성 객체가 정의되어 있다', () => {
    expect(TRAITS).toBeDefined();
    expect(typeof TRAITS).toBe('object');
  });

  it('각 개성에 id와 name이 있다', () => {
    Object.values(TRAITS).forEach((trait: any) => {
      expect(trait).toHaveProperty('id');
      expect(trait).toHaveProperty('name');
    });
  });
});

describe('CARDS', () => {
  it('카드 배열이 정의되어 있다', () => {
    expect(Array.isArray(CARDS)).toBe(true);
    expect(CARDS.length).toBeGreaterThan(0);
  });

  it('각 카드에 필수 속성이 있다', () => {
    CARDS.forEach((card) => {
      expect(card).toHaveProperty('id');
      expect(card).toHaveProperty('name');
      expect(card).toHaveProperty('type');
    });
  });

  it('카드 ID가 고유하다', () => {
    const ids = CARDS.map(c => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe('ENEMY_CARDS', () => {
  it('적 카드 배열이 정의되어 있다', () => {
    expect(Array.isArray(ENEMY_CARDS)).toBe(true);
    expect(ENEMY_CARDS.length).toBeGreaterThan(0);
  });

  it('각 적 카드에 필수 속성이 있다', () => {
    ENEMY_CARDS.forEach((card) => {
      expect(card).toHaveProperty('id');
      expect(card).toHaveProperty('name');
    });
  });
});

describe('ENEMIES', () => {
  it('적 배열이 정의되어 있다', () => {
    expect(Array.isArray(ENEMIES)).toBe(true);
    expect(ENEMIES.length).toBeGreaterThan(0);
  });

  it('각 적에 필수 속성이 있다', () => {
    ENEMIES.forEach((enemy) => {
      expect(enemy).toHaveProperty('id');
      expect(enemy).toHaveProperty('name');
      expect(enemy).toHaveProperty('hp');
      expect(enemy).toHaveProperty('tier');
    });
  });

  it('보스 적이 있다', () => {
    const bosses = ENEMIES.filter(e => e.isBoss);
    expect(bosses.length).toBeGreaterThan(0);
  });

  it('다양한 티어의 적이 있다', () => {
    const tiers = [...new Set(ENEMIES.map(e => e.tier))];
    expect(tiers.length).toBeGreaterThan(1);
  });
});

describe('ENEMY_GROUPS', () => {
  it('적 그룹 배열이 정의되어 있다', () => {
    expect(Array.isArray(ENEMY_GROUPS)).toBe(true);
    expect(ENEMY_GROUPS.length).toBeGreaterThan(0);
  });

  it('각 그룹에 필수 속성이 있다', () => {
    ENEMY_GROUPS.forEach((group) => {
      expect(group).toHaveProperty('id');
      expect(group).toHaveProperty('name');
      expect(group).toHaveProperty('tier');
      expect(group).toHaveProperty('enemies');
      expect(Array.isArray(group.enemies)).toBe(true);
    });
  });

  it('nodeRange가 있는 그룹이 있다', () => {
    const groupsWithRange = ENEMY_GROUPS.filter(g => g.nodeRange);
    expect(groupsWithRange.length).toBeGreaterThan(0);
  });
});

describe('getEnemyGroup', () => {
  it('존재하는 그룹 ID로 그룹을 가져온다', () => {
    const groupId = ENEMY_GROUPS[0].id;
    const result = getEnemyGroup(groupId);

    expect(result).not.toBeNull();
    expect(result?.name).toBeDefined();
    expect(result?.enemies).toBeDefined();
    expect(result?.enemyCount).toBeGreaterThanOrEqual(1);
    expect(result?.tier).toBeDefined();
  });

  it('존재하지 않는 그룹 ID는 null을 반환한다', () => {
    const result = getEnemyGroup('nonexistent_group');
    expect(result).toBeNull();
  });

  it('enemyCount가 enemies 배열 길이와 같다', () => {
    const groupId = ENEMY_GROUPS[0].id;
    const result = getEnemyGroup(groupId);

    expect(result?.enemyCount).toBe(result?.enemies.length);
  });

  it('보스 그룹의 isBoss가 true이다', () => {
    const bossGroup = ENEMY_GROUPS.find(g => g.isBoss);
    if (bossGroup) {
      const result = getEnemyGroup(bossGroup.id);
      expect(result?.isBoss).toBe(true);
    }
  });
});

describe('getEnemiesByTier', () => {
  it('티어 1 적을 가져온다', () => {
    const tier1Enemies = getEnemiesByTier(1);
    expect(Array.isArray(tier1Enemies)).toBe(true);
    expect(tier1Enemies.length).toBeGreaterThan(0);
    tier1Enemies.forEach(e => {
      expect(e.tier).toBe(1);
    });
  });

  it('티어 2 적을 가져온다', () => {
    const tier2Enemies = getEnemiesByTier(2);
    expect(Array.isArray(tier2Enemies)).toBe(true);
    tier2Enemies.forEach(e => {
      expect(e.tier).toBe(2);
    });
  });

  it('존재하지 않는 티어는 빈 배열을 반환한다', () => {
    const result = getEnemiesByTier(999);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});

describe('getRandomEnemy', () => {
  it('랜덤 적을 반환한다', () => {
    const enemy = getRandomEnemy(1);
    expect(enemy).toBeDefined();
    expect(enemy).toHaveProperty('id');
    expect(enemy).toHaveProperty('name');
    expect(enemy).toHaveProperty('hp');
  });

  it('기본값으로 티어 1 적을 반환한다', () => {
    const enemy = getRandomEnemy();
    expect(enemy).toBeDefined();
  });

  it('존재하지 않는 티어는 첫 번째 적을 반환한다', () => {
    const enemy = getRandomEnemy(999);
    expect(enemy).toBeDefined();
    expect(enemy).toBe(ENEMIES[0]);
  });
});

describe('getRandomEnemyGroup', () => {
  it('랜덤 적 그룹을 반환한다', () => {
    const group = getRandomEnemyGroup(1);
    expect(group).toBeDefined();
    expect(group).toHaveProperty('id');
    expect(group).toHaveProperty('name');
    expect(group).toHaveProperty('enemies');
  });

  it('기본값으로 티어 1 그룹을 반환한다', () => {
    const group = getRandomEnemyGroup();
    expect(group).toBeDefined();
  });

  it('존재하지 않는 티어는 첫 번째 그룹을 반환한다', () => {
    const group = getRandomEnemyGroup(999);
    expect(group).toBeDefined();
    expect(group).toBe(ENEMY_GROUPS[0]);
  });
});

describe('getRandomEnemyGroupByNode', () => {
  it('노드 1에서 적 그룹을 반환한다', () => {
    const group = getRandomEnemyGroupByNode(1);
    expect(group).toBeDefined();
    expect(group).toHaveProperty('id');
    expect(group).toHaveProperty('enemies');
  });

  it('기본값으로 노드 1 그룹을 반환한다', () => {
    const group = getRandomEnemyGroupByNode();
    expect(group).toBeDefined();
  });

  it('nodeRange 내의 노드에서 해당 그룹을 반환한다', () => {
    // nodeRange가 있는 그룹 찾기
    const groupWithRange = ENEMY_GROUPS.find(g => g.nodeRange);
    if (groupWithRange && groupWithRange.nodeRange) {
      const [min, max] = groupWithRange.nodeRange;
      const midNode = Math.floor((min + max) / 2);
      const group = getRandomEnemyGroupByNode(midNode);
      expect(group).toBeDefined();
    }
  });

  it('범위 밖의 노드는 티어 1 그룹을 반환한다', () => {
    const group = getRandomEnemyGroupByNode(9999);
    expect(group).toBeDefined();
    // 티어 1 그룹이거나 첫 번째 그룹
    expect(group.tier === 1 || group === ENEMY_GROUPS[0]).toBe(true);
  });
});

describe('getEnemyGroupDetails', () => {
  it('그룹의 상세 정보를 반환한다', () => {
    const groupId = ENEMY_GROUPS[0].id;
    const details = getEnemyGroupDetails(groupId);

    expect(details).not.toBeNull();
    expect(details?.id).toBe(groupId);
    expect(details?.enemies).toBeDefined();
    expect(Array.isArray(details?.enemies)).toBe(true);
  });

  it('enemies 배열에 적 상세 정보가 포함된다', () => {
    const groupId = ENEMY_GROUPS[0].id;
    const details = getEnemyGroupDetails(groupId);

    if (details && details.enemies.length > 0) {
      const firstEnemy = details.enemies[0];
      expect(firstEnemy).toHaveProperty('id');
      expect(firstEnemy).toHaveProperty('name');
      expect(firstEnemy).toHaveProperty('hp');
    }
  });

  it('존재하지 않는 그룹 ID는 null을 반환한다', () => {
    const result = getEnemyGroupDetails('nonexistent_group');
    expect(result).toBeNull();
  });

  it('그룹의 모든 속성이 포함된다', () => {
    const groupId = ENEMY_GROUPS[0].id;
    const details = getEnemyGroupDetails(groupId);

    expect(details).toHaveProperty('id');
    expect(details).toHaveProperty('name');
    expect(details).toHaveProperty('tier');
    expect(details).toHaveProperty('enemies');
  });
});
