/**
 * @file useFlashRelic.ts
 * @description 상징 발동 애니메이션 처리 훅
 *
 * ## 주요 기능
 * - flashRelic: 상징 발동 시 시각/청각 피드백 제공
 * - 에테르 배율 관련 상징은 배율 펄스 표시
 */

import { useCallback } from 'react';
import { RELICS } from '../../../data/relics';
import { playSound } from '../../../lib/soundUtils';

interface RelicEffects {
  comboMultiplierPerCard?: number;
  etherCardMultiplier?: boolean;
  etherMultiplier?: number;
  etherFiveCardBonus?: number;
}

interface UseFlashRelicParams {
  activeRelicSet: Set<string>;
  relicActivated: string | null;
  actions: {
    setActiveRelicSet: (set: Set<string>) => void;
    setRelicActivated: (relicId: string | null) => void;
    setMultiplierPulse: (pulse: boolean) => void;
  };
}

interface UseFlashRelicResult {
  flashRelic: (relicId: string, tone?: number, duration?: number) => void;
}

/**
 * 상징 발동 애니메이션 훅
 */
export function useFlashRelic(params: UseFlashRelicParams): UseFlashRelicResult {
  const { activeRelicSet, relicActivated, actions } = params;

  const flashRelic = useCallback((relicId: string, tone = 800, duration = 500) => {
    const nextSet = new Set(activeRelicSet);
    nextSet.add(relicId);
    actions.setActiveRelicSet(nextSet);
    actions.setRelicActivated(relicId);

    const relic = RELICS[relicId as keyof typeof RELICS];
    const effects = relic?.effects as RelicEffects | undefined;

    // 에테르 배율 관련 효과가 있는 상징인 경우 배율 펄스 표시
    if (effects && (effects.comboMultiplierPerCard || effects.etherCardMultiplier || effects.etherMultiplier || effects.etherFiveCardBonus)) {
      actions.setMultiplierPulse(true);
      setTimeout(() => actions.setMultiplierPulse(false), Math.min(400, duration));
    }

    playSound(tone, duration * 0.6);

    setTimeout(() => {
      const nextSet = new Set(activeRelicSet);
      nextSet.delete(relicId);
      actions.setActiveRelicSet(nextSet);
      actions.setRelicActivated(relicActivated === relicId ? null : relicActivated);
    }, duration);
  }, [activeRelicSet, relicActivated, actions]);

  return { flashRelic };
}
