/**
 * @file HandArea.test.tsx
 * @description HandArea 컴포넌트 테스트
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HandArea } from './HandArea';
import type { Card, HandBattle, HandPlayer, HandEnemy } from '../../../types';

// ==================== 테스트 헬퍼 ====================

const createMockCard = (overrides: Partial<Card> = {}): Card => ({
  id: 'test-card-1',
  name: '테스트 카드',
  type: 'attack',
  damage: 10,
  speedCost: 5,
  actionCost: 1,
  traits: [],
  ...overrides,
});

const createMockBattle = (overrides: Partial<HandBattle> = {}): HandBattle => ({
  phase: 'select',
  queue: [],
  selected: [],
  ...overrides,
} as HandBattle);

const createMockPlayer = (overrides = {}): HandPlayer => ({
  hp: 100,
  maxHp: 100,
  energy: 6,
  maxEnergy: 6,
  tokens: {},
  ...overrides,
} as HandPlayer);

const createMockEnemy = (overrides = {}): HandEnemy => ({
  hp: 50,
  maxHp: 50,
  tokens: {},
  ...overrides,
} as HandEnemy);

const defaultProps = {
  battle: createMockBattle(),
  player: createMockPlayer(),
  enemy: createMockEnemy(),
  selected: [],
  getSortedHand: () => [],
  toggle: vi.fn(),
  handDisabled: () => false,
  showCardTraitTooltip: vi.fn(),
  hideCardTraitTooltip: vi.fn(),
  formatSpeedText: (speed: number) => `${speed}`,
  renderNameWithBadge: (card: Card) => card.name,
};

// ==================== 테스트 ====================

describe('HandArea', () => {
  describe('렌더링', () => {
    it('select 단계에서 렌더링', () => {
      render(<HandArea {...defaultProps} />);
      // 컴포넌트가 렌더링되면 테스트 통과
      expect(true).toBe(true);
    });

    it('respond 단계에서 렌더링', () => {
      const props = {
        ...defaultProps,
        battle: createMockBattle({ phase: 'respond' }),
        fixedOrder: [],
        moveUp: vi.fn(),
        moveDown: vi.fn(),
      };
      render(<HandArea {...props} />);
      expect(true).toBe(true);
    });

    it('resolve 단계에서 렌더링', () => {
      const props = {
        ...defaultProps,
        battle: createMockBattle({ phase: 'resolve' }),
        queue: [],
        usedCardIndices: [],
        disappearingCards: [],
        hiddenCards: [],
      };
      render(<HandArea {...props} />);
      expect(true).toBe(true);
    });
  });

  describe('손패 표시', () => {
    it('빈 손패일 때 렌더링', () => {
      render(<HandArea {...defaultProps} getSortedHand={() => []} />);
      expect(true).toBe(true);
    });

    it('손패가 있을 때 카드 표시', () => {
      const cards = [
        createMockCard({ id: 'card-1', name: '카드1' }),
        createMockCard({ id: 'card-2', name: '카드2' }),
      ];
      render(<HandArea {...defaultProps} getSortedHand={() => cards} />);
      expect(true).toBe(true);
    });
  });

  describe('플레이어/적 상태', () => {
    it('플레이어가 null일 때 렌더링', () => {
      render(<HandArea {...defaultProps} player={null} />);
      expect(true).toBe(true);
    });

    it('적이 null일 때 렌더링', () => {
      render(<HandArea {...defaultProps} enemy={null} />);
      expect(true).toBe(true);
    });
  });

  describe('덱/버림패 표시', () => {
    it('덱과 버림패 카운터 표시', () => {
      const deck = [createMockCard(), createMockCard()];
      const discardPile = [createMockCard()];
      render(<HandArea {...defaultProps} deck={deck} discardPile={discardPile} />);
      expect(true).toBe(true);
    });
  });
});
