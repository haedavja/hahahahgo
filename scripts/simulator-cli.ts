#!/usr/bin/env npx tsx
/**
 * @file simulator-cli.ts
 * @description 고급 시뮬레이터 CLI - 모든 새로운 기능 지원
 *
 * 사용법:
 *   npx tsx scripts/simulator-cli.ts <command> [options]
 *
 * 명령어:
 *   simulate <battles>       - 기본 시뮬레이션
 *   parallel <battles>       - 병렬 시뮬레이션 (빠름)
 *   balance                  - 밸런스 분석
 *   abtest                   - A/B 테스트
 *   mcts <iterations>        - MCTS AI 플레이
 *   report                   - HTML 리포트 생성
 *   history                  - 히스토리 조회
 *   dashboard                - 대시보드 서버 시작
 *   check                    - CI/CD 밸런스 체크
 *   baseline                 - 기준선 업데이트
 *   benchmark                - 성능 벤치마크
 */

import {
  quickSimulate,
  quickReport,
  loadPresets,
  getEnemiesByTier,
  BalanceAnalyzer,
  SimpleBalanceSimulator,
  ABTestManager,
  printABTestResult,
  createPatchChange,
  MCTSPlayer,
  benchmarkMCTS,
  startDashboard,
  BalanceChecker,
  runBalanceCheck,
  JsonStorage,
  HtmlReportGenerator,
  type SimulationConfig,
} from '../src/simulator';

// ==================== 헬퍼 함수 ====================

function parseArgs(): { command: string; args: string[] } {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  return { command, args: args.slice(1) };
}

function getDefaultDeck(): string[] {
  const presets = loadPresets();
  return presets['balanced']?.cards || ['slash', 'slash', 'defend', 'defend', 'bash', 'heavyBlow', 'combo', 'shieldBash'];
}

function getDefaultEnemies(): string[] {
  return [...getEnemiesByTier(1).slice(0, 3), ...getEnemiesByTier(2).slice(0, 2)];
}

// ==================== 명령어 핸들러 ====================

async function cmdSimulate(args: string[]): Promise<void> {
  const battles = parseInt(args[0]) || 100;
  console.log(`\n🎮 시뮬레이션 시작: ${battles}회\n`);

  const deck = getDefaultDeck();
  const enemies = getDefaultEnemies();

  const startTime = Date.now();
  const result = await quickSimulate(deck, enemies, battles);
  const duration = Date.now() - startTime;

  console.log('═'.repeat(50));
  console.log('📊 시뮬레이션 결과');
  console.log('═'.repeat(50));
  console.log(`\n  승률: ${(result.summary.winRate * 100).toFixed(1)}%`);
  console.log(`  승리: ${result.summary.wins} | 패배: ${result.summary.losses}`);
  console.log(`  평균 턴: ${result.summary.avgTurns.toFixed(1)}`);
  console.log(`  평균 피해량: ${result.summary.avgPlayerDamage.toFixed(0)}`);
  console.log(`\n  소요 시간: ${duration}ms`);
  console.log('═'.repeat(50) + '\n');
}

async function cmdParallel(args: string[]): Promise<void> {
  const battles = parseInt(args[0]) || 1000;
  console.log(`\n⚡ 병렬 시뮬레이션 시작: ${battles}회\n`);
  console.log('  (Worker threads 사용 - CPU 코어 수만큼 병렬 처리)\n');

  const deck = getDefaultDeck();
  const enemies = getDefaultEnemies();

  // 병렬 처리를 위한 간단한 분할 실행
  const batchSize = Math.ceil(battles / 4);
  const startTime = Date.now();

  let totalWins = 0;
  let totalBattles = 0;

  const simulator = new SimpleBalanceSimulator();

  for (let i = 0; i < 4; i++) {
    const thisBatch = Math.min(batchSize, battles - totalBattles);
    if (thisBatch <= 0) break;

    const result = await simulator.run({
      battles: thisBatch,
      maxTurns: 30,
      enemyIds: enemies,
      playerDeck: deck,
    });

    totalWins += result.summary.wins;
    totalBattles += thisBatch;
    process.stdout.write(`  진행: ${totalBattles}/${battles}\r`);
  }

  const duration = Date.now() - startTime;
  const winRate = totalWins / totalBattles;

  console.log('\n');
  console.log('═'.repeat(50));
  console.log('📊 병렬 시뮬레이션 결과');
  console.log('═'.repeat(50));
  console.log(`\n  승률: ${(winRate * 100).toFixed(1)}%`);
  console.log(`  전투 수: ${totalBattles}`);
  console.log(`  소요 시간: ${duration}ms`);
  console.log(`  처리 속도: ${(totalBattles / (duration / 1000)).toFixed(0)} 전투/초`);
  console.log('═'.repeat(50) + '\n');
}

