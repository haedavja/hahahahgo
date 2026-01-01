/**
 * 전체 게임 시뮬레이션 테스트
 */
import { createGameSimulator } from '../game/index.js';

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
  console.log('획득 카드: ' + run.totalCardsGained);
  console.log('이벤트: ' + run.eventsCompleted);
  console.log('상점: ' + run.shopsVisited);
  console.log('휴식: ' + run.restsUsed);
  if (!run.success && run.deathCause) {
    console.log('사망 원인: ' + run.deathCause);
  }

  // 다중 런 테스트 (전략별)
  console.log('\n▶ 다중 런 시뮬레이션 (50회 x 3전략)');

  const strategies = ['aggressive', 'balanced', 'defensive'] as const;

  for (const strategy of strategies) {
    const stats = simulator.simulateMultipleRuns(50, { strategy });
    console.log('\n[' + strategy + ' 전략]');
    console.log('  승률: ' + (stats.successRate * 100).toFixed(1) + '%');
    console.log('  평균 레이어: ' + stats.averageLayersCompleted.toFixed(1));
    console.log('  평균 HP: ' + stats.averageFinalHp.toFixed(1));
    console.log('  평균 전투 승률: ' + (stats.averageBattleWinRate * 100).toFixed(1) + '%');
  }

  // 난이도별 테스트
  console.log('\n▶ 난이도별 밸런스 테스트 (각 30회)');
  const balanceTest = simulator.runBalanceTest({
    runs: 30,
    difficulties: [1, 2, 3, 4, 5]
  });

  console.log('\n[난이도별 승률]');
  for (const [diff, stats] of Object.entries(balanceTest)) {
    console.log('  난이도 ' + diff + ': ' + (stats.successRate * 100).toFixed(1) + '%');
  }

  console.log('\n=== 시뮬레이션 완료 ===');
}

main().catch(console.error);
