/**
 * @file perf-benchmark.ts
 * @description 성능 벤치마크 스크립트
 *
 * 주요 유틸리티 함수들의 실행 시간을 측정합니다.
 * 실행: npm run perf:benchmark
 */

import { performance } from 'perf_hooks';

// 벤치마크 결과 타입
interface BenchmarkResult {
  name: string;
  iterations: number;
  totalMs: number;
  avgMs: number;
  opsPerSec: number;
}

// 벤치마크 실행 함수
function benchmark(name: string, fn: () => void, iterations = 10000): BenchmarkResult {
  // 워밍업
  for (let i = 0; i < 100; i++) {
    fn();
  }

  // 실제 측정
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();

  const totalMs = end - start;
  const avgMs = totalMs / iterations;
  const opsPerSec = Math.round(1000 / avgMs);

  return { name, iterations, totalMs, avgMs, opsPerSec };
}

// 결과 출력
function printResults(results: BenchmarkResult[]): void {
  console.log('\n📊 Performance Benchmark Results\n');
  console.log('='.repeat(70));
  console.log(
    'Function'.padEnd(30) +
    'Iterations'.padStart(12) +
    'Total (ms)'.padStart(12) +
    'Avg (ms)'.padStart(12) +
    'Ops/sec'.padStart(12)
  );
  console.log('-'.repeat(70));

  for (const r of results) {
    console.log(
      r.name.padEnd(30) +
      r.iterations.toString().padStart(12) +
      r.totalMs.toFixed(2).padStart(12) +
      r.avgMs.toFixed(4).padStart(12) +
      r.opsPerSec.toLocaleString().padStart(12)
    );
  }

  console.log('='.repeat(70));
}

// 메인 실행
async function main(): Promise<void> {
  console.log('🚀 Starting Performance Benchmark...\n');

  const results: BenchmarkResult[] = [];

  try {
    // etherUtils 벤치마크
    const { calculateEtherSlots, slotsToPts, getSlotProgress } = await import('../src/lib/etherUtils');

    results.push(benchmark('calculateEtherSlots(1000)', () => {
      calculateEtherSlots(1000);
    }));

    results.push(benchmark('slotsToPts(5)', () => {
      slotsToPts(5);
    }));

    results.push(benchmark('getSlotProgress(500)', () => {
      getSlotProgress(500);
    }));

    // speedQueue 벤치마크
    const { randomPick, inflateCards } = await import('../src/lib/speedQueue');

    const mockPool = [
      { id: 'a', speedCost: 3 },
      { id: 'b', speedCost: 4 },
      { id: 'c', speedCost: 2 },
    ];

    results.push(benchmark('randomPick(3)', () => {
      randomPick(mockPool as never[], 3);
    }));

    results.push(benchmark('inflateCards(deck)', () => {
      inflateCards(['strike', 'guard', 'slash'] as never);
    }));

    // Array 작업 벤치마크
    const largeArray = Array.from({ length: 1000 }, (_, i) => i);

    results.push(benchmark('Array.filter (1000 items)', () => {
      largeArray.filter(x => x % 2 === 0);
    }));

    results.push(benchmark('Array.map (1000 items)', () => {
      largeArray.map(x => x * 2);
    }));

    results.push(benchmark('Array.reduce (1000 items)', () => {
      largeArray.reduce((a, b) => a + b, 0);
    }));

    // Object 작업 벤치마크
    const largeObject: Record<string, number> = {};
    for (let i = 0; i < 100; i++) {
      largeObject[`key_${i}`] = i;
    }

    results.push(benchmark('Object.keys (100 keys)', () => {
      Object.keys(largeObject);
    }));

    results.push(benchmark('Object.entries (100 keys)', () => {
      Object.entries(largeObject);
    }));

    printResults(results);

    // 요약
    console.log('\n📋 Summary:');
    const fastest = results.reduce((a, b) => a.opsPerSec > b.opsPerSec ? a : b);
    const slowest = results.reduce((a, b) => a.opsPerSec < b.opsPerSec ? a : b);
    console.log(`  ⚡ Fastest: ${fastest.name} (${fastest.opsPerSec.toLocaleString()} ops/sec)`);
    console.log(`  🐢 Slowest: ${slowest.name} (${slowest.opsPerSec.toLocaleString()} ops/sec)`);

  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  }
}

main();
