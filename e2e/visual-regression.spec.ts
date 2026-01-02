import { test, expect } from '@playwright/test';
import { resetGameState, waitForUIStable, waitForMap } from './utils/test-helpers';

/**
 * 시각적 회귀 테스트
 * 스크린샷 비교를 통한 UI 변경 감지
 * 개선: waitForTimeout 대신 waitForUIStable 사용
 */

test.describe('시각적 회귀 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
    // UI 안정화 대기 (상태 기반)
    await waitForUIStable(page);
  });

  test('맵 화면 스크린샷', async ({ page }) => {
    // 맵 화면 대기 (중앙 헬퍼 사용)
    await waitForMap(page);
    await waitForUIStable(page);

    // 맵 컨테이너 스크린샷
    const mapContainer = page.locator('[data-testid="map-container"]');
    if (await mapContainer.isVisible()) {
      await expect(mapContainer).toHaveScreenshot('map-screen.png', {
        maxDiffPixelRatio: 0.1, // 10% 차이 허용
      });
    }
  });

  test('HP 바 스크린샷', async ({ page }) => {
    await waitForMap(page);
    await waitForUIStable(page);

    // HP 영역 스크린샷
    const hpColumn = page.locator('[data-testid="map-hp-column"]');
    if (await hpColumn.isVisible()) {
      await expect(hpColumn).toHaveScreenshot('hp-bar.png', {
        maxDiffPixelRatio: 0.1,
      });
    }
  });

  test('자원 표시 스크린샷', async ({ page }) => {
    await waitForMap(page);
    await waitForUIStable(page);

    // 자원 표시 영역 스크린샷
    const resourcesDisplay = page.locator('[data-testid="resources-display"]');
    if (await resourcesDisplay.isVisible()) {
      await expect(resourcesDisplay).toHaveScreenshot('resources-display.png', {
        maxDiffPixelRatio: 0.1,
      });
    }
  });

  test('전투 화면 스크린샷', async ({ page }) => {
    // 테스트 전투 시작
    const testBattleBtn = page.locator('button:has-text("Test Mixed Battle")');

    if (await testBattleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await testBattleBtn.click();
      await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 });
      await waitForUIStable(page);

      // 전체 전투 화면 스크린샷
      const battleScreen = page.locator('[data-testid="battle-screen"]');
      if (await battleScreen.isVisible()) {
        await expect(battleScreen).toHaveScreenshot('battle-screen.png', {
          maxDiffPixelRatio: 0.15, // 전투 화면은 변동이 클 수 있음
        });
      }
    }
  });

  test('전투 플레이어 HP 바 스크린샷', async ({ page }) => {
    const testBattleBtn = page.locator('button:has-text("Test Mixed Battle")');

    if (await testBattleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await testBattleBtn.click();
      await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 });
      await waitForUIStable(page);

      const playerHpBar = page.locator('[data-testid="player-hp-bar-container"]');
      if (await playerHpBar.isVisible()) {
        await expect(playerHpBar).toHaveScreenshot('player-hp-bar.png', {
          maxDiffPixelRatio: 0.1,
        });
      }
    }
  });

  test('전투 적 HP 바 스크린샷', async ({ page }) => {
    const testBattleBtn = page.locator('button:has-text("Test Mixed Battle")');

    if (await testBattleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await testBattleBtn.click();
      await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 });
      await waitForUIStable(page);

      const enemyHpBar = page.locator('[data-testid="enemy-hp-bar-container"]');
      if (await enemyHpBar.isVisible()) {
        await expect(enemyHpBar).toHaveScreenshot('enemy-hp-bar.png', {
          maxDiffPixelRatio: 0.1,
        });
      }
    }
  });

  test('핸드 영역 스크린샷', async ({ page }) => {
    const testBattleBtn = page.locator('button:has-text("Test Mixed Battle")');

    if (await testBattleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await testBattleBtn.click();
      await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 });
      await waitForUIStable(page);

      const handArea = page.locator('[data-testid="hand-area"]');
      if (await handArea.isVisible()) {
        await expect(handArea).toHaveScreenshot('hand-area.png', {
          maxDiffPixelRatio: 0.15,
        });
      }
    }
  });

  test('상점 모달 스크린샷', async ({ page }) => {
    await waitForMap(page);

    // 상점 노드 클릭
    const shopNode = page.locator('[data-testid="map-node-shop"], [data-node-type="shop"]').first();
    if (await shopNode.isVisible({ timeout: 2000 }).catch(() => false)) {
      await shopNode.click();
      await page.waitForSelector('[data-testid="shop-modal"]', { timeout: 5000 });
      await waitForUIStable(page);

      const shopModal = page.locator('[data-testid="shop-modal"]');
      if (await shopModal.isVisible()) {
        await expect(shopModal).toHaveScreenshot('shop-modal.png', {
          maxDiffPixelRatio: 0.1,
        });
      }
    }
  });

  test('던전 진입 모달 스크린샷', async ({ page }) => {
    await waitForMap(page);

    // 던전 노드 클릭
    const dungeonNode = page.locator('[data-testid="map-node-dungeon"], [data-node-type="dungeon"]').first();
    if (await dungeonNode.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dungeonNode.click();
      await page.waitForSelector('[data-testid="dungeon-modal"]', { timeout: 5000 });
      await waitForUIStable(page);

      const dungeonModal = page.locator('[data-testid="dungeon-modal"]');
      if (await dungeonModal.isVisible()) {
        await expect(dungeonModal).toHaveScreenshot('dungeon-modal.png', {
          maxDiffPixelRatio: 0.1,
        });
      }
    }
  });
});

test.describe('반응형 스크린샷', () => {
  const viewports = [
    { name: 'desktop', width: 1920, height: 1080 },
    { name: 'laptop', width: 1366, height: 768 },
    { name: 'tablet', width: 1024, height: 768 },
  ];

  for (const viewport of viewports) {
    test(`맵 화면 - ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await resetGameState(page);

      // 중앙 헬퍼 사용
      await waitForMap(page);
      await waitForUIStable(page);

      await expect(page).toHaveScreenshot(`map-${viewport.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.1,
      });
    });
  }
});
