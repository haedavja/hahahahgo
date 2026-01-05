/**
 * @file balance-insights.ts
 * @description 밸런스 인사이트 분석 시스템
 *
 * ## 주요 기능
 * 1. 액션 가능한 밸런스 권장사항 (BalanceRecommendation)
 * 2. 병목 구간 심층 분석
 * 3. 필수픽 감지 시스템
 * 4. 다양성 지표 (Gini 계수)
 * 5. 변경 전후 비교 분석
 * 6. 플레이어 경험 예측 모델
 */

import type {
  DetailedStats,
  CardDeepStats,
  RelicStats,
  MonsterBattleStats,
  DeathAnalysis,
  FloorDetailedStats,
} from './detailed-stats-types';
import {
  calculateGini as calculateGiniUtil,
  calculateDiversityScore,
  calculateTopConcentration,
  getConfidenceLevel,
  calculateProportionCI,
  testProportionSignificance,
  calculateTrend,
  detectSimpsonParadox,
} from './stats-utils';

// ==================== 타입 정의 ====================

/** 밸런스 권장사항 우선순위 */
export type BalancePriority = 'critical' | 'warning' | 'watch' | 'ok';

/** 권장 조치 타입 */
export type ActionType = 'nerf' | 'buff' | 'rework' | 'remove' | 'add_alternative' | 'adjust_availability';

/** 밸런스 권장사항 */
export interface BalanceRecommendation {
  /** 대상 ID */
  targetId: string;
  /** 대상 이름 */
  targetName: string;
  /** 대상 유형 */
  targetType: 'card' | 'relic' | 'enemy' | 'event' | 'floor';
  /** 우선순위 */
  priority: BalancePriority;
  /** 문제 유형 */
  issueType: string;
  /** 문제 설명 */
  issue: string;
  /** 권장 조치 */
  actionType: ActionType;
  /** 구체적 제안 */
  suggestion: string;
  /** 관련 수치 */
  metrics: Record<string, number | string>;
  /** 신뢰도 (0-1, 샘플 수 기반) */
  confidence: number;
  /** 예상 영향 (승률 변화 추정) */
  estimatedImpact?: number;
}

/** 병목 구간 분석 */
export interface BottleneckAnalysis {
  /** 층 번호 */
  floor: number;
  /** 사망률 */
  deathRate: number;
  /** 전체 평균 대비 사망률 배수 */
  deathRateMultiplier: number;
  /** 주요 사망 원인 */
  primaryCause: {
    enemyId: string;
    enemyName: string;
    deathContribution: number;
  };
  /** 사망 시점 평균 HP */
  avgHpAtDeath: number;
  /** 사망 시점 평균 HP 비율 */
  avgHpRatioAtDeath: number;
  /** 원인 분석 */
  causeAnalysis: string;
  /** 개선 제안 */
  suggestions: string[];
  /** 심각도 */
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/** 필수픽 감지 결과 */
export interface MustPickDetection {
  /** 대상 ID */
  targetId: string;
  /** 대상 이름 */
  targetName: string;
  /** 대상 유형 */
  targetType: 'card' | 'relic';
  /** 보유 시 승률 */
  winRateWith: number;
  /** 미보유 시 승률 */
  winRateWithout: number;
  /** 기여도 차이 */
  contributionGap: number;
  /** 획득 빈도 */
  acquisitionRate: number;
  /** 위험 수준 */
  riskLevel: 'extreme' | 'high' | 'moderate';
  /** 문제 설명 */
  issue: string;
  /** 개선 제안 */
  suggestions: string[];
}

/** 다양성 지표 */
export interface DiversityMetrics {
  /** 카드 다양성 */
  card: {
    /** Gini 계수 (0=균등, 1=독점) */
    giniCoefficient: number;
    /** 상위 10% 카드의 사용량 점유율 */
    top10PercentShare: number;
    /** 사용률 0% 카드 수 */
    unusedCount: number;
    /** 사용률 0% 카드 비율 */
    unusedRate: number;
    /** 건강도 평가 */
    healthRating: 'healthy' | 'imbalanced' | 'critical';
    /** 메타 티어 분포 */
    tierDistribution: {
      tier: string;
      cards: string[];
      avgPickRate: number;
      avgWinContribution: number;
    }[];
  };
  /** 상징 다양성 */
  relic: {
    giniCoefficient: number;
    top10PercentShare: number;
    unusedCount: number;
    unusedRate: number;
    healthRating: 'healthy' | 'imbalanced' | 'critical';
  };
  /** 전략 다양성 */
  strategy: {
    dominantStrategy: string | null;
    dominantStrategyShare: number;
    strategyCount: number;
    healthRating: 'healthy' | 'imbalanced' | 'critical';
  };
}

/** 변경 전후 비교 결과 */
export interface PatchComparison {
  /** 비교 대상 ID */
  targetId: string;
  /** 비교 대상 이름 */
  targetName: string;
  /** 변경 전 통계 */
  before: {
    sampleSize: number;
    pickRate?: number;
    winRateWith?: number;
    avgDamage?: number;
    avgUsage?: number;
  };
  /** 변경 후 통계 */
  after: {
    sampleSize: number;
    pickRate?: number;
    winRateWith?: number;
    avgDamage?: number;
    avgUsage?: number;
  };
  /** 변화량 */
  changes: {
    pickRateChange?: number;
    winRateChange?: number;
    damageChange?: number;
    usageChange?: number;
  };
  /** 평가 */
  assessment: 'intended' | 'over_nerf' | 'over_buff' | 'no_effect' | 'unexpected';
  /** 평가 설명 */
  assessmentReason: string;
  /** 추가 조정 필요 여부 */
  needsFurtherAdjustment: boolean;
}

/** 좌절 포인트 분석 */
export interface FrustrationPoint {
  /** 층 번호 */
  floor: number;
  /** 노드 유형 */
  nodeType: string;
  /** 좌절 유형 */
  frustationType: 'difficulty_spike' | 'resource_drain' | 'unfair_death' | 'progress_loss';
  /** 예상 좌절도 (1-10) */
  frustrationScore: number;
  /** 원인 */
  cause: string;
  /** 영향받는 플레이어 비율 추정 */
  affectedPlayerRate: number;
  /** 개선 제안 */
  suggestions: string[];
}

/** 플레이어 경험 예측 */
export interface PlayerExperiencePrediction {
  /** 전체 난이도 평가 */
  overallDifficulty: 'too_easy' | 'easy' | 'balanced' | 'hard' | 'too_hard';
  /** 난이도 점수 (1-10) */
  difficultyScore: number;
  /** 예상 신규 플레이어 이탈률 */
  newPlayerDropoutRate: number;
  /** 예상 숙련 플레이어 만족도 */
  veteranSatisfactionScore: number;
  /** 좌절 포인트 목록 */
  frustrationPoints: FrustrationPoint[];
  /** 긍정적 경험 포인트 */
  positiveExperiences: {
    floor: number;
    description: string;
    satisfactionBoost: number;
  }[];
  /** 층별 사망률 추세 (양수=상승, 음수=하락) */
  difficultyTrend: number;
  /** 추세 해석 */
  difficultyTrendInterpretation: 'increasing' | 'stable' | 'decreasing';
  /** 전체 평가 */
  overallAssessment: string;
  /** 개선 우선순위 */
  improvementPriorities: string[];
}

/** 성장 스탯 밸런스 분석 (에토스/파토스/로고스 시스템) */
export interface GrowthStatAnalysis {
  /** 스탯별 승률 기여도 */
  statContributions: {
    statName: string;
    avgInvestment: number;
    winCorrelation: number;
    /** 해당 스탯 집중 투자 시 승률 */
    focusedWinRate: number;
    /** 평가 */
    rating: 'overpowered' | 'balanced' | 'underpowered' | 'unused';
  }[];
  /** 에토스/파토스/로고스 밸런스 */
  philosophyBalance: {
    ethos: { avgLevel: number; winCorrelation: number };
    pathos: { avgLevel: number; winCorrelation: number };
    logos: { avgLevel: number; winCorrelation: number };
  };
  /** 필수 스탯 감지 */
  mustHaveStats: {
    statName: string;
    winRateWith: number;
    winRateWithout: number;
    contributionGap: number;
  }[];
  /** 스탯 다양성 */
  diversityScore: number;
  /** 권장사항 */
  recommendations: BalanceRecommendation[];
}

/** 카드 특성(Trait) 밸런스 분석 */
export interface CardTraitAnalysis {
  /** 특성별 통계 */
  traitStats: {
    traitId: string;
    traitName: string;
    /** 해당 특성 보유 카드 수 (픽된 것 기준) */
    cardCount: number;
    /** 해당 특성 카드 픽률 평균 */
    avgPickRate: number;
    /** 해당 특성 카드 승률 평균 */
    avgWinRate: number;
    /** 해당 특성 카드 기여도 평균 */
    avgContribution: number;
    /** 해당 특성 카드 전투당 사용 횟수 평균 */
    avgPlaysPerBattle: number;
    /** 평가 */
    rating: 'overpowered' | 'balanced' | 'underpowered' | 'unused';
  }[];
  /** 특성 시너지 분석 */
  traitSynergies: {
    trait1: string;
    trait2: string;
    /** 함께 픽된 횟수 */
    coOccurrences: number;
    /** 함께 있을 때 승률 */
    combinedWinRate: number;
    /** 시너지 효과 */
    synergyBonus: number;
  }[];
  /** 과잉 강화 특성 (너프 후보) */
  overpoweredTraits: {
    traitId: string;
    traitName: string;
    avgContribution: number;
    suggestion: string;
  }[];
  /** 약한 특성 (버프 후보) */
  underpoweredTraits: {
    traitId: string;
    traitName: string;
    avgContribution: number;
    suggestion: string;
  }[];
  /** 특성 다양성 */
  diversityScore: number;
  /** 권장사항 */
  recommendations: BalanceRecommendation[];
}

/** 성장 경로 분석 */
export interface GrowthPathAnalysis {
  /** 최적 경로 TOP 5 */
  optimalPaths: {
    path: string;
    count: number;
    winRate: number;
    avgFinalLevel: number;
    description: string;
  }[];
  /** 위험 경로 (승률 낮은) */
  riskyPaths: {
    path: string;
    count: number;
    winRate: number;
    issue: string;
    suggestion: string;
  }[];
  /** 경로 다양성 */
  pathDiversity: {
    uniquePaths: number;
    giniCoefficient: number;
    healthRating: 'healthy' | 'imbalanced' | 'critical';
  };
  /** 로고스 효과 활용도 */
  logosUsage: {
    effectName: string;
    activations: number;
    winRateWith: number;
    utilization: number; // 0-1, 얼마나 효과적으로 활용되는지
  }[];
}

/** 승급 밸런스 분석 */
export interface UpgradeBalanceAnalysis {
  /** 총 승급 통계 */
  overall: {
    totalUpgrades: number;
    avgUpgradesPerRun: number;
    upgradeWinCorrelation: number;
    optimalUpgradeCount: number;
  };
  /** 카드별 승급 효율 */
  cardUpgradeEfficiency: {
    cardId: string;
    cardName: string;
    upgradeCount: number;
    /** 승급 후 승률 변화 */
    winRateBoost: number;
    /** 승급 우선순위 (1=최우선) */
    priorityRank: number;
    /** 평가 */
    rating: 'must_upgrade' | 'high_value' | 'moderate' | 'low_value' | 'waste';
  }[];
  /** 과다 승급 카드 (가치 대비 많이 승급) */
  overUpgraded: {
    cardId: string;
    cardName: string;
    upgradeCount: number;
    actualValue: number;
    suggestion: string;
  }[];
  /** 과소 승급 카드 (가치 대비 적게 승급) */
  underUpgraded: {
    cardId: string;
    cardName: string;
    upgradeCount: number;
    potentialValue: number;
    suggestion: string;
  }[];
  /** 승급 우선순위 권장 */
  priorityRecommendations: {
    rank: number;
    cardName: string;
    reason: string;
    expectedImpact: number;
  }[];
}

/** 밸런스 인사이트 전체 리포트 */
export interface BalanceInsightReport {
  /** 생성 시간 */
  generatedAt: Date;
  /** 분석 기반 런 수 */
  totalRuns: number;
  /** 전체 승률 */
  overallWinRate: number;
  /** 액션 가능한 권장사항 */
  recommendations: BalanceRecommendation[];
  /** 병목 구간 분석 */
  bottlenecks: BottleneckAnalysis[];
  /** 필수픽 감지 */
  mustPicks: MustPickDetection[];
  /** 다양성 지표 */
  diversity: DiversityMetrics;
  /** 플레이어 경험 예측 */
  playerExperience: PlayerExperiencePrediction;
  /** 카드 특성 밸런스 분석 */
  cardTraitAnalysis: CardTraitAnalysis;
  /** 성장 스탯 밸런스 분석 */
  growthStatAnalysis: GrowthStatAnalysis;
  /** 성장 경로 분석 */
  growthPaths: GrowthPathAnalysis;
  /** 승급 밸런스 분석 */
  upgradeBalance: UpgradeBalanceAnalysis;
  /** 요약 */
  summary: {
    criticalIssues: number;
    warningIssues: number;
    healthScore: number; // 0-100
    topPriorities: string[];
  };
}

// ==================== 분석기 클래스 ====================

export class BalanceInsightAnalyzer {
  private stats: DetailedStats;
  private minSampleSize = 10; // 최소 샘플 크기

