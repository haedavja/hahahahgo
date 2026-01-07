/**
 * @file TraitBadge.stories.tsx
 * @description TraitBadge 컴포넌트 스토리
 */

import type { Meta, StoryObj } from '@storybook/react';
import { TraitBadge, TraitBadgeList } from './TraitBadge';

const meta: Meta<typeof TraitBadge> = {
  title: 'Battle/TraitBadge',
  component: TraitBadge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    traitId: {
      control: 'select',
      options: [
        'SWIFT', 'ARMOR_PIERCING', 'LIFESTEAL', 'MULTI_HIT',
        'HEAVY', 'FRAGILE', 'RISKY', 'DELAYED',
      ],
    },
  },
};

export default meta;
type Story = StoryObj<typeof TraitBadge>;

// 긍정적 특성
export const Swift: Story = {
  args: {
    traitId: 'SWIFT',
  },
};

export const ArmorPiercing: Story = {
  args: {
    traitId: 'ARMOR_PIERCING',
  },
};

export const Lifesteal: Story = {
  args: {
    traitId: 'LIFESTEAL',
  },
};

// 부정적 특성
export const Heavy: Story = {
  args: {
    traitId: 'HEAVY',
  },
};

export const Fragile: Story = {
  args: {
    traitId: 'FRAGILE',
  },
};

// 리스트
export const BadgeList: StoryObj<typeof TraitBadgeList> = {
  render: () => (
    <TraitBadgeList traits={['SWIFT', 'ARMOR_PIERCING', 'LIFESTEAL']} />
  ),
};

export const MixedBadgeList: StoryObj<typeof TraitBadgeList> = {
  render: () => (
    <TraitBadgeList traits={['SWIFT', 'HEAVY', 'ARMOR_PIERCING', 'RISKY']} />
  ),
};

export const EmptyList: StoryObj<typeof TraitBadgeList> = {
  render: () => <TraitBadgeList traits={[]} />,
};

export const NullList: StoryObj<typeof TraitBadgeList> = {
  render: () => <TraitBadgeList traits={null} />,
};
