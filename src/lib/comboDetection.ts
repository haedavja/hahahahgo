/**
 * @file comboDetection.ts
 * @description 공유 포커 조합 감지 시스템
 *
 * 게임과 시뮬레이터에서 공통으로 사용하는 포커 조합 감지 로직입니다.
 *
 * ## 조합 감지 규칙
 * 카드의 actionCost를 포커 숫자처럼 취급하여 조합 판정:
 * - 파이브카드: 같은 actionCost 5장 (5x)
 * - 포카드: 같은 actionCost 4장 (4x)
 * - 풀하우스: 트리플 + 페어 (3.75x)
 * - 플러쉬: 같은 타입(공격/방어) 4장 이상 (3.5x)
 * - 트리플: 같은 actionCost 3장 (3x)
 * - 투페어: 페어 2개 (2.5x)
 * - 페어: 같은 actionCost 2장 (2x)
 * - 하이카드: 조합 없음 (1x)
 *
 * ## 제외 조건
 * - 'outcast' 특성 카드: 조합에서 제외
 * - 유령카드 (isGhost): 조합에서 제외
 */

// ==================== 타입 정의 ====================

export interface ComboCard {
  id?: string;
  actionCost: number;
  type: string;
  traits?: string[];
  isGhost?: boolean;
  rarity?: CardRarity;
  category?: string;
}

export type CardRarity = 'common' | 'rare' | 'special' | 'legendary';

export type ComboName =
  | '하이카드'
  | '페어'
  | '투페어'
  | '트리플'
  | '플러쉬'
  | '풀하우스'
  | '포카드'
  | '파이브카드';

export interface ComboResult {
  name: ComboName;
  multiplier: number;
  rank: number;
  bonusKeys: Set<number> | null;
  description: string;
}

export interface ComboCalculation {
  name: string;
  bonusKeys: Set<number> | null;
}

// ==================== 상수 ====================

/** 조합별 에테르 배율 */
export const COMBO_MULTIPLIERS: Record<ComboName, number> = {
  '하이카드': 1,
  '페어': 2,
  '투페어': 2.5,
  '트리플': 3,
  '플러쉬': 3.5,
  '풀하우스': 3.75,
  '포카드': 4,
  '파이브카드': 5,
};

/** 조합 정보 */
export const COMBO_INFO: Record<ComboName, { rank: number; description: string }> = {
  '하이카드': { rank: 0, description: '조합 없음' },
  '페어': { rank: 1, description: '같은 actionCost 2장' },
  '투페어': { rank: 2, description: '페어 2개' },
  '트리플': { rank: 3, description: '같은 actionCost 3장' },
  '플러쉬': { rank: 4, description: '같은 타입 4장+' },
  '풀하우스': { rank: 5, description: '트리플 + 페어' },
  '포카드': { rank: 6, description: '같은 actionCost 4장' },
  '파이브카드': { rank: 7, description: '같은 actionCost 5장' },
};

/** 조합 우선순위 (높을수록 강함) */
export const COMBO_PRIORITIES: Record<ComboName, number> = {
  '하이카드': 0,
  '페어': 1,
  '투페어': 2,
  '트리플': 3,
  '플러쉬': 4,
  '풀하우스': 5,
  '포카드': 6,
  '파이브카드': 7,
};

// ==================== 유틸리티 함수 ====================

/**
 * 카드가 특정 특성을 가지고 있는지 확인
 */
export function hasTrait(card: ComboCard, trait: string): boolean {
  return card.traits?.includes(trait) ?? false;
}

/**
 * 카드가 조합에서 제외되어야 하는지 확인
 */
export function isExcludedFromCombo(card: ComboCard): boolean {
  return hasTrait(card, 'outcast') || card.isGhost === true;
}

// ==================== 카드 분석 ====================

interface CardAnalysis {
  validCards: ComboCard[];
  freq: Map<number, number>;
  allAttack: boolean;
  allDefense: boolean;
  typeCount: Map<string, number>;
}

/**
 * 단일 패스로 카드 분석 (최적화)
 * filter + forEach + every를 단일 루프로 통합
 */
function analyzeCards(cards: ComboCard[]): CardAnalysis {
  const validCards: ComboCard[] = [];
  const freq = new Map<number, number>();
  const typeCount = new Map<string, number>();
  let attackCount = 0;
  let defenseCount = 0;

  for (const c of cards) {
    // 유효 카드 필터링과 집계를 동시에 수행
    if (!isExcludedFromCombo(c)) {
      validCards.push(c);
      freq.set(c.actionCost, (freq.get(c.actionCost) || 0) + 1);
      typeCount.set(c.type, (typeCount.get(c.type) || 0) + 1);

      // 플러쉬 판정용 타입 체크
      if (c.type === 'attack') {
        attackCount++;
      } else if (c.type === 'general' || c.type === 'defense') {
        defenseCount++;
      }
    }
  }

  return {
    validCards,
    freq,
    allAttack: attackCount > 0 && attackCount === validCards.length,
    allDefense: defenseCount > 0 && defenseCount === validCards.length,
    typeCount,
  };
}

