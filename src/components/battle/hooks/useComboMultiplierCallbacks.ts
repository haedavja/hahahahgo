/**
 * @file useComboMultiplierCallbacks.ts
 * @description 콤보 배율 계산 콜백 훅
 *
 * ## 주요 기능
 * - 콤보 배율 계산 래퍼 함수
 * - 콤보 배율 설명 래퍼 함수
 */

import { useCallback } from 'react';
import { computeComboMultiplier as computeComboMultiplierUtil, explainComboMultiplier as explainComboMultiplierUtil } from '../utils/comboMultiplier';
import type { Relic } from '../../../types/core';

interface UseComboMultiplierCallbacksParams {
  orderedRelicList: string[];
}

interface ComboMultiplierCallbacks {
  computeComboMultiplier: (
    baseMult: number,
    cardsCount: number,
    includeFiveCard?: boolean,
    includeRefBook?: boolean,
    relicOrderOverride?: Relic[] | null
  ) => number;
  explainComboMultiplier: (
    baseMult: number,
    cardsCount: number,
    includeFiveCard?: boolean,
    includeRefBook?: boolean,
    relicOrderOverride?: Relic[] | null
  ) => string;
}

/**
 * 콤보 배율 계산 콜백 훅
 */
export function useComboMultiplierCallbacks(params: UseComboMultiplierCallbacksParams): ComboMultiplierCallbacks {
  const { orderedRelicList } = params;

  const computeComboMultiplier = useCallback(
    (baseMult: number, cardsCount: number, includeFiveCard = true, includeRefBook = true, relicOrderOverride: Relic[] | null = null) => {
      const relicIds = relicOrderOverride ? relicOrderOverride.map(r => r.id) : null;
      return computeComboMultiplierUtil(baseMult, cardsCount, includeFiveCard, includeRefBook, relicIds, orderedRelicList);
    },
    [orderedRelicList]
  );

  const explainComboMultiplier = useCallback(
    (baseMult: number, cardsCount: number, includeFiveCard = true, includeRefBook = true, relicOrderOverride: Relic[] | null = null) => {
      const relicIds = relicOrderOverride ? relicOrderOverride.map(r => r.id) : null;
      return explainComboMultiplierUtil(baseMult, cardsCount, includeFiveCard, includeRefBook, relicIds, orderedRelicList);
    },
    [orderedRelicList]
  );

  return {
    computeComboMultiplier,
    explainComboMultiplier
  };
}
