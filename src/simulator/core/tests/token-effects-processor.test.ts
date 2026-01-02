/**
 * @file token-effects-processor.test.ts
 * @description 토큰 효과 처리기 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TOKEN_EFFECTS,
  processAttackTokenEffects,
  processDefenseTokenEffects,
  processDamageTakenTokenEffects,
  processTurnStartTokenEffects,
  processTurnEndTokenEffects,
  consumeTokens,
  applyTokenEffects,
  type TokenEffectResult,
} from '../token-effects-processor';
import type { GameBattleState, GameCard, TokenState } from '../game-types';

// token-system 모킹
vi.mock('../token-system', () => ({
  addToken: vi.fn((tokens: TokenState, id: string, value: number) => ({
    ...tokens,
    [id]: (tokens[id] || 0) + value,
  })),
  removeToken: vi.fn((tokens: TokenState, id: string, value: number) => {
    const newTokens = { ...tokens };
    if (newTokens[id]) {
      newTokens[id] -= value;
      if (newTokens[id] <= 0) {
        delete newTokens[id];
      }
    }
    return newTokens;
  }),
  getTokenStacks: vi.fn((tokens: TokenState, id: string) => tokens[id] || 0),
  hasToken: vi.fn((tokens: TokenState, id: string) => !!tokens[id] && tokens[id] > 0),
  clearToken: vi.fn((tokens: TokenState, id: string) => {
    const newTokens = { ...tokens };
    delete newTokens[id];
    return newTokens;
  }),
}));

// 테스트용 상태 생성
function createMockState(overrides: Partial<GameBattleState> = {}): GameBattleState {
  return {
    turn: 1,
    phase: 'play',
    timeline: [],
    player: {
      hp: 80,
      maxHp: 100,
      block: 0,
      tokens: {},
      hand: [],
      deck: [],
      discard: [],
    },
    enemy: {
      hp: 100,
      maxHp: 100,
      block: 0,
      tokens: {},
      intent: null,
    },
    log: [],
    ...overrides,
  } as GameBattleState;
}

// 테스트용 카드 생성
function createMockCard(overrides: Partial<GameCard> = {}): GameCard {
  return {
    id: 'test_card',
    name: '테스트 카드',
    cost: 1,
    type: 'attack',
    damage: 10,
    description: '테스트',
    ...overrides,
  } as GameCard;
}

describe('token-effects-processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Math.random 고정 (blur 테스트용)
    vi.spyOn(Math, 'random').mockReturnValue(0.3);
  });

  describe('TOKEN_EFFECTS 정의', () => {
    it('offense 토큰이 정의되어 있다', () => {
      expect(TOKEN_EFFECTS.offense).toBeDefined();
      expect(TOKEN_EFFECTS.offense.name).toBe('공세');
      expect(TOKEN_EFFECTS.offense.category).toBe('positive');
      expect(TOKEN_EFFECTS.offense.type).toBe('usage');
    });

    it('offensePlus 토큰이 정의되어 있다', () => {
      expect(TOKEN_EFFECTS.offensePlus).toBeDefined();
      expect(TOKEN_EFFECTS.offensePlus.name).toBe('공세+');
    });

    it('guard 토큰이 정의되어 있다', () => {
      expect(TOKEN_EFFECTS.guard).toBeDefined();
      expect(TOKEN_EFFECTS.guard.name).toBe('수세');
      expect(TOKEN_EFFECTS.guard.category).toBe('positive');
    });

    it('dull 토큰이 정의되어 있다', () => {
      expect(TOKEN_EFFECTS.dull).toBeDefined();
      expect(TOKEN_EFFECTS.dull.name).toBe('무딤');
      expect(TOKEN_EFFECTS.dull.category).toBe('negative');
    });

    it('burn 토큰이 정의되어 있다', () => {
      expect(TOKEN_EFFECTS.burn).toBeDefined();
      expect(TOKEN_EFFECTS.burn.name).toBe('화상');
      expect(TOKEN_EFFECTS.burn.type).toBe('stack');
    });

    it('poison 토큰이 정의되어 있다', () => {
      expect(TOKEN_EFFECTS.poison).toBeDefined();
      expect(TOKEN_EFFECTS.poison.name).toBe('독');
    });

    it('bleed 토큰이 정의되어 있다', () => {
      expect(TOKEN_EFFECTS.bleed).toBeDefined();
      expect(TOKEN_EFFECTS.bleed.name).toBe('출혈');
    });

    it('counter 토큰이 정의되어 있다', () => {
      expect(TOKEN_EFFECTS.counter).toBeDefined();
      expect(TOKEN_EFFECTS.counter.name).toBe('반격');
    });

    it('evasion 토큰이 정의되어 있다', () => {
      expect(TOKEN_EFFECTS.evasion).toBeDefined();
      expect(TOKEN_EFFECTS.evasion.name).toBe('회피');
    });

    it('vulnerable 토큰이 정의되어 있다', () => {
      expect(TOKEN_EFFECTS.vulnerable).toBeDefined();
      expect(TOKEN_EFFECTS.vulnerable.name).toBe('허약');
    });

    it('strength 토큰이 정의되어 있다', () => {
      expect(TOKEN_EFFECTS.strength).toBeDefined();
      expect(TOKEN_EFFECTS.strength.name).toBe('힘');
      expect(TOKEN_EFFECTS.strength.type).toBe('permanent');
    });

    it('regeneration 토큰이 정의되어 있다', () => {
      expect(TOKEN_EFFECTS.regeneration).toBeDefined();
      expect(TOKEN_EFFECTS.regeneration.name).toBe('재생');
    });

    it('finesse 토큰이 정의되어 있다', () => {
      expect(TOKEN_EFFECTS.finesse).toBeDefined();
      expect(TOKEN_EFFECTS.finesse.name).toBe('기교');
    });

    it('armorPiercing 토큰이 정의되어 있다', () => {
      expect(TOKEN_EFFECTS.armorPiercing).toBeDefined();
      expect(TOKEN_EFFECTS.armorPiercing.name).toBe('철갑탄');
    });

    it('incendiary 토큰이 정의되어 있다', () => {
      expect(TOKEN_EFFECTS.incendiary).toBeDefined();
      expect(TOKEN_EFFECTS.incendiary.name).toBe('소이탄');
    });

    it('fragmentation 토큰이 정의되어 있다', () => {
      expect(TOKEN_EFFECTS.fragmentation).toBeDefined();
      expect(TOKEN_EFFECTS.fragmentation.name).toBe('파쇄탄');
    });
  });

  describe('TOKEN_EFFECTS 개별 효과 테스트', () => {
    it('offense.onAttack이 피해 50% 증가시킨다', () => {
      const state = createMockState();
      const result = TOKEN_EFFECTS.offense.onAttack!(state, 'player', 10);

      expect(result.modifiedValue).toBe(15); // 10 * 1.5
      expect(result.consumedTokens).toContain('offense');
    });

    it('offensePlus.onAttack이 피해 100% 증가시킨다', () => {
      const state = createMockState();
      const result = TOKEN_EFFECTS.offensePlus.onAttack!(state, 'player', 10);

      expect(result.modifiedValue).toBe(20); // 10 * 2
      expect(result.consumedTokens).toContain('offensePlus');
    });

    it('dull.onAttack이 피해 50% 감소시킨다', () => {
      const state = createMockState();
      const result = TOKEN_EFFECTS.dull.onAttack!(state, 'player', 10);

      expect(result.modifiedValue).toBe(5); // 10 * 0.5
      expect(result.consumedTokens).toContain('dull');
    });

    it('dullPlus.onAttack이 피해 75% 감소시킨다', () => {
      const state = createMockState();
      const result = TOKEN_EFFECTS.dullPlus.onAttack!(state, 'player', 10);

      expect(result.modifiedValue).toBe(2); // 10 * 0.25
      expect(result.consumedTokens).toContain('dullPlus');
    });

    it('guard.onDefend가 방어력 50% 증가시킨다', () => {
      const state = createMockState();
      const result = TOKEN_EFFECTS.guard.onDefend!(state, 'player', 10);

      expect(result.modifiedValue).toBe(15);
      expect(result.consumedTokens).toContain('guard');
    });

    it('guardPlus.onDefend가 방어력 100% 증가시킨다', () => {
      const state = createMockState();
      const result = TOKEN_EFFECTS.guardPlus.onDefend!(state, 'player', 10);

      expect(result.modifiedValue).toBe(20);
      expect(result.consumedTokens).toContain('guardPlus');
    });

    it('shaken.onDefend가 방어력 50% 감소시킨다', () => {
      const state = createMockState();
      const result = TOKEN_EFFECTS.shaken.onDefend!(state, 'player', 10);

      expect(result.modifiedValue).toBe(5);
      expect(result.consumedTokens).toContain('shaken');
    });

    it('exposed.onDefend가 방어력 50% 감소시킨다', () => {
      const state = createMockState();
      const result = TOKEN_EFFECTS.exposed.onDefend!(state, 'player', 10);

      expect(result.modifiedValue).toBe(5);
    });

    it('exposedPlus.onDefend가 방어력을 0으로 만든다', () => {
      const state = createMockState();
      const result = TOKEN_EFFECTS.exposedPlus.onDefend!(state, 'player', 10);

      expect(result.modifiedValue).toBe(0);
    });

    it('evasion.onTakeDamage가 피해를 완전히 회피한다', () => {
      const state = createMockState();
      const result = TOKEN_EFFECTS.evasion.onTakeDamage!(state, 'player', 10);

      expect(result.modifiedValue).toBe(0);
      expect(result.evaded).toBe(true);
      expect(result.consumedTokens).toContain('evasion');
    });

    it('vulnerable.onTakeDamage가 받는 피해 50% 증가시킨다', () => {
      const state = createMockState();
      const result = TOKEN_EFFECTS.vulnerable.onTakeDamage!(state, 'player', 10);

      expect(result.modifiedValue).toBe(15);
      expect(result.consumedTokens).toContain('vulnerable');
    });

    it('vulnerablePlus.onTakeDamage가 받는 피해 100% 증가시킨다', () => {
      const state = createMockState();
      const result = TOKEN_EFFECTS.vulnerablePlus.onTakeDamage!(state, 'player', 10);

      expect(result.modifiedValue).toBe(20);
    });

    it('pain.onTakeDamage가 받는 피해 50% 증가시킨다', () => {
      const state = createMockState();
      const result = TOKEN_EFFECTS.pain.onTakeDamage!(state, 'player', 10);

      expect(result.modifiedValue).toBe(15);
      expect(result.consumedTokens).toContain('pain');
    });

    it('burn.onTurnStart가 스택 x 3 피해를 준다', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { burn: 2 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = TOKEN_EFFECTS.burn.onTurnStart!(state, 'player');

      expect(result.selfDamage).toBe(6); // 2 * 3
      expect(result.appliedEffects![0]).toContain('화상');
    });

    it('poison.onTurnEnd가 스택만큼 피해를 준다', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { poison: 3 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = TOKEN_EFFECTS.poison.onTurnEnd!(state, 'player');

      expect(result.selfDamage).toBe(3);
      expect(result.consumedTokens).toContain('poison_1');
    });

    it('bleed.onAttack이 스택 x 2 자해 피해를 준다', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { bleed: 2 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = TOKEN_EFFECTS.bleed.onAttack!(state, 'player', 10);

      expect(result.selfDamage).toBe(4); // 2 * 2
      expect(result.modifiedValue).toBe(10);
    });

    it('regeneration.onTurnStart가 스택만큼 회복한다', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { regeneration: 3 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = TOKEN_EFFECTS.regeneration.onTurnStart!(state, 'player');

      expect(result.heal).toBe(3);
    });

    it('fragmentation.onAttack이 +6 피해를 준다', () => {
      const state = createMockState();
      const result = TOKEN_EFFECTS.fragmentation.onAttack!(state, 'player', 10);

      expect(result.modifiedValue).toBe(16);
      expect(result.consumedTokens).toContain('fragmentation');
    });

    it('absorb.onDealDamage가 피해의 50%를 회복한다', () => {
      const state = createMockState();
      const result = TOKEN_EFFECTS.absorb.onDealDamage!(state, 'player', 10);

      expect(result.heal).toBe(5);
      expect(result.consumedTokens).toContain('absorb');
    });

    it('incendiary.onDealDamage가 화상 2를 부여한다', () => {
      const state = createMockState();
      const result = TOKEN_EFFECTS.incendiary.onDealDamage!(state, 'player', 10);

      expect(result.appliedTokens).toBeDefined();
      expect(result.appliedTokens![0].id).toBe('burn');
      expect(result.appliedTokens![0].stacks).toBe(2);
      expect(result.appliedTokens![0].target).toBe('enemy');
    });

    it('strength.onAttack이 스택만큼 피해를 증가시킨다', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { strength: 3 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = TOKEN_EFFECTS.strength.onAttack!(state, 'player', 10);

      expect(result.modifiedValue).toBe(13); // 10 + 3
    });

    it('thorns.onTakeDamage가 가시 스택만큼 반사 피해를 준다', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { thorns: 2 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = TOKEN_EFFECTS.thorns.onTakeDamage!(state, 'player', 10);

      expect(result.modifiedValue).toBe(10);
      expect(result.appliedTokens![0].id).toBe('thorns_damage');
      expect(result.appliedTokens![0].stacks).toBe(2);
      expect(result.appliedTokens![0].target).toBe('enemy');
    });
  });

  describe('processAttackTokenEffects', () => {
    it('공세 토큰이 있으면 피해 50% 증가', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { offense: 1 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processAttackTokenEffects(state, 'player', 10);

      expect(result.modifiedValue).toBe(15);
      expect(result.consumedTokens).toContain('offense');
    });

    it('공세+ 토큰이 있으면 피해 100% 증가', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { offensePlus: 1 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processAttackTokenEffects(state, 'player', 10);

      expect(result.modifiedValue).toBe(20);
      expect(result.consumedTokens).toContain('offensePlus');
    });

    it('힘 토큰이 있으면 스택만큼 피해 증가', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { strength: 3 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processAttackTokenEffects(state, 'player', 10);

      expect(result.modifiedValue).toBe(13);
    });

    it('무딤 토큰이 있으면 피해 50% 감소', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { dull: 1 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processAttackTokenEffects(state, 'player', 10);

      expect(result.modifiedValue).toBe(5);
      expect(result.consumedTokens).toContain('dull');
    });

    it('무딤+ 토큰이 있으면 피해 75% 감소', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { dullPlus: 1 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processAttackTokenEffects(state, 'player', 10);

      expect(result.modifiedValue).toBe(2);
      expect(result.consumedTokens).toContain('dullPlus');
    });

    it('검격 카드 + 날 세우기 토큰이 있으면 +3 피해', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { sharpened: 1 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);
      const card = createMockCard({ cardCategory: 'fencing' });

      const result = processAttackTokenEffects(state, 'player', 10, card);

      expect(result.modifiedValue).toBe(13);
    });

    it('총기 카드 + 파쇄탄 토큰이 있으면 +6 피해', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { fragmentation: 1 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);
      const card = createMockCard({ cardCategory: 'gun' });

      const result = processAttackTokenEffects(state, 'player', 10, card);

      expect(result.modifiedValue).toBe(16);
      expect(result.consumedTokens).toContain('fragmentation');
    });

    it('출혈 토큰이 있으면 자해 피해 발생', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { bleed: 2 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processAttackTokenEffects(state, 'player', 10);

      expect(result.selfDamage).toBe(4); // 2 * 2
    });

    it('여러 효과가 복합적으로 적용된다', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { offense: 1, strength: 2 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processAttackTokenEffects(state, 'player', 10);

      // offense: 10 * 1.5 = 15, strength: +2 = 17
      expect(result.modifiedValue).toBe(17);
    });

    it('적 actor도 처리한다', () => {
      const state = createMockState({
        enemy: {
          hp: 100,
          maxHp: 100,
          block: 0,
          tokens: { strength: 2 },
          intent: null,
        },
      } as unknown as Partial<GameBattleState>);

      const result = processAttackTokenEffects(state, 'enemy', 10);

      expect(result.modifiedValue).toBe(12);
    });
  });

  describe('processDefenseTokenEffects', () => {
    it('수세 토큰이 있으면 방어력 50% 증가', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { guard: 1 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processDefenseTokenEffects(state, 'player', 10);

      expect(result.modifiedValue).toBe(15);
      expect(result.consumedTokens).toContain('guard');
    });

    it('수세+ 토큰이 있으면 방어력 100% 증가', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { guardPlus: 1 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processDefenseTokenEffects(state, 'player', 10);

      expect(result.modifiedValue).toBe(20);
      expect(result.consumedTokens).toContain('guardPlus');
    });

    it('힘 토큰이 방어력에도 적용된다', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { strength: 3 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processDefenseTokenEffects(state, 'player', 10);

      expect(result.modifiedValue).toBe(13);
    });

    it('흔들림 토큰이 있으면 방어력 50% 감소', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { shaken: 1 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processDefenseTokenEffects(state, 'player', 10);

      expect(result.modifiedValue).toBe(5);
      expect(result.consumedTokens).toContain('shaken');
    });

    it('흔들림+ 토큰이 있으면 방어력 0', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { shakenPlus: 1 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processDefenseTokenEffects(state, 'player', 10);

      expect(result.modifiedValue).toBe(0);
      expect(result.consumedTokens).toContain('shakenPlus');
    });

    it('무방비 토큰이 있으면 방어력 50% 감소', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { exposed: 1 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processDefenseTokenEffects(state, 'player', 10);

      expect(result.modifiedValue).toBe(5);
    });

    it('무방비+ 토큰이 있으면 방어력 0', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { exposedPlus: 1 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processDefenseTokenEffects(state, 'player', 10);

      expect(result.modifiedValue).toBe(0);
    });
  });

  describe('processDamageTakenTokenEffects', () => {
    it('회피 토큰이 있으면 피해 완전 회피', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { evasion: 1 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processDamageTakenTokenEffects(state, 'player', 10);

      expect(result.modifiedValue).toBe(0);
      expect(result.evaded).toBe(true);
      expect(result.consumedTokens).toContain('evasion');
    });

    it('흐릿함 토큰이 50% 확률로 회피 (성공)', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.3); // 50% 미만 = 성공
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { blur: 1 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processDamageTakenTokenEffects(state, 'player', 10);

      expect(result.modifiedValue).toBe(0);
      expect(result.evaded).toBe(true);
      expect(result.consumedTokens).toContain('blur');
    });

    it('흐릿함 토큰이 50% 확률로 회피 (실패)', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.7); // 50% 이상 = 실패
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { blur: 1 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processDamageTakenTokenEffects(state, 'player', 10);

      expect(result.modifiedValue).toBe(10);
      expect(result.evaded).toBe(false);
      expect(result.consumedTokens).toContain('blur');
    });

    it('허약 토큰이 있으면 받는 피해 50% 증가', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { vulnerable: 1 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processDamageTakenTokenEffects(state, 'player', 10);

      expect(result.modifiedValue).toBe(15);
      expect(result.consumedTokens).toContain('vulnerable');
    });

    it('허약+ 토큰이 있으면 받는 피해 100% 증가', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { vulnerablePlus: 1 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processDamageTakenTokenEffects(state, 'player', 10);

      expect(result.modifiedValue).toBe(20);
    });

    it('아픔 토큰이 있으면 받는 피해 50% 증가', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { pain: 1 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processDamageTakenTokenEffects(state, 'player', 10);

      expect(result.modifiedValue).toBe(15);
      expect(result.consumedTokens).toContain('pain');
    });

    it('아픔+ 토큰이 있으면 받는 피해 100% 증가', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { painPlus: 1 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processDamageTakenTokenEffects(state, 'player', 10);

      expect(result.modifiedValue).toBe(20);
    });

    it('반격 토큰이 있으면 반격 피해 발생', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { counter: 1, strength: 2 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processDamageTakenTokenEffects(state, 'player', 10);

      expect(result.consumedTokens).toContain('counter');
      expect(result.appliedTokens).toBeDefined();
      const counterToken = result.appliedTokens!.find(t => t.id === 'counter_damage');
      expect(counterToken).toBeDefined();
      expect(counterToken!.stacks).toBe(7); // 5 + 2 strength
      expect(counterToken!.target).toBe('enemy');
    });

    it('대응사격 토큰이 있으면 사격 피해 발생', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { counterShot: 1 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processDamageTakenTokenEffects(state, 'player', 10);

      expect(result.consumedTokens).toContain('counterShot');
      const shotToken = result.appliedTokens!.find(t => t.id === 'counterShot_damage');
      expect(shotToken).toBeDefined();
      expect(shotToken!.stacks).toBe(8);
      expect(shotToken!.target).toBe('enemy');
      // 룰렛도 추가됨
      const rouletteToken = result.appliedTokens!.find(t => t.id === 'roulette');
      expect(rouletteToken).toBeDefined();
    });

    it('가시 토큰이 있으면 반사 피해 발생', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { thorns: 3 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processDamageTakenTokenEffects(state, 'player', 10);

      const thornsToken = result.appliedTokens!.find(t => t.id === 'thorns_damage');
      expect(thornsToken).toBeDefined();
      expect(thornsToken!.stacks).toBe(3);
      expect(thornsToken!.target).toBe('enemy');
    });

    it('회피 성공 시 다른 효과가 적용되지 않는다', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { evasion: 1, vulnerable: 1, counter: 1 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processDamageTakenTokenEffects(state, 'player', 10);

      expect(result.evaded).toBe(true);
      expect(result.modifiedValue).toBe(0);
      // vulnerable과 counter는 소모되지 않음
      expect(result.consumedTokens).not.toContain('vulnerable');
      expect(result.consumedTokens).not.toContain('counter');
    });
  });

  describe('processTurnStartTokenEffects', () => {
    it('화상 스택이 있으면 스택 x 3 피해', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { burn: 2 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processTurnStartTokenEffects(state, 'player');

      expect(result.selfDamage).toBe(6); // 2 * 3
    });

    it('재생 스택이 있으면 스택만큼 회복', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { regeneration: 3 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processTurnStartTokenEffects(state, 'player');

      expect(result.heal).toBe(3);
    });

    it('화상과 재생이 동시에 있으면 둘 다 적용', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { burn: 2, regeneration: 5 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processTurnStartTokenEffects(state, 'player');

      expect(result.selfDamage).toBe(6);
      expect(result.heal).toBe(5);
    });

    it('토큰이 없으면 효과 없음', () => {
      const state = createMockState();

      const result = processTurnStartTokenEffects(state, 'player');

      expect(result.selfDamage).toBeUndefined();
      expect(result.heal).toBeUndefined();
    });

    it('적에게도 적용된다', () => {
      const state = createMockState({
        enemy: {
          hp: 100,
          maxHp: 100,
          block: 0,
          tokens: { burn: 3 },
          intent: null,
        },
      } as unknown as Partial<GameBattleState>);

      const result = processTurnStartTokenEffects(state, 'enemy');

      expect(result.selfDamage).toBe(9); // 3 * 3
    });
  });

  describe('processTurnEndTokenEffects', () => {
    it('독 스택이 있으면 스택만큼 피해', () => {
      const state = createMockState({
        player: {
          hp: 80,
          maxHp: 100,
          block: 0,
          tokens: { poison: 4 },
          hand: [],
          deck: [],
          discard: [],
        },
      } as unknown as Partial<GameBattleState>);

      const result = processTurnEndTokenEffects(state, 'player');

      expect(result.selfDamage).toBe(4);
      expect(result.consumedTokens).toContain('poison_1');
    });

    it('독이 없으면 효과 없음', () => {
      const state = createMockState();

      const result = processTurnEndTokenEffects(state, 'player');

      expect(result.selfDamage).toBeUndefined();
    });

    it('적에게도 적용된다', () => {
      const state = createMockState({
        enemy: {
          hp: 100,
          maxHp: 100,
          block: 0,
          tokens: { poison: 5 },
          intent: null,
        },
      } as unknown as Partial<GameBattleState>);

      const result = processTurnEndTokenEffects(state, 'enemy');

      expect(result.selfDamage).toBe(5);
    });
  });

  describe('consumeTokens', () => {
    it('일반 토큰을 1스택 제거한다', () => {
      const tokens: TokenState = { offense: 1, strength: 3 };

      const result = consumeTokens(tokens, ['offense']);

      expect(result.offense).toBeUndefined();
      expect(result.strength).toBe(3);
    });

    it('_1 접미사가 있으면 1스택만 제거한다', () => {
      const tokens: TokenState = { poison: 3 };

      const result = consumeTokens(tokens, ['poison_1']);

      expect(result.poison).toBe(2);
    });

    it('여러 토큰을 동시에 제거한다', () => {
      const tokens: TokenState = { offense: 1, guard: 1, strength: 2 };

      const result = consumeTokens(tokens, ['offense', 'guard']);

      expect(result.offense).toBeUndefined();
      expect(result.guard).toBeUndefined();
      expect(result.strength).toBe(2);
    });

    it('빈 리스트면 변경 없음', () => {
      const tokens: TokenState = { offense: 1 };

      const result = consumeTokens(tokens, []);

      expect(result.offense).toBe(1);
    });
  });

  describe('applyTokenEffects', () => {
    it('counter_damage는 적 HP를 감소시킨다', () => {
      const state = createMockState();

      applyTokenEffects(state, [{ id: 'counter_damage', stacks: 5, target: 'enemy' }]);

      expect(state.enemy.hp).toBe(95);
    });

    it('counterShot_damage는 적 HP를 감소시킨다', () => {
      const state = createMockState();

      applyTokenEffects(state, [{ id: 'counterShot_damage', stacks: 8, target: 'enemy' }]);

      expect(state.enemy.hp).toBe(92);
    });

    it('thorns_damage는 적 HP를 감소시킨다', () => {
      const state = createMockState();

      applyTokenEffects(state, [{ id: 'thorns_damage', stacks: 3, target: 'enemy' }]);

      expect(state.enemy.hp).toBe(97);
    });

    it('피해 토큰이 player 대상이면 player HP 감소', () => {
      const state = createMockState();

      applyTokenEffects(state, [{ id: 'counter_damage', stacks: 5, target: 'player' }]);

      expect(state.player.hp).toBe(75);
    });

    it('일반 토큰은 해당 대상에 추가된다', () => {
      const state = createMockState();

      applyTokenEffects(state, [{ id: 'burn', stacks: 2, target: 'enemy' }]);

      expect(state.enemy.tokens.burn).toBe(2);
    });

    it('여러 토큰을 동시에 적용한다', () => {
      const state = createMockState();

      applyTokenEffects(state, [
        { id: 'burn', stacks: 2, target: 'enemy' },
        { id: 'strength', stacks: 1, target: 'player' },
        { id: 'counter_damage', stacks: 5, target: 'enemy' },
      ]);

      expect(state.enemy.tokens.burn).toBe(2);
      expect(state.player.tokens.strength).toBe(1);
      expect(state.enemy.hp).toBe(95);
    });
  });
});
