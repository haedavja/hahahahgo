/**
 * @file StatsTable.stories.tsx
 * @description StatsTable 컴포넌트 스토리
 */

import type { Meta, StoryObj } from '@storybook/react';
import { StatsTable, type StatsTableColumn } from './StatsTable';
import { STATS_COLORS } from './styles';

interface EnemyData {
  name: string;
  battles: number;
  winRate: number;
  avgTurns: number;
}

const mockEnemyData: EnemyData[] = [
  { name: '슬라임', battles: 150, winRate: 92.3, avgTurns: 2.8 },
  { name: '고블린', battles: 85, winRate: 78.5, avgTurns: 3.5 },
  { name: '오크', battles: 48, winRate: 52.1, avgTurns: 4.8 },
  { name: '드래곤', battles: 16, winRate: 31.2, avgTurns: 7.2 },
];

const enemyColumns: StatsTableColumn<EnemyData>[] = [
  { key: 'name', header: '적' },
  { key: 'battles', header: '전투 수', align: 'center' },
  {
    key: 'winRate',
    header: '승률',
    align: 'right',
    render: (item) => (
      <span style={{ color: item.winRate >= 50 ? STATS_COLORS.positive : STATS_COLORS.negative }}>
        {item.winRate.toFixed(1)}%
      </span>
    ),
  },
  {
    key: 'avgTurns',
    header: '평균 턴',
    align: 'right',
    render: (item) => `${item.avgTurns.toFixed(1)}턴`,
  },
];

const meta: Meta<typeof StatsTable<EnemyData>> = {
  title: 'Stats/StatsTable',
  component: StatsTable,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '500px', background: '#1e293b', padding: '16px', borderRadius: '8px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StatsTable<EnemyData>>;

export const Default: Story = {
  args: {
    data: mockEnemyData,
    columns: enemyColumns,
    keyExtractor: (item) => item.name,
  },
};

export const EmptyData: Story = {
  args: {
    data: [],
    columns: enemyColumns,
    keyExtractor: (item) => item.name,
    emptyMessage: '전투 기록이 없습니다',
  },
};

export const SingleRow: Story = {
  args: {
    data: [mockEnemyData[0]],
    columns: enemyColumns,
    keyExtractor: (item) => item.name,
  },
};

// 카드 통계 예시
interface CardData {
  name: string;
  uses: number;
  avgDamage: number;
  winContribution: number;
}

const mockCardData: CardData[] = [
  { name: '타격', uses: 450, avgDamage: 12.5, winContribution: 23.1 },
  { name: '방어', uses: 380, avgDamage: 0, winContribution: 18.5 },
  { name: '강타', uses: 120, avgDamage: 28.3, winContribution: 31.2 },
  { name: '연타', uses: 95, avgDamage: 18.7, winContribution: 15.8 },
];

const cardColumns: StatsTableColumn<CardData>[] = [
  { key: 'name', header: '카드' },
  { key: 'uses', header: '사용', align: 'center' },
  {
    key: 'avgDamage',
    header: '평균 피해',
    align: 'right',
    render: (item) => item.avgDamage > 0 ? item.avgDamage.toFixed(1) : '-',
  },
  {
    key: 'winContribution',
    header: '승리 기여',
    align: 'right',
    render: (item) => (
      <span style={{ color: STATS_COLORS.positive }}>
        {item.winContribution.toFixed(1)}%
      </span>
    ),
  },
];

export const CardStats: Story = {
  args: {
    data: mockCardData as unknown as EnemyData[],
    columns: cardColumns as unknown as StatsTableColumn<EnemyData>[],
    keyExtractor: (item) => (item as unknown as CardData).name,
  },
};
