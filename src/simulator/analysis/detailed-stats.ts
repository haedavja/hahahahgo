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
  RecordStats,
  DetailedStats,
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
  RecordStats,
  ShopServiceStats,
  ItemUsageStats,
  CardUpgradeStats,
  GrowthStats,
  ShopStats,
  DungeonStats,
  RunStats,
} from './detailed-stats-types';

// ==================== 통계 수집기 ====================

export class StatsCollector {
  private cardStats: Map<string, CardEffectStats> = new Map();
  private monsterStats: Map<string, MonsterBattleStats> = new Map();
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
  private logosActivations: Record<string, number> = {};
  private growthLevels: number[] = [];

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

  /** 전투 결과 기록 */
  recordBattle(
    result: BattleResult,
    monster: { id: string; name: string; tier?: number; isBoss?: boolean; isElite?: boolean }
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

    // 카드 통계 업데이트
    for (const [cardId, uses] of Object.entries(result.cardUsage)) {
      this.updateCardStats(cardId, uses, isWin, result.events);
    }

    // 몬스터 통계 업데이트
    this.updateMonsterStats(monster, result);
  }

  /** 카드 통계 업데이트 */
  private updateCardStats(cardId: string, uses: number, isWin: boolean, events: BattleEvent[]) {
    if (!this.cardStats.has(cardId)) {
      const cardInfo = this.cardLibrary[cardId] || { name: cardId, type: 'unknown' };
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
    for (const event of events) {
      if (event.cardId === cardId) {
        if (event.type === 'damage_dealt' && event.actor === 'player') {
          stats.totalDamage += event.value || 0;
        }
        if (event.type === 'block_gained' && event.actor === 'player') {
          stats.totalBlock += event.value || 0;
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

    // 평균 계산
    if (stats.totalUses > 0) {
      stats.avgDamage = stats.totalDamage / stats.totalUses;
      stats.avgBlock = stats.totalBlock / stats.totalUses;
      stats.winContribution = stats.usesInWins / (stats.usesInWins + stats.usesInLosses);
    }
  }

  /** 몬스터 통계 업데이트 */
  private updateMonsterStats(
    monster: { id: string; name: string; tier?: number; isBoss?: boolean },
    result: BattleResult
  ) {
    if (!this.monsterStats.has(monster.id)) {
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
  recordGrowthInvestment(stat: string, amount: number = 1) {
    this.statInvestments[stat] = (this.statInvestments[stat] || 0) + amount;
  }

  /** 로고스 효과 활성화 기록 */
  recordLogosActivation(effectName: string) {
    this.logosActivations[effectName] = (this.logosActivations[effectName] || 0) + 1;
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
    const recordStats = this.calculateRecordStats();

    return {
      startTime: this.startTime,
      endTime: new Date(),
      cardStats: this.cardStats,
      monsterStats: this.monsterStats,
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
      recordStats,
    };
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
    const totalInvestments = Object.values(this.statInvestments).reduce((a, b) => a + b, 0);

    const levelDistribution: Record<number, number> = {};
    for (const level of this.growthLevels) {
      levelDistribution[level] = (levelDistribution[level] || 0) + 1;
    }

    return {
      statInvestments: this.statInvestments,
      totalInvestments,
      avgInvestmentsPerRun: totalInvestments / totalRuns,
      logosActivations: this.logosActivations,
      levelDistribution,
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
    this.logosActivations = {};
    this.growthLevels = [];
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
    this.startTime = new Date();
  }
}

// ==================== 통계 리포터 ====================

export class StatsReporter {
  constructor(private stats: DetailedStats) {}

  /** 카드 효과 리포트 생성 */
  generateCardReport(): string {
    const lines: string[] = [];
    lines.push('');
    lines.push('╔══════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                           카드 효과 상세 분석                             ║');
    lines.push('╚══════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    // 사용 빈도 TOP 15
    const sortedByUsage = Array.from(this.stats.cardStats.values())
      .sort((a, b) => b.totalUses - a.totalUses)
      .slice(0, 15);

    lines.push('┌─────────────────────────────────────────────────────────────────────────┐');
    lines.push('│ 【 카드 사용 빈도 TOP 15 】                                             │');
    lines.push('├────────────┬───────┬────────┬─────────┬─────────┬───────────────────────┤');
    lines.push('│ 카드       │ 횟수  │ 승률   │ 평균DMG │ 평균BLK │ 사용 비율             │');
    lines.push('├────────────┼───────┼────────┼─────────┼─────────┼───────────────────────┤');

    const maxUses = sortedByUsage[0]?.totalUses || 1;
    for (const card of sortedByUsage) {
      const name = card.cardName.substring(0, 10).padEnd(10);
      const uses = String(card.totalUses).padStart(5);
      const winRate = (card.winContribution * 100).toFixed(0) + '%';
      const avgDmg = card.avgDamage.toFixed(1).padStart(7);
      const avgBlk = card.avgBlock.toFixed(1).padStart(7);
      const barLen = Math.floor((card.totalUses / maxUses) * 15);
      const bar = '█'.repeat(barLen).padEnd(15);
      lines.push(`│ ${name} │${uses} │ ${winRate.padStart(5)} │${avgDmg} │${avgBlk} │ ${bar}       │`);
    }
    lines.push('└────────────┴───────┴────────┴─────────┴─────────┴───────────────────────┘');

    // 피해량 TOP 10
    lines.push('');
    const sortedByDamage = Array.from(this.stats.cardStats.values())
      .filter(c => c.totalDamage > 0)
      .sort((a, b) => b.totalDamage - a.totalDamage)
      .slice(0, 10);

    if (sortedByDamage.length > 0) {
      lines.push('┌─────────────────────────────────────────────────────────────────────────┐');
      lines.push('│ 【 총 피해량 TOP 10 】                                                  │');
      lines.push('├────────────┬───────────┬─────────┬────────────────────────────────────┤');
      lines.push('│ 카드       │ 총 피해량 │ 평균    │ 피해 비율                          │');
      lines.push('├────────────┼───────────┼─────────┼────────────────────────────────────┤');

      const maxDmg = sortedByDamage[0]?.totalDamage || 1;
      for (const card of sortedByDamage) {
        const name = card.cardName.substring(0, 10).padEnd(10);
        const total = String(card.totalDamage).padStart(9);
        const avg = card.avgDamage.toFixed(1).padStart(7);
        const barLen = Math.floor((card.totalDamage / maxDmg) * 25);
        const bar = '█'.repeat(barLen).padEnd(25);
        lines.push(`│ ${name} │${total} │${avg} │ ${bar}          │`);
      }
      lines.push('└────────────┴───────────┴─────────┴────────────────────────────────────┘');
    }

    // 특수효과 카드
    const specialCards = Array.from(this.stats.cardStats.values())
      .filter(c => c.crossTriggers > 0 || Object.keys(c.specialTriggers).length > 0);

    if (specialCards.length > 0) {
      lines.push('');
      lines.push('┌─────────────────────────────────────────────────────────────────────────┐');
      lines.push('│ 【 특수효과 발동 통계 】                                                │');
      lines.push('├────────────┬───────────┬───────────────────────────────────────────────┤');
      lines.push('│ 카드       │ 교차 발동 │ 기타 효과                                     │');
      lines.push('├────────────┼───────────┼───────────────────────────────────────────────┤');

      for (const card of specialCards.slice(0, 10)) {
        const name = card.cardName.substring(0, 10).padEnd(10);
        const cross = String(card.crossTriggers).padStart(9);
        const effects = Object.entries(card.specialTriggers)
          .map(([k, v]) => `${k}:${v}`)
          .join(', ')
          .substring(0, 35)
          .padEnd(35);
        lines.push(`│ ${name} │${cross} │ ${effects}           │`);
      }
      lines.push('└────────────┴───────────┴───────────────────────────────────────────────┘');
    }

    return lines.join('\n');
  }

  /** 몬스터 전투 리포트 생성 */
  generateMonsterReport(): string {
    const lines: string[] = [];
    lines.push('');
    lines.push('╔══════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                          몬스터별 전투 분석                               ║');
    lines.push('╚══════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    const sorted = Array.from(this.stats.monsterStats.values())
      .sort((a, b) => b.battles - a.battles);

    // 일반 몬스터
    const regular = sorted.filter(m => !m.isBoss);
    if (regular.length > 0) {
      lines.push('┌─────────────────────────────────────────────────────────────────────────┐');
      lines.push('│ 【 일반 전투 】                                                         │');
      lines.push('├────────────────┬───────┬────────┬────────┬─────────┬──────────────────┤');
      lines.push('│ 몬스터         │ 횟수  │ 승률   │ 평균턴 │ 받은DMG │ 준DMG            │');
      lines.push('├────────────────┼───────┼────────┼────────┼─────────┼──────────────────┤');

      for (const m of regular.slice(0, 10)) {
        const name = m.monsterName.substring(0, 14).padEnd(14);
        const battles = String(m.battles).padStart(5);
        const winRate = (m.winRate * 100).toFixed(0) + '%';
        const avgTurns = m.avgTurns.toFixed(1).padStart(6);
        const dmgTaken = m.avgDamageTaken.toFixed(0).padStart(7);
        const dmgDealt = m.avgDamageDealt.toFixed(0).padStart(7);
        lines.push(`│ ${name} │${battles} │ ${winRate.padStart(5)} │${avgTurns} │${dmgTaken} │${dmgDealt}          │`);
      }
      lines.push('└────────────────┴───────┴────────┴────────┴─────────┴──────────────────┘');
    }

    // 보스
    const bosses = sorted.filter(m => m.isBoss);
    if (bosses.length > 0) {
      lines.push('');
      lines.push('┌─────────────────────────────────────────────────────────────────────────┐');
      lines.push('│ 【 보스 전투 】                                                         │');
      lines.push('├────────────────┬───────┬────────┬────────┬─────────┬──────────────────┤');
      lines.push('│ 보스           │ 횟수  │ 승률   │ 평균턴 │ 남은HP  │ 주요 카드        │');
      lines.push('├────────────────┼───────┼────────┼────────┼─────────┼──────────────────┤');

      for (const m of bosses) {
        const name = m.monsterName.substring(0, 14).padEnd(14);
        const battles = String(m.battles).padStart(5);
        const winRate = (m.winRate * 100).toFixed(0) + '%';
        const avgTurns = m.avgTurns.toFixed(1).padStart(6);
        const hpRemain = m.avgHpRemainingOnWin.toFixed(0).padStart(7);
        const topCard = m.topCardsUsed[0]?.cardId.substring(0, 10) || '-';
        lines.push(`│ ${name} │${battles} │ ${winRate.padStart(5)} │${avgTurns} │${hpRemain} │ ${topCard.padEnd(16)}│`);
      }
      lines.push('└────────────────┴───────┴────────┴────────┴─────────┴──────────────────┘');
    }

    return lines.join('\n');
  }

  /** 런 전체 리포트 생성 */
  generateRunReport(): string {
    const lines: string[] = [];
    const rs = this.stats.runStats;

    lines.push('');
    lines.push('╔══════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                            런 전체 통계                                   ║');
    lines.push('╚══════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    lines.push('【 전체 요약 】');
    lines.push(`  총 런: ${rs.totalRuns}회`);
    lines.push(`  성공: ${rs.successfulRuns}회 (${(rs.successRate * 100).toFixed(1)}%)`);
    lines.push(`  평균 도달 층: ${rs.avgLayerReached.toFixed(1)}`);
    lines.push(`  평균 전투 승리: ${rs.avgBattlesWon.toFixed(1)}`);
    lines.push(`  평균 골드 획득: ${rs.avgGoldEarned.toFixed(0)}`);
    lines.push(`  평균 덱 크기: ${rs.avgFinalDeckSize.toFixed(1)}`);

    if (Object.keys(rs.deathCauses).length > 0) {
      lines.push('');
      lines.push('【 사망 원인 】');
      const sortedCauses = Object.entries(rs.deathCauses)
        .sort((a, b) => b[1] - a[1]);
      for (const [cause, count] of sortedCauses) {
        lines.push(`  ${cause}: ${count}회`);
      }
    }

    if (Object.keys(rs.deathByLayer).length > 0) {
      lines.push('');
      lines.push('【 층별 사망 분포 】');
      const sortedLayers = Object.entries(rs.deathByLayer)
        .sort((a, b) => Number(a[0]) - Number(b[0]));
      for (const [layer, count] of sortedLayers) {
        const bar = '█'.repeat(count);
        lines.push(`  층 ${layer.padStart(2)}: ${bar} (${count})`);
      }
    }

    if (Object.keys(rs.strategyWinRates).length > 0) {
      lines.push('');
      lines.push('【 전략별 승률 】');
      const sortedStrats = Object.entries(rs.strategyWinRates)
        .sort((a, b) => b[1] - a[1]);
      for (const [strategy, rate] of sortedStrats) {
        lines.push(`  ${strategy}: ${(rate * 100).toFixed(1)}%`);
      }
    }

    return lines.join('\n');
  }

  /** 카드 승급 리포트 생성 */
  generateUpgradeReport(): string {
    const lines: string[] = [];
    const us = this.stats.upgradeStats;

    lines.push('');
    lines.push('╔══════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                           카드 승급 통계                                  ║');
    lines.push('╚══════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    lines.push('【 승급 요약 】');
    lines.push(`  총 승급 횟수: ${us.totalUpgrades}회`);
    lines.push(`  런당 평균 승급: ${us.avgUpgradesPerRun.toFixed(1)}회`);
    lines.push(`  승급-승률 상관관계: ${(us.upgradeWinCorrelation * 100).toFixed(1)}%`);

    if (Object.keys(us.upgradesByCard).length > 0) {
      lines.push('');
      lines.push('【 카드별 승급 횟수 TOP 10 】');
      const sorted = Object.entries(us.upgradesByCard)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      for (const [cardId, count] of sorted) {
        const bar = '█'.repeat(Math.min(20, count));
        lines.push(`  ${cardId.padEnd(15)}: ${String(count).padStart(3)}회 ${bar}`);
      }
    }

    return lines.join('\n');
  }

  /** 성장 시스템 리포트 생성 */
  generateGrowthReport(): string {
    const lines: string[] = [];
    const gs = this.stats.growthStats;

    lines.push('');
    lines.push('╔══════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                          성장 시스템 통계                                 ║');
    lines.push('╚══════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    lines.push('【 성장 요약 】');
    lines.push(`  총 투자 횟수: ${gs.totalInvestments}회`);
    lines.push(`  런당 평균 투자: ${gs.avgInvestmentsPerRun.toFixed(1)}회`);

    if (Object.keys(gs.statInvestments).length > 0) {
      lines.push('');
      lines.push('【 스탯별 투자 】');
      const sorted = Object.entries(gs.statInvestments)
        .sort((a, b) => b[1] - a[1]);
      for (const [stat, count] of sorted) {
        const bar = '█'.repeat(Math.min(25, count));
        lines.push(`  ${stat.padEnd(12)}: ${String(count).padStart(3)}회 ${bar}`);
      }
    }

    if (Object.keys(gs.logosActivations).length > 0) {
      lines.push('');
      lines.push('【 로고스 효과 활성화 】');
      for (const [effect, count] of Object.entries(gs.logosActivations)) {
        lines.push(`  ${effect}: ${count}회`);
      }
    }

    if (Object.keys(gs.levelDistribution).length > 0) {
      lines.push('');
      lines.push('【 성장 레벨 분포 】');
      const sorted = Object.entries(gs.levelDistribution)
        .sort((a, b) => Number(a[0]) - Number(b[0]));
      for (const [level, count] of sorted) {
        const bar = '█'.repeat(count);
        lines.push(`  레벨 ${level.padStart(2)}: ${bar} (${count})`);
      }
    }

    return lines.join('\n');
  }

  /** 상점 리포트 생성 */
  generateShopReport(): string {
    const lines: string[] = [];
    const ss = this.stats.shopStats;

    lines.push('');
    lines.push('╔══════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                            상점 이용 통계                                 ║');
    lines.push('╚══════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    lines.push('【 상점 요약 】');
    lines.push(`  총 방문 횟수: ${ss.totalVisits}회`);
    lines.push(`  총 지출: ${ss.totalSpent}G`);
    lines.push(`  방문당 평균 지출: ${ss.avgSpentPerVisit.toFixed(0)}G`);
    lines.push(`  카드 제거: ${ss.cardsRemoved}회`);
    lines.push(`  카드 승급: ${ss.cardsUpgraded}회`);

    if (Object.keys(ss.cardsPurchased).length > 0) {
      lines.push('');
      lines.push('【 구매한 카드 TOP 10 】');
      const sorted = Object.entries(ss.cardsPurchased)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      for (const [cardId, count] of sorted) {
        lines.push(`  ${cardId.padEnd(15)}: ${count}회`);
      }
    }

    if (Object.keys(ss.relicsPurchased).length > 0) {
      lines.push('');
      lines.push('【 구매한 상징 】');
      for (const [relicId, count] of Object.entries(ss.relicsPurchased)) {
        lines.push(`  ${relicId}: ${count}회`);
      }
    }

    // 구매 이유 통계
    if (ss.purchaseRecords && ss.purchaseRecords.length > 0) {
      lines.push('');
      lines.push('【 구매 결정 이유 분석 】');

      // 이유별 그룹핑
      const reasonCounts: Record<string, { count: number; items: string[]; totalCost: number }> = {};
      for (const record of ss.purchaseRecords) {
        if (!reasonCounts[record.reason]) {
          reasonCounts[record.reason] = { count: 0, items: [], totalCost: 0 };
        }
        reasonCounts[record.reason].count++;
        reasonCounts[record.reason].items.push(record.itemName);
        reasonCounts[record.reason].totalCost += record.price;
      }

      const sortedReasons = Object.entries(reasonCounts)
        .sort((a, b) => b[1].count - a[1].count);

      lines.push('┌──────────────────────────────────┬─────┬─────────┬──────────────────────┐');
      lines.push('│ 구매 이유                        │ 횟수│ 총비용  │ 주요 아이템          │');
      lines.push('├──────────────────────────────────┼─────┼─────────┼──────────────────────┤');

      for (const [reason, data] of sortedReasons.slice(0, 15)) {
        const reasonStr = reason.substring(0, 32).padEnd(32);
        const countStr = String(data.count).padStart(3);
        const costStr = `${data.totalCost}G`.padStart(7);
        // 가장 많이 구매한 아이템
        const itemCounts: Record<string, number> = {};
        for (const item of data.items) {
          itemCounts[item] = (itemCounts[item] || 0) + 1;
        }
        const topItem = Object.entries(itemCounts)
          .sort((a, b) => b[1] - a[1])[0];
        const topItemStr = topItem ? `${topItem[0]}(${topItem[1]})`.substring(0, 20) : '-';
        lines.push(`│ ${reasonStr} │ ${countStr} │${costStr} │ ${topItemStr.padEnd(20)} │`);
      }
      lines.push('└──────────────────────────────────┴─────┴─────────┴──────────────────────┘');

      // 타입별 구매 이유 세부 분석
      lines.push('');
      lines.push('【 타입별 구매 상세 (최근 20건) 】');

      const recentRecords = ss.purchaseRecords.slice(-20);
      const byType: Record<string, typeof recentRecords> = {
        card: [],
        relic: [],
        item: [],
      };
      for (const record of recentRecords) {
        byType[record.type]?.push(record);
      }

      for (const [type, records] of Object.entries(byType)) {
        if (records.length === 0) continue;
        const typeLabel = type === 'card' ? '카드' : type === 'relic' ? '상징' : '아이템';
        lines.push(`  [${typeLabel}]`);
        for (const record of records.slice(0, 5)) {
          lines.push(`    ${record.itemName.padEnd(12)} ${record.price}G | ${record.reason}`);
        }
        if (records.length > 5) {
          lines.push(`    ... 외 ${records.length - 5}건`);
        }
      }
    }

    return lines.join('\n');
  }

  /** 던전 리포트 생성 */
  generateDungeonReport(): string {
    const lines: string[] = [];
    const ds = this.stats.dungeonStats;

    lines.push('');
    lines.push('╔══════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                           던전 돌파 통계                                  ║');
    lines.push('╚══════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    lines.push('【 던전 요약 】');
    lines.push(`  총 진입: ${ds.totalAttempts}회`);
    lines.push(`  클리어: ${ds.clears}회 (${(ds.clearRate * 100).toFixed(1)}%)`);
    lines.push(`  평균 소요 턴: ${ds.avgTurns.toFixed(1)}`);
    lines.push(`  평균 받은 피해: ${ds.avgDamageTaken.toFixed(1)}`);

    if (Object.keys(ds.clearsByDungeon).length > 0) {
      lines.push('');
      lines.push('【 던전별 클리어 】');
      for (const [dungeonId, count] of Object.entries(ds.clearsByDungeon)) {
        lines.push(`  ${dungeonId}: ${count}회`);
      }
    }

    lines.push('');
    lines.push('【 던전 보상 총계 】');
    lines.push(`  골드: ${ds.rewards.gold}G`);
    lines.push(`  카드: ${ds.rewards.cards.length}장`);
    lines.push(`  상징: ${ds.rewards.relics.length}개`);

    return lines.join('\n');
  }

  /** 이벤트 리포트 생성 */
  generateEventReport(): string {
    const lines: string[] = [];

    lines.push('');
    lines.push('╔══════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                            이벤트 통계                                    ║');
    lines.push('╚══════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    const events = Array.from(this.stats.eventStats.values())
      .sort((a, b) => b.occurrences - a.occurrences);

    if (events.length === 0) {
      lines.push('  이벤트 기록 없음');
      return lines.join('\n');
    }

    lines.push('【 이벤트 발생 빈도 TOP 15 】');
    lines.push('┌──────────────────────┬─────┬──────┬───────────────────────────────────────┐');
    lines.push('│ 이벤트               │ 횟수│ 성공 │ 자원 변화                             │');
    lines.push('├──────────────────────┼─────┼──────┼───────────────────────────────────────┤');

    for (const ev of events.slice(0, 15)) {
      const name = ev.eventName.substring(0, 20).padEnd(20);
      const count = String(ev.occurrences).padStart(3);
      const rate = (ev.successRate * 100).toFixed(0) + '%';

      // 자원 변화 문자열 생성
      const changes: string[] = [];
      if (ev.totalHpChange !== 0) changes.push(`HP${ev.totalHpChange >= 0 ? '+' : ''}${ev.totalHpChange}`);
      if (ev.totalGoldChange !== 0) changes.push(`금${ev.totalGoldChange >= 0 ? '+' : ''}${ev.totalGoldChange}`);
      if (ev.totalIntelChange !== 0) changes.push(`정보${ev.totalIntelChange >= 0 ? '+' : ''}${ev.totalIntelChange}`);
      if (ev.totalMaterialChange !== 0) changes.push(`재료${ev.totalMaterialChange >= 0 ? '+' : ''}${ev.totalMaterialChange}`);
      if (ev.totalInsightChange !== 0) changes.push(`통찰${ev.totalInsightChange >= 0 ? '+' : ''}${ev.totalInsightChange}`);
      if (ev.totalGraceChange !== 0) changes.push(`은총${ev.totalGraceChange >= 0 ? '+' : ''}${ev.totalGraceChange}`);
      if (ev.totalLootChange !== 0) changes.push(`전리품${ev.totalLootChange >= 0 ? '+' : ''}${ev.totalLootChange}`);

      const resourceStr = changes.length > 0 ? changes.join(', ') : '-';
      lines.push(`│ ${name} │ ${count} │${rate.padStart(5)} │ ${resourceStr.substring(0, 37).padEnd(37)} │`);
    }
    lines.push('└──────────────────────┴─────┴──────┴───────────────────────────────────────┘');

    // 이벤트에서 획득한 보상 총계
    const allCards = events.flatMap(e => e.cardsGained);
    const allRelics = events.flatMap(e => e.relicsGained);
    const totalIntel = events.reduce((sum, e) => sum + e.totalIntelChange, 0);
    const totalMaterial = events.reduce((sum, e) => sum + e.totalMaterialChange, 0);
    const totalGold = events.reduce((sum, e) => sum + e.totalGoldChange, 0);
    const totalInsight = events.reduce((sum, e) => sum + e.totalInsightChange, 0);

    lines.push('');
    lines.push('【 이벤트 보상 총계 】');
    lines.push(`  골드: ${totalGold >= 0 ? '+' : ''}${totalGold}G`);
    lines.push(`  정보: ${totalIntel >= 0 ? '+' : ''}${totalIntel}`);
    lines.push(`  원자재: ${totalMaterial >= 0 ? '+' : ''}${totalMaterial}`);
    lines.push(`  통찰: ${totalInsight >= 0 ? '+' : ''}${totalInsight}`);
    if (allCards.length > 0) {
      lines.push(`  획득 카드: ${allCards.length}장`);
    }
    if (allRelics.length > 0) {
      lines.push(`  획득 상징: ${allRelics.length}개`);
    }

    return lines.join('\n');
  }

  /** 상점 서비스 상세 리포트 생성 */
  generateShopServiceReport(): string {
    const lines: string[] = [];
    const ss = this.stats.shopServiceStats;

    lines.push('');
    lines.push('╔══════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                        상점 서비스 상세 통계                              ║');
    lines.push('╚══════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    lines.push('【 서비스 이용 요약 】');
    lines.push(`  치료 이용: ${ss.healingUsed}회`);
    lines.push(`  치료로 회복한 HP: ${ss.totalHpHealed}`);
    lines.push(`  치료 비용 총합: ${ss.healingCost}G`);
    lines.push('');
    lines.push(`  카드 제거 비용 총합: ${ss.removalCost}G`);
    lines.push(`  카드 승급 비용 총합: ${ss.upgradeCost}G`);
    lines.push(`  새로고침: ${ss.refreshUsed}회 (총 ${ss.refreshCost}G)`);

    if (Object.keys(ss.removedCards).length > 0) {
      lines.push('');
      lines.push('【 제거한 카드 TOP 10 】');
      const sorted = Object.entries(ss.removedCards)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      for (const [cardId, count] of sorted) {
        lines.push(`  ${cardId.padEnd(20)}: ${count}회`);
      }
    }

    if (Object.keys(ss.upgradedCards).length > 0) {
      lines.push('');
      lines.push('【 상점에서 승급한 카드 TOP 10 】');
      const sorted = Object.entries(ss.upgradedCards)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      for (const [cardId, count] of sorted) {
        lines.push(`  ${cardId.padEnd(20)}: ${count}회`);
      }
    }

    return lines.join('\n');
  }

  /** 아이템 활용 리포트 생성 */
  generateItemReport(): string {
    const lines: string[] = [];
    const is = this.stats.itemUsageStats;

    lines.push('');
    lines.push('╔══════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                           아이템 활용 통계                                ║');
    lines.push('╚══════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    const totalAcquired = Object.values(is.itemsAcquired).reduce((a, b) => a + b, 0);
    const totalUsed = Object.values(is.itemsUsed).reduce((a, b) => a + b, 0);
    const totalDiscarded = Object.values(is.itemsDiscarded).reduce((a, b) => a + b, 0);

    lines.push('【 아이템 요약 】');
    lines.push(`  총 획득: ${totalAcquired}개`);
    lines.push(`  총 사용: ${totalUsed}개`);
    lines.push(`  사용률: ${totalAcquired > 0 ? ((totalUsed / totalAcquired) * 100).toFixed(1) : 0}%`);
    lines.push(`  버림: ${totalDiscarded}개`);

    if (Object.keys(is.itemsAcquired).length > 0) {
      lines.push('');
      lines.push('【 획득한 아이템 TOP 10 】');
      const sorted = Object.entries(is.itemsAcquired)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      for (const [itemId, count] of sorted) {
        const used = is.itemsUsed[itemId] || 0;
        const usageRate = ((used / count) * 100).toFixed(0);
        lines.push(`  ${itemId.padEnd(15)}: ${String(count).padStart(3)}개 획득, ${String(used).padStart(3)}개 사용 (${usageRate}%)`);
      }
    }

    if (Object.keys(is.itemsUsed).length > 0) {
      lines.push('');
      lines.push('【 아이템별 사용 효과 】');
      const sorted = Object.entries(is.itemEffects)
        .filter(([_, eff]) => eff.timesUsed > 0)
        .sort((a, b) => b[1].timesUsed - a[1].timesUsed)
        .slice(0, 10);
      for (const [itemId, eff] of sorted) {
        lines.push(`  ${itemId}:`);
        lines.push(`    사용 ${eff.timesUsed}회 | HP회복: ${eff.totalHpHealed} | 피해: ${eff.totalDamage} | 골드: ${eff.totalGoldGained}`);
        if (Object.keys(eff.specialEffects).length > 0) {
          const effects = Object.entries(eff.specialEffects).map(([k, v]) => `${k}:${v}`).join(', ');
          lines.push(`    특수효과: ${effects}`);
        }
      }
    }

    // 전투 중/외 사용 비교
    const inBattle = Object.values(is.usageContext.inBattle).reduce((a, b) => a + b, 0);
    const outBattle = Object.values(is.usageContext.outOfBattle).reduce((a, b) => a + b, 0);
    if (inBattle > 0 || outBattle > 0) {
      lines.push('');
      lines.push('【 사용 상황 】');
      lines.push(`  전투 중 사용: ${inBattle}회`);
      lines.push(`  전투 외 사용: ${outBattle}회`);
    }

    if (Object.keys(is.itemsDiscarded).length > 0) {
      lines.push('');
      lines.push('【 버린 아이템 】');
      for (const [itemId, count] of Object.entries(is.itemsDiscarded)) {
        lines.push(`  ${itemId}: ${count}개`);
      }
    }

    return lines.join('\n');
  }

  /** 이벤트 선택 상세 리포트 생성 */
  generateEventChoiceReport(): string {
    const lines: string[] = [];

    lines.push('');
    lines.push('╔══════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                        이벤트 선택 상세 통계                              ║');
    lines.push('╚══════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    const events = Array.from(this.stats.eventChoiceStats.values())
      .sort((a, b) => b.occurrences - a.occurrences);

    if (events.length === 0) {
      lines.push('  이벤트 선택 기록 없음');
      return lines.join('\n');
    }

    // 전체 통계
    const totalEvents = events.reduce((sum, e) => sum + e.occurrences, 0);
    const totalSkipped = events.reduce((sum, e) => sum + e.timesSkipped, 0);
    lines.push('【 전체 요약 】');
    lines.push(`  이벤트 발생: ${totalEvents}회`);
    lines.push(`  패스: ${totalSkipped}회 (${((totalSkipped / totalEvents) * 100).toFixed(1)}%)`);

    // 이벤트별 상세
    lines.push('');
    lines.push('【 이벤트별 선택 상세 】');
    for (const ev of events.slice(0, 10)) {
      lines.push('');
      lines.push(`▶ ${ev.eventName} (${ev.occurrences}회)`);

      // 선택지 분포
      if (Object.keys(ev.choicesMade).length > 0) {
        lines.push('  선택 분포:');
        const sorted = Object.entries(ev.choicesMade)
          .sort((a, b) => b[1] - a[1]);
        for (const [choiceId, count] of sorted) {
          const outcome = ev.choiceOutcomes[choiceId];
          const rate = ((count / ev.occurrences) * 100).toFixed(0);
          let desc = `    ${choiceId}: ${count}회 (${rate}%)`;
          if (outcome) {
            const hpStr = outcome.avgHpChange >= 0 ? `+${outcome.avgHpChange.toFixed(1)}` : outcome.avgHpChange.toFixed(1);
            const goldStr = outcome.avgGoldChange >= 0 ? `+${outcome.avgGoldChange.toFixed(0)}` : outcome.avgGoldChange.toFixed(0);
            desc += ` | HP: ${hpStr}, 골드: ${goldStr}, 성공률: ${(outcome.successRate * 100).toFixed(0)}%`;
          }
          lines.push(desc);
        }
      }

      // 패스 이유
      if (ev.timesSkipped > 0 && Object.keys(ev.skipReasons).length > 0) {
        lines.push(`  패스 ${ev.timesSkipped}회 - 이유:`);
        const sorted = Object.entries(ev.skipReasons)
          .sort((a, b) => b[1] - a[1]);
        for (const [reason, count] of sorted) {
          lines.push(`    ${reason}: ${count}회`);
        }
      }
    }

    // 가장 많이 패스한 이벤트
    const mostSkipped = events
      .filter(e => e.timesSkipped > 0)
      .sort((a, b) => b.timesSkipped - a.timesSkipped)
      .slice(0, 5);

    if (mostSkipped.length > 0) {
      lines.push('');
      lines.push('【 가장 많이 패스한 이벤트 TOP 5 】');
      for (const ev of mostSkipped) {
        const rate = ((ev.timesSkipped / ev.occurrences) * 100).toFixed(0);
        lines.push(`  ${ev.eventName}: ${ev.timesSkipped}회 패스 (${rate}%)`);
        const topReason = Object.entries(ev.skipReasons)
          .sort((a, b) => b[1] - a[1])[0];
        if (topReason) {
          lines.push(`    주요 이유: ${topReason[0]} (${topReason[1]}회)`);
        }
      }
    }

    return lines.join('\n');
  }

  /** AI 전략 리포트 생성 */
  generateAIStrategyReport(): string {
    const lines: string[] = [];
    const as = this.stats.aiStrategyStats;

    lines.push('');
    lines.push('╔══════════════════════════════════════════════════════════════════════════╗');
    lines.push('║                           AI 전략 통계                                    ║');
    lines.push('╚══════════════════════════════════════════════════════════════════════════╝');
    lines.push('');

    // 전략별 요약
    if (Object.keys(as.strategyUsage).length > 0) {
      lines.push('【 전략별 성과 】');
      lines.push('┌──────────────────┬─────────┬────────┬──────────┬───────────────────────┐');
      lines.push('│ 전략             │ 사용    │ 승률   │ 평균턴   │ 평균 피해량           │');
      lines.push('├──────────────────┼─────────┼────────┼──────────┼───────────────────────┤');

      const sortedStrategies = Object.entries(as.strategyUsage)
        .sort((a, b) => b[1] - a[1]);

      for (const [strategy, usage] of sortedStrategies) {
        const name = strategy.padEnd(16);
        const usageStr = String(usage).padStart(7);
        const winRate = ((as.strategyWinRate[strategy] || 0) * 100).toFixed(1) + '%';
        const avgTurns = (as.strategyAvgTurns[strategy] || 0).toFixed(1);
        const avgDamage = (as.strategyAvgDamage[strategy] || 0).toFixed(0);
        lines.push(`│ ${name} │${usageStr} │ ${winRate.padStart(5)} │ ${avgTurns.padStart(8)} │ ${avgDamage.padStart(21)} │`);
      }
      lines.push('└──────────────────┴─────────┴────────┴──────────┴───────────────────────┘');
    }

    // HP 비율별 전략 선택
    if (Object.keys(as.strategyByHpRatio).length > 0) {
      lines.push('');
      lines.push('【 HP 상태별 전략 선택 분포 】');

      for (const [hpBracket, strategies] of Object.entries(as.strategyByHpRatio)) {
        const bracketLabel = hpBracket === 'low' ? '위험 (0-30%)' :
                            hpBracket === 'medium' ? '주의 (30-60%)' : '안전 (60%+)';
        lines.push(`  [${bracketLabel}]`);

        const total = Object.values(strategies).reduce((a, b) => a + b, 0);
        const sorted = Object.entries(strategies).sort((a, b) => b[1] - a[1]);

        for (const [strategy, count] of sorted) {
          const percent = ((count / total) * 100).toFixed(1);
          const bar = '█'.repeat(Math.floor((count / total) * 20));
          lines.push(`    ${strategy.padEnd(12)}: ${bar} ${percent}%`);
        }
      }
    }

    // 카드 선택 이유
    if (Object.keys(as.cardSelectionReasons).length > 0) {
      lines.push('');
      lines.push('【 카드 선택 이유 TOP 10 】');

      const sortedReasons = Object.entries(as.cardSelectionReasons)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const maxCount = sortedReasons[0]?.[1] || 1;
      for (const [reason, count] of sortedReasons) {
        const barLen = Math.floor((count / maxCount) * 25);
        const bar = '█'.repeat(barLen);
        lines.push(`  ${reason.substring(0, 25).padEnd(25)}: ${String(count).padStart(5)} ${bar}`);
      }
    }

    // 시너지 발동
    if (Object.keys(as.synergyTriggers).length > 0) {
      lines.push('');
      lines.push('【 시너지 발동 통계 】');

      const sorted = Object.entries(as.synergyTriggers)
        .sort((a, b) => b[1] - a[1]);

      for (const [synergy, count] of sorted) {
        lines.push(`  ${synergy}: ${count}회`);
      }
    }

    // 콤보 타입
    if (Object.keys(as.comboTypeUsage).length > 0) {
      lines.push('');
      lines.push('【 콤보 타입별 발동 】');

      const sorted = Object.entries(as.comboTypeUsage)
        .sort((a, b) => b[1] - a[1]);

      for (const [comboType, count] of sorted) {
        lines.push(`  ${comboType}: ${count}회`);
      }
    }

    return lines.join('\n');
  }

  /** 전체 리포트 생성 */
  generateFullReport(): string {
    const parts: string[] = [];
    parts.push(this.generateRunReport());
    parts.push(this.generateCardReport());
    parts.push(this.generateMonsterReport());
    parts.push(this.generateUpgradeReport());
    parts.push(this.generateGrowthReport());
    parts.push(this.generateShopReport());
    parts.push(this.generateShopServiceReport());
    parts.push(this.generateDungeonReport());
    parts.push(this.generateEventReport());
    parts.push(this.generateItemReport());
    parts.push(this.generateEventChoiceReport());
    parts.push(this.generateAIStrategyReport());
    return parts.join('\n');
  }

  /** JSON 형식 내보내기 */
  exportToJson(): string {
    const exportData = {
      startTime: this.stats.startTime.toISOString(),
      endTime: this.stats.endTime.toISOString(),
      runStats: this.stats.runStats,
      cardStats: Object.fromEntries(this.stats.cardStats),
      monsterStats: Object.fromEntries(this.stats.monsterStats),
      eventStats: Object.fromEntries(this.stats.eventStats),
      upgradeStats: this.stats.upgradeStats,
      growthStats: this.stats.growthStats,
      shopStats: this.stats.shopStats,
      shopServiceStats: this.stats.shopServiceStats,
      dungeonStats: this.stats.dungeonStats,
      itemUsageStats: this.stats.itemUsageStats,
      eventChoiceStats: Object.fromEntries(this.stats.eventChoiceStats),
      aiStrategyStats: this.stats.aiStrategyStats,
      battleRecords: this.stats.battleRecords,
    };
    return JSON.stringify(exportData, null, 2);
  }
}

// ==================== 헬퍼 함수 ====================

/** 간편한 통계 수집 및 리포트 생성 */
export function createStatsCollector(
  cardLibrary?: Record<string, { name: string; type: string; special?: string[] }>
): StatsCollector {
  return new StatsCollector(cardLibrary);
}

/** 통계에서 리포터 생성 */
export function createReporter(stats: DetailedStats): StatsReporter {
  return new StatsReporter(stats);
}
