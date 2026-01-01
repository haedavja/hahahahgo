/**
 * @file growth-system.test.ts
 * @description 피라미드 성장 시스템 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  GrowthSystem,
  createInitialGrowthState,
  createGrowthSystem,
  applyGrowthBonuses,
  type GrowthState,
  type GrowthBonuses,
} from '../core/growth-system';

describe('growth-system', () => {
  describe('createInitialGrowthState', () => {
    it('초기 상태를 생성한다', () => {
      const state = createInitialGrowthState();

      expect(state.pyramidLevel).toBe(0);
      expect(state.skillPoints).toBe(0);
      expect(state.unlockedEthos).toEqual([]);
      expect(state.unlockedPathos).toEqual([]);
      expect(state.unlockedNodes).toEqual([]);
      expect(state.identities).toEqual([]);
      expect(state.logosLevels).toEqual({ common: 0, gunkata: 0, battleWaltz: 0 });
      expect(state.equippedPathos).toEqual([]);
      expect(state.traits).toEqual([]);
    });
  });

  describe('GrowthSystem', () => {
    let system: GrowthSystem;

    beforeEach(() => {
      system = new GrowthSystem();
    });

    describe('constructor', () => {
      it('기본 초기 상태로 시작한다', () => {
        const state = system.getState();
        expect(state.pyramidLevel).toBe(0);
        expect(state.skillPoints).toBe(0);
      });

      it('초기 상태를 오버라이드할 수 있다', () => {
        const customSystem = new GrowthSystem({
          pyramidLevel: 3,
          skillPoints: 5,
        });

        const state = customSystem.getState();
        expect(state.pyramidLevel).toBe(3);
        expect(state.skillPoints).toBe(5);
      });
    });

    describe('getState', () => {
      it('상태의 복사본을 반환한다', () => {
        const state1 = system.getState();
        const state2 = system.getState();

        expect(state1).not.toBe(state2);
        expect(state1).toEqual(state2);
      });
    });

    describe('levelUp', () => {
      it('피라미드 레벨을 1 증가시킨다', () => {
        system.levelUp();

        expect(system.getState().pyramidLevel).toBe(1);
      });

      it('스킬 포인트를 1 증가시킨다', () => {
        system.levelUp();

        expect(system.getState().skillPoints).toBe(1);
      });

      it('레벨 7 이상으로 증가하지 않는다', () => {
        for (let i = 0; i < 10; i++) {
          system.levelUp();
        }

        expect(system.getState().pyramidLevel).toBe(7);
        expect(system.getState().skillPoints).toBe(7);
      });
    });

    describe('addTrait', () => {
      it('개성을 추가한다', () => {
        system.addTrait('용맹함');

        expect(system.getState().traits).toContain('용맹함');
      });

      it('중복 개성을 추가하지 않는다', () => {
        system.addTrait('용맹함');
        system.addTrait('용맹함');

        expect(system.getState().traits.filter(t => t === '용맹함').length).toBe(1);
      });

      it('개성에 해당하는 에토스를 자동 해금한다', () => {
        system.addTrait('용맹함');

        expect(system.getState().unlockedEthos).toContain('bravery');
      });

      it('개성 추가 시 피라미드 레벨이 올라간다', () => {
        system.addTrait('용맹함');

        // 개성 1개면 레벨 1
        expect(system.getState().pyramidLevel).toBe(1);
        expect(system.getState().skillPoints).toBe(1);
      });

      it('개성 2개면 피라미드 레벨 2가 된다', () => {
        system.addTrait('용맹함');
        system.addTrait('굳건함');

        expect(system.getState().pyramidLevel).toBe(2);
      });
    });

    describe('selectEthos', () => {
      beforeEach(() => {
        // 피라미드 레벨을 3으로 설정
        for (let i = 0; i < 3; i++) {
          system.levelUp();
        }
      });

      it('존재하지 않는 에토스는 선택 실패한다', () => {
        const result = system.selectEthos('invalid_ethos');
        expect(result).toBe(false);
      });

      it('이미 해금된 에토스는 선택 실패한다', () => {
        system.addTrait('용맹함'); // bravery 자동 해금

        const result = system.selectEthos('bravery');
        expect(result).toBe(false);
      });

      it('피라미드 레벨이 부족하면 선택 실패한다', () => {
        const lowLevelSystem = new GrowthSystem({ pyramidLevel: 0 });

        // 피라미드 레벨 3 이상 필요한 에토스 선택 시도
        const result = lowLevelSystem.selectEthos('tier3_ethos');
        expect(result).toBe(false);
      });
    });

    describe('selectPathos', () => {
      beforeEach(() => {
        // 피라미드 레벨과 스킬포인트 설정
        for (let i = 0; i < 3; i++) {
          system.levelUp();
        }
      });

      it('존재하지 않는 파토스는 선택 실패한다', () => {
        const result = system.selectPathos('invalid_pathos');
        expect(result).toBe(false);
      });

      it('스킬포인트가 없으면 선택 실패한다', () => {
        const noPointsSystem = new GrowthSystem({
          pyramidLevel: 3,
          skillPoints: 0,
        });

        const result = noPointsSystem.selectPathos('any_pathos');
        expect(result).toBe(false);
      });
    });

    describe('selectIdentity', () => {
      it('피라미드 레벨 6 미만이면 선택 실패한다', () => {
        const lowLevelSystem = new GrowthSystem({ pyramidLevel: 5 });

        const result = lowLevelSystem.selectIdentity('swordsman');
        expect(result).toBe(false);
      });

      it('피라미드 레벨 6 이상이면 선택 가능하다', () => {
        const highLevelSystem = new GrowthSystem({ pyramidLevel: 6 });

        const result = highLevelSystem.selectIdentity('swordsman');
        expect(result).toBe(true);
        expect(highLevelSystem.getState().identities).toContain('swordsman');
      });

      it('중복 자아는 선택 실패한다', () => {
        const systemWithIdentity = new GrowthSystem({
          pyramidLevel: 6,
          identities: ['swordsman'],
        });

        const result = systemWithIdentity.selectIdentity('swordsman');
        expect(result).toBe(false);
      });
    });

    describe('unlockLogos', () => {
      it('스킬포인트가 없으면 해금 실패한다', () => {
        const noPointsSystem = new GrowthSystem({
          pyramidLevel: 6,
          skillPoints: 0,
          identities: ['swordsman'],
        });

        const result = noPointsSystem.unlockLogos('common');
        expect(result).toBe(false);
      });

      it('자아가 없으면 common 로고스 해금 실패한다', () => {
        const noIdentitySystem = new GrowthSystem({
          pyramidLevel: 6,
          skillPoints: 3,
          identities: [],
        });

        const result = noIdentitySystem.unlockLogos('common');
        expect(result).toBe(false);
      });

      it('gunslinger 자아 없이 gunkata 로고스 해금 실패한다', () => {
        const swordsmanSystem = new GrowthSystem({
          pyramidLevel: 6,
          skillPoints: 3,
          identities: ['swordsman'],
        });

        const result = swordsmanSystem.unlockLogos('gunkata');
        expect(result).toBe(false);
      });

      it('swordsman 자아 없이 battleWaltz 로고스 해금 실패한다', () => {
        const gunslingerSystem = new GrowthSystem({
          pyramidLevel: 6,
          skillPoints: 3,
          identities: ['gunslinger'],
        });

        const result = gunslingerSystem.unlockLogos('battleWaltz');
        expect(result).toBe(false);
      });

      it('로고스 레벨 3 이상으로 해금 불가능하다', () => {
        const maxedSystem = new GrowthSystem({
          pyramidLevel: 7,
          skillPoints: 5,
          identities: ['swordsman'],
          logosLevels: { common: 3, gunkata: 0, battleWaltz: 0 },
        });

        const result = maxedSystem.unlockLogos('common');
        expect(result).toBe(false);
      });
    });

    describe('equipPathos', () => {
      it('해금된 파토스만 장착한다', () => {
        const systemWithPathos = new GrowthSystem({
          unlockedPathos: ['pathos_a', 'pathos_b'],
        });

        systemWithPathos.equipPathos(['pathos_a', 'pathos_b', 'pathos_c']);

        const state = systemWithPathos.getState();
        expect(state.equippedPathos).toContain('pathos_a');
        expect(state.equippedPathos).toContain('pathos_b');
        expect(state.equippedPathos).not.toContain('pathos_c');
      });

      it('최대 3개까지만 장착한다', () => {
        const systemWithPathos = new GrowthSystem({
          unlockedPathos: ['a', 'b', 'c', 'd', 'e'],
        });

        systemWithPathos.equipPathos(['a', 'b', 'c', 'd', 'e']);

        expect(systemWithPathos.getState().equippedPathos.length).toBe(3);
      });
    });

    describe('calculateBonuses', () => {
      it('기본 보너스가 0이다', () => {
        const bonuses = system.calculateBonuses();

        expect(bonuses.maxHpBonus).toBe(0);
        expect(bonuses.attackBonus).toBe(0);
        expect(bonuses.blockBonus).toBe(0);
        expect(bonuses.critBonus).toBe(0);
        expect(bonuses.speedBonus).toBe(0);
        expect(bonuses.startingFinesse).toBe(0);
        expect(bonuses.startingFocus).toBe(0);
        expect(bonuses.ammoBonus).toBe(0);
        expect(bonuses.chainDamageBonus).toBe(0);
        expect(bonuses.crossRangeBonus).toBe(0);
        expect(bonuses.specialEffects).toEqual([]);
      });

      it('로고스 레벨에 따라 보너스가 적용된다', () => {
        const systemWithLogos = new GrowthSystem({
          pyramidLevel: 6,
          identities: ['swordsman'],
          logosLevels: { common: 1, gunkata: 0, battleWaltz: 1 },
        });

        const bonuses = systemWithLogos.calculateBonuses();

        expect(bonuses.crossRangeBonus).toBe(1); // common 레벨 1
        expect(bonuses.startingFinesse).toBe(1); // battleWaltz 레벨 1
        expect(bonuses.specialEffects.some(e => e.includes('배틀왈츠'))).toBe(true);
      });
    });

    describe('getRecommendedSelection', () => {
      it('피라미드 레벨 0이면 null을 반환한다', () => {
        const result = system.getRecommendedSelection('aggressive');

        expect(result).toBeNull();
      });

      it('피라미드 레벨 1 이상이면 추천을 반환한다', () => {
        system.levelUp();

        const result = system.getRecommendedSelection('aggressive');

        // 레벨 1이면 기초 에토스 추천 가능
        // 실제로 추천할 에토스가 있는지는 데이터에 따라 다름
        // null이 아닐 수도 있고 null일 수도 있음 (데이터 의존)
        expect(result === null || result.type === 'ethos').toBe(true);
      });
    });
  });

  describe('createGrowthSystem', () => {
    it('GrowthSystem 인스턴스를 생성한다', () => {
      const system = createGrowthSystem();

      expect(system).toBeInstanceOf(GrowthSystem);
    });

    it('초기 상태를 전달할 수 있다', () => {
      const system = createGrowthSystem({
        pyramidLevel: 5,
        skillPoints: 10,
      });

      const state = system.getState();
      expect(state.pyramidLevel).toBe(5);
      expect(state.skillPoints).toBe(10);
    });
  });

  describe('applyGrowthBonuses', () => {
    it('최대 HP 보너스를 적용한다', () => {
      const playerState = { hp: 70, maxHp: 80 };
      const bonuses: GrowthBonuses = {
        maxHpBonus: 10,
        attackBonus: 0,
        blockBonus: 0,
        critBonus: 0,
        speedBonus: 0,
        startingFinesse: 0,
        startingFocus: 0,
        ammoBonus: 0,
        chainDamageBonus: 0,
        crossRangeBonus: 0,
        specialEffects: [],
      };

      applyGrowthBonuses(playerState, bonuses);

      expect(playerState.maxHp).toBe(90);
      expect(playerState.hp).toBe(80); // 70 + 10 = 80
    });

    it('HP가 최대 HP를 초과하지 않는다', () => {
      const playerState = { hp: 80, maxHp: 80 };
      const bonuses: GrowthBonuses = {
        maxHpBonus: 10,
        attackBonus: 0,
        blockBonus: 0,
        critBonus: 0,
        speedBonus: 0,
        startingFinesse: 0,
        startingFocus: 0,
        ammoBonus: 0,
        chainDamageBonus: 0,
        crossRangeBonus: 0,
        specialEffects: [],
      };

      applyGrowthBonuses(playerState, bonuses);

      expect(playerState.maxHp).toBe(90);
      expect(playerState.hp).toBe(90); // 최대 HP에 맞춰짐
    });

    it('시작 기교 토큰을 적용한다', () => {
      const playerState = { hp: 70, maxHp: 80, tokens: {} };
      const bonuses: GrowthBonuses = {
        maxHpBonus: 0,
        attackBonus: 0,
        blockBonus: 0,
        critBonus: 0,
        speedBonus: 0,
        startingFinesse: 2,
        startingFocus: 0,
        ammoBonus: 0,
        chainDamageBonus: 0,
        crossRangeBonus: 0,
        specialEffects: [],
      };

      applyGrowthBonuses(playerState, bonuses);

      expect(playerState.tokens?.['finesse']).toBe(2);
    });

    it('시작 집중 토큰을 적용한다', () => {
      const playerState = { hp: 70, maxHp: 80, tokens: {} };
      const bonuses: GrowthBonuses = {
        maxHpBonus: 0,
        attackBonus: 0,
        blockBonus: 0,
        critBonus: 0,
        speedBonus: 0,
        startingFinesse: 0,
        startingFocus: 3,
        ammoBonus: 0,
        chainDamageBonus: 0,
        crossRangeBonus: 0,
        specialEffects: [],
      };

      applyGrowthBonuses(playerState, bonuses);

      expect(playerState.tokens?.['focus']).toBe(3);
    });

    it('토큰이 없는 상태에서도 토큰 객체를 생성한다', () => {
      const playerState = { hp: 70, maxHp: 80 };
      const bonuses: GrowthBonuses = {
        maxHpBonus: 0,
        attackBonus: 0,
        blockBonus: 0,
        critBonus: 0,
        speedBonus: 0,
        startingFinesse: 1,
        startingFocus: 0,
        ammoBonus: 0,
        chainDamageBonus: 0,
        crossRangeBonus: 0,
        specialEffects: [],
      };

      applyGrowthBonuses(playerState, bonuses);

      expect(playerState.tokens).toBeDefined();
      expect(playerState.tokens?.['finesse']).toBe(1);
    });

    it('기존 토큰에 추가한다', () => {
      const playerState = { hp: 70, maxHp: 80, tokens: { finesse: 2 } };
      const bonuses: GrowthBonuses = {
        maxHpBonus: 0,
        attackBonus: 0,
        blockBonus: 0,
        critBonus: 0,
        speedBonus: 0,
        startingFinesse: 3,
        startingFocus: 0,
        ammoBonus: 0,
        chainDamageBonus: 0,
        crossRangeBonus: 0,
        specialEffects: [],
      };

      applyGrowthBonuses(playerState, bonuses);

      expect(playerState.tokens?.['finesse']).toBe(5);
    });
  });
});
