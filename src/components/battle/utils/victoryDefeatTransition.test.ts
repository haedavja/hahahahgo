/**
 * @file victoryDefeatTransition.test.js
 * @description 승리/패배 전환 시스템 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processVictoryDefeatTransition } from './victoryDefeatTransition';

describe('victoryDefeatTransition', () => {
  let actions: {
    setSoulShatter: ReturnType<typeof vi.fn>,
    setNetEtherDelta: ReturnType<typeof vi.fn>,
    setPostCombatOptions: ReturnType<typeof vi.fn>
  };

  beforeEach(() => {
    vi.useFakeTimers();
    actions = {
      setSoulShatter: vi.fn(),
      setNetEtherDelta: vi.fn(),
      setPostCombatOptions: vi.fn(),
      setPhase: vi.fn()
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('processVictoryDefeatTransition', () => {
    describe('승리 처리', () => {
      it('일반 승리 시 올바른 상태 변경', () => {
        const checkVictoryCondition = vi.fn().mockReturnValue({
          isVictory: true,
          isEtherVictory: false,
          delay: 500
        });

        const result = processVictoryDefeatTransition({
          enemy: { hp: 0 },
          player: { hp: 50 },
          nextEnemyPtsSnapshot: 100,
          checkVictoryCondition,
          actions
        });

        expect(result.shouldReturn).toBe(true);
        expect(result.isVictory).toBe(true);
        expect(result.isDefeat).toBe(false);
        expect(actions.setNetEtherDelta).toHaveBeenCalledWith(null);
        expect(actions.setSoulShatter).not.toHaveBeenCalled();
      });

      it('에테르 버스트 승리 시 setSoulShatter 호출', () => {
        const checkVictoryCondition = vi.fn().mockReturnValue({
          isVictory: true,
          isEtherVictory: true,
          delay: 800
        });

        processVictoryDefeatTransition({
          enemy: { hp: 10 },
          player: { hp: 50 },
          nextEnemyPtsSnapshot: 500,
          checkVictoryCondition,
          actions
        });

        expect(actions.setSoulShatter).toHaveBeenCalledWith(true);
      });

      it('승리 시 지연 후 post 페이즈 전환', () => {
        const checkVictoryCondition = vi.fn().mockReturnValue({
          isVictory: true,
          isEtherVictory: false,
          delay: 500
        });

        processVictoryDefeatTransition({
          enemy: { hp: 0 },
          player: { hp: 50 },
          nextEnemyPtsSnapshot: 100,
          checkVictoryCondition,
          actions
        });

        expect(actions.setPostCombatOptions).not.toHaveBeenCalled();

        vi.advanceTimersByTime(500);

        expect(actions.setPostCombatOptions).toHaveBeenCalledWith({ type: 'victory' });
        expect(actions.setPhase).toHaveBeenCalledWith('post');
      });

      it('onVictory 콜백이 있으면 호출', () => {
        const checkVictoryCondition = vi.fn().mockReturnValue({
          isVictory: true,
          isEtherVictory: false,
          delay: 300
        });
        const onVictory = vi.fn();

        processVictoryDefeatTransition({
          enemy: { hp: 0 },
          player: { hp: 50 },
          nextEnemyPtsSnapshot: 100,
          checkVictoryCondition,
          actions,
          onVictory
        });

        vi.advanceTimersByTime(300);

        expect(onVictory).toHaveBeenCalled();
        expect(actions.setPostCombatOptions).not.toHaveBeenCalled();
      });
    });

    describe('패배 처리', () => {
      it('플레이어 HP가 0 이하면 패배', () => {
        const checkVictoryCondition = vi.fn().mockReturnValue({
          isVictory: false,
          delay: 0
        });

        const result = processVictoryDefeatTransition({
          enemy: { hp: 30 },
          player: { hp: 0 },
          nextEnemyPtsSnapshot: 50,
          checkVictoryCondition,
          actions
        });

        expect(result.shouldReturn).toBe(true);
        expect(result.isVictory).toBe(false);
        expect(result.isDefeat).toBe(true);
        expect(actions.setNetEtherDelta).toHaveBeenCalledWith(null);
      });

      it('패배 시 500ms 후 post 페이즈 전환', () => {
        const checkVictoryCondition = vi.fn().mockReturnValue({
          isVictory: false,
          delay: 0
        });

        processVictoryDefeatTransition({
          enemy: { hp: 30 },
          player: { hp: -5 },
          nextEnemyPtsSnapshot: 50,
          checkVictoryCondition,
          actions
        });

        expect(actions.setPostCombatOptions).not.toHaveBeenCalled();

        vi.advanceTimersByTime(500);

        expect(actions.setPostCombatOptions).toHaveBeenCalledWith({ type: 'defeat' });
        expect(actions.setPhase).toHaveBeenCalledWith('post');
      });
    });

    describe('전투 계속', () => {
      it('승리도 패배도 아니면 shouldReturn이 false', () => {
        const checkVictoryCondition = vi.fn().mockReturnValue({
          isVictory: false,
          delay: 0
        });

        const result = processVictoryDefeatTransition({
          enemy: { hp: 30 },
          player: { hp: 50 },
          nextEnemyPtsSnapshot: 50,
          checkVictoryCondition,
          actions
        });

        expect(result.shouldReturn).toBe(false);
        expect(result.isVictory).toBe(false);
        expect(result.isDefeat).toBe(false);
      });
    });
  });
});
