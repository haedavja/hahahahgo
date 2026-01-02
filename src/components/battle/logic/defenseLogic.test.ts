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

    describe('pathosTurnEffects', () => {
      it('onCrossBlock 효과가 교차 시 추가 방어력을 적용한다', async () => {
        const actor = createMockActor({ block: 0 });
        const card = createMockCard({ block: 5 });
        const context: BattleContext = {
          currentSp: 10,
          queue: [
            { actor: 'player', sp: 10, cardId: 'test', speedCost: 5, card: {} as Card },
            { actor: 'enemy', sp: 10, cardId: 'enemy-card', speedCost: 5, card: {} as Card },
          ],
          currentQIndex: 0,
          pathosTurnEffects: { onCrossBlock: 3 },
        };

        const result = applyDefense(actor, card, 'player', context);

        // 기본 5 + 교차 보너스 3 = 8
        expect(result.actor.block).toBe(8);
        expect(result.log).toContain('교차 방어');
      });

      it('onSwordBlock 효과가 검격 방어 시 추가 방어력을 적용한다', async () => {
        const { isSwordCard } = await import('../../../lib/ethosEffects');
        vi.mocked(isSwordCard).mockReturnValue(true);

        const actor = createMockActor({ block: 0 });
        const card = createMockCard({ block: 5 });
        const context: BattleContext = {
          pathosTurnEffects: { onSwordBlock: 4 },
        };

        const result = applyDefense(actor, card, 'player', context);

        // 기본 5 + 검격 방어 보너스 4 = 9
        expect(result.actor.block).toBe(9);
        expect(result.log).toContain('검격 방어');
      });
    });

    describe('logos 효과', () => {
      it('검격 방어 시 로고스 토큰을 획득한다', async () => {
        const { isSwordCard } = await import('../../../lib/ethosEffects');
        const { getCombatTokens } = await import('../../../lib/logosEffects');
        vi.mocked(isSwordCard).mockReturnValue(true);
        vi.mocked(getCombatTokens).mockReturnValue({ onDefense: '수세', onAttack: '' });

        const actor = createMockActor({ block: 0 });
        const card = createMockCard({ block: 5 });

        const result = applyDefense(actor, card, 'player');

        expect(result.log).toContain('수세 획득');
      });
    });

    describe('교차 특성 (cross trait)', () => {
      it('교차 특성이 있고 교차 시 방어력 배수를 적용한다', () => {
        const actor = createMockActor({ block: 0 });
        const card = createMockCard({
          block: 5,
          traits: ['cross'],
          crossBonus: { type: 'block_mult', value: 2 },
        });
        const context: BattleContext = {
          currentSp: 10,
          queue: [
            { actor: 'player', sp: 10, cardId: 'test', speedCost: 5, card: {} as Card },
            { actor: 'enemy', sp: 10.5, cardId: 'enemy-card', speedCost: 5, card: {} as Card },
          ],
          currentQIndex: 0,
        };

        const result = applyDefense(actor, card, 'player', context);

        // 기본 5 * 2배 = 10
        expect(result.actor.block).toBe(10);
        expect(result.log).toContain('교차');
      });
    });

    describe('특수 효과 (special)', () => {
      it('hologram 효과가 최대 체력만큼 방어력을 부여한다', async () => {
        const { hasSpecial } = await import('../utils/cardSpecialEffects');
        vi.mocked(hasSpecial).mockImplementation((card, type) => type === 'hologram');

        const actor = createMockActor({ block: 0, maxHp: 50 });
        const card = createMockCard({ block: 5 });

        const result = applyDefense(actor, card, 'player');

        expect(result.actor.block).toBe(50);
      });

      it('heal5 효과가 체력을 5 회복한다', async () => {
        const { hasSpecial } = await import('../utils/cardSpecialEffects');
        vi.mocked(hasSpecial).mockImplementation((card, type) => type === 'heal5');

        const actor = createMockActor({ hp: 80, maxHp: 100, block: 0 });
        const card = createMockCard({ block: 5 });

        const result = applyDefense(actor, card, 'player');

        expect(result.actor.hp).toBe(85);
        expect(result.log).toContain('+5 HP');
      });

      it('heal5 효과가 최대 체력을 초과하지 않는다', async () => {
        const { hasSpecial } = await import('../utils/cardSpecialEffects');
        vi.mocked(hasSpecial).mockImplementation((card, type) => type === 'heal5');

        const actor = createMockActor({ hp: 98, maxHp: 100, block: 0 });
        const card = createMockCard({ block: 5 });

        const result = applyDefense(actor, card, 'player');

        expect(result.actor.hp).toBe(100);
        expect(result.log).toContain('+2 HP');
      });
    });

    describe('유령 카드 및 토큰', () => {
      it('유령 카드는 토큰을 소모하지 않는다', () => {
        const actor = createMockActor({
          block: 0,
          tokens: {
            usage: [],
            turn: [{ id: '수세', stacks: 1 }],
            permanent: []
          }
        });
        const card = createMockCard({ block: 5, isGhost: true });

        const result = applyDefense(actor, card, 'player');

        expect(result.actor.tokens).toEqual({
          usage: [],
          turn: [{ id: '수세', stacks: 1 }],
          permanent: []
        });
      });

      it('ignoreStatus가 true면 토큰 효과를 적용하지 않는다', () => {
        const actor = createMockActor({ block: 0 });
        const card = createMockCard({ block: 5, ignoreStatus: true });

        const result = applyDefense(actor, card, 'player');

        expect(result.actor.block).toBe(5);
      });
    });
  });
});
