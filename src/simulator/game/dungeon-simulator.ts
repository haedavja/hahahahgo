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
import { getGlobalRandom } from '../core/seeded-random';

const log = getLogger('DungeonSimulator');

// ==================== 던전 보상 풀 ====================

// 던전에서 획득 가능한 카드 풀
const DUNGEON_CARD_REWARDS = [
  'strike', 'deflect', 'quarte', 'octave', 'breach',
  'marche', 'lunge', 'thrust', 'beat', 'feint',
  'shoot', 'aimed_shot', 'quick_shot',
  'defensive_stance', 'disrupt'
];

// 던전에서 획득 가능한 상징 풀 (희귀) - 이제 전체 RELICS에서 동적으로 선택
// const DUNGEON_RELIC_REWARDS = ['etherCrystal', 'etherGem', 'longCoat', 'sturdyArmor']; // 레거시

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
  /** 획득한 카드 ID 목록 */
  cardsGained: string[];
  /** 획득한 상징 ID 목록 */
  relicsGained: string[];
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
  private relicLibrary: Record<string, { id: string; rarity?: string }> = {};

  constructor() {
    log.info('DungeonSimulator initialized');
  }

  /**
   * 상징 데이터 로드 (전체 풀에서 선택하기 위해)
   */
  loadRelicData(relics: Record<string, { id: string; rarity?: string }>): void {
    this.relicLibrary = relics;
    log.info('DungeonSimulator: Relic library loaded', { count: Object.keys(relics).length });
  }

  /**
   * 사용 가능한 상징 풀 반환
   */
  private getAvailableRelics(): string[] {
    const relicIds = Object.keys(this.relicLibrary);
    // 풀백: 데이터가 로드되지 않은 경우 기본값 사용
    if (relicIds.length === 0) {
      return ['etherCrystal', 'etherGem', 'longCoat', 'sturdyArmor'];
    }
    return relicIds;
  }

  // 상징 등급별 가중치 (legendary, dev 제외)
  private static readonly RELIC_RARITY_WEIGHTS: Record<string, number> = {
    common: 50,
    rare: 30,
    special: 15,
    legendary: 0,  // 보물상자에서는 legendary 제외
    dev: 0,        // 개발자 전용 제외
  };

  /**
   * 등급별 가중치를 적용하여 상징 선택
   * @param availableRelics 획득 가능한 상징 ID 배열
   * @returns 선택된 상징 ID 또는 null
   */
  private selectRelicByRarity(availableRelics: string[]): string | null {
    if (availableRelics.length === 0) return null;

    const rng = getGlobalRandom();

    // 등급별로 상징 분류
    const relicsByRarity: Record<string, string[]> = {};
    for (const relicId of availableRelics) {
      const relic = this.relicLibrary[relicId];
      const rarity = relic?.rarity || 'common';
      if (!relicsByRarity[rarity]) {
        relicsByRarity[rarity] = [];
      }
      relicsByRarity[rarity].push(relicId);
    }

    // 가중치 계산 (해당 등급의 상징이 있는 경우만)
    const weightedPool: { relicId: string; weight: number }[] = [];
    for (const [rarity, relicIds] of Object.entries(relicsByRarity)) {
      const weight = DungeonSimulator.RELIC_RARITY_WEIGHTS[rarity] || 0;

      if (weight > 0) {
        // 각 상징에 동일한 가중치 부여 (등급 가중치 / 해당 등급 상징 수)
        const perRelicWeight = weight / relicIds.length;
        for (const relicId of relicIds) {
          weightedPool.push({ relicId, weight: perRelicWeight });
        }
      }
    }

    if (weightedPool.length === 0) {
      // 가중치가 0인 상징만 남은 경우 폴백: 랜덤 선택
      return rng.pick(availableRelics);
    }

    // 가중치 기반 랜덤 선택
    const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
    let roll = rng.next() * totalWeight;

    for (const item of weightedPool) {
      roll -= item.weight;
      if (roll <= 0) {
        return item.relicId;
      }
    }

    // 폴백: 마지막 항목 반환
    return weightedPool[weightedPool.length - 1].relicId;
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
      const branchStartIndex = getGlobalRandom().nextInt(1, nodes.length - 2);
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

    const rng = getGlobalRandom();
    if (roomType === 'room' && rng.chance(0.5)) {
      const objectTypes: DungeonObjectType[] = ['curio', 'ore', 'crate', 'crystal', 'mushroom'];
      const randomType = rng.pick(objectTypes);
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
      cardsGained: [],
      relicsGained: [],
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

        // 카드/상징 보상 수집
        if (interactionResult.cardsGained.length > 0) {
          result.cardsGained.push(...interactionResult.cardsGained);
        }
        if (interactionResult.relicsGained.length > 0) {
          result.relicsGained.push(...interactionResult.relicsGained);
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
  ): { success: boolean; rewards: Record<string, number>; cardsGained: string[]; relicsGained: string[] } {
    if (obj.type === 'combat') {
      // 전투 시뮬레이션
      if (config.battleSimulator) {
        const battleResult = config.battleSimulator.simulateBattle(player, obj.difficulty || 1);
        player.hp -= battleResult.hpLost;

        // 전투 승리 시 카드 보상 (50% 확률)
        const cardsGained: string[] = [];
        const rng = getGlobalRandom();
        if (battleResult.won && rng.chance(0.5)) {
          const randomCard = rng.pick(DUNGEON_CARD_REWARDS);
          cardsGained.push(randomCard);
          player.deck.push(randomCard);
        }

        return {
          success: battleResult.won,
          rewards: battleResult.won ? battleResult.rewards : {},
          cardsGained,
          relicsGained: [],
        };
      } else {
        // 간단한 전투 시뮬레이션 (개선된 공식)
        const difficulty = obj.difficulty || 1;
        // 던전 전투는 일반 전투보다 쉬움 (75% 기본 승률)
        const baseWinChance = 0.75 - (difficulty - 1) * 0.05;
        const relicBonus = player.relics.length * 0.03;
        const winChance = Math.min(0.9, Math.max(0.3, baseWinChance + relicBonus));
        const rng = getGlobalRandom();
        const won = rng.chance(winChance);

        if (!won) {
          player.hp -= 10 + difficulty * 3;
        } else {
          player.hp -= rng.nextInt(0, 2 + difficulty);
        }

        // 전투 승리 시 카드 보상 (50% 확률)
        const cardsGained: string[] = [];
        if (won && rng.chance(0.5)) {
          const randomCard = rng.pick(DUNGEON_CARD_REWARDS);
          cardsGained.push(randomCard);
          player.deck.push(randomCard);
        }

        return {
          success: won,
          rewards: won ? { gold: 20 + difficulty * 10, loot: 1 } : {},
          cardsGained,
          relicsGained: [],
        };
      }
    }

    // 비전투 오브젝트
    const rewards = obj.rewards || this.getObjectRewards(obj.type);
    const cardsGained: string[] = [];
    const relicsGained: string[] = [];

    // 보물 상자에서 카드/상징 보상
    if (obj.type === 'chest') {
      const rng = getGlobalRandom();
      // 보물 상자는 항상 카드 1장 제공
      const randomCard = rng.pick(DUNGEON_CARD_REWARDS);
      cardsGained.push(randomCard);
      player.deck.push(randomCard);

      // 희귀 보물 상자는 상징도 제공 (25% 확률, 등급별 가중치 적용)
      if (obj.quality === 'rare' && rng.chance(0.25)) {
        const availableRelics = this.getAvailableRelics().filter(r => !player.relics.includes(r));
        if (availableRelics.length > 0) {
          const selectedRelic = this.selectRelicByRarity(availableRelics);
          if (selectedRelic) {
            relicsGained.push(selectedRelic);
            player.relics.push(selectedRelic);
          }
        }
      }
    }

    // 보상 적용
    player.gold += rewards.gold || 0;
    player.intel += rewards.intel || 0;
    player.material += rewards.material || 0;
    player.loot += rewards.loot || 0;
    player.hp = Math.min(player.maxHp, player.hp + (rewards.hp || 0));

    return { success: true, rewards, cardsGained, relicsGained };
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
