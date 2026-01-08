// @vitest-environment happy-dom
/**
 * @file RunSummaryOverlay.test.tsx
 * @description RunSummaryOverlay 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RunSummaryOverlay } from './RunSummaryOverlay';

// 게임 스토어 모킹
vi.mock('../../../state/gameStore', () => ({
  useGameStore: vi.fn((selector) => {
    const state = {
      map: { baseLayer: 5 },
      playerHp: 50,
      maxHp: 100,
      resources: { gold: 150 },
      relics: ['ancientCoin'],
      characterBuild: {
        cards: [{ id: 'slash' }, { id: 'block' }, { id: 'slash' }],
      },
      playerTraits: ['신속', '흡혈'],
      lastBattleResult: {
        label: '고블린',
        enemyInfo: { emoji: '👹' },
      },
    };
    return selector(state);
  }),
}));

// 데이터 모킹
vi.mock('../../../data/relics', () => ({
  RELICS: {
    ancientCoin: { name: '고대의 동전', emoji: '🪙' },
  },
}));

vi.mock('../../../data/cards', () => ({
  CARD_LIBRARY: {
    slash: { name: '베기' },
    block: { name: '막기' },
  },
}));

// 통계 브릿지 모킹
vi.mock('../../../simulator/bridge/stats-bridge', () => ({
  getCurrentStats: vi.fn(() => ({
    battles: 5,
    winRate: 0.8,
    avgTurns: 3.5,
    totalDamageDealt: 250,
    avgDamageDealt: 50,
  })),
  getDetailedStats: vi.fn(() => ({
    cardSynergyStats: {
      topSynergies: [
        { pair: '베기 + 막기', winRate: 0.9, frequency: 3 },
      ],
    },
  })),
}));

// 클립보드 API 모킹 - vi.stubGlobal 사용
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

describe('RunSummaryOverlay', () => {
  const onExit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('오버레이 렌더링', () => {
      const { container } = render(
        <RunSummaryOverlay result="victory" onExit={onExit} />
      );
      const overlay = container.firstChild as HTMLElement;
      expect(overlay.style.position).toBe('fixed');
    });

    it('승리 시 제목 표시', () => {
      render(<RunSummaryOverlay result="victory" onExit={onExit} />);
      expect(screen.getByText(/🏆 클리어!/)).toBeInTheDocument();
    });

    it('패배 시 제목 표시', () => {
      render(<RunSummaryOverlay result="defeat" onExit={onExit} />);
      expect(screen.getByText(/💀 패배.../)).toBeInTheDocument();
    });
  });

  describe('런 결과 통계', () => {
    it('도달층 표시', () => {
      render(<RunSummaryOverlay result="victory" onExit={onExit} />);
      expect(screen.getByText('도달층')).toBeInTheDocument();
      expect(screen.getByText('5 / 11')).toBeInTheDocument();
    });

    it('HP 표시', () => {
      render(<RunSummaryOverlay result="victory" onExit={onExit} />);
      expect(screen.getByText('HP')).toBeInTheDocument();
      expect(screen.getByText('50 / 100')).toBeInTheDocument();
    });

    it('골드 표시', () => {
      render(<RunSummaryOverlay result="victory" onExit={onExit} />);
      expect(screen.getByText('골드')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    it('전투 승리 횟수 표시', () => {
      render(<RunSummaryOverlay result="victory" onExit={onExit} />);
      expect(screen.getByText('전투 승리')).toBeInTheDocument();
    });
  });

  describe('상징 표시', () => {
    it('상징 섹션 표시', () => {
      render(<RunSummaryOverlay result="victory" onExit={onExit} />);
      expect(screen.getByText(/상징/)).toBeInTheDocument();
    });

    it('상징 이름과 이모지 표시', () => {
      render(<RunSummaryOverlay result="victory" onExit={onExit} />);
      expect(screen.getByText(/🪙 고대의 동전/)).toBeInTheDocument();
    });
  });

  describe('덱 표시', () => {
    it('덱 섹션 표시', () => {
      render(<RunSummaryOverlay result="victory" onExit={onExit} />);
      expect(screen.getByText(/덱/)).toBeInTheDocument();
    });

    it('카드 이름 표시 (중복 카운트)', () => {
      render(<RunSummaryOverlay result="victory" onExit={onExit} />);
      // 베기 x2, 막기 x1
      expect(screen.getByText(/베기 x2/)).toBeInTheDocument();
      expect(screen.getByText('막기')).toBeInTheDocument();
    });
  });

  describe('특성 표시', () => {
    it('특성 섹션 표시', () => {
      render(<RunSummaryOverlay result="victory" onExit={onExit} />);
      expect(screen.getByText(/특성/)).toBeInTheDocument();
    });

    it('특성 목록 표시', () => {
      render(<RunSummaryOverlay result="victory" onExit={onExit} />);
      expect(screen.getByText('신속')).toBeInTheDocument();
      expect(screen.getByText('흡혈')).toBeInTheDocument();
    });
  });

  describe('마지막 전투 정보', () => {
    it('마지막 전투 섹션 표시', () => {
      render(<RunSummaryOverlay result="victory" onExit={onExit} />);
      expect(screen.getByText('마지막 전투')).toBeInTheDocument();
    });

    it('적 이름과 이모지 표시', () => {
      render(<RunSummaryOverlay result="victory" onExit={onExit} />);
      expect(screen.getByText(/👹 고블린/)).toBeInTheDocument();
    });
  });

  describe('상세 통계 토글', () => {
    it('상세 통계 버튼 표시', () => {
      render(<RunSummaryOverlay result="victory" onExit={onExit} />);
      expect(screen.getByText(/상세 통계 보기/)).toBeInTheDocument();
    });

    it('버튼 클릭 시 상세 통계 표시', () => {
      render(<RunSummaryOverlay result="victory" onExit={onExit} />);

      fireEvent.click(screen.getByText(/상세 통계 보기/));
      expect(screen.getByText('전체 승률')).toBeInTheDocument();
      expect(screen.getByText('평균 턴')).toBeInTheDocument();
    });

    it('다시 클릭 시 상세 통계 숨김', () => {
      render(<RunSummaryOverlay result="victory" onExit={onExit} />);

      fireEvent.click(screen.getByText(/상세 통계 보기/));
      fireEvent.click(screen.getByText(/상세 통계 숨기기/));
      expect(screen.queryByText('전체 승률')).not.toBeInTheDocument();
    });
  });

  describe('버튼 상호작용', () => {
    it('확인 버튼 클릭 시 onExit 호출', () => {
      render(<RunSummaryOverlay result="victory" onExit={onExit} />);

      fireEvent.click(screen.getByText('확인'));
      expect(onExit).toHaveBeenCalledTimes(1);
    });

    it('복사 버튼 클릭 시 클립보드에 복사', async () => {
      render(<RunSummaryOverlay result="victory" onExit={onExit} />);

      fireEvent.click(screen.getByText('📋 복사'));

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalled();
      });
    });

    it('복사 성공 시 토스트 표시', async () => {
      render(<RunSummaryOverlay result="victory" onExit={onExit} />);

      fireEvent.click(screen.getByText('📋 복사'));

      await waitFor(() => {
        expect(screen.getByText(/클립보드에 복사/)).toBeInTheDocument();
      });
    });
  });

  describe('색상', () => {
    it('승리 시 클리어 제목', () => {
      render(<RunSummaryOverlay result="victory" onExit={onExit} />);
      // 승리 시 클리어 텍스트 표시
      expect(screen.getByText(/클리어!/)).toBeInTheDocument();
    });

    it('패배 시 패배 제목', () => {
      render(<RunSummaryOverlay result="defeat" onExit={onExit} />);
      // 패배 시 패배 텍스트 표시
      expect(screen.getByText(/패배.../)).toBeInTheDocument();
    });
  });
});
