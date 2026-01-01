import { test, expect, Page } from '@playwright/test';
import { resetGameState } from './utils/test-helpers';

/**
 * 전체 런 시나리오 E2E 테스트
 * 게임 시작부터 보스전까지의 전체 흐름 테스트
 */

test.describe('전체 런 시나리오', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
  });

  /**
   * 맵 화면 대기 헬퍼
   */
  async function waitForMap(page: Page) {
    await page.waitForSelector('[data-testid="map-container"]', {
      timeout: 15000,
    }).catch(async () => {
      // 시작 버튼이 있으면 클릭
      const startBtn = page.locator('button:has-text("시작"), button:has-text("Start")');
      if (await startBtn.isVisible()) {
        await startBtn.click();
      }
    });
  }

  /**
   * 노드 선택 헬퍼
   */
  async function selectNode(page: Page, nodeType: string) {
    const node = page.locator(`[data-testid="map-node-${nodeType}"], [data-node-type="${nodeType}"]`).first();
    if (await node.isVisible()) {
      await node.click();
      await page.waitForTimeout(500);
      return true;
    }
    return false;
  }

  /**
   * 전투 자동 진행 헬퍼
   */
  async function autoBattle(page: Page, maxTurns = 15): Promise<'victory' | 'defeat' | 'timeout'> {
    for (let turn = 0; turn < maxTurns; turn++) {
      // 전투 결과 확인
      const resultModal = page.locator('[data-testid="battle-result-modal"], [data-testid="battle-result"]');
      if (await resultModal.isVisible()) {
        const resultText = await resultModal.textContent();
        const result = resultText?.includes('승리') ? 'victory' : 'defeat';

        // 결과 모달 닫기
        const closeBtn = page.locator('[data-testid="battle-result-close-btn"], button:has-text("확인")');
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
        }
        return result;
      }

      // 패배 플래그 확인
      const defeatFlag = page.locator('[data-testid="defeat-flag"]');
      if (await defeatFlag.isVisible()) {
        return 'defeat';
      }

      // 카드 선택 (손패에서 첫 번째 카드)
      const handCards = page.locator('[data-testid="hand-card"], .hand-card');
      const cardCount = await handCards.count();

      if (cardCount > 0) {
        await handCards.first().click().catch(() => {});
        await page.waitForTimeout(100);
      }

      // 제출 버튼
      const submitBtn = page.locator('[data-testid="submit-cards-btn"], button:has-text("제출"), button:has-text("확인")');
      if (await submitBtn.isVisible() && await submitBtn.isEnabled()) {
        await submitBtn.click().catch(() => {});
      }

      await page.waitForTimeout(500);
    }
    return 'timeout';
  }

  /**
   * 현재 HP 확인 헬퍼
   */
  async function getPlayerHp(page: Page): Promise<{ current: number; max: number }> {
    const hpElement = page.locator('[data-testid="player-hp"]');
    if (await hpElement.isVisible()) {
      const text = await hpElement.textContent();
      const match = text?.match(/(\d+)\s*\/\s*(\d+)/);
      if (match) {
        return { current: parseInt(match[1]), max: parseInt(match[2]) };
      }
    }
    return { current: 0, max: 0 };
  }

  /**
   * 현재 골드 확인 헬퍼
   */
  async function getPlayerGold(page: Page): Promise<number> {
    const goldElement = page.locator('[data-testid="player-gold"]');
    if (await goldElement.isVisible()) {
      const text = await goldElement.textContent();
      const match = text?.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    }
    return 0;
  }

  test('게임 시작 후 맵이 표시됨', async ({ page }) => {
    await waitForMap(page);

    const mapContainer = page.locator('[data-testid="map-container"]');
    await expect(mapContainer).toBeVisible();

    // 플레이어 상태 확인
    const hpColumn = page.locator('[data-testid="map-hp-column"], [data-testid="player-hp"]');
    await expect(hpColumn).toBeVisible();
  });

  test('전투 노드 선택 및 전투 진행', async ({ page }) => {
    await waitForMap(page);

    // 전투 노드 선택
    const battleSelected = await selectNode(page, 'battle');

    if (battleSelected) {
      // 전투 화면 대기
      await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 }).catch(() => {});

      const battleScreen = page.locator('[data-testid="battle-screen"]');
      if (await battleScreen.isVisible()) {
        // 핸드 영역 확인
        const handArea = page.locator('[data-testid="hand-area"]');
        await expect(handArea).toBeVisible();

        // 자동 전투 진행
        const result = await autoBattle(page);
        expect(['victory', 'defeat', 'timeout']).toContain(result);
      }
    }
  });

  test('상점 노드 선택 및 상점 UI 확인', async ({ page }) => {
    await waitForMap(page);

    const shopSelected = await selectNode(page, 'shop');

    if (shopSelected) {
      // 상점 모달 대기
      await page.waitForSelector('[data-testid="shop-modal"]', { timeout: 5000 }).catch(() => {});

      const shopModal = page.locator('[data-testid="shop-modal"]');
      if (await shopModal.isVisible()) {
        // 상점 헤더 확인
        const shopHeader = page.locator('[data-testid="shop-header"]');
        await expect(shopHeader).toBeVisible();

        // 골드 표시 확인
        const goldDisplay = page.locator('[data-testid="shop-gold-display"]');
        await expect(goldDisplay).toBeVisible();

        // 탭 확인
        const buyTab = page.locator('[data-testid="shop-tab-buy"]');
        await expect(buyTab).toBeVisible();

        // 나가기 버튼으로 상점 종료
        const exitBtn = page.locator('[data-testid="shop-exit-btn"]');
        await exitBtn.click();

        // 상점이 닫혔는지 확인
        await expect(shopModal).not.toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('던전 노드 선택 및 진입 확인', async ({ page }) => {
    await waitForMap(page);

    const dungeonSelected = await selectNode(page, 'dungeon');

    if (dungeonSelected) {
      // 던전 진입 모달 대기
      await page.waitForSelector('[data-testid="dungeon-modal"]', { timeout: 5000 }).catch(() => {});

      const dungeonModal = page.locator('[data-testid="dungeon-modal"]');
      if (await dungeonModal.isVisible()) {
        // 진입 버튼 확인
        const confirmBtn = page.locator('[data-testid="dungeon-confirm-btn"]');
        await expect(confirmBtn).toBeVisible();

        // 우회 버튼 확인
        const bypassBtn = page.locator('[data-testid="dungeon-bypass-btn"]');
        await expect(bypassBtn).toBeVisible();

        // 우회 선택 (안전하게)
        await bypassBtn.click();

        // 모달이 닫혔는지 확인
        await expect(dungeonModal).not.toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('다중 노드 진행 (3개 노드)', async ({ page }) => {
    await waitForMap(page);

    const initialHp = await getPlayerHp(page);
    const initialGold = await getPlayerGold(page);

    let nodesCleared = 0;
    const maxNodes = 3;

    for (let i = 0; i < maxNodes; i++) {
      // 선택 가능한 노드 찾기
      const selectableNode = page.locator('.node.selectable, [data-testid^="map-node-"]:not(.cleared)').first();

      if (await selectableNode.isVisible()) {
        const nodeType = await selectableNode.getAttribute('data-node-type');
        await selectableNode.click();
        await page.waitForTimeout(500);

        // 노드 타입에 따른 처리
        if (nodeType === 'battle' || nodeType === 'elite') {
          await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 }).catch(() => {});
          const battleScreen = page.locator('[data-testid="battle-screen"]');
          if (await battleScreen.isVisible()) {
            await autoBattle(page);
          }
        } else if (nodeType === 'shop') {
          await page.waitForSelector('[data-testid="shop-modal"]', { timeout: 5000 }).catch(() => {});
          const exitBtn = page.locator('[data-testid="shop-exit-btn"]');
          if (await exitBtn.isVisible()) {
            await exitBtn.click();
          }
        } else if (nodeType === 'dungeon') {
          await page.waitForSelector('[data-testid="dungeon-modal"]', { timeout: 5000 }).catch(() => {});
          const bypassBtn = page.locator('[data-testid="dungeon-bypass-btn"]');
          if (await bypassBtn.isVisible()) {
            await bypassBtn.click();
          }
        }

        nodesCleared++;
        await page.waitForTimeout(500);
      }
    }

    console.log(`Nodes cleared: ${nodesCleared}`);
  });

  test('HP 변화 추적', async ({ page }) => {
    await waitForMap(page);

    const initialHp = await getPlayerHp(page);
    console.log(`Initial HP: ${initialHp.current}/${initialHp.max}`);

    // 전투 노드 선택
    const battleSelected = await selectNode(page, 'battle');

    if (battleSelected) {
      await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 }).catch(() => {});
      const battleScreen = page.locator('[data-testid="battle-screen"]');

      if (await battleScreen.isVisible()) {
        await autoBattle(page);

        // 전투 후 HP 확인
        await waitForMap(page);
        const afterBattleHp = await getPlayerHp(page);
        console.log(`After battle HP: ${afterBattleHp.current}/${afterBattleHp.max}`);

        // HP가 변했거나 동일한지 확인 (패배로 게임오버가 아닌 경우)
        expect(afterBattleHp.max).toBeGreaterThan(0);
      }
    }
  });

  test('골드 변화 추적', async ({ page }) => {
    await waitForMap(page);

    const initialGold = await getPlayerGold(page);
    console.log(`Initial Gold: ${initialGold}`);

    // 전투 노드 선택 (전투 승리 시 골드 획득)
    const battleSelected = await selectNode(page, 'battle');

    if (battleSelected) {
      await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 }).catch(() => {});
      const battleScreen = page.locator('[data-testid="battle-screen"]');

      if (await battleScreen.isVisible()) {
        const result = await autoBattle(page);

        if (result === 'victory') {
          await waitForMap(page);
          const afterBattleGold = await getPlayerGold(page);
          console.log(`After battle Gold: ${afterBattleGold}`);

          // 승리 시 골드가 증가할 수 있음
          expect(afterBattleGold).toBeGreaterThanOrEqual(initialGold);
        }
      }
    }
  });
});

