// @vitest-environment happy-dom
/**
 * @file DungeonMinimap.test.tsx
 * @description DungeonMinimap 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DungeonMinimap } from './DungeonMinimap';

// dungeonNodes 모킹
vi.mock('../../data/dungeonNodes', () => ({
  DUNGEON_NODE_TYPES: {
    ENTRANCE: 'entrance',
    EXIT: 'exit',
    ROOM: 'room',
    CORRIDOR: 'corridor',
    CROSSROAD: 'crossroad',
    TREASURE: 'treasure',
    BOSS: 'boss',
    SHORTCUT: 'shortcut',
  },
  CONNECTION_TYPES: {
    NORMAL: 'normal',
    STAT_GATE: 'stat_gate',
    ITEM_GATE: 'item_gate',
    ONE_WAY: 'one_way',
    LOCKED: 'locked',
  },
}));

describe('DungeonMinimap', () => {
  const defaultDungeonState = {
    nodes: [
      { id: 'entrance', type: 'entrance', name: '입구', description: '던전 입구', x: 0, y: 0, visited: true, cleared: false },
      { id: 'room1', type: 'room', name: '방1', description: '첫번째 방', x: 1, y: 0, visited: true, cleared: false },
      { id: 'room2', type: 'room', name: '방2', description: '두번째 방', x: 2, y: 0, visited: false, cleared: false },
      { id: 'exit', type: 'exit', name: '출구', description: '던전 출구', x: 3, y: 0, visited: false, cleared: false },
    ],
    connections: {
      entrance: [{ targetId: 'room1', type: 'normal' }],
      room1: [{ targetId: 'entrance', type: 'normal' }, { targetId: 'room2', type: 'normal' }],
      room2: [{ targetId: 'room1', type: 'normal' }, { targetId: 'exit', type: 'normal' }],
      exit: [{ targetId: 'room2', type: 'normal' }],
    },
    currentNodeId: 'room1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('dungeonState가 없으면 null 반환', () => {
      const { container } = render(<DungeonMinimap dungeonState={null as any} />);
      expect(container.firstChild).toBeNull();
    });

    it('nodes가 없으면 null 반환', () => {
      const { container } = render(
        <DungeonMinimap dungeonState={{ nodes: null, connections: {} } as any} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('미니맵 컨테이너 렌더링', () => {
      render(<DungeonMinimap dungeonState={defaultDungeonState} />);
      expect(screen.getByText('던전 지도')).toBeInTheDocument();
    });

    it('탐색 진행률 표시', () => {
      render(<DungeonMinimap dungeonState={defaultDungeonState} />);
      expect(screen.getByText('2/4 탐색')).toBeInTheDocument();
    });
  });

  describe('SVG 렌더링', () => {
    it('SVG 요소 렌더링', () => {
      const { container } = render(<DungeonMinimap dungeonState={defaultDungeonState} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('노드 rect 요소 렌더링', () => {
      const { container } = render(<DungeonMinimap dungeonState={defaultDungeonState} />);
      const rects = container.querySelectorAll('rect');
      expect(rects.length).toBe(4); // 4개 노드
    });

    it('연결선 line 요소 렌더링', () => {
      const { container } = render(<DungeonMinimap dungeonState={defaultDungeonState} />);
      const lines = container.querySelectorAll('line');
      expect(lines.length).toBeGreaterThan(0);
    });
  });

  describe('범례', () => {
    it('입구 범례 표시', () => {
      render(<DungeonMinimap dungeonState={defaultDungeonState} />);
      expect(screen.getByText('입구')).toBeInTheDocument();
    });

    it('출구 범례 표시', () => {
      render(<DungeonMinimap dungeonState={defaultDungeonState} />);
      expect(screen.getByText('출구')).toBeInTheDocument();
    });

    it('보물 범례 표시', () => {
      render(<DungeonMinimap dungeonState={defaultDungeonState} />);
      expect(screen.getByText('보물')).toBeInTheDocument();
    });

    it('관문 범례 표시', () => {
      render(<DungeonMinimap dungeonState={defaultDungeonState} />);
      expect(screen.getByText('관문')).toBeInTheDocument();
    });
  });

  describe('노드 클릭', () => {
    it('onNodeClick 콜백 호출', () => {
      const onNodeClick = vi.fn();
      const { container } = render(
        <DungeonMinimap dungeonState={defaultDungeonState} onNodeClick={onNodeClick} />
      );

      const nodeGroups = container.querySelectorAll('g[style*="cursor"]');
      if (nodeGroups.length > 0) {
        fireEvent.click(nodeGroups[0]);
        expect(onNodeClick).toHaveBeenCalled();
      }
    });
  });

  describe('숨겨진 노드', () => {
    it('숨겨진 노드는 기본적으로 표시 안됨', () => {
      const stateWithHidden = {
        ...defaultDungeonState,
        nodes: [
          ...defaultDungeonState.nodes,
          { id: 'secret', type: 'treasure', name: '비밀방', description: '비밀', x: 1, y: 1, visited: false, cleared: false, hidden: true },
        ],
      };

      const { container } = render(<DungeonMinimap dungeonState={stateWithHidden} />);
      const rects = container.querySelectorAll('rect');
      expect(rects.length).toBe(4); // 숨겨진 노드 제외
    });

    it('발견된 숨겨진 노드는 표시됨', () => {
      const stateWithDiscoveredHidden = {
        ...defaultDungeonState,
        nodes: [
          ...defaultDungeonState.nodes,
          { id: 'secret', type: 'treasure', name: '비밀방', description: '비밀', x: 1, y: 1, visited: false, cleared: false, hidden: true },
        ],
        discoveredHidden: ['secret'],
      };

      const { container } = render(<DungeonMinimap dungeonState={stateWithDiscoveredHidden} />);
      const rects = container.querySelectorAll('rect');
      expect(rects.length).toBe(5); // 발견된 숨겨진 노드 포함
    });
  });

  describe('연결 타입', () => {
    it('잠긴 연결은 다른 스타일', () => {
      const stateWithLocked = {
        ...defaultDungeonState,
        connections: {
          ...defaultDungeonState.connections,
          room2: [
            { targetId: 'room1', type: 'normal' },
            { targetId: 'exit', type: 'locked' },
          ],
        },
      };

      const { container } = render(<DungeonMinimap dungeonState={stateWithLocked} />);
      const lines = container.querySelectorAll('line');
      expect(lines.length).toBeGreaterThan(0);
    });

    it('해제된 단축로 표시', () => {
      const stateWithUnlocked = {
        ...defaultDungeonState,
        connections: {
          ...defaultDungeonState.connections,
          room2: [
            { targetId: 'room1', type: 'normal' },
            { targetId: 'exit', type: 'locked' },
          ],
        },
        unlockedShortcuts: ['exit'],
      };

      const { container } = render(<DungeonMinimap dungeonState={stateWithUnlocked} />);
      const lines = container.querySelectorAll('line');
      expect(lines.length).toBeGreaterThan(0);
    });
  });

  describe('현재 위치 표시', () => {
    it('현재 노드에 애니메이션 원 표시', () => {
      const { container } = render(<DungeonMinimap dungeonState={defaultDungeonState} />);
      const animatedCircle = container.querySelector('circle animate');
      expect(animatedCircle).toBeInTheDocument();
    });
  });
});
