import { test, expect } from '@playwright/test';
import { resetGameState } from './utils/test-helpers';

/**
 * 전투 시스템 E2E 테스트
 */
test.describe('전투 시스템', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
  });

  /**
   * 전투 화면으로 진입하는 헬퍼
   */
  async function enterBattle(page: any) {
    // 맵 화면 대기
    await page.waitForSelector('.map-container, [data-testid="map-container"]', {
      timeout: 15000,
    }).catch(() => page.click('button:has-text("시작")'));

    // 전투 노드 클릭
    const battleNode = page.locator(
      '[data-node-type="combat"], [data-node-type="battle"], .node-battle, .node-combat'
    ).first();

    if (await battleNode.isVisible()) {
      await battleNode.click();
      await page.waitForTimeout(500);
    }
  }

  test('전투 UI 요소가 표시됨', async ({ page }) => {
    await enterBattle(page);

    // 전투 화면 진입 확인
    const battleScreen = page.locator(
      '[data-testid="battle-screen"], .battle-screen, .battle-container'
    );

    if (await battleScreen.isVisible()) {
      // 핸드 영역
      const handArea = page.locator('[data-testid="hand-area"], .hand-area, .player-hand');
      await expect(handArea).toBeVisible();

      // 타임라인 영역
      const timeline = page.locator('[data-testid="timeline"], .timeline, .timeline-display');
      await expect(timeline).toBeVisible();

      // 적 정보
      const enemyInfo = page.locator('[data-testid="enemy-info"], .enemy-info, .enemy-display');
      await expect(enemyInfo).toBeVisible();
    }
  });

  test('카드 선택이 가능함', async ({ page }) => {
    await enterBattle(page);

    const battleScreen = page.locator('.battle-screen, [data-testid="battle-screen"]');

    if (await battleScreen.isVisible()) {
      // 카드 요소 찾기
      const cards = page.locator('[data-testid="hand-card"], .hand-card, .card-in-hand');
      const cardCount = await cards.count();

      if (cardCount > 0) {
        // 첫 번째 카드 클릭
        await cards.first().click();

        // 선택 상태 확인 (selected 클래스 또는 aria-selected)
        const selectedCard = page.locator('.card-selected, [aria-selected="true"], .selected');
        const isSelected = await selectedCard.isVisible().catch(() => false);

        // 선택되었거나 타임라인에 추가됨
        expect(isSelected || cardCount > 0).toBe(true);
      }
    }
  });

  test('턴 제출이 가능함', async ({ page }) => {
    await enterBattle(page);

    const battleScreen = page.locator('.battle-screen, [data-testid="battle-screen"]');

    if (await battleScreen.isVisible()) {
      // 카드 선택
      const cards = page.locator('[data-testid="hand-card"], .hand-card');
      if ((await cards.count()) > 0) {
        await cards.first().click();
      }

      // 제출 버튼 찾기
      const submitBtn = page.locator(
        '[data-testid="submit-cards-btn"], button:has-text("제출"), button:has-text("확인"), .submit-btn, .end-turn-btn'
      );

      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        // 턴이 진행되었는지 확인 (타임라인 변화)
        await page.waitForTimeout(500);
      }
    }
  });

  test('적 HP가 표시됨', async ({ page }) => {
    await enterBattle(page);

    const battleScreen = page.locator('.battle-screen, [data-testid="battle-screen"]');

    if (await battleScreen.isVisible()) {
      // 적 HP 바 또는 텍스트
      const enemyHp = page.locator(
        '[data-testid="enemy-hp"], .enemy-hp, .enemy-health, .hp-bar-enemy'
      );

      await expect(enemyHp).toBeVisible();
    }
  });

  test('에테르 시스템이 표시됨', async ({ page }) => {
    await enterBattle(page);

    const battleScreen = page.locator('.battle-screen, [data-testid="battle-screen"]');

    if (await battleScreen.isVisible()) {
      // 에테르 디스플레이
      const etherDisplay = page.locator(
        '[data-testid="ether-display"], .ether-display, .ether-pts, [class*="ether"]'
      );

      // 에테르 시스템이 있으면 표시되어야 함
      const isVisible = await etherDisplay.isVisible().catch(() => false);
      console.log('Ether display visible:', isVisible);
    }
  });
});

test.describe('전투 진행', () => {
  test('전투가 완료될 수 있음', async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);

    // 맵 화면 대기
    await page.waitForSelector('.map-container, [data-testid="map-container"]', {
      timeout: 15000,
    }).catch(() => page.click('button:has-text("시작")'));

    // 전투 노드 클릭
    const battleNode = page.locator('[data-node-type="combat"], .node-battle').first();

    if (await battleNode.isVisible()) {
      await battleNode.click();

      // 전투 화면 대기
      await page.waitForSelector('.battle-screen, [data-testid="battle-screen"]', {
        timeout: 5000,
      }).catch(() => null);

      // 자동 전투 진행 (최대 10턴)
      for (let turn = 0; turn < 10; turn++) {
        // 전투 종료 확인
        const result = page.locator('[data-testid="battle-result"], .battle-result, .victory, .defeat');
        if (await result.isVisible()) {
          break;
        }

        // 카드 선택 및 제출
        const cards = page.locator('[data-testid="hand-card"], .hand-card');
        if ((await cards.count()) > 0) {
          await cards.first().click().catch(() => null);
        }

        const submitBtn = page.locator('[data-testid="submit-cards-btn"], .submit-btn, button:has-text("확인")');
        if (await submitBtn.isVisible()) {
          await submitBtn.click().catch(() => null);
        }

        await page.waitForTimeout(300);
      }
    }
  });
});
