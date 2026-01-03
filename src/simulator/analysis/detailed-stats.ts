/**
 * @file detailed-stats.ts
 * @description 상세 통계 수집 및 리포트 시스템
 *
 * ## 수집하는 통계
 * - 카드별: 사용 횟수, 피해량, 방어량, 특수효과 발동, 승률 기여도
 * - 몬스터별: 전투 횟수, 승률, 평균 턴, 받은/준 피해
 * - 이벤트별: 발생 횟수, 성공률, 보상
 * - 런 전체: 진행도, 자원 획득, 덱 변화
 *
 * ## 파일 구조 (리팩토링됨)
 * - detailed-stats-types.ts: 모든 타입/인터페이스 정의
 * - detailed-stats.ts: StatsCollector, StatsReporter 클래스 및 팩토리 함수
 */

import type { BattleResult, BattleEvent } from '../core/game-types';

// 타입 재내보내기 (하위 호환성 유지)
export type {
  CardEffectStats,
  MonsterBattleStats,
  EventStats,
  RunStats,
  CardUpgradeStats,
  GrowthStats,
  PurchaseRecord,
  ShopStats,
  DungeonStats,
  ShopServiceStats,
  ItemUsageStats,
  EventChoiceStats,
  BattleRecord,
  AIStrategyStats,
  CardPickStats,
  CardContributionStats,
  CardSynergyStats,
  CardDeepStats,
  DeathAnalysis,
  DeathStats,
  RelicStats,
  RecordStats,
  DetailedStats,
  // 새 타입 (다른 게임 참고)
  FloorProgressionData,
  CardChoiceContext,
  DifficultyStats,
  RunProgressionStats,
  GrowthPathStats,
} from './detailed-stats-types';

import type {
  CardEffectStats,
  MonsterBattleStats,
  EventStats,
  EventChoiceStats,
  BattleRecord,
  PurchaseRecord,
  DetailedStats,
  AIStrategyStats,
  CardPickStats,
  CardContributionStats,
  CardSynergyStats,
  CardDeepStats,
  DeathAnalysis,
  DeathStats,
  RelicStats,
  RecordStats,
  ShopServiceStats,
  ItemUsageStats,
  CardUpgradeStats,
  GrowthStats,
  GrowthPathStats,
  ShopStats,
  DungeonStats,
  RunStats,
  DifficultyStats,
  RunProgressionStats,
  CardChoiceContext,
  FloorProgressionData,
  // 신규 타입
  PokerComboStats,
  ComboDetailStats,
  TokenStats,
  FloorProgressionAnalysis,
  FloorDetailedStats,
  EventImpactAnalysis,
  RelicSynergyImpactAnalysis,
  GrowthDecisionAnalysis,
  CardSelectionReasoningAnalysis,
} from './detailed-stats-types';

// ==================== 통계 수집기 ====================

import type { EnemyGroupStats } from './detailed-stats-types';

export class StatsCollector {
  private cardStats: Map<string, CardEffectStats> = new Map();
  private monsterStats: Map<string, MonsterBattleStats> = new Map();
  private enemyGroupStats: Map<string, EnemyGroupStats> = new Map();
  private eventStats: Map<string, EventStats> = new Map();
  private battleRecords: BattleRecord[] = [];
  private runResults: {
    success: boolean;
    layer: number;
    battlesWon: number;
    gold: number;
    deckSize: number;
    deathCause?: string;
    strategy?: string;
    upgradedCards?: string[];
    shopsVisited?: number;
    dungeonsCleared?: number;
    growthLevel?: number;
  }[] = [];

  // 카드 승급 통계
  private upgradesByCard: Record<string, number> = {};
  private totalUpgrades = 0;
  private upgradesInWinningRuns = 0;
  private upgradesInLosingRuns = 0;

  // 성장 시스템 통계
  private statInvestments: Record<string, number> = {};
  private ethosInvestments: Record<string, number> = {};
  private pathosInvestments: Record<string, number> = {};
  private logosInvestments: Record<string, number> = {};
  private logosActivations: Record<string, number> = {};
  private growthLevels: number[] = [];
  // 성장 경로 추적
  private growthPaths: { path: string[]; success: boolean; finalLevel: number }[] = [];
  private currentGrowthPath: string[] = [];
  // 스탯별 승률 추적
  private statRunResults: { stats: Record<string, number>; success: boolean }[] = [];
  // 최종 스탯 추적
  private finalStats: Record<string, number[]> = {};

  // 상점 통계
  private shopVisits = 0;
  private shopSpent = 0;
  private shopCardsPurchased: Record<string, number> = {};
  private shopRelicsPurchased: Record<string, number> = {};
  private shopItemsPurchased: Record<string, number> = {};
  private shopPurchaseRecords: PurchaseRecord[] = [];
  private shopCardsRemoved = 0;
  private shopCardsUpgraded = 0;

  // 던전 통계
  private dungeonAttempts = 0;
  private dungeonClears = 0;
  private dungeonClearsByType: Record<string, number> = {};
  private dungeonRewards = { gold: 0, cards: [] as string[], relics: [] as string[] };
  private dungeonTotalTurns = 0;
  private dungeonTotalDamage = 0;

  // 상점 서비스 상세 통계
  private shopHealingUsed = 0;
  private shopTotalHpHealed = 0;
  private shopHealingCost = 0;
  private shopRemovalCost = 0;
  private shopRemovedCards: Record<string, number> = {};
  private shopUpgradeCost = 0;
  private shopUpgradedCards: Record<string, number> = {};
  private shopRefreshUsed = 0;
  private shopRefreshCost = 0;

  // 아이템 활용 통계
  private itemsAcquired: Record<string, number> = {};
  private itemsUsed: Record<string, number> = {};
  private itemEffects: Record<string, {
    timesUsed: number;
    totalHpHealed: number;
    totalDamage: number;
    totalGoldGained: number;
    specialEffects: Record<string, number>;
  }> = {};
  private itemsDiscarded: Record<string, number> = {};
  private itemUsageInBattle: Record<string, number> = {};
  private itemUsageOutOfBattle: Record<string, number> = {};

  // 이벤트 선택 상세 통계
  private eventChoiceStats: Map<string, EventChoiceStats> = new Map();

  // AI 전략 통계
  private aiStrategyUsage: Record<string, number> = {};
  private aiStrategyWins: Record<string, number> = {};
  private aiStrategyTurns: Record<string, number[]> = {};
  private aiStrategyDamage: Record<string, number[]> = {};
  private aiStrategyByHpRatio: Record<string, Record<string, number>> = {};
  private cardSelectionReasons: Record<string, number> = {};
  private synergyTriggers: Record<string, number> = {};
  private comboTypeUsage: Record<string, number> = {};
  private comboTypeWins: Record<string, number> = {};
  private comboTypeBattles: Record<string, number> = {};
  private comboTypeEther: Record<string, number> = {};
  private tokenTypeUsage: Record<string, number> = {};

  // 카드 픽률 통계 (Slay the Spire 스타일)
  private cardsOffered: Record<string, number> = {};
  private cardsPicked: Record<string, number> = {};
  private cardsSkipped: Record<string, number> = {};

  // 카드 기여도 통계
  private deckCompositions: { deck: string[]; success: boolean }[] = [];

  // 카드 시너지 통계
  private cardPairCounts: Record<string, number> = {};
  private cardPairWins: Record<string, number> = {};

  // 기록 통계
  private currentWinStreak = 0;
  private longestWinStreak = 0;
  private flawlessVictories = 0;
  private maxSingleTurnDamage = 0;
  private maxDamageRecord: { cardId: string; damage: number; monster: string } | null = null;
  private fastestClear = Infinity;
  private fastestClearRecord: { battlesWon: number; deckSize: number; strategy: string } | null = null;
  private largestDeckClear = 0;
  private smallestDeckClear = Infinity;
  private maxGoldHeld = 0;
  private bossFlawlessCount = 0;

  // 난이도별 통계 (Hades Heat 스타일)
  private difficultyResults: Map<number, { runs: number; wins: number; floors: number[]; currentStreak: number; longestStreak: number }> = new Map();

  // 런 진행 기록 (Slay the Spire 스타일)
  private recentRunProgressions: RunProgressionStats[] = [];
  private currentRunProgression: RunProgressionStats | null = null;
  private allCardChoices: CardChoiceContext[] = [];

  // 카드 심층 분석 (전투당 사용 횟수 추적)
  private cardPlayCounts: Record<string, number> = {}; // 카드별 총 사용 횟수
  private cardBattleCounts: Record<string, number> = {}; // 카드가 포함된 전투 수
  private cardNeverPlayedRuns: Record<string, number> = {}; // 한 번도 안 쓴 런 수
  private currentRunCardPlays: Set<string> = new Set(); // 현재 런에서 사용한 카드

  // 사망 분석
  private deathRecords: DeathAnalysis[] = [];
  private deathsByFloor: Record<number, number> = {};
  private deathsByEnemy: Record<string, number> = {};
  private deathsByCause: Record<string, number> = {};
  private enemyEncounters: Record<string, number> = {}; // 적 조우 횟수 (사망률 계산용)

  // 층별 스냅샷 (현재 런)
  private currentFloorSnapshots: FloorProgressionData[] = [];

  // 상징(Relic) 통계
  private relicAcquisitions: Record<string, { floors: number[]; sources: Record<string, number> }> = {};
  private relicEffectTriggers: Record<string, { count: number; totalValue: number }> = {};
  private relicRunResults: { relics: string[]; success: boolean; floorReached: number; hpPercent: number }[] = [];
  private relicLibrary: Record<string, { name: string }> = {};

  private startTime: Date = new Date();
  private cardLibrary: Record<string, { name: string; type: string; special?: string[] }> = {};

  constructor(cardLibrary?: Record<string, { name: string; type: string; special?: string[] }>) {
    if (cardLibrary) {
      this.cardLibrary = cardLibrary;
    }
  }

  /** 카드 라이브러리 설정 */
  setCardLibrary(library: Record<string, { name: string; type: string; special?: string[] }>) {
    this.cardLibrary = library;
  }

  // ==================== 컨텍스트 분류 헬퍼 ====================

  /** HP 상태 분류 (critical: <30%, unstable: 30-60%, stable: >60%) */
  private getHpState(currentHp: number, maxHp: number): 'critical' | 'unstable' | 'stable' {
    const ratio = maxHp > 0 ? currentHp / maxHp : 1;
    if (ratio < 0.3) return 'critical';
    if (ratio < 0.6) return 'unstable';
    return 'stable';
  }

