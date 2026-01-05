/**
 * @file trends.ts
 * @description 메타 트렌드 분석 - 시간에 따른 변화 추적
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { SimulationSummary } from '../core/types';
import { getDefaultStorage } from '../persistence/storage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==================== 트렌드 타입 ====================

export interface TrendPoint {
  timestamp: number;
  date: string;
  winRate: number;
  avgTurns: number;
  avgDamage: number;
  sampleSize: number;
  topCards: string[];
  topEnemies: string[];
}

export interface TrendAnalysis {
  period: string;
  points: TrendPoint[];
  overall: {
    avgWinRate: number;
    winRateTrend: 'up' | 'down' | 'stable';
    volatility: number;
    peakDate: string;
    lowDate: string;
  };
  cardTrends: CardTrend[];
  enemyTrends: EnemyTrend[];
  insights: string[];
}

export interface CardTrend {
  cardId: string;
  usageChange: number;
  winRateWithCard: number;
  trending: 'rising' | 'falling' | 'stable';
}

export interface EnemyTrend {
  enemyId: string;
  playerWinRateChange: number;
  difficulty: 'harder' | 'easier' | 'stable';
}

export interface PatchImpact {
  patchDate: number;
  beforeWinRate: number;
  afterWinRate: number;
  impact: number;
  affectedCards: string[];
  affectedEnemies: string[];
}

// ==================== 트렌드 분석기 ====================

export class TrendAnalyzer {
  private dataPath: string;
  private trendHistory: TrendPoint[] = [];

  constructor(dataPath?: string) {
    this.dataPath = dataPath || join(__dirname, '../../data/trends.json');
    this.loadHistory();
  }

  private loadHistory(): void {
    if (existsSync(this.dataPath)) {
      try {
        const data = JSON.parse(readFileSync(this.dataPath, 'utf-8'));
        this.trendHistory = data.history || [];
      } catch {
        this.trendHistory = [];
      }
    }
  }

  private saveHistory(): void {
    writeFileSync(
      this.dataPath,
      JSON.stringify({ history: this.trendHistory, lastUpdated: Date.now() }, null, 2),
      'utf-8'
    );
  }

  /**
   * 트렌드 히스토리 초기화 (테스트용)
   */
  clearHistory(): void {
    this.trendHistory = [];
    if (existsSync(this.dataPath)) {
      writeFileSync(this.dataPath, JSON.stringify({ history: [], lastUpdated: Date.now() }), 'utf-8');
    }
  }

  // ==================== 데이터 기록 ====================

  recordDataPoint(summary: SimulationSummary, metadata?: {
    topCards?: string[];
    topEnemies?: string[];
  }): void {
    const now = Date.now();
    const date = new Date(now).toISOString().split('T')[0];

    // 같은 날짜의 기존 포인트 업데이트 또는 새로 추가
    const existingIndex = this.trendHistory.findIndex(p => p.date === date);

    const point: TrendPoint = {
      timestamp: now,
      date,
      winRate: summary.winRate,
      avgTurns: summary.avgTurns,
      avgDamage: summary.avgPlayerDamage,
      sampleSize: summary.totalBattles,
      topCards: metadata?.topCards || [],
      topEnemies: metadata?.topEnemies || [],
    };

    if (existingIndex >= 0) {
      // 가중 평균으로 업데이트
      const existing = this.trendHistory[existingIndex];
      const totalSamples = existing.sampleSize + summary.totalBattles;
      point.winRate = (existing.winRate * existing.sampleSize + summary.winRate * summary.totalBattles) / totalSamples;
      point.avgTurns = (existing.avgTurns * existing.sampleSize + summary.avgTurns * summary.totalBattles) / totalSamples;
      point.sampleSize = totalSamples;
      this.trendHistory[existingIndex] = point;
    } else {
      this.trendHistory.push(point);
    }

    this.saveHistory();
  }

  // ==================== 트렌드 분석 ====================

  async analyze(days: number = 30): Promise<TrendAnalysis> {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const points = this.trendHistory.filter(p => p.timestamp >= cutoff);

    if (points.length < 2) {
      return this.createEmptyAnalysis(days);
    }

    // 전체 통계
    const winRates = points.map(p => p.winRate);
    const avgWinRate = winRates.reduce((a, b) => a + b, 0) / winRates.length;

    // 추세 계산 (선형 회귀)
    const trend = this.calculateTrend(winRates);

    // 변동성
    const variance = winRates.reduce((sum, wr) => sum + Math.pow(wr - avgWinRate, 2), 0) / winRates.length;
    const volatility = Math.sqrt(variance);

    // 피크/저점
    const maxPoint = points.reduce((max, p) => p.winRate > max.winRate ? p : max);
    const minPoint = points.reduce((min, p) => p.winRate < min.winRate ? p : min);

    // 카드 트렌드
    const cardTrends = this.analyzeCardTrends(points);

    // 적 트렌드
    const enemyTrends = this.analyzeEnemyTrends(points);

    // 인사이트 생성
    const insights = this.generateInsights(avgWinRate, trend, volatility, cardTrends, enemyTrends);

    return {
      period: `최근 ${days}일`,
      points,
      overall: {
        avgWinRate,
        winRateTrend: trend > 0.01 ? 'up' : trend < -0.01 ? 'down' : 'stable',
        volatility,
        peakDate: maxPoint.date,
        lowDate: minPoint.date,
      },
      cardTrends,
      enemyTrends,
      insights,
    };
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, i) => sum + i * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  private analyzeCardTrends(points: TrendPoint[]): CardTrend[] {
    const cardStats: Record<string, { early: number; late: number }> = {};

    const midpoint = Math.floor(points.length / 2);
    const earlyPoints = points.slice(0, midpoint);
    const latePoints = points.slice(midpoint);

    // 초기/후기 사용량 집계
    for (const point of earlyPoints) {
      for (const card of point.topCards) {
        if (!cardStats[card]) cardStats[card] = { early: 0, late: 0 };
        cardStats[card].early++;
      }
    }

    for (const point of latePoints) {
      for (const card of point.topCards) {
        if (!cardStats[card]) cardStats[card] = { early: 0, late: 0 };
        cardStats[card].late++;
      }
    }

    // 각 카드별로 해당 카드가 topCards에 있던 포인트들의 평균 승률 계산
    const cardWinRates: Record<string, { winRateSum: number; count: number }> = {};

    for (const point of points) {
      for (const card of point.topCards) {
        if (!cardWinRates[card]) {
          cardWinRates[card] = { winRateSum: 0, count: 0 };
        }
        cardWinRates[card].winRateSum += point.winRate;
        cardWinRates[card].count++;
      }
    }

    return Object.entries(cardStats).map(([cardId, stats]) => {
      const change = stats.late - stats.early;
      const winRateData = cardWinRates[cardId];
      // 해당 카드가 나타난 포인트들의 평균 승률 사용
      const winRateWithCard = winRateData && winRateData.count > 0
        ? winRateData.winRateSum / winRateData.count
        : 0.5;

      return {
        cardId,
        usageChange: change,
        winRateWithCard,
        trending: change > 1 ? 'rising' : change < -1 ? 'falling' : 'stable',
      };
    });
  }

  private analyzeEnemyTrends(points: TrendPoint[]): EnemyTrend[] {
    if (points.length < 2) return [];

    const midpoint = Math.floor(points.length / 2);
    const earlyPoints = points.slice(0, midpoint);
    const latePoints = points.slice(midpoint);

    // 적별 초반/후반 승률 추적
    const enemyStats: Record<string, { earlyWinRateSum: number; earlyCount: number; lateWinRateSum: number; lateCount: number }> = {};

    for (const point of earlyPoints) {
      for (const enemy of point.topEnemies) {
        if (!enemyStats[enemy]) {
          enemyStats[enemy] = { earlyWinRateSum: 0, earlyCount: 0, lateWinRateSum: 0, lateCount: 0 };
        }
        enemyStats[enemy].earlyWinRateSum += point.winRate;
        enemyStats[enemy].earlyCount++;
      }
    }

    for (const point of latePoints) {
      for (const enemy of point.topEnemies) {
        if (!enemyStats[enemy]) {
          enemyStats[enemy] = { earlyWinRateSum: 0, earlyCount: 0, lateWinRateSum: 0, lateCount: 0 };
        }
        enemyStats[enemy].lateWinRateSum += point.winRate;
        enemyStats[enemy].lateCount++;
      }
    }

    return Object.entries(enemyStats)
      .filter(([_, stats]) => stats.earlyCount > 0 && stats.lateCount > 0)
      .map(([enemyId, stats]) => {
        const earlyWinRate = stats.earlyWinRateSum / stats.earlyCount;
        const lateWinRate = stats.lateWinRateSum / stats.lateCount;
        const change = lateWinRate - earlyWinRate;

        return {
          enemyId,
          playerWinRateChange: change,
          difficulty: change < -0.05 ? 'harder' : change > 0.05 ? 'easier' : 'stable',
        };
      });
  }

  private generateInsights(
    avgWinRate: number,
    trend: number,
    volatility: number,
    cardTrends: CardTrend[],
    enemyTrends: EnemyTrend[]
  ): string[] {
    const insights: string[] = [];

    if (trend > 0.02) {
      insights.push('📈 승률이 상승 추세입니다. 현재 전략이 효과적입니다.');
    } else if (trend < -0.02) {
      insights.push('📉 승률이 하락 추세입니다. 전략 조정이 필요할 수 있습니다.');
    }

    if (volatility > 0.1) {
      insights.push('⚠️ 승률 변동이 큽니다. 일관된 전략 사용을 권장합니다.');
    }

    if (avgWinRate < 0.4) {
      insights.push('🔴 평균 승률이 낮습니다. 덱 구성 검토를 권장합니다.');
    } else if (avgWinRate > 0.7) {
      insights.push('🟢 높은 승률을 유지하고 있습니다.');
    }

    const risingCards = cardTrends.filter(c => c.trending === 'rising');
    if (risingCards.length > 0) {
      insights.push(`🔥 인기 상승 카드: ${risingCards.map(c => c.cardId).join(', ')}`);
    }

    return insights;
  }

  private createEmptyAnalysis(days: number): TrendAnalysis {
    return {
      period: `최근 ${days}일`,
      points: [],
      overall: {
        avgWinRate: 0,
        winRateTrend: 'stable',
        volatility: 0,
        peakDate: '',
        lowDate: '',
      },
      cardTrends: [],
      enemyTrends: [],
      insights: ['데이터가 부족합니다. 더 많은 시뮬레이션을 실행하세요.'],
    };
  }

  // ==================== 패치 영향 분석 ====================

  analyzePatchImpact(patchDate: number, daysBefore: number = 7, daysAfter: number = 7): PatchImpact | null {
    const beforeStart = patchDate - daysBefore * 24 * 60 * 60 * 1000;
    const afterEnd = patchDate + daysAfter * 24 * 60 * 60 * 1000;

    const beforePoints = this.trendHistory.filter(p => p.timestamp >= beforeStart && p.timestamp < patchDate);
    const afterPoints = this.trendHistory.filter(p => p.timestamp >= patchDate && p.timestamp <= afterEnd);

    if (beforePoints.length === 0 || afterPoints.length === 0) {
      return null;
    }

    const beforeWinRate = beforePoints.reduce((sum, p) => sum + p.winRate, 0) / beforePoints.length;
    const afterWinRate = afterPoints.reduce((sum, p) => sum + p.winRate, 0) / afterPoints.length;

    return {
      patchDate,
      beforeWinRate,
      afterWinRate,
      impact: afterWinRate - beforeWinRate,
      affectedCards: [],
      affectedEnemies: [],
    };
  }
}

// ==================== 콘솔 출력 ====================

export function printTrendAnalysis(analysis: TrendAnalysis): void {
  console.log('\n' + '═'.repeat(60));
  console.log(`📊 메타 트렌드 분석: ${analysis.period}`);
  console.log('═'.repeat(60));

  console.log(`\n📈 전체 통계:`);
  console.log(`   평균 승률: ${(analysis.overall.avgWinRate * 100).toFixed(1)}%`);
  console.log(`   추세: ${analysis.overall.winRateTrend === 'up' ? '↑ 상승' : analysis.overall.winRateTrend === 'down' ? '↓ 하락' : '→ 유지'}`);
  console.log(`   변동성: ${(analysis.overall.volatility * 100).toFixed(1)}%`);
  console.log(`   최고: ${analysis.overall.peakDate} | 최저: ${analysis.overall.lowDate}`);

  if (analysis.insights.length > 0) {
    console.log(`\n💡 인사이트:`);
    for (const insight of analysis.insights) {
      console.log(`   ${insight}`);
    }
  }

  console.log('\n' + '═'.repeat(60));
}
