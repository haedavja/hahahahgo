/**
 * @file StatRow.stories.tsx
 * @description StatRow 컴포넌트 스토리
 */

import type { Meta, StoryObj } from '@storybook/react';
import { StatRow } from './StatRow';
import { STATS_COLORS } from './styles';

const meta: Meta<typeof StatRow> = {
  title: 'Stats/StatRow',
  component: StatRow,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    valueColor: { control: 'color' },
  },
};

export default meta;
type Story = StoryObj<typeof StatRow>;

export const Default: Story = {
  args: {
    label: '승률',
    value: '75.5%',
  },
};

export const Success: Story = {
  args: {
    label: '승률',
    value: '85.2%',
    valueColor: STATS_COLORS.positive,
  },
};

export const Danger: Story = {
  args: {
    label: '승률',
    value: '32.1%',
    valueColor: STATS_COLORS.negative,
  },
};

export const Warning: Story = {
  args: {
    label: '평균 턴',
    value: '4.5턴',
    valueColor: STATS_COLORS.warning,
  },
};

export const NumericValue: Story = {
  args: {
    label: '총 피해량',
    value: 12500,
  },
};

export const WithUnit: Story = {
  args: {
    label: '평균 딜',
    value: '450.2 DPT',
  },
};

export const LongLabel: Story = {
  args: {
    label: '총 획득 골드 (상점 포함)',
    value: '1,234',
  },
};
