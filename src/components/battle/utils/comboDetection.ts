/**
 * @file comboDetection.ts
 * @description 포커 조합 감지 시스템
 * 최적화: 단일 패스 배열 연산으로 통합
 *
 * ## 조합 감지 규칙
 * 카드의 actionCost를 포커 숫자처럼 취급하여 조합 판정:
 * - 파이브카드: 같은 actionCost 5장
 * - 포카드: 같은 actionCost 4장
 * - 풀하우스: 트리플 + 페어
 * - 플러쉬: 같은 타입(공격/방어) 4장 이상
 * - 트리플: 같은 actionCost 3장
 * - 투페어: 페어 2개
 * - 페어: 같은 actionCost 2장
 * - 하이카드: 조합 없음
 *
 * ## 제외 조건
 * - 'outcast' 특성 카드: 조합에서 제외
 * - 유령카드 (isGhost): 조합에서 제외
 */

import type { ComboCard, ComboCalculation } from '../../../types';
import { hasTrait } from './battleUtils';

/**
 * 단일 패스로 카드 분석 (최적화)
 * filter + forEach + every를 단일 루프로 통합
 */
function analyzeCards(cards: ComboCard[]): {
  validCards: ComboCard[];
  freq: Map<number, number>;
  allAttack: boolean;
  allDefense: boolean;
} {
  const validCards: ComboCard[] = [];
  const freq = new Map<number, number>();
  let hasAttack = false;
  let hasDefense = false;
  let attackCount = 0;
  let defenseCount = 0;

  for (const c of cards) {
    // 유효 카드 필터링과 집계를 동시에 수행
    if (!hasTrait(c, 'outcast') && !c.isGhost) {
      validCards.push(c);
      freq.set(c.actionCost, (freq.get(c.actionCost) || 0) + 1);

      // 플러쉬 판정용 타입 체크
      if (c.type === 'attack') {
        attackCount++;
        hasAttack = true;
      } else if (c.type === 'general' || c.type === 'defense') {
        defenseCount++;
        hasDefense = true;
      }
    }
  }

  return {
    validCards,
    freq,
    allAttack: hasAttack && attackCount === validCards.length,
    allDefense: hasDefense && defenseCount === validCards.length,
  };
}

/**
 * 포커 조합 감지
 * 최적화: 단일 패스 분석
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
      bonusKeys: new Set([validCards[0].actionCost])
    };
  }

  // 조합별 키 미리 계산 (필요할 때만)
  const keysByCount = (n: number): Set<number> => {
    const result = new Set<number>();
    freq.forEach((count, key) => {
      if (count === n) result.add(key);
    });
    return result;
  };

  // counts 배열 생성 (freq.values() 한번만 순회)
  let has5 = false, has4 = false, has3 = false, has2 = false;
  freq.forEach((count) => {
    if (count === 5) has5 = true;
    else if (count === 4) has4 = true;
    else if (count === 3) has3 = true;
    else if (count === 2) has2 = true;
  });

  // 플러쉬 판정
  const isFlush = (allAttack || allDefense) && validCards.length >= 4;

  // 조합 우선순위: 파이브카드 > 포카드 > 풀하우스 > 플러쉬 > 투페어 > 트리플 > 페어 > 하이카드
  if (has5) return { name: '파이브카드', bonusKeys: keysByCount(5) };
  if (has4) return { name: '포카드', bonusKeys: keysByCount(4) };
  if (has3 && has2) {
    const bonusKeys = new Set<number>();
    freq.forEach((count, key) => {
      if (count === 3 || count === 2) bonusKeys.add(key);
    });
    return { name: '풀하우스', bonusKeys };
  }
  if (isFlush) return { name: '플러쉬', bonusKeys: null };

  const pairKeys = keysByCount(2);
  if (pairKeys.size >= 2) return { name: '투페어', bonusKeys: pairKeys };
  if (has3) return { name: '트리플', bonusKeys: keysByCount(3) };
  if (has2) return { name: '페어', bonusKeys: pairKeys };

  // 조합 없음: 하이카드
  const allKeys = new Set<number>();
  validCards.forEach(c => allKeys.add(c.actionCost));
  return { name: '하이카드', bonusKeys: allKeys };
}

/**
 * 포커 조합 보너스 적용
 * 조합 보너스 기능 삭제됨 - 이제 조합은 에테르 배율만 제공
 */
export function applyPokerBonus(cards: ComboCard[], combo: ComboCalculation | null): ComboCard[] {
  if (!combo) return cards;
  return cards.map(c => {
    // _combo 태그만 추가 (공격력/방어력 보너스는 제거)
    if (combo.bonusKeys && combo.bonusKeys.has(c.actionCost)) {
      return { ...c, _combo: combo.name };
    }
    return c;
  });
}
