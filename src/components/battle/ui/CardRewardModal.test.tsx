// @vitest-environment happy-dom
/**
 * @file CardRewardModal.test.tsx
 * @description CardRewardModal 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardRewardModal } from './CardRewardModal';
import type { RewardCard } from '../../../types';

// BattleIcons 모킹
vi.mock('./BattleIcons', () => ({
  Sword: vi.fn(({ size }) => <svg data-testid="sword-icon" width={size} height={size} />),
  Shield: vi.fn(({ size }) => <svg data-testid="shield-icon" width={size} height={size} />),
}));

// 테스트용 카드 생성
function createMockCard(overrides: Partial<RewardCard> = {}): RewardCard {
  return {
    id: 'test-card',
    name: '테스트 카드',
    type: 'attack',
    damage: 10,
    block: 0,
    speedCost: 3,
    actionCost: 1,
    description: '테스트 설명',
    ...overrides,
  } as RewardCard;
}

const mockRewardCards: RewardCard[] = [
  createMockCard({ id: 'card1', name: '베기', type: 'attack', damage: 15 }),
  createMockCard({ id: 'card2', name: '막기', type: 'defense', block: 10 }),
  createMockCard({ id: 'card3', name: '강타', type: 'attack', damage: 20, hits: 2 }),
];

describe('CardRewardModal', () => {
  const onSelect = vi.fn();
  const onSkip = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('모달 오버레이 렌더링', () => {
      const { container } = render(
        <CardRewardModal
          rewardCards={mockRewardCards}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );
      expect(container.querySelector('.reward-modal-overlay')).toBeInTheDocument();
    });

    it('rewardCards null이면 렌더링 안함', () => {
      const { container } = render(
        <CardRewardModal rewardCards={null} onSelect={onSelect} onSkip={onSkip} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('빈 배열이면 렌더링 안함', () => {
      const { container } = render(
        <CardRewardModal rewardCards={[]} onSelect={onSelect} onSkip={onSkip} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('제목 표시', () => {
      render(
        <CardRewardModal
          rewardCards={mockRewardCards}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );
      expect(screen.getByText('🎁 카드 보상')).toBeInTheDocument();
    });

    it('설명 표시', () => {
      render(
        <CardRewardModal
          rewardCards={mockRewardCards}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );
      expect(screen.getByText(/3장 중 1장을 선택/)).toBeInTheDocument();
    });
  });

  describe('카드 표시', () => {
    it('모든 카드 옵션 표시', () => {
      render(
        <CardRewardModal
          rewardCards={mockRewardCards}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );
      expect(screen.getByText('베기')).toBeInTheDocument();
      expect(screen.getByText('막기')).toBeInTheDocument();
      expect(screen.getByText('강타')).toBeInTheDocument();
    });

    it('공격 카드: 피해량 표시', () => {
      render(
        <CardRewardModal
          rewardCards={mockRewardCards}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );
      expect(screen.getByText(/⚔️ 15/)).toBeInTheDocument();
    });

    it('방어 카드: 방어력 표시', () => {
      render(
        <CardRewardModal
          rewardCards={mockRewardCards}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );
      expect(screen.getByText(/🛡️ 10/)).toBeInTheDocument();
    });

    it('다중 타격 카드: hits 표시', () => {
      render(
        <CardRewardModal
          rewardCards={mockRewardCards}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );
      expect(screen.getByText(/⚔️ 20 x2/)).toBeInTheDocument();
    });

    it('스피드 비용 표시', () => {
      render(
        <CardRewardModal
          rewardCards={mockRewardCards}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );
      const speedElements = screen.getAllByText(/⏱️ 3/);
      expect(speedElements.length).toBe(3);
    });
  });

  describe('카드 선택', () => {
    it('카드 클릭 시 onSelect 호출', () => {
      render(
        <CardRewardModal
          rewardCards={mockRewardCards}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );

      fireEvent.click(screen.getByText('베기').closest('.reward-card-option')!);
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ name: '베기' }),
        0
      );
    });

    it('Enter 키로 카드 선택', () => {
      render(
        <CardRewardModal
          rewardCards={mockRewardCards}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );

      const cardOption = screen.getByText('베기').closest('.reward-card-option')!;
      fireEvent.keyDown(cardOption, { key: 'Enter' });
      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe('건너뛰기', () => {
    it('건너뛰기 버튼 표시', () => {
      render(
        <CardRewardModal
          rewardCards={mockRewardCards}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );
      expect(screen.getByText('건너뛰기')).toBeInTheDocument();
    });

    it('건너뛰기 클릭 시 onSkip 호출', () => {
      render(
        <CardRewardModal
          rewardCards={mockRewardCards}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );

      fireEvent.click(screen.getByText('건너뛰기'));
      expect(onSkip).toHaveBeenCalledTimes(1);
    });

    it('Escape 키로 건너뛰기', () => {
      render(
        <CardRewardModal
          rewardCards={mockRewardCards}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onSkip).toHaveBeenCalledTimes(1);
    });
  });

  describe('접근성', () => {
    it('dialog role 설정', () => {
      render(
        <CardRewardModal
          rewardCards={mockRewardCards}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('listbox role 설정', () => {
      render(
        <CardRewardModal
          rewardCards={mockRewardCards}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );
      expect(screen.getByRole('listbox', { name: /카드 선택/ })).toBeInTheDocument();
    });

    it('카드에 option role 설정', () => {
      render(
        <CardRewardModal
          rewardCards={mockRewardCards}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );
      const options = screen.getAllByRole('option');
      expect(options.length).toBe(3);
    });

    it('tabIndex 설정으로 포커스 가능', () => {
      render(
        <CardRewardModal
          rewardCards={mockRewardCards}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );
      const options = screen.getAllByRole('option');
      options.forEach(option => {
        expect(option).toHaveAttribute('tabIndex', '0');
      });
    });
  });
});
