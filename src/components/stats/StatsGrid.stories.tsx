/**
 * @file StatsGrid.stories.tsx
 * @description StatsGrid 컴포넌트 스토리
 */

import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { StatsGrid } from './StatsGrid';
import { STATS_COLORS } from './styles';

const meta: Meta<typeof StatsGrid> = {
  title: 'Stats/StatsGrid',
  component: StatsGrid,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof StatsGrid>;

export const Default: Story = {
  args: {
    items: [
      { label: '총 전투', value: '150' },
      { label: '승률', value: '75.5%', valueColor: STATS_COLORS.positive },
      { label: '평균 턴', value: '4.2' },
      { label: '총 피해', value: '12,500' },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('총 전투')).toBeInTheDocument();
    await expect(canvas.getByText('150')).toBeInTheDocument();
    await expect(canvas.getByText('승률')).toBeInTheDocument();
    await expect(canvas.getByText('75.5%')).toBeInTheDocument();
  },
};

export const TwoColumns: Story = {
  args: {
    items: [
      { label: '승리', value: '113', valueColor: STATS_COLORS.positive },
      { label: '패배', value: '37', valueColor: STATS_COLORS.negative },
    ],
    columns: 2,
  },
};

export const ThreeColumns: Story = {
  args: {
    items: [
      { label: '공격', value: '45%' },
      { label: '방어', value: '30%' },
      { label: '지원', value: '25%' },
    ],
    columns: 3,
  },
};

export const WithColors: Story = {
  args: {
    items: [
      { label: '승률', value: '85.2%', valueColor: STATS_COLORS.positive },
      { label: '패배율', value: '14.8%', valueColor: STATS_COLORS.negative },
      { label: '평균 턴', value: '3.8', valueColor: STATS_COLORS.warning },
      { label: '최고 연승', value: '12', valueColor: '#a78bfa' },
    ],
  },
};

export const SingleItem: Story = {
  args: {
    items: [
      { label: '전체 승률', value: '72.3%', valueColor: STATS_COLORS.positive },
    ],
    columns: 1,
  },
};

export const ManyItems: Story = {
  args: {
    items: [
      { label: '총 전투', value: '500' },
      { label: '승리', value: '380', valueColor: STATS_COLORS.positive },
      { label: '패배', value: '120', valueColor: STATS_COLORS.negative },
      { label: '승률', value: '76%', valueColor: STATS_COLORS.positive },
      { label: '평균 턴', value: '4.5' },
      { label: '평균 피해', value: '450' },
      { label: '평균 방어', value: '280' },
      { label: '카드 사용', value: '2,450' },
    ],
    columns: 4,
  },
};
