/**
 * @file etherAccumulationProcessing.test.js
 * @description 에테르 누적 처리 테스트
 *
 * ## 테스트 대상
 * - processPlayerEtherAccumulation: 플레이어 카드 사용 시 에테르 누적
 * - processEnemyEtherAccumulation: 적 카드 사용 시 에테르 누적
 *
 * ## 주요 테스트 케이스
 * - 유령카드(isGhost) 에테르 제외
 * - 희귀한 조약돌 배율(etherMultiplier) 적용
 * - 카드 업그레이드 레어리티 반영
 * - 에테르 펄스 애니메이션 (300ms)
 * - 상징 발동 수집 및 애니메이션
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processPlayerEtherAccumulation, processEnemyEtherAccumulation } from './etherAccumulationProcessing';
import type { Card, Relic, PassiveStats, RelicTrigger } from '../../../types';
import type { RelicTriggeredRefs } from '../../../types/ui';

// Mock 객체 생성 헬퍼
const createMockCard = (overrides: Partial<Card> = {}): Card => ({
  id: 'test-card',
  name: 'Test Card',
  type: 'attack',
  speedCost: 5,
  actionCost: 1,
  description: 'Test description',
  ...overrides
});

const createMockRelic = (overrides: Partial<Relic> = {}): Relic => ({
  id: 'test-relic',
  name: 'Test Relic',
  icon: '🔮',
  rarity: 'common',
  description: 'Test relic description',
  ...overrides
});

const createMockTriggeredRefs = (): RelicTriggeredRefs => ({
  referenceBookTriggered: { current: false },
  devilDiceTriggered: { current: false }
});

const createMockPassiveStats = (overrides: Partial<PassiveStats> = {}): PassiveStats => ({
  maxEnergy: 3,
  maxHp: 100,
  maxSpeed: 100,
  speed: 0,
  strength: 0,
  agility: 0,
  subSpecialSlots: 0,
  mainSpecialSlots: 0,
  cardDrawBonus: 0,
  etherMultiplier: 1,
  etherFiveCardBonus: 0,
  etherCardMultiplier: false,
  maxSubmitCards: 5,
  extraCardPlay: 0,
  ...overrides
});

describe('etherAccumulationProcessing', () => {
  describe('processPlayerEtherAccumulation', () => {
    const createMockActions = () => ({
      setTurnEtherAccumulated: vi.fn(),
      setEtherPulse: vi.fn(),
      setResolvedPlayerCards: vi.fn(),
      setRelicActivated: vi.fn(),
      setEnemyTurnEtherAccumulated: vi.fn()
    });

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('유령 카드는 에테르를 획득하지 않아야 함', () => {
      const actions = createMockActions();
      const card = createMockCard({ isGhost: true, name: 'Ghost' });

      const result = processPlayerEtherAccumulation({
        card,
        turnEtherAccumulated: 10,
        orderedRelicList: [],
        cardUpgrades: {},
        resolvedPlayerCards: 0,
        playerTimeline: [],
        relics: [],
        triggeredRefs: createMockTriggeredRefs(),
        calculatePassiveEffects: vi.fn(() => createMockPassiveStats()),
        getCardEtherGain: vi.fn(),
        collectTriggeredRelics: vi.fn(() => []),
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
      const card = createMockCard({ id: 'card1', name: 'Common Card' });

      const result = processPlayerEtherAccumulation({
        card,
        turnEtherAccumulated: 10,
        orderedRelicList: [],
        cardUpgrades: {},
        resolvedPlayerCards: 0,
        playerTimeline: [],
        relics: [],
        triggeredRefs: createMockTriggeredRefs(),
        calculatePassiveEffects: vi.fn(() => createMockPassiveStats({ etherMultiplier: 1 })),
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
      const card = createMockCard({ id: 'card1', name: 'Common Card' });

      const result = processPlayerEtherAccumulation({
        card,
        turnEtherAccumulated: 0,
        orderedRelicList: [],
        cardUpgrades: {},
        resolvedPlayerCards: 0,
        playerTimeline: [],
        relics: [],
        triggeredRefs: createMockTriggeredRefs(),
        calculatePassiveEffects: vi.fn(() => createMockPassiveStats({ etherMultiplier: 2 })),
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
      const card = createMockCard({ id: 'card1', name: 'Common Card' });
      const getCardEtherGain = vi.fn(() => 10);

      processPlayerEtherAccumulation({
        card,
        turnEtherAccumulated: 0,
        orderedRelicList: [],
        cardUpgrades: { card1: 'rare' }, // 업그레이드됨
        resolvedPlayerCards: 0,
        playerTimeline: [],
        relics: [],
        triggeredRefs: createMockTriggeredRefs(),
        calculatePassiveEffects: vi.fn(() => createMockPassiveStats({ etherMultiplier: 1 })),
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
      const card = createMockCard({ id: 'card1' });

      processPlayerEtherAccumulation({
        card,
        turnEtherAccumulated: 0,
        orderedRelicList: [],
        cardUpgrades: {},
        resolvedPlayerCards: 0,
        playerTimeline: [],
        relics: [],
        triggeredRefs: createMockTriggeredRefs(),
        calculatePassiveEffects: vi.fn(() => createMockPassiveStats({ etherMultiplier: 1 })),
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
      const card = createMockCard({ id: 'card1' });
      const mockRelicTrigger: RelicTrigger = { id: 'relic1', tone: 1, duration: 300 };
      const collectTriggeredRelics = vi.fn(() => [mockRelicTrigger]);
      const playRelicActivationSequence = vi.fn();

      processPlayerEtherAccumulation({
        card,
        turnEtherAccumulated: 0,
        orderedRelicList: ['relic1'],
        cardUpgrades: {},
        resolvedPlayerCards: 0,
        playerTimeline: [],
        relics: [createMockRelic({ id: 'relic1' })],
        triggeredRefs: createMockTriggeredRefs(),
        calculatePassiveEffects: vi.fn(() => createMockPassiveStats({ etherMultiplier: 1 })),
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
      const card = createMockCard({ id: 'card1' });

      const result = processPlayerEtherAccumulation({
        card,
        turnEtherAccumulated: 0,
        orderedRelicList: [],
        cardUpgrades: {},
        resolvedPlayerCards: 3,
        playerTimeline: [],
        relics: [],
        triggeredRefs: createMockTriggeredRefs(),
        calculatePassiveEffects: vi.fn(() => createMockPassiveStats({ etherMultiplier: 1 })),
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
      const card = createMockCard({ isGhost: true });

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
      const card = createMockCard({ id: 'enemy_card', name: 'Enemy Card' });

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
      const card = createMockCard({ id: 'enemy_card' });

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
