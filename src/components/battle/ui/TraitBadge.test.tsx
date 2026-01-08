// @vitest-environment happy-dom
/**
 * @file TraitBadge.test.tsx
 * @description TraitBadge, TraitBadgeList 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TraitBadge, TraitBadgeList } from './TraitBadge';

// TRAITS 데이터 모킹
vi.mock('../battleData', () => ({
  TRAITS: {
    quick: {
      id: 'quick',
      name: '신속',
      type: 'positive',
      weight: 1,
      description: '빠른 카드',
    },
    heavy: {
      id: 'heavy',
      name: '무거움',
      type: 'negative',
      weight: 1,
      description: '느린 카드',
    },
    sharp: {
      id: 'sharp',
      name: '날카로움',
      type: 'positive',
      weight: 1,
      description: '날카로운 카드',
    },
  },
}));

describe('TraitBadge', () => {
  describe('렌더링', () => {
    it('positive 특성 배지 표시', () => {
      render(<TraitBadge traitId="quick" />);
      expect(screen.getByText('신속')).toBeInTheDocument();
    });

    it('negative 특성 배지 표시', () => {
      render(<TraitBadge traitId="heavy" />);
      expect(screen.getByText('무거움')).toBeInTheDocument();
    });

    it('존재하지 않는 특성은 null 반환', () => {
      const { container } = render(<TraitBadge traitId="nonexistent" />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('스타일', () => {
    it('positive 특성 녹색 스타일', () => {
      render(<TraitBadge traitId="quick" />);
      const badge = screen.getByText('신속');
      expect(badge).toHaveStyle({ color: '#22c55e' });
    });

    it('negative 특성 빨간색 스타일', () => {
      render(<TraitBadge traitId="heavy" />);
      const badge = screen.getByText('무거움');
      expect(badge).toHaveStyle({ color: '#ef4444' });
    });
  });
});

describe('TraitBadgeList', () => {
  describe('렌더링', () => {
    it('여러 특성 배지 표시', () => {
      render(<TraitBadgeList traits={['quick', 'heavy', 'sharp']} />);
      expect(screen.getByText('신속')).toBeInTheDocument();
      expect(screen.getByText('무거움')).toBeInTheDocument();
      expect(screen.getByText('날카로움')).toBeInTheDocument();
    });

    it('빈 배열은 null 반환', () => {
      const { container } = render(<TraitBadgeList traits={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('null은 null 반환', () => {
      const { container } = render(<TraitBadgeList traits={null} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('스타일', () => {
    it('flex 레이아웃 적용', () => {
      const { container } = render(<TraitBadgeList traits={['quick']} />);
      const list = container.firstChild as HTMLElement;
      expect(list).toHaveStyle({ display: 'flex', gap: '4px' });
    });
  });

  describe('혼합 특성', () => {
    it('positive와 negative 혼합', () => {
      render(<TraitBadgeList traits={['quick', 'heavy']} />);
      const quick = screen.getByText('신속');
      const heavy = screen.getByText('무거움');
      expect(quick).toHaveStyle({ color: '#22c55e' });
      expect(heavy).toHaveStyle({ color: '#ef4444' });
    });
  });
});
