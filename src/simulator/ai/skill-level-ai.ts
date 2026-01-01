/**
 * @file skill-level-ai.ts
 * @description 플레이어 스킬 레벨 모델링
 *
 * 다양한 스킬 레벨의 플레이어 행동을 시뮬레이션합니다:
 * - beginner: 초보자 (30% 실수율, 기본 전략)
 * - intermediate: 중급자 (15% 실수율, 시너지 인식)
 * - advanced: 고수 (5% 실수율, 최적화된 플레이)
 * - optimal: AI 최적 (0% 실수율, MCTS/휴리스틱 최적)
 */

import type { GameCard, GameBattleState, TimelineCard, PlayerState } from '../core/game-types';
import { syncAllCards } from '../data/game-data-sync';

// ==================== 타입 정의 ====================

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'optimal';

export interface SkillLevelConfig {
  /** 실수 확률 (0-1) */
  mistakeRate: number;
  /** 시너지 인식 확률 */
  synergyAwareness: number;
  /** 위험 인식 능력 */
  riskAwareness: number;
  /** 교차 활용 확률 */
  crossUsage: number;
  /** 대응 사용 확률 */
  respondUsage: number;
  /** 선제적 방어 확률 */
  preemptiveDefense: number;
  /** 콤보 인식 */
  comboAwareness: number;
  /** 에테르 관리 능력 */
  etherManagement: number;
}

export interface CardDecision {
  selectedCards: string[];
  positions: number[];
  reasoning: string[];
  wasOptimal: boolean;
  mistakeMade: boolean;
}

export interface SkillLevelStats {
  optimalPlays: number;
  suboptimalPlays: number;
  mistakesMade: number;
  synergyMissed: number;
  crossOpportunitiesMissed: number;
}

// ==================== 스킬 레벨 설정 ====================

const SKILL_CONFIGS: Record<SkillLevel, SkillLevelConfig> = {
  beginner: {
    mistakeRate: 0.30,
    synergyAwareness: 0.3,
    riskAwareness: 0.4,
    crossUsage: 0.2,
    respondUsage: 0.4,
    preemptiveDefense: 0.3,
    comboAwareness: 0.2,
    etherManagement: 0.3,
  },
  intermediate: {
    mistakeRate: 0.15,
    synergyAwareness: 0.6,
    riskAwareness: 0.7,
    crossUsage: 0.5,
    respondUsage: 0.6,
    preemptiveDefense: 0.5,
    comboAwareness: 0.5,
    etherManagement: 0.6,
  },
  advanced: {
    mistakeRate: 0.05,
    synergyAwareness: 0.9,
    riskAwareness: 0.9,
    crossUsage: 0.8,
    respondUsage: 0.8,
    preemptiveDefense: 0.8,
    comboAwareness: 0.85,
    etherManagement: 0.9,
  },
  optimal: {
    mistakeRate: 0,
    synergyAwareness: 1.0,
    riskAwareness: 1.0,
    crossUsage: 1.0,
    respondUsage: 1.0,
    preemptiveDefense: 1.0,
    comboAwareness: 1.0,
    etherManagement: 1.0,
  },
};

// ==================== 스킬 레벨 AI ====================

export class SkillLevelAI {
  private skillLevel: SkillLevel;
  private config: SkillLevelConfig;
  private cards: Record<string, GameCard>;
  private stats: SkillLevelStats;

  constructor(skillLevel: SkillLevel = 'intermediate') {
    this.skillLevel = skillLevel;
    this.config = SKILL_CONFIGS[skillLevel];
    this.cards = syncAllCards();
    this.stats = {
      optimalPlays: 0,
      suboptimalPlays: 0,
      mistakesMade: 0,
      synergyMissed: 0,
      crossOpportunitiesMissed: 0,
    };
  }

  /**
   * 스킬 레벨 변경
   */
  setSkillLevel(level: SkillLevel): void {
    this.skillLevel = level;
    this.config = SKILL_CONFIGS[level];
  }

  /**
   * 통계 가져오기
   */
  getStats(): SkillLevelStats {
    return { ...this.stats };
  }

  /**
   * 통계 초기화
   */
  resetStats(): void {
    this.stats = {
      optimalPlays: 0,
      suboptimalPlays: 0,
      mistakesMade: 0,
      synergyMissed: 0,
      crossOpportunitiesMissed: 0,
    };
  }

