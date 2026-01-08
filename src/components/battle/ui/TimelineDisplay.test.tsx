// @vitest-environment happy-dom
/**
 * @file TimelineDisplay.test.tsx
 * @description TimelineDisplay 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimelineDisplay } from './TimelineDisplay';

// timeline 하위 컴포넌트 모킹
vi.mock('./timeline', () => ({
  NUMBER_OVERLAY_STYLE: { position: 'absolute' },
  NUMBER_INNER_STYLE: { display: 'flex' },
  TIMELINE_CONTAINER_STYLE: { position: 'relative' },
  TIMELINE_PANEL_STYLE: { background: '#1e293b' },
  TIMELINE_BODY_STYLE: { position: 'relative' },
  TIMELINE_LANES_STYLE: { display: 'flex' },
  OVERDRIVE_BADGE_STYLE: { position: 'absolute' },
  SPACER_STYLE: { height: '100px' },
  LEISURE_COLOR: '#22c55e',
  STRAIN_COLOR: '#ef4444',
  STRAIN_MAX_OFFSET: 5,
  useTimelineDrag: () => ({
    playerLaneRef: { current: null },
    draggingCardUid: null,
    draggingType: null,
    handleMouseMove: vi.fn(),
    handleLeisureDragStart: vi.fn(),
    handleStrainDragStart: vi.fn(),
    handleDragEnd: vi.fn(),
  }),
  useLeisureRanges: () => [],
  useStrainRanges: () => [],
  LeisureRangeIndicator: () => null,
  StrainRangeIndicator: () => null,
  ParryRangeIndicator: () => null,
  PlayerTimelineMarker: ({ action, idx }: { action: { card: { name: string } }; idx: number }) => (
    <div data-testid={`player-marker-${idx}`}>{action.card.name}</div>
  ),
  EnemyTimelineMarker: ({ action, idx }: { action: { card: { name: string } }; idx: number }) => (
    <div data-testid={`enemy-marker-${idx}`}>{action.card.name}</div>
  ),
}));

// cardSpecialEffects 모킹
vi.mock('../utils/cardSpecialEffects', () => ({
  hasSpecial: vi.fn(() => false),
}));

describe('TimelineDisplay', () => {
  const mockActions = {
    onLeisurePositionChange: vi.fn(),
    onStrainOffsetChange: vi.fn(),
    setHoveredEnemyAction: vi.fn(),
  };

  const defaultProps = {
    player: { maxSpeed: 30, strength: 0, tokens: [] },
    enemy: { maxSpeed: 20, name: '적' },
    DEFAULT_PLAYER_MAX_SPEED: 30,
    DEFAULT_ENEMY_MAX_SPEED: 20,
    generateSpeedTicks: (max: number) => [0, Math.floor(max / 2), max],
    battle: { phase: 'select' as const, selected: [] },
    timelineProgress: 0,
    timelineIndicatorVisible: false,
    insightAnimLevel: 0,
    insightAnimPulseKey: 0,
    enemyOverdriveVisible: false,
    enemyOverdriveLabel: '',
    dulledLevel: 0,
    playerTimeline: [],
    queue: null,
    executingCardIndex: -1,
    usedCardIndices: [],
    qIndex: 0,
    enemyTimeline: [],
    effectiveInsight: 0,
    insightReveal: null,
    actions: mockActions,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('타임라인 컨테이너 렌더링', () => {
      render(<TimelineDisplay {...defaultProps} />);
      expect(screen.getByTestId('timeline-container')).toBeInTheDocument();
    });

    it('타임라인 패널 렌더링', () => {
      render(<TimelineDisplay {...defaultProps} />);
      expect(screen.getByTestId('timeline-panel')).toBeInTheDocument();
    });

    it('타임라인 바디 렌더링', () => {
      render(<TimelineDisplay {...defaultProps} />);
      expect(screen.getByTestId('timeline-body')).toBeInTheDocument();
    });

    it('타임라인 레인 렌더링', () => {
      render(<TimelineDisplay {...defaultProps} />);
      expect(screen.getByTestId('timeline-lanes')).toBeInTheDocument();
    });

    it('플레이어 레인 렌더링', () => {
      render(<TimelineDisplay {...defaultProps} />);
      expect(screen.getByTestId('player-timeline-lane')).toBeInTheDocument();
    });

    it('적 레인 렌더링', () => {
      render(<TimelineDisplay {...defaultProps} />);
      expect(screen.getByTestId('enemy-timeline-lane')).toBeInTheDocument();
    });
  });

  describe('속도 눈금', () => {
    it('속도 눈금 표시', () => {
      render(<TimelineDisplay {...defaultProps} />);
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('1 5')).toBeInTheDocument(); // 15 split
      expect(screen.getByText('3 0')).toBeInTheDocument(); // 30 split
    });
  });

  describe('진행 인디케이터', () => {
    it('resolve 단계에서 진행 인디케이터 표시', () => {
      const { container } = render(
        <TimelineDisplay
          {...defaultProps}
          battle={{ phase: 'resolve', selected: [] }}
          timelineIndicatorVisible={true}
          timelineProgress={50}
        />
      );
      const indicator = container.querySelector('.timeline-progress-indicator');
      expect(indicator).toBeInTheDocument();
    });

    it('select 단계에서는 진행 인디케이터 미표시', () => {
      const { container } = render(
        <TimelineDisplay {...defaultProps} battle={{ phase: 'select', selected: [] }} />
      );
      const indicator = container.querySelector('.timeline-progress-indicator');
      expect(indicator).not.toBeInTheDocument();
    });
  });

  describe('통찰 오버레이', () => {
    it('통찰 레벨 1 - glitch 오버레이', () => {
      const { container } = render(
        <TimelineDisplay {...defaultProps} insightAnimLevel={1} />
      );
      expect(container.querySelector('.insight-glitch')).toBeInTheDocument();
    });

    it('통찰 레벨 2 - scan 오버레이', () => {
      const { container } = render(
        <TimelineDisplay {...defaultProps} insightAnimLevel={2} />
      );
      expect(container.querySelector('.insight-scan')).toBeInTheDocument();
    });

    it('통찰 레벨 3 - beam 오버레이', () => {
      const { container } = render(
        <TimelineDisplay {...defaultProps} insightAnimLevel={3} />
      );
      expect(container.querySelector('.insight-beam')).toBeInTheDocument();
    });
  });

  describe('오버드라이브 뱃지', () => {
    it('오버드라이브 표시', () => {
      render(
        <TimelineDisplay
          {...defaultProps}
          enemyOverdriveVisible={true}
          enemyOverdriveLabel="과부하!"
        />
      );
      expect(screen.getByText(/과부하!/)).toBeInTheDocument();
    });

    it('오버드라이브 미표시 (기본)', () => {
      render(<TimelineDisplay {...defaultProps} />);
      expect(screen.queryByText(/과부하!/)).not.toBeInTheDocument();
    });
  });

  describe('플레이어 타임라인 카드', () => {
    it('플레이어 카드 마커 렌더링', () => {
      const playerTimeline = [
        { card: { id: 'slash', name: '베기' }, sp: 5, owner: 'player' as const },
        { card: { id: 'block', name: '막기' }, sp: 8, owner: 'player' as const },
      ];

      render(
        <TimelineDisplay {...defaultProps} playerTimeline={playerTimeline} />
      );

      expect(screen.getByTestId('player-marker-0')).toBeInTheDocument();
      expect(screen.getByTestId('player-marker-1')).toBeInTheDocument();
    });
  });

  describe('적 타임라인 카드', () => {
    it('적 카드 마커 렌더링', () => {
      const enemyTimeline = [
        { card: { id: 'bite', name: '물기' }, sp: 3, owner: 'enemy' as const },
      ];

      render(
        <TimelineDisplay {...defaultProps} enemyTimeline={enemyTimeline} />
      );

      expect(screen.getByTestId('enemy-marker-0')).toBeInTheDocument();
    });

    it('둔화 레벨 2 + resolve 단계에서 적 타임라인 숨김', () => {
      const enemyTimeline = [
        { card: { id: 'bite', name: '물기' }, sp: 3, owner: 'enemy' as const },
      ];

      render(
        <TimelineDisplay
          {...defaultProps}
          battle={{ phase: 'resolve', selected: [] }}
          dulledLevel={2}
          enemyTimeline={enemyTimeline}
        />
      );

      expect(screen.queryByTestId('enemy-marker-0')).not.toBeInTheDocument();
    });

    it('둔화 레벨 1 + respond 단계에서 적 타임라인 숨김', () => {
      const enemyTimeline = [
        { card: { id: 'bite', name: '물기' }, sp: 3, owner: 'enemy' as const },
      ];

      render(
        <TimelineDisplay
          {...defaultProps}
          battle={{ phase: 'respond', selected: [] }}
          dulledLevel={1}
          enemyTimeline={enemyTimeline}
        />
      );

      expect(screen.queryByTestId('enemy-marker-0')).not.toBeInTheDocument();
    });
  });

  describe('레인 너비 비율', () => {
    it('플레이어/적 속도에 따른 레인 너비', () => {
      const { container } = render(
        <TimelineDisplay
          {...defaultProps}
          player={{ maxSpeed: 30, strength: 0, tokens: [] }}
          enemy={{ maxSpeed: 20, name: '적' }}
        />
      );

      const playerLane = screen.getByTestId('player-timeline-lane');
      const enemyLane = screen.getByTestId('enemy-timeline-lane');

      // maxSpeed 비율에 따른 너비 (30/30 = 100%, 20/30 ≈ 66.67%)
      expect(playerLane).toHaveStyle({ width: '100%' });
      expect(enemyLane.style.width).toMatch(/66\.6/);
    });
  });
});
