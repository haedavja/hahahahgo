/**
 * @file DungeonNode.stories.tsx
 * @description 던전 노드 컴포넌트 스토리
 *
 * 던전 탐험 시스템의 핵심 컴포넌트입니다.
 * 노드 타입, 이벤트, 시간 페널티 등 다양한 상태를 보여줍니다.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { expect, within, userEvent } from '@storybook/test';
import { useEffect } from 'react';
import { DungeonNode } from './DungeonNode';
import { useGameStore } from '../../state/gameStore';
import { DUNGEON_NODE_TYPES, DUNGEON_EVENT_TYPES } from '../../data/dungeonNodes';

// ==================== Mock Types ====================
interface MockDungeonNode {
  id: string;
  type: string;
  name: string;
  description: string;
  x: number;
  y: number;
  event: { type: string; templateId?: string; quality?: string; difficulty?: number } | null;
  connections: string[];
  visited: boolean;
  cleared: boolean;
  hidden?: boolean;
}

interface MockDungeonState {
  id: string;
  nodes: MockDungeonNode[];
  connections: Record<string, unknown[]>;
  currentNodeId: string;
  unlockedShortcuts: string[];
  discoveredHidden: string[];
  timeElapsed: number;
  maxTime: number;
}

// ==================== Store Decorator ====================
interface StoreState {
  playerHp?: number;
  maxHp?: number;
  playerStrength?: number;
  playerAgility?: number;
  playerInsight?: number;
}

function StoreInitializer({ state, children }: { state: StoreState; children: React.ReactNode }) {
  useEffect(() => {
    useGameStore.setState({
      playerHp: state.playerHp ?? 100,
      maxHp: state.maxHp ?? 100,
      playerStrength: state.playerStrength ?? 0,
      playerAgility: state.playerAgility ?? 0,
      playerInsight: state.playerInsight ?? 0,
      characterBuild: {
        mainSpecials: ['strike', 'guard'],
        subSpecials: ['slash'],
      },
    });

    return () => {
      useGameStore.setState({
        playerHp: 100,
        maxHp: 100,
        playerStrength: 0,
        playerAgility: 0,
        playerInsight: 0,
      });
    };
  }, [state]);

  return <>{children}</>;
}

function createStoreDecorator(state: StoreState) {
  return (Story: React.ComponentType) => (
    <StoreInitializer state={state}>
      <div style={{ background: '#0f172a', minHeight: '100vh' }}>
        <Story />
      </div>
    </StoreInitializer>
  );
}

// ==================== Mock Data Factories ====================
function createMockNode(overrides: Partial<MockDungeonNode> = {}): MockDungeonNode {
  return {
    id: 'node_1',
    type: DUNGEON_NODE_TYPES.ROOM,
    name: '빈 방',
    description: '아무것도 없는 평범한 방입니다.',
    x: 0,
    y: 0,
    event: null,
    connections: [],
    visited: false,
    cleared: false,
    ...overrides,
  };
}

function createMockDungeon(overrides: Partial<MockDungeonState> = {}): MockDungeonState {
  const defaultNodes: MockDungeonNode[] = [
    createMockNode({
      id: 'entrance',
      type: DUNGEON_NODE_TYPES.ENTRANCE,
      name: '던전 입구',
      description: '어둠 속으로 이어지는 입구입니다.',
      connections: ['room_1', 'corridor_1'],
      visited: true,
    }),
    createMockNode({
      id: 'room_1',
      type: DUNGEON_NODE_TYPES.ROOM,
      name: '작은 방',
      description: '작은 방이 나타났습니다.',
      connections: ['entrance', 'crossroad'],
    }),
    createMockNode({
      id: 'corridor_1',
      type: DUNGEON_NODE_TYPES.CORRIDOR,
      name: '좁은 복도',
      description: '좁은 복도가 이어집니다.',
      connections: ['entrance', 'exit'],
    }),
    createMockNode({
      id: 'crossroad',
      type: DUNGEON_NODE_TYPES.CROSSROAD,
      name: '갈림길',
      description: '여러 갈래 길이 보입니다.',
      connections: ['room_1', 'exit'],
    }),
    createMockNode({
      id: 'exit',
      type: DUNGEON_NODE_TYPES.EXIT,
      name: '출구',
      description: '빛이 보입니다!',
      connections: ['corridor_1', 'crossroad'],
    }),
  ];

  return {
    id: 'dungeon_test',
    nodes: defaultNodes,
    connections: {},
    currentNodeId: 'entrance',
    unlockedShortcuts: [],
    discoveredHidden: [],
    timeElapsed: 0,
    maxTime: 30,
    ...overrides,
  };
}

// ==================== Meta ====================
const meta: Meta<typeof DungeonNode> = {
  title: 'Dungeon/DungeonNode',
  component: DungeonNode,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DungeonNode>;

// ==================== Stories ====================

/**
 * 던전 입구 - 탐험 시작
 */
