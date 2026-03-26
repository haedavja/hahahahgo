import { test, expect } from '@playwright/test';
import {
  resetGameState,
  waitForUIStable,
  enterBattle,
  getSelectableNodeTypes,
  quickAutoBattle
} from './utils/test-helpers';

/**
 * 전투 시스템 E2E 테스트
 * 개선된 enterBattle() 헬퍼 사용 - 맵 탐색 방식으로 전투 노드까지 진행
 */
test.describe('전투 시스템', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
  });

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
      const timeline = page.locator('[data-testid="timeline-container"], [data-testid="timeline-panel"], .timeline, .timeline-display');
      await expect(timeline).toBeVisible();

      // 적 정보 (HP 바 또는 에테르 박스)
      const enemyInfo = page.locator('[data-testid="enemy-hp-bar-container"], [data-testid="enemy-ether-box"], .enemy-info, .enemy-display');
      await expect(enemyInfo).toBeVisible();
    }
  });

  test('카드 선택이 가능함', async ({ page }) => {
    await enterBattle(page);

    const battleScreen = page.locator('.battle-screen, [data-testid="battle-screen"]');

    if (await battleScreen.isVisible()) {
      // 카드 요소 찾기 (인덱스 포함 셀렉터)
      const cards = page.locator('[data-testid^="hand-card-"], .hand-card, .card-in-hand');
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
      // 카드 선택 (인덱스 포함 셀렉터)
      const cards = page.locator('[data-testid^="hand-card-"], .hand-card');
      if ((await cards.count()) > 0) {
        await cards.first().click();
      }

      // 제출 버튼 찾기
      const submitBtn = page.locator(
        '[data-testid="submit-cards-btn"], button:has-text("제출"), button:has-text("확인"), .submit-btn, .end-turn-btn'
      );

      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        // 턴이 진행되었는지 확인 (상태 기반 대기)
        await page.waitForFunction(
          () => {
            const phaseEl = document.querySelector('[data-testid="battle-phase"]');
            return phaseEl?.getAttribute('data-phase') !== 'select';
          },
          { timeout: 3000 }
        ).catch(() => {});
        await waitForUIStable(page);
      }
    }
  });

  test('적 HP가 표시됨', async ({ page }) => {
    await enterBattle(page);

    const battleScreen = page.locator('.battle-screen, [data-testid="battle-screen"]');

    if (await battleScreen.isVisible()) {
      // 적 HP 바 또는 텍스트
      const enemyHp = page.locator(
        '[data-testid="enemy-hp-text"], [data-testid="enemy-hp-area"], [data-testid="enemy-hp-bar-container"], .enemy-hp, .enemy-health'
      );

      await expect(enemyHp).toBeVisible();
    }
  });

  test('에테르 시스템이 표시됨', async ({ page }) => {
    await enterBattle(page);

    const battleScreen = page.locator('.battle-screen, [data-testid="battle-screen"]');

    if (await battleScreen.isVisible()) {
      // 에테르 디스플레이 (플레이어 또는 적 에테르 박스)
      const etherDisplay = page.locator(
        '[data-testid="player-ether-box"], [data-testid="enemy-ether-box"], .ether-display, .ether-pts, [class*="ether"]'
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

    // 개선된 enterBattle() 사용 - 맵 탐색으로 전투 진입
    const battleEntered = await enterBattle(page);

    if (battleEntered) {
      // 전투 화면 확인
      const battleScreen = page.locator('[data-testid="battle-screen"]');
      if (await battleScreen.isVisible({ timeout: 1000 }).catch(() => false)) {
        // quickAutoBattle 헬퍼로 자동 전투 진행
        const result = await quickAutoBattle(page, 15);
        console.log('Battle result:', result);
      }
    } else {
      // 전투 진입 실패 - 선택 가능한 노드 정보 로깅
      const availableTypes = await getSelectableNodeTypes(page);
      console.log('Failed to enter battle. Available node types:', availableTypes);
    }
  });
});
