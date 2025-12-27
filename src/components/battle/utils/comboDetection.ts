/**
 * @file comboDetection.ts
 * @description 포커 조합 감지 시스템
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
 * 포커 조합 감지
 */
export function detectPokerCombo(cards: ComboCard[]): ComboCalculation | null {
  if (!cards || !Array.isArray(cards) || cards.length === 0) return null;

  // 소외 (outcast) 특성 카드와 유령카드는 조합 계산에서 제외
  const validCards = cards.filter(c => !hasTrait(c, 'outcast') && !c.isGhost);

  // 유효 카드가 없으면 조합 없음 (하이카드도 아님)
  if (validCards.length === 0) return null;

  // 카드 1장: 하이카드
  if (validCards.length === 1) {
    return {
      name: '하이카드',
      bonusKeys: new Set([validCards[0].actionCost])
    };
  }

  // actionCost별 카드 수 집계 (예: {1: 2, 2: 3} = 1코스트 2장, 2코스트 3장)
  const freq = new Map<number, number>();
  for (const c of validCards) {
    freq.set(c.actionCost, (freq.get(c.actionCost) || 0) + 1);
  }
  const counts = Array.from(freq.values());

  // 헬퍼 함수
  const have = (n: number): boolean => counts.includes(n);
  const keysByCount = (n: number): Set<number> =>
    new Set(Array.from(freq.entries()).filter(([, v]) => v === n).map(([k]) => Number(k)));

  // 플러쉬 판정: 모든 카드가 공격형 또는 방어형이고 4장 이상
  const allAttack = validCards.every(c => c.type === 'attack');
  const allDefense = validCards.every(c => c.type === 'general' || c.type === 'defense');
  const isFlush = (allAttack || allDefense) && validCards.length >= 4;

  // 조합 우선순위: 파이브카드 > 포카드 > 풀하우스 > 플러쉬 > 투페어 > 트리플 > 페어 > 하이카드
  let result: ComboCalculation | null = null;
  if (have(5)) result = { name: '파이브카드', bonusKeys: keysByCount(5) };
  else if (have(4)) result = { name: '포카드', bonusKeys: keysByCount(4) };
  else if (have(3) && have(2)) {
    const b = new Set([...keysByCount(3), ...keysByCount(2)]);
    result = { name: '풀하우스', bonusKeys: b };
  }
  else if (isFlush) result = { name: '플러쉬', bonusKeys: null };
  else {
    const pairKeys = keysByCount(2);
    if (pairKeys.size >= 2) result = { name: '투페어', bonusKeys: pairKeys };
    else if (have(3)) result = { name: '트리플', bonusKeys: keysByCount(3) };
    else if (have(2)) result = { name: '페어', bonusKeys: pairKeys };
    else {
      // 조합 없음: 하이카드
      const allKeys = new Set(validCards.map(c => c.actionCost));
      result = { name: '하이카드', bonusKeys: allKeys };
    }
  }

  return result;
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
