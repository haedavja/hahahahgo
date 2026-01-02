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

// ==================== 트레이트 시스템 테스트 ====================

describe('TraitSystem', () => {
  interface TraitTestState {
    tokens: Record<string, number>;
    hp: number;
    maxHp: number;
  }

  function calculateTraitBonus(
    traits: string[],
    attacker: TraitTestState,
    defender: TraitTestState
  ): { damageMultiplier: number; effects: string[] } {
    let damageMultiplier = 1;
    const effects: string[] = [];

    for (const trait of traits) {
      switch (trait) {
        case 'finisher':
          if (attacker.tokens['followup_ready']) {
            damageMultiplier *= 2.0;
            effects.push('마무리 발동');
            attacker.tokens['followup_ready'] = 0;
          }
          break;
        case 'crush':
          const hpLostPercent = 1 - (defender.hp / defender.maxHp);
          const crushBonus = 1 + (hpLostPercent * 0.5);
          damageMultiplier *= crushBonus;
          if (crushBonus > 1.1) effects.push('분쇄');
          break;
        case 'cross':
          if (attacker.tokens['cross_defense'] || attacker.tokens['cross_skill']) {
            damageMultiplier *= 1.5;
            effects.push('십자');
          }
          break;
      }
    }

    return { damageMultiplier, effects };
  }

  function applyTraitEffects(traits: string[], state: TraitTestState): void {
    for (const trait of traits) {
      switch (trait) {
        case 'followup':
          state.tokens['followup_ready'] = (state.tokens['followup_ready'] || 0) + 1;
          break;
        case 'chain':
          state.tokens['offensive'] = (state.tokens['offensive'] || 0) + 1;
          break;
        case 'training':
          state.tokens['strength'] = (state.tokens['strength'] || 0) + 1;
          break;
      }
    }
  }

  describe('calculateTraitBonus', () => {
    it('finisher는 followup_ready 토큰이 있을 때 2배 피해', () => {
      const attacker: TraitTestState = { tokens: { followup_ready: 1 }, hp: 100, maxHp: 100 };
      const defender: TraitTestState = { tokens: {}, hp: 100, maxHp: 100 };

      const result = calculateTraitBonus(['finisher'], attacker, defender);
      expect(result.damageMultiplier).toBe(2.0);
      expect(result.effects).toContain('마무리 발동');
      expect(attacker.tokens['followup_ready']).toBe(0);
    });

    it('finisher는 followup_ready 없이 보너스 없음', () => {
      const attacker: TraitTestState = { tokens: {}, hp: 100, maxHp: 100 };
      const defender: TraitTestState = { tokens: {}, hp: 100, maxHp: 100 };

      const result = calculateTraitBonus(['finisher'], attacker, defender);
      expect(result.damageMultiplier).toBe(1.0);
    });

    it('crush는 적 체력이 낮을수록 피해 증가', () => {
      const attacker: TraitTestState = { tokens: {}, hp: 100, maxHp: 100 };
      const defender: TraitTestState = { tokens: {}, hp: 50, maxHp: 100 }; // 50% HP

      const result = calculateTraitBonus(['crush'], attacker, defender);
      expect(result.damageMultiplier).toBe(1.25); // 1 + 0.5 * 0.5
    });

    it('cross는 다른 타입 카드 후 1.5배 피해', () => {
      const attacker: TraitTestState = { tokens: { cross_defense: 1 }, hp: 100, maxHp: 100 };
      const defender: TraitTestState = { tokens: {}, hp: 100, maxHp: 100 };

      const result = calculateTraitBonus(['cross'], attacker, defender);
      expect(result.damageMultiplier).toBe(1.5);
      expect(result.effects).toContain('십자');
    });
  });

  describe('applyTraitEffects', () => {
    it('followup은 followup_ready 토큰 부여', () => {
      const state: TraitTestState = { tokens: {}, hp: 100, maxHp: 100 };
      applyTraitEffects(['followup'], state);
      expect(state.tokens['followup_ready']).toBe(1);
    });

    it('chain은 offensive 토큰 부여', () => {
      const state: TraitTestState = { tokens: {}, hp: 100, maxHp: 100 };
      applyTraitEffects(['chain'], state);
      expect(state.tokens['offensive']).toBe(1);
    });

    it('training은 strength 토큰 부여', () => {
      const state: TraitTestState = { tokens: {}, hp: 100, maxHp: 100 };
      applyTraitEffects(['training'], state);
      expect(state.tokens['strength']).toBe(1);
    });
  });
});

