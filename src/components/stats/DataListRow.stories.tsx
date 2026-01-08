/**
 * @file DataListRow.stories.tsx
 * @description DataListRow 컴포넌트 스토리
 */

import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { DataListRow } from './DataListRow';
import { ConfidenceBadge } from './ConfidenceBadge';
import { STATS_COLORS } from './styles';

const meta: Meta<typeof DataListRow> = {
  title: 'Stats/DataListRow',
  component: DataListRow,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '300px', background: '#1e293b', padding: '16px', borderRadius: '8px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DataListRow>;

export const Default: Story = {
  args: {
    label: '슬라임',
    value: '85.5%',
    valueColor: STATS_COLORS.positive,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('슬라임')).toBeInTheDocument();
    await expect(canvas.getByText('85.5%')).toBeInTheDocument();
  },
};

export const WithSubtext: Story = {
  args: {
    label: '슬라임',
    value: '85.5%',
    valueColor: STATS_COLORS.positive,
    subtext: '평균 3.2턴 | 총 120전',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('평균 3.2턴 | 총 120전')).toBeInTheDocument();
  },
};

export const WithBadge: Story = {
  args: {
    label: '고블린 전사',
    value: '72.3%',
    valueColor: STATS_COLORS.positive,
    badge: <ConfidenceBadge sampleSize={150} />,
  },
};

export const WithBadgeAndSubtext: Story = {
  args: {
    label: '오크 대장',
    value: '45.2%',
    valueColor: STATS_COLORS.negative,
    subtext: '평균 5.8턴 | 총 31전',
    badge: <ConfidenceBadge sampleSize={31} />,
  },
};

export const LowWinRate: Story = {
  args: {
    label: '드래곤',
    value: '23.1%',
    valueColor: STATS_COLORS.negative,
    subtext: '평균 8.2턴 | 총 13전',
    subtextColor: STATS_COLORS.negative,
    badge: <ConfidenceBadge sampleSize={13} />,
  },
};

export const EmojiLabel: Story = {
  args: {
    label: '🗡️ 타격',
    value: '사용 450회',
    subtext: '평균 피해: 12.5',
  },
};

export const MultipleRows: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <DataListRow
        label="슬라임"
        value="92.3%"
        valueColor={STATS_COLORS.positive}
        badge={<ConfidenceBadge sampleSize={200} />}
      />
      <DataListRow
        label="고블린"
        value="78.5%"
        valueColor={STATS_COLORS.positive}
        badge={<ConfidenceBadge sampleSize={85} />}
      />
      <DataListRow
        label="오크"
        value="52.1%"
        valueColor={STATS_COLORS.warning}
        badge={<ConfidenceBadge sampleSize={48} />}
      />
      <DataListRow
        label="드래곤"
        value="31.2%"
        valueColor={STATS_COLORS.negative}
        badge={<ConfidenceBadge sampleSize={16} />}
      />
    </div>
  ),
};
