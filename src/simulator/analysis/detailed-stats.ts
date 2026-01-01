/**
 * @file detailed-stats.ts
 * @description 상세 통계 수집 및 리포트 시스템
 *
 * ## 수집하는 통계
 * - 카드별: 사용 횟수, 피해량, 방어량, 특수효과 발동, 승률 기여도
 * - 몬스터별: 전투 횟수, 승률, 평균 턴, 받은/준 피해
 * - 이벤트별: 발생 횟수, 성공률, 보상
 * - 런 전체: 진행도, 자원 획득, 덱 변화
 */

import type { BattleResult, BattleEvent } from '../core/game-types';

// ==================== 타입 정의 ====================

/** 카드 효과 상세 통계 */
export interface CardEffectStats {
  cardId: string;
  cardName: string;
  cardType: string;
  /** 총 사용 횟수 */
  totalUses: number;
  /** 승리한 전투에서 사용 횟수 */
  usesInWins: number;
  /** 패배한 전투에서 사용 횟수 */
  usesInLosses: number;
  /** 총 피해량 */
  totalDamage: number;
  /** 평균 피해량 */
  avgDamage: number;
  /** 총 방어량 */
  totalBlock: number;
  /** 평균 방어량 */
  avgBlock: number;
  /** 특수효과 발동 횟수 */
  specialTriggers: Record<string, number>;
  /** 교차 발동 횟수 */
  crossTriggers: number;
  /** 승률 기여도 (사용 시 승률) */
  winContribution: number;
}

/** 몬스터 전투 통계 */
export interface MonsterBattleStats {
  monsterId: string;
  monsterName: string;
  tier: number;
  isBoss: boolean;
  /** 전투 횟수 */
  battles: number;
  /** 승리 횟수 */
  wins: number;
  /** 패배 횟수 */
  losses: number;
  /** 승률 */
  winRate: number;
  /** 평균 전투 턴 */
  avgTurns: number;
  /** 플레이어가 받은 총 피해 */
  totalDamageTaken: number;
  /** 플레이어가 준 총 피해 */
  totalDamageDealt: number;
  /** 평균 받은 피해 */
  avgDamageTaken: number;
  /** 평균 준 피해 */
  avgDamageDealt: number;
  /** 승리 시 남은 HP 평균 */
  avgHpRemainingOnWin: number;
  /** 주로 사용된 카드 TOP 5 */
  topCardsUsed: { cardId: string; count: number }[];
}

/** 이벤트 통계 */
export interface EventStats {
  eventId: string;
  eventName: string;
  /** 발생 횟수 */
  occurrences: number;
  /** 성공 횟수 */
  successes: number;
  /** 성공률 */
  successRate: number;
  /** HP 변화 총합 */
  totalHpChange: number;
  /** 골드 변화 총합 */
  totalGoldChange: number;
  /** 획득한 카드 */
  cardsGained: string[];
  /** 획득한 상징 */
  relicsGained: string[];
}

/** 런 전체 통계 */
export interface RunStats {
  /** 총 런 횟수 */
  totalRuns: number;
  /** 성공 횟수 */
  successfulRuns: number;
  /** 성공률 */
  successRate: number;
  /** 평균 도달 층 */
  avgLayerReached: number;
  /** 평균 전투 승리 수 */
  avgBattlesWon: number;
  /** 평균 골드 획득 */
  avgGoldEarned: number;
  /** 평균 최종 덱 크기 */
  avgFinalDeckSize: number;
  /** 사망 원인 분포 */
  deathCauses: Record<string, number>;
  /** 층별 사망 분포 */
  deathByLayer: Record<number, number>;
  /** 전략별 승률 */
  strategyWinRates: Record<string, number>;
}

/** 카드 승급 통계 */
export interface CardUpgradeStats {
  /** 카드별 승급 횟수 */
  upgradesByCard: Record<string, number>;
  /** 총 승급 횟수 */
  totalUpgrades: number;
  /** 런당 평균 승급 */
  avgUpgradesPerRun: number;
  /** 승급된 카드가 승률에 미치는 영향 */
  upgradeWinCorrelation: number;
}

/** 성장 시스템 통계 */
export interface GrowthStats {
  /** 스탯별 투자 횟수 */
  statInvestments: Record<string, number>;
  /** 총 투자 횟수 */
  totalInvestments: number;
  /** 런당 평균 투자 */
  avgInvestmentsPerRun: number;
  /** 로고스 효과 활성화 횟수 */
  logosActivations: Record<string, number>;
  /** 성장 레벨 분포 */
  levelDistribution: Record<number, number>;
}

