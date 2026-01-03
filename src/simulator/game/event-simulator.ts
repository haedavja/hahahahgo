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
import { getGlobalRandom } from '../core/seeded-random';

const log = getLogger('EventSimulator');

// ==================== 타입 정의 ====================

/** 특수 보상 타입 */
export interface SpecialRewards {
  relic?: string;           // 상징 획득
  relic2?: string;          // 추가 상징
  card?: string;            // 카드 획득
  card2?: string;           // 추가 카드
  trait?: string;           // 특성 획득
  upgradeAllCards?: boolean; // 모든 카드 승급
  fullHeal?: boolean;       // 체력 전체 회복
  maxHp?: number;           // 최대 HP 증가
}

/** 특수 패널티 타입 */
export interface SpecialPenalties {
  maxHpPercent?: number;    // 최대 HP의 N% 감소
  maxHp?: number;           // 최대 HP 고정 감소
  hpPercent?: number;       // 현재 HP의 N% 손실
  setHp?: number;           // HP를 특정 값으로 설정
  removeCards?: number;     // 덱에서 N장 제거
  removeHalfDeck?: boolean; // 덱 절반 제거
  resetDeck?: boolean;      // 덱 초기화
  card?: string;            // 저주 카드 추가
  mapRisk?: number;         // 맵 위험도 증가
}

export interface EventChoice {
  id: string;
  label: string;
  cost?: Record<string, number>;
  rewards?: Record<string, number> & SpecialRewards;
  penalties?: Record<string, number> & SpecialPenalties;
  statRequirement?: { [stat: string]: number };
  nextStage?: string;
  nextEvent?: string;
  resultDescription?: string;
  openShop?: string;
  // 확률 기반 이벤트
  probability?: number;
  successRewards?: Record<string, number> & SpecialRewards;
  failurePenalties?: Record<string, number> & SpecialPenalties;
  // 전투 트리거
  combatTrigger?: boolean;
  combatRewards?: Record<string, number>;
  combatId?: string;
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
  /** 현재 덱 (카드 제거/초기화에 사용) */
  deck?: string[];
  /** 강화된 카드 목록 */
  upgradedCards?: string[];
  /** 전투 승률 (0-1, 전투 트리거 이벤트용) */
  combatWinRate?: number;
}

export interface EventOutcome {
  eventId: string;
  choiceId: string;
  choiceLabel: string;
  choiceName?: string;  // 최종 선택 이름
  success: boolean;
  resourceChanges: Record<string, number>;
  finalResources: PlayerResources;
  nextEventId?: string;
  openedShop?: string;
  description: string;
  cardsGained?: string[];   // 획득한 카드
  relicsGained?: string[];  // 획득한 상징
  cardsRemoved?: number;    // 제거된 카드 수
  deckReset?: boolean;      // 덱 초기화 여부
  allCardsUpgraded?: boolean; // 전체 카드 승급 여부
  combatTriggered?: boolean;  // 전투 발생 여부
  probabilityRoll?: { rolled: boolean; success: boolean }; // 확률 결과
}

export interface EventAnalysis {
  eventId: string;
  possibleOutcomes: EventOutcome[];
  bestChoice: string;
  expectedValue: number;
  riskLevel: 'low' | 'medium' | 'high';
}

// ==================== 타입 안전 헬퍼 함수 ====================

/**
 * 리소스 값을 타입 안전하게 가져옴
 */
function getResourceValue(resources: PlayerResources, key: string): number {
  if (key in resources) {
    return resources[key as keyof PlayerResources];
  }
  return 0;
}

/**
 * 리소스 값을 타입 안전하게 설정
 */
function setResourceValue(resources: PlayerResources, key: string, value: number): void {
  if (key in resources) {
    (resources as Record<keyof PlayerResources, number>)[key as keyof PlayerResources] = value;
  }
}

/**
 * 스탯 값을 타입 안전하게 가져옴
 */
