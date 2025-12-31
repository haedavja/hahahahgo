/**
 * @file dungeon-simulator.ts
 * @description 던전 탐험 시뮬레이터
 *
 * ## 기능
 * - 던전 구조 생성 및 탐험 시뮬레이션
 * - 오브젝트 상호작용 결과 계산
 * - 최적 경로 탐색
 * - 전투/보물/이벤트 처리
 */

import { getLogger } from '../core/logger';

const log = getLogger('DungeonSimulator');

// ==================== 타입 정의 ====================

export type DungeonNodeType = 'entrance' | 'room' | 'corridor' | 'crossroad' | 'exit' | 'treasure' | 'boss' | 'shortcut';
export type ConnectionType = 'open' | 'stat_gate' | 'item_gate' | 'one_way' | 'locked';
export type DungeonObjectType = 'chest' | 'curio' | 'combat' | 'crossroad' | 'ore' | 'gold_pile' | 'crate' | 'crystal' | 'mushroom' | 'corpse';

export interface DungeonConnection {
  targetId: string;
  type: ConnectionType;
  requirements?: {
    stat?: string;
    value?: number;
    item?: string;
  };
  unlocked: boolean;
}

export interface DungeonObject {
  id: string;
  type: DungeonObjectType;
  x: number;
  used: boolean;
  quality?: 'common' | 'rare' | 'special';
  difficulty?: number;
  rewards?: Record<string, number>;
}

export interface DungeonNode {
  id: string;
  type: DungeonNodeType;
  name: string;
  description: string;
  x: number;
  y: number;
  objects: DungeonObject[];
  visited: boolean;
  cleared: boolean;
  hidden?: boolean;
}

export interface DungeonState {
  id: string;
  nodes: DungeonNode[];
  connections: Record<string, DungeonConnection[]>;
  currentNodeId: string;
  unlockedShortcuts: string[];
  discoveredHidden: string[];
  timeElapsed: number;
  maxTime: number;
}

export interface DungeonPlayerState {
  hp: number;
  maxHp: number;
  gold: number;
  intel: number;
  material: number;
  loot: number;
  strength: number;
  agility: number;
  insight: number;
  items: string[];
  deck: string[];
  relics: string[];
}

export interface DungeonSimulationConfig {
  player: DungeonPlayerState;
  strategy: 'explore_all' | 'speedrun' | 'treasure_hunt' | 'safe';
  maxTurns?: number;
  battleSimulator?: {
    simulateBattle: (player: DungeonPlayerState, difficulty: number) => { won: boolean; hpLost: number; rewards: Record<string, number> };
  };
}

export interface DungeonExplorationResult {
  dungeonId: string;
  nodesVisited: number;
  totalNodes: number;
  objectsInteracted: DungeonObject[];
  combatsWon: number;
  combatsLost: number;
  treasuresFound: number;
  totalRewards: Record<string, number>;
  timeElapsed: number;
  finalPlayerState: DungeonPlayerState;
  exitReached: boolean;
  path: string[];
}

export interface DungeonAnalysis {
  dungeonId: string;
  totalValue: number;
  combatDifficulty: number;
  optimalPath: string[];
  estimatedTime: number;
  riskLevel: 'low' | 'medium' | 'high';
}

// ==================== 던전 생성 ====================

export interface DungeonGenerationConfig {
  mainPathLength: number;
  branchCount: number;
  branchLength: number;
  treasureRooms: number;
  combatRooms: number;
  hiddenRooms: number;
  difficulty: number;
}

const DEFAULT_GENERATION_CONFIG: DungeonGenerationConfig = {
  mainPathLength: 8,
  branchCount: 3,
  branchLength: 2,
  treasureRooms: 2,
  combatRooms: 4,
  hiddenRooms: 1,
  difficulty: 1,
};

// ==================== 던전 시뮬레이터 ====================

export class DungeonSimulator {
  constructor() {
    log.info('DungeonSimulator initialized');
  }

  // ==================== 던전 생성 ====================

