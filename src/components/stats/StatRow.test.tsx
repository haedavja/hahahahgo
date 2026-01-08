// @vitest-environment happy-dom
/**
 * @file StatRow.test.tsx
 * @description StatRow 컴포넌트 테스트
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatRow } from './StatRow';
import { STATS_COLORS } from './styles';

describe('StatRow', () => {
  describe('기본 렌더링', () => {
    it('라벨과 값을 표시', () => {
      render(<StatRow label="테스트 라벨" value="테스트 값" />);
      expect(screen.getByText('테스트 라벨')).toBeInTheDocument();
      expect(screen.getByText('테스트 값')).toBeInTheDocument();
    });

    it('숫자 값 표시', () => {
      render(<StatRow label="점수" value={100} />);
      expect(screen.getByText('점수')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('React 노드를 값으로 표시', () => {
      render(<StatRow label="복합 값" value={<span data-testid="complex">복합</span>} />);
      expect(screen.getByTestId('complex')).toBeInTheDocument();
    });
  });

  describe('스타일', () => {
    it('기본 값 색상 적용', () => {
      const { container } = render(<StatRow label="라벨" value="값" />);
      const valueSpan = container.querySelectorAll('span')[1];
      expect(valueSpan).toHaveStyle({ color: STATS_COLORS.value });
    });

    it('커스텀 값 색상 적용', () => {
      const customColor = '#ff0000';
      const { container } = render(<StatRow label="라벨" value="값" valueColor={customColor} />);
      const valueSpan = container.querySelectorAll('span')[1];
      expect(valueSpan).toHaveStyle({ color: customColor });
    });

    it('flex 레이아웃 적용', () => {
      const { container } = render(<StatRow label="라벨" value="값" />);
      const row = container.firstChild as HTMLElement;
      expect(row).toHaveStyle({ display: 'flex', justifyContent: 'space-between' });
    });
  });

  describe('엣지 케이스', () => {
    it('빈 문자열 값', () => {
      render(<StatRow label="빈 값" value="" />);
      expect(screen.getByText('빈 값')).toBeInTheDocument();
    });

    it('0 값', () => {
      render(<StatRow label="제로" value={0} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });
});
