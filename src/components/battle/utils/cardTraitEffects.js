/**
 * @file cardTraitEffects.js
 * @description 카드 특성(trait) 기반 다음 턴 효과 처리 시스템
 * @typedef {import('../../../types').Card} Card
 *
 * @typedef {Object} NextTurnEffects
 * @property {string[]} guaranteedCards - 확정 등장 카드 ID 목록
 * @property {number} bonusEnergy - 추가 행동력
 * @property {number} energyPenalty - 행동력 페널티
 * @property {boolean} etherBlocked - 에테르 획득 차단 여부
 * @property {boolean} mainSpecialOnly - 주특기만 등장 여부
 * @property {number} subSpecialBoost - 보조특기 등장률 증가
 */

import { hasTrait } from "./battleUtils";

/**
 * 선택된 카드들의 특성을 분석하여 다음 턴 효과 생성
 * @param {Card[]} selectedCards - 선택된 카드 배열
 * @param {Function} addLog - 로그 추가 함수
 * @returns {Object} 다음 턴 효과 객체
 */
export function processCardTraitEffects(selectedCards, addLog = () => {}) {
  const nextTurnEffects = {
    guaranteedCards: [],
    bonusEnergy: 0,
    energyPenalty: 0,
    etherBlocked: false,
    mainSpecialOnly: false,
    subSpecialBoost: 0,
  };

  selectedCards.forEach(card => {
    // 반복 (repeat): 다음턴에도 손패에 확정적으로 등장
    if (hasTrait(card, 'repeat')) {
      nextTurnEffects.guaranteedCards.push(card.id);
      addLog(`🔄 "반복" - ${card.name}이(가) 다음턴에도 등장합니다.`);
    }

    // 몸풀기 (warmup): 다음턴 행동력 +2
    if (hasTrait(card, 'warmup')) {
      nextTurnEffects.bonusEnergy += 2;
      addLog(`⚡ "몸풀기" - 다음턴 행동력 +2`);
    }

    // 탈진 (exhaust): 다음턴 행동력 -2
    if (hasTrait(card, 'exhaust')) {
      nextTurnEffects.energyPenalty += 2;
      addLog(`😰 "탈진" - 다음턴 행동력 -2`);
    }

    // 망각 (oblivion): 이후 에테르 획득 불가
    if (hasTrait(card, 'oblivion')) {
      nextTurnEffects.etherBlocked = true;
      addLog(`🚫 "망각" - 이후 에테르 획득이 불가능해집니다!`);
    }

    // 파탄 (ruin): 다음턴 주특기만 등장
    if (hasTrait(card, 'ruin')) {
      nextTurnEffects.mainSpecialOnly = true;
      addLog(`⚠️ "파탄" - 다음턴은 주특기 카드만 뽑힙니다.`);
    }

    // 장군 (general): 다음턴 보조특기 등장률 25% 증가
    if (hasTrait(card, 'general')) {
      nextTurnEffects.subSpecialBoost += 0.25;
      addLog(`👑 "장군" - 다음턴 보조특기 등장률 증가!`);
    }
  });

  return nextTurnEffects;
}
