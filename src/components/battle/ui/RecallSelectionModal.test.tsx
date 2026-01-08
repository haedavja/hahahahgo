// @vitest-environment happy-dom
/**
 * @file RecallSelectionModal.test.tsx
 * @description RecallSelectionModal 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecallSelectionModal } from './RecallSelectionModal';
import type { RecallCard, RecallSelection } from '../../../types';

// 테스트용 카드 생성
function createMockCard(overrides: Partial<RecallCard> = {}): RecallCard {
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
  } as RecallCard;
}

// 테스트용 선택 상태
function createMockSelection(): RecallSelection {
  return {
    availableCards: [
      createMockCard({ id: 'card1', name: '베기', type: 'attack', damage: 15 }),
      createMockCard({ id: 'card2', name: '막기', type: 'defense', block: 10 }),
    ],
  };
}

describe('RecallSelectionModal', () => {
  const onSelect = vi.fn();
  const onSkip = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('모달 오버레이 렌더링', () => {
      const { container } = render(
        <RecallSelectionModal
          recallSelection={createMockSelection()}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );
      expect(container.querySelector('.modal-overlay')).toBeInTheDocument();
    });

    it('recallSelection null이면 렌더링 안함', () => {
      const { container } = render(
        <RecallSelectionModal
          recallSelection={null}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('제목 표시', () => {
      render(
        <RecallSelectionModal
          recallSelection={createMockSelection()}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );
      expect(screen.getByText(/📢 함성/)).toBeInTheDocument();
    });

    it('설명 표시', () => {
      render(
        <RecallSelectionModal
          recallSelection={createMockSelection()}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );
      expect(screen.getByText(/다음 턴에 확정으로 손패에 등장/)).toBeInTheDocument();
    });
  });

  describe('카드 표시', () => {
    it('선택 가능한 카드들 표시', () => {
      render(
        <RecallSelectionModal
          recallSelection={createMockSelection()}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );
      expect(screen.getByText('베기')).toBeInTheDocument();
      expect(screen.getByText('막기')).toBeInTheDocument();
    });

    it('공격 카드 피해량 표시', () => {
      render(
        <RecallSelectionModal
          recallSelection={createMockSelection()}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );
      expect(screen.getByText(/⚔️15/)).toBeInTheDocument();
    });

    it('방어 카드 방어력 표시', () => {
      render(
        <RecallSelectionModal
          recallSelection={createMockSelection()}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );
      expect(screen.getByText(/🛡️10/)).toBeInTheDocument();
    });

    it('스피드 비용 표시', () => {
      render(
        <RecallSelectionModal
          recallSelection={createMockSelection()}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );
      const speedElements = screen.getAllByText(/⏱️3/);
      expect(speedElements.length).toBe(2);
    });

    it('행동력 비용 표시', () => {
      render(
        <RecallSelectionModal
          recallSelection={createMockSelection()}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );
      const costElements = screen.getAllByText('1');
      expect(costElements.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('카드 선택', () => {
    it('카드 클릭 시 onSelect 호출', () => {
      render(
        <RecallSelectionModal
          recallSelection={createMockSelection()}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );

      fireEvent.click(screen.getByText('베기').closest('.game-card-large')!);
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ name: '베기' })
      );
    });
  });

  describe('건너뛰기', () => {
    it('건너뛰기 버튼 표시', () => {
      render(
        <RecallSelectionModal
          recallSelection={createMockSelection()}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );
      expect(screen.getByText('건너뛰기')).toBeInTheDocument();
    });

    it('건너뛰기 클릭 시 onSkip 호출', () => {
      render(
        <RecallSelectionModal
          recallSelection={createMockSelection()}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );

      fireEvent.click(screen.getByText('건너뛰기'));
      expect(onSkip).toHaveBeenCalledTimes(1);
    });
  });

  describe('호버 효과', () => {
    it('mouseEnter 시 스케일 변경', () => {
      render(
        <RecallSelectionModal
          recallSelection={createMockSelection()}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );

      const card = screen.getByText('베기').closest('.game-card-large') as HTMLElement;
      fireEvent.mouseEnter(card);
      expect(card.style.transform).toBe('scale(1.05)');
    });

    it('mouseLeave 시 스케일 복원', () => {
      render(
        <RecallSelectionModal
          recallSelection={createMockSelection()}
          onSelect={onSelect}
          onSkip={onSkip}
        />
      );

      const card = screen.getByText('베기').closest('.game-card-large') as HTMLElement;
      fireEvent.mouseEnter(card);
      fireEvent.mouseLeave(card);
      expect(card.style.transform).toBe('scale(1)');
    });
  });
});
