/**
 * @file GrowthPyramidModal.stories.tsx
 * @description 성장 피라미드 모달 컴포넌트 스토리
 *
 * 에토스/파토스 성장 시스템의 메인 UI입니다.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { useEffect } from 'react';
import { GrowthPyramidModal } from './GrowthPyramidModal';
import { useGameStore } from '../../state/gameStore';
import { initialGrowthState } from '../../state/slices/growthSlice';

// ==================== Store Decorator ====================
interface GrowthState {
  pyramidLevel?: number;
  skillPoints?: number;
  unlockedNodes?: string[];
  nodeChoices?: Record<string, number>;
  equippedPathos?: string[];
  selectedIdentity?: string | null;
}

interface StoreState {
  playerTraits?: string[];
  growth?: GrowthState;
}

function StoreInitializer({ state, children }: { state: StoreState; children: React.ReactNode }) {
  useEffect(() => {
    useGameStore.setState({
      playerTraits: state.playerTraits ?? [],
      growth: {
        ...initialGrowthState,
        pyramidLevel: state.growth?.pyramidLevel ?? 1,
        skillPoints: state.growth?.skillPoints ?? 0,
        unlockedNodes: state.growth?.unlockedNodes ?? [],
        nodeChoices: state.growth?.nodeChoices ?? {},
        equippedPathos: state.growth?.equippedPathos ?? [],
        selectedIdentity: state.growth?.selectedIdentity ?? null,
        pendingNodeSelection: null,
        unlockedLogos: [],
      },
    });

    return () => {
      useGameStore.setState({
        playerTraits: [],
        growth: initialGrowthState,
      });
    };
  }, [state]);

  return <>{children}</>;
}

function createStoreDecorator(state: StoreState) {
  return (Story: React.ComponentType) => (
    <StoreInitializer state={state}>
      <div style={{ background: '#0f172a', minHeight: '100vh' }}>
        <Story />
      </div>
    </StoreInitializer>
  );
}

// ==================== Meta ====================
const meta: Meta<typeof GrowthPyramidModal> = {
  title: 'Growth/GrowthPyramidModal',
  component: GrowthPyramidModal,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof GrowthPyramidModal>;

// ==================== Stories ====================

/**
 * 기본 상태 - 피라미드 레벨 1
 */
export const Default: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
  },
  decorators: [
    createStoreDecorator({
      playerTraits: [],
      growth: { pyramidLevel: 1, skillPoints: 0 },
    }),
  ],
};

/**
 * 스킬 포인트 보유
 */
export const WithSkillPoints: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
  },
  decorators: [
    createStoreDecorator({
      playerTraits: ['berserker', 'swift'],
      growth: { pyramidLevel: 1, skillPoints: 5 },
    }),
  ],
};

/**
 * 중간 진행 상태
 */
export const MidProgress: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
  },
  decorators: [
    createStoreDecorator({
      playerTraits: ['berserker', 'guardian', 'swift', 'strong'],
      growth: {
        pyramidLevel: 3,
        skillPoints: 2,
        unlockedNodes: ['ethos_1_1', 'ethos_1_2', 'pathos_2_1'],
        nodeChoices: { 'ethos_1_1': 0, 'pathos_2_1': 1 },
      },
    }),
  ],
};

/**
 * 후반 진행 상태
 */
export const LateProgress: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
  },
  decorators: [
    createStoreDecorator({
      playerTraits: ['berserker', 'guardian', 'tactician', 'swift', 'strong', 'wise'],
      growth: {
        pyramidLevel: 5,
        skillPoints: 3,
        unlockedNodes: [
          'ethos_1_1', 'ethos_1_2', 'ethos_1_3',
          'pathos_2_1', 'pathos_2_2',
          'ethos_3_1', 'ethos_3_2',
          'pathos_4_1',
        ],
        nodeChoices: {},
        equippedPathos: ['rage', 'focus'],
      },
    }),
  ],
};

/**
 * 자아 선택됨 (검사)
 */
export const WithSwordIdentity: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
  },
  decorators: [
    createStoreDecorator({
      playerTraits: ['berserker', 'guardian', 'tactician'],
      growth: {
        pyramidLevel: 6,
        skillPoints: 0,
        selectedIdentity: 'sword',
        unlockedNodes: [
          'ethos_1_1', 'ethos_1_2', 'ethos_1_3', 'ethos_1_4',
          'pathos_2_1', 'pathos_2_2', 'pathos_2_3',
          'ethos_3_1', 'ethos_3_2',
          'pathos_4_1', 'pathos_4_2',
          'ethos_5_1',
        ],
      },
    }),
  ],
};

/**
 * 자아 선택됨 (총잡이)
 */
export const WithGunIdentity: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
  },
  decorators: [
    createStoreDecorator({
      playerTraits: ['swift', 'lucky', 'precise'],
      growth: {
        pyramidLevel: 6,
        skillPoints: 1,
        selectedIdentity: 'gun',
        unlockedNodes: [
          'ethos_1_1', 'ethos_1_2', 'ethos_1_3',
          'pathos_2_1', 'pathos_2_2',
          'ethos_3_1',
          'pathos_4_1',
        ],
      },
    }),
  ],
};

/**
 * 파토스 장착됨
 */
export const WithEquippedPathos: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
  },
  decorators: [
    createStoreDecorator({
      playerTraits: ['berserker', 'swift'],
      growth: {
        pyramidLevel: 4,
        skillPoints: 0,
        equippedPathos: ['rage', 'focus', 'shield'],
        unlockedNodes: ['ethos_1_1', 'pathos_2_1', 'pathos_2_2'],
      },
    }),
  ],
};

/**
 * 신규 캐릭터 - 아무것도 해금 안됨
 */
export const NewCharacter: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
  },
  decorators: [
    createStoreDecorator({
      playerTraits: [],
      growth: {
        pyramidLevel: 1,
        skillPoints: 0,
        unlockedNodes: [],
      },
    }),
  ],
};

/**
 * 많은 특성 보유
 */
export const ManyTraits: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
  },
  decorators: [
    createStoreDecorator({
      playerTraits: [
        'berserker', 'guardian', 'tactician',
        'swift', 'strong', 'wise', 'lucky',
        'precise', 'resilient', 'fierce',
      ],
      growth: {
        pyramidLevel: 3,
        skillPoints: 10,
      },
    }),
  ],
};

/**
 * 닫힘 상태
 */
export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: () => console.log('Modal closed'),
  },
  decorators: [
    createStoreDecorator({
      playerTraits: [],
      growth: { pyramidLevel: 1, skillPoints: 0 },
    }),
  ],
};

/**
 * 헤더 확인
 */
export const HeaderTest: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Modal closed'),
  },
  decorators: [
    createStoreDecorator({
      playerTraits: ['berserker'],
      growth: { pyramidLevel: 2, skillPoints: 3 },
    }),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 제목 확인
    await expect(canvas.getByText(/성장/)).toBeInTheDocument();
  },
};
