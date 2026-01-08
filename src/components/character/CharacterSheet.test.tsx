// @vitest-environment happy-dom
/**
 * @file CharacterSheet.test.tsx
 * @description CharacterSheet 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// useCharacterSheet 훅 모킹
const mockUseCharacterSheet = {
  currentHp: 80,
  maxHp: 100,
  currentEnergy: 4,
  maxEnergy: 6,
  speed: 15,
  power: 10,
  agility: 8,
  playerInsight: 5,
  playerTraits: ['swift', 'strong'],
  traitCounts: { swift: 1, strong: 1 },
  formatTraitEffect: (id: string, count: number) => `${id} (${count})`,
  storedTraits: ['quick'],
  egos: [
    { id: 'ego1', name: '테스트 에고', description: '설명', reflection: null },
  ],
  mainSpecials: ['slash'],
  subSpecials: ['block'],
  maxMainSlots: 5,
  maxSubSlots: 3,
  displayedCards: [],
  showAllCards: false,
  handleCardClick: vi.fn(),
  specialMode: 'main' as const,
  setSpecialMode: vi.fn(),
  powerStyle: { color: '#fff' },
  agilityStyle: { color: '#fff' },
  egoPanelStyle: {},
  hoveredEgo: null,
  setHoveredEgo: vi.fn(),
};

vi.mock('./useCharacterSheet', () => ({
  useCharacterSheet: () => mockUseCharacterSheet,
}));

// Lazy loaded 컴포넌트 모킹
vi.mock('./CardManagementModal', () => ({
  CardManagementModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="card-management-modal">
      <button onClick={onClose}>닫기</button>
    </div>
  ),
}));

vi.mock('../growth/GrowthPyramidModal', () => ({
  GrowthPyramidModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="growth-pyramid-modal">
      <button onClick={onClose}>닫기</button>
    </div>
  ),
}));

// battleData 모킹
vi.mock('../battle/battleData', () => ({
  TRAITS: {
    swift: { id: 'swift', name: '신속', description: '빠른 행동' },
    strong: { id: 'strong', name: '강력', description: '강한 공격' },
  },
}));

// CharacterSheet 컴포넌트 임포트
import { CharacterSheet } from './CharacterSheet';

describe('CharacterSheet', () => {
  const defaultProps = {
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('캐릭터 창 제목 표시', () => {
      render(<CharacterSheet {...defaultProps} />);
      expect(screen.getByText('캐릭터 창')).toBeInTheDocument();
    });

    it('닫기 버튼 표시', () => {
      render(<CharacterSheet {...defaultProps} />);
      expect(screen.getByText('닫기')).toBeInTheDocument();
    });

    it('보유 카드 버튼 표시', () => {
      render(<CharacterSheet {...defaultProps} />);
      expect(screen.getByText(/🃏 보유 카드/)).toBeInTheDocument();
    });

    it('성장 버튼 표시', () => {
      render(<CharacterSheet {...defaultProps} />);
      expect(screen.getByText(/🔺 성장/)).toBeInTheDocument();
    });
  });

  describe('스탯 표시', () => {
    it('체력 표시', () => {
      render(<CharacterSheet {...defaultProps} />);
      expect(screen.getByText(/체력/)).toBeInTheDocument();
    });

    it('에너지 표시', () => {
      render(<CharacterSheet {...defaultProps} />);
      expect(screen.getByText(/에너지/)).toBeInTheDocument();
    });

    it('힘 스탯 표시', () => {
      render(<CharacterSheet {...defaultProps} />);
      expect(screen.getByText('힘')).toBeInTheDocument();
    });

    it('민첩 스탯 표시', () => {
      render(<CharacterSheet {...defaultProps} />);
      expect(screen.getByText('민첩')).toBeInTheDocument();
    });

    it('통찰 스탯 표시', () => {
      render(<CharacterSheet {...defaultProps} />);
      expect(screen.getByText('통찰')).toBeInTheDocument();
    });
  });

  describe('특성 표시', () => {
    it('보유 특성 섹션 표시', () => {
      render(<CharacterSheet {...defaultProps} />);
      expect(screen.getByText(/✨ 보유 특성/)).toBeInTheDocument();
    });
  });

  describe('닫기', () => {
    it('닫기 버튼 클릭 시 onClose 호출', () => {
      render(<CharacterSheet {...defaultProps} />);
      fireEvent.click(screen.getByText('닫기'));
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('버튼 클릭', () => {
    it('보유 카드 버튼 클릭 가능', () => {
      render(<CharacterSheet {...defaultProps} />);
      const button = screen.getByText(/🃏 보유 카드/);
      expect(button).toBeInTheDocument();
      // 버튼 클릭 테스트 (모달은 Suspense lazy loading으로 별도 테스트 필요)
      fireEvent.click(button);
    });

    it('성장 버튼 클릭 가능', () => {
      render(<CharacterSheet {...defaultProps} />);
      const button = screen.getByText(/🔺 성장/);
      expect(button).toBeInTheDocument();
      fireEvent.click(button);
    });
  });
});
