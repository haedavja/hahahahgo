/**
 * 상세 통계 수집 테스트 (RunSimulator 연동 버전)
 */
import { createGameSimulator } from '../game/index.js';
import { setLogLevel, LogLevel } from '../core/logger.js';
import { StatsCollector, StatsReporter } from '../analysis/detailed-stats.js';

// 로그 완전 비활성화
setLogLevel(LogLevel.SILENT);

async function main() {
  console.log('=== 상세 통계 수집 시뮬레이션 (연동 버전) ===\n');

  const simulator = await createGameSimulator();
  const statsCollector = new StatsCollector();

  // 시뮬레이터에 통계 수집기 연동
  simulator.setStatsCollector(statsCollector);

  const NUM_RUNS = 10;
  console.log(`▶ ${NUM_RUNS}회 런 시뮬레이션 시작...\n`);

  for (let i = 0; i < NUM_RUNS; i++) {
    // 시뮬레이션 실행 (통계는 자동으로 수집됨)
    const run = simulator.simulateRun({ verbose: false });

    // 진행 표시
    process.stdout.write(`  런 ${i + 1}/${NUM_RUNS} 완료 - ${run.success ? '승리' : '패배'} (레이어 ${run.finalLayer})\r`);
  }

  console.log('\n');

  // 통계 완료 및 리포트 생성
  const stats = statsCollector.finalize();
  const reporter = new StatsReporter(stats);

  // 전체 리포트 출력
  console.log(reporter.generateFullReport());

  console.log('\n=== 시뮬레이션 완료 ===');
}

main().catch(console.error);
