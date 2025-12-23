/**
 * comboScoring.js
 *
 * 적 AI의 포커 콤보 인식 및 점수 계산
 * 설계 문서: docs/AI_COMBO_RECOGNITION_DESIGN.md
 */

import { detectPokerCombo } from './comboDetection';
import { COMBO_MULTIPLIERS } from './etherCalculations';

// =====================
// 콤보 점수 가중치
// =====================
// 배율 기반이지만 AI가 너무 콤보만 추구하지 않도록 조정

export const COMBO_SCORE_WEIGHTS = {
  '하이카드': 0,        // 기본, 보너스 없음
  '페어': 100,          // 2배 → 100점
  '투페어': 150,        // 2.5배 → 150점
  '트리플': 200,        // 3배 → 200점
  '플러쉬': 225,        // 3.25배 → 225점
  '풀하우스': 300,      // 3.5배 → 300점
  '포카드': 400,        // 4배 → 400점
  '파이브카드': 500     // 5배 → 500점
};

// =====================
// 몬스터별 콤보 성향
// =====================
// 0 = 콤보 무시, 1 = 콤보 최우선

export const ENEMY_COMBO_TENDENCIES = {
  'ghoul': 0.3,       // 본능적, 전략 없음
  'marauder': 0.5,    // 기본 지능
  'slurthim': 0,      // 디버프 전용, 콤보 무관
  'deserter': 0.8,    // 전술적, 훈련받은 병사
  'slaughterer': 0.5  // 공격 우선, 콤보는 부차적
};

/**
 * 카드 조합의 콤보 점수 계산
 * @param {Array} cards - 카드 배열
 * @returns {Object} { comboName, score, multiplier }
 */
export function calculateComboScore(cards) {
  if (!cards || cards.length === 0) {
    return { comboName: null, score: 0, multiplier: 1 };
  }

  const combo = detectPokerCombo(cards);

  if (!combo) {
    return { comboName: null, score: 0, multiplier: 1 };
  }

  return {
    comboName: combo.name,
    score: COMBO_SCORE_WEIGHTS[combo.name] || 0,
    multiplier: COMBO_MULTIPLIERS[combo.name] || 1,
    bonusKeys: combo.bonusKeys
  };
}

/**
 * 잠재적 콤보 분석 (덱 분석용)
 * @param {Array} deck - 사용 가능한 카드 덱
 * @returns {Object} 가능한 콤보 정보
 */
export function analyzePotentialCombos(deck) {
  if (!deck || deck.length === 0) {
    return {
      costFrequency: new Map(),
      canFlush: false,
      maxSameCost: 0,
      pairCosts: [],
      bestPotentialCombo: null
    };
  }

  const costFreq = new Map();
  const typeCount = { attack: 0, defense: 0 };

  deck.forEach(card => {
    const cost = card.actionCost;
    costFreq.set(cost, (costFreq.get(cost) || 0) + 1);

    if (card.type === 'attack') {
      typeCount.attack++;
    } else {
      typeCount.defense++;
    }
  });

  const maxSameCost = Math.max(0, ...costFreq.values());
  const canFlush = typeCount.attack >= 4 || typeCount.defense >= 4;
  const pairCosts = Array.from(costFreq.entries())
    .filter(([, count]) => count >= 2)
    .map(([cost]) => cost);

  // 가장 좋은 잠재적 콤보 판단
  let bestPotentialCombo = null;
  if (maxSameCost >= 5) {
    bestPotentialCombo = '파이브카드';
  } else if (maxSameCost >= 4) {
    bestPotentialCombo = '포카드';
  } else if (maxSameCost >= 3 && pairCosts.length >= 2) {
    bestPotentialCombo = '풀하우스';
  } else if (canFlush) {
    bestPotentialCombo = '플러쉬';
  } else if (maxSameCost >= 3) {
    bestPotentialCombo = '트리플';
  } else if (pairCosts.length >= 2) {
    bestPotentialCombo = '투페어';
  } else if (maxSameCost >= 2) {
    bestPotentialCombo = '페어';
  }

  return {
    costFrequency: costFreq,
    canFlush,
    flushType: typeCount.attack >= 4 ? 'attack' : typeCount.defense >= 4 ? 'defense' : null,
    maxSameCost,
    pairCosts,
    bestPotentialCombo
  };
}

/**
 * 콤보 완성을 위한 카드 필터링
 * @param {Array} deck - 전체 덱
 * @param {string} targetCombo - 목표 콤보
 * @returns {Array} 우선 선택할 카드들
 */
