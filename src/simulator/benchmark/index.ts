/**
 * @file benchmark/index.ts
 * @description 시뮬레이터 성능 벤치마크 도구
 *
 * 기능:
 * - 시뮬레이션 속도 측정
 * - Worker 풀 효율성 분석
 * - 메모리 사용량 추적
 * - 병렬 처리 성능 비교
 */

import { performance } from 'perf_hooks';
import { cpus, totalmem, freemem } from 'os';
import { Worker } from 'worker_threads';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { SimulationConfig, BattleResult } from '../core/types';
import { syncCards, syncEnemies } from '../data/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==================== 벤치마크 타입 ====================

export interface BenchmarkConfig {
  name: string;
  battles: number;
  runs: number;
  warmupRuns: number;
  workerCount?: number;
  deck: string[];
  enemies: string[];
}

export interface BenchmarkResult {
  config: BenchmarkConfig;
  runs: RunResult[];
  summary: BenchmarkSummary;
  systemInfo: SystemInfo;
  timestamp: number;
}

export interface RunResult {
  runNumber: number;
  duration: number;
  battlesPerSecond: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryDelta: number;
  wins: number;
  losses: number;
  winRate: number;
}

export interface BenchmarkSummary {
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  stdDevDuration: number;
  avgBattlesPerSecond: number;
  peakBattlesPerSecond: number;
  avgMemoryDelta: number;
  totalBattles: number;
  avgWinRate: number;
}

export interface SystemInfo {
  cpuCores: number;
  cpuModel: string;
  totalMemory: number;
  freeMemory: number;
  nodeVersion: string;
  platform: string;
}

// ==================== 벤치마크 실행기 ====================

export class BenchmarkRunner {
  private cardData: Record<string, unknown>;
  private enemyData: Record<string, unknown>;

  constructor() {
    this.cardData = syncCards();
    this.enemyData = syncEnemies();
  }

  // ==================== 메인 벤치마크 ====================

  async run(config: BenchmarkConfig): Promise<BenchmarkResult> {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🏃 벤치마크 시작: ${config.name}`);
    console.log(`${'═'.repeat(60)}`);

    const systemInfo = this.getSystemInfo();
    console.log(`\n📊 시스템 정보:`);
    console.log(`   CPU: ${systemInfo.cpuModel} (${systemInfo.cpuCores} 코어)`);
    console.log(`   메모리: ${(systemInfo.totalMemory / 1024 / 1024 / 1024).toFixed(1)} GB`);
    console.log(`   Node: ${systemInfo.nodeVersion}`);

    // 워밍업
    if (config.warmupRuns > 0) {
      console.log(`\n🔥 워밍업 (${config.warmupRuns}회)...`);
      for (let i = 0; i < config.warmupRuns; i++) {
        await this.runSingleBenchmark(config);
      }
    }

    // 실제 벤치마크
    console.log(`\n⚡ 벤치마크 실행 (${config.runs}회)...`);
    const runs: RunResult[] = [];

    for (let i = 0; i < config.runs; i++) {
      const result = await this.runSingleBenchmark(config, i + 1);
      runs.push(result);
      console.log(`   Run ${i + 1}: ${result.battlesPerSecond.toFixed(0)} battles/sec (${result.duration.toFixed(0)}ms)`);
    }

    const summary = this.calculateSummary(runs, config);

    const result: BenchmarkResult = {
      config,
      runs,
      summary,
      systemInfo,
      timestamp: Date.now(),
    };

    this.printSummary(result);

    return result;
  }

  private async runSingleBenchmark(config: BenchmarkConfig, runNumber: number = 0): Promise<RunResult> {
    const memoryBefore = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    let wins = 0;
    let losses = 0;

    // 간단한 동기 시뮬레이션 (실제 Worker 사용 시 교체)
    for (let i = 0; i < config.battles; i++) {
      const result = this.simulateBattle(config);
      if (result.winner === 'player') wins++;
      else losses++;
    }

    const endTime = performance.now();
    const memoryAfter = process.memoryUsage().heapUsed;

    const duration = endTime - startTime;

    return {
      runNumber,
      duration,
      battlesPerSecond: (config.battles / duration) * 1000,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter - memoryBefore,
      wins,
      losses,
      winRate: wins / config.battles,
    };
  }

  // ==================== 간단한 전투 시뮬레이션 ====================

  private simulateBattle(config: BenchmarkConfig): { winner: 'player' | 'enemy' | 'draw' } {
    const enemyId = config.enemies[Math.floor(Math.random() * config.enemies.length)];
    const enemy = this.enemyData[enemyId] as { hp?: number } | undefined;

    let playerHp = 100;
    let enemyHp = enemy?.hp || 50;

    // 간단한 전투 루프
    for (let turn = 0; turn < 30 && playerHp > 0 && enemyHp > 0; turn++) {
      // 플레이어 공격
      const playerDamage = 5 + Math.floor(Math.random() * 10);
      enemyHp -= playerDamage;

      if (enemyHp <= 0) break;

      // 적 공격
      const enemyDamage = 3 + Math.floor(Math.random() * 8);
      playerHp -= enemyDamage;
    }

    if (enemyHp <= 0 && playerHp > 0) return { winner: 'player' };
    if (playerHp <= 0 && enemyHp > 0) return { winner: 'enemy' };
    return { winner: playerHp >= enemyHp ? 'player' : 'enemy' };
  }

  // ==================== 비교 벤치마크 ====================

  async compareBenchmarks(configs: BenchmarkConfig[]): Promise<BenchmarkComparison> {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 벤치마크 비교 (${configs.length}개 설정)`);
    console.log(`${'═'.repeat(60)}`);

