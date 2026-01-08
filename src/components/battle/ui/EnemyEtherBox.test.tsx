// @vitest-environment happy-dom
/**
 * @file EnemyEtherBox.test.tsx
 * @description EnemyEtherBox 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnemyEtherBox } from './EnemyEtherBox';
import type { ComboInfo, InsightReveal, UIDeflation, PhaseBattle } from '../../../types';

// DeflationBadge 모킹
vi.mock('./DeflationBadge', () => ({
  DeflationBadge: vi.fn(({ deflation }) => (
    deflation ? <span data-testid="deflation-badge">{deflation.percent}%</span> : null
  )),
}));

// 테스트용 콤보 생성
function createMockCombo(name = '투페어'): ComboInfo {
  return {
    name,
    multiplier: 1.5,
  } as ComboInfo;
}

// 테스트용 전투 상태
function createMockBattle(phase: string): PhaseBattle {
  return { phase } as PhaseBattle;
}

// 콤보 배율 맵
const COMBO_MULTIPLIERS: Record<string, number> = {
  '하이카드': 1.0,
  '원페어': 1.2,
  '투페어': 1.5,
  '트리플': 2.0,
  '스트레이트': 2.5,
  '풀하우스': 3.0,
};

// 기본 props
const defaultProps = {
  enemyCombo: createMockCombo(),
  battle: createMockBattle('resolve'),
  insightReveal: null as InsightReveal | null,
  enemyCurrentDeflation: null as UIDeflation | null,
  enemyEtherCalcPhase: 'idle',
  enemyTurnEtherAccumulated: 75,
  COMBO_MULTIPLIERS,
};

describe('EnemyEtherBox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('컨테이너 렌더링', () => {
      render(<EnemyEtherBox {...defaultProps} />);
      expect(screen.getByTestId('enemy-ether-box')).toBeInTheDocument();
    });

    it('콤보 이름 표시', () => {
      render(<EnemyEtherBox {...defaultProps} />);
      expect(screen.getByText('투페어')).toBeInTheDocument();
    });

    it('에테르 PT 값 표시 (문자 분리)', () => {
      render(<EnemyEtherBox {...defaultProps} enemyTurnEtherAccumulated={42} />);
      expect(screen.getByText(/\+ 4 2 P T/)).toBeInTheDocument();
    });

    it('배율 표시', () => {
      render(<EnemyEtherBox {...defaultProps} enemyCombo={createMockCombo('풀하우스')} />);
      // 3.00 -> "3 . 0 0"
      expect(screen.getByText(/× 3 \. 0 0/)).toBeInTheDocument();
    });
  });

  describe('DeflationBadge', () => {
    it('deflation 없으면 뱃지 미표시', () => {
      render(<EnemyEtherBox {...defaultProps} enemyCurrentDeflation={null} />);
      expect(screen.queryByTestId('deflation-badge')).not.toBeInTheDocument();
    });

    it('deflation 있으면 뱃지 표시', () => {
      const deflation: UIDeflation = { percent: 15, reason: '디플레이션' };
      render(<EnemyEtherBox {...defaultProps} enemyCurrentDeflation={deflation} />);
      expect(screen.getByTestId('deflation-badge')).toBeInTheDocument();
      expect(screen.getByText('15%')).toBeInTheDocument();
    });
  });

  describe('전투 페이즈별 표시', () => {
    it('resolve 페이즈: 표시', () => {
      render(<EnemyEtherBox {...defaultProps} battle={createMockBattle('resolve')} />);
      expect(screen.getByTestId('enemy-ether-box')).toBeInTheDocument();
    });

    it('respond 페이즈: 표시', () => {
      render(<EnemyEtherBox {...defaultProps} battle={createMockBattle('respond')} />);
      expect(screen.getByTestId('enemy-ether-box')).toBeInTheDocument();
    });

    it('select 페이즈 + insightReveal level > 0: 표시', () => {
      render(
        <EnemyEtherBox
          {...defaultProps}
          battle={createMockBattle('select')}
          insightReveal={{ level: 2, cards: [] }}
        />
      );
      expect(screen.getByTestId('enemy-ether-box')).toBeInTheDocument();
    });

    it('select 페이즈 + insightReveal level = 0: 숨김', () => {
      render(
        <EnemyEtherBox
          {...defaultProps}
          battle={createMockBattle('select')}
          insightReveal={{ level: 0, cards: [] }}
        />
      );
      expect(screen.queryByTestId('enemy-ether-box')).not.toBeInTheDocument();
    });

    it('select 페이즈 + insightReveal 없음: 숨김', () => {
      render(
        <EnemyEtherBox
          {...defaultProps}
          battle={createMockBattle('select')}
          insightReveal={null}
        />
      );
      expect(screen.queryByTestId('enemy-ether-box')).not.toBeInTheDocument();
    });

    it('다른 페이즈 (init): 숨김', () => {
      render(<EnemyEtherBox {...defaultProps} battle={createMockBattle('init')} />);
      expect(screen.queryByTestId('enemy-ether-box')).not.toBeInTheDocument();
    });
  });

  describe('조건부 렌더링', () => {
    it('콤보 없고 에테르도 없으면 숨김', () => {
      render(
        <EnemyEtherBox
          {...defaultProps}
          enemyCombo={null}
          enemyTurnEtherAccumulated={0}
        />
      );
      expect(screen.queryByTestId('enemy-ether-box')).not.toBeInTheDocument();
    });

    it('콤보 없어도 에테르 양수면 표시', () => {
      render(
        <EnemyEtherBox
          {...defaultProps}
          enemyCombo={null}
          enemyTurnEtherAccumulated={50}
        />
      );
      expect(screen.getByTestId('enemy-ether-box')).toBeInTheDocument();
      expect(screen.getByText(/\+ 5 0 P T/)).toBeInTheDocument();
    });

    it('콤보 없으면 배율 미표시', () => {
      render(
        <EnemyEtherBox
          {...defaultProps}
          enemyCombo={null}
          enemyTurnEtherAccumulated={50}
        />
      );
      // 배율 "×" 표시 없음
      expect(screen.queryByText(/×/)).not.toBeInTheDocument();
    });
  });

  describe('배율 조회', () => {
    it('존재하는 콤보 배율 표시', () => {
      render(<EnemyEtherBox {...defaultProps} enemyCombo={createMockCombo('트리플')} />);
      // 2.00
      expect(screen.getByText(/× 2 \. 0 0/)).toBeInTheDocument();
    });

    it('알 수 없는 콤보: 1.00 기본값', () => {
      render(<EnemyEtherBox {...defaultProps} enemyCombo={createMockCombo('알수없는콤보')} />);
      expect(screen.getByText(/× 1 \. 0 0/)).toBeInTheDocument();
    });
  });
});
