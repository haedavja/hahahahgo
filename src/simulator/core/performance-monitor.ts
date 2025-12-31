/**
 * @file performance-monitor.ts
 * @description 시뮬레이터 성능 모니터링 시스템
 */

// ==================== 타입 정의 ====================

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

export interface TimingEntry {
  name: string;
  start: number;
  end?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

export interface PerformanceReport {
  summary: PerformanceSummary;
  timings: TimingStats[];
  memory: MemoryStats;
  throughput: ThroughputStats;
  recommendations: string[];
}

export interface PerformanceSummary {
  totalOperations: number;
  totalDuration: number;
  avgOperationTime: number;
  operationsPerSecond: number;
  peakMemory: number;
  errorRate: number;
}

export interface TimingStats {
  name: string;
  count: number;
  total: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface MemoryStats {
  initial: MemorySnapshot;
  peak: MemorySnapshot;
  final: MemorySnapshot;
  avgHeapUsed: number;
  leakSuspected: boolean;
}

export interface ThroughputStats {
  battlesPerSecond: number;
  cardsProcessedPerSecond: number;
  peakThroughput: number;
  avgThroughput: number;
}

// ==================== 성능 모니터 ====================

export class PerformanceMonitor {
  private timings: Map<string, TimingEntry[]> = new Map();
  private activeTimings: Map<string, TimingEntry> = new Map();
  private memorySnapshots: MemorySnapshot[] = [];
  private metrics: PerformanceMetric[] = [];
  private operationCounts: Map<string, number> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private isMonitoring = false;
  private memoryInterval?: ReturnType<typeof setInterval>;
  private startTime = 0;

  /**
   * 모니터링 시작
   */
  start(memoryIntervalMs: number = 1000): void {
    this.isMonitoring = true;
    this.startTime = Date.now();

    // 초기 메모리 스냅샷
    this.takeMemorySnapshot();

    // 주기적 메모리 모니터링
    this.memoryInterval = setInterval(() => {
      this.takeMemorySnapshot();
    }, memoryIntervalMs);
  }

  /**
   * 모니터링 중지
   */
  stop(): void {
    this.isMonitoring = false;
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = undefined;
    }
    // 최종 메모리 스냅샷
    this.takeMemorySnapshot();
  }

  /**
   * 타이밍 시작
   */
  startTiming(name: string, metadata?: Record<string, unknown>): void {
    const entry: TimingEntry = {
      name,
      start: performance.now(),
      metadata,
    };
    this.activeTimings.set(name, entry);
  }

  /**
   * 타이밍 종료
   */
  endTiming(name: string): number {
    const entry = this.activeTimings.get(name);
    if (!entry) {
      console.warn(`No active timing for: ${name}`);
      return 0;
    }

    entry.end = performance.now();
    entry.duration = entry.end - entry.start;

    this.activeTimings.delete(name);

    if (!this.timings.has(name)) {
      this.timings.set(name, []);
    }
    this.timings.get(name)!.push(entry);

    return entry.duration;
  }

  /**
   * 작업 래핑 (자동 타이밍)
   */
  async measure<T>(name: string, operation: () => Promise<T>, metadata?: Record<string, unknown>): Promise<T> {
    this.startTiming(name, metadata);
    try {
      return await operation();
    } finally {
      this.endTiming(name);
    }
  }

  /**
   * 동기 작업 래핑
   */
  measureSync<T>(name: string, operation: () => T, metadata?: Record<string, unknown>): T {
    this.startTiming(name, metadata);
    try {
      return operation();
    } finally {
      this.endTiming(name);
    }
  }

  /**
   * 메모리 스냅샷
   */
  takeMemorySnapshot(): MemorySnapshot {
    const memory = process.memoryUsage();
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
      external: memory.external,
      rss: memory.rss,
    };
    this.memorySnapshots.push(snapshot);
    return snapshot;
  }

  /**
   * 작업 카운트 증가
   */
  incrementOperation(name: string, count: number = 1): void {
    const current = this.operationCounts.get(name) || 0;
    this.operationCounts.set(name, current + count);
  }

  /**
   * 에러 카운트 증가
   */
  incrementError(name: string): void {
    const current = this.errorCounts.get(name) || 0;
    this.errorCounts.set(name, current + 1);
  }

  /**
   * 커스텀 메트릭 기록
   */
  recordMetric(name: string, value: number, unit: string = ''): void {
    this.metrics.push({
      name,
      value,
      unit,
      timestamp: Date.now(),
    });
  }

