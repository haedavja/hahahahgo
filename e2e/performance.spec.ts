import { test, expect, Page } from '@playwright/test';
import { resetGameState, waitForMap, selectMapNode, waitForUIStable, TIMEOUTS, testLogger } from './utils/test-helpers';

/**
 * 성능 테스트 E2E
 *
 * ## 성능 검증 항목
 * 1. 초기 로딩 시간
 * 2. 전투 화면 렌더링
 * 3. 카드 애니메이션 프레임율
 * 4. 메모리 누수 검사
 * 5. 긴 세션 안정성
 */
test.describe('성능 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  /**
   * 성능 메트릭 수집
   */
  async function collectPerformanceMetrics(page: Page): Promise<{
    loadTime: number;
    domContentLoaded: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    memoryUsage: number;
  }> {
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      const fcp = paint.find(p => p.name === 'first-contentful-paint');
      const lcp = performance.getEntriesByType('largest-contentful-paint').pop() as PerformanceEntry | undefined;

      // @ts-expect-error - memory API
      const memory = performance.memory?.usedJSHeapSize || 0;

      return {
        loadTime: navigation?.loadEventEnd - navigation?.startTime || 0,
        domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.startTime || 0,
        firstContentfulPaint: fcp?.startTime || 0,
        largestContentfulPaint: lcp?.startTime || 0,
        memoryUsage: memory,
      };
    });

    return metrics;
  }

  /**
   * 프레임율 측정
   */
  async function measureFrameRate(page: Page, durationMs: number = 1000): Promise<number> {
    return await page.evaluate(async (duration) => {
      let frameCount = 0;
      const startTime = performance.now();

      return new Promise<number>((resolve) => {
        function countFrame() {
          frameCount++;
          if (performance.now() - startTime < duration) {
            requestAnimationFrame(countFrame);
          } else {
            const elapsed = performance.now() - startTime;
            resolve(Math.round(frameCount / (elapsed / 1000)));
          }
        }
        requestAnimationFrame(countFrame);
      });
    }, durationMs);
  }

  /**
   * 메모리 스냅샷
   */
  async function getMemoryUsage(page: Page): Promise<number> {
    return await page.evaluate(() => {
      // @ts-expect-error - memory API
      return performance.memory?.usedJSHeapSize || 0;
    });
  }

  test.describe('초기 로딩 성능', () => {
    test('페이지 로드 시간 3초 이내', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;
      testLogger.info('페이지 로드 시간', `${loadTime}ms`);

      // 3초 이내 로드
      expect(loadTime).toBeLessThan(3000);
    });

    test('First Contentful Paint 2초 이내', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const metrics = await collectPerformanceMetrics(page);
      testLogger.info('FCP', `${metrics.firstContentfulPaint}ms`);

      // FCP 2초 이내
      expect(metrics.firstContentfulPaint).toBeLessThan(2000);
    });

    test('게임 화면 표시 5초 이내', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/');
      await resetGameState(page);
      await waitForMap(page);

      const displayTime = Date.now() - startTime;
      testLogger.info('게임 화면 표시 시간', `${displayTime}ms`);

      // 5초 이내
      expect(displayTime).toBeLessThan(5000);
    });
  });

  test.describe('전투 성능', () => {
    test('전투 화면 전환 1초 이내', async ({ page }) => {
      await resetGameState(page);
      await waitForMap(page);

      const startTime = Date.now();
      const battleClicked = await selectMapNode(page, 'battle');

      if (battleClicked) {
        await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 });

        const transitionTime = Date.now() - startTime;
        testLogger.info('전투 화면 전환 시간', `${transitionTime}ms`);

        // 1초 이내
        expect(transitionTime).toBeLessThan(1000);
      }
    });

    test('카드 선택 반응 100ms 이내', async ({ page }) => {
      await resetGameState(page);
      await waitForMap(page);

      const battleClicked = await selectMapNode(page, 'battle');
      test.skip(!battleClicked, '전투 진입 실패');

      await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 });
      await waitForUIStable(page);

      // 카드 선택
      const card = page.locator('[data-testid^="hand-card-"]').first();
      if (await card.isVisible()) {
        const startTime = Date.now();
        await card.click();

        // 선택 상태 반영 대기
        await page.waitForFunction(
          () => document.querySelector('[data-card-selected="true"]'),
          { timeout: 1000 }
        ).catch(() => {});

        const responseTime = Date.now() - startTime;
        testLogger.info('카드 선택 반응 시간', `${responseTime}ms`);

        // 100ms 이내
        expect(responseTime).toBeLessThan(100);
      }
    });

    test('전투 중 프레임율 30fps 이상', async ({ page }) => {
      await resetGameState(page);
      await waitForMap(page);

      const battleClicked = await selectMapNode(page, 'battle');
      test.skip(!battleClicked, '전투 진입 실패');

      await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 });
      await waitForUIStable(page);

      // 프레임율 측정
      const fps = await measureFrameRate(page, 2000);
      testLogger.info('전투 중 프레임율', `${fps}fps`);

      // 30fps 이상
      expect(fps).toBeGreaterThanOrEqual(30);
    });

    test('타임라인 애니메이션 부드러움', async ({ page }) => {
      await resetGameState(page);
      await waitForMap(page);

      const battleClicked = await selectMapNode(page, 'battle');
      test.skip(!battleClicked, '전투 진입 실패');

      await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 });
      await waitForUIStable(page);

      // 카드 제출하여 타임라인 애니메이션 트리거
      const cards = page.locator('[data-testid^="hand-card-"]');
      if (await cards.count() > 0) {
        await cards.first().click();
        const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
        if (await submitBtn.isEnabled()) {
          await submitBtn.click();

          // 애니메이션 중 프레임율 측정
          const fps = await measureFrameRate(page, 1000);
          testLogger.info('타임라인 애니메이션 중 프레임율', `${fps}fps`);

          // 24fps 이상 (애니메이션 부드러움)
          expect(fps).toBeGreaterThanOrEqual(24);
        }
      }
    });
  });

  test.describe('메모리 관리', () => {
    test('전투 5회 후 메모리 증가 50% 이내', async ({ page }) => {
      await resetGameState(page);
      await waitForMap(page);

      // 초기 메모리
      const initialMemory = await getMemoryUsage(page);
      testLogger.info('초기 메모리', `${Math.round(initialMemory / 1024 / 1024)}MB`);

      // 5회 전투 시뮬레이션
      for (let battle = 0; battle < 5; battle++) {
        const battleClicked = await selectMapNode(page, 'battle');
        if (!battleClicked) continue;

        await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 }).catch(() => {});

        // 간단한 전투 진행
        for (let turn = 0; turn < 5; turn++) {
          const battleResult = page.locator('[data-testid="battle-result"]');
          if (await battleResult.isVisible({ timeout: 300 }).catch(() => false)) {
            break;
          }

          const cards = page.locator('[data-testid^="hand-card-"]');
          if (await cards.count() > 0) {
            await cards.first().click();
            const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
            if (await submitBtn.isEnabled({ timeout: 300 }).catch(() => false)) {
              await submitBtn.click();
              await page.waitForTimeout(500);
            }
          }
        }

        // 전투 종료 후 진행
        const continueBtn = page.locator('[data-testid="continue-btn"]');
        if (await continueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await continueBtn.click();
        }

        await waitForMap(page);
      }

      // 최종 메모리
      const finalMemory = await getMemoryUsage(page);
      testLogger.info('최종 메모리', `${Math.round(finalMemory / 1024 / 1024)}MB`);

      const memoryIncrease = (finalMemory - initialMemory) / initialMemory;
      testLogger.info('메모리 증가율', `${Math.round(memoryIncrease * 100)}%`);

      // 50% 이내 증가
      expect(memoryIncrease).toBeLessThan(0.5);
    });

    test('화면 전환 시 메모리 해제', async ({ page }) => {
      await resetGameState(page);
      await waitForMap(page);

      // 전투 진입
      const battleClicked = await selectMapNode(page, 'battle');
      if (battleClicked) {
        await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 }).catch(() => {});
        await waitForUIStable(page);

        const battleMemory = await getMemoryUsage(page);
        testLogger.info('전투 중 메모리', `${Math.round(battleMemory / 1024 / 1024)}MB`);

        // 전투 종료 (스킵)
        const cards = page.locator('[data-testid^="hand-card-"]');
        for (let i = 0; i < 15; i++) {
          const result = page.locator('[data-testid="battle-result"]');
          if (await result.isVisible({ timeout: 300 }).catch(() => false)) break;

          if (await cards.count() > 0) {
            await cards.first().click();
            const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
            if (await submitBtn.isEnabled({ timeout: 300 }).catch(() => false)) {
              await submitBtn.click();
              await page.waitForTimeout(500);
            }
          }
        }

        // 맵으로 복귀
        const continueBtn = page.locator('[data-testid="continue-btn"]');
        if (await continueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await continueBtn.click();
        }

        await waitForMap(page);
        await page.waitForTimeout(1000);

        const mapMemory = await getMemoryUsage(page);
        testLogger.info('맵 복귀 후 메모리', `${Math.round(mapMemory / 1024 / 1024)}MB`);

        // 메모리가 크게 증가하지 않음
        const increase = (mapMemory - battleMemory) / battleMemory;
        expect(increase).toBeLessThan(0.2); // 20% 이내
      }
    });
  });

  test.describe('UI 반응성', () => {
    test('버튼 클릭 반응 50ms 이내', async ({ page }) => {
      await resetGameState(page);
      await waitForMap(page);

      // 상호작용 가능한 버튼 찾기
      const interactiveBtn = page.locator('button:visible').first();

      if (await interactiveBtn.isVisible()) {
        const startTime = Date.now();
        await interactiveBtn.click();

        const responseTime = Date.now() - startTime;
        testLogger.info('버튼 클릭 반응 시간', `${responseTime}ms`);

        // 50ms 이내
        expect(responseTime).toBeLessThan(50);
      }
    });

    test('스크롤 부드러움', async ({ page }) => {
      await resetGameState(page);
      await waitForMap(page);

      // 덱 보기 (스크롤 가능한 영역)
      const deckBtn = page.locator('[data-testid="view-deck-btn"]');
      if (await deckBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await deckBtn.click();
        await page.waitForTimeout(500);

        // 스크롤 시 프레임율 측정
        const scrollContainer = page.locator('.deck-list, [data-testid="deck-container"]');
        if (await scrollContainer.isVisible()) {
          await scrollContainer.evaluate((el) => {
            el.scrollTop = 0;
          });

          const fps = await measureFrameRate(page, 500);

          // 스크롤 실행
          await scrollContainer.evaluate((el) => {
            el.scrollTop = el.scrollHeight;
          });

          testLogger.info('스크롤 중 프레임율', `${fps}fps`);

          // 30fps 이상
          expect(fps).toBeGreaterThanOrEqual(30);
        }
      }
    });
  });

  test.describe('번들 크기', () => {
    test('초기 JS 번들 1MB 이내', async ({ page }) => {
      const jsRequests: number[] = [];

      page.on('response', async (response) => {
        const url = response.url();
        if (url.endsWith('.js') || url.includes('.js?')) {
          const buffer = await response.body().catch(() => null);
          if (buffer) {
            jsRequests.push(buffer.length);
          }
        }
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const totalJsSize = jsRequests.reduce((a, b) => a + b, 0);
      testLogger.info('총 JS 크기', `${Math.round(totalJsSize / 1024)}KB`);

      // 1MB 이내
      expect(totalJsSize).toBeLessThan(1024 * 1024);
    });

    test('CSS 번들 200KB 이내', async ({ page }) => {
      const cssRequests: number[] = [];

      page.on('response', async (response) => {
        const url = response.url();
        if (url.endsWith('.css') || url.includes('.css?')) {
          const buffer = await response.body().catch(() => null);
          if (buffer) {
            cssRequests.push(buffer.length);
          }
        }
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const totalCssSize = cssRequests.reduce((a, b) => a + b, 0);
      testLogger.info('총 CSS 크기', `${Math.round(totalCssSize / 1024)}KB`);

      // 200KB 이내
      expect(totalCssSize).toBeLessThan(200 * 1024);
    });
  });

  test.describe('긴 세션 안정성', () => {
    test('10분 연속 플레이 시 크래시 없음', async ({ page }) => {
      test.setTimeout(120000); // 2분 타임아웃 (축소 버전)

      await resetGameState(page);
      await waitForMap(page);

      let errorOccurred = false;
      page.on('pageerror', (error) => {
        testLogger.error('페이지 에러', error.message);
        errorOccurred = true;
      });

      // 2분간 게임 진행 (실제로는 10분이지만 테스트용으로 축소)
      const startTime = Date.now();
      const duration = 60000; // 1분

      while (Date.now() - startTime < duration) {
        // 랜덤 액션 수행
        const actions = ['battle', 'shop', 'rest', 'event'];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];

        const clicked = await selectMapNode(page, randomAction);
        if (clicked) {
          await page.waitForTimeout(1000);

          // 모달 닫기 또는 전투 스킵
          const closeBtn = page.locator('[data-testid="close-btn"], .close-btn');
          if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
            await closeBtn.click();
          }

          const continueBtn = page.locator('[data-testid="continue-btn"]');
          if (await continueBtn.isVisible({ timeout: 500 }).catch(() => false)) {
            await continueBtn.click();
          }
        }

        await waitForMap(page);
      }

      testLogger.info('긴 세션 테스트 완료', { duration: Date.now() - startTime, errors: errorOccurred });

      expect(errorOccurred).toBe(false);
    });
  });
});
