/**
 * @file ShopTabs.stories.tsx
 * @description 상점 탭 컴포넌트 스토리
 */

import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import {
  RelicsSection,
  ItemsSection,
  CardsSection,
  BuyTab,
  SellTab,
  ServiceTab,
} from './ShopTabs';
import type { ShopInventory, SellableItem } from './ShopTabs';

// ==================== Mock Data ====================
const mockInventory: ShopInventory = {
  relics: [
    { id: 'iron_heart', price: 150 },
    { id: 'swift_boots', price: 100 },
  ],
  items: [
    { id: 'potion_health', price: 50 },
    { id: 'potion_energy', price: 40 },
  ],
  cards: [
    { id: 'strike', price: 30, rarity: 'common' },
    { id: 'slash', price: 75, rarity: 'rare' },
    { id: 'mega_strike', price: 150, rarity: 'special' },
  ],
};

const emptyInventory: ShopInventory = {
  relics: [],
  items: [],
  cards: [],
};

// ==================== RelicsSection ====================
const relicsMeta: Meta<typeof RelicsSection> = {
  title: 'Shop/RelicsSection',
  component: RelicsSection,
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px' }}>
        <Story />
      </div>
    ),
  ],
};

export default relicsMeta;
type RelicsStory = StoryObj<typeof RelicsSection>;

export const DefaultRelics: RelicsStory = {
  args: {
    inventory: mockInventory,
    purchasedRelics: new Set(),
    relics: [],
    gold: 200,
    onBuyRelic: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('✨ 상징')).toBeInTheDocument();
  },
};

export const WithPurchasedRelic: RelicsStory = {
  args: {
    inventory: mockInventory,
    purchasedRelics: new Set(['iron_heart']),
    relics: [],
    gold: 200,
    onBuyRelic: () => {},
  },
};

export const LowGold: RelicsStory = {
  args: {
    inventory: mockInventory,
    purchasedRelics: new Set(),
    relics: [],
    gold: 50,
    onBuyRelic: () => {},
  },
};

export const EmptyRelics: RelicsStory = {
  args: {
    inventory: emptyInventory,
    purchasedRelics: new Set(),
    relics: [],
    gold: 100,
    onBuyRelic: () => {},
  },
};

// ==================== ItemsSection ====================
export const ItemsMeta: Meta<typeof ItemsSection> = {
  title: 'Shop/ItemsSection',
  component: ItemsSection,
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px' }}>
        <Story />
      </div>
    ),
  ],
};

type ItemsStory = StoryObj<typeof ItemsSection>;

export const DefaultItems: ItemsStory = {
  args: {
    inventory: mockInventory,
    purchasedItems: new Set(),
    items: [null, null, null], // 빈 슬롯 3개
    gold: 100,
    onBuyItem: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('📦 아이템')).toBeInTheDocument();
  },
};

export const NoEmptySlots: ItemsStory = {
  args: {
    inventory: mockInventory,
    purchasedItems: new Set(),
    items: ['potion_health', 'potion_energy', 'key'], // 슬롯 가득
    gold: 100,
    onBuyItem: () => {},
  },
};

export const SoldOutItems: ItemsStory = {
  args: {
    inventory: mockInventory,
    purchasedItems: new Set(['potion_health', 'potion_energy']),
    items: [null],
    gold: 100,
    onBuyItem: () => {},
  },
};

// ==================== CardsSection ====================
export const CardsMeta: Meta<typeof CardsSection> = {
  title: 'Shop/CardsSection',
  component: CardsSection,
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px' }}>
        <Story />
      </div>
    ),
  ],
};

type CardsStory = StoryObj<typeof CardsSection>;

export const DefaultCards: CardsStory = {
  args: {
    inventory: mockInventory,
    purchasedCards: new Set(),
    gold: 200,
    onBuyCard: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('🃏 카드')).toBeInTheDocument();
  },
};

export const LowGoldCards: CardsStory = {
  args: {
    inventory: mockInventory,
    purchasedCards: new Set(),
    gold: 20,
    onBuyCard: () => {},
  },
};

// ==================== BuyTab ====================
export const BuyTabMeta: Meta<typeof BuyTab> = {
  title: 'Shop/BuyTab',
  component: BuyTab,
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', maxWidth: '800px' }}>
        <Story />
      </div>
    ),
  ],
};

type BuyTabStory = StoryObj<typeof BuyTab>;

export const FullShop: BuyTabStory = {
  args: {
    inventory: mockInventory,
    purchasedRelics: new Set(),
    purchasedItems: new Set(),
    purchasedCards: new Set(),
    relics: [],
    items: [null, null, null],
    gold: 500,
    onBuyRelic: () => {},
    onBuyItem: () => {},
    onBuyCard: () => {},
  },
};

export const EmptyShop: BuyTabStory = {
  args: {
    inventory: emptyInventory,
    purchasedRelics: new Set(),
    purchasedItems: new Set(),
    purchasedCards: new Set(),
    relics: [],
    items: [],
    gold: 100,
    onBuyRelic: () => {},
    onBuyItem: () => {},
    onBuyCard: () => {},
  },
};

// ==================== SellTab ====================
export const SellTabMeta: Meta<typeof SellTab> = {
  title: 'Shop/SellTab',
  component: SellTab,
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px' }}>
        <Story />
      </div>
    ),
  ],
};

type SellTabStory = StoryObj<typeof SellTab>;

const mockSellableItems: SellableItem[] = [
  {
    item: { id: 'potion_health', name: '체력 물약', icon: '🧪', uses: 1, maxUses: 1 },
    slotIndex: 0,
  },
  {
    item: { id: 'key', name: '열쇠', icon: '🔑', uses: 3, maxUses: 3 },
    slotIndex: 1,
  },
];

export const WithSellableItems: SellTabStory = {
  args: {
    sellableItems: mockSellableItems,
    merchantType: 'general',
    onSellItem: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('💰 판매')).toBeInTheDocument();
  },
};

export const NoSellableItems: SellTabStory = {
  args: {
    sellableItems: [],
    merchantType: 'general',
    onSellItem: () => {},
  },
};

// ==================== ServiceTab ====================
export const ServiceTabMeta: Meta<typeof ServiceTab> = {
  title: 'Shop/ServiceTab',
  component: ServiceTab,
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px' }}>
        <Story />
      </div>
    ),
  ],
};

type ServiceTabStory = StoryObj<typeof ServiceTab>;

export const RichPlayer: ServiceTabStory = {
  args: {
    gold: 500,
    merchantType: 'general',
    onUseService: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('🛠️ 서비스')).toBeInTheDocument();
  },
};

export const PoorPlayer: ServiceTabStory = {
  args: {
    gold: 10,
    merchantType: 'general',
    onUseService: () => {},
  },
};

export const CardMerchant: ServiceTabStory = {
  args: {
    gold: 300,
    merchantType: 'card_merchant',
    onUseService: () => {},
  },
};
