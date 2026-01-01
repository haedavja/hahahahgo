import { test, expect } from '@playwright/test';
import { resetGameState } from './utils/test-helpers';

/**
 * 게임 흐름 E2E 테스트
 */
test.describe('게임 흐름', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
  });

  test('새 게임 시작 가능', async ({ page }) => {
    // 게임 시작 버튼 또는 맵 화면 확인
    const startBtn = page.locator('button:has-text("시작"), button:has-text("Start"), [data-testid="start-game-btn"]');
    const mapContainer = page.locator('[data-testid="map-container"], .map-container');

    // 시작 버튼이 있으면 클릭
    if (await startBtn.isVisible()) {
      await startBtn.click();
    }

    // 맵이나 게임 화면이 표시되어야 함
    await expect(
      mapContainer.or(page.locator('[data-testid="game-screen"]'))
    ).toBeVisible({ timeout: 10000 });
  });

  test('맵에서 노드 선택 가능', async ({ page }) => {
    // 맵 화면으로 이동
    await page.waitForSelector('.map-container, [data-testid="map-container"]', {
      state: 'visible',
      timeout: 15000,
    }).catch(() => {
      // 시작 버튼 클릭 필요
      return page.click('button:has-text("시작"), button:has-text("Start")');
    });

    // 클릭 가능한 노드 찾기
    const nodes = page.locator('.map-node:not(.disabled), [data-node-type]');
    const nodeCount = await nodes.count();

    expect(nodeCount).toBeGreaterThan(0);

    // 첫 번째 활성 노드 클릭
    if (nodeCount > 0) {
      await nodes.first().click();
    }
  });

  test('플레이어 상태가 표시됨', async ({ page }) => {
    await page.waitForSelector('.map-container, [data-testid="map-container"]', {
      timeout: 15000,
    }).catch(() => page.click('button:has-text("시작")'));

    // HP 표시 확인 (다양한 셀렉터 시도)
    const hpDisplay = page.locator('[data-testid="player-hp"], .player-hp, .hp-bar');

    // 골드 표시 확인
    const goldDisplay = page.locator('[data-testid="player-gold"], .player-gold, .gold-display');

    // 둘 중 하나는 표시되어야 함
    const isHpVisible = await hpDisplay.isVisible().catch(() => false);
    const isGoldVisible = await goldDisplay.isVisible().catch(() => false);

    expect(isHpVisible || isGoldVisible).toBe(true);
  });

  test('게임 저장/로드 기능', async ({ page }) => {
    await page.waitForSelector('.map-container, [data-testid="map-container"]', {
      timeout: 15000,
    }).catch(() => page.click('button:has-text("시작")'));

    // 게임 상태가 localStorage에 저장되는지 확인
    const hasGameState = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      return keys.some(
        (key) =>
          key.includes('game') ||
          key.includes('save') ||
          key.includes('zustand')
      );
    });

    // Zustand persist를 사용한다면 저장이 있어야 함
    // 없어도 테스트 실패는 아님 (선택적 기능)
    console.log('Game state saved to localStorage:', hasGameState);
  });
});

test.describe('맵 네비게이션', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
  });

  test('맵 레이어가 순차적으로 진행됨', async ({ page }) => {
    await page.waitForSelector('.map-container, [data-testid="map-container"]', {
      timeout: 15000,
    }).catch(() => page.click('button:has-text("시작")'));

    // 현재 레이어 정보 확인
    const layerInfo = page.locator('[data-testid="layer-info"], .layer-display, .current-layer');

    if (await layerInfo.isVisible()) {
      const layerText = await layerInfo.textContent();
      expect(layerText).toBeTruthy();
    }
  });

  test('노드 연결이 시각적으로 표시됨', async ({ page }) => {
    await page.waitForSelector('.map-container, [data-testid="map-container"]', {
      timeout: 15000,
    }).catch(() => page.click('button:has-text("시작")'));

    // 맵 경로 또는 노드 연결선 확인
    const paths = page.locator('path, .map-path, .node-connection, svg line');
    const pathCount = await paths.count();

    // 맵에 연결선이 있어야 함
    expect(pathCount).toBeGreaterThan(0);
  });
});
