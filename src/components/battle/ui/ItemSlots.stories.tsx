/**
 * ItemSlots.stories.tsx
 * 전투 화면용 아이템 슬롯 컴포넌트 스토리
 */

import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ItemSlots } from './ItemSlots';
import { useGameStore } from '../../../state/gameStore';
import { useEffect } from 'react';
import type { Item } from '../../../types';

// Mock 아이템 데이터
const mockItems: (Item | null)[] = [
  {
    id: 'ether-amplifier-small',
    name: '에테르 증폭제 (소)',
    icon: '💎',
    description: '이번 턴 에테르 획득량 1.5배',
    tier: 1,
    usableIn: 'combat',
    effect: { type: 'etherMultiplier', value: 1.5 }
  },
  {
    id: 'healing-potion',
    name: '치유 물약',
    icon: '🧪',
    description: '체력 30% 회복',
    tier: 1,
    usableIn: 'any',
    effect: { type: 'healPercent', value: 30 }
  },
  null,
];

const mockItemsWithBuffs: (Item | null)[] = [
  {
    id: 'attack-boost',
    name: '공격력 강화',
    icon: '⚔️',
    description: '힘 +3',
    tier: 2,
    usableIn: 'any',
    effect: { type: 'statBoost', stat: 'strength', value: 3 }
  },
  null,
  null,
];

const emptyItems: (Item | null)[] = [null, null, null];

// Store 초기화 데코레이터
const StoreInitializer = ({
  items,
  itemBuffs = {},
  children
}: {
  items: (Item | null)[];
  itemBuffs?: Record<string, number>;
  children: React.ReactNode;
}) => {
  useEffect(() => {
    useGameStore.setState({
      items,
      itemBuffs,
    });
  }, [items, itemBuffs]);

  return <>{children}</>;
};

// Mock battleActions
const mockBattleActions = {
  setPlayer: fn(),
  setEnemy: fn(),
  addLog: fn(),
  setDestroyingEnemyCards: fn(),
  setEnemyPlan: fn(),
  setFrozenOrder: fn(),
  setFreezingEnemyCards: fn(),
  setFixedOrder: fn(),
};

// Mock player/enemy
const mockPlayer = {
  hp: 100,
  maxHp: 100,
  block: 0,
  energy: 3,
  maxEnergy: 6,
  strength: 0,
  etherPts: 0,
  etherMultiplier: 1,
  tokens: [],
  enemyFrozen: false,
};

const mockEnemy = {
  hp: 80,
  maxHp: 80,
  etherPts: 0,
};

const mockEnemyPlan = {
  mode: 'attack' as const,
  actions: [],
  manuallyModified: false,
};

const mockBattleRef = { current: { phase: 'select' } };

const meta: Meta<typeof ItemSlots> = {
  title: 'Battle/UI/ItemSlots',
  component: ItemSlots,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story, context) => {
      const items = context.args.items || mockItems;
      const itemBuffs = context.args.itemBuffs || {};
      return (
        <StoreInitializer items={items} itemBuffs={itemBuffs}>
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
  },
};

export default meta;
type Story = StoryObj<typeof meta> & { args?: { items?: (Item | null)[]; itemBuffs?: Record<string, number> } };

/**
 * 기본 상태 - 아이템 3개 슬롯
 */
export const Default: Story = {
  args: {
    phase: 'select',
    battleActions: mockBattleActions,
    player: mockPlayer,
    enemy: mockEnemy,
    enemyPlan: mockEnemyPlan,
    battleRef: mockBattleRef,
    items: mockItems,
  },
};

/**
 * 빈 슬롯 - 아이템 없음
 */
export const Empty: Story = {
  args: {
    phase: 'select',
    battleActions: mockBattleActions,
    player: mockPlayer,
    enemy: mockEnemy,
    enemyPlan: mockEnemyPlan,
    battleRef: mockBattleRef,
    items: emptyItems,
  },
};

/**
 * 선택 단계 - 아이템 사용 가능
 */
export const SelectPhase: Story = {
  args: {
    phase: 'select',
    battleActions: mockBattleActions,
    player: mockPlayer,
    enemy: mockEnemy,
    enemyPlan: mockEnemyPlan,
    battleRef: { current: { phase: 'select' } },
    items: mockItems,
  },
};

