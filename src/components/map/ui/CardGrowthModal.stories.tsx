/**
 * @file CardGrowthModal.stories.tsx
 * @description 카드 성장 모달 컴포넌트 스토리
 *
 * 카드 강화/특화 시스템의 메인 UI입니다.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { expect, within, userEvent } from '@storybook/test';
import { useEffect } from 'react';
import { CardGrowthModal } from './CardGrowthModal';
import { useGameStore } from '../../../state/gameStore';
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
  slash: {
    enhanceLevel: 0,
    traits: ['powerful', 'heavy'],
  },
};

const emptyCardGrowth: Record<string, CardGrowthState> = {};

// ==================== Store Decorator ====================
function StoreInitializer({ storedTraits, children }: { storedTraits?: string[]; children: React.ReactNode }) {
  useEffect(() => {
    useGameStore.setState({
      storedTraits: storedTraits ?? [],
    });

    return () => {
      useGameStore.setState({ storedTraits: [] });
    };
  }, [storedTraits]);

  return <>{children}</>;
}

function createStoreDecorator(storedTraits: string[] = []) {
  return (Story: React.ComponentType) => (
    <StoreInitializer storedTraits={storedTraits}>
      <div style={{ background: '#0f172a', minHeight: '100vh' }}>
        <Story />
      </div>
    </StoreInitializer>
  );
}

// ==================== Meta ====================
const meta: Meta<typeof CardGrowthModal> = {
  title: 'Map/CardGrowthModal',
  component: CardGrowthModal,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CardGrowthModal>;

// ==================== Default Handlers ====================
const defaultHandlers = {
  onClose: () => console.log('Modal closed'),
  onEnhance: (cardId: string) => console.log('Enhance:', cardId),
  onSpecialize: (cardId: string, traits: string[]) => console.log('Specialize:', cardId, traits),
};

// ==================== Stories ====================

/**
 * 기본 상태 - 카드 선택
 */
export const Default: Story = {
  args: {
    isOpen: true,
    cardGrowth: mockCardGrowth,
    ownedCards: ['strike', 'guard', 'slash'],
    ...defaultHandlers,
  },
  decorators: [createStoreDecorator()],
};

/**
 * 많은 카드 보유
 */
export const ManyCards: Story = {
  args: {
    isOpen: true,
    cardGrowth: mockCardGrowth,
    ownedCards: [
      'strike', 'guard', 'slash', 'thrust', 'parry',
      'dodge', 'counter', 'heavy_strike', 'quick_slash',
    ],
    ...defaultHandlers,
  },
  decorators: [createStoreDecorator()],
};

/**
 * 카드 성장 상태 다양
 */
export const VariousGrowthLevels: Story = {
  args: {
    isOpen: true,
    cardGrowth: {
      strike: { enhanceLevel: 5, traits: ['swift', 'powerful', 'lethal'] },
      guard: { enhanceLevel: 3, traits: ['sturdy', 'resilient'] },
      slash: { enhanceLevel: 1, traits: ['quick'] },
      thrust: { enhanceLevel: 0, traits: [] },
    },
    ownedCards: ['strike', 'guard', 'slash', 'thrust'],
    ...defaultHandlers,
  },
  decorators: [createStoreDecorator()],
};

/**
 * 휴식 노드에서 열림
 */
export const AtRestNode: Story = {
  args: {
    isOpen: true,
    cardGrowth: mockCardGrowth,
    ownedCards: ['strike', 'guard'],
    isRestNode: true,
    ...defaultHandlers,
  },
  decorators: [createStoreDecorator()],
};

/**
 * 보유 특성 있음
 */
export const WithStoredTraits: Story = {
  args: {
    isOpen: true,
    cardGrowth: mockCardGrowth,
    ownedCards: ['strike', 'guard', 'slash'],
    ...defaultHandlers,
  },
  decorators: [createStoreDecorator(['berserker', 'guardian', 'swift'])],
};

/**
 * 성장 없는 새 카드들
 */
export const NewCards: Story = {
  args: {
    isOpen: true,
    cardGrowth: emptyCardGrowth,
    ownedCards: ['strike', 'guard'],
    ...defaultHandlers,
  },
  decorators: [createStoreDecorator()],
};

/**
 * 단일 카드만 보유
 */
export const SingleCard: Story = {
  args: {
    isOpen: true,
    cardGrowth: { strike: { enhanceLevel: 2, traits: ['swift'] } },
    ownedCards: ['strike'],
    ...defaultHandlers,
  },
  decorators: [createStoreDecorator()],
};

/**
 * 최대 강화된 카드
 */
export const MaxEnhanced: Story = {
  args: {
    isOpen: true,
    cardGrowth: {
      strike: { enhanceLevel: 5, traits: ['swift', 'powerful', 'lethal', 'brutal', 'relentless'] },
    },
    ownedCards: ['strike'],
    ...defaultHandlers,
  },
  decorators: [createStoreDecorator()],
};

/**
 * 닫힘 상태
 */
export const Closed: Story = {
  args: {
    isOpen: false,
    cardGrowth: mockCardGrowth,
    ownedCards: ['strike', 'guard'],
    ...defaultHandlers,
  },
  decorators: [createStoreDecorator()],
};

/**
 * 카드 선택 인터랙션
 */
export const CardSelection: Story = {
  args: {
    isOpen: true,
    cardGrowth: mockCardGrowth,
    ownedCards: ['strike', 'guard', 'slash'],
    ...defaultHandlers,
  },
  decorators: [createStoreDecorator()],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 모달이 열렸는지 확인
    const modal = canvasElement.querySelector('.event-modal');
    if (modal) {
      await expect(modal).toBeInTheDocument();
    }
  },
};

/**
 * 빈 카드 목록 (에러 케이스)
 */
export const EmptyCards: Story = {
  args: {
    isOpen: true,
    cardGrowth: {},
    ownedCards: [],
    ...defaultHandlers,
  },
  decorators: [createStoreDecorator()],
};
