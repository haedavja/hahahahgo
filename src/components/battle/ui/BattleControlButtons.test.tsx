// @vitest-environment happy-dom
/**
 * @file BattleControlButtons.test.tsx
 * @description BattleControlButtons 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BattleControlButtons } from './BattleControlButtons';

// 사운드 유틸 모킹
vi.mock('../../../lib/soundUtils', () => ({
  playSound: vi.fn(),
}));

describe('BattleControlButtons', () => {
  const defaultProps = {
    isSimplified: false,
    sortType: 'speed' as const,
    devForceAllCards: false,
    setIsSimplified: vi.fn(),
    cycleSortType: vi.fn(),
    setDevForceAllCards: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('기본 렌더링', () => {
    it('간소화 버튼 표시', () => {
      render(<BattleControlButtons {...defaultProps} />);
      expect(screen.getByText(/간소화/)).toBeInTheDocument();
    });

    it('정렬 버튼 표시', () => {
      render(<BattleControlButtons {...defaultProps} />);
      expect(screen.getByText(/정렬/)).toBeInTheDocument();
    });

    it('DEV 버튼 표시', () => {
      render(<BattleControlButtons {...defaultProps} />);
      expect(screen.getByText(/DEV/)).toBeInTheDocument();
    });
  });

  describe('간소화 버튼', () => {
    it('비활성화 상태 표시', () => {
      render(<BattleControlButtons {...defaultProps} isSimplified={false} />);
      expect(screen.getByText(/📄/)).toBeInTheDocument();
    });

    it('활성화 상태 표시', () => {
      render(<BattleControlButtons {...defaultProps} isSimplified={true} />);
      expect(screen.getByText(/📋/)).toBeInTheDocument();
    });

    it('클릭 시 setIsSimplified 호출', () => {
      render(<BattleControlButtons {...defaultProps} />);
      fireEvent.click(screen.getByText(/간소화/));
      expect(defaultProps.setIsSimplified).toHaveBeenCalledWith(true);
    });

    it('localStorage에 상태 저장', () => {
      render(<BattleControlButtons {...defaultProps} />);
      fireEvent.click(screen.getByText(/간소화/));
      expect(localStorage.getItem('battleIsSimplified')).toBe('true');
    });
  });

  describe('정렬 버튼', () => {
    it('현재 정렬 타입 표시 (speed)', () => {
      render(<BattleControlButtons {...defaultProps} sortType="speed" />);
      expect(screen.getByText(/시간/)).toBeInTheDocument();
    });

    it('현재 정렬 타입 표시 (cost)', () => {
      render(<BattleControlButtons {...defaultProps} sortType="cost" />);
      expect(screen.getByText(/비용/)).toBeInTheDocument();
    });

    it('현재 정렬 타입 표시 (type)', () => {
      render(<BattleControlButtons {...defaultProps} sortType="type" />);
      expect(screen.getByText(/종류/)).toBeInTheDocument();
    });

    it('클릭 시 cycleSortType 호출', () => {
      render(<BattleControlButtons {...defaultProps} />);
      fireEvent.click(screen.getByText(/정렬/));
      expect(defaultProps.cycleSortType).toHaveBeenCalled();
    });
  });

  describe('DEV 버튼', () => {
    it('비활성화 상태 표시', () => {
      render(<BattleControlButtons {...defaultProps} devForceAllCards={false} />);
      expect(screen.getByText(/OFF/)).toBeInTheDocument();
    });

    it('활성화 상태 표시', () => {
      render(<BattleControlButtons {...defaultProps} devForceAllCards={true} />);
      expect(screen.getByText(/ON/)).toBeInTheDocument();
    });

    it('클릭 시 setDevForceAllCards 호출', () => {
      render(<BattleControlButtons {...defaultProps} />);
      fireEvent.click(screen.getByText(/DEV/));
      expect(defaultProps.setDevForceAllCards).toHaveBeenCalledWith(true);
    });
  });

  describe('스타일', () => {
    it('버튼 그룹 컨테이너', () => {
      const { container } = render(<BattleControlButtons {...defaultProps} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.display).toBe('flex');
      expect(wrapper.style.flexDirection).toBe('column');
    });
  });
});
