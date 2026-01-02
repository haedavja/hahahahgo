/**
 * @file balance-analyzer.ts
 * @description 게임 밸런스 자동 분석 및 제안 시스템
 *
 * ## 기능
 * - 통계 기반 너프/버프 후보 자동 추출
 * - 카드, 상징, 적 밸런스 분석
 * - 위험 구간(사망률 급증 지점) 식별
 */

import type { DetailedStats, CardDeepStats, DeathStats, CardPickStats, CardContributionStats } from './detailed-stats-types';

// ==================== 타입 정의 ====================

export interface BalanceSuggestion {
  type: 'nerf' | 'buff' | 'rework' | 'warning';
  target: string;
  targetType: 'card' | 'enemy' | 'relic' | 'event' | 'floor';
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  metrics: Record<string, number | string>;
  suggestion: string;
}

export interface FloorDangerZone {
  floor: number;
  deathRate: number;
  avgDeathFloor: number;
  isDangerZone: boolean;
  suggestion?: string;
}

export interface CardBalanceAnalysis {
  overpowered: BalanceSuggestion[];
  underpowered: BalanceSuggestion[];
  neverPicked: BalanceSuggestion[];
  neverUsed: BalanceSuggestion[];
}

export interface BalanceReport {
  generatedAt: Date;
  totalRuns: number;
  overallWinRate: number;
  cardBalance: CardBalanceAnalysis;
  enemyBalance: BalanceSuggestion[];
  floorDangerZones: FloorDangerZone[];
  topIssues: BalanceSuggestion[];
}

// ==================== 밸런스 분석기 ====================

export class BalanceAnalyzer {
  private stats: DetailedStats;

  constructor(stats: DetailedStats) {
    this.stats = stats;
  }

  /**
   * 전체 밸런스 리포트 생성
   */
  generateReport(): BalanceReport {
    const cardBalance = this.analyzeCardBalance();
    const enemyBalance = this.analyzeEnemyBalance();
    const floorDangerZones = this.analyzeFloorDangerZones();

    // 모든 제안 수집 및 심각도 순 정렬
    const allSuggestions = [
      ...cardBalance.overpowered,
      ...cardBalance.underpowered,
      ...cardBalance.neverPicked,
      ...cardBalance.neverUsed,
      ...enemyBalance,
    ];

    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const topIssues = allSuggestions
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
      .slice(0, 10);

    return {
      generatedAt: new Date(),
      totalRuns: this.stats.runStats.totalRuns,
      overallWinRate: this.stats.runStats.winRate,
      cardBalance,
      enemyBalance,
      floorDangerZones,
      topIssues,
    };
  }

