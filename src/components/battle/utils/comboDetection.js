import { hasTrait } from './battleUtils';

// =====================
// 포커 조합 감지 로직
// =====================

/**
 * 포커 조합 감지
 * @param {Array} cards - 조합을 감지할 카드 배열
 * @returns {Object|null} - 조합 이름과 보너스 키 Set, 조합이 없으면 null
 */
export function detectPokerCombo(cards) {
  if (!cards || cards.length === 0) return null;

  // 소외 (outcast) 특성 카드는 조합 계산에서 제외
  const validCards = cards.filter(c => !hasTrait(c, 'outcast'));

  // 유효 카드가 없으면 조합 없음 (하이카드도 아님)
  if (validCards.length === 0) return null;

  // 카드 1장: 하이카드
  if (validCards.length === 1) {
    return {
      name: '하이카드',
      bonusKeys: new Set([validCards[0].actionCost])
    };
  }

  const freq = new Map();
  for (const c of validCards) { freq.set(c.actionCost, (freq.get(c.actionCost) || 0) + 1); }
  const counts = Array.from(freq.values());
  const have = (n) => counts.includes(n);
  const keysByCount = (n) => new Set(Array.from(freq.entries()).filter(([k, v]) => v === n).map(([k]) => Number(k)));

  const allAttack = validCards.every(c => c.type === 'attack');
  const allDefense = validCards.every(c => c.type === 'defense');
  const isFlush = (allAttack || allDefense) && validCards.length >= 4;

  let result = null;
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
 * @param {Array} cards - 카드 배열
 * @param {Object} combo - 조합 정보
 * @returns {Array} - 보너스가 적용된 카드 배열
 */
export function applyPokerBonus(cards, combo) {
  if (!combo) return cards;
  return cards.map(c => {
    // _combo 태그만 추가 (공격력/방어력 보너스는 제거)
    if (combo.bonusKeys && combo.bonusKeys.has(c.actionCost)) {
      return { ...c, _combo: combo.name };
    }
    return c;
  });
}
