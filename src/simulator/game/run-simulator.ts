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
import type { Card } from '../../types';

const log = getLogger('RunSimulator');

// 카드 타입 분류 (전략별 선택용)
type CardCategory = 'attack' | 'defense' | 'utility';

function categorizeCard(card: Card): CardCategory {
  if (card.type === 'attack') return 'attack';
  if (card.type === 'defense' || card.type === 'reaction') return 'defense';
  return 'utility';
}

// 시작 덱 (게임과 동일 - battleData.ts의 DEFAULT_STARTING_DECK)
const DEFAULT_STARTING_DECK = [
  'shoot', 'shoot',           // 사격 2장
  'strike', 'strike', 'strike', // 타격 3장
  'reload',                   // 장전 1장
  'quarte',                   // 꺄르트 1장
  'octave',                   // 옥타브 1장
  'breach',                   // 브리치 1장
  'deflect'                   // 빠라드 1장
];

// 카드 획득 풀 (전투 보상용 - battleData.ts의 CARDS에서 발췌)
const COMBAT_REWARD_CARDS = [
  // 펜싱 카드
  'marche', 'lunge', 'fleche', 'flank', 'thrust', 'beat', 'feint',
  'defensive_stance', 'disrupt', 'redoublement', 'binding',
  // 사격 카드
  'shoot', 'aimed_shot', 'quick_shot', 'fan_the_hammer',
  // 기본 카드
  'strike', 'deflect', 'quarte', 'octave', 'breach'
];

