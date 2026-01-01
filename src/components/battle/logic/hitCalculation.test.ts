/**
 * @file hitCalculation.test.ts
 * @description 단일 타격 계산 및 반격 처리 로직 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyCounter, applyRainDefense } from './hitCalculation';
import type { Combatant, BattleContext } from '../../../types';

// Mock battleData
vi.mock('../battleData', () => ({
  CARDS: [
    { id: 'shoot', name: '사격', damage: 8 },
    { id: 'slash', name: '베기', damage: 8 },
  ],
}));

// Mock other dependencies
vi.mock('../../../lib/tokenUtils', () => ({
  addToken: vi.fn((actor, tokenId, amount) => ({
    tokens: { ...actor.tokens, [tokenId]: amount },
  })),
  removeToken: vi.fn((actor) => ({
    tokens: actor.tokens,
  })),
  hasToken: vi.fn(() => false),
  getTokenStacks: vi.fn(() => 0),
}));

vi.mock('../utils/battleUtils', () => ({
  hasTrait: vi.fn(() => false),
}));

vi.mock('../../../lib/tokenEffects', () => ({
  applyTokenEffectsToCard: vi.fn((card, actor) => ({
    modifiedCard: card,
    consumedTokens: [],
  })),
  applyTokenEffectsOnDamage: vi.fn((dmg, defender) => ({
    finalDamage: dmg,
    dodged: false,
    reflected: 0,
    consumedTokens: [],
    logs: [],
  })),
  consumeTokens: vi.fn((actor) => ({
    tokens: actor.tokens,
    logs: [],
  })),
}));

vi.mock('../utils/cardSpecialEffects', () => ({
  processPreAttackSpecials: vi.fn(({ card, attacker, defender }) => ({
    modifiedCard: card,
    attacker,
    defender,
    events: [],
    logs: [],
  })),
  shouldIgnoreBlock: vi.fn(() => false),
  applyCriticalDamage: vi.fn((dmg) => dmg * 2),
}));

vi.mock('../../../lib/anomalyEffectUtils', () => ({
  getVulnerabilityMultiplier: vi.fn(() => 1),
}));

vi.mock('../../../lib/ethosEffects', () => ({
  shouldCounterShootOnEvade: vi.fn(() => ({ shouldShoot: false, shots: 0, logs: [] })),
  calculateSwordDamageBonus: vi.fn(() => ({ bonus: 0, logs: [] })),
  calculateAttackDamageBonus: vi.fn(() => ({ bonus: 0, logs: [] })),
  isSwordCard: vi.fn(() => false),
  isGunCard: vi.fn(() => false),
}));

vi.mock('../utils/criticalEffects', () => ({
  applyGunCritEthosEffects: vi.fn((card, isCrit, defender) => ({
    defender,
    events: [],
    logs: [],
  })),
  applyGunCritReloadEffect: vi.fn((card, isCrit, attacker) => ({
    attacker,
    events: [],
    logs: [],
  })),
}));

vi.mock('../../../lib/logosEffects', () => ({
  shouldShootOnBlock: vi.fn(() => false),
  getArmorPenetration: vi.fn(() => 0),
  getCombatTokens: vi.fn(() => ({ onAttack: '', onDefense: '' })),
  getMinFinesse: vi.fn(() => 0),
}));

const createMockCombatant = (overrides: Partial<Combatant> = {}): Combatant => ({
  hp: 100,
  maxHp: 100,
  block: 0,
  tokens: {},
  ...overrides,
} as Combatant);

describe('hitCalculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('applyCounter', () => {
    it('반격 피해를 적용한다', () => {
      const defender = createMockCombatant({ counter: 5 });
      const attacker = createMockCombatant({ hp: 50 });

      const result = applyCounter(defender, attacker, 'player');

      expect(result.attacker.hp).toBe(45);
      expect(result.damage).toBe(5);
    });

    it('counterDmg 매개변수가 counter보다 우선한다', () => {
      const defender = createMockCombatant({ counter: 5 });
      const attacker = createMockCombatant({ hp: 50 });

      const result = applyCounter(defender, attacker, 'player', 10);

      expect(result.attacker.hp).toBe(40);
      expect(result.damage).toBe(10);
    });

    it('체력이 0 미만으로 내려가지 않는다', () => {
      const defender = createMockCombatant({ counter: 100 });
      const attacker = createMockCombatant({ hp: 30 });

      const result = applyCounter(defender, attacker, 'player');

      expect(result.attacker.hp).toBe(0);
    });

    it('이벤트와 로그를 반환한다', () => {
      const defender = createMockCombatant({ counter: 5 });
      const attacker = createMockCombatant({ hp: 50 });

      const result = applyCounter(defender, attacker, 'player');

      expect(result.events.length).toBe(1);
      expect(result.events[0].actor).toBe('counter');
      expect(result.logs.length).toBe(1);
      expect(result.logs[0]).toContain('반격');
    });

    it('적 반격도 처리한다', () => {
      const defender = createMockCombatant({ counter: 5 });
      const attacker = createMockCombatant({ hp: 50 });
      const context: BattleContext = { enemyDisplayName: '고블린' };

      const result = applyCounter(defender, attacker, 'enemy', null, context);

      expect(result.logs[0]).toContain('플레이어 -> 고블린');
    });

    it('counter가 0이면 피해 없음', () => {
      const defender = createMockCombatant({ counter: 0 });
      const attacker = createMockCombatant({ hp: 50 });

      const result = applyCounter(defender, attacker, 'player');

      expect(result.attacker.hp).toBe(50);
      expect(result.damage).toBe(0);
    });
  });

  describe('applyRainDefense', () => {
    it('rain_defense 토큰이 없으면 효과 없음', () => {
      const defender = createMockCombatant({ tokens: {} });

      const result = applyRainDefense(defender, 'player');

      expect(result.block).toBe(0);
      expect(result.advance).toBe(0);
    });

    it('rain_defense 토큰이 있으면 방어력과 앞당김을 부여한다', () => {
      const defender = createMockCombatant({
        block: 0,
        tokens: {
          turn: [{ id: 'rain_defense', stacks: 1 }],
        },
      });

      const result = applyRainDefense(defender, 'player');

      expect(result.block).toBe(7);
      expect(result.advance).toBe(3);
      expect(result.defender.block).toBe(7);
      expect(result.defender.def).toBe(true);
    });

    it('기존 방어력에 누적한다', () => {
      const defender = createMockCombatant({
        block: 5,
        tokens: {
          turn: [{ id: 'rain_defense', stacks: 1 }],
        },
      });

      const result = applyRainDefense(defender, 'player');

      expect(result.defender.block).toBe(12); // 5 + 7
    });

    it('이벤트와 로그를 반환한다', () => {
      const defender = createMockCombatant({
        tokens: {
          turn: [{ id: 'rain_defense', stacks: 1 }],
        },
      });

      const result = applyRainDefense(defender, 'enemy');

      expect(result.events.length).toBe(1);
      expect(result.logs.length).toBe(1);
      expect(result.logs[0]).toContain('비의 눈물');
    });
  });
});
