/**
 * @file stats-reporter.ts
 * @description E2E 테스트 상세 통계 리포터 (시뮬레이터 스타일 + AI 의도 분석)
 *
 * ## 제공하는 정보
 * 1. 전체 요약 - 성공률, 시간, 핵심 지표
 * 2. 기능별 커버리지 - 게임 기능별 테스트 상태와 의미
 * 3. 테스트 의도 분석 - 각 테스트가 무엇을 검증하는지
 * 4. 결과 해석 - 성공/실패가 게임에 미치는 영향
 * 5. 안정성/성능 지표 - 품질 문제 감지
 * 6. 권장 조치 - 문제 해결 가이드
 */

import type {
  Reporter,
  TestCase,
  TestResult,
  FullResult,
  Suite,
  FullConfig,
} from '@playwright/test/reporter';

// ==================== 기능 카테고리 및 의도 정의 ====================

interface FeatureConfig {
  name: string;
  description: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  keywords: string[];
  /** 이 기능이 실패하면 어떤 영향이 있는지 */
  impactIfFailed: string;
  /** 이 기능이 성공하면 어떤 것이 보장되는지 */
  guaranteeIfPassed: string;
}

const FEATURE_CATEGORIES: Record<string, FeatureConfig> = {
  battle: {
    name: '⚔️ 전투 시스템',
    description: '카드 선택, 타임라인, HP, 전투 흐름',
    importance: 'critical',
    keywords: ['전투', 'battle', 'card', '카드', 'hp', 'timeline', '타임라인', 'phase', '페이즈', '제출', 'submit'],
    impactIfFailed: '게임의 핵심 루프가 작동하지 않음. 플레이 불가.',
    guaranteeIfPassed: '전투 진입, 카드 사용, 승패 판정이 정상 작동함.',
  },
  shop: {
    name: '🏪 상점',
    description: '아이템 구매/판매, 골드 거래',
    importance: 'high',
    keywords: ['상점', 'shop', '구매', '판매', 'gold', '골드', 'buy', 'sell'],
    impactIfFailed: '플레이어가 아이템을 구매/판매할 수 없음. 덱 강화 불가.',
    guaranteeIfPassed: '상점 UI가 정상 표시되고 거래가 가능함.',
  },
  map: {
    name: '🗺️ 맵/네비게이션',
    description: '맵 표시, 노드 선택, 층 이동',
    importance: 'critical',
    keywords: ['맵', 'map', 'node', '노드', 'layer', '층', 'navigation', '이동'],
    impactIfFailed: '게임 진행 불가. 다음 전투/이벤트로 이동 못함.',
    guaranteeIfPassed: '맵이 정상 렌더링되고 노드 선택이 작동함.',
  },
  dungeon: {
    name: '🏰 던전',
    description: '던전 진입, 보상, 우회',
    importance: 'medium',
    keywords: ['던전', 'dungeon', '진입', '우회', 'bypass'],
    impactIfFailed: '던전 콘텐츠 접근 불가.',
    guaranteeIfPassed: '던전 진입/우회 선택이 정상 작동함.',
  },
  event: {
    name: '📜 이벤트',
    description: '랜덤 이벤트, 선택지',
    importance: 'medium',
    keywords: ['이벤트', 'event', '선택지', 'choice'],
    impactIfFailed: '이벤트 보상을 받을 수 없음.',
    guaranteeIfPassed: '이벤트가 정상 표시되고 선택 가능함.',
  },
  rest: {
    name: '⛺ 휴식',
    description: 'HP 회복, 카드 강화',
    importance: 'medium',
    keywords: ['휴식', 'rest', '회복', 'heal', '각성'],
    impactIfFailed: 'HP 회복이 불가능해 런 지속이 어려움.',
    guaranteeIfPassed: '휴식 노드에서 회복/강화가 가능함.',
  },
  state: {
    name: '📊 상태/자원',
    description: 'HP, 골드, 자원 표시 및 변화',
    importance: 'high',
    keywords: ['상태', 'state', '자원', 'resource', '정보', 'intel', '전리품', 'loot', '기억', 'memory'],
    impactIfFailed: '플레이어가 현재 상태를 파악할 수 없음.',
    guaranteeIfPassed: '모든 자원이 정확하게 표시됨.',
  },
  ui: {
    name: '🖼️ UI/시각',
    description: 'UI 요소 표시, 반응성',
    importance: 'high',
    keywords: ['ui', 'visual', '표시', 'display', '요소', 'element', '모달', 'modal'],
    impactIfFailed: 'UI가 깨지거나 반응하지 않음.',
    guaranteeIfPassed: 'UI가 정상 렌더링되고 상호작용 가능함.',
  },
  core: {
    name: '🎮 핵심/시작',
    description: '앱 로드, 초기화, 게임 시작',
    importance: 'critical',
    keywords: ['시작', 'start', 'load', '로드', 'launch', '앱', 'app', 'init'],
    impactIfFailed: '게임이 시작되지 않음. 완전 불가.',
    guaranteeIfPassed: '게임이 정상 로드되고 시작 가능함.',
  },
};