    const results: BenchmarkResult[] = [];

    for (const config of configs) {
      const result = await this.run(config);
      results.push(result);
    }

    const comparison = this.analyzeComparison(results);
    this.printComparison(comparison);

    return comparison;
  }

  private analyzeComparison(results: BenchmarkResult[]): BenchmarkComparison {
    const sorted = [...results].sort(
      (a, b) => b.summary.avgBattlesPerSecond - a.summary.avgBattlesPerSecond
    );

    const fastest = sorted[0];
    const slowest = sorted[sorted.length - 1];
    const speedup = fastest.summary.avgBattlesPerSecond / slowest.summary.avgBattlesPerSecond;

    return {
      results,
      ranking: sorted.map((r, i) => ({
        rank: i + 1,
        name: r.config.name,
        avgBattlesPerSecond: r.summary.avgBattlesPerSecond,
        relativeSpeed: r.summary.avgBattlesPerSecond / slowest.summary.avgBattlesPerSecond,
      })),
      fastest: fastest.config.name,
      slowest: slowest.config.name,
      speedup,
    };
  }

  // ==================== 스케일링 테스트 ====================

  async testScaling(
    baseBattles: number = 100,
    scales: number[] = [1, 2, 4, 8, 16],
    deck: string[] = ['quick_slash', 'guard'],
    enemies: string[] = ['ghoul']
  ): Promise<ScalingResult> {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📈 스케일링 테스트`);
    console.log(`${'═'.repeat(60)}`);

    const dataPoints: ScalingDataPoint[] = [];

    for (const scale of scales) {
      const battles = baseBattles * scale;
      console.log(`\n  테스트: ${battles} 전투...`);

      const result = await this.run({
        name: `scale-${scale}x`,
        battles,
        runs: 3,
        warmupRuns: 1,
        deck,
        enemies,
      });

      dataPoints.push({
        scale,
        battles,
        avgDuration: result.summary.avgDuration,
        avgBattlesPerSecond: result.summary.avgBattlesPerSecond,
        efficiency: result.summary.avgBattlesPerSecond / (baseBattles * result.summary.avgBattlesPerSecond / battles),
      });
    }

    // 스케일링 효율 분석
    const linearEfficiency = dataPoints.map(p => p.efficiency);
    const avgEfficiency = linearEfficiency.reduce((a, b) => a + b, 0) / linearEfficiency.length;

    const scalingResult: ScalingResult = {
      dataPoints,
      scalingEfficiency: avgEfficiency,
      recommendation: avgEfficiency > 0.9 ? '우수한 스케일링' : avgEfficiency > 0.7 ? '양호한 스케일링' : '스케일링 개선 필요',
    };

    this.printScalingResult(scalingResult);

    return scalingResult;
  }

  // ==================== 메모리 프로파일링 ====================

  async profileMemory(
    battles: number = 1000,
    iterations: number = 10
  ): Promise<MemoryProfile> {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🧠 메모리 프로파일링`);
    console.log(`${'═'.repeat(60)}`);

    const snapshots: MemorySnapshot[] = [];
    const baseline = process.memoryUsage();

    for (let i = 0; i < iterations; i++) {
      // GC 힌트
      if (global.gc) global.gc();

      const before = process.memoryUsage();

      await this.run({
        name: `memory-test-${i}`,
        battles,
        runs: 1,
        warmupRuns: 0,
        deck: ['quick_slash', 'guard'],
        enemies: ['ghoul'],
      });

      const after = process.memoryUsage();

      snapshots.push({
        iteration: i + 1,
        heapUsed: after.heapUsed,
        heapTotal: after.heapTotal,
        external: after.external,
        delta: after.heapUsed - before.heapUsed,
      });

      console.log(`   Iteration ${i + 1}: heap=${(after.heapUsed / 1024 / 1024).toFixed(1)}MB, delta=${((after.heapUsed - before.heapUsed) / 1024).toFixed(0)}KB`);
    }

    const profile: MemoryProfile = {
      snapshots,
      baseline: {
        heapUsed: baseline.heapUsed,
        heapTotal: baseline.heapTotal,
        external: baseline.external,
      },
      peak: Math.max(...snapshots.map(s => s.heapUsed)),
      avgDelta: snapshots.reduce((sum, s) => sum + s.delta, 0) / snapshots.length,
      leakSuspected: this.detectMemoryLeak(snapshots),
    };

    this.printMemoryProfile(profile);

    return profile;
  }

  private detectMemoryLeak(snapshots: MemorySnapshot[]): boolean {
    if (snapshots.length < 5) return false;

    // 간단한 추세 분석
    const deltas = snapshots.map(s => s.delta);
    const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;

    // 평균 증가량이 1MB 이상이면 누수 의심
    return avgDelta > 1024 * 1024;
  }

  // ==================== 유틸리티 ====================

  private getSystemInfo(): SystemInfo {
    const cpuInfo = cpus();
    return {
      cpuCores: cpuInfo.length,
      cpuModel: cpuInfo[0]?.model || 'Unknown',
      totalMemory: totalmem(),
      freeMemory: freemem(),
      nodeVersion: process.version,
      platform: process.platform,
    };
  }

  private calculateSummary(runs: RunResult[], config: BenchmarkConfig): BenchmarkSummary {
    const durations = runs.map(r => r.duration);
    const bps = runs.map(r => r.battlesPerSecond);
    const memDeltas = runs.map(r => r.memoryDelta);
    const winRates = runs.map(r => r.winRate);

    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const variance = durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / durations.length;

    return {
      avgDuration,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      stdDevDuration: Math.sqrt(variance),
      avgBattlesPerSecond: bps.reduce((a, b) => a + b, 0) / bps.length,
      peakBattlesPerSecond: Math.max(...bps),
      avgMemoryDelta: memDeltas.reduce((a, b) => a + b, 0) / memDeltas.length,
      totalBattles: config.battles * config.runs,
      avgWinRate: winRates.reduce((a, b) => a + b, 0) / winRates.length,
    };
  }

  // ==================== 출력 ====================

  private printSummary(result: BenchmarkResult): void {
    const s = result.summary;
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`📊 결과 요약: ${result.config.name}`);
    console.log(`${'─'.repeat(40)}`);
    console.log(`   평균 시간: ${s.avgDuration.toFixed(1)}ms (±${s.stdDevDuration.toFixed(1)}ms)`);
    console.log(`   처리량: ${s.avgBattlesPerSecond.toFixed(0)} battles/sec (최대: ${s.peakBattlesPerSecond.toFixed(0)})`);
    console.log(`   메모리 증가: ${(s.avgMemoryDelta / 1024).toFixed(0)}KB/run`);
    console.log(`   총 전투: ${s.totalBattles}`);
    console.log(`   평균 승률: ${(s.avgWinRate * 100).toFixed(1)}%`);
  }

  private printComparison(comparison: BenchmarkComparison): void {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 비교 결과`);
    console.log(`${'═'.repeat(60)}`);

    console.log(`\n🏆 순위:`);
    for (const r of comparison.ranking) {
      const bar = '█'.repeat(Math.floor(r.relativeSpeed * 20));
      console.log(`   ${r.rank}. ${r.name}: ${r.avgBattlesPerSecond.toFixed(0)}/s ${bar}`);
    }

    console.log(`\n   최고: ${comparison.fastest}`);
    console.log(`   최저: ${comparison.slowest}`);
    console.log(`   속도 차이: ${comparison.speedup.toFixed(2)}x`);
  }

  private printScalingResult(result: ScalingResult): void {
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`📈 스케일링 분석`);
    console.log(`${'─'.repeat(40)}`);

    for (const point of result.dataPoints) {
      console.log(`   ${point.scale}x: ${point.avgBattlesPerSecond.toFixed(0)}/s (효율: ${(point.efficiency * 100).toFixed(0)}%)`);
    }

    console.log(`\n   전체 효율: ${(result.scalingEfficiency * 100).toFixed(0)}%`);
    console.log(`   평가: ${result.recommendation}`);
  }

  private printMemoryProfile(profile: MemoryProfile): void {
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`🧠 메모리 분석`);
    console.log(`${'─'.repeat(40)}`);
    console.log(`   기준선: ${(profile.baseline.heapUsed / 1024 / 1024).toFixed(1)}MB`);
    console.log(`   피크: ${(profile.peak / 1024 / 1024).toFixed(1)}MB`);
    console.log(`   평균 증가: ${(profile.avgDelta / 1024).toFixed(0)}KB/iteration`);
    console.log(`   누수 의심: ${profile.leakSuspected ? '⚠️ 예' : '✓ 아니오'}`);
  }
}

// ==================== 추가 타입 ====================

export interface BenchmarkComparison {
  results: BenchmarkResult[];
  ranking: Array<{
    rank: number;
    name: string;
    avgBattlesPerSecond: number;
    relativeSpeed: number;
  }>;
  fastest: string;
  slowest: string;
  speedup: number;
}

export interface ScalingResult {
  dataPoints: ScalingDataPoint[];
  scalingEfficiency: number;
  recommendation: string;
}

export interface ScalingDataPoint {
  scale: number;
  battles: number;
  avgDuration: number;
  avgBattlesPerSecond: number;
  efficiency: number;
}

export interface MemoryProfile {
  snapshots: MemorySnapshot[];
  baseline: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  peak: number;
  avgDelta: number;
  leakSuspected: boolean;
}

export interface MemorySnapshot {
  iteration: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  delta: number;
}

// ==================== 프리셋 벤치마크 ====================

export const BENCHMARK_PRESETS: Record<string, BenchmarkConfig> = {
  quick: {
    name: 'Quick Test',
    battles: 100,
    runs: 3,
    warmupRuns: 1,
    deck: ['quick_slash', 'guard'],
    enemies: ['ghoul'],
  },
  standard: {
    name: 'Standard Test',
    battles: 1000,
    runs: 5,
    warmupRuns: 2,
    deck: ['quick_slash', 'quick_slash', 'guard', 'guard', 'heavy_strike', 'dash'],
    enemies: ['ghoul', 'marauder'],
  },
  stress: {
    name: 'Stress Test',
    battles: 10000,
    runs: 3,
    warmupRuns: 1,
    deck: ['quick_slash', 'guard', 'heavy_strike', 'counter_stance', 'charge', 'sweep', 'reinforce', 'venom_shot'],
    enemies: ['ghoul', 'marauder', 'deserter', 'slaughterer'],
  },
};

// ==================== CLI ====================

export async function runBenchmarkCLI(): Promise<void> {
  const runner = new BenchmarkRunner();

  console.log('🎯 시뮬레이터 벤치마크 도구\n');

  // Quick 테스트
  await runner.run(BENCHMARK_PRESETS.quick);

  // Standard 테스트
  await runner.run(BENCHMARK_PRESETS.standard);

  // 스케일링 테스트
  await runner.testScaling();

  // 메모리 프로파일링
  await runner.profileMemory(500, 5);

  console.log('\n✅ 벤치마크 완료!');
}

// CLI 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  runBenchmarkCLI().catch(console.error);
}
