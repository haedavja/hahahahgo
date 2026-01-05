/**
 * @file dynamic-strategy.ts
 * @description 동적 전략 조정 시스템 - HP/덱 상태에 따른 전략 전환
 *
 * ## 기능
 * - 현재 상태 분석 (HP, 덱 구성, 상징, 아이템)
 * - 상황에 따른 전략 자동 전환
 * - 위기 대응 전략
 * - 승리 조건 기반 전략 조정
 */

import type { RunStrategy, PlayerRunState } from '../game/run-simulator';
import type { Card } from '../../types';

// ==================== 타입 정의 ====================

export interface GameStateAnalysis {
  /** HP 상태 */
  hpStatus: 'critical' | 'low' | 'medium' | 'high' | 'full';
  /** HP 비율 (0-1) */
  hpRatio: number;
  /** 덱 크기 */
  deckSize: number;
  /** 덱 상태 */
  deckStatus: 'too_small' | 'optimal' | 'bloated';
  /** 공격 카드 비율 */
  attackRatio: number;
  /** 방어 카드 비율 */
  defenseRatio: number;
  /** 골드 상태 */
  goldStatus: 'poor' | 'moderate' | 'rich';
  /** 상징 개수 */
  relicCount: number;
  /** 강화된 카드 수 */
  upgradedCardCount: number;
  /** 아이템 개수 */
  itemCount: number;
  /** 현재 레이어 (진행도) */
  currentLayer: number;
  /** 총 레이어 수 */
  totalLayers: number;
  /** 진행 비율 */
  progressRatio: number;
}

export interface StrategyRecommendation {
  /** 추천 전략 */
  strategy: RunStrategy;
  /** 추천 이유 */
  reasons: string[];
  /** 전략 신뢰도 (0-100) */
  confidence: number;
  /** 세부 조정 */
  adjustments: StrategyAdjustments;
}

export interface StrategyAdjustments {
  /** 공격 성향 (0-1) */
  aggressiveness: number;
  /** 리스크 허용도 (0-1) */
  riskTolerance: number;
  /** 자원 보존 성향 (0-1) */
  resourceConservation: number;
  /** 카드 획득 우선순위 */
  cardPriority: 'attack' | 'defense' | 'utility' | 'balanced';
  /** 상점 구매 우선순위 */
  shopPriority: 'cards' | 'relics' | 'items' | 'heal' | 'none';
  /** 휴식 시 행동 */
  restAction: 'heal' | 'upgrade' | 'conditional';
  /** 엘리트 회피 여부 */
  avoidElites: boolean;
  /** 이벤트 선호도 */
  preferEvents: boolean;
}

export interface StrategyTransition {
  from: RunStrategy;
  to: RunStrategy;
  trigger: string;
  timestamp: number;
}

// ==================== 상수 ====================

const HP_THRESHOLDS = {
  critical: 0.2,
  low: 0.4,
  medium: 0.6,
  high: 0.8,
};

const DECK_SIZE_THRESHOLDS = {
  tooSmall: 8,
  optimal: { min: 10, max: 18 },
  bloated: 22,
};

const GOLD_THRESHOLDS = {
  poor: 30,
  rich: 150,
};

// ==================== 동적 전략 클래스 ====================

export class DynamicStrategyManager {
  private cardLibrary: Record<string, Card>;
  private transitionHistory: StrategyTransition[] = [];
  private currentStrategy: RunStrategy = 'balanced';

  constructor(cardLibrary: Record<string, Card> = {}) {
    this.cardLibrary = cardLibrary;
  }

  /**
   * 카드 라이브러리 설정
   */
  setCardLibrary(cards: Record<string, Card>): void {
    this.cardLibrary = cards;
  }

