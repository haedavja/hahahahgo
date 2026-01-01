/**
 * @file token-system.test.ts
 * @description 시뮬레이터 토큰 시스템 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  addToken,
  removeToken,
  clearToken,
  hasToken,
  getTokenStacks,
  clearTokensByType,
  clearTokensByCategory,
  calculateAttackModifiers,
  calculateDefenseModifiers,
  calculateDamageTakenModifiers,
  consumeAttackTokens,
  consumeDefenseTokens,
  consumeDamageTakenTokens,
  processTurnEnd,
  addTokenWithLimit,
  resolveTokenConflict,
  convertToken,
  processCounter,
  processCounterShot,
  processBurn,
  checkImmunity,
  checkRevive,
  calculateEnergyModifier,
  calculateSpeedModifier,
  summarizeTokens,
  exhaustCard,
  recoverExhausted,
  resetExhaustState,
  type TokenState,
  type ExhaustState,
} from '../core/token-system';

// Mock dependencies
vi.mock('../data/game-data-sync', () => ({
  syncAllTokens: vi.fn(() => ({
    offense: { id: 'offense', name: '공세', type: 'usage', category: 'positive' },
    attack: { id: 'attack', name: '공격', type: 'turn', category: 'positive' },
    strength: { id: 'strength', name: '힘', type: 'permanent', category: 'neutral' },
    dull: { id: 'dull', name: '무딤', type: 'usage', category: 'negative' },
    vulnerable: { id: 'vulnerable', name: '허약', type: 'turn', category: 'negative' },
    burn: { id: 'burn', name: '화상', type: 'turn', category: 'negative' },
    guard: { id: 'guard', name: '수세', type: 'usage', category: 'positive' },
    defense: { id: 'defense', name: '방어', type: 'turn', category: 'positive' },
    blur: { id: 'blur', name: '흐릿함', type: 'usage', category: 'positive' },
    counter: { id: 'counter', name: '반격', type: 'usage', category: 'positive' },
    counterShot: { id: 'counterShot', name: '대응사격', type: 'usage', category: 'positive' },
    immunity: { id: 'immunity', name: '면역', type: 'usage', category: 'positive' },
    revive: { id: 'revive', name: '부활', type: 'usage', category: 'positive' },
    warmedUp: { id: 'warmedUp', name: '몸풀기', type: 'turn', category: 'positive' },
    dizzy: { id: 'dizzy', name: '현기증', type: 'turn', category: 'negative' },
    agility: { id: 'agility', name: '민첩', type: 'permanent', category: 'neutral' },
    gun_jam: { id: 'gun_jam', name: '탄걸림', type: 'permanent', category: 'negative' },
    roulette: { id: 'roulette', name: '룰렛', type: 'permanent', category: 'neutral' },
    jam_immunity: { id: 'jam_immunity', name: '무제한 탄창', type: 'turn', category: 'positive' },
  })),
}));

vi.mock('../core/logger', () => ({
  getLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('token-system', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 토큰 조작', () => {
    describe('addToken', () => {
      it('새 토큰을 추가한다', () => {
        const tokens: TokenState = {};
        const result = addToken(tokens, 'strength', 1);
        expect(result.strength).toBe(1);
      });

      it('기존 토큰에 스택을 추가한다', () => {
        const tokens: TokenState = { strength: 2 };
        const result = addToken(tokens, 'strength', 3);
        expect(result.strength).toBe(5);
      });

      it('기본값 1로 추가한다', () => {
        const tokens: TokenState = {};
        const result = addToken(tokens, 'strength');
        expect(result.strength).toBe(1);
      });
    });

    describe('removeToken', () => {
      it('토큰 스택을 감소시킨다', () => {
        const tokens: TokenState = { strength: 3 };
        const result = removeToken(tokens, 'strength', 1);
        expect(result.strength).toBe(2);
      });

      it('스택이 0이 되면 토큰을 삭제한다', () => {
        const tokens: TokenState = { strength: 1 };
        const result = removeToken(tokens, 'strength', 1);
        expect(result.strength).toBeUndefined();
      });

      it('스택이 음수가 되지 않는다', () => {
        const tokens: TokenState = { strength: 1 };
        const result = removeToken(tokens, 'strength', 5);
        expect(result.strength).toBeUndefined();
      });

      it('없는 토큰은 무시한다', () => {
        const tokens: TokenState = {};
        const result = removeToken(tokens, 'strength', 1);
        expect(result).toEqual({});
      });
    });

    describe('clearToken', () => {
      it('토큰을 완전히 제거한다', () => {
        const tokens: TokenState = { strength: 5, agility: 2 };
        const result = clearToken(tokens, 'strength');
        expect(result.strength).toBeUndefined();
        expect(result.agility).toBe(2);
      });
    });

    describe('hasToken', () => {
      it('토큰이 있으면 true를 반환한다', () => {
        const tokens: TokenState = { strength: 1 };
        expect(hasToken(tokens, 'strength')).toBe(true);
      });

      it('토큰이 없으면 false를 반환한다', () => {
        const tokens: TokenState = {};
        expect(hasToken(tokens, 'strength')).toBe(false);
      });

      it('스택이 0이면 false를 반환한다', () => {
        const tokens: TokenState = { strength: 0 };
        expect(hasToken(tokens, 'strength')).toBe(false);
      });
    });

    describe('getTokenStacks', () => {
      it('토큰 스택 수를 반환한다', () => {
        const tokens: TokenState = { strength: 5 };
        expect(getTokenStacks(tokens, 'strength')).toBe(5);
      });

      it('없는 토큰은 0을 반환한다', () => {
        const tokens: TokenState = {};
        expect(getTokenStacks(tokens, 'strength')).toBe(0);
      });
    });
  });

  describe('타입/카테고리별 제거', () => {
    describe('clearTokensByType', () => {
      it('특정 타입의 토큰을 제거한다', () => {
        const tokens: TokenState = {
          offense: 1,    // usage
          attack: 1,     // turn
          strength: 1,   // permanent
        };
        const result = clearTokensByType(tokens, 'usage');
        expect(result.offense).toBeUndefined();
        expect(result.attack).toBe(1);
        expect(result.strength).toBe(1);
      });
    });

    describe('clearTokensByCategory', () => {
      it('특정 카테고리의 토큰을 제거한다', () => {
        const tokens: TokenState = {
          offense: 1,      // positive
          vulnerable: 1,   // negative
          strength: 1,     // neutral
        };
        const result = clearTokensByCategory(tokens, 'negative');
        expect(result.offense).toBe(1);
        expect(result.vulnerable).toBeUndefined();
        expect(result.strength).toBe(1);
      });
    });
  });

  describe('공격 수정자 계산', () => {
    it('offense 토큰이 공격력을 50% 증가시킨다', () => {
      const tokens: TokenState = { offense: 1 };
      const mods = calculateAttackModifiers(tokens);
      expect(mods.attackMultiplier).toBe(1.5);
    });

    it('strength 토큰이 피해 보너스를 제공한다', () => {
      const tokens: TokenState = { strength: 3 };
      const mods = calculateAttackModifiers(tokens);
      expect(mods.damageBonus).toBe(3);
    });

    it('dull 토큰이 공격력을 50% 감소시킨다', () => {
      const tokens: TokenState = { dull: 1 };
      const mods = calculateAttackModifiers(tokens);
      expect(mods.attackMultiplier).toBe(0.5);
    });

    it('여러 토큰이 누적된다', () => {
      const tokens: TokenState = { offense: 1, strength: 2 };
      const mods = calculateAttackModifiers(tokens);
      expect(mods.attackMultiplier).toBe(1.5);
      expect(mods.damageBonus).toBe(2);
    });
  });

  describe('방어 수정자 계산', () => {
    it('guard 토큰이 방어력을 50% 증가시킨다', () => {
      const tokens: TokenState = { guard: 1 };
      const mods = calculateDefenseModifiers(tokens);
      expect(mods.defenseMultiplier).toBe(1.5);
    });

    it('blur 토큰이 회피 확률을 제공한다', () => {
      const tokens: TokenState = { blur: 1 };
      const mods = calculateDefenseModifiers(tokens);
      expect(mods.dodgeChance).toBe(0.5);
    });

    it('strength 토큰이 방어 보너스를 제공한다', () => {
      const tokens: TokenState = { strength: 2 };
      const mods = calculateDefenseModifiers(tokens);
      expect(mods.defenseBonus).toBe(2);
    });
  });

  describe('받는 피해 수정자 계산', () => {
    it('vulnerable 토큰이 받는 피해를 50% 증가시킨다', () => {
      const tokens: TokenState = { vulnerable: 1 };
      const mods = calculateDamageTakenModifiers(tokens);
      expect(mods.damageMultiplier).toBe(1.5);
    });
  });

  describe('토큰 소모', () => {
    it('consumeAttackTokens가 공격 관련 usage 토큰을 소모한다', () => {
      const tokens: TokenState = { offense: 1, dull: 1, strength: 2 };
      const result = consumeAttackTokens(tokens);
      expect(result.offense).toBeUndefined();
      expect(result.dull).toBeUndefined();
      expect(result.strength).toBe(2); // permanent는 유지
    });

    it('consumeDefenseTokens가 방어 관련 usage 토큰을 소모한다', () => {
      const tokens: TokenState = { guard: 1, defense: 1 };
      const result = consumeDefenseTokens(tokens);
      expect(result.guard).toBeUndefined();
      expect(result.defense).toBe(1); // turn은 유지
    });

    it('consumeDamageTakenTokens가 피해 관련 usage 토큰을 소모한다', () => {
      const tokens: TokenState = { blur: 1, vulnerable: 1 };
      const result = consumeDamageTakenTokens(tokens);
      expect(result.blur).toBeUndefined();
      expect(result.vulnerable).toBe(1); // turn은 유지
    });
  });

  describe('턴 종료 처리', () => {
    it('processTurnEnd가 turn 타입 토큰을 제거한다', () => {
      const tokens: TokenState = {
        offense: 1,    // usage
        attack: 1,     // turn
        strength: 1,   // permanent
      };
      const result = processTurnEnd(tokens);
      expect(result.offense).toBe(1);
      expect(result.attack).toBeUndefined();
      expect(result.strength).toBe(1);
    });
  });

  describe('토큰 충돌 해소', () => {
    it('상충 토큰이 서로 상쇄된다', () => {
      const tokens: TokenState = { dull: 2 };
      const result = resolveTokenConflict(tokens, 'offense', 3);
      expect(result.dull).toBeUndefined();
      expect(result.offense).toBe(1);
    });

    it('동일한 스택은 둘 다 제거된다', () => {
      const tokens: TokenState = { dull: 2 };
      const result = resolveTokenConflict(tokens, 'offense', 2);
      expect(result.dull).toBeUndefined();
      expect(result.offense).toBeUndefined();
    });

    it('새 토큰이 적으면 기존 토큰 스택만 감소한다', () => {
      const tokens: TokenState = { dull: 3 };
      const result = resolveTokenConflict(tokens, 'offense', 1);
      expect(result.dull).toBe(2);
      expect(result.offense).toBeUndefined();
    });
  });

  describe('스택 상한', () => {
    it('addTokenWithLimit가 상한을 적용한다', () => {
      const tokens: TokenState = { agility: 8 };
      const result = addTokenWithLimit(tokens, 'agility', 5);
      expect(result.agility).toBe(10); // 상한 10
    });
  });

  describe('토큰 변환', () => {
    it('convertToken이 토큰을 변환한다', () => {
      const tokens: TokenState = { offense: 4 };
      const result = convertToken(tokens, 'offense', 'attack', 0.5);
      expect(result.offense).toBeUndefined();
      expect(result.attack).toBe(2);
    });
  });

  describe('특수 토큰 처리', () => {
    describe('processCounter', () => {
      it('반격 토큰이 있으면 피해를 반환한다', () => {
        const attackerTokens: TokenState = {};
        const defenderTokens: TokenState = { counter: 1 };
        const result = processCounter(attackerTokens, defenderTokens, 5);
        expect(result.damage).toBe(5);
        expect(result.newDefenderTokens.counter).toBeUndefined();
      });

      it('힘 토큰이 반격 피해를 증가시킨다', () => {
        const attackerTokens: TokenState = {};
        const defenderTokens: TokenState = { counter: 1, strength: 3 };
        const result = processCounter(attackerTokens, defenderTokens, 5);
        expect(result.damage).toBe(8); // 5 + 3
      });

      it('반격 토큰이 없으면 0 피해', () => {
        const attackerTokens: TokenState = {};
        const defenderTokens: TokenState = {};
        const result = processCounter(attackerTokens, defenderTokens, 5);
        expect(result.damage).toBe(0);
      });
    });

    describe('processCounterShot', () => {
      it('대응사격 토큰이 있으면 피해와 룰렛 증가', () => {
        const attackerTokens: TokenState = {};
        const defenderTokens: TokenState = { counterShot: 1 };
        const result = processCounterShot(attackerTokens, defenderTokens, 8);
        expect(result.damage).toBe(8);
        expect(result.newDefenderTokens.counterShot).toBeUndefined();
        expect(result.newDefenderTokens.roulette).toBe(1);
        expect(result.triggerRoulette).toBe(true);
      });
    });

    describe('processBurn', () => {
      it('화상 토큰이 있으면 피해를 반환한다', () => {
        const tokens: TokenState = { burn: 2 };
        const result = processBurn(tokens);
        expect(result.damage).toBe(6); // 2 * 3
      });

      it('화상 토큰이 없으면 0 피해', () => {
        const tokens: TokenState = {};
        const result = processBurn(tokens);
        expect(result.damage).toBe(0);
      });
    });

    describe('checkImmunity', () => {
      it('면역 토큰이 부정 토큰을 차단한다', () => {
        const tokens: TokenState = { immunity: 1 };
        const result = checkImmunity(tokens, 'vulnerable');
        expect(result.blocked).toBe(true);
        expect(result.newTokens.immunity).toBeUndefined();
      });

      it('면역 토큰이 없으면 차단하지 않는다', () => {
        const tokens: TokenState = {};
        const result = checkImmunity(tokens, 'vulnerable');
        expect(result.blocked).toBe(false);
      });
    });

    describe('checkRevive', () => {
      it('부활 토큰이 있으면 체력 50%로 부활한다', () => {
        const tokens: TokenState = { revive: 1 };
        const result = checkRevive(tokens, 100);
        expect(result.revived).toBe(true);
        expect(result.newHp).toBe(50);
        expect(result.newTokens.revive).toBeUndefined();
      });

      it('부활 토큰이 없으면 부활하지 않는다', () => {
        const tokens: TokenState = {};
        const result = checkRevive(tokens, 100);
        expect(result.revived).toBe(false);
        expect(result.newHp).toBe(0);
      });
    });
  });

  describe('에너지/속도 수정자', () => {
    it('calculateEnergyModifier가 행동력 수정자를 계산한다', () => {
      const tokens: TokenState = { warmedUp: 1 };
      expect(calculateEnergyModifier(tokens)).toBe(2);
    });

    it('현기증이 행동력을 감소시킨다', () => {
      const tokens: TokenState = { dizzy: 1 };
      expect(calculateEnergyModifier(tokens)).toBe(-2);
    });

    it('calculateSpeedModifier가 속도 수정자를 계산한다', () => {
      const tokens: TokenState = { agility: 3 };
      expect(calculateSpeedModifier(tokens)).toBe(-3);
    });
  });

  describe('토큰 요약', () => {
    it('summarizeTokens가 토큰 상태를 요약한다', () => {
      const tokens: TokenState = { offense: 1, vulnerable: 2, strength: 3 };
      const summary = summarizeTokens(tokens);
      expect(summary.positive.length).toBeGreaterThan(0);
      expect(summary.negative.length).toBeGreaterThan(0);
      expect(summary.neutral.length).toBeGreaterThan(0);
      expect(summary.total).toBe(6);
    });
  });

  describe('Exhaust 시스템', () => {
    describe('exhaustCard', () => {
      it('카드를 덱에서 소진시킨다', () => {
        const deck = ['card1', 'card2', 'card3'];
        const exhaustState: ExhaustState = {
          exhaustedCards: new Set(),
          exhaustPile: [],
        };
        const result = exhaustCard(deck, 'card2', exhaustState);
        expect(result.newDeck).toEqual(['card1', 'card3']);
        expect(result.exhausted).toBe(true);
        expect(exhaustState.exhaustedCards.has('card2')).toBe(true);
        expect(exhaustState.exhaustPile).toContain('card2');
      });

      it('없는 카드는 소진되지 않는다', () => {
        const deck = ['card1', 'card2'];
        const exhaustState: ExhaustState = {
          exhaustedCards: new Set(),
          exhaustPile: [],
        };
        const result = exhaustCard(deck, 'card3', exhaustState);
        expect(result.newDeck).toEqual(['card1', 'card2']);
        expect(result.exhausted).toBe(false);
      });
    });

    describe('recoverExhausted', () => {
      it('소진된 카드를 회수한다', () => {
        const exhaustState: ExhaustState = {
          exhaustedCards: new Set(['card1', 'card2']),
          exhaustPile: ['card1', 'card2'],
        };
        const recovered = recoverExhausted(exhaustState, 1);
        expect(recovered).toEqual(['card2']);
        expect(exhaustState.exhaustPile).toEqual(['card1']);
        expect(exhaustState.exhaustedCards.has('card2')).toBe(false);
      });
    });

    describe('resetExhaustState', () => {
      it('소진 상태를 초기화한다', () => {
        const state = resetExhaustState();
        expect(state.exhaustedCards.size).toBe(0);
        expect(state.exhaustPile).toEqual([]);
      });
    });
  });
});
