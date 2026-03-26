/**
 * @file ConfidenceBadge.test.tsx
 * @description ConfidenceBadge 컴포넌트 테스트
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConfidenceBadge, WinRateWithCI } from './ConfidenceBadge';

describe('ConfidenceBadge', () => {
  describe('신뢰도 레벨 표시', () => {
    it('샘플 100개 이상: 매우 높음', () => {
      render(<ConfidenceBadge sampleSize={100} />);
      expect(screen.getByText('매우 높음')).toBeInTheDocument();
    });

    it('샘플 50-99개: 높음', () => {
      render(<ConfidenceBadge sampleSize={75} />);
      expect(screen.getByText('높음')).toBeInTheDocument();
    });

    it('샘플 20-49개: 보통', () => {
      render(<ConfidenceBadge sampleSize={30} />);
      expect(screen.getByText('보통')).toBeInTheDocument();
    });

    it('샘플 10-19개: 낮음', () => {
      render(<ConfidenceBadge sampleSize={15} />);
      expect(screen.getByText('낮음')).toBeInTheDocument();
    });

    it('샘플 10개 미만: 매우 낮음', () => {
      render(<ConfidenceBadge sampleSize={5} />);
      expect(screen.getByText('매우 낮음')).toBeInTheDocument();
    });
  });

  describe('크기 옵션', () => {
    it('small 크기 (기본)', () => {
      const { container } = render(<ConfidenceBadge sampleSize={100} size="small" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.style.fontSize).toBe('9px');
    });

    it('medium 크기', () => {
      const { container } = render(<ConfidenceBadge sampleSize={100} size="medium" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.style.fontSize).toBe('10px');
    });
  });

  describe('툴팁', () => {
    it('툴팁 표시 (showTooltip=true)', () => {
      const { container } = render(<ConfidenceBadge sampleSize={100} showTooltip={true} />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.title).toContain('신뢰도');
      expect(badge.title).toContain('n=100');
    });

    it('샘플 부족 시 경고 메시지', () => {
      const { container } = render(<ConfidenceBadge sampleSize={5} showTooltip={true} />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.title).toContain('매우 적어');
    });
  });
});

describe('WinRateWithCI', () => {
  describe('승률 표시', () => {
    it('50% 승률 표시', () => {
      render(<WinRateWithCI wins={50} total={100} showBadge={false} />);
      expect(screen.getByText('50.0%')).toBeInTheDocument();
    });

    it('0% 승률 (전투 없음)', () => {
      render(<WinRateWithCI wins={0} total={0} showBadge={false} />);
      expect(screen.getByText('0.0%')).toBeInTheDocument();
    });
  });

  describe('신뢰 구간 표시', () => {
    it('showCI=true일 때 구간 표시', () => {
      render(<WinRateWithCI wins={50} total={100} showCI={true} showBadge={false} />);
      // 50% 승률의 95% 신뢰 구간은 대략 40-60%
      const ciText = screen.getByText(/\[\d+-\d+%\]/);
      expect(ciText).toBeInTheDocument();
    });

    it('showCI=false일 때 구간 미표시', () => {
      render(<WinRateWithCI wins={50} total={100} showCI={false} showBadge={false} />);
      expect(screen.queryByText(/\[.*%\]/)).not.toBeInTheDocument();
    });

    it('total=0일 때 구간 미표시', () => {
      render(<WinRateWithCI wins={0} total={0} showCI={true} showBadge={false} />);
      expect(screen.queryByText(/\[.*%\]/)).not.toBeInTheDocument();
    });
  });

  describe('신뢰도 배지 표시', () => {
    it('showBadge=true일 때 배지 표시', () => {
      render(<WinRateWithCI wins={50} total={100} showBadge={true} />);
      expect(screen.getByText('매우 높음')).toBeInTheDocument();
    });

    it('showBadge=false일 때 배지 미표시', () => {
      render(<WinRateWithCI wins={50} total={100} showBadge={false} />);
      expect(screen.queryByText('매우 높음')).not.toBeInTheDocument();
    });
  });

  describe('색상', () => {
    it('승률 50% 이상: 녹색', () => {
      const { container } = render(<WinRateWithCI wins={60} total={100} showBadge={false} />);
      const valueSpan = container.querySelector('span[style*="color"]');
      expect(valueSpan).toHaveStyle({ color: '#22c55e' });
    });

    it('승률 50% 미만: 빨간색', () => {
      const { container } = render(<WinRateWithCI wins={40} total={100} showBadge={false} />);
      const valueSpan = container.querySelector('span[style*="color"]');
      expect(valueSpan).toHaveStyle({ color: '#ef4444' });
    });

    it('커스텀 색상 적용', () => {
      const { container } = render(<WinRateWithCI wins={50} total={100} showBadge={false} valueColor="#fbbf24" />);
      const valueSpan = container.querySelector('span[style*="color"]');
      expect(valueSpan).toHaveStyle({ color: '#fbbf24' });
    });
  });
});
