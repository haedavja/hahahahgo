/**
 * @file enemyEtherAnimation.test.ts
 * @description 적 에테르 애니메이션 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startEnemyEtherAnimation } from './enemyEtherAnimation';

describe('enemyEtherAnimation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('startEnemyEtherAnimation', () => {
    it('enemyFinalEther가 0 이하면 애니메이션 시작 안함', () => {
      const actions = {
        setEnemyEtherCalcPhase: vi.fn(),
        setEnemyCurrentDeflation: vi.fn(),
      };

      startEnemyEtherAnimation({
        enemyFinalEther: 0,
        enemyEther: { deflation: { multiplier: 1, usageCount: 0 } },
        actions,
      });

      expect(actions.setEnemyEtherCalcPhase).not.toHaveBeenCalled();
    });

    it('애니메이션 시작 시 sum 페이즈 설정', () => {
      const actions = {
        setEnemyEtherCalcPhase: vi.fn(),
        setEnemyCurrentDeflation: vi.fn(),
      };

      startEnemyEtherAnimation({
        enemyFinalEther: 100,
        enemyEther: { deflation: { multiplier: 1, usageCount: 0 } },
        actions,
      });

      expect(actions.setEnemyEtherCalcPhase).toHaveBeenCalledWith('sum');
    });

    it('50ms 후 multiply 페이즈로 전환', () => {
      const actions = {
        setEnemyEtherCalcPhase: vi.fn(),
        setEnemyCurrentDeflation: vi.fn(),
      };

      startEnemyEtherAnimation({
        enemyFinalEther: 100,
        enemyEther: { deflation: { multiplier: 1, usageCount: 0 } },
        actions,
      });

      vi.advanceTimersByTime(50);

      expect(actions.setEnemyEtherCalcPhase).toHaveBeenCalledWith('multiply');
    });

    it('150ms 후 deflation 페이즈로 전환', () => {
      const actions = {
        setEnemyEtherCalcPhase: vi.fn(),
        setEnemyCurrentDeflation: vi.fn(),
      };

      startEnemyEtherAnimation({
        enemyFinalEther: 100,
        enemyEther: { deflation: { multiplier: 0.8, usageCount: 2 } },
        actions,
      });

      vi.advanceTimersByTime(150);

      expect(actions.setEnemyEtherCalcPhase).toHaveBeenCalledWith('deflation');
      expect(actions.setEnemyCurrentDeflation).toHaveBeenCalledWith({
        multiplier: 0.8,
        usageCount: 2,
      });
    });

    it('deflation usageCount가 0이면 null 전달', () => {
      const actions = {
        setEnemyEtherCalcPhase: vi.fn(),
        setEnemyCurrentDeflation: vi.fn(),
      };

      startEnemyEtherAnimation({
        enemyFinalEther: 100,
        enemyEther: { deflation: { multiplier: 1, usageCount: 0 } },
        actions,
      });

      vi.advanceTimersByTime(150);

      expect(actions.setEnemyCurrentDeflation).toHaveBeenCalledWith(null);
    });

    it('300ms 후 result 페이즈로 전환', () => {
      const actions = {
        setEnemyEtherCalcPhase: vi.fn(),
        setEnemyCurrentDeflation: vi.fn(),
      };

      startEnemyEtherAnimation({
        enemyFinalEther: 100,
        enemyEther: { deflation: { multiplier: 1, usageCount: 0 } },
        actions,
      });

      vi.advanceTimersByTime(300);

      expect(actions.setEnemyEtherCalcPhase).toHaveBeenCalledWith('result');
    });

    it('전체 애니메이션 시퀀스 확인', () => {
      const actions = {
        setEnemyEtherCalcPhase: vi.fn(),
        setEnemyCurrentDeflation: vi.fn(),
      };

      startEnemyEtherAnimation({
        enemyFinalEther: 50,
        enemyEther: { deflation: { multiplier: 0.9, usageCount: 1 } },
        actions,
      });

      // 초기: sum
      expect(actions.setEnemyEtherCalcPhase).toHaveBeenNthCalledWith(1, 'sum');

      // 50ms: multiply
      vi.advanceTimersByTime(50);
      expect(actions.setEnemyEtherCalcPhase).toHaveBeenNthCalledWith(2, 'multiply');

      // 150ms: deflation (100ms 더)
      vi.advanceTimersByTime(100);
      expect(actions.setEnemyEtherCalcPhase).toHaveBeenNthCalledWith(3, 'deflation');

      // 300ms: result (150ms 더)
      vi.advanceTimersByTime(150);
      expect(actions.setEnemyEtherCalcPhase).toHaveBeenNthCalledWith(4, 'result');

      // 총 4번 호출
      expect(actions.setEnemyEtherCalcPhase).toHaveBeenCalledTimes(4);
    });
  });
});