// ==================== 테스트 의도 패턴 ====================

interface TestIntentPattern {
  pattern: RegExp;
  intent: string;
  whatItTests: string;
  whyItMatters: string;
}

const TEST_INTENT_PATTERNS: TestIntentPattern[] = [
  {
    pattern: /ui.*요소|요소.*표시|display/i,
    intent: 'UI 검증',
    whatItTests: '필수 UI 요소가 화면에 렌더링되는지',
    whyItMatters: 'UI가 없으면 사용자가 게임과 상호작용할 수 없음',
  },
  {
    pattern: /카드.*선택|select.*card/i,
    intent: '카드 상호작용',
    whatItTests: '카드 클릭 시 선택 상태가 변경되는지',
    whyItMatters: '전투의 핵심 메커니즘. 카드 선택 없이는 행동 불가',
  },
  {
    pattern: /제출|submit/i,
    intent: '턴 진행',
    whatItTests: '선택한 카드가 제출되고 턴이 진행되는지',
    whyItMatters: '전투가 진행되려면 카드 제출이 필수',
  },
  {
    pattern: /자동.*진행|auto.*battle/i,
    intent: '전투 완주',
    whatItTests: '전투가 끝까지 진행되어 승패가 결정되는지',
    whyItMatters: '전투 루프가 완전히 작동하는지 종합 검증',
  },
  {
    pattern: /hp.*변화|hp.*추적/i,
    intent: 'HP 시스템',
    whatItTests: '전투 중 HP가 정확히 계산되고 표시되는지',
    whyItMatters: '게임 밸런스의 핵심. HP 계산 오류는 치명적',
  },
  {
    pattern: /타임라인|timeline/i,
    intent: '타임라인 시스템',
    whatItTests: '카드 발동 순서가 타임라인에 표시되는지',
    whyItMatters: '전략적 플레이의 핵심. 순서 표시 없이는 계획 불가',
  },
  {
    pattern: /상점.*모달|shop.*modal/i,
    intent: '상점 접근',
    whatItTests: '상점 UI가 열리고 아이템이 표시되는지',
    whyItMatters: '덱 빌딩의 핵심 경로',
  },
  {
    pattern: /골드.*차감|gold.*변화/i,
    intent: '거래 시스템',
    whatItTests: '구매 시 골드가 정확히 차감되는지',
    whyItMatters: '경제 시스템의 정확성',
  },
  {
    pattern: /던전.*진입|dungeon.*enter/i,
    intent: '던전 접근',
    whatItTests: '던전에 진입할 수 있는지',
    whyItMatters: '추가 콘텐츠 접근 경로',
  },
  {
    pattern: /앱.*로드|app.*load/i,
    intent: '앱 초기화',
    whatItTests: '앱이 오류 없이 시작되는지',
    whyItMatters: '가장 기본적인 요구사항. 실패 시 게임 불가',
  },
  {
    pattern: /에러.*없|no.*error/i,
    intent: '안정성',
    whatItTests: '콘솔 에러 없이 작동하는지',
    whyItMatters: '숨겨진 버그가 없는지 확인',
  },
  {
    pattern: /페이즈|phase/i,
    intent: '전투 단계',
    whatItTests: '전투 페이즈가 올바르게 전환되는지',
    whyItMatters: '전투 흐름의 정확성',
  },
];

