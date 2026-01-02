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

import { getLogger, setLogLevel, LogLevel } from '../core/logger';
import { MapSimulator, MapState, MapNode, MapNodeType, MapSimulationConfig as MapConfig } from './map-simulator';
import { EventSimulator, EventSimulationConfig, EventOutcome } from './event-simulator';
import { ShopSimulator, ShopInventory, ShopResult, ShopSimulationConfig } from './shop-simulator';
import { RestSimulator, RestResult, RestNodeConfig } from './rest-simulator';
import { DungeonSimulator, DungeonState, DungeonExplorationResult, DungeonSimulationConfig } from './dungeon-simulator';
import { TimelineBattleEngine } from '../core/timeline-battle-engine';
import { EnhancedBattleProcessor, type EnhancedBattleResult } from '../core/enhanced-battle-processor';
import { GrowthSystem, createGrowthSystem, applyGrowthBonuses, type GrowthState, type GrowthBonuses } from '../core/growth-system';
import { createComboOptimizer, type ComboOptimizer } from '../ai/combo-optimizer';
import { DeckBuildingAI, mapRunStrategyToDeckStrategy } from '../ai/deck-building-ai';
import { SeededRandom, initGlobalRandom, getGlobalRandom, resetGlobalRandom, getCurrentSeed } from '../core/seeded-random';
import { StatsCollector } from '../analysis/detailed-stats';
import type { BattleResult, EnemyState, TokenState, GameCard } from '../core/game-types';
import type { Card } from '../../types';
import type { Item, ItemEffect } from '../../data/items';

// 적 정의 타입 (battleData.ts에서 가져옴)
interface EnemyDefinition {
  id: string;
  name: string;
  hp: number;
  ether?: number;
  speed?: number;
  maxSpeed: number;
  deck: string[];
  cardsPerTurn: number;
  emoji?: string;
  tier: number;
  description?: string;
  isBoss?: boolean;
  passives?: {
    veilAtStart?: boolean;
    healPerTurn?: number;
    strengthPerTurn?: number;
    critBoostAtStart?: number;
    summonOnHalfHp?: boolean;
  };
}

