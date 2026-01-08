// @vitest-environment happy-dom
/**
 * @file SectionTitle.test.tsx
 * @description SectionTitle 컴포넌트 테스트
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SectionTitle } from './SectionTitle';

describe('SectionTitle', () => {
  describe('기본 렌더링', () => {
    it('자식 텍스트 표시', () => {
      render(<SectionTitle>섹션 제목</SectionTitle>);
      expect(screen.getByText('섹션 제목')).toBeInTheDocument();
    });

    it('h3 태그로 렌더링', () => {
      render(<SectionTitle>제목</SectionTitle>);
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });

    it('React 노드를 자식으로 표시', () => {
      render(
        <SectionTitle>
          <span data-testid="child">복합 제목</span>
        </SectionTitle>
      );
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });
  });

  describe('색상', () => {
    it('기본 색상 (황금색)', () => {
      const { container } = render(<SectionTitle>제목</SectionTitle>);
      const h3 = container.querySelector('h3');
      expect(h3).toHaveStyle({ color: '#fbbf24' });
    });

    it('커스텀 색상 적용', () => {
      const customColor = '#22c55e';
      const { container } = render(<SectionTitle color={customColor}>제목</SectionTitle>);
      const h3 = container.querySelector('h3');
      expect(h3).toHaveStyle({ color: customColor });
    });
  });

  describe('이모지', () => {
    it('이모지 표시', () => {
      render(<SectionTitle emoji="🎯">타겟</SectionTitle>);
      expect(screen.getByText(/🎯/)).toBeInTheDocument();
      expect(screen.getByText(/타겟/)).toBeInTheDocument();
    });

    it('이모지 없이 렌더링', () => {
      render(<SectionTitle>이모지 없음</SectionTitle>);
      const heading = screen.getByRole('heading');
      expect(heading.textContent).toBe('이모지 없음');
    });

    it('이모지와 제목 사이 공백', () => {
      render(<SectionTitle emoji="⚡">에너지</SectionTitle>);
      const heading = screen.getByRole('heading');
      expect(heading.textContent).toBe('⚡ 에너지');
    });
  });
});
