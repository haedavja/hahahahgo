/**
 * @file event-simulator.ts
 * @description 이벤트 노드 시뮬레이터
 *
 * ## 기능
 * - 이벤트 선택지 결과 시뮬레이션
 * - 스탯 체크 성공률 계산
 * - 자원 변화 추적
 * - 최적 선택 분석
 */

import { getLogger } from '../core/logger';

const log = getLogger('EventSimulator');

// ==================== 타입 정의 ====================

export interface EventChoice {
  id: string;
  label: string;
  cost?: Record<string, number>;
  rewards?: Record<string, number>;
  statRequirement?: { [stat: string]: number };
  nextStage?: string;
  nextEvent?: string;
  resultDescription?: string;
  openShop?: string;
}

export interface EventStage {
  description: string;
  choices: EventChoice[];
}

export interface EventDefinition {
  id: string;
  title: string;
  description?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  isInitial?: boolean;
  choices?: EventChoice[];
  stages?: Record<string, EventStage>;
}

export interface PlayerResources {
  gold: number;
  intel: number;
  material: number;
  loot: number;
  grace: number;
  hp: number;
  maxHp: number;
}

export interface PlayerStats {
  strength: number;
  agility: number;
  insight: number;
}

export interface EventSimulationConfig {
  resources: PlayerResources;
  stats: PlayerStats;
  strategy: 'greedy' | 'safe' | 'balanced' | 'random';
  allowNegativeResources?: boolean;
}

export interface EventOutcome {
  eventId: string;
  choiceId: string;
  choiceLabel: string;
  success: boolean;
  resourceChanges: Record<string, number>;
  finalResources: PlayerResources;
  nextEventId?: string;
  openedShop?: string;
  description: string;
}

export interface EventAnalysis {
  eventId: string;
  possibleOutcomes: EventOutcome[];
  bestChoice: string;
  expectedValue: number;
  riskLevel: 'low' | 'medium' | 'high';
}

// ==================== 이벤트 시뮬레이터 ====================

export class EventSimulator {
  private events: Record<string, EventDefinition> = {};

  constructor(eventLibrary: Record<string, EventDefinition>) {
    this.events = eventLibrary;
    log.info(`EventSimulator initialized with ${Object.keys(eventLibrary).length} events`);
  }

  // ==================== 이벤트 로드 ====================

  loadEvents(events: Record<string, EventDefinition>): void {
    this.events = { ...this.events, ...events };
    log.debug(`Loaded ${Object.keys(events).length} additional events`);
  }

  getEvent(eventId: string): EventDefinition | null {
    return this.events[eventId] || null;
  }

  getAllEvents(): EventDefinition[] {
    return Object.values(this.events);
  }

  getInitialEvents(): EventDefinition[] {
    return Object.values(this.events).filter(e => e.isInitial !== false);
  }

  // ==================== 선택지 분석 ====================

  /**
   * 선택지가 선택 가능한지 확인
   */
  canSelectChoice(
    choice: EventChoice,
    resources: PlayerResources,
    stats: PlayerStats
  ): { canSelect: boolean; reason?: string } {
    // 비용 체크
    if (choice.cost) {
      for (const [resource, amount] of Object.entries(choice.cost)) {
        const current = (resources as Record<string, number>)[resource] || 0;
        if (current < amount) {
          return { canSelect: false, reason: `${resource} 부족 (필요: ${amount}, 보유: ${current})` };
        }
      }
    }

    // 스탯 요구사항 체크
    if (choice.statRequirement) {
      for (const [stat, required] of Object.entries(choice.statRequirement)) {
        const current = (stats as Record<string, number>)[stat] || 0;
        if (current < required) {
          return { canSelect: false, reason: `${stat} 부족 (필요: ${required}, 보유: ${current})` };
        }
      }
    }

    return { canSelect: true };
  }

