#!/usr/bin/env npx ts-node
/**
 * @file balance-check.ts
 * @description CI/CD용 밸런스 체크 스크립트
 *
 * 사용법:
 *   npx ts-node scripts/balance-check.ts
 *   npm run balance-check
 *
 * 종료 코드:
 *   0: 밸런스 정상
 *   1: 밸런스 경고 (승률이 임계값 벗어남)
 *   2: 치명적 오류
 */

import { syncAllCards, syncAllEnemies } from '../src/simulator/data/game-data-sync';
import { createTimelineBattleEngine } from '../src/simulator/core/timeline-battle-engine';
import type { EnemyState } from '../src/simulator/core/game-types';

// ==================== 설정 ====================

interface BalanceConfig {
  battlesPerEnemy: number;
  minWinRate: number;
  maxWinRate: number;
  warnWinRate: { min: number; max: number };
}

const CONFIG: BalanceConfig = {
  battlesPerEnemy: 100,
  minWinRate: 0.30, // 30% 미만이면 에러
  maxWinRate: 0.95, // 95% 초과면 에러
  warnWinRate: {
    min: 0.40, // 40% 미만이면 경고
    max: 0.80, // 80% 초과면 경고
  },
};

// ==================== 테스트 덱 ====================

const TEST_DECKS = {
  starter: [
    'shoot',
    'shoot',
    'strike',
    'strike',
    'strike',
    'reload',
    'quarte',
    'octave',
    'breach',
    'deflect',
  ],
  balanced: [
    'shoot',
    'shoot',
    'strike',
    'strike',
    'reload',
    'quarte',
    'octave',
    'breach',
    'deflect',
    'deflect',
  ],
};

// ==================== 결과 타입 ====================

interface EnemyResult {
  enemyId: string;
  enemyName: string;
  battles: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  avgTurns: number;
  status: 'ok' | 'warn' | 'error';
  message?: string;
}

interface BalanceCheckResult {
  timestamp: string;
  config: BalanceConfig;
  results: EnemyResult[];
  summary: {
    totalEnemies: number;
    passed: number;
    warnings: number;
    errors: number;
    overallWinRate: number;
  };
  exitCode: 0 | 1 | 2;
}

// ==================== 유틸리티 ====================

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function colorize(text: string, color: 'green' | 'yellow' | 'red' | 'cyan' | 'reset'): string {
  const colors: Record<string, string> = {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
  };
  return `${colors[color]}${text}${colors.reset}`;
}

// ==================== 메인 로직 ====================