  /**
   * 타이밍 통계 계산
   */
  getTimingStats(name: string): TimingStats | null {
    const entries = this.timings.get(name);
    if (!entries || entries.length === 0) return null;

    const durations = entries.map(e => e.duration || 0).sort((a, b) => a - b);
    const count = durations.length;
    const total = durations.reduce((a, b) => a + b, 0);

    return {
      name,
      count,
      total,
      avg: total / count,
      min: durations[0],
      max: durations[count - 1],
      p50: this.percentile(durations, 50),
      p95: this.percentile(durations, 95),
      p99: this.percentile(durations, 99),
    };
  }

  /**
   * 백분위수 계산
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  /**
   * 메모리 통계 계산
   */
  getMemoryStats(): MemoryStats {
    if (this.memorySnapshots.length === 0) {
      const empty: MemorySnapshot = { timestamp: 0, heapUsed: 0, heapTotal: 0, external: 0, rss: 0 };
      return {
        initial: empty,
        peak: empty,
        final: empty,
        avgHeapUsed: 0,
        leakSuspected: false,
      };
    }

    const initial = this.memorySnapshots[0];
    const final = this.memorySnapshots[this.memorySnapshots.length - 1];
    const peak = this.memorySnapshots.reduce((max, s) =>
      s.heapUsed > max.heapUsed ? s : max, this.memorySnapshots[0]);

    const avgHeapUsed = this.memorySnapshots.reduce((sum, s) =>
      sum + s.heapUsed, 0) / this.memorySnapshots.length;

    // 메모리 누수 의심: 마지막 10%의 평균이 초기보다 50% 이상 높음
    const recentCount = Math.max(1, Math.floor(this.memorySnapshots.length * 0.1));
    const recentAvg = this.memorySnapshots.slice(-recentCount).reduce((sum, s) =>
      sum + s.heapUsed, 0) / recentCount;
    const leakSuspected = recentAvg > initial.heapUsed * 1.5;

    return {
      initial,
      peak,
      final,
      avgHeapUsed,
      leakSuspected,
    };
  }

  /**
   * 처리량 통계 계산
   */
  getThroughputStats(): ThroughputStats {
    const totalDuration = (Date.now() - this.startTime) / 1000;
    const battleCount = this.operationCounts.get('battle') || 0;
    const cardCount = this.operationCounts.get('card') || 0;

    // 시간별 처리량 계산
    const battleTimings = this.timings.get('battle') || [];
    const throughputs: number[] = [];

    // 1초 단위로 그룹화
    const buckets = new Map<number, number>();
    for (const timing of battleTimings) {
      const bucket = Math.floor(timing.start / 1000);
      buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
    }

    throughputs.push(...buckets.values());

    return {
      battlesPerSecond: totalDuration > 0 ? battleCount / totalDuration : 0,
      cardsProcessedPerSecond: totalDuration > 0 ? cardCount / totalDuration : 0,
      peakThroughput: throughputs.length > 0 ? Math.max(...throughputs) : 0,
      avgThroughput: throughputs.length > 0
        ? throughputs.reduce((a, b) => a + b, 0) / throughputs.length
        : 0,
    };
  }

  /**
   * 전체 리포트 생성
   */
  generateReport(): PerformanceReport {
    const totalDuration = Date.now() - this.startTime;
    const totalOperations = Array.from(this.operationCounts.values())
      .reduce((a, b) => a + b, 0);
    const totalErrors = Array.from(this.errorCounts.values())
      .reduce((a, b) => a + b, 0);

    const memoryStats = this.getMemoryStats();
    const throughputStats = this.getThroughputStats();

    // 모든 타이밍 통계
    const timingStats: TimingStats[] = [];
    for (const name of this.timings.keys()) {
      const stats = this.getTimingStats(name);
      if (stats) timingStats.push(stats);
    }

    // 권장 사항 생성
    const recommendations = this.generateRecommendations(timingStats, memoryStats, throughputStats);

    return {
      summary: {
        totalOperations,
        totalDuration,
        avgOperationTime: totalOperations > 0 ? totalDuration / totalOperations : 0,
        operationsPerSecond: totalDuration > 0 ? (totalOperations / totalDuration) * 1000 : 0,
        peakMemory: memoryStats.peak.heapUsed,
        errorRate: totalOperations > 0 ? totalErrors / totalOperations : 0,
      },
      timings: timingStats,
      memory: memoryStats,
      throughput: throughputStats,
      recommendations,
    };
  }

