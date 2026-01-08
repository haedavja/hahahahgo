/**
 * @file ConfidenceBadge.stories.tsx
 * @description ConfidenceBadge 컴포넌트 스토리 (인터랙션 테스트 포함)
 */

import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 신뢰도 배지가 렌더링되었는지 확인
    const badge = canvas.getByText(/매우 낮음|낮음/i);
    await expect(badge).toBeInTheDocument();
  },
};

export const Low: Story = {
  args: {
    sampleSize: 15,
    size: 'medium',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const badge = canvas.getByText(/낮음/i);
    await expect(badge).toBeInTheDocument();
  },
};

export const Medium: Story = {
  args: {
    sampleSize: 50,
    size: 'medium',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const badge = canvas.getByText(/보통|중간/i);
    await expect(badge).toBeInTheDocument();
  },
};

export const High: Story = {
  args: {
    sampleSize: 150,
    size: 'medium',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const badge = canvas.getByText(/높음/i);
    await expect(badge).toBeInTheDocument();
  },
};

export const VeryHigh: Story = {
  args: {
    sampleSize: 500,
    size: 'medium',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const badge = canvas.getByText(/매우 높음|높음/i);
    await expect(badge).toBeInTheDocument();
  },
};

export const SmallSize: Story = {
  args: {
    sampleSize: 100,
    size: 'small',
  },
};

// WinRateWithCI 스토리
export const WinRateDefault: StoryObj<typeof WinRateWithCI> = {
  render: () => <WinRateWithCI wins={75} total={100} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 승률이 표시되는지 확인
    const winRate = canvas.getByText(/75\.0%/);
    await expect(winRate).toBeInTheDocument();
  },
};

export const WinRateWithConfidenceInterval: StoryObj<typeof WinRateWithCI> = {
  render: () => <WinRateWithCI wins={45} total={60} showCI />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 승률이 표시되는지 확인
    const winRate = canvas.getByText(/75\.0%/);
    await expect(winRate).toBeInTheDocument();
  },
};

export const WinRateLowSample: StoryObj<typeof WinRateWithCI> = {
  render: () => <WinRateWithCI wins={3} total={5} showCI />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 낮은 샘플에서도 렌더링되는지 확인
    const winRate = canvas.getByText(/60\.0%/);
    await expect(winRate).toBeInTheDocument();
  },
};

export const WinRateNoBadge: StoryObj<typeof WinRateWithCI> = {
  render: () => <WinRateWithCI wins={80} total={100} showBadge={false} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 승률만 표시되는지 확인
    const winRate = canvas.getByText(/80\.0%/);
    await expect(winRate).toBeInTheDocument();
  },
};
