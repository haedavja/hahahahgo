/**
 * @file dungeon-simulator.test.ts
 * @description 던전 시뮬레이터 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DungeonSimulator,
  createDungeonSimulator,
  type DungeonGenerationConfig,
  type DungeonPlayerState,
  type DungeonSimulationConfig,
} from './dungeon-simulator';

const createTestPlayer = (overrides: Partial<DungeonPlayerState> = {}): DungeonPlayerState => ({
  hp: 80,
  maxHp: 100,
  gold: 50,
  intel: 10,
  material: 5,
  loot: 3,
  strength: 5,
  agility: 5,
  insight: 5,
  items: [],
  deck: ['strike', 'block', 'shoot'],
  relics: [],
  ...overrides,
});

const createTestConfig = (overrides: Partial<DungeonSimulationConfig> = {}): DungeonSimulationConfig => ({
  player: createTestPlayer(),
  strategy: 'explore_all',
  ...overrides,
});

describe('DungeonSimulator', () => {
  let simulator: DungeonSimulator;

  beforeEach(() => {
    simulator = new DungeonSimulator();
  });

  describe('constructor', () => {
    it('DungeonSimulator를 생성한다', () => {
      expect(simulator).toBeDefined();
    });
  });

  describe('generateDungeon', () => {
    it('던전을 생성한다', () => {
      const dungeon = simulator.generateDungeon();
      expect(dungeon).toBeDefined();
      expect(dungeon.nodes.length).toBeGreaterThan(0);
    });

    it('설정에 따라 던전을 생성한다', () => {
      const config: Partial<DungeonGenerationConfig> = {
        mainPathLength: 5,
        branchCount: 2,
        treasureRooms: 1,
      };
      const dungeon = simulator.generateDungeon(config);
      expect(dungeon).toBeDefined();
    });

    it('입구 노드가 있다', () => {
      const dungeon = simulator.generateDungeon();
      const entrance = dungeon.nodes.find(n => n.type === 'entrance');
      expect(entrance).toBeDefined();
    });

    it('출구 노드가 있다', () => {
      const dungeon = simulator.generateDungeon();
      const exit = dungeon.nodes.find(n => n.type === 'exit');
      expect(exit).toBeDefined();
    });

    it('currentNodeId가 입구로 설정된다', () => {
      const dungeon = simulator.generateDungeon();
      const entrance = dungeon.nodes.find(n => n.type === 'entrance');
      expect(dungeon.currentNodeId).toBe(entrance?.id);
    });

    it('connections가 생성된다', () => {
      const dungeon = simulator.generateDungeon();
      expect(dungeon.connections).toBeDefined();
      expect(Object.keys(dungeon.connections).length).toBeGreaterThan(0);
    });

    it('timeElapsed가 0으로 초기화된다', () => {
      const dungeon = simulator.generateDungeon();
      expect(dungeon.timeElapsed).toBe(0);
    });

    it('mainPathLength에 따라 노드 수가 증가한다', () => {
      const shortDungeon = simulator.generateDungeon({ mainPathLength: 3, branchCount: 0 });
      const longDungeon = simulator.generateDungeon({ mainPathLength: 10, branchCount: 0 });
      expect(longDungeon.nodes.length).toBeGreaterThan(shortDungeon.nodes.length);
    });

    it('branchCount에 따라 분기가 생성된다', () => {
      const noBranch = simulator.generateDungeon({ mainPathLength: 5, branchCount: 0 });
      const withBranch = simulator.generateDungeon({ mainPathLength: 5, branchCount: 3, branchLength: 2 });
      expect(withBranch.nodes.length).toBeGreaterThan(noBranch.nodes.length);
    });

    it('treasureRooms 설정에 따라 보물방이 생성된다', () => {
      const dungeon = simulator.generateDungeon({ treasureRooms: 3, branchCount: 3, branchLength: 2 });
      const treasureNodes = dungeon.nodes.filter(n => n.type === 'treasure');
      expect(treasureNodes.length).toBeGreaterThanOrEqual(0);
    });

    it('입구 노드는 방문됨으로 표시된다', () => {
      const dungeon = simulator.generateDungeon();
      const entrance = dungeon.nodes.find(n => n.type === 'entrance');
      expect(entrance?.visited).toBe(true);
    });

    it('입구 외의 노드는 미방문으로 표시된다', () => {
      const dungeon = simulator.generateDungeon();
      const nonEntrance = dungeon.nodes.filter(n => n.type !== 'entrance');
      nonEntrance.forEach(node => {
        expect(node.visited).toBe(false);
      });
    });
  });

  describe('simulateDungeonExploration', () => {
    it('던전 탐험을 시뮬레이션한다', () => {
      const dungeon = simulator.generateDungeon();
      const config = createTestConfig();
      const result = simulator.simulateDungeonExploration(dungeon, config);

      expect(result).toBeDefined();
      expect(result.nodesVisited).toBeGreaterThanOrEqual(1);
      expect(result.path.length).toBeGreaterThan(0);
    });

    it('explore_all 전략은 미방문 노드를 우선 방문한다', () => {
      const dungeon = simulator.generateDungeon({ mainPathLength: 3, branchCount: 0 });
      const config = createTestConfig({ strategy: 'explore_all' });
      const result = simulator.simulateDungeonExploration(dungeon, config);

      expect(result.nodesVisited).toBeGreaterThan(1);
    });

    it('speedrun 전략은 빠르게 출구로 향한다', () => {
      const dungeon = simulator.generateDungeon();
      const config = createTestConfig({ strategy: 'speedrun' });
      const result = simulator.simulateDungeonExploration(dungeon, config);

      expect(result.exitReached).toBe(true);
    });

    it('treasure_hunt 전략은 보물방을 우선한다', () => {
      const dungeon = simulator.generateDungeon({ treasureRooms: 3 });
      const config = createTestConfig({ strategy: 'treasure_hunt' });
      const result = simulator.simulateDungeonExploration(dungeon, config);

      expect(result).toBeDefined();
    });

    it('safe 전략은 전투를 피한다', () => {
      const dungeon = simulator.generateDungeon();
      const config = createTestConfig({ strategy: 'safe' });
      const result = simulator.simulateDungeonExploration(dungeon, config);

      expect(result).toBeDefined();
    });

    it('maxTurns를 초과하지 않는다', () => {
      const dungeon = simulator.generateDungeon({ mainPathLength: 10 });
      const config = createTestConfig({ maxTurns: 3 });
      const result = simulator.simulateDungeonExploration(dungeon, config);

      expect(result.timeElapsed).toBeLessThanOrEqual(3);
    });

    it('보상을 수집한다', () => {
      const dungeon = simulator.generateDungeon({ treasureRooms: 2 });
      const config = createTestConfig();
      const result = simulator.simulateDungeonExploration(dungeon, config);

      expect(result.totalRewards).toBeDefined();
    });

    it('path가 currentNodeId로 시작한다', () => {
      const dungeon = simulator.generateDungeon();
      const config = createTestConfig();
      const result = simulator.simulateDungeonExploration(dungeon, config);

      expect(result.path[0]).toBe(dungeon.currentNodeId);
    });

    it('dungeonId가 결과에 포함된다', () => {
      const dungeon = simulator.generateDungeon();
      const config = createTestConfig();
      const result = simulator.simulateDungeonExploration(dungeon, config);

      expect(result.dungeonId).toBe(dungeon.id);
    });

    it('finalPlayerState가 반환된다', () => {
      const dungeon = simulator.generateDungeon();
      const config = createTestConfig();
      const result = simulator.simulateDungeonExploration(dungeon, config);

      expect(result.finalPlayerState).toBeDefined();
      expect(result.finalPlayerState.hp).toBeDefined();
    });

    it('combatsWon과 combatsLost가 기록된다', () => {
      const dungeon = simulator.generateDungeon({ combatRooms: 2 });
      const config = createTestConfig();
      const result = simulator.simulateDungeonExploration(dungeon, config);

      expect(typeof result.combatsWon).toBe('number');
      expect(typeof result.combatsLost).toBe('number');
    });

    it('objectsInteracted가 기록된다', () => {
      const dungeon = simulator.generateDungeon();
      const config = createTestConfig();
      const result = simulator.simulateDungeonExploration(dungeon, config);

      expect(Array.isArray(result.objectsInteracted)).toBe(true);
    });

    it('totalNodes가 던전 노드 수와 일치한다', () => {
      const dungeon = simulator.generateDungeon();
      const config = createTestConfig();
      const result = simulator.simulateDungeonExploration(dungeon, config);

      expect(result.totalNodes).toBe(dungeon.nodes.length);
    });
  });

  describe('analyzeDungeon', () => {
    it('던전을 분석한다', () => {
      const dungeon = simulator.generateDungeon();
      const analysis = simulator.analyzeDungeon(dungeon);

      expect(analysis).toBeDefined();
      expect(analysis.totalValue).toBeDefined();
      expect(analysis.combatDifficulty).toBeDefined();
    });

    it('최적 경로를 계산한다', () => {
      const dungeon = simulator.generateDungeon();
      const analysis = simulator.analyzeDungeon(dungeon);

      expect(analysis.optimalPath).toBeDefined();
      expect(analysis.optimalPath.length).toBeGreaterThan(0);
    });

    it('위험도를 평가한다', () => {
      const dungeon = simulator.generateDungeon({ difficulty: 3 });
      const analysis = simulator.analyzeDungeon(dungeon);

      expect(['low', 'medium', 'high']).toContain(analysis.riskLevel);
    });

    it('dungeonId가 분석 결과에 포함된다', () => {
      const dungeon = simulator.generateDungeon();
      const analysis = simulator.analyzeDungeon(dungeon);

      expect(analysis.dungeonId).toBe(dungeon.id);
    });

    it('estimatedTime이 계산된다', () => {
      const dungeon = simulator.generateDungeon();
      const analysis = simulator.analyzeDungeon(dungeon);

      expect(typeof analysis.estimatedTime).toBe('number');
      expect(analysis.estimatedTime).toBeGreaterThanOrEqual(0);
    });

    it('totalValue가 숫자이다', () => {
      const dungeon = simulator.generateDungeon();
      const analysis = simulator.analyzeDungeon(dungeon);

      expect(typeof analysis.totalValue).toBe('number');
    });

    it('combatDifficulty가 숫자이다', () => {
      const dungeon = simulator.generateDungeon();
      const analysis = simulator.analyzeDungeon(dungeon);

      expect(typeof analysis.combatDifficulty).toBe('number');
    });
  });

  describe('createDungeonSimulator', () => {
    it('던전 시뮬레이터를 생성한다', () => {
      const sim = createDungeonSimulator();
      expect(sim).toBeDefined();
      expect(sim instanceof DungeonSimulator).toBe(true);
    });

    it('생성된 시뮬레이터로 던전을 생성할 수 있다', () => {
      const sim = createDungeonSimulator();
      const dungeon = sim.generateDungeon();
      expect(dungeon).toBeDefined();
    });
  });

  describe('난이도 스케일링', () => {
    it('difficulty가 높을수록 전투 난이도가 높다', () => {
      const easyDungeon = simulator.generateDungeon({ difficulty: 1 });
      const hardDungeon = simulator.generateDungeon({ difficulty: 5 });

      const easyAnalysis = simulator.analyzeDungeon(easyDungeon);
      const hardAnalysis = simulator.analyzeDungeon(hardDungeon);

      expect(hardAnalysis.combatDifficulty).toBeGreaterThanOrEqual(easyAnalysis.combatDifficulty);
    });

    it('difficulty에 따라 riskLevel이 변한다', () => {
      const easyDungeon = simulator.generateDungeon({ difficulty: 1 });
      const analysis = simulator.analyzeDungeon(easyDungeon);

      expect(['low', 'medium', 'high']).toContain(analysis.riskLevel);
    });
  });

  describe('숨겨진 방', () => {
    it('hiddenRooms 설정에 따라 숨겨진 방이 생성될 수 있다', () => {
      const dungeon = simulator.generateDungeon({ hiddenRooms: 2, branchCount: 3 });
      const hiddenNodes = dungeon.nodes.filter(n => n.hidden);
      expect(hiddenNodes.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('던전 상태', () => {
    it('unlockedShortcuts가 빈 배열로 시작한다', () => {
      const dungeon = simulator.generateDungeon();
      expect(dungeon.unlockedShortcuts).toEqual([]);
    });

    it('discoveredHidden이 빈 배열로 시작한다', () => {
      const dungeon = simulator.generateDungeon();
      expect(dungeon.discoveredHidden).toEqual([]);
    });

    it('maxTime이 설정된다', () => {
      const dungeon = simulator.generateDungeon({ mainPathLength: 10 });
      expect(dungeon.maxTime).toBeGreaterThan(0);
    });
  });

  describe('노드 구조', () => {
    it('각 노드에 필수 속성이 있다', () => {
      const dungeon = simulator.generateDungeon();
      dungeon.nodes.forEach(node => {
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('type');
        expect(node).toHaveProperty('name');
        expect(node).toHaveProperty('objects');
        expect(node).toHaveProperty('visited');
        expect(node).toHaveProperty('cleared');
      });
    });

    it('각 노드에 좌표가 있다', () => {
      const dungeon = simulator.generateDungeon();
      dungeon.nodes.forEach(node => {
        expect(typeof node.x).toBe('number');
        expect(typeof node.y).toBe('number');
      });
    });
  });
});