  /**
   * 카드 선택 결정
   * @param state 현재 전투 상태
   * @param optimalCards 최적 선택 카드들
   * @returns 스킬 레벨에 맞는 카드 선택
   */
  selectCards(state: GameBattleState, optimalCards: string[]): CardDecision {
    const reasoning: string[] = [];
    let selectedCards = [...optimalCards];
    let wasOptimal = true;
    let mistakeMade = false;

    // 실수 체크
    if (Math.random() < this.config.mistakeRate) {
      mistakeMade = true;
      selectedCards = this.makeMistake(state, optimalCards, reasoning);
      wasOptimal = false;
      this.stats.mistakesMade++;
    }

    // 시너지 인식 실패
    if (!mistakeMade && Math.random() > this.config.synergyAwareness) {
      const hasSynergy = this.checkSynergyInSelection(optimalCards);
      if (hasSynergy) {
        selectedCards = this.removeSynergyCards(state, optimalCards, reasoning);
        wasOptimal = false;
        this.stats.synergyMissed++;
      }
    }

    // 위험 인식 실패 (방어 카드 부족)
    if (!mistakeMade && Math.random() > this.config.riskAwareness) {
      const needsDefense = this.checkNeedsDefense(state);
      if (needsDefense && this.hasDefenseCards(state.player)) {
        selectedCards = this.removeDefenseCards(selectedCards, reasoning);
        wasOptimal = false;
      }
    }

    // 위치 결정
    const positions = this.decidePositions(state, selectedCards);

    if (wasOptimal) {
      this.stats.optimalPlays++;
    } else {
      this.stats.suboptimalPlays++;
    }

    return {
      selectedCards,
      positions,
      reasoning,
      wasOptimal,
      mistakeMade,
    };
  }

  /**
   * 대응 단계 결정
   * @param state 현재 전투 상태
   * @param shouldRespond 최적 대응 여부
   * @returns 실제 대응 여부
   */
  decideRespond(state: GameBattleState, shouldRespond: boolean): boolean {
    // optimal이면 항상 최적 결정
    if (this.skillLevel === 'optimal') {
      return shouldRespond;
    }

    // 대응 사용 확률에 따라 결정
    if (shouldRespond) {
      return Math.random() < this.config.respondUsage;
    }

    // 불필요한 대응 (실수)
    if (!shouldRespond && Math.random() < this.config.mistakeRate * 0.5) {
      return true;
    }

    return false;
  }

  /**
   * 교차 위치 선택 결정
   * @param state 현재 전투 상태
   * @param optimalPositions 최적 교차 위치들
   * @returns 실제 선택 위치들
   */
  decideCrossPositions(
    state: GameBattleState,
    optimalPositions: number[]
  ): number[] {
    if (this.skillLevel === 'optimal') {
      return optimalPositions;
    }

    // 교차 활용 확률에 따라 일부 위치만 선택
    return optimalPositions.filter(() => Math.random() < this.config.crossUsage);
  }

  // ==================== Private Methods ====================

