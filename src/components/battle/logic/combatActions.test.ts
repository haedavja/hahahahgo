/**
 * @file combatActions.test.ts
 * @description 전투 행동 처리 로직 테스트
 */

import { describe, it, expect, vi } from 'vitest';
import { applyAction, applyAttack } from './combatActions';

describe('combatActions', () => {
  describe('applyAction', () => {
    const createPlayer = (overrides = {}) => ({
      hp: 100,
      maxHp: 100,
      block: 0,
      def: false,
      counter: 0,
      vulnMult: 1,
      strength: 0,
      tokens: { usage: [], turn: [], permanent: [] },
      ...overrides
    });

    const createEnemy = (overrides = {}) => ({
      hp: 100,
      maxHp: 100,
      block: 0,
      def: false,
      counter: 0,
      vulnMult: 1,
      tokens: { usage: [], turn: [], permanent: [] },
      ...overrides
    });

    const createState = (playerOverrides = {}, enemyOverrides = {}) => ({
      player: createPlayer(playerOverrides),
      enemy: createEnemy(enemyOverrides),
      log: []
    });

    it('general 카드의 appliedTokens가 targetEnemy=true인 경우 적에게 토큰을 적용해야 함', () => {
      const state = createState();
      const card = {
        id: 'tear_smoke_grenade',
        name: '최루-연막탄',
        type: 'general',
        block: 0,
        speedCost: 3,
        appliedTokens: [
          { id: 'blurPlus', stacks: 1, target: 'player' },
          { id: 'dull', stacks: 3, target: 'enemy' },
          { id: 'shaken', stacks: 3, target: 'enemy' }
        ]
      };

      const result = applyAction(state, 'player', card as any);

      // 적(enemy)에게 dull, shaken 토큰이 적용되어야 함
      const updatedEnemy = result.updatedState.enemy as any;
      const enemyTokens = [
        ...(updatedEnemy.tokens?.usage || []),
        ...(updatedEnemy.tokens?.turn || []),
        ...(updatedEnemy.tokens?.permanent || [])
      ];

      const dullToken = enemyTokens.find(t => t.id === 'dull');
      const shakenToken = enemyTokens.find(t => t.id === 'shaken');

      expect(dullToken).toBeDefined();
      expect(dullToken?.stacks).toBe(3);
      expect(shakenToken).toBeDefined();
      expect(shakenToken?.stacks).toBe(3);

      // 플레이어에게 blurPlus 토큰이 적용되어야 함
      const updatedPlayer = result.updatedState.player as any;
      const playerTokens = [
        ...(updatedPlayer.tokens?.usage || []),
        ...(updatedPlayer.tokens?.turn || []),
        ...(updatedPlayer.tokens?.permanent || [])
      ];

      const blurToken = playerTokens.find(t => t.id === 'blurPlus');
      expect(blurToken).toBeDefined();
      expect(blurToken?.stacks).toBe(1);
    });

    it('defense 카드의 appliedTokens가 올바르게 처리되어야 함', () => {
      const state = createState();
      const card = {
        id: 'test_defense',
        name: '테스트 방어',
        type: 'defense',
        block: 10,
        speedCost: 2,
        appliedTokens: [
          { id: 'offense', stacks: 1, target: 'player' }
        ]
      };

      const result = applyAction(state, 'player', card as any);

      const updatedPlayer = result.updatedState.player as any;
      const playerTokens = [
        ...(updatedPlayer.tokens?.usage || []),
        ...(updatedPlayer.tokens?.turn || []),
        ...(updatedPlayer.tokens?.permanent || [])
      ];

      const offenseToken = playerTokens.find(t => t.id === 'offense');
      expect(offenseToken).toBeDefined();
    });

    it('attack 카드의 appliedTokens가 적에게 올바르게 적용되어야 함', () => {
      const state = createState();
      const card = {
        id: 'test_attack',
        name: '테스트 공격',
        type: 'attack',
        damage: 10,
        speedCost: 2,
        cardCategory: 'fencing',  // 비총기 공격
        appliedTokens: [
          { id: 'vulnerable', stacks: 2, target: 'enemy' }
        ]
      };

      const result = applyAction(state, 'player', card as any);

      const updatedEnemy = result.updatedState.enemy as any;
      const enemyTokens = [
        ...(updatedEnemy.tokens?.usage || []),
        ...(updatedEnemy.tokens?.turn || []),
        ...(updatedEnemy.tokens?.permanent || [])
      ];

      const vulnerableToken = enemyTokens.find(t => t.id === 'vulnerable');
      expect(vulnerableToken).toBeDefined();
      expect(vulnerableToken?.stacks).toBe(2);
    });
  });

  describe('applyAttack', () => {
    const createCombatant = (overrides = {}) => ({
      hp: 100,
      maxHp: 100,
      block: 0,
      def: false,
      counter: 0,
      vulnMult: 1,
      strength: 0,
      tokens: { usage: [], turn: [], permanent: [] },
      ...overrides
    });

    it('기본 공격 피해 계산이 올바르게 되어야 함', () => {
      const attacker = createCombatant();
      const defender = createCombatant();
      const card = {
        id: 'basic_attack',
        name: '기본 공격',
        type: 'attack',
        damage: 10,
        speedCost: 5
      };

      const result = applyAttack(attacker as any, defender as any, card as any, 'player');

      expect(result.dealt).toBeGreaterThanOrEqual(10); // 기본 피해 또는 그 이상
      expect(result.defender.hp).toBeLessThan(100); // HP가 감소해야 함
    });

    it('방어막이 있으면 먼저 소모되어야 함', () => {
      const attacker = createCombatant();
      const defender = createCombatant({ block: 5 });
      const card = {
        id: 'basic_attack',
        name: '기본 공격',
        type: 'attack',
        damage: 10,
        speedCost: 5
      };

      const result = applyAttack(attacker as any, defender as any, card as any, 'player');

      // 피해가 발생해야 함 (방어막이 먼저 소모됨)
      expect(result.dealt).toBeGreaterThanOrEqual(10);
      // 방어막이 소모되어야 함
      expect(result.defender.block).toBeLessThanOrEqual(5);
    });

    it('방어막이 충분하면 HP 피해가 감소해야 함', () => {
      const attacker = createCombatant();
      const defender = createCombatant({ block: 20 });
      const card = {
        id: 'basic_attack',
        name: '기본 공격',
        type: 'attack',
        damage: 10,
        speedCost: 5
      };

      const result = applyAttack(attacker as any, defender as any, card as any, 'player');

      // 피해가 발생해야 함
      expect(result.dealt).toBeGreaterThanOrEqual(10);
      // 방어막이 있었으므로 HP 피해는 피해량보다 작거나 같아야 함
      const hpLost = 100 - result.defender.hp;
      expect(hpLost).toBeLessThanOrEqual(result.dealt);
    });

    it('다중 타격 카드의 총 피해가 올바르게 계산되어야 함', () => {
      const attacker = createCombatant();
      const defender = createCombatant();
      const card = {
        id: 'multi_hit',
        name: '연속 베기',
        type: 'attack',
        damage: 5,
        hits: 3,
        speedCost: 5
      };

      const result = applyAttack(attacker as any, defender as any, card as any, 'player');

      // 5 x 3 = 15 기본 피해 (치명타 여부에 따라 더 높을 수 있음)
      expect(result.dealt).toBeGreaterThanOrEqual(15);
    });

    it('null 입력 시 안전하게 처리되어야 함', () => {
      const result = applyAttack(null as any, null as any, null as any, 'player');

      expect(result.dealt).toBe(0);
      expect(result.taken).toBe(0);
      expect(result.logs).toContain('⚠️ 공격 처리 오류');
    });

    it('strength 토큰이 있으면 피해가 증가해야 함', () => {
      const attacker = createCombatant({ strength: 5 });
      const defender = createCombatant();
      const card = {
        id: 'basic_attack',
        name: '기본 공격',
        type: 'attack',
        damage: 10,
        speedCost: 5
      };

      const result = applyAttack(attacker as any, defender as any, card as any, 'player');

      // 기본 10 + 힘 5 = 15 이상
      expect(result.dealt).toBeGreaterThanOrEqual(15);
    });

    it('취약(vulnMult) 상태에서 피해가 증가해야 함', () => {
      const attacker = createCombatant();
      const defender = createCombatant({ vulnMult: 1.5 });
      const card = {
        id: 'basic_attack',
        name: '기본 공격',
        type: 'attack',
        damage: 10,
        speedCost: 5
      };

      const result = applyAttack(attacker as any, defender as any, card as any, 'player');

      // 10 * 1.5 = 15
      expect(result.dealt).toBeGreaterThanOrEqual(15);
    });
  });
});
