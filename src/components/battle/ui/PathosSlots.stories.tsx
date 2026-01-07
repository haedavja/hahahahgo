/**
 * PathosSlots.stories.tsx
 * 전투 화면용 파토스 (액티브 스킬) 슬롯 컴포넌트 스토리
 */

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { PathosSlots } from './PathosSlots';
import { useGameStore } from '../../../state/gameStore';
import { useEffect } from 'react';
import type { Combatant } from '../../../types';
import type { PathosCooldowns } from '../../../lib/pathosEffects';

// Mock 파토스 데이터 - growthSlice에 설정할 장착 파토스
const mockEquippedPathos = ['pathos_strike', 'pathos_guard', 'pathos_dash'];

// Store 초기화 데코레이터
const StoreInitializer = ({
  equippedPathos,
  children
}: {
  equippedPathos: string[];
  children: React.ReactNode;
}) => {
  useEffect(() => {
    // growthSlice의 equippedPathos 설정
    const state = useGameStore.getState();
    if ('setEquippedPathos' in state && typeof state.setEquippedPathos === 'function') {
      (state.setEquippedPathos as (pathos: string[]) => void)(equippedPathos);
    }
  }, [equippedPathos]);

  return <>{children}</>;
};

// Mock player/enemy
const mockPlayer: Combatant = {
  hp: 100,
  maxHp: 100,
  block: 0,
  energy: 3,
  maxEnergy: 6,
  strength: 0,
  agility: 0,
  insight: 0,
  etherPts: 0,
  tokens: [],
  hand: [],
  deck: [],
  discard: [],
};

const mockEnemy: Combatant = {
  hp: 80,
  maxHp: 80,
  block: 0,
  energy: 2,
  maxEnergy: 4,
  strength: 0,
  agility: 0,
  insight: 0,
  etherPts: 0,
  tokens: [],
  hand: [],
  deck: [],
  discard: [],
};

const mockBattleRef = { current: { phase: 'select' } };

