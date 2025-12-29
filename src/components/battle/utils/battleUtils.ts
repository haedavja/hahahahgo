/**
 * @file battleUtils.ts
 * @description 전투 시스템 유틸리티 함수
 */

import type { CardRarity } from '../../../types';

type BattleCard = any;
type TraitContext = any;

/**
 * 배열에서 랜덤으로 하나 선택
 */
export const choice = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/**
 * 카드가 특정 특성을 가지고 있는지 확인
 */
export function hasTrait(card: BattleCard, traitId: string): boolean {
  return !!(card.traits && card.traits.includes(traitId));
}

/**
 * 특성 효과를 카드에 적용
 */
export function applyTraitModifiers(card: BattleCard, context: TraitContext = {}): BattleCard {
  const modifiedCard = { ...card };

  if (hasTrait(card, 'strongbone')) {
    if (modifiedCard.damage) modifiedCard.damage = Math.ceil(modifiedCard.damage * 1.25);
    if (modifiedCard.block) modifiedCard.block = Math.ceil(modifiedCard.block * 1.25);
  }

  if (hasTrait(card, 'weakbone')) {
    if (modifiedCard.damage) modifiedCard.damage = Math.ceil(modifiedCard.damage * 0.8);
    if (modifiedCard.block) modifiedCard.block = Math.ceil(modifiedCard.block * 0.8);
  }

  if (hasTrait(card, 'destroyer') && modifiedCard.damage) {
    modifiedCard.damage = Math.ceil(modifiedCard.damage * 1.5);
  }

  if (hasTrait(card, 'slaughter') && modifiedCard.damage) {
    modifiedCard.damage = Math.ceil(modifiedCard.damage * 1.75);
  }

  if (hasTrait(card, 'pinnacle') && modifiedCard.damage) {
    modifiedCard.damage = Math.ceil(modifiedCard.damage * 2.5);
  }

  if (hasTrait(card, 'cooperation') && context.isInCombo) {
    if (modifiedCard.damage) modifiedCard.damage = Math.ceil(modifiedCard.damage * 1.5);
    if (modifiedCard.block) modifiedCard.block = Math.ceil(modifiedCard.block * 1.5);
  }

  if (hasTrait(card, 'swift')) {
    modifiedCard.speedCost = Math.max(1, Math.ceil(modifiedCard.speedCost * 0.75));
  }

  if (hasTrait(card, 'slow')) {
    modifiedCard.speedCost = Math.ceil(modifiedCard.speedCost * 1.33);
  }

  if (hasTrait(card, 'mastery') && context.usageCount) {
    modifiedCard.speedCost = Math.max(1, modifiedCard.speedCost - (context.usageCount * 2));
  }

  if (hasTrait(card, 'boredom') && context.usageCount) {
    modifiedCard.speedCost = modifiedCard.speedCost + (context.usageCount * 2);
  }

  if (hasTrait(card, 'outcast')) {
    modifiedCard.actionCost = Math.max(0, modifiedCard.actionCost - 1);
  }

  return modifiedCard;
}

/**
 * 힘 스탯을 카드에 적용하는 함수
 */
export function applyStrengthToCard(card: BattleCard, strength: number = 0, isPlayerCard: boolean = true): BattleCard {
  if (!isPlayerCard || strength === 0) return card;

  const modifiedCard = { ...card };

  if (modifiedCard.damage && modifiedCard.type === 'attack') {
    modifiedCard.damage = Math.max(0, modifiedCard.damage + strength);
  }

  if (modifiedCard.block && (modifiedCard.type === 'general' || modifiedCard.type === 'defense')) {
    modifiedCard.block = Math.max(0, modifiedCard.block + strength);
  }

  return modifiedCard;
}

/**
 * 손패 전체에 힘 스탯 적용
 */
export function applyStrengthToHand(hand: BattleCard[], strength: number = 0): BattleCard[] {
  if (strength === 0) return hand;
  return hand.map(card => applyStrengthToCard(card, strength, true));
}

/**
 * 카드 희귀도 반환
 */
export const getCardRarity = (card: BattleCard | null | undefined): CardRarity => (card?.rarity || 'common') as CardRarity;

/**
 * 적이 유닛 시스템을 사용하는지 확인
 *
 * ⚠️ 중요: 이 함수는 UI 표시(EnemyUnitsDisplay)와 HP 분배 로직에서
 * 동일하게 사용되어야 합니다. 조건이 불일치하면 다음 버그가 발생합니다:
 * - UI는 units[].hp를 표시하지만
 * - HP 분배가 안되어 데미지가 반영되지 않음
 *
 * @param units - 적 유닛 배열
 * @returns 유닛 시스템 사용 여부 (1개 이상이면 true)
 */
export function hasEnemyUnits(units: { hp: number }[] | undefined | null): boolean {
  return Array.isArray(units) && units.length >= 1;
}

/**
 * 큐 아이템 타입 (교차 체크용)
 */
interface CrossCheckQueueItem {
  actor: 'player' | 'enemy';
  sp?: number;
  hasCrossed?: boolean;
  card?: { traits?: string[] };
}

/**
 * 큐에서 교차된 카드들을 마킹
 *
 * 같은 SP에 플레이어와 적 카드가 있으면 둘 다 hasCrossed = true로 마킹
 * 기존에 hasCrossed가 true인 카드는 그대로 유지 (한 번 겹치면 계속 유지)
 *
 * @param queue - 현재 큐
 * @returns 교차 마킹이 적용된 새 큐
 */
export function markCrossedCards<T extends CrossCheckQueueItem>(queue: T[]): T[] {
  // SP 기준으로 그룹화
  const spGroups = new Map<number, T[]>();

  queue.forEach(item => {
    const sp = Math.floor(item.sp || 0); // 정수로 비교
    if (!spGroups.has(sp)) {
      spGroups.set(sp, []);
    }
    spGroups.get(sp)!.push(item);
  });

  // 각 SP 그룹에서 플레이어와 적이 모두 있으면 교차로 마킹
  return queue.map(item => {
    // 이미 교차된 카드는 유지
    if (item.hasCrossed) return item;

    const sp = Math.floor(item.sp || 0);
    const group = spGroups.get(sp) || [];

    const hasPlayer = group.some(g => g.actor === 'player');
    const hasEnemy = group.some(g => g.actor === 'enemy');

    // 플레이어와 적이 모두 있으면 교차
    if (hasPlayer && hasEnemy) {
      return { ...item, hasCrossed: true };
    }

    return item;
  });
}
