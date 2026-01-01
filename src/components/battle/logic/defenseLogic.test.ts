/**
 * @file defenseLogic.test.ts
 * @description 방어 행동 처리 로직 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyDefense } from './defenseLogic';
import type { Combatant, Card, BattleContext } from '../../../types';

// Mock dependencies
vi.mock('../../../lib/tokenEffects', () => ({
  applyTokenEffectsToCard: vi.fn((card) => ({
    modifiedCard: card,
    consumedTokens: [],
  })),
  consumeTokens: vi.fn((actor) => ({
    tokens: actor.tokens,
    logs: [],
  })),
}));

vi.mock('../../../lib/tokenUtils', () => ({
  addToken: vi.fn((actor, tokenId, amount) => ({
    tokens: { ...actor.tokens, [tokenId]: amount },
  })),
}));

vi.mock('../utils/cardSpecialEffects', () => ({
  calculateGrowingDefense: vi.fn(() => 0),
  hasSpecial: vi.fn(() => false),
}));

vi.mock('../../../lib/logosEffects', () => ({
  getCombatTokens: vi.fn(() => ({ onAttack: '', onDefense: '' })),
}));

vi.mock('../../../lib/ethosEffects', () => ({
  isSwordCard: vi.fn(() => false),
}));

const createMockActor = (overrides: Partial<Combatant> = {}): Combatant => ({
  hp: 100,
  maxHp: 100,
  block: 0,
  tokens: {},
  ...overrides,
} as Combatant);

const createMockCard = (overrides: Partial<Card> = {}): Card => ({
  id: 'test-defense',
  name: '방어',
  type: 'defense',
  block: 5,
  sp: 1,
  ...overrides,
} as Card);

describe('defenseLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('applyDefense', () => {
    it('기본 방어력을 적용한다', () => {
      const actor = createMockActor({ block: 0 });
      const card = createMockCard({ block: 5 });

      const result = applyDefense(actor, card, 'player');

      expect(result.actor.block).toBe(5);
      expect(result.actor.def).toBe(true);
    });

    it('기존 방어력에 누적한다', () => {
      const actor = createMockActor({ block: 3 });
      const card = createMockCard({ block: 5 });

      const result = applyDefense(actor, card, 'player');

      expect(result.actor.block).toBe(8);
    });

    it('힘 보너스를 추가한다', () => {
      const actor = createMockActor({ strength: 2, block: 0 });
      const card = createMockCard({ block: 5 });

      const result = applyDefense(actor, card, 'player');

      expect(result.actor.block).toBe(7); // 5 + 2
    });

    it('ignoreStrength가 true면 힘 보너스를 무시한다', () => {
      const actor = createMockActor({ strength: 2, block: 0 });
      const card = createMockCard({ block: 5, ignoreStrength: true });

      const result = applyDefense(actor, card, 'player');

      expect(result.actor.block).toBe(5);
    });

    it('반격 값을 설정한다', () => {
      const actor = createMockActor();
      const card = createMockCard({ block: 5, counter: 3 });

      const result = applyDefense(actor, card, 'player');

      expect(result.actor.counter).toBe(3);
    });

    it('defense 필드도 block으로 사용한다', () => {
      const actor = createMockActor({ block: 0 });
      const card = createMockCard({ block: undefined, defense: 8 });

      const result = applyDefense(actor, card, 'player');

      expect(result.actor.block).toBe(8);
    });

    it('이벤트와 로그를 반환한다', () => {
      const actor = createMockActor();
      const card = createMockCard({ block: 5 });

      const result = applyDefense(actor, card, 'player');

      expect(result.events.length).toBeGreaterThan(0);
      expect(result.events[0].type).toBe('defense');
      expect(result.log).toContain('🛡️');
    });

    it('적의 방어도 처리한다', () => {
      const actor = createMockActor();
      const card = createMockCard({ block: 10 });
      const context: BattleContext = { enemyDisplayName: '고블린' };

      const result = applyDefense(actor, card, 'enemy', context);

      expect(result.actor.block).toBe(10);
      expect(result.log).toContain('고블린');
    });

    it('dealt과 taken은 항상 0', () => {
      const actor = createMockActor();
      const card = createMockCard({ block: 5 });

      const result = applyDefense(actor, card, 'player');

      expect(result.dealt).toBe(0);
      expect(result.taken).toBe(0);
    });
  });
});
