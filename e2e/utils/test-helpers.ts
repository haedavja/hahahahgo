import { Page, Locator, expect } from '@playwright/test';

/**
 * E2E 테스트 헬퍼 함수들
 */

/**
 * 게임이 완전히 로드될 때까지 대기
 */
export async function waitForGameLoad(page: Page): Promise<void> {
  // 로딩 화면이 사라질 때까지 대기
  await page.waitForSelector('[data-testid="game-container"]', {
    state: 'visible',
    timeout: 30000,
  });
}

/**
 * 맵 화면으로 이동
 */
export async function navigateToMap(page: Page): Promise<void> {
  await waitForGameLoad(page);
  // 맵이 표시될 때까지 대기
  await page.waitForSelector('[data-testid="map-container"]', {
    state: 'visible',
    timeout: 10000,
  }).catch(() => {
    // 맵 컨테이너가 없으면 게임 시작 버튼 클릭
    return page.click('[data-testid="start-game-btn"]');
  });
}

/**
 * 맵에서 노드 클릭
 */
export async function clickMapNode(page: Page, nodeType: string): Promise<void> {
  const node = page.locator(`[data-testid="map-node-${nodeType}"]`).first();
  await node.click();
}

/**
 * 전투 시작 대기
 */
export async function waitForBattle(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="battle-screen"]', {
    state: 'visible',
    timeout: 10000,
  });
}

/**
 * 핸드에서 카드 선택
 */
export async function selectCard(page: Page, cardIndex: number): Promise<void> {
  const cards = page.locator('[data-testid="hand-card"]');
  const card = cards.nth(cardIndex);
  await card.click();
}

/**
 * 카드 제출 (턴 종료)
 */
export async function submitCards(page: Page): Promise<void> {
  const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
  await submitBtn.click();
}

/**
 * 전투 종료 대기
 */
export async function waitForBattleEnd(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="battle-result"]', {
    state: 'visible',
    timeout: 60000,
  });
}

/**
 * 승리/패배 결과 확인
 */
export async function getBattleResult(page: Page): Promise<'victory' | 'defeat'> {
  const resultEl = page.locator('[data-testid="battle-result"]');
  const text = await resultEl.textContent();
  return text?.toLowerCase().includes('victory') ? 'victory' : 'defeat';
}

/**
 * 보상 수령
 */
export async function collectReward(page: Page): Promise<void> {
  const rewardBtn = page.locator('[data-testid="collect-reward-btn"]');
  if (await rewardBtn.isVisible()) {
    await rewardBtn.click();
  }
}

/**
 * 상점 화면 대기
 */
export async function waitForShop(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="shop-modal"]', {
    state: 'visible',
    timeout: 10000,
  });
}

/**
 * 상점에서 아이템 구매
 */
export async function buyShopItem(page: Page, itemIndex: number): Promise<void> {
  const items = page.locator('[data-testid="shop-item"]');
  const item = items.nth(itemIndex);
  await item.click();

  const buyBtn = page.locator('[data-testid="buy-btn"]');
  if (await buyBtn.isVisible()) {
    await buyBtn.click();
  }
}

/**
 * 상점 나가기
 */
export async function exitShop(page: Page): Promise<void> {
  const exitBtn = page.locator('[data-testid="exit-shop-btn"]');
  await exitBtn.click();
}

/**
 * 플레이어 HP 확인
 */
export async function getPlayerHp(page: Page): Promise<{ current: number; max: number }> {
  const hpText = await page.locator('[data-testid="player-hp"]').textContent();
  const match = hpText?.match(/(\d+)\s*\/\s*(\d+)/);
  if (match) {
    return { current: parseInt(match[1]), max: parseInt(match[2]) };
  }
  return { current: 0, max: 0 };
}

/**
 * 플레이어 골드 확인
 */
export async function getPlayerGold(page: Page): Promise<number> {
  const goldText = await page.locator('[data-testid="player-gold"]').textContent();
  const match = goldText?.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

/**
 * 스크린샷 촬영 (디버깅용)
 */
export async function takeDebugScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: `e2e/screenshots/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}

/**
 * 게임 상태 초기화 (localStorage 클리어)
 */
export async function resetGameState(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
}

/**
 * 특정 요소가 나타날 때까지 대기하고 클릭
 */
export async function waitAndClick(
  page: Page,
  selector: string,
  options?: { timeout?: number }
): Promise<void> {
  await page.waitForSelector(selector, {
    state: 'visible',
    timeout: options?.timeout ?? 10000,
  });
  await page.click(selector);
}

/**
 * 모달 닫기
 */
export async function closeModal(page: Page): Promise<void> {
  const closeBtn = page.locator('[data-testid="modal-close-btn"]');
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
  } else {
    // ESC 키로 닫기 시도
    await page.keyboard.press('Escape');
  }
}

/**
 * 게임 일시정지/재개
 */
export async function togglePause(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
}

/**
 * 자동 전투 진행 (간단한 AI 로직)
 */
export async function autoPlayBattle(page: Page, maxTurns: number = 30): Promise<'victory' | 'defeat' | 'timeout'> {
  for (let turn = 0; turn < maxTurns; turn++) {
    // 전투 종료 확인
    const resultEl = page.locator('[data-testid="battle-result"]');
    if (await resultEl.isVisible()) {
      const result = await getBattleResult(page);
      return result;
    }

    // 카드 선택 (첫 번째 카드 선택)
    const cards = page.locator('[data-testid="hand-card"]');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      // 최대 3장까지 선택
      for (let i = 0; i < Math.min(3, cardCount); i++) {
        await cards.nth(i).click();
        await page.waitForTimeout(100);
      }

      // 제출
      const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
      if (await submitBtn.isEnabled()) {
        await submitBtn.click();
      }
    }

    // 턴 진행 대기
    await page.waitForTimeout(500);
  }

  return 'timeout';
}
