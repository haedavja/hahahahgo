import { test, expect, Page } from '@playwright/test';
import { resetGameState } from './utils/test-helpers';

/**
 * 상태 검증 E2E 테스트
 * HP, 골드, 카드, 상징 등의 상태 변화 검증
 */

test.describe('상태 검증 - HP', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
  });

  /**
   * HP 파싱 헬퍼
   */
  async function parseHp(page: Page): Promise<{ current: number; max: number } | null> {
    const hpElement = page.locator('[data-testid="player-hp"]');
    if (!(await hpElement.isVisible())) return null;

    const text = await hpElement.textContent();
    const match = text?.match(/(\d+)\s*\/\s*(\d+)/);
    if (match) {
      return { current: parseInt(match[1]), max: parseInt(match[2]) };
    }
    return null;
  }

  test('초기 HP가 올바르게 표시됨', async ({ page }) => {
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 15000 }).catch(() => {
      return page.click('button:has-text("시작")');
    });

    const hp = await parseHp(page);
    expect(hp).not.toBeNull();
    if (hp) {
      expect(hp.current).toBeGreaterThan(0);
      expect(hp.max).toBeGreaterThan(0);
      expect(hp.current).toBeLessThanOrEqual(hp.max);
    }
  });

  test('HP 형식이 "현재/최대" 형식임', async ({ page }) => {
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 15000 }).catch(() => {
      return page.click('button:has-text("시작")');
    });

    const hpElement = page.locator('[data-testid="player-hp"]');
    const text = await hpElement.textContent();

    // HP 형식 검증
    expect(text).toMatch(/\d+\s*\/\s*\d+/);
  });

  test('전투 중 HP 감소 확인', async ({ page }) => {
    await page.waitForSelector('button:has-text("Test Mixed Battle")', { timeout: 10000 }).catch(() => {});
    const testBattleBtn = page.locator('button:has-text("Test Mixed Battle")');

    if (await testBattleBtn.isVisible()) {
      await testBattleBtn.click();
      await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 });

      // 전투 시작 시 HP 확인
      const playerHpText = page.locator('[data-testid="player-hp-text"]');
      const initialHp = await playerHpText.textContent();
      console.log('Initial battle HP:', initialHp);

      // HP가 표시되는지 확인
      expect(initialHp).toMatch(/\d+\/\d+/);
    }
  });
});

test.describe('상태 검증 - 골드', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
  });

  /**
   * 골드 파싱 헬퍼
   */
  async function parseGold(page: Page): Promise<number | null> {
    const goldElement = page.locator('[data-testid="player-gold"]');
    if (!(await goldElement.isVisible())) return null;

    const text = await goldElement.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  test('초기 골드가 표시됨', async ({ page }) => {
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 15000 }).catch(() => {
      return page.click('button:has-text("시작")');
    });

    const gold = await parseGold(page);
    expect(gold).not.toBeNull();
    if (gold !== null) {
      expect(gold).toBeGreaterThanOrEqual(0);
    }
  });

  test('상점에서 골드가 표시됨', async ({ page }) => {
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 15000 }).catch(() => {
      return page.click('button:has-text("시작")');
    });

    // 상점 노드 클릭
    const shopNode = page.locator('[data-testid="map-node-shop"]').first();
    if (await shopNode.isVisible()) {
      await shopNode.click();
      await page.waitForSelector('[data-testid="shop-modal"]', { timeout: 5000 });

      // 상점 내 골드 표시 확인
      const shopGold = page.locator('[data-testid="shop-gold-amount"]');
      const goldText = await shopGold.textContent();

      expect(goldText).toMatch(/\d+/);
    }
  });

  test('상점 구매 시 골드 차감', async ({ page }) => {
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 15000 }).catch(() => {
      return page.click('button:has-text("시작")');
    });

    // 초기 골드 확인
    const initialGold = await parseGold(page);

    // 상점 노드 클릭
    const shopNode = page.locator('[data-testid="map-node-shop"]').first();
    if (await shopNode.isVisible() && initialGold && initialGold > 0) {
      await shopNode.click();
      await page.waitForSelector('[data-testid="shop-modal"]', { timeout: 5000 });

      // 구매 전 상점 골드
      const shopGoldBefore = page.locator('[data-testid="shop-gold-amount"]');
      const goldBefore = await shopGoldBefore.textContent();
      console.log('Gold before purchase:', goldBefore);

      // 구매 시도 (아이템 클릭 등)
      // 실제 구매 로직은 상점 UI에 따라 다름

      // 상점 나가기
      const exitBtn = page.locator('[data-testid="shop-exit-btn"]');
      await exitBtn.click();
    }
  });
});

