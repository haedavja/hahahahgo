import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 테스트 설정
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',

  /* 테스트 파일 패턴 */
  testMatch: '**/*.spec.ts',

  /* 전역 타임아웃 설정 */
  timeout: 60 * 1000, // 테스트당 60초

  /* expect 타임아웃 */
  expect: {
    timeout: 10 * 1000, // expect 대기 10초
  },

  /* 최대 병렬 실행 수 */
  fullyParallel: true,

  /* CI에서는 재시도 없음, 로컬에서는 2회 재시도 */
  retries: process.env.CI ? 0 : 2,

  /* 병렬 워커 수 */
  workers: process.env.CI ? 1 : undefined,

  /* 리포터 설정 */
  reporter: [
    ['./e2e/reporters/stats-reporter.ts'], // 커스텀 통계 리포터
    ['html', { open: 'never' }],
  ],

  /* 공유 설정 */
  use: {
    /* 기본 URL - Vite 설정과 일치 (vite.config.js의 server.port) */
    baseURL: 'http://localhost:5173',

    /* 액션 타임아웃 (클릭, 입력 등) */
    actionTimeout: 15 * 1000,

    /* 네비게이션 타임아웃 */
    navigationTimeout: 30 * 1000,

    /* 실패 시 스크린샷 */
    screenshot: 'only-on-failure',

    /* 실패 시 트레이스 */
    trace: 'on-first-retry',

    /* 비디오 녹화 */
    video: 'on-first-retry',
  },

  /* 프로젝트 (브라우저) 설정 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    /* 모바일 뷰포트 테스트 */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  /* 로컬 개발 서버 설정 */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true, // 이미 실행 중인 서버 재사용
    timeout: 120 * 1000,
  },
});
