// @vitest-environment happy-dom
/**
 * @file TraitRewardModal.test.tsx
 * @description TraitRewardModal 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TraitRewardModal } from './TraitRewardModal';

interface TraitOption {
  id: string;
  name: string;
  type: string;
  description: string;
}

// 테스트용 특성 데이터
const mockTraits: TraitOption[] = [
  {
    id: 'quick',
    name: '신속',
    type: 'positive',
    description: '카드 속도 -1',
  },
  {
    id: 'heavy',
    name: '무거움',
    type: 'negative',
    description: '카드 속도 +1, 피해량 +3',
  },
  {
    id: 'vampiric',
    name: '흡혈',
    type: 'positive',
    description: '피해량의 20% 회복',
  },
];

describe('TraitRewardModal', () => {
  const onSelect = vi.fn();
  const onSkip = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('모달 오버레이 렌더링', () => {
      const { container } = render(
        <TraitRewardModal traits={mockTraits} onSelect={onSelect} onSkip={onSkip} />
      );
      // inset: 0 style로 오버레이 확인
      const overlay = container.firstChild as HTMLElement;
      expect(overlay.style.position).toBe('fixed');
    });

    it('제목 표시', () => {
      render(
        <TraitRewardModal traits={mockTraits} onSelect={onSelect} onSkip={onSkip} />
      );
      expect(screen.getByText('✨ 특성 보상')).toBeInTheDocument();
    });

    it('설명 표시', () => {
      render(
        <TraitRewardModal traits={mockTraits} onSelect={onSelect} onSkip={onSkip} />
      );
      expect(screen.getByText(/카드 특화에 사용/)).toBeInTheDocument();
    });
  });

  describe('특성 표시', () => {
    it('모든 특성 옵션 표시', () => {
      render(
        <TraitRewardModal traits={mockTraits} onSelect={onSelect} onSkip={onSkip} />
      );
      expect(screen.getByText('+신속')).toBeInTheDocument();
      expect(screen.getByText('+무거움')).toBeInTheDocument();
      expect(screen.getByText('+흡혈')).toBeInTheDocument();
    });

    it('특성 설명 표시', () => {
      render(
        <TraitRewardModal traits={mockTraits} onSelect={onSelect} onSkip={onSkip} />
      );
      expect(screen.getByText('카드 속도 -1')).toBeInTheDocument();
      expect(screen.getByText('카드 속도 +1, 피해량 +3')).toBeInTheDocument();
      expect(screen.getByText('피해량의 20% 회복')).toBeInTheDocument();
    });
  });

  describe('특성 선택', () => {
    it('특성 클릭 시 onSelect 호출', () => {
      render(
        <TraitRewardModal traits={mockTraits} onSelect={onSelect} onSkip={onSkip} />
      );

      fireEvent.click(screen.getByText('+신속'));
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'quick', name: '신속' })
      );
    });

    it('다른 특성 클릭 시 해당 특성으로 호출', () => {
      render(
        <TraitRewardModal traits={mockTraits} onSelect={onSelect} onSkip={onSkip} />
      );

      fireEvent.click(screen.getByText('+흡혈'));
      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'vampiric' })
      );
    });
  });

  describe('건너뛰기', () => {
    it('건너뛰기 버튼 표시', () => {
      render(
        <TraitRewardModal traits={mockTraits} onSelect={onSelect} onSkip={onSkip} />
      );
      expect(screen.getByText('건너뛰기')).toBeInTheDocument();
    });

    it('건너뛰기 클릭 시 onSkip 호출', () => {
      render(
        <TraitRewardModal traits={mockTraits} onSelect={onSelect} onSkip={onSkip} />
      );

      fireEvent.click(screen.getByText('건너뛰기'));
      expect(onSkip).toHaveBeenCalledTimes(1);
    });
  });

  describe('호버 효과', () => {
    it('mouseEnter 시 배경색 변경', () => {
      render(
        <TraitRewardModal traits={mockTraits} onSelect={onSelect} onSkip={onSkip} />
      );

      const button = screen.getByText('+신속').closest('button') as HTMLElement;
      fireEvent.mouseEnter(button);
      expect(button.style.background).toBe('rgba(134, 239, 172, 0.25)');
    });

    it('mouseLeave 시 배경색 복원', () => {
      render(
        <TraitRewardModal traits={mockTraits} onSelect={onSelect} onSkip={onSkip} />
      );

      const button = screen.getByText('+신속').closest('button') as HTMLElement;
      fireEvent.mouseEnter(button);
      fireEvent.mouseLeave(button);
      expect(button.style.background).toBe('rgba(134, 239, 172, 0.1)');
    });
  });

  describe('빈 특성 목록', () => {
    it('빈 배열도 렌더링', () => {
      render(
        <TraitRewardModal traits={[]} onSelect={onSelect} onSkip={onSkip} />
      );
      expect(screen.getByText('✨ 특성 보상')).toBeInTheDocument();
      expect(screen.getByText('건너뛰기')).toBeInTheDocument();
    });
  });
});
