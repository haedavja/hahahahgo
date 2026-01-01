/**
 * @file combo-ether-system.ts
 * @description 포커 콤보 감지 및 에테르 계산 시스템
 *
 * ## 포커 콤보 시스템
 * 공유 라이브러리 (/lib/comboDetection.ts)를 기반으로 확장합니다.
 *
 * ## 에테르 시스템
 * - 기본 획득량: 카드 희귀도별 (common: 10, rare: 25, special: 100, legendary: 500)
 * - 조합 배율: 위 콤보에 따른 배율
 * - 액션코스트 보너스: 2코스트 이상 카드에 (N-1)*0.5x 추가
 * - 디플레이션: 같은 조합 반복 시 80%씩 감소
 * - 버스트: 100 에테르 도달 시 추가 효과
 */

import type { GameCard, GameBattleState, PlayerState } from './game-types';
import {
  detectPokerCombo as detectPokerComboBase,
  detectPokerComboDetailed,
  getComboMultiplier,
  COMBO_MULTIPLIERS,
  COMBO_INFO,
  COMBO_PRIORITIES,
  type ComboCard as BaseComboCard,
  type ComboResult as BaseComboResult,
  type ComboCalculation,
  type CardRarity,
} from '../../lib/comboDetection';

// ==================== 타입 정의 ====================

export interface ComboCard extends BaseComboCard {
  /** 카드 카테고리: fencing, gun, special */
  category?: string;
}

export type { CardRarity, ComboCalculation };

export interface ComboResult {
  name: string;
  multiplier: number;
  rank: number;
  bonusKeys: Set<number> | null;
  description: string;
}

export interface EtherGainResult {
  baseGain: number;
  comboMultiplier: number;
  actionCostBonus: number;
  traitSynergyBonus: number;
  deflationMultiplier: number;
  finalGain: number;
  comboName: string;
  breakdown: string[];
}

// Re-export shared constants
export { COMBO_MULTIPLIERS, COMBO_INFO, COMBO_PRIORITIES };

/** 희귀도별 에테르 획득량 */
export const ETHER_BY_RARITY: Record<CardRarity, number> = {
  common: 10,
  rare: 25,
  special: 100,
  legendary: 500,
};

/** 에테르 임계치 (버스트 발동) */
export const ETHER_THRESHOLD = 100;

/** 디플레이션 감소율 */
export const DEFLATION_RATE = 0.8;

// ==================== 유틸리티 함수 ====================

/**
 * 카드가 소외(outcast) 특성을 가지고 있는지 확인
 */
function hasOutcastTrait(card: ComboCard): boolean {
  return card.traits?.includes('outcast') ?? false;
}

/**
 * 카드 희귀도 추정 (traits 기반)
 */
function getCardRarity(card: ComboCard): CardRarity {
  if (card.rarity) return card.rarity;

  // traits 기반 추정
  if (card.traits) {
    const weightSum = card.traits.reduce((sum, trait) => {
      // 특성 가중치 (높을수록 희귀)
      if (['pinnacle', 'slaughter'].includes(trait)) return sum + 5;
      if (['destroyer', 'stun'].includes(trait)) return sum + 3;
      if (['swift', 'strongbone', 'chain'].includes(trait)) return sum + 1;
      return sum;
    }, 0);

    if (weightSum >= 5) return 'legendary';
    if (weightSum >= 3) return 'special';
    if (weightSum >= 1) return 'rare';
  }

  return 'common';
}

// ==================== 포커 콤보 감지 ====================

/**
 * 카드 배열을 분석하여 유효 카드, 빈도, 타입/카테고리 정보 추출
 */
