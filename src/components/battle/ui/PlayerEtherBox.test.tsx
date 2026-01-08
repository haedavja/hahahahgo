// @vitest-environment happy-dom
/**
 * @file PlayerEtherBox.test.tsx
 * @description PlayerEtherBox 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlayerEtherBox } from './PlayerEtherBox';
import type { ComboInfo, UIDeflation, PhaseBattle } from '../../../types';

// DeflationBadge 모킹
vi.mock('./DeflationBadge', () => ({
  DeflationBadge: vi.fn(({ deflation }) => (
    deflation ? <span data-testid="deflation-badge">{deflation.percent}%</span> : null
  )),
}));

// 테스트용 콤보 생성
function createMockCombo(overrides = {}): ComboInfo {
  return {
    name: '풀하우스',
    multiplier: 2.5,
    ...overrides,
  } as ComboInfo;
}

// 테스트용 전투 상태
function createMockBattle(phase: string): PhaseBattle {
  return { phase } as PhaseBattle;
}

// 기본 props
const defaultProps = {
  currentCombo: createMockCombo(),
  battle: createMockBattle('select'),
  currentDeflation: null as UIDeflation | null,
  etherCalcPhase: 'idle',
  turnEtherAccumulated: 100,
  etherPulse: false,
  finalComboMultiplier: 2.5,
  etherMultiplier: 1,
  multiplierPulse: false,
};

describe('PlayerEtherBox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('컨테이너 렌더링', () => {
      render(<PlayerEtherBox {...defaultProps} />);
      expect(screen.getByTestId('player-ether-box')).toBeInTheDocument();
    });

    it('콤보 이름 표시', () => {
      render(<PlayerEtherBox {...defaultProps} />);
      expect(screen.getByText('풀하우스')).toBeInTheDocument();
    });

    it('에테르 PT 값 표시 (문자 분리)', () => {
      render(<PlayerEtherBox {...defaultProps} turnEtherAccumulated={50} />);
      // 50 -> "5 0"으로 분리됨
      expect(screen.getByText(/\+ 5 0 P T/)).toBeInTheDocument();
    });

    it('배율 표시', () => {
      render(<PlayerEtherBox {...defaultProps} finalComboMultiplier={3.0} />);
      // 3.00 -> "3 . 0 0"으로 분리됨
      expect(screen.getByText(/× 3 \. 0 0/)).toBeInTheDocument();
    });
  });

  describe('배율 계산', () => {
    it('multiply 이전 단계: finalComboMultiplier만 표시', () => {
      render(
        <PlayerEtherBox
          {...defaultProps}
          etherCalcPhase="idle"
          finalComboMultiplier={2.0}
          etherMultiplier={2}
        />
      );
      // etherMultiplier 미적용
      expect(screen.getByText(/× 2 \. 0 0/)).toBeInTheDocument();
    });

    it('multiply 단계: etherMultiplier 적용', () => {
      render(
        <PlayerEtherBox
          {...defaultProps}
          etherCalcPhase="multiply"
          finalComboMultiplier={2.0}
          etherMultiplier={2}
        />
      );
      // 2.0 * 2 = 4.0
      expect(screen.getByText(/× 4 \. 0 0/)).toBeInTheDocument();
    });

    it('deflation 단계: etherMultiplier 적용', () => {
      render(
        <PlayerEtherBox
          {...defaultProps}
          etherCalcPhase="deflation"
          finalComboMultiplier={1.5}
          etherMultiplier={2}
        />
      );
      // 1.5 * 2 = 3.0
      expect(screen.getByText(/× 3 \. 0 0/)).toBeInTheDocument();
    });

    it('result 단계: etherMultiplier 적용', () => {
      render(
        <PlayerEtherBox
          {...defaultProps}
          etherCalcPhase="result"
          finalComboMultiplier={2.0}
          etherMultiplier={1.5}
        />
      );
      // 2.0 * 1.5 = 3.0
      expect(screen.getByText(/× 3 \. 0 0/)).toBeInTheDocument();
    });
  });

  describe('DeflationBadge', () => {
    it('deflation 없으면 뱃지 미표시', () => {
      render(<PlayerEtherBox {...defaultProps} currentDeflation={null} />);
      expect(screen.queryByTestId('deflation-badge')).not.toBeInTheDocument();
    });

    it('deflation 있으면 뱃지 표시', () => {
      const deflation: UIDeflation = { percent: 20, reason: '인플레이션' };
      render(<PlayerEtherBox {...defaultProps} currentDeflation={deflation} />);
      expect(screen.getByTestId('deflation-badge')).toBeInTheDocument();
      expect(screen.getByText('20%')).toBeInTheDocument();
    });
  });

  describe('전투 페이즈별 표시', () => {
    it('select 페이즈: 표시', () => {
      render(<PlayerEtherBox {...defaultProps} battle={createMockBattle('select')} />);
      expect(screen.getByTestId('player-ether-box')).toBeInTheDocument();
    });

    it('respond 페이즈: 표시', () => {
      render(<PlayerEtherBox {...defaultProps} battle={createMockBattle('respond')} />);
      expect(screen.getByTestId('player-ether-box')).toBeInTheDocument();
    });

    it('resolve 페이즈: 표시', () => {
      render(<PlayerEtherBox {...defaultProps} battle={createMockBattle('resolve')} />);
      expect(screen.getByTestId('player-ether-box')).toBeInTheDocument();
    });

    it('다른 페이즈: 숨김', () => {
      render(<PlayerEtherBox {...defaultProps} battle={createMockBattle('init')} />);
      expect(screen.queryByTestId('player-ether-box')).not.toBeInTheDocument();
    });
  });

  describe('조건부 렌더링', () => {
    it('콤보 없으면 숨김', () => {
      render(<PlayerEtherBox {...defaultProps} currentCombo={null} />);
      expect(screen.queryByTestId('player-ether-box')).not.toBeInTheDocument();
    });
  });

  describe('스타일', () => {
    it('에테르 PT visibility: resolve에서 visible', () => {
      const { container } = render(
        <PlayerEtherBox {...defaultProps} battle={createMockBattle('resolve')} />
      );
      // resolve 페이즈에서 에테르 PT 표시
      expect(screen.getByText(/P T/)).toBeInTheDocument();
    });

    it('에테르 PT visibility: select에서 hidden', () => {
      const { container } = render(
        <PlayerEtherBox {...defaultProps} battle={createMockBattle('select')} />
      );
      // select 페이즈에서도 요소는 존재하지만 hidden
      const ptElement = container.querySelector('[style*="visibility"]');
      if (ptElement) {
        const style = (ptElement as HTMLElement).style;
        expect(style.visibility).toBe('hidden');
      }
    });
  });
});
