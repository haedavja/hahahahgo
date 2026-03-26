/**
 * @file assertions.ts
 * @description 게임 특화 커스텀 Assertions
 *
 * ## 사용법
 * ```typescript
 * import { GameAssertions } from './assertions';
 *
 * const assertions = new GameAssertions(page);
 * await assertions.expectPlayerHP(50, 80);
 * await assertions.expectCombo('페어');
 * await assertions.expectEtherGain(20);
 * ```
 */

import { Page, expect, Locator } from '@playwright/test';
import { testLogger } from './test-helpers';

/**
 * HP 정보
 */
interface HPInfo {
  current: number;
  max: number;
}

/**
 * 에테르 정보
 */
interface EtherInfo {
  current: number;
  threshold: number;
}

/**
 * 게임 특화 Assertions 클래스
 */
export class GameAssertions {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ==================== HP Assertions ====================

  /**
   * 플레이어 HP 검증
   */
  async expectPlayerHP(expectedCurrent: number, expectedMax?: number): Promise<void> {
    const hp = await this.getPlayerHP();

    expect(hp.current, `플레이어 현재 HP가 ${expectedCurrent}이어야 함`).toBe(expectedCurrent);

    if (expectedMax !== undefined) {
      expect(hp.max, `플레이어 최대 HP가 ${expectedMax}이어야 함`).toBe(expectedMax);
    }
  }

  /**
   * 플레이어 HP 범위 검증
   */
  async expectPlayerHPInRange(minHP: number, maxHP: number): Promise<void> {
    const hp = await this.getPlayerHP();

    expect(hp.current, `플레이어 HP가 ${minHP}~${maxHP} 범위여야 함`)
      .toBeGreaterThanOrEqual(minHP);
    expect(hp.current).toBeLessThanOrEqual(maxHP);
  }

  /**
   * 적 HP 검증
   */
  async expectEnemyHP(expectedCurrent: number, expectedMax?: number): Promise<void> {
    const hp = await this.getEnemyHP();

    expect(hp.current, `적 현재 HP가 ${expectedCurrent}이어야 함`).toBe(expectedCurrent);

    if (expectedMax !== undefined) {
      expect(hp.max, `적 최대 HP가 ${expectedMax}이어야 함`).toBe(expectedMax);
    }
  }

  /**
   * 적 HP 감소 검증
   */
  async expectEnemyHPDecreased(previousHP: number): Promise<void> {
    const hp = await this.getEnemyHP();

    expect(hp.current, `적 HP가 ${previousHP}에서 감소해야 함`)
      .toBeLessThan(previousHP);
  }

  /**
   * HP 값 추출 헬퍼
   */
  private async getPlayerHP(): Promise<HPInfo> {
    return this.getHP('[data-testid="player-hp"]');
  }

  private async getEnemyHP(): Promise<HPInfo> {
    return this.getHP('[data-testid="enemy-hp"]');
  }

  private async getHP(selector: string): Promise<HPInfo> {
    const element = this.page.locator(selector);

    if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
      const current = parseInt(await element.getAttribute('data-hp-current') || '0');
      const max = parseInt(await element.getAttribute('data-hp-max') || '0');

      if (current > 0 || max > 0) {
        return { current, max };
      }

      // 텍스트에서 추출 시도
      const text = await element.textContent() || '';
      const match = text.match(/(\d+)\s*\/\s*(\d+)/);
      if (match) {
        return { current: parseInt(match[1]), max: parseInt(match[2]) };
      }
    }