function analyzeCards(cards: ComboCard[]): {
  validCards: ComboCard[];
  freq: Map<number, number>;
  typeCount: Map<string, number>;
  categoryCount: Map<string, number>;
  traitCount: Map<string, number>;
} {
  const validCards: ComboCard[] = [];
  const freq = new Map<number, number>();
  const typeCount = new Map<string, number>();
  const categoryCount = new Map<string, number>();
  const traitCount = new Map<string, number>();

  for (const card of cards) {
    // 소외 특성과 유령 카드는 조합에서 제외
    if (hasOutcastTrait(card) || card.isGhost) continue;

    validCards.push(card);

    // actionCost 빈도 집계
    const cost = card.actionCost || 1;
    freq.set(cost, (freq.get(cost) || 0) + 1);

    // 타입별 집계 (플러쉬 판정용)
    const type = card.type || 'general';
    typeCount.set(type, (typeCount.get(type) || 0) + 1);

    // 카테고리별 집계 (fencing/gun/special 플러쉬)
    const category = card.category || 'general';
    categoryCount.set(category, (categoryCount.get(category) || 0) + 1);

    // 특성별 집계 (시너지 보너스용)
    if (card.traits) {
      for (const trait of card.traits) {
        traitCount.set(trait, (traitCount.get(trait) || 0) + 1);
      }
    }
  }

  return { validCards, freq, typeCount, categoryCount, traitCount };
}

/**
 * 포커 조합 감지
 * @param cards 카드 배열 (GameCard 또는 ComboCard)
 * @returns 조합 결과
 */
export function detectPokerCombo(cards: (GameCard | ComboCard)[]): ComboResult {
  if (!cards || cards.length === 0) {
    return createComboResult('하이카드', new Set());
  }

  // ComboCard 형식으로 변환
  const comboCards: ComboCard[] = cards.map(c => ({
    id: c.id,
    actionCost: c.actionCost || 1,
    type: c.type || 'general',
    traits: c.traits,
    isGhost: (c as ComboCard).isGhost,
    rarity: (c as ComboCard).rarity,
    category: (c as any).category || inferCategory(c),
  }));

  const { validCards, freq, typeCount, categoryCount, traitCount } = analyzeCards(comboCards);

  // 유효 카드가 없으면 하이카드
  if (validCards.length === 0) {
    return createComboResult('하이카드', new Set());
  }

  // 카드 1장: 하이카드
  if (validCards.length === 1) {
    return createComboResult('하이카드', new Set([validCards[0].actionCost]));
  }

  // 빈도 분석
  const counts = Array.from(freq.values()).sort((a, b) => b - a);
  const has5 = counts[0] >= 5;
  const has4 = counts[0] >= 4;
  const has3 = counts[0] >= 3;
  const has2 = counts[0] >= 2;
  const hasTwoPairs = counts[0] >= 2 && counts[1] >= 2;
  const hasFullHouse = counts[0] >= 3 && counts[1] >= 2;

  // 플러쉬 판정 개선: 타입 또는 카테고리 기준
  // 1. 타입 기반: 같은 타입(attack 또는 defense/general) 4장 이상
  const attackCount = typeCount.get('attack') || 0;
  const defenseCount = (typeCount.get('general') || 0) + (typeCount.get('defense') || 0);
  const isTypeFlush = attackCount >= 4 || defenseCount >= 4;

  // 2. 카테고리 기반: 같은 카테고리(fencing/gun/special) 4장 이상
  const fencingCount = categoryCount.get('fencing') || 0;
  const gunCount = categoryCount.get('gun') || 0;
  const specialCount = categoryCount.get('special') || 0;
  const isCategoryFlush = fencingCount >= 4 || gunCount >= 4 || specialCount >= 4;

  // 둘 중 하나라도 만족하면 플러쉬
  const isFlush = isTypeFlush || isCategoryFlush;

  // 보너스 키 계산 헬퍼
  const getKeysByCount = (n: number): Set<number> => {
    const result = new Set<number>();
    freq.forEach((count, key) => {
      if (count >= n) result.add(key);
    });
    return result;
  };

  // 조합 우선순위: 파이브카드 > 포카드 > 풀하우스 > 플러쉬 > 트리플 > 투페어 > 페어 > 하이카드
  if (has5) return createComboResult('파이브카드', getKeysByCount(5));
  if (has4) return createComboResult('포카드', getKeysByCount(4));
  if (hasFullHouse) {
    const keys = new Set<number>();
    freq.forEach((count, key) => {
      if (count >= 2) keys.add(key);
    });
    return createComboResult('풀하우스', keys);
  }
  if (isFlush) return createComboResult('플러쉬', null);
  if (has3) return createComboResult('트리플', getKeysByCount(3));
  if (hasTwoPairs) return createComboResult('투페어', getKeysByCount(2));
  if (has2) return createComboResult('페어', getKeysByCount(2));

  // 조합 없음: 하이카드
  const allKeys = new Set<number>();
  validCards.forEach(c => allKeys.add(c.actionCost));
  return createComboResult('하이카드', allKeys);
}

