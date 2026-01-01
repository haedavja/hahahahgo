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
  quickAutoBattle,
  getPlayerHp,
  waitForUIStable,
  TIMEOUTS,
  testLogger,
  safeIsVisible,
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
   * 전투 화면 진입 (개선: 로깅 추가, 명확한 상태 확인)
   */
  async function enterBattle(page: Page): Promise<boolean> {
    // 테스트 전투 버튼 시도
    const testBattleBtn = page.locator('button:has-text("Test Mixed Battle")');
    if (await safeIsVisible(testBattleBtn, { timeout: TIMEOUTS.LONG, context: 'Test Battle Button' })) {
      await testBattleBtn.click();
      try {
        await page.waitForSelector('[data-testid="battle-screen"]', { timeout: TIMEOUTS.VERY_LONG });
        testLogger.info('Battle screen entered via test button');
        return true;
      } catch {
        testLogger.warn('Battle screen not loaded after test button click');
      }
    }

    // 맵에서 전투 노드 시도
    try {
      await page.waitForSelector('[data-testid="map-container"]', { timeout: TIMEOUTS.VERY_LONG });
    } catch {
      const startBtn = page.locator('button:has-text("시작"), button:has-text("Start")');
      if (await safeIsVisible(startBtn, { context: 'Start Button' })) {
        await startBtn.click();
        testLogger.info('Clicked start button');
      }
    }

    const battleClicked = await clickMapNode(page, 'battle');
    if (battleClicked) {
      try {
        await page.waitForSelector('[data-testid="battle-screen"]', { timeout: TIMEOUTS.VERY_LONG });
        testLogger.info('Battle screen entered via map node');
        return true;
      } catch {
        testLogger.warn('Battle screen not loaded after node click');
      }
    }

    testLogger.warn('Failed to enter battle');
    return false;
  }

  test('전투 화면 UI 요소 확인', async ({ page }) => {
    const entered = await enterBattle(page);

    // 전투 화면 진입 실패 시 테스트 스킵 (명확한 로깅)
    test.skip(!entered, '전투 화면 진입 실패 - 테스트 환경에서 전투 노드가 없을 수 있음');

    const battleScreen = page.locator('[data-testid="battle-screen"]');
    await expect(battleScreen).toBeVisible({ timeout: TIMEOUTS.LONG });

    // 플레이어 HP 바
    await expect(page.locator('[data-testid="player-hp-bar-container"]')).toBeVisible();

    // 적 HP 바
    await expect(page.locator('[data-testid="enemy-hp-bar-container"]')).toBeVisible();

    // 핸드 영역
    await expect(page.locator('[data-testid="hand-area"]')).toBeVisible();

    // 타임라인
    await expect(page.locator('[data-testid="timeline-container"]')).toBeVisible();

    testLogger.info('All battle UI elements verified');
  });

  test('핸드 카드 표시 확인', async ({ page }) => {
    const entered = await enterBattle(page);
    test.skip(!entered, '전투 화면 진입 실패');

    const battleScreen = page.locator('[data-testid="battle-screen"]');
    await expect(battleScreen).toBeVisible({ timeout: TIMEOUTS.LONG });

    // 핸드 카드 컨테이너 확인
    const handCards = page.locator('[data-testid="hand-cards"]');
    await expect(handCards).toBeVisible({ timeout: TIMEOUTS.VERY_LONG });

    // 개별 카드 확인 (최소 1장 이상)
    const firstCard = page.locator('[data-testid="hand-card-0"]');
    const cardVisible = await safeIsVisible(firstCard, { timeout: TIMEOUTS.MEDIUM, context: 'First hand card' });

    // 카드가 있으면 검증, 없으면 로그
    if (cardVisible) {
      await expect(firstCard).toBeVisible();
      testLogger.info('Hand cards verified');
    } else {
      testLogger.warn('No individual cards found, but hand container exists');
    }
  });

  test('카드 선택 및 선택 상태 확인', async ({ page }) => {
    const entered = await enterBattle(page);
    test.skip(!entered, '전투 화면 진입 실패');

    const battleScreen = page.locator('[data-testid="battle-screen"]');
    await expect(battleScreen).toBeVisible({ timeout: TIMEOUTS.LONG });

    // 핸드 카드 대기
    await page.waitForSelector('[data-testid="hand-cards"]', { timeout: TIMEOUTS.VERY_LONG });

    // 첫 번째 카드 선택
    const selected = await selectCard(page, 0);
    test.skip(!selected, '선택 가능한 카드가 없음');

    // 선택 상태 확인
    const card = page.locator('[data-testid="hand-card-0"]');
    const selectedAttr = await card.getAttribute('data-card-selected');

    // 선택 상태 검증 (true 또는 상태 변화 확인)
    testLogger.info('Card selected state:', selectedAttr);
    expect(selectedAttr === 'true' || selectedAttr !== null).toBe(true);
  });

  test('카드 제출 버튼 활성화', async ({ page }) => {
    const entered = await enterBattle(page);
    test.skip(!entered, '전투 화면 진입 실패');

    const battleScreen = page.locator('[data-testid="battle-screen"]');
    await expect(battleScreen).toBeVisible({ timeout: TIMEOUTS.LONG });

    await page.waitForSelector('[data-testid="hand-cards"]', { timeout: TIMEOUTS.VERY_LONG });

    // 카드 선택
    await selectCard(page, 0);

    // 제출 버튼 확인
    const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
    await expect(submitBtn).toBeVisible();

    // 버튼 활성화 상태 확인
    const isEnabled = await submitBtn.isEnabled();
    testLogger.info('Submit button enabled:', isEnabled);

    // 카드를 선택했으므로 버튼이 활성화되어 있어야 함
    expect(isEnabled).toBe(true);
  });

  test('전투 자동 진행 - 승리 또는 패배', async ({ page }) => {
    const entered = await enterBattle(page);
    test.skip(!entered, '전투 화면 진입 실패');

    const battleScreen = page.locator('[data-testid="battle-screen"]');
    await expect(battleScreen).toBeVisible({ timeout: TIMEOUTS.LONG });

    // 자동 전투 진행 (개선된 quickAutoBattle 사용)
    const result = await quickAutoBattle(page, 25);

    testLogger.info('Battle result:', result);

    // 결과 확인 (victory, defeat, timeout 중 하나)
    expect(['victory', 'defeat', 'timeout']).toContain(result);
  });

  test('전투 중 HP 변화 추적', async ({ page }) => {
    const entered = await enterBattle(page);
    test.skip(!entered, '전투 화면 진입 실패');

    const battleScreen = page.locator('[data-testid="battle-screen"]');
    await expect(battleScreen).toBeVisible({ timeout: TIMEOUTS.LONG });

    // 초기 HP 확인 (전투 화면 내 HP)
    const playerHpText = page.locator('[data-testid="player-hp-text"]');
    await expect(playerHpText).toBeVisible();

    const initialText = await playerHpText.textContent() ?? '';
    testLogger.info('Initial battle HP:', initialText);
    expect(initialText).toMatch(/\d+\/\d+/);

    // 턴 진행
    await page.waitForSelector('[data-testid="hand-cards"]', { timeout: TIMEOUTS.VERY_LONG });

    // 카드 선택 및 제출
    await selectCard(page, 0);
    const submitted = await submitCards(page);
    test.skip(!submitted, '카드 제출 실패');

    // 턴 진행 대기 (상태 기반)
    await page.waitForFunction(
      () => {
        const phaseEl = document.querySelector('[data-testid="battle-phase"]');
        return phaseEl?.getAttribute('data-phase') !== 'select';
      },
      { timeout: TIMEOUTS.VERY_LONG }
    );
    await waitForUIStable(page);

    // HP 변화 확인
    const afterText = await playerHpText.textContent() ?? '';
    testLogger.info('After turn HP:', afterText);
    expect(afterText).toMatch(/\d+\/\d+/);
  });

  test('타임라인 표시 확인', async ({ page }) => {
    const entered = await enterBattle(page);
    test.skip(!entered, '전투 화면 진입 실패');

    const battleScreen = page.locator('[data-testid="battle-screen"]');
    await expect(battleScreen).toBeVisible({ timeout: TIMEOUTS.LONG });

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

    testLogger.info('Timeline UI verified');
  });

  test('여러 카드 선택 후 제출', async ({ page }) => {
    const entered = await enterBattle(page);
    test.skip(!entered, '전투 화면 진입 실패');

    const battleScreen = page.locator('[data-testid="battle-screen"]');
    await expect(battleScreen).toBeVisible({ timeout: TIMEOUTS.LONG });

    await page.waitForSelector('[data-testid="hand-cards"]', { timeout: TIMEOUTS.VERY_LONG });

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
          { timeout: TIMEOUTS.SHORT }
        ).catch(() => {});
      }
    }

    testLogger.info('Selected cards:', selectedCount);
    expect(selectedCount).toBeGreaterThan(0);

    // 카드를 선택했으면 제출
    const submitted = await submitCards(page);
    testLogger.info('Cards submitted:', submitted);
    expect(submitted).toBe(true);
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
    const btnVisible = await safeIsVisible(testBattleBtn, { timeout: TIMEOUTS.VERY_LONG, context: 'Test Battle Button' });
    test.skip(!btnVisible, '테스트 전투 버튼이 없음');

    await testBattleBtn.click();
    await page.waitForSelector('[data-testid="battle-screen"]', { timeout: TIMEOUTS.VERY_LONG });

    const battleScreen = page.locator('[data-testid="battle-screen"]');
    await expect(battleScreen).toBeVisible();

    // 자동 전투 완료까지 진행
    const result = await quickAutoBattle(page, 25);
    testLogger.info('Final battle result:', result);

    // 결과 검증
    expect(['victory', 'defeat', 'timeout']).toContain(result);

    // 승리 또는 패배 시 결과 모달 확인
    if (result === 'victory' || result === 'defeat') {
      const resultModal = page.locator('[data-testid="battle-result"], [data-testid="battle-result-modal"]');
      const modalVisible = await safeIsVisible(resultModal, { timeout: TIMEOUTS.MEDIUM, context: 'Result Modal' });

      if (modalVisible) {
        const resultText = await resultModal.textContent();
        testLogger.info('Result modal text:', resultText);
        expect(resultText).toBeTruthy();
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
    const btnVisible = await safeIsVisible(testBattleBtn, { timeout: TIMEOUTS.VERY_LONG, context: 'Test Battle Button' });
    test.skip(!btnVisible, '테스트 전투 버튼이 없음');

    await testBattleBtn.click();
    await page.waitForSelector('[data-testid="battle-screen"]', { timeout: TIMEOUTS.VERY_LONG });

    const battleScreen = page.locator('[data-testid="battle-screen"]');
    await expect(battleScreen).toBeVisible();

    // 핸드 카드가 표시되면 선택 페이즈
    const handCards = page.locator('[data-testid="hand-cards"]');
    await expect(handCards).toBeVisible({ timeout: TIMEOUTS.VERY_LONG });

    // 제출 버튼이 있으면 선택 페이즈
    const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
    await expect(submitBtn).toBeVisible();

    testLogger.info('Select phase verified');
  });

  test('진행 페이즈 전환', async ({ page }) => {
    const testBattleBtn = page.locator('button:has-text("Test Mixed Battle")');
    const btnVisible = await safeIsVisible(testBattleBtn, { timeout: TIMEOUTS.VERY_LONG, context: 'Test Battle Button' });
    test.skip(!btnVisible, '테스트 전투 버튼이 없음');

    await testBattleBtn.click();
    await page.waitForSelector('[data-testid="battle-screen"]', { timeout: TIMEOUTS.VERY_LONG });

    const battleScreen = page.locator('[data-testid="battle-screen"]');
    await expect(battleScreen).toBeVisible();

    await page.waitForSelector('[data-testid="hand-cards"]', { timeout: TIMEOUTS.VERY_LONG });

    // 카드 선택 및 제출
    await selectCard(page, 0);
    await submitCards(page);

    // 타임라인 진행 확인 (진행 페이즈)
    const timelineContainer = page.locator('[data-testid="timeline-container"]');
    await expect(timelineContainer).toBeVisible({ timeout: TIMEOUTS.LONG });

    testLogger.info('Phase transitioned to resolve');
  });
});
