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
  EtherCard
} from '../../../types';
import { RELIC_TONE_BY_TYPE } from '../../../core/effects/effect-audio';
import { executeRelicActivateEffects } from '../../../core/effects';

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
  playerTimeline: Array<{ [key: string]: unknown }>;
  relics: string[];
  triggeredRefs: RelicTriggeredRefs;
  calculatePassiveEffects: (relicIds: string[]) => PassiveStats;
  getCardEtherGain: (card: Card | Partial<Card>) => number;
  collectTriggeredRelics: (params: {
    orderedRelicList: string[];
    resolvedPlayerCards: number;
    playerTimeline: Array<{ [key: string]: unknown }> | null;
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
  getCardEtherGain: (card: EtherCard) => number;
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
  const cardForEther = upgradedRarity ? { ...card, rarity: upgradedRarity as import('../../../types').CardRarity } : card;
  const etherPerCard = Math.floor(getCardEtherGain(cardForEther) * passiveRelicEffects.etherMultiplier);

  const newTurnEther = turnEtherAccumulated + etherPerCard;
  actions.setTurnEtherAccumulated(newTurnEther);

  actions.setEtherPulse(true);
  setTimeout(() => actions.setEtherPulse(false), 300);

  const newCount = resolvedPlayerCards + 1;

  let relicActivateEtherBonus = 0;
  if (relics.length > 0) {
    const triggered = collectTriggeredRelics({
      orderedRelicList,
      resolvedPlayerCards,
      playerTimeline,
      triggeredRefs
    });

    // 상징 발동 시 묵주 효과 적용 (각 발동마다 에테르 획득)
    // ON_RELIC_ACTIVATE 상징(묵주)을 제외한 순수 발동 상징 수로 계산
    const pureTriggeredCount = triggered.filter(t => {
      // ON_RELIC_ACTIVATE 타입 상징은 발동 횟수 계산에서 제외
      const relicData = orderedRelicList.includes(t.id) ? true : false;
      if (!relicData) return true;
      return t.tone !== RELIC_TONE_BY_TYPE.ON_RELIC_ACTIVATE;
    }).length;

    if (pureTriggeredCount > 0) {
      const activateEffects = executeRelicActivateEffects(orderedRelicList, []);
      relicActivateEtherBonus = (activateEffects.etherGain || 0) * pureTriggeredCount;
      if (relicActivateEtherBonus > 0) {
        actions.setTurnEtherAccumulated(newTurnEther + relicActivateEtherBonus);
      }
    }

    playRelicActivationSequence(triggered, flashRelic, actions.setRelicActivated);
  }

  actions.setResolvedPlayerCards(newCount);

  return { newTurnEther: newTurnEther + relicActivateEtherBonus, newResolvedPlayerCards: newCount };
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
