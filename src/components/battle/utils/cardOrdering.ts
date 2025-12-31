/**
 * @file cardOrdering.ts
 * @description 카드 순서 및 타임라인 유틸리티
 *
 * ## 기능
 * - fixedOrder 생성 (수동 순서)
 * - 타임라인 재계산
 * - 민첩 적용 속도 계산
 */

import type { OrderingCardInfo, OrderingEnemyAction, OrderItem } from '../../../types';
import { applyAgility, applyAgilityWithAnomaly } from "../../../lib/agilityUtils";

interface AnomalyPlayerState {
  speedInstability?: number;
  [key: string]: unknown;
}

/** 카드 성장 상태 타입 */
interface CardGrowthState {
  traits?: string[];
  [key: string]: unknown;
}

/** 카드 성장 맵 타입 */
type CardGrowthMap = Record<string, CardGrowthState>;

/**
 * 카드가 특정 특성을 가지고 있는지 확인 (card.traits + cardGrowth 둘 다 확인)
 */
function hasCardTrait(card: { id?: string; traits?: string[] }, traitId: string, cardGrowth?: CardGrowthMap): boolean {
  // 1. 카드 자체의 traits 확인
  if (card.traits?.includes(traitId)) return true;
  // 2. cardGrowth에서 확인
  if (cardGrowth && card.id && cardGrowth[card.id]?.traits?.includes(traitId)) return true;
  return false;
}

/**
 * 플레이어와 적 카드를 결합하여 수동 순서로 fixedOrder 생성
 * @param enhancedPlayerCards - 강화된 플레이어 카드 배열
 * @param enemyActions - 적의 행동 배열
 * @param effectiveAgility - 플레이어의 유효 민첩성
 * @param playerState - 이변 효과가 포함된 플레이어 상태 (선택, 속도 불안정 효과 적용용)
 * @param cardGrowth - 카드 성장 상태 맵 (특성 확인용)
 * @returns sp 값이 계산된 fixedOrder 배열
 */
export function createFixedOrder(
  enhancedPlayerCards: OrderingCardInfo[],
  enemyActions: OrderingEnemyAction[] | null | undefined,
  effectiveAgility: number,
  playerState?: AnomalyPlayerState,
  cardGrowth?: CardGrowthMap
): OrderItem[] {
  // "last" 특성이 있는 카드와 없는 카드 분리
  const normalCards = enhancedPlayerCards.filter(card => !card.traits?.includes('last'));
  const lastCards = enhancedPlayerCards.filter(card => card.traits?.includes('last'));

  // last 특성 카드는 플레이어 카드 중 마지막에 배치
  const orderedPlayerCards = [...normalCards, ...lastCards];

  // 플레이어 카드 매핑
  const playerCards: OrderItem[] = orderedPlayerCards.map((card, idx) => ({
    actor: 'player',
    card,
    originalIndex: idx
  }));

  // 적 카드 매핑
  const enemyCards: OrderItem[] = (enemyActions || []).map((action, idx) => ({
    actor: 'enemy',
    card: action,
    originalIndex: idx
  }));

  // 플레이어 카드를 먼저, 그 다음 적 카드 (수동 순서)
  const manualOrder = [...playerCards, ...enemyCards];

  // sp 값 재계산 (누적)
  let ps = 0;
  let es = 0;
  const withSp = manualOrder.map(item => {
    const isPlayer = item.actor === 'player';
    const agility = isPlayer ? effectiveAgility : 0;

    // 여유 특성 처리: leisurePosition이 설정된 경우 해당 값을 속도로 사용
    const hasLeisure = isPlayer && hasCardTrait(item.card, 'leisure', cardGrowth);
    const baseSpeed = hasLeisure && item.card.leisurePosition !== undefined
      ? item.card.leisurePosition
      : item.card.speedCost;

    // 무리 특성 처리: strainOffset만큼 속도 감소 (타임라인 앞당김)
    const hasStrain = isPlayer && hasCardTrait(item.card, 'strain', cardGrowth);
    const strainOffset = hasStrain && item.card.strainOffset !== undefined
      ? item.card.strainOffset
      : 0;
    const adjustedSpeed = Math.max(1, baseSpeed - strainOffset);

    // 플레이어 카드에 불안정 이변 효과 적용 (playerState가 있을 때만)
    const finalSpeed = isPlayer && playerState
      ? applyAgilityWithAnomaly(adjustedSpeed, agility, playerState)
      : applyAgility(adjustedSpeed, agility);

    if (isPlayer) {
      ps += finalSpeed;
      return { ...item, sp: ps, finalSpeed };
    } else {
      es += finalSpeed;
      return { ...item, sp: es, finalSpeed };
    }
  });

  return withSp;
}
