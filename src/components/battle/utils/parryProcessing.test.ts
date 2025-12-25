/**
 * @file parryProcessing.test.js
 * @description 쳐내기(패리) 효과 처리 테스트
 *
 * ## 테스트 대상
 * - setupParryReady: 패리 대기 상태 생성
 * - checkParryTrigger: 패리 트리거 체크 및 적 카드 밀기
 * - resetParryState: 패리 상태 초기화
 *
 * ## 주요 테스트 케이스
 * - 패리 범위(centerSp ~ maxSp) 경계 조건
 * - 적 공격만 트리거 (스킬 제외)
 * - pushAmount만큼 적 카드 sp 밀기
 * - maxSpeed 초과 시 아웃(outCards) 처리
 * - 다중 패리 동시 발동
 * - 밀린 후 sp 기준 재정렬
 */

import { describe, it, expect, vi } from 'vitest';
import { setupParryReady, checkParryTrigger, resetParryState } from './parryProcessing';

describe('parryProcessing', () => {
  describe('setupParryReady', () => {
    it('기본 패리 대기 상태를 생성해야 함', () => {
      const addLog = vi.fn();
      const action = {
        card: { name: 'Parry Card' },
        sp: 5,
        actor: 'player'
      };

      const result = setupParryReady({ action, addLog });

      expect(result.active).toBe(true);
      expect(result.actor).toBe('player');
      expect(result.cardName).toBe('Parry Card');
      expect(result.centerSp).toBe(5);
      expect(result.maxSp).toBe(10); // 5 + 5 (default range)
      expect(result.pushAmount).toBe(3); // default
      expect(result.triggered).toBe(false);
    });

    it('카드의 parryRange를 사용해야 함', () => {
      const addLog = vi.fn();
      const action = {
        card: { name: 'Wide Parry', parryRange: 10 },
        sp: 3,
        actor: 'player'
      };

      const result = setupParryReady({ action, addLog });

      expect(result.maxSp).toBe(13); // 3 + 10
    });

    it('카드의 parryPushAmount를 사용해야 함', () => {
      const addLog = vi.fn();
      const action = {
        card: { name: 'Heavy Parry', parryPushAmount: 7 },
        sp: 5,
        actor: 'player'
      };

      const result = setupParryReady({ action, addLog });

      expect(result.pushAmount).toBe(7);
    });

    it('sp가 없으면 0을 사용해야 함', () => {
      const addLog = vi.fn();
      const action = {
        card: { name: 'Parry' },
        actor: 'player'
      };

      const result = setupParryReady({ action, addLog });

      expect(result.centerSp).toBe(0);
      expect(result.maxSp).toBe(5);
    });

    it('addLog가 호출되어야 함', () => {
      const addLog = vi.fn();
      const action = {
        card: { name: 'Test Parry' },
        sp: 2,
        actor: 'player'
      };

      setupParryReady({ action, addLog });

      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('패리 대기'));
      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('Test Parry'));
    });
  });

  describe('checkParryTrigger', () => {
    const createParryState = (overrides = {}) => ({
      active: true,
      actor: 'player',
      cardName: 'Parry',
      centerSp: 5,
      maxSp: 10,
      pushAmount: 3,
      triggered: false,
      ...overrides
    });

    const createQueue = () => [
      { actor: 'player', card: { name: 'Player Card', type: 'attack' }, sp: 3 },
      { actor: 'enemy', card: { name: 'Enemy Attack', type: 'attack' }, sp: 7 },
      { actor: 'enemy', card: { name: 'Enemy Skill', type: 'skill' }, sp: 12 },
      { actor: 'player', card: { name: 'Player Card 2', type: 'attack' }, sp: 15 }
    ];

    it('활성 패리가 없으면 변경 없이 반환해야 함', () => {
      const addLog = vi.fn();
      const result = checkParryTrigger({
        parryReadyStates: [],
        enemyAction: { card: { name: 'Attack', type: 'attack' }, sp: 7, actor: 'enemy' },
        queue: createQueue(),
        currentQIndex: 0,
        enemyMaxSpeed: 30,
        addLog,
        playParrySound: vi.fn()
      });

      expect(result.parryEvents).toHaveLength(0);
      expect(result.updatedQueue).toEqual(createQueue());
    });

    it('적 공격이 아니면 트리거하지 않아야 함', () => {
      const addLog = vi.fn();
      const result = checkParryTrigger({
        parryReadyStates: [createParryState()],
        enemyAction: { card: { name: 'Skill', type: 'skill' }, sp: 7, actor: 'enemy' },
        queue: createQueue(),
        currentQIndex: 0,
        enemyMaxSpeed: 30,
        addLog,
        playParrySound: vi.fn()
      });

      expect(result.parryEvents).toHaveLength(0);
    });

    it('범위 내 적 공격 시 패리 트리거되어야 함', () => {
      const addLog = vi.fn();
      const playParrySound = vi.fn();
      const result = checkParryTrigger({
        parryReadyStates: [createParryState()],
        enemyAction: { card: { name: 'Enemy Attack', type: 'attack' }, sp: 7, actor: 'enemy' },
        queue: createQueue(),
        currentQIndex: 0,
        enemyMaxSpeed: 30,
        addLog,
        playParrySound
      });

      expect(result.parryEvents).toHaveLength(1);
      expect(result.parryEvents[0].type).toBe('parry');
      expect(playParrySound).toHaveBeenCalled();
    });

    it('범위 밖 적 공격은 트리거하지 않아야 함', () => {
      const addLog = vi.fn();
      const result = checkParryTrigger({
        parryReadyStates: [createParryState({ centerSp: 5, maxSp: 10 })],
        enemyAction: { card: { name: 'Attack', type: 'attack' }, sp: 15, actor: 'enemy' },
        queue: createQueue(),
        currentQIndex: 0,
        enemyMaxSpeed: 30,
        addLog,
        playParrySound: vi.fn()
      });

      expect(result.parryEvents).toHaveLength(0);
    });

    it('centerSp와 같은 sp는 트리거하지 않아야 함 (centerSp < enemySp)', () => {
      const addLog = vi.fn();
      const result = checkParryTrigger({
        parryReadyStates: [createParryState({ centerSp: 7, maxSp: 12 })],
        enemyAction: { card: { name: 'Attack', type: 'attack' }, sp: 7, actor: 'enemy' },
        queue: createQueue(),
        currentQIndex: 0,
        enemyMaxSpeed: 30,
        addLog,
        playParrySound: vi.fn()
      });

      expect(result.parryEvents).toHaveLength(0);
    });

    it('maxSp와 같은 sp는 트리거해야 함 (enemySp <= maxSp)', () => {
      const addLog = vi.fn();
      const result = checkParryTrigger({
        parryReadyStates: [createParryState({ centerSp: 5, maxSp: 10 })],
        enemyAction: { card: { name: 'Attack', type: 'attack' }, sp: 10, actor: 'enemy' },
        queue: createQueue(),
        currentQIndex: 0,
        enemyMaxSpeed: 30,
        addLog,
        playParrySound: vi.fn()
      });

      expect(result.parryEvents).toHaveLength(1);
    });

    it('같은 편 공격은 트리거하지 않아야 함', () => {
      const addLog = vi.fn();
      const result = checkParryTrigger({
        parryReadyStates: [createParryState({ actor: 'enemy' })],
        enemyAction: { card: { name: 'Attack', type: 'attack' }, sp: 7, actor: 'enemy' },
        queue: createQueue(),
        currentQIndex: 0,
        enemyMaxSpeed: 30,
        addLog,
        playParrySound: vi.fn()
      });

      expect(result.parryEvents).toHaveLength(0);
    });

    it('패리 후 적 카드 sp를 밀어야 함', () => {
      const addLog = vi.fn();
      const queue = [
        { actor: 'player', card: { name: 'Current' }, sp: 5 },
        { actor: 'enemy', card: { name: 'Enemy 1', type: 'attack' }, sp: 8 },
        { actor: 'enemy', card: { name: 'Enemy 2', type: 'attack' }, sp: 12 }
      ];

      const result = checkParryTrigger({
        parryReadyStates: [createParryState({ pushAmount: 5 })],
        enemyAction: { card: { name: 'Enemy 1', type: 'attack' }, sp: 8, actor: 'enemy' },
        queue,
        currentQIndex: 0,
        enemyMaxSpeed: 30,
        addLog,
        playParrySound: vi.fn()
      });

      // 현재 인덱스 이후의 적 카드만 밀림
      const enemyCards = result.updatedQueue.filter(q => q.actor === 'enemy');
      expect(enemyCards[0].sp).toBe(13); // 8 + 5
      expect(enemyCards[1].sp).toBe(17); // 12 + 5
    });

    it('플레이어 카드는 밀리지 않아야 함', () => {
      const addLog = vi.fn();
      const queue = [
        { actor: 'player', card: { name: 'Current' }, sp: 5 },
        { actor: 'enemy', card: { name: 'Enemy', type: 'attack' }, sp: 8 },
        { actor: 'player', card: { name: 'Player Future' }, sp: 15 }
      ];

      const result = checkParryTrigger({
        parryReadyStates: [createParryState({ pushAmount: 5 })],
        enemyAction: { card: { name: 'Enemy', type: 'attack' }, sp: 8, actor: 'enemy' },
        queue,
        currentQIndex: 0,
        enemyMaxSpeed: 30,
        addLog,
        playParrySound: vi.fn()
      });

      const playerCard = result.updatedQueue.find(q => q.card.name === 'Player Future');
      expect(playerCard.sp).toBe(15); // 변경 없음
    });

    it('maxSpeed 초과 시 아웃 처리해야 함', () => {
      const addLog = vi.fn();
      const queue = [
        { actor: 'player', card: { name: 'Current' }, sp: 5 },
        { actor: 'enemy', card: { name: 'Enemy', type: 'attack' }, sp: 28 }
      ];

      const result = checkParryTrigger({
        parryReadyStates: [createParryState({ centerSp: 25, maxSp: 30, pushAmount: 5 })],
        enemyAction: { card: { name: 'Enemy', type: 'attack' }, sp: 28, actor: 'enemy' },
        queue,
        currentQIndex: 0,
        enemyMaxSpeed: 30,
        addLog,
        playParrySound: vi.fn()
      });

      expect(result.outCards).toHaveLength(1);
      expect(result.outCards[0].card.name).toBe('Enemy');
      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('아웃'));
    });

    it('여러 패리 상태가 동시에 트리거될 수 있어야 함', () => {
      const addLog = vi.fn();
      const result = checkParryTrigger({
        parryReadyStates: [
          createParryState({ cardName: 'Parry 1', pushAmount: 2 }),
          createParryState({ cardName: 'Parry 2', pushAmount: 3 })
        ],
        enemyAction: { card: { name: 'Attack', type: 'attack' }, sp: 7, actor: 'enemy' },
        queue: createQueue(),
        currentQIndex: 0,
        enemyMaxSpeed: 30,
        addLog,
        playParrySound: vi.fn()
      });

      expect(result.parryEvents).toHaveLength(2);
      // 총 5만큼 밀림
    });

    it('이미 트리거된 패리는 다시 트리거하지 않아야 함', () => {
      const addLog = vi.fn();
      const result = checkParryTrigger({
        parryReadyStates: [createParryState({ triggered: true })],
        enemyAction: { card: { name: 'Attack', type: 'attack' }, sp: 7, actor: 'enemy' },
        queue: createQueue(),
        currentQIndex: 0,
        enemyMaxSpeed: 30,
        addLog,
        playParrySound: vi.fn()
      });

      expect(result.parryEvents).toHaveLength(0);
    });

    it('단일 패리 상태도 처리해야 함 (하위 호환)', () => {
      const addLog = vi.fn();
      const result = checkParryTrigger({
        parryReadyStates: createParryState(), // 배열 아님
        enemyAction: { card: { name: 'Attack', type: 'attack' }, sp: 7, actor: 'enemy' },
        queue: createQueue(),
        currentQIndex: 0,
        enemyMaxSpeed: 30,
        addLog,
        playParrySound: vi.fn()
      });

      expect(result.parryEvents).toHaveLength(1);
    });

    it('null parryReadyStates는 빈 배열로 처리해야 함', () => {
      const addLog = vi.fn();
      const result = checkParryTrigger({
        parryReadyStates: null,
        enemyAction: { card: { name: 'Attack', type: 'attack' }, sp: 7, actor: 'enemy' },
        queue: createQueue(),
        currentQIndex: 0,
        enemyMaxSpeed: 30,
        addLog,
        playParrySound: vi.fn()
      });

      expect(result.parryEvents).toHaveLength(0);
      expect(result.updatedParryStates).toEqual([]);
    });

    it('패리 후 큐가 sp 기준으로 정렬되어야 함', () => {
      const addLog = vi.fn();
      const queue = [
        { actor: 'player', card: { name: 'Current' }, sp: 5 },
        { actor: 'enemy', card: { name: 'Enemy 1' }, sp: 8 },
        { actor: 'player', card: { name: 'Player 2' }, sp: 10 },
        { actor: 'enemy', card: { name: 'Enemy 2' }, sp: 12 }
      ];

      const result = checkParryTrigger({
        parryReadyStates: [createParryState({ pushAmount: 5 })],
        enemyAction: { card: { name: 'Attack', type: 'attack' }, sp: 7, actor: 'enemy' },
        queue,
        currentQIndex: 0,
        enemyMaxSpeed: 30,
        addLog,
        playParrySound: vi.fn()
      });

      // 밀린 후: Enemy 1 → 13, Player 2 → 10, Enemy 2 → 17
      // 정렬 후: Player 2(10), Enemy 1(13), Enemy 2(17)
      const afterCurrent = result.updatedQueue.slice(1);
      expect(afterCurrent[0].card.name).toBe('Player 2');
      expect(afterCurrent[1].card.name).toBe('Enemy 1');
      expect(afterCurrent[2].card.name).toBe('Enemy 2');
    });
  });

  describe('resetParryState', () => {
    it('null을 반환해야 함', () => {
      expect(resetParryState()).toBeNull();
    });
  });
});
