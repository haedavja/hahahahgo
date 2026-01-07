/**
 * @file HandArea.stories.tsx
 * @description HandArea 컴포넌트 스토리 (복잡한 전투 UI)
 */

import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { HandArea } from './HandArea';
import type { Card } from '../../../types/core';

// Mock 카드 데이터
const createMockCard = (id: string, name: string, overrides?: Partial<Card>): Card => ({
  id,
  name,
  type: 'attack',
  speedCost: 4,
  actionCost: 1,
  damage: 10,
  description: `${name} 카드`,
  traits: [],
  ...overrides,
});

const mockCards: Card[] = [
  createMockCard('strike', '타격', { damage: 8, speedCost: 3 }),
  createMockCard('slash', '베기', { damage: 12, speedCost: 5 }),
  createMockCard('guard', '방어', { type: 'defense', block: 10, speedCost: 2, damage: 0 }),
  createMockCard('thrust', '찌르기', { damage: 15, speedCost: 6, traits: ['advance'] }),
  createMockCard('riposte', '반격', { damage: 8, counter: 5, speedCost: 4, traits: ['followup'] }),
];

// Mock 플레이어 상태
const mockPlayer = {
  hp: 75,
  maxHp: 100,
  strength: 2,
  block: 5,
  energy: 3,
  maxEnergy: 4,
  tokens: { usage: [], turn: [], permanent: [] },
};

// Mock 적 상태
const mockEnemy = {
  hp: 50,
  maxHp: 80,
  block: 0,
  tokens: { usage: [], turn: [], permanent: [] },
};

// Mock 전투 상태
const mockBattleSelect = {
  phase: 'select' as const,
  queue: [],
  turnNumber: 1,
};

const mockBattleRespond = {
  phase: 'respond' as const,
  queue: [],
  turnNumber: 1,
};

const mockBattleResolve = {
  phase: 'resolve' as const,
  queue: [
    { actor: 'player' as const, card: mockCards[0], sp: 3 },
    { actor: 'enemy' as const, card: createMockCard('enemy_attack', '적 공격'), sp: 4 },
    { actor: 'player' as const, card: mockCards[1], sp: 5 },
  ],
  turnNumber: 1,
};

// Mock 함수들
const noop = () => {};
const noopCard = (_card: Card) => {};
const noopCardElement = (_card: Card, _el: Element | null) => {};
const getSortedHand = () => mockCards;
const handDisabled = () => false;
const formatSpeedText = (speed: number) => `${speed}`;
const renderNameWithBadge = (card: Card, _color: string) => card.name;

const meta: Meta<typeof HandArea> = {
  title: 'Battle/HandArea',
  component: HandArea,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{
        padding: '20px',
        background: 'linear-gradient(to bottom, #0f172a, #1e293b)',
        minHeight: '300px',
      }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    battle: { control: false },
    player: { control: false },
    enemy: { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof HandArea>;

// 선택 단계 스토리
export const SelectPhase: Story = {
  args: {
    battle: mockBattleSelect,
    player: mockPlayer,
    enemy: mockEnemy,
    selected: [],
    getSortedHand,
    toggle: noopCard,
    handDisabled,
    showCardTraitTooltip: noopCardElement,
    hideCardTraitTooltip: noop,
    formatSpeedText,
    renderNameWithBadge,
    deck: mockCards.slice(0, 3),
    discardPile: [],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 카드 이름이 렌더링되는지 확인
    const strikeCard = canvas.getByText('타격');
    await expect(strikeCard).toBeInTheDocument();
  },
};

// 카드 선택된 상태
export const WithSelectedCards: Story = {
  args: {
    battle: mockBattleSelect,
    player: mockPlayer,
    enemy: mockEnemy,
    selected: [mockCards[0], mockCards[2]],
    getSortedHand,
    toggle: noopCard,
    handDisabled,
    showCardTraitTooltip: noopCardElement,
    hideCardTraitTooltip: noop,
    formatSpeedText,
    renderNameWithBadge,
    deck: mockCards.slice(0, 3),
    discardPile: mockCards.slice(3),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('베기')).toBeInTheDocument();
  },
};

// 대응 단계 스토리
export const RespondPhase: Story = {
  args: {
    battle: mockBattleRespond,
    player: mockPlayer,
    enemy: mockEnemy,
    selected: [mockCards[0], mockCards[1]],
    getSortedHand,
    toggle: noopCard,
    handDisabled,
    showCardTraitTooltip: noopCardElement,
    hideCardTraitTooltip: noop,
    formatSpeedText,
    renderNameWithBadge,
    fixedOrder: [
      { actor: 'player' as const, card: mockCards[0], sp: 3 },
      { actor: 'player' as const, card: mockCards[1], sp: 5 },
    ],
    moveUp: noop,
    moveDown: noop,
    deck: [],
    discardPile: mockCards,
  },
};

// 진행 단계 스토리
export const ResolvePhase: Story = {
  args: {
    battle: mockBattleResolve,
    player: mockPlayer,
    enemy: mockEnemy,
    selected: [mockCards[0], mockCards[1]],
    getSortedHand,
    toggle: noopCard,
    handDisabled,
    showCardTraitTooltip: noopCardElement,
    hideCardTraitTooltip: noop,
    formatSpeedText,
    renderNameWithBadge,
    queue: mockBattleResolve.queue,
    usedCardIndices: [0],
    disappearingCards: [],
    hiddenCards: [],
    deck: [],
    discardPile: mockCards,
  },
};

// 간략 모드
export const SimplifiedMode: Story = {
  args: {
    battle: mockBattleSelect,
    player: mockPlayer,
    enemy: mockEnemy,
    selected: [],
    getSortedHand,
    toggle: noopCard,
    handDisabled,
    showCardTraitTooltip: noopCardElement,
    hideCardTraitTooltip: noop,
    formatSpeedText,
    renderNameWithBadge,
    isSimplified: true,
    deck: mockCards,
    discardPile: [],
  },
};

// 빈 손패
export const EmptyHand: Story = {
  args: {
    battle: mockBattleSelect,
    player: mockPlayer,
    enemy: mockEnemy,
    selected: [],
    getSortedHand: () => [],
    toggle: noopCard,
    handDisabled,
    showCardTraitTooltip: noopCardElement,
    hideCardTraitTooltip: noop,
    formatSpeedText,
    renderNameWithBadge,
    deck: [],
    discardPile: mockCards,
  },
};
