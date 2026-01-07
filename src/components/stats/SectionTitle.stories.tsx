/**
 * @file SectionTitle.stories.tsx
 * @description SectionTitle 컴포넌트 스토리
 */

import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { SectionTitle } from './SectionTitle';

const meta: Meta<typeof SectionTitle> = {
  title: 'Stats/SectionTitle',
  component: SectionTitle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    color: { control: 'color' },
    emoji: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof SectionTitle>;

export const Default: Story = {
  args: {
    children: '전투 통계',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('전투 통계')).toBeInTheDocument();
  },
};

export const WithEmoji: Story = {
  args: {
    children: '전투 통계',
    emoji: '⚔️',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/⚔️.*전투 통계/)).toBeInTheDocument();
  },
};

export const CustomColor: Story = {
  args: {
    children: '적 분석',
    color: '#ef4444',
    emoji: '👹',
  },
};

export const SuccessColor: Story = {
  args: {
    children: '승리 기록',
    color: '#22c55e',
    emoji: '🏆',
  },
};

export const InfoColor: Story = {
  args: {
    children: '카드 분석',
    color: '#3b82f6',
    emoji: '🃏',
  },
};

export const PurpleAccent: Story = {
  args: {
    children: '상징 효과',
    color: '#a855f7',
    emoji: '💎',
  },
};

export const LongTitle: Story = {
  args: {
    children: '전투별 상세 분석 및 통계 요약',
    emoji: '📊',
  },
};