// 상징 풀 (엘리트/보스 보상용)
const REWARD_RELICS = [
  'etherCrystal', 'etherGem', 'longCoat', 'sturdyArmor'
];

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
  private cardLibrary: Record<string, Card> = {};

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

      // 카드 데이터 로드 (CARD_LIBRARY 사용)
      const { CARD_LIBRARY } = await import('../../data/cards');
      this.shopSimulator.loadCardData(CARD_LIBRARY as any);
      this.cardLibrary = CARD_LIBRARY as Record<string, Card>;

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
      if (!nextNodeId) {
        // 다음 노드가 없으면 경로 막힘으로 처리
        if (!result.success && !result.deathCause) {
          result.deathCause = '경로 막힘';
        }
        break;
      }

      currentNodeId = nextNodeId;
      result.totalTurns++;
    }

    // HP가 0 이하이면 사망 처리
    if (player.hp <= 0 && !result.deathCause) {
      result.deathCause = '체력 소진';
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

    // 전투 시뮬레이션 (개선된 승률 공식)
    // 기본 승률: 일반 80%, 엘리트 65%, 보스 50%
    let baseWinRate = isBoss ? 0.50 : isElite ? 0.65 : 0.80;

    // 난이도 보정 (-5% per difficulty level above 1)
    const difficultyPenalty = (difficulty - 1) * 0.05;
    baseWinRate -= difficultyPenalty;

    // 덱 품질 보정 (7-15장이 최적, 그 외 페널티)
    const deckSize = player.deck.length;
    let deckBonus = 0;
    if (deckSize >= 7 && deckSize <= 15) {
      deckBonus = 0.05; // 최적 덱 크기
    } else if (deckSize < 5) {
      deckBonus = -0.05; // 너무 작은 덱 (경미한 페널티)
    } else if (deckSize > 25) {
      deckBonus = -0.1; // 너무 큰 덱
    }
    baseWinRate += deckBonus;

    // 상징 보정 (+3% per relic)
    const relicBonus = player.relics.length * 0.03;
    baseWinRate += relicBonus;

    // 스탯 보정
    const statBonus = (player.strength + player.agility + player.insight - 3) * 0.02;
    baseWinRate += statBonus;

    // 체력 보정 (50% 이하면 페널티)
    if (player.hp < player.maxHp * 0.5) {
      baseWinRate -= 0.1;
    }

    // 최종 승률 제한 (10% ~ 90%)
    const winChance = Math.min(0.90, Math.max(0.10, baseWinRate));

    const won = Math.random() < winChance;

    if (won) {
      result.success = true;
      result.details = `전투 승리 (난이도 ${difficulty})`;

      // 보상
      const goldReward = Math.floor(15 + difficulty * 10 + (isElite ? 20 : 0) + (isBoss ? 50 : 0));
      player.gold += goldReward;

      // 카드 보상: 3장 중 1장 선택 (게임과 동일)
      // 덱 크기가 20장 미만일 때만 카드 획득
      if (player.deck.length < 20) {
        const selectedCard = this.selectCardReward(player, config.strategy);
        if (selectedCard) {
          player.deck.push(selectedCard);
          result.cardsGained.push(selectedCard);
        }
      }

      // 엘리트/보스 상징 획득 (실제 상징 풀에서 선택, 중복 방지)
      if ((isElite || isBoss) && Math.random() < 0.5) {
        const availableRelics = REWARD_RELICS.filter(relicId => !player.relics.includes(relicId));

        if (availableRelics.length > 0) {
          const newRelic = availableRelics[Math.floor(Math.random() * availableRelics.length)];
          player.relics.push(newRelic);
          result.relicsGained.push(newRelic);
        }
      }

      // 피해 (승리해도 약간)
      const damageReceived = Math.floor(Math.random() * (5 + difficulty * 3));
      player.hp -= damageReceived;
    } else {
      result.success = false;
      result.details = `전투 패배 (난이도 ${difficulty})`;

      // 패배 시 피해 (적절하게 조정)
      const damageReceived = Math.floor(15 + difficulty * 5);
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

    // 덱 크기가 20장 이상이면 카드 구매 스킵
    const shouldBuyCards = player.deck.length < 20;

    // 카드 구매 스킵: 인벤토리에서 카드 제거
    const filteredInventory = shouldBuyCards ? inventory : {
      ...inventory,
      cards: [], // 덱이 충분히 크면 카드 구매 안 함
    };

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
      maxPurchases: 3, // 한 번의 상점 방문에서 최대 3개 구매 (게임과 유사)
    };

    const shopResult = this.shopSimulator.simulateShopVisit(filteredInventory, shopConfig);

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
   * 카드 보상 선택 (게임과 동일: 3장 중 1장 선택)
   * @param player 플레이어 상태
   * @param strategy 선택 전략
   * @returns 선택된 카드 ID 또는 null (스킵)
   */
  private selectCardReward(
    player: PlayerRunState,
    strategy: RunStrategy
  ): string | null {
    // 획득 가능한 카드 필터링 (덱에 2장 미만)
    const availableCards = COMBAT_REWARD_CARDS.filter(cardId => {
      const count = player.deck.filter(c => c === cardId).length;
      return count < 2;
    });

    if (availableCards.length === 0) return null;

    // 3장의 카드 제시 (중복 없이)
    const cardChoices: string[] = [];
    const shuffled = [...availableCards].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(3, shuffled.length); i++) {
      cardChoices.push(shuffled[i]);
    }

    if (cardChoices.length === 0) return null;

    // 전략에 따라 최적의 카드 선택
    return this.selectBestCard(cardChoices, strategy);
  }

  /**
   * 전략에 따른 최적 카드 선택
   */
  private selectBestCard(cardChoices: string[], strategy: RunStrategy): string {
    // 카드 라이브러리가 없으면 랜덤 선택
    if (Object.keys(this.cardLibrary).length === 0) {
      return cardChoices[Math.floor(Math.random() * cardChoices.length)];
    }

    // 각 카드에 점수 부여
    const scoredCards = cardChoices.map(cardId => {
      const card = this.cardLibrary[cardId];
      let score = 50; // 기본 점수

      if (!card) return { cardId, score };

      const category = categorizeCard(card);

      // 전략별 점수 조정
      switch (strategy) {
        case 'aggressive':
          // 공격 카드 선호
          if (category === 'attack') score += 30;
          if (card.damage && card.damage > 8) score += 15; // 높은 데미지
          if (card.speedCost && card.speedCost < 5) score += 10; // 빠른 카드
          break;

        case 'defensive':
          // 방어 카드 선호
          if (category === 'defense') score += 30;
          if (card.block && card.block > 5) score += 15; // 높은 방어력
          break;

        case 'balanced':
          // 균형 잡힌 선택
          if (category === 'attack') score += 15;
          if (category === 'defense') score += 15;
          if (category === 'utility') score += 10;
          break;

        case 'speedrun':
          // 빠른 카드 선호
          if (card.speedCost && card.speedCost < 4) score += 30;
          if (card.priority === 'quick' || card.priority === 'instant') score += 20;
          break;

        case 'treasure_hunter':
          // 유틸리티 및 특수 효과 선호
          if (category === 'utility') score += 20;
          if (card.tags?.includes('buff') || card.tags?.includes('debuff')) score += 15;
          break;
      }

      // 랜덤 요소 추가 (10%)
      score += Math.random() * 10;

      return { cardId, score };
    });

    // 가장 높은 점수의 카드 선택
    scoredCards.sort((a, b) => b.score - a.score);
    return scoredCards[0].cardId;
  }

  /**
   * 다음 노드 선택
   * 레이어 기반 진행: 현재 레이어보다 높은 레이어의 노드로만 이동
   */
  private selectNextNode(
    map: MapState,
    currentNode: MapNode,
    strategy: RunStrategy
  ): string | null {
    // 연결된 노드 중 다음 레이어 노드만 선택 (레이어 기반 진행)
    const nextLayerNodes = currentNode.connections
      .map(id => map.nodes.find(n => n.id === id))
      .filter((n): n is MapNode => n !== undefined && n.layer > currentNode.layer);

    // 다음 레이어에 노드가 없으면 같은 레이어에서 아직 방문하지 않은 노드 시도
    let availableNodes = nextLayerNodes.length > 0 ? nextLayerNodes :
      currentNode.connections
        .map(id => map.nodes.find(n => n.id === id))
        .filter((n): n is MapNode => n !== undefined && !n.cleared);

    if (availableNodes.length === 0) {
      // 마지막 시도: 맵에서 현재보다 높은 레이어의 아무 노드
      availableNodes = map.nodes.filter(n =>
        n.layer > currentNode.layer && !n.cleared
      );
    }

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
        availableNodes.sort((a, b) => b.layer - a.layer);
        return availableNodes[0]?.id || null;
    }

    // 기본: 가장 높은 레이어 우선, 그 다음 랜덤
    availableNodes.sort((a, b) => b.layer - a.layer);
    const highestLayer = availableNodes[0].layer;
    const topLayerNodes = availableNodes.filter(n => n.layer === highestLayer);
    return topLayerNodes[Math.floor(Math.random() * topLayerNodes.length)].id;
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
    deck: [...DEFAULT_STARTING_DECK], // 게임과 동일한 시작 덱 (10장)
    relics: [],
    items: [],
  };
}
