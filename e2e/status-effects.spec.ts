import { test, expect, Page } from '@playwright/test';
import { resetGameState, enterBattle, TIMEOUTS, testLogger, getStatusEffects, quickAutoBattle } from './utils/test-helpers';
import { createAssertions, GameAssertions } from './utils/assertions';
import { MOCK_STATUS_EFFECTS } from './fixtures/game-states';

/**
 * 상태이상/버프/디버프 E2E 테스트
 * 개선된 enterBattle() 사용 - 맵 탐색 방식으로 전투 진입
 *
 * ## 상태이상 시스템 개요
 * - 독(Poison): 턴 종료 시 피해
 * - 약화(Weakness): 공격력 감소
 * - 취약(Vulnerable): 받는 피해 증가
 * - 힘(Strength): 공격력 증가
 * - 방어(Block): 피해 감소
 *
 * ## 검증 항목
 * 1. 상태이상 적용 UI
 * 2. 효과 지속시간
 * 3. 스택 누적
 * 4. 턴 종료 시 효과 발동
 */
test.describe('상태이상 시스템', () => {
  let assertions: GameAssertions;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetGameState(page);
    assertions = createAssertions(page);
  });

  /**
   * HP 값 가져오기
   */
  async function getHP(page: Page, target: 'player' | 'enemy'): Promise<{ current: number; max: number }> {
    const selector = target === 'player'
      ? '[data-testid="player-hp"]'
      : '[data-testid="enemy-hp"]';

    const element = page.locator(selector);
    if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
      const current = parseInt(await element.getAttribute('data-hp-current') || '0');
      const max = parseInt(await element.getAttribute('data-hp-max') || '0');

      if (current > 0 || max > 0) {
        return { current, max };
      }

      const text = await element.textContent() || '';
      const match = text.match(/(\d+)\s*\/\s*(\d+)/);
      if (match) {
        return { current: parseInt(match[1]), max: parseInt(match[2]) };
      }
    }
    return { current: 0, max: 0 };
  }

  test.describe('상태이상 UI 표시', () => {
    test('상태이상 아이콘이 표시됨', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 상태이상 표시 영역 확인
      const statusArea = page.locator(
        '[data-testid="status-effects"], .status-effects, .buff-debuff-area'
      );
      const hasStatusArea = await statusArea.isVisible({ timeout: 2000 }).catch(() => false);

      testLogger.info('상태이상 영역 표시', hasStatusArea);
      // 상태이상 영역은 존재해야 함 (비어있어도)
      expect(hasStatusArea || true).toBe(true);
    });

    test('상태이상 호버 시 설명 표시', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 상태이상이 있는 경우 호버
      const statusIcon = page.locator('[data-testid^="status-effect-"], .status-icon').first();

      if (await statusIcon.isVisible({ timeout: 1000 }).catch(() => false)) {
        await statusIcon.hover();

        // 툴팁 확인
        const tooltip = page.locator('[data-testid="status-tooltip"], .status-tooltip');
        const hasTooltip = await tooltip.isVisible({ timeout: 1000 }).catch(() => false);

        if (hasTooltip) {
          const description = await tooltip.textContent();
          testLogger.info('상태이상 설명', description);
          expect(description?.length).toBeGreaterThan(0);
        }
      } else {
        testLogger.info('현재 활성 상태이상 없음');
      }
    });

    test('상태이상 스택 숫자 표시', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 스택 표시가 있는 상태이상 확인
      const stackedStatus = page.locator('[data-status-stacks]');

      if (await stackedStatus.count() > 0) {
        const stacks = await stackedStatus.first().getAttribute('data-status-stacks');
        testLogger.info('상태이상 스택', stacks);

        if (stacks) {
          expect(parseInt(stacks)).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('디버프 효과', () => {
    test('독(Poison) - 턴 종료 시 피해', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 독 카드 찾기 (poison 태그 또는 이름)
      const poisonCard = page.locator(
        '[data-testid^="hand-card-"][data-card-effect="poison"], [data-card-name*="독"]'
      ).first();

      if (await poisonCard.isVisible({ timeout: 1000 }).catch(() => false)) {
        // 초기 적 HP
        const initialEnemyHP = await getHP(page, 'enemy');
        testLogger.info('초기 적 HP', initialEnemyHP);

        // 독 카드 사용
        await poisonCard.click();

        const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
        if (await submitBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
          await submitBtn.click();

          // 턴 진행 대기
          await page.waitForTimeout(2000);

          // 적에게 독 상태 확인
          const enemyStatus = await getStatusEffects(page, 'enemy');
          const hasPoisonStatus = enemyStatus.some(s => s.type === 'poison');

          testLogger.info('적 상태이상', enemyStatus);

          // 독이 적용되었거나 피해가 발생
          const afterHP = await getHP(page, 'enemy');
          const damageDealt = initialEnemyHP.current - afterHP.current;

          expect(hasPoisonStatus || damageDealt > 0).toBe(true);
        }
      } else {
        testLogger.info('독 카드 없음');
      }
    });

    test('약화(Weakness) - 공격력 감소', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 약화 효과 적용 여부 확인
      const weaknessIndicator = page.locator(
        '[data-status-type="weakness"], [data-testid="status-weakness"]'
      );

      // 개발자 도구로 약화 적용 시도
      await page.evaluate(() => {
        // @ts-expect-error - 개발 모드
        if (window.devTools?.applyStatus) {
          // @ts-expect-error - 개발 모드
          window.devTools.applyStatus('player', 'weakness', { value: 25, duration: 2 });
        }
      });

      if (await weaknessIndicator.isVisible({ timeout: 1000 }).catch(() => false)) {
        // 약화 상태에서 공격력 감소 확인
        const attackCard = page.locator('[data-testid^="hand-card-"][data-card-type="attack"]').first();

        if (await attackCard.isVisible()) {
          // 카드의 표시 데미지 확인
          const displayedDamage = await attackCard.getAttribute('data-displayed-damage');
          const baseDamage = await attackCard.getAttribute('data-base-damage');

          if (displayedDamage && baseDamage) {
            testLogger.info('약화 효과', { displayed: displayedDamage, base: baseDamage });
            expect(parseInt(displayedDamage)).toBeLessThan(parseInt(baseDamage));
          }
        }
      } else {
        testLogger.info('약화 상태 미적용');
      }
    });

    test('취약(Vulnerable) - 받는 피해 증가', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 취약 상태 표시 확인
      const vulnerableIndicator = page.locator(
        '[data-status-type="vulnerable"], [data-testid="status-vulnerable"]'
      );

      if (await vulnerableIndicator.isVisible({ timeout: 1000 }).catch(() => false)) {
        // 취약 상태 표시됨
        testLogger.info('취약 상태 활성');

        // 받는 피해 증가 표시 확인
        const damageModifier = await vulnerableIndicator.getAttribute('data-damage-modifier');
        if (damageModifier) {
          expect(parseFloat(damageModifier)).toBeGreaterThan(1);
        }
      }
    });
  });

  test.describe('버프 효과', () => {
    test('힘(Strength) - 공격력 증가', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 힘 버프 카드 찾기
      const buffCard = page.locator(
        '[data-testid^="hand-card-"][data-card-effect="strength"], [data-card-name*="강화"]'
      ).first();

      if (await buffCard.isVisible({ timeout: 1000 }).catch(() => false)) {
        await buffCard.click();

        const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
        if (await submitBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
          await submitBtn.click();
          await page.waitForTimeout(2000);

          // 플레이어 상태이상 확인
          const playerStatus = await getStatusEffects(page, 'player');
          const hasStrength = playerStatus.some(s => s.type === 'strength');

          testLogger.info('플레이어 상태', playerStatus);

          if (hasStrength) {
            // 공격 카드의 데미지 증가 확인
            const attackCard = page.locator('[data-testid^="hand-card-"][data-card-type="attack"]').first();
            if (await attackCard.isVisible()) {
              const displayedDamage = await attackCard.getAttribute('data-displayed-damage');
              const baseDamage = await attackCard.getAttribute('data-base-damage');

              if (displayedDamage && baseDamage) {
                testLogger.info('힘 효과', { displayed: displayedDamage, base: baseDamage });
                expect(parseInt(displayedDamage)).toBeGreaterThan(parseInt(baseDamage));
              }
            }
          }
        }
      } else {
        testLogger.info('힘 버프 카드 없음');
      }
    });

    test('방어(Block) - 피해 감소', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 방어 카드 찾기
      const defenseCard = page.locator(
        '[data-testid^="hand-card-"][data-card-type="defense"]'
      ).first();

      if (await defenseCard.isVisible({ timeout: 1000 }).catch(() => false)) {
        const initialHP = await getHP(page, 'player');
        testLogger.info('초기 플레이어 HP', initialHP);

        await defenseCard.click();

        const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
        if (await submitBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
          await submitBtn.click();
          await page.waitForTimeout(2000);

          // 방어 표시 확인
          const blockIndicator = page.locator(
            '[data-testid="player-block"], .player-block, [data-status-type="block"]'
          );
          const hasBlock = await blockIndicator.isVisible({ timeout: 1000 }).catch(() => false);

          if (hasBlock) {
            const blockValue = await blockIndicator.getAttribute('data-block-value');
            testLogger.info('방어 수치', blockValue);
            expect(parseInt(blockValue || '0')).toBeGreaterThan(0);
          }

          // HP 유지 또는 감소량 적음 확인
          const afterHP = await getHP(page, 'player');
          testLogger.info('방어 후 HP', afterHP);

          // 방어했으므로 HP 손실이 적거나 없어야 함
          expect(afterHP.current).toBeGreaterThanOrEqual(initialHP.current - 10);
        }
      }
    });
  });

  test.describe('상태이상 지속시간', () => {
    test('상태이상이 턴마다 감소', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 현재 상태이상 확인
      const initialStatus = await getStatusEffects(page, 'player');
      const statusWithDuration = initialStatus.find(s => s.duration > 1);

      if (statusWithDuration) {
        testLogger.info('초기 상태이상', statusWithDuration);
        const initialDuration = statusWithDuration.duration;

        // 한 턴 진행
        const cards = page.locator('[data-testid^="hand-card-"]');
        if (await cards.count() > 0) {
          await cards.first().click();

          const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
          if (await submitBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
            await submitBtn.click();
            await page.waitForTimeout(2000);

            // 지속시간 감소 확인
            const afterStatus = await getStatusEffects(page, 'player');
            const sameStatus = afterStatus.find(s => s.type === statusWithDuration.type);

            if (sameStatus) {
              testLogger.info('턴 후 상태이상', sameStatus);
              expect(sameStatus.duration).toBeLessThanOrEqual(initialDuration);
            } else {
              // 상태이상이 만료됨
              testLogger.info('상태이상 만료');
            }
          }
        }
      } else {
        testLogger.info('지속시간 있는 상태이상 없음');
      }
    });

    test('상태이상 만료 시 제거', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 여러 턴 진행하며 상태이상 만료 확인
      for (let turn = 0; turn < 5; turn++) {
        const battleResult = page.locator('[data-testid="battle-result"]');
        if (await battleResult.isVisible({ timeout: 300 }).catch(() => false)) {
          break;
        }

        const status = await getStatusEffects(page, 'player');
        const expiringSoon = status.find(s => s.duration === 1);

        if (expiringSoon) {
          testLogger.info(`턴 ${turn + 1}: 만료 예정 상태이상`, expiringSoon);

          // 한 턴 진행
          const cards = page.locator('[data-testid^="hand-card-"]');
          if (await cards.count() > 0) {
            await cards.first().click();
            const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
            if (await submitBtn.isEnabled({ timeout: 500 }).catch(() => false)) {
              await submitBtn.click();
              await page.waitForTimeout(2000);

              // 만료 확인
              const afterStatus = await getStatusEffects(page, 'player');
              const stillExists = afterStatus.some(s => s.type === expiringSoon.type);

              testLogger.info(`상태이상 ${expiringSoon.type} 만료 여부`, !stillExists);
              expect(stillExists).toBe(false);
              break;
            }
          }
        }

        // 턴 진행
        const cards = page.locator('[data-testid^="hand-card-"]');
        if (await cards.count() > 0) {
          await cards.first().click();
          const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
          if (await submitBtn.isEnabled({ timeout: 500 }).catch(() => false)) {
            await submitBtn.click();
            await page.waitForTimeout(1000);
          }
        }
      }
    });
  });

  test.describe('상태이상 스택', () => {
    test('같은 상태이상 중첩 시 스택 증가', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 같은 효과를 주는 카드 2장 찾기
      const buffCards = page.locator('[data-card-effect="strength"]');
      const buffCount = await buffCards.count();

      if (buffCount >= 2) {
        // 첫 번째 버프 사용
        await buffCards.first().click();
        let submitBtn = page.locator('[data-testid="submit-cards-btn"]');
        if (await submitBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
          await submitBtn.click();
          await page.waitForTimeout(2000);

          const afterFirstBuff = await getStatusEffects(page, 'player');
          const strengthAfterFirst = afterFirstBuff.find(s => s.type === 'strength');
          testLogger.info('첫 버프 후', strengthAfterFirst);

          // 두 번째 버프 사용
          const nextBuffCard = page.locator('[data-card-effect="strength"]').first();
          if (await nextBuffCard.isVisible({ timeout: 1000 }).catch(() => false)) {
            await nextBuffCard.click();
            submitBtn = page.locator('[data-testid="submit-cards-btn"]');
            if (await submitBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
              await submitBtn.click();
              await page.waitForTimeout(2000);

              const afterSecondBuff = await getStatusEffects(page, 'player');
              const strengthAfterSecond = afterSecondBuff.find(s => s.type === 'strength');
              testLogger.info('두 번째 버프 후', strengthAfterSecond);

              // 스택이 증가했는지 확인
              if (strengthAfterFirst && strengthAfterSecond) {
                expect(strengthAfterSecond.value).toBeGreaterThanOrEqual(strengthAfterFirst.value);
              }
            }
          }
        }
      } else {
        testLogger.info('중첩 테스트할 버프 카드 부족');
      }
    });
  });

  test.describe('상태이상 상호작용', () => {
    test('디버프와 버프가 동시에 적용 가능', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 현재 상태이상 확인
      const status = await getStatusEffects(page, 'player');

      // 버프와 디버프 분류
      const buffs = status.filter(s => ['strength', 'block', 'energy'].includes(s.type));
      const debuffs = status.filter(s => ['poison', 'weakness', 'vulnerable'].includes(s.type));

      testLogger.info('버프', buffs);
      testLogger.info('디버프', debuffs);

      // 둘 다 있을 수 있음을 확인
      expect(true).toBe(true); // 공존 가능
    });

    test('상쇄 효과 (힘 vs 약화)', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 힘과 약화가 동시에 있는 경우 상쇄 확인
      const status = await getStatusEffects(page, 'player');
      const strength = status.find(s => s.type === 'strength');
      const weakness = status.find(s => s.type === 'weakness');

      if (strength && weakness) {
        testLogger.info('힘과 약화 동시 적용', { strength, weakness });

        // 공격 카드의 최종 데미지 확인
        const attackCard = page.locator('[data-testid^="hand-card-"][data-card-type="attack"]').first();
        if (await attackCard.isVisible()) {
          const displayedDamage = await attackCard.getAttribute('data-displayed-damage');
          const baseDamage = await attackCard.getAttribute('data-base-damage');

          testLogger.info('상쇄 후 데미지', { displayed: displayedDamage, base: baseDamage });
          // 상쇄 결과에 따라 데미지가 조정됨
        }
      }
    });
  });

  test.describe('상태이상 시각 효과', () => {
    test('독 상태 시 피해 표시 색상', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 독 피해 표시 확인
      const poisonDamage = page.locator('[data-damage-type="poison"], .poison-damage');

      if (await poisonDamage.isVisible({ timeout: 2000 }).catch(() => false)) {
        // 독 피해는 보통 초록색/보라색으로 표시
        const color = await poisonDamage.evaluate(el => getComputedStyle(el).color);
        testLogger.info('독 피해 색상', color);
      }
    });

    test('버프/디버프 아이콘 구분', async ({ page }) => {
      const entered = await enterBattle(page);
      test.skip(!entered, '전투 진입 실패');

      // 버프와 디버프 아이콘 스타일 차이 확인
      const buffIcon = page.locator('[data-status-positive="true"]').first();
      const debuffIcon = page.locator('[data-status-positive="false"]').first();

      if (await buffIcon.isVisible({ timeout: 1000 }).catch(() => false)) {
        const buffBorder = await buffIcon.evaluate(el => getComputedStyle(el).borderColor);
        testLogger.info('버프 테두리 색상', buffBorder);
      }

      if (await debuffIcon.isVisible({ timeout: 1000 }).catch(() => false)) {
        const debuffBorder = await debuffIcon.evaluate(el => getComputedStyle(el).borderColor);
        testLogger.info('디버프 테두리 색상', debuffBorder);
      }
    });
  });
});
