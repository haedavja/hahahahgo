/**
 * @file balance-check.ts
 * @description CI/CD 밸런스 체크 - PR마다 밸런스 영향도 자동 체크
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type {
  BalanceCheckResult,
  BalanceWarning,
  BalanceError,
  SimulationConfig,
} from '../core/types';
import { loadCards, loadEnemies, loadPresets, type CardData } from '../data/loader';
import { SimpleBalanceSimulator, type SimulatorInterface } from '../analysis/balance';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==================== 밸런스 체크 설정 ====================

export interface BalanceCheckConfig {
  // 승률 변화 임계값
  winRateShiftWarning: number;  // 경고 (기본 5%)
  winRateShiftError: number;    // 오류 (기본 10%)

  // 카드 지배력 임계값
  cardDominanceThreshold: number;  // 한 카드가 너무 강할 때

  // 적 난이도 범위
  enemyWinRateMin: number;  // 너무 쉬움 경고
  enemyWinRateMax: number;  // 너무 어려움 경고

  // 시뮬레이션 설정
  battlesPerTest: number;
  maxTurns: number;

  // 기준선 파일 경로
  baselinePath: string;
}

const defaultConfig: BalanceCheckConfig = {
  winRateShiftWarning: 0.05,
  winRateShiftError: 0.10,
  cardDominanceThreshold: 0.80,
  enemyWinRateMin: 0.30,
  enemyWinRateMax: 0.70,
  battlesPerTest: 50,
  maxTurns: 30,
  baselinePath: join(__dirname, '../../data/baseline.json'),
};

// ==================== 기준선 타입 ====================

interface Baseline {
  version: string;
  timestamp: number;
  commit: string;
  cardWinRates: Record<string, number>;
  enemyWinRates: Record<string, number>;
  presetWinRates: Record<string, number>;
  overallWinRate: number;
}

// ==================== 밸런스 체커 ====================

export class BalanceChecker {
  private config: BalanceCheckConfig;
  private simulator: SimulatorInterface;
  private baseline: Baseline | null = null;

  constructor(config: Partial<BalanceCheckConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.simulator = new SimpleBalanceSimulator();
    this.loadBaseline();
  }

  private loadBaseline(): void {
    if (existsSync(this.config.baselinePath)) {
      try {
        this.baseline = JSON.parse(readFileSync(this.config.baselinePath, 'utf-8'));
      } catch {
        console.warn('기준선 파일 로드 실패');
        this.baseline = null;
      }
    }
  }

  // ==================== 메인 체크 ====================

  async runCheck(): Promise<BalanceCheckResult> {
    console.log('🔍 밸런스 체크 시작...\n');

    const warnings: BalanceWarning[] = [];
    const errors: BalanceError[] = [];

    // 현재 상태 측정
    const currentState = await this.measureCurrentState();

    // 기준선과 비교
    if (this.baseline) {
      // 승률 변화 체크
      const winRateIssues = this.checkWinRateShifts(currentState);
      warnings.push(...winRateIssues.warnings);
      errors.push(...winRateIssues.errors);

      // 카드 지배력 체크
      const dominanceIssues = this.checkCardDominance(currentState);
      warnings.push(...dominanceIssues);

      // 적 난이도 체크
      const difficultyIssues = this.checkEnemyDifficulty(currentState);
      warnings.push(...difficultyIssues);
    } else {
      warnings.push({
        type: 'winrate_shift',
        message: '기준선이 없습니다. 첫 실행인 경우 --update-baseline 옵션을 사용하세요.',
        severity: 'low',
        details: {},
      });
    }

    // 리포트 생성
    const report = this.generateReport(warnings, errors, currentState);

    // 결과 판정
    const passed = errors.length === 0;

    console.log(report);

    return {
      passed,
      warnings,
      errors,
      report,
    };
  }

  // ==================== 상태 측정 ====================

  private async measureCurrentState(): Promise<CurrentState> {
    const cards = loadCards();
    const enemies = loadEnemies();
    const presets = loadPresets();

    const state: CurrentState = {
      cardWinRates: {},
      enemyWinRates: {},
      presetWinRates: {},
      overallWinRate: 0,
    };

    const allEnemyIds = Object.keys(enemies).slice(0, 5);  // 상위 5개 적

    console.log('  📊 프리셋 승률 측정...');

    // 프리셋별 승률
    for (const [presetId, preset] of Object.entries(presets)) {
      let totalWinRate = 0;

      for (const enemyId of allEnemyIds) {
        const config: SimulationConfig = {
          battles: this.config.battlesPerTest,
          maxTurns: this.config.maxTurns,
          enemyIds: [enemyId],
          playerDeck: preset.cards,
        };

        const result = await this.simulator.run(config);
        totalWinRate += result.summary.winRate;
      }

      state.presetWinRates[presetId] = totalWinRate / allEnemyIds.length;
    }

    console.log('  📊 적 승률 측정...');

    // 적별 승률 (기본 덱 기준)
    const defaultDeck = presets['balanced']?.cards || Object.values(presets)[0]?.cards || [];

    for (const enemyId of allEnemyIds) {
      const config: SimulationConfig = {
        battles: this.config.battlesPerTest,
        maxTurns: this.config.maxTurns,
        enemyIds: [enemyId],
        playerDeck: defaultDeck,
      };

      const result = await this.simulator.run(config);
      state.enemyWinRates[enemyId] = result.summary.winRate;
    }

    // 전체 평균 승률
    const presetRates = Object.values(state.presetWinRates);
    state.overallWinRate = presetRates.length > 0
      ? presetRates.reduce((a, b) => a + b, 0) / presetRates.length
      : 0.5;

    return state;
  }

  // ==================== 체크 로직 ====================

  private checkWinRateShifts(current: CurrentState): {
    warnings: BalanceWarning[];
    errors: BalanceError[];
  } {
    const warnings: BalanceWarning[] = [];
    const errors: BalanceError[] = [];

    if (!this.baseline) return { warnings, errors };

    // 전체 승률 변화
    const overallShift = Math.abs(current.overallWinRate - this.baseline.overallWinRate);

    if (overallShift >= this.config.winRateShiftError) {
      errors.push({
        type: 'critical_imbalance',
        message: `전체 승률이 ${(overallShift * 100).toFixed(1)}% 변화했습니다.`,
        details: {
          before: this.baseline.overallWinRate,
          after: current.overallWinRate,
          shift: overallShift,
        },
      });
    } else if (overallShift >= this.config.winRateShiftWarning) {
      warnings.push({
        type: 'winrate_shift',
        message: `전체 승률이 ${(overallShift * 100).toFixed(1)}% 변화했습니다.`,
        severity: 'medium',
        details: {
          before: this.baseline.overallWinRate,
          after: current.overallWinRate,
        },
      });
    }

    // 프리셋별 승률 변화
    for (const [presetId, winRate] of Object.entries(current.presetWinRates)) {
      const baselineRate = this.baseline.presetWinRates[presetId];
      if (baselineRate === undefined) continue;

      const shift = Math.abs(winRate - baselineRate);

      if (shift >= this.config.winRateShiftWarning) {
        warnings.push({
          type: 'winrate_shift',
          message: `프리셋 "${presetId}" 승률이 ${(shift * 100).toFixed(1)}% 변화했습니다.`,
          severity: shift >= this.config.winRateShiftError ? 'high' : 'medium',
          details: { presetId, before: baselineRate, after: winRate },
        });
      }
    }

    return { warnings, errors };
  }

  private checkCardDominance(current: CurrentState): BalanceWarning[] {
    const warnings: BalanceWarning[] = [];

    // 한 프리셋이 너무 강한지 체크
    const rates = Object.entries(current.presetWinRates);
    const maxRate = Math.max(...rates.map(([, r]) => r));

    if (maxRate >= this.config.cardDominanceThreshold) {
      const dominant = rates.find(([, r]) => r === maxRate);
      warnings.push({
        type: 'card_dominance',
        message: `프리셋 "${dominant?.[0]}"이 너무 강합니다 (승률 ${(maxRate * 100).toFixed(1)}%).`,
        severity: 'high',
        details: { preset: dominant?.[0], winRate: maxRate },
      });
    }

    return warnings;
  }

  private checkEnemyDifficulty(current: CurrentState): BalanceWarning[] {
    const warnings: BalanceWarning[] = [];

    for (const [enemyId, winRate] of Object.entries(current.enemyWinRates)) {
      if (winRate > this.config.enemyWinRateMax) {
        warnings.push({
          type: 'enemy_too_easy',
          message: `적 "${enemyId}"이 너무 쉽습니다 (플레이어 승률 ${(winRate * 100).toFixed(1)}%).`,
          severity: 'medium',
          details: { enemyId, winRate },
        });
      } else if (winRate < this.config.enemyWinRateMin) {
        warnings.push({
          type: 'enemy_too_hard',
          message: `적 "${enemyId}"이 너무 어렵습니다 (플레이어 승률 ${(winRate * 100).toFixed(1)}%).`,
          severity: 'medium',
          details: { enemyId, winRate },
        });
      }
    }

    return warnings;
  }

  // ==================== 기준선 업데이트 ====================

  async updateBaseline(): Promise<void> {
    console.log('📝 기준선 업데이트 중...\n');

    const currentState = await this.measureCurrentState();

    let commit = 'unknown';
    try {
      commit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    } catch {
      // git 없으면 무시
    }

    const baseline: Baseline = {
      version: '1.0.0',
      timestamp: Date.now(),
      commit,
      cardWinRates: currentState.cardWinRates,
      enemyWinRates: currentState.enemyWinRates,
      presetWinRates: currentState.presetWinRates,
      overallWinRate: currentState.overallWinRate,
    };

    writeFileSync(this.config.baselinePath, JSON.stringify(baseline, null, 2), 'utf-8');
    console.log(`✅ 기준선이 저장되었습니다: ${this.config.baselinePath}`);
  }

  // ==================== 리포트 생성 ====================

  private generateReport(
    warnings: BalanceWarning[],
    errors: BalanceError[],
    current: CurrentState
  ): string {
    const lines: string[] = [];

    lines.push('═'.repeat(60));
    lines.push('📊 밸런스 체크 리포트');
    lines.push('═'.repeat(60));
    lines.push('');

    // 요약
    lines.push(`결과: ${errors.length === 0 ? '✅ 통과' : '❌ 실패'}`);
    lines.push(`경고: ${warnings.length}개 | 오류: ${errors.length}개`);
    lines.push('');

    // 현재 상태
    lines.push('📈 현재 상태:');
    lines.push(`  전체 승률: ${(current.overallWinRate * 100).toFixed(1)}%`);
    lines.push('');

    // 프리셋별 승률
    lines.push('  프리셋 승률:');
    for (const [id, rate] of Object.entries(current.presetWinRates)) {
      const icon = rate >= 0.6 ? '🟢' : rate >= 0.4 ? '🟡' : '🔴';
      lines.push(`    ${icon} ${id}: ${(rate * 100).toFixed(1)}%`);
    }
    lines.push('');

    // 적 승률
    lines.push('  적 승률 (플레이어 기준):');
    for (const [id, rate] of Object.entries(current.enemyWinRates)) {
      const icon = rate >= 0.6 ? '🟢' : rate >= 0.4 ? '🟡' : '🔴';
      lines.push(`    ${icon} vs ${id}: ${(rate * 100).toFixed(1)}%`);
    }
    lines.push('');

    // 오류
    if (errors.length > 0) {
      lines.push('❌ 오류:');
      for (const error of errors) {
        lines.push(`  • [${error.type}] ${error.message}`);
      }
      lines.push('');
    }

    // 경고
    if (warnings.length > 0) {
      lines.push('⚠️ 경고:');
      for (const warning of warnings) {
        const icon = warning.severity === 'high' ? '🔴' :
          warning.severity === 'medium' ? '🟡' : '🟢';
        lines.push(`  ${icon} [${warning.type}] ${warning.message}`);
      }
      lines.push('');
    }

    lines.push('═'.repeat(60));

    return lines.join('\n');
  }
}

// ==================== 현재 상태 타입 ====================

interface CurrentState {
  cardWinRates: Record<string, number>;
  enemyWinRates: Record<string, number>;
  presetWinRates: Record<string, number>;
  overallWinRate: number;
}

// ==================== CLI 엔트리포인트 ====================

export async function runBalanceCheck(args: string[] = []): Promise<number> {
  const updateBaseline = args.includes('--update-baseline');
  const verbose = args.includes('--verbose');

  const checker = new BalanceChecker({
    battlesPerTest: verbose ? 100 : 50,
  });

  if (updateBaseline) {
    await checker.updateBaseline();
    return 0;
  }

  const result = await checker.runCheck();

  // GitHub Actions 포맷 출력
  if (process.env.GITHUB_ACTIONS) {
    for (const error of result.errors) {
      console.log(`::error::${error.message}`);
    }
    for (const warning of result.warnings) {
      const level = warning.severity === 'high' ? 'error' : 'warning';
      console.log(`::${level}::${warning.message}`);
    }
  }

  return result.passed ? 0 : 1;
}

// 직접 실행시
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runBalanceCheck(process.argv.slice(2)).then((code) => {
    process.exit(code);
  });
}
