/**
 * @file run-simulator.ts
 * @description 전체 게임 런(Run) 시뮬레이터
 *
 * ## 기능
 * - 시작부터 보스전까지 전체 게임 흐름 시뮬레이션
 * - 맵 진행, 전투, 이벤트, 상점, 휴식, 던전 통합
 * - 덱 빌딩 및 아이템 획득 추적
 * - 전략별 성공률 분석
 * - 밸런스 테스트
 */

import { getLogger } from '../core/logger';
import { MapSimulator, MapState, MapNode, MapNodeType, MapSimulationConfig as MapConfig } from './map-simulator';
import { EventSimulator, EventSimulationConfig, EventOutcome } from './event-simulator';
import { ShopSimulator, ShopInventory, ShopResult, ShopSimulationConfig } from './shop-simulator';
import { RestSimulator, RestResult, RestNodeConfig } from './rest-simulator';
import { DungeonSimulator, DungeonState, DungeonExplorationResult, DungeonSimulationConfig } from './dungeon-simulator';
import { TimelineBattleEngine } from '../core/timeline-battle-engine';
import type { BattleResult, EnemyState } from '../core/game-types';

const log = getLogger('RunSimulator');

// ==================== 타입 정의 ====================

export interface PlayerRunState {
  hp: number;
  maxHp: number;
  gold: number;
  intel: number;
  material: number;
  loot: number;
  grace: number;
  strength: number;
  agility: number;
  insight: number;
  deck: string[];
  relics: string[];
  items: string[];
}

export interface RunConfig {
  /** 초기 플레이어 상태 */
  initialPlayer: PlayerRunState;
  /** 맵 설정 */
  mapLayers?: number;
  /** 난이도 */
  difficulty: number;
  /** 전략 */
  strategy: RunStrategy;
  /** 시드 (재현성) */
  seed?: number;
  /** 상세 로그 */
  verbose?: boolean;
}

export type RunStrategy = 'aggressive' | 'defensive' | 'balanced' | 'speedrun' | 'treasure_hunter';

export interface NodeResult {
  nodeId: string;
  nodeType: MapNodeType;
  success: boolean;
  hpChange: number;
  goldChange: number;
  cardsGained: string[];
  relicsGained: string[];
  details: string;
}

export interface RunResult {
  /** 런 성공 여부 */
  success: boolean;
  /** 사망 원인 (실패 시) */
  deathCause?: string;
  /** 도달한 레이어 */
  finalLayer: number;
  /** 방문한 노드 수 */
  nodesVisited: number;
  /** 전투 승리 수 */
  battlesWon: number;
  /** 전투 패배 수 */
  battlesLost: number;
  /** 이벤트 완료 수 */
  eventsCompleted: number;
  /** 상점 방문 수 */
  shopsVisited: number;
  /** 휴식 횟수 */
  restsUsed: number;
  /** 던전 클리어 수 */
  dungeonsCleared: number;
  /** 최종 플레이어 상태 */
  finalPlayerState: PlayerRunState;
  /** 노드별 결과 */
  nodeResults: NodeResult[];
  /** 총 소요 시간 (시뮬레이션) */
  totalTurns: number;
  /** 획득한 총 골드 */
  totalGoldEarned: number;
  /** 획득한 총 카드 */
  totalCardsGained: number;
}

export interface RunStatistics {
  totalRuns: number;
  successRate: number;
  avgFinalLayer: number;
  avgBattlesWon: number;
  avgGoldEarned: number;
  avgCardsInDeck: number;
  deathCauses: Record<string, number>;
  strategyComparison: Record<RunStrategy, { successRate: number; avgLayer: number }>;
}

// ==================== 런 시뮬레이터 ====================

export class RunSimulator {
  private mapSimulator: MapSimulator;
  private eventSimulator: EventSimulator;
  private shopSimulator: ShopSimulator;
  private restSimulator: RestSimulator;
  private dungeonSimulator: DungeonSimulator;
  private battleEngine: TimelineBattleEngine;

  constructor() {
    this.mapSimulator = new MapSimulator();
    this.eventSimulator = new EventSimulator({});
    this.shopSimulator = new ShopSimulator();
    this.restSimulator = new RestSimulator();
    this.dungeonSimulator = new DungeonSimulator();
    this.battleEngine = new TimelineBattleEngine({ verbose: false });

    log.info('RunSimulator initialized');
  }

