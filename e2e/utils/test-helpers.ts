import { Page, Locator, expect } from '@playwright/test';

/**
 * E2E 테스트 헬퍼 함수들
 * 최적화: waitForTimeout 대신 상태 기반 대기 사용
 */

/**
 * 타임아웃 상수 (일관성을 위해 중앙 관리)
 * 안정적인 테스트를 위해 충분한 대기 시간 설정
 */
export const TIMEOUTS = {
  /** 최소 대기 (빠른 UI 반응 확인) */
  MINIMAL: 500,
  /** 짧은 대기 (UI 반응, 애니메이션) */
  SHORT: 1000,
  /** 중간 대기 (상태 변화, 전환) */
  MEDIUM: 2000,
  /** 긴 대기 (페이지 로드, 전투 진입) */
  LONG: 5000,
  /** 매우 긴 대기 (게임 로드) */
  VERY_LONG: 10000,
  /** 극단적 대기 (전체 전투) */
  EXTREME: 30000,
} as const;

/**
 * 테스트 로거 - 디버깅용 로그 출력
 */
export const testLogger = {
  info: (message: string, data?: unknown) => {
    console.log(`[INFO] ${message}`, data !== undefined ? data : '');
  },
  warn: (message: string, data?: unknown) => {
    console.warn(`[WARN] ${message}`, data !== undefined ? data : '');
  },
  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${message}`, error !== undefined ? error : '');
  },
  debug: (message: string, data?: unknown) => {
    if (process.env.DEBUG) {
      console.log(`[DEBUG] ${message}`, data !== undefined ? data : '');
    }
  },
};

/**
 * 안전한 가시성 확인 (로깅 포함)
 */
export async function safeIsVisible(
  locator: Locator,
  options?: { timeout?: number; context?: string }
): Promise<boolean> {
  const timeout = options?.timeout ?? TIMEOUTS.MEDIUM;
  const context = options?.context ?? 'element';

  try {
    const visible = await locator.isVisible({ timeout });
    testLogger.debug(`${context} visibility: ${visible}`);
    return visible;
  } catch (error) {
    testLogger.debug(`${context} visibility check failed`, error);
    return false;
  }
}

/**
 * 필수 요소 대기 (없으면 에러)
 */
export async function waitForRequired(
  page: Page,
  selector: string,
  options?: { timeout?: number; message?: string }
): Promise<Locator> {
  const timeout = options?.timeout ?? TIMEOUTS.LONG;
  const message = options?.message ?? `Required element not found: ${selector}`;

  try {
    await page.waitForSelector(selector, { state: 'visible', timeout });
    return page.locator(selector);
  } catch (error) {
    testLogger.error(message, { selector, error });
    throw new Error(message);
  }
}

/**
 * 테스트 전제조건 확인 - 조건 불만족 시 skip
 */
export async function checkPrecondition(
  locator: Locator,
  description: string
): Promise<{ met: boolean; skip: () => void }> {
  const met = await safeIsVisible(locator, { context: description });
  return {
    met,
    skip: () => {
      if (!met) {
        testLogger.warn(`Precondition not met: ${description}`);
      }
    },
  };
}

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
 * 맵에서 노드 클릭 (고유 ID 또는 타입으로)
 */
export async function clickMapNode(page: Page, nodeIdOrType: string): Promise<boolean> {
  // 먼저 정확한 ID로 시도
  let node = page.locator(`[data-testid="map-node-${nodeIdOrType}"]`).first();

  if (!(await node.isVisible({ timeout: 1000 }).catch(() => false))) {
    // ID로 못 찾으면 타입으로 시도
    node = page.locator(`[data-node-type="${nodeIdOrType}"][data-node-selectable="true"]`).first();
  }

  if (await node.isVisible({ timeout: 1000 }).catch(() => false)) {
    await node.click();
    return true;
  }

  return false;
}

/**
 * 선택 가능한 노드 찾기
 */
export async function findSelectableNode(page: Page, preferredType?: string): Promise<Locator | null> {
  if (preferredType) {
    const node = page.locator(`[data-node-type="${preferredType}"][data-node-selectable="true"]`).first();
    if (await node.isVisible({ timeout: 1000 }).catch(() => false)) {
      return node;
    }
  }

  // 선택 가능한 아무 노드 반환
  const anyNode = page.locator('[data-node-selectable="true"]').first();
  if (await anyNode.isVisible({ timeout: 1000 }).catch(() => false)) {
    return anyNode;
  }

  return null;
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
 * 핸드에서 카드 선택 (새 testid 사용)
 */
export async function selectCard(page: Page, cardIndex: number): Promise<boolean> {
  const card = page.locator(`[data-testid="hand-card-${cardIndex}"]`);
  if (await card.isVisible({ timeout: 1000 }).catch(() => false)) {
    await card.click();
    return true;
  }

  // fallback: 기존 방식
  const cards = page.locator('[data-testid="hand-card"]');
  const fallbackCard = cards.nth(cardIndex);
  if (await fallbackCard.isVisible({ timeout: 1000 }).catch(() => false)) {
    await fallbackCard.click();
    return true;
  }

  return false;
}

/**
 * 카드 선택 상태 확인
 */
export async function isCardSelected(page: Page, cardIndex: number): Promise<boolean> {
  const card = page.locator(`[data-testid="hand-card-${cardIndex}"]`);
  const selected = await card.getAttribute('data-card-selected');
  return selected === 'true';
}

/**
 * 카드 제출 (턴 종료)
 */
export async function submitCards(page: Page): Promise<boolean> {
  const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
  if (await submitBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
    await submitBtn.click();
    return true;
  }
  return false;
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
  return text?.toLowerCase().includes('victory') || text?.includes('승리') ? 'victory' : 'defeat';
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
 * 상점에서 상징 구매
 */
export async function buyShopRelic(page: Page, relicId: string): Promise<boolean> {
  const relic = page.locator(`[data-testid="shop-relic-${relicId}"][data-relic-sold="false"]`);
  if (await relic.isVisible({ timeout: 1000 }).catch(() => false)) {
    await relic.click();
    return true;
  }
  return false;
}

/**
 * 상점에서 아이템 구매
 */
export async function buyShopItem(page: Page, itemId: string): Promise<boolean> {
  const item = page.locator(`[data-testid="shop-item-${itemId}"][data-item-sold="false"]`);
  if (await item.isVisible({ timeout: 1000 }).catch(() => false)) {
    await item.click();
    return true;
  }
  return false;
}

/**
 * 상점에서 카드 구매
 */
export async function buyShopCard(page: Page, cardId: string): Promise<boolean> {
  const card = page.locator(`[data-testid="shop-card-${cardId}"][data-card-sold="false"]`);
  if (await card.isVisible({ timeout: 1000 }).catch(() => false)) {
    await card.click();
    return true;
  }
  return false;
}

/**
 * 상점 서비스 사용
 */
export async function useShopService(page: Page, serviceId: string): Promise<boolean> {
  const service = page.locator(`[data-testid="shop-service-${serviceId}"]`);
  if (await service.isVisible({ timeout: 1000 }).catch(() => false)) {
    await service.click();
    return true;
  }
  return false;
}

/**
 * 상점 나가기
 */
export async function exitShop(page: Page): Promise<void> {
  const exitBtn = page.locator('[data-testid="shop-exit-btn"]');
  await exitBtn.click();
  // 모달이 닫힐 때까지 대기
  await page.waitForSelector('[data-testid="shop-modal"]', {
    state: 'hidden',
    timeout: 5000,
  }).catch(() => {});
}

/**
 * 이벤트 모달 대기
 */
export async function waitForEvent(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="event-modal"]', {
    state: 'visible',
    timeout: 10000,
  });
}

/**
 * 이벤트 선택지 클릭
 */
export async function selectEventChoice(page: Page, choiceId: string): Promise<boolean> {
  const choiceBtn = page.locator(`[data-testid="event-choice-btn-${choiceId}"]`);
  if (await choiceBtn.isEnabled({ timeout: 1000 }).catch(() => false)) {
    await choiceBtn.click();
    return true;
  }
  return false;
}

/**
 * 이벤트 닫기
 */
export async function closeEvent(page: Page): Promise<void> {
  const closeBtn = page.locator('[data-testid="event-close-btn"]');
  if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeBtn.click();
  }
  await page.waitForSelector('[data-testid="event-modal"]', {
    state: 'hidden',
    timeout: 5000,
  }).catch(() => {});
}

/**
 * 휴식 모달 대기
 */
export async function waitForRest(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="rest-modal"]', {
    state: 'visible',
    timeout: 10000,
  });
}

/**
 * 휴식 선택 (체력 회복, 각성 등)
 */
export async function selectRestOption(page: Page, optionId: string): Promise<boolean> {
  const btn = page.locator(`[data-testid="rest-btn-${optionId}"]`);
  if (await btn.isEnabled({ timeout: 1000 }).catch(() => false)) {
    await btn.click();
    return true;
  }
  return false;
}

/**
 * 휴식 모달 닫기
 */
export async function closeRest(page: Page): Promise<void> {
  const closeBtn = page.locator('[data-testid="rest-close-btn"]');
  if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeBtn.click();
  }
  await page.waitForSelector('[data-testid="rest-modal"]', {
    state: 'hidden',
    timeout: 5000,
  }).catch(() => {});
}

/**
 * 던전 모달 대기
 */
export async function waitForDungeon(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="dungeon-modal"]', {
    state: 'visible',
    timeout: 10000,
  });
}

/**
 * 던전 진입
 */
export async function enterDungeon(page: Page): Promise<boolean> {
  const btn = page.locator('[data-testid="dungeon-confirm-btn"]');
  if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await btn.click();
    return true;
  }
  return false;
}

/**
 * 던전 우회
 */
export async function bypassDungeon(page: Page): Promise<boolean> {
  const btn = page.locator('[data-testid="dungeon-bypass-btn"]');
  if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await btn.click();
    // 모달이 닫힐 때까지 대기
    await page.waitForSelector('[data-testid="dungeon-modal"]', {
      state: 'hidden',
      timeout: 5000,
    }).catch(() => {});
    return true;
  }
  return false;
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
 * 상점 골드 확인
 */
export async function getShopGold(page: Page): Promise<number> {
  const goldText = await page.locator('[data-testid="shop-gold-amount"]').textContent();
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
 * 맵 화면 대기 (게임 시작 자동 처리)
 */
export async function waitForMap(page: Page): Promise<void> {
  try {
    await page.waitForSelector('[data-testid="map-container"]', { timeout: 10000 });
  } catch {
    // 시작 버튼이 있으면 클릭
    const startBtn = page.locator('button:has-text("시작"), button:has-text("Start")');
    if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForSelector('[data-testid="map-container"]', { timeout: 10000 });
    }
  }
}

/**
 * UI 안정화 대기 (애니메이션 완료 등)
 * 상태 기반: 모든 애니메이션/트랜지션 완료 확인
 */
export async function waitForUIStable(page: Page, options?: { timeout?: number }): Promise<void> {
  const timeout = options?.timeout ?? 2000;

  await page.waitForFunction(
    () => {
      // 모든 애니메이션이 완료되었는지 확인
      const animations = document.getAnimations();
      return animations.every(a => a.playState === 'finished' || a.playState === 'idle');
    },
    { timeout }
  ).catch(() => {});

  // 추가로 네트워크 idle 확인
  await page.waitForLoadState('networkidle').catch(() => {});
}

/**
 * 노드 선택 (맵에서 특정 타입의 노드 클릭)
 * @param nodeType - 'battle', 'shop', 'rest', 'event', 'dungeon', 'elite', 'boss', 또는 'any'
 */
export async function selectMapNode(page: Page, nodeType: string): Promise<boolean> {
  let node;

  if (nodeType === 'any') {
    // 'any'인 경우 선택 가능한 아무 노드나 클릭
    node = page.locator('[data-node-selectable="true"]').first();
  } else {
    // 먼저 노드 타입으로 시도 (선택 가능한 노드만)
    node = page.locator(`[data-node-type="${nodeType}"][data-node-selectable="true"]`).first();

    if (!(await node.isVisible({ timeout: 1000 }).catch(() => false))) {
      // 고유 ID로 시도 (fallback)
      node = page.locator(`[data-testid="map-node-${nodeType}"]`).first();
    }
  }

  if (await node.isVisible({ timeout: 2000 }).catch(() => false)) {
    // 요소를 뷰포트로 스크롤
    await node.scrollIntoViewIfNeeded().catch(() => {});

    // 클릭 시도 (실패하면 force click)
    try {
      await node.click({ timeout: 3000 });
    } catch {
      await node.click({ force: true }).catch(() => {});
    }

    // 노드 클릭 후 상태 변화 대기 (전투 화면 또는 모달)
    await page.waitForFunction(
      () => {
        const battleScreen = document.querySelector('[data-testid="battle-screen"]');
        const modal = document.querySelector('[data-testid$="-modal"]');
        return battleScreen !== null || modal !== null;
      },
      { timeout: 5000 }
    ).catch(() => {});
    return true;
  }

  // 마지막으로 클릭 가능한 노드 버튼 시도
  const anyClickable = page.locator('.map-node:not(.cleared):not(.disabled)').first();
  if (await anyClickable.isVisible({ timeout: 1000 }).catch(() => false)) {
    await anyClickable.click();
    await page.waitForTimeout(1000);
    return true;
  }

  return false;
}

/**
 * 전투 자동 진행 (단순화된 버전 - 빠른 테스트용)
 * 개선: 타임아웃 증가, 전투 단계 감지 강화, 턴 종료 처리 추가
 */
export async function quickAutoBattle(page: Page, maxTurns: number = 20): Promise<'victory' | 'defeat' | 'timeout'> {
  const checkBattleEnd = async (): Promise<'victory' | 'defeat' | null> => {
    // 전투 결과 모달 확인
    const resultModal = page.locator('[data-testid="battle-result-modal"], [data-testid="battle-result"]');
    if (await resultModal.isVisible({ timeout: 100 }).catch(() => false)) {
      const resultText = await resultModal.textContent();
      const result = resultText?.includes('승리') || resultText?.includes('victory') ? 'victory' : 'defeat';

      // 결과 모달 닫기
      const closeBtn = page.locator('[data-testid="battle-result-close-btn"], button:has-text("확인"), button:has-text("전투 종료")');
      if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeBtn.click();
      }
      return result;
    }

    // 패배 플래그 확인
    if (await page.locator('[data-testid="defeat-flag"]').isVisible({ timeout: 100 }).catch(() => false)) {
      return 'defeat';
    }

    // 전투 화면이 없으면 종료된 것으로 간주
    if (!(await page.locator('[data-testid="battle-screen"]').isVisible({ timeout: 100 }).catch(() => false))) {
      return 'victory'; // 전투 화면이 사라졌으면 승리로 간주
    }

    return null;
  };

  for (let turn = 0; turn < maxTurns; turn++) {
    // 전투 종료 확인
    const endResult = await checkBattleEnd();
    if (endResult) return endResult;

    // 현재 전투 단계 확인
    const phaseEl = page.locator('[data-testid="battle-phase"]');
    const phase = await phaseEl.getAttribute('data-phase').catch(() => null);

    if (phase === 'select') {
      // 선택 단계: 카드 선택 후 제출
      const handCards = page.locator('[data-testid^="hand-card-"]');
      const cardCount = await handCards.count().catch(() => 0);

      if (cardCount > 0) {
        // 첫 번째 카드 선택
        await handCards.first().click().catch(() => {});
        // 카드 선택 상태 변화 대기 (상태 기반)
        await page.waitForFunction(
          () => {
            const card = document.querySelector('[data-testid^="hand-card-"]');
            return card?.getAttribute('data-card-selected') === 'true';
          },
          { timeout: TIMEOUTS.SHORT }
        ).catch(() => {});
      }

      // 제출 버튼 클릭
      const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
      if (await submitBtn.isEnabled({ timeout: TIMEOUTS.SHORT }).catch(() => false)) {
        await submitBtn.click().catch(() => {});
        // 단계 변화 대기
        await page.waitForFunction(
          () => {
            const el = document.querySelector('[data-testid="battle-phase"]');
            return el?.getAttribute('data-phase') !== 'select';
          },
          { timeout: TIMEOUTS.LONG }
        ).catch(() => {});
      }
    } else if (phase === 'respond') {
      // 대응 단계: 진행 버튼 클릭
      const proceedBtn = page.locator('button:has-text("진행 시작"), button:has-text("▶️ 진행")');
      if (await proceedBtn.isVisible({ timeout: TIMEOUTS.SHORT }).catch(() => false)) {
        await proceedBtn.click().catch(() => {});
        await page.waitForFunction(
          () => {
            const el = document.querySelector('[data-testid="battle-phase"]');
            return el?.getAttribute('data-phase') === 'resolve';
          },
          { timeout: TIMEOUTS.LONG }
        ).catch(() => {});
      }
    } else if (phase === 'resolve') {
      // 진행 단계: 자동 진행 또는 턴 종료
      const turnEndBtn = page.locator('button:has-text("턴 종료"), button:has-text("전투 종료")');
      if (await turnEndBtn.isVisible({ timeout: TIMEOUTS.SHORT }).catch(() => false)) {
        await turnEndBtn.click().catch(() => {});
        // 다음 턴 또는 전투 종료 대기
        await page.waitForFunction(
          () => {
            const phaseEl = document.querySelector('[data-testid="battle-phase"]');
            const battleScreen = document.querySelector('[data-testid="battle-screen"]');
            const result = document.querySelector('[data-testid="battle-result"]');
            return phaseEl?.getAttribute('data-phase') === 'select' || !battleScreen || result;
          },
          { timeout: TIMEOUTS.VERY_LONG }
        ).catch(() => {});
      } else {
        // 자동 진행 버튼 클릭
        const autoBtn = page.locator('button:has-text("▶️ 진행")');
        if (await autoBtn.isVisible({ timeout: TIMEOUTS.SHORT }).catch(() => false)) {
          await autoBtn.click().catch(() => {});
        }
        // 타임라인 진행 상태 변화 대기 (상태 기반)
        await page.waitForFunction(
          () => {
            // 타임라인 업데이트 또는 전투 종료 확인
            const phaseEl = document.querySelector('[data-testid="battle-phase"]');
            const result = document.querySelector('[data-testid="battle-result"]');
            return phaseEl?.getAttribute('data-phase') === 'select' || result !== null;
          },
          { timeout: TIMEOUTS.SHORT }
        ).catch(() => {});
      }
    } else {
      // 단계를 알 수 없는 경우: UI 안정화 대기 (상태 기반)
      await page.waitForFunction(
        () => {
          const animations = document.getAnimations();
          return animations.every(a => a.playState === 'finished' || a.playState === 'idle');
        },
        { timeout: TIMEOUTS.SHORT }
      ).catch(() => {});
    }

    // 턴 후 전투 종료 재확인
    const postTurnResult = await checkBattleEnd();
    if (postTurnResult) return postTurnResult;
  }

  return 'timeout';
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
 * 모달 닫기 (기본)
 * 더 유연한 버전은 아래 closeModal(page, modalType) 참고
 */
export async function closeAnyModal(page: Page): Promise<void> {
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
 * 상태 변화 대기 (특정 요소의 텍스트가 변할 때까지)
 * 개선: waitForTimeout 대신 waitForFunction 사용
 */
export async function waitForStateChange(
  page: Page,
  selector: string,
  expectedPattern: RegExp,
  options?: { timeout?: number }
): Promise<boolean> {
  const timeout = options?.timeout ?? 10000;

  try {
    await page.waitForFunction(
      ({ sel, pattern }) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        const text = el.textContent ?? '';
        return new RegExp(pattern).test(text);
      },
      { sel: selector, pattern: expectedPattern.source },
      { timeout }
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * 자동 전투 진행 (개선된 로직 - 상태 기반 대기)
 */
export async function autoPlayBattle(page: Page, maxTurns: number = 30): Promise<'victory' | 'defeat' | 'timeout'> {
  for (let turn = 0; turn < maxTurns; turn++) {
    // 전투 종료 확인
    const resultEl = page.locator('[data-testid="battle-result"], [data-testid="battle-result-modal"]');
    if (await resultEl.isVisible({ timeout: 200 }).catch(() => false)) {
      const result = await getBattleResult(page);
      return result;
    }

    // 패배 플래그 확인
    const defeatFlag = page.locator('[data-testid="defeat-flag"]');
    if (await defeatFlag.isVisible({ timeout: 200 }).catch(() => false)) {
      return 'defeat';
    }

    // 핸드 카드 대기
    const handCards = page.locator('[data-testid="hand-cards"]');
    if (!(await handCards.isVisible({ timeout: 500 }).catch(() => false))) {
      continue;
    }

    // 카드 선택 (새 testid 사용)
    const cards = page.locator('[data-testid^="hand-card-"]');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      // 최대 3장까지 선택 - 상태 기반 확인
      for (let i = 0; i < Math.min(3, cardCount); i++) {
        const card = cards.nth(i);
        if (await card.isVisible({ timeout: 100 }).catch(() => false)) {
          await card.click();
          // 선택 상태 변화 대기
          await page.waitForFunction(
            (idx) => {
              const el = document.querySelector(`[data-testid="hand-card-${idx}"]`);
              return el?.getAttribute('data-card-selected') === 'true';
            },
            i,
            { timeout: 500 }
          ).catch(() => {});
        }
      }

      // 제출 버튼 대기 및 클릭
      const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
      await page.waitForFunction(
        () => {
          const btn = document.querySelector('[data-testid="submit-cards-btn"]');
          return btn && !btn.hasAttribute('disabled');
        },
        { timeout: 1000 }
      ).catch(() => {});

      if (await submitBtn.isEnabled({ timeout: 100 }).catch(() => false)) {
        await submitBtn.click();
        // 전투 진행 대기 - 타임라인 또는 결과 화면 확인
        await page.waitForSelector('[data-testid="timeline-container"], [data-testid="battle-result"]', {
          state: 'visible',
          timeout: 2000,
        }).catch(() => {});
      }
    }

    // 전투 애니메이션 상태 변화 대기 (핸드 카드 업데이트 또는 전투 종료)
    await page.waitForFunction(
      () => {
        const handCards = document.querySelector('[data-testid="hand-cards"]');
        const battleResult = document.querySelector('[data-testid="battle-result"]');
        return handCards?.children.length !== undefined || battleResult !== null;
      },
      { timeout: 1000 }
    ).catch(() => {});
  }

  return 'timeout';
}

/**
 * 노드 타입별 핸들러 자동 실행
 */
export async function handleNodeByType(page: Page, nodeType: string): Promise<boolean> {
  switch (nodeType) {
    case 'battle':
    case 'elite':
      await waitForBattle(page).catch(() => {});
      if (await page.locator('[data-testid="battle-screen"]').isVisible({ timeout: 1000 }).catch(() => false)) {
        await autoPlayBattle(page);
        return true;
      }
      break;

    case 'shop':
      await waitForShop(page).catch(() => {});
      if (await page.locator('[data-testid="shop-modal"]').isVisible({ timeout: 1000 }).catch(() => false)) {
        await exitShop(page);
        return true;
      }
      break;

    case 'event':
      await waitForEvent(page).catch(() => {});
      if (await page.locator('[data-testid="event-modal"]').isVisible({ timeout: 1000 }).catch(() => false)) {
        // 첫 번째 선택지 클릭 시도
        const firstChoice = page.locator('[data-testid^="event-choice-btn-"]').first();
        if (await firstChoice.isVisible({ timeout: 500 }).catch(() => false)) {
          await firstChoice.click();
        }
        await closeEvent(page);
        return true;
      }
      break;

    case 'rest':
      await waitForRest(page).catch(() => {});
      if (await page.locator('[data-testid="rest-modal"]').isVisible({ timeout: 1000 }).catch(() => false)) {
        await selectRestOption(page, 'heal');
        return true;
      }
      break;

    case 'dungeon':
      await waitForDungeon(page).catch(() => {});
      if (await page.locator('[data-testid="dungeon-modal"]').isVisible({ timeout: 1000 }).catch(() => false)) {
        await bypassDungeon(page);
        return true;
      }
      break;
  }

  return false;
}

// ==================== 추가 유틸리티 함수 ====================

/**
 * 통합 모달 대기 함수
 * @param page Playwright Page
 * @param modalType 모달 타입 (shop, event, rest, dungeon, reward 등)
 * @param options 옵션
 */
export async function waitForModal(
  page: Page,
  modalType: string,
  options?: { timeout?: number; throwOnFail?: boolean }
): Promise<boolean> {
  const timeout = options?.timeout ?? TIMEOUTS.LONG;
  const throwOnFail = options?.throwOnFail ?? false;

  const selector = `[data-testid="${modalType}-modal"], [data-testid="${modalType}Modal"]`;

  try {
    await page.waitForSelector(selector, { state: 'visible', timeout });
    return true;
  } catch (error) {
    const message = `${modalType} 모달을 찾을 수 없음 (${timeout}ms 대기 후)`;
    testLogger.warn(message);

    if (throwOnFail) {
      throw new Error(message);
    }
    return false;
  }
}

/**
 * 모달 닫기 (통합)
 */
export async function closeModal(page: Page, modalType: string): Promise<boolean> {
  const closeSelectors = [
    `[data-testid="${modalType}-close-btn"]`,
    `[data-testid="${modalType}-exit-btn"]`,
    `[data-testid="close-${modalType}"]`,
    `.${modalType}-modal .close-btn`,
    'button:has-text("닫기")',
    'button:has-text("확인")',
  ];

  for (const selector of closeSelectors) {
    const btn = page.locator(selector).first();
    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
      await btn.click();
      await page.waitForSelector(`[data-testid="${modalType}-modal"]`, {
        state: 'hidden',
        timeout: TIMEOUTS.MEDIUM,
      }).catch(() => {});
      return true;
    }
  }

  return false;
}

/**
 * 에러 컨텍스트와 함께 테스트 스킵
 */
export function skipWithContext(
  condition: boolean,
  context: {
    reason: string;
    expected?: string;
    actual?: string;
    suggestion?: string;
  }
): void {
  if (condition) {
    const parts = [`Skip: ${context.reason}`];
    if (context.expected) parts.push(`  예상: ${context.expected}`);
    if (context.actual) parts.push(`  실제: ${context.actual}`);
    if (context.suggestion) parts.push(`  해결: ${context.suggestion}`);

    testLogger.warn(parts.join('\n'));
  }
}

/**
 * 게임 상태 주입 (테스트용)
 */
export async function injectGameState(page: Page, state: Record<string, unknown>): Promise<boolean> {
  return await page.evaluate((stateToInject) => {
    try {
      // @ts-expect-error - 개발 모드 함수
      if (typeof window.__INJECT_STATE__ === 'function') {
        // @ts-expect-error - 개발 모드 함수
        window.__INJECT_STATE__(stateToInject);
        return true;
      }

      // @ts-expect-error - 게임 스토어 직접 접근
      const store = window.__GAME_STORE__ || window.gameStore;
      if (store?.setState) {
        store.setState(stateToInject);
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }, state);
}

/**
 * 현재 게임 상태 스냅샷
 */
export async function getGameSnapshot(page: Page): Promise<{
  gold: number;
  hp: number;
  maxHp: number;
  ether: number;
  layer: number;
  deckSize: number;
  relicCount: number;
  phase?: string;
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
        ether: state.ether || state.player?.ether || 0,
        layer: state.currentLayer || state.map?.currentLayer || 0,
        deckSize: state.deck?.length || state.player?.deck?.length || 0,
        relicCount: state.relics?.length || state.player?.relics?.length || 0,
        phase: state.battlePhase || state.battle?.phase,
      };
    }

    return { gold: 0, hp: 0, maxHp: 0, ether: 0, layer: 0, deckSize: 0, relicCount: 0 };
  });
}

/**
 * 특정 조합 카드 세트 선택
 */
export async function selectCardsForCombo(
  page: Page,
  comboType: 'pair' | 'triple' | 'flush' | 'fullhouse'
): Promise<{ selected: number; combo: string | null }> {
  const cards = page.locator('[data-testid^="hand-card-"]');
  const count = await cards.count();

  if (count === 0) {
    return { selected: 0, combo: null };
  }

  // 카드 정보 수집
  const cardInfos: Array<{ index: number; actionCost: number; type: string }> = [];
  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    const actionCost = parseInt(await card.getAttribute('data-action-cost') || '1');
    const type = await card.getAttribute('data-card-type') || 'unknown';
    cardInfos.push({ index: i, actionCost, type });
  }

  // actionCost별 그룹화
  const costGroups = new Map<number, number[]>();
  const typeGroups = new Map<string, number[]>();

  cardInfos.forEach(card => {
    const costGroup = costGroups.get(card.actionCost) || [];
    costGroup.push(card.index);
    costGroups.set(card.actionCost, costGroup);

    const typeGroup = typeGroups.get(card.type) || [];
    typeGroup.push(card.index);
    typeGroups.set(card.type, typeGroup);
  });

  let indicesToSelect: number[] = [];

  switch (comboType) {
    case 'pair':
      for (const indices of costGroups.values()) {
        if (indices.length >= 2) {
          indicesToSelect = indices.slice(0, 2);
          break;
        }
      }
      break;

    case 'triple':
      for (const indices of costGroups.values()) {
        if (indices.length >= 3) {
          indicesToSelect = indices.slice(0, 3);
          break;
        }
      }
      break;

    case 'flush':
      for (const [type, indices] of typeGroups.entries()) {
        if ((type === 'attack' || type === 'defense') && indices.length >= 4) {
          indicesToSelect = indices.slice(0, 4);
          break;
        }
      }
      break;

    case 'fullhouse': {
      // 트리플 + 페어 찾기
      let tripleIndices: number[] = [];
      let pairIndices: number[] = [];

      for (const indices of costGroups.values()) {
        if (indices.length >= 3 && tripleIndices.length === 0) {
          tripleIndices = indices.slice(0, 3);
        } else if (indices.length >= 2 && pairIndices.length === 0) {
          pairIndices = indices.slice(0, 2);
        }
      }

      if (tripleIndices.length === 3 && pairIndices.length === 2) {
        indicesToSelect = [...tripleIndices, ...pairIndices];
      }
      break;
    }
  }

  // 카드 선택
  for (const index of indicesToSelect) {
    await cards.nth(index).click();
    await page.waitForTimeout(100); // 선택 애니메이션 대기
  }

  // 현재 조합 확인
  const comboDisplay = page.locator('[data-testid="combo-display"], .combo-name');
  const combo = await comboDisplay.textContent().catch(() => null);

  return { selected: indicesToSelect.length, combo };
}

/**
 * 상태이상 확인
 */
export async function getStatusEffects(
  page: Page,
  target: 'player' | 'enemy'
): Promise<Array<{ type: string; value: number; duration: number }>> {
  const prefix = target === 'player' ? 'player' : 'enemy';
  const statusEffects = page.locator(`[data-testid="${prefix}-status-effect"], [data-status-target="${target}"]`);
  const count = await statusEffects.count();

  const effects: Array<{ type: string; value: number; duration: number }> = [];

  for (let i = 0; i < count; i++) {
    const effect = statusEffects.nth(i);
    const type = await effect.getAttribute('data-status-type') || '';
    const value = parseInt(await effect.getAttribute('data-status-value') || '0');
    const duration = parseInt(await effect.getAttribute('data-status-duration') || '0');

    if (type) {
      effects.push({ type, value, duration });
    }
  }

  return effects;
}

/**
 * 카드 효과 실행 대기
 */
export async function waitForCardEffect(page: Page, effectType: string): Promise<boolean> {
  const effectIndicator = page.locator(
    `[data-testid="card-effect-${effectType}"], [data-effect-type="${effectType}"]`
  );

  try {
    await effectIndicator.waitFor({ state: 'visible', timeout: TIMEOUTS.MEDIUM });
    return true;
  } catch {
    return false;
  }
}

/**
 * 다중 히트 카운트 확인
 */
export async function getHitCount(page: Page): Promise<number> {
  const hitCounter = page.locator('[data-testid="hit-counter"], .hit-count');

  if (await hitCounter.isVisible({ timeout: 500 }).catch(() => false)) {
    const text = await hitCounter.textContent() || '';
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  return 0;
}

// =====================
// 전투 진입 및 상태 확인 헬퍼
// =====================

/**
 * 전투 화면으로 진입 (여러 방법 시도)
 * 1. Test Mixed Battle 버튼 (가장 안정적)
 * 2. 맵에서 전투 노드 클릭
 * @returns 전투 진입 성공 여부
 */
export async function enterBattle(page: Page): Promise<boolean> {
  try {
    // 이미 전투 화면이면 성공
    if (await page.locator('[data-testid="battle-screen"]').isVisible({ timeout: 500 }).catch(() => false)) {
      return true;
    }

    // 방법 1: Test Mixed Battle 버튼 (개발용, 가장 안정적)
    const testBattleBtn = page.locator('button:has-text("Test Mixed Battle")');
    if (await testBattleBtn.isVisible({ timeout: TIMEOUTS.SHORT }).catch(() => false)) {
      await testBattleBtn.click();
      await page.waitForSelector('[data-testid="battle-screen"]', { timeout: TIMEOUTS.LONG });
      await waitForUIStable(page);
      return true;
    }

    // 방법 2: 맵에서 전투 노드 클릭
    await waitForMap(page);
    const battleClicked = await selectMapNode(page, 'battle');

    if (battleClicked) {
      await page.waitForSelector('[data-testid="battle-screen"]', { timeout: TIMEOUTS.LONG }).catch(() => {});
      await waitForUIStable(page);

      // 전투 화면 로드 확인
      if (await page.locator('[data-testid="battle-screen"]').isVisible({ timeout: 500 }).catch(() => false)) {
        return true;
      }
    }

    // 방법 3: 아무 선택 가능한 노드 클릭 (elite, boss 등)
    const anyBattleNode = await selectMapNode(page, 'any');
    if (anyBattleNode) {
      await page.waitForSelector('[data-testid="battle-screen"]', { timeout: TIMEOUTS.LONG }).catch(() => {});
      if (await page.locator('[data-testid="battle-screen"]').isVisible({ timeout: 500 }).catch(() => false)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * HP 정보 파싱
 * @param target - 'player' 또는 'enemy'
 * @returns { current, max } 또는 null
 */
export async function getHP(
  page: Page,
  target: 'player' | 'enemy'
): Promise<{ current: number; max: number } | null> {
  const selector = target === 'player'
    ? '[data-testid="player-hp-text"], [data-testid="player-hp"]'
    : '[data-testid="enemy-hp-text"], [data-testid="enemy-hp"]';

  const hpElement = page.locator(selector).first();

  if (!(await hpElement.isVisible({ timeout: TIMEOUTS.SHORT }).catch(() => false))) {
    return null;
  }

  const text = await hpElement.textContent() || '';

  // "80/100" 또는 "❤️ 80/100" 형식 파싱
  const match = text.match(/(\d+)\s*\/\s*(\d+)/);
  if (match) {
    return {
      current: parseInt(match[1]),
      max: parseInt(match[2])
    };
  }

  return null;
}

/**
 * 카드 선택 및 제출
 * @param cardIndex - 선택할 카드 인덱스 (기본: 0, 첫 번째 카드)
 * @returns 제출 성공 여부
 */
export async function selectAndSubmitCard(
  page: Page,
  cardIndex: number = 0
): Promise<boolean> {
  try {
    // 핸드 카드 찾기
    const cards = page.locator('[data-testid^="hand-card-"], .hand-card');
    const cardCount = await cards.count();

    if (cardCount === 0) {
      testLogger.warn('No cards in hand');
      return false;
    }

    // 카드 클릭
    const targetIndex = Math.min(cardIndex, cardCount - 1);
    await cards.nth(targetIndex).click();

    // 짧은 대기 (선택 상태 반영)
    await page.waitForTimeout(100);

    // 제출 버튼 클릭
    const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
    if (await submitBtn.isEnabled({ timeout: TIMEOUTS.SHORT }).catch(() => false)) {
      await submitBtn.click();

      // 턴 진행 대기
      await page.waitForFunction(
        () => {
          const phaseEl = document.querySelector('[data-testid="battle-phase"]');
          return phaseEl?.getAttribute('data-phase') !== 'select';
        },
        { timeout: TIMEOUTS.MEDIUM }
      ).catch(() => {});

      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * 전투 결과 확인 및 모달 닫기
 * @returns 'victory' | 'defeat' | null
 */
export async function checkBattleResult(page: Page): Promise<'victory' | 'defeat' | null> {
  const resultModal = page.locator(
    '[data-testid="battle-result-modal"], [data-testid="battle-result"], [data-testid="battle-result-overlay"]'
  );

  if (await resultModal.isVisible({ timeout: TIMEOUTS.MINIMAL }).catch(() => false)) {
    const text = await resultModal.textContent() || '';
    const isVictory = text.includes('승리') || text.includes('victory') || text.includes('Victory');

    // 결과 모달 닫기
    const closeBtn = page.locator(
      '[data-testid="battle-result-close-btn"], button:has-text("확인"), button:has-text("닫기")'
    );
    if (await closeBtn.isVisible({ timeout: TIMEOUTS.SHORT }).catch(() => false)) {
      await closeBtn.click();
    }

    return isVictory ? 'victory' : 'defeat';
  }

  return null;
}

/**
 * 에테르 값 파싱
 * @param target - 'player' 또는 'enemy'
 */
export async function getEther(
  page: Page,
  target: 'player' | 'enemy'
): Promise<number | null> {
  const selector = target === 'player'
    ? '[data-testid="player-ether-box"], [data-testid="player-ether"]'
    : '[data-testid="enemy-ether-box"], [data-testid="enemy-ether"]';

  const etherElement = page.locator(selector).first();

  if (!(await etherElement.isVisible({ timeout: TIMEOUTS.SHORT }).catch(() => false))) {
    return null;
  }

  const text = await etherElement.textContent() || '';
  const match = text.match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

/**
 * 조합(콤보) 이름 가져오기
 */
export async function getComboName(page: Page): Promise<string | null> {
  const comboDisplay = page.locator(
    '[data-testid="player-combo-display"], [data-testid="combo-display"], .combo-display'
  ).first();

  if (await comboDisplay.isVisible({ timeout: TIMEOUTS.SHORT }).catch(() => false)) {
    return await comboDisplay.textContent() || null;
  }

  return null;
}