/**
 * 카드 ID에서 카테고리 추론
 */
function inferCategory(card: GameCard | ComboCard): string {
  // 1. 명시적인 cardCategory가 있으면 사용
  if ('cardCategory' in card && card.cardCategory) {
    return card.cardCategory;
  }

  // 2. category 필드 확인
  if (card.category) {
    return card.category;
  }

  // 3. ID 기반 추론 (폴백)
  const id = card.id.toLowerCase();
  // 펜싱 카드 판별
  if (id.includes('thrust') || id.includes('slash') || id.includes('parry') ||
      id.includes('riposte') || id.includes('fleche') || id.includes('lunge') ||
      id.includes('quarte') || id.includes('sixte') || id.includes('fencing') ||
      id.includes('feint') || id.includes('balestra') || id.includes('appel')) {
    return 'fencing';
  }
  // 총기 카드 판별
  if (id.includes('shoot') || id.includes('reload') || id.includes('bullet') ||
      id.includes('gun') || id.includes('revolver') || id.includes('roulette') ||
      id.includes('snipe') || id.includes('spray') || id.includes('quickdraw') ||
      id.includes('chamber') || id.includes('cylinder')) {
    return 'gun';
  }
  // 특수 카드
  if (id.includes('special') || id.includes('hologram') || id.includes('recall') ||
      id.includes('ether') || id.includes('burst')) {
    return 'special';
  }
  return 'general';
}

/**
 * ComboResult 생성 헬퍼
 */
function createComboResult(name: string, bonusKeys: Set<number> | null): ComboResult {
  return {
    name,
    multiplier: COMBO_MULTIPLIERS[name] || 1,
    rank: COMBO_INFO[name]?.rank || 0,
    bonusKeys,
    description: COMBO_INFO[name]?.description || '',
  };
}

// ==================== 에테르 계산 ====================

/** 특성 시너지 보너스 정의 */
const TRAIT_SYNERGY_BONUSES: Record<string, { threshold: number; bonus: number; name: string }> = {
  // 기본 시너지 (2개 이상)
  swift: { threshold: 2, bonus: 0.3, name: '신속 시너지' },
  chain: { threshold: 2, bonus: 0.5, name: '연계 시너지' },
  strongbone: { threshold: 2, bonus: 0.4, name: '강골 시너지' },
  repeat: { threshold: 2, bonus: 0.4, name: '반복 시너지' },
  mastery: { threshold: 2, bonus: 0.6, name: '숙련 시너지' },

  // 전투 특성 시너지
  striking: { threshold: 2, bonus: 0.3, name: '타격 시너지' },
  counterattack: { threshold: 2, bonus: 0.4, name: '반격 시너지' },
  piercing: { threshold: 2, bonus: 0.35, name: '관통 시너지' },
  calm: { threshold: 2, bonus: 0.2, name: '침착 시너지' },

  // 협동 특성 (특별 보너스 - 50% 추가 획득)
  cooperation: { threshold: 2, bonus: 0.5, name: '협동 시너지' },

  // 성장 특성
  training: { threshold: 2, bonus: 0.3, name: '단련 시너지' },
  growth: { threshold: 2, bonus: 0.4, name: '성장 시너지' },

  // 방어 특성
  parry: { threshold: 2, bonus: 0.35, name: '패링 시너지' },
  block: { threshold: 2, bonus: 0.25, name: '방어 시너지' },

  // 기타 특성
  quick: { threshold: 2, bonus: 0.25, name: '속공 시너지' },
  heavy: { threshold: 2, bonus: 0.45, name: '중량 시너지' },
};

/**
 * 특성 시너지 보너스 계산
 */
export function calculateTraitSynergyBonus(cards: ComboCard[]): { bonus: number; synergies: string[] } {
  const traitCount = new Map<string, number>();
  const synergies: string[] = [];
  let totalBonus = 0;

  // 특성 집계
  for (const card of cards) {
    if (card.isGhost || hasOutcastTrait(card)) continue;
    if (card.traits) {
      for (const trait of card.traits) {
        traitCount.set(trait, (traitCount.get(trait) || 0) + 1);
      }
    }
  }

  // 시너지 보너스 계산
  for (const [trait, count] of traitCount) {
    const synergy = TRAIT_SYNERGY_BONUSES[trait];
    if (synergy && count >= synergy.threshold) {
      totalBonus += synergy.bonus;
      synergies.push(`${synergy.name} (+${synergy.bonus}x)`);
    }
  }

  return { bonus: totalBonus, synergies };
}

