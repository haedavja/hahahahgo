/**
 * @file battleSimulation.test.js
 * @description 전투 시뮬레이션 함수 테스트
 *
 * ## 테스트 대상
 * - applyAction: 공격/방어 액션을 상태에 적용하고 데미지 계산
 * - simulatePreview: 턴 전체를 미리보기로 시뮬레이션
 *
 * ## 주요 테스트 케이스
 * - 방어: block 누적, strength 보너스, counter 반격
 * - 공격: 기본 데미지, 다타(hits), crush 특성, 취약(vulnMult)
 * - 에테르 폭주: 2배 피해 적용
 * - 시뮬레이션: 연속 액션, 플레이어 사망 시 중단
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyAction, simulatePreview } from './battleSimulation';

vi.mock('./enemyAI', () => ({
  shouldEnemyOverdrive: vi.fn(() => false)
}));

import { shouldEnemyOverdrive } from './enemyAI';

describe('battleSimulation', () => {
  describe('applyAction', () => {
    const createState = (overrides: any = {}) => ({
      player: { hp: 100, block: 0, def: false, strength: 0, ...overrides.player },
      enemy: { hp: 100, block: 0, def: false, strength: 0, ...overrides.enemy },
      log: []
    } as any);

    describe('방어 카드', () => {
      it('방어 카드는 block을 추가해야 함', () => {
        const state: any = createState();
        const card = { name: 'Defend', type: 'defense', block: 10 };

        const result = applyAction(state, 'player', card);

        expect(state.player.block).toBe(10);
        expect(state.player.def).toBe(true);
        expect(result.dealt).toBe(0);
        expect(result.events[0].type).toBe('defense');
      });

      it('strength가 방어력에 추가되어야 함', () => {
        const state: any = createState({ player: { strength: 3 } });
        const card = { name: 'Defend', type: 'defense', block: 10 };

        applyAction(state, 'player', card);

        expect(state.player.block).toBe(13); // 10 + 3
      });

      it('방어력이 누적되어야 함', () => {
        const state: any = createState({ player: { block: 5, def: true } });
        const card = { name: 'Defend', type: 'defense', block: 10 };

        applyAction(state, 'player', card);

        expect(state.player.block).toBe(15); // 5 + 10
      });

      it('counter 카드는 반격 값을 설정해야 함', () => {
        const state: any = createState();
        const card = { name: 'Counter', type: 'defense', block: 5, counter: 8 };

        applyAction(state, 'player', card);

        expect(state.player.counter).toBe(8);
      });

      it('general 타입도 방어로 처리해야 함', () => {
        const state: any = createState();
        const card = { name: 'General', type: 'general', block: 7 };

        applyAction(state, 'player', card);

        expect(state.player.block).toBe(7);
        expect(state.player.def).toBe(true);
      });
    });

    describe('공격 카드', () => {
      it('기본 공격은 적 HP를 감소시켜야 함', () => {
        const state: any = createState();
        const card = { name: 'Strike', type: 'attack', damage: 15 };

        const result = applyAction(state, 'player', card);

        expect(state.enemy.hp).toBe(85);
        expect(result.dealt).toBe(15);
        expect(result.events[0].type).toBe('hit');
      });

      it('strength가 데미지에 추가되어야 함', () => {
        const state: any = createState({ player: { strength: 5 } });
        const card = { name: 'Strike', type: 'attack', damage: 10 };

        const result = applyAction(state, 'player', card);

        expect(result.dealt).toBe(15); // 10 + 5
        expect(state.enemy.hp).toBe(85);
      });

      it('에테르 폭주 시 2배 피해를 줘야 함', () => {
        const state: any = createState({ player: { etherOverdriveActive: true } });
        const card = { name: 'Strike', type: 'attack', damage: 10 };

        const result = applyAction(state, 'player', card);

        expect(result.dealt).toBe(20);
        expect(state.enemy.hp).toBe(80);
      });

      it('다타 공격은 hits만큼 반복해야 함', () => {
        const state: any = createState();
        const card = { name: 'Multi', type: 'attack', damage: 5, hits: 3 };

        const result = applyAction(state, 'player', card);

        expect(result.dealt).toBe(15); // 5 * 3
        expect(state.enemy.hp).toBe(85);
      });

      it('방어력 차단 시 피해가 감소해야 함', () => {
        const state: any = createState({ enemy: { block: 20, def: true } });
        const card = { name: 'Strike', type: 'attack', damage: 15 };

        const result = applyAction(state, 'player', card);

        expect(state.enemy.block).toBe(5); // 20 - 15
        expect(state.enemy.hp).toBe(100); // 피해 없음
        expect(result.dealt).toBe(0);
        expect(result.events[0].type).toBe('blocked');
      });

      it('방어력 관통 시 초과 피해를 줘야 함', () => {
        const state: any = createState({ enemy: { block: 10, def: true } });
        const card = { name: 'Strike', type: 'attack', damage: 25 };

        const result = applyAction(state, 'player', card);

        expect(state.enemy.block).toBe(0);
        expect(state.enemy.hp).toBe(85); // 100 - 15 관통
        expect(result.dealt).toBe(15);
        expect(result.events[0].type).toBe('pierce');
      });

      it('crush 특성은 방어력에 2배 피해를 줘야 함', () => {
        const state: any = createState({ enemy: { block: 30, def: true } });
        const card = { name: 'Crush', type: 'attack', damage: 10, traits: ['crush'] };

        const result = applyAction(state, 'player', card);

        // crush: 10 * 2 = 20 방어력 피해
        expect(state.enemy.block).toBe(10); // 30 - 20
        expect(result.dealt).toBe(0);
      });

      it('crush 관통 시 초과 피해를 줘야 함', () => {
        const state: any = createState({ enemy: { block: 10, def: true } });
        const card = { name: 'Crush', type: 'attack', damage: 10, traits: ['crush'] };

        const result = applyAction(state, 'player', card);

        // crush: 10 * 2 = 20, 10 방어 파괴, 10 관통
        expect(state.enemy.block).toBe(0);
        expect(state.enemy.hp).toBe(90);
        expect(result.dealt).toBe(10);
      });

      it('취약(vulnMult) 시 추가 피해를 줘야 함', () => {
        const state: any = createState({ enemy: { vulnMult: 1.5 } });
        const card = { name: 'Strike', type: 'attack', damage: 10 };

        const result = applyAction(state, 'player', card);

        expect(result.dealt).toBe(15); // 10 * 1.5
        expect(state.enemy.hp).toBe(85);
      });

      it('반격 시 공격자가 피해를 받아야 함', () => {
        const state: any = createState({ enemy: { counter: 5 } });
        const card = { name: 'Strike', type: 'attack', damage: 10 };

        const result = applyAction(state, 'player', card);

        expect(state.player.hp).toBe(95); // 반격 5 피해
        expect(result.taken).toBe(5);
      });

      it('반격은 방어 관통 시에만 발동해야 함', () => {
        const state: any = createState({ enemy: { block: 50, def: true, counter: 10 } });
        const card = { name: 'Strike', type: 'attack', damage: 10 };

        const result = applyAction(state, 'player', card);

        expect(state.player.hp).toBe(100); // 완전 차단, 반격 없음
        expect(result.taken).toBe(0);
      });

      it('적 HP는 0 미만으로 떨어지지 않아야 함', () => {
        const state: any = createState({ enemy: { hp: 5 } });
        const card = { name: 'Strike', type: 'attack', damage: 100 };

        applyAction(state, 'player', card);

        expect(state.enemy.hp).toBe(0);
      });

      it('적도 플레이어를 공격할 수 있어야 함', () => {
        const state: any = createState();
        const card = { name: 'Enemy Strike', type: 'attack', damage: 20 };

        const result = applyAction(state, 'enemy', card);

        expect(state.player.hp).toBe(80);
        expect(result.dealt).toBe(20);
      });
    });

    describe('기타 카드', () => {
      it('알 수 없는 타입은 무시해야 함', () => {
        const state: any = createState();
        const card = { name: 'Unknown', type: 'special', damage: 10 };

        const result = applyAction(state, 'player', card);

        expect(result.dealt).toBe(0);
        expect(result.taken).toBe(0);
        expect(state.enemy.hp).toBe(100);
      });
    });
  });

  describe('simulatePreview', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('빈 fixedOrder는 변경 없이 반환해야 함', () => {
      const result = simulatePreview({
        player: { hp: 100 } as any,
        enemy: { hp: 100 } as any,
        fixedOrder: [],
        willOverdrive: false,
        enemyMode: 'normal' as any,
        enemyActions: []
      } as any);

      expect(result.pDealt).toBe(0);
      expect(result.pTaken).toBe(0);
      expect(result.finalPHp).toBe(100);
      expect(result.finalEHp).toBe(100);
    });

    it('null fixedOrder는 변경 없이 반환해야 함', () => {
      const result = simulatePreview({
        player: { hp: 100 } as any,
        enemy: { hp: 100 } as any,
        fixedOrder: null as any,
        willOverdrive: false,
        enemyMode: 'normal' as any,
        enemyActions: []
      } as any);

      expect(result.finalPHp).toBe(100);
      expect(result.finalEHp).toBe(100);
    });

    it('플레이어 공격을 시뮬레이션해야 함', () => {
      const result = simulatePreview({
        player: { hp: 100 } as any,
        enemy: { hp: 100 } as any,
        fixedOrder: [
          { actor: 'player', card: { name: 'Strike', type: 'attack', damage: 20 } } as any
        ],
        willOverdrive: false,
        enemyMode: 'normal' as any,
        enemyActions: []
      } as any);

      expect(result.pDealt).toBe(20);
      expect(result.finalEHp).toBe(80);
    });

    it('적 공격을 시뮬레이션해야 함', () => {
      const result = simulatePreview({
        player: { hp: 100 } as any,
        enemy: { hp: 100 } as any,
        fixedOrder: [
          { actor: 'enemy', card: { name: 'Strike', type: 'attack', damage: 15 } } as any
        ],
        willOverdrive: false,
        enemyMode: 'normal' as any,
        enemyActions: []
      } as any);

      expect(result.pTaken).toBe(15);
      expect(result.finalPHp).toBe(85);
    });

    it('연속 액션을 시뮬레이션해야 함', () => {
      const result = simulatePreview({
        player: { hp: 100 } as any,
        enemy: { hp: 100 } as any,
        fixedOrder: [
          { actor: 'player', card: { name: 'Strike', type: 'attack', damage: 10 } } as any,
          { actor: 'enemy', card: { name: 'Strike', type: 'attack', damage: 5 } } as any,
          { actor: 'player', card: { name: 'Strike', type: 'attack', damage: 15 } } as any
        ],
        willOverdrive: false,
        enemyMode: 'normal' as any,
        enemyActions: []
      } as any);

      expect(result.pDealt).toBe(25); // 10 + 15
      expect(result.pTaken).toBe(5);
      expect(result.finalPHp).toBe(95);
      expect(result.finalEHp).toBe(75);
    });

    it('플레이어 에테르 폭주를 적용해야 함', () => {
      const result = simulatePreview({
        player: { hp: 100 } as any,
        enemy: { hp: 100 } as any,
        fixedOrder: [
          { actor: 'player', card: { name: 'Strike', type: 'attack', damage: 10 } } as any
        ],
        willOverdrive: true,
        enemyMode: 'normal' as any,
        enemyActions: []
      } as any);

      expect(result.pDealt).toBe(20); // 10 * 2
    });

    it('적 에테르 폭주를 적용해야 함', () => {
      (shouldEnemyOverdrive as any).mockReturnValue(true);

      const result = simulatePreview({
        player: { hp: 100 } as any,
        enemy: { hp: 100, etherPts: 10 } as any,
        fixedOrder: [
          { actor: 'enemy', card: { name: 'Strike', type: 'attack', damage: 10 } } as any
        ],
        willOverdrive: false,
        enemyMode: 'normal' as any,
        enemyActions: [],
        turnNumber: 1
      } as any);

      expect(result.pTaken).toBe(20); // 10 * 2
    });

    it('플레이어 사망 시 시뮬레이션 중단해야 함', () => {
      const result = simulatePreview({
        player: { hp: 10 } as any,
        enemy: { hp: 100 } as any,
        fixedOrder: [
          { actor: 'enemy', card: { name: 'Big Hit', type: 'attack', damage: 50 } } as any,
          { actor: 'player', card: { name: 'Strike', type: 'attack', damage: 20 } } as any // 실행 안 됨
        ],
        willOverdrive: false,
        enemyMode: 'normal' as any,
        enemyActions: []
      } as any);

      expect(result.finalPHp).toBe(0);
      expect(result.pDealt).toBe(0); // 플레이어 공격 실행 안 됨
      expect(result.finalEHp).toBe(100);
    });

    it('방어와 공격 조합을 시뮬레이션해야 함', () => {
      const result = simulatePreview({
        player: { hp: 100 } as any,
        enemy: { hp: 100 } as any,
        fixedOrder: [
          { actor: 'player', card: { name: 'Defend', type: 'defense', block: 15 } } as any,
          { actor: 'enemy', card: { name: 'Strike', type: 'attack', damage: 10 } } as any
        ],
        willOverdrive: false,
        enemyMode: 'normal' as any,
        enemyActions: []
      } as any);

      expect(result.finalPHp).toBe(100); // 방어 성공
      expect(result.pTaken).toBe(0);
    });

    it('strength를 시뮬레이션에 반영해야 함', () => {
      const result = simulatePreview({
        player: { hp: 100, strength: 5 } as any,
        enemy: { hp: 100 } as any,
        fixedOrder: [
          { actor: 'player', card: { name: 'Strike', type: 'attack', damage: 10 } } as any
        ],
        willOverdrive: false,
        enemyMode: 'normal' as any,
        enemyActions: []
      } as any);

      expect(result.pDealt).toBe(15); // 10 + 5
    });

    it('lines에 전투 로그를 기록해야 함', () => {
      const result = simulatePreview({
        player: { hp: 100 } as any,
        enemy: { hp: 100 } as any,
        fixedOrder: [
          { actor: 'player', card: { name: 'Strike', type: 'attack', damage: 10 } } as any
        ],
        willOverdrive: false,
        enemyMode: 'normal' as any,
        enemyActions: []
      } as any);

      expect(result.lines.length).toBeGreaterThan(0);
    });
  });
});