  /** 층 범위 분류 (early: 1-5, mid: 6-10, late: 11+) */
  private getFloorRange(floor: number): 'early' | 'mid' | 'late' {
    if (floor <= 5) return 'early';
    if (floor <= 10) return 'mid';
    return 'late';
  }

  /** 적 유형 분류 */
  private getEnemyType(monster: { isBoss?: boolean; isElite?: boolean }): 'normal' | 'elite' | 'boss' {
    if (monster.isBoss) return 'boss';
    if (monster.isElite) return 'elite';
    return 'normal';
  }

  /** 턴 범위 분류 */
  private getTurnRange(turn: number): 'firstTurn' | 'earlyTurns' | 'midTurns' | 'lateTurns' {
    if (turn === 1) return 'firstTurn';
    if (turn <= 3) return 'earlyTurns';
    if (turn <= 6) return 'midTurns';
    return 'lateTurns';
  }

  /** 컨텍스트 통계 업데이트 헬퍼 */
  private updateContextStats(
    ctx: { uses: number; avgDamage: number; avgBlock: number; winRate: number },
    uses: number,
    damage: number,
    block: number,
    isWin: boolean
  ) {
    const prevUses = ctx.uses;
    const prevWins = Math.round(ctx.winRate * prevUses);

    ctx.uses += uses;

    // 누적 평균 계산 (이전 평균 * 이전 횟수 + 새 값) / 새 횟수
    if (ctx.uses > 0) {
      ctx.avgDamage = (ctx.avgDamage * prevUses + damage) / ctx.uses;
      ctx.avgBlock = (ctx.avgBlock * prevUses + block) / ctx.uses;
      ctx.winRate = (prevWins + (isWin ? uses : 0)) / ctx.uses;
    }
  }

