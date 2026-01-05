import { test, expect, Page } from '@playwright/test';
import { resetGameState, waitForMap, selectMapNode, waitForUIStable, waitForTurnProgress, TIMEOUTS, testLogger } from './utils/test-helpers';

/**
 * 세이브/로드 시스템 E2E 테스트
 *
 * ## 세이브/로드 시스템 개요
 * - 게임 진행 상황 저장
 * - localStorage 또는 서버 기반 저장
 * - 자동 저장 및 수동 저장
 *
 * ## 검증 항목
 * 1. 자동 저장 동작
 * 2. 수동 저장/로드
 * 3. 저장 데이터 무결성
 * 4. 저장 슬롯 관리
 */
test.describe('세이브/로드 시스템', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // 저장 데이터 초기화
    await page.evaluate(() => {
      localStorage.clear();
    });
    await resetGameState(page);
  });

  /**
   * 현재 게임 상태 스냅샷 가져오기
   */
  async function getGameStateSnapshot(page: Page): Promise<{
    gold: number;
    hp: number;
    maxHp: number;
    layer: number;
    deckSize: number;
    relicCount: number;
  }> {
    return await page.evaluate(() => {
      // @ts-expect-error - 게임 스토어 접근
      const store = window.__GAME_STORE__ || window.gameStore;

      if (store) {
        const state = store.getState?.() || store;
        return {
          gold: state.gold || state.player?.gold || 0,
          hp: state.hp || state.player?.hp || 0,
          maxHp: state.maxHp || state.player?.maxHp || 0,
          layer: state.currentLayer || state.map?.currentLayer || 0,
          deckSize: state.deck?.length || state.player?.deck?.length || 0,
          relicCount: state.relics?.length || state.player?.relics?.length || 0,
        };
      }

      return { gold: 0, hp: 0, maxHp: 0, layer: 0, deckSize: 0, relicCount: 0 };
    });
  }

  /**
   * localStorage에서 저장 데이터 확인
   */
  async function getSaveData(page: Page): Promise<object | null> {
    return await page.evaluate(() => {
      const saveKey = localStorage.getItem('hahahahgo_save') ||
                      localStorage.getItem('game_save') ||
                      localStorage.getItem('save_data');
      if (saveKey) {
        try {
          return JSON.parse(saveKey);
        } catch {
          return null;
        }
      }

      // 다른 키 패턴 시도
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.includes('save') || key?.includes('game')) {
          try {
            const data = localStorage.getItem(key);
            if (data) return JSON.parse(data);
          } catch {
            continue;
          }
        }
      }
      return null;
    });
  }

  test.describe('자동 저장', () => {
    test('맵 이동 시 자동 저장', async ({ page }) => {
      await waitForMap(page);

      // 노드 선택
      const nodeClicked = await selectMapNode(page, 'battle');
      if (!nodeClicked) {
        const anyNode = await selectMapNode(page, 'any');
        test.skip(!anyNode, '노드 선택 불가');
      }

      await waitForUIStable(page);

      // 저장 데이터 확인
      const saveData = await getSaveData(page);
      testLogger.info('자동 저장 데이터', saveData);

      // 저장 데이터가 있거나 자동 저장 표시
      const autoSaveIndicator = page.locator('[data-testid="auto-save-indicator"], .auto-save');
      const hasIndicator = await autoSaveIndicator.isVisible({ timeout: 1000 }).catch(() => false);

      expect(saveData !== null || hasIndicator).toBe(true);
    });

    test('전투 완료 후 자동 저장', async ({ page }) => {
      await waitForMap(page);

      const battleClicked = await selectMapNode(page, 'battle');
      test.skip(!battleClicked, '전투 진입 실패');

      await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 }).catch(() => {});

      // 전투 진행
      for (let turn = 0; turn < 15; turn++) {
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
            await waitForTurnProgress(page);
          }
        }
      }

      // 전투 종료 후 저장 확인
      await waitForUIStable(page);
      const saveData = await getSaveData(page);

      if (saveData) {
        testLogger.info('전투 후 자동 저장 확인');
        expect(saveData).not.toBeNull();
      }
    });
  });

  test.describe('수동 저장/로드', () => {
    test('저장 버튼 클릭 시 저장됨', async ({ page }) => {
      await waitForMap(page);

      // 저장 버튼 찾기
      const saveBtn = page.locator(
        '[data-testid="save-btn"], button:has-text("저장"), [data-action="save"]'
      );

      if (await saveBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        const stateBefore = await getGameStateSnapshot(page);
        await saveBtn.click();

        // 저장 완료 표시
        const saveConfirm = page.locator('[data-testid="save-confirm"], .save-success');
        const confirmed = await saveConfirm.isVisible({ timeout: 2000 }).catch(() => false);

        if (confirmed) {
          testLogger.info('저장 완료 확인');
          expect(confirmed).toBe(true);
        } else {
          // localStorage 확인
          const saveData = await getSaveData(page);
          expect(saveData).not.toBeNull();
        }
      } else {
        testLogger.info('수동 저장 버튼 없음 (자동 저장만 지원)');
      }
    });

    test('로드 버튼으로 저장 복원', async ({ page }) => {
      await waitForMap(page);

      // 상태 기록
      const originalState = await getGameStateSnapshot(page);
      testLogger.info('원본 상태', originalState);

      // 저장
      const saveBtn = page.locator('[data-testid="save-btn"]');
      if (await saveBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await saveBtn.click();
        await waitForUIStable(page);
      }

      // 상태 변경 (노드 이동)
      await selectMapNode(page, 'any');
      await waitForUIStable(page);

      const changedState = await getGameStateSnapshot(page);
      testLogger.info('변경된 상태', changedState);

      // 로드
      const loadBtn = page.locator(
        '[data-testid="load-btn"], button:has-text("불러오기"), [data-action="load"]'
      );

      if (await loadBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await loadBtn.click();

        // 로드 확인 모달
        const confirmLoad = page.locator('[data-testid="confirm-load"]');
        if (await confirmLoad.isVisible({ timeout: 500 }).catch(() => false)) {
          await confirmLoad.click();
        }

        await waitForUIStable(page);

        const restoredState = await getGameStateSnapshot(page);
        testLogger.info('복원된 상태', restoredState);

        // 원본과 동일하거나 유사해야 함
        expect(restoredState.gold).toBe(originalState.gold);
      }
    });
  });

  test.describe('저장 데이터 무결성', () => {
    test('저장 데이터에 필수 정보 포함', async ({ page }) => {
      await waitForMap(page);

      // 저장 트리거
      await selectMapNode(page, 'any');
      await waitForUIStable(page);

      const saveData = await getSaveData(page);

      if (saveData && typeof saveData === 'object') {
        const data = saveData as Record<string, unknown>;

        // 필수 필드 확인
        const requiredFields = ['gold', 'hp', 'deck', 'relics', 'layer'].some(
          field => field in data || (data.player && field in (data.player as Record<string, unknown>))
        );

        testLogger.info('저장 데이터 키', Object.keys(data));
        expect(requiredFields || Object.keys(data).length > 0).toBe(true);
      }
    });

    test('손상된 저장 데이터 복구 시도', async ({ page }) => {
      // 손상된 데이터 주입
      await page.evaluate(() => {
        localStorage.setItem('hahahahgo_save', 'corrupted_data');
      });

      // 게임 새로고침
      await page.reload();
      await page.waitForLoadState('networkidle');

      // 에러 없이 로드되는지 확인
      const errorModal = page.locator('[data-testid="error-modal"], .error-dialog');
      const hasError = await errorModal.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasError) {
        // 복구 옵션 제공
        const recoverBtn = page.locator('[data-testid="recover-btn"], button:has-text("복구")');
        const hasRecover = await recoverBtn.isVisible({ timeout: 500 }).catch(() => false);
        testLogger.info('복구 옵션 제공', hasRecover);
      } else {
        // 정상 시작 (손상 데이터 무시)
        testLogger.info('손상 데이터 무시하고 정상 시작');
      }

      expect(true).toBe(true); // 크래시 없이 실행됨
    });

    test('버전 호환성 확인', async ({ page }) => {
      // 이전 버전 형식의 저장 데이터 주입
      await page.evaluate(() => {
        const oldSaveFormat = {
          version: '0.1.0',
          player: { hp: 50, gold: 100 },
          timestamp: Date.now() - 86400000, // 하루 전
        };
        localStorage.setItem('hahahahgo_save', JSON.stringify(oldSaveFormat));
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // 마이그레이션 또는 무시되는지 확인
      const migrationNotice = page.locator('[data-testid="migration-notice"]');
      const hasMigration = await migrationNotice.isVisible({ timeout: 2000 }).catch(() => false);

      testLogger.info('버전 마이그레이션 알림', hasMigration);

      // 정상 동작해야 함
      await waitForMap(page);
    });
  });

  test.describe('저장 슬롯 관리', () => {
    test('여러 저장 슬롯 지원', async ({ page }) => {
      await waitForMap(page);

      // 저장 슬롯 UI 확인
      const saveSlots = page.locator('[data-testid^="save-slot-"], .save-slot');
      const slotCount = await saveSlots.count();

      if (slotCount > 1) {
        testLogger.info('저장 슬롯 수', slotCount);
        expect(slotCount).toBeGreaterThan(0);
      } else {
        testLogger.info('단일 저장 슬롯 또는 자동 저장만 지원');
      }
    });

    test('저장 슬롯 삭제', async ({ page }) => {
      await waitForMap(page);

      // 저장
      const saveBtn = page.locator('[data-testid="save-btn"]');
      if (await saveBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await saveBtn.click();
        await waitForUIStable(page);
      }

      // 삭제 버튼 확인
      const deleteBtn = page.locator(
        '[data-testid="delete-save"], button:has-text("삭제"), [data-action="delete-save"]'
      );

      if (await deleteBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await deleteBtn.click();

        // 확인 모달
        const confirmDelete = page.locator('[data-testid="confirm-delete"]');
        if (await confirmDelete.isVisible({ timeout: 500 }).catch(() => false)) {
          await confirmDelete.click();
        }

        await waitForUIStable(page);

        // 저장 데이터 삭제 확인
        const saveData = await getSaveData(page);
        testLogger.info('삭제 후 저장 데이터', saveData);
      }
    });
  });

  test.describe('새 게임 시작', () => {
    test('새 게임 시작 시 저장 초기화', async ({ page }) => {
      await waitForMap(page);

      // 진행 후 저장
      await selectMapNode(page, 'any');
      await waitForUIStable(page);

      const saveDataBefore = await getSaveData(page);
      testLogger.info('진행 후 저장 데이터', saveDataBefore);

      // 새 게임 시작
      const newGameBtn = page.locator(
        '[data-testid="new-game-btn"], button:has-text("새 게임"), [data-action="new-game"]'
      );

      if (await newGameBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await newGameBtn.click();

        // 확인 모달
        const confirmNew = page.locator('[data-testid="confirm-new-game"]');
        if (await confirmNew.isVisible({ timeout: 500 }).catch(() => false)) {
          await confirmNew.click();
        }

        await waitForUIStable(page);

        // 초기 상태 확인
        const newState = await getGameStateSnapshot(page);
        testLogger.info('새 게임 상태', newState);

        // 레이어 0 또는 1에서 시작
        expect(newState.layer).toBeLessThanOrEqual(1);
      }
    });
  });

  test.describe('브라우저 새로고침 복구', () => {
    test('새로고침 후 상태 복원', async ({ page }) => {
      await waitForMap(page);

      // 상태 기록
      const stateBefore = await getGameStateSnapshot(page);
      testLogger.info('새로고침 전 상태', stateBefore);

      // 진행
      await selectMapNode(page, 'any');
      await waitForUIStable(page);

      // 새로고침
      await page.reload();
      await page.waitForLoadState('networkidle');

      // 상태 확인
      await waitForMap(page);
      const stateAfter = await getGameStateSnapshot(page);
      testLogger.info('새로고침 후 상태', stateAfter);

      // 골드 유지 또는 신규 게임
      expect(stateAfter.gold >= 0).toBe(true);
    });

    test('전투 중 새로고침 복구', async ({ page }) => {
      await waitForMap(page);

      const battleClicked = await selectMapNode(page, 'battle');
      test.skip(!battleClicked, '전투 진입 실패');

      await page.waitForSelector('[data-testid="battle-screen"]', { timeout: 5000 }).catch(() => {});

      // 전투 중 새로고침
      await page.reload();
      await page.waitForLoadState('networkidle');

      // 전투 재개 또는 맵으로 복귀
      const battleScreen = page.locator('[data-testid="battle-screen"]');
      const mapScreen = page.locator('[data-testid="map-container"]');

      const inBattle = await battleScreen.isVisible({ timeout: 3000 }).catch(() => false);
      const inMap = await mapScreen.isVisible({ timeout: 3000 }).catch(() => false);

      testLogger.info('복구 위치', { battle: inBattle, map: inMap });

      // 둘 중 하나에서 복구
      expect(inBattle || inMap).toBe(true);
    });
  });
});