  // ==================== 데이터 로드 ====================

  async loadGameData(): Promise<void> {
    try {
      // 이벤트 데이터 로드
      const { NEW_EVENT_LIBRARY } = await import('../../data/newEvents');
      this.eventSimulator.loadEvents(NEW_EVENT_LIBRARY as any);

      // 카드 데이터 로드
      const { CARDS } = await import('../../data/cards');
      this.shopSimulator.loadCardData(CARDS as any);

      // 상징 데이터 로드
      const { RELICS } = await import('../../data/relics');
      this.shopSimulator.loadRelicData(RELICS as any);

      log.info('Game data loaded successfully');
    } catch (error) {
      log.warn('Failed to load some game data', { error });
    }
  }

  // ==================== 런 시뮬레이션 ====================

  /**
   * 전체 런 시뮬레이션
   */
  simulateRun(config: RunConfig): RunResult {
    const player = { ...config.initialPlayer };
    const map = this.mapSimulator.generateMap({ layers: config.mapLayers || 11 });

    const result: RunResult = {
      success: false,
      finalLayer: 0,
      nodesVisited: 0,
      battlesWon: 0,
      battlesLost: 0,
      eventsCompleted: 0,
      shopsVisited: 0,
      restsUsed: 0,
      dungeonsCleared: 0,
      finalPlayerState: player,
      nodeResults: [],
      totalTurns: 0,
      totalGoldEarned: 0,
      totalCardsGained: 0,
    };

    // 맵 진행
    let currentNodeId = map.currentNodeId;

    while (player.hp > 0) {
      const currentNode = map.nodes.find(n => n.id === currentNodeId);
      if (!currentNode) break;

      result.finalLayer = currentNode.layer;
      result.nodesVisited++;

      // 노드 처리
      const nodeResult = this.processNode(currentNode, player, config);
      result.nodeResults.push(nodeResult);

      // 결과 반영
      if (!nodeResult.success && currentNode.type !== 'event') {
        // 전투 패배
        if (player.hp <= 0) {
          result.deathCause = `${currentNode.type} 노드에서 사망`;
          break;
        }
      }

      // 카운터 업데이트
      switch (currentNode.type) {
        case 'combat':
        case 'elite':
          if (nodeResult.success) result.battlesWon++;
          else result.battlesLost++;
          break;
        case 'boss':
          if (nodeResult.success) {
            result.battlesWon++;
            result.success = true;
          } else {
            result.battlesLost++;
            result.deathCause = '보스전 패배';
          }
          break;
        case 'event':
          result.eventsCompleted++;
          break;
        case 'shop':
          result.shopsVisited++;
          break;
        case 'rest':
          result.restsUsed++;
          break;
        case 'dungeon':
          if (nodeResult.success) result.dungeonsCleared++;
          break;
      }

      result.totalGoldEarned += nodeResult.goldChange > 0 ? nodeResult.goldChange : 0;
      result.totalCardsGained += nodeResult.cardsGained.length;

      // 보스 클리어 시 종료
      if (currentNode.type === 'boss' && nodeResult.success) {
        break;
      }

      // 다음 노드 선택
      currentNode.cleared = true;
      const nextNodeId = this.selectNextNode(map, currentNode, config.strategy);
      if (!nextNodeId) break;

      currentNodeId = nextNodeId;
      result.totalTurns++;
    }

    result.finalPlayerState = player;
    return result;
  }

  /**
   * 노드 처리
   */
  private processNode(
    node: MapNode,
    player: PlayerRunState,
    config: RunConfig
  ): NodeResult {
    const result: NodeResult = {
      nodeId: node.id,
      nodeType: node.type,
      success: true,
      hpChange: 0,
      goldChange: 0,
      cardsGained: [],
      relicsGained: [],
      details: '',
    };

    const startHp = player.hp;
    const startGold = player.gold;

    switch (node.type) {
      case 'combat':
      case 'elite':
      case 'boss':
        this.processCombatNode(node, player, config, result);
        break;

      case 'event':
        this.processEventNode(node, player, config, result);
        break;

      case 'shop':
        this.processShopNode(node, player, config, result);
        break;

      case 'rest':
        this.processRestNode(node, player, config, result);
        break;

      case 'dungeon':
        this.processDungeonNode(node, player, config, result);
        break;
    }

    result.hpChange = player.hp - startHp;
    result.goldChange = player.gold - startGold;

    return result;
  }

