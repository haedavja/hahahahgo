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
  /** 전체 평가 */
  overallAssessment: string;
  /** 개선 우선순위 */
  improvementPriorities: string[];
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

    const criticalIssues = recommendations.filter(r => r.priority === 'critical').length;
    const warningIssues = recommendations.filter(r => r.priority === 'warning').length;
    const healthScore = this.calculateHealthScore(recommendations, diversity, bottlenecks);

    const topPriorities = recommendations
      .filter(r => r.priority === 'critical' || r.priority === 'warning')
      .slice(0, 5)
      .map(r => `${r.targetName}: ${r.issue}`);

    return {
      generatedAt: new Date(),
      totalRuns: this.stats.runStats.totalRuns,
      overallWinRate: this.stats.runStats.successRate,
      recommendations,
      bottlenecks,
      mustPicks,
      diversity,
      playerExperience,
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
      const confidence = this.calculateConfidence(timesOffered);

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
      const confidence = this.calculateConfidence(stats.timesAcquired);
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
      const confidence = this.calculateConfidence(stats.battles);
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
          acquisitionRate: runsWithCard / this.stats.runStats.totalRuns,
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
          acquisitionRate: stats.timesAcquired / this.stats.runStats.totalRuns,
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

    const giniCoefficient = this.calculateGini(pickRates);
    const sortedRates = [...pickRates].sort((a, b) => b - a);
    const top10Count = Math.ceil(pickRates.length * 0.1);
    const top10Sum = sortedRates.slice(0, top10Count).reduce((a, b) => a + b, 0);
    const totalSum = pickRates.reduce((a, b) => a + b, 0) || 1;
    const top10PercentShare = top10Sum / totalSum;

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

    const giniCoefficient = this.calculateGini(acquisitionRates);
    const sortedRates = [...acquisitionRates].sort((a, b) => b - a);
    const top10Count = Math.ceil(acquisitionRates.length * 0.1);
    const top10Sum = sortedRates.slice(0, top10Count).reduce((a, b) => a + b, 0);
    const totalSum = acquisitionRates.reduce((a, b) => a + b, 0) || 1;

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

    // 전체 평가
    let overallAssessment = '';
    if (overallDifficulty === 'balanced') {
      overallAssessment = '전반적으로 균형 잡힌 난이도. 병목 구간 미세 조정으로 개선 가능.';
    } else if (overallDifficulty === 'too_hard' || overallDifficulty === 'hard') {
      overallAssessment = `난이도가 높음 (승률 ${(winRate * 100).toFixed(0)}%). 신규 플레이어 접근성 개선 필요.`;
    } else {
      overallAssessment = `난이도가 낮음 (승률 ${(winRate * 100).toFixed(0)}%). 숙련 플레이어 도전 요소 추가 고려.`;
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

    return {
      overallDifficulty,
      difficultyScore,
      newPlayerDropoutRate,
      veteranSatisfactionScore,
      frustrationPoints,
      positiveExperiences,
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
   * 신뢰도 계산 (샘플 크기 기반)
   */
  private calculateConfidence(sampleSize: number): number {
    // 100개 이상이면 신뢰도 1, 10개 이하면 0.1
    return Math.min(1, Math.max(0.1, sampleSize / 100));
  }

  /**
   * Gini 계수 계산
   */
  private calculateGini(values: number[]): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const mean = sorted.reduce((a, b) => a + b, 0) / n;

    if (mean === 0) return 0;

    let sumOfDifferences = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        sumOfDifferences += Math.abs(sorted[i] - sorted[j]);
      }
    }

    return sumOfDifferences / (2 * n * n * mean);
  }

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

    return lines.join('\n');
  }
}

// ==================== 헬퍼 함수 ====================

export function createBalanceInsightAnalyzer(stats: DetailedStats): BalanceInsightAnalyzer {
  return new BalanceInsightAnalyzer(stats);
}