  /**
   * 랜덤 던전 생성
   */
  generateDungeon(config: Partial<DungeonGenerationConfig> = {}): DungeonState {
    const cfg = { ...DEFAULT_GENERATION_CONFIG, ...config };
    const nodes: DungeonNode[] = [];
    const connections: Record<string, DungeonConnection[]> = {};

    let nodeIdCounter = 0;
    const generateNodeId = () => `node_${nodeIdCounter++}`;

    // 입구 생성
    const entranceId = generateNodeId();
    nodes.push({
      id: entranceId,
      type: 'entrance',
      name: '던전 입구',
      description: '어둠이 시작되는 곳',
      x: 0,
      y: 0,
      objects: [],
      visited: true,
      cleared: true,
    });
    connections[entranceId] = [];

    // 메인 경로 생성
    let prevNodeId = entranceId;
    for (let i = 0; i < cfg.mainPathLength; i++) {
      const nodeId = generateNodeId();
      const isLast = i === cfg.mainPathLength - 1;

      const nodeType: DungeonNodeType = isLast ? 'exit' : (i % 3 === 0 ? 'crossroad' : 'corridor');

      nodes.push({
        id: nodeId,
        type: nodeType,
        name: isLast ? '출구' : `통로 ${i + 1}`,
        description: '',
        x: i + 1,
        y: 0,
        objects: this.generateRoomObjects(nodeType, cfg.difficulty),
        visited: false,
        cleared: false,
      });

      connections[nodeId] = [];
      connections[prevNodeId].push({
        targetId: nodeId,
        type: 'open',
        unlocked: true,
      });
      connections[nodeId].push({
        targetId: prevNodeId,
        type: 'open',
        unlocked: true,
      });

      prevNodeId = nodeId;
    }

    // 분기 경로 생성
    for (let b = 0; b < cfg.branchCount; b++) {
      const branchStartIndex = Math.floor(Math.random() * (nodes.length - 2)) + 1;
      const branchStartNode = nodes[branchStartIndex];

      let branchPrevId = branchStartNode.id;
      for (let j = 0; j < cfg.branchLength; j++) {
        const branchNodeId = generateNodeId();
        const isTreasure = j === cfg.branchLength - 1 && b < cfg.treasureRooms;

        nodes.push({
          id: branchNodeId,
          type: isTreasure ? 'treasure' : 'room',
          name: isTreasure ? '보물방' : `숨겨진 방 ${b + 1}-${j + 1}`,
          description: '',
          x: branchStartNode.x + j + 1,
          y: b + 1,
          objects: this.generateRoomObjects(isTreasure ? 'treasure' : 'room', cfg.difficulty),
          visited: false,
          cleared: false,
          hidden: j === 0,
        });

        connections[branchNodeId] = [];
        connections[branchPrevId].push({
          targetId: branchNodeId,
          type: j === 0 ? 'stat_gate' : 'open',
          requirements: j === 0 ? { stat: 'insight', value: cfg.difficulty } : undefined,
          unlocked: j !== 0,
        });
        connections[branchNodeId].push({
          targetId: branchPrevId,
          type: 'open',
          unlocked: true,
        });

        branchPrevId = branchNodeId;
      }
    }

    // 전투 방 추가
    const roomNodes = nodes.filter(n => n.type === 'room' || n.type === 'corridor');
    for (let c = 0; c < Math.min(cfg.combatRooms, roomNodes.length); c++) {
      const room = roomNodes[c];
      room.objects.push({
        id: `combat_${c}`,
        type: 'combat',
        x: 0,
        used: false,
        difficulty: cfg.difficulty,
      });
    }

    return {
      id: `dungeon_${Date.now()}`,
      nodes,
      connections,
      currentNodeId: entranceId,
      unlockedShortcuts: [],
      discoveredHidden: [],
      timeElapsed: 0,
      maxTime: cfg.mainPathLength * 10,
    };
  }

  /**
   * 방 오브젝트 생성
   */
  private generateRoomObjects(roomType: DungeonNodeType, difficulty: number): DungeonObject[] {
    const objects: DungeonObject[] = [];

    if (roomType === 'treasure') {
      objects.push({
        id: `chest_${Date.now()}`,
        type: 'chest',
        x: 0,
        used: false,
        quality: 'rare',
        rewards: { gold: 30 + difficulty * 10, material: 1 },
      });
    }

    if (roomType === 'room' && Math.random() < 0.5) {
      const objectTypes: DungeonObjectType[] = ['curio', 'ore', 'crate', 'crystal', 'mushroom'];
      const randomType = objectTypes[Math.floor(Math.random() * objectTypes.length)];
      objects.push({
        id: `${randomType}_${Date.now()}`,
        type: randomType,
        x: 0,
        used: false,
        quality: 'common',
        rewards: this.getObjectRewards(randomType),
      });
    }

    return objects;
  }