// 적 그룹 정의 타입 (다중 적 전투용)
interface EnemyGroup {
  id: string;
  name: string;
  tier: number;
  nodeRange?: [number, number];
  enemies: string[];
  isBoss?: boolean;
}

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
  /** 강화된 카드 목록 (카드 ID 배열) */
  upgradedCards: string[];
  /** 피라미드 성장 상태 */
  growth?: GrowthState;
  /** 개성 목록 */
  traits?: string[];
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
  /** 활성화된 이변 ID */
  anomalyId?: string;
  /** 맵 위험도 (이변 레벨 계산용, 0-4) */
  mapRisk?: number;
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
  private enhancedBattleProcessor: EnhancedBattleProcessor;
  private comboOptimizer: ComboOptimizer | null = null;
  private deckBuildingAI: DeckBuildingAI | null = null;
  private cardLibrary: Record<string, Card> = {};
  private gameCardLibrary: Record<string, GameCard> = {};
  private enemyLibrary: EnemyDefinition[] = [];
  private enemyGroupLibrary: EnemyGroup[] = [];
  private itemLibrary: Record<string, Item> = {};
  private useBattleEngine: boolean = true; // 실제 전투 엔진 사용 여부
  private useEnhancedBattle: boolean = true; // 향상된 전투 시스템 사용
  private statsCollector: StatsCollector | null = null; // 상세 통계 수집기
  private random: SeededRandom; // 시드 기반 난수 생성기

  constructor(options?: { verbose?: boolean; useEnhancedBattle?: boolean; seed?: number }) {
    // 시드 기반 난수 생성기 초기화
    this.random = new SeededRandom(options?.seed);

    this.mapSimulator = new MapSimulator();
    this.eventSimulator = new EventSimulator({});
    this.shopSimulator = new ShopSimulator();
    this.restSimulator = new RestSimulator();
    this.dungeonSimulator = new DungeonSimulator();
    this.battleEngine = new TimelineBattleEngine({ verbose: options?.verbose ?? false });
    this.enhancedBattleProcessor = new EnhancedBattleProcessor({
      verbose: options?.verbose ?? false,
      useMultiEnemy: true,
      useChainSystem: true,
      useEnhancedTokens: true,
      useComboOptimizer: true,
    });
    this.useEnhancedBattle = options?.useEnhancedBattle ?? true;

    log.info('RunSimulator initialized', { seed: this.random.getSeed() });
  }

  /**
   * 현재 시드 반환
   */
  getSeed(): number {
    return this.random.getSeed();
  }

  /**
   * 시드 리셋
   */
  resetSeed(seed?: number): void {
    this.random.reset(seed);
  }

  /**
   * 상세 통계 수집기 설정
   * 설정하면 시뮬레이션 중 모든 전투, 이벤트, 상점, 던전 데이터가 기록됨
   */
  setStatsCollector(collector: StatsCollector | null): void {
    this.statsCollector = collector;
  }

  /**
   * 현재 설정된 통계 수집기 반환
   */
  getStatsCollector(): StatsCollector | null {
    return this.statsCollector;
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
      this.shopSimulator.loadFullCardLibrary(CARD_LIBRARY as Record<string, Card>);
      this.cardLibrary = CARD_LIBRARY as Record<string, Card>;
      this.gameCardLibrary = CARD_LIBRARY as unknown as Record<string, GameCard>;

      // 향상된 전투 처리기에 카드 라이브러리 설정
      this.enhancedBattleProcessor.setCardLibrary(this.gameCardLibrary);

      // 콤보 최적화기 생성
      this.comboOptimizer = createComboOptimizer(this.gameCardLibrary, {
        comboWeight: 0.4,
        combatWeight: 0.6,
      });

      // 덱 빌딩 AI 생성
      this.deckBuildingAI = new DeckBuildingAI(this.cardLibrary, 'balanced');

      // 상징 데이터 로드
      const { RELICS } = await import('../../data/relics');
      this.shopSimulator.loadRelicData(RELICS as any);

      // 적 데이터 로드
      const { ENEMIES, ENEMY_GROUPS } = await import('../../components/battle/battleData');
      this.enemyLibrary = ENEMIES as EnemyDefinition[];
      this.enemyGroupLibrary = ENEMY_GROUPS as EnemyGroup[];

      // 아이템 데이터 로드
      const { ITEMS } = await import('../../data/items');
      this.itemLibrary = ITEMS as Record<string, Item>;
      this.shopSimulator.loadItemData(ITEMS as any);

      log.info('Game data loaded successfully', {
        events: Object.keys(NEW_EVENT_LIBRARY).length,
        cards: Object.keys(CARD_LIBRARY).length,
        enemies: this.enemyLibrary.length,
        enemyGroups: this.enemyGroupLibrary.length,
        items: Object.keys(this.itemLibrary).length
      });
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

    // 통계 수집기 런 시작 초기화
    if (this.statsCollector) {
      this.statsCollector.startNewRun();
    }

    // 피라미드 성장 시스템 초기화
    const growthSystem = createGrowthSystem(player.growth);

    // 초기 개성 설정 (전략에 따라)
    this.initializeTraits(growthSystem, config.strategy);

    // 성장 보너스 적용
    const growthBonuses = growthSystem.calculateBonuses();
    this.applyGrowthBonusesToPlayer(player, growthBonuses);

    // 성장 상태 저장
    player.growth = growthSystem.getState();

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

    // 런 전체 통계 기록
    if (this.statsCollector) {
      this.statsCollector.recordRunExtended({
        success: result.success,
        layer: result.finalLayer,
        battlesWon: result.battlesWon,
        gold: result.totalGoldEarned,
        deckSize: player.deck.length,
        deathCause: result.deathCause,
        strategy: config.strategy,
        upgradedCards: player.upgradedCards,
        shopsVisited: result.shopsVisited,
        dungeonsCleared: result.dungeonsCleared,
        growthLevel: (player.growth as { level?: number } | undefined)?.level || 0,
        eventsCompleted: result.eventsCompleted,
      });

      // 기록 통계 (연승, 빠른 클리어, 덱 구성) 기록
      this.statsCollector.recordRunComplete({
        success: result.success,
        battlesWon: result.battlesWon,
        deckSize: player.deck.length,
        strategy: config.strategy,
        gold: result.totalGoldEarned,
        deck: player.deck,
      });

      // 난이도별 통계 기록
      this.statsCollector.recordDifficultyRun(
        config.difficulty,
        result.success,
        result.layerReached
      );

      // 성장 통계 기록
      const growthState = player.growth as GrowthState | undefined;
      if (growthState) {
        this.statsCollector.recordGrowthRunEnd({
          success: result.success,
          finalStats: {
            strength: player.strength || 0,
            agility: player.agility || 0,
            insight: player.insight || 0,
          },
          finalLevel: growthState.pyramidLevel || 0,
        });
      }

      // 카드 사용 통계 마무리
      this.statsCollector.finalizeRunCardStats(player.deck);
    }

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

    // 층별 스냅샷 기록
    if (this.statsCollector) {
      this.statsCollector.recordFloorSnapshot({
        floor: node.layer,
        nodeType: node.type,
        hp: player.hp,
        maxHp: player.maxHp,
        gold: player.gold,
        deckSize: player.deck.length,
        relicCount: player.relics.length,
      });
    }

    return result;
  }

  /**
   * 적 그룹 선택 (노드 기반, 다중 적 지원)
   */
  private selectEnemyGroup(nodeType: MapNodeType, layer: number): EnemyState[] {
    // 기본 적 (라이브러리가 없을 때)
    const defaultEnemy = (): EnemyState => ({
      id: 'ghoul',
      name: '구울',
      hp: 40,
      maxHp: 40,
      block: 0,
      tokens: {},
      maxSpeed: 10,
      deck: ['ghoul_attack', 'ghoul_attack', 'ghoul_block', 'ghoul_block'],
      cardsPerTurn: 2,
      passives: {},
    });

    if (this.enemyLibrary.length === 0) {
      return [defaultEnemy()];
    }

    // 보스/엘리트는 단일 적
    if (nodeType === 'boss') {
      const bosses = this.enemyLibrary.filter(e => e.isBoss === true);
      if (bosses.length > 0) {
        const boss = getGlobalRandom().pick(bosses);
        return [this.convertToEnemyState(boss)];
      }
      return [defaultEnemy()];
    }

    if (nodeType === 'elite') {
      const elites = this.enemyLibrary.filter(e => e.tier === 2 && !e.isBoss);
      if (elites.length > 0) {
        const elite = getGlobalRandom().pick(elites);
        return [this.convertToEnemyState(elite)];
      }
      return [defaultEnemy()];
    }

    // 일반 전투: 적 그룹 사용 (노드 범위 기반)
    if (this.enemyGroupLibrary.length > 0) {
      const validGroups = this.enemyGroupLibrary.filter(g => {
        if (!g.nodeRange || g.isBoss) return false;
        const [min, max] = g.nodeRange;
        return layer >= min && layer <= max && g.tier === 1;
      });

      if (validGroups.length > 0) {
        const selectedGroup = getGlobalRandom().pick(validGroups);
        const enemies: EnemyState[] = [];

        for (const enemyId of selectedGroup.enemies) {
          const enemyDef = this.enemyLibrary.find(e => e.id === enemyId);
          if (enemyDef) {
            enemies.push(this.convertToEnemyState(enemyDef));
          }
        }

        if (enemies.length > 0) {
          return enemies;
        }
      }
    }

    // 폴백: 단일 적 선택
    const tier1Enemies = this.enemyLibrary.filter(e => e.tier === 1 && !e.isBoss);
    if (tier1Enemies.length > 0) {
      const enemy = getGlobalRandom().pick(tier1Enemies);
      return [this.convertToEnemyState(enemy)];
    }

    return [defaultEnemy()];
  }

  /**
   * EnemyDefinition을 EnemyState로 변환
   */
  private convertToEnemyState(def: EnemyDefinition): EnemyState {
    return {
      id: def.id,
      name: def.name,
      hp: def.hp,
      maxHp: def.hp,
      block: 0,
      tokens: {},
      maxSpeed: def.maxSpeed,
      deck: [...def.deck],
      cardsPerTurn: def.cardsPerTurn,
      passives: def.passives || {},
    };
  }

  /**
   * 단일 적 선택 (하위 호환성)
   */
  private selectEnemy(nodeType: MapNodeType, layer: number): EnemyState {
    return this.selectEnemyGroup(nodeType, layer)[0];
  }

  /**
   * 던전 전투용 적 생성 (난이도 기반)
   */
  private createDungeonEnemy(difficulty: number): EnemyState {
    // 던전에서 등장할 수 있는 적 목록 (난이도별)
    const dungeonEnemies: { minDiff: number; enemies: string[] }[] = [
      { minDiff: 1, enemies: ['ghoul', 'skeleton', 'bandit'] },
      { minDiff: 2, enemies: ['skeleton', 'bandit', 'slime'] },
      { minDiff: 3, enemies: ['bandit', 'cultist', 'undead_soldier'] },
    ];

    // 난이도에 맞는 적 풀 선택
    const pool = dungeonEnemies
      .filter(p => difficulty >= p.minDiff)
      .flatMap(p => p.enemies);
    const selectedId = pool.length > 0
      ? getGlobalRandom().pick(pool)
      : 'ghoul';

    // 적 라이브러리에서 찾기
    const enemyDef = this.enemyLibrary.find(e => e.id === selectedId);
    if (enemyDef) {
      const enemy = this.convertToEnemyState(enemyDef);
      // 난이도에 따른 HP 조정 (던전 몬스터는 약간 약함)
      const hpMultiplier = 0.8 + (difficulty - 1) * 0.1;
      enemy.hp = Math.floor(enemy.hp * hpMultiplier);
      enemy.maxHp = enemy.hp;
      return enemy;
    }

    // 기본 던전 적 (폴백)
    const baseHp = 25 + difficulty * 10;
    return {
      id: 'dungeon_mob',
      name: '던전 몬스터',
      hp: baseHp,
      maxHp: baseHp,
      block: 0,
      tokens: {},
      maxSpeed: 8,
      deck: ['ghoul_attack', 'ghoul_attack', 'ghoul_block'],
      cardsPerTurn: 1 + Math.floor(difficulty / 2),
      passives: {},
    };
  }

  /**
   * 전투 노드 처리 (TimelineBattleEngine 통합, 다중 적 지원)
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

    // 적 그룹 선택 (다중 적 지원)
    const enemies = this.selectEnemyGroup(node.type, node.layer);

    // 난이도에 따른 적 강화
    if (difficulty > 1) {
      const hpMultiplier = 1 + (difficulty - 1) * 0.15; // 난이도당 15% HP 증가
      for (const enemy of enemies) {
        enemy.hp = Math.floor(enemy.hp * hpMultiplier);
        enemy.maxHp = enemy.hp;
      }
    }

    // 전투 전 아이템 사용 (위기 상황에서)
    this.useItemsBeforeBattle(player, config.strategy, isElite || isBoss);

    let totalBattleResult: BattleResult | EnhancedBattleResult | null = null;
    let wonAllBattles = true;
    const enemyNames: string[] = enemies.map(e => e.name);

    // 카드 강화 정보 생성
    const cardEnhancements = this.buildCardEnhancements(player.upgradedCards);

    // 다중 적 전투 (향상된 전투 시스템 사용)
    if (this.useEnhancedBattle && enemies.length > 1) {
      // EnhancedBattleProcessor로 다중 적 동시 전투
      const enhancedResult = this.enhancedBattleProcessor.runMultiEnemyBattle(
        player.deck,
        player.relics,
        enemies,
        config.anomalyId, // 이변 ID 전달
        cardEnhancements
      );

      totalBattleResult = enhancedResult;
      wonAllBattles = enhancedResult.winner === 'player';

      if (wonAllBattles) {
        player.hp = Math.max(1, enhancedResult.playerFinalHp);
      } else {
        player.hp = 0;
      }

      log.debug(`다중 적 전투 완료: 연계 ${enhancedResult.chainsCompleted}회, 최대 연계 ${enhancedResult.maxChainLength}단`);
    } else {
      // 단일 적 또는 기존 방식 전투
      for (const enemy of enemies) {
        if (player.hp <= 0) {
          wonAllBattles = false;
          break;
        }

        let battleResult: BattleResult;

        // 실제 전투 엔진 사용 (적 데이터가 있을 때)
        if (this.useBattleEngine && this.enemyLibrary.length > 0) {
          battleResult = this.battleEngine.runBattle(
            player.deck,
            player.relics,
            enemy,
            config.anomalyId, // 이변 ID 전달
            cardEnhancements // 카드 강화 레벨 전달
          );
        } else {
          // 폴백: 확률 기반 시뮬레이션
          battleResult = this.simulateCombatFallback(player, enemy, isElite, isBoss, difficulty);
        }

        if (battleResult.winner === 'player') {
          // 전투 승리 - 피해 적용 후 다음 적과 전투
          player.hp = Math.max(1, battleResult.playerFinalHp);
          totalBattleResult = battleResult;

          // 무피해 전투 승리 기록
          if (this.statsCollector && battleResult.enemyDamageDealt === 0) {
            this.statsCollector.recordFlawlessVictory(isBoss);
          }

          // 최고 피해 기록 (턴당 최대 피해 근사)
          if (this.statsCollector && battleResult.playerDamageDealt > 0) {
            const avgDamagePerTurn = battleResult.turns > 0
              ? battleResult.playerDamageDealt / battleResult.turns
              : battleResult.playerDamageDealt;
            // 턴당 평균 피해의 2배를 최대 턴 피해로 근사
            const estimatedMaxTurnDamage = Math.floor(avgDamagePerTurn * 2);
            if (estimatedMaxTurnDamage > 0) {
              this.statsCollector.recordTurnDamage(
                estimatedMaxTurnDamage,
                'combo', // 여러 카드 조합
                enemy.name || 'unknown'
              );
            }
          }
        } else {
          // 전투 패배
          wonAllBattles = false;
          player.hp = 0;
          totalBattleResult = battleResult;
          break;
        }
      }
    }

    const displayName = enemies.length > 1
      ? `${enemyNames[0]} 외 ${enemies.length - 1}명`
      : enemyNames[0] || '적';

    if (wonAllBattles && totalBattleResult) {
      result.success = true;
      result.details = `전투 승리 vs ${displayName} (${totalBattleResult.turns}턴)`;

      // 보상 (적 수에 비례)
      const baseGold = 15 + difficulty * 10 + (isElite ? 20 : 0) + (isBoss ? 50 : 0);
      const goldReward = Math.floor(baseGold * (1 + (enemies.length - 1) * 0.3));
      player.gold += goldReward;

      // 카드 보상: 3장 중 1장 선택 (게임과 동일)
      if (player.deck.length < 20) {
        const selectedCard = this.selectCardReward(player, config.strategy);
        if (selectedCard) {
          player.deck.push(selectedCard);
          result.cardsGained.push(selectedCard);
        }
      }

      // 엘리트/보스 상징 획득
      if ((isElite || isBoss) && getGlobalRandom().chance(0.5)) {
        const availableRelics = REWARD_RELICS.filter(relicId => !player.relics.includes(relicId));
        if (availableRelics.length > 0) {
          const newRelic = getGlobalRandom().pick(availableRelics);
          player.relics.push(newRelic);
          result.relicsGained.push(newRelic);
        }
      }
    } else {
      result.success = false;
      result.details = `전투 패배 vs ${displayName} (${totalBattleResult?.turns || 0}턴)`;

      // 사망 분석 기록
      if (this.statsCollector && totalBattleResult) {
        const lastEnemy = enemies[enemies.length - 1] || { id: 'unknown', name: '알 수 없음' };
        this.statsCollector.recordDeath({
          floor: node.layer,
          enemyId: lastEnemy.id,
          enemyName: lastEnemy.name,
          finalHp: 0,
          overkillDamage: Math.abs(player.hp), // 초과 피해량
          turnsBeforeDeath: totalBattleResult.turns,
          lastHandCards: [], // 시뮬레이터에서는 핸드 정보 없음
          deck: player.deck,
          relics: player.relics,
          hpHistory: [], // 시뮬레이터에서는 HP 히스토리 없음
        });
      }

      player.hp = 0;
    }

    // 통계 기록 (각 적별로)
    if (this.statsCollector && totalBattleResult) {
      for (const enemy of enemies) {
        this.statsCollector.recordBattle(totalBattleResult, {
          id: enemy.id,
          name: enemy.name,
          tier: isBoss ? 3 : isElite ? 2 : 1,
          isBoss,
          isElite,
        });
      }
    }
  }

  /**
   * 카드 강화 정보를 Record<string, number>로 변환
   * @param upgradedCards 강화된 카드 ID 배열
   * @returns 카드ID -> 강화레벨 맵
   */
  private buildCardEnhancements(upgradedCards: string[]): Record<string, number> {
    const enhancements: Record<string, number> = {};
    for (const cardId of upgradedCards) {
      // 각 강화마다 레벨 1씩 증가 (최대 5)
      enhancements[cardId] = Math.min(5, (enhancements[cardId] || 0) + 1);
    }
    return enhancements;
  }

  /**
   * 전투 전 아이템 사용
   */
  private useItemsBeforeBattle(
    player: PlayerRunState,
    strategy: RunStrategy,
    isDifficultBattle: boolean
  ): void {
    if (player.items.length === 0) return;

    // HP가 40% 이하이거나 어려운 전투일 때 아이템 사용 고려
    const hpRatio = player.hp / player.maxHp;
    const shouldUseItems = hpRatio < 0.4 || isDifficultBattle;

    if (!shouldUseItems) return;

    // 사용할 아이템 선택
    const itemsToUse: { itemId: string; hpHealed?: number; specialEffect?: string }[] = [];

    for (const itemId of player.items) {
      const item = this.itemLibrary[itemId];
      if (!item) continue;

      // 힐 아이템: HP가 낮을 때 사용
      if (item.effect.type === 'healPercent' && hpRatio < 0.5) {
        const healAmount = Math.floor(player.maxHp * (item.effect.value / 100));
        player.hp = Math.min(player.maxHp, player.hp + healAmount);
        itemsToUse.push({ itemId, hpHealed: healAmount });
      }

      // 방어 아이템: 어려운 전투 전 사용
      if (item.effect.type === 'defense' && isDifficultBattle) {
        itemsToUse.push({ itemId, specialEffect: 'defense' });
      }

      // 공격 강화: 어려운 전투 전 사용
      if (item.effect.type === 'grantTokens' && isDifficultBattle) {
        itemsToUse.push({ itemId, specialEffect: 'grantTokens' });
      }

      // 최대 2개 아이템 사용
      if (itemsToUse.length >= 2) break;
    }

    // 사용한 아이템 제거 및 통계 기록
    for (const usedItem of itemsToUse) {
      const idx = player.items.indexOf(usedItem.itemId);
      if (idx !== -1) {
        player.items.splice(idx, 1);
      }

      // 통계 기록
      if (this.statsCollector) {
        this.statsCollector.recordItemUsed({
          itemId: usedItem.itemId,
          inBattle: false, // 전투 전 사용
          hpHealed: usedItem.hpHealed,
          specialEffect: usedItem.specialEffect,
        });
      }
    }
  }

  /**
   * 폴백: 확률 기반 전투 시뮬레이션 (전투 엔진을 사용할 수 없을 때)
   */
  private simulateCombatFallback(
    player: PlayerRunState,
    enemy: EnemyState,
    isElite: boolean,
    isBoss: boolean,
    difficulty: number
  ): BattleResult {
    // 기본 승률
    let baseWinRate = isBoss ? 0.50 : isElite ? 0.65 : 0.80;

    // 난이도 보정
    baseWinRate -= (difficulty - 1) * 0.05;

    // 덱/상징 보정
    const deckSize = player.deck.length;
    if (deckSize >= 7 && deckSize <= 15) baseWinRate += 0.05;
    else if (deckSize > 25) baseWinRate -= 0.1;

    baseWinRate += player.relics.length * 0.03;

    // 최종 승률 제한
    const winChance = Math.min(0.90, Math.max(0.10, baseWinRate));
    const rng = getGlobalRandom();
    const won = rng.chance(winChance);

    const turns = rng.nextInt(3, 7);
    const damageReceived = won
      ? rng.nextInt(0, 10 + difficulty * 3 - 1)
      : player.hp;

    return {
      winner: won ? 'player' : 'enemy',
      turns,
      playerDamageDealt: enemy.maxHp - (won ? 0 : rng.nextInt(0, enemy.maxHp - 1)),
      enemyDamageDealt: damageReceived,
      playerFinalHp: Math.max(0, player.hp - damageReceived),
      enemyFinalHp: won ? 0 : rng.nextInt(0, enemy.maxHp - 1),
      etherGained: won ? rng.nextInt(20, 49) : 0,
      goldChange: 0,
      battleLog: [],
      events: [],
      cardUsage: {},
      comboStats: {},
      tokenStats: {},
      timeline: [],
    };
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

    const randomEvent = getGlobalRandom().pick(events);

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
      const goldChange = eventResult.resourceChanges.gold || 0;
      const hpChange = eventResult.resourceChanges.hp || 0;
      const intelChange = eventResult.resourceChanges.intel || 0;
      const insightChange = eventResult.resourceChanges.insight || 0;
      const materialChange = eventResult.resourceChanges.material || 0;
      const graceChange = eventResult.resourceChanges.grace || 0;

      player.gold += goldChange;
      player.intel += intelChange;
      player.material += materialChange;
      player.insight += insightChange;
      if (hpChange !== 0) {
        player.hp = Math.min(player.maxHp, Math.max(0, player.hp + hpChange));
      }

      // 카드 획득 적용
      const cardsGained = eventResult.cardsGained || [];
      for (const cardId of cardsGained) {
        if (cardId && cardId !== 'curse' && cardId !== 'blessing') {
          player.deck.push(cardId);
          result.cardsGained.push(cardId);
        }
      }

      // 상징 획득 적용
      const relicsGained = eventResult.relicsGained || [];
      for (const relicId of relicsGained) {
        if (relicId && !player.relics.includes(relicId)) {
          player.relics.push(relicId);
          result.relicsGained.push(relicId);
        }
      }

      // 통계 기록
      if (this.statsCollector) {
        // 이벤트 기본 기록 (모든 자원 변화 포함)
        this.statsCollector.recordEvent(
          randomEvent.id,
          randomEvent.title || randomEvent.id,
          eventResult.success,
          hpChange,
          goldChange,
          cardsGained,
          relicsGained,
          eventResult.resourceChanges // 모든 자원 변화 전달
        );

        // 이벤트 선택 상세 기록
        this.statsCollector.recordEventChoice({
          eventId: randomEvent.id,
          eventName: randomEvent.title || randomEvent.id,
          choiceId: eventResult.choiceId || 'choice_1',
          choiceName: eventResult.choiceName || eventResult.choiceLabel || '선택',
          success: eventResult.success,
          hpChange,
          goldChange,
          cardsGained,
          relicsGained,
        });
      }
    } else {
      // 이벤트 스킵 기록
      if (this.statsCollector) {
        this.statsCollector.recordEventSkipped({
          eventId: randomEvent.id,
          eventName: randomEvent.title || randomEvent.id,
          reason: '조건 미충족',
        });
      }
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

    // 전략 기반 카드 필터링
    const filteredCards = this.filterShopCards(inventory.cards, player, config.strategy);

    const filteredInventory = {
      ...inventory,
      cards: filteredCards,
    };

    const shopConfig: ShopSimulationConfig = {
      player: {
        gold: player.gold,
        hp: player.hp,
        maxHp: player.maxHp,
        deck: [...player.deck],
        relics: [...player.relics],
        items: [...player.items],
        upgradedCards: [...player.upgradedCards],
      },
      strategy: config.strategy === 'aggressive' ? 'value' : 'survival',
      reserveGold: 30,
      maxPurchases: 3, // 한 번의 상점 방문에서 최대 3개 구매
      runStrategy: config.strategy, // 덱 빌딩 AI용 전략
    };

    const shopResult = this.shopSimulator.simulateShopVisit(filteredInventory, shopConfig);

    player.gold = shopResult.remainingGold;
    player.deck = shopResult.finalPlayerState.deck;
    player.relics = shopResult.finalPlayerState.relics;
    player.items = shopResult.finalPlayerState.items;
    player.hp = shopResult.finalPlayerState.hp;
    // 강화된 카드 동기화
    if (shopResult.finalPlayerState.upgradedCards) {
      player.upgradedCards = shopResult.finalPlayerState.upgradedCards;
    }

    result.success = true;
    result.cardsGained = shopResult.purchases.filter(p => p.type === 'card').map(p => p.id);
    result.relicsGained = shopResult.purchases.filter(p => p.type === 'relic').map(p => p.id);
    const itemsPurchased = shopResult.purchases.filter(p => p.type === 'item').map(p => p.id);
    result.details = `상점: ${shopResult.purchases.length}개 구매, ${shopResult.totalSpent}골드 사용`;

    // 통계 기록
    if (this.statsCollector) {
      // servicesUsed에서 서비스 유형별로 파싱
      const services = shopResult.servicesUsed || [];
      const healServices = services.filter(s => s.id === 'healSmall' || s.id === 'healFull');
      const removeServices = services.filter(s => s.id === 'removeCard');
      const upgradeServices = services.filter(s => s.id === 'upgradeCard');

      // 구매 기록 변환 (이유 포함)
      const purchaseRecords = (shopResult.purchaseDecisions || []).map(d => ({
        itemId: d.item.id,
        itemName: d.item.name,
        type: d.item.type as 'card' | 'relic' | 'item',
        price: d.item.price,
        reason: d.reason,
      }));

      this.statsCollector.recordShopVisit({
        goldSpent: shopResult.totalSpent,
        cardsPurchased: result.cardsGained,
        relicsPurchased: result.relicsGained,
        itemsPurchased,
        purchaseRecords,
        cardsRemoved: removeServices.length,
        cardsUpgraded: upgradeServices.length,
      });

      // 아이템 획득 기록
      for (const itemId of itemsPurchased) {
        this.statsCollector.recordItemAcquired(itemId);
      }

      // 상점 서비스 상세 기록
      for (const healService of healServices) {
        const hpHealed = healService.id === 'healFull'
          ? player.maxHp - shopConfig.player.hp
          : Math.min(30, player.maxHp - shopConfig.player.hp);
        this.statsCollector.recordShopService({
          type: 'heal',
          cost: healService.price,
          hpHealed,
        });
      }

      for (const removeService of removeServices) {
        this.statsCollector.recordShopService({
          type: 'remove',
          cost: removeService.price,
          cardId: removeService.name || 'unknown',
        });
      }

      for (const upgradeService of upgradeServices) {
        this.statsCollector.recordShopService({
          type: 'upgrade',
          cost: upgradeService.price,
          cardId: upgradeService.name || 'unknown',
        });
      }
    }
  }

  /**
   * 전략에 따른 상점 카드 필터링
   */
  private filterShopCards(
    cards: import('./shop-simulator').ShopItem[],
    player: PlayerRunState,
    strategy: RunStrategy
  ): import('./shop-simulator').ShopItem[] {
    // 덱 크기가 18장 이상이면 카드 구매 안 함
    if (player.deck.length >= 18) return [];

    // 덱 균형 분석
    const attackCount = player.deck.filter(cardId => {
      const card = this.cardLibrary[cardId];
      return card && card.type === 'attack';
    }).length;
    const defenseCount = player.deck.filter(cardId => {
      const card = this.cardLibrary[cardId];
      return card && (card.type === 'defense' || card.type === 'reaction');
    }).length;
    const attackRatio = attackCount / player.deck.length;

    // 전략별 필터링
    const rng = getGlobalRandom();
    return cards.filter(shopItem => {
      const card = this.cardLibrary[shopItem.id];
      if (!card) return rng.chance(0.3); // 카드 정보 없으면 30% 확률

      const category = categorizeCard(card);

      switch (strategy) {
        case 'aggressive':
          // 공격 카드 선호, 방어 카드 50% 스킵
          if (category === 'defense') return rng.chance(0.5);
          return true;

        case 'defensive':
          // 방어 카드 선호, 공격 카드 50% 스킵
          if (category === 'attack') return rng.chance(0.5);
          return true;

        case 'balanced':
          // 덱 균형 고려: 공격 비율이 높으면 방어 카드, 낮으면 공격 카드
          if (attackRatio > 0.6 && category === 'attack') return rng.chance(0.3);
          if (attackRatio < 0.4 && category === 'defense') return rng.chance(0.3);
          return rng.chance(0.7); // 기본 70% 확률

        case 'speedrun':
          // 빠른 카드만 구매
          if (card.speedCost && card.speedCost > 5) return false;
          return rng.chance(0.5);

        case 'treasure_hunter':
          // 유틸리티 카드 선호
          if (category === 'utility') return true;
          return rng.chance(0.4);

        default:
          return rng.chance(0.5);
      }
    });
  }

  /**
   * 휴식 노드 처리 (카드 강화 추적 포함)
   */
  private processRestNode(
    node: MapNode,
    player: PlayerRunState,
    config: RunConfig,
    result: NodeResult
  ): void {
    const hpRatio = player.hp / player.maxHp;

    // 전략에 따른 휴식 행동 결정
    let action: 'heal' | 'upgrade' | 'remove' = 'heal';

    if (hpRatio > 0.7) {
      // HP가 충분하면 강화 우선
      action = 'upgrade';
    } else if (hpRatio < 0.4) {
      // HP가 낮으면 무조건 힐
      action = 'heal';
    } else {
      // 중간 상태: 전략에 따라 결정
      switch (config.strategy) {
        case 'aggressive':
        case 'speedrun':
          action = 'upgrade';
          break;
        case 'defensive':
        case 'balanced':
        default:
          action = 'heal';
          break;
      }
    }

    if (action === 'heal') {
      // 힐: 최대 HP의 30% 회복
      const healAmount = Math.floor(player.maxHp * 0.3);
      player.hp = Math.min(player.maxHp, player.hp + healAmount);
      result.details = `휴식: ${healAmount} HP 회복`;
    } else if (action === 'upgrade') {
      // 강화: 아직 강화되지 않은 카드 중 하나 선택
      const upgradableCards = player.deck.filter(cardId =>
        !player.upgradedCards.includes(cardId) &&
        this.isUpgradableCard(cardId)
      );

      if (upgradableCards.length > 0) {
        // 전략에 따라 강화할 카드 선택
        const cardToUpgrade = this.selectCardToUpgrade(upgradableCards, config.strategy);
        if (cardToUpgrade) {
          player.upgradedCards.push(cardToUpgrade);
          result.details = `휴식: ${cardToUpgrade} 카드 강화`;
        } else {
          // 강화할 카드가 없으면 힐
          const healAmount = Math.floor(player.maxHp * 0.3);
          player.hp = Math.min(player.maxHp, player.hp + healAmount);
          result.details = `휴식: ${healAmount} HP 회복 (강화 가능 카드 없음)`;
        }
      } else {
        // 모든 카드가 이미 강화됨 - 힐로 대체
        const healAmount = Math.floor(player.maxHp * 0.3);
        player.hp = Math.min(player.maxHp, player.hp + healAmount);
        result.details = `휴식: ${healAmount} HP 회복 (모든 카드 강화됨)`;
      }
    }

    result.success = true;
  }

  /**
   * 카드가 강화 가능한지 확인
   */
  private isUpgradableCard(cardId: string): boolean {
    const card = this.cardLibrary[cardId];
    if (!card) return false;

    // 기본 카드들은 강화 가능
    const upgradableCards = [
      'strike', 'shoot', 'defend', 'deflect', 'quarte', 'octave',
      'marche', 'lunge', 'fleche', 'thrust', 'breach', 'reload'
    ];

    return upgradableCards.includes(cardId) || card.type === 'attack' || card.type === 'defense';
  }

  /**
   * 강화할 카드 선택 (전략 기반)
   */
  private selectCardToUpgrade(cards: string[], strategy: RunStrategy): string | null {
    if (cards.length === 0) return null;

    // 카드 점수 계산
    const scoredCards = cards.map(cardId => {
      const card = this.cardLibrary[cardId];
      let score = 50;

      if (!card) return { cardId, score };

      const category = categorizeCard(card);

      switch (strategy) {
        case 'aggressive':
          if (category === 'attack') score += 30;
          if (card.damage && card.damage >= 8) score += 20;
          break;
        case 'defensive':
          if (category === 'defense') score += 30;
          if (card.block && card.block >= 5) score += 20;
          break;
        case 'speedrun':
          if (card.speedCost && card.speedCost < 4) score += 30;
          break;
        case 'balanced':
        default:
          // 공격/방어 균형
          if (category === 'attack') score += 15;
          if (category === 'defense') score += 15;
          break;
      }

      return { cardId, score };
    });

    scoredCards.sort((a, b) => b.score - a.score);
    return scoredCards[0]?.cardId || null;
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

    // 던전 플레이어 상태 (참조 복사하여 실시간 반영)
    const dungeonPlayer = {
      hp: player.hp,
      maxHp: player.maxHp,
      gold: player.gold,
      intel: player.intel,
      material: player.material,
      loot: player.loot,
      strength: player.strength,
      agility: player.agility,
      insight: player.insight,
      items: [...player.items],
      deck: [...player.deck],
      relics: [...player.relics],
    };

    // 실제 전투 엔진을 사용하는 battleSimulator 생성
    const battleSimulator = {
      simulateBattle: (dungeonPlayerState: typeof dungeonPlayer, difficulty: number) => {
        // 던전 적 생성
        const enemy = this.createDungeonEnemy(difficulty);

        // 카드 강화 정보
        const cardEnhancements = this.buildCardEnhancements(player.upgradedCards);

        // 실제 전투 엔진 사용
        const battleResult = this.battleEngine.runBattle(
          dungeonPlayerState.deck,
          dungeonPlayerState.relics,
          enemy,
          config.anomalyId,
          cardEnhancements
        );

        const won = battleResult.winner === 'player';
        const hpLost = battleResult.enemyDamageDealt;

        // 통계 기록 (던전 전투도 기록)
        if (this.statsCollector) {
          this.statsCollector.recordBattle(battleResult, {
            id: enemy.id,
            name: enemy.name,
            tier: 1,
            isBoss: false,
            isElite: false,
          });
        }

        return {
          won,
          hpLost,
          rewards: won ? { gold: 20 + difficulty * 10, loot: 1 } : {},
        };
      },
    };

    const dungeonConfig: DungeonSimulationConfig = {
      player: dungeonPlayer,
      strategy: config.strategy === 'speedrun' ? 'speedrun' : 'explore_all',
      battleSimulator: battleSimulator as DungeonSimulationConfig['battleSimulator'], // 실제 전투 엔진 연결
    };

    const dungeonResult = this.dungeonSimulator.simulateDungeonExploration(dungeon, dungeonConfig);

    // 보상 계산
    const goldReward = dungeonResult.finalPlayerState.gold - player.gold;
    const damageTaken = player.hp - dungeonResult.finalPlayerState.hp;

    // 결과 적용
    player.hp = dungeonResult.finalPlayerState.hp;
    player.gold = dungeonResult.finalPlayerState.gold;
    player.material = dungeonResult.finalPlayerState.material;
    player.loot = dungeonResult.finalPlayerState.loot;

    result.success = dungeonResult.exitReached;
    result.details = `던전: ${dungeonResult.nodesVisited}/${dungeonResult.totalNodes} 탐험, ${dungeonResult.combatsWon} 전투 승리`;

    // 통계 기록
    if (this.statsCollector) {
      this.statsCollector.recordDungeon({
        dungeonId: dungeon.id || `dungeon_${node.layer}`,
        success: dungeonResult.exitReached,
        turns: dungeonResult.nodesVisited,
        damageTaken: Math.max(0, damageTaken),
        goldReward: Math.max(0, goldReward),
        cardsGained: dungeonResult.cardsGained || [],
        relicsGained: dungeonResult.relicsGained || [],
      });
    }
  }

  /**
   * 카드 보상 선택 (게임과 동일: 3장 중 1장 선택 또는 스킵)
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
    const cardChoices = getGlobalRandom().pickN(availableCards, Math.min(3, availableCards.length));

    if (cardChoices.length === 0) return null;

    // 픽률 통계: 카드 제시 기록
    if (this.statsCollector) {
      this.statsCollector.recordCardOffered(cardChoices);
    }

    // 스킵 여부 결정
    if (this.shouldSkipCardReward(cardChoices, player, strategy)) {
      // 픽률 통계: 스킵 기록
      if (this.statsCollector) {
        this.statsCollector.recordCardPickSkipped(cardChoices);
      }
      return null;
    }

    // 전략에 따라 최적의 카드 선택
    const selectedCard = this.selectBestCard(cardChoices, strategy);

    // 픽률 통계: 선택 기록
    if (this.statsCollector) {
      this.statsCollector.recordCardPicked(selectedCard, cardChoices);
    }

    return selectedCard;
  }

  /**
   * 전투 보상 카드 스킵 여부 결정
   */
  private shouldSkipCardReward(
    cardChoices: string[],
    player: PlayerRunState,
    strategy: RunStrategy
  ): boolean {
    const deckSize = player.deck.length;

    const rng = getGlobalRandom();

    // 덱이 15장 이상이면 스킵 확률 증가
    if (deckSize >= 15) {
      const skipChance = (deckSize - 14) * 0.15; // 15장: 15%, 16장: 30%, ...
      if (rng.chance(skipChance)) return true;
    }

    // 제시된 카드 품질 평가
    const hasGoodCard = cardChoices.some(cardId => {
      const card = this.cardLibrary[cardId];
      if (!card) return false;

      const category = categorizeCard(card);

      switch (strategy) {
        case 'aggressive':
          return category === 'attack' && card.damage && card.damage > 6;
        case 'defensive':
          return category === 'defense' && card.block && card.block > 4;
        case 'speedrun':
          return card.speedCost !== undefined && card.speedCost < 4;
        default:
          return true; // balanced, treasure_hunter는 대부분 수락
      }
    });

    // 좋은 카드가 없으면 40% 확률로 스킵
    if (!hasGoodCard && rng.chance(0.4)) return true;

    return false;
  }

  /**
   * 전략에 따른 최적 카드 선택 (콤보 최적화기 통합)
   */
  private selectBestCard(cardChoices: string[], strategy: RunStrategy): string {
    // 카드 라이브러리가 없으면 랜덤 선택
    if (Object.keys(this.cardLibrary).length === 0) {
      return getGlobalRandom().pick(cardChoices);
    }

    // 콤보 최적화기가 있으면 사용
    if (this.comboOptimizer && cardChoices.length >= 2) {
      const result = this.comboOptimizer.selectOptimalCards(cardChoices, 1, {
        hpRatio: 1.0, // 보상 선택 시 HP 고려 안 함
        enemyThreat: 0,
      });
      if (result.selectedCards.length > 0) {
        return result.selectedCards[0];
      }
    }

    // 각 카드에 점수 부여
    const scoredCards = cardChoices.map(cardId => {
      const card = this.cardLibrary[cardId];
      let score = 50; // 기본 점수

      if (!card) return { cardId, score };

      const category = categorizeCard(card);

      // 연계/후속/마무리 특성 보너스
      if (card.traits) {
        if (card.traits.includes('chain')) score += 15;
        if (card.traits.includes('followup')) score += 12;
        if (card.traits.includes('finisher')) score += 20;
      }

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
      score += getGlobalRandom().next() * 10;

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
    return getGlobalRandom().pick(topLayerNodes).id;
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
    const results = {} as Record<RunStrategy, RunStatistics>;

    for (const strategy of strategies) {
      results[strategy] = this.simulateMultipleRuns(
        { ...baseConfig, strategy },
        runsPerStrategy
      );
      log.info(`Strategy ${strategy}: ${(results[strategy].successRate * 100).toFixed(1)}% success rate`);
    }

    return results;
  }

  // ==================== 성장 시스템 통합 ====================

  /**
   * 전략에 따른 초기 개성 설정
   */
  private initializeTraits(growthSystem: GrowthSystem, strategy: RunStrategy): void {
    // 전략별 초기 개성 2개 부여 (피라미드 레벨 1 시작)
    const traitsByStrategy: Record<RunStrategy, string[]> = {
      aggressive: ['용맹함', '열정적'],
      defensive: ['굳건함', '철저함'],
      balanced: ['용맹함', '굳건함'],
      speedrun: ['활력적', '냉철함'],
      treasure_hunter: ['냉철함', '철저함'],
    };

    const traits = traitsByStrategy[strategy] || ['용맹함', '굳건함'];
    for (const trait of traits) {
      growthSystem.addTrait(trait);
      // 성장 투자 기록 (개성)
      if (this.statsCollector) {
        this.statsCollector.recordGrowthInvestment(trait, 'trait');
      }
    }

    // 자동 성장 (전략에 맞게)
    const selections = growthSystem.autoGrow(strategy);
    // 자동 성장 선택 기록 (에토스/파토스/로고스)
    if (this.statsCollector && selections) {
      for (const selection of selections) {
        this.statsCollector.recordGrowthInvestment(selection.id, selection.type);
      }
    }
  }

  /**
   * 성장 보너스를 플레이어에게 적용
   */
  private applyGrowthBonusesToPlayer(player: PlayerRunState, bonuses: GrowthBonuses): void {
    // 최대 HP 보너스
    player.maxHp += bonuses.maxHpBonus;
    player.hp = Math.min(player.hp + bonuses.maxHpBonus, player.maxHp);

    // 스탯 보너스
    player.strength += bonuses.attackBonus;

    // 개성 목록 저장
    if (!player.traits) {
      player.traits = [];
    }
  }

  /**
   * 전투 승리 후 개성 획득 체크
   */
  private checkTraitGain(
    player: PlayerRunState,
    growthSystem: GrowthSystem,
    nodeType: MapNodeType
  ): string | null {
    // 엘리트/보스 전투 후 30% 확률로 개성 획득
    const rng = getGlobalRandom();
    if ((nodeType === 'elite' || nodeType === 'boss') && rng.chance(0.3)) {
      const availableTraits = ['용맹함', '굳건함', '냉철함', '철저함', '열정적', '활력적']
        .filter(t => !growthSystem.getState().traits.includes(t));

      if (availableTraits.length > 0) {
        const newTrait = rng.pick(availableTraits);
        growthSystem.addTrait(newTrait);

        // 성장 투자 기록 (개성)
        if (this.statsCollector) {
          this.statsCollector.recordGrowthInvestment(newTrait, 'trait');
        }

        // 성장 상태 업데이트
        player.growth = growthSystem.getState();

        // 새 보너스 적용
        const newBonuses = growthSystem.calculateBonuses();
        this.applyGrowthBonusesToPlayer(player, {
          ...newBonuses,
          maxHpBonus: 0, // 이미 적용된 보너스는 제외
          attackBonus: 0,
        });

        return newTrait;
      }
    }
    return null;
  }
}

// ==================== 헬퍼 함수 ====================

export interface RunSimulatorOptions {
  /** 상세 로그 출력 */
  verbose?: boolean;
  /** 향상된 전투 시스템 사용 */
  useEnhancedBattle?: boolean;
  /** 로그 레벨 설정 (성능 최적화) */
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent';
}

export async function createRunSimulator(options?: RunSimulatorOptions): Promise<RunSimulator> {
  // 로그 레벨 설정 (성능 최적화)
  if (options?.logLevel) {
    const levelMap: Record<string, LogLevel> = {
      debug: LogLevel.DEBUG,
      info: LogLevel.INFO,
      warn: LogLevel.WARN,
      error: LogLevel.ERROR,
      silent: LogLevel.SILENT,
    };
    setLogLevel(levelMap[options.logLevel] ?? LogLevel.INFO);
  }

  const simulator = new RunSimulator({
    verbose: options?.verbose,
    useEnhancedBattle: options?.useEnhancedBattle ?? true,
  });
  await simulator.loadGameData();
  return simulator;
}

/**
 * 기본 플레이어 상태 생성
 */
export function createDefaultPlayer(): PlayerRunState {
  return {
    hp: 100,
    maxHp: 100,
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
    upgradedCards: [], // 강화된 카드 목록
    growth: undefined, // 피라미드 성장 상태 (시뮬레이션 중 초기화)
    traits: [], // 개성 목록
  };
}
