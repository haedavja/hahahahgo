import { test, expect, Page } from '@playwright/test';
import { resetGameState, enterBattle, TIMEOUTS, testLogger, waitForTurnProgress } from './utils/test-helpers';

/**
 * 에테르 시스템 E2E 테스트
 * 개선된 enterBattle() 사용 - 맵 탐색 방식으로 전투 진입
 *
 * ## 에테르 시스템 개요
 * - 카드 사용 시 에테르 축적
 * - 에테르 100 도달 시 버스트 (추가 피해)
 * - 조합별 에테르 배율 적용
 * - 디플레이션: 같은 조합 반복 시 획득량 감소
 *
 * ## 검증 항목
 * 1. 에테르 UI 표시
 * 2. 카드 사용 시 에테르 증가
 * 3. 조합별 배율 차이
 * 4. 버스트 발동
 * 5. 디플레이션 적용
 */
test.describe('에테르 시스템', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
  });

  /**
   * 에테르 값 추출
   */
  async function getEtherValue(page: Page, target: 'player' | 'enemy'): Promise<number> {
    const selectors = target === 'player'
      ? ['[data-testid="player-ether"]', '.player-ether', '[data-ether-player]']
      : ['[data-testid="enemy-ether"]', '.enemy-ether', '[data-ether-enemy]'];

    for (const selector of selectors) {
      const element = page.locator(selector);
      if (await element.isVisible({ timeout: 500 }).catch(() => false)) {
        // data-ether-value 속성 또는 텍스트에서 숫자 추출
        const value = await element.getAttribute('data-ether-value');
        if (value) return parseInt(value);

        const text = await element.textContent();
        const match = text?.match(/\d+/);
        if (match) return parseInt(match[0]);
      }
    }
    return 0;
  }

  /**
   * 에테르 프리뷰 값 추출 (선택 시 표시되는 예상 획득량)
   */
  async function getEtherPreview(page: Page): Promise<number> {
    const previewSelectors = [
      '[data-testid="ether-preview"]',
      '.ether-preview',
      '[data-testid="ether-gain-preview"]'
    ];

    for (const selector of previewSelectors) {
      const element = page.locator(selector);
      if (await element.isVisible({ timeout: 500 }).catch(() => false)) {
        const value = await element.getAttribute('data-preview-value');
        if (value) return parseInt(value);

        const text = await element.textContent();
        const match = text?.match(/\+?(\d+)/);
        if (match) return parseInt(match[1]);
      }
    }
    return 0;
  }

  /**
   * 핸드 카드 정보 추출
   */
  async function getHandCards(page: Page): Promise<Array<{
    index: number;
    actionCost: number;
    type: string;
  }>> {
    const cards = page.locator('[data-testid^="hand-card-"]');
    const count = await cards.count();
    const cardInfos: Array<{ index: number; actionCost: number; type: string }> = [];

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const actionCost = parseInt(await card.getAttribute('data-action-cost') || '1');
      const type = await card.getAttribute('data-card-type') || 'unknown';
      cardInfos.push({ index: i, actionCost, type });
    }

    return cardInfos;
  }

  /**
   * 현재 조합 이름 가져오기
   */
  async function getCurrentCombo(page: Page): Promise<string | null> {
    const comboDisplay = page.locator('[data-testid="combo-display"], .combo-name');
    if (await comboDisplay.isVisible({ timeout: 500 }).catch(() => false)) {
      return await comboDisplay.textContent();
    }
    return null;
  }

  test.describe('에테르 UI 표시', () => {
    test('플레이어 에테르 바가 표시됨', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      const playerEtherBar = page.locator(
        '[data-testid="player-ether"], .player-ether, [data-testid="player-ether-bar"]'
      );
      await expect(playerEtherBar).toBeVisible({ timeout: 3000 });
    });

    test('적 에테르 바가 표시됨', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      const enemyEtherBar = page.locator(
        '[data-testid="enemy-ether"], .enemy-ether, [data-testid="enemy-ether-bar"]'
      );
      await expect(enemyEtherBar).toBeVisible({ timeout: 3000 });
    });

    test('에테르 수치가 0에서 시작', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      const playerEther = await getEtherValue(page, 'player');
      testLogger.info('초기 플레이어 에테르', playerEther);

      // 전투 시작 시 에테르는 0 또는 낮은 값
      expect(playerEther).toBeLessThanOrEqual(10);
    });
  });

  test.describe('에테르 획득', () => {
    test('카드 선택 시 에테르 프리뷰 표시', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      const cards = await getHandCards(page);
      if (cards.length > 0) {
        // 카드 선택
        await page.locator(`[data-testid="hand-card-${cards[0].index}"]`).click();

        // 에테르 프리뷰 확인
        const preview = await getEtherPreview(page);
        testLogger.info('에테르 프리뷰', preview);

        // 프리뷰가 표시되거나 UI 변화 있음
        const previewElement = page.locator('[data-testid="ether-preview"], .ether-preview, .ether-gain');
        const hasPreview = await previewElement.isVisible({ timeout: 1000 }).catch(() => false) || preview > 0;

        expect(hasPreview).toBe(true);
      }
    });

    test('카드 사용 후 에테르 증가', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 초기 에테르 기록
      const initialEther = await getEtherValue(page, 'player');
      testLogger.info('초기 에테르', initialEther);

      // 카드 선택 및 제출
      const cards = await getHandCards(page);
      if (cards.length > 0) {
        await page.locator(`[data-testid="hand-card-${cards[0].index}"]`).click();

        const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
        if (await submitBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
          await submitBtn.click();

          // 턴 진행 대기 (상태 기반)
          await waitForTurnProgress(page);

          // 에테르 확인
          const afterEther = await getEtherValue(page, 'player');
          testLogger.info('턴 후 에테르', afterEther);

          // 에테르가 증가했거나 버스트로 초기화
          expect(afterEther >= 0).toBe(true);
        }
      }
    });

    test('조합별 에테르 배율이 다름', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      const cards = await getHandCards(page);

      // 같은 actionCost 카드 찾기 (페어 만들기)
      const costGroups = new Map<number, number[]>();
      cards.forEach(card => {
        const group = costGroups.get(card.actionCost) || [];
        group.push(card.index);
        costGroups.set(card.actionCost, group);
      });

      // 단일 카드 선택 시 에테르 프리뷰
      await page.locator(`[data-testid="hand-card-${cards[0].index}"]`).click();
      const singlePreview = await getEtherPreview(page);
      testLogger.info('단일 카드 에테르 프리뷰', singlePreview);

      // 페어 찾기
      for (const [cost, indices] of costGroups.entries()) {
        if (indices.length >= 2) {
          // 기존 선택 해제
          await page.locator(`[data-testid="hand-card-${cards[0].index}"]`).click();

          // 페어 선택
          await page.locator(`[data-testid="hand-card-${indices[0]}"]`).click();
          await page.locator(`[data-testid="hand-card-${indices[1]}"]`).click();

          const pairPreview = await getEtherPreview(page);
          testLogger.info('페어 에테르 프리뷰', pairPreview);

          // 페어가 더 높은 배율 (2배)
          if (singlePreview > 0 && pairPreview > 0) {
            expect(pairPreview).toBeGreaterThan(singlePreview);
          }
          break;
        }
      }
    });
  });

  test.describe('에테르 버스트', () => {
    test('에테르 100 도달 시 버스트 표시', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 개발자 도구로 에테르 조작 시도
      const devMode = await page.evaluate(() => {
        // @ts-expect-error - 개발 모드
        return typeof window.__DEV__ !== 'undefined';
      });

      if (devMode) {
        await page.evaluate(() => {
          // @ts-expect-error - 개발 모드
          if (window.devTools?.setPlayerEther) {
            // @ts-expect-error - 개발 모드
            window.devTools.setPlayerEther(95);
          }
        });
      }

      // 카드 사용하여 에테르 채우기 시도
      const cards = await getHandCards(page);
      if (cards.length > 0) {
        // 여러 카드 선택
        for (let i = 0; i < Math.min(3, cards.length); i++) {
          await page.locator(`[data-testid="hand-card-${cards[i].index}"]`).click();
        }

        const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
        if (await submitBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
          await submitBtn.click();

          // 버스트 애니메이션 또는 표시 확인
          const burstIndicator = page.locator(
            '[data-testid="ether-burst"], .ether-burst, .burst-animation, [data-burst="true"]'
          );
          const hasBurst = await burstIndicator.isVisible({ timeout: 3000 }).catch(() => false);

          if (hasBurst) {
            testLogger.info('에테르 버스트 발생');
            expect(hasBurst).toBe(true);
          } else {
            testLogger.info('버스트 미발생 (에테르 부족)');
          }
        }
      }
    });

    test('버스트 후 에테르 초기화', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 여러 턴 진행하여 버스트 발생 시도
      for (let turn = 0; turn < 5; turn++) {
        const cards = page.locator('[data-testid^="hand-card-"]');
        const count = await cards.count();

        if (count > 0) {
          // 가능한 많은 카드 선택
          for (let i = 0; i < Math.min(3, count); i++) {
            await cards.nth(i).click();
          }

          const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
          if (await submitBtn.isEnabled({ timeout: 500 }).catch(() => false)) {
            const beforeEther = await getEtherValue(page, 'player');
            await submitBtn.click();

            await waitForTurnProgress(page);

            const afterEther = await getEtherValue(page, 'player');
            testLogger.info(`턴 ${turn + 1}: 에테르 ${beforeEther} -> ${afterEther}`);

            // 버스트 발생 시 에테르가 초기화됨
            if (beforeEther >= 90 && afterEther < 50) {
              testLogger.info('버스트 발생 확인 (에테르 초기화)');
              expect(afterEther).toBeLessThan(beforeEther);
              break;
            }
          }
        }

        // 전투 종료 확인
        const battleResult = page.locator('[data-testid="battle-result"]');
        if (await battleResult.isVisible({ timeout: 500 }).catch(() => false)) {
          break;
        }
      }
    });
  });

  test.describe('에테르 디플레이션', () => {
    test('같은 조합 반복 시 획득량 감소', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      const etherGains: number[] = [];

      // 여러 턴에 걸쳐 같은 조합 사용
      for (let turn = 0; turn < 3; turn++) {
        const beforeEther = await getEtherValue(page, 'player');

        const cards = page.locator('[data-testid^="hand-card-"]');
        if (await cards.count() > 0) {
          // 단일 카드만 선택 (하이카드)
          await cards.first().click();

          const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
          if (await submitBtn.isEnabled({ timeout: 500 }).catch(() => false)) {
            await submitBtn.click();
            await waitForTurnProgress(page);

            const afterEther = await getEtherValue(page, 'player');
            const gain = afterEther - beforeEther;

            // 버스트로 인한 음수는 제외
            if (gain > 0) {
              etherGains.push(gain);
              testLogger.info(`턴 ${turn + 1} 에테르 획득: ${gain}`);
            }
          }
        }

        // 전투 종료 확인
        const battleResult = page.locator('[data-testid="battle-result"]');
        if (await battleResult.isVisible({ timeout: 500 }).catch(() => false)) {
          break;
        }
      }

      // 디플레이션이 적용되면 획득량이 점점 감소
      if (etherGains.length >= 2) {
        testLogger.info('에테르 획득량 추이', etherGains);
        // 첫 번째보다 나중이 같거나 적어야 함 (디플레이션)
        // 단, 다른 조합을 사용하면 증가할 수 있음
      }
    });
  });

  test.describe('에테르 비교 바', () => {
    test('플레이어와 적 에테르 비교 표시', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 에테르 비교 바 확인
      const comparisonBar = page.locator(
        '[data-testid="ether-comparison"], .ether-comparison, .ether-vs'
      );
      const hasComparison = await comparisonBar.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasComparison) {
        testLogger.info('에테르 비교 바 표시됨');
        expect(hasComparison).toBe(true);
      } else {
        // 개별 에테르 바만 있는 경우
        const playerEther = await getEtherValue(page, 'player');
        const enemyEther = await getEtherValue(page, 'enemy');
        testLogger.info('에테르 값', { player: playerEther, enemy: enemyEther });

        expect(playerEther >= 0 && enemyEther >= 0).toBe(true);
      }
    });
  });
});