  /**
   * 카드 밸런스 분석
   */
  private analyzeCardBalance(): CardBalanceAnalysis {
    const overpowered: BalanceSuggestion[] = [];
    const underpowered: BalanceSuggestion[] = [];
    const neverPicked: BalanceSuggestion[] = [];
    const neverUsed: BalanceSuggestion[] = [];

    const { cardPickStats, cardContributionStats, cardDeepStats } = this.stats;
    const avgWinRate = this.stats.runStats.winRate;

    for (const [cardId, deepStats] of cardDeepStats) {
      const pickRate = cardPickStats.pickRate[cardId] || 0;
      const timesOffered = cardPickStats.timesOffered[cardId] || 0;
      const contribution = cardContributionStats.contribution[cardId] || 0;

      // 최소 5번 이상 제시된 카드만 분석
      if (timesOffered < 5) continue;

      // 과잉 강화 카드 (픽률 80% 이상 + 승률 기여도 20% 이상)
      if (pickRate > 0.8 && contribution > 0.2) {
        overpowered.push({
          type: 'nerf',
          target: deepStats.cardName,
          targetType: 'card',
          severity: contribution > 0.3 ? 'critical' : 'high',
          reason: `픽률 ${(pickRate * 100).toFixed(1)}%, 승률 기여도 +${(contribution * 100).toFixed(1)}%`,
          metrics: {
            pickRate: (pickRate * 100).toFixed(1) + '%',
            contribution: (contribution * 100).toFixed(1) + '%',
            winRateWith: (deepStats.winRateWith * 100).toFixed(1) + '%',
            winRateWithout: (deepStats.winRateWithout * 100).toFixed(1) + '%',
          },
          suggestion: `피해량/효과 5-10% 감소 또는 코스트 1 증가 고려`,
        });
      }

      // 약한 카드 (픽률 20% 미만 + 승률 기여도 -10% 이하)
      if (pickRate < 0.2 && contribution < -0.1 && timesOffered >= 10) {
        underpowered.push({
          type: 'buff',
          target: deepStats.cardName,
          targetType: 'card',
          severity: contribution < -0.2 ? 'high' : 'medium',
          reason: `픽률 ${(pickRate * 100).toFixed(1)}%, 승률 기여도 ${(contribution * 100).toFixed(1)}%`,
          metrics: {
            pickRate: (pickRate * 100).toFixed(1) + '%',
            contribution: (contribution * 100).toFixed(1) + '%',
            timesOffered,
          },
          suggestion: `효과 강화 또는 코스트 감소 고려`,
        });
      }

      // 절대 안 뽑히는 카드 (픽률 5% 미만)
      if (pickRate < 0.05 && timesOffered >= 20) {
        neverPicked.push({
          type: 'rework',
          target: deepStats.cardName,
          targetType: 'card',
          severity: 'medium',
          reason: `${timesOffered}회 제시 중 ${(pickRate * 100).toFixed(1)}%만 픽됨`,
          metrics: {
            pickRate: (pickRate * 100).toFixed(1) + '%',
            timesOffered,
            timesPicked: deepStats.timesPicked,
          },
          suggestion: `카드 효과 재설계 필요`,
        });
      }

      // 뽑았지만 안 쓰는 카드 (픽 10회 이상, 전투당 사용 0.5회 미만)
      if (deepStats.timesPicked >= 10 && deepStats.avgPlaysPerBattle < 0.5) {
        neverUsed.push({
          type: 'rework',
          target: deepStats.cardName,
          targetType: 'card',
          severity: 'low',
          reason: `픽 ${deepStats.timesPicked}회, 전투당 평균 ${deepStats.avgPlaysPerBattle.toFixed(2)}회 사용`,
          metrics: {
            timesPicked: deepStats.timesPicked,
            timesPlayed: deepStats.timesPlayed,
            avgPlaysPerBattle: deepStats.avgPlaysPerBattle.toFixed(2),
            neverPlayedRuns: deepStats.neverPlayedRuns,
          },
          suggestion: `카드 효과가 상황에 맞지 않거나 코스트가 너무 높음`,
        });
      }
    }

    return { overpowered, underpowered, neverPicked, neverUsed };
  }

  /**
   * 적 밸런스 분석
   */
  private analyzeEnemyBalance(): BalanceSuggestion[] {
    const suggestions: BalanceSuggestion[] = [];
    const { deathStats, monsterStats } = this.stats;

    // 사망 원인 적 분석
    for (const enemy of deathStats.deadliestEnemies) {
      const monsterData = monsterStats.get(enemy.enemyId);
      if (!monsterData) continue;

      // 사망률 30% 이상인 적
      if (enemy.encounterRate > 0.3) {
        suggestions.push({
          type: 'nerf',
          target: enemy.enemyName,
          targetType: 'enemy',
          severity: enemy.encounterRate > 0.5 ? 'critical' : 'high',
          reason: `조우 시 ${(enemy.encounterRate * 100).toFixed(1)}% 사망률`,
          metrics: {
            deaths: enemy.deaths,
            deathRate: (enemy.encounterRate * 100).toFixed(1) + '%',
            avgDamageTaken: monsterData.avgDamageTaken.toFixed(1),
          },
          suggestion: `HP 또는 공격력 10-20% 감소 고려`,
        });
      }

      // 승률 90% 이상인 적 (너무 쉬움)
      if (monsterData.winRate > 0.9 && monsterData.battles >= 10) {
        suggestions.push({
          type: 'buff',
          target: enemy.enemyName,
          targetType: 'enemy',
          severity: 'low',
          reason: `플레이어 승률 ${(monsterData.winRate * 100).toFixed(1)}%`,
          metrics: {
            winRate: (monsterData.winRate * 100).toFixed(1) + '%',
            battles: monsterData.battles,
            avgTurns: monsterData.avgTurns.toFixed(1),
          },
          suggestion: `HP 또는 공격력 소폭 증가 고려`,
        });
      }
    }

    return suggestions;
  }