  /**
   * 현재 게임 상태 분석
   */
  analyzeGameState(
    player: PlayerRunState,
    currentLayer: number,
    totalLayers: number = 11
  ): GameStateAnalysis {
    // HP 상태
    const hpRatio = player.hp / player.maxHp;
    let hpStatus: GameStateAnalysis['hpStatus'] = 'full';
    if (hpRatio <= HP_THRESHOLDS.critical) hpStatus = 'critical';
    else if (hpRatio <= HP_THRESHOLDS.low) hpStatus = 'low';
    else if (hpRatio <= HP_THRESHOLDS.medium) hpStatus = 'medium';
    else if (hpRatio <= HP_THRESHOLDS.high) hpStatus = 'high';

    // 덱 상태
    const deckSize = player.deck.length;
    let deckStatus: GameStateAnalysis['deckStatus'] = 'optimal';
    if (deckSize < DECK_SIZE_THRESHOLDS.tooSmall) deckStatus = 'too_small';
    else if (deckSize > DECK_SIZE_THRESHOLDS.bloated) deckStatus = 'bloated';

    // 카드 타입 비율
    let attackCount = 0;
    let defenseCount = 0;
    for (const cardId of player.deck) {
      const card = this.cardLibrary[cardId];
      if (card) {
        if (card.type === 'attack') attackCount++;
        else if (card.type === 'defense' || card.type === 'reaction') defenseCount++;
      }
    }
    const attackRatio = deckSize > 0 ? attackCount / deckSize : 0;
    const defenseRatio = deckSize > 0 ? defenseCount / deckSize : 0;

    // 골드 상태
    let goldStatus: GameStateAnalysis['goldStatus'] = 'moderate';
    if (player.gold < GOLD_THRESHOLDS.poor) goldStatus = 'poor';
    else if (player.gold >= GOLD_THRESHOLDS.rich) goldStatus = 'rich';

    // 진행도
    const progressRatio = currentLayer / totalLayers;

    return {
      hpStatus,
      hpRatio,
      deckSize,
      deckStatus,
      attackRatio,
      defenseRatio,
      goldStatus,
      relicCount: player.relics.length,
      upgradedCardCount: player.upgradedCards.length,
      itemCount: player.items.length,
      currentLayer,
      totalLayers,
      progressRatio,
    };
  }

  /**
   * 전략 추천
   */
  recommendStrategy(
    state: GameStateAnalysis,
    currentStrategy: RunStrategy
  ): StrategyRecommendation {
    const reasons: string[] = [];
    let confidence = 50;

    // 기본 조정값
    const adjustments: StrategyAdjustments = {
      aggressiveness: 0.5,
      riskTolerance: 0.5,
      resourceConservation: 0.5,
      cardPriority: 'balanced',
      shopPriority: 'cards',
      restAction: 'conditional',
      avoidElites: false,
      preferEvents: true,
    };

    let recommendedStrategy: RunStrategy = currentStrategy;

    // === HP 기반 전략 ===
    if (state.hpStatus === 'critical') {
      recommendedStrategy = 'defensive';
      adjustments.aggressiveness = 0.2;
      adjustments.riskTolerance = 0.1;
      adjustments.avoidElites = true;
      adjustments.shopPriority = 'heal';
      adjustments.restAction = 'heal';
      reasons.push('HP 위급: 방어 전략 전환');
      confidence = 90;
    } else if (state.hpStatus === 'low') {
      if (currentStrategy === 'aggressive') {
        recommendedStrategy = 'balanced';
        reasons.push('HP 낮음: 공격에서 균형으로 전환');
      }
      adjustments.aggressiveness = 0.4;
      adjustments.riskTolerance = 0.3;
      adjustments.restAction = 'heal';
      confidence = 75;
    } else if (state.hpStatus === 'full' || state.hpStatus === 'high') {
      // HP 충분하면 공격적 가능
      if (state.progressRatio > 0.5) {
        adjustments.aggressiveness = 0.7;
        adjustments.riskTolerance = 0.6;
        adjustments.restAction = 'upgrade';
        reasons.push('HP 충분: 공격적 플레이 가능');
      }
      confidence = 60;
    }

    // === 덱 상태 기반 전략 ===
    if (state.deckStatus === 'too_small') {
      adjustments.cardPriority = state.attackRatio < 0.3 ? 'attack' : 'balanced';
      adjustments.shopPriority = 'cards';
      reasons.push('덱 부족: 카드 획득 우선');
    } else if (state.deckStatus === 'bloated') {
      adjustments.cardPriority = 'balanced'; // 추가 획득 자제
      adjustments.preferEvents = true; // 카드 제거 이벤트 노림
      reasons.push('덱 비대: 카드 획득 자제');
    }

    // === 덱 균형 기반 전략 ===
    if (state.attackRatio > 0.7) {
      adjustments.cardPriority = 'defense';
      reasons.push('공격 과다: 방어 카드 필요');
    } else if (state.defenseRatio > 0.5) {
      adjustments.cardPriority = 'attack';
      reasons.push('방어 과다: 공격 카드 필요');
    }

    // === 진행도 기반 전략 ===
    if (state.progressRatio < 0.3) {
      // 초반: 덱 빌딩 중요
      adjustments.shopPriority = 'cards';
      adjustments.resourceConservation = 0.6;
      reasons.push('초반: 덱 빌딩 우선');
    } else if (state.progressRatio > 0.7) {
      // 후반: 보스전 대비
      if (state.hpStatus !== 'critical' && state.hpStatus !== 'low') {
        recommendedStrategy = 'aggressive';
        adjustments.aggressiveness = 0.8;
        adjustments.avoidElites = false;
        reasons.push('후반: 보스전 대비 공격적');
      }
      adjustments.shopPriority = 'relics';
      confidence = 80;
    }

    // === 자원 상태 기반 ===
    if (state.goldStatus === 'poor') {
      adjustments.resourceConservation = 0.8;
      reasons.push('골드 부족: 자원 보존');
    } else if (state.goldStatus === 'rich') {
      adjustments.resourceConservation = 0.3;
      adjustments.shopPriority = 'relics';
      reasons.push('골드 풍부: 투자 가능');
    }

    // === 상징/강화 상태 ===
    if (state.relicCount >= 3 && state.upgradedCardCount >= 3) {
      // 잘 성장한 상태: 공격적 가능
      adjustments.aggressiveness = Math.max(adjustments.aggressiveness, 0.6);
      reasons.push('성장 양호: 공격적 플레이 권장');
    }

    return {
      strategy: recommendedStrategy,
      reasons,
      confidence,
      adjustments,
    };
  }

