/**
 * @file tokenEffects.test.js
 * @description tokenEffects 함수 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  applyTokenEffectsToCard,
  applyTokenEffectsOnDamage,
  applyTokenEffectsOnHeal,
  applyTokenEffectsOnEnergy,
  getTotalStrength,
  getTotalAgility,
  checkReviveToken,
  consumeTokens
} from './tokenEffects';

// Math.random 모킹
beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('tokenEffects', () => {
  // 테스트용 엔티티 헬퍼
  const createEntity = (tokens = { usage: [], turn: [], permanent: [] }, stats = {}) => ({
    hp: 100,
    maxHp: 100,
    tokens,
    ...stats
  }) as any;

  describe('applyTokenEffectsToCard', () => {
    it('null 카드는 그대로 반환해야 함', () => {
      const entity = createEntity();
      const result = applyTokenEffectsToCard(null as any, entity, 'attack' as any);

      expect(result.modifiedCard).toBe(null);
      expect(result.consumedTokens).toEqual([]);
    });

    it('null 엔티티는 원본 카드를 반환해야 함', () => {
      const card = { damage: 10 } as any;
      const result = applyTokenEffectsToCard(card, null as any, 'attack' as any);

      expect(result.modifiedCard).toEqual(card);
      expect(result.consumedTokens).toEqual([]);
    });

    it('토큰이 없으면 원본 카드를 반환해야 함', () => {
      const card = { damage: 10 } as any;
      const entity = createEntity({} as any);
      const result = applyTokenEffectsToCard(card, entity, 'attack' as any);

      expect(result.modifiedCard.damage).toBe(10);
    });

    it('공격력 증가 토큰이 적용되어야 함', () => {
      const card = { damage: 10 } as any;
      const entity = createEntity({
        usage: [],
        turn: [{
          id: 'attack',
          stacks: 1,
          durationType: 'turn',
          effect: { type: 'ATTACK_BOOST', value: 0.5 }
        } as any],
        permanent: []
      } as any);

      const result = applyTokenEffectsToCard(card, entity, 'attack' as any);

      // 10 * (1 + 0.5) = 15
      expect(result.modifiedCard.damage).toBe(15);
    });

    it('공격력 감소 토큰이 적용되어야 함', () => {
      const card = { damage: 10 } as any;
      const entity = createEntity({
        usage: [],
        turn: [{
          id: 'dull',
          stacks: 1,
          durationType: 'turn',
          effect: { type: 'ATTACK_PENALTY', value: 0.3 }
        } as any],
        permanent: []
      } as any);

      const result = applyTokenEffectsToCard(card, entity, 'attack' as any);

      // 10 * (1 - 0.3) = 7
      expect(result.modifiedCard.damage).toBe(7);
    });

    it('방어력 증가 토큰이 적용되어야 함', () => {
      const card = { block: 10 } as any;
      const entity = createEntity({
        usage: [],
        turn: [{
          id: 'defense',
          stacks: 1,
          durationType: 'turn',
          effect: { type: 'DEFENSE_BOOST', value: 0.5 }
        } as any],
        permanent: []
      } as any);

      const result = applyTokenEffectsToCard(card, entity, 'defense' as any);

      // 10 * (1 + 0.5) = 15
      expect((result.modifiedCard as any).block).toBe(15);
    });

    it('방어력 감소 토큰이 적용되어야 함', () => {
      const card = { block: 10 } as any;
      const entity = createEntity({
        usage: [],
        turn: [{
          id: 'shaken',
          stacks: 1,
          durationType: 'turn',
          effect: { type: 'DEFENSE_PENALTY', value: 0.4 }
        } as any],
        permanent: []
      } as any);

      const result = applyTokenEffectsToCard(card, entity, 'defense' as any);

      // 10 * (1 - 0.4) = 6
      expect((result.modifiedCard as any).block).toBe(6);
    });

    it('사용소모 토큰은 소모 목록에 추가되어야 함', () => {
      const card = { damage: 10 } as any;
      const entity = createEntity({
        usage: [{
          id: 'offense',
          stacks: 1,
          durationType: 'usage',
          effect: { type: 'ATTACK_BOOST', value: 0.3 }
        } as any],
        turn: [],
        permanent: []
      } as any);

      const result = applyTokenEffectsToCard(card, entity, 'attack' as any);

      expect(result.consumedTokens).toContainEqual({ id: 'offense', type: 'usage' } as any);
    });
  });

  describe('applyTokenEffectsOnDamage', () => {
    it('null defender는 원본 피해를 반환해야 함', () => {
      const result = applyTokenEffectsOnDamage(10, null as any, {} as any);

      expect(result.finalDamage).toBe(10);
      expect(result.dodged).toBe(false);
    });

    it('회피 토큰이 성공하면 피해가 0이어야 함', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.3); // 회피 성공

      const defender = createEntity({
        usage: [{
          id: 'dodge',
          stacks: 1,
          durationType: 'usage',
          name: '회피',
          effect: { type: 'DODGE', value: 0.5 }
        } as any],
        turn: [],
        permanent: []
      } as any);

      const result = applyTokenEffectsOnDamage(10, defender, {} as any);

      expect(result.finalDamage).toBe(0);
      expect(result.dodged).toBe(true);
    });

    it('회피 토큰이 실패하면 피해가 적용되어야 함', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.7); // 회피 실패

      const defender = createEntity({
        usage: [{
          id: 'dodge',
          stacks: 1,
          durationType: 'usage',
          name: '회피',
          effect: { type: 'DODGE', value: 0.5 }
        } as any],
        turn: [],
        permanent: []
      } as any);

      const result = applyTokenEffectsOnDamage(10, defender, {} as any);

      expect(result.finalDamage).toBe(10);
      expect(result.dodged).toBe(false);
    });

    it('토큰이 없으면 원본 피해를 반환해야 함', () => {
      const defender = createEntity({} as any);

      const result = applyTokenEffectsOnDamage(10, defender, {} as any);

      expect(result.finalDamage).toBe(10);
    });

    it('반격 토큰이 적용되어야 함', () => {
      const defender = createEntity({
        usage: [{
          id: 'counter',
          stacks: 1,
          durationType: 'usage',
          name: '반격',
          effect: { type: 'COUNTER', value: 5 }
        } as any],
        turn: [],
        permanent: []
      } as any, { strength: 2 });

      const attacker = createEntity();

      const result = applyTokenEffectsOnDamage(10, defender, attacker);

      // 반격 피해: 5 + 2 (strength) = 7
      expect(result.reflected).toBe(7);
    });
  });

  describe('applyTokenEffectsOnHeal', () => {
    it('null 엔티티는 회복 0을 반환해야 함', () => {
      const result = applyTokenEffectsOnHeal(10, null as any);

      expect(result.healing).toBe(0);
    });

    it('토큰이 없으면 회복 0을 반환해야 함 (빈 토큰)', () => {
      const entity = createEntity({} as any);

      const result = applyTokenEffectsOnHeal(10, entity);

      expect(result.healing).toBe(0);
      expect(result.consumedTokens).toEqual([]);
    });

    it('흡수 토큰이 없으면 회복 0을 반환해야 함', () => {
      const entity = createEntity({} as any);

      const result = applyTokenEffectsOnHeal(10, entity);

      expect(result.healing).toBe(0);
    });
  });

  describe('applyTokenEffectsOnEnergy', () => {
    it('null 엔티티는 기본 에너지를 반환해야 함', () => {
      const result = applyTokenEffectsOnEnergy(5, null as any);

      expect(result).toBe(5);
    });

    it('토큰이 없으면 기본 에너지를 반환해야 함 (빈 토큰)', () => {
      const entity = createEntity({} as any);

      const result = applyTokenEffectsOnEnergy(5, entity);

      expect(result).toBe(5);
    });
  });

  describe('getTotalStrength', () => {
    it('null 엔티티는 0을 반환해야 함', () => {
      expect(getTotalStrength(null as any)).toBe(0);
    });

    it('기본 힘을 반환해야 함', () => {
      const entity = createEntity({} as any, { strength: 5 });
      expect(getTotalStrength(entity)).toBe(5);
    });

    it('힘 토큰이 적용되어야 함', () => {
      const entity = createEntity({
        usage: [],
        turn: [{
          id: 'strength',
          stacks: 2,
          durationType: 'turn',
          effect: { type: 'STRENGTH', value: 3 }
        } as any],
        permanent: []
      } as any, { strength: 5 });

      // 5 + (3 * 2) = 11
      expect(getTotalStrength(entity)).toBe(11);
    });
  });

  describe('getTotalAgility', () => {
    it('null 엔티티는 0을 반환해야 함', () => {
      expect(getTotalAgility(null as any)).toBe(0);
    });

    it('기본 민첩을 반환해야 함', () => {
      const entity = createEntity({} as any, { agility: 3 });
      expect(getTotalAgility(entity)).toBe(3);
    });

    it('민첩 토큰이 적용되어야 함', () => {
      const entity = createEntity({
        usage: [],
        turn: [{
          id: 'agility',
          stacks: 2,
          durationType: 'turn',
          effect: { type: 'AGILITY', value: 2 }
        } as any],
        permanent: []
      } as any, { agility: 3 });

      // 3 + (2 * 2) = 7
      expect(getTotalAgility(entity)).toBe(7);
    });
  });

  describe('checkReviveToken', () => {
    it('null 엔티티는 부활 불가를 반환해야 함', () => {
      const result = checkReviveToken(null as any);

      expect(result.revived).toBe(false);
      expect(result.newHp).toBe(0);
    });

    it('부활 토큰이 없으면 부활 불가를 반환해야 함', () => {
      const entity = createEntity({} as any);
      const result = checkReviveToken(entity);

      expect(result.revived).toBe(false);
    });

    it('부활 토큰이 있으면 부활해야 함', () => {
      const entity = createEntity({
        usage: [{
          id: 'revive',
          stacks: 1,
          durationType: 'usage',
          name: '부활',
          effect: { type: 'REVIVE', value: 0.5 }
        } as any],
        turn: [],
        permanent: []
      } as any);

      const result = checkReviveToken(entity);

      expect(result.revived).toBe(true);
      expect(result.newHp).toBe(50); // 100 * 0.5
      expect(result.consumedTokens).toContainEqual({ id: 'revive', type: 'usage' } as any);
    });
  });

  describe('consumeTokens', () => {
    it('빈 토큰 배열은 원본 토큰을 반환해야 함', () => {
      const entity = createEntity({} as any);
      const result = consumeTokens(entity, [] as any);

      expect(result.tokens).toEqual(entity.tokens);
      expect(result.logs).toEqual([]);
    });

    it('지정된 토큰을 소모해야 함', () => {
      const entity = createEntity({
        usage: [{
          id: 'offense',
          stacks: 2,
          name: '공세'
        } as any],
        turn: [],
        permanent: []
      } as any);

      const result = consumeTokens(entity, [{ id: 'offense', type: 'usage' } as any]);

      // 스택이 1 감소
      const offenseToken = result.tokens.usage.find(t => t.id === 'offense');
      expect(offenseToken.stacks).toBe(1);
    });
  });
});
