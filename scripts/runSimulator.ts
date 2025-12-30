#!/usr/bin/env npx tsx
/**
 * @file runSimulator.ts
 * @description 게임 시뮬레이터 CLI 실행 스크립트
 *
 * 사용법:
 *   npx tsx scripts/runSimulator.ts [battles] [enemies...]
 *   npx tsx scripts/runSimulator.ts balance [battles]     # 밸런스 분석
 *   npx tsx scripts/runSimulator.ts tier [1|2|3] [battles] # 티어별 시뮬
 *   npx tsx scripts/runSimulator.ts full [battles]        # 전체 시뮬
 *   npx tsx scripts/runSimulator.ts relic [battles]       # 상징 효과 비교
 *
 * 예시:
 *   npx tsx scripts/runSimulator.ts 100
 *   npx tsx scripts/runSimulator.ts 200 ghoul marauder
 *   npx tsx scripts/runSimulator.ts balance 50
 *   npx tsx scripts/runSimulator.ts tier 2 100
 *   npx tsx scripts/runSimulator.ts full 30
 *   npx tsx scripts/runSimulator.ts relic 100
 */

import { runSimulation, printStats, SimulationConfig, runBalanceAnalysis, runTierSimulation, runFullSimulation, runRelicComparison, TIER_1_ENEMIES, TIER_2_ENEMIES, TIER_3_ENEMIES } from '../src/tests/gameSimulator';
import { ENEMIES } from '../src/components/battle/battleData';

// 커맨드 라인 인자 파싱
const args = process.argv.slice(2);
const command = args[0];

// 특수 명령어 처리
if (command === 'balance') {
  const battles = parseInt(args[1]) || 100;
  console.log('🎮 밸런스 분석 모드\n');
  runBalanceAnalysis(battles);
  process.exit(0);
}

if (command === 'tier') {
  const tier = parseInt(args[1]) as 1 | 2 | 3;
  const battles = parseInt(args[2]) || 100;
  if (![1, 2, 3].includes(tier)) {
    console.error('❌ 티어는 1, 2, 3 중 하나여야 합니다.');
    process.exit(1);
  }
  runTierSimulation(tier, battles);
  process.exit(0);
}

if (command === 'full') {
  const battlesPerEnemy = parseInt(args[1]) || 50;
  runFullSimulation(battlesPerEnemy);
  process.exit(0);
}

if (command === 'relic') {
  const battles = parseInt(args[1]) || 50;
  console.log('🎮 상징 효과 비교 모드\n');
  runRelicComparison(battles);
  process.exit(0);
}

// 기본 모드
const battles = parseInt(args[0]) || 100;
const enemyIds = args.slice(1).length > 0 ? args.slice(1) : undefined;

console.log('🎮 게임 시뮬레이터 시작\n');
console.log(`설정:`);
console.log(`  - 전투 횟수: ${battles}`);
console.log(`  - 대상 적: ${enemyIds?.join(', ') || '모든 Tier 1-2 적'}`);
console.log('');

// 시뮬레이션 설정
const config: SimulationConfig = {
  battles,
  maxTurns: 50,
  enemyIds: enemyIds || ['ghoul', 'marauder', 'wildrat', 'berserker', 'polluted', 'slurthim', 'deserter', 'hunter'],
  verbose: false,
};

// 시뮬레이션 실행
console.log('⏳ 시뮬레이션 실행 중...\n');
const startTime = Date.now();
const stats = runSimulation(config);
const elapsed = Date.now() - startTime;

// 결과 출력
printStats(stats);

// 추가 분석
console.log('📈 상세 분석:');
console.log('─────────────────────────────────────────');

// 적별 상세 분석
console.log('\n👾 적별 상세 분석:');
const sortedEnemies = Object.entries(stats.enemyStats)
  .sort((a, b) => a[1].winRate - b[1].winRate);

for (const [enemyId, enemyStat] of sortedEnemies) {
  const enemy = ENEMIES.find(e => e.id === enemyId);
  const name = enemy?.name || enemyId;
  const hp = enemy?.hp || '?';
  const tier = enemy?.tier || '?';

  const winPercent = (enemyStat.winRate * 100).toFixed(1);
  const difficultyRating = enemyStat.winRate > 0.9 ? '⭐ 쉬움' :
    enemyStat.winRate > 0.7 ? '⭐⭐ 보통' :
    enemyStat.winRate > 0.5 ? '⭐⭐⭐ 어려움' :
    enemyStat.winRate > 0.3 ? '⭐⭐⭐⭐ 매우 어려움' :
    '⭐⭐⭐⭐⭐ 극도로 어려움';

  console.log(`  ${name} (Tier ${tier}, HP ${hp})`);
  console.log(`    승률: ${winPercent}% | 난이도: ${difficultyRating}`);
}

// 전체 밸런스 평가
console.log('\n⚖️ 전체 밸런스 평가:');
const overallRating = stats.winRate > 0.8 ? '플레이어 유리 (적 강화 필요)' :
  stats.winRate > 0.6 ? '약간 플레이어 유리' :
  stats.winRate > 0.4 ? '균형 잡힘' :
  stats.winRate > 0.2 ? '약간 적 유리' :
  '적 유리 (플레이어 강화 필요)';

console.log(`  전체 승률 ${(stats.winRate * 100).toFixed(1)}%: ${overallRating}`);
console.log(`  평균 전투 시간: ${stats.avgTurns.toFixed(1)}턴`);

const paceRating = stats.avgTurns < 3 ? '매우 빠름 (밸런스 확인 필요)' :
  stats.avgTurns < 5 ? '빠름' :
  stats.avgTurns < 10 ? '적당함' :
  stats.avgTurns < 15 ? '느림' :
  '매우 느림';
console.log(`  전투 페이스: ${paceRating}`);

// 콤보 통계
if (Object.keys(stats.comboStats).length > 0) {
  console.log('\n🃏 콤보 발생 빈도:');
  const sortedCombos = Object.entries(stats.comboStats)
    .sort((a, b) => b[1].count - a[1].count);
  for (const [comboName, comboStat] of sortedCombos) {
    console.log(`  ${comboName}: ${comboStat.count}회 (전투당 ${comboStat.avgPerBattle.toFixed(2)})`);
  }
}

// 실행 시간
console.log(`\n⏱️ 실행 시간: ${elapsed}ms (${(elapsed / battles).toFixed(2)}ms/전투)`);
console.log('─────────────────────────────────────────\n');