// ==================== 타입 정의 ====================

type FeatureCategory = keyof typeof FEATURE_CATEGORIES | 'other';

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
  category: FeatureCategory;
  intent?: TestIntentPattern;
}

interface FeatureAnalysis {
  category: FeatureCategory;
  config: FeatureConfig | null;
  tests: TestRecord[];
  passed: number;
  failed: number;
  skipped: number;
  passRate: number;
  avgDuration: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
  diagnosis: string;
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

function categorizeTest(title: string, file: string): FeatureCategory {
  const searchText = `${title} ${file}`.toLowerCase();

  for (const [category, config] of Object.entries(FEATURE_CATEGORIES)) {
    if (config.keywords.some(kw => searchText.includes(kw.toLowerCase()))) {
      return category as FeatureCategory;
    }
  }
  return 'other';
}

function detectIntent(title: string): TestIntentPattern | undefined {
  for (const pattern of TEST_INTENT_PATTERNS) {
    if (pattern.pattern.test(title)) {
      return pattern;
    }
  }
  return undefined;
}

function getProgressBar(value: number, width: number = 20): string {
  const filled = Math.round(value * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function getHealthIcon(health: 'healthy' | 'warning' | 'critical'): string {
  return { healthy: '✅', warning: '⚠️', critical: '❌' }[health];
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
    console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
    console.log('┃                       🎮 하하하GO E2E 테스트 분석                             ┃');
    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
    console.log(`\n📅 시작: ${this.startTime.toLocaleString('ko-KR')}`);
    console.log(`🌐 테스트 환경: ${config.projects.map(p => p.name).join(', ')}`);
    console.log('─'.repeat(80));
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
      intent: detectIntent(test.title),
    });
  }

  onEnd(result: FullResult): void {
    const endTime = new Date();
    const totalDuration = endTime.getTime() - this.startTime.getTime();

    console.log('\n');
    console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
    console.log('┃                          📊 상세 분석 리포트                                 ┃');
    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');

    // 1. 전체 요약 (핵심 지표)
    this.printExecutiveSummary(totalDuration);

    // 2. 기능별 상세 분석
    this.printFeatureAnalysis();

    // 3. 테스트 의도 분석
    this.printIntentAnalysis();

    // 4. 실패 심층 분석
    const failures = this.tests.filter(t => t.status === 'failed' || t.status === 'timedOut');
    if (failures.length > 0) {
      this.printFailureDeepDive(failures);
    }

    // 5. 품질 지표
    this.printQualityMetrics();

    // 6. 권장 조치
    this.printRecommendations();

    // 7. 최종 판정
    this.printFinalVerdict(result.status, totalDuration);
  }

  private printExecutiveSummary(totalDuration: number): void {
    const total = this.tests.length;
    const passed = this.tests.filter(t => t.status === 'passed').length;
    const failed = this.tests.filter(t => t.status === 'failed').length;
    const skipped = this.tests.filter(t => t.status === 'skipped').length;
    const timedOut = this.tests.filter(t => t.status === 'timedOut').length;
    const passRate = total > 0 ? passed / total : 0;
    const executedRate = total > 0 ? (passed + failed + timedOut) / total : 0;

    console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                              📈 핵심 지표 요약                                ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

    console.log('\n   🎯 테스트 결과');
    console.log(`   ${getProgressBar(passRate, 30)} ${formatPercent(passRate)} 성공`);
    console.log('');
    console.log(`   총 ${total}개 테스트:`);
    console.log(`   ├─ ✅ 성공: ${passed}개 - 해당 기능이 정상 작동함`);
    console.log(`   ├─ ❌ 실패: ${failed}개 - 버그 또는 기능 미구현`);
    console.log(`   ├─ ⏭️ 스킵: ${skipped}개 - 전제조건 미충족 (환경 문제)`);
    console.log(`   └─ ⏱️ 타임아웃: ${timedOut}개 - 응답 없음 또는 무한 대기`);

    console.log('\n   ⏱️ 성능 지표');
    console.log(`   ├─ 총 실행시간: ${formatDuration(totalDuration)}`);
    const avgDuration = total > 0 ? this.tests.reduce((s, t) => s + t.duration, 0) / total : 0;
    console.log(`   ├─ 평균 테스트: ${formatDuration(avgDuration)}`);
    console.log(`   └─ 실행률: ${formatPercent(executedRate)} (스킵 제외 시 ${total - skipped}개 실행)`);

    // 전체 건강 상태
    const health = passRate >= 0.95 ? '🟢 양호' : passRate >= 0.8 ? '🟡 주의' : '🔴 심각';
    console.log(`\n   📋 전체 상태: ${health}`);
  }