  /**
   * 전략 전환 실행
   */
  transitionStrategy(
    from: RunStrategy,
    to: RunStrategy,
    trigger: string
  ): void {
    if (from !== to) {
      this.transitionHistory.push({
        from,
        to,
        trigger,
        timestamp: Date.now(),
      });
      this.currentStrategy = to;
    }
  }

  /**
   * 현재 전략 가져오기
   */
  getCurrentStrategy(): RunStrategy {
    return this.currentStrategy;
  }

  /**
   * 전환 이력 가져오기
   */
  getTransitionHistory(): StrategyTransition[] {
    return [...this.transitionHistory];
  }

  /**
   * 전투 전 전략 조정
   */
  adjustForBattle(
    state: GameStateAnalysis,
    isElite: boolean,
    isBoss: boolean
  ): StrategyAdjustments {
    const baseRecommendation = this.recommendStrategy(state, this.currentStrategy);
    const adjustments = { ...baseRecommendation.adjustments };

    // 엘리트전
    if (isElite) {
      if (state.hpStatus === 'critical' || state.hpStatus === 'low') {
        adjustments.aggressiveness = 0.3;
        adjustments.riskTolerance = 0.2;
      } else {
        adjustments.aggressiveness = 0.6;
        adjustments.riskTolerance = 0.5;
      }
    }

    // 보스전
    if (isBoss) {
      // 보스전은 전력투구
      adjustments.aggressiveness = 0.9;
      adjustments.riskTolerance = 0.7;
      adjustments.resourceConservation = 0.1; // 아이템 아끼지 않음
    }

    return adjustments;
  }

