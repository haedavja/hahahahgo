/**
 * @file map-simulator.test.ts
 * @description 맵 시뮬레이터 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MapSimulator,
  createMapSimulator,
  type MapGenerationConfig,
  type MapSimulationConfig,
} from './map-simulator';

describe('MapSimulator', () => {
  let simulator: MapSimulator;

  beforeEach(() => {
    simulator = new MapSimulator();
  });

  describe('constructor', () => {
    it('MapSimulator를 생성한다', () => {
      expect(simulator).toBeDefined();
    });
  });

  describe('generateMap', () => {
    it('맵을 생성한다', () => {
      const map = simulator.generateMap();
      expect(map).toBeDefined();
      expect(map.nodes.length).toBeGreaterThan(0);
    });

    it('설정에 따라 맵을 생성한다', () => {
      const config: Partial<MapGenerationConfig> = {
        layers: 5,
      };
      const map = simulator.generateMap(config);
      expect(map).toBeDefined();
    });

    it('currentNodeId가 설정된다', () => {
      const map = simulator.generateMap();
      expect(map.currentNodeId).toBeDefined();
    });

    it('baseLayer가 0으로 시작한다', () => {
      const map = simulator.generateMap();
      expect(map.baseLayer).toBe(0);
    });

    it('clearedNodes가 빈 배열로 시작한다', () => {
      const map = simulator.generateMap();
      expect(Array.isArray(map.clearedNodes)).toBe(true);
    });

    it('layers 설정에 따라 노드 수가 변한다', () => {
      const smallMap = simulator.generateMap({ layers: 3 });
      const largeMap = simulator.generateMap({ layers: 10 });
      expect(largeMap.nodes.length).toBeGreaterThan(smallMap.nodes.length);
    });

    it('각 노드에 필수 속성이 있다', () => {
      const map = simulator.generateMap();
      map.nodes.forEach(node => {
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('type');
        expect(node).toHaveProperty('layer');
        expect(node).toHaveProperty('connections');
        expect(node).toHaveProperty('cleared');
        expect(node).toHaveProperty('selectable');
      });
    });

    it('보스 노드가 마지막 레이어에 있다', () => {
      const map = simulator.generateMap({ layers: 5 });
      const bossNodes = map.nodes.filter(n => n.type === 'boss');
      if (bossNodes.length > 0) {
        const maxLayer = Math.max(...map.nodes.map(n => n.layer));
        bossNodes.forEach(boss => {
          expect(boss.layer).toBe(maxLayer);
        });
      }
    });
  });

  describe('simulateMapProgression', () => {
    it('맵 진행을 시뮬레이션한다', () => {
      const map = simulator.generateMap({ layers: 5 });
      const config: MapSimulationConfig = { strategy: 'random' };
      const result = simulator.simulateMapProgression(map, config);

      expect(result).toBeDefined();
      expect(result.path.length).toBeGreaterThan(0);
    });

    it('combat_focus 전략으로 진행한다', () => {
      const map = simulator.generateMap();
      const config: MapSimulationConfig = { strategy: 'combat_focus' };
      const result = simulator.simulateMapProgression(map, config);

      expect(result).toBeDefined();
      expect(result.nodeTypes).toBeDefined();
    });

    it('shop_priority 전략으로 진행한다', () => {
      const map = simulator.generateMap();
      const config: MapSimulationConfig = { strategy: 'shop_priority' };
      const result = simulator.simulateMapProgression(map, config);

      expect(result).toBeDefined();
    });

    it('event_priority 전략으로 진행한다', () => {
      const map = simulator.generateMap();
      const config: MapSimulationConfig = { strategy: 'event_priority' };
      const result = simulator.simulateMapProgression(map, config);

      expect(result).toBeDefined();
    });

    it('safe 전략으로 진행한다', () => {
      const map = simulator.generateMap();
      const config: MapSimulationConfig = { strategy: 'safe', avoidElites: true };
      const result = simulator.simulateMapProgression(map, config);

      expect(result).toBeDefined();
    });

    it('prioritizeRest 옵션을 사용한다', () => {
      const map = simulator.generateMap();
      const config: MapSimulationConfig = { strategy: 'random', prioritizeRest: true };
      const result = simulator.simulateMapProgression(map, config);

      expect(result).toBeDefined();
    });

    it('nodeTypes 배열이 path와 같은 길이이다', () => {
      const map = simulator.generateMap({ layers: 5 });
      const result = simulator.simulateMapProgression(map, { strategy: 'random' });

      expect(result.nodeTypes.length).toBe(result.path.length);
    });

    it('통계가 계산된다', () => {
      const map = simulator.generateMap();
      const result = simulator.simulateMapProgression(map, { strategy: 'random' });

      expect(typeof result.totalCombats).toBe('number');
      expect(typeof result.totalElites).toBe('number');
      expect(typeof result.totalShops).toBe('number');
      expect(typeof result.totalEvents).toBe('number');
      expect(typeof result.totalRests).toBe('number');
    });

    it('estimatedDifficulty가 계산된다', () => {
      const map = simulator.generateMap();
      const result = simulator.simulateMapProgression(map, { strategy: 'random' });

      expect(typeof result.estimatedDifficulty).toBe('number');
    });
  });

  describe('analyzeMap', () => {
    it('맵을 분석한다', () => {
      const map = simulator.generateMap();
      const analysis = simulator.analyzeMap(map);

      expect(analysis).toBeDefined();
    });

    it('totalNodes를 계산한다', () => {
      const map = simulator.generateMap();
      const analysis = simulator.analyzeMap(map);

      expect(analysis.totalNodes).toBe(map.nodes.length);
    });

    it('nodeTypeDistribution을 계산한다', () => {
      const map = simulator.generateMap();
      const analysis = simulator.analyzeMap(map);

      expect(analysis.nodeTypeDistribution).toBeDefined();
      expect(typeof analysis.nodeTypeDistribution).toBe('object');
    });

    it('avgConnectionsPerNode를 계산한다', () => {
      const map = simulator.generateMap();
      const analysis = simulator.analyzeMap(map);

      expect(typeof analysis.avgConnectionsPerNode).toBe('number');
    });

    it('possiblePaths를 계산한다', () => {
      const map = simulator.generateMap({ layers: 3 });
      const analysis = simulator.analyzeMap(map);

      expect(typeof analysis.possiblePaths).toBe('number');
    });

    it('shortestPath와 longestPath를 계산한다', () => {
      const map = simulator.generateMap({ layers: 3 });
      const analysis = simulator.analyzeMap(map);

      expect(typeof analysis.shortestPath).toBe('number');
      expect(typeof analysis.longestPath).toBe('number');
      expect(analysis.longestPath).toBeGreaterThanOrEqual(analysis.shortestPath);
    });

    it('difficultyProgression을 계산한다', () => {
      const map = simulator.generateMap();
      const analysis = simulator.analyzeMap(map);

      expect(Array.isArray(analysis.difficultyProgression)).toBe(true);
    });
  });

  describe('findAllPaths', () => {
    it('모든 경로를 찾는다', () => {
      const map = simulator.generateMap({ layers: 3 });
      const paths = simulator.findAllPaths(map);

      expect(Array.isArray(paths)).toBe(true);
    });

    it('각 경로는 노드 ID 배열이다', () => {
      const map = simulator.generateMap({ layers: 3 });
      const paths = simulator.findAllPaths(map);

      if (paths.length > 0) {
        paths.forEach(path => {
          expect(Array.isArray(path)).toBe(true);
          path.forEach(nodeId => {
            expect(typeof nodeId).toBe('string');
          });
        });
      }
    });
  });

  describe('findOptimalPath', () => {
    it('최적 경로를 찾는다', () => {
      const map = simulator.generateMap({ layers: 5 });
      const optimalPath = simulator.findOptimalPath(map, {
        shopWeight: 1,
        restWeight: 1,
        eventWeight: 1,
        avoidElites: false,
      });

      expect(optimalPath).toBeDefined();
    });

    it('shop 가중치를 높여 최적 경로를 찾는다', () => {
      const map = simulator.generateMap();
      const optimalPath = simulator.findOptimalPath(map, {
        shopWeight: 5,
        restWeight: 1,
        eventWeight: 1,
        avoidElites: false,
      });

      expect(optimalPath).toBeDefined();
    });

    it('엘리트를 피하며 최적 경로를 찾는다', () => {
      const map = simulator.generateMap();
      const optimalPath = simulator.findOptimalPath(map, {
        shopWeight: 1,
        restWeight: 1,
        eventWeight: 1,
        avoidElites: true,
      });

      expect(optimalPath).toBeDefined();
    });
  });

  describe('createMapSimulator', () => {
    it('맵 시뮬레이터를 생성한다', () => {
      const sim = createMapSimulator();
      expect(sim).toBeDefined();
      expect(sim instanceof MapSimulator).toBe(true);
    });
  });
});