    return { current: 0, max: 0 };
  }

  // ==================== 에테르 Assertions ====================

  /**
   * 플레이어 에테르 검증
   */
  async expectPlayerEther(expected: number): Promise<void> {
    const ether = await this.getPlayerEther();

    expect(ether, `플레이어 에테르가 ${expected}이어야 함`).toBe(expected);
  }

  /**
   * 에테르 범위 검증
   */
  async expectEtherInRange(min: number, max: number): Promise<void> {
    const ether = await this.getPlayerEther();

    expect(ether, `에테르가 ${min}~${max} 범위여야 함`)
      .toBeGreaterThanOrEqual(min);
    expect(ether).toBeLessThanOrEqual(max);
  }

  /**
   * 에테르 증가 검증
   */
  async expectEtherIncreased(previousEther: number): Promise<void> {
    const ether = await this.getPlayerEther();

    expect(ether, `에테르가 ${previousEther}에서 증가해야 함`)
      .toBeGreaterThan(previousEther);
  }

  /**
   * 에테르 버스트 검증
   */
  async expectEtherBurst(): Promise<void> {
    const burstIndicator = this.page.locator(
      '[data-testid="ether-burst"], .ether-burst, [data-burst="true"]'
    );

    await expect(burstIndicator, '에테르 버스트가 발생해야 함').toBeVisible({ timeout: 3000 });
  }

  /**
   * 에테르 값 추출
   */
  private async getPlayerEther(): Promise<number> {
    const selectors = ['[data-testid="player-ether"]', '.player-ether'];

    for (const selector of selectors) {
      const element = this.page.locator(selector);
      if (await element.isVisible({ timeout: 500 }).catch(() => false)) {
        const value = await element.getAttribute('data-ether-value');
        if (value) return parseInt(value);

        const text = await element.textContent() || '';
        const match = text.match(/(\d+)/);
        if (match) return parseInt(match[1]);
      }
    }

    return 0;
  }

  // ==================== 조합 Assertions ====================

  /**
   * 현재 조합 검증
   */
  async expectCombo(expectedCombo: string): Promise<void> {
    const combo = await this.getCurrentCombo();

    expect(combo, `조합이 '${expectedCombo}'이어야 함`).toContain(expectedCombo);
  }

  /**
   * 조합 없음 검증
   */
  async expectNoCombo(): Promise<void> {
    const combo = await this.getCurrentCombo();

    expect(combo === null || combo === '' || combo?.includes('하이카드'),
      '조합이 없거나 하이카드여야 함'
    ).toBe(true);
  }

  /**
   * 조합 배율 검증
   */
  async expectComboMultiplier(minMultiplier: number): Promise<void> {
    const multiplierElement = this.page.locator('[data-testid="combo-multiplier"]');

    if (await multiplierElement.isVisible({ timeout: 1000 }).catch(() => false)) {
      const text = await multiplierElement.textContent() || '';
      const match = text.match(/(\d+\.?\d*)x?/);
      if (match) {
        const multiplier = parseFloat(match[1]);
        expect(multiplier, `조합 배율이 ${minMultiplier}x 이상이어야 함`)
          .toBeGreaterThanOrEqual(minMultiplier);
      }
    }
  }

  /**
   * 조합 이름 추출
   */
  private async getCurrentCombo(): Promise<string | null> {
    const comboDisplay = this.page.locator('[data-testid="combo-display"], .combo-name');

    if (await comboDisplay.isVisible({ timeout: 500 }).catch(() => false)) {
      return await comboDisplay.textContent();
    }

    return null;
  }

  // ==================== 전투 상태 Assertions ====================

  /**
   * 전투 페이즈 검증
   */
  async expectBattlePhase(expectedPhase: 'select' | 'respond' | 'resolve'): Promise<void> {
    const phaseElement = this.page.locator('[data-testid="battle-phase"]');
    const phase = await phaseElement.getAttribute('data-phase');

    expect(phase, `전투 페이즈가 '${expectedPhase}'이어야 함`).toBe(expectedPhase);
  }

  /**
   * 전투 종료 검증
   */
  async expectBattleEnded(result?: 'victory' | 'defeat'): Promise<void> {
    const resultElement = this.page.locator('[data-testid="battle-result"]');

    await expect(resultElement, '전투가 종료되어야 함').toBeVisible({ timeout: 30000 });

    if (result) {
      const text = await resultElement.textContent() || '';
      const isVictory = text.includes('승리') || text.toLowerCase().includes('victory');

      if (result === 'victory') {
        expect(isVictory, '승리해야 함').toBe(true);
      } else {
        expect(isVictory, '패배해야 함').toBe(false);
      }
    }
  }

  /**
   * 전투 진행 중 검증
   */
  async expectBattleInProgress(): Promise<void> {
    const battleScreen = this.page.locator('[data-testid="battle-screen"]');
    const battleResult = this.page.locator('[data-testid="battle-result"]');

    await expect(battleScreen, '전투 화면이 표시되어야 함').toBeVisible();
    expect(await battleResult.isVisible().catch(() => false), '전투가 아직 끝나지 않아야 함').toBe(false);
  }

  // ==================== 카드/핸드 Assertions ====================

  /**
   * 핸드 카드 수 검증
   */
  async expectHandSize(expectedSize: number): Promise<void> {
    const cards = this.page.locator('[data-testid^="hand-card-"]');
    const count = await cards.count();

    expect(count, `핸드에 ${expectedSize}장이 있어야 함`).toBe(expectedSize);
  }

  /**
   * 핸드 카드 수 범위 검증
   */
  async expectHandSizeInRange(min: number, max: number): Promise<void> {
    const cards = this.page.locator('[data-testid^="hand-card-"]');
    const count = await cards.count();

    expect(count, `핸드에 ${min}~${max}장이 있어야 함`)
      .toBeGreaterThanOrEqual(min);
    expect(count).toBeLessThanOrEqual(max);
  }

  /**
   * 카드 선택 상태 검증
   */
  async expectCardSelected(cardIndex: number): Promise<void> {
    const card = this.page.locator(`[data-testid="hand-card-${cardIndex}"]`);
    const selected = await card.getAttribute('data-card-selected');

    expect(selected, `카드 ${cardIndex}가 선택되어야 함`).toBe('true');
  }

  /**
   * 선택된 카드 수 검증
   */
  async expectSelectedCardCount(expectedCount: number): Promise<void> {
    const selectedCards = this.page.locator('[data-card-selected="true"]');
    const count = await selectedCards.count();

    expect(count, `선택된 카드가 ${expectedCount}장이어야 함`).toBe(expectedCount);
  }

  // ==================== 상징/이변 Assertions ====================

  /**
   * 상징 보유 검증
   */
  async expectRelicOwned(relicId: string): Promise<void> {
    const relic = this.page.locator(`[data-testid="relic-${relicId}"], [data-relic-id="${relicId}"]`);

    await expect(relic, `상징 '${relicId}'를 보유해야 함`).toBeVisible();
  }

  /**
   * 상징 발동 검증
   */
  async expectRelicActivated(relicId: string): Promise<void> {
    const activation = this.page.locator(
      `[data-testid="relic-activation-${relicId}"], [data-relic-active="${relicId}"]`
    );

    await expect(activation, `상징 '${relicId}'가 발동해야 함`).toBeVisible({ timeout: 2000 });
  }

  /**
   * 이변 활성 검증
   */
  async expectAnomalyActive(anomalyId: string): Promise<void> {
    const anomaly = this.page.locator(
      `[data-testid="anomaly-${anomalyId}"], [data-anomaly-id="${anomalyId}"]`
    );

    await expect(anomaly, `이변 '${anomalyId}'가 활성화되어야 함`).toBeVisible();
  }

  // ==================== 상태이상 Assertions ====================

  /**
   * 상태이상 적용 검증
   */
  async expectStatusEffect(
    target: 'player' | 'enemy',
    effectType: string
  ): Promise<void> {
    const targetPrefix = target === 'player' ? 'player' : 'enemy';
    const statusEffect = this.page.locator(
      `[data-testid="${targetPrefix}-status-${effectType}"], [data-status-type="${effectType}"]`
    );

    await expect(statusEffect, `${target}에게 '${effectType}' 상태이상이 있어야 함`)
      .toBeVisible({ timeout: 2000 });
  }

  /**
   * 상태이상 스택 검증
   */
  async expectStatusEffectStacks(
    target: 'player' | 'enemy',
    effectType: string,
    expectedStacks: number
  ): Promise<void> {
    const targetPrefix = target === 'player' ? 'player' : 'enemy';
    const statusEffect = this.page.locator(
      `[data-testid="${targetPrefix}-status-${effectType}"]`
    );

    const stacks = parseInt(await statusEffect.getAttribute('data-stacks') || '0');
    expect(stacks, `${effectType} 스택이 ${expectedStacks}이어야 함`).toBe(expectedStacks);
  }

  // ==================== 골드/자원 Assertions ====================

  /**
   * 골드 검증
   */
  async expectGold(expectedGold: number): Promise<void> {
    const goldElement = this.page.locator('[data-testid="player-gold"], [data-testid="gold-display"]');

    const gold = parseInt(await goldElement.getAttribute('data-gold-value') || '0');
    expect(gold, `골드가 ${expectedGold}이어야 함`).toBe(expectedGold);
  }

  /**
   * 골드 변화 검증
   */
  async expectGoldChanged(previousGold: number, expectedChange: number): Promise<void> {
    const goldElement = this.page.locator('[data-testid="player-gold"]');
    const currentGold = parseInt(await goldElement.getAttribute('data-gold-value') || '0');

    const actualChange = currentGold - previousGold;
    expect(actualChange, `골드가 ${expectedChange}만큼 변해야 함`).toBe(expectedChange);
  }

  // ==================== UI 상태 Assertions ====================

  /**
   * 모달 표시 검증
   */
  async expectModalVisible(modalType: 'shop' | 'event' | 'rest' | 'reward'): Promise<void> {
    const modal = this.page.locator(`[data-testid="${modalType}-modal"]`);

    await expect(modal, `${modalType} 모달이 표시되어야 함`).toBeVisible({ timeout: 5000 });
  }

  /**
   * 모달 닫힘 검증
   */
  async expectModalClosed(modalType: 'shop' | 'event' | 'rest' | 'reward'): Promise<void> {
    const modal = this.page.locator(`[data-testid="${modalType}-modal"]`);

    await expect(modal, `${modalType} 모달이 닫혀야 함`).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * 맵 화면 검증
   */
  async expectOnMap(): Promise<void> {
    const mapContainer = this.page.locator('[data-testid="map-container"]');

    await expect(mapContainer, '맵 화면이어야 함').toBeVisible({ timeout: 5000 });
  }

  // ==================== 복합 Assertions ====================

  /**
   * 전투 상태 스냅샷 검증
   */
  async expectBattleState(expected: {
    playerHP?: number;
    enemyHP?: number;
    playerEther?: number;
    combo?: string;
    phase?: 'select' | 'respond' | 'resolve';
  }): Promise<void> {
    const errors: string[] = [];

    if (expected.playerHP !== undefined) {
      const hp = await this.getPlayerHP();
      if (hp.current !== expected.playerHP) {
        errors.push(`플레이어 HP: 예상 ${expected.playerHP}, 실제 ${hp.current}`);
      }
    }

    if (expected.enemyHP !== undefined) {
      const hp = await this.getEnemyHP();
      if (hp.current !== expected.enemyHP) {
        errors.push(`적 HP: 예상 ${expected.enemyHP}, 실제 ${hp.current}`);
      }
    }

    if (expected.playerEther !== undefined) {
      const ether = await this.getPlayerEther();
      if (ether !== expected.playerEther) {
        errors.push(`플레이어 에테르: 예상 ${expected.playerEther}, 실제 ${ether}`);
      }
    }

    if (expected.combo !== undefined) {
      const combo = await this.getCurrentCombo();
      if (!combo?.includes(expected.combo)) {
        errors.push(`조합: 예상 ${expected.combo}, 실제 ${combo}`);
      }
    }

    if (expected.phase !== undefined) {
      const phaseElement = this.page.locator('[data-testid="battle-phase"]');
      const phase = await phaseElement.getAttribute('data-phase');
      if (phase !== expected.phase) {
        errors.push(`페이즈: 예상 ${expected.phase}, 실제 ${phase}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`전투 상태 불일치:\n${errors.join('\n')}`);
    }
  }
}

/**
 * Assertions 인스턴스 생성 헬퍼
 */
export function createAssertions(page: Page): GameAssertions {
  return new GameAssertions(page);
}
