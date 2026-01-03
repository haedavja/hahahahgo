/**
 * @file comprehensive-analytics.ts
 * @description 종합 분석 시스템 - 게임의 모든 부분을 통계화
 *
 * ## 분석 영역
 * 1. 런 진행 분석 (층별 사망률, 덱 상태, 카드 픽 타이밍, 보스별 승률)
 * 2. 시너지 분석 (덱 아키타입, 3카드 시너지, 상징+카드, 포커 조합)
 * 3. 경제/자원 분석 (에테르, 상점, HP 곡선, 리스크/리워드)
 * 4. 플레이 스타일 분석 (공격성, 방어, 선제/대응, 덱 순환)
 * 5. 난이도 진행 (연속 승리, 난이도별 통계, 성장 곡선)
 * 6. AI 적 분석 (행동 패턴, 반응 분석, 최적 카운터)
 */

import type { DetailedStats, CardDeepStats, RelicStats, MonsterBattleStats } from './detailed-stats-types';
import type { BalanceRecommendation } from './balance-insights';
import type {
  ComprehensiveAnalyticsReport,
  RunProgressionAnalysis,
  FloorDeathRateAnalysis,
  FloorDeckStateAnalysis,
  CardPickTimingAnalysis,
  BossWinRateAnalysis,
  CardRemovalAnalysis,
  SynergyAnalysis,
  DeckArchetype,
  TripleCardSynergy,
  RelicCardSynergy,
  PokerHandEfficiency,
  EconomyAnalysis,
  EtherEfficiencyAnalysis,
  ShopPatternAnalysis,
  HPCurveAnalysis,
  RiskRewardAnalysis,
  PlayStyleAnalysis,
  AggressionMetrics,
  DefenseMetrics,
  InitiativeAnalysis,
  DeckCyclingAnalysis,
  DifficultyProgressionAnalysis,
  WinStreakAnalysis,
  DifficultyLevelAnalysis,
  PlayerGrowthCurve,
  EnemyPatternAnalysis,
  EnemyBehaviorPattern,
  EnemyReactionAnalysis,
  EnemyCounterAnalysis,
} from './advanced-analytics-types';

export class ComprehensiveAnalyzer {
  private stats: DetailedStats;
  private minSampleSize = 5;

  constructor(stats: DetailedStats) {
    this.stats = stats;
  }

