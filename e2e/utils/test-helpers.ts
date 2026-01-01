import { Page, Locator, expect } from '@playwright/test';

/**
 * E2E 테스트 헬퍼 함수들
 * 최적화: waitForTimeout 대신 상태 기반 대기 사용
 */

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
 */
export async function selectMapNode(page: Page, nodeType: string): Promise<boolean> {
  // 먼저 고유 ID로 시도
  let node = page.locator(`[data-testid="map-node-${nodeType}"]`).first();

  if (!(await node.isVisible({ timeout: 1000 }).catch(() => false))) {
    // 타입으로 시도 (선택 가능한 노드만)
    node = page.locator(`[data-node-type="${nodeType}"][data-node-selectable="true"]`).first();
  }

  if (await node.isVisible({ timeout: 1000 }).catch(() => false)) {
    await node.click();
    // 노드 클릭 후 상태 변화 대기
    await page.waitForFunction(
      (type) => {
        const battleScreen = document.querySelector('[data-testid="battle-screen"]');
        const modal = document.querySelector('[data-testid$="-modal"]');
        return battleScreen !== null || modal !== null;
      },
      nodeType,
      { timeout: 3000 }
    ).catch(() => {});
    return true;
  }

  return false;
}

/**
 * 전투 자동 진행 (단순화된 버전 - 빠른 테스트용)
 */
export async function quickAutoBattle(page: Page, maxTurns: number = 15): Promise<'victory' | 'defeat' | 'timeout'> {
  for (let turn = 0; turn < maxTurns; turn++) {
    // 전투 결과 확인
    const resultModal = page.locator('[data-testid="battle-result-modal"], [data-testid="battle-result"]');
    if (await resultModal.isVisible({ timeout: 200 }).catch(() => false)) {
      const resultText = await resultModal.textContent();
      const result = resultText?.includes('승리') ? 'victory' : 'defeat';

      // 결과 모달 닫기
      const closeBtn = page.locator('[data-testid="battle-result-close-btn"], button:has-text("확인")');
      if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await closeBtn.click();
      }
      return result;
    }

    // 패배 플래그 확인
    if (await page.locator('[data-testid="defeat-flag"]').isVisible({ timeout: 100 }).catch(() => false)) {
      return 'defeat';
    }

    // 카드 선택 (첫 번째 카드)
    const handCards = page.locator('[data-testid^="hand-card-"]');
    if (await handCards.first().isVisible({ timeout: 300 }).catch(() => false)) {
      await handCards.first().click().catch(() => {});
    }

    // 제출 버튼 클릭
    const submitBtn = page.locator('[data-testid="submit-cards-btn"]');
    if (await submitBtn.isEnabled({ timeout: 300 }).catch(() => false)) {
      await submitBtn.click().catch(() => {});
      // 상태 변화 대기
      await page.waitForFunction(
        () => {
          const timeline = document.querySelector('[data-testid="timeline-container"]');
          const result = document.querySelector('[data-testid="battle-result"]');
          return timeline !== null || result !== null;
        },
        { timeout: 1000 }
      ).catch(() => {});
    }
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
 * 모달 닫기
 */
export async function closeModal(page: Page): Promise<void> {
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