  /**
   * 전투 노드 처리
   */
  private processCombatNode(
    node: MapNode,
    player: PlayerRunState,
    config: RunConfig,
    result: NodeResult
  ): void {
    const difficulty = node.difficulty || 1;
    const isElite = node.type === 'elite';
    const isBoss = node.type === 'boss';

    // 적 생성 (간단한 시뮬레이션)
    const enemyHp = Math.floor(50 + difficulty * 20 + (isElite ? 30 : 0) + (isBoss ? 100 : 0));
    const enemy: EnemyState = {
      id: `enemy_${node.id}`,
      name: isBoss ? 'Boss' : isElite ? 'Elite' : 'Enemy',
      hp: enemyHp,
      maxHp: enemyHp,
      block: 0,
      ether: 0,
      tokens: {
        offensive: 0, defensive: 0, vulnerable: 0, weak: 0,
        strength: 0, dexterity: 0, focus: 0, regeneration: 0, poison: 0, burn: 0
      },
      deck: ['enemy_attack', 'enemy_defend'],
      cardsPerTurn: isElite || isBoss ? 3 : 2,
      passives: {},
    };

    // 전투 시뮬레이션 (간소화)
    const playerPower = player.deck.length * 5 + player.strength * 10 + player.relics.length * 20;
    const enemyPower = enemyHp + difficulty * 10;
    const winChance = Math.min(0.95, Math.max(0.1, 0.5 + (playerPower - enemyPower) * 0.01));

    const won = Math.random() < winChance;

    if (won) {
      result.success = true;
      result.details = `전투 승리 (난이도 ${difficulty})`;

      // 보상
      const goldReward = Math.floor(15 + difficulty * 10 + (isElite ? 20 : 0) + (isBoss ? 50 : 0));
      player.gold += goldReward;

      // 카드 획득 기회
      if (Math.random() < 0.7) {
        const newCard = `card_${Date.now()}`;
        player.deck.push(newCard);
        result.cardsGained.push(newCard);
      }

      // 엘리트/보스 상징 획득
      if ((isElite || isBoss) && Math.random() < 0.5) {
        const newRelic = `relic_${Date.now()}`;
        player.relics.push(newRelic);
        result.relicsGained.push(newRelic);
      }

      // 피해 (승리해도 약간)
      const damageReceived = Math.floor(Math.random() * (5 + difficulty * 3));
      player.hp -= damageReceived;
    } else {
      result.success = false;
      result.details = `전투 패배 (난이도 ${difficulty})`;

      // 패배 시 큰 피해
      const damageReceived = Math.floor(20 + difficulty * 10);
      player.hp -= damageReceived;
    }

    player.hp = Math.max(0, player.hp);
  }

  /**
   * 이벤트 노드 처리
   */
  private processEventNode(
    node: MapNode,
    player: PlayerRunState,
    config: RunConfig,
    result: NodeResult
  ): void {
    const events = this.eventSimulator.getInitialEvents();
    if (events.length === 0) {
      result.details = '이벤트 없음';
      return;
    }

    const randomEvent = events[Math.floor(Math.random() * events.length)];

    const eventConfig: EventSimulationConfig = {
      resources: {
        gold: player.gold,
        intel: player.intel,
        material: player.material,
        loot: player.loot,
        grace: player.grace,
        hp: player.hp,
        maxHp: player.maxHp,
      },
      stats: {
        strength: player.strength,
        agility: player.agility,
        insight: player.insight,
      },
      strategy: config.strategy === 'aggressive' ? 'greedy' : config.strategy === 'defensive' ? 'safe' : 'balanced',
    };

    const eventResult = this.eventSimulator.simulateEvent(randomEvent.id, eventConfig);

    if (eventResult) {
      result.success = eventResult.success;
      result.details = eventResult.description || `이벤트: ${randomEvent.title}`;

      // 자원 변경 적용
      player.gold += eventResult.resourceChanges.gold || 0;
      player.intel += eventResult.resourceChanges.intel || 0;
      player.material += eventResult.resourceChanges.material || 0;
    }
  }

