/**
 * @file preAttackSpecials.test.js
 * @description 공격 전 특수 효과 테스트
 *
 * ## 테스트 대상
 * - hasSpecial: 카드 special 속성 확인
 * - processPreAttackSpecials: 공격 전 효과 처리
 *
 * ## 주요 테스트 케이스
 * - ignoreBlock: 방어력 무시
 * - armorBreak: 방어력 파괴
 * - vampiric: 흡혈 (데미지의 일부 회복)
 * - null/undefined 안전 처리
 * - special 객체/배열 모두 지원
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hasSpecial, processPreAttackSpecials } from './preAttackSpecials';

describe('preAttackSpecials', () => {
  describe('hasSpecial', () => {
    it('special이 없으면 false를 반환해야 함', () => {
      expect(hasSpecial({} as any, 'ignoreBlock')).toBe(false);
      expect(hasSpecial(null as any, 'ignoreBlock')).toBe(false);
    });

    it('단일 special 문자열을 확인해야 함', () => {
      const card = { special: 'ignoreBlock' } as any;
      expect(hasSpecial(card, 'ignoreBlock')).toBe(true);
      expect(hasSpecial(card, 'other')).toBe(false);
    });

    it('special 배열을 확인해야 함', () => {
      const card = { special: ['ignoreBlock', 'lifesteal'] } as any;
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
    }) as any;

    it('기본 결과 구조를 반환해야 함', () => {
      const result = processPreAttackSpecials({
        card: { name: 'Attack', damage: 10 } as any,
        attacker: createEntity(),
        defender: createEntity(),
        attackerName: 'player'
      } as any);

      expect(result).toHaveProperty('modifiedCard');
      expect(result).toHaveProperty('attacker');
      expect(result).toHaveProperty('defender');
      expect(result).toHaveProperty('events');
      expect(result).toHaveProperty('logs');
      expect(result).toHaveProperty('skipNormalDamage');
    });

    it('ignoreBlock은 _ignoreBlock 플래그를 설정해야 함', () => {
      const result = processPreAttackSpecials({
        card: { name: 'Pierce', damage: 10, special: 'ignoreBlock' } as any,
        attacker: createEntity(),
        defender: createEntity({ block: 20 }),
        attackerName: 'player'
      } as any);

      expect(result.modifiedCard._ignoreBlock).toBe(true);
    });

    it('clearAllBlock은 양측 방어력을 0으로 만들어야 함', () => {
      const result = processPreAttackSpecials({
        card: { name: 'Clear', damage: 10, special: 'clearAllBlock' } as any,
        attacker: createEntity({ block: 15 }),
        defender: createEntity({ block: 20 }),
        attackerName: 'player'
      } as any);

      expect(result.attacker.block).toBe(0);
      expect(result.defender.block).toBe(0);
      expect(result.logs.length).toBeGreaterThan(0);
    });

    it('doubleDamageIfSolo는 유일한 공격 카드일 때 피해를 2배로 해야 함', () => {
      const result = processPreAttackSpecials({
        card: { name: 'Solo', damage: 10, special: 'doubleDamageIfSolo' } as any,
        attacker: createEntity(),
        defender: createEntity(),
        attackerName: 'player',
        battleContext: { playerAttackCards: [{ name: 'Solo' } as any] } as any
      } as any);

      expect(result.modifiedCard.damage).toBe(20);
    });

    it('doubleDamageIfSolo는 다른 공격 카드가 있으면 2배가 아니어야 함', () => {
      const result = processPreAttackSpecials({
        card: { name: 'Solo', damage: 10, special: 'doubleDamageIfSolo' } as any,
        attacker: createEntity(),
        defender: createEntity(),
        attackerName: 'player',
        battleContext: { playerAttackCards: [{ name: 'Solo' } as any, { name: 'Other' } as any] } as any
      } as any);

      expect(result.modifiedCard.damage).toBe(10);
    });

    it('agilityBonus는 민첩 x5 추가 피해를 적용해야 함', () => {
      const result = processPreAttackSpecials({
        card: { name: 'Agile', damage: 10, special: 'agilityBonus' } as any,
        attacker: createEntity({ agility: 3 }),
        defender: createEntity(),
        attackerName: 'player'
      } as any);

      expect(result.modifiedCard.damage).toBe(25); // 10 + 3*5
    });

    it('agilityBonus는 민첩 0이면 추가 피해가 없어야 함', () => {
      const result = processPreAttackSpecials({
        card: { name: 'Agile', damage: 10, special: 'agilityBonus' } as any,
        attacker: createEntity({ agility: 0 }),
        defender: createEntity(),
        attackerName: 'player'
      } as any);

      expect(result.modifiedCard.damage).toBe(10);
    });

    it('special이 없으면 카드가 수정되지 않아야 함', () => {
      const originalCard = { name: 'Normal', damage: 10 } as any;
      const result = processPreAttackSpecials({
        card: originalCard,
        attacker: createEntity(),
        defender: createEntity(),
        attackerName: 'player'
      } as any);

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
        } as any,
        attacker: createEntity(),
        defender: createEntity(),
        attackerName: 'player',
        battleContext: {
          queue: [
            { actor: 'player', sp: 5, hasCrossed: true } as any,
            { actor: 'enemy', sp: 5 } as any
          ],
          currentSp: 5,
          currentQIndex: 0
        } as any
      } as any);

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
          card: { name: 'Roulette', damage: 5, special: 'gyrusRoulette' } as any,
          attacker: createEntity(),
          defender: createEntity(),
          attackerName: 'player',
          battleContext: { remainingEnergy: 3 } as any
        } as any);

        // Math.random이 0.3이므로 각 행동력당 2회 타격
        expect(result.modifiedCard.hits).toBe(6); // 3 * 2
      });
    });

    it('tempeteDechainee는 기교 스택 x3 추가 타격을 해야 함', () => {
      const result = processPreAttackSpecials({
        card: { name: 'Tempete', damage: 5, hits: 3, special: 'tempeteDechainee' } as any,
        attacker: createEntity({
          tokens: {
            usage: [],
            turn: [],
            permanent: [{ id: 'finesse', stacks: 2 } as any]
          }
        }),
        defender: createEntity(),
        attackerName: 'player'
      } as any);

      // 기본 3 + 기교 2 * 3 = 9
      expect(result.modifiedCard.hits).toBe(9);
    });

    it('reloadSpray는 탄걸림을 제거해야 함', () => {
      const result = processPreAttackSpecials({
        card: { name: 'Reload', damage: 5, special: 'reloadSpray' } as any,
        attacker: createEntity({
          tokens: {
            usage: [],
            turn: [],
            permanent: [{ id: 'gun_jam', stacks: 3 } as any]
          }
        }),
        defender: createEntity(),
        attackerName: 'player'
      } as any);

      const gunJam = result.attacker.tokens!.permanent!.find(t => t.id === 'gun_jam');
      expect(gunJam).toBeUndefined();
    });
  });
});
