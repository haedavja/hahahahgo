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
  Card,
  PassiveStats,
  RelicTriggeredRefs,
  RelicTrigger,
  Relic
} from '../../../types';

/**
 * 에테르 누적 처리 액션
 */
interface EtherAccumActions {
  setTurnEtherAccumulated: (value: number) => void;
  setEtherPulse: (value: boolean) => void;
  setResolvedPlayerCards: (value: number) => void;
  setRelicActivated: (id: string | null) => void;
  setEnemyTurnEtherAccumulated: (value: number) => void;
}

/**
 * 플레이어 에테르 누적 처리 파라미터
 */
interface PlayerEtherAccumulationParams {
  card: Card;
  turnEtherAccumulated: number;
  orderedRelicList: string[];
  cardUpgrades: Record<string, unknown>;
  resolvedPlayerCards: number;
  playerTimeline: Card[];
  relics: Relic[];
  triggeredRefs: RelicTriggeredRefs;
  calculatePassiveEffects: (relicIds: string[]) => PassiveStats;
  getCardEtherGain: (card: Card | Partial<Card>) => number;
  collectTriggeredRelics: (params: {
    orderedRelicList: string[];
    resolvedPlayerCards: number;
    playerTimeline: Card[];
    triggeredRefs: RelicTriggeredRefs;
  }) => RelicTrigger[];
  playRelicActivationSequence: (
    triggered: RelicTrigger[],
    flashRelic: (id: string, tone?: number, duration?: number) => void,
    setRelicActivated: (id: string | null) => void
  ) => void;
  flashRelic: (id: string, tone?: number, duration?: number) => void;
  actions: EtherAccumActions;
}

/**
 * 플레이어 에테르 누적 처리 결과
 */
interface PlayerEtherAccumulationResult {
  newTurnEther: number;
  newResolvedPlayerCards: number;
}

/**
 * 적 에테르 누적 처리 파라미터
 */
interface EnemyEtherAccumulationParams {
  card: Card;
  enemyTurnEtherAccumulated: number;
  getCardEtherGain: (card: Card | Partial<Card>) => number;
  actions: Pick<EtherAccumActions, 'setEnemyTurnEtherAccumulated'>;
}

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
