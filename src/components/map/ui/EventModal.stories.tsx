/**
 * @file EventModal.stories.tsx
 * @description 이벤트 모달 컴포넌트 스토리
 */

import type { Meta, StoryObj } from '@storybook/react';
import { expect, within, userEvent } from '@storybook/test';
import { EventModal } from './EventModal';
import type { ActiveEvent } from '../../../types/game';
import type { Resources } from '../../../types/core';

// ==================== Mock Data ====================
const mockResources: Resources = {
  gold: 100,
  intel: 50,
  loot: 10,
  material: 20,
};

const lowResources: Resources = {
  gold: 5,
  intel: 0,
  loot: 0,
  material: 0,
};

const createMockEvent = (overrides: Partial<ActiveEvent> = {}): ActiveEvent => ({
  id: 'test-event',
  resolved: false,
  definition: {
    id: 'mysterious_stranger',
    title: '수상한 나그네',
    description: '길가에서 수상한 나그네를 만났습니다. 그는 무언가를 제안하려는 듯합니다.',
    choices: [
      {
        id: 'trade',
        label: '거래하기',
        cost: { gold: 20 },
        rewards: { loot: 5 },
      },
      {
        id: 'ignore',
        label: '무시하고 지나가기',
      },
      {
        id: 'fight',
        label: '공격하기',
        statRequirement: { strength: 5 },
        rewards: { gold: 50 },
      },
    ],
  },
  currentStage: undefined,
  outcome: undefined,
  ...overrides,
});

