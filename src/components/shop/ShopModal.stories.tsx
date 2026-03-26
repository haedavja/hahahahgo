/**
 * @file ShopModal.stories.tsx
 * @description 상점 모달 컴포넌트 스토리
 *
 * 복잡한 컴포넌트이므로 Zustand 상태를 모킹하여 테스트합니다.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { expect, within, userEvent } from '@storybook/test';
import { useEffect } from 'react';
import { ShopModal } from './ShopModal';
import { useGameStore } from '../../state/gameStore';

// ==================== Store Decorator ====================
/**
 * 스토리 실행 전 스토어 상태를 설정하는 데코레이터
 */
interface StoreState {
  gold?: number;
  relics?: string[];
  items?: (string | null)[];
  playerHp?: number;
  maxHp?: number;
}

function StoreInitializer({ state, children }: { state: StoreState; children: React.ReactNode }) {
  useEffect(() => {
    const store = useGameStore.getState();

    // 리소스 설정
    if (state.gold !== undefined) {
      store.setResources?.({ gold: state.gold });
    }

    // 상징 설정
    if (state.relics) {
      state.relics.forEach(r => store.addRelic?.(r));
    }

    // 아이템 초기화
    if (state.items) {
      // 상태 직접 설정 (items 배열)
      useGameStore.setState({ items: state.items });
    }

    // 플레이어 HP 설정
    if (state.playerHp !== undefined) {
      store.setPlayerHp?.(state.playerHp);
    }
    if (state.maxHp !== undefined) {
      useGameStore.setState({ maxHp: state.maxHp });
    }

    return () => {
      // 클린업: 초기 상태로 복원
      useGameStore.setState({
        resources: { gold: 0, loot: 0, intel: 0, material: 0 },
        relics: [],
        items: [null, null, null],
        playerHp: 100,
        maxHp: 100,
      });
    };
  }, [state]);

  return <>{children}</>;
}

function createStoreDecorator(state: StoreState) {
  return (Story: React.ComponentType) => (
    <StoreInitializer state={state}>
      <Story />
    </StoreInitializer>
  );
}

// ==================== Meta ====================
const meta: Meta<typeof ShopModal> = {
  title: 'Shop/ShopModal',
  component: ShopModal,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
  argTypes: {
    merchantType: {
      control: 'select',
      options: ['shop', 'card_merchant', 'item_merchant', 'relic_merchant', 'service_merchant'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof ShopModal>;

// ==================== Stories ====================

/**
 * 기본 상점 - 충분한 골드
 */
export const Default: Story = {
  args: {
    merchantType: 'shop',
    onClose: () => console.log('Shop closed'),
  },
  decorators: [createStoreDecorator({ gold: 500, playerHp: 80, maxHp: 100 })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 상점 모달 확인
    await expect(canvas.getByTestId('shop-modal')).toBeInTheDocument();

    // 골드 표시 확인
    await expect(canvas.getByTestId('shop-gold-display')).toBeInTheDocument();

    // 탭 확인
    await expect(canvas.getByTestId('shop-tab-buy')).toBeInTheDocument();
  },
};

/**
 * 골드 부족 상태
 */
export const LowGold: Story = {
  args: {
    merchantType: 'shop',
    onClose: () => console.log('Shop closed'),
  },
  decorators: [createStoreDecorator({ gold: 10, playerHp: 100, maxHp: 100 })],
};

/**
 * 풍족한 플레이어
 */
export const WealthyPlayer: Story = {
  args: {
    merchantType: 'shop',
    onClose: () => console.log('Shop closed'),
  },
  decorators: [createStoreDecorator({ gold: 2000, playerHp: 100, maxHp: 100 })],
};

/**
 * 카드 상인
 */
export const CardMerchant: Story = {
  args: {
    merchantType: 'card_merchant',
    onClose: () => console.log('Shop closed'),
  },
  decorators: [createStoreDecorator({ gold: 300, playerHp: 100, maxHp: 100 })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 상인 이름 확인
    await expect(canvas.getByTestId('shop-merchant-name')).toBeInTheDocument();
  },
};

/**
 * 아이템 상인
 */
export const ItemMerchant: Story = {
  args: {
    merchantType: 'item_merchant',
    onClose: () => console.log('Shop closed'),
  },
  decorators: [createStoreDecorator({ gold: 200, playerHp: 50, maxHp: 100 })],
};

/**
 * 유물 상인
 */
export const RelicMerchant: Story = {
  args: {
    merchantType: 'relic_merchant',
    onClose: () => console.log('Shop closed'),
  },
  decorators: [createStoreDecorator({ gold: 500, playerHp: 100, maxHp: 100 })],
};

/**
 * 서비스 상인 (치료, 카드 제거 등)
 */
export const ServiceMerchant: Story = {
  args: {
    merchantType: 'service_merchant',
    onClose: () => console.log('Shop closed'),
  },
  decorators: [createStoreDecorator({ gold: 300, playerHp: 30, maxHp: 100 })],
};

/**
 * 부상당한 플레이어 (체력 회복 필요)
 */
export const InjuredPlayer: Story = {
  args: {
    merchantType: 'shop',
    onClose: () => console.log('Shop closed'),
  },
  decorators: [createStoreDecorator({ gold: 200, playerHp: 25, maxHp: 100 })],
};

/**
 * 탭 전환 인터랙션
 */
export const TabInteraction: Story = {
  args: {
    merchantType: 'shop',
    onClose: () => console.log('Shop closed'),
  },
  decorators: [createStoreDecorator({ gold: 500, playerHp: 100, maxHp: 100 })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // 초기 상태: 구매 탭
    const buyTab = canvas.getByTestId('shop-tab-buy');
    await expect(buyTab).toBeInTheDocument();

    // 판매 탭 클릭
    const sellTab = canvas.queryByTestId('shop-tab-sell');
    if (sellTab) {
      await user.click(sellTab);
      // 판매 탭 활성화 확인은 스타일 변화로 확인
    }

    // 서비스 탭 클릭
    const serviceTab = canvas.queryByTestId('shop-tab-service');
    if (serviceTab) {
      await user.click(serviceTab);
    }

    // 다시 구매 탭으로
    await user.click(buyTab);
  },
};

/**
 * 모달 닫기
 */
export const CloseModal: Story = {
  args: {
    merchantType: 'shop',
    onClose: () => console.log('Shop closed - action logged'),
  },
  decorators: [createStoreDecorator({ gold: 100, playerHp: 100, maxHp: 100 })],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // 나가기 버튼 찾기
    const exitBtn = canvas.getByTestId('shop-exit-btn');
    await expect(exitBtn).toBeInTheDocument();

    // 클릭하면 onClose 호출됨 (실제로는 스토리 arg로 전달된 함수)
    await user.click(exitBtn);
  },
};