/**
 * 고비용 카드 보너스 계산
 * 2코스트: +0.5x, 3코스트: +1x, N코스트: +(N-1)*0.5x
 */
export function calculateActionCostBonus(cards: ComboCard[]): number {
  if (!cards || cards.length === 0) return 0;

  return cards.reduce((bonus, card) => {
    // 유령 카드와 소외 카드는 보너스에서 제외
    if (card.isGhost || hasOutcastTrait(card)) return bonus;

    const actionCost = card.actionCost || 1;
    // 2코스트 이상만 보너스: N코스트 = +(N-1)*0.5x
    if (actionCost >= 2) {
      return bonus + (actionCost - 1) * 0.5;
    }
    return bonus;
  }, 0);
}

/**
 * 에테르 디플레이션 계산
 * 같은 조합을 반복할수록 획득량 감소 (80%씩)
 */
export function calculateDeflation(
  comboName: string,
  comboUsageCount: Record<string, number>
): { multiplier: number; usageCount: number } {
  const usageCount = comboUsageCount[comboName] || 0;
  const multiplier = Math.pow(DEFLATION_RATE, usageCount);
  return { multiplier, usageCount };
}

/**
 * 카드의 기본 에테르 획득량 계산
 */
export function getCardBaseEther(card: ComboCard): number {
  const rarity = getCardRarity(card);
  return ETHER_BY_RARITY[rarity];
}

/**
 * 카드 배열의 총 에테르 계산
 */
export interface GrowthEtherBonus {
  /** 고정 에테르 보너스 */
  etherGainBonus: number;
  /** 에테르 배율 보너스 (0.1 = 10%) */
  etherGainMultiplier: number;
}

export function calculateTotalEther(
  cards: (GameCard | ComboCard)[],
  comboUsageCount: Record<string, number> = {},
  etherBlocked: boolean = false,
  growthBonus?: GrowthEtherBonus
): EtherGainResult {
  const breakdown: string[] = [];

  // 에테르 획득 불가 상태 (망각 특성)
  if (etherBlocked) {
    breakdown.push('❌ 에테르 획득 불가 (망각)');
    return {
      baseGain: 0,
      comboMultiplier: 0,
      actionCostBonus: 0,
      traitSynergyBonus: 0,
      deflationMultiplier: 0,
      finalGain: 0,
      comboName: '없음',
      breakdown,
    };
  }

  // ComboCard 형식으로 변환
  const comboCards: ComboCard[] = cards.map(c => ({
    id: c.id,
    actionCost: c.actionCost || 1,
    type: c.type || 'general',
    traits: c.traits,
    isGhost: (c as ComboCard).isGhost,
    rarity: (c as ComboCard).rarity,
  }));

  // 유효 카드만 필터링 (소외, 유령 제외)
  const validCards = comboCards.filter(c => !hasOutcastTrait(c) && !c.isGhost);

  if (validCards.length === 0) {
    breakdown.push('유효 카드 없음');
    return {
      baseGain: 0,
      comboMultiplier: 1,
      actionCostBonus: 0,
      traitSynergyBonus: 0,
      deflationMultiplier: 1,
      finalGain: 0,
      comboName: '없음',
      breakdown,
    };
  }

  // 1. 기본 에테르 계산 (희귀도별)
  const baseGain = validCards.reduce((sum, card) => sum + getCardBaseEther(card), 0);
  breakdown.push(`기본 획득: ${baseGain} (${validCards.length}장)`);

  // 2. 조합 감지 및 배율
  const combo = detectPokerCombo(validCards);
  const comboMultiplier = combo.multiplier;
  breakdown.push(`조합: ${combo.name} (×${comboMultiplier})`);

  // 3. 액션코스트 보너스
  const actionCostBonus = calculateActionCostBonus(validCards);
  if (actionCostBonus > 0) {
    breakdown.push(`고비용 보너스: +${actionCostBonus.toFixed(1)}x`);
  }

  // 4. 디플레이션
  const deflation = calculateDeflation(combo.name, comboUsageCount);
  const deflationMultiplier = deflation.multiplier;
  if (deflation.usageCount > 0) {
    breakdown.push(`디플레이션: ×${deflationMultiplier.toFixed(2)} (${deflation.usageCount}회 사용)`);
  }

  // 5. 특성 시너지 보너스 (현재 게임에 미구현 - 참고용으로 계산만 유지)
  const traitSynergy = calculateTraitSynergyBonus(validCards);
  const traitSynergyBonus = traitSynergy.bonus;
  // 특성 시너지는 현재 게임에 구현되지 않음 - 로그에서 제외
  // if (traitSynergyBonus > 0) {
  //   breakdown.push(`특성 시너지: +${traitSynergyBonus.toFixed(1)}x (${traitSynergy.synergies.join(', ')})`);
  // }

  // 6. 성장 시스템 보너스 적용 (extraMultiplier 역할)
  let growthFixedBonus = 0;
  let growthMultiplier = 1;
  if (growthBonus) {
    growthFixedBonus = growthBonus.etherGainBonus || 0;
    growthMultiplier = 1 + (growthBonus.etherGainMultiplier || 0);
    if (growthFixedBonus > 0 || growthBonus.etherGainMultiplier > 0) {
      breakdown.push(`성장 보너스: +${growthFixedBonus} (×${growthMultiplier.toFixed(2)})`);
    }
  }

  // 7. 최종 계산 - 게임 공식과 일치
  // 게임 공식: (카드별 기본값 합계) × (조합 배율 + 액션코스트 보너스) × 디플레이션
  // (특성 시너지는 게임에 미구현이므로 제외)
  const totalMultiplier = (comboMultiplier + actionCostBonus) * deflationMultiplier;
  const baseResult = baseGain * totalMultiplier;
  const finalGain = Math.round((baseResult + growthFixedBonus) * growthMultiplier);
  breakdown.push(`최종 획득: ${finalGain}`);

  return {
    baseGain,
    comboMultiplier,
    actionCostBonus,
    traitSynergyBonus,
    deflationMultiplier,
    finalGain,
    comboName: combo.name,
    breakdown,
  };
}

