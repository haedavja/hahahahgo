/**
 * @file stats-reporter.ts
 * @description E2E 테스트 상세 통계 리포터 (시뮬레이터 스타일)
 *
 * ## 핵심 지표
 * - 기능별 커버리지: 어떤 기능이 테스트되고 있는가?
 * - 안정성 지표: 어떤 테스트가 불안정한가?
 * - 성능 지표: 어떤 테스트가 느린가?
 * - 실패 패턴: 어떤 유형의 실패가 많은가?
 */

import type {
  Reporter,
  TestCase,
  TestResult,
  FullResult,
  Suite,
  FullConfig,
} from '@playwright/test/reporter';

// ==================== 기능 카테고리 정의 ====================

/** 테스트 기능 카테고리 */
const FEATURE_CATEGORIES = {
  battle: {
    name: '⚔️ 전투 시스템',
    keywords: ['전투', 'battle', 'card', '카드', 'hp', 'timeline', '타임라인', 'phase', '페이즈'],
  },
  shop: {
    name: '🏪 상점',
    keywords: ['상점', 'shop', '구매', '판매', 'gold', '골드'],
  },
  map: {
    name: '🗺️ 맵/네비게이션',
    keywords: ['맵', 'map', 'node', '노드', 'layer', '층'],
  },
  dungeon: {
    name: '🏰 던전',
    keywords: ['던전', 'dungeon', '진입', '우회'],
  },
  event: {
    name: '📜 이벤트',
    keywords: ['이벤트', 'event', '선택지', 'choice'],
  },
  rest: {
    name: '⛺ 휴식',
    keywords: ['휴식', 'rest', '회복', 'heal'],
  },
  state: {
    name: '📊 상태/자원',
    keywords: ['상태', 'state', '자원', 'resource', '정보', 'intel', '전리품', 'loot'],
  },
  ui: {
    name: '🖼️ UI/시각',
    keywords: ['ui', 'visual', '표시', 'display', '요소', 'element'],
  },
  core: {
    name: '🎮 핵심/시작',
    keywords: ['시작', 'start', 'load', '로드', 'launch', '앱'],
  },
} as const;

type FeatureCategory = keyof typeof FEATURE_CATEGORIES;

// ==================== 타입 정의 ====================

interface TestRecord {
  id: string;
  title: string;
  fullTitle: string;
  file: string;
  project: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
  duration: number;
  retries: number;
  error?: string;
  category: FeatureCategory | 'other';
}

interface FeatureStats {
  category: FeatureCategory | 'other';
  name: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: number;
  avgDuration: number;
  tests: TestRecord[];
}

interface StabilityMetrics {
  flakyTests: TestRecord[];  // 재시도로 통과한 테스트
  slowTests: TestRecord[];   // 평균보다 2배 이상 느린 테스트
  skippedTests: TestRecord[]; // 스킵된 테스트
}

interface FailurePattern {
  pattern: string;
  count: number;
  examples: string[];
}

// ==================== 유틸리티 ====================

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function categorizeTest(title: string, file: string): FeatureCategory | 'other' {
  const searchText = `${title} ${file}`.toLowerCase();

  for (const [category, config] of Object.entries(FEATURE_CATEGORIES)) {
    if (config.keywords.some(kw => searchText.includes(kw.toLowerCase()))) {
      return category as FeatureCategory;
    }
  }
  return 'other';
}