  /**
   * 상점 방문 시 전략 조정
   */
  adjustForShop(state: GameStateAnalysis): {
    priorities: Array<'heal' | 'cards' | 'relics' | 'items'>;
    maxSpend: number;
  } {
    const priorities: Array<'heal' | 'cards' | 'relics' | 'items'> = [];
    let maxSpend = state.goldStatus === 'rich' ? 999 : (state.goldStatus === 'moderate' ? 100 : 50);

    // HP 낮으면 힐 우선
    if (state.hpRatio < 0.5) {
      priorities.push('heal');
    }

    // 덱 상태에 따른 카드 우선순위
    if (state.deckStatus === 'too_small') {
      priorities.push('cards');
    }

    // 상징이 적으면 우선
    if (state.relicCount < 2) {
      priorities.push('relics');
    }

    // 아이템이 없으면 추가
    if (state.itemCount === 0) {
      priorities.push('items');
    }

    // 나머지 채우기
    if (!priorities.includes('cards')) priorities.push('cards');
    if (!priorities.includes('relics')) priorities.push('relics');
    if (!priorities.includes('items')) priorities.push('items');

    // HP 높고 힐이 우선순위에 없으면 제거
    if (state.hpRatio > 0.7 && priorities[0] === 'heal') {
      priorities.shift();
    }

    return { priorities, maxSpend };
  }

  /**
   * 휴식 노드 결정
   */
  decideRestAction(state: GameStateAnalysis): 'heal' | 'upgrade' {
    // HP 40% 이하면 무조건 힐
    if (state.hpRatio < 0.4) {
      return 'heal';
    }

    // HP 70% 이상이고 강화 가능하면 강화
    if (state.hpRatio > 0.7 && state.upgradedCardCount < state.deckSize * 0.5) {
      return 'upgrade';
    }

    // 보스전 직전(80% 이상 진행)이면 상태에 따라
    if (state.progressRatio > 0.8) {
      return state.hpRatio < 0.6 ? 'heal' : 'upgrade';
    }

    // 중반이고 HP 적당하면 강화
    if (state.progressRatio > 0.4 && state.hpRatio > 0.5) {
      return 'upgrade';
    }

    return 'heal';
  }

  /**
   * 위기 상황 감지
   */
  detectCrisis(state: GameStateAnalysis): {
    isCrisis: boolean;
    severity: 'none' | 'warning' | 'danger' | 'critical';
    actions: string[];
  } {
    const actions: string[] = [];
    let severity: 'none' | 'warning' | 'danger' | 'critical' = 'none';

    // HP 기반 위기
    if (state.hpStatus === 'critical') {
      severity = 'critical';
      actions.push('즉시 힐 필요');
      actions.push('엘리트 회피');
      actions.push('휴식 노드 우선');
    } else if (state.hpStatus === 'low') {
      severity = 'danger';
      actions.push('힐 아이템 사용 고려');
      actions.push('안전한 경로 선택');
    }

    // 덱 문제
    if (state.deckStatus === 'too_small' && state.progressRatio > 0.3) {
      if (severity === 'none') severity = 'warning';
      actions.push('카드 획득 필요');
    } else if (state.deckStatus === 'bloated') {
      if (severity === 'none') severity = 'warning';
      actions.push('카드 제거 고려');
    }

    // 균형 문제
    if (state.attackRatio < 0.2 || state.attackRatio > 0.8) {
      if (severity === 'none') severity = 'warning';
      actions.push('덱 균형 조정 필요');
    }

    return {
      isCrisis: severity !== 'none',
      severity,
      actions,
    };
  }
}

// ==================== 팩토리 함수 ====================

export function createDynamicStrategyManager(
  cardLibrary?: Record<string, Card>
): DynamicStrategyManager {
  return new DynamicStrategyManager(cardLibrary);
}

/**
 * 빠른 전략 결정 (간단한 상황용)
 */
export function quickStrategyDecision(
  hpRatio: number,
  progressRatio: number,
  deckSize: number
): RunStrategy {
  // HP 위급
  if (hpRatio < 0.25) return 'defensive';

  // 후반 + HP 충분
  if (progressRatio > 0.7 && hpRatio > 0.5) return 'aggressive';

  // 초반 + HP 충분
  if (progressRatio < 0.3 && hpRatio > 0.6) return 'balanced';

  // 덱이 비대
  if (deckSize > 22) return 'speedrun';

  return 'balanced';
}
