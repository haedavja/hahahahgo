// @vitest-environment happy-dom
/**
 * @file DeckDiscardCounter.test.tsx
 * @description DeckDiscardCounter 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeckDiscardCounter } from './DeckDiscardCounter';
import type { Card } from '../../../../types';

// CardListPopup 모킹
vi.mock('../CardPopups', () => ({
  CardListPopup: vi.fn(({ title, onClose, cards }) => (
    <div data-testid="card-popup">
      <span data-testid="popup-title">{title}</span>
      <span data-testid="popup-count">{cards.length}</span>
      <button onClick={onClose} data-testid="close-btn">닫기</button>
    </div>
  )),
}));

// createHoverHandlers 모킹
vi.mock('./handUtils', () => ({
  createHoverHandlers: vi.fn(() => ({})),
}));

// 테스트용 카드 생성
function createMockCard(id: string): Card {
  return {
    instanceId: id,
    id,
    name: `카드 ${id}`,
    suit: 'spades',
    rank: 1,
    sp: 5,
    power: 10,
    traits: [],
  } as Card;
}

describe('DeckDiscardCounter', () => {
  const mockDeck = [createMockCard('1'), createMockCard('2'), createMockCard('3')];
  const mockDiscardPile = [createMockCard('4'), createMockCard('5')];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('카운터 표시', () => {
    it('덱 카운터 표시', () => {
      render(<DeckDiscardCounter deck={mockDeck} discardPile={mockDiscardPile} />);
      expect(screen.getByText('덱: 3')).toBeInTheDocument();
    });

    it('무덤 카운터 표시', () => {
      render(<DeckDiscardCounter deck={mockDeck} discardPile={mockDiscardPile} />);
      expect(screen.getByText('무덤: 2')).toBeInTheDocument();
    });

    it('빈 덱', () => {
      render(<DeckDiscardCounter deck={[]} discardPile={mockDiscardPile} />);
      expect(screen.getByText('덱: 0')).toBeInTheDocument();
    });

    it('빈 무덤', () => {
      render(<DeckDiscardCounter deck={mockDeck} discardPile={[]} />);
      expect(screen.getByText('무덤: 0')).toBeInTheDocument();
    });
  });

  describe('팝업 상호작용', () => {
    it('덱 클릭 시 덱 팝업 표시', () => {
      render(<DeckDiscardCounter deck={mockDeck} discardPile={mockDiscardPile} />);

      // 초기 상태: 팝업 없음
      expect(screen.queryByTestId('card-popup')).not.toBeInTheDocument();

      // 덱 카운터 클릭
      fireEvent.click(screen.getByText('덱: 3'));

      // 팝업 표시
      expect(screen.getByTestId('popup-title')).toHaveTextContent('남은 덱');
      expect(screen.getByTestId('popup-count')).toHaveTextContent('3');
    });

    it('무덤 클릭 시 무덤 팝업 표시', () => {
      render(<DeckDiscardCounter deck={mockDeck} discardPile={mockDiscardPile} />);

      // 무덤 카운터 클릭
      fireEvent.click(screen.getByText('무덤: 2'));

      // 팝업 표시
      expect(screen.getByTestId('popup-title')).toHaveTextContent('무덤');
      expect(screen.getByTestId('popup-count')).toHaveTextContent('2');
    });

    it('팝업 닫기', () => {
      render(<DeckDiscardCounter deck={mockDeck} discardPile={mockDiscardPile} />);

      // 덱 팝업 열기
      fireEvent.click(screen.getByText('덱: 3'));
      expect(screen.getByTestId('card-popup')).toBeInTheDocument();

      // 닫기 버튼 클릭
      fireEvent.click(screen.getByTestId('close-btn'));

      // 팝업 닫힘
      expect(screen.queryByTestId('card-popup')).not.toBeInTheDocument();
    });
  });

  describe('아이콘 표시', () => {
    it('덱 아이콘 (카드)', () => {
      render(<DeckDiscardCounter deck={mockDeck} discardPile={mockDiscardPile} />);
      // 🎴 emoji
      expect(screen.getByText('🎴')).toBeInTheDocument();
    });

    it('무덤 아이콘 (묘비)', () => {
      render(<DeckDiscardCounter deck={mockDeck} discardPile={mockDiscardPile} />);
      // 🪦 emoji
      expect(screen.getByText('🪦')).toBeInTheDocument();
    });
  });
});
