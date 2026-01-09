/**
 * @file relicActivationAnimation.ts
 * @description 상징 발동 애니메이션 시스템
 *
 * ## 기능
 * - 카드 사용 시 상징 발동 체크
 * - 상징 발동 시퀀스 애니메이션
 * - 플래시 효과
 */

import { RELICS } from "../../../data/relics";
import { RELIC_AUDIO } from '../../../core/effects/effect-audio';
import type {
  RelicTriggeredRefs as TriggeredRefs,
  RelicTrigger
} from '../../../types';

interface TimelineItem {
  [key: string]: unknown;
}

/**
 * 카드 사용 시 발동할 상징 목록 수집
 */
export function collectTriggeredRelics({
  orderedRelicList,
  resolvedPlayerCards,
  playerTimeline,
  triggeredRefs
}: {
  orderedRelicList: string[];
  resolvedPlayerCards: number;
  playerTimeline: TimelineItem[] | null;
  triggeredRefs: TriggeredRefs;
}): RelicTrigger[] {
  const newCount = resolvedPlayerCards + 1;
  const isLastPlayerCard = playerTimeline?.length && playerTimeline.length > 0 && newCount === playerTimeline.length;
  const triggered: RelicTrigger[] = [];

  const relicsRecord = RELICS as Record<string, {
    effects?: {
      type?: string;
      comboMultiplierPerCard?: number;
      etherCardMultiplier?: number | boolean;
      etherMultiplier?: number;
      etherFiveCardBonus?: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }>;

  orderedRelicList.forEach((relicId: string) => {
    const relic = relicsRecord[relicId];

    // 에테르 결정: 카드마다 콤보 배율 증가 (comboMultiplierPerCard)
    if (relic?.effects?.type === 'PASSIVE' && relic?.effects?.comboMultiplierPerCard) {
      triggered.push({ id: relicId, ...RELIC_AUDIO.COMBO_MULTIPLIER });
    }
    // 희귀한 조약돌, 참고서 등: 에테르 배율 증가
    else if (relic?.effects?.type === 'PASSIVE' && (relic?.effects?.etherCardMultiplier || relicId === 'rareStone' || relic?.effects?.etherMultiplier)) {
      if (relicId === 'referenceBook') {
        // 참고서는 마지막 카드에서만 한 번 발동
        if (isLastPlayerCard && !triggeredRefs.referenceBookTriggered.current) {
          triggeredRefs.referenceBookTriggered.current = true;
          triggered.push({ id: relicId, ...RELIC_AUDIO.ETHER_MULTIPLIER, duration: 500 });
        }
        return;
      }
      // 희귀한 조약돌 등: 카드마다 즉시 발동
      triggered.push({ id: relicId, ...RELIC_AUDIO.ETHER_MULTIPLIER });
    }
    // 악마의 주사위: 5장째 카드에서 발동
    else if (relic?.effects?.type === 'PASSIVE' && relic?.effects?.etherFiveCardBonus && newCount >= 5 && !triggeredRefs.devilDiceTriggered.current) {
      triggeredRefs.devilDiceTriggered.current = true;
      triggered.push({ id: relicId, ...RELIC_AUDIO.FIVE_CARD_BONUS });
    }
  });

  // ON_RELIC_ACTIVATE 상징 (묵주): 다른 상징이 발동될 때 함께 발동
  if (triggered.length > 0) {
    orderedRelicList.forEach((relicId: string) => {
      const relic = relicsRecord[relicId];
      if (relic?.effects?.type === 'ON_RELIC_ACTIVATE' && relic?.effects?.etherGain) {
        triggered.push({ id: relicId, ...RELIC_AUDIO.RELIC_CHAIN });
      }
    });
  }

  return triggered;
}

/**
 * 상징 발동 애니메이션 시퀀스 실행
 */
export function playRelicActivationSequence(
  triggered: RelicTrigger[],
  flashRelic: (id: string, tone: number, duration: number) => void,
  setRelicActivated: (id: string | null) => void
): void {
  if (triggered.length === 0) return;

  const playSeq = (idx: number = 0): void => {
    if (idx >= triggered.length) {
      setRelicActivated(null);
      return;
    }
    const item = triggered[idx];
    flashRelic(item.id, item.tone, item.duration);
    setTimeout(() => playSeq(idx + 1), Math.max(200, item.duration * 0.6));
  };

  playSeq(0);
}
