/**
 * @file card-selection.ts
 * @description 카드 선택 AI 로직
 *
 * 플레이어 및 적 카드 선택 알고리즘을 제공합니다.
 */

import type { GameCard, GameBattleState, TokenState } from '../game-types';
import { hasToken } from '../token-system';
import { DEFAULT_MAX_SUBMIT_CARDS } from './constants';

// ==================== 카드 점수 ====================

export interface ScoredCard {
  card: GameCard;
  score: number;
  cost: number;
}

// ==================== 상황 분석 ====================

export interface BattleSituation {
  playerHpRatio: number;
  enemyHpRatio: number;
  isInDanger: boolean;
  isBossFight: boolean;
  isLowEnemyHp: boolean;
  canKillEnemy: boolean;
  needsDefense: boolean;
  currentEther: number;
  nearBurst: boolean;
  canBurst: boolean;
}

/**
 * 전투 상황 분석
 */
export function analyzeBattleSituation(
  state: GameBattleState,
  estimatedDamage: number
): BattleSituation {
  const playerHpRatio = state.player.hp / state.player.maxHp;
  const enemyHpRatio = state.enemy.hp / state.enemy.maxHp;
  const isInDanger = playerHpRatio < 0.35;
  const isBossFight = state.enemy.isBoss === true;
  const isLowEnemyHp = enemyHpRatio < 0.25;
  const canKillEnemy = estimatedDamage >= state.enemy.hp;
  const needsDefense = isInDanger && !canKillEnemy;
  const currentEther = state.player.ether || 0;
  const nearBurst = currentEther >= 80;
  const canBurst = currentEther >= 100;

  return {
    playerHpRatio,
    enemyHpRatio,
    isInDanger,
    isBossFight,
    isLowEnemyHp,
    canKillEnemy,
    needsDefense,
    currentEther,
    nearBurst,
    canBurst,
  };
}

// ==================== 피해량 추정 ====================

/**
 * 예상 피해량 계산
 */
export function estimateDamageOutput(
  cards: GameCard[],
  energy: number,
  strength: number = 0
): number {
  let totalDamage = 0;
  let remainingEnergy = energy;

  const attackCards = cards
    .filter(c => c.damage && c.damage > 0)
    .sort((a, b) => ((b.damage || 0) * (b.hits || 1)) - ((a.damage || 0) * (a.hits || 1)));

  for (const card of attackCards) {
    const cost = card.actionCost || 1;
    if (cost <= remainingEnergy) {
      const hits = card.hits || 1;
      const damage = (card.damage || 0) * hits;
      totalDamage += damage + strength * hits;
      remainingEnergy -= cost;
    }
  }

  return totalDamage;
}

// ==================== 포커 조합 분석 ====================

export interface ComboAnalysis {
  valueCount: Record<string, number>;
  suitCount: Record<string, number>;
  straightPossible: boolean;
  straightCards: string[];
}

/**
 * 카드의 포커 값 가져오기
 */
export function getCardValue(card: GameCard): string | null {
  // 카드의 value 속성이 있으면 사용
  if ((card as Record<string, unknown>).value) {
    return String((card as Record<string, unknown>).value);
  }

  // 카드 이름에서 값 추출 (예: "Strike 5" → "5")
  const match = card.name.match(/(\d+|[JQKA])$/);
  if (match) {
    return match[1];
  }

  // 카드 ID에서 값 추출
  const idMatch = card.id.match(/_(\d+|[jqka])$/i);
  if (idMatch) {
    return idMatch[1].toUpperCase();
  }

  return null;
}

/**
 * 카드 값을 숫자로 변환
 */
export function cardValueToNumber(value: string): number {
  switch (value.toUpperCase()) {
    case 'A': return 14;
    case 'K': return 13;
    case 'Q': return 12;
    case 'J': return 11;
    default: return parseInt(value) || 0;
  }
}

/**
 * 포커 조합 분석
 */
export function analyzePokerCombos(cards: GameCard[]): ComboAnalysis {
  const valueCount: Record<string, number> = {};
  const suitCount: Record<string, number> = {};
  const values: number[] = [];

  for (const card of cards) {
    const cardValue = getCardValue(card);
    if (cardValue) {
      valueCount[cardValue] = (valueCount[cardValue] || 0) + 1;
      values.push(parseInt(cardValue) || cardValueToNumber(cardValue));
    }

    const suit = (card as Record<string, unknown>).suit as string || 'none';
    suitCount[suit] = (suitCount[suit] || 0) + 1;
  }

  // 스트레이트 가능성 체크
  values.sort((a, b) => a - b);
  let straightPossible = false;
  const straightCards: string[] = [];

  if (values.length >= 3) {
    for (let i = 0; i < values.length - 2; i++) {
      if (values[i + 1] === values[i] + 1 && values[i + 2] === values[i] + 2) {
        straightPossible = true;
        for (const card of cards) {
          const v = parseInt(getCardValue(card) || '') || cardValueToNumber(getCardValue(card) || '');
          if (v >= values[i] && v <= values[i] + 2) {
            straightCards.push(card.id);
          }
        }
        break;
      }
    }
  }

  return { valueCount, suitCount, straightPossible, straightCards };
}

// ==================== 카드 점수 계산 ====================

/**
 * 카드 점수 계산
 */