/**
 * 대응 단계 - 아이템 사용 가능
 */
export const RespondPhase: Story = {
  args: {
    phase: 'respond',
    battleActions: mockBattleActions,
    player: mockPlayer,
    enemy: mockEnemy,
    enemyPlan: mockEnemyPlan,
    battleRef: { current: { phase: 'respond' } },
    items: mockItems,
  },
};

/**
 * 진행 단계 - 전투용 아이템 사용 불가
 */
export const ResolvePhase: Story = {
  args: {
    phase: 'resolve',
    battleActions: mockBattleActions,
    player: mockPlayer,
    enemy: mockEnemy,
    enemyPlan: mockEnemyPlan,
    battleRef: { current: { phase: 'resolve' } },
    items: mockItems,
  },
  parameters: {
    docs: {
      description: {
        story: '진행 단계에서는 전투용(combat) 아이템은 사용할 수 없고, 범용(any) 아이템만 사용 가능합니다.',
      },
    },
  },
};

/**
 * 아이템 버프 표시 - 스탯 버프가 있는 상태
 */
export const WithBuffs: Story = {
  args: {
    phase: 'select',
    battleActions: mockBattleActions,
    player: mockPlayer,
    enemy: mockEnemy,
    enemyPlan: mockEnemyPlan,
    battleRef: mockBattleRef,
    items: mockItemsWithBuffs,
    itemBuffs: {
      strength: 3,
      agility: 2,
    },
  },
};

/**
 * 전투용 아이템만 - 모두 combat 타입
 */
export const CombatItemsOnly: Story = {
  args: {
    phase: 'select',
    battleActions: mockBattleActions,
    player: mockPlayer,
    enemy: mockEnemy,
    enemyPlan: mockEnemyPlan,
    battleRef: mockBattleRef,
    items: [
      {
        id: 'damage-bomb',
        name: '폭발물',
        icon: '💣',
        description: '적에게 15 피해',
        tier: 2,
        usableIn: 'combat',
        effect: { type: 'damage', value: 15 }
      },
      {
        id: 'ice-bomb',
        name: '빙결 폭탄',
        icon: '❄️',
        description: '적 카드 빙결',
        tier: 2,
        usableIn: 'combat',
        effect: { type: 'cardFreeze', value: 1 }
      },
      null,
    ],
  },
};

/**
 * 범용 아이템만 - 모두 any 타입
 */
export const AnyItemsOnly: Story = {
  args: {
    phase: 'resolve',
    battleActions: mockBattleActions,
    player: mockPlayer,
    enemy: mockEnemy,
    enemyPlan: mockEnemyPlan,
    battleRef: { current: { phase: 'resolve' } },
    items: [
      {
        id: 'heal-potion',
        name: '치유 물약',
        icon: '🧪',
        description: '체력 30% 회복',
        tier: 1,
        usableIn: 'any',
        effect: { type: 'healPercent', value: 30 }
      },
      {
        id: 'str-boost',
        name: '힘의 물약',
        icon: '💪',
        description: '힘 +2',
        tier: 1,
        usableIn: 'any',
        effect: { type: 'statBoost', stat: 'strength', value: 2 }
      },
      {
        id: 'agi-boost',
        name: '민첩의 물약',
        icon: '🏃',
        description: '민첩 +2',
        tier: 1,
        usableIn: 'any',
        effect: { type: 'statBoost', stat: 'agility', value: 2 }
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: '범용(any) 아이템은 진행 단계에서도 사용 가능합니다.',
      },
    },
  },
};

/**
 * 다양한 버프 조합 - 여러 스탯 버프
 */
export const MultipleBuffs: Story = {
  args: {
    phase: 'select',
    battleActions: mockBattleActions,
    player: mockPlayer,
    enemy: mockEnemy,
    enemyPlan: mockEnemyPlan,
    battleRef: mockBattleRef,
    items: emptyItems,
    itemBuffs: {
      strength: 5,
      agility: 3,
      insight: 2,
    },
  },
};
