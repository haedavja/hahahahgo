/**
 * @file trait-synergy-processor.ts
 * @description 특성 시너지 처리 시스템
 *
 * 카드 특성(Traits)들의 상호작용과 시너지 효과를 전투에 반영합니다.
 * - 연계(chain) → 후속(followup) → 마무리(finisher)
 * - 강골/파괴자/살육/절정 공격력 증폭
 * - 협동(cooperation) 콤보 보너스
 * - 단련(training) 힘 축적
 * - 검투/사격 전문화 보너스
 */

import type { GameCard, GameBattleState, TokenState } from './game-types';
import { addToken, getTokenStacks } from './token-system';
import { getLogger } from './logger';

const log = getLogger('TraitSynergyProcessor');

// ==================== 타입 정의 ====================

export interface TraitSynergyResult {
  /** 피해 배율 */
  damageMultiplier: number;
  /** 방어력 배율 */
  blockMultiplier: number;
  /** 추가 피해 */
  bonusDamage: number;
  /** 추가 방어 */
  bonusBlock: number;
  /** 속도 수정 */
  speedModifier: number;
  /** 적용된 토큰 */
  appliedTokens: { id: string; stacks: number; target: 'self' | 'enemy' }[];
  /** 시너지 설명 */
  synergies: string[];
  /** 추가 히트 수 */
  extraHits: number;
  /** 에테르 보너스 */
  etherBonus: number;
}

export interface TraitContext {
  /** 현재 턴에 사용된 카드들 */
  cardsPlayedThisTurn: GameCard[];
  /** 현재 연계 상태 */
  chainActive: boolean;
  /** 연계 길이 */
  chainLength: number;
  /** 교차 여부 */
  crossed: boolean;
  /** 콤보 랭크 */
  comboRank: number;
  /** HP 비율 */
  hpRatio: number;
  /** 적 HP 비율 */
  enemyHpRatio: number;
}

// ==================== 특성 효과 정의 ====================

/** 공격력 증폭 특성 */
const DAMAGE_MULTIPLIER_TRAITS: Record<string, number> = {
  strongbone: 1.25,    // 강골: 25% 증폭
  destroyer: 1.5,      // 파괴자: 50% 증폭
  slaughter: 1.75,     // 살육: 75% 증폭
  pinnacle: 2.5,       // 절정: 150% 증폭
  weakbone: 0.8,       // 약골: 20% 감소
};

/** 방어력 증폭 특성 */
const BLOCK_MULTIPLIER_TRAITS: Record<string, number> = {
  fortress: 1.25,      // 요새: 25% 증폭
  bastion: 1.5,        // 보루: 50% 증폭
  ironwall: 2.0,       // 철벽: 100% 증폭
  strongbone: 1.25,    // 강골: 25% 증폭 (방어에도 적용)
  weakbone: 0.8,       // 약골: 20% 감소 (방어에도 적용)
};

/** 속도 수정 특성 */
const SPEED_MODIFIER_TRAITS: Record<string, number> = {
  swift: -2,           // 신속: 2 빠름
  slow: 3,             // 느림: 3 느림
  instant: -999,       // 즉발: 최우선
};

// ==================== 시너지 프로세서 ====================

export class TraitSynergyProcessor {
  /**
   * 카드의 특성 시너지 계산
   */
  processTraitSynergies(
    card: GameCard,
    state: GameBattleState,
    actor: 'player' | 'enemy',
    context: TraitContext
  ): TraitSynergyResult {
    const result: TraitSynergyResult = {
      damageMultiplier: 1.0,
      blockMultiplier: 1.0,
      bonusDamage: 0,
      bonusBlock: 0,
      speedModifier: 0,
      appliedTokens: [],
      synergies: [],
      extraHits: 0,
      etherBonus: 0,
    };

    if (!card.traits || card.traits.length === 0) {
      return result;
    }

    const actorState = actor === 'player' ? state.player : state.enemy;

    for (const trait of card.traits) {
      this.processIndividualTrait(trait, card, result, context, actorState as { tokens: TokenState; strength?: number; hp: number; maxHp: number });
    }

    // 다중 특성 시너지 처리
    this.processMultiTraitSynergies(card.traits, result, context);

    return result;
  }