/** 상점 이용 통계 */
export interface ShopStats {
  /** 총 방문 횟수 */
  totalVisits: number;
  /** 총 지출 골드 */
  totalSpent: number;
  /** 평균 지출 */
  avgSpentPerVisit: number;
  /** 구매한 카드 */
  cardsPurchased: Record<string, number>;
  /** 구매한 상징 */
  relicsPurchased: Record<string, number>;
  /** 구매한 아이템 */
  itemsPurchased: Record<string, number>;
  /** 카드 제거 횟수 */
  cardsRemoved: number;
  /** 카드 승급 횟수 */
  cardsUpgraded: number;
}

/** 던전 통계 */
export interface DungeonStats {
  /** 총 진입 횟수 */
  totalAttempts: number;
  /** 클리어 횟수 */
  clears: number;
  /** 클리어율 */
  clearRate: number;
  /** 던전별 클리어 횟수 */
  clearsByDungeon: Record<string, number>;
  /** 획득한 보상 */
  rewards: {
    gold: number;
    cards: string[];
    relics: string[];
  };
  /** 평균 소요 턴 */
  avgTurns: number;
  /** 평균 받은 피해 */
  avgDamageTaken: number;
}

/** 전투 상세 기록 */
export interface BattleRecord {
  battleId: string;
  monsterId: string;
  monsterName: string;
  isBoss: boolean;
  isElite: boolean;
  winner: 'player' | 'enemy' | 'draw';
  turns: number;
  playerDamageDealt: number;
  enemyDamageDealt: number;
  playerFinalHp: number;
  enemyFinalHp: number;
  cardsUsed: Record<string, number>;
  specialEffects: Record<string, number>;
  crossTriggers: number;
  combosTriggered: Record<string, number>;
}

/** 전체 상세 통계 */
export interface DetailedStats {
  /** 수집 시작 시간 */
  startTime: Date;
  /** 수집 종료 시간 */
  endTime: Date;
  /** 카드별 통계 */
  cardStats: Map<string, CardEffectStats>;
  /** 몬스터별 통계 */
  monsterStats: Map<string, MonsterBattleStats>;
  /** 이벤트별 통계 */
  eventStats: Map<string, EventStats>;
  /** 런 전체 통계 */
  runStats: RunStats;
  /** 전투 기록 목록 */
  battleRecords: BattleRecord[];
  /** 카드 승급 통계 */
  upgradeStats: CardUpgradeStats;
  /** 성장 시스템 통계 */
  growthStats: GrowthStats;
  /** 상점 통계 */
  shopStats: ShopStats;
  /** 던전 통계 */
  dungeonStats: DungeonStats;
}

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
  private shopCardsRemoved = 0;
  private shopCardsUpgraded = 0;

  // 던전 통계
  private dungeonAttempts = 0;
  private dungeonClears = 0;
  private dungeonClearsByType: Record<string, number> = {};
  private dungeonRewards = { gold: 0, cards: [] as string[], relics: [] as string[] };
  private dungeonTotalTurns = 0;
  private dungeonTotalDamage = 0;

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

    // 이벤트에서 피해량/방어량 추출
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
    relicsGained: string[] = []
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

  /** 통계 수집 완료 및 결과 반환 */
  finalize(): DetailedStats {
    const runStats = this.calculateRunStats();
    const upgradeStats = this.calculateUpgradeStats();
    const growthStats = this.calculateGrowthStats();
    const shopStats = this.calculateShopStats();
    const dungeonStats = this.calculateDungeonStats();

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
    lines.push('┌────────────────────────┬───────┬────────┬─────────┬─────────┐');
    lines.push('│ 이벤트                 │ 횟수  │ 성공률 │ HP변화  │ 골드    │');
    lines.push('├────────────────────────┼───────┼────────┼─────────┼─────────┤');

    for (const ev of events.slice(0, 15)) {
      const name = ev.eventName.substring(0, 22).padEnd(22);
      const count = String(ev.occurrences).padStart(5);
      const rate = (ev.successRate * 100).toFixed(0) + '%';
      const hp = (ev.totalHpChange >= 0 ? '+' : '') + ev.totalHpChange;
      const gold = (ev.totalGoldChange >= 0 ? '+' : '') + ev.totalGoldChange;
      lines.push(`│ ${name} │${count} │ ${rate.padStart(5)} │ ${hp.padStart(7)} │ ${gold.padStart(7)} │`);
    }
    lines.push('└────────────────────────┴───────┴────────┴─────────┴─────────┘');

    // 이벤트에서 획득한 보상
    const allCards = events.flatMap(e => e.cardsGained);
    const allRelics = events.flatMap(e => e.relicsGained);

    if (allCards.length > 0 || allRelics.length > 0) {
      lines.push('');
      lines.push('【 이벤트 보상 총계 】');
      if (allCards.length > 0) {
        lines.push(`  획득 카드: ${allCards.length}장`);
      }
      if (allRelics.length > 0) {
        lines.push(`  획득 상징: ${allRelics.length}개`);
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
    parts.push(this.generateDungeonReport());
    parts.push(this.generateEventReport());
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
      dungeonStats: this.stats.dungeonStats,
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