  private printFeatureAnalysis(): void {
    const analyses = this.calculateFeatureAnalyses();

    console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                            🎯 기능별 상세 분석                                ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    console.log('\n   각 게임 기능이 얼마나 잘 작동하는지 분석합니다.\n');

    for (const analysis of analyses) {
      if (analysis.tests.length === 0) continue;

      const icon = getHealthIcon(analysis.healthStatus);
      const config = analysis.config;
      const name = config?.name ?? '🔧 기타';
      const importance = config?.importance ?? 'low';
      const importanceTag = { critical: '[필수]', high: '[중요]', medium: '[보통]', low: '[낮음]' }[importance];

      console.log(`   ${icon} ${name} ${importanceTag}`);
      console.log(`   │  ${config?.description ?? '분류되지 않은 테스트'}`);
      console.log(`   │`);
      console.log(`   │  테스트: ${analysis.passed}/${analysis.tests.length} 통과 (${formatPercent(analysis.passRate)})`);
      console.log(`   │  ${getProgressBar(analysis.passRate, 25)}`);
      console.log(`   │`);
      console.log(`   │  📊 진단: ${analysis.diagnosis}`);

      if (analysis.healthStatus !== 'healthy' && config) {
        console.log(`   │  ⚠️ 영향: ${config.impactIfFailed}`);
      } else if (config) {
        console.log(`   │  ✅ 보장: ${config.guaranteeIfPassed}`);
      }

      // 실패한 테스트 상세
      const failures = analysis.tests.filter(t => t.status === 'failed' || t.status === 'timedOut');
      if (failures.length > 0) {
        console.log(`   │`);
        console.log(`   │  ❌ 실패한 테스트:`);
        for (const f of failures.slice(0, 3)) {
          const intent = f.intent ? ` (${f.intent.intent})` : '';
          console.log(`   │     - ${f.title}${intent}`);
        }
        if (failures.length > 3) {
          console.log(`   │     ... 외 ${failures.length - 3}개`);
        }
      }

      console.log('   │');
      console.log('   └' + '─'.repeat(75));
      console.log('');
    }
  }

