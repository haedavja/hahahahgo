/**
 * @file TimelineDisplay.stories.tsx
 * @description TimelineDisplay 컴포넌트 스토리 (타임라인 시각화)
 */

import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { TimelineDisplay } from './TimelineDisplay';
import type { Card } from '../../../types/core';
import type { TimelineAction } from '../../../types/systems';

// Mock 카드 생성 헬퍼
const createMockCard = (id: string, name: string, speedCost: number, type: 'attack' | 'defense' = 'attack'): Card => ({
  id,
  name,
  type,
  speedCost,
  actionCost: 1,
  damage: type === 'attack' ? 10 : 0,
  block: type === 'defense' ? 10 : 0,
  description: `${name} 카드`,
  traits: [],
});

// Mock 타임라인 액션 생성
const createTimelineAction = (
  actor: 'player' | 'enemy',
  card: Card,
  speedCost: number
): TimelineAction => ({
  actor,
  cardId: card.id,
  name: card.name,
  speedCost,
  priorityWeight: 0,
  priority: 'normal',
  actionCost: card.actionCost,
  tags: card.traits || [],
  roll: Math.random(),
});

// Mock 플레이어
const mockPlayer = {
  maxSpeed: 12,
  strength: 0,
  tokens: { usage: [], turn: [], permanent: [] },
};

// Mock 적
const mockEnemy = {
  maxSpeed: 12,
  name: '고블린',
  tokens: { usage: [], turn: [], permanent: [] },
};

// Mock 전투 상태
const mockBattleSelect = {
  phase: 'select' as const,
  selected: [],
  queue: [],
};

const mockBattleResolve = {
  phase: 'resolve' as const,
  selected: [],
  queue: [],
};

// Mock 카드들
const playerCards = [
  createMockCard('strike', '타격', 3),
  createMockCard('slash', '베기', 5),
  createMockCard('guard', '방어', 2, 'defense'),
];

const enemyCards = [
  createMockCard('enemy_attack', '적 공격', 4),
  createMockCard('enemy_defend', '적 방어', 6, 'defense'),
];

// 속도 눈금 생성
const generateSpeedTicks = (max: number) =>
  Array.from({ length: Math.ceil(max / 2) + 1 }, (_, i) => i * 2);

// Mock 액션
const mockActions = {
  setHoveredEnemyAction: () => {},
  onLeisurePositionChange: () => {},
  onStrainOffsetChange: () => {},
};