  /**
   * 개별 특성 처리
   */
  private processIndividualTrait(
    trait: string,
    card: GameCard,
    result: TraitSynergyResult,
    context: TraitContext,
    actorState: { tokens: TokenState | TokenState[]; strength?: number; hp: number; maxHp: number }
  ): void {
    // 공격력 증폭 특성
    if (DAMAGE_MULTIPLIER_TRAITS[trait]) {
      result.damageMultiplier *= DAMAGE_MULTIPLIER_TRAITS[trait];
      result.synergies.push(`${trait}: 공격력 x${DAMAGE_MULTIPLIER_TRAITS[trait]}`);
    }

    // 방어력 증폭 특성
    if (BLOCK_MULTIPLIER_TRAITS[trait]) {
      result.blockMultiplier *= BLOCK_MULTIPLIER_TRAITS[trait];
      result.synergies.push(`${trait}: 방어력 x${BLOCK_MULTIPLIER_TRAITS[trait]}`);
    }

    // 속도 수정 특성
    if (SPEED_MODIFIER_TRAITS[trait]) {
      result.speedModifier += SPEED_MODIFIER_TRAITS[trait];
      result.synergies.push(`${trait}: 속도 ${SPEED_MODIFIER_TRAITS[trait] > 0 ? '+' : ''}${SPEED_MODIFIER_TRAITS[trait]}`);
    }

    // 특수 특성 처리
    switch (trait) {
      case 'chain':
        // 연계 시작: 다음 후속 카드에 보너스
        result.appliedTokens.push({ id: 'chain_ready', stacks: 1, target: 'self' });
        result.synergies.push('연계 시작');
        break;

      case 'followup':
        // 후속: 연계 상태면 보너스
        if (context.chainActive) {
          result.damageMultiplier *= 1.3;
          result.synergies.push('후속 연계: 공격력 x1.3');
        }
        break;

      case 'finisher':
        // 마무리: 연계 길이에 따른 보너스
        if (context.chainActive) {
          const finisherBonus = 1 + (context.chainLength * 0.25);
          result.damageMultiplier *= finisherBonus;
          result.synergies.push(`마무리 연계(${context.chainLength}): 공격력 x${finisherBonus.toFixed(2)}`);
          result.etherBonus += context.chainLength * 5;
        }
        break;

      case 'training':
        // 단련: 사용할 때마다 힘 +1
        result.appliedTokens.push({ id: 'strength', stacks: 1, target: 'self' });
        result.synergies.push('단련: 힘 +1');
        break;

      case 'fencing_master':
        // 검투 대가: 검술 카드 +20% 피해
        if (card.cardCategory === 'fencing') {
          result.damageMultiplier *= 1.2;
          result.synergies.push('검투 대가: 검술 공격력 x1.2');
        }
        break;

      case 'gun_master':
        // 사격 대가: 총기 카드 +20% 피해
        if (card.cardCategory === 'gun') {
          result.damageMultiplier *= 1.2;
          result.synergies.push('사격 대가: 총기 공격력 x1.2');
        }
        break;

      case 'cooperation':
        // 협동: 같은 코스트 카드가 많을수록 보너스
        const sameActionCostCards = context.cardsPlayedThisTurn.filter(
          c => c.actionCost === card.actionCost
        ).length;
        if (sameActionCostCards > 0) {
          result.damageMultiplier *= 1 + (sameActionCostCards * 0.15);
          result.synergies.push(`협동(${sameActionCostCards + 1}장): 공격력 +${sameActionCostCards * 15}%`);
        }
        break;

      case 'combo':
        // 콤보: 포커 콤보 랭크에 따른 보너스
        if (context.comboRank > 0) {
          const comboBonus = 1 + (context.comboRank * 0.1);
          result.damageMultiplier *= comboBonus;
          result.synergies.push(`콤보(랭크 ${context.comboRank}): 공격력 x${comboBonus.toFixed(2)}`);
        }
        break;

      case 'cross':
        // 교차 보너스
        if (context.crossed) {
          result.damageMultiplier *= 1.5;
          result.synergies.push('교차: 공격력 x1.5');
        }
        break;

      case 'counter':
        // 반격: 피격 시 반격
        result.appliedTokens.push({ id: 'counter', stacks: 1, target: 'self' });
        result.synergies.push('반격 준비');
        break;

      case 'counterShot':
        // 대응사격: 피격 시 사격 반격
        result.appliedTokens.push({ id: 'counterShot', stacks: 1, target: 'self' });
        result.synergies.push('대응사격 준비');
        break;

      case 'multihit':
        // 다중 공격: 추가 히트
        result.extraHits += 1;
        result.synergies.push('다중 공격: 추가 히트');
        break;

      case 'double_edge':
        // 양날의 검: 피해 +50%, 자해 25%
        result.damageMultiplier *= 1.5;
        result.synergies.push('양날의 검: 공격력 x1.5 (자해)');
        break;

      case 'last_stand':
        // 최후의 저항: HP 30% 이하면 피해 2배
        if (context.hpRatio <= 0.3) {
          result.damageMultiplier *= 2.0;
          result.synergies.push('최후의 저항: 공격력 x2.0');
        }
        break;

      case 'executioner':
        // 처형자: 적 HP 30% 이하면 피해 2배
        if (context.enemyHpRatio <= 0.3) {
          result.damageMultiplier *= 2.0;
          result.synergies.push('처형자: 공격력 x2.0');
        }
        break;

      case 'vampiric':
        // 흡혈: 피해의 20% 회복
        result.appliedTokens.push({ id: 'lifesteal', stacks: 20, target: 'self' });
        result.synergies.push('흡혈: 피해의 20% 회복');
        break;

      case 'piercing':
        // 관통: 방어력 무시
        result.synergies.push('관통: 방어력 무시');
        break;

      case 'shield_breaker':
        // 방어 파괴: 추가 방어력 피해
        result.bonusDamage += 10;
        result.synergies.push('방어 파괴: +10 피해');
        break;

      case 'agile':
        // 민첩: 방어력 +3
        result.bonusBlock += 3;
        result.synergies.push('민첩: 방어력 +3');
        break;

      case 'sturdy':
        // 튼튼함: 방어력 +5
        result.bonusBlock += 5;
        result.synergies.push('튼튼함: 방어력 +5');
        break;

      case 'crush':
        // 분쇄: 상대 방어력에 2배 피해
        result.appliedTokens.push({ id: 'crush', stacks: 1, target: 'self' });
        result.synergies.push('분쇄: 상대 방어력에 2배 피해');
        break;

      case 'mastery':
        // 숙련: 사용할 때마다 속도 -2 (최소 1)
        result.speedModifier -= 2;
        result.synergies.push('숙련: 속도 -2');
        break;

      case 'knockback':
        // 넉백: 상대 타임라인 3 뒤로 밀기
        result.appliedTokens.push({ id: 'knockback', stacks: 3, target: 'enemy' });
        result.synergies.push('넉백: 상대 타임라인 +3');
        break;

      case 'advance':
        // 앞당김: 내 타임라인 3 앞당김
        result.speedModifier -= 3;
        result.synergies.push('앞당김: 타임라인 -3');
        break;

      case 'stun':
        // 기절: 타임라인 5범위내 상대 카드 파괴
        result.appliedTokens.push({ id: 'stun', stacks: 5, target: 'enemy' });
        result.synergies.push('기절: 5범위내 적 카드 파괴');
        break;

      case 'outcast':
        // 소외: 조합 제외, 행동력 -1
        result.synergies.push('소외: 콤보 보너스 제외');
        break;

      case 'boredom':
        // 싫증: 사용시마다 속도 +2
        result.speedModifier += 2;
        result.synergies.push('싫증: 속도 +2');
        break;

      case 'vanish':
        // 소멸: 사용 후 게임에서 제거
        result.appliedTokens.push({ id: 'vanish', stacks: 1, target: 'self' });
        result.synergies.push('소멸: 사용 후 제거됨');
        break;

      case 'last':
        // 마지막: 타임라인 마지막에 발동
        result.speedModifier = 999; // 최후에 발동
        result.synergies.push('마지막: 타임라인 최후에 발동');
        break;

      case 'robber':
        // 날강도: 사용시 10골드 소실
        result.appliedTokens.push({ id: 'robber', stacks: 10, target: 'self' });
        result.synergies.push('날강도: 10골드 소실');
        break;

      case 'general':
        // 장군: 다음턴 부특기 등장률 25% 증가
        result.appliedTokens.push({ id: 'general', stacks: 25, target: 'self' });
        result.synergies.push('장군: 다음턴 부특기 등장률 +25%');
        break;

      case 'leisure':
        // 여유: 배치 유연성 (시뮬레이션에서는 속도 범위 확장으로 처리)
        result.synergies.push('여유: 유연한 배치');
        break;

      case 'strain':
        // 무리: 행동력으로 속도 앞당김 (시뮬레이션에서는 속도 -1 보너스로 간략화)
        result.speedModifier -= 1;
        result.synergies.push('무리: 행동력으로 가속 가능');
        break;
    }
  }

