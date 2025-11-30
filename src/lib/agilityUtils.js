/**
 * 민첩성(Agility) 유틸리티 함수
 *
 * 민첩성은 카드의 속도 코스트를 감소시킵니다.
 * - 민첩 1 = 속도 -1
 * - 민첩 -1 = 속도 +1
 * - 최소 속도는 1 (0 이하로 내려가지 않음)
 */

/**
 * 민첩성을 적용하여 카드의 실제 속도를 계산합니다.
 *
 * @param {number} baseSpeed - 카드의 기본 speedCost
 * @param {number} agility - 캐릭터의 민첩성 (양수: 속도 감소, 음수: 속도 증가)
 * @returns {number} 민첩성이 적용된 최종 속도 (최소 1)
 */
export function applyAgility(baseSpeed, agility = 0) {
  if (typeof baseSpeed !== 'number' || baseSpeed < 1) return 1;
  if (typeof agility !== 'number' || agility === 0) return baseSpeed;

  // 민첩만큼 속도 감소 (음수면 증가), 최소 1
  return Math.max(1, baseSpeed - agility);
}

/**
 * 카드 배열에 민첩성을 적용합니다.
 *
 * @param {Array} cards - 카드 객체 배열
 * @param {number} agility - 민첩성 (양수: 속도 감소, 음수: 속도 증가)
 * @returns {Array} 민첩성이 적용된 카드 배열 (새 객체)
 */
export function applyAgilityToCards(cards, agility = 0) {
  if (!Array.isArray(cards) || cards.length === 0) return cards;
  if (typeof agility !== 'number' || agility === 0) return cards;

  return cards.map(card => ({
    ...card,
    speedCost: applyAgility(card.speedCost, agility),
    originalSpeedCost: card.originalSpeedCost ?? card.speedCost, // 원본 속도 보존
  }));
}

/**
 * 민첩 효과 설명 텍스트를 생성합니다.
 *
 * @param {number} agility - 민첩성
 * @returns {string} 설명 텍스트
 */
export function getAgilityDescription(agility) {
  if (!agility || agility === 0) return '';
  if (agility > 0) return `민첩 ${agility} (카드 속도 -${agility})`;
  return `민첩 ${agility} (카드 속도 +${Math.abs(agility)})`;
}

/**
 * 민첩이 적용된 속도와 원본 속도를 비교하여 감소량을 반환합니다.
 *
 * @param {number} baseSpeed - 원본 속도
 * @param {number} agility - 민첩성
 * @returns {number} 실제 감소된 속도 (음수가 아님)
 */
export function getAgilityReduction(baseSpeed, agility) {
  const finalSpeed = applyAgility(baseSpeed, agility);
  return baseSpeed - finalSpeed;
}