export const Entrance: Story = {
  args: {
    dungeon: createMockDungeon(),
    onNavigate: (nodeId) => console.log('Navigate to:', nodeId),
    onExit: () => console.log('Exit dungeon'),
    onCombat: (combatId) => console.log('Combat:', combatId),
  },
  decorators: [createStoreDecorator({ playerHp: 100, maxHp: 100 })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 노드 이름 확인
    await expect(canvas.getByText('던전 입구')).toBeInTheDocument();

    // 시간 표시 확인
    await expect(canvas.getByText('탐험 시간')).toBeInTheDocument();
  },
};

/**
 * 체력 위험 상태
 */
export const LowHealth: Story = {
  args: {
    dungeon: createMockDungeon({ currentNodeId: 'room_1' }),
    onNavigate: () => {},
    onExit: () => {},
    onCombat: () => {},
  },
  decorators: [createStoreDecorator({ playerHp: 15, maxHp: 100 })],
};

/**
 * 시간 경과 - 주의 단계
 */
export const TimeWarning: Story = {
  args: {
    dungeon: createMockDungeon({
      currentNodeId: 'room_1',
      timeElapsed: 15,
      maxTime: 30,
    }),
    onNavigate: () => {},
    onExit: () => {},
    onCombat: () => {},
  },
  decorators: [createStoreDecorator({ playerHp: 80, maxHp: 100 })],
};

/**
 * 시간 위험 - 경고 단계
 */
export const TimeCritical: Story = {
  args: {
    dungeon: createMockDungeon({
      currentNodeId: 'crossroad',
      timeElapsed: 25,
      maxTime: 30,
    }),
    onNavigate: () => {},
    onExit: () => {},
    onCombat: () => {},
  },
  decorators: [createStoreDecorator({ playerHp: 50, maxHp: 100 })],
};

/**
 * 갈림길 노드
 */
export const Crossroad: Story = {
  args: {
    dungeon: createMockDungeon({ currentNodeId: 'crossroad' }),
    onNavigate: () => {},
    onExit: () => {},
    onCombat: () => {},
  },
  decorators: [createStoreDecorator({ playerHp: 100, maxHp: 100 })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('갈림길')).toBeInTheDocument();
  },
};

/**
 * 출구 도착 - 탈출 버튼 표시
 */
export const ExitNode: Story = {
  args: {
    dungeon: createMockDungeon({
      currentNodeId: 'exit',
      timeElapsed: 20,
    }),
    onNavigate: () => {},
    onExit: () => console.log('Exiting dungeon!'),
    onCombat: () => {},
  },
  decorators: [createStoreDecorator({ playerHp: 70, maxHp: 100 })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 출구 노드 확인
    await expect(canvas.getByText('출구')).toBeInTheDocument();

    // 탈출 버튼 확인
    await expect(canvas.getByText('🌅 던전 탈출')).toBeInTheDocument();
  },
};

/**
 * 보물 상자 이벤트
 */
