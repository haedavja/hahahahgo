// @vitest-environment happy-dom
/**
 * @file CardManagementModal.test.tsx
 * @description CardManagementModal 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardManagementModal } from './CardManagementModal';

// battleData 모킹
vi.mock('../battle/battleData', () => ({
  CARDS: [
    { id: 'slash', name: '베기', type: 'attack', actionCost: 1, speedCost: 3, damage: 5, traits: [] },
    { id: 'block', name: '막기', type: 'defense', actionCost: 1, speedCost: 2, block: 5, traits: [] },
    { id: 'thrust', name: '찌르기', type: 'attack', actionCost: 2, speedCost: 4, damage: 8, traits: [] },
  ],
  TRAITS: {},
}));

// TraitBadge 모킹
vi.mock('../battle/ui/TraitBadge', () => ({
  TraitBadgeList: ({ traits }: { traits: string[] }) => (
    <div data-testid="trait-list">{traits.join(', ')}</div>
  ),
}));

// BattleIcons 모킹
vi.mock('../battle/ui/BattleIcons', () => ({
  Sword: () => <span data-testid="sword-icon">⚔️</span>,
  Shield: () => <span data-testid="shield-icon">🛡️</span>,
}));

describe('CardManagementModal', () => {
  const defaultProps = {
    onClose: vi.fn(),
    specialMode: 'main' as const,
    setSpecialMode: vi.fn(),
    mainSpecials: ['slash'],
    subSpecials: [],
    maxMainSlots: 5,
    maxSubSlots: 3,
    displayedCards: [
      { id: 'slash', name: '베기', type: 'attack', actionCost: 1, speedCost: 3, damage: 5, traits: [] },
      { id: 'block', name: '막기', type: 'defense', actionCost: 1, speedCost: 2, block: 5, traits: [] },
    ],
    showAllCards: false,
    onCardClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('모달 제목 표시', () => {
      render(<CardManagementModal {...defaultProps} />);
      expect(screen.getByText('🃏 카드 관리')).toBeInTheDocument();
    });

    it('닫기 버튼 표시', () => {
      render(<CardManagementModal {...defaultProps} />);
      expect(screen.getByText('닫기')).toBeInTheDocument();
    });

    it('슬롯 현황 표시', () => {
      render(<CardManagementModal {...defaultProps} />);
      expect(screen.getByText(/주특기:/)).toBeInTheDocument();
      expect(screen.getByText(/보조특기:/)).toBeInTheDocument();
    });

    it('안내 메시지 표시', () => {
      render(<CardManagementModal {...defaultProps} />);
      expect(screen.getByText(/좌클릭: 카드 추가/)).toBeInTheDocument();
    });
  });

  describe('모드 전환', () => {
    it('주특기 선택 모드 버튼', () => {
      render(<CardManagementModal {...defaultProps} />);
      expect(screen.getByText(/주특기 선택 모드/)).toBeInTheDocument();
    });

    it('보조특기 선택 모드 버튼', () => {
      render(<CardManagementModal {...defaultProps} />);
      expect(screen.getByText(/보조특기 선택 모드/)).toBeInTheDocument();
    });

    it('주특기 모드 클릭 시 setSpecialMode 호출', () => {
      render(<CardManagementModal {...defaultProps} specialMode="sub" />);
      fireEvent.click(screen.getByText(/주특기 선택 모드/));
      expect(defaultProps.setSpecialMode).toHaveBeenCalledWith('main');
    });

    it('보조특기 모드 클릭 시 setSpecialMode 호출', () => {
      render(<CardManagementModal {...defaultProps} />);
      fireEvent.click(screen.getByText(/보조특기 선택 모드/));
      expect(defaultProps.setSpecialMode).toHaveBeenCalledWith('sub');
    });
  });

  describe('닫기', () => {
    it('닫기 버튼 클릭 시 onClose 호출', () => {
      render(<CardManagementModal {...defaultProps} />);
      fireEvent.click(screen.getByText('닫기'));
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('오버레이 클릭 시 onClose 호출', () => {
      const { container } = render(<CardManagementModal {...defaultProps} />);
      const overlay = container.firstChild as HTMLElement;
      fireEvent.click(overlay);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('슬롯 현황', () => {
    it('주특기 슬롯 수 표시', () => {
      render(<CardManagementModal {...defaultProps} />);
      expect(screen.getByText('1 / 5')).toBeInTheDocument();
    });

    it('보조특기 슬롯 수 표시', () => {
      render(<CardManagementModal {...defaultProps} />);
      expect(screen.getByText('0 / 3')).toBeInTheDocument();
    });
  });

  describe('선택된 카드', () => {
    it('주특기 모드에서 선택된 카드 표시', () => {
      render(<CardManagementModal {...defaultProps} />);
      expect(screen.getByText(/선택된 주특기/)).toBeInTheDocument();
    });

    it('보조특기 모드에서 선택된 카드 표시', () => {
      render(<CardManagementModal {...defaultProps} specialMode="sub" />);
      expect(screen.getByText(/선택된 보조특기/)).toBeInTheDocument();
    });

    it('선택된 카드 없으면 안내 메시지', () => {
      render(
        <CardManagementModal
          {...defaultProps}
          mainSpecials={[]}
        />
      );
      expect(screen.getByText('선택된 카드가 없습니다')).toBeInTheDocument();
    });
  });

  describe('카드 목록', () => {
    it('보유 카드 목록 제목', () => {
      render(<CardManagementModal {...defaultProps} />);
      expect(screen.getByText(/보유 카드 목록/)).toBeInTheDocument();
    });

    it('전체 카드 목록 제목 (showAllCards)', () => {
      render(<CardManagementModal {...defaultProps} showAllCards={true} />);
      expect(screen.getByText(/전체 카드 목록/)).toBeInTheDocument();
    });
  });
});
