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
import {
  createAttackCard,
  createDefenseCard,
  createEntity,
  createEntityWithTokens,
  createAttackBoostToken,
  createAttackPenaltyToken,
  createDefenseBoostToken,
  createDefensePenaltyToken,
  createDodgeToken,
  createCounterToken,
  createReviveToken,
  createStrengthToken,
  createAgilityToken,
  createConsumedToken,
  entityBuilder,
  type TestTokenPayload,
} from '../test/factories';
import type { TokenEntity, Card, TokenInstance } from '../types/core';

// Math.random 모킹
beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('tokenEffects', () => {
  describe('applyTokenEffectsToCard', () => {
    it('null 카드는 그대로 반환해야 함', () => {
      const entity = createEntity();
      const result = applyTokenEffectsToCard(null as unknown as Card, entity, 'attack');

      expect(result.modifiedCard).toBe(null);
      expect(result.consumedTokens).toEqual([]);
    });

    it('null 엔티티는 원본 카드를 반환해야 함', () => {
      const card = createAttackCard({ damage: 10 });
      const result = applyTokenEffectsToCard(card, null as unknown as TokenEntity, 'attack');

      expect(result.modifiedCard).toEqual(card);
      expect(result.consumedTokens).toEqual([]);
    });

    it('토큰이 없으면 원본 카드를 반환해야 함', () => {
      const card = createAttackCard({ damage: 10 });
      const entity = createEntity();
      const result = applyTokenEffectsToCard(card, entity, 'attack');

      expect(result.modifiedCard.damage).toBe(10);
    });

    it('공격력 증가 토큰이 적용되어야 함', () => {
      const card = createAttackCard({ damage: 10 });
      const attackBoost = createAttackBoostToken(1, 0.5);
      const entity = createEntityWithTokens({
        turn: [attackBoost],
      });

      const result = applyTokenEffectsToCard(card, entity, 'attack');

      // 10 * (1 + 0.5) = 15
      expect(result.modifiedCard.damage).toBe(15);
    });

    it('공격력 감소 토큰이 적용되어야 함', () => {
      const card = createAttackCard({ damage: 10 });
      const attackPenalty = createAttackPenaltyToken(1, 0.5);
      const entity = createEntityWithTokens({
        turn: [attackPenalty],
      });

      const result = applyTokenEffectsToCard(card, entity, 'attack');

      // 코어 함수: dull 토큰 → 0.5배
      // 10 * 0.5 = 5
      expect(result.modifiedCard.damage).toBe(5);
    });

    it('방어력 증가 토큰이 적용되어야 함', () => {
      const card = createDefenseCard({ block: 10 });
      const defenseBoost = createDefenseBoostToken(1, 0.5);
      const entity = createEntityWithTokens({
        turn: [defenseBoost],
      });

      const result = applyTokenEffectsToCard(card, entity, 'defense');

      // 10 * (1 + 0.5) = 15
      expect(result.modifiedCard.block).toBe(15);
    });

    it('방어력 감소 토큰이 적용되어야 함', () => {
      const card = createDefenseCard({ block: 10 });
      const defensePenalty = createDefensePenaltyToken(1, 0.5);
      const entity = createEntityWithTokens({
        turn: [defensePenalty],
      });

      const result = applyTokenEffectsToCard(card, entity, 'defense');

      // 코어 함수: shaken 토큰 → 0.5배
      // 10 * 0.5 = 5
      expect(result.modifiedCard.block).toBe(5);
    });

    it('사용소모 토큰은 소모 목록에 추가되어야 함', () => {
      const card = createAttackCard({ damage: 10 });
      const offenseToken: TestTokenPayload = {
        id: 'offense',
        stacks: 1,
        durationType: 'usage',
        effect: { type: 'ATTACK_BOOST', value: 0.3 },
      };
      const entity = createEntityWithTokens({
        usage: [offenseToken],
      });

      const result = applyTokenEffectsToCard(card, entity, 'attack');

      expect(result.consumedTokens).toContainEqual(createConsumedToken('offense', 'usage'));
    });
  });

  describe('applyTokenEffectsOnDamage', () => {
    it('null defender는 원본 피해를 반환해야 함', () => {
      const attacker = createEntity();
      const result = applyTokenEffectsOnDamage(10, null as unknown as TokenEntity, attacker);

      expect(result.finalDamage).toBe(10);
      expect(result.dodged).toBe(false);
    });

    it('회피 토큰이 성공하면 피해가 0이어야 함', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.3); // 회피 성공

      const dodgeToken = createDodgeToken(1, 0.5);
      const defender = createEntityWithTokens({
        usage: [dodgeToken],
      });
      const attacker = createEntity();

      const result = applyTokenEffectsOnDamage(10, defender, attacker);

      expect(result.finalDamage).toBe(0);
      expect(result.dodged).toBe(true);
    });

    it('회피 토큰이 실패하면 피해가 적용되어야 함', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.7); // 회피 실패

      const dodgeToken = createDodgeToken(1, 0.5);
      const defender = createEntityWithTokens({
        usage: [dodgeToken],
      });
      const attacker = createEntity();

      const result = applyTokenEffectsOnDamage(10, defender, attacker);

      expect(result.finalDamage).toBe(10);
      expect(result.dodged).toBe(false);
    });

    it('토큰이 없으면 원본 피해를 반환해야 함', () => {
      const defender = createEntity();
      const attacker = createEntity();

      const result = applyTokenEffectsOnDamage(10, defender, attacker);

      expect(result.finalDamage).toBe(10);
    });

    it('반격 토큰이 적용되어야 함', () => {
      const counterToken = createCounterToken(1, 5);
      const defender = createEntityWithTokens(
        { usage: [counterToken] },
        {},
        { strength: 2 }
      );
      const attacker = createEntity();

      const result = applyTokenEffectsOnDamage(10, defender, attacker);

      // 반격 피해: 5 + 2 (strength) = 7
      expect(result.reflected).toBe(7);
    });
  });

  describe('applyTokenEffectsOnHeal', () => {
    it('null 엔티티는 회복 0을 반환해야 함', () => {
      const result = applyTokenEffectsOnHeal(10, null as unknown as TokenEntity);

      expect(result.healing).toBe(0);
    });

    it('토큰이 없으면 회복 0을 반환해야 함 (빈 토큰)', () => {
      const entity = createEntity();

      const result = applyTokenEffectsOnHeal(10, entity);

      expect(result.healing).toBe(0);
      expect(result.consumedTokens).toEqual([]);
    });

    it('흡수 토큰이 없으면 회복 0을 반환해야 함', () => {
      const entity = createEntity();

      const result = applyTokenEffectsOnHeal(10, entity);

      expect(result.healing).toBe(0);
    });
  });

  describe('applyTokenEffectsOnEnergy', () => {
    it('null 엔티티는 기본 에너지를 반환해야 함', () => {
      const result = applyTokenEffectsOnEnergy(5, null as unknown as TokenEntity);

      expect(result).toBe(5);
    });

    it('토큰이 없으면 기본 에너지를 반환해야 함 (빈 토큰)', () => {
      const entity = createEntity();

      const result = applyTokenEffectsOnEnergy(5, entity);

      expect(result).toBe(5);
    });
  });

  describe('getTotalStrength', () => {
    it('null 엔티티는 0을 반환해야 함', () => {
      expect(getTotalStrength(null as unknown as TokenEntity)).toBe(0);
    });

    it('기본 힘을 반환해야 함', () => {
      const entity = createEntity({}, { strength: 5 });
      expect(getTotalStrength(entity)).toBe(5);
    });

    it('힘 토큰이 적용되어야 함', () => {
      const strengthToken = createStrengthToken(2, 3);
      const entity = createEntityWithTokens(
        { turn: [strengthToken] },
        {},
        { strength: 5 }
      );

      // 5 + (3 * 2) = 11
      expect(getTotalStrength(entity)).toBe(11);
    });
  });

  describe('getTotalAgility', () => {
    it('null 엔티티는 0을 반환해야 함', () => {
      expect(getTotalAgility(null as unknown as TokenEntity)).toBe(0);
    });

    it('기본 민첩을 반환해야 함', () => {
      const entity = createEntity({}, { agility: 3 });
      expect(getTotalAgility(entity)).toBe(3);
    });

    it('민첩 토큰이 적용되어야 함', () => {
      const agilityToken = createAgilityToken(2, 2);
      const entity = createEntityWithTokens(
        { turn: [agilityToken] },
        {},
        { agility: 3 }
      );

      // 3 + (2 * 2) = 7
      expect(getTotalAgility(entity)).toBe(7);
    });
  });

  describe('checkReviveToken', () => {
    it('null 엔티티는 부활 불가를 반환해야 함', () => {
      const result = checkReviveToken(null as unknown as TokenEntity);

      expect(result.revived).toBe(false);
      expect(result.newHp).toBe(0);
    });

    it('부활 토큰이 없으면 부활 불가를 반환해야 함', () => {
      const entity = createEntity();
      const result = checkReviveToken(entity);

      expect(result.revived).toBe(false);
    });

    it('부활 토큰이 있으면 부활해야 함', () => {
      const reviveToken = createReviveToken(1, 0.5);
      const entity = createEntityWithTokens({
        usage: [reviveToken],
      });

      const result = checkReviveToken(entity);

      expect(result.revived).toBe(true);
      expect(result.newHp).toBe(50); // 100 * 0.5
      expect(result.consumedTokens).toContainEqual(createConsumedToken('revive', 'usage'));
    });
  });

  describe('consumeTokens', () => {
    it('빈 토큰 배열은 원본 토큰을 반환해야 함', () => {
      const entity = createEntity();
      const result = consumeTokens(entity, []);

      expect(result.tokens).toEqual(entity.tokens);
      expect(result.logs).toEqual([]);
    });

    it('지정된 토큰을 소모해야 함', () => {
      const offenseToken: TestTokenPayload = {
        id: 'offense',
        stacks: 2,
        name: '공세',
      };
      const entity = createEntityWithTokens({
        usage: [offenseToken],
      });

      const result = consumeTokens(entity, [createConsumedToken('offense', 'usage')]);

      // 스택이 1 감소
      const foundToken = result.tokens.usage!.find(t => t.id === 'offense');
      expect(foundToken?.stacks).toBe(1);
    });
  });
});