export const ChestEvent: Story = {
  args: {
    dungeon: createMockDungeon({
      currentNodeId: 'room_1',
      nodes: [
        createMockNode({
          id: 'room_1',
          type: DUNGEON_NODE_TYPES.ROOM,
          name: '보물 방',
          description: '잠긴 상자가 있습니다.',
          event: { type: DUNGEON_EVENT_TYPES.CHEST, templateId: 'lockedChest' },
          connections: ['entrance'],
        }),
        createMockNode({
          id: 'entrance',
          type: DUNGEON_NODE_TYPES.ENTRANCE,
          name: '입구',
          description: '입구',
          connections: ['room_1'],
          visited: true,
        }),
      ],
    }),
    onNavigate: () => {},
    onExit: () => {},
    onCombat: () => {},
  },
  decorators: [createStoreDecorator({ playerHp: 100, maxHp: 100, playerStrength: 5 })],
};

/**
 * 장애물 이벤트
 */
export const ObstacleEvent: Story = {
  args: {
    dungeon: createMockDungeon({
      currentNodeId: 'corridor_1',
      nodes: [
        createMockNode({
          id: 'corridor_1',
          type: DUNGEON_NODE_TYPES.CORRIDOR,
          name: '절벽 앞',
          description: '깊은 절벽이 앞을 막고 있습니다.',
          event: { type: DUNGEON_EVENT_TYPES.OBSTACLE, templateId: 'cliff' },
          connections: ['entrance'],
        }),
        createMockNode({
          id: 'entrance',
          type: DUNGEON_NODE_TYPES.ENTRANCE,
          name: '입구',
          description: '입구',
          connections: ['corridor_1'],
          visited: true,
        }),
      ],
    }),
    onNavigate: () => {},
    onExit: () => {},
    onCombat: () => {},
  },
  decorators: [createStoreDecorator({ playerHp: 100, maxHp: 100, playerAgility: 3 })],
};

/**
 * 전투 이벤트
 */
export const CombatEvent: Story = {
  args: {
    dungeon: createMockDungeon({
      currentNodeId: 'room_1',
      nodes: [
        createMockNode({
          id: 'room_1',
          type: DUNGEON_NODE_TYPES.ROOM,
          name: '적의 방',
          description: '적이 기다리고 있습니다!',
          event: { type: DUNGEON_EVENT_TYPES.COMBAT, difficulty: 2 },
          connections: ['entrance'],
        }),
        createMockNode({
          id: 'entrance',
          type: DUNGEON_NODE_TYPES.ENTRANCE,
          name: '입구',
          description: '입구',
          connections: ['room_1'],
          visited: true,
        }),
      ],
    }),
    onNavigate: () => {},
    onExit: () => {},
    onCombat: (combatId) => console.log('Starting combat:', combatId),
  },
  decorators: [createStoreDecorator({ playerHp: 80, maxHp: 100 })],
};

/**
 * 휴식 이벤트
 */
export const RestEvent: Story = {
  args: {
    dungeon: createMockDungeon({
      currentNodeId: 'room_1',
      nodes: [
        createMockNode({
          id: 'room_1',
          type: DUNGEON_NODE_TYPES.ROOM,
          name: '모닥불',
          description: '따뜻한 모닥불이 타오르고 있습니다.',
          event: { type: DUNGEON_EVENT_TYPES.REST },
          connections: ['entrance', 'exit'],
        }),
        createMockNode({
          id: 'entrance',
          type: DUNGEON_NODE_TYPES.ENTRANCE,
          name: '입구',
          description: '입구',
          connections: ['room_1'],
          visited: true,
        }),
        createMockNode({
          id: 'exit',
          type: DUNGEON_NODE_TYPES.EXIT,
          name: '출구',
          description: '출구',
          connections: ['room_1'],
        }),
      ],
    }),
    onNavigate: () => {},
    onExit: () => {},
    onCombat: () => {},
  },
  decorators: [createStoreDecorator({ playerHp: 40, maxHp: 100 })],
};

/**
 * 상인 이벤트
 */
