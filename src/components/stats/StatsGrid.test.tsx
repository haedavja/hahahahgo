// @vitest-environment happy-dom
/**
 * @file StatsGrid.test.tsx
 * @description StatsGrid 컴포넌트 테스트
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsGrid, StatItem } from './StatsGrid';
import { STATS_COLORS } from './styles';

describe('StatsGrid', () => {
  const mockItems: StatItem[] = [
    { label: '승리', value: 10 },
    { label: '패배', value: 5 },
    { label: '승률', value: '66.7%' },
  ];

  describe('기본 렌더링', () => {
    it('모든 아이템 표시', () => {
      render(<StatsGrid items={mockItems} />);
      expect(screen.getByText('승리')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('패배')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('승률')).toBeInTheDocument();
      expect(screen.getByText('66.7%')).toBeInTheDocument();
    });

    it('빈 배열 처리', () => {
      const { container } = render(<StatsGrid items={[]} />);
      expect(container.firstChild?.childNodes.length).toBe(0);
    });

    it('React 노드 값 표시', () => {
      const itemsWithNode: StatItem[] = [
        { label: '복합', value: <span data-testid="node-value">복합 값</span> },
      ];
      render(<StatsGrid items={itemsWithNode} />);
      expect(screen.getByTestId('node-value')).toBeInTheDocument();
    });
  });

  describe('그리드 레이아웃', () => {
    it('기본 그리드 스타일 적용', () => {
      const { container } = render(<StatsGrid items={mockItems} />);
      const grid = container.firstChild as HTMLElement;
      expect(grid).toHaveStyle({ display: 'grid' });
    });

    it('커스텀 컬럼 수 적용', () => {
      const { container } = render(<StatsGrid items={mockItems} columns={2} />);
      const grid = container.firstChild as HTMLElement;
      expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(2, 1fr)' });
    });

    it('컬럼 미지정 시 auto-fit 적용', () => {
      const { container } = render(<StatsGrid items={mockItems} />);
      const grid = container.firstChild as HTMLElement;
      expect(grid.style.gridTemplateColumns).toContain('auto-fit');
    });
  });

  describe('색상', () => {
    it('기본 값 색상', () => {
      const items: StatItem[] = [{ label: '기본', value: '테스트값' }];
      render(<StatsGrid items={items} />);
      const valueElement = screen.getByText('테스트값');
      expect(valueElement).toHaveStyle({ color: STATS_COLORS.value });
    });

    it('커스텀 값 색상', () => {
      const customColor = '#22c55e';
      const items: StatItem[] = [{ label: '성공', value: '성공값', valueColor: customColor }];
      render(<StatsGrid items={items} />);
      const valueElement = screen.getByText('성공값');
      expect(valueElement).toHaveStyle({ color: customColor });
    });
  });

  describe('다양한 데이터', () => {
    it('숫자 0 표시', () => {
      const items: StatItem[] = [{ label: '제로', value: 0 }];
      render(<StatsGrid items={items} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('긴 라벨과 값', () => {
      const items: StatItem[] = [{ label: '매우 긴 라벨 텍스트입니다', value: '매우 긴 값 텍스트입니다' }];
      render(<StatsGrid items={items} />);
      expect(screen.getByText('매우 긴 라벨 텍스트입니다')).toBeInTheDocument();
      expect(screen.getByText('매우 긴 값 텍스트입니다')).toBeInTheDocument();
    });
  });
});