  private calculateFeatureAnalyses(): FeatureAnalysis[] {
    const categoryMap = new Map<FeatureCategory, TestRecord[]>();

    // 초기화
    for (const cat of [...Object.keys(FEATURE_CATEGORIES), 'other'] as FeatureCategory[]) {
      categoryMap.set(cat, []);
    }

    // 분류
    for (const test of this.tests) {
      categoryMap.get(test.category)!.push(test);
    }

    // 분석
    return Array.from(categoryMap.entries())
      .map(([category, tests]) => {
        const passed = tests.filter(t => t.status === 'passed').length;
        const failed = tests.filter(t => t.status === 'failed' || t.status === 'timedOut').length;
        const skipped = tests.filter(t => t.status === 'skipped').length;
        const passRate = tests.length > 0 ? passed / tests.length : 0;
        const totalDuration = tests.reduce((s, t) => s + t.duration, 0);
        const config = category === 'other' ? null : FEATURE_CATEGORIES[category];

        // 건강 상태 결정
        let healthStatus: 'healthy' | 'warning' | 'critical';
        let diagnosis: string;

        if (tests.length === 0) {
          healthStatus = 'healthy';
          diagnosis = '테스트 없음';
        } else if (passRate === 1) {
          healthStatus = 'healthy';
          diagnosis = '모든 테스트 통과. 이 기능은 안정적으로 작동합니다.';
        } else if (passRate >= 0.8) {
          healthStatus = 'warning';
          diagnosis = `일부 실패 (${failed}개). 대부분 작동하지만 일부 케이스에서 문제 발생.`;
        } else if (passRate >= 0.5) {
          healthStatus = 'critical';
          diagnosis = `다수 실패 (${failed}개). 이 기능에 심각한 문제가 있습니다.`;
        } else {
          healthStatus = 'critical';
          diagnosis = `대부분 실패 (${failed}개). 이 기능이 거의 작동하지 않습니다.`;
        }

        // 스킵이 많으면 진단 수정
        if (skipped > passed && skipped > 0) {
          healthStatus = 'warning';
          diagnosis = `대부분 스킵됨 (${skipped}개). 테스트 환경 문제 또는 전제조건 미충족.`;
        }

        return {
          category,
          config,
          tests,
          passed,
          failed,
          skipped,
          passRate,
          avgDuration: tests.length > 0 ? totalDuration / tests.length : 0,
          healthStatus,
          diagnosis,
        };
      })
      .filter(a => a.tests.length > 0)
      .sort((a, b) => {
        // 중요도 순 정렬
        const importanceOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const aImportance = a.config?.importance ?? 'low';
        const bImportance = b.config?.importance ?? 'low';
        return importanceOrder[aImportance] - importanceOrder[bImportance];
      });
  }

  private printIntentAnalysis(): void {
    const testsWithIntent = this.tests.filter(t => t.intent);
    if (testsWithIntent.length === 0) return;

    console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                           🔍 테스트 의도 분석                                 ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    console.log('\n   각 테스트가 무엇을 검증하고, 왜 중요한지 설명합니다.\n');

    // 의도별로 그룹화
    const intentGroups = new Map<string, TestRecord[]>();
    for (const test of testsWithIntent) {
      const key = test.intent!.intent;
      if (!intentGroups.has(key)) {
        intentGroups.set(key, []);
      }
      intentGroups.get(key)!.push(test);
    }

    for (const [intent, tests] of intentGroups) {
      const passed = tests.filter(t => t.status === 'passed').length;
      const total = tests.length;
      const sample = tests[0].intent!;
      const status = passed === total ? '✅' : passed > 0 ? '⚠️' : '❌';

      console.log(`   ${status} ${intent} (${passed}/${total} 성공)`);
      console.log(`   │  검증 내용: ${sample.whatItTests}`);
      console.log(`   │  중요성: ${sample.whyItMatters}`);

      if (passed < total) {
        const failures = tests.filter(t => t.status !== 'passed');
        console.log(`   │  실패 사례:`);
        for (const f of failures.slice(0, 2)) {
          console.log(`   │    - ${f.title}`);
        }
      }
      console.log('   │');
    }
  }

