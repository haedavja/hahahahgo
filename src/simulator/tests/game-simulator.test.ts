/**
 * @file game-simulator.test.ts
 * @description 전체 게임 시뮬레이터 통합 테스트
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  EventSimulator,
  ShopSimulator,
  RestSimulator,
  DungeonSimulator,
  MapSimulator,
  RunSimulator,
  GameSimulator,
  createDefaultPlayer,
} from '../game';

// ==================== 이벤트 시뮬레이터 테스트 ====================

describe('EventSimulator', () => {
  const mockEvents = {
    'test-event': {
      id: 'test-event',
      title: '테스트 이벤트',
      description: '테스트용 이벤트입니다.',
      difficulty: 'easy' as const,
      choices: [
        { id: 'choice1', label: '선택 1', rewards: { gold: 50 } },
        { id: 'choice2', label: '선택 2', cost: { gold: 30 }, rewards: { intel: 40 } },
        { id: 'choice3', label: '통찰 체크', statRequirement: { insight: 3 }, rewards: { gold: 100 } },
      ],
    },
  };

  it('이벤트를 로드하고 조회할 수 있다', () => {
    const simulator = new EventSimulator(mockEvents);

    expect(simulator.getEvent('test-event')).not.toBeNull();
    expect(simulator.getAllEvents()).toHaveLength(1);
  });

  it('선택지 선택 가능 여부를 확인할 수 있다', () => {
    const simulator = new EventSimulator(mockEvents);
    const resources = { gold: 50, intel: 0, material: 0, loot: 0, grace: 0, hp: 80, maxHp: 80 };
    const stats = { strength: 1, agility: 1, insight: 2 };

    const choice1 = mockEvents['test-event'].choices[0];
    const choice2 = mockEvents['test-event'].choices[1];
    const choice3 = mockEvents['test-event'].choices[2];

    expect(simulator.canSelectChoice(choice1, resources, stats).canSelect).toBe(true);
    expect(simulator.canSelectChoice(choice2, resources, stats).canSelect).toBe(true);
    expect(simulator.canSelectChoice(choice3, resources, stats).canSelect).toBe(false); // 통찰 부족
  });

  it('이벤트를 시뮬레이션할 수 있다', () => {
    const simulator = new EventSimulator(mockEvents);

    const result = simulator.simulateEvent('test-event', {
      resources: { gold: 100, intel: 0, material: 0, loot: 0, grace: 0, hp: 80, maxHp: 80 },
      stats: { strength: 1, agility: 1, insight: 1 },
      strategy: 'greedy',
    });

    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
  });

  it('선택지 가치를 계산할 수 있다', () => {
    const simulator = new EventSimulator(mockEvents);
    const choice = mockEvents['test-event'].choices[0];

    const value = simulator.calculateChoiceValue(choice);
    expect(value).toBe(50); // gold 50
  });
});

// ==================== 상점 시뮬레이터 테스트 ====================

describe('ShopSimulator', () => {
  let simulator: ShopSimulator;

  beforeAll(() => {
    simulator = new ShopSimulator();
    simulator.loadCardData({
      'strike': { id: 'strike', rarity: 'common' },
      'defend': { id: 'defend', rarity: 'common' },
      'power_card': { id: 'power_card', rarity: 'rare' },
    });
    simulator.loadRelicData({
      'relic1': { id: 'relic1', rarity: 'common' },
      'relic2': { id: 'relic2', rarity: 'rare' },
    });
  });

  it('상점 인벤토리를 생성할 수 있다', () => {
    const inventory = simulator.generateShopInventory('shop');

    expect(inventory.merchantType).toBe('shop');
    expect(inventory.cards.length).toBeGreaterThanOrEqual(0);
    expect(inventory.relics.length).toBeGreaterThanOrEqual(0);
    expect(inventory.services.length).toBeGreaterThan(0);
  });

  it('상점 방문을 시뮬레이션할 수 있다', () => {
    const inventory = simulator.generateShopInventory('shop');

    const result = simulator.simulateShopVisit(inventory, {
      player: {
        gold: 200,
        hp: 80,
        maxHp: 80,
        deck: ['strike', 'defend'],
        relics: [],
        items: [],
      },
      strategy: 'value',
    });

    expect(result.merchantType).toBe('shop');
    expect(result.remainingGold).toBeLessThanOrEqual(200);
    expect(result.finalPlayerState).toBeDefined();
  });

  it('상점을 분석할 수 있다', () => {
    const inventory = simulator.generateShopInventory('shop');
    const analysis = simulator.analyzeShop(inventory, 100);

    expect(analysis.totalValue).toBeGreaterThan(0);
    expect(analysis.affordableItems).toBeDefined();
    expect(analysis.recommendedPurchases).toBeDefined();
  });
});

// ==================== 휴식 시뮬레이터 테스트 ====================

describe('RestSimulator', () => {
  const simulator = new RestSimulator();

  it('가능한 행동을 조회할 수 있다', () => {
    const actions = simulator.getAvailableActions(
      { hp: 50, maxHp: 80, deck: ['a', 'b', 'c'], relics: [], gold: 100, strength: 1, agility: 1, insight: 1 },
      { healAmount: 0.3, canUpgrade: true, canRemove: true, canSmith: false, canMeditate: false, canScout: false }
    );

    expect(actions.length).toBeGreaterThan(0);
    expect(actions.some(a => a.id === 'heal')).toBe(true);
    expect(actions.some(a => a.id === 'upgrade')).toBe(true);
  });

  it('휴식을 시뮬레이션할 수 있다', () => {
    // 체력이 30% 이하일 때 heal_priority 전략은 힐을 선택
    const result = simulator.simulateRest({
      player: { hp: 20, maxHp: 80, deck: ['a', 'b', 'c'], relics: [], gold: 100, strength: 1, agility: 1, insight: 1 },
      nodeConfig: { healAmount: 0.3, canUpgrade: true, canRemove: true, canSmith: false, canMeditate: false, canScout: false },
      strategy: 'heal_priority',
    });

    expect(result.actionTaken).toBe('heal');
    expect(result.hpChange).toBeGreaterThan(0);
    expect(result.finalPlayerState.hp).toBeGreaterThan(20);
  });

  it('체력이 충분할 때 업그레이드를 선택한다', () => {
    const result = simulator.simulateRest({
      player: { hp: 75, maxHp: 80, deck: ['a', 'b', 'c'], relics: [], gold: 100, strength: 1, agility: 1, insight: 1 },
      nodeConfig: { healAmount: 0.3, canUpgrade: true, canRemove: true, canSmith: false, canMeditate: false, canScout: false },
      strategy: 'balanced',
    });

    expect(result.actionTaken).toBe('upgrade');
  });
});

// ==================== 던전 시뮬레이터 테스트 ====================

describe('DungeonSimulator', () => {
  const simulator = new DungeonSimulator();

  it('던전을 생성할 수 있다', () => {
    const dungeon = simulator.generateDungeon({ mainPathLength: 5 });

    expect(dungeon.id).toBeDefined();
    expect(dungeon.nodes.length).toBeGreaterThan(0);
    expect(dungeon.nodes.some(n => n.type === 'entrance')).toBe(true);
    expect(dungeon.nodes.some(n => n.type === 'exit')).toBe(true);
  });

  it('던전 탐험을 시뮬레이션할 수 있다', () => {
    const dungeon = simulator.generateDungeon({ mainPathLength: 5, combatRooms: 2 });

    const result = simulator.simulateDungeonExploration(dungeon, {
      player: {
        hp: 80, maxHp: 80, gold: 50, intel: 0, material: 0, loot: 0,
        strength: 5, agility: 3, insight: 2, items: [], deck: ['a', 'b', 'c'], relics: []
      },
      strategy: 'explore_all',
    });

    expect(result.dungeonId).toBe(dungeon.id);
    expect(result.nodesVisited).toBeGreaterThan(0);
    expect(result.path.length).toBeGreaterThan(0);
  });

  it('던전을 분석할 수 있다', () => {
    const dungeon = simulator.generateDungeon({ mainPathLength: 5 });
    const analysis = simulator.analyzeDungeon(dungeon);

    expect(analysis.dungeonId).toBe(dungeon.id);
    expect(analysis.optimalPath.length).toBeGreaterThan(0);
    expect(['low', 'medium', 'high']).toContain(analysis.riskLevel);
  });
});

// ==================== 맵 시뮬레이터 테스트 ====================

describe('MapSimulator', () => {
  const simulator = new MapSimulator();

  it('맵을 생성할 수 있다', () => {
    const map = simulator.generateMap({ layers: 11 });

    expect(map.nodes.length).toBeGreaterThan(0);
    expect(map.currentNodeId).toBeDefined();
    expect(map.nodes.some(n => n.type === 'boss')).toBe(true);
  });

  it('맵 진행을 시뮬레이션할 수 있다', () => {
    const map = simulator.generateMap({ layers: 5 });

    const result = simulator.simulateMapProgression(map, {
      strategy: 'combat_focus',
    });

    expect(result.path.length).toBeGreaterThan(0);
    expect(result.nodeTypes.length).toBe(result.path.length);
    expect(result.estimatedDifficulty).toBeGreaterThan(0);
  });

  it('맵을 분석할 수 있다', () => {
    const map = simulator.generateMap({ layers: 11 });
    const analysis = simulator.analyzeMap(map);

    expect(analysis.totalNodes).toBeGreaterThan(0);
    expect(analysis.avgConnectionsPerNode).toBeGreaterThan(0);
    expect(analysis.difficultyProgression.length).toBeGreaterThan(0);
  });

  it('모든 경로를 찾을 수 있다', () => {
    const map = simulator.generateMap({ layers: 3 });
    const paths = simulator.findAllPaths(map);

    expect(paths.length).toBeGreaterThan(0);
    paths.forEach(path => {
      expect(path.length).toBeGreaterThan(0);
    });
  });

  it('최적 경로를 찾을 수 있다', () => {
    const map = simulator.generateMap({ layers: 5 });

    const result = simulator.findOptimalPath(map, {
      shopWeight: 30,
      restWeight: 20,
      eventWeight: 10,
      avoidElites: true,
    });

    expect(result.path.length).toBeGreaterThan(0);
  });
});

// ==================== 런 시뮬레이터 테스트 ====================

describe('RunSimulator', () => {
  it('런을 시뮬레이션할 수 있다', () => {
    const simulator = new RunSimulator();

    const result = simulator.simulateRun({
      initialPlayer: createDefaultPlayer(),
      difficulty: 1,
      strategy: 'balanced',
      mapLayers: 5, // 짧은 맵으로 테스트
    });

    expect(result).toBeDefined();
    expect(result.nodesVisited).toBeGreaterThan(0);
    expect(result.finalPlayerState).toBeDefined();
    expect(result.nodeResults.length).toBeGreaterThan(0);
  });

  it('다중 런 통계를 생성할 수 있다', () => {
    const simulator = new RunSimulator();

    const stats = simulator.simulateMultipleRuns({
      initialPlayer: createDefaultPlayer(),
      difficulty: 1,
      strategy: 'balanced',
      mapLayers: 5,
    }, 10);

    expect(stats.totalRuns).toBe(10);
    expect(stats.successRate).toBeGreaterThanOrEqual(0);
    expect(stats.successRate).toBeLessThanOrEqual(1);
    expect(stats.avgFinalLayer).toBeGreaterThan(0);
  });

  it('기본 플레이어를 생성할 수 있다', () => {
    const player = createDefaultPlayer();

    expect(player.hp).toBe(80);
    expect(player.maxHp).toBe(80);
    expect(player.gold).toBe(100);
    expect(player.deck.length).toBe(5);
  });
});

// ==================== 통합 게임 시뮬레이터 테스트 ====================

describe('GameSimulator', () => {
  it('게임 시뮬레이터를 생성하고 실행할 수 있다', async () => {
    const simulator = new GameSimulator();

    const result = simulator.simulateRun({
      difficulty: 1,
      mapLayers: 5,
    });

    expect(result).toBeDefined();
    expect(result.nodesVisited).toBeGreaterThan(0);
  });

  it('다중 런 시뮬레이션을 실행할 수 있다', () => {
    const simulator = new GameSimulator();

    const stats = simulator.simulateMultipleRuns(5, {
      difficulty: 1,
      mapLayers: 5,
    });

    expect(stats.totalRuns).toBe(5);
    expect(stats.avgFinalLayer).toBeGreaterThan(0);
  });

  it('밸런스 테스트를 실행할 수 있다', () => {
    const simulator = new GameSimulator();

    const results = simulator.runBalanceTest({
      runs: 5,
      difficulties: [1, 2],
    });

    expect(results[1]).toBeDefined();
    expect(results[2]).toBeDefined();
    expect(results[1].totalRuns).toBe(5);
    expect(results[2].totalRuns).toBe(5);
  });
});

// ==================== 성능 테스트 ====================

describe('Performance', () => {
  it('100회 런 시뮬레이션이 10초 이내에 완료된다', () => {
    const simulator = new RunSimulator();
    const startTime = Date.now();

    simulator.simulateMultipleRuns({
      initialPlayer: createDefaultPlayer(),
      difficulty: 1,
      strategy: 'balanced',
      mapLayers: 5,
    }, 100);

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(10000);
  });
});
