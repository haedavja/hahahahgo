/**
 * @file map-simulator.ts
 * @description 맵 생성 및 노드 진행 시뮬레이터
 *
 * ## 기능
 * - 맵 구조 생성
 * - 노드 선택 및 진행 시뮬레이션
 * - 최적 경로 분석
 * - 난이도 곡선 계산
 */

import { getLogger } from '../core/logger';

const log = getLogger('MapSimulator');

// ==================== 타입 정의 ====================

export type MapNodeType = 'combat' | 'elite' | 'boss' | 'event' | 'shop' | 'rest' | 'dungeon' | 'unknown' | 'start';

export interface MapNode {
  id: string;
  type: MapNodeType;
  layer: number;
  x: number;
  connections: string[];
  cleared: boolean;
  selectable: boolean;
  difficulty?: number;
  rewards?: Record<string, number>;
  eventId?: string;
}

export interface MapState {
  nodes: MapNode[];
  currentNodeId: string;
  baseLayer: number;
  clearedNodes: string[];
}

export interface MapGenerationConfig {
  layers: number;
  nodesPerLayer: { min: number; max: number };
  nodeTypeWeights: Record<MapNodeType, number>;
  eliteFrequency: number; // 몇 레이어마다 엘리트
  shopFrequency: number;
  restFrequency: number;
  dungeonFrequency: number;
  baseDifficulty: number;
  difficultyScaling: number;
}

export interface MapSimulationConfig {
  strategy: 'combat_focus' | 'shop_priority' | 'event_priority' | 'safe' | 'random';
  avoidElites?: boolean;
  prioritizeRest?: boolean;
}

export interface MapPathResult {
  path: string[];
  nodeTypes: MapNodeType[];
  totalCombats: number;
  totalElites: number;
  totalShops: number;
  totalEvents: number;
  totalRests: number;
  estimatedDifficulty: number;
}

export interface MapAnalysis {
  totalNodes: number;
  nodeTypeDistribution: Record<MapNodeType, number>;
  avgConnectionsPerNode: number;
  possiblePaths: number;
  shortestPath: number;
  longestPath: number;
  difficultyProgression: number[];
}

// ==================== 상수 ====================

const DEFAULT_GENERATION_CONFIG: MapGenerationConfig = {
  layers: 11,
  nodesPerLayer: { min: 2, max: 4 },
  nodeTypeWeights: {
    combat: 50,
    elite: 10,
    boss: 0, // 보스는 마지막 레이어에만
    event: 15,
    shop: 10,
    rest: 10,
    dungeon: 5,
    unknown: 0,
    start: 0,
  },
  eliteFrequency: 3, // 3레이어마다
  shopFrequency: 4,
  restFrequency: 3,
  dungeonFrequency: 5,
  baseDifficulty: 1,
  difficultyScaling: 0.2,
};

// ==================== 맵 시뮬레이터 ====================

export class MapSimulator {
  constructor() {
    log.info('MapSimulator initialized');
  }

  // ==================== 맵 생성 ====================

  /**
   * 맵 생성
   */
  generateMap(config: Partial<MapGenerationConfig> = {}): MapState {
    const cfg = { ...DEFAULT_GENERATION_CONFIG, ...config };
    const nodes: MapNode[] = [];
    let nodeIdCounter = 0;

    // 시작 노드
    const startNode: MapNode = {
      id: `node_${nodeIdCounter++}`,
      type: 'combat',
      layer: 0,
      x: 0,
      connections: [],
      cleared: true,
      selectable: false,
      difficulty: cfg.baseDifficulty,
    };
    nodes.push(startNode);

    // 레이어별 노드 생성
    const layerNodes: MapNode[][] = [[startNode]];

    for (let layer = 1; layer <= cfg.layers; layer++) {
      const isLastLayer = layer === cfg.layers;
      const nodeCount = isLastLayer
        ? 1 // 보스 레이어는 1개
        : Math.floor(Math.random() * (cfg.nodesPerLayer.max - cfg.nodesPerLayer.min + 1)) + cfg.nodesPerLayer.min;

      const currentLayerNodes: MapNode[] = [];

      for (let i = 0; i < nodeCount; i++) {
        const nodeType = isLastLayer ? 'boss' : this.selectNodeType(layer, cfg);
        const difficulty = cfg.baseDifficulty + layer * cfg.difficultyScaling;

        const node: MapNode = {
          id: `node_${nodeIdCounter++}`,
          type: nodeType,
          layer,
          x: i,
          connections: [],
          cleared: false,
          selectable: layer === 1, // 첫 레이어만 선택 가능
          difficulty,
          rewards: this.generateRewards(nodeType, difficulty),
        };

        nodes.push(node);
        currentLayerNodes.push(node);
      }

      layerNodes.push(currentLayerNodes);

      // 이전 레이어와 연결
      this.connectLayers(layerNodes[layer - 1], currentLayerNodes);
    }

    return {
      nodes,
      currentNodeId: startNode.id,
      baseLayer: 0,
      clearedNodes: [startNode.id],
    };
  }

