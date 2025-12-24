/**
 * @file preAttackSpecials.test.js
 * @description preAttackSpecials 함수 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hasSpecial, processPreAttackSpecials } from './preAttackSpecials';

describe('preAttackSpecials', () => {
  describe('hasSpecial', () => {
    it('special이 없으면 false를 반환해야 함', () => {
      expect(hasSpecial({}, 'ignoreBlock')).toBe(false);
      expect(hasSpecial(null, 'ignoreBlock')).toBe(false);
    });

    it('단일 special 문자열을 확인해야 함', () => {
      const card = { special: 'ignoreBlock' };
      expect(hasSpecial(card, 'ignoreBlock')).toBe(true);
      expect(hasSpecial(card, 'other')).toBe(false);
    });

    it('special 배열을 확인해야 함', () => {
      const card = { special: ['ignoreBlock', 'lifesteal'] };
      expect(hasSpecial(card, 'ignoreBlock')).toBe(true);
      expect(hasSpecial(card, 'lifesteal')).toBe(true);
      expect(hasSpecial(card, 'other')).toBe(false);
    });
  });

  describe('processPreAttackSpecials', () => {
    const createEntity = (overrides = {}) => ({
      hp: 100,
      maxHp: 100,
      block: 0,
      tokens: { usage: [], turn: [], permanent: [] },
      ...overrides
    });

    it('기본 결과 구조를 반환해야 함', () => {
      const result = processPreAttackSpecials({
        card: { name: 'Attack', damage: 10 },
        attacker: createEntity(),
        defender: createEntity(),
        attackerName: 'player'
      });

      expect(result).toHaveProperty('modifiedCard');
      expect(result).toHaveProperty('attacker');
      expect(result).toHaveProperty('defender');
      expect(result).toHaveProperty('events');
      expect(result).toHaveProperty('logs');
      expect(result).toHaveProperty('skipNormalDamage');
    });

    it('ignoreBlock은 _ignoreBlock 플래그를 설정해야 함', () => {
      const result = processPreAttackSpecials({
        card: { name: 'Pierce', damage: 10, special: 'ignoreBlock' },
        attacker: createEntity(),
        defender: createEntity({ block: 20 }),
        attackerName: 'player'
      });

      expect(result.modifiedCard._ignoreBlock).toBe(true);
    });

    it('clearAllBlock은 양측 방어력을 0으로 만들어야 함', () => {
      const result = processPreAttackSpecials({
        card: { name: 'Clear', damage: 10, special: 'clearAllBlock' },
        attacker: createEntity({ block: 15 }),
        defender: createEntity({ block: 20 }),
        attackerName: 'player'
      });

      expect(result.attacker.block).toBe(0);
      expect(result.defender.block).toBe(0);
      expect(result.logs.length).toBeGreaterThan(0);
    });

    it('doubleDamageIfSolo는 유일한 공격 카드일 때 피해를 2배로 해야 함', () => {
      const result = processPreAttackSpecials({
        card: { name: 'Solo', damage: 10, special: 'doubleDamageIfSolo' },
        attacker: createEntity(),
        defender: createEntity(),
        attackerName: 'player',
        battleContext: { playerAttackCards: [{ name: 'Solo' }] }
      });

      expect(result.modifiedCard.damage).toBe(20);
    });

    it('doubleDamageIfSolo는 다른 공격 카드가 있으면 2배가 아니어야 함', () => {
      const result = processPreAttackSpecials({
        card: { name: 'Solo', damage: 10, special: 'doubleDamageIfSolo' },
        attacker: createEntity(),
        defender: createEntity(),
        attackerName: 'player',
        battleContext: { playerAttackCards: [{ name: 'Solo' }, { name: 'Other' }] }
      });

      expect(result.modifiedCard.damage).toBe(10);
    });

    it('agilityBonus는 민첩 x5 추가 피해를 적용해야 함', () => {
      const result = processPreAttackSpecials({
        card: { name: 'Agile', damage: 10, special: 'agilityBonus' },
        attacker: createEntity({ agility: 3 }),
        defender: createEntity(),
        attackerName: 'player'
      });

      expect(result.modifiedCard.damage).toBe(25); // 10 + 3*5
    });

    it('agilityBonus는 민첩 0이면 추가 피해가 없어야 함', () => {
      const result = processPreAttackSpecials({
        card: { name: 'Agile', damage: 10, special: 'agilityBonus' },
        attacker: createEntity({ agility: 0 }),
        defender: createEntity(),
        attackerName: 'player'
      });

      expect(result.modifiedCard.damage).toBe(10);
    });

    it('special이 없으면 카드가 수정되지 않아야 함', () => {
      const originalCard = { name: 'Normal', damage: 10 };
      const result = processPreAttackSpecials({
        card: originalCard,
        attacker: createEntity(),
        defender: createEntity(),
        attackerName: 'player'
      });

      expect(result.modifiedCard.damage).toBe(10);
      expect(result.events).toHaveLength(0);
    });

    it('cross 특성은 타임라인 겹침 시 피해 배율을 적용해야 함', () => {
      const result = processPreAttackSpecials({
        card: {
          name: 'Cross',
          damage: 10,
          traits: ['cross'],
          crossBonus: { type: 'damage_mult', value: 2 }
        },
        attacker: createEntity(),
        defender: createEntity(),
        attackerName: 'player',
        battleContext: {
          queue: [
            { actor: 'player', sp: 5 },
            { actor: 'enemy', sp: 5 }
          ],
          currentSp: 5,
          currentQIndex: 0
        }
      });

      expect(result.modifiedCard.damage).toBe(20);
    });

    describe('gyrusRoulette', () => {
      beforeEach(() => {
        vi.spyOn(Math, 'random').mockReturnValue(0.3); // 50% 미만이므로 보너스
      });

      afterEach(() => {
        vi.restoreAllMocks();
      });

      it('행동력당 타격 횟수를 계산해야 함', () => {
        const result = processPreAttackSpecials({
          card: { name: 'Roulette', damage: 5, special: 'gyrusRoulette' },
          attacker: createEntity(),
          defender: createEntity(),
          attackerName: 'player',
          battleContext: { remainingEnergy: 3 }
        });

        // Math.random이 0.3이므로 각 행동력당 2회 타격
        expect(result.modifiedCard.hits).toBe(6); // 3 * 2
      });
    });

    it('tempeteDechainee는 기교 스택 x3 추가 타격을 해야 함', () => {
      const result = processPreAttackSpecials({
        card: { name: 'Tempete', damage: 5, hits: 3, special: 'tempeteDechainee' },
        attacker: createEntity({
          tokens: {
            usage: [],
            turn: [],
            permanent: [{ id: 'finesse', stacks: 2 }]
          }
        }),
        defender: createEntity(),
        attackerName: 'player'
      });

      // 기본 3 + 기교 2 * 3 = 9
      expect(result.modifiedCard.hits).toBe(9);
    });

    it('reloadSpray는 탄걸림을 제거해야 함', () => {
      const result = processPreAttackSpecials({
        card: { name: 'Reload', damage: 5, special: 'reloadSpray' },
        attacker: createEntity({
          tokens: {
            usage: [],
            turn: [],
            permanent: [{ id: 'gun_jam', stacks: 3 }]
          }
        }),
        defender: createEntity(),
        attackerName: 'player'
      });

      const gunJam = result.attacker.tokens.permanent.find(t => t.id === 'gun_jam');
      expect(gunJam).toBeUndefined();
    });
  });
});
