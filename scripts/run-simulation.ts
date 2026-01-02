/**
 * 게임 시뮬레이터 실행 스크립트
 */
import { GameSimulator, createDefaultPlayer, RunSimulator } from '../src/simulator/game/index.js';

async function runSimulation() {
  console.log('='.repeat(60));
  console.log('🎮 하하하GO 전체 게임 시뮬레이션 결과');
  console.log('='.repeat(60));

  const simulator = new GameSimulator();
  await simulator.initialize(); // 게임 데이터 로드

  // 1. 단일 런 시뮬레이션
  console.log('\n📊 [1] 단일 런 시뮬레이션 (11레이어, balanced 전략)');
  console.log('-'.repeat(50));

  const singleRun = simulator.simulateRun({
    difficulty: 1,
    mapLayers: 11,
    strategy: 'balanced',
  });

  console.log('  결과:', singleRun.success ? '✅ 보스 클리어!' : '❌ 사망');
  if (!singleRun.success) console.log('  사망 원인:', singleRun.deathCause);
  console.log('  도달 레이어:', singleRun.finalLayer, '/ 11');
  console.log('  방문 노드:', singleRun.nodesVisited, '개');
  console.log('  전투:', singleRun.battlesWon, '승 /', singleRun.battlesLost, '패');
  console.log('  이벤트:', singleRun.eventsCompleted, '회');
  console.log('  상점:', singleRun.shopsVisited, '회');
  console.log('  휴식:', singleRun.restsUsed, '회');
  console.log('  던전:', singleRun.dungeonsCleared, '클리어');
  console.log('  획득 골드:', singleRun.totalGoldEarned);
  console.log('  획득 카드:', singleRun.totalCardsGained, '장');
  console.log('  최종 HP:', singleRun.finalPlayerState.hp, '/', singleRun.finalPlayerState.maxHp);
  console.log('  최종 덱:', singleRun.finalPlayerState.deck.length, '장');
  console.log('  최종 상징:', singleRun.finalPlayerState.relics.length, '개');

  // 2. 다중 런 통계 (100회)
  console.log('\n📊 [2] 다중 런 통계 (100회, balanced 전략)');
  console.log('-'.repeat(50));

  const multiStats = simulator.simulateMultipleRuns(100, {
    difficulty: 1,
    mapLayers: 11,
    strategy: 'balanced',
  });

  console.log('  총 런:', multiStats.totalRuns, '회');
  console.log('  성공률:', (multiStats.successRate * 100).toFixed(1) + '%');
  console.log('  평균 도달 레이어:', multiStats.avgFinalLayer.toFixed(1));
  console.log('  평균 전투 승리:', multiStats.avgBattlesWon.toFixed(1));
  console.log('  평균 획득 골드:', multiStats.avgGoldEarned.toFixed(0));
  console.log('  평균 덱 크기:', multiStats.avgCardsInDeck.toFixed(1), '장');

  if (Object.keys(multiStats.deathCauses).length > 0) {
    console.log('  사망 원인:');
    for (const [cause, count] of Object.entries(multiStats.deathCauses)) {
      console.log('    -', cause + ':', count, '회');
    }
  }

  // 3. 난이도별 밸런스 테스트
  console.log('\n📊 [3] 난이도별 밸런스 테스트 (각 50회)');
  console.log('-'.repeat(50));

  const balanceTest = simulator.runBalanceTest({
    runs: 50,
    difficulties: [1, 2, 3, 4, 5],
  });

  console.log('  난이도 | 성공률  | 평균 레이어');
  console.log('  ' + '-'.repeat(35));
  for (const [diff, stats] of Object.entries(balanceTest)) {
    const sr = (stats.successRate * 100).toFixed(1).padStart(5);
    console.log('    ', diff, '   |', sr + '%  |', stats.avgFinalLayer.toFixed(1));
  }

  // 4. 전략 비교
  console.log('\n📊 [4] 전략별 비교 (각 50회, 난이도 1)');
  console.log('-'.repeat(50));

  const runSim = new RunSimulator();
  await runSim.loadGameData(); // 게임 데이터 로드
  const strategies = ['aggressive', 'defensive', 'balanced', 'speedrun', 'treasure_hunter'] as const;

  console.log('  전략           | 성공률  | 평균 레이어');
  console.log('  ' + '-'.repeat(40));

  for (const strategy of strategies) {
    const stats = runSim.simulateMultipleRuns({
      initialPlayer: createDefaultPlayer(),
      difficulty: 1,
      strategy,
      mapLayers: 11,
    }, 50);

    const sr = (stats.successRate * 100).toFixed(1).padStart(5);
    console.log(' ', strategy.padEnd(15), '|', sr + '%  |', stats.avgFinalLayer.toFixed(1));
  }

  console.log('\n' + '='.repeat(60));
  console.log('시뮬레이션 완료!');
}

runSimulation().catch(console.error);