export const MerchantEvent: Story = {
  args: {
    dungeon: createMockDungeon({
      currentNodeId: 'room_1',
      nodes: [
        createMockNode({
          id: 'room_1',
          type: DUNGEON_NODE_TYPES.ROOM,
          name: '상인의 은신처',
          description: '미스터리한 상인이 있습니다.',
          event: { type: DUNGEON_EVENT_TYPES.MERCHANT },
          connections: ['entrance'],
        }),
        createMockNode({
          id: 'entrance',
          type: DUNGEON_NODE_TYPES.ENTRANCE,
          name: '입구',
          description: '입구',
          connections: ['room_1'],
          visited: true,
        }),
      ],
    }),
    onNavigate: () => {},
    onExit: () => {},
    onCombat: () => {},
  },
  decorators: [createStoreDecorator({ playerHp: 100, maxHp: 100 })],
};

/**
 * 함정 이벤트
 */
export const TrapEvent: Story = {
  args: {
    dungeon: createMockDungeon({
      currentNodeId: 'corridor_1',
      nodes: [
        createMockNode({
          id: 'corridor_1',
          type: DUNGEON_NODE_TYPES.CORRIDOR,
          name: '수상한 복도',
          description: '바닥에 이상한 무늬가 있습니다...',
          event: { type: DUNGEON_EVENT_TYPES.TRAP },
          connections: ['entrance'],
        }),
        createMockNode({
          id: 'entrance',
          type: DUNGEON_NODE_TYPES.ENTRANCE,
          name: '입구',
          description: '입구',
          connections: ['corridor_1'],
          visited: true,
        }),
      ],
    }),
    onNavigate: () => {},
    onExit: () => {},
    onCombat: () => {},
  },
  decorators: [createStoreDecorator({ playerHp: 90, maxHp: 100, playerInsight: 2 })],
};

/**
 * 고능력치 플레이어
 */
export const HighStatsPlayer: Story = {
  args: {
    dungeon: createMockDungeon({ currentNodeId: 'crossroad' }),
    onNavigate: () => {},
    onExit: () => {},
    onCombat: () => {},
  },
  decorators: [
    createStoreDecorator({
      playerHp: 100,
      maxHp: 100,
      playerStrength: 10,
      playerAgility: 8,
      playerInsight: 5,
    }),
  ],
};

/**
 * 노드 이동 인터랙션
 */
export const NavigationInteraction: Story = {
  args: {
    dungeon: createMockDungeon({ currentNodeId: 'entrance' }),
    onNavigate: (nodeId) => console.log('Navigating to:', nodeId),
    onExit: () => {},
    onCombat: () => {},
  },
  decorators: [createStoreDecorator({ playerHp: 100, maxHp: 100 })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // 이동 섹션 확인
    await expect(canvas.getByText('이동')).toBeInTheDocument();

    // 연결된 노드 버튼들 확인
    const navButtons = canvas.getAllByRole('button').filter(
      btn => btn.textContent?.includes('방') || btn.textContent?.includes('복도')
    );

    // 첫 번째 이동 버튼 클릭
    if (navButtons.length > 0) {
      await user.click(navButtons[0]);
    }
  },
};

/**
 * 방문한 노드 표시
 */
export const VisitedNodes: Story = {
  args: {
    dungeon: createMockDungeon({
      currentNodeId: 'crossroad',
      nodes: [
        createMockNode({
          id: 'entrance',
          type: DUNGEON_NODE_TYPES.ENTRANCE,
          name: '입구',
          description: '입구',
          connections: ['room_1'],
          visited: true,
        }),
        createMockNode({
          id: 'room_1',
          type: DUNGEON_NODE_TYPES.ROOM,
          name: '작은 방',
          description: '작은 방',
          connections: ['crossroad', 'entrance'],
          visited: true,
        }),
        createMockNode({
          id: 'crossroad',
          type: DUNGEON_NODE_TYPES.CROSSROAD,
          name: '갈림길',
          description: '갈림길',
          connections: ['room_1', 'exit'],
          visited: false,
        }),
        createMockNode({
          id: 'exit',
          type: DUNGEON_NODE_TYPES.EXIT,
          name: '출구',
          description: '출구',
          connections: ['crossroad'],
          visited: false,
        }),
      ],
    }),
    onNavigate: () => {},
    onExit: () => {},
    onCombat: () => {},
  },
  decorators: [createStoreDecorator({ playerHp: 100, maxHp: 100 })],
};
