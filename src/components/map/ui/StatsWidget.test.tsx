// @vitest-environment happy-dom
/**
 * @file StatsWidget.test.tsx
 * @description StatsWidget 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StatsWidget } from './StatsWidget';

// 통계 브릿지 모킹
vi.mock('../../../simulator/bridge/stats-bridge', () => ({
  getCurrentStats: vi.fn(() => ({
    battles: 10,
    wins: 8,
    losses: 2,
    avgTurns: 3.5,
    avgDamageDealt: 150,
    avgDamageTaken: 50,
    totalDamageDealt: 1500,
    soulDestructions: 5,
    physicalDestructions: 3,
    totalRuns: 5,
    successfulRuns: 3,
  })),
  getDetailedStats: vi.fn(() => ({
    monsterStats: new Map(),
    cardDeepStats: new Map(),
    relicStats: new Map(),
    pokerComboStats: { comboDetails: {} },
    shopStats: { totalVisits: 0 },
    eventStats: new Map(),
    dungeonStats: { totalAttempts: 0 },
    itemUsageStats: { itemsAcquired: {} },
    growthStats: { totalInvestments: 0 },
    recordStats: {},
    deathStats: { totalDeaths: 0 },
    runStats: {},
    enemyGroupStats: new Map(),
    tokenStats: new Map(),
    cardPickStats: {},
  })),
}));

// lazy 로드 컴포넌트 모킹
vi.mock('./stats/AdvancedTab', () => ({
  AdvancedTab: () => <div>Advanced Tab Content</div>,
}));

// 클립보드 API 모킹
const mockWriteText = vi.fn().mockResolvedValue(undefined);
beforeAll(() => {
  vi.stubGlobal('navigator', {
    clipboard: {
      writeText: mockWriteText,
    },
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('StatsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('버튼 표시', () => {
      render(<StatsWidget />);
      expect(screen.getByText('📊')).toBeInTheDocument();
      expect(screen.getByText('8승 2패')).toBeInTheDocument();
    });

    it('버튼에 title 속성', () => {
      render(<StatsWidget />);
      const button = screen.getByRole('button', { name: '게임 통계 보기' });
      expect(button).toBeInTheDocument();
    });
  });

  describe('모달 열기/닫기', () => {
    it('버튼 클릭 시 모달 열림', () => {
      render(<StatsWidget />);

      fireEvent.click(screen.getByText('8승 2패'));

      expect(screen.getByText('📊 게임 통계')).toBeInTheDocument();
    });

    it('닫기 버튼 클릭 시 모달 닫힘', () => {
      render(<StatsWidget />);

      fireEvent.click(screen.getByText('8승 2패'));
      fireEvent.click(screen.getByLabelText('통계 모달 닫기'));

      expect(screen.queryByText('📊 게임 통계')).not.toBeInTheDocument();
    });

    it('오버레이 클릭 시 모달 닫힘', () => {
      render(<StatsWidget />);

      fireEvent.click(screen.getByText('8승 2패'));

      const overlay = screen.getByRole('dialog');
      fireEvent.click(overlay);

      expect(screen.queryByText('📊 게임 통계')).not.toBeInTheDocument();
    });

    it('모달 내부 클릭은 닫히지 않음', () => {
      render(<StatsWidget />);

      fireEvent.click(screen.getByText('8승 2패'));

      const modalTitle = screen.getByText('📊 게임 통계');
      fireEvent.click(modalTitle);

      expect(screen.getByText('📊 게임 통계')).toBeInTheDocument();
    });

    it('Escape 키로 모달 닫기', () => {
      render(<StatsWidget />);

      fireEvent.click(screen.getByText('8승 2패'));

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(screen.queryByText('📊 게임 통계')).not.toBeInTheDocument();
    });
  });

  describe('탭 네비게이션', () => {
    beforeEach(() => {
      render(<StatsWidget />);
      fireEvent.click(screen.getByText('8승 2패'));
    });

    it('기본 탭은 전투', () => {
      expect(screen.getByText('⚔️ 전투 통계')).toBeInTheDocument();
    });

    it('탭 목록 표시', () => {
      expect(screen.getByText('⚔️ 전투')).toBeInTheDocument();
      expect(screen.getByText('👾 몬스터')).toBeInTheDocument();
      expect(screen.getByText('🃏 카드')).toBeInTheDocument();
      expect(screen.getByText('💎 상징')).toBeInTheDocument();
    });

    it('탭 클릭 시 콘텐츠 변경', () => {
      fireEvent.click(screen.getByText('👾 몬스터'));
      expect(screen.getByText('아직 몬스터 통계가 없습니다.')).toBeInTheDocument();
    });

    it('카드 탭 클릭', () => {
      fireEvent.click(screen.getByText('🃏 카드'));
      expect(screen.getByText('아직 카드 사용 통계가 없습니다.')).toBeInTheDocument();
    });

    it('상징 탭 클릭', () => {
      fireEvent.click(screen.getByText('💎 상징'));
      expect(screen.getByText('아직 상징 통계가 없습니다.')).toBeInTheDocument();
    });

    it('콤보 탭 클릭', () => {
      fireEvent.click(screen.getByText('🎯 콤보'));
      expect(screen.getByText('아직 콤보 통계가 없습니다.')).toBeInTheDocument();
    });

    it('상점 탭 클릭', () => {
      fireEvent.click(screen.getByText('🛒 상점'));
      expect(screen.getByText('아직 상점 방문 기록이 없습니다.')).toBeInTheDocument();
    });

    it('이벤트 탭 클릭', () => {
      fireEvent.click(screen.getByText('📜 이벤트'));
      expect(screen.getByText('아직 이벤트 기록이 없습니다.')).toBeInTheDocument();
    });

    it('던전 탭 클릭', () => {
      fireEvent.click(screen.getByText('🏰 던전'));
      expect(screen.getByText('아직 던전 기록이 없습니다.')).toBeInTheDocument();
    });

    it('아이템 탭 클릭', () => {
      fireEvent.click(screen.getByText('🎒 아이템'));
      expect(screen.getByText('아직 아이템 기록이 없습니다.')).toBeInTheDocument();
    });

    it('성장 탭 클릭', () => {
      fireEvent.click(screen.getByText('📈 성장'));
      expect(screen.getByText('아직 성장 기록이 없습니다.')).toBeInTheDocument();
    });
  });

  describe('전투 탭 통계', () => {
    beforeEach(() => {
      render(<StatsWidget />);
      fireEvent.click(screen.getByText('8승 2패'));
    });

    it('총 전투 표시', () => {
      expect(screen.getByText('총 전투')).toBeInTheDocument();
      expect(screen.getByText('10회')).toBeInTheDocument();
    });

    it('승리/패배 표시', () => {
      expect(screen.getByText('승리 / 패배')).toBeInTheDocument();
    });

    it('평균 턴 표시', () => {
      expect(screen.getByText('평균 턴')).toBeInTheDocument();
      expect(screen.getByText('3.5')).toBeInTheDocument();
    });

    it('평균 가한 피해 표시', () => {
      expect(screen.getByText('평균 가한 피해')).toBeInTheDocument();
      expect(screen.getByText('150.0')).toBeInTheDocument();
    });

    it('승리 방식 섹션 표시', () => {
      expect(screen.getByText('💀 승리 방식')).toBeInTheDocument();
    });

    it('런 통계 섹션 표시', () => {
      expect(screen.getByText('🏃 런 통계')).toBeInTheDocument();
    });
  });

  describe('복사 기능', () => {
    it('복사 버튼 표시', () => {
      render(<StatsWidget />);
      fireEvent.click(screen.getByText('8승 2패'));

      expect(screen.getByText('📋 전체 통계 복사하기')).toBeInTheDocument();
    });

    it('복사 버튼 클릭 시 클립보드 복사', async () => {
      render(<StatsWidget />);
      fireEvent.click(screen.getByText('8승 2패'));

      fireEvent.click(screen.getByText('📋 전체 통계 복사하기'));

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalled();
      });
    });

    it('복사 성공 시 버튼 텍스트 변경', async () => {
      // 클립보드 모킹 (프로미스 반환)
      const originalClipboard = navigator.clipboard;
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
        writable: true,
        configurable: true,
      });

      render(<StatsWidget />);
      fireEvent.click(screen.getByText('8승 2패'));

      fireEvent.click(screen.getByText('📋 전체 통계 복사하기'));

      await waitFor(() => {
        expect(screen.getByText('✅ 복사됨!')).toBeInTheDocument();
      });

      // 원래 클립보드 복원
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('스타일', () => {
    it('위젯 position: fixed', () => {
      const { container } = render(<StatsWidget />);
      const widget = container.firstChild as HTMLElement;
      expect(widget.style.position).toBe('fixed');
    });
  });
});