export function filterCardsForCombo(deck, targetCombo) {
  if (!deck || deck.length === 0) return [];

  const analysis = analyzePotentialCombos(deck);

  switch (targetCombo) {
    case '플러쉬': {
      if (!analysis.flushType) return deck;
      return deck.filter(c =>
        analysis.flushType === 'attack'
          ? c.type === 'attack'
          : c.type === 'general' || c.type === 'defense'
      );
    }

    case '포카드':
    case '트리플':
    case '페어': {
      // 가장 많은 동일 코스트 카드 우선
      const bestCost = Array.from(analysis.costFrequency.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0];
      if (bestCost === undefined) return deck;
      return deck.filter(c => c.actionCost === bestCost);
    }

    case '풀하우스': {
      // 3장 + 2장 조합 가능한 카드들
      const sorted = Array.from(analysis.costFrequency.entries())
        .sort((a, b) => b[1] - a[1]);
      if (sorted.length < 2) return deck;
      const [tripleCost] = sorted[0];
      const [pairCost] = sorted[1];
      return deck.filter(c =>
        c.actionCost === tripleCost || c.actionCost === pairCost
      );
    }

    case '투페어': {
      // 페어 가능한 코스트의 카드들
      if (analysis.pairCosts.length < 2) return deck;
      return deck.filter(c => analysis.pairCosts.includes(c.actionCost));
    }

    default:
      return deck;
  }
}

/**
 * 콤보 인식 전략 결정
 * @param {Object} enemy - 적 객체
 * @param {number} playerEther - 플레이어 에테르
 * @param {number} turnNumber - 현재 턴
 * @returns {Object} { comboWeight, etherPriority, targetCombo }
 */
export function decideComboStrategy(enemy, playerEther = 0, turnNumber = 1) {
  const enemyEther = enemy?.ether || 0;
  const hpPercent = enemy?.hp && enemy?.maxHp
    ? (enemy.hp / enemy.maxHp) * 100
    : 100;

  // 몬스터 기본 성향
  const baseTendency = ENEMY_COMBO_TENDENCIES[enemy?.id] ?? 0.5;

  let comboWeight = baseTendency;
  let etherPriority = false;
  let targetCombo = null;

  // 초반 턴: 에테르 축적 중요
  if (turnNumber <= 2) {
    comboWeight = Math.min(1, baseTendency + 0.2);
    etherPriority = true;
  }

  // 에테르 경쟁 상황: 플레이어가 앞서면 콤보 중요도 증가
  if (playerEther > enemyEther + 200) {
    comboWeight = Math.min(1, comboWeight + 0.3);
    etherPriority = true;
  }

  // HP 낮음: 콤보보다 즉각적인 공격/방어 우선
  if (hpPercent < 30) {
    comboWeight = Math.max(0, baseTendency - 0.3);
    etherPriority = false;
  }

  // 덱 분석하여 목표 콤보 결정
  if (enemy?.deck && comboWeight > 0) {
    const analysis = analyzePotentialCombos(
      enemy.deck.map(id => ({ id, actionCost: 1 })) // 실제로는 카드 객체 필요
    );
    targetCombo = analysis.bestPotentialCombo;
  }

  return {
    comboWeight,
    etherPriority,
    targetCombo,
    baseTendency
  };
}

/**
 * 콤보 점수를 포함한 최종 스코어 계산
 * @param {Object} mode - AI 모드 (aggro/turtle/balanced)
 * @param {Array} cards - 카드 배열
 * @param {Object} options - 옵션
 * @returns {number} 최종 점수
 */
export function scoreWithCombo(mode, cards, options = {}) {
  const {
    comboWeight = 0.5,    // 콤보 중요도 (0~1)
    etherPriority = false // 에테르 축적 우선 모드
  } = options;

  if (!cards || cards.length === 0) return 0;

  // 1. 기본 스탯 계산
  const atk = cards.filter(c => c.type === 'attack')
    .reduce((a, c) => a + c.actionCost, 0);
  const def = cards.filter(c => c.type === 'general' || c.type === 'defense')
    .reduce((a, c) => a + c.actionCost, 0);
  const dmg = cards.filter(c => c.type === 'attack')
    .reduce((a, c) => a + (c.damage || 0) * (c.hits || 1), 0);
  const blk = cards.filter(c => c.type === 'general' || c.type === 'defense')
    .reduce((a, c) => a + (c.block || 0), 0);
  const sp = cards.reduce((a, c) => a + c.speedCost, 0);

  // 2. 모드 기반 점수
  let modeScore = 0;
  if (mode?.key === 'aggro') {
    modeScore = atk * 100 + dmg * 10 - sp;
  } else if (mode?.key === 'turtle') {
    modeScore = def * 100 + blk * 10 - sp;
  } else {
    modeScore = (dmg + blk) * 10 - sp;
  }

  // 3. 카드 수 보너스
  const cardCountBonus = cards.length * 10000;

  // 4. 콤보 점수
  const comboResult = calculateComboScore(cards);
  const comboScore = comboResult.score * comboWeight * 10; // 가중치 적용

  // 5. 에테르 우선 모드: 배율 기반 추가 점수
  let etherBonus = 0;
  if (etherPriority) {
    const estimatedEther = cards.length * 10 * comboResult.multiplier;
    etherBonus = estimatedEther * 5;
  }

  return modeScore + cardCountBonus + comboScore + etherBonus;
}