  /** 전투 결과 기록 */
  recordBattle(
    result: BattleResult,
    monster: { id: string; name: string; tier?: number; isBoss?: boolean; isElite?: boolean },
    context?: { floor?: number; playerMaxHp?: number }
  ) {
    const battleId = `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const isWin = result.winner === 'player';

    // 전투 기록 추가
    const record: BattleRecord = {
      battleId,
      monsterId: monster.id,
      monsterName: monster.name,
      isBoss: monster.isBoss || false,
      isElite: monster.isElite || false,
      winner: result.winner,
      turns: result.turns,
      playerDamageDealt: result.playerDamageDealt,
      enemyDamageDealt: result.enemyDamageDealt,
      playerFinalHp: result.playerFinalHp,
      enemyFinalHp: result.enemyFinalHp,
      cardsUsed: { ...result.cardUsage },
      specialEffects: {},
      crossTriggers: 0,
      combosTriggered: { ...result.comboStats },
      groupInfo: null,
    };

    // 이벤트에서 특수효과 및 교차 횟수 추출
    for (const event of result.events) {
      if (event.type === 'cross_triggered') {
        record.crossTriggers++;
      }
      if (event.type === 'counter_triggered' || event.type === 'counter_shot_triggered') {
        const effectName = event.data?.effectName as string || 'counter';
        record.specialEffects[effectName] = (record.specialEffects[effectName] || 0) + 1;
      }
    }

    this.battleRecords.push(record);

    // 컨텍스트 정보 계산
    const battleContext = {
      hpState: this.getHpState(result.playerFinalHp, context?.playerMaxHp ?? 100),
      floorRange: this.getFloorRange(context?.floor ?? 1),
      enemyType: this.getEnemyType(monster),
      turns: result.turns,
    };

    // 카드 통계 업데이트
    for (const [cardId, uses] of Object.entries(result.cardUsage)) {
      this.updateCardStats(cardId, uses, isWin, result.events, battleContext);

      // 카드 심층 분석: 사용 횟수 기록
      this.cardPlayCounts[cardId] = (this.cardPlayCounts[cardId] || 0) + uses;
      this.cardBattleCounts[cardId] = (this.cardBattleCounts[cardId] || 0) + 1;
      this.currentRunCardPlays.add(cardId);
    }

    // 적 조우 횟수 기록 (사망률 계산용)
    this.enemyEncounters[monster.id] = (this.enemyEncounters[monster.id] || 0) + 1;

    // 콤보 통계 집계 (발동 횟수, 승률, 에테르)
    if (result.comboStats) {
      // 전체 콤보 발동 횟수 계산 (에테르 분배용)
      const totalComboOccurrences = Object.values(result.comboStats).reduce((sum, count) => sum + count, 0);
      const battleEther = result.etherGained || 0;

      for (const [comboName, count] of Object.entries(result.comboStats)) {
        this.comboTypeUsage[comboName] = (this.comboTypeUsage[comboName] || 0) + count;
        // 콤보가 발동된 전투 횟수와 승리 횟수 기록
        this.comboTypeBattles[comboName] = (this.comboTypeBattles[comboName] || 0) + 1;
        if (isWin) {
          this.comboTypeWins[comboName] = (this.comboTypeWins[comboName] || 0) + 1;
        }
        // 에테르 획득량 기록 (콤보 발동 횟수에 비례하여 분배)
        const comboEtherShare = totalComboOccurrences > 0
          ? Math.round(battleEther * count / totalComboOccurrences)
          : 0;
        this.comboTypeEther[comboName] = (this.comboTypeEther[comboName] || 0) + comboEtherShare;
      }
    }

    // 토큰 통계 집계
    if (result.tokenStats) {
      for (const [tokenId, count] of Object.entries(result.tokenStats)) {
        this.tokenTypeUsage[tokenId] = (this.tokenTypeUsage[tokenId] || 0) + count;
      }
    }

    // 몬스터 통계 업데이트
    this.updateMonsterStats(monster, result);
  }

  /** 카드 통계 업데이트 */
  private updateCardStats(
    cardId: string,
    uses: number,
    isWin: boolean,
    events: BattleEvent[],
    battleContext?: {
      hpState: 'critical' | 'unstable' | 'stable';
      floorRange: 'early' | 'mid' | 'late';
      enemyType: 'normal' | 'elite' | 'boss';
      turns: number;
    }
  ) {
    if (!this.cardStats.has(cardId)) {
      const cardInfo = this.cardLibrary[cardId] || { name: cardId, type: 'unknown' };
      const defaultContextStats = { uses: 0, avgDamage: 0, avgBlock: 0, winRate: 0 };
      this.cardStats.set(cardId, {
        cardId,
        cardName: cardInfo.name,
        cardType: cardInfo.type,
        totalUses: 0,
        usesInWins: 0,
        usesInLosses: 0,
        totalDamage: 0,
        avgDamage: 0,
        totalBlock: 0,
        avgBlock: 0,
        specialTriggers: {},
        crossTriggers: 0,
        winContribution: 0,
        contextByHpState: {
          critical: { ...defaultContextStats },
          unstable: { ...defaultContextStats },
          stable: { ...defaultContextStats },
        },
        contextByFloor: {
          early: { ...defaultContextStats },
          mid: { ...defaultContextStats },
          late: { ...defaultContextStats },
          byFloor: new Map(),
        },
        contextByEnemy: {
          vsNormal: { ...defaultContextStats },
          vsElite: { ...defaultContextStats },
          vsBoss: { ...defaultContextStats },
          vsMultiple: { ...defaultContextStats },
          byEnemyType: new Map(),
        },
        contextByTurn: {
          firstTurn: { ...defaultContextStats },
          earlyTurns: { ...defaultContextStats },
          midTurns: { ...defaultContextStats },
          lateTurns: { ...defaultContextStats },
        },
      });
    }

    const stats = this.cardStats.get(cardId)!;
    stats.totalUses += uses;
    if (isWin) {
      stats.usesInWins += uses;
    } else {
      stats.usesInLosses += uses;
    }

    // 이벤트에서 피해량/방어량/특수효과 추출
    let cardDamage = 0;
    let cardBlock = 0;
    for (const event of events) {
      if (event.cardId === cardId) {
        if (event.type === 'damage_dealt' && event.actor === 'player') {
          const dmg = event.value || 0;
          stats.totalDamage += dmg;
          cardDamage += dmg;
        }
        if (event.type === 'block_gained' && event.actor === 'player') {
          const blk = event.value || 0;
          stats.totalBlock += blk;
          cardBlock += blk;
        }
        if (event.type === 'cross_triggered') {
          stats.crossTriggers++;
        }
        if (event.type === 'special_triggered') {
          const effectName = event.data?.effectName as string || 'unknown';
          stats.specialTriggers[effectName] = (stats.specialTriggers[effectName] || 0) + 1;
        }
      }
    }

    // 컨텍스트별 통계 업데이트
    if (battleContext) {
      this.updateContextStats(stats.contextByHpState[battleContext.hpState], uses, cardDamage, cardBlock, isWin);
      this.updateContextStats(stats.contextByFloor[battleContext.floorRange], uses, cardDamage, cardBlock, isWin);

      const enemyContextKey = `vs${battleContext.enemyType.charAt(0).toUpperCase()}${battleContext.enemyType.slice(1)}` as 'vsNormal' | 'vsElite' | 'vsBoss';
      this.updateContextStats(stats.contextByEnemy[enemyContextKey], uses, cardDamage, cardBlock, isWin);

      const turnRange = this.getTurnRange(battleContext.turns);
      this.updateContextStats(stats.contextByTurn[turnRange], uses, cardDamage, cardBlock, isWin);
    }

    // 평균 계산
    if (stats.totalUses > 0) {
      stats.avgDamage = stats.totalDamage / stats.totalUses;
      stats.avgBlock = stats.totalBlock / stats.totalUses;
      const totalWinLoss = stats.usesInWins + stats.usesInLosses;
      stats.winContribution = totalWinLoss > 0 ? stats.usesInWins / totalWinLoss : 0;
    }
  }

  /** 몬스터 통계 업데이트 */
  private updateMonsterStats(
    monster: { id: string; name: string; tier?: number; isBoss?: boolean },
    result: BattleResult
  ) {
    if (!this.monsterStats.has(monster.id)) {
      const defaultGroupStats = { battles: 0, wins: 0, winRate: 0, avgDamageTaken: 0, avgTurns: 0 };
      this.monsterStats.set(monster.id, {
        monsterId: monster.id,
        monsterName: monster.name,
        tier: monster.tier || 1,
        isBoss: monster.isBoss || false,
        battles: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        avgTurns: 0,
        totalDamageTaken: 0,
        totalDamageDealt: 0,
        avgDamageTaken: 0,
        avgDamageDealt: 0,
        avgHpRemainingOnWin: 0,
        topCardsUsed: [],
        contextStats: {
          solo: { ...defaultGroupStats },
          withSameType: { ...defaultGroupStats, avgGroupSize: 0 },
          withMixedGroup: { ...defaultGroupStats, frequentPartners: [] },
        },
      });
    }

    const stats = this.monsterStats.get(monster.id)!;
    stats.battles++;

    if (result.winner === 'player') {
      stats.wins++;
    } else {
      stats.losses++;
    }

    stats.winRate = stats.wins / stats.battles;
    stats.totalDamageTaken += result.enemyDamageDealt;
    stats.totalDamageDealt += result.playerDamageDealt;
    stats.avgTurns = (stats.avgTurns * (stats.battles - 1) + result.turns) / stats.battles;
    stats.avgDamageTaken = stats.totalDamageTaken / stats.battles;
    stats.avgDamageDealt = stats.totalDamageDealt / stats.battles;

    if (result.winner === 'player') {
      const prevWinHp = stats.avgHpRemainingOnWin * (stats.wins - 1);
      stats.avgHpRemainingOnWin = (prevWinHp + result.playerFinalHp) / stats.wins;
    }

    // TOP 카드 업데이트
    const cardCounts: Record<string, number> = {};
    for (const record of this.battleRecords.filter(r => r.monsterId === monster.id)) {
      for (const [cardId, count] of Object.entries(record.cardsUsed)) {
        cardCounts[cardId] = (cardCounts[cardId] || 0) + count;
      }
    }
    stats.topCardsUsed = Object.entries(cardCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cardId, count]) => ({ cardId, count }));
  }

  /** 이벤트 결과 기록 */
  recordEvent(
    eventId: string,
    eventName: string,
    success: boolean,
    hpChange: number,
    goldChange: number,
    cardsGained: string[] = [],
    relicsGained: string[] = [],
    resourceChanges?: Record<string, number>
  ) {
    if (!this.eventStats.has(eventId)) {
      this.eventStats.set(eventId, {
        eventId,
        eventName,
        occurrences: 0,
        successes: 0,
        successRate: 0,
        totalHpChange: 0,
        totalGoldChange: 0,
        totalIntelChange: 0,
        totalMaterialChange: 0,
        totalInsightChange: 0,
        totalGraceChange: 0,
        totalLootChange: 0,
        cardsGained: [],
        relicsGained: [],
      });
    }

    const stats = this.eventStats.get(eventId)!;
    stats.occurrences++;
    if (success) stats.successes++;
    stats.successRate = stats.successes / stats.occurrences;
    stats.totalHpChange += hpChange;
    stats.totalGoldChange += goldChange;

    // 추가 자원 변화 기록
    if (resourceChanges) {
      stats.totalIntelChange += resourceChanges.intel || 0;
      stats.totalMaterialChange += resourceChanges.material || 0;
      stats.totalInsightChange += resourceChanges.insight || 0;
      stats.totalGraceChange += resourceChanges.grace || 0;
      stats.totalLootChange += resourceChanges.loot || 0;
    }

    stats.cardsGained.push(...cardsGained);
    stats.relicsGained.push(...relicsGained);
  }

  /** 런 결과 기록 (확장) */
  recordRunExtended(data: {
    success: boolean;
    layer: number;
    battlesWon: number;
    gold: number;
    deckSize: number;
    deathCause?: string;
    strategy?: string;
    upgradedCards?: string[];
    shopsVisited?: number;
    dungeonsCleared?: number;
    growthLevel?: number;
    eventsCompleted?: number;
  }) {
    this.runResults.push(data);

    // 카드 승급 통계 업데이트
    if (data.upgradedCards) {
      for (const cardId of data.upgradedCards) {
        this.upgradesByCard[cardId] = (this.upgradesByCard[cardId] || 0) + 1;
        this.totalUpgrades++;
        if (data.success) {
          this.upgradesInWinningRuns++;
        } else {
          this.upgradesInLosingRuns++;
        }
      }
    }

    // 성장 레벨 통계
    if (data.growthLevel !== undefined) {
      this.growthLevels.push(data.growthLevel);
    }
  }

  /** 런 결과 기록 (기본) */
  recordRun(
    success: boolean,
    layer: number,
    battlesWon: number,
    gold: number,
    deckSize: number,
    deathCause?: string,
    strategy?: string
  ) {
    this.recordRunExtended({ success, layer, battlesWon, gold, deckSize, deathCause, strategy });
  }

  /** 사망 분석 기록 */
  recordDeath(data: {
    floor: number;
    enemyId: string;
    enemyName: string;
    finalHp: number;
    overkillDamage: number;
    turnsBeforeDeath: number;
    lastHandCards: string[];
    deck: string[];
    relics: string[];
    hpHistory: number[];
  }) {
    // 사망 원인 분류
    let causeType: DeathAnalysis['causeType'] = 'attrition';
    if (data.overkillDamage > 20) {
      causeType = 'burst';
    } else if (data.lastHandCards.length === 0) {
      causeType = 'bad_hand';
    } else if (data.turnsBeforeDeath > 10) {
      causeType = 'resource_exhaustion';
    }

    // 덱 구성 분석
    const deckComposition = {
      attacks: 0,
      skills: 0,
      powers: 0,
      total: data.deck.length,
    };
    for (const cardId of data.deck) {
      const cardInfo = this.cardLibrary[cardId];
      if (cardInfo) {
        if (cardInfo.type === 'attack') deckComposition.attacks++;
        else if (cardInfo.type === 'skill') deckComposition.skills++;
        else if (cardInfo.type === 'power') deckComposition.powers++;
      }
    }

    const deathAnalysis: DeathAnalysis = {
      floor: data.floor,
      enemyId: data.enemyId,
      enemyName: data.enemyName,
      causeType,
      finalHp: data.finalHp,
      overkillDamage: data.overkillDamage,
      turnsBeforeDeath: data.turnsBeforeDeath,
      lastHandCards: data.lastHandCards,
      deckComposition,
      relicsAtDeath: data.relics,
      hpHistory: data.hpHistory,
    };

    // 최대 20개 유지
    this.deathRecords.push(deathAnalysis);
    if (this.deathRecords.length > 20) {
      this.deathRecords.shift();
    }

    // 집계
    this.deathsByFloor[data.floor] = (this.deathsByFloor[data.floor] || 0) + 1;
    this.deathsByEnemy[data.enemyId] = (this.deathsByEnemy[data.enemyId] || 0) + 1;
    this.deathsByCause[causeType] = (this.deathsByCause[causeType] || 0) + 1;
  }

  /** 층별 스냅샷 기록 */
  recordFloorSnapshot(data: {
    floor: number;
    nodeType: string;
    hp: number;
    maxHp: number;
    gold: number;
    deckSize: number;
    relicCount: number;
  }) {
    const snapshot: FloorProgressionData = {
      floor: data.floor,
      nodeType: data.nodeType,
      hp: data.hp,
      maxHp: data.maxHp,
      gold: data.gold,
      deckSize: data.deckSize,
      relicCount: data.relicCount,
    };
    this.currentFloorSnapshots.push(snapshot);
  }

  /** 런 시작 시 초기화 */
  startNewRun() {
    this.currentRunCardPlays.clear();
    this.currentFloorSnapshots = [];
  }

  /** 런 종료 시 카드 사용 통계 마무리 */
  finalizeRunCardStats(deck: string[]) {
    // 덱에 있었지만 한 번도 사용하지 않은 카드 기록
    for (const cardId of deck) {
      if (!this.currentRunCardPlays.has(cardId)) {
        this.cardNeverPlayedRuns[cardId] = (this.cardNeverPlayedRuns[cardId] || 0) + 1;
      }
    }
  }

  /** 상징 라이브러리 설정 */
  setRelicLibrary(library: Record<string, { name: string }>) {
    this.relicLibrary = library;
  }

  /** 상징 획득 기록 */
  recordRelicAcquired(data: {
    relicId: string;
    relicName?: string;
    floor: number;
    source: 'battle' | 'shop' | 'event' | 'dungeon' | 'boss' | 'starting';
  }) {
    const { relicId, relicName, floor, source } = data;

    if (!this.relicAcquisitions[relicId]) {
      this.relicAcquisitions[relicId] = { floors: [], sources: {} };
    }

    this.relicAcquisitions[relicId].floors.push(floor);
    this.relicAcquisitions[relicId].sources[source] =
      (this.relicAcquisitions[relicId].sources[source] || 0) + 1;

    // 상징 라이브러리에 이름 저장
    if (relicName && !this.relicLibrary[relicId]) {
      this.relicLibrary[relicId] = { name: relicName };
    }
  }

  /** 상징 효과 발동 기록 */
  recordRelicEffectTrigger(data: {
    relicId: string;
    effectValue?: number; // HP 회복, 피해, 골드 등 수치
  }) {
    const { relicId, effectValue = 0 } = data;

    if (!this.relicEffectTriggers[relicId]) {
      this.relicEffectTriggers[relicId] = { count: 0, totalValue: 0 };
    }

    this.relicEffectTriggers[relicId].count++;
    this.relicEffectTriggers[relicId].totalValue += effectValue;
  }

  /** 런 종료 시 상징 통계 기록 */
  recordRelicRunEnd(data: {
    relics: string[];
    success: boolean;
    floorReached: number;
    hpPercent?: number;
  }) {
    this.relicRunResults.push({
      relics: [...data.relics],
      success: data.success,
      floorReached: data.floorReached,
      hpPercent: data.hpPercent ?? 0,
    });
  }

  /** 상점 방문 기록 */
  recordShopVisit(data: {
    goldSpent: number;
    cardsPurchased?: string[];
    relicsPurchased?: string[];
    itemsPurchased?: string[];
    purchaseRecords?: PurchaseRecord[];
    cardsRemoved?: number;
    cardsUpgraded?: number;
  }) {
    this.shopVisits++;
    this.shopSpent += data.goldSpent;

    if (data.cardsPurchased) {
      for (const cardId of data.cardsPurchased) {
        this.shopCardsPurchased[cardId] = (this.shopCardsPurchased[cardId] || 0) + 1;
      }
    }
    if (data.relicsPurchased) {
      for (const relicId of data.relicsPurchased) {
        this.shopRelicsPurchased[relicId] = (this.shopRelicsPurchased[relicId] || 0) + 1;
      }
    }
    if (data.itemsPurchased) {
      for (const itemId of data.itemsPurchased) {
        this.shopItemsPurchased[itemId] = (this.shopItemsPurchased[itemId] || 0) + 1;
      }
    }
    if (data.purchaseRecords) {
      this.shopPurchaseRecords.push(...data.purchaseRecords);
    }
    if (data.cardsRemoved) this.shopCardsRemoved += data.cardsRemoved;
    if (data.cardsUpgraded) this.shopCardsUpgraded += data.cardsUpgraded;
  }

  /** 던전 결과 기록 */
  recordDungeon(data: {
    dungeonId: string;
    success: boolean;
    turns?: number;
    damageTaken?: number;
    goldReward?: number;
    cardsGained?: string[];
    relicsGained?: string[];
  }) {
    this.dungeonAttempts++;
    if (data.success) {
      this.dungeonClears++;
      this.dungeonClearsByType[data.dungeonId] = (this.dungeonClearsByType[data.dungeonId] || 0) + 1;
    }

    if (data.turns) this.dungeonTotalTurns += data.turns;
    if (data.damageTaken) this.dungeonTotalDamage += data.damageTaken;
    if (data.goldReward) this.dungeonRewards.gold += data.goldReward;
    if (data.cardsGained) this.dungeonRewards.cards.push(...data.cardsGained);
    if (data.relicsGained) this.dungeonRewards.relics.push(...data.relicsGained);
  }

  /** 성장 시스템 투자 기록 */
  recordGrowthInvestment(id: string, type: 'trait' | 'ethos' | 'pathos' | 'logos' = 'trait', amount: number = 1) {
    // 타입별 투자 기록
    switch (type) {
      case 'ethos':
        this.ethosInvestments[id] = (this.ethosInvestments[id] || 0) + amount;
        break;
      case 'pathos':
        this.pathosInvestments[id] = (this.pathosInvestments[id] || 0) + amount;
        break;
      case 'logos':
        this.logosInvestments[id] = (this.logosInvestments[id] || 0) + amount;
        break;
      default:
        // trait (개성)
        this.statInvestments[id] = (this.statInvestments[id] || 0) + amount;
        break;
    }
    // 성장 경로에 추가 (타입 포함)
    this.currentGrowthPath.push(`${type}:${id}`);
  }

  /** 로고스 효과 활성화 기록 */
  recordLogosActivation(effectName: string) {
    this.logosActivations[effectName] = (this.logosActivations[effectName] || 0) + 1;
  }

  /** 런 종료 시 성장 통계 기록 */
  recordGrowthRunEnd(data: {
    success: boolean;
    finalStats: Record<string, number>;
    finalLevel: number;
  }) {
    // 성장 경로 저장
    if (this.currentGrowthPath.length > 0) {
      this.growthPaths.push({
        path: [...this.currentGrowthPath],
        success: data.success,
        finalLevel: data.finalLevel,
      });
      this.currentGrowthPath = [];
    }

    // 스탯별 결과 저장
    this.statRunResults.push({
      stats: { ...data.finalStats },
      success: data.success,
    });

    // 최종 스탯 분포 저장
    for (const [stat, value] of Object.entries(data.finalStats)) {
      if (!this.finalStats[stat]) {
        this.finalStats[stat] = [];
      }
      this.finalStats[stat].push(value);
    }
  }

  /** 상점 서비스 이용 기록 */
  recordShopService(data: {
    type: 'heal' | 'remove' | 'upgrade' | 'refresh';
    cost: number;
    cardId?: string;
    hpHealed?: number;
  }) {
    switch (data.type) {
      case 'heal':
        this.shopHealingUsed++;
        this.shopHealingCost += data.cost;
        if (data.hpHealed) this.shopTotalHpHealed += data.hpHealed;
        break;
      case 'remove':
        this.shopRemovalCost += data.cost;
        if (data.cardId) {
          this.shopRemovedCards[data.cardId] = (this.shopRemovedCards[data.cardId] || 0) + 1;
        }
        break;
      case 'upgrade':
        this.shopUpgradeCost += data.cost;
        if (data.cardId) {
          this.shopUpgradedCards[data.cardId] = (this.shopUpgradedCards[data.cardId] || 0) + 1;
        }
        break;
      case 'refresh':
        this.shopRefreshUsed++;
        this.shopRefreshCost += data.cost;
        break;
    }
  }

  /** 아이템 획득 기록 */
  recordItemAcquired(itemId: string, itemName?: string) {
    this.itemsAcquired[itemId] = (this.itemsAcquired[itemId] || 0) + 1;
    // 아이템 효과 초기화
    if (!this.itemEffects[itemId]) {
      this.itemEffects[itemId] = {
        timesUsed: 0,
        totalHpHealed: 0,
        totalDamage: 0,
        totalGoldGained: 0,
        specialEffects: {},
      };
    }
  }

  /** 아이템 사용 기록 */
  recordItemUsed(data: {
    itemId: string;
    inBattle: boolean;
    hpHealed?: number;
    damage?: number;
    goldGained?: number;
    specialEffect?: string;
  }) {
    const { itemId, inBattle, hpHealed, damage, goldGained, specialEffect } = data;

    this.itemsUsed[itemId] = (this.itemsUsed[itemId] || 0) + 1;

    if (inBattle) {
      this.itemUsageInBattle[itemId] = (this.itemUsageInBattle[itemId] || 0) + 1;
    } else {
      this.itemUsageOutOfBattle[itemId] = (this.itemUsageOutOfBattle[itemId] || 0) + 1;
    }

    // 효과 기록
    if (!this.itemEffects[itemId]) {
      this.itemEffects[itemId] = {
        timesUsed: 0,
        totalHpHealed: 0,
        totalDamage: 0,
        totalGoldGained: 0,
        specialEffects: {},
      };
    }
    this.itemEffects[itemId].timesUsed++;
    if (hpHealed) this.itemEffects[itemId].totalHpHealed += hpHealed;
    if (damage) this.itemEffects[itemId].totalDamage += damage;
    if (goldGained) this.itemEffects[itemId].totalGoldGained += goldGained;
    if (specialEffect) {
      this.itemEffects[itemId].specialEffects[specialEffect] =
        (this.itemEffects[itemId].specialEffects[specialEffect] || 0) + 1;
    }
  }

  /** 아이템 버림 기록 */
  recordItemDiscarded(itemId: string) {
    this.itemsDiscarded[itemId] = (this.itemsDiscarded[itemId] || 0) + 1;
  }

  /** 이벤트 선택 상세 기록 */
  recordEventChoice(data: {
    eventId: string;
    eventName: string;
    choiceId: string;
    choiceName: string;
    success: boolean;
    hpChange: number;
    goldChange: number;
    cardsGained?: string[];
    relicsGained?: string[];
  }) {
    const { eventId, eventName, choiceId, success, hpChange, goldChange, cardsGained = [], relicsGained = [] } = data;

    if (!this.eventChoiceStats.has(eventId)) {
      this.eventChoiceStats.set(eventId, {
        eventId,
        eventName,
        occurrences: 0,
        choicesMade: {},
        choiceOutcomes: {},
        timesSkipped: 0,
        skipReasons: {},
        postEventWinRate: 0,
      });
    }

    const stats = this.eventChoiceStats.get(eventId)!;
    stats.occurrences++;
    stats.choicesMade[choiceId] = (stats.choicesMade[choiceId] || 0) + 1;

    // 선택지 결과 업데이트
    if (!stats.choiceOutcomes[choiceId]) {
      stats.choiceOutcomes[choiceId] = {
        timesChosen: 0,
        avgHpChange: 0,
        avgGoldChange: 0,
        cardsGained: [],
        relicsGained: [],
        successRate: 0,
      };
    }
    const outcome = stats.choiceOutcomes[choiceId];
    const prevCount = outcome.timesChosen;
    outcome.timesChosen++;
    outcome.avgHpChange = (outcome.avgHpChange * prevCount + hpChange) / outcome.timesChosen;
    outcome.avgGoldChange = (outcome.avgGoldChange * prevCount + goldChange) / outcome.timesChosen;
    outcome.cardsGained.push(...cardsGained);
    outcome.relicsGained.push(...relicsGained);
    outcome.successRate = (outcome.successRate * prevCount + (success ? 1 : 0)) / outcome.timesChosen;
  }

  /** 이벤트 패스 기록 */
  recordEventSkipped(data: {
    eventId: string;
    eventName: string;
    reason: string;
  }) {
    const { eventId, eventName, reason } = data;

    if (!this.eventChoiceStats.has(eventId)) {
      this.eventChoiceStats.set(eventId, {
        eventId,
        eventName,
        occurrences: 0,
        choicesMade: {},
        choiceOutcomes: {},
        timesSkipped: 0,
        skipReasons: {},
        postEventWinRate: 0,
      });
    }

    const stats = this.eventChoiceStats.get(eventId)!;
    stats.occurrences++;
    stats.timesSkipped++;
    stats.skipReasons[reason] = (stats.skipReasons[reason] || 0) + 1;
  }

  /** AI 전략 결정 기록 */
  recordAIStrategy(data: {
    strategy: string;
    win: boolean;
    turns: number;
    damageDealt: number;
    playerHpRatio: number;
  }) {
    const { strategy, win, turns, damageDealt, playerHpRatio } = data;

    // 사용 횟수
    this.aiStrategyUsage[strategy] = (this.aiStrategyUsage[strategy] || 0) + 1;

    // 승리 횟수
    if (win) {
      this.aiStrategyWins[strategy] = (this.aiStrategyWins[strategy] || 0) + 1;
    }

    // 턴 기록
    if (!this.aiStrategyTurns[strategy]) {
      this.aiStrategyTurns[strategy] = [];
    }
    this.aiStrategyTurns[strategy].push(turns);

    // 피해량 기록
    if (!this.aiStrategyDamage[strategy]) {
      this.aiStrategyDamage[strategy] = [];
    }
    this.aiStrategyDamage[strategy].push(damageDealt);

    // HP 비율별 전략 선택
    const hpBracket = playerHpRatio < 0.3 ? 'low' : playerHpRatio < 0.6 ? 'medium' : 'high';
    if (!this.aiStrategyByHpRatio[hpBracket]) {
      this.aiStrategyByHpRatio[hpBracket] = {};
    }
    this.aiStrategyByHpRatio[hpBracket][strategy] =
      (this.aiStrategyByHpRatio[hpBracket][strategy] || 0) + 1;
  }

  /** 카드 선택 이유 기록 */
  recordCardSelectionReason(reason: string) {
    this.cardSelectionReasons[reason] = (this.cardSelectionReasons[reason] || 0) + 1;
  }

  /** 시너지 발동 기록 */
  recordSynergyTrigger(synergyType: string) {
    this.synergyTriggers[synergyType] = (this.synergyTriggers[synergyType] || 0) + 1;
  }

  /** 콤보 타입 발동 기록 */
  recordComboType(comboType: string) {
    this.comboTypeUsage[comboType] = (this.comboTypeUsage[comboType] || 0) + 1;
  }

  // ==================== 새 통계 기록 메서드 ====================

  /** 카드 제시 기록 (픽률 통계용) */
  recordCardOffered(cardIds: string[]) {
    for (const cardId of cardIds) {
      this.cardsOffered[cardId] = (this.cardsOffered[cardId] || 0) + 1;
    }
  }

  /** 카드 선택 기록 (픽률 통계용) */
  recordCardPicked(cardId: string, offeredCards: string[]) {
    this.cardsPicked[cardId] = (this.cardsPicked[cardId] || 0) + 1;
    // 선택되지 않은 카드들은 스킵으로 기록
    for (const offered of offeredCards) {
      if (offered !== cardId) {
        this.cardsSkipped[offered] = (this.cardsSkipped[offered] || 0) + 1;
      }
    }
  }

  /** 카드 선택 스킵 기록 (모든 제시 카드 거절) */
  recordCardPickSkipped(offeredCards: string[]) {
    for (const cardId of offeredCards) {
      this.cardsSkipped[cardId] = (this.cardsSkipped[cardId] || 0) + 1;
    }
  }

  /** 덱 구성 기록 (기여도 통계용) */
  recordDeckComposition(deck: string[], success: boolean) {
    this.deckCompositions.push({ deck: [...deck], success });

    // 카드 쌍 통계 업데이트
    const uniqueCards = [...new Set(deck)];
    for (let i = 0; i < uniqueCards.length; i++) {
      for (let j = i + 1; j < uniqueCards.length; j++) {
        const pair = [uniqueCards[i], uniqueCards[j]].sort().join('+');
        this.cardPairCounts[pair] = (this.cardPairCounts[pair] || 0) + 1;
        if (success) {
          this.cardPairWins[pair] = (this.cardPairWins[pair] || 0) + 1;
        }
      }
    }
  }

  /** 단일 턴 피해 기록 (최고 기록용) */
  recordTurnDamage(damage: number, cardId: string, monsterName: string) {
    if (damage > this.maxSingleTurnDamage) {
      this.maxSingleTurnDamage = damage;
      this.maxDamageRecord = { cardId, damage, monster: monsterName };
    }
  }

  /** 무피해 전투 승리 기록 */
  recordFlawlessVictory(isBoss: boolean = false) {
    this.flawlessVictories++;
    if (isBoss) {
      this.bossFlawlessCount++;
    }
  }

  // ==================== 새 통계 기록 메서드 (다른 게임 참고) ====================

  /** 런 시작 기록 (진행 추적용) */
  startRunProgression() {
    this.currentRunProgression = {
      floorProgression: [],
      cardChoices: [],
      damagePerBattle: [],
      pathTaken: [],
      finalDeck: [],
      finalRelics: [],
    };
  }

  /** 층 진행 기록 */
  recordFloorProgress(data: FloorProgressionData) {
    if (this.currentRunProgression) {
      this.currentRunProgression.floorProgression.push(data);
      this.currentRunProgression.pathTaken.push(data.nodeType);
    }
  }

  /** 카드 선택 컨텍스트 기록 (어떤 카드들 중 어떤 걸 골랐는지) */
  recordCardChoice(data: { pickedCardId: string | null; offeredCardIds: string[]; floor: number; skipped: boolean }) {
    const choice: CardChoiceContext = {
      pickedCardId: data.pickedCardId,
      notPickedCardIds: data.offeredCardIds.filter(id => id !== data.pickedCardId),
      floor: data.floor,
      skipped: data.skipped,
    };

    this.allCardChoices.push(choice);
    if (this.currentRunProgression) {
      this.currentRunProgression.cardChoices.push(choice);
    }
  }

  /** 전투 피해 기록 (런 진행용) */
  recordBattleDamage(monsterId: string, damage: number, floor: number) {
    if (this.currentRunProgression) {
      this.currentRunProgression.damagePerBattle.push({ monsterId, damage, floor });
    }
  }

  /** 런 종료 기록 (진행 저장) */
  endRunProgression(data: { finalDeck: string[]; finalRelics: string[] }) {
    if (this.currentRunProgression) {
      this.currentRunProgression.finalDeck = data.finalDeck;
      this.currentRunProgression.finalRelics = data.finalRelics;

      // 최근 10개만 유지
      this.recentRunProgressions.push(this.currentRunProgression);
      if (this.recentRunProgressions.length > 10) {
        this.recentRunProgressions.shift();
      }
      this.currentRunProgression = null;
    }
  }

  /** 난이도별 런 결과 기록 (Hades Heat 스타일) */
  recordDifficultyRun(difficulty: number, success: boolean, floorReached: number) {
    if (!this.difficultyResults.has(difficulty)) {
      this.difficultyResults.set(difficulty, { runs: 0, wins: 0, floors: [], currentStreak: 0, longestStreak: 0 });
    }

    const stats = this.difficultyResults.get(difficulty)!;
    stats.runs++;
    stats.floors.push(floorReached);

    if (success) {
      stats.wins++;
      stats.currentStreak++;
      if (stats.currentStreak > stats.longestStreak) {
        stats.longestStreak = stats.currentStreak;
      }
    } else {
      stats.currentStreak = 0;
    }
  }

  /** 런 완료 기록 (기록 통계용) - recordRun 확장 */
  recordRunComplete(data: {
    success: boolean;
    battlesWon: number;
    deckSize: number;
    strategy?: string;
    gold: number;
    deck?: string[];
  }) {
    // 연승 기록
    if (data.success) {
      this.currentWinStreak++;
      if (this.currentWinStreak > this.longestWinStreak) {
        this.longestWinStreak = this.currentWinStreak;
      }

      // 빠른 클리어 기록
      if (data.battlesWon < this.fastestClear) {
        this.fastestClear = data.battlesWon;
        this.fastestClearRecord = {
          battlesWon: data.battlesWon,
          deckSize: data.deckSize,
          strategy: data.strategy || 'unknown'
        };
      }

      // 덱 크기 기록
      if (data.deckSize > this.largestDeckClear) {
        this.largestDeckClear = data.deckSize;
      }
      if (data.deckSize < this.smallestDeckClear) {
        this.smallestDeckClear = data.deckSize;
      }
    } else {
      this.currentWinStreak = 0;
    }

    // 최다 골드 기록
    if (data.gold > this.maxGoldHeld) {
      this.maxGoldHeld = data.gold;
    }

    // 덱 구성 기록 (기여도 분석용)
    if (data.deck) {
      this.recordDeckComposition(data.deck, data.success);
    }
  }

  /** 통계 수집 완료 및 결과 반환 */
  finalize(): DetailedStats {
    const runStats = this.calculateRunStats();
    const upgradeStats = this.calculateUpgradeStats();
    const growthStats = this.calculateGrowthStats();
    const shopStats = this.calculateShopStats();
    const dungeonStats = this.calculateDungeonStats();
    const shopServiceStats = this.calculateShopServiceStats();
    const itemUsageStats = this.calculateItemUsageStats();
    const aiStrategyStats = this.calculateAIStrategyStats();
    const cardPickStats = this.calculateCardPickStats();
    const cardContributionStats = this.calculateCardContributionStats();
    const cardSynergyStats = this.calculateCardSynergyStats();
    const cardDeepStats = this.calculateCardDeepStats(cardContributionStats, cardSynergyStats);
    const deathStats = this.calculateDeathStats();
    const relicStats = this.calculateRelicStats();
    const recordStats = this.calculateRecordStats();

    const difficultyStats = this.calculateDifficultyStats();
    const pokerComboStats = this.calculatePokerComboStats();
    const tokenStats = this.calculateTokenStats();
    const floorProgressionAnalysis = this.calculateFloorProgressionAnalysis();

    return {
      startTime: this.startTime,
      endTime: new Date(),
      cardStats: this.cardStats,
      monsterStats: this.monsterStats,
      enemyGroupStats: this.enemyGroupStats,
      eventStats: this.eventStats,
      runStats,
      battleRecords: this.battleRecords,
      upgradeStats,
      growthStats,
      shopStats,
      dungeonStats,
      shopServiceStats,
      itemUsageStats,
      eventChoiceStats: this.eventChoiceStats,
      aiStrategyStats,
      cardPickStats,
      cardContributionStats,
      cardSynergyStats,
      cardDeepStats,
      deathStats,
      relicStats,
      recordStats,
      difficultyStats,
      recentRunProgressions: [...this.recentRunProgressions],
      allCardChoices: [...this.allCardChoices],
      // 신규 통계
      tokenStats,
      pokerComboStats,
      floorProgressionAnalysis,
      // 영향력 분석 (기본값)
      eventImpactAnalysis: this.buildEventImpactAnalysis(),
      relicSynergyImpactAnalysis: this.buildRelicSynergyImpactAnalysis(),
      growthDecisionAnalysis: this.buildGrowthDecisionAnalysis(),
      cardSelectionReasoningAnalysis: this.buildCardSelectionReasoningAnalysis(),
    };
  }

  /** 난이도별 통계 계산 */
  private calculateDifficultyStats(): Map<number, DifficultyStats> {
    const result = new Map<number, DifficultyStats>();

    for (const [difficulty, data] of this.difficultyResults) {
      const avgFloor = data.floors.length > 0
        ? data.floors.reduce((a, b) => a + b, 0) / data.floors.length
        : 0;

      result.set(difficulty, {
        difficulty,
        runs: data.runs,
        wins: data.wins,
        winRate: data.runs > 0 ? data.wins / data.runs : 0,
        avgFloorReached: avgFloor,
        winStreak: data.longestStreak,
      });
    }

    return result;
  }

  /** AI 전략 통계 계산 */
  private calculateAIStrategyStats(): AIStrategyStats {
    const strategyWinRate: Record<string, number> = {};
    const strategyAvgTurns: Record<string, number> = {};
    const strategyAvgDamage: Record<string, number> = {};

    for (const [strategy, usage] of Object.entries(this.aiStrategyUsage)) {
      const wins = this.aiStrategyWins[strategy] || 0;
      strategyWinRate[strategy] = usage > 0 ? wins / usage : 0;

      const turns = this.aiStrategyTurns[strategy] || [];
      strategyAvgTurns[strategy] = turns.length > 0
        ? turns.reduce((a, b) => a + b, 0) / turns.length
        : 0;

      const damages = this.aiStrategyDamage[strategy] || [];
      strategyAvgDamage[strategy] = damages.length > 0
        ? damages.reduce((a, b) => a + b, 0) / damages.length
        : 0;
    }

    return {
      strategyUsage: this.aiStrategyUsage,
      strategyWinRate,
      strategyAvgTurns,
      strategyAvgDamage,
      strategyByHpRatio: this.aiStrategyByHpRatio,
      cardSelectionReasons: this.cardSelectionReasons,
      synergyTriggers: this.synergyTriggers,
      comboTypeUsage: this.comboTypeUsage,
    };
  }

  /** 카드 픽률 통계 계산 */
  private calculateCardPickStats(): CardPickStats {
    const pickRate: Record<string, number> = {};

    for (const cardId of Object.keys(this.cardsOffered)) {
      const offered = this.cardsOffered[cardId] || 0;
      const picked = this.cardsPicked[cardId] || 0;
      pickRate[cardId] = offered > 0 ? picked / offered : 0;
    }

    return {
      timesOffered: { ...this.cardsOffered },
      timesPicked: { ...this.cardsPicked },
      pickRate,
      timesSkipped: { ...this.cardsSkipped },
    };
  }

  /** 카드 기여도 통계 계산 */
  private calculateCardContributionStats(): CardContributionStats {
    const allCards = new Set<string>();
    for (const { deck } of this.deckCompositions) {
      for (const card of deck) {
        allCards.add(card);
      }
    }

    const winRateWithCard: Record<string, number> = {};
    const winRateWithoutCard: Record<string, number> = {};
    const contribution: Record<string, number> = {};
    const runsWithCard: Record<string, number> = {};

    for (const cardId of allCards) {
      const runsWithThisCard = this.deckCompositions.filter(d => d.deck.includes(cardId));
      const runsWithoutThisCard = this.deckCompositions.filter(d => !d.deck.includes(cardId));

      runsWithCard[cardId] = runsWithThisCard.length;

      const winsWithCard = runsWithThisCard.filter(d => d.success).length;
      const winsWithoutCard = runsWithoutThisCard.filter(d => d.success).length;

      winRateWithCard[cardId] = runsWithThisCard.length > 0
        ? winsWithCard / runsWithThisCard.length
        : 0;
      winRateWithoutCard[cardId] = runsWithoutThisCard.length > 0
        ? winsWithoutCard / runsWithoutThisCard.length
        : 0;
      contribution[cardId] = winRateWithCard[cardId] - winRateWithoutCard[cardId];
    }

    return {
      winRateWithCard,
      winRateWithoutCard,
      contribution,
      runsWithCard,
    };
  }

  /** 카드 시너지 통계 계산 */
  private calculateCardSynergyStats(): CardSynergyStats {
    const cardPairWinRate: Record<string, number> = {};

    for (const pair of Object.keys(this.cardPairCounts)) {
      const count = this.cardPairCounts[pair] || 0;
      const wins = this.cardPairWins[pair] || 0;
      cardPairWinRate[pair] = count > 0 ? wins / count : 0;
    }

    // TOP 시너지 조합 (빈도 3 이상, 승률 높은 순)
    const topSynergies = Object.entries(this.cardPairCounts)
      .filter(([, count]) => count >= 3)
      .map(([pair, frequency]) => ({
        pair,
        frequency,
        winRate: cardPairWinRate[pair] || 0,
      }))
      .sort((a, b) => b.winRate - a.winRate || b.frequency - a.frequency)
      .slice(0, 20);

    return {
      cardPairFrequency: { ...this.cardPairCounts },
      cardPairWinRate,
      topSynergies,
    };
  }

  /** 기록 통계 계산 */
  private calculateRecordStats(): RecordStats {
    return {
      longestWinStreak: this.longestWinStreak,
      currentWinStreak: this.currentWinStreak,
      flawlessVictories: this.flawlessVictories,
      maxSingleTurnDamage: this.maxSingleTurnDamage,
      maxDamageRecord: this.maxDamageRecord,
      fastestClear: this.fastestClear === Infinity ? 0 : this.fastestClear,
      fastestClearRecord: this.fastestClearRecord,
      largestDeckClear: this.largestDeckClear,
      smallestDeckClear: this.smallestDeckClear === Infinity ? 0 : this.smallestDeckClear,
      maxGoldHeld: this.maxGoldHeld,
      bossFlawlessCount: this.bossFlawlessCount,
    };
  }

  /** 카드 심층 분석 통계 계산 */
  private calculateCardDeepStats(
    contributionStats: CardContributionStats,
    synergyStats: CardSynergyStats
  ): Map<string, CardDeepStats> {
    const result = new Map<string, CardDeepStats>();
    const totalBattles = this.battleRecords.length || 1;

    // 모든 카드 ID 수집
    const allCardIds = new Set([
      ...Object.keys(this.cardPlayCounts),
      ...Object.keys(this.cardsPicked),
      ...Object.keys(this.cardsOffered),
    ]);

    for (const cardId of allCardIds) {
      const cardInfo = this.cardLibrary[cardId] || { name: cardId, type: 'unknown' };
      const timesPlayed = this.cardPlayCounts[cardId] || 0;
      const battleCount = this.cardBattleCounts[cardId] || 0;
      const cardStats = this.cardStats.get(cardId);

      // 시너지 파트너 계산
      const partners: { cardId: string; winRate: number; frequency: number }[] = [];
      for (const [pair, frequency] of Object.entries(synergyStats.cardPairFrequency)) {
        if (pair.includes(cardId) && frequency >= 2) {
          const otherCardId = pair.replace(cardId, '').replace('_', '');
          if (otherCardId && otherCardId !== cardId) {
            partners.push({
              cardId: otherCardId,
              winRate: synergyStats.cardPairWinRate[pair] || 0,
              frequency,
            });
          }
        }
      }

      // 승률순 정렬
      partners.sort((a, b) => b.winRate - a.winRate);

      result.set(cardId, {
        cardId,
        cardName: cardInfo.name,
        timesPicked: this.cardsPicked[cardId] || 0,
        timesOffered: this.cardsOffered[cardId] || 0,
        timesPlayed,
        avgPlaysPerBattle: battleCount > 0 ? timesPlayed / battleCount : 0,
        neverPlayedRuns: this.cardNeverPlayedRuns[cardId] || 0,
        winRateWith: contributionStats.winRateWithCard[cardId] || 0,
        winRateWithout: contributionStats.winRateWithoutCard[cardId] || 0,
        avgDamageDealt: cardStats ? (cardStats.totalUses > 0 ? cardStats.totalDamage / cardStats.totalUses : 0) : 0,
        avgBlockGained: cardStats ? (cardStats.totalUses > 0 ? cardStats.totalBlock / cardStats.totalUses : 0) : 0,
        bestPartners: partners.slice(0, 5),
        worstPartners: partners.slice(-5).reverse(),
      });
    }

    return result;
  }

  /** 사망 통계 계산 */
  private calculateDeathStats(): DeathStats {
    // deathRecords는 최대 20개로 제한되므로, 실제 총 사망 수는 deathsByFloor 합계 사용
    const totalDeaths = Object.values(this.deathsByFloor).reduce((sum, count) => sum + count, 0);
    const avgDeathFloor = totalDeaths > 0
      ? Object.entries(this.deathsByFloor).reduce((sum, [floor, count]) => sum + Number(floor) * count, 0) / totalDeaths
      : 0;

    // 가장 위험한 적 계산
    const deadliestEnemies = Object.entries(this.deathsByEnemy)
      .map(([enemyId, deaths]) => {
        const encounters = this.enemyEncounters[enemyId] || deaths;
        return {
          enemyId,
          enemyName: this.deathRecords.find(d => d.enemyId === enemyId)?.enemyName || enemyId,
          deaths,
          encounterRate: encounters > 0 ? deaths / encounters : 0,
        };
      })
      .sort((a, b) => b.deaths - a.deaths)
      .slice(0, 5);

    return {
      totalDeaths,
      deathsByFloor: { ...this.deathsByFloor },
      deathsByEnemy: { ...this.deathsByEnemy },
      deathsByCause: { ...this.deathsByCause },
      avgDeathFloor,
      recentDeaths: [...this.deathRecords],
      deadliestEnemies,
    };
  }

  /** 상징 통계 계산 */
  private calculateRelicStats(): Map<string, RelicStats> {
    const result = new Map<string, RelicStats>();
    const totalRuns = this.relicRunResults.length || 1;

    // 모든 상징 ID 수집
    const allRelicIds = new Set([
      ...Object.keys(this.relicAcquisitions),
      ...Object.keys(this.relicEffectTriggers),
    ]);

    for (const relicId of allRelicIds) {
      const acquisitions = this.relicAcquisitions[relicId] || { floors: [], sources: {} };
      const effectData = this.relicEffectTriggers[relicId] || { count: 0, totalValue: 0 };

      // 보유 시 승률 vs 미보유 시 승률
      const runsWithRelic = this.relicRunResults.filter(r => r.relics.includes(relicId));
      const runsWithoutRelic = this.relicRunResults.filter(r => !r.relics.includes(relicId));

      const winRateWith = runsWithRelic.length > 0
        ? runsWithRelic.filter(r => r.success).length / runsWithRelic.length
        : 0;
      const winRateWithout = runsWithoutRelic.length > 0
        ? runsWithoutRelic.filter(r => r.success).length / runsWithoutRelic.length
        : 0;

      // 평균 도달 층
      const avgFloorReachedWith = runsWithRelic.length > 0
        ? runsWithRelic.reduce((sum, r) => sum + r.floorReached, 0) / runsWithRelic.length
        : 0;

      // 평균 HP 잔여율
      const avgHpWithRelic = runsWithRelic.length > 0
        ? runsWithRelic.reduce((sum, r) => sum + r.hpPercent, 0) / runsWithRelic.length
        : 0;

      // 평균 획득 층
      const avgAcquireFloor = acquisitions.floors.length > 0
        ? acquisitions.floors.reduce((a, b) => a + b, 0) / acquisitions.floors.length
        : 0;

      // 함께 자주 획득되는 상징
      const pairCounts: Record<string, number> = {};
      for (const run of runsWithRelic) {
        for (const otherRelic of run.relics) {
          if (otherRelic !== relicId) {
            pairCounts[otherRelic] = (pairCounts[otherRelic] || 0) + 1;
          }
        }
      }
      const commonPairs = Object.entries(pairCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, frequency]) => ({ relicId: id, frequency }));

      result.set(relicId, {
        relicId,
        relicName: this.relicLibrary[relicId]?.name || relicId,
        timesAcquired: acquisitions.floors.length,
        avgAcquireFloor,
        acquiredFrom: { ...acquisitions.sources },
        winRateWith,
        winRateWithout,
        contribution: winRateWith - winRateWithout,
        effectTriggers: effectData.count,
        avgEffectValue: effectData.count > 0 ? effectData.totalValue / effectData.count : 0,
        avgFloorReachedWith,
        avgHpWithRelic,
        commonPairs,
      });
    }

    return result;
  }

  /** 상점 서비스 상세 통계 계산 */
  private calculateShopServiceStats(): ShopServiceStats {
    return {
      healingUsed: this.shopHealingUsed,
      totalHpHealed: this.shopTotalHpHealed,
      healingCost: this.shopHealingCost,
      removalCost: this.shopRemovalCost,
      removedCards: this.shopRemovedCards,
      upgradeCost: this.shopUpgradeCost,
      upgradedCards: this.shopUpgradedCards,
      refreshUsed: this.shopRefreshUsed,
      refreshCost: this.shopRefreshCost,
    };
  }

  /** 아이템 활용 통계 계산 */
  private calculateItemUsageStats(): ItemUsageStats {
    return {
      itemsAcquired: this.itemsAcquired,
      itemsUsed: this.itemsUsed,
      itemEffects: this.itemEffects,
      itemsDiscarded: this.itemsDiscarded,
      usageContext: {
        inBattle: this.itemUsageInBattle,
        outOfBattle: this.itemUsageOutOfBattle,
      },
    };
  }

  /** 카드 승급 통계 계산 */
  private calculateUpgradeStats(): CardUpgradeStats {
    const totalRuns = this.runResults.length || 1;
    const totalUpgradeEvents = this.upgradesInWinningRuns + this.upgradesInLosingRuns;

    return {
      upgradesByCard: this.upgradesByCard,
      totalUpgrades: this.totalUpgrades,
      avgUpgradesPerRun: this.totalUpgrades / totalRuns,
      upgradeWinCorrelation: totalUpgradeEvents > 0
        ? this.upgradesInWinningRuns / totalUpgradeEvents
        : 0,
    };
  }

  /** 성장 시스템 통계 계산 */
  private calculateGrowthStats(): GrowthStats {
    const totalRuns = this.runResults.length || 1;
    const traitTotal = Object.values(this.statInvestments).reduce((a, b) => a + b, 0);
    const ethosTotal = Object.values(this.ethosInvestments).reduce((a, b) => a + b, 0);
    const pathosTotal = Object.values(this.pathosInvestments).reduce((a, b) => a + b, 0);
    const logosTotal = Object.values(this.logosInvestments).reduce((a, b) => a + b, 0);
    const totalInvestments = traitTotal + ethosTotal + pathosTotal + logosTotal;

    const levelDistribution: Record<number, number> = {};
    for (const level of this.growthLevels) {
      levelDistribution[level] = (levelDistribution[level] || 0) + 1;
    }

    // 스탯별 승률 상관관계 계산
    const statWinCorrelation: Record<string, number> = {};
    const allStats = new Set<string>();
    for (const result of this.statRunResults) {
      for (const stat of Object.keys(result.stats)) {
        allStats.add(stat);
      }
    }

    for (const stat of allStats) {
      const runsWithStat = this.statRunResults.filter(r => (r.stats[stat] || 0) > 0);
      const runsWithoutStat = this.statRunResults.filter(r => (r.stats[stat] || 0) === 0);

      const winRateWithStat = runsWithStat.length > 0
        ? runsWithStat.filter(r => r.success).length / runsWithStat.length
        : 0;
      const winRateWithoutStat = runsWithoutStat.length > 0
        ? runsWithoutStat.filter(r => r.success).length / runsWithoutStat.length
        : 0;

      statWinCorrelation[stat] = winRateWithStat - winRateWithoutStat;
    }

    // 성장 경로별 통계 계산
    const pathCounts: Record<string, { count: number; wins: number; levels: number[] }> = {};
    for (const growth of this.growthPaths) {
      // 처음 3개 투자만 경로로 사용 (너무 길면 의미없음)
      const pathKey = growth.path.slice(0, 3).join('→') || '없음';
      if (!pathCounts[pathKey]) {
        pathCounts[pathKey] = { count: 0, wins: 0, levels: [] };
      }
      pathCounts[pathKey].count++;
      if (growth.success) pathCounts[pathKey].wins++;
      pathCounts[pathKey].levels.push(growth.finalLevel);
    }

    const growthPathStats: GrowthPathStats[] = Object.entries(pathCounts)
      .filter(([, data]) => data.count >= 2)
      .map(([path, data]) => ({
        path,
        count: data.count,
        winRate: data.count > 0 ? data.wins / data.count : 0,
        avgFinalLevel: data.levels.length > 0
          ? data.levels.reduce((a, b) => a + b, 0) / data.levels.length
          : 0,
      }))
      .sort((a, b) => b.winRate - a.winRate || b.count - a.count)
      .slice(0, 10);

    // 최종 스탯 분포 계산
    const finalStatDistribution: Record<string, { total: number; avg: number; max: number }> = {};
    for (const [stat, values] of Object.entries(this.finalStats)) {
      if (values.length > 0) {
        finalStatDistribution[stat] = {
          total: values.reduce((a, b) => a + b, 0),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          max: Math.max(...values),
        };
      }
    }

    return {
      statInvestments: this.statInvestments,
      ethosInvestments: this.ethosInvestments,
      pathosInvestments: this.pathosInvestments,
      logosInvestments: this.logosInvestments,
      totalInvestments,
      avgInvestmentsPerRun: totalInvestments / totalRuns,
      logosActivations: this.logosActivations,
      levelDistribution,
      statWinCorrelation,
      growthPathStats,
      finalStatDistribution,
    };
  }

  /** 상점 통계 계산 */
  private calculateShopStats(): ShopStats {
    return {
      totalVisits: this.shopVisits,
      totalSpent: this.shopSpent,
      avgSpentPerVisit: this.shopVisits > 0 ? this.shopSpent / this.shopVisits : 0,
      cardsPurchased: this.shopCardsPurchased,
      relicsPurchased: this.shopRelicsPurchased,
      itemsPurchased: this.shopItemsPurchased,
      purchaseRecords: this.shopPurchaseRecords,
      cardsRemoved: this.shopCardsRemoved,
      cardsUpgraded: this.shopCardsUpgraded,
    };
  }

  /** 던전 통계 계산 */
  private calculateDungeonStats(): DungeonStats {
    return {
      totalAttempts: this.dungeonAttempts,
      clears: this.dungeonClears,
      clearRate: this.dungeonAttempts > 0 ? this.dungeonClears / this.dungeonAttempts : 0,
      clearsByDungeon: this.dungeonClearsByType,
      rewards: this.dungeonRewards,
      avgTurns: this.dungeonClears > 0 ? this.dungeonTotalTurns / this.dungeonClears : 0,
      avgDamageTaken: this.dungeonAttempts > 0 ? this.dungeonTotalDamage / this.dungeonAttempts : 0,
    };
  }

  /** 런 통계 계산 */
  private calculateRunStats(): RunStats {
    const total = this.runResults.length;
    const successful = this.runResults.filter(r => r.success).length;

    const deathCauses: Record<string, number> = {};
    const deathByLayer: Record<number, number> = {};
    const strategyResults: Record<string, { wins: number; total: number }> = {};

    for (const run of this.runResults) {
      if (!run.success && run.deathCause) {
        deathCauses[run.deathCause] = (deathCauses[run.deathCause] || 0) + 1;
        deathByLayer[run.layer] = (deathByLayer[run.layer] || 0) + 1;
      }
      if (run.strategy) {
        if (!strategyResults[run.strategy]) {
          strategyResults[run.strategy] = { wins: 0, total: 0 };
        }
        strategyResults[run.strategy].total++;
        if (run.success) {
          strategyResults[run.strategy].wins++;
        }
      }
    }

    const strategyWinRates: Record<string, number> = {};
    for (const [strategy, results] of Object.entries(strategyResults)) {
      strategyWinRates[strategy] = results.total > 0 ? results.wins / results.total : 0;
    }

    return {
      totalRuns: total,
      successfulRuns: successful,
      successRate: total > 0 ? successful / total : 0,
      avgLayerReached: total > 0
        ? this.runResults.reduce((sum, r) => sum + r.layer, 0) / total
        : 0,
      avgBattlesWon: total > 0
        ? this.runResults.reduce((sum, r) => sum + r.battlesWon, 0) / total
        : 0,
      avgGoldEarned: total > 0
        ? this.runResults.reduce((sum, r) => sum + r.gold, 0) / total
        : 0,
      avgFinalDeckSize: total > 0
        ? this.runResults.reduce((sum, r) => sum + r.deckSize, 0) / total
        : 0,
      deathCauses,
      deathByLayer,
      strategyWinRates,
    };
  }

  /** 통계 초기화 */
  reset() {
    this.cardStats.clear();
    this.monsterStats.clear();
    this.eventStats.clear();
    this.battleRecords = [];
    this.runResults = [];
    // 새로운 통계 초기화
    this.upgradesByCard = {};
    this.totalUpgrades = 0;
    this.upgradesInWinningRuns = 0;
    this.upgradesInLosingRuns = 0;
    this.statInvestments = {};
    this.ethosInvestments = {};
    this.pathosInvestments = {};
    this.logosInvestments = {};
    this.logosActivations = {};
    this.growthLevels = [];
    this.growthPaths = [];
    this.currentGrowthPath = [];
    this.statRunResults = [];
    this.finalStats = {};
    this.shopVisits = 0;
    this.shopSpent = 0;
    this.shopCardsPurchased = {};
    this.shopRelicsPurchased = {};
    this.shopItemsPurchased = {};
    this.shopCardsRemoved = 0;
    this.shopCardsUpgraded = 0;
    this.dungeonAttempts = 0;
    this.dungeonClears = 0;
    this.dungeonClearsByType = {};
    this.dungeonRewards = { gold: 0, cards: [], relics: [] };
    this.dungeonTotalTurns = 0;
    this.dungeonTotalDamage = 0;
    // 상점 서비스 상세 통계 초기화
    this.shopHealingUsed = 0;
    this.shopTotalHpHealed = 0;
    this.shopHealingCost = 0;
    this.shopRemovalCost = 0;
    this.shopRemovedCards = {};
    this.shopUpgradeCost = 0;
    this.shopUpgradedCards = {};
    this.shopRefreshUsed = 0;
    this.shopRefreshCost = 0;
    // 아이템 활용 통계 초기화
    this.itemsAcquired = {};
    this.itemsUsed = {};
    this.itemEffects = {};
    this.itemsDiscarded = {};
    this.itemUsageInBattle = {};
    this.itemUsageOutOfBattle = {};
    // 이벤트 선택 상세 통계 초기화
    this.eventChoiceStats.clear();
    // AI 전략 통계 초기화
    this.aiStrategyUsage = {};
    this.aiStrategyWins = {};
    this.aiStrategyTurns = {};
    this.aiStrategyDamage = {};
    this.aiStrategyByHpRatio = {};
    this.cardSelectionReasons = {};
    this.synergyTriggers = {};
    this.comboTypeUsage = {};
    // 카드 픽률 통계 초기화
    this.cardsOffered = {};
    this.cardsPicked = {};
    this.cardsSkipped = {};
    // 카드 기여도 통계 초기화
    this.deckCompositions = [];
    // 카드 시너지 통계 초기화
    this.cardPairCounts = {};
    this.cardPairWins = {};
    // 기록 통계 초기화
    this.currentWinStreak = 0;
    this.longestWinStreak = 0;
    this.flawlessVictories = 0;
    this.maxSingleTurnDamage = 0;
    this.maxDamageRecord = null;
    this.fastestClear = Infinity;
    this.fastestClearRecord = null;
    this.largestDeckClear = 0;
    this.smallestDeckClear = Infinity;
    this.maxGoldHeld = 0;
    this.bossFlawlessCount = 0;
    // 새 통계 초기화
    this.difficultyResults.clear();
    this.recentRunProgressions = [];
    this.currentRunProgression = null;
    this.allCardChoices = [];
    // 카드 심층 분석 초기화
    this.cardPlayCounts = {};
    this.cardBattleCounts = {};
    this.cardNeverPlayedRuns = {};
    this.currentRunCardPlays.clear();
    // 사망 분석 초기화
    this.deathRecords = [];
    this.deathsByFloor = {};
    this.deathsByEnemy = {};
    this.deathsByCause = {};
    this.enemyEncounters = {};
    // 층별 스냅샷 초기화
    this.currentFloorSnapshots = [];
    // 상징 통계 초기화
    this.relicAcquisitions = {};
    this.relicEffectTriggers = {};
    this.relicRunResults = [];
    this.startTime = new Date();
  }

  // ==================== 신규 통계 계산 메서드 ====================

  /** 포커 콤보 통계 계산 */
  private calculatePokerComboStats(): PokerComboStats {
    const comboFrequency: Record<string, number> = { ...this.comboTypeUsage };
    const etherByCombo: Record<string, number> = {};
    const avgEtherByCombo: Record<string, number> = {};
    const winRateByCombo: Record<string, number> = {};
    const comboDetails = new Map<ComboDetailStats['comboType'], ComboDetailStats>();

    // 배틀 기록에서 콤보 통계 추출
    for (const comboType of Object.keys(this.comboTypeUsage)) {
      const frequency = this.comboTypeUsage[comboType] || 0;
      const battles = this.comboTypeBattles[comboType] || 0;
      const wins = this.comboTypeWins[comboType] || 0;
      const totalEther = this.comboTypeEther[comboType] || 0;

      // 에테르 통계
      etherByCombo[comboType] = totalEther;
      avgEtherByCombo[comboType] = battles > 0 ? totalEther / battles : 0;

      // 콤보 발생 전투에서의 승률
      winRateByCombo[comboType] = battles > 0 ? wins / battles : 0;

      comboDetails.set(comboType, {
        comboType,
        totalOccurrences: frequency,
        inWins: wins,
        inLosses: battles - wins,
        totalEtherGained: totalEther,
        avgEtherGained: battles > 0 ? totalEther / battles : 0,
        winRateAfterCombo: battles > 0 ? wins / battles : 0,
        contextStats: {
          byFloorRange: {},
          byEnemyType: {},
          byTurn: new Map(),
        },
        cardCombinations: [],
      });
    }

    return {
      comboFrequency,
      etherByCombo,
      avgEtherByCombo,
      winRateByCombo,
      comboDetails,
    };
  }

  /** 토큰 통계 계산 */
  private calculateTokenStats(): Map<string, TokenStats> {
    const result = new Map<string, TokenStats>();

    for (const [tokenId, count] of Object.entries(this.tokenTypeUsage)) {
      if (count === 0) continue;

      result.set(tokenId, {
        tokenId,
        tokenName: tokenId, // 토큰 라이브러리가 없으므로 ID 사용
        category: 'neutral',
        timesAcquired: count,
        timesUsed: count,
        usageRate: 1.0,
        timesExpired: 0,
        effectStats: {
          totalDamage: 0,
          totalBlock: 0,
          totalHealing: 0,
          totalEtherGained: 0,
          specialEffects: {},
          avgValuePerUse: 0,
        },
        contextStats: {
          byHpState: {
            critical: { uses: 0, avgValue: 0 },
            unstable: { uses: 0, avgValue: 0 },
            stable: { uses: 0, avgValue: 0 },
          },
          byBattleType: {
            normal: { uses: 0, avgValue: 0 },
            elite: { uses: 0, avgValue: 0 },
            boss: { uses: 0, avgValue: 0 },
          },
          byTurn: new Map(),
          frequentCardCombos: [],
        },
      });
    }

    return result;
  }

  /** 층 진행 분석 계산 */
  private calculateFloorProgressionAnalysis(): FloorProgressionAnalysis {
    const floorStats = new Map<number, FloorDetailedStats>();
    const difficultySpikes: FloorProgressionAnalysis['difficultySpikes'] = [];
    const hpCurve: FloorProgressionAnalysis['resourceCurves']['hpCurve'] = [];
    const goldCurve: FloorProgressionAnalysis['resourceCurves']['goldCurve'] = [];
    const deckSizeCurve: FloorProgressionAnalysis['resourceCurves']['deckSizeCurve'] = [];

    // recentRunProgressions에서 층별 데이터 집계
    const floorData: Record<number, {
      hpSum: number;
      hpRatioSum: number;
      goldSum: number;
      deckSizeSum: number;
      count: number;
    }> = {};

    for (const run of this.recentRunProgressions) {
      for (const floor of run.floorProgression) {
        if (!floorData[floor.floor]) {
          floorData[floor.floor] = { hpSum: 0, hpRatioSum: 0, goldSum: 0, deckSizeSum: 0, count: 0 };
        }
        floorData[floor.floor].hpSum += floor.hp;
        floorData[floor.floor].hpRatioSum += floor.maxHp > 0 ? floor.hp / floor.maxHp : 0;
        floorData[floor.floor].goldSum += floor.gold;
        floorData[floor.floor].deckSizeSum += floor.deckSize;
        floorData[floor.floor].count++;
      }
    }

    // 자원 커브 생성
    for (const [floorNum, data] of Object.entries(floorData)) {
      const floor = Number(floorNum);
      const count = data.count || 1;

      hpCurve.push({
        floor,
        avgHp: data.hpSum / count,
        avgHpRatio: data.hpRatioSum / count,
      });
      goldCurve.push({ floor, avgGold: data.goldSum / count });
      deckSizeCurve.push({ floor, avgSize: data.deckSizeSum / count });
    }

    // 정렬
    hpCurve.sort((a, b) => a.floor - b.floor);
    goldCurve.sort((a, b) => a.floor - b.floor);
    deckSizeCurve.sort((a, b) => a.floor - b.floor);

    return {
      floorStats,
      difficultySpikes,
      resourceCurves: {
        hpCurve,
        goldCurve,
        deckSizeCurve,
      },
      optimalPathAnalysis: {
        highWinRatePaths: [],
        lowWinRatePaths: [],
      },
      bottleneckAnalysis: {
        highFailureFloors: [],
        resourceDepletionZones: [],
      },
    };
  }

  // ==================== 영향력 분석 빌더 메서드 ====================

  /** 이벤트 영향력 분석 빌드 */
  private buildEventImpactAnalysis(): EventImpactAnalysis {
    return {
      eventImpacts: new Map(),
      mostBeneficialEvents: [],
      mostDetrimentalEvents: [],
      overallEventInfluence: {
        winContribution: 0,
        lossContribution: 0,
        mostFatalChoice: null,
      },
    };
  }

  /** 상징 시너지 영향력 분석 빌드 */
  private buildRelicSynergyImpactAnalysis(): RelicSynergyImpactAnalysis {
    return {
      synergyCombinations: new Map(),
      topSynergies: [],
      antiSynergies: [],
      relicCountImpact: [],
      coreRelics: [],
      contextualRelicValues: new Map(),
    };
  }

  /** 성장 결정 분석 빌드 */
  private buildGrowthDecisionAnalysis(): GrowthDecisionAnalysis {
    return {
      decisions: [],
      reasonsByType: {},
      contextualPatterns: [],
      decisionAccuracy: {
        correctChoiceRate: 0,
        commonMistakes: [],
        accuracyByContext: {},
      },
      optimalPaths: [],
    };
  }

  /** 카드 선택 이유 분석 빌드 */
  private buildCardSelectionReasoningAnalysis(): CardSelectionReasoningAnalysis {
    return {
      decisions: [],
      reasonsByCard: new Map(),
      skipReasonAnalysis: {
        totalSkips: 0,
        reasonDistribution: {},
        winRateAfterSkip: 0,
        shouldHaveSkipped: [],
        shouldNotHaveSkipped: [],
      },
      selectionAccuracy: {
        correctRate: 0,
        commonMistakes: [],
        accuracyByContext: {},
      },
      cardValueAssessment: new Map(),
      optimalPickGuide: [],
    };
  }
}

// ==================== 통계 리포터 (분리됨) ====================
// StatsReporter는 stats-reporter.ts로 분리되었습니다.

import { StatsReporter, createReporter } from './stats-reporter';

// 하위 호환성을 위한 재내보내기
export { StatsReporter, createReporter };

// ==================== 헬퍼 함수 ====================

/** 간편한 통계 수집 및 리포트 생성 */
export function createStatsCollector(
  cardLibrary?: Record<string, { name: string; type: string; special?: string[] }>
): StatsCollector {
  return new StatsCollector(cardLibrary);
}
