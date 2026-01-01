/**
 * @file stats-reporter.ts
 * @description E2E 테스트 상세 통계 리포터
 *
 * 시뮬레이터와 유사한 포맷으로 테스트 결과를 출력합니다.
 *
 * ## 수집하는 통계
 * - 테스트별: 성공/실패, 소요시간, 재시도 횟수
 * - 파일별: 테스트 수, 성공률, 평균 시간
 * - 브라우저별: 전체 성공률, 평균 시간
 * - 전체: 총 테스트, 성공률, 실패 원인 분석
 */

import type {
  Reporter,
  TestCase,
  TestResult,
  FullResult,
  Suite,
  FullConfig,
} from '@playwright/test/reporter';

// ==================== 타입 정의 ====================

/** 테스트 결과 상세 */
interface TestStats {
  testId: string;
  title: string;
  file: string;
  project: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
  duration: number;
  retries: number;
  error?: string;
}

/** 파일별 통계 */
interface FileStats {
  file: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  timedOut: number;
  passRate: number;
  avgDuration: number;
  totalDuration: number;
}

/** 브라우저별 통계 */
interface ProjectStats {
  project: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  timedOut: number;
  passRate: number;
  avgDuration: number;
}

/** 실패 원인 분석 */
interface FailureAnalysis {
  category: string;
  count: number;
  tests: string[];
}

/** 전체 통계 요약 */
interface SummaryStats {
  startTime: Date;
  endTime: Date;
  totalDuration: number;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  timedOut: number;
  passRate: number;
  avgTestDuration: number;
  retryCount: number;
}

// ==================== 유틸리티 ====================

/** 시간 포맷 (ms -> 읽기 쉬운 형태) */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

/** 퍼센트 포맷 */
function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/** 테이블 행 생성 */
function tableRow(cells: string[], widths: number[]): string {
  return '│ ' + cells.map((cell, i) => cell.padEnd(widths[i])).join(' │ ') + ' │';
}

/** 테이블 구분선 */
function tableSeparator(widths: number[], type: 'top' | 'mid' | 'bot'): string {
  const chars = { top: ['┌', '┬', '┐'], mid: ['├', '┼', '┤'], bot: ['└', '┴', '┘'] };
  const [left, mid, right] = chars[type];
  return left + widths.map(w => '─'.repeat(w + 2)).join(mid) + right;
}

// ==================== 리포터 클래스 ====================

export default class StatsReporter implements Reporter {
  private tests: TestStats[] = [];
  private startTime: Date = new Date();
  private config!: FullConfig;

  onBegin(config: FullConfig, _suite: Suite): void {
    this.config = config;
    this.startTime = new Date();
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           🎮 하하하GO E2E 테스트 시작                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`\n시작 시간: ${this.startTime.toLocaleString('ko-KR')}`);
    console.log(`프로젝트: ${config.projects.map(p => p.name).join(', ')}`);
    console.log('');
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const status = result.status;
    const statusIcon = {
      passed: '✅',
      failed: '❌',
      skipped: '⏭️',
      timedOut: '⏱️',
      interrupted: '🛑',
    }[status];

    // 진행 상황 출력
    const duration = formatDuration(result.duration);
    const retryInfo = result.retry > 0 ? ` (retry #${result.retry})` : '';
    console.log(`${statusIcon} ${test.title}${retryInfo} - ${duration}`);