  private printFailureDeepDive(failures: TestRecord[]): void {
    console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                           ❌ 실패 심층 분석                                   ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
    console.log('\n   각 실패의 원인과 해결 방법을 분석합니다.\n');

    // 에러 패턴 분류
    const patterns: { pattern: string; tests: TestRecord[]; cause: string; solution: string }[] = [
      { pattern: '타임아웃', tests: [], cause: '요소가 나타나지 않거나 응답이 없음', solution: '타임아웃 값 증가 또는 대기 조건 수정' },
      { pattern: '셀렉터 실패', tests: [], cause: 'data-testid가 없거나 요소가 렌더링되지 않음', solution: '컴포넌트에 data-testid 추가 또는 셀렉터 수정' },
      { pattern: 'Assertion 실패', tests: [], cause: '예상값과 실제값 불일치', solution: '게임 로직 수정 또는 테스트 기대값 조정' },
      { pattern: '클릭 실패', tests: [], cause: '요소가 클릭 불가능하거나 가려져 있음', solution: '요소 가시성 확인 또는 스크롤 처리 추가' },
      { pattern: '기타', tests: [], cause: '분류되지 않은 에러', solution: '에러 메시지 상세 확인 필요' },
    ];

    for (const f of failures) {
      let matched = false;
      if (f.status === 'timedOut') {
        patterns[0].tests.push(f);
        matched = true;
      } else if (f.error) {
        if (f.error.includes('waitForSelector')) { patterns[1].tests.push(f); matched = true; }
        else if (f.error.includes('expect')) { patterns[2].tests.push(f); matched = true; }
        else if (f.error.includes('click')) { patterns[3].tests.push(f); matched = true; }
      }
      if (!matched) patterns[4].tests.push(f);
    }

    for (const p of patterns) {
      if (p.tests.length === 0) continue;

      console.log(`   🔴 ${p.pattern} (${p.tests.length}건)`);
      console.log(`   │`);
      console.log(`   │  원인: ${p.cause}`);
      console.log(`   │  해결: ${p.solution}`);
      console.log(`   │`);
      console.log(`   │  해당 테스트:`);

      for (const t of p.tests.slice(0, 5)) {
        const category = t.category !== 'other' ? FEATURE_CATEGORIES[t.category]?.name : '기타';
        console.log(`   │    - [${category}] ${t.title}`);
        if (t.error) {
          const shortError = t.error.substring(0, 60) + (t.error.length > 60 ? '...' : '');
          console.log(`   │      에러: ${shortError}`);
        }
      }

      if (p.tests.length > 5) {
        console.log(`   │    ... 외 ${p.tests.length - 5}개`);
      }

      console.log('   │');
      console.log('   └' + '─'.repeat(75));
      console.log('');
    }
  }

  private printQualityMetrics(): void {
    const flakyTests = this.tests.filter(t => t.status === 'passed' && t.retries > 0);
    const skippedTests = this.tests.filter(t => t.status === 'skipped');
    const avgDuration = this.tests.length > 0
      ? this.tests.reduce((s, t) => s + t.duration, 0) / this.tests.length
      : 0;
    const slowTests = this.tests.filter(t => t.duration > avgDuration * 2);

    console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                           ⚡ 품질 지표                                        ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

    // 안정성
    console.log('   📊 테스트 안정성');
    if (flakyTests.length === 0) {
      console.log('   ├─ ✅ 불안정한 테스트 없음 - 모든 테스트가 첫 시도에 통과');
    } else {
      console.log(`   ├─ ⚠️ 불안정한 테스트: ${flakyTests.length}개`);
      console.log('   │     재시도 후 통과 = 타이밍/비동기 문제 가능성');
      for (const t of flakyTests.slice(0, 3)) {
        console.log(`   │     - ${t.title} (${t.retries}회 재시도)`);
      }
    }

    // 커버리지
    console.log('   │');
    console.log('   📊 테스트 커버리지');
    if (skippedTests.length === 0) {
      console.log('   ├─ ✅ 모든 테스트 실행됨');
    } else {
      console.log(`   ├─ ⏭️ 스킵된 테스트: ${skippedTests.length}개`);
      console.log('   │     스킵 = 전제조건 미충족. 테스트 환경 제한일 수 있음');
      for (const t of skippedTests.slice(0, 3)) {
        console.log(`   │     - ${t.title}`);
      }
    }

    // 성능
    console.log('   │');
    console.log('   📊 테스트 성능');
    const durations = this.tests.map(t => t.duration).sort((a, b) => a - b);
    if (durations.length > 0) {
      const median = durations[Math.floor(durations.length / 2)];
      const p90 = durations[Math.floor(durations.length * 0.9)];
      console.log(`   ├─ 중간값: ${formatDuration(median)}  |  90%: ${formatDuration(p90)}`);

      if (slowTests.length > 0) {
        console.log(`   ├─ 🐌 느린 테스트: ${slowTests.length}개 (평균의 2배 초과)`);
        for (const t of slowTests.slice(0, 3)) {
          console.log(`   │     - ${t.title} (${formatDuration(t.duration)})`);
        }
      }
    }
    console.log('');
  }

