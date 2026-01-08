// @vitest-environment happy-dom
/**
 * @file EtherComparisonBar.test.tsx
 * @description EtherComparisonBar 컴포넌트 테스트
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EtherComparisonBar } from './EtherComparisonBar';
import type { EtherComparisonBattle } from '../../../types';

describe('EtherComparisonBar', () => {
  const defaultBattle: EtherComparisonBattle = {
    phase: 'resolve',
  };

  const defaultProps = {
    battle: defaultBattle,
    etherFinalValue: 100,
    enemyEtherFinalValue: 80,
    netFinalEther: 20,
  };

  describe('기본 렌더링', () => {
    it('resolve 단계에서 표시', () => {
      const { container } = render(<EtherComparisonBar {...defaultProps} />);
      expect(container.firstChild).not.toBeNull();
    });

    it('resolve가 아닌 단계에서는 null 반환', () => {
      const { container } = render(
        <EtherComparisonBar
          {...defaultProps}
          battle={{ phase: 'select' }}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('etherFinalValue가 null이면 null 반환', () => {
      const { container } = render(
        <EtherComparisonBar
          {...defaultProps}
          etherFinalValue={null}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('enemyEtherFinalValue가 null이면 null 반환', () => {
      const { container } = render(
        <EtherComparisonBar
          {...defaultProps}
          enemyEtherFinalValue={null}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('에테르 값 표시', () => {
    it('플레이어 에테르 표시', () => {
      render(<EtherComparisonBar {...defaultProps} />);
      expect(screen.getByText('100 P T')).toBeInTheDocument();
    });

    it('적 에테르 표시', () => {
      render(<EtherComparisonBar {...defaultProps} />);
      expect(screen.getByText('80 P T')).toBeInTheDocument();
    });

    it('순 에테르 차이 표시', () => {
      render(<EtherComparisonBar {...defaultProps} />);
      expect(screen.getByText('Δ 20 P T')).toBeInTheDocument();
    });

    it('큰 숫자는 천 단위 구분자 적용', () => {
      render(
        <EtherComparisonBar
          {...defaultProps}
          etherFinalValue={1000}
          enemyEtherFinalValue={500}
          netFinalEther={500}
        />
      );
      expect(screen.getByText('1,000 P T')).toBeInTheDocument();
      expect(screen.getByText('Δ 500 P T')).toBeInTheDocument();
    });
  });

  describe('position 속성', () => {
    it('기본값은 top', () => {
      const { container } = render(<EtherComparisonBar {...defaultProps} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.position).toBe('absolute');
    });

    it('position=bottom이면 fixed', () => {
      const { container } = render(
        <EtherComparisonBar {...defaultProps} position="bottom" />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.position).toBe('fixed');
    });
  });

  describe('스타일', () => {
    it('flexbox 레이아웃', () => {
      const { container } = render(<EtherComparisonBar {...defaultProps} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.display).toBe('flex');
    });
  });

  describe('음수 차이', () => {
    it('음수 순 에테르 차이 표시', () => {
      render(
        <EtherComparisonBar
          {...defaultProps}
          etherFinalValue={50}
          enemyEtherFinalValue={100}
          netFinalEther={-50}
        />
      );
      expect(screen.getByText('Δ -50 P T')).toBeInTheDocument();
    });
  });
});