  /**
   * 상점 노드 처리
   */
  private processShopNode(
    node: MapNode,
    player: PlayerRunState,
    config: RunConfig,
    result: NodeResult
  ): void {
    const inventory = this.shopSimulator.generateShopInventory('shop');

    const shopConfig: ShopSimulationConfig = {
      player: {
        gold: player.gold,
        hp: player.hp,
        maxHp: player.maxHp,
        deck: player.deck,
        relics: player.relics,
        items: player.items,
      },
      strategy: config.strategy === 'aggressive' ? 'value' : 'survival',
      reserveGold: 30,
    };

    const shopResult = this.shopSimulator.simulateShopVisit(inventory, shopConfig);

    player.gold = shopResult.remainingGold;
    player.deck = shopResult.finalPlayerState.deck;
    player.relics = shopResult.finalPlayerState.relics;
    player.items = shopResult.finalPlayerState.items;
    player.hp = shopResult.finalPlayerState.hp;

    result.success = true;
    result.cardsGained = shopResult.purchases.filter(p => p.type === 'card').map(p => p.id);
    result.relicsGained = shopResult.purchases.filter(p => p.type === 'relic').map(p => p.id);
    result.details = `상점: ${shopResult.purchases.length}개 구매, ${shopResult.totalSpent}골드 사용`;
  }

  /**
   * 휴식 노드 처리
   */
  private processRestNode(
    node: MapNode,
    player: PlayerRunState,
    config: RunConfig,
    result: NodeResult
  ): void {
    const restConfig: RestNodeConfig = {
      healAmount: 0.3,
      canUpgrade: true,
      canRemove: true,
      canSmith: false,
      canMeditate: false,
      canScout: false,
    };

    const restResult = this.restSimulator.simulateRest({
      player: {
        hp: player.hp,
        maxHp: player.maxHp,
        deck: player.deck,
        relics: player.relics,
        gold: player.gold,
        strength: player.strength,
        agility: player.agility,
        insight: player.insight,
      },
      nodeConfig: restConfig,
      strategy: config.strategy === 'aggressive' ? 'upgrade_priority' : 'heal_priority',
    });

    player.hp = restResult.finalPlayerState.hp;
    player.deck = restResult.finalPlayerState.deck;

    result.success = true;
    result.details = restResult.reason;
  }

  /**
   * 던전 노드 처리
   */
  private processDungeonNode(
    node: MapNode,
    player: PlayerRunState,
    config: RunConfig,
    result: NodeResult
  ): void {
    const dungeon = this.dungeonSimulator.generateDungeon({
      mainPathLength: 5,
      difficulty: node.difficulty || 1,
    });

    const dungeonConfig: DungeonSimulationConfig = {
      player: {
        hp: player.hp,
        maxHp: player.maxHp,
        gold: player.gold,
        intel: player.intel,
        material: player.material,
        loot: player.loot,
        strength: player.strength,
        agility: player.agility,
        insight: player.insight,
        items: player.items,
        deck: player.deck,
        relics: player.relics,
      },
      strategy: config.strategy === 'speedrun' ? 'speedrun' : 'explore_all',
    };

    const dungeonResult = this.dungeonSimulator.simulateDungeonExploration(dungeon, dungeonConfig);

    // 결과 적용
    player.hp = dungeonResult.finalPlayerState.hp;
    player.gold = dungeonResult.finalPlayerState.gold;
    player.material = dungeonResult.finalPlayerState.material;
    player.loot = dungeonResult.finalPlayerState.loot;

    result.success = dungeonResult.exitReached;
    result.details = `던전: ${dungeonResult.nodesVisited}/${dungeonResult.totalNodes} 탐험, ${dungeonResult.combatsWon} 전투 승리`;
  }

