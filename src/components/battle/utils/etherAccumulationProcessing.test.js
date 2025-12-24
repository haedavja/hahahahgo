/**
 * @file etherAccumulationProcessing.test.js
 * @description etherAccumulationProcessing 함수 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processPlayerEtherAccumulation, processEnemyEtherAccumulation } from './etherAccumulationProcessing';

describe('etherAccumulationProcessing', () => {
  describe('processPlayerEtherAccumulation', () => {
    const createMockActions = () => ({
      setTurnEtherAccumulated: vi.fn(),
      setEtherPulse: vi.fn(),
      setResolvedPlayerCards: vi.fn(),
      setRelicActivated: vi.fn()
    });

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('유령 카드는 에테르를 획득하지 않아야 함', () => {
      const actions = createMockActions();
      const card = { isGhost: true, name: 'Ghost' };

      const result = processPlayerEtherAccumulation({
        card,
        turnEtherAccumulated: 10,
        orderedRelicList: [],
        cardUpgrades: {},
        resolvedPlayerCards: 0,
        playerTimeline: [],
        relics: [],
        triggeredRefs: { current: {} },
        calculatePassiveEffects: vi.fn(),
        getCardEtherGain: vi.fn(),
        collectTriggeredRelics: vi.fn(),
        playRelicActivationSequence: vi.fn(),
        flashRelic: vi.fn(),
        actions
      });

      expect(result.newTurnEther).toBe(10); // 변경 없음
      expect(result.newResolvedPlayerCards).toBe(1);
      expect(actions.setResolvedPlayerCards).toHaveBeenCalledWith(1);
    });

    it('카드 에테르를 누적해야 함', () => {
      const actions = createMockActions();
      const card = { id: 'card1', rarity: 'common' };

      const result = processPlayerEtherAccumulation({
        card,
        turnEtherAccumulated: 10,
        orderedRelicList: [],
        cardUpgrades: {},
        resolvedPlayerCards: 0,
        playerTimeline: [],
        relics: [],
        triggeredRefs: { current: {} },
        calculatePassiveEffects: vi.fn(() => ({ etherMultiplier: 1 })),
        getCardEtherGain: vi.fn(() => 5),
        collectTriggeredRelics: vi.fn(() => []),
        playRelicActivationSequence: vi.fn(),
        flashRelic: vi.fn(),
        actions
      });

      expect(result.newTurnEther).toBe(15); // 10 + 5
      expect(actions.setTurnEtherAccumulated).toHaveBeenCalledWith(15);
    });

    it('에테르 배율을 적용해야 함', () => {
      const actions = createMockActions();
      const card = { id: 'card1', rarity: 'common' };

      const result = processPlayerEtherAccumulation({
        card,
        turnEtherAccumulated: 0,
        orderedRelicList: [],
        cardUpgrades: {},
        resolvedPlayerCards: 0,
        playerTimeline: [],
        relics: [],
        triggeredRefs: { current: {} },
        calculatePassiveEffects: vi.fn(() => ({ etherMultiplier: 2 })),
        getCardEtherGain: vi.fn(() => 5),
        collectTriggeredRelics: vi.fn(() => []),
        playRelicActivationSequence: vi.fn(),
        flashRelic: vi.fn(),
        actions
      });

      expect(result.newTurnEther).toBe(10); // 5 * 2
    });

    it('업그레이드된 카드 레어리티를 사용해야 함', () => {
      const actions = createMockActions();
      const card = { id: 'card1', rarity: 'common' };
      const getCardEtherGain = vi.fn(() => 10);

      processPlayerEtherAccumulation({
        card,
        turnEtherAccumulated: 0,
        orderedRelicList: [],
        cardUpgrades: { card1: 'rare' }, // 업그레이드됨
        resolvedPlayerCards: 0,
        playerTimeline: [],
        relics: [],
        triggeredRefs: { current: {} },
        calculatePassiveEffects: vi.fn(() => ({ etherMultiplier: 1 })),
        getCardEtherGain,
        collectTriggeredRelics: vi.fn(() => []),
        playRelicActivationSequence: vi.fn(),
        flashRelic: vi.fn(),
        actions
      });

      // getCardEtherGain에 업그레이드된 레어리티가 전달되어야 함
      expect(getCardEtherGain).toHaveBeenCalledWith(expect.objectContaining({ rarity: 'rare' }));
    });

    it('에테르 펄스 애니메이션을 활성화해야 함', () => {
      const actions = createMockActions();
      const card = { id: 'card1' };

      processPlayerEtherAccumulation({
        card,
        turnEtherAccumulated: 0,
        orderedRelicList: [],
        cardUpgrades: {},
        resolvedPlayerCards: 0,
        playerTimeline: [],
        relics: [],
        triggeredRefs: { current: {} },
        calculatePassiveEffects: vi.fn(() => ({ etherMultiplier: 1 })),
        getCardEtherGain: vi.fn(() => 5),
        collectTriggeredRelics: vi.fn(() => []),
        playRelicActivationSequence: vi.fn(),
        flashRelic: vi.fn(),
        actions
      });

      expect(actions.setEtherPulse).toHaveBeenCalledWith(true);

      vi.advanceTimersByTime(300);

      expect(actions.setEtherPulse).toHaveBeenCalledWith(false);
    });

    it('상징이 있으면 발동 상징을 수집해야 함', () => {
      const actions = createMockActions();
      const card = { id: 'card1' };
      const collectTriggeredRelics = vi.fn(() => ['relic1']);
      const playRelicActivationSequence = vi.fn();

      processPlayerEtherAccumulation({
        card,
        turnEtherAccumulated: 0,
        orderedRelicList: ['relic1'],
        cardUpgrades: {},
        resolvedPlayerCards: 0,
        playerTimeline: [],
        relics: ['relic1'],
        triggeredRefs: { current: {} },
        calculatePassiveEffects: vi.fn(() => ({ etherMultiplier: 1 })),
        getCardEtherGain: vi.fn(() => 5),
        collectTriggeredRelics,
        playRelicActivationSequence,
        flashRelic: vi.fn(),
        actions
      });

      expect(collectTriggeredRelics).toHaveBeenCalled();
      expect(playRelicActivationSequence).toHaveBeenCalled();
    });

    it('해결된 카드 수를 증가시켜야 함', () => {
      const actions = createMockActions();
      const card = { id: 'card1' };

      const result = processPlayerEtherAccumulation({
        card,
        turnEtherAccumulated: 0,
        orderedRelicList: [],
        cardUpgrades: {},
        resolvedPlayerCards: 3,
        playerTimeline: [],
        relics: [],
        triggeredRefs: { current: {} },
        calculatePassiveEffects: vi.fn(() => ({ etherMultiplier: 1 })),
        getCardEtherGain: vi.fn(() => 5),
        collectTriggeredRelics: vi.fn(() => []),
        playRelicActivationSequence: vi.fn(),
        flashRelic: vi.fn(),
        actions
      });

      expect(result.newResolvedPlayerCards).toBe(4);
      expect(actions.setResolvedPlayerCards).toHaveBeenCalledWith(4);
    });
  });

  describe('processEnemyEtherAccumulation', () => {
    const createMockActions = () => ({
      setEnemyTurnEtherAccumulated: vi.fn()
    });

    it('유령 카드는 에테르를 획득하지 않아야 함', () => {
      const actions = createMockActions();
      const card = { isGhost: true };

      const result = processEnemyEtherAccumulation({
        card,
        enemyTurnEtherAccumulated: 10,
        getCardEtherGain: vi.fn(),
        actions
      });

      expect(result).toBe(10);
      expect(actions.setEnemyTurnEtherAccumulated).not.toHaveBeenCalled();
    });

    it('카드 에테르를 누적해야 함', () => {
      const actions = createMockActions();
      const card = { id: 'enemy_card', rarity: 'common' };

      const result = processEnemyEtherAccumulation({
        card,
        enemyTurnEtherAccumulated: 10,
        getCardEtherGain: vi.fn(() => 5),
        actions
      });

      expect(result).toBe(15);
      expect(actions.setEnemyTurnEtherAccumulated).toHaveBeenCalledWith(15);
    });

    it('0에서 시작해도 정상 동작해야 함', () => {
      const actions = createMockActions();
      const card = { id: 'enemy_card' };

      const result = processEnemyEtherAccumulation({
        card,
        enemyTurnEtherAccumulated: 0,
        getCardEtherGain: vi.fn(() => 8),
        actions
      });

      expect(result).toBe(8);
    });
  });
});