  constructor(stats: DetailedStats) {
    this.stats = stats;
  }

  /**
   * 전체 인사이트 리포트 생성
   */
  generateReport(): BalanceInsightReport {
    const recommendations = this.generateRecommendations();
    const bottlenecks = this.analyzeBottlenecks();
    const mustPicks = this.detectMustPicks();
    const diversity = this.analyzeDiversity();
    const playerExperience = this.predictPlayerExperience(bottlenecks);
    const cardTraitAnalysis = this.analyzeCardTraits();
    const growthStatAnalysis = this.analyzeGrowthStatBalance();
    const growthPaths = this.analyzeGrowthPaths();
    const upgradeBalance = this.analyzeUpgradeBalance();

    // 카드 특성/성장/승급 분석에서 나온 권장사항도 포함
    const allRecommendations = [
      ...recommendations,
      ...cardTraitAnalysis.recommendations,
      ...growthStatAnalysis.recommendations,
    ];

    const criticalIssues = allRecommendations.filter(r => r.priority === 'critical').length;
    const warningIssues = allRecommendations.filter(r => r.priority === 'warning').length;
    const healthScore = this.calculateHealthScore(allRecommendations, diversity, bottlenecks);

    const topPriorities = allRecommendations
      .filter(r => r.priority === 'critical' || r.priority === 'warning')
      .slice(0, 5)
      .map(r => `${r.targetName}: ${r.issue}`);

    return {
      generatedAt: new Date(),
      totalRuns: this.stats.runStats.totalRuns,
      overallWinRate: this.stats.runStats.successRate,
      recommendations: allRecommendations,
      bottlenecks,
      mustPicks,
      diversity,
      playerExperience,
      cardTraitAnalysis,
      growthStatAnalysis,
      growthPaths,
      upgradeBalance,
      summary: {
        criticalIssues,
        warningIssues,
        healthScore,
        topPriorities,
      },
    };
  }

