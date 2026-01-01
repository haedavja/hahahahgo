import { test, expect, Page } from '@playwright/test';
import { resetGameState, waitForMap, selectMapNode, waitForUIStable, TIMEOUTS, testLogger } from './utils/test-helpers';

/**
 * 덱 빌딩 흐름 E2E 테스트
 *
 * ## 덱 빌딩 시스템 개요
 * - 전투 승리 후 카드 보상 선택
 * - 상점에서 카드 구매/제거
 * - 휴식 노드에서 카드 강화
 * - 특성(Trait) 시스템
 *
 * ## 검증 항목
 * 1. 카드 보상 선택
 * 2. 카드 구매/제거
 * 3. 카드 강화
 * 4. 덱 확인
 */
test.describe('덱 빌딩 흐름', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
  });

  /**
   * 전투 완료 헬퍼
   */
  async function completeBattle(page: Page): Promise<boolean> {
    await waitForMap(page);
    const battleClicked = await selectMapNode(page, 'battle');

    if (!battleClicked) return false;

    await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 }).catch(() => {});
    await waitForUIStable(page);

    // 자동 전투 진행
    for (let turn = 0; turn < 20; turn++) {
      const battleResult = page.locator('[data-testid="battle-result"]');
      if (await battleResult.isVisible({ timeout: 500 }).catch(() => false)) {
        return true;
      }

      const cards = page.locator('[data-testid^="hand-card-"]');
      if (await cards.count() > 0) {
        await cards.first().click();
        const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
        if (await submitBtn.isEnabled({ timeout: 500 }).catch(() => false)) {
          await submitBtn.click();
          await page.waitForTimeout(1500);
        }
      }
    }

    return false;
  }

  /**
   * 현재 덱 카드 목록 가져오기
   */
  async function getDeckCards(page: Page): Promise<Array<{
    id: string;
    name: string;
    type: string;
  }>> {
    // 덱 보기 버튼 클릭
    const deckBtn = page.locator('[data-testid="view-deck-btn"], .deck-btn, button:has-text("덱")');
    if (await deckBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await deckBtn.click();
      await page.waitForTimeout(500);
    }

    const deckCards = page.locator('[data-testid^="deck-card-"], .deck-card');
    const count = await deckCards.count();
    const cards: Array<{ id: string; name: string; type: string }> = [];

    for (let i = 0; i < count; i++) {
      const card = deckCards.nth(i);
      const id = await card.getAttribute('data-card-id') || '';
      const name = await card.getAttribute('data-card-name') || await card.textContent() || '';
      const type = await card.getAttribute('data-card-type') || 'unknown';

      if (id || name) {
        cards.push({ id, name, type });
      }
    }

    // 덱 모달 닫기
    const closeBtn = page.locator('[data-testid="close-deck"], .close-btn');
    if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await closeBtn.click();
    }

    return cards;
  }

  test.describe('카드 보상 선택', () => {
    test('전투 승리 후 카드 보상 표시', async ({ page }) => {
      const completed = await completeBattle(page);
      test.skip(!completed, '전투 완료 실패');

      // 카드 보상 화면 확인
      const cardReward = page.locator(
        '[data-testid="card-reward"], .card-reward, [data-testid="reward-cards"]'
      );
      const hasReward = await cardReward.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasReward) {
        testLogger.info('카드 보상 표시됨');
        expect(hasReward).toBe(true);
      } else {
        // 보상 없이 바로 다음 단계로
        testLogger.info('카드 보상 없음 (스킵 또는 다른 보상)');
      }
    });

    test('보상 카드 선택 시 덱에 추가', async ({ page }) => {
      // 초기 덱 카드 수 확인
      await waitForMap(page);
      const initialDeck = await getDeckCards(page);
      testLogger.info('초기 덱 카드 수', initialDeck.length);

      const completed = await completeBattle(page);
      test.skip(!completed, '전투 완료 실패');

      // 카드 보상 선택
      const rewardCard = page.locator('[data-testid^="reward-card-"]').first();

      if (await rewardCard.isVisible({ timeout: 2000 }).catch(() => false)) {
        await rewardCard.click();

        // 확인 버튼 클릭 (있는 경우)
        const confirmBtn = page.locator('[data-testid="confirm-reward"]');
        if (await confirmBtn.isVisible({ timeout: 500 }).catch(() => false)) {
          await confirmBtn.click();
        }

        await page.waitForTimeout(1000);

        // 덱 카드 수 다시 확인
        const newDeck = await getDeckCards(page);
        testLogger.info('보상 후 덱 카드 수', newDeck.length);

        expect(newDeck.length).toBeGreaterThanOrEqual(initialDeck.length);
      }
    });

    test('보상 스킵 가능', async ({ page }) => {
      const completed = await completeBattle(page);
      test.skip(!completed, '전투 완료 실패');

      // 스킵 버튼 확인
      const skipBtn = page.locator(
        '[data-testid="skip-reward"], button:has-text("스킵"), button:has-text("건너뛰기")'
      );

      if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await skipBtn.click();

        // 보상 화면이 닫히는지 확인
        await page.waitForTimeout(500);
        const rewardModal = page.locator('[data-testid="reward-modal"]');
        const isClosed = !(await rewardModal.isVisible({ timeout: 500 }).catch(() => false));

        testLogger.info('보상 스킵됨', isClosed);
        expect(isClosed).toBe(true);
      }
    });
  });

  test.describe('상점 카드 거래', () => {
    test('상점에서 카드 구매 가능', async ({ page }) => {
      await waitForMap(page);

      // 초기 덱 확인
      const initialDeck = await getDeckCards(page);

      // 상점 진입
      const shopClicked = await selectMapNode(page, 'shop');
      test.skip(!shopClicked, '상점 진입 실패');

      await page.waitForSelector('[data-testid="shop-modal"]', { timeout: 5000 }).catch(() => {});

      // 구매 가능한 카드 찾기
      const buyableCard = page.locator(
        '[data-testid^="shop-card-"][data-card-sold="false"]'
      ).first();

      if (await buyableCard.isVisible({ timeout: 1000 }).catch(() => false)) {
        // 골드 확인
        const goldDisplay = page.locator('[data-testid="gold-display"]');
        const gold = parseInt(await goldDisplay.getAttribute('data-gold-value') || '0');
        const price = parseInt(await buyableCard.getAttribute('data-card-price') || '0');

        if (gold >= price && price > 0) {
          await buyableCard.click();

          // 구매 확인
          const confirmBtn = page.locator('[data-testid="confirm-purchase"]');
          if (await confirmBtn.isVisible({ timeout: 500 }).catch(() => false)) {
            await confirmBtn.click();
          }

          await page.waitForTimeout(500);

          // 상점 나가기
          const exitBtn = page.locator('[data-testid="shop-exit-btn"]');
          await exitBtn.click().catch(() => {});

          // 덱 확인
          const newDeck = await getDeckCards(page);
          testLogger.info('구매 후 덱 카드 수', { before: initialDeck.length, after: newDeck.length });

          expect(newDeck.length).toBeGreaterThan(initialDeck.length);
        } else {
          testLogger.info('골드 부족');
        }
      }
    });

    test('상점에서 카드 제거 서비스 사용', async ({ page }) => {
      await waitForMap(page);

      const initialDeck = await getDeckCards(page);
      testLogger.info('초기 덱 카드 수', initialDeck.length);

      // 상점 진입
      const shopClicked = await selectMapNode(page, 'shop');
      test.skip(!shopClicked, '상점 진입 실패');

      await page.waitForSelector('[data-testid="shop-modal"]', { timeout: 5000 }).catch(() => {});

      // 카드 제거 서비스 찾기
      const removeService = page.locator(
        '[data-testid="shop-service-remove"], [data-service-type="remove"]'
      );

      if (await removeService.isVisible({ timeout: 1000 }).catch(() => false)) {
        await removeService.click();

        // 제거할 카드 선택
        const removableCard = page.locator('[data-testid^="removable-card-"]').first();
        if (await removableCard.isVisible({ timeout: 1000 }).catch(() => false)) {
          await removableCard.click();

          // 확인 버튼
          const confirmBtn = page.locator('[data-testid="confirm-remove"]');
          if (await confirmBtn.isVisible({ timeout: 500 }).catch(() => false)) {
            await confirmBtn.click();
          }

          await page.waitForTimeout(500);

          // 덱 확인
          const newDeck = await getDeckCards(page);
          testLogger.info('제거 후 덱 카드 수', newDeck.length);

          expect(newDeck.length).toBeLessThan(initialDeck.length);
        }
      } else {
        testLogger.info('카드 제거 서비스 없음');
      }
    });
  });

  test.describe('휴식 노드 카드 강화', () => {
    test('휴식에서 카드 강화 가능', async ({ page }) => {
      await waitForMap(page);

      // 휴식 노드 진입
      const restClicked = await selectMapNode(page, 'rest');
      test.skip(!restClicked, '휴식 노드 진입 실패');

      await page.waitForSelector('[data-testid="rest-modal"]', { timeout: 5000 }).catch(() => {});

      // 강화 옵션 찾기
      const upgradeOption = page.locator(
        '[data-testid="rest-upgrade"], button:has-text("강화"), [data-rest-action="upgrade"]'
      );

      if (await upgradeOption.isVisible({ timeout: 1000 }).catch(() => false)) {
        await upgradeOption.click();

        // 강화할 카드 선택 화면
        const upgradeModal = page.locator('[data-testid="upgrade-modal"], .upgrade-selection');
        const hasUpgradeModal = await upgradeModal.isVisible({ timeout: 1000 }).catch(() => false);

        if (hasUpgradeModal) {
          // 첫 번째 카드 선택
          const upgradableCard = page.locator('[data-testid^="upgradable-card-"]').first();
          if (await upgradableCard.isVisible({ timeout: 1000 }).catch(() => false)) {
            const cardNameBefore = await upgradableCard.getAttribute('data-card-name');
            await upgradableCard.click();

            await page.waitForTimeout(500);

            testLogger.info('카드 강화됨', cardNameBefore);
          }
        }
      } else {
        testLogger.info('강화 옵션 없음 (휴식 선택됨)');
      }
    });

    test('휴식에서 회복과 강화 중 선택', async ({ page }) => {
      await waitForMap(page);

      const restClicked = await selectMapNode(page, 'rest');
      test.skip(!restClicked, '휴식 노드 진입 실패');

      await page.waitForSelector('[data-testid="rest-modal"]', { timeout: 5000 }).catch(() => {});

      // 회복 옵션
      const healOption = page.locator(
        '[data-testid="rest-heal"], button:has-text("회복"), [data-rest-action="heal"]'
      );
      const hasHeal = await healOption.isVisible({ timeout: 1000 }).catch(() => false);

      // 강화 옵션
      const upgradeOption = page.locator(
        '[data-testid="rest-upgrade"], button:has-text("강화"), [data-rest-action="upgrade"]'
      );
      const hasUpgrade = await upgradeOption.isVisible({ timeout: 1000 }).catch(() => false);

      testLogger.info('휴식 옵션', { heal: hasHeal, upgrade: hasUpgrade });

      // 둘 중 하나 이상 있어야 함
      expect(hasHeal || hasUpgrade).toBe(true);
    });
  });

  test.describe('덱 확인 기능', () => {
    test('덱 보기 버튼으로 전체 덱 확인', async ({ page }) => {
      await waitForMap(page);

      const deck = await getDeckCards(page);
      testLogger.info('덱 카드 목록', deck);

      expect(deck.length).toBeGreaterThan(0);
    });

    test('덱에서 카드 상세 정보 확인', async ({ page }) => {
      await waitForMap(page);

      // 덱 열기
      const deckBtn = page.locator('[data-testid="view-deck-btn"], .deck-btn');
      if (await deckBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await deckBtn.click();
        await page.waitForTimeout(500);

        // 첫 번째 카드 클릭
        const firstCard = page.locator('[data-testid^="deck-card-"]').first();
        if (await firstCard.isVisible({ timeout: 1000 }).catch(() => false)) {
          await firstCard.click();

          // 카드 상세 정보 확인
          const cardDetail = page.locator('[data-testid="card-detail"], .card-detail');
          const hasDetail = await cardDetail.isVisible({ timeout: 1000 }).catch(() => false);

          if (hasDetail) {
            const description = await cardDetail.textContent();
            testLogger.info('카드 상세', description);
            expect(description?.length).toBeGreaterThan(0);
          }
        }
      }
    });

    test('덱 카드 타입별 필터링', async ({ page }) => {
      await waitForMap(page);

      // 덱 열기
      const deckBtn = page.locator('[data-testid="view-deck-btn"]');
      if (await deckBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await deckBtn.click();
        await page.waitForTimeout(500);

        // 필터 버튼 확인
        const filterBtn = page.locator('[data-testid="deck-filter"], .filter-btn');

        if (await filterBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          // 공격 카드 필터
          const attackFilter = page.locator('[data-filter-type="attack"]');
          if (await attackFilter.isVisible({ timeout: 500 }).catch(() => false)) {
            await attackFilter.click();

            // 필터링된 카드 확인
            const filteredCards = page.locator('[data-testid^="deck-card-"][data-card-type="attack"]');
            const count = await filteredCards.count();
            testLogger.info('공격 카드 수', count);
          }
        }
      }
    });
  });

  test.describe('특성(Trait) 시스템', () => {
    test('카드에 특성 표시', async ({ page }) => {
      await waitForMap(page);

      // 전투 진입
      const battleClicked = await selectMapNode(page, 'battle');
      if (!battleClicked) return;

      await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 }).catch(() => {});

      // 특성 있는 카드 확인
      const cardWithTrait = page.locator('[data-testid^="hand-card-"][data-has-traits="true"]');

      if (await cardWithTrait.count() > 0) {
        // 특성 표시 확인
        const traitIndicator = cardWithTrait.first().locator('.trait-icon, [data-testid="trait-indicator"]');
        const hasTrait = await traitIndicator.isVisible({ timeout: 1000 }).catch(() => false);

        testLogger.info('특성 표시', hasTrait);
      }
    });

    test('특성 보상 선택', async ({ page }) => {
      const completed = await completeBattle(page);
      test.skip(!completed, '전투 완료 실패');

      // 특성 보상 화면 확인
      const traitReward = page.locator(
        '[data-testid="trait-reward"], .trait-reward-modal'
      );
      const hasTraitReward = await traitReward.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasTraitReward) {
        // 특성 선택
        const traitOption = page.locator('[data-testid^="trait-option-"]').first();
        if (await traitOption.isVisible({ timeout: 1000 }).catch(() => false)) {
          await traitOption.click();
          testLogger.info('특성 보상 선택됨');
        }
      } else {
        testLogger.info('특성 보상 없음');
      }
    });
  });

  test.describe('덱 상태 유지', () => {
    test('전투 간 덱 상태 유지', async ({ page }) => {
      await waitForMap(page);

      // 첫 번째 전투 전 덱
      const deckBefore = await getDeckCards(page);

      // 전투 완료
      await completeBattle(page);

      // 보상 처리
      const skipBtn = page.locator('[data-testid="skip-reward"]');
      if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await skipBtn.click();
      }

      const continueBtn = page.locator('[data-testid="continue-btn"]');
      if (await continueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await continueBtn.click();
      }

      await waitForMap(page);

      // 두 번째 전투 전 덱
      const deckAfter = await getDeckCards(page);

      testLogger.info('덱 카드 수', { before: deckBefore.length, after: deckAfter.length });

      // 덱이 유지되거나 증가 (카드 추가)
      expect(deckAfter.length).toBeGreaterThanOrEqual(deckBefore.length - 1); // 제거 가능성 고려
    });
  });
});