  /**
   * 노드 타입 선택
   */
  private selectNodeType(layer: number, config: MapGenerationConfig): MapNodeType {
    // 강제 노드 타입 체크
    if (layer % config.eliteFrequency === 0 && Math.random() < 0.5) {
      return 'elite';
    }
    if (layer % config.shopFrequency === 0 && Math.random() < 0.3) {
      return 'shop';
    }
    if (layer % config.restFrequency === 0 && Math.random() < 0.4) {
      return 'rest';
    }
    if (layer % config.dungeonFrequency === 0 && Math.random() < 0.2) {
      return 'dungeon';
    }

    // 가중치 기반 선택
    const weights = { ...config.nodeTypeWeights } as Record<string, number>;
    delete weights.boss; // 보스는 제외

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (const [type, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) {
        return type as MapNodeType;
      }
    }

    return 'combat';
  }

  /**
   * 레이어 간 연결
   */
  private connectLayers(prevLayer: MapNode[], currentLayer: MapNode[]): void {
    // 각 현재 레이어 노드에 최소 1개 연결 보장
    for (const node of currentLayer) {
      const randomPrev = prevLayer[Math.floor(Math.random() * prevLayer.length)];
      randomPrev.connections.push(node.id);
    }

    // 추가 연결 생성 (크로스 연결)
    for (const prevNode of prevLayer) {
      for (const currNode of currentLayer) {
        if (!prevNode.connections.includes(currNode.id) && Math.random() < 0.3) {
          prevNode.connections.push(currNode.id);
        }
      }
    }
  }

  /**
   * 보상 생성
   */
  private generateRewards(nodeType: MapNodeType, difficulty: number): Record<string, number> {
    const baseRewards: Record<MapNodeType, Record<string, number>> = {
      combat: { gold: 20, card: 1 },
      elite: { gold: 40, relic: 1 },
      boss: { gold: 100, relic: 1 },
      event: { gold: 15 },
      shop: {},
      rest: {},
      dungeon: { gold: 50, material: 2 },
      unknown: {},
      start: {},
    };

    const rewards = { ...baseRewards[nodeType] };
    // 난이도에 따른 보상 스케일링
    if (rewards.gold) {
      rewards.gold = Math.floor(rewards.gold * (1 + difficulty * 0.1));
    }

    return rewards;
  }

  // ==================== 시뮬레이션 ====================

  /**
   * 맵 진행 시뮬레이션
   */
  simulateMapProgression(
    map: MapState,
    config: MapSimulationConfig
  ): MapPathResult {
    const state = JSON.parse(JSON.stringify(map)) as MapState;
    const path: string[] = [state.currentNodeId];
    const nodeTypes: MapNodeType[] = [];

    let totalCombats = 0;
    let totalElites = 0;
    let totalShops = 0;
    let totalEvents = 0;
    let totalRests = 0;
    let totalDifficulty = 0;

    while (true) {
      const currentNode = state.nodes.find(n => n.id === state.currentNodeId);
      if (!currentNode) break;

      nodeTypes.push(currentNode.type);

      // 노드 타입별 카운트
      switch (currentNode.type) {
        case 'combat': totalCombats++; break;
        case 'elite': totalElites++; break;
        case 'shop': totalShops++; break;
        case 'event': totalEvents++; break;
        case 'rest': totalRests++; break;
      }

      totalDifficulty += currentNode.difficulty || 1;

      // 보스면 종료
      if (currentNode.type === 'boss') {
        break;
      }

      // 다음 노드 선택
      const nextNodeId = this.selectNextNode(state, currentNode, config);
      if (!nextNodeId) break;

      // 상태 업데이트
      currentNode.cleared = true;
      state.clearedNodes.push(currentNode.id);
      state.currentNodeId = nextNodeId;
      path.push(nextNodeId);

      // 다음 레이어 노드들 선택 가능하게
      const nextNode = state.nodes.find(n => n.id === nextNodeId);
      if (nextNode) {
        for (const node of state.nodes) {
          if (node.layer === nextNode.layer) {
            node.selectable = true;
          }
        }
      }
    }

    return {
      path,
      nodeTypes,
      totalCombats,
      totalElites,
      totalShops,
      totalEvents,
      totalRests,
      estimatedDifficulty: totalDifficulty / path.length,
    };
  }

  /**
   * 다음 노드 선택
   */
  private selectNextNode(
    state: MapState,
    currentNode: MapNode,
    config: MapSimulationConfig
  ): string | null {
    const availableNodes = currentNode.connections
      .map(id => state.nodes.find(n => n.id === id))
      .filter((n): n is MapNode => n !== undefined && !n.cleared);

    if (availableNodes.length === 0) return null;

    switch (config.strategy) {
      case 'combat_focus':
        // 전투 우선
        const combatNode = availableNodes.find(n => n.type === 'combat' || n.type === 'elite');
        if (combatNode) return combatNode.id;
        break;

      case 'shop_priority':
        // 상점 우선
        const shopNode = availableNodes.find(n => n.type === 'shop');
        if (shopNode) return shopNode.id;
        break;

      case 'event_priority':
        // 이벤트 우선
        const eventNode = availableNodes.find(n => n.type === 'event');
        if (eventNode) return eventNode.id;
        break;

      case 'safe':
        // 안전한 경로 (엘리트 회피, 휴식 우선)
        if (config.avoidElites) {
          const nonElite = availableNodes.filter(n => n.type !== 'elite');
          if (nonElite.length > 0) {
            const restNode = nonElite.find(n => n.type === 'rest');
            if (restNode && config.prioritizeRest) return restNode.id;
            return nonElite[0].id;
          }
        }
        break;
    }

    // 기본: 랜덤 선택
    return availableNodes[Math.floor(Math.random() * availableNodes.length)].id;
  }