  /**
   * 권장 사항 생성
   */
  private generateRecommendations(
    timings: TimingStats[],
    memory: MemoryStats,
    throughput: ThroughputStats
  ): string[] {
    const recommendations: string[] = [];

    // 메모리 누수 의심
    if (memory.leakSuspected) {
      recommendations.push('⚠️ 메모리 누수가 의심됩니다. 장시간 실행 시 메모리 사용량을 확인하세요.');
    }

    // 높은 메모리 사용량
    if (memory.peak.heapUsed > 500 * 1024 * 1024) { // 500MB
      recommendations.push('⚠️ 메모리 사용량이 높습니다. 배치 크기를 줄이거나 스트리밍 처리를 고려하세요.');
    }

    // 느린 작업
    for (const timing of timings) {
      if (timing.avg > 100) { // 100ms 이상
        recommendations.push(`⚠️ "${timing.name}" 작업이 평균 ${timing.avg.toFixed(1)}ms로 느립니다.`);
      }
      if (timing.p99 > timing.avg * 10) { // P99가 평균의 10배 이상
        recommendations.push(`⚠️ "${timing.name}" 작업의 P99 지연이 높습니다. 이상치를 확인하세요.`);
      }
    }

    // 낮은 처리량
    if (throughput.battlesPerSecond < 100 && throughput.battlesPerSecond > 0) {
      recommendations.push('💡 처리량이 낮습니다. 병렬 처리 워커 수를 늘려보세요.');
    }

    // 처리량 변동
    if (throughput.peakThroughput > throughput.avgThroughput * 3) {
      recommendations.push('💡 처리량 변동이 큽니다. 부하 분산을 개선하세요.');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ 성능 지표가 양호합니다.');
    }

    return recommendations;
  }

  /**
   * 리포트 포매팅
   */
  formatReport(report: PerformanceReport): string {
    const lines: string[] = [
      '═══════════════════════════════════════════════════════',
      '📊 성능 분석 리포트',
      '═══════════════════════════════════════════════════════',
      '',
      '📈 요약',
      '───────────────────────────────────────────────────────',
      `총 작업 수: ${report.summary.totalOperations.toLocaleString()}`,
      `총 소요 시간: ${(report.summary.totalDuration / 1000).toFixed(2)}초`,
      `평균 작업 시간: ${report.summary.avgOperationTime.toFixed(2)}ms`,
      `초당 작업 수: ${report.summary.operationsPerSecond.toFixed(1)}`,
      `에러율: ${(report.summary.errorRate * 100).toFixed(2)}%`,
      '',
      '💾 메모리',
      '───────────────────────────────────────────────────────',
      `초기: ${this.formatBytes(report.memory.initial.heapUsed)}`,
      `최대: ${this.formatBytes(report.memory.peak.heapUsed)}`,
      `최종: ${this.formatBytes(report.memory.final.heapUsed)}`,
      `평균: ${this.formatBytes(report.memory.avgHeapUsed)}`,
      report.memory.leakSuspected ? '⚠️ 메모리 누수 의심!' : '✅ 메모리 안정',
      '',
      '⚡ 처리량',
      '───────────────────────────────────────────────────────',
      `배틀/초: ${report.throughput.battlesPerSecond.toFixed(1)}`,
      `최대 처리량: ${report.throughput.peakThroughput.toFixed(1)}/초`,
      `평균 처리량: ${report.throughput.avgThroughput.toFixed(1)}/초`,
    ];

    if (report.timings.length > 0) {
      lines.push('');
      lines.push('⏱️ 타이밍 상세');
      lines.push('───────────────────────────────────────────────────────');

      for (const timing of report.timings) {
        lines.push(
          `${timing.name}: avg=${timing.avg.toFixed(1)}ms, ` +
          `min=${timing.min.toFixed(1)}ms, max=${timing.max.toFixed(1)}ms, ` +
          `p95=${timing.p95.toFixed(1)}ms, count=${timing.count}`
        );
      }
    }

    if (report.recommendations.length > 0) {
      lines.push('');
      lines.push('💡 권장 사항');
      lines.push('───────────────────────────────────────────────────────');
      for (const rec of report.recommendations) {
        lines.push(`  ${rec}`);
      }
    }

    lines.push('');
    lines.push('═══════════════════════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * 바이트 포매팅
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  /**
   * 모니터 초기화
   */
  reset(): void {
    this.timings.clear();
    this.activeTimings.clear();
    this.memorySnapshots = [];
    this.metrics = [];
    this.operationCounts.clear();
    this.errorCounts.clear();
    this.startTime = Date.now();
  }
}

// ==================== 싱글톤 인스턴스 ====================

export const performanceMonitor = new PerformanceMonitor();

// ==================== 데코레이터 유틸리티 ====================

/**
 * 성능 측정 래퍼 함수
 */
export function withPerformance<T extends (...args: unknown[]) => unknown>(
  name: string,
  fn: T
): T {
  return ((...args: unknown[]) => {
    performanceMonitor.startTiming(name);
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.finally(() => performanceMonitor.endTiming(name));
      }
      performanceMonitor.endTiming(name);
      return result;
    } catch (error) {
      performanceMonitor.endTiming(name);
      throw error;
    }
  }) as T;
}