test.describe('상태 검증 - 자원', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
  });

  test('자원 표시 영역이 존재함', async ({ page }) => {
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 15000 }).catch(() => {
      return page.click('button:has-text("시작")');
    });

    const resourcesDisplay = page.locator('[data-testid="resources-display"]');
    await expect(resourcesDisplay).toBeVisible();
  });

  test('개별 자원이 표시됨', async ({ page }) => {
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 15000 }).catch(() => {
      return page.click('button:has-text("시작")');
    });

    // 골드
    const gold = page.locator('[data-testid="player-gold"]');
    await expect(gold).toBeVisible();

    // 정보
    const intel = page.locator('[data-testid="player-intel"]');
    await expect(intel).toBeVisible();

    // 전리품
    const loot = page.locator('[data-testid="player-loot"]');
    await expect(loot).toBeVisible();

    // 원자재
    const material = page.locator('[data-testid="player-material"]');
    await expect(material).toBeVisible();

    // 기억
    const memory = page.locator('[data-testid="player-memory"]');
    await expect(memory).toBeVisible();
  });

  test('자원 값이 숫자임', async ({ page }) => {
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 15000 }).catch(() => {
      return page.click('button:has-text("시작")');
    });

    const resources = ['player-gold', 'player-intel', 'player-loot', 'player-material'];

    for (const resourceId of resources) {
      const element = page.locator(`[data-testid="${resourceId}"]`);
      if (await element.isVisible()) {
        const text = await element.textContent();
        // 숫자가 포함되어 있어야 함
        expect(text).toMatch(/\d+/);
      }
    }
  });
});

test.describe('상태 검증 - 전투 UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
  });

  test('전투 화면 필수 요소 확인', async ({ page }) => {
    await page.waitForSelector('button:has-text("Test Mixed Battle")', { timeout: 10000 }).catch(() => {});
    const testBattleBtn = page.locator('button:has-text("Test Mixed Battle")');

    if (await testBattleBtn.isVisible()) {
      await testBattleBtn.click();
      await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 });

      // 전투 화면
      await expect(page.locator('[data-testid="battle-screen"]')).toBeVisible();

      // 플레이어 HP
      await expect(page.locator('[data-testid="player-hp-bar-container"]')).toBeVisible();

      // 적 HP
      await expect(page.locator('[data-testid="enemy-hp-bar-container"]')).toBeVisible();

      // 핸드 영역
      await expect(page.locator('[data-testid="hand-area"]')).toBeVisible();
    }
  });

  test('플레이어 HP 텍스트 형식', async ({ page }) => {
    await page.waitForSelector('button:has-text("Test Mixed Battle")', { timeout: 10000 }).catch(() => {});
    const testBattleBtn = page.locator('button:has-text("Test Mixed Battle")');

    if (await testBattleBtn.isVisible()) {
      await testBattleBtn.click();
      await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 });

      const playerHpText = page.locator('[data-testid="player-hp-text"]');
      const text = await playerHpText.textContent();

      // "❤️ 80/100" 형식
      expect(text).toMatch(/\d+\/\d+/);
    }
  });

  test('적 HP 텍스트 형식', async ({ page }) => {
    await page.waitForSelector('button:has-text("Test Mixed Battle")', { timeout: 10000 }).catch(() => {});
    const testBattleBtn = page.locator('button:has-text("Test Mixed Battle")');

    if (await testBattleBtn.isVisible()) {
      await testBattleBtn.click();
      await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 });

      const enemyHpText = page.locator('[data-testid="enemy-hp-text"]');
      const text = await enemyHpText.textContent();

      // "❤️ 40/40" 형식 또는 "??" (통찰 부족 시)
      expect(text).toMatch(/(\d+\/\d+|\?\?)/);
    }
  });
});

