/**
 * @file etherAccumulationProcessing.ts
 * @description 카드 사용 시 에테르 누적 처리
 *
 * ## 누적 처리
 * - 카드 희귀도별 에테르 값
 * - 상징 배율 적용
 * - 턴 누적량 갱신
 */

import type {
  EtherAccumCardInfo,
  PassiveEffects,
  EtherAccumActions,
  TriggeredRefs,
  PlayerEtherAccumulationParams,
  PlayerEtherAccumulationResult,
  EnemyEtherAccumulationParams
} from '../../../types';

/**
 * 플레이어 카드 사용 시 에테르 누적 처리
 */
export function processPlayerEtherAccumulation({
  card,
  turnEtherAccumulated,
  orderedRelicList,
  cardUpgrades,
  resolvedPlayerCards,
  playerTimeline,
  relics,
  triggeredRefs,
  calculatePassiveEffects,
  getCardEtherGain,
  collectTriggeredRelics,
  playRelicActivationSequence,
  flashRelic,
  actions
}: PlayerEtherAccumulationParams): PlayerEtherAccumulationResult {
  if (card.isGhost) {
    const newCount = resolvedPlayerCards + 1;
    actions.setResolvedPlayerCards(newCount);
    return { newTurnEther: turnEtherAccumulated, newResolvedPlayerCards: newCount };
  }

  const passiveRelicEffects = calculatePassiveEffects(orderedRelicList);
  const upgradedRarity = cardUpgrades[card.id || ''];
  const cardForEther = upgradedRarity ? { ...card, rarity: upgradedRarity } : card;
  const etherPerCard = Math.floor(getCardEtherGain(cardForEther) * passiveRelicEffects.etherMultiplier);

  const newTurnEther = turnEtherAccumulated + etherPerCard;
  actions.setTurnEtherAccumulated(newTurnEther);

  actions.setEtherPulse(true);
  setTimeout(() => actions.setEtherPulse(false), 300);

  const newCount = resolvedPlayerCards + 1;

  if (relics.length > 0) {
    const triggered = collectTriggeredRelics({
      orderedRelicList,
      resolvedPlayerCards,
      playerTimeline,
      triggeredRefs
    });

    playRelicActivationSequence(triggered, flashRelic, actions.setRelicActivated);
  }

  actions.setResolvedPlayerCards(newCount);

  return { newTurnEther, newResolvedPlayerCards: newCount };
}

/**
 * 적 카드 사용 시 에테르 누적 처리
 */
export function processEnemyEtherAccumulation({
  card,
  enemyTurnEtherAccumulated,
  getCardEtherGain,
  actions
}: EnemyEtherAccumulationParams): number {
  if (card.isGhost) {
    return enemyTurnEtherAccumulated;
  }

  const newEnemyTurnEther = enemyTurnEtherAccumulated + getCardEtherGain(card);
  actions.setEnemyTurnEtherAccumulated(newEnemyTurnEther);
  return newEnemyTurnEther;
}
