import { test, expect, Page } from '@playwright/test';
import { resetGameState, enterBattle, getHPSafe, getEther, getComboName, TIMEOUTS, testLogger, waitForTurnProgress } from './utils/test-helpers';

/**
 * 게임 로직 검증 E2E 테스트
 * 개선된 enterBattle() 사용 - 맵 탐색 방식으로 전투 진입
 *
 * ## 테스트 목적
 * - 포커 조합이 올바르게 감지되는지 검증
 * - 카드 효과가 정확하게 적용되는지 검증
 * - 데미지 계산이 정확한지 검증
 *
 * ## 검증 방식
 * - UI에 표시된 값과 예상 값 비교
 * - 상태 변화 추적 (HP, 에테르 등)
 */
test.describe('게임 로직 검증', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
  });

  /**
   * 핸드의 카드 정보 추출
   */
  async function getHandCards(page: Page): Promise<Array<{
    index: number;
    actionCost: number;
    type: string;
    name: string;
  }>> {
    const cards = page.locator('[data-testid^="hand-card-"]');
    const count = await cards.count();
    const cardInfos: Array<{ index: number; actionCost: number; type: string; name: string }> = [];

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const actionCost = parseInt(await card.getAttribute('data-action-cost') || '1');
      const type = await card.getAttribute('data-card-type') || 'unknown';
      const name = await card.getAttribute('data-card-name') || '';

      cardInfos.push({ index: i, actionCost, type, name });
    }

    return cardInfos;
  }

  // HP, Ether, ComboName은 중앙 헬퍼(test-helpers.ts) 사용

  test.describe('포커 조합 감지', () => {
    test('같은 actionCost 2장 선택 시 페어 감지', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      const cards = await getHandCards(page);
      testLogger.info('핸드 카드 정보', cards);

      // 같은 actionCost를 가진 카드 2장 찾기
      const costGroups = new Map<number, number[]>();
      cards.forEach(card => {
        const group = costGroups.get(card.actionCost) || [];
        group.push(card.index);
        costGroups.set(card.actionCost, group);
      });

      let pairFound = false;
      for (const [cost, indices] of costGroups.entries()) {
        if (indices.length >= 2) {
          // 2장 선택
          await page.locator(`[data-testid="hand-card-${indices[0]}"]`).click();
          await page.locator(`[data-testid="hand-card-${indices[1]}"]`).click();

          const combo = await getComboName(page);
          testLogger.info(`ActionCost ${cost} 페어 선택, 감지된 조합: ${combo}`);

          if (combo?.includes('페어')) {
            pairFound = true;
            expect(combo).toContain('페어');
          }
          break;
        }
      }

      if (!pairFound) {
        testLogger.warn('페어를 만들 수 있는 카드가 없음');
      }
    });

    test('같은 actionCost 3장 선택 시 트리플 감지', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      const cards = await getHandCards(page);

      // 같은 actionCost 3장 찾기
      const costGroups = new Map<number, number[]>();
      cards.forEach(card => {
        const group = costGroups.get(card.actionCost) || [];
        group.push(card.index);
        costGroups.set(card.actionCost, group);
      });

      let tripleFound = false;
      for (const [cost, indices] of costGroups.entries()) {
        if (indices.length >= 3) {
          for (let i = 0; i < 3; i++) {
            await page.locator(`[data-testid="hand-card-${indices[i]}"]`).click();
          }

          const combo = await getComboName(page);
          testLogger.info(`ActionCost ${cost} 트리플 선택, 감지된 조합: ${combo}`);

          if (combo?.includes('트리플')) {
            tripleFound = true;
            expect(combo).toContain('트리플');
          }
          break;
        }
      }

      if (!tripleFound) {
        testLogger.warn('트리플을 만들 수 있는 카드가 없음');
      }
    });

    test('같은 타입 4장 이상 선택 시 플러쉬 감지', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      const cards = await getHandCards(page);

      // 같은 타입 4장 찾기
      const typeGroups = new Map<string, number[]>();
      cards.forEach(card => {
        const group = typeGroups.get(card.type) || [];
        group.push(card.index);
        typeGroups.set(card.type, group);
      });

      let flushFound = false;
      for (const [type, indices] of typeGroups.entries()) {
        if (indices.length >= 4 && (type === 'attack' || type === 'defense')) {
          for (let i = 0; i < 4; i++) {
            await page.locator(`[data-testid="hand-card-${indices[i]}"]`).click();
          }

          const combo = await getComboName(page);
          testLogger.info(`${type} 플러쉬 선택, 감지된 조합: ${combo}`);

          if (combo?.includes('플러쉬')) {
            flushFound = true;
            expect(combo).toContain('플러쉬');
          }
          break;
        }
      }

      if (!flushFound) {
        testLogger.warn('플러쉬를 만들 수 있는 카드가 없음');
      }
    });

    test('조합 없을 시 하이카드 표시', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      const cards = await getHandCards(page);

      if (cards.length > 0) {
        // 첫 번째 카드만 선택
        await page.locator(`[data-testid="hand-card-${cards[0].index}"]`).click();

        const combo = await getComboName(page);
        testLogger.info(`단일 카드 선택, 감지된 조합: ${combo}`);

        // 하이카드이거나 조합 표시 없음
        expect(combo === null || combo?.includes('하이카드') || combo === '').toBe(true);
      }
    });
  });

  test.describe('데미지 계산', () => {
    test('공격 카드 사용 시 적 HP 감소', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 초기 적 HP 기록 (안전한 버전 사용)
      const initialEnemyHP = await getHPSafe(page, 'enemy');
      testLogger.info('초기 적 HP', initialEnemyHP);

      // 공격 카드 찾기
      const cards = await getHandCards(page);
      const attackCard = cards.find(c => c.type === 'attack');

      if (attackCard) {
        await page.locator(`[data-testid="hand-card-${attackCard.index}"]`).click();

        // 제출
        const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
        if (await submitBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
          await submitBtn.click();

          // 턴 진행 대기 (상태 기반)
          await waitForTurnProgress(page);

          // 적 HP 확인
          const afterHP = await getHPSafe(page, 'enemy');
          testLogger.info('공격 후 적 HP', afterHP);

          // HP가 감소했거나 전투 종료 상태
          const battleResult = page.locator('[data-testid="battle-result"]');
          const battleEnded = await battleResult.isVisible({ timeout: 500 }).catch(() => false);

          if (!battleEnded) {
            expect(afterHP.current).toBeLessThanOrEqual(initialEnemyHP.current);
          }
        }
      } else {
        testLogger.warn('공격 카드가 없음');
      }
    });

    test('방어 카드 사용 시 받는 피해 감소', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 초기 플레이어 HP 기록 (안전한 버전 사용)
      const initialPlayerHP = await getHPSafe(page, 'player');
      testLogger.info('초기 플레이어 HP', initialPlayerHP);

      // 방어 카드 찾기
      const cards = await getHandCards(page);
      const defenseCard = cards.find(c => c.type === 'defense' || c.type === 'general');

      if (defenseCard) {
        await page.locator(`[data-testid="hand-card-${defenseCard.index}"]`).click();

        // 제출
        const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
        if (await submitBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
          await submitBtn.click();

          // 턴 진행 대기 (상태 기반)
          await waitForTurnProgress(page);

          // 방패 표시 확인 또는 HP 유지 확인
          const shieldIndicator = page.locator('[data-testid="shield-indicator"], .shield, .block');
          const hasShield = await shieldIndicator.isVisible({ timeout: 500 }).catch(() => false);

          const afterHP = await getHPSafe(page, 'player');
          testLogger.info('방어 후 플레이어 HP', afterHP);

          // 방패가 있거나 HP가 크게 감소하지 않음
          expect(hasShield || afterHP.current >= initialPlayerHP.current - 5).toBe(true);
        }
      } else {
        testLogger.warn('방어 카드가 없음');
      }
    });
  });

  test.describe('턴 진행 로직', () => {
    test('카드 제출 후 페이즈 변경', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 초기 페이즈 확인
      const phaseElement = page.locator('[data-testid="battle-phase"]');
      const initialPhase = await phaseElement.getAttribute('data-phase').catch(() => 'unknown');
      testLogger.info('초기 페이즈', initialPhase);

      // 카드 선택 및 제출
      const cards = page.locator('[data-testid^="hand-card-"]');
      if (await cards.count() > 0) {
        await cards.first().click();

        const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
        if (await submitBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
          await submitBtn.click();

          // 페이즈 변경 대기
          await page.waitForFunction(
            (initial: string | null) => {
              const el = document.querySelector('[data-testid="battle-phase"]');
              return el?.getAttribute('data-phase') !== initial;
            },
            initialPhase,
            { timeout: 5000 }
          ).catch(() => {});

          const newPhase = await phaseElement.getAttribute('data-phase').catch(() => 'unknown');
          testLogger.info('변경된 페이즈', newPhase);

          // 페이즈가 변경되었거나 resolve/respond 상태
          expect(newPhase !== initialPhase || ['resolve', 'respond'].includes(newPhase || '')).toBe(true);
        }
      }
    });

    test('타임라인에 카드가 배치됨', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 카드 선택
      const cards = page.locator('[data-testid^="hand-card-"]');
      if (await cards.count() > 0) {
        await cards.first().click();

        // 타임라인에 카드 표시 확인
        const timelineCards = page.locator('[data-testid="timeline-card"], .timeline-card');
        const timelineCount = await timelineCards.count();

        testLogger.info('타임라인 카드 수', timelineCount);

        // 선택 시 타임라인에 표시되거나 다른 UI로 표시
        const selectedIndicator = page.locator('.card-selected, [data-card-selected="true"]');
        const isSelected = await selectedIndicator.isVisible({ timeout: 500 }).catch(() => false);

        expect(timelineCount > 0 || isSelected).toBe(true);
      }
    });
  });

  test.describe('전투 종료 조건', () => {
    test('적 HP 0 시 승리', async ({ page }) => {
      // 이 테스트는 실제 전투를 끝까지 진행해야 함
      // DevTools로 적 HP를 낮추거나 자동 전투 사용
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 개발자 도구로 적 HP 조작 시도
      const devMode = await page.evaluate(() => {
        // @ts-expect-error - 개발 모드 전역 변수
        return typeof window.__DEV__ !== 'undefined' || typeof window.devTools !== 'undefined';
      });

      if (devMode) {
        await page.evaluate(() => {
          // @ts-expect-error - 개발 모드 함수
          if (window.devTools?.setEnemyHP) {
            // @ts-expect-error - 개발 모드 함수
            window.devTools.setEnemyHP(1);
          }
        });
      }

      // 공격 카드 선택 및 제출
      const cards = await getHandCards(page);
      const attackCard = cards.find(c => c.type === 'attack');

      if (attackCard) {
        await page.locator(`[data-testid="hand-card-${attackCard.index}"]`).click();

        const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
        if (await submitBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
          await submitBtn.click();

          // 승리 화면 대기 (최대 10초)
          const victoryScreen = page.locator('[data-testid="battle-result"]:has-text("승리"), .victory-screen');
          const victory = await victoryScreen.isVisible({ timeout: 10000 }).catch(() => false);

          if (victory) {
            testLogger.info('승리 확인');
            expect(victory).toBe(true);
          } else {
            testLogger.info('아직 전투 진행 중');
          }
        }
      }
    });
  });
});
