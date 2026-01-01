import { test, expect } from '@playwright/test';

/**
 * 앱 기본 로드 테스트
 */
test.describe('앱 시작', () => {
  test('앱이 정상적으로 로드됨', async ({ page }) => {
    await page.goto('/');

    // 페이지 타이틀 확인
    await expect(page).toHaveTitle(/하하하GO|Strategy|Game/i);

    // 메인 컨테이너가 표시되는지 확인
    const container = page.locator('#root');
    await expect(container).toBeVisible();
  });

  test('초기 화면이 렌더링됨', async ({ page }) => {
    await page.goto('/');

    // React 앱이 로드될 때까지 대기
    await page.waitForSelector('#root > *', { timeout: 10000 });

    // 에러 메시지가 없는지 확인
    const errorBoundary = page.locator('[data-testid="error-boundary"]');
    await expect(errorBoundary).not.toBeVisible();
  });

  test('콘솔에 치명적인 에러가 없음', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // 치명적인 React 에러 필터링
    const criticalErrors = errors.filter(
      (e) =>
        e.includes('Uncaught') ||
        e.includes('TypeError') ||
        e.includes('ReferenceError')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('localStorage 접근 가능', async ({ page }) => {
    await page.goto('/');

    const canAccessStorage = await page.evaluate(() => {
      try {
        localStorage.setItem('test', 'value');
        const result = localStorage.getItem('test') === 'value';
        localStorage.removeItem('test');
        return result;
      } catch {
        return false;
      }
    });

    expect(canAccessStorage).toBe(true);
  });
});