function getProgressBar(value: number, width: number = 20): string {
  const filled = Math.round(value * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

// ==================== 리포터 클래스 ====================

export default class StatsReporter implements Reporter {
  private tests: TestRecord[] = [];
  private startTime: Date = new Date();
  private config!: FullConfig;

  onBegin(config: FullConfig, _suite: Suite): void {
    this.config = config;
    this.startTime = new Date();

    console.log('\n');
    console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
    console.log('┃              🎮 하하하GO E2E 테스트 시작                      ┃');
    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
    console.log(`\n📅 시작: ${this.startTime.toLocaleString('ko-KR')}`);
    console.log(`🌐 브라우저: ${config.projects.map(p => p.name).join(', ')}`);
    console.log('─'.repeat(64));
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const status = result.status;
    const icon = { passed: '✅', failed: '❌', skipped: '⏭️', timedOut: '⏱️', interrupted: '🛑' }[status];
    const duration = formatDuration(result.duration);
    const retry = result.retry > 0 ? ` (재시도 #${result.retry})` : '';

    console.log(`${icon} ${test.title}${retry} [${duration}]`);

    const fullTitle = test.titlePath().join(' > ');
    const file = test.location.file.replace(process.cwd() + '/', '');

    this.tests.push({
      id: test.id,
      title: test.title,
      fullTitle,
      file,
      project: test.parent.project()?.name || 'default',
      status,
      duration: result.duration,
      retries: result.retry,
      error: result.error?.message,
      category: categorizeTest(fullTitle, file),
    });
  }

  onEnd(result: FullResult): void {
    const endTime = new Date();
    const totalDuration = endTime.getTime() - this.startTime.getTime();

    console.log('\n');
    console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
    console.log('┃                    📊 테스트 분석 리포트                      ┃');
    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');

    // 1. 전체 요약
    this.printOverview(totalDuration);

    // 2. 기능별 커버리지
    this.printFeatureCoverage();

    // 3. 안정성 지표
    this.printStabilityMetrics();

    // 4. 성능 분석
    this.printPerformanceAnalysis();

    // 5. 실패 패턴 (실패가 있을 때만)
    const failed = this.tests.filter(t => t.status === 'failed' || t.status === 'timedOut');
    if (failed.length > 0) {
      this.printFailurePatterns(failed);
    }

    // 6. 최종 판정
    this.printVerdict(result.status, totalDuration);
  }

  private printOverview(totalDuration: number): void {
    const total = this.tests.length;
    const passed = this.tests.filter(t => t.status === 'passed').length;
    const failed = this.tests.filter(t => t.status === 'failed').length;
    const skipped = this.tests.filter(t => t.status === 'skipped').length;
    const timedOut = this.tests.filter(t => t.status === 'timedOut').length;
    const passRate = total > 0 ? passed / total : 0;
    const avgDuration = total > 0 ? this.tests.reduce((s, t) => s + t.duration, 0) / total : 0;

    console.log('\n📈 전체 요약');
    console.log('─'.repeat(64));
    console.log(`   총 테스트: ${total}개`);
    console.log(`   ${getProgressBar(passRate)} ${formatPercent(passRate)}`);
    console.log('');
    console.log(`   ✅ 성공: ${passed}개    ❌ 실패: ${failed}개    ⏭️ 스킵: ${skipped}개    ⏱️ 타임아웃: ${timedOut}개`);
    console.log(`   ⏱️ 총 시간: ${formatDuration(totalDuration)}    📊 평균: ${formatDuration(avgDuration)}/테스트`);
  }

  private printFeatureCoverage(): void {
    const featureStats = this.calculateFeatureStats();

    console.log('\n🎯 기능별 커버리지');
    console.log('─'.repeat(64));
    console.log('   이 테스트가 검증하는 게임 기능별 상태:\n');

    for (const stat of featureStats) {
      if (stat.total === 0) continue;

      const status = stat.passRate === 1 ? '✅' : stat.passRate >= 0.8 ? '⚠️' : '❌';
      const bar = getProgressBar(stat.passRate, 15);

      console.log(`   ${status} ${stat.name.padEnd(20)} ${bar} ${formatPercent(stat.passRate).padStart(6)}`);
      console.log(`      └─ ${stat.passed}/${stat.total} 통과, 평균 ${formatDuration(stat.avgDuration)}`);

      // 실패한 테스트 표시
      const failures = stat.tests.filter(t => t.status === 'failed' || t.status === 'timedOut');
      if (failures.length > 0) {
        for (const f of failures.slice(0, 2)) {
          console.log(`         ❌ ${f.title}`);
        }
        if (failures.length > 2) {
          console.log(`         ... 외 ${failures.length - 2}개 실패`);
        }
      }
    }
  }

  private calculateFeatureStats(): FeatureStats[] {
    const categoryMap = new Map<FeatureCategory | 'other', TestRecord[]>();

    // 모든 카테고리 초기화
    for (const cat of [...Object.keys(FEATURE_CATEGORIES), 'other'] as (FeatureCategory | 'other')[]) {
      categoryMap.set(cat, []);
    }

    // 테스트 분류
    for (const test of this.tests) {
      categoryMap.get(test.category)!.push(test);
    }

    // 통계 계산
    return Array.from(categoryMap.entries())
      .map(([category, tests]) => {
        const passed = tests.filter(t => t.status === 'passed').length;
        const failed = tests.filter(t => t.status === 'failed' || t.status === 'timedOut').length;
        const skipped = tests.filter(t => t.status === 'skipped').length;
        const totalDuration = tests.reduce((s, t) => s + t.duration, 0);

        const name = category === 'other'
          ? '🔧 기타'
          : FEATURE_CATEGORIES[category].name;

        return {
          category,
          name,
          total: tests.length,
          passed,
          failed,
          skipped,
          passRate: tests.length > 0 ? passed / tests.length : 0,
          avgDuration: tests.length > 0 ? totalDuration / tests.length : 0,
          tests,
        };
      })
      .filter(s => s.total > 0)
      .sort((a, b) => b.total - a.total);
  }

  private printStabilityMetrics(): void {
    const metrics = this.calculateStabilityMetrics();

    console.log('\n⚡ 안정성 지표');
    console.log('─'.repeat(64));
    console.log('   테스트 품질 문제 감지:\n');

    // 플레이키 테스트 (재시도로 통과)
    if (metrics.flakyTests.length > 0) {
      console.log(`   ⚠️ 불안정한 테스트 (재시도 필요): ${metrics.flakyTests.length}개`);
      for (const t of metrics.flakyTests.slice(0, 3)) {
        console.log(`      - ${t.title} (${t.retries}회 재시도)`);
      }
      console.log('      → 원인: 타이밍 문제, 비동기 처리, 네트워크 지연 가능');
    } else {
      console.log('   ✅ 불안정한 테스트 없음');
    }

    // 스킵된 테스트
    if (metrics.skippedTests.length > 0) {
      console.log(`\n   ⏭️ 스킵된 테스트: ${metrics.skippedTests.length}개`);
      for (const t of metrics.skippedTests.slice(0, 3)) {
        console.log(`      - ${t.title}`);
      }
      console.log('      → 의미: 전제조건 미충족 (테스트 환경 제한)');
    }

    // 느린 테스트
    if (metrics.slowTests.length > 0) {
      console.log(`\n   🐌 느린 테스트 (평균의 2배 이상): ${metrics.slowTests.length}개`);
      for (const t of metrics.slowTests.slice(0, 3)) {
        console.log(`      - ${t.title} (${formatDuration(t.duration)})`);
      }
      console.log('      → 최적화 필요: 타임아웃 조정 또는 테스트 분리 고려');
    }
  }

  private calculateStabilityMetrics(): StabilityMetrics {
    const avgDuration = this.tests.length > 0
      ? this.tests.reduce((s, t) => s + t.duration, 0) / this.tests.length
      : 0;

    return {
      flakyTests: this.tests.filter(t => t.status === 'passed' && t.retries > 0),
      skippedTests: this.tests.filter(t => t.status === 'skipped'),
      slowTests: this.tests.filter(t => t.duration > avgDuration * 2).sort((a, b) => b.duration - a.duration),
    };
  }

  private printPerformanceAnalysis(): void {
    const durations = this.tests.map(t => t.duration).sort((a, b) => a - b);
    if (durations.length === 0) return;

    const min = durations[0];
    const max = durations[durations.length - 1];
    const median = durations[Math.floor(durations.length / 2)];
    const p90 = durations[Math.floor(durations.length * 0.9)];

    console.log('\n⏱️ 성능 분포');
    console.log('─'.repeat(64));
    console.log(`   최소: ${formatDuration(min)}  |  중간값: ${formatDuration(median)}  |  90%: ${formatDuration(p90)}  |  최대: ${formatDuration(max)}`);

    // 시간 분포 히스토그램
    const buckets = [1000, 5000, 10000, 30000, 60000];
    const counts = buckets.map((b, i) => {
      const prev = i === 0 ? 0 : buckets[i - 1];
      return this.tests.filter(t => t.duration > prev && t.duration <= b).length;
    });
    counts.push(this.tests.filter(t => t.duration > buckets[buckets.length - 1]).length);

    console.log('\n   시간 분포:');
    const labels = ['~1s', '~5s', '~10s', '~30s', '~60s', '60s+'];
    const maxCount = Math.max(...counts);

    for (let i = 0; i < labels.length; i++) {
      if (counts[i] > 0) {
        const barLen = Math.round((counts[i] / maxCount) * 20);
        console.log(`   ${labels[i].padStart(5)}: ${'█'.repeat(barLen)} ${counts[i]}개`);
      }
    }
  }

  private printFailurePatterns(failures: TestRecord[]): void {
    console.log('\n❌ 실패 패턴 분석');
    console.log('─'.repeat(64));

    const patterns: FailurePattern[] = [];
    const patternMap = new Map<string, string[]>();

    for (const f of failures) {
      let pattern = '기타 오류';

      if (f.status === 'timedOut') {
        pattern = '타임아웃';
      } else if (f.error) {
        if (f.error.includes('waitForSelector')) pattern = '요소 찾기 실패';
        else if (f.error.includes('expect')) pattern = 'Assertion 실패';
        else if (f.error.includes('click')) pattern = '클릭 실패';
        else if (f.error.includes('navigation')) pattern = '페이지 이동 실패';
        else if (f.error.includes('timeout')) pattern = '작업 타임아웃';
      }

      if (!patternMap.has(pattern)) {
        patternMap.set(pattern, []);
      }
      patternMap.get(pattern)!.push(f.title);
    }

    for (const [pattern, tests] of patternMap) {
      console.log(`\n   🔴 ${pattern} (${tests.length}건)`);
      console.log('      원인 분석:');

      switch (pattern) {
        case '타임아웃':
          console.log('      - 테스트 시간 초과 또는 무한 대기');
          console.log('      - 해결: 타임아웃 값 증가 또는 대기 조건 수정');
          break;
        case '요소 찾기 실패':
          console.log('      - data-testid가 없거나 요소가 렌더링되지 않음');
          console.log('      - 해결: 셀렉터 확인 및 렌더링 대기 추가');
          break;
        case 'Assertion 실패':
          console.log('      - 예상값과 실제값 불일치');
          console.log('      - 해결: 게임 로직 또는 테스트 기대값 수정');
          break;
        default:
          console.log('      - 상세 에러 로그 확인 필요');
      }

      console.log('      실패한 테스트:');
      for (const t of tests.slice(0, 3)) {
        console.log(`        - ${t}`);
      }
    }
  }

  private printVerdict(status: FullResult['status'], totalDuration: number): void {
    const total = this.tests.length;
    const passed = this.tests.filter(t => t.status === 'passed').length;
    const failed = this.tests.filter(t => t.status === 'failed' || t.status === 'timedOut').length;
    const skipped = this.tests.filter(t => t.status === 'skipped').length;

    console.log('\n');
    console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');

    if (status === 'passed') {
      console.log('┃                    ✅ 테스트 전체 통과                        ┃');
      console.log('┃                                                              ┃');
      console.log(`┃   ${total}개 테스트 중 ${passed}개 성공, ${skipped}개 스킵                          ┃`);
    } else {
      console.log('┃                    ❌ 테스트 실패                             ┃');
      console.log('┃                                                              ┃');
      console.log(`┃   ${total}개 테스트 중 ${passed}개 성공, ${failed}개 실패, ${skipped}개 스킵                ┃`);
    }

    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
    console.log(`\n📅 종료: ${new Date().toLocaleString('ko-KR')}  ⏱️ 총 시간: ${formatDuration(totalDuration)}`);
    console.log('');
  }
}
