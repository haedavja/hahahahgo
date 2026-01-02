/**
 * @file relicActivationAnimation.test.js
 * @description 상징 발동 애니메이션 시스템 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { collectTriggeredRelics, playRelicActivationSequence } from './relicActivationAnimation';

// RELICS 모킹
vi.mock('../../../data/relics', () => ({
  RELICS: {
    'etherCrystal': {
      effects: { type: 'PASSIVE', comboMultiplierPerCard: 0.1 }
    },
    'rareStone': {
      effects: { type: 'PASSIVE', etherCardMultiplier: 1.2 }
    },
    'referenceBook': {
      effects: { type: 'PASSIVE', etherMultiplier: 1.5 }
    },
    'devilDice': {
      effects: { type: 'PASSIVE', etherFiveCardBonus: 100 }
    },
    'normalRelic': {
      effects: { type: 'PASSIVE', damageBonus: 5 }
    }
  }
}));

describe('relicActivationAnimation', () => {
  describe('collectTriggeredRelics', () => {
    let triggeredRefs: { referenceBookTriggered: { current: boolean }, devilDiceTriggered: { current: boolean } };

    beforeEach(() => {
      triggeredRefs = {
        referenceBookTriggered: { current: false },
        devilDiceTriggered: { current: false }
      };
    });

    it('빈 상징 목록이면 빈 배열 반환', () => {
      const result = collectTriggeredRelics({
        orderedRelicList: [],
        resolvedPlayerCards: 0,
        playerTimeline: [],
        triggeredRefs
      });

      expect(result).toEqual([]);
    });

    it('콤보 배율 상징(etherCrystal) 발동', () => {
      const result = collectTriggeredRelics({
        orderedRelicList: ['etherCrystal'],
        resolvedPlayerCards: 0,
        playerTimeline: [{}],
        triggeredRefs
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('etherCrystal');
      expect(result[0].tone).toBe(800);
    });

    it('에테르 배율 상징(rareStone) 카드마다 발동', () => {
      const result = collectTriggeredRelics({
        orderedRelicList: ['rareStone'],
        resolvedPlayerCards: 1,
        playerTimeline: [{}, {}],
        triggeredRefs
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rareStone');
    });

    it('참고서(referenceBook)는 마지막 카드에서만 발동', () => {
      // 마지막 카드가 아닐 때
      const resultNotLast = collectTriggeredRelics({
        orderedRelicList: ['referenceBook'],
        resolvedPlayerCards: 0,
        playerTimeline: [{}, {}],
        triggeredRefs
      });

      expect(resultNotLast).toHaveLength(0);

      // 마지막 카드일 때
      const resultLast = collectTriggeredRelics({
        orderedRelicList: ['referenceBook'],
        resolvedPlayerCards: 1,
        playerTimeline: [{}, {}],
        triggeredRefs
      });

      expect(resultLast).toHaveLength(1);
      expect(resultLast[0].id).toBe('referenceBook');
    });

    it('참고서는 한 번만 발동', () => {
      triggeredRefs.referenceBookTriggered.current = true;

      const result = collectTriggeredRelics({
        orderedRelicList: ['referenceBook'],
        resolvedPlayerCards: 1,
        playerTimeline: [{}, {}],
        triggeredRefs
      });

      expect(result).toHaveLength(0);
    });

    it('악마의 주사위(devilDice)는 5장째 카드에서 발동', () => {
      // 4장째 - 발동 안함
      const result4 = collectTriggeredRelics({
        orderedRelicList: ['devilDice'],
        resolvedPlayerCards: 3,
        playerTimeline: [{}, {}, {}, {}, {}],
        triggeredRefs
      });

      expect(result4).toHaveLength(0);

      // 5장째 - 발동
      const result5 = collectTriggeredRelics({
        orderedRelicList: ['devilDice'],
        resolvedPlayerCards: 4,
        playerTimeline: [{}, {}, {}, {}, {}],
        triggeredRefs
      });

      expect(result5).toHaveLength(1);
      expect(result5[0].id).toBe('devilDice');
      expect(result5[0].tone).toBe(980);
    });

    it('악마의 주사위는 한 번만 발동', () => {
      triggeredRefs.devilDiceTriggered.current = true;

      const result = collectTriggeredRelics({
        orderedRelicList: ['devilDice'],
        resolvedPlayerCards: 4,
        playerTimeline: [{}, {}, {}, {}, {}],
        triggeredRefs
      });

      expect(result).toHaveLength(0);
    });

    it('일반 상징은 발동하지 않음', () => {
      const result = collectTriggeredRelics({
        orderedRelicList: ['normalRelic'],
        resolvedPlayerCards: 0,
        playerTimeline: [{}],
        triggeredRefs
      });

      expect(result).toHaveLength(0);
    });

    it('여러 상징 동시 발동', () => {
      const result = collectTriggeredRelics({
        orderedRelicList: ['etherCrystal', 'rareStone'],
        resolvedPlayerCards: 0,
        playerTimeline: [{}],
        triggeredRefs
      });

      expect(result).toHaveLength(2);
    });
  });

  describe('playRelicActivationSequence', () => {
    let flashRelic: ReturnType<typeof vi.fn>;
    let setRelicActivated: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.useFakeTimers();
      flashRelic = vi.fn();
      setRelicActivated = vi.fn();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('빈 목록이면 아무 동작 안함', () => {
      playRelicActivationSequence([], flashRelic as any, setRelicActivated as any);

      expect(flashRelic).not.toHaveBeenCalled();
      expect(setRelicActivated).not.toHaveBeenCalled();
    });

    it('상징 하나만 있으면 해당 상징 플래시', () => {
      const triggered = [
        { id: 'etherCrystal', tone: 800, duration: 500 }
      ];

      playRelicActivationSequence(triggered, flashRelic as any, setRelicActivated as any);

      expect(flashRelic).toHaveBeenCalledWith('etherCrystal', 800, 500);
    });

    it('여러 상징 순차 플래시', () => {
      const triggered = [
        { id: 'etherCrystal', tone: 800, duration: 500 },
        { id: 'rareStone', tone: 820, duration: 400 }
      ];

      playRelicActivationSequence(triggered, flashRelic as any, setRelicActivated as any);

      expect(flashRelic).toHaveBeenCalledWith('etherCrystal', 800, 500);

      // 첫 번째 상징 duration의 60% 후 다음 상징 플래시
      vi.advanceTimersByTime(300);

      expect(flashRelic).toHaveBeenCalledWith('rareStone', 820, 400);
    });

    it('모든 상징 플래시 후 setRelicActivated(null) 호출', () => {
      const triggered = [
        { id: 'etherCrystal', tone: 800, duration: 500 }
      ];

      playRelicActivationSequence(triggered, flashRelic as any, setRelicActivated as any);

      // duration * 0.6 = 300ms 후 완료
      vi.advanceTimersByTime(300);

      expect(setRelicActivated).toHaveBeenCalledWith(null);
    });

    it('duration이 작으면 최소 200ms 대기', () => {
      const triggered = [
        { id: 'relic1', tone: 800, duration: 100 },
        { id: 'relic2', tone: 820, duration: 400 }
      ];

      playRelicActivationSequence(triggered, flashRelic as any, setRelicActivated as any);

      expect(flashRelic).toHaveBeenCalledWith('relic1', 800, 100);

      // 100 * 0.6 = 60ms 이지만 최소 200ms
      vi.advanceTimersByTime(199);
      expect(flashRelic).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1);
      expect(flashRelic).toHaveBeenCalledWith('relic2', 820, 400);
    });
  });
});