// ==================== 버스트 시스템 ====================

export interface BurstResult {
  triggered: boolean;
  overflowEther: number;
  bonusDamage: number;
  message: string;
}

/**
 * 에테르 버스트 체크 및 처리
 * 에테르가 100 이상이 되면 버스트 발동
 */
export function checkEtherBurst(
  currentEther: number,
  etherGained: number
): BurstResult {
  const totalEther = currentEther + etherGained;

  if (totalEther >= ETHER_THRESHOLD) {
    const overflowEther = totalEther - ETHER_THRESHOLD;
    // 초과 에테르의 10%를 보너스 피해로 변환
    const bonusDamage = Math.floor(overflowEther * 0.1);

    return {
      triggered: true,
      overflowEther,
      bonusDamage,
      message: `💥 에테르 버스트! (초과: ${overflowEther}, 보너스 피해: ${bonusDamage})`,
    };
  }

  return {
    triggered: false,
    overflowEther: 0,
    bonusDamage: 0,
    message: '',
  };
}

// ==================== 상태 통합 ====================

/**
 * 턴 종료 시 에테르 및 콤보 상태 처리
 */
export function processTurnEndEther(
  state: GameBattleState,
  playedCards: GameCard[]
): {
  etherResult: EtherGainResult;
  burstResult: BurstResult;
  newComboUsageCount: Record<string, number>;
} {
  // 현재 콤보 사용 횟수 (없으면 초기화)
  const comboUsageCount: Record<string, number> = state.comboUsageCount || {};

  // 에테르 계산
  const etherResult = calculateTotalEther(
    playedCards,
    comboUsageCount,
    state.player.etherBlocked || false
  );

  // 버스트 체크
  const burstResult = checkEtherBurst(state.player.ether, etherResult.finalGain);

  // 콤보 사용 횟수 업데이트
  const newComboUsageCount = { ...comboUsageCount };
  if (etherResult.comboName !== '없음') {
    newComboUsageCount[etherResult.comboName] =
      (newComboUsageCount[etherResult.comboName] || 0) + 1;
  }

  return {
    etherResult,
    burstResult,
    newComboUsageCount,
  };
}
