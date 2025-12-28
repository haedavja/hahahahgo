/**
 * @file useComboSystem.js
 * @description 콤보 시스템 관리 Hook
 * @typedef {import('../../../types').Card} Card
 */

import { useMemo, useEffect } from 'react';
import { detectPokerCombo } from '../utils/comboDetection';
import { COMBO_MULTIPLIERS, calculateComboEtherGain } from '../utils/etherCalculations';

/**
 * 콤보 시스템 훅
 * 선택된 카드의 조합 감지, 배율 계산, 디플레이션 정보 관리
 *
 * @param {Object} params
 * @param {Card[]} params.battleSelected - 선택된 카드 배열
 * @param {string} params.battlePhase - 현재 전투 페이즈
 * @param {Object} params.playerComboUsageCount - 조합별 사용 횟수
 * @param {number} params.resolvedPlayerCards - 해결된 플레이어 카드 수
 * @returns {{currentCombo: Object|null, finalComboMultiplier: number}}
 */
export function useComboSystem({
  battleSelected,
  battlePhase,
  playerComboUsageCount,
  resolvedPlayerCards,
  battleQIndex,
  battleQueueLength,
  computeComboMultiplier,
  explainComboMultiplier,
  orderedRelicList,
  selected,
  actions
}: any) {
  // 현재 조합 감지 및 디플레이션 정보 설정
  const currentCombo = useMemo(() => {
    const combo = detectPokerCombo(battleSelected);

    // 디플레이션 정보 계산 (선택/대응/진행 단계에서)
    // 디플레이션 배율은 0.8 (20% 감소) - applyEtherDeflation과 동일해야 함
    if (combo?.name && (battlePhase === 'select' || battlePhase === 'respond' || battlePhase === 'resolve')) {
      const usageCount = (playerComboUsageCount || {})[combo.name] || 0;
      const deflationMult = Math.pow(0.8, usageCount);
      actions.setCurrentDeflation(usageCount > 0 ? { multiplier: deflationMult, usageCount } : null);
    }

    return combo;
  }, [battleSelected, playerComboUsageCount, battlePhase, actions]);

  // 상징 효과를 포함한 최종 콤보 배율 (실시간 값 기반)
  const finalComboMultiplier = useMemo(() => {
    const baseMultiplier = currentCombo ? (COMBO_MULTIPLIERS[currentCombo.name] || 1) : 1;
    const isResolve = battlePhase === 'resolve';
    const cardsCount = isResolve ? resolvedPlayerCards : battleSelected.length;
    const allowRefBook = isResolve ? (battleQIndex >= battleQueueLength) : false;

    if (!isResolve) return baseMultiplier;
    return computeComboMultiplier(baseMultiplier, cardsCount, true, allowRefBook);
  }, [currentCombo, resolvedPlayerCards, battleSelected.length, battlePhase, battleQIndex, battleQueueLength, computeComboMultiplier]);

  // 배율 변경 시 펄스 애니메이션
  useEffect(() => {
    if (battlePhase !== 'resolve') return;
    actions.setMultiplierPulse(true);
    const t = setTimeout(() => actions.setMultiplierPulse(false), 250);
    return () => clearTimeout(t);
  }, [finalComboMultiplier, battlePhase, actions]);

  // 콤보 미리보기 정보 (에테르 획득량 미리 계산)
  const comboPreviewInfo = useMemo(() => {
    if (!currentCombo) return null;
    return calculateComboEtherGain({
      cards: selected || [],
      cardCount: selected?.length || 0,
      comboName: currentCombo.name,
      comboUsageCount: playerComboUsageCount || {},
    });
  }, [currentCombo, selected?.length, playerComboUsageCount]);

  // 배율 경로 로그 (실시간 계산과 동일한 입력 사용)
  const comboStepsLog = useMemo(() => {
    if (!currentCombo) return [];
    const baseMultiplier = currentCombo ? (COMBO_MULTIPLIERS[currentCombo.name] || 1) : 1;
    const isResolve = battlePhase === 'resolve';
    const cardsCount = isResolve ? resolvedPlayerCards : battleSelected.length;
    const allowRefBook = isResolve ? (battleQIndex >= battleQueueLength) : false;
    const { steps } = explainComboMultiplier(baseMultiplier, cardsCount, true, allowRefBook, orderedRelicList);
    return steps || [];
  }, [currentCombo, resolvedPlayerCards, battleSelected.length, battlePhase, battleQIndex, battleQueueLength, explainComboMultiplier, orderedRelicList]);

  return {
    currentCombo,
    finalComboMultiplier,
    comboPreviewInfo,
    comboStepsLog
  };
}
