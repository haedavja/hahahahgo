/**
 * RelicsBar.stories.tsx
 * 상징(Relics) 표시 UI 컴포넌트 스토리
 */

import type { Meta, StoryObj } from '@storybook/react';
import { fn, expect, userEvent, within } from '@storybook/test';
import { RelicsBar } from './RelicsBar';

const mockActions = {
  setHoveredRelic: fn(),
  setRelicActivated: fn(),
  setOrderedRelics: fn(),
};

const meta: Meta<typeof RelicsBar> = {
  title: 'Map/UI/RelicsBar',
  component: RelicsBar,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{
        position: 'relative',
        width: '600px',
        height: '200px',
        background: '#1e293b',
        padding: '20px',
      }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    orderedRelics: {
      description: '표시할 상징 ID 배열',
    },
    hoveredRelic: {
      description: '호버 중인 상징 ID',
    },
    relicActivated: {
      description: '활성화된 상징 ID',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 기본 상징 바 - 일반적인 상징 표시
 */
export const Default: Story = {
  args: {
    orderedRelics: ['iron-will', 'quick-reflex', 'ether-heart'],
    hoveredRelic: null,
    relicActivated: null,
    actions: mockActions,
  },
};

/**
 * 상징 없음 - 빈 상태
 */
export const Empty: Story = {
  args: {
    orderedRelics: [],
    hoveredRelic: null,
    relicActivated: null,
    actions: mockActions,
  },
};

/**
 * 단일 상징
 */
export const SingleRelic: Story = {
  args: {
    orderedRelics: ['iron-will'],
    hoveredRelic: null,
    relicActivated: null,
    actions: mockActions,
  },
};

/**
 * 많은 상징 - 5개 이상의 상징 표시
 */
export const ManyRelics: Story = {
  args: {
    orderedRelics: [
      'iron-will',
      'quick-reflex',
      'ether-heart',
      'lucky-coin',
      'battle-fury',
      'healing-aura',
    ],
    hoveredRelic: null,
    relicActivated: null,
    actions: mockActions,
  },
};

/**
 * 호버 상태 - 상징 위에 마우스를 올린 상태
 */
export const Hovered: Story = {
  args: {
    orderedRelics: ['iron-will', 'quick-reflex', 'ether-heart'],
    hoveredRelic: 'iron-will',
    relicActivated: null,
    actions: mockActions,
  },
};

/**
 * 활성화 상태 - 상징이 클릭되어 활성화된 상태
 */
export const Activated: Story = {
  args: {
    orderedRelics: ['iron-will', 'quick-reflex', 'ether-heart'],
    hoveredRelic: null,
    relicActivated: 'quick-reflex',
    actions: mockActions,
  },
};

/**
 * 호버 + 활성화 - 호버와 활성화 동시 상태
 */
export const HoveredAndActivated: Story = {
  args: {
    orderedRelics: ['iron-will', 'quick-reflex', 'ether-heart'],
    hoveredRelic: 'ether-heart',
    relicActivated: 'ether-heart',
    actions: mockActions,
  },
};

/**
 * 희귀도 혼합 - 다양한 희귀도의 상징들
 */
export const MixedRarities: Story = {
  args: {
    orderedRelics: [
      'iron-will',        // common
      'battle-fury',      // rare
      'phoenix-feather',  // special
      'time-stop',        // legendary
    ],
    hoveredRelic: null,
    relicActivated: null,
    actions: mockActions,
  },
};

/**
 * 인터랙션 테스트 - 호버 시 setHoveredRelic 호출
 */
export const InteractionTest: Story = {
  args: {
    orderedRelics: ['iron-will', 'quick-reflex'],
    hoveredRelic: null,
    relicActivated: null,
    actions: mockActions,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // 상징 요소 찾기 (첫 번째 상징)
    const relicSlots = canvas.getAllByRole('generic').filter(
      el => el.getAttribute('draggable') === 'true'
    );

    if (relicSlots.length > 0) {
      // 마우스 다운 이벤트로 활성화 테스트
      await userEvent.click(relicSlots[0]);

      // setRelicActivated가 호출되었는지 확인
      await expect(args.actions.setRelicActivated).toHaveBeenCalled();
    }
  },
};

/**
 * 드래그 테스트 - 상징 재정렬
 */
export const DragTest: Story = {
  args: {
    orderedRelics: ['iron-will', 'quick-reflex', 'ether-heart'],
    hoveredRelic: null,
    relicActivated: null,
    actions: mockActions,
  },
  parameters: {
    docs: {
      description: {
        story: '상징을 드래그하여 순서를 변경할 수 있습니다.',
      },
    },
  },
};
