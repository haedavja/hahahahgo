/**
 * @file relic-system.test.ts
 * @description 상징(Relic) 시스템 테스트
 *
 * @deprecated ===== V1 상징 시스템 테스트 (LEGACY) =====
 *
 * 이 테스트 파일은 레거시 V1 상징 시스템을 테스트합니다.
 * V2 상징 시스템 테스트는 systems.test.ts에 포함되어 있습니다.
 *
 * V2 시스템은 src/data/relics.ts의 실제 게임 데이터를 사용하므로
 * 더 정확한 테스트가 가능합니다.
 *
 * 신규 상징 관련 테스트는 V2 시스템 기반으로 작성하세요.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  RelicSystem,
  RELIC_DEFINITIONS,
  formatRelicEffect,
  getRelicSystem,
  type RelicDefinition,
  type RelicEffectResult,
} from '../core/relic-system';
import type { SimPlayerState, SimEnemyState } from '../core/types';

// 테스트용 플레이어 상태 생성
function createMockPlayer(overrides: Partial<SimPlayerState> = {}): SimPlayerState {
  return {
    hp: 70,
    maxHp: 80,
    energy: 3,
    maxEnergy: 3,
    block: 0,
    deck: [],
    hand: [],
    discard: [],
    exhaust: [],
    drawPile: [],
    relics: [],
    tokens: {},
    gold: 100,
    ...overrides,
  } as SimPlayerState;
}

// 테스트용 적 상태 생성
function createMockEnemy(overrides: Partial<SimEnemyState> = {}): SimEnemyState {
  return {
    id: 'test_enemy',
    name: '테스트 적',
    hp: 50,
    maxHp: 50,
    block: 0,
    tokens: {},
    intent: 'attack',
    ...overrides,
  } as SimEnemyState;
}

describe('relic-system', () => {
  describe('RELIC_DEFINITIONS', () => {
    it('상징 정의가 비어있지 않다', () => {
      expect(Object.keys(RELIC_DEFINITIONS).length).toBeGreaterThan(0);
    });

    it('모든 상징이 필수 필드를 가진다', () => {
      for (const [id, def] of Object.entries(RELIC_DEFINITIONS)) {
        expect(def.id).toBe(id);
        expect(def.name).toBeTruthy();
        expect(def.description).toBeTruthy();
        expect(def.rarity).toBeTruthy();
        expect(def.triggers).toBeDefined();
        expect(def.effects).toBeDefined();
        expect(typeof def.stackable).toBe('boolean');
      }
    });

    it('희귀도가 유효하다', () => {
      const validRarities = ['common', 'uncommon', 'rare', 'legendary', 'cursed'];
      for (const def of Object.values(RELIC_DEFINITIONS)) {
        expect(validRarities).toContain(def.rarity);
      }
    });

    it('burning_blood 상징이 정의되어 있다', () => {
      const relic = RELIC_DEFINITIONS.burning_blood;
      expect(relic.name).toBe('불타는 피');
      expect(relic.rarity).toBe('common');
      expect(relic.triggers).toContain('battle_end');
    });

    it('bronze_scales 상징이 onActivate를 가진다', () => {
      const relic = RELIC_DEFINITIONS.bronze_scales;
      expect(relic.onActivate).toBeDefined();
    });
  });

  describe('RelicSystem', () => {
    let system: RelicSystem;

    beforeEach(() => {
      system = new RelicSystem();
    });

    describe('initializeRelics', () => {
      it('상징을 초기화한다', () => {
        system.initializeRelics(['burning_blood', 'bronze_scales']);

        const state1 = system.getRelicState('burning_blood');
        const state2 = system.getRelicState('bronze_scales');

        expect(state1).toBeDefined();
        expect(state2).toBeDefined();
        expect(state1?.stacks).toBe(1);
        expect(state1?.totalActivations).toBe(0);
      });

      it('존재하지 않는 상징은 무시한다', () => {
        system.initializeRelics(['burning_blood', 'invalid_relic']);

        expect(system.getRelicState('burning_blood')).toBeDefined();
        expect(system.getRelicState('invalid_relic')).toBeUndefined();
      });

      it('초기화 시 상태가 리셋된다', () => {
        system.initializeRelics(['burning_blood']);
        const state = system.getRelicState('burning_blood');
        expect(state?.cooldownRemaining).toBe(0);
        expect(state?.activatedThisTurn).toBe(false);
      });
    });

    describe('processTrigger', () => {
      beforeEach(() => {
        system.initializeRelics(['burning_blood', 'bag_of_preparation']);
      });

      it('battle_end 트리거에 burning_blood가 활성화된다', () => {
        const player = createMockPlayer({ relics: ['burning_blood'] });
        const enemy = createMockEnemy();

        const results = system.processTrigger('battle_end', player, enemy, 1);

        expect(results.length).toBe(1);
        expect(results[0].healAmount).toBe(6);
      });

      it('battle_start 트리거에 bag_of_preparation이 활성화된다', () => {
        const player = createMockPlayer({ relics: ['bag_of_preparation'] });
        const enemy = createMockEnemy();

        const results = system.processTrigger('battle_start', player, enemy, 1);

        expect(results.length).toBe(1);
        expect(results[0].drawCards).toBe(2);
      });

      it('관련 없는 트리거는 결과가 없다', () => {
        const player = createMockPlayer({ relics: ['burning_blood'] });
        const enemy = createMockEnemy();

        const results = system.processTrigger('turn_start', player, enemy, 1);

        expect(results.length).toBe(0);
      });

      it('bronze_scales의 onActivate가 호출된다', () => {
        system.initializeRelics(['bronze_scales']);
        const player = createMockPlayer({ relics: ['bronze_scales'] });
        const enemy = createMockEnemy();

        const results = system.processTrigger('on_take_damage', player, enemy, 1, { damageAmount: 10 });

        expect(results.length).toBe(1);
        expect(results[0].reflectDamage).toBe(3);
        expect(results[0].message).toBe('청동 비늘 반사!');
      });

      it('활성화 후 totalActivations가 증가한다', () => {
        const player = createMockPlayer({ relics: ['burning_blood'] });
        const enemy = createMockEnemy();

        system.processTrigger('battle_end', player, enemy, 1);

        const state = system.getRelicState('burning_blood');
        expect(state?.totalActivations).toBe(1);
      });
    });

    describe('조건부 효과', () => {
      it('ornamental_fan은 카드 3장 이상 사용 시 활성화된다', () => {
        system.initializeRelics(['ornamental_fan']);
        const player = createMockPlayer({ relics: ['ornamental_fan'] });
        const enemy = createMockEnemy();

        // 카드 3장 사용
        system.trackCardPlay('attack');
        system.trackCardPlay('skill');
        system.trackCardPlay('attack');

        const results = system.processTrigger('turn_end', player, enemy, 1);

        expect(results.length).toBe(1);
        expect(results[0].blockAmount).toBe(8);
      });

      it('ornamental_fan은 카드 2장 사용 시 활성화되지 않는다', () => {
        system.initializeRelics(['ornamental_fan']);
        const player = createMockPlayer({ relics: ['ornamental_fan'] });
        const enemy = createMockEnemy();

        // 카드 2장 사용
        system.trackCardPlay('attack');
        system.trackCardPlay('skill');

        const results = system.processTrigger('turn_end', player, enemy, 1);

        expect(results.length).toBe(0);
      });

      it('kunai는 공격 카드 3장 사용 시 민첩을 부여한다', () => {
        system.initializeRelics(['kunai']);
        const player = createMockPlayer({ relics: ['kunai'] });
        const enemy = createMockEnemy();

        // 공격 카드 3장 사용
        system.trackCardPlay('attack');
        system.trackCardPlay('attack');
        system.trackCardPlay('attack');

        const results = system.processTrigger('turn_end', player, enemy, 1);

        expect(results.length).toBe(1);
        expect(results[0].tokensGrant?.dexterity).toBe(1);
      });
    });

    describe('onTurnStart', () => {
      it('턴 시작 시 카운터가 리셋된다', () => {
        system.initializeRelics(['ornamental_fan']);

        // 카드 사용
        system.trackCardPlay('attack');
        system.trackCardPlay('attack');

        // 턴 시작
        system.onTurnStart();

        const state = system.getRelicState('ornamental_fan');
        expect(state?.customData.cardsPlayedThisTurn).toBe(0);
        expect(state?.customData.attacksThisTurn).toBe(0);
      });

      it('턴 시작 시 쿨다운이 감소한다', () => {
        system.initializeRelics(['burning_blood']);
        const state = system.getRelicState('burning_blood');
        if (state) {
          state.cooldownRemaining = 2;
        }

        system.onTurnStart();

        expect(state?.cooldownRemaining).toBe(1);
      });
    });

    describe('trackCardPlay', () => {
      it('공격 카드 사용을 추적한다', () => {
        system.initializeRelics(['kunai']);

        system.trackCardPlay('attack');
        system.trackCardPlay('attack');

        const state = system.getRelicState('kunai');
        expect(state?.customData.cardsPlayedThisTurn).toBe(2);
        expect(state?.customData.attacksThisTurn).toBe(2);
      });

      it('스킬 카드 사용을 추적한다', () => {
        system.initializeRelics(['letter_opener']);

        system.trackCardPlay('skill');
        system.trackCardPlay('skill');

        const state = system.getRelicState('letter_opener');
        expect(state?.customData.skillsThisTurn).toBe(2);
      });
    });

    describe('getPassiveEffects', () => {
      it('패시브 에너지 효과를 반환한다', () => {
        const result = system.getPassiveEffects(['cursed_key', 'mark_of_pain']);

        expect(result.energyGain).toBe(2); // 각각 +1
      });

      it('패시브가 없는 상징은 효과가 없다', () => {
        const result = system.getPassiveEffects(['burning_blood']);

        expect(result.energyGain).toBe(0);
      });
    });

    describe('getRelicInfo', () => {
      it('상징 정보를 반환한다', () => {
        const info = system.getRelicInfo('burning_blood');

        expect(info).toBeDefined();
        expect(info?.name).toBe('불타는 피');
      });

      it('존재하지 않는 상징은 undefined를 반환한다', () => {
        const info = system.getRelicInfo('invalid_relic');

        expect(info).toBeUndefined();
      });
    });

    describe('getAllRelics', () => {
      it('모든 상징 목록을 반환한다', () => {
        const relics = system.getAllRelics();

        expect(relics.length).toBeGreaterThan(0);
        expect(relics.some(r => r.id === 'burning_blood')).toBe(true);
      });
    });

    describe('getRelicsByRarity', () => {
      it('희귀도별 상징을 반환한다', () => {
        const commonRelics = system.getRelicsByRarity('common');
        const legendaryRelics = system.getRelicsByRarity('legendary');

        expect(commonRelics.length).toBeGreaterThan(0);
        expect(commonRelics.every(r => r.rarity === 'common')).toBe(true);

        expect(legendaryRelics.length).toBeGreaterThan(0);
        expect(legendaryRelics.every(r => r.rarity === 'legendary')).toBe(true);
      });
    });

    describe('커스텀 정의', () => {
      it('커스텀 상징 정의를 추가할 수 있다', () => {
        const customDef: RelicDefinition = {
          id: 'custom_relic',
          name: '커스텀 상징',
          description: '테스트용 상징',
          rarity: 'common',
          triggers: ['battle_start'],
          effects: [{ type: 'heal', target: 'self', value: 10 }],
          stackable: false,
        };

        const customSystem = new RelicSystem({ custom_relic: customDef });
        const info = customSystem.getRelicInfo('custom_relic');

        expect(info).toBeDefined();
        expect(info?.name).toBe('커스텀 상징');
      });
    });
  });

  describe('formatRelicEffect', () => {
    it('회복량을 포맷한다', () => {
      const result: RelicEffectResult = { healAmount: 6 };
      expect(formatRelicEffect(result)).toBe('+6 HP');
    });

    it('방어를 포맷한다', () => {
      const result: RelicEffectResult = { blockAmount: 8 };
      expect(formatRelicEffect(result)).toBe('+8 방어');
    });

    it('드로우를 포맷한다', () => {
      const result: RelicEffectResult = { drawCards: 2 };
      expect(formatRelicEffect(result)).toBe('+2 드로우');
    });

    it('에너지를 포맷한다', () => {
      const result: RelicEffectResult = { energyGain: 1 };
      expect(formatRelicEffect(result)).toBe('+1 에너지');
    });

    it('피해 수정을 포맷한다', () => {
      const result: RelicEffectResult = { damageModifier: 5 };
      expect(formatRelicEffect(result)).toBe('피해 +5');
    });

    it('반사 피해를 포맷한다', () => {
      const result: RelicEffectResult = { reflectDamage: 3 };
      expect(formatRelicEffect(result)).toBe('3 반사');
    });

    it('토큰 부여를 포맷한다', () => {
      const result: RelicEffectResult = { tokensGrant: { strength: 2 } };
      expect(formatRelicEffect(result)).toBe('+2 strength');
    });

    it('여러 효과를 결합한다', () => {
      const result: RelicEffectResult = { healAmount: 5, drawCards: 1 };
      expect(formatRelicEffect(result)).toBe('+5 HP, +1 드로우');
    });

    it('효과가 없으면 "효과 없음"을 반환한다', () => {
      const result: RelicEffectResult = {};
      expect(formatRelicEffect(result)).toBe('효과 없음');
    });
  });

  describe('getRelicSystem', () => {
    it('싱글톤 인스턴스를 반환한다', () => {
      const instance1 = getRelicSystem();
      const instance2 = getRelicSystem();

      expect(instance1).toBe(instance2);
    });
  });
});