  /**
   * 오브젝트 보상 계산
   */
  private getObjectRewards(objectType: DungeonObjectType): Record<string, number> {
    const rewards: Record<DungeonObjectType, Record<string, number>> = {
      chest: { gold: 30, loot: 1 },
      curio: { intel: 20 },
      combat: {},
      crossroad: {},
      ore: { material: 1 },
      gold_pile: { gold: 20 },
      crate: { loot: 1 },
      crystal: { material: 2 },
      mushroom: { hp: 10 },
      corpse: { gold: 10, intel: 10 },
    };
    return rewards[objectType] || {};
  }

  // ==================== 탐험 시뮬레이션 ====================

  /**
   * 던전 탐험 시뮬레이션
   */
  simulateDungeonExploration(
    dungeon: DungeonState,
    config: DungeonSimulationConfig
  ): DungeonExplorationResult {
    const player = { ...config.player };
    const state = JSON.parse(JSON.stringify(dungeon)) as DungeonState;
    const maxTurns = config.maxTurns || 100;

    const result: DungeonExplorationResult = {
      dungeonId: dungeon.id,
      nodesVisited: 0,
      totalNodes: state.nodes.length,
      objectsInteracted: [],
      combatsWon: 0,
      combatsLost: 0,
      treasuresFound: 0,
      totalRewards: {},
      timeElapsed: 0,
      finalPlayerState: player,
      exitReached: false,
      path: [state.currentNodeId],
    };

    let turn = 0;
    while (turn < maxTurns && player.hp > 0) {
      turn++;
      state.timeElapsed++;

      const currentNode = state.nodes.find(n => n.id === state.currentNodeId);
      if (!currentNode) break;

      // 노드 방문 처리
      if (!currentNode.visited) {
        currentNode.visited = true;
        result.nodesVisited++;
      }

      // 오브젝트 상호작용
      for (const obj of currentNode.objects) {
        if (obj.used) continue;

        const interactionResult = this.interactWithObject(obj, player, config);
        obj.used = true;
        result.objectsInteracted.push(obj);

        if (obj.type === 'combat') {
          if (interactionResult.success) {
            result.combatsWon++;
          } else {
            result.combatsLost++;
            if (player.hp <= 0) break;
          }
        }

        if (obj.type === 'chest') {
          result.treasuresFound++;
        }

        // 보상 합산
        for (const [key, value] of Object.entries(interactionResult.rewards)) {
          result.totalRewards[key] = (result.totalRewards[key] || 0) + value;
        }
      }

      currentNode.cleared = true;

      // 출구 도달 확인
      if (currentNode.type === 'exit') {
        result.exitReached = true;
        break;
      }

      // 다음 노드 선택
      const nextNodeId = this.selectNextNode(state, currentNode, config, player);
      if (!nextNodeId) break;

      state.currentNodeId = nextNodeId;
      result.path.push(nextNodeId);
    }

    result.timeElapsed = state.timeElapsed;
    result.finalPlayerState = player;

    return result;
  }

  /**
   * 오브젝트 상호작용
   */
  private interactWithObject(
    obj: DungeonObject,
    player: DungeonPlayerState,
    config: DungeonSimulationConfig
  ): { success: boolean; rewards: Record<string, number> } {
    if (obj.type === 'combat') {
      // 전투 시뮬레이션
      if (config.battleSimulator) {
        const battleResult = config.battleSimulator.simulateBattle(player, obj.difficulty || 1);
        player.hp -= battleResult.hpLost;
        return {
          success: battleResult.won,
          rewards: battleResult.won ? battleResult.rewards : {},
        };
      } else {
        // 간단한 전투 시뮬레이션
        const difficulty = obj.difficulty || 1;
        const playerPower = player.strength + player.agility + player.deck.length;
        const winChance = Math.min(0.9, 0.5 + (playerPower - difficulty * 10) * 0.05);
        const won = Math.random() < winChance;

        if (!won) {
          player.hp -= 10 + difficulty * 5;
        } else {
          player.hp -= Math.floor(Math.random() * (5 + difficulty * 2));
        }

        return {
          success: won,
          rewards: won ? { gold: 20 + difficulty * 10, loot: 1 } : {},
        };
      }
    }

    // 비전투 오브젝트
    const rewards = obj.rewards || this.getObjectRewards(obj.type);

    // 보상 적용
    player.gold += rewards.gold || 0;
    player.intel += rewards.intel || 0;
    player.material += rewards.material || 0;
    player.loot += rewards.loot || 0;
    player.hp = Math.min(player.maxHp, player.hp + (rewards.hp || 0));

    return { success: true, rewards };
  }

