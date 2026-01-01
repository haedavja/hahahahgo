/**
 * @file event-simulator.test.ts
 * @description 이벤트 시뮬레이터 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  EventSimulator,
  type EventDefinition,
  type EventChoice,
  type PlayerResources,
  type PlayerStats,
  type EventSimulationConfig,
} from './event-simulator';

// 테스트용 이벤트 데이터
const createTestEvent = (overrides: Partial<EventDefinition> = {}): EventDefinition => ({
  id: 'test_event',
  title: '테스트 이벤트',
  description: '테스트용 이벤트입니다',
  difficulty: 'medium',
  isInitial: true,
  choices: [
    {
      id: 'choice1',
      label: '선택 1',
      rewards: { gold: 10 },
    },
    {
      id: 'choice2',
      label: '선택 2',
      cost: { gold: 5 },
      rewards: { intel: 3 },
    },
  ],
  ...overrides,
});

const createTestResources = (overrides: Partial<PlayerResources> = {}): PlayerResources => ({
  gold: 50,
  intel: 10,
  material: 5,
  loot: 3,
  grace: 1,
  hp: 80,
  maxHp: 100,
  ...overrides,
});

const createTestStats = (overrides: Partial<PlayerStats> = {}): PlayerStats => ({
  strength: 5,
  agility: 5,
  insight: 5,
  ...overrides,
});

const createTestConfig = (overrides: Partial<EventSimulationConfig> = {}): EventSimulationConfig => ({
  resources: createTestResources(),
  stats: createTestStats(),
  strategy: 'balanced',
  ...overrides,
});

describe('EventSimulator', () => {
  let simulator: EventSimulator;
  const testEvents: Record<string, EventDefinition> = {
    test_event: createTestEvent(),
    chain_event: createTestEvent({
      id: 'chain_event',
      title: '체인 이벤트',
      choices: [
        {
          id: 'chain_choice',
          label: '다음 이벤트로',
          nextEvent: 'test_event',
        },
      ],
    }),
    hard_event: createTestEvent({
      id: 'hard_event',
      title: '어려운 이벤트',
      difficulty: 'hard',
      isInitial: false,
    }),
    easy_event: createTestEvent({
      id: 'easy_event',
      title: '쉬운 이벤트',
      difficulty: 'easy',
    }),
  };

  beforeEach(() => {
    simulator = new EventSimulator(testEvents);
  });

  describe('constructor', () => {
    it('이벤트 라이브러리로 초기화된다', () => {
      const sim = new EventSimulator({ test: createTestEvent() });
      expect(sim.getAllEvents()).toHaveLength(1);
    });

    it('빈 라이브러리로도 초기화 가능하다', () => {
      const sim = new EventSimulator({});
      expect(sim.getAllEvents()).toHaveLength(0);
    });
  });

  describe('loadEvents', () => {
    it('추가 이벤트를 로드한다', () => {
      const initialCount = simulator.getAllEvents().length;
      simulator.loadEvents({
        new_event: createTestEvent({ id: 'new_event', title: '새 이벤트' }),
      });
      expect(simulator.getAllEvents().length).toBe(initialCount + 1);
    });

    it('기존 이벤트를 덮어쓸 수 있다', () => {
      simulator.loadEvents({
        test_event: createTestEvent({ title: '수정된 이벤트' }),
      });
      const event = simulator.getEvent('test_event');
      expect(event?.title).toBe('수정된 이벤트');
    });
  });

  describe('getEvent', () => {
    it('존재하는 이벤트를 반환한다', () => {
      const event = simulator.getEvent('test_event');
      expect(event).not.toBeNull();
      expect(event?.title).toBe('테스트 이벤트');
    });

    it('존재하지 않는 이벤트는 null을 반환한다', () => {
      const event = simulator.getEvent('nonexistent');
      expect(event).toBeNull();
    });
  });

  describe('getAllEvents', () => {
    it('모든 이벤트를 반환한다', () => {
      const events = simulator.getAllEvents();
      expect(events.length).toBe(Object.keys(testEvents).length);
    });
  });

  describe('getInitialEvents', () => {
    it('isInitial이 false가 아닌 이벤트만 반환한다', () => {
      const initialEvents = simulator.getInitialEvents();
      // hard_event는 isInitial: false이므로 제외
      expect(initialEvents.length).toBe(3);
      expect(initialEvents.every(e => e.isInitial !== false)).toBe(true);
    });
  });

  describe('canSelectChoice', () => {
    it('비용이 없는 선택지는 항상 선택 가능하다', () => {
      const choice: EventChoice = { id: 'free', label: '무료' };
      const result = simulator.canSelectChoice(choice, createTestResources(), createTestStats());
      expect(result.canSelect).toBe(true);
    });

    it('비용이 충분하면 선택 가능하다', () => {
      const choice: EventChoice = { id: 'paid', label: '유료', cost: { gold: 10 } };
      const result = simulator.canSelectChoice(choice, createTestResources({ gold: 50 }), createTestStats());
      expect(result.canSelect).toBe(true);
    });

    it('비용이 부족하면 선택 불가능하다', () => {
      const choice: EventChoice = { id: 'paid', label: '유료', cost: { gold: 100 } };
      const result = simulator.canSelectChoice(choice, createTestResources({ gold: 50 }), createTestStats());
      expect(result.canSelect).toBe(false);
      expect(result.reason).toContain('gold 부족');
    });

    it('스탯 요구사항을 충족하면 선택 가능하다', () => {
      const choice: EventChoice = { id: 'stat', label: '스탯 필요', statRequirement: { strength: 3 } };
      const result = simulator.canSelectChoice(choice, createTestResources(), createTestStats({ strength: 5 }));
      expect(result.canSelect).toBe(true);
    });

    it('스탯 요구사항을 충족하지 못하면 선택 불가능하다', () => {
      const choice: EventChoice = { id: 'stat', label: '스탯 필요', statRequirement: { strength: 10 } };
      const result = simulator.canSelectChoice(choice, createTestResources(), createTestStats({ strength: 5 }));
      expect(result.canSelect).toBe(false);
      expect(result.reason).toContain('strength 부족');
    });
  });

  describe('calculateChoiceValue', () => {
    it('보상의 가치를 계산한다', () => {
      const choice: EventChoice = { id: 'reward', label: '보상', rewards: { gold: 10 } };
      const value = simulator.calculateChoiceValue(choice);
      expect(value).toBeGreaterThan(0);
    });

    it('비용이 있으면 가치가 감소한다', () => {
      const choiceWithCost: EventChoice = { id: 'cost', label: '비용', cost: { gold: 10 } };
      const choiceNoCost: EventChoice = { id: 'nocost', label: '무비용' };
      expect(simulator.calculateChoiceValue(choiceWithCost)).toBeLessThan(simulator.calculateChoiceValue(choiceNoCost));
    });

    it('상점 열기는 추가 가치가 있다', () => {
      const shopChoice: EventChoice = { id: 'shop', label: '상점', openShop: 'test_shop' };
      const noShopChoice: EventChoice = { id: 'noshop', label: '상점 없음' };
      expect(simulator.calculateChoiceValue(shopChoice)).toBeGreaterThan(simulator.calculateChoiceValue(noShopChoice));
    });

    it('스탯 보상은 높은 가치를 가진다', () => {
      const statChoice: EventChoice = { id: 'stat', label: '스탯', rewards: { strength: 1 } };
      const goldChoice: EventChoice = { id: 'gold', label: '골드', rewards: { gold: 5 } };
      expect(simulator.calculateChoiceValue(statChoice)).toBeGreaterThan(simulator.calculateChoiceValue(goldChoice));
    });
  });

  describe('simulateEvent', () => {
    it('이벤트를 시뮬레이션한다', () => {
      const result = simulator.simulateEvent('test_event', createTestConfig());
      expect(result).not.toBeNull();
      expect(result?.success).toBe(true);
    });

    it('존재하지 않는 이벤트는 null을 반환한다', () => {
      const result = simulator.simulateEvent('nonexistent', createTestConfig());
      expect(result).toBeNull();
    });

    it('선택지가 없으면 null을 반환한다', () => {
      simulator.loadEvents({
        empty_event: { id: 'empty_event', title: '빈 이벤트', choices: [] },
      });
      const result = simulator.simulateEvent('empty_event', createTestConfig());
      expect(result).toBeNull();
    });

    it('greedy 전략은 최고 가치 선택지를 선택한다', () => {
      const config = createTestConfig({ strategy: 'greedy' });
      const result = simulator.simulateEvent('test_event', config);
      expect(result).not.toBeNull();
    });

    it('safe 전략은 비용 없는 선택지를 우선한다', () => {
      const config = createTestConfig({ strategy: 'safe' });
      const result = simulator.simulateEvent('test_event', config);
      expect(result).not.toBeNull();
      // 첫 번째 선택지는 비용이 없음
      expect(result?.choiceId).toBe('choice1');
    });

    it('random 전략은 임의 선택지를 선택한다', () => {
      const config = createTestConfig({ strategy: 'random' });
      const result = simulator.simulateEvent('test_event', config);
      expect(result).not.toBeNull();
    });

    it('balanced 전략은 가치/비용 비율을 최적화한다', () => {
      const config = createTestConfig({ strategy: 'balanced' });
      const result = simulator.simulateEvent('test_event', config);
      expect(result).not.toBeNull();
    });
  });

  describe('simulateEvent - 스테이지', () => {
    beforeEach(() => {
      simulator.loadEvents({
        staged_event: {
          id: 'staged_event',
          title: '스테이지 이벤트',
          stages: {
            start: {
              description: '시작 스테이지',
              choices: [
                { id: 'stage1_choice', label: '다음으로', nextStage: 'next' },
              ],
            },
            next: {
              description: '다음 스테이지',
              choices: [
                { id: 'stage2_choice', label: '완료', rewards: { gold: 20 } },
              ],
            },
          },
        },
      });
    });

    it('스테이지가 있는 이벤트를 시뮬레이션한다', () => {
      const result = simulator.simulateEvent('staged_event', createTestConfig(), 'start');
      expect(result).not.toBeNull();
      expect(result?.choiceId).toBe('stage1_choice');
    });

    it('특정 스테이지를 시뮬레이션한다', () => {
      const result = simulator.simulateEvent('staged_event', createTestConfig(), 'next');
      expect(result).not.toBeNull();
      expect(result?.choiceId).toBe('stage2_choice');
    });
  });

  describe('analyzeEvent', () => {
    it('이벤트의 가능한 결과를 분석한다', () => {
      const analysis = simulator.analyzeEvent('test_event', createTestConfig());
      expect(analysis).not.toBeNull();
      expect(analysis?.eventId).toBe('test_event');
      expect(analysis?.possibleOutcomes.length).toBeGreaterThan(0);
    });

    it('최적 선택을 찾는다', () => {
      const analysis = simulator.analyzeEvent('test_event', createTestConfig());
      expect(analysis?.bestChoice).toBeDefined();
    });

    it('위험도를 계산한다', () => {
      const analysis = simulator.analyzeEvent('test_event', createTestConfig());
      expect(['low', 'medium', 'high']).toContain(analysis?.riskLevel);
    });

    it('존재하지 않는 이벤트는 null을 반환한다', () => {
      const analysis = simulator.analyzeEvent('nonexistent', createTestConfig());
      expect(analysis).toBeNull();
    });

    it('선택 가능한 선택지가 없으면 null을 반환한다', () => {
      simulator.loadEvents({
        expensive_event: {
          id: 'expensive_event',
          title: '비싼 이벤트',
          choices: [
            { id: 'expensive', label: '비싼 선택', cost: { gold: 1000 } },
          ],
        },
      });
      const analysis = simulator.analyzeEvent('expensive_event', createTestConfig({ resources: createTestResources({ gold: 0 }) }));
      expect(analysis).toBeNull();
    });
  });

  describe('simulateEventChain', () => {
    it('연속 이벤트를 시뮬레이션한다', () => {
      const results = simulator.simulateEventChain('chain_event', createTestConfig());
      expect(results.length).toBeGreaterThan(0);
    });

    it('maxDepth를 초과하지 않는다', () => {
      const results = simulator.simulateEventChain('chain_event', createTestConfig(), 1);
      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('이벤트 체인이 없으면 단일 결과를 반환한다', () => {
      const results = simulator.simulateEventChain('test_event', createTestConfig());
      expect(results.length).toBe(1);
    });
  });

  describe('getEventStats', () => {
    it('전체 이벤트 통계를 반환한다', () => {
      const stats = simulator.getEventStats();
      expect(stats.totalEvents).toBe(Object.keys(testEvents).length);
    });

    it('난이도별 이벤트 수를 계산한다', () => {
      const stats = simulator.getEventStats();
      expect(stats.byDifficulty).toHaveProperty('easy');
      expect(stats.byDifficulty).toHaveProperty('medium');
      expect(stats.byDifficulty).toHaveProperty('hard');
    });

    it('평균 선택지 수를 계산한다', () => {
      const stats = simulator.getEventStats();
      expect(typeof stats.averageChoices).toBe('number');
    });

    it('체인 가능 이벤트 수를 계산한다', () => {
      const stats = simulator.getEventStats();
      expect(stats.chainableEvents).toBeGreaterThan(0);
    });
  });

  describe('safe 전략 - 비용 없는 선택지가 없는 경우', () => {
    beforeEach(() => {
      simulator.loadEvents({
        all_cost_event: {
          id: 'all_cost_event',
          title: '모든 선택에 비용이 있는 이벤트',
          choices: [
            { id: 'cheap', label: '저렴', cost: { gold: 5 } },
            { id: 'expensive', label: '비쌈', cost: { gold: 20 } },
          ],
        },
      });
    });

    it('비용이 가장 낮은 선택지를 선택한다', () => {
      const config = createTestConfig({ strategy: 'safe' });
      const result = simulator.simulateEvent('all_cost_event', config);
      expect(result?.choiceId).toBe('cheap');
    });
  });

  describe('선택 불가능한 선택지만 있는 경우', () => {
    beforeEach(() => {
      simulator.loadEvents({
        fallback_event: {
          id: 'fallback_event',
          title: '폴백 이벤트',
          choices: [
            { id: 'impossible', label: '불가능', cost: { gold: 1000 } },
            { id: 'leave', label: '떠난다' },
          ],
        },
      });
    });

    it('비용/요구사항 없는 폴백 선택지를 사용한다', () => {
      const config = createTestConfig({ resources: createTestResources({ gold: 0 }) });
      const result = simulator.simulateEvent('fallback_event', config);
      expect(result?.choiceId).toBe('leave');
    });
  });

  describe('자원 변화', () => {
    it('비용이 자원에서 차감된다', () => {
      simulator.loadEvents({
        cost_event: {
          id: 'cost_event',
          title: '비용 이벤트',
          choices: [{ id: 'pay', label: '지불', cost: { gold: 10 } }],
        },
      });
      const config = createTestConfig({ resources: createTestResources({ gold: 50 }) });
      const result = simulator.simulateEvent('cost_event', config);
      expect(result?.finalResources.gold).toBe(40);
      expect(result?.resourceChanges.gold).toBe(-10);
    });

    it('보상이 자원에 추가된다', () => {
      simulator.loadEvents({
        reward_event: {
          id: 'reward_event',
          title: '보상 이벤트',
          choices: [{ id: 'reward', label: '보상', rewards: { gold: 20 } }],
        },
      });
      const config = createTestConfig({ resources: createTestResources({ gold: 50 }) });
      const result = simulator.simulateEvent('reward_event', config);
      expect(result?.finalResources.gold).toBe(70);
      expect(result?.resourceChanges.gold).toBe(20);
    });

    it('비용과 보상이 동시에 적용된다', () => {
      simulator.loadEvents({
        trade_event: {
          id: 'trade_event',
          title: '교환 이벤트',
          choices: [{ id: 'trade', label: '교환', cost: { gold: 10 }, rewards: { intel: 5 } }],
        },
      });
      const config = createTestConfig({ resources: createTestResources({ gold: 50, intel: 10 }) });
      const result = simulator.simulateEvent('trade_event', config);
      expect(result?.finalResources.gold).toBe(40);
      expect(result?.finalResources.intel).toBe(15);
    });
  });
});