const meta: Meta<typeof TimelineDisplay> = {
  title: 'Battle/TimelineDisplay',
  component: TimelineDisplay,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{
        padding: '40px 20px',
        background: 'linear-gradient(to bottom, #0f172a, #1e293b)',
        minHeight: '400px',
      }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TimelineDisplay>;

// 기본 타임라인 (선택 단계)
export const SelectPhase: Story = {
  args: {
    player: mockPlayer,
    enemy: mockEnemy,
    DEFAULT_PLAYER_MAX_SPEED: 12,
    DEFAULT_ENEMY_MAX_SPEED: 12,
    generateSpeedTicks,
    battle: mockBattleSelect,
    timelineProgress: 0,
    timelineIndicatorVisible: false,
    playerTimeline: playerCards.map((c) => createTimelineAction('player', c, c.speedCost)),
    enemyTimeline: enemyCards.map((c) => createTimelineAction('enemy', c, c.speedCost)),
    actions: mockActions,
    insightAnimLevel: 0,
    insightAnimPulseKey: 0,
    effectiveInsight: 0,
    insightReveal: null,
    queue: null,
    executingCardIndex: -1,
    usedCardIndices: [],
    qIndex: 0,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 타임라인이 렌더링되는지 확인
    const timeline = canvas.getByRole('region', { hidden: true }) || canvasElement.querySelector('[class*="timeline"]');
    await expect(timeline || canvasElement).toBeInTheDocument();
  },
};

// 진행 단계 (시곗바늘 표시)
export const ResolvePhase: Story = {
  args: {
    player: mockPlayer,
    enemy: mockEnemy,
    DEFAULT_PLAYER_MAX_SPEED: 12,
    DEFAULT_ENEMY_MAX_SPEED: 12,
    generateSpeedTicks,
    battle: mockBattleResolve,
    timelineProgress: 50,
    timelineIndicatorVisible: true,
    playerTimeline: playerCards.map((c) => createTimelineAction('player', c, c.speedCost)),
    enemyTimeline: enemyCards.map((c) => createTimelineAction('enemy', c, c.speedCost)),
    actions: mockActions,
    insightAnimLevel: 0,
    insightAnimPulseKey: 0,
    effectiveInsight: 0,
    insightReveal: null,
    queue: [
      { actor: 'player' as const, card: playerCards[2], sp: 2 },
      { actor: 'player' as const, card: playerCards[0], sp: 3 },
      { actor: 'enemy' as const, card: enemyCards[0], sp: 4 },
      { actor: 'player' as const, card: playerCards[1], sp: 5 },
      { actor: 'enemy' as const, card: enemyCards[1], sp: 6 },
    ],
    executingCardIndex: 1,
    usedCardIndices: [0],
    qIndex: 1,
  },
};

// 통찰 레벨 1 (예측)
export const InsightLevel1: Story = {
  args: {
    player: mockPlayer,
    enemy: mockEnemy,
    DEFAULT_PLAYER_MAX_SPEED: 12,
    DEFAULT_ENEMY_MAX_SPEED: 12,
    generateSpeedTicks,
    battle: mockBattleSelect,
    timelineProgress: 0,
    timelineIndicatorVisible: false,
    playerTimeline: playerCards.map((c) => createTimelineAction('player', c, c.speedCost)),
    enemyTimeline: enemyCards.map((c) => createTimelineAction('enemy', c, c.speedCost)),
    actions: mockActions,
    insightAnimLevel: 1,
    insightAnimPulseKey: Date.now(),
    effectiveInsight: 1,
    insightReveal: {
      level: 1,
      revealedIndices: [0],
    },
    queue: null,
    executingCardIndex: -1,
    usedCardIndices: [],
    qIndex: 0,
  },
};

// 통찰 레벨 3 (혜안)
export const InsightLevel3: Story = {
  args: {
    player: mockPlayer,
    enemy: mockEnemy,
    DEFAULT_PLAYER_MAX_SPEED: 12,
    DEFAULT_ENEMY_MAX_SPEED: 12,
    generateSpeedTicks,
    battle: mockBattleSelect,
    timelineProgress: 0,
    timelineIndicatorVisible: false,
    playerTimeline: playerCards.map((c) => createTimelineAction('player', c, c.speedCost)),
    enemyTimeline: enemyCards.map((c) => createTimelineAction('enemy', c, c.speedCost)),
    actions: mockActions,
    insightAnimLevel: 3,
    insightAnimPulseKey: Date.now(),
    effectiveInsight: 3,
    insightReveal: {
      level: 3,
      revealedIndices: [0, 1],
      showDetails: true,
    },
    queue: null,
    executingCardIndex: -1,
    usedCardIndices: [],
    qIndex: 0,
  },
};

// 빈 타임라인
export const EmptyTimeline: Story = {
  args: {
    player: mockPlayer,
    enemy: mockEnemy,
    DEFAULT_PLAYER_MAX_SPEED: 12,
    DEFAULT_ENEMY_MAX_SPEED: 12,
    generateSpeedTicks,
    battle: mockBattleSelect,
    timelineProgress: 0,
    timelineIndicatorVisible: false,
    playerTimeline: [],
    enemyTimeline: [],
    actions: mockActions,
    insightAnimLevel: 0,
    insightAnimPulseKey: 0,
    effectiveInsight: null,
    insightReveal: null,
    queue: null,
    executingCardIndex: -1,
    usedCardIndices: [],
    qIndex: 0,
  },
};

// 큰 속도 범위
export const LargeSpeedRange: Story = {
  args: {
    player: { ...mockPlayer, maxSpeed: 20 },
    enemy: { ...mockEnemy, maxSpeed: 20 },
    DEFAULT_PLAYER_MAX_SPEED: 20,
    DEFAULT_ENEMY_MAX_SPEED: 20,
    generateSpeedTicks,
    battle: mockBattleSelect,
    timelineProgress: 0,
    timelineIndicatorVisible: false,
    playerTimeline: [
      createTimelineAction('player', createMockCard('fast', '질풍', 2), 2),
      createTimelineAction('player', createMockCard('normal', '일격', 8), 8),
      createTimelineAction('player', createMockCard('slow', '대검', 14), 14),
      createTimelineAction('player', createMockCard('heavy', '중격', 18), 18),
    ],
    enemyTimeline: [
      createTimelineAction('enemy', createMockCard('e1', '적 빠름', 3), 3),
      createTimelineAction('enemy', createMockCard('e2', '적 느림', 16), 16),
    ],
    actions: mockActions,
    insightAnimLevel: 0,
    insightAnimPulseKey: 0,
    effectiveInsight: 0,
    insightReveal: null,
    queue: null,
    executingCardIndex: -1,
    usedCardIndices: [],
    qIndex: 0,
  },
};
