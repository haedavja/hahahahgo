/**
 * @file battle-event-collector.test.ts
 * @description 전투 이벤트 수집기 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  startBattleSession,
  endBattleSession,
  getCurrentSession,
  collectEvent,
  captureCurrentSnapshot,
  addEventListener,
  addGlobalListener,
  recordCardPlayed,
  recordDamage,
  recordBlock,
  recordTurnStart,
  recordTurnEnd,
  recordTokenApplied,
  recordRelicTriggered,
  getSessionSummary,
  getEventTypeStats,
  getSessionHistory,
  isCollecting,
  type BattleEventType,
  type CollectedEvent,
} from './battle-event-collector';

describe('battle-event-collector', () => {
  beforeEach(() => {
    // 이전 세션이 있다면 종료
    if (getCurrentSession()) {
      endBattleSession('defeat');
    }
  });

  describe('세션 관리', () => {
    describe('startBattleSession', () => {
      it('새 전투 세션을 시작한다', () => {
        const session = startBattleSession();

        expect(session).toBeDefined();
        expect(session.id).toContain('session_');
        expect(session.startTime).toBeDefined();
        expect(session.endTime).toBeNull();
        expect(session.result).toBe('ongoing');
        expect(session.events).toBeDefined();
      });

      it('수집 상태를 활성화한다', () => {
        startBattleSession();
        expect(isCollecting()).toBe(true);
      });

      it('시작 이벤트를 기록한다', () => {
        const session = startBattleSession();

        expect(session.events.length).toBeGreaterThan(0);
        expect(session.events[0].type).toBe('battle_start');
      });

      it('이전 세션이 있으면 종료한다', () => {
        startBattleSession();
        const newSession = startBattleSession();

        expect(newSession).toBeDefined();
        expect(isCollecting()).toBe(true);
      });
    });

    describe('endBattleSession', () => {
      it('세션을 종료하고 반환한다', () => {
        startBattleSession();
        const session = endBattleSession('victory');

        expect(session).toBeDefined();
        expect(session?.result).toBe('victory');
        expect(session?.endTime).not.toBeNull();
      });

      it('패배로 종료할 수 있다', () => {
        startBattleSession();
        const session = endBattleSession('defeat');

        expect(session?.result).toBe('defeat');
      });

      it('수집 상태를 비활성화한다', () => {
        startBattleSession();
        endBattleSession('victory');

        expect(isCollecting()).toBe(false);
      });

      it('히스토리에 추가한다', () => {
        const historyBefore = getSessionHistory().length;

        startBattleSession();
        endBattleSession('victory');

        expect(getSessionHistory().length).toBe(historyBefore + 1);
      });

      it('세션이 없으면 null을 반환한다', () => {
        const result = endBattleSession('victory');
        expect(result).toBeNull();
      });
    });

    describe('getCurrentSession', () => {
      it('현재 세션이 없으면 null을 반환한다', () => {
        expect(getCurrentSession()).toBeNull();
      });

      it('활성 세션을 반환한다', () => {
        const session = startBattleSession();
        expect(getCurrentSession()).toBe(session);
      });
    });
  });

  describe('이벤트 수집', () => {
    beforeEach(() => {
      startBattleSession();
    });

    describe('collectEvent', () => {
      it('이벤트를 수집한다', () => {
        const event = collectEvent({
          type: 'card_played',
          turn: 1,
          actor: 'player',
          data: { cardId: 'card1' },
        });

        expect(event).toBeDefined();
        expect(event?.type).toBe('card_played');
        expect(event?.turn).toBe(1);
        expect(event?.actor).toBe('player');
      });

      it('고유 ID를 생성한다', () => {
        const event1 = collectEvent({ type: 'turn_start', turn: 1, actor: 'player' });
        const event2 = collectEvent({ type: 'turn_end', turn: 1, actor: 'player' });

        expect(event1?.id).not.toBe(event2?.id);
      });

      it('세션이 없으면 null을 반환한다', () => {
        endBattleSession('victory');

        const event = collectEvent({
          type: 'card_played',
          turn: 1,
          actor: 'player',
        });

        expect(event).toBeNull();
      });
    });

    describe('편의 함수들', () => {
      it('recordCardPlayed가 카드 이벤트를 기록한다', () => {
        recordCardPlayed('card1', '강타', 'player', 1);

        const session = getCurrentSession();
        const cardEvents = session?.events.filter(e => e.type === 'card_played');
        expect(cardEvents?.length).toBeGreaterThan(0);
      });

      it('recordDamage가 피해 이벤트를 기록한다', () => {
        recordDamage(10, 'player', 'enemy', 1, '강타');

        const session = getCurrentSession();
        const damageEvents = session?.events.filter(e => e.type === 'damage_dealt');
        expect(damageEvents?.length).toBeGreaterThan(0);
      });

      it('recordBlock이 방어 이벤트를 기록한다', () => {
        recordBlock(5, 'player', 1, '방어');

        const session = getCurrentSession();
        const blockEvents = session?.events.filter(e => e.type === 'block_gained');
        expect(blockEvents?.length).toBeGreaterThan(0);
      });

      it('recordTurnStart가 턴 시작 이벤트를 기록한다', () => {
        recordTurnStart(2);

        const session = getCurrentSession();
        const turnStartEvents = session?.events.filter(e => e.type === 'turn_start');
        expect(turnStartEvents?.length).toBeGreaterThan(0);
      });

      it('recordTurnEnd가 턴 종료 이벤트를 기록한다', () => {
        recordTurnEnd(1);

        const session = getCurrentSession();
        const turnEndEvents = session?.events.filter(e => e.type === 'turn_end');
        expect(turnEndEvents?.length).toBeGreaterThan(0);
      });

      it('recordTokenApplied가 토큰 이벤트를 기록한다', () => {
        recordTokenApplied('strength', 2, 'player', 1, '버프 카드');

        const session = getCurrentSession();
        const tokenEvents = session?.events.filter(e => e.type === 'token_applied');
        expect(tokenEvents?.length).toBeGreaterThan(0);
      });

      it('recordRelicTriggered가 상징 이벤트를 기록한다', () => {
        recordRelicTriggered('relic1', '체력 회복', 1);

        const session = getCurrentSession();
        const relicEvents = session?.events.filter(e => e.type === 'relic_triggered');
        expect(relicEvents?.length).toBeGreaterThan(0);
      });
    });
  });

  describe('세션 통계', () => {
    describe('updateSessionStats', () => {
      it('턴 카운트를 업데이트한다', () => {
        startBattleSession();
        recordTurnStart(3);

        const session = getCurrentSession();
        expect(session?.turnCount).toBe(3);
      });

      it('카드 사용을 카운트한다', () => {
        startBattleSession();
        recordCardPlayed('card1', '강타', 'player', 1);
        recordCardPlayed('card1', '강타', 'player', 1);
        recordCardPlayed('card2', '방어', 'player', 1);

        const session = getCurrentSession();
        expect(session?.cardUsage['card1']).toBe(2);
        expect(session?.cardUsage['card2']).toBe(1);
      });

      it('피해량을 누적한다', () => {
        startBattleSession();
        recordDamage(10, 'player', 'enemy', 1);
        recordDamage(15, 'player', 'enemy', 1);

        const session = getCurrentSession();
        expect(session?.damageDealt).toBe(25);
      });

      it('받은 피해를 누적한다', () => {
        startBattleSession();
        recordDamage(5, 'enemy', 'player', 1);
        recordDamage(8, 'enemy', 'player', 1);

        const session = getCurrentSession();
        expect(session?.damageTaken).toBe(13);
      });
    });

    describe('getSessionSummary', () => {
      it('세션 요약을 반환한다', () => {
        startBattleSession();
        recordTurnStart(1);
        recordCardPlayed('card1', '강타', 'player', 1);
        recordDamage(20, 'player', 'enemy', 1);

        const summary = getSessionSummary();

        expect(summary).toBeDefined();
        expect(summary?.turnCount).toBe(1);
        expect(summary?.cardCount).toBe(1);
        expect(summary?.uniqueCards).toBe(1);
        expect(summary?.damageDealt).toBe(20);
      });

      it('세션이 없으면 null을 반환한다', () => {
        const summary = getSessionSummary();
        expect(summary).toBeNull();
      });

      it('DPT를 계산한다', () => {
        startBattleSession();
        recordTurnStart(2);
        recordDamage(40, 'player', 'enemy', 1);
        recordDamage(60, 'player', 'enemy', 2);

        const summary = getSessionSummary();
        expect(summary?.dpt).toBe(50); // 100 / 2
      });
    });

    describe('getEventTypeStats', () => {
      it('이벤트 타입별 통계를 반환한다', () => {
        startBattleSession();
        recordTurnStart(1);
        recordCardPlayed('card1', '강타', 'player', 1);
        recordCardPlayed('card2', '방어', 'player', 1);
        recordDamage(10, 'player', 'enemy', 1);

        const stats = getEventTypeStats();

        expect(stats.card_played).toBe(2);
        expect(stats.damage_dealt).toBe(1);
        expect(stats.turn_start).toBe(1);
      });

      it('세션이 없으면 빈 객체를 반환한다', () => {
        const stats = getEventTypeStats();
        expect(Object.keys(stats).length).toBe(0);
      });
    });
  });

  describe('리스너', () => {
    describe('addEventListener', () => {
      it('특정 이벤트 타입의 리스너를 등록한다', () => {
        startBattleSession();
        const listener = vi.fn();

        addEventListener('card_played', listener);
        recordCardPlayed('card1', '강타', 'player', 1);

        expect(listener).toHaveBeenCalled();
      });

      it('해제 함수를 반환한다', () => {
        startBattleSession();
        const listener = vi.fn();

        const unsubscribe = addEventListener('card_played', listener);
        unsubscribe();
        recordCardPlayed('card1', '강타', 'player', 1);

        expect(listener).not.toHaveBeenCalled();
      });

      it('다른 이벤트 타입에는 호출되지 않는다', () => {
        startBattleSession();
        const listener = vi.fn();

        addEventListener('card_played', listener);
        recordDamage(10, 'player', 'enemy', 1);

        expect(listener).not.toHaveBeenCalled();
      });
    });

    describe('addGlobalListener', () => {
      it('모든 이벤트에 대해 호출된다', () => {
        startBattleSession();
        const listener = vi.fn();

        addGlobalListener(listener);
        recordCardPlayed('card1', '강타', 'player', 1);
        recordDamage(10, 'player', 'enemy', 1);

        expect(listener).toHaveBeenCalledTimes(2);
      });

      it('해제 함수를 반환한다', () => {
        startBattleSession();
        const listener = vi.fn();

        const unsubscribe = addGlobalListener(listener);
        unsubscribe();
        recordCardPlayed('card1', '강타', 'player', 1);

        expect(listener).not.toHaveBeenCalled();
      });
    });

    it('리스너 에러가 다른 리스너에 영향을 주지 않는다', () => {
      startBattleSession();
      const errorListener = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalListener = vi.fn();

      addGlobalListener(errorListener);
      addGlobalListener(normalListener);

      // 에러가 발생해도 두 번째 리스너가 호출되어야 함
      recordCardPlayed('card1', '강타', 'player', 1);

      expect(normalListener).toHaveBeenCalled();
    });
  });

  describe('스냅샷', () => {
    describe('captureCurrentSnapshot', () => {
      it('현재 상태의 스냅샷을 캡처한다', () => {
        startBattleSession();

        const snapshot = captureCurrentSnapshot({
          player: { hp: 80, maxHp: 100, block: 5 },
          enemy: { hp: 50, maxHp: 100, block: 0 },
          turnNumber: 3,
          tokens: ['strength'],
        });

        expect(snapshot).toBeDefined();
        expect(snapshot?.playerHp).toBe(80);
        expect(snapshot?.enemyHp).toBe(50);
        expect(snapshot?.turnNumber).toBe(3);
      });

      it('세션에 스냅샷을 추가한다', () => {
        startBattleSession();

        captureCurrentSnapshot({
          player: { hp: 100, maxHp: 100 },
          enemy: { hp: 100, maxHp: 100 },
          turnNumber: 1,
        });

        const session = getCurrentSession();
        expect(session?.snapshots.length).toBeGreaterThan(0);
      });

      it('세션이 없으면 null을 반환한다', () => {
        const snapshot = captureCurrentSnapshot({
          player: { hp: 100, maxHp: 100 },
          enemy: { hp: 100, maxHp: 100 },
          turnNumber: 1,
        });

        expect(snapshot).toBeNull();
      });
    });
  });

  describe('히스토리', () => {
    describe('getSessionHistory', () => {
      it('세션 히스토리를 반환한다', () => {
        const history = getSessionHistory();
        expect(Array.isArray(history)).toBe(true);
      });

      it('복사본을 반환한다', () => {
        const history1 = getSessionHistory();
        const history2 = getSessionHistory();

        expect(history1).not.toBe(history2);
      });
    });
  });

  describe('isCollecting', () => {
    it('수집 상태를 반환한다', () => {
      expect(isCollecting()).toBe(false);

      startBattleSession();
      expect(isCollecting()).toBe(true);

      endBattleSession('victory');
      expect(isCollecting()).toBe(false);
    });
  });
});
