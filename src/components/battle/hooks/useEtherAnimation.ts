/**
 * @file useEtherAnimation.js
 * @description 에테르 계산 애니메이션 훅
 * @typedef {import('../../../types').Card} Card
 *
 * ## 애니메이션 단계
 * 1. sum: 합계 강조
 * 2. multiply: 콤보 배율 + 에테르 증폭제 적용
 * 3. deflation: 디플레이션 배지 애니메이션
 * 4. result: 최종값 표시
 *
 * ## 에테르 계산 공식
 * 최종 = 기본 × 콤보배율 × 증폭제 × 디플레이션
 */

import { useCallback } from 'react';
import { detectPokerCombo } from '../utils/comboDetection';
import { COMBO_MULTIPLIERS, applyEtherDeflation } from '../utils/etherCalculations';
import { ETHER_AUDIO } from '../../../core/effects';
import type { UseEtherAnimationParams } from '../../../types/hooks';

/**
 * 에테르 계산 애니메이션 훅
 * @param {Object} params
 * @param {Card[]} params.selected - 선택된 카드 배열
 * @param {Card[]} params.battleSelected - 전투 선택 카드
 * @param {number|null} params.finalComboMultiplier - 최종 콤보 배율
 * @param {React.MutableRefObject<number>} params.displayEtherMultiplierRef - 표시용 에테르 배율
 * @param {Object} params.player - 플레이어 상태
 * @param {Object} params.enemy - 적 상태
 * @param {Object} params.enemyPlan - 적 행동 계획
 * @param {number} params.enemyTurnEtherAccumulated - 적 턴 에테르 누적
 * @param {React.MutableRefObject<Object>} params.battleRef - 전투 상태 ref
 * @param {Function} params.playSound - 사운드 재생
 * @param {Object} params.actions - 상태 업데이트 액션
 * @returns {{startEtherCalculationAnimation: Function}}
 */
