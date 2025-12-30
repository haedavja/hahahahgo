/**
 * @file stunProcessing.test.js
 * @description 기절(스턴) 효과 처리 테스트
 *
 * ## 테스트 대상
 * - STUN_RANGE: 기절 범위 상수 (5)
 * - processStunEffect: 범위 내 적 카드 제거
 *
 * ## 주요 테스트 케이스
 * - 범위(centerSp ~ centerSp+5) 경계 조건
 * - 아군 카드는 제거 안 함
 * - 현재 인덱스 이전 카드 영향 없음
 * - stunEvent 생성 (로그 메시지 포함)
 * - sp가 없는 카드는 범위 체크 제외
 */

import { describe, it, expect, vi } from 'vitest';
import { STUN_RANGE, processStunEffect } from './stunProcessing';

describe('stunProcessing', () => {
  describe('STUN_RANGE', () => {
    it('기절 범위가 5여야 함', () => {
      expect(STUN_RANGE).toBe(5);
    });
  });

  describe('processStunEffect', () => {
    const createQueue = () => [
      { actor: 'player', card: { name: 'Stun Card' }, sp: 5 },
      { actor: 'enemy', card: { name: 'Enemy Attack' }, sp: 7 },
      { actor: 'enemy', card: { name: 'Enemy Skill' }, sp: 9 },
      { actor: 'player', card: { name: 'Player Card' }, sp: 12 },
      { actor: 'enemy', card: { name: 'Enemy Far' }, sp: 15 }
    ];

    it('범위 내 적 카드를 제거해야 함', () => {
      const addLog = vi.fn();
      const action = {
        card: { name: 'Stun Card' },
        sp: 5,
        actor: 'player'
      } as any;

      const result = processStunEffect({
        action,
        queue: createQueue(),
        currentQIndex: 0,
        addLog
      } as any);

      // 범위: 5~10, Enemy Attack(7), Enemy Skill(9)가 범위 내
      expect(result.updatedQueue).toHaveLength(3);
      expect(result.updatedQueue.some(q => q.card!.name === 'Enemy Attack')).toBe(false);
      expect(result.updatedQueue.some(q => q.card!.name === 'Enemy Skill')).toBe(false);
      expect(result.updatedQueue.some(q => q.card!.name === 'Enemy Far')).toBe(true);
    });

    it('stunEvent를 생성해야 함', () => {
      const addLog = vi.fn();
      const action = {
        card: { name: 'Stun Card' },
        sp: 5,
        actor: 'player'
      } as any;

      const result = processStunEffect({
        action,
        queue: createQueue(),
        currentQIndex: 0,
        addLog
      } as any);

      expect(result.stunEvent).not.toBeNull();
      expect(result.stunEvent!.type).toBe('stun');
      expect(result.stunEvent!.actor).toBe('player');
      expect(result.stunEvent!.card).toBe('Stun Card');
    });

    it('범위 내 적이 없으면 stunEvent가 null이어야 함', () => {
      const addLog = vi.fn();
      const queue = [
        { actor: 'player', card: { name: 'Stun' }, sp: 5 },
        { actor: 'enemy', card: { name: 'Far Enemy' }, sp: 20 }
      ];

      const result = processStunEffect({
        action: { card: { name: 'Stun' }, sp: 5, actor: 'player' },
        queue,
        currentQIndex: 0,
        addLog
      } as any);

      expect(result.stunEvent).toBeNull();
      expect(result.updatedQueue).toHaveLength(2);
    });

    it('아군 카드는 제거하지 않아야 함', () => {
      const addLog = vi.fn();
      const queue = [
        { actor: 'player', card: { name: 'Stun' }, sp: 5 },
        { actor: 'player', card: { name: 'Ally Card' }, sp: 7 },
        { actor: 'enemy', card: { name: 'Enemy Card' }, sp: 8 }
      ];

      const result = processStunEffect({
        action: { card: { name: 'Stun' }, sp: 5, actor: 'player' },
        queue,
        currentQIndex: 0,
        addLog
      } as any);

      expect(result.updatedQueue.some(q => q.card!.name === 'Ally Card')).toBe(true);
      expect(result.updatedQueue.some(q => q.card!.name === 'Enemy Card')).toBe(false);
    });

    it('현재 인덱스 이전 카드는 영향받지 않아야 함', () => {
      const addLog = vi.fn();
      const queue = [
        { actor: 'enemy', card: { name: 'Past Enemy' }, sp: 3 },
        { actor: 'player', card: { name: 'Stun' }, sp: 5 },
        { actor: 'enemy', card: { name: 'Future Enemy' }, sp: 7 }
      ];

      const result = processStunEffect({
        action: { card: { name: 'Stun' }, sp: 5, actor: 'player' },
        queue,
        currentQIndex: 1,
        addLog
      } as any);

      expect(result.updatedQueue.some(q => q.card!.name === 'Past Enemy')).toBe(true);
      expect(result.updatedQueue.some(q => q.card!.name === 'Future Enemy')).toBe(false);
    });

    it('sp가 정확히 centerSp일 때도 범위에 포함되어야 함', () => {
      const addLog = vi.fn();
      const queue = [
        { actor: 'player', card: { name: 'Stun' }, sp: 5 },
        { actor: 'enemy', card: { name: 'Same SP Enemy' }, sp: 5 }
      ];

      const result = processStunEffect({
        action: { card: { name: 'Stun' }, sp: 5, actor: 'player' },
        queue,
        currentQIndex: 0,
        addLog
      } as any);

      expect(result.updatedQueue.some(q => q.card!.name === 'Same SP Enemy')).toBe(false);
      expect(result.stunEvent).not.toBeNull();
    });

    it('sp가 정확히 centerSp + STUN_RANGE일 때도 범위에 포함되어야 함', () => {
      const addLog = vi.fn();
      const queue = [
        { actor: 'player', card: { name: 'Stun' }, sp: 5 },
        { actor: 'enemy', card: { name: 'Edge Enemy' }, sp: 10 } // 5 + 5 = 10
      ];

      const result = processStunEffect({
        action: { card: { name: 'Stun' }, sp: 5, actor: 'player' },
        queue,
        currentQIndex: 0,
        addLog
      } as any);

      expect(result.updatedQueue.some(q => q.card!.name === 'Edge Enemy')).toBe(false);
    });

    it('sp가 centerSp + STUN_RANGE 초과면 범위 밖이어야 함', () => {
      const addLog = vi.fn();
      const queue = [
        { actor: 'player', card: { name: 'Stun' }, sp: 5 },
        { actor: 'enemy', card: { name: 'Outside Enemy' }, sp: 11 } // 5 + 5 + 1 = 11
      ];

      const result = processStunEffect({
        action: { card: { name: 'Stun' }, sp: 5, actor: 'player' },
        queue,
        currentQIndex: 0,
        addLog
      } as any);

      expect(result.updatedQueue.some(q => q.card!.name === 'Outside Enemy')).toBe(true);
      expect(result.stunEvent).toBeNull();
    });

    it('addLog가 기절 정보와 함께 호출되어야 함', () => {
      const addLog = vi.fn();
      const queue = [
        { actor: 'player', card: { name: 'Stun Attack' }, sp: 5 },
        { actor: 'enemy', card: { name: 'Target Card' }, sp: 7 }
      ];

      processStunEffect({
        action: { card: { name: 'Stun Attack' }, sp: 5, actor: 'player' },
        queue,
        currentQIndex: 0,
        addLog
      } as any);

      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('기절'));
      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('Target Card'));
    });

    it('여러 적 카드를 동시에 제거해야 함', () => {
      const addLog = vi.fn();
      const queue = [
        { actor: 'player', card: { name: 'Stun' }, sp: 5 },
        { actor: 'enemy', card: { name: 'Enemy 1' }, sp: 6 },
        { actor: 'enemy', card: { name: 'Enemy 2' }, sp: 7 },
        { actor: 'enemy', card: { name: 'Enemy 3' }, sp: 8 }
      ];

      const result = processStunEffect({
        action: { card: { name: 'Stun' }, sp: 5, actor: 'player' },
        queue,
        currentQIndex: 0,
        addLog
      } as any);

      expect(result.updatedQueue).toHaveLength(1); // Stun 카드만 남음
      expect(result.stunEvent!.msg).toContain('3장');
    });

    it('sp가 없는 action은 0으로 처리해야 함', () => {
      const addLog = vi.fn();
      const queue = [
        { actor: 'player', card: { name: 'Stun' } },
        { actor: 'enemy', card: { name: 'Enemy' }, sp: 3 }
      ];

      const result = processStunEffect({
        action: { card: { name: 'Stun' }, actor: 'player' }, // sp 없음
        queue,
        currentQIndex: 0,
        addLog
      } as any);

      // 범위: 0~5, Enemy(3)는 범위 내
      expect(result.updatedQueue.some(q => q.card!.name === 'Enemy')).toBe(false);
    });

    it('sp가 숫자가 아닌 항목은 필터링해야 함', () => {
      const addLog = vi.fn();
      const queue = [
        { actor: 'player', card: { name: 'Stun' }, sp: 5 },
        { actor: 'enemy', card: { name: 'No SP Enemy' } }, // sp 없음
        { actor: 'enemy', card: { name: 'Valid Enemy' }, sp: 7 }
      ];

      const result = processStunEffect({
        action: { card: { name: 'Stun' }, sp: 5, actor: 'player' },
        queue,
        currentQIndex: 0,
        addLog
      } as any);

      // sp가 없는 적은 범위 체크에서 제외
      expect(result.updatedQueue.some(q => q.card!.name === 'No SP Enemy')).toBe(true);
      expect(result.updatedQueue.some(q => q.card!.name === 'Valid Enemy')).toBe(false);
    });

    it('적이 player 쪽에서 기절을 사용할 수 있어야 함', () => {
      const addLog = vi.fn();
      const queue = [
        { actor: 'enemy', card: { name: 'Enemy Stun' }, sp: 5 },
        { actor: 'player', card: { name: 'Player Card' }, sp: 7 }
      ];

      const result = processStunEffect({
        action: { card: { name: 'Enemy Stun' }, sp: 5, actor: 'enemy' },
        queue,
        currentQIndex: 0,
        addLog
      } as any);

      expect(result.updatedQueue.some(q => q.card!.name === 'Player Card')).toBe(false);
      expect(result.stunEvent!.actor).toBe('enemy');
    });

    it('null 항목은 무시해야 함', () => {
      const addLog = vi.fn();
      const queue = [
        { actor: 'player', card: { name: 'Stun' }, sp: 5 },
        null,
        { actor: 'enemy', card: { name: 'Enemy' }, sp: 7 }
      ];

      const result = processStunEffect({
        action: { card: { name: 'Stun' }, sp: 5, actor: 'player' },
        queue,
        currentQIndex: 0,
        addLog
      } as any);

      expect(result.updatedQueue.some(q => q?.card?.name === 'Enemy')).toBe(false);
    });
  });
});