  // ==================== 분석 ====================

  /**
   * 맵 분석
   */
  analyzeMap(map: MapState): MapAnalysis {
    const nodeTypeDistribution: Record<MapNodeType, number> = {
      combat: 0,
      elite: 0,
      boss: 0,
      event: 0,
      shop: 0,
      rest: 0,
      dungeon: 0,
      unknown: 0,
      start: 0,
    };

    let totalConnections = 0;
    const difficultyByLayer: Record<number, number[]> = {};

    for (const node of map.nodes) {
      nodeTypeDistribution[node.type]++;
      totalConnections += node.connections.length;

      if (!difficultyByLayer[node.layer]) {
        difficultyByLayer[node.layer] = [];
      }
      difficultyByLayer[node.layer].push(node.difficulty || 1);
    }

    // 난이도 진행 계산
    const difficultyProgression = Object.keys(difficultyByLayer)
      .sort((a, b) => Number(a) - Number(b))
      .map(layer => {
        const difficulties = difficultyByLayer[Number(layer)];
        return difficulties.reduce((a, b) => a + b, 0) / difficulties.length;
      });

    // 가능한 경로 수 추정 (간단한 근사)
    const layers = Math.max(...map.nodes.map(n => n.layer));
    const avgNodesPerLayer = map.nodes.length / (layers + 1);
    const possiblePaths = Math.pow(avgNodesPerLayer, layers);

    return {
      totalNodes: map.nodes.length,
      nodeTypeDistribution,
      avgConnectionsPerNode: totalConnections / map.nodes.length,
      possiblePaths: Math.floor(possiblePaths),
      shortestPath: layers + 1,
      longestPath: layers + 1, // 레이어 기반이므로 동일
      difficultyProgression,
    };
  }

  /**
   * 모든 가능한 경로 탐색 (DFS)
   */
  findAllPaths(map: MapState): string[][] {
    const paths: string[][] = [];
    const startNode = map.nodes.find(n => n.layer === 0);
    if (!startNode) return paths;

    const dfs = (nodeId: string, currentPath: string[]) => {
      const node = map.nodes.find(n => n.id === nodeId);
      if (!node) return;

      currentPath.push(nodeId);

      if (node.type === 'boss' || node.connections.length === 0) {
        paths.push([...currentPath]);
      } else {
        for (const nextId of node.connections) {
          dfs(nextId, currentPath);
        }
      }

      currentPath.pop();
    };

    dfs(startNode.id, []);
    return paths;
  }

  /**
   * 최적 경로 찾기
   */
  findOptimalPath(
    map: MapState,
    preferences: {
      shopWeight: number;
      restWeight: number;
      eventWeight: number;
      avoidElites: boolean;
    }
  ): MapPathResult {
    const allPaths = this.findAllPaths(map);

    let bestPath: string[] = [];
    let bestScore = -Infinity;

    for (const path of allPaths) {
      let score = 0;

      for (const nodeId of path) {
        const node = map.nodes.find(n => n.id === nodeId);
        if (!node) continue;

        switch (node.type) {
          case 'shop': score += preferences.shopWeight; break;
          case 'rest': score += preferences.restWeight; break;
          case 'event': score += preferences.eventWeight; break;
          case 'elite': score += preferences.avoidElites ? -50 : 30; break;
          case 'combat': score += 10; break;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestPath = path;
      }
    }

    // 최적 경로를 MapPathResult로 변환
    return this.pathToResult(map, bestPath);
  }

  private pathToResult(map: MapState, path: string[]): MapPathResult {
    const nodeTypes: MapNodeType[] = [];
    let totalCombats = 0, totalElites = 0, totalShops = 0, totalEvents = 0, totalRests = 0;
    let totalDifficulty = 0;

    for (const nodeId of path) {
      const node = map.nodes.find(n => n.id === nodeId);
      if (!node) continue;

      nodeTypes.push(node.type);
      totalDifficulty += node.difficulty || 1;

      switch (node.type) {
        case 'combat': totalCombats++; break;
        case 'elite': totalElites++; break;
        case 'shop': totalShops++; break;
        case 'event': totalEvents++; break;
        case 'rest': totalRests++; break;
      }
    }

    return {
      path,
      nodeTypes,
      totalCombats,
      totalElites,
      totalShops,
      totalEvents,
      totalRests,
      estimatedDifficulty: path.length > 0 ? totalDifficulty / path.length : 0,
    };
  }
}

// ==================== 헬퍼 함수 ====================

export function createMapSimulator(): MapSimulator {
  return new MapSimulator();
}
