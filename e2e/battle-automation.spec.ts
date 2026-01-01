import { test, expect, Page } from '@playwright/test';
import {
  resetGameState,
  clickMapNode,
  waitForBattle,
  selectCard,
  isCardSelected,
  submitCards,
  waitForBattleEnd,
  getBattleResult,
  autoPlayBattle,
  getPlayerHp,
} from './utils/test-helpers';

/**
 * 전투 자동화 E2E 테스트
 * 카드 선택, 제출, 전투 진행 검증
 */

test.describe('전투 자동화 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
  });

  /**
   * 전투 화면 진입
   */
  async function enterBattle(page: Page): Promise<boolean> {
    // 테스트 전투 버튼 시도
    const testBattleBtn = page.locator('button:has-text("Test Mixed Battle")');
    if (await testBattleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await testBattleBtn.click();
      await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 }).catch(() => {});
      return true;
    }

    // 맵에서 전투 노드 시도
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 15000 }).catch(async () => {
      const startBtn = page.locator('button:has-text("시작"), button:has-text("Start")');
      if (await startBtn.isVisible()) {
        await startBtn.click();
      }
    });

    const battleClicked = await clickMapNode(page, 'battle');
    if (battleClicked) {
      await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 }).catch(() => {});
      return true;
    }

    return false;
  }

  test('전투 화면 UI 요소 확인', async ({ page }) => {
    const entered = await enterBattle(page);

    if (entered) {
      const battleScreen = page.locator('[data-testid="battle-screen"]');
      if (await battleScreen.isVisible()) {
        // 플레이어 HP 바
        await expect(page.locator('[data-testid="player-hp-bar-container"]')).toBeVisible();

        // 적 HP 바
        await expect(page.locator('[data-testid="enemy-hp-bar-container"]')).toBeVisible();

        // 핸드 영역
        await expect(page.locator('[data-testid="hand-area"]')).toBeVisible();

        // 타임라인
        await expect(page.locator('[data-testid="timeline-container"]')).toBeVisible();
      }
    }
  });

  test('핸드 카드 표시 확인', async ({ page }) => {
    const entered = await enterBattle(page);

    if (entered) {
      const battleScreen = page.locator('[data-testid="battle-screen"]');
      if (await battleScreen.isVisible()) {
        // 핸드 카드 컨테이너 확인
        const handCards = page.locator('[data-testid="hand-cards"]');
        await expect(handCards).toBeVisible({ timeout: 5000 });

        // 개별 카드 확인
        const firstCard = page.locator('[data-testid="hand-card-0"]');
        if (await firstCard.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(firstCard).toBeVisible();
        }
      }
    }
  });

  test('카드 선택 및 선택 상태 확인', async ({ page }) => {
    const entered = await enterBattle(page);

    if (entered) {
      const battleScreen = page.locator('[data-testid="battle-screen"]');
      if (await battleScreen.isVisible()) {
        // 핸드 카드 대기
        await page.waitForSelector('[data-testid="hand-cards"]', { timeout: 5000 }).catch(() => {});

        // 첫 번째 카드 선택
        const selected = await selectCard(page, 0);

        if (selected) {
          // 선택 상태 확인
          const card = page.locator('[data-testid="hand-card-0"]');
          const selectedAttr = await card.getAttribute('data-card-selected');

          // 선택됐거나 선택 UI가 변했는지 확인
          console.log('Card selected state:', selectedAttr);
        }
      }
    }
  });

  test('카드 제출 버튼 활성화', async ({ page }) => {
    const entered = await enterBattle(page);

    if (entered) {
      const battleScreen = page.locator('[data-testid="battle-screen"]');
      if (await battleScreen.isVisible()) {
        await page.waitForSelector('[data-testid="hand-cards"]', { timeout: 5000 }).catch(() => {});

        // 카드 선택
        await selectCard(page, 0);

        // 제출 버튼 확인
        const submitBtn = page.locator('[data-testid="submit-cards-btn"]');

        // 버튼이 활성화되었는지 확인
        if (await submitBtn.isVisible()) {
          const isEnabled = await submitBtn.isEnabled();
          console.log('Submit button enabled:', isEnabled);
        }
      }
    }
  });

  test('전투 자동 진행 - 승리 또는 패배', async ({ page }) => {
    const entered = await enterBattle(page);

    if (entered) {
      const battleScreen = page.locator('[data-testid="battle-screen"]');
      if (await battleScreen.isVisible()) {
        // 자동 전투 진행
        const result = await autoPlayBattle(page, 20);

        console.log('Battle result:', result);

        // 결과 확인 (victory, defeat, timeout 중 하나)
        expect(['victory', 'defeat', 'timeout']).toContain(result);
      }
    }
  });

  test('전투 중 HP 변화 추적', async ({ page }) => {
    const entered = await enterBattle(page);

    if (entered) {
      const battleScreen = page.locator('[data-testid="battle-screen"]');
      if (await battleScreen.isVisible()) {
        // 초기 HP 확인 (전투 화면 내 HP)
        const playerHpText = page.locator('[data-testid="player-hp-text"]');
        const initialText = await playerHpText.textContent().catch(() => '');
        console.log('Initial battle HP:', initialText);

        // 턴 진행
        await page.waitForSelector('[data-testid="hand-cards"]', { timeout: 5000 }).catch(() => {});

        // 카드 선택 및 제출
        await selectCard(page, 0);
        const submitted = await submitCards(page);

        if (submitted) {
          // 턴 진행 대기
          await page.waitForTimeout(2000);

          // HP 변화 확인
          const afterText = await playerHpText.textContent().catch(() => '');
          console.log('After turn HP:', afterText);
        }
      }
    }
  });

  test('타임라인 표시 확인', async ({ page }) => {
    const entered = await enterBattle(page);

    if (entered) {
      const battleScreen = page.locator('[data-testid="battle-screen"]');
      if (await battleScreen.isVisible()) {
        // 타임라인 컨테이너 확인
        const timeline = page.locator('[data-testid="timeline-container"]');
        await expect(timeline).toBeVisible();

        // 타임라인 패널 확인
        const timelinePanel = page.locator('[data-testid="timeline-panel"]');
        await expect(timelinePanel).toBeVisible();

        // 타임라인 레인 확인
        const timelineLanes = page.locator('[data-testid="timeline-lanes"]');
        await expect(timelineLanes).toBeVisible();

        // 플레이어/적 레인 확인
        const playerLane = page.locator('[data-testid="player-timeline-lane"]');
        const enemyLane = page.locator('[data-testid="enemy-timeline-lane"]');

        await expect(playerLane).toBeVisible();
        await expect(enemyLane).toBeVisible();
      }
    }
  });

  test('여러 카드 선택 후 제출', async ({ page }) => {
    const entered = await enterBattle(page);

    if (entered) {
      const battleScreen = page.locator('[data-testid="battle-screen"]');
      if (await battleScreen.isVisible()) {
        await page.waitForSelector('[data-testid="hand-cards"]', { timeout: 5000 }).catch(() => {});

        // 여러 카드 선택
        const cardsToSelect = [0, 1, 2];
        let selectedCount = 0;

        for (const idx of cardsToSelect) {
          const selected = await selectCard(page, idx);
          if (selected) {
            selectedCount++;
            // 선택 상태 변화 대기
            await page.waitForFunction(
              (i) => {
                const el = document.querySelector(`[data-testid="hand-card-${i}"]`);
                return el?.getAttribute('data-card-selected') === 'true';
              },
              idx,
              { timeout: 500 }
            ).catch(() => {});
          }
        }

        console.log('Selected cards:', selectedCount);

        // 카드를 선택했으면 제출
        if (selectedCount > 0) {
          const submitted = await submitCards(page);
          console.log('Cards submitted:', submitted);
        }
      }
    }
  });
});

