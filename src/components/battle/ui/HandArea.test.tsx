// @vitest-environment happy-dom
/**
 * @file HandArea.test.tsx
 * @description HandArea 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HandArea } from './HandArea';
import type { Card, HandBattle, HandPlayer, HandEnemy } from '../../../types';

// hand 하위 컴포넌트 모킹
vi.mock('./hand', () => ({
  DeckDiscardCounter: ({ deck, discardPile }: { deck: unknown[]; discardPile: unknown[] }) => (
    <div data-testid="deck-discard-counter">
      덱: {deck.length} | 버린 카드: {discardPile.length}
    </div>
  ),
  SelectPhaseCards: ({ hand }: { hand: unknown[] }) => (
    <div data-testid="select-phase-cards">선택 단계 - {hand.length}장</div>
  ),
  RespondPhaseCards: ({ fixedOrder }: { fixedOrder: unknown[] }) => (
    <div data-testid="respond-phase-cards">대응 단계 - {fixedOrder.length}장</div>
  ),
  ResolvePhaseCards: ({ queue }: { queue: unknown[] }) => (
    <div data-testid="resolve-phase-cards">진행 단계 - {queue.length}장</div>
  ),
}));

// tokenUtils 모킹
vi.mock('../../../lib/tokenUtils', () => ({
  getTokenStacks: vi.fn(() => 0),
}));

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
  deck: [],
  discardPile: [],
};

// ==================== 테스트 ====================

describe('HandArea', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('hand-area 컨테이너 렌더링', () => {
      render(<HandArea {...defaultProps} />);
      expect(screen.getByTestId('hand-area')).toBeInTheDocument();
    });

    it('덱/버린 카드 카운터 표시', () => {
      render(
        <HandArea
          {...defaultProps}
          deck={[createMockCard(), createMockCard()]}
          discardPile={[createMockCard()]}
        />
      );
      expect(screen.getByTestId('deck-discard-counter')).toBeInTheDocument();
      expect(screen.getByText(/덱: 2/)).toBeInTheDocument();
      expect(screen.getByText(/버린 카드: 1/)).toBeInTheDocument();
    });
  });

  describe('선택 단계', () => {
    it('select 단계에서 SelectPhaseCards 렌더링', () => {
      render(<HandArea {...defaultProps} battle={createMockBattle({ phase: 'select' })} />);
      expect(screen.getByTestId('select-phase-cards')).toBeInTheDocument();
    });

    it('손패 카드 수 표시', () => {
      const cards = [createMockCard(), createMockCard(), createMockCard()];
      render(<HandArea {...defaultProps} getSortedHand={() => cards} />);
      expect(screen.getByText('선택 단계 - 3장')).toBeInTheDocument();
    });
  });

  describe('대응 단계', () => {
    it('respond 단계에서 RespondPhaseCards 렌더링', () => {
      const fixedOrder = [
        { card: createMockCard(), sp: 5, owner: 'player' as const },
        { card: createMockCard(), sp: 8, owner: 'player' as const },
      ];

      render(
        <HandArea
          {...defaultProps}
          battle={createMockBattle({ phase: 'respond' })}
          fixedOrder={fixedOrder}
          moveUp={vi.fn()}
          moveDown={vi.fn()}
        />
      );

      expect(screen.getByTestId('respond-phase-cards')).toBeInTheDocument();
      expect(screen.getByText('대응 단계 - 2장')).toBeInTheDocument();
    });

    it('fixedOrder 없으면 RespondPhaseCards 미렌더링', () => {
      render(
        <HandArea
          {...defaultProps}
          battle={createMockBattle({ phase: 'respond' })}
          fixedOrder={undefined}
        />
      );

      expect(screen.queryByTestId('respond-phase-cards')).not.toBeInTheDocument();
    });
  });

  describe('진행 단계', () => {
    it('resolve 단계에서 ResolvePhaseCards 렌더링', () => {
      const queue = [
        { card: createMockCard(), sp: 5, owner: 'player' as const },
        { card: createMockCard(), sp: 3, owner: 'enemy' as const },
      ];

      render(
        <HandArea
          {...defaultProps}
          battle={createMockBattle({ phase: 'resolve', queue })}
          queue={queue}
        />
      );

      expect(screen.getByTestId('resolve-phase-cards')).toBeInTheDocument();
      expect(screen.getByText('진행 단계 - 2장')).toBeInTheDocument();
    });

    it('queue가 비어있으면 ResolvePhaseCards 미렌더링', () => {
      render(
        <HandArea
          {...defaultProps}
          battle={createMockBattle({ phase: 'resolve', queue: [] })}
          queue={[]}
        />
      );

      expect(screen.queryByTestId('resolve-phase-cards')).not.toBeInTheDocument();
    });
  });

  describe('패배 상태', () => {
    it('플레이어 HP 0 이하 시 패배 플래그 표시', () => {
      render(
        <HandArea
          {...defaultProps}
          player={createMockPlayer({ hp: 0 })}
        />
      );

      expect(screen.getByTestId('defeat-flag')).toBeInTheDocument();
      expect(screen.getByText(/패배/)).toBeInTheDocument();
    });

    it('플레이어 HP 양수면 패배 플래그 미표시', () => {
      render(
        <HandArea
          {...defaultProps}
          player={createMockPlayer({ hp: 50 })}
        />
      );

      expect(screen.queryByTestId('defeat-flag')).not.toBeInTheDocument();
    });
  });

  describe('플레이어/적 상태', () => {
    it('player null이어도 phase가 select면 렌더링', () => {
      render(
        <HandArea
          {...defaultProps}
          player={null}
          battle={createMockBattle({ phase: 'select' })}
        />
      );

      expect(screen.getByTestId('hand-area')).toBeInTheDocument();
    });

    it('enemy HP 0 이하여도 렌더링', () => {
      render(
        <HandArea
          {...defaultProps}
          enemy={createMockEnemy({ hp: 0 })}
        />
      );

      expect(screen.getByTestId('hand-area')).toBeInTheDocument();
    });

    it('enemy null이어도 렌더링', () => {
      render(<HandArea {...defaultProps} enemy={null} />);
      expect(screen.getByTestId('hand-area')).toBeInTheDocument();
    });
  });

  describe('다중 유닛 타겟팅', () => {
    it('enemyUnits 전달 시 정상 렌더링', () => {
      const enemyUnits = [
        { unitId: 0, name: '구울', hp: 40 },
        { unitId: 1, name: '해골', hp: 30 },
      ];

      render(
        <HandArea
          {...defaultProps}
          enemyUnits={enemyUnits as any}
        />
      );

      expect(screen.getByTestId('hand-area')).toBeInTheDocument();
    });
  });

  describe('간략 모드', () => {
    it('isSimplified true 전달 시 정상 렌더링', () => {
      render(
        <HandArea
          {...defaultProps}
          isSimplified={true}
        />
      );

      expect(screen.getByTestId('hand-area')).toBeInTheDocument();
    });
  });

  describe('추가 props', () => {
    it('usedCardIndices, disappearingCards, hiddenCards 전달', () => {
      const queue = [{ card: createMockCard(), sp: 5, owner: 'player' as const }];

      render(
        <HandArea
          {...defaultProps}
          battle={createMockBattle({ phase: 'resolve', queue })}
          queue={queue}
          usedCardIndices={[0]}
          disappearingCards={[]}
          hiddenCards={[]}
          disabledCardIndices={[]}
        />
      );

      expect(screen.getByTestId('resolve-phase-cards')).toBeInTheDocument();
    });
  });
});
