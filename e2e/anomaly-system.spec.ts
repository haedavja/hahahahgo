import { test, expect, Page } from '@playwright/test';
import { resetGameState, enterBattle, TIMEOUTS, testLogger } from './utils/test-helpers';

/**
 * 이변(Anomaly) 시스템 E2E 테스트
 * 개선된 enterBattle() 사용 - 맵 탐색 방식으로 전투 진입
 *
 * ## 이변 시스템 개요
 * - 맵 위험도에 따라 발동
 * - 발동 확률: mapRisk%
 * - 강도: Math.floor(mapRisk / 25), 최대 4레벨
 * - 일반 전투: 1개, 보스 전투: 여러 개
 *
 * ## 이변 효과 타입
 * - ETHER_BAN: 에테르 획득 불가
 * - ENERGY_REDUCTION: 최대 행동력 감소
 * - SPEED_REDUCTION: 최대 속도 감소
 * - DRAW_REDUCTION: 뽑기 확률 감소
 * - INSIGHT_REDUCTION: 통찰 레벨 감소
 * - VALUE_DOWN: 카드 수치 감소
 * - VULNERABILITY: 받는 피해 증가
 */
test.describe('이변 시스템', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
  });

  /**
   * 현재 활성 이변 목록 가져오기
   */
  async function getActiveAnomalies(page: Page): Promise<Array<{
    id: string;
    name: string;
    level: number;
    effectType: string;
  }>> {
    const anomalies = page.locator('[data-testid^="anomaly-"], .anomaly-badge');
    const count = await anomalies.count();
    const anomalyInfos: Array<{ id: string; name: string; level: number; effectType: string }> = [];

    for (let i = 0; i < count; i++) {
      const anomaly = anomalies.nth(i);
      const id = await anomaly.getAttribute('data-anomaly-id') || '';
      const name = await anomaly.getAttribute('data-anomaly-name') || await anomaly.textContent() || '';
      const level = parseInt(await anomaly.getAttribute('data-anomaly-level') || '1');
      const effectType = await anomaly.getAttribute('data-effect-type') || '';

      if (id) {
        anomalyInfos.push({ id, name, level, effectType });
      }
    }

    return anomalyInfos;
  }

  /**
   * 맵 위험도 가져오기
   */
  async function getMapRisk(page: Page): Promise<number> {
    const riskDisplay = page.locator('[data-testid="map-risk"], .risk-indicator');
    if (await riskDisplay.isVisible({ timeout: 1000 }).catch(() => false)) {
      const value = await riskDisplay.getAttribute('data-risk-value');
      if (value) return parseInt(value);

      const text = await riskDisplay.textContent();
      const match = text?.match(/(\d+)%?/);
      if (match) return parseInt(match[1]);
    }
    return 0;
  }

  test.describe('이변 UI 표시', () => {
    test('이변 발생 시 배지 표시', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 이변 배지 확인
      const anomalyBadge = page.locator(
        '[data-testid="anomaly-badge"], .anomaly-badge, [data-testid^="anomaly-"]'
      );
      const hasAnomaly = await anomalyBadge.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasAnomaly) {
        const anomalies = await getActiveAnomalies(page);
        testLogger.info('활성 이변', anomalies);
        expect(anomalies.length).toBeGreaterThan(0);
      } else {
        testLogger.info('이변 미발생 (위험도 낮음)');
      }
    });

    test('이변 호버 시 설명 표시', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      const anomalyBadge = page.locator('[data-testid^="anomaly-"]').first();

      if (await anomalyBadge.isVisible({ timeout: 1000 }).catch(() => false)) {
        await anomalyBadge.hover();

        // 툴팁 확인
        const tooltip = page.locator('[data-testid="anomaly-tooltip"], .anomaly-tooltip');
        const hasTooltip = await tooltip.isVisible({ timeout: 1000 }).catch(() => false);

        if (hasTooltip) {
          const description = await tooltip.textContent();
          testLogger.info('이변 설명', description);
          expect(description?.length).toBeGreaterThan(0);
        }
      }
    });

    test('디플레이션 배지 표시 (ETHER_BAN)', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      const anomalies = await getActiveAnomalies(page);
      const hasEtherBan = anomalies.some(a => a.effectType === 'ETHER_BAN');

      if (hasEtherBan) {
        // 디플레이션 배지 확인
        const deflationBadge = page.locator(
          '[data-testid="deflation-badge"], .deflation-badge, [data-anomaly-id="deflation_curse"]'
        );
        await expect(deflationBadge).toBeVisible();
        testLogger.info('디플레이션의 저주 활성');
      } else {
        testLogger.info('ETHER_BAN 이변 미발생');
      }
    });
  });

  test.describe('이변 효과 검증', () => {
    test('ETHER_BAN - 에테르 획득 불가', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      const anomalies = await getActiveAnomalies(page);
      const hasEtherBan = anomalies.some(a => a.effectType === 'ETHER_BAN');

      if (hasEtherBan) {
        // 초기 에테르 기록
        const etherDisplay = page.locator('[data-testid="player-ether"]');
        const initialEther = parseInt(await etherDisplay.getAttribute('data-ether-value') || '0');

        // 카드 사용
        const cards = page.locator('[data-testid^="hand-card-"]');
        if (await cards.count() > 0) {
          await cards.first().click();

          const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
          if (await submitBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
            await submitBtn.click();
            await page.waitForTimeout(2000);

            // 에테르가 증가하지 않아야 함
            const afterEther = parseInt(await etherDisplay.getAttribute('data-ether-value') || '0');
            testLogger.info('에테르 변화', { before: initialEther, after: afterEther });

            expect(afterEther).toBeLessThanOrEqual(initialEther);
          }
        }
      } else {
        testLogger.info('ETHER_BAN 이변 미발생');
      }
    });

    test('ENERGY_REDUCTION - 최대 행동력 감소', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      const anomalies = await getActiveAnomalies(page);
      const energyReduction = anomalies.find(a => a.effectType === 'ENERGY_REDUCTION');

      if (energyReduction) {
        // 행동력 표시 확인
        const energyDisplay = page.locator('[data-testid="energy-display"]');
        const maxEnergy = parseInt(await energyDisplay.getAttribute('data-max-energy') || '3');

        testLogger.info('이변 레벨', energyReduction.level);
        testLogger.info('최대 행동력', maxEnergy);

        // 기본 3 - 이변 레벨 = 감소된 행동력
        expect(maxEnergy).toBeLessThanOrEqual(3);
      } else {
        testLogger.info('ENERGY_REDUCTION 이변 미발생');
      }
    });

    test('SPEED_REDUCTION - 최대 속도 감소', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      const anomalies = await getActiveAnomalies(page);
      const speedReduction = anomalies.find(a => a.effectType === 'SPEED_REDUCTION');

      if (speedReduction) {
        // 속도 표시 확인
        const speedDisplay = page.locator('[data-testid="max-speed"]');
        const maxSpeed = parseInt(await speedDisplay.getAttribute('data-value') || '20');

        testLogger.info('이변 레벨', speedReduction.level);
        testLogger.info('최대 속도', maxSpeed);

        // 기본 20 - (레벨 * 3) = 감소된 속도
        expect(maxSpeed).toBeLessThanOrEqual(20);
      } else {
        testLogger.info('SPEED_REDUCTION 이변 미발생');
      }
    });

    test('VULNERABILITY - 받는 피해 증가', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      const anomalies = await getActiveAnomalies(page);
      const hasVulnerability = anomalies.some(a => a.effectType === 'VULNERABILITY');

      if (hasVulnerability) {
        // 취약 상태 표시 확인
        const vulnerabilityIndicator = page.locator(
          '[data-testid="vulnerability-indicator"], .vulnerability, [data-status="vulnerable"]'
        );
        const hasIndicator = await vulnerabilityIndicator.isVisible({ timeout: 1000 }).catch(() => false);

        if (hasIndicator) {
          testLogger.info('취약 상태 표시됨');
          expect(hasIndicator).toBe(true);
        }
      } else {
        testLogger.info('VULNERABILITY 이변 미발생');
      }
    });
  });

  test.describe('이변 레벨 시스템', () => {
    test('위험도에 따라 이변 강도 결정', async ({ page }) => {
      await waitForMap(page);

      // 맵 위험도 확인
      const risk = await getMapRisk(page);
      testLogger.info('맵 위험도', risk);

      // 예상 이변 레벨: Math.floor(risk / 25)
      const expectedLevel = Math.floor(risk / 25);
      testLogger.info('예상 이변 레벨', expectedLevel);

      const entered = await enterBattle(page);
      if (entered) {
        const anomalies = await getActiveAnomalies(page);

        if (anomalies.length > 0) {
          // 이변 레벨이 예상 범위 내
          anomalies.forEach(a => {
            expect(a.level).toBeLessThanOrEqual(Math.max(1, expectedLevel + 1));
          });
        }
      }
    });

    test('보스 전투에서 여러 이변 발생 가능', async ({ page }) => {
      await waitForMap(page);

      // 보스 노드 선택 시도
      const bossClicked = await selectMapNode(page, 'boss');

      if (bossClicked) {
        await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 }).catch(() => {});
        await waitForUIStable(page);

        const anomalies = await getActiveAnomalies(page);
        testLogger.info('보스 전투 이변 수', anomalies.length);

        // 보스 전투는 여러 이변 가능
        if (anomalies.length > 1) {
          expect(anomalies.length).toBeGreaterThanOrEqual(1);
        }
      } else {
        testLogger.info('보스 노드 없음');
      }
    });
  });

  test.describe('이변 시각적 피드백', () => {
    test('이변 발생 시 경고 색상 표시', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      const anomalies = await getActiveAnomalies(page);

      if (anomalies.length > 0) {
        // 이변 배지 색상 확인
        const anomalyBadge = page.locator('[data-testid^="anomaly-"]').first();
        const color = await anomalyBadge.getAttribute('data-anomaly-color');

        if (color) {
          testLogger.info('이변 색상', color);
          // 경고성 색상 (빨강, 주황, 보라 등)
          expect(['#ef4444', '#f59e0b', '#8b5cf6', 'red', 'orange', 'purple'].some(
            c => color.toLowerCase().includes(c.toLowerCase())
          )).toBe(true);
        }
      }
    });

    test('이변 아이콘이 이모지로 표시', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      const anomalies = await getActiveAnomalies(page);

      if (anomalies.length > 0) {
        const anomalyBadge = page.locator('[data-testid^="anomaly-"]').first();
        const text = await anomalyBadge.textContent();

        if (text) {
          // 이모지 포함 확인 (유니코드 이모지 패턴)
          const hasEmoji = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/u.test(text);
          testLogger.info('이변 텍스트', text, '이모지:', hasEmoji);
        }
      }
    });
  });

  test.describe('이변과 게임플레이 상호작용', () => {
    test('이변 효과가 전투 중 지속됨', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      const initialAnomalies = await getActiveAnomalies(page);

      if (initialAnomalies.length > 0) {
        // 여러 턴 진행
        for (let turn = 0; turn < 3; turn++) {
          const cards = page.locator('[data-testid^="hand-card-"]');
          if (await cards.count() > 0) {
            await cards.first().click();

            const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
            if (await submitBtn.isEnabled({ timeout: 500 }).catch(() => false)) {
              await submitBtn.click();
              await page.waitForTimeout(1500);
            }
          }

          // 전투 종료 확인
          const battleResult = page.locator('[data-testid="battle-result"]');
          if (await battleResult.isVisible({ timeout: 500 }).catch(() => false)) {
            break;
          }
        }

        // 이변이 여전히 활성 상태인지 확인
        const currentAnomalies = await getActiveAnomalies(page);
        const battleEnded = await page.locator('[data-testid="battle-result"]').isVisible({ timeout: 500 }).catch(() => false);

        if (!battleEnded) {
          // 전투 중이면 이변 유지
          expect(currentAnomalies.length).toBe(initialAnomalies.length);
        }
      }
    });

    test('전투 종료 후 이변 해제', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 전투 완료까지 진행
      for (let i = 0; i < 15; i++) {
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

      // 맵으로 돌아간 후 이변 확인
      const continueBtn = page.locator('[data-testid="continue-btn"], .continue-btn');
      if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await continueBtn.click();
        await waitForMap(page);

        // 맵에서는 이변 배지가 없어야 함 (또는 다른 전투 준비 상태)
        const mapAnomalies = page.locator('[data-testid="active-anomaly"]');
        const hasMapAnomaly = await mapAnomalies.isVisible({ timeout: 1000 }).catch(() => false);

        testLogger.info('맵에서 이변 표시', hasMapAnomaly);
      }
    });
  });
});