  /**
   * 액션 가능한 밸런스 권장사항 생성
   */
  generateRecommendations(): BalanceRecommendation[] {
    const recommendations: BalanceRecommendation[] = [];

    // 카드 분석
    recommendations.push(...this.analyzeCardBalance());

    // 상징 분석
    recommendations.push(...this.analyzeRelicBalance());

    // 적 분석
    recommendations.push(...this.analyzeEnemyBalance());

    // Simpson's Paradox 감지
    recommendations.push(...this.detectSimpsonParadoxIssues());

    // 우선순위 순으로 정렬
    const priorityOrder: Record<BalancePriority, number> = {
      critical: 0,
      warning: 1,
      watch: 2,
      ok: 3,
    };

    return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  /**
   * 카드 밸런스 분석
   */
  private analyzeCardBalance(): BalanceRecommendation[] {
    const recommendations: BalanceRecommendation[] = [];
    const { cardPickStats, cardContributionStats, cardDeepStats } = this.stats;
    const avgWinRate = this.stats.runStats.successRate;

    for (const [cardId, deepStats] of cardDeepStats) {
      const pickRate = cardPickStats.pickRate[cardId] || 0;
      const timesOffered = cardPickStats.timesOffered[cardId] || 0;
      const contribution = cardContributionStats.contribution[cardId] || 0;
      const confidence = getConfidenceLevel(timesOffered).score;

      if (timesOffered < this.minSampleSize) continue;

      // OP 카드: 높은 픽률 + 높은 기여도
      if (pickRate > 0.7 && contribution > 0.15) {
        recommendations.push({
          targetId: cardId,
          targetName: deepStats.cardName,
          targetType: 'card',
          priority: contribution > 0.25 ? 'critical' : 'warning',
          issueType: 'overpowered',
          issue: `픽률 ${(pickRate * 100).toFixed(0)}%, 승률 기여도 +${(contribution * 100).toFixed(0)}%`,
          actionType: 'nerf',
          suggestion: this.generateNerfSuggestion(deepStats, contribution),
          metrics: {
            pickRate: `${(pickRate * 100).toFixed(1)}%`,
            contribution: `+${(contribution * 100).toFixed(1)}%`,
            winRateWith: `${(deepStats.winRateWith * 100).toFixed(1)}%`,
            winRateWithout: `${(deepStats.winRateWithout * 100).toFixed(1)}%`,
            avgDamage: deepStats.avgDamageDealt.toFixed(0),
          },
          confidence,
          estimatedImpact: -contribution * 0.3, // 30% 효과 감소 시 예상 영향
        });
      }

      // 약한 카드: 낮은 픽률 + 낮은 기여도
      if (pickRate < 0.15 && contribution < -0.05 && timesOffered >= 20) {
        recommendations.push({
          targetId: cardId,
          targetName: deepStats.cardName,
          targetType: 'card',
          priority: contribution < -0.15 ? 'warning' : 'watch',
          issueType: 'underpowered',
          issue: `픽률 ${(pickRate * 100).toFixed(0)}%, 승률 기여도 ${(contribution * 100).toFixed(0)}%`,
          actionType: 'buff',
          suggestion: this.generateBuffSuggestion(deepStats),
          metrics: {
            pickRate: `${(pickRate * 100).toFixed(1)}%`,
            contribution: `${(contribution * 100).toFixed(1)}%`,
            timesOffered,
          },
          confidence,
          estimatedImpact: Math.abs(contribution) * 0.5,
        });
      }

      // 함정 카드: 높은 픽률 + 낮은 기여도 (플레이어가 속는 카드)
      if (pickRate > 0.4 && contribution < -0.1) {
        recommendations.push({
          targetId: cardId,
          targetName: deepStats.cardName,
          targetType: 'card',
          priority: 'warning',
          issueType: 'trap_card',
          issue: `높은 픽률(${(pickRate * 100).toFixed(0)}%)이지만 승률에 부정적(${(contribution * 100).toFixed(0)}%)`,
          actionType: 'rework',
          suggestion: '카드 효과가 실제보다 강해 보임. 효과 명확화 또는 실제 강화 필요',
          metrics: {
            pickRate: `${(pickRate * 100).toFixed(1)}%`,
            contribution: `${(contribution * 100).toFixed(1)}%`,
            avgPlaysPerBattle: deepStats.avgPlaysPerBattle.toFixed(2),
          },
          confidence,
        });
      }

      // 히든 젬: 낮은 픽률 + 높은 기여도
      if (pickRate < 0.2 && contribution > 0.1 && timesOffered >= 15) {
        recommendations.push({
          targetId: cardId,
          targetName: deepStats.cardName,
          targetType: 'card',
          priority: 'watch',
          issueType: 'hidden_gem',
          issue: `저평가됨: 픽률 ${(pickRate * 100).toFixed(0)}%이지만 기여도 +${(contribution * 100).toFixed(0)}%`,
          actionType: 'adjust_availability',
          suggestion: '카드 효과가 과소평가됨. 획득 기회 증가 또는 효과 시각화 개선 고려',
          metrics: {
            pickRate: `${(pickRate * 100).toFixed(1)}%`,
            contribution: `+${(contribution * 100).toFixed(1)}%`,
          },
          confidence,
        });
      }
    }

    return recommendations;
  }

  /**
   * 상징 밸런스 분석
   */
  private analyzeRelicBalance(): BalanceRecommendation[] {
    const recommendations: BalanceRecommendation[] = [];
    const { relicStats } = this.stats;

    for (const [relicId, stats] of relicStats) {
      const confidence = getConfidenceLevel(stats.timesAcquired).score;
      if (stats.timesAcquired < this.minSampleSize) continue;

      // OP 상징
      if (stats.contribution > 0.2) {
        recommendations.push({
          targetId: relicId,
          targetName: stats.relicName,
          targetType: 'relic',
          priority: stats.contribution > 0.35 ? 'critical' : 'warning',
          issueType: 'overpowered_relic',
          issue: `보유 시 승률 +${(stats.contribution * 100).toFixed(0)}%`,
          actionType: 'nerf',
          suggestion: this.generateRelicNerfSuggestion(stats),
          metrics: {
            winRateWith: `${(stats.winRateWith * 100).toFixed(1)}%`,
            winRateWithout: `${(stats.winRateWithout * 100).toFixed(1)}%`,
            contribution: `+${(stats.contribution * 100).toFixed(1)}%`,
            effectTriggers: stats.effectTriggers,
          },
          confidence,
          estimatedImpact: -stats.contribution * 0.3,
        });
      }

      // 약한 상징
      if (stats.contribution < -0.1 && stats.timesAcquired >= 15) {
        recommendations.push({
          targetId: relicId,
          targetName: stats.relicName,
          targetType: 'relic',
          priority: stats.contribution < -0.2 ? 'warning' : 'watch',
          issueType: 'underpowered_relic',
          issue: `보유 시 승률 ${(stats.contribution * 100).toFixed(0)}%`,
          actionType: 'buff',
          suggestion: '효과 강화 또는 발동 조건 완화 고려',
          metrics: {
            winRateWith: `${(stats.winRateWith * 100).toFixed(1)}%`,
            winRateWithout: `${(stats.winRateWithout * 100).toFixed(1)}%`,
            contribution: `${(stats.contribution * 100).toFixed(1)}%`,
          },
          confidence,
        });
      }
    }

    return recommendations;
  }

  /**
   * 적 밸런스 분석
   */
  private analyzeEnemyBalance(): BalanceRecommendation[] {
    const recommendations: BalanceRecommendation[] = [];
    const { monsterStats, deathStats } = this.stats;

    for (const [monsterId, stats] of monsterStats) {
      const confidence = getConfidenceLevel(stats.battles).score;
      if (stats.battles < this.minSampleSize) continue;

      // 너무 어려운 적
      if (stats.winRate < 0.5) {
        // 이 적으로 인한 사망 비율 계산
        const deathsFromThis = deathStats.deathsByEnemy[monsterId] || 0;
        const deathContribution = deathsFromThis / Math.max(1, deathStats.totalDeaths);

        recommendations.push({
          targetId: monsterId,
          targetName: stats.monsterName,
          targetType: 'enemy',
          priority: stats.winRate < 0.3 ? 'critical' : 'warning',
          issueType: 'too_difficult',
          issue: `승률 ${(stats.winRate * 100).toFixed(0)}%, 전체 사망의 ${(deathContribution * 100).toFixed(0)}% 유발`,
          actionType: 'nerf',
          suggestion: `HP ${Math.round((1 - stats.winRate) * 20)}% 감소 또는 공격력 조정 고려`,
          metrics: {
            winRate: `${(stats.winRate * 100).toFixed(1)}%`,
            avgDamageTaken: stats.avgDamageTaken.toFixed(0),
            avgTurns: stats.avgTurns.toFixed(1),
            deathContribution: `${(deathContribution * 100).toFixed(1)}%`,
          },
          confidence,
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
          issue: `승률 ${(stats.winRate * 100).toFixed(0)}% (너무 쉬움)`,
          actionType: 'buff',
          suggestion: 'HP 또는 공격력 소폭 증가 고려',
          metrics: {
            winRate: `${(stats.winRate * 100).toFixed(1)}%`,
            avgTurns: stats.avgTurns.toFixed(1),
            avgDamageTaken: stats.avgDamageTaken.toFixed(0),
          },
          confidence,
        });
      }
    }

    return recommendations;
  }

  /**
   * Simpson's Paradox 감지
   * 전체 통계와 하위 그룹 통계가 상반된 결론을 도출하는 경우를 감지
   */
  private detectSimpsonParadoxIssues(): BalanceRecommendation[] {
    const recommendations: BalanceRecommendation[] = [];
    const { monsterStats, runStats } = this.stats;

    // 적별 승률 수집
    const monsterWinRates: number[] = [];
    const significantMonsters: Array<{ name: string; winRate: number; battles: number }> = [];

    for (const [, stats] of monsterStats) {
      if (stats.battles >= this.minSampleSize) {
        monsterWinRates.push(stats.winRate);
        significantMonsters.push({
          name: stats.monsterName,
          winRate: stats.winRate,
          battles: stats.battles,
        });
      }
    }

    if (monsterWinRates.length < 3) {
      return recommendations;
    }

    // 전체 런 승률과 개별 몬스터 승률의 관계 분석
    // 전체 런 승률을 기준점으로, 각 몬스터 승률이 그보다 높은지 낮은지 비교
    const overallWinRate = runStats.successRate;
    const avgMonsterWinRate =
      monsterWinRates.reduce((sum, wr) => sum + wr, 0) / monsterWinRates.length;

    // 전체 런 승률 - 평균 몬스터 승률 차이를 기준 상관계수로 사용
    const overallCorrelation = overallWinRate - avgMonsterWinRate;

    // 각 몬스터의 개별 기여도 (해당 몬스터 승률 - 평균 몬스터 승률)
    const subgroupCorrelations = monsterWinRates.map(wr => wr - avgMonsterWinRate);

    const paradoxResult = detectSimpsonParadox(overallCorrelation, subgroupCorrelations);

    if (paradoxResult.detected) {
      // 역설이 발생한 원인 분석
      const highWinRateMonsters = significantMonsters.filter(m => m.winRate > overallWinRate);
      const lowWinRateMonsters = significantMonsters.filter(m => m.winRate <= overallWinRate);

      let explanation = '';
      if (highWinRateMonsters.length > lowWinRateMonsters.length && overallWinRate < avgMonsterWinRate) {
        // 대부분의 몬스터에게 이기는데 전체 런 승률이 낮음
        const troubleMonsters = lowWinRateMonsters.slice(0, 3).map(m => m.name).join(', ');
        explanation = `대부분의 전투에서 승리하지만 ${troubleMonsters || '특정 적'}에서 집중적으로 패배하여 전체 런 승률이 낮습니다.`;
      } else if (lowWinRateMonsters.length > highWinRateMonsters.length && overallWinRate > avgMonsterWinRate) {
        // 대부분의 몬스터에게 지는데 전체 런 승률이 높음
        explanation = '대부분의 전투에서 어려움을 겪지만, 핵심 적에서 승리하여 전체 런 승률이 높습니다.';
      }

      recommendations.push({
        targetId: 'simpson_paradox',
        targetName: "Simpson's Paradox 감지",
        targetType: 'enemy',
        priority: 'warning',
        issueType: 'simpson_paradox',
        issue: '전체 런 승률과 개별 전투 승률의 불일치 감지',
        actionType: 'investigate',
        suggestion: explanation || paradoxResult.explanation || '층별/적별 분포 검토 필요',
        metrics: {
          overallRunWinRate: `${(overallWinRate * 100).toFixed(1)}%`,
          avgMonsterWinRate: `${(avgMonsterWinRate * 100).toFixed(1)}%`,
          monstersAboveAvg: highWinRateMonsters.length,
          monstersBelowAvg: lowWinRateMonsters.length,
        },
        confidence: getConfidenceLevel(runStats.totalRuns).score,
      });
    }

    return recommendations;
  }

  /**
   * 병목 구간 심층 분석
   */
  analyzeBottlenecks(): BottleneckAnalysis[] {
    const bottlenecks: BottleneckAnalysis[] = [];
    const { deathStats, floorProgressionAnalysis } = this.stats;
    const totalDeaths = deathStats.totalDeaths || 1;

    // 층별 사망 분석
    const floors = Object.keys(deathStats.deathsByFloor).map(Number).sort((a, b) => a - b);
    const avgDeathRate = 1 / Math.max(1, floors.length);

    for (const floor of floors) {
      const deaths = deathStats.deathsByFloor[floor] || 0;
      const deathRate = deaths / totalDeaths;
      const deathRateMultiplier = deathRate / avgDeathRate;

      // 평균의 2배 이상 사망률이면 병목
      if (deathRateMultiplier < 1.5) continue;

      // 해당 층 사망 원인 분석
      const deathsOnFloor = deathStats.recentDeaths.filter(d => d.floor === floor);
      const enemyCounts: Record<string, { count: number; name: string; avgHp: number }> = {};

      for (const death of deathsOnFloor) {
        if (!enemyCounts[death.enemyId]) {
          enemyCounts[death.enemyId] = { count: 0, name: death.enemyName, avgHp: 0 };
        }
        enemyCounts[death.enemyId].count++;
        enemyCounts[death.enemyId].avgHp += death.finalHp;
      }

      // 가장 많은 사망 유발 적
      let primaryCause = { enemyId: 'unknown', enemyName: '알 수 없음', deathContribution: 0 };
      let maxDeaths = 0;
      for (const [enemyId, data] of Object.entries(enemyCounts)) {
        if (data.count > maxDeaths) {
          maxDeaths = data.count;
          primaryCause = {
            enemyId,
            enemyName: data.name,
            deathContribution: data.count / Math.max(1, deathsOnFloor.length),
          };
        }
      }

      // 평균 HP 계산
      const avgHpAtDeath = deathsOnFloor.reduce((sum, d) => sum + d.finalHp, 0) / Math.max(1, deathsOnFloor.length);
      const avgHpRatioAtDeath = deathsOnFloor.length > 0
        ? deathsOnFloor.reduce((sum, d) => {
            const maxHp = d.hpHistory[0] || 80;
            return sum + (d.finalHp / maxHp);
          }, 0) / deathsOnFloor.length
        : 0;

      // 원인 분석
      let causeAnalysis = '';
      const suggestions: string[] = [];

      if (avgHpRatioAtDeath < 0.3) {
        causeAnalysis = '이전 층에서 이미 HP가 낮은 상태로 진입';
        suggestions.push(`${floor - 1}~${floor - 2}층 휴식 노드 확률 증가`);
        suggestions.push('해당 구간 적 공격력 감소');
      } else if (primaryCause.deathContribution > 0.5) {
        causeAnalysis = `${primaryCause.enemyName}이(가) 주요 사망 원인`;
        suggestions.push(`${primaryCause.enemyName} HP 또는 공격력 조정`);
        suggestions.push(`${primaryCause.enemyName} 등장 확률 감소`);
      } else {
        causeAnalysis = '복합적인 원인으로 사망률 증가';
        suggestions.push('해당 층 전반적인 난이도 조정');
      }

      const severity: BottleneckAnalysis['severity'] =
        deathRateMultiplier > 3 ? 'critical' :
        deathRateMultiplier > 2.5 ? 'high' :
        deathRateMultiplier > 2 ? 'medium' : 'low';

      bottlenecks.push({
        floor,
        deathRate,
        deathRateMultiplier,
        primaryCause,
        avgHpAtDeath,
        avgHpRatioAtDeath,
        causeAnalysis,
        suggestions,
        severity,
      });
    }

    return bottlenecks.sort((a, b) => b.deathRateMultiplier - a.deathRateMultiplier);
  }

  /**
   * 필수픽 감지
   */
  detectMustPicks(): MustPickDetection[] {
    const mustPicks: MustPickDetection[] = [];
    const { cardContributionStats, cardDeepStats, relicStats } = this.stats;

    // 카드 필수픽 감지
    for (const [cardId, deepStats] of cardDeepStats) {
      const contribution = cardContributionStats.contribution[cardId] || 0;
      const runsWithCard = cardContributionStats.runsWithCard[cardId] || 0;

      if (runsWithCard < this.minSampleSize) continue;

      // 기여도 차이가 25% 이상이면 필수픽
      if (contribution > 0.25) {
        const riskLevel: MustPickDetection['riskLevel'] =
          contribution > 0.4 ? 'extreme' :
          contribution > 0.3 ? 'high' : 'moderate';

        mustPicks.push({
          targetId: cardId,
          targetName: deepStats.cardName,
          targetType: 'card',
          winRateWith: deepStats.winRateWith,
          winRateWithout: deepStats.winRateWithout,
          contributionGap: contribution,
          acquisitionRate: runsWithCard / Math.max(1, this.stats.runStats.totalRuns),
          riskLevel,
          issue: `이 카드 없이는 승률이 ${(contribution * 100).toFixed(0)}% 감소`,
          suggestions: [
            `${deepStats.cardName} 효과 약화 (${Math.round(contribution * 100 * 0.3)}% 감소 권장)`,
            '유사 효과 카드 추가로 분산',
            '해당 카드 없이도 승리 가능한 전략 경로 강화',
          ],
        });
      }
    }

    // 상징 필수픽 감지
    for (const [relicId, stats] of relicStats) {
      if (stats.timesAcquired < this.minSampleSize) continue;

      if (stats.contribution > 0.25) {
        const riskLevel: MustPickDetection['riskLevel'] =
          stats.contribution > 0.4 ? 'extreme' :
          stats.contribution > 0.3 ? 'high' : 'moderate';

        mustPicks.push({
          targetId: relicId,
          targetName: stats.relicName,
          targetType: 'relic',
          winRateWith: stats.winRateWith,
          winRateWithout: stats.winRateWithout,
          contributionGap: stats.contribution,
          acquisitionRate: stats.timesAcquired / Math.max(1, this.stats.runStats.totalRuns),
          riskLevel,
          issue: `이 상징 없이는 승률이 ${(stats.contribution * 100).toFixed(0)}% 감소`,
          suggestions: [
            `${stats.relicName} 효과 약화`,
            '유사 효과 상징 추가',
            '해당 상징 획득 기회 증가로 접근성 개선',
          ],
        });
      }
    }

    return mustPicks.sort((a, b) => b.contributionGap - a.contributionGap);
  }

  /**
   * 다양성 지표 분석
   */
  analyzeDiversity(): DiversityMetrics {
    return {
      card: this.analyzeCardDiversity(),
      relic: this.analyzeRelicDiversity(),
      strategy: this.analyzeStrategyDiversity(),
    };
  }

  /**
   * 카드 다양성 분석
   */
  private analyzeCardDiversity(): DiversityMetrics['card'] {
    const { cardPickStats, cardContributionStats, cardDeepStats } = this.stats;
    const pickRates: number[] = [];
    const cardTiers: Map<string, { cardId: string; cardName: string; pickRate: number; contribution: number }[]> = new Map();

    // 티어 초기화
    cardTiers.set('S', []);
    cardTiers.set('A', []);
    cardTiers.set('B', []);
    cardTiers.set('C', []);
    cardTiers.set('F', []);

    let unusedCount = 0;

    for (const [cardId, deepStats] of cardDeepStats) {
      const pickRate = cardPickStats.pickRate[cardId] || 0;
      const contribution = cardContributionStats.contribution[cardId] || 0;
      const timesOffered = cardPickStats.timesOffered[cardId] || 0;

      if (timesOffered < 5) continue;

      pickRates.push(pickRate);

      if (pickRate === 0) {
        unusedCount++;
      }

      // 티어 분류
      const tier = this.classifyCardTier(pickRate, contribution);
      cardTiers.get(tier)?.push({
        cardId,
        cardName: deepStats.cardName,
        pickRate,
        contribution,
      });
    }

    const giniCoefficient = calculateGiniUtil(pickRates);
    const top10PercentShare = calculateTopConcentration(pickRates, 0.1);

    const healthRating: 'healthy' | 'imbalanced' | 'critical' =
      giniCoefficient < 0.4 ? 'healthy' :
      giniCoefficient < 0.6 ? 'imbalanced' : 'critical';

    const tierDistribution = Array.from(cardTiers.entries()).map(([tier, cards]) => ({
      tier,
      cards: cards.map(c => c.cardName),
      avgPickRate: cards.length > 0 ? cards.reduce((sum, c) => sum + c.pickRate, 0) / cards.length : 0,
      avgWinContribution: cards.length > 0 ? cards.reduce((sum, c) => sum + c.contribution, 0) / cards.length : 0,
    }));

    return {
      giniCoefficient,
      top10PercentShare,
      unusedCount,
      unusedRate: unusedCount / Math.max(1, pickRates.length),
      healthRating,
      tierDistribution,
    };
  }

  /**
   * 상징 다양성 분석
   */
  private analyzeRelicDiversity(): DiversityMetrics['relic'] {
    const { relicStats } = this.stats;
    const acquisitionRates: number[] = [];
    let unusedCount = 0;

    for (const [, stats] of relicStats) {
      const rate = stats.timesAcquired / Math.max(1, this.stats.runStats.totalRuns);
      acquisitionRates.push(rate);
      if (rate === 0) unusedCount++;
    }

    const giniCoefficient = calculateGiniUtil(acquisitionRates);
    const top10PercentShare = calculateTopConcentration(acquisitionRates, 0.1);

    const healthRating: 'healthy' | 'imbalanced' | 'critical' =
      giniCoefficient < 0.4 ? 'healthy' :
      giniCoefficient < 0.6 ? 'imbalanced' : 'critical';

    return {
      giniCoefficient,
      top10PercentShare: top10Sum / totalSum,
      unusedCount,
      unusedRate: unusedCount / Math.max(1, acquisitionRates.length),
      healthRating,
    };
  }

  /**
   * 전략 다양성 분석
   */
  private analyzeStrategyDiversity(): DiversityMetrics['strategy'] {
    const { runStats } = this.stats;
    const strategyWinRates = runStats.strategyWinRates || {};
    const strategies = Object.keys(strategyWinRates);

    if (strategies.length === 0) {
      return {
        dominantStrategy: null,
        dominantStrategyShare: 0,
        strategyCount: 0,
        healthRating: 'healthy',
      };
    }

    // 가장 많이 사용된 전략 찾기 (aiStrategyStats 활용)
    const { aiStrategyStats } = this.stats;
    const strategyUsage = aiStrategyStats.strategyUsage || {};
    const totalUsage = Object.values(strategyUsage).reduce((a, b) => a + b, 0) || 1;

    let dominantStrategy: string | null = null;
    let maxUsage = 0;

    for (const [strategy, usage] of Object.entries(strategyUsage)) {
      if (usage > maxUsage) {
        maxUsage = usage;
        dominantStrategy = strategy;
      }
    }

    const dominantStrategyShare = maxUsage / totalUsage;
    const healthRating: 'healthy' | 'imbalanced' | 'critical' =
      dominantStrategyShare < 0.4 ? 'healthy' :
      dominantStrategyShare < 0.6 ? 'imbalanced' : 'critical';

    return {
      dominantStrategy,
      dominantStrategyShare,
      strategyCount: strategies.length,
      healthRating,
    };
  }

  /**
   * 플레이어 경험 예측
   */
  predictPlayerExperience(bottlenecks: BottleneckAnalysis[]): PlayerExperiencePrediction {
    const { runStats, deathStats } = this.stats;
    const winRate = runStats.successRate;

    // 난이도 점수 계산 (1-10)
    const difficultyScore = Math.max(1, Math.min(10, Math.round((1 - winRate) * 12)));

    // 난이도 평가
    const overallDifficulty: PlayerExperiencePrediction['overallDifficulty'] =
      winRate > 0.7 ? 'too_easy' :
      winRate > 0.55 ? 'easy' :
      winRate > 0.4 ? 'balanced' :
      winRate > 0.25 ? 'hard' : 'too_hard';

    // 좌절 포인트 분석
    const frustrationPoints: FrustrationPoint[] = [];

    for (const bottleneck of bottlenecks) {
      if (bottleneck.severity === 'critical' || bottleneck.severity === 'high') {
        frustrationPoints.push({
          floor: bottleneck.floor,
          nodeType: 'battle',
          frustationType: 'difficulty_spike',
          frustrationScore: Math.min(10, Math.round(bottleneck.deathRateMultiplier * 3)),
          cause: bottleneck.causeAnalysis,
          affectedPlayerRate: bottleneck.deathRate,
          suggestions: bottleneck.suggestions,
        });
      }
    }

    // 조기 사망 분석 (좌절 유발)
    const earlyDeaths = Object.entries(deathStats.deathsByFloor)
      .filter(([floor]) => parseInt(floor) <= 3)
      .reduce((sum, [, count]) => sum + count, 0);
    const earlyDeathRate = earlyDeaths / Math.max(1, deathStats.totalDeaths);

    if (earlyDeathRate > 0.3) {
      frustrationPoints.push({
        floor: 1,
        nodeType: 'early_game',
        frustationType: 'unfair_death',
        frustrationScore: Math.round(earlyDeathRate * 10),
        cause: '초반 사망률이 너무 높음 - 신규 플레이어 이탈 위험',
        affectedPlayerRate: earlyDeathRate,
        suggestions: [
          '초반 적 난이도 하향',
          '튜토리얼 힌트 추가',
          '초반 휴식/회복 기회 증가',
        ],
      });
    }

    // 신규 플레이어 이탈률 예측
    const newPlayerDropoutRate = Math.min(0.9, earlyDeathRate + (1 - winRate) * 0.3);

    // 숙련 플레이어 만족도
    const veteranSatisfactionScore = winRate > 0.7 ? 4 :
      winRate > 0.5 ? 7 :
      winRate > 0.3 ? 8 :
      winRate > 0.15 ? 6 : 3;

    // 긍정적 경험
    const positiveExperiences: PlayerExperiencePrediction['positiveExperiences'] = [];

    if (winRate > 0.3) {
      positiveExperiences.push({
        floor: Math.round(runStats.avgLayerReached),
        description: '적절한 진행감과 성장 체감',
        satisfactionBoost: 0.2,
      });
    }

    // 층별 사망률 추세 분석
    const floorDeathRates: number[] = [];
    const maxFloor = 11;
    for (let floor = 1; floor <= maxFloor; floor++) {
      const deaths = deathStats.deathsByFloor[floor] || 0;
      const deathRate = deaths / Math.max(1, deathStats.totalDeaths);
      floorDeathRates.push(deathRate);
    }
    const difficultyTrend = calculateTrend(floorDeathRates);
    const difficultyTrendInterpretation: PlayerExperiencePrediction['difficultyTrendInterpretation'] =
      difficultyTrend > 0.01 ? 'increasing' :
      difficultyTrend < -0.01 ? 'decreasing' : 'stable';

    // 전체 평가
    let overallAssessment = '';
    if (overallDifficulty === 'balanced') {
      overallAssessment = '전반적으로 균형 잡힌 난이도. 병목 구간 미세 조정으로 개선 가능.';
    } else if (overallDifficulty === 'too_hard' || overallDifficulty === 'hard') {
      overallAssessment = `난이도가 높음 (승률 ${(winRate * 100).toFixed(0)}%). 신규 플레이어 접근성 개선 필요.`;
    } else {
      overallAssessment = `난이도가 낮음 (승률 ${(winRate * 100).toFixed(0)}%). 숙련 플레이어 도전 요소 추가 고려.`;
    }

    // 추세 관련 평가 추가
    if (difficultyTrendInterpretation === 'increasing') {
      overallAssessment += ' 층이 높아질수록 사망률 증가 - 후반 난이도 스파이크 주의.';
    } else if (difficultyTrendInterpretation === 'decreasing') {
      overallAssessment += ' 층이 높아질수록 사망률 감소 - 후반 긴장감 부족 가능성.';
    }

    // 개선 우선순위
    const improvementPriorities: string[] = [];
    if (frustrationPoints.length > 0) {
      improvementPriorities.push(`${frustrationPoints[0].floor}층 병목 구간 완화`);
    }
    if (newPlayerDropoutRate > 0.5) {
      improvementPriorities.push('신규 플레이어 온보딩 개선');
    }
    if (overallDifficulty === 'too_easy') {
      improvementPriorities.push('고난이도 콘텐츠 추가');
    }
    if (difficultyTrendInterpretation === 'increasing') {
      improvementPriorities.push('후반부 난이도 곡선 완화');
    }

    return {
      overallDifficulty,
      difficultyScore,
      newPlayerDropoutRate,
      veteranSatisfactionScore,
      frustrationPoints,
      positiveExperiences,
      difficultyTrend,
      difficultyTrendInterpretation,
      overallAssessment,
      improvementPriorities,
    };
  }

  /**
   * 변경 전후 비교
   */
  comparePatch(
    beforeStats: DetailedStats,
    afterStats: DetailedStats,
    targetId: string,
    targetType: 'card' | 'relic' | 'enemy'
  ): PatchComparison | null {
    if (targetType === 'card') {
      const beforeDeep = beforeStats.cardDeepStats.get(targetId);
      const afterDeep = afterStats.cardDeepStats.get(targetId);

      if (!beforeDeep || !afterDeep) return null;

      const beforePick = beforeStats.cardPickStats.pickRate[targetId] || 0;
      const afterPick = afterStats.cardPickStats.pickRate[targetId] || 0;

      const changes = {
        pickRateChange: afterPick - beforePick,
        winRateChange: afterDeep.winRateWith - beforeDeep.winRateWith,
        damageChange: afterDeep.avgDamageDealt - beforeDeep.avgDamageDealt,
        usageChange: afterDeep.avgPlaysPerBattle - beforeDeep.avgPlaysPerBattle,
      };

      // 평가
      let assessment: PatchComparison['assessment'] = 'intended';
      let assessmentReason = '';
      let needsFurtherAdjustment = false;

      if (Math.abs(changes.pickRateChange) < 0.05 && Math.abs(changes.winRateChange) < 0.05) {
        assessment = 'no_effect';
        assessmentReason = '변경 효과가 미미함';
        needsFurtherAdjustment = true;
      } else if (changes.winRateChange < -0.15) {
        assessment = 'over_nerf';
        assessmentReason = '너프가 과도함';
        needsFurtherAdjustment = true;
      } else if (changes.winRateChange > 0.15) {
        assessment = 'over_buff';
        assessmentReason = '버프가 과도함';
        needsFurtherAdjustment = true;
      }

      return {
        targetId,
        targetName: beforeDeep.cardName,
        before: {
          sampleSize: beforeDeep.timesOffered,
          pickRate: beforePick,
          winRateWith: beforeDeep.winRateWith,
          avgDamage: beforeDeep.avgDamageDealt,
          avgUsage: beforeDeep.avgPlaysPerBattle,
        },
        after: {
          sampleSize: afterDeep.timesOffered,
          pickRate: afterPick,
          winRateWith: afterDeep.winRateWith,
          avgDamage: afterDeep.avgDamageDealt,
          avgUsage: afterDeep.avgPlaysPerBattle,
        },
        changes,
        assessment,
        assessmentReason,
        needsFurtherAdjustment,
      };
    }

    return null;
  }

  // ==================== 헬퍼 메서드 ====================

  /**
   * 카드 티어 분류
   */
  private classifyCardTier(pickRate: number, contribution: number): string {
    if (pickRate > 0.6 && contribution > 0.15) return 'S';
    if (pickRate > 0.4 && contribution > 0.05) return 'A';
    if (pickRate > 0.2 && contribution > -0.05) return 'B';
    if (pickRate > 0.05) return 'C';
    return 'F';
  }

  /**
   * 건강도 점수 계산
   */
  private calculateHealthScore(
    recommendations: BalanceRecommendation[],
    diversity: DiversityMetrics,
    bottlenecks: BottleneckAnalysis[]
  ): number {
    let score = 100;

    // 권장사항에 따른 감점
    score -= recommendations.filter(r => r.priority === 'critical').length * 15;
    score -= recommendations.filter(r => r.priority === 'warning').length * 5;

    // 다양성에 따른 감점
    if (diversity.card.healthRating === 'critical') score -= 20;
    else if (diversity.card.healthRating === 'imbalanced') score -= 10;

    // 병목에 따른 감점
    score -= bottlenecks.filter(b => b.severity === 'critical').length * 10;
    score -= bottlenecks.filter(b => b.severity === 'high').length * 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 너프 제안 생성
   */
  private generateNerfSuggestion(deepStats: CardDeepStats, contribution: number): string {
    const nerfPercent = Math.round(contribution * 100 * 0.3);

    if (deepStats.avgDamageDealt > 20) {
      return `피해량 ${nerfPercent}% 감소 (${deepStats.avgDamageDealt.toFixed(0)} → ${(deepStats.avgDamageDealt * (1 - nerfPercent / 100)).toFixed(0)})`;
    }
    return `효과 ${nerfPercent}% 감소 또는 코스트 1 증가`;
  }

  /**
   * 버프 제안 생성
   */
  private generateBuffSuggestion(deepStats: CardDeepStats): string {
    if (deepStats.avgDamageDealt < 10) {
      return '피해량 20-30% 증가 또는 추가 효과 부여';
    }
    if (deepStats.avgPlaysPerBattle < 0.5) {
      return '코스트 1 감소 또는 사용 조건 완화';
    }
    return '효과 강화 또는 시너지 추가';
  }

  /**
   * 상징 너프 제안 생성
   */
  private generateRelicNerfSuggestion(stats: RelicStats): string {
    if (stats.avgEffectValue > 10) {
      return `효과 발동 가치 20-30% 감소 (현재 평균 ${stats.avgEffectValue.toFixed(1)})`;
    }
    return '효과 약화 또는 발동 조건 강화';
  }

  /**
   * 마크다운 리포트 생성
   */
  generateMarkdownReport(): string {
    const report = this.generateReport();
    const lines: string[] = [];

    lines.push('# 밸런스 인사이트 리포트');
    lines.push('');
    lines.push(`> 생성: ${report.generatedAt.toLocaleString('ko-KR')}`);
    lines.push(`> 분석 런: ${report.totalRuns}회 | 승률: ${(report.overallWinRate * 100).toFixed(1)}%`);
    lines.push(`> 건강도 점수: ${report.summary.healthScore}/100`);
    lines.push('');

    // 요약
    lines.push('## 요약');
    lines.push(`- 🔴 긴급 이슈: ${report.summary.criticalIssues}개`);
    lines.push(`- 🟡 주의 이슈: ${report.summary.warningIssues}개`);
    lines.push('');

    if (report.summary.topPriorities.length > 0) {
      lines.push('### 최우선 과제');
      for (const priority of report.summary.topPriorities) {
        lines.push(`- ${priority}`);
      }
      lines.push('');
    }

    // 액션 가능한 권장사항
    const criticalRecs = report.recommendations.filter(r => r.priority === 'critical');
    const warningRecs = report.recommendations.filter(r => r.priority === 'warning');

    if (criticalRecs.length > 0) {
      lines.push('## 🔴 긴급 조치 필요');
      for (const rec of criticalRecs) {
        lines.push(`### ${rec.targetName} (${rec.targetType})`);
        lines.push(`- **문제**: ${rec.issue}`);
        lines.push(`- **유형**: ${rec.issueType}`);
        lines.push(`- **제안**: ${rec.suggestion}`);
        lines.push(`- **신뢰도**: ${(rec.confidence * 100).toFixed(0)}%`);
        if (rec.estimatedImpact) {
          lines.push(`- **예상 영향**: 승률 ${rec.estimatedImpact > 0 ? '+' : ''}${(rec.estimatedImpact * 100).toFixed(1)}%`);
        }
        lines.push('');
      }
    }

    if (warningRecs.length > 0) {
      lines.push('## 🟡 주의 필요');
      for (const rec of warningRecs.slice(0, 10)) {
        lines.push(`- **${rec.targetName}**: ${rec.issue} → ${rec.suggestion}`);
      }
      lines.push('');
    }

    // 필수픽 경고
    if (report.mustPicks.length > 0) {
      lines.push('## ⚠️ 필수픽 감지');
      for (const mp of report.mustPicks) {
        const icon = mp.riskLevel === 'extreme' ? '🔴' : mp.riskLevel === 'high' ? '🟠' : '🟡';
        lines.push(`### ${icon} ${mp.targetName} (${mp.targetType})`);
        lines.push(`- 보유 시 승률: ${(mp.winRateWith * 100).toFixed(1)}%`);
        lines.push(`- 미보유 시 승률: ${(mp.winRateWithout * 100).toFixed(1)}%`);
        lines.push(`- **기여도 차이: +${(mp.contributionGap * 100).toFixed(1)}%**`);
        lines.push(`- 제안:`);
        for (const s of mp.suggestions) {
          lines.push(`  - ${s}`);
        }
        lines.push('');
      }
    }

    // 병목 구간
    if (report.bottlenecks.length > 0) {
      lines.push('## 🚧 병목 구간');
      for (const bn of report.bottlenecks.slice(0, 5)) {
        const icon = bn.severity === 'critical' ? '🔴' : bn.severity === 'high' ? '🟠' : '🟡';
        lines.push(`### ${icon} ${bn.floor}층`);
        lines.push(`- 사망률: ${(bn.deathRate * 100).toFixed(1)}% (평균의 ${bn.deathRateMultiplier.toFixed(1)}배)`);
        lines.push(`- 주요 원인: ${bn.primaryCause.enemyName} (${(bn.primaryCause.deathContribution * 100).toFixed(0)}%)`);
        lines.push(`- 분석: ${bn.causeAnalysis}`);
        lines.push(`- 제안:`);
        for (const s of bn.suggestions) {
          lines.push(`  - ${s}`);
        }
        lines.push('');
      }
    }

    // 다양성 지표
    lines.push('## 📊 다양성 지표');
    lines.push('### 카드 다양성');
    const cardDiv = report.diversity.card;
    lines.push(`- Gini 계수: ${cardDiv.giniCoefficient.toFixed(3)} (${cardDiv.healthRating === 'healthy' ? '✅ 건강' : cardDiv.healthRating === 'imbalanced' ? '⚠️ 불균형' : '🔴 심각'})`);
    lines.push(`- 상위 10% 점유율: ${(cardDiv.top10PercentShare * 100).toFixed(1)}%`);
    lines.push(`- 미사용 카드: ${cardDiv.unusedCount}개 (${(cardDiv.unusedRate * 100).toFixed(1)}%)`);
    lines.push('');

    lines.push('### 메타 티어');
    for (const tier of cardDiv.tierDistribution) {
      if (tier.cards.length > 0) {
        lines.push(`- **Tier ${tier.tier}** (${tier.cards.length}장): ${tier.cards.slice(0, 5).join(', ')}${tier.cards.length > 5 ? '...' : ''}`);
      }
    }
    lines.push('');

    // 플레이어 경험
    lines.push('## 🎮 플레이어 경험 예측');
    const pe = report.playerExperience;
    lines.push(`- 난이도 평가: ${pe.overallDifficulty} (${pe.difficultyScore}/10)`);
    lines.push(`- 신규 플레이어 예상 이탈률: ${(pe.newPlayerDropoutRate * 100).toFixed(0)}%`);
    lines.push(`- 숙련 플레이어 만족도: ${pe.veteranSatisfactionScore}/10`);
    lines.push('');
    lines.push(`**평가**: ${pe.overallAssessment}`);
    lines.push('');

    if (pe.improvementPriorities.length > 0) {
      lines.push('### 개선 우선순위');
      for (const p of pe.improvementPriorities) {
        lines.push(`1. ${p}`);
      }
    }
    lines.push('');

    // 카드 특성 분석
    lines.push('## 🎴 카드 특성 밸런스');
    const ct = report.cardTraitAnalysis;
    if (ct.traitStats.length > 0) {
      lines.push('### 특성별 통계');
      for (const trait of ct.traitStats.slice(0, 10)) {
        const ratingIcon = trait.rating === 'overpowered' ? '🔴' :
                          trait.rating === 'underpowered' ? '🟡' :
                          trait.rating === 'unused' ? '⚪' : '🟢';
        lines.push(`- ${ratingIcon} **${trait.traitName}** (${trait.cardCount}장): 기여도 ${trait.avgContribution >= 0 ? '+' : ''}${(trait.avgContribution * 100).toFixed(1)}%, 픽률 ${(trait.avgPickRate * 100).toFixed(0)}%`);
      }
      lines.push(`- 특성 다양성: ${(ct.diversityScore * 100).toFixed(0)}%`);
      lines.push('');
    }

    if (ct.overpoweredTraits.length > 0) {
      lines.push('### ⚠️ 과잉 강화 특성');
      for (const trait of ct.overpoweredTraits) {
        lines.push(`- **${trait.traitName}**: +${(trait.avgContribution * 100).toFixed(0)}% → ${trait.suggestion}`);
      }
      lines.push('');
    }

    if (ct.underpoweredTraits.length > 0) {
      lines.push('### 📉 약한 특성');
      for (const trait of ct.underpoweredTraits) {
        lines.push(`- **${trait.traitName}**: ${(trait.avgContribution * 100).toFixed(0)}% → ${trait.suggestion}`);
      }
      lines.push('');
    }

    // 성장 스탯 분석
    lines.push('## 🧬 성장 스탯 밸런스');
    const gs = report.growthStatAnalysis;
    if (gs.statContributions.length > 0) {
      lines.push('### 스탯별 승률 기여도');
      for (const stat of gs.statContributions.slice(0, 8)) {
        const ratingIcon = stat.rating === 'overpowered' ? '🔴' :
                          stat.rating === 'underpowered' ? '🟡' :
                          stat.rating === 'unused' ? '⚪' : '🟢';
        lines.push(`- ${ratingIcon} **${stat.statName}**: ${stat.winCorrelation >= 0 ? '+' : ''}${(stat.winCorrelation * 100).toFixed(1)}% (투자 ${stat.avgInvestment.toFixed(1)}회)`);
      }
      lines.push(`- 다양성 점수: ${(gs.diversityScore * 100).toFixed(0)}%`);
      lines.push('');
    }
    lines.push('### 철학 분기 밸런스');
    lines.push(`- **에토스**: 평균 레벨 ${gs.philosophyBalance.ethos.avgLevel.toFixed(1)}, 승률 영향 ${gs.philosophyBalance.ethos.winCorrelation >= 0 ? '+' : ''}${(gs.philosophyBalance.ethos.winCorrelation * 100).toFixed(1)}%`);
    lines.push(`- **파토스**: 평균 레벨 ${gs.philosophyBalance.pathos.avgLevel.toFixed(1)}, 승률 영향 ${gs.philosophyBalance.pathos.winCorrelation >= 0 ? '+' : ''}${(gs.philosophyBalance.pathos.winCorrelation * 100).toFixed(1)}%`);
    lines.push(`- **로고스**: 평균 레벨 ${gs.philosophyBalance.logos.avgLevel.toFixed(1)}, 승률 영향 ${gs.philosophyBalance.logos.winCorrelation >= 0 ? '+' : ''}${(gs.philosophyBalance.logos.winCorrelation * 100).toFixed(1)}%`);
    lines.push('');

    if (gs.mustHaveStats.length > 0) {
      lines.push('### ⚠️ 필수 스탯 감지');
      for (const stat of gs.mustHaveStats) {
        lines.push(`- **${stat.statName}**: 기여도 차이 +${(stat.contributionGap * 100).toFixed(0)}%`);
      }
      lines.push('');
    }

    // 성장 경로 분석
    lines.push('## 🌱 성장 경로 분석');
    const gp = report.growthPaths;
    if (gp.optimalPaths.length > 0) {
      lines.push('### 최적 경로 TOP 5');
      for (const path of gp.optimalPaths) {
        lines.push(`- **${path.path}**: 승률 ${(path.winRate * 100).toFixed(0)}% (${path.count}회)`);
      }
      lines.push('');
    }
    if (gp.riskyPaths.length > 0) {
      lines.push('### 위험 경로');
      for (const path of gp.riskyPaths) {
        lines.push(`- **${path.path}**: 승률 ${(path.winRate * 100).toFixed(0)}% - ${path.issue}`);
      }
      lines.push('');
    }
    lines.push(`- 고유 경로 수: ${gp.pathDiversity.uniquePaths}개`);
    lines.push(`- Gini 계수: ${gp.pathDiversity.giniCoefficient.toFixed(3)} (${gp.pathDiversity.healthRating === 'healthy' ? '✅ 건강' : gp.pathDiversity.healthRating === 'imbalanced' ? '⚠️ 불균형' : '🔴 심각'})`);
    lines.push('');

    // 승급 밸런스
    lines.push('## ⬆️ 승급 밸런스');
    const ub = report.upgradeBalance;
    lines.push(`- 총 승급: ${ub.overall.totalUpgrades}회`);
    lines.push(`- 런당 평균: ${ub.overall.avgUpgradesPerRun.toFixed(1)}회`);
    lines.push(`- 승률 상관: ${ub.overall.upgradeWinCorrelation >= 0 ? '+' : ''}${(ub.overall.upgradeWinCorrelation * 100).toFixed(0)}%`);
    lines.push(`- 권장 승급 횟수: ${ub.overall.optimalUpgradeCount}회`);
    lines.push('');

    if (ub.priorityRecommendations.length > 0) {
      lines.push('### 승급 우선순위');
      for (const rec of ub.priorityRecommendations) {
        lines.push(`${rec.rank}. **${rec.cardName}**: ${rec.reason}`);
      }
      lines.push('');
    }

    if (ub.underUpgraded.length > 0) {
      lines.push('### 과소 승급 (기회손실)');
      for (const card of ub.underUpgraded.slice(0, 3)) {
        lines.push(`- **${card.cardName}**: ${card.suggestion}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  // ==================== 카드 특성/성장/승급 분석 ====================

  /**
   * 성장 스탯 밸런스 분석 (에토스/파토스/로고스 시스템)
   */
  analyzeGrowthStatBalance(): GrowthStatAnalysis {
    const { growthStats } = this.stats;
    const recommendations: BalanceRecommendation[] = [];
    const statContributions: GrowthStatAnalysis['statContributions'] = [];
    const mustHaveStats: GrowthStatAnalysis['mustHaveStats'] = [];

    // 스탯별 분석
    const allStats = Object.keys(growthStats.statInvestments);
    const totalInvestments = growthStats.totalInvestments || 1;
    const avgWinRate = this.stats.runStats.successRate;

    for (const statName of allStats) {
      const investment = growthStats.statInvestments[statName] || 0;
      const avgInvestment = investment / Math.max(1, this.stats.runStats.totalRuns);
      const winCorrelation = growthStats.statWinCorrelation[statName] || 0;

      // 해당 스탯 집중 투자 시 승률 추정 (상관관계 기반)
      const focusedWinRate = avgWinRate + (winCorrelation * 0.3);

      // 평가 결정
      let rating: 'overpowered' | 'balanced' | 'underpowered' | 'unused' = 'balanced';
      if (investment === 0) {
        rating = 'unused';
      } else if (winCorrelation > 0.2) {
        rating = 'overpowered';
      } else if (winCorrelation < -0.1) {
        rating = 'underpowered';
      }

      statContributions.push({
        statName,
        avgInvestment,
        winCorrelation,
        focusedWinRate: Math.max(0, Math.min(1, focusedWinRate)),
        rating,
      });

      // OP 스탯 권장사항
      if (rating === 'overpowered' && winCorrelation > 0.25) {
        recommendations.push({
          targetId: statName,
          targetName: statName,
          targetType: 'card', // 'trait'가 없으므로 card로 대체
          priority: winCorrelation > 0.35 ? 'critical' : 'warning',
          issueType: 'overpowered_trait',
          issue: `${statName} 스탯이 승률에 과도한 영향 (+${(winCorrelation * 100).toFixed(0)}%)`,
          actionType: 'nerf',
          suggestion: `${statName} 효과 20-30% 감소 또는 비용 증가 고려`,
          metrics: {
            avgInvestment: avgInvestment.toFixed(2),
            winCorrelation: `+${(winCorrelation * 100).toFixed(1)}%`,
          },
          confidence: getConfidenceLevel(investment).score,
        });

        mustHaveStats.push({
          statName,
          winRateWith: Math.min(1, avgWinRate + winCorrelation),
          winRateWithout: Math.max(0, avgWinRate - winCorrelation * 0.5),
          contributionGap: winCorrelation,
        });
      }

      // 약한 스탯 권장사항
      if (rating === 'underpowered' && winCorrelation < -0.15) {
        recommendations.push({
          targetId: statName,
          targetName: statName,
          targetType: 'card',
          priority: 'watch',
          issueType: 'underpowered_trait',
          issue: `${statName} 스탯 투자가 오히려 승률 감소 (${(winCorrelation * 100).toFixed(0)}%)`,
          actionType: 'buff',
          suggestion: `${statName} 효과 강화 또는 시너지 추가 고려`,
          metrics: {
            avgInvestment: avgInvestment.toFixed(2),
            winCorrelation: `${(winCorrelation * 100).toFixed(1)}%`,
          },
          confidence: getConfidenceLevel(investment).score,
        });
      }
    }

    // 에토스/파토스/로고스 밸런스
    const philosophyBalance = {
      ethos: this.analyzePhilosophyBranch(growthStats.ethosInvestments, growthStats.statWinCorrelation),
      pathos: this.analyzePhilosophyBranch(growthStats.pathosInvestments, growthStats.statWinCorrelation),
      logos: this.analyzePhilosophyBranch(growthStats.logosInvestments, growthStats.statWinCorrelation),
    };

    // 다양성 점수 계산
    const investmentRates = allStats.map(s => (growthStats.statInvestments[s] || 0) / totalInvestments);
    const diversityScore = calculateDiversityScore(investmentRates);

    return {
      statContributions: statContributions.sort((a, b) => b.winCorrelation - a.winCorrelation),
      philosophyBalance,
      mustHaveStats,
      diversityScore,
      recommendations,
    };
  }

  /**
   * 카드 특성(Trait) 밸런스 분석
   */
  analyzeCardTraits(): CardTraitAnalysis {
    const { cardDeepStats, cardContributionStats, cardPickStats, cardStats } = this.stats;
    const recommendations: BalanceRecommendation[] = [];

    // 특성별 카드 그룹화
    const traitCardMap: Map<string, {
      cardId: string;
      cardName: string;
      pickRate: number;
      winRate: number;
      contribution: number;
      playsPerBattle: number;
    }[]> = new Map();

    // 특성 이름 매핑 (한글)
    const traitNames: Record<string, string> = {
      advance: '전진',
      knockback: '밀어내기',
      crush: '분쇄',
      chain: '연쇄',
      cross: '교차',
      repeat: '반복',
      warmup: '몸풀기',
      exhaust: '탈진',
      vanish: '소멸',
      stubborn: '고집',
      last: '최후',
      robber: '강탈',
      ruin: '파탄',
      oblivion: '망각',
      outcast: '이단',
      general: '장군',
      followup: '추격',
      finisher: '마무리',
      multiTarget: '다중대상',
      stun: '기절',
      strongbone: '강골',
      weakbone: '약골',
      destroyer: '파괴자',
      slaughter: '학살',
      pinnacle: '절정',
      cooperation: '협동',
      swift: '신속',
      slow: '느림',
      mastery: '숙련',
      boredom: '권태',
      escape: '탈출',
      double_edge: '양날',
      training: '훈련',
      leisure: '여유',
      strain: '무리',
    };

    // 카드 데이터에서 특성 추출 (cardStats에서 traits 정보 확인)
    for (const [cardId, deepStats] of cardDeepStats) {
      const cardData = cardStats.get(cardId);
      const pickRate = cardPickStats.pickRate[cardId] || 0;
      const contribution = cardContributionStats.contribution[cardId] || 0;

      // cardStats에서 특성 정보 추출 시도
      // 특성 정보가 없으면 specialTriggers에서 추론
      const traits: string[] = [];
      if (cardData?.specialTriggers) {
        for (const trigger of Object.keys(cardData.specialTriggers)) {
          if (traitNames[trigger]) {
            traits.push(trigger);
          }
        }
      }

      // 특성별로 분류
      for (const trait of traits) {
        if (!traitCardMap.has(trait)) {
          traitCardMap.set(trait, []);
        }
        traitCardMap.get(trait)!.push({
          cardId,
          cardName: deepStats.cardName,
          pickRate,
          winRate: deepStats.winRateWith,
          contribution,
          playsPerBattle: deepStats.avgPlaysPerBattle,
        });
      }
    }

    // 특성별 통계 계산
    const traitStats: CardTraitAnalysis['traitStats'] = [];
    for (const [traitId, cards] of traitCardMap) {
      if (cards.length === 0) continue;

      const avgPickRate = cards.reduce((sum, c) => sum + c.pickRate, 0) / cards.length;
      const avgWinRate = cards.reduce((sum, c) => sum + c.winRate, 0) / cards.length;
      const avgContribution = cards.reduce((sum, c) => sum + c.contribution, 0) / cards.length;
      const avgPlaysPerBattle = cards.reduce((sum, c) => sum + c.playsPerBattle, 0) / cards.length;

      // 평가
      let rating: 'overpowered' | 'balanced' | 'underpowered' | 'unused' = 'balanced';
      if (avgContribution > 0.15) {
        rating = 'overpowered';
      } else if (avgContribution < -0.1) {
        rating = 'underpowered';
      } else if (avgPickRate < 0.1) {
        rating = 'unused';
      }

      traitStats.push({
        traitId,
        traitName: traitNames[traitId] || traitId,
        cardCount: cards.length,
        avgPickRate,
        avgWinRate,
        avgContribution,
        avgPlaysPerBattle,
        rating,
      });
    }

    // 정렬 (기여도 순)
    traitStats.sort((a, b) => b.avgContribution - a.avgContribution);

    // 과잉 강화 특성
    const overpoweredTraits = traitStats
      .filter(t => t.rating === 'overpowered')
      .map(t => ({
        traitId: t.traitId,
        traitName: t.traitName,
        avgContribution: t.avgContribution,
        suggestion: `${t.traitName} 특성 효과 20-30% 약화 또는 비용 증가 고려`,
      }));

    // 약한 특성
    const underpoweredTraits = traitStats
      .filter(t => t.rating === 'underpowered')
      .map(t => ({
        traitId: t.traitId,
        traitName: t.traitName,
        avgContribution: t.avgContribution,
        suggestion: `${t.traitName} 특성 효과 강화 또는 추가 시너지 부여 고려`,
      }));

    // 권장사항 생성
    for (const op of overpoweredTraits) {
      recommendations.push({
        targetId: op.traitId,
        targetName: op.traitName,
        targetType: 'card',
        priority: op.avgContribution > 0.25 ? 'critical' : 'warning',
        issueType: 'overpowered_trait',
        issue: `${op.traitName} 특성 카드들의 평균 기여도 +${(op.avgContribution * 100).toFixed(0)}%`,
        actionType: 'nerf',
        suggestion: op.suggestion,
        metrics: { avgContribution: `+${(op.avgContribution * 100).toFixed(1)}%` },
        confidence: 0.7,
      });
    }

    for (const up of underpoweredTraits) {
      recommendations.push({
        targetId: up.traitId,
        targetName: up.traitName,
        targetType: 'card',
        priority: 'watch',
        issueType: 'underpowered_trait',
        issue: `${up.traitName} 특성 카드들의 평균 기여도 ${(up.avgContribution * 100).toFixed(0)}%`,
        actionType: 'buff',
        suggestion: up.suggestion,
        metrics: { avgContribution: `${(up.avgContribution * 100).toFixed(1)}%` },
        confidence: 0.6,
      });
    }

    // 특성 시너지 분석
    const traitSynergies: CardTraitAnalysis['traitSynergies'] = [];
    const traitIds = Array.from(traitCardMap.keys());

    // 모든 특성 쌍에 대해 시너지 분석
    for (let i = 0; i < traitIds.length; i++) {
      for (let j = i + 1; j < traitIds.length; j++) {
        const trait1 = traitIds[i];
        const trait2 = traitIds[j];
        const cards1 = traitCardMap.get(trait1) || [];
        const cards2 = traitCardMap.get(trait2) || [];

        // 같은 카드가 두 특성 모두를 가지는 경우 (coOccurrence)
        const overlappingCards = cards1.filter(c1 =>
          cards2.some(c2 => c2.cardId === c1.cardId)
        );

        if (overlappingCards.length >= 2) {
          // 공통 카드들의 평균 승률
          const combinedWinRate = overlappingCards.reduce((sum, c) => sum + c.winRate, 0) / overlappingCards.length;

          // 개별 특성 평균 승률
          const trait1AvgWinRate = cards1.reduce((sum, c) => sum + c.winRate, 0) / cards1.length;
          const trait2AvgWinRate = cards2.reduce((sum, c) => sum + c.winRate, 0) / cards2.length;
          const expectedWinRate = (trait1AvgWinRate + trait2AvgWinRate) / 2;

          // 시너지 보너스 = 실제 - 예상
          const synergyBonus = combinedWinRate - expectedWinRate;

          // 의미있는 시너지만 추가 (|보너스| > 2%)
          if (Math.abs(synergyBonus) >= 0.02) {
            traitSynergies.push({
              trait1: traitNames[trait1] || trait1,
              trait2: traitNames[trait2] || trait2,
              coOccurrences: overlappingCards.length,
              combinedWinRate,
              synergyBonus,
            });
          }
        }
      }
    }

    // 시너지 보너스 순으로 정렬 (높은 순)
    traitSynergies.sort((a, b) => b.synergyBonus - a.synergyBonus);

    // 다양성 점수 (stats-utils 사용)
    const traitUsage = traitStats.map(t => t.cardCount);
    const diversityScore = calculateDiversityScore(traitUsage);

    return {
      traitStats,
      traitSynergies,
      overpoweredTraits,
      underpoweredTraits,
      diversityScore,
      recommendations,
    };
  }

  /**
   * 철학 분기 분석 헬퍼
   */
  private analyzePhilosophyBranch(
    investments: Record<string, number>,
    correlations: Record<string, number>
  ): { avgLevel: number; winCorrelation: number } {
    const keys = Object.keys(investments);
    if (keys.length === 0) {
      return { avgLevel: 0, winCorrelation: 0 };
    }

    const totalInvestment = Object.values(investments).reduce((a, b) => a + b, 0);
    const avgLevel = totalInvestment / Math.max(1, this.stats.runStats.totalRuns);

    // 해당 분기 스탯들의 평균 상관관계
    const relatedCorrelations = keys
      .map(k => correlations[k] || 0)
      .filter(c => c !== 0);
    const winCorrelation = relatedCorrelations.length > 0
      ? relatedCorrelations.reduce((a, b) => a + b, 0) / relatedCorrelations.length
      : 0;

    return { avgLevel, winCorrelation };
  }

  /**
   * 성장 경로 분석
   */
  analyzeGrowthPaths(): GrowthPathAnalysis {
    const { growthStats } = this.stats;
    const pathStats = growthStats.growthPathStats || [];

    // 최적 경로 (승률 높은 순)
    const sortedByWinRate = [...pathStats]
      .filter(p => p.count >= 5)
      .sort((a, b) => b.winRate - a.winRate);

    const optimalPaths = sortedByWinRate.slice(0, 5).map(p => ({
      path: p.path,
      count: p.count,
      winRate: p.winRate,
      avgFinalLevel: p.avgFinalLevel,
      description: this.describeGrowthPath(p.path, p.winRate),
    }));

    // 위험 경로 (승률 낮은 순)
    const riskyPaths = sortedByWinRate
      .slice(-5)
      .reverse()
      .filter(p => p.winRate < this.stats.runStats.successRate * 0.7)
      .map(p => ({
        path: p.path,
        count: p.count,
        winRate: p.winRate,
        issue: `평균 승률(${(this.stats.runStats.successRate * 100).toFixed(0)}%)보다 ${((this.stats.runStats.successRate - p.winRate) * 100).toFixed(0)}% 낮음`,
        suggestion: this.suggestPathImprovement(p.path),
      }));

    // 경로 다양성
    const pathCounts = pathStats.map(p => p.count);
    const uniquePaths = pathStats.length;
    const giniCoefficient = calculateGiniUtil(pathCounts);
    const healthRating: 'healthy' | 'imbalanced' | 'critical' =
      giniCoefficient < 0.4 ? 'healthy' :
      giniCoefficient < 0.6 ? 'imbalanced' : 'critical';

    // 로고스 효과 활용도
    const logosUsage = this.analyzeLogosUsage();

    return {
      optimalPaths,
      riskyPaths,
      pathDiversity: {
        uniquePaths,
        giniCoefficient,
        healthRating,
      },
      logosUsage,
    };
  }

  /**
   * 성장 경로 설명 생성
   */
  private describeGrowthPath(path: string, winRate: number): string {
    const parts = path.split('→');
    const firstFocus = parts[0] || '없음';

    if (winRate > 0.7) {
      return `${firstFocus} 우선 투자로 높은 승률 달성. 안정적인 경로.`;
    } else if (winRate > 0.5) {
      return `${firstFocus} 시작, 균형 잡힌 성장. 무난한 경로.`;
    } else {
      return `${firstFocus} 시작 경로. 개선 여지 있음.`;
    }
  }

  /**
   * 경로 개선 제안 생성
   */
  private suggestPathImprovement(path: string): string {
    const parts = path.split('→');
    if (parts.length < 2) {
      return '더 다양한 스탯에 투자 고려';
    }

    // 가장 성공적인 경로와 비교
    const { growthStats } = this.stats;
    const bestPath = (growthStats.growthPathStats || [])
      .filter(p => p.count >= 5)
      .sort((a, b) => b.winRate - a.winRate)[0];

    if (bestPath) {
      const bestParts = bestPath.path.split('→');
      return `${bestParts[0]} 우선 투자 경로가 더 효과적 (승률 +${((bestPath.winRate - this.stats.runStats.successRate) * 100).toFixed(0)}%)`;
    }

    return '초반 방어력/공격력 밸런스 조정 고려';
  }

  /**
   * 로고스 효과 활용도 분석
   */
  private analyzeLogosUsage(): GrowthPathAnalysis['logosUsage'] {
    const { growthStats } = this.stats;
    const logosActivations = growthStats.logosActivations || {};
    const result: GrowthPathAnalysis['logosUsage'] = [];

    for (const [effectName, activations] of Object.entries(logosActivations)) {
      // 활용도 계산 (전투당 평균 발동 횟수 기반)
      const avgBattles = this.stats.runStats.avgBattlesWon * this.stats.runStats.totalRuns;
      const utilization = Math.min(1, activations / Math.max(1, avgBattles) * 10);

      result.push({
        effectName,
        activations,
        winRateWith: this.stats.runStats.successRate, // 실제로는 더 정교한 계산 필요
        utilization,
      });
    }

    return result.sort((a, b) => b.activations - a.activations);
  }

  /**
   * 승급 밸런스 분석
   */
  analyzeUpgradeBalance(): UpgradeBalanceAnalysis {
    const { upgradeStats, shopServiceStats, cardDeepStats, cardContributionStats } = this.stats;
    const cardUpgradeEfficiency: UpgradeBalanceAnalysis['cardUpgradeEfficiency'] = [];
    const overUpgraded: UpgradeBalanceAnalysis['overUpgraded'] = [];
    const underUpgraded: UpgradeBalanceAnalysis['underUpgraded'] = [];

    // 전체 승급 통계
    const overall = {
      totalUpgrades: upgradeStats.totalUpgrades,
      avgUpgradesPerRun: upgradeStats.avgUpgradesPerRun,
      upgradeWinCorrelation: upgradeStats.upgradeWinCorrelation,
      optimalUpgradeCount: this.calculateOptimalUpgradeCount(),
    };

    // 카드별 승급 효율 분석
    const upgradedCards = { ...upgradeStats.upgradesByCard, ...shopServiceStats.upgradedCards };
    const cardEfficiencyMap: Map<string, { value: number; count: number }> = new Map();

    for (const [cardId, upgradeCount] of Object.entries(upgradedCards)) {
      if (upgradeCount === 0) continue;

      const deepStats = cardDeepStats.get(cardId);
      const contribution = cardContributionStats.contribution[cardId] || 0;

      if (!deepStats) continue;

      // 승급 효율 = 기여도 / 승급 횟수 (승급당 가치)
      const efficiency = contribution / Math.max(1, upgradeCount);
      cardEfficiencyMap.set(cardId, { value: efficiency, count: upgradeCount });

      // 승률 부스트 추정
      const winRateBoost = contribution * (upgradeCount > 0 ? 0.1 : 0);

      // 평가 결정
      let rating: 'must_upgrade' | 'high_value' | 'moderate' | 'low_value' | 'waste';
      if (contribution > 0.2) {
        rating = 'must_upgrade';
      } else if (contribution > 0.1) {
        rating = 'high_value';
      } else if (contribution > 0) {
        rating = 'moderate';
      } else if (contribution > -0.1) {
        rating = 'low_value';
      } else {
        rating = 'waste';
      }

      cardUpgradeEfficiency.push({
        cardId,
        cardName: deepStats.cardName,
        upgradeCount,
        winRateBoost,
        priorityRank: 0, // 나중에 정렬 후 설정
        rating,
      });
    }

    // 우선순위 순위 부여
    cardUpgradeEfficiency.sort((a, b) => b.winRateBoost - a.winRateBoost);
    cardUpgradeEfficiency.forEach((c, i) => { c.priorityRank = i + 1; });

    // 과다/과소 승급 분석
    const avgUpgradeCount = overall.avgUpgradesPerRun;
    const avgContribution = Object.values(cardContributionStats.contribution)
      .reduce((a, b) => a + b, 0) / Math.max(1, cardDeepStats.size);

    for (const card of cardUpgradeEfficiency) {
      const contribution = cardContributionStats.contribution[card.cardId] || 0;
      const expectedUpgrades = contribution > avgContribution && avgContribution > 0
        ? avgUpgradeCount * (contribution / avgContribution)
        : avgUpgradeCount * 0.5;

      if (card.upgradeCount > expectedUpgrades * 1.5 && contribution < 0.05) {
        overUpgraded.push({
          cardId: card.cardId,
          cardName: card.cardName,
          upgradeCount: card.upgradeCount,
          actualValue: contribution,
          suggestion: `${card.cardName} 승급 횟수 줄이고 다른 카드 승급 권장`,
        });
      }

      if (card.upgradeCount < expectedUpgrades * 0.5 && contribution > 0.15) {
        underUpgraded.push({
          cardId: card.cardId,
          cardName: card.cardName,
          upgradeCount: card.upgradeCount,
          potentialValue: contribution,
          suggestion: `${card.cardName} 우선 승급 권장 (기여도 +${(contribution * 100).toFixed(0)}%)`,
        });
      }
    }

    // 승급 우선순위 권장
    const priorityRecommendations = cardUpgradeEfficiency
      .filter(c => c.rating === 'must_upgrade' || c.rating === 'high_value')
      .slice(0, 5)
      .map((c, i) => ({
        rank: i + 1,
        cardName: c.cardName,
        reason: c.rating === 'must_upgrade'
          ? '필수 승급 대상 (높은 승률 기여)'
          : '높은 가치 (승급 효율 우수)',
        expectedImpact: c.winRateBoost,
      }));

    return {
      overall,
      cardUpgradeEfficiency: cardUpgradeEfficiency.slice(0, 20), // 상위 20개만
      overUpgraded,
      underUpgraded,
      priorityRecommendations,
    };
  }

  /**
   * 최적 승급 횟수 계산
   */
  private calculateOptimalUpgradeCount(): number {
    const { upgradeStats } = this.stats;
    // 승률과 승급 횟수의 상관관계가 양수면 더 많이 승급해야 함
    if (upgradeStats.upgradeWinCorrelation > 0.1) {
      return Math.ceil(upgradeStats.avgUpgradesPerRun * 1.3);
    } else if (upgradeStats.upgradeWinCorrelation < -0.1) {
      return Math.floor(upgradeStats.avgUpgradesPerRun * 0.7);
    }
    return Math.round(upgradeStats.avgUpgradesPerRun);
  }
}

// ==================== 헬퍼 함수 ====================

export function createBalanceInsightAnalyzer(stats: DetailedStats): BalanceInsightAnalyzer {
  return new BalanceInsightAnalyzer(stats);
}
