/**
 * @file comboScoring.ts
 * @description 적 AI의 포커 콤보 인식 및 점수 계산
 *
 * ## AI 콤보 시스템 개요
 * 적 AI가 카드를 선택할 때 콤보 가치를 평가하는 시스템.
 * 콤보 점수는 AI의 카드 선택 우선순위에 영향을 미침.
 *
 * ## 점수 계산 공식
 * 최종점수 = COMBO_SCORE_WEIGHTS[조합] × ENEMY_COMBO_TENDENCIES[적ID]
 */

import type {
  ComboName,
  ComboScoringCard,
  ComboScoringEnemy,
  AIMode,
  ComboScoreResult,
  PotentialComboAnalysis,
  ComboStrategyResult,
  ComboScoreOptions
} from '../../../types';
import { detectPokerCombo } from './comboDetection';
import { COMBO_MULTIPLIERS } from './etherCalculations';

/**
 * 콤보별 점수 가중치
 * 높을수록 AI가 해당 콤보를 선호함
 */
export const COMBO_SCORE_WEIGHTS: Record<ComboName, number> = {
  '하이카드': 0,
  '페어': 100,
  '투페어': 150,
  '트리플': 200,
  '플러쉬': 225,
  '풀하우스': 300,
  '포카드': 400,
  '파이브카드': 500
};

/**
 * 몬스터별 콤보 성향 계수
 * 0~1 사이 값, 높을수록 콤보를 적극적으로 노림
 */
export const ENEMY_COMBO_TENDENCIES: Record<string, number> = {
  'ghoul': 0.3,
  'marauder': 0.5,
  'slurthim': 0,
  'deserter': 0.8,
  'slaughterer': 0.5
};

/**
 * 카드 조합의 콤보 점수 계산
 */
export function calculateComboScore(cards: ComboScoringCard[]): ComboScoreResult {
  if (!cards || cards.length === 0) {
    return { comboName: null, score: 0, multiplier: 1 };
  }

  const combo = detectPokerCombo(cards);

  if (!combo) {
    return { comboName: null, score: 0, multiplier: 1 };
  }

  return {
    comboName: combo.name,
    score: COMBO_SCORE_WEIGHTS[combo.name as ComboName] || 0,
    multiplier: COMBO_MULTIPLIERS[combo.name] || 1,
    bonusKeys: combo.bonusKeys
  };
}

/**
 * 잠재적 콤보 분석 (덱 분석용)
 */
export function analyzePotentialCombos(deck: ComboScoringCard[]): PotentialComboAnalysis {
  if (!deck || deck.length === 0) {
    return {
      costFrequency: new Map(),
      canFlush: false,
      maxSameCost: 0,
      pairCosts: [],
      bestPotentialCombo: null
    };
  }

  const costFreq = new Map<number, number>();
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

  let bestPotentialCombo: ComboName | null = null;
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
 */
export function filterCardsForCombo(deck: ComboScoringCard[], targetCombo: ComboName): ComboScoringCard[] {
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
      const bestCost = Array.from(analysis.costFrequency.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0];
      if (bestCost === undefined) return deck;
      return deck.filter(c => c.actionCost === bestCost);
    }

    case '풀하우스': {
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
      if (analysis.pairCosts.length < 2) return deck;
      return deck.filter(c => analysis.pairCosts.includes(c.actionCost));
    }

    default:
      return deck;
  }
}

/**
 * 콤보 인식 전략 결정
 */
export function decideComboStrategy(
  enemy: ComboScoringEnemy | null | undefined,
  playerEther: number = 0,
  turnNumber: number = 1
): ComboStrategyResult {
  const enemyEther = enemy?.ether || 0;
  const hpPercent = enemy?.hp && enemy?.maxHp
    ? (enemy.hp / enemy.maxHp) * 100
    : 100;

  const baseTendency = ENEMY_COMBO_TENDENCIES[enemy?.id || ''] ?? 0.5;

  let comboWeight = baseTendency;
  let etherPriority = false;
  let targetCombo: ComboName | null = null;

  if (turnNumber <= 2) {
    comboWeight = Math.min(1, baseTendency + 0.2);
    etherPriority = true;
  }

  if (playerEther > enemyEther + 200) {
    comboWeight = Math.min(1, comboWeight + 0.3);
    etherPriority = true;
  }

  if (hpPercent < 30) {
    comboWeight = Math.max(0, baseTendency - 0.3);
    etherPriority = false;
  }

  if (enemy?.deck && comboWeight > 0) {
    const analysis = analyzePotentialCombos(
      enemy.deck.map(id => ({ id, actionCost: 1 }))
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
 */
export function scoreWithCombo(
  mode: AIMode | null | undefined,
  cards: ComboScoringCard[],
  options: ComboScoreOptions = {}
): number {
  const {
    comboWeight = 0.5,
    etherPriority = false
  } = options;

  if (!cards || cards.length === 0) return 0;

  const atk = cards.filter(c => c.type === 'attack')
    .reduce((a, c) => a + c.actionCost, 0);
  const def = cards.filter(c => c.type === 'general' || c.type === 'defense')
    .reduce((a, c) => a + c.actionCost, 0);
  const dmg = cards.filter(c => c.type === 'attack')
    .reduce((a, c) => a + (c.damage || 0) * (c.hits || 1), 0);
  const blk = cards.filter(c => c.type === 'general' || c.type === 'defense')
    .reduce((a, c) => a + (c.block || 0), 0);
  const sp = cards.reduce((a, c) => a + (c.speedCost || 0), 0);

  let modeScore = 0;
  if (mode?.key === 'aggro') {
    modeScore = atk * 100 + dmg * 10 - sp;
  } else if (mode?.key === 'turtle') {
    modeScore = def * 100 + blk * 10 - sp;
  } else {
    modeScore = (dmg + blk) * 10 - sp;
  }

  const cardCountBonus = cards.length * 10000;
  const comboResult = calculateComboScore(cards);
  const comboScore = comboResult.score * comboWeight * 10;

  let etherBonus = 0;
  if (etherPriority) {
    const estimatedEther = cards.length * 10 * comboResult.multiplier;
    etherBonus = estimatedEther * 5;
  }

  return modeScore + cardCountBonus + comboScore + etherBonus;
}