export function calculateCardScore(
  card: GameCard,
  situation: BattleSituation,
  comboAnalysis: ComboAnalysis,
  handCards: GameCard[],
  playerTokens: TokenState
): number {
  let score = 0;
  const hits = card.hits || 1;
  const totalDamage = (card.damage || 0) * hits;
  const totalBlock = card.block || 0;

  // 1. 기본 효율 점수
  if (situation.isBossFight) {
    if (situation.canKillEnemy || situation.isLowEnemyHp) {
      score += totalDamage * 3;
      score += totalBlock * 0.2;
    } else if (situation.needsDefense) {
      score += totalBlock * 2;
      score += totalDamage * 1.0;
    } else {
      score += totalDamage * 1.8;
      score += totalBlock * 0.6;
    }

    if (hits > 1) {
      score += hits * 10;
    }
  } else {
    if (situation.needsDefense) {
      score += totalBlock * 3;
      score += totalDamage * 0.5;
    } else if (situation.canKillEnemy) {
      score += totalDamage * 2;
      score += totalBlock * 0.3;
    } else {
      score += totalDamage * 1.2;
      score += totalBlock * 0.8;
    }
  }

  // 2. 크로스 보너스
  if (card.crossBonus) {
    const cb = card.crossBonus;
    const hasCrossPartner = handCards.some(other => {
      if (other.id === card.id) return false;
      if (cb.type === 'damage_mult') {
        return getCardValue(other) === getCardValue(card);
      }
      return false;
    });

    if (hasCrossPartner) {
      score += 30;
    }
  }

  // 3. 에테르/버스트 전략
  if (situation.nearBurst || situation.canBurst) {
    if (card.tags?.includes('ether') || card.special === 'etherBurst') {
      score += 40;
    }
  } else {
    const cardValue = getCardValue(card);
    if (cardValue) {
      const sameValueCount = comboAnalysis.valueCount[cardValue] || 0;
      if (sameValueCount >= 2) {
        score += (sameValueCount - 1) * 25;
      }
      if (comboAnalysis.straightPossible && comboAnalysis.straightCards.includes(card.id)) {
        score += 30;
      }
    }
  }

  // 4. 속도 점수
  const speedCost = card.speedCost || 5;
  if (situation.isBossFight) {
    score += (12 - Math.min(12, speedCost)) * 3;
  } else {
    score += (10 - Math.min(10, speedCost)) * 2;
  }

  // 5. 특성 시너지
  if (card.traits && card.traits.length > 0) {
    if (card.traits.includes('chain')) {
      const hasFollowup = handCards.some(c =>
        c.traits?.includes('followup') || c.traits?.includes('finisher')
      );
      if (hasFollowup) {
        score += situation.isBossFight ? 35 : 25;
      }
    }

    if (card.traits.includes('followup') || card.traits.includes('finisher')) {
      const hasChain = handCards.some(c => c.traits?.includes('chain'));
      if (hasChain) {
        score += situation.isBossFight ? 30 : 20;
      }
      if (hasToken(playerTokens, 'chain_ready')) {
        score += 40;
      }
    }

    if (card.traits.includes('strongbone')) score += 15;
    if (card.traits.includes('destroyer')) score += 20;
    if (card.traits.includes('slaughter')) score += 30;
    if (card.traits.includes('pinnacle')) score += 45;
    if (card.traits.includes('swift')) score += 12;
  }

  // 6. 에너지 효율
  const cost = card.actionCost || 1;
  if (cost > 0) {
    const efficiencyPenalty = situation.isBossFight ? Math.pow(cost, 0.3) : Math.sqrt(cost);
    score = score / efficiencyPenalty;
  }

  return score;
}

// ==================== 카드 선택 ====================

/**
 * 플레이어 카드 선택
 */
export function selectPlayerCards(
  handCards: GameCard[],
  state: GameBattleState
): GameCard[] {
  if (handCards.length === 0) return [];

  const selected: GameCard[] = [];
  let energyLeft = state.player.energy;
  let cardsSelected = 0;
  const maxCards = DEFAULT_MAX_SUBMIT_CARDS;

  // 상황 분석
  const estimatedDamage = estimateDamageOutput(
    handCards,
    state.player.energy,
    state.player.strength || 0
  );
  const situation = analyzeBattleSituation(state, estimatedDamage);

  // 콤보 분석
  const comboAnalysis = analyzePokerCombos(handCards);

  // 카드 점수 계산
  const scoredCards: ScoredCard[] = handCards.map(card => ({
    card,
    score: calculateCardScore(card, situation, comboAnalysis, handCards, state.player.tokens),
    cost: card.actionCost || 1,
  }));

  // 점수순 정렬
  scoredCards.sort((a, b) => b.score - a.score);

  // 카드 선택
  const selectedIds = new Set<string>();
  for (const { card, cost } of scoredCards) {
    if (cardsSelected >= maxCards) break;
    if (cost > energyLeft) continue;
    if (selectedIds.has(card.id)) continue;

    selected.push(card);
    selectedIds.add(card.id);
    energyLeft -= cost;
    cardsSelected++;
  }

  // 최소 1장 선택
  if (selected.length === 0 && handCards.length > 0) {
    const cheapest = handCards
      .filter(c => (c.actionCost || 1) <= state.player.energy)
      .sort((a, b) => (a.actionCost || 1) - (b.actionCost || 1))[0];
    if (cheapest) {
      selected.push(cheapest);
    }
  }

  return selected;
}
