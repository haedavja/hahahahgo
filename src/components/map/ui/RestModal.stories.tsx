/**
 * @file RestModal.stories.tsx
 * @description 휴식 모달 컴포넌트 스토리
 *
 * 휴식, 카드 성장, 각성 등의 기능을 제공하는 모달입니다.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { expect, within, userEvent } from '@storybook/test';
import { RestModal } from './RestModal';
import type { CardGrowthState } from '../../../state/slices/types';

// ==================== Mock Data ====================
const mockCardGrowth: Record<string, CardGrowthState> = {
  strike: {
    enhanceLevel: 2,
    traits: ['swift'],
  },
  guard: {
    enhanceLevel: 1,
    traits: [],
  },
};

const mockCardUpgrades: Record<string, string> = {
  strike: 'rare',
  guard: 'common',
};

// 기본 핸들러
const defaultHandlers = {
  closeRest: () => console.log('Rest closed'),
  awakenAtRest: (type: string) => console.log('Awaken:', type),
  healAtRest: (amount: number) => console.log('Heal:', amount),
  upgradeCardRarity: (cardId: string) => console.log('Upgrade:', cardId),
  enhanceCard: (cardId: string) => console.log('Enhance:', cardId),
  specializeCard: (cardId: string, traits: string[]) => console.log('Specialize:', cardId, traits),
  spendGold: (amount: number) => console.log('Spend gold:', amount),
  spendGrace: (amount: number) => console.log('Spend grace:', amount),
  gainMemory: (amount: number) => console.log('Gain memory:', amount),
  applyTempBuff: (buff: { stat: string; value: number; remainingNodes: number }) =>
    console.log('Apply buff:', buff),
};

// ==================== Meta ====================
const meta: Meta<typeof RestModal> = {
  title: 'Map/RestModal',
  component: RestModal,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ background: '#0f172a', minHeight: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RestModal>;

// ==================== Stories ====================

/**
 * 기본 휴식 모달
 */
export const Default: Story = {
  args: {
    memoryValue: 100,
    playerHp: 70,
    maxHp: 100,
    canAwaken: false,
    playerTraits: [],
    ownedCards: ['strike', 'guard', 'slash'],
    cardUpgrades: mockCardUpgrades,
    cardGrowth: mockCardGrowth,
    gold: 200,
    grace: 2,
    ...defaultHandlers,
  },
};

/**
 * 체력 낮음 - 회복 필요
 */
export const LowHealth: Story = {
  args: {
    memoryValue: 50,
    playerHp: 25,
    maxHp: 100,
    canAwaken: false,
    playerTraits: [],
    ownedCards: ['strike', 'guard'],
    cardUpgrades: {},
    cardGrowth: {},
    gold: 100,
    grace: 1,
    ...defaultHandlers,
  },
};

/**
 * 각성 가능 상태
 */
export const CanAwaken: Story = {
  args: {
    memoryValue: 200,
    playerHp: 100,
    maxHp: 100,
    canAwaken: true,
    playerTraits: ['swift', 'strong'],
    ownedCards: ['strike', 'guard', 'slash', 'thrust'],
    cardUpgrades: mockCardUpgrades,
    cardGrowth: mockCardGrowth,
    gold: 500,
    grace: 5,
    ...defaultHandlers,
  },
};

/**
 * 부유한 플레이어
 */
export const Wealthy: Story = {
  args: {
    memoryValue: 300,
    playerHp: 100,
    maxHp: 100,
    canAwaken: true,
    playerTraits: ['berserker', 'guardian'],
    ownedCards: ['strike', 'guard', 'slash', 'thrust', 'mega_strike'],
    cardUpgrades: {
      strike: 'rare',
      guard: 'rare',
      slash: 'special',
    },
    cardGrowth: {
      strike: { enhanceLevel: 3, traits: ['swift', 'powerful'] },
      guard: { enhanceLevel: 2, traits: ['sturdy'] },
    },
    gold: 1000,
    grace: 10,
    ...defaultHandlers,
  },
};

/**
 * 가난한 플레이어
 */