  /**
   * 선택지의 기대 가치 계산
   */
  calculateChoiceValue(choice: EventChoice): number {
    let value = 0;

    // 보상 가치
    if (choice.rewards) {
      value += (choice.rewards.gold || 0) * 1;
      value += (choice.rewards.intel || 0) * 0.8;
      value += (choice.rewards.material || 0) * 1.5;
      value += (choice.rewards.loot || 0) * 1.2;
      value += (choice.rewards.grace || 0) * 3;
      value += (choice.rewards.hp || 0) * 2;
      value += (choice.rewards.insight || 0) * 10;
      value += (choice.rewards.strength || 0) * 10;
      value += (choice.rewards.agility || 0) * 10;
    }

    // 비용 감산
    if (choice.cost) {
      value -= (choice.cost.gold || 0) * 1;
      value -= (choice.cost.intel || 0) * 0.8;
      value -= (choice.cost.material || 0) * 1.5;
      value -= (choice.cost.grace || 0) * 3;
      value -= (choice.cost.hp || 0) * 2;
    }

    // 상점 열기는 잠재적 가치 있음
    if (choice.openShop) {
      value += 20;
    }

    // 다음 이벤트 연결은 불확실성 있음
    if (choice.nextEvent) {
      value += 5;
    }

    return value;
  }

  // ==================== 시뮬레이션 실행 ====================

  /**
   * 단일 이벤트 시뮬레이션
   */
  simulateEvent(
    eventId: string,
    config: EventSimulationConfig,
    stageId: string = 'start'
  ): EventOutcome | null {
    const event = this.events[eventId];
    if (!event) {
      log.warn(`Event not found: ${eventId}`);
      return null;
    }

    // 현재 단계의 선택지 가져오기
    let choices: EventChoice[] = [];

    if (event.stages && event.stages[stageId]) {
      choices = event.stages[stageId].choices;
    } else if (event.choices) {
      choices = event.choices;
    }

    if (choices.length === 0) {
      log.warn(`No choices available for event ${eventId} stage ${stageId}`);
      return null;
    }

    // 선택 가능한 선택지 필터링
    const selectableChoices = choices.filter(c =>
      this.canSelectChoice(c, config.resources, config.stats).canSelect
    );

    if (selectableChoices.length === 0) {
      // 선택 불가능하면 첫 번째 선택지 강제 선택 (보통 "떠난다" 류)
      const fallback = choices.find(c => !c.cost && !c.statRequirement);
      if (fallback) {
        return this.executeChoice(fallback, config);
      }
      log.warn(`No selectable choices for event ${eventId}`);
      return null;
    }

    // 전략에 따른 선택
    const selectedChoice = this.selectByStrategy(selectableChoices, config);
    return this.executeChoice(selectedChoice, config);
  }

  /**
   * 전략에 따른 선택지 선택
   */
  private selectByStrategy(choices: EventChoice[], config: EventSimulationConfig): EventChoice {
    switch (config.strategy) {
      case 'greedy':
        // 가장 높은 가치의 선택
        return choices.reduce((best, current) =>
          this.calculateChoiceValue(current) > this.calculateChoiceValue(best) ? current : best
        );

      case 'safe':
        // 비용 없는 선택 우선, 없으면 가장 낮은 비용
        const noCostChoice = choices.find(c => !c.cost);
        if (noCostChoice) return noCostChoice;
        return choices.reduce((safest, current) => {
          const safestCost = Object.values(safest.cost || {}).reduce((a, b) => a + b, 0);
          const currentCost = Object.values(current.cost || {}).reduce((a, b) => a + b, 0);
          return currentCost < safestCost ? current : safest;
        });

      case 'balanced':
        // 가치/비용 비율 최적화
        return choices.reduce((best, current) => {
          const bestValue = this.calculateChoiceValue(best);
          const currentValue = this.calculateChoiceValue(current);
          const bestCost = Object.values(best.cost || {}).reduce((a, b) => a + b, 1);
          const currentCost = Object.values(current.cost || {}).reduce((a, b) => a + b, 1);
          return (currentValue / currentCost) > (bestValue / bestCost) ? current : best;
        });

      case 'random':
      default:
        return choices[Math.floor(Math.random() * choices.length)];
    }
  }

  /**
   * 선택 실행
   */
  private executeChoice(choice: EventChoice, config: EventSimulationConfig): EventOutcome {
    const resourceChanges: Record<string, number> = {};
    const finalResources = { ...config.resources };

    // 비용 적용
    if (choice.cost) {
      for (const [resource, amount] of Object.entries(choice.cost)) {
        resourceChanges[resource] = -(amount as number);
        (finalResources as Record<string, number>)[resource] -= amount as number;
      }
    }

    // 보상 적용
    if (choice.rewards) {
      for (const [resource, amount] of Object.entries(choice.rewards)) {
        resourceChanges[resource] = (resourceChanges[resource] || 0) + (amount as number);
        (finalResources as Record<string, number>)[resource] =
          ((finalResources as Record<string, number>)[resource] || 0) + (amount as number);
      }
    }

    return {
      eventId: '',
      choiceId: choice.id,
      choiceLabel: choice.label,
      success: true,
      resourceChanges,
      finalResources,
      nextEventId: choice.nextEvent,
      openedShop: choice.openShop,
      description: choice.resultDescription || '',
    };
  }