  /**
   * 실수 생성 - 최적이 아닌 카드 선택
   */
  private makeMistake(
    state: GameBattleState,
    optimalCards: string[],
    reasoning: string[]
  ): string[] {
    const hand = state.player.hand;
    const mistakeType = Math.random();

    if (mistakeType < 0.4) {
      // 무작위 카드 선택
      reasoning.push('실수: 무작위 카드 선택');
      const shuffled = [...hand].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, Math.min(optimalCards.length, shuffled.length));
    } else if (mistakeType < 0.7) {
      // 일부 카드만 최적
      reasoning.push('실수: 일부 최적 카드 누락');
      const kept = optimalCards.filter(() => Math.random() > 0.3);
      const remaining = hand.filter(c => !kept.includes(c));
      const added = remaining.slice(0, optimalCards.length - kept.length);
      return [...kept, ...added];
    } else {
      // 에너지 낭비 (액션 코스트 높은 카드)
      reasoning.push('실수: 에너지 낭비');
      const sorted = [...hand].sort((a, b) => {
        const cardA = this.cards[a];
        const cardB = this.cards[b];
        return (cardB?.actionCost || 1) - (cardA?.actionCost || 1);
      });
      return sorted.slice(0, Math.min(3, sorted.length));
    }
  }

  /**
   * 시너지 카드 조합 확인
   */
  private checkSynergyInSelection(cards: string[]): boolean {
    // 간단한 시너지 체크: 같은 타입 카드가 2개 이상
    const types: Record<string, number> = {};
    for (const cardId of cards) {
      const card = this.cards[cardId];
      if (card) {
        types[card.type] = (types[card.type] || 0) + 1;
      }
    }
    return Object.values(types).some(count => count >= 2);
  }

  /**
   * 시너지 카드 제거 (시너지 인식 실패)
   */
  private removeSynergyCards(
    state: GameBattleState,
    optimalCards: string[],
    reasoning: string[]
  ): string[] {
    reasoning.push('시너지 인식 실패: 시너지 카드 분산');
    // 첫 번째 카드만 유지, 나머지는 다른 타입으로 교체 시도
    const result = [optimalCards[0]];
    const usedTypes = new Set([this.cards[optimalCards[0]]?.type]);

    for (const cardId of state.player.hand) {
      if (result.length >= optimalCards.length) break;
      if (result.includes(cardId)) continue;

      const card = this.cards[cardId];
      if (card && !usedTypes.has(card.type)) {
        result.push(cardId);
        usedTypes.add(card.type);
      }
    }

    // 부족하면 나머지로 채움
    for (const cardId of optimalCards) {
      if (result.length >= optimalCards.length) break;
      if (!result.includes(cardId)) {
        result.push(cardId);
      }
    }

    return result;
  }

  /**
   * 방어 필요 여부 확인
   */
  private checkNeedsDefense(state: GameBattleState): boolean {
    const hpRatio = state.player.hp / state.player.maxHp;
    return hpRatio < 0.5;
  }

  /**
   * 방어 카드 보유 확인
   */
  private hasDefenseCards(player: PlayerState): boolean {
    return player.hand.some(cardId => {
      const card = this.cards[cardId];
      return card && (card.type === 'defense' || card.block);
    });
  }

  /**
   * 방어 카드 제거 (위험 인식 실패)
   */
  private removeDefenseCards(cards: string[], reasoning: string[]): string[] {
    reasoning.push('위험 인식 실패: 방어 카드 미사용');
    return cards.filter(cardId => {
      const card = this.cards[cardId];
      return !(card && (card.type === 'defense' || card.block));
    });
  }

  /**
   * 카드 위치 결정
   */
  private decidePositions(state: GameBattleState, cards: string[]): number[] {
    const positions: number[] = [];
    const occupied = new Set(state.timeline.map(tc => tc.position));
    const enemyPositions = state.timeline
      .filter(tc => tc.owner === 'enemy')
      .map(tc => tc.position);

    for (const cardId of cards) {
      const card = this.cards[cardId];
      if (!card) continue;

      const speedCost = card.speedCost || 5;
      let targetPos = state.player.speed + speedCost;

      // 교차 기회 활용 (스킬 레벨에 따라)
      if (Math.random() < this.config.crossUsage) {
        const crossPos = enemyPositions.find(
          p => p >= targetPos && !occupied.has(p) && !positions.includes(p)
        );
        if (crossPos) {
          targetPos = crossPos;
        }
      }

      // 빈 위치 찾기
      while (occupied.has(targetPos) || positions.includes(targetPos)) {
        targetPos++;
      }

      positions.push(targetPos);
      occupied.add(targetPos);
    }

    return positions;
  }
}

// ==================== 팩토리 함수 ====================

/**
 * 스킬 레벨 AI 생성
 */
export function createSkillLevelAI(level: SkillLevel = 'intermediate'): SkillLevelAI {
  return new SkillLevelAI(level);
}

/**
 * 스킬 레벨 설정 가져오기
 */
export function getSkillLevelConfig(level: SkillLevel): SkillLevelConfig {
  return { ...SKILL_CONFIGS[level] };
}

/**
 * 모든 스킬 레벨 목록
 */
export function getAllSkillLevels(): SkillLevel[] {
  return ['beginner', 'intermediate', 'advanced', 'optimal'];
}