const meta: Meta<typeof PathosSlots> = {
  title: 'Battle/UI/PathosSlots',
  component: PathosSlots,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story, context) => {
      const equippedPathos = context.args.equippedPathos || mockEquippedPathos;
      return (
        <StoreInitializer equippedPathos={equippedPathos}>
          <div style={{
            position: 'relative',
            width: '100vw',
            height: '200px',
            background: '#0f172a',
          }}>
            <Story />
          </div>
        </StoreInitializer>
      );
    },
  ],
  argTypes: {
    phase: {
      control: 'select',
      options: ['select', 'respond', 'resolve'],
      description: '현재 전투 단계',
    },
    cooldowns: {
      description: '파토스별 쿨다운 상태',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta> & { args?: { equippedPathos?: string[] } };

/**
 * 기본 상태 - 선택 단계에서 모든 파토스 사용 가능
 */
export const Default: Story = {
  args: {
    phase: 'select',
    player: mockPlayer,
    enemy: mockEnemy,
    cooldowns: {},
    onPathosUsed: fn(),
    battleRef: mockBattleRef,
    equippedPathos: mockEquippedPathos,
  },
};

/**
 * 파토스 없음 - 장착된 파토스가 없는 경우
 */
export const NoPathos: Story = {
  args: {
    phase: 'select',
    player: mockPlayer,
    enemy: mockEnemy,
    cooldowns: {},
    onPathosUsed: fn(),
    battleRef: mockBattleRef,
    equippedPathos: [],
  },
};

/**
 * 선택 단계 - 파토스 사용 가능
 */
export const SelectPhase: Story = {
  args: {
    phase: 'select',
    player: mockPlayer,
    enemy: mockEnemy,
    cooldowns: {},
    onPathosUsed: fn(),
    battleRef: { current: { phase: 'select' } },
    equippedPathos: mockEquippedPathos,
  },
};

/**
 * 대응 단계 - 파토스 사용 가능
 */
export const RespondPhase: Story = {
  args: {
    phase: 'respond',
    player: mockPlayer,
    enemy: mockEnemy,
    cooldowns: {},
    onPathosUsed: fn(),
    battleRef: { current: { phase: 'respond' } },
    equippedPathos: mockEquippedPathos,
  },
};

/**
 * 진행 단계 - 파토스 사용 불가
 */
export const ResolvePhase: Story = {
  args: {
    phase: 'resolve',
    player: mockPlayer,
    enemy: mockEnemy,
    cooldowns: {},
    onPathosUsed: fn(),
    battleRef: { current: { phase: 'resolve' } },
    equippedPathos: mockEquippedPathos,
  },
  parameters: {
    docs: {
      description: {
        story: '진행 단계에서는 파토스를 사용할 수 없습니다.',
      },
    },
  },
};

/**
 * 쿨다운 상태 - 일부 파토스가 쿨다운 중
 */
export const WithCooldowns: Story = {
  args: {
    phase: 'select',
    player: mockPlayer,
    enemy: mockEnemy,
    cooldowns: {
      'pathos_strike': 2,
      'pathos_guard': 1,
    } as PathosCooldowns,
    onPathosUsed: fn(),
    battleRef: mockBattleRef,
    equippedPathos: mockEquippedPathos,
  },
  parameters: {
    docs: {
      description: {
        story: '쿨다운 중인 파토스는 사용할 수 없으며, 남은 턴 수가 표시됩니다.',
      },
    },
  },
};

/**
 * 전체 쿨다운 - 모든 파토스가 쿨다운 중
 */
export const AllOnCooldown: Story = {
  args: {
    phase: 'select',
    player: mockPlayer,
    enemy: mockEnemy,
    cooldowns: {
      'pathos_strike': 3,
      'pathos_guard': 2,
      'pathos_dash': 1,
    } as PathosCooldowns,
    onPathosUsed: fn(),
    battleRef: mockBattleRef,
    equippedPathos: mockEquippedPathos,
  },
};

/**
 * 단일 파토스 - 하나만 장착된 경우
 */
export const SinglePathos: Story = {
  args: {
    phase: 'select',
    player: mockPlayer,
    enemy: mockEnemy,
    cooldowns: {},
    onPathosUsed: fn(),
    battleRef: mockBattleRef,
    equippedPathos: ['pathos_strike'],
  },
};

/**
 * 최대 장착 - 5개 파토스 장착
 */
export const MaxPathos: Story = {
  args: {
    phase: 'select',
    player: mockPlayer,
    enemy: mockEnemy,
    cooldowns: {},
    onPathosUsed: fn(),
    battleRef: mockBattleRef,
    equippedPathos: [
      'pathos_strike',
      'pathos_guard',
      'pathos_dash',
      'pathos_focus',
      'pathos_rage',
    ],
  },
  parameters: {
    docs: {
      description: {
        story: '최대 5개의 파토스를 장착할 수 있습니다.',
      },
    },
  },
};

/**
 * 혼합 상태 - 일부 사용 가능, 일부 쿨다운
 */
export const MixedState: Story = {
  args: {
    phase: 'select',
    player: mockPlayer,
    enemy: mockEnemy,
    cooldowns: {
      'pathos_guard': 1,
      'pathos_focus': 2,
    } as PathosCooldowns,
    onPathosUsed: fn(),
    battleRef: mockBattleRef,
    equippedPathos: [
      'pathos_strike',
      'pathos_guard',
      'pathos_dash',
      'pathos_focus',
    ],
  },
};

/**
 * 저체력 플레이어 - 위급한 상황
 */
export const LowHpPlayer: Story = {
  args: {
    phase: 'select',
    player: { ...mockPlayer, hp: 20 },
    enemy: mockEnemy,
    cooldowns: {},
    onPathosUsed: fn(),
    battleRef: mockBattleRef,
    equippedPathos: mockEquippedPathos,
  },
  parameters: {
    docs: {
      description: {
        story: '플레이어 체력이 낮을 때 파토스 사용 상황',
      },
    },
  },
};
