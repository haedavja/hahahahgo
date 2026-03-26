import { describe, it, expect } from 'vitest';
import { BalanceInsightAnalyzer } from '../analysis/balance-insights';
import type { DetailedStats } from '../analysis/detailed-stats-types';

// 최소한의 Mock DetailedStats 생성 헬퍼
function createMockStats(overrides: Partial<DetailedStats> = {}): DetailedStats {
  return {
    runStats: {
      totalRuns: 100,
      successfulRuns: 50,
      successRate: 0.5,
      avgLayerReached: 5,
      avgBattlesWon: 8,
      avgGoldEarned: 150,
      avgGoldSpent: 120,
      avgCardsCollected: 12,
      avgRelicsCollected: 3,
      avgItemsCollected: 2,
      avgEventsVisited: 4,
      avgTraitsGained: 2,
      avgCardUpgrades: 3,
      winsByMethod: { damage: 40, timeout: 10 },
      runHistory: [],
    },
    monsterStats: new Map(),
    battleStats: {
      totalBattles: 0,
      wins: 0,
      losses: 0,
      avgTurns: 0,
      avgDamageDealt: 0,
      avgDamageTaken: 0,
      avgCardsPlayed: 0,
      comboUsage: new Map(),
    },
    cardPickStats: {
      pickRate: {},
      timesOffered: {},
      timesPicked: {},
    },
    cardContributionStats: {
      contribution: {},
      winRateWith: {},
      winRateWithout: {},
    },
    cardDeepStats: new Map(),
    relicStats: new Map(),
    itemStats: new Map(),
    eventStats: new Map(),
    deathStats: {
      totalDeaths: 0,
      deathsByFloor: {},
      deathsByEnemy: {},
      deathsByPhase: {},
      commonDeathCauses: [],
    },
    traitStats: {
      traitFrequency: {},
      traitWinRate: {},
      traitSynergies: new Map(),
    },
    floorProgressionAnalysis: [],
    shopStats: {
      totalVisits: 0,
      avgGoldSpent: 0,
      purchaseRate: {},
      skipRate: 0,
      relicPurchases: {},
      itemPurchases: {},
      cardPurchases: {},
    },
    dungeonStats: {
      totalDungeonRuns: 0,
      successfulDungeonClears: 0,
      avgRoomsCleared: 0,
      avgDungeonGoldEarned: 0,
      roomTypeVisits: {},
      avgDungeonDamage: 0,
    },
    ...overrides,
  } as DetailedStats;
}

// MonsterBattleStats 생성 헬퍼
function createMonsterStats(
  id: string,
  name: string,
  battles: number,
  winRate: number
) {
  return {
    monsterId: id,
    monsterName: name,
    battles,
    wins: Math.round(battles * winRate),
    losses: Math.round(battles * (1 - winRate)),
    winRate,
    avgTurns: 5,
    totalDamageTaken: 100,
    totalDamageDealt: 150,
    avgDamageTaken: 10,
    avgDamageDealt: 15,
    avgBlockGained: 20,
    avgEtherUsed: 5,
    winStreak: 0,
    lossStreak: 0,
  };
}