  /**
   * 층별 위험 구간 분석
   */
  private analyzeFloorDangerZones(): FloorDangerZone[] {
    const { deathStats } = this.stats;
    const zones: FloorDangerZone[] = [];

    const totalDeaths = deathStats.totalDeaths || 1;
    const floors = Object.keys(deathStats.deathsByFloor).map(Number).sort((a, b) => a - b);

    for (const floor of floors) {
      const deaths = deathStats.deathsByFloor[floor] || 0;
      const deathRate = deaths / totalDeaths;

      // 전체 사망의 15% 이상이 해당 층에서 발생하면 위험 구간
      const isDangerZone = deathRate > 0.15;

      zones.push({
        floor,
        deathRate,
        avgDeathFloor: deathStats.avgDeathFloor,
        isDangerZone,
        suggestion: isDangerZone
          ? `${floor}층 난이도 조정 필요 (사망 ${(deathRate * 100).toFixed(1)}%)`
          : undefined,
      });
    }

    return zones;
  }

  /**
   * 마크다운 리포트 생성
   */
  generateMarkdownReport(): string {
    const report = this.generateReport();
    const lines: string[] = [];

    lines.push('# 밸런스 분석 리포트');
    lines.push(`생성: ${report.generatedAt.toISOString()}`);
    lines.push(`총 런: ${report.totalRuns}회, 승률: ${(report.overallWinRate * 100).toFixed(1)}%`);
    lines.push('');

    // 핵심 이슈
    if (report.topIssues.length > 0) {
      lines.push('## 핵심 밸런스 이슈');
      for (const issue of report.topIssues) {
        const icon = issue.severity === 'critical' ? '🔴' :
                    issue.severity === 'high' ? '🟠' :
                    issue.severity === 'medium' ? '🟡' : '🟢';
        lines.push(`- ${icon} **[${issue.type.toUpperCase()}]** ${issue.target}: ${issue.reason}`);
        lines.push(`  - 제안: ${issue.suggestion}`);
      }
      lines.push('');
    }

    // 과잉 강화 카드
    if (report.cardBalance.overpowered.length > 0) {
      lines.push('## 과잉 강화 카드 (너프 후보)');
      for (const card of report.cardBalance.overpowered) {
        lines.push(`- **${card.target}**: ${card.reason}`);
      }
      lines.push('');
    }

    // 약한 카드
    if (report.cardBalance.underpowered.length > 0) {
      lines.push('## 약한 카드 (버프 후보)');
      for (const card of report.cardBalance.underpowered) {
        lines.push(`- **${card.target}**: ${card.reason}`);
      }
      lines.push('');
    }

    // 위험 구간
    const dangerZones = report.floorDangerZones.filter(z => z.isDangerZone);
    if (dangerZones.length > 0) {
      lines.push('## 위험 구간');
      for (const zone of dangerZones) {
        lines.push(`- **${zone.floor}층**: 사망률 ${(zone.deathRate * 100).toFixed(1)}%`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

// ==================== 헬퍼 함수 ====================

export function createBalanceAnalyzer(stats: DetailedStats): BalanceAnalyzer {
  return new BalanceAnalyzer(stats);
}
