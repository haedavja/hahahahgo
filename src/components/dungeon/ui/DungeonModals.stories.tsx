/**
 * @file DungeonModals.stories.tsx
 * @description 던전 모달 컴포넌트 스토리
 */

import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { RewardModal, DungeonSummaryModal, CrossroadModal } from './DungeonModals';

// ==================== RewardModal ====================
const rewardMeta: Meta<typeof RewardModal> = {
  title: 'Dungeon/RewardModal',
  component: RewardModal,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
};

export default rewardMeta;
type RewardStory = StoryObj<typeof RewardModal>;

export const Victory: RewardStory = {
  args: {
    rewardModal: {
      victory: true,
      gold: 50,
      loot: 3,
    },
    onClose: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('승리!')).toBeInTheDocument();
    await expect(canvas.getByText('금 +50')).toBeInTheDocument();
    await expect(canvas.getByText('전리품 +3')).toBeInTheDocument();
  },
};

export const VictoryGoldOnly: RewardStory = {
  args: {
    rewardModal: {
      victory: true,
      gold: 100,
      loot: 0,
    },
    onClose: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('금 +100')).toBeInTheDocument();
  },
};

export const Defeat: RewardStory = {
  args: {
    rewardModal: {
      victory: false,
      gold: 0,
      loot: 0,
    },
    onClose: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('패배')).toBeInTheDocument();
    await expect(canvas.getByText('보상 없음')).toBeInTheDocument();
  },
};

export const Hidden: RewardStory = {
  args: {
    rewardModal: null,
    onClose: () => {},
  },
};

// ==================== DungeonSummaryModal ====================
export const SummaryMeta: Meta<typeof DungeonSummaryModal> = {
  title: 'Dungeon/DungeonSummaryModal',
  component: DungeonSummaryModal,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
};

type SummaryStory = StoryObj<typeof DungeonSummaryModal>;

export const PositiveRewards: SummaryStory = {
  args: {
    dungeonSummary: {
      gold: 150,
      intel: 30,
      loot: 5,
      material: 10,
    },
    onClose: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('던전 탐험 완료')).toBeInTheDocument();
    await expect(canvas.getByText('+150')).toBeInTheDocument();
    await expect(canvas.getByText('+30')).toBeInTheDocument();
  },
};

export const MixedRewards: SummaryStory = {
  args: {
    dungeonSummary: {
      gold: 50,
      intel: -10,
      loot: 2,
      material: -5,
    },
    onClose: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('-10')).toBeInTheDocument();
    await expect(canvas.getByText('-5')).toBeInTheDocument();
  },
};

export const ZeroRewards: SummaryStory = {
  args: {
    dungeonSummary: {
      gold: 0,
      intel: 0,
      loot: 0,
      material: 0,
    },
    onClose: () => {},
  },
};

// ==================== CrossroadModal ====================
export const CrossroadMeta: Meta<typeof CrossroadModal> = {
  title: 'Dungeon/CrossroadModal',
  component: CrossroadModal,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
};

type CrossroadStory = StoryObj<typeof CrossroadModal>;

export const BasicCrossroad: CrossroadStory = {
  args: {
    crossroadModal: {
      template: {
        name: '갈림길',
        description: '앞에 두 갈래 길이 나타났습니다. 어느 쪽으로 갈까요?',
        choices: [
          { id: 'left', text: '왼쪽 길로 간다', repeatable: false },
          { id: 'right', text: '오른쪽 길로 간다', repeatable: false },
        ],
      },
      choiceState: {},
    },
    screenShake: false,
    onSelectChoice: () => {},
    onClose: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('갈림길')).toBeInTheDocument();
    await expect(canvas.getByText('왼쪽 길로 간다')).toBeInTheDocument();
    await expect(canvas.getByText('오른쪽 길로 간다')).toBeInTheDocument();
  },
};

export const RepeatableChoice: CrossroadStory = {
  args: {
    crossroadModal: {
      template: {
        name: '신비한 샘',
        description: '마법의 샘에서 물을 마실 수 있습니다.',
        choices: [
          { id: 'drink', text: '물을 마신다', repeatable: true, maxAttempts: 3 },
          { id: 'leave', text: '지나친다', repeatable: false },
        ],
      },
      choiceState: {
        drink: { attempts: 1 },
      },
    },
    screenShake: false,
    onSelectChoice: () => {},
    onClose: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('시도: 1/3')).toBeInTheDocument();
  },
};

export const DisabledChoice: CrossroadStory = {
  args: {
    crossroadModal: {
      template: {
        name: '보물 상자',
        description: '보물 상자가 있습니다.',
        choices: [
          { id: 'open', text: '상자를 연다', repeatable: false },
          { id: 'kick', text: '상자를 발로 찬다', repeatable: false },
        ],
      },
      choiceState: {
        open: { attempts: 1 },
      },
    },
    screenShake: false,
    onSelectChoice: () => {},
    onClose: () => {},
  },
};

export const WithScreenShake: CrossroadStory = {
  args: {
    crossroadModal: {
      template: {
        name: '함정!',
        description: '함정이 발동했습니다!',
        choices: [
          { id: 'dodge', text: '피한다', repeatable: false },
        ],
      },
      choiceState: {},
    },
    screenShake: true,
    onSelectChoice: () => {},
    onClose: () => {},
  },
};