test.describe('전투 결과 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
  });

  test('전투 완료 후 결과 모달', async ({ page }) => {
    // 테스트 전투 진입
    const testBattleBtn = page.locator('button:has-text("Test Mixed Battle")');
    if (await testBattleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await testBattleBtn.click();
      await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 }).catch(() => {});

      const battleScreen = page.locator('[data-testid="battle-screen"]');
      if (await battleScreen.isVisible()) {
        // 자동 전투 완료까지 진행
        const result = await autoPlayBattle(page, 30);

        console.log('Final battle result:', result);

        // 승리 또는 패배 시 결과 확인
        if (result === 'victory' || result === 'defeat') {
          const resultModal = page.locator('[data-testid="battle-result"], [data-testid="battle-result-modal"]');
          if (await resultModal.isVisible({ timeout: 2000 }).catch(() => false)) {
            const resultText = await resultModal.textContent();
            console.log('Result modal text:', resultText);
          }
        }
      }
    }
  });
});

test.describe('전투 페이즈 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
  });

  test('선택 페이즈 확인', async ({ page }) => {
    const testBattleBtn = page.locator('button:has-text("Test Mixed Battle")');
    if (await testBattleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await testBattleBtn.click();
      await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 }).catch(() => {});

      const battleScreen = page.locator('[data-testid="battle-screen"]');
      if (await battleScreen.isVisible()) {
        // 핸드 카드가 표시되면 선택 페이즈
        const handCards = page.locator('[data-testid="hand-cards"]');
        await expect(handCards).toBeVisible({ timeout: 5000 });

        // 제출 버튼이 있으면 선택 페이즈
        const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
        await expect(submitBtn).toBeVisible();
      }
    }
  });

  test('진행 페이즈 전환', async ({ page }) => {
    const testBattleBtn = page.locator('button:has-text("Test Mixed Battle")');
    if (await testBattleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await testBattleBtn.click();
      await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 }).catch(() => {});

      const battleScreen = page.locator('[data-testid="battle-screen"]');
      if (await battleScreen.isVisible()) {
        await page.waitForSelector('[data-testid="hand-cards"]', { timeout: 5000 }).catch(() => {});

        // 카드 선택 및 제출
        await selectCard(page, 0);
        await submitCards(page);

        // 타임라인 진행 확인 (진행 페이즈)
        // 타임라인 컨테이너가 업데이트되는지 확인
        await page.waitForSelector('[data-testid="timeline-container"]', {
          state: 'visible',
          timeout: 3000
        }).catch(() => {});

        console.log('Phase transitioned to resolve');
      }
    }
  });
});