  /**
   * 다중 특성 시너지 처리
   */
  private processMultiTraitSynergies(
    traits: string[],
    result: TraitSynergyResult,
    context: TraitContext
  ): void {
    const traitSet = new Set(traits);

    // 연계 + 마무리 시너지
    if (traitSet.has('chain') && traitSet.has('finisher')) {
      result.etherBonus += 10;
      result.synergies.push('연계+마무리 시너지: 에테르 +10');
    }

    // 강골 + 파괴자 시너지
    if (traitSet.has('strongbone') && traitSet.has('destroyer')) {
      result.damageMultiplier *= 1.1;
      result.synergies.push('강골+파괴자 시너지: 공격력 x1.1');
    }

    // 검술 + 사격 하이브리드
    if (traitSet.has('fencing_master') && traitSet.has('gun_master')) {
      result.extraHits += 1;
      result.synergies.push('하이브리드 마스터: 추가 히트');
    }

    // 교차 + 반격 시너지
    if (traitSet.has('cross') && traitSet.has('counter') && context.crossed) {
      result.damageMultiplier *= 1.2;
      result.synergies.push('교차+반격 시너지: 공격력 x1.2');
    }

    // 최후의 저항 + 흡혈 시너지
    if (traitSet.has('last_stand') && traitSet.has('vampiric') && context.hpRatio <= 0.3) {
      result.appliedTokens.push({ id: 'lifesteal', stacks: 30, target: 'self' });
      result.synergies.push('최후의 저항+흡혈 시너지: 흡혈 +30%');
    }
  }

