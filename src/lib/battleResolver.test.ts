/**
 * @file battleResolver.test.ts
 * @description battleResolver 함수 테스트
 */

import { describe, it, expect } from 'vitest';
import { simulateBattle, pickOutcome, clamp, cloneState, applyAttack, applyBlock, applySupport } from './battleResolver';
import type {
  ResolverTimelineEntry as TimelineEntry,
  ResolverBattleStats as BattleStats,
} from '../types';

describe('battleResolver', () => {
  describe('simulateBattle', () => {
    describe('기본 동작', () => {
      it('빈 타임라인이면 draw를 반환해야 함', () => {
        const result = simulateBattle([], { player: { hp: 50, block: 0 }, enemy: { hp: 40, block: 0 } });
        expect(result.winner).toBe('player'); // 같거나 높으면 player 승리
        expect(result.log).toHaveLength(0);
      });

      it('타임라인 없이 호출하면 기본값 사용', () => {
        const result = simulateBattle();
        expect(result.winner).toBe('player');
        expect(result.finalState.player.hp).toBe(50);
        expect(result.finalState.enemy.hp).toBe(40);
      });

      it('초기 상태를 보존해야 함', () => {
        const stats: BattleStats = {
          player: { hp: 100, block: 10 },
          enemy: { hp: 80, block: 5 },
        };
        const result = simulateBattle([], stats);
        expect(result.initialState.player.hp).toBe(100);
        expect(result.initialState.player.block).toBe(10);
        expect(result.initialState.enemy.hp).toBe(80);
        expect(result.initialState.enemy.block).toBe(5);
      });
    });

    describe('공격 처리', () => {
      it('플레이어 공격이 적 HP를 감소시켜야 함', () => {
        const timeline: TimelineEntry[] = [
          { order: 1, actor: 'player', cardId: 'shoot', speedCost: 3, tu: 0, priorityWeight: 0, priority: '', actionCost: 0, tags: [], roll: 0 },
        ];
        const stats: BattleStats = {
          player: { hp: 50, block: 0 },
          enemy: { hp: 40, block: 0 },
        };

        const result = simulateBattle(timeline, stats);

        expect(result.finalState.enemy.hp).toBe(35); // 40 - 5 (shoot damage)
        expect(result.log).toHaveLength(1);
        expect(result.log[0].detail?.type).toBe('attack');
      });

      it('적 공격이 플레이어 HP를 감소시켜야 함', () => {
        const timeline: TimelineEntry[] = [
          { order: 1, actor: 'enemy', cardId: 'strike', speedCost: 8, tu: 0, priorityWeight: 0, priority: '', actionCost: 0, tags: [], roll: 0 },
        ];
        const stats: BattleStats = {
          player: { hp: 50, block: 0 },
          enemy: { hp: 40, block: 0 },
        };

        const result = simulateBattle(timeline, stats);

        expect(result.finalState.player.hp).toBe(35); // 50 - 15 (strike damage)
      });

      it('방어력이 피해를 흡수해야 함', () => {
        const timeline: TimelineEntry[] = [
          { order: 1, actor: 'player', cardId: 'shoot', speedCost: 3, tu: 0, priorityWeight: 0, priority: '', actionCost: 0, tags: [], roll: 0 },
        ];
        const stats: BattleStats = {
          player: { hp: 50, block: 0 },
          enemy: { hp: 40, block: 10 },
        };

        const result = simulateBattle(timeline, stats);

        expect(result.finalState.enemy.hp).toBe(40); // 피해 5, 방어 10이므로 HP 손실 없음
        expect(result.finalState.enemy.block).toBe(5); // 10 - 5
      });

      it('방어력보다 높은 피해는 HP를 감소시켜야 함', () => {
        const timeline: TimelineEntry[] = [
          { order: 1, actor: 'player', cardId: 'strike', speedCost: 8, tu: 0, priorityWeight: 0, priority: '', actionCost: 0, tags: [], roll: 0 },
        ];
        const stats: BattleStats = {
          player: { hp: 50, block: 0 },
          enemy: { hp: 40, block: 5 },
        };

        const result = simulateBattle(timeline, stats);

        expect(result.finalState.enemy.hp).toBe(30); // 40 - (15 - 5)
        expect(result.finalState.enemy.block).toBe(0);
      });

      it('연속 공격이 누적되어야 함', () => {
        const timeline: TimelineEntry[] = [
          { order: 1, actor: 'player', cardId: 'shoot', speedCost: 3, tu: 0, priorityWeight: 0, priority: '', actionCost: 0, tags: [], roll: 0 },
          { order: 2, actor: 'player', cardId: 'shoot', speedCost: 6, tu: 0, priorityWeight: 0, priority: '', actionCost: 0, tags: [], roll: 0 },
        ];
        const stats: BattleStats = {
          player: { hp: 50, block: 0 },
          enemy: { hp: 40, block: 0 },
        };

        const result = simulateBattle(timeline, stats);

        expect(result.finalState.enemy.hp).toBe(30); // 40 - 5 - 5
        expect(result.log).toHaveLength(2);
      });
    });

    describe('방어 처리', () => {
      it('방어 카드가 방어력을 추가해야 함', () => {
        const timeline: TimelineEntry[] = [
          { order: 1, actor: 'player', cardId: 'marche', speedCost: 6, tu: 0, priorityWeight: 0, priority: '', actionCost: 0, tags: [], roll: 0 },
        ];
        const stats: BattleStats = {
          player: { hp: 50, block: 0 },
          enemy: { hp: 40, block: 0 },
        };

        const result = simulateBattle(timeline, stats);

        expect(result.finalState.player.block).toBe(5); // marche block: 5
        expect(result.log[0].detail?.type).toBe('block');
      });

      it('연속 방어가 누적되어야 함', () => {
        const timeline: TimelineEntry[] = [
          { order: 1, actor: 'player', cardId: 'marche', speedCost: 6, tu: 0, priorityWeight: 0, priority: '', actionCost: 0, tags: [], roll: 0 },
          { order: 2, actor: 'player', cardId: 'marche', speedCost: 12, tu: 0, priorityWeight: 0, priority: '', actionCost: 0, tags: [], roll: 0 },
        ];
        const stats: BattleStats = {
          player: { hp: 50, block: 5 },
          enemy: { hp: 40, block: 0 },
        };

        const result = simulateBattle(timeline, stats);

        expect(result.finalState.player.block).toBe(15); // 5 + 5 + 5
      });
    });

    describe('승패 판정', () => {
      it('적 HP가 0이면 플레이어 승리', () => {
        const timeline: TimelineEntry[] = [
          { order: 1, actor: 'player', cardId: 'lunge', speedCost: 12, tu: 0, priorityWeight: 0, priority: '', actionCost: 0, tags: [], roll: 0 },
        ];
        const stats: BattleStats = {
          player: { hp: 50, block: 0 },
          enemy: { hp: 20, block: 0 },
        };

        const result = simulateBattle(timeline, stats);

        expect(result.winner).toBe('player');
        expect(result.finalState.enemy.hp).toBe(0); // lunge damage 20
      });

      it('플레이어 HP가 0이면 적 승리', () => {
        const timeline: TimelineEntry[] = [
          { order: 1, actor: 'enemy', cardId: 'lunge', speedCost: 12, tu: 0, priorityWeight: 0, priority: '', actionCost: 0, tags: [], roll: 0 },
        ];
        const stats: BattleStats = {
          player: { hp: 20, block: 0 },
          enemy: { hp: 40, block: 0 },
        };

        const result = simulateBattle(timeline, stats);

        expect(result.winner).toBe('enemy');
        expect(result.finalState.player.hp).toBe(0); // lunge damage 20
      });

      it('양쪽 다 생존하면 HP가 높은 쪽이 승리', () => {
        const timeline: TimelineEntry[] = [
          { order: 1, actor: 'player', cardId: 'shoot', speedCost: 3, tu: 0, priorityWeight: 0, priority: '', actionCost: 0, tags: [], roll: 0 },
        ];
        const stats: BattleStats = {
          player: { hp: 30, block: 0 },
          enemy: { hp: 40, block: 0 },
        };

        const result = simulateBattle(timeline, stats);

        // 적 HP: 40 - 5 = 35, 플레이어 HP: 30
        // 35 > 30 이므로 적 승리
        expect(result.winner).toBe('enemy');
      });

      it('HP가 같으면 플레이어 승리', () => {
        const timeline: TimelineEntry[] = [
          { order: 1, actor: 'player', cardId: 'shoot', speedCost: 3, tu: 0, priorityWeight: 0, priority: '', actionCost: 0, tags: [], roll: 0 },
        ];
        const stats: BattleStats = {
          player: { hp: 35, block: 0 },
          enemy: { hp: 40, block: 0 },
        };

        const result = simulateBattle(timeline, stats);

        // 적 HP: 40 - 5 = 35, 플레이어 HP: 35
        // 같으면 플레이어 승리
        expect(result.winner).toBe('player');
      });

      it('HP가 0이 되면 나머지 카드 실행 중단', () => {
        const timeline: TimelineEntry[] = [
          { order: 1, actor: 'player', cardId: 'lunge', speedCost: 12, tu: 0, priorityWeight: 0, priority: '', actionCost: 0, tags: [], roll: 0 },
          { order: 2, actor: 'player', cardId: 'shoot', speedCost: 15, tu: 0, priorityWeight: 0, priority: '', actionCost: 0, tags: [], roll: 0 },
          { order: 3, actor: 'enemy', cardId: 'lunge', speedCost: 12, tu: 0, priorityWeight: 0, priority: '', actionCost: 0, tags: [], roll: 0 },
        ];
        const stats: BattleStats = {
          player: { hp: 50, block: 0 },
          enemy: { hp: 20, block: 0 },
        };

        const result = simulateBattle(timeline, stats);

        // 첫 공격으로 적 HP 0, 나머지 실행 안 됨
        expect(result.winner).toBe('player');
        expect(result.log).toHaveLength(1);
        expect(result.finalState.player.hp).toBe(50); // 적 공격 실행 안 됨
      });
    });

    describe('로그 기록', () => {
      it('로그에 카드 정보가 기록되어야 함', () => {
        const timeline: TimelineEntry[] = [
          { order: 1, actor: 'player', cardId: 'shoot', speedCost: 3, tu: 0, priorityWeight: 0, priority: '', actionCost: 0, tags: [], roll: 0 },
        ];

        const result = simulateBattle(timeline);

        expect(result.log[0].cardId).toBe('shoot');
        expect(result.log[0].name).toBe('사격');
        expect(result.log[0].actor).toBe('player');
        expect(result.log[0].speedCost).toBe(3);
      });

      it('공격 로그에 피해 정보가 있어야 함', () => {
        const timeline: TimelineEntry[] = [
          { order: 1, actor: 'player', cardId: 'shoot', speedCost: 3, tu: 0, priorityWeight: 0, priority: '', actionCost: 0, tags: [], roll: 0 },
        ];
        const stats: BattleStats = {
          player: { hp: 50, block: 0 },
          enemy: { hp: 40, block: 3 },
        };

        const result = simulateBattle(timeline, stats);

        expect(result.log[0].detail).toEqual({
          type: 'attack',
          blocked: 3,
          hpDamage: 2,
          targetHP: 38,
          targetBlock: 0,
        });
      });

      it('방어 로그에 방어량 정보가 있어야 함', () => {
        const timeline: TimelineEntry[] = [
          { order: 1, actor: 'player', cardId: 'marche', speedCost: 6, tu: 0, priorityWeight: 0, priority: '', actionCost: 0, tags: [], roll: 0 },
        ];

        const result = simulateBattle(timeline);

        expect(result.log[0].detail).toEqual({
          type: 'block',
          block: 5,
          actorBlock: 5,
        });
      });
    });

    describe('존재하지 않는 카드', () => {
      it('존재하지 않는 카드는 무시해야 함', () => {
        const timeline: TimelineEntry[] = [
          { order: 1, actor: 'player', cardId: 'nonexistent_card', speedCost: 5, tu: 0, priorityWeight: 0, priority: '', actionCost: 0, tags: [], roll: 0 },
          { order: 2, actor: 'player', cardId: 'shoot', speedCost: 8, tu: 0, priorityWeight: 0, priority: '', actionCost: 0, tags: [], roll: 0 },
        ];

        const result = simulateBattle(timeline);

        expect(result.log).toHaveLength(1);
        expect(result.log[0].cardId).toBe('shoot');
      });
    });

    describe('지원 카드', () => {
      it('피해/방어 없는 카드는 지원 타입으로 처리', () => {
        const timeline: TimelineEntry[] = [
          { order: 1, actor: 'player', cardId: 'shout', speedCost: 1, tu: 0, priorityWeight: 0, priority: '', actionCost: 0, tags: [], roll: 0 },
        ];

        const result = simulateBattle(timeline);

        expect(result.log[0].detail?.type).toBe('support');
      });
    });

    describe('복합 시나리오', () => {
      it('공격과 방어가 교차하는 전투', () => {
        const timeline: TimelineEntry[] = [
          { order: 1, actor: 'player', cardId: 'octave', speedCost: 8, tu: 0, priorityWeight: 0, priority: '', actionCost: 0, tags: [], roll: 0 },
          { order: 2, actor: 'enemy', cardId: 'strike', speedCost: 10, tu: 0, priorityWeight: 0, priority: '', actionCost: 0, tags: [], roll: 0 },
          { order: 3, actor: 'player', cardId: 'strike', speedCost: 18, tu: 0, priorityWeight: 0, priority: '', actionCost: 0, tags: [], roll: 0 },
        ];
        const stats: BattleStats = {
          player: { hp: 50, block: 0 },
          enemy: { hp: 40, block: 0 },
        };

        const result = simulateBattle(timeline, stats);

        // 플레이어: 옥타브로 12 방어, 적 15 공격 받음 -> 방어 0, HP 50-3=47
        // 적: 플레이어 15 공격 받음 -> HP 40-15=25
        expect(result.finalState.player.hp).toBe(47);
        expect(result.finalState.player.block).toBe(0);
        expect(result.finalState.enemy.hp).toBe(25);
      });
    });
  });

  describe('pickOutcome', () => {
    it('null이면 fallback 반환', () => {
      expect(pickOutcome(null)).toBe('victory');
      expect(pickOutcome(null, 'defeat')).toBe('defeat');
    });

    it('플레이어 승리면 victory 반환', () => {
      const simulation = {
        winner: 'player' as const,
        log: [],
        finalState: { player: { hp: 50, block: 0 }, enemy: { hp: 0, block: 0 } },
        initialState: { player: { hp: 50, block: 0 }, enemy: { hp: 40, block: 0 } },
        status: {},
      };

      expect(pickOutcome(simulation)).toBe('victory');
    });

    it('적 승리면 defeat 반환', () => {
      const simulation = {
        winner: 'enemy' as const,
        log: [],
        finalState: { player: { hp: 0, block: 0 }, enemy: { hp: 40, block: 0 } },
        initialState: { player: { hp: 50, block: 0 }, enemy: { hp: 40, block: 0 } },
        status: {},
      };

      expect(pickOutcome(simulation)).toBe('defeat');
    });

    it('draw면 fallback 반환', () => {
      const simulation = {
        winner: 'draw' as const,
        log: [],
        finalState: { player: { hp: 30, block: 0 }, enemy: { hp: 30, block: 0 } },
        initialState: { player: { hp: 50, block: 0 }, enemy: { hp: 40, block: 0 } },
        status: {},
      };

      expect(pickOutcome(simulation)).toBe('victory');
      expect(pickOutcome(simulation, 'custom')).toBe('custom');
    });
  });

  describe('clamp', () => {
    it('값이 범위 내이면 그대로 반환', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('값이 min보다 작으면 min 반환', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it('값이 max보다 크면 max 반환', () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('경계값 처리', () => {
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });
  });

  describe('cloneState', () => {
    it('기본값으로 상태 생성', () => {
      const state = cloneState();
      expect(state.player.hp).toBe(50);
      expect(state.player.block).toBe(0);
      expect(state.enemy.hp).toBe(40);
      expect(state.enemy.block).toBe(0);
    });

    it('커스텀 상태 복제', () => {
      const original = {
        player: { hp: 100, block: 20 },
        enemy: { hp: 80, block: 15 },
      };
      const cloned = cloneState(original);

      expect(cloned.player.hp).toBe(100);
      expect(cloned.player.block).toBe(20);
      expect(cloned.enemy.hp).toBe(80);
      expect(cloned.enemy.block).toBe(15);
    });

    it('원본과 독립적이어야 함', () => {
      const original = {
        player: { hp: 50, block: 10 },
        enemy: { hp: 40, block: 5 },
      };
      const cloned = cloneState(original);
      cloned.player.hp = 0;

      expect(original.player.hp).toBe(50);
    });

    it('부분 데이터에 기본값 적용', () => {
      const partial = {
        player: { hp: 30 },
        enemy: {},
      } as any;
      const state = cloneState(partial);

      expect(state.player.hp).toBe(30);
      expect(state.player.block).toBe(0);
      expect(state.enemy.hp).toBe(40);
    });
  });

  describe('applyAttack', () => {
    it('방어력 없는 대상에게 피해 적용', () => {
      const attacker = { hp: 50, block: 0 };
      const defender = { hp: 40, block: 0 };
      const card = { damage: 10 } as any;

      const result = applyAttack(attacker, defender, card);

      expect(result.blocked).toBe(0);
      expect(result.hpDamage).toBe(10);
      expect(defender.hp).toBe(30);
    });

    it('방어력이 피해를 흡수', () => {
      const attacker = { hp: 50, block: 0 };
      const defender = { hp: 40, block: 15 };
      const card = { damage: 10 } as any;

      const result = applyAttack(attacker, defender, card);

      expect(result.blocked).toBe(10);
      expect(result.hpDamage).toBe(0);
      expect(defender.hp).toBe(40);
      expect(defender.block).toBe(5);
    });

    it('방어력보다 높은 피해는 HP 감소', () => {
      const attacker = { hp: 50, block: 0 };
      const defender = { hp: 40, block: 5 };
      const card = { damage: 10 } as any;

      const result = applyAttack(attacker, defender, card);

      expect(result.blocked).toBe(5);
      expect(result.hpDamage).toBe(5);
      expect(defender.hp).toBe(35);
      expect(defender.block).toBe(0);
    });

    it('피해 없는 카드는 0 피해', () => {
      const attacker = { hp: 50, block: 0 };
      const defender = { hp: 40, block: 0 };
      const card = {} as any;

      const result = applyAttack(attacker, defender, card);

      expect(result.blocked).toBe(0);
      expect(result.hpDamage).toBe(0);
      expect(defender.hp).toBe(40);
    });
  });

  describe('applyBlock', () => {
    it('방어력 추가', () => {
      const actor = { hp: 50, block: 0 };
      const card = { block: 8 } as any;

      const result = applyBlock(actor, card);

      expect(result.block).toBe(8);
      expect(actor.block).toBe(8);
    });

    it('기존 방어력에 누적', () => {
      const actor = { hp: 50, block: 5 };
      const card = { block: 10 } as any;

      const result = applyBlock(actor, card);

      expect(result.block).toBe(10);
      expect(actor.block).toBe(15);
    });

    it('방어력 없는 카드는 0 추가', () => {
      const actor = { hp: 50, block: 3 };
      const card = {} as any;

      const result = applyBlock(actor, card);

      expect(result.block).toBe(0);
      expect(actor.block).toBe(3);
    });
  });

  describe('applySupport', () => {
    it('buff 태그가 있으면 버프 적용', () => {
      const actor = { hp: 50, block: 0 };
      const card = { id: 'power_up', tags: ['buff'] } as any;
      const status: Record<string, boolean> = {};

      const result = applySupport(actor, card, status);

      expect(result).toEqual({ buff: 'power_up' });
      expect(status['power_up_buff']).toBe(true);
    });

    it('buff 태그가 없으면 null 반환', () => {
      const actor = { hp: 50, block: 0 };
      const card = { id: 'skill', tags: ['utility'] } as any;
      const status: Record<string, boolean> = {};

      const result = applySupport(actor, card, status);

      expect(result).toBeNull();
    });

    it('tags가 없는 카드는 null 반환', () => {
      const actor = { hp: 50, block: 0 };
      const card = { id: 'test' } as any;
      const status: Record<string, boolean> = {};

      const result = applySupport(actor, card, status);

      expect(result).toBeNull();
    });
  });
});
