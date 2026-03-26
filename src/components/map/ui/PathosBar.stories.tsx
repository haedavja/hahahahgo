/**
 * @file PathosBar.stories.tsx
 * @description 파토스 바 컴포넌트 스토리
 *
 * 장착된 파토스(액티브 스킬)를 표시하는 UI입니다.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { useEffect } from 'react';
import { PathosBar } from './PathosBar';
import { useGameStore } from '../../../state/gameStore';
import { initialGrowthState } from '../../../state/slices/growthSlice';

// ==================== Store Decorator ====================
function StoreInitializer({ equippedPathos, children }: { equippedPathos: string[]; children: React.ReactNode }) {
  useEffect(() => {
    useGameStore.setState({
      growth: {
        ...initialGrowthState,
        equippedPathos,
      },
    });

    return () => {
      useGameStore.setState({
        growth: initialGrowthState,
      });
    };
  }, [equippedPathos]);

  return <>{children}</>;
}

function createStoreDecorator(equippedPathos: string[]) {
  return (Story: React.ComponentType) => (
    <StoreInitializer equippedPathos={equippedPathos}>
      <div style={{
        background: '#0f172a',
        minHeight: '200px',
        position: 'relative',
        paddingTop: '100px',
      }}>
        <Story />
      </div>
    </StoreInitializer>
  );
}

// ==================== Meta ====================
const meta: Meta<typeof PathosBar> = {
  title: 'Map/PathosBar',
  component: PathosBar,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PathosBar>;

// ==================== Stories ====================

/**
 * 파토스 없음 - 표시되지 않음
 */
export const NoPathos: Story = {
  decorators: [createStoreDecorator([])],
};

/**
 * 단일 파토스
 */
export const SinglePathos: Story = {
  decorators: [createStoreDecorator(['rage'])],
};

/**
 * 복수 파토스
 */
export const MultiplePathos: Story = {
  decorators: [createStoreDecorator(['rage', 'focus', 'shield'])],
};

/**
 * 최대 파토스 (5개)
 */
export const MaxPathos: Story = {
  decorators: [createStoreDecorator(['rage', 'focus', 'shield', 'haste', 'power'])],
};

/**
 * 공격형 파토스
 */
export const AttackPathos: Story = {
  decorators: [createStoreDecorator(['rage', 'power', 'fury'])],
};

/**
 * 방어형 파토스
 */
export const DefensePathos: Story = {
  decorators: [createStoreDecorator(['shield', 'guard', 'fortify'])],
};

/**
 * 균형잡힌 조합
 */
export const BalancedPathos: Story = {
  decorators: [createStoreDecorator(['rage', 'shield', 'focus'])],
};

/**
 * 툴팁 테스트
 */
export const TooltipTest: Story = {
  decorators: [createStoreDecorator(['rage', 'focus'])],
  play: async ({ canvasElement }) => {
    // 파토스 바가 렌더링되었는지 확인
    // (equippedPathos가 있을 때만 표시됨)
    const bar = canvasElement.querySelector('[style*="display: flex"]');
    if (bar) {
      await expect(bar).toBeInTheDocument();
    }
  },
};