  /**
   * 덱 전체의 특성 시너지 점수 계산
   */
  calculateDeckSynergyScore(deck: GameCard[]): {
    score: number;
    synergies: string[];
    recommendations: string[];
  } {
    const traitCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    // 특성 및 카테고리 카운트
    for (const card of deck) {
      if (card.traits) {
        for (const trait of card.traits) {
          traitCounts[trait] = (traitCounts[trait] || 0) + 1;
        }
      }
      if (card.cardCategory) {
        categoryCounts[card.cardCategory] = (categoryCounts[card.cardCategory] || 0) + 1;
      }
    }

    let score = 0;
    const synergies: string[] = [];
    const recommendations: string[] = [];

    // 연계 시너지 체크
    const chainCount = traitCounts['chain'] || 0;
    const followupCount = traitCounts['followup'] || 0;
    const finisherCount = traitCounts['finisher'] || 0;

    if (chainCount > 0 && followupCount > 0) {
      score += chainCount * followupCount * 10;
      synergies.push(`연계-후속 시너지: ${chainCount}x${followupCount} = +${chainCount * followupCount * 10}점`);
    }
    if (chainCount > 0 && finisherCount > 0) {
      score += chainCount * finisherCount * 15;
      synergies.push(`연계-마무리 시너지: ${chainCount}x${finisherCount} = +${chainCount * finisherCount * 15}점`);
    }
    if (chainCount > 0 && (followupCount === 0 && finisherCount === 0)) {
      recommendations.push('연계 카드가 있지만 후속/마무리 카드가 없습니다.');
    }

    // 카테고리 집중도 보너스
    const fencingCount = categoryCounts['fencing'] || 0;
    const gunCount = categoryCounts['gun'] || 0;

    if (fencingCount >= 5) {
      score += fencingCount * 5;
      synergies.push(`검술 집중: ${fencingCount}장 = +${fencingCount * 5}점`);
    }
    if (gunCount >= 5) {
      score += gunCount * 5;
      synergies.push(`사격 집중: ${gunCount}장 = +${gunCount * 5}점`);
    }

    // 협동 특성 시너지
    const cooperationCount = traitCounts['cooperation'] || 0;
    if (cooperationCount >= 3) {
      score += cooperationCount * 8;
      synergies.push(`협동 시너지: ${cooperationCount}장 = +${cooperationCount * 8}점`);
    }

    // 공격력 증폭 특성 조합
    const attackAmplifiers = ['strongbone', 'destroyer', 'slaughter', 'pinnacle'];
    const ampCount = attackAmplifiers.reduce((sum, t) => sum + (traitCounts[t] || 0), 0);
    if (ampCount >= 2) {
      score += ampCount * 12;
      synergies.push(`공격 증폭 스택: ${ampCount}개 = +${ampCount * 12}점`);
    }

    return { score, synergies, recommendations };
  }
}

// ==================== 팩토리 함수 ====================

export function createTraitSynergyProcessor(): TraitSynergyProcessor {
  return new TraitSynergyProcessor();
}

/**
 * 간편 특성 시너지 계산
 */
export function calculateTraitSynergies(
  card: GameCard,
  state: GameBattleState,
  actor: 'player' | 'enemy',
  context: Partial<TraitContext> = {}
): TraitSynergyResult {
  const processor = new TraitSynergyProcessor();
  const fullContext: TraitContext = {
    cardsPlayedThisTurn: context.cardsPlayedThisTurn || [],
    chainActive: context.chainActive || false,
    chainLength: context.chainLength || 0,
    crossed: context.crossed || false,
    comboRank: context.comboRank || 0,
    hpRatio: context.hpRatio || 1,
    enemyHpRatio: context.enemyHpRatio || 1,
  };
  return processor.processTraitSynergies(card, state, actor, fullContext);
}

/**
 * 덱 시너지 점수 계산
 */
export function calculateDeckSynergy(deck: GameCard[]): {
  score: number;
  synergies: string[];
  recommendations: string[];
} {
  const processor = new TraitSynergyProcessor();
  return processor.calculateDeckSynergyScore(deck);
}