  /**
   * 다음 노드 선택
   */
  private selectNextNode(
    state: DungeonState,
    currentNode: DungeonNode,
    config: DungeonSimulationConfig,
    player: DungeonPlayerState
  ): string | null {
    const connections = state.connections[currentNode.id] || [];
    const availableConnections = connections.filter(conn => {
      if (!conn.unlocked) {
        // 잠긴 연결 확인
        if (conn.type === 'stat_gate' && conn.requirements) {
          const stat = conn.requirements.stat as keyof DungeonPlayerState;
          const playerStat = player[stat] as number || 0;
          return playerStat >= (conn.requirements.value || 0);
        }
        if (conn.type === 'item_gate' && conn.requirements?.item) {
          return player.items.includes(conn.requirements.item);
        }
        return false;
      }
      return true;
    });

    if (availableConnections.length === 0) return null;

    // 전략에 따른 선택
    switch (config.strategy) {
      case 'speedrun':
        // 출구로 가는 가장 빠른 경로
        const exitPath = this.findPathToExit(state, currentNode.id);
        if (exitPath.length > 1) {
          return exitPath[1];
        }
        break;

      case 'treasure_hunt':
        // 보물방 우선
        const treasureConn = availableConnections.find(conn => {
          const targetNode = state.nodes.find(n => n.id === conn.targetId);
          return targetNode?.type === 'treasure' && !targetNode.visited;
        });
        if (treasureConn) return treasureConn.targetId;
        break;

      case 'explore_all':
        // 미방문 노드 우선
        const unvisitedConn = availableConnections.find(conn => {
          const targetNode = state.nodes.find(n => n.id === conn.targetId);
          return targetNode && !targetNode.visited;
        });
        if (unvisitedConn) return unvisitedConn.targetId;
        break;

      case 'safe':
        // 전투 없는 경로 우선
        const safeConn = availableConnections.find(conn => {
          const targetNode = state.nodes.find(n => n.id === conn.targetId);
          return targetNode && !targetNode.objects.some(o => o.type === 'combat' && !o.used);
        });
        if (safeConn) return safeConn.targetId;
        break;
    }

    // 기본: 첫 번째 가능한 연결
    return availableConnections[0]?.targetId || null;
  }

  /**
   * 출구까지 경로 찾기 (BFS)
   */
  private findPathToExit(state: DungeonState, startId: string): string[] {
    const exitNode = state.nodes.find(n => n.type === 'exit');
    if (!exitNode) return [];

    const queue: { nodeId: string; path: string[] }[] = [{ nodeId: startId, path: [startId] }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.nodeId === exitNode.id) {
        return current.path;
      }

      if (visited.has(current.nodeId)) continue;
      visited.add(current.nodeId);

      const connections = state.connections[current.nodeId] || [];
      for (const conn of connections) {
        if (!visited.has(conn.targetId)) {
          queue.push({
            nodeId: conn.targetId,
            path: [...current.path, conn.targetId],
          });
        }
      }
    }

    return [];
  }

  // ==================== 분석 ====================

  /**
   * 던전 분석
   */
  analyzeDungeon(dungeon: DungeonState): DungeonAnalysis {
    let totalValue = 0;
    let combatDifficulty = 0;
    let combatCount = 0;

    for (const node of dungeon.nodes) {
      for (const obj of node.objects) {
        if (obj.rewards) {
          totalValue += Object.values(obj.rewards).reduce((a, b) => a + b, 0);
        }
        if (obj.type === 'combat') {
          combatDifficulty += obj.difficulty || 1;
          combatCount++;
        }
      }
    }

    const avgDifficulty = combatCount > 0 ? combatDifficulty / combatCount : 0;
    const optimalPath = this.findPathToExit(dungeon, dungeon.currentNodeId);

    return {
      dungeonId: dungeon.id,
      totalValue,
      combatDifficulty: avgDifficulty,
      optimalPath,
      estimatedTime: optimalPath.length * 2,
      riskLevel: avgDifficulty > 3 ? 'high' : avgDifficulty > 1.5 ? 'medium' : 'low',
    };
  }
}

// ==================== 헬퍼 함수 ====================

export function createDungeonSimulator(): DungeonSimulator {
  return new DungeonSimulator();
}