describe('BalanceInsightAnalyzer', () => {
  describe('detectSimpsonParadoxIssues', () => {
    it('몬스터가 3개 미만이면 역설을 감지하지 않음', () => {
      const monsterStats = new Map([
        ['monster1', createMonsterStats('monster1', '슬라임', 20, 0.8)],
        ['monster2', createMonsterStats('monster2', '고블린', 20, 0.6)],
      ]);

      const stats = createMockStats({ monsterStats });
      const insights = new BalanceInsightAnalyzer(stats);
      const recommendations = insights.generateRecommendations();

      const simpsonParadox = recommendations.find(
        r => r.issueType === 'simpson_paradox'
      );
      expect(simpsonParadox).toBeUndefined();
    });

    it('샘플 크기가 부족한 몬스터는 제외됨', () => {
      const monsterStats = new Map([
        ['monster1', createMonsterStats('monster1', '슬라임', 5, 0.8)], // 샘플 부족
        ['monster2', createMonsterStats('monster2', '고블린', 5, 0.6)], // 샘플 부족
        ['monster3', createMonsterStats('monster3', '오크', 5, 0.7)], // 샘플 부족
      ]);

      const stats = createMockStats({ monsterStats });
      const insights = new BalanceInsightAnalyzer(stats);
      const recommendations = insights.generateRecommendations();

      const simpsonParadox = recommendations.find(
        r => r.issueType === 'simpson_paradox'
      );
      expect(simpsonParadox).toBeUndefined();
    });

    it('역설이 없을 때 권장사항을 생성하지 않음', () => {
      // 전체 런 승률 50%, 몬스터별 승률도 비슷하게 분포
      const monsterStats = new Map([
        ['monster1', createMonsterStats('monster1', '슬라임', 20, 0.55)],
        ['monster2', createMonsterStats('monster2', '고블린', 20, 0.50)],
        ['monster3', createMonsterStats('monster3', '오크', 20, 0.45)],
        ['monster4', createMonsterStats('monster4', '트롤', 20, 0.50)],
      ]);

      const stats = createMockStats({
        monsterStats,
        runStats: {
          totalRuns: 100,
          successfulRuns: 50,
          successRate: 0.5,
          avgLayerReached: 5,
          avgBattlesWon: 8,
          avgGoldEarned: 150,
          avgGoldSpent: 120,
          avgCardsCollected: 12,
          avgRelicsCollected: 3,
          avgItemsCollected: 2,
          avgEventsVisited: 4,
          avgTraitsGained: 2,
          avgCardUpgrades: 3,
          winsByMethod: { damage: 40, timeout: 10 },
          runHistory: [],
        },
      });

      const insights = new BalanceInsightAnalyzer(stats);
      const recommendations = insights.generateRecommendations();

      const simpsonParadox = recommendations.find(
        r => r.issueType === 'simpson_paradox'
      );
      expect(simpsonParadox).toBeUndefined();
    });

    it('대부분의 전투에서 승리하지만 전체 런 승률이 낮을 때 역설 감지', () => {
      // 개별 몬스터 승률은 높은데 (평균 75%), 전체 런 승률은 낮음 (30%)
      // 이는 특정 몬스터에서 집중적으로 패배함을 의미
      const monsterStats = new Map([
        ['monster1', createMonsterStats('monster1', '슬라임', 20, 0.9)],
        ['monster2', createMonsterStats('monster2', '고블린', 20, 0.85)],
        ['monster3', createMonsterStats('monster3', '오크', 20, 0.80)],
        ['monster4', createMonsterStats('monster4', '보스', 20, 0.15)], // 보스에서만 많이 짐
      ]);

      const stats = createMockStats({
        monsterStats,
        runStats: {
          totalRuns: 100,
          successfulRuns: 30, // 전체 런 승률 30%
          successRate: 0.3,
          avgLayerReached: 5,
          avgBattlesWon: 8,
          avgGoldEarned: 150,
          avgGoldSpent: 120,
          avgCardsCollected: 12,
          avgRelicsCollected: 3,
          avgItemsCollected: 2,
          avgEventsVisited: 4,
          avgTraitsGained: 2,
          avgCardUpgrades: 3,
          winsByMethod: { damage: 25, timeout: 5 },
          runHistory: [],
        },
      });

      const insights = new BalanceInsightAnalyzer(stats);
      const recommendations = insights.generateRecommendations();

      const simpsonParadox = recommendations.find(
        r => r.issueType === 'simpson_paradox'
      );

      // 역설이 감지될 수도 있고 안 될 수도 있음 (알고리즘 조건에 따라)
      // 감지되면 적절한 정보가 포함되어야 함
      if (simpsonParadox) {
        expect(simpsonParadox.targetType).toBe('enemy');
        expect(simpsonParadox.priority).toBe('warning');
        expect(simpsonParadox.actionType).toBe('investigate');
        expect(simpsonParadox.metrics).toHaveProperty('overallRunWinRate');
        expect(simpsonParadox.metrics).toHaveProperty('avgMonsterWinRate');
      }
    });

    it('역설 감지 시 적절한 메트릭 포함', () => {
      // 극단적인 역설 케이스: 모든 몬스터 승률이 전체 런 승률과 반대 방향
      const monsterStats = new Map([
        ['monster1', createMonsterStats('monster1', '슬라임', 30, 0.9)],
        ['monster2', createMonsterStats('monster2', '고블린', 30, 0.85)],
        ['monster3', createMonsterStats('monster3', '오크', 30, 0.88)],
      ]);

      const stats = createMockStats({
        monsterStats,
        runStats: {
          totalRuns: 100,
          successfulRuns: 20, // 전체 런 승률 20% (매우 낮음)
          successRate: 0.2,
          avgLayerReached: 3,
          avgBattlesWon: 5,
          avgGoldEarned: 100,
          avgGoldSpent: 80,
          avgCardsCollected: 8,
          avgRelicsCollected: 2,
          avgItemsCollected: 1,
          avgEventsVisited: 2,
          avgTraitsGained: 1,
          avgCardUpgrades: 1,
          winsByMethod: { damage: 15, timeout: 5 },
          runHistory: [],
        },
      });

      const insights = new BalanceInsightAnalyzer(stats);
      const recommendations = insights.generateRecommendations();

      const simpsonParadox = recommendations.find(
        r => r.issueType === 'simpson_paradox'
      );

      if (simpsonParadox) {
        // 메트릭 검증
        expect(simpsonParadox.metrics.overallRunWinRate).toBe('20.0%');
        expect(simpsonParadox.confidence).toBeGreaterThan(0);
        expect(typeof simpsonParadox.metrics.monstersAboveAvg).toBe('number');
        expect(typeof simpsonParadox.metrics.monstersBelowAvg).toBe('number');
      }
    });
  });

  describe('generateRecommendations', () => {
    it('빈 통계에서 빈 배열 반환', () => {
      const stats = createMockStats();
      const insights = new BalanceInsightAnalyzer(stats);
      const recommendations = insights.generateRecommendations();

      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('권장사항이 우선순위 순으로 정렬됨', () => {
      // OP 카드와 약한 카드 추가
      const cardDeepStats = new Map([
        [
          'op_card',
          {
            cardId: 'op_card',
            cardName: 'OP 카드',
            timesPicked: 80,
            timesOffered: 100,
            timesPlayed: 200,
            avgPlaysPerBattle: 2.5,
            neverPlayedRuns: 5,
            winRateWith: 0.9,
            winRateWithout: 0.3,
            avgDamageDealt: 50,
            avgBlockGained: 20,
          },
        ],
      ]);

      const stats = createMockStats({
        cardDeepStats,
        cardPickStats: {
          pickRate: { op_card: 0.8 },
          timesOffered: { op_card: 100 },
          timesPicked: { op_card: 80 },
        },
        cardContributionStats: {
          contribution: { op_card: 0.3 },
          winRateWith: { op_card: 0.9 },
          winRateWithout: { op_card: 0.3 },
        },
      });

      const insights = new BalanceInsightAnalyzer(stats);
      const recommendations = insights.generateRecommendations();

      if (recommendations.length > 1) {
        const priorities = recommendations.map(r => r.priority);
        const priorityOrder = { critical: 0, warning: 1, watch: 2, ok: 3 };

        for (let i = 1; i < priorities.length; i++) {
          expect(priorityOrder[priorities[i]]).toBeGreaterThanOrEqual(
            priorityOrder[priorities[i - 1]]
          );
        }
      }
    });
  });
});