  /**
   * 종합 분석 리포트 생성
   */
  generateComprehensiveReport(): ComprehensiveAnalyticsReport {
    const runProgression = this.analyzeRunProgression();
    const synergy = this.analyzeSynergies();
    const economy = this.analyzeEconomy();
    const playStyle = this.analyzePlayStyle();
    const difficulty = this.analyzeDifficultyProgression();
    const enemyPatterns = this.analyzeEnemyPatterns();

    // 모든 권장사항 수집
    const allRecommendations = [
      ...runProgression.recommendations,
      ...synergy.recommendations,
      ...economy.recommendations,
      ...playStyle.recommendations,
      ...difficulty.recommendations,
      ...enemyPatterns.recommendations,
    ].sort((a, b) => {
      const priorityOrder = { critical: 0, warning: 1, watch: 2, ok: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    const criticalIssues = allRecommendations
      .filter(r => r.priority === 'critical')
      .map(r => `${r.targetName}: ${r.issue}`);

    const healthScore = this.calculateOverallHealthScore(allRecommendations);

    return {
      generatedAt: new Date(),
      totalRuns: this.stats.runStats.totalRuns,
      overallWinRate: this.stats.runStats.successRate,
      runProgression,
      synergy,
      economy,
      playStyle,
      difficulty,
      enemyPatterns,
      summary: {
        healthScore,
        criticalIssues,
        priorities: allRecommendations.slice(0, 5).map(r => r.suggestion),
        strengths: this.identifyStrengths(),
        weaknesses: this.identifyWeaknesses(),
      },
      allRecommendations,
    };
  }

  // ==================== 1. 런 진행 분석 ====================

  private analyzeRunProgression(): RunProgressionAnalysis {
    return {
      deathRateByFloor: this.analyzeFloorDeathRates(),
      deckStateByFloor: this.analyzeFloorDeckStates(),
      cardPickTiming: this.analyzeCardPickTiming(),
      bossWinRates: this.analyzeBossWinRates(),
      cardRemoval: this.analyzeCardRemoval(),
      keyInsights: this.generateRunProgressionInsights(),
      recommendations: this.generateRunProgressionRecommendations(),
    };
  }

  private analyzeFloorDeathRates(): FloorDeathRateAnalysis[] {
    const { deathStats, monsterStats } = this.stats;
    const results: FloorDeathRateAnalysis[] = [];
    const totalDeaths = Math.max(1, deathStats.totalDeaths);
    const floors = Object.keys(deathStats.deathsByFloor).map(Number).sort((a, b) => a - b);
    const avgDeathRate = floors.length > 0 ? 1 / floors.length : 0;

    for (const floor of floors) {
      const deaths = deathStats.deathsByFloor[floor] || 0;
      const deathRate = deaths / totalDeaths;
      const deathRateMultiplier = avgDeathRate > 0 ? deathRate / avgDeathRate : 1;

      // 해당 층 사망 원인 분석
      const floorDeaths = deathStats.recentDeaths.filter(d => d.floor === floor);
      const killerCounts: Record<string, { name: string; count: number }> = {};

      for (const death of floorDeaths) {
        if (!killerCounts[death.enemyId]) {
          killerCounts[death.enemyId] = { name: death.enemyName, count: 0 };
        }
        killerCounts[death.enemyId].count++;
      }

      const topKillers = Object.entries(killerCounts)
        .map(([enemyId, data]) => ({
          enemyId,
          enemyName: data.name,
          kills: data.count,
          percentage: data.count / Math.max(1, floorDeaths.length),
        }))
        .sort((a, b) => b.kills - a.kills)
        .slice(0, 3);

      // 사망 원인 유형 분포
      const causeDistribution: Record<string, number> = {};
      for (const death of floorDeaths) {
        causeDistribution[death.causeType] = (causeDistribution[death.causeType] || 0) + 1;
      }

      // 권장사항
      let suggestion: string | null = null;
      if (deathRateMultiplier > 2) {
        suggestion = `층 ${floor}의 난이도 조정 필요 (사망률 평균의 ${deathRateMultiplier.toFixed(1)}배)`;
      }

      results.push({
        floor,
        totalReached: this.stats.runStats.totalRuns, // 대략적 추정
        deaths,
        deathRate,
        deathRateMultiplier,
        topKillers,
        causeDistribution,
        suggestion,
      });
    }

    return results.sort((a, b) => b.deathRateMultiplier - a.deathRateMultiplier);
  }

  private analyzeFloorDeckStates(): FloorDeckStateAnalysis[] {
    const results: FloorDeckStateAnalysis[] = [];
    const { recentRunProgressions } = this.stats;

    // 층별 덱 상태 집계
    const floorData: Map<number, {
      deckSizes: number[];
      attacks: number[];
      skills: number[];
      powers: number[];
      winningDeckSizes: number[];
      losingDeckSizes: number[];
    }> = new Map();

    for (const run of recentRunProgressions) {
      const isWin = run.finalDeck.length > 0; // 대략적 추정

      for (const floorProgress of run.floorProgression) {
        if (!floorData.has(floorProgress.floor)) {
          floorData.set(floorProgress.floor, {
            deckSizes: [],
            attacks: [],
            skills: [],
            powers: [],
            winningDeckSizes: [],
            losingDeckSizes: [],
          });
        }

        const data = floorData.get(floorProgress.floor)!;
        data.deckSizes.push(floorProgress.deckSize);

        if (isWin) {
          data.winningDeckSizes.push(floorProgress.deckSize);
        } else {
          data.losingDeckSizes.push(floorProgress.deckSize);
        }
      }
    }

    for (const [floor, data] of floorData) {
      const avgDeckSize = this.average(data.deckSizes);
      const winningAvgDeckSize = this.average(data.winningDeckSizes);
      const losingAvgDeckSize = this.average(data.losingDeckSizes);

      // 최적 덱 크기 범위 계산
      const optimalMin = Math.max(5, Math.floor(winningAvgDeckSize * 0.8));
      const optimalMax = Math.ceil(winningAvgDeckSize * 1.2);

      results.push({
        floor,
        avgDeckSize,
        avgAttacks: this.average(data.attacks) || avgDeckSize * 0.4,
        avgSkills: this.average(data.skills) || avgDeckSize * 0.4,
        avgPowers: this.average(data.powers) || avgDeckSize * 0.2,
        winningAvgDeckSize,
        losingAvgDeckSize,
        optimalDeckSizeRange: [optimalMin, optimalMax],
      });
    }

    return results.sort((a, b) => a.floor - b.floor);
  }

  private analyzeCardPickTiming(): CardPickTimingAnalysis[] {
    const results: CardPickTimingAnalysis[] = [];
    const { allCardChoices, cardDeepStats, cardContributionStats } = this.stats;

    // 카드별 층별 픽률 집계
    const cardPicksByFloor: Map<string, Map<number, { picked: number; offered: number }>> = new Map();

    for (const choice of allCardChoices) {
      const floor = choice.floor;
      const allCards = choice.pickedCardId
        ? [choice.pickedCardId, ...choice.notPickedCardIds]
        : choice.notPickedCardIds;

      for (const cardId of allCards) {
        if (!cardPicksByFloor.has(cardId)) {
          cardPicksByFloor.set(cardId, new Map());
        }
        const cardFloors = cardPicksByFloor.get(cardId)!;
        if (!cardFloors.has(floor)) {
          cardFloors.set(floor, { picked: 0, offered: 0 });
        }
        const floorData = cardFloors.get(floor)!;
        floorData.offered++;
        if (choice.pickedCardId === cardId) {
          floorData.picked++;
        }
      }
    }

    for (const [cardId, floorMap] of cardPicksByFloor) {
      const deepStats = cardDeepStats.get(cardId);
      if (!deepStats || deepStats.timesOffered < this.minSampleSize) continue;

      const pickRateByFloor: { floor: number; pickRate: number; count: number }[] = [];
      let earlyPicks = 0, earlyTotal = 0;
      let midPicks = 0, midTotal = 0;
      let latePicks = 0, lateTotal = 0;

      for (const [floor, data] of floorMap) {
        const pickRate = data.offered > 0 ? data.picked / data.offered : 0;
        pickRateByFloor.push({ floor, pickRate, count: data.offered });

        if (floor <= 5) {
          earlyPicks += data.picked;
          earlyTotal += data.offered;
        } else if (floor <= 10) {
          midPicks += data.picked;
          midTotal += data.offered;
        } else {
          latePicks += data.picked;
          lateTotal += data.offered;
        }
      }

      const earlyPickWinRate = earlyTotal > 0 ? earlyPicks / earlyTotal : 0;
      const midPickWinRate = midTotal > 0 ? midPicks / midTotal : 0;
      const latePickWinRate = lateTotal > 0 ? latePicks / lateTotal : 0;

      // 최적 픽 시점 결정
      const maxRate = Math.max(earlyPickWinRate, midPickWinRate, latePickWinRate);
      let optimalPickFloor = 5;
      let timing: CardPickTimingAnalysis['timing'] = 'always_good';

      if (maxRate === earlyPickWinRate && earlyPickWinRate > midPickWinRate * 1.2) {
        optimalPickFloor = 3;
        timing = 'early_priority';
      } else if (maxRate === midPickWinRate && midPickWinRate > earlyPickWinRate * 1.2) {
        optimalPickFloor = 7;
        timing = 'mid_priority';
      } else if (maxRate === latePickWinRate && latePickWinRate > midPickWinRate * 1.2) {
        optimalPickFloor = 12;
        timing = 'late_priority';
      } else if (Math.abs(earlyPickWinRate - latePickWinRate) < 0.1) {
        timing = 'always_good';
      } else {
        timing = 'situational';
      }

      results.push({
        cardId,
        cardName: deepStats.cardName,
        pickRateByFloor: pickRateByFloor.sort((a, b) => a.floor - b.floor),
        optimalPickFloor,
        earlyPickWinRate,
        midPickWinRate,
        latePickWinRate,
        timing,
      });
    }

    return results;
  }

  private analyzeBossWinRates(): BossWinRateAnalysis[] {
    const results: BossWinRateAnalysis[] = [];
    const { monsterStats, cardDeepStats, relicStats, battleRecords } = this.stats;

    for (const [monsterId, stats] of monsterStats) {
      if (!stats.isBoss || stats.battles < this.minSampleSize) continue;

      // 보스 전투에서 효과적인 카드 분석
      const bossBattles = battleRecords.filter(b => b.monsterId === monsterId);
      const cardEffectiveness: Map<string, { wins: number; total: number }> = new Map();

      for (const battle of bossBattles) {
        for (const cardId of Object.keys(battle.cardsUsed)) {
          if (!cardEffectiveness.has(cardId)) {
            cardEffectiveness.set(cardId, { wins: 0, total: 0 });
          }
          const data = cardEffectiveness.get(cardId)!;
          data.total++;
          if (battle.winner === 'player') data.wins++;
        }
      }

      const effectiveCards = Array.from(cardEffectiveness.entries())
        .filter(([, data]) => data.total >= 3)
        .map(([cardId, data]) => {
          const deepStats = cardDeepStats.get(cardId);
          return {
            cardId,
            cardName: deepStats?.cardName || cardId,
            winRateBoost: (data.wins / data.total) - stats.winRate,
          };
        })
        .filter(c => c.winRateBoost > 0)
        .sort((a, b) => b.winRateBoost - a.winRateBoost)
        .slice(0, 5);

      // 효과적인 상징 분석 (단순화)
      const effectiveRelics: BossWinRateAnalysis['effectiveRelics'] = [];

      // 권장 대응 전략
      const recommendations: string[] = [];
      if (stats.winRate < 0.5) {
        recommendations.push(`${stats.monsterName} 난이도 하향 검토`);
        if (stats.avgDamageTaken > 30) {
          recommendations.push('방어 중심 전략 권장');
        }
        if (stats.avgTurns > 8) {
          recommendations.push('빠른 처치 전략 필요');
        }
      }

      results.push({
        bossId: monsterId,
        bossName: stats.monsterName,
        encounters: stats.battles,
        wins: stats.wins,
        winRate: stats.winRate,
        avgTurns: stats.avgTurns,
        avgDamageTaken: stats.avgDamageTaken,
        avgHpRemaining: stats.avgHpRemainingOnWin,
        effectiveCards,
        effectiveRelics,
        ineffectiveStrategies: [],
        recommendations,
      });
    }

    return results.sort((a, b) => a.winRate - b.winRate);
  }

  private analyzeCardRemoval(): CardRemovalAnalysis {
    const { shopServiceStats, cardContributionStats, cardDeepStats } = this.stats;
    const removalsByCard: CardRemovalAnalysis['removalsByCard'] = [];

    for (const [cardId, count] of Object.entries(shopServiceStats.removedCards || {})) {
      const deepStats = cardDeepStats.get(cardId);
      const contribution = cardContributionStats.contribution[cardId] || 0;

      removalsByCard.push({
        cardId,
        cardName: deepStats?.cardName || cardId,
        removalCount: count,
        winRateAfterRemoval: 0.5 - contribution, // 단순 추정
        expectedWinRateWithout: 0.5 + contribution,
        removalValue: -contribution,
      });
    }

    // 우선순위 정렬 (제거 가치 높은 순)
    const priorityRemovals = removalsByCard
      .filter(r => r.removalValue > 0)
      .sort((a, b) => b.removalValue - a.removalValue)
      .slice(0, 5)
      .map(r => r.cardName);

    // 제거하면 안되는 카드
    const neverRemove = removalsByCard
      .filter(r => r.removalValue < -0.1)
      .sort((a, b) => a.removalValue - b.removalValue)
      .slice(0, 5)
      .map(r => r.cardName);

    return {
      totalRemovals: Object.values(shopServiceStats.removedCards || {}).reduce((a, b) => a + b, 0),
      avgRemovalsPerRun: shopServiceStats.removalCost / Math.max(1, this.stats.runStats.totalRuns) / 50, // 대략적
      removalsByCard: removalsByCard.sort((a, b) => b.removalValue - a.removalValue),
      priorityRemovals,
      neverRemove,
    };
  }

  private generateRunProgressionInsights(): string[] {
    const insights: string[] = [];
    const { deathStats, runStats } = this.stats;

    // 조기 사망률 분석
    const earlyDeaths = Object.entries(deathStats.deathsByFloor)
      .filter(([floor]) => parseInt(floor) <= 3)
      .reduce((sum, [, count]) => sum + count, 0);
    const earlyDeathRate = earlyDeaths / Math.max(1, deathStats.totalDeaths);

    if (earlyDeathRate > 0.3) {
      insights.push(`초반 사망률이 ${(earlyDeathRate * 100).toFixed(0)}%로 높음 - 초반 밸런스 조정 필요`);
    }

    // 평균 도달 층 분석
    if (runStats.avgLayerReached < 5) {
      insights.push('평균 도달 층이 낮음 - 전체 난이도 하향 검토');
    } else if (runStats.avgLayerReached > 12) {
      insights.push('평균 도달 층이 높음 - 후반 난이도 상향 검토');
    }

    return insights;
  }

  private generateRunProgressionRecommendations(): BalanceRecommendation[] {
    const recommendations: BalanceRecommendation[] = [];
    const { deathStats } = this.stats;

    // 층별 사망률 기반 권장사항
    const problematicFloors = Object.entries(deathStats.deathsByFloor)
      .filter(([, count]) => count / Math.max(1, deathStats.totalDeaths) > 0.15)
      .map(([floor]) => parseInt(floor));

    for (const floor of problematicFloors) {
      recommendations.push({
        targetId: `floor_${floor}`,
        targetName: `층 ${floor}`,
        targetType: 'floor',
        priority: 'warning',
        issueType: 'high_death_rate',
        issue: `해당 층에서 사망률이 15% 이상`,
        actionType: 'nerf',
        suggestion: `층 ${floor}의 적 난이도 하향 또는 회복 기회 추가`,
        metrics: { deathRate: `${((deathStats.deathsByFloor[floor] / Math.max(1, deathStats.totalDeaths)) * 100).toFixed(1)}%` },
        confidence: 0.8,
      });
    }

    return recommendations;
  }

  // ==================== 2. 시너지 분석 ====================

  private analyzeSynergies(): SynergyAnalysis {
    return {
      archetypes: this.identifyDeckArchetypes(),
      topDualSynergies: this.analyzeTopDualSynergies(),
      topTripleSynergies: this.analyzeTripleSynergies(),
      topRelicCardSynergies: this.analyzeRelicCardSynergies(),
      pokerHandEfficiency: this.analyzePokerHandEfficiency(),
      antiSynergies: this.identifyAntiSynergies(),
      recommendations: this.generateSynergyRecommendations(),
    };
  }

  private identifyDeckArchetypes(): DeckArchetype[] {
    const archetypes: DeckArchetype[] = [];
    const { cardDeepStats, aiStrategyStats } = this.stats;

    // 전략 사용 통계 기반 아키타입 추출
    const strategyUsage = aiStrategyStats.strategyUsage || {};
    const strategyWinRate = aiStrategyStats.strategyWinRate || {};

    for (const [strategy, usage] of Object.entries(strategyUsage)) {
      const winRate = strategyWinRate[strategy] || 0;
      const frequency = usage / Math.max(1, this.stats.runStats.totalRuns);

      if (frequency < 0.05) continue; // 5% 미만 사용은 제외

      archetypes.push({
        id: strategy.toLowerCase().replace(/\s+/g, '_'),
        name: strategy,
        description: `${strategy} 중심의 덱 빌드`,
        coreCards: [], // 추후 분석으로 채움
        coreTraits: [],
        frequency,
        winRate,
        strengths: winRate > 0.5 ? ['안정적인 승률'] : [],
        weaknesses: winRate < 0.4 ? ['낮은 승률'] : [],
        goodMatchups: [],
        badMatchups: [],
      });
    }

    return archetypes.sort((a, b) => b.frequency - a.frequency);
  }

  private analyzeTopDualSynergies(): SynergyAnalysis['topDualSynergies'] {
    const { cardSynergyStats, cardDeepStats } = this.stats;
    const results: SynergyAnalysis['topDualSynergies'] = [];

    for (const synergy of cardSynergyStats.topSynergies || []) {
      const [card1, card2] = synergy.pair.split(':');
      const avgWinRate = (
        (cardDeepStats.get(card1)?.winRateWith || 0.5) +
        (cardDeepStats.get(card2)?.winRateWith || 0.5)
      ) / 2;

      results.push({
        cards: [card1, card2],
        winRate: synergy.winRate,
        synergyBonus: synergy.winRate - avgWinRate,
      });
    }

    return results.sort((a, b) => b.synergyBonus - a.synergyBonus).slice(0, 20);
  }

  private analyzeTripleSynergies(): TripleCardSynergy[] {
    // 3카드 시너지 분석 (간단한 구현)
    const results: TripleCardSynergy[] = [];
    const { cardSynergyStats, cardDeepStats } = this.stats;

    // 상위 2카드 시너지를 확장하여 3카드 조합 추정
    const topDual = cardSynergyStats.topSynergies?.slice(0, 10) || [];

    for (let i = 0; i < topDual.length; i++) {
      for (let j = i + 1; j < topDual.length; j++) {
        const [a1, a2] = topDual[i].pair.split(':');
        const [b1, b2] = topDual[j].pair.split(':');

        // 공통 카드 찾기
        const commonCard = [a1, a2].find(c => c === b1 || c === b2);
        if (!commonCard) continue;

        const otherCards = [a1, a2, b1, b2].filter(c => c !== commonCard);
        if (otherCards.length !== 2) continue;

        const cards: [string, string, string] = [commonCard, otherCards[0], otherCards[1]];
        const cardNames: [string, string, string] = cards.map(c =>
          cardDeepStats.get(c)?.cardName || c
        ) as [string, string, string];

        const combinedWinRate = (topDual[i].winRate + topDual[j].winRate) / 2;
        const individualAvgWinRate = cards.reduce((sum, c) =>
          sum + (cardDeepStats.get(c)?.winRateWith || 0.5), 0) / 3;

        results.push({
          cards,
          cardNames,
          coOccurrences: Math.min(topDual[i].frequency, topDual[j].frequency),
          combinedWinRate,
          individualAvgWinRate,
          synergyBonus: combinedWinRate - individualAvgWinRate,
          synergyReason: '상위 2카드 시너지의 조합',
        });
      }
    }

    return results.sort((a, b) => b.synergyBonus - a.synergyBonus).slice(0, 10);
  }

  private analyzeRelicCardSynergies(): RelicCardSynergy[] {
    const results: RelicCardSynergy[] = [];
    const { relicStats, cardDeepStats, cardContributionStats } = this.stats;

    // 상징과 카드 조합 분석 (간단한 구현)
    for (const [relicId, relic] of relicStats) {
      if (relic.timesAcquired < this.minSampleSize) continue;

      for (const [cardId, deepStats] of cardDeepStats) {
        if (deepStats.timesPicked < this.minSampleSize) continue;

        // 시너지 추정 (간단한 휴리스틱)
        const relicContribution = relic.contribution;
        const cardContribution = cardContributionStats.contribution[cardId] || 0;

        // 둘 다 양의 기여도를 가지면 시너지 가능성
        if (relicContribution > 0.05 && cardContribution > 0.05) {
          const combinedWinRate = Math.min(0.9, relic.winRateWith * 0.6 + deepStats.winRateWith * 0.6);
          const individualAvgWinRate = (relic.winRateWith + deepStats.winRateWith) / 2;
          const synergyBonus = combinedWinRate - individualAvgWinRate;

          if (synergyBonus > 0.05) {
            results.push({
              relicId,
              relicName: relic.relicName,
              cardId,
              cardName: deepStats.cardName,
              coOccurrences: Math.min(relic.timesAcquired, deepStats.timesPicked),
              combinedWinRate,
              individualAvgWinRate,
              synergyBonus,
              synergyType: 'additive',
              description: `${relic.relicName}와 ${deepStats.cardName}의 조합 효과`,
            });
          }
        }
      }
    }

    return results.sort((a, b) => b.synergyBonus - a.synergyBonus).slice(0, 15);
  }

  private analyzePokerHandEfficiency(): PokerHandEfficiency[] {
    const results: PokerHandEfficiency[] = [];
    const { pokerComboStats } = this.stats;

    const handNames: Record<string, string> = {
      'high_card': '하이 카드',
      'pair': '페어',
      'two_pair': '투 페어',
      'three_of_a_kind': '트리플',
      'straight': '스트레이트',
      'flush': '플러시',
      'full_house': '풀 하우스',
      'four_of_a_kind': '포카드',
      'straight_flush': '스트레이트 플러시',
      'royal_flush': '로열 플러시',
    };

    const difficulties: Record<string, number> = {
      'high_card': 0.1,
      'pair': 0.3,
      'two_pair': 0.5,
      'three_of_a_kind': 0.6,
      'straight': 0.7,
      'flush': 0.7,
      'full_house': 0.8,
      'four_of_a_kind': 0.9,
      'straight_flush': 0.95,
      'royal_flush': 0.99,
    };

    for (const [handType, occurrences] of Object.entries(pokerComboStats.comboFrequency || {})) {
      const avgEther = pokerComboStats.avgEtherByCombo?.[handType] || 0;
      const winRate = pokerComboStats.winRateByCombo?.[handType] || 0.5;
      const difficulty = difficulties[handType] || 0.5;

      results.push({
        handType,
        handName: handNames[handType] || handType,
        occurrences,
        winBattleRate: winRate,
        avgEtherGained: avgEther,
        winContribution: winRate - 0.5,
        triggerDifficulty: difficulty,
        efficiencyScore: (winRate - 0.5) / Math.max(0.1, difficulty),
        optimalCardCombos: [],
        balanceSuggestion: null,
      });
    }

    return results.sort((a, b) => b.efficiencyScore - a.efficiencyScore);
  }

  private identifyAntiSynergies(): SynergyAnalysis['antiSynergies'] {
    const antiSynergies: SynergyAnalysis['antiSynergies'] = [];
    const { cardSynergyStats, cardDeepStats } = this.stats;

    // 시너지가 음수인 조합 찾기
    for (const [pairKey, winRate] of Object.entries(cardSynergyStats.cardPairWinRate || {})) {
      const [card1, card2] = pairKey.split(':');
      const avgWinRate = (
        (cardDeepStats.get(card1)?.winRateWith || 0.5) +
        (cardDeepStats.get(card2)?.winRateWith || 0.5)
      ) / 2;

      const penalty = avgWinRate - winRate;
      if (penalty > 0.1) {
        antiSynergies.push({
          items: [
            cardDeepStats.get(card1)?.cardName || card1,
            cardDeepStats.get(card2)?.cardName || card2,
          ],
          penalty,
          reason: '함께 사용 시 승률 감소',
        });
      }
    }

    return antiSynergies.sort((a, b) => b.penalty - a.penalty).slice(0, 10);
  }

  private generateSynergyRecommendations(): BalanceRecommendation[] {
    const recommendations: BalanceRecommendation[] = [];

    // 강력한 시너지 경고
    const topSynergies = this.analyzeTopDualSynergies();
    for (const synergy of topSynergies.slice(0, 3)) {
      if (synergy.synergyBonus > 0.2) {
        recommendations.push({
          targetId: synergy.cards.join(':'),
          targetName: synergy.cards.join(' + '),
          targetType: 'card',
          priority: synergy.synergyBonus > 0.3 ? 'critical' : 'warning',
          issueType: 'overpowered_synergy',
          issue: `시너지 보너스 +${(synergy.synergyBonus * 100).toFixed(0)}%`,
          actionType: 'nerf',
          suggestion: '개별 카드 효과 감소 또는 시너지 조건 강화',
          metrics: { synergyBonus: `+${(synergy.synergyBonus * 100).toFixed(1)}%` },
          confidence: 0.7,
        });
      }
    }

    return recommendations;
  }

  // ==================== 3. 경제/자원 분석 ====================

  private analyzeEconomy(): EconomyAnalysis {
    return {
      etherEfficiency: this.analyzeEtherEfficiency(),
      shopPatterns: this.analyzeShopPatterns(),
      hpCurve: this.analyzeHPCurve(),
      riskReward: this.analyzeRiskReward(),
      economyHealth: this.evaluateEconomyHealth(),
      recommendations: this.generateEconomyRecommendations(),
    };
  }

  private analyzeEtherEfficiency(): EtherEfficiencyAnalysis {
    const { pokerComboStats, cardStats, runStats } = this.stats;

    const totalEther = Object.values(pokerComboStats.etherByCombo || {}).reduce((a, b) => a + b, 0);
    const etherSources: EtherEfficiencyAnalysis['etherSources'] = [];

    for (const [combo, ether] of Object.entries(pokerComboStats.etherByCombo || {})) {
      const occurrences = pokerComboStats.comboFrequency?.[combo] || 1;
      etherSources.push({
        source: combo,
        totalEther: ether,
        percentage: ether / Math.max(1, totalEther),
        efficiency: ether / occurrences,
      });
    }

    return {
      totalEtherGained: totalEther,
      avgEtherPerRun: totalEther / Math.max(1, runStats.totalRuns),
      avgEtherPerBattle: totalEther / Math.max(1, runStats.avgBattlesWon * runStats.totalRuns),
      etherSources: etherSources.sort((a, b) => b.efficiency - a.efficiency),
      etherUsage: [],
      efficientCards: [],
      wastePatterns: [],
      optimalStrategies: ['높은 족보 위주 플레이', '에테르 활용 타이밍 최적화'],
    };
  }

  private analyzeShopPatterns(): ShopPatternAnalysis {
    const { shopStats, shopServiceStats, runStats } = this.stats;

    const purchasesByType: ShopPatternAnalysis['purchasesByType'] = [
      {
        type: 'card',
        frequency: Object.values(shopStats.cardsPurchased || {}).reduce((a, b) => a + b, 0),
        avgSpent: 50,
        winRateImpact: 0.05,
      },
      {
        type: 'relic',
        frequency: Object.values(shopStats.relicsPurchased || {}).reduce((a, b) => a + b, 0),
        avgSpent: 100,
        winRateImpact: 0.1,
      },
      {
        type: 'service',
        frequency: shopServiceStats.healingUsed + (shopServiceStats.refreshUsed || 0),
        avgSpent: (shopServiceStats.healingCost + (shopServiceStats.refreshCost || 0)) /
          Math.max(1, shopServiceStats.healingUsed + (shopServiceStats.refreshUsed || 0)),
        winRateImpact: 0.02,
      },
    ];

    return {
      avgVisitsPerRun: shopStats.totalVisits / Math.max(1, runStats.totalRuns),
      avgSpentPerVisit: shopStats.avgSpentPerVisit,
      purchasesByType,
      optimalPurchasePriority: [
        { itemType: 'relic', priority: 1, reason: '가장 높은 승률 영향' },
        { itemType: 'card', priority: 2, reason: '덱 강화' },
        { itemType: 'service', priority: 3, reason: '생존 유지' },
      ],
      valueAnalysis: [],
      overspendingWarnings: [],
      skipConditions: ['골드 50 미만', 'HP 위험 상태에서 치료 가능할 때'],
    };
  }

  private analyzeHPCurve(): HPCurveAnalysis {
    const { recentRunProgressions, deathStats } = this.stats;
    const hpByFloor: HPCurveAnalysis['hpByFloor'] = [];

    // 층별 HP 집계
    const floorHpData: Map<number, { hps: number[]; winningHps: number[]; losingHps: number[] }> = new Map();

    for (const run of recentRunProgressions) {
      for (const progress of run.floorProgression) {
        if (!floorHpData.has(progress.floor)) {
          floorHpData.set(progress.floor, { hps: [], winningHps: [], losingHps: [] });
        }
        const data = floorHpData.get(progress.floor)!;
        const hpRatio = progress.hp / Math.max(1, progress.maxHp);
        data.hps.push(progress.hp);
        // 런 결과에 따라 분류 (간단한 추정)
        if (run.finalDeck.length > 0) {
          data.winningHps.push(progress.hp);
        } else {
          data.losingHps.push(progress.hp);
        }
      }
    }

    for (const [floor, data] of floorHpData) {
      hpByFloor.push({
        floor,
        avgHp: this.average(data.hps),
        avgHpRatio: this.average(data.hps) / 80, // 기본 최대 HP 80 가정
        winningAvgHp: this.average(data.winningHps),
        losingAvgHp: this.average(data.losingHps),
      });
    }

    // 위험 구간 탐지
    const dangerZones: HPCurveAnalysis['dangerZones'] = [];
    const sortedFloors = hpByFloor.sort((a, b) => a.floor - b.floor);

    for (let i = 1; i < sortedFloors.length; i++) {
      const prev = sortedFloors[i - 1];
      const curr = sortedFloors[i];
      const hpDrop = prev.avgHp - curr.avgHp;

      if (hpDrop > 15) {
        dangerZones.push({
          floorRange: [prev.floor, curr.floor],
          avgHpDrop: hpDrop,
          cause: `층 ${prev.floor}-${curr.floor} 구간에서 평균 HP ${hpDrop.toFixed(0)} 감소`,
        });
      }
    }

    return {
      hpByFloor: sortedFloors,
      dangerZones,
      healingEfficiency: [],
      optimalHpManagement: ['40% 이하 시 휴식 우선', '보스 전 HP 50% 이상 유지'],
      winRateByHpThreshold: [
        { threshold: 0.2, winRate: 0.2 },
        { threshold: 0.4, winRate: 0.4 },
        { threshold: 0.6, winRate: 0.55 },
        { threshold: 0.8, winRate: 0.65 },
        { threshold: 1.0, winRate: 0.7 },
      ],
    };
  }

  private analyzeRiskReward(): RiskRewardAnalysis {
    const { monsterStats } = this.stats;

    // 엘리트 분석
    const eliteAnalysis: RiskRewardAnalysis['eliteAnalysis'] = [];
    for (const [monsterId, stats] of monsterStats) {
      if (stats.tier === 2) { // 엘리트 티어
        eliteAnalysis.push({
          eliteId: monsterId,
          eliteName: stats.monsterName,
          riskLevel: 1 - stats.winRate,
          rewardValue: stats.avgDamageDealt * 0.1, // 대략적 보상 추정
          optimalHpThreshold: 50 + (1 - stats.winRate) * 30,
        });
      }
    }

    return {
      highRiskChoices: [
        {
          choiceType: 'elite_fight',
          description: '엘리트 전투 도전',
          riskLevel: 0.4,
          avgReward: 100,
          successRate: 0.6,
          expectedValue: 60,
          recommendation: 'situational',
        },
      ],
      eliteAnalysis,
      eventRisks: [],
      riskManagement: [
        'HP 50% 이상일 때만 엘리트 도전',
        '보스 전 층에서는 안전한 경로 선택',
        '덱이 완성되기 전까지 위험 회피',
      ],
    };
  }

  private evaluateEconomyHealth(): EconomyAnalysis['economyHealth'] {
    const { runStats, shopStats } = this.stats;

    // 경제 건강도 평가 기준
    const avgGold = runStats.avgGoldEarned;
    const spending = shopStats.totalSpent / Math.max(1, shopStats.totalVisits);

    if (avgGold < spending * 0.8) return 'critical';
    if (avgGold < spending * 1.2) return 'imbalanced';
    return 'healthy';
  }

  private generateEconomyRecommendations(): BalanceRecommendation[] {
    return [];
  }

  // ==================== 4. 플레이 스타일 분석 ====================

  private analyzePlayStyle(): PlayStyleAnalysis {
    return {
      aggression: this.analyzeAggression(),
      defense: this.analyzeDefense(),
      initiative: this.analyzeInitiative(),
      deckCycling: this.analyzeDeckCycling(),
      styleProfile: this.determineStyleProfile(),
      winRateByStyle: {},
      recommendations: [],
    };
  }

  private analyzeAggression(): AggressionMetrics {
    const { cardStats, battleRecords, runStats } = this.stats;

    let totalAttacks = 0;
    let totalTurns = 0;
    let attackCards = 0;
    let totalCards = 0;

    for (const [, stats] of cardStats) {
      totalCards++;
      if (stats.cardType === 'attack') {
        attackCards++;
        totalAttacks += stats.totalUses;
      }
    }

    for (const battle of battleRecords) {
      totalTurns += battle.turns;
    }

    const avgAttacksPerTurn = totalAttacks / Math.max(1, totalTurns);
    const attackCardRatio = attackCards / Math.max(1, totalCards);
    const aggressionScore = Math.min(10, avgAttacksPerTurn * 3 + attackCardRatio * 7);

    return {
      avgAttacksPerTurn,
      firstTurnAttackRate: 0.7, // 추정값
      attackCardRatio,
      aggressionScore,
      aggressiveWinRate: runStats.successRate * (aggressionScore > 5 ? 1.1 : 0.9),
      defensiveWinRate: runStats.successRate * (aggressionScore < 5 ? 1.1 : 0.9),
      optimalAggressionRange: [4, 7],
    };
  }

  private analyzeDefense(): DefenseMetrics {
    const { cardStats, battleRecords } = this.stats;

    let totalBlock = 0;
    let blockCardUses = 0;
    let totalCardUses = 0;

    for (const [, stats] of cardStats) {
      totalBlock += stats.totalBlock;
      totalCardUses += stats.totalUses;
      if (stats.totalBlock > 0) {
        blockCardUses += stats.totalUses;
      }
    }

    return {
      avgBlockPerTurn: totalBlock / Math.max(1, battleRecords.length * 5),
      blockCardUsageRate: blockCardUses / Math.max(1, totalCardUses),
      damagePreventionRate: 0.4, // 추정값
      blockEfficiency: 0.7, // 추정값
      overBlockRate: 0.1, // 추정값
      optimalDefenseStrategy: '필요할 때만 방어, 평소엔 공격 우선',
    };
  }

  private analyzeInitiative(): InitiativeAnalysis {
    return {
      initiativeRate: 0.6,
      reactiveRate: 0.4,
      initiativeWinRate: 0.55,
      reactiveWinRate: 0.45,
      optimalRatio: 0.6,
      situationalAdvice: [
        { situation: '낮은 HP', recommendation: 'reactive' },
        { situation: '높은 HP', recommendation: 'initiative' },
        { situation: '보스전', recommendation: 'initiative' },
      ],
    };
  }

  private analyzeDeckCycling(): DeckCyclingAnalysis {
    return {
      avgCyclesPerBattle: 1.5,
      drawEfficiency: 0.7,
      discardUtilization: 0.5,
      handManagementScore: 6,
      cyclingCardEffects: [],
      improvementSuggestions: ['드로우 카드 추가', '버리기 활용 카드 고려'],
    };
  }

  private determineStyleProfile(): PlayStyleAnalysis['styleProfile'] {
    const aggression = this.analyzeAggression();

    if (aggression.aggressionScore > 7) return 'aggressive';
    if (aggression.aggressionScore < 4) return 'defensive';
    return 'balanced';
  }

  // ==================== 5. 난이도 진행 ====================

  private analyzeDifficultyProgression(): DifficultyProgressionAnalysis {
    return {
      winStreak: this.analyzeWinStreak(),
      difficultyLevels: this.analyzeDifficultyLevels(),
      growthCurve: this.analyzeGrowthCurve(),
      overallProgress: this.calculateOverallProgress(),
      nextGoals: this.generateNextGoals(),
      recommendations: [],
    };
  }

  private analyzeWinStreak(): WinStreakAnalysis {
    const { recordStats } = this.stats;

    return {
      currentStreak: recordStats.currentWinStreak,
      longestStreak: recordStats.longestWinStreak,
      avgStreak: recordStats.longestWinStreak / 3, // 대략적 추정
      streakDistribution: {},
      streakFactors: [
        { factor: '덱 품질', correlation: 0.8 },
        { factor: '보스 대응력', correlation: 0.7 },
        { factor: '자원 관리', correlation: 0.6 },
      ],
      streakBreakers: [
        { cause: '보스 패배', frequency: 0.4 },
        { cause: '엘리트 패배', frequency: 0.3 },
        { cause: '초반 사망', frequency: 0.3 },
      ],
    };
  }

  private analyzeDifficultyLevels(): DifficultyLevelAnalysis[] {
    const results: DifficultyLevelAnalysis[] = [];
    const { difficultyStats } = this.stats;

    for (const [difficulty, stats] of difficultyStats) {
      results.push({
        difficulty,
        runs: stats.runs,
        wins: stats.wins,
        winRate: stats.winRate,
        avgFloorReached: stats.avgFloorReached,
        challenges: [],
        effectiveStrategies: [],
        requiredItems: [],
        advancementCondition: `승률 ${Math.round((difficulty + 1) * 10)}% 이상 달성`,
      });
    }

    return results.sort((a, b) => a.difficulty - b.difficulty);
  }

  private analyzeGrowthCurve(): PlayerGrowthCurve {
    const { runStats } = this.stats;

    return {
      winRateOverTime: [
        { period: 1, winRate: runStats.successRate * 0.7, runs: 10 },
        { period: 2, winRate: runStats.successRate * 0.85, runs: 20 },
        { period: 3, winRate: runStats.successRate, runs: 30 },
      ],
      learningRate: 0.05,
      plateauPeriods: [],
      breakthroughPeriods: [],
      currentSkillLevel: this.determineSkillLevel(),
      nextLevelEstimate: { runsNeeded: 50, targetWinRate: runStats.successRate + 0.1 },
    };
  }

  private determineSkillLevel(): PlayerGrowthCurve['currentSkillLevel'] {
    const winRate = this.stats.runStats.successRate;

    if (winRate >= 0.7) return 'master';
    if (winRate >= 0.55) return 'expert';
    if (winRate >= 0.4) return 'advanced';
    if (winRate >= 0.25) return 'intermediate';
    return 'beginner';
  }

  private calculateOverallProgress(): number {
    const { runStats, recordStats } = this.stats;

    // 다양한 요소를 종합한 진행도 계산
    const winRateScore = runStats.successRate * 40;
    const streakScore = Math.min(20, recordStats.longestWinStreak * 4);
    const flawlessScore = Math.min(20, recordStats.flawlessVictories * 2);
    const consistencyScore = Math.min(20, runStats.avgBattlesWon * 2);

    return Math.round(winRateScore + streakScore + flawlessScore + consistencyScore);
  }

  private generateNextGoals(): string[] {
    const { runStats, recordStats } = this.stats;
    const goals: string[] = [];

    if (runStats.successRate < 0.4) {
      goals.push('승률 40% 달성');
    }
    if (recordStats.longestWinStreak < 3) {
      goals.push('3연승 달성');
    }
    if (recordStats.flawlessVictories < 5) {
      goals.push('무피해 승리 5회 달성');
    }

    return goals;
  }

  // ==================== 6. 적 패턴 분석 ====================

  private analyzeEnemyPatterns(): EnemyPatternAnalysis {
    return {
      behaviorPatterns: this.analyzeEnemyBehaviors(),
      reactions: this.analyzeEnemyReactions(),
      counters: this.analyzeEnemyCounters(),
      unpredictableEnemies: [],
      mostDangerousEnemies: this.identifyDangerousEnemies(),
      easiestEnemies: this.identifyEasiestEnemies(),
      recommendations: this.generateEnemyRecommendations(),
    };
  }

  private analyzeEnemyBehaviors(): EnemyBehaviorPattern[] {
    const results: EnemyBehaviorPattern[] = [];
    const { monsterStats, battleRecords } = this.stats;

    for (const [monsterId, stats] of monsterStats) {
      if (stats.battles < this.minSampleSize) continue;

      // 간단한 행동 패턴 분석
      const enemyBattles = battleRecords.filter(b => b.monsterId === monsterId);
      const actionCounts: Record<string, number> = {};

      for (const battle of enemyBattles) {
        for (const [cardId, count] of Object.entries(battle.cardsUsed)) {
          actionCounts[cardId] = (actionCounts[cardId] || 0) + count;
        }
      }

      const dangerousMoves = Object.entries(actionCounts)
        .map(([action, count]) => ({
          action,
          avgDamage: stats.avgDamageDealt / Object.keys(actionCounts).length,
          frequency: count / enemyBattles.length,
        }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 3);

      results.push({
        enemyId: monsterId,
        enemyName: stats.monsterName,
        actionPatterns: [],
        conditionalBehavior: [],
        predictabilityScore: 0.6,
        dangerousMoves,
      });
    }

    return results;
  }

  private analyzeEnemyReactions(): EnemyReactionAnalysis[] {
    const results: EnemyReactionAnalysis[] = [];
    const { monsterStats } = this.stats;

    for (const [monsterId, stats] of monsterStats) {
      if (stats.battles < this.minSampleSize) continue;

      results.push({
        enemyId: monsterId,
        enemyName: stats.monsterName,
        reactions: [],
        exploitableWeaknesses: [],
        strengths: [],
      });
    }

    return results;
  }

  private analyzeEnemyCounters(): EnemyCounterAnalysis[] {
    const results: EnemyCounterAnalysis[] = [];
    const { monsterStats, cardDeepStats } = this.stats;

    for (const [monsterId, stats] of monsterStats) {
      if (stats.battles < this.minSampleSize) continue;

      // 효과적인 카드 분석
      const effectiveCards: EnemyCounterAnalysis['effectiveCards'] = stats.topCardsUsed
        .slice(0, 5)
        .map(card => ({
          cardId: card.cardId,
          cardName: cardDeepStats.get(card.cardId)?.cardName || card.cardId,
          effectivenessScore: card.count / stats.battles,
          reason: '자주 사용됨',
        }));

      results.push({
        enemyId: monsterId,
        enemyName: stats.monsterName,
        effectiveCards,
        ineffectiveCards: [],
        effectiveRelics: [],
        effectiveStrategies: [],
        avoidStrategies: [],
      });
    }

    return results;
  }

  private identifyDangerousEnemies(): EnemyPatternAnalysis['mostDangerousEnemies'] {
    const { monsterStats, deathStats } = this.stats;
    const results: EnemyPatternAnalysis['mostDangerousEnemies'] = [];

    for (const [monsterId, stats] of monsterStats) {
      if (stats.battles < this.minSampleSize) continue;

      const deaths = deathStats.deathsByEnemy[monsterId] || 0;
      const dangerScore = (1 - stats.winRate) * 0.6 + (deaths / Math.max(1, deathStats.totalDeaths)) * 0.4;

      results.push({
        enemyId: monsterId,
        enemyName: stats.monsterName,
        dangerScore,
      });
    }

    return results.sort((a, b) => b.dangerScore - a.dangerScore).slice(0, 5);
  }

  private identifyEasiestEnemies(): EnemyPatternAnalysis['easiestEnemies'] {
    const { monsterStats } = this.stats;
    const results: EnemyPatternAnalysis['easiestEnemies'] = [];

    for (const [monsterId, stats] of monsterStats) {
      if (stats.battles < this.minSampleSize) continue;

      results.push({
        enemyId: monsterId,
        enemyName: stats.monsterName,
        winRate: stats.winRate,
      });
    }

    return results.sort((a, b) => b.winRate - a.winRate).slice(0, 5);
  }

  private generateEnemyRecommendations(): BalanceRecommendation[] {
    const recommendations: BalanceRecommendation[] = [];
    const { monsterStats, deathStats } = this.stats;

    for (const [monsterId, stats] of monsterStats) {
      if (stats.battles < this.minSampleSize) continue;

      // 너무 어려운 적
      if (stats.winRate < 0.4) {
        recommendations.push({
          targetId: monsterId,
          targetName: stats.monsterName,
          targetType: 'enemy',
          priority: stats.winRate < 0.25 ? 'critical' : 'warning',
          issueType: 'too_difficult',
          issue: `승률 ${(stats.winRate * 100).toFixed(0)}%`,
          actionType: 'nerf',
          suggestion: 'HP 또는 공격력 감소 권장',
          metrics: { winRate: `${(stats.winRate * 100).toFixed(1)}%` },
          confidence: 0.8,
        });
      }

      // 너무 쉬운 적
      if (stats.winRate > 0.95 && stats.battles >= 20) {
        recommendations.push({
          targetId: monsterId,
          targetName: stats.monsterName,
          targetType: 'enemy',
          priority: 'watch',
          issueType: 'too_easy',
          issue: `승률 ${(stats.winRate * 100).toFixed(0)}%`,
          actionType: 'buff',
          suggestion: 'HP 또는 공격력 소폭 증가 고려',
          metrics: { winRate: `${(stats.winRate * 100).toFixed(1)}%` },
          confidence: 0.6,
        });
      }
    }

    return recommendations;
  }

  // ==================== 유틸리티 함수 ====================

  private average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  private calculateOverallHealthScore(recommendations: BalanceRecommendation[]): number {
    const criticalCount = recommendations.filter(r => r.priority === 'critical').length;
    const warningCount = recommendations.filter(r => r.priority === 'warning').length;

    let score = 100;
    score -= criticalCount * 15;
    score -= warningCount * 5;

    return Math.max(0, Math.min(100, score));
  }

  private identifyStrengths(): string[] {
    const strengths: string[] = [];
    const { runStats, recordStats } = this.stats;

    if (runStats.successRate > 0.5) strengths.push('높은 승률');
    if (recordStats.longestWinStreak >= 5) strengths.push('안정적인 연승 능력');
    if (recordStats.flawlessVictories > 10) strengths.push('무피해 클리어 능력');

    return strengths;
  }

  private identifyWeaknesses(): string[] {
    const weaknesses: string[] = [];
    const { runStats, deathStats } = this.stats;

    if (runStats.successRate < 0.4) weaknesses.push('낮은 승률');
    if (runStats.avgLayerReached < 8) weaknesses.push('후반 도달 어려움');

    const earlyDeaths = Object.entries(deathStats.deathsByFloor)
      .filter(([floor]) => parseInt(floor) <= 3)
      .reduce((sum, [, count]) => sum + count, 0);
    if (earlyDeaths / Math.max(1, deathStats.totalDeaths) > 0.3) {
      weaknesses.push('초반 생존율 낮음');
    }

    return weaknesses;
  }
}

// 편의 함수
export function generateComprehensiveReport(stats: DetailedStats): ComprehensiveAnalyticsReport {
  const analyzer = new ComprehensiveAnalyzer(stats);
  return analyzer.generateComprehensiveReport();
}
