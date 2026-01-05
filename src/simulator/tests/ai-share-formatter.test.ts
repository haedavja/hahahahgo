/**
 * @file ai-share-formatter.test.ts
 * @description AI 공유용 포맷터 테스트
 */

import { describe, it, expect, vi } from 'vitest';
import {
  formatBattleForAI,
  formatSimulationForAI,
  formatRunStatsForAI,
  formatDetailedStatsForAI,
  formatBalanceComparisonForAI,
  formatComprehensiveReportForAI,
  outputForCopy,
  AIShareFormatter,
} from '../analysis/ai-share-formatter';
import type { BattleResult, SimulationResult, SimulationSummary } from '../core/types';
import type { RunStatistics } from '../game/run-simulator';
import type { DetailedStats } from '../analysis/detailed-stats-types';

describe('ai-share-formatter', () => {
  // ==================== 테스트 데이터 ====================

  const createBattleResult = (): BattleResult => ({
    winner: 'player',
    turns: 5,
    playerDamageDealt: 50,
    enemyDamageDealt: 20,
    playerFinalHp: 80,
    enemyFinalHp: 0,
    etherGained: 10,
    battleLog: [
      'Player: slash → 10 damage',
      'Enemy: defend → 5 block',
      'Player: heavyBlow → 15 damage',
    ],
    cardUsage: { slash: 3, heavyBlow: 2, defend: 1 },
    comboStats: { pair: 1, triple: 0 },
    tokenStats: { strength: 2, finesse: 1 },
    victory: true,
    enemyId: 'test_enemy',
  });

  const createSimulationResult = (): SimulationResult => ({
    config: {
      battles: 100,
      maxTurns: 30,
      enemyIds: ['ghoul', 'skeleton'],
      playerDeck: ['slash', 'defend', 'heavyBlow'],
      playerRelics: ['burning_blood'],
      anomalyId: 'test_anomaly',
      anomalyLevel: 2,
    },
    results: [createBattleResult()],
    summary: {
      totalBattles: 100,
      wins: 65,
      losses: 33,
      draws: 2,
      winRate: 0.65,
      avgTurns: 8.5,
      avgPlayerDamage: 45,
      avgEnemyDamage: 25,
      cardEfficiency: {
        slash: { uses: 150, avgDamage: 10 },
        heavyBlow: { uses: 50, avgDamage: 20 },
      },
      topCards: [
        { id: 'slash', uses: 150, avgDamage: 10 },
        { id: 'heavyBlow', uses: 50, avgDamage: 20 },
      ],
      avgEtherGained: 8,
      tokenUsage: { strength: 30, finesse: 20 },
    },
    timestamp: Date.now(),
    duration: 5000,
  });

  const createRunStatistics = (): RunStatistics => ({
    totalRuns: 50,
    successRate: 0.4,
    avgFinalLayer: 3.5,
    avgBattlesWon: 8,
    avgGoldEarned: 150,
    avgCardsInDeck: 15,
    deathCauses: {
      'ghoul': 15,
      'boss_dragon': 10,
      'skeleton': 5,
    },
    strategyComparison: {
      aggressive: { successRate: 0.45, avgLayer: 3.8 },
      defensive: { successRate: 0.35, avgLayer: 3.2 },
      balanced: { successRate: 0.4, avgLayer: 3.5 },
    } as Record<string, { successRate: number; avgLayer: number }>,
  });

  const createDetailedStats = (): DetailedStats => ({
    startTime: new Date(),
    endTime: new Date(),
    cardStats: new Map([
      ['slash', {
        cardId: 'slash',
        cardName: '베기',
        cardType: 'attack',
        totalUses: 100,
        usesInWins: 70,
        usesInLosses: 30,
        totalDamage: 1000,
        avgDamage: 10,
        totalBlock: 0,
        avgBlock: 0,
        specialTriggers: {},
        crossTriggers: 5,
        winContribution: 0.7,
        contextByHpState: {
          critical: { uses: 0, avgDamage: 0, avgBlock: 0, winRate: 0 },
          unstable: { uses: 0, avgDamage: 0, avgBlock: 0, winRate: 0 },
          stable: { uses: 0, avgDamage: 0, avgBlock: 0, winRate: 0 },
        },
        contextByFloor: { early: { uses: 0, avgDamage: 0, avgBlock: 0, winRate: 0 }, mid: { uses: 0, avgDamage: 0, avgBlock: 0, winRate: 0 }, late: { uses: 0, avgDamage: 0, avgBlock: 0, winRate: 0 }, byFloor: new Map() },
        contextByEnemy: {
          vsNormal: { uses: 0, avgDamage: 0, avgBlock: 0, winRate: 0 },
          vsElite: { uses: 0, avgDamage: 0, avgBlock: 0, winRate: 0 },
          vsBoss: { uses: 0, avgDamage: 0, avgBlock: 0, winRate: 0 },
          vsMultiple: { uses: 0, avgDamage: 0, avgBlock: 0, winRate: 0 },
          byEnemyType: new Map(),
        },
        contextByTurn: { firstTurn: { uses: 0, avgDamage: 0, avgBlock: 0, winRate: 0 }, earlyTurns: { uses: 0, avgDamage: 0, avgBlock: 0, winRate: 0 }, midTurns: { uses: 0, avgDamage: 0, avgBlock: 0, winRate: 0 }, lateTurns: { uses: 0, avgDamage: 0, avgBlock: 0, winRate: 0 }, byTurn: new Map() },
      }],
    ]),
    monsterStats: new Map([
      ['ghoul', {
        monsterId: 'ghoul',
        monsterName: '구울',
        tier: 1,
        isBoss: false,
        battles: 20,
        wins: 15,
        losses: 5,
        winRate: 0.75,
        avgTurns: 5,
        totalDamageTaken: 200,
        totalDamageDealt: 300,
        avgDamageTaken: 10,
        avgDamageDealt: 15,
        avgHpRemainingOnWin: 70,
        topCardsUsed: [{ cardId: 'slash', count: 30 }],
        contextStats: {
          solo: { battles: 0, wins: 0, winRate: 0, avgTurns: 0, avgDamageTaken: 0 },
          withSameType: { battles: 0, wins: 0, winRate: 0, avgTurns: 0, avgDamageTaken: 0, avgGroupSize: 0 },
          withMixedGroup: { battles: 0, wins: 0, winRate: 0, avgTurns: 0, avgDamageTaken: 0, frequentPartners: [] },
        },
      }],
    ]),
    eventStats: new Map([
      ['treasure', {
        eventId: 'treasure',
        eventName: '보물상자',
        occurrences: 10,
        successes: 8,
        successRate: 0.8,
        totalHpChange: -20,
        totalGoldChange: 200,
        totalIntelChange: 0,
        totalMaterialChange: 0,
        totalInsightChange: 0,
        totalGraceChange: 0,
        totalLootChange: 0,
        cardsGained: ['rare_sword'],
        relicsGained: [],
      }],
    ]),
    runStats: {
      totalRuns: 50,
      successfulRuns: 20,
      successRate: 0.4,
      avgLayerReached: 3.5,
      avgBattlesWon: 8,
      avgGoldEarned: 150,
      avgFinalDeckSize: 15,
      deathCauses: { 'ghoul': 15 },
      deathByLayer: { 2: 10, 3: 20 },
      strategyWinRates: { aggressive: 0.45 },
    },
    battleRecords: [],
    upgradeStats: {
      upgradesByCard: {},
      totalUpgrades: 0,
      avgUpgradesPerRun: 0,
      upgradeWinCorrelation: 0,
    },
    growthStats: {
      statInvestments: {},
      ethosInvestments: {},
      pathosInvestments: {},
      logosInvestments: {},
      totalInvestments: 0,
      avgInvestmentsPerRun: 0,
      logosActivations: {},
      levelDistribution: {},
      statWinCorrelation: {},
      growthPathStats: [],
      finalStatDistribution: {},
    },
    shopStats: {
      totalVisits: 0,
      totalSpent: 0,
      avgSpentPerVisit: 0,
      cardsPurchased: {},
      relicsPurchased: {},
      itemsPurchased: {},
      purchaseRecords: [],
      cardsRemoved: 0,
      cardsUpgraded: 0,
    },
    dungeonStats: {
      totalAttempts: 0,
      clears: 0,
      clearRate: 0,
      clearsByDungeon: {},
      rewards: { gold: 0, cards: [], relics: [] },
      avgTurns: 0,
      avgDamageTaken: 0,
    },
    shopServiceStats: {
      healingUsed: 0,
      totalHpHealed: 0,
      healingCost: 0,
      removalCost: 0,
      removedCards: {},
      upgradeCost: 0,
      upgradedCards: {},
      refreshUsed: 0,
      refreshCost: 0,
    },
    itemUsageStats: {
      itemsAcquired: {},
      itemsUsed: {},
      itemEffects: {},
      itemsDiscarded: {},
      usageContext: { inBattle: {}, outOfBattle: {} },
    },
    eventChoiceStats: new Map(),
    aiStrategyStats: {
      strategyUsage: {},
      strategyWinRate: {},
      strategyAvgTurns: {},
      strategyAvgDamage: {},
      strategyByHpRatio: {},
      cardSelectionReasons: {},
      synergyTriggers: {},
      comboTypeUsage: {},
    },
    cardPickStats: {
      timesOffered: {},
      timesPicked: {},
      pickRate: {},
      timesSkipped: {},
    },
    cardContributionStats: {
      winRateWithCard: {},
      winRateWithoutCard: {},
      contribution: {},
      runsWithCard: {},
    },
    cardSynergyStats: {
      cardPairFrequency: {},
      cardPairWinRate: {},
      topSynergies: [],
    },
    recordStats: {
      longestWinStreak: 0,
      currentWinStreak: 0,
      flawlessVictories: 0,
      maxSingleTurnDamage: 0,
      maxDamageRecord: null,
      fastestClear: 0,
      fastestClearRecord: null,
      largestDeckClear: 0,
      smallestDeckClear: 0,
      maxGoldHeld: 0,
      bossFlawlessCount: 0,
    },
    enemyGroupStats: new Map(),
    cardDeepStats: new Map(),
    deathStats: {
      totalDeaths: 0,
      deathsByFloor: {},
      deathsByEnemy: {},
      deathsByCause: {},
      avgDeathFloor: 0,
      recentDeaths: [],
      deadliestEnemies: [],
    },
    relicStats: new Map(),
    difficultyStats: new Map(),
    recentRunProgressions: [],
    allCardChoices: [],
    tokenStats: new Map(),
    pokerComboStats: {
      comboFrequency: {},
      etherByCombo: {},
      avgEtherByCombo: {},
      winRateByCombo: {},
      comboDetails: new Map(),
    },
    floorProgressionAnalysis: {
      floorStats: new Map(),
      difficultySpikes: [],
      resourceCurves: {
        hpCurve: [],
        goldCurve: [],
        deckSizeCurve: [],
      },
      optimalPathAnalysis: {
        highWinRatePaths: [],
        lowWinRatePaths: [],
      },
      bottleneckAnalysis: {
        highFailureFloors: [],
        resourceDepletionZones: [],
      },
    },
    eventImpactAnalysis: {
      eventImpacts: new Map(),
      mostBeneficialEvents: [],
      mostDetrimentalEvents: [],
      overallEventInfluence: {
        winContribution: 0,
        lossContribution: 0,
        mostFatalChoice: null,
      },
    },
    relicSynergyImpactAnalysis: {
      synergyCombinations: new Map(),
      topSynergies: [],
      antiSynergies: [],
      relicCountImpact: [],
      coreRelics: [],
      contextualRelicValues: new Map(),
    },
    growthDecisionAnalysis: {
      decisions: [],
      reasonsByType: {},
      contextualPatterns: [],
      decisionAccuracy: {
        correctChoiceRate: 0,
        commonMistakes: [],
        accuracyByContext: {},
      },
      optimalPaths: [],
    },
    cardSelectionReasoningAnalysis: {
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
    },
  });

  // ==================== 전투 결과 포맷 테스트 ====================

  describe('formatBattleForAI', () => {
    it('기본 전투 결과 포맷', () => {
      const result = formatBattleForAI(createBattleResult());

      expect(result).toContain('# Battle Result');
      expect(result).toContain('- Winner: player');
      expect(result).toContain('- Turns: 5');
      expect(result).toContain('- Player HP: 80');
      expect(result).toContain('- Ether Gained: 10');
    });

    it('카드 사용 통계 포함', () => {
      const result = formatBattleForAI(createBattleResult(), {
        includeCardUsage: true,
      });

      expect(result).toContain('## Card Usage');
      expect(result).toContain('- slash: 3');
      expect(result).toContain('- heavyBlow: 2');
    });

    it('전투 로그 포함', () => {
      const result = formatBattleForAI(createBattleResult(), {
        includeLog: true,
      });

      expect(result).toContain('## Battle Log');
      expect(result).toContain('```');
      expect(result).toContain('slash');
    });

    it('콤보 및 토큰 통계 포함', () => {
      const result = formatBattleForAI(createBattleResult(), {
        includeComboStats: true,
        includeTokenStats: true,
      });

      expect(result).toContain('## Combo Stats');
      expect(result).toContain('- pair: 1');
      expect(result).toContain('## Token Stats');
      expect(result).toContain('- strength: 2');
    });
  });

  // ==================== 시뮬레이션 결과 포맷 테스트 ====================

  describe('formatSimulationForAI', () => {
    it('기본 시뮬레이션 요약 포맷', () => {
      const result = formatSimulationForAI(createSimulationResult());

      expect(result).toContain('# Simulation Summary');
      expect(result).toContain('- Total Battles: 100');
      expect(result).toContain('- Wins: 65 (65.0%)');
      expect(result).toContain('- Avg Turns: 8.5');
    });

    it('설정 정보 포함', () => {
      const result = formatSimulationForAI(createSimulationResult(), {
        includeConfig: true,
      });

      expect(result).toContain('## Configuration');
      expect(result).toContain('- Battles: 100');
      expect(result).toContain('- Enemies: ghoul, skeleton');
      expect(result).toContain('- Anomaly: test_anomaly');
    });

    it('Top 카드 테이블 포함', () => {
      const result = formatSimulationForAI(createSimulationResult(), {
        topCards: 5,
      });

      expect(result).toContain('## Top 5 Cards');
      expect(result).toContain('| Card | Uses | Avg Damage |');
      expect(result).toContain('| slash | 150 |');
    });

    it('원본 JSON 포함', () => {
      const result = formatSimulationForAI(createSimulationResult(), {
        includeRawJson: true,
      });

      expect(result).toContain('## Raw Data (JSON)');
      expect(result).toContain('```json');
      expect(result).toContain('"totalBattles": 100');
    });
  });

  // ==================== 런 통계 포맷 테스트 ====================

  describe('formatRunStatsForAI', () => {
    it('기본 런 통계 포맷', () => {
      const result = formatRunStatsForAI(createRunStatistics());

      expect(result).toContain('# Run Statistics');
      expect(result).toContain('- Total Runs: 50');
      expect(result).toContain('- Success Rate: 40.0%');
      expect(result).toContain('- Avg Final Layer: 3.5');
    });

    it('사망 원인 포함', () => {
      const result = formatRunStatsForAI(createRunStatistics());

      expect(result).toContain('## Death Causes');
      expect(result).toContain('- ghoul: 15');
      expect(result).toContain('- boss_dragon: 10');
    });

    it('전략 비교 포함', () => {
      const result = formatRunStatsForAI(createRunStatistics(), {
        includeStrategyComparison: true,
      });

      expect(result).toContain('## Strategy Comparison');
      expect(result).toContain('| aggressive |');
      expect(result).toContain('45.0%');
    });
  });

  // ==================== 상세 통계 포맷 테스트 ====================

  describe('formatDetailedStatsForAI', () => {
    it('카드 통계 포함', () => {
      const result = formatDetailedStatsForAI(createDetailedStats());

      expect(result).toContain('## Card Statistics');
      expect(result).toContain('| slash |');
      expect(result).toContain('| 100 |');
    });

    it('몬스터 통계 포함', () => {
      const result = formatDetailedStatsForAI(createDetailedStats());

      expect(result).toContain('## Monster Statistics');
      expect(result).toContain('| ghoul |');
      expect(result).toContain('| 75.0% |');
    });

    it('이벤트 통계 포함', () => {
      const result = formatDetailedStatsForAI(createDetailedStats());

      expect(result).toContain('## Event Statistics');
      expect(result).toContain('| treasure |');
    });

    it('런 통계 포함', () => {
      const result = formatDetailedStatsForAI(createDetailedStats());

      expect(result).toContain('## Run Statistics');
      expect(result).toContain('- Total Runs: 50');
    });
  });

  // ==================== 밸런스 비교 포맷 테스트 ====================

  describe('formatBalanceComparisonForAI', () => {
    it('밸런스 변경 비교 포맷', () => {
      const before: SimulationSummary = {
        totalBattles: 100,
        wins: 50,
        losses: 50,
        draws: 0,
        winRate: 0.5,
        avgTurns: 10,
        avgPlayerDamage: 40,
        avgEnemyDamage: 35,
        cardEfficiency: {},
      };

      const after: SimulationSummary = {
        totalBattles: 100,
        wins: 60,
        losses: 40,
        draws: 0,
        winRate: 0.6,
        avgTurns: 9,
        avgPlayerDamage: 45,
        avgEnemyDamage: 30,
        cardEfficiency: {},
      };

      const result = formatBalanceComparisonForAI({
        name: 'Slash Buff Test',
        before,
        after,
        changes: ['Slash damage: 10 → 12'],
      });

      expect(result).toContain('# Balance Comparison: Slash Buff Test');
      expect(result).toContain('## Changes');
      expect(result).toContain('Slash damage: 10 → 12');
      expect(result).toContain('## Results Comparison');
      expect(result).toContain('| Win Rate | 50.0% | 60.0% | +10.0% |');
      expect(result).toContain('## Assessment');
      expect(result).toContain('Player buff');
    });
  });

  // ==================== 종합 리포트 테스트 ====================

  describe('formatComprehensiveReportForAI', () => {
    it('종합 리포트 포맷', () => {
      const result = formatComprehensiveReportForAI({
        title: 'Test Report',
        simulation: createSimulationResult(),
        runStats: createRunStatistics(),
        notes: ['Test note 1', 'Test note 2'],
      });

      expect(result).toContain('# Test Report');
      expect(result).toContain('## Notes');
      expect(result).toContain('- Test note 1');
      expect(result).toContain('# Simulation Summary');
      expect(result).toContain('# Run Statistics');
    });
  });

  // ==================== AIShareFormatter 객체 테스트 ====================

  describe('AIShareFormatter', () => {
    it('모든 포맷터 함수가 존재', () => {
      expect(AIShareFormatter.battle).toBe(formatBattleForAI);
      expect(AIShareFormatter.simulation).toBe(formatSimulationForAI);
      expect(AIShareFormatter.runStats).toBe(formatRunStatsForAI);
      expect(AIShareFormatter.detailedStats).toBe(formatDetailedStatsForAI);
      expect(AIShareFormatter.balanceComparison).toBe(formatBalanceComparisonForAI);
      expect(AIShareFormatter.comprehensive).toBe(formatComprehensiveReportForAI);
      expect(AIShareFormatter.output).toBe(outputForCopy);
    });
  });

  // ==================== 출력 헬퍼 테스트 ====================

  describe('outputForCopy', () => {
    it('복사용 구분선 출력', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      outputForCopy('Test content');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('AI SHARE'));
      expect(consoleSpy).toHaveBeenCalledWith('Test content');

      consoleSpy.mockRestore();
    });
  });
});
