/**
 * @file etherCalculationAnimation.test.js
 * @description 에테르 계산 애니메이션 시스템 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startEtherCalculationAnimationSequence } from './etherCalculationAnimation';

describe('etherCalculationAnimation', () => {
  let actions: { setEtherCalcPhase: ReturnType<typeof vi.fn> };
  let playSound: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    actions = {
      setEtherCalcPhase: vi.fn()
    };
    playSound = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('startEtherCalculationAnimationSequence', () => {
    it('에테르가 0 이하면 아무 동작 안함', () => {
      startEtherCalculationAnimationSequence({
        turnEtherAccumulated: 0,
        selected: [],
        player: {},
        playSound,
        actions
      });

      expect(actions.setEtherCalcPhase).not.toHaveBeenCalled();
      expect(playSound).not.toHaveBeenCalled();
    });

    it('에테르가 음수면 아무 동작 안함', () => {
      startEtherCalculationAnimationSequence({
        turnEtherAccumulated: -10,
        selected: [],
        player: {},
        playSound,
        actions
      });

      expect(actions.setEtherCalcPhase).not.toHaveBeenCalled();
    });

    it('1단계: sum 페이즈 즉시 시작', () => {
      startEtherCalculationAnimationSequence({
        turnEtherAccumulated: 50,
        selected: [{ actionCost: 1 }],
        player: {},
        playSound,
        actions
      });

      expect(actions.setEtherCalcPhase).toHaveBeenCalledWith('sum');
    });

    it('2단계: 400ms 후 multiply 페이즈', () => {
      startEtherCalculationAnimationSequence({
        turnEtherAccumulated: 50,
        selected: [{ actionCost: 1 }],
        player: {},
        playSound,
        actions
      });

      vi.advanceTimersByTime(400);

      expect(actions.setEtherCalcPhase).toHaveBeenCalledWith('multiply');
      expect(playSound).toHaveBeenCalledWith(800, 100);
    });

    it('4단계: 최종 result 페이즈', () => {
      startEtherCalculationAnimationSequence({
        turnEtherAccumulated: 50,
        selected: [{ actionCost: 1 }],
        player: {},
        playSound,
        actions
      });

      // sum(0) -> multiply(400) -> result(400+600 = 1000), 디플레이션 없으면 바로 result
      vi.advanceTimersByTime(1100);

      expect(actions.setEtherCalcPhase).toHaveBeenCalledWith('result');
      expect(playSound).toHaveBeenCalledWith(400, 200);
    });

    it('에테르 배율이 1보다 크면 onMultiplierConsumed 호출', () => {
      const onMultiplierConsumed = vi.fn();

      startEtherCalculationAnimationSequence({
        turnEtherAccumulated: 50,
        selected: [{ actionCost: 1 }],
        player: { etherMultiplier: 2 },
        playSound,
        actions,
        onMultiplierConsumed
      });

      vi.advanceTimersByTime(400);

      expect(onMultiplierConsumed).toHaveBeenCalled();
    });

    it('에테르 배율이 1이면 onMultiplierConsumed 호출 안함', () => {
      const onMultiplierConsumed = vi.fn();

      startEtherCalculationAnimationSequence({
        turnEtherAccumulated: 50,
        selected: [{ actionCost: 1 }],
        player: { etherMultiplier: 1 },
        playSound,
        actions,
        onMultiplierConsumed
      });

      vi.advanceTimersByTime(400);

      expect(onMultiplierConsumed).not.toHaveBeenCalled();
    });

    it('콤보 사용 횟수가 있으면 deflation 페이즈 표시', () => {
      // 페어 콤보: 같은 actionCost 2장
      const selected = [
        { actionCost: 2, type: 'attack' },
        { actionCost: 2, type: 'attack' }
      ];

      startEtherCalculationAnimationSequence({
        turnEtherAccumulated: 50,
        selected,
        player: { comboUsageCount: { '페어': 5 } }, // 이미 5번 사용
        playSound,
        actions
      });

      // sum(0) -> multiply(400) -> deflation(400+600 = 1000)
      vi.advanceTimersByTime(1000);

      expect(actions.setEtherCalcPhase).toHaveBeenCalledWith('deflation');
      expect(playSound).toHaveBeenCalledWith(200, 150);
    });
  });
});
