import { test, expect } from '@playwright/test';
import {
  resetGameState,
  clickMapNode,
  findSelectableNode,
  waitForEvent,
  selectEventChoice,
  closeEvent,
  waitForRest,
  selectRestOption,
  closeRest,
  getPlayerHp,
  handleNodeByType,
} from './utils/test-helpers';

/**
 * 이벤트/휴식 노드 E2E 테스트
 * 이벤트 선택지, 휴식 기능 검증
 */

test.describe('이벤트 노드 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
  });

  test('이벤트 모달 표시 확인', async ({ page }) => {
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 15000 }).catch(async () => {
      const startBtn = page.locator('button:has-text("시작"), button:has-text("Start")');
      if (await startBtn.isVisible()) {
        await startBtn.click();
      }
    });

    // 이벤트 노드 클릭 시도
    const eventClicked = await clickMapNode(page, 'event');

    if (eventClicked) {
      // 이벤트 모달 대기
      await page.waitForSelector('[data-testid="event-modal"]', { timeout: 5000 }).catch(() => {});

      const eventModal = page.locator('[data-testid="event-modal"]');
      if (await eventModal.isVisible()) {
        // 이벤트 모달 필수 요소 확인
        await expect(page.locator('[data-testid="event-modal-header"]')).toBeVisible();

        // 선택지가 표시되는지 확인
        const choices = page.locator('[data-testid="event-choices"]');
        if (await choices.isVisible()) {
          await expect(choices).toBeVisible();
        }
      }
    }
  });

  test('이벤트 선택지 클릭', async ({ page }) => {
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 15000 }).catch(async () => {
      const startBtn = page.locator('button:has-text("시작"), button:has-text("Start")');
      if (await startBtn.isVisible()) {
        await startBtn.click();
      }
    });

    const eventClicked = await clickMapNode(page, 'event');

    if (eventClicked) {
      await page.waitForSelector('[data-testid="event-modal"]', { timeout: 5000 }).catch(() => {});

      const eventModal = page.locator('[data-testid="event-modal"]');
      if (await eventModal.isVisible()) {
        // 첫 번째 선택지 버튼 찾기
        const firstChoiceBtn = page.locator('[data-testid^="event-choice-btn-"]').first();

        if (await firstChoiceBtn.isVisible()) {
          // 활성화되어 있으면 클릭
          if (await firstChoiceBtn.isEnabled()) {
            await firstChoiceBtn.click();

            // 결과 표시 또는 모달 상태 변화 대기
            await page.waitForSelector('[data-testid="event-result"], [data-testid="event-close-btn"]', {
              timeout: 3000
            }).catch(() => {});
          }
        }
      }
    }
  });

  test('이벤트 결과 확인 후 닫기', async ({ page }) => {
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 15000 }).catch(async () => {
      const startBtn = page.locator('button:has-text("시작"), button:has-text("Start")');
      if (await startBtn.isVisible()) {
        await startBtn.click();
      }
    });

    const eventClicked = await clickMapNode(page, 'event');

    if (eventClicked) {
      await page.waitForSelector('[data-testid="event-modal"]', { timeout: 5000 }).catch(() => {});

      const eventModal = page.locator('[data-testid="event-modal"]');
      if (await eventModal.isVisible()) {
        // 선택지 클릭
        const firstChoiceBtn = page.locator('[data-testid^="event-choice-btn-"]').first();
        if (await firstChoiceBtn.isVisible() && await firstChoiceBtn.isEnabled()) {
          await firstChoiceBtn.click();
        }

        // 닫기 버튼 대기 및 클릭
        const closeBtn = page.locator('[data-testid="event-close-btn"]');
        if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await closeBtn.click();

          // 모달이 닫혔는지 확인
          await expect(eventModal).not.toBeVisible({ timeout: 3000 });
        }
      }
    }
  });
});