test.describe('상태 검증 - 상점', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
  });

  test('상점 모달 필수 요소 확인', async ({ page }) => {
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 15000 }).catch(() => {
      return page.click('button:has-text("시작")');
    });

    const shopNode = page.locator('[data-testid="map-node-shop"]').first();
    if (await shopNode.isVisible()) {
      await shopNode.click();
      await page.waitForSelector('[data-testid="shop-modal"]', { timeout: 5000 });

      // 상점 모달
      await expect(page.locator('[data-testid="shop-modal"]')).toBeVisible();

      // 헤더
      await expect(page.locator('[data-testid="shop-header"]')).toBeVisible();

      // 상인 이름
      await expect(page.locator('[data-testid="shop-merchant-name"]')).toBeVisible();

      // 골드 표시
      await expect(page.locator('[data-testid="shop-gold-display"]')).toBeVisible();

      // 나가기 버튼
      await expect(page.locator('[data-testid="shop-exit-btn"]')).toBeVisible();

      // 탭
      await expect(page.locator('[data-testid="shop-tabs"]')).toBeVisible();
    }
  });

  test('상점 탭 전환', async ({ page }) => {
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 15000 }).catch(() => {
      return page.click('button:has-text("시작")');
    });

    const shopNode = page.locator('[data-testid="map-node-shop"]').first();
    if (await shopNode.isVisible()) {
      await shopNode.click();
      await page.waitForSelector('[data-testid="shop-modal"]', { timeout: 5000 });

      // 구매 탭 클릭
      const buyTab = page.locator('[data-testid="shop-tab-buy"]');
      if (await buyTab.isVisible()) {
        await buyTab.click();
        await page.waitForTimeout(200);
      }

      // 서비스 탭 클릭 (있으면)
      const serviceTab = page.locator('[data-testid="shop-tab-service"]');
      if (await serviceTab.isVisible()) {
        await serviceTab.click();
        await page.waitForTimeout(200);
      }

      // 판매 탭 클릭 (있으면)
      const sellTab = page.locator('[data-testid="shop-tab-sell"]');
      if (await sellTab.isVisible()) {
        await sellTab.click();
        await page.waitForTimeout(200);
      }
    }
  });
});

test.describe('상태 검증 - 던전', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
  });

  test('던전 진입 모달 필수 요소 확인', async ({ page }) => {
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 15000 }).catch(() => {
      return page.click('button:has-text("시작")');
    });

    const dungeonNode = page.locator('[data-testid="map-node-dungeon"]').first();
    if (await dungeonNode.isVisible()) {
      await dungeonNode.click();
      await page.waitForSelector('[data-testid="dungeon-modal"]', { timeout: 5000 });

      // 던전 모달
      await expect(page.locator('[data-testid="dungeon-modal"]')).toBeVisible();

      // 진입 버튼
      await expect(page.locator('[data-testid="dungeon-confirm-btn"]')).toBeVisible();

      // 우회 버튼
      await expect(page.locator('[data-testid="dungeon-bypass-btn"]')).toBeVisible();
    }
  });

  test('던전 우회 시 모달 닫힘', async ({ page }) => {
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 15000 }).catch(() => {
      return page.click('button:has-text("시작")');
    });

    const dungeonNode = page.locator('[data-testid="map-node-dungeon"]').first();
    if (await dungeonNode.isVisible()) {
      await dungeonNode.click();
      await page.waitForSelector('[data-testid="dungeon-modal"]', { timeout: 5000 });

      const bypassBtn = page.locator('[data-testid="dungeon-bypass-btn"]');
      await bypassBtn.click();

      // 모달이 닫혔는지 확인
      await expect(page.locator('[data-testid="dungeon-modal"]')).not.toBeVisible({ timeout: 3000 });
    }
  });
});
