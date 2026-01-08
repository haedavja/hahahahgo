/**
 * @file CharacterSheet.stories.tsx
 * @description 캐릭터 시트 컴포넌트 스토리
 *
 * 캐릭터 정보, 스탯, 카드 슬롯 등을 보여주는 주요 UI 컴포넌트입니다.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { expect, within, userEvent } from '@storybook/test';
import { useEffect } from 'react';
import { CharacterSheet } from './CharacterSheet';
import { useGameStore } from '../../state/gameStore';

// ==================== Store Decorator ====================
interface StoreState {
  playerHp?: number;
  maxHp?: number;
  playerStrength?: number;
  playerAgility?: number;
  playerInsight?: number;
  energy?: number;
  maxEnergy?: number;
  playerTraits?: string[];
  relics?: string[];
  characterBuild?: {
    mainSpecials?: string[];
    subSpecials?: string[];
  };
}

function StoreInitializer({ state, children }: { state: StoreState; children: React.ReactNode }) {
  useEffect(() => {
    useGameStore.setState({
      playerHp: state.playerHp ?? 100,
      maxHp: state.maxHp ?? 100,
      playerStrength: state.playerStrength ?? 0,
      playerAgility: state.playerAgility ?? 0,
      playerInsight: state.playerInsight ?? 0,
      energy: state.energy ?? 3,
      maxEnergy: state.maxEnergy ?? 3,
      playerTraits: state.playerTraits ?? [],
      relics: state.relics ?? [],
      characterBuild: state.characterBuild ?? {
        mainSpecials: ['strike', 'guard'],
        subSpecials: ['slash'],
      },
      ownedCards: ['strike', 'guard', 'slash', 'thrust'],
      cardGrowth: {},
      cardUpgrades: {},
    });

    return () => {
      useGameStore.setState({
        playerHp: 100,
        maxHp: 100,
        playerStrength: 0,
        playerAgility: 0,
        playerInsight: 0,
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
const meta: Meta<typeof CharacterSheet> = {
  title: 'Character/CharacterSheet',
  component: CharacterSheet,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CharacterSheet>;

// ==================== Stories ====================

/**
 * 기본 캐릭터 시트
 */
export const Default: Story = {
  args: {
    onClose: () => console.log('Character sheet closed'),
  },
  decorators: [
    createStoreDecorator({
      playerHp: 80,
      maxHp: 100,
      playerStrength: 3,
      playerAgility: 2,
      playerInsight: 1,
      energy: 3,
      maxEnergy: 3,
      characterBuild: {
        mainSpecials: ['strike', 'guard'],
        subSpecials: ['slash'],
      },
    }),
  ],
};

/**
 * 만렙 캐릭터 - 높은 스탯
 */
export const HighStats: Story = {
  args: {
    onClose: () => console.log('Character sheet closed'),
  },
  decorators: [
    createStoreDecorator({
      playerHp: 150,
      maxHp: 150,
      playerStrength: 10,
      playerAgility: 8,
      playerInsight: 5,
      energy: 5,
      maxEnergy: 5,
      playerTraits: ['swift', 'strong', 'wise'],
      characterBuild: {
        mainSpecials: ['strike', 'guard', 'mega_strike'],
        subSpecials: ['slash', 'thrust', 'parry'],
      },
    }),
  ],
};

/**
 * 체력 위험 상태
 */
export const LowHealth: Story = {
  args: {
    onClose: () => console.log('Character sheet closed'),
  },
  decorators: [
    createStoreDecorator({
      playerHp: 15,
      maxHp: 100,
      playerStrength: 2,
      playerAgility: 1,
      playerInsight: 0,
    }),
  ],
};

/**
 * 특성 보유 캐릭터
 */
export const WithTraits: Story = {
  args: {
    onClose: () => console.log('Character sheet closed'),
  },
  decorators: [
    createStoreDecorator({
      playerHp: 100,
      maxHp: 100,
      playerStrength: 5,
      playerAgility: 3,
      playerInsight: 2,
      playerTraits: ['berserker', 'guardian', 'tactician'],
    }),
  ],
};

/**
 * 유물 보유 캐릭터
 */
export const WithRelics: Story = {
  args: {
    onClose: () => console.log('Character sheet closed'),
  },
  decorators: [
    createStoreDecorator({
      playerHp: 100,
      maxHp: 120,
      playerStrength: 4,
      playerAgility: 2,
      playerInsight: 1,
      relics: ['iron_heart', 'swift_boots', 'energy_core'],
    }),
  ],
};

/**
 * 신규 캐릭터 - 최소 스탯
 */
export const NewCharacter: Story = {
  args: {
    onClose: () => console.log('Character sheet closed'),
  },
  decorators: [
    createStoreDecorator({
      playerHp: 100,
      maxHp: 100,
      playerStrength: 0,
      playerAgility: 0,
      playerInsight: 0,
      energy: 3,
      maxEnergy: 3,
      playerTraits: [],
      relics: [],
      characterBuild: {
        mainSpecials: ['strike'],
        subSpecials: [],
      },
    }),
  ],
};

/**
 * 모든 카드 표시 모드
 */
export const ShowAllCards: Story = {
  args: {
    onClose: () => console.log('Character sheet closed'),
    showAllCards: true,
  },
  decorators: [
    createStoreDecorator({
      playerHp: 100,
      maxHp: 100,
      playerStrength: 3,
      playerAgility: 2,
      playerInsight: 1,
    }),
  ],
};

/**
 * 에너지 부족 상태
 */
export const LowEnergy: Story = {
  args: {
    onClose: () => console.log('Character sheet closed'),
  },
  decorators: [
    createStoreDecorator({
      playerHp: 80,
      maxHp: 100,
      playerStrength: 2,
      playerAgility: 1,
      playerInsight: 0,
      energy: 1,
      maxEnergy: 4,
    }),
  ],
};

/**
 * 완전히 성장한 캐릭터
 */
export const FullyGrown: Story = {
  args: {
    onClose: () => console.log('Character sheet closed'),
  },
  decorators: [
    createStoreDecorator({
      playerHp: 200,
      maxHp: 200,
      playerStrength: 15,
      playerAgility: 12,
      playerInsight: 8,
      energy: 6,
      maxEnergy: 6,
      playerTraits: ['berserker', 'guardian', 'tactician', 'swift', 'wise'],
      relics: ['iron_heart', 'swift_boots', 'energy_core', 'ether_amplifier'],
      characterBuild: {
        mainSpecials: ['strike', 'guard', 'mega_strike', 'ultimate_slash'],
        subSpecials: ['slash', 'thrust', 'parry', 'dodge', 'counter'],
      },
    }),
  ],
};

/**
 * 닫기 버튼 인터랙션
 */
export const CloseInteraction: Story = {
  args: {
    onClose: () => console.log('Close button clicked!'),
  },
  decorators: [
    createStoreDecorator({
      playerHp: 100,
      maxHp: 100,
    }),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // 닫기 버튼 찾기
    const closeButton = canvas.getByText('닫기');
    await expect(closeButton).toBeInTheDocument();

    // 클릭
    await user.click(closeButton);
  },
};