async function runBalanceCheck(): Promise<BalanceCheckResult> {
  console.log(colorize('\n╔════════════════════════════════════════╗', 'cyan'));
  console.log(colorize('║       밸런스 체크 시작                    ║', 'cyan'));
  console.log(colorize('╚════════════════════════════════════════╝\n', 'cyan'));

  const engine = createTimelineBattleEngine({
    enableCrits: true,
    enableCombos: true,
    enableRelics: true,
    enableAnomalies: false,
    enableTimeline: true,
    verbose: false,
    maxTurns: 30,
  });

  const enemies = syncAllEnemies();
  const results: EnemyResult[] = [];

  // Tier 1-2 적들만 테스트 (보스 제외)
  const testEnemyIds = ['ghoul', 'marauder', 'wildrat', 'berserker', 'polluted', 'deserter', 'slurthim'];

  for (const enemyId of testEnemyIds) {
    const enemyData = enemies[enemyId];
    if (!enemyData) {
      console.log(colorize(`⚠ ${enemyId} 데이터 없음, 스킵`, 'yellow'));
      continue;
    }

    const enemy: EnemyState = {
      id: enemyId,
      name: (enemyData as { name?: string }).name || enemyId,
      hp: (enemyData as { hp?: number; maxHp?: number }).hp || (enemyData as { maxHp?: number }).maxHp || 50,
      maxHp: (enemyData as { maxHp?: number }).maxHp || 50,
      block: 0,
      tokens: {},
      deck: (enemyData as { deck?: string[] }).deck || [],
      tier: (enemyData as { tier?: number }).tier || 1,
      cardsPerTurn: (enemyData as { cardsPerTurn?: number }).cardsPerTurn || 2,
      isBoss: false,
      intent: 'attack',
    };

    let wins = 0;
    let losses = 0;
    let draws = 0;
    let totalTurns = 0;

    process.stdout.write(`  ${enemyId.padEnd(15)} `);

    for (let i = 0; i < CONFIG.battlesPerEnemy; i++) {
      const result = engine.runBattle(TEST_DECKS.starter, [], { ...enemy, hp: enemy.maxHp, block: 0, tokens: {} });

      if (result.winner === 'player') wins++;
      else if (result.winner === 'enemy') losses++;
      else draws++;

      totalTurns += result.turns;
    }

    const winRate = wins / CONFIG.battlesPerEnemy;
    const avgTurns = totalTurns / CONFIG.battlesPerEnemy;

    let status: 'ok' | 'warn' | 'error' = 'ok';
    let message: string | undefined;

    if (winRate < CONFIG.minWinRate) {
      status = 'error';
      message = `승률 너무 낮음 (${formatPercent(winRate)} < ${formatPercent(CONFIG.minWinRate)})`;
    } else if (winRate > CONFIG.maxWinRate) {
      status = 'error';
      message = `승률 너무 높음 (${formatPercent(winRate)} > ${formatPercent(CONFIG.maxWinRate)})`;
    } else if (winRate < CONFIG.warnWinRate.min) {
      status = 'warn';
      message = `승률 낮음 (${formatPercent(winRate)})`;
    } else if (winRate > CONFIG.warnWinRate.max) {
      status = 'warn';
      message = `승률 높음 (${formatPercent(winRate)})`;
    }

    const statusIcon = status === 'ok' ? '✓' : status === 'warn' ? '⚠' : '✗';
    const statusColor = status === 'ok' ? 'green' : status === 'warn' ? 'yellow' : 'red';

    console.log(
      colorize(statusIcon, statusColor),
      `승률: ${formatPercent(winRate).padStart(6)}`,
      `평균턴: ${avgTurns.toFixed(1).padStart(4)}`,
      message ? colorize(`  ${message}`, statusColor) : ''
    );

    results.push({
      enemyId,
      enemyName: enemy.name,
      battles: CONFIG.battlesPerEnemy,
      wins,
      losses,
      draws,
      winRate,
      avgTurns,
      status,
      message,
    });
  }

  // 요약
  const passed = results.filter((r) => r.status === 'ok').length;
  const warnings = results.filter((r) => r.status === 'warn').length;
  const errors = results.filter((r) => r.status === 'error').length;
  const totalWins = results.reduce((sum, r) => sum + r.wins, 0);
  const totalBattles = results.reduce((sum, r) => sum + r.battles, 0);
  const overallWinRate = totalWins / totalBattles;

  console.log(colorize('\n────────────────────────────────────────', 'cyan'));
  console.log('📊 요약:');
  console.log(`   총 적: ${results.length}`);
  console.log(`   ${colorize(`통과: ${passed}`, 'green')}`);
  console.log(`   ${colorize(`경고: ${warnings}`, 'yellow')}`);
  console.log(`   ${colorize(`오류: ${errors}`, 'red')}`);
  console.log(`   전체 승률: ${formatPercent(overallWinRate)}`);

  const exitCode: 0 | 1 | 2 = errors > 0 ? 2 : warnings > 0 ? 1 : 0;

  if (exitCode === 0) {
    console.log(colorize('\n✓ 밸런스 체크 통과!\n', 'green'));
  } else if (exitCode === 1) {
    console.log(colorize('\n⚠ 밸런스 경고 발생\n', 'yellow'));
  } else {
    console.log(colorize('\n✗ 밸런스 오류 발생!\n', 'red'));
  }

  return {
    timestamp: new Date().toISOString(),
    config: CONFIG,
    results,
    summary: {
      totalEnemies: results.length,
      passed,
      warnings,
      errors,
      overallWinRate,
    },
    exitCode,
  };
}

// ==================== 실행 ====================

runBalanceCheck()
  .then((result) => {
    // JSON 결과 출력 (CI에서 파싱 가능)
    if (process.env.CI) {
      console.log('\n::group::Balance Check JSON Result');
      console.log(JSON.stringify(result, null, 2));
      console.log('::endgroup::');
    }
    process.exit(result.exitCode);
  })
  .catch((error) => {
    console.error(colorize('치명적 오류:', 'red'), error);
    process.exit(2);
  });
