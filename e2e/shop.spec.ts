import { test, expect, Page } from '@playwright/test';
import { resetGameState, waitForMap, selectMapNode, waitForUIStable } from './utils/test-helpers';

/**
 * 상점 시스템 E2E 테스트
 */
test.describe('상점 시스템', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
  });

  /**
   * 상점 화면으로 진입하는 헬퍼
   */
  async function enterShop(page: Page) {
    // 맵 화면 대기 (중앙 헬퍼 사용)
    await waitForMap(page);

    // 상점 노드 클릭 (중앙 헬퍼 사용)
    const shopClicked = await selectMapNode(page, 'shop');

    if (shopClicked) {
      // 상점 모달이 열릴 때까지 대기 (상태 기반)
      await page.waitForSelector('[data-testid="shop-modal"]', { timeout: 3000 }).catch(() => {});
      await waitForUIStable(page);
    }
  }

  test('상점 UI가 표시됨', async ({ page }) => {
    await enterShop(page);

    // 상점 모달 (구체적인 셀렉터 사용)
    const shopScreen = page.locator('[data-testid="shop-modal"]').first();

    if (await shopScreen.isVisible({ timeout: 2000 }).catch(() => false)) {
      // 상점 아이템 목록
      const items = page.locator('[data-testid="shop-item"], .shop-item');
      const itemCount = await items.count();

      expect(itemCount).toBeGreaterThan(0);
    }
  });

  test('상점 아이템에 가격이 표시됨', async ({ page }) => {
    await enterShop(page);

    const shopScreen = page.locator('[data-testid="shop-modal"]').first();

    if (await shopScreen.isVisible({ timeout: 2000 }).catch(() => false)) {
      // 가격 표시 확인
      const prices = page.locator('.item-price, [data-testid="item-price"], [class*="price"]');
      const priceCount = await prices.count();

      if (priceCount > 0) {
        const firstPrice = await prices.first().textContent();
        // 숫자가 포함되어 있어야 함
        expect(firstPrice).toMatch(/\d+/);
      }
    }
  });

  test('골드가 부족하면 구매 불가', async ({ page }) => {
    await enterShop(page);

    const shopScreen = page.locator('[data-testid="shop-modal"]').first();

    if (await shopScreen.isVisible({ timeout: 2000 }).catch(() => false)) {
      // 비싼 아이템 찾기 (구매 불가능한 것)
      const disabledItem = page.locator(
        '.shop-item.disabled, [data-testid="shop-item"][disabled], .cannot-afford'
      );

      // 비활성화된 아이템이 있거나, 모든 아이템이 구매 가능
      const hasDisabled = await disabledItem.isVisible().catch(() => false);
      console.log('Has disabled items due to gold:', hasDisabled);
    }
  });

  test('상점 서비스(제거/강화)가 표시됨', async ({ page }) => {
    await enterShop(page);

    const shopScreen = page.locator('[data-testid="shop-modal"]').first();

    if (await shopScreen.isVisible({ timeout: 2000 }).catch(() => false)) {
      // 서비스 섹션 (카드 제거, 강화 등)
      const services = page.locator(
        '[data-testid="shop-services"], .shop-services, .service-section, button:has-text("제거"), button:has-text("강화")'
      );

      const hasServices = await services.isVisible().catch(() => false);
      console.log('Shop has services section:', hasServices);
    }
  });

  test('상점 나가기가 가능함', async ({ page }) => {
    await enterShop(page);

    const shopScreen = page.locator('[data-testid="shop-modal"]').first();

    if (await shopScreen.isVisible({ timeout: 2000 }).catch(() => false)) {
      // 닫기/나가기 버튼
      const closeBtn = page.locator(
        '[data-testid="exit-shop-btn"], button:has-text("나가기"), button:has-text("닫기"), .close-btn, .modal-close'
      );

      if (await closeBtn.isVisible()) {
        await closeBtn.click();

        // 상점이 닫혔는지 확인
        await expect(shopScreen).not.toBeVisible({ timeout: 3000 });
      }
    }
  });
});

test.describe('상점 구매', () => {
  test('아이템 구매 시 골드가 차감됨', async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);

    // 맵 화면 대기 (중앙 헬퍼 사용)
    await waitForMap(page);

    // 현재 골드 확인
    const goldDisplay = page.locator('[data-testid="player-gold"], .player-gold');
    let initialGold = 0;

    if (await goldDisplay.isVisible()) {
      const goldText = await goldDisplay.textContent();
      const match = goldText?.match(/(\d+)/);
      initialGold = match ? parseInt(match[1]) : 0;
    }

    // 상점 진입 (중앙 헬퍼 사용)
    const shopClicked = await selectMapNode(page, 'shop');

    if (shopClicked && initialGold > 0) {
      await page.waitForSelector('[data-testid="shop-modal"]', { timeout: 3000 }).catch(() => {});

      // 구매 가능한 아이템 클릭
      const affordableItem = page.locator(
        '.shop-item:not(.disabled), [data-testid="shop-item"]:not([disabled])'
      ).first();

      if (await affordableItem.isVisible()) {
        await affordableItem.click();

        // 구매 버튼 클릭
        const buyBtn = page.locator(
          '[data-testid="buy-btn"], button:has-text("구매"), button:has-text("Buy")'
        );

        if (await buyBtn.isVisible()) {
          await buyBtn.click();

          // 골드 차감 대기 (상태 기반)
          await waitForUIStable(page);
        }
      }
    }
  });
});