/**
 * 특정 빈도의 키들 반환
 */
function keysByCount(freq: Map<number, number>, count: number): Set<number> {
  const result = new Set<number>();
  freq.forEach((c, key) => {
    if (c === count) result.add(key);
  });
  return result;
}

// ==================== 포커 조합 감지 ====================

/**
 * 포커 조합 감지 (간단한 버전 - 게임 UI용)
 * @param cards 카드 배열
 * @returns 조합 계산 결과 또는 null
 */
export function detectPokerCombo(cards: ComboCard[]): ComboCalculation | null {
  if (!cards || !Array.isArray(cards) || cards.length === 0) return null;

  // 단일 패스로 모든 분석 수행
  const { validCards, freq, allAttack, allDefense } = analyzeCards(cards);

  // 유효 카드가 없으면 조합 없음
  if (validCards.length === 0) return null;

  // 카드 1장: 하이카드
  if (validCards.length === 1) {
    return {
      name: '하이카드',
      bonusKeys: new Set([validCards[0].actionCost]),
    };
  }

  // 빈도 분석
  let has5 = false,
    has4 = false,
    has3 = false,
    has2 = false;
  freq.forEach((count) => {
    if (count === 5) has5 = true;
    else if (count === 4) has4 = true;
    else if (count === 3) has3 = true;
    else if (count === 2) has2 = true;
  });

  // 플러쉬 판정
  const isFlush = (allAttack || allDefense) && validCards.length >= 4;

  // 조합 우선순위: 파이브카드 > 포카드 > 풀하우스 > 플러쉬 > 투페어 > 트리플 > 페어 > 하이카드
  if (has5) return { name: '파이브카드', bonusKeys: keysByCount(freq, 5) };
  if (has4) return { name: '포카드', bonusKeys: keysByCount(freq, 4) };
  if (has3 && has2) {
    const bonusKeys = new Set<number>();
    freq.forEach((count, key) => {
      if (count === 3 || count === 2) bonusKeys.add(key);
    });
    return { name: '풀하우스', bonusKeys };
  }
  if (isFlush) return { name: '플러쉬', bonusKeys: null };

  const pairKeys = keysByCount(freq, 2);
  if (pairKeys.size >= 2) return { name: '투페어', bonusKeys: pairKeys };
  if (has3) return { name: '트리플', bonusKeys: keysByCount(freq, 3) };
  if (has2) return { name: '페어', bonusKeys: pairKeys };

  // 조합 없음: 하이카드
  const allKeys = new Set<number>();
  validCards.forEach((c) => allKeys.add(c.actionCost));
  return { name: '하이카드', bonusKeys: allKeys };
}

/**
 * 포커 조합 감지 (상세 버전 - 시뮬레이터용)
 * @param cards 카드 배열
 * @returns 상세 조합 결과 또는 null
 */
export function detectPokerComboDetailed(cards: ComboCard[]): ComboResult | null {
  const basic = detectPokerCombo(cards);
  if (!basic) return null;

  const name = basic.name as ComboName;
  const info = COMBO_INFO[name];

  return {
    name,
    multiplier: COMBO_MULTIPLIERS[name],
    rank: info.rank,
    bonusKeys: basic.bonusKeys,
    description: info.description,
  };
}

/**
 * 조합 이름으로 배율 가져오기
 */
export function getComboMultiplier(comboName: string): number {
  return COMBO_MULTIPLIERS[comboName as ComboName] ?? 1;
}

/**
 * 조합 비교 (어느 쪽이 더 강한지)
 * @returns 양수면 a가 강함, 음수면 b가 강함, 0이면 동일
 */
export function compareCombo(a: ComboName, b: ComboName): number {
  return COMBO_PRIORITIES[a] - COMBO_PRIORITIES[b];
}

// ==================== 포커 보너스 적용 ====================

/**
 * 포커 조합 보너스 적용 (카드에 _combo 태그 추가)
 */
export function applyPokerBonus<T extends ComboCard>(
  cards: T[],
  combo: ComboCalculation | null
): T[] {
  if (!combo) return cards;
  return cards.map((c) => {
    if (combo.bonusKeys && combo.bonusKeys.has(c.actionCost)) {
      return { ...c, _combo: combo.name };
    }
    return c;
  });
}

/**
 * 조합에 포함된 카드인지 확인
 */
export function isInCombo(card: ComboCard, combo: ComboCalculation | null): boolean {
  if (!combo || !combo.bonusKeys) return false;
  return combo.bonusKeys.has(card.actionCost);
}
