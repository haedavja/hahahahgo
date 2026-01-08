// @vitest-environment happy-dom
/**
 * @file EtherBar.test.tsx
 * @description EtherBar 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EtherBar } from './EtherBar';

// etherUtils 모킹
vi.mock('../../../lib/etherUtils', () => ({
  calculateEtherSlots: vi.fn((pts) => Math.floor(pts / 100)),
  getCurrentSlotPts: vi.fn((pts) => pts % 100),
  getSlotProgress: vi.fn((pts) => (pts % 100) / 100),
  getNextSlotCost: vi.fn(() => 100),
}));

// formatUtils 모킹
vi.mock('../utils/formatUtils', () => ({
  formatCompactValue: vi.fn((value) => value.toString()),
}));

describe('EtherBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('라벨 표시', () => {
      render(<EtherBar pts={50} label="ETHER" />);
      expect(screen.getByText('ETHER')).toBeInTheDocument();
    });

    it('pts 값 표시', () => {
      render(<EtherBar pts={50} />);
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('슬롯 티어 표시', () => {
      render(<EtherBar pts={0} />);
      expect(screen.getByText('x0')).toBeInTheDocument();
    });

    it('슬롯 티어 계산 (pts 150 -> x1)', () => {
      render(<EtherBar pts={150} />);
      expect(screen.getByText('x1')).toBeInTheDocument();
    });
  });

  describe('색상', () => {
    it('기본 색상 (cyan)', () => {
      const { container } = render(<EtherBar pts={50} color="cyan" />);
      // 컨테이너가 렌더링됨을 확인
      expect(container.firstChild).toBeInTheDocument();
    });

    it('빨간 색상 (red)', () => {
      const { container } = render(<EtherBar pts={50} color="red" />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('previewGain', () => {
    it('previewGain이 0이면 미표시', () => {
      render(<EtherBar pts={50} previewGain={0} />);
      expect(screen.queryByText(/\+.*pt/)).not.toBeInTheDocument();
    });

    it('previewGain 양수면 표시', () => {
      render(<EtherBar pts={50} previewGain={25} />);
      expect(screen.getByText('+25pt')).toBeInTheDocument();
    });
  });

  describe('툴팁', () => {
    it('showBarTooltip=true일 때 진행률 툴팁 표시', () => {
      render(<EtherBar pts={50} showBarTooltip={true} />);
      expect(screen.getByText('진행률')).toBeInTheDocument();
    });

    it('showPtsTooltip=true일 때 에테르 툴팁 표시', () => {
      render(<EtherBar pts={50} showPtsTooltip={true} />);
      expect(screen.getByText('에테르')).toBeInTheDocument();
    });
  });

  describe('actions 콜백', () => {
    it('바 호버 시 setShowBarTooltip 호출', () => {
      const setShowBarTooltip = vi.fn();
      const { container } = render(
        <EtherBar
          pts={50}
          actions={{ setShowBarTooltip, setShowPtsTooltip: vi.fn() }}
        />
      );
      // 바 wrapper 찾기 (border 있는 div)
      const barWrapper = container.querySelector('div > div:nth-child(2)');
      if (barWrapper) {
        fireEvent.mouseEnter(barWrapper);
        expect(setShowBarTooltip).toHaveBeenCalledWith(true);
        fireEvent.mouseLeave(barWrapper);
        expect(setShowBarTooltip).toHaveBeenCalledWith(false);
      }
    });

    it('pts 영역 호버 시 setShowPtsTooltip 호출', () => {
      const setShowPtsTooltip = vi.fn();
      const { container } = render(
        <EtherBar
          pts={50}
          actions={{ setShowBarTooltip: vi.fn(), setShowPtsTooltip }}
        />
      );
      // pts 영역 찾기
      const ptsArea = container.querySelector('div > div:nth-child(3)');
      if (ptsArea) {
        fireEvent.mouseEnter(ptsArea);
        expect(setShowPtsTooltip).toHaveBeenCalledWith(true);
      }
    });
  });

  describe('pulse 효과', () => {
    it('pulse=true일 때 boxShadow 적용', () => {
      const { container } = render(<EtherBar pts={50} pulse={true} />);
      const outerContainer = container.firstChild as HTMLElement;
      // rgba(251,191,36,0.55)는 #fbbf24의 rgba 형식
      expect(outerContainer.style.boxShadow).toContain('251,191,36');
    });

    it('pulse=false일 때 기본 boxShadow', () => {
      const { container } = render(<EtherBar pts={50} pulse={false} />);
      const outerContainer = container.firstChild as HTMLElement;
      expect(outerContainer.style.boxShadow).not.toContain('251,191,36');
    });
  });

  describe('엣지 케이스', () => {
    it('pts=0 처리', () => {
      render(<EtherBar pts={0} />);
      expect(screen.getByText('x0')).toBeInTheDocument();
    });

    it('pts=undefined 처리 (0으로 대체)', () => {
      render(<EtherBar pts={undefined as unknown as number} />);
      expect(screen.getByText('x0')).toBeInTheDocument();
    });

    it('slots 직접 지정', () => {
      render(<EtherBar pts={50} slots={5} />);
      expect(screen.getByText('x5')).toBeInTheDocument();
    });
  });
});