export function useEtherAnimation({
  selected,
  battleSelected,
  finalComboMultiplier,
  displayEtherMultiplierRef,
  player,
  enemy,
  enemyPlan,
  enemyTurnEtherAccumulated,
  battleRef,
  playSound,
  actions
}: UseEtherAnimationParams) {
  const startEtherCalculationAnimation = useCallback((totalEtherPts: number, actualResolvedCards: number | null = null, actualGainedEther: number | null = null, skipFinalValueSet: boolean = false) => {
    const pCombo = detectPokerCombo(selected);
    const basePlayerComboMult = pCombo ? (COMBO_MULTIPLIERS[pCombo.name] || 1) : 1;
    // 몬스터가 죽었을 때는 actualResolvedCards(실제 실행된 카드 수), 아니면 battle.selected.length(전체 선택된 카드 수)
    const cardCountForMultiplier = actualResolvedCards !== null ? actualResolvedCards : battleSelected.length;
    const playerComboMult = finalComboMultiplier || basePlayerComboMult;
    // 에테르 증폭제 배율 적용
    const etherAmplifierMult = displayEtherMultiplierRef.current || 1;
    const totalPlayerMult = playerComboMult * etherAmplifierMult;
    let playerBeforeDeflation = Math.round(totalEtherPts * totalPlayerMult);


    // 디플레이션 적용
    const playerComboUsageCount = (player as { comboUsageCount?: Record<string, number> })?.comboUsageCount || {};
    const playerDeflation = pCombo?.name
      ? applyEtherDeflation(playerBeforeDeflation, pCombo.name, playerComboUsageCount)
      : { gain: playerBeforeDeflation, multiplier: 1, usageCount: 0 };

    // actualGainedEther가 전달되면 그 값을 사용, 아니면 디플레이션까지만 적용한 값 사용
    // 범람 계산은 최종값 표시에 포함하지 않음 (로그에만 표시)
    const playerFinalEther = actualGainedEther !== null ? actualGainedEther : playerDeflation.gain;

    // 디플레이션 정보 설정
    actions.setCurrentDeflation(pCombo?.name ? {
      comboName: pCombo.name,
      usageCount: playerDeflation.usageCount,
      multiplier: playerDeflation.multiplier
    } : null);

    // === 적 에테르 계산 (플레이어와 동일한 로직) ===
    const eCombo = detectPokerCombo(enemyPlan.actions || []);
    const baseEnemyComboMult = eCombo ? (COMBO_MULTIPLIERS[eCombo.name] || 1) : 1;
    const enemyCardCount = enemyPlan.actions?.length || 0;
    let enemyBeforeDeflation = Math.round(enemyTurnEtherAccumulated * baseEnemyComboMult);

    // 적 디플레이션 적용
    const enemyComboUsageCount = (enemy as { comboUsageCount?: Record<string, number> })?.comboUsageCount || {};
    const enemyDeflation = eCombo?.name
      ? applyEtherDeflation(enemyBeforeDeflation, eCombo.name, enemyComboUsageCount)
      : { gain: enemyBeforeDeflation, multiplier: 1, usageCount: 0 };

    const enemyFinalEther = enemyDeflation.gain;

    // 적 디플레이션 정보 설정
    actions.setEnemyCurrentDeflation(eCombo?.name ? {
      comboName: eCombo.name,
      usageCount: enemyDeflation.usageCount,
      multiplier: enemyDeflation.multiplier
    } : null);

    // 1단계: 합계 강조 (플레이어 + 적 동시)
    actions.setEtherCalcPhase('sum');
    actions.setEnemyEtherCalcPhase('sum');
    setTimeout(() => {
      // 2단계: 곱셈 강조 + 명쾌한 사운드
      actions.setEtherCalcPhase('multiply');
      actions.setEnemyEtherCalcPhase('multiply');
      // 에테르 증폭 배율이 적용되었으면 상태에서 제거 (배율 갱신 시점)
      if (etherAmplifierMult > 1) {
        const currentPlayer = battleRef.current?.player || player;
        const updatedPlayer = { ...currentPlayer, etherMultiplier: 1 } as typeof currentPlayer;
        actions.setPlayer(updatedPlayer as never);
        if (battleRef.current) {
          battleRef.current.player = updatedPlayer as never;
        }
      }
      playSound(ETHER_AUDIO.GAIN.tone, ETHER_AUDIO.GAIN.duration);
      setTimeout(() => {
        // 3단계: 디플레이션 배지 애니메이션 + 저음 사운드
        if (playerDeflation.usageCount > 0 || enemyDeflation.usageCount > 0) {
          if (playerDeflation.usageCount > 0) actions.setEtherCalcPhase('deflation');
          if (enemyDeflation.usageCount > 0) actions.setEnemyEtherCalcPhase('deflation');
          playSound(ETHER_AUDIO.LOSS.tone, ETHER_AUDIO.LOSS.duration);
        }
        setTimeout(() => {
          // 4단계: 최종값 표시 + 묵직한 사운드
          actions.setEtherCalcPhase('result');
          actions.setEnemyEtherCalcPhase('result');
          // 버튼 표시를 위해 값 설정 (finishTurn에서 정확한 값으로 다시 설정됨)
          actions.setEtherFinalValue(playerFinalEther);
          actions.setEnemyEtherFinalValue(enemyFinalEther);
          playSound(ETHER_AUDIO.TRANSFER.tone, ETHER_AUDIO.TRANSFER.duration);
        }, (playerDeflation.usageCount > 0 || enemyDeflation.usageCount > 0) ? 400 : 0);
      }, 600);
    }, 400);
  }, [selected, battleSelected.length, finalComboMultiplier, displayEtherMultiplierRef, player, enemy, enemyPlan.actions, enemyTurnEtherAccumulated, battleRef, playSound, actions]);

  return { startEtherCalculationAnimation };
}
