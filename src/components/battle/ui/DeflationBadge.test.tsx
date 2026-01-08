// @vitest-environment happy-dom
/**
 * @file DeflationBadge.test.tsx
 * @description DeflationBadge 컴포넌트 테스트
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeflationBadge } from './DeflationBadge';
import type { UIDeflation } from '../../../types';

// 테스트용 deflation 객체 생성
function createDeflation(multiplier: number): UIDeflation {
  return {
    multiplier,
    reason: 'test',
  };
}

describe('DeflationBadge', () => {
  describe('렌더링', () => {
    it('감쇄율 0% 표시 (multiplier: 1)', () => {
      render(<DeflationBadge deflation={createDeflation(1)} isActive={false} />);
      expect(screen.getByText('-0%')).toBeInTheDocument();
    });

    it('감쇄율 50% 표시 (multiplier: 0.5)', () => {
      render(<DeflationBadge deflation={createDeflation(0.5)} isActive={false} />);
      expect(screen.getByText('-50%')).toBeInTheDocument();
    });

    it('감쇄율 25% 표시 (multiplier: 0.75)', () => {
      render(<DeflationBadge deflation={createDeflation(0.75)} isActive={false} />);
      expect(screen.getByText('-25%')).toBeInTheDocument();
    });

    it('deflation이 null이면 null 반환', () => {
      const { container } = render(<DeflationBadge deflation={null} isActive={false} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('활성화 상태', () => {
    it('isActive=true일 때 스케일 증가', () => {
      const { container } = render(<DeflationBadge deflation={createDeflation(0.5)} isActive={true} />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.style.transform).toBe('scale(1.2)');
      expect(badge.style.fontSize).toBe('1.1rem');
    });

    it('isActive=false일 때 기본 스케일', () => {
      const { container } = render(<DeflationBadge deflation={createDeflation(0.5)} isActive={false} />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.style.transform).toBe('scale(1)');
      expect(badge.style.fontSize).toBe('0.9rem');
    });
  });

  describe('위치', () => {
    it('기본 위치 (left)', () => {
      const { container } = render(<DeflationBadge deflation={createDeflation(0.5)} isActive={false} />);
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveStyle({ left: 'calc(50% + 120px)' });
    });

    it('오른쪽 위치', () => {
      const { container } = render(<DeflationBadge deflation={createDeflation(0.5)} isActive={false} position="right" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveStyle({ right: 'calc(50% + 120px)' });
    });
  });

  describe('스타일', () => {
    it('position: absolute 적용', () => {
      const { container } = render(<DeflationBadge deflation={createDeflation(0.5)} isActive={false} />);
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveStyle({ position: 'absolute' });
    });

    it('fontWeight: bold 적용', () => {
      const { container } = render(<DeflationBadge deflation={createDeflation(0.5)} isActive={false} />);
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveStyle({ fontWeight: 'bold' });
    });
  });

  describe('엣지 케이스', () => {
    it('100% 감쇄 (multiplier: 0)', () => {
      render(<DeflationBadge deflation={createDeflation(0)} isActive={false} />);
      expect(screen.getByText('-100%')).toBeInTheDocument();
    });

    it('소수점 반올림', () => {
      // 0.333 -> 67% (1 - 0.333 = 0.667 -> 67%)
      render(<DeflationBadge deflation={createDeflation(0.333)} isActive={false} />);
      expect(screen.getByText('-67%')).toBeInTheDocument();
    });
  });
});