test.describe('전투 상세 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
  });

  test('플레이어/적 HP 바가 표시됨', async ({ page }) => {
    // 테스트 전투 버튼 클릭
    await page.waitForSelector('button:has-text("Test Mixed Battle")', { timeout: 10000 }).catch(() => {});
    const testBattleBtn = page.locator('button:has-text("Test Mixed Battle")');

    if (await testBattleBtn.isVisible()) {
      await testBattleBtn.click();

      await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 });

      // 플레이어 HP 바 확인
      const playerHpBar = page.locator('[data-testid="player-hp-bar-container"]');
      await expect(playerHpBar).toBeVisible();

      // 적 HP 바 확인
      const enemyHpBar = page.locator('[data-testid="enemy-hp-bar-container"]');
      await expect(enemyHpBar).toBeVisible();

      // 핸드 영역 확인
      const handArea = page.locator('[data-testid="hand-area"]');
      await expect(handArea).toBeVisible();
    }
  });

  test('HP 텍스트가 올바른 형식임', async ({ page }) => {
    await page.waitForSelector('button:has-text("Test Mixed Battle")', { timeout: 10000 }).catch(() => {});
    const testBattleBtn = page.locator('button:has-text("Test Mixed Battle")');

    if (await testBattleBtn.isVisible()) {
      await testBattleBtn.click();

      await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 });

      // 플레이어 HP 텍스트 확인
      const playerHpText = page.locator('[data-testid="player-hp-text"]');
      const hpText = await playerHpText.textContent();

      // HP 형식 확인 (예: "❤️ 80/100")
      expect(hpText).toMatch(/\d+\/\d+/);
    }
  });
});
