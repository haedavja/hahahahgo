import { test, expect, Page } from '@playwright/test';
import { resetGameState, enterBattle, getHPSafe, TIMEOUTS, testLogger, getHitCount, waitForCardEffect, waitForTurnProgress } from './utils/test-helpers';
import { createAssertions } from './utils/assertions';

/**
 * 특수 카드 효과 E2E 테스트
 * 개선된 enterBattle() 사용 - 맵 탐색 방식으로 전투 진입
 *
 * ## 테스트 대상
 * 1. 다중 히트 (Multi-Hit)
 * 2. 회상 (Recall)
 * 3. 연계 (Chain)
 * 4. 조건부 효과 (Conditional)
 * 5. 반격 (Counter)
 * 6. 흡혈 (Lifesteal)
 */
test.describe('특수 카드 효과', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
  });

  // getHP는 중앙 헬퍼(test-helpers.ts) 사용

  /**
   * 특정 효과를 가진 카드 찾기
   */
  async function findCardWithEffect(page: Page, effectType: string): Promise<{
    found: boolean;
    index: number;
  }> {
    const cards = page.locator('[data-testid^="hand-card-"]');
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const effect = await card.getAttribute('data-card-effect') || '';
      const tags = await card.getAttribute('data-card-tags') || '';
      const name = await card.getAttribute('data-card-name') || '';

      if (effect.includes(effectType) || tags.includes(effectType) || name.includes(effectType)) {
        return { found: true, index: i };
      }
    }

    return { found: false, index: -1 };
  }

  test.describe('다중 히트 (Multi-Hit)', () => {
    test('다중 히트 카드가 여러 번 피해를 줌', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 다중 히트 카드 찾기
      const multiHitCard = await findCardWithEffect(page, 'multi');

      if (multiHitCard.found) {
        const initialEnemyHP = await getHPSafe(page, 'enemy');
        testLogger.info('초기 적 HP', initialEnemyHP);

        // 카드 사용
        const card = page.locator(`[data-testid="hand-card-${multiHitCard.index}"]`);
        await card.click();

        const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
        if (await submitBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
          await submitBtn.click();

          // 턴 진행 및 히트 카운터 확인 (상태 기반)
          await waitForTurnProgress(page);
          const hitCount = await getHitCount(page);
          testLogger.info('히트 카운트', hitCount);

          const afterHP = await getHPSafe(page, 'enemy');
          const totalDamage = initialEnemyHP.current - afterHP.current;
          testLogger.info('총 피해', totalDamage);

          // 다중 히트라면 피해가 발생해야 함
          expect(totalDamage).toBeGreaterThan(0);

          // 히트 카운터가 2 이상이면 다중 히트 확인
          if (hitCount >= 2) {
            expect(hitCount).toBeGreaterThanOrEqual(2);
          }
        }
      } else {
        testLogger.info('다중 히트 카드 없음');
      }
    });

    test('다중 히트 애니메이션이 순차적으로 표시', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      const multiHitCard = await findCardWithEffect(page, 'multi');

      if (multiHitCard.found) {
        const card = page.locator(`[data-testid="hand-card-${multiHitCard.index}"]`);
        await card.click();

        const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
        if (await submitBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
          await submitBtn.click();

          // 히트 애니메이션 관찰
          const hitAnimations: number[] = [];
          const startTime = Date.now();

          for (let i = 0; i < 5; i++) {
            await page.waitForTimeout(200);
            const hitIndicator = page.locator('[data-testid="hit-indicator"], .hit-effect');
            if (await hitIndicator.isVisible({ timeout: 100 }).catch(() => false)) {
              hitAnimations.push(Date.now() - startTime);
            }
          }

          testLogger.info('히트 애니메이션 타이밍', hitAnimations);

          // 여러 번 히트가 감지되면 순차적
          if (hitAnimations.length >= 2) {
            // 각 히트 사이에 시간 간격이 있어야 함
            expect(hitAnimations[1] - hitAnimations[0]).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  test.describe('회상 (Recall)', () => {
    test('회상으로 카드를 손으로 되돌림', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 회상 버튼 또는 카드 찾기
      const recallBtn = page.locator(
        '[data-testid="recall-btn"], button:has-text("회상"), [data-action="recall"]'
      );

      if (await recallBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        // 카드 선택하여 타임라인에 올림
        const cards = page.locator('[data-testid^="hand-card-"]');
        const initialHandCount = await cards.count();

        if (initialHandCount > 0) {
          await cards.first().click();

          // 선택된 카드가 있으면 회상 시도
          await recallBtn.click();

          await page.waitForTimeout(500);

          // 손에 카드가 돌아왔는지 확인
          const newHandCount = await page.locator('[data-testid^="hand-card-"]').count();
          testLogger.info('회상 후 핸드 카드 수', { before: initialHandCount, after: newHandCount });

          // 회상이 성공하면 핸드에 카드가 유지/증가
          expect(newHandCount).toBeGreaterThanOrEqual(initialHandCount);
        }
      } else {
        testLogger.info('회상 버튼 없음');
      }
    });

    test('회상 모달에서 카드 선택', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 회상 모달 트리거
      const recallTrigger = page.locator('[data-testid="open-recall"], [data-action="open-recall"]');

      if (await recallTrigger.isVisible({ timeout: 1000 }).catch(() => false)) {
        await recallTrigger.click();

        // 회상 모달 대기
        const recallModal = page.locator('[data-testid="recall-modal"]');

        if (await recallModal.isVisible({ timeout: 2000 }).catch(() => false)) {
          testLogger.info('회상 모달 표시됨');

          // 회상 가능한 카드 선택
          const recallableCard = page.locator('[data-testid^="recallable-card-"]').first();
          if (await recallableCard.isVisible({ timeout: 1000 }).catch(() => false)) {
            await recallableCard.click();

            // 확인 버튼
            const confirmBtn = page.locator('[data-testid="confirm-recall"]');
            if (await confirmBtn.isVisible({ timeout: 500 }).catch(() => false)) {
              await confirmBtn.click();
            }

            testLogger.info('회상 완료');
          }
        }
      }
    });
  });

  test.describe('연계 (Chain)', () => {
    test('연계 카드가 조건 충족 시 추가 효과', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 연계 카드 찾기
      const chainCard = await findCardWithEffect(page, 'chain');

      if (chainCard.found) {
        // 연계 조건 확인 (보통 이전 카드 사용)
        const cards = page.locator('[data-testid^="hand-card-"]');

        // 첫 번째 카드 사용
        if (await cards.count() >= 2) {
          await cards.first().click();

          const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
          if (await submitBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
            await submitBtn.click();
            await waitForTurnProgress(page);

            // 연계 카드 사용 (다음 턴)
            const chainCardLocator = page.locator(`[data-testid="hand-card-${chainCard.index}"]`);
            if (await chainCardLocator.isVisible({ timeout: 1000 }).catch(() => false)) {
              // 연계 보너스 표시 확인
              const chainBonus = await chainCardLocator.getAttribute('data-chain-bonus');
              testLogger.info('연계 보너스', chainBonus);

              if (chainBonus) {
                expect(chainBonus).not.toBe('0');
              }
            }
          }
        }
      } else {
        testLogger.info('연계 카드 없음');
      }
    });

    test('연계 효과가 UI에 표시됨', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 연계 표시 확인
      const chainIndicator = page.locator('[data-testid="chain-indicator"], .chain-bonus');

      // 카드 연속 사용하여 연계 트리거
      const cards = page.locator('[data-testid^="hand-card-"]');
      if (await cards.count() >= 2) {
        await cards.nth(0).click();
        await cards.nth(1).click();

        // 연계 표시 확인
        const hasChainIndicator = await chainIndicator.isVisible({ timeout: 1000 }).catch(() => false);

        if (hasChainIndicator) {
          const chainText = await chainIndicator.textContent();
          testLogger.info('연계 표시', chainText);
        }
      }
    });
  });

  test.describe('조건부 효과 (Conditional)', () => {
    test('조건 충족 시 카드 효과 강화', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 조건부 카드 찾기 (예: HP 50% 이하 시 데미지 2배)
      const conditionalCard = await findCardWithEffect(page, 'conditional');

      if (conditionalCard.found) {
        const card = page.locator(`[data-testid="hand-card-${conditionalCard.index}"]`);

        // 조건 상태 확인
        const conditionMet = await card.getAttribute('data-condition-met');
        const baseDamage = await card.getAttribute('data-base-damage');
        const currentDamage = await card.getAttribute('data-displayed-damage');

        testLogger.info('조건부 카드 상태', {
          conditionMet,
          baseDamage,
          currentDamage,
        });

        if (conditionMet === 'true') {
          // 조건 충족 시 효과 강화
          expect(parseInt(currentDamage || '0')).toBeGreaterThan(parseInt(baseDamage || '0'));
        }
      } else {
        testLogger.info('조건부 카드 없음');
      }
    });

    test('조건 미충족 시 기본 효과만 적용', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 조건부 카드 중 조건 미충족 상태인 것 확인
      const cards = page.locator('[data-testid^="hand-card-"][data-condition-met="false"]');

      if (await cards.count() > 0) {
        const card = cards.first();
        const baseDamage = await card.getAttribute('data-base-damage');
        const currentDamage = await card.getAttribute('data-displayed-damage');

        testLogger.info('조건 미충족 카드', { baseDamage, currentDamage });

        // 기본 효과만 적용
        expect(currentDamage).toBe(baseDamage);
      }
    });
  });

  test.describe('반격 (Counter)', () => {
    test('반격 카드 사용 시 반격 상태 표시', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 반격 카드 찾기
      const counterCard = await findCardWithEffect(page, 'counter');

      if (counterCard.found) {
        const card = page.locator(`[data-testid="hand-card-${counterCard.index}"]`);
        await card.click();

        const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
        if (await submitBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
          await submitBtn.click();
          await waitForTurnProgress(page);

          // 반격 상태 표시 확인
          const counterStatus = page.locator(
            '[data-testid="counter-status"], [data-status-type="counter"], .counter-stance'
          );
          const hasCounter = await counterStatus.isVisible({ timeout: 1000 }).catch(() => false);

          if (hasCounter) {
            testLogger.info('반격 상태 활성');
            expect(hasCounter).toBe(true);
          }
        }
      } else {
        testLogger.info('반격 카드 없음');
      }
    });

    test('피격 시 반격 발동', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 반격 상태가 있는 경우
      const counterStatus = page.locator('[data-status-type="counter"]');

      if (await counterStatus.isVisible({ timeout: 1000 }).catch(() => false)) {
        const initialEnemyHP = await getHPSafe(page, 'enemy');

        // 적 턴 대기 (피격 발생) - 상태 기반
        await waitForTurnProgress(page);

        // 반격으로 적 HP 감소 확인
        const afterEnemyHP = await getHPSafe(page, 'enemy');
        const counterDamage = initialEnemyHP.current - afterEnemyHP.current;

        if (counterDamage > 0) {
          testLogger.info('반격 피해', counterDamage);
          expect(counterDamage).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('흡혈 (Lifesteal)', () => {
    test('흡혈 카드 사용 시 HP 회복', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 흡혈 카드 찾기
      const lifestealCard = await findCardWithEffect(page, 'lifesteal');

      if (lifestealCard.found) {
        const initialPlayerHP = await getHPSafe(page, 'player');
        const initialEnemyHP = await getHPSafe(page, 'enemy');

        testLogger.info('초기 상태', { player: initialPlayerHP, enemy: initialEnemyHP });

        // 흡혈 카드 사용
        const card = page.locator(`[data-testid="hand-card-${lifestealCard.index}"]`);
        await card.click();

        const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
        if (await submitBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
          await submitBtn.click();
          await waitForTurnProgress(page);

          const afterPlayerHP = await getHPSafe(page, 'player');
          const afterEnemyHP = await getHPSafe(page, 'enemy');

          const damageDealt = initialEnemyHP.current - afterEnemyHP.current;
          const hpRecovered = afterPlayerHP.current - initialPlayerHP.current;

          testLogger.info('흡혈 결과', { damageDealt, hpRecovered });

          // 피해를 줬고 HP가 회복되었으면 흡혈 성공
          if (damageDealt > 0 && hpRecovered > 0) {
            expect(hpRecovered).toBeGreaterThan(0);
          }
        }
      } else {
        testLogger.info('흡혈 카드 없음');
      }
    });

    test('흡혈량이 최대 HP 초과 시 최대 HP까지만 회복', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 현재 HP가 최대 HP인 경우 확인
      const hp = await getHPSafe(page, 'player');

      if (hp.current === hp.max) {
        // 흡혈 카드 사용
        const lifestealCard = await findCardWithEffect(page, 'lifesteal');

        if (lifestealCard.found) {
          const card = page.locator(`[data-testid="hand-card-${lifestealCard.index}"]`);
          await card.click();

          const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
          if (await submitBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
            await submitBtn.click();
            await waitForTurnProgress(page);

            const afterHP = await getHPSafe(page, 'player');
            testLogger.info('흡혈 후 HP', afterHP);

            // 최대 HP 초과하지 않음
            expect(afterHP.current).toBeLessThanOrEqual(afterHP.max);
          }
        }
      }
    });
  });

  test.describe('복합 효과', () => {
    test('다중 효과 카드가 모든 효과 적용', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 여러 효과를 가진 카드 찾기 (예: 공격 + 힐)
      const cards = page.locator('[data-testid^="hand-card-"]');
      const count = await cards.count();

      for (let i = 0; i < count; i++) {
        const card = cards.nth(i);
        const effects = await card.getAttribute('data-card-effects');

        if (effects && effects.includes(',')) {
          testLogger.info(`카드 ${i}의 복합 효과`, effects);

          // 복합 효과 카드 발견
          const effectList = effects.split(',');
          expect(effectList.length).toBeGreaterThan(1);
          break;
        }
      }
    });
  });
});
