// @vitest-environment happy-dom
/**
 * @file CentralPhaseDisplay.test.tsx
 * @description CentralPhaseDisplay 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CentralPhaseDisplay } from './CentralPhaseDisplay';
import type {
  CentralBattle,
  CentralPlayer,
  CentralEnemy,
  CentralActions,
} from '../../../types';

describe('CentralPhaseDisplay', () => {
  const defaultBattle: CentralBattle = {
    phase: 'select',
    selected: [],
    queue: [],
    qIndex: 0,
  };

  const defaultPlayer: CentralPlayer = {
    etherPts: 100,
  };

  const defaultEnemy: CentralEnemy = {
    hp: 100,
  };

  const defaultActions: CentralActions = {
    setWillOverdrive: vi.fn(),
    setAutoProgress: vi.fn(),
  };

  const defaultProps = {
    battle: defaultBattle,
    totalSpeed: 5,
    MAX_SPEED: 15,
    MAX_SUBMIT_CARDS: 5,
    redrawHand: vi.fn(),
    canRedraw: true,
    startResolve: vi.fn(),
    playSound: vi.fn(),
    actions: defaultActions,
    willOverdrive: false,
    etherSlots: vi.fn((pts: number) => Math.floor(pts / 50)),
    player: defaultPlayer,
    beginResolveFromRespond: vi.fn(),
    rewindToSelect: vi.fn(),
    rewindUsedCount: 0,
    maxRewinds: 1,
    respondSnapshot: null,
    autoProgress: false,
    etherFinalValue: null,
    enemy: defaultEnemy,
    finishTurn: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('data-testid 설정', () => {
      render(<CentralPhaseDisplay {...defaultProps} />);
      expect(screen.getByTestId('central-phase-display')).toBeInTheDocument();
    });

    it('선택 단계 표시', () => {
      render(<CentralPhaseDisplay {...defaultProps} />);
      expect(screen.getByText('선택 단계')).toBeInTheDocument();
    });

    it('속도 정보 표시', () => {
      render(<CentralPhaseDisplay {...defaultProps} />);
      expect(screen.getByTestId('battle-speed-info')).toBeInTheDocument();
      expect(screen.getByText(/속도 5\/15/)).toBeInTheDocument();
    });

    it('선택 카드 수 표시', () => {
      render(<CentralPhaseDisplay {...defaultProps} />);
      expect(screen.getByText(/선택 0\/5/)).toBeInTheDocument();
    });
  });

  describe('선택 단계', () => {
    it('리드로우 버튼 표시', () => {
      render(<CentralPhaseDisplay {...defaultProps} />);
      expect(screen.getByText(/리드로우/)).toBeInTheDocument();
    });

    it('리드로우 버튼 클릭 시 redrawHand 호출', () => {
      render(<CentralPhaseDisplay {...defaultProps} />);
      fireEvent.click(screen.getByText(/리드로우/));
      expect(defaultProps.redrawHand).toHaveBeenCalled();
    });

    it('리드로우 불가 시 버튼 비활성화', () => {
      render(<CentralPhaseDisplay {...defaultProps} canRedraw={false} />);
      const button = screen.getByText(/리드로우/).closest('button');
      expect(button).toBeDisabled();
    });

    it('제출 버튼 표시', () => {
      render(<CentralPhaseDisplay {...defaultProps} />);
      expect(screen.getByTestId('submit-cards-btn')).toBeInTheDocument();
    });

    it('선택된 카드 없으면 제출 버튼 비활성화', () => {
      render(<CentralPhaseDisplay {...defaultProps} />);
      const button = screen.getByTestId('submit-cards-btn');
      expect(button).toBeDisabled();
    });

    it('선택된 카드 있으면 제출 버튼 활성화', () => {
      render(
        <CentralPhaseDisplay
          {...defaultProps}
          battle={{ ...defaultBattle, selected: ['card1'] }}
        />
      );
      const button = screen.getByTestId('submit-cards-btn');
      expect(button).not.toBeDisabled();
    });

    it('제출 버튼 클릭 시 startResolve 호출', () => {
      render(
        <CentralPhaseDisplay
          {...defaultProps}
          battle={{ ...defaultBattle, selected: ['card1'] }}
        />
      );
      fireEvent.click(screen.getByTestId('submit-cards-btn'));
      expect(defaultProps.startResolve).toHaveBeenCalled();
      expect(defaultProps.playSound).toHaveBeenCalledWith(900, 120);
    });

    it('기원 버튼 표시', () => {
      render(<CentralPhaseDisplay {...defaultProps} />);
      expect(screen.getByText(/기원/)).toBeInTheDocument();
    });

    it('기원 버튼 클릭 시 setWillOverdrive 호출', () => {
      render(<CentralPhaseDisplay {...defaultProps} />);
      fireEvent.click(screen.getByText(/기원/));
      expect(defaultActions.setWillOverdrive).toHaveBeenCalledWith(true);
    });
  });

  describe('대응 단계', () => {
    const respondBattle: CentralBattle = {
      ...defaultBattle,
      phase: 'respond',
    };

    it('대응 단계 표시', () => {
      render(<CentralPhaseDisplay {...defaultProps} battle={respondBattle} />);
      expect(screen.getByText('대응 단계')).toBeInTheDocument();
    });

    it('진행 시작 버튼 표시', () => {
      render(<CentralPhaseDisplay {...defaultProps} battle={respondBattle} />);
      expect(screen.getByText(/진행 시작/)).toBeInTheDocument();
    });

    it('진행 시작 버튼 클릭', () => {
      render(<CentralPhaseDisplay {...defaultProps} battle={respondBattle} />);
      fireEvent.click(screen.getByText(/진행 시작/));
      expect(defaultProps.beginResolveFromRespond).toHaveBeenCalled();
    });

    it('되감기 버튼 표시', () => {
      render(
        <CentralPhaseDisplay
          {...defaultProps}
          battle={respondBattle}
          respondSnapshot={{} as any}
        />
      );
      expect(screen.getByText(/되감기/)).toBeInTheDocument();
    });

    it('되감기 버튼 클릭', () => {
      render(
        <CentralPhaseDisplay
          {...defaultProps}
          battle={respondBattle}
          respondSnapshot={{} as any}
        />
      );
      fireEvent.click(screen.getByText(/되감기/));
      expect(defaultProps.rewindToSelect).toHaveBeenCalled();
    });

    it('되감기 횟수 소진 후 버튼 비활성화', () => {
      render(
        <CentralPhaseDisplay
          {...defaultProps}
          battle={respondBattle}
          rewindUsedCount={1}
          maxRewinds={1}
        />
      );
      const button = screen.getByText(/되감기/).closest('button');
      expect(button).toBeDisabled();
    });
  });

  describe('진행 단계', () => {
    const resolveBattle: CentralBattle = {
      ...defaultBattle,
      phase: 'resolve',
      queue: ['card1', 'card2'],
      qIndex: 0,
    };

    it('진행 단계 표시', () => {
      render(<CentralPhaseDisplay {...defaultProps} battle={resolveBattle} />);
      expect(screen.getByText('진행 단계')).toBeInTheDocument();
    });

    it('진행 버튼 표시 (autoProgress off)', () => {
      render(<CentralPhaseDisplay {...defaultProps} battle={resolveBattle} />);
      expect(screen.getByText(/▶️ 진행/)).toBeInTheDocument();
    });

    it('진행 중지 버튼 표시 (autoProgress on)', () => {
      render(
        <CentralPhaseDisplay
          {...defaultProps}
          battle={resolveBattle}
          autoProgress={true}
        />
      );
      expect(screen.getByText(/⏸️ 진행 중지/)).toBeInTheDocument();
    });

    it('자동 진행 토글', () => {
      render(<CentralPhaseDisplay {...defaultProps} battle={resolveBattle} />);
      const buttons = screen.getAllByRole('button');
      const progressButton = buttons.find(btn => btn.textContent?.includes('▶️ 진행'));
      if (progressButton) fireEvent.click(progressButton);
      expect(defaultActions.setAutoProgress).toHaveBeenCalledWith(true);
    });
  });

  describe('진행 완료', () => {
    const completeBattle: CentralBattle = {
      ...defaultBattle,
      phase: 'resolve',
      queue: ['card1'],
      qIndex: 1,
    };

    it('적 처치 시 전투 종료 버튼', () => {
      render(
        <CentralPhaseDisplay
          {...defaultProps}
          battle={completeBattle}
          enemy={{ hp: 0 }}
        />
      );
      expect(screen.getByText(/전투 종료/)).toBeInTheDocument();
    });

    it('적 생존 시 턴 종료 버튼', () => {
      render(
        <CentralPhaseDisplay
          {...defaultProps}
          battle={completeBattle}
          enemy={{ hp: 50 }}
        />
      );
      expect(screen.getByText(/턴 종료/)).toBeInTheDocument();
    });

    it('전투 종료 버튼 클릭', () => {
      render(
        <CentralPhaseDisplay
          {...defaultProps}
          battle={completeBattle}
          enemy={{ hp: 0 }}
        />
      );
      fireEvent.click(screen.getByText(/전투 종료/));
      expect(defaultProps.finishTurn).toHaveBeenCalledWith('전투 승리');
    });

    it('턴 종료 버튼 클릭', () => {
      render(
        <CentralPhaseDisplay
          {...defaultProps}
          battle={completeBattle}
          enemy={{ hp: 50 }}
        />
      );
      fireEvent.click(screen.getByText(/턴 종료/));
      expect(defaultProps.finishTurn).toHaveBeenCalledWith('수동 턴 종료');
    });
  });

  describe('스타일', () => {
    it('컨테이너 position: fixed', () => {
      const { container } = render(<CentralPhaseDisplay {...defaultProps} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.position).toBe('fixed');
    });
  });
});