export const Poor: Story = {
  args: {
    memoryValue: 20,
    playerHp: 50,
    maxHp: 100,
    canAwaken: false,
    playerTraits: [],
    ownedCards: ['strike'],
    cardUpgrades: {},
    cardGrowth: {},
    gold: 5,
    grace: 0,
    ...defaultHandlers,
  },
};

/**
 * 만렙 체력
 */
export const FullHealth: Story = {
  args: {
    memoryValue: 150,
    playerHp: 100,
    maxHp: 100,
    canAwaken: false,
    playerTraits: ['swift'],
    ownedCards: ['strike', 'guard'],
    cardUpgrades: mockCardUpgrades,
    cardGrowth: mockCardGrowth,
    gold: 300,
    grace: 3,
    ...defaultHandlers,
  },
};

/**
 * 은총 없음 - 축복 불가
 */
export const NoGrace: Story = {
  args: {
    memoryValue: 100,
    playerHp: 80,
    maxHp: 100,
    canAwaken: false,
    playerTraits: [],
    ownedCards: ['strike', 'guard'],
    cardUpgrades: {},
    cardGrowth: {},
    gold: 200,
    grace: 0,
    ...defaultHandlers,
  },
};

/**
 * 많은 카드 보유
 */
export const ManyCards: Story = {
  args: {
    memoryValue: 200,
    playerHp: 90,
    maxHp: 100,
    canAwaken: true,
    playerTraits: ['swift', 'strong', 'wise'],
    ownedCards: [
      'strike', 'guard', 'slash', 'thrust', 'parry',
      'dodge', 'counter', 'mega_strike', 'shield_bash', 'whirlwind',
    ],
    cardUpgrades: {
      strike: 'rare',
      guard: 'rare',
      slash: 'special',
      thrust: 'common',
    },
    cardGrowth: {
      strike: { enhanceLevel: 5, traits: ['swift', 'powerful', 'lethal'] },
      guard: { enhanceLevel: 3, traits: ['sturdy', 'resilient'] },
      slash: { enhanceLevel: 2, traits: ['quick'] },
    },
    gold: 500,
    grace: 5,
    ...defaultHandlers,
  },
};

/**
 * 특성 많이 보유
 */
export const ManyTraits: Story = {
  args: {
    memoryValue: 250,
    playerHp: 100,
    maxHp: 120,
    canAwaken: true,
    playerTraits: [
      'berserker', 'guardian', 'tactician',
      'swift', 'strong', 'wise', 'lucky',
    ],
    ownedCards: ['strike', 'guard', 'slash'],
    cardUpgrades: mockCardUpgrades,
    cardGrowth: mockCardGrowth,
    gold: 400,
    grace: 4,
    ...defaultHandlers,
  },
};

/**
 * 치료 버튼 인터랙션
 */
export const HealInteraction: Story = {
  args: {
    memoryValue: 100,
    playerHp: 50,
    maxHp: 100,
    canAwaken: false,
    playerTraits: [],
    ownedCards: ['strike', 'guard'],
    cardUpgrades: {},
    cardGrowth: {},
    gold: 100,
    grace: 1,
    ...defaultHandlers,
    healAtRest: (amount) => console.log(`Healed for ${amount} HP!`),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // 회복 버튼 찾기
    const healButton = canvas.getByText(/회복/);
    if (healButton) {
      await expect(healButton).toBeInTheDocument();
    }
  },
};

/**
 * 닫기 인터랙션
 */
export const CloseInteraction: Story = {
  args: {
    memoryValue: 100,
    playerHp: 100,
    maxHp: 100,
    canAwaken: false,
    playerTraits: [],
    ownedCards: ['strike'],
    cardUpgrades: {},
    cardGrowth: {},
    gold: 50,
    grace: 0,
    ...defaultHandlers,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 모달 오버레이 클릭으로 닫기
    const overlay = canvas.getByRole('dialog') || canvasElement.querySelector('.rest-modal-overlay');
    if (overlay) {
      await expect(overlay).toBeInTheDocument();
    }
  },
};
