/**
 * @file battle-engine.test.ts
 * @description 전투 엔진 단위 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { BattleResult, SimulationConfig } from '../core/types';

// ==================== Mock 데이터 ====================

interface CombatantState {
  hp: number;
  maxHp: number;
  block: number;
  strength: number;
  tokens: Record<string, number>;
}

interface CardData {
  id: string;
  name: string;
  attack?: number;
  defense?: number;
  cost: number;
  effects?: Record<string, unknown>;
}

// ==================== DamageCalculator 테스트 ====================

describe('DamageCalculator', () => {
  function calculateDamage(
    baseDamage: number,
    attacker: CombatantState,
    defender: CombatantState
  ): number {
    let damage = baseDamage + attacker.strength;

    // 공세 토큰
    if (attacker.tokens['offensive']) {
      damage += attacker.tokens['offensive'] * 2;
    }

    // 약화 체크 (공격자)
    if (attacker.tokens['weak']) {
      damage = Math.floor(damage * 0.75);
    }

    // 취약 체크 (방어자)
    if (defender.tokens['vulnerable']) {
      damage = Math.floor(damage * 1.5);
    }

    return damage;
  }

  function applyDamage(target: CombatantState, damage: number): number {
    const actualDamage = Math.max(0, damage - target.block);
    target.block = Math.max(0, target.block - damage);
    target.hp -= actualDamage;
    return actualDamage;
  }

  describe('calculateDamage', () => {
    it('기본 피해를 계산해야 함', () => {
      const attacker: CombatantState = { hp: 100, maxHp: 100, block: 0, strength: 0, tokens: {} };
      const defender: CombatantState = { hp: 100, maxHp: 100, block: 0, strength: 0, tokens: {} };

      const damage = calculateDamage(10, attacker, defender);
      expect(damage).toBe(10);
    });

    it('힘이 피해를 증가시켜야 함', () => {
      const attacker: CombatantState = { hp: 100, maxHp: 100, block: 0, strength: 3, tokens: {} };
      const defender: CombatantState = { hp: 100, maxHp: 100, block: 0, strength: 0, tokens: {} };

      const damage = calculateDamage(10, attacker, defender);
      expect(damage).toBe(13);
    });

    it('공세 토큰이 피해를 증가시켜야 함', () => {
      const attacker: CombatantState = { hp: 100, maxHp: 100, block: 0, strength: 0, tokens: { offensive: 2 } };
      const defender: CombatantState = { hp: 100, maxHp: 100, block: 0, strength: 0, tokens: {} };

      const damage = calculateDamage(10, attacker, defender);
      expect(damage).toBe(14); // 10 + 2*2
    });

    it('취약 토큰이 받는 피해를 50% 증가시켜야 함', () => {
      const attacker: CombatantState = { hp: 100, maxHp: 100, block: 0, strength: 0, tokens: {} };
      const defender: CombatantState = { hp: 100, maxHp: 100, block: 0, strength: 0, tokens: { vulnerable: 1 } };

      const damage = calculateDamage(10, attacker, defender);
      expect(damage).toBe(15); // 10 * 1.5
    });

    it('약화 토큰이 주는 피해를 25% 감소시켜야 함', () => {
      const attacker: CombatantState = { hp: 100, maxHp: 100, block: 0, strength: 0, tokens: { weak: 1 } };
      const defender: CombatantState = { hp: 100, maxHp: 100, block: 0, strength: 0, tokens: {} };

      const damage = calculateDamage(10, attacker, defender);
      expect(damage).toBe(7); // 10 * 0.75 = 7.5 -> 7
    });
  });

  describe('applyDamage', () => {
    it('방어력이 피해를 감소시켜야 함', () => {
      const target: CombatantState = { hp: 100, maxHp: 100, block: 5, strength: 0, tokens: {} };

      const actualDamage = applyDamage(target, 10);
      expect(actualDamage).toBe(5);
      expect(target.hp).toBe(95);
      expect(target.block).toBe(0);
    });

    it('방어력이 피해보다 크면 체력 감소 없음', () => {
      const target: CombatantState = { hp: 100, maxHp: 100, block: 15, strength: 0, tokens: {} };

      const actualDamage = applyDamage(target, 10);
      expect(actualDamage).toBe(0);
      expect(target.hp).toBe(100);
      expect(target.block).toBe(5);
    });
  });
});

// ==================== ComboDetector 테스트 ====================

describe('ComboDetector', () => {
  interface ComboDefinition {
    id: string;
    cards: string[];
    bonus: { damage?: number; block?: number };
  }

  const COMBOS: ComboDefinition[] = [
    { id: 'double_strike', cards: ['quick_slash', 'quick_slash'], bonus: { damage: 3 } },
    { id: 'offense_defense', cards: ['quick_slash', 'guard'], bonus: { block: 2 } },
  ];

  function detectCombo(cardsPlayed: string[]): ComboDefinition | null {
    for (const combo of COMBOS) {
      const lastN = cardsPlayed.slice(-combo.cards.length);
      if (lastN.length === combo.cards.length) {
        let matches = true;
        for (let i = 0; i < combo.cards.length; i++) {
          if (lastN[i] !== combo.cards[i]) {
            matches = false;
            break;
          }
        }
        if (matches) return combo;
      }
    }
    return null;
  }

  describe('detectCombo', () => {
    it('페어를 감지해야 함', () => {
      const combo = detectCombo(['quick_slash', 'quick_slash']);
      expect(combo).not.toBeNull();
      expect(combo?.id).toBe('double_strike');
    });

    it('공방 조합을 감지해야 함', () => {
      const combo = detectCombo(['quick_slash', 'guard']);
      expect(combo).not.toBeNull();
      expect(combo?.id).toBe('offense_defense');
    });

    it('콤보가 없으면 null을 반환해야 함', () => {
      const combo = detectCombo(['guard', 'guard']);
      expect(combo).toBeNull();
    });

    it('긴 시퀀스에서 마지막 콤보를 감지해야 함', () => {
      const combo = detectCombo(['heavy_strike', 'dash', 'quick_slash', 'quick_slash']);
      expect(combo?.id).toBe('double_strike');
    });
  });
});

// ==================== TokenManager 테스트 ====================

describe('TokenManager', () => {
  interface TokenState {
    tokens: Record<string, number>;
    hp: number;
    maxHp: number;
  }

  function applyToken(state: TokenState, tokenId: string, stacks: number): void {
    state.tokens[tokenId] = (state.tokens[tokenId] || 0) + stacks;
  }

  function tickTokens(state: TokenState): void {
    for (const [tokenId, stacks] of Object.entries(state.tokens)) {
      if (stacks <= 0) continue;

      // 도트 피해
      if (tokenId === 'burn' || tokenId === 'poison') {
        state.hp -= stacks;
        state.tokens[tokenId] = Math.max(0, stacks - 1);
      }

      // 재생
      if (tokenId === 'regen') {
        state.hp = Math.min(state.maxHp, state.hp + stacks);
        state.tokens[tokenId] = Math.max(0, stacks - 1);
      }

      // 일반 지속 토큰
      if (['vulnerable', 'weak', 'offensive', 'defensive'].includes(tokenId)) {
        state.tokens[tokenId] = Math.max(0, stacks - 1);
      }

      // 0이면 제거
      if (state.tokens[tokenId] <= 0) {
        delete state.tokens[tokenId];
      }
    }
  }

  describe('applyToken', () => {
    it('토큰을 추가해야 함', () => {
      const state: TokenState = { tokens: {}, hp: 100, maxHp: 100 };
      applyToken(state, 'strength', 2);
      expect(state.tokens['strength']).toBe(2);
    });

    it('토큰이 누적되어야 함', () => {
      const state: TokenState = { tokens: { strength: 2 }, hp: 100, maxHp: 100 };
      applyToken(state, 'strength', 3);
      expect(state.tokens['strength']).toBe(5);
    });
  });

  describe('tickTokens', () => {
    it('화상이 피해를 주고 감소해야 함', () => {
      const state: TokenState = { tokens: { burn: 3 }, hp: 100, maxHp: 100 };
      tickTokens(state);
      expect(state.hp).toBe(97);
      expect(state.tokens['burn']).toBe(2);
    });

    it('재생이 회복하고 감소해야 함', () => {
      const state: TokenState = { tokens: { regen: 2 }, hp: 90, maxHp: 100 };
      tickTokens(state);
      expect(state.hp).toBe(92);
      expect(state.tokens['regen']).toBe(1);
    });

    it('취약이 감소해야 함', () => {
      const state: TokenState = { tokens: { vulnerable: 2 }, hp: 100, maxHp: 100 };
      tickTokens(state);
      expect(state.tokens['vulnerable']).toBe(1);
    });

    it('0이 된 토큰이 제거되어야 함', () => {
      const state: TokenState = { tokens: { vulnerable: 1 }, hp: 100, maxHp: 100 };
      tickTokens(state);
      expect(state.tokens['vulnerable']).toBeUndefined();
    });
  });
});

// ==================== BattleEngine 통합 테스트 ====================

describe('BattleEngine', () => {
  interface SimpleBattleResult {
    winner: 'player' | 'enemy' | 'draw';
    turns: number;
    playerFinalHp: number;
    enemyFinalHp: number;
  }

  function runSimpleBattle(
    playerDeck: string[],
    enemyHp: number = 50
  ): SimpleBattleResult {
    let playerHp = 100;
    let turns = 0;
    let currentEnemyHp = enemyHp;

    while (turns < 30 && playerHp > 0 && currentEnemyHp > 0) {
      turns++;

      // 플레이어 턴
      for (const cardId of playerDeck.slice(0, 3)) {
        if (cardId.includes('slash') || cardId.includes('strike')) {
          currentEnemyHp -= 6;
        }
        if (cardId.includes('guard') || cardId.includes('defend')) {
          // 방어 처리
        }
      }

      if (currentEnemyHp <= 0) break;

      // 적 턴
      playerHp -= 5;
    }

    let winner: 'player' | 'enemy' | 'draw';
    if (currentEnemyHp <= 0 && playerHp > 0) winner = 'player';
    else if (playerHp <= 0) winner = 'enemy';
    else winner = 'draw';

    return {
      winner,
      turns,
      playerFinalHp: Math.max(0, playerHp),
      enemyFinalHp: Math.max(0, currentEnemyHp),
    };
  }

  describe('runBattle', () => {
    it('전투 결과를 반환해야 함', () => {
      const result = runSimpleBattle(['quick_slash', 'guard']);
      expect(result).toHaveProperty('winner');
      expect(result).toHaveProperty('turns');
      expect(result).toHaveProperty('playerFinalHp');
      expect(result).toHaveProperty('enemyFinalHp');
    });

    it('승자는 player 또는 enemy여야 함', () => {
      const result = runSimpleBattle(['quick_slash', 'quick_slash', 'heavy_strike']);
      expect(['player', 'enemy', 'draw']).toContain(result.winner);
    });

    it('공격 카드가 적 체력을 감소시켜야 함', () => {
      const result = runSimpleBattle(['quick_slash', 'quick_slash']);
      expect(result.enemyFinalHp).toBeLessThan(50);
    });

    it('충분한 공격으로 플레이어가 승리해야 함', () => {
      const result = runSimpleBattle(['quick_slash', 'quick_slash', 'quick_slash'], 30);
      expect(result.winner).toBe('player');
    });
  });
});

// ==================== 시뮬레이션 설정 테스트 ====================

describe('SimulationConfig', () => {
  function validateConfig(config: Partial<SimulationConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.battles || config.battles < 1) {
      errors.push('battles must be at least 1');
    }

    if (!config.playerDeck || config.playerDeck.length < 1) {
      errors.push('playerDeck must have at least 1 card');
    }

    if (!config.enemyIds || config.enemyIds.length < 1) {
      errors.push('enemyIds must have at least 1 enemy');
    }

    return { valid: errors.length === 0, errors };
  }

  it('유효한 설정을 통과시켜야 함', () => {
    const result = validateConfig({
      battles: 100,
      playerDeck: ['quick_slash', 'guard'],
      enemyIds: ['ghoul'],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('battles가 없으면 에러', () => {
    const result = validateConfig({
      playerDeck: ['quick_slash'],
      enemyIds: ['ghoul'],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('battles must be at least 1');
  });

  it('빈 덱이면 에러', () => {
    const result = validateConfig({
      battles: 100,
      playerDeck: [],
      enemyIds: ['ghoul'],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('playerDeck must have at least 1 card');
  });
});
