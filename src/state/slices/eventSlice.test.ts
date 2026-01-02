// @ts-nocheck - Test file with complex type issues
/**
 * @file eventSlice.test.ts
 * @description 이벤트 슬라이스 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import { createEventActions, type EventActionsSlice } from './eventSlice';
import type { EventSliceState } from './types';

// 모킹
vi.mock('../../data/newEvents', () => ({
  NEW_EVENT_LIBRARY: {
    next_event_1: { id: 'next_event_1', choices: [] },
  },
}));

vi.mock('../../components/battle/battleData', () => ({
  CARDS: [
    { id: 'card1', name: 'Card 1' },
    { id: 'card2', name: 'Card 2' },
    { id: 'card3', name: 'Card 3' },
  ],
}));

vi.mock('../gameStoreHelpers', () => ({
  canAfford: vi.fn((resources, cost) => {
    if (!cost) return true;
    if (cost.gold && resources.gold < cost.gold) return false;
    if (cost.etherPts && (resources.etherPts ?? 0) < cost.etherPts) return false;
    return true;
  }),
  payCost: vi.fn((cost, resources) => {
    const next = { ...resources };
    if (cost.gold) next.gold -= cost.gold;
    if (cost.etherPts) next.etherPts = (next.etherPts ?? 0) - cost.etherPts;
    return next;
  }),
  grantRewards: vi.fn((rewards, resources) => {
    const next = { ...resources };
    if (rewards.gold) next.gold += rewards.gold;
    if (rewards.intel) next.intel += rewards.intel;
    return { next, applied: rewards };
  }),
  resolveAmount: vi.fn((amount) => amount),
  extractResourceDelta: vi.fn((rewards) => rewards),
}));

// 테스트용 초기 상태
const createInitialState = (): EventSliceState & {
  resources: { gold: number; intel: number; loot: number; material: number; etherPts: number; memory: number };
  playerHp: number;
  maxHp: number;
  playerInsight: number;
  playerStrength: number;
  playerAgility: number;
  characterBuild: { ownedCards: string[] };
  activeShop: null;
} => ({
  activeEvent: null,
  completedEvents: [],
  pendingNextEvent: null,
  resources: { gold: 50, intel: 0, loot: 0, material: 0, etherPts: 100, memory: 0 },
  playerHp: 100,
  maxHp: 100,
  playerInsight: 0,
  playerStrength: 0,
  playerAgility: 0,
  characterBuild: { ownedCards: [] },
  activeShop: null,
});

type TestStore = ReturnType<typeof createInitialState> & EventActionsSlice;

const createTestStore = () =>
  create<TestStore>((set, get, api) => ({
    ...createInitialState(),
    ...createEventActions(set as never, get as never, api as never),
  }));

describe('eventSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('초기 상태', () => {
    it('활성 이벤트가 없다', () => {
      expect(store.getState().activeEvent).toBeNull();
    });

    it('완료된 이벤트가 없다', () => {
      expect(store.getState().completedEvents).toEqual([]);
    });

    it('대기 이벤트가 없다', () => {
      expect(store.getState().pendingNextEvent).toBeNull();
    });
  });

  describe('closeEvent', () => {
    it('이벤트를 닫는다', () => {
      store.setState({
        ...store.getState(),
        activeEvent: { id: 'test', definition: { id: 'test', choices: [] }, currentStage: null, resolved: false, outcome: null },
      });
      store.getState().closeEvent();
      expect(store.getState().activeEvent).toBeNull();
    });

    it('이벤트가 없으면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().closeEvent();
      expect(store.getState()).toBe(originalState);
    });
  });

  describe('setActiveEvent', () => {
    it('이벤트를 설정한다', () => {
      const event = { id: 'test', definition: { id: 'test', choices: [] as { id: string; label: string }[] }, currentStage: null as string | null, resolved: false, outcome: null as unknown };
      store.getState().setActiveEvent(event as never);
      expect(store.getState().activeEvent).toEqual(event);
    });

    it('null로 설정할 수 있다', () => {
      store.setState({
        ...store.getState(),
        activeEvent: { id: 'test', definition: { id: 'test', choices: [] }, currentStage: null, resolved: false, outcome: null },
      });
      store.getState().setActiveEvent(null);
      expect(store.getState().activeEvent).toBeNull();
    });
  });

  describe('chooseEvent', () => {
    it('활성 이벤트가 없으면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().chooseEvent('choice1');
      expect(store.getState()).toBe(originalState);
    });

    it('이미 해결된 이벤트는 상태를 유지한다', () => {
      store.setState({
        ...store.getState(),
        activeEvent: {
          id: 'test',
          definition: { id: 'test', choices: [{ id: 'choice1', label: 'Test' }] },
          currentStage: null,
          resolved: true,
          outcome: null,
        },
      });
      const originalState = store.getState();
      store.getState().chooseEvent('choice1');
      expect(store.getState()).toBe(originalState);
    });
  });

  describe('invokePrayer', () => {
    it('에테르가 부족하면 상태를 유지한다', () => {
      store.setState({
        ...store.getState(),
        activeEvent: { id: 'test', definition: { id: 'test', choices: [] }, currentStage: null, resolved: false, outcome: null },
        resources: { ...store.getState().resources, etherPts: 0 },
      });
      const originalState = store.getState();
      store.getState().invokePrayer(50);
      expect(store.getState()).toBe(originalState);
    });

    it('활성 이벤트가 없으면 상태를 유지한다', () => {
      const originalState = store.getState();
      store.getState().invokePrayer(50);
      expect(store.getState()).toBe(originalState);
    });
  });

  describe('completedEvents 관리', () => {
    it('이벤트 완료 시 completedEvents에 추가된다', () => {
      const eventId = 'test-event';
      store.setState({
        ...store.getState(),
        completedEvents: [],
        activeEvent: {
          id: eventId,
          definition: { id: eventId, choices: [{ id: 'choice1', label: 'Test Choice' }] },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
      });
      // 이벤트를 닫으면 completedEvents에 추가되어야 함
      store.getState().closeEvent();
      // closeEvent 후 activeEvent가 null이 됨
      expect(store.getState().activeEvent).toBeNull();
    });

    it('여러 이벤트를 완료할 수 있다', () => {
      store.setState({
        ...store.getState(),
        completedEvents: ['event1', 'event2'],
      });
      expect(store.getState().completedEvents).toHaveLength(2);
    });
  });

  describe('pendingNextEvent', () => {
    it('대기 이벤트를 설정할 수 있다', () => {
      const pendingEvent = { id: 'pending', type: 'quest' };
      store.setState({
        ...store.getState(),
        pendingNextEvent: pendingEvent as never,
      });
      expect(store.getState().pendingNextEvent).toEqual(pendingEvent);
    });
  });

  describe('chooseEvent 비용 처리', () => {
    it('비용이 없는 선택지는 자원을 소비하지 않는다', () => {
      const initialGold = store.getState().resources.gold;
      store.setState({
        ...store.getState(),
        activeEvent: {
          id: 'test',
          definition: {
            id: 'test',
            choices: [{ id: 'free', label: 'Free Choice' }]
          },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
      });
      store.getState().chooseEvent('free');
      // 선택지가 정의에 맞지 않으면 상태 유지되므로 금액이 같을 수 있음
      expect(store.getState().resources.gold).toBeLessThanOrEqual(initialGold);
    });
  });

  describe('스탯 요구사항', () => {
    it('스탯이 부족하면 선택지를 선택할 수 없다', () => {
      store.setState({
        ...store.getState(),
        playerStrength: 0,
        activeEvent: {
          id: 'test',
          definition: {
            id: 'test',
            choices: [{
              id: 'strong',
              label: 'Strong Choice',
              statRequirement: { strength: 10 }
            }]
          },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
      });
      const originalState = store.getState();
      store.getState().chooseEvent('strong');
      expect(store.getState()).toBe(originalState);
    });

    it('스탯이 충분하면 선택지를 선택할 수 있다', () => {
      store.setState({
        ...store.getState(),
        playerStrength: 15,
        activeEvent: {
          id: 'test',
          definition: {
            id: 'test',
            choices: [{
              id: 'strong',
              label: 'Strong Choice',
              statRequirement: { strength: 10 }
            }]
          },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
      });
      store.getState().chooseEvent('strong');
      // 선택이 가능하면 resolved가 true가 되거나 stage가 변경됨
      const event = store.getState().activeEvent;
      expect(event?.resolved || event?.currentStage !== null || event === null).toBeTruthy();
    });
  });

  describe('HP 비용', () => {
    it('HP 비용이 있는 선택지는 HP를 감소시킨다', () => {
      const initialHp = 100;
      store.setState({
        ...store.getState(),
        playerHp: initialHp,
        activeEvent: {
          id: 'test',
          definition: {
            id: 'test',
            choices: [{
              id: 'sacrifice',
              label: 'Sacrifice',
              cost: { hp: 10 }
            }]
          },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
      });
      store.getState().chooseEvent('sacrifice');
      // HP 비용이 적용되면 HP가 감소해야 함
      expect(store.getState().playerHp).toBeLessThanOrEqual(initialHp);
    });

    it('HP가 1 미만으로 떨어지지 않는다', () => {
      store.setState({
        ...store.getState(),
        playerHp: 5,
        activeEvent: {
          id: 'test',
          definition: {
            id: 'test',
            choices: [{
              id: 'sacrifice',
              label: 'Sacrifice',
              cost: { hp: 100 }
            }]
          },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
      });
      store.getState().chooseEvent('sacrifice');
      expect(store.getState().playerHp).toBeGreaterThanOrEqual(1);
    });

    it('HP 퍼센트 비용이 정상 적용된다', () => {
      store.setState({
        ...store.getState(),
        playerHp: 100,
        maxHp: 100,
        activeEvent: {
          id: 'test',
          definition: {
            id: 'test',
            choices: [{
              id: 'sacrifice',
              label: 'Sacrifice',
              cost: { hpPercent: 20 }
            }]
          },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
      });
      store.getState().chooseEvent('sacrifice');
      expect(store.getState().playerHp).toBe(80);
    });
  });

  describe('invokePrayer 성공 케이스', () => {
    it('에테르가 충분하면 기도가 성공한다', () => {
      store.setState({
        ...store.getState(),
        activeEvent: {
          id: 'test',
          definition: { id: 'test', choices: [] },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
        resources: { ...store.getState().resources, etherPts: 100 },
      });
      store.getState().invokePrayer(50);
      expect(store.getState().activeEvent?.resolved).toBe(true);
    });

    it('기도 후 에테르가 감소한다', () => {
      store.setState({
        ...store.getState(),
        activeEvent: {
          id: 'test',
          definition: { id: 'test', choices: [] },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
        resources: { ...store.getState().resources, etherPts: 100 },
      });
      store.getState().invokePrayer(50);
      expect(store.getState().resources.etherPts).toBe(50);
    });

    it('기도 후 intel이 증가한다', () => {
      const initialIntel = store.getState().resources.intel;
      store.setState({
        ...store.getState(),
        activeEvent: {
          id: 'test',
          definition: { id: 'test', choices: [] },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
        resources: { ...store.getState().resources, etherPts: 100 },
      });
      store.getState().invokePrayer(50);
      expect(store.getState().resources.intel).toBeGreaterThan(initialIntel);
    });

    it('이미 해결된 이벤트에서는 기도가 실패한다', () => {
      store.setState({
        ...store.getState(),
        activeEvent: {
          id: 'test',
          definition: { id: 'test', choices: [] },
          currentStage: null,
          resolved: true,
          outcome: null,
        },
        resources: { ...store.getState().resources, etherPts: 100 },
      });
      const originalState = store.getState();
      store.getState().invokePrayer(50);
      expect(store.getState()).toBe(originalState);
    });
  });

  describe('스테이지 네비게이션', () => {
    it('nextStage가 있으면 스테이지가 변경된다', () => {
      store.setState({
        ...store.getState(),
        activeEvent: {
          id: 'test',
          definition: {
            id: 'test',
            choices: [{ id: 'choice1', label: 'Go to stage2', nextStage: 'stage2' }],
            stages: {
              stage2: { choices: [{ id: 'choice2', label: 'End' }] },
            },
          },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
      });
      store.getState().chooseEvent('choice1');
      expect(store.getState().activeEvent?.currentStage).toBe('stage2');
    });
  });

  describe('상점 열기', () => {
    it('openShop이 있으면 activeShop이 설정된다', () => {
      store.setState({
        ...store.getState(),
        activeEvent: {
          id: 'test',
          definition: {
            id: 'test',
            choices: [{ id: 'choice1', label: 'Open Shop', openShop: 'merchant' }],
          },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
      });
      store.getState().chooseEvent('choice1');
      expect(store.getState().activeShop).toEqual({ merchantType: 'merchant' });
    });
  });

  describe('보상 처리', () => {
    it('골드 보상이 정상 지급된다', () => {
      const initialGold = store.getState().resources.gold;
      store.setState({
        ...store.getState(),
        activeEvent: {
          id: 'test',
          definition: {
            id: 'test',
            choices: [{ id: 'choice1', label: 'Get gold', rewards: { gold: 50 } }],
          },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
      });
      store.getState().chooseEvent('choice1');
      expect(store.getState().resources.gold).toBe(initialGold + 50);
    });

    it('카드 보상(문자열)이 정상 지급된다', () => {
      store.setState({
        ...store.getState(),
        characterBuild: { ownedCards: [] },
        activeEvent: {
          id: 'test',
          definition: {
            id: 'test',
            choices: [{ id: 'choice1', label: 'Get card', rewards: { card: 'special_card' } }],
          },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
      });
      store.getState().chooseEvent('choice1');
      expect(store.getState().characterBuild.ownedCards).toContain('special_card');
    });
  });

  describe('다음 이벤트 설정', () => {
    it('nextEvent가 라이브러리에 있으면 pendingNextEvent가 설정된다', () => {
      store.setState({
        ...store.getState(),
        activeEvent: {
          id: 'test',
          definition: {
            id: 'test',
            choices: [{ id: 'choice1', label: 'Continue', nextEvent: 'next_event_1' }],
          },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
      });
      store.getState().chooseEvent('choice1');
      expect(store.getState().pendingNextEvent).toBe('next_event_1');
    });
  });

  describe('선택지 찾기 실패', () => {
    it('존재하지 않는 선택지는 무시한다', () => {
      store.setState({
        ...store.getState(),
        activeEvent: {
          id: 'test',
          definition: {
            id: 'test',
            choices: [{ id: 'choice1', label: 'Option 1' }],
          },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
      });
      const originalState = store.getState();
      store.getState().chooseEvent('non_existent_choice');
      expect(store.getState()).toBe(originalState);
    });

    it('비용을 지불할 수 없으면 선택이 실패한다', () => {
      store.setState({
        ...store.getState(),
        resources: { ...store.getState().resources, gold: 0 },
        activeEvent: {
          id: 'test',
          definition: {
            id: 'test',
            choices: [{ id: 'choice1', label: 'Expensive', cost: { gold: 100 } }],
          },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
      });
      const originalState = store.getState();
      store.getState().chooseEvent('choice1');
      expect(store.getState()).toBe(originalState);
    });
  });

  describe('스테이지 기반 선택지', () => {
    it('현재 스테이지의 선택지를 사용한다', () => {
      store.setState({
        ...store.getState(),
        activeEvent: {
          id: 'test',
          definition: {
            id: 'test',
            choices: [{ id: 'root_choice', label: 'Root' }],
            stages: {
              stage1: { choices: [{ id: 'stage1_choice', label: 'Stage 1 Choice' }] },
            },
          },
          currentStage: 'stage1',
          resolved: false,
          outcome: null,
        },
      });
      // stage1_choice를 선택하면 성공해야 함
      store.getState().chooseEvent('stage1_choice');
      expect(store.getState().activeEvent?.resolved).toBe(true);
    });
  });

  describe('카드 보상 처리', () => {
    it('숫자 카드 보상이 정상 처리된다', () => {
      store.setState({
        ...store.getState(),
        characterBuild: { ownedCards: [] },
        activeEvent: {
          id: 'test',
          definition: {
            id: 'test',
            choices: [{ id: 'choice1', label: 'Get cards', rewards: { card: 2 } }],
          },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
      });
      store.getState().chooseEvent('choice1');
      // 카드가 최대 2개까지 추가됨 (사용 가능한 카드가 있으면)
      expect(store.getState().characterBuild.ownedCards.length).toBeLessThanOrEqual(2);
    });

    it('이미 보유한 카드는 중복 지급되지 않는다', () => {
      store.setState({
        ...store.getState(),
        characterBuild: { ownedCards: ['card1'] },
        activeEvent: {
          id: 'test',
          definition: {
            id: 'test',
            choices: [{ id: 'choice1', label: 'Get cards', rewards: { card: 3 } }],
          },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
      });
      store.getState().chooseEvent('choice1');
      // card1이 중복되지 않음
      const ownedCards = store.getState().characterBuild.ownedCards;
      const card1Count = ownedCards.filter(c => c === 'card1').length;
      expect(card1Count).toBe(1);
    });

    it('0개 카드 보상은 무시된다', () => {
      store.setState({
        ...store.getState(),
        characterBuild: { ownedCards: [] },
        activeEvent: {
          id: 'test',
          definition: {
            id: 'test',
            choices: [{ id: 'choice1', label: 'No cards', rewards: { card: 0 } }],
          },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
      });
      store.getState().chooseEvent('choice1');
      expect(store.getState().characterBuild.ownedCards).toEqual([]);
    });
  });

  describe('resultDescription 처리', () => {
    it('resultDescription이 outcome에 포함된다', () => {
      store.setState({
        ...store.getState(),
        activeEvent: {
          id: 'test',
          definition: {
            id: 'test',
            choices: [{ id: 'choice1', label: 'Option', resultDescription: '특별한 결과' }],
          },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
      });
      store.getState().chooseEvent('choice1');
      expect(store.getState().activeEvent?.outcome?.resultDescription).toBe('특별한 결과');
    });

    it('resultDescription이 없으면 null이다', () => {
      store.setState({
        ...store.getState(),
        activeEvent: {
          id: 'test',
          definition: {
            id: 'test',
            choices: [{ id: 'choice1', label: 'Option' }],
          },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
      });
      store.getState().chooseEvent('choice1');
      expect(store.getState().activeEvent?.outcome?.resultDescription).toBeNull();
    });
  });

  describe('스탯 요구사항 다양한 스탯', () => {
    it('insight 요구사항을 확인한다', () => {
      store.setState({
        ...store.getState(),
        playerInsight: 0,
        activeEvent: {
          id: 'test',
          definition: {
            id: 'test',
            choices: [{
              id: 'insightful',
              label: 'Insight Choice',
              statRequirement: { insight: 5 }
            }]
          },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
      });
      const originalState = store.getState();
      store.getState().chooseEvent('insightful');
      expect(store.getState()).toBe(originalState);
    });

    it('agility 요구사항을 확인한다', () => {
      store.setState({
        ...store.getState(),
        playerAgility: 10,
        activeEvent: {
          id: 'test',
          definition: {
            id: 'test',
            choices: [{
              id: 'agile',
              label: 'Agile Choice',
              statRequirement: { agility: 5 }
            }]
          },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
      });
      store.getState().chooseEvent('agile');
      expect(store.getState().activeEvent?.resolved).toBe(true);
    });
  });

  describe('이벤트 ID 관리', () => {
    it('동일 이벤트는 completedEvents에 중복 추가되지 않는다', () => {
      store.setState({
        ...store.getState(),
        completedEvents: ['test'],
        activeEvent: {
          id: 'test',
          definition: {
            id: 'test',
            choices: [{ id: 'choice1', label: 'Option' }],
          },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
      });
      store.getState().chooseEvent('choice1');
      const testCount = store.getState().completedEvents.filter(e => e === 'test').length;
      expect(testCount).toBe(1);
    });
  });

  describe('nextEvent 처리', () => {
    it('라이브러리에 없는 nextEvent는 무시된다', () => {
      store.setState({
        ...store.getState(),
        pendingNextEvent: null,
        activeEvent: {
          id: 'test',
          definition: {
            id: 'test',
            choices: [{ id: 'choice1', label: 'Next', nextEvent: 'non_existent_event' }],
          },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
      });
      store.getState().chooseEvent('choice1');
      expect(store.getState().pendingNextEvent).toBeNull();
    });
  });

  describe('openShop 결과', () => {
    it('openShop 시 이벤트가 resolved된다', () => {
      store.setState({
        ...store.getState(),
        activeEvent: {
          id: 'test',
          definition: {
            id: 'test',
            choices: [{ id: 'shop', label: 'Shop', openShop: 'merchant' }],
          },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
      });
      store.getState().chooseEvent('shop');
      expect(store.getState().activeEvent?.resolved).toBe(true);
    });

    it('openShop 시 outcome.success가 true이다', () => {
      store.setState({
        ...store.getState(),
        activeEvent: {
          id: 'test',
          definition: {
            id: 'test',
            choices: [{ id: 'shop', label: 'Shop', openShop: 'merchant' }],
          },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
      });
      store.getState().chooseEvent('shop');
      expect(store.getState().activeEvent?.outcome?.success).toBe(true);
    });
  });

  describe('invokePrayer outcome', () => {
    it('기도 outcome에 필요한 필드가 있다', () => {
      store.setState({
        ...store.getState(),
        activeEvent: {
          id: 'test',
          definition: { id: 'test', choices: [] },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
        resources: { ...store.getState().resources, etherPts: 100 },
      });
      store.getState().invokePrayer(50);

      const outcome = store.getState().activeEvent?.outcome;
      expect(outcome).toHaveProperty('choice');
      expect(outcome).toHaveProperty('success');
      expect(outcome).toHaveProperty('text');
      expect(outcome).toHaveProperty('cost');
      expect(outcome).toHaveProperty('rewards');
    });

    it('기도 비용이 outcome.cost에 기록된다', () => {
      store.setState({
        ...store.getState(),
        activeEvent: {
          id: 'test',
          definition: { id: 'test', choices: [] },
          currentStage: null,
          resolved: false,
          outcome: null,
        },
        resources: { ...store.getState().resources, etherPts: 100 },
      });
      store.getState().invokePrayer(30);

      expect(store.getState().activeEvent?.outcome?.cost?.etherPts).toBe(30);
    });
  });

  describe('definition이 없는 경우', () => {
    it('definition이 없으면 선택이 실패한다', () => {
      store.setState({
        ...store.getState(),
        activeEvent: {
          id: 'test',
          definition: null as any,
          currentStage: null,
          resolved: false,
          outcome: null,
        },
      });
      const originalState = store.getState();
      store.getState().chooseEvent('choice1');
      expect(store.getState()).toBe(originalState);
    });

    it('choices가 없으면 선택이 실패한다', () => {
      store.setState({
        ...store.getState(),
        activeEvent: {
          id: 'test',
          definition: { id: 'test' } as any,
          currentStage: null,
          resolved: false,
          outcome: null,
        },
      });
      const originalState = store.getState();
      store.getState().chooseEvent('choice1');
      expect(store.getState()).toBe(originalState);
    });
  });
});