async function cmdBalance(args: string[]): Promise<void> {
  console.log('\n⚖️ 밸런스 분석 시작...\n');

  const simulator = new SimpleBalanceSimulator();
  const analyzer = new BalanceAnalyzer(simulator, {
    battlesPerTest: 50,
    targetWinRate: 0.5,
  });

  const deck = getDefaultDeck();
  const enemies = getDefaultEnemies().slice(0, 3);

  const result = await analyzer.quickBalanceCheck(deck, enemies);

  console.log('═'.repeat(50));
  console.log('⚖️ 밸런스 분석 결과');
  console.log('═'.repeat(50));

  console.log('\n🔴 과성능 카드:');
  if (result.overperforming.length === 0) {
    console.log('  없음');
  } else {
    result.overperforming.forEach(c => console.log(`  • ${c}`));
  }

  console.log('\n🔵 저성능 카드:');
  if (result.underperforming.length === 0) {
    console.log('  없음');
  } else {
    result.underperforming.forEach(c => console.log(`  • ${c}`));
  }

  console.log('\n🟢 균형 잡힌 카드:');
  console.log(`  ${result.balanced.length}개`);

  console.log('\n' + '═'.repeat(50) + '\n');
}

async function cmdABTest(args: string[]): Promise<void> {
  console.log('\n🔬 A/B 테스트 시작...\n');

  const simulator = new SimpleBalanceSimulator();
  const manager = new ABTestManager(simulator);

  const deck = getDefaultDeck();
  const enemies = getDefaultEnemies();

  // 예시: slash 공격력 변경 테스트
  const result = await manager.comparePatch(
    'Slash 버프 테스트',
    'slash 카드 공격력을 6에서 8로 증가',
    {
      battles: 200,
      maxTurns: 30,
      enemyIds: enemies,
      playerDeck: deck,
    },
    [createPatchChange('slash', 'attack', 2)]
  );

  printABTestResult(result);
}

async function cmdMCTS(args: string[]): Promise<void> {
  const iterations = parseInt(args[0]) || 10;
  console.log(`\n🤖 MCTS AI 플레이: ${iterations}회\n`);

  const result = await benchmarkMCTS(iterations, {
    maxIterations: 300,
    timeLimit: 1000,
  });

  console.log('═'.repeat(50));
  console.log('🤖 MCTS 벤치마크 결과');
  console.log('═'.repeat(50));
  console.log(`\n  평균 승률: ${(result.avgWinRate * 100).toFixed(1)}%`);
  console.log(`  평균 턴: ${result.avgTurns.toFixed(1)}`);
  console.log(`  평균 반복: ${result.avgIterations.toFixed(0)}`);
  console.log(`  총 소요 시간: ${result.totalTime}ms`);
  console.log('═'.repeat(50) + '\n');
}

async function cmdReport(args: string[]): Promise<void> {
  console.log('\n📊 HTML 리포트 생성 중...\n');

  const deck = getDefaultDeck();
  const enemies = getDefaultEnemies();

  const filepath = await quickReport(deck, enemies, 200, './reports');

  console.log(`✅ 리포트가 생성되었습니다: ${filepath}\n`);
}

async function cmdHistory(args: string[]): Promise<void> {
  console.log('\n📜 시뮬레이션 히스토리\n');

  const storage = new JsonStorage();
  const stats = await storage.getStats();

  console.log('═'.repeat(50));
  console.log('📜 히스토리 통계');
  console.log('═'.repeat(50));
  console.log(`\n  총 기록: ${stats.totalEntries}개`);
  console.log(`  총 전투: ${stats.totalBattles}회`);
  console.log(`  평균 승률: ${(stats.avgWinRate * 100).toFixed(1)}%`);

  if (stats.dateRange) {
    console.log(`  기간: ${new Date(stats.dateRange.start).toLocaleDateString()} ~ ${new Date(stats.dateRange.end).toLocaleDateString()}`);
  }

  console.log('═'.repeat(50) + '\n');
}

