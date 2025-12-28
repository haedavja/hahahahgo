/**
 * @file eventAnimationProcessing.test.js
 * @description 액션 이벤트 애니메이션/사운드 시스템 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processActionEventAnimations } from './eventAnimationProcessing';

describe('eventAnimationProcessing', () => {
  let actions: any;
  let playHitSound: any;
  let playBlockSound: any;

  beforeEach(() => {
    vi.useFakeTimers();
    actions = {
      setEnemyHit: vi.fn(),
      setPlayerHit: vi.fn(),
      setPlayerBlockAnim: vi.fn(),
      setEnemyBlockAnim: vi.fn()
    };
    playHitSound = vi.fn();
    playBlockSound = vi.fn();

    // DOM 모킹
    const mockRoot = {
      classList: {
        add: vi.fn(),
        remove: vi.fn()
      }
    };
    vi.spyOn(document, 'getElementById').mockReturnValue(mockRoot as any);
    vi.spyOn(document, 'createElement').mockReturnValue({
      className: '',
      textContent: '',
      style: {} as any,
      remove: vi.fn()
    } as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation((() => {}) as any);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('processActionEventAnimations', () => {
    describe('피격 효과 (hit)', () => {
      it('플레이어 공격 시 적 피격 애니메이션', () => {
        const actionEvents = [
          { type: 'hit', actor: 'player', dmg: 10 }
        ];

        processActionEventAnimations({
          actionEvents: actionEvents as any,
          action: { actor: 'player', card: {} as any },
          playHitSound,
          playBlockSound,
          actions
        });

        expect(playHitSound).toHaveBeenCalled();
        expect(actions.setEnemyHit).toHaveBeenCalledWith(true);

        vi.advanceTimersByTime(300);
        expect(actions.setEnemyHit).toHaveBeenCalledWith(false);
      });

      it('적 공격 시 플레이어 피격 애니메이션', () => {
        const actionEvents = [
          { type: 'hit', actor: 'enemy', dmg: 15 }
        ];

        processActionEventAnimations({
          actionEvents: actionEvents as any,
          action: { actor: 'enemy', card: {} as any },
          playHitSound,
          playBlockSound,
          actions
        });

        expect(playHitSound).toHaveBeenCalled();
        expect(actions.setPlayerHit).toHaveBeenCalledWith(true);

        vi.advanceTimersByTime(300);
        expect(actions.setPlayerHit).toHaveBeenCalledWith(false);
      });

      it('피해가 0이면 효과 없음', () => {
        const actionEvents = [
          { type: 'hit', actor: 'player', dmg: 0 }
        ];

        processActionEventAnimations({
          actionEvents: actionEvents as any,
          action: { actor: 'player', card: {} as any },
          playHitSound,
          playBlockSound,
          actions
        });

        expect(playHitSound).not.toHaveBeenCalled();
        expect(actions.setEnemyHit).not.toHaveBeenCalled();
      });

      it('pierce 타입도 피격 효과 처리', () => {
        const actionEvents = [
          { type: 'pierce', actor: 'player', dmg: 20 }
        ];

        processActionEventAnimations({
          actionEvents: actionEvents as any,
          action: { actor: 'player', card: {} as any },
          playHitSound,
          playBlockSound,
          actions
        });

        expect(playHitSound).toHaveBeenCalled();
        expect(actions.setEnemyHit).toHaveBeenCalledWith(true);
      });
    });

    describe('방어 효과 (defense)', () => {
      it('플레이어 방어 시 방어 애니메이션', () => {
        const actionEvents = [
          { type: 'defense', actor: 'player', block: 5 }
        ];

        processActionEventAnimations({
          actionEvents: actionEvents as any,
          action: { actor: 'player', card: {} as any },
          playHitSound,
          playBlockSound,
          actions
        });

        expect(playBlockSound).toHaveBeenCalled();
        expect(actions.setPlayerBlockAnim).toHaveBeenCalledWith(true);

        vi.advanceTimersByTime(400);
        expect(actions.setPlayerBlockAnim).toHaveBeenCalledWith(false);
      });

      it('적 방어 시 적 방어 애니메이션', () => {
        const actionEvents = [
          { type: 'defense', actor: 'enemy', block: 8 }
        ];

        processActionEventAnimations({
          actionEvents: actionEvents as any,
          action: { actor: 'enemy', card: {} as any },
          playHitSound,
          playBlockSound,
          actions
        });

        expect(playBlockSound).toHaveBeenCalled();
        expect(actions.setEnemyBlockAnim).toHaveBeenCalledWith(true);

        vi.advanceTimersByTime(400);
        expect(actions.setEnemyBlockAnim).toHaveBeenCalledWith(false);
      });
    });

    describe('반격 효과 (counter)', () => {
      it('플레이어가 공격 중 반격당함', () => {
        const actionEvents = [
          { actor: 'counter', dmg: 5 }
        ];

        processActionEventAnimations({
          actionEvents: actionEvents as any,
          action: { actor: 'player', card: {} as any },
          playHitSound,
          playBlockSound,
          actions
        });

        expect(playHitSound).toHaveBeenCalled();
        expect(actions.setPlayerHit).toHaveBeenCalledWith(true);
      });

      it('적이 공격 중 반격당함', () => {
        const actionEvents = [
          { actor: 'counter', dmg: 5 }
        ];

        processActionEventAnimations({
          actionEvents: actionEvents as any,
          action: { actor: 'enemy', card: {} as any },
          playHitSound,
          playBlockSound,
          actions
        });

        expect(playHitSound).toHaveBeenCalled();
        expect(actions.setEnemyHit).toHaveBeenCalledWith(true);
      });
    });

    describe('복합 이벤트', () => {
      it('여러 이벤트를 순차 처리', () => {
        const actionEvents = [
          { type: 'hit', actor: 'player', dmg: 10 },
          { type: 'defense', actor: 'player', block: 3 }
        ];

        processActionEventAnimations({
          actionEvents: actionEvents as any,
          action: { actor: 'player', card: {} as any },
          playHitSound,
          playBlockSound,
          actions
        });

        expect(playHitSound).toHaveBeenCalled();
        expect(playBlockSound).toHaveBeenCalled();
        expect(actions.setEnemyHit).toHaveBeenCalled();
        expect(actions.setPlayerBlockAnim).toHaveBeenCalled();
      });
    });
  });
});
