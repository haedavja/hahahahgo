#!/usr/bin/env npx tsx
/**
 * @file runSimulator.ts
 * @description 게임 시뮬레이터 CLI 실행 스크립트
 *
 * 사용법:
 *   npx tsx scripts/runSimulator.ts [battles] [enemies...]
 *
 * 예시:
 *   npx tsx scripts/runSimulator.ts 100
 *   npx tsx scripts/runSimulator.ts 200 ghoul marauder
 *   npx tsx scripts/runSimulator.ts 500 deserter slaughterer
 */

import { runSimulation, printStats, SimulationConfig } from '../src/tests/gameSimulator';
import { ENEMIES } from '../src/components/battle/battleData';

// 커맨드 라인 인자 파싱
const args = process.argv.slice(2);
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

// 실행 시간
console.log(`\n⏱️ 실행 시간: ${elapsed}ms (${(elapsed / battles).toFixed(2)}ms/전투)`);
console.log('─────────────────────────────────────────\n');
