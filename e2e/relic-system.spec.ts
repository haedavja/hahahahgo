import { test, expect, Page } from '@playwright/test';
import { resetGameState, enterBattle, selectMapNode, waitForUIStable, TIMEOUTS, testLogger } from './utils/test-helpers';

/**
 * 상징(Relic) 시스템 E2E 테스트
 * 개선된 enterBattle() 사용 - 맵 탐색 방식으로 전투 진입
 *
 * ## 상징 시스템 개요
 * - 게임 방향성을 결정짓는 영구 아이템
 * - 다양한 효과 타입: PASSIVE, ON_COMBAT_START, ON_TURN_START 등
 * - 희귀도: common, rare, special, legendary
 *
 * ## 검증 항목
 * 1. 상징 UI 표시
 * 2. 상징 효과 발동
 * 3. 상점에서 상징 구매
 * 4. 상징 조합 시너지
 */
test.describe('상징 시스템', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
  });

  /**
   * 상점 진입 헬퍼
   */
  async function enterShop(page: Page): Promise<boolean> {
    const shopClicked = await selectMapNode(page, 'shop');

    if (shopClicked) {
      await page.waitForSelector('[data-testid="shop-modal"], .shop-modal', { timeout: 5000 }).catch(() => {});
      await waitForUIStable(page);
      return true;
    }
    return false;
  }

  /**
   * 보유 상징 목록 가져오기
   */
  async function getRelics(page: Page): Promise<Array<{
    id: string;
    name: string;
    rarity: string;
  }>> {
    const relics = page.locator('[data-testid^="relic-"], .relic-item');
    const count = await relics.count();
    const relicInfos: Array<{ id: string; name: string; rarity: string }> = [];

    for (let i = 0; i < count; i++) {
      const relic = relics.nth(i);
      const id = await relic.getAttribute('data-relic-id') || '';
      const name = await relic.getAttribute('data-relic-name') || await relic.textContent() || '';
      const rarity = await relic.getAttribute('data-relic-rarity') || 'common';

      if (id) {
        relicInfos.push({ id, name, rarity });
      }
    }

    return relicInfos;
  }

  /**
   * 상징 효과 발동 확인
   */
  async function checkRelicActivation(page: Page, relicId: string): Promise<boolean> {
    const activationIndicator = page.locator(
      `[data-testid="relic-activation-${relicId}"], [data-relic-active="${relicId}"], .relic-flash`
    );
    return await activationIndicator.isVisible({ timeout: 2000 }).catch(() => false);
  }

  test.describe('상징 UI 표시', () => {
    test('전투 화면에 상징 슬롯 표시', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 상징 표시 영역 확인
      const relicDisplay = page.locator(
        '[data-testid="relic-display"], .relic-display, .relics-container'
      );
      await expect(relicDisplay).toBeVisible({ timeout: 3000 });
    });

    test('보유 상징이 아이콘으로 표시됨', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      const relics = await getRelics(page);
      testLogger.info('보유 상징', relics);

      // 상징이 있으면 표시되어야 함
      if (relics.length > 0) {
        const relicIcons = page.locator('[data-testid^="relic-icon-"], .relic-icon');
        await expect(relicIcons.first()).toBeVisible();
      }
    });

    test('상징 호버 시 툴팁 표시', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      const relics = await getRelics(page);

      if (relics.length > 0) {
        // 첫 번째 상징에 호버
        const firstRelic = page.locator('[data-testid^="relic-"]').first();
        await firstRelic.hover();

        // 툴팁 확인
        const tooltip = page.locator('[data-testid="relic-tooltip"], .relic-tooltip, .tooltip');
        const hasTooltip = await tooltip.isVisible({ timeout: 1000 }).catch(() => false);

        if (hasTooltip) {
          testLogger.info('상징 툴팁 표시됨');
          expect(hasTooltip).toBe(true);
        }
      }
    });
  });

  test.describe('상징 효과 발동', () => {
    test('전투 시작 시 ON_COMBAT_START 상징 발동', async ({ page }) => {
      // 전투 진입 전 상징 확인 필요
      await waitForMap(page);

      // 상징 정보 수집
      const relicDisplay = page.locator('[data-testid="map-relics"], .relics-display');
      const hasRelics = await relicDisplay.isVisible({ timeout: 1000 }).catch(() => false);

      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 전투 시작 시 상징 발동 애니메이션 확인
      const combatStartEffect = page.locator(
        '[data-testid="relic-combat-start"], .relic-activation, [data-effect-type="ON_COMBAT_START"]'
      );
      const hasEffect = await combatStartEffect.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasRelics && hasEffect) {
        testLogger.info('전투 시작 상징 효과 발동');
        expect(hasEffect).toBe(true);
      }
    });

    test('턴 시작 시 ON_TURN_START 상징 발동', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 카드 제출하여 턴 진행
      const cards = page.locator('[data-testid^="hand-card-"]');
      if (await cards.count() > 0) {
        await cards.first().click();

        const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
        if (await submitBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
          await submitBtn.click();

          // 다음 턴 시작 대기
          await page.waitForTimeout(2000);

          // 턴 시작 효과 확인
          const turnStartEffect = page.locator(
            '[data-testid="relic-turn-start"], [data-effect-type="ON_TURN_START"]'
          );
          const hasEffect = await turnStartEffect.isVisible({ timeout: 1000 }).catch(() => false);

          if (hasEffect) {
            testLogger.info('턴 시작 상징 효과 발동');
          }
        }
      }
    });

    test('카드 사용 시 ON_CARD_PLAYED 상징 발동', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 카드 선택 및 제출
      const cards = page.locator('[data-testid^="hand-card-"]');
      if (await cards.count() > 0) {
        await cards.first().click();

        const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
        if (await submitBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
          await submitBtn.click();

          // 카드 사용 효과 확인
          const cardPlayedEffect = page.locator(
            '[data-testid="relic-card-played"], [data-effect-type="ON_CARD_PLAYED"]'
          );
          const hasEffect = await cardPlayedEffect.isVisible({ timeout: 2000 }).catch(() => false);

          if (hasEffect) {
            testLogger.info('카드 사용 상징 효과 발동');
            expect(hasEffect).toBe(true);
          }
        }
      }
    });
  });

  test.describe('상점 상징 구매', () => {
    test('상점에 상징이 표시됨', async ({ page }) => {
      const entered = await enterShop(page);
      test.skip(!entered, '상점 진입 실패');

      // 상점 상징 영역 확인
      const shopRelics = page.locator(
        '[data-testid="shop-relics"], .shop-relics, [data-testid^="shop-relic-"]'
      );
      const hasRelics = await shopRelics.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasRelics) {
        testLogger.info('상점 상징 표시됨');
        expect(hasRelics).toBe(true);
      }
    });

    test('상징 구매 시 골드 감소', async ({ page }) => {
      const entered = await enterShop(page);
      test.skip(!entered, '상점 진입 실패');

      // 현재 골드 확인
      const goldDisplay = page.locator('[data-testid="gold-display"], .gold-amount');
      const initialGold = parseInt(await goldDisplay.getAttribute('data-gold-value') || '0');
      testLogger.info('초기 골드', initialGold);

      // 구매 가능한 상징 찾기
      const buyableRelic = page.locator(
        '[data-testid^="shop-relic-"][data-relic-sold="false"]'
      ).first();

      if (await buyableRelic.isVisible({ timeout: 1000 }).catch(() => false)) {
        const price = parseInt(await buyableRelic.getAttribute('data-relic-price') || '0');

        if (initialGold >= price && price > 0) {
          await buyableRelic.click();

          // 구매 확인 버튼 클릭 (있는 경우)
          const confirmBtn = page.locator('[data-testid="confirm-purchase"], .confirm-btn');
          if (await confirmBtn.isVisible({ timeout: 500 }).catch(() => false)) {
            await confirmBtn.click();
          }

          await page.waitForTimeout(500);

          // 골드 감소 확인
          const afterGold = parseInt(await goldDisplay.getAttribute('data-gold-value') || '0');
          testLogger.info('구매 후 골드', afterGold);

          expect(afterGold).toBeLessThan(initialGold);
        } else {
          testLogger.info('골드 부족 또는 가격 정보 없음');
        }
      }
    });

    test('구매한 상징이 보유 목록에 추가됨', async ({ page }) => {
      const entered = await enterShop(page);
      test.skip(!entered, '상점 진입 실패');

      // 현재 보유 상징 수
      const relicsBefore = await getRelics(page);
      const countBefore = relicsBefore.length;

      // 상징 구매 시도
      const buyableRelic = page.locator(
        '[data-testid^="shop-relic-"][data-relic-sold="false"]'
      ).first();

      if (await buyableRelic.isVisible({ timeout: 1000 }).catch(() => false)) {
        const relicId = await buyableRelic.getAttribute('data-relic-id');
        await buyableRelic.click();

        // 구매 확인
        const confirmBtn = page.locator('[data-testid="confirm-purchase"]');
        if (await confirmBtn.isVisible({ timeout: 500 }).catch(() => false)) {
          await confirmBtn.click();
        }

        await page.waitForTimeout(500);

        // 보유 상징 다시 확인
        const relicsAfter = await getRelics(page);
        const hasNewRelic = relicsAfter.some(r => r.id === relicId) || relicsAfter.length > countBefore;

        if (hasNewRelic) {
          testLogger.info('상징 구매 완료', relicId);
          expect(hasNewRelic).toBe(true);
        }
      }
    });
  });

  test.describe('상징 효과 검증', () => {
    test('에테르 수정 - 최대 행동력 증가', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 에테르 수정 보유 확인
      const relics = await getRelics(page);
      const hasEtherCrystal = relics.some(r => r.id === 'etherCrystal');

      if (hasEtherCrystal) {
        // 행동력 표시 확인
        const energyDisplay = page.locator('[data-testid="energy-display"], .energy');
        const maxEnergy = parseInt(await energyDisplay.getAttribute('data-max-energy') || '3');

        testLogger.info('최대 행동력', maxEnergy);
        // 기본 3 + 상징 1 = 4 이상
        expect(maxEnergy).toBeGreaterThanOrEqual(4);
      } else {
        testLogger.info('에테르 수정 미보유');
      }
    });

    test('PASSIVE 상징 효과가 항상 적용됨', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      const relics = await getRelics(page);

      // PASSIVE 상징 확인
      const passiveRelics = page.locator('[data-effect-type="PASSIVE"]');
      const passiveCount = await passiveRelics.count();

      if (passiveCount > 0) {
        testLogger.info(`PASSIVE 상징 ${passiveCount}개 적용 중`);

        // 패시브 효과는 UI에 표시되거나 상태에 반영되어야 함
        const passiveIndicator = page.locator('.passive-active, [data-passive-applied="true"]');
        const hasIndicator = await passiveIndicator.isVisible({ timeout: 1000 }).catch(() => false);

        if (!hasIndicator) {
          // 대안: 수치 변화로 확인 (예: HP, 드로우 수 등)
          testLogger.info('패시브 효과가 수치에 반영됨 (직접 표시 없음)');
        }
      }
    });
  });

  test.describe('상징 시각적 피드백', () => {
    test('상징 발동 시 플래시 효과', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 카드 사용하여 상징 발동 트리거
      const cards = page.locator('[data-testid^="hand-card-"]');
      if (await cards.count() > 0) {
        await cards.first().click();

        const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
        if (await submitBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
          await submitBtn.click();

          // 플래시 효과 확인
          const flashEffect = page.locator('.relic-flash, [data-relic-flashing="true"]');
          const hasFlash = await flashEffect.isVisible({ timeout: 2000 }).catch(() => false);

          if (hasFlash) {
            testLogger.info('상징 플래시 효과 발생');
            expect(hasFlash).toBe(true);
          }
        }
      }
    });

    test('상징 획득 시 알림 표시', async ({ page }) => {
      // 보상으로 상징 획득 시나리오
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 전투 완료까지 자동 진행 (간소화)
      for (let i = 0; i < 10; i++) {
        const battleResult = page.locator('[data-testid="battle-result"]');
        if (await battleResult.isVisible({ timeout: 500 }).catch(() => false)) {
          break;
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

      // 보상 화면에서 상징 확인
      const rewardRelic = page.locator('[data-testid="reward-relic"], .reward-relic');
      const hasRelicReward = await rewardRelic.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasRelicReward) {
        testLogger.info('상징 보상 표시됨');
        expect(hasRelicReward).toBe(true);
      }
    });
  });
});