  /**
   * 다음 노드 선택
   */
  private selectNextNode(
    map: MapState,
    currentNode: MapNode,
    strategy: RunStrategy
  ): string | null {
    const availableNodes = currentNode.connections
      .map(id => map.nodes.find(n => n.id === id))
      .filter((n): n is MapNode => n !== undefined && !n.cleared);

    if (availableNodes.length === 0) return null;

    // 전략별 우선순위
    switch (strategy) {
      case 'aggressive':
        const combatNode = availableNodes.find(n => n.type === 'elite' || n.type === 'combat');
        if (combatNode) return combatNode.id;
        break;

      case 'defensive':
        const safeNode = availableNodes.find(n => n.type === 'rest' || n.type === 'shop');
        if (safeNode) return safeNode.id;
        const nonElite = availableNodes.filter(n => n.type !== 'elite');
        if (nonElite.length > 0) return nonElite[0].id;
        break;

      case 'treasure_hunter':
        const dungeonNode = availableNodes.find(n => n.type === 'dungeon');
        if (dungeonNode) return dungeonNode.id;
        const eventNode = availableNodes.find(n => n.type === 'event');
        if (eventNode) return eventNode.id;
        break;

      case 'speedrun':
        // 가장 빠른 경로 (보스 방향)
        const bossDistance = (nodeId: string): number => {
          const node = map.nodes.find(n => n.id === nodeId);
          return node ? map.nodes.length - node.layer : 999;
        };
        availableNodes.sort((a, b) => bossDistance(a.id) - bossDistance(b.id));
        return availableNodes[0]?.id || null;
    }

    // 기본: 랜덤
    return availableNodes[Math.floor(Math.random() * availableNodes.length)].id;
  }

  // ==================== 통계 ====================

  /**
   * 다중 런 시뮬레이션 및 통계
   */
  simulateMultipleRuns(
    config: RunConfig,
    count: number
  ): RunStatistics {
    const results: RunResult[] = [];
    const deathCauses: Record<string, number> = {};

    for (let i = 0; i < count; i++) {
      const runResult = this.simulateRun({
        ...config,
        initialPlayer: { ...config.initialPlayer },
      });
      results.push(runResult);

      if (!runResult.success && runResult.deathCause) {
        deathCauses[runResult.deathCause] = (deathCauses[runResult.deathCause] || 0) + 1;
      }
    }

    const successfulRuns = results.filter(r => r.success);

    return {
      totalRuns: count,
      successRate: successfulRuns.length / count,
      avgFinalLayer: results.reduce((sum, r) => sum + r.finalLayer, 0) / count,
      avgBattlesWon: results.reduce((sum, r) => sum + r.battlesWon, 0) / count,
      avgGoldEarned: results.reduce((sum, r) => sum + r.totalGoldEarned, 0) / count,
      avgCardsInDeck: results.reduce((sum, r) => sum + r.finalPlayerState.deck.length, 0) / count,
      deathCauses,
      strategyComparison: {
        [config.strategy]: {
          successRate: successfulRuns.length / count,
          avgLayer: results.reduce((sum, r) => sum + r.finalLayer, 0) / count,
        },
      } as Record<RunStrategy, { successRate: number; avgLayer: number }>,
    };
  }

  /**
   * 전략 비교 분석
   */
  async compareStrategies(
    baseConfig: Omit<RunConfig, 'strategy'>,
    runsPerStrategy: number = 100
  ): Promise<Record<RunStrategy, RunStatistics>> {
    const strategies: RunStrategy[] = ['aggressive', 'defensive', 'balanced', 'speedrun', 'treasure_hunter'];
    const results: Record<RunStrategy, RunStatistics> = {} as any;

    for (const strategy of strategies) {
      results[strategy] = this.simulateMultipleRuns(
        { ...baseConfig, strategy },
        runsPerStrategy
      );
      log.info(`Strategy ${strategy}: ${(results[strategy].successRate * 100).toFixed(1)}% success rate`);
    }

    return results;
  }
}

// ==================== 헬퍼 함수 ====================

export async function createRunSimulator(): Promise<RunSimulator> {
  const simulator = new RunSimulator();
  await simulator.loadGameData();
  return simulator;
}

/**
 * 기본 플레이어 상태 생성
 */
export function createDefaultPlayer(): PlayerRunState {
  return {
    hp: 80,
    maxHp: 80,
    gold: 100,
    intel: 0,
    material: 0,
    loot: 0,
    grace: 1,
    strength: 1,
    agility: 1,
    insight: 1,
    deck: ['strike', 'strike', 'strike', 'defend', 'defend'],
    relics: [],
    items: [],
  };
}