    // 통계 수집
    this.tests.push({
      testId: test.id,
      title: test.title,
      file: test.location.file.replace(process.cwd() + '/', ''),
      project: test.parent.project()?.name || 'default',
      status,
      duration: result.duration,
      retries: result.retry,
      error: result.error?.message,
    });
  }

  onEnd(result: FullResult): void {
    const endTime = new Date();
    const totalDuration = endTime.getTime() - this.startTime.getTime();

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                 📊 테스트 결과 통계                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    // 전체 요약
    const summary = this.calculateSummary(endTime, totalDuration);
    this.printSummary(summary);

    // 파일별 통계
    const fileStats = this.calculateFileStats();
    this.printFileStats(fileStats);

    // 브라우저별 통계
    const projectStats = this.calculateProjectStats();
    this.printProjectStats(projectStats);

    // 실패 분석
    if (summary.failed > 0) {
      const failures = this.analyzeFailures();
      this.printFailureAnalysis(failures);
    }

    // 최종 결과
    this.printFinalResult(result.status, summary);
  }

  /** 전체 요약 계산 */
  private calculateSummary(endTime: Date, totalDuration: number): SummaryStats {
    const passed = this.tests.filter(t => t.status === 'passed').length;
    const failed = this.tests.filter(t => t.status === 'failed').length;
    const skipped = this.tests.filter(t => t.status === 'skipped').length;
    const timedOut = this.tests.filter(t => t.status === 'timedOut').length;
    const totalTests = this.tests.length;
    const retryCount = this.tests.reduce((sum, t) => sum + t.retries, 0);
    const totalTestDuration = this.tests.reduce((sum, t) => sum + t.duration, 0);

    return {
      startTime: this.startTime,
      endTime,
      totalDuration,
      totalTests,
      passed,
      failed,
      skipped,
      timedOut,
      passRate: totalTests > 0 ? passed / totalTests : 0,
      avgTestDuration: totalTests > 0 ? totalTestDuration / totalTests : 0,
      retryCount,
    };
  }

  /** 파일별 통계 계산 */
  private calculateFileStats(): FileStats[] {
    const fileMap = new Map<string, TestStats[]>();

    for (const test of this.tests) {
      if (!fileMap.has(test.file)) {
        fileMap.set(test.file, []);
      }
      fileMap.get(test.file)!.push(test);
    }

    return Array.from(fileMap.entries()).map(([file, tests]) => {
      const passed = tests.filter(t => t.status === 'passed').length;
      const failed = tests.filter(t => t.status === 'failed').length;
      const skipped = tests.filter(t => t.status === 'skipped').length;
      const timedOut = tests.filter(t => t.status === 'timedOut').length;
      const totalDuration = tests.reduce((sum, t) => sum + t.duration, 0);

      return {
        file: file.replace('e2e/', ''),
        totalTests: tests.length,
        passed,
        failed,
        skipped,
        timedOut,
        passRate: tests.length > 0 ? passed / tests.length : 0,
        avgDuration: tests.length > 0 ? totalDuration / tests.length : 0,
        totalDuration,
      };
    }).sort((a, b) => b.totalTests - a.totalTests);
  }

  /** 브라우저별 통계 계산 */
  private calculateProjectStats(): ProjectStats[] {
    const projectMap = new Map<string, TestStats[]>();

    for (const test of this.tests) {
      if (!projectMap.has(test.project)) {
        projectMap.set(test.project, []);
      }
      projectMap.get(test.project)!.push(test);
    }

    return Array.from(projectMap.entries()).map(([project, tests]) => {
      const passed = tests.filter(t => t.status === 'passed').length;
      const failed = tests.filter(t => t.status === 'failed').length;
      const skipped = tests.filter(t => t.status === 'skipped').length;
      const timedOut = tests.filter(t => t.status === 'timedOut').length;
      const totalDuration = tests.reduce((sum, t) => sum + t.duration, 0);

      return {
        project,
        totalTests: tests.length,
        passed,
        failed,
        skipped,
        timedOut,
        passRate: tests.length > 0 ? passed / tests.length : 0,
        avgDuration: tests.length > 0 ? totalDuration / tests.length : 0,
      };
    });
  }

  /** 실패 원인 분석 */
  private analyzeFailures(): FailureAnalysis[] {
    const failedTests = this.tests.filter(t => t.status === 'failed' || t.status === 'timedOut');
    const categoryMap = new Map<string, string[]>();

    for (const test of failedTests) {
      let category = '기타';

      if (test.status === 'timedOut') {
        category = '타임아웃';
      } else if (test.error) {
        if (test.error.includes('waitForSelector')) category = '셀렉터 대기 실패';
        else if (test.error.includes('click')) category = '클릭 실패';
        else if (test.error.includes('expect')) category = '검증 실패';
        else if (test.error.includes('navigation')) category = '네비게이션 실패';
        else if (test.error.includes('timeout')) category = '타임아웃';
      }

      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(test.title);
    }

    return Array.from(categoryMap.entries())
      .map(([category, tests]) => ({ category, count: tests.length, tests }))
      .sort((a, b) => b.count - a.count);
  }

  /** 요약 출력 */
  private printSummary(summary: SummaryStats): void {
    console.log('\n┌─────────────────────────────────────┐');
    console.log('│           전체 요약                  │');
    console.log('├─────────────────────────────────────┤');
    console.log(`│ 총 테스트     : ${String(summary.totalTests).padStart(6)}개             │`);
    console.log(`│ 성공          : ${String(summary.passed).padStart(6)}개  ${formatPercent(summary.passRate).padStart(6)}     │`);
    console.log(`│ 실패          : ${String(summary.failed).padStart(6)}개             │`);
    console.log(`│ 스킵          : ${String(summary.skipped).padStart(6)}개             │`);
    console.log(`│ 타임아웃      : ${String(summary.timedOut).padStart(6)}개             │`);
    console.log('├─────────────────────────────────────┤');
    console.log(`│ 총 소요시간   : ${formatDuration(summary.totalDuration).padStart(10)}         │`);
    console.log(`│ 평균 테스트   : ${formatDuration(summary.avgTestDuration).padStart(10)}         │`);
    console.log(`│ 재시도 횟수   : ${String(summary.retryCount).padStart(6)}회             │`);
    console.log('└─────────────────────────────────────┘');
  }

  /** 파일별 통계 출력 */
  private printFileStats(fileStats: FileStats[]): void {
    if (fileStats.length === 0) return;

    console.log('\n┌─────────────────────────────────────────────────────────────────┐');
    console.log('│                        파일별 통계                               │');
    console.log('├─────────────────────────────────────────────────────────────────┤');

    const widths = [30, 6, 6, 6, 8, 10];
    console.log(tableSeparator(widths, 'top'));
    console.log(tableRow(['파일', '총', '성공', '실패', '성공률', '평균시간'], widths));
    console.log(tableSeparator(widths, 'mid'));

    for (const stat of fileStats) {
      console.log(tableRow([
        stat.file.slice(0, 30),
        String(stat.totalTests),
        String(stat.passed),
        String(stat.failed),
        formatPercent(stat.passRate),
        formatDuration(stat.avgDuration),
      ], widths));
    }

    console.log(tableSeparator(widths, 'bot'));
  }

  /** 브라우저별 통계 출력 */
  private printProjectStats(projectStats: ProjectStats[]): void {
    if (projectStats.length <= 1) return;

    console.log('\n┌─────────────────────────────────────────────────────────────────┐');
    console.log('│                       브라우저별 통계                            │');
    console.log('├─────────────────────────────────────────────────────────────────┤');

    const widths = [15, 6, 6, 6, 8, 10];
    console.log(tableSeparator(widths, 'top'));
    console.log(tableRow(['브라우저', '총', '성공', '실패', '성공률', '평균시간'], widths));
    console.log(tableSeparator(widths, 'mid'));

    for (const stat of projectStats) {
      console.log(tableRow([
        stat.project,
        String(stat.totalTests),
        String(stat.passed),
        String(stat.failed),
        formatPercent(stat.passRate),
        formatDuration(stat.avgDuration),
      ], widths));
    }

    console.log(tableSeparator(widths, 'bot'));
  }

  /** 실패 분석 출력 */
  private printFailureAnalysis(failures: FailureAnalysis[]): void {
    console.log('\n┌─────────────────────────────────────────────────────────────────┐');
    console.log('│                        실패 원인 분석                            │');
    console.log('├─────────────────────────────────────────────────────────────────┤');

    for (const failure of failures) {
      console.log(`\n❌ ${failure.category} (${failure.count}건)`);
      for (const test of failure.tests.slice(0, 5)) {
        console.log(`   - ${test}`);
      }
      if (failure.tests.length > 5) {
        console.log(`   ... 외 ${failure.tests.length - 5}건`);
      }
    }

    console.log('');
  }

  /** 최종 결과 출력 */
  private printFinalResult(status: FullResult['status'], summary: SummaryStats): void {
    console.log('\n');

    if (status === 'passed') {
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║                    ✅ 모든 테스트 통과                       ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
    } else if (status === 'failed') {
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log(`║           ❌ 테스트 실패: ${String(summary.failed).padStart(3)}개 실패                       ║`);
      console.log('╚════════════════════════════════════════════════════════════╝');
    } else if (status === 'timedout') {
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║                    ⏱️ 테스트 타임아웃                        ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
    } else {
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║                    🛑 테스트 중단됨                          ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
    }

    console.log(`\n종료 시간: ${summary.endTime.toLocaleString('ko-KR')}`);
    console.log(`총 소요시간: ${formatDuration(summary.totalDuration)}`);
    console.log('');
  }
}
