/**
 * @file battleUtils.js
 * @description 전투 시스템 유틸리티 함수
 * @typedef {import('../../../types').Card} Card
 * @typedef {import('../../../types').CardTrait} CardTrait
 */

// =====================
// 기본 유틸리티 함수
// =====================

/**
 * 배열에서 랜덤으로 하나 선택
 * @template T
 * @param {T[]} arr - 선택할 배열
 * @returns {T} 랜덤 선택된 요소
 */
export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * 카드가 특정 특성을 가지고 있는지 확인
 * @param {Card} card - 확인할 카드
 * @param {CardTrait} traitId - 특성 ID
 * @returns {boolean} 특성 보유 여부
 */
export function hasTrait(card, traitId) {
  return card.traits && card.traits.includes(traitId);
}

/**
 * 특성 효과를 카드에 적용
 * @param {Card} card - 적용할 카드
 * @param {Object} [context={}] - 적용 컨텍스트
 * @param {boolean} [context.isInCombo] - 조합에 포함 여부
 * @param {number} [context.usageCount] - 사용 횟수
 * @returns {Card} 수정된 카드
 */
export function applyTraitModifiers(card, context = {}) {
  let modifiedCard = { ...card };

  // 강골 (strongbone): 피해량/방어력 25% 증가
  if (hasTrait(card, 'strongbone')) {
    if (modifiedCard.damage) modifiedCard.damage = Math.ceil(modifiedCard.damage * 1.25);
    if (modifiedCard.block) modifiedCard.block = Math.ceil(modifiedCard.block * 1.25);
  }

  // 약골 (weakbone): 피해량/방어력 20% 감소
  if (hasTrait(card, 'weakbone')) {
    if (modifiedCard.damage) modifiedCard.damage = Math.ceil(modifiedCard.damage * 0.8);
    if (modifiedCard.block) modifiedCard.block = Math.ceil(modifiedCard.block * 0.8);
  }

  // 파괴자 (destroyer): 공격력 50% 증가
  if (hasTrait(card, 'destroyer') && modifiedCard.damage) {
    modifiedCard.damage = Math.ceil(modifiedCard.damage * 1.5);
  }

  // 도살 (slaughter): 기본피해량 75% 증가
  if (hasTrait(card, 'slaughter') && modifiedCard.damage) {
    modifiedCard.damage = Math.ceil(modifiedCard.damage * 1.75);
  }

  // 정점 (pinnacle): 피해량 2.5배
  if (hasTrait(card, 'pinnacle') && modifiedCard.damage) {
    modifiedCard.damage = Math.ceil(modifiedCard.damage * 2.5);
  }

  // 협동 (cooperation): 조합 대상이 되면 50% 추가 보너스
  if (hasTrait(card, 'cooperation') && context.isInCombo) {
    if (modifiedCard.damage) modifiedCard.damage = Math.ceil(modifiedCard.damage * 1.5);
    if (modifiedCard.block) modifiedCard.block = Math.ceil(modifiedCard.block * 1.5);
  }

  // 신속함 (swift): 속도 코스트 감소 (약 15% 성능 기준)
  if (hasTrait(card, 'swift')) {
    modifiedCard.speedCost = Math.max(1, Math.ceil(modifiedCard.speedCost * 0.75));
  }

  // 굼뜸 (slow): 속도 코스트 증가
  if (hasTrait(card, 'slow')) {
    modifiedCard.speedCost = Math.ceil(modifiedCard.speedCost * 1.33);
  }

  // 숙련 (mastery): 사용할수록 시간 감소 (context.usageCount 필요)
  if (hasTrait(card, 'mastery') && context.usageCount) {
    modifiedCard.speedCost = Math.max(1, modifiedCard.speedCost - (context.usageCount * 2));
  }

  // 싫증 (boredom): 사용할수록 시간 증가
  if (hasTrait(card, 'boredom') && context.usageCount) {
    modifiedCard.speedCost = modifiedCard.speedCost + (context.usageCount * 2);
  }

  // 소외 (outcast): 행동력 1 감소 (최소 0)
  if (hasTrait(card, 'outcast')) {
    modifiedCard.actionCost = Math.max(0, modifiedCard.actionCost - 1);
  }

  return modifiedCard;
}

/**
 * 힘 스탯을 카드에 적용하는 함수
 */
export function applyStrengthToCard(card, strength = 0, isPlayerCard = true) {
  if (!isPlayerCard || strength === 0) return card;

  const modifiedCard = { ...card };

  // 공격 카드: 힘 1당 공격력 +1 (음수 허용, 최소 0)
  if (modifiedCard.damage && modifiedCard.type === 'attack') {
    modifiedCard.damage = Math.max(0, modifiedCard.damage + strength);
  }

  // 방어 카드: 힘 1당 방어력 +1 (음수 허용, 최소 0)
  if (modifiedCard.block && (modifiedCard.type === 'general' || modifiedCard.type === 'defense')) {
    modifiedCard.block = Math.max(0, modifiedCard.block + strength);
  }

  return modifiedCard;
}

/**
 * 손패 전체에 힘 스탯 적용
 */
export function applyStrengthToHand(hand, strength = 0) {
  if (strength === 0) return hand;
  return hand.map(card => applyStrengthToCard(card, strength, true));
}

/**
 * 카드 희귀도 반환
 */
export const getCardRarity = (card) => card?.rarity || 'common';