// ==================== 설정 시스템 테스트 ====================

describe('ConfigSystem', () => {
  interface SimConfig {
    battle: { maxTurns: number; critChance: number };
    simulation: { defaultBattleCount: number };
    cache: { enabled: boolean; maxSize: number };
  }

  const DEFAULT_CONFIG: SimConfig = {
    battle: { maxTurns: 30, critChance: 0.05 },
    simulation: { defaultBattleCount: 1000 },
    cache: { enabled: true, maxSize: 1000 },
  };

  function mergeConfig(base: SimConfig, overrides: Partial<SimConfig>): SimConfig {
    return {
      battle: { ...base.battle, ...overrides.battle },
      simulation: { ...base.simulation, ...overrides.simulation },
      cache: { ...base.cache, ...overrides.cache },
    };
  }

  function validateConfig(config: SimConfig): string[] {
    const errors: string[] = [];
    if (config.battle.maxTurns < 1) errors.push('maxTurns must be at least 1');
    if (config.battle.critChance < 0 || config.battle.critChance > 1) {
      errors.push('critChance must be between 0 and 1');
    }
    if (config.cache.maxSize < 0) errors.push('maxSize cannot be negative');
    return errors;
  }

  it('기본 설정이 유효해야 함', () => {
    const errors = validateConfig(DEFAULT_CONFIG);
    expect(errors).toHaveLength(0);
  });

  it('설정 병합이 올바르게 동작해야 함', () => {
    const merged = mergeConfig(DEFAULT_CONFIG, {
      battle: { maxTurns: 50, critChance: 0.05 },
    });
    expect(merged.battle.maxTurns).toBe(50);
    expect(merged.simulation.defaultBattleCount).toBe(1000); // 기본값 유지
  });

  it('잘못된 설정을 검출해야 함', () => {
    const invalid: SimConfig = {
      battle: { maxTurns: 0, critChance: 1.5 },
      simulation: { defaultBattleCount: 1000 },
      cache: { enabled: true, maxSize: -100 },
    };
    const errors = validateConfig(invalid);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors).toContain('maxTurns must be at least 1');
    expect(errors).toContain('critChance must be between 0 and 1');
    expect(errors).toContain('maxSize cannot be negative');
  });
});

// ==================== 데이터 검증 테스트 ====================

describe('DataValidation', () => {
  interface CardDef {
    id: string;
    name: string;
    type: 'attack' | 'defense' | 'skill';
    cost: number;
    damage?: number;
    block?: number;
  }

  function validateCard(card: Partial<CardDef>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!card.id) errors.push('id is required');
    else if (!/^[a-z][a-z0-9_]*$/.test(card.id)) errors.push('id format invalid');

    if (!card.name) errors.push('name is required');
    else if (card.name.length > 50) errors.push('name too long');

    if (!card.type) errors.push('type is required');
    else if (!['attack', 'defense', 'skill'].includes(card.type)) {
      errors.push('invalid type');
    }

    if (card.cost === undefined) errors.push('cost is required');
    else if (card.cost < 0 || card.cost > 10) errors.push('cost out of range');

    if (card.damage !== undefined && (card.damage < 0 || card.damage > 999)) {
      errors.push('damage out of range');
    }

    return { valid: errors.length === 0, errors };
  }

  it('유효한 카드가 통과해야 함', () => {
    const result = validateCard({
      id: 'quick_slash',
      name: '빠른 베기',
      type: 'attack',
      cost: 1,
      damage: 6,
    });
    expect(result.valid).toBe(true);
  });

  it('필수 필드 누락 시 에러', () => {
    const result = validateCard({ id: 'test' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('name is required');
    expect(result.errors).toContain('type is required');
    expect(result.errors).toContain('cost is required');
  });

  it('잘못된 ID 형식 검출', () => {
    const result = validateCard({
      id: 'Invalid-ID',
      name: 'Test',
      type: 'attack',
      cost: 1,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('id format invalid');
  });

  it('범위 초과 값 검출', () => {
    const result = validateCard({
      id: 'test_card',
      name: 'Test',
      type: 'attack',
      cost: 15,
      damage: 1000,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('cost out of range');
    expect(result.errors).toContain('damage out of range');
  });
});
