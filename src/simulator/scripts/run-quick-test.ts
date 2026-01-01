/**
 * 빠른 게임 시뮬레이션 테스트
 */
import { createGameSimulator } from '../game/index.js';
import { setLogLevel, LogLevel } from '../core/logger.js';

// 로그 비활성화
setLogLevel(LogLevel.ERROR);

async function main() {
  console.log('=== 전체 게임 시뮬레이션 ===\n');

  const simulator = await createGameSimulator();

  // 단일 런 테스트
  console.log('▶ 단일 런 시뮬레이션');
  const run = simulator.simulateRun({ verbose: false });
  console.log('결과: ' + (run.success ? '승리!' : '패배'));
  console.log('도달 레이어: ' + run.finalLayer + '/11');
  console.log('최종 HP: ' + run.finalPlayerState.hp + '/' + run.finalPlayerState.maxHp);
  console.log('전투: 승 ' + run.battlesWon + ' / 패 ' + run.battlesLost);
  console.log('획득 골드: ' + run.totalGoldEarned);

  // 다중 런 테스트 (전략별 - 20회씩)
  console.log('\n▶ 다중 런 시뮬레이션 (20회 x 3전략)');

  const strategies = ['aggressive', 'balanced', 'defensive'] as const;

  for (const strategy of strategies) {
    const stats = simulator.simulateMultipleRuns(20, { strategy });
    console.log('[' + strategy + '] 승률: ' + (stats.successRate * 100).toFixed(0) + '% | 평균 HP: ' + stats.averageFinalHp.toFixed(0));
  }

  // 난이도별 테스트
  console.log('\n▶ 난이도별 테스트 (각 10회)');
  const balanceTest = simulator.runBalanceTest({
    runs: 10,
    difficulties: [1, 2, 3]
  });

  for (const [diff, stats] of Object.entries(balanceTest)) {
    console.log('난이도 ' + diff + ': 승률 ' + (stats.successRate * 100).toFixed(0) + '%');
  }

  console.log('\n=== 시뮬레이션 완료 ===');
}

main().catch(console.error);
