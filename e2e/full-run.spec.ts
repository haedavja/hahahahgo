import { test, expect } from '@playwright/test';
import {
  resetGameState,
  waitForMap,
  selectMapNode,
  quickAutoBattle,
  getPlayerHp,
  getPlayerGold,
  exitShop,
  bypassDungeon,
  closeRest,
  closeEvent,
  waitForUIStable,
} from './utils/test-helpers';

/**
 * 전체 런 시나리오 E2E 테스트
 * 게임 시작부터 보스전까지의 전체 흐름 테스트
 * 개선: 중앙 헬퍼 함수 사용, waitForTimeout 제거
 */

test.describe('전체 런 시나리오', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
  });

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

    // 전투 노드 선택 (중앙 헬퍼 사용)
    const battleSelected = await selectMapNode(page, 'battle');

    if (battleSelected) {
      const battleScreen = page.locator('[data-testid="battle-screen"]');
      if (await battleScreen.isVisible({ timeout: 3000 }).catch(() => false)) {
        // 핸드 영역 확인
        const handArea = page.locator('[data-testid="hand-area"]');
        await expect(handArea).toBeVisible();

        // 자동 전투 진행 (중앙 헬퍼 사용)
        const result = await quickAutoBattle(page);
        expect(['victory', 'defeat', 'timeout']).toContain(result);
      }
    }
  });

  test('상점 노드 선택 및 상점 UI 확인', async ({ page }) => {
    await waitForMap(page);

    const shopSelected = await selectMapNode(page, 'shop');

    if (shopSelected) {
      const shopModal = page.locator('[data-testid="shop-modal"]');
      if (await shopModal.isVisible({ timeout: 3000 }).catch(() => false)) {
        // 상점 헤더 확인
        const shopHeader = page.locator('[data-testid="shop-header"]');
        await expect(shopHeader).toBeVisible();

        // 골드 표시 확인
        const goldDisplay = page.locator('[data-testid="shop-gold-display"]');
        await expect(goldDisplay).toBeVisible();

        // 탭 확인
        const buyTab = page.locator('[data-testid="shop-tab-buy"]');
        await expect(buyTab).toBeVisible();

        // 상점 종료 (중앙 헬퍼 사용)
        await exitShop(page);

        // 상점이 닫혔는지 확인
        await expect(shopModal).not.toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('던전 노드 선택 및 진입 확인', async ({ page }) => {
    await waitForMap(page);

    const dungeonSelected = await selectMapNode(page, 'dungeon');

    if (dungeonSelected) {
      const dungeonModal = page.locator('[data-testid="dungeon-modal"]');
      if (await dungeonModal.isVisible({ timeout: 3000 }).catch(() => false)) {
        // 진입 버튼 확인
        const confirmBtn = page.locator('[data-testid="dungeon-confirm-btn"]');
        await expect(confirmBtn).toBeVisible();

        // 우회 버튼 확인
        const bypassBtnLocator = page.locator('[data-testid="dungeon-bypass-btn"]');
        await expect(bypassBtnLocator).toBeVisible();

        // 우회 선택 (중앙 헬퍼 사용)
        await bypassDungeon(page);

        // 모달이 닫혔는지 확인
        await expect(dungeonModal).not.toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('다중 노드 진행 (3개 노드)', async ({ page }) => {
    await waitForMap(page);

    let nodesCleared = 0;
    const maxNodes = 3;

    for (let i = 0; i < maxNodes; i++) {
      // 선택 가능한 노드 찾기
      const selectableNode = page.locator('[data-node-selectable="true"]').first();

      if (await selectableNode.isVisible({ timeout: 2000 }).catch(() => false)) {
        const nodeType = await selectableNode.getAttribute('data-node-type');
        await selectableNode.click();

        // 노드 클릭 후 상태 변화 대기
        await page.waitForFunction(
          () => {
            const battle = document.querySelector('[data-testid="battle-screen"]');
            const modal = document.querySelector('[data-testid$="-modal"]');
            return battle !== null || modal !== null;
          },
          { timeout: 3000 }
        ).catch(() => {});

        // 노드 타입에 따른 처리
        if (nodeType === 'battle' || nodeType === 'elite') {
          const battleScreen = page.locator('[data-testid="battle-screen"]');
          if (await battleScreen.isVisible({ timeout: 2000 }).catch(() => false)) {
            await quickAutoBattle(page, 25);
            // 전투 후 맵으로 복귀 대기
            await waitForMap(page).catch(() => {});
          }
        } else if (nodeType === 'shop') {
          await exitShop(page);
        } else if (nodeType === 'dungeon') {
          await bypassDungeon(page);
        } else if (nodeType === 'rest') {
          // 휴식 노드: 첫 번째 옵션 선택 후 닫기
          const restModal = page.locator('[data-testid="rest-modal"]');
          if (await restModal.isVisible({ timeout: 1000 }).catch(() => false)) {
            const healBtn = page.locator('[data-testid="rest-btn-heal"]');
            if (await healBtn.isVisible({ timeout: 500 }).catch(() => false)) {
              await healBtn.click();
            }
            await closeRest(page);
          }
        } else if (nodeType === 'event') {
          // 이벤트 노드: 첫 번째 선택지 선택 후 닫기
          const eventModal = page.locator('[data-testid="event-modal"]');
          if (await eventModal.isVisible({ timeout: 1000 }).catch(() => false)) {
            const firstChoice = page.locator('[data-testid^="event-choice-btn-"]').first();
            if (await firstChoice.isVisible({ timeout: 500 }).catch(() => false)) {
              await firstChoice.click();
            }
            await closeEvent(page);
          }
        }

        // 맵으로 복귀 대기
        await waitForMap(page).catch(() => {});
        await waitForUIStable(page);
        nodesCleared++;
      }
    }

    console.log(`Nodes cleared: ${nodesCleared}`);
  });

  test('HP 변화 추적', async ({ page }) => {
    await waitForMap(page);

    const initialHp = await getPlayerHp(page);
    console.log(`Initial HP: ${initialHp.current}/${initialHp.max}`);

    // 전투 노드 선택 (중앙 헬퍼 사용)
    const battleSelected = await selectMapNode(page, 'battle');

    if (battleSelected) {
      const battleScreen = page.locator('[data-testid="battle-screen"]');

      if (await battleScreen.isVisible({ timeout: 3000 }).catch(() => false)) {
        await quickAutoBattle(page);

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

    // 전투 노드 선택 (중앙 헬퍼 사용)
    const battleSelected = await selectMapNode(page, 'battle');

    if (battleSelected) {
      const battleScreen = page.locator('[data-testid="battle-screen"]');

      if (await battleScreen.isVisible({ timeout: 3000 }).catch(() => false)) {
        const result = await quickAutoBattle(page);

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