  // ==================== 분석 ====================

  /**
   * 이벤트의 모든 가능한 결과 분석
   */
  analyzeEvent(
    eventId: string,
    config: EventSimulationConfig
  ): EventAnalysis | null {
    const event = this.events[eventId];
    if (!event) return null;

    const outcomes: EventOutcome[] = [];
    const choices = event.choices || event.stages?.start?.choices || [];

    for (const choice of choices) {
      const canSelect = this.canSelectChoice(choice, config.resources, config.stats);
      if (canSelect.canSelect) {
        const outcome = this.executeChoice(choice, config);
        outcome.eventId = eventId;
        outcomes.push(outcome);
      }
    }

    if (outcomes.length === 0) {
      return null;
    }

    // 최적 선택 찾기
    const bestOutcome = outcomes.reduce((best, current) => {
      const bestValue = this.calculateChoiceValue({ rewards: best.resourceChanges } as EventChoice);
      const currentValue = this.calculateChoiceValue({ rewards: current.resourceChanges } as EventChoice);
      return currentValue > bestValue ? current : best;
    });

    // 위험도 계산
    const avgValue = outcomes.reduce((sum, o) =>
      sum + this.calculateChoiceValue({ rewards: o.resourceChanges } as EventChoice), 0
    ) / outcomes.length;

    const riskLevel: 'low' | 'medium' | 'high' =
      avgValue > 50 ? 'low' : avgValue > 0 ? 'medium' : 'high';

    return {
      eventId,
      possibleOutcomes: outcomes,
      bestChoice: bestOutcome.choiceId,
      expectedValue: avgValue,
      riskLevel,
    };
  }

  /**
   * 이벤트 체인 시뮬레이션 (연속 이벤트)
   */
  simulateEventChain(
    startEventId: string,
    config: EventSimulationConfig,
    maxDepth: number = 10
  ): EventOutcome[] {
    const results: EventOutcome[] = [];
    let currentEventId: string | undefined = startEventId;
    let currentConfig = { ...config };
    let depth = 0;

    while (currentEventId && depth < maxDepth) {
      const outcome = this.simulateEvent(currentEventId, currentConfig);
      if (!outcome) break;

      outcome.eventId = currentEventId;
      results.push(outcome);

      // 상태 업데이트
      currentConfig.resources = outcome.finalResources;
      currentEventId = outcome.nextEventId;
      depth++;
    }

    return results;
  }

  // ==================== 통계 ====================

  /**
   * 전체 이벤트 통계
   */
  getEventStats(): {
    totalEvents: number;
    byDifficulty: Record<string, number>;
    averageChoices: number;
    chainableEvents: number;
  } {
    const events = Object.values(this.events);
    const byDifficulty: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
    let totalChoices = 0;
    let chainableEvents = 0;

    for (const event of events) {
      byDifficulty[event.difficulty || 'medium']++;

      const choices = event.choices || event.stages?.start?.choices || [];
      totalChoices += choices.length;

      if (choices.some(c => c.nextEvent)) {
        chainableEvents++;
      }
    }

    return {
      totalEvents: events.length,
      byDifficulty,
      averageChoices: events.length > 0 ? totalChoices / events.length : 0,
      chainableEvents,
    };
  }
}

// ==================== 헬퍼 함수 ====================

/**
 * 이벤트 시뮬레이터 생성 헬퍼
 */
export async function createEventSimulator(): Promise<EventSimulator> {
  // 동적 임포트로 이벤트 라이브러리 로드
  try {
    const { NEW_EVENT_LIBRARY } = await import('../../data/newEvents');
    return new EventSimulator(NEW_EVENT_LIBRARY as unknown as Record<string, EventDefinition>);
  } catch (error) {
    log.warn('Failed to load event library, using empty');
    return new EventSimulator({});
  }
}
