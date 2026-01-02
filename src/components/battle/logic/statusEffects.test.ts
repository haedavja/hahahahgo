/**
 * @file statusEffects.test.ts
 * @description 상태 효과 관리 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  applyStrengthBuff,
  applyAgilityBuff,
  applyInsightBuff,
  applyRegenerationBuff,
  applyVulnerableDebuff,
  applyWeaknessDebuff,
  applyPoisonDebuff,
  applyStunDebuff,
  applyShroudBuff,
  decreaseStatusDurations,
  applyRegenerationEffect,
  applyPoisonEffect,
  isStunned,
  isVulnerable,
  getActiveEffects,
  clearAllEffects,
  type StatusEffectTarget,
} from './statusEffects';

const createMockActor = (overrides: Partial<StatusEffectTarget> = {}): StatusEffectTarget => ({
  hp: 100,
  maxHp: 100,
  block: 0,
  ...overrides,
});

describe('statusEffects', () => {
  describe('버프 적용', () => {
    describe('applyStrengthBuff', () => {
      it('힘 버프를 적용한다', () => {
        const actor = createMockActor();
        const result = applyStrengthBuff(actor, 3, 2);

        expect(result.strength).toBe(3);
        expect(result.strengthDuration).toBe(2);
      });

      it('기존 힘에 누적한다', () => {
        const actor = createMockActor({ strength: 2 });
        const result = applyStrengthBuff(actor, 3);

        expect(result.strength).toBe(5);
      });

      it('지속 시간 0은 영구 효과', () => {
        const actor = createMockActor();
        const result = applyStrengthBuff(actor, 5, 0);

        expect(result.strengthDuration).toBe(0);
      });
    });

    describe('applyAgilityBuff', () => {
      it('민첩 버프를 적용한다', () => {
        const actor = createMockActor();
        const result = applyAgilityBuff(actor, 2, 3);

        expect(result.agility).toBe(2);
        expect(result.agilityDuration).toBe(3);
      });
    });

    describe('applyInsightBuff', () => {
      it('통찰 버프를 적용한다', () => {
        const actor = createMockActor();
        const result = applyInsightBuff(actor, 1, 2);

        expect(result.insight).toBe(1);
        expect(result.insightDuration).toBe(2);
      });
    });

    describe('applyRegenerationBuff', () => {
      it('재생 버프를 적용한다', () => {
        const actor = createMockActor();
        const result = applyRegenerationBuff(actor, 5, 3);

        expect(result.regeneration).toBe(5);
        expect(result.regenerationDuration).toBe(3);
      });
    });

    describe('applyShroudBuff', () => {
      it('장막 버프를 적용한다', () => {
        const actor = createMockActor();
        const result = applyShroudBuff(actor, 2, 3);

        expect(result.shroud).toBe(2);
        expect(result.shroudDuration).toBe(3);
      });

      it('기존 장막에 누적한다', () => {
        const actor = createMockActor({ shroud: 1 });
        const result = applyShroudBuff(actor, 2);

        expect(result.shroud).toBe(3);
      });
    });
  });

  describe('디버프 적용', () => {
    describe('applyVulnerableDebuff', () => {
      it('취약 디버프를 적용한다', () => {
        const actor = createMockActor();
        const result = applyVulnerableDebuff(actor, 1.5, 2);

        expect(result.vulnMult).toBe(1.5);
        expect(result.vulnTurns).toBe(2);
      });
    });

    describe('applyWeaknessDebuff', () => {
      it('약화 디버프를 적용한다', () => {
        const actor = createMockActor();
        const result = applyWeaknessDebuff(actor, 3, 2);

        expect(result.weakness).toBe(3);
        expect(result.weaknessDuration).toBe(2);
      });
    });

    describe('applyPoisonDebuff', () => {
      it('독 디버프를 적용한다', () => {
        const actor = createMockActor();
        const result = applyPoisonDebuff(actor, 5, 3);

        expect(result.poison).toBe(5);
        expect(result.poisonDuration).toBe(3);
      });
    });

    describe('applyStunDebuff', () => {
      it('기절 디버프를 적용한다', () => {
        const actor = createMockActor();
        const result = applyStunDebuff(actor, 1);

        expect(result.stunned).toBe(true);
        expect(result.stunDuration).toBe(1);
      });
    });
  });

  describe('decreaseStatusDurations', () => {
    it('모든 상태 효과의 지속 시간을 감소시킨다', () => {
      const actor = createMockActor({
        strength: 3,
        strengthDuration: 2,
        agility: 1,
        agilityDuration: 1,
      });

      const result = decreaseStatusDurations(actor);

      expect(result.strengthDuration).toBe(1);
      expect(result.strength).toBe(3);
      expect(result.agilityDuration).toBe(0);
      expect(result.agility).toBe(0);
    });

    it('지속 시간이 0이 되면 효과를 제거한다', () => {
      const actor = createMockActor({
        regeneration: 5,
        regenerationDuration: 1,
        poison: 3,
        poisonDuration: 1,
        stunned: true,
        stunDuration: 1,
      });

      const result = decreaseStatusDurations(actor);

      expect(result.regeneration).toBe(0);
      expect(result.poison).toBe(0);
      expect(result.stunned).toBe(false);
    });

    it('취약 효과도 처리한다', () => {
      const actor = createMockActor({
        vulnMult: 1.5,
        vulnTurns: 1,
      });

      const result = decreaseStatusDurations(actor);

      expect(result.vulnMult).toBe(1);
      expect(result.vulnTurns).toBe(0);
    });
  });

  describe('효과 발동', () => {
    describe('applyRegenerationEffect', () => {
      it('재생 효과로 체력을 회복한다', () => {
        const actor = createMockActor({
          hp: 80,
          maxHp: 100,
          regeneration: 10,
        });

        const result = applyRegenerationEffect(actor, 'player');

        expect(result.actor.hp).toBe(90);
        expect(result.healed).toBe(10);
        expect(result.log).toContain('재생');
      });

      it('최대 체력을 초과하지 않는다', () => {
        const actor = createMockActor({
          hp: 95,
          maxHp: 100,
          regeneration: 10,
        });

        const result = applyRegenerationEffect(actor, 'player');

        expect(result.actor.hp).toBe(100);
        expect(result.healed).toBe(5);
      });

      it('재생 효과가 없으면 변경 없음', () => {
        const actor = createMockActor({ hp: 80, maxHp: 100 });

        const result = applyRegenerationEffect(actor, 'player');

        expect(result.actor.hp).toBe(80);
        expect(result.healed).toBe(0);
        expect(result.log).toBeNull();
      });
    });

    describe('applyPoisonEffect', () => {
      it('독 효과로 피해를 준다', () => {
        const actor = createMockActor({
          hp: 50,
          poison: 5,
        });

        const result = applyPoisonEffect(actor, 'enemy');

        expect(result.actor.hp).toBe(45);
        expect(result.damage).toBe(5);
        expect(result.log).toContain('독 피해');
      });

      it('체력이 0 미만으로 내려가지 않는다', () => {
        const actor = createMockActor({
          hp: 3,
          poison: 10,
        });

        const result = applyPoisonEffect(actor, 'player');

        expect(result.actor.hp).toBe(0);
      });

      it('독 효과가 없으면 변경 없음', () => {
        const actor = createMockActor({ hp: 50 });

        const result = applyPoisonEffect(actor, 'player');

        expect(result.actor.hp).toBe(50);
        expect(result.damage).toBe(0);
        expect(result.log).toBeNull();
      });
    });
  });

  describe('상태 확인', () => {
    describe('isStunned', () => {
      it('기절 상태면 true', () => {
        const actor = createMockActor({ stunned: true, stunDuration: 1 });
        expect(isStunned(actor)).toBe(true);
      });

      it('기절 상태가 아니면 false', () => {
        const actor = createMockActor({ stunned: false });
        expect(isStunned(actor)).toBe(false);
      });

      it('지속 시간이 0이면 false', () => {
        const actor = createMockActor({ stunned: true, stunDuration: 0 });
        expect(isStunned(actor)).toBe(false);
      });
    });

    describe('isVulnerable', () => {
      it('취약 상태면 true', () => {
        const actor = createMockActor({ vulnMult: 1.5, vulnTurns: 2 });
        expect(isVulnerable(actor)).toBe(true);
      });

      it('취약 배율이 1이면 false', () => {
        const actor = createMockActor({ vulnMult: 1, vulnTurns: 2 });
        expect(isVulnerable(actor)).toBe(false);
      });

      it('지속 시간이 0이면 false', () => {
        const actor = createMockActor({ vulnMult: 1.5, vulnTurns: 0 });
        expect(isVulnerable(actor)).toBe(false);
      });
    });
  });

  describe('getActiveEffects', () => {
    it('활성 버프 목록을 반환한다', () => {
      const actor = createMockActor({
        strength: 3,
        strengthDuration: 2,
        agility: 1,
        agilityDuration: 1,
      });

      const effects = getActiveEffects(actor);

      expect(effects.length).toBe(2);
      expect(effects.find(e => e.name === '힘')).toBeDefined();
      expect(effects.find(e => e.name === '민첩')).toBeDefined();
    });

    it('디버프도 포함한다', () => {
      const actor = createMockActor({
        poison: 5,
        poisonDuration: 3,
        vulnMult: 1.5,
        vulnTurns: 2,
      });

      const effects = getActiveEffects(actor);

      expect(effects.find(e => e.name === '독')).toBeDefined();
      expect(effects.find(e => e.name === '취약')).toBeDefined();
    });

    it('기절 상태를 포함한다', () => {
      const actor = createMockActor({ stunned: true, stunDuration: 1 });

      const effects = getActiveEffects(actor);

      expect(effects.find(e => e.name === '기절')).toBeDefined();
    });

    it('효과가 없으면 빈 배열', () => {
      const actor = createMockActor();

      const effects = getActiveEffects(actor);

      expect(effects.length).toBe(0);
    });
  });

  describe('clearAllEffects', () => {
    it('모든 상태 효과를 제거한다', () => {
      const actor = createMockActor({
        strength: 5,
        strengthDuration: 3,
        agility: 2,
        agilityDuration: 2,
        poison: 3,
        poisonDuration: 2,
        stunned: true,
        stunDuration: 1,
        vulnMult: 1.5,
        vulnTurns: 2,
      });

      const result = clearAllEffects(actor);

      expect(result.strength).toBe(0);
      expect(result.agility).toBe(0);
      expect(result.poison).toBe(0);
      expect(result.stunned).toBe(false);
      expect(result.vulnMult).toBe(1);
    });

    it('체력과 다른 속성은 유지한다', () => {
      const actor = createMockActor({
        hp: 75,
        maxHp: 100,
        block: 10,
        strength: 5,
      });

      const result = clearAllEffects(actor);

      expect(result.hp).toBe(75);
      expect(result.maxHp).toBe(100);
      expect(result.block).toBe(10);
    });
  });
});
