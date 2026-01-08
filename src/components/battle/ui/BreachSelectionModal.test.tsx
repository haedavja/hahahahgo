// @vitest-environment happy-dom
/**
 * @file BreachSelectionModal.test.tsx
 * @description BreachSelectionModal 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BreachSelectionModal } from './BreachSelectionModal';
import type { BreachCard, BreachSelection } from '../../../types';

// BattleIcons 모킹
vi.mock('./BattleIcons', () => ({
  Sword: vi.fn(({ size }) => <svg data-testid="sword-icon" width={size} height={size} />),
  Shield: vi.fn(({ size }) => <svg data-testid="shield-icon" width={size} height={size} />),
}));

// 테스트용 카드 생성
function createMockCard(overrides: Partial<BreachCard> = {}): BreachCard {
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
  } as BreachCard;
}

// 테스트용 브리치 선택 상태
function createMockSelection(overrides: Partial<BreachSelection> = {}): BreachSelection {
  return {
    cards: [
      createMockCard({ id: 'card1', name: '베기', type: 'attack', damage: 15 }),
      createMockCard({ id: 'card2', name: '막기', type: 'defense', block: 10 }),
      createMockCard({ id: 'card3', name: '강타', type: 'attack', damage: 20, hits: 2 }),
    ],
    breachSp: 5,
    breachCard: null,
    sourceCardName: undefined,
    isLastChain: false,
    ...overrides,
  } as BreachSelection;
}

describe('BreachSelectionModal', () => {
  const onSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('모달 오버레이 렌더링', () => {
      const { container } = render(
        <BreachSelectionModal
          breachSelection={createMockSelection()}
          onSelect={onSelect}
        />
      );
      expect(container.querySelector('.breach-modal-overlay')).toBeInTheDocument();
    });

    it('breachSelection null이면 렌더링 안함', () => {
      const { container } = render(
        <BreachSelectionModal breachSelection={null} onSelect={onSelect} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('브리치 기본 제목 표시', () => {
      render(
        <BreachSelectionModal
          breachSelection={createMockSelection()}
          onSelect={onSelect}
        />
      );
      expect(screen.getByText('👻 브리치 - 카드 선택')).toBeInTheDocument();
    });
  });

  describe('카드 표시', () => {
    it('3장의 카드 옵션 표시', () => {
      render(
        <BreachSelectionModal
          breachSelection={createMockSelection()}
          onSelect={onSelect}
        />
      );
      expect(screen.getByText('베기')).toBeInTheDocument();
      expect(screen.getByText('막기')).toBeInTheDocument();
      expect(screen.getByText('강타')).toBeInTheDocument();
    });

    it('공격 카드: 피해량 표시', () => {
      render(
        <BreachSelectionModal
          breachSelection={createMockSelection()}
          onSelect={onSelect}
        />
      );
      expect(screen.getByText(/⚔️ 15/)).toBeInTheDocument();
    });

    it('방어 카드: 방어력 표시', () => {
      render(
        <BreachSelectionModal
          breachSelection={createMockSelection()}
          onSelect={onSelect}
        />
      );
      expect(screen.getByText(/🛡️ 10/)).toBeInTheDocument();
    });

    it('다중 타격 카드: hits 표시', () => {
      render(
        <BreachSelectionModal
          breachSelection={createMockSelection()}
          onSelect={onSelect}
        />
      );
      expect(screen.getByText(/⚔️ 20 x2/)).toBeInTheDocument();
    });

    it('스피드 비용 표시', () => {
      render(
        <BreachSelectionModal
          breachSelection={createMockSelection()}
          onSelect={onSelect}
        />
      );
      // 모든 카드의 스피드 비용 3
      const speedElements = screen.getAllByText(/⏱️ 3/);
      expect(speedElements.length).toBe(3);
    });
  });

  describe('힘 보너스 적용', () => {
    it('공격 카드에 strengthBonus 적용', () => {
      render(
        <BreachSelectionModal
          breachSelection={createMockSelection({
            cards: [createMockCard({ damage: 10, type: 'attack' })],
          })}
          onSelect={onSelect}
          strengthBonus={5}
        />
      );
      // 10 + 5 = 15
      expect(screen.getByText(/⚔️ 15/)).toBeInTheDocument();
    });

    it('방어 카드에 strengthBonus 적용', () => {
      render(
        <BreachSelectionModal
          breachSelection={createMockSelection({
            cards: [createMockCard({ block: 8, type: 'defense' })],
          })}
          onSelect={onSelect}
          strengthBonus={3}
        />
      );
      // 8 + 3 = 11
      expect(screen.getByText(/🛡️ 11/)).toBeInTheDocument();
    });
  });

  describe('카드 선택', () => {
    it('카드 클릭 시 onSelect 호출', () => {
      render(
        <BreachSelectionModal
          breachSelection={createMockSelection()}
          onSelect={onSelect}
        />
      );

      fireEvent.click(screen.getByText('베기').closest('.breach-card-option')!);
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ name: '베기' }),
        0
      );
    });
  });

  describe('플레쉬 (Fleche) 모드', () => {
    it('sourceCardName 있으면 플레쉬 제목 표시', () => {
      render(
        <BreachSelectionModal
          breachSelection={createMockSelection({ sourceCardName: '찌르기' })}
          onSelect={onSelect}
        />
      );
      expect(screen.getByText('⚔️ 찌르기 - 카드 선택')).toBeInTheDocument();
    });

    it('isLastChain=true이면 마지막 연쇄 경고', () => {
      render(
        <BreachSelectionModal
          breachSelection={createMockSelection({
            sourceCardName: '찌르기',
            isLastChain: true,
          })}
          onSelect={onSelect}
        />
      );
      expect(screen.getByText(/마지막 연쇄/)).toBeInTheDocument();
    });

    it('isLastChain=false이면 연쇄 계속 메시지', () => {
      render(
        <BreachSelectionModal
          breachSelection={createMockSelection({
            sourceCardName: '찌르기',
            isLastChain: false,
          })}
          onSelect={onSelect}
        />
      );
      expect(screen.getByText(/피해 성공 시 다시 창조/)).toBeInTheDocument();
    });
  });

  describe('타임라인 위치 표시', () => {
    it('breachSp + offset으로 삽입 위치 계산', () => {
      render(
        <BreachSelectionModal
          breachSelection={createMockSelection({
            breachSp: 5,
            breachCard: { breachSpOffset: 4 } as any,
          })}
          onSelect={onSelect}
        />
      );
      // 5 + 4 = 9
      expect(screen.getByText(/타임라인 9 위치/)).toBeInTheDocument();
    });

    it('breachSpOffset 없으면 기본값 3 사용', () => {
      render(
        <BreachSelectionModal
          breachSelection={createMockSelection({ breachSp: 2, breachCard: null })}
          onSelect={onSelect}
        />
      );
      // 2 + 3 = 5
      expect(screen.getByText(/타임라인 5 위치/)).toBeInTheDocument();
    });
  });
});
