/**
 * @file postAttackSpecials.test.js
 * @description 공격 후 특수 효과 테스트
 *
 * ## 테스트 대상
 * - processPostAttackSpecials: 공격 후 효과 처리
 *
 * ## 주요 테스트 케이스
 * - execute: HP 임계치 이하 즉사
 * - vuln: 취약 상태 부여
 * - gun_jam: 총기 고장 (행동 불가)
 * - knockback: 적 타임라인 밀기
 * - bleed: 출혈 토큰 부여
 */

import { describe, it, expect } from 'vitest';
import { processPostAttackSpecials } from './postAttackSpecials';

describe('postAttackSpecials', () => {
  describe('processPostAttackSpecials', () => {
    const createEntity = (overrides = {}) => ({
      hp: 100,
      maxHp: 100,
      block: 0,
      def: false,
      tokens: { usage: [], turn: [], permanent: [] },
      ...overrides
    });

    it('기본 결과 구조를 반환해야 함', () => {
      const result = processPostAttackSpecials({
        card: { name: 'Attack', damage: 10 },
        attacker: createEntity(),
        defender: createEntity(),
        attackerName: 'player',
        damageDealt: 10
      });

      expect(result).toHaveProperty('attacker');
      expect(result).toHaveProperty('defender');
      expect(result).toHaveProperty('events');
      expect(result).toHaveProperty('logs');
      expect(result).toHaveProperty('extraHits');
    });

    it('executeUnder10은 10% 미만일 때 즉사시켜야 함', () => {
      const result = processPostAttackSpecials({
        card: { name: 'Execute', damage: 10, special: 'executeUnder10' },
        attacker: createEntity(),
        defender: createEntity({ hp: 8, maxHp: 100 }), // 8% < 10%
        attackerName: 'player',
        damageDealt: 2
      });

      expect(result.defender.hp).toBe(0);
      expect(result.logs.length).toBeGreaterThan(0);
    });

    it('executeUnder10은 10% 이상이면 발동하지 않아야 함', () => {
      const result = processPostAttackSpecials({
        card: { name: 'Execute', damage: 10, special: 'executeUnder10' },
        attacker: createEntity(),
        defender: createEntity({ hp: 15, maxHp: 100 }), // 15% >= 10%
        attackerName: 'player',
        damageDealt: 5
      });

      expect(result.defender.hp).toBe(15);
    });

    it('vulnIfNoBlock은 방어력 없으면 취약을 부여해야 함', () => {
      const result = processPostAttackSpecials({
        card: { name: 'Vuln', damage: 10, special: 'vulnIfNoBlock' },
        attacker: createEntity(),
        defender: createEntity({ block: 0, def: false }),
        attackerName: 'player',
        damageDealt: 10
      });

      const vulnToken = result.defender.tokens.turn.find(t => t.id === 'vulnerable');
      expect(vulnToken).toBeDefined();
    });

    it('vulnIfNoBlock은 방어력 있으면 취약을 부여하지 않아야 함', () => {
      const result = processPostAttackSpecials({
        card: { name: 'Vuln', damage: 10, special: 'vulnIfNoBlock' },
        attacker: createEntity(),
        defender: createEntity({ block: 10, def: true }),
        attackerName: 'player',
        damageDealt: 5
      });

      const vulnToken = result.defender.tokens.turn?.find(t => t.id === 'vulnerable');
      expect(vulnToken).toBeUndefined();
    });

    it('doubleVulnIfNoBlock은 2배 취약을 부여해야 함', () => {
      const result = processPostAttackSpecials({
        card: { name: 'DoubleVuln', damage: 10, special: 'doubleVulnIfNoBlock' },
        attacker: createEntity(),
        defender: createEntity({ block: 0, def: false }),
        attackerName: 'player',
        damageDealt: 10
      });

      const vulnToken = result.defender.tokens.turn.find(t => t.id === 'vulnerable');
      expect(vulnToken).toBeDefined();
      expect(vulnToken.stacks).toBe(2);
    });

    it('repeatIfLast는 마지막 카드일 때 extraHits를 1로 설정해야 함', () => {
      const result = processPostAttackSpecials({
        card: { name: 'Repeat', damage: 10, special: 'repeatIfLast' },
        attacker: createEntity(),
        defender: createEntity(),
        attackerName: 'player',
        damageDealt: 10,
        battleContext: { isLastCard: true }
      });

      expect(result.extraHits).toBe(1);
    });

    it('repeatIfLast는 마지막 카드가 아니면 extraHits가 0이어야 함', () => {
      const result = processPostAttackSpecials({
        card: { name: 'Repeat', damage: 10, special: 'repeatIfLast' },
        attacker: createEntity(),
        defender: createEntity(),
        attackerName: 'player',
        damageDealt: 10,
        battleContext: { isLastCard: false }
      });

      expect(result.extraHits).toBe(0);
    });

    it('repeatPerUnusedAttack은 미사용 공격 카드당 extraHits를 설정해야 함', () => {
      const result = processPostAttackSpecials({
        card: { name: 'Repeat', damage: 10, special: 'repeatPerUnusedAttack' },
        attacker: createEntity(),
        defender: createEntity(),
        attackerName: 'player',
        damageDealt: 10,
        battleContext: { unusedAttackCards: 3 }
      });

      expect(result.extraHits).toBe(3);
    });

    it('hitOnEnemyAction은 persistent_strike 토큰을 부여해야 함', () => {
      const result = processPostAttackSpecials({
        card: { name: 'Persistent', damage: 20, special: 'hitOnEnemyAction' },
        attacker: createEntity(),
        defender: createEntity(),
        attackerName: 'player',
        damageDealt: 20
      });

      const strikeToken = result.attacker.tokens.turn.find(t => t.id === 'persistent_strike');
      expect(strikeToken).toBeDefined();
      expect(result.attacker._persistentStrikeDamage).toBe(20);
    });

    it('halfEnemyEther는 half_ether 토큰을 부여해야 함', () => {
      const result = processPostAttackSpecials({
        card: { name: 'HalfEther', damage: 10, special: 'halfEnemyEther' },
        attacker: createEntity(),
        defender: createEntity(),
        attackerName: 'player',
        damageDealt: 10
      });

      const etherToken = result.defender.tokens.turn.find(t => t.id === 'half_ether');
      expect(etherToken).toBeDefined();
    });

    it('emptyAfterUse는 gun_jam 토큰을 부여해야 함', () => {
      const result = processPostAttackSpecials({
        card: { name: 'Empty', damage: 10, special: 'emptyAfterUse' },
        attacker: createEntity(),
        defender: createEntity(),
        attackerName: 'player',
        damageDealt: 10
      });

      const jamToken = result.attacker.tokens.permanent.find(t => t.id === 'gun_jam');
      expect(jamToken).toBeDefined();
    });

    it('stealBlock은 파괴된 방어력을 획득해야 함', () => {
      const result = processPostAttackSpecials({
        card: { name: 'Steal', damage: 10, special: 'stealBlock' },
        attacker: createEntity({ block: 5 }),
        defender: createEntity(),
        attackerName: 'player',
        damageDealt: 10,
        battleContext: { blockDestroyed: 15 }
      });

      expect(result.attacker.block).toBe(20); // 5 + 15
      expect(result.attacker.def).toBe(true);
    });

    it('critLoad는 치명타일 때 탄걸림을 해제해야 함', () => {
      const result = processPostAttackSpecials({
        card: { name: 'CritLoad', damage: 10, special: 'critLoad' },
        attacker: createEntity({
          tokens: {
            usage: [],
            turn: [],
            permanent: [{ id: 'gun_jam', stacks: 2 }]
          }
        }),
        defender: createEntity(),
        attackerName: 'player',
        damageDealt: 10,
        battleContext: { isCritical: true }
      });

      const jamToken = result.attacker.tokens.permanent.find(t => t.id === 'gun_jam');
      expect(jamToken).toBeUndefined();
    });

    it('_applyBurn은 화상 토큰을 부여해야 함', () => {
      const result = processPostAttackSpecials({
        card: { name: 'Burn', damage: 10, hits: 3, _applyBurn: true },
        attacker: createEntity(),
        defender: createEntity(),
        attackerName: 'player',
        damageDealt: 10
      });

      const burnToken = result.defender.tokens.turn.find(t => t.id === 'burn');
      expect(burnToken).toBeDefined();
      expect(burnToken.stacks).toBe(3);
    });

    it('special이 없으면 수정 없이 반환해야 함', () => {
      const result = processPostAttackSpecials({
        card: { name: 'Normal', damage: 10 },
        attacker: createEntity(),
        defender: createEntity(),
        attackerName: 'player',
        damageDealt: 10
      });

      expect(result.events).toHaveLength(0);
      expect(result.extraHits).toBe(0);
    });
  });
});
