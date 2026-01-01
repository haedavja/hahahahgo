import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 테스트 설정
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',

  /* 테스트 파일 패턴 */
  testMatch: '**/*.spec.ts',

  /* 최대 병렬 실행 수 */
  fullyParallel: true,

  /* CI에서는 재시도 없음, 로컬에서는 2회 재시도 */
  retries: process.env.CI ? 0 : 2,

  /* 병렬 워커 수 */
  workers: process.env.CI ? 1 : undefined,

  /* 리포터 설정 */
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  /* 공유 설정 */
  use: {
    /* 기본 URL */
    baseURL: 'http://localhost:5173',

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
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
