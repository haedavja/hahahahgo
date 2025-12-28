/**
 * @file useEtherPreview.js
 * @description 에테르 획득량 미리보기 훅
 * @typedef {import('../../../types').Card} Card
 *
 * ## 계산 공식
 * 예상 에테르 = 카드 에테르 합계 × 콤보 배율 × 상징 배율 × 디플레이션
 *
 * @typedef {Object} EtherPreviewResult
 * @property {number} baseEther - 기본 에테르 합계
 * @property {number} comboMultiplier - 콤보 배율
 * @property {number} deflationMultiplier - 디플레이션 배율
 * @property {number} finalEther - 최종 예상 에테르
 */

import { useMemo } from 'react';
import { detectPokerCombo } from '../utils/comboDetection';
import { COMBO_MULTIPLIERS, applyEtherDeflation, calcCardsEther } from '../utils/etherCalculations';
import { calculatePassiveEffects } from '../../../lib/relicEffects';

/**
 * 에테르 획득량 미리보기 훅
 * @param {Object} params
 * @param {Object[]} params.playerTimeline - 플레이어 타임라인
 * @param {Card[]} params.selected - 선택된 카드
 * @param {string[]} params.orderedRelicList - 보유 상징 목록
 * @param {Object} params.playerComboUsageCount - 콤보 사용 횟수
 * @returns {EtherPreviewResult}
 */
export function useEtherPreview({
  playerTimeline,
  selected,
  orderedRelicList,
  playerComboUsageCount
}: any) {
  const previewEtherGain = useMemo(() => {
    if (playerTimeline.length === 0) return 0;

    // 희귀한 조약돌 효과 적용된 카드당 에테르
    const passiveRelicEffects = calculatePassiveEffects(orderedRelicList);
    const totalEtherPts = calcCardsEther(playerTimeline, passiveRelicEffects.etherMultiplier);

    // 조합 배율 계산 (selected 기준으로 조합 감지) - 미리보기는 순수 콤보만
    const pCombo = detectPokerCombo(selected);
    const basePlayerComboMult = pCombo ? (COMBO_MULTIPLIERS[pCombo.name] || 1) : 1;
    const playerComboMult = basePlayerComboMult;
    let playerBeforeDeflation = Math.round(totalEtherPts * playerComboMult);

    // 디플레이션 적용
    const playerDeflation = pCombo?.name
      ? applyEtherDeflation(playerBeforeDeflation, pCombo.name, playerComboUsageCount || {})
      : { gain: playerBeforeDeflation, multiplier: 1, usageCount: 0 };

    return playerDeflation.gain;
  }, [playerTimeline, selected, orderedRelicList, playerComboUsageCount]);

  return previewEtherGain;
}