// ==================== Meta ====================
const meta: Meta<typeof EventModal> = {
  title: 'Map/EventModal',
  component: EventModal,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ background: '#0f172a', minHeight: '100vh', padding: '20px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof EventModal>;

// ==================== Stories ====================

/**
 * 기본 이벤트 - 선택지 표시
 */
export const Default: Story = {
  args: {
    activeEvent: createMockEvent(),
    resources: mockResources,
    meetsStatRequirement: () => true,
    chooseEvent: (id) => console.log('Choice selected:', id),
    closeEvent: () => console.log('Event closed'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 이벤트 제목 확인
    await expect(canvas.getByText('수상한 나그네')).toBeInTheDocument();

    // 선택지 확인
    await expect(canvas.getByText('거래하기')).toBeInTheDocument();
    await expect(canvas.getByText('무시하고 지나가기')).toBeInTheDocument();
    await expect(canvas.getByText('공격하기')).toBeInTheDocument();
  },
};

/**
 * 자원 부족 상태 - 일부 선택지 비활성화
 */
export const LowResources: Story = {
  args: {
    activeEvent: createMockEvent(),
    resources: lowResources,
    meetsStatRequirement: () => true,
    chooseEvent: (id) => console.log('Choice selected:', id),
    closeEvent: () => console.log('Event closed'),
  },
};

/**
 * 스탯 요구사항 미충족
 */
export const StatRequirementNotMet: Story = {
  args: {
    activeEvent: createMockEvent(),
    resources: mockResources,
    meetsStatRequirement: (req) => {
      if (!req) return true;
      // 힘 5 미만이라고 가정
      return !req.strength || req.strength <= 3;
    },
    chooseEvent: (id) => console.log('Choice selected:', id),
    closeEvent: () => console.log('Event closed'),
  },
};

/**
 * 이벤트 완료 - 결과 표시
 */
export const ResolvedWithRewards: Story = {
  args: {
    activeEvent: createMockEvent({
      resolved: true,
      outcome: {
        choice: '거래하기',
        success: true,
        resultDescription: '나그네와 성공적으로 거래했습니다. 귀중한 물건을 얻었습니다!',
        cost: { gold: 20 },
        rewards: { loot: 5, intel: 10 },
      },
    }),
    resources: mockResources,
    meetsStatRequirement: () => true,
    chooseEvent: () => {},
    closeEvent: () => console.log('Event closed'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 결과 설명 확인
    await expect(canvas.getByText(/성공적으로 거래했습니다/)).toBeInTheDocument();
  },
};

/**
 * 실패한 선택
 */
export const ResolvedFailure: Story = {
  args: {
    activeEvent: createMockEvent({
      resolved: true,
      outcome: {
        choice: '공격하기',
        success: false,
        resultDescription: '나그네는 생각보다 강했습니다. 상처를 입고 도망쳤습니다.',
        cost: {},
        rewards: {},
      },
    }),
    resources: mockResources,
    meetsStatRequirement: () => true,
    chooseEvent: () => {},
    closeEvent: () => console.log('Event closed'),
  },
};

/**
 * 전투 트리거 이벤트
 */
export const CombatTrigger: Story = {
  args: {
    activeEvent: createMockEvent({
      resolved: true,
      outcome: {
        choice: '공격하기',
        success: true,
        resultDescription: '나그네가 정체를 드러냈습니다! 전투가 시작됩니다!',
        combatTrigger: true,
        combatId: 'bandit',
        combatRewards: { gold: 100 },
      },
    }),
    resources: mockResources,
    meetsStatRequirement: () => true,
    chooseEvent: () => {},
    closeEvent: () => console.log('Event closed'),
    startBattle: (config) => console.log('Battle started:', config),
  },
};

/**
 * 다중 스테이지 이벤트
 */
export const MultiStageEvent: Story = {
  args: {
    activeEvent: createMockEvent({
      currentStage: 'negotiation',
      definition: {
        id: 'merchant_encounter',
        title: '떠돌이 상인',
        description: '기본 설명',
        choices: [],
        stages: {
          negotiation: {
            description: '상인이 특별한 거래를 제안합니다. "좋은 물건이 있소. 관심 있으시오?"',
            choices: [
              { id: 'accept', label: '거래를 수락한다', cost: { gold: 50 }, rewards: { loot: 10 } },
              { id: 'haggle', label: '흥정을 시도한다', statRequirement: { insight: 3 } },
              { id: 'decline', label: '거절한다' },
            ],
          },
        },
      },
    }),
    resources: mockResources,
    meetsStatRequirement: (req) => !req || !req.insight || req.insight <= 5,
    chooseEvent: (id) => console.log('Choice selected:', id),
    closeEvent: () => console.log('Event closed'),
  },
};

/**
 * 보상만 있는 선택지
 */
export const RewardsOnlyChoices: Story = {
  args: {
    activeEvent: createMockEvent({
      definition: {
        id: 'treasure_chest',
        title: '보물 상자',
        description: '숨겨진 보물 상자를 발견했습니다!',
        choices: [
          { id: 'open', label: '상자를 연다', rewards: { gold: 30, loot: 2 } },
          { id: 'careful', label: '조심히 연다', rewards: { gold: 20 }, statRequirement: { agility: 3 } },
        ],
      },
    }),
    resources: mockResources,
    meetsStatRequirement: () => true,
    chooseEvent: (id) => console.log('Choice selected:', id),
    closeEvent: () => console.log('Event closed'),
  },
};

/**
 * 빈 이벤트 (null 처리)
 */
export const NoEvent: Story = {
  args: {
    activeEvent: null,
    resources: mockResources,
    meetsStatRequirement: () => true,
    chooseEvent: () => {},
    closeEvent: () => {},
  },
};

/**
 * 선택지 클릭 인터랙션
 */
export const ChoiceInteraction: Story = {
  args: {
    activeEvent: createMockEvent(),
    resources: mockResources,
    meetsStatRequirement: () => true,
    chooseEvent: (id) => console.log('Selected:', id),
    closeEvent: () => console.log('Closed'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    // 무시하기 버튼 찾기 (비용 없음)
    const ignoreBtn = canvas.getByTestId('event-choice-btn-ignore');
    await expect(ignoreBtn).toBeEnabled();

    // 클릭
    await user.click(ignoreBtn);
  },
};