function getStatValue(stats: PlayerStats, key: string): number {
  if (key in stats) {
    return stats[key as keyof PlayerStats];
  }
  return 0;
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
        const current = getResourceValue(resources, resource);
        if (current < amount) {
          return { canSelect: false, reason: `${resource} 부족 (필요: ${amount}, 보유: ${current})` };
        }
      }
    }

    // 스탯 요구사항 체크
    if (choice.statRequirement) {
      for (const [stat, required] of Object.entries(choice.statRequirement)) {
        const current = getStatValue(stats, stat);
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
   * 단일 이벤트 시뮬레이션 (다단계 이벤트 완전 처리)
   * - 확률 기반 이벤트 지원
   * - 특수 효과 (HP%, 카드 제거, 전체 강화 등) 지원
   * - 전투 트리거 지원
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

    // 누적 결과 추적
    const accumulatedChanges: Record<string, number> = {};
    const choiceHistory: string[] = [];
    let currentResources = { ...config.resources };
    let currentStage = stageId;
    let finalDescription = '';
    let lastChoiceId = '';
    let lastChoiceName = '';
    let cardsGained: string[] = [];
    let relicsGained: string[] = [];
    let cardsRemoved = 0;
    let deckReset = false;
    let allCardsUpgraded = false;
    let combatTriggered = false;
    let lastProbabilityRoll: { rolled: boolean; success: boolean } | undefined;
    let maxIterations = 10; // 무한루프 방지

    while (maxIterations-- > 0) {
      // 현재 단계의 선택지 가져오기
      let choices: EventChoice[] = [];

      if (event.stages && event.stages[currentStage]) {
        choices = event.stages[currentStage].choices;
      } else if (currentStage === 'start' && event.choices) {
        choices = event.choices;
      } else {
        break; // 더 이상 단계 없음
      }

      if (choices.length === 0) {
        break;
      }

      // 현재 자원 상태로 선택 가능한 선택지 필터링
      const currentConfig = { ...config, resources: currentResources };
      const selectableChoices = choices.filter(c =>
        this.canSelectChoice(c, currentResources, config.stats).canSelect
      );

      if (selectableChoices.length === 0) {
        // 선택 불가능하면 무비용 선택지 찾기
        const fallback = choices.find(c => !c.cost && !c.statRequirement);
        if (fallback) {
          const outcome = this.executeChoiceWithTracking(fallback, currentResources, config);
          this.mergeResourceChanges(accumulatedChanges, outcome.resourceChanges);
          currentResources = outcome.finalResources;
          if (outcome.description) finalDescription = outcome.description;
          lastChoiceId = fallback.id;
          lastChoiceName = fallback.label;

          // 특수 효과 수집
          if (outcome.specialEffects.relicsGained) {
            relicsGained.push(...outcome.specialEffects.relicsGained);
          }
          if (outcome.specialEffects.cardsGained) {
            cardsGained.push(...outcome.specialEffects.cardsGained);
          }
          if (outcome.specialEffects.cardsRemoved) {
            cardsRemoved += outcome.specialEffects.cardsRemoved;
          }
          if (outcome.specialEffects.deckReset) deckReset = true;
          if (outcome.specialEffects.allCardsUpgraded) allCardsUpgraded = true;
          if (outcome.specialEffects.combatTriggered) combatTriggered = true;
          if (outcome.specialEffects.probabilityRoll) {
            lastProbabilityRoll = outcome.specialEffects.probabilityRoll;
          }

          if (fallback.nextStage) {
            currentStage = fallback.nextStage;
            continue;
          }
        }
        break;
      }

      // 전략에 따른 선택
      const selectedChoice = this.selectByStrategy(selectableChoices, currentConfig);
      choiceHistory.push(selectedChoice.id);

      // 선택 실행 (config 전달)
      const outcome = this.executeChoiceWithTracking(selectedChoice, currentResources, config);
      this.mergeResourceChanges(accumulatedChanges, outcome.resourceChanges);
      currentResources = outcome.finalResources;
      if (outcome.description) finalDescription = outcome.description;
      lastChoiceId = selectedChoice.id;
      lastChoiceName = selectedChoice.label;

      // 특수 효과 수집
      if (outcome.specialEffects.relicsGained) {
        relicsGained.push(...outcome.specialEffects.relicsGained);
      }
      if (outcome.specialEffects.cardsGained) {
        cardsGained.push(...outcome.specialEffects.cardsGained);
      }
      if (outcome.specialEffects.cardsRemoved) {
        cardsRemoved += outcome.specialEffects.cardsRemoved;
      }
      if (outcome.specialEffects.deckReset) deckReset = true;
      if (outcome.specialEffects.allCardsUpgraded) allCardsUpgraded = true;
      if (outcome.specialEffects.combatTriggered) combatTriggered = true;
      if (outcome.specialEffects.probabilityRoll) {
        lastProbabilityRoll = outcome.specialEffects.probabilityRoll;
      }

      // 다음 단계가 있으면 계속, 없으면 종료
      if (selectedChoice.nextStage) {
        currentStage = selectedChoice.nextStage;
      } else if (selectedChoice.nextEvent) {
        // 다른 이벤트로 연결되는 경우는 여기서 종료 (별도 처리 필요)
        break;
      } else {
        break; // 이벤트 종료
      }
    }

    return {
      eventId,
      choiceId: lastChoiceId,
      choiceLabel: lastChoiceName,
      choiceName: lastChoiceName,
      success: true,
      resourceChanges: accumulatedChanges,
      finalResources: currentResources,
      description: finalDescription,
      cardsGained,
      relicsGained,
      cardsRemoved: cardsRemoved > 0 ? cardsRemoved : undefined,
      deckReset: deckReset || undefined,
      allCardsUpgraded: allCardsUpgraded || undefined,
      combatTriggered: combatTriggered || undefined,
      probabilityRoll: lastProbabilityRoll,
    };
  }

  /**
   * 자원 변화 누적
   */
  private mergeResourceChanges(target: Record<string, number>, source: Record<string, number>): void {
    for (const [key, value] of Object.entries(source)) {
      target[key] = (target[key] || 0) + value;
    }
  }

  /** 특수 효과 무시할 키 목록 */
  private static readonly SPECIAL_KEYS = new Set([
    'card', 'relic', 'relic2', 'card2', 'trait',
    'upgradeAllCards', 'fullHeal', 'maxHpPercent', 'hpPercent',
    'setHp', 'removeCards', 'removeHalfDeck', 'resetDeck', 'mapRisk'
  ]);

  /**
   * 선택 실행 (자원 추적 포함) - 확률 및 특수 효과 지원
   */
  private executeChoiceWithTracking(
    choice: EventChoice,
    currentResources: PlayerResources,
    config?: EventSimulationConfig
  ): {
    resourceChanges: Record<string, number>;
    finalResources: PlayerResources;
    description: string;
    specialEffects: {
      cardsRemoved?: number;
      deckReset?: boolean;
      allCardsUpgraded?: boolean;
      combatTriggered?: boolean;
      probabilityRoll?: { rolled: boolean; success: boolean };
      relicsGained?: string[];
      cardsGained?: string[];
    };
  } {
    const resourceChanges: Record<string, number> = {};
    const finalResources = { ...currentResources };
    const specialEffects: {
      cardsRemoved?: number;
      deckReset?: boolean;
      allCardsUpgraded?: boolean;
      combatTriggered?: boolean;
      probabilityRoll?: { rolled: boolean; success: boolean };
      relicsGained?: string[];
      cardsGained?: string[];
    } = {};

    // 1. 확률 기반 이벤트 처리
    if (choice.probability !== undefined) {
      const success = getGlobalRandom().chance(choice.probability);
      specialEffects.probabilityRoll = { rolled: true, success };

      if (success && choice.successRewards) {
        this.applyRewards(choice.successRewards, finalResources, resourceChanges, specialEffects);
      } else if (!success && choice.failurePenalties) {
        this.applyPenalties(choice.failurePenalties, finalResources, resourceChanges, specialEffects, config);
      }

      return {
        resourceChanges,
        finalResources,
        description: choice.resultDescription || '',
        specialEffects,
      };
    }

    // 2. 전투 트리거 처리
    if (choice.combatTrigger) {
      specialEffects.combatTriggered = true;
      const combatWinRate = config?.combatWinRate ?? 0.75;
      const won = getGlobalRandom().chance(combatWinRate);

      if (won && choice.combatRewards) {
        this.applyRewards(choice.combatRewards as Record<string, number>, finalResources, resourceChanges, specialEffects);
      }

      return {
        resourceChanges,
        finalResources,
        description: choice.resultDescription || '',
        specialEffects,
      };
    }

    // 3. 비용 적용
    if (choice.cost) {
      for (const [resource, amount] of Object.entries(choice.cost)) {
        if (resource === 'hpPercent') {
          // HP 퍼센트 비용
          const hpLoss = Math.floor(finalResources.hp * ((amount as number) / 100));
          resourceChanges.hp = (resourceChanges.hp || 0) - hpLoss;
          finalResources.hp -= hpLoss;
        } else if (!EventSimulator.SPECIAL_KEYS.has(resource)) {
          resourceChanges[resource] = (resourceChanges[resource] || 0) - (amount as number);
          const currentValue = getResourceValue(finalResources, resource);
          setResourceValue(finalResources, resource, currentValue - (amount as number));
        }
      }
    }

    // 4. 보상 적용
    if (choice.rewards) {
      this.applyRewards(choice.rewards, finalResources, resourceChanges, specialEffects);
    }

    // 5. 패널티 적용
    if (choice.penalties) {
      this.applyPenalties(choice.penalties, finalResources, resourceChanges, specialEffects, config);
    }

    return {
      resourceChanges,
      finalResources,
      description: choice.resultDescription || '',
      specialEffects,
    };
  }

  /**
   * 보상 적용 헬퍼
   */
  private applyRewards(
    rewards: Record<string, unknown>,
    finalResources: PlayerResources,
    resourceChanges: Record<string, number>,
    specialEffects: { relicsGained?: string[]; cardsGained?: string[]; allCardsUpgraded?: boolean }
  ): void {
    for (const [key, value] of Object.entries(rewards)) {
      if (key === 'relic' || key === 'relic2') {
        if (!specialEffects.relicsGained) specialEffects.relicsGained = [];
        specialEffects.relicsGained.push(String(value));
      } else if (key === 'card' || key === 'card2') {
        if (!specialEffects.cardsGained) specialEffects.cardsGained = [];
        specialEffects.cardsGained.push(String(value));
      } else if (key === 'upgradeAllCards' && value === true) {
        specialEffects.allCardsUpgraded = true;
      } else if (key === 'fullHeal' && value === true) {
        const healAmount = finalResources.maxHp - finalResources.hp;
        resourceChanges.hp = (resourceChanges.hp || 0) + healAmount;
        finalResources.hp = finalResources.maxHp;
      } else if (key === 'maxHp' && typeof value === 'number') {
        resourceChanges.maxHp = (resourceChanges.maxHp || 0) + value;
        finalResources.maxHp += value;
      } else if (!EventSimulator.SPECIAL_KEYS.has(key) && typeof value === 'number') {
        resourceChanges[key] = (resourceChanges[key] || 0) + value;
        const currentValue = getResourceValue(finalResources, key);
        setResourceValue(finalResources, key, currentValue + value);
      }
    }
  }

  /**
   * 패널티 적용 헬퍼
   */
  private applyPenalties(
    penalties: Record<string, unknown>,
    finalResources: PlayerResources,
    resourceChanges: Record<string, number>,
    specialEffects: { cardsRemoved?: number; deckReset?: boolean },
    config?: EventSimulationConfig
  ): void {
    for (const [key, value] of Object.entries(penalties)) {
      if (key === 'maxHpPercent' && typeof value === 'number') {
        // 최대 HP의 N% 영구 감소
        const maxHpLoss = Math.floor(finalResources.maxHp * (value / 100));
        resourceChanges.maxHp = (resourceChanges.maxHp || 0) - maxHpLoss;
        finalResources.maxHp -= maxHpLoss;
        // 현재 HP가 최대 HP를 초과하지 않도록
        if (finalResources.hp > finalResources.maxHp) {
          resourceChanges.hp = (resourceChanges.hp || 0) - (finalResources.hp - finalResources.maxHp);
          finalResources.hp = finalResources.maxHp;
        }
      } else if (key === 'maxHp' && typeof value === 'number') {
        // 최대 HP 고정 감소
        resourceChanges.maxHp = (resourceChanges.maxHp || 0) - value;
        finalResources.maxHp -= value;
        if (finalResources.hp > finalResources.maxHp) {
          resourceChanges.hp = (resourceChanges.hp || 0) - (finalResources.hp - finalResources.maxHp);
          finalResources.hp = finalResources.maxHp;
        }
      } else if (key === 'hpPercent' && typeof value === 'number') {
        // 현재 HP의 N% 손실
        const hpLoss = Math.floor(finalResources.hp * (value / 100));
        resourceChanges.hp = (resourceChanges.hp || 0) - hpLoss;
        finalResources.hp -= hpLoss;
      } else if (key === 'setHp' && typeof value === 'number') {
        // HP를 특정 값으로 설정
        const hpChange = value - finalResources.hp;
        resourceChanges.hp = (resourceChanges.hp || 0) + hpChange;
        finalResources.hp = value;
      } else if (key === 'removeCards' && typeof value === 'number') {
        // 덱에서 N장 제거
        specialEffects.cardsRemoved = (specialEffects.cardsRemoved || 0) + value;
      } else if (key === 'removeHalfDeck' && value === true) {
        // 덱 절반 제거
        const deckSize = config?.deck?.length || 10;
        specialEffects.cardsRemoved = (specialEffects.cardsRemoved || 0) + Math.floor(deckSize / 2);
      } else if (key === 'resetDeck' && value === true) {
        // 덱 초기화
        specialEffects.deckReset = true;
      } else if (key === 'card') {
        // 저주 카드 - 별도 처리 (여기서는 무시)
      } else if (key === 'mapRisk') {
        // 맵 위험도 - 별도 처리 (여기서는 무시)
      } else if (!EventSimulator.SPECIAL_KEYS.has(key) && typeof value === 'number') {
        // 일반 리소스 패널티
        resourceChanges[key] = (resourceChanges[key] || 0) - value;
        const currentValue = getResourceValue(finalResources, key);
        setResourceValue(finalResources, key, currentValue - value);
      }
    }
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
        return getGlobalRandom().pick(choices);
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
        const currentValue = getResourceValue(finalResources, resource);
        setResourceValue(finalResources, resource, currentValue - (amount as number));
      }
    }

    // 보상 적용
    if (choice.rewards) {
      for (const [resource, amount] of Object.entries(choice.rewards)) {
        resourceChanges[resource] = (resourceChanges[resource] || 0) + (amount as number);
        const currentValue = getResourceValue(finalResources, resource);
        setResourceValue(finalResources, resource, currentValue + (amount as number));
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
 * NewEventDefinition을 EventDefinition으로 변환
 */
function convertToEventDefinition(newEvent: unknown): EventDefinition {
  const event = newEvent as {
    id: string;
    title?: string;
    description?: string;
    difficulty?: string;
    isInitial?: boolean;
    choices?: EventChoice[];
    stages?: Record<string, EventStage>;
  };

  return {
    id: event.id,
    title: event.title || event.id, // title이 없으면 id 사용
    description: event.description,
    difficulty: event.difficulty as 'easy' | 'medium' | 'hard' | undefined,
    isInitial: event.isInitial,
    choices: event.choices,
    stages: event.stages,
  };
}

/**
 * 이벤트 시뮬레이터 생성 헬퍼
 */
export async function createEventSimulator(): Promise<EventSimulator> {
  // 동적 임포트로 이벤트 라이브러리 로드
  try {
    const { NEW_EVENT_LIBRARY } = await import('../../data/newEvents');
    const convertedLibrary: Record<string, EventDefinition> = {};

    for (const [key, value] of Object.entries(NEW_EVENT_LIBRARY)) {
      convertedLibrary[key] = convertToEventDefinition(value);
    }

    return new EventSimulator(convertedLibrary);
  } catch (error) {
    log.warn('Failed to load event library, using empty');
    return new EventSimulator({});
  }
}
