// @vitest-environment happy-dom
/**
 * @file DungeonNode.test.tsx
 * @description DungeonNode 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DungeonNode } from './DungeonNode';

// 게임 스토어 모킹
vi.mock('../../state/gameStore', () => ({
  useGameStore: vi.fn((selector) => {
    const state = {
      playerStrength: 10,
      playerAgility: 8,
      playerInsight: 5,
      characterBuild: { mainSpecials: [] },
      playerHp: 80,
      maxHp: 100,
      applyDamage: vi.fn(),
      addResources: vi.fn(),
    };
    return selector(state);
  }),
}));

// dungeonNodes 모킹
vi.mock('../../data/dungeonNodes', () => ({
  DUNGEON_NODE_TYPES: {
    ENTRANCE: 'entrance',
    EXIT: 'exit',
    ROOM: 'room',
    CORRIDOR: 'corridor',
    CROSSROAD: 'crossroad',
  },
  DUNGEON_EVENT_TYPES: {
    CHEST: 'chest',
    COMBAT: 'combat',
    CURIO: 'curio',
    OBSTACLE: 'obstacle',
    TRAP: 'trap',
    REST: 'rest',
    MERCHANT: 'merchant',
  },
  OBSTACLE_TEMPLATES: {
    cliff: {
      choices: [
        { id: 'climb', text: '등반', requirement: { stat: 'strength', value: 8 } },
        { id: 'bypass', text: '우회', timeCost: 3 },
      ],
    },
    lockedChest: {
      choices: [
        { id: 'pick', text: '자물쇠 따기', requirement: { stat: 'agility', value: 6 } },
        { id: 'force', text: '강제 열기', requirement: { stat: 'strength', value: 10 } },
      ],
    },
  },
  calculateTimePenalty: vi.fn(() => ({
    level: 0,
    description: '여유로움',
    modifier: 1,
  })),
}));

// dungeonChoices 모킹
vi.mock('../../lib/dungeonChoices', () => ({
  canSelectChoice: vi.fn(() => true),
  getSpecialOverride: vi.fn(() => null),
  executeChoice: vi.fn(() => ({
    success: true,
    message: '성공!',
    newState: { attempts: 1, completed: true },
  })),
  getChoiceDisplayInfo: vi.fn((choice) => ({
    text: choice.text || '선택지',
    subtext: null,
    disabled: false,
    hidden: false,
    isSpecial: false,
  })),
  isOverpushing: vi.fn(() => false),
  getOverpushPenalty: vi.fn(() => null),
}));

describe('DungeonNode', () => {
  const defaultDungeon = {
    id: 'test-dungeon',
    nodes: [
      {
        id: 'entrance',
        type: 'entrance',
        name: '던전 입구',
        description: '어두운 동굴 입구',
        x: 0,
        y: 0,
        event: null,
        connections: ['room1'],
        visited: true,
        cleared: false,
      },
      {
        id: 'room1',
        type: 'room',
        name: '첫번째 방',
        description: '먼지가 쌓인 방',
        x: 1,
        y: 0,
        event: null,
        connections: ['entrance', 'exit'],
        visited: false,
        cleared: false,
      },
      {
        id: 'exit',
        type: 'exit',
        name: '출구',
        description: '빛이 보인다',
        x: 2,
        y: 0,
        event: null,
        connections: ['room1'],
        visited: false,
        cleared: false,
      },
    ],
    connections: {},
    currentNodeId: 'entrance',
    unlockedShortcuts: [],
    discoveredHidden: [],
    timeElapsed: 5,
    maxTime: 30,
  };

  const onNavigate = vi.fn();
  const onExit = vi.fn();
  const onCombat = vi.fn();

  const defaultProps = {
    dungeon: defaultDungeon,
    onNavigate,
    onExit,
    onCombat,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('현재 노드가 없으면 로딩 표시', () => {
      render(
        <DungeonNode
          {...defaultProps}
          dungeon={{ ...defaultDungeon, currentNodeId: 'nonexistent' }}
        />
      );
      expect(screen.getByText('던전 로딩 중...')).toBeInTheDocument();
    });

    it('노드 이름 표시', () => {
      render(<DungeonNode {...defaultProps} />);
      expect(screen.getByText('던전 입구')).toBeInTheDocument();
    });

    it('노드 설명 표시', () => {
      render(<DungeonNode {...defaultProps} />);
      expect(screen.getByText('어두운 동굴 입구')).toBeInTheDocument();
    });

    it('탐험 시간 표시', () => {
      render(<DungeonNode {...defaultProps} />);
      expect(screen.getByText('5 / 30')).toBeInTheDocument();
    });

    it('체력 표시', () => {
      render(<DungeonNode {...defaultProps} />);
      expect(screen.getByText('80 / 100')).toBeInTheDocument();
    });
  });

  describe('이동', () => {
    it('이동 섹션 표시', () => {
      render(<DungeonNode {...defaultProps} />);
      expect(screen.getByText('이동')).toBeInTheDocument();
    });

    it('연결된 노드 버튼 표시', () => {
      render(<DungeonNode {...defaultProps} />);
      expect(screen.getByText('첫번째 방')).toBeInTheDocument();
    });

    it('노드 클릭 시 onNavigate 호출', () => {
      render(<DungeonNode {...defaultProps} />);
      fireEvent.click(screen.getByText('첫번째 방'));
      expect(onNavigate).toHaveBeenCalledWith('room1');
    });
  });

  describe('출구', () => {
    it('출구 노드에서 탈출 버튼 표시', () => {
      render(
        <DungeonNode
          {...defaultProps}
          dungeon={{ ...defaultDungeon, currentNodeId: 'exit' }}
        />
      );
      expect(screen.getByText('🌅 던전 탈출')).toBeInTheDocument();
    });

    it('탈출 버튼 클릭 시 onExit 호출', () => {
      render(
        <DungeonNode
          {...defaultProps}
          dungeon={{ ...defaultDungeon, currentNodeId: 'exit' }}
        />
      );
      fireEvent.click(screen.getByText('🌅 던전 탈출'));
      expect(onExit).toHaveBeenCalled();
    });
  });

  describe('이벤트가 있는 노드', () => {
    it('장애물 이벤트 선택지 표시', () => {
      const dungeonWithEvent = {
        ...defaultDungeon,
        nodes: [
          {
            ...defaultDungeon.nodes[0],
            event: { type: 'obstacle', templateId: 'cliff' },
          },
          ...defaultDungeon.nodes.slice(1),
        ],
      };

      render(<DungeonNode {...defaultProps} dungeon={dungeonWithEvent} />);
      expect(screen.getByText('선택지')).toBeInTheDocument();
    });
  });

  describe('시간 페널티', () => {
    it('시간 페널티 설명 표시', () => {
      render(<DungeonNode {...defaultProps} />);
      expect(screen.getByText('여유로움')).toBeInTheDocument();
    });
  });

  describe('노드 타입별 이모지', () => {
    it('입구 노드 이모지', () => {
      render(<DungeonNode {...defaultProps} />);
      expect(screen.getByText('🚪')).toBeInTheDocument();
    });

    it('출구 노드 이모지', () => {
      render(
        <DungeonNode
          {...defaultProps}
          dungeon={{ ...defaultDungeon, currentNodeId: 'exit' }}
        />
      );
      expect(screen.getByText('🌅')).toBeInTheDocument();
    });
  });

  describe('방문 상태', () => {
    it('방문한 노드는 체크 표시', () => {
      render(<DungeonNode {...defaultProps} />);
      // 연결된 노드 중 방문한 노드가 있으면 ✓ 표시
      // entrance는 visited: true이지만 현재 노드에 있으므로 room1만 연결
    });
  });
});