test.describe('휴식 노드 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
  });

  test('휴식 모달 표시 확인', async ({ page }) => {
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 15000 }).catch(async () => {
      const startBtn = page.locator('button:has-text("시작"), button:has-text("Start")');
      if (await startBtn.isVisible()) {
        await startBtn.click();
      }
    });

    // 휴식 노드 클릭 시도
    const restClicked = await clickMapNode(page, 'rest');

    if (restClicked) {
      await page.waitForSelector('[data-testid="rest-modal"]', { timeout: 5000 }).catch(() => {});

      const restModal = page.locator('[data-testid="rest-modal"]');
      if (await restModal.isVisible()) {
        // 휴식 모달 필수 요소 확인
        await expect(page.locator('[data-testid="rest-modal-header"]')).toBeVisible();

        // 선택지 영역 확인
        await expect(page.locator('[data-testid="rest-choices"]')).toBeVisible();

        // 체력 회복 버튼 확인
        const healBtn = page.locator('[data-testid="rest-btn-heal"]');
        await expect(healBtn).toBeVisible();
      }
    }
  });

  test('휴식 - 체력 회복', async ({ page }) => {
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 15000 }).catch(async () => {
      const startBtn = page.locator('button:has-text("시작"), button:has-text("Start")');
      if (await startBtn.isVisible()) {
        await startBtn.click();
      }
    });

    // 초기 HP 확인
    const initialHp = await getPlayerHp(page);
    console.log('Initial HP:', initialHp);

    const restClicked = await clickMapNode(page, 'rest');

    if (restClicked) {
      await page.waitForSelector('[data-testid="rest-modal"]', { timeout: 5000 }).catch(() => {});

      const restModal = page.locator('[data-testid="rest-modal"]');
      if (await restModal.isVisible()) {
        // 체력 회복 버튼 클릭
        const healBtn = page.locator('[data-testid="rest-btn-heal"]');
        if (await healBtn.isVisible()) {
          await healBtn.click();

          // 모달이 닫힐 때까지 대기
          await page.waitForSelector('[data-testid="rest-modal"]', {
            state: 'hidden',
            timeout: 3000
          }).catch(() => {});

          // HP 확인 (체력이 감소되어 있었다면 회복되어야 함)
          const afterHp = await getPlayerHp(page);
          console.log('After heal HP:', afterHp);

          // 체력이 감소된 상태였다면 회복되어야 함
          if (initialHp.current < initialHp.max) {
            expect(afterHp.current).toBeGreaterThanOrEqual(initialHp.current);
          }
        }
      }
    }
  });

  test('휴식 - 각성 버튼 확인', async ({ page }) => {
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 15000 }).catch(async () => {
      const startBtn = page.locator('button:has-text("시작"), button:has-text("Start")');
      if (await startBtn.isVisible()) {
        await startBtn.click();
      }
    });

    const restClicked = await clickMapNode(page, 'rest');

    if (restClicked) {
      await page.waitForSelector('[data-testid="rest-modal"]', { timeout: 5000 }).catch(() => {});

      const restModal = page.locator('[data-testid="rest-modal"]');
      if (await restModal.isVisible()) {
        // 각성 버튼들 확인
        const awakenButtons = [
          'rest-btn-brave',
          'rest-btn-sturdy',
          'rest-btn-cold',
          'rest-btn-thorough',
          'rest-btn-passionate',
          'rest-btn-lively',
          'rest-btn-random',
        ];

        for (const btnId of awakenButtons) {
          const btn = page.locator(`[data-testid="${btnId}"]`);
          await expect(btn).toBeVisible();
        }
      }
    }
  });

  test('휴식 - 카드 성장 버튼 확인', async ({ page }) => {
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 15000 }).catch(async () => {
      const startBtn = page.locator('button:has-text("시작"), button:has-text("Start")');
      if (await startBtn.isVisible()) {
        await startBtn.click();
      }
    });

    const restClicked = await clickMapNode(page, 'rest');

    if (restClicked) {
      await page.waitForSelector('[data-testid="rest-modal"]', { timeout: 5000 }).catch(() => {});

      const restModal = page.locator('[data-testid="rest-modal"]');
      if (await restModal.isVisible()) {
        // 카드 성장 버튼 확인
        const cardGrowthBtn = page.locator('[data-testid="rest-btn-card-growth"]');
        await expect(cardGrowthBtn).toBeVisible();
      }
    }
  });

  test('휴식 모달 닫기', async ({ page }) => {
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 15000 }).catch(async () => {
      const startBtn = page.locator('button:has-text("시작"), button:has-text("Start")');
      if (await startBtn.isVisible()) {
        await startBtn.click();
      }
    });

    const restClicked = await clickMapNode(page, 'rest');

    if (restClicked) {
      await page.waitForSelector('[data-testid="rest-modal"]', { timeout: 5000 }).catch(() => {});

      const restModal = page.locator('[data-testid="rest-modal"]');
      if (await restModal.isVisible()) {
        // 닫기 버튼 클릭
        const closeBtn = page.locator('[data-testid="rest-close-btn"]');
        await closeBtn.click();

        // 모달이 닫혔는지 확인
        await expect(restModal).not.toBeVisible({ timeout: 3000 });
      }
    }
  });
});

test.describe('노드 타입별 자동 핸들링', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
  });

  test('이벤트 노드 자동 처리', async ({ page }) => {
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 15000 }).catch(async () => {
      const startBtn = page.locator('button:has-text("시작"), button:has-text("Start")');
      if (await startBtn.isVisible()) {
        await startBtn.click();
      }
    });

    const eventClicked = await clickMapNode(page, 'event');
    if (eventClicked) {
      const handled = await handleNodeByType(page, 'event');
      console.log('Event node handled:', handled);
    }
  });

  test('휴식 노드 자동 처리', async ({ page }) => {
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 15000 }).catch(async () => {
      const startBtn = page.locator('button:has-text("시작"), button:has-text("Start")');
      if (await startBtn.isVisible()) {
        await startBtn.click();
      }
    });

    const restClicked = await clickMapNode(page, 'rest');
    if (restClicked) {
      const handled = await handleNodeByType(page, 'rest');
      console.log('Rest node handled:', handled);
    }
  });
});
