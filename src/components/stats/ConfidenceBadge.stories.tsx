/**
 * @file ConfidenceBadge.stories.tsx
 * @description ConfidenceBadge 컴포넌트 스토리
 */

import type { Meta, StoryObj } from '@storybook/react';
import { ConfidenceBadge, WinRateWithCI } from './ConfidenceBadge';

const meta: Meta<typeof ConfidenceBadge> = {
  title: 'Stats/ConfidenceBadge',
  component: ConfidenceBadge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    sampleSize: { control: { type: 'number', min: 0, max: 1000 } },
    size: { control: 'select', options: ['small', 'medium'] },
    showTooltip: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof ConfidenceBadge>;

export const VeryLow: Story = {
  args: {
    sampleSize: 5,
    size: 'medium',
  },
};

export const Low: Story = {
  args: {
    sampleSize: 15,
    size: 'medium',
  },
};

export const Medium: Story = {
  args: {
    sampleSize: 50,
    size: 'medium',
  },
};

export const High: Story = {
  args: {
    sampleSize: 150,
    size: 'medium',
  },
};

export const VeryHigh: Story = {
  args: {
    sampleSize: 500,
    size: 'medium',
  },
};

export const SmallSize: Story = {
  args: {
    sampleSize: 100,
    size: 'small',
  },
};

// WinRateWithCI 스토리
const winRateMeta: Meta<typeof WinRateWithCI> = {
  title: 'Stats/WinRateWithCI',
  component: WinRateWithCI,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const WinRateDefault: StoryObj<typeof WinRateWithCI> = {
  render: () => <WinRateWithCI wins={75} total={100} />,
};

export const WinRateWithConfidenceInterval: StoryObj<typeof WinRateWithCI> = {
  render: () => <WinRateWithCI wins={45} total={60} showCI />,
};

export const WinRateLowSample: StoryObj<typeof WinRateWithCI> = {
  render: () => <WinRateWithCI wins={3} total={5} showCI />,
};

export const WinRateNoBadge: StoryObj<typeof WinRateWithCI> = {
  render: () => <WinRateWithCI wins={80} total={100} showBadge={false} />,
};