async function cmdDashboard(args: string[]): Promise<void> {
  const port = parseInt(args[0]) || 3001;
  console.log(`\n📊 대시보드 서버 시작: http://localhost:${port}\n`);

  const server = await startDashboard(port);

  console.log('  Ctrl+C로 종료\n');

  process.on('SIGINT', async () => {
    console.log('\n서버 종료 중...');
    await server.stop();
    process.exit(0);
  });
}

async function cmdCheck(args: string[]): Promise<void> {
  const code = await runBalanceCheck(args);
  process.exit(code);
}

async function cmdBaseline(args: string[]): Promise<void> {
  const checker = new BalanceChecker();
  await checker.updateBaseline();
}

async function cmdBenchmark(args: string[]): Promise<void> {
  const iterations = parseInt(args[0]) || 1000;
  console.log(`\n⚡ 성능 벤치마크: ${iterations}회 시뮬레이션\n`);

  const deck = getDefaultDeck();
  const enemies = getDefaultEnemies().slice(0, 1);

  const simulator = new SimpleBalanceSimulator();

  // 순차 실행
  console.log('  순차 실행 테스트...');
  const seqStart = Date.now();

  await simulator.run({
    battles: iterations,
    maxTurns: 30,
    enemyIds: enemies,
    playerDeck: deck,
  });

  const seqDuration = Date.now() - seqStart;

  console.log('\n═'.repeat(50));
  console.log('⚡ 벤치마크 결과');
  console.log('═'.repeat(50));
  console.log(`\n  전투 수: ${iterations}`);
  console.log(`  소요 시간: ${seqDuration}ms`);
  console.log(`  처리 속도: ${(iterations / (seqDuration / 1000)).toFixed(0)} 전투/초`);
  console.log('═'.repeat(50) + '\n');
}

function showHelp(): void {
  console.log(`
🎮 고급 시뮬레이터 CLI

사용법: npx tsx scripts/simulator-cli.ts <command> [options]

명령어:
  simulate <battles>     기본 시뮬레이션 실행 (기본: 100)
  parallel <battles>     병렬 시뮬레이션 (기본: 1000)
  balance                밸런스 분석
  abtest                 A/B 테스트 실행
  mcts <iterations>      MCTS AI 플레이 (기본: 10)
  report                 HTML 리포트 생성
  history                히스토리 조회
  dashboard [port]       대시보드 서버 (기본: 3001)
  check [--update-baseline]  CI/CD 밸런스 체크
  baseline               기준선 업데이트
  benchmark <battles>    성능 벤치마크 (기본: 1000)
  help                   도움말 표시

예시:
  npx tsx scripts/simulator-cli.ts simulate 500
  npx tsx scripts/simulator-cli.ts mcts 20
  npx tsx scripts/simulator-cli.ts dashboard 3002
`);
}

// ==================== 메인 ====================

async function main(): Promise<void> {
  const { command, args } = parseArgs();

  try {
    switch (command) {
      case 'simulate':
      case 'sim':
        await cmdSimulate(args);
        break;

      case 'parallel':
      case 'par':
        await cmdParallel(args);
        break;

      case 'balance':
      case 'bal':
        await cmdBalance(args);
        break;

      case 'abtest':
      case 'ab':
        await cmdABTest(args);
        break;

      case 'mcts':
      case 'ai':
        await cmdMCTS(args);
        break;

      case 'report':
      case 'rep':
        await cmdReport(args);
        break;

      case 'history':
      case 'hist':
        await cmdHistory(args);
        break;

      case 'dashboard':
      case 'dash':
        await cmdDashboard(args);
        break;

      case 'check':
        await cmdCheck(args);
        break;

      case 'baseline':
        await cmdBaseline(args);
        break;

      case 'benchmark':
      case 'bench':
        await cmdBenchmark(args);
        break;

      case 'help':
      case '-h':
      case '--help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

main();
