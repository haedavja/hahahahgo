// @vitest-environment happy-dom
/**
 * @file BattleIcons.test.tsx
 * @description BattleIcons SVG 컴포넌트 테스트
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Sword,
  Shield,
  Heart,
  Zap,
  Flame,
  Clock,
  Skull,
  X,
  ChevronUp,
  ChevronDown,
  Play,
  StepForward,
  RefreshCw,
  ICON_MAP,
} from './BattleIcons';

describe('BattleIcons', () => {
  describe('기본 렌더링', () => {
    it.each([
      ['Sword', Sword],
      ['Shield', Shield],
      ['Heart', Heart],
      ['Zap', Zap],
      ['Flame', Flame],
      ['Clock', Clock],
      ['Skull', Skull],
      ['X', X],
      ['ChevronUp', ChevronUp],
      ['ChevronDown', ChevronDown],
      ['Play', Play],
      ['StepForward', StepForward],
      ['RefreshCw', RefreshCw],
    ])('%s 아이콘 렌더링', (name, Icon) => {
      const { container } = render(<Icon />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('크기 props', () => {
    it('기본 크기 24', () => {
      const { container } = render(<Sword />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '24');
      expect(svg).toHaveAttribute('height', '24');
    });

    it('커스텀 크기 적용', () => {
      const { container } = render(<Sword size={32} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '32');
      expect(svg).toHaveAttribute('height', '32');
    });

    it('작은 크기', () => {
      const { container } = render(<Shield size={16} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '16');
      expect(svg).toHaveAttribute('height', '16');
    });
  });

  describe('className props', () => {
    it('기본 className 빈 문자열', () => {
      const { container } = render(<Heart />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('class', '');
    });

    it('커스텀 className 적용', () => {
      const { container } = render(<Heart className="icon-red" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('class', 'icon-red');
    });

    it('다중 className', () => {
      const { container } = render(<Zap className="icon-lg icon-yellow" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('class', 'icon-lg icon-yellow');
    });
  });

  describe('SVG 속성', () => {
    it('viewBox 속성', () => {
      const { container } = render(<Flame />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    });

    it('stroke 속성', () => {
      const { container } = render(<Clock />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('stroke', 'currentColor');
    });

    it('fill 속성', () => {
      const { container } = render(<Skull />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('fill', 'none');
    });

    it('strokeWidth 속성', () => {
      const { container } = render(<X />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('stroke-width', '2');
    });
  });

  describe('ICON_MAP', () => {
    it('sword 매핑', () => {
      expect(ICON_MAP.sword).toBe(Sword);
    });

    it('shield 매핑', () => {
      expect(ICON_MAP.shield).toBe(Shield);
    });

    it('flame 매핑', () => {
      expect(ICON_MAP.flame).toBe(Flame);
    });

    it('heart 매핑', () => {
      expect(ICON_MAP.heart).toBe(Heart);
    });

    it('zap 매핑', () => {
      expect(ICON_MAP.zap).toBe(Zap);
    });

    it('clock 매핑', () => {
      expect(ICON_MAP.clock).toBe(Clock);
    });

    it('ICON_MAP을 통한 렌더링', () => {
      const IconComponent = ICON_MAP.sword;
      const { container } = render(<IconComponent size={20} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '20');
    });
  });
});
