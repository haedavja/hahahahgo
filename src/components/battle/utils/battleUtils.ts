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