  private printRecommendations(): void {
    const recommendations: { priority: 'high' | 'medium' | 'low'; action: string; reason: string }[] = [];

    const failedCritical = this.tests.filter(t =>
      (t.status === 'failed' || t.status === 'timedOut') &&
      t.category !== 'other' &&
      FEATURE_CATEGORIES[t.category]?.importance === 'critical'
    );

    const failedHigh = this.tests.filter(t =>
      (t.status === 'failed' || t.status === 'timedOut') &&
      t.category !== 'other' &&
      FEATURE_CATEGORIES[t.category]?.importance === 'high'
    );

    const flakyTests = this.tests.filter(t => t.status === 'passed' && t.retries > 0);
    const skippedTests = this.tests.filter(t => t.status === 'skipped');

    if (failedCritical.length > 0) {
      recommendations.push({
        priority: 'high',
        action: `필수 기능 수정 필요 (${failedCritical.length}개 실패)`,
        reason: '전투/맵/앱 시작 등 핵심 기능에 문제가 있어 게임 플레이 불가',
      });
    }

    if (failedHigh.length > 0) {
      recommendations.push({
        priority: 'high',
        action: `중요 기능 수정 필요 (${failedHigh.length}개 실패)`,
        reason: '상점/상태 표시 등 중요 기능에 문제가 있어 게임 경험 저하',
      });
    }

    if (flakyTests.length > 3) {
      recommendations.push({
        priority: 'medium',
        action: '테스트 안정성 개선',
        reason: `${flakyTests.length}개 테스트가 불안정함. 타이밍 문제 해결 필요`,
      });
    }

    if (skippedTests.length > this.tests.length * 0.2) {
      recommendations.push({
        priority: 'medium',
        action: '테스트 환경 점검',
        reason: `${skippedTests.length}개(${formatPercent(skippedTests.length / this.tests.length)}) 테스트가 스킵됨`,
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        action: '현재 상태 유지',
        reason: '모든 테스트가 정상 작동 중. 새 기능 추가 시 테스트 확장 권장',
      });
    }

    console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                           💡 권장 조치                                        ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

    for (const rec of recommendations) {
      const icon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
      console.log(`   ${icon} [${rec.priority.toUpperCase()}] ${rec.action}`);
      console.log(`      └─ ${rec.reason}`);
      console.log('');
    }
  }

  private printFinalVerdict(status: FullResult['status'], totalDuration: number): void {
    const total = this.tests.length;
    const passed = this.tests.filter(t => t.status === 'passed').length;
    const failed = this.tests.filter(t => t.status === 'failed' || t.status === 'timedOut').length;
    const skipped = this.tests.filter(t => t.status === 'skipped').length;
    const passRate = total > 0 ? passed / total : 0;

    console.log('\n');
    console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');

    if (status === 'passed') {
      console.log('┃                          ✅ 테스트 전체 통과                                 ┃');
      console.log('┃                                                                              ┃');
      console.log(`┃   결과: ${total}개 중 ${passed}개 성공, ${skipped}개 스킵                                        ┃`);
      console.log('┃   의미: 테스트된 모든 기능이 정상 작동합니다.                                 ┃');
    } else {
      console.log('┃                          ❌ 테스트 실패                                       ┃');
      console.log('┃                                                                              ┃');
      console.log(`┃   결과: ${total}개 중 ${passed}개 성공, ${failed}개 실패, ${skipped}개 스킵                              ┃`);
      console.log(`┃   성공률: ${formatPercent(passRate)} - ${passRate >= 0.8 ? '대부분 작동' : passRate >= 0.5 ? '일부 문제' : '심각한 문제'}                                           ┃`);
    }

    console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
    console.log(`\n📅 종료: ${new Date().toLocaleString('ko-KR')}  ⏱️ 총 시간: ${formatDuration(totalDuration)}`);
    console.log('');
  }
}
